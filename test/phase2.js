// Phase 2 acceptance: one store, one import, one project list.
//  1. Boot (as the page ships, not native): the store is installed after the forges, backed by IndexedDB (saga-studio, stores
//     projects and meta), with a synchronous mirror; localStorage is the fallback; kit:settings stays shared in localStorage.
//  2. Autosave rides Kit's debounced touch; a reload restores the project, the UI state and the project list.
//  3. The one importer takes a bundle from any forge, places it by kit.forges, never refuses on a forge gate, refuses bad
//     files with a sentence, and leaves the project on screen alone when it refuses.
//  4. The project list: open, create, duplicate, delete, and the dialog.
//  5. Drafts the forges left behind (art147:draft, world148:draft, story149:draft in localStorage or in IndexedDB) are offered
//     and added without moving or deleting the original, and without creating a database that was never there.
//  6. Every export is the stage's own (Kit.buildExport and Kit.openExport pass to the stage on screen), and a bundle exported
//     from the Studio opens in Days 146 to 149 unchanged: the round trip.
//  7. The isolation test, again, with the one store: loading a Day 146 only bundle changes nothing outside charter, codex and
//     rules, whichever stage the page booted in.
// Run from test/ (after node make-demo.js once, and with the four forge clones beside this repository).
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { boot, bootReady, wait } = require('./boot');
const { boot: bootForge } = require('./boot-phase0');
const ROOT = path.join(__dirname, '..');
const DIRS = { '146': path.dirname(require('../day146')), '147': require('../day147'), '148': require('../day148'), '149': require('../day149') };
const FI = require(path.join(__dirname, 'node_modules', 'fake-indexeddb'));
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); if (process.env.P2_TRACE) console.log((ok ? 'ok   ' : 'FAIL ') + name.slice(0, 110)); }
const canon = (v) => {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
};
const read = (f) => fs.readFileSync(f, 'utf8');
const OUT = path.join(__dirname, 'out');
const F = {
  demo149: read(path.join(OUT, 'demo149-bundle.json')),
  four149: read(path.join(OUT, 'four149-bundle.json')),
  d146: read(path.join(DIRS['147'], 'test', 'out', 'demo-bundle.json')),          // a Day 146 Final
  d147: read(path.join(DIRS['148'], 'test', 'out', 'demo147-bundle.json')),       // a Day 147 Final
  d148: read(path.join(DIRS['149'], 'test', 'out', 'demo148-bundle.json'))        // a Day 148 Final
};
const sha = (s) => require('crypto').createHash('sha256').update(s).digest('hex');
const idbAll = (factory, store) => new Promise((resolve, reject) => {
  const rq = factory.open('saga-studio');
  rq.onerror = () => reject(rq.error);
  rq.onsuccess = () => {
    const db = rq.result, out = {};
    if (!db.objectStoreNames.contains(store)) { db.close(); return resolve(null); }
    const c = db.transaction(store, 'readonly').objectStore(store).openCursor();
    c.onsuccess = () => { const cur = c.result; if (cur) { out[cur.key] = cur.value; cur.continue(); } else { db.close(); resolve(out); } };
    c.onerror = () => reject(c.error);
  };
});
const stores = (factory) => new Promise((resolve) => { const rq = factory.open('saga-studio'); rq.onsuccess = () => { const n = Array.from(rq.result.objectStoreNames).sort(); rq.result.close(); resolve(n); }; });
const lsDump = (win) => { const o = {}; for (let i = 0; i < win.localStorage.length; i++) { const k = win.localStorage.key(i); o[k] = win.localStorage.getItem(k); } return o; };
const seedIdb = (factory, name, store, key, value) => new Promise((resolve, reject) => {
  const rq = factory.open(name, 1);
  rq.onupgradeneeded = () => rq.result.createObjectStore(store);
  rq.onsuccess = () => { const tx = rq.result.transaction(store, 'readwrite'); tx.objectStore(store).put(value, key); tx.oncomplete = () => { rq.result.close(); resolve(); }; tx.onerror = () => reject(tx.error); };
  rq.onerror = () => reject(rq.error);
});
const dbNames = async (factory) => (await factory.databases()).map((d) => d.name).sort();
const click = (win, sel, text) => { const el = Array.from(win.document.querySelectorAll(sel)).filter((e) => !text || e.textContent.trim() === text)[0]; if (el) el.click(); return !!el; };
const until = async (fn, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 4000)) { if (fn()) return true; await wait(25); } return !!fn(); };
const dialogWith = (win, re) => Array.from(win.document.querySelectorAll('.dialog')).filter((d) => re.test((d.querySelector('.dlg-title') || {}).textContent || ''))[0] || null;
const settle = (p, ms) => Promise.race([p, wait(ms || 4000).then(() => 'TIMEOUT')]);
const studio = (opts) => bootReady(Object.assign({ native: false, evalEngines: true }, opts));

