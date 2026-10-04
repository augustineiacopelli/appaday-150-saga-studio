// Phase 4 acceptance: the player shell. Runs in real headless Chromium (Playwright), because the player draws on a canvas
// and plays sound, which jsdom cannot. Needs Playwright and its Chromium (PLAYWRIGHT_BROWSERS_PATH, or the npm package
// resolvable from here). Writes test/out/phase4-report.json and screenshots at 390 and 1280.
//   1. static rules: ASCII, no forbidden APIs, nothing from the forges (Kit, STORY, WORLD, ART, WS), no network but the
//      ?bundle= development fetch, the five engines in contract order in player.html
//   2. a bare page with only the five engines, player.js, and an inline bundle starts, and adds one global
//   3. per fixture: the world rebuilds byte for byte (no warnings), the opening matches the contract's opening hash and
//      first moves, and the golden path plays to its ending by walking (the bot), with no fault
//   4. every ending of the demo, by its own choices
//   5. saves: a slot save mid game survives a reload and Continue; a downloaded save loads in a fresh page
//   6. menus: Status reads ENGINE_BATTLE's stats, Equip and Materia edits reach the battle party, Optimize resets
//   7. a battle fought by hand through the command menu; a lost battle shows game over and Continue restores the autosave
//   8. layout at 390 by 844 and 1280 by 800: no page scroll, 44 px targets, the controller on the phone only
'use strict';
const fs = require('fs');
const path = require('path');
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
const KIT = ['engine-render.js', 'engine-audio.js', 'engine-world.js', 'engine-battle.js', 'engine-story.js'];

