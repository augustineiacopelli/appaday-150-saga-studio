// Runs every existing phase test of Days 147, 148 and 149 against the Studio page instead of each forge's own page.
//   node run-forge-suites.js                 all of them (two at a time)
//   node run-forge-suites.js 149             one forge
//   node run-forge-suites.js 149 phase0      one test file
// Each test is the forge's own, run unchanged from the forge's clone (test/ directory) with test/hook-studio.js preloaded, which
// answers the forge's require of its own boot.js with a boot that opens the Studio page, started in that forge's stage.
// Day 146 has no tests of its own (its repository is the page); it is exercised through the compat probes the others run.
// layout.js needs Playwright and is covered by Phase 7. Writes test/out/forge-suites-report.json.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const HOOK = path.join(__dirname, 'hook-studio.js');
const DAYS = { '147': require('../day147'), '148': require('../day148'), '149': require('../day149') };
const only = process.argv.slice(2);
const jobs = [];
Object.keys(DAYS).forEach((day) => {
  if (only[0] && /^\d+$/.test(only[0]) && only[0] !== day) return;
  const dir = path.join(DAYS[day], 'test');
  fs.readdirSync(dir).filter((f) => /^phase\d+\.js$/.test(f)).sort((a, b) => parseInt(a.slice(5), 10) - parseInt(b.slice(5), 10)).forEach((f) => {
    if (only[1] && f !== only[1] + '.js') return;
    jobs.push({ day, file: f, dir });
  });
});
const LOGS = path.join(require('os').tmpdir(), 'studio-suites');
fs.mkdirSync(LOGS, { recursive: true });
const results = [];
function run(job) {
  return new Promise((resolve) => {
    const t0 = Date.now(), log = path.join(LOGS, job.day + '-' + job.file.replace('.js', '') + '.log');
    const out = fs.createWriteStream(log);
    const p = spawn(process.execPath, ['-r', HOOK, job.file], { cwd: job.dir, env: process.env });
    p.stdout.pipe(out, { end: false }); p.stderr.pipe(out, { end: false });
    const killer = setTimeout(() => p.kill('SIGKILL'), 25 * 60 * 1000);
    p.on('close', (code) => {
      clearTimeout(killer); out.end();
      const text = fs.readFileSync(log, 'utf8');
      const m = /(\d+) of (\d+) passed/.exec(text);
      const fails = text.split('\n').filter((l) => /^FAIL /.test(l)).map((l) => l.slice(0, 300));
      const r = { day: job.day, file: job.file, passed: m ? +m[1] : null, total: m ? +m[2] : null, exit: code, seconds: Math.round((Date.now() - t0) / 1000), fails, crash: m ? null : text.split('\n').filter(Boolean).slice(-4).join(' | ').slice(0, 400) };
      results.push(r);
      console.log(job.day + ' ' + job.file + ': ' + (m ? m[1] + ' of ' + m[2] : 'NO RESULT (' + (r.crash || 'no output') + ')') + ' in ' + r.seconds + 's');
      resolve();
    });
  });
}
(async () => {
  const queue = jobs.slice();
  const lane = async () => { while (queue.length) await run(queue.shift()); };
  await Promise.all([lane(), lane()]);
  const tot = results.reduce((a, r) => ({ p: a.p + (r.passed || 0), t: a.t + (r.total || 0), bad: a.bad + ((r.passed === r.total && r.total) ? 0 : 1) }), { p: 0, t: 0, bad: 0 });
  results.sort((a, b) => (a.day + a.file).localeCompare(b.day + b.file, undefined, { numeric: true }));
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'out', 'forge-suites-report.json'), JSON.stringify({ totals: tot, results }, null, 1));
  console.log('TOTAL ' + tot.p + ' of ' + tot.t + ' checks; ' + tot.bad + ' file(s) not clean. Logs in ' + LOGS);
  process.exit(tot.bad ? 1 : 0);
})();
