// Phase 6 acceptance: Build game. Runs the shipped Studio page in headless Chromium with Playwright, then plays what it builds
// in browsers that hold nothing else. Writes test/out/phase6-report.json, the built files and screenshots.
//   1. static rules: core/export.js is ASCII, parses, plain ES5, no forbidden API, no network but the JSZip script; index.html
//      loads the player text and export after test play and before studio-boot; core/player-text.js is player/ exactly;
//      vendor.js --check is clean (it asserts every inlined file has no closing script or style tag and is ASCII)
//   2. the gate: a project short of Final (the Day 148 fixture) and a Final project made stale are refused with the reason, the
//      buttons say why and download nothing; a Final project whose story checks have not run is built after running them
//   3. the one file, per fixture: pure ASCII; the five engines inline byte for byte in contract order, each matching its
//      sha256; the bundle parses to the project in memory with its content hash; player.js and player.css byte for byte;
//      nothing of the Studio, the forges or an API in it; the same project builds the same bytes; building changes nothing
//   4. the one file plays on its own: opened from disk with every network request refused, it reaches the title, the opening
//      lands on the contract's opening state, and the golden path walks to the golden ending with no fault and no request
//   5. every ending of the demo is reached in the exported file by its own choices
//   6. the folder: the zip holds index.html, the five engines, bundle.json, the manifest and the README; engines match their
//      sha256 and engine-story.js carries the bundle hash line; the manifest's day150 block is the contract; the same project
//      zips to the same bytes; unzipped and opened from disk, index.html loads its engines from beside it and plays the opening
//   7. with cdnjs unreachable the zip button downloads the same files one by one, under names that cannot collide
//   8. layout of the Game stage at 390 by 844 and 1280 by 800: 44 px targets, no page scroll sideways
// Run from test/ after npm install and node make-demo.js once, with the forge clones beside this repository.
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const crypto = require('crypto');
const { serve } = require('./serve');
const { botRun } = require('./player-bot');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = require('/opt/npm-tools/node_modules/playwright').chromium; }
const JSZip = require('jszip');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'out'), BUILT = path.join(OUT, 'phase6');
const read = (f) => fs.readFileSync(f, 'utf8');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const noHashLine = (s) => s.replace(/^\/\* Bundle hash [0-9a-f]+ \*\/\n/m, '');
const results = [];
let failed = 0;
function check(name, ok, info) { results.push({ name, ok: !!ok, info: ok ? undefined : info }); if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || info === undefined ? '' : ' :: ' + JSON.stringify(info).slice(0, 600))); }
const J = JSON.stringify;
const FX = { demo: read(path.join(OUT, 'demo149-bundle.json')), four: read(path.join(OUT, 'four149-bundle.json')) };
const MAN = { demo: JSON.parse(read(path.join(OUT, 'demo149-manifest.json'))).day150, four: JSON.parse(read(path.join(OUT, 'four149-manifest.json'))).day150 };
const KIT = ['engine-render.js', 'engine-audio.js', 'engine-world.js', 'engine-battle.js', 'engine-story.js'];
const ENG = {};
KIT.forEach((f) => { ENG[f] = read(path.join(ROOT, 'engines', f)); });
const TABLE = JSON.parse(read(path.join(ROOT, 'forge', 'manifest.json'))).engines;
const PIN = {};
TABLE.forEach((e) => { PIN[path.basename(e.file)] = e.sha256; });
const JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const JSZIP_JS = path.join(__dirname, 'node_modules', 'jszip', 'dist', 'jszip.min.js');
let D148 = null;
try { D148 = read(path.join(require('../day149'), 'test', 'out', 'demo148-bundle.json')); } catch (e) { D148 = null; }
fs.mkdirSync(BUILT, { recursive: true });

