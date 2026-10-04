// === WS:CHARTER BEGIN ===
(function () {
  'use strict';
  var U = Kit.util;
  var WSX = window.WS.charter = { id: 'charter' };

  var CHAT_KEY = 'saga146:charter:chat';
  var UI_KEY = 'saga146:charter:ui';
  var FIND_KEY = 'saga146:charter:issues';
  var DEFAULT_RES = { w: 256, h: 224 };
  var FORMULA_IDS = ['phys.ff6', 'mag.ff6', 'phys.sub', 'mag.flat', 'heal.std', 'var.std', 'exp.curve', 'ap.curve', 'atb.fill'];
  var ENGINE_VALUES = ['turn.atb', 'turn.rounds', 'turn.ctb'];
  var SCHED_VALUES = ['atb', 'rounds', 'conditional'];
  var PROG_VALUES = ['materia', 'jobs', 'classes'];
  var SAVE_MODES = ['savepoint', 'anywhere'];
  var CONTROL_VALUES = [
    { key: 'dpad', label: 'D pad and buttons' },
    { key: 'stick', label: 'Virtual stick and buttons' },
    { key: 'tap', label: 'Tap to move' },
    { key: 'hybrid', label: 'Hybrid: stick, tap, and buttons' }
  ];
  var GLOSS_CATS = ['person', 'place', 'faction', 'creature', 'item', 'magic', 'concept', 'other'];

  function cur() { return Kit.bundle.current(); }
  function isEmpty(v) {
    if (v === null || v === undefined || v === false) return true;
    if (typeof v === 'string') return !v.trim();
    if (Array.isArray(v)) return v.every(isEmpty);
    if (U.isObj(v)) return Object.keys(v).every(function (k) { return isEmpty(v[k]); });
    return false;
  }
  function fd(key, label, type, o) { return Object.assign({ key: key, label: label, type: type }, o || {}); }

  // ---------------------------------------------------------------- type descriptors
  var TYPES = {
    premise: { name: 'charter.premise', label: 'Premise', section: true, fields: [
      fd('title', 'Saga title', 'text', { required: true, max: 80, help: 'The name of your game.' }),
      fd('premise', 'Premise', 'longtext', { required: true, help: 'Two or three sentences: who, where, and what is at stake.' }),
      fd('setting', 'Setting', 'longtext', { required: true, help: 'The world, its regions, and its era.' }),
      fd('tone', 'Tone', 'text', { required: true, max: 160, help: 'For example hopeful, melancholy, or wry.' }),
      fd('techLevel', 'Technology level', 'text', { required: true, max: 160, help: 'For example medieval, steam age, or ruined machines.' })
    ] },
    magic: { name: 'charter.magic', label: 'Magic', section: true, fields: [
      fd('magicSystem', 'Magic system', 'longtext', { required: true, help: 'Where magic comes from, what it costs, and who can use it.' }),
      fd('weatherTie', 'Weather tie', 'longtext', { help: 'How magic connects to weather, sky, or seasons. Rules can use this to ground weather states.' })
    ] },
    villain: { name: 'charter.villain', label: 'Villain', section: true, fields: [
      fd('villain', 'Villain', 'longtext', { required: true, help: 'Who they are and what they command.' }),
      fd('motive', 'Motive', 'longtext', { required: true, help: 'Why they do it. The best motives are almost sympathetic.' })
    ] },
    protagonist: { name: 'charter.protagonist', label: 'Protagonist', section: true, fields: [
      fd('protagonist', 'Protagonist', 'longtext', { required: true, help: 'Who they are, what they want, and what stands in the way.' })
    ] },
    party: { name: 'charter.party', label: 'Starting Party', section: true, fields: [
      fd('members', 'Starting party members', 'list', { required: true, itemLabel: 'Member', help: 'The companions who begin the journey with the hero. The target is eight members, but you can add more or fewer.', of: [
        fd('name', 'Name', 'text', { required: true, max: 60 }),
        fd('past', 'Past', 'longtext', { required: true, max: 300, help: 'One sentence about who they were before the story.' })
      ] })
    ] },
    endings: { name: 'charter.endings', label: 'Endings', section: true, fields: [
      fd('endings', 'Ending concepts', 'list', { required: true, itemLabel: 'Ending', of: [
        fd('name', 'Name', 'text', { required: true, max: 80 }),
        fd('concept', 'Concept', 'longtext', { required: true })
      ] })
    ] },
    themes: { name: 'charter.themes', label: 'Themes', section: true, fields: [
      fd('themes', 'Themes', 'list', { required: true, itemLabel: 'Theme', of: { type: 'text' }, help: 'Short phrases such as "grief and memory" or "borrowed time".' })
    ] },
    canon: { name: 'charter.canon', label: 'Canon', section: true, fields: [
      fd('canon', 'Canon rules', 'list', { itemLabel: 'Rule', help: 'One statement per rule. Each rule gets a permanent ID.', of: [
        fd('statement', 'Statement', 'longtext', { required: true, max: 400 })
      ] })
    ] },
    glossary: { name: 'charter.glossary', label: 'Glossary', section: true, fields: [
      fd('glossary', 'Terms', 'list', { itemLabel: 'Term', of: [
        fd('term', 'Term', 'text', { required: true, max: 80 }),
        fd('category', 'Category', 'enum', { values: GLOSS_CATS }),
        fd('definition', 'Definition', 'longtext', { required: true, max: 500 })
      ] })
    ] },
    specs: { name: 'charter.specs', label: 'Specs', section: true, fields: [
      fd('tileSize', 'Tile size in pixels', 'int', { required: true, min: 8, max: 64, help: 'Square tiles. Sixteen is common for this style.' }),
      fd('resolution', 'Internal resolution', 'object', { help: 'Width and height of the game canvas. Empty uses 256 by 224.', of: [
        fd('w', 'Width', 'int', { min: 64, max: 1920, placeholder: '256' }),
        fd('h', 'Height', 'int', { min: 64, max: 1080, placeholder: '224' })
      ] }),
      fd('paletteSize', 'Palette size', 'int', { required: true, min: 2, max: 256, help: 'Number of colors in the master palette.' }),
      fd('mobileControls', 'Mobile control scheme', 'enum', { required: true, values: CONTROL_VALUES })
    ] },
    quotas: { name: 'charter.quotas', label: 'Quotas', section: true, fields: [
      fd('towns', 'Towns', 'int', { required: true, min: 0, max: 99 }),
      fd('dungeons', 'Dungeons', 'int', { required: true, min: 0, max: 99 }),
      fd('enemyFamilies', 'Enemy families', 'int', { required: true, min: 0, max: 200 }),
      fd('bosses', 'Bosses', 'int', { required: true, min: 0, max: 200 }),
      fd('targetPlayHours', 'Target play hours', 'num', { required: true, min: 1, max: 500 })
    ] },
    ruleset: { name: 'charter.ruleset', label: 'Ruleset', section: true, fields: [
      fd('battleEngine', 'Battle engine', 'enum', { required: true, values: ENGINE_VALUES, help: 'turn.atb is Active Time Battle. turn.rounds is classic rounds. turn.ctb is a forecast queue.' }),
      fd('scheduler', 'Scheduler', 'enum', { required: true, values: SCHED_VALUES }),
      fd('progression', 'Progression', 'enum', { required: true, values: PROG_VALUES, help: 'Materia, jobs, or classes. Codex generates the matching record type.' }),
      fd('battle', 'Battle options', 'object', { of: [
        fd('waitMode', 'Wait mode', 'bool', { help: 'Pause the gauges while a menu is open.' }),
        fd('tickRate', 'Tick rate', 'int', { min: 1, max: 240 })
      ] }),
      fd('savePolicy', 'Save policy', 'object', { required: true, of: [
        fd('slots', 'Slots', 'int', { required: true, min: 1, max: 16 }),
        fd('mode', 'Mode', 'enum', { required: true, values: SAVE_MODES }),
        fd('suspend', 'Suspend save', 'bool', { help: 'Allow a temporary save that is deleted when loaded.' })
      ] }),
      fd('stats', 'Stats', 'list', { required: true, itemLabel: 'Stat', help: 'Every stat is editable. Keys are lowercase letters and digits.', of: [
        fd('key', 'Key', 'text', { required: true, max: 12 }),
        fd('label', 'Label', 'text', { required: true, max: 30 }),
        fd('min', 'Min', 'int', { min: 0, max: 99999 }),
        fd('max', 'Max', 'int', { min: 1, max: 99999 })
      ] }),
      fd('elements', 'Elements', 'list', { itemLabel: 'Element', of: [
        fd('key', 'Key', 'text', { required: true, max: 16 }),
        fd('label', 'Label', 'text', { required: true, max: 30 }),
        fd('color', 'Color', 'color')
      ] }),
      fd('elementRelations', 'Element relations', 'list', { itemLabel: 'Relation', help: 'Opposed pairs. Each side is the other side\'s weakness.', of: [
        fd('a', 'Element A', 'enum', { required: true, enumFrom: 'charter.ruleset.elements' }),
        fd('b', 'Element B', 'enum', { required: true, enumFrom: 'charter.ruleset.elements' }),
        fd('kind', 'Kind', 'enum', { required: true, values: ['opposed'] })
      ] }),
      fd('taxonomy', 'Taxonomy', 'object', { help: 'A label and the values that classify enemy families. Inverted values are healed by damage and hurt by healing.', of: [
        fd('label', 'Label', 'text', { max: 30 }),
        fd('values', 'Values', 'list', { itemLabel: 'Value', of: { type: 'text' } }),
        fd('inverts', 'Inverted values', 'list', { itemLabel: 'Value', of: { type: 'text' } })
      ] }),
      fd('formulaSet', 'Formula set', 'table', { cell: 'text', rowLabel: 'Role', valueLabel: 'Formula id', help: 'Maps a role such as phys or heal to a template id or a formula record id.' })
    ] },
    chapter: { name: 'Chapter', prefix: 'chp_', label: 'Chapter', dependsOn: ['charter.sections.chapters'], fields: [
      fd('continentLabel', 'Continent label', 'text', { required: true, max: 60, help: 'Where this chapter takes place, for example "Northern Reach".' }),
      fd('summary', 'Summary', 'longtext', { required: true }),
      fd('targetMinutes', 'Target minutes', 'int', { required: true, min: 1, max: 600, help: 'How long an average player should take.' })
    ] }
  };
  Object.keys(TYPES).forEach(function (k) { Kit.codex.register(TYPES[k]); });

  // ---------------------------------------------------------------- presets
  function defaultStats() {
    return [
      { key: 'hp', label: 'HP', min: 1, max: 9999 }, { key: 'mp', label: 'MP', min: 0, max: 999 },
      { key: 'str', label: 'Strength', min: 1, max: 99 }, { key: 'mag', label: 'Magic', min: 1, max: 99 },
      { key: 'def', label: 'Defense', min: 0, max: 255 }, { key: 'mdef', label: 'Magic Defense', min: 0, max: 255 },
      { key: 'spd', label: 'Speed', min: 1, max: 99 }, { key: 'luck', label: 'Luck', min: 0, max: 99 }
    ];
  }
  var PRESETS = {
    saga: function () {
      return {
        preset: 'saga', battleEngine: 'turn.atb', scheduler: 'atb', schedulerConfig: { gaugeMax: 65536 }, progression: 'materia',
        stats: defaultStats(),
        elements: [
          { key: 'fire', label: 'Fire', color: '#e4572e' }, { key: 'water', label: 'Water', color: '#3a86c8' },
          { key: 'earth', label: 'Earth', color: '#8a6a3d' }, { key: 'air', label: 'Air', color: '#9ad1d4' },
          { key: 'holy', label: 'Holy', color: '#f2d16b' }, { key: 'unholy', label: 'Unholy', color: '#7b4a9e' }
        ],
        elementRelations: [{ a: 'fire', b: 'water', kind: 'opposed' }, { a: 'earth', b: 'air', kind: 'opposed' }, { a: 'holy', b: 'unholy', kind: 'opposed' }],
        taxonomy: { label: 'Type', values: ['fire', 'water', 'earth', 'air', 'holy', 'unholy'], inverts: ['unholy'] },
        formulaSet: { phys: 'phys.ff6', mag: 'mag.ff6', heal: 'heal.std', exp: 'exp.curve', ap: 'ap.curve', atb: 'atb.fill', 'var': 'var.std' },
        savePolicy: { slots: 4, mode: 'savepoint', suspend: true },
        battle: { waitMode: true, tickRate: 30 }
      };
    },
    classic: function () {
      return {
        preset: 'classic', battleEngine: 'turn.rounds', scheduler: 'rounds', schedulerConfig: {}, progression: 'classes',
        stats: defaultStats(),
        elements: [
          { key: 'fire', label: 'Fire', color: '#e4572e' }, { key: 'ice', label: 'Ice', color: '#8fd3f4' },
          { key: 'lightning', label: 'Lightning', color: '#f5d442' }, { key: 'earth', label: 'Earth', color: '#8a6a3d' }
        ],
        elementRelations: [],
        taxonomy: { label: 'Kind', values: ['fire', 'ice', 'lightning', 'earth'], inverts: [] },
        formulaSet: { phys: 'phys.sub', mag: 'mag.flat', heal: 'heal.std', exp: 'exp.curve', 'var': 'var.std' },
        savePolicy: { slots: 3, mode: 'anywhere', suspend: false },
        battle: { waitMode: false, tickRate: 30 }
      };
    },
    custom: function () {
      return { preset: 'custom', schedulerConfig: {}, stats: [], elements: [], elementRelations: [], taxonomy: { label: '', values: [], inverts: [] }, formulaSet: {}, savePolicy: {}, battle: {} };
    }
  };
  var PRESET_INFO = {
    saga: { title: 'Saga Preset', text: 'Active Time Battle with wait mode, materia progression, six elements with three opposed pairs, and four savepoint slots with suspend saves.' },
    classic: { title: 'Classic Preset', text: 'Round based turns, class progression, four elements with no relations, and three slots that save anywhere.' },
    custom: { title: 'Custom', text: 'A blank slate. Declare the engine, scheduler, progression, stats, and elements yourself.' }
  };
  WSX.PRESETS = PRESETS;
  WSX.defaultStats = defaultStats;
  WSX.resolution = function (b) {
    b = b || cur();
    var r = b && b.charter && b.charter.specs && b.charter.specs.resolution;
    return r && r.w > 0 && r.h > 0 ? { w: r.w, h: r.h } : { w: DEFAULT_RES.w, h: DEFAULT_RES.h };
  };

  // ---------------------------------------------------------------- sections
  function plain(key) {
    return {
      peek: function (b) { var s = b.charter.sections; return s && U.isObj(s[key]) ? s[key] : {}; },
      commit: function (b, rec) { if (!U.isObj(b.charter.sections)) b.charter.sections = {}; b.charter.sections[key] = rec; }
    };
  }
  function top(key) {
    return {
      peek: function (b) { return U.isObj(b.charter[key]) ? b.charter[key] : {}; },
      commit: function (b, rec) { b.charter[key] = rec; }
    };
  }
  function wrapList(key) {
    return {
      peek: function (b) { var o = {}; o[key] = Array.isArray(b.charter[key]) ? b.charter[key] : []; return o; },
      commit: function (b, rec) { b.charter[key] = Array.isArray(rec[key]) ? rec[key] : []; }
    };
  }
  function mk(id, label, help, storage, extra) { return Object.assign({ id: id, label: label, help: help, kind: 'form' }, storage, extra || {}); }

  function item(sec, path, message, level, rid) {
    return { recordId: rid || ('charter:' + sec.id), fieldPath: path, message: message, level: level || 'error' };
  }
  function keyProblems(sec, arr, base, what, out) {
    var seen = {};
    (Array.isArray(arr) ? arr : []).forEach(function (s, i) {
      if (!U.isObj(s) || !s.key) return;
      var k = String(s.key);
      if (!/^[a-z][a-z0-9]*$/.test(k)) out.push(item(sec, base + '[' + i + '].key', what + ' key "' + k + '" must be lowercase letters and digits, starting with a letter.'));
      if (seen[k]) out.push(item(sec, base + '[' + i + '].key', 'Duplicate ' + what.toLowerCase() + ' key "' + k + '".'));
      seen[k] = 1;
    });
  }

  var SECTIONS = [
    mk('premise', 'Premise', 'The seed of the saga: what it is, where it happens, and how it feels.', plain('premise'), { type: TYPES.premise }),
    mk('magic', 'Magic', 'How magic works in this world, and how it ties to weather and the sky.', plain('magic'), { type: TYPES.magic }),
    mk('villain', 'Villain', 'The opposing force and the reason behind it.', plain('villain'), { type: TYPES.villain }),
    mk('protagonist', 'Protagonist', 'The hero at the center of the story.', plain('protagonist'), { type: TYPES.protagonist }),
    mk('party', 'Starting Party', 'The companions who begin the journey with the hero. The target is eight, but the list is not capped. Recruiting more along the way is planned for the World and Story days.', plain('party'), { type: TYPES.party, extra: function (b, rec) {
      var out = [], S = SECTION_BY.party, m = Array.isArray(rec.members) ? rec.members : [];
      if (m.length && m.length < 8) out.push(item(S, 'members', 'The target is eight starting party members and you have ' + m.length + '.', 'warning'));
      var seen = {};
      m.forEach(function (x, i) {
        var n = U.isObj(x) && x.name ? String(x.name).trim().toLowerCase() : '';
        if (n && seen[n]) out.push(item(S, 'members[' + i + '].name', 'Another party member is also named "' + x.name + '".', 'warning'));
        if (n) seen[n] = 1;
      });
      return out;
    } }),
    mk('chapters', 'Chapters', 'The chapter outline. Each chapter is a record with a permanent ID that later stages refer to.', {
      peek: function (b) { var s = b.charter.sections; return s && Array.isArray(s.chapters) ? s.chapters : []; },
      commit: function (b, arr) { if (!U.isObj(b.charter.sections)) b.charter.sections = {}; b.charter.sections.chapters = arr; }
    }, { kind: 'chapters', type: null, extra: function (b, arr, strict) {
      var out = [], S = SECTION_BY.chapters;
      if (strict && !arr.length) out.push(item(S, '', 'Add at least one chapter.'));
      if (strict) {
        arr.forEach(function (rec) {
          Kit.validate.record('Chapter', rec, { bundle: b }).forEach(function (it) { if (it.level === 'error' || it.level === 'broken') out.push(it); });
        });
      }
      var total = arr.reduce(function (n, r) { return n + (U.isObj(r) && typeof r.targetMinutes === 'number' ? r.targetMinutes : 0); }, 0);
      var hours = b.charter.quotas && b.charter.quotas.targetPlayHours;
      if (arr.length && typeof hours === 'number' && hours > 0 && total > 0) {
        var ratio = total / 60 / hours;
        if (ratio < 0.7 || ratio > 1.3) out.push(item(S, '', 'Chapter minutes add up to ' + (total / 60).toFixed(1) + ' hours, which is far from the target of ' + hours + ' hours.', 'warning'));
      }
      var seen = {};
      arr.forEach(function (r) {
        var n = U.isObj(r) && r.name ? String(r.name).trim().toLowerCase() : '';
        if (n && seen[n]) out.push(item(S, 'name', 'Two chapters are named "' + r.name + '".', 'warning', r.id));
        if (n) seen[n] = 1;
      });
      return out;
    } }),
    mk('endings', 'Endings', 'The ways the story can conclude.', plain('endings'), { type: TYPES.endings }),
    mk('themes', 'Themes', 'The ideas the saga keeps returning to.', plain('themes'), { type: TYPES.themes, extra: function (b, rec, strict) {
      var out = [], S = SECTION_BY.themes, arr = Array.isArray(rec.themes) ? rec.themes : [];
      var filled = arr.filter(function (t) { return typeof t === 'string' && t.trim(); });
      if (strict && arr.length && !filled.length) out.push(item(S, 'themes', 'Write at least one theme.'));
      arr.forEach(function (t, i) { if (!(typeof t === 'string' && t.trim())) out.push(item(S, 'themes[' + i + ']', 'This theme is empty. Fill it in or remove it.', 'warning')); });
      return out;
    } }),
    mk('canon', 'Canon', 'Rules of the world that must never be contradicted. The interviewer checks new material against these.', wrapList('canon'), { type: TYPES.canon, after: function (b) { ensureCanonIds(b); } }),
    mk('glossary', 'Glossary', 'Names and terms with a short definition and a category.', wrapList('glossary'), { type: TYPES.glossary, extra: function (b, rec) {
      var out = [], S = SECTION_BY.glossary, seen = {};
      (rec.glossary || []).forEach(function (t, i) {
        var n = U.isObj(t) && t.term ? String(t.term).trim().toLowerCase() : '';
        if (n && seen[n]) out.push(item(S, 'glossary[' + i + '].term', 'The term "' + t.term + '" is defined twice.', 'warning'));
        if (n) seen[n] = 1;
      });
      return out;
    } }),
    mk('specs', 'Specs', 'Technical targets for the game canvas and controls.', top('specs'), { type: TYPES.specs, extra: function (b, rec) {
      var out = [], S = SECTION_BY.specs, res = WSX.resolution(b), t = rec.tileSize;
      var r0 = U.isObj(rec.resolution) ? rec.resolution : {};
      if ((r0.w > 0) !== (r0.h > 0)) out.push(item(S, 'resolution', 'Set both width and height, or leave both empty to use 256 by 224.'));
      if (typeof t === 'number' && t > 0 && (res.w % t || res.h % t)) out.push(item(S, 'resolution', 'The resolution ' + res.w + ' by ' + res.h + ' is not a whole number of ' + t + ' pixel tiles.', 'warning'));
      return out;
    } }),
    mk('quotas', 'Quotas', 'How much content the saga should contain.', top('quotas'), { type: TYPES.quotas }),
    mk('ruleset', 'Ruleset', 'Choose the battle rules the whole project is built on.', top('ruleset'), { kind: 'ruleset', type: TYPES.ruleset, extra: function (b, rs, strict) {
      var out = [], S = SECTION_BY.ruleset;
      function e(path, msg, level) { out.push(item(S, path, msg, level)); }
      if (strict && !rs.preset) { e('preset', 'Choose a ruleset: Saga, Classic, or Custom.'); return out; }
      if (!rs.preset) return out;
      keyProblems(S, rs.stats, 'stats', 'Stat', out);
      (rs.stats || []).forEach(function (s, i) { if (U.isObj(s) && typeof s.min === 'number' && typeof s.max === 'number' && s.min > s.max) e('stats[' + i + '].max', 'Max must be at least min.'); });
      keyProblems(S, rs.elements, 'elements', 'Element', out);
      var ekeys = (rs.elements || []).map(function (x) { return U.isObj(x) ? x.key : null; }).filter(Boolean);
      if (!ekeys.length) e('elements', 'No elements are declared, so abilities will have no element to choose.', 'warning');
      var pairs = {};
      (rs.elementRelations || []).forEach(function (r, i) {
        if (!U.isObj(r) || !r.a || !r.b) return;
        if (r.a === r.b) e('elementRelations[' + i + ']', 'An element cannot oppose itself.');
        var pk = [r.a, r.b].sort().join('|');
        if (pairs[pk]) e('elementRelations[' + i + ']', 'The pair ' + r.a + ' and ' + r.b + ' is declared twice.', 'warning');
        pairs[pk] = 1;
      });
      var tax = U.isObj(rs.taxonomy) ? rs.taxonomy : {};
      if (Array.isArray(tax.values) && tax.values.length && !String(tax.label || '').trim()) e('taxonomy.label', 'Give the taxonomy a label such as Type or Kind.');
      (Array.isArray(tax.inverts) ? tax.inverts : []).forEach(function (v, i) {
        if ((tax.values || []).indexOf(v) < 0) e('taxonomy.inverts[' + i + ']', 'Inverted value "' + v + '" is not one of the taxonomy values.');
      });
      var fs = U.isObj(rs.formulaSet) ? rs.formulaSet : {};
      Object.keys(fs).forEach(function (role) {
        var v = fs[role];
        if (typeof v === 'string' && v && FORMULA_IDS.indexOf(v) < 0 && !(Kit.ids.isValid(v) && Kit.ids.prefixOf(v) === 'frm_')) e('formulaSet.' + role, 'Unknown formula id "' + v + '". Use a template id or a formula record id.', 'warning');
      });
      if (rs.battleEngine === 'turn.atb' && rs.scheduler && rs.scheduler !== 'atb') e('scheduler', 'The turn.atb engine expects the atb scheduler.', 'warning');
      if (rs.battleEngine === 'turn.rounds' && rs.scheduler && rs.scheduler !== 'rounds') e('scheduler', 'The turn.rounds engine expects the rounds scheduler.', 'warning');
      return out;
    } })
  ];
  var SECTION_BY = {};
  SECTIONS.forEach(function (s) { SECTION_BY[s.id] = s; });
  WSX.sections = SECTIONS;

  function ensureCanonIds(b) {
    var arr = b.charter.canon;
    if (!Array.isArray(arr)) return false;
    var used = {}, changed = false;
    arr.forEach(function (c) { if (U.isObj(c) && c.id) used[c.id] = 1; });
    arr.forEach(function (c) {
      if (!U.isObj(c) || c.id) return;
      var id;
      do { id = 'can_' + U.rand36(8); } while (used[id]);
      used[id] = 1; c.id = id; changed = true;
    });
    return changed;
  }

  // ---------------------------------------------------------------- issues
  function sectionItems(b, sec, strict) {
    var rec = sec.peek(b), items = [];
    if (sec.type) items = Kit.validate.record(sec.type.name, rec, { bundle: b, draftId: 'charter:' + sec.id });
    if (sec.extra) items = items.concat(sec.extra(b, rec, strict) || []);
    if (!strict && isEmpty(rec)) return [];
    return items;
  }
  function isBlocking(it) { return it.level === 'error' || it.level === 'broken'; }
  WSX.sectionItems = sectionItems;
  WSX.lockCheck = function (b) {
    b = b || cur();
    var items = [];
    SECTIONS.forEach(function (sec) { items = items.concat(sectionItems(b, sec, true).filter(isBlocking)); });
    return { ok: items.length === 0, items: items };
  };
  Kit.validate.register('charter', function (b) {
    var out = [];
    SECTIONS.forEach(function (sec) { out = out.concat(sectionItems(b, sec, false)); });
    return out;
  });
  function secStatus(b, sec) {
    var items = sectionItems(b, sec, true);
    var blocking = items.filter(isBlocking).length;
    return { blocking: blocking, warnings: items.filter(function (i) { return i.level === 'warning'; }).length, started: !isEmpty(sec.peek(b)), done: blocking === 0 };
  }

  // ---------------------------------------------------------------- fingerprints and amendments
  var PRINT_KEYS = ['sections', 'specs', 'quotas', 'canon', 'glossary', 'ruleset'];
  function h10(v) { return U.sha256(U.canonical(v)).slice(0, 10); }
  function flatten(v, path, out) {
    if (Array.isArray(v)) {
      if (!v.length) out[path] = h10(v);
      else v.forEach(function (x, i) { flatten(x, path + '[' + (U.isObj(x) && typeof x.id === 'string' && x.id ? x.id : i) + ']', out); });
    } else if (U.isObj(v)) {
      var ks = Object.keys(v);
      if (!ks.length) out[path] = h10(v);
      else ks.forEach(function (k) { flatten(v[k], path + '.' + k, out); });
    } else out[path] = h10(v === undefined ? null : v);
  }
  function fingerprint(b) {
    var out = {};
    PRINT_KEYS.forEach(function (k) { if (b.charter[k] !== undefined) flatten(b.charter[k], 'charter.' + k, out); });
    return out;
  }
  function diffPrints(a, c) {
    var out = [];
    Object.keys(c).forEach(function (p) { if (a[p] !== c[p]) out.push(p); });
    Object.keys(a).forEach(function (p) { if (c[p] === undefined) out.push(p); });
    return out.sort();
  }
  function segs(p) {
    p = String(p || '').replace(/^charter\./, '').replace(/^sections\./, '');
    return p.split(/[.\[\]]+/).filter(Boolean);
  }
  function overlap(a, c) {
    var x = segs(a), y = segs(c), n = Math.min(x.length, y.length);
    for (var i = 0; i < n; i++) if (x[i] !== y[i]) return false;
    return true;
  }
  WSX.fingerprint = fingerprint;
  WSX.overlap = overlap;
  // Downstream records (outside the charter namespace) whose type depends on a changed path and whose charterVersion is behind.
  WSX.impact = function (b, changedPaths, newVersion) {
    b = b || cur();
    var idx = Kit.index(b), types = Kit.codex.types(b), out = [];
    Object.keys(idx.byId).forEach(function (id) {
      var e = idx.byId[id], info = Kit.codex.prefixInfo(e.prefix);
      if (!info || info.ns === 'charter') return;
      var v = Number(e.record.charterVersion) || 0;
      if (v >= newVersion) return;
      var tn = Kit.codex.typeFor(e.prefix, b), td = tn ? types[tn] : null;
      var deps = td && Array.isArray(td.dependsOn) ? td.dependsOn : [];
      var hit = [];
      deps.forEach(function (d) { if (changedPaths.some(function (p) { return overlap(d, p); }) && hit.indexOf(d) < 0) hit.push(d); });
      if (hit.length) out.push({ id: id, name: e.name, prefix: e.prefix, type: tn, charterVersion: v, dependsOn: hit });
    });
    out.sort(function (x, y) { return x.prefix.localeCompare(y.prefix) || x.name.localeCompare(y.name); });
    return out;
  };

  // ---------------------------------------------------------------- lock and amend
  function labelForPath(p) {
    var r = resolvePath(p);
    return r ? (SECTION_BY[r.sec].label + (r.field ? ' / ' + r.field : '')) : p;
  }
  function showBlockers(items) {
    var groups = {}, order = [];
    items.forEach(function (it) {
      var k = it.recordId;
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(it);
    });
    Kit.ui.dialog({
      title: 'The Charter cannot lock yet',
      body: function (body, h) {
        body.appendChild(U.el('p', null, U.esc(items.length + ' item' + (items.length === 1 ? '' : 's') + ' still need attention. Locking needs zero Charter errors.')));
        order.forEach(function (rid) {
          var g = U.el('div', 'lock-group');
          var name = /^charter:/.test(rid) ? (SECTION_BY[rid.slice(8)] || { label: rid }).label : ((Kit.index().byId[rid] || {}).name || rid);
          g.appendChild(U.el('div', 'lock-group-head', U.esc(name)));
          groups[rid].forEach(function (it) {
            var row = U.el('div', 'lock-row');
            row.appendChild(U.el('span', null, U.esc(it.message)));
            var go = U.el('button', 'btn btn-ghost', Kit.icon('jump') + '<span>Go</span>'); go.type = 'button';
            go.addEventListener('click', function () { h.close(); WSX.focus(rid, it.fieldPath); });
            row.appendChild(go);
            g.appendChild(row);
          });
          body.appendChild(g);
        });
      },
      actions: [{ label: 'Close', kind: 'primary' }]
    });
  }
  function showDiff(result) {
    var am = result.amendment, imp = result.impact || [];
    Kit.ui.dialog({
      title: 'Charter version ' + am.to + ' recorded', wide: true,
      body: function (body) {
        body.appendChild(U.el('p', null, 'The Charter was relocked as version ' + am.to + ' (it was ' + am.from + ').' + (am.note ? ' Note: ' + U.esc(am.note) : '')));
        body.appendChild(U.el('h3', 'section-h', 'Changed paths (' + am.changedPaths.length + ')'));
        var ul = U.el('ul', 'diff-list');
        am.changedPaths.slice(0, 40).forEach(function (p) { ul.appendChild(U.el('li', null, '<span>' + U.esc(labelForPath(p)) + '</span><code>' + U.esc(p) + '</code>')); });
        if (am.changedPaths.length > 40) ul.appendChild(U.el('li', 'muted', '+' + (am.changedPaths.length - 40) + ' more'));
        body.appendChild(ul);
        body.appendChild(U.el('h3', 'section-h', 'Downstream records to review (' + imp.length + ')'));
        if (!imp.length) body.appendChild(U.el('p', 'muted', 'No downstream record depends on the changed paths, or no downstream records exist yet.'));
        else {
          var ul2 = U.el('ul', 'diff-list');
          imp.forEach(function (r) {
            ul2.appendChild(U.el('li', null, '<strong>' + U.esc(r.name) + '</strong><code>' + U.esc(r.id) + '</code><span class="chip chip-warning">v' + r.charterVersion + ' to v' + am.to + '</span><span class="muted">depends on ' + U.esc(r.dependsOn.join(', ')) + '</span>'));
          });
          body.appendChild(ul2);
          body.appendChild(U.el('p', 'muted', 'These records keep their old Charter version until you review them in Rules.'));
        }
      },
      actions: [{ label: 'Close', kind: 'primary' }]
    });
  }
  // opts: {note, quiet}. Resolves {ok, reason, version, first, unchanged, amendment, impact, items}.
  WSX.lock = async function (opts) {
    opts = opts || {};
    var b = cur(), c = b.charter;
    if (c.locked) return { ok: false, reason: 'already-locked' };
    var chk = WSX.lockCheck(b);
    if (!chk.ok) {
      if (!opts.quiet) { showBlockers(chk.items); Kit.ui.toast('Lock refused: ' + chk.items.length + ' item' + (chk.items.length === 1 ? '' : 's') + ' need attention.', 'warn'); }
      return { ok: false, reason: 'errors', items: chk.items };
    }
    var prevRes = c.specs.resolution;
    var needsRes = !U.isObj(prevRes) || !(prevRes.w > 0) || !(prevRes.h > 0);
    if (needsRes) c.specs.resolution = { w: DEFAULT_RES.w, h: DEFAULT_RES.h };
    var from = c.version || 0, result = { ok: true, first: from < 1 };
    var next = fingerprint(b);
    if (from < 1) {
      c.version = 1;
    } else {
      var prev = c.lockFingerprint && c.lockFingerprint.map;
      var changed = prev ? diffPrints(prev, next) : ['charter'];
      if (changed.length) {
        var note = opts.note;
        if (note === undefined) {
          note = await Kit.ui.prompt({ title: 'Relock the Charter', label: 'Amendment note (optional)', multiline: true, okLabel: 'Relock as version ' + (from + 1), placeholder: 'What changed and why?' });
          if (note === null) { if (needsRes) c.specs.resolution = prevRes; return { ok: false, reason: 'cancelled' }; }
        }
        var am = { from: from, to: from + 1, changedPaths: changed, at: U.now(), note: String(note || '').trim() };
        c.amendments.push(am);
        c.version = from + 1;
        result.amendment = am;
        result.impact = WSX.impact(b, changed, c.version);
      } else result.unchanged = true;
    }
    c.locked = true;
    c.lockedAt = U.now();
    c.lockFingerprint = { version: c.version, at: c.lockedAt, map: next };
    result.version = c.version;
    Kit.bundle.open('charter');
    if (b.kit.forges && b.kit.forges['146']) b.kit.forges['146'].charterVersion = c.version;
    Kit.bundle.touch('charter-lock');
    Kit.paintTabs();
    if (Kit.active() === 'charter') Kit.rerender();
    if (result.first) Kit.ui.toast('Charter locked at version 1. The Codex is now open.', 'ok', 4500);
    else if (result.unchanged) Kit.ui.toast('No changes since version ' + c.version + '. The Charter is locked again.', 'ok');
    else if (!opts.quiet) showDiff(result);
    return result;
  };
  WSX.amend = async function (opts) {
    opts = opts || {};
    var b = cur(), c = b.charter;
    if (!c.locked) return { ok: false, reason: 'not-locked' };
    if (!opts.skipConfirm) {
      var ok = await Kit.ui.confirm({ title: 'Amend the Charter?', message: 'The Charter unlocks so you can edit it. The Codex and Rules tabs close until you relock. Relocking raises the version and lists the records that need review.', okLabel: 'Amend' });
      if (!ok) return { ok: false, reason: 'cancelled' };
    }
    c.locked = false;
    Kit.bundle.touch('charter-amend');
    Kit.paintTabs();
    if (Kit.active() !== 'charter') Kit.go('charter'); else Kit.rerender();
    return { ok: true, version: c.version };
  };
  WSX.applyPreset = function (key, o) {
    o = o || {};
    var b = cur();
    if (!PRESETS[key]) throw new Error('Unknown preset ' + key + '.');
    if (b.charter.locked) return false;
    b.charter.ruleset = PRESETS[key]();
    Kit.bundle.touch('charter-preset');
    if (!o.silent && Kit.active() === 'charter') paintMain();
    return true;
  };

  // ---------------------------------------------------------------- state and layout
  var st = { section: null, ctl: null, open: {}, chapCtl: {}, navOpen: false };
  var els = { bar: null, nav: null, navWrap: null, main: null, toggle: null };
  function alive(n) { return n && document.contains(n); }
  function uiGet() { var s = Kit.store.get(UI_KEY, {}); return U.isObj(s) ? s : {}; }

  function paintBar() {
    if (!alive(els.bar)) return;
    var b = cur(), c = b.charter;
    var chk = WSX.lockCheck(b);
    U.clear(els.bar);
    var info = U.el('div', 'ch-bar-info');
    var chip = c.locked ? '<span class="chip chip-ok">Locked v' + c.version + '</span>' : c.version >= 1 ? '<span class="chip chip-warning">Amending v' + c.version + '</span>' : '<span class="chip chip-muted">Draft</span>';
    info.innerHTML = '<h2 class="panel-title">Charter ' + chip + '</h2>';
    var hint = c.locked ? 'The Codex and Rules are open. Amend the Charter to change it.'
      : c.version >= 1 ? 'The Codex and Rules are closed until you relock.' + (chk.ok ? ' Ready to relock.' : ' ' + chk.items.length + ' item' + (chk.items.length === 1 ? '' : 's') + ' to finish first.')
      : (chk.ok ? 'Every section is complete. Lock the Charter to open the Codex.' : chk.items.length + ' item' + (chk.items.length === 1 ? '' : 's') + ' to finish before the Charter can lock.');
    info.appendChild(U.el('p', 'ch-bar-hint', U.esc(hint)));
    els.bar.appendChild(info);
    var act = U.el('div', 'ch-bar-actions');
    var iv = U.el('button', 'btn', Kit.icon('spark') + '<span>Interviewer</span>'); iv.type = 'button';
    iv.addEventListener('click', openInterviewer);
    act.appendChild(iv);
    if (c.locked) {
      var am = U.el('button', 'btn', Kit.icon('edit') + '<span>Amend</span>'); am.type = 'button';
      am.addEventListener('click', function () { WSX.amend(); });
      act.appendChild(am);
    } else {
      var lk = U.el('button', 'btn btn-primary', Kit.icon('lock') + '<span>' + (c.version >= 1 ? 'Relock Charter' : 'Lock Charter') + '</span>'); lk.type = 'button';
      lk.addEventListener('click', function () { WSX.lock(); });
      act.appendChild(lk);
    }
    els.bar.appendChild(act);
  }
  function paintNav() {
    if (!alive(els.nav)) return;
    var b = cur();
    U.clear(els.nav);
    SECTIONS.forEach(function (sec) {
      var s = secStatus(b, sec);
      var btn = U.el('button', 'ch-nav-item'); btn.type = 'button'; btn.dataset.sec = sec.id;
      if (sec.id === st.section) btn.setAttribute('aria-current', 'true');
      var chips = '';
      if (s.done && !s.started) chips += '<span class="chip chip-muted">Optional</span>';
      else if (s.done) chips += '<span class="chip chip-ok" title="Complete">' + Kit.icon('check') + '</span>';
      else if (!s.started) chips += '<span class="chip chip-muted">To do</span>';
      else chips += '<span class="chip chip-error" title="Items to fix">' + s.blocking + '</span>';
      if (s.warnings && s.started) chips += '<span class="chip chip-warning" title="Warnings">' + s.warnings + '</span>';
      btn.innerHTML = '<span>' + U.esc(sec.label) + '</span><span class="ch-nav-chips">' + chips + '</span>';
      btn.setAttribute('aria-label', sec.label + ': ' + (s.done && !s.started ? 'optional' : s.done ? 'complete' : s.started ? s.blocking + ' items to fix' : 'to do'));
      btn.addEventListener('click', function () { goSection(sec.id); });
      els.nav.appendChild(btn);
    });
    if (alive(els.toggle)) els.toggle.querySelector('.cur').textContent = SECTION_BY[st.section].label;
  }
  function goSection(id, fieldPath, chapterId) {
    if (!SECTION_BY[id]) return false;
    st.section = id; st.navOpen = false;
    Kit.store.set(UI_KEY, { section: id });
    if (alive(els.nav)) els.nav.className = 'ch-nav';
    paintNav(); paintMain();
    if (id === 'chapters' && chapterId) focusChapter(chapterId, fieldPath);
    else if (fieldPath && st.ctl) st.ctl.focusPath(fieldPath);
    return true;
  }
  function touch() { Kit.bundle.touch('charter-edit'); }

  function paintMain() {
    if (!alive(els.main)) return;
    var b = cur(), c = b.charter, sec = SECTION_BY[st.section], locked = !!c.locked;
    U.clear(els.main);
    st.ctl = null; st.chapCtl = {};
    var head = U.el('div', 'ch-main-head');
    head.innerHTML = '<h2>' + U.esc(sec.label) + '</h2><p>' + U.esc(sec.help) + '</p>';
    var panel = U.el('section', 'panel');
    panel.appendChild(head);
    els.main.appendChild(panel);
    if (locked) {
      var bn = U.el('div', 'ch-banner');
      bn.appendChild(U.el('span', null, 'Locked at version ' + c.version + '. Fields are read only. Amend the Charter to edit.'));
      var ab = U.el('button', 'btn', Kit.icon('edit') + '<span>Amend</span>'); ab.type = 'button';
      ab.addEventListener('click', function () { WSX.amend(); });
      bn.appendChild(ab);
      panel.appendChild(bn);
    } else if (c.version >= 1) {
      panel.appendChild(U.el('div', 'ch-banner amending', '<span>Amending from version ' + c.version + '. Relock when you are done to record what changed.</span>'));
    }
    if (sec.kind === 'chapters') paintChapters(panel, sec, b, locked);
    else if (sec.kind === 'ruleset') paintRuleset(panel, sec, b, locked);
    else {
      var host = U.el('div');
      panel.appendChild(host);
      var rec = sec.peek(b);
      st.ctl = Kit.form.render(host, sec.type.name, rec, function () {
        sec.commit(b, rec);
        if (sec.after) sec.after(b, rec);
        touch();
      }, { readOnly: locked });
    }
  }

  // ---- chapters
  function chapterRefs(b, id) {
    var out = [], idx = Kit.index(b);
    Object.keys(idx.byId).forEach(function (rid) {
      var e = idx.byId[rid];
      if (rid === id || e.prefix === 'chp_') return;
      if (JSON.stringify(e.record).indexOf('"' + id + '"') >= 0) out.push(e.name);
    });
    return out;
  }
  function addChapterRecord(rec) {
    var b = cur(), arr = SECTION_BY.chapters.peek(b);
    arr.push(rec);
    SECTION_BY.chapters.commit(b, arr);
    return rec;
  }
  function paintChapters(panel, sec, b, locked) {
    var arr = sec.peek(b);
    var tools = U.el('div', 'chap-tools');
    var total = arr.reduce(function (n, r) { return n + (U.isObj(r) && typeof r.targetMinutes === 'number' ? r.targetMinutes : 0); }, 0);
    var hours = b.charter.quotas && b.charter.quotas.targetPlayHours;
    tools.appendChild(U.el('div', 'grow', U.esc(arr.length ? arr.length + ' chapter' + (arr.length === 1 ? '' : 's') + ', about ' + (total / 60).toFixed(1) + ' hours' + (typeof hours === 'number' ? ' against a target of ' + hours : '') + '.' : 'No chapters yet.')));
    if (!locked) {
      var add = U.el('button', 'btn btn-primary', Kit.icon('plus') + '<span>Add chapter</span>'); add.type = 'button';
      add.addEventListener('click', function () {
        Kit.ui.prompt({ title: 'Add a chapter', label: 'Chapter name', okLabel: 'Add', validate: function (v) { return v.trim() ? null : 'Enter a name.'; } }).then(function (name) {
          if (name == null) return;
          var rec = { id: Kit.ids.mint('chp_', name.trim()), name: name.trim(), charterVersion: b.charter.version || 0 };
          addChapterRecord(rec);
          st.open[rec.id] = true;
          touch(); paintMain();
          focusChapter(rec.id);
        });
      });
      tools.appendChild(add);
    }
    panel.appendChild(tools);
    var list = U.el('div', 'chap-list');
    panel.appendChild(list);
    if (!arr.length) {
      list.appendChild(U.el('div', 'empty-line', locked ? 'This Charter has no chapters.' : 'Chapters are the spine of the saga. Add the first one to begin the outline.'));
    }
    arr.forEach(function (rec, i) {
      var card = U.el('div', 'chap-card'); card.dataset.id = rec.id;
      var headEl = U.el('div', 'chap-head');
      var title = U.el('div', 'chap-title');
      var meta = U.el('div', 'chap-meta');
      var ctrls = U.el('div', 'chap-ctrls');
      function paintHead() {
        title.innerHTML = '<span class="chap-num">Chapter ' + (i + 1) + '</span><span class="chap-name">' + U.esc(rec.name || '(unnamed)') + '</span>';
        var bad = Kit.validate.record('Chapter', rec, { bundle: cur() }).filter(isBlocking).length;
        meta.innerHTML = (rec.continentLabel ? '<span class="chip chip-muted">' + U.esc(rec.continentLabel) + '</span>' : '') +
          (typeof rec.targetMinutes === 'number' ? '<span class="chip chip-muted">' + rec.targetMinutes + ' min</span>' : '') +
          (bad ? '<span class="chip chip-error">' + bad + ' to fix</span>' : '<span class="chip chip-ok">' + Kit.icon('check') + '</span>');
      }
      function btn(icon, label, fn, cls) {
        var x = U.el('button', 'btn btn-ghost btn-icon' + (cls ? ' ' + cls : ''), Kit.icon(icon)); x.type = 'button'; x.setAttribute('aria-label', label); x.title = label;
        x.addEventListener('click', fn); return x;
      }
      var body = U.el('div', 'chap-body');
      body.hidden = !st.open[rec.id];
      var toggle = btn('edit', (st.open[rec.id] ? 'Collapse' : 'Edit') + ' chapter ' + (i + 1), function () {
        st.open[rec.id] = !st.open[rec.id];
        body.hidden = !st.open[rec.id];
        if (st.open[rec.id] && !body.firstChild) buildForm();
      });
      ctrls.appendChild(toggle);
      if (!locked) {
        ctrls.appendChild(btn('up', 'Move chapter up', function () { if (i > 0) { var t = arr[i - 1]; arr[i - 1] = arr[i]; arr[i] = t; touch(); paintMain(); } }));
        ctrls.appendChild(btn('down', 'Move chapter down', function () { if (i < arr.length - 1) { var t = arr[i + 1]; arr[i + 1] = arr[i]; arr[i] = t; touch(); paintMain(); } }));
        ctrls.appendChild(btn('trash', 'Delete chapter', function () {
          var refs = chapterRefs(b, rec.id);
          Kit.ui.confirm({ title: 'Delete "' + (rec.name || 'this chapter') + '"?', message: 'The chapter and its ID are removed for good.', detail: refs.length ? refs.length + ' record' + (refs.length === 1 ? '' : 's') + ' refer to it and will show a broken reference: ' + refs.slice(0, 5).join(', ') + (refs.length > 5 ? ', and more.' : '.') : '', okLabel: 'Delete', danger: true }).then(function (ok) {
            if (!ok) return;
            arr.splice(i, 1); touch(); paintMain();
          });
        }));
      }
      headEl.appendChild(title); headEl.appendChild(meta); headEl.appendChild(ctrls);
      card.appendChild(headEl); card.appendChild(body);
      function buildForm() {
        st.chapCtl[rec.id] = Kit.form.render(body, 'Chapter', rec, function () { touch(); paintHead(); }, { readOnly: locked });
      }
      paintHead();
      if (st.open[rec.id]) buildForm();
      list.appendChild(card);
    });
  }
  function focusChapter(id, fieldPath) {
    var arr = SECTION_BY.chapters.peek(cur());
    if (!arr.some(function (r) { return r.id === id; })) return false;
    if (st.section !== 'chapters') { st.section = 'chapters'; paintNav(); }
    st.open[id] = true;
    paintMain();
    var card = els.main.querySelector('.chap-card[data-id="' + id + '"]');
    if (!card) return false;
    card.scrollIntoView({ block: 'center' });
    card.className = 'chap-card flash';
    if (fieldPath && st.chapCtl[id]) st.chapCtl[id].focusPath(fieldPath);
    return true;
  }

  // ---- ruleset
  function rulesetModified(rs) {
    var f = PRESETS[rs.preset];
    return !!f && U.canonical(rs) !== U.canonical(f());
  }
  function paintRuleset(panel, sec, b, locked) {
    var rs = b.charter.ruleset;
    var grid = U.el('div', 'preset-grid');
    function tagsFor(k) {
      return rs.preset === k ? '<span class="chip chip-ok">' + Kit.icon('check') + 'Selected</span>' + (rulesetModified(rs) ? '<span class="chip chip-warning">Modified</span>' : '') : '';
    }
    ['saga', 'classic', 'custom'].forEach(function (k) {
      var info = PRESET_INFO[k];
      var card = U.el('button', 'preset-card'); card.type = 'button'; card.dataset.preset = k;
      card.setAttribute('aria-pressed', rs.preset === k ? 'true' : 'false');
      if (locked) card.disabled = true;
      card.innerHTML = '<strong>' + U.esc(info.title) + '</strong><span class="muted">' + U.esc(info.text) + '</span><span class="preset-tags">' + tagsFor(k) + '</span>';
      card.addEventListener('click', function () { choosePreset(k); });
      grid.appendChild(card);
    });
    panel.appendChild(grid);
    function refreshTags() {
      Array.prototype.forEach.call(grid.querySelectorAll('.preset-card'), function (card) { card.querySelector('.preset-tags').innerHTML = tagsFor(card.dataset.preset); });
    }
    if (!rs.preset) {
      panel.appendChild(U.el('p', 'muted', 'Choose a ruleset to continue. Saga and Classic fill the systems declaration for you. Custom starts blank.'));
      return;
    }
    if (!Array.isArray(rs.stats) || !rs.stats.length) {
      var row = U.el('div', 'btn-row'); row.style.marginBottom = '12px';
      row.appendChild(U.el('span', 'muted', 'No stats declared yet.'));
      if (!locked) {
        var ld = U.el('button', 'btn', Kit.icon('plus') + '<span>Load default stats</span>'); ld.type = 'button';
        ld.addEventListener('click', function () { rs.stats = defaultStats(); touch(); paintMain(); });
        row.appendChild(ld);
      }
      panel.appendChild(row);
    }
    var sysRow = U.el('div', 'btn-row'); sysRow.style.margin = '4px 0 12px';
    var sysBtn = U.el('button', 'btn', Kit.icon('gear') + '<span>' + (locked ? 'View systems' : 'Edit stats, elements, relations, taxonomy') + '</span>'); sysBtn.type = 'button';
    sysBtn.addEventListener('click', function () { if (window.WS.rules && window.WS.rules.openSystems) window.WS.rules.openSystems('stats'); });
    sysRow.appendChild(sysBtn); panel.appendChild(sysRow);
    var host = U.el('div');
    panel.appendChild(host);
    st.ctl = Kit.form.render(host, sec.type.name, rs, function () { touch(); refreshTags(); }, { readOnly: locked });
  }
  function choosePreset(k) {
    var b = cur(), rs = b.charter.ruleset;
    if (b.charter.locked) { Kit.ui.toast('The Charter is locked. Amend it to change the ruleset.', 'warn'); return; }
    var hasContent = rs.preset && !isEmpty(Object.assign({}, rs, { preset: null, schedulerConfig: null }));
    var needConfirm = rs.preset && (rs.preset !== k ? hasContent : rulesetModified(rs));
    var go = needConfirm ? Kit.ui.confirm({ title: rs.preset === k ? 'Reset to the ' + PRESET_INFO[k].title + '?' : 'Switch to the ' + PRESET_INFO[k].title + '?', message: 'This replaces the current systems declaration, including any edits to stats, elements, relations, and formulas.', okLabel: 'Replace', danger: true }) : Promise.resolve(true);
    go.then(function (ok) { if (ok) { WSX.applyPreset(k); Kit.ui.toast(PRESET_INFO[k].title + ' applied.', 'ok'); } });
  }

  // ---------------------------------------------------------------- path resolution and focus
  function resolvePath(path) {
    var p = String(path || '').replace(/^charter\./, ''), m;
    if ((m = /^sections\.chapters\[([^\]]+)\](?:\.(.*))?$/.exec(p))) {
      var arr = SECTION_BY.chapters.peek(cur()), key = m[1], rec = /^\d+$/.test(key) ? arr[Number(key)] : arr.filter(function (r) { return r.id === key; })[0];
      return { sec: 'chapters', field: m[2] || '', chapterId: rec ? rec.id : null };
    }
    if ((m = /^sections\.([a-z]+)(?:\.(.*))?$/.exec(p)) && SECTION_BY[m[1]]) return { sec: m[1], field: m[2] || '' };
    if ((m = /^(canon|glossary)(.*)$/.exec(p))) return { sec: m[1], field: m[1] + m[2] };
    if ((m = /^(specs|quotas|ruleset)(?:\.(.*))?$/.exec(p))) return { sec: m[1], field: m[2] || '' };
    return null;
  }
  WSX.resolvePath = resolvePath;
  WSX.focus = function (recordId, fieldPath) {
    if (Kit.active() !== 'charter') Kit.go('charter');
    var id = String(recordId || '');
    if (/^charter:/.test(id)) return goSection(id.slice(8), fieldPath);
    if (/^chp_/.test(id)) return goSection('chapters', fieldPath, id);
    return false;
  };
  WSX.goToPath = function (path) {
    var r = resolvePath(path);
    if (!r) return false;
    if (Kit.active() !== 'charter') Kit.go('charter');
    return goSection(r.sec, r.field, r.chapterId);
  };
  Kit.jump.register({
    test: function (rid) { return /^charter:[a-z]+$/.test(rid) && !!SECTION_BY[rid.slice(8)]; },
    name: function (rid) { return 'Charter: ' + SECTION_BY[rid.slice(8)].label; },
    go: function (rid, fp) { return WSX.focus(rid, fp); }
  });

  // ---------------------------------------------------------------- interviewer
  function chatAll() { var s = Kit.store.get(CHAT_KEY, {}); return U.isObj(s) ? s : {}; }
  function chatGet(secId) {
    var a = chatAll(), bid = cur().kit.bundleId;
    return a[bid] && Array.isArray(a[bid][secId]) ? a[bid][secId] : [];
  }
  function chatPush(secId, role, content) {
    var a = chatAll(), bid = cur().kit.bundleId;
    if (!U.isObj(a[bid])) a[bid] = {};
    var arr = Array.isArray(a[bid][secId]) ? a[bid][secId] : [];
    arr.push({ role: role, content: content, at: U.now() });
    a[bid][secId] = arr.slice(-24);
    Kit.store.set(CHAT_KEY, a);
  }
  function chatClear(secId) {
    var a = chatAll(), bid = cur().kit.bundleId;
    if (a[bid]) { delete a[bid][secId]; Kit.store.set(CHAT_KEY, a); }
  }
  function sectionFieldsFor(sec) {
    var t = sec.kind === 'chapters' ? TYPES.chapter : sec.type;
    var f = (t.fields || []).slice();
    if (!t.section && !f.some(function (x) { return x.key === 'name'; })) f.unshift({ key: 'name', label: 'Name', type: 'text', required: true });
    return Kit.ai.describeFields(f, cur());
  }
  function fullCharterLines(b) {
    var out = [], c = b.charter;
    function walk(v, path) {
      if (Array.isArray(v)) v.forEach(function (x, i) { walk(x, path + '[' + i + ']'); });
      else if (U.isObj(v)) Object.keys(v).forEach(function (k) { if (k !== 'id' && k !== 'charterVersion') walk(v[k], path + '.' + k); });
      else if (v !== undefined && v !== null && v !== '') out.push(path + ': ' + String(v));
    }
    walk(c.sections, 'charter.sections');
    walk(c.specs, 'charter.specs');
    walk(c.quotas, 'charter.quotas');
    var canon = (c.canon || []).map(function (x) { return { statement: x.statement }; });
    walk(canon, 'charter.canon');
    walk(c.glossary, 'charter.glossary');
    var rs = c.ruleset || {};
    walk({ preset: rs.preset, battleEngine: rs.battleEngine, scheduler: rs.scheduler, progression: rs.progression, elements: (rs.elements || []).map(function (e) { return e.key; }), elementRelations: (rs.elementRelations || []).map(function (r) { return r.a + ' opposes ' + r.b; }), taxonomy: rs.taxonomy, stats: (rs.stats || []).map(function (s) { return s.key; }) }, 'charter.ruleset');
    return out;
  }
  function loadFindings() {
    var a = Kit.store.get(FIND_KEY, {});
    var f = U.isObj(a) ? a[cur().kit.bundleId] : null;
    return f && Array.isArray(f.items) ? f : null;
  }
  function saveFindings(items) {
    var a = Kit.store.get(FIND_KEY, {});
    if (!U.isObj(a)) a = {};
    a[cur().kit.bundleId] = { at: U.now(), items: items };
    Kit.store.set(FIND_KEY, a);
  }

  function applyOption(sec, rec) {
    var b = cur(), target = sec.peek(b);
    Object.keys(rec).forEach(function (k) {
      var v = rec[k];
      if (k === 'id' || k === 'charterVersion' || v === null || v === undefined || v === '') return;
      if (Array.isArray(v) && Array.isArray(target[k])) target[k] = target[k].concat(v);
      else target[k] = v;
    });
    sec.commit(b, target);
    if (sec.after) sec.after(b, target);
    if (alive(els.main) && st.section === sec.id) paintMain();
  }

  async function askQuestion(sec, paintChat) {
    var b = cur();
    var context = { section: { id: sec.id, label: sec.label, fields: sectionFieldsFor(sec), current: sec.peek(b) }, charter: Kit.ai.charterSummary(b) };
    var hist = chatGet(sec.id);
    var msgs = [{ role: 'user', content: 'Context:\n' + JSON.stringify(context) + '\n\nAsk me one probing question about the ' + sec.label + ' section that would make the saga sharper.' }];
    hist.forEach(function (m) { msgs.push({ role: m.role, content: m.content }); });
    if (hist.length && hist[hist.length - 1].role === 'assistant') msgs.push({ role: 'user', content: 'Ask a different probing question that has not been asked yet.' });
    var system = 'You are the interviewer inside Saga Forge, a tool for authoring a classic JRPG. You help the author sharpen one section of their Charter at a time. Reply with exactly one probing question of at most forty words. No preamble, no list, no dashes, no answer of your own. Respect the canon and glossary in the context.';
    var out = await Kit.claude({ tier: 'sonnet', system: system, messages: msgs, maxTokens: 300 });
    chatPush(sec.id, 'assistant', out.text.trim());
    paintChat();
  }
  async function giveOptions(sec) {
    var b = cur();
    if (b.charter.locked) { Kit.ui.toast('The Charter is locked. Amend it to apply options.', 'warn'); return; }
    if (sec.kind === 'ruleset') { Kit.ui.toast('Options are not offered for the ruleset. Pick a preset instead.', 'warn'); return; }
    var isChap = sec.kind === 'chapters';
    var context = { section: { id: sec.id, label: sec.label, fields: sectionFieldsFor(sec), current: sec.peek(b) }, charter: Kit.ai.charterSummary(b), conversation: chatGet(sec.id).slice(-8).map(function (m) { return m.role + ': ' + m.content; }) };
    var system = 'You are the interviewer inside Saga Forge, a tool for authoring a classic JRPG. Return ONLY JSON of the form {"options":[{...},{...},{...}]} with exactly three options that contrast strongly in direction, for example in tone, scale, or theme. ' +
      (isChap ? 'Each option is one chapter record using the field keys given, including name. ' : 'Each option is a small draft using the field keys given. For list fields give two or three entries. ') +
      'Never include "id" or "charterVersion". For enum fields use only the allowedValues listed. Numbers are plain JSON numbers. Stay consistent with the canon and glossary. Do not use dashes in prose.';
    Kit.ui.busy.show('Drafting options...');
    var out;
    try {
      out = await Kit.claude({ tier: 'sonnet', system: system, messages: [{ role: 'user', content: 'Context:\n' + JSON.stringify(context) + '\n\nGive me three contrasting options for the ' + sec.label + ' section.' }], maxTokens: 3000, expectJson: true });
    } finally { Kit.ui.busy.hide(); }
    var j = out.json;
    var opts = (Array.isArray(j) ? j : j && Array.isArray(j.options) ? j.options : []).filter(U.isObj).slice(0, 3);
    if (!opts.length) { Kit.ui.toast('Claude returned no usable options.', 'warn'); return; }
    if (isChap) Kit.review.open(opts, 'Chapter', function (rec) { addChapterRecord(rec); if (alive(els.main) && st.section === 'chapters') { st.open[rec.id] = true; paintMain(); } }, { note: 'Each accepted option is added to the end of the chapter outline.' });
    else Kit.review.open(opts, sec.type.name, function (rec) { applyOption(sec, rec); }, { section: true, note: 'Accepting an option replaces the fields it fills and adds its list entries to this section.' });
  }
  async function checkContradictions(paintFindings) {
    var b = cur(), lines = fullCharterLines(b);
    if (!lines.length) { Kit.ui.toast('The Charter is empty, so there is nothing to check yet.', 'warn'); return; }
    var text = lines.join('\n');
    if (text.length > 160000) text = text.slice(0, 160000);
    var system = 'You audit a game Charter for Saga Forge, a tool for authoring a classic JRPG. Find real contradictions between fields, canon rules, glossary definitions, quotas, chapters, and the ruleset. Ignore style opinions. Return ONLY JSON of the form {"items":[{"fieldPaths":["charter.sections.premise.tone"],"conflict":"...","suggestion":"..."}]}. Copy each fieldPaths entry exactly from the path column of the input. Return {"items":[]} when there are no contradictions. Do not use dashes in prose.';
    Kit.ui.busy.show('Checking the whole Charter with Opus...');
    var out;
    try {
      out = await Kit.claude({ tier: 'opus', system: system, messages: [{ role: 'user', content: 'Charter lines, one per line as path: value\n\n' + text }], maxTokens: 4000, expectJson: true });
    } finally { Kit.ui.busy.hide(); }
    var j = out.json;
    var items = (Array.isArray(j) ? j : j && Array.isArray(j.items) ? j.items : []).filter(U.isObj).map(function (x) {
      return { fieldPaths: (Array.isArray(x.fieldPaths) ? x.fieldPaths : []).map(String), conflict: String(x.conflict || ''), suggestion: String(x.suggestion || '') };
    }).filter(function (x) { return x.conflict; });
    saveFindings(items);
    paintFindings();
    Kit.ui.toast(items.length ? items.length + ' possible contradiction' + (items.length === 1 ? '' : 's') + ' found.' : 'No contradictions found.', items.length ? 'warn' : 'ok');
  }
  function openInterviewer() {
    var sec = SECTION_BY[st.section];
    var dr;
    dr = Kit.ui.drawer({
      title: 'Interviewer: ' + sec.label,
      body: function (body) {
        body.appendChild(U.el('p', 'muted', 'Ask for a probing question, get three contrasting options to react to, or check the whole Charter for contradictions. Ask and Options use Sonnet. Contradictions use Opus.'));
        var log = U.el('div', 'chat-log'); log.setAttribute('aria-live', 'polite');
        body.appendChild(log);
        var f = U.el('div', 'field');
        f.innerHTML = '<label class="field-label" for="ivAnswer">Your answer or notes</label>';
        var ta = U.el('textarea', 'inp'); ta.id = 'ivAnswer'; ta.placeholder = 'Answer the last question. Your reply is kept with this section and sent with the next request.';
        f.appendChild(ta);
        body.appendChild(f);
        var row = U.el('div', 'btn-row'); row.style.marginTop = '8px';
        var send = U.el('button', 'btn', Kit.icon('check') + '<span>Save answer</span>'); send.type = 'button';
        var clr = U.el('button', 'btn btn-ghost', Kit.icon('trash') + '<span>Clear chat</span>'); clr.type = 'button';
        row.appendChild(send); row.appendChild(clr);
        body.appendChild(row);
        var tools = U.el('div', 'iv-tools');
        tools.appendChild(Kit.ai.button('Ask', function () { return askQuestion(sec, paintChat); }, { kind: 'primary', busyLabel: 'Asking...' }));
        tools.appendChild(Kit.ai.button('Give Me Options', function () { return giveOptions(sec); }, { busyLabel: 'Drafting...' }));
        tools.appendChild(Kit.ai.button('Check Contradictions', function () { return checkContradictions(paintFindings); }, { busyLabel: 'Auditing...' }));
        body.appendChild(tools);
        var fh = U.el('h3', 'section-h', 'Contradictions');
        var finds = U.el('div');
        body.appendChild(fh); body.appendChild(finds);
        function paintChat() {
          U.clear(log);
          var hist = chatGet(sec.id);
          if (!hist.length) log.appendChild(U.el('div', 'empty-line', 'No conversation for this section yet. Press Ask to begin.'));
          hist.forEach(function (m) {
            var d = U.el('div', 'chat-msg ' + m.role);
            d.innerHTML = '<small>' + (m.role === 'assistant' ? 'Interviewer' : 'You') + '</small>';
            d.appendChild(document.createTextNode(m.content));
            log.appendChild(d);
          });
          log.scrollTop = log.scrollHeight;
        }
        function paintFindings() {
          U.clear(finds);
          var f2 = loadFindings();
          if (!f2) { finds.appendChild(U.el('div', 'empty-line', 'No audit has been run for this project yet.')); return; }
          finds.appendChild(U.el('p', 'muted', 'Last audit ' + U.esc(U.fmtDate(f2.at)) + '.'));
          if (!f2.items.length) finds.appendChild(U.el('div', 'chip chip-ok', Kit.icon('check') + 'No contradictions'));
          f2.items.forEach(function (it) {
            var card = U.el('div', 'finding');
            card.appendChild(U.el('p', null, '<strong>Conflict.</strong> ' + U.esc(it.conflict)));
            if (it.suggestion) card.appendChild(U.el('p', null, '<strong>Suggestion.</strong> ' + U.esc(it.suggestion)));
            var paths = U.el('div', 'paths');
            it.fieldPaths.forEach(function (p) {
              var pb = U.el('button', 'btn', Kit.icon('jump') + '<span>' + U.esc(p) + '</span>'); pb.type = 'button';
              pb.title = resolvePath(p) ? 'Open ' + labelForPath(p) : 'This path could not be matched to a field';
              if (!resolvePath(p)) pb.disabled = true;
              pb.addEventListener('click', function () { dr.close(); WSX.goToPath(p); });
              paths.appendChild(pb);
            });
            card.appendChild(paths);
            finds.appendChild(card);
          });
        }
        send.addEventListener('click', function () {
          var v = ta.value.trim();
          if (!v) return;
          chatPush(sec.id, 'user', v);
          ta.value = '';
          paintChat();
        });
        clr.addEventListener('click', function () { chatClear(sec.id); paintChat(); });
        paintChat(); paintFindings();
      }
    });
  }
  WSX.openInterviewer = openInterviewer;

  // ---------------------------------------------------------------- render
  WSX.render = function (host) {
    var b = cur();
    if (ensureCanonIds(b)) Kit.bundle.touch('canon-ids');
    var saved = uiGet().section;
    if (!st.section || !SECTION_BY[st.section]) st.section = SECTION_BY[saved] ? saved : 'premise';
    els.bar = U.el('section', 'panel ch-bar');
    host.appendChild(els.bar);
    var body = U.el('div', 'ch-body');
    els.navWrap = U.el('div', 'ch-navwrap');
    els.toggle = U.el('button', 'btn ch-navtoggle', '<span>Section: <strong class="cur"></strong></span>' + Kit.icon('down'));
    els.toggle.type = 'button';
    els.toggle.setAttribute('aria-controls', 'chNav');
    els.nav = U.el('nav', 'ch-nav'); els.nav.id = 'chNav'; els.nav.setAttribute('aria-label', 'Charter sections');
    els.toggle.addEventListener('click', function () {
      st.navOpen = !st.navOpen;
      els.nav.className = 'ch-nav' + (st.navOpen ? ' open' : '');
      els.toggle.setAttribute('aria-expanded', st.navOpen ? 'true' : 'false');
    });
    els.navWrap.appendChild(els.toggle); els.navWrap.appendChild(els.nav);
    els.main = U.el('div', 'ch-main');
    body.appendChild(els.navWrap); body.appendChild(els.main);
    host.appendChild(body);
    paintBar(); paintNav(); paintMain();
  };
  Kit.on('validated', function () { paintBar(); paintNav(); });
  Kit.mount('charter', { title: 'Charter', icon: 'scroll', canEnter: function () { return true; }, render: WSX.render, focus: function (rid, fp) { WSX.focus(rid, fp); } });
})();
// === WS:CHARTER END ===
