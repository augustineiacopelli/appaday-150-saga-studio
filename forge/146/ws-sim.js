// === WS:SIM BEGIN ===
(function () {
  'use strict';
  var U = Kit.util, el = function (t, c, h) { return U.el(t, c, h); }, esc = U.esc;
  var WSX = window.WS.sim = { id: 'sim' };
  var SETUP_KEY = 'saga146:sim:setup';
  var PARTY_MAX = 4;
  var SEED_STRIDE = 1000003;
  var NONE = '_none';
  var CHARTS = {};
  var RUN = null;     // the run in progress: {worker, url, total, done, rows, meta, status}
  var LAST = null;    // the last finished (or cancelled) run: {rows, skipped, meta, status, stamp}
  var V = { host: null, focus: 'all' };

  function cur() { return Kit.bundle.current(); }
  function recs(b, p) { var o = b && b.rules && b.rules[p] ? b.rules[p] : {}; return Object.keys(o).map(function (k) { return o[k]; }).filter(function (r) { return U.isObj(r) && r.id; }); }
  function count(b, p) { return recs(b, p).length; }
  function recOf(b, id) { var p = Kit.ids.prefixOf(id); return p && b.rules && b.rules[p] && b.rules[p][id] ? b.rules[p][id] : null; }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : (d === undefined ? 0 : d); }
  function rs(b) { return (b && b.charter && b.charter.ruleset) || {}; }
  function chapters(b) { return window.WS.rules && WS.rules.content ? WS.rules.content.chaptersOf(b) : []; }
  function epsFor(b, chId) { var l = recs(b, 'eps_'); for (var i = 0; i < l.length; i++) if (l[i].chapter === chId) return l[i]; return null; }
  function randomSeed() { return Math.floor(Math.random() * 2147483646) + 1; }
  function clampInt(v, lo, hi, d) { v = Math.round(Number(v)); if (!isFinite(v)) v = d; return Math.max(lo, Math.min(hi, v)); }
  function pct(v) { return (Math.round(v * 10) / 10).toFixed(1) + '%'; }

  WSX.canEnter = function (b) {
    var r = window.WS.rules.canEnter(b);
    if (r !== true) return r;
    if (!count(b, 'trp_')) return 'Author troops in Rules to run the Simulator.';
    if (!count(b, 'eps_')) return 'Fill the Expected Party State in Rules to run the Simulator.';
    return true;
  };

  // ------------------------------------------------------------------ setup
  function loadSetup() { var s = Kit.store.get(SETUP_KEY, null); return U.isObj(s) ? s : {}; }
  function saveSetup(s) { Kit.store.set(SETUP_KEY, s); }
  function defaultSetup(b) {
    var s = loadSetup(), chars = recs(b, 'chr_');
    var chs = chapters(b);
    if (s.chapter !== 'all' && !chs.some(function (c) { return c.id === s.chapter; })) s.chapter = 'all';
    s.battles = clampInt(s.battles, 1, 5000, 200);
    if (typeof s.seed !== 'number' || !isFinite(s.seed)) s.seed = randomSeed();
    if (s.mode !== 'custom') s.mode = 'eps';
    s.chars = (Array.isArray(s.chars) ? s.chars : []).filter(function (id) { return recOf(b, id); }).slice(0, PARTY_MAX);
    if (!s.chars.length) s.chars = chars.slice(0, PARTY_MAX).map(function (c) { return c.id; });
    s.level = clampInt(s.level, 1, 99, 10);
    s.gearTier = clampInt(s.gearTier, 1, 9, 1);
    s.materia = (Array.isArray(s.materia) ? s.materia : []).filter(function (id) { return recOf(b, id); });
    if (s.weatherId && !recOf(b, s.weatherId)) s.weatherId = null;
    return s;
  }

  // ------------------------------------------------------------------ job planning
  function partyFor(b, s, troop) {
    var cfg = { chars: s.chars };
    if (s.mode === 'eps') cfg.source = troop.chapter;
    else {
      cfg.source = 'custom'; cfg.level = s.level; cfg.gearTier = s.gearTier; cfg.materia = s.materia;
      var prog = rs(b).progression;
      if (prog === 'jobs') { cfg.jobs = {}; var js = recs(b, 'job_'); s.chars.forEach(function (id, i) { if (js.length) cfg.jobs[id] = js[i % js.length].id; }); }
      if (prog === 'classes') { cfg.classes = {}; var cs = recs(b, 'cls_'); s.chars.forEach(function (id, i) { if (cs.length) cfg.classes[id] = cs[i % cs.length].id; }); }
    }
    return WS.arena.buildParty(b, cfg);
  }
  // Decides which troops run and which are skipped (with the reason).
  function plan(b, s) {
    var chs = chapters(b), chIndex = {};
    chs.forEach(function (c, i) { chIndex[c.id] = i; });
    var jobs = [], skipped = [];
    var troops = recs(b, 'trp_').slice().sort(function (a, z) {
      var ia = chIndex[a.chapter] == null ? 9999 : chIndex[a.chapter], iz = chIndex[z.chapter] == null ? 9999 : chIndex[z.chapter];
      return ia - iz;
    });
    troops.forEach(function (t) {
      if (s.chapter !== 'all' && t.chapter !== s.chapter) return;
      if (!t.chapter || chIndex[t.chapter] == null) { skipped.push({ troopId: t.id, name: t.name || t.id, reason: 'The troop is not tagged to a chapter.' }); return; }
      var eps = epsFor(b, t.chapter);
      if (s.mode === 'eps' && !eps) { skipped.push({ troopId: t.id, name: t.name || t.id, reason: 'Its chapter has no Expected Party State.' }); return; }
      if (!Array.isArray(t.members) || !t.members.length) { skipped.push({ troopId: t.id, name: t.name || t.id, reason: 'The troop has no enemies.' }); return; }
      var broken = t.members.some(function (m) { return !m || !recOf(b, m.enm); });
      if (broken) { skipped.push({ troopId: t.id, name: t.name || t.id, reason: 'The troop references an enemy that does not exist.' }); return; }
      var party = partyFor(b, s, t);
      if (!party.length) { skipped.push({ troopId: t.id, name: t.name || t.id, reason: 'No party could be built.' }); return; }
      jobs.push({
        idx: jobs.length, troopId: t.id, name: t.name || t.id, chapterId: t.chapter, chapterNo: chIndex[t.chapter] + 1,
        chapterName: chs[chIndex[t.chapter]].name || t.chapter, party: party, weatherId: s.weatherId || null,
        target: eps && typeof eps.targetWinRate === 'number' ? eps.targetWinRate : null, battles: s.battles,
        seed: (s.seed + jobs.length * SEED_STRIDE) >>> 0
      });
    });
    return { jobs: jobs, skipped: skipped };
  }

  // ------------------------------------------------------------------ worker
  // This function runs inside the Worker. It is stringified into the Blob after the ENGINE:BATTLE fence text, so it may only
  // use the ENGINE_BATTLE global and Worker APIs.
  function workerMain() {
    self.onmessage = function (e) {
      var m = e.data;
      if (!m || m.type !== 'run') return;
      var total = 0, done = 0, last = Date.now();
      m.jobs.forEach(function (j) { total += j.battles; });
      try {
        m.jobs.forEach(function (j) {
          var agg = { battles: 0, win: 0, lose: 0, flee: 0, timeout: 0, turns: [], hpSum: 0, mpSum: 0, ticksSum: 0, damage: {}, warnings: [], seedWin: null, seedLoss: null };
          var data = { ruleset: m.base.ruleset, records: m.base.records, party: j.party, troopId: j.troopId, weatherId: j.weatherId };
          for (var i = 0; i < j.battles; i++) {
            var seed = ((j.seed + i) >>> 0) || 1;
            var r = ENGINE_BATTLE.run(data, seed, null, { events: false }).result;
            agg.battles++;
            if (r.outcome === 'win') { agg.win++; if (agg.seedWin === null) agg.seedWin = seed; }
            else if (r.outcome === 'lose') { agg.lose++; if (agg.seedLoss === null) agg.seedLoss = seed; }
            else if (r.outcome === 'flee') agg.flee++;
            else agg.timeout++;
            agg.turns.push(r.turns);
            agg.ticksSum += r.ticks;
            agg.hpSum += r.resourcesUsed.hpPct;
            agg.mpSum += r.resourcesUsed.mpPct;
            for (var k = 0; k < r.damageLog.length; k++) {
              var d = r.damageLog[k];
              if (d.side !== 'foe') continue;
              var key = d.element || '_none';
              agg.damage[key] = (agg.damage[key] || 0) + d.value;
            }
            if (agg.warnings.length < 3 && r.warnings) for (var w = 0; w < r.warnings.length && agg.warnings.length < 3; w++) if (agg.warnings.indexOf(r.warnings[w]) < 0) agg.warnings.push(r.warnings[w]);
            done++;
            if (Date.now() - last > 80) { last = Date.now(); self.postMessage({ type: 'progress', done: done, total: total, idx: j.idx }); }
          }
          self.postMessage({ type: 'troop', idx: j.idx, agg: agg });
        });
        self.postMessage({ type: 'progress', done: total, total: total, idx: -1 });
        self.postMessage({ type: 'done' });
      } catch (err) {
        self.postMessage({ type: 'error', message: String(err && err.message ? err.message : err) });
      }
    };
  }
  function workerSource() {
    var eng = Kit.engine.source();
    if (!eng) throw new Error('The engine source could not be read from this page.');
    return eng + '\n;(' + workerMain.toString() + ')();\n';
  }
  WSX.workerSource = workerSource;

  // ------------------------------------------------------------------ running
  function toRow(job, agg) {
    var n = Math.max(1, agg.battles);
    var row = {
      idx: job.idx, troopId: job.troopId, name: job.name, chapterId: job.chapterId, chapterNo: job.chapterNo, chapterName: job.chapterName,
      battles: agg.battles, win: agg.win, lose: agg.lose, flee: agg.flee, timeout: agg.timeout,
      winPct: agg.win / n * 100, target: job.target, avgTurns: agg.turns.reduce(function (a, v) { return a + v; }, 0) / n,
      hpPct: agg.hpSum / n, mpPct: agg.mpSum / n, turns: agg.turns, damage: agg.damage, warnings: agg.warnings,
      seedWin: agg.seedWin, seedLoss: agg.seedLoss, chars: job.party.map(function (m) { return m.chr; })
    };
    row.gap = row.target == null ? null : row.winPct - row.target;
    row.flag = row.gap != null && Math.abs(row.gap) > 10 ? (row.gap < 0 ? 'hard' : 'easy') : null;
    return row;
  }
  function closeWorker() {
    if (!RUN) return;
    try { if (RUN.worker) RUN.worker.terminate(); } catch (e) {}
    try { if (RUN.url) URL.revokeObjectURL(RUN.url); } catch (e2) {}
    RUN.worker = null; RUN.url = null;
  }
  function finishRun(status, message) {
    if (!RUN) return;
    closeWorker();
    var rows = Object.keys(RUN.rows).map(function (k) { return RUN.rows[k]; }).sort(function (a, z) { return a.idx - z.idx; });
    LAST = { rows: rows, skipped: RUN.skipped, meta: RUN.meta, status: status, message: message || '', stamp: RUN.stamp };
    RUN = null;
    V.focus = 'all';
    if (V.host && document.getElementById('simRoot')) paintAll();
    if (status === 'done') Kit.ui.toast('Simulation finished: ' + rows.length + ' troop' + (rows.length === 1 ? '' : 's') + '.', 'ok');
    else if (status === 'cancelled') Kit.ui.toast('Simulation cancelled. ' + rows.length + ' troop' + (rows.length === 1 ? '' : 's') + ' finished.', 'warn');
    else Kit.ui.toast(message || 'The simulation failed.', 'error', 7000);
  }
  function startRun() {
    if (RUN) return;
    var b = cur(), s = defaultSetup(b);
    saveSetup(s);
    var chars = recs(b, 'chr_');
    if (!chars.length) { Kit.ui.toast('Author at least one character in Rules first.', 'warn'); return; }
    if (!s.chars.length) { Kit.ui.toast('Pick at least one party member.', 'warn'); return; }
    var p;
    try { p = plan(b, s); } catch (e) { Kit.ui.toast('Could not plan the run: ' + e.message, 'error', 7000); return; }
    if (!p.jobs.length) {
      LAST = { rows: [], skipped: p.skipped, meta: { battles: s.battles, seed: s.seed, chapter: s.chapter, mode: s.mode }, status: 'empty', message: '', stamp: b.kit.updatedAt };
      paintAll();
      Kit.ui.toast('No troop can run with these settings.', 'warn');
      return;
    }
    var src, url, worker;
    try {
      src = workerSource();
      if (typeof Worker !== 'function' || typeof Blob !== 'function') throw new Error('This browser does not support Web Workers.');
      url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      worker = new Worker(url);
    } catch (e) {
      if (url) { try { URL.revokeObjectURL(url); } catch (e3) {} }
      LAST = { rows: [], skipped: [], meta: null, status: 'noworker', message: 'The simulator could not start a Web Worker (' + (e && e.message ? e.message : 'unknown error') + '). Nothing was run. The simulator does not fall back to the main thread.', stamp: b.kit.updatedAt };
      paintAll();
      Kit.ui.toast('The simulator could not start a Web Worker.', 'error', 7000);
      return;
    }
    var total = 0;
    p.jobs.forEach(function (j) { total += j.battles; });
    RUN = { worker: worker, url: url, total: total, done: 0, idx: 0, jobs: p.jobs, rows: {}, skipped: p.skipped, stamp: b.kit.updatedAt, status: 'running', startedAt: Date.now(),
      meta: { battles: s.battles, seed: s.seed, chapter: s.chapter, mode: s.mode, weatherId: s.weatherId || null, level: s.level, gearTier: s.gearTier } };
    worker.onmessage = function (e) {
      var m = e.data;
      if (!RUN || !m) return;
      if (m.type === 'progress') { RUN.done = m.done; if (m.idx >= 0) RUN.idx = m.idx; paintProgress(); }
      else if (m.type === 'troop') { RUN.rows[m.idx] = toRow(RUN.jobs[m.idx], m.agg); RUN.done = Math.max(RUN.done, 0); paintProgress(); }
      else if (m.type === 'done') finishRun('done');
      else if (m.type === 'error') finishRun('error', 'The simulation stopped: ' + m.message);
    };
    worker.onerror = function (e) { finishRun('error', 'The simulation worker failed' + (e && e.message ? ': ' + e.message : '.')); };
    worker.postMessage({ type: 'run', base: { ruleset: rs(b), records: b.rules || {} }, jobs: p.jobs });
    paintAll();
  }
  function cancelRun() {
    if (!RUN) return;
    finishRun('cancelled');
  }
  WSX.run = startRun;
  WSX.cancel = cancelRun;
  WSX.last = function () { return LAST; };
  WSX.running = function () { return !!RUN; };

  // ------------------------------------------------------------------ view helpers
  function field(label, node, help) {
    var f = el('div', 'field');
    var l = el('label', 'field-label'); l.textContent = label;
    if (node.id) l.htmlFor = node.id;
    f.appendChild(l);
    var body = el('div', 'field-body'); body.appendChild(node); f.appendChild(body);
    if (help) { var h = el('div', 'field-help'); h.textContent = help; f.appendChild(h); }
    return f;
  }
  function select(id, options, value, onChange) {
    var sel = el('select', 'inp'); sel.id = id;
    options.forEach(function (o) { var op = el('option'); op.value = o.value; op.textContent = o.label; if (String(o.value) === String(value)) op.selected = true; sel.appendChild(op); });
    sel.addEventListener('change', function () { onChange(sel.value); });
    return sel;
  }
  function numInput(id, value, min, max, onChange) {
    var inp = el('input', 'inp'); inp.id = id; inp.type = 'number'; inp.inputMode = 'numeric'; inp.min = String(min); inp.max = String(max); inp.step = '1'; inp.value = String(value);
    inp.addEventListener('change', function () { var v = clampInt(inp.value, min, max, value); inp.value = String(v); onChange(v); });
    return inp;
  }
  function cssVar(n, d) { try { var v = getComputedStyle(document.documentElement).getPropertyValue(n).trim(); return v || d; } catch (e) { return d; } }
  function shortName(n, max) { n = String(n || ''); return n.length > max ? n.slice(0, max - 3) + '...' : n; }

  // ------------------------------------------------------------------ rendering
  WSX.render = function (host) {
    V.host = host;
    U.clear(host);
    var root = el('div', 'sim-root'); root.id = 'simRoot';
    host.appendChild(root);
    paintAll();
  };
  function destroyCharts() {
    Object.keys(CHARTS).forEach(function (k) { try { CHARTS[k].destroy(); } catch (e) {} });
    CHARTS = {};
  }
  function paintAll() {
    var root = document.getElementById('simRoot');
    if (!root) return;
    destroyCharts();
    U.clear(root);
    var b = cur(), s = defaultSetup(b);
    var setupPanel = el('section', 'panel sim-setup'); setupPanel.id = 'simSetup';
    root.appendChild(setupPanel);
    paintSetup(setupPanel, b, s);
    var out = el('div', 'sim-out'); out.id = 'simOut';
    root.appendChild(out);
    paintResults(out, b, s);
  }
  function paintSetup(box, b, s) {
    U.clear(box);
    var running = !!RUN;
    box.appendChild(el('h2', 'panel-title', 'Simulator'));
    box.appendChild(el('p', 'sim-lead', 'Runs every troop tagged to a chapter again and again against a party and charts how the fights balance. Each battle is fought by the engine with the default party policy, inside a Web Worker.'));
    var grid = el('div', 'form-grid sim-grid');
    box.appendChild(grid);
    var chs = chapters(b);
    var chOpts = [{ value: 'all', label: 'All chapters' }].concat(chs.map(function (c, i) { return { value: c.id, label: 'Ch ' + (i + 1) + ': ' + (c.name || c.id) }; }));
    var selCh = select('simChapter', chOpts, s.chapter, function (v) { s.chapter = v; saveSetup(s); });
    selCh.disabled = running;
    grid.appendChild(field('Chapter', selCh));
    var nb = numInput('simBattles', s.battles, 1, 5000, function (v) { s.battles = v; saveSetup(s); });
    nb.disabled = running;
    grid.appendChild(field('Battles per troop', nb, '1 to 5000. Default 200.'));
    var seedRow = el('div', 'ar-seedrow');
    var sd = numInput('simSeed', s.seed, 1, 2147483646, function (v) { s.seed = v; saveSetup(s); });
    sd.disabled = running;
    seedRow.appendChild(sd);
    var dice = el('button', 'btn', '<span class="lbl">Random</span>'); dice.type = 'button'; dice.disabled = running;
    dice.addEventListener('click', function () { s.seed = randomSeed(); saveSetup(s); sd.value = String(s.seed); });
    seedRow.appendChild(dice);
    grid.appendChild(field('Base seed', seedRow, 'Battle k of troop t uses base + t x ' + SEED_STRIDE + ' + k.'));
    var wOpts = [{ value: '', label: 'Clear (no weather)' }].concat(recs(b, 'wth_').map(function (w) { return { value: w.id, label: w.name || w.id }; }));
    var selW = select('simWeather', wOpts, s.weatherId || '', function (v) { s.weatherId = v || null; saveSetup(s); });
    selW.disabled = running;
    grid.appendChild(field('Weather', selW));

    box.appendChild(el('h3', 'section-h', 'Party'));
    var seg = el('div', 'ar-seg'); seg.setAttribute('role', 'group'); seg.setAttribute('aria-label', 'Party source');
    [['eps', 'Expected Party State'], ['custom', 'Custom']].forEach(function (o) {
      var bt = el('button'); bt.type = 'button'; bt.textContent = o[1]; bt.disabled = running;
      bt.setAttribute('aria-pressed', s.mode === o[0] ? 'true' : 'false');
      bt.addEventListener('click', function () { s.mode = o[0]; saveSetup(s); paintSetup(box, b, s); });
      seg.appendChild(bt);
    });
    box.appendChild(seg);
    box.appendChild(el('p', 'ar-note', s.mode === 'eps'
      ? 'Each troop is fought by the party its chapter expects: the level, gear tier, materia, jobs, or classes from that chapter\'s Expected Party State.'
      : 'Every troop is fought by one custom party at the level and gear tier below.'));
    var chars = recs(b, 'chr_');
    if (!chars.length) box.appendChild(el('div', 'empty-line', 'Author characters in Rules to field a party.'));
    var pick = el('div', 'ar-chars');
    chars.forEach(function (c) {
      var on = s.chars.indexOf(c.id) >= 0;
      var bt = el('button', 'ar-pick', esc(c.name || c.id)); bt.type = 'button'; bt.disabled = running;
      bt.setAttribute('aria-pressed', on ? 'true' : 'false');
      bt.addEventListener('click', function () {
        var k = s.chars.indexOf(c.id);
        if (k >= 0) s.chars.splice(k, 1);
        else if (s.chars.length >= PARTY_MAX) { Kit.ui.toast('A party holds at most ' + PARTY_MAX + '.', 'warn'); return; }
        else s.chars.push(c.id);
        saveSetup(s); paintSetup(box, b, s);
      });
      pick.appendChild(bt);
    });
    box.appendChild(pick);
    if (s.mode === 'custom') {
      var cg = el('div', 'form-grid sim-grid');
      var lv = numInput('simLevel', s.level, 1, 99, function (v) { s.level = v; saveSetup(s); }); lv.disabled = running;
      cg.appendChild(field('Level', lv));
      var gt = numInput('simGear', s.gearTier, 1, 9, function (v) { s.gearTier = v; saveSetup(s); }); gt.disabled = running;
      cg.appendChild(field('Gear tier', gt));
      box.appendChild(cg);
      if (rs(b).progression === 'materia') {
        var mats = recs(b, 'mat_');
        if (mats.length) {
          box.appendChild(el('h3', 'section-h', 'Materia'));
          var mp = el('div', 'ar-chars');
          mats.forEach(function (m) {
            var on = s.materia.indexOf(m.id) >= 0;
            var bt = el('button', 'ar-pick', esc(m.name || m.id)); bt.type = 'button'; bt.disabled = running;
            bt.setAttribute('aria-pressed', on ? 'true' : 'false');
            bt.addEventListener('click', function () { var k = s.materia.indexOf(m.id); if (k >= 0) s.materia.splice(k, 1); else s.materia.push(m.id); saveSetup(s); paintSetup(box, b, s); });
            mp.appendChild(bt);
          });
          box.appendChild(mp);
        }
      }
    }

    var bar = el('div', 'btn-row sim-actions');
    var go = el('button', 'btn btn-primary', Kit.icon('sword') + '<span class="lbl">' + (running ? 'Running...' : 'Run simulation') + '</span>'); go.type = 'button'; go.id = 'simRun'; go.disabled = running;
    go.addEventListener('click', startRun);
    bar.appendChild(go);
    if (running) {
      var cx = el('button', 'btn btn-danger', Kit.icon('x') + '<span class="lbl">Cancel</span>'); cx.type = 'button'; cx.id = 'simCancel';
      cx.addEventListener('click', cancelRun);
      bar.appendChild(cx);
    }
    box.appendChild(bar);
    var prog = el('div', 'sim-progress'); prog.id = 'simProgress'; prog.hidden = !running;
    prog.innerHTML = '<div class="sim-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Simulation progress"><i id="simBar"></i></div><div class="sim-progtext" id="simProgText" aria-live="polite"></div>';
    box.appendChild(prog);
    if (running) paintProgress();
  }
  function paintProgress() {
    if (!RUN) return;
    var bar = document.getElementById('simBar'), txt = document.getElementById('simProgText'), tr = bar && bar.parentNode;
    if (!bar || !txt) return;
    var p = RUN.total ? Math.min(100, Math.round(RUN.done / RUN.total * 100)) : 0;
    bar.style.width = p + '%';
    if (tr) tr.setAttribute('aria-valuenow', String(p));
    var finished = Object.keys(RUN.rows).length;
    txt.textContent = p + ' percent, ' + RUN.done + ' of ' + RUN.total + ' battles, ' + finished + ' of ' + RUN.jobs.length + ' troops finished';
    // Keep the partial table current while the run goes.
    var out = document.getElementById('simOut');
    if (out && out.getAttribute('data-finished') !== String(finished)) {
      out.setAttribute('data-finished', String(finished));
      destroyCharts();
      U.clear(out);
      paintResults(out, cur(), defaultSetup(cur()));
    }
  }

  function currentRows() {
    if (RUN) return { rows: Object.keys(RUN.rows).map(function (k) { return RUN.rows[k]; }).sort(function (a, z) { return a.idx - z.idx; }), skipped: RUN.skipped, meta: RUN.meta, status: 'running', stamp: RUN.stamp };
    return LAST;
  }
  function paintResults(box, b, s) {
    var d = currentRows();
    if (!d) {
      var e0 = el('section', 'panel sim-empty');
      e0.innerHTML = '<h3>No results yet</h3><p>Run the simulation to see the win rate of every troop against its target, how long fights last, what they cost, and where the damage comes from.</p>';
      var b0 = el('button', 'btn btn-primary', Kit.icon('sword') + '<span class="lbl">Run simulation</span>'); b0.type = 'button';
      b0.addEventListener('click', startRun);
      e0.appendChild(b0);
      box.appendChild(e0);
      return;
    }
    if (d.status === 'noworker') {
      box.appendChild(el('section', 'panel sim-error', '<h3>Simulator unavailable</h3><p class="msg msg-error">' + esc(d.message) + '</p>'));
      return;
    }
    if (d.status === 'error') box.appendChild(el('section', 'panel sim-error', '<p class="msg msg-error">' + esc(d.message) + '</p>'));
    var rows = d.rows || [];
    if (!rows.length) {
      var e1 = el('section', 'panel sim-empty');
      var lines = (d.skipped || []).map(function (k) { return '<li><strong>' + esc(k.name) + '</strong>: ' + esc(k.reason) + '</li>'; }).join('');
      var title = d.status === 'running' ? 'Waiting for the first troop' : d.status === 'cancelled' ? 'Cancelled before any troop finished' : 'Nothing to simulate';
      var text = d.status === 'running' ? 'The first results appear when one troop finishes all of its battles.' : d.status === 'cancelled' ? 'A troop is only reported once all of its battles are done. Run again with fewer battles per troop to see results sooner.' : 'No troop matched these settings. Tag troops to a chapter in Rules and give each chapter an Expected Party State.';
      e1.innerHTML = '<h3>' + title + '</h3><p>' + text + '</p>' +
        (lines ? '<ul class="sim-skips">' + lines + '</ul>' : '');
      box.appendChild(e1);
      return;
    }
    // summary
    var flagged = rows.filter(function (r) { return r.flag; }).length;
    var totalBattles = rows.reduce(function (a, r) { return a + r.battles; }, 0);
    var sum = el('section', 'panel sim-summary');
    var stale = !RUN && d.stamp && b.kit.updatedAt !== d.stamp;
    sum.innerHTML = '<h2 class="panel-title">Results</h2><div class="sim-chips">' +
      '<span class="chip">' + rows.length + ' troop' + (rows.length === 1 ? '' : 's') + '</span>' +
      '<span class="chip">' + totalBattles + ' battles</span>' +
      '<span class="chip ' + (flagged ? 'chip-warning' : 'chip-ok') + '">' + flagged + ' off target</span>' +
      (d.skipped && d.skipped.length ? '<span class="chip chip-muted">' + d.skipped.length + ' skipped</span>' : '') +
      (d.status === 'running' ? '<span class="chip chip-accent">partial, still running</span>' : '') +
      (d.status === 'cancelled' ? '<span class="chip chip-warning">cancelled, partial</span>' : '') +
      (stale ? '<span class="chip chip-warning">the project changed since this run</span>' : '') +
      '</div>';
    box.appendChild(sum);
    paintTable(box, b, rows, d);
    paintCharts(box, b, rows);
  }
  function statusChip(r) {
    if (r.target == null) return '<span class="chip chip-muted">no target</span>';
    if (!r.flag) return '<span class="chip chip-ok">on target</span>';
    return r.flag === 'hard' ? '<span class="chip chip-error">too hard</span>' : '<span class="chip chip-warning">too easy</span>';
  }
  function paintTable(box, b, rows, d) {
    var sec = el('section', 'panel sim-table');
    sec.appendChild(el('h3', 'section-h', 'Win rate by troop'));
    sec.appendChild(el('p', 'ar-note', 'A troop is flagged when its win rate is more than 10 points from its chapter\'s target.'));
    var wrap = el('div', 'tbl-wrap');
    var tb = el('table', 'tbl sim-tbl');
    tb.innerHTML = '<thead><tr><th>Troop</th><th>Chapter</th><th>Win</th><th>Target</th><th>Gap</th><th>Turns</th><th>HP</th><th>MP</th><th>Status</th><th>Fix</th></tr></thead>';
    var body = el('tbody');
    rows.forEach(function (r) {
      var tr = el('tr', r.flag ? 'is-flag' : '');
      tr.setAttribute('data-troop', r.troopId);
      tr.innerHTML = '<th scope="row">' + esc(r.name) + '<small class="mono">' + esc(r.troopId) + '</small></th>' +
        '<td>' + r.chapterNo + '. ' + esc(shortName(r.chapterName, 22)) + '</td>' +
        '<td>' + pct(r.winPct) + '<small>' + r.win + ' of ' + r.battles + '</small></td>' +
        '<td>' + (r.target == null ? '-' : pct(r.target)) + '</td>' +
        '<td>' + (r.gap == null ? '-' : (r.gap > 0 ? '+' : '') + (Math.round(r.gap * 10) / 10).toFixed(1)) + '</td>' +
        '<td>' + (Math.round(r.avgTurns * 10) / 10).toFixed(1) + '</td>' +
        '<td>' + pct(r.hpPct) + '</td><td>' + pct(r.mpPct) + '</td>' +
        '<td>' + statusChip(r) + (r.timeout ? '<small>' + r.timeout + ' timed out</small>' : '') + '</td>';
      var fix = el('td', 'sim-fix');
      if (r.flag) {
        var t = recOf(b, r.troopId);
        var bT = el('button', 'btn', 'Troop'); bT.type = 'button'; bT.title = 'Open this troop in Rules';
        bT.addEventListener('click', function () { Kit.jump(r.troopId); });
        fix.appendChild(bT);
        var seen = {};
        var enemies = (t && Array.isArray(t.members) ? t.members : []).map(function (m) { return m && m.enm; }).filter(function (id) { if (!id || seen[id]) return false; seen[id] = 1; return !!recOf(b, id); });
        enemies.slice(0, 3).forEach(function (id) {
          var en = recOf(b, id);
          var bE = el('button', 'btn', 'Enemy: ' + esc(shortName(en.name || id, 14))); bE.type = 'button'; bE.title = 'Open this enemy in Rules';
          bE.addEventListener('click', function () { Kit.jump(id); });
          fix.appendChild(bE);
        });
        var bA = el('button', 'btn btn-primary', 'Arena'); bA.type = 'button'; bA.title = 'Fight this troop with the same party and a recorded seed';
        bA.addEventListener('click', function () { openArena(r, d.meta); });
        fix.appendChild(bA);
      } else fix.appendChild(el('span', 'muted', '-'));
      tr.appendChild(fix);
      body.appendChild(tr);
    });
    tb.appendChild(body);
    wrap.appendChild(tb);
    sec.appendChild(wrap);
    if (d.skipped && d.skipped.length) {
      var sk = el('div', 'sim-skipbox');
      sk.appendChild(el('h4', 'sim-skiph', 'Skipped troops'));
      var ul = el('ul', 'sim-skips');
      d.skipped.forEach(function (k) { ul.appendChild(el('li', '', '<strong>' + esc(k.name) + '</strong>: ' + esc(k.reason))); });
      sk.appendChild(ul);
      sec.appendChild(sk);
    }
    box.appendChild(sec);
  }
  // Loads the Arena with the same party and a seed from this run (a lost battle for a troop that is too hard, a won one when too easy).
  function openArena(r, meta) {
    var cfg = Kit.store.get('saga146:arena:setup', null);
    cfg = U.isObj(cfg) ? cfg : {};
    cfg.chars = r.chars.slice(0, PARTY_MAX);
    cfg.weatherId = meta && meta.weatherId ? meta.weatherId : null;
    var source = r.chapterId;
    if (meta && meta.mode === 'custom') { source = 'custom'; cfg.level = meta.level; cfg.gearTier = meta.gearTier; cfg.materia = cur() ? (defaultSetup(cur()).materia || []) : []; }
    cfg.source = source;
    Kit.store.set('saga146:arena:setup', cfg);
    var seed = r.flag === 'easy' ? (r.seedWin || r.seedLoss) : (r.seedLoss || r.seedWin);
    window.WS.arena.preload(r.troopId, { source: source, seed: seed || undefined });
  }

  // ------------------------------------------------------------------ charts
  function chartBox(title, id, help) {
    var p = el('section', 'panel sim-chartpanel');
    var h = el('div', 'sim-charthead');
    h.appendChild(el('h3', 'section-h', title));
    p.appendChild(h);
    if (help) p.appendChild(el('p', 'ar-note', help));
    var holder = el('div', 'sim-chart'); holder.id = id;
    p.appendChild(holder);
    return { panel: p, holder: holder, head: h };
  }
  function fallbackTable(holder, labels, sets) {
    var wrap = el('div', 'tbl-wrap');
    var tb = el('table', 'tbl');
    var th = '<thead><tr><th></th>' + sets.map(function (x) { return '<th>' + esc(x.label) + '</th>'; }).join('') + '</tr></thead>';
    var bd = labels.map(function (l, i) { return '<tr><th scope="row">' + esc(l) + '</th>' + sets.map(function (x) { return '<td>' + (Math.round(num(x.data[i]) * 10) / 10) + '</td>'; }).join('') + '</tr>'; }).join('');
    tb.innerHTML = th + '<tbody>' + bd + '</tbody>';
    wrap.appendChild(tb);
    holder.classList.add('is-table');
    holder.appendChild(wrap);
    holder.appendChild(el('p', 'ar-note', 'Chart.js could not load, so the numbers are shown as a table.'));
  }
  function drawChart(holder, key, cfg, labels, sets, alt) {
    if (typeof window.Chart !== 'function') { fallbackTable(holder, labels, sets); return; }
    var canvas = el('canvas'); canvas.setAttribute('role', 'img'); canvas.setAttribute('aria-label', alt);
    holder.appendChild(canvas);
    try { CHARTS[key] = new window.Chart(canvas.getContext('2d'), cfg); }
    catch (e) { U.clear(holder); fallbackTable(holder, labels, sets); }
  }
  function baseOptions(yTitle, xTitle) {
    var ink = cssVar('--ink2', '#c4bba3'), grid = cssVar('--line', '#323a52');
    return {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { labels: { color: ink, boxWidth: 12 } }, tooltip: { intersect: false, mode: 'index' } },
      scales: {
        x: { ticks: { color: ink, maxRotation: 50, autoSkip: true }, grid: { color: grid }, title: { display: !!xTitle, text: xTitle || '', color: ink } },
        y: { beginAtZero: true, ticks: { color: ink }, grid: { color: grid }, title: { display: !!yTitle, text: yTitle || '', color: ink } }
      }
    };
  }
  function focusRows(rows) { return V.focus === 'all' ? rows : rows.filter(function (r) { return r.troopId === V.focus; }); }
  function paintCharts(box, b, rows) {
    var grid = el('div', 'sim-charts');
    box.appendChild(grid);
    var ok = cssVar('--ok', '#86cf88'), danger = cssVar('--danger', '#f07a6e'), accent = cssVar('--accent', '#e3b453'), fwd = cssVar('--fwd', '#b1a1ff'), ink = cssVar('--ink2', '#c4bba3');
    var labels = rows.map(function (r) { return shortName(r.name, 16); });

    // 1. win rate by troop with the target line
    var c1 = chartBox('Win rate by troop', 'simChart1', 'Bars are the simulated win rate. The dashed line is the target from the chapter\'s Expected Party State.');
    c1.panel.classList.add('is-wide');
    grid.appendChild(c1.panel);
    var win = rows.map(function (r) { return Math.round(r.winPct * 10) / 10; });
    var tgt = rows.map(function (r) { return r.target == null ? null : r.target; });
    var o1 = baseOptions('Win rate (%)');
    o1.scales.y.max = 100;
    drawChart(c1.holder, 'win', {
      type: 'bar',
      data: { labels: labels, datasets: [
        { type: 'bar', label: 'Win rate', data: win, backgroundColor: rows.map(function (r) { return r.flag ? (r.flag === 'hard' ? danger : accent) : ok; }), borderWidth: 0, order: 2 },
        { type: 'line', label: 'Target', data: tgt, borderColor: ink, backgroundColor: ink, borderDash: [6, 4], borderWidth: 2, pointStyle: 'rectRot', pointRadius: 5, spanGaps: true, order: 1 }
      ] },
      options: o1
    }, labels, [{ label: 'Win %', data: win }, { label: 'Target %', data: tgt.map(function (v) { return v == null ? 0 : v; }) }], 'Bar chart of simulated win rate per troop with a target line.');

    // 3. resource cost
    var c3 = chartBox('Resource cost', 'simChart3', 'Average HP lost and MP spent per battle, as a percent of the party\'s maximum.');
    c3.panel.classList.add('is-wide');
    grid.appendChild(c3.panel);
    var hp = rows.map(function (r) { return Math.round(r.hpPct * 10) / 10; }), mp = rows.map(function (r) { return Math.round(r.mpPct * 10) / 10; });
    var o3 = baseOptions('Percent of maximum (%)');
    drawChart(c3.holder, 'cost', {
      type: 'bar', data: { labels: labels, datasets: [
        { label: 'HP lost', data: hp, backgroundColor: danger, borderWidth: 0 },
        { label: 'MP spent', data: mp, backgroundColor: fwd, borderWidth: 0 }
      ] }, options: o3
    }, labels, [{ label: 'HP %', data: hp }, { label: 'MP %', data: mp }], 'Grouped bar chart of HP lost and MP spent per troop.');

    // troop picker for charts 2 and 4
    var pick = el('div', 'sim-pickrow');
    var selOpts = [{ value: 'all', label: 'All troops' }].concat(rows.map(function (r) { return { value: r.troopId, label: r.name }; }));
    if (V.focus !== 'all' && !rows.some(function (r) { return r.troopId === V.focus; })) V.focus = 'all';
    var sel = select('simFocus', selOpts, V.focus, function (v) {
      V.focus = v;
      var out = document.getElementById('simOut');
      if (out) { destroyCharts(); U.clear(out); paintResults(out, cur(), defaultSetup(cur())); }
    });
    pick.appendChild(field('Turns and damage charts show', sel));
    grid.appendChild(pick);

    var fr = focusRows(rows);
    var fLabel = V.focus === 'all' ? 'all troops' : (fr[0] ? fr[0].name : '');

    // 2. turn count distribution
    var c2 = chartBox('Turn count distribution', 'simChart2', 'How many turns each battle lasted, for ' + fLabel + '.');
    grid.appendChild(c2.panel);
    var all = [];
    fr.forEach(function (r) { r.turns.forEach(function (t) { all.push(t); }); });
    var maxT = all.reduce(function (a, v) { return Math.max(a, v); }, 1);
    var width = Math.max(1, Math.ceil(maxT / 20)), nb = Math.ceil(maxT / width) + 1, bins = [], bl = [], i;
    for (i = 0; i < nb; i++) { bins.push(0); bl.push(width === 1 ? String(i) : (i * width) + '-' + (i * width + width - 1)); }
    all.forEach(function (t) { bins[Math.min(nb - 1, Math.floor(t / width))]++; });
    var o2 = baseOptions('Battles', 'Turns');
    o2.plugins.legend.display = false;
    drawChart(c2.holder, 'turns', {
      type: 'bar', data: { labels: bl, datasets: [{ label: 'Battles', data: bins, backgroundColor: fwd, borderWidth: 0 }] }, options: o2
    }, bl, [{ label: 'Battles', data: bins }], 'Histogram of battle lengths in turns for ' + fLabel + '.');

    // 4. damage spread by element
    var c4 = chartBox('Damage by element', 'simChart4', 'Total party damage dealt to foes, for ' + fLabel + '.');
    grid.appendChild(c4.panel);
    var elements = (rs(b).elements || []).filter(function (e) { return e && e.key; });
    var tot = {};
    fr.forEach(function (r) { Object.keys(r.damage).forEach(function (k) { tot[k] = (tot[k] || 0) + r.damage[k]; }); });
    var keys = elements.map(function (e) { return e.key; });
    Object.keys(tot).forEach(function (k) { if (k !== NONE && keys.indexOf(k) < 0) keys.push(k); });
    keys.push(NONE);
    var el4 = keys.map(function (k) { if (k === NONE) return 'Neutral'; var e = elements.filter(function (x) { return x.key === k; })[0]; return e ? (e.label || k) : k; });
    var dv = keys.map(function (k) { return Math.round(tot[k] || 0); });
    var dc = keys.map(function (k) { var e = elements.filter(function (x) { return x.key === k; })[0]; return e && /^#[0-9a-f]{6}$/i.test(e.color || '') ? e.color : (k === NONE ? '#8c8778' : accent); });
    var o4 = baseOptions(null, 'Damage');
    o4.indexAxis = 'y'; o4.plugins.legend.display = false;
    o4.scales.y = { ticks: { color: ink }, grid: { color: cssVar('--line', '#323a52') } };
    o4.scales.x.beginAtZero = true;
    drawChart(c4.holder, 'dmg', {
      type: 'bar', data: { labels: el4, datasets: [{ label: 'Damage', data: dv, backgroundColor: dc, borderWidth: 0 }] }, options: o4
    }, el4, [{ label: 'Damage', data: dv }], 'Bar chart of party damage by element for ' + fLabel + '.');
  }

  Kit.on('theme', function () { if (Kit.active() === 'sim' && document.getElementById('simRoot')) paintAll(); });
  Kit.on('load', function () { LAST = null; });
  Kit.mount('sim', { title: 'Simulator', icon: 'chart', canEnter: WSX.canEnter, render: WSX.render, onLeave: function () { destroyCharts(); V.host = null; return true; } });
})();
// === WS:SIM END ===
