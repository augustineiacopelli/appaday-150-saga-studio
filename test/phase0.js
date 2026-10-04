// Phase 0 acceptance: the repository, the vendored sources, and the Day 149 Final fixtures.
// 1. vendor.js --check passes: core/, engines/, and forge/ are byte equal to their owners, and nothing extra is there;
// 2. each forge's page text rebuilds exactly from the vendored files plus the fences left with the owner (KIT:CORE from
//    core/, engine fences from engines/, demo and APP:BOOT from the owner's page), so nothing was dropped or reordered;
// 3. every vendored script parses on its own, because the Studio page loads each one by its own script tag;
// 4. the five engines load into a bare context in load order and declare exactly their five globals, and none contains
//    </script or <!--, so Phase 6 inlines them byte for byte;
// 5. core/kit.js boots alone in a page and its bundle hash verifies both fixtures;
// 6. both fixtures are Day 149 Finals: forges 146 to 149 final, story opened, nothing unresolved, the day150 contract's
//    engine sha256 values equal engines/, and the bare engines replay the golden path to the manifest's exact end state;
// 7. the fixtures reopen in Days 146, 147, 148, and 149 with no errors or broken references (from make-demo.js's report);
// 8. the new Day 150 sources are ASCII clean.
// Run from test/.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { boot } = require('./boot');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const read = (p) => fs.readFileSync(p, 'utf8');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail: ok ? undefined : detail });
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || detail === undefined ? '' : '  ' + JSON.stringify(detail).slice(0, 400)));
}

