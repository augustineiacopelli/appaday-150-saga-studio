// Phase 5 acceptance: Test Play from anywhere. Runs the shipped Studio page (no native mode) in headless Chromium with
// Playwright, because the player draws on a canvas inside an iframe. Writes test/out/phase5-report.json and screenshots.
//   1. static rules: core/testplay.js and the player are ASCII, parse, use no forbidden API; index.html loads testplay after
//      unresolved and before studio-boot; the frame loads player/player.html, the same page and engines Build game packages;
//      vendor.js --check is clean
//   2. where the button lives: Test Play shows on the Story and Game stages only, and a project whose Story stage is locked
//      cannot open it (the reason is said, nothing opens)
//   3. a new game: the frame opens, the bundle and spec arrive by postMessage, and the opening lands on the contract's hash
//   4. every chapter of both fixtures: the Studio's golden path replay lands the player in that chapter, at its start town,
//      on exactly the story state the replay reached (hash for hash), with no fault
//   5. consistency: from a chapter start the rest of the golden path plays to the golden ending by walking (the Phase 4 bot)
//   6. a map start stands the player on that map (a town, a dungeon floor, the overworld) in the map's chapter
//   7. a battle start fights the troop at once with the chapter's party, reports the outcome to the Studio, and leaves the
//      story state untouched
//   8. test saves live under saga150test:, never under the game's own saga150: keys
//   9. Restart, Change start, Close and Escape; the Game stage's own picker starts a test too
//  10. layout at 390 by 844 and 1280 by 800: the frame fills the screen, the bar's targets are 44 px, no page scroll
// Run from test/ after node make-demo.js once, with the Day 149 clone beside this repository (for its Day 148 fixture).
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { serve } = require('./serve');
const { botRun } = require('./player-bot');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = require('/opt/npm-tools/node_modules/playwright').chromium; }
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'out');
const read = (f) => fs.readFileSync(f, 'utf8');
const results = [];
let failed = 0;
function check(name, ok, info) { results.push({ name, ok: !!ok, info: ok ? undefined : info }); if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || info === undefined ? '' : ' :: ' + JSON.stringify(info).slice(0, 600))); }
const J = JSON.stringify;
const FX = { demo: read(path.join(OUT, 'demo149-bundle.json')), four: read(path.join(OUT, 'four149-bundle.json')) };
const MAN = { demo: JSON.parse(read(path.join(OUT, 'demo149-manifest.json'))).day150, four: JSON.parse(read(path.join(OUT, 'four149-manifest.json'))).day150 };
let D148 = null;
try { D148 = read(path.join(require('../day149'), 'test', 'out', 'demo148-bundle.json')); } catch (e) { D148 = null; }

