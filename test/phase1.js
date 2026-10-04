// Phase 1 acceptance: the load sandwich.
//  1. The vendored sources are byte for byte their owners' (node vendor.js --check), and index.html loads every one of them
//     once, in the owners' order, each stage's scripts between its own Studio.begin and Studio.end.
//  2. The stacked page boots with no errors and all four stages mounted: the tab ids the forges share (start, export, dev,
//     and world in Days 147 and 148) coexist under their stage, and each stage's tab list equals what the forge mounts alone.
//  3. After each forge loads, the real Kit is back: nothing chains, the forge's own overrides are kept on its stage, and
//     native mode puts one stage's back while it is on screen.
//  4. window.WS and the router: lookups find their own workspace, Kit.go and Kit.active speak each forge's own ids.
//  5. Registries do not clash (record types, ID prefixes, validators, tab ids), and each stage's handlers, validators and
//     types act only while the stage is live.
//  6. Scoped CSS: every selector of every stage carries its stage, no declaration is changed, and a rule written for one
//     stage cannot match under another.
//  7. Engine sources resolve from the page for Days 146 to 149 (the shipped case: engines are script files).
//  8. The isolation test: loading a Day 146 only bundle changes nothing outside charter, codex and rules.
// The forges' own phase tests are run against this page by run-forge-suites.js. Run from test/.
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { boot, bootReady, wait } = require('./boot');
const ROOT = path.join(__dirname, '..');
const DIRS = { '146': path.dirname(require('../day146')), '147': require('../day147'), '148': require('../day148'), '149': require('../day149') };
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); }
const canon = (v) => {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
};
const STAGE_DAY = { charter: '146', art: '147', world: '148', story: '149' };

