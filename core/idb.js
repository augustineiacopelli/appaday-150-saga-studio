// === STUDIO:STORE BEGIN ===
// Saga Studio, Day 150, Phase 2: one store. Replaces what backs Kit.store with IndexedDB (database saga-studio) and keeps a
// synchronous in memory mirror, so Kit's own get/set calls (all synchronous) keep working exactly as the four forges expect.
//
//   projects store   key = project id (kit.bundleId), value = the bundle as JSON text
//   meta store       'projects' = the project list [{id, title, updatedAt, stage, finals, size}],
//                    'current'  = the id of the project on screen,
//                    'kv:<key>' = every other Kit key the forges use (kit:ui, kit:slots, kit:suspend)
//
// Kit's keys map as follows. kit:draft is the project on screen (its id is the bundle's own id, so Kit.bundle.create, load and
// import need no change). kit:settings stays in localStorage on purpose: it holds the Claude key every AppADay app on this
// origin shares. Everything else is a kv entry.
//
// Writes are queued and coalesced per key (the last write wins), so Kit's debounced autosave costs one IndexedDB put per
// pause. Studio.store.flush() resolves when the queue is empty. When the browser has no IndexedDB (or refuses to open it) the
// same two stores live in localStorage under saga-studio: keys, and the page says so in the store banner if that fills up.
//
// Loaded after every forge, because Studio.begin insists Kit is in its saved state. Studio.store.install() puts it in place.
// Needs core/kit.js and core/studio.js. Plain ES5.
(function () {
  'use strict';
  var Kit = window.Kit, Studio = window.Studio;
  if (!Kit || !Studio) throw new Error('Studio store: core/kit.js and core/studio.js must load first.');
  var DB_NAME = 'saga-studio', PASS = { 'kit:settings': 1 };
  var mem = { projects: [], current: null, bundles: {}, kv: {} };   // bundles and kv hold JSON text
  var pending = {}, order = [], writing = null, backend = null, ready = null, failed = false, installed = false, saved = null;

  // ---------------------------------------------------------------- the two backends
  function idbBackend(factory) {
    var dbp = new Promise(function (resolve, reject) {
      var rq = factory.open(DB_NAME, 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('projects'); rq.result.createObjectStore('meta'); };
      rq.onsuccess = function () { resolve(rq.result); };
      rq.onerror = function () { reject(rq.error || new Error('IndexedDB would not open.')); };
      rq.onblocked = function () { reject(new Error('IndexedDB is blocked by another tab.')); };
    });
    function run(stores, mode, fn) {
      return dbp.then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(stores, mode), out = [];
          fn(function (s) { return tx.objectStore(s); }, out);
          tx.oncomplete = function () { resolve(out); };
          tx.onerror = tx.onabort = function () { reject(tx.error || new Error('IndexedDB write failed.')); };
        });
      });
    }
    return {
      kind: 'idb',
      read: function (store, keys) {
        return run([store], 'readonly', function (os, out) { keys.forEach(function (k, i) { os(store).get(k).onsuccess = function (e) { out[i] = e.target.result; }; }); }).then(function (o) { return o; });
      },
      all: function (store) {
        return run([store], 'readonly', function (os, out) { os(store).openCursor().onsuccess = function (e) { var c = e.target.result; if (c) { out.push([c.key, c.value]); c.continue(); } }; });
      },
      write: function (ops) {
        return run(['projects', 'meta'], 'readwrite', function (os) { ops.forEach(function (o) { if (o.del) os(o.store).delete(o.key); else os(o.store).put(o.value, o.key); }); });
      }
    };
  }
  function lsBackend() {
    var P = 'saga-studio:';
    function ls(fn) { return new Promise(function (resolve, reject) { try { resolve(fn()); } catch (e) { reject(e); } }); }
    return {
      kind: 'local',
      read: function (store, keys) { return ls(function () { return keys.map(function (k) { return localStorage.getItem(P + store + ':' + k); }); }); },
      all: function (store) {
        return ls(function () {
          var out = [], pre = P + store + ':', i, k;
          for (i = 0; i < localStorage.length; i++) { k = localStorage.key(i); if (k.indexOf(pre) === 0) out.push([k.slice(pre.length), localStorage.getItem(k)]); }
          return out;
        });
      },
      write: function (ops) { return ls(function () { ops.forEach(function (o) { if (o.del) localStorage.removeItem(P + o.store + ':' + o.key); else localStorage.setItem(P + o.store + ':' + o.key, o.value); }); }); }
    };
  }
  function pickBackend() {
    var f = null;
    try { f = window.indexedDB || null; } catch (e) {}
    if (!f) return Promise.resolve(lsBackend());
    var b = idbBackend(f);
    return b.read('meta', ['current']).then(function () { return b; }, function () { return lsBackend(); });
  }

  // ---------------------------------------------------------------- the write queue
  function banner(show) {
    failed = !!show;
    var el = typeof document !== 'undefined' && document.getElementById('storeBanner');
    if (el) el.hidden = !show;
  }
  function queue(store, key, value) {
    var id = store + '\u0000' + key;
    if (!pending[id]) order.push(id);
    pending[id] = { store: store, key: key, value: value, del: value === undefined };
    if (!writing) writing = Promise.resolve().then(drain);
  }
  function drain() {
    var ops = order.map(function (id) { return pending[id]; });
    pending = {}; order = [];
    if (!ops.length) { writing = null; return null; }
    return backend.write(ops).then(function () { banner(false); }, function (e) {
      banner(true);
      if (Kit.ui && Kit.ui.toast) Kit.ui.toast('Could not save to browser storage. Export your bundle now to keep your work.', 'error', 8000);
      console.warn('[Studio] store write failed', e);
    }).then(function () { writing = null; if (order.length) { writing = Promise.resolve().then(drain); return writing; } return null; });
  }
  function metaPut(key, v) { queue('meta', key, v); }
  function listPut() { metaPut('projects', JSON.stringify(mem.projects)); }

  // ---------------------------------------------------------------- the project list
  function entryFor(b, text) {
    var P = Studio.projects, pl = P && P.placement ? P.placement(b) : { stage: 'charter', finals: [] };
    return { id: b.kit.bundleId, title: b.kit.title, updatedAt: b.kit.updatedAt, stage: pl.stage, finals: pl.finals, size: text.length };
  }
  function setEntry(e) {
    var i = -1;
    mem.projects.forEach(function (p, n) { if (p.id === e.id) i = n; });
    if (i < 0) mem.projects.push(e); else mem.projects[i] = e;
    listPut();
  }

  // ---------------------------------------------------------------- Kit.store, rebuilt over the mirror
  function kvKey(key) { return 'kv:' + key; }
  var store = {
    get: function (key, fallback) {
      if (PASS[key]) return saved.get.apply(Kit.store, arguments);
      try {
        if (key === 'kit:draft') { var t = mem.current && mem.bundles[mem.current]; return t == null ? fallback : JSON.parse(t); }
        var s = mem.kv[key];
        return s == null ? fallback : JSON.parse(s);
      } catch (e) { return fallback; }
    },
    set: function (key, value) {
      if (PASS[key]) return saved.set.apply(Kit.store, arguments);
      var s;
      try { s = JSON.stringify(value); } catch (e) { return false; }
      if (key === 'kit:draft') {
        if (!value || !value.kit) return false;
        var id = value.kit.bundleId || 'draft';
        mem.bundles = {}; mem.bundles[id] = s;
        if (mem.current !== id) { mem.current = id; metaPut('current', id); }
        queue('projects', id, s);
        setEntry(entryFor(value, s));
        return true;
      }
      mem.kv[key] = s;
      metaPut(kvKey(key), s);
      return true;
    },
    del: function (key) {
      if (PASS[key]) return saved.del.apply(Kit.store, arguments);
      if (key === 'kit:draft') { mem.current = null; metaPut('current', undefined); return true; }
      delete mem.kv[key];
      metaPut(kvKey(key), undefined);
      return true;
    },
    usage: function () {
      var n = 0, k;
      Object.keys(mem.bundles).forEach(function (id) { n += mem.bundles[id].length; });
      for (k in mem.kv) if (Object.prototype.hasOwnProperty.call(mem.kv, k)) n += k.length + mem.kv[k].length;
      return n;
    },
    keys: function (prefix) {
      var out = Object.keys(mem.kv).filter(function (k) { return !prefix || k.indexOf(prefix) === 0; });
      if (mem.current && (!prefix || 'kit:draft'.indexOf(prefix) === 0)) out.push('kit:draft');
      return out.concat(saved.keys.call(Kit.store, prefix).filter(function (k) { return PASS[k]; }));
    },
    LIMIT_WARN: 5e7
  };

  // ---------------------------------------------------------------- the public face
  Studio.store = {
    DB: DB_NAME,
    backend: function () { return backend ? backend.kind : null; },
    failed: function () { return failed; },
    // Reads the project list, the current project id, the kv entries, and the current project's bundle into the mirror.
    ready: function () {
      if (ready) return ready;
      ready = pickBackend().then(function (b) {
        backend = b;
        return Promise.all([b.read('meta', ['projects', 'current']), b.all('meta')]);
      }).then(function (r) {
        var list = r[0][0], cur = r[0][1];
        try { mem.projects = typeof list === 'string' ? JSON.parse(list) : []; } catch (e) { mem.projects = []; }
        if (!Array.isArray(mem.projects)) mem.projects = [];
        mem.current = typeof cur === 'string' && cur ? cur : null;
        r[1].forEach(function (p) { if (p[0].indexOf('kv:') === 0 && typeof p[1] === 'string') mem.kv[p[0].slice(3)] = p[1]; });
        if (!mem.current) return null;
        return backend.read('projects', [mem.current]).then(function (v) { if (typeof v[0] === 'string') mem.bundles[mem.current] = v[0]; else mem.current = null; });
      }).then(function () {
        try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
        return Studio.store;
      });
      return ready;
    },
    // Swaps Kit.store over to the mirror. Call once, after every forge has loaded.
    install: function () {
      if (installed) return;
      saved = { get: Kit.store.get, set: Kit.store.set, del: Kit.store.del, keys: Kit.store.keys, usage: Kit.store.usage };
      Kit.store.get = store.get; Kit.store.set = store.set; Kit.store.del = store.del;
      Kit.store.usage = store.usage; Kit.store.keys = store.keys; Kit.store.LIMIT_WARN = store.LIMIT_WARN;
      installed = true;
    },
    installed: function () { return installed; },
    // Resolves when every queued write has reached the backend.
    flush: function () {
      return (writing || Promise.resolve()).then(function () { return writing ? Studio.store.flush() : null; });
    },
    list: function () { return mem.projects.slice().sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); }); },
    currentId: function () { return mem.current; },
    has: function (id) { return mem.projects.some(function (p) { return p.id === id; }); },
    // One project's bundle, read from the backend (the one on screen comes from the mirror).
    read: function (id) {
      if (mem.bundles[id]) return Promise.resolve(JSON.parse(mem.bundles[id]));
      return backend.read('projects', [id]).then(function (v) {
        if (typeof v[0] !== 'string') throw new Error('That project is not in this browser any more.');
        return JSON.parse(v[0]);
      });
    },
    // Writes a bundle as a project of its own without making it the one on screen (duplicate, leftover drafts).
    put: function (b) {
      var s = JSON.stringify(b);
      queue('projects', b.kit.bundleId, s);
      setEntry(entryFor(b, s));
      return b.kit.bundleId;
    },
    remove: function (id) {
      mem.projects = mem.projects.filter(function (p) { return p.id !== id; });
      delete mem.bundles[id];
      if (mem.current === id) { mem.current = null; metaPut('current', undefined); }
      queue('projects', id, undefined);
      listPut();
    },
    // Test aid: forget the mirror and reread the backend, as a fresh page load would.
    _reset: function () { mem = { projects: [], current: null, bundles: {}, kv: {} }; ready = null; return Studio.store.ready(); }
  };
})();
// === STUDIO:STORE END ===
