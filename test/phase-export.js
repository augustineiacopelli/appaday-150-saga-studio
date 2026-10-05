// Phase 7 acceptance: what Build game wrote, checked without a browser. Leans on test/phase6.js, which builds the files in
// headless Chromium and proves them there; this test reads those files from test/out/phase6/ and holds them to everything
// they must agree with outside the Studio. Writes test/out/phase-export-report.json.
//   1. the zip holds exactly one folder named for the game, with index.html, the five engines, bundle.json, the story
//      manifest and the README, and every entry carries the project's last saved time (deterministic)
//   2. every engine, in both forms, is pinned three ways and they agree: the sha256 in forge/manifest.json (vendor.js), the
//      Day 150 contract in the fixture's story manifest, and the bytes in the owner's own repository (the Day 149 clone)
//   3. the two forms of the same game agree: the one file's inline bundle is the zip's bundle.json; player.js and player.css
//      are the same bytes in both; the bundle hash named on engine-story.js, in the manifest and in the one file is the one
//      the bundle carries
//   4. the zip's story manifest is the fixture's, for this bundle: same Day 150 contract (golden path, endings, opening),
//      nothing unresolved, exportedAt pinned to the project's last saved time
//   5. the unzipped folder opened in jsdom from disk loads its engines from beside it (no inlining), with browser storage
//      unavailable, and the game still reaches the title, plays the opening onto the contract's opening state, and walks
//      the golden path through its first chapter (the whole path when the golden list holds one chapter start)
// Run from test/ after npm install, node make-demo.js and node phase6.js, with the Day 149 clone beside this repository.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const JSZip = require('jszip');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));
const { botRun } = require('./player-bot');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'out'), BUILT = path.join(OUT, 'phase6');
const D149 = require('../day149');
const read = (f) => fs.readFileSync(f, 'utf8');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const J = JSON.stringify;
const results = [];
let failed = 0;
function check(name, ok, info) { results.push({ name, ok: !!ok, info: ok ? undefined : info }); if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || info === undefined ? '' : ' :: ' + J(info).slice(0, 600))); }
const KIT = ['engine-render.js', 'engine-audio.js', 'engine-world.js', 'engine-battle.js', 'engine-story.js'];
const scripts = (html) => [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({ attrs: m[1], text: m[2] }));
const noHashLine = (s) => s.replace(/^\/\* Bundle hash [0-9a-f]+ \*\/\n/m, '');
const strip = (m) => { const c = JSON.parse(J(m)); delete c.exportedAt; return c; };