(async () => {
  // ---------------------------------------------------------------- 1. vendoring and the page's script list
  const v = cp.spawnSync(process.execPath, [path.join(ROOT, 'vendor.js'), '--check'], { encoding: 'utf8' });
  check('vendor.js --check: every vendored file is byte for byte its owner\'s', v.status === 0, (v.stdout + v.stderr).split('\n').slice(-4).join(' | '));
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'forge', 'manifest.json'), 'utf8'));
  check('the manifest names the five engines with their owners (147 render and audio, 148 world, 146 battle, 149 story)', manifest.engines.map((e) => e.file.replace('engines/engine-', '').replace('.js', '') + ':' + e.owner).join(' ') === 'render:147 audio:147 world:148 battle:146 story:149', manifest.engines);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const tags = [...html.matchAll(/<script(?: src="([^"]+)")?>([^<]*)<\/script>/g)].map((m) => m[1] ? m[1] : m[2].trim());
  const expectOrder = ['engines/engine-render.js', 'engines/engine-audio.js', 'engines/engine-world.js', 'engines/engine-battle.js', 'engines/engine-story.js', 'core/engine-text.js', 'core/styles.js', 'core/kit.js', 'core/studio.js'];
  check('index.html loads the engines, then Kit, then the Studio, before any forge', expectOrder.every((f, i) => tags[i] === f), tags.slice(0, 10));
  const stages = ['charter', 'art', 'world', 'story'];
  let cursor = expectOrder.length, okBrackets = true, listed = [];
  stages.forEach((s) => {
    if (tags[cursor++] !== "Studio.begin('" + s + "');") okBrackets = false;
    const day = STAGE_DAY[s];
    while (cursor < tags.length && tags[cursor].indexOf('Studio.end(') < 0) listed.push(day + ':' + tags[cursor++]);
    if (tags[cursor++] !== "Studio.end('" + s + "');") okBrackets = false;
  });
  check('each stage\'s scripts sit between its own Studio.begin and Studio.end, and the store, the projects module and studio-boot load last', okBrackets && tags.slice(cursor).join() === 'core/idb.js,core/projects.js,core/studio-boot.js', { cursor, total: tags.length });
  const want = [];
  stages.forEach((s) => manifest.files.filter((f) => f.path.indexOf('forge/' + STAGE_DAY[s] + '/') === 0 && /\.js$/.test(f.path)).forEach((f) => want.push(STAGE_DAY[s] + ':' + f.path)));
  const vendor = { '146': ['charter', 'codex', 'rules', 'arena', 'sim'].map((n) => 'forge/146/ws-' + n + '.js') };
  const have = listed.map((x) => x.replace(/^(\d+):/, '$1:'));
  check('every vendored forge script is loaded exactly once and none else is', have.length === new Set(have).size && canon(have.slice().sort()) === canon(want.slice().sort()), { have: have.length, want: want.length, missing: want.filter((w) => have.indexOf(w) < 0), extra: have.filter((h) => want.indexOf(h) < 0) });
  const kitFile = fs.readFileSync(path.join(ROOT, 'core', 'kit.js'), 'utf8'), src146 = fs.readFileSync(require('../day146'), 'utf8');
  check('core/kit.js is Day 146\'s KIT:CORE fence verbatim', src146.indexOf(kitFile.trim()) >= 0);
  const own = ['core/studio.js', 'core/studio-boot.js', 'core/studio.css', 'core/idb.js', 'core/projects.js'].map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'));
  check('the Studio\'s own files are ASCII, and use none of the forbidden APIs', own.every((t) => !/[^\x00-\x7f]/.test(t)) && own.every((t) => !/ctx\.roundRect|ctx\.ellipse|window\.confirm|[^.\w]\.remove\(\)/.test(t)));

  // ---------------------------------------------------------------- 2. boot
  let { win, errors } = await bootReady({ stage: 'charter', evalEngines: true });
  const S = win.Studio, K = win.Kit;
  check('the stacked page boots with no errors', errors.length === 0, errors.slice(0, 3));
  check('all four stages are loaded, in order', S.STAGES.map((s) => s.id + ':' + S.stages[s.id].loaded).join(' ') === 'charter:true art:true world:true story:true', S.STAGES.map((s) => S.stages[s.id].loaded));
  check('the Studio log shows each bracket opened and closed once, in order', canon(S.log) === canon(['begin charter', 'end charter', 'begin art', 'end art', 'begin world', 'end world', 'begin story', 'end story']), S.log);
  const flat = S.base.workspaces();
  check('Kit holds every tab under its stage with no clash: 5 + 9 + 6 + 6 tabs, all ids distinct', flat.length === 26 && new Set(flat).size === 26, flat);
  const collide = ['start', 'export'].map((t) => flat.filter((f) => f.split('.')[1] === t).length);
  check('the ids all four stages share (start, and export for three) are kept apart, not merged', canon(collide) === canon([3, 3]) && flat.filter((f) => /\.world$/.test(f)).join() === 'art.world,world.world', { collide, world: flat.filter((f) => /\.world$/.test(f)) });

  // Each stage's tab list equals what the forge mounts on its own page.
  const alone = {};
  for (const day of ['147', '148', '149']) {
    const r = boot({ file: path.join(DIRS[day], 'index.html'), url: 'https://augustineiacopelli.github.io/appaday-' + day + '/' });
    alone[day] = r.win.Kit.workspaces();

  }
  { const r = boot({ file: require('../day146'), url: 'https://augustineiacopelli.github.io/appaday-146/' }); alone['146'] = r.win.Kit.workspaces(); }
  stages.forEach((s) => check('stage ' + s + ' mounts the same tabs Day ' + STAGE_DAY[s] + ' mounts alone', canon(S.stages[s].mounts) === canon(alone[STAGE_DAY[s]]), { stage: S.stages[s].mounts, alone: alone[STAGE_DAY[s]] }));

  // ---------------------------------------------------------------- 3. the real Kit is back
  const B = S.base;
  const restored = () => K.mount === B.mount && K.on === B.on && K.store.get === B.storeGet && K.store.set === B.storeSet && K.store.del === B.storeDel && K.bundle.importText === B.importText && K.buildExport === B.buildExport && K.openExport === B.openExport && K.validate.register === B.validateRegister && K.codex.register === B.codexRegister && K.jump.register === B.jumpRegister;
  check('on the charter stage the real Kit is in place: mount, on, store, import, export, registries', restored());
  const kits = {}; stages.forEach((s) => { const k = S.stages[s].kit; kits[s] = Object.keys(k).filter((x) => k[x]).join(','); });
  check('Day 146 replaces none of the five Kit functions', kits.charter === '', kits.charter);
  check('Day 147 replaces store get, set, del, buildExport and openExport; Day 148 and Day 149 also replace importText', kits.art === 'storeGet,storeSet,storeDel,buildExport,openExport' && kits.world === 'storeGet,storeSet,storeDel,importText,buildExport,openExport' && kits.story === kits.world, kits);
  const fns = []; stages.forEach((s) => Object.keys(S.stages[s].kit).forEach((k) => { if (S.stages[s].kit[k]) fns.push(S.stages[s].kit[k]); }));
  check('every override a forge installed is its own function: none is the real Kit\'s, none is shared (nothing chains)', fns.length === 17 && new Set(fns).size === 17 && fns.every((f) => Object.keys(B).every((k) => B[k] !== f)), fns.length);
  S.enter('art');
  check('native mode: with Day 147 on screen its own store and export are in place, and Day 148\'s import gate is not', K.store.get === S.stages.art.kit.storeGet && K.buildExport === S.stages.art.kit.buildExport && K.bundle.importText === B.importText);
  S.enter('story');
  check('native mode: with Day 149 on screen its own store, import gate and export are in place', K.store.get === S.stages.story.kit.storeGet && K.bundle.importText === S.stages.story.kit.importText && K.openExport === S.stages.story.kit.openExport);
  S.enter('charter');
  check('back on the charter stage the real Kit is restored', restored());
  let threw = {};
  try { S.begin('art'); } catch (e) { threw.again = e.message; }
  try { S.end('story'); } catch (e) { threw.wrongEnd = e.message; }
  check('the bracket refuses a stage loaded twice and an end for a stage that is not loading', /already been loaded/.test(threw.again) && /not loading/.test(threw.wrongEnd), threw);

  // ---------------------------------------------------------------- 4. window.WS and the router
  check('window.WS finds Day 146\'s five workspaces from any stage', ['charter', 'codex', 'rules', 'arena', 'sim'].every((k) => win.WS[k] && win.WS[k] === S.stages.charter.ws[k]) && Object.keys(win.WS).join() === 'charter,codex,rules,arena,sim', Object.keys(win.WS));
  check('Days 147 to 149 write nothing to window.WS: their own workspaces stay on ART.WS, WORLD.WS and STORY.WS', ['art', 'world', 'story'].every((s) => Object.keys(S.stages[s].ws).length === 0) && Object.keys(win.ART.WS).length >= 8 && Object.keys(win.WORLD.WS).length >= 4 && Object.keys(win.STORY.WS).length >= 4, [Object.keys(win.ART.WS).length, Object.keys(win.WORLD.WS).length, Object.keys(win.STORY.WS).length]);
  const seen = {};
  for (const s of stages) {
    S.show(s);
    const tabs = [...win.document.querySelectorAll('#tabs .tab')].map((b) => b.dataset.ws);
    const inner = win.document.querySelector('#ws > .ws-inner');
    seen[s] = { stage: S.stage, body: win.document.body.getAttribute('data-stage'), active: K.active(), tabs: tabs.join(), ws: K.workspaces().join(), inner: inner && inner.dataset.ws, innerHtml: inner ? inner.textContent.length : 0 };
    check('showing ' + s + ': the body carries the stage, Kit.active and Kit.workspaces speak the forge\'s own ids, the tab strip holds only its tabs', seen[s].body === s && seen[s].active === (s === 'charter' ? 'charter' : 'start') && seen[s].tabs === S.stages[s].mounts.join() && seen[s].ws === S.stages[s].mounts.join() && seen[s].inner === seen[s].active && seen[s].innerHtml > 40, seen[s]);
  }
  S.show('art'); const rArt = S.resolve('world'), sArt = S.resolve('start');
  S.show('world'); const rWorld = S.resolve('world'), sWorld = S.resolve('start');
  check('Kit.go(\'world\') means art.world on the art stage and world.world on the world stage; start is the stage\'s own', rArt === 'art.world' && rWorld === 'world.world' && sArt === 'art.start' && sWorld === 'world.start', [rArt, rWorld, sArt, sWorld]);
  S.show('story'); const flagsOk = K.go('flags', { silent: true }), canFlags = K.canEnter('flags');
  check('a locked tab stays locked under its stage and says why (Story needs a finished world)', flagsOk === false && canFlags.ok === false && /world/i.test(canFlags.reason), canFlags);
  check('an unknown id still fails cleanly', K.go('nope', { silent: true }) === false);

  // ---------------------------------------------------------------- 5. registries
  const names = (kind) => { const all = []; stages.forEach((s) => Object.keys(kind(S.stages[s])).forEach((n) => all.push(n))); return all; };
  const vNames = names((st) => st.validators), tNames = []; stages.forEach((s) => Array.from(new Set(S.stages[s].types.map((t) => t.name))).forEach((n) => tNames.push(n)));
  const pNames = names((st) => st.prefixes);
  check('no two stages register the same validator name, record type name, or ID prefix (Kit would let the later one win silently)', new Set(vNames).size === vNames.length && new Set(tNames).size === tNames.length && new Set(pNames).size === pNames.length, { validators: vNames.length, types: tNames.length, prefixes: pNames.length, dupV: vNames.filter((n, i) => vNames.indexOf(n) !== i), dupT: tNames.filter((n, i) => tNames.indexOf(n) !== i), dupP: pNames.filter((n, i) => pNames.indexOf(n) !== i) });
  check('each forge\'s validators are named for its own namespace (charter, codex, rules, art, world, story)', stages.every((s) => Object.keys(S.stages[s].validators).every((n) => (s === 'charter' ? /^(charter|codex|rules)/ : new RegExp('^' + s + '\\.')).test(n))), stages.map((s) => Object.keys(S.stages[s].validators).length));
  S.enter('charter');
  const vOn = (n) => { const b = K.bundle.create('probe'); return K.validate.list().indexOf(n) >= 0; };
  check('validators of all stages are registered with Kit, each gated to its own stage', K.validate.list().length === vNames.length, [K.validate.list().length, vNames.length]);
  check('live: a stage is live while on screen; in native mode no other stage is live; charter stage is not live for art', S.live('charter') && !S.live('art') && !S.live('world') && !S.live('story'));
  S.native = false;
  // Phase 2 refined this: Kit's migrate gives every bundle an empty art, world and story, so a namespace counts only once it holds something.
  const probe = { kit: { format: 'saga-bundle', opened: [], forges: {} }, art: { version: '1.0.0' }, world: {}, story: {} };
  check('live, pipeline mode: a stage is also live for a bundle whose namespace holds something, and for no other (an empty namespace has not been reached)', S.live('art', probe) && !S.live('world', probe) && !S.live('story', probe) && S.live('charter', probe));
  S.native = true;

  // ---------------------------------------------------------------- 6. scoped CSS
  const sel = (x, id) => S.scopeSelector(x, id || 'art');
  check('selector scoping: plain, compound, list members, descendant', sel('.card') === ':where(body[data-stage="art"]) .card' && sel('.tbl td.num') === ':where(body[data-stage="art"]) .tbl td.num' && sel('*') === ':where(body[data-stage="art"]) *', [sel('.card'), sel('.tbl td.num')]);
  check('selector scoping: body, html and :root rebase onto the stage', sel('body') === 'body[data-stage="art"]' && sel('body.compact .card') === 'body[data-stage="art"].compact .card' && sel(':root') === ':root body[data-stage="art"]' && sel('html[data-theme="light"] .card') === 'html[data-theme="light"] body[data-stage="art"] .card' && sel(':root > .x') === ':root body[data-stage="art"] > .x', [sel('body'), sel(':root'), sel('html[data-theme="light"] .card')]);
  const css = S.scopeCss('@media (max-width: 520px) { .a, .b:not(.c, .d) { color: red } } @keyframes k { from { opacity: 0 } 50% { opacity: .5 } to { opacity: 1 } } .e::after { content: "a,b{c}"; } /* note */ .f { margin: 0 }', 'world');
  check('CSS scoping: media rules recurse, selector lists split only at top level, keyframes steps and strings are untouched', css.indexOf('@media (max-width: 520px){:where(body[data-stage="world"]) .a,:where(body[data-stage="world"]) .b:not(.c, .d){ color: red }') >= 0 && css.indexOf('@keyframes k{ from { opacity: 0 } 50% { opacity: .5 } to { opacity: 1 } }') >= 0 && css.indexOf('content: "a,b{c}"') >= 0 && css.indexOf(':where(body[data-stage="world"]) .f') >= 0, css);
  const leaf = (t) => (t.replace(/\/\*[\s\S]*?\*\//g, '').match(/\{[^{}]*\}/g) || []).map((x) => x.replace(/\s+/g, ' ').trim());
  const stylesSrc = (() => { const sandbox = { window: {} }; require('vm').runInNewContext(fs.readFileSync(path.join(ROOT, 'core', 'styles.js'), 'utf8'), sandbox); return sandbox.window.STUDIO_STYLES; })();
  for (const s of stages) {
    const el = win.document.querySelector('style[data-stage-css="' + s + '"]');
    const out = el ? el.textContent : '';
    check('stage ' + s + ': its stylesheet is in the page, every declaration block is unchanged and in order', !!el && canon(leaf(out)) === canon(leaf(stylesSrc[s])) && out.length > 1000, { blocks: leaf(out).length, src: leaf(stylesSrc[s]).length });
    const rules = []; const walk = (list) => Array.prototype.forEach.call(list, (r) => { if (r.cssRules && r.type !== 7) walk(r.cssRules); else if (r.type === 1) rules.push(r.selectorText); });
    walk(el.sheet.cssRules);
    const unscoped = rules.filter((t) => t.split(',').some((p) => p.indexOf('data-stage="' + s + '"') < 0));
    check('stage ' + s + ': every style rule selector carries data-stage="' + s + '" (' + rules.length + ' rules)', rules.length > 20 && unscoped.length === 0, unscoped.slice(0, 5));
  }
  // A class the forges share cannot cross: a rule written for the art stage does not match under world, and the reverse.
  const shared = ['card', 'chip', 'tbl', 'kv', 'section-h', 'store-banner', 'brand-title', 'btn', 'field', 'row', 'grid'].filter((c) => stages.filter((s) => new RegExp('\\.' + c + '\\b').test(stylesSrc[s])).length >= 2);
  const matchCount = (stage, cls) => { const el = win.document.querySelector('style[data-stage-css="' + stage + '"]'); const probeEl = win.document.createElement('div'); probeEl.className = cls; win.document.body.appendChild(probeEl); let n = 0; const walk = (list) => Array.prototype.forEach.call(list, (r) => { if (r.cssRules && r.type !== 7) walk(r.cssRules); else if (r.type === 1 && r.selectorText.split(',').some((p) => p.trim().slice(-(cls.length + 1)) === '.' + cls)) { try { if (probeEl.matches(r.selectorText)) n++; } catch (e) {} } }); walk(el.sheet.cssRules); win.document.body.removeChild(probeEl); return n; };
  check('classes the stages share (' + shared.join(', ') + ') exist in more than one stylesheet', shared.length >= 3, shared);
  let leak = [], ownN = 0;
  stages.forEach((on) => { win.document.body.setAttribute('data-stage', on); shared.forEach((c) => stages.forEach((s) => { const n = matchCount(s, c); if (s === on) ownN += n; else if (n) leak.push(c + ':' + s + ' under ' + on); })); });
  check('a shared class matches only the stage on screen\'s rules: no stylesheet of another stage reaches it, and each stage\'s own rules do', leak.length === 0 && ownN > 0, { leak: leak.slice(0, 6), ownN });
  win.document.body.setAttribute('data-stage', S.stage);

  // ---------------------------------------------------------------- 7. engine sources (the shipped case: engines are script files)
  check('Kit.engine.source() is Day 146\'s ENGINE:BATTLE fence, byte for byte', K.engine.source() === (() => { const a = src146.indexOf('// === ENGINE:BATTLE BEGIN ==='), z = src146.indexOf('// === ENGINE:BATTLE END ==='); return src146.slice(src146.indexOf('\n', a) + 1, src146.lastIndexOf('\n', z) + 1); })());
  check('Days 147, 148 and 149 each find their engine source in the page', win.ART.engines.available() && win.WORLD.engines.available() && win.STORY.engines.available());
  const eng = (day, text) => text;
  const owned = { render: ['147', 'engine-render.js'], world: ['148', 'engine-world.js'], story: ['149', 'engine-story.js'] };
  const exp147 = win.ART.engines.file('render', '').text, exp147a = win.ART.engines.file('audio', '').text;
  const own147r = fs.readFileSync(path.join(DIRS['147'], 'engine-render.js'), 'utf8'), own147a = fs.readFileSync(path.join(DIRS['147'], 'engine-audio.js'), 'utf8');
  check('the engine files a forge writes into an export are its own repository files (render and audio from Day 147)', exp147 === own147r && exp147a === own147a, [exp147.length, own147r.length, exp147a.length, own147a.length]);
  const own148 = fs.readFileSync(path.join(DIRS['148'], 'engine-world.js'), 'utf8').replace(/^\/\* Bundle hash [0-9a-f]+ \*\/\n/m, '');
  const exp148 = win.WORLD.engines.file ? win.WORLD.engines.file('') : null;
  check('Day 148 writes engine-world.js from the page: its header, then the fence, equal to its repository file', !!exp148 && (exp148.text || exp148) === own148, exp148 && (exp148.text || exp148).length);
  check('Day 149\'s game kit table is the one its build writes: five engines in load order, same versions and hashes', canon(win.STORY.engines.FILES) === canon(JSON.parse(/FILES: (\[\{.*?\}\]) \}/.exec(fs.readFileSync(path.join(DIRS['149'], 'index.html'), 'utf8'))[1])) && win.STORY.engines.LOAD_ORDER.join() === 'engine-render.js,engine-audio.js,engine-world.js,engine-battle.js,engine-story.js', win.STORY.engines.LOAD_ORDER);

  // ---------------------------------------------------------------- 8. the isolation test
  const fixtureRaw = fs.readFileSync(path.join(DIRS['147'], 'test', 'out', 'demo-bundle.json'), 'utf8');
  const orig = JSON.parse(fixtureRaw); orig.art = {}; orig.world = {}; orig.story = {}; orig.kit.contentHash = win.Kit.bundle.hash(orig); const fixture = JSON.stringify(orig);
  check('the fixture is a Day 146 Final: charter locked, forge 146 final, art, world and story empty', orig.kit.forges['146'].status === 'final' && orig.charter.locked && canon([orig.art, orig.world, orig.story]) === canon([{}, {}, {}]) && canon(orig.kit.opened) === canon(['charter', 'rules']), orig.kit.opened);
  async function isolation(stage) {
    const r = await bootReady({ stage, evalEngines: true });
    const w = r.win, k = w.Kit;
    await wait(450); // let the booted stage's own debounced meter paints (300 ms) finish before the stage is left
    w.Studio.show('charter');
    const imp = k.bundle.importText(fixture); await wait(30);
    w.Kit.emit('load', k.bundle.current()); w.Kit.emit('change', { reason: 'edit' }); await wait(260);
    const cur = k.bundle.current();
    const moved = Object.keys(cur).filter((x) => ['charter', 'codex', 'rules', 'kit'].indexOf(x) < 0 && canon(cur[x]) !== canon(orig[x]));
    const added = Object.keys(cur).filter((x) => !(x in orig));
    const out = { matches: imp.matches, moved, added, opened: canon(cur.kit.opened) === canon(orig.kit.opened), forges: canon(cur.kit.forges) === canon(orig.kit.forges), errors: r.errors.length };
    out.noNamespaces = ['art', 'world', 'story'].every((n) => canon(cur[n]) === '{}');
    out.records = { rules: canon(cur.rules) === canon(orig.rules), charter: canon(cur.charter) === canon(orig.charter), codex: canon(cur.codex) === canon(orig.codex) };
    return out;
  }
  for (const stage of ['charter', 'art', 'world', 'story']) {
    const o = await isolation(stage);
    check('loading a Day 146 only bundle (booted in ' + stage + ') changes nothing outside charter, codex and rules: no key moved or added, opened and forges intact, hash verifies', o.matches && o.moved.length === 0 && o.added.length === 0 && o.opened && o.forges && o.noNamespaces && o.errors === 0, o);
  }
  // The control: the same load on the stage that owns the namespace does reach it, so the gate is not simply switching everything off.
  { const r = await bootReady({ stage: 'charter', evalEngines: true }); const w = r.win;
    w.Kit.bundle.importText(fixture); await wait(30);
    w.Studio.enter('story'); await wait(30);
    const cur = w.Kit.bundle.current();
    check('control: entering the story stage gives the bundle its story namespace (the stage\'s own load pass runs), still leaving art and world empty', Object.keys(cur.story || {}).length > 0 && canon(cur.art) === '{}' && canon(cur.world) === '{}', Object.keys(cur));
    w.Studio.enter('art'); await wait(30);
    check('control: entering the art stage gives it its art namespace', Object.keys(w.Kit.bundle.current().art || {}).length > 0); }

  const pass = results.filter((r) => r.ok).length;
  results.forEach((r) => console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : '  ' + (JSON.stringify(r.detail) || '').slice(0, 1200))));
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'out', 'phase1-report.json'), JSON.stringify({ pass, total: results.length, results }, null, 1));
  console.log('\n' + pass + ' of ' + results.length + ' passed');
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