async function studio(br, url, o) {
  o = o || {};
  const ctx = await br.newContext({ viewport: o.viewport || { width: 1280, height: 800 }, acceptDownloads: true });
  if (o.cdn === 'local') await ctx.route(JSZIP_URL, (r) => r.fulfill({ status: 200, path: JSZIP_JS, headers: { 'content-type': 'text/javascript', 'access-control-allow-origin': '*' } }));
  if (o.cdn === 'down') await ctx.route(JSZIP_URL, (r) => r.abort('internetdisconnected'));
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('studio: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g|jszip/i.test(m.text())) errors.push('studio console: ' + m.text()); });
  await page.goto(url + '/index.html');
  await page.waitForFunction(() => window.Studio && window.Studio.build && window.Studio.build.installed && window.Studio.testplay.installed, null, { timeout: 60000 });
  await page.evaluate(() => window.Studio.booted);
  return { ctx, page, errors };
}
async function openProject(page, text) {
  await page.evaluate((t) => { const r = Studio.projects.importText(t); Studio.show(r.placement.stage); }, text);
  await page.waitForTimeout(300);
}
async function showGame(page) { await page.evaluate(() => { Studio.show('game'); }); await page.waitForTimeout(250); }
// A browser that holds only the built game: opened from disk, every request that is not the file itself refused and logged.
async function game(br, file, o) {
  o = o || {};
  const ctx = await br.newContext({ viewport: o.viewport || { width: 1280, height: 800 } });
  const requests = [];
  await ctx.route('**/*', (r) => { const u = r.request().url(); if (u.startsWith('file:')) return r.continue(); requests.push(u); return r.abort(); });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + file);
  await page.waitForFunction(() => window.SagaPlayer && SagaPlayer.debug.state().mode !== 'boot', null, { timeout: 60000 });
  await page.addScriptTag({ content: 'window.botRun = ' + botRun.toString() });
  return { ctx, page, errors, requests };
}
async function settleText(page) {
  return page.evaluate(() => { const D = SagaPlayer.debug; D.pause(true); for (let i = 0; i < 200; i++) { const s = D.tick(100, 25); if (s.mode === 'event') { if (s.text) D.press('a'); continue; } return s; } return D.state(); });
}
// The inline scripts of a built page, in order: [{attrs, text}].
function scripts(html) { return [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({ attrs: m[1], text: m[2] })); }

