// Phase 7 acceptance: the exported game, alone, in jsdom. No browser, no Studio, no forge: only the single HTML file that
// Build game wrote (test/out/phase6/, so run node phase6.js first). Writes test/out/phase-player-report.json.
//   1. the files under test are the current build: each built page carries player.js, player.css and the five engines byte
//      for byte as they stand in player/ and engines/, so a stale build cannot pass
//   2. per fixture, opened as a file with every network door trapped (fetch, XMLHttpRequest, WebSocket, EventSource,
//      sendBeacon): it reaches the title, adds no globals but the five engines and SagaPlayer, and a new game lands on the
//      contract's opening state
//   3. the golden path, played by scripted input (the route planner walks, A talks and opens, choices are answered from the
//      path), walks to the golden ending AND to the contract's exact end state hash, with no fault, no page error, no request
//   4. every ending the contract lists, for both fixtures, reached by its own choices on its own exact end state hash
//   5. a save made in the field, read back in a fresh page from the same storage, restores the same state and position
// Run from test/ after npm install, node make-demo.js and node phase6.js.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));
const { botRun } = require('./player-bot');
const ROOT = path.join(__dirname, '..'), OUT = path.join(__dirname, 'out'), BUILT = path.join(OUT, 'phase6');
const read = (f) => fs.readFileSync(f, 'utf8');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const results = [];
let failed = 0;
function check(name, ok, info) { results.push({ name, ok: !!ok, info: ok ? undefined : info }); if (!ok) failed++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || info === undefined ? '' : ' :: ' + JSON.stringify(info).slice(0, 600))); }
const KIT = ['render', 'audio', 'world', 'battle', 'story'];
const ENGINE_GLOBALS = ['ENGINE_RENDER', 'ENGINE_AUDIO', 'ENGINE_WORLD', 'ENGINE_BATTLE', 'ENGINE_STORY'];
const FILES = { demo: 'demo-demo-saga.html', four: 'four-four-continents.html' };
const MAN = { demo: JSON.parse(read(path.join(OUT, 'demo149-manifest.json'))).day150, four: JSON.parse(read(path.join(OUT, 'four149-manifest.json'))).day150 };
const scripts = (html) => [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({ attrs: m[1], text: m[2] }));
const noHashLine = (s) => s.replace(/^\/\* Bundle hash [0-9a-f]+ \*\/\n/m, '');

