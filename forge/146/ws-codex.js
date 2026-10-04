// === WS:CODEX BEGIN ===
(function () {
  'use strict';
  var U = Kit.util;
  var WSX = window.WS.codex = { id: 'codex' };
  var UI_KEY = 'saga146:codex:ui';
  var REPORT_KEY = 'saga146:codex:report';
  var CODEX_FORMAT = 1;

  // ---------------------------------------------------------------- vocabularies
  var FORMULA_IDS = ['phys.ff6', 'mag.ff6', 'phys.sub', 'mag.flat', 'heal.std', 'var.std', 'exp.curve', 'ap.curve', 'atb.fill'];
  var ABL_KINDS = [
    { key: 'attack', label: 'Attack (physical)' }, { key: 'magic', label: 'Magic' }, { key: 'heal', label: 'Heal' },
    { key: 'status', label: 'Status' }, { key: 'summon', label: 'Summon' }, { key: 'command', label: 'Command' },
    { key: 'limit', label: 'Limit' }, { key: 'enemy', label: 'Enemy skill' }, { key: 'passive', label: 'Passive' }
  ];
  var MAT_KINDS = ['magic', 'summon', 'command', 'support', 'independent'];
  // Which ability kinds each materia kind may grant. Support materia modifies its linked neighbor and grants no abilities.
  var MAT_GRANTS = { magic: ['magic', 'heal', 'status'], summon: ['summon'], command: ['attack', 'command'], support: [], independent: ['passive'] };
  var SUPPORT_EFFECTS = [
    { key: 'all', label: 'All (hit every target)' }, { key: 'element', label: 'Element (add the neighbor element)' },
    { key: 'addedEffect', label: 'Added effect (add the neighbor status)' }, { key: 'counter', label: 'Counter' },
    { key: 'hpAbsorb', label: 'HP absorb' }, { key: 'mpAbsorb', label: 'MP absorb' }
  ];
  var AFFINITIES = [
    { key: 'weak', label: 'Weak' }, { key: 'normal', label: 'Normal' }, { key: 'resist', label: 'Resist' },
    { key: 'immune', label: 'Immune' }, { key: 'absorb', label: 'Absorb' }
  ];
  var COND_KINDS = [
    { key: 'always', label: 'Always' }, { key: 'selfHpBelow', label: 'Own HP below fraction' },
    { key: 'selfHpAbove', label: 'Own HP above fraction' }, { key: 'allyHpBelow', label: 'An ally below HP fraction' },
    { key: 'targetHpBelow', label: 'Target HP below fraction' }, { key: 'targetHasStatus', label: 'Target has status' },
    { key: 'targetLacksStatus', label: 'Target lacks status' }, { key: 'turnEvery', label: 'Every N turns' },
    { key: 'enemyCountBelow', label: 'Fewer foes than N' }, { key: 'allyCountBelow', label: 'Fewer allies than N' },
    { key: 'chance', label: 'Random chance' }
  ];
  var NUMERIC_CONDS = { selfHpBelow: 1, selfHpAbove: 1, allyHpBelow: 1, targetHpBelow: 1, turnEvery: 1, enemyCountBelow: 1, allyCountBelow: 1, chance: 1 };
  var STATUS_CONDS = { targetHasStatus: 1, targetLacksStatus: 1 };
  var SELECTORS = [
    { key: 'self', label: 'Self' }, { key: 'randomFoe', label: 'Random foe' }, { key: 'lowestHpFoe', label: 'Foe with lowest HP' },
    { key: 'highestHpFoe', label: 'Foe with highest HP' }, { key: 'allFoes', label: 'All foes' },
    { key: 'randomAlly', label: 'Random ally' }, { key: 'lowestHpAlly', label: 'Ally with lowest HP' },
    { key: 'allAllies', label: 'All allies' }, { key: 'attacker', label: 'The attacker (counters)' }
  ];
  var TRIGGERS = [
    { key: 'onPhysical', label: 'Hit by a physical attack' }, { key: 'onMagic', label: 'Hit by magic' },
    { key: 'onDamaged', label: 'Takes any damage' }, { key: 'onAllyKo', label: 'An ally is KO' },
    { key: 'onLowHp', label: 'Falls below a quarter HP' }, { key: 'onStatus', label: 'Receives a status' }
  ];
  var STAT_PATH = 'charter.ruleset.stats';
  var ELEM_PATH = 'charter.ruleset.elements';
  var TAX_PATH = 'charter.ruleset.taxonomy';
  var MODULE_TYPE = { materia: 'Materia', jobs: 'Job', classes: 'Class' };
  var MODULE_PREFIX = { materia: 'mat_', jobs: 'job_', classes: 'cls_' };
  var SET_KEY = { materia: 'materiaSet', jobs: 'jobSet', classes: 'classSet' };
  var FORGE_NAMES = { 146: 'Saga Forge (Rules)', 147: 'Art Forge', 148: 'World Forge', 149: 'Story Forge' };
  var GROUPS = [
    { key: 'core', label: 'Core types', text: 'Every saga gets these, whatever the ruleset.' },
    { key: 'module', label: 'Progression module', text: 'Chosen by the Charter ruleset progression.' },
    { key: 'living', label: 'Living World', text: 'Text payloads plus references that Claude and later forges can fill.' },
    { key: 'charter', label: 'Charter records', text: 'Owned by the Charter itself.' }
  ];

  function cur() { return Kit.bundle.current(); }
  function fd(key, label, type, o) { return Object.assign({ key: key, label: label, type: type }, o || {}); }
  function fwd(key, label, prefix, o) { return fd(key, label, 'ref', Object.assign({ refPrefix: prefix, forward: true }, o || {})); }

  // ---------------------------------------------------------------- type builder
  // Returns plain JSON descriptors built from the ruleset. Nothing here is a function, so the codex stores in the bundle.
  function buildTypes(rs) {
    rs = U.isObj(rs) ? rs : {};
    var prog = MODULE_TYPE[rs.progression] ? rs.progression : null;
    var modPrefix = prog ? MODULE_PREFIX[prog] : null;
    var lootPrefixes = ['itm_', 'eqp_'].concat(prog === 'materia' ? ['mat_'] : []);
    var gambitRule = [
      fd('condition', 'Condition', 'object', { required: true, of: [
        fd('kind', 'Kind', 'enum', { required: true, values: COND_KINDS }),
        fd('param', 'Parameter', 'text', { max: 40, help: 'A fraction such as 0.35, a count such as 2, or a status ID for status conditions.' })
      ] }),
      fd('target', 'Target', 'object', { required: true, of: [fd('selector', 'Selector', 'enum', { required: true, values: SELECTORS })] }),
      fd('action', 'Action', 'object', { required: true, of: [fd('abl', 'Ability', 'ref', { required: true, refPrefix: 'abl_' })] })
    ];
    var counterRule = [
      fd('trigger', 'Trigger', 'enum', { required: true, values: TRIGGERS }),
      fd('action', 'Action', 'object', { required: true, of: [fd('abl', 'Ability', 'ref', { required: true, refPrefix: 'abl_' })] })
    ];
    var T = {};
    function add(def) { T[def.name] = def; }

    add({ name: 'Character', prefix: 'chr_', label: 'Character', group: 'core', dependsOn: ['charter.sections.party', STAT_PATH], fields: [
      fd('weaponClass', 'Weapon class', 'text', { max: 30, help: 'For example sword, staff, or claw. Equipment with the same class can be worn.' }),
      fd('statLeanings', 'Stat leanings', 'table', { rowsFrom: STAT_PATH, cell: 'num', min: 0, max: 5, rowLabel: 'Stat', valueLabel: 'Lean', help: 'Relative strengths. One is average, two is double.' }),
      fd('baseStats', 'Base stats', 'table', { required: true, rowsFrom: STAT_PATH, cell: 'int', min: 0, max: 99999, rowLabel: 'Stat', valueLabel: 'Level 1' }),
      fd('growth', 'Growth per level', 'table', { rowsFrom: STAT_PATH, cell: 'num', min: 0, max: 9999, rowLabel: 'Stat', valueLabel: 'Per level' }),
      fd('limitTree', 'Limit tree', 'refList', { refPrefix: 'lim_', help: 'Limit breaks in unlock order.' }),
      fwd('portrait', 'Portrait', 'por_'),
      fwd('leitmotif', 'Leitmotif', 'mus_'),
      fd('relationshipHooks', 'Relationship hooks', 'list', { itemLabel: 'Hook', of: [
        fd('chr', 'Character', 'ref', { required: true, refPrefix: 'chr_' }),
        fd('note', 'Note', 'text', { required: true, max: 200 })
      ] }),
      fd('bStoryline', 'B storyline', 'longtext', { help: 'The personal subplot that runs under the main story.' }),
      fd('move', 'Move', 'int', { min: 1, max: 12, help: 'Optional tactics seam: tiles per turn.' })
    ] });

    add({ name: 'Ability', prefix: 'abl_', label: 'Ability', group: 'core', dependsOn: [ELEM_PATH, 'charter.ruleset.formulaSet'], fields: [
      fd('kind', 'Kind', 'enum', { required: true, values: ABL_KINDS }),
      fd('element', 'Element', 'enum', { enumFrom: ELEM_PATH, help: 'Empty means non elemental.' }),
      fd('power', 'Power', 'int', { min: 0, max: 9999 }),
      fd('cost', 'Cost', 'object', { of: [
        fd('mp', 'MP', 'int', { min: 0, max: 9999 }),
        fd('ap', 'AP', 'int', { min: 0, max: 9999 }),
        fd('item', 'Item consumed', 'ref', { refPrefix: 'itm_' })
      ] }),
      fd('targeting', 'Targeting', 'object', { required: true, of: [
        fd('side', 'Side', 'enum', { required: true, values: ['foe', 'ally', 'self', 'any'] }),
        fd('scope', 'Scope', 'enum', { required: true, values: ['single', 'all', 'row', 'random'] })
      ] }),
      fd('chargeTicks', 'Charge ticks', 'int', { min: 0, max: 65536, help: 'Wind up before the action lands. Zero is instant.' }),
      fd('formula', 'Formula', 'ref', { refPrefix: 'frm_', help: 'Empty uses the ruleset formula set for this kind.' }),
      fd('statusEffects', 'Status effects', 'list', { itemLabel: 'Effect', of: [
        fd('sta', 'Status', 'ref', { required: true, refPrefix: 'sta_' }),
        fd('chance', 'Chance', 'num', { min: 0, max: 1, help: 'Zero to one.' })
      ] }),
      fd('range', 'Range', 'int', { min: 0, max: 20, help: 'Optional tactics seam.' }),
      fd('area', 'Area', 'int', { min: 0, max: 10, help: 'Optional tactics seam.' }),
      fwd('animation', 'Animation', 'anm_'),
      fwd('sfx', 'Sound effect', 'sfx_'),
      fwd('icon', 'Icon', 'ico_')
    ] });

    add({ name: 'Item', prefix: 'itm_', label: 'Item', group: 'core', dependsOn: [], fields: [
      fd('kind', 'Kind', 'enum', { required: true, values: ['consumable', 'key', 'material'] }),
      fd('price', 'Price', 'int', { min: 0, max: 9999999 }),
      fd('effect', 'Effect', 'ref', { refPrefix: 'abl_', help: 'The ability that fires when the item is used.' }),
      fwd('icon', 'Icon', 'ico_')
    ] });

    add({ name: 'Equipment', prefix: 'eqp_', label: 'Equipment', group: 'core', dependsOn: [STAT_PATH], fields: [
      fd('slot', 'Slot', 'enum', { required: true, values: ['weapon', 'armor', 'accessory'] }),
      fd('weaponClass', 'Weapon class', 'text', { max: 30, help: 'Weapons only. Matches a character weapon class.' }),
      fd('tier', 'Gear tier', 'int', { min: 1, max: 20, help: 'Compared with the Expected Party State gear tier.' }),
      fd('price', 'Price', 'int', { min: 0, max: 9999999 }),
      fd('stats', 'Stat bonuses', 'table', { rowsFrom: STAT_PATH, cell: 'int', min: -9999, max: 9999, rowLabel: 'Stat', valueLabel: 'Bonus' }),
      fd('slotLayout', 'Slot layout', 'object', { of: [
        fd('count', 'Slots', 'int', { min: 0, max: 8 }),
        fd('links', 'Links', 'list', { itemLabel: 'Link', help: 'Each link is a pair of slot numbers counted from zero, such as 0 and 1.', of: { type: 'list', of: { type: 'int', min: 0, max: 7 }, min: 2, max: 2 } })
      ] }),
      fwd('icon', 'Icon', 'ico_')
    ] });

    add({ name: 'Status', prefix: 'sta_', label: 'Status', group: 'core', dependsOn: [], fields: [
      fd('gauge', 'Gauge effect', 'enum', { required: true, values: ['normal', 'freeze', 'empty'], help: 'Freeze stops the gauge. Empty resets it each tick.' }),
      fd('tickEffect', 'Tick effect', 'object', { of: [
        fd('kind', 'Kind', 'enum', { values: ['none', 'damage', 'heal', 'mpDrain'] }),
        fd('percent', 'Percent of max', 'num', { min: 0, max: 100 })
      ] }),
      fd('duration', 'Duration in turns', 'int', { min: 0, max: 99, help: 'Zero lasts until cured.' }),
      fd('cure', 'Cure', 'object', { of: [
        fd('battleEnd', 'Ends with battle', 'bool'),
        fd('onHit', 'Ends when hit', 'bool'),
        fd('curedBy', 'Cured by', 'refList', { refPrefix: ['itm_', 'abl_'] })
      ] })
    ] });

    add({ name: 'Formula', prefix: 'frm_', label: 'Formula', group: 'core', dependsOn: ['charter.ruleset.formulaSet', STAT_PATH], fields: [
      fd('template', 'Template', 'enum', { values: FORMULA_IDS, help: 'A built in template. Leave empty to write an expression.' }),
      fd('expr', 'Expression', 'formula', { help: 'Used when no template is chosen. Variables: a.<stat>, a.level, t.<stat>, t.level, power, p.<param>.' }),
      fd('params', 'Parameters', 'table', { cell: 'num', rowLabel: 'Param', valueLabel: 'Value', help: 'Read in expressions as p.<name>.' })
    ] });

    add({ name: 'Family', prefix: 'fam_', label: 'Enemy family', group: 'core', dependsOn: [TAX_PATH, ELEM_PATH, 'charter.ruleset.elementRelations'], fields: [
      fd('type', rs.taxonomy && rs.taxonomy.label ? String(rs.taxonomy.label) : 'Type', 'enum', { required: true, enumFrom: TAX_PATH }),
      fd('palette', 'Palette', 'object', { of: [fd('base', 'Base', 'color'), fd('accent', 'Accent', 'color')] }),
      fd('absorbsOwnType', 'Absorbs its own type', 'bool', { help: 'Its own element heals it instead of being resisted.' }),
      fd('defaultAffinity', 'Default affinity', 'table', { derived: 'familyAffinity', rowsFrom: ELEM_PATH, cell: 'text', rowLabel: 'Element', valueLabel: 'Affinity', help: 'Computed from the type and the relation table: its own type is resisted and its opposite is the weakness.' }),
      fwd('sprite', 'Sprite', 'spr_')
    ] });

    add({ name: 'Enemy', prefix: 'enm_', label: 'Enemy', group: 'core', dependsOn: [STAT_PATH, ELEM_PATH], fields: [
      fd('family', 'Family', 'ref', { required: true, refPrefix: 'fam_' }),
      fd('tier', 'Tier', 'int', { min: 1, max: 9 }),
      fd('level', 'Level', 'int', { min: 1, max: 99 }),
      fd('stats', 'Stats', 'table', { required: true, rowsFrom: STAT_PATH, cell: 'int', min: 0, max: 999999, rowLabel: 'Stat', valueLabel: 'Value' }),
      fd('affinityOverrides', 'Affinity overrides', 'table', { rowsFrom: ELEM_PATH, cell: 'enum', cellValues: AFFINITIES, cellPlaceholder: '(family default)', rowLabel: 'Element', valueLabel: 'Override' }),
      fd('gambits', 'Gambits', 'ref', { refPrefix: 'gmb_' }),
      fd('drops', 'Drops', 'list', { itemLabel: 'Drop', of: [
        fd('item', 'Item', 'ref', { required: true, refPrefix: lootPrefixes }),
        fd('chance', 'Chance', 'num', { min: 0, max: 1 })
      ] }),
      fd('steal', 'Steal', 'list', { itemLabel: 'Steal', of: [
        fd('item', 'Item', 'ref', { required: true, refPrefix: lootPrefixes }),
        fd('chance', 'Chance', 'num', { min: 0, max: 1 })
      ] }),
      fd('gil', 'Gil', 'int', { min: 0, max: 9999999 }),
      fd('exp', 'EXP', 'int', { min: 0, max: 9999999 }),
      fd('ap', 'AP', 'int', { min: 0, max: 99999 }),
      fd('isBoss', 'Boss', 'bool')
    ] });

    add({ name: 'Gambit', prefix: 'gmb_', label: 'Gambit set', group: 'core', dependsOn: [], fields: [
      fd('rules', 'Rules', 'list', { required: true, itemLabel: 'Rule', help: 'Checked top to bottom. The first rule whose condition holds acts.', of: gambitRule }),
      fd('counters', 'Counters', 'list', { itemLabel: 'Counter', of: counterRule })
    ] });

    add({ name: 'Troop', prefix: 'trp_', label: 'Troop', group: 'core', dependsOn: ['charter.sections.chapters'], fields: [
      fd('members', 'Members', 'list', { required: true, min: 1, max: 8, itemLabel: 'Member', of: [
        fd('enm', 'Enemy', 'ref', { required: true, refPrefix: 'enm_' }),
        fd('row', 'Row', 'enum', { values: ['front', 'back'] })
      ] }),
      fd('chapter', 'Chapter', 'ref', { refPrefix: 'chp_' }),
      fd('flags', 'Flags', 'object', { of: [
        fd('noEscape', 'No escape', 'bool'),
        fd('preemptiveChance', 'Preemptive chance', 'num', { min: 0, max: 1 })
      ] })
    ] });

    add({ name: 'Shop', prefix: 'shp_', label: 'Shop', group: 'core', dependsOn: ['charter.sections.chapters'], fields: [
      fd('inventory', 'Inventory', 'list', { itemLabel: 'Stock', of: [
        fd('item', 'Item', 'ref', { required: true, refPrefix: lootPrefixes }),
        fd('priceOverride', 'Price override', 'int', { min: 0, max: 9999999 })
      ] }),
      fd('chapterAvailable', 'Available from chapter', 'ref', { refPrefix: 'chp_' })
    ] });

    add({ name: 'Weather', prefix: 'wth_', label: 'Weather state', group: 'core', dependsOn: [ELEM_PATH, 'charter.sections.magic'], fields: [
      fd('realWorld', 'Real world phenomenon', 'text', { required: true, max: 80, help: 'For example supercell thunderstorm or radiation fog.' }),
      fd('elementMultipliers', 'Element multipliers', 'table', { rowsFrom: ELEM_PATH, cell: 'num', min: 0, max: 5, rowLabel: 'Element', valueLabel: 'Multiplier' }),
      fd('encounterModifiers', 'Encounter modifiers', 'object', { of: [
        fd('rate', 'Encounter rate', 'num', { min: 0, max: 5, help: 'One is normal.' }),
        fd('familyWeights', 'Family weights', 'list', { itemLabel: 'Weight', of: [
          fd('fam', 'Family', 'ref', { required: true, refPrefix: 'fam_' }),
          fd('weight', 'Weight', 'num', { min: 0, max: 10 })
        ] })
      ] })
    ] });

    add({ name: 'Limit', prefix: 'lim_', label: 'Limit break', group: 'core', dependsOn: [], fields: [
      fd('level', 'Limit level', 'int', { required: true, min: 1, max: 4 }),
      fd('unlock', 'Unlock', 'object', { of: [
        fd('uses', 'After uses', 'int', { min: 0, max: 999, help: 'Uses of the previous limit.' }),
        fd('kills', 'After kills', 'int', { min: 0, max: 9999 })
      ] }),
      fd('action', 'Action', 'ref', { required: true, refPrefix: 'abl_' })
    ] });

    var eps = [
      fd('chapter', 'Chapter', 'ref', { required: true, refPrefix: 'chp_' }),
      fd('targetLevel', 'Target level', 'int', { min: 1, max: 99 }),
      fd('gearTier', 'Gear tier', 'int', { min: 1, max: 20 })
    ];
    if (prog) eps.push(fd(SET_KEY[prog], MODULE_TYPE[prog] + ' set', 'refList', { refPrefix: modPrefix }));
    eps.push(fd('gil', 'Gil on hand', 'int', { min: 0, max: 9999999 }));
    eps.push(fd('abilities', 'Abilities', 'refList', { refPrefix: 'abl_' }));
    eps.push(fd('targetWinRate', 'Target win rate', 'num', { min: 0, max: 100, help: 'Percent. The Simulator draws this as the target line.' }));
    add({ name: 'ExpectedPartyState', prefix: 'eps_', label: 'Expected Party State', group: 'core', dependsOn: ['charter.sections.chapters', 'charter.ruleset.progression'], fields: eps });

    if (prog === 'materia') {
      add({ name: 'Materia', prefix: 'mat_', label: 'Materia', group: 'module', module: 'materia', dependsOn: ['charter.ruleset.progression', ELEM_PATH, STAT_PATH], fields: [
        fd('kind', 'Kind', 'enum', { required: true, values: MAT_KINDS }),
        fd('element', 'Element', 'enum', { enumFrom: ELEM_PATH }),
        fd('apThresholds', 'AP thresholds', 'list', { itemLabel: 'Level', of: { type: 'int', min: 0, max: 9999999 }, help: 'AP needed to reach each level after the first.' }),
        fd('grants', 'Grants per level', 'list', { itemLabel: 'Grant', of: [
          fd('level', 'Level', 'int', { required: true, min: 1, max: 9 }),
          fd('abl', 'Ability', 'ref', { refPrefix: 'abl_' }),
          fd('statMods', 'Stat mods', 'table', { rowsFrom: STAT_PATH, cell: 'num', min: -100, max: 100, rowLabel: 'Stat', valueLabel: 'Percent' })
        ] }),
        fd('supportEffect', 'Support effect', 'enum', { values: SUPPORT_EFFECTS, help: 'Support materia only: how it modifies its linked neighbor.' }),
        fd('price', 'Price', 'int', { min: 0, max: 9999999 })
      ] });
    } else if (prog === 'jobs') {
      add({ name: 'Job', prefix: 'job_', label: 'Job', group: 'module', module: 'jobs', dependsOn: ['charter.ruleset.progression', STAT_PATH], fields: [
        fd('abilities', 'Abilities by level', 'list', { itemLabel: 'Ability', of: [
          fd('level', 'Job level', 'int', { required: true, min: 1, max: 99 }),
          fd('abl', 'Ability', 'ref', { required: true, refPrefix: 'abl_' })
        ] }),
        fd('statMods', 'Stat mods', 'table', { rowsFrom: STAT_PATH, cell: 'num', min: -100, max: 100, rowLabel: 'Stat', valueLabel: 'Percent' })
      ] });
    } else if (prog === 'classes') {
      add({ name: 'Class', prefix: 'cls_', label: 'Class', group: 'module', module: 'classes', dependsOn: ['charter.ruleset.progression', STAT_PATH], fields: [
        fd('skillTree', 'Skill tree', 'list', { itemLabel: 'Skill', of: [
          fd('abl', 'Ability', 'ref', { required: true, refPrefix: 'abl_' }),
          fd('level', 'Level', 'int', { required: true, min: 1, max: 99 })
        ] }),
        fd('statMods', 'Stat mods', 'table', { rowsFrom: STAT_PATH, cell: 'num', min: -100, max: 100, rowLabel: 'Stat', valueLabel: 'Percent' })
      ] });
    }

    var worldRefs = ['chr_', 'enm_', 'fam_', 'itm_', 'eqp_', 'abl_', 'npc_', 'twn_', 'dgn_', 'reg_', 'map_'];
    add({ name: 'Rumor', prefix: 'rmr_', label: 'Rumor', group: 'living', module: 'living', dependsOn: ['charter.canon', 'charter.glossary'], fields: [
      fd('text', 'Rumor', 'longtext', { required: true, max: 600, help: 'What townsfolk say.' }),
      fd('chapter', 'Chapter', 'ref', { refPrefix: 'chp_' }),
      fd('truthful', 'Truthful', 'bool'),
      fd('refs', 'About', 'refList', { refPrefix: worldRefs })
    ] });
    add({ name: 'SideQuest', prefix: 'sdq_', label: 'Side quest seed', group: 'living', module: 'living', dependsOn: ['charter.canon', 'charter.sections.chapters'], fields: [
      fd('text', 'Quest seed', 'longtext', { required: true, max: 1200 }),
      fd('chapter', 'Chapter', 'ref', { refPrefix: 'chp_' }),
      fwd('giver', 'Giver', 'npc_'),
      fd('rewards', 'Rewards', 'list', { itemLabel: 'Reward', of: [
        fd('item', 'Item', 'ref', { required: true, refPrefix: lootPrefixes }),
        fd('qty', 'Quantity', 'int', { min: 1, max: 99 })
      ] }),
      fd('refs', 'Involves', 'refList', { refPrefix: worldRefs }),
      fwd('flag', 'Completion flag', 'flg_')
    ] });
    add({ name: 'BossStrategy', prefix: 'bst_', label: 'Boss strategy', group: 'living', module: 'living', dependsOn: [], fields: [
      fd('text', 'Strategy', 'longtext', { required: true, max: 1200, help: 'The plan in words. The rules below are what the engine runs.' }),
      fd('boss', 'Boss', 'ref', { required: true, refPrefix: 'enm_' }),
      fd('rules', 'Rules', 'list', { required: true, itemLabel: 'Rule', help: 'Same shape as a gambit set, so it validates and simulates the same way.', of: U.clone(gambitRule) }),
      fd('counters', 'Counters', 'list', { itemLabel: 'Counter', of: U.clone(counterRule) })
    ] });

    Object.keys(T).forEach(function (k) { T[k].prefix = Kit.codex.normPrefix(T[k].prefix); T[k].codex = CODEX_FORMAT; });
    return T;
  }

  function buildSaveSchema(rs) {
    rs = U.isObj(rs) ? rs : {};
    var sp = U.isObj(rs.savePolicy) ? rs.savePolicy : {};
    var prog = MODULE_TYPE[rs.progression] ? rs.progression : null;
    var member = [
      fd('chr', 'Character', 'ref', { required: true, refPrefix: 'chr_' }),
      fd('level', 'Level', 'int', { required: true, min: 1, max: 99 }),
      fd('exp', 'EXP', 'int', { min: 0 }),
      fd('hp', 'HP', 'int', { min: 0 }),
      fd('mp', 'MP', 'int', { min: 0 }),
      fd('equipment', 'Equipment', 'refList', { refPrefix: 'eqp_' }),
      fd('limitLevel', 'Limit level', 'int', { min: 1, max: 4 }),
      fd('limitUses', 'Limit uses', 'int', { min: 0 }),
      fd('kills', 'Kills', 'int', { min: 0 }),
      fd('status', 'Lasting statuses', 'refList', { refPrefix: 'sta_' })
    ];
    if (prog === 'materia') member.push(fd('slots', 'Slotted materia', 'list', { itemLabel: 'Slot', of: [fd('eqp', 'Equipment', 'ref', { refPrefix: 'eqp_' }), fd('slot', 'Slot', 'int', { min: 0, max: 7 }), fd('mat', 'Materia', 'ref', { refPrefix: 'mat_' }), fd('ap', 'AP', 'int', { min: 0 })] }));
    if (prog === 'jobs') member.push(fd('job', 'Job', 'ref', { refPrefix: 'job_' }), fd('jobLevels', 'Job levels', 'table', { cell: 'int' }));
    if (prog === 'classes') member.push(fd('cls', 'Class', 'ref', { refPrefix: 'cls_' }));
    var fields = [
      fd('slotMeta', 'Slot meta', 'object', { required: true, of: [
        fd('slot', 'Slot', 'int', { required: true, min: 1, max: Math.max(1, Number(sp.slots) || 1) }),
        fd('label', 'Label', 'text', { max: 60 }),
        fd('savedAt', 'Saved at', 'text'),
        fd('chapter', 'Chapter', 'ref', { refPrefix: 'chp_' }),
        fd('suspend', 'Suspend save', 'bool')
      ] }),
      fd('party', 'Party', 'list', { required: true, itemLabel: 'Member', of: member }),
      fd('inventory', 'Inventory', 'list', { itemLabel: 'Stack', of: [fd('item', 'Item', 'ref', { required: true, refPrefix: ['itm_', 'eqp_'] }), fd('qty', 'Quantity', 'int', { min: 0, max: 999 })] })
    ];
    if (prog === 'materia') fields.push(fd('materia', 'Materia stock', 'list', { itemLabel: 'Materia', of: [fd('mat', 'Materia', 'ref', { required: true, refPrefix: 'mat_' }), fd('ap', 'AP', 'int', { min: 0 })] }));
    fields.push(
      fd('gil', 'Gil', 'int', { min: 0 }),
      fd('flags', 'Flags', 'list', { itemLabel: 'Flag', of: [fwd('flg', 'Flag', 'flg_', { required: true }), fd('value', 'Value', 'int')] }),
      fwd('location', 'Location', 'map_', { required: true }),
      fd('playTime', 'Play time in seconds', 'int', { required: true, min: 0 }),
      fd('bundleHash', 'Bundle hash', 'text', { required: true, help: 'The content hash of the bundle this save was made against.' }),
      fd('schemaVersion', 'Schema version', 'int', { required: true, min: 1 })
    );
    return {
      name: 'SaveGame', label: 'Save game', schemaVersion: 1,
      policy: { slots: Number(sp.slots) || 0, mode: sp.mode || null, suspend: !!sp.suspend },
      fields: fields
    };
  }

  // ---------------------------------------------------------------- affinity
  function elementKeys(b) {
    var els = b && b.charter && b.charter.ruleset && Array.isArray(b.charter.ruleset.elements) ? b.charter.ruleset.elements : [];
    return els.map(function (e) { return U.isObj(e) ? String(e.key) : String(e); }).filter(function (k) { return k && k !== 'undefined'; });
  }
  function opposites(b, key) {
    var rel = b && b.charter && b.charter.ruleset && Array.isArray(b.charter.ruleset.elementRelations) ? b.charter.ruleset.elementRelations : [];
    var out = [];
    rel.forEach(function (r) {
      if (!U.isObj(r) || (r.kind && r.kind !== 'opposed')) return;
      if (r.a === key && r.b) out.push(String(r.b));
      if (r.b === key && r.a) out.push(String(r.a));
    });
    return out;
  }
  // Default affinity for a taxonomy value: own element resisted (or absorbed), opposed elements are weaknesses.
  WSX.defaultAffinity = function (b, typeValue, absorbOwn) {
    b = b || cur();
    var out = {}, opp = typeValue ? opposites(b, String(typeValue)) : [];
    elementKeys(b).forEach(function (k) {
      if (typeValue && k === String(typeValue)) out[k] = absorbOwn ? 'absorb' : 'resist';
      else if (opp.indexOf(k) >= 0) out[k] = 'weak';
      else out[k] = 'normal';
    });
    return out;
  };
  // Effective affinity for an enemy: family default, then overrides.
  WSX.enemyAffinity = function (b, enm) {
    b = b || cur();
    var fam = enm && enm.family ? Kit.index(b).byId[enm.family] : null;
    var fr = fam ? fam.record : {};
    var base = WSX.defaultAffinity(b, fr.type, !!fr.absorbsOwnType);
    var ov = enm && U.isObj(enm.affinityOverrides) ? enm.affinityOverrides : {};
    Object.keys(ov).forEach(function (k) { if (ov[k]) base[k] = ov[k]; });
    return base;
  };
  Kit.codex.derive.familyAffinity = function (rec, b) { return WSX.defaultAffinity(b, rec && rec.type, !!(rec && rec.absorbsOwnType)); };

  // ---------------------------------------------------------------- generation
  function fieldPaths(fields, base, out) {
    (fields || []).forEach(function (f) {
      if (!f || !f.key) return;
      var p = base ? base + '.' + f.key : f.key;
      out[p] = f.type;
      if (Array.isArray(f.of)) fieldPaths(f.of, p + '[]', out);
      else if (U.isObj(f.of) && f.of.type) out[p + '[]'] = f.of.type;
    });
    return out;
  }
  function diffTypes(oldT, newT) {
    oldT = U.isObj(oldT) ? oldT : {}; newT = U.isObj(newT) ? newT : {};
    var rep = { typesAdded: [], typesRemoved: [], fields: [] };
    Object.keys(newT).forEach(function (k) { if (!oldT[k]) rep.typesAdded.push(k); });
    Object.keys(oldT).forEach(function (k) { if (!newT[k]) rep.typesRemoved.push(k); });
    Object.keys(newT).forEach(function (k) {
      if (!oldT[k]) return;
      var a = fieldPaths(oldT[k].fields, '', {}), c = fieldPaths(newT[k].fields, '', {});
      var added = Object.keys(c).filter(function (p) { return a[p] === undefined; });
      var removed = Object.keys(a).filter(function (p) { return c[p] === undefined; });
      var retyped = Object.keys(c).filter(function (p) { return a[p] !== undefined && a[p] !== c[p]; });
      if (added.length || removed.length || retyped.length) rep.fields.push({ type: k, prefix: newT[k].prefix, added: added, removed: removed, retyped: retyped });
    });
    return rep;
  }
  function rulesetHash(rs) { return U.sha256(U.canonical(U.isObj(rs) ? rs : {})).slice(0, 16); }
  function prefixTable(types) {
    var out = {}, byPrefix = {};
    Object.keys(types).forEach(function (k) { byPrefix[types[k].prefix] = k; });
    Object.keys(Kit.codex.PREFIXES).sort().forEach(function (p) {
      var info = Kit.codex.PREFIXES[p];
      var tn = byPrefix[p] || null;
      if (!tn && p === 'chp_') tn = 'Chapter';
      out[p] = { type: tn, ns: info.ns, forge: info.forge, module: info.module || null, active: !!tn || info.forge !== 146 };
    });
    return out;
  }
  function recordsByPrefix(b) {
    var out = {};
    var idx = Kit.index(b);
    Object.keys(idx.byPrefix).forEach(function (p) { out[p] = idx.byPrefix[p].length; });
    return out;
  }
  // Generates (or regenerates) codex.types, codex.prefixes, codex.modules and codex.saveSchema. Records are never touched.
  WSX.generate = function (opts) {
    opts = opts || {};
    var b = cur();
    if (!b.charter.locked) return { ok: false, reason: 'Lock the Charter before generating the Codex.' };
    var rs = b.charter.ruleset || {};
    if (!MODULE_TYPE[rs.progression]) return { ok: false, reason: 'The ruleset needs a progression (materia, jobs, or classes).' };
    var oldTypes = U.clone(b.codex.types || {});
    var first = !b.codex.version;
    var types = buildTypes(rs);
    var report = first ? { typesAdded: Object.keys(types), typesRemoved: [], fields: [] } : diffTypes(oldTypes, types);
    var modules = [rs.progression, 'living'];
    b.codex.types = types;
    b.codex.prefixes = prefixTable(types);
    b.codex.modules = modules;
    b.codex.saveSchema = buildSaveSchema(rs);
    b.codex.version = (b.codex.version || 0) + 1;
    b.codex.generatedFromCharter = b.charter.version || 0;
    b.codex.rulesetHash = rulesetHash(rs);
    b.codex.generatedAt = U.now();
    // Orphans: records kept whose prefix no longer has a type (for example materia after switching to classes).
    var counts = recordsByPrefix(b), orphans = [];
    Object.keys(counts).forEach(function (p) {
      var info = Kit.codex.prefixInfo(p);
      if (info && info.ns === 'rules' && !b.codex.prefixes[p].type) orphans.push({ prefix: p, count: counts[p] });
    });
    // Refresh derived values on every family.
    Object.keys((b.rules && b.rules.fam_) || {}).forEach(function (id) {
      var r = b.rules.fam_[id];
      r.defaultAffinity = WSX.defaultAffinity(b, r.type, !!r.absorbsOwnType);
    });
    Kit.bundle.open('rules');
    Kit.index.invalidate();
    var full = { at: b.codex.generatedAt, version: b.codex.version, charterVersion: b.codex.generatedFromCharter, first: first, report: report, orphans: orphans, preserved: Object.keys(counts).reduce(function (s, p) { return s + (Kit.codex.prefixInfo(p) && Kit.codex.prefixInfo(p).ns === 'rules' ? counts[p] : 0); }, 0) };
    Kit.store.set(REPORT_KEY, full);
    Kit.bundle.touch('codex-generate');
    Kit.paintTabs();
    if (!opts.quiet) {
      if (first) Kit.ui.toast('Codex version 1 generated with ' + Object.keys(types).length + ' record types. Rules is open.', 'ok', 4500);
      else showReport(full);
    }
    if (Kit.active() === 'codex') Kit.rerender();
    return { ok: true, version: b.codex.version, report: report, orphans: orphans, first: first };
  };
  WSX.buildTypes = buildTypes;
  WSX.buildSaveSchema = buildSaveSchema;
  WSX.diffTypes = diffTypes;

  // ---------------------------------------------------------------- codex validity
  function resolves(b, path) {
    var v = U.getPath(b, path);
    if (U.isObj(v) && Array.isArray(v.values)) return v.values.length;
    return Array.isArray(v) ? v.length : -1;
  }
  function walkFields(fields, fn, base) {
    (fields || []).forEach(function (f) {
      if (!f || !f.key) return;
      var p = base ? base + '.' + f.key : f.key;
      fn(f, p);
      if (Array.isArray(f.of)) walkFields(f.of, fn, p);
      else if (U.isObj(f.of)) fn(f.of, p + '[]');
    });
  }
  // Returns {ok, state:'none|stale|ready|invalid', errors:[], warnings:[]} with items {path, message}.
  WSX.check = function (b) {
    b = b || cur();
    var out = { ok: false, state: 'none', errors: [], warnings: [] };
    if (!b || !b.charter) { out.errors.push({ path: 'charter', message: 'No project is loaded.' }); return out; }
    if (!b.charter.locked) { out.errors.push({ path: 'charter.locked', message: 'Lock the Charter first.' }); out.state = 'none'; return out; }
    var cx = b.codex || {}, rs = b.charter.ruleset || {};
    if (!cx.version || !U.isObj(cx.types) || !Object.keys(cx.types).length) { out.errors.push({ path: 'codex.version', message: 'Generate the Codex from the locked ruleset.' }); return out; }
    if (cx.generatedFromCharter !== b.charter.version || (cx.rulesetHash && cx.rulesetHash !== rulesetHash(rs))) {
      out.state = 'stale';
      out.errors.push({ path: 'codex.generatedFromCharter', message: 'The Charter is at version ' + b.charter.version + ' but the Codex was generated from version ' + cx.generatedFromCharter + '. Regenerate the Codex.' });
    }
    var prog = rs.progression;
    if (!MODULE_TYPE[prog]) out.errors.push({ path: 'charter.ruleset.progression', message: 'The ruleset has no progression module.' });
    else {
      var mt = MODULE_TYPE[prog];
      if (!cx.types[mt]) out.errors.push({ path: 'codex.types.' + mt, message: 'The ' + prog + ' module type ' + mt + ' is missing. Regenerate the Codex.' });
      Object.keys(MODULE_TYPE).forEach(function (m) { if (m !== prog && cx.types[MODULE_TYPE[m]]) out.errors.push({ path: 'codex.types.' + MODULE_TYPE[m], message: 'Type ' + MODULE_TYPE[m] + ' belongs to the inactive ' + m + ' module. Regenerate the Codex.' }); });
    }
    if (resolves(b, STAT_PATH) <= 0) out.errors.push({ path: STAT_PATH, message: 'The ruleset declares no stats, so stat tables cannot be built.' });
    if (resolves(b, ELEM_PATH) <= 0) out.warnings.push({ path: ELEM_PATH, message: 'The ruleset declares no elements. Element fields will be empty.' });
    if (resolves(b, TAX_PATH) <= 0) out.warnings.push({ path: TAX_PATH, message: 'The taxonomy has no values. Enemy families cannot be typed.' });
    var fs = U.isObj(rs.formulaSet) ? rs.formulaSet : {};
    Object.keys(fs).forEach(function (role) {
      var v = fs[role];
      if (FORMULA_IDS.indexOf(v) < 0 && !(typeof v === 'string' && /^frm_/.test(v))) out.warnings.push({ path: 'charter.ruleset.formulaSet.' + role, message: 'Formula set role ' + role + ' names "' + v + '", which is neither a template nor a formula record.' });
    });
    var seen = {};
    Object.keys(cx.types).forEach(function (tn) {
      var t = cx.types[tn];
      if (!U.isObj(t) || !Array.isArray(t.fields)) { out.errors.push({ path: 'codex.types.' + tn, message: 'Type ' + tn + ' has no field list.' }); return; }
      var p = Kit.codex.normPrefix(t.prefix);
      if (!p || !Kit.codex.prefixInfo(p)) out.errors.push({ path: 'codex.types.' + tn + '.prefix', message: 'Type ' + tn + ' uses an unknown prefix ' + t.prefix + '.' });
      else if (seen[p]) out.errors.push({ path: 'codex.types.' + tn + '.prefix', message: 'Types ' + seen[p] + ' and ' + tn + ' share the prefix ' + p + '.' });
      else seen[p] = tn;
      walkFields(t.fields, function (f, fp) {
        var where = 'codex.types.' + tn + '.' + fp;
        if (f.refPrefix) [].concat(f.refPrefix).forEach(function (rp) { if (!Kit.codex.prefixInfo(rp)) out.errors.push({ path: where, message: tn + '.' + fp + ' references unknown prefix ' + rp + '.' }); });
        if (f.enumFrom && resolves(b, f.enumFrom) < 0) out.errors.push({ path: where, message: tn + '.' + fp + ' reads a vocabulary at ' + f.enumFrom + ' that does not exist.' });
        if (f.rowsFrom && resolves(b, f.rowsFrom) < 0) out.errors.push({ path: where, message: tn + '.' + fp + ' reads rows at ' + f.rowsFrom + ' that do not exist.' });
      });
    });
    if (!U.isObj(cx.saveSchema) || !Array.isArray(cx.saveSchema.fields)) out.errors.push({ path: 'codex.saveSchema', message: 'The save schema is missing. Regenerate the Codex.' });
    if (!out.errors.length) out.state = 'ready';
    else if (out.state !== 'stale') out.state = 'invalid';
    out.ok = !out.errors.length;
    return out;
  };

  // ---------------------------------------------------------------- module validators
  function add(ctx, id, path, msg, level) { ctx.add({ recordId: id, fieldPath: path, message: msg, level: level || 'warning' }); }
  function rulesOf(b, p) { return b.rules && U.isObj(b.rules[p]) ? b.rules[p] : {}; }
  Kit.validate.register('codex', function (b, ctx) {
    if (!b.charter || !b.charter.locked) return;
    var c = WSX.check(b);
    c.errors.forEach(function (e) {
      var level = (c.state === 'stale' || /^codex\.version$/.test(e.path)) ? 'warning' : 'error';
      add(ctx, 'codex', e.path, e.message, level);
    });
    c.warnings.forEach(function (e) { add(ctx, 'codex', e.path, e.message, 'warning'); });
  });
  Kit.validate.register('codex.affinity', function (b, ctx) {
    var enms = rulesOf(b, 'enm_');
    Object.keys(enms).forEach(function (id) {
      var e = enms[id], ov = U.isObj(e.affinityOverrides) ? e.affinityOverrides : null;
      if (!ov || !e.family) return;
      var fe = Kit.index(b).byId[e.family];
      if (!fe) return;
      var def = WSX.defaultAffinity(b, fe.record.type, !!fe.record.absorbsOwnType);
      Object.keys(ov).forEach(function (k) {
        var d = def[k], o = ov[k];
        if (!o || !d) return;
        var good = { resist: 1, immune: 1, absorb: 1 };
        if ((good[d] && o === 'weak') || (d === 'weak' && good[o])) {
          add(ctx, id, 'affinityOverrides.' + k, 'Override ' + k + ' is ' + o + ' but the ' + fe.name + ' family ' + (d === 'weak' ? 'is weak to it' : (d === 'absorb' ? 'absorbs it' : 'resists it')) + '. Make sure this contradiction is intended.');
        }
      });
    });
  });
  Kit.validate.register('codex.slotLinks', function (b, ctx) {
    var eq = rulesOf(b, 'eqp_');
    Object.keys(eq).forEach(function (id) {
      var sl = eq[id].slotLayout;
      if (!U.isObj(sl) || !Array.isArray(sl.links)) return;
      var n = Number(sl.count) || 0;
      sl.links.forEach(function (lk, i) {
        var path = 'slotLayout.links[' + i + ']';
        if (!Array.isArray(lk) || lk.length !== 2) { add(ctx, id, path, 'Link ' + (i + 1) + ' must be a pair of slot numbers.'); return; }
        var a = Number(lk[0]), c = Number(lk[1]);
        if (!(a >= 0 && a < n) || !(c >= 0 && c < n)) add(ctx, id, path, 'Link ' + (i + 1) + ' (' + lk[0] + ' to ' + lk[1] + ') points past the ' + n + ' slot' + (n === 1 ? '' : 's') + ' this gear has.');
        else if (a === c) add(ctx, id, path, 'Link ' + (i + 1) + ' joins slot ' + a + ' to itself.');
      });
    });
  });
  Kit.validate.register('codex.materiaGrants', function (b, ctx) {
    var mats = rulesOf(b, 'mat_');
    var idx = Kit.index(b);
    Object.keys(mats).forEach(function (id) {
      var m = mats[id], allowed = MAT_GRANTS[m.kind];
      if (!allowed || !Array.isArray(m.grants)) return;
      m.grants.forEach(function (g, i) {
        if (!U.isObj(g) || !g.abl) return;
        var ab = idx.byId[g.abl];
        if (!ab || !ab.record.kind) return;
        if (allowed.indexOf(ab.record.kind) < 0) {
          add(ctx, id, 'grants[' + i + '].abl', m.kind === 'support'
            ? 'Support materia modifies its linked neighbor and should not grant abilities, but it grants ' + ab.name + '.'
            : ab.name + ' is ' + (/^[aeiou]/.test(ab.record.kind) ? 'an ' : 'a ') + ab.record.kind + ' ability, which ' + m.kind + ' materia should not grant (expected ' + allowed.join(' or ') + ').');
        }
      });
    });
  });
  Kit.validate.register('codex.gambitParams', function (b, ctx) {
    var idx = Kit.index(b);
    function checkRules(id, list, base) {
      if (!Array.isArray(list)) return;
      list.forEach(function (r, i) {
        var c = U.isObj(r) && U.isObj(r.condition) ? r.condition : null;
        if (!c || !c.kind) return;
        var path = base + '[' + i + '].condition.param', prm = c.param == null ? '' : String(c.param).trim();
        if (NUMERIC_CONDS[c.kind] && (prm === '' || !isFinite(Number(prm)))) add(ctx, id, path, 'Condition ' + c.kind + ' needs a number parameter.');
        if (STATUS_CONDS[c.kind]) {
          if (!/^sta_/.test(prm)) add(ctx, id, path, 'Condition ' + c.kind + ' needs a status ID parameter.');
          else if (!idx.byId[prm]) add(ctx, id, path, 'Broken reference: ' + prm + ' does not exist.', 'broken');
        }
      });
    }
    ['gmb_', 'bst_'].forEach(function (p) {
      var rs = rulesOf(b, p);
      Object.keys(rs).forEach(function (id) { checkRules(id, rs[id].rules, 'rules'); });
    });
  });
  Kit.validate.register('codex.formulaSource', function (b, ctx) {
    var fs = rulesOf(b, 'frm_');
    Object.keys(fs).forEach(function (id) {
      var f = fs[id], hasT = !!f.template, hasE = !!(f.expr && String(f.expr).trim());
      if (!hasT && !hasE) add(ctx, id, 'template', 'Choose a template or write an expression.');
      else if (hasT && hasE) add(ctx, id, 'expr', 'Both a template and an expression are set. The template wins.');
    });
  });
  Kit.validate.register('codex.orphans', function (b, ctx) {
    if (!b.codex || !b.codex.version || !U.isObj(b.codex.prefixes)) return;
    Object.keys(b.rules || {}).forEach(function (p) {
      var cp = b.codex.prefixes[p];
      if (cp && cp.type) return;
      Object.keys(b.rules[p] || {}).forEach(function (id) {
        add(ctx, id, 'id', 'No type in Codex version ' + b.codex.version + ' covers ' + p + ' records. The record is kept but inactive.');
      });
    });
  });
  Kit.jump.register({
    test: function (rid) { return rid === 'codex'; },
    name: function () { return 'Codex'; },
    go: function () { return Kit.go('codex'); }
  });

  // ---------------------------------------------------------------- UI helpers
  function uiGet() { var s = Kit.store.get(UI_KEY, {}); return U.isObj(s) ? s : {}; }
  function uiSet(patch) { var s = uiGet(); Object.keys(patch).forEach(function (k) { s[k] = patch[k]; }); Kit.store.set(UI_KEY, s); }
  function typeDetail(f) {
    var bits = [];
    if (f.refPrefix) bits.push('refs ' + [].concat(f.refPrefix).join(' '));
    if (f.enumFrom) bits.push('from ' + f.enumFrom);
    if (f.rowsFrom) bits.push('rows from ' + f.rowsFrom);
    if (f.values) bits.push(f.values.map(function (v) { return U.isObj(v) ? v.key : v; }).join(' | '));
    if (f.cellValues) bits.push('cells ' + f.cellValues.map(function (v) { return U.isObj(v) ? v.key : v; }).join(' | '));
    if (f.cell && f.type === 'table') bits.push('cell ' + f.cell);
    if (f.min != null || f.max != null) bits.push((f.min != null ? f.min : '') + ' to ' + (f.max != null ? f.max : ''));
    if (f.derived) bits.push('derived, read only');
    return bits.join('; ');
  }
  function fieldRows(fields, depth, rows) {
    (fields || []).forEach(function (f) {
      if (!f || !f.key) return;
      var fwdInfo = f.refPrefix && [].concat(f.refPrefix).every(function (p) { var i = Kit.codex.prefixInfo(p); return i && i.forge !== 146; });
      rows.push('<tr><td class="cx-key" style="padding-left:' + (8 + depth * 16) + 'px"><code>' + U.esc(f.key) + '</code>' + (f.required ? ' <span class="req" title="Required">*</span>' : '') + '</td>' +
        '<td>' + U.esc(f.label || f.key) + '</td>' +
        '<td><span class="chip chip-muted">' + U.esc(f.type) + '</span>' + (fwdInfo || f.forward ? ' <span class="chip chip-forward">Forward &middot; ' + U.esc(Kit.codex.ownerOf([].concat(f.refPrefix)[0])) + '</span>' : '') + '</td>' +
        '<td class="cx-detail">' + U.esc(typeDetail(f)) + '</td></tr>');
      if (Array.isArray(f.of)) fieldRows(f.of, depth + 1, rows);
      else if (U.isObj(f.of) && f.of.type) fieldRows([Object.assign({ key: '[item]', label: 'Each item' }, f.of)], depth + 1, rows);
    });
    return rows;
  }
  function fieldsTable(fields, withBase) {
    var all = withBase ? [{ key: 'id', label: 'ID', type: 'text', required: true, readOnly: true }, { key: 'name', label: 'Name', type: 'text', required: true }, { key: 'charterVersion', label: 'Charter version', type: 'int' }].concat(fields, [{ key: 'notes', label: 'Notes', type: 'longtext' }]) : fields;
    return '<div class="tbl-wrap"><table class="tbl cx-fields"><thead><tr><th scope="col">Key</th><th scope="col">Label</th><th scope="col">Type</th><th scope="col">Detail</th></tr></thead><tbody>' + fieldRows(all, 0, []).join('') + '</tbody></table></div>';
  }
  function showReport(full) {
    var r = full.report || {};
    Kit.ui.dialog({
      title: 'Codex version ' + full.version + ' generated', wide: true,
      body: function (body) {
        body.appendChild(U.el('p', null, 'Built from Charter version ' + full.charterVersion + '. ' + full.preserved + ' Rules record' + (full.preserved === 1 ? ' was' : 's were') + ' preserved; regenerating never deletes records.'));
        body.appendChild(reportNode(full));
      },
      actions: [{ label: 'Close', kind: 'primary' }]
    });
  }
  function reportNode(full) {
    var r = full.report || {}, wrap = U.el('div', 'cx-report');
    var parts = [];
    if (r.typesAdded && r.typesAdded.length && !full.first) parts.push('<p><strong>Types added:</strong> ' + r.typesAdded.map(U.esc).join(', ') + '</p>');
    if (r.typesRemoved && r.typesRemoved.length) parts.push('<p><strong>Types removed:</strong> ' + r.typesRemoved.map(U.esc).join(', ') + '</p>');
    (r.fields || []).forEach(function (f) {
      var li = [];
      f.added.forEach(function (p) { li.push('<li><span class="chip chip-ok">added</span> <code>' + U.esc(p) + '</code></li>'); });
      f.removed.forEach(function (p) { li.push('<li><span class="chip chip-error">removed</span> <code>' + U.esc(p) + '</code></li>'); });
      f.retyped.forEach(function (p) { li.push('<li><span class="chip chip-warning">retyped</span> <code>' + U.esc(p) + '</code></li>'); });
      parts.push('<div class="cx-report-type"><strong>' + U.esc(f.type) + '</strong> <code>' + U.esc(f.prefix) + '</code><ul class="diff-list">' + li.join('') + '</ul></div>');
    });
    (full.orphans || []).forEach(function (o) { parts.push('<p class="cx-orphan">' + Kit.icon('warn') + ' ' + o.count + ' ' + U.esc(o.prefix) + ' record' + (o.count === 1 ? ' has' : 's have') + ' no type in this Codex. They are kept and flagged as inactive.</p>'); });
    if (full.first) parts.push('<p>' + (r.typesAdded || []).length + ' record types created.</p>');
    else if (!parts.length) parts.push('<p class="muted">No fields were added or removed.</p>');
    wrap.innerHTML = parts.join('');
    return wrap;
  }

  // ---------------------------------------------------------------- render
  var st = { filter: '' };
  function statusChip(c) {
    if (c.state === 'ready') return '<span class="chip chip-ok">' + Kit.icon('check') + 'Valid</span>';
    if (c.state === 'stale') return '<span class="chip chip-warning">' + Kit.icon('warn') + 'Needs regenerating</span>';
    if (c.state === 'invalid') return '<span class="chip chip-error">' + Kit.icon('warn') + 'Invalid</span>';
    return '<span class="chip chip-muted">Not generated</span>';
  }
  function paintBar(host, b, c) {
    var bar = U.el('section', 'panel cx-bar');
    var info = U.el('div', 'cx-bar-info');
    var cx = b.codex || {};
    info.innerHTML = '<h2 class="panel-title">Codex ' + statusChip(c) + (cx.version ? '<span class="chip chip-accent">v' + cx.version + '</span>' : '') + '</h2>' +
      '<p class="cx-hint">' + (cx.version
        ? 'Generated from Charter v' + U.esc(cx.generatedFromCharter) + ' with the ' + U.esc(b.charter.ruleset.progression || 'no') + ' module on ' + U.esc(U.fmtDate ? U.fmtDate(cx.generatedAt) : cx.generatedAt) + '.'
        : 'The Codex turns the locked ruleset into record types, ID prefixes, and a save schema. Rules opens once it validates.') + '</p>';
    bar.appendChild(info);
    var acts = U.el('div', 'cx-bar-actions');
    var gen = U.el('button', 'btn ' + (c.state === 'ready' ? '' : 'btn-primary'), Kit.icon('spark') + '<span>' + (cx.version ? 'Regenerate' : 'Generate Codex') + '</span>');
    gen.type = 'button';
    gen.title = cx.version ? 'Rebuild the Codex from the locked ruleset. Records are kept.' : 'Build the Codex from the locked ruleset.';
    gen.addEventListener('click', async function () {
      if (cx.version && c.state === 'ready') {
        var ok = await Kit.ui.confirm({ title: 'Regenerate the Codex?', message: 'The Codex is already current. Regenerating rebuilds the types from the ruleset and keeps every record.', okLabel: 'Regenerate' });
        if (!ok) return;
      }
      var r = WSX.generate();
      if (!r.ok) Kit.ui.toast(r.reason, 'warn');
    });
    acts.appendChild(gen);
    if (c.ok) {
      var go = U.el('button', 'btn btn-primary', Kit.icon('sword') + '<span>Open Rules</span>'); go.type = 'button';
      go.addEventListener('click', function () { Kit.go('rules'); });
      acts.appendChild(go);
    }
    bar.appendChild(acts);
    host.appendChild(bar);
    if (c.errors.length || c.warnings.length) {
      var iss = U.el('section', 'panel cx-issues');
      iss.innerHTML = '<h3 class="section-h">' + (c.errors.length ? 'Blocking issues' : 'Advisories') + '</h3>';
      var ul = U.el('ul', 'diff-list');
      c.errors.forEach(function (e) { ul.appendChild(U.el('li', null, '<span class="chip chip-error">error</span><span>' + U.esc(e.message) + '</span>')); });
      c.warnings.forEach(function (e) { ul.appendChild(U.el('li', null, '<span class="chip chip-warning">warning</span><span>' + U.esc(e.message) + '</span>')); });
      iss.appendChild(ul);
      host.appendChild(iss);
    }
  }
  function paintEmpty(host) {
    var p = U.el('section', 'panel cx-empty');
    p.innerHTML = '<div class="stub-glyph">' + Kit.icon('book') + '</div><h2>No Codex yet</h2><p>Generate the Codex to turn your locked ruleset into record types. Nothing is created in Rules; the Codex only defines what records can hold.</p>';
    var gen = U.el('button', 'btn btn-primary', Kit.icon('spark') + '<span>Generate Codex</span>'); gen.type = 'button';
    gen.addEventListener('click', function () { var r = WSX.generate(); if (!r.ok) Kit.ui.toast(r.reason, 'warn'); });
    p.appendChild(gen);
    host.appendChild(p);
  }
  function typeCard(b, t, counts, openSet) {
    var info = Kit.codex.prefixInfo(t.prefix) || {};
    var opened = Kit.codex.isOpened(info.ns, b);
    var det = U.el('details', 'cx-type');
    det.dataset.type = t.name;
    if (openSet[t.name]) det.open = true;
    var sum = U.el('summary');
    sum.innerHTML = '<span class="cx-type-name">' + U.esc(t.label || t.name) + '</span>' +
      '<span class="cx-type-meta"><code class="cx-prefix">' + U.esc(t.prefix) + '</code>' +
      '<span class="chip chip-muted">forge ' + U.esc(info.forge) + '</span>' +
      '<span class="chip ' + (opened ? 'chip-ok' : 'chip-muted') + '">' + U.esc(info.ns) + (opened ? ' open' : ' closed') + '</span>' +
      '<span class="chip chip-accent">' + (counts[t.prefix] || 0) + ' record' + ((counts[t.prefix] || 0) === 1 ? '' : 's') + '</span></span>';
    det.appendChild(sum);
    det.addEventListener('toggle', function () { var o = uiGet().open || {}; if (det.open) o[t.name] = 1; else delete o[t.name]; uiSet({ open: o }); if (det.open && !det.dataset.painted) paintTypeBody(det, t); });
    if (det.open) paintTypeBody(det, t);
    return det;
  }
  function paintTypeBody(det, t) {
    det.dataset.painted = '1';
    var body = U.el('div', 'cx-type-body');
    var deps = (t.dependsOn || []).length ? t.dependsOn.map(function (d) { return '<code class="chip chip-muted">' + U.esc(d) + '</code>'; }).join(' ') : '<span class="muted">No Charter dependencies.</span>';
    body.innerHTML = '<p class="cx-deps"><strong>Depends on:</strong> ' + deps + '</p>' + fieldsTable(t.fields, true);
    det.appendChild(body);
  }
  function paintTypes(host, b) {
    var types = Kit.codex.types(b), counts = recordsByPrefix(b), openSet = uiGet().open || {};
    var sec = U.el('section', 'panel cx-types');
    var head = U.el('div', 'cx-sec-head');
    head.innerHTML = '<h3 class="section-h">Record types</h3>';
    var srch = U.el('input', 'inp cx-search'); srch.type = 'search'; srch.placeholder = 'Filter by name, prefix, or field'; srch.setAttribute('aria-label', 'Filter record types'); srch.value = st.filter;
    head.appendChild(srch);
    sec.appendChild(head);
    var groupsHost = U.el('div');
    sec.appendChild(groupsHost);
    function paint() {
      U.clear(groupsHost);
      var q = st.filter.trim().toLowerCase(), any = false;
      GROUPS.forEach(function (g) {
        var list = Object.keys(types).map(function (k) { return types[k]; }).filter(function (t) {
          if (!t.prefix || t.section || t.name === 'ZzDemo') return false;
          var grp = t.group || (t.prefix === 'chp_' ? 'charter' : 'core');
          if (grp !== g.key) return false;
          if (!q) return true;
          var hay = [t.name, t.label, t.prefix].concat(Object.keys(fieldPaths(t.fields, '', {}))).join(' ').toLowerCase();
          return hay.indexOf(q) >= 0;
        });
        if (!list.length) return;
        any = true;
        var gh = U.el('div', 'cx-group');
        gh.innerHTML = '<h4 class="cx-group-h">' + U.esc(g.label) + ' <span class="muted">' + list.length + '</span></h4><p class="muted cx-group-text">' + U.esc(g.text) + '</p>';
        var grid = U.el('div', 'cx-type-list');
        list.forEach(function (t) { grid.appendChild(typeCard(b, t, counts, openSet)); });
        gh.appendChild(grid);
        groupsHost.appendChild(gh);
      });
      if (!any) groupsHost.appendChild(U.el('p', 'empty-line', 'No types match that filter.'));
    }
    srch.addEventListener('input', U.debounce(function () { st.filter = srch.value; paint(); }, 150));
    paint();
    host.appendChild(sec);
  }
  function paintPrefixes(host, b) {
    var cx = b.codex || {}, counts = recordsByPrefix(b);
    var sec = U.el('details', 'panel cx-block');
    sec.open = !!uiGet().prefixesOpen;
    sec.addEventListener('toggle', function () { uiSet({ prefixesOpen: sec.open }); });
    var rows = Object.keys(Kit.codex.PREFIXES).sort(function (x, y) {
      var a = Kit.codex.PREFIXES[x], c = Kit.codex.PREFIXES[y];
      return (a.forge - c.forge) || x.localeCompare(y);
    }).map(function (p) {
      var info = Kit.codex.PREFIXES[p], cp = U.isObj(cx.prefixes) ? cx.prefixes[p] : null;
      var tn = cp && cp.type ? cp.type : null;
      var opened = Kit.codex.isOpened(info.ns, b);
      var state = tn ? '<span class="chip chip-accent">' + U.esc(tn) + '</span>' : info.forge !== 146 ? '<span class="chip chip-forward">Owed by ' + info.forge + '</span>' : '<span class="chip chip-muted">Inactive module</span>';
      return '<tr><td><code>' + U.esc(p) + '</code></td><td>' + U.esc(info.ns) + ' <span class="chip ' + (opened ? 'chip-ok' : 'chip-muted') + '">' + (opened ? 'open' : 'closed') + '</span></td><td>' + info.forge + '</td><td>' + U.esc(info.module || 'core') + '</td><td>' + state + '</td><td class="num">' + (counts[p] || 0) + '</td></tr>';
    });
    sec.innerHTML = '<summary class="cx-block-sum"><h3 class="section-h">Prefix table</h3><span class="muted">' + rows.length + ' prefixes</span></summary>' +
      '<div class="tbl-wrap"><table class="tbl"><thead><tr><th scope="col">Prefix</th><th scope="col">Namespace</th><th scope="col">Forge</th><th scope="col">Module</th><th scope="col">Type</th><th scope="col">Records</th></tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
    host.appendChild(sec);
  }
  // Forward slots: every field that can hold an ID owed by a later forge, plus the forward IDs actually held today.
  WSX.forwardSlots = function (b) {
    b = b || cur();
    var types = Kit.codex.types(b), out = {};
    function bucket(f) { return out[f] = out[f] || { forge: f, name: FORGE_NAMES[f] || ('Forge ' + f), slots: [], held: [] }; }
    Object.keys(types).forEach(function (tn) {
      var t = types[tn];
      if (!t.prefix || t.section || tn === 'ZzDemo') return;
      walkFields(t.fields, function (f, fp) {
        if (!f.refPrefix) return;
        [].concat(f.refPrefix).forEach(function (p) {
          var info = Kit.codex.prefixInfo(p);
          if (info && info.forge !== 146) bucket(info.forge).slots.push({ type: tn, typePrefix: t.prefix, field: fp, prefix: Kit.codex.normPrefix(p) });
        });
      });
    });
    if (b.codex && b.codex.saveSchema) walkFields(b.codex.saveSchema.fields, function (f, fp) {
      if (!f.refPrefix) return;
      [].concat(f.refPrefix).forEach(function (p) { var info = Kit.codex.prefixInfo(p); if (info && info.forge !== 146) bucket(info.forge).slots.push({ type: 'SaveGame', typePrefix: 'save', field: fp, prefix: Kit.codex.normPrefix(p) }); });
    });
    var res = Kit.validate(b);
    res.forward.forEach(function (it) { if (it.owedBy) bucket(it.owedBy).held.push({ id: it.id, recordId: it.recordId, fieldPath: it.fieldPath }); });
    return Object.keys(out).sort().map(function (k) { return out[k]; });
  };
  function paintForward(host, b) {
    var sec = U.el('section', 'panel cx-block cx-forward');
    sec.innerHTML = '<h3 class="section-h">Forward slots by owing forge</h3><p class="muted">Fields that hold IDs from later forges. They are legal now and listed in the export manifest as owed.</p>';
    var grid = U.el('div', 'cx-fwd-grid');
    WSX.forwardSlots(b).forEach(function (g) {
      var card = U.el('div', 'card cx-fwd');
      var byPrefix = {};
      g.slots.forEach(function (s) { (byPrefix[s.prefix] = byPrefix[s.prefix] || []).push(s); });
      var lines = Object.keys(byPrefix).sort().map(function (p) {
        return '<li><code>' + U.esc(p) + '</code><span>' + byPrefix[p].map(function (s) { return U.esc(s.typePrefix === 'save' ? 'save' : s.typePrefix) + '.' + U.esc(s.field); }).join(', ') + '</span></li>';
      });
      card.innerHTML = '<div class="cx-fwd-head"><strong>' + U.esc(g.name) + '</strong><span class="chip chip-forward">forge ' + g.forge + '</span></div>' +
        '<p class="muted">' + g.slots.length + ' slot' + (g.slots.length === 1 ? '' : 's') + ' declared, ' + g.held.length + ' forward ID' + (g.held.length === 1 ? '' : 's') + ' held.</p>' +
        '<ul class="cx-fwd-list">' + lines.join('') + '</ul>';
      if (g.held.length) {
        var hl = U.el('div', 'cx-held');
        g.held.slice(0, 12).forEach(function (h) {
          var bt = U.el('button', 'btn btn-ghost cx-held-btn', '<code>' + U.esc(h.id) + '</code><span class="muted">in ' + U.esc(h.recordId) + '</span>'); bt.type = 'button';
          bt.addEventListener('click', function () { Kit.jump(h.recordId, h.fieldPath); });
          hl.appendChild(bt);
        });
        if (g.held.length > 12) hl.appendChild(U.el('span', 'muted', '+' + (g.held.length - 12) + ' more'));
        card.appendChild(hl);
      }
      grid.appendChild(card);
    });
    sec.appendChild(grid);
    host.appendChild(sec);
  }
  function paintSave(host, b) {
    var ss = b.codex && b.codex.saveSchema;
    if (!ss) return;
    var sec = U.el('details', 'panel cx-block');
    sec.open = !!uiGet().saveOpen;
    sec.addEventListener('toggle', function () { uiSet({ saveOpen: sec.open }); });
    var pol = ss.policy || {};
    sec.innerHTML = '<summary class="cx-block-sum"><h3 class="section-h">Save schema</h3><span class="muted">v' + ss.schemaVersion + ' &middot; ' + (pol.slots || 0) + ' slot' + (pol.slots === 1 ? '' : 's') + ', ' + U.esc(pol.mode || 'no mode') + (pol.suspend ? ', suspend on' : '') + '</span></summary>' +
      '<p class="muted">Stored at codex.saveSchema. Game builds write saves in this shape; bundleHash ties a save to the bundle it was made against.</p>' + fieldsTable(ss.fields, false);
    host.appendChild(sec);
  }
  function paintLastReport(host, b) {
    var rep = Kit.store.get(REPORT_KEY, null);
    if (!U.isObj(rep) || !b.codex.version || rep.version !== b.codex.version || rep.first) return;
    var sec = U.el('details', 'panel cx-block');
    sec.innerHTML = '<summary class="cx-block-sum"><h3 class="section-h">Last regeneration</h3><span class="muted">v' + rep.version + ' from Charter v' + rep.charterVersion + '</span></summary>';
    sec.appendChild(reportNode(rep));
    host.appendChild(sec);
  }
  WSX.canEnter = function (b) { return b && b.charter.locked ? true : 'Lock the Charter to open the Codex.'; };
  WSX.render = function (host) {
    var b = cur(), c = WSX.check(b);
    paintBar(host, b, c);
    if (!b.codex.version) { paintEmpty(host); return; }
    paintLastReport(host, b);
    paintTypes(host, b);
    paintForward(host, b);
    paintPrefixes(host, b);
    paintSave(host, b);
  };
  WSX.focus = function (rid) {
    var t = Kit.codex.typeFor(Kit.ids.prefixOf(rid) || '');
    var el = t && document.querySelector('.cx-type[data-type="' + t + '"]');
    if (el) { el.open = true; el.scrollIntoView({ block: 'start' }); }
  };
  WSX.FORMULA_IDS = FORMULA_IDS;
  WSX.ABL_KINDS = ABL_KINDS;
  WSX.MAT_KINDS = MAT_KINDS;
  WSX.MAT_GRANTS = MAT_GRANTS;
  WSX.AFFINITIES = AFFINITIES;
  WSX.COND_KINDS = COND_KINDS;
  WSX.SELECTORS = SELECTORS;
  WSX.TRIGGERS = TRIGGERS;
  WSX.SUPPORT_EFFECTS = SUPPORT_EFFECTS;
  WSX.MODULE_TYPE = MODULE_TYPE;
  Kit.mount('codex', { title: 'Codex', icon: 'book', canEnter: WSX.canEnter, render: WSX.render, focus: function (rid) { WSX.focus(rid); } });
})();
// === WS:CODEX END ===