(async () => {
  const report = { fixtures: {} };
  // ---------------------------------------------------------------- 1. static rules
  const ex = read(path.join(ROOT, 'core', 'export.js')), html = read(path.join(ROOT, 'index.html')), pl = read(path.join(ROOT, 'core', 'player-text.js'));
  const pjs = read(path.join(ROOT, 'player', 'player.js')), pcss = read(path.join(ROOT, 'player', 'player.css'));
  check('core/export.js, core/player-text.js and studio.css are pure ASCII', ![ex, pl, read(path.join(ROOT, 'core', 'studio.css'))].some((t) => /[^\x00-\x7f]/.test(t)));
  check('core/export.js and core/player-text.js parse', [ex, pl].every((t) => { try { new Function(t); return true; } catch (e) { return false; } }));
  const codeRaw = ex.replace(/\/\/.*$/gm, '');
  const code = ex.replace(/\/\/.*$/gm, '').replace(/'(?:[^'\\\n]|\\.)*'/g, "''");
  check('core/export.js is plain ES5 (no arrows, let, const, classes, template strings)', !/=>|\blet\s|\bconst\s|\bclass\s|`/.test(code));
  check('core/export.js uses no forbidden API (roundRect, ellipse, confirm, bare remove, eval)', !/roundRect|\.ellipse\(|window\.confirm|[^.\w]confirm\(|\.remove\(\)|[^.\w]eval\(|new Function/.test(code));
  check('core/export.js makes no network call but the JSZip script from cdnjs, and holds no key', !/\bfetch\(|XMLHttpRequest|anthropic|x-api-key/i.test(codeRaw) && (ex.match(/https:\/\/[^'"\s)]+/g) || []).filter((u) => !/augustineiacopelli\.github\.io/.test(u)).every((u) => u === JSZIP_URL || /^https:\/\/augustineiacopelli\.github\.io\/appaday(-150-saga-studio)?\/$/.test(u)) && ex.indexOf(JSZIP_URL) > 0);
  check('core/export.js holds no literal closing script or style tag, so it can be inlined anywhere (the jsdom harness does)', !/<\/script|<\/style/i.test(ex));
  const order = ['core/testplay.js', 'core/player-text.js', 'core/export.js', 'core/studio-boot.js'].map((s) => html.indexOf('<script src="' + s + '"></script>'));
  check('index.html loads test play, the player text, Build game, then studio-boot', order.every((i) => i > 0) && order[0] < order[1] && order[1] < order[2] && order[2] < order[3], order);
  const sandbox = { window: {} };
  new Function('window', pl)(sandbox.window);
  const PT = sandbox.window.STUDIO_PLAYER_TEXT;
  check('core/player-text.js is player/player.js and player/player.css exactly, with their sha256', PT.js === pjs && PT.css === pcss && PT.sha256.js === sha(pjs) && PT.sha256.css === sha(pcss));
  const vc = cp.spawnSync('node', ['vendor.js', '--check'], { cwd: ROOT, encoding: 'utf8' });
  check('vendor.js --check is clean (owners byte for byte; every inlined file free of closing tags and ASCII)', vc.status === 0, (vc.stdout + vc.stderr).split('\n').filter((l) => /FAIL|problem/.test(l)));
  check('the engines folder still matches its sha256 pins', KIT.every((f) => sha(noHashLine(ENG[f])) === PIN[f]));

  const { srv, url } = await serve();
  const br = await chromium.launch();
  try {
    const S = await studio(br, url, { cdn: 'local' });
    const page = S.page;
    // ---------------------------------------------------------------- 2. the gate
    if (D148) {
      await openProject(page, D148);
      const g = await page.evaluate(() => ({ blocked: Studio.build.blocked(), req: Studio.build.requirements().map((r) => r.key + ':' + r.ok), only: Studio.build.onlyUnchecked() }));
      check('gate: a Day 148 Final (no Final story) is refused with the reason', /Story/.test(g.blocked || '') && !g.only, g);
      let threw = null;
      try { await page.evaluate(() => Studio.build.buildSingle()); } catch (e) { threw = e.message; }
      check('gate: building it directly throws the reason, nothing is built', /not ready/.test(threw || ''), threw);
    } else check('gate: the Day 148 fixture is available (the Day 149 clone sits beside this repository)', false);
    await openProject(page, FX.demo);
    const pend = await page.evaluate(() => ({ blocked: Studio.build.blocked(), only: Studio.build.onlyUnchecked() }));
    check('gate: a Final project whose story checks have not run says so, and the buttons will run them first', /checks have not run/.test(pend.blocked || '') && pend.only, pend);
    await showGame(page);
    check('gate: the Game stage shows Build game with both buttons enabled for it', await page.evaluate(() => { const a = document.getElementById('btnBuildSingle'), z = document.getElementById('btnBuildZip'); return !!a && !!z && a.getAttribute('aria-disabled') !== 'true' && z.getAttribute('aria-disabled') !== 'true'; }));
    // Stale: the World stage loses its Final mark in memory. Story goes stale with it, and nothing builds.
    const stale = await page.evaluate(() => {
      const b = Kit.bundle.current(), keep = JSON.stringify(b.kit.forges['148']);
      b.kit.forges['148'].status = 'draft';
      Kit.rerender();
      const out = { blocked: Studio.build.blocked(), req: Studio.build.requirements().filter((r) => !r.ok).map((r) => r.key), disabled: (document.getElementById('btnBuildSingle') || {}).getAttribute ? document.getElementById('btnBuildSingle').getAttribute('aria-disabled') : null };
      b.kit.forges['148'] = JSON.parse(keep);
      Kit.rerender();
      return out;
    });
    check('gate: a project with a stage no longer Final is refused, naming that stage, and the Story stage is shown stale', /World/.test(stale.blocked || '') && stale.req.indexOf('world') >= 0 && stale.req.indexOf('story') >= 0 && stale.disabled === 'true', stale);
    const before = await page.evaluate(() => Studio.unresolved.summary());
    const clickDl = [];
    page.on('download', (d) => clickDl.push(d.suggestedFilename()));
    await page.evaluate(() => { const b = Kit.bundle.current(); b.kit.forges['148'].status = 'draft'; Kit.rerender(); });
    await page.waitForTimeout(150);
    await page.click('#btnBuildSingle', { force: true });
    await page.waitForTimeout(600);
    check('gate: clicking a refused button downloads nothing and says why', !clickDl.length && await page.evaluate(() => /World/.test(document.body.textContent)), clickDl);
    await openProject(page, FX.demo);
    check('gate: before building, the drawer counts the story checks as unchecked', before.pending > 0 && !before.blocking && !before.owed, before);

    // ---------------------------------------------------------------- 3 and 4. the one file, per fixture
    for (const fx of ['demo', 'four']) {
      await openProject(page, FX[fx]);
      await showGame(page);
      const dlP = page.waitForEvent('download', { timeout: 120000 });
      await page.click('#btnBuildSingle');
      const dl = await dlP;
      const file = path.join(BUILT, fx + '-' + dl.suggestedFilename());
      await dl.saveAs(file);
      const res = await page.evaluate(() => Studio.build.last);
      const text = read(file);
      const mem = await page.evaluate(() => ({ hash: Kit.bundle.hash(), json: JSON.stringify(Kit.bundle.current()), slug: Kit.bundle.slug(), sum: Studio.unresolved.summary() }));
      check(fx + ': clicking One HTML file runs the unrun checks, then downloads <slug>.html', dl.suggestedFilename() === mem.slug + '.html' && res && res.kind === 'single' && mem.sum.empty, { name: dl.suggestedFilename(), res, sum: mem.sum });
      check(fx + ': the file is pure ASCII', !/[^\x00-\x7f]/.test(text));
      const sc = scripts(text), inline = sc.filter((s) => !/src=/.test(s.attrs));
      const engs = inline.slice(0, 5).map((s) => s.text.replace(/^\n/, ''));
      check(fx + ': the five engines are inline byte for byte, in contract order', sc.length === 7 && KIT.every((f, i) => engs[i] === ENG[f]), { scripts: sc.length });
      check(fx + ': each inline engine matches its sha256 pin and the contract\'s', KIT.every((f, i) => sha(noHashLine(engs[i])) === PIN[f] && MAN[fx].engines[i].sha256 === PIN[f]));
      const bj = sc[5], pj = sc[6];
      check(fx + ': the bundle is an application/json script with id saga-bundle, before player.js', /type="application\/json"/.test(bj.attrs) && /id="saga-bundle"/.test(bj.attrs) && pj.text.replace(/^\n/, '') === pjs);
      const parsed = JSON.parse(bj.text), memB = JSON.parse(mem.json);
      const strip = (o) => { const c = JSON.parse(JSON.stringify(o)); c.kit.contentHash = ''; return J(c); };
      check(fx + ': the bundle parses to the project in memory, stamped with its content hash', strip(parsed) === strip(memB) && parsed.kit.contentHash === mem.hash && res.info.hash === mem.hash, { contentHash: parsed.kit.contentHash, mem: mem.hash, res: res && res.info && res.info.hash, same: strip(parsed) === strip(memB) });
      check(fx + ': the bundle text holds no "<", ">" or "&" and no non ASCII (escaped as \\uXXXX)', !/[<>&]/.test(bj.text) && !/[^\x00-\x7f]/.test(bj.text));
      const style = /<style>\n([\s\S]*?)<\/style>/.exec(text);
      check(fx + ': player.css is inline byte for byte', !!style && style[1] === pcss);
      const live = text.replace(bj.text, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '').replace(/^\s*\/\/.*$/gm, '').replace(/([^:'"\\])\/\/[^'"\n]*$/gm, '$1');
      const hits = (live.match(/\bKit\.|\bSTORY\.|\bWSX?\.|['"](core|forge)\/|\bStudio\.[a-z]/g) || []).concat(live.match(/anthropic|x-api-key/ig) || []);
      check(fx + ': nothing of the Studio, the forges or an API key in its code: no Kit, STORY, WS, core/ or forge/ paths, anthropic', !hits.length, hits.slice(0, 5));
      check(fx + ': the page names the bundle hash and each engine sha256 in its comment', text.indexOf('Bundle hash ' + mem.hash) > 0 && KIT.every((f) => text.indexOf(f + ' ' + PIN[f]) > 0));
      const again = await page.evaluate(() => { const a = JSON.stringify(Kit.bundle.current()), h = Kit.bundle.hash(), r = Studio.build.buildSingle(); return { text: r.text, same: JSON.stringify(Kit.bundle.current()) === a && Kit.bundle.hash() === h }; });
      check(fx + ': the same project builds the same bytes, and building changes nothing in the project', again.text === text && again.same);
      report.fixtures[fx] = { file: path.relative(ROOT, file), bytes: Buffer.byteLength(text), hash: mem.hash };

      // 4. plays on its own
      const G = await game(br, file);
      await G.page.waitForFunction(() => SagaPlayer.debug.state().mode === 'title', null, { timeout: 60000 });
      check(fx + ': opened from disk with the network refused, the file reaches the title', true);
      check(fx + ': the page title is the game\'s', (await G.page.title()) === JSON.parse(FX[fx]).kit.title.replace(/[^\x00-\x7f]/g, (c) => c));
      await G.page.evaluate(() => { const D = SagaPlayer.debug; D.pause(true); D.newGame(); });
      const s1 = await settleText(G.page);
      check(fx + ': a new game lands on the contract\'s opening state', s1.mode === 'field' && s1.hash === MAN[fx].opening.hash && s1.chapter === MAN[fx].opening.chapter, { got: s1.hash, want: MAN[fx].opening.hash });
      const choices = [];
      MAN[fx].golden.steps.forEach((s) => (s.choices || []).forEach((c) => choices.push(c)));
      const t0 = Date.now();
      const g = await G.page.evaluate((o) => window.botRun(o), { golden: MAN[fx].golden.steps, choices });
      check(fx + ': the golden path (' + MAN[fx].golden.steps.length + ' steps) walks to the golden ending in the exported file', g.ok && g.ending === MAN[fx].golden.ending, { reason: g.reason, ending: g.ending, log: (g.log || []).slice(-5) });
      check(fx + ': no fault, no page error, and not one network request on the way', !(g.faults || []).length && !G.errors.length && !G.requests.length, { faults: g.faults, errors: G.errors, requests: G.requests.slice(0, 5) });
      report.fixtures[fx].goldenWallMs = Date.now() - t0;
      await G.page.screenshot({ path: path.join(OUT, 'phase6-ending-' + fx + '.png') });
      await G.ctx.close();
    }

    // ---------------------------------------------------------------- 5. every ending of the demo, in the exported file
    const demoFile = path.join(ROOT, report.fixtures.demo.file);
    for (const e of MAN.demo.endings) {
      const G = await game(br, demoFile);
      await G.page.evaluate(() => { SagaPlayer.debug.pause(true); SagaPlayer.debug.newGame(); });
      await settleText(G.page);
      const choices = [];
      e.steps.forEach((s) => (s.choices || []).forEach((c) => choices.push(c)));
      const g = await G.page.evaluate((o) => window.botRun(o), { golden: e.steps, choices });
      check('demo export: ending ' + e.end + ' is reached by its own choices', g.ok && g.ending === e.end && !G.requests.length, { reason: g.reason, ending: g.ending, requests: G.requests.length });
      await G.ctx.close();
    }

    // ---------------------------------------------------------------- 6. the folder
    await openProject(page, FX.four);
    await showGame(page);
    await page.evaluate(() => Studio.build.ensureChecked());
    const zP = page.waitForEvent('download', { timeout: 120000 });
    await page.click('#btnBuildZip');
    const zdl = await zP;
    const zfile = path.join(BUILT, zdl.suggestedFilename());
    await zdl.saveAs(zfile);
    const zmem = await page.evaluate(() => ({ hash: Kit.bundle.hash(), slug: Kit.bundle.slug(), last: Studio.build.last }));
    check('folder: Folder as a .zip downloads <slug>-game.zip through JSZip', zdl.suggestedFilename() === zmem.slug + '-game.zip' && zmem.last.kind === 'zip', zmem.last);
    const zip = await JSZip.loadAsync(fs.readFileSync(zfile));
    const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort();
    const want = ['README.md', 'bundle.json', 'index.html', zmem.slug + '-story-manifest.json'].concat(KIT).map((n) => zmem.slug + '/' + n).sort();
    check('folder: the zip holds index.html, the five engines, bundle.json, the story manifest and the README, in one folder', J(names) === J(want), names);
    const Z = {};
    for (const n of names) Z[n.slice(zmem.slug.length + 1)] = await zip.file(n).async('string');
    check('folder: each engine matches its sha256 pin', KIT.every((f) => sha(noHashLine(Z[f])) === PIN[f]));
    check('folder: four engines are byte for byte; engine-story.js differs only by the bundle hash line under its header', KIT.slice(0, 4).every((f) => Z[f] === ENG[f]) && noHashLine(Z['engine-story.js']) === ENG['engine-story.js'] && Z['engine-story.js'].indexOf('*/\n/* Bundle hash ' + zmem.hash + ' */\n') > 0);
    const zb = JSON.parse(Z['bundle.json']);
    check('folder: bundle.json is the project with its content hash', zb.kit.contentHash === zmem.hash);
    const zsc = scripts(Z['index.html']);
    check('folder: index.html loads the five engines from beside it in order, then the inline bundle and player.js', J(zsc.slice(0, 5).map((s) => (/src="([^"]+)"/.exec(s.attrs) || [])[1])) === J(KIT) && J(JSON.parse(zsc[5].text)) === J(zb) && zsc[6].text.replace(/^\n/, '') === pjs);
    const zman = JSON.parse(Z[zmem.slug + '-story-manifest.json']);
    check('folder: the manifest is Day 149\'s, for this bundle hash, with the Day 150 contract and nothing unresolved', zman.bundleHash === zmem.hash && zman.day150 && zman.day150.contract === 1 && !zman.unresolved.length && J(zman.day150.loadOrder) === J(KIT));
    check('folder: the README names every file and the bundle hash, in ASCII', ['index.html', 'bundle.json'].concat(KIT).every((f) => Z['README.md'].indexOf(f) > 0) && Z['README.md'].indexOf(zmem.hash) > 0 && !/[^\x00-\x7f]/.test(Z['README.md']));
    const zz = await page.evaluate(async () => {
      const f = Studio.build.buildFolder(), JS = await Studio.build.loadZip();
      const toB64 = (b) => new Promise((r) => { const rd = new FileReader(); rd.onload = () => r(String(rd.result).split(',')[1]); rd.readAsDataURL(b); });
      return [await toB64(await Studio.build.zip(f, JS)), await toB64(await Studio.build.zip(Studio.build.buildFolder(), JS))];
    });
    check('folder: the same project zips to the same bytes, twice in a row', zz[0] === zz[1], [zz[0].length, zz[1].length]);
    check('folder: and those are the downloaded zip\'s bytes', Buffer.from(zz[0], 'base64').equals(fs.readFileSync(zfile)), [Buffer.from(zz[0], 'base64').length, fs.statSync(zfile).size]);
    const dir = path.join(BUILT, 'unzipped');
    fs.rmSync(dir, { recursive: true, force: true });
    for (const n of names) { const p = path.join(dir, n); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, Z[n.slice(zmem.slug.length + 1)]); }
    const G = await game(br, path.join(dir, zmem.slug, 'index.html'));
    await G.page.waitForFunction(() => SagaPlayer.debug.state().mode === 'title', null, { timeout: 60000 });
    await G.page.evaluate(() => { const D = SagaPlayer.debug; D.pause(true); D.newGame(); });
    const zs = await settleText(G.page);
    check('folder: unzipped and opened from disk, index.html loads its engines from beside it and plays the opening', zs.mode === 'field' && zs.hash === MAN.four.opening.hash && !G.errors.length && !G.requests.length, { hash: zs.hash, errors: G.errors, requests: G.requests });
    await G.ctx.close();
    check('no page errors in the Studio', !S.errors.length, S.errors);
    await S.ctx.close();

    // ---------------------------------------------------------------- 7. no cdnjs: the same files, one by one
    {
      const T = await studio(br, url, { cdn: 'down' });
      await openProject(T.page, FX.demo);
      await showGame(T.page);
      await T.page.evaluate(() => Studio.build.ensureChecked());
      const got = [];
      T.page.on('download', (d) => got.push(d.suggestedFilename()));
      const slug = await T.page.evaluate(() => Kit.bundle.slug());
      const r = await T.page.evaluate(() => Studio.build.downloadZip({ timeout: 4000 }));
      await T.page.waitForTimeout(9 * 350 + 1500);
      const wantFiles = [slug + '.html', slug + '-bundle.json', slug + '-story-manifest.json', slug + '-README.md'].concat(KIT).sort();
      check('fallback: with cdnjs unreachable the zip button downloads the nine game files one by one', r.ok && r.kind === 'files' && J(got.slice().sort()) === J(wantFiles), { r, got });
      check('fallback: and says so, telling the person to rename the page to index.html', await T.page.evaluate(() => /one by one/.test(document.body.textContent) && /index\.html/.test(document.body.textContent)));
      await T.ctx.close();
    }

    // ---------------------------------------------------------------- 8. layout of the Game stage
    for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      const L = await studio(br, url, { viewport: vp, cdn: 'local' });
      await openProject(L.page, FX.demo);
      await showGame(L.page);
      await L.page.evaluate(() => { const s = document.getElementById('buildPanel'); if (s) s.scrollIntoView(); });
      const m = await L.page.evaluate(() => {
        const bs = ['btnBuildSingle', 'btnBuildZip'].map((id) => document.getElementById(id).getBoundingClientRect());
        const se = document.scrollingElement;
        const lw = ['btnBuildSingle', 'btnBuildZip'].map((id) => Math.round(document.querySelector('#' + id + ' .lbl').getBoundingClientRect().width));
        return { lw, h: bs.map((r) => Math.round(r.height)), w: bs.map((r) => Math.round(r.width)), right: Math.max.apply(null, bs.map((r) => r.right)), sw: se.scrollWidth, iw: window.innerWidth };
      });
      check('layout ' + vp.width + ': both Build buttons are at least 44 px tall and inside the screen', m.h.every((h) => h >= 44) && m.right <= m.iw, m);
      check('layout ' + vp.width + ': no sideways page scroll', m.sw <= m.iw, m);
      check('layout ' + vp.width + ': both buttons show their labels (One HTML file, Folder as a .zip)', m.lw.every((w) => w > 40), m);
      await L.page.screenshot({ path: path.join(OUT, 'phase6-game-' + vp.width + '.png') });
      await L.ctx.close();
    }
  } catch (e) {
    check('the run finished without an exception', false, e && e.stack ? e.stack.split('\n').slice(0, 6) : String(e));
  } finally {
    await br.close();
    srv.close();
  }
  const passed = results.filter((r) => r.ok).length;
  fs.writeFileSync(path.join(OUT, 'phase6-report.json'), JSON.stringify({ passed, total: results.length, report, results }, null, 1) + '\n');
  console.log('\nPhase 6: ' + passed + ' of ' + results.length + ' checks pass.');
  process.exit(failed ? 1 : 0);
})();
