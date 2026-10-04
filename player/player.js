/* Saga Studio player, version 1.0.0 (AppADay 150, Phase 4).
 * The game shell. Kit free: it loads with nothing but the five engines (ENGINE_RENDER, ENGINE_AUDIO, ENGINE_WORLD,
 * ENGINE_BATTLE, ENGINE_STORY) and a Final bundle, per Day 149's day150 contract. Declares one global, SagaPlayer.
 * No network, no API key, no forge storage. Five modules, each ported from the forge that proved it:
 *   field   Day 147 WS:PLAYTEST's walker, on maps Day 148's ENGINE_WORLD rebuilds from the seed (or reads from the bake),
 *           drawn with ENGINE_RENDER tiles and sprites. Standing, stepping, entering, and talking become the moves
 *           ENGINE_STORY.host.moves offers, played with ENGINE_STORY.host.play.
 *   effects text, choice, fade, face, moveActor, changeMap, vehicle, and wait, drawn with ENGINE_RENDER's windows and font.
 *   battle  ENGINE_BATTLE init and advance behind ENGINE_RENDER's presenter, Day 147 ART:BATTLE's session and command menu,
 *           outcomes mapped through Day 149's OUTCOMES table.
 *   party   Day 146 WSX.buildParty (bestGear, placeMateria, epsFor), plus an Equip and Materia screen that edits it.
 *   save    title, new game, continue, slots (ENGINE_STORY.save.toSave and fromSave in localStorage under the game's slug),
 *           and download and load save files, because browsers scope file:// storage unpredictably.
 * DECISION, how a question waits for a person: ENGINE_STORY's hooks are synchronous, but a choice or a battle needs a
 * person. The engine is pure and deterministic, so the player plays a move with the answers it has; at the first
 * question it has no answer for, the hook returns nothing (the host stops with code undecided), the effects up to that
 * question are shown, the person answers, and the move is played again from the same state with one more answer. The
 * effects already shown are skipped by count. A replay of a pure function cannot drift, so this is exact. */