async function open(br, url, o) {
  o = o || {};
  const ctx = await br.newContext({ viewport: o.viewport || { width: 1280, height: 800 }, hasTouch: !!o.touch, isMobile: !!o.touch, deviceScaleFactor: o.dpr || 1, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  if (o.storage) await page.addInitScript((s) => { Object.keys(s).forEach((k) => localStorage.setItem(k, s[k])); }, o.storage);
  await page.goto(url);
  await page.waitForFunction(() => window.SagaPlayer && SagaPlayer.debug.state().mode !== 'boot', null, { timeout: 60000 });
  await page.addScriptTag({ content: 'window.botRun = ' + botRun.toString() });
  return { ctx, page, errors };
}
async function settleText(page) {
  return page.evaluate(() => { const D = SagaPlayer.debug; D.pause(true); for (let i = 0; i < 200; i++) { const s = D.tick(100, 25); if (s.mode === 'event') { if (s.text) D.press('a'); continue; } return s; } return D.state(); });
}

(async () => {
  // ---------------------------------------------------------------- 1. static rules
  const js = read(path.join(ROOT, 'player', 'player.js')), css = read(path.join(ROOT, 'player', 'player.css')), html = read(path.join(ROOT, 'player', 'player.html'));
  check('player.js, player.css, and player.html are pure ASCII', ![js, css, html].some((t) => /[^\x00-\x7f]/.test(t)));
  const code = js.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  check('no forbidden APIs (roundRect, ellipse, window.confirm, bare remove, eval, new Function, Math.random)', !/roundRect|\.ellipse\(|window\.confirm|\.remove\(\)|[^.\w]eval\(|new Function|Math\.random/.test(code));
  check('nothing from the forges: no Kit, STORY, WORLD, ART, or WS', !/\b(Kit|STORY|WORLD|ART|WSX?)\./.test(code));
  check('no network but the ?bundle= development fetch, and no API key', (code.match(/\bfetch\(/g) || []).length === 1 && /bundle=/.test(code) && !/anthropic|x-api-key/i.test(code));
  const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  check('player.html loads the five engines in contract order, then player.js', J(srcs) === J(KIT.map((f) => '../engines/' + f).concat(['player.js'])), srcs);
  const man = { demo: JSON.parse(read(path.join(OUT, 'demo149-manifest.json'))).day150, four: JSON.parse(read(path.join(OUT, 'four149-manifest.json'))).day150 };
  check('the contract load order matches the engines folder', J(man.four.loadOrder) === J(KIT), man.four.loadOrder);

  const { srv, url } = await serve();
  const br = await chromium.launch();
  try {
    // ---------------------------------------------------------------- 2. a bare page
    const bundleText = read(path.join(OUT, 'demo149-bundle.json'));
    const bare = '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/player/player.css"></head><body>' +
      '<script type="application/json" id="saga-bundle">' + bundleText.replace(/</g, '\\u003c') + '</script>' +
      KIT.map((f) => '<script src="/engines/' + f + '"></script>').join('') + '<script>window.__before = Object.keys(window);</script><script src="/player/player.js"></script></body></html>';
    fs.writeFileSync(path.join(OUT, '.bare-player.html'), bare);
    const b0 = await open(br, url + '/test/out/.bare-player.html');
    await b0.page.waitForFunction(() => SagaPlayer.debug.state().mode === 'title', null, { timeout: 60000 });
    const globals = await b0.page.evaluate(() => Object.keys(window).filter((k) => window.__before.indexOf(k) < 0 && k !== 'botRun' && k !== '__before'));
    check('a page with only the five engines, player.js, and an inline bundle reaches the title', true);
    check('the player declares one global, SagaPlayer', J(globals) === J(['SagaPlayer']), globals);
    check('no page errors on the bare page', !b0.errors.length, b0.errors);
    await b0.ctx.close();

    // ---------------------------------------------------------------- 3. per fixture: world, opening, golden path
    const report = {};
    for (const fx of ['demo', 'four']) {
      const d = man[fx];
      const r = await open(br, url + '/player/player.html?bundle=../test/out/' + fx + '149-bundle.json');
      const w = await r.page.evaluate(() => SagaPlayer.debug.world());
      check(fx + ': the overworld rebuilds from the seed exactly as Day 148 recorded it (no warnings)', !w.warnings.length, w.warnings);
      const open0 = await r.page.evaluate(() => { const D = SagaPlayer.debug; D.pause(true); D.newGame(); return true; });
      const s1 = await settleText(r.page);
      const mv = await r.page.evaluate(() => SagaPlayer.debug.moves());
      check(fx + ': a new game plays the opening and lands on the contract\'s opening state', s1.mode === 'field' && s1.hash === d.opening.hash && s1.chapter === d.opening.chapter, { got: s1.hash, want: d.opening.hash });
      check(fx + ': the first moves are the contract\'s first moves', J(mv) === J(d.opening.firstMoves), { got: mv.length, want: d.opening.firstMoves.length });
      const choices = [];
      d.golden.steps.forEach((s) => (s.choices || []).forEach((c) => choices.push(c)));
      const t0 = Date.now();
      const g = await r.page.evaluate((o) => window.botRun(o), { golden: d.golden.steps, choices });
      const key = (s) => s.by + ':' + (s.evt || s.npc);
      const missing = d.golden.steps.map(key).filter((k) => g.played.map(key).indexOf(k) < 0);
      check(fx + ': the golden path plays to its ending by walking the world (' + d.golden.steps.length + ' steps, ' + Math.round(g.ticks / 60000) + ' game minutes)', g.ok && g.ending === d.golden.ending, { reason: g.reason, ending: g.ending, log: g.log.slice(-6) });
      check(fx + ': every golden step was played (extra steps the walk crossed are allowed)', !missing.length, missing);
      check(fx + ': no runtime fault on the way', !(g.faults || []).length && !r.errors.length, { faults: g.faults, errors: r.errors });
      const sh = await r.page.evaluate(() => SagaPlayer.debug.state());
      check(fx + ': the ending screen shows', sh.mode === 'ending' && sh.overlay === 'ending', sh.mode);
      report[fx] = { wallMs: Date.now() - t0, gameMs: g.ticks, played: g.played.map(key), log: g.log };
      await r.page.screenshot({ path: path.join(OUT, 'phase4-ending-' + fx + '.png') });
      await r.ctx.close();
    }

    // ---------------------------------------------------------------- 4. every ending of the demo
    for (const e of man.demo.endings) {
      const r = await open(br, url + '/player/player.html?bundle=../test/out/demo149-bundle.json');
      await r.page.evaluate(() => { SagaPlayer.debug.pause(true); SagaPlayer.debug.newGame(); });
      await settleText(r.page);
      const choices = [];
      e.steps.forEach((s) => (s.choices || []).forEach((c) => choices.push(c)));
      const g = await r.page.evaluate((o) => window.botRun(o), { golden: e.steps, choices });
      check('demo: ending ' + e.end + ' is reached by its own choices', g.ok && g.ending === e.end, { reason: g.reason, ending: g.ending });
      await r.ctx.close();
    }

    // ---------------------------------------------------------------- 5. saves
    {
      const r = await open(br, url + '/player/player.html?bundle=../test/out/demo149-bundle.json');
      await r.page.evaluate(() => { SagaPlayer.debug.pause(true); SagaPlayer.debug.newGame(); });
      await settleText(r.page);
      const d = man.demo;
      const half = d.golden.steps.slice(0, 3);
      const g = await r.page.evaluate((o) => window.botRun(o), { golden: half, choices: [] });
      const before = await r.page.evaluate(() => { const D = SagaPlayer.debug; const s = D.saveTo('1'); return { s: s.error || null, st: D.state(), story: D.story(), snap: D.snapshot() }; });
      check('saves: a slot save between moves succeeds', !before.s && g.played.length >= 3, before.s);
      const storage = await r.page.evaluate(() => { const o = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); o[k] = localStorage.getItem(k); } return o; });
      await r.ctx.close();
      const r2 = await open(br, url + '/player/player.html?bundle=../test/out/demo149-bundle.json', { storage });
      const t = await r2.page.evaluate(() => SagaPlayer.debug.overlayText());
      check('saves: the title offers Continue after a reload', /Continue/.test(t), t);
      const after = await r2.page.evaluate(() => { const D = SagaPlayer.debug; D.pause(true); const e = D.restore(D.readSlot('1')); return { e, st: D.state() }; });
      check('saves: slot 1 restores the same story state, map, and cell', !after.e && after.st.hash === before.st.hash && after.st.map === before.st.map && after.st.x === before.st.x && after.st.y === before.st.y, { a: after.st, b: before.st });
      const fin = await r2.page.evaluate((o) => window.botRun(o), { golden: man.demo.golden.steps.slice(3), choices: [] });
      check('saves: a game continued from the save still finishes', fin.ok, fin.reason);
      await r2.ctx.close();
      const r3 = await open(br, url + '/player/player.html?bundle=../test/out/demo149-bundle.json');
      const loaded = await r3.page.evaluate((s) => { const D = SagaPlayer.debug; D.pause(true); const e = D.restore(s); return { e, st: D.state() }; }, JSON.parse(J(before.snap)));
      check('saves: a downloaded save file loads in a fresh page with empty storage', !loaded.e && loaded.st.hash === before.st.hash, loaded.e);
      const wrong = await r3.page.evaluate(() => SagaPlayer.debug.restore({ format: 'saga-save', game: 'some-other-game', story: {} }));
      check('saves: a save from another game is refused', /belongs to/.test(String(wrong)), wrong);
      await r3.ctx.close();
    }

    // ---------------------------------------------------------------- 6 and 7. menus and battles
    {
      const r = await open(br, url + '/player/player.html?bundle=../test/out/four149-bundle.json');
      await r.page.evaluate(() => { SagaPlayer.debug.pause(true); SagaPlayer.debug.newGame(); });
      await settleText(r.page);
      const st = await r.page.evaluate(() => SagaPlayer.debug.partyStats());
      check('menus: Status reads each member from ENGINE_BATTLE (HP, MP, stats)', st.length === 3 && st.every((u) => u.maxHp > 0 && u.stats && u.stats.str > 0), st.length);
      const p0 = await r.page.evaluate(() => SagaPlayer.debug.party());
      check('party: buildParty gives every member gear at the chapter\'s tier and places the chapter\'s materia', p0.every((m) => m.equipment.length >= 1) && p0.reduce((n, m) => n + m.materia.length, 0) === 2, p0);
      const eq = await r.page.evaluate(() => {
        const D = SagaPlayer.debug; D.openMenu(); D.clickItem('Equip and Materia');
        const sels = Array.from(document.querySelectorAll('.sg-win select'));
        const mat = sels.filter((s) => Array.from(s.options).some((o) => /Stone/.test(o.text)))[0];
        const before = D.party()[0].materia.map((x) => x.mat).sort().join();
        mat.value = ''; mat.dispatchEvent(new Event('change'));
        const after = D.party()[0].materia.map((x) => x.mat).sort().join();
        D.clickItem('Optimize');
        const reset = D.party()[0].materia.map((x) => x.mat).sort().join();
        D.press('b'); D.press('b');
        return { before, after, reset, mode: D.state().mode };
      });
      check('menus: an Equip and Materia edit reaches the battle party, and Optimize restores the layout', eq.before !== eq.after && eq.reset === eq.before && eq.mode === 'field', eq);
      // a battle by hand: the first command on the first target, every turn
      const hb = await r.page.evaluate(() => {
        const D = SagaPlayer.debug; D.autoBattle(false);
        if (!D.fight('trp_lowland_slimes_ubsv')) return { started: false };
        let picks = 0, sawMenu = false;
        for (let i = 0; i < 6000; i++) {
          const s = D.tick(50, 25);
          if (s.mode !== 'battle') return { started: true, end: s.mode, picks, sawMenu };
          if (s.overlay === 'battle') { sawMenu = true; const t = D.overlayText(); if (/Attack/.test(t)) { D.clickItem('Attack'); D.tick(30, 30); const b = document.querySelector('.sg-win-battle .sg-item'); if (b) b.click(); picks++; } }
        }
        return { started: true, end: 'timeout', picks, sawMenu };
      });
      check('battle: a fight played through the command menu (Attack, then a target) is won', hb.started && hb.sawMenu && hb.picks > 0 && hb.end === 'field', hb);
      // a loss: the party of chapter one against the last boss
      const lose = await r.page.evaluate(() => {
        const D = SagaPlayer.debug; D.autoBattle(true);
        const before = D.state();
        D.fight('trp_hollow_one_h9b2');
        for (let i = 0; i < 40000; i++) { const s = D.tick(50, 25); if (s.mode !== 'battle') break; }
        const s = D.state(), text = D.overlayText();
        let cont = null;
        if (s.mode === 'gameover') { D.clickItem('Continue'); cont = D.state(); }
        return { mode: s.mode, text, cont, before };
      });
      check('battle: a lost fight shows game over with Continue', lose.mode === 'gameover' && /Continue/.test(lose.text), lose.mode);
      check('battle: Continue restores the autosave', lose.cont && lose.cont.mode === 'field' && lose.cont.hash === lose.before.hash, lose.cont);
      check('no page errors in the menu and battle run', !r.errors.length, r.errors);
      await r.ctx.close();
    }

    // ---------------------------------------------------------------- 8. layout
    const lay = {};
    for (const vp of [{ w: 390, h: 844, touch: true }, { w: 1280, h: 800, touch: false }]) {
      const r = await open(br, url + '/player/player.html?bundle=../test/out/four149-bundle.json', { viewport: { width: vp.w, height: vp.h }, touch: vp.touch, dpr: 2 });
      await r.page.screenshot({ path: path.join(OUT, 'phase4-title-' + vp.w + '.png') });
      const t1 = await r.page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('.sg-win .sg-item')).map((x) => x.getBoundingClientRect().height);
        return { scrollW: document.documentElement.scrollWidth, scrollH: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight, minBtn: Math.min.apply(null, b), sizes: SagaPlayer.debug.sizes() };
      });
      await r.page.evaluate(() => { SagaPlayer.debug.pause(true); SagaPlayer.debug.newGame(); });
      await settleText(r.page);
      await r.page.evaluate(() => { const D = SagaPlayer.debug; D.tick(500); });
      await r.page.screenshot({ path: path.join(OUT, 'phase4-field-' + vp.w + '.png') });
      await r.page.evaluate(() => { const D = SagaPlayer.debug; D.openMenu(); D.tick(50); });
      const t2 = await r.page.evaluate(() => ({ minBtn: Math.min.apply(null, Array.from(document.querySelectorAll('.sg-win .sg-item, .sg-win .sg-back')).map((x) => x.getBoundingClientRect().height)), fits: Array.from(document.querySelectorAll('.sg-win')).every((w) => { const r = w.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth + 0.5; }) }));
      await r.page.screenshot({ path: path.join(OUT, 'phase4-menu-' + vp.w + '.png') });
      await r.page.evaluate(() => { const D = SagaPlayer.debug; D.press('b'); D.autoBattle(false); D.fight('trp_lowland_slimes_ubsv'); for (let i = 0; i < 400; i++) { const s = D.tick(50, 25); if (s.overlay === 'battle') break; } });
      await r.page.screenshot({ path: path.join(OUT, 'phase4-battle-' + vp.w + '.png') });
      lay[vp.w] = { t1, t2 };
      check('layout ' + vp.w + ': no horizontal or vertical page scroll', t1.scrollW <= t1.iw && t1.scrollH <= t1.ih, t1);
      check('layout ' + vp.w + ': title and menu targets are at least 44 px tall', t1.minBtn >= 44 && t2.minBtn >= 44, { t1: t1.minBtn, t2: t2.minBtn });
      check('layout ' + vp.w + ': windows stay on screen', t2.fits);
      check('layout ' + vp.w + ': the touch controller shows on the phone only', t1.sizes.pad === vp.touch, t1.sizes);
      check('layout ' + vp.w + ': the stage fills the width on the phone or scales by a whole number on the desktop', vp.touch ? t1.sizes.stage[0] === vp.w : Number.isInteger(t1.sizes.scale), t1.sizes);
      check('layout ' + vp.w + ': no page errors', !r.errors.length, r.errors);
      await r.ctx.close();
    }
    fs.writeFileSync(path.join(OUT, 'phase4-report.json'), JSON.stringify({ when: new Date().toISOString(), passed: results.filter((x) => x.ok).length, failed, results, runs: report, layout: lay }, null, 1) + '\n');
  } finally {
    await br.close();
    srv.close();
    try { fs.unlinkSync(path.join(OUT, '.bare-player.html')); } catch (e) { /* ok */ }
  }
  console.log('\n' + (results.length - failed) + ' of ' + results.length + ' checks passed');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
