// Phase 7 acceptance: layout audits of the shell and the player in headless Chromium at 390 by 844 (a phone) and 1280 by
// 800 (a laptop). Writes test/out/layout-report.json and a screenshot of every view to test/out/layout/.
// Every view is held to the same rules, measured from the live page rather than from the CSS:
//   1. no sideways scroll: the document is no wider than the viewport
//   2. every visible control (button, link, input, select, textarea, tab) is at least 44 by 44 CSS pixels (a checkbox or
//      radio counts its whole label row), and lies inside the viewport horizontally (or inside a sideways scroller that does)
//   3. nothing in the header collides: the title, the App number, the AppADay backlink and the header buttons have pairwise
//      disjoint boxes, and the title is not cut off
//   4. no visible text is clipped sideways by its own box (scrollWidth beyond clientWidth with hidden overflow) unless it
//      ends in an ellipsis on purpose; text hidden on purpose for screen readers is not visible text
//   5. the stage steps and the tab row may scroll sideways on a phone, but the current stage and the current tab are in view
// Views: the shell at every stage with the four continent fixture, the unresolved drawer open, the Projects and Settings
// dialogs, and Test Play's picker; the player's title, field, menu, a choice and a battle.
// Run from test/ after npm install and node make-demo.js.
'use strict';
const fs = require('fs');
const path = require('path');
const { serve } = require('./serve');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';
let chromium;
try { chromium = require('playwright').chromium; } catch (e) { chromium = require('/opt/npm-tools/node_modules/playwright').chromium; }
const OUT = path.join(__dirname, 'out'), SHOTS = path.join(OUT, 'layout');
const read = (f) => fs.readFileSync(f, 'utf8');
const J = JSON.stringify;
const results = [];
let failed = 0;
function check(name, ok, info) { results.push({ name, ok: !!ok, info: ok ? undefined : info }); if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || info === undefined ? '' : ' :: ' + J(info).slice(0, 900))); }
const VIEWPORTS = [{ name: '390', width: 390, height: 844 }, { name: '1280', width: 1280, height: 800 }];
const FOUR = read(path.join(OUT, 'four149-bundle.json'));
const DEMO_GOLDEN = JSON.parse(read(path.join(OUT, 'demo149-manifest.json'))).day150.golden.steps;
const { botRun } = require('./player-bot');

// Runs in the page. scope: a selector for the part of the page to audit (the topmost dialog when one is open).
function audit(scope) {
  const vw = window.innerWidth, out = { vw, docW: document.documentElement.scrollWidth, small: [], outside: [], collide: [], clipped: [] };
  const root = (scope && document.querySelector(scope)) || document.body;
  const vis = (el) => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && !el.closest('[hidden]') && +cs.opacity !== 0; };
  const name = (el) => (el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + ' "' + (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24) + '"';
  const ctl = Array.prototype.slice.call(root.querySelectorAll('button, a[href], input:not([type=hidden]):not([type=file]), select, textarea, [role=tab]')).filter(vis);
  ctl.forEach((el) => {
    const r = el.getBoundingClientRect();
    // a control inside a row that is itself a 44 px target counts as that row (a list row, a label wrapping a checkbox)
    const row = el.closest('label, li, .row, tr');
    const rr = row ? row.getBoundingClientRect() : r;
    const w = Math.max(r.width, el.type === 'checkbox' || el.type === 'radio' ? rr.width : 0), h = Math.max(r.height, el.type === 'checkbox' || el.type === 'radio' ? rr.height : 0);
    if (Math.round(w) < 44 || Math.round(h) < 44) out.small.push(name(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
    // a control inside a sideways scroller (the stage steps, the tab row) is inside when the scroller is
    let box = r;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const ox = getComputedStyle(p).overflowX; if (ox === 'auto' || ox === 'scroll') { box = p.getBoundingClientRect(); break; } }
    if (box.left < -1 || box.right > vw + 1) out.outside.push(name(el) + ' ' + Math.round(box.left) + '..' + Math.round(box.right));
  });
  // and the current stage and the current tab are scrolled into view within their scroller
  out.hiddenCurrent = [];
  Array.prototype.slice.call(document.querySelectorAll('.stage-btn[aria-current="true"], .tab[aria-selected="true"]')).filter(vis).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.left < -1 || r.right > vw + 1) out.hiddenCurrent.push(name(el) + ' ' + Math.round(r.left) + '..' + Math.round(r.right));
  });
  const head = document.querySelector('.app-head');
  if (head && (!scope || scope === 'body')) {
    const parts = Array.prototype.slice.call(head.querySelectorAll('.brand-title, .brand-num, .backlink, button')).filter(vis);
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      if (parts[i].contains(parts[j]) || parts[j].contains(parts[i])) continue;
      const a = parts[i].getBoundingClientRect(), b = parts[j].getBoundingClientRect();
      if (a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5) out.collide.push(name(parts[i]) + ' x ' + name(parts[j]));
    }
    const t = head.querySelector('.brand-title');
    if (t && vis(t) && t.scrollWidth > t.clientWidth + 1) out.collide.push('title cut: ' + t.scrollWidth + ' > ' + t.clientWidth);
  }
  Array.prototype.slice.call(root.querySelectorAll('*')).filter(vis).forEach((el) => {
    if (el.children.length || !el.textContent.trim()) return;
    const cs = getComputedStyle(el), rb = el.getBoundingClientRect();
    if (rb.width <= 1 || rb.height <= 1 || /rect\(0(px)?,? 0(px)?/.test(cs.clip)) return; // visually hidden on purpose (screen reader text, icon button labels)
    if ((cs.overflowX === 'hidden' || cs.overflow === 'hidden') && el.scrollWidth > el.clientWidth + 1 && cs.textOverflow !== 'ellipsis') out.clipped.push(name(el));
  });
  return out;
}

