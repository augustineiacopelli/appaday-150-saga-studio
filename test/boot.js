// Loads the Saga Studio page in jsdom. Shared by every test. The Studio page pulls its scripts from files, and jsdom does
// not hold an inline script back until the script files above it have run, so boot() inlines every <script src> from disk,
// in order, before handing the page to jsdom. (A browser does this itself; the page as shipped is untouched.) boot() is
// asynchronous and resolves once the page has fired load, studio-boot included.
'use strict';
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require(path.join(__dirname, 'node_modules', 'jsdom'));
const PAGE = path.join(__dirname, '..', 'index.html');

// opts.evalEngines: the engine scripts are not inlined; they are evaluated in the window before the page parses, which is what
// a browser's script files look like to the page (their text cannot be read back from the DOM). The shipped page is this case.
function inline(file, evalEngines) {
  const dir = path.dirname(file);
  return fs.readFileSync(file, 'utf8').replace(/<script src="([^"]+)"><\/script>/g, (m, src) => (evalEngines && /^engines\//.test(src)) ? '' : '<script>\n' + fs.readFileSync(path.join(dir, src), 'utf8') + '\n</script>');
}

// boot(opts) returns { dom, win, errors } at once, like each forge's own test boot. Every script has already run when it
// returns (they are inline), so studio-boot has started the stage; await win.Studio.booted for its async part.
// opts.stage: the stage to start in (charter, art, world or story). opts.file: another page. Other options are the forges':
// url, storage (localStorage seed), indexedDB, verbose, setup(win).
function boot(opts) {
  opts = opts || {};
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push(String(e && (e.stack || e.message) || e)));
  vc.on('error', (...a) => errors.push(a.join(' ')));
  if (opts.verbose) vc.on('log', (...a) => console.log('[page]', ...a));
  const dom = new JSDOM(inline(opts.file || PAGE, opts.evalEngines), {
    url: opts.url || 'https://augustineiacopelli.github.io/appaday/150/',
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole: vc,
    beforeParse(win) {
      win.TextEncoder = win.TextEncoder || require('util').TextEncoder;
      win.TextDecoder = win.TextDecoder || require('util').TextDecoder;
      win.matchMedia = win.matchMedia || function (q) { return { matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }; };
      if (opts.storage) Object.keys(opts.storage).forEach((k) => win.localStorage.setItem(k, opts.storage[k]));
      if (opts.indexedDB) { const fi = require(path.join(__dirname, 'node_modules', 'fake-indexeddb')); win.indexedDB = opts.indexedDB === true ? new fi.IDBFactory() : opts.indexedDB; win.IDBKeyRange = fi.IDBKeyRange; }
      win.fetch = () => Promise.reject(new Error('offline test'));
      win.HTMLCanvasElement.prototype.getContext = function () { return null; };
      if (opts.stage) win.STUDIO_START = opts.stage;
      if (opts.evalEngines) ['render', 'audio', 'world', 'battle', 'story'].forEach((k) => win.eval(fs.readFileSync(path.join(__dirname, '..', 'engines', 'engine-' + k + '.js'), 'utf8')));
      if (opts.setup) opts.setup(win);
    }
  });
  return { dom, win: dom.window, errors };
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// bootReady: boot, then wait for the stage's async start (storage mirror, draft restore) like each forge's own tests do.
async function bootReady(opts) {
  const r = boot(opts);
  await wait(60);
  if (r.win.Studio && r.win.Studio.booted) await r.win.Studio.booted;
  return r;
}
module.exports = { boot, bootReady, wait, PAGE };
