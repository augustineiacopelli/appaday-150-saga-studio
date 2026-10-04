// === STUDIO:UNRESOLVED BEGIN ===
// Saga Studio, Day 150, Phase 3: the unresolved references drawer.
//
// One list of what still stands between the project and a finished game, on screen whichever stage you are in. It gathers:
//   Kit.validate        the whole bundle, including every validator a reached stage registered (a stage is reached once the
//                       bundle carries its namespace, so a stage the project has not got to adds nothing);
//   each stage's checks Day 147's coverage, Day 148's Final gate (a stale world), Day 149's six story checks. The story walk is
//                       expensive, so it is read only when it has already been run on this story; a one line note and a
//                       button offer to run it otherwise.
// and groups what it finds by bundle namespace. It keeps the FORWARD versus BROKEN rule the forges already use: a reference to a
// stage that has not opened its namespace (kit.opened) is FORWARD, owed and legal, and is listed apart under the stage that owes
// it, so a project in the middle of the pipeline never meets a wall of false errors. The moment the owing stage opens, the same
// reference is BROKEN if its record is missing, and counts. Every finding that names a record jumps with Kit.jump, which the
// pipeline retargets to switch to the owning stage first.
//
// Blocking means errors and broken references. Warnings and owed references are shown but never block. summary().empty is the
// condition Phase 6 will ask of Build game: nothing blocking and nothing owed.
// Needs core/pipeline.js. Plain ES5.
(function () {
  'use strict';
  var Kit = window.Kit, Studio = window.Studio, U = Kit.util, P = Studio.pipeline;
  if (!P) throw new Error('Studio unresolved: core/pipeline.js must load first.');
  var X = Studio.unresolved = {};
  var NS_ORDER = ['charter', 'codex', 'rules', 'art', 'world', 'story', 'bundle'];
  var NS_LABEL = { charter: 'Charter', codex: 'Codex', rules: 'Rules', art: 'Art and Audio', world: 'World', story: 'Story', bundle: 'Bundle' };
  var CAP = 40, OWED_CAP = 60;

  function bundle() { return Kit.bundle.current(); }
  // The namespace a finding belongs to: its record's prefix says it, else the namespace's own name (world, story and art name
  // themselves as the record of a whole-namespace finding), else the validator that raised it (world.refs), else the bundle.
  function nsOf(rid, path) {
    rid = typeof rid === 'string' ? rid : '';
    var p = Kit.ids.prefixOf(rid), info = p ? Kit.codex.prefixInfo(p) : null;
    if (info) return info.ns;
    if (rid !== 'bundle' && NS_ORDER.indexOf(rid) >= 0) return rid;
    var m = /^(art|world|story|charter|codex|rules)\b/.exec(String(path || ''));
    return m ? m[1] : 'bundle';
  }
  function stageOfNs(ns) { return ns === 'art' || ns === 'world' || ns === 'story' ? ns : ns === 'bundle' ? null : 'charter'; }
  function hasTab(stage, tab) { var st = Studio.stages[stage]; return !!(st && tab && st.mounts.indexOf(tab) >= 0); }

  // ---------------------------------------------------------------- collecting
  var memo = { key: null, last: null, out: null };
  // Returns {findings, groups, owed, notes, counts}. opts.fresh revalidates; opts.runStory runs the story checks if they have not
  // been run on this story.
  X.collect = function (b, opts) {
    opts = opts || {};
    b = b || bundle();
    var out = { findings: [], groups: [], owed: [], notes: [], counts: { error: 0, broken: 0, warning: 0, forward: 0, blocking: 0 } };
    if (!b) return out;
    var cur = b === bundle();
    if (opts.fresh && cur) Kit.refreshValidation();
    var res = cur && Kit.validate.last && !opts.fresh ? Kit.validate.last : Kit.validate(b);
    var key = cur ? Kit.index(b) : null;
    if (cur && !opts.runStory && memo.key === key && memo.last === res && memo.stage === Studio.stage) return memo.out;
    var seen = {};
    function add(level, it, source, stageHint, extra) {
      var rid = it.recordId || '';
      var f = { level: level, message: String(it.message || ''), recordId: rid, fieldPath: it.fieldPath || '', id: it.id || '', owedBy: it.owedBy || null, source: source, code: it.code || null, tab: it.tab || null };
      if (extra) Object.keys(extra).forEach(function (k) { f[k] = extra[k]; });
      f.ns = nsOf(rid, f.fieldPath) === 'bundle' && stageHint && stageHint !== 'charter' ? stageHint : nsOf(rid, f.fieldPath);
      f.stage = P.stageOfRecord(rid) || stageHint || stageOfNs(f.ns);
      f.jumpable = !!rid && NS_ORDER.indexOf(rid) < 0 && rid.charAt(0) !== '(' && !!Kit.jump.can(rid);
      var k = level + '|' + rid + '|' + f.fieldPath + '|' + f.message;
      if (seen[k]) return;
      seen[k] = true;
      out.findings.push(f);
    }
    res.errors.forEach(function (it) { add('error', it, 'validate'); });
    res.broken.forEach(function (it) { add('broken', it, 'validate'); });
    res.warnings.forEach(function (it) { add('warning', it, 'validate'); });
    res.forward.forEach(function (it) { add('forward', it, 'validate'); });

    // Each reached stage's own checks.
    var A = Studio.stages.art.api, W = Studio.stages.world.api, S = Studio.stages.story.api;
    if (Studio.live('art', b) && A && A.coverage && typeof A.coverage.compute === 'function') {
      try {
        A.coverage.compute(b).gaps.forEach(function (g) {
          var tab = g.fix && g.fix.tab;
          add('warning', { message: 'Art coverage: ' + g.label + ' is missing' + (g.detail ? ' (' + g.detail + ')' : '') + '.', recordId: 'art', fieldPath: g.key, tab: hasTab('art', tab) ? tab : null }, 'check', 'art', { code: 'coverage' });
        });
      } catch (e) { out.notes.push({ stage: 'art', kind: 'failed', message: 'The art coverage check could not run: ' + e.message }); }
    }
    if (Studio.live('world', b) && W && W.checks && typeof W.checks.finalBlock === 'function') {
      try {
        var why = W.checks.finalBlock(b);
        if (why) {
          var m = /on the (\w+) tab/.exec(why), t = m ? m[1].toLowerCase() : null;
          add('error', { message: why.replace(/^Final export is blocked: /, ''), recordId: 'world', fieldPath: 'generation', tab: hasTab('world', t) ? t : null }, 'check', 'world', { code: 'world-stale' });
        }
      } catch (e2) { out.notes.push({ stage: 'world', kind: 'failed', message: 'The world checks could not run: ' + e2.message }); }
    }
    if (Studio.live('story', b) && S && S.checks && typeof S.checks.run === 'function') {
      var ready = Studio.readiness('story', b);
      if (ready !== true) add('error', { message: 'The story cannot be checked: ' + ready, recordId: 'story', fieldPath: 'readiness' }, 'check', 'story', { code: 'not-ready' });
      else if (S.checks.ready(b) || opts.runStory) {
        try {
          S.checks.run(b).cards.forEach(function (c) {
            c.items.forEach(function (it) {
              add(it.level === 'error' ? 'error' : 'warning', { message: it.message, recordId: it.recordId || 'story', fieldPath: it.fieldPath || it.code || c.key, code: it.code, tab: hasTab('story', it.tab) ? it.tab : null }, 'check', 'story', { card: c.title });
            });
          });
        } catch (e3) { out.notes.push({ stage: 'story', kind: 'failed', message: 'The story checks could not run: ' + e3.message }); }
      } else out.notes.push({ stage: 'story', kind: 'pending', message: 'The story checks have not been run on the story as it is now.', action: 'runStory' });
    }

    // Counts, groups by namespace, and the owed references apart.
    var by = {};
    out.findings.forEach(function (f) {
      if (f.level === 'forward') { out.counts.forward++; out.owed.push(f); return; }
      out.counts[f.level]++;
      (by[f.ns] = by[f.ns] || []).push(f);
    });
    out.counts.blocking = out.counts.error + out.counts.broken;
    NS_ORDER.forEach(function (ns) {
      if (!by[ns]) return;
      var items = by[ns].slice().sort(function (a, c) { return (a.level === c.level ? 0 : a.level === 'warning' ? 1 : c.level === 'warning' ? -1 : 0); });
      out.groups.push({ ns: ns, label: NS_LABEL[ns], stage: stageOfNs(ns), items: items, blocking: items.filter(function (f) { return f.level !== 'warning'; }).length, warnings: items.filter(function (f) { return f.level === 'warning'; }).length });
    });
    if (cur) memo = { key: key, last: res, out: out, stage: Studio.stage };
    return out;
  };

  // empty is Phase 6's condition for Build game: nothing blocking, nothing owed, and every stage check actually run (a check that
  // has not run is not a check that passed).
  X.summary = function (b) {
    var o = X.collect(b), c = o.counts;
    var pending = o.notes.filter(function (n) { return n.kind === 'pending'; }).length, failed = o.notes.filter(function (n) { return n.kind === 'failed'; }).length;
    return { error: c.error, broken: c.broken, blocking: c.blocking, warning: c.warning, owed: c.forward, pending: pending, failed: failed, empty: c.blocking === 0 && c.forward === 0 && !pending && !failed };
  };
  X.isEmpty = function (b) { return X.summary(b).empty; };

  // ---------------------------------------------------------------- jumping
  X.jump = function (f) {
    if (f.jumpable) return Kit.jump(f.recordId, f.fieldPath);
    var stage = f.stage || Studio.stage, why = P.lockReason(stage);
    if (why) { Kit.ui.toast(P.LABEL[stage] + ' is locked. ' + why, 'warn', 5000); return false; }
    return Studio.show(stage, f.tab || undefined);
  };
  X.runStoryChecks = function () {
    Kit.ui.busy.show('Running the story checks...');
    return new Promise(function (resolve) {
      setTimeout(function () {
        try { X.collect(bundle(), { runStory: true }); } catch (e) { Kit.ui.toast('The story checks failed: ' + e.message, 'error', 7000); }
        Kit.ui.busy.hide();
        X.paint(); X.paintBadge();
        resolve(X.summary());
      }, 20);
    });
  };

  // ---------------------------------------------------------------- the badge
  X.paintBadge = function () {
    var btn = document.getElementById('btnUnresolved');
    if (!btn) return;
    var s = X.summary(), html = '<span class="vlabel">Unresolved</span>';
    if (s.blocking) html += '<span class="chip chip-error" title="Errors and broken references">' + s.blocking + ' to fix</span>';
    if (s.owed) html += '<span class="chip chip-forward" title="References owed by a later stage">' + s.owed + ' owed</span>';
    if (s.warning) html += '<span class="chip chip-warning" title="Warnings">' + s.warning + ' warn</span>';
    if (s.pending || s.failed) html += '<span class="chip chip-warning" title="Some stage checks have not run">' + (s.pending + s.failed) + ' unchecked</span>';
    if (s.empty) html += '<span class="chip chip-ok">' + Kit.icon('check') + 'Clear</span>';
    btn.innerHTML = html;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-controls', 'unresolved');
    btn.setAttribute('aria-label', 'Unresolved: ' + s.blocking + ' to fix, ' + s.owed + ' owed by later stages, ' + s.warning + ' warnings' + (s.pending ? ', story checks not run' : '') + '. ' + (open ? 'Close' : 'Open') + ' the list.');
    btn.title = open ? 'Close the unresolved list' : 'Open the unresolved list';
  };

  // ---------------------------------------------------------------- the dock
  var dock = null, open = false, expanded = {};
  function nameOf(rid) {
    try { var e = Kit.index().byId[rid]; if (e && e.name) return e.name; } catch (e2) {}
    return rid;
  }
  function chip(level, text) { return '<span class="chip chip-' + level + '">' + U.esc(text) + '</span>'; }
  function row(f) {
    var r = U.el('div', 'uitem');
    var name = f.recordId && f.jumpable ? nameOf(f.recordId) : (f.card || (f.source === 'check' ? 'Check' : ''));
    r.innerHTML = chip(f.level === 'broken' ? 'broken' : f.level === 'error' ? 'error' : f.level === 'forward' ? 'forward' : 'warning', f.level === 'warning' ? 'warn' : f.level) +
      '<div class="umsg">' + (name ? '<strong>' + U.esc(name) + '</strong> ' : '') + (f.recordId && f.jumpable ? '<code class="id">' + U.esc(f.recordId) + '</code> ' : '') +
      (f.fieldPath && f.jumpable ? '<code>' + U.esc(f.fieldPath) + '</code>' : '') + '<div>' + U.esc(f.message) + '</div></div>';
    var b = U.el('button', 'btn btn-ghost ujump', Kit.icon('jump') + '<span class="lbl">' + (f.jumpable ? 'Jump' : 'Open') + '</span>');
    b.type = 'button';
    b.setAttribute('aria-label', (f.jumpable ? 'Jump to ' + (name || f.recordId) : 'Open the ' + P.LABEL[f.stage || Studio.stage] + ' stage') + ': ' + f.message);
    b.addEventListener('click', function () { X.jump(f); });
    r.appendChild(b);
    return r;
  }
  function paintDock() {
    if (!dock || !open) return;
    var o = X.collect(bundle()), s = X.summary(), host = dock.querySelector('.dock-body');
    var scroll = host.scrollTop;
    U.clear(host);
    var sum = U.el('div', 'vsummary');
    sum.innerHTML = chip('error', s.error + ' errors') + chip('broken', s.broken + ' broken') + chip('forward', s.owed + ' owed') + chip('warning', s.warning + ' warnings');
    host.appendChild(sum);
    host.appendChild(U.el('p', 'muted', 'Errors and broken references block Build game. Owed references wait on a stage that has not opened yet, so they are not errors until it does. Warnings never block.'));
    o.notes.forEach(function (n) {
      var d = U.el('div', 'unote msg msg-' + (n.kind === 'failed' ? 'error' : 'warning'));
      d.appendChild(U.el('span', null, U.esc(n.message)));
      if (n.action === 'runStory') {
        var rb = U.el('button', 'btn', Kit.icon('check') + '<span>Run story checks</span>'); rb.type = 'button';
        rb.addEventListener('click', function () { X.runStoryChecks(); });
        d.appendChild(rb);
      }
      host.appendChild(d);
    });
    if (s.empty && !o.groups.length) host.appendChild(U.el('div', 'panel stub', '<div class="stub-glyph">' + Kit.icon('check') + '</div><h2>Nothing unresolved</h2><p>Every reference the project holds resolves, and no stage check is failing.</p>'));
    o.groups.forEach(function (g) {
      var sec = U.el('section', 'ugroup');
      sec.appendChild(U.el('h3', 'section-h', U.esc(g.label) + ' ' + (g.blocking ? chip('error', g.blocking + ' to fix') : '') + (g.warnings ? chip('warning', g.warnings + ' warn') : '')));
      var items = expanded[g.ns] ? g.items : g.items.slice(0, CAP);
      items.forEach(function (f) { sec.appendChild(row(f)); });
      if (g.items.length > items.length) {
        var more = U.el('button', 'btn btn-ghost', 'Show all ' + g.items.length); more.type = 'button';
        more.addEventListener('click', function () { expanded[g.ns] = true; paintDock(); });
        sec.appendChild(more);
      }
      host.appendChild(sec);
    });
    if (o.owed.length) {
      var det = U.el('details', 'uowed');
      det.open = !!expanded.__owed;
      det.appendChild(U.el('summary', null, 'Owed to later stages (' + o.owed.length + ')'));
      var byForge = {};
      o.owed.forEach(function (f) { (byForge[f.owedBy || '?'] = byForge[f.owedBy || '?'] || []).push(f); });
      Object.keys(byForge).sort().forEach(function (k) {
        var stage = k === '147' ? 'art' : k === '148' ? 'world' : k === '149' ? 'story' : null;
        det.appendChild(U.el('h4', 'section-h', 'Owed by ' + (stage ? P.LABEL[stage] + ' (Day ' + k + ')' : 'forge ' + k) + ' ' + chip('forward', String(byForge[k].length))));
        byForge[k].slice(0, expanded.__owedAll ? 1e9 : OWED_CAP).forEach(function (f) {
          var r = U.el('div', 'uitem');
          r.innerHTML = chip('forward', 'owed') + '<div class="umsg"><code>' + U.esc(f.id || '') + '</code> from <strong>' + U.esc(nameOf(f.recordId)) + '</strong> <code>' + U.esc(f.fieldPath) + '</code></div>';
          det.appendChild(r);
        });
        if (byForge[k].length > OWED_CAP && !expanded.__owedAll) {
          var mb = U.el('button', 'btn btn-ghost', 'Show all ' + byForge[k].length); mb.type = 'button';
          mb.addEventListener('click', function () { expanded.__owedAll = true; expanded.__owed = true; paintDock(); });
          det.appendChild(mb);
        }
      });
      det.addEventListener('toggle', function () { expanded.__owed = det.open; });
      host.appendChild(det);
    }
    host.scrollTop = scroll;
  }
  var paintSoon = U.debounce(function () { X.paint(); X.paintBadge(); }, 250);
  X.paint = function () { paintDock(); };

  X.isOpen = function () { return open; };
  X.open = function () {
    if (!dock) return false;
    open = true; dock.hidden = false;
    document.body.setAttribute('data-dock', 'open');
    try { Kit.uiState.set({ dock: true }); } catch (e) {}
    paintDock(); X.paintBadge();
    return true;
  };
  X.close = function () {
    if (!dock) return false;
    open = false; dock.hidden = true;
    document.body.removeAttribute('data-dock');
    try { Kit.uiState.set({ dock: false }); } catch (e) {}
    X.paintBadge();
    return true;
  };
  X.toggle = function () { return open ? X.close() : X.open(); };

  // Called once from studio-boot, after the shell's elements exist.
  // The saved open state lives in the project store, which is not ready when the shell first installs the dock, so the
  // boot calls this once the project is restored.
  X.restore = function () {
    var ui = {};
    try { ui = Kit.uiState.get() || {}; } catch (e) {}
    if (ui.dock && dock && dock.hidden) X.open();
  };
  X.install = function () {
    if (X.installed) return;
    X.installed = true;
    dock = document.getElementById('unresolved');
    if (dock) {
      dock.innerHTML = '<div class="dock-head"><h2 class="dock-title">Unresolved</h2><button class="btn btn-ghost" type="button" id="btnRecheck" title="Validate again and re read every stage check">Check again</button><button class="btn btn-ghost btn-icon" type="button" id="btnDockClose" aria-label="Close the unresolved list">' + Kit.icon('x') + '</button></div><div class="dock-body" tabindex="-1"></div>';
      dock.querySelector('#btnDockClose').addEventListener('click', X.close);
      dock.querySelector('#btnRecheck').addEventListener('click', function () { X.collect(bundle(), { fresh: true }); X.paint(); X.paintBadge(); });
    }
    Kit.on('validated', function () { paintSoon(); });
    Kit.on('load', function () { memo = { key: null, last: null, out: null }; paintSoon(); });
    var ui = {};
    try { ui = Kit.uiState.get() || {}; } catch (e) {}
    if (ui.dock) X.open(); else X.paintBadge();
  };
})();
// === STUDIO:UNRESOLVED END ===