(async () => {
  const report = {};
  const ZIPF = path.join(BUILT, 'four-continents-game.zip'), ONEF = path.join(BUILT, 'four-four-continents.html');
  if (!fs.existsSync(ZIPF) || !fs.existsSync(ONEF)) { check('the built files exist (run node phase6.js first)', false, [ZIPF, ONEF]); return finish(report); }
  const FIX = JSON.parse(read(path.join(OUT, 'four149-bundle.json'))), FMAN = JSON.parse(read(path.join(OUT, 'four149-manifest.json')));
  const VEND = JSON.parse(read(path.join(ROOT, 'forge', 'manifest.json')));

  // ---------------------------------------------------------------- 1. the zip
  const zbytes = fs.readFileSync(ZIPF), zip = await JSZip.loadAsync(zbytes);
  const all = Object.keys(zip.files), dirs = all.filter((n) => zip.files[n].dir), files = all.filter((n) => !zip.files[n].dir).sort();
  const slug = (dirs[0] || '').replace(/\/$/, '');
  const want = ['README.md', 'bundle.json', 'index.html', slug + '-story-manifest.json'].concat(KIT).map((n) => slug + '/' + n).sort();
  check('zip: one folder, named for the game (' + slug + '), holding exactly the nine game files', dirs.length === 1 && J(files) === J(want), { dirs, files });
  const Z = {};
  for (const n of files) Z[n.slice(slug.length + 1)] = await zip.file(n).async('string');
  const zb = JSON.parse(Z['bundle.json']), saved = new Date(zb.kit.updatedAt).getTime();
  const dates = all.map((n) => zip.files[n].date.getTime());
  check('zip: every entry carries the project\'s last saved time, so the same project zips to the same bytes', dates.every((d) => Math.abs(d - saved) < 2000), { saved: zb.kit.updatedAt, dates: [...new Set(dates)].map((d) => new Date(d).toISOString()) });
  check('zip: every file is pure ASCII', Object.keys(Z).every((k) => !/[^\x00-\x7f]/.test(Z[k])), Object.keys(Z).filter((k) => /[^\x00-\x7f]/.test(Z[k])));

  // ---------------------------------------------------------------- 2. the engines, pinned three ways
  const one = read(ONEF), sc = scripts(one), inl = sc.filter((s) => !/src=/.test(s.attrs));
  const pinVendor = {}; VEND.engines.forEach((e) => { pinVendor[path.basename(e.file)] = e.sha256; });
  const pinContract = {}; FMAN.day150.engines.forEach((e) => { pinContract[e.file] = e.sha256; });
  const owner = {}; KIT.forEach((f) => { owner[f] = read(path.join(D149, f)); });
  const rows = KIT.map((f, i) => {
    const z = noHashLine(Z[f]), o = noHashLine(inl[i].text.replace(/^\n/, ''));
    return { f, zip: sha(z), one: sha(o), vendor: pinVendor[f], contract: pinContract[f], owner: sha(owner[f]), studio: sha(read(path.join(ROOT, 'engines', f))) };
  });
  check('engines: in the zip and in the one file, each matches vendor.js\'s pin, the Day 150 contract\'s pin and the Day 149 repository\'s own bytes',
    rows.every((r) => r.zip === r.one && r.one === r.vendor && r.vendor === r.contract && r.contract === r.owner && r.owner === r.studio), rows);
  check('engines: the contract\'s load order is render, audio, world, battle, story, and both forms load them in that order',
    J(FMAN.day150.loadOrder) === J(KIT) && J(scripts(Z['index.html']).slice(0, 5).map((s) => (/src="([^"]+)"/.exec(s.attrs) || [])[1])) === J(KIT));
  report.engines = rows;

  // ---------------------------------------------------------------- 3. the two forms agree
  const oneBundle = JSON.parse(inl[5].text), zIdx = scripts(Z['index.html']);
  check('forms: the one file\'s inline bundle is the zip\'s bundle.json', J(oneBundle) === J(zb));
  check('forms: player.js is the same bytes in both, and is player/player.js', inl[6].text === zIdx[6].text && inl[6].text.replace(/^\n/, '') === read(path.join(ROOT, 'player', 'player.js')));
  const css = (h) => (/<style>\n([\s\S]*?)<\/style>/.exec(h) || [])[1];
  check('forms: player.css is the same bytes in both, and is player/player.css', css(one) === css(Z['index.html']) && css(one) === read(path.join(ROOT, 'player', 'player.css')));
  const h = zb.kit.contentHash, zman = JSON.parse(Z[slug + '-story-manifest.json']);
  check('forms: the bundle hash ' + h + ' is named on engine-story.js, in the story manifest and in the one file\'s comment',
    /^[0-9a-f]{8,}$/.test(h) && Z['engine-story.js'].indexOf('/* Bundle hash ' + h + ' */\n') > 0 && zman.bundleHash === h && one.indexOf('Bundle hash ' + h) > 0);
  const strip2 = (b) => { const c = JSON.parse(J(b)); c.kit.contentHash = ''; return J(c); };
  check('forms: apart from the content hash Build game stamps, the bundle is the Day 149 Final fixture it was built from', strip2(zb) === strip2(FIX), { zipHash: h, fixtureHash: FIX.kit.contentHash });

  // ---------------------------------------------------------------- 4. the story manifest
  check('manifest: the Day 150 contract is the fixture\'s (opening, golden path, endings, engines, load order)',
    ['opening', 'golden', 'endings', 'engines', 'loadOrder', 'contract', 'newGame'].every((k) => J(zman.day150[k]) === J(FMAN.day150[k])),
    ['opening', 'golden', 'endings', 'engines', 'loadOrder', 'contract', 'newGame'].filter((k) => J(zman.day150[k]) !== J(FMAN.day150[k])));
  check('manifest: nothing unresolved, and exportedAt is the project\'s last saved time', Array.isArray(zman.unresolved) && !zman.unresolved.length && zman.exportedAt === zb.kit.updatedAt, { unresolved: zman.unresolved, exportedAt: zman.exportedAt, saved: zb.kit.updatedAt });
  check('README: names every file and the bundle hash', ['index.html', 'bundle.json', slug + '-story-manifest.json'].concat(KIT).every((f) => Z['README.md'].indexOf(f) >= 0) && Z['README.md'].indexOf(h) >= 0);

  // ---------------------------------------------------------------- 5. the folder runs from disk
  const dir = path.join(OUT, 'phase-export', slug);
  fs.rmSync(path.join(OUT, 'phase-export'), { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  Object.keys(Z).forEach((k) => fs.writeFileSync(path.join(dir, k), Z[k]));
  const errors = [], requests = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { const m = String(e && e.message || e); if (!/Not implemented: HTMLCanvasElement/.test(m)) errors.push(m.slice(0, 300)); });
  vc.on('error', (...a) => errors.push(a.join(' ').slice(0, 300)));
  const dom = await JSDOM.fromFile(path.join(dir, 'index.html'), {
    runScripts: 'dangerously', resources: 'usable', pretendToBeVisual: true, virtualConsole: vc,
    beforeParse(win) {
      win.matchMedia = function (q) { return { matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }; };
      win.HTMLCanvasElement.prototype.getContext = function () { return null; };
      win.fetch = function (u) { requests.push('fetch ' + u); return Promise.reject(new Error('network refused')); };
      win.WebSocket = function (u) { requests.push('ws ' + u); throw new Error('network refused'); };
    }
  });
  const win = dom.window;
  for (let i = 0; i < 400; i++) { const s = win.SagaPlayer && win.SagaPlayer.debug.state(); if (s && s.mode !== 'boot') break; await new Promise((r) => setTimeout(r, 25)); }
  let storage = 'available';
  try { void win.localStorage.length; } catch (e) { storage = 'unavailable (' + e.name + ')'; }
  const loaded = ['ENGINE_RENDER', 'ENGINE_AUDIO', 'ENGINE_WORLD', 'ENGINE_BATTLE', 'ENGINE_STORY'].every((g) => !!win[g]);
  const t0 = win.SagaPlayer ? win.SagaPlayer.debug.state() : null;
  check('folder: opened from disk, index.html loads the five engines from the files beside it and reaches the title (browser storage ' + storage + ')', loaded && !!t0 && t0.mode === 'title' && !errors.length, { loaded, state: t0, errors });
  report.folderStorage = storage;
  if (t0 && t0.mode === 'title') {
    const D = win.SagaPlayer.debug;
    D.pause(true); D.newGame();
    let s = D.state();
    for (let i = 0; i < 400; i++) { s = D.tick(100, 25); if (s.mode === 'event') { if (s.text) D.press('a'); continue; } break; }
    check('folder: a new game lands on the contract\'s opening state', s.mode === 'field' && s.hash === FMAN.day150.opening.hash, { got: s.hash, want: FMAN.day150.opening.hash });
    // the first chapter of the golden path: every step up to the second chapterStart
    const steps = FMAN.day150.golden.steps, cut = steps.findIndex((x, i) => i > 0 && x.by === 'chapterStart');
    const first = steps.slice(0, cut > 0 ? cut : steps.length);
    win.eval('window.botRun = ' + botRun.toString());
    const ch = []; first.forEach((x) => (x.choices || []).forEach((c) => ch.push(c)));
    const r = win.botRun({ golden: first, choices: ch, maxMs: 3 * 3600 * 1000 });
    const key = (x) => x.by + ':' + (x.evt || x.npc), pl = (r.played || []).map(key);
    let j = 0; for (let i = 0; i < pl.length && j < first.length; i++) if (pl[i] === key(first[j])) j++;
    const whole = first.length === steps.length;
    check('folder: ' + (whole ? 'the whole golden path (' + first.length + ' steps) walks to the golden ending' : 'the first chapter of the golden path (' + first.length + ' steps) plays in order') + ' with no fault and no request, storage or not',
      j === first.length && (!whole || r.ending === FMAN.day150.golden.ending) && !(r.faults || []).length && !errors.length && !requests.length, { reached: j, of: first.length, ending: r.ending, reason: r.reason, faults: r.faults, errors: errors.slice(0, 3), requests });
  }
  win.close();
  finish(report);
})().catch((e) => { console.error(e); process.exit(2); });

function finish(report) {
  report.passed = results.length - failed; report.total = results.length; report.results = results;
  fs.writeFileSync(path.join(OUT, 'phase-export-report.json'), JSON.stringify(report, null, 2));
  console.log('\nPhase 7 export: ' + (results.length - failed) + ' of ' + results.length + ' checks pass.');
  process.exit(failed ? 1 : 0);
}
