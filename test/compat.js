// Phase 7 acceptance: Studio Finals open in Days 146 to 149, unchanged. Writes test/out/compat-report.json.
// Phase 2 proved the round trip for one case (the demo, exported Final from the Story stage). This widens it to every case
// the Studio can produce, on both Day 149 fixtures:
//   1. every stage the Studio can mark Final (Charter and Rules, Art and Audio, World, Story): Mark stage Final through the
//      pipeline, then the stage's own Final export, opened in each of Days 146, 147, 148 and 149 as they are shipped. Each
//      must accept it with its content hash verified, no validation error, no broken reference and no page error
//   2. the bundle inside a game Build game wrote (the zip's bundle.json and the one file's inline bundle, from phase6) opens
//      in all four forges the same way, so a finished game can always go back into the tools that made it
//   3. and each of those opens back in the Studio as the same project at the Story stage, hash verified
//   4. the forges really are unchanged: no source file in any clone was touched (their own test reports aside), and
//      vendor.js --check finds every vendored file byte for byte what its owner holds
// Run from test/ after npm install (here and in each forge's test/), node make-demo.js, and node phase6.js.
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { bootReady, wait } = require('./boot');
const { boot: bootForge } = require('./boot-phase0');
const FI = require(path.join(__dirname, 'node_modules', 'fake-indexeddb'));
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'out');
const DIRS = { '146': path.dirname(require('../day146')), '147': require('../day147'), '148': require('../day148'), '149': require('../day149') };
const PAGE = { 146: require('../day146'), 147: path.join(DIRS['147'], 'index.html'), 148: path.join(DIRS['148'], 'index.html'), 149: path.join(DIRS['149'], 'index.html') };
const URLS = { 146: 'appaday-146-saga-forge', 147: 'appaday-147-art-and-audio-forge', 148: 'appaday-148-world-forge', 149: 'appaday-149-story-forge' };
const ENG = { 146: [], 147: [], 148: ['engine-render.js', 'engine-audio.js'].map((f) => path.join(DIRS['148'], f)), 149: ['engine-render.js', 'engine-audio.js', 'engine-world.js'].map((f) => path.join(DIRS['149'], f)) };
const DAYS = ['146', '147', '148', '149'];
const read = (f) => fs.readFileSync(f, 'utf8');
const J = JSON.stringify;
const results = [];
let failed = 0;
function check(name, ok, info) { results.push({ name, ok: !!ok, info: ok ? undefined : info }); if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || info === undefined ? '' : ' :: ' + J(info).slice(0, 700))); }

// Opens bundle text in one forge's shipped page, as a person would with its Import button.
async function reopen(day, text) {
  const f = bootForge(PAGE[day], { url: 'https://augustineiacopelli.github.io/' + URLS[day] + '/', engines: ENG[day], indexedDB: day === '149' });
  await wait(60);
  for (const g of ['ART', 'WORLD', 'STORY']) if (f.win[g] && f.win[g].booted) await f.win[g].booted;
  let res;
  try { res = f.win.Kit.bundle.importText(text); } catch (e) { f.win.close(); return { rejected: e.message }; }
  await wait(10);
  const v = f.win.Kit.refreshValidation();
  const out = { matches: res.matches, errors: v.errors.length, broken: v.broken.length, pageErrors: f.errors.length, firstError: (v.errors[0] || v.broken[0] || f.errors[0] || null) };
  f.win.close();
  return out;
}
const clean = (o) => o && !o.rejected && o.matches === true && o.errors === 0 && o.broken === 0 && o.pageErrors === 0;

