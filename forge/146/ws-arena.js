// === WS:ARENA BEGIN ===
(function () {
  'use strict';
  var U = Kit.util, el = function (t, c, h) { return U.el(t, c, h); }, esc = U.esc;
  var WSX = window.WS.arena = { id: 'arena' };
  var SETUP_KEY = 'saga146:arena:setup';
  var PARTY_MAX = 4;
  var PARTY_TINTS = ['#e3b453', '#6fc7b6', '#e07a9a', '#8fa8ff', '#b7d56b', '#f09a5a', '#c89cf0', '#66b8e0'];

  function cur() { return Kit.bundle.current(); }
  function count(b, p) { return b && b.rules && b.rules[p] ? Object.keys(b.rules[p]).length : 0; }
  function recs(b, p) { var o = b && b.rules && b.rules[p] ? b.rules[p] : {}; return Object.keys(o).map(function (k) { return o[k]; }).filter(function (r) { return U.isObj(r) && r.id; }); }
  function recOf(b, id) { var p = Kit.ids.prefixOf(id); return p && b.rules && b.rules[p] && b.rules[p][id] ? b.rules[p][id] : null; }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : (d === undefined ? 0 : d); }
  function rs(b) { return (b && b.charter && b.charter.ruleset) || {}; }
  function chapters(b) { return window.WS.rules && WS.rules.content ? WS.rules.content.chaptersOf(b) : []; }
  function epsFor(b, chId) { var l = recs(b, 'eps_'); for (var i = 0; i < l.length; i++) if (l[i].chapter === chId) return l[i]; return null; }
  function resolution(b) { return window.WS.charter && WS.charter.resolution ? WS.charter.resolution(b) : { w: 256, h: 224 }; }
  function randomSeed() { return Math.floor(Math.random() * 2147483646) + 1; }

  WSX.canEnter = function (b) {
    var r = window.WS.rules.canEnter(b);
    if (r !== true) return r;
    return count(b, 'trp_') ? true : 'Author a troop in Rules to open the Arena.';
  };

  // ------------------------------------------------------------------ party building (shared with the Simulator)
  function bestGear(b, slot, weaponClass, tier) {
    var best = null;
    recs(b, 'eqp_').forEach(function (e) {
      if (e.slot !== slot) return;
      if (slot === 'weapon' && e.weaponClass && weaponClass && String(e.weaponClass).toLowerCase() !== String(weaponClass).toLowerCase()) return;
      var t = num(e.tier, 1);
      if (t > tier) return;
      if (!best || t > num(best.tier, 1) || (t === num(best.tier, 1) && num(e.price) > num(best.price))) best = e;
    });
    return best;
  }
  // Places materia into the party gear: each support materia takes a free linked pair beside the next non support materia,
  // then everything else fills free slots member by member.
  function placeMateria(b, members, matIds) {
    var slots = [];
    members.forEach(function (m, mi) {
      (m.equipment || []).forEach(function (eid) {
        var e = recOf(b, eid), lay = e && U.isObj(e.slotLayout) ? e.slotLayout : null, n = lay ? Math.max(0, Math.min(8, num(lay.count))) : 0;
        for (var i = 0; i < n; i++) slots.push({ mi: mi, eqp: eid, slot: i, links: (lay.links || []).filter(function (l) { return Array.isArray(l) && (l[0] === i || l[1] === i); }), used: false });
      });
    });
    var mats = (matIds || []).map(function (id) { return recOf(b, id); }).filter(Boolean);
    var supports = mats.filter(function (m) { return m.kind === 'support'; }), others = mats.filter(function (m) { return m.kind !== 'support'; });
    function free(eqp, mi, s) { for (var i = 0; i < slots.length; i++) if (slots[i].mi === mi && slots[i].eqp === eqp && slots[i].slot === s && !slots[i].used) return slots[i]; return null; }
    function put(sl, m) { sl.used = true; members[sl.mi].materia.push({ eqp: sl.eqp, slot: sl.slot, mat: m.id, ap: 0 }); }
    supports.forEach(function (sm) {
      var partner = others[0], done = false;
      slots.forEach(function (sl) {
        if (done || sl.used) return;
        sl.links.forEach(function (l) {
          if (done) return;
          var o = l[0] === sl.slot ? l[1] : l[0], os = free(sl.eqp, sl.mi, o);
          if (!os) return;
          put(sl, sm); done = true;
          if (partner) { put(os, partner); others.shift(); }
        });
      });
      if (!done) others.push(sm);
    });
    var mi = 0;
    others.forEach(function (m) {
      var tries = 0, sl = null;
      while (!sl && tries < members.length) {
        for (var i = 0; i < slots.length; i++) if (!slots[i].used && slots[i].mi === (mi + tries) % members.length) { sl = slots[i]; break; }
        tries++;
      }
      if (!sl) for (var j = 0; j < slots.length; j++) if (!slots[j].used) { sl = slots[j]; break; }
      if (sl) { put(sl, m); mi = (sl.mi + 1) % Math.max(1, members.length); }
    });
    return members;
  }
  // cfg = {chars:[chr ids], source:'custom'|chp id, level, gearTier, materia:[mat ids], jobs:{chr: job}, classes:{chr: cls}, rows:{chr: row}}
  WSX.buildParty = function (b, cfg) {
    b = b || cur(); cfg = cfg || {};
    var prog = rs(b).progression, eps = cfg.source && cfg.source !== 'custom' ? epsFor(b, cfg.source) : null;
    var level = eps ? num(eps.targetLevel, 1) : num(cfg.level, 10);
    var tier = eps ? num(eps.gearTier, 1) : num(cfg.gearTier, 1);
    var chars = (cfg.chars || []).map(function (id) { return recOf(b, id); }).filter(Boolean).slice(0, PARTY_MAX);
    var members = chars.map(function (c, i) {
      var eq = ['weapon', 'armor', 'accessory'].map(function (s) { return bestGear(b, s, c.weaponClass, tier); }).filter(Boolean).map(function (e) { return e.id; });
      var m = { chr: c.id, level: Math.max(1, Math.min(99, Math.round(level))), equipment: eq, materia: [], abilities: eps && Array.isArray(eps.abilities) ? eps.abilities.slice() : [], row: (cfg.rows && cfg.rows[c.id]) || 'front' };
      if (prog === 'jobs') { var js = eps && Array.isArray(eps.jobSet) && eps.jobSet.length ? eps.jobSet : null; m.job = js ? js[i % js.length] : (cfg.jobs && cfg.jobs[c.id]) || null; m.jobLevel = m.level; }
      if (prog === 'classes') { var cs = eps && Array.isArray(eps.classSet) && eps.classSet.length ? eps.classSet : null; m.cls = cs ? cs[i % cs.length] : (cfg.classes && cfg.classes[c.id]) || null; }
      return m;
    });
    if (prog === 'materia') placeMateria(b, members, eps ? (eps.materiaSet || []) : (cfg.materia || []));
    return members;
  };
  // Expected Party State for a chapter: the first PARTY_MAX characters unless chars is given.
  WSX.expectedParty = function (b, chapterId, chars) {
    b = b || cur();
    return WSX.buildParty(b, { source: chapterId, chars: chars && chars.length ? chars : recs(b, 'chr_').slice(0, PARTY_MAX).map(function (c) { return c.id; }) });
  };
  WSX.dataFor = function (b, troopId, party, weatherId) {
    b = b || cur();
    return { ruleset: rs(b), records: b.rules || {}, party: party, troopId: troopId, weatherId: weatherId || null };
  };

  // ------------------------------------------------------------------ battle codes
  function b64enc(str) { return btoa(unescape(encodeURIComponent(str))); }
  function b64dec(str) { return decodeURIComponent(escape(atob(String(str).replace(/\s+/g, '')))); }
  WSX.encodeCode = function (o) { return b64enc(JSON.stringify(o)); };
  WSX.decodeCode = function (code) {
    var o = JSON.parse(b64dec(code));
    if (!U.isObj(o) || !o.troopId || !Array.isArray(o.party) || typeof o.seed !== 'number' || !Array.isArray(o.inputs)) throw new Error('That is not a Saga Forge battle code.');
    return o;
  };

  // ------------------------------------------------------------------ pixel font (3 by 5)
  var GLYPHS = {
    A: '25755', B: '65656', C: '34443', D: '65556', E: '74647', F: '74644', G: '34553', H: '55755', I: '72227', J: '11152',
    K: '55655', L: '44447', M: '57755', N: '65555', O: '25552', P: '65644', Q: '25563', R: '65655', S: '34216', T: '72222',
    U: '55557', V: '55552', W: '55775', X: '55255', Y: '55222', Z: '71247',
    '0': '75557', '1': '26227', '2': '61247', '3': '61216', '4': '55711', '5': '74616', '6': '34757', '7': '71222', '8': '75757', '9': '75716',
    ' ': '00000', '/': '11244', ':': '02020', '.': '00002', '-': '00700', '+': '02720', '!': '22202', '?': '61202', '%': '51245', "'": '22000', ',': '00024'
  };
  function textW(s, sc) { return String(s).length * 4 * (sc || 1) - (sc || 1); }
  function drawText(g, s, x, y, color, sc, shadow) {
    sc = sc || 1; s = String(s).toUpperCase();
    if (shadow !== false) drawText(g, s, x + sc, y + sc, 'rgba(0,0,0,.85)', sc, false);
    g.fillStyle = color;
    for (var i = 0; i < s.length; i++) {
      var gl = GLYPHS[s.charAt(i)] || GLYPHS['?'];
      for (var r = 0; r < 5; r++) {
        var bits = +gl.charAt(r);
        if (bits & 4) g.fillRect(x + i * 4 * sc, y + r * sc, sc, sc);
        if (bits & 2) g.fillRect(x + i * 4 * sc + sc, y + r * sc, sc, sc);
        if (bits & 1) g.fillRect(x + i * 4 * sc + 2 * sc, y + r * sc, sc, sc);
      }
    }
  }
  function shortName(n, max) { n = String(n || '').toUpperCase().replace(/[^A-Z0-9 ]/g, ''); return n.length > max ? n.slice(0, max) : n; }

  // ------------------------------------------------------------------ procedural sprites (arcTo and rect only)
  function rr(g, x, y, w, h, r) {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
    g.fill();
  }
  function hashStr(s) { var h = 2166136261; s = String(s || ''); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function mulberry(a) { return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function hexRgb(h) { var m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); if (!m) return null; var n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function rgbHex(c) { return '#' + c.map(function (v) { v = Math.max(0, Math.min(255, Math.round(v))); return (v < 16 ? '0' : '') + v.toString(16); }).join(''); }
  function hueShift(hex, deg) {
    if (window.WS.rules && WS.rules.content && WS.rules.content.shiftHex) { try { return WS.rules.content.shiftHex(hex, deg); } catch (e) {} }
    var c = hexRgb(hex); if (!c) return hex;
    var a = deg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), r = c[0], g = c[1], bb = c[2];
    return rgbHex([
      r * (.213 + cs * .787 - sn * .213) + g * (.715 - cs * .715 - sn * .715) + bb * (.072 - cs * .072 + sn * .928),
      r * (.213 - cs * .213 + sn * .143) + g * (.715 + cs * .285 + sn * .140) + bb * (.072 - cs * .072 - sn * .283),
      r * (.213 - cs * .213 - sn * .787) + g * (.715 - cs * .715 + sn * .715) + bb * (.072 + cs * .928 + sn * .072)
    ]);
  }
  function shade(hex, f) { var c = hexRgb(hex); return c ? rgbHex(c.map(function (v) { return f < 0 ? v * (1 + f) : v + (255 - v) * f; })) : hex; }
  var spriteCache = {};
  function makeCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  // Symmetric blob from seeded shapes. Every off center shape is drawn twice, mirrored about the vertical axis.
  function foeSprite(famId, tier, palette, size) {
    var base = (palette && palette.base) || '#7a6f9e', acc = (palette && palette.accent) || '#e3b453';
    if (tier > 1) acc = hueShift(acc, (tier - 1) * 40);
    var key = famId + '|' + tier + '|' + base + '|' + acc + '|' + size;
    if (spriteCache[key]) return spriteCache[key];
    var R = mulberry(hashStr(famId || 'none')), S = size, c = makeCanvas(S, S), g = c.getContext('2d');
    function sym(fn) { fn(false); fn(true); }
    function mx(x, w, m) { return m ? S - x - w : x; }
    g.fillStyle = base;
    var bw = Math.round(S * (0.42 + R() * 0.3)), bh = Math.round(S * (0.34 + R() * 0.28)), by = S - bh - Math.round(S * 0.08);
    rr(g, (S - bw) / 2, by, bw, bh, Math.round(bh * (0.2 + R() * 0.3)));
    var hasHead = R() < 0.7, hw = Math.round(bw * (0.45 + R() * 0.3)), hh = Math.round(S * (0.18 + R() * 0.12)), hy = by - hh + Math.round(hh * 0.3);
    if (hasHead) rr(g, (S - hw) / 2, hy, hw, hh, Math.round(hh * 0.4));
    var topY = hasHead ? hy : by;
    var limbs = 1 + Math.floor(R() * 3);
    for (var i = 0; i < limbs; i++) {
      var lw = Math.max(2, Math.round(S * (0.08 + R() * 0.12))), lh = Math.max(3, Math.round(S * (0.12 + R() * 0.25)));
      var lx = Math.round((S - bw) / 2 - lw * (0.3 + R() * 0.6)), ly = Math.round(by + R() * (bh - lh * 0.6));
      var round = R() < 0.5;
      sym(function (m) { if (round) rr(g, mx(lx, lw, m), ly, lw, lh, lw / 2); else g.fillRect(mx(lx, lw, m), ly, lw, lh); });
    }
    if (R() < 0.6) {
      var ew = Math.max(2, Math.round(S * (0.05 + R() * 0.07))), eh = Math.max(3, Math.round(S * (0.1 + R() * 0.14))), ex = Math.round(S / 2 - hw / 2 + R() * hw * 0.3);
      sym(function (m) { rr(g, mx(ex, ew, m), topY - eh + 2, ew, eh, ew / 2); });
    }
    if (R() < 0.35) g.fillRect(Math.round(S / 2 - 1), Math.max(0, topY - Math.round(S * 0.12)), 2, Math.round(S * 0.14));
    // shading on the lower half
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(0, Math.round(by + bh * 0.55), S, S);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, 0, S, Math.round(topY + 3));
    // accent: belly and eyes
    g.fillStyle = acc;
    if (R() < 0.6) { var sw = Math.round(bw * 0.4), sh = Math.max(2, Math.round(bh * 0.3)); rr(g, (S - sw) / 2, by + Math.round(bh * 0.35), sw, sh, sh / 2); }
    var eyeY = hasHead ? hy + Math.round(hh * 0.4) : by + Math.round(bh * 0.2), eyeX = Math.round(S / 2 - Math.max(3, (hasHead ? hw : bw) * (0.14 + R() * 0.12)));
    var es = Math.max(1, Math.round(S / 16));
    sym(function (m) { g.fillRect(mx(eyeX, es + 1, m), eyeY, es + 1, es + 1); });
    g.globalCompositeOperation = 'source-over';
    // outline
    var o = makeCanvas(S + 2, S + 2), og = o.getContext('2d');
    var mask = makeCanvas(S, S), mg = mask.getContext('2d');
    mg.drawImage(c, 0, 0); mg.globalCompositeOperation = 'source-in'; mg.fillStyle = '#07080d'; mg.fillRect(0, 0, S, S);
    [[0, 1], [2, 1], [1, 0], [1, 2]].forEach(function (d) { og.drawImage(mask, d[0], d[1]); });
    og.drawImage(c, 1, 1);
    spriteCache[key] = o;
    return o;
  }
  function weaponGlyph(g, cls, x, y, color) {
    cls = String(cls || '').toLowerCase();
    g.fillStyle = color;
    if (/staff|rod|wand|cane/.test(cls)) { g.fillRect(x, y - 10, 1, 16); g.fillStyle = '#9ad1ff'; rr(g, x - 1, y - 13, 3, 3, 1); }
    else if (/axe|hammer|mace/.test(cls)) { g.fillRect(x, y - 8, 1, 13); g.fillRect(x - 3, y - 9, 4, 4); }
    else if (/bow|gun|rifle/.test(cls)) { g.fillRect(x - 2, y - 8, 1, 12); g.fillRect(x - 1, y - 9, 1, 1); g.fillRect(x - 1, y + 4, 1, 1); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(x, y - 8, 1, 12); }
    else if (/spear|lance|pole/.test(cls)) { g.fillRect(x, y - 12, 1, 18); g.fillStyle = '#e8e8e8'; g.fillRect(x - 1, y - 14, 3, 3); }
    else if (/claw|fist|glove/.test(cls)) { g.fillStyle = '#e8e8e8'; g.fillRect(x - 3, y, 3, 1); g.fillRect(x - 3, y + 2, 3, 1); }
    else { g.fillStyle = '#e8e8e8'; g.fillRect(x, y - 11, 1, 12); g.fillStyle = color; g.fillRect(x - 2, y, 5, 1); g.fillRect(x, y + 1, 1, 3); }
  }

  // ------------------------------------------------------------------ view state
  var V = null; // the running battle view
  function stopLoop() { if (V && V.raf) { cancelAnimationFrame(V.raf); V.raf = 0; } }
  function loadSetup() {
    var s = Kit.store.get(SETUP_KEY);
    return U.isObj(s) ? s : {};
  }
  function saveSetup(s) { Kit.store.set(SETUP_KEY, s); }
  function defaultSetup(b) {
    var s = loadSetup(), troops = recs(b, 'trp_'), chars = recs(b, 'chr_');
    if (!s.troopId || !recOf(b, s.troopId)) s.troopId = troops[0] ? troops[0].id : null;
    s.chars = (Array.isArray(s.chars) ? s.chars : []).filter(function (id) { return recOf(b, id); });
    if (!s.chars.length) s.chars = chars.slice(0, Math.min(3, PARTY_MAX)).map(function (c) { return c.id; });
    if (!s.source || (s.source !== 'custom' && !epsFor(b, s.source))) {
      var tr = s.troopId && recOf(b, s.troopId), ch = tr && tr.chapter && epsFor(b, tr.chapter) ? tr.chapter : null;
      s.source = ch || 'custom';
    }
    if (typeof s.level !== 'number') s.level = 10;
    if (typeof s.gearTier !== 'number') s.gearTier = 1;
    if (!Array.isArray(s.materia)) s.materia = [];
    s.materia = s.materia.filter(function (id) { return recOf(b, id); });
    if (!U.isObj(s.jobs)) s.jobs = {};
    if (!U.isObj(s.classes)) s.classes = {};
    if (!U.isObj(s.rows)) s.rows = {};
    if (s.weatherId && !recOf(b, s.weatherId)) s.weatherId = null;
    if (typeof s.seed !== 'number' || !isFinite(s.seed)) s.seed = randomSeed();
    var bt = rs(b).battle || {};
    if (typeof s.waitMode !== 'boolean') s.waitMode = bt.waitMode !== false;
    if ([1, 2, 4].indexOf(s.speed) < 0) s.speed = 1;
    return s;
  }

  // ------------------------------------------------------------------ render
  WSX.render = function (host) {
    stopLoop();
    var b = cur(), setup = defaultSetup(b);
    var wrap = el('div', 'ar-wrap');
    host.appendChild(wrap);
    var left = el('section', 'panel ar-setup');
    var right = el('section', 'panel ar-stagepanel');
    wrap.appendChild(left); wrap.appendChild(right);
    V = { host: host, setup: setup, b: b, right: right };
    paintSetup(left, b, setup);
    paintStage(right, b);
    if (WSX._pending) { var p = WSX._pending; WSX._pending = null; if (p.code) playCode(p.code); else if (p.start) startBattle(); }
  };

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
    var s = el('select', 'inp'); s.id = id;
    options.forEach(function (o) { var op = el('option'); op.value = o.value; op.textContent = o.label; if (String(o.value) === String(value)) op.selected = true; s.appendChild(op); });
    s.addEventListener('change', function () { onChange(s.value); });
    return s;
  }
  function seg(values, value, onChange, labelFor) {
    var box = el('div', 'ar-seg'); box.setAttribute('role', 'group');
    values.forEach(function (v) {
      var bt = el('button'); bt.type = 'button'; bt.textContent = labelFor ? labelFor(v) : String(v);
      bt.setAttribute('aria-pressed', v === value ? 'true' : 'false');
      bt.addEventListener('click', function () { U.clear(box); box.parentNode.replaceChild(seg(values, v, onChange, labelFor), box); onChange(v); });
      box.appendChild(bt);
    });
    return box;
  }

  function paintSetup(box, b, s) {
    U.clear(box);
    var R = rs(b), prog = R.progression;
    box.appendChild(el('h2', 'panel-title', 'Battle Setup'));
    var grid = el('div', 'form-grid');
    box.appendChild(grid);
    // troop
    var chs = chapters(b), chName = {};
    chs.forEach(function (c, i) { chName[c.id] = 'Ch ' + (i + 1) + ': ' + (c.name || c.id); });
    var troopOpts = recs(b, 'trp_').map(function (t) { return { value: t.id, label: (t.name || t.id) + (t.chapter && chName[t.chapter] ? ' (' + chName[t.chapter] + ')' : '') }; });
    grid.appendChild(field('Troop', select('arTroop', troopOpts, s.troopId, function (v) { s.troopId = v; var tr = recOf(b, v); if (tr && tr.chapter && epsFor(b, tr.chapter) && s.source !== 'custom') s.source = tr.chapter; saveSetup(s); paintSetup(box, b, s); })));
    // weather
    var wOpts = [{ value: '', label: 'Clear (no weather)' }].concat(recs(b, 'wth_').map(function (w) { return { value: w.id, label: (w.name || w.id) + (w.realWorld ? ', ' + w.realWorld : '') }; }));
    grid.appendChild(field('Weather', select('arWeather', wOpts, s.weatherId || '', function (v) { s.weatherId = v || null; saveSetup(s); })));
    // party
    box.appendChild(el('h3', 'section-h', 'Party'));
    var chars = recs(b, 'chr_');
    if (!chars.length) box.appendChild(el('div', 'empty-line', 'Author characters in Rules to field a party.'));
    var pick = el('div', 'ar-chars');
    chars.forEach(function (c, i) {
      var on = s.chars.indexOf(c.id) >= 0;
      var bt = el('button', 'ar-pick', '<span class="dot" style="background:' + PARTY_TINTS[i % PARTY_TINTS.length] + '"></span>' + esc(c.name || c.id));
      bt.type = 'button'; bt.setAttribute('aria-pressed', on ? 'true' : 'false');
      bt.addEventListener('click', function () {
        var k = s.chars.indexOf(c.id);
        if (k >= 0) s.chars.splice(k, 1);
        else { if (s.chars.length >= PARTY_MAX) { Kit.ui.toast('A party holds up to ' + PARTY_MAX + ' characters.', 'warn'); return; } s.chars.push(c.id); }
        saveSetup(s); paintSetup(box, b, s);
      });
      pick.appendChild(bt);
    });
    box.appendChild(pick);
    // source
    var srcOpts = [{ value: 'custom', label: 'Custom level and gear' }];
    chs.forEach(function (c) { if (epsFor(b, c.id)) srcOpts.push({ value: c.id, label: 'Use ' + chName[c.id] + ' expected state' }); });
    var g2 = el('div', 'form-grid'); g2.style.marginTop = '10px';
    box.appendChild(g2);
    g2.appendChild(field('Level and gear', select('arSource', srcOpts, s.source, function (v) { s.source = v; saveSetup(s); paintSetup(box, b, s); })));
    if (s.source !== 'custom') {
      var e = epsFor(b, s.source);
      var note = el('p', 'ar-note');
      note.textContent = e ? 'Level ' + num(e.targetLevel, 1) + ', gear tier ' + num(e.gearTier, 1) + (prog === 'materia' ? ', ' + ((e.materiaSet || []).length) + ' materia' : prog === 'jobs' ? ', ' + ((e.jobSet || []).length) + ' jobs' : prog === 'classes' ? ', ' + ((e.classSet || []).length) + ' classes' : '') + ', ' + ((e.abilities || []).length) + ' extra abilities. Gear is the best stocked piece at that tier.' : '';
      box.appendChild(note);
    } else {
      var lv = el('input', 'inp'); lv.type = 'number'; lv.min = 1; lv.max = 99; lv.id = 'arLevel'; lv.value = s.level;
      lv.addEventListener('change', function () { s.level = Math.max(1, Math.min(99, Math.round(+lv.value || 1))); lv.value = s.level; saveSetup(s); });
      g2.appendChild(field('Level', lv));
      var gt = el('input', 'inp'); gt.type = 'number'; gt.min = 1; gt.max = 20; gt.id = 'arTier'; gt.value = s.gearTier;
      gt.addEventListener('change', function () { s.gearTier = Math.max(1, Math.min(20, Math.round(+gt.value || 1))); gt.value = s.gearTier; saveSetup(s); });
      g2.appendChild(field('Gear tier', gt));
      if (prog === 'materia') {
        var mats = recs(b, 'mat_');
        box.appendChild(el('h3', 'section-h', 'Materia'));
        if (!mats.length) box.appendChild(el('div', 'empty-line', 'No materia authored yet.'));
        var mp = el('div', 'ar-chars');
        mats.forEach(function (m) {
          var on = s.materia.indexOf(m.id) >= 0;
          var bt = el('button', 'ar-pick', esc(m.name || m.id) + ' <small class="muted">' + esc(m.kind || '') + '</small>');
          bt.type = 'button'; bt.setAttribute('aria-pressed', on ? 'true' : 'false');
          bt.addEventListener('click', function () { var k = s.materia.indexOf(m.id); if (k >= 0) s.materia.splice(k, 1); else s.materia.push(m.id); saveSetup(s); bt.setAttribute('aria-pressed', k >= 0 ? 'false' : 'true'); });
          mp.appendChild(bt);
        });
        box.appendChild(mp);
        box.appendChild(el('p', 'ar-note', 'Support materia is placed in a linked pair beside the next materia you picked.'));
      } else if (prog === 'jobs' || prog === 'classes') {
        var pre = prog === 'jobs' ? 'job_' : 'cls_', bag = prog === 'jobs' ? s.jobs : s.classes, list = recs(b, pre);
        var cust = el('div', 'ar-cust');
        s.chars.forEach(function (id) {
          var c = recOf(b, id); if (!c) return;
          var row = el('div', 'ar-crow');
          row.appendChild(el('span', '', esc(c.name || id)));
          row.appendChild(select('arMod_' + id, [{ value: '', label: 'No ' + (prog === 'jobs' ? 'job' : 'class') }].concat(list.map(function (x) { return { value: x.id, label: x.name || x.id }; })), bag[id] || '', function (v) { bag[id] = v || null; saveSetup(s); }));
          cust.appendChild(row);
        });
        box.appendChild(cust);
      }
    }
    // rows
    if (s.chars.length) {
      box.appendChild(el('h3', 'section-h', 'Rows'));
      var rowsBox = el('div', 'ar-cust');
      s.chars.forEach(function (id) {
        var c = recOf(b, id); if (!c) return;
        var row = el('div', 'ar-crow');
        row.appendChild(el('span', '', esc(c.name || id)));
        row.appendChild(seg(['front', 'back'], s.rows[id] || 'front', function (v) { s.rows[id] = v; saveSetup(s); }, function (v) { return v === 'front' ? 'Front' : 'Back'; }));
        rowsBox.appendChild(row);
      });
      box.appendChild(rowsBox);
    }
    // seed, mode, speed
    box.appendChild(el('h3', 'section-h', 'Run'));
    var g3 = el('div', 'form-grid');
    box.appendChild(g3);
    var seedRow = el('div', 'ar-seedrow');
    var si = el('input', 'inp'); si.type = 'number'; si.id = 'arSeed'; si.value = s.seed; si.min = 1; si.step = 1;
    si.addEventListener('change', function () { var v = Math.floor(+si.value); if (!isFinite(v) || v < 1) v = 1; s.seed = v; si.value = v; saveSetup(s); });
    var rb = el('button', 'btn btn-icon', Kit.icon('spark')); rb.type = 'button'; rb.title = 'Random seed'; rb.setAttribute('aria-label', 'Random seed');
    rb.addEventListener('click', function () { s.seed = randomSeed(); si.value = s.seed; saveSetup(s); });
    seedRow.appendChild(si); seedRow.appendChild(rb);
    g3.appendChild(field('Seed', seedRow));
    var atb = (R.scheduler || 'atb') === 'atb';
    g3.appendChild(field('Time mode', seg([true, false], s.waitMode, function (v) { s.waitMode = v; saveSetup(s); }, function (v) { return v ? 'Wait' : 'Active'; }), atb ? 'Wait pauses the gauges while you choose.' : 'The ' + (R.scheduler || 'atb') + ' scheduler always waits for your command.'));
    g3.appendChild(field('Battle speed', seg([1, 2, 4], s.speed, function (v) { s.speed = v; saveSetup(s); if (V) V.speed = v; }, function (v) { return v + 'x'; })));
    var go = el('div', 'btn-row'); go.style.marginTop = '12px';
    var start = el('button', 'btn btn-primary', Kit.icon('sword') + '<span>Start battle</span>'); start.type = 'button'; start.id = 'arStart';
    start.addEventListener('click', function () { startBattle(); });
    var paste = el('button', 'btn', Kit.icon('import') + '<span>Paste battle code</span>'); paste.type = 'button';
    paste.addEventListener('click', pasteCode);
    go.appendChild(start); go.appendChild(paste);
    box.appendChild(go);
  }

  function paintStage(box, b) {
    U.clear(box);
    var head = el('div', 'ar-head');
    head.appendChild(el('h2', 'panel-title', 'Arena'));
    var st = el('span', 'ar-status'); st.id = 'arStatus'; head.appendChild(st);
    box.appendChild(head);
    var stage = el('div', 'ar-stage'); stage.id = 'arStage';
    stage.innerHTML = '<div class="ar-empty"><h3>Choose a troop and start</h3><p>Every battle is seeded, so the same seed and the same commands replay exactly. Copy a battle code to share a fight.</p></div>';
    var sb = el('button', 'btn btn-primary', Kit.icon('sword') + '<span>Start battle</span>'); sb.type = 'button';
    sb.addEventListener('click', function () { startBattle(); });
    stage.firstChild.appendChild(sb);
    box.appendChild(stage);
    var menu = el('div', 'ar-menu'); menu.id = 'arMenu'; menu.hidden = true; box.appendChild(menu);
    var res = el('div', 'card ar-result'); res.id = 'arResult'; res.hidden = true; box.appendChild(res);
    var ctr = el('div', 'ar-controls'); ctr.id = 'arControls'; box.appendChild(ctr);
    paintControls();
  }
  function paintControls() {
    var ctr = document.getElementById('arControls');
    if (!ctr) return;
    U.clear(ctr);
    var live = !!(V && V.S);
    function btn(label, icon, fn, o) {
      var x = el('button', 'btn' + (o && o.kind ? ' btn-' + o.kind : ''), (icon ? Kit.icon(icon) : '') + '<span>' + esc(label) + '</span>');
      x.type = 'button'; if (o && o.disabled) x.disabled = true; if (o && o.pressed != null) x.setAttribute('aria-pressed', o.pressed ? 'true' : 'false');
      x.addEventListener('click', fn); ctr.appendChild(x); return x;
    }
    btn('New battle', 'sword', function () { startBattle(); }, { kind: 'primary', disabled: !live });
    btn(V && V.auto ? 'Auto: on' : 'Auto: off', 'spark', function () { if (!V) return; V.auto = !V.auto; paintControls(); if (V.auto) closeMenu(); }, { disabled: !live || (V && V.playback), pressed: !!(V && V.auto) });
    btn('Replay same seed', 'up', function () { if (V && V.last) startBattle(V.last.cfgSeed); }, { disabled: !(V && V.last) });
    btn('Watch replay', 'jump', function () { if (V && V.last && V.last.code) playCode(V.last.code); }, { disabled: !(V && V.last && V.last.code && V.last.inputs && V.last.inputs.length) });
    btn('Copy battle code', 'export', copyCode, { disabled: !(V && V.last && V.last.code) });
    btn('Battle log', 'book', openLog, { disabled: !(V && V.S) });
  }
  function status(t) { var s = document.getElementById('arStatus'); if (s) s.textContent = t || ''; }

  // ------------------------------------------------------------------ battle lifecycle
  function startBattle(seedOverride, preset) {
    var b = cur(), s = V ? V.setup : defaultSetup(b);
    if (!recOf(b, s.troopId)) { Kit.ui.toast('Choose a troop first.', 'warn'); return; }
    var party = preset ? preset.party : WSX.buildParty(b, s);
    if (!party.length) { Kit.ui.toast('Pick at least one character for the party.', 'warn'); return; }
    var seed = preset ? preset.seed : (typeof seedOverride === 'number' ? seedOverride : s.seed);
    var troopId = preset ? preset.troopId : s.troopId, weatherId = preset ? preset.weatherId || null : s.weatherId || null;
    var opts = preset ? (preset.opts || {}) : { waitMode: s.waitMode };
    var data = WSX.dataFor(b, troopId, party, weatherId);
    var S;
    try { S = ENGINE_BATTLE.init(data, seed, opts); }
    catch (e) { Kit.ui.toast('The battle could not start: ' + e.message, 'error'); console.error(e); return; }
    if (!V) return;
    stopLoop();
    V.S = S; V.data = data; V.seed = seed; V.opts = opts; V.party = party; V.troopId = troopId; V.weatherId = weatherId;
    V.inputs = []; V.log = []; V.queue = []; V.popups = []; V.anim = null; V.flash = {}; V.fade = {}; V.acc = 0; V.lastTs = 0; V.idle = 0;
    V.playback = preset && preset.inputs ? { inputs: preset.inputs.slice(), i: 0, expect: preset.end || null } : null;
    V.auto = V.playback ? false : !!V.auto;
    V.speed = V.setup.speed || 1;
    V.menu = null; V.ended = false;
    V.disp = {}; S.units.forEach(function (u) { V.disp[u.uid] = { hp: u.hp, mp: u.mp, ko: u.ko }; });
    V.names = {}; S.units.forEach(function (u) { V.names[u.uid] = u.name; });
    V.last = { cfgSeed: seed, troopId: troopId, party: party, seed: seed, weatherId: weatherId, opts: opts, inputs: V.inputs, code: null };
    if (S.db.warnings.length) Kit.ui.toast(S.db.warnings[0], 'warn', 5000);
    if (S.result) { Kit.ui.toast('That troop or party has no fighters.', 'warn'); }
    buildCanvas();
    var res = document.getElementById('arResult'); if (res) res.hidden = true;
    closeMenu();
    paintControls();
    status((V.playback ? 'Replaying seed ' : 'Seed ') + seed + ' | ' + S.sched + (S.sched === 'atb' ? (S.waitMode ? ' wait' : ' active') : '') + (S.preemptive ? ' | preemptive strike' : ''));
    if (S.preemptive) pushLog({ type: 'note', t: 0, text: 'Preemptive strike. The party moves first.' });
    V.raf = requestAnimationFrame(frame);
  }
  WSX.start = startBattle;
  // Opens the Arena with a troop selected (and optionally a chapter expected state), then starts the battle.
  WSX.preload = function (troopId, o) {
    var b = cur(), s = defaultSetup(b);
    s.troopId = troopId;
    var tr = recOf(b, troopId);
    if (o && o.source) s.source = o.source; else if (tr && tr.chapter && epsFor(b, tr.chapter)) s.source = tr.chapter;
    if (o && o.seed) s.seed = o.seed;
    saveSetup(s);
    WSX._pending = { start: true };
    if (Kit.active() === 'arena') Kit.rerender(); else Kit.go('arena');
  };

  function buildCanvas() {
    var stage = document.getElementById('arStage');
    if (!stage) return;
    U.clear(stage);
    var res = resolution(cur());
    var c = el('canvas'); c.width = res.w; c.height = res.h; c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Battle view');
    stage.appendChild(c);
    V.canvas = c; V.g = c.getContext('2d'); V.g.imageSmoothingEnabled = false; V.res = res;
    fitCanvas();
    if (!V.ro && typeof ResizeObserver === 'function') { V.ro = new ResizeObserver(function () { fitCanvas(); }); V.ro.observe(stage); }
    layout();
  }
  function fitCanvas() {
    if (!V || !V.canvas || !V.canvas.isConnected) return;
    var stage = V.canvas.parentNode, w = stage.clientWidth - 8, vh = (window.innerHeight || 800) * 0.62;
    var sc = Math.max(1, Math.min(Math.floor(w / V.res.w), Math.floor(vh / V.res.h)));
    V.canvas.style.width = (V.res.w * sc) + 'px';
    V.canvas.style.height = (V.res.h * sc) + 'px';
    V.scale = sc;
  }
  // Positions of every unit on the canvas.
  function layout() {
    var W = V.res.w, H = V.res.h, field = Math.round(H * 0.64), foes = V.S.units.filter(function (u) { return u.side === 'foe'; }), party = V.S.units.filter(function (u) { return u.side === 'party'; });
    V.pos = {};
    var front = foes.filter(function (u) { return u.row !== 'back'; }), back = foes.filter(function (u) { return u.row === 'back'; });
    var n = Math.max(front.length, back.length, 1);
    var size = Math.max(16, Math.min(48, Math.floor((field - 16) / Math.max(1, Math.ceil(n))) - 2));
    function col(list, x) {
      var gap = (field - 12) / (list.length + 1);
      list.forEach(function (u, i) { var s = u.isBoss ? Math.min(64, Math.round(size * 1.35)) : size; V.pos[u.uid] = { x: Math.round(x - s / 2), y: Math.round(8 + gap * (i + 1) - s / 2), w: s, h: s }; });
    }
    col(back, W * 0.16); col(front, W * 0.36);
    var pg = (field - 12) / (party.length + 1);
    party.forEach(function (u, i) { var x = Math.round(W * (u.row === 'back' ? 0.86 : 0.78)); V.pos[u.uid] = { x: x - 6, y: Math.round(8 + pg * (i + 1) - 10), w: 12, h: 20, tint: PARTY_TINTS[i % PARTY_TINTS.length] }; });
    V.field = field;
  }

  // ------------------------------------------------------------------ main loop
  var DUR = { action: 520, damage: 90, heal: 90, miss: 90, ko: 360, status: 90, revive: 200, limitReady: 240, end: 400 };
  function frame(ts) {
    if (!V || !V.canvas || !V.canvas.isConnected) { stopLoop(); return; }
    var dt = V.lastTs ? Math.min(100, ts - V.lastTs) : 16;
    V.lastTs = ts;
    var sp = V.speed || 1;
    // presentation queue first
    if (V.queue.length) {
      V.idle += dt * sp;
      while (V.queue.length && V.idle >= 0) {
        var e = V.queue[0];
        if (!e._started) { e._started = true; playEvent(e); V.idle -= (DUR[e.type] || 0); if (V.idle < 0) break; }
        V.queue.shift();
      }
      if (!V.queue.length) { syncDisp(); V.idle = 0; if (V.S.result && !V.ended) onEnd(); }
    } else if (!V.S.result) {
      tickEngine(dt * sp);
    } else if (!V.ended) { onEnd(); }
    draw(ts);
    V.raf = requestAnimationFrame(frame);
  }
  function feed(r) {
    V.S = r.state;
    (r.events || []).forEach(function (e) {
      if (e.type === 'tick') return;
      V.queue.push(e);
      pushLog(e);
    });
  }
  function tickEngine(ms) {
    var S = V.S, pb = V.playback;
    // playback: apply recorded inputs at their exact tick
    if (pb && pb.i < pb.inputs.length && S.t >= pb.inputs[pb.i].t) {
      var rec = pb.inputs[pb.i++];
      V.inputs.push(rec);
      feed(ENGINE_BATTLE.advance(S, rec.input));
      return;
    }
    if (S.awaiting && !pb) {
      if (V.auto) { var sug = ENGINE_BATTLE.suggest(S, null); if (sug) { give(sug); return; } }
      openMenu();
      if (S.waitMode || S.sched !== 'atb') return;
    } else if (!S.awaiting) closeMenu();
    if (S.sched === 'atb') {
      var rate = num((rs(cur()).battle || {}).tickRate, 30);
      V.acc += ms * rate / 1000;
      var n = Math.floor(V.acc);
      if (n < 1) return;
      V.acc -= n;
      if (pb && pb.i < pb.inputs.length) n = Math.min(n, pb.inputs[pb.i].t - S.t);
      if (n < 1) return;
      feed(ENGINE_BATTLE.advance(S, { type: 'step', ticks: n }));
    } else {
      V.acc += ms;
      if (V.acc < 380) return;
      V.acc = 0;
      if (pb && pb.i < pb.inputs.length && S.t >= pb.inputs[pb.i].t) return;
      feed(ENGINE_BATTLE.advance(S, { type: 'step', ticks: 1 }));
    }
  }
  function give(input) {
    var S = V.S, t = S.t, r = ENGINE_BATTLE.advance(S, input);
    var rejected = (r.events || []).some(function (e) { return e.value === 'rejected'; });
    if (rejected) { var why = r.events.filter(function (e) { return e.value === 'rejected'; })[0]; Kit.ui.toast(why.name || 'That command was rejected.', 'warn'); return false; }
    V.inputs.push({ t: t, input: input });
    closeMenu();
    feed(r);
    return true;
  }
  function syncDisp() { V.S.units.forEach(function (u) { V.disp[u.uid] = { hp: u.hp, mp: u.mp, ko: u.ko }; }); }
  function popup(uid, text, color) {
    var p = V.pos[uid]; if (!p) return;
    V.popups.push({ x: p.x + p.w / 2, y: p.y + 2, text: String(text), color: color, born: V.lastTs });
  }
  function playEvent(e) {
    var d;
    if (e.type === 'action') {
      V.anim = { actor: e.actor, born: V.lastTs, targets: e.targets || [], element: e.element, name: e.name };
      var u = V.S.units.filter(function (x) { return x.uid === e.actor; })[0];
      if (u && V.disp[u.uid]) V.disp[u.uid].mp = u.mp;
    } else if (e.type === 'damage') {
      d = V.disp[e.target]; if (d) d.hp = Math.max(0, d.hp - num(e.value));
      popup(e.target, e.value, e.crit ? '#ffe066' : '#ffffff');
      V.flash[e.target] = V.lastTs;
    } else if (e.type === 'heal') {
      d = V.disp[e.target]; if (d) d.hp = d.hp + num(e.value);
      popup(e.target, e.value, '#7dff9a');
    } else if (e.type === 'miss') {
      if (e.target) popup(e.target, 'MISS', '#b8c4d8');
    } else if (e.type === 'ko') {
      d = V.disp[e.target]; if (d) { d.ko = true; d.hp = 0; }
      V.fade[e.target] = V.lastTs;
    } else if (e.type === 'revive') {
      d = V.disp[e.target]; if (d) d.ko = false; delete V.fade[e.target];
    } else if (e.type === 'limitReady' && e.value === 'full') {
      popup(e.target, 'LIMIT', '#e3b453');
    } else if (e.type === 'status' && e.target) {
      popup(e.target, String(e.value).charAt(0) === '-' ? 'CURED' : shortName(e.name || 'STATUS', 7), '#c89cf0');
    }
  }
  function onEnd() {
    V.ended = true;
    closeMenu();
    var r = V.S.result;
    V.last.inputs = V.inputs.slice();
    V.last.end = { outcome: r.outcome, ticks: r.ticks, turns: r.turns, rngCalls: r.rngCalls };
    V.last.code = WSX.encodeCode({ v: 1, troopId: V.troopId, party: V.party, seed: V.seed, inputs: V.last.inputs, weatherId: V.weatherId, opts: V.opts, end: V.last.end });
    var box = document.getElementById('arResult');
    if (box) {
      var label = { win: 'Victory', lose: 'Defeat', flee: 'Escaped', timeout: 'Time out' }[r.outcome] || r.outcome;
      var chip = { win: 'chip-ok', lose: 'chip-error', flee: 'chip-muted', timeout: 'chip-warning' }[r.outcome] || 'chip-muted';
      var match = '';
      if (V.playback && V.playback.expect) {
        var ok = V.playback.expect.outcome === r.outcome && V.playback.expect.ticks === r.ticks && V.playback.expect.turns === r.turns && (V.playback.expect.rngCalls == null || V.playback.expect.rngCalls === r.rngCalls);
        match = '<p class="' + (ok ? 'msg msg-forward' : 'msg msg-error') + '">' + (ok ? 'Replay matched the original battle exactly.' : 'Replay diverged from the original. The records may have changed since the code was made.') + '</p>';
        Kit.ui.toast(ok ? 'Replay matched the original battle.' : 'Replay diverged from the original.', ok ? 'ok' : 'warn');
      }
      box.innerHTML = '<div class="btn-row"><span class="chip ' + chip + '">' + esc(label) + '</span><strong>' + esc(V.S.db.troop ? V.S.db.troop.name : '') + '</strong></div>' + match +
        '<dl class="kv"><dt>Ticks</dt><dd>' + r.ticks + '</dd><dt>Turns</dt><dd>' + r.turns + '</dd><dt>HP lost</dt><dd>' + r.resourcesUsed.hpLost + ' (' + r.resourcesUsed.hpPct + '%)</dd><dt>MP spent</dt><dd>' + r.resourcesUsed.mpSpent + ' (' + r.resourcesUsed.mpPct + '%)</dd>' +
        (r.outcome === 'win' ? '<dt>Rewards</dt><dd>' + r.rewards.gil + ' gil, ' + r.rewards.exp + ' EXP, ' + r.rewards.ap + ' AP</dd>' : '') +
        '<dt>Seed</dt><dd>' + V.seed + '</dd><dt>Inputs</dt><dd>' + V.inputs.length + '</dd></dl>';
      box.hidden = false;
    }
    paintControls();
    status('Seed ' + V.seed + ' | ' + r.outcome + ' in ' + r.turns + ' turns');
  }

  // ------------------------------------------------------------------ command menu (DOM overlay, 44px buttons)
  function closeMenu() { var m = document.getElementById('arMenu'); if (m) { m.hidden = true; U.clear(m); } if (V) V.menu = null; }
  function openMenu() {
    var S = V.S, aw = S.awaiting, m = document.getElementById('arMenu');
    if (!aw || !m) return;
    var key = aw.actor + '|' + aw.commands.map(function (c) { return c.key + ':' + c.abls.map(function (x) { return x.id + (x.ok ? 1 : 0); }).join(','); }).join(';') + '|' + aw.targets.foe.join(',') + '|' + aw.targets.party.join(',');
    if (V.menu && V.menu.key === key) {
      if (V.menu.level === 'targets') Array.prototype.forEach.call(m.querySelectorAll('[data-uid] small'), function (sm) {
        var u = S.units.filter(function (x) { return x.uid === sm.parentNode.getAttribute('data-uid'); })[0];
        if (u) { var t = u.hp + ' / ' + u.maxHp + ' HP'; if (sm.textContent !== t) sm.textContent = t; }
      });
      return;
    }
    var keep = V.menu && V.menu.actor === aw.actor ? V.menu : null;
    V.menu = { key: key, actor: aw.actor, level: keep ? keep.level : 'root', cmd: keep ? keep.cmd : null, abl: keep ? keep.abl : null };
    paintMenu();
  }
  function paintMenu() {
    var S = V.S, aw = S.awaiting, m = document.getElementById('arMenu'), st = V.menu;
    if (!aw || !m || !st) return;
    U.clear(m); m.hidden = false;
    var cmd = st.cmd ? aw.commands.filter(function (c) { return c.key === st.cmd; })[0] : null;
    if (st.level !== 'root' && !cmd) st.level = 'root';
    var head = el('div', 'ar-menu-head');
    head.appendChild(el('span', 'who', esc(V.names[aw.actor] || aw.actor) + (st.level === 'root' ? '' : ' | ' + esc(cmd.label))));
    if (st.level !== 'root') {
      var back = el('button', 'btn btn-ghost', Kit.icon('up') + '<span>Back</span>'); back.type = 'button';
      back.addEventListener('click', function () { st.level = st.level === 'targets' && cmd.abls.length > 1 ? 'abls' : 'root'; st.abl = null; paintMenu(); });
      head.appendChild(back);
    } else if (!S.waitMode && S.sched === 'atb') head.appendChild(el('span', 'chip chip-warning', 'Active'));
    m.appendChild(head);
    var grid = el('div', 'ar-menu-grid');
    m.appendChild(grid);
    function b(label, sub, fn, o) {
      var x = el('button', 'btn' + (o && o.cls ? ' ' + o.cls : ''), '<span>' + esc(label) + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : ''));
      x.type = 'button'; if (o && o.disabled) x.disabled = true;
      x.addEventListener('click', fn); grid.appendChild(x); return x;
    }
    if (st.level === 'root') {
      aw.commands.forEach(function (c) {
        if (c.key === 'flee') { b('Flee', '', function () { give({ type: 'flee', actor: aw.actor }); }); return; }
        var usable = c.abls.some(function (x) { return x.ok; });
        b(c.label, c.abls.length > 1 ? c.abls.length + ' abilities' : (c.abls[0] && c.abls[0].mp ? c.abls[0].mp + ' MP' : ''), function () {
          st.cmd = c.key;
          if (c.abls.length === 1) { st.abl = c.abls[0].id; st.level = 'targets'; } else st.level = 'abls';
          if (st.level === 'targets' && !needsTarget(c.abls[0])) { fire(c.abls[0], null); return; }
          paintMenu();
        }, { disabled: !usable, cls: c.key === 'limit' ? 'limit' : '' });
      });
    } else if (st.level === 'abls') {
      cmd.abls.forEach(function (x) {
        b(x.name, (x.mp ? x.mp + ' MP' : 'Free') + (x.scope === 'all' ? ' | all' : '') + (x.element ? ' | ' + x.element : ''), function () {
          st.abl = x.id;
          if (!needsTarget(x)) { fire(x, null); return; }
          st.level = 'targets'; paintMenu();
        }, { disabled: !x.ok });
      });
    } else {
      var ab = cmd.abls.filter(function (x) { return x.id === st.abl; })[0];
      if (!ab) { st.level = 'root'; paintMenu(); return; }
      var first = ab.side === 'ally' ? 'party' : 'foe', order = first === 'party' ? ['party', 'foe'] : ['foe', 'party'];
      if (ab.scope === 'all') {
        order.forEach(function (side) {
          if (!aw.targets[side].length) return;
          b(side === 'foe' ? 'All foes' : 'All allies', aw.targets[side].length + ' target' + (aw.targets[side].length === 1 ? '' : 's'), function () { fire(ab, aw.targets[side][0]); });
        });
        return;
      }
      order.forEach(function (side) {
        aw.targets[side].forEach(function (uid) {
          var u = V.S.units.filter(function (x) { return x.uid === uid; })[0];
          if (!u) return;
          var label = V.names[uid] || uid;
          b(label, u.hp + ' / ' + u.maxHp + ' HP', function () { fire(ab, uid); }).setAttribute('data-uid', uid);
        });
      });
    }
  }
  function needsTarget(x) { return x && x.side !== 'self'; }
  function fire(x, uid) {
    var aw = V.S.awaiting;
    if (!aw) return;
    var tgt = uid || (x.side === 'ally' ? aw.targets.party[0] : aw.targets.foe[0]);
    give({ type: 'command', actor: aw.actor, abl: x.id, target: tgt });
  }

  // ------------------------------------------------------------------ drawing
  function bar(g, x, y, w, h, frac, color, back) {
    g.fillStyle = back || '#1d2233'; g.fillRect(x, y, w, h);
    g.fillStyle = color; g.fillRect(x, y, Math.max(0, Math.round(w * Math.max(0, Math.min(1, frac)))), h);
  }
  function elementColor(k) {
    var els = rs(cur()).elements || [];
    for (var i = 0; i < els.length; i++) if (els[i] && els[i].key === k && els[i].color) return els[i].color;
    return '#ffffff';
  }
  function draw(ts) {
    var g = V.g, W = V.res.w, H = V.res.h, S = V.S, field = V.field;
    g.imageSmoothingEnabled = false;
    // backdrop
    g.fillStyle = '#10142a'; g.fillRect(0, 0, W, field);
    g.fillStyle = '#18203c'; g.fillRect(0, Math.round(field * 0.35), W, Math.round(field * 0.25));
    g.fillStyle = '#243052'; g.fillRect(0, Math.round(field * 0.6), W, field - Math.round(field * 0.6));
    g.fillStyle = '#2e3c63'; for (var gx = 0; gx < W; gx += 16) g.fillRect(gx, Math.round(field * 0.6) + ((gx / 16) % 2 ? 6 : 12), 8, 1);
    if (V.weatherId) {
      var w = recOf(cur(), V.weatherId), txt = w ? String(w.realWorld || w.name || '') : '';
      g.fillStyle = 'rgba(160,190,255,.25)';
      var off = Math.floor(ts / 40) % 12;
      if (/rain|storm|shower|drizzle|monsoon|hail/i.test(txt)) for (var rx = -20; rx < W; rx += 12) for (var ry = 0; ry < field; ry += 18) g.fillRect(rx + ((ry + off * 2) % 12), (ry + off * 3) % field, 1, 4);
      else if (/snow|blizzard|flurr/i.test(txt)) for (var sx = 0; sx < W; sx += 14) g.fillRect((sx + off) % W, (sx * 7 + off * 2) % field, 1, 1);
      else if (/fog|mist|haze|smog/i.test(txt)) { g.fillStyle = 'rgba(200,210,230,.10)'; g.fillRect(0, Math.round(field * 0.4), W, Math.round(field * 0.6)); }
      else if (/heat|sun|drought|clear/i.test(txt)) { g.fillStyle = 'rgba(255,190,90,.08)'; g.fillRect(0, 0, W, field); }
      if (txt) drawText(g, shortName(txt, 20), 3, 3, '#9fb3d9', 1);
    }
    var an = V.anim && ts - V.anim.born < 520 / (V.speed || 1) ? V.anim : null;
    // foes
    S.units.forEach(function (u) {
      var p = V.pos[u.uid], d = V.disp[u.uid];
      if (!p) return;
      var dx = an && an.actor === u.uid ? (u.side === 'foe' ? 6 : -6) : 0;
      var alpha = 1;
      if (d && d.ko) { var ft = V.fade[u.uid] ? (ts - V.fade[u.uid]) / 500 : 1; alpha = u.side === 'foe' ? Math.max(0, 1 - ft) : 1; }
      if (alpha <= 0) return;
      g.globalAlpha = alpha;
      if (u.side === 'foe') {
        var spr = foeSprite(u.fam, u.tier, u.palette, p.w);
        g.drawImage(spr, p.x + dx - 1, p.y - 1);
        if (u.charging) { g.fillStyle = '#e3b453'; g.fillRect(p.x + dx, p.y - 3, Math.round(p.w * (1 - u.charging.left / Math.max(1, (S.db.abl[u.charging.abl] || {}).chargeTicks || 1))), 1); }
      } else {
        var koP = d && d.ko;
        if (koP) {
          g.fillStyle = '#555a66'; g.fillRect(p.x - 4, p.y + p.h - 5, p.h, 5);
        } else {
          var tint = p.tint, x = p.x + dx, y = p.y;
          g.fillStyle = '#07080d'; g.fillRect(x - 1, y - 1, p.w + 2, p.h + 2);
          g.fillStyle = tint; g.fillRect(x, y + 6, p.w, p.h - 6);
          g.fillStyle = shade(tint, 0.35); g.fillRect(x + 2, y, p.w - 4, 7);
          g.fillStyle = '#f1d7b8'; g.fillRect(x + 3, y + 2, p.w - 6, 4);
          g.fillStyle = '#07080d'; g.fillRect(x + 4, y + 3, 1, 1);
          g.fillStyle = shade(tint, -0.35); g.fillRect(x, y + p.h - 5, p.w, 2);
          if (frac2(u, d) < 0.25) { g.fillStyle = 'rgba(255,80,80,.35)'; g.fillRect(x, y, p.w, p.h); }
          weaponGlyph(g, u.weaponClass, x - 2, y + 11, '#c9c1ab');
          if (S.awaiting && S.awaiting.actor === u.uid && Math.floor(ts / 300) % 2) { g.fillStyle = '#e3b453'; g.fillRect(x + p.w / 2 - 1, y - 6, 3, 3); }
        }
      }
      if (V.flash[u.uid] && ts - V.flash[u.uid] < 140) { g.globalAlpha = 0.6; g.fillStyle = '#ffffff'; g.fillRect(p.x + dx, p.y, p.w, p.h); }
      g.globalAlpha = 1;
      if (u.statuses && u.statuses.length && !(d && d.ko)) { g.fillStyle = '#c89cf0'; g.fillRect(p.x + dx, p.y + p.h + 1, Math.min(p.w, u.statuses.length * 3), 1); }
    });
    // action flash lines
    if (an) {
      var ap = V.pos[an.actor], col = an.element ? elementColor(an.element) : '#ffffff';
      drawText(g, shortName(an.name, 18), Math.round(W / 2 - textW(shortName(an.name, 18)) / 2), Math.max(10, field - 12), '#ffffff');
      if (ap) (an.targets || []).forEach(function (t) {
        var tp = V.pos[t]; if (!tp) return;
        g.fillStyle = col; g.globalAlpha = 0.35;
        g.fillRect(tp.x - 1, tp.y - 1, tp.w + 2, 1); g.fillRect(tp.x - 1, tp.y + tp.h, tp.w + 2, 1);
        g.globalAlpha = 1;
      });
    }
    // popups
    V.popups = V.popups.filter(function (p) { return ts - p.born < 900 / Math.max(1, (V.speed || 1) * 0.75); });
    V.popups.forEach(function (p) { var age = (ts - p.born) / 900; var s = p.text.length > 4 ? 1 : 2; drawText(g, p.text, Math.round(p.x - textW(p.text, s) / 2), Math.round(p.y - age * 12), p.color, s); });
    // HUD
    var hy = field, hh = H - field;
    g.fillStyle = '#0b0e1d'; g.fillRect(0, hy, W, hh);
    g.fillStyle = '#3a4a80'; g.fillRect(0, hy, W, 1); g.fillRect(Math.round(W * 0.36), hy + 3, 1, hh - 6);
    var foes = S.units.filter(function (u) { return u.side === 'foe'; }), party = S.units.filter(function (u) { return u.side === 'party'; });
    var fy = hy + 4;
    foes.forEach(function (u) {
      if (fy > H - 7) return;
      var d = V.disp[u.uid];
      drawText(g, shortName(u.name, Math.floor((W * 0.36 - 8) / 4)), 4, fy, d && d.ko ? '#5d6480' : '#e8e2cf');
      if (!(d && d.ko)) bar(g, 4, fy + 6, Math.round(W * 0.36 - 10), 1, frac2(u, d), '#e07a6e');
      fy += 9;
    });
    var px = Math.round(W * 0.36) + 4, pw = W - px - 3, rowH = Math.max(9, Math.min(14, Math.floor((hh - 6) / Math.max(1, party.length))));
    party.forEach(function (u, i) {
      var d = V.disp[u.uid] || u, y = hy + 4 + i * rowH, isAw = S.awaiting && S.awaiting.actor === u.uid;
      var nameCols = Math.max(3, Math.floor(pw * 0.26 / 4));
      drawText(g, shortName(u.name, nameCols), px, y, d.ko ? '#5d6480' : isAw ? '#e3b453' : '#e8e2cf');
      var hpTxt = d.hp + '/' + u.maxHp, hx = px + nameCols * 4 + 3;
      var lowCol = d.ko ? '#8a4a4a' : frac2(u, d) < 0.25 ? '#ffb347' : '#e8e2cf';
      drawText(g, hpTxt, hx, y, lowCol);
      var gx0 = hx + textW('9999/9999') + 4, gw = Math.max(10, W - 3 - gx0);
      if (rowH >= 12) {
        drawText(g, String(d.mp), gx0, y, '#9ad1ff');
        var gy = y + 6;
        bar(g, gx0 + 14, y + 1, Math.max(8, gw - 14), 2, S.sched === 'atb' ? u.gauge / S.gaugeMax : (u.ready ? 1 : 0), u.ready ? '#e3b453' : '#6fc7b6');
        if (u.limits && u.limits.length) bar(g, gx0 + 14, gy - 1, Math.max(8, gw - 14), 1, u.limit.gauge, u.limit.gauge >= 1 ? '#ff8aa0' : '#8a5a9e');
      } else {
        bar(g, gx0, y + 2, gw, 2, S.sched === 'atb' ? u.gauge / S.gaugeMax : (u.ready ? 1 : 0), u.ready ? '#e3b453' : '#6fc7b6');
      }
    });
    if (S.sched !== 'atb' && !S.result) drawText(g, (S.sched === 'rounds' ? 'ROUND ' + (S.round ? S.round.n : 1) : 'CTB') + ' T' + S.t, W - textW('ROUND 99 T9999') - 3, 3, '#9fb3d9');
    if (S.result && V.ended) {
      var lab = { win: 'VICTORY', lose: 'DEFEAT', flee: 'ESCAPED', timeout: 'TIME OUT' }[S.result.outcome] || '';
      var sc = W >= 200 ? 3 : 2, tw = textW(lab, sc);
      g.fillStyle = 'rgba(7,8,13,.6)'; g.fillRect(0, Math.round(field / 2 - 14), W, 28);
      drawText(g, lab, Math.round(W / 2 - tw / 2), Math.round(field / 2 - 7), S.result.outcome === 'win' ? '#e3b453' : S.result.outcome === 'lose' ? '#f07a6e' : '#c9c1ab', sc);
    }
  }
  function frac2(u, d) { return u.maxHp ? (d ? d.hp : u.hp) / u.maxHp : 0; }

  // ------------------------------------------------------------------ log, codes
  function nm(uid) { return uid ? (V.names[uid] || uid) : ''; }
  function describe(e) {
    switch (e.type) {
      case 'note': return e.text;
      case 'ready': return nm(e.actor) + ' is ready.';
      case 'command': return e.value === 'flee' ? nm(e.actor) + ' tries to flee.' : nm(e.actor) + ' chooses ' + (e.name || e.abl) + '.';
      case 'action': return nm(e.actor) + (e.value === 'counter' ? ' counters with ' : ' uses ') + (e.name || e.abl) + ' on ' + (e.targets || []).map(nm).join(', ') + '.';
      case 'damage': return nm(e.target) + ' takes ' + e.value + (e.element ? ' ' + e.element : '') + ' damage' + (e.crit ? ', a critical hit' : '') + '.';
      case 'heal': return nm(e.target) + ' recovers ' + e.value + ' HP.';
      case 'miss': return e.value === 'mp' ? nm(e.actor) + ' lacks the MP.' : e.value === 'flee' ? (e.name || 'Could not escape') + '.' : e.value === 'rejected' ? (e.name || 'Rejected.') : nm(e.actor) + ' misses ' + nm(e.target) + '.';
      case 'status': return String(e.value).charAt(0) === '-' ? nm(e.target) + ' is free of ' + String(e.value).slice(1) + ' (' + e.name + ').' : nm(e.target) + ' is afflicted with ' + (e.name || e.value) + '.';
      case 'limitReady': return e.value === 'full' ? nm(e.target) + ' is ready to break their Limit.' : nm(e.target) + ' reached ' + (e.name || 'a new Limit level') + '.';
      case 'ko': return nm(e.target) + ' is knocked out' + (e.actor ? ' by ' + nm(e.actor) : '') + '.';
      case 'revive': return nm(e.target) + ' is revived.';
      case 'end': return 'Battle over: ' + e.value + '.';
      default: return e.type;
    }
  }
  function pushLog(e) { V.log.push(e); if (V.log.length > 2000) V.log.splice(0, V.log.length - 2000); }
  function openLog() {
    if (!V || !V.log) return;
    Kit.ui.drawer({
      title: 'Battle log',
      body: function (bd) {
        var p = el('p', 'muted'); p.textContent = V.log.length + ' events, seed ' + V.seed + '. Newest last.'; bd.appendChild(p);
        var list = el('div', 'ar-log');
        V.log.slice(-600).forEach(function (e) {
          var ln = el('div', 'ln k-' + e.type);
          ln.innerHTML = '<span class="t">t ' + e.t + '</span><span class="m">' + esc(describe(e)) + '</span>';
          list.appendChild(ln);
        });
        bd.appendChild(list);
        setTimeout(function () { bd.scrollTop = bd.scrollHeight; }, 0);
      }
    });
  }
  function copyCode() {
    if (!V || !V.last || !V.last.code) return;
    var code = V.last.code;
    function shown() {
      Kit.ui.dialog({ title: 'Battle code', body: function (bd) { var t = el('textarea', 'inp ar-code'); t.readOnly = true; t.value = code; bd.appendChild(el('p', 'muted', 'Paste this into any Saga Forge with the same records to replay the fight tick for tick.')); bd.appendChild(t); setTimeout(function () { t.focus(); t.select(); }, 0); }, actions: [{ label: 'Done', kind: 'primary' }] });
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(function () { Kit.ui.toast('Battle code copied.', 'ok'); }, shown);
      else shown();
    } catch (e) { shown(); }
  }
  function playCode(code) {
    var o;
    try { o = WSX.decodeCode(code); } catch (e) { Kit.ui.toast(e.message || 'That battle code could not be read.', 'error'); return false; }
    var b = cur();
    if (!recOf(b, o.troopId)) { Kit.ui.toast('This project has no troop ' + o.troopId + '.', 'error'); return false; }
    if (!V || Kit.active() !== 'arena' || !document.getElementById('arStage')) { WSX._pending = { code: code }; if (Kit.active() === 'arena') Kit.rerender(); else Kit.go('arena'); return true; }
    startBattle(null, o);
    return true;
  }
  WSX.playCode = playCode;
  function pasteCode() {
    Kit.ui.prompt({ title: 'Paste battle code', label: 'Battle code', multiline: true, okLabel: 'Replay', validate: function (v) { try { WSX.decodeCode(v); return null; } catch (e) { return 'That is not a valid battle code.'; } } }).then(function (v) { if (v) playCode(v); });
  }

  Kit.mount('arena', { title: 'Arena', icon: 'arena', canEnter: WSX.canEnter, render: WSX.render, onLeave: function () { stopLoop(); closeMenu(); return true; } });
})();
// === WS:ARENA END ===