(async () => {
  const man = JSON.parse(read(path.join(ROOT, 'forge', 'manifest.json')));
  const OWN = { 146: require('../day146'), 147: path.join(require('../day147'), 'index.html'), 148: path.join(require('../day148'), 'index.html'), 149: path.join(require('../day149'), 'index.html') };

  // ---------------------------------------------------------------- 1.
  let vout = '', vok = true;
  try { vout = execFileSync('node', [path.join(ROOT, 'vendor.js'), '--check'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); } catch (e) { vok = false; vout = String(e.stderr || e.message); }
  check('vendor.js --check: every vendored file is byte equal to its owner and nothing extra is vendored', vok, vout.split('\n').filter((l) => /FAIL/.test(l)));
  const listed = man.core.concat(man.engines, ...Object.values(man.forges).map((f) => f.css.concat(f.js)));
  check('every file in forge/manifest.json exists with its recorded sha256 and size', listed.every((f) => { const t = read(path.join(ROOT, f.file)); return sha(t) === f.sha256 && Buffer.byteLength(t) === f.bytes; }));
  check('the manifest records the owners\' commits for all four forges', [146, 147, 148, 149].every((d) => man.owners[d] && /^[0-9a-f]{40}$/.test(man.owners[d].commit || '')), man.owners);

  // ---------------------------------------------------------------- 2.
  const engineBody = (key) => { const t = read(path.join(ROOT, 'engines', 'engine-' + key + '.js')); return t.slice(t.indexOf('*/\n') + 3); };
  const ENGINE_FENCE = { 'ENGINE:RENDER': 'render', 'ENGINE:AUDIO': 'audio', 'ENGINE:WORLD': 'world', 'ENGINE:STORY': 'story' };
  for (const d of [146, 147, 148, 149]) {
    const page = read(OWN[d]);
    const ownerFence = (name, css) => { const o = css ? '/* === ' + name + ' BEGIN === */' : '// === ' + name + ' BEGIN ===', c = css ? '/* === ' + name + ' END === */' : '// === ' + name + ' END ==='; const a = page.indexOf(o), z = page.indexOf(c); return page.slice(a, z + c.length); };
    // Rebuild the style and inline script regions in page order from what this repository holds.
    const order = (css) => {
      const re = css ? /^\/\* === ([A-Z0-9:_ ]+) BEGIN === \*\/$/gm : /^\/\/ === ([A-Z0-9:_ ]+) BEGIN ===$/gm;
      const region = css ? page.slice(page.indexOf('\n<style>\n'), page.indexOf('\n</style>')) : page.slice(page.indexOf('<script>\n// === KIT:CORE BEGIN ==='));
      const names = []; let m; while ((m = re.exec(region))) names.push(m[1]); return names;
    };
    const byFence = {}; man.forges[d].css.concat(man.forges[d].js).forEach((f) => { byFence[f.fence] = f; });
    const piece = (name, css) => {
      if (name === 'KIT:CORE') return read(path.join(ROOT, 'core', 'kit.js')).replace(/\n$/, '');
      if (name === 'KIT:CORE CSS') return read(path.join(ROOT, 'core', 'kit.css')).replace(/\n$/, '');
      if (ENGINE_FENCE[name]) return engineBody(ENGINE_FENCE[name]).replace(/\n$/, '');
      if (name === 'ENGINE:BATTLE') return ownerFence(name, false).slice(0, ownerFence(name, false).indexOf('\n') + 1) + engineBody('battle') + '// === ENGINE:BATTLE END ===';
      const f = byFence[name] || byFence[name.replace(/ CSS$/, '') + ' CSS'];
      if (f) {
        const t = read(path.join(ROOT, f.file)).replace(/\n$/, '');
        const tail = Object.values(byFence).find((x) => x.fence === name.replace(/ CSS$/, '') + ' TAIL' + (css ? ' CSS' : ''));
        return tail ? t + '\n' + read(path.join(ROOT, tail.file)).replace(/\n$/, '') : t;
      }
      return ownerFence(name, css); // demo fixtures and APP:BOOT stay with the owner
    };
    const css = order(true).map((n) => piece(n, true)).join('\n');
    const js = order(false).map((n) => piece(n, false)).join('\n');
    const rebuilt = page.slice(0, page.indexOf('\n<style>\n') + 9) + css + page.slice(page.indexOf('\n</style>'), page.indexOf('<script>\n// === KIT:CORE BEGIN ===') + 9) + js + page.slice(page.indexOf('// === APP:BOOT END ===') + '// === APP:BOOT END ==='.length);
    check('Day ' + d + '\'s page rebuilds byte for byte from core/, engines/, forge/' + d + '/, and the fences left with the owner', rebuilt === page, { rebuilt: rebuilt.length, page: page.length });
  }

  // ---------------------------------------------------------------- 3.
  const scripts = ['core/kit.js'].concat(man.engines.map((e) => e.file), ...Object.values(man.forges).map((f) => f.js.map((x) => x.file)));
  const parseErr = scripts.map((f) => { try { new vm.Script(read(path.join(ROOT, f)), { filename: f }); return null; } catch (e) { return f + ': ' + e.message; } }).filter(Boolean);
  check('all ' + scripts.length + ' vendored scripts parse on their own', !parseErr.length, parseErr);
  const cssFiles = ['core/kit.css'].concat(...Object.values(man.forges).map((f) => f.css.map((x) => x.file)));
  const unbalanced = cssFiles.filter((f) => { const t = read(path.join(ROOT, f)).replace(/\/\*[\s\S]*?\*\//g, ''); return t.split('{').length !== t.split('}').length; });
  check('all ' + cssFiles.length + ' vendored stylesheets have balanced braces', !unbalanced.length, unbalanced);

  // ---------------------------------------------------------------- 4.
  const box = vm.createContext({});
  man.loadOrder.forEach((f) => vm.runInContext(read(path.join(ROOT, f)), box, { filename: f }));
  check('the five engines load into a bare context in load order and declare exactly ENGINE_RENDER, ENGINE_AUDIO, ENGINE_WORLD, ENGINE_BATTLE, ENGINE_STORY', JSON.stringify(Object.keys(box).sort()) === JSON.stringify(['ENGINE_AUDIO', 'ENGINE_BATTLE', 'ENGINE_RENDER', 'ENGINE_STORY', 'ENGINE_WORLD']), Object.keys(box));
  check('the load order is render, audio, world, battle, story', JSON.stringify(man.loadOrder) === JSON.stringify(['render', 'audio', 'world', 'battle', 'story'].map((k) => 'engines/engine-' + k + '.js')));
  check('no engine contains </script or <!--, so each inlines byte for byte', man.engines.every((e) => !/<\/script|<!--/i.test(read(path.join(ROOT, e.file)))));

  // ---------------------------------------------------------------- 5.
  const kitHtml = '<!doctype html><html><head><meta charset="utf-8"><style>' + read(path.join(ROOT, 'core', 'kit.css')) + '</style></head><body><div id="overlays"></div><div id="toasts"></div><script>' + read(path.join(ROOT, 'core', 'kit.js')) + '</script></body></html>';
  const kitFile = path.join(OUT, '.kit-only.html');
  fs.writeFileSync(kitFile, kitHtml);
  const k = boot(kitFile, { url: 'https://augustineiacopelli.github.io/appaday-150-saga-studio/' });
  await wait(40);
  fs.unlinkSync(kitFile);
  const Kit = k.win.Kit;
  check('core/kit.js boots alone in a page, without errors, and exposes Kit', Kit && typeof Kit.bundle.hash === 'function' && !k.errors.length, k.errors);

  // ---------------------------------------------------------------- 6 and 7.
  const report = JSON.parse(read(path.join(OUT, 'fixtures-report.json')));
  for (const fx of ['demo', 'four']) {
    const text = read(path.join(OUT, fx + '149-bundle.json'));
    const b = JSON.parse(text), m = JSON.parse(read(path.join(OUT, fx + '149-manifest.json'))), d = m.day150;
    check(fx + ': the content hash verifies with core/kit.js', Kit && Kit.bundle.hash(b) === b.kit.contentHash && m.bundleHash === b.kit.contentHash);
    check(fx + ': a Day 149 Final, forges 146 to 149 final, story opened, nothing unresolved', ['146', '147', '148', '149'].every((f) => b.kit.forges[f] && b.kit.forges[f].status === 'final') && b.kit.opened.indexOf('story') >= 0 && m.forge === 149 && m.unresolved.length === 0);
    check(fx + ': the day150 contract\'s engines match engines/ by file, order, and sha256', d && JSON.stringify(d.engines.map((e) => e.file + ' ' + e.sha256)) === JSON.stringify(man.engines.map((e) => path.basename(e.file) + ' ' + e.sha256)), d && d.engines.map((e) => e.file + ' ' + e.sha256.slice(0, 12)));
    const H = box.ENGINE_STORY.host;
    let play;
    try { play = H.replay(H.load(b), d.golden.steps); } catch (e) { play = { ok: false, error: e.message }; }
    check(fx + ': the bare engines replay the golden path to the manifest\'s ending and state hash (' + d.golden.steps.length + ' steps)', play.ok && play.ending === d.golden.ending && play.hash === d.golden.hash, play.error || { ending: play.ending, hash: play.hash });
    const ro = report[fx] && report[fx].reopened;
    check(fx + ': Days 146, 147, 148, and 149 reopen it with a matching hash, no errors, and no broken references', ro && [146, 147, 148, 149].every((x) => ro[x] && ro[x].matches === true && ro[x].errors === 0 && ro[x].broken === 0 && ro[x].pageErrors === 0), ro);
  }

  // ---------------------------------------------------------------- 8.
  const mine = ['vendor.js', 'day146.js', 'day147.js', 'day148.js', 'day149.js', 'index.html', 'README.md', 'build-log.txt', 'test/boot.js', 'test/make-demo.js', 'test/phase0.js'].filter((f) => fs.existsSync(path.join(ROOT, f)));
  const nonAscii = mine.filter((f) => /[^\x00-\x7f]/.test(read(path.join(ROOT, f))));
  check('the new Day 150 sources are ASCII clean (' + mine.length + ' files)', !nonAscii.length, nonAscii);

  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(OUT, 'phase0-report.json'), JSON.stringify({ phase: 0, passed: results.length - failed.length, failed: failed.length, results }, null, 1) + '\n');
  console.log('\n' + (results.length - failed.length) + ' of ' + results.length + ' passed.');
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
