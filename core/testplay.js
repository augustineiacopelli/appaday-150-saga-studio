// === STUDIO:TESTPLAY BEGIN ===
// Saga Studio, Day 150, Phase 5: Test Play from anywhere.
//
// The Story stage and the Game stage carry a Test Play button. It opens player/player.html, the very page an exported game
// is built from, in a full screen frame and hands it the bundle in memory and a start spec by postMessage
// ({type: 'saga:play', bundle, test}). Because the frame loads the same player.js and the same five engine files that
// Build game will package, what is tested here is what ships.
//
// Four starts:
//   new       a new game from the title's New Game, the opening and all.
//   chapter   the start of any chapter. The Studio replays Day 149's golden path through ENGINE_STORY.host.play, answering
//             every choice and battle the way the path did, and stops as soon as the chapter becomes the one asked for. The
//             player is dropped where that chapter's opening put them (the last changeMap the replay saw after the chapter
//             began), else at the chapter's start town. The story state is the walk's own, so it is consistent by
//             construction: every flag, item, party member and gate is exactly what reaching that chapter means.
//   map       the same replay to the map's chapter, then the player stands at that map's entrance.
//   battle    the same replay to the troop's chapter (so the party is built for that chapter, with its gear tier and
//             materia), then the battle starts at once. The outcome is reported back and nothing in the story changes.
// The golden path comes from the Story forge itself (STORY.day150, the Day 150 contract block), so the Studio replays exactly
// the path Day 149's checks proved. Test saves go under saga150test: in the frame, apart from real saves of the game.
// Needs core/pipeline.js. Plain ES5.
(function () {
  'use strict';
  var Kit = window.Kit, Studio = window.Studio, U = Kit.util, ES = window.ENGINE_STORY;
  if (!Studio || !Studio.pipeline) throw new Error('Studio test play: core/pipeline.js must load first.');
  var TP = Studio.testplay = {};
  TP.PLAYER = 'player/player.html';
  TP.KINDS = ['new', 'chapter', 'map', 'battle'];
  var KIND_LABEL = { 'new': 'New game', chapter: 'Start of a chapter', map: 'On a map', battle: 'A battle' };
  var FORCED = { chapterStart: 1, battleEnd: 1 };
  var PLAY_ICON = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/></svg>';

  function bundle() { return Kit.bundle.current(); }
  function isObj(v) { return U.isObj(v); }
  function vals(m) { return isObj(m) ? Object.keys(m).sort().map(function (k) { return m[k]; }).filter(isObj) : []; }
  function prefixOf(id) { var m = /^([a-z]{3}_)/.exec(String(id || '')); return m ? m[1] : null; }
  function shortName(name) { var p = String(name || '').split(': '); return p[p.length - 1]; }
  function rulesRec(b, id) { var p = prefixOf(id), m = p && b && b.rules && b.rules[p]; return isObj(m) && isObj(m[id]) ? m[id] : null; }
  function worldRec(b, id) { var p = prefixOf(id), m = p && b && b.world && b.world.records && b.world.records[p]; return isObj(m) && isObj(m[id]) ? m[id] : null; }
  function chapters(b) { var s = b && b.charter && b.charter.sections; return s && Array.isArray(s.chapters) ? s.chapters.filter(isObj) : []; }
  function chapterName(b, id) { var c = chapters(b).filter(function (x) { return x.id === id; })[0]; return c ? (c.name || id) : String(id || ''); }
  function chapterIndex(b, id) { var l = chapters(b); for (var i = 0; i < l.length; i++) if (l[i].id === id) return i; return -1; }

  // ---------------------------------------------------------------- can this bundle be played at all
  // The Story stage must be reachable (it is the first stage with something to play), and the bundle must hold the parts the
  // player refuses to start without. Null when it can be played, else the reason.
  TP.blocked = function (b) {
    b = b || bundle();
    if (!b) return 'No project is open.';
    var lock = Studio.pipeline.lockReason('story', b);
    if (lock) return 'Test Play opens with the Story stage. ' + lock;
    if (!ES || !ES.host) return 'The story engine is not loaded.';
    var miss = ['charter', 'rules', 'art', 'world', 'story'].filter(function (k) { return !isObj(b[k]); });
    if (miss.length) return 'This project has no ' + miss.join(', ') + ' yet.';
    if (!vals(b.world.records && b.world.records.map_).some(function (m) { return m.kind === 'overworld'; })) return 'This project has no generated world yet.';
    if (!isObj(b.story.records) || !vals(b.story.records.evt_).length) return 'There are no story events to play yet. Build the events in the Story stage.';
    return null;
  };

  // ---------------------------------------------------------------- the golden path (Day 149's own)
  // STORY.day150 is the Day 150 contract block Day 149 writes into its Final manifest. Its golden.steps are the walk's golden
  // path, the shortest path to an ending with every main quest done. The Story forge's functions run with the Story stage live,
  // the way Mark stage Final runs them, so the stage is entered for the call and left again. Cached per bundle hash.
  var gcache = { key: null, val: null };
  TP.golden = function (b) {
    b = b || bundle();
    if (!b) return { steps: null, reason: 'No project is open.' };
    var key = null;
    try { key = Kit.bundle.hash(b); } catch (e) { key = null; }
    if (key && gcache.key === key) return gcache.val;
    var st = Studio.stages.story, api = st && st.api, val;
    if (!api || typeof api.day150 !== 'function') val = { steps: null, reason: 'The Story stage is not loaded.' };
    else {
      var prev = Studio.stage, hop = prev !== 'story', d = null, err = null;
      if (hop) Studio.enter('story');
      try { d = api.day150(b); } catch (e) { err = e; }
      if (hop && prev) Studio.enter(prev);
      if (err) val = { steps: null, reason: 'The story checks failed: ' + (err.message || String(err)) };
      else if (!d || !d.golden || !Array.isArray(d.golden.steps)) val = { steps: null, reason: 'The story checks have not proven a path to an ending yet. Open the Story stage and fix what its validation tab lists.' };
      else val = { steps: d.golden.steps.map(function (s) { return U.clone(s); }), ending: d.golden.ending, hash: d.golden.hash, full: !!d.golden.full };
    }
    gcache = { key: key, val: val };
    return val;
  };

  // ---------------------------------------------------------------- the replay (pure: ENGINE_STORY only)
  // Plays the golden path from a new game with ENGINE_STORY.host.newGame and host.play, every choice and battle answered from the
  // path exactly as host.replay answers them, and stops at the first quiet state whose chapter is the one asked for. The host's
  // forced events (chapterStart, battleEnd, the move's autoruns) run inside each play, so stopping between plays is always at a
  // quiet state. Also reports the last changeMap seen after that chapter began, which is where its opening put the player.
  // Returns {ok, state, played, at, reason}.
  TP.replayTo = function (b, chapterId, steps, game) {
    var H = ES.host;
    game = game || H.load(b);
    var list = (steps || []).filter(function (s) { return isObj(s) && s.by !== 'newGame'; });
    var cur = 0, active = null, ci = 0, bi = 0, fail = null, lastMap = null;
    var hooks = {
      begin: function (ctx) {
        var s = list[cur];
        if (!s || s.by !== ctx.by || (s.evt || null) !== (ctx.evt || null) || (s.npc || null) !== (ctx.npc || null)) {
          fail = fail || 'The golden path and the story disagree at step ' + (cur + 1) + ': the story ran ' + ctx.by + ' ' + (ctx.evt || ctx.npc) + '.';
          return false;
        }
        if (ctx.by === 'chapterStart') lastMap = null;
        active = s; cur++; ci = 0; bi = 0;
        return true;
      },
      decide: function (q) {
        if (q.kind === 'choice') {
          var want = active && Array.isArray(active.choices) ? active.choices[ci++] : undefined;
          for (var k = 0; k < q.options.length; k++) if (q.options[k].text === want) return k;
          fail = fail || 'The golden path has no answer "' + want + '" for a choice.';
          return -1;
        }
        var bt = active && Array.isArray(active.battles) ? active.battles[bi++] : null;
        if (!isObj(bt) || (bt.trp || null) !== (q.trp || null)) { fail = fail || 'Battle ' + q.trp + ' is not the one the golden path fought.'; return null; }
        return bt.outcome;
      },
      effect: function (e) { if (isObj(e) && e.kind === 'changeMap' && e.map) lastMap = { map: e.map, at: Array.isArray(e.at) ? e.at.slice() : null, dir: e.dir || null }; }
    };
    function reached(st) { return st && !st.run && !st.ending && st.chapter === chapterId; }
    var r = H.newGame(game, {}, hooks), st = r.state;
    if (r.error) fail = fail || r.error.message;
    if (!fail && reached(st)) return { ok: true, state: st, played: cur, at: lastMap, game: game };
    while (!fail && cur < list.length) {
      var s = list[cur], mv = null, avail = H.moves(game, st);
      if (FORCED[s.by]) { fail = 'Step ' + (cur + 1) + ' of the golden path is a forced ' + s.by + ' event that no move led to.'; break; }
      for (var i = 0; i < avail.length && !mv; i++) if (avail[i].by === s.by && (avail[i].evt || null) === (s.evt || null) && (avail[i].npc || null) === (s.npc || null)) mv = avail[i];
      if (!mv) { fail = 'Step ' + (cur + 1) + ' of the golden path (' + s.by + ' ' + (s.evt || s.npc) + ') is not a move the player can make there.'; break; }
      lastMap = null;
      r = H.play(game, st, mv, hooks);
      if (r.error) { fail = fail || r.error.message; break; }
      if (r.gameover) { fail = 'The golden path lost a battle on the way.'; break; }
      st = r.state;
      if (reached(st)) return { ok: true, state: st, played: cur, at: lastMap, game: game };
      if (st.ending) break;
    }
    return { ok: false, state: st, played: cur, at: null, reason: fail || 'The golden path never reaches ' + chapterName(b, chapterId) + '. Only chapters on the golden path can be started directly.' };
  };

  // ---------------------------------------------------------------- what can be started
  function isBossTroop(b, t) { return Array.isArray(t.members) && t.members.some(function (m) { var e = m && rulesRec(b, m.enm); return !!(e && e.isBoss); }); }
  TP.options = function (b) {
    b = b || bundle();
    var chs = chapters(b), byCh = function (x, y) { var a = chapterIndex(b, x.chapter), c = chapterIndex(b, y.chapter); return a !== c ? a - c : String(x.name).localeCompare(String(y.name)); };
    var maps = vals(b && b.world && b.world.records && b.world.records.map_).map(function (m) {
      return { id: m.id, name: m.kind === 'overworld' ? 'Overworld' : String(m.name || m.id), kind: m.kind, chapter: m.kind === 'overworld' ? (chs[0] && chs[0].id) || null : m.chapter || null };
    }).sort(function (x, y) { if (x.kind === 'overworld') return -1; if (y.kind === 'overworld') return 1; return byCh(x, y); });
    var troops = vals(b && b.rules && b.rules.trp_).map(function (t) { return { id: t.id, name: shortName(t.name || t.id), chapter: t.chapter || (chs[0] && chs[0].id) || null, boss: isBossTroop(b, t) }; }).sort(byCh);
    return { chapters: chs.map(function (c, i) { return { id: c.id, name: c.name || c.id, index: i }; }), maps: maps, troops: troops };
  };

  // ---------------------------------------------------------------- the start spec
  // req {kind, chapter, map, trp}. Returns {ok, spec} or {ok: false, reason}. spec is what the frame receives as test.
  TP.spec = function (b, req) {
    b = b || bundle();
    req = req || {};
    var why = TP.blocked(b);
    if (why) return { ok: false, reason: why };
    var kind = TP.KINDS.indexOf(req.kind) >= 0 ? req.kind : 'new';
    if (kind === 'new') return { ok: true, spec: { kind: 'new', label: 'Test play: a new game' } };
    var chs = chapters(b);
    if (!chs.length) return { ok: false, reason: 'The Charter has no chapters.' };
    var map = null, trp = null, chapter = req.chapter || null;
    if (kind === 'map') {
      map = worldRec(b, req.map);
      if (!map || prefixOf(req.map) !== 'map_') return { ok: false, reason: 'Choose a map to start on.' };
      chapter = map.kind === 'overworld' ? (req.chapter || chs[0].id) : (map.chapter || chs[0].id);
    } else if (kind === 'battle') {
      trp = rulesRec(b, req.trp);
      if (!trp || prefixOf(req.trp) !== 'trp_') return { ok: false, reason: 'Choose a troop to fight.' };
      chapter = trp.chapter || chs[0].id;
    }
    if (chapterIndex(b, chapter) < 0) return { ok: false, reason: 'Choose a chapter to start in.' };
    var game = ES.host.load(b), first = chapterIndex(b, chapter) === 0, g = first ? { steps: [] } : TP.golden(b);
    var r = TP.replayTo(b, chapter, g.steps || [], game);
    if (!r.ok && first) { g = TP.golden(b); if (g.steps) r = TP.replayTo(b, chapter, g.steps, game); }
    if (!r.ok) return { ok: false, reason: g.steps ? r.reason : g.reason };
    var story = ES.save.toSave(r.state, game.idx);
    if (story.error) return { ok: false, reason: 'The replayed state could not be saved: ' + story.error };
    var spec = { kind: kind, chapter: chapter, story: story, replayed: r.played, label: '' };
    var chLabel = chapterName(b, chapter);
    if (kind === 'chapter') {
      spec.label = 'Test play: ' + chLabel;
      if (r.at) { spec.map = r.at.map; spec.at = r.at.at; spec.dir = r.at.dir; }
    } else if (kind === 'map') {
      spec.map = map.id;
      spec.label = 'Test play: ' + (map.kind === 'overworld' ? 'the overworld' : shortName(map.name || map.id)) + ' (' + chLabel + ')';
    } else {
      spec.trp = trp.id;
      spec.label = 'Test battle: ' + shortName(trp.name || trp.id) + ' (' + chLabel + ')';
      var o = chapterSiteMap(b);
      if (o) spec.map = o;
    }
    return { ok: true, spec: spec };
  };
  // A battle is fought on the overworld in front of the chapter's start town (the player finds the spot), so the backdrop is
  // that land's own; the party is the chapter's whatever the backdrop.
  function chapterSiteMap(b) {
    var ow = vals(b.world.records.map_).filter(function (m) { return m.kind === 'overworld'; })[0];
    return ow ? ow.id : null;
  }

  // ---------------------------------------------------------------- the frame
  var OV = null;
  function setStatus(text, kind) {
    if (!OV) return;
    OV.status = text; OV.statusKind = kind || 'info';
    OV.note.textContent = text;
    OV.note.setAttribute('data-kind', OV.statusKind);
  }
  function post() {
    if (!OV || !OV.frame.contentWindow) return;
    OV.started = false;
    setStatus('Starting' + (OV.spec.kind === 'new' ? '' : ' from the replayed state (' + OV.spec.replayed + ' golden steps)') + '...', 'info');
    var data = { type: 'saga:play', bundle: U.clone(OV.bundle), test: U.clone(OV.spec) };
    OV.posted++;
    try { OV.frame.contentWindow.postMessage(data, '*'); } catch (e) { setStatus('The player frame refused the bundle: ' + e.message, 'error'); }
  }
  function onMessage(e) {
    if (!OV || !OV.frame || e.source !== OV.frame.contentWindow) return;
    var d = e.data;
    if (!isObj(d) || typeof d.type !== 'string') return;
    OV.log.push(d.type);
    if (d.type === 'saga:ready') { OV.ready = true; post(); }
    else if (d.type === 'saga:started') {
      OV.started = true; OV.startedState = isObj(d.state) ? d.state : null;
      if (d.error) setStatus('Started at the title instead: ' + d.error, 'warn');
      else setStatus(OV.spec.label + '. Saves made here stay with test play.', 'ok');
    } else if (d.type === 'saga:error') setStatus(d.message || 'The game could not start.', 'error');
    else if (d.type === 'saga:battle') {
      OV.battle = { trp: d.trp, outcome: d.outcome };
      setStatus('Test battle ' + (d.outcome === 'win' ? 'won' : d.outcome === 'escape' ? 'escaped' : 'lost') + '. Restart to fight it again.', d.outcome === 'win' ? 'ok' : 'warn');
    }
  }
  // Escape closes the frame, unless a Kit dialog (Change start) is open above it: then Escape is that dialog's.
  function onKey(e) { if (OV && e.key === 'Escape' && !(Kit.ui.overlayCount && Kit.ui.overlayCount())) { e.preventDefault(); TP.close(); } }

  // Opens the frame with a start request. Returns {ok, spec} or {ok: false, reason} (and says why in a toast).
  TP.open = function (req) {
    var b = bundle(), res = TP.spec(b, req);
    if (!res.ok) { Kit.ui.toast(res.reason, 'warn', 8000); return res; }
    if (OV) TP.close(true);
    var ov = U.el('div', 'tp-ov');
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Test Play');
    var bar = U.el('div', 'tp-bar');
    var t = U.el('h2', 'tp-title', PLAY_ICON + '<span>Test Play</span>');
    var note = U.el('span', 'tp-note'); note.setAttribute('aria-live', 'polite');
    var again = U.el('button', 'btn', '<span>Restart</span>'); again.type = 'button'; again.id = 'tpRestart';
    var change = U.el('button', 'btn', '<span>Change start</span>'); change.type = 'button'; change.id = 'tpChange';
    var close = U.el('button', 'btn btn-primary', Kit.icon('x') + '<span>Close</span>'); close.type = 'button'; close.id = 'tpClose';
    bar.appendChild(t); bar.appendChild(note); bar.appendChild(again); bar.appendChild(change); bar.appendChild(close);
    var frame = document.createElement('iframe');
    frame.className = 'tp-frame'; frame.title = 'Saga player'; frame.setAttribute('allow', 'autoplay; fullscreen');
    ov.appendChild(bar); ov.appendChild(frame);
    OV = { el: ov, frame: frame, note: note, spec: res.spec, bundle: b, ready: false, started: false, posted: 0, log: [], status: '', statusKind: 'info', focus: document.activeElement };
    again.addEventListener('click', function () { if (OV && OV.ready) post(); });
    change.addEventListener('click', function () { TP.launch(); });
    close.addEventListener('click', function () { TP.close(); });
    window.addEventListener('message', onMessage);
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(ov);
    document.body.classList.add('tp-open');
    setStatus('Opening the player...', 'info');
    frame.src = TP.PLAYER;
    try { close.focus(); } catch (e) { /* ok */ }
    return { ok: true, spec: res.spec };
  };
  TP.close = function (quiet) {
    if (!OV) return false;
    window.removeEventListener('message', onMessage);
    document.removeEventListener('keydown', onKey, true);
    var f = OV.focus;
    try { OV.frame.src = 'about:blank'; } catch (e) { /* ok */ }
    U.detach(OV.el);
    OV = null;
    document.body.classList.remove('tp-open');
    if (!quiet && f && f.focus) try { f.focus(); } catch (e2) { /* ok */ }
    return true;
  };
  // For tests and the shell: what the frame is doing.
  TP.state = function () { return OV ? { open: true, ready: OV.ready, started: OV.started, posted: OV.posted, kind: OV.spec.kind, label: OV.spec.label, status: OV.status, statusKind: OV.statusKind, log: OV.log.slice(), startedState: OV.startedState || null, battle: OV.battle || null } : { open: false }; };
  TP.frame = function () { return OV ? OV.frame : null; };

  // ---------------------------------------------------------------- the start picker
  // One form, used in the Game stage panel and in the Test Play dialog: what kind of start, then the chapter, map or troop.
  var lastReq = { kind: 'new' };
  function selectField(label, id, fill) {
    var f = U.el('div', 'field tp-field');
    var lab = U.el('label', 'field-label', U.esc(label)); lab.htmlFor = id;
    var s = U.el('select', 'inp'); s.id = id;
    fill(s);
    f.appendChild(lab); f.appendChild(s);
    return { field: f, select: s };
  }
  function opt(s, value, text, group) { var o = document.createElement('option'); o.value = value; o.textContent = text; (group || s).appendChild(o); return o; }
  function grouped(s, b, list, text) {
    var groups = {};
    list.forEach(function (x) {
      var k = x.chapter || '-';
      if (!groups[k]) { groups[k] = document.createElement('optgroup'); groups[k].label = x.chapter ? chapterName(b, x.chapter) : 'Everywhere'; s.appendChild(groups[k]); }
      opt(s, x.id, text(x), groups[k]);
    });
  }
  // Builds the picker into host. onGo(req) is called with the request when the person presses the button.
  TP.picker = function (host, onGo, idp) {
    idp = idp || 'tp';
    var b = bundle(), o = TP.options(b), g = gcache.val;
    var wrap = U.el('div', 'tp-picker');
    var kind = selectField('Start', idp + 'Kind', function (s) { TP.KINDS.forEach(function (k) { opt(s, k, KIND_LABEL[k]); }); });
    var ch = selectField('Chapter', idp + 'Chapter', function (s) { o.chapters.forEach(function (c) { opt(s, c.id, (c.index + 1) + '. ' + c.name); }); });
    var mp = selectField('Map', idp + 'Map', function (s) { grouped(s, b, o.maps, function (m) { return m.kind === 'overworld' ? 'Overworld' : shortName(m.name); }); });
    var tr = selectField('Troop', idp + 'Troop', function (s) { grouped(s, b, o.troops, function (t) { return t.name + (t.boss ? ' (boss)' : ''); }); });
    var hint = U.el('p', 'muted tp-hint');
    var go = U.el('button', 'btn btn-primary tp-go', PLAY_ICON + '<span>Test Play</span>'); go.type = 'button'; go.id = idp + 'Go';
    [kind, ch, mp, tr].forEach(function (x) { wrap.appendChild(x.field); });
    wrap.appendChild(hint); wrap.appendChild(go);
    kind.select.value = lastReq.kind || 'new';
    if (lastReq.chapter) ch.select.value = lastReq.chapter;
    if (lastReq.map) mp.select.value = lastReq.map;
    if (lastReq.trp) tr.select.value = lastReq.trp;
    function sync() {
      var k = kind.select.value;
      ch.field.hidden = k !== 'chapter'; mp.field.hidden = k !== 'map'; tr.field.hidden = k !== 'battle';
      var text = k === 'new' ? 'Plays from the title screen, opening and all.' :
        k === 'chapter' ? 'Replays the golden path until this chapter begins, then drops you where its opening puts the party.' :
        k === 'map' ? 'Replays the golden path to this map\'s chapter, then puts you at the map\'s entrance.' :
        'Replays the golden path to the troop\'s chapter, then starts the fight with that chapter\'s party, gear and materia.';
      if (k !== 'new' && g && !g.steps) text += ' ' + g.reason;
      hint.textContent = text;
    }
    kind.select.addEventListener('change', sync);
    go.addEventListener('click', function () {
      var req = { kind: kind.select.value, chapter: ch.select.value || null, map: mp.select.value || null, trp: tr.select.value || null };
      lastReq = req;
      onGo(req);
    });
    sync();
    host.appendChild(wrap);
    return { kind: kind.select, chapter: ch.select, map: mp.select, trp: tr.select, go: go };
  };
  // The Test Play dialog (the header button and Change start).
  TP.launch = function () {
    var why = TP.blocked();
    if (why) { Kit.ui.toast(why, 'warn', 6000); return null; }
    return Kit.ui.dialog({
      title: 'Test Play',
      className: 'tp-dialog',
      body: function (body, handle) {
        body.appendChild(U.el('p', 'muted', 'Plays the project as it is in memory, in the same player an exported game uses. Nothing is saved to the project.'));
        TP.picker(body, function (req) { handle.close(); TP.open(req); }, 'tpd');
      },
      actions: []
    });
  };

  // ---------------------------------------------------------------- the Game panel and the header button
  TP.renderPanel = function (p) {
    var sec = U.el('section', 'tp-panel');
    sec.appendChild(U.el('h3', 'section-h', 'Test Play'));
    var why = TP.blocked();
    if (why) { sec.appendChild(U.el('p', 'muted', U.esc(why))); p.appendChild(sec); return; }
    sec.appendChild(U.el('p', 'muted', 'Plays the project in the same player Build game packages: from the title, from the start of any chapter on the golden path, on any map, or straight into any battle.'));
    TP.picker(sec, function (req) { TP.open(req); }, 'tpg');
    p.appendChild(sec);
  };
  var btn = null;
  function paintButton() {
    if (!btn) return;
    var show = Studio.stage === 'story' || Studio.stage === 'game', why = show ? TP.blocked() : null;
    btn.hidden = !show;
    if (why) { btn.setAttribute('aria-disabled', 'true'); btn.title = why; } else { btn.removeAttribute('aria-disabled'); btn.title = 'Play the project as it stands, from the start or from any chapter, map or battle.'; }
  }
  TP.install = function () {
    if (TP.installed) return;
    TP.installed = true;
    var act = document.querySelector('.stage-act'), mark = document.getElementById('btnMarkFinal');
    if (act) {
      btn = U.el('button', 'btn', PLAY_ICON + '<span class="lbl">Test Play</span>'); btn.type = 'button'; btn.id = 'btnTestPlay';
      btn.addEventListener('click', function () {
        if (btn.getAttribute('aria-disabled') === 'true') { Kit.ui.toast(btn.title, 'warn', 6000); return; }
        TP.launch();
      });
      act.insertBefore(btn, mark ? mark.nextSibling : null);
    }
    var rawPaint = Studio.pipeline.paint;
    Studio.pipeline.paint = function () { var r = rawPaint.apply(Studio.pipeline, arguments); paintButton(); return r; };
    Kit.on('load', function () { gcache = { key: null, val: null }; });
    paintButton();
  };
})();
// === STUDIO:TESTPLAY END ===