async function judge(page, label, scope) {
  const a = await page.evaluate(audit, scope || null);
  const file = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png';
  await page.screenshot({ path: path.join(SHOTS, file) });
  check(label + ': no sideways scroll (' + a.docW + ' in ' + a.vw + ')', a.docW <= a.vw);
  check(label + ': every control is at least 44 px and inside the viewport', !a.small.length && !a.outside.length, { small: a.small.slice(0, 12), outside: a.outside.slice(0, 6), n: a.small.length });
  if (!scope) check(label + ': the current stage and the current tab are scrolled into view', !a.hiddenCurrent.length, a.hiddenCurrent);
  if (!scope) check(label + ': nothing in the header collides and the title is whole', !a.collide.length, a.collide);
  check(label + ': no text clipped sideways without an ellipsis', !a.clipped.length, a.clipped.slice(0, 8));
  return a;
}

(async () => {
  fs.rmSync(SHOTS, { recursive: true, force: true });
  fs.mkdirSync(SHOTS, { recursive: true });
  const { srv, url } = await serve(0);
  const br = await chromium.launch();
  const errors = [];
  try {
    for (const vp of VIEWPORTS) {
      // ---------------------------------------------------------------- the shell
      const ctx = await br.newContext({ viewport: { width: vp.width, height: vp.height } });
      await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errors.push(vp.name + ' shell: ' + e.message));
      await page.goto(url + '/index.html');
      await page.waitForFunction(() => window.Studio && window.Studio.build && window.Studio.build.installed, null, { timeout: 60000 });
      await page.evaluate(() => window.Studio.booted);
      await judge(page, 'shell ' + vp.name + ' new project');
      await page.evaluate((t) => { Studio.projects.importText(t); }, FOUR);
      await page.waitForTimeout(300);
      await page.evaluate(() => Studio.build.ensureChecked && Studio.build.ensureChecked());
      for (const st of ['charter', 'art', 'world', 'story', 'game']) {
        await page.evaluate((s) => Studio.show(s), st);
        await page.waitForTimeout(350);
        await judge(page, 'shell ' + vp.name + ' ' + st + ' stage');
      }
      // the drawer, the dialogs, the picker
      await page.evaluate(() => { Studio.show('world'); if (Studio.unresolved && Studio.unresolved.open) Studio.unresolved.open(); else { const d = document.getElementById('unresolved'); if (d) d.hidden = false; } });
      await page.waitForTimeout(250);
      await judge(page, 'shell ' + vp.name + ' unresolved drawer');
      await page.evaluate(() => { if (Studio.unresolved && Studio.unresolved.close) Studio.unresolved.close(); });
      for (const [btn, label] of [['#btnSlots', 'Projects dialog'], ['#btnSettings', 'Settings dialog']]) {
        await page.click(btn);
        await page.waitForTimeout(300);
        await judge(page, 'shell ' + vp.name + ' ' + label, '#overlays');
        await page.keyboard.press('Escape');
        await page.waitForTimeout(200);
      }
      await page.evaluate(() => Studio.show('game'));
      await page.waitForTimeout(250);
      const tp = await page.$('#btnTestPlay, [data-act="testplay"], button.tp-open');
      if (tp) {
        await tp.click();
        await page.waitForTimeout(300);
        await judge(page, 'shell ' + vp.name + ' Test Play picker', '#overlays');
        await page.keyboard.press('Escape');
      }
      await ctx.close();

      // ---------------------------------------------------------------- the player
      const pctx = await br.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.width < 700, isMobile: vp.width < 700 });
      const pp = await pctx.newPage();
      pp.on('pageerror', (e) => errors.push(vp.name + ' player: ' + e.message));
      await pp.goto(url + '/player/player.html?bundle=../test/out/four149-bundle.json');
      await pp.waitForFunction(() => window.SagaPlayer && SagaPlayer.debug.state().mode === 'title', null, { timeout: 60000 });
      await judge(pp, 'player ' + vp.name + ' title');
      await pp.evaluate(() => { const D = SagaPlayer.debug; D.pause(true); D.newGame(); for (let i = 0; i < 400; i++) { const s = D.tick(100, 25); if (s.mode === 'event') { if (s.text) D.press('a'); continue; } break; } });
      await judge(pp, 'player ' + vp.name + ' field');
      await pp.evaluate(() => { SagaPlayer.debug.openMenu(); SagaPlayer.debug.tick(100, 25); });
      await judge(pp, 'player ' + vp.name + ' menu');
      await pp.evaluate(() => { const D = SagaPlayer.debug; for (let i = 0; i < 10 && D.state().mode !== 'field'; i++) { D.press('b'); D.tick(100, 25); } });
      // a battle, fought by hand: the command menu up
      await pp.evaluate(() => { const D = SagaPlayer.debug; D.autoBattle(false); D.fight('trp_lowland_slimes_ubsv'); for (let i = 0; i < 200; i++) { const s = D.tick(100, 25); if (s.overlay === 'battle') break; } });
      const bs = await pp.evaluate(() => SagaPlayer.debug.state());
      check('player ' + vp.name + ': a hand fought battle reaches its command menu', bs.mode === 'battle' && bs.overlay === 'battle', { mode: bs.mode, overlay: bs.overlay });
      await judge(pp, 'player ' + vp.name + ' battle');
      // a choice: the demo's finale question, reached by walking the golden path and stopping at the first question
      await pp.goto(url + '/player/player.html?bundle=../test/out/demo149-bundle.json');
      await pp.waitForFunction(() => window.SagaPlayer && SagaPlayer.debug.state().mode === 'title', null, { timeout: 60000 });
      await pp.addScriptTag({ content: 'window.botRun = ' + botRun.toString() });
      const cs = await pp.evaluate((steps) => {
        const D = SagaPlayer.debug; D.pause(true); D.newGame();
        D.choose = function () { throw new Error('stop at the choice'); };
        try { window.botRun({ golden: steps }); } catch (e) { /* stopped with the choice on screen */ }
        return D.state();
      }, DEMO_GOLDEN);
      check('player ' + vp.name + ': the demo\'s finale question is on screen', cs.overlay === 'choice' && (cs.choices || []).length > 1, cs);
      await judge(pp, 'player ' + vp.name + ' choice');
      await pctx.close();
    }
    check('no page errors in the shell or the player', !errors.length, errors);
  } finally {
    await br.close();
    srv.close();
  }
  const report = { passed: results.length - failed, total: results.length, results };
  fs.writeFileSync(path.join(OUT, 'layout-report.json'), JSON.stringify(report, null, 2));
  console.log('\nLayout: ' + report.passed + ' of ' + report.total + ' checks pass.');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