// Opens a built page in jsdom as a browser would open it from disk. Every way out to the network is trapped and counted.
function open(file, storage) {
  const errors = [], requests = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { const m = String(e && e.message || e); if (!/Not implemented: HTMLCanvasElement/.test(m)) errors.push(m.slice(0, 300)); });
  vc.on('error', (...a) => errors.push(a.join(' ').slice(0, 300)));
  let baseline = null;
  const dom = new JSDOM(read(file), {
    // jsdom gives a file: page no localStorage, so the page gets an origin that cannot resolve; nothing is ever fetched from it.
    url: 'https://saga-player.invalid/' + path.basename(file),
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      win.innerWidth = 1280; win.innerHeight = 800;
      win.TextEncoder = win.TextEncoder || require('util').TextEncoder;
      win.TextDecoder = win.TextDecoder || require('util').TextDecoder;
      win.matchMedia = function (q) { return { matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }; };
      win.HTMLCanvasElement.prototype.getContext = function () { return null; };
      win.fetch = function (u) { requests.push('fetch ' + u); return Promise.reject(new Error('network refused')); };
      const xo = win.XMLHttpRequest.prototype.open;
      win.XMLHttpRequest.prototype.open = function (m, u) { requests.push('xhr ' + u); return xo.apply(this, arguments); };
      win.XMLHttpRequest.prototype.send = function () { throw new Error('network refused'); };
      win.WebSocket = function (u) { requests.push('ws ' + u); throw new Error('network refused'); };
      win.EventSource = function (u) { requests.push('sse ' + u); throw new Error('network refused'); };
      win.navigator.sendBeacon = function (u) { requests.push('beacon ' + u); return false; };
      if (storage) Object.keys(storage).forEach((k) => win.localStorage.setItem(k, storage[k]));
      baseline = new Set(Object.getOwnPropertyNames(win));
    }
  });
  const win = dom.window;
  // An element id shows up as a named window property; it is the page's markup, not a global the code declares.
  const added = Object.getOwnPropertyNames(win).filter((k) => !baseline.has(k) && !(win[k] instanceof win.Element));
  win.eval('window.botRun = ' + botRun.toString());
  return { dom, win, errors, requests, added };
}
// The player starts on DOMContentLoaded; wait until it leaves boot.
async function opened(file, storage) {
  const G = open(file, storage);
  for (let i = 0; i < 600; i++) { const s = G.win.SagaPlayer && G.win.SagaPlayer.debug.state(); if (s && s.mode !== 'boot') break; await new Promise((r) => setTimeout(r, 25)); }
  return G;
}
// Plays out the opening (and any text) until the field is quiet, on the paused clock.
function settle(win) { const D = win.SagaPlayer.debug; D.pause(true); for (let i = 0; i < 400; i++) { const s = D.tick(100, 25); if (s.mode === 'event') { if (s.text) D.press('a'); continue; } return s; } return D.state(); }
function choicesOf(steps) { const c = []; steps.forEach((s) => (s.choices || []).forEach((x) => c.push(x))); return c; }
function storageOf(win) { const o = {}; for (let i = 0; i < win.localStorage.length; i++) { const k = win.localStorage.key(i); o[k] = win.localStorage.getItem(k); } return o; }

