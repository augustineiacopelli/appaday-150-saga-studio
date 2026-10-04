// === STUDIO:CORE BEGIN ===
// Saga Studio, Day 150. The load sandwich.
//
// The four forges are vendored byte for byte and are never edited. Each was written to own a whole page, so each one
// registers the same tab ids (start, export, dev, and in 147 and 148 world), replaces the same five Kit functions
// (Kit.store.get/set/del, Kit.bundle.importText, Kit.buildExport, Kit.openExport), and styles the same class names.
// This file lets all four live in one page by bracketing each forge's scripts:
//
//   Studio.begin('art')   ...the forge's scripts run here...   Studio.end('art')
//
// begin() prepares a clean room: Kit.mount becomes a proxy that prefixes every tab id with the stage ("art.world"),
// Kit.on becomes a gate so a forge's load and change handlers only act on bundles that belong to its stage, and window.WS
// resolves to that stage's own workspace object. end() takes the forge's Kit overrides off again (keeping them on the stage
// record for the later phases), puts the saved Kit functions back, files the forge's workspace object and readiness
// function under its stage, and injects its stylesheet with every selector scoped to body[data-stage="art"].
//
// Loaded after core/kit.js and before any forge script. Needs nothing from a forge. Plain ES5.
(function () {
  'use strict';
  var Kit = window.Kit;
  if (!Kit || !Kit.mount) throw new Error('Studio: core/kit.js must load before core/studio.js.');
  var U = Kit.util;

  // ---------------------------------------------------------------- the stages
  // ns is the bundle namespace the stage owns ('charter' stage owns charter, codex and rules, which Kit itself knows).
  // global names the forge's own namespace object, which holds its readiness function.
  var STAGES = [
    { id: 'charter', day: '146', label: 'Charter and Rules', ns: null, global: null },
    { id: 'art', day: '147', label: 'Art and Audio', ns: 'art', global: 'ART' },
    { id: 'world', day: '148', label: 'World', ns: 'world', global: 'WORLD' },
    { id: 'story', day: '149', label: 'Story', ns: 'story', global: 'STORY' }
  ];
  var Studio = window.Studio = { version: '1.0.0', STAGES: STAGES, stages: {}, stage: null, loading: null, log: [] };
  STAGES.forEach(function (s) {
    Studio.stages[s.id] = { id: s.id, day: s.day, label: s.label, ns: s.ns, global: s.global, ws: {}, mounts: [], loaded: false, onLoad: [], onChange: [], validators: {}, types: [], typeDefs: {}, prefixes: {}, prefixSnap: null, jumps: [], kit: null, readiness: null, api: null, css: null };
  });
  function stageOf(full) { var i = String(full).indexOf('.'); return i > 0 ? String(full).slice(0, i) : null; }
  function localOf(full) { var i = String(full).indexOf('.'); return i > 0 ? String(full).slice(i + 1) : String(full); }

  // ---------------------------------------------------------------- the saved real Kit
  // Taken once, here, before any forge runs. Everything a forge replaces is put back from this table.
  var BASE = {
    mount: Kit.mount, on: Kit.on, go: Kit.go, canEnter: Kit.canEnter, active: Kit.active, workspaces: Kit.workspaces,
    rerender: Kit.rerender, paintTabs: Kit.paintTabs,
    storeGet: Kit.store.get, storeSet: Kit.store.set, storeDel: Kit.store.del,
    importText: Kit.bundle.importText, buildExport: Kit.buildExport, openExport: Kit.openExport,
    engineSource: Kit.engine && Kit.engine.source,
    validateRegister: Kit.validate.register, codexRegister: Kit.codex.register, jumpRegister: Kit.jump.register
  };
  Studio.base = BASE;
  function restoreStoreKit() {
    Kit.store.get = BASE.storeGet; Kit.store.set = BASE.storeSet; Kit.store.del = BASE.storeDel;
    Kit.bundle.importText = BASE.importText; Kit.buildExport = BASE.buildExport; Kit.openExport = BASE.openExport;
  }
  function restoreKit() { Kit.mount = BASE.mount; Kit.on = BASE.on; restoreStoreKit(); }
  // Native mode (Phase 1): while a stage is on screen, its own store, import gate and export functions are put back, so a
  // forge behaves exactly as it does on its own page and its own phase tests can drive it. They were captured clean, each
  // over the real Kit (never over another forge's), so nothing chains. Phase 2 turns native mode off for good, because one
  // store, one import and one export replace all four.
  Studio.native = true;
  function useStageKit(stageId) {
    restoreStoreKit();
    var k = Studio.native && Studio.stages[stageId] && Studio.stages[stageId].kit;
    if (!k) return;
    if (k.storeGet) Kit.store.get = k.storeGet;
    if (k.storeSet) Kit.store.set = k.storeSet;
    if (k.storeDel) Kit.store.del = k.storeDel;
    if (k.importText) Kit.bundle.importText = k.importText;
    if (k.buildExport) Kit.buildExport = k.buildExport;
    if (k.openExport) Kit.openExport = k.openExport;
  }
  Studio.useStageKit = useStageKit;
  // Record types and ID prefixes are registered globally by every forge that loads. On its own page a forge sees only its own,
  // so in native mode the stage on screen has its types and prefixes registered and the other stages' are taken off. That is
  // what keeps, for example, Day 146's chapter type (a required continent label) from judging a Day 147 fixture on the art
  // stage. Once the pipeline replaces native mode, all of them stay registered.
  function useStageRegistry(stageId) {
    if (!Studio.native) return;
    var PREFIXES = Kit.codex.PREFIXES;
    STAGES.forEach(function (s) {
      var st = Studio.stages[s.id], on = s.id === stageId;
      Object.keys(st.typeDefs).forEach(function (name) {
        if (on) { if (!Kit.codex.type(name)) BASE.codexRegister(st.typeDefs[name]); }
        else Kit.codex.unregister(name);
      });
      Object.keys(st.prefixes).forEach(function (k) { if (on) PREFIXES[k] = st.prefixes[k]; else delete PREFIXES[k]; });
    });
    if (Kit.index && Kit.index.invalidate) Kit.index.invalidate();
  }
  Studio.useStageRegistry = useStageRegistry;

  // ---------------------------------------------------------------- window.WS
  // Day 146's workspaces live on window.WS and look each other up lazily (window.WS.codex.check inside Rules, and so on),
  // from handlers that fire on every change whichever stage is showing. Days 147 to 149 keep theirs on ART.WS, WORLD.WS and
  // STORY.WS and never touch window.WS. So window.WS is a view: it reads the active stage's object first and every other
  // stage's after it, and writes go to the stage whose scripts are loading (or the active one). A lazy lookup always finds
  // its own workspace, and two stages can still hold the same key without one silently winning.
  function wsTarget() { return Studio.stages[Studio.loading || Studio.stage || 'charter'].ws; }
  function wsOrder() {
    var first = Studio.stages[Studio.loading || Studio.stage || 'charter'], out = [first];
    STAGES.forEach(function (s) { if (Studio.stages[s.id] !== first) out.push(Studio.stages[s.id]); });
    return out;
  }
  var wsView = new Proxy({}, {
    get: function (t, p) { var o = wsOrder(); for (var i = 0; i < o.length; i++) { if (Object.prototype.hasOwnProperty.call(o[i].ws, p)) return o[i].ws[p]; } return undefined; },
    set: function (t, p, v) { wsTarget()[p] = v; return true; },
    has: function (t, p) { return wsOrder().some(function (s) { return p in s.ws; }); },
    deleteProperty: function (t, p) { delete wsTarget()[p]; return true; },
    ownKeys: function () { var seen = {}, keys = []; wsOrder().forEach(function (s) { Object.keys(s.ws).forEach(function (k) { if (!seen[k]) { seen[k] = 1; keys.push(k); } }); }); return keys; },
    getOwnPropertyDescriptor: function (t, p) { var o = wsOrder(); for (var i = 0; i < o.length; i++) { if (Object.prototype.hasOwnProperty.call(o[i].ws, p)) return { value: o[i].ws[p], writable: true, enumerable: true, configurable: true }; } return undefined; }
  });
  window.WS = wsView;

  // ---------------------------------------------------------------- bundle membership (the gate for forge handlers)
  function bundleOf(b) { return b || (Kit.bundle && Kit.bundle.current && Kit.bundle.current()) || null; }
  // A stage is live for a bundle when it is the stage on screen, or the bundle already carries its namespace. Anything else
  // is a bundle that has not reached that stage yet, and the stage's handlers must leave it exactly as it is.
  // In native mode (Phase 1) a stage is live only while it is on screen, so every forge behaves exactly as on its own page:
  // nothing of another stage's handlers or checks runs, and a bundle that has not reached a stage is never touched by it.
  // Once the pipeline replaces native mode, a stage is also live for any bundle that already carries its namespace.
  Studio.live = function (stageId, b) {
    var st = Studio.stages[stageId];
    if (!st) return false;
    if (Studio.stage === stageId) return true;
    if (Studio.native || !st.ns) return false;
    b = bundleOf(b);
    return !!(b && U.isObj(b[st.ns]));
  };

  // ---------------------------------------------------------------- the bracket
  Studio.begin = function (stageId) {
    var st = Studio.stages[stageId];
    if (!st) throw new Error('Studio.begin: unknown stage ' + stageId);
    if (Studio.loading) throw new Error('Studio.begin(' + stageId + '): ' + Studio.loading + ' is still loading. Call Studio.end first.');
    if (st.loaded) throw new Error('Studio.begin(' + stageId + '): this stage has already been loaded.');
    if (Kit.store.get !== BASE.storeGet || Kit.bundle.importText !== BASE.importText || Kit.buildExport !== BASE.buildExport) throw new Error('Studio.begin(' + stageId + '): Kit is not in its saved state.');
    Studio.loading = stageId;
    // Tabs: every id the forge mounts is filed under the stage.
    Kit.mount = function (id, o) { if (st.mounts.indexOf(id) < 0) st.mounts.push(id); return BASE.mount(stageId + '.' + id, o); };
    // Handlers: the forge's own load and change handlers are kept, and run only while the stage is live.
    Kit.on = function (evt, fn) {
      var gated = function (data) { if (Studio.live(stageId)) return fn.apply(this, arguments); };
      gated.studioInner = fn;
      if (evt === 'load') st.onLoad.push(fn); else if (evt === 'change') st.onChange.push(fn);
      return BASE.on(evt, gated);
    };
    // Validators: kept by name, run only while the stage is live for the bundle being checked.
    Kit.validate.register = function (name, fn) {
      st.validators[name] = fn;
      return BASE.validateRegister(name, function (b, ctx) { if (Studio.live(stageId, b)) return fn.apply(this, arguments); });
    };
    // Record types and jump handlers are recorded per stage so a clash (the same type name or prefix from two stages, which
    // Kit would resolve silently by letting the later forge win) can be detected and reported instead.
    st.prefixSnap = Object.keys(Kit.codex.PREFIXES);
    Kit.codex.register = function (def) {
      var out = BASE.codexRegister.apply(Kit.codex, arguments);
      st.types.push({ name: def && def.name, prefix: def && def.prefix });
      if (def && def.name) st.typeDefs[def.name] = def;
      return out;
    };
    Kit.jump.register = function (h) { st.jumps.push(h); return BASE.jumpRegister.apply(Kit.jump, arguments); };
    Studio.log.push('begin ' + stageId);
  };

  Studio.end = function (stageId) {
    var st = Studio.stages[stageId];
    if (!st || Studio.loading !== stageId) throw new Error('Studio.end(' + stageId + '): that stage is not loading.');
    // Keep what the forge installed, then put the real Kit back.
    st.kit = {
      storeGet: Kit.store.get !== BASE.storeGet ? Kit.store.get : null,
      storeSet: Kit.store.set !== BASE.storeSet ? Kit.store.set : null,
      storeDel: Kit.store.del !== BASE.storeDel ? Kit.store.del : null,
      importText: Kit.bundle.importText !== BASE.importText ? Kit.bundle.importText : null,
      buildExport: Kit.buildExport !== BASE.buildExport ? Kit.buildExport : null,
      openExport: Kit.openExport !== BASE.openExport ? Kit.openExport : null
    };
    Object.keys(Kit.codex.PREFIXES).forEach(function (k) { if (st.prefixSnap.indexOf(k) < 0) st.prefixes[k] = Kit.codex.PREFIXES[k]; });
    restoreKit();
    Kit.validate.register = BASE.validateRegister; Kit.codex.register = BASE.codexRegister; Kit.jump.register = BASE.jumpRegister;
    // The forge's own namespace and its readiness function.
    st.api = st.global ? window[st.global] || null : null;
    // The one value Day 149's build writes into its page (ws-story149.js carries /*ENGINE_FILES*/null): the game kit table.
    if (stageId === 'story' && st.api && st.api.engines && window.STUDIO_ENGINE_FILES) {
      st.api.engines.FILES = window.STUDIO_ENGINE_FILES.map(function (f) { return U.clone(f); });
      st.api.engines.LOAD_ORDER = st.api.engines.FILES.map(function (f) { return f.file; });
    }
    st.readiness = readinessFor(st);
    st.loaded = true;
    Studio.loading = null;
    injectCss(st);
    Studio.log.push('end ' + stageId);
    return st;
  };

  // Stage readiness: does the bundle on hand let this stage open? Day 148 and 149 publish a function for it
  // (WORLD.readiness, STORY.readiness: true or a reason). Day 146 has nothing to wait for. Day 147 keeps its gate inside its
  // shell, so it is read from the first gated tab it mounted.
  function readinessFor(st) {
    if (st.id === 'charter') return function () { return true; };
    if (st.api && typeof st.api.readiness === 'function') return function (b) { return st.api.readiness(bundleOf(b)); };
    return function () {
      var gated = st.mounts.filter(function (m) { return m !== 'start' && m !== 'dev'; })[0];
      if (!gated) return true;
      var c = BASE.canEnter(st.id + '.' + gated);
      return c.ok ? true : (c.reason || 'This stage is not ready.');
    };
  }
  Studio.readiness = function (stageId, b) { var st = Studio.stages[stageId]; return st && st.readiness ? st.readiness(b) : 'Unknown stage.'; };

  // ---------------------------------------------------------------- scoped CSS
  // Every selector of a forge's stylesheet is prefixed with its stage, so the class names the forges share (card, chip, tbl,
  // kv, section-h, store-banner, brand-title) cannot bleed across stages. The attribute sits on <body>, so modals and drawers,
  // which live in #overlays under <body>, are covered too. A selector that begins with :root, html or body is rebased onto
  // the body attribute. Everything else gets :where(body[data-stage="x"]) in front, which adds no specificity, so each rule
  // keeps the weight it had on its own page.
  var AT_BLOCKS = /^@(media|supports|container|layer|document|scope)\b/i;
  function splitTop(s, ch) {
    var out = [], depth = 0, cur = '', q = null, i, c;
    for (i = 0; i < s.length; i++) {
      c = s.charAt(i);
      if (q) { cur += c; if (c === '\\') { cur += s.charAt(++i); } else if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; cur += c; continue; }
      if (c === '(' || c === '[') depth++; else if (c === ')' || c === ']') depth--;
      if (c === ch && depth === 0) { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur);
    return out;
  }
  function scopeSelector(sel, stageId) {
    var attr = 'body[data-stage="' + stageId + '"]';
    var s = sel.trim();
    if (!s) return s;
    var m = /^(:root|html)((\[[^\]]*\])|(:[\w-]+(\([^)]*\))?)|(\.[\w-]+)|(#[\w-]+))*/.exec(s);
    if (m && (m[0].length === s.length || /[\s>+~]/.test(s.charAt(m[0].length)))) {
      var rest = s.slice(m[0].length);
      return m[0] + ' ' + attr + rest;
    }
    if (/^body(?![\w-])/.test(s)) return attr + s.slice(4);
    return ':where(' + attr + ') ' + s;
  }
  function scopeCss(css, stageId) {
    var out = '', i = 0, n = css.length, prelude = '', c, q, depth, start;
    while (i < n) {
      c = css.charAt(i);
      if (c === '/' && css.charAt(i + 1) === '*') { var e = css.indexOf('*/', i + 2); if (e < 0) e = n - 2; out += prelude.length ? '' : css.slice(i, e + 2); i = e + 2; continue; }
      if (c === '"' || c === "'") { q = c; prelude += c; i++; while (i < n && css.charAt(i) !== q) { if (css.charAt(i) === '\\') { prelude += css.charAt(i++); } prelude += css.charAt(i++); } prelude += css.charAt(i++); continue; }
      if (c === ';') { out += prelude + ';'; prelude = ''; i++; continue; }
      if (c === '{') {
        depth = 1; start = i + 1; i++;
        while (i < n && depth > 0) {
          c = css.charAt(i);
          if (c === '/' && css.charAt(i + 1) === '*') { var e2 = css.indexOf('*/', i + 2); i = (e2 < 0 ? n : e2 + 2); continue; }
          if (c === '"' || c === "'") { q = c; i++; while (i < n && css.charAt(i) !== q) { if (css.charAt(i) === '\\') i++; i++; } i++; continue; }
          if (c === '{') depth++; else if (c === '}') depth--;
          i++;
        }
        var body = css.slice(start, i - 1), pre = prelude.trim();
        if (pre.charAt(0) === '@') out += AT_BLOCKS.test(pre) ? pre + '{' + scopeCss(body, stageId) + '}' : pre + '{' + body + '}';
        else out += splitTop(pre, ',').map(function (s) { return scopeSelector(s, stageId); }).join(',') + '{' + body + '}';
        out += '\n';
        prelude = '';
        continue;
      }
      prelude += c; i++;
    }
    return out + prelude;
  }
  Studio.scopeCss = scopeCss;
  Studio.scopeSelector = scopeSelector;
  function injectCss(st) {
    var all = window.STUDIO_STYLES;
    if (!all || typeof all[st.id] !== 'string') return;
    var old = document.querySelector('style[data-stage-css="' + st.id + '"]');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var el = document.createElement('style');
    el.setAttribute('data-stage-css', st.id);
    st.css = scopeCss(all[st.id], st.id);
    el.appendChild(document.createTextNode(st.css));
    document.head.appendChild(el);
  }

  // ---------------------------------------------------------------- the tab router
  // Kit keeps one flat list of tabs. The router makes it read as one list per stage: a forge says Kit.go('world') and means
  // its own world, and Kit.active() answers in the forge's own words.
  function resolve(id) {
    if (id == null) return null;
    id = String(id);
    var cur = Studio.stage;
    if (cur && Studio.stages[cur].mounts.indexOf(id) >= 0) return cur + '.' + id;
    if (stageOf(id) && Studio.stages[stageOf(id)] && Studio.stages[stageOf(id)].mounts.indexOf(localOf(id)) >= 0) return id;
    // A bare id the stage on screen does not mount fails, as it does on that forge's own page. Crossing stages takes the
    // stage qualified id (art.world), which only the Studio itself uses.
    return null;
  }
  Studio.resolve = resolve;

  function applyStage(stageId) {
    Studio.stage = stageId;
    if (document.body) document.body.setAttribute('data-stage', stageId);
  }
  // Enter a stage: make it the one on screen, then give a bundle that predates it the same load pass the forge would have
  // run on its own page (its ensure and scaffold handlers), so a stage never works on a bundle shaped for a different one.
  Studio.enter = function (stageId) {
    var st = Studio.stages[stageId];
    if (!st || !st.loaded) return false;
    var prev = Studio.stage;
    applyStage(stageId);
    useStageKit(stageId);
    useStageRegistry(stageId);
    var b = bundleOf();
    if (b && st.ns && prev !== stageId) {
      st.onLoad.forEach(function (fn) { try { fn(b); } catch (e) { console.error('[Studio] ' + stageId + ' load pass failed', e); } });
    }
    syncTabs();
    return true;
  };

  Kit.go = function (id, opts) {
    var full = resolve(id);
    if (!full) return BASE.go.apply(Kit, arguments);
    var prev = Studio.stage, to = stageOf(full);
    if (to !== prev && !Studio.enter(to)) return false;
    var ok = BASE.go(full, opts);
    if (!ok && prev && prev !== to) applyStage(prev);
    syncTabs();
    return ok;
  };
  Kit.canEnter = function (id) { var full = resolve(id); return BASE.canEnter(full || id); };
  Kit.active = function () { var a = BASE.active(); return a ? localOf(a) : a; };
  Kit.workspaces = function () {
    var cur = Studio.stage;
    return BASE.workspaces().filter(function (f) { return stageOf(f) === cur; }).map(localOf);
  };
  Kit.rerender = function () {
    BASE.rerender();
    var inner = document.querySelector('#ws > .ws-inner');
    if (inner && inner.dataset.ws) { inner.dataset.stage = stageOf(inner.dataset.ws) || Studio.stage || ''; inner.dataset.ws = localOf(inner.dataset.ws); }
  };
  Kit.paintTabs = function () { BASE.paintTabs(); syncTabs(); };

  // The tab bar shows the current stage's tabs under their own names. Kit repaints it from closures that do not go through
  // Kit.paintTabs, so a mutation observer keeps it filtered.
  function syncTabs() {
    var nav = document.getElementById('tabs');
    if (!nav) return;
    var cur = Studio.stage, kids = nav.children, i, b, full;
    for (i = 0; i < kids.length; i++) {
      b = kids[i];
      full = b.getAttribute('data-full') || b.dataset.ws;
      if (!full) continue;
      if (stageOf(full) !== cur) { nav.removeChild(b); i--; continue; }
      b.setAttribute('data-full', full);
      b.dataset.ws = localOf(full);
    }
  }
  Studio.syncTabs = syncTabs;
  function watchTabs() {
    var nav = document.getElementById('tabs');
    if (!nav || nav.__studioWatch || typeof MutationObserver === 'undefined') return;
    nav.__studioWatch = true;
    new MutationObserver(function () { syncTabs(); }).observe(nav, { childList: true });
  }
  Studio.watchTabs = watchTabs;

  // ---------------------------------------------------------------- engine sources
  // Days 146 to 149 read an engine's source back out of the page's own script text, by marker search (Day 146's Simulator and
  // Arena for ENGINE:BATTLE; the Art, World and Story forges to write an engine file into an export). In the Studio the
  // engines are script files, whose text a page cannot read, so each engine's text is also placed in an inert script element
  // (type text/plain, never run). vendor.js proves the text is the owners' file; the forges' marker search finds it as it
  // would find the inline fence.
  (function () {
    var T = window.STUDIO_ENGINE_TEXT;
    if (!T || !document.head) return;
    // Day 146 exports engine-battle.js as a header plus the fence body, without the two marker lines that its own page
    // searches for, so those lines are put back around it (assembled from pieces, as Kit does, so this file never matches).
    var BM = '// === ENGINE:BATTLE' + ' ';
    // Day 147 reads both its fences (render and audio) out of one script's text, so those two share an element.
    var GROUPS = [['render', 'audio'], ['world'], ['battle'], ['story']];
    GROUPS.forEach(function (keys) {
      var text = keys.filter(function (k) { return T[k]; }).map(function (k) {
        return k === 'battle' ? T.battle.slice(0, T.battle.indexOf('*/\n') + 3) + BM + 'BEGIN ===\n' + T.battleFence + BM + 'END ===\n' : T[k];
      }).join('');
      if (!text) return;
      var el = document.createElement('script');
      el.type = 'text/plain';
      el.setAttribute('data-engine-text', keys.join('+'));
      el.appendChild(document.createTextNode(text));
      document.head.appendChild(el);
    });
  })();
  Studio.engineText = function (key) { return window.STUDIO_ENGINE_TEXT ? window.STUDIO_ENGINE_TEXT[key] || '' : ''; };

  // Each forge's own page carries demo fixtures (ART_DEMO, WORLD_DEMO, STORY_DEMO) that its Start and Dev tabs call. They are
  // not vendored, and the Studio ships none of them, so each is an empty set here: the loops that list fixtures draw nothing
  // and a stray call fails with a plain sentence. Projects start from the Studio's own list (Phase 2). The tests load each
  // forge's own fixture file over this stub, in the page, when they drive that forge.
  ['ART_DEMO', 'WORLD_DEMO', 'STORY_DEMO'].forEach(function (name) {
    if (window[name]) return;
    var none = function () { throw new Error('The Studio has no built in demo bundle. Start from a project instead.'); };
    window[name] = { FIXTURES: [], bundle: none, fixture: none, selfTest: function () { return []; } };
  });
})();
// === STUDIO:CORE END ===