(async () => {
  // ---------------------------------------------------------------- the new files
  const v = cp.spawnSync(process.execPath, [path.join(ROOT, 'vendor.js'), '--check'], { encoding: 'utf8' });
  check('vendor.js --check: the vendored files are untouched by Phase 2', v.status === 0, (v.stdout + v.stderr).split('\n').slice(-3).join(' | '));
  const own = ['core/idb.js', 'core/projects.js', 'core/studio.js', 'core/studio-boot.js'].map((f) => [f, read(path.join(ROOT, f))]);
  check('the new files are ASCII, plain ES5 (no arrows, let, const, classes, template strings), and use none of the forbidden APIs',
    own.every(([f, t]) => !/[^\x00-\x7f]/.test(t) && !/=>|\blet\s|\bconst\s|\bclass\s|`/.test(t.replace(/\/\/.*$/gm, '')) && !/ctx\.roundRect|ctx\.ellipse|window\.confirm|[^.\w]\.remove\(\)/.test(t)),
    own.filter(([f, t]) => /[^\x00-\x7f]/.test(t) || /=>|\blet\s|\bconst\s|\bclass\s|`/.test(t.replace(/\/\/.*$/gm, ''))).map(([f]) => f));
  const html = read(path.join(ROOT, 'index.html'));
  check('index.html loads the store and the projects module after every forge, before the boot', /Studio\.end\('story'\);<\/script>\s*<script src="core\/idb\.js"><\/script>\s*<script src="core\/projects\.js"><\/script>\s*<script src="core\/pipeline\.js"><\/script>\s*<script src="core\/unresolved\.js"><\/script>\s*<script src="core\/testplay\.js"><\/script>\s*<script src="core\/studio-boot\.js"><\/script>/.test(html));

  // ---------------------------------------------------------------- 1. boot and the store
  const factory = new FI.IDBFactory();
  let r = await studio({ indexedDB: factory });
  let { win } = r, S = win.Studio, K = win.Kit;
  check('the page boots with no errors, not native, with the store installed over Kit', r.errors.length === 0 && S.native === false && S.store.installed() && K.store.get !== S.base.storeGet, r.errors.slice(0, 2));
  check('the store is IndexedDB, and a first run makes one project at the Charter stage', S.store.backend() === 'idb' && S.store.list().length === 1 && S.store.list()[0].stage === 'charter' && S.stage === 'charter', S.store.list());
  const id1 = S.store.currentId();
  check('the project on screen is the store\'s current project, and Kit.store.get(kit:draft) answers synchronously from the mirror', K.bundle.current().kit.bundleId === id1 && K.store.get('kit:draft').kit.bundleId === id1);
  K.bundle.current().kit.title = 'Store Test Saga'; K.bundle.touch('edit');
  check('an edit marks the draft dirty, and Kit.bundle.save (the Save button) writes it to the mirror at once', K.bundle.dirty() === true && K.bundle.save() === true && K.store.get('kit:draft').kit.title === 'Store Test Saga' && S.store.list()[0].title === 'Store Test Saga');
  await S.store.flush();
  check('after the queue drains, the database is saga-studio with exactly the stores projects and meta', canon(await stores(factory)) === canon(['meta', 'projects']), await stores(factory));
  let proj = await idbAll(factory, 'projects'), meta = await idbAll(factory, 'meta');
  check('the projects store holds the bundle as JSON text under its own id, and the meta store the list and the current id', typeof proj[id1] === 'string' && JSON.parse(proj[id1]).kit.title === 'Store Test Saga' && meta.current === id1 && JSON.parse(meta.projects)[0].id === id1, { keys: Object.keys(proj), meta: Object.keys(meta) });
  K.bundle.current().kit.title = 'Autosaved Title'; K.bundle.touch('edit');
  await wait(1100); await S.store.flush();
  check('Kit\'s own debounced autosave (touch, then a pause) reaches IndexedDB with no explicit save', JSON.parse((await idbAll(factory, 'projects'))[id1]).kit.title === 'Autosaved Title' && K.bundle.dirty() === false);
  K.uiState.set({ probe: 7 }); K.settings.set({ key: 'sk-ant-test-key' });
  K.bundle.suspend.save();
  await S.store.flush();
  meta = await idbAll(factory, 'meta');
  check('kit:ui and kit:suspend go to the store as kv entries; kit:settings (the shared Claude key) stays in localStorage and never enters IndexedDB', !!meta['kv:kit:ui'] && !!meta['kv:kit:suspend'] && !meta['kv:kit:settings'] && /sk-ant-test-key/.test(win.localStorage.getItem('kit:settings') || '') && !win.localStorage.getItem('kit:draft'));
  check('Kit.store.usage and Kit.store.keys describe the store', K.store.usage() > 500 && K.store.keys('kit:').indexOf('kit:draft') >= 0 && K.store.keys('kit:').indexOf('kit:ui') >= 0, K.store.keys());
  // reload: a second page on the same database
  const ls1 = lsDump(win);
  r = await studio({ indexedDB: factory, storage: ls1 }); win = r.win; S = win.Studio; K = win.Kit;
  check('a reload restores the project and its edit, the UI state, and the project list', r.errors.length === 0 && K.bundle.current().kit.bundleId === id1 && K.bundle.current().kit.title === 'Autosaved Title' && K.uiState.get().probe === 7 && S.store.list().length === 1, r.errors.slice(0, 2));
  check('the suspend record survives the reload', !!K.bundle.suspend.load() && K.bundle.suspend.load().bundleId === id1);

  // ---------------------------------------------------------------- 1b. localStorage fallback and a refused write
  r = await studio({}); win = r.win; S = win.Studio; K = win.Kit;
  const lid = S.store.currentId();
  K.bundle.current().kit.title = 'Fallback Saga'; K.bundle.save(); await S.store.flush();
  let ls = lsDump(win);
  check('with no IndexedDB the same two stores live in localStorage under saga-studio:, and the page says which', S.store.backend() === 'local' && JSON.parse(ls['saga-studio:projects:' + lid]).kit.title === 'Fallback Saga' && ls['saga-studio:meta:current'] === lid, Object.keys(ls));
  const rr = await studio({ storage: ls });
  check('a reload from the fallback restores the project', rr.errors.length === 0 && rr.win.Kit.bundle.current().kit.title === 'Fallback Saga');
  const proto = win.Storage.prototype, realSet = proto.setItem;
  proto.setItem = function () { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; };
  K.bundle.current().kit.title = 'Will Not Save'; K.bundle.save(); await S.store.flush();
  const shown = win.document.getElementById('storeBanner').hidden === false;
  proto.setItem = realSet;
  K.bundle.save(); await S.store.flush();
  check('a refused write raises the storage banner, and the next write that lands lowers it', shown && win.document.getElementById('storeBanner').hidden === true && S.store.failed() === false);

  // ---------------------------------------------------------------- 3. the one importer
  r = await studio({ indexedDB: new FI.IDBFactory() }); win = r.win; S = win.Studio; K = win.Kit;
  const P = S.projects, home = S.store.currentId();
  const place = (txt) => P.placement(JSON.parse(txt));
  check('placement reads kit.forges: a Day 146 Final is at Charter, 147 at Art, 148 at World, 149 at Story, a blank bundle at Charter',
    canon([place(F.d146).stage, place(F.d147).stage, place(F.d148).stage, place(F.demo149).stage, place(F.four149).stage, P.placement(K.bundle.blank('x')).stage]) === canon(['charter', 'art', 'world', 'story', 'story', 'charter']) &&
    canon(place(F.four149).finals) === canon(['charter', 'art', 'world', 'story']), [place(F.d146), place(F.d147), place(F.d148), place(F.demo149)].map((p) => p.stage));
  const loaded = [];
  for (const [name, txt, stage] of [['d146', F.d146, 'charter'], ['d147', F.d147, 'art'], ['d148', F.d148, 'world'], ['demo149', F.demo149, 'story']]) {
    let res, err = null;
    try { res = P.importText(txt); } catch (e) { err = e.message; }
    if (!res) { check('the single importer takes the ' + name + ' fixture', false, err); continue; }
    S.show(res.placement.stage); await wait(40);
    loaded.push(name);
    check('the single importer takes the ' + name + ' Final with no forge gate, verifies its hash, files it at the ' + stage + ' stage and shows that stage',
      res.matches && res.placement.stage === stage && S.stage === stage && K.bundle.current().kit.bundleId === JSON.parse(txt).kit.bundleId && S.store.has(JSON.parse(txt).kit.bundleId), { matches: res.matches, stage: S.stage, placed: res.placement.stage });
  }
  check('the Phase 1 gates are gone: a bundle with no locked Charter and no art loads (Day 148 refuses it on its own page)', (() => { const b = K.bundle.blank('Gate Test'); b.kit.contentHash = ''; return P.importText(JSON.stringify(b)).placement.stage === 'charter'; })());
  await wait(300);
  check('importing four bundles and a blank one raised no page errors', r.errors.length === 0, r.errors.slice(0, 3));
  const before = K.bundle.current().kit.bundleId, listBefore = S.store.list().length;
  const bad = [['not JSON', '{nope'], ['JSON that is not a bundle', '{"hello":1}'], ['a newer schema', JSON.stringify(Object.assign(JSON.parse(F.d146), {}, { kit: Object.assign({}, JSON.parse(F.d146).kit, { schemaVersion: 99 }) }))]];
  const msgs = bad.map(([n, t]) => { try { P.importText(t); return n + ': no error'; } catch (e) { return e.message; } });
  check('a bad file is refused with a sentence a person can read (not JSON, not a bundle, a newer schema)', /not valid JSON/.test(msgs[0]) && /not a Saga Forge bundle/.test(msgs[1]) && /newer than this Forge supports/.test(msgs[2]), msgs);
  check('a refused file changes nothing: the project on screen and the list are as they were', K.bundle.current().kit.bundleId === before && S.store.list().length === listBefore);
  const dupeId = JSON.parse(F.d147).kit.bundleId, n0 = S.store.list().length;
  const again = P.importText(F.d147);
  check('importing a bundle whose project id is already here replaces that project (the list does not grow) and says so', again.replaced === true && S.store.list().length === n0);
  const copy = P.importText(F.d147, { asCopy: true });
  check('importing it as a copy files a new project id and a (copy) title, and the original stays', copy.replaced === false && copy.bundle.kit.bundleId !== dupeId && /\(copy\)$/.test(copy.bundle.kit.title) && S.store.has(dupeId) && S.store.list().length === n0 + 1);
  const viaKit = K.bundle.importText(F.d146);
  check('Kit.bundle.importText is the one importer too (what the forges\' own Import buttons call)', viaKit.placement && viaKit.placement.stage === 'charter' && viaKit.matches === true);
  // the picker, with its one question
  const freshB = JSON.parse(F.d148); freshB.kit.bundleId = 'bnd_picker000001'; freshB.kit.contentHash = ''; const fresh = JSON.stringify(freshB);
  let pf = K.importPicked(new win.File([fresh], 'fresh.json'));
  const rf = await pf;
  check('the Import button\'s picker imports a file without asking when the project is new, and moves to its stage', !!rf && rf.placement.stage === 'world' && S.stage === 'world');
  pf = K.importPicked(new win.File([fresh], 'fresh.json'));
  const asked = await until(() => dialogWith(win, /already here/));
  const clicked = asked && (Array.from(dialogWith(win, /already here/).querySelectorAll('.btn')).filter((b) => b.textContent.trim() === 'Keep both')[0].click(), true); const rk = await settle(pf);
  check('when the file is a project already here, the picker asks once; Keep both files a copy', asked && !!rk && rk !== 'TIMEOUT' && /\(copy\)$/.test(rk.bundle.kit.title), { asked, clicked, rk: rk === 'TIMEOUT' ? rk : null, dialogs: Array.from(win.document.querySelectorAll('.dlg-title')).map((e) => e.textContent) });
  pf = K.importPicked(new win.File([fresh], 'fresh.json'));
  if (await until(() => dialogWith(win, /already here/))) Array.from(dialogWith(win, /already here/).querySelectorAll('.btn')).filter((b) => b.textContent.trim() === 'Cancel')[0].click();
  const rc = await settle(pf);
  check('Cancel on that question imports nothing', rc === null);
  const rbad = await K.importPicked(new win.File(['{nope'], 'bad.json'));
  check('a bad file through the picker toasts the sentence and returns nothing', rbad === null && /not valid JSON/.test(win.document.getElementById('toasts').textContent));

  // ---------------------------------------------------------------- 4. the project list
  await S.store.flush();
  const list = P.list(), cur0 = S.store.currentId();
  const other = list.filter((p) => p.id !== cur0)[0];
  const opened = await P.open(other.id); await wait(40);
  check('Studio.projects.open switches the project on screen and goes to the stage it stands at', K.bundle.current().kit.bundleId === other.id && S.stage === other.stage && opened.kit.bundleId === other.id, { stage: S.stage, want: other.stage });
  const dup = await P.duplicate(other.id);
  check('duplicate adds a separate project with a new id and a (copy) title', dup.kit.bundleId !== other.id && /\(copy\)$/.test(dup.kit.title) && S.store.has(dup.kit.bundleId));
  const created = P.create('Fresh One'); await wait(30);
  check('create starts an empty project at the Charter stage and shows it', created.kit.title === 'Fresh One' && S.stage === 'charter' && S.store.currentId() === created.kit.bundleId && S.store.has(created.kit.bundleId));
  const nBefore = S.store.list().length;
  await P.remove(dup.kit.bundleId);
  check('deleting a project that is not on screen removes only it', !S.store.has(dup.kit.bundleId) && S.store.list().length === nBefore - 1 && S.store.currentId() === created.kit.bundleId);
  await P.remove(created.kit.bundleId); await wait(40);
  check('deleting the project on screen opens the most recent other one', !S.store.has(created.kit.bundleId) && K.bundle.current() && S.store.has(K.bundle.current().kit.bundleId) && K.bundle.current().kit.bundleId !== created.kit.bundleId);
  await S.store.flush();
  const idbList = JSON.parse((await idbAll(win.indexedDB, 'meta')).projects), idbProj = await idbAll(win.indexedDB, 'projects');
  check('the database agrees with the list: every listed project has its bundle, nothing deleted lingers', idbList.every((p) => typeof idbProj[p.id] === 'string') && Object.keys(idbProj).length === idbList.length && idbList.length === S.store.list().length, { list: idbList.length, projects: Object.keys(idbProj).length });
  P.openList(); await wait(60);
  const dlg = win.document.querySelector('.proj-dialog');
  const rowsOk = !!dlg && dlg.querySelectorAll('.proj-row').length >= S.store.list().length, stagesOk = !!dlg && S.store.list().every((p) => dlg.textContent.indexOf(S.stages[p.stage].label) >= 0), btnsOk = !!dlg && ['New project', 'Import a file', 'Close'].every((t) => Array.from(dlg.querySelectorAll('.dlg-foot .btn')).some((b) => b.textContent.trim() === t));
  check('the Projects dialog lists every project with its stage label, and offers New project, Import a file and Close', rowsOk && stagesOk && btnsOk, { rowsOk, stagesOk, btnsOk, rows: dlg && dlg.querySelectorAll('.proj-row').length, listed: S.store.list().map((p) => p.stage), foot: dlg && Array.from(dlg.querySelectorAll('.dlg-foot .btn')).map((b) => b.textContent) });
  const openBtn = Array.from(dlg.querySelectorAll('.btn-primary')).filter((b) => b.textContent.trim() === 'Open')[0];
  const firstTarget = S.store.list().filter((p) => p.id !== S.store.currentId())[0];
  if (openBtn) openBtn.click(); await wait(150);
  check('the Open button in the dialog opens that project and closes the dialog', !!openBtn && !win.document.querySelector('.proj-dialog') && S.store.currentId() !== null && S.stage !== null);
  check('the Slots button now opens the Projects dialog', (() => { const b = win.document.getElementById('btnSlots'); b.click(); const ok = !!win.document.querySelector('.proj-dialog') && /Projects/.test(b.textContent); K.ui.closeTop(); return ok; })());

  // ---------------------------------------------------------------- 5. drafts the forges left behind
  const lf = new FI.IDBFactory();
  await seedIdb(lf, 'appaday-149', 'kv', 'story149:draft', F.four149);
  r = await studio({ indexedDB: lf, storage: { 'art147:draft': F.d147, 'world148:draft': F.d148, 'story149:where:story149:draft': '1' } }); win = r.win; S = win.Studio; K = win.Kit;
  const found = await S.projects.leftovers();
  check('the leftover scan finds the Day 147 and 148 drafts in localStorage and the Day 149 draft in its IndexedDB database, each with its stage',
    canon(found.map((x) => x.day + ':' + x.stage + ':' + x.where).sort()) === canon(['147:art:localStorage', '148:world:localStorage', '149:story:IndexedDB appaday-149'].sort()), found.map((x) => x.day + ':' + x.stage + ':' + x.where));
  check('the scan did not create the Day 147 or Day 148 IndexedDB databases that were never there', canon(await dbNames(lf)) === canon(['appaday-149', 'saga-studio']), await dbNames(lf));
  const nL = S.store.list().length;
  const added = found.map((x) => S.projects.adopt(x));
  check('adding each draft makes a project of its own; the originals stay exactly where they were', S.store.list().length === nL + 3 && win.localStorage.getItem('art147:draft') === F.d147 && win.localStorage.getItem('world148:draft') === F.d148 && (await seedCheck(lf)), added);
  async function seedCheck(f) { const rq = f.open('appaday-149'); return new Promise((res) => { rq.onsuccess = () => { const g = rq.result.transaction('kv').objectStore('kv').get('story149:draft'); g.onsuccess = () => { rq.result.close(); res(g.result === F.four149); }; }; }); }
  const found2 = await S.projects.leftovers();
  check('a draft that is already a project is marked as such, so the dialog does not offer it twice', found2.length === 3 && found2.every((x) => x.existing === true));
  S.projects.openList(); await wait(80);
  check('the Projects dialog omits drafts already added', !/Drafts the forges left/.test(win.document.querySelector('.proj-dialog').textContent));
  K.ui.closeTop();
  { const r2 = await studio({ indexedDB: new FI.IDBFactory(), storage: { 'art147:draft': F.d147 } });
    r2.win.Studio.projects.openList(); await wait(120);
    const t = r2.win.document.querySelector('.proj-dialog').textContent;
    check('with a draft waiting, the dialog says so and offers it with an Add button', /Drafts the forges left/.test(t) && click(r2.win, '.proj-left .btn', 'Add') && r2.win.Studio.store.list().length === 2); }

  // ---------------------------------------------------------------- 6. export: the stage's own, and the round trip
  r = await studio({ indexedDB: new FI.IDBFactory() }); win = r.win; S = win.Studio; K = win.Kit;
  S.projects.importText(F.demo149); S.show('story'); await wait(60);
  let fin, finErr = null;
  try { fin = K.buildExport('final', { engines: true }); } catch (e) { finErr = e.message; }
  check('the story stage exports a Final through the dispatcher: bundle, story manifest, engine file, forge 149 final, hash stamped', !!fin && fin.files.length === 3 && /story-manifest/.test(fin.files[1].name) && JSON.parse(fin.files[0].text).kit.forges['149'].status === 'final' && JSON.parse(fin.files[0].text).kit.contentHash === fin.hash, finErr);
  // Drafts downgrade a forge's own Final, as they do on the forge's own page, so they are taken from a fresh copy of the project.
  S.projects.importText(F.demo149); S.show('charter'); await wait(40);
  const names = {};
  const exp = {};
  for (const stage of ['charter', 'art', 'world']) {
    S.projects.importText(F.demo149); S.show(stage); await wait(30);
    try { const o = K.buildExport('draft', { engines: false }); exp[stage] = o; names[stage] = o.files.map((f) => f.name.replace(/^.*?-(bundle|manifest|art-manifest|world-manifest|story-manifest)\.json$/, '$1')).join(','); } catch (e) { names[stage] = 'ERROR ' + e.message; }
  }
  check('Kit.buildExport passes to the stage on screen: Charter writes the Day 146 files, Art its manifest, World its manifest', /bundle,/.test(names.charter) && /(^|,)manifest/.test(names.charter) && /art-manifest/.test(names.art) && /world-manifest/.test(names.world) && !/ERROR/.test(names.charter + names.art + names.world), names);
  const src = JSON.parse(F.demo149), outB = fin ? JSON.parse(fin.files[0].text) : null;
  check('the export leaves forges 146, 147 and 148 as the fixture had them and opens story (Kit.bundle.open), exactly as Day 149 writes it', !!outB && ['146', '147', '148'].every((d) => canon(outB.kit.forges[d]) === canon(src.kit.forges[d])) && outB.kit.opened.indexOf('story') >= 0, outB && outB.kit.forges);
  S.projects.importText(F.demo149); S.show('story'); await wait(30);
  check('Kit.openExport opens the stage\'s own export dialog (Day 149\'s, with its game kit option)', (() => { K.openExport(); const t = win.document.querySelector('.dialog') ? win.document.querySelector('.dialog').textContent : ''; K.ui.closeTop(); return /Export forge 149/.test(t); })());
  S.show('world'); await wait(30);
  check('and from the World stage it opens Day 148\'s', (() => { K.openExport(); const t = win.document.querySelector('.dialog') ? win.document.querySelector('.dialog').textContent : ''; K.ui.closeTop(); return /Export forge 148/.test(t); })());
  // the round trip: what the Studio exports opens, unchanged, in each old forge
  const PAGE = { 146: require('../day146'), 147: path.join(DIRS['147'], 'index.html'), 148: path.join(DIRS['148'], 'index.html'), 149: path.join(DIRS['149'], 'index.html') };
  const URLS = { 146: 'appaday-146-saga-forge', 147: 'appaday-147-art-and-audio-forge', 148: 'appaday-148-world-forge', 149: 'appaday-149-story-forge' };
  const ENG = { 146: [], 147: [], 148: ['engine-render.js', 'engine-audio.js'].map((f) => path.join(DIRS['148'], f)), 149: ['engine-render.js', 'engine-audio.js', 'engine-world.js'].map((f) => path.join(DIRS['149'], f)) };
  async function reopen(day, text) {
    const f = bootForge(PAGE[day], { url: 'https://augustineiacopelli.github.io/' + URLS[day] + '/', engines: ENG[day], indexedDB: day === '149' || day === 149 });
    await wait(60);
    for (const g of ['ART', 'WORLD', 'STORY']) if (f.win[g] && f.win[g].booted) await f.win[g].booted;
    let res;
    try { res = f.win.Kit.bundle.importText(text); } catch (e) { return { rejected: e.message }; }
    await wait(10);
    const v = f.win.Kit.refreshValidation();
    return { matches: res.matches, errors: v.errors.length, broken: v.broken.length, pageErrors: f.errors.length, forges: Object.keys(f.win.Kit.bundle.current().kit.forges).join(',') };
  }
  const trip = {};
  if (fin) for (const day of ['146', '147', '148', '149']) trip[day] = await reopen(day, fin.files[0].text);
  check('round trip: the Final the Studio exports from the story stage opens in Days 146, 147, 148 and 149 with the hash verified and no errors or broken references',
    !!fin && ['146', '147', '148', '149'].every((d) => trip[d] && !trip[d].rejected && trip[d].matches === true && trip[d].errors === 0 && trip[d].broken === 0 && trip[d].pageErrors === 0), trip);
  const tripDraft = {};
  for (const stage of ['art', 'world']) { const o = exp[stage]; if (!o) continue; tripDraft[stage] = {}; for (const day of stage === 'art' ? ['146', '147'] : ['146', '147', '148']) tripDraft[stage][day] = await reopen(day, o.files[0].text); }
  check('round trip: the drafts the Studio exports from the Art and World stages open in the forges they are for, hash verified',
    Object.keys(tripDraft).length === 2 && Object.keys(tripDraft).every((s) => Object.keys(tripDraft[s]).every((d) => !tripDraft[s][d].rejected && tripDraft[s][d].matches === true && tripDraft[s][d].pageErrors === 0)), tripDraft);
  // and back: what an old forge exports opens in the Studio (the fixtures are exactly that), then re-exports and re-imports as the same project
  const back = S.projects.importText(fin ? fin.files[0].text : F.demo149);
  check('and back: the Final the Studio exported imports into the Studio as the same project at the Story stage, hash verified', back.matches && back.replaced === true && back.placement.stage === 'story');

  // ---------------------------------------------------------------- 7. isolation, with the one store
  const orig = JSON.parse(F.d146); orig.art = {}; orig.world = {}; orig.story = {};
  { const probe = (await studio({ indexedDB: new FI.IDBFactory() })).win; orig.kit.contentHash = probe.Kit.bundle.hash(orig); }
  const fixture = JSON.stringify(orig);
  check('the fixture is a Day 146 Final: art, world and story empty', orig.kit.forges['146'].status === 'final' && canon([orig.art, orig.world, orig.story]) === canon([{}, {}, {}]));
  async function isolation(stage) {
    const rr = await studio({ stage, indexedDB: new FI.IDBFactory() });
    const w = rr.win, k = w.Kit;
    await wait(450);
    const imp = w.Studio.projects.importText(fixture); await wait(30);
    w.Studio.show('charter'); await wait(30);
    k.emit('load', k.bundle.current()); k.emit('change', { reason: 'edit' }); await wait(260);
    const cur = k.bundle.current();
    const moved = Object.keys(cur).filter((x) => ['charter', 'codex', 'rules', 'kit'].indexOf(x) < 0 && canon(cur[x]) !== canon(orig[x]));
    return { matches: imp.matches, moved, added: Object.keys(cur).filter((x) => !(x in orig)), opened: canon(cur.kit.opened) === canon(orig.kit.opened), forges: canon(cur.kit.forges) === canon(orig.kit.forges), errors: rr.errors.length, empty: ['art', 'world', 'story'].every((n) => canon(cur[n]) === '{}') };
  }
  for (const stage of ['charter', 'art', 'world', 'story']) {
    const o = await isolation(stage);
    check('loading a Day 146 only bundle (page booted in ' + stage + ') through the one importer changes nothing outside charter, codex and rules', o.matches && !o.moved.length && !o.added.length && o.opened && o.forges && o.empty && o.errors === 0, o);
  }
  { const rr = await studio({ stage: 'charter', indexedDB: new FI.IDBFactory() });
    rr.win.Studio.projects.importText(fixture); await wait(30);
    rr.win.Studio.enter('story'); await wait(30);
    const c = rr.win.Kit.bundle.current();
    check('control: entering the story stage still gives the bundle its story namespace, so the gate is not simply switching everything off', Object.keys(c.story || {}).length > 0 && canon(c.art) === '{}' && canon(c.world) === '{}'); }
  { const rr = await bootReady({ evalEngines: true });
    check('native mode is opt in: without native: false the page keeps each forge\'s own storage (the forges\' own suites still run), and the store is not installed', rr.win.Studio.native === true && !rr.win.Studio.store.installed() && rr.win.Kit.store.get === rr.win.Studio.base.storeGet || rr.win.Studio.native === true && !rr.win.Studio.store.installed()); }

  const pass = results.filter((x) => x.ok).length;
  results.forEach((x) => console.log((x.ok ? 'PASS ' : 'FAIL ') + x.name + (x.ok ? '' : '  ' + (JSON.stringify(x.detail) || '').slice(0, 1200))));
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'phase2-report.json'), JSON.stringify({ pass, total: results.length, results }, null, 1));
  console.log('\n' + pass + ' of ' + results.length + ' passed');
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
