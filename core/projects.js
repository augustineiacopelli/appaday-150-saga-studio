// === STUDIO:PROJECTS BEGIN ===
// Saga Studio, Day 150, Phase 2: one import, one project list.
//
// The four forges each refuse a bundle that has not reached them (Day 148 wants a Day 147 art pass, Day 149 wants a Day 148
// Final), so on their own pages an import is a gate. In the Studio the gate moves to the pipeline (Phase 3), and the import
// takes any Saga bundle: it is migrated by Kit, placed at the furthest stage whose Final is present (kit.forges '146' to
// '149'), and kept as a project of its own beside the others. Every export still writes kit.forges['14N'] exactly as the
// forge does, because the stage on screen supplies its own export function, so a Studio bundle opens in the old forges.
//
// Needs core/studio.js and core/idb.js. Plain ES5.
(function () {
  'use strict';
  var Kit = window.Kit, Studio = window.Studio, U = Kit.util;
  if (!Studio || !Studio.store) throw new Error('Studio projects: core/idb.js must load first.');
  var P = Studio.projects = {};
  var DAY = { charter: '146', art: '147', world: '148', story: '149' };

  // ---------------------------------------------------------------- placement
  // The furthest stage whose Final export is present in the bundle, and every stage that has one. A bundle with no Final
  // belongs to the Charter stage, where every project starts.
  P.placement = function (b) {
    var forges = b && b.kit && U.isObj(b.kit.forges) ? b.kit.forges : {}, finals = [];
    Studio.STAGES.forEach(function (s) { var f = forges[DAY[s.id]]; if (U.isObj(f) && f.status === 'final') finals.push(s.id); });
    return { stage: finals.length ? finals[finals.length - 1] : 'charter', finals: finals };
  };
  function stageLabel(id) { var s = Studio.stages[id]; return s ? s.label : id; }

  // ---------------------------------------------------------------- loading a bundle
  // Puts a migrated bundle on screen. The placement stage is made the stage on screen first, so Kit's load event reaches that
  // stage's handlers (and the stages the bundle already carries), and a bundle that has not reached a stage is never given
  // that stage's namespace. The working project is flushed first, because Kit cancels a pending autosave on a load.
  // Kit re-renders the active tab when a bundle loads, and a forge's tab fills its own namespace as it draws (its ensure pass).
  // So the active tab is first moved to the Charter's own (which touches charter, codex and rules only), and the bundle that
  // loads is never drawn by a stage it has not reached. The new stage's tab is shown by Studio.show after the load.
  function neutral() { if (Studio.stages.charter.loaded) Kit.go('charter.charter', { silent: true }); }
  P.load = function (b, stageId) {
    if (Kit.bundle.current()) Kit.bundle.flush();
    neutral();
    if (stageId && Studio.preselect) Studio.preselect(stageId);
    Kit.bundle.load(b);
    return b;
  };

  // ---------------------------------------------------------------- the one importer
  // Returns {bundle, hash, storedHash, matches, placement, replaced}. opts.asCopy files the bundle under a new project id.
  // Throws a sentence a person can read when the text is not a Saga bundle.
  P.importText = function (text, opts) {
    opts = opts || {};
    var b;
    try { b = JSON.parse(text); } catch (e) { throw new Error('That file is not valid JSON.'); }
    Kit.bundle.migrate(b);
    var hash = Kit.bundle.hash(b), stored = b.kit.contentHash || '', matches = !stored || stored === hash;
    var replaced = !opts.asCopy && Studio.store.has(b.kit.bundleId);
    if (opts.asCopy) { b.kit.bundleId = 'bnd_' + U.rand36(12); b.kit.title = b.kit.title + ' (copy)'; b.kit.contentHash = ''; }
    var placement = P.placement(b);
    P.load(b, placement.stage);
    return { bundle: b, hash: hash, storedHash: stored, matches: matches, placement: placement, replaced: replaced };
  };
  function choose(o) {
    return new Promise(function (resolve) {
      Kit.ui.dialog({
        title: o.title,
        body: function (b) { var p = U.el('p'); p.textContent = o.message; b.appendChild(p); },
        actions: o.actions,
        onResult: function (v) { resolve(v === undefined ? 'cancel' : v); }
      });
    });
  }
  // The Import button and the file picker: the same importer, with one question when the file is a project already here.
  P.importPicked = function (file) {
    if (!file) return Promise.resolve(null);
    return U.readFile(file).then(function (text) {
      var probe;
      try { probe = JSON.parse(text); } catch (e) { Kit.ui.toast('That file is not valid JSON.', 'error', 7000); return null; }
      try { Kit.bundle.migrate(probe); } catch (e) { Kit.ui.toast(e.message, 'error', 7000); return null; }
      var ask = Studio.store.has(probe.kit.bundleId)
        ? choose({
          title: 'This project is already here',
          message: '"' + probe.kit.title + '" is already in this browser. Replace it with the file, or keep both?',
          actions: [{ label: 'Cancel', kind: 'ghost', value: 'cancel' }, { label: 'Keep both', value: 'copy' }, { label: 'Replace', kind: 'primary', value: 'replace' }]
        })
        : Promise.resolve('new');
      return ask.then(function (c) {
        if (c === 'cancel') return null;
        try {
          var r = P.importText(text, { asCopy: c === 'copy' });
          Kit.ui.toast('Imported "' + r.bundle.kit.title + '" at the ' + stageLabel(r.placement.stage) + ' stage. ' + (r.matches ? 'Content hash verified.' : 'The content hash does not match, so the file was edited outside the Studio.'), r.matches ? 'ok' : 'warn', r.matches ? 3200 : 8000);
          if (Studio.show) Studio.show(r.placement.stage);
          return r;
        } catch (e) { Kit.ui.toast(e.message, 'error', 7000); return null; }
      });
    });
  };

  // ---------------------------------------------------------------- export: the stage on screen exports as its forge does
  // Each forge replaced Kit.buildExport and Kit.openExport with its own (its own checks, its own files, its own
  // kit.forges entry). Studio.end kept them on the stage; these two pass the call to the stage on screen.
  function stageKit() { var st = Studio.stages[Studio.stage]; return (st && st.kit) || {}; }
  P.buildExport = function () { return (stageKit().buildExport || Studio.base.buildExport).apply(Kit, arguments); };
  P.openExport = function () { return (stageKit().openExport || Studio.base.openExport).apply(Kit, arguments); };

  // Replaces the three Kit functions the forges each replaced, once, after every forge has loaded. Studio.native (tests of the
  // forges' own phase suites) leaves each forge's own in place instead, so this is not called then.
  P.install = function () {
    Kit.bundle.importText = function (text) { return P.importText(text); };
    Kit.importPicked = P.importPicked;
    Kit.buildExport = P.buildExport;
    Kit.openExport = P.openExport;
  };

  // ---------------------------------------------------------------- the project list
  P.list = function () { return Studio.store.list(); };
  P.open = function (id) {
    Kit.bundle.flush();
    return Studio.store.flush().then(function () { return Studio.store.read(id); }).then(function (b) {
      Kit.bundle.migrate(b);
      var pl = P.placement(b);
      P.load(b, pl.stage);
      if (Studio.show) Studio.show(pl.stage);
      return b;
    });
  };
  P.create = function (title) {
    if (Kit.bundle.current()) Kit.bundle.flush();
    neutral();
    if (Studio.preselect) Studio.preselect('charter');
    var b = Kit.bundle.create(title || 'Untitled Saga');
    if (Studio.show) Studio.show('charter');
    return b;
  };
  P.duplicate = function (id) {
    Kit.bundle.flush();
    return Studio.store.flush().then(function () { return Studio.store.read(id); }).then(function (b) {
      b.kit.bundleId = 'bnd_' + U.rand36(12); b.kit.title = b.kit.title + ' (copy)'; b.kit.contentHash = ''; b.kit.updatedAt = U.now();
      Studio.store.put(b);
      return b;
    });
  };
  // Deleting the project on screen opens the most recent other one, or starts an empty one.
  P.remove = function (id) {
    var wasCurrent = Studio.store.currentId() === id || (Kit.bundle.current() && Kit.bundle.current().kit.bundleId === id);
    Studio.store.remove(id);
    if (!wasCurrent) return Promise.resolve(null);
    var next = Studio.store.list()[0];
    return next ? P.open(next.id) : Promise.resolve(P.create('Untitled Saga'));
  };

  // ---------------------------------------------------------------- drafts the forges left behind
  // On their own pages the forges keep a working draft under art147:draft, world148:draft and story149:draft (in
  // localStorage, or in their own IndexedDB database when localStorage was full: appaday-147, -148, -149, store kv). Day 146
  // and the Studio's Phase 1 used kit:draft. Nothing is moved or deleted; each one is offered, and added as a project of its
  // own on request.
  var SOURCES = [
    { day: '146', label: 'Day 146 or Studio draft', key: 'kit:draft', db: null },
    { day: '147', label: 'Day 147 draft', key: 'art147:draft', db: 'appaday-147' },
    { day: '148', label: 'Day 148 draft', key: 'world148:draft', db: 'appaday-148' },
    { day: '149', label: 'Day 149 draft', key: 'story149:draft', db: 'appaday-149' }
  ];
  function lsText(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function idbText(db, key) {
    return new Promise(function (resolve) {
      var f = null;
      try { f = window.indexedDB || null; } catch (e) {}
      if (!f) return resolve(null);
      var rq;
      try { rq = f.open(db, 1); } catch (e) { return resolve(null); }
      // Opening a database that does not exist must not create one: abort the upgrade.
      rq.onupgradeneeded = function () { try { rq.transaction.abort(); } catch (e) {} };
      rq.onerror = function () { resolve(null); };
      rq.onsuccess = function () {
        var d = rq.result;
        try {
          var tx = d.transaction('kv', 'readonly'), g = tx.objectStore('kv').get(key), out = null;
          g.onsuccess = function () { out = typeof g.result === 'string' ? g.result : null; };
          tx.oncomplete = function () { d.close(); resolve(out); };
          tx.onerror = tx.onabort = function () { d.close(); resolve(null); };
        } catch (e) { try { d.close(); } catch (x) {} resolve(null); }
      };
    });
  }
  // Resolves to [{day, label, key, where, title, size, updatedAt, id, stage, existing, bundle}] for every draft that is a
  // readable Saga bundle. A draft whose project id is already in the list is marked existing.
  P.leftovers = function () {
    return Promise.all(SOURCES.map(function (s) {
      var t = lsText(s.key), where = 'localStorage';
      var got = t != null ? Promise.resolve(t) : (s.db ? idbText(s.db, s.key) : Promise.resolve(null));
      return got.then(function (text) {
        if (text == null) return null;
        if (t == null) where = 'IndexedDB ' + s.db;
        var b;
        try { b = JSON.parse(text); Kit.bundle.migrate(b); } catch (e) { return null; }
        var pl = P.placement(b);
        return { day: s.day, label: s.label, key: s.key, where: where, title: b.kit.title, size: text.length, updatedAt: b.kit.updatedAt, id: b.kit.bundleId, stage: pl.stage, existing: Studio.store.has(b.kit.bundleId), bundle: b };
      });
    })).then(function (all) {
      // The same bundle can sit under two keys (the Studio's Phase 1 draft and Day 146's); show it once.
      var seen = {};
      return all.filter(function (x) { if (!x || seen[x.id + '|' + x.updatedAt]) return false; seen[x.id + '|' + x.updatedAt] = 1; return true; });
    });
  };
  P.adopt = function (left) {
    if (!left || !left.bundle) throw new Error('Nothing to add.');
    var b = U.clone(left.bundle);
    if (Studio.store.has(b.kit.bundleId)) { b.kit.bundleId = 'bnd_' + U.rand36(12); b.kit.title = b.kit.title + ' (' + left.day + ' draft)'; b.kit.contentHash = ''; }
    return Studio.store.put(b);
  };

  // ---------------------------------------------------------------- the project list dialog
  P.openList = function () {
    var handle = Kit.ui.dialog({
      title: 'Projects',
      wide: true,
      className: 'proj-dialog',
      body: function (body, h) {
        var listEl = U.el('div', 'proj-list'), leftEl = U.el('div', 'proj-left');
        var intro = U.el('p', 'muted');
        intro.textContent = 'Every project lives in this browser (IndexedDB) and autosaves. A project opens at the furthest stage whose Final export it carries.';
        body.appendChild(intro); body.appendChild(listEl); body.appendChild(leftEl);
        function paint() {
          U.clear(listEl);
          var cur = Studio.store.currentId(), list = Studio.store.list();
          if (!list.length) listEl.appendChild(U.el('p', 'muted', 'No projects yet. Start one, or import a bundle.'));
          list.forEach(function (p) {
            var row = U.el('div', 'slot-row proj-row'), info = U.el('div', 'slot-info');
            info.innerHTML = '<strong>' + U.esc(p.title) + (p.id === cur ? ' <span class="chip chip-ok">open</span>' : '') + '</strong><small>' + U.esc(stageLabel(p.stage)) + ' &middot; ' + U.esc(U.fmtDate(p.updatedAt)) + ' &middot; ' + U.esc(U.fmtSize(p.size)) + '</small>';
            row.appendChild(info);
            var btns = U.el('div', 'btn-row');
            if (p.id !== cur) {
              var op = U.el('button', 'btn btn-primary', '<span>Open</span>'); op.type = 'button';
              op.addEventListener('click', function () { P.open(p.id).then(function () { h.close(); }, function (e) { Kit.ui.toast(e.message, 'error', 6000); }); });
              btns.appendChild(op);
            }
            var du = U.el('button', 'btn', '<span>Duplicate</span>'); du.type = 'button';
            du.addEventListener('click', function () { P.duplicate(p.id).then(function (b) { Kit.ui.toast('Added "' + b.kit.title + '".', 'ok'); paint(); }, function (e) { Kit.ui.toast(e.message, 'error', 6000); }); });
            var dl = U.el('button', 'btn btn-danger btn-icon', Kit.icon('trash')); dl.type = 'button'; dl.setAttribute('aria-label', 'Delete ' + p.title); dl.title = 'Delete project';
            dl.addEventListener('click', function () {
              Kit.ui.confirm({ title: 'Delete this project?', message: '"' + p.title + '" will be permanently removed from this browser. Export it first if you want to keep it.', okLabel: 'Delete', danger: true }).then(function (ok) {
                if (!ok) return null;
                return P.remove(p.id).then(function () { paint(); });
              });
            });
            btns.appendChild(du); btns.appendChild(dl);
            row.appendChild(btns);
            listEl.appendChild(row);
          });
        }
        paint();
        P.leftovers().then(function (found) {
          var todo = found.filter(function (x) { return !x.existing; });
          if (!todo.length) return;
          leftEl.appendChild(U.el('h3', 'section-h', 'Drafts the forges left in this browser'));
          leftEl.appendChild(U.el('p', 'muted', 'Found from earlier work in Days 146 to 149. Adding one makes it a project here; the original is left where it is.'));
          todo.forEach(function (x) {
            var row = U.el('div', 'slot-row proj-row'), info = U.el('div', 'slot-info');
            info.innerHTML = '<strong>' + U.esc(x.title) + '</strong><small>' + U.esc(x.label) + ' &middot; ' + U.esc(stageLabel(x.stage)) + ' &middot; ' + U.esc(U.fmtSize(x.size)) + ' &middot; in ' + U.esc(x.where) + '</small>';
            row.appendChild(info);
            var btns = U.el('div', 'btn-row'), ad = U.el('button', 'btn', Kit.icon('plus') + '<span>Add</span>'); ad.type = 'button';
            ad.addEventListener('click', function () { P.adopt(x); Kit.ui.toast('Added "' + x.title + '".', 'ok'); row.parentNode.removeChild(row); paint(); });
            btns.appendChild(ad); row.appendChild(btns); leftEl.appendChild(row);
          });
        });
      },
      actions: [
        { label: 'New project', kind: 'ghost', icon: 'plus', onClick: function (h) {
          Kit.ui.prompt({ title: 'New project', label: 'Project title', value: 'Untitled Saga', okLabel: 'Create' }).then(function (t) {
            if (t == null) return;
            P.create(t.trim() || 'Untitled Saga');
            Kit.ui.toast('New project created.', 'ok');
            h.close();
          });
          return false;
        } },
        { label: 'Import a file', kind: 'ghost', icon: 'import', onClick: function (h) { var f = document.getElementById('fileImport'); if (f) { f.value = ''; f.click(); } h.close(); return false; } },
        { label: 'Close', value: null }
      ]
    });
    return handle;
  };
})();
// === STUDIO:PROJECTS END ===