var SagaPlayer = (function () {
  'use strict';
  var ER = ENGINE_RENDER, EA = ENGINE_AUDIO, EW = ENGINE_WORLD, EB = ENGINE_BATTLE, ES = ENGINE_STORY;
  var EU = ER.ui, ET = ER.tiles, H = ES.host;
  var VERSION = '1.0.0';
  // Day 149's OUTCOMES (STORY.day150c): ENGINE_BATTLE's four outcomes to the story's three. A timeout is a loss.
  var OUTCOMES = { win: 'win', lose: 'lose', flee: 'escape', timeout: 'lose' };
  var PARTY_MAX = 4, STEP_MS = 190, SLOTS = ['1', '2', '3'], PORTFOLIO = 'https://augustineiacopelli.github.io/appaday/';
  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };
  var TEXT_CPS = { slow: 28, normal: 56, fast: 140, instant: 1e9 };

  // ---------------------------------------------------------------- small helpers
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }
  function keys(o) { return isObj(o) ? Object.keys(o).sort() : []; }
  function vals(o) { return keys(o).map(function (k) { return o[k]; }).filter(isObj); }
  function copy(v) { return v == null ? v : JSON.parse(JSON.stringify(v)); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function num(v, d) { return typeof v === 'number' && isFinite(v) ? v : (d === undefined ? 0 : d); }
  function canon(v) {
    if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
    if (isObj(v)) return '{' + Object.keys(v).sort().filter(function (k) { return v[k] !== undefined; }).map(function (k) { return JSON.stringify(k) + ':' + canon(v[k]); }).join(',') + '}';
    return JSON.stringify(v === undefined ? null : v);
  }
  function hash32(s) { return ER.util.hash32(String(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); }
  function detach(node) { if (node && node.parentNode) node.parentNode.removeChild(node); }
  function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
  function shortName(name) { var p = String(name || '').split(': '); return p[p.length - 1]; }
  function prefixOf(id) { var m = /^([a-z]{3}_)/.exec(String(id || '')); return m ? m[1] : null; }
  function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'saga'; }
  function fmtTime(ms) { var s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60; return h + ':' + (m < 10 ? '0' : '') + m; }
  function cell(xy, w) { return xy[1] * w + xy[0]; }
  function sameXY(a, x, y) { return Array.isArray(a) && a[0] === x && a[1] === y; }
  function now() { return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now(); }
  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  // ---------------------------------------------------------------- the game data (read once from the bundle)
  var G = { b: null, game: null, W: 256, H: 224, T: 16, u: 1, ent: [], cache: null, kit: {}, font: null, title: 'Saga', slug: 'saga', chapters: [], chIdx: {}, warnings: [] };
  function rulesRec(id) { var p = prefixOf(id), m = p && G.b.rules && G.b.rules[p]; return isObj(m) && isObj(m[id]) ? m[id] : null; }
  function rulesList(p) { return vals(G.b.rules && G.b.rules[p]); }
  function artRec(id) { var p = prefixOf(id), m = p && G.b.art && G.b.art.records && G.b.art.records[p]; return isObj(m) && isObj(m[id]) ? m[id] : null; }
  function artList(p) { return vals(G.b.art && G.b.art.records && G.b.art.records[p]); }
  function worldRec(id) { var p = prefixOf(id), m = p && G.b.world && G.b.world.records && G.b.world.records[p]; return isObj(m) && isObj(m[id]) ? m[id] : null; }
  function worldList(p) { return vals(G.b.world && G.b.world.records && G.b.world.records[p]); }
  function storyRec(id) { var p = prefixOf(id), m = p && G.b.story && G.b.story.records && G.b.story.records[p]; return isObj(m) && isObj(m[id]) ? m[id] : null; }
  function bySubject(p, kind, ref) { var l = artList(p); for (var i = 0; i < l.length; i++) if (l[i].subject && l[i].subject.kind === kind && l[i].subject.ref === ref) return l[i]; return null; }
  function nameOf(id) {
    if (!id) return '';
    var r = rulesRec(id) || worldRec(id) || storyRec(id) || artRec(id);
    return r ? shortName(r.name || id) : String(id);
  }
  function chapterName(id) { var c = G.chapters.filter(function (x) { return x.id === id; })[0]; return c ? (c.name || id) : ''; }
  function makeCanvas(w, h) { var c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  // Problems a bundle can have that stop the game before it starts. Null when it is playable.
  function unplayable(b) {
    if (!isObj(b)) return 'That is not a Saga bundle.';
    var miss = ['charter', 'rules', 'art', 'world', 'story'].filter(function (k) { return !isObj(b[k]); });
    if (miss.length) return 'This bundle has no ' + miss.join(', ') + ' yet. Finish every forge and mark the Story stage Final.';
    var maps = b.world.records && b.world.records.map_;
    if (!isObj(maps) || !vals(maps).some(function (m) { return m.kind === 'overworld'; })) return 'This bundle has no generated world. Generate it in the World stage.';
    if (!isObj(b.story.records) || !isObj(b.story.records.evt_) || !keys(b.story.records.evt_).length) return 'This bundle has no story events. Build the events in the Story stage.';
    return null;
  }
  function readBundle(b) {
    G.b = b;
    G.game = H.load(b);
    var sp = (b.charter && b.charter.specs) || {}, r = sp.resolution || {};
    G.W = clamp(Math.round(num(Number(r.w), 256)), 160, 640); G.H = clamp(Math.round(num(Number(r.h), 224)), 120, 480);
    var T = Math.round(Number(sp.tileSize)); G.T = isFinite(T) ? clamp(T, 4, 128) : 16;
    G.u = Math.max(1, Math.round(G.T / 16));
    var master = artList('pal_').filter(function (p) { return p.kind === 'master'; })[0];
    G.ent = master && Array.isArray(master.entries) ? master.entries : [];
    G.cache = ER.createCache(b.art, { size: G.T, entries: G.ent, budget: 48e6, makeCanvas: makeCanvas });
    ['window', 'font', 'cursor', 'touch', 'title'].forEach(function (k) { G.kit[k] = bySubject('uik_', 'role', 'ui:' + k); });
    G.font = EU.font(G.kit.font || null);
    var prem = b.charter.sections && b.charter.sections.premise;
    G.title = (G.kit.title && G.kit.title.text) || (prem && prem.title) || (b.kit && b.kit.title) || 'Untitled Saga';
    G.slug = slugify(G.title) + '-' + String((b.kit && b.kit.bundleId) || hash32(G.title).toString(36)).replace(/[^a-z0-9_]/gi, '').slice(-12);
    G.chapters = (b.charter.sections && Array.isArray(b.charter.sections.chapters) ? b.charter.sections.chapters : []).filter(isObj);
    G.chIdx = {}; G.chapters.forEach(function (c, i) { G.chIdx[c.id] = i; });
    G.roles = (G.game.ext && G.game.ext.roles) || [];
    G.bindings = isObj(b.story.bindings) ? b.story.bindings : {};
    G.startGates = G.game.ext && Array.isArray(G.game.ext.start) ? G.game.ext.start.slice() : [];
  }
  function applyWindowColors() {
    var w = G.kit.window || {}, root = UI.root;
    if (!root) return;
    root.style.setProperty('--win-top', EU.color(w.gradient && w.gradient.top, G.ent, '#2a4aa8'));
    root.style.setProperty('--win-bot', EU.color(w.gradient && w.gradient.bottom, G.ent, '#0c1450'));
    root.style.setProperty('--win-light', EU.color(w.light, G.ent, '#e8e8f0'));
    root.style.setProperty('--win-edge', EU.color(w.border, G.ent, '#000000'));
  }

  // ---------------------------------------------------------------- the world (Day 148, rebuilt from the seed)
  // The overworld is always rebuilt: walking needs its gates, sea, and structural layers, not just its tiles. Interiors
  // come from the bake when it still matches the map record, else from ENGINE_WORLD.interiors.build with the same spec
  // Day 148 used, checked against the record's digest. Exits, features, and people always come from the records.
  var WD = { ow: null, owRec: null, maps: {}, nodes: {}, siteAt: {}, npcsByMap: {}, zonesField: {}, zonesMap: {}, ipal: null, arch: null, siteBuilt: {} };
  function chapterMinutes() { var m = {}; G.chapters.forEach(function (c) { m[c.id] = Number(c.targetMinutes) || 60; }); return m; }
  function settingsForHash(s) { var o = copy(s || {}); delete o.bake; return o; }
  function buildWorld() {
    var b = G.b, t0 = now();
    WD.owRec = worldList('map_').filter(function (m) { return m.kind === 'overworld'; })[0];
    var g = b.world.progression, pal = EW.overworld.palette(b.art, EW.climate.table(b.art, ER)), paint = (b.world.overrides && isObj(b.world.overrides.cells)) ? b.world.overrides.cells : {};
    var parts = [EW.version, b.world.seed, canon(settingsForHash(b.world.settings)), g ? g.digest : '-', pal.digest, canon(chapterMinutes())];
    if (keys(paint).length) parts.push('paint', canon(paint));
    var ph = EW.util.digest(parts);
    if (ph !== WD.owRec.paramHash) G.warnings.push('The overworld was generated from other parameters than this bundle now holds (' + WD.owRec.paramHash + ' vs ' + ph + ').');
    var ow = EW.overworld.build({ seed: b.world.seed, settings: b.world.settings, graph: g, minutes: chapterMinutes(), palette: pal, paint: paint });
    if (ow.digest !== WD.owRec.digest) G.warnings.push('The rebuilt overworld does not match its record; the world may draw differently from the forge.');
    WD.ow = ow;
    WD.maps[WD.owRec.id] = { id: WD.owRec.id, rec: WD.owRec, kind: 'overworld', w: ow.w, h: ow.h, ground: ow.ground, deco: ow.deco, exits: [], features: [], ow: ow };
    (g && Array.isArray(g.nodes) ? g.nodes : []).forEach(function (n) { WD.nodes[n.key] = n; });
    (WD.owRec.sites || []).forEach(function (s) { if (Array.isArray(s.entrance)) WD.siteAt[cell(s.entrance, ow.w)] = s; });
    worldList('npc_').forEach(function (n) { if (n.map && Array.isArray(n.at)) (WD.npcsByMap[n.map] = WD.npcsByMap[n.map] || []).push(n); });
    var z = b.world.zones;
    if (isObj(z)) {
      (z.field || []).forEach(function (f) { if (f && !f.empty) WD.zonesField[f.chapter + '|' + f.biome] = f; });
      (z.interior || []).forEach(function (f) { if (f && !f.empty && f.map) WD.zonesMap[f.map] = f; });
    }
    WD.ipal = EW.interiors.palette(b.art);
    var arch = {};
    artList('spr_').forEach(function (sp) { if (sp.subject && sp.subject.kind === 'role' && /^npc:/.test(sp.subject.ref || '') && !arch[sp.subject.ref.slice(4)]) arch[sp.subject.ref.slice(4)] = sp.id; });
    WD.arch = keys(arch);
    WD.ms = Math.round(now() - t0);
  }
  function siteKeyOf(mapRec) { return String(mapRec.key || '').replace(/^map\|/, '').replace(/\|\d+$/, ''); }
  // The spec Day 148's WORLD.interiors builds a site from (world-generate.js inSpecs), so the floors match byte for byte.
  function siteSpec(key) {
    var b = G.b, ow = WD.ow, s2 = ow.sites.filter(function (s) { return s.key === key; })[0];
    if (!s2) return null;
    var nd = WD.nodes[s2.key] || {}, gr = ow.ground[s2.front], biome = gr && String(gr).indexOf(':') < 0 ? gr : null;
    return { seed: EW.hash.seed(b.world.seed, 'interior|' + s2.key), key: s2.key, kind: s2.interior || (s2.kind === 'twn' ? 'town' : 'dungeon'), role: s2.role,
      settings: b.world.settings, palette: WD.ipal, outdoor: biome, archetypes: WD.arch.length ? WD.arch : EW.interiors.ARCHETYPES.slice(),
      prize: s2.role === 'key' ? (nd.grants || [])[0] || null : null, troop: nd.troop || null, grants: (nd.grants || []).slice(), finale: !!nd.finale };
  }
  function buildSite(key) {
    if (WD.siteBuilt[key]) return WD.siteBuilt[key];
    var sp = siteSpec(key);
    var site = sp ? EW.interiors.build(sp) : null;
    WD.siteBuilt[key] = site || { floors: [] };
    return WD.siteBuilt[key];
  }
  function mapData(id) {
    if (WD.maps[id]) return WD.maps[id];
    var r = worldRec(id);
    if (!r || r.kind === 'overworld') return null;
    var layers = null;
    try { layers = EW.bake.load(G.b, id); } catch (e) { layers = null; }
    if (!layers) {
      var site = buildSite(siteKeyOf(r)), fl = site.floors.filter(function (f) { return f.floor === r.floor; })[0];
      if (!fl) { G.warnings.push('Map ' + id + ' could not be rebuilt.'); return null; }
      if (r.digest && fl.digest !== r.digest) G.warnings.push('Map ' + id + ' rebuilt differently from its record.');
      layers = fl;
    }
    var m = { id: id, rec: r, kind: r.kind, w: layers.w, h: layers.h, ground: layers.ground, deco: layers.deco, exits: Array.isArray(r.exits) ? r.exits : [], features: Array.isArray(r.features) ? r.features : [] };
    WD.maps[id] = m;
    return m;
  }

  // ---------------------------------------------------------------- what the party holds (story flags plus the shell's)
  // Gate keys are world local strings bound to story flags (story.bindings); a key is held when its flag is 1 or more.
  // A dungeon's own small keys (item:key:<site>) are the shell's: they come from chests, not from the story.
  function heldKeys() {
    var h = {}, st = P.st;
    G.startGates.forEach(function (k) { h[k] = true; });
    keys(G.bindings).forEach(function (k) { var bd = G.bindings[k]; if (st && bd && typeof bd.flg === 'string' && ES.state.flag(st, G.game.idx, bd.flg) >= 1) h[k] = true; });
    keys(P.shell.keys).forEach(function (k) { if (P.shell.keys[k]) h[k] = true; });
    return h;
  }
  function siteOpen(site, held) {
    var n = WD.nodes[site.key];
    return !n || (n.requires || []).every(function (k) { return held[k]; });
  }

  // ---------------------------------------------------------------- the player state
  // P.st is the story state (ENGINE_STORY's, always quiet between moves). P.shell is everything else a save keeps.
  var P = { st: null, shell: null, mode: 'boot', walker: null, actors: {}, faults: [], played: [] };
  function freshShell() {
    var s = WD.owRec && Array.isArray(WD.owRec.start) ? WD.owRec.start : [0, 0];
    return { map: WD.owRec ? WD.owRec.id : null, x: s[0], y: s[1], dir: 'down', opened: {}, keys: {}, purse: { gil: 0, loot: {} }, gear: {}, steps: 0, playMs: 0, safe: 6 };
  }

  // ---------------------------------------------------------------- the walker (Day 147 WS:PLAYTEST createWalker)
  // One cell per step, eased between cells. canEnter is the map's own rule; the original read tile flags only, this one
  // also reads the overworld's gates and sea, a dungeon's locks, and the people standing in the way.
  function createWalker(start, dir, hooks) {
    var w = { x: start[0], y: start[1], fx: start[0], fy: start[1], dir: dir || 'down', moving: null, steps: 0, blocked: null, walkT: 0 };
    w.step = function (dt, held) {
      if (w.moving) {
        w.moving.t += dt; w.walkT += dt;
        var p = Math.min(1, w.moving.t / STEP_MS);
        w.fx = w.moving.from[0] + (w.x - w.moving.from[0]) * p; w.fy = w.moving.from[1] + (w.y - w.moving.from[1]) * p;
        if (p >= 1) { w.moving = null; w.fx = w.x; w.fy = w.y; w.steps++; if (hooks.arrive) hooks.arrive(w); }
      }
      if (!w.moving && held && P.mode === 'field') {
        w.dir = held;
        var d = DIRS[held], nx = w.x + d[0], ny = w.y + d[1];
        if (hooks.before && hooks.before(w, nx, ny)) return w;
        if (hooks.canEnter(nx, ny)) { w.moving = { from: [w.x, w.y], t: 0 }; w.x = nx; w.y = ny; w.blocked = null; }
        else { if (!w.blocked || w.blocked[0] !== nx || w.blocked[1] !== ny) { w.blocked = [nx, ny]; if (hooks.bump) hooks.bump(w, nx, ny); } }
      }
      if (!w.moving && !held) { w.walkT = 0; w.blocked = null; }
      return w;
    };
    return w;
  }
  function curMap() { return WD.maps[P.shell.map] || mapData(P.shell.map); }
  function npcAt(m, x, y) {
    var list = WD.npcsByMap[m.id] || [];
    for (var i = 0; i < list.length; i++) { var p = actorPos(list[i]); if (p[0] === x && p[1] === y) return list[i]; }
    return null;
  }
  function featureAt(m, x, y, kind) { for (var i = 0; i < m.features.length; i++) { var f = m.features[i]; if (sameXY(f.at, x, y) && (!kind || f.kind === kind)) return f; } return null; }
  function exitAt(m, x, y) { for (var i = 0; i < m.exits.length; i++) if (sameXY(m.exits[i].at, x, y)) return m.exits[i]; return null; }
  function onShip(m, x, y) { return m.kind === 'overworld' && !!m.ow.sea[y * m.w + x]; }
  function passable(m, x, y, held) {
    if (x < 0 || y < 0 || x >= m.w || y >= m.h) return false;
    if (m.kind === 'overworld') {
      var i = y * m.w + x;
      if (m.ow.st[i] === EW.overworld.ST.DOOR) return false;
      return EW.overworld.walkable(m.ow, i, held, !!held['vehicle:ship']);
    }
    if (!(ET.flagsAt(G.b.art, m, x, y) & ET.FLAGS.passable)) return false;
    var lock = featureAt(m, x, y, 'lock');
    if (lock && !(lock.requires || []).every(function (k) { return held[k]; })) return false;
    if (npcAt(m, x, y)) return false;
    return true;
  }
  // A move into a site entrance or an exit tile is a transfer, whether or not the tile itself can be stood on.
  function transferFor(m, x, y, held, quiet) {
    if (m.kind === 'overworld') {
      if (x < 0 || y < 0 || x >= m.w || y >= m.h) return null;
      var site = WD.siteAt[y * m.w + x];
      if (!site || !site.enter) return null;
      if (!siteOpen(site, held)) return quiet ? null : { refused: 'The way into ' + nameOf(site.site) + ' is barred for now.' };
      return { map: site.enter.map, at: site.enter.at.slice(), dir: 'up' };
    }
    var ex = exitAt(m, x, y);
    if (!ex || !ex.to) return null;
    return { map: ex.to.map, at: ex.to.at.slice(), dir: ex.kind === 'overworld' ? 'down' : P.walker ? P.walker.dir : 'down' };
  }
  function makeWalker() {
    P.walker = createWalker([P.shell.x, P.shell.y], P.shell.dir, {
      canEnter: function (x, y) { return passable(curMap(), x, y, heldKeys()); },
      before: function (w, x, y) {
        var t = transferFor(curMap(), x, y, heldKeys());
        if (!t) return false;
        if (t.refused) { toast(t.refused); w.blocked = [x, y]; return true; }
        transfer(t);
        return true;
      },
      bump: function (w, x, y) { bumpInto(x, y); },
      arrive: function (w) { arrived(w); }
    });
  }
  function syncShell() { if (P.walker) { P.shell.x = P.walker.x; P.shell.y = P.walker.y; P.shell.dir = P.walker.dir; } }
  function transfer(t, o) {
    o = o || {};
    var m = mapData(t.map);
    if (!m) { toast('That way leads nowhere.'); return false; }
    var from = P.shell.map;
    P.shell.map = t.map; P.shell.x = t.at[0]; P.shell.y = t.at[1]; P.shell.dir = t.dir || P.shell.dir;
    makeWalker();
    P.actors = {};
    if (!o.silent && !FX.fadeMs && !FX.wait) { FX.fade = 1; FX.fadeFrom = 1; FX.fadeTo = 0; FX.fadeMs = 240; FX.fadeT = 0; FX.after = null; }
    if (from !== t.map) {
      P.enterPending = t.map;
      P.storyMusic = null;
      banner(placeName(m));
      if (!o.noMusic) playMusic(locationMusic());
      if (!o.noAuto) autosave();
    }
    if (!o.noStory) afterQuiet();
    return true;
  }
  function placeName(m) {
    if (m.kind === 'overworld') { var c = continentAt(P.shell.x, P.shell.y); return c ? c.label || c.continent : G.title; }
    return shortName(String(m.rec.name || '').replace(/, floor \d+$/, '')) + (m.rec.floors > 1 ? ' ' + m.rec.floor + 'F' : '');
  }
  function continentAt(x, y) {
    var ow = WD.ow, k = ow.region[y * ow.w + x], reg = k >= 0 ? ow.regions[k] : null;
    if (!reg) return null;
    var rec = (WD.owRec.continents || []).filter(function (c) { return c.continent === reg.continent; })[0];
    return rec || { continent: reg.continent, label: reg.continent };
  }

  // ---------------------------------------------------------------- the story seam: what the player may do here
  function movesNow() { return P.st && !P.st.run && !P.st.ending ? H.moves(G.game, P.st) : []; }
  function evtAt(id) { var e = storyRec(id); return e && Array.isArray(e.at) ? e.at : null; }
  function stepMoveAt(mapId, x, y) { return movesNow().filter(function (mv) { return mv.by === 'step' && mv.map === mapId && sameXY(evtAt(mv.evt), x, y); })[0] || null; }
  function talkMove(npcId) { return movesNow().filter(function (mv) { return mv.npc === npcId && (mv.by === 'talk' || mv.by === 'dialogue'); })[0] || null; }
  function arrived(w) {
    syncShell();
    P.shell.steps++;
    if (P.shell.safe > 0) P.shell.safe--;
    var m = curMap();
    if (w.steps % 2 === 0) sfx('sfx', 'step');
    var mv = stepMoveAt(m.id, w.x, w.y);
    if (mv) { play(mv); return; }
    if (rollEncounter(m, w.x, w.y)) return;
    afterQuiet();
  }
  function facing() { var w = P.walker, d = DIRS[w.dir]; return [w.x + d[0], w.y + d[1]]; }
  function bumpInto(x, y) {
    var m = curMap(), mv = stepMoveAt(m.id, x, y);
    if (mv) { play(mv); return; }
    var lock = m.kind !== 'overworld' && featureAt(m, x, y, 'lock');
    if (lock) { toast('The door is locked. A key lies somewhere on this floor.'); sfx('ui', 'error'); return; }
    var ch = m.kind !== 'overworld' && featureAt(m, x, y, 'chest');
    if (ch) openChest(m, ch);
  }
  // A: talk to the person ahead, open the chest ahead, or trigger an event on the cell ahead or underfoot.
  function interact() {
    if (P.mode !== 'field' || !P.walker || P.walker.moving) return;
    var m = curMap(), f = facing(), mv = stepMoveAt(m.id, f[0], f[1]) || stepMoveAt(m.id, P.walker.x, P.walker.y);
    if (mv) { play(mv); return; }
    var npc = npcAt(m, f[0], f[1]);
    if (npc) { talkTo(npc); return; }
    var ch = m.kind !== 'overworld' && featureAt(m, f[0], f[1], 'chest');
    if (ch) { openChest(m, ch); return; }
  }
  function talkTo(npc) {
    var w = P.walker;
    P.actors[npc.id] = P.actors[npc.id] || {};
    P.actors[npc.id].dir = OPPOSITE[w.dir];
    var mv = talkMove(npc.id);
    if (mv) { play(mv); return; }
    if (npc.role === 'innkeeper') { innFlow(npc); return; }
    sayLocal(npc.id, [fallbackLine(npc)]);
  }
  function fallbackLine(npc) {
    var r = String(npc.role || npc.archetype || '');
    if (/shop|merchant/.test(r) || /^shop/.test(npc.slot || '')) return 'Welcome! Your guild keeps your gear current, so there is nothing here you lack.';
    if (/guard/.test(r)) return 'Keep your wits about you beyond the walls.';
    if (/priest|church/.test(r) || npc.slot === 'church') return 'May the light keep you on your road.';
    if (/elder/.test(r)) return 'The old roads remember every traveler.';
    if (/child/.test(r)) return 'Are you really going out there?';
    return 'Safe travels, friend.';
  }
  function openChest(m, ch) {
    var k = m.id + '@' + ch.at[0] + ',' + ch.at[1];
    if (P.shell.opened[k]) { sayLocal(null, ['The chest is empty.']); return; }
    if (ch.prize) { sayLocal(null, ['The chest is sealed. Its prize is not yours to take yet.']); return; }
    P.shell.opened[k] = 1;
    sfx('ui', 'confirm');
    if (typeof ch.item === 'string' && /^item:key:/.test(ch.item)) {
      P.shell.keys[ch.item] = 1;
      sayLocal(null, ['Inside the chest lies a small key. It must open a door on this floor.']);
      return;
    }
    var ci = G.chIdx[P.st.chapter] || 0, gil = 40 + 30 * ci + (hash32(k) % 25);
    P.shell.purse.gil += gil;
    sayLocal(null, ['Inside the chest: ' + gil + ' gil.']);
  }

  // ---------------------------------------------------------------- playing a move (the answers loop)
  var IX = null;
  function play(mv) { begin({ kind: 'move', move: mv, st0: copy(P.st) }); }
  function begin(o) {
    stopWalking();
    IX = { kind: o.kind, move: o.move || null, st0: o.st0, answers: [], shown: 0, effects: [], q: null, res: null, local: o.local || null, done: o.done || null };
    P.mode = 'event';
    rerun();
  }
  function rerun() {
    if (IX.local) { IX.effects = IX.local.map(function (e) { return { e: e, ctx: {} }; }); IX.q = null; IX.res = null; nextEffect(); return; }
    var effs = [], k = 0, q = null;
    var hooks = {
      effect: function (e, ctx) { effs.push({ e: e, ctx: ctx }); },
      decide: function (question, ctx) { if (k < IX.answers.length) return IX.answers[k++]; if (!q) q = { question: question, ctx: ctx }; return undefined; }
    };
    var r = IX.kind === 'new' ? H.newGame(G.game, {}, hooks) : H.play(G.game, IX.st0, IX.move, hooks);
    IX.effects = effs; IX.q = q; IX.res = r;
    nextEffect();
  }
  function answer(v) { TXT.cur = null; IX.answers.push(v); IX.q = null; rerun(); }
  function nextEffect() {
    if (!IX) return;
    if (IX.shown < IX.effects.length) { var it = IX.effects[IX.shown++]; present(it.e, it.ctx); return; }
    if (IX.q) { ask(IX.q); return; }
    finish();
  }
  function finish() {
    var ix = IX, r = ix.res;
    IX = null;
    TXT.cur = null;
    if (ix.local) { P.mode = 'field'; if (ix.done) ix.done(); afterQuiet(true); return; }
    if (r && Array.isArray(r.steps) && !(r.error && r.error.code === 'undecided')) r.steps.forEach(function (s) { P.played.push(s); });
    if (r && r.error && r.error.code !== 'undecided') { P.faults.push(r.error); if (window.console) console.warn('[saga] ' + r.error.code + ': ' + r.error.message); }
    (r && r.faults || []).forEach(function (f) { P.faults.push(f); });
    if (r && r.state && !(r.error && r.error.code === 'undecided')) P.st = r.state;
    if (r && r.gameover) { gameOver(); return; }
    if (P.st && P.st.ending) { ending(); return; }
    P.mode = 'field';
    if (ix.kind === 'new') { P.enterPending = P.shell.map; if (!P.storyMusic) playMusic(locationMusic()); }
    autosave();
    afterQuiet();
  }
  // Called whenever the player stands still with nothing running: entering a map (mapEnter, once per arrival), then any
  // autorun that passes on this map. ENGINE_STORY's chain already runs autoruns on the map a move named; this catches the
  // ones a walk, a transfer, or a loaded save brings the player to.
  function afterQuiet(noAuto) {
    if (P.mode !== 'field' || !P.st || P.st.ending) return;
    var m = curMap(), list = movesNow(), mv = null;
    if (P.enterPending === m.id) { P.enterPending = null; mv = list.filter(function (x) { return x.by === 'mapEnter' && x.map === m.id; })[0] || null; }
    if (!mv && !noAuto) {
      var h = H.hash(P.st);
      mv = list.filter(function (x) { return x.by === 'autorun' && x.map === m.id && P.lastAuto !== x.evt + '@' + h; })[0] || null;
      if (mv) P.lastAuto = mv.evt + '@' + h;
    }
    if (mv) play(mv);
  }
  function sayLocal(speaker, lines, done) { begin({ kind: 'local', local: [{ kind: 'text', speaker: speaker, por: null, lines: lines }], done: done }); }

  // ---------------------------------------------------------------- effects
  var TXT = { cur: null }, FX = { fade: 0, fadeTo: 0, fadeMs: 0, fadeT: 0, wait: 0, flash: null, banner: null, shake: 0 };
  function present(e, ctx) {
    if (!isObj(e)) { nextEffect(); return; }
    switch (e.kind) {
      case 'text': showText(e); return;
      case 'fade': {
        var frames = clamp(num(e.frames, 30), 1, 600);
        FX.fadeFrom = FX.fade; FX.fadeTo = e.to === 'out' ? 1 : 0; FX.fadeMs = frames * 1000 / 60; FX.fadeT = 0; FX.after = nextEffect;
        return;
      }
      case 'wait': FX.wait = clamp(num(e.frames, 30), 1, 600) * 1000 / 60; FX.after = nextEffect; return;
      case 'music':
        if (e.stop === true) { stopMusic(400); P.storyMusic = 'stop'; }
        else if (e.mus) { P.storyMusic = e.mus; playTrack(e.mus); }
        else if (e.role) { P.storyMusic = e.role; playMusic(e.role); }
        nextEffect(); return;
      case 'sfx': if (e.sfx) playSfxId(e.sfx); nextEffect(); return;
      case 'face': {
        if (e.who === 'player' || !e.who) { if (P.walker && DIRS[e.dir]) P.walker.dir = e.dir; }
        else { P.actors[e.who] = P.actors[e.who] || {}; P.actors[e.who].dir = e.dir; }
        nextEffect(); return;
      }
      case 'moveActor': startMoveActor(e); return;
      case 'changeMap': {
        var at = Array.isArray(e.at) ? e.at : (worldRec(e.map) && worldRec(e.map).kind === 'overworld' ? WD.owRec.start : null);
        var dest = mapData(e.map);
        if (dest && !at) { var ex = dest.exits[0]; at = ex ? ex.arrive : [Math.floor(dest.w / 2), Math.floor(dest.h / 2)]; }
        if (dest) transfer({ map: e.map, at: at, dir: DIRS[e.dir] ? e.dir : P.shell.dir }, { noStory: true, noAuto: true, silent: true });
        nextEffect(); return;
      }
      case 'vehicle': toast(e.act === 'leave' ? 'You leave the vessel.' : 'A vessel is yours to command.'); nextEffect(); return;
      case 'questStage':
        if (e.changed) toast(e.fail ? 'Quest failed.' : e.done ? 'Quest complete: ' + (e.label || nameOf(e.qst)) : 'Quest: ' + (e.label || nameOf(e.qst)));
        nextEffect(); return;
      case 'giveItem': toast('Received ' + nameOf(e.itm) + (e.qty > 1 ? ' x' + e.qty : '') + '.'); sfx('ui', 'confirm'); nextEffect(); return;
      case 'takeItem': toast('Handed over ' + nameOf(e.itm) + '.'); nextEffect(); return;
      case 'gil': if (e.by) toast((e.by > 0 ? 'Received ' : 'Paid ') + Math.abs(e.by) + ' gil.'); nextEffect(); return;
      case 'party': toast(nameOf(e.chr) + (e.act === 'leave' ? ' leaves the party.' : ' joins the party.')); P.statusMemo = null; nextEffect(); return;
      case 'choice': TXT.choice = e; nextEffect(); return;
      case 'startBattle': TXT.battle = e; FX.flash = { t: 0, ms: 420 }; sfx('ui', 'ready'); FX.wait = 380; FX.after = nextEffect; return;
      case 'error': P.faults.push(e); if (window.console) console.warn('[saga] story: ' + e.message); nextEffect(); return;
      default: nextEffect();
    }
  }
  function startMoveActor(e) {
    var path = Array.isArray(e.path) ? e.path.filter(function (d) { return !!DIRS[d]; }) : [];
    if (!path.length) { nextEffect(); return; }
    if (e.who === 'player' || !e.who) {
      // The player walks the path cell by cell, ignoring collision as a cutscene does.
      FX.move = { who: 'player', path: path.slice(), t: 0 };
    } else {
      var npc = worldRec(e.who);
      if (!npc || npc.map !== P.shell.map) { nextEffect(); return; }
      P.actors[e.who] = P.actors[e.who] || {};
      FX.move = { who: e.who, path: path.slice(), t: 0 };
    }
  }
  function stepMoveActor(dt) {
    var mv = FX.move;
    mv.t += dt;
    if (mv.t < STEP_MS) return;
    mv.t = 0;
    var d = mv.path.shift();
    if (mv.who === 'player') { var w = P.walker; w.dir = d; w.x += DIRS[d][0]; w.y += DIRS[d][1]; w.fx = w.x; w.fy = w.y; syncShell(); }
    else { var a = P.actors[mv.who], base = actorPos(worldRec(mv.who)); a.dir = d; a.at = [base[0] + DIRS[d][0], base[1] + DIRS[d][1]]; }
    if (!mv.path.length) { FX.move = null; nextEffect(); }
  }
  function actorPos(npc) { var a = P.actors && P.actors[npc.id]; return a && a.at ? a.at : npc.at; }

  // ---- text
  function speakerOf(e) {
    var id = e.speaker;
    if (!id) return { name: null, por: e.por || null };
    var r = worldRec(id) || rulesRec(id);
    var por = e.por || (r && r.portrait) || null;
    if (!por && /^chr_/.test(id)) { var p = bySubject('por_', 'chr', id); por = p ? p.id : null; }
    return { name: r ? shortName(r.name || id) : String(id), por: por };
  }
  function showText(e) {
    var sp = speakerOf(e), hasPor = !!(sp.por && artRec(sp.por));
    var u = G.u, padX = 8 * u, porW = hasPor ? Math.round(G.T * 2.5) + 6 * u : 0, maxW = G.W - 8 * u - 2 * padX - porW;
    var lines = [];
    (Array.isArray(e.lines) ? e.lines : [String(e.lines || '')]).forEach(function (ln) { var w = EU.wrap(G.font, ln, maxW, 1); if (!w.length) w = ['']; lines = lines.concat(w); });
    var per = sp.name ? 3 : 3, pages = [];
    for (var i = 0; i < lines.length; i += per) pages.push(lines.slice(i, i + per));
    if (!pages.length) pages.push(['']);
    TXT.cur = { name: sp.name, por: hasPor ? sp.por : null, pages: pages, page: 0, shown: 0, t: 0, open: 0 };
    live((sp.name ? sp.name + ': ' : '') + (Array.isArray(e.lines) ? e.lines.join(' ') : ''));
  }
  function pageChars(t) { return t.pages[t.page].join('\n').length; }
  function advanceText() {
    var t = TXT.cur;
    if (!t) return;
    var n = pageChars(t);
    if (t.shown < n) { t.shown = n; return; }
    sfx('ui', 'move');
    if (t.page + 1 < t.pages.length) { t.page++; t.shown = 0; t.t = 0; return; }
    // A question asked right after a line keeps the line on screen beside its options.
    var nx = IX && IX.effects[IX.shown];
    if (!(nx && nx.e && nx.e.kind === 'choice')) TXT.cur = null;
    nextEffect();
  }

  // ---- questions
  function ask(q) {
    var question = q.question;
    if (question.kind === 'choice') { showChoice(question, TXT.choice); return; }
    if (question.kind === 'battle') {
      var trp = question.trp, eff = TXT.battle || {};
      startBattle({ trp: trp, canEscape: !!question.canEscape, canLose: !!question.canLose, source: 'story', done: function (outcome) { answer(OUTCOMES[outcome] || 'lose'); } });
      return;
    }
    answer(0);
  }
  function showChoice(q, eff) {
    var opts = q.options || [], cancel = eff && eff.cancel != null ? eff.cancel : null;
    var win = el('div', 'sg-win sg-win-right'), list = el('div', 'sg-list sg-scroll');
    if (eff && eff.prompt) win.appendChild(el('p', '', esc(eff.prompt)));
    opts.forEach(function (o, k) {
      var bt = item(o.text, '', function () { closeOverlay(); sfx('ui', 'confirm'); answer(k); });
      list.appendChild(bt);
    });
    win.appendChild(list);
    var cancelPos = -1;
    if (cancel != null) opts.forEach(function (o, k) { if (o.index === cancel) cancelPos = k; });
    openOverlay(win, { kind: 'choice', back: cancelPos >= 0 ? function () { closeOverlay(); sfx('ui', 'cancel'); answer(cancelPos); } : null, keepText: true });
    live('Choose: ' + opts.map(function (o) { return o.text; }).join(', '));
  }

  // ---------------------------------------------------------------- party (Day 146 WSX.buildParty)
  function epsFor(chId) { var l = rulesList('eps_'); for (var i = 0; i < l.length; i++) if (l[i].chapter === chId) return l[i]; return null; }
  function bestGear(slot, weaponClass, tier) {
    var best = null;
    rulesList('eqp_').forEach(function (e) {
      if (e.slot !== slot) return;
      if (slot === 'weapon' && e.weaponClass && weaponClass && String(e.weaponClass).toLowerCase() !== String(weaponClass).toLowerCase()) return;
      var t = num(e.tier, 1);
      if (t > tier) return;
      if (!best || t > num(best.tier, 1) || (t === num(best.tier, 1) && num(e.price) > num(best.price))) best = e;
    });
    return best;
  }
  function slotsOf(members) {
    var slots = [];
    members.forEach(function (m, mi) {
      (m.equipment || []).forEach(function (eid) {
        var e = rulesRec(eid), lay = e && isObj(e.slotLayout) ? e.slotLayout : null, n = lay ? Math.max(0, Math.min(8, num(lay.count))) : 0;
        for (var i = 0; i < n; i++) slots.push({ mi: mi, eqp: eid, slot: i, links: (lay.links || []).filter(function (l) { return Array.isArray(l) && (l[0] === i || l[1] === i); }), used: false });
      });
    });
    return slots;
  }
  function placeMateria(members, matIds) {
    var slots = slotsOf(members);
    var mats = (matIds || []).map(rulesRec).filter(Boolean);
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
  function buildParty(chId, chars) {
    var prog = (G.b.charter.ruleset || {}).progression, eps = epsFor(chId);
    var level = eps ? num(eps.targetLevel, 1) : 10, tier = eps ? num(eps.gearTier, 1) : 1;
    var members = chars.map(rulesRec).filter(Boolean).slice(0, PARTY_MAX).map(function (c, i) {
      var eq = ['weapon', 'armor', 'accessory'].map(function (s) { return bestGear(s, c.weaponClass, tier); }).filter(Boolean).map(function (e) { return e.id; });
      var m = { chr: c.id, level: Math.max(1, Math.min(99, Math.round(level))), equipment: eq, materia: [], abilities: eps && Array.isArray(eps.abilities) ? eps.abilities.slice() : [], row: 'front' };
      if (prog === 'jobs') { var js = eps && Array.isArray(eps.jobSet) && eps.jobSet.length ? eps.jobSet : null; m.job = js ? js[i % js.length] : null; m.jobLevel = m.level; }
      if (prog === 'classes') { var cs = eps && Array.isArray(eps.classSet) && eps.classSet.length ? eps.classSet : null; m.cls = cs ? cs[i % cs.length] : null; }
      return m;
    });
    if (prog === 'materia') placeMateria(members, ownedMateria(chId));
    return members;
  }
  // The roster: the story's party (state.party) when it names anyone, else the first four characters in ID order, the
  // same default Day 146's expected party uses.
  function roster() {
    var ids = P.st && P.st.party && P.st.party.length ? P.st.party.slice() : rulesList('chr_').map(function (c) { return c.id; });
    return ids.filter(function (id) { return !!rulesRec(id); }).slice(0, PARTY_MAX);
  }
  function chapterTier() { var e = epsFor(P.st.chapter); return e ? num(e.gearTier, 1) : 1; }
  function ownedMateria(chId) {
    var at = G.chIdx[chId] != null ? G.chIdx[chId] : 0, seen = {}, out = [];
    G.chapters.forEach(function (c, i) { if (i > at) return; var e = epsFor(c.id); (e && e.materiaSet || []).forEach(function (m) { if (!seen[m] && rulesRec(m)) { seen[m] = 1; out.push(m); } }); });
    return out;
  }
  function gearChoices(slot, chr) {
    var c = rulesRec(chr), tier = chapterTier();
    return rulesList('eqp_').filter(function (e) {
      if (e.slot !== slot || num(e.tier, 1) > tier) return false;
      return !(slot === 'weapon' && e.weaponClass && c && c.weaponClass && String(e.weaponClass).toLowerCase() !== String(c.weaponClass).toLowerCase());
    });
  }
  // The party ENGINE_BATTLE fights with: buildParty for the chapter, then the person's own edits where they are still
  // valid (gear within the chapter's tier and the character's weapon class, materia the party owns, each stone once).
  function partyMembers() {
    var chId = P.st.chapter, ms = buildParty(chId, roster()), owned = ownedMateria(chId), used = {};
    var anyEdit = ms.some(function (m) { return isObj(P.shell.gear[m.chr]); });
    if (!anyEdit) return ms;
    ms.forEach(function (m) {
      var o = P.shell.gear[m.chr];
      if (!isObj(o)) return;
      if (isObj(o.equipment)) {
        ['weapon', 'armor', 'accessory'].forEach(function (slot) {
          if (!(slot in o.equipment)) return;
          var want = o.equipment[slot], ok = want === null || gearChoices(slot, m.chr).some(function (e) { return e.id === want; });
          if (!ok) return;
          m.equipment = m.equipment.filter(function (id) { var e = rulesRec(id); return e && e.slot !== slot; });
          if (want) m.equipment.push(want);
        });
      }
    });
    // Materia: the person's placements first, then any owned stone left over goes where buildParty would put it.
    var edited = ms.some(function (m) { return isObj(P.shell.gear[m.chr]) && Array.isArray(P.shell.gear[m.chr].materia); });
    if (edited) {
      ms.forEach(function (m) { m.materia = []; });
      var slots = slotsOf(ms);
      ms.forEach(function (m, mi) {
        var o = P.shell.gear[m.chr];
        (o && Array.isArray(o.materia) ? o.materia : []).forEach(function (pl) {
          if (!pl || owned.indexOf(pl.mat) < 0 || used[pl.mat]) return;
          var sl = slots.filter(function (s) { return s.mi === mi && s.eqp === pl.eqp && s.slot === pl.slot && !s.used; })[0];
          if (!sl) return;
          sl.used = true; used[pl.mat] = 1;
          m.materia.push({ eqp: pl.eqp, slot: pl.slot, mat: pl.mat, ap: 0 });
        });
      });
    } else {
      ms.forEach(function (m) { m.materia = []; });
      placeMateria(ms, owned);
    }
    return ms;
  }
  // Stats for the menus come from ENGINE_BATTLE itself: a battle is set up (never run) and the party's units read back.
  function partyStats() {
    var ms = partyMembers(), key = canon(ms) + '|' + P.st.chapter;
    if (P.statusMemo && P.statusMemo.key === key) return P.statusMemo.units;
    var trp = rulesList('trp_').filter(function (t) { return t.chapter === P.st.chapter; })[0] || rulesList('trp_')[0], units = [];
    try {
      var S = EB.init({ ruleset: G.b.charter.ruleset, records: G.b.rules, party: ms, troopId: trp ? trp.id : null, weatherId: null }, 1, { waitMode: true });
      units = S.units.filter(function (u) { return u.side === 'party'; });
    } catch (e) { units = []; }
    P.statusMemo = { key: key, units: units };
    return units;
  }

  // ---------------------------------------------------------------- battles (Day 147 ART:BATTLE session, Day 146 engine)
  var BT = null;
  function troopIsBoss(trp) { var t = rulesRec(trp); return !!(t && Array.isArray(t.members) && t.members.some(function (m) { var e = m && rulesRec(m.enm); return e && e.isBoss; })); }
  function battleBackground(o) {
    if (o.zone && o.zone.background && artRec(o.zone.background)) return artRec(o.zone.background);
    var m = curMap(), bz = G.b.world.zones && Array.isArray(G.b.world.zones.bosses) ? G.b.world.zones.bosses.filter(function (z) { return z.troop === o.trp; })[0] : null;
    if (bz && bz.background && artRec(bz.background)) return artRec(bz.background);
    if (m && m.kind !== 'overworld') return bySubject('bgd_', 'role', 'interior:' + (m.kind === 'town' ? 'town' : 'dungeon')) || bySubject('bgd_', 'role', 'interior:dungeon');
    if (m) { var i = P.shell.y * m.w + P.shell.x, til = WD.ow.ground[i], tr = til && artRec(String(til).split(':')[0]); if (tr && tr.key) { var bg = bySubject('bgd_', 'role', 'biome:' + tr.key); if (bg) return bg; } }
    return bySubject('bgd_', 'role', 'biome:grassland') || artList('bgd_')[0] || null;
  }
  function statusIcons() { var out = {}; artList('ico_').forEach(function (i) { if (i.subject && i.subject.kind === 'sta') out[i.subject.ref] = i.id; }); return out; }
  function startBattle(o) {
    stopWalking();
    closeOverlay();
    var prev = P.mode;
    P.mode = 'battle';
    var party = partyMembers(), weatherId = o.zone && o.zone.weather ? o.zone.weather : null;
    var seed = (hash32(G.slug + '|' + P.shell.steps + '|' + o.trp + '|' + (P.battles = (P.battles || 0) + 1)) % 2147483646) + 1;
    var data = { ruleset: G.b.charter.ruleset, records: G.b.rules, party: party, troopId: o.trp, weatherId: weatherId };
    var S;
    try { S = EB.init(data, seed, { waitMode: true }); } catch (e) {
      P.faults.push({ code: 'battle', message: e.message });
      P.mode = prev === 'battle' ? 'field' : prev;
      o.done('win');
      return;
    }
    var wov = weatherId ? bySubject('wov_', 'wth', weatherId) : null;
    var pres = ER.createPresenter({ art: G.b.art, cache: G.cache, ctx: UI.ctx, w: G.W, h: G.H, snapshot: S, pacing: 'wait', speed: SET.speed, cue: battleCue,
      layout: { partySide: 'right' }, entries: G.ent, bgd: battleBackground(o), wov: wov, ui: { window: G.kit.window, font: G.kit.font, cursor: G.kit.cursor }, seed: seed, icons: statusIcons() });
    var tickRate = num(((G.b.charter.ruleset || {}).battle || {}).tickRate, 30);
    BT = { o: o, S: S, P: pres, acc: 0, ended: false, auto: SET.autoBattle || !!P.botAuto, menuKey: '', level: 'root', cmd: null, abl: null, tickRate: tickRate, endT: 0, canEscape: o.canEscape !== false };
    playMusic(troopIsBoss(o.trp) ? 'boss' : 'battle', true);
    live('Battle! ' + S.units.filter(function (u) { return u.side === 'foe'; }).map(function (u) { return u.name; }).join(', '));
  }
  function battleGive(input) {
    if (!BT || BT.S.result) return false;
    var r = EB.advance(BT.S, input);
    var rej = (r.events || []).filter(function (e) { return e.type === 'miss' && e.value === 'rejected'; })[0];
    if (rej) { toast(rej.name || 'That command was rejected.'); sfx('ui', 'error'); return false; }
    BT.S = r.state; BT.P.feed(r.events || [], r.state);
    return true;
  }
  function awaiting() { return BT && !BT.S.result ? BT.S.awaiting : null; }
  function battleStep(dt) {
    var s = BT;
    dt = Math.max(0, Math.min(100, dt));
    s.P.update(dt);
    var S0 = s.S;
    if (S0.result) {
      if (!s.ended && s.P.isIdle()) { s.ended = true; s.endT = 0; closeOverlay(); }
      if (s.ended) { s.endT += dt; if (s.endT > 700) endBattle(S0.result.outcome); }
      return;
    }
    if (!s.P.isIdle()) return;
    if (S0.awaiting) {
      if (s.auto) { var sug = EB.suggest(S0, null); if (sug && sug.type === 'flee' && !s.canEscape) sug = null; if (sug && battleGive(sug)) return; }
      if (S0.waitMode || S0.sched !== 'atb') { battleMenu(); return; }
    }
    if (S0.sched === 'atb') {
      s.acc += dt * SET.speed * s.tickRate / 1000;
      var n = Math.floor(s.acc);
      if (n < 1) return;
      s.acc -= n;
      var r = EB.advance(S0, { type: 'step', ticks: n });
      s.S = r.state; s.P.feed(r.events || [], r.state);
    } else {
      s.acc += dt * SET.speed;
      if (s.acc < 380) return;
      s.acc = 0;
      var r2 = EB.advance(S0, { type: 'step', ticks: 1 });
      s.S = r2.state; s.P.feed(r2.events || [], r2.state);
    }
  }
  function endBattle(outcome) {
    var s = BT;
    BT = null;
    closeOverlay();
    var o = s.o;
    if (o.source === 'encounter') {
      if (outcome === 'win') {
        var gil = 0, t = rulesRec(o.trp);
        (t && t.members || []).forEach(function (m) { var e = rulesRec(m.enm); gil += e ? num(e.gil, 0) : 0; });
        if (gil) { P.shell.purse.gil += gil; toast('Victory! ' + gil + ' gil.'); }
        P.shell.safe = 8;
      }
    }
    P.mode = 'event';
    var lose = outcome === 'lose' || outcome === 'timeout';
    if (o.source === 'encounter') {
      if (lose) { gameOver(); return; }
      P.mode = 'field';
      playMusic(P.storyMusic && P.storyMusic !== 'stop' ? P.storyMusic : locationMusic());
      o.done(outcome);
      afterQuiet();
      return;
    }
    playMusic(P.storyMusic && P.storyMusic !== 'stop' ? P.storyMusic : locationMusic());
    o.done(outcome);
  }
  // The command menu, a port of Day 147 WS:BATTLE menuFor: root commands, then abilities, then targets. Escape is offered
  // only when the story's question allows it (canEscape), as Day 149's contract requires.
  function battleMenu() {
    var aw = awaiting();
    if (!aw || BT.auto) return;
    var key = aw.actor + '|' + aw.commands.map(function (c) { return c.key + ':' + c.abls.map(function (x) { return x.id + (x.ok ? 1 : 0); }).join(','); }).join(';') + '|' + aw.targets.foe.join(',') + '|' + aw.targets.party.join(',');
    if (UI.overlay && UI.overlay.kind === 'battle' && BT.menuKey === key) return;
    if (BT.menuKey.split('|')[0] !== key.split('|')[0]) { BT.level = 'root'; BT.cmd = null; BT.abl = null; }
    BT.menuKey = key;
    paintBattleMenu();
  }
  function paintBattleMenu() {
    var aw = awaiting();
    if (!aw) { closeOverlay(); return; }
    var disp = BT.P.display() || {}, who = disp[aw.actor] || {}, win = el('div', 'sg-win sg-win-battle'), head = el('div', 'sg-head'), grid = el('div', 'sg-grid sg-scroll');
    var cmd = BT.cmd ? aw.commands.filter(function (c) { return c.key === BT.cmd; })[0] : null;
    if (BT.level !== 'root' && !cmd) BT.level = 'root';
    head.appendChild(el('h3', '', esc(who.name || aw.actor) + (cmd && BT.level !== 'root' ? ' &middot; ' + esc(cmd.label) : '')));
    var right = el('div', 'sg-btns');
    right.style.marginTop = '0';
    var autoB = el('button', 'sg-back', 'Auto'); autoB.type = 'button'; autoB.setAttribute('aria-label', 'Auto battle'); autoB.addEventListener('click', function () { BT.auto = true; closeOverlay(); toast('Auto battle on. Open the menu to stop it.'); });
    right.appendChild(autoB);
    head.appendChild(right);
    win.appendChild(head);
    win.appendChild(grid);
    function fire(x, uid) {
      var tgt = uid || (x.side === 'ally' ? aw.targets.party[0] : aw.targets.foe[0]);
      closeOverlay();
      if (battleGive({ type: 'command', actor: aw.actor, abl: x.id, target: tgt })) sfx('ui', 'confirm');
      BT.level = 'root'; BT.cmd = null; BT.P.setCursor(null); BT.menuKey = '';
    }
    var back = null;
    if (BT.level === 'root') {
      BT.P.setCursor(aw.actor);
      aw.commands.forEach(function (c) {
        if (c.key === 'flee') {
          if (!BT.canEscape) return;
          grid.appendChild(item('Flee', '', function () { closeOverlay(); BT.menuKey = ''; battleGive({ type: 'flee', actor: aw.actor }); }));
          return;
        }
        grid.appendChild(item(c.label, c.abls.length > 1 ? c.abls.length + ' abilities' : (c.abls[0] && c.abls[0].mp ? c.abls[0].mp + ' MP' : ''), function () {
          BT.cmd = c.key;
          if (c.abls.length === 1) { BT.abl = c.abls[0].id; BT.level = 'targets'; if (c.abls[0].side === 'self') { fire(c.abls[0], null); return; } } else BT.level = 'abls';
          sfx('ui', 'move');
          paintBattleMenu();
        }, { disabled: !c.abls.some(function (x) { return x.ok; }) }));
      });
    } else if (BT.level === 'abls') {
      back = function () { BT.level = 'root'; BT.abl = null; paintBattleMenu(); };
      cmd.abls.forEach(function (x) {
        grid.appendChild(item(x.name, (x.mp ? x.mp + ' MP' : 'Free') + (x.scope === 'all' ? ' | all' : ''), function () { BT.abl = x.id; if (x.side === 'self') { fire(x, null); return; } BT.level = 'targets'; paintBattleMenu(); }, { disabled: !x.ok }));
      });
    } else {
      var ab = cmd.abls.filter(function (x) { return x.id === BT.abl; })[0];
      if (!ab) { BT.level = 'root'; paintBattleMenu(); return; }
      back = function () { BT.level = cmd.abls.length > 1 ? 'abls' : 'root'; BT.abl = null; paintBattleMenu(); };
      var order = ab.side === 'ally' ? ['party', 'foe'] : ['foe', 'party'];
      if (ab.scope === 'all') {
        order.forEach(function (side) { if (aw.targets[side].length) grid.appendChild(item(side === 'foe' ? 'All foes' : 'All allies', plural(aw.targets[side].length, 'target'), function () { fire(ab, aw.targets[side][0]); })); });
      } else {
        order.forEach(function (side) {
          aw.targets[side].forEach(function (uid) {
            var d = disp[uid] || {}, b = item(d.name || uid, (d.hpTarget != null ? d.hpTarget : '') + (d.maxHp ? ' / ' + d.maxHp : ''), function () { fire(ab, uid); });
            ['focus', 'pointerenter'].forEach(function (n) { b.addEventListener(n, function () { BT.P.setCursor(uid); }); });
            grid.appendChild(b);
          });
        });
      }
    }
    openOverlay(win, { kind: 'battle', back: back });
  }
  // Presenter cues to sounds: Day 147 ART:AUDIO resolve, kept to what the shell plays.
  var cueMemo = {};
  function battleCue(kind, id, opts) {
    opts = opts || {};
    if (kind === 'music') { if (id === 'stop') stopMusic(400); else playMusic(String(id), true); return; }
    if (kind === 'ui') { sfx('ui', id); return; }
    if (kind !== 'sfx') return;
    var abl = cueMemo.abl ? rulesRec(cueMemo.abl) : null;
    if (id === 'action') { cueMemo.abl = opts.abl || null; cueMemo.element = opts.element || null; cueMemo.item = false; return; }
    if (id === 'item') { cueMemo.abl = opts.abl || null; cueMemo.element = null; cueMemo.item = true; sfx('sfx', 'item'); return; }
    var magic = abl && /magic|heal|limit|enemy/.test(String(abl.kind || ''));
    if (id === 'cast') { if (!cueMemo.item) sfx('sfx', magic || cueMemo.element ? 'cast' : 'swing'); return; }
    if (id === 'release') {
      if (cueMemo.item || !(magic || cueMemo.element)) return;
      var own = abl ? bySubject('sfx_', 'abl', abl.id) : null, elx = cueMemo.element ? bySubject('sfx_', 'element', cueMemo.element) : null;
      if (own || elx) playSfxId((own || elx).id); else sfx('sfx', 'release');
      return;
    }
    sfx('sfx', id);
  }

  // ---------------------------------------------------------------- random encounters (Day 148 zones)
  function zoneHere(m, x, y) {
    if (m.kind === 'overworld') {
      var ow = m.ow, i = y * m.w + x, k = ow.region[i], reg = k >= 0 ? ow.regions[k] : null;
      if (!reg) return null;
      var til = String(ow.ground[i] || '').split(':')[0];
      return WD.zonesField[reg.chapter + '|' + til] || null;
    }
    return WD.zonesMap[m.id] || null;
  }
  function encounterCell(m, x, y) {
    if (m.kind === 'overworld') { var i = y * m.w + x, r = m.ow.deco[i] || m.ow.ground[i]; return !!((m.ow.flags[r] | 0) & 2) && !onShip(m, x, y); }
    return !!(ET.flagsAt(G.b.art, m, x, y) & ET.FLAGS.encounter);
  }
  function rollEncounter(m, x, y) {
    if (!SET.encounters || P.shell.safe > 0 || P.botNoEncounters) return false;
    if (m.kind === 'town' || !encounterCell(m, x, y)) return false;
    var z = zoneHere(m, x, y);
    if (!z || !z.rate || !z.troops || !z.troops.length) return false;
    var roll = hash32(G.slug + '|enc|' + P.shell.steps + '|' + x + ',' + y) % 256;
    if (roll >= z.rate) return false;
    var total = 0, pick = null;
    z.troops.forEach(function (t) { total += Math.max(0, num(t.weight, 1)); });
    var r2 = total > 0 ? hash32(G.slug + '|trp|' + P.shell.steps) % total : 0;
    z.troops.forEach(function (t) { if (pick) return; r2 -= Math.max(0, num(t.weight, 1)); if (r2 < 0) pick = t.troop; });
    pick = pick || z.troops[0].troop;
    if (!rulesRec(pick)) return false;
    var t = rulesRec(pick);
    FX.flash = { t: 0, ms: 420 };
    sfx('ui', 'ready');
    startBattle({ trp: pick, canEscape: !(t.flags && t.flags.noEscape), canLose: false, source: 'encounter', zone: z, done: function () {} });
    return true;
  }

  // ---------------------------------------------------------------- audio (ENGINE_AUDIO, started by the first gesture)
  var AU = { a: null, ctx: null, want: null, err: null };
  function audioUnlock() {
    if (AU.a) { try { AU.a.unlock(); } catch (e) { /* ok */ } return; }
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C || !G.b) return;
    try {
      AU.ctx = new C();
      var coarse = false;
      try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { coarse = false; }
      AU.a = EA.create(AU.ctx, { coarse: coarse, navigator: window.navigator, createAudioElement: function () { return document.createElement('audio'); }, lookaheadMs: G.b.art.settings && G.b.art.settings.lookaheadMs });
      AU.a.attachLifecycle(document);
      AU.a.load(G.b.art);
      AU.a.setVolume({ music: SET.music, sfx: SET.sfxVol, muted: SET.muted });
      AU.a.unlock();
      if (AU.want) { var w = AU.want; AU.want = null; if (w.track) playTrack(w.track); else if (w.role) playMusic(w.role, true); }
    } catch (e) { AU.err = e.message; AU.a = null; }
  }
  function playMusic(role, force) {
    if (!role) return;
    AU.role = role;
    if (!AU.a) { AU.want = { role: role }; return; }
    try { AU.a.playRole(role, { restart: !!force }); } catch (e) { /* a missing role is silence */ }
  }
  function playTrack(id) { if (!AU.a) { AU.want = { track: id }; return; } AU.role = id; try { AU.a.playTrack(id, {}); } catch (e) { /* silence */ } }
  function stopMusic(ms) { AU.role = null; AU.want = null; if (AU.a) try { AU.a.stop(ms || 0); } catch (e) { /* ok */ } }
  function playSfxId(id) { if (AU.a && artRec(id)) try { AU.a.playSfx(id); } catch (e) { /* ok */ } }
  function sfx(kind, id) {
    if (!AU.a) return;
    var key = kind === 'ui' ? 'ui.' + id : id, link = G.kit.touch && isObj(G.kit.touch.sfx) ? G.kit.touch.sfx : {};
    var r = kind === 'ui' && link[id] && artRec(link[id]) ? artRec(link[id]) : bySubject('sfx_', 'role', 'sfx:' + key);
    if (r) try { AU.a.playSfx(r.id); } catch (e) { /* ok */ }
  }
  function locationMusic() {
    var m = curMap();
    if (!m) return null;
    if (m.kind === 'town') return 'town';
    if (m.kind !== 'overworld') return 'dungeon';
    var c = continentAt(P.shell.x, P.shell.y), want = c ? 'field:' + c.continent : null;
    if (want && G.roles.indexOf(want) >= 0) return want;
    var ch = G.chapters[G.chIdx[P.st.chapter] || 0], reg = (WD.owRec.regions || []).filter(function (r) { return r.chapter === (ch && ch.id); })[0];
    if (reg && G.roles.indexOf('field:' + reg.continent) >= 0) return 'field:' + reg.continent;
    return G.roles.filter(function (r) { return r.indexOf('field:') === 0; })[0] || 'town';
  }

  // ---------------------------------------------------------------- saves
  function saveKey(slot) { return 'saga150:' + G.slug + ':' + slot; }
  function snapshot() {
    syncShell();
    var story = ES.save.toSave(P.st, G.game.idx);
    if (story.error) return { error: story.error };
    return { format: 'saga-save', v: 1, game: G.slug, title: G.title, bundleId: (G.b.kit && G.b.kit.bundleId) || null, at: new Date().toISOString(),
      chapter: chapterName(P.st.chapter), place: placeName(curMap()), story: story, shell: copy(P.shell) };
  }
  function saveTo(slot) {
    if (P.mode !== 'field' && P.mode !== 'menu') return { error: 'Save between events.' };
    var s = snapshot();
    if (s.error) return s;
    if (!store(saveKey(slot), JSON.stringify(s))) return { error: 'This browser would not keep the save. Download it instead.' };
    return s;
  }
  function autosave() { if (P.st && !P.st.run && !P.st.ending && (P.mode === 'field' || P.mode === 'event')) { var s = snapshot(); if (!s.error) store(saveKey('auto'), JSON.stringify(s)); } }
  function readSlot(slot) { var raw = load(saveKey(slot)); if (!raw) return null; try { var s = JSON.parse(raw); return isObj(s) && s.format === 'saga-save' ? s : null; } catch (e) { return null; } }
  function allSlots() { return ['auto'].concat(SLOTS).map(function (k) { return { slot: k, save: readSlot(k) }; }); }
  function newest() { var best = null; allSlots().forEach(function (x) { if (x.save && (!best || x.save.at > best.save.at)) best = x; }); return best; }
  function restore(save) {
    if (!isObj(save) || save.format !== 'saga-save' || !isObj(save.story)) return 'That is not a save for this game.';
    if (save.game && save.game !== G.slug) return 'That save belongs to ' + (save.title || 'another game') + '.';
    var st;
    try { st = ES.save.fromSave(save.story, G.game.idx); } catch (e) { return 'The save could not be read: ' + e.message; }
    var sh = isObj(save.shell) ? save.shell : {}, base = freshShell();
    keys(base).forEach(function (k) { if (sh[k] === undefined) sh[k] = base[k]; });
    if (!worldRec(sh.map) || !mapData(sh.map)) { sh.map = base.map; sh.x = base.x; sh.y = base.y; }
    P.st = st; P.shell = sh; P.actors = {}; P.statusMemo = null; P.storyMusic = null; P.enterPending = null; P.played = []; BT = null; IX = null;
    makeWalker();
    closeOverlay();
    TXT.cur = null; FX.fade = 0;
    P.mode = 'field';
    playMusic(locationMusic(), true);
    banner(placeName(curMap()));
    return null;
  }
  function downloadSave() {
    var s = snapshot();
    if (s.error) { toast(s.error); return; }
    var blob = new Blob([JSON.stringify(s, null, 1)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = G.slug.replace(/-[a-z0-9_]+$/, '') + '-save-' + s.at.slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); detach(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    toast('Save downloaded.');
  }
  function pickSaveFile(then) {
    var inp = UI.file;
    inp.value = '';
    inp.onchange = function () {
      var f = inp.files && inp.files[0];
      if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { var s = null; try { s = JSON.parse(String(rd.result)); } catch (e) { s = null; } then(s); };
      rd.readAsText(f);
    };
    inp.click();
  }

  // ---------------------------------------------------------------- screens: title, new game, game over, ending
  function title() {
    stopWalking();
    closeOverlay();
    P.mode = 'title';
    P.titleT = 0;
    playMusic('title', true);
    var win = el('div', 'sg-win sg-win-title'), list = el('div', 'sg-list sg-scroll'), nw = newest();
    if (nw) list.appendChild(item('Continue', nw.save.chapter || '', function () { var e = restore(nw.save); if (e) toast(e); }));
    list.appendChild(item('New Game', '', function () { newGame(); }));
    if (allSlots().some(function (x) { return x.save; })) list.appendChild(item('Load Game', '', function () { slotsMenu('load', title); }));
    list.appendChild(item('Load a save file', '', function () { pickSaveFile(function (s) { var e = restore(s); if (e) toast(e); }); }));
    list.appendChild(item('Settings', '', function () { settingsMenu(title); }));
    win.appendChild(list);
    openOverlay(win, { kind: 'title', back: null });
    var cr = el('div', 'sg-credit', 'Made with <a href="' + PORTFOLIO + '" target="_blank" rel="noopener">Saga Studio</a> (AppADay 150)');
    UI.overlay.extra = cr;
    UI.layer.appendChild(cr);
  }
  function newGame() {
    closeOverlay();
    P.st = ES.state.create(G.game.idx, {});
    P.shell = freshShell();
    P.actors = {}; P.statusMemo = null; P.storyMusic = null; P.faults = []; P.played = []; P.lastAuto = null;
    makeWalker();
    FX.fade = 1; FX.fadeFrom = 1; FX.fadeTo = 0; FX.fadeMs = 700; FX.fadeT = 0; FX.after = null;
    banner(placeName(curMap()));
    begin({ kind: 'new', st0: null });
  }
  function gameOver() {
    stopWalking();
    P.mode = 'gameover';
    P.endT = 0;
    playMusic('defeat', true);
    var win = el('div', 'sg-win sg-win-title'), list = el('div', 'sg-list sg-scroll'), nw = newest();
    win.appendChild(el('h2', '', 'The journey ends here'));
    if (nw) list.appendChild(item('Continue from ' + (nw.slot === 'auto' ? 'the last autosave' : 'slot ' + nw.slot), nw.save.place || '', function () { var e = restore(nw.save); if (e) toast(e); }));
    list.appendChild(item('Return to title', '', function () { title(); }));
    win.appendChild(list);
    openOverlay(win, { kind: 'gameover', back: null });
    live('Game over.');
  }
  function ending() {
    stopWalking();
    P.mode = 'ending';
    P.endT = 0;
    var end = storyRec(P.st.ending) || {};
    P.endInfo = { name: end.name || 'The End', lines: Array.isArray(end.epilogue) ? end.epilogue : [], time: fmtTime(P.shell.playMs) };
    var win = el('div', 'sg-win sg-win-title'), list = el('div', 'sg-list sg-scroll');
    list.appendChild(item('Return to title', '', function () { title(); }));
    win.appendChild(list);
    openOverlay(win, { kind: 'ending', back: null });
    live('The end: ' + P.endInfo.name + '. ' + P.endInfo.lines.join(' '));
  }
  function innFlow(npc) {
    var name = shortName(npc.name || 'Innkeeper');
    begin({ kind: 'local', local: [{ kind: 'text', speaker: npc.id, lines: ['Welcome, travelers. A bed for the night, and your journey written in the ledger?'] }], done: function () {
      var win = el('div', 'sg-win sg-win-right'), list = el('div', 'sg-list');
      list.appendChild(item('Rest and save', '', function () {
        closeOverlay();
        FX.fadeFrom = 0; FX.fadeTo = 1; FX.fadeMs = 400; FX.fadeT = 0;
        FX.after = function () { FX.fadeFrom = 1; FX.fadeTo = 0; FX.fadeMs = 500; FX.fadeT = 0; FX.after = null; slotsMenu('save', null); };
      }));
      list.appendChild(item('Not now', '', function () { closeOverlay(); }));
      win.appendChild(list);
      openOverlay(win, { kind: 'inn', back: function () { closeOverlay(); } });
      live(name + ' asks if you will rest.');
    } });
  }

  // ---------------------------------------------------------------- the main menu (Status, Equip and Materia, Items, ...)
  function item(label, sub, fn, o) {
    o = o || {};
    var b = el('button', 'sg-item', '<span>' + esc(label) + '</span>' + (sub ? '<small>' + esc(sub) + '</small>' : ''));
    b.type = 'button';
    if (o.disabled) b.disabled = true;
    b.addEventListener('click', function () { if (!b.disabled) { audioUnlock(); fn(); } });
    return b;
  }
  function backBtn(fn) { var b = el('button', 'sg-back', 'Back'); b.type = 'button'; b.setAttribute('aria-label', 'Back'); b.addEventListener('click', fn); return b; }
  function panel(titleText, back) {
    var win = el('div', 'sg-win sg-win-full'), head = el('div', 'sg-head');
    head.appendChild(el('h2', '', esc(titleText)));
    if (back) head.appendChild(backBtn(back));
    win.appendChild(head);
    var body = el('div', 'sg-scroll');
    win.appendChild(body);
    return { win: win, body: body };
  }
  function openMenu() {
    if (P.mode !== 'field' || (P.walker && P.walker.moving)) return;
    stopWalking();
    P.mode = 'menu';
    sfx('ui', 'confirm');
    mainMenu();
  }
  function closeMenu() { closeOverlay(); if (P.mode === 'menu') P.mode = 'field'; }
  function mainMenu() {
    var held = heldKeys(), win = el('div', 'sg-win sg-win-center'), list = el('div', 'sg-list sg-scroll');
    var gil = num(P.st.gil, 0) + num(P.shell.purse.gil, 0);
    win.appendChild(el('p', 'sg-dim', esc(chapterName(P.st.chapter)) + ' &middot; ' + esc(placeName(curMap())) + '<br>' + gil + ' gil &middot; ' + fmtTime(P.shell.playMs)));
    list.appendChild(item('Status', '', function () { statusMenu(); }));
    list.appendChild(item('Equip and Materia', '', function () { equipMenu(0); }));
    list.appendChild(item('Items', '', function () { itemsMenu(); }));
    list.appendChild(item('Journal', '', function () { journalMenu(); }));
    if (held['vehicle:airship'] && curMap().kind === 'overworld') list.appendChild(item('Airship', '', function () { airshipMenu(); }));
    list.appendChild(item('Save', '', function () { slotsMenu('save', mainMenu); }));
    list.appendChild(item('Settings', '', function () { settingsMenu(mainMenu); }));
    list.appendChild(item('Return to title', '', function () { autosave(); title(); }));
    win.appendChild(list);
    openOverlay(win, { kind: 'menu', back: closeMenu });
  }
  function bar(cur, max, cls) { var p = max > 0 ? Math.round(100 * cur / max) : 0; return '<div class="sg-bar ' + (cls || '') + '"><i style="width:' + p + '%"></i></div>'; }
  function statusMenu() {
    var pn = panel('Status', mainMenu), units = partyStats(), eps = epsFor(P.st.chapter);
    if (!units.length) pn.body.appendChild(el('p', 'sg-dim', 'No one is in the party yet.'));
    units.forEach(function (u) {
      var c = rulesRec(u.ref) || {}, box = el('div', 'sg-member'), st = u.stats || {};
      box.innerHTML = '<div class="sg-member-top"><strong>' + esc(u.name) + '</strong><span class="sg-chip">Lv ' + u.level + '</span>' + (c.weaponClass ? '<span class="sg-chip">' + esc(c.weaponClass) + '</span>' : '') + '</div>' +
        '<div>HP ' + u.hp + ' / ' + u.maxHp + bar(u.hp, u.maxHp) + 'MP ' + u.mp + ' / ' + u.maxMp + bar(u.mp, u.maxMp, 'mp') + '</div>' +
        '<div class="sg-kv">' + ['str', 'mag', 'def', 'mdef', 'spd', 'luck'].filter(function (k) { return st[k] != null; }).map(function (k) { return '<span><b>' + k.toUpperCase() + '</b>' + st[k] + '</span>'; }).join('') + '</div>' +
        ((u.limits || []).length ? '<div class="sg-dim">Limit: ' + esc(u.limits.map(function (l) { return nameOf(l.abl || l.id); }).join(', ')) + '</div>' : '');
      pn.body.appendChild(box);
    });
    pn.body.appendChild(el('p', 'sg-note', esc('Levels follow the chapter: ' + chapterName(P.st.chapter) + ' expects level ' + (eps ? eps.targetLevel : '?') + '.')));
    openOverlay(pn.win, { kind: 'menu', back: mainMenu });
  }
  function equipMenu(mi) {
    var ids = roster();
    if (!ids.length) { toast('No one is in the party yet.'); return; }
    mi = clamp(mi || 0, 0, ids.length - 1);
    var chr = ids[mi], members = partyMembers(), m = members[mi], pn = panel('Equip and Materia', mainMenu);
    var tabs = el('div', 'sg-btns');
    ids.forEach(function (id, k) { var b = el('button', 'sg-back' + (k === mi ? ' sg-sel' : ''), esc(nameOf(id))); b.type = 'button'; b.setAttribute('aria-pressed', k === mi ? 'true' : 'false'); b.addEventListener('click', function () { equipMenu(k); }); tabs.appendChild(b); });
    pn.body.appendChild(tabs);
    function edit() { var o = P.shell.gear[chr]; if (!isObj(o)) o = P.shell.gear[chr] = {}; if (!isObj(o.equipment)) o.equipment = {}; return o; }
    ['weapon', 'armor', 'accessory'].forEach(function (slot) {
      var lab = el('label', 'sg-field'), sel = el('select', 'sg-select'), have = m.equipment.filter(function (id) { var e = rulesRec(id); return e && e.slot === slot; })[0] || '';
      lab.appendChild(el('span', '', slot.charAt(0).toUpperCase() + slot.slice(1)));
      sel.appendChild(new Option('(none)', ''));
      gearChoices(slot, chr).forEach(function (e) { var s = e.stats ? keys(e.stats).map(function (k) { return k + ' +' + e.stats[k]; }).join(', ') : ''; var lay = e.slotLayout ? ', ' + plural(num(e.slotLayout.count), 'slot') : ''; sel.appendChild(new Option(e.name + (s || lay ? ' (' + s + lay + ')' : ''), e.id)); });
      sel.value = have;
      sel.addEventListener('change', function () { edit().equipment[slot] = sel.value || null; P.statusMemo = null; equipMenu(mi); });
      lab.appendChild(sel);
      pn.body.appendChild(lab);
    });
    var prog = (G.b.charter.ruleset || {}).progression;
    if (prog === 'materia') {
      pn.body.appendChild(el('h3', '', 'Materia'));
      var slots = slotsOf([m]), owned = ownedMateria(P.st.chapter), placed = {};
      members.forEach(function (mm) { mm.materia.forEach(function (x) { placed[x.mat] = mm.chr; }); });
      if (!slots.length) pn.body.appendChild(el('p', 'sg-dim', 'This gear has no materia slots.'));
      slots.forEach(function (sl) {
        var lab = el('label', 'sg-field'), sel = el('select', 'sg-select'), cur = m.materia.filter(function (x) { return x.eqp === sl.eqp && x.slot === sl.slot; })[0];
        lab.appendChild(el('span', '', esc(nameOf(sl.eqp) + ', slot ' + (sl.slot + 1) + (sl.links.length ? ' (linked)' : ''))));
        sel.appendChild(new Option('(empty)', ''));
        owned.forEach(function (id) { var r = rulesRec(id), where = placed[id] && placed[id] !== chr ? ' (on ' + nameOf(placed[id]) + ')' : ''; sel.appendChild(new Option(r.name + ' [' + (r.kind || 'materia') + ']' + where, id)); });
        sel.value = cur ? cur.mat : '';
        sel.addEventListener('change', function () {
          // Editing materia freezes every member's current layout, so moving one stone never shuffles the others.
          members.forEach(function (mm) { var o = P.shell.gear[mm.chr]; if (!isObj(o)) o = P.shell.gear[mm.chr] = {}; if (!Array.isArray(o.materia)) o.materia = mm.materia.map(function (x) { return { eqp: x.eqp, slot: x.slot, mat: x.mat }; }); });
          var v = sel.value;
          members.forEach(function (mm) { var o = P.shell.gear[mm.chr]; o.materia = o.materia.filter(function (x) { return !(v && x.mat === v) && !(mm.chr === chr && x.eqp === sl.eqp && x.slot === sl.slot); }); });
          if (v) P.shell.gear[chr].materia.push({ eqp: sl.eqp, slot: sl.slot, mat: v });
          P.statusMemo = null;
          equipMenu(mi);
        });
        lab.appendChild(sel);
        pn.body.appendChild(lab);
      });
    }
    var row = el('div', 'sg-btns'), reset = el('button', 'sg-back', 'Optimize'); reset.type = 'button';
    reset.addEventListener('click', function () { P.shell.gear = {}; P.statusMemo = null; toast('Gear and materia set to the recommended layout.'); equipMenu(mi); });
    row.appendChild(reset);
    pn.body.appendChild(row);
    pn.body.appendChild(el('p', 'sg-note', 'Gear up to tier ' + chapterTier() + ' is yours this chapter. Optimize restores the layout the guild recommends.'));
    openOverlay(pn.win, { kind: 'menu', back: mainMenu });
  }
  function itemsMenu() {
    var pn = panel('Items', mainMenu), held = heldKeys(), any = false;
    var gil = num(P.st.gil, 0) + num(P.shell.purse.gil, 0);
    pn.body.appendChild(el('div', 'sg-row', '<span>Gil</span><strong>' + gil + '</strong>'));
    keys(P.st.items).forEach(function (id) { var q = num(P.st.items[id], 0); if (q > 0) { any = true; pn.body.appendChild(el('div', 'sg-row', '<span>' + esc(nameOf(id)) + '</span><span>x' + q + '</span>')); } });
    var keyItems = keys(held).filter(function (k) { return /^item:seal:|^vehicle:/.test(k); });
    if (keyItems.length) {
      pn.body.appendChild(el('h3', '', 'Key items'));
      keyItems.forEach(function (k) { var m = /^item:seal:(.*)$/.exec(k); pn.body.appendChild(el('div', 'sg-row', '<span>' + esc(m ? 'Seal of ' + chapterName(m[1]) : k === 'vehicle:ship' ? 'Ship' : 'Airship') + '</span><span class="sg-chip ok">held</span>')); });
    }
    var small = keys(P.shell.keys).filter(function (k) { return P.shell.keys[k]; });
    if (small.length) pn.body.appendChild(el('p', 'sg-dim', plural(small.length, 'small dungeon key') + ' in hand.'));
    if (!any && !keyItems.length) pn.body.appendChild(el('p', 'sg-dim', 'The pack is light for now.'));
    openOverlay(pn.win, { kind: 'menu', back: mainMenu });
  }
  function journalMenu() {
    var pn = panel('Journal', mainMenu), qs = G.game.idx.quests, any = false;
    keys(P.st.quests).forEach(function (id) {
      var q = P.st.quests[id], def = qs[id];
      if (!q || q.stage == null || !def) return;
      any = true;
      var at = def.stageAt ? def.stageAt[q.stage] : -1, st = def.stages[at] || {}, done = at === def.stages.length - 1;
      pn.body.appendChild(el('div', 'sg-row', '<span>' + esc(nameOf(id)) + '<br><span class="sg-dim">' + esc(st.label || q.stage) + '</span></span>' + (q.failed ? '<span class="sg-chip warn">failed</span>' : done ? '<span class="sg-chip ok">done</span>' : '<span class="sg-chip">active</span>')));
    });
    if (!any) pn.body.appendChild(el('p', 'sg-dim', 'No quests yet.'));
    openOverlay(pn.win, { kind: 'menu', back: mainMenu });
  }
  // The airship lands in front of any site whose chapter key the party holds (Day 148's rule: it reaches any land, and
  // every site entrance already needs its chapter key).
  function airshipMenu() {
    var pn = panel('Airship', mainMenu), held = heldKeys(), list = el('div', 'sg-list');
    (WD.owRec.sites || []).filter(function (s) { return s.role !== 'boss' && siteOpen(s, held) && Array.isArray(s.front); }).forEach(function (s) {
      list.appendChild(item(nameOf(s.site), chapterName(s.chapter), function () {
        closeOverlay(); P.mode = 'field';
        transfer({ map: WD.owRec.id, at: s.front.slice(), dir: 'down' }, { noStory: false });
        P.enterPending = null;
      }));
    });
    pn.body.appendChild(list);
    openOverlay(pn.win, { kind: 'menu', back: mainMenu });
  }
  function slotsMenu(mode, back) {
    var pn = panel(mode === 'save' ? 'Save' : 'Load', back || function () { closeOverlay(); if (P.mode === 'menu') P.mode = 'field'; });
    var list = el('div', 'sg-list');
    allSlots().forEach(function (x) {
      if (mode === 'save' && x.slot === 'auto') return;
      var s = x.save, label = x.slot === 'auto' ? 'Autosave' : 'Slot ' + x.slot, sub = s ? (s.chapter || '') + ' &middot; ' + fmtTime(s.shell && s.shell.playMs || 0) : 'Empty';
      var b = item(label, '', function () {
        if (mode === 'save') { var r = saveTo(x.slot); toast(r.error ? r.error : 'Saved to ' + label + '.'); if (!r.error) sfx('ui', 'confirm'); slotsMenu(mode, back); return; }
        if (!s) return;
        var e = restore(s); if (e) toast(e);
      }, { disabled: mode === 'load' && !s });
      b.querySelector('small') || b.appendChild(el('small', '', sub));
      list.appendChild(b);
    });
    pn.body.appendChild(list);
    var row = el('div', 'sg-btns');
    if (mode === 'save') { var d = el('button', 'sg-back', 'Download save file'); d.type = 'button'; d.addEventListener('click', downloadSave); row.appendChild(d); }
    else { var l = el('button', 'sg-back', 'Load a save file'); l.type = 'button'; l.addEventListener('click', function () { pickSaveFile(function (s) { var e = restore(s); if (e) toast(e); }); }); row.appendChild(l); }
    pn.body.appendChild(row);
    pn.body.appendChild(el('p', 'sg-note', 'Saves live in this browser. A downloaded save file plays in any copy of this game.'));
    if (mode === 'save' && P.mode !== 'menu') P.mode = 'menu';
    openOverlay(pn.win, { kind: 'menu', back: back || function () { closeOverlay(); if (P.mode === 'menu') P.mode = 'field'; } });
  }

  // ---------------------------------------------------------------- settings
  var SET = { music: 0.7, sfxVol: 0.8, muted: false, text: 'normal', pad: 'auto', encounters: true, speed: 1, autoBattle: false };
  var SET_KEY = 'saga150:settings';
  function loadSettings() { try { var s = JSON.parse(load(SET_KEY) || 'null'); if (isObj(s)) keys(SET).forEach(function (k) { if (s[k] !== undefined && typeof s[k] === typeof SET[k]) SET[k] = s[k]; }); } catch (e) { /* defaults */ } }
  function saveSettings() { store(SET_KEY, JSON.stringify(SET)); if (AU.a) AU.a.setVolume({ music: SET.music, sfx: SET.sfxVol, muted: SET.muted }); layout(); }
  function settingsMenu(back) {
    var pn = panel('Settings', back);
    function range(label, k) {
      var lab = el('label', 'sg-field'), r = el('input', 'sg-range');
      r.type = 'range'; r.min = '0'; r.max = '100'; r.value = String(Math.round(SET[k] * 100));
      lab.appendChild(el('span', '', label));
      r.addEventListener('input', function () { SET[k] = Number(r.value) / 100; saveSettings(); });
      lab.appendChild(r); return lab;
    }
    function pick(label, k, opts) {
      var lab = el('label', 'sg-field'), s = el('select', 'sg-select');
      lab.appendChild(el('span', '', label));
      opts.forEach(function (o) { s.appendChild(new Option(o[1], String(o[0]))); });
      s.value = String(SET[k]);
      s.addEventListener('change', function () { var v = s.value; SET[k] = typeof SET[k] === 'boolean' ? v === 'true' : typeof SET[k] === 'number' ? Number(v) : v; saveSettings(); });
      lab.appendChild(s); return lab;
    }
    pn.body.appendChild(range('Music volume', 'music'));
    pn.body.appendChild(range('Sound effects', 'sfxVol'));
    pn.body.appendChild(pick('Sound', 'muted', [[false, 'On'], [true, 'Muted']]));
    pn.body.appendChild(pick('Text speed', 'text', [['slow', 'Slow'], ['normal', 'Normal'], ['fast', 'Fast'], ['instant', 'Instant']]));
    pn.body.appendChild(pick('Battle speed', 'speed', [[0.75, 'Calm'], [1, 'Normal'], [1.5, 'Quick'], [2, 'Fastest']]));
    pn.body.appendChild(pick('Random battles', 'encounters', [[true, 'On'], [false, 'Off (story only)']]));
    pn.body.appendChild(pick('Touch controls', 'pad', [['auto', 'Automatic'], ['on', 'Always show'], ['off', 'Hide']]));
    pn.body.appendChild(el('p', 'sg-note', 'Keyboard: arrows or WASD to move, Enter, Space, or Z to confirm, Escape or X to cancel, M for the menu.'));
    openOverlay(pn.win, { kind: 'menu', back: back });
  }

  // ---------------------------------------------------------------- the page: canvas, overlays, toasts, layout
  var UI = { root: null, stage: null, cv: null, ctx: null, layer: null, pad: null, padCv: null, padCtx: null, toast: null, live: null, file: null, overlay: null, keys: null };
  function buildDom(host) {
    var root = el('div', 'sg');
    root.setAttribute('role', 'application');
    root.setAttribute('aria-label', 'Saga game');
    var main = el('div', 'sg-main'), stage = el('div', 'sg-stage'), cv = el('canvas', 'sg-cv');
    stage.tabIndex = 0;
    cv.setAttribute('aria-hidden', 'true');
    stage.appendChild(cv);
    var layer = el('div', 'sg-layer'), toastEl = el('div', 'sg-toast');
    toastEl.setAttribute('role', 'status');
    stage.appendChild(layer); stage.appendChild(toastEl);
    main.appendChild(stage);
    root.appendChild(main);
    var pad = el('div', 'sg-pad'), padCv = el('canvas', 'sg-pad-cv');
    padCv.setAttribute('aria-label', 'Touch controls: direction pad, A, B, and menu');
    pad.appendChild(padCv);
    root.appendChild(pad);
    var keysEl = el('div', 'sg-keys', '<kbd>&larr;</kbd><kbd>&uarr;</kbd><kbd>&darr;</kbd><kbd>&rarr;</kbd> move &middot; <kbd>Enter</kbd> confirm &middot; <kbd>Esc</kbd> back &middot; <kbd>M</kbd> menu &middot; <a href="' + PORTFOLIO + '" target="_blank" rel="noopener">AppADay</a>');
    root.appendChild(keysEl);
    var liveEl = el('div', 'sg-sr'); liveEl.setAttribute('aria-live', 'polite');
    root.appendChild(liveEl);
    var file = el('input'); file.type = 'file'; file.accept = '.json,application/json'; file.hidden = true;
    root.appendChild(file);
    host.appendChild(root);
    UI.root = root; UI.stage = stage; UI.cv = cv; UI.layer = layer; UI.toast = toastEl; UI.live = liveEl; UI.file = file; UI.pad = pad; UI.padCv = padCv; UI.keys = keysEl; UI.main = main;
  }
  function setupCanvas() {
    UI.cv.width = G.W; UI.cv.height = G.H;
    UI.ctx = UI.cv.getContext('2d');
    if (UI.ctx) UI.ctx.imageSmoothingEnabled = false;
    layout();
  }
  function padWanted() {
    if (SET.pad === 'on') return true;
    if (SET.pad === 'off') return false;
    var coarse = false;
    try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch (e) { coarse = false; }
    return coarse || window.innerWidth < 700;
  }
  function layout() {
    if (!UI.root) return;
    var vw = window.innerWidth || 1024, vh = window.innerHeight || 768, pad = padWanted();
    UI.root.classList.toggle('has-pad', pad);
    // With the controller the stage sits at the top and the controller takes the rest of the screen, at least 150 px tall.
    var minPad = pad ? 150 : 0, keysH = pad ? 0 : 34, availW = vw, availH = Math.max(120, vh - minPad - keysH - (pad ? 10 : 0));
    var k = Math.min(availW / G.W, availH / G.H);
    if (k >= 2) k = Math.floor(k);
    var w = Math.floor(G.W * k), h = Math.floor(G.H * k);
    UI.stage.style.width = w + 'px'; UI.stage.style.height = h + 'px';
    if (pad) {
      var pw = Math.min(vw, 560), ph = Math.max(minPad, Math.min(300, vh - h - 14)), lk = pw / G.W;
      UI.padCv.width = G.W; UI.padCv.height = Math.max(60, Math.round(ph / lk));
      UI.padCv.style.width = pw + 'px'; UI.padCv.style.height = ph + 'px';
      PAD.layout = EU.touch.layout(padScheme(), UI.padCv.width, UI.padCv.height, padSkin());
    }
    UI.root.style.setProperty('--u', (w / G.W).toFixed(3) + 'px');
    UI.scale = w / G.W;
    drawPad();
  }
  function openOverlay(node, o) {
    closeOverlay();
    o = o || {};
    UI.overlay = { node: node, kind: o.kind || 'menu', back: o.back || null, keepText: !!o.keepText, extra: null };
    UI.layer.appendChild(node);
    UI.root.classList.toggle('has-overlay', UI.overlay.kind !== 'battle');
    var all = focusables(), f = all.filter(function (x) { return !x.classList.contains('sg-back'); })[0] || all[0];
    if (f) { try { f.focus({ preventScroll: true }); } catch (e) { f.focus(); } }
  }
  function closeOverlay() {
    if (!UI.overlay) return;
    detach(UI.overlay.node);
    if (UI.overlay.extra) detach(UI.overlay.extra);
    UI.overlay = null;
    UI.root.classList.remove('has-overlay');
    if (UI.stage) try { UI.stage.focus({ preventScroll: true }); } catch (e) { /* ok */ }
  }
  function focusables() { return UI.overlay ? Array.prototype.slice.call(UI.overlay.node.querySelectorAll('button:not([disabled]), select, input')) : []; }
  function moveFocus(d) {
    var list = focusables();
    if (!list.length) return;
    var i = list.indexOf(document.activeElement);
    i = i < 0 ? 0 : (i + d + list.length) % list.length;
    try { list[i].focus({ preventScroll: false }); } catch (e) { list[i].focus(); }
    sfx('ui', 'move');
  }
  function overlayPress(btn) {
    var a = document.activeElement, inOverlay = UI.overlay && UI.overlay.node.contains(a);
    if (btn === 'up' || btn === 'left') { if (inOverlay && a.tagName === 'INPUT' && a.type === 'range' && btn === 'left') return; moveFocus(-1); return; }
    if (btn === 'down' || btn === 'right') { if (inOverlay && a.tagName === 'INPUT' && a.type === 'range' && btn === 'right') return; moveFocus(1); return; }
    if (btn === 'a') { if (inOverlay && a.tagName === 'BUTTON') a.click(); else { var f = focusables()[0]; if (f && f.tagName === 'BUTTON') f.click(); } return; }
    if (btn === 'b' || btn === 'menu') { if (UI.overlay && UI.overlay.back) { sfx('ui', 'cancel'); UI.overlay.back(); } else if (btn === 'menu' && UI.overlay && UI.overlay.kind === 'battle') { /* menu does nothing in battle */ } }
  }
  var toastT = 0;
  function toast(msg) { if (!UI.toast) return; UI.toast.textContent = msg; UI.toast.classList.add('is-on'); toastT = 2200; live(msg); }
  function live(msg) { if (UI.live) UI.live.textContent = msg; }
  function banner(text) { FX.banner = { text: text, t: 0 }; }
  function veil(html) {
    var v = el('div', 'sg-veil', html);
    if (UI.veil) detach(UI.veil);
    UI.veil = v;
    UI.stage.appendChild(v);
    return v;
  }
  function unveil() { if (UI.veil) { detach(UI.veil); UI.veil = null; } }

  // ---------------------------------------------------------------- input: keyboard, touch controller, stage pointer
  var IN = { keyHeld: null, padHeld: null, ptrHeld: null };
  var KEYS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
  var BTN = { Enter: 'a', ' ': 'a', z: 'a', Z: 'a', Escape: 'b', x: 'b', X: 'b', Backspace: 'b', m: 'menu', M: 'menu' };
  function held() { return IN.keyHeld || IN.padHeld || IN.ptrHeld || (P.autopilot ? P.autopilot.dir : null); }
  function stopWalking() { IN.keyHeld = null; IN.padHeld = null; IN.ptrHeld = null; if (P.autopilot) P.autopilot = null; }
  function press(btn) {
    audioUnlock();
    if (UI.veil && !UI.veil.dataset.passive) return;
    if (UI.overlay) { overlayPress(btn); return; }
    if (P.mode === 'event') { if (btn === 'a' || btn === 'b') { if (TXT.cur) advanceText(); } return; }
    if (P.mode === 'field') {
      if (btn === 'a') interact();
      else if (btn === 'menu' || btn === 'b') openMenu();
      return;
    }
    if (P.mode === 'battle') { if (btn === 'menu' || btn === 'b') { if (BT && BT.auto) { BT.auto = false; toast('Auto battle off.'); } } return; }
  }
  function onKeyDown(e) {
    var t = e.target, tag = t && t.tagName;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var inForm = tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA';
    if (inForm && e.key !== 'Escape') return;
    var dir = KEYS[e.key], btn = BTN[e.key];
    if (UI.overlay) {
      if (dir) { e.preventDefault(); press(dir); return; }
      if ((e.key === 'Enter' || e.key === ' ') && tag === 'BUTTON' && UI.overlay.node.contains(t)) return;
      if (btn) { e.preventDefault(); press(btn); }
      return;
    }
    if (dir) { e.preventDefault(); audioUnlock(); IN.keyHeld = dir; if (P.mode !== 'field') press(dir); return; }
    if (btn) { e.preventDefault(); if (!e.repeat) press(btn); }
  }
  function onKeyUp(e) { if (KEYS[e.key] && KEYS[e.key] === IN.keyHeld) IN.keyHeld = null; }
  var PAD = { layout: null, pressed: {}, ptrs: {} };
  function padScheme() { var s = G.kit.touch && G.kit.touch.scheme, ch = G.b && G.b.charter.specs && G.b.charter.specs.mobileControls; var ok = EU.SCHEMES; var v = ok.indexOf(s) >= 0 ? s : ok.indexOf(ch) >= 0 ? ch : 'dpad'; return v === 'tap' ? 'dpad' : v === 'hybrid' ? 'stick' : v; }
  // The Charter's skin, with controls sized to the controller area rather than to the game screen.
  function padSkin() { var s = {}, t = G.kit.touch || {}; keys(t).forEach(function (k) { s[k] = t[k]; }); var h = UI.padCv ? UI.padCv.height : 100; s.size = Math.round(Math.min(G.W * 0.4, h * 0.62)); return s; }
  function drawPad() {
    if (!UI.padCv || !PAD.layout || !UI.root.classList.contains('has-pad')) return;
    var c = UI.padCv.getContext && UI.padCv.getContext('2d');
    if (!c) return;
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, UI.padCv.width, UI.padCv.height);
    try { EU.touch.draw(c, PAD.layout, padSkin(), { pressed: PAD.pressed, entries: G.ent, font: G.kit.font || null }); } catch (e) { /* the pad stays blank */ }
  }
  function padHit(e) { var r = UI.padCv.getBoundingClientRect(); return EU.touch.hit(PAD.layout, (e.clientX - r.left) / (r.width || 1) * UI.padCv.width, (e.clientY - r.top) / (r.height || 1) * UI.padCv.height); }
  function padUpdate() {
    var dir = null, pressed = {};
    keys(PAD.ptrs).forEach(function (id) { var h = PAD.ptrs[id]; if (!h) return; if ((h.key === 'dpad' || h.key === 'stick') && h.dir) { dir = h.dir; pressed[h.key] = h.key === 'stick' ? { vx: h.vx, vy: h.vy } : h.dir; } else if (h.key !== 'dpad' && h.key !== 'stick') pressed[h.key] = true; });
    IN.padHeld = P.mode === 'field' && !UI.overlay ? dir : null;
    PAD.pressed = pressed;
    drawPad();
  }
  function bindPad() {
    var cv = UI.padCv;
    cv.addEventListener('pointerdown', function (e) {
      e.preventDefault(); audioUnlock();
      try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ok */ }
      var h = padHit(e);
      PAD.ptrs[e.pointerId] = h;
      if (h && (h.key === 'a' || h.key === 'b' || h.key === 'menu')) press(h.key);
      else if (h && h.dir && (UI.overlay || P.mode !== 'field')) press(h.dir);
      padUpdate();
    });
    cv.addEventListener('pointermove', function (e) {
      var old = PAD.ptrs[e.pointerId];
      if (!old) return;
      var h = padHit(e);
      if (h && (h.key === 'dpad' || h.key === 'stick')) { if (UI.overlay && h.dir && h.dir !== old.dir) press(h.dir); PAD.ptrs[e.pointerId] = h; padUpdate(); }
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) { cv.addEventListener(n, function (e) { delete PAD.ptrs[e.pointerId]; padUpdate(); }); });
  }
  // The stage itself: hold a finger on the map to walk toward it (Day 147's aim), tap to advance text, tap next to the
  // party to act on that cell.
  function bindStage() {
    var cv = UI.cv;
    function logical(e) { var r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / (r.width || 1) * G.W, (e.clientY - r.top) / (r.height || 1) * G.H]; }
    function aim(e) {
      if (P.mode !== 'field' || !P.walker) { IN.ptrHeld = null; return; }
      var p = logical(e), cam = camera(curMap()), T = G.T, w = P.walker;
      var dx = p[0] - (w.fx * T + T / 2 - cam.x), dy = p[1] - (w.fy * T + T / 2 - cam.y);
      if (Math.abs(dx) < T * 0.6 && Math.abs(dy) < T * 0.6) { IN.ptrHeld = null; return; }
      IN.ptrHeld = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
    }
    var down = null;
    cv.addEventListener('pointerdown', function (e) {
      audioUnlock();
      try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ok */ }
      down = { x: e.clientX, y: e.clientY, t: now() };
      if (P.mode === 'event') { press('a'); e.preventDefault(); return; }
      if (P.mode === 'field') { aim(e); e.preventDefault(); }
    });
    cv.addEventListener('pointermove', function (e) { if (down && P.mode === 'field') aim(e); });
    ['pointerup', 'pointercancel'].forEach(function (n) {
      cv.addEventListener(n, function (e) {
        var wasTap = down && n === 'pointerup' && now() - down.t < 260 && Math.abs(e.clientX - down.x) < 10 && Math.abs(e.clientY - down.y) < 10;
        IN.ptrHeld = null; down = null;
        if (!wasTap || P.mode !== 'field' || !P.walker || P.walker.moving) return;
        var p = logical(e), cam = camera(curMap()), T = G.T, cx = Math.floor((p[0] + cam.x) / T), cy = Math.floor((p[1] + cam.y) / T), w = P.walker;
        var d = Math.abs(cx - w.x) + Math.abs(cy - w.y);
        if (d === 1) { w.dir = cx > w.x ? 'right' : cx < w.x ? 'left' : cy > w.y ? 'down' : 'up'; interact(); }
        else if (d === 0) interact();
      });
    });
  }

  // ---------------------------------------------------------------- drawing
  var SPR = { party: null, walk: null };
  function leaderSprite() {
    var ids = roster(), lead = ids[0];
    if (SPR.lead === lead && SPR.party !== undefined) return SPR.party;
    var all = artList('spr_').filter(function (s) { return s.mode === 'field'; });
    var s = all.filter(function (x) { return x.subject && x.subject.kind === 'chr' && x.subject.ref === lead; })[0] || all.filter(function (x) { return x.kind === 'character'; })[0] || null;
    SPR.lead = lead; SPR.party = s;
    SPR.walk = s ? ER.anim.forSprite(G.b.art, s, 'walk') : null;
    return s;
  }
  function camera(m) {
    var T = G.T, w = P.walker, Wpx = m.w * T, Hpx = m.h * T, px = (w ? w.fx : 0) * T + T / 2, py = (w ? w.fy : 0) * T + T / 2;
    var cx = Wpx <= G.W ? (Wpx - G.W) / 2 : clamp(px - G.W / 2, 0, Wpx - G.W), cy = Hpx <= G.H ? (Hpx - G.H) / 2 : clamp(py - G.H / 2, 0, Hpx - G.H);
    return { x: Math.round(cx), y: Math.round(cy), w: G.W, h: G.H };
  }
  function drawShip(ctx, x, y) {
    var u = G.u;
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(x - 7 * u, y - 4 * u, 14 * u, 4 * u);
    ctx.fillStyle = '#7a5232'; ctx.fillRect(x - 6 * u, y - 6 * u, 12 * u, 2 * u);
    ctx.fillStyle = '#e8e2d0'; ctx.fillRect(x - 1 * u, y - 16 * u, 2 * u, 10 * u); ctx.fillRect(x + 1 * u, y - 15 * u, 5 * u, 6 * u);
  }
  function drawField(ctx, t) {
    var m = curMap(), T = G.T;
    if (!m) return;
    var cam = camera(m);
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, G.W, G.H);
    try { ET.drawMap(ctx, G.cache, m, cam, t); } catch (e) { /* a broken tile draws nothing */ }
    var sprites = [];
    (WD.npcsByMap[m.id] || []).forEach(function (n) {
      var at = actorPos(n), a = P.actors[n.id] || {};
      if (at[0] * T + T < cam.x || at[0] * T > cam.x + G.W + T || at[1] * T + T < cam.y || at[1] * T > cam.y + G.H + T * 2) return;
      sprites.push({ y: at[1], draw: function () { var x = at[0] * T + T / 2 - cam.x, y = at[1] * T + T - 1 - cam.y; if (n.sprite && artRec(n.sprite)) { try { ER.draw.sprite(ctx, G.cache, n.sprite, null, t, x, y, { dir: a.dir || n.facing || 'down', pose: 'stand' }); return; } catch (e) { /* marker below */ } } ctx.fillStyle = '#d8c070'; ctx.fillRect(x - 3, y - 10, 6, 10); } });
    });
    var w = P.walker, spr = leaderSprite();
    if (w) sprites.push({ y: w.fy + 0.01, draw: function () {
      var x = Math.round(w.fx * T + T / 2 - cam.x), y = Math.round(w.fy * T + T - 1 - cam.y), sea = onShip(m, Math.round(w.fx), Math.round(w.fy));
      if (sea) drawShip(ctx, x, y);
      if (spr) { try { ER.draw.sprite(ctx, G.cache, spr.id, w.moving || held() ? SPR.walk : null, w.walkT, x, sea ? y - 4 * G.u : y, { dir: w.dir, pose: 'stand' }); return; } catch (e) { /* marker below */ } }
      ctx.fillStyle = '#f0f0f0'; ctx.fillRect(x - 4, y - 12, 8, 12);
    } });
    sprites.sort(function (a, b) { return a.y - b.y; }).forEach(function (s) { s.draw(); });
    try { ET.drawMap(ctx, G.cache, m, cam, t, { layer: 'above' }); } catch (e) { /* fine */ }
  }
  function drawWindowText(ctx, t) {
    var tx = TXT.cur, u = G.u, font = G.font, line = font.line * u, padX = 8 * u, padY = 6 * u;
    if (!tx) return;
    var rows = 3, nameH = tx.name ? line : 0, h = rows * line + nameH + 2 * padY + 2 * u, x = 4 * u, y = G.H - h - 4 * u, w = G.W - 8 * u;
    EU.window(ctx, G.kit.window || null, x, y, w, h, { entries: G.ent, unit: u, open: tx.open });
    if (tx.open < 1) return;
    var ix = x + padX, iy = y + padY + u;
    if (tx.por) {
      try { var f = G.cache.portrait(tx.por, 'neutral'); if (f) { ER.draw.frame(ctx, f, ix, y + Math.round((h - f.h) / 2)); ix += f.w + 6 * u; } } catch (e) { /* no portrait */ }
    }
    var light = EU.color(G.kit.window && G.kit.window.light, G.ent, '#e8e8f0');
    if (tx.name) { EU.text(ctx, font, tx.name, ix, iy, { color: '#f0d070', shadow: '#000000', scale: u }); iy += line; }
    var page = tx.pages[tx.page], left = Math.floor(tx.shown);
    page.forEach(function (ln, i) {
      if (left <= 0) return;
      var s = ln.slice(0, left); left -= ln.length + 1;
      EU.text(ctx, font, s, ix, iy + i * line, { color: light, shadow: '#000000', scale: u });
    });
    if (tx.shown >= pageChars(tx) && Math.floor(t / 400) % 2 === 0 && !UI.overlay) {
      ctx.fillStyle = light;
      var ax = x + w - padX - 2 * u, ay = y + h - padY - 2 * u;
      ctx.fillRect(ax - 3 * u, ay - 3 * u, 7 * u, u); ctx.fillRect(ax - 2 * u, ay - 2 * u, 5 * u, u); ctx.fillRect(ax - u, ay - u, 3 * u, u); ctx.fillRect(ax, ay, u, u);
    }
  }
  function drawBanner(ctx) {
    var b = FX.banner;
    if (!b || P.mode === 'title' || P.mode === 'battle') return;
    var u = G.u, font = G.font, tw = EU.measure(font, b.text, u), w = tw + 16 * u, h = font.line * u + 10 * u, x = Math.round((G.W - w) / 2), y = 6 * u;
    var a = b.t < 200 ? b.t / 200 : b.t > 1600 ? Math.max(0, 1 - (b.t - 1600) / 300) : 1;
    if (a <= 0) return;
    ctx.globalAlpha = a;
    EU.window(ctx, G.kit.window || null, x, y, w, h, { entries: G.ent, unit: u });
    EU.text(ctx, font, b.text, x + 8 * u, y + 5 * u + u, { color: EU.color(G.kit.window && G.kit.window.light, G.ent, '#e8e8f0'), shadow: '#000000', scale: u });
    ctx.globalAlpha = 1;
  }
  function titleBg() { var t = G.kit.title, own = t && t.bg ? artRec(t.bg) : null; return own || bySubject('bgd_', 'role', 'biome:grassland') || artList('bgd_')[0] || null; }
  function drawTitle(ctx, t) {
    try { EU.title(ctx, G.kit.title || null, { entries: G.ent, w: G.W, h: G.H, unit: G.u, tMs: t, font: G.kit.font || null, bgd: titleBg(), text: G.title }); }
    catch (e) { ctx.fillStyle = '#080810'; ctx.fillRect(0, 0, G.W, G.H); EU.text(ctx, G.font, G.title, G.W / 2, G.H / 3, { color: '#f0d070', scale: 2 * G.u, align: 'center' }); }
  }
  function drawEnd(ctx, t, over) {
    ctx.fillStyle = over ? '#12060a' : '#05050c'; ctx.fillRect(0, 0, G.W, G.H);
    var u = G.u, font = G.font, cx = G.W / 2, a = Math.min(1, P.endT / 1200);
    ctx.globalAlpha = a;
    if (over) EU.text(ctx, font, 'GAME OVER', cx, Math.round(G.H * 0.18), { color: '#e86a5a', shadow: '#000', scale: 2 * u, align: 'center' });
    else {
      var info = P.endInfo || { name: 'The End', lines: [], time: '' }, y = Math.round(G.H * 0.08);
      EU.text(ctx, font, 'THE END', cx, y, { color: '#f0d070', shadow: '#000', scale: 2 * u, align: 'center' });
      y += font.line * u * 2 + 6 * u;
      EU.text(ctx, font, info.name, cx, y, { color: '#e8e8f0', shadow: '#000', scale: u, align: 'center' });
      y += font.line * u + 4 * u;
      info.lines.forEach(function (ln) { EU.wrap(font, ln, G.W - 24 * u, u).forEach(function (l2) { EU.text(ctx, font, l2, cx, y, { color: '#b8b8c8', scale: u, align: 'center' }); y += font.line * u; }); });
      EU.text(ctx, font, 'Play time ' + info.time, cx, y + 4 * u, { color: '#8888a0', scale: u, align: 'center' });
    }
    ctx.globalAlpha = 1;
  }
  function draw(t) {
    var ctx = UI.ctx;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    if (P.mode === 'boot') { ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, G.W, G.H); return; }
    if (P.mode === 'title') drawTitle(ctx, t);
    else if (P.mode === 'battle' && BT) { try { BT.P.draw(); } catch (e) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, G.W, G.H); } }
    else if (P.mode === 'ending') drawEnd(ctx, t, false);
    else if (P.mode === 'gameover') drawEnd(ctx, t, true);
    else { drawField(ctx, t); drawBanner(ctx); }
    if (FX.fade > 0) { ctx.globalAlpha = clamp(FX.fade, 0, 1); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, G.W, G.H); ctx.globalAlpha = 1; }
    if (FX.flash) { var p = FX.flash.t / FX.flash.ms; ctx.globalAlpha = Math.max(0, 0.7 * (1 - p)); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, G.W, G.H); ctx.globalAlpha = 1; }
    if (P.mode === 'event' || (UI.overlay && UI.overlay.keepText)) drawWindowText(ctx, t);
  }

  // ---------------------------------------------------------------- the loop
  var LOOP = { last: 0, t: 0, paused: false, raf: null };
  function update(dt) {
    LOOP.t += dt;
    if (P.mode === 'title') P.titleT = (P.titleT || 0) + dt;
    if (P.mode === 'ending' || P.mode === 'gameover') P.endT = (P.endT || 0) + dt;
    if (P.shell && (P.mode === 'field' || P.mode === 'event' || P.mode === 'battle' || P.mode === 'menu')) P.shell.playMs += dt;
    if (toastT > 0) { toastT -= dt; if (toastT <= 0 && UI.toast) UI.toast.classList.remove('is-on'); }
    if (FX.banner) { FX.banner.t += dt; if (FX.banner.t > 2000) FX.banner = null; }
    if (FX.flash) { FX.flash.t += dt; if (FX.flash.t >= FX.flash.ms) FX.flash = null; }
    if (FX.fadeMs > 0) {
      FX.fadeT += dt;
      var p = Math.min(1, FX.fadeT / FX.fadeMs);
      FX.fade = FX.fadeFrom + (FX.fadeTo - FX.fadeFrom) * p;
      if (p >= 1) { FX.fadeMs = 0; FX.fade = FX.fadeTo; var a = FX.after; FX.after = null; if (a) a(); }
    } else if (FX.wait > 0) {
      FX.wait -= dt;
      if (FX.wait <= 0) { FX.wait = 0; var a2 = FX.after; FX.after = null; if (a2) a2(); }
    }
    if (FX.move) stepMoveActor(dt);
    if (TXT.cur && TXT.cur.open < 1) TXT.cur.open = Math.min(1, TXT.cur.open + dt / 140);
    if (TXT.cur && TXT.cur.open >= 1 && TXT.cur.shown < pageChars(TXT.cur)) { TXT.cur.t += dt; TXT.cur.shown = Math.min(pageChars(TXT.cur), TXT.cur.t * (TEXT_CPS[SET.text] || 56) / 1000); }
    if (P.mode === 'battle' && BT) battleStep(dt);
    if (P.mode === 'field' && P.walker && !UI.overlay) {
      // The autopilot feeds one direction per step and lets go while the walker moves, so an arrival never takes a
      // second step with a stale direction. A bump (nothing moved, no transfer) ends it; any event ends it too.
      var ap = P.autopilot;
      if (ap && !P.walker.moving) {
        if (!ap.dirs.length) { if (ap.face) P.walker.dir = ap.face; P.autopilot = null; ap = null; }
        else ap.dir = ap.dirs.shift();
      }
      var wk = P.walker;
      wk.step(dt, held());
      if (ap && ap.dir) { var moved = wk.moving || P.walker !== wk; ap.dir = null; if (!moved && P.autopilot === ap) P.autopilot = null; }
    }
  }
  function frame(ts) {
    LOOP.raf = null;
    if (!LOOP.paused) {
      var dt = LOOP.last ? Math.max(0, Math.min(100, ts - LOOP.last)) : 16;
      LOOP.last = ts;
      update(dt);
      draw(LOOP.t);
    }
    schedule();
  }
  function schedule() { if (!LOOP.raf) LOOP.raf = (window.requestAnimationFrame || function (f) { return setTimeout(function () { f(now()); }, 16); })(frame); }

  // ---------------------------------------------------------------- the route planner (tests and the autopilot)
  // Breadth first over (map, cell) with the very rules the walker uses: passable cells, transfers through exits and site
  // entrances, gates and sea by what the party holds now. Returns the list of directions to press, or null.
  function plan(target, o) {
    o = o || {};
    var held0 = heldKeys(), start = { map: P.shell.map, x: P.shell.x, y: P.shell.y };
    var seen = {}, queue = [start], k0 = start.map + '@' + start.x + ',' + start.y, goal = null, guard = 0;
    seen[k0] = { prev: null, dir: null };
    function isGoal(n) {
      if (n.map !== target.map) return false;
      if (o.adjacent) return Math.abs(n.x - target.x) + Math.abs(n.y - target.y) === 1;
      return n.x === target.x && n.y === target.y;
    }
    if (isGoal(start)) return { dirs: [], face: o.adjacent ? faceTo(start, target) : null };
    while (queue.length && !goal && guard++ < 400000) {
      var n = queue.shift(), m = mapData(n.map);
      if (!m) continue;
      for (var d in DIRS) {
        var nx = n.x + DIRS[d][0], ny = n.y + DIRS[d][1], nxt = null, tr = transferFor(m, nx, ny, held0, true);
        if (tr && !tr.refused) nxt = { map: tr.map, x: tr.at[0], y: tr.at[1] };
        else if (!tr && passable(m, nx, ny, held0) && !(o.avoidSteps && stepMoveAt(m.id, nx, ny) && !(target.map === m.id && nx === target.x && ny === target.y))) nxt = { map: n.map, x: nx, y: ny };
        if (!nxt) continue;
        var key = nxt.map + '@' + nxt.x + ',' + nxt.y;
        if (seen[key]) continue;
        seen[key] = { prev: n, dir: d };
        if (isGoal(nxt)) { goal = nxt; break; }
        queue.push(nxt);
      }
    }
    if (!goal) return null;
    var dirs = [], cur = goal;
    while (true) { var s = seen[cur.map + '@' + cur.x + ',' + cur.y]; if (!s || !s.prev) break; dirs.unshift(s.dir); cur = s.prev; }
    return { dirs: dirs, face: o.adjacent ? faceTo(goal, target) : null };
  }
  function faceTo(a, b) { return b.x > a.x ? 'right' : b.x < a.x ? 'left' : b.y > a.y ? 'down' : 'up'; }

  // ---------------------------------------------------------------- boot
  var READY = { resolve: null }, ready = new Promise(function (r) { READY.resolve = r; });
  function start(b, opts) {
    opts = opts || {};
    var why = unplayable(b);
    if (why) { veil('<strong>This game cannot start</strong><span>' + esc(why) + '</span>'); return false; }
    veil('<div class="sg-spin" aria-hidden="true"></div><strong>' + esc((b.charter.sections && b.charter.sections.premise && b.charter.sections.premise.title) || 'Saga') + '</strong><span>Raising the world from its seed&hellip;</span>');
    setTimeout(function () {
      try {
        readBundle(b);
        applyWindowColors();
        setupCanvas();
        buildWorld();
        P.shell = freshShell();
        P.st = ES.state.create(G.game.idx, {});
        makeWalker();
        unveil();
        if (opts.save) { var e = restore(opts.save); if (e) { toast(e); title(); } }
        else title();
        if (G.warnings.length && window.console) G.warnings.forEach(function (w) { console.warn('[saga] ' + w); });
        READY.resolve(api);
        if (window.parent && window.parent !== window) try { window.parent.postMessage({ type: 'saga:started', title: G.title }, '*'); } catch (x) { /* ok */ }
      } catch (err) {
        veil('<strong>This game could not start</strong><span>' + esc(err && err.message || String(err)) + '</span>');
        if (window.console) console.error(err);
      }
    }, 30);
    return true;
  }
  function chooser(msg) {
    var v = veil('<strong>Saga player</strong><span>' + esc(msg || 'Open a game bundle (a Final export from Saga Studio) to play.') + '</span>');
    v.dataset.passive = '1';
    var b = el('button', 'sg-back', 'Open a game bundle'); b.type = 'button';
    b.addEventListener('click', function () {
      UI.file.accept = '.json,application/json';
      UI.file.value = '';
      UI.file.onchange = function () { var f = UI.file.files && UI.file.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { var j = null; try { j = JSON.parse(String(rd.result)); } catch (e) { j = null; } if (!j) { chooser('That file is not JSON.'); return; } start(j); }; rd.readAsText(f); };
      UI.file.click();
    });
    v.appendChild(b);
  }
  function boot() {
    loadSettings();
    buildDom(document.body);
    bindStage(); bindPad();
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', layout);
    window.addEventListener('pointerdown', function () { audioUnlock(); }, { capture: true });
    window.addEventListener('blur', function () { stopWalking(); });
    window.addEventListener('message', function (e) {
      var d = e.data;
      if (!isObj(d) || d.type !== 'saga:play' || !isObj(d.bundle)) return;
      start(d.bundle, { save: isObj(d.save) ? d.save : null });
    });
    schedule();
    UI.cv.width = 256; UI.cv.height = 224; UI.ctx = UI.cv.getContext('2d'); G.W = 256; G.H = 224; layout();
    var inline = document.getElementById('saga-bundle');
    if (inline && inline.textContent.trim()) {
      var b = null;
      try { b = JSON.parse(inline.textContent); } catch (e) { b = null; }
      if (b) { start(b); return; }
    }
    if (isObj(window.SAGA_BUNDLE)) { start(window.SAGA_BUNDLE); return; }
    var q = /[?&]bundle=([^&#]+)/.exec(location.search);
    if (q && typeof fetch === 'function') {
      veil('<div class="sg-spin" aria-hidden="true"></div><span>Opening the game&hellip;</span>');
      fetch(decodeURIComponent(q[1])).then(function (r) { if (!r.ok) throw new Error('The bundle answered ' + r.status + '.'); return r.json(); }).then(function (j) { start(j); }, function (e) { chooser(e.message); });
      return;
    }
    chooser();
    if (window.parent && window.parent !== window) try { window.parent.postMessage({ type: 'saga:ready' }, '*'); } catch (x) { /* ok */ }
  }

  // ---------------------------------------------------------------- the public face (and what the tests drive)
  var api = {
    version: VERSION,
    ready: ready,
    OUTCOMES: OUTCOMES,
    start: start,
    debug: {
      pause: function (on) { LOOP.paused = on !== false; },
      tick: function (ms, step) { step = step || 16; var n = Math.ceil((ms || 16) / step); for (var i = 0; i < n; i++) update(step); draw(LOOP.t); return api.debug.state(); },
      press: function (b) { press(b); },
      hold: function (d) { IN.keyHeld = d || null; },
      state: function () {
        var o = UI.overlay;
        return { mode: P.mode, map: P.shell && P.shell.map, x: P.shell && P.shell.x, y: P.shell && P.shell.y, dir: P.walker && P.walker.dir, moving: !!(P.walker && P.walker.moving), autopilot: !!P.autopilot,
          chapter: P.st && P.st.chapter, ending: P.st && P.st.ending, hash: P.st && !P.st.run ? H.hash(P.st) : null, overlay: o ? o.kind : null,
          text: TXT.cur ? { name: TXT.cur.name, lines: TXT.cur.pages[TXT.cur.page] } : null,
          choices: o && o.kind === 'choice' ? Array.prototype.map.call(o.node.querySelectorAll('.sg-item span'), function (s) { return s.textContent; }) : null,
          battle: BT ? { trp: BT.o.trp, auto: BT.auto, ended: BT.ended, awaiting: !!awaiting() } : null, faults: P.faults.length, steps: P.shell && P.shell.steps, warnings: G.warnings.slice() };
      },
      story: function () { return copy(P.st); },
      shell: function () { return copy(P.shell); },
      moves: function () { return movesNow(); },
      faults: function () { return copy(P.faults); },
      played: function () { return copy(P.played); },
      record: function (id) { return copy(rulesRec(id) || worldRec(id) || storyRec(id) || artRec(id)); },
      plan: function (map, x, y, o) { return plan({ map: map, x: x, y: y }, o); },
      travel: function (map, x, y, o) {
        o = o || {};
        var p = plan({ map: map, x: x, y: y }, o);
        if (!p) return null;
        P.autopilot = { dirs: p.dirs.slice(), face: p.face, dir: null };
        return p.dirs.length;
      },
      choose: function (text) {
        var o = UI.overlay;
        if (!o || o.kind !== 'choice') return false;
        var bs = Array.prototype.slice.call(o.node.querySelectorAll('.sg-item'));
        var hit = bs.filter(function (b) { return b.querySelector('span').textContent === text; })[0];
        if (!hit) return false;
        hit.click(); return true;
      },
      fight: function (trp) { if (P.mode !== 'field' || !rulesRec(trp)) return false; startBattle({ trp: trp, canEscape: true, canLose: false, source: 'encounter', zone: null, done: function () {} }); return true; },
      autoBattle: function (on) { P.botAuto = on !== false; if (BT) BT.auto = P.botAuto; },
      encounters: function (on) { P.botNoEncounters = on === false; },
      saveTo: function (slot) { return saveTo(slot); },
      readSlot: readSlot,
      restore: function (s) { return restore(s); },
      snapshot: function () { return snapshot(); },
      newGame: function () { newGame(); },
      title: function () { title(); },
      party: function () { return partyMembers(); },
      partyStats: function () { return partyStats(); },
      openMenu: function () { openMenu(); },
      overlayText: function () { return UI.overlay ? UI.overlay.node.textContent : ''; },
      clickItem: function (label) { if (!UI.overlay) return false; var b = Array.prototype.filter.call(UI.overlay.node.querySelectorAll('button'), function (x) { return x.textContent.indexOf(label) === 0; })[0]; if (!b || b.disabled) return false; b.click(); return true; },
      world: function () { return { ms: WD.ms, maps: keys(WD.maps).length, overworld: WD.owRec && WD.owRec.id, start: WD.owRec && WD.owRec.start, warnings: G.warnings.slice() }; },
      mapInfo: function (id) { var m = mapData(id); return m ? { id: m.id, kind: m.kind, w: m.w, h: m.h, exits: copy(m.exits), features: copy(m.features) } : null; },
      held: function () { return heldKeys(); },
      sizes: function () { var r = UI.stage.getBoundingClientRect(); return { stage: [r.width, r.height], pad: UI.root.classList.contains('has-pad'), scale: UI.scale }; }
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  return api;
})();
