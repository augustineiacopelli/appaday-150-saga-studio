// === STUDIO:PIPELINE BEGIN ===
// Saga Studio, Day 150, Phase 3: the pipeline.
//
// Five stages in a fixed order: Charter and Rules (Day 146), Art and Audio (147), World (148), Story (149), Game. This file
// decides which of them a person can enter, marks a stage Final without the download, and says when a later stage is stale.
// It invents no new bookkeeping. Every answer is read from what the forges already write into the bundle:
//
//   Final       kit.forges['146' to '149'].status, which each forge's own Final export sets after its own checks.
//   Ready       each forge's own readiness function (WORLD.readiness, STORY.readiness; Day 147's gate; the Charter lock).
//   Stale       the charterVersion every forge stamps into its kit.forges entry, a predecessor that is no longer Final, and
//               Day 149's own world stamp (story.settings.worldHash, "the world is the one the story was built on").
//
// A stage unlocks when the stage before it is Final and that stage's readiness still holds against the bundle in memory.
// "Mark stage Final" runs the stage's own Final export (its checks, its namespace opening, its hash stamping) and throws the
// files away, so nothing is downloaded and nothing is re imported. Editing upstream after downstream was built is shown as a
// Stale badge on the later stage.
//
// KNOWN GAP, said plainly: no forge stamps which art a world was laid out on, so an art edit after the world was marked Final
// is not caught here (the world's own checks still catch the tile and sprite references that actually break). Needs
// core/studio.js, core/idb.js and core/projects.js. Plain ES5.
(function () {
  'use strict';
  var Kit = window.Kit, Studio = window.Studio, U = Kit.util;
  if (!Studio || !Studio.projects) throw new Error('Studio pipeline: core/projects.js must load first.');
  var P = Studio.pipeline = {};
  var ORDER = ['charter', 'art', 'world', 'story', 'game'];
  var LABEL = { charter: 'Charter and Rules', art: 'Art and Audio', world: 'World', story: 'Story', game: 'Game' };
  var SHORT = { charter: 'Charter', art: 'Art', world: 'World', story: 'Story', game: 'Game' };
  var DAY = { charter: '146', art: '147', world: '148', story: '149' };
  var DAY_STAGE = { '146': 'charter', '147': 'art', '148': 'world', '149': 'story' };
  P.ORDER = ORDER; P.LABEL = LABEL; P.SHORT = SHORT;

  function bundle() { return Kit.bundle.current(); }

  // ---------------------------------------------------------------- the Game stage
  // The fifth stage has no forge. It is a stage record of its own (not one of Studio.STAGES, which are the vendored forges), with
  // one tab, so the router, the tab bar and Kit.go treat it like any other stage. Phase 3 shows what Build game will need;
  // Test Play arrives in Phase 5 and Build game in Phase 6.
  Studio.stages.game = {
    id: 'game', day: null, label: LABEL.game, ns: null, global: null, ws: {}, mounts: ['start'], loaded: true, onLoad: [], onChange: [],
    validators: {}, types: [], typeDefs: {}, prefixes: {}, prefixSnap: null, jumps: [], kit: null, readiness: null, api: null, css: null
  };

  // ---------------------------------------------------------------- what the bundle says
  function forgeOf(b, id) {
    var f = b && b.kit && U.isObj(b.kit.forges) ? b.kit.forges[DAY[id]] : null;
    return U.isObj(f) ? f : null;
  }
  P.isFinal = function (id, b) { var f = forgeOf(b || bundle(), id); return !!f && f.status === 'final'; };

  // True, or the reason the stage cannot be marked Final yet. The Charter's own gate is trivial (Day 146 has nothing to wait for),
  // but nothing after it can open until the Charter is locked, so the pipeline asks for the lock.
  P.readiness = function (id, b) {
    b = b || bundle();
    if (!b) return 'No project is open.';
    if (id === 'charter') return b.charter && b.charter.locked ? true : 'Lock the Charter on the Charter tab first.';
    if (id === 'game') return P.isFinal('story', b) ? true : 'Mark the Story stage Final first.';
    var r = Studio.readiness(id, b);
    if (id === 'art' && r !== true) return 'Lock the Charter on the Charter stage first.';
    return r;
  };

  // Null when the stage can be entered, else the sentence that says why not.
  P.lockReason = function (id, b) {
    b = b || bundle();
    var i = ORDER.indexOf(id);
    if (i < 0) return 'Unknown stage.';
    if (i === 0) return null;
    if (!b) return 'No project is open.';
    var prev = ORDER[i - 1];
    if (!P.isFinal(prev, b)) return 'Mark the ' + LABEL[prev] + ' stage Final first.';
    var r = P.readiness(prev, b);
    return r === true ? null : r;
  };

  function worldStamp(b) {
    var st = Studio.stages.story, C = st && st.api && st.api.checks;
    if (!C || typeof C.stamped !== 'function' || !b || !U.isObj(b.story)) return null;
    if (!C.stamped(b) || C.worldCurrent(b)) return null;
    return 'The world changed after the story was built on it. Rebuild the story on this world, or confirm it on the Story validation tab.';
  }
  // The reasons a stage that is Final no longer holds. An empty list means current. A stage that is not Final has nothing to be
  // stale about. The Game stage is stale when the Story it would be built from is.
  P.stale = function (id, b) {
    b = b || bundle();
    var out = [];
    if (!b || id === 'charter') return out;
    if (id === 'game') {
      if (!P.isFinal('story', b)) return out;
      ORDER.slice(0, 4).forEach(function (s) { if (P.stale(s, b).length) out.push('The ' + LABEL[s] + ' stage is stale.'); });
      return out;
    }
    if (!P.isFinal(id, b)) return out;
    var f = forgeOf(b, id), cv = b.charter && b.charter.version || 0, prev = ORDER[ORDER.indexOf(id) - 1];
    if (f.charterVersion != null && f.charterVersion !== cv) out.push('The Charter was relocked as version ' + cv + ' after this stage was marked Final on version ' + f.charterVersion + '.');
    if (!P.isFinal(prev, b)) out.push('The ' + LABEL[prev] + ' stage is no longer Final.');
    if (id === 'story') { var w = worldStamp(b); if (w) out.push(w); }
    return out;
  };

  // One record per stage, in order.
  P.state = function (b) {
    b = b || bundle();
    return ORDER.map(function (id, i) {
      var final = id !== 'game' && P.isFinal(id, b), lock = P.lockReason(id, b), stale = P.stale(id, b), r = P.readiness(id, b), f = id !== 'game' ? forgeOf(b, id) : null;
      return {
        id: id, label: LABEL[id], short: SHORT[id], day: DAY[id] || null, index: i, current: Studio.stage === id,
        final: final, finalAt: final && f ? f.exportedAt || null : null, unlocked: !lock, lockReason: lock,
        ready: r === true, notReady: r === true ? null : r, stale: stale,
        status: lock ? 'locked' : stale.length ? 'stale' : final ? 'final' : 'open'
      };
    });
  };
  P.stateOf = function (id, b) { return P.state(b).filter(function (s) { return s.id === id; })[0] || null; };

  // The furthest stage at or before the one asked for that can be entered. A project opens at the stage where it stands, and a
  // bundle whose upstream stages were edited out from under it opens at the last stage that still holds.
  P.landing = function (id, b) {
    b = b || bundle();
    var i = ORDER.indexOf(id);
    if (i < 0) return 'charter';
    while (i > 0 && P.lockReason(ORDER[i], b)) i--;
    return ORDER[i];
  };
  // A stage bar click: refuses a locked stage with the reason, else shows it.
  P.go = function (id) {
    var why = P.lockReason(id);
    if (why) { Kit.ui.toast(LABEL[id] + ' is locked. ' + why, 'warn', 5000); return false; }
    return Studio.show(id);
  };

  // ---------------------------------------------------------------- Mark stage Final
  // Runs the stage's own Final export on the bundle in memory: its own checks, its own opening of the namespace, its own
  // kit.forges stamp and content hash. The files it builds are dropped, so there is no download and no re import.
  // Returns {ok, stage, hash} or {ok:false, stage, reason}.
  P.markFinal = function (id) {
    var st = Studio.stages[id];
    if (!st || id === 'game') return { ok: false, stage: id, reason: 'The Game stage is built, not marked Final.' };
    var b = bundle();
    if (!b) return { ok: false, stage: id, reason: 'No project is open.' };
    var why = P.lockReason(id, b);
    if (why) return { ok: false, stage: id, reason: LABEL[id] + ' is locked. ' + why };
    var r = P.readiness(id, b);
    if (r !== true) return { ok: false, stage: id, reason: r };
    var prev = Studio.stage, hopped = prev !== id, res;
    // The stage's handlers, validators and registry are live while it is on screen, so the export runs with it on screen.
    if (hopped) Studio.enter(id);
    try {
      var fn = st.kit && st.kit.buildExport ? st.kit.buildExport : Studio.base.buildExport;
      var out = fn.call(Kit, 'final', id === 'art' ? { fill: true, engines: false } : { engines: false });
      res = { ok: true, stage: id, hash: out.hash };
    } catch (e) {
      res = { ok: false, stage: id, reason: e && e.message ? e.message : String(e) };
    }
    if (hopped && prev) Studio.enter(prev);
    if (res.ok) { try { Kit.rerender(); } catch (e2) {} }
    P.paint();
    if (Studio.unresolved) Studio.unresolved.paint();
    return res;
  };
  // The button's handler: marks the stage on screen Final and says what happened.
  P.markCurrentFinal = function () {
    var id = Studio.stage, res = P.markFinal(id);
    if (res.ok) Kit.ui.toast(LABEL[id] + ' is marked Final. Hash ' + String(res.hash || '').slice(0, 12) + '.', 'ok', 5000);
    else Kit.ui.toast(res.reason, 'warn', 8000);
    return res;
  };

  // ---------------------------------------------------------------- jumping
  // The stage that owns a record: its prefix names the forge that owns it, and the three namespaces name themselves.
  P.stageOfRecord = function (rid) {
    if (!rid || typeof rid !== 'string') return null;
    if (rid === 'art' || rid === 'world' || rid === 'story') return rid;
    if (rid === 'charter' || rid === 'codex' || rid === 'rules') return 'charter';
    var p = Kit.ids.prefixOf(rid), info = p ? Kit.codex.prefixInfo(p) : null;
    return info ? DAY_STAGE[String(info.forge)] || 'charter' : null;
  };
  // Kit.jump, retargeted: switch to the stage that owns the record first, refusing with the reason when that stage is locked,
  // then let Kit (or the forge's own jump handler) take it from there. Kit's own validation drawer gets this too.
  function installJump() {
    var raw = Kit.jump;
    if (raw.studioWrapped) return;
    var wrapped = function (recordId, fieldPath) {
      var to = P.stageOfRecord(recordId);
      if (to && to !== Studio.stage) {
        var why = P.lockReason(to);
        if (why) { Kit.ui.toast(LABEL[to] + ' is locked. ' + why, 'warn', 5000); return false; }
        if (!Studio.show(to)) return false;
      }
      return raw.apply(Kit, arguments);
    };
    Object.keys(raw).forEach(function (k) { wrapped[k] = raw[k]; });
    wrapped.studioWrapped = true;
    wrapped.raw = raw;
    Kit.jump = wrapped;
  }

  // ---------------------------------------------------------------- the Game panel (Phase 3: what Build game will need)
  function renderGame(host) {
    var b = bundle(), rows = P.state(b).filter(function (s) { return s.id !== 'game'; }), sum = Studio.unresolved ? Studio.unresolved.summary(b) : null;
    var p = U.el('section', 'panel');
    p.appendChild(U.el('h2', 'panel-title', 'Game'));
    p.appendChild(U.el('p', 'muted', 'The Game stage plays the finished project and builds it as a game that stands on its own. It opens once the Story stage is Final.'));
    var list = U.el('div', 'game-req');
    rows.forEach(function (s) {
      var ok = s.final && !s.stale.length;
      list.appendChild(U.el('div', 'game-row', '<span class="chip ' + (ok ? 'chip-ok' : s.stale.length ? 'chip-warning' : 'chip-muted') + '">' + U.esc(ok ? 'Final' : s.stale.length ? 'Stale' : 'Not Final') + '</span><span>' + U.esc(s.label) + '</span>'));
    });
    if (sum) list.appendChild(U.el('div', 'game-row', '<span class="chip ' + (sum.empty ? 'chip-ok' : 'chip-error') + '">' + (sum.empty ? 'Clear' : (sum.blocking + sum.owed) + ' open') + '</span><span>Nothing unresolved</span>'));
    p.appendChild(list);
    p.appendChild(U.el('p', 'muted', 'Test Play arrives in Phase 5, and Build game in Phase 6. Build game will ask for every stage Final and an empty unresolved list.'));
    host.appendChild(p);
  }

  // ---------------------------------------------------------------- the header
  var els = {};
  function statusChip(s) {
    if (s.status === 'locked') return { cls: 'chip-muted', html: Kit.icon('lock') + 'Locked' };
    if (s.status === 'stale') return { cls: 'chip-warning', html: 'Stale' };
    if (s.status === 'final') return { cls: 'chip-ok', html: Kit.icon('check') + 'Final' };
    return { cls: 'chip-accent', html: s.id === 'game' ? 'Open' : 'In progress' };
  }
  P.mountHeader = function (nav) {
    U.clear(nav);
    var steps = U.el('div', 'stage-steps');
    steps.setAttribute('role', 'group'); steps.setAttribute('aria-label', 'Pipeline stages');
    ORDER.forEach(function (id, i) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn stage-btn'; b.setAttribute('data-stage-btn', id); b.setAttribute('data-status', 'open');
      b.innerHTML = '<span class="stage-n">' + (i + 1) + '</span><span class="stage-name">' + U.esc(LABEL[id]) + '</span><span class="stage-st chip chip-accent">In progress</span>';
      b.addEventListener('click', function () { P.go(id); });
      steps.appendChild(b);
    });
    nav.appendChild(steps);
    var act = U.el('div', 'stage-act');
    var note = U.el('span', 'stage-note'); note.id = 'stageNote'; note.setAttribute('aria-live', 'polite');
    var mark = U.el('button', 'btn btn-primary', Kit.icon('check') + '<span class="lbl">Mark stage Final</span>'); mark.type = 'button'; mark.id = 'btnMarkFinal';
    mark.addEventListener('click', function () {
      if (mark.getAttribute('aria-disabled') === 'true') { Kit.ui.toast(mark.title || 'This stage cannot be marked Final yet.', 'warn', 6000); return; }
      P.markCurrentFinal();
    });
    var un = U.el('button', 'btn vbadge', ''); un.type = 'button'; un.id = 'btnUnresolved';
    un.addEventListener('click', function () { if (Studio.unresolved) Studio.unresolved.toggle(); });
    act.appendChild(note); act.appendChild(mark); act.appendChild(un);
    nav.appendChild(act);
    els = { nav: nav, steps: steps, note: note, mark: mark, unresolved: un };
    P.paint();
  };

  P.paint = function () {
    if (!els.steps) return;
    var b = bundle(), state = P.state(b), cur = Studio.stage, now = state.filter(function (s) { return s.id === cur; })[0];
    Array.prototype.forEach.call(els.steps.children, function (btn) {
      var id = btn.getAttribute('data-stage-btn'), s = state.filter(function (x) { return x.id === id; })[0];
      if (!s) return;
      var c = statusChip(s), chip = btn.querySelector('.stage-st');
      btn.setAttribute('data-status', s.status);
      btn.setAttribute('aria-current', s.current ? 'true' : 'false');
      if (s.status === 'locked') btn.setAttribute('aria-disabled', 'true'); else btn.removeAttribute('aria-disabled');
      var tip = s.status === 'locked' ? s.lockReason : s.stale.length ? s.stale.join(' ') : s.final ? 'Marked Final' + (s.finalAt ? ' ' + String(s.finalAt).slice(0, 10) : '') + '.' : s.label;
      btn.title = tip;
      btn.setAttribute('aria-label', s.label + ', ' + (s.status === 'locked' ? 'locked. ' + s.lockReason : s.status === 'stale' ? 'stale. ' + s.stale.join(' ') : s.final ? 'Final' : 'in progress'));
      if (chip) { chip.className = 'stage-st chip ' + c.cls; chip.innerHTML = c.html; }
    });
    if (!els.mark) return;
    var markable = !!now && now.id !== 'game';
    els.mark.hidden = !markable;
    if (markable) {
      var why = now.lockReason || (now.ready ? null : now.notReady);
      els.mark.querySelector('.lbl').textContent = now.final ? 'Mark ' + now.short + ' Final again' : 'Mark ' + now.short + ' Final';
      if (why) { els.mark.setAttribute('aria-disabled', 'true'); els.mark.title = why; } else { els.mark.removeAttribute('aria-disabled'); els.mark.title = 'Run ' + now.label + "'s own Final checks and mark the stage Final. Nothing is downloaded."; }
    }
    var text = '';
    if (now) {
      if (now.status === 'locked') text = now.lockReason;
      else if (now.stale.length) text = 'Stale. ' + now.stale[0];
      else if (now.final) text = 'Final' + (now.finalAt ? ', marked ' + String(now.finalAt).slice(0, 10) : '') + '.';
      else if (now.id === 'game') text = 'Everything before this stage is Final.';
      else text = now.ready ? 'Ready to mark Final.' : now.notReady;
    }
    els.note.textContent = text || '';
    if (Studio.unresolved) Studio.unresolved.paintBadge();
  };
  var paintSoon = U.debounce(function () { P.paint(); }, 200);

  // ---------------------------------------------------------------- install
  // Called once from studio-boot, after every forge has loaded and the one store, importer and exporter are in. Native mode (the
  // forges' own phase suites) never installs it: the forges keep their own gates there.
  P.install = function () {
    if (P.installed) return;
    P.installed = true;
    Studio.stages.game.kit = Studio.stages.story.kit;
    Kit.mount('game.start', { title: 'Game', icon: 'scroll', canEnter: function () { return true; }, render: renderGame });
    installJump();
    // A stage on screen changes what the header says, so every entry repaints it.
    var rawEnter = Studio.enter;
    Studio.enter = function () { var r = rawEnter.apply(Studio, arguments); paintSoon(); return r; };
    Kit.on('change', paintSoon);
    Kit.on('load', paintSoon);
  };
  P.stageLabel = function (id) { return LABEL[id] || id; };
})();
// === STUDIO:PIPELINE END ===