async function studio(br, url, o) {
  o = o || {};
  const ctx = await br.newContext({ viewport: o.viewport || { width: 1280, height: 800 }, hasTouch: !!o.touch, isMobile: !!o.touch });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('studio: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|fonts\.g/.test(m.text())) errors.push('studio console: ' + m.text()); });
  await page.goto(url + '/index.html');
  await page.waitForFunction(() => window.Studio && window.Studio.testplay && window.Studio.testplay.installed, null, { timeout: 60000 });
  await page.evaluate(() => window.Studio.booted);
  return { ctx, page, errors };
}
async function openProject(page, text) {
  await page.evaluate((t) => { const r = Studio.projects.importText(t); Studio.show(r.placement.stage); }, text);
  await page.waitForTimeout(400);
}
// The player frame, once SagaPlayer has started the test (saga:started reached the Studio).
async function frameOf(page) {
  await page.waitForFunction(() => { const s = Studio.testplay.state(); return s.open && (s.started || s.statusKind === 'error'); }, null, { timeout: 90000 });
  const f = page.frames().find((x) => /player\/player\.html/.test(x.url()));
  if (f && !(await f.evaluate(() => typeof window.botRun === 'function'))) await f.addScriptTag({ content: 'window.botRun = ' + botRun.toString() });
  return f;
}
async function settle(f) {
  return f.evaluate(() => { const D = SagaPlayer.debug; D.pause(true); for (let i = 0; i < 300; i++) { const s = D.tick(100, 25); if (s.mode === 'event') { if (s.text) D.press('a'); continue; } if (s.mode === 'battle') continue; return s; } return D.state(); });
}
async function testOpen(page, req) { return page.evaluate((r) => { Studio.testplay.close(true); return Studio.testplay.open(r); }, req); }

(async () => {
  // ---------------------------------------------------------------- 1. static rules
  const tp = read(path.join(ROOT, 'core', 'testplay.js')), pj = read(path.join(ROOT, 'player', 'player.js')), html = read(path.join(ROOT, 'index.html'));
  const scss = read(path.join(ROOT, 'core', 'studio.css'));
  check('core/testplay.js, studio.css and player.js are pure ASCII', ![tp, scss, pj].some((t) => /[^\x00-\x7f]/.test(t)));
  check('core/testplay.js and player.js parse', [tp, pj].every((t) => { try { new Function(t); return true; } catch (e) { return false; } }));
  const code = tp.replace(/\/\/.*$/gm, '');
  check('core/testplay.js is plain ES5 (no arrows, let, const, classes, template strings), like the rest of core/', !/=>|\blet\s|\bconst\s|\bclass\s|`/.test(code));
  check('core/testplay.js uses no forbidden API (roundRect, ellipse, confirm, bare remove, eval)', !/roundRect|\.ellipse\(|window\.confirm|[^.\w]confirm\(|\.remove\(\)|[^.\w]eval\(|new Function/.test(code));
  check('core/testplay.js makes no network call and holds no key', !/\bfetch\(|XMLHttpRequest|anthropic|x-api-key/i.test(code));
  const pcode = pj.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  check('the player is still Kit free with its one development fetch', !/\b(Kit|STORY|WORLD|ART|WSX?)\./.test(pcode) && (pcode.match(/\bfetch\(/g) || []).length === 1);
  const order = ['core/unresolved.js', 'core/testplay.js', 'core/studio-boot.js'].map((s) => html.indexOf('<script src="' + s + '"></script>'));
  check('index.html loads unresolved, testplay, then studio-boot', order.every((i) => i > 0) && order[0] < order[1] && order[1] < order[2], order);
  check('the frame loads player/player.html, the page Build game packages', /TP\.PLAYER = 'player\/player\.html'/.test(tp));
  const v = cp.spawnSync(process.execPath, [path.join(ROOT, 'vendor.js'), '--check'], { encoding: 'utf8' });
  check('vendor.js --check: no vendored file changed', v.status === 0, (v.stdout + v.stderr).split('\n').slice(-3).join(' | '));

  const { srv, url } = await serve();
  const br = await chromium.launch();
  try {
    const S = await studio(br, url);
    const page = S.page;

    // ---------------------------------------------------------------- 2. where the button lives
    if (D148) {
      await openProject(page, D148);
      const lk = await page.evaluate(() => ({ stage: Studio.stage, hidden: document.getElementById('btnTestPlay').hidden, blocked: Studio.testplay.blocked(), open: Studio.testplay.open({ kind: 'new' }), st: Studio.testplay.state() }));
      check('a project whose Story stage is locked cannot Test Play: the button is hidden on its stage', lk.hidden === true, lk);
      check('and opening says why and opens nothing', !!lk.blocked && lk.open.ok === false && lk.st.open === false, lk);
    } else check('the Day 148 fixture is present for the locked case', false, 'clone appaday-149-story-forge beside this repository');
    await openProject(page, FX.four);
    const vis = await page.evaluate(() => ['charter', 'art', 'world', 'story', 'game'].map((s) => { Studio.show(s); Studio.pipeline.paint(); return s + ':' + (document.getElementById('btnTestPlay').hidden ? 'hidden' : 'shown'); }).join(' '));
    check('Test Play shows on the Story and Game stages only', vis === 'charter:hidden art:hidden world:hidden story:shown game:shown', vis);

    // ---------------------------------------------------------------- 3. a new game
    await page.evaluate(() => Studio.show('story'));
    let o = await testOpen(page, { kind: 'new' });
    let f = await frameOf(page);
    let st = await page.evaluate(() => Studio.testplay.state());
    check('a new game: the frame said ready, then took the bundle and the spec by postMessage, then started', J(st.log.slice(0, 2)) === J(['saga:ready', 'saga:started']) && st.posted === 1 && o.ok, st);
    check('the frame is player/player.html with the five engines in contract order', !!f && J(await f.evaluate(() => Array.from(document.scripts).map((s) => s.getAttribute('src')).filter(Boolean))) === J(['engine-render', 'engine-audio', 'engine-world', 'engine-battle', 'engine-story'].map((e) => '../engines/' + e + '.js').concat(['player.js'])));
    let s = await settle(f);
    check('the opening lands on the contract opening hash (four continents)', s.hash === MAN.four.opening.hash && s.chapter === MAN.four.opening.chapter, { hash: s.hash, want: MAN.four.opening.hash });
    check('the frame knows it is a test (kind new)', J(await f.evaluate(() => SagaPlayer.debug.test())) === J({ kind: 'new', chapter: null, map: null, trp: null }));

    // ---------------------------------------------------------------- 4. every chapter of both fixtures
    for (const fx of ['demo', 'four']) {
      await openProject(page, FX[fx]);
      const chs = await page.evaluate(() => Studio.testplay.options().chapters);
      for (const c of chs) {
        const want = await page.evaluate((id) => { const b = Kit.bundle.current(), g = Studio.testplay.golden(b), r = Studio.testplay.replayTo(b, id, g.steps); return { ok: r.ok, hash: r.ok ? ENGINE_STORY.host.hash(r.state) : null, town: ((b.world.records.map_ && Object.values(b.world.records.map_)) || []).filter((m) => m.kind === 'town' && m.chapter === id && /start/.test(m.key)).map((m) => m.id)[0] || null }; }, c.id);
        o = await testOpen(page, { kind: 'chapter', chapter: c.id });
        f = await frameOf(page);
        st = await page.evaluate(() => Studio.testplay.state());
        const fs0 = st.startedState || {};
        check(fx + ' chapter ' + (c.index + 1) + ' (' + c.name + '): starts in that chapter at its start town', o.ok && fs0.chapter === c.id && fs0.map === want.town && fs0.mode !== 'title', { o: o.ok && o.spec.label, fs0, want });
        check(fx + ' chapter ' + (c.index + 1) + ': on exactly the state the golden path replay reached, with no fault', want.ok && fs0.hash === want.hash && fs0.faults === 0, { got: fs0.hash, want: want.hash });
      }
    }

    // ---------------------------------------------------------------- 5. consistency: finish the game from a chapter start
    for (const fx of ['demo', 'four']) {
      await openProject(page, FX[fx]);
      const last = await page.evaluate(() => { const c = Studio.testplay.options().chapters; return c[c.length - 1].id; });
      o = await testOpen(page, { kind: 'chapter', chapter: last });
      f = await frameOf(page);
      const rest = MAN[fx].golden.steps.slice(o.spec.replayed), choices = [];
      rest.forEach((x) => (x.choices || []).forEach((t) => choices.push(t)));
      const g = await f.evaluate((a) => window.botRun(a), { golden: rest, choices });
      check(fx + ': from the last chapter\'s start, the rest of the golden path (' + rest.length + ' steps) walks to the golden ending', g.ok && g.ending === MAN[fx].golden.ending, { reason: g.reason, ending: g.ending, log: (g.log || []).slice(-5) });
      check(fx + ': and no fault on the way', !(await f.evaluate(() => SagaPlayer.debug.faults().length)));
    }

    // ---------------------------------------------------------------- 6. map starts
    await openProject(page, FX.four);
    const pick = await page.evaluate(() => {
      const o = Studio.testplay.options(), ms = o.maps;
      return { ow: ms.filter((m) => m.kind === 'overworld')[0], town: ms.filter((m) => m.kind === 'town')[3], deep: ms.filter((m) => m.kind !== 'town' && m.kind !== 'overworld' && /\|2$/.test(Kit.bundle.current().world.records.map_[m.id].key || ''))[0] || ms.filter((m) => m.kind === 'dungeon')[2] };
    });
    for (const k of ['town', 'deep', 'ow']) {
      const m = pick[k];
      o = await testOpen(page, { kind: 'map', map: m.id });
      f = await frameOf(page);
      const fs1 = (await page.evaluate(() => Studio.testplay.state())).startedState || {};
      const stand = await f.evaluate(() => { const D = SagaPlayer.debug, s = D.state(); return { ok: D.plan(s.map, s.x, s.y) !== null }; });
      check('map start (' + k + ', ' + m.name + '): the player stands on that map in its chapter', o.ok && fs1.map === m.id && fs1.chapter === m.chapter && stand.ok, { fs1, m, stand });
    }

    // ---------------------------------------------------------------- 7. battle starts
    const boss = await page.evaluate(() => Studio.testplay.options().troops.filter((t) => t.boss)[2]);
    const want7 = await page.evaluate((id) => { const b = Kit.bundle.current(), r = Studio.testplay.replayTo(b, id, Studio.testplay.golden(b).steps); return ENGINE_STORY.host.hash(r.state); }, boss.chapter);
    o = await testOpen(page, { kind: 'battle', trp: boss.id });
    f = await frameOf(page);
    const b0 = await f.evaluate(() => { const D = SagaPlayer.debug; D.pause(true); return { s: D.state(), party: D.party().map((m) => m.chr) }; });
    check('battle start (' + boss.name + '): the fight begins at once, in the troop\'s chapter', b0.s.mode === 'battle' && b0.s.battle && b0.s.battle.trp === boss.id && b0.s.chapter === boss.chapter, b0.s);
    check('with the chapter\'s party, geared for it', b0.party.length > 0, b0.party);
    await f.evaluate(() => { const D = SagaPlayer.debug; D.autoBattle(true); for (let i = 0; i < 4000 && D.state().mode === 'battle'; i++) D.tick(100, 25); });
    await page.waitForFunction(() => !!Studio.testplay.state().battle, null, { timeout: 30000 }).catch(() => {});
    const b1 = await page.evaluate(() => Studio.testplay.state());
    const after = await f.evaluate(() => SagaPlayer.debug.state());
    check('the outcome is reported to the Studio', !!b1.battle && b1.battle.trp === boss.id && ['win', 'lose', 'escape'].indexOf(b1.battle.outcome) >= 0, b1);
    check('and the story state is untouched by the fight', after.hash === want7 && after.mode === 'field', { after, want7 });

    // ---------------------------------------------------------------- 8. test saves stay apart
    o = await testOpen(page, { kind: 'chapter', chapter: (await page.evaluate(() => Studio.testplay.options().chapters[1].id)) });
    f = await frameOf(page);
    await settle(f);
    const sv = await f.evaluate(() => { const D = SagaPlayer.debug, r = D.saveTo('2'), ks = Object.keys(localStorage); return { err: r && r.error, key: D.saveKey('2'), test: ks.filter((k) => /^saga150test:/.test(k)), real: ks.filter((k) => /^saga150:/.test(k)) }; });
    check('test saves live under saga150test:, never the game\'s own saga150: keys', !sv.err && /^saga150test:/.test(sv.key) && sv.test.indexOf(sv.key) >= 0 && !sv.real.length, sv);

    // ---------------------------------------------------------------- 9. Restart, Change start, Close, Escape, the Game picker
    const before = await page.evaluate(() => Studio.testplay.state().posted);
    await page.click('#tpRestart');
    await page.waitForFunction((n) => Studio.testplay.state().posted === n + 1 && Studio.testplay.state().started, before, { timeout: 60000 });
    check('Restart posts the same start again', true);
    await page.click('#tpChange');
    const dlg = await page.waitForSelector('.tp-dialog', { timeout: 5000 }).then(() => true, () => false);
    check('Change start opens the start picker over the frame', dlg);
    await page.selectOption('#tpdKind', 'map');
    const mapShown = await page.evaluate(() => !document.getElementById('tpdMap').closest('.field').hidden && document.getElementById('tpdChapter').closest('.field').hidden);
    check('the picker shows only the field its kind needs', mapShown);
    await page.selectOption('#tpdKind', 'chapter');
    const ch3 = await page.evaluate(() => Studio.testplay.options().chapters[2].id);
    await page.selectOption('#tpdChapter', ch3);
    await page.click('#tpdGo');
    f = await frameOf(page);
    st = await page.evaluate(() => Studio.testplay.state());
    check('choosing a chapter there restarts the test in it', st.kind === 'chapter' && st.startedState && st.startedState.chapter === ch3, st);
    await page.click('#tpChange');
    await page.waitForSelector('.tp-dialog', { timeout: 5000 });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    const esc1 = await page.evaluate(() => ({ dlg: !!document.querySelector('.tp-dialog'), open: Studio.testplay.state().open }));
    check('Escape in the start picker closes the picker only, and the test keeps playing', !esc1.dlg && esc1.open, esc1);
    await page.click('#tpClose');
    const closed = await page.evaluate(() => ({ open: Studio.testplay.state().open, ov: !!document.querySelector('.tp-ov'), cls: document.body.classList.contains('tp-open') }));
    check('Close removes the frame and gives the page back', !closed.open && !closed.ov && !closed.cls, closed);
    await testOpen(page, { kind: 'new' });
    await frameOf(page);
    await page.focus('#tpClose');
    await page.keyboard.press('Escape');
    check('Escape closes it too', !(await page.evaluate(() => Studio.testplay.state().open)));
    await page.evaluate(() => Studio.show('game'));
    await page.waitForSelector('#tpgGo', { timeout: 5000 });
    await page.selectOption('#tpgKind', 'battle');
    await page.click('#tpgGo');
    f = await frameOf(page);
    st = await page.evaluate(() => Studio.testplay.state());
    check('the Game stage panel has its own picker, and it starts a test', st.kind === 'battle' && st.started, st);
    await page.evaluate(() => Studio.testplay.close());
    check('no page errors in the Studio', !S.errors.length, S.errors);
    await S.ctx.close();

    // ---------------------------------------------------------------- 10. layout
    for (const vp of [{ w: 390, h: 844, touch: true }, { w: 1280, h: 800 }]) {
      const L = await studio(br, url, { viewport: { width: vp.w, height: vp.h }, touch: vp.touch });
      await openProject(L.page, FX.four);
      await L.page.evaluate(() => Studio.show('story'));
      await L.page.click('#btnTestPlay');
      await L.page.waitForSelector('.tp-dialog', { timeout: 5000 });
      await L.page.waitForTimeout(400);
      await L.page.screenshot({ path: path.join(OUT, 'phase5-picker-' + vp.w + '.png') });
      await L.page.selectOption('#tpdKind', 'chapter');
      await L.page.selectOption('#tpdChapter', await L.page.evaluate(() => Studio.testplay.options().chapters[1].id));
      await L.page.click('#tpdGo');
      const lf = await frameOf(L.page);
      await settle(lf);
      await lf.evaluate(() => { const D = SagaPlayer.debug; D.pause(false); });
      await L.page.waitForTimeout(600);
      await L.page.screenshot({ path: path.join(OUT, 'phase5-play-' + vp.w + '.png') });
      const m = await L.page.evaluate(() => {
        const ov = document.querySelector('.tp-ov').getBoundingClientRect(), fr = document.querySelector('.tp-frame').getBoundingClientRect();
        const small = Array.from(document.querySelectorAll('.tp-bar button')).filter((b) => b.getBoundingClientRect().height < 44).map((b) => b.id);
        return { ov: [ov.width, ov.height], fr: [Math.round(fr.width), Math.round(fr.height)], vw: innerWidth, vh: innerHeight, small, sx: document.documentElement.scrollWidth > innerWidth, sy: document.scrollingElement.scrollTop };
      });
      check('layout ' + vp.w + ': the overlay fills the screen and the frame fills all but the bar', m.ov[0] === m.vw && m.ov[1] === m.vh && m.fr[0] === m.vw && m.fr[1] > m.vh * 0.75, m);
      check('layout ' + vp.w + ': the bar\'s buttons are at least 44 px tall', !m.small.length, m.small);
      check('layout ' + vp.w + ': no sideways page scroll', !m.sx, m);
      const pad = await lf.evaluate(() => SagaPlayer.debug.sizes().pad);
      check('layout ' + vp.w + ': the player inside the frame shows the touch controller on the phone only', pad === !!vp.touch, pad);
      check('layout ' + vp.w + ': no page errors', !L.errors.length, L.errors);
      await L.ctx.close();
    }
  } finally {
    await br.close();
    srv.close();
  }
  const passed = results.filter((r) => r.ok).length;
  fs.writeFileSync(path.join(OUT, 'phase5-report.json'), JSON.stringify({ phase: 5, at: new Date().toISOString(), passed, total: results.length, results }, null, 1));
  console.log('\n' + passed + ' of ' + results.length + ' checks passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
