// === WS:RULES BEGIN ===
(function () {
  'use strict';
  var U = Kit.util;
  var WSX = window.WS.rules = { id: 'rules' };
  var UI_KEY = 'saga146:rules:ui';
  var STAT_PATH = 'charter.ruleset.stats', ELEM_PATH = 'charter.ruleset.elements', TAX_PATH = 'charter.ruleset.taxonomy';
  var KEY_RE = /^[a-z][a-z0-9]*$/;
  var uidn = 0;

  function cur() { return Kit.bundle.current(); }
  function rsOf(b) { b = b || cur(); return b && b.charter && U.isObj(b.charter.ruleset) ? b.charter.ruleset : {}; }
  function alive(n) { return !!n && document.contains(n); }
  function el(tag, cls, html) { return U.el(tag, cls, html); }
  function esc(s) { return U.esc(s); }
  function hasOwn(o, k) { return o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k); }
  function uiGet() { var s = Kit.store.get(UI_KEY, {}); return U.isObj(s) ? s : {}; }
  function uiSet(patch) { var s = uiGet(); Object.keys(patch).forEach(function (k) { s[k] = patch[k]; }); Kit.store.set(UI_KEY, s); return s; }
  function button(label, icon, cls, fn) {
    var b = el('button', 'btn' + (cls ? ' ' + cls : ''), (icon ? Kit.icon(icon) : '') + '<span>' + esc(label) + '</span>');
    b.type = 'button';
    if (fn) b.addEventListener('click', fn);
    return b;
  }
  function iconButton(icon, label, fn, cls) {
    var b = el('button', 'btn btn-ghost btn-icon' + (cls ? ' ' + cls : ''), Kit.icon(icon));
    b.type = 'button'; b.setAttribute('aria-label', label); b.title = label;
    if (fn) b.addEventListener('click', fn);
    return b;
  }
  function cap1(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }

  WSX.canEnter = function (b) {
    if (!b || !b.charter.locked) return 'Lock the Charter to open Rules.';
    if (!b.codex.version || !Object.keys(b.codex.types || {}).length) return 'Generate the Codex to open Rules.';
    var c = window.WS.codex && window.WS.codex.check ? window.WS.codex.check(b) : { ok: true };
    if (!c.ok) return c.state === 'stale' ? 'Regenerate the Codex after the Charter amendment to open Rules.' : 'Fix the Codex issues to open Rules.';
    return true;
  };

  // ---------------------------------------------------------------- formula library
  // Mirror of the template registry that ENGINE:BATTLE implements in Pass 5. Parameter names and defaults are the
  // contract. Each template is also written as a safe expression so the previews and the engine can be compared.
  var FORMULA_ORDER = ['phys.ff6', 'mag.ff6', 'phys.sub', 'mag.flat', 'heal.std', 'var.std', 'exp.curve', 'ap.curve', 'atb.fill'];
  var FORMULA_LIB = {
    'phys.ff6': {
      id: 'phys.ff6', role: 'phys', kind: 'damage', label: 'Physical damage, FF6 style',
      expr: 'max(p.floor, floor((power + a.level * a.level * a.str / p.levelDiv) * (p.defBase - min(t.def, p.defBase - 1)) / p.defBase * p.mult))',
      params: { levelDiv: 256, defBase: 256, mult: 1, floor: 1 },
      note: 'Base damage grows with the square of the attacker level, then the target defense scales it down.'
    },
    'mag.ff6': {
      id: 'mag.ff6', role: 'mag', kind: 'damage', label: 'Magic damage, FF6 style',
      expr: 'max(p.floor, floor((power * p.powerMult + a.level * a.mag * power / p.levelDiv) * (p.defBase - min(t.mdef, p.defBase - 1)) / p.defBase))',
      params: { powerMult: 4, levelDiv: 32, defBase: 256, floor: 1 },
      note: 'Spell power dominates. Level and magic add to it, and magic defense scales the total down.'
    },
    'phys.sub': {
      id: 'phys.sub', role: 'phys', kind: 'damage', label: 'Physical damage, subtractive',
      expr: 'max(p.floor, floor(a.str * p.atkMult + power - t.def * p.defMult))',
      params: { atkMult: 1, defMult: 0.5, floor: 1 },
      note: 'Attack plus power minus a share of defense. Simple and easy to balance by hand.'
    },
    'mag.flat': {
      id: 'mag.flat', role: 'mag', kind: 'damage', label: 'Magic damage, flat',
      expr: 'max(p.floor, floor(power + a.mag * p.magMult - t.mdef * p.mdefMult))',
      params: { magMult: 1, mdefMult: 0.5, floor: 1 },
      note: 'Spell power plus magic minus a share of magic defense.'
    },
    'heal.std': {
      id: 'heal.std', role: 'heal', kind: 'heal', label: 'Healing, standard',
      expr: 'max(p.floor, floor((power + a.mag * p.magMult) * p.mult))',
      params: { magMult: 2, mult: 1, floor: 1 },
      note: 'Spell power plus magic, then a multiplier. Heal inversion for undead is applied by the engine.'
    },
    'var.std': {
      id: 'var.std', role: 'var', kind: 'variance', label: 'Damage variance',
      expr: '1 + p.spread * (2 * p.roll - 1)',
      params: { spread: 0.1, roll: 0.5 },
      note: 'A multiplier around one. The engine feeds roll from the seeded random stream, between 0 and 1.'
    },
    'exp.curve': {
      id: 'exp.curve', role: 'exp', kind: 'curve', label: 'EXP needed to reach a level',
      expr: 'floor(p.base * pow(max(a.level - 1, 0), p.exponent))',
      params: { base: 40, exponent: 2.1 },
      note: 'Total EXP required to reach level a.level. Sweep the level to see the whole curve.'
    },
    'ap.curve': {
      id: 'ap.curve', role: 'ap', kind: 'curve', label: 'AP needed to advance a level',
      expr: 'floor(p.base * pow(p.growth, max(a.level - 1, 0)))',
      params: { base: 100, growth: 2 },
      note: 'AP needed to move from level a.level to the next one. Used for materia levels.'
    },
    'atb.fill': {
      id: 'atb.fill', role: 'atb', kind: 'rate', label: 'ATB gauge fill per tick',
      expr: 'floor((a.spd + p.spdOffset) * p.rate)',
      params: { spdOffset: 20, rate: 8 },
      note: 'Gauge units added each tick. The gauge holds 65536 units.'
    }
  };
  WSX.FORMULA_LIB = FORMULA_LIB;
  WSX.FORMULA_ORDER = FORMULA_ORDER;

  function statKeys(b) {
    var st = rsOf(b).stats;
    return (Array.isArray(st) ? st : []).map(function (s) { return U.isObj(s) ? String(s.key || '') : ''; }).filter(Boolean);
  }
  function numericParams(o) {
    var out = {};
    if (U.isObj(o)) Object.keys(o).forEach(function (k) { if (typeof o[k] === 'number' && isFinite(o[k])) out[k] = o[k]; });
    return out;
  }
  function libSource(id) {
    var l = FORMULA_LIB[id];
    return l ? { id: l.id, label: l.label, kind: l.kind, expr: l.expr, params: U.clone(l.params), template: l.id, note: l.note } : null;
  }
  // A frm_ record resolves to an expression plus its parameters. A template wins over an expression.
  function recordSource(rec) {
    if (!U.isObj(rec)) return null;
    var over = numericParams(rec.params), params;
    if (rec.template && FORMULA_LIB[rec.template]) {
      var lib = FORMULA_LIB[rec.template];
      params = Object.assign(U.clone(lib.params), over);
      return { id: rec.id, label: rec.name || lib.label, kind: lib.kind, expr: lib.expr, params: params, template: rec.template, note: lib.note };
    }
    if (typeof rec.expr === 'string' && rec.expr.trim()) return { id: rec.id, label: rec.name || 'Formula', kind: 'custom', expr: rec.expr, params: over, template: null };
    return null;
  }
  // id may be a template id or a frm_ record id.
  WSX.formulaSource = function (id) {
    if (FORMULA_LIB[id]) return libSource(id);
    if (typeof id === 'string' && Kit.ids.isValid(id) && Kit.ids.prefixOf(id) === 'frm_') return recordSource(Kit.records.get(id));
    return null;
  };
  var astCache = {}, astCount = 0;
  function parseCached(expr) {
    if (astCache[expr]) return astCache[expr];
    var ast = Kit.expr.parse(expr);
    if (astCount > 300) { astCache = {}; astCount = 0; }
    astCache[expr] = ast; astCount++;
    return ast;
  }
  // scope = {a:{...}, t:{...}, power}. The formula parameters are added as scope.p.
  WSX.evalFormula = function (id, scope) {
    var src = WSX.formulaSource(id);
    if (!src) throw new Error('No formula found for ' + id + '.');
    var sc = { a: scope && scope.a || {}, t: scope && scope.t || {}, power: scope && scope.power != null ? scope.power : 0, p: src.params };
    return Kit.expr.evaluate(parseCached(src.expr), sc);
  };
  WSX.roleId = function (role) {
    var fs = rsOf().formulaSet;
    return U.isObj(fs) && typeof fs[role] === 'string' && fs[role] ? fs[role] : null;
  };
  // Evaluates the formula the ruleset assigns to a role (phys, mag, heal, exp, ap, atb, var).
  WSX.evalRole = function (role, scope) {
    var id = WSX.roleId(role);
    if (!id) throw new Error('The ruleset has no formula for the ' + role + ' role.');
    return WSX.evalFormula(id, scope);
  };

  // ---------------------------------------------------------------- usage and staleness
  function walkFields(obj, fields, base, cb) {
    if (!U.isObj(obj)) return;
    (fields || []).forEach(function (f) {
      if (!f || !f.key) return;
      var v = obj[f.key];
      if (v === undefined) return;
      var p = base ? base + '.' + f.key : f.key;
      cb(f, v, p);
      if (f.type === 'object' && Array.isArray(f.of)) walkFields(v, f.of, p, cb);
      else if (f.type === 'list' && Array.isArray(f.of) && Array.isArray(v)) v.forEach(function (it, i) { walkFields(it, f.of, p + '[' + i + ']', cb); });
    });
  }
  // What depends on a stat key, an element key, or a taxonomy value. Used to lock keys and to warn before deleting.
  WSX.usage = function (kind, key) {
    var b = cur(), out = [], types = Kit.codex.types(b), idx = Kit.index(b), r = rsOf(b);
    function add(rid, name, path) { out.push({ recordId: rid, name: name, path: path }); }
    if (kind === 'element') {
      (Array.isArray(r.elementRelations) ? r.elementRelations : []).forEach(function (x, i) {
        if (U.isObj(x) && (x.a === key || x.b === key)) add('charter:ruleset', 'Element relation ' + (i + 1), 'elementRelations[' + i + ']');
      });
      if (U.isObj(r.taxonomy) && Array.isArray(r.taxonomy.values) && r.taxonomy.values.indexOf(key) >= 0) add('charter:ruleset', 'Taxonomy value', 'taxonomy.values');
    }
    var re = kind === 'stat' ? new RegExp('\\b[at]\\.' + key + '\\b') : null;
    Object.keys(idx.byId).forEach(function (id) {
      var e = idx.byId[id], info = Kit.codex.prefixInfo(e.prefix);
      if (!info || info.ns !== 'rules') return;
      var tn = Kit.codex.typeFor(e.prefix, b), td = tn ? types[tn] : null;
      if (!td) return;
      walkFields(e.record, td.fields, '', function (desc, val, path) {
        if (kind === 'stat') {
          if (desc.type === 'table' && desc.rowsFrom === STAT_PATH && hasOwn(val, key)) add(id, e.name, path + '.' + key);
          else if (desc.type === 'formula' && typeof val === 'string' && re.test(val)) add(id, e.name, path);
        } else if (kind === 'element') {
          if (desc.type === 'table' && desc.rowsFrom === ELEM_PATH && hasOwn(val, key)) add(id, e.name, path + '.' + key);
          else if (desc.type === 'enum' && desc.enumFrom === ELEM_PATH && val === key) add(id, e.name, path);
        } else if (kind === 'taxon') {
          if (desc.type === 'enum' && desc.enumFrom === TAX_PATH && val === key) add(id, e.name, path);
        }
      });
    });
    return out;
  };
  function usageText(list) {
    var names = [], seen = {};
    list.forEach(function (u) { if (!seen[u.name]) { seen[u.name] = 1; names.push(u.name); } });
    return list.length + ' place' + (list.length === 1 ? '' : 's') + ' use it: ' + names.slice(0, 5).join(', ') + (names.length > 5 ? ', and more.' : '.');
  }
  // Records an amendment touched that have not been reviewed yet. Maps id to {need, hit}.
  function staleMap(b) {
    var m = {}, ams = b && b.charter && Array.isArray(b.charter.amendments) ? b.charter.amendments : [];
    if (!window.WS.charter || !window.WS.charter.impact) return m;
    ams.forEach(function (am) {
      window.WS.charter.impact(b, am.changedPaths || [], am.to).forEach(function (r) { m[r.id] = { need: am.to, hit: r.dependsOn }; });
    });
    return m;
  }
  WSX.staleIds = function () { return Object.keys(staleMap(cur())); };
  function refsTo(id) {
    var out = [], idx = Kit.index();
    Object.keys(idx.byId).forEach(function (rid) {
      if (rid === id) return;
      var e = idx.byId[rid];
      if (JSON.stringify(e.record).indexOf('"' + id + '"') >= 0) out.push(e.name);
    });
    if (JSON.stringify(rsOf().formulaSet || {}).indexOf('"' + id + '"') >= 0) out.push('Ruleset formula set');
    return out;
  }

  // ---------------------------------------------------------------- systems editors (write to charter.ruleset)
  var RS = WSX.systems = {};
  var ELEM_COLORS = ['#e4572e', '#3a86c8', '#8a6a3d', '#9ad1d4', '#f2d16b', '#7b4a9e', '#6fc7b6', '#f07a6e'];

  function ensureRuleset() {
    var b = cur();
    if (!U.isObj(b.charter.ruleset)) b.charter.ruleset = {};
    return b.charter.ruleset;
  }
  function sysCtx(onChange) {
    return {
      readOnly: !!cur().charter.locked,
      rs: ensureRuleset,
      changed: function () { Kit.index.invalidate(); Kit.bundle.touch('rules-systems'); if (onChange) onChange(); }
    };
  }
  function mkInput(o) {
    var i = el('input', 'inp' + (o.mono ? ' mono' : ''));
    i.type = o.type || 'text';
    if (o.type === 'number') { i.inputMode = o.step === 1 ? 'numeric' : 'decimal'; i.step = o.step != null ? o.step : 'any'; if (o.min != null) i.min = o.min; if (o.max != null) i.max = o.max; }
    i.value = o.value == null ? '' : o.value;
    if (o.label) i.setAttribute('aria-label', o.label);
    if (o.placeholder) i.placeholder = o.placeholder;
    if (o.maxLength) i.maxLength = o.maxLength;
    if (o.mono) i.spellcheck = false;
    if (o.readOnly) i.readOnly = true;
    if (o.onInput) i.addEventListener('input', function () { o.onInput(i.value, i); });
    return i;
  }
  function mkSelect(options, value, o) {
    var s = el('select', 'inp');
    s.appendChild(new Option(o.placeholder || 'Choose...', ''));
    options.forEach(function (x) { s.appendChild(new Option(x.label, x.value)); });
    if (value && !options.some(function (x) { return x.value === value; })) s.appendChild(new Option(value + ' (not declared)', value));
    s.value = value || '';
    if (o.label) s.setAttribute('aria-label', o.label);
    if (o.readOnly) s.disabled = true;
    if (o.onChange) s.addEventListener('change', function () { o.onChange(s.value); });
    return s;
  }
  function fieldBox(labelText, node, cls) {
    var f = el('div', 'rl-f' + (cls ? ' ' + cls : ''));
    var l = el('label', null, esc(labelText));
    if (node.tagName === 'INPUT' || node.tagName === 'SELECT') { var id = 'rlf_' + (++uidn); node.id = id; l.htmlFor = id; }
    f.appendChild(l); f.appendChild(node);
    return f;
  }
  function colorControl(value, readOnly, label, onChange) {
    var wrap = el('div', 'color-row');
    var c = el('input'); c.type = 'color'; c.setAttribute('aria-label', label + ' swatch');
    c.value = /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : '#888888';
    var t = el('input', 'inp mono'); t.type = 'text'; t.maxLength = 7; t.spellcheck = false; t.placeholder = '#rrggbb'; t.value = value || '';
    t.setAttribute('aria-label', label + ' hex');
    if (readOnly) { c.disabled = true; t.readOnly = true; }
    c.addEventListener('input', function () { t.value = c.value; onChange(c.value); });
    t.addEventListener('input', function () { var v = t.value.trim(); if (/^#[0-9a-fA-F]{6}$/.test(v)) c.value = v; onChange(v); });
    wrap.appendChild(c); wrap.appendChild(t);
    return wrap;
  }
  function paintMsgs(refs, probs) {
    refs.forEach(function (r, i) {
      var m = probs[i] || [];
      U.clear(r.msg);
      r.row.classList.toggle('bad', m.length > 0);
      m.forEach(function (t) { r.msg.appendChild(el('div', 'msg msg-' + (t.level || 'error'), esc(t.text || t))); });
    });
  }
  function rowControls(ctx, arr, i, name, repaint, onDelete) {
    var box = el('div', 'rl-ctrls');
    if (ctx.readOnly) return box;
    box.appendChild(iconButton('up', 'Move ' + name + ' up', function () { if (i > 0) { var x = arr[i - 1]; arr[i - 1] = arr[i]; arr[i] = x; ctx.changed(); repaint(); } }));
    box.appendChild(iconButton('down', 'Move ' + name + ' down', function () { if (i < arr.length - 1) { var x = arr[i + 1]; arr[i + 1] = arr[i]; arr[i] = x; ctx.changed(); repaint(); } }));
    box.appendChild(iconButton('trash', 'Delete ' + name, onDelete));
    return box;
  }
  function keyPrompt(title, label, taken, maxLen) {
    return Kit.ui.prompt({
      title: title, label: label, okLabel: 'Add',
      placeholder: 'lowercase letters and digits',
      validate: function (v) {
        v = v.trim();
        if (!KEY_RE.test(v)) return 'Use lowercase letters and digits, starting with a letter.';
        if (v.length > maxLen) return 'Use at most ' + maxLen + ' characters.';
        if (taken.indexOf(v) >= 0) return 'That key is already in use.';
        return null;
      }
    });
  }
  function focusRow(host, idx) {
    var rows = host.querySelectorAll('.rl-row');
    var row = rows[idx];
    if (!row) return;
    row.scrollIntoView({ block: 'center' });
    var f = row.querySelector('input.inp:not([readonly])');
    if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
  }

  // Stats
  function statProblems(arr) {
    var out = [], seen = {};
    arr.forEach(function (s) {
      var m = [];
      if (U.isObj(s)) {
        var k = String(s.key || '');
        if (!k) m.push('Give the stat a key.');
        else if (!KEY_RE.test(k)) m.push('Key must be lowercase letters and digits, starting with a letter.');
        else if (seen[k]) m.push('Another stat already uses the key "' + k + '".');
        if (k) seen[k] = 1;
        if (!String(s.label || '').trim()) m.push('Give the stat a label.');
        if (typeof s.min === 'number' && typeof s.max === 'number' && s.min > s.max) m.push('Max must be at least min.');
      }
      out.push(m);
    });
    return out;
  }
  RS.stats = function (host, ctx) {
    U.clear(host);
    var r = ctx.rs(), arr = Array.isArray(r.stats) ? r.stats : [], refs = [];
    host.appendChild(el('p', 'muted rl-lead', 'Stats are the numbers every character and enemy carries. Formulas read them as a.<key> and t.<key>. A key is permanent once a record or formula uses it. Labels can change at any time.'));
    var list = el('div', 'rl-rows');
    host.appendChild(list);
    function repaint() { RS.stats(host, ctx); }
    function paint() { paintMsgs(refs, statProblems(arr)); }
    if (!arr.length) list.appendChild(el('div', 'empty-line', ctx.readOnly ? 'No stats are declared.' : 'No stats yet. Load the defaults or add your own.'));
    arr.forEach(function (s, i) {
      if (!U.isObj(s)) return;
      var row = el('div', 'rl-row'), msg = el('div', 'rl-msgs');
      var used = ctx.readOnly ? [] : WSX.usage('stat', s.key);
      var keyNode;
      if (ctx.readOnly || used.length) {
        keyNode = el('div', 'rl-keycode', esc(s.key));
        if (used.length) keyNode.title = 'Locked. ' + usageText(used);
      } else keyNode = mkInput({ value: s.key, label: 'Stat key ' + (i + 1), maxLength: 12, mono: true, onInput: function (v) { s.key = v.trim(); ctx.changed(); paint(); } });
      row.appendChild(fieldBox('Key', keyNode, 'sm'));
      row.appendChild(fieldBox('Label', mkInput({ value: s.label, label: 'Label for ' + s.key, maxLength: 30, readOnly: ctx.readOnly, onInput: function (v) { s.label = v; ctx.changed(); paint(); } }), 'lg'));
      ['min', 'max'].forEach(function (k) {
        row.appendChild(fieldBox(cap1(k), mkInput({
          type: 'number', step: 1, min: 0, max: 99999, value: s[k], label: cap1(k) + ' for ' + s.key, readOnly: ctx.readOnly,
          onInput: function (v) { if (v === '') delete s[k]; else s[k] = Number(v); ctx.changed(); paint(); }
        }), 'sm'));
      });
      row.appendChild(rowControls(ctx, arr, i, 'stat ' + s.key, repaint, function () {
        Kit.ui.confirm({
          title: 'Delete the stat "' + s.key + '"?', message: 'It is removed from the ruleset.',
          detail: used.length ? usageText(used) + ' Those places show errors until you fix them.' : '', okLabel: 'Delete', danger: true
        }).then(function (ok) { if (!ok) return; arr.splice(i, 1); ctx.changed(); repaint(); });
      }));
      row.appendChild(msg);
      list.appendChild(row);
      refs.push({ row: row, msg: msg });
    });
    paint();
    if (!ctx.readOnly) {
      var bar = el('div', 'btn-row rl-addbar');
      bar.appendChild(button('Add stat', 'plus', 'btn-primary', function () {
        keyPrompt('Add a stat', 'Stat key', statKeys(cur()), 12).then(function (k) {
          if (k == null) return;
          k = k.trim();
          var a2 = Array.isArray(r.stats) ? r.stats : (r.stats = []);
          a2.push({ key: k, label: cap1(k), min: 0, max: 99 });
          ctx.changed(); repaint(); focusRow(host, a2.length - 1);
        });
      }));
      if (!arr.length && window.WS.charter && window.WS.charter.defaultStats) {
        bar.appendChild(button('Load default stats', null, '', function () { r.stats = window.WS.charter.defaultStats(); ctx.changed(); repaint(); }));
      }
      host.appendChild(bar);
    }
  };

  // Elements
  function elementProblems(arr) {
    var out = [], seen = {};
    arr.forEach(function (s) {
      var m = [];
      if (U.isObj(s)) {
        var k = String(s.key || '');
        if (!k) m.push('Give the element a key.');
        else if (!KEY_RE.test(k)) m.push('Key must be lowercase letters and digits, starting with a letter.');
        else if (seen[k]) m.push('Another element already uses the key "' + k + '".');
        if (k) seen[k] = 1;
        if (!String(s.label || '').trim()) m.push('Give the element a label.');
        if (s.color && !/^#[0-9a-fA-F]{6}$/.test(s.color)) m.push('Color must be a hex value like #a1b2c3.');
      }
      out.push(m);
    });
    return out;
  }
  function elemList(r) { return (Array.isArray(r.elements) ? r.elements : []).filter(U.isObj); }
  RS.elements = function (host, ctx) {
    U.clear(host);
    var r = ctx.rs(), arr = Array.isArray(r.elements) ? r.elements : [], refs = [];
    host.appendChild(el('p', 'muted rl-lead', 'Elements color abilities, weather, and enemy families. Relations and the taxonomy build on them. A key is permanent once anything uses it.'));
    var list = el('div', 'rl-rows');
    host.appendChild(list);
    function repaint() { RS.elements(host, ctx); }
    function paint() { paintMsgs(refs, elementProblems(arr)); }
    if (!arr.length) list.appendChild(el('div', 'empty-line', ctx.readOnly ? 'No elements are declared.' : 'No elements yet. Add the first one.'));
    arr.forEach(function (s, i) {
      if (!U.isObj(s)) return;
      var row = el('div', 'rl-row'), msg = el('div', 'rl-msgs');
      var used = ctx.readOnly ? [] : WSX.usage('element', s.key);
      var keyNode;
      if (ctx.readOnly || used.length) {
        keyNode = el('div', 'rl-keycode', esc(s.key));
        if (used.length) keyNode.title = 'Locked. ' + usageText(used);
      } else keyNode = mkInput({ value: s.key, label: 'Element key ' + (i + 1), maxLength: 16, mono: true, onInput: function (v) { s.key = v.trim(); ctx.changed(); paint(); } });
      row.appendChild(fieldBox('Key', keyNode, 'sm'));
      row.appendChild(fieldBox('Label', mkInput({ value: s.label, label: 'Label for ' + s.key, maxLength: 30, readOnly: ctx.readOnly, onInput: function (v) { s.label = v; ctx.changed(); paint(); } }), 'lg'));
      row.appendChild(fieldBox('Color', colorControl(s.color, ctx.readOnly, 'Color for ' + s.key, function (v) { if (v) s.color = v; else delete s.color; ctx.changed(); paint(); }), 'lg'));
      row.appendChild(rowControls(ctx, arr, i, 'element ' + s.key, repaint, function () {
        var rels = (Array.isArray(r.elementRelations) ? r.elementRelations : []).filter(function (x) { return U.isObj(x) && (x.a === s.key || x.b === s.key); }).length;
        var inTax = U.isObj(r.taxonomy) && Array.isArray(r.taxonomy.values) && r.taxonomy.values.indexOf(s.key) >= 0;
        var others = used.filter(function (u) { return u.recordId !== 'charter:ruleset'; });
        var detail = 'Relations that use it' + (inTax ? ' and its taxonomy value' : '') + ' are removed with it.';
        if (others.length) detail += ' ' + usageText(others) + ' Those records show errors until you fix them.';
        Kit.ui.confirm({ title: 'Delete the element "' + s.key + '"?', message: rels ? 'It is removed from the ruleset, along with ' + rels + ' relation' + (rels === 1 ? '' : 's') + '.' : 'It is removed from the ruleset.', detail: detail, okLabel: 'Delete', danger: true }).then(function (ok) {
          if (!ok) return;
          arr.splice(i, 1);
          if (Array.isArray(r.elementRelations)) r.elementRelations = r.elementRelations.filter(function (x) { return !(U.isObj(x) && (x.a === s.key || x.b === s.key)); });
          if (U.isObj(r.taxonomy)) {
            if (Array.isArray(r.taxonomy.values)) r.taxonomy.values = r.taxonomy.values.filter(function (v) { return v !== s.key; });
            if (Array.isArray(r.taxonomy.inverts)) r.taxonomy.inverts = r.taxonomy.inverts.filter(function (v) { return v !== s.key; });
          }
          ctx.changed(); repaint();
        });
      }));
      row.appendChild(msg);
      list.appendChild(row);
      refs.push({ row: row, msg: msg });
    });
    paint();
    if (!ctx.readOnly) {
      var bar = el('div', 'btn-row rl-addbar');
      bar.appendChild(button('Add element', 'plus', 'btn-primary', function () {
        keyPrompt('Add an element', 'Element key', arr.map(function (x) { return U.isObj(x) ? x.key : ''; }), 16).then(function (k) {
          if (k == null) return;
          k = k.trim();
          var a2 = Array.isArray(r.elements) ? r.elements : (r.elements = []);
          a2.push({ key: k, label: cap1(k), color: ELEM_COLORS[a2.length % ELEM_COLORS.length] });
          ctx.changed(); repaint(); focusRow(host, a2.length - 1);
        });
      }));
      host.appendChild(bar);
    }
  };

  // Relations (opposed pairs)
  function relationProblems(arr, keys) {
    var out = [], seen = {};
    arr.forEach(function (x) {
      var m = [];
      if (U.isObj(x)) {
        if (!x.a || !x.b) m.push({ text: 'Choose both elements.', level: 'error' });
        else {
          if (x.a === x.b) m.push({ text: 'An element cannot oppose itself.', level: 'error' });
          if (keys.indexOf(x.a) < 0) m.push({ text: 'The element "' + x.a + '" is not declared.', level: 'error' });
          if (keys.indexOf(x.b) < 0) m.push({ text: 'The element "' + x.b + '" is not declared.', level: 'error' });
          var pk = [x.a, x.b].sort().join('|');
          if (seen[pk]) m.push({ text: 'This pair is declared twice.', level: 'warning' });
          seen[pk] = 1;
        }
      }
      out.push(m);
    });
    return out;
  }
  RS.relations = function (host, ctx) {
    U.clear(host);
    var r = ctx.rs(), arr = Array.isArray(r.elementRelations) ? r.elementRelations : [], refs = [];
    var elems = elemList(r), keys = elems.map(function (e) { return e.key; });
    var opts = elems.map(function (e) { return { value: e.key, label: (e.label || e.key) + ' (' + e.key + ')' }; });
    var nameOf = {}; elems.forEach(function (e) { nameOf[e.key] = e.label || e.key; });
    host.appendChild(el('p', 'muted rl-lead', 'An opposed pair means each element is the other side\'s weakness. Enemy families resist their own type and are weak to its opposite. Elements with no pair have no weakness.'));
    var list = el('div', 'rl-rows');
    host.appendChild(list);
    function repaint() { RS.relations(host, ctx); }
    function paint() { paintMsgs(refs, relationProblems(arr, keys)); }
    if (!arr.length) list.appendChild(el('div', 'empty-line', ctx.readOnly ? 'No relations are declared, so no element has a weakness.' : 'No pairs yet. Add one to give elements weaknesses.'));
    arr.forEach(function (x, i) {
      if (!U.isObj(x)) return;
      var row = el('div', 'rl-row'), msg = el('div', 'rl-msgs'), note = el('div', 'rl-pairnote muted');
      function paintNote() { note.textContent = x.a && x.b && x.a !== x.b ? (nameOf[x.a] || x.a) + ' is weak to ' + (nameOf[x.b] || x.b) + ', and ' + (nameOf[x.b] || x.b) + ' is weak to ' + (nameOf[x.a] || x.a) + '.' : ''; }
      ['a', 'b'].forEach(function (side) {
        row.appendChild(fieldBox('Element ' + side.toUpperCase(), mkSelect(opts, x[side], { label: 'Element ' + side.toUpperCase() + ' of pair ' + (i + 1), readOnly: ctx.readOnly, onChange: function (v) { if (v) x[side] = v; else delete x[side]; x.kind = 'opposed'; ctx.changed(); paint(); paintNote(); } }), 'lg'));
      });
      row.appendChild(rowControls(ctx, arr, i, 'pair ' + (i + 1), repaint, function () {
        Kit.ui.confirm({ title: 'Delete this pair?', message: 'The elements stay. They just stop opposing each other.', okLabel: 'Delete', danger: true }).then(function (ok) { if (!ok) return; arr.splice(i, 1); ctx.changed(); repaint(); });
      }));
      paintNote();
      row.appendChild(note);
      row.appendChild(msg);
      list.appendChild(row);
      refs.push({ row: row, msg: msg });
    });
    paint();
    if (!ctx.readOnly) {
      var bar = el('div', 'btn-row rl-addbar');
      var add = button('Add pair', 'plus', 'btn-primary', function () {
        if (keys.length < 2) { Kit.ui.toast('Declare at least two elements first.', 'warn'); return; }
        var have = {}; arr.forEach(function (x) { if (U.isObj(x) && x.a && x.b) have[[x.a, x.b].sort().join('|')] = 1; });
        var pick = null;
        for (var p = 0; p < keys.length && !pick; p++) { for (var q = p + 1; q < keys.length; q++) { if (!have[[keys[p], keys[q]].sort().join('|')]) { pick = [keys[p], keys[q]]; break; } } }
        pick = pick || [keys[0], keys[1]];
        var a2 = Array.isArray(r.elementRelations) ? r.elementRelations : (r.elementRelations = []);
        a2.push({ a: pick[0], b: pick[1], kind: 'opposed' });
        ctx.changed(); repaint(); focusRow(host, a2.length - 1);
      });
      if (keys.length < 2) add.title = 'Declare at least two elements first.';
      bar.appendChild(add);
      host.appendChild(bar);
    }
  };

  // Taxonomy
  function ensureTax(r) {
    if (!U.isObj(r.taxonomy)) r.taxonomy = { label: '', values: [], inverts: [] };
    if (!Array.isArray(r.taxonomy.values)) r.taxonomy.values = [];
    if (!Array.isArray(r.taxonomy.inverts)) r.taxonomy.inverts = [];
    return r.taxonomy;
  }
  RS.taxonomy = function (host, ctx) {
    U.clear(host);
    var r = ctx.rs(), tax = U.isObj(r.taxonomy) ? r.taxonomy : { label: '', values: [], inverts: [] };
    var vals = Array.isArray(tax.values) ? tax.values : [], refs = [];
    function repaint() { RS.taxonomy(host, ctx); }
    host.appendChild(el('p', 'muted rl-lead', 'The taxonomy classifies enemy families, for example by Type or Kind. Each value can be an element key or a custom word. An inverted value is healed by damage and hurt by healing, which is how undead work.'));
    var lab = mkInput({ value: tax.label, label: 'Taxonomy label', maxLength: 30, placeholder: 'For example Type or Kind', readOnly: ctx.readOnly, onInput: function (v) { ensureTax(r).label = v; ctx.changed(); paintLabel(); } });
    var labMsg = el('div', 'field-msg');
    function paintLabel() {
      U.clear(labMsg);
      if (vals.length && !String(ensureTaxRead().label || '').trim()) labMsg.appendChild(el('div', 'msg msg-error', 'Give the taxonomy a label such as Type or Kind.'));
    }
    function ensureTaxRead() { return U.isObj(r.taxonomy) ? r.taxonomy : tax; }
    var lf = fieldBox('Label', lab, 'lg'); lf.appendChild(labMsg);
    var top = el('div', 'rl-row'); top.appendChild(lf); host.appendChild(top);
    paintLabel();
    var list = el('div', 'rl-rows');
    host.appendChild(list);
    function problems() {
      var seen = {};
      return vals.map(function (v) {
        var m = [];
        if (!v) m.push('Enter a value.');
        else if (!/^[a-z][a-z0-9_-]*$/.test(v)) m.push('Use lowercase letters, digits, hyphens, or underscores, starting with a letter.');
        else if (seen[v]) m.push('This value is listed twice.');
        if (v) seen[v] = 1;
        return m;
      });
    }
    function paint() { paintMsgs(refs, problems()); }
    if (!vals.length) list.appendChild(el('div', 'empty-line', ctx.readOnly ? 'No taxonomy values are declared.' : 'No values yet. Add them from your elements or type your own.'));
    vals.forEach(function (v, i) {
      var row = el('div', 'rl-row'), msg = el('div', 'rl-msgs');
      var used = ctx.readOnly ? [] : WSX.usage('taxon', v);
      var keyNode;
      if (ctx.readOnly || used.length) {
        keyNode = el('div', 'rl-keycode', esc(v));
        if (used.length) keyNode.title = 'Locked. ' + usageText(used);
      } else keyNode = mkInput({
        value: v, label: 'Taxonomy value ' + (i + 1), maxLength: 24, mono: true,
        onInput: function (nv) {
          nv = nv.trim();
          var t = ensureTax(r), was = t.values[i], j = t.inverts.indexOf(was);
          t.values[i] = nv;
          if (j >= 0) t.inverts[j] = nv;
          vals = t.values; ctx.changed(); paint();
        }
      });
      row.appendChild(fieldBox('Value', keyNode, 'lg'));
      var inv = el('label', 'switch');
      var cb = el('input'); cb.type = 'checkbox'; cb.checked = Array.isArray(tax.inverts) && tax.inverts.indexOf(v) >= 0;
      cb.setAttribute('aria-label', 'Inverted: ' + v);
      if (ctx.readOnly) cb.disabled = true;
      var track = el('span', 'track'), txt = el('span', 'switch-text', cb.checked ? 'Inverted' : 'Normal');
      cb.addEventListener('change', function () {
        var t = ensureTax(r), j = t.inverts.indexOf(v);
        if (cb.checked && j < 0) t.inverts.push(v);
        if (!cb.checked && j >= 0) t.inverts.splice(j, 1);
        txt.textContent = cb.checked ? 'Inverted' : 'Normal';
        ctx.changed();
      });
      inv.appendChild(cb); inv.appendChild(track); inv.appendChild(txt);
      row.appendChild(fieldBox('Healing', inv, 'md'));
      row.appendChild(rowControls(ctx, vals, i, 'value ' + v, repaint, function () {
        Kit.ui.confirm({ title: 'Delete the value "' + v + '"?', message: 'It is removed from the taxonomy.', detail: used.length ? usageText(used) + ' Those records show errors until you fix them.' : '', okLabel: 'Delete', danger: true }).then(function (ok) {
          if (!ok) return;
          var t = ensureTax(r);
          t.values.splice(i, 1);
          t.inverts = t.inverts.filter(function (x) { return x !== v; });
          ctx.changed(); repaint();
        });
      }));
      row.appendChild(msg);
      list.appendChild(row);
      refs.push({ row: row, msg: msg });
    });
    paint();
    if (!ctx.readOnly) {
      var missing = elemList(r).map(function (e) { return e.key; }).filter(function (k) { return vals.indexOf(k) < 0; });
      if (missing.length) {
        var chips = el('div', 'rl-chipbar');
        chips.appendChild(el('span', 'muted', 'Add from elements:'));
        missing.forEach(function (k) {
          chips.appendChild(button(k, 'plus', 'btn-ghost rl-chipbtn', function () { ensureTax(r).values.push(k); ctx.changed(); repaint(); }));
        });
        host.appendChild(chips);
      }
      var bar = el('div', 'btn-row rl-addbar');
      bar.appendChild(button('Add custom value', 'plus', 'btn-primary', function () {
        Kit.ui.prompt({
          title: 'Add a taxonomy value', label: 'Value', okLabel: 'Add', placeholder: 'For example beast or machine',
          validate: function (nv) {
            nv = nv.trim();
            if (!/^[a-z][a-z0-9_-]*$/.test(nv)) return 'Use lowercase letters, digits, hyphens, or underscores, starting with a letter.';
            if (vals.indexOf(nv) >= 0) return 'That value already exists.';
            return null;
          }
        }).then(function (nv) {
          if (nv == null) return;
          ensureTax(r).values.push(nv.trim());
          ctx.changed(); repaint(); focusRow(host, ensureTax(r).values.length);
        });
      }));
      host.appendChild(bar);
    }
  };

  // Default affinity, computed from the relation table.
  var absorbPreview = {};
  function affinityChip(a) {
    return '<span class="chip rl-aff rl-aff-' + a + '">' + esc(a) + '</span>';
  }
  RS.affinity = function (host, ctx) {
    U.clear(host);
    var b = cur(), r = rsOf(b), elems = elemList(r), tax = U.isObj(r.taxonomy) ? r.taxonomy : {};
    var vals = Array.isArray(tax.values) ? tax.values : [];
    host.appendChild(el('p', 'muted rl-lead', 'Default affinity is computed, never typed. A family resists its own type, is weak to the opposite of that type, and takes normal damage from everything else. Turn on absorb and its own type heals it instead. Enemies can override any cell on their own record.'));
    if (!elems.length || !vals.length) {
      host.appendChild(el('div', 'empty-line', !elems.length ? 'Declare elements first.' : 'Add taxonomy values to see the default affinity of each family type.'));
    } else {
      var wrap = el('div', 'tbl-wrap'), t = el('table', 'tbl rl-matrix');
      var head = '<tr><th scope="col">' + esc(tax.label || 'Type') + '</th>' + elems.map(function (e) { return '<th scope="col">' + esc(e.label || e.key) + '</th>'; }).join('') + '<th scope="col">Absorb</th></tr>';
      t.innerHTML = '<thead>' + head + '</thead>';
      var tb = el('tbody');
      vals.forEach(function (v) {
        var tr = el('tr');
        tr.appendChild(el('th', null, esc(v)));
        tr.firstChild.scope = 'row';
        var aff = window.WS.codex.defaultAffinity(b, v, !!absorbPreview[v]);
        elems.forEach(function (e) { tr.appendChild(el('td', null, affinityChip(aff[e.key] || 'normal'))); });
        var td = el('td'), lab = el('label', 'switch');
        var cb = el('input'); cb.type = 'checkbox'; cb.checked = !!absorbPreview[v]; cb.setAttribute('aria-label', 'Preview absorb for ' + v);
        cb.addEventListener('change', function () { absorbPreview[v] = cb.checked; RS.affinity(host, ctx); });
        lab.appendChild(cb); lab.appendChild(el('span', 'track')); td.appendChild(lab); tr.appendChild(td);
        tb.appendChild(tr);
      });
      t.appendChild(tb); wrap.appendChild(t); host.appendChild(wrap);
      host.appendChild(el('p', 'muted rl-note', 'The Absorb column previews the option. To mark a real family as absorbing, use its switch below or its own record.'));
    }
    var fams = Kit.records.list('fam_');
    host.appendChild(el('h3', 'section-h', 'Families'));
    if (!fams.length) {
      host.appendChild(el('div', 'empty-line', 'No enemy families exist yet. They are authored under Content.'));
      var goF = el('button', 'btn btn-primary', 'Create an enemy family'); goF.type = 'button';
      goF.addEventListener('click', function () { WSX.open('type:Family'); });
      host.appendChild(goF);
    }
    else {
      var list = el('div', 'rl-rows');
      fams.slice().sort(function (x, y) { return String(x.name).localeCompare(String(y.name)); }).forEach(function (f) {
        var row = el('div', 'rl-row rl-famrow');
        row.appendChild(el('div', 'rl-f lg', '<strong>' + esc(f.name || f.id) + '</strong><span class="muted">' + esc((tax.label || 'Type') + ': ' + (f.type || 'not set')) + '</span>'));
        var sw = el('label', 'switch'), cb = el('input'); cb.type = 'checkbox'; cb.checked = !!f.absorbsOwnType; cb.setAttribute('aria-label', 'Absorbs its own type: ' + (f.name || f.id));
        var tx = el('span', 'switch-text', cb.checked ? 'Absorbs own type' : 'Resists own type');
        cb.addEventListener('change', function () {
          f.absorbsOwnType = cb.checked; tx.textContent = cb.checked ? 'Absorbs own type' : 'Resists own type';
          Kit.bundle.touch('rules-affinity'); summary();
        });
        sw.appendChild(cb); sw.appendChild(el('span', 'track')); sw.appendChild(tx);
        row.appendChild(sw);
        var sum = el('div', 'rl-affsum');
        function summary() {
          var a = window.WS.codex.defaultAffinity(cur(), f.type, !!f.absorbsOwnType), parts = [];
          Object.keys(a).forEach(function (k) { if (a[k] !== 'normal') parts.push(affinityChip(a[k]).replace('</span>', ' ' + esc(k) + '</span>')); });
          sum.innerHTML = parts.length ? parts.join('') : '<span class="muted">Normal to everything</span>';
        }
        summary();
        row.appendChild(sum);
        list.appendChild(row);
      });
      host.appendChild(list);
    }
  };
  RS.ORDER = ['stats', 'elements', 'relations', 'taxonomy', 'affinity'];
  RS.LABELS = { stats: 'Stats', elements: 'Elements', relations: 'Relations', taxonomy: 'Taxonomy', affinity: 'Affinity' };

  function lockedBanner(host) {
    var b = cur(), c = b.charter;
    if (!c.locked) return;
    var bn = el('div', 'rl-banner');
    bn.appendChild(el('span', null, 'These systems live in the Charter, which is locked at version ' + c.version + '. They are read only here. Amend the Charter to change them.'));
    var ab = button('Amend Charter', 'edit', '', function () { window.WS.charter.amend(); });
    bn.appendChild(ab);
    host.appendChild(bn);
  }
  // Drawer used from the Charter while it is unlocked. The same editors, fully editable.
  WSX.openSystems = function (tab) {
    var b = cur(), state = { tab: RS.ORDER.indexOf(tab) >= 0 ? tab : 'stats' };
    var panel, tabs;
    function paint() {
      Array.prototype.forEach.call(tabs.children, function (t) { t.setAttribute('aria-selected', t.dataset.tab === state.tab ? 'true' : 'false'); });
      U.clear(panel);
      var ctx = sysCtx(function () { Kit.refreshValidation(); });
      if (ctx.readOnly) lockedBanner(panel);
      var host = el('div');
      panel.appendChild(host);
      RS[state.tab](host, ctx);
    }
    return Kit.ui.drawer({
      title: 'Ruleset systems',
      onClose: function () { if (Kit.active() === 'charter') Kit.rerender(); },
      body: function (body) {
        tabs = el('div', 'rl-tabs'); tabs.setAttribute('role', 'tablist');
        RS.ORDER.forEach(function (k) {
          var t = el('button', 'rl-tab', esc(RS.LABELS[k])); t.type = 'button'; t.dataset.tab = k; t.setAttribute('role', 'tab');
          t.addEventListener('click', function () { state.tab = k; paint(); });
          tabs.appendChild(t);
        });
        panel = el('div', 'rl-tabpanel');
        body.appendChild(tabs); body.appendChild(panel);
        paint();
      }
    });
  };

  // ---------------------------------------------------------------- formula preview (live, Chart.js)
  var sampleState = { level: 10, power: 20, cap: 99, a: {}, t: {} };
  function whenChart(cb, tries) {
    if (window.Chart) { cb(window.Chart); return; }
    if ((tries || 0) > 40) { cb(null); return; }
    setTimeout(function () { whenChart(cb, (tries || 0) + 1); }, 150);
  }
  function defaultSample(b, which) {
    var st = rsOf(b).stats, out = {};
    (Array.isArray(st) ? st : []).forEach(function (s) {
      if (!U.isObj(s) || !s.key) return;
      var lo = typeof s.min === 'number' ? s.min : 0, hi = typeof s.max === 'number' ? s.max : 99;
      var v = which === 'a' ? lo + (hi - lo) * 0.3 : lo + (hi - lo) * 0.2;
      out[s.key] = Math.max(lo, Math.round(v));
    });
    return out;
  }
  function sampleScope(b) {
    var keys = statKeys(b), a = { level: sampleState.level }, t = { level: sampleState.level };
    keys.forEach(function (k) {
      if (sampleState.a[k] == null) sampleState.a[k] = defaultSample(b, 'a')[k];
      if (sampleState.t[k] == null) sampleState.t[k] = defaultSample(b, 't')[k];
      a[k] = sampleState.a[k]; t[k] = sampleState.t[k];
    });
    return { a: a, t: t, power: sampleState.power };
  }
  function fmtNum(n) {
    if (typeof n !== 'number' || !isFinite(n)) return String(n);
    return Math.abs(n) >= 1000 ? String(Math.round(n)) : String(Math.round(n * 1000) / 1000);
  }
  // getSource() returns {expr, params, kind} or null. Returns {update(), destroy()}.
  WSX.preview = function (host, getSource, o) {
    o = o || {};
    U.clear(host);
    var chart = null, dead = false;
    var box = el('div', 'rl-prev');
    var head = el('div', 'rl-prev-head', '<h3 class="section-h">Live preview</h3>');
    box.appendChild(head);
    var inputs = el('div', 'rl-prev-inputs');
    var readout = el('div', 'rl-prev-read');
    var errBox = el('div', 'rl-prev-err');
    var chartWrap = el('div', 'rl-chart');
    var canvas = el('canvas'); canvas.setAttribute('role', 'img');
    chartWrap.appendChild(canvas);
    var table = el('div', 'tbl-wrap rl-prev-table');
    box.appendChild(inputs); box.appendChild(errBox); box.appendChild(readout); box.appendChild(chartWrap); box.appendChild(table);
    host.appendChild(box);

    function numIn(label, get, set, min, max) {
      var w = el('label', 'rl-si'), lab = el('span', null, esc(label));
      var i = el('input', 'inp'); i.type = 'number'; i.inputMode = 'decimal'; i.step = 'any'; i.value = get();
      i.setAttribute('aria-label', 'Sample ' + label);
      i.addEventListener('input', function () {
        var v = Number(i.value);
        if (i.value === '' || !isFinite(v)) return;
        if (min != null && v < min) v = min;
        if (max != null && v > max) v = max;
        set(v); update();
      });
      w.appendChild(lab); w.appendChild(i);
      return w;
    }
    function buildInputs() {
      U.clear(inputs);
      var b = cur(), keys = statKeys(b);
      sampleScope(b);
      var g1 = el('div', 'rl-si-group'), g2 = el('div', 'rl-si-group'), g3 = el('div', 'rl-si-group');
      g1.appendChild(el('div', 'rl-si-title', 'Sample'));
      g1.appendChild(numIn('level', function () { return sampleState.level; }, function (v) { sampleState.level = Math.round(v); }, 1, 999));
      g1.appendChild(numIn('power', function () { return sampleState.power; }, function (v) { sampleState.power = v; }, 0, 99999));
      g1.appendChild(numIn('level cap', function () { return sampleState.cap; }, function (v) { sampleState.cap = Math.max(2, Math.min(200, Math.round(v))); }, 2, 200));
      g2.appendChild(el('div', 'rl-si-title', 'Attacker a.'));
      g3.appendChild(el('div', 'rl-si-title', 'Target t.'));
      keys.forEach(function (k) {
        g2.appendChild(numIn(k, function () { return sampleState.a[k]; }, function (v) { sampleState.a[k] = v; }, 0, 999999));
        g3.appendChild(numIn(k, function () { return sampleState.t[k]; }, function (v) { sampleState.t[k] = v; }, 0, 999999));
      });
      inputs.appendChild(g1); inputs.appendChild(g2); inputs.appendChild(g3);
    }
    function series(src) {
      var b = cur(), base = sampleScope(b), ast = Kit.expr.parse(src.expr, { stats: statKeys(b), params: Object.keys(src.params || {}) });
      var pts = [], cap = sampleState.cap;
      for (var l = 1; l <= cap; l++) {
        var sc = { a: Object.assign({}, base.a, { level: l }), t: Object.assign({}, base.t, { level: l }), power: base.power, p: src.params || {} };
        var y = null;
        try { y = Kit.expr.evaluate(ast, sc); } catch (e) { y = null; }
        pts.push(y);
      }
      var one = Kit.expr.evaluate(ast, { a: base.a, t: base.t, power: base.power, p: src.params || {} });
      return { pts: pts, value: one };
    }
    function paintTable(pts) {
      U.clear(table);
      var steps = [1, 5, 10, 20, 30, 50, 75, 99].filter(function (l) { return l <= sampleState.cap; });
      if (steps.indexOf(sampleState.cap) < 0) steps.push(sampleState.cap);
      var t = el('table', 'tbl');
      t.innerHTML = '<caption class="sr-only">Formula results by level</caption><thead><tr><th scope="col">Level</th><th scope="col">Result</th></tr></thead>';
      var tb = el('tbody');
      steps.forEach(function (l) { tb.appendChild(el('tr', null, '<td>' + l + '</td><td>' + esc(pts[l - 1] == null ? 'error' : fmtNum(pts[l - 1])) + '</td>')); });
      t.appendChild(tb); table.appendChild(t);
    }
    function update() {
      if (dead || !alive(box)) return;
      var src = getSource();
      U.clear(errBox); readout.textContent = '';
      if (!src || !src.expr) {
        errBox.appendChild(el('div', 'msg msg-warning', 'Choose a template or write an expression to see a preview.'));
        chartWrap.hidden = true; table.hidden = true; return;
      }
      var res;
      try { res = series(src); }
      catch (e) {
        errBox.appendChild(el('div', 'msg msg-error', esc(e.message)));
        chartWrap.hidden = true; table.hidden = true; return;
      }
      readout.innerHTML = 'At level ' + sampleState.level + ' the result is <strong>' + esc(fmtNum(res.value)) + '</strong>.';
      chartWrap.hidden = false; table.hidden = false;
      var labels = []; for (var l = 1; l <= sampleState.cap; l++) labels.push(String(l));
      var desc = 'Formula result for levels 1 to ' + sampleState.cap + '. Level 1 gives ' + (res.pts[0] == null ? 'an error' : fmtNum(res.pts[0])) + ' and level ' + sampleState.cap + ' gives ' + (res.pts[res.pts.length - 1] == null ? 'an error' : fmtNum(res.pts[res.pts.length - 1])) + '.';
      canvas.setAttribute('aria-label', desc);
      paintTable(res.pts);
      whenChart(function (C) {
        if (dead || !alive(box)) return;
        if (!C) { chartWrap.hidden = true; return; }
        table.classList.add('rl-prev-table-fallback');
        var cs = getComputedStyle(document.documentElement);
        var accent = (cs.getPropertyValue('--accent') || '#d4a24c').trim() || '#d4a24c';
        var grid = (cs.getPropertyValue('--line') || 'rgba(128,128,128,.25)').trim() || 'rgba(128,128,128,.25)';
        var txt = (cs.getPropertyValue('--muted') || '#999').trim() || '#999';
        if (!chart) {
          chart = new C(canvas.getContext('2d'), {
            type: 'line',
            data: { labels: labels, datasets: [{ label: 'Result', data: res.pts, borderColor: accent, backgroundColor: accent, borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, tension: 0.15, spanGaps: false }] },
            options: {
              responsive: true, maintainAspectRatio: false, animation: false,
              interaction: { mode: 'index', intersect: false },
              plugins: { legend: { display: false } },
              scales: {
                x: { title: { display: true, text: 'Level', color: txt }, ticks: { color: txt, maxTicksLimit: 10 }, grid: { color: grid } },
                y: { title: { display: true, text: 'Result', color: txt }, ticks: { color: txt }, grid: { color: grid }, beginAtZero: true }
              }
            }
          });
        } else {
          chart.data.labels = labels; chart.data.datasets[0].data = res.pts;
          chart.data.datasets[0].borderColor = accent; chart.data.datasets[0].backgroundColor = accent;
          chart.update('none');
        }
        canvas.dataset.points = String(res.pts.length);
        canvas.dataset.last = res.pts[res.pts.length - 1] == null ? '' : String(res.pts[res.pts.length - 1]);
      });
    }
    buildInputs();
    update();
    return { update: update, rebuild: function () { buildInputs(); update(); }, destroy: function () { dead = true; if (chart) { chart.destroy(); chart = null; } }, chart: function () { return chart; } };
  };

  // ---------------------------------------------------------------- records workspace
  var state = { view: null, editing: null, search: {}, focusPath: null };
  var hostRef = null, kform = null, prevCtl = null;

  function typeMap() { return Kit.codex.types(cur()) || {}; }
  function typeByName(n) { return typeMap()[n] || null; }
  function progType() {
    var tm = typeMap(), names = Object.keys(tm);
    for (var i = 0; i < names.length; i++) { if (tm[names[i]].group === 'module') return names[i]; }
    return null;
  }
  var SYSTEM_TYPES = ['Status', 'Formula', 'Weather'];
  function railModel() {
    var tm = typeMap(), sys = [], content = [];
    sys.push({ view: 'sys:stats', label: 'Stats', icon: 'gear' });
    sys.push({ view: 'sys:elements', label: 'Elements', icon: 'spark' });
    sys.push({ view: 'sys:relations', label: 'Relations', icon: 'jump' });
    sys.push({ view: 'sys:taxonomy', label: 'Taxonomy', icon: 'book' });
    sys.push({ view: 'sys:affinity', label: 'Affinity', icon: 'sword' });
    sys.push({ view: 'sys:formulas', label: 'Formulas', icon: 'chart' });
    SYSTEM_TYPES.forEach(function (n) {
      if (n === 'Formula' || !tm[n]) return;
      sys.push({ view: 'type:' + n, label: n === 'Weather' ? 'Weather states' : 'Statuses', icon: n === 'Weather' ? 'moon' : 'warn', type: n });
    });
    var pn = progType();
    if (pn) sys.push({ view: 'type:' + pn, label: 'Progression: ' + (tm[pn].label || pn), icon: 'key', type: pn });
    Object.keys(tm).forEach(function (n) {
      var t = tm[n];
      if (!t || !t.prefix || SYSTEM_TYPES.indexOf(n) >= 0 || n === pn) return;
      var info = Kit.codex.prefixInfo(t.prefix);
      if (!info || info.ns !== 'rules') return;
      content.push({ view: 'type:' + n, label: t.label || n, icon: 'scroll', type: n, order: t.group === 'living' ? 2 : 1 });
    });
    content.push({ view: 'econ', label: 'Economy', icon: 'chart', order: 1.5 });
    content.sort(function (a, b) { return a.order - b.order || a.label.localeCompare(b.label); });
    return { sys: sys, content: content };
  }
  function viewExists(v) {
    if (!v) return false;
    if (v === 'econ') return true;
    if (v.indexOf('type:') === 0) return !!typeByName(v.slice(5));
    var m = railModel();
    return m.sys.concat(m.content).some(function (x) { return x.view === v; });
  }
  function counts(type) {
    var t = typeByName(type);
    return t && t.prefix ? Kit.records.list(t.prefix).length : 0;
  }
  function typeOfRecordId(id) {
    if (!Kit.ids.isValid(id)) return null;
    return Kit.codex.typeFor(Kit.ids.prefixOf(id), cur());
  }
  function typeDefaults(typeName, rec) {
    var cfg = TYPE_CFG[typeName];
    if (cfg && cfg.init) cfg.init(rec);
    return rec;
  }
  function newRecord(typeName, name) {
    var t = typeByName(typeName), b = cur();
    var rec = { id: Kit.ids.mint(t.prefix, name), name: name, charterVersion: b.charter.version || 0 };
    typeDefaults(typeName, rec);
    Kit.records.put(rec);
    Kit.bundle.touch('rules-new');
    return rec;
  }
  function askName(title, initial) {
    return Kit.ui.prompt({ title: title, label: 'Name', value: initial || '', okLabel: 'Create', validate: function (v) { return v.trim() ? (v.trim().length > 60 ? 'Use at most 60 characters.' : null) : 'Give it a name.'; } });
  }
  function dupRecord(rec, typeName) {
    var copy = U.clone(rec), t = typeByName(typeName);
    var name = String(rec.name || 'Copy').replace(/ copy( \d+)?$/, '') + ' copy';
    copy.id = Kit.ids.mint(t.prefix, name);
    copy.name = name;
    copy.charterVersion = cur().charter.version || 0;
    Kit.records.put(copy);
    Kit.bundle.touch('rules-duplicate');
    return copy;
  }
  function deleteRecord(rec, typeName) {
    var refs = refsTo(rec.id);
    return Kit.ui.confirm({
      title: 'Delete "' + (rec.name || rec.id) + '"?',
      message: 'This removes the record. Its ID is not reused.',
      detail: refs.length ? 'It is referenced by ' + refs.slice(0, 5).join(', ') + (refs.length > 5 ? ', and more' : '') + '. Those references will show as broken until you fix them.' : '',
      okLabel: 'Delete', danger: true
    }).then(function (ok) {
      if (!ok) return false;
      Kit.records.del(rec.id);
      Kit.bundle.touch('rules-delete');
      return true;
    });
  }
  function markReviewed(rec) {
    rec.charterVersion = cur().charter.version || 0;
    Kit.bundle.touch('rules-reviewed');
  }

  // Per type extras. init sets new record defaults; extras paints tools under the form.
  var TYPE_CFG = {
    Status: {
      init: function (rec) { rec.gauge = 'normal'; rec.tickEffect = { kind: 'none', percent: 0 }; rec.duration = 3; rec.cure = { battleEnd: true, onHit: false, curedBy: [] }; },
      draftPrompt: 'Draft a status effect that fits the Charter tone. Choose a gauge effect, an optional tick effect, a duration, and how it is cured.'
    },
    Formula: {
      init: function (rec) { rec.template = 'phys.sub'; rec.params = {}; },
      extras: function (box, rec, api) { formulaExtras(box, rec, api); },
      draftPrompt: 'Draft a battle formula. Prefer a template from the library and only override parameters you need to change. If you write an expression use only a.<stat>, a.level, t.<stat>, t.level, power, p.<param>, the operators + - * / ^, parentheses, and the functions min, max, floor, ceil, round, clamp, pow, sqrt.'
    },
    Weather: {
      init: function (rec) {
        rec.realWorld = '';
        rec.elementMultipliers = {};
        elemList(rsOf()).forEach(function (e) { rec.elementMultipliers[e.key] = 1; });
        rec.encounterModifiers = { rate: 1, familyWeights: [] };
      },
      extras: function (box, rec, api) { weatherExtras(box, rec, api); },
      draftPrompt: 'Draft a weather state grounded in a real meteorological phenomenon. Set element multipliers between 0 and 5 where one is neutral, and an encounter rate near one.'
    },
    Materia: {
      extras: function (box, rec, api) { materiaExtras(box, rec, api); }
    },
    Ability: {
      init: function (rec) { rec.kind = 'attack'; rec.power = 10; rec.cost = { mp: 0, ap: 0 }; rec.targeting = { side: 'foe', scope: 'single' }; rec.chargeTicks = 0; rec.statusEffects = []; },
      extras: function (box, rec, api) { abilityExtras(box, rec, api); },
      draftPrompt: 'Draft an ability that fits the Charter magic system and tone. Choose a kind, an element from the declared elements when it fits, a power between 5 and 120, an MP cost, and targeting.'
    },
    Item: {
      init: function (rec) { rec.kind = 'consumable'; rec.price = 0; },
      extras: function (box, rec, api) { itemExtras(box, rec, api); },
      draftPrompt: 'Draft an item that fits the Charter setting. Choose consumable, key, or material, a fair price in gil, and for a consumable the effect ability by its ID when one fits.'
    },
    Equipment: {
      init: function (rec) { rec.slot = 'weapon'; rec.tier = 1; rec.price = 0; rec.stats = {}; rec.slotLayout = { count: 0, links: [] }; },
      hide: ['slotLayout'],
      extras: function (box, rec, api) { equipmentExtras(box, rec, api); },
      draftPrompt: 'Draft a piece of equipment for a weapon, armor, or accessory slot. Give it a gear tier, a price, stat bonuses using only the declared stats, and a slot layout with a count of slots and links written as pairs of slot numbers counted from zero.'
    },
    Character: {
      init: function (rec) {
        var b = cur();
        rec.weaponClass = '';
        rec.statLeanings = statTable(b, function () { return 1; });
        rec.baseStats = statTable(b, function (s) { return typeof s.min === 'number' ? s.min : 1; });
        rec.growth = statTable(b, function () { return 0; });
        rec.limitTree = []; rec.relationshipHooks = [];
      },
      hide: ['limitTree'],
      extras: function (box, rec, api) { characterExtras(box, rec, api); },
      listExtras: function (main) { characterListExtras(main); },
      draftPrompt: 'Draft a playable character from a Charter party entry.'
    },
    Family: {
      init: function (rec) {
        var tx = rsOf().taxonomy, v0 = tx && Array.isArray(tx.values) ? tx.values[0] : '';
        rec.type = U.isObj(v0) ? String(v0.key || '') : (v0 == null ? '' : String(v0));
        rec.palette = { base: '#6d5a7a', accent: '#e4b363' }; rec.absorbsOwnType = false;
      },
      extras: function (box, rec, api) { familyExtras(box, rec, api); },
      draftPrompt: 'Draft an enemy family. Choose its type from the taxonomy values and a base and accent color that suit it. Its affinity is computed from the type, so do not invent one.'
    },
    Enemy: {
      init: function (rec) { var b = cur(); rec.tier = 1; rec.level = 1; rec.stats = statTable(b, function (s) { return typeof s.min === 'number' ? s.min : 1; }); rec.drops = []; rec.steal = []; rec.gil = 0; rec.exp = 0; rec.ap = 0; rec.isBoss = false; },
      extras: function (box, rec, api) { enemyExtras(box, rec, api); },
      draftPrompt: function (b) {
        var st = statList(b).map(function (s) { return s.key + ' ' + (typeof s.min === 'number' ? s.min : 0) + ' to ' + (typeof s.max === 'number' ? s.max : 99); }).join(', ');
        return 'Draft an enemy that belongs to one of the listed families, chosen by its ID. Keep stats inside these ranges: ' + st + '. Pick a level, and modest gil, EXP, and AP rewards that suit the level.';
      }
    },
    Gambit: {
      init: function (rec) { rec.rules = []; rec.counters = []; },
      hide: ['rules', 'counters'],
      extras: function (box, rec, api) { gambitBuilder(box, rec, api, 'Gambit'); },
      draftPrompt: 'Draft a gambit set: two to four rules checked from the top, with the most urgent first and a fallback always rule last. Use only listed abilities and statuses. Condition parameters are a fraction such as 0.35, a whole number, or a status ID.'
    },
    BossStrategy: {
      init: function (rec) { rec.text = ''; rec.rules = []; rec.counters = []; },
      hide: ['rules', 'counters'],
      extras: function (box, rec, api) { gambitBuilder(box, rec, api, 'BossStrategy'); },
      draftPrompt: 'Draft a boss strategy for a listed boss enemy, chosen by its ID. Write the plan in words, then rules and counters that carry it out using only listed abilities.'
    },
    Troop: {
      init: function (rec) { rec.members = []; rec.flags = { noEscape: false, preemptiveChance: 0 }; },
      hide: ['members'],
      extras: function (box, rec, api) { troopBuilder(box, rec, api); },
      draftPrompt: 'Draft a troop of one to four listed enemies with a row for each (front or back), tied to a listed chapter when one fits.'
    },
    Shop: {
      init: function (rec) { rec.inventory = []; },
      extras: function (box, rec, api) { shopExtras(box, rec, api); },
      draftPrompt: 'Draft a shop with a small inventory of listed items and equipment, and the chapter it opens in when one fits. Only use price overrides when a price should differ from the base.'
    },
    Limit: {
      init: function (rec) { rec.level = 1; rec.unlock = { uses: 0 }; },
      extras: function (box, rec, api) { limitExtras(box, rec, api); },
      draftPrompt: 'Draft a limit break with a level from one to four, an unlock by uses or kills, and the action ability by its ID.'
    },
    ExpectedPartyState: {
      init: function (rec) { rec.targetLevel = 1; rec.gearTier = 1; rec.gil = 0; rec.targetWinRate = 80; },
      draftPrompt: 'Draft an Expected Party State row for a listed chapter, choosing the chapter by its ID. Give a target level, gear tier, gil on hand, and a target win rate near 80 percent.'
    }
  };

  function formulaExtras(box, rec, api) {
    var b = cur();
    var lib = el('div', 'rl-tools');
    var sel = el('select', 'inp'); sel.setAttribute('aria-label', 'Load a library template');
    sel.appendChild(new Option('Load a library template...', ''));
    FORMULA_ORDER.forEach(function (id) { sel.appendChild(new Option(id + ': ' + FORMULA_LIB[id].label, id)); });
    sel.addEventListener('change', function () {
      var id = sel.value; if (!id) return;
      rec.template = id; rec.params = {};
      api.changed(true);
    });
    lib.appendChild(sel);
    var note = el('div', 'muted rl-note');
    var src = recordSource(rec);
    note.textContent = src && src.template ? FORMULA_LIB[src.template].note : 'Custom expression. Variables are a.<stat>, a.level, t.<stat>, t.level, power, and p.<param>.';
    lib.appendChild(note);
    if (rec.template && FORMULA_LIB[rec.template]) {
      var dp = el('div', 'rl-defaults');
      dp.innerHTML = '<span class="muted">Default parameters:</span> ' + Object.keys(FORMULA_LIB[rec.template].params).map(function (k) { return '<code>' + esc(k) + ' = ' + esc(FORMULA_LIB[rec.template].params[k]) + '</code>'; }).join(' ');
      lib.appendChild(dp);
      var exp = el('div', 'rl-expr'); exp.innerHTML = '<span class="muted">Expression:</span> <code>' + esc(FORMULA_LIB[rec.template].expr) + '</code>';
      lib.appendChild(exp);
    }
    box.appendChild(lib);
    var pv = el('div');
    box.appendChild(pv);
    prevCtl = WSX.preview(pv, function () { return recordSource(rec); });
    api.onLive(function () { if (prevCtl) prevCtl.update(); });
    void b;
  }

  function weatherExtras(box, rec, api) {
    var tools = el('div', 'rl-tools');
    var wrap = Kit.ai.button('Suggest from meteorology', function () { return suggestWeather(rec, api); }, { busyLabel: 'Consulting Claude...' });
    tools.appendChild(wrap);
    tools.appendChild(el('span', 'muted rl-note', 'Sonnet reads the real world phenomenon and proposes an element multiplier for each element. You review before anything changes.'));
    box.appendChild(tools);
  }
  async function suggestWeather(rec, api) {
    var phen = String(rec.realWorld || '').trim();
    if (!phen) { Kit.ui.toast('Fill in the real world phenomenon first.', 'warn'); return; }
    var elems = elemList(rsOf());
    if (!elems.length) { Kit.ui.toast('Declare elements in the Charter first.', 'warn'); return; }
    var system = 'You are a meteorology-literate game designer. Given a real weather phenomenon and a list of game elements, set an element damage multiplier for each element based on the physics of the phenomenon. One is neutral. Use 0 to 5, typically 0.5 to 2. Explain each briefly. Return ONLY JSON: {"multipliers":{"<elementKey>":number},"rationale":{"<elementKey>":"one short sentence"}}. Include every element key exactly once. Do not use dashes in the text.';
    var user = 'Phenomenon: ' + phen + '\nElements: ' + JSON.stringify(elems.map(function (e) { return { key: e.key, label: e.label || e.key }; }));
    var out = await Kit.claude({ tier: 'sonnet', system: system, messages: [{ role: 'user', content: user }], maxTokens: 900, expectJson: true });
    var j = out && out.json;
    var m = j && U.isObj(j.multipliers) ? j.multipliers : null;
    if (!m) { Kit.ui.toast('Claude did not return usable multipliers.', 'warn'); return; }
    var clean = {}, why = U.isObj(j.rationale) ? j.rationale : {};
    elems.forEach(function (e) {
      var v = Number(m[e.key]);
      clean[e.key] = isFinite(v) ? Math.max(0, Math.min(5, Math.round(v * 100) / 100)) : 1;
    });
    return new Promise(function (resolve) {
      Kit.ui.dialog({
        title: 'Suggested multipliers for ' + phen,
        body: function (body) {
          var t = el('table', 'tbl'); t.innerHTML = '<thead><tr><th scope="col">Element</th><th scope="col">Now</th><th scope="col">Suggested</th><th scope="col">Why</th></tr></thead>';
          var tb = el('tbody');
          elems.forEach(function (e) {
            var now = rec.elementMultipliers && rec.elementMultipliers[e.key];
            tb.appendChild(el('tr', null, '<th scope="row">' + esc(e.label || e.key) + '</th><td>' + esc(now == null ? '1' : now) + '</td><td><strong>' + esc(clean[e.key]) + '</strong></td><td>' + esc(why[e.key] || '') + '</td>'));
          });
          t.appendChild(tb);
          var w = el('div', 'tbl-wrap'); w.appendChild(t); body.appendChild(w);
        },
        actions: [{ label: 'Keep mine', kind: 'ghost', value: false }, { label: 'Apply', kind: 'primary', value: true }],
        onResult: function (v) {
          if (v === true) { rec.elementMultipliers = clean; api.changed(true); Kit.ui.toast('Multipliers applied.', 'ok'); }
          resolve();
        }
      });
    });
  }

  function materiaExtras(box, rec, api) {
    if (!WSX.roleId('ap')) return;
    var tools = el('div', 'rl-tools');
    tools.appendChild(button('Fill AP thresholds from the AP formula', 'chart', '', function () {
      try {
        var levels = 5, acc = 0, out = [];
        for (var l = 1; l < levels; l++) { acc += WSX.evalRole('ap', { a: { level: l }, t: {}, power: 0 }); out.push(acc); }
        rec.apThresholds = out; api.changed(true);
      } catch (e) { Kit.ui.toast(e.message, 'warn'); }
    }));
    tools.appendChild(el('span', 'muted rl-note', 'Uses the ruleset AP formula and adds the amounts up for five levels.'));
    box.appendChild(tools);
  }

  // ================================================================ Pass 4B: content editors
  // Helpers shared by the content editors below. Everything writes straight into the record, then calls api.changed.
  function nameOf(id) { var e = id ? Kit.index().byId[id] : null; return e ? e.name : (id || ''); }
  function recOf(id) { return id ? Kit.records.get(id) : null; }
  function missingId(id) { return !!id && !Kit.index().byId[id]; }
  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function clampInt(v, lo, hi, dflt) { v = Math.round(Number(v)); if (!isFinite(v)) v = dflt; return Math.max(lo, Math.min(hi, v)); }
  function vocab(name) { return (window.WS.codex && window.WS.codex[name]) || []; }
  function vocabLabel(list, key) { var l = list || []; for (var i = 0; i < l.length; i++) { if (l[i].key === key) return l[i].label; } return key || ''; }
  function vocabOptions(name) { return vocab(name).map(function (k) { return { value: k.key, label: k.label }; }); }
  function statList(b) { var st = rsOf(b).stats; return (Array.isArray(st) ? st : []).filter(function (s) { return U.isObj(s) && s.key; }); }
  function statTable(b, fn) { var o = {}; statList(b).forEach(function (s) { o[s.key] = fn(s); }); return o; }
  function elemLabel(k) { var l = elemList(rsOf()).filter(function (e) { return e.key === k; })[0]; return l ? (l.label || l.key) : k; }
  function pathHit(path, prefixes) {
    path = String(path || '');
    return prefixes.some(function (p) { return path === p || path.indexOf(p + '.') === 0 || path.indexOf(p + '[') === 0; });
  }
  // A message box that shows the validator's findings for the fields a builder owns.
  function issueBox(typeName, rec, prefixes) {
    var box = el('div', 'rl-msgs');
    box.paint = function () {
      U.clear(box);
      Kit.validate.record(typeName, rec).forEach(function (it) {
        if (!pathHit(it.fieldPath, prefixes)) return;
        box.appendChild(el('div', 'msg msg-' + it.level, esc(it.message)));
      });
    };
    box.paint();
    return box;
  }
  function refBtnHtml(id) {
    if (!id) return '<span class="ref-empty">None. Tap to choose.</span>';
    return '<span class="ref-name">' + esc(nameOf(id)) + '</span><code class="id">' + esc(id) + '</code>' + (missingId(id) ? '<span class="chip chip-broken">Broken</span>' : '');
  }
  // A ref picker button. get returns the current id, set stores the new one (null clears).
  function refButton(prefix, title, get, set, label) {
    var b = el('button', 'ref-btn', refBtnHtml(get())); b.type = 'button';
    if (label) b.setAttribute('aria-label', label);
    b.addEventListener('click', function () {
      Kit.ui.pickRef({ prefix: prefix, title: title, current: get() }).then(function (v) {
        if (v === undefined) return;
        set(v || null);
        b.innerHTML = refBtnHtml(get());
      });
    });
    return b;
  }
  function openRecord(id) {
    var tn = typeOfRecordId(id);
    if (!tn) return;
    state.view = 'type:' + tn; state.editing = id; repaint();
  }
  function recLink(id, text) {
    var b = el('button', 'btn btn-ghost rl-link', esc(text || nameOf(id))); b.type = 'button';
    b.addEventListener('click', function () { openRecord(id); });
    return b;
  }
  function swapIn(arr, i, j) { if (i < 0 || j < 0 || i >= arr.length || j >= arr.length) return false; var t = arr[i]; arr[i] = arr[j]; arr[j] = t; return true; }
  // Native drag and drop for sortable rows. Buttons remain the touch and keyboard route.
  function enableDrag(row, grip, kind, arr, i, done) {
    grip.draggable = true;
    grip.addEventListener('dragstart', function (e) {
      try { e.dataTransfer.setData('text/plain', kind + ':' + i); e.dataTransfer.effectAllowed = 'move'; } catch (x) { /* older browsers */ }
      row.classList.add('dragging');
    });
    grip.addEventListener('dragend', function () { row.classList.remove('dragging'); });
    row.addEventListener('dragover', function (e) { e.preventDefault(); row.classList.add('dropping'); });
    row.addEventListener('dragleave', function () { row.classList.remove('dropping'); });
    row.addEventListener('drop', function (e) {
      e.preventDefault(); row.classList.remove('dropping');
      var raw = ''; try { raw = e.dataTransfer.getData('text/plain'); } catch (x) { raw = ''; }
      var m = /^(\w+):(\d+)$/.exec(raw);
      if (!m || m[1] !== kind) return;
      var from = Number(m[2]);
      if (from === i || from >= arr.length) return;
      var item = arr.splice(from, 1)[0];
      arr.splice(i, 0, item);
      done();
    });
  }
  var SVGNS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs, cls) {
    var n = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (cls) n.setAttribute('class', cls);
    return n;
  }

  // ---------------------------------------------------------------- abilities and items
  var SIDE_NOUN = { foe: ['foe', 'foes'], ally: ['ally', 'allies'], any: ['target', 'targets'] };
  function targetPhrase(t) {
    t = U.isObj(t) ? t : {};
    if (t.side === 'self') return 'the user';
    var n = SIDE_NOUN[t.side] || ['target', 'targets'];
    switch (t.scope) {
      case 'all': return 'all ' + n[1];
      case 'row': return 'a row of ' + n[1];
      case 'random': return 'a random ' + n[0];
      default: return 'one ' + n[0];
    }
  }
  function ablSummary(rec) {
    var kind = vocabLabel(vocab('ABL_KINDS'), rec.kind) || 'Ability';
    var s = kind + (rec.element ? ', ' + elemLabel(rec.element) : '') + '. Power ' + num(rec.power) + '. ';
    var c = U.isObj(rec.cost) ? rec.cost : {}, cost = [];
    if (num(c.mp)) cost.push(num(c.mp) + ' MP');
    if (num(c.ap)) cost.push(num(c.ap) + ' AP');
    if (c.item) cost.push(nameOf(c.item));
    s += cost.length ? 'Costs ' + cost.join(' and ') + '. ' : 'Free to use. ';
    s += 'Targets ' + targetPhrase(rec.targeting) + '. ';
    s += num(rec.chargeTicks) ? 'Charges for ' + num(rec.chargeTicks) + ' ticks.' : 'No charge time.';
    var n = Array.isArray(rec.statusEffects) ? rec.statusEffects.length : 0;
    if (n) s += ' Can inflict ' + n + ' status' + (n === 1 ? '' : 'es') + '.';
    return s;
  }
  var ABL_ROLE = { attack: 'phys', magic: 'mag', heal: 'heal', summon: 'mag', enemy: 'phys', limit: 'phys' };
  function ablSample(rec) {
    var role = ABL_ROLE[rec.kind];
    if (!role) return null;
    var fid = rec.formula && recOf(rec.formula) ? rec.formula : WSX.roleId(role);
    if (!fid) return 'The ruleset has no ' + role + ' formula, so there is no sample.';
    var sc = sampleScope(cur());
    sc.power = num(rec.power);
    try {
      var v = WSX.evalFormula(fid, sc);
      return 'Sample at level ' + sampleState.level + ' with power ' + sc.power + ': about ' + fmtNum(v) + (rec.kind === 'heal' ? ' HP restored.' : ' damage.') + ' Sample stats come from the Formulas preview.';
    } catch (e) { return 'Sample not available: ' + e.message; }
  }
  function abilityExtras(box, rec, api) {
    var card = el('div', 'card rl-summary');
    box.appendChild(card);
    function paint() {
      var samp = ablSample(rec);
      card.innerHTML = '<div class="rl-sumline">' + esc(ablSummary(rec)) + '</div>' + (samp ? '<div class="muted rl-note">' + esc(samp) + '</div>' : '');
    }
    paint(); api.onLive(paint);
  }
  function itemExtras(box, rec, api) {
    var card = el('div', 'card rl-summary');
    box.appendChild(card);
    function paint() {
      U.clear(card);
      var txt;
      if (rec.kind === 'consumable') txt = rec.effect ? 'Consumable. Using it fires ' + nameOf(rec.effect) + '.' : 'Consumable with no effect yet.';
      else if (rec.kind === 'key') txt = 'Key item. It stays in the bag and is not normally sold.';
      else txt = 'Crafting material.';
      if (num(rec.price)) txt += ' Base price ' + num(rec.price) + ' gil.';
      card.appendChild(el('div', 'rl-sumline', esc(txt)));
      if (rec.kind === 'key' && num(rec.price) > 0) card.appendChild(el('div', 'msg msg-warning', 'A key item with a price could end up for sale. Check the shops.'));
      if (rec.kind === 'consumable' && !rec.effect) {
        var row = el('div', 'btn-row');
        row.appendChild(button('Create an effect ability', 'plus', '', function () {
          var name = String(rec.name || 'Item') + ' effect';
          var abl = { id: Kit.ids.mint('abl_', name), name: name, charterVersion: cur().charter.version || 0 };
          typeDefaults('Ability', abl);
          abl.kind = 'heal'; abl.targeting = { side: 'ally', scope: 'single' }; abl.power = 50;
          Kit.records.put(abl); rec.effect = abl.id;
          Kit.bundle.touch('rules-new'); api.changed(true);
          Kit.ui.toast('Created ' + name + ' and linked it.', 'ok');
        }));
        card.appendChild(row);
      }
    }
    paint(); api.onLive(paint);
  }

  // ---------------------------------------------------------------- equipment: visual slot layout builder
  function slotLayoutOf(rec) {
    if (!U.isObj(rec.slotLayout)) rec.slotLayout = {};
    var L = rec.slotLayout;
    L.count = clampInt(L.count, 0, 8, 0);
    var seen = {}, out = [];
    (Array.isArray(L.links) ? L.links : []).forEach(function (p) {
      if (!Array.isArray(p) || p.length !== 2) return;
      var i = Math.round(Number(p[0])), j = Math.round(Number(p[1]));
      if (!isFinite(i) || !isFinite(j) || i === j) return;
      if (i > j) { var t = i; i = j; j = t; }
      var k = i + ':' + j;
      if (seen[k]) return;
      seen[k] = 1; out.push([i, j]);
    });
    L.links = out;
    return L;
  }
  // Slots sit in rows of four inside a 256 unit wide drawing, so the picture scales to any screen.
  function slotPos(i, count) {
    var r = Math.floor(i / 4), c = i % 4, inRow = Math.min(4, count - r * 4);
    return { x: (256 - inRow * 64) / 2 + 32 + c * 64, y: 46 + r * 72 };
  }
  function slotBuilder(box, rec, api) {
    var host = el('div', 'rl-slotb'); host.setAttribute('data-bpath', 'slotLayout');
    box.appendChild(host);
    var sel = -1, issues = issueBox('Equipment', rec, ['slotLayout']);
    function setCount(n) {
      var L = slotLayoutOf(rec), before = L.links.length;
      n = clampInt(n, 0, 8, 0);
      L.count = n;
      L.links = L.links.filter(function (p) { return p[0] < n && p[1] < n; });
      if (L.links.length < before) Kit.ui.toast('Removed ' + (before - L.links.length) + ' link' + (before - L.links.length === 1 ? '' : 's') + ' that pointed past the last slot.', 'warn');
      if (sel >= n) sel = -1;
      api.changed(false); paint();
    }
    function toggleLink(i, j) {
      var L = slotLayoutOf(rec);
      if (i > j) { var t = i; i = j; j = t; }
      var at = -1;
      L.links.forEach(function (p, k) { if (p[0] === i && p[1] === j) at = k; });
      if (at >= 0) L.links.splice(at, 1); else L.links.push([i, j]);
      L.links.sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    }
    function pick(i) {
      if (sel < 0) { sel = i; paint(); return; }
      if (sel === i) { sel = -1; paint(); return; }
      toggleLink(sel, i); sel = -1; api.changed(false); paint();
    }
    function paint() {
      U.clear(host);
      var L = slotLayoutOf(rec);
      host.appendChild(el('h3', 'section-h', 'Slot layout'));
      host.appendChild(el('p', 'muted rl-note', 'Choose how many slots this piece has. Then tap one slot and a second slot to link or unlink them. Linked slots are joined by a bar.'));
      var ctl = el('div', 'rl-tools');
      var less = button('Fewer slots', 'down', 'btn-ghost', function () { setCount(L.count - 1); });
      var more = button('More slots', 'plus', 'btn-ghost', function () { setCount(L.count + 1); });
      less.disabled = L.count <= 0; more.disabled = L.count >= 8;
      ctl.appendChild(less);
      ctl.appendChild(el('span', 'rl-slotcount', '<strong>' + L.count + '</strong> slot' + (L.count === 1 ? '' : 's')));
      ctl.appendChild(more);
      var clr = button('Clear links', 'x', 'btn-ghost', function () { L.links = []; sel = -1; api.changed(false); paint(); });
      clr.disabled = !L.links.length;
      ctl.appendChild(clr);
      host.appendChild(ctl);
      if (L.count > 0) {
        var rows = Math.ceil(L.count / 4), H = rows * 72 + 22;
        var svg = svgEl('svg', { viewBox: '0 0 256 ' + H, role: 'group', 'aria-label': 'Slot layout with ' + L.count + ' slots and ' + L.links.length + ' links' }, 'rl-slotsvg');
        L.links.forEach(function (p) {
          if (p[0] >= L.count || p[1] >= L.count) return;
          var a = slotPos(p[0], L.count), c = slotPos(p[1], L.count);
          var sameRow = Math.floor(p[0] / 4) === Math.floor(p[1] / 4), adj = sameRow && p[1] - p[0] === 1;
          if (sameRow && !adj) svg.appendChild(svgEl('path', { d: 'M' + a.x + ' ' + a.y + ' Q' + ((a.x + c.x) / 2) + ' ' + (a.y - 46) + ' ' + c.x + ' ' + c.y }, 'rl-slot-bar arc'));
          else svg.appendChild(svgEl('line', { x1: a.x, y1: a.y, x2: c.x, y2: c.y }, 'rl-slot-bar'));
        });
        for (var i = 0; i < L.count; i++) (function (idx) {
          var pos = slotPos(idx, L.count);
          var g = svgEl('g', { tabindex: '0', role: 'button', 'aria-pressed': sel === idx ? 'true' : 'false', 'aria-label': 'Slot ' + (idx + 1) + (sel === idx ? ', selected. Choose a second slot to link.' : '') }, 'rl-slot' + (sel === idx ? ' sel' : ''));
          g.appendChild(svgEl('circle', { cx: pos.x, cy: pos.y, r: 22 }));
          var tx = svgEl('text', { x: pos.x, y: pos.y }); tx.textContent = String(idx + 1);
          g.appendChild(tx);
          g.addEventListener('click', function () { pick(idx); });
          g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(idx); } });
          svg.appendChild(g);
        })(i);
        host.appendChild(svg);
      } else host.appendChild(el('div', 'empty-line', 'No slots yet. Use More slots to add the first one.'));
      if (L.links.length) {
        var chips = el('div', 'rl-chipbar');
        L.links.forEach(function (p, k) {
          var bad = p[0] >= L.count || p[1] >= L.count;
          var chip = el('span', 'chip ' + (bad ? 'chip-warning' : 'chip-accent'), 'Slot ' + (p[0] + 1) + ' linked to slot ' + (p[1] + 1) + (bad ? ' (past the last slot)' : ''));
          var rm = iconButton('x', 'Remove link between slot ' + (p[0] + 1) + ' and slot ' + (p[1] + 1), function () { L.links.splice(k, 1); api.changed(false); paint(); });
          var wrap = el('span', 'rl-linkchip'); wrap.appendChild(chip); wrap.appendChild(rm);
          chips.appendChild(wrap);
        });
        host.appendChild(chips);
      }
      issues.paint();
      host.appendChild(issues);
    }
    paint();
  }
  function equipmentExtras(box, rec, api) {
    var card = el('div', 'card rl-summary');
    box.appendChild(card);
    function paint() {
      var bits = [cap1(rec.slot || 'gear')];
      if (rec.slot === 'weapon' && rec.weaponClass) bits.push(rec.weaponClass + ' class');
      if (rec.tier) bits.push('tier ' + rec.tier);
      if (num(rec.price)) bits.push(num(rec.price) + ' gil');
      var bon = [], st = U.isObj(rec.stats) ? rec.stats : {};
      Object.keys(st).forEach(function (k) { if (num(st[k])) bon.push(k + ' ' + (num(st[k]) > 0 ? '+' : '') + num(st[k])); });
      var L = U.isObj(rec.slotLayout) ? rec.slotLayout : {};
      card.innerHTML = '<div class="rl-sumline">' + esc(bits.join(', ') + '.') + (bon.length ? ' Bonuses: ' + esc(bon.join(', ')) + '.' : '') + ' ' + esc((L.count || 0) + ' slot' + (L.count === 1 ? '' : 's') + ', ' + ((L.links || []).length) + ' link' + ((L.links || []).length === 1 ? '' : 's') + '.') + '</div>';
    }
    paint(); api.onLive(paint);
    slotBuilder(box, rec, api);
  }

  // ---------------------------------------------------------------- characters: limit tree builder and previews
  function partyMembers(b) {
    var s = b.charter && b.charter.sections, p = s && s.party;
    return p && Array.isArray(p.members) ? p.members.filter(function (m) { return U.isObj(m) && String(m.name || '').trim(); }) : [];
  }
  function chrByName(name) {
    name = String(name || '').trim().toLowerCase();
    return Kit.records.list('chr_').filter(function (c) { return String(c.name || '').trim().toLowerCase() === name; })[0] || null;
  }
  function unlockText(lim) {
    var u = U.isObj(lim.unlock) ? lim.unlock : {};
    if (num(u.uses) > 0) return 'after ' + num(u.uses) + ' uses of the previous limit';
    if (num(u.kills) > 0) return 'after ' + num(u.kills) + ' kills';
    return 'available at once';
  }
  function limitBuilder(box, rec, api) {
    var host = el('div', 'rl-limb'); host.setAttribute('data-bpath', 'limitTree');
    box.appendChild(host);
    var issues = issueBox('Character', rec, ['limitTree']);
    function tree() { if (!Array.isArray(rec.limitTree)) rec.limitTree = []; return rec.limitTree; }
    function commit() { api.changed(false); paint(); }
    function addExisting() {
      Kit.ui.pickRef({ prefix: 'lim_', title: 'Add a limit break to ' + (rec.name || 'this character') }).then(function (id) {
        if (!id) return;
        if (tree().indexOf(id) >= 0) { Kit.ui.toast('That limit is already in the tree.', 'warn'); return; }
        tree().push(id); commit();
      });
    }
    function addNew() {
      if (tree().length >= 4) { Kit.ui.toast('A limit tree holds at most four levels.', 'warn'); return; }
      askName('New limit break', '').then(function (n) {
        if (n == null) return;
        return Kit.ui.pickRef({ prefix: 'abl_', title: 'Choose the limit action (optional)' }).then(function (abl) {
          var level = Math.min(4, tree().length + 1);
          var lim = { id: Kit.ids.mint('lim_', n.trim()), name: n.trim(), charterVersion: cur().charter.version || 0 };
          typeDefaults('Limit', lim);
          lim.level = level; lim.unlock = level > 1 ? { uses: 3 } : { uses: 0 };
          lim.action = abl || null;
          Kit.records.put(lim); tree().push(lim.id);
          Kit.bundle.touch('rules-new'); commit();
        });
      });
    }
    function paint() {
      U.clear(host);
      host.appendChild(el('h3', 'section-h', 'Limit tree'));
      host.appendChild(el('p', 'muted rl-note', 'Limit breaks in unlock order. The gauge fills as this character takes damage, and each level opens after the uses or kills you set on the limit.'));
      var list = tree();
      if (!list.length) host.appendChild(el('div', 'empty-line', 'No limit breaks yet. Add an existing one, or create a new one here.'));
      var prev = 0, ascending = true;
      list.forEach(function (id, i) {
        var lim = recOf(id), card = el('div', 'rl-lcard');
        var main = el('div', 'rl-lcard-main');
        main.appendChild(el('span', 'rl-lbadge', 'Limit ' + (i + 1)));
        var title = el('div', 'rl-ltitle');
        title.appendChild(recLink(id, lim ? lim.name : id));
        if (!lim) title.appendChild(el('span', 'chip chip-broken', 'Broken'));
        main.appendChild(title);
        if (lim) {
          var meta = el('div', 'rl-lmeta');
          meta.innerHTML = '<span class="chip chip-muted">Level ' + esc(lim.level == null ? '?' : lim.level) + '</span><span class="chip chip-muted">' + esc(unlockText(lim)) + '</span>' +
            '<span class="chip ' + (lim.action ? (missingId(lim.action) ? 'chip-broken' : 'chip-accent') : 'chip-warning') + '">' + esc(lim.action ? nameOf(lim.action) : 'No action yet') + '</span>';
          main.appendChild(meta);
          if (num(lim.level) < prev) ascending = false;
          prev = num(lim.level);
        }
        card.appendChild(main);
        var ctrls = el('div', 'rl-ctrls');
        var up = iconButton('up', 'Move limit ' + (i + 1) + ' up', function () { if (swapIn(list, i, i - 1)) commit(); });
        var dn = iconButton('down', 'Move limit ' + (i + 1) + ' down', function () { if (swapIn(list, i, i + 1)) commit(); });
        up.disabled = i === 0; dn.disabled = i === list.length - 1;
        ctrls.appendChild(up); ctrls.appendChild(dn);
        ctrls.appendChild(iconButton('trash', 'Remove limit ' + (i + 1) + ' from the tree', function () { list.splice(i, 1); commit(); }, 'btn-danger'));
        card.appendChild(ctrls);
        host.appendChild(card);
      });
      if (!ascending) host.appendChild(el('div', 'msg msg-warning', 'Limit levels should rise down the list. Reorder the limits or change a level.'));
      var bar = el('div', 'btn-row');
      bar.appendChild(button('Add existing limit', 'plus', '', addExisting));
      bar.appendChild(button('New limit here', 'spark', '', addNew));
      host.appendChild(bar);
      issues.paint();
      host.appendChild(issues);
    }
    paint();
  }
  function characterExtras(box, rec, api) {
    var b = cur();
    var seed = el('div', 'card rl-summary');
    box.appendChild(seed);
    var m = partyMembers(b).filter(function (p) { return String(p.name).trim().toLowerCase() === String(rec.name || '').trim().toLowerCase(); })[0];
    if (m) seed.innerHTML = '<div class="rl-sumline"><strong>Charter party entry.</strong> ' + esc(m.past || 'No past written yet.') + '</div>';
    else seed.innerHTML = '<div class="muted rl-note">No Charter party entry has this name, so this character is not tied to the party list.</div>';
    // Stats by level, from the base stats plus growth per level.
    var prevBox = el('div', 'rl-block');
    box.appendChild(prevBox);
    function paintStats() {
      U.clear(prevBox);
      prevBox.appendChild(el('h3', 'section-h', 'Stats by level'));
      var stats = statList(cur());
      if (!stats.length) { prevBox.appendChild(el('div', 'empty-line', 'Declare stats in the Charter first.')); return; }
      var levels = [1, 10, 25, 50, 99];
      var t = el('table', 'tbl');
      var head = '<thead><tr><th scope="col">Stat</th>' + levels.map(function (l) { return '<th scope="col" class="num">Lv ' + l + '</th>'; }).join('') + '</tr></thead>';
      var rows = stats.map(function (s) {
        var base = num(rec.baseStats && rec.baseStats[s.key]), gr = num(rec.growth && rec.growth[s.key]);
        return '<tr><th scope="row">' + esc(s.label || s.key) + '</th>' + levels.map(function (l) {
          var v = Math.round(base + gr * (l - 1));
          if (typeof s.max === 'number') v = Math.min(v, s.max);
          return '<td class="num">' + v + '</td>';
        }).join('') + '</tr>';
      }).join('');
      t.innerHTML = head + '<tbody>' + rows + '</tbody>';
      var w = el('div', 'tbl-wrap'); w.appendChild(t); prevBox.appendChild(w);
      prevBox.appendChild(el('p', 'muted rl-note', 'Base stats plus growth per level, capped at each stat maximum.'));
    }
    paintStats(); api.onLive(paintStats);
    limitBuilder(box, rec, api);
  }
  function limitExtras(box, rec, api) {
    var users = Kit.records.list('chr_').filter(function (c) { return Array.isArray(c.limitTree) && c.limitTree.indexOf(rec.id) >= 0; });
    var card = el('div', 'card rl-summary');
    card.appendChild(el('div', 'rl-sumline', esc(unlockText(rec).replace(/^./, function (c) { return c.toUpperCase(); }) + '. Fires ' + (rec.action ? nameOf(rec.action) : 'no action yet') + '.')));
    var row = el('div', 'rl-chipbar');
    if (!users.length) row.appendChild(el('span', 'muted rl-note', 'No character has this limit in a tree yet.'));
    users.forEach(function (c) { row.appendChild(recLink(c.id, c.name)); });
    card.appendChild(row);
    box.appendChild(card);
    void api;
  }


  // ---------------------------------------------------------------- families: tier generator, enemies
  function hexToHsl(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return null;
    var n = parseInt(m[1], 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, h = 0, s = 0, d = mx - mn;
    if (d) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }
  function hslToHex(h, s, l) {
    h = ((h % 360) + 360) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2, r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; } else if (h < 120) { r = x; g = c; } else if (h < 180) { g = c; b = x; }
    else if (h < 240) { g = x; b = c; } else if (h < 300) { r = x; b = c; } else { r = c; b = x; }
    function hx(v) { var t = Math.round((v + m) * 255).toString(16); return t.length < 2 ? '0' + t : t; }
    return '#' + hx(r) + hx(g) + hx(b);
  }
  function shiftHex(hex, deg) { var hsl = hexToHsl(hex); return hsl ? hslToHex(hsl.h + deg, hsl.s, hsl.l) : hex; }
  function tierBase(name) { return String(name || '').replace(/ T\d+$/, ''); }

  // Clones a family, and every enemy in it, into tiers 2 to N. Each tier family gets a shifted palette, and each tier
  // enemy gets scaled stats, level, and rewards. The originals are never changed apart from a missing tier number.
  function generateTiers(famId, o) {
    o = o || {};
    var b = cur(), fam = recOf(famId);
    if (!fam || Kit.ids.prefixOf(famId) !== 'fam_') throw new Error('Choose an enemy family first.');
    var T = clampInt(o.tiers, 2, 9, 3);
    var scale = num(o.scale) > 0 ? num(o.scale) : 1.5;
    var rew = num(o.rewardScale) > 0 ? num(o.rewardScale) : scale;
    var lvStep = clampInt(o.levelStep, 0, 30, 8);
    var shift = isFinite(Number(o.shift)) && o.shift !== '' && o.shift != null ? Number(o.shift) : 30;
    var maxOf = {};
    statList(b).forEach(function (s) { maxOf[s.key] = typeof s.max === 'number' ? s.max : 999999; });
    var srcs = Kit.records.list('enm_').filter(function (e) { return e.family === famId; });
    if (!srcs.length) throw new Error('This family has no enemies to clone yet. Add an enemy first.');
    srcs.forEach(function (e) { if (!e.tier) e.tier = 1; });
    var out = { families: [], enemies: [] }, version = b.charter.version || 0, fbase = tierBase(fam.name);
    for (var k = 2; k <= T; k++) (function (k) {
      var f = U.clone(fam);
      f.name = fbase + ' T' + k; f.id = Kit.ids.mint('fam_', f.name); f.charterVersion = version;
      if (U.isObj(f.palette)) f.palette = { base: shiftHex(f.palette.base, shift * (k - 1)), accent: shiftHex(f.palette.accent, shift * (k - 1)) };
      if (window.WS.codex && window.WS.codex.defaultAffinity) f.defaultAffinity = window.WS.codex.defaultAffinity(b, f.type, !!f.absorbsOwnType);
      Kit.records.put(f); out.families.push(f.id);
      srcs.forEach(function (e) {
        var st = num(e.tier) || 1;
        if (k <= st) return;
        var pw = k - st, c = U.clone(e);
        c.name = tierBase(e.name) + ' T' + k; c.id = Kit.ids.mint('enm_', c.name); c.charterVersion = version;
        c.family = f.id; c.tier = k;
        c.level = clampInt(num(e.level || 1) + lvStep * pw, 1, 99, 1);
        if (U.isObj(e.stats)) {
          c.stats = {};
          Object.keys(e.stats).forEach(function (sk) {
            var v = Math.round(num(e.stats[sk]) * Math.pow(scale, pw));
            c.stats[sk] = Math.max(0, Math.min(v, maxOf[sk] != null ? maxOf[sk] : 999999));
          });
        }
        ['gil', 'exp', 'ap'].forEach(function (rk) { if (e[rk] != null) c[rk] = Math.max(0, Math.round(num(e[rk]) * Math.pow(rew, pw))); });
        Kit.records.put(c); out.enemies.push(c.id);
      });
    })(k);
    Kit.index.invalidate(); Kit.bundle.touch('rules-tiers');
    return out;
  }
  function tierDialog(fam, api) {
    var src = Kit.records.list('enm_').filter(function (e) { return e.family === fam.id; });
    var ins = {}, note;
    function val(k) { return ins[k] ? ins[k].value : ''; }
    function preview() {
      var T = clampInt(val('tiers'), 2, 9, 3), n = 0;
      for (var k = 2; k <= T; k++) src.forEach(function (e) { if (k > (num(e.tier) || 1)) n++; });
      note.textContent = 'This creates ' + (T - 1) + ' famil' + (T - 1 === 1 ? 'y' : 'ies') + ' and ' + n + ' enem' + (n === 1 ? 'y' : 'ies') + '.';
    }
    Kit.ui.dialog({
      title: 'Generate tiers for ' + (fam.name || fam.id),
      body: function (body) {
        if (!src.length) { body.appendChild(el('p', 'msg msg-warning', 'This family has no enemies yet. Add an enemy to it first, then generate tiers.')); return; }
        body.appendChild(el('p', 'muted', 'Clones this family and its ' + src.length + ' enemy record' + (src.length === 1 ? '' : 's') + ' into higher tiers. Each tier gets its own family with a shifted palette. Its enemies get scaled stats, level, and rewards. The originals stay as they are.'));
        var defs = [
          ['tiers', 'Tiers in total', 3, { min: 2, max: 9, step: 1 }],
          ['scale', 'Stat scale per tier', 1.5, { min: 1.05, max: 4, step: 0.05 }],
          ['levelStep', 'Levels added per tier', 8, { min: 0, max: 30, step: 1 }],
          ['rewardScale', 'Reward scale per tier', 1.5, { min: 1, max: 4, step: 0.05 }],
          ['shift', 'Palette shift per tier (degrees)', 30, { min: 0, max: 180, step: 5 }]
        ];
        var grid = el('div', 'rl-tiergrid');
        defs.forEach(function (d) {
          var inp = mkInput({ type: 'number', step: d[3].step, min: d[3].min, max: d[3].max, value: d[2], label: d[1], onInput: preview });
          ins[d[0]] = inp;
          grid.appendChild(fieldBox(d[1], inp));
        });
        body.appendChild(grid);
        note = el('p', 'rl-sumline'); body.appendChild(note);
        preview();
      },
      actions: src.length ? [{ label: 'Cancel', kind: 'ghost', value: null }, { label: 'Generate', kind: 'primary', value: 'go' }] : [{ label: 'Close', kind: 'ghost', value: null }],
      onResult: function (v) {
        if (v !== 'go') return;
        try {
          var r = generateTiers(fam.id, { tiers: val('tiers'), scale: val('scale'), levelStep: val('levelStep'), rewardScale: val('rewardScale'), shift: val('shift') });
          Kit.ui.toast('Created ' + r.families.length + ' families and ' + r.enemies.length + ' enemies.', 'ok');
          api.changed(true);
        } catch (e) { Kit.ui.toast(e.message, 'error'); }
      }
    });
  }
  function familyExtras(box, rec, api) {
    var card = el('div', 'card rl-summary');
    box.appendChild(card);
    card.appendChild(el('h3', 'section-h', 'Enemies in this family'));
    var enemies = Kit.records.list('enm_').filter(function (e) { return e.family === rec.id; });
    if (!enemies.length) card.appendChild(el('div', 'empty-line', 'No enemies belong to this family yet.'));
    else {
      var chips = el('div', 'rl-chipbar');
      enemies.forEach(function (e) { chips.appendChild(recLink(e.id, e.name + ' (tier ' + (e.tier || 1) + ')')); });
      card.appendChild(chips);
    }
    var bar = el('div', 'btn-row');
    bar.appendChild(button('Add an enemy to this family', 'plus', '', function () {
      askName('New enemy in ' + (rec.name || 'this family'), '').then(function (n) {
        if (n == null) return;
        var e = newRecord('Enemy', n.trim());
        e.family = rec.id; Kit.bundle.touch('rules-new');
        state.view = 'type:Enemy'; state.editing = e.id; repaint();
      });
    }));
    bar.appendChild(button('Generate tiers', 'spark', '', function () { tierDialog(rec, api); }));
    card.appendChild(bar);
    card.appendChild(el('p', 'muted rl-note', 'Generate tiers clones this family and its enemies into N tiers, with scaled stats and a palette shift for each tier.'));
  }
  function enemyExtras(box, rec, api) {
    var aff = el('div', 'card rl-summary');
    box.appendChild(aff);
    function paintAff() {
      U.clear(aff);
      aff.appendChild(el('h3', 'section-h', 'Effective affinity'));
      if (!rec.family || missingId(rec.family)) { aff.appendChild(el('div', 'empty-line', 'Choose a family to see how this enemy takes each element.')); return; }
      var map = window.WS.codex.enemyAffinity(cur(), rec), row = el('div', 'rl-affsum');
      Object.keys(map).forEach(function (k) { row.appendChild(el('span', 'chip rl-aff rl-aff-' + map[k], esc(elemLabel(k)) + ': ' + esc(map[k]))); });
      aff.appendChild(row);
      aff.appendChild(el('p', 'muted rl-note', 'The family default first, then this enemy\'s overrides.'));
    }
    paintAff(); api.onLive(paintAff);
    var g = el('div', 'card rl-summary');
    box.appendChild(g);
    g.appendChild(el('h3', 'section-h', 'Gambit set'));
    if (rec.gambits) {
      var gr = el('div', 'rl-chipbar');
      gr.appendChild(recLink(rec.gambits, nameOf(rec.gambits)));
      if (missingId(rec.gambits)) gr.appendChild(el('span', 'chip chip-broken', 'Broken'));
      g.appendChild(gr);
    } else {
      g.appendChild(el('div', 'muted rl-note', 'No gambit set yet. Create one to script how this enemy chooses its actions.'));
      g.appendChild(button('Create a gambit set for this enemy', 'plus', '', function () {
        var nm = String(rec.name || 'Enemy') + ' gambits';
        var gm = { id: Kit.ids.mint('gmb_', nm), name: nm, charterVersion: cur().charter.version || 0 };
        typeDefaults('Gambit', gm);
        Kit.records.put(gm); rec.gambits = gm.id; Kit.bundle.touch('rules-new'); api.changed(true);
      }));
    }
    var sc = el('div', 'card rl-summary');
    box.appendChild(sc);
    sc.appendChild(el('h3', 'section-h', 'Scale stats'));
    var srow = el('div', 'rl-tools');
    var f = mkInput({ type: 'number', step: 0.05, min: 0.1, max: 10, value: 1.25, label: 'Scale factor' });
    f.style.maxWidth = '120px';
    srow.appendChild(f);
    srow.appendChild(button('Scale all stats', 'chart', '', function () {
      var k = Number(f.value);
      if (!(k > 0)) { Kit.ui.toast('Enter a factor above zero.', 'warn'); return; }
      if (!U.isObj(rec.stats)) rec.stats = {};
      statList(cur()).forEach(function (s) {
        var v = Math.round(num(rec.stats[s.key]) * k);
        rec.stats[s.key] = Math.max(0, Math.min(v, typeof s.max === 'number' ? s.max : 999999));
      });
      api.changed(true);
    }));
    srow.appendChild(el('span', 'muted rl-note', 'Multiplies every stat by the factor and keeps each within its declared maximum.'));
    sc.appendChild(srow);
    var used = Kit.records.list('trp_').filter(function (t) { return (t.members || []).some(function (m) { return m && m.enm === rec.id; }); });
    var ub = el('div', 'card rl-summary');
    box.appendChild(ub);
    ub.appendChild(el('h3', 'section-h', 'Used in troops'));
    if (!used.length) ub.appendChild(el('div', 'empty-line', 'No troop uses this enemy yet.'));
    else { var ch = el('div', 'rl-chipbar'); used.forEach(function (t) { ch.appendChild(recLink(t.id, t.name)); }); ub.appendChild(ch); }
  }

  // ---------------------------------------------------------------- gambits: sortable rule list with a plain language line
  var COND_DEFAULT = { selfHpBelow: '0.35', selfHpAbove: '0.5', allyHpBelow: '0.35', targetHpBelow: '0.3', turnEvery: '3', enemyCountBelow: '2', allyCountBelow: '2', chance: '0.25' };
  var FRACTION_CONDS = { selfHpBelow: 1, selfHpAbove: 1, allyHpBelow: 1, targetHpBelow: 1, chance: 1 };
  var COUNT_CONDS = { turnEvery: 1, enemyCountBelow: 1, allyCountBelow: 1 };
  var STATUS_COND_KINDS = { targetHasStatus: 1, targetLacksStatus: 1 };
  var SEL_TEXT = { self: 'itself', randomFoe: 'a random foe', lowestHpFoe: 'the foe with the lowest HP', highestHpFoe: 'the foe with the highest HP', allFoes: 'all foes', randomAlly: 'a random ally', lowestHpAlly: 'the ally with the lowest HP', allAllies: 'all allies', attacker: 'the attacker' };
  var TRIG_TEXT = { onPhysical: 'it is hit by a physical attack', onMagic: 'it is hit by magic', onDamaged: 'it takes any damage', onAllyKo: 'an ally is knocked out', onLowHp: 'it falls below a quarter of its HP', onStatus: 'it receives a status' };
  function condText(c) {
    c = U.isObj(c) ? c : {};
    var p = c.param, blank = p === '' || p == null || !isFinite(Number(p));
    var pc = blank ? '(set a value)' : Math.round(Number(p) * 100) + ' percent';
    var n = blank ? '(set a number)' : String(Math.round(Number(p)));
    var st = p ? nameOf(p) : '(choose a status)';
    switch (c.kind) {
      case 'always': return 'Always';
      case 'selfHpBelow': return 'If its own HP is below ' + pc;
      case 'selfHpAbove': return 'If its own HP is above ' + pc;
      case 'allyHpBelow': return 'If an ally is below ' + pc + ' HP';
      case 'targetHpBelow': return 'If the target is below ' + pc + ' HP';
      case 'targetHasStatus': return 'If the target has ' + st;
      case 'targetLacksStatus': return 'If the target lacks ' + st;
      case 'turnEvery': return 'Every ' + n + ' turns';
      case 'enemyCountBelow': return 'If fewer than ' + n + ' foes remain';
      case 'allyCountBelow': return 'If fewer than ' + n + ' allies remain';
      case 'chance': return 'With a ' + pc + ' chance';
      default: return 'Choose a condition';
    }
  }
  function describeRule(r) {
    r = U.isObj(r) ? r : {};
    var c = U.isObj(r.condition) ? r.condition : {}, t = U.isObj(r.target) ? r.target : {}, a = U.isObj(r.action) ? r.action : {};
    var act = a.abl ? nameOf(a.abl) : '(choose an ability)', tg = SEL_TEXT[t.selector] || '(choose a target)';
    if (c.kind === 'always') return 'Always use ' + act + ' on ' + tg + '.';
    return condText(c) + ', use ' + act + ' on ' + tg + '.';
  }
  function describeCounter(r) {
    r = U.isObj(r) ? r : {};
    var a = U.isObj(r.action) ? r.action : {};
    return 'When ' + (TRIG_TEXT[r.trigger] || '(choose a trigger)') + ', counter with ' + (a.abl ? nameOf(a.abl) : '(choose an ability)') + '.';
  }
  function gambitBuilder(box, rec, api, typeName) {
    var host = el('div', 'rl-gmb'); host.setAttribute('data-bpath', 'rules');
    box.appendChild(host);
    var issues = issueBox(typeName, rec, ['rules', 'counters']);
    var lines = [], nevers = [];
    function rules() { if (!Array.isArray(rec.rules)) rec.rules = []; return rec.rules; }
    function counters() { if (!Array.isArray(rec.counters)) rec.counters = []; return rec.counters; }
    function paintLines() {
      lines.forEach(function (l) { l.el.textContent = l.text(); });
      var first = -1;
      rules().forEach(function (r, i) { if (first < 0 && r && r.condition && r.condition.kind === 'always') first = i; });
      nevers.forEach(function (n, i) { if (n) n.hidden = !(first >= 0 && i > first); });
    }
    function changed(rebuild) {
      api.changed(false);
      if (rebuild) paint(); else { paintLines(); issues.paint(); }
    }
    function ctrlButtons(list, i, kind, label) {
      var c = el('div', 'rl-ctrls');
      var up = iconButton('up', 'Move ' + label + ' up', function () { if (swapIn(list, i, i - 1)) changed(true); });
      var dn = iconButton('down', 'Move ' + label + ' down', function () { if (swapIn(list, i, i + 1)) changed(true); });
      up.disabled = i === 0; dn.disabled = i === list.length - 1;
      c.appendChild(up); c.appendChild(dn);
      c.appendChild(iconButton('trash', 'Delete ' + label, function () { list.splice(i, 1); changed(true); }, 'btn-danger'));
      return c;
    }
    function ruleRow(r, i) {
      if (!U.isObj(r.condition)) r.condition = { kind: 'always', param: '' };
      if (!U.isObj(r.target)) r.target = { selector: '' };
      if (!U.isObj(r.action)) r.action = { abl: null };
      var list = rules(), row = el('div', 'rl-grow'), head = el('div', 'rl-grow-head');
      var grip = el('span', 'rl-grip'); grip.title = 'Drag to reorder'; grip.setAttribute('aria-hidden', 'true');
      head.appendChild(grip);
      head.appendChild(el('strong', null, 'Rule ' + (i + 1)));
      var never = el('span', 'chip chip-warning', 'Never reached'); never.hidden = true;
      nevers[i] = never; head.appendChild(never);
      head.appendChild(ctrlButtons(list, i, 'rule', 'rule ' + (i + 1)));
      row.appendChild(head);
      var body = el('div', 'rl-grow-body');
      body.appendChild(fieldBox('Condition', mkSelect(vocabOptions('COND_KINDS'), r.condition.kind, { label: 'Condition for rule ' + (i + 1), placeholder: 'Condition...', onChange: function (v) { r.condition.kind = v; r.condition.param = COND_DEFAULT[v] || ''; changed(true); } }), 'lg'));
      var k = r.condition.kind;
      if (FRACTION_CONDS[k]) body.appendChild(fieldBox('Fraction, 0 to 1', mkInput({ type: 'number', step: 0.05, min: 0, max: 1, value: r.condition.param, label: 'Fraction for rule ' + (i + 1), onInput: function (v) { r.condition.param = v; changed(false); } }), 'sm'));
      else if (COUNT_CONDS[k]) body.appendChild(fieldBox('Number', mkInput({ type: 'number', step: 1, min: 1, max: 99, value: r.condition.param, label: 'Number for rule ' + (i + 1), onInput: function (v) { r.condition.param = v; changed(false); } }), 'sm'));
      else if (STATUS_COND_KINDS[k]) body.appendChild(fieldBox('Status', refButton('sta_', 'Choose a status', function () { return r.condition.param || null; }, function (v) { r.condition.param = v || ''; changed(false); }, 'Status for rule ' + (i + 1)), 'lg'));
      body.appendChild(fieldBox('Target', mkSelect(vocabOptions('SELECTORS'), r.target.selector, { label: 'Target for rule ' + (i + 1), placeholder: 'Target...', onChange: function (v) { r.target.selector = v; changed(false); } }), 'lg'));
      body.appendChild(fieldBox('Ability', refButton('abl_', 'Choose the ability', function () { return r.action.abl || null; }, function (v) { r.action.abl = v; changed(false); }, 'Ability for rule ' + (i + 1)), 'lg'));
      var line = el('div', 'rl-gline'); line.setAttribute('aria-live', 'polite');
      lines.push({ el: line, text: function () { return describeRule(r); } });
      body.appendChild(line);
      row.appendChild(body);
      enableDrag(row, grip, 'rule', list, i, function () { changed(true); });
      return row;
    }
    function counterRow(r, i) {
      if (!U.isObj(r.action)) r.action = { abl: null };
      var list = counters(), row = el('div', 'rl-grow'), head = el('div', 'rl-grow-head');
      var grip = el('span', 'rl-grip'); grip.title = 'Drag to reorder'; grip.setAttribute('aria-hidden', 'true');
      head.appendChild(grip);
      head.appendChild(el('strong', null, 'Counter ' + (i + 1)));
      head.appendChild(ctrlButtons(list, i, 'counter', 'counter ' + (i + 1)));
      row.appendChild(head);
      var body = el('div', 'rl-grow-body');
      body.appendChild(fieldBox('Trigger', mkSelect(vocabOptions('TRIGGERS'), r.trigger, { label: 'Trigger for counter ' + (i + 1), placeholder: 'Trigger...', onChange: function (v) { r.trigger = v; changed(false); } }), 'lg'));
      body.appendChild(fieldBox('Ability', refButton('abl_', 'Choose the counter ability', function () { return r.action.abl || null; }, function (v) { r.action.abl = v; changed(false); }, 'Ability for counter ' + (i + 1)), 'lg'));
      var line = el('div', 'rl-gline'); line.setAttribute('aria-live', 'polite');
      lines.push({ el: line, text: function () { return describeCounter(r); } });
      body.appendChild(line);
      row.appendChild(body);
      enableDrag(row, grip, 'counter', list, i, function () { changed(true); });
      return row;
    }
    function paint() {
      U.clear(host); lines = []; nevers = [];
      host.appendChild(el('h3', 'section-h', 'Rules'));
      host.appendChild(el('p', 'muted rl-note', 'Checked from the top. The first rule whose condition holds acts. Use the arrows or drag the handle to reorder.'));
      var rs = rules();
      if (!rs.length) host.appendChild(el('div', 'empty-line', 'No rules yet. Add the first one below.'));
      rs.forEach(function (r, i) { if (U.isObj(r)) host.appendChild(ruleRow(r, i)); });
      host.appendChild(button('Add a rule', 'plus', '', function () { rules().push({ condition: { kind: 'always', param: '' }, target: { selector: 'randomFoe' }, action: { abl: null } }); changed(true); }));
      var ch3 = el('h3', 'section-h', 'Counters'); ch3.setAttribute('data-bpath', 'counters');
      host.appendChild(ch3);
      host.appendChild(el('p', 'muted rl-note', 'Reactions that fire when the trigger happens, outside the normal turn order.'));
      var cs = counters();
      if (!cs.length) host.appendChild(el('div', 'empty-line', 'No counters yet.'));
      cs.forEach(function (r, i) { if (U.isObj(r)) host.appendChild(counterRow(r, i)); });
      host.appendChild(button('Add a counter', 'plus', '', function () { counters().push({ trigger: 'onDamaged', action: { abl: null } }); changed(true); }));
      paintLines(); issues.paint();
      host.appendChild(issues);
    }
    paint();
  }

  // ---------------------------------------------------------------- troops: row layout builder
  function troopYield(t) {
    var y = { gil: 0, exp: 0, ap: 0, count: 0, missing: 0, boss: false };
    (Array.isArray(t.members) ? t.members : []).forEach(function (m) {
      var e = m ? recOf(m.enm) : null;
      if (!e) { y.missing++; return; }
      y.gil += num(e.gil); y.exp += num(e.exp); y.ap += num(e.ap); y.count++;
      if (e.isBoss) y.boss = true;
    });
    return y;
  }
  function troopBuilder(box, rec, api) {
    var host = el('div', 'rl-trp'); host.setAttribute('data-bpath', 'members');
    box.appendChild(host);
    var issues = issueBox('Troop', rec, ['members']);
    function mem() { if (!Array.isArray(rec.members)) rec.members = []; return rec.members; }
    function rowOf(m) { return m && m.row === 'back' ? 'back' : 'front'; }
    function commit() { api.changed(false); paint(); }
    function neighbor(i, d) {
      var list = mem(), row = rowOf(list[i]), j = i + d;
      while (j >= 0 && j < list.length) { if (rowOf(list[j]) === row) return j; j += d; }
      return -1;
    }
    function addTo(row) {
      if (mem().length >= 8) { Kit.ui.toast('A troop holds at most eight enemies.', 'warn'); return; }
      Kit.ui.pickRef({ prefix: 'enm_', title: 'Add an enemy to the ' + row + ' row' }).then(function (id) {
        if (!id) return;
        mem().push({ enm: id, row: row }); commit();
      });
    }
    function card(m, i) {
      var e = recOf(m.enm), c = el('div', 'rl-mcard'), top = el('div', 'rl-mtop');
      if (e) top.appendChild(recLink(m.enm, e.name));
      else { top.appendChild(el('span', 'ref-empty', esc(m.enm || 'No enemy chosen'))); top.appendChild(el('span', 'chip chip-broken', m.enm ? 'Broken' : 'Empty')); }
      c.appendChild(top);
      if (e) {
        var meta = el('div', 'rl-lmeta');
        meta.innerHTML = '<span class="chip chip-muted">Lv ' + esc(e.level == null ? '?' : e.level) + '</span>' + (e.isBoss ? '<span class="chip chip-warning">Boss</span>' : '') + (e.family ? '<span class="chip chip-muted">' + esc(nameOf(e.family)) + '</span>' : '');
        c.appendChild(meta);
      }
      var ctl = el('div', 'rl-mctl');
      var other = rowOf(m) === 'front' ? 'back' : 'front';
      ctl.appendChild(button('To ' + other + ' row', 'jump', 'btn-ghost', function () { m.row = other; commit(); }));
      ctl.appendChild(iconButton('edit', 'Change enemy', function () {
        Kit.ui.pickRef({ prefix: 'enm_', title: 'Choose an enemy', current: m.enm }).then(function (id) { if (id) { m.enm = id; commit(); } });
      }));
      var up = iconButton('up', 'Move up in the row', function () { var j = neighbor(i, -1); if (j >= 0 && swapIn(mem(), i, j)) commit(); });
      var dn = iconButton('down', 'Move down in the row', function () { var j = neighbor(i, 1); if (j >= 0 && swapIn(mem(), i, j)) commit(); });
      up.disabled = neighbor(i, -1) < 0; dn.disabled = neighbor(i, 1) < 0;
      ctl.appendChild(up); ctl.appendChild(dn);
      ctl.appendChild(iconButton('trash', 'Remove from the troop', function () { mem().splice(i, 1); commit(); }, 'btn-danger'));
      c.appendChild(ctl);
      return c;
    }
    function lane(row, title) {
      var l = el('div', 'rl-lane'), h = el('div', 'rl-lane-h');
      var n = mem().filter(function (m) { return rowOf(m) === row; }).length;
      h.innerHTML = '<span>' + esc(title) + '</span><span class="rl-count">' + n + '</span>';
      l.appendChild(h);
      if (!n) l.appendChild(el('div', 'empty-line', 'Empty.'));
      mem().forEach(function (m, i) { if (U.isObj(m) && rowOf(m) === row) l.appendChild(card(m, i)); });
      var add = button('Add to ' + row + ' row', 'plus', '', function () { addTo(row); });
      add.disabled = mem().length >= 8;
      l.appendChild(add);
      return l;
    }
    function paint() {
      U.clear(host);
      host.appendChild(el('h3', 'section-h', 'Row layout'));
      host.appendChild(el('p', 'muted rl-note', 'The front row stands nearest the party. Add up to eight enemies, and move them between rows.'));
      var lanes = el('div', 'rl-lanes');
      lanes.appendChild(lane('back', 'Back row'));
      lanes.appendChild(lane('front', 'Front row'));
      host.appendChild(lanes);
      var y = troopYield(rec);
      host.appendChild(el('div', 'card rl-summary', '<div class="rl-sumline">' + y.count + ' enem' + (y.count === 1 ? 'y' : 'ies') + '. Rewards: ' + y.gil + ' gil, ' + y.exp + ' EXP, ' + y.ap + ' AP.' + (y.boss ? ' Includes a boss.' : '') + (y.missing ? ' ' + y.missing + ' member' + (y.missing === 1 ? '' : 's') + ' need attention.' : '') + '</div>'));
      issues.paint();
      host.appendChild(issues);
    }
    paint();
  }

  // ---------------------------------------------------------------- shops: price sheet
  function shopEffective(entry) {
    if (!U.isObj(entry)) return null;
    var it = recOf(entry.item), base = it && typeof it.price === 'number' ? it.price : 0;
    var ov = entry.priceOverride;
    return typeof ov === 'number' && isFinite(ov) ? ov : base;
  }
  function shopExtras(box, rec, api) {
    var card = el('div', 'card rl-summary');
    box.appendChild(card);
    function paint() {
      U.clear(card);
      card.appendChild(el('h3', 'section-h', 'Price sheet'));
      var inv = Array.isArray(rec.inventory) ? rec.inventory.filter(U.isObj) : [];
      if (!inv.length) card.appendChild(el('div', 'empty-line', 'Nothing in stock yet. Add stock in the Inventory field above.'));
      else {
        var t = el('table', 'tbl'), total = 0;
        var rows = inv.map(function (s) {
          var it = recOf(s.item), eff = shopEffective(s);
          total += num(eff);
          var flag = !it ? ' <span class="chip chip-broken">Missing</span>' : it.kind === 'key' ? ' <span class="chip chip-warning">Key item</span>' : num(eff) === 0 ? ' <span class="chip chip-warning">Free</span>' : '';
          return '<tr><th scope="row">' + esc(it ? it.name : (s.item || '?')) + flag + '</th><td class="num">' + (it && typeof it.price === 'number' ? it.price : 0) + '</td><td class="num">' + (typeof s.priceOverride === 'number' ? s.priceOverride : '') + '</td><td class="num"><strong>' + num(eff) + '</strong></td></tr>';
        }).join('');
        t.innerHTML = '<thead><tr><th scope="col">Stock</th><th scope="col" class="num">Base</th><th scope="col" class="num">Override</th><th scope="col" class="num">Pays</th></tr></thead><tbody>' + rows + '</tbody>';
        var w = el('div', 'tbl-wrap'); w.appendChild(t); card.appendChild(w);
        card.appendChild(el('div', 'muted rl-note', inv.length + ' line' + (inv.length === 1 ? '' : 's') + ', ' + total + ' gil for one of each.'));
      }
      var ch = rec.chapterAvailable ? recOf(rec.chapterAvailable) : null;
      card.appendChild(el('div', 'muted rl-note', ch ? 'Opens in ' + ch.name + '.' : 'Open from the start, since no chapter is set.'));
    }
    paint(); api.onLive(paint);
  }


  // ---------------------------------------------------------------- Expected Party State table and Fill from curves
  function chaptersOf(b) {
    var s = b.charter && b.charter.sections;
    return s && Array.isArray(s.chapters) ? s.chapters.filter(function (c) { return U.isObj(c) && c.id; }) : [];
  }
  function epsOfChapter(id) {
    var l = Kit.records.list('eps_');
    for (var i = 0; i < l.length; i++) { if (l[i].chapter === id) return l[i]; }
    return null;
  }
  function newEps(ch) {
    var name = (ch.name || 'Chapter') + ' state';
    var rec = { id: Kit.ids.mint('eps_', name), name: name, charterVersion: cur().charter.version || 0 };
    typeDefaults('ExpectedPartyState', rec);
    rec.chapter = ch.id;
    Kit.records.put(rec);
    return rec;
  }
  // Total EXP for the final level is spread across the chapters by target minutes. Each chapter gets the highest level
  // whose exp.curve requirement fits inside the EXP the party is expected to have earned by the end of that chapter.
  function planCurves(opts) {
    opts = opts || {};
    var b = cur(), chs = chaptersOf(b);
    if (!chs.length) throw new Error('The Charter has no chapters yet.');
    var finalLevel = clampInt(opts.finalLevel != null && opts.finalLevel !== '' ? opts.finalLevel : uiGet().finalLevel, 2, 99, 50);
    var total = 0;
    chs.forEach(function (c) { total += Math.max(0, num(c.targetMinutes)); });
    if (!(total > 0)) throw new Error('Give the chapters target minutes in the Charter first.');
    function need(L) { return WSX.evalRole('exp', { a: { level: L }, t: {}, power: 0 }); }
    var expFinal = need(finalLevel), acc = 0, rows = [];
    chs.forEach(function (c) {
      acc += Math.max(0, num(c.targetMinutes));
      var target = expFinal * acc / total, lvl = 1;
      for (var L = 1; L <= 99; L++) { if (need(L) <= target) lvl = L; else break; }
      rows.push({ chapter: c.id, name: c.name, level: Math.min(lvl, finalLevel), minutes: num(c.targetMinutes), exp: Math.round(target) });
    });
    return { finalLevel: finalLevel, expFinal: expFinal, totalMinutes: total, rows: rows };
  }
  function applyCurves(plan) {
    var created = 0, changedN = 0, chs = chaptersOf(cur());
    plan.rows.forEach(function (r) {
      var ch = chs.filter(function (c) { return c.id === r.chapter; })[0];
      if (!ch) return;
      var eps = epsOfChapter(r.chapter);
      if (!eps) { eps = newEps(ch); created++; }
      if (eps.targetLevel !== r.level) { eps.targetLevel = r.level; changedN++; }
    });
    Kit.index.invalidate(); Kit.bundle.touch('rules-curves');
    return { created: created, changed: changedN };
  }
  function epsView(main) {
    var b = cur(), chs = chaptersOf(b);
    main.appendChild(el('h2', 'rl-h2', 'Expected Party State'));
    main.appendChild(el('p', 'muted rl-lead', 'One row per chapter: where the party should stand on arrival. The Simulator fights every troop against these rows.'));
    if (!chs.length) main.appendChild(el('div', 'empty-line', 'The Charter has no chapters yet, so there is nothing to plan. Add chapters in the Charter first.'));
    else {
      var pace = el('div', 'rl-block rl-pacing');
      var fl = mkInput({ type: 'number', step: 1, min: 2, max: 99, value: clampInt(uiGet().finalLevel, 2, 99, 50), label: 'Level at the last chapter', onInput: function (v) { uiSet({ finalLevel: clampInt(v, 2, 99, 50) }); } });
      var bar = el('div', 'rl-tools');
      bar.appendChild(fieldBox('Level at the last chapter', fl, 'md'));
      var fill = button('Fill from curves', 'chart', 'btn-primary', function () {
        var plan;
        try { plan = planCurves({ finalLevel: fl.value }); } catch (e) { Kit.ui.toast(e.message, 'warn'); return; }
        uiSet({ finalLevel: plan.finalLevel });
        var clash = plan.rows.filter(function (r) { var e = epsOfChapter(r.chapter); return e && num(e.targetLevel) > 1 && e.targetLevel !== r.level; }).length;
        var go = clash ? Kit.ui.confirm({ title: 'Replace ' + clash + ' target level' + (clash === 1 ? '' : 's') + '?', message: 'Fill from curves overwrites the target level on rows that already have one.', okLabel: 'Replace' }) : Promise.resolve(true);
        go.then(function (ok) {
          if (!ok) return;
          var r = applyCurves(plan);
          Kit.ui.toast('Filled ' + plan.rows.length + ' chapters (' + r.created + ' new rows).', 'ok');
          repaint(true);
        });
      });
      bar.appendChild(fill);
      bar.appendChild(button('Create missing rows', 'plus', 'btn-ghost', function () {
        var n = 0;
        chs.forEach(function (c) { if (!epsOfChapter(c.id)) { newEps(c); n++; } });
        Kit.bundle.touch('rules-new'); Kit.ui.toast(n ? 'Created ' + n + ' row' + (n === 1 ? '' : 's') + '.' : 'Every chapter already has a row.', n ? 'ok' : undefined); repaint(true);
      }));
      pace.appendChild(bar);
      pace.appendChild(el('p', 'muted rl-note', 'Fill from curves uses the EXP curve (exp.curve). The EXP for the last chapter level is spread over the chapters by their target minutes, and each chapter gets the highest level that EXP reaches.'));
      main.appendChild(pace);
      var grid = el('div', 'rl-egrid');
      grid.appendChild(el('div', 'rl-ehead', '<span>Chapter</span><span>Target level</span><span>Gear tier</span><span>Gil on hand</span><span>Target win rate</span><span></span>'));
      chs.forEach(function (c) {
        var eps = epsOfChapter(c.id), row = el('div', 'rl-erow');
        var cap = el('div', 'rl-echap');
        cap.innerHTML = '<strong>' + esc(c.name) + '</strong><span class="muted">' + esc(c.continentLabel || '') + '</span><span class="chip chip-muted">' + num(c.targetMinutes) + ' min</span>';
        row.appendChild(cap);
        if (!eps) {
          row.appendChild(el('span', 'muted rl-note rl-noeps', 'No row yet.'));
          row.appendChild(button('Create row', 'plus', '', function () { newEps(c); Kit.bundle.touch('rules-new'); repaint(true); }));
          grid.appendChild(row);
          return;
        }
        function numField(label, key, o) {
          var inp = mkInput({ type: 'number', step: o.step, min: o.min, max: o.max, value: eps[key] == null ? '' : eps[key], label: label + ' for ' + c.name, onInput: function (v) {
            if (v === '') delete eps[key]; else eps[key] = o.int ? Math.round(Number(v)) : Number(v);
            Kit.index.invalidate(); Kit.bundle.touch('rules-edit');
          } });
          inp.dataset.eps = eps.id; inp.dataset.key = key;
          return fieldBox(label, inp, 'sm');
        }
        row.appendChild(numField('Target level', 'targetLevel', { int: true, step: 1, min: 1, max: 99 }));
        row.appendChild(numField('Gear tier', 'gearTier', { int: true, step: 1, min: 1, max: 20 }));
        row.appendChild(numField('Gil on hand', 'gil', { int: true, step: 1, min: 0, max: 9999999 }));
        row.appendChild(numField('Target win rate', 'targetWinRate', { step: 1, min: 0, max: 100 }));
        row.appendChild(button('Details', 'edit', 'btn-ghost', function () { state.editing = eps.id; repaint(); }));
        grid.appendChild(row);
      });
      main.appendChild(grid);
    }
    var rb = el('div', 'rl-block');
    rb.appendChild(el('h3', 'section-h', 'Records'));
    var host = el('div');
    rb.appendChild(host); main.appendChild(rb);
    listView(host, 'ExpectedPartyState');
  }

  // ---------------------------------------------------------------- economy panel
  function stockedPrice(eqpId, ci, shops, idxOf) {
    var best = null;
    shops.forEach(function (s) {
      var open = s.chapterAvailable ? (idxOf[s.chapterAvailable] != null ? idxOf[s.chapterAvailable] : Infinity) : 0;
      if (open > ci) return;
      (Array.isArray(s.inventory) ? s.inventory : []).forEach(function (e) {
        if (!U.isObj(e) || e.item !== eqpId) return;
        var p = shopEffective(e);
        if (p != null && (best == null || p < best)) best = p;
      });
    });
    return best;
  }
  // The cheapest kit at a gear tier: one weapon, one armor, one accessory. A piece that no open shop sells yet is priced at its base price.
  function gearCost(tier, ci, shops, eqps, idxOf) {
    var cost = 0, parts = [], anyGear = false, unstocked = false;
    ['weapon', 'armor', 'accessory'].forEach(function (slot) {
      var cands = eqps.filter(function (e) { return e.slot === slot && Number(e.tier) === Number(tier); });
      if (!cands.length) return;
      anyGear = true;
      var best = null, bestStocked = null;
      cands.forEach(function (e) {
        var p = stockedPrice(e.id, ci, shops, idxOf), base = num(e.price);
        if (p != null && (bestStocked == null || p < bestStocked.price)) bestStocked = { id: e.id, price: p };
        if (best == null || base < best.price) best = { id: e.id, price: base };
      });
      if (bestStocked) { cost += bestStocked.price; parts.push({ slot: slot, id: bestStocked.id, price: bestStocked.price, stocked: true }); }
      else { cost += best.price; unstocked = true; parts.push({ slot: slot, id: best.id, price: best.price, stocked: false }); }
    });
    return { cost: cost, parts: parts, anyGear: anyGear, unstocked: unstocked };
  }
  function economyModel(b) {
    b = b || cur();
    var bpm = Number(uiGet().battlesPerMin);
    if (!isFinite(bpm) || bpm <= 0) bpm = 1;
    var chs = chaptersOf(b), shops = Kit.records.list('shp_'), eqps = Kit.records.list('eqp_'), troops = Kit.records.list('trp_');
    var idxOf = {}, cumGil = 0, cumAp = 0, rows = [], materia = rsOf(b).progression === 'materia';
    chs.forEach(function (c, i) { idxOf[c.id] = i; });
    chs.forEach(function (c, ci) {
      var ts = troops.filter(function (t) { return t.chapter === c.id; }), ys = ts.map(troopYield);
      var avgGil = 0, avgAp = 0;
      ys.forEach(function (y) { avgGil += y.gil; avgAp += y.ap; });
      if (ys.length) { avgGil /= ys.length; avgAp /= ys.length; }
      var minutes = Math.max(0, num(c.targetMinutes)), battles = Math.round(minutes * bpm);
      var gilIn = Math.round(avgGil * battles), apIn = Math.round(avgAp * battles);
      cumGil += gilIn; cumAp += apIn;
      var eps = epsOfChapter(c.id), tier = eps && eps.gearTier ? eps.gearTier : null;
      var gear = tier ? gearCost(tier, ci, shops, eqps, idxOf) : null;
      var flags = [];
      if (!ts.length) flags.push({ key: 'notroops', level: 'warning', text: 'No troops are tagged to this chapter, so it earns nothing.' });
      if (!eps) flags.push({ key: 'noeps', level: 'warning', text: 'No Expected Party State row, so no gear tier target.' });
      else if (!tier) flags.push({ key: 'notier', level: 'warning', text: 'The Expected Party State row has no gear tier.' });
      if (gear) {
        if (!gear.anyGear) flags.push({ key: 'nogear', level: 'warning', text: 'No equipment is defined at gear tier ' + tier + '.' });
        else {
          if (gear.cost > cumGil) flags.push({ key: 'unaffordable', level: 'error', text: 'Gear tier ' + tier + ' costs about ' + gear.cost + ' gil, but the party has earned about ' + cumGil + ' by now.' });
          if (gear.unstocked) flags.push({ key: 'unstocked', level: 'warning', text: 'No shop open by this chapter sells every piece of tier ' + tier + ' gear.' });
        }
      }
      var apNeed = null;
      if (materia && eps && Array.isArray(eps.materiaSet)) {
        apNeed = 0;
        eps.materiaSet.forEach(function (id) {
          var m = recOf(id), th = m && Array.isArray(m.apThresholds) ? m.apThresholds : [];
          if (th.length) apNeed += num(th[th.length - 1]);
        });
        if (apNeed > cumAp) flags.push({ key: 'apshort', level: 'warning', text: 'The materia set needs about ' + apNeed + ' AP to master, and the party has earned about ' + cumAp + '.' });
      }
      rows.push({ id: c.id, name: c.name, minutes: minutes, troops: ts.length, avgGil: avgGil, avgAp: avgAp, battles: battles, gilIn: gilIn, apIn: apIn, cumGil: cumGil, cumAp: cumAp, tier: tier, gear: gear, apNeed: apNeed, flags: flags });
    });
    var priceLists = shops.map(function (s) {
      var inv = (Array.isArray(s.inventory) ? s.inventory : []).filter(U.isObj), prices = inv.map(shopEffective).filter(function (p) { return p != null; });
      var open = s.chapterAvailable ? (idxOf[s.chapterAvailable] != null ? chs[idxOf[s.chapterAvailable]].name : 'unknown chapter') : 'the start';
      return { id: s.id, name: s.name, open: open, lines: inv.length, cheapest: prices.length ? Math.min.apply(null, prices) : null, priciest: prices.length ? Math.max.apply(null, prices) : null };
    });
    var unaffordable = rows.filter(function (r) { return r.flags.some(function (f) { return f.key === 'unaffordable'; }); }).map(function (r) { return r.id; });
    return { battlesPerMin: bpm, rows: rows, shops: priceLists, unaffordable: unaffordable, totalGil: cumGil, totalAp: cumAp };
  }
  function economyView(main) {
    var b = cur(), m = economyModel(b);
    main.appendChild(el('h2', 'rl-h2', 'Economy'));
    main.appendChild(el('p', 'muted rl-lead', 'A planning estimate, not a simulation. Income is the average gil and AP of the troops tagged to each chapter, times the number of battles the target minutes allow. It is compared with the price of the gear tier the Expected Party State expects.'));
    var pace = el('div', 'rl-tools');
    var bp = mkInput({ type: 'number', step: 0.1, min: 0.1, max: 10, value: m.battlesPerMin, label: 'Battles per minute' });
    bp.addEventListener('change', function () { var v = Number(bp.value); uiSet({ battlesPerMin: isFinite(v) && v > 0 ? v : 1 }); repaint(true); });
    pace.appendChild(fieldBox('Battles per minute', bp, 'md'));
    var sum = el('div', 'rl-chipbar');
    sum.innerHTML = '<span class="chip chip-muted">' + m.rows.length + ' chapters</span><span class="chip chip-muted">' + m.totalGil + ' gil in total</span><span class="chip chip-muted">' + m.totalAp + ' AP in total</span><span class="chip ' + (m.unaffordable.length ? 'chip-error' : 'chip-ok') + '">' + m.unaffordable.length + ' unaffordable</span>';
    pace.appendChild(sum);
    main.appendChild(pace);
    if (!m.rows.length) { main.appendChild(el('div', 'empty-line', 'The Charter has no chapters yet. Add chapters in the Charter, then tag troops to them.')); return; }
    var chartWrap = el('div', 'rl-block');
    chartWrap.appendChild(el('h3', 'section-h', 'Gil earned against gear cost'));
    var cw = el('div', 'rl-chart'), canvas = el('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', 'Cumulative gil earned by chapter compared with the cost of the target gear tier. The cards below give every number.');
    cw.appendChild(canvas); chartWrap.appendChild(cw);
    main.appendChild(chartWrap);
    var chart = null, dead = false;
    prevCtl = { destroy: function () { dead = true; if (chart) { chart.destroy(); chart = null; } } };
    whenChart(function (C) {
      if (dead || !alive(cw)) return;
      if (!C) { chartWrap.hidden = true; return; }
      var cs = getComputedStyle(document.documentElement);
      var accent = (cs.getPropertyValue('--accent') || '#d4a24c').trim() || '#d4a24c';
      var warn = (cs.getPropertyValue('--warn') || '#eaa84a').trim() || '#eaa84a';
      var grid = (cs.getPropertyValue('--line') || 'rgba(128,128,128,.25)').trim() || 'rgba(128,128,128,.25)';
      var txt = (cs.getPropertyValue('--muted') || '#999').trim() || '#999';
      chart = new C(canvas.getContext('2d'), {
        type: 'line',
        data: { labels: m.rows.map(function (r) { return r.name; }), datasets: [
          { label: 'Cumulative gil earned', data: m.rows.map(function (r) { return r.cumGil; }), borderColor: accent, backgroundColor: accent, borderWidth: 2, pointRadius: 3, tension: 0.1 },
          { label: 'Target gear cost', data: m.rows.map(function (r) { return r.gear && r.gear.anyGear ? r.gear.cost : null; }), borderColor: warn, backgroundColor: warn, borderWidth: 2, borderDash: [6, 4], pointRadius: 3, tension: 0.1, spanGaps: true }
        ] },
        options: { responsive: true, maintainAspectRatio: false, animation: false, interaction: { mode: 'index', intersect: false },
          plugins: { legend: { labels: { color: txt } } },
          scales: { x: { ticks: { color: txt, maxRotation: 45, autoSkip: true }, grid: { color: grid } }, y: { title: { display: true, text: 'Gil', color: txt }, ticks: { color: txt }, grid: { color: grid }, beginAtZero: true } } }
      });
      canvas.dataset.points = String(m.rows.length);
    });
    var cards = el('div', 'rl-econ');
    m.rows.forEach(function (r) {
      var c = el('div', 'card rl-ecard' + (r.flags.some(function (f) { return f.level === 'error'; }) ? ' bad' : ''));
      var head = el('div', 'rl-ecard-h');
      head.innerHTML = '<strong>' + esc(r.name) + '</strong>' + (r.tier ? '<span class="chip chip-muted">Gear tier ' + r.tier + '</span>' : '');
      c.appendChild(head);
      var kv = el('div', 'rl-kv');
      function item(k, v) { kv.appendChild(el('div', null, '<span>' + esc(k) + '</span><strong>' + esc(v) + '</strong>')); }
      item('Minutes', r.minutes); item('Troops tagged', r.troops);
      item('Avg gil per battle', Math.round(r.avgGil)); item('Battles', r.battles);
      item('Gil earned', r.gilIn); item('Cumulative gil', r.cumGil);
      item('AP earned', r.apIn); item('Cumulative AP', r.cumAp);
      item('Target gear cost', r.gear && r.gear.anyGear ? r.gear.cost : 'None');
      item('AP to master set', r.apNeed == null ? 'None' : r.apNeed);
      c.appendChild(kv);
      if (r.flags.length) {
        var fl = el('div', 'rl-flags');
        r.flags.forEach(function (f) { fl.appendChild(el('div', 'msg msg-' + (f.level === 'error' ? 'error' : 'warning'), esc(f.text))); });
        c.appendChild(fl);
      }
      cards.appendChild(c);
    });
    main.appendChild(cards);
    var sh = el('div', 'rl-block');
    sh.appendChild(el('h3', 'section-h', 'Shop price lists'));
    if (!m.shops.length) {
      sh.appendChild(el('div', 'empty-line', 'No shops yet. Create shops in the Shops list.'));
      var goS = el('button', 'btn btn-primary', 'Create a shop'); goS.type = 'button';
      goS.addEventListener('click', function () { WSX.open('type:Shop'); });
      sh.appendChild(goS);
    }
    else {
      var list = el('div', 'rl-reclist');
      m.shops.forEach(function (s) {
        var row = el('div', 'rl-rec'), btn = el('button', 'rl-rec-main'); btn.type = 'button';
        btn.innerHTML = '<strong>' + esc(s.name) + '</strong><span class="muted">Opens at ' + esc(s.open) + '. ' + s.lines + ' line' + (s.lines === 1 ? '' : 's') + (s.cheapest == null ? '' : ', ' + s.cheapest + ' to ' + s.priciest + ' gil') + '.</span>';
        btn.addEventListener('click', function () { openRecord(s.id); });
        row.appendChild(btn); list.appendChild(row);
      });
      sh.appendChild(list);
    }
    main.appendChild(sh);
  }

  // ---------------------------------------------------------------- characters: draft from the Charter party
  function seedPrompt(seeds, dir) {
    var n = seeds.length;
    return 'Draft ' + n + ' playable character' + (n > 1 ? 's' : '') + ', one for each of these Charter party entries' + (n > 1 ? ', in this order' : '') + '. Use each name exactly as written and let the character honor the past. ' +
      seeds.map(function (m, k) { return (k + 1) + '. ' + m.name + ': ' + (m.past || 'no past written yet') + '.'; }).join(' ') +
      ' Give each a distinct weapon class and stat leanings, base stats near the low end of each declared stat range for level 1, and small growth values.' + (dir ? ' Direction: ' + dir : '');
  }
  function characterDraftDialog(mode, preselect) {
    var members = partyMembers(cur());
    if (!members.length) return Promise.resolve({ generic: true });
    return new Promise(function (resolve) {
      var inputs = [], dir;
      Kit.ui.dialog({
        title: mode === 'set' ? 'Draft characters from the Charter party' : 'Draft a character from the Charter party',
        body: function (body) {
          body.appendChild(el('p', 'muted', 'Each draft is seeded by a party entry and keeps its name and past.'));
          var list = el('div', 'rl-seedlist'), firstFree = -1;
          members.forEach(function (m, i) { if (firstFree < 0 && !chrByName(m.name)) firstFree = i; });
          members.forEach(function (m, i) {
            var has = chrByName(m.name), lab = el('label', 'rl-seed');
            var inp = el('input'); inp.type = mode === 'set' ? 'checkbox' : 'radio'; inp.name = 'rl_seed'; inp.value = String(i);
            inp.checked = preselect != null ? preselect === i : (mode === 'set' ? !has : (firstFree >= 0 ? i === firstFree : i === 0));
            inputs.push(inp);
            lab.appendChild(inp);
            var txt = el('span', 'rl-seed-t');
            txt.innerHTML = '<strong>' + esc(m.name) + '</strong>' + (has ? ' <span class="chip chip-ok">Has a record</span>' : ' <span class="chip chip-muted">No record yet</span>') + '<span class="muted rl-note">' + esc(m.past || '') + '</span>';
            lab.appendChild(txt);
            list.appendChild(lab);
          });
          body.appendChild(list);
          var f = el('div', 'field'); f.appendChild(el('label', 'field-label', 'Direction'));
          dir = el('textarea', 'inp'); dir.rows = 2; dir.id = 'rl_cdir'; dir.placeholder = 'Optional. For example: keep the party balanced between melee and magic.';
          f.firstChild.htmlFor = 'rl_cdir'; f.appendChild(dir); body.appendChild(f);
        },
        actions: [{ label: 'Cancel', kind: 'ghost', value: null }, { label: mode === 'set' ? 'Draft the set' : 'Draft', kind: 'primary', value: 'go' }],
        onResult: function (v) {
          if (v !== 'go') { resolve(null); return; }
          var seeds = [];
          inputs.forEach(function (inp, i) { if (inp.checked) seeds.push(members[i]); });
          if (!seeds.length) { Kit.ui.toast('Choose at least one party entry.', 'warn'); resolve(null); return; }
          seeds = seeds.slice(0, 12);
          resolve({ count: seeds.length, prompt: seedPrompt(seeds, dir.value.trim()) });
        }
      });
    });
  }
  function characterListExtras(main) {
    var members = partyMembers(cur());
    var box = el('div', 'rl-block');
    box.appendChild(el('h3', 'section-h', 'Charter party'));
    if (!members.length) { box.appendChild(el('div', 'empty-line', 'The Charter party has no members yet. Add them in the Charter, and each one can seed a character here.')); main.appendChild(box); return; }
    var list = el('div', 'rl-reclist');
    members.forEach(function (m, i) {
      var has = chrByName(m.name), row = el('div', 'rl-rec rl-seedrow');
      var info = el('div', 'rl-rec-main rl-seedinfo');
      info.innerHTML = '<strong>' + esc(m.name) + '</strong>' + (has ? '<span class="chip chip-ok">Has a record</span>' : '<span class="chip chip-muted">No record yet</span>') + '<span class="muted rl-note rl-seedpast">' + esc(m.past || '') + '</span>';
      row.appendChild(info);
      var acts = el('div', 'rl-seedacts');
      if (has) acts.appendChild(recLink(has.id, 'Open'));
      else acts.appendChild(button('Create blank', 'plus', 'btn-ghost', function () {
        var rec = newRecord('Character', String(m.name).trim());
        state.view = 'type:Character'; state.editing = rec.id; repaint();
      }));
      acts.appendChild(Kit.ai.button('Draft', function () { return runDraft('Character', 'one', i).then(function () { repaint(); }); }, { busyLabel: 'Drafting...' }));
      row.appendChild(acts);
      list.appendChild(row);
    });
    box.appendChild(list);
    main.appendChild(box);
  }
  WSX.content = {
    slotLayoutOf: slotLayoutOf, describeRule: describeRule, describeCounter: describeCounter, generateTiers: generateTiers,
    planCurves: planCurves, applyCurves: applyCurves, economy: economyModel, troopYield: troopYield, shiftHex: shiftHex,
    ablSummary: ablSummary, chaptersOf: chaptersOf, epsOfChapter: epsOfChapter, partyMembers: partyMembers, seedPrompt: seedPrompt, shopEffective: shopEffective
  };

  function editorView(main, typeName, rec) {
    var t = typeByName(typeName), b = cur();
    var stale = staleMap(b)[rec.id];
    var head = el('div', 'rl-edhead');
    head.appendChild(button('Back', 'up', 'btn-ghost rl-back', function () { state.editing = null; if (typeName === 'Formula') state.view = 'sys:formulas'; repaint(); }));
    var title = el('div', 'rl-edtitle', '<strong>' + esc(rec.name || rec.id) + '</strong><code class="id">' + esc(rec.id) + '</code>');
    head.appendChild(title);
    var acts = el('div', 'rl-edacts');
    if (stale) {
      head.appendChild(el('span', 'chip chip-warning', 'Needs review for Charter v' + stale.need));
      acts.appendChild(button('Mark reviewed', 'check', '', function () { markReviewed(rec); repaint(); }));
    }
    acts.appendChild(button('Duplicate', 'slots', 'btn-ghost', function () { var c = dupRecord(rec, typeName); state.editing = c.id; repaint(); Kit.ui.toast('Duplicated as ' + c.name + '.', 'ok'); }));
    acts.appendChild(button('Delete', 'trash', 'btn-ghost btn-danger', function () { deleteRecord(rec, typeName).then(function (ok) { if (ok) { state.editing = null; repaint(); } }); }));
    head.appendChild(acts);
    main.appendChild(head);
    var formHost = el('div', 'rl-form'), extras = el('div', 'rl-extras');
    main.appendChild(formHost); main.appendChild(extras);
    var live = [];
    var api = {
      onLive: function (fn) { live.push(fn); },
      changed: function (rebuild) {
        Kit.index.invalidate(); Kit.bundle.touch('rules-edit');
        if (rebuild) { repaint(true); return; }
        live.forEach(function (fn) { fn(); });
      }
    };
    kform = Kit.form.render(formHost, typeName, rec, function () { api.changed(false); }, {});
    // Fields that a visual builder below the form owns are hidden here, so nothing is edited in two places.
    ((TYPE_CFG[typeName] || {}).hide || []).forEach(function (p) {
      var w = formHost.querySelector('.field[data-path="' + p + '"]');
      if (w) { w.style.display = 'none'; w.setAttribute('data-hidden', 'builder'); }
    });
    var cfg = TYPE_CFG[typeName];
    if (cfg && cfg.extras) cfg.extras(extras, rec, api);
    void t;
  }

  function matches(rec, q) {
    if (!q) return true;
    q = q.toLowerCase();
    return String(rec.name || '').toLowerCase().indexOf(q) >= 0 || String(rec.id || '').indexOf(q) >= 0 || String(rec.notes || '').toLowerCase().indexOf(q) >= 0;
  }
  function draftDialog(typeName, mode) {
    var t = typeByName(typeName), label = t.label || typeName;
    var cfg = TYPE_CFG[typeName] || {};
    return new Promise(function (resolve) {
      var count, dir;
      Kit.ui.dialog({
        title: mode === 'set' ? 'Draft a set of ' + label + ' records' : 'Draft a ' + label + ' with Claude',
        body: function (body) {
          if (mode === 'set') {
            var f1 = el('div', 'field'); f1.appendChild(el('label', 'field-label', 'How many'));
            count = el('input', 'inp'); count.type = 'number'; count.min = 2; count.max = 8; count.value = 4; count.inputMode = 'numeric'; count.id = 'rl_dcount';
            f1.firstChild.htmlFor = 'rl_dcount'; f1.appendChild(count); body.appendChild(f1);
          }
          var f2 = el('div', 'field'); f2.appendChild(el('label', 'field-label', mode === 'set' ? 'Direction for the set' : 'What should it be?'));
          dir = el('textarea', 'inp'); dir.rows = 3; dir.id = 'rl_ddir'; dir.placeholder = 'Optional. For example: things found in the frozen north.';
          f2.firstChild.htmlFor = 'rl_ddir'; f2.appendChild(dir); body.appendChild(f2);
        },
        actions: [{ label: 'Cancel', kind: 'ghost', value: null }, { label: mode === 'set' ? 'Draft the set' : 'Draft', kind: 'primary', value: 'go' }],
        onResult: function (v) {
          if (v !== 'go') { resolve(null); return; }
          var n = mode === 'set' ? Math.max(2, Math.min(8, Math.round(Number(count.value)) || 4)) : 1;
          var d = dir.value.trim();
          var base = typeof cfg.draftPrompt === 'function' ? cfg.draftPrompt(cur()) : cfg.draftPrompt;
          var p = (base || ('Draft ' + n + ' ' + label + ' record' + (n > 1 ? 's' : '') + ' that fit the Charter.')) + (n > 1 ? ' Draft ' + n + ' records that work well together and do not repeat each other.' : '') + (d ? ' Direction: ' + d : '');
          resolve({ count: n, prompt: p });
        }
      });
    });
  }
  function runDraft(typeName, mode, seed) {
    function go(o) {
      if (!o) return null;
      return Kit.ai.draftRecords(typeName, {
        count: o.count, prompt: o.prompt, tier: 'sonnet',
        onAccept: function (rec) { Kit.records.put(rec); Kit.index.invalidate(); if (o.count === 1) { state.view = 'type:' + typeName; state.editing = rec.id; } }
      });
    }
    // Characters are seeded from the Charter party entries. With no party entries the plain dialog is used.
    var first = typeName === 'Character' ? characterDraftDialog(mode, seed) : draftDialog(typeName, mode);
    return first.then(function (o) { return o && o.generic ? draftDialog(typeName, mode).then(go) : go(o); });
  }

  function listView(main, typeName) {
    var t = typeByName(typeName), b = cur();
    var label = t.label || typeName;
    var all = Kit.records.list(t.prefix).slice().sort(function (x, y) { return String(x.name || '').localeCompare(String(y.name || '')); });
    var stale = staleMap(b);
    var bar = el('div', 'rl-toolbar');
    var s = el('input', 'inp rl-search'); s.type = 'search'; s.placeholder = 'Search ' + label.toLowerCase() + ' records'; s.setAttribute('aria-label', 'Search ' + label + ' records');
    s.value = state.search[typeName] || '';
    bar.appendChild(s);
    bar.appendChild(button('New', 'plus', 'btn-primary', function () {
      askName('New ' + label, '').then(function (n) {
        if (n == null) return;
        var rec = newRecord(typeName, n.trim());
        state.view = 'type:' + typeName; state.editing = rec.id; repaint();
      });
    }));
    bar.appendChild(Kit.ai.button('Draft with Claude', function () { return runDraft(typeName, 'one').then(function () { repaint(); }); }, { busyLabel: 'Drafting...' }));
    bar.appendChild(Kit.ai.button('Draft a Set', function () { return runDraft(typeName, 'set').then(function () { repaint(); }); }, { busyLabel: 'Drafting...' }));
    main.appendChild(bar);
    var lcfg = TYPE_CFG[typeName];
    if (lcfg && lcfg.listExtras) lcfg.listExtras(main);
    var list = el('div', 'rl-reclist');
    main.appendChild(list);
    function paint() {
      U.clear(list);
      var q = s.value.trim();
      var shown = all.filter(function (r) { return matches(r, q); });
      if (!all.length) { list.appendChild(el('div', 'empty-line', 'No ' + label.toLowerCase() + ' records yet. Use New, or ask Claude to draft some.')); return; }
      if (!shown.length) { list.appendChild(el('div', 'empty-line', 'No matches for that search.')); return; }
      var errs = (Kit.validate.last && Kit.validate.last.byRecord) || {};
      shown.forEach(function (r) {
        var row = el('div', 'rl-rec');
        var open = el('button', 'rl-rec-main'); open.type = 'button';
        var n = (errs[r.id] || []).filter(function (x) { return x.level === 'error' || x.level === 'broken'; }).length;
        open.innerHTML = '<strong>' + esc(r.name || r.id) + '</strong><code class="id">' + esc(r.id) + '</code>' +
          (stale[r.id] ? '<span class="chip chip-warning">Review</span>' : '') + (n ? '<span class="chip chip-error">' + n + ' issue' + (n === 1 ? '' : 's') + '</span>' : '');
        open.addEventListener('click', function () { state.view = 'type:' + typeName; state.editing = r.id; repaint(); });
        row.appendChild(open);
        row.appendChild(iconButton('slots', 'Duplicate ' + (r.name || r.id), function () { var c = dupRecord(r, typeName); state.view = 'type:' + typeName; state.editing = c.id; repaint(); }));
        row.appendChild(iconButton('trash', 'Delete ' + (r.name || r.id), function () { deleteRecord(r, typeName).then(function (ok) { if (ok) repaint(); }); }));
        list.appendChild(row);
      });
    }
    s.addEventListener('input', function () { state.search[typeName] = s.value; paint(); });
    paint();
  }

  function formulasView(main) {
    var t = typeByName('Formula');
    var fs = rsOf().formulaSet;
    var role = el('div', 'rl-block');
    role.appendChild(el('h3', 'section-h', 'Formula set'));
    var roles = U.isObj(fs) ? Object.keys(fs) : [];
    if (!roles.length) role.appendChild(el('div', 'empty-line', 'The ruleset assigns no formulas yet. Choose a preset in the Charter, or amend it.'));
    else {
      var tb = el('div', 'rl-roles');
      roles.forEach(function (rk) {
        var id = fs[rk], ok = !!WSX.formulaSource(id);
        var chip = el('button', 'rl-role' + (ok ? '' : ' bad')); chip.type = 'button';
        chip.innerHTML = '<span class="muted">' + esc(rk) + '</span><code>' + esc(id) + '</code>' + (ok ? '' : '<span class="chip chip-error">missing</span>');
        chip.addEventListener('click', function () { if (FORMULA_LIB[id]) showLib(id); else if (ok) { state.view = 'type:Formula'; state.editing = id; repaint(); } });
        tb.appendChild(chip);
      });
      role.appendChild(tb);
    }
    main.appendChild(role);
    var lib = el('div', 'rl-block');
    lib.appendChild(el('h3', 'section-h', 'Template library'));
    lib.appendChild(el('p', 'muted rl-lead', 'These templates mirror the ones the battle engine implements. Preview any of them, or start a formula record from one.'));
    var grid = el('div', 'rl-libgrid');
    FORMULA_ORDER.forEach(function (id) {
      var l = FORMULA_LIB[id], card = el('div', 'card rl-libcard');
      card.innerHTML = '<div class="rl-libhead"><code>' + esc(id) + '</code><span class="chip chip-muted">' + esc(l.kind) + '</span></div><strong>' + esc(l.label) + '</strong><p class="muted">' + esc(l.note) + '</p>';
      var act = el('div', 'btn-row');
      act.appendChild(button('Preview', 'chart', 'btn-ghost', function () { showLib(id); }));
      if (t) act.appendChild(button('Use', 'plus', '', function () {
        askName('New formula from ' + id, l.label).then(function (n) {
          if (n == null) return;
          var rec = newRecord('Formula', n.trim()); rec.template = id; rec.params = {};
          Kit.bundle.touch('rules-new'); state.view = 'type:Formula'; state.editing = rec.id; repaint();
        });
      }));
      card.appendChild(act); grid.appendChild(card);
    });
    lib.appendChild(grid);
    main.appendChild(lib);
    if (t) {
      var rec = el('div', 'rl-block');
      rec.appendChild(el('h3', 'section-h', 'Your formulas'));
      var box = el('div'); rec.appendChild(box); main.appendChild(rec);
      listView(box, 'Formula');
    }
  }
  function showLib(id) {
    var src = libSource(id), ctl = null;
    Kit.ui.drawer({
      title: id + ': ' + src.label,
      onClose: function () { if (ctl) ctl.destroy(); },
      body: function (body) {
        var d = el('div', 'rl-expr'); d.innerHTML = '<span class="muted">Expression:</span> <code>' + esc(src.expr) + '</code>';
        var p = el('div', 'rl-defaults'); p.innerHTML = '<span class="muted">Parameters:</span> ' + Object.keys(src.params).map(function (k) { return '<code>' + esc(k) + ' = ' + esc(src.params[k]) + '</code>'; }).join(' ');
        body.appendChild(el('p', 'muted', esc(src.note))); body.appendChild(d); body.appendChild(p);
        var host = el('div'); body.appendChild(host);
        ctl = WSX.preview(host, function () { return libSource(id); });
      }
    });
  }

  function systemsView(main, which) {
    var head = el('div', 'rl-syshead');
    head.appendChild(el('h2', 'rl-h2', esc(RS.LABELS[which])));
    main.appendChild(head);
    var b = cur();
    var ctx = sysCtx(function () { Kit.refreshValidation(); });
    if (which !== 'affinity') {
      if (ctx.readOnly) lockedBanner(main);
    }
    var host = el('div', 'rl-sys');
    main.appendChild(host);
    RS[which](host, ctx);
    void b;
  }

  // ---------------------------------------------------------------- shell
  function repaint(keepScroll) {
    if (!hostRef || !alive(hostRef)) return;
    var y = keepScroll ? window.scrollY : 0;
    var host = hostRef;
    WSX.render(host, cur(), true);
    if (keepScroll) window.scrollTo(0, y);
  }
  function railButton(item, active) {
    var b = el('button', 'rl-nav' + (active ? ' on' : '')); b.type = 'button';
    var n = item.type ? counts(item.type) : null;
    b.innerHTML = Kit.icon(item.icon) + '<span class="rl-nav-l">' + esc(item.label) + '</span>' + (n != null ? '<span class="rl-count">' + n + '</span>' : '');
    b.dataset.view = item.view;
    if (active) b.setAttribute('aria-current', 'page');
    b.addEventListener('click', function () { state.view = item.view; state.editing = null; uiSet({ view: item.view }); repaint(); });
    return b;
  }
  WSX.render = function (host, b, isRepaint) {
    hostRef = host;
    if (prevCtl) { prevCtl.destroy(); prevCtl = null; }
    U.clear(host);
    var model = railModel();
    if (!state.view || !viewExists(state.view)) { var saved = uiGet().view; state.view = viewExists(saved) ? saved : 'sys:stats'; }
    var wrap = el('div', 'rl-wrap');
    var rail = el('nav', 'rl-rail'); rail.setAttribute('aria-label', 'Rules sections');
    var g1 = el('div', 'rl-group'), g2 = el('div', 'rl-group');
    var curView = state.view === 'type:Formula' ? 'sys:formulas' : state.view;
    g1.appendChild(el('div', 'rl-group-h', 'Systems'));
    model.sys.forEach(function (i) { g1.appendChild(railButton(i, i.view === curView)); });
    g2.appendChild(el('div', 'rl-group-h', 'Content'));
    model.content.forEach(function (i) { g2.appendChild(railButton(i, i.view === curView)); });
    if (!model.content.length) g2.appendChild(el('div', 'muted rl-note', 'Generate the Codex to add content types.'));
    rail.appendChild(g1); rail.appendChild(g2);
    var main = el('section', 'rl-main panel');
    wrap.appendChild(rail); wrap.appendChild(main);
    host.appendChild(wrap);
    var v = state.view;
    if (v === 'econ') { state.editing = null; economyView(main); }
    else if (v.indexOf('sys:') === 0) {
      var k = v.slice(4);
      if (k === 'formulas') { main.appendChild(el('h2', 'rl-h2', 'Formulas')); state.editing = null; formulasView(main); }
      else systemsView(main, k);
    } else {
      var tn = v.slice(5), t = typeByName(tn);
      if (!t) main.appendChild(el('div', 'empty-line', 'That type is not in the Codex.'));
      else {
        var rec = state.editing ? Kit.records.get(state.editing) : null;
        if (state.editing && !rec) state.editing = null;
        if (rec) editorView(main, tn, rec);
        else if (tn === 'ExpectedPartyState') epsView(main);
        else { main.appendChild(el('h2', 'rl-h2', esc(v === 'type:Status' ? 'Statuses' : v === 'type:Weather' ? 'Weather states' : (t.label || tn)))); listView(main, tn); }
      }
    }
    if (isRepaint && state.focusPath) {
      // Fields owned by a builder are hidden in the form, so jump to the builder that carries that path.
      var fp = state.focusPath, bh = null;
      Array.prototype.forEach.call(host.querySelectorAll('[data-bpath]'), function (n) {
        var bp = n.getAttribute('data-bpath');
        if (fp === bp || fp.indexOf(bp + '.') === 0 || fp.indexOf(bp + '[') === 0) bh = n;
      });
      if (bh) bh.scrollIntoView({ block: 'center' });
      else if (kform) kform.focusPath(fp);
      state.focusPath = null;
    }
  };

  WSX.focus = function (recordId, fieldPath) {
    if (recordId === 'charter:ruleset') {
      var m = /^(stats|elements|elementRelations|taxonomy)/.exec(fieldPath || '');
      state.view = 'sys:' + (m ? { stats: 'stats', elements: 'elements', elementRelations: 'relations', taxonomy: 'taxonomy' }[m[1]] : 'stats');
      state.editing = null; repaint(); return true;
    }
    var tn = typeOfRecordId(recordId);
    if (!tn) return false;
    state.view = 'type:' + tn; state.editing = recordId; state.focusPath = fieldPath || null;
    repaint();
    return true;
  };
  WSX.open = function (view, id) { state.view = view; state.editing = id || null; if (Kit.active() === 'rules') repaint(); else Kit.go('rules'); };
  WSX.state = state;

  // ---------------------------------------------------------------- validation
  Kit.validate.register('rules.formulas', function (b) {
    var out = [], fs = rsOf(b).formulaSet;
    Kit.records.list('frm_').forEach(function (r) {
      var hasT = !!r.template, hasE = typeof r.expr === 'string' && r.expr.trim();
      if (hasT && !FORMULA_LIB[r.template]) out.push({ recordId: r.id, fieldPath: 'template', message: 'The template "' + r.template + '" is not in the formula library.', level: 'error' });
      else if (!hasT && !hasE) out.push({ recordId: r.id, fieldPath: 'template', message: 'Choose a template or write an expression.', level: 'error' });
      else if (!hasT && hasE) {
        try { Kit.expr.parse(r.expr, { stats: statKeys(b), params: Object.keys(numericParams(r.params)) }); }
        catch (e) { out.push({ recordId: r.id, fieldPath: 'expr', message: e.message, level: 'error' }); }
      }
    });
    if (U.isObj(fs)) Object.keys(fs).forEach(function (role) {
      var id = fs[role];
      if (!id) return;
      if (!FORMULA_LIB[id] && !(Kit.ids.isValid(id) && Kit.records.get(id))) out.push({ recordId: 'charter:ruleset', fieldPath: 'formulaSet.' + role, message: 'The ' + role + ' formula "' + id + '" does not exist.', level: 'warning' });
    });
    return out;
  });

  Kit.mount('rules', { title: 'Rules', icon: 'sword', canEnter: WSX.canEnter, render: WSX.render, focus: WSX.focus });
})();
// === WS:RULES END ===