(async () => {
  const t00 = Date.now();
  const report = { fixtures: {} };
  // ---------------------------------------------------------------- 1. the build under test is current
  const pjs = read(path.join(ROOT, 'player', 'player.js')), pcss = read(path.join(ROOT, 'player', 'player.css'));
  const ENG = {}; KIT.forEach((k) => { ENG[k] = read(path.join(ROOT, 'engines', 'engine-' + k + '.js')); });
  for (const fx of ['demo', 'four']) {
    const file = path.join(BUILT, FILES[fx]);
    if (!fs.existsSync(file)) { check(fx + ': the built file exists (run node phase6.js first)', false, file); continue; }
    const html = read(file), sc = scripts(html), inl = sc.filter((s) => !/src=/.test(s.attrs));
    const style = /<style>\n([\s\S]*?)<\/style>/.exec(html);
    check(fx + ': the built page is the current build: player.js, player.css and the five engines byte for byte as they stand',
      sc.length === 7 && inl[6].text.replace(/^\n/, '') === pjs && !!style && style[1] === pcss && KIT.every((k, i) => noHashLine(inl[i].text.replace(/^\n/, '')) === ENG[k]),
      { scripts: sc.length });
    check(fx + ': the page is pure ASCII and holds no src, href or url( to anywhere', !/[^\x00-\x7f]/.test(html) && !/\ssrc=|<link\b|url\(\s*['"]?(https?:)?\/\//i.test(html));
    report.fixtures[fx] = { file: path.relative(ROOT, file), bytes: Buffer.byteLength(html), sha256: sha(html) };
  }

  // ---------------------------------------------------------------- 2 to 5, per fixture
  for (const fx of ['demo', 'four']) {
    const file = path.join(BUILT, FILES[fx]);
    if (!fs.existsSync(file)) continue;
    const M = MAN[fx];
    let G = await opened(file);
    const s0 = G.win.SagaPlayer && G.win.SagaPlayer.debug.state();
    check(fx + ': in jsdom the file reaches the title with no page error', !!s0 && s0.mode === 'title' && !G.errors.length, { state: s0, errors: G.errors });
    const extra = G.added.filter((k) => ENGINE_GLOBALS.indexOf(k) < 0 && k !== 'SagaPlayer');
    check(fx + ': it adds no globals but the five engines and SagaPlayer', !extra.length && G.added.indexOf('SagaPlayer') >= 0 && ENGINE_GLOBALS.every((g) => G.added.indexOf(g) >= 0), { extra, added: G.added });
    G.win.SagaPlayer.debug.newGame();
    const s1 = settle(G.win);
    check(fx + ': a new game lands on the contract\'s opening state', s1.mode === 'field' && s1.hash === M.opening.hash && s1.chapter === M.opening.chapter, { got: s1.hash, want: M.opening.hash });
    // 5. a save made in the field, read back in a fresh page from the same storage
    {
      const D = G.win.SagaPlayer.debug, saved = D.saveTo('1');
      const H = await opened(file, storageOf(G.win)), HD = H.win.SagaPlayer.debug, slot = HD.readSlot('1');
      const msg = slot ? HD.restore(slot) : 'no slot';
      const st = settle(H.win);
      check(fx + ': a save made in the field, read in a fresh page from the same storage, restores the same state (hash ' + s1.hash + ')', !!saved && !saved.error && !!slot && msg === null && st.hash === s1.hash && st.map === s1.map && st.x === s1.x && st.y === s1.y && !H.errors.length,
        { saved: saved && saved.error, slot: !!slot, msg, got: st.hash, map: [st.map, st.x, st.y], want: [s1.map, s1.x, s1.y], errors: H.errors.slice(0, 3) });
      H.dom.window.close();
    }
    let t0 = Date.now();
    const g = G.win.botRun({ golden: M.golden.steps, choices: choicesOf(M.golden.steps) });
    const end = G.win.SagaPlayer.debug.state();
    report.fixtures[fx].goldenWallMs = Date.now() - t0;
    report.fixtures[fx].goldenGameMs = g.ticks;
    check(fx + ': the golden path (' + M.golden.steps.length + ' steps) walks to the golden ending ' + M.golden.ending, g.ok && g.ending === M.golden.ending, { reason: g.reason, ending: g.ending, log: (g.log || []).slice(-5) });
    check(fx + ': and to the contract\'s exact end state, hash ' + M.golden.hash, end.hash === M.golden.hash, { got: end.hash, want: M.golden.hash });
    check(fx + ': no fault, no page error and not one network request on the way', !(g.faults || []).length && !G.errors.length && !G.requests.length, { faults: g.faults, errors: G.errors.slice(0, 3), requests: G.requests.slice(0, 5) });

    // 4. every ending, by its own choices
    report.fixtures[fx].endings = {};
    for (const e of M.endings) {
      G = await opened(file);
      G.win.SagaPlayer.debug.newGame();
      settle(G.win);
      t0 = Date.now();
      const r = G.win.botRun({ golden: e.steps, choices: choicesOf(e.steps) });
      const st = G.win.SagaPlayer.debug.state();
      report.fixtures[fx].endings[e.end] = { wallMs: Date.now() - t0, gameMs: r.ticks, hash: st.hash };
      check(fx + ': ending ' + e.end + ' is reached by its own choices on its exact end state, hash ' + e.hash, r.ok && r.ending === e.end && st.hash === e.hash && !G.requests.length && !(r.faults || []).length,
        { reason: r.reason, ending: r.ending, got: st.hash, want: e.hash, requests: G.requests.length });
      G.dom.window.close();
    }
  }

  report.seconds = Math.round((Date.now() - t00) / 1000);
  report.passed = results.length - failed; report.total = results.length; report.results = results;
  fs.writeFileSync(path.join(OUT, 'phase-player-report.json'), JSON.stringify(report, null, 2));
  console.log('\nPhase 7 player: ' + (results.length - failed) + ' of ' + results.length + ' checks pass in ' + report.seconds + ' s.');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