(async () => {
  const t00 = Date.now();
  const report = { stages: {}, game: {}, back: {} };
  const FX = { demo: read(path.join(OUT, 'demo149-bundle.json')), four: read(path.join(OUT, 'four149-bundle.json')) };
  const finals = []; // {label, text}

  // ---------------------------------------------------------------- 1. every stage's Final, from the Studio
  for (const fx of ['demo', 'four']) {
    for (const stage of ['charter', 'art', 'world', 'story']) {
      const r = await bootReady({ indexedDB: new FI.IDBFactory(), native: false });
      const S = r.win.Studio, K = r.win.Kit;
      S.projects.importText(FX[fx]); await wait(40);
      const mark = S.pipeline.markFinal(stage);
      S.show(stage); await wait(30);
      let out = null, err = null;
      try { out = K.buildExport('final', stage === 'art' ? { fill: true, engines: false } : { engines: false }); } catch (e) { err = e.message; }
      const b = out ? JSON.parse(out.files[0].text) : null;
      const day = { charter: '146', art: '147', world: '148', story: '149' }[stage];
      check(fx + ' ' + stage + ': Mark stage Final passes and the stage\'s own Final export writes forge ' + day + ' as final, hash stamped',
        mark.ok && !!b && b.kit.forges[day] && b.kit.forges[day].status === 'final' && b.kit.contentHash === out.hash && !r.errors.length, { mark, err, errors: r.errors.slice(0, 2) });
      if (b) finals.push({ label: fx + ' ' + stage + ' Final', text: out.files[0].text });
      r.win.close();
    }
  }
  for (const f of finals) {
    const row = {};
    for (const d of DAYS) row[d] = await reopen(d, f.text);
    report.stages[f.label] = row;
    check(f.label + ': opens in Days 146, 147, 148 and 149 as shipped, hash verified, no errors, no broken references, no page errors', DAYS.every((d) => clean(row[d])), row);
  }

  // ---------------------------------------------------------------- 2. the bundle inside a built game
  const games = [];
  const zipf = path.join(OUT, 'phase6', 'four-continents-game.zip');
  if (fs.existsSync(zipf)) {
    const JSZip = require('jszip'), z = await JSZip.loadAsync(fs.readFileSync(zipf));
    const n = Object.keys(z.files).find((k) => /\/bundle\.json$/.test(k));
    games.push({ label: 'four game zip bundle.json', text: await z.file(n).async('string') });
  }
  for (const [fx, f] of [['demo', 'demo-demo-saga.html'], ['four', 'four-four-continents.html']]) {
    const p = path.join(OUT, 'phase6', f);
    if (!fs.existsSync(p)) continue;
    const m = /<script type="application\/json" id="saga-bundle">([\s\S]*?)<\/script>/.exec(read(p));
    if (m) games.push({ label: fx + ' one file bundle', text: m[1] });
  }
  check('the built games are here to read (run node phase6.js first)', games.length === 3, games.map((g) => g.label));
  for (const g of games) {
    const row = {};
    for (const d of DAYS) row[d] = await reopen(d, g.text);
    report.game[g.label] = row;
    check(g.label + ': a finished game\'s bundle opens in Days 146 to 149, hash verified, no errors, no broken references', DAYS.every((d) => clean(row[d])), row);
  }

  // ---------------------------------------------------------------- 3. and back into the Studio
  for (const f of finals.filter((x) => / story /.test(x.label)).concat(games)) {
    const r = await bootReady({ indexedDB: new FI.IDBFactory(), native: false });
    let res = null, err = null;
    try { res = r.win.Studio.projects.importText(f.text); } catch (e) { err = e.message; }
    await wait(30);
    report.back[f.label] = { matches: res && res.matches, stage: res && res.placement && res.placement.stage, err };
    check(f.label + ': opens back in the Studio as a project at the Story stage, hash verified', !!res && res.matches === true && res.placement.stage === 'story' && !r.errors.length, report.back[f.label]);
    r.win.close();
  }

  // ---------------------------------------------------------------- 4. the forges are unchanged
  const vend = cp.spawnSync(process.execPath, [path.join(ROOT, 'vendor.js'), '--check'], { cwd: ROOT, encoding: 'utf8' });
  check('vendor.js --check: every vendored file is byte for byte what its owner holds', vend.status === 0, (vend.stdout + vend.stderr).slice(-400));
  const st = DAYS.map((d) => {
    const g = (args) => cp.spawnSync('git', ['-C', DIRS[d]].concat(args), { encoding: 'utf8' }).stdout.trim();
    // A forge's own test reports (test/out/) are rewritten whenever its suites run, here or in run-forge-suites.js; the
    // forge itself is everything else.
    return { day: d, head: g(['rev-parse', '--short', 'HEAD']), dirty: g(['status', '--porcelain', '--untracked-files=no']).split('\n').filter((l) => l && !/ test\/out\//.test(l)).join('\n') };
  });
  report.forges = st;
  check('each forge clone\'s source is clean, at ' + st.map((s) => s.day + ' ' + s.head).join(', ') + ' (no tracked file outside its test reports changed)', st.every((s) => !s.dirty), st);
  report.seconds = Math.round((Date.now() - t00) / 1000);
  report.passed = results.length - failed; report.total = results.length; report.results = results;
  fs.writeFileSync(path.join(OUT, 'compat-report.json'), JSON.stringify(report, null, 2));
  console.log('\nPhase 7 compat: ' + (results.length - failed) + ' of ' + results.length + ' checks pass in ' + report.seconds + ' s.');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
