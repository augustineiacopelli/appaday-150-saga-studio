// Developer tool, the Studio's counterpart to each forge's build.js. It copies, never edits, the owners' sources into
// this repository and proves they are byte for byte what the owners hold. The shipped page has no build step.
//
//   node vendor.js           copy every vendored file from the owners, derive core/styles.js and core/engine-text.js,
//                            write forge/manifest.json, then verify
//   node vendor.js --check   verify only (nothing is written); exits 1 on any difference
//
// Owners: Day 146 holds KIT:CORE, the five workspace fences (charter, codex, rules, arena, sim) and the ENGINE:BATTLE fence.
// Days 147, 148 and 149 hold their src files. The five engines come from Day 149's repository root (its game kit) and are
// checked against their own owners. app-boot.js and the demo fixtures of each forge are deliberately not vendored: the
// Studio has its own boot, and its fixtures come from test/make-demo.js running Day 149's page.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CHECK = process.argv.includes('--check');
const src146 = fs.readFileSync(require('./day146'), 'utf8');
const dir147 = require('./day147'), dir148 = require('./day148'), dir149 = require('./day149');
const root = (p) => path.join(__dirname, p);
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const noHashLine = (s) => s.replace(/^\/\* Bundle hash [0-9a-f]+ \*\/\n/m, '');
let failures = 0;
const fail = (m) => { failures++; console.error('FAIL ' + m); };

function fence(text, open, close, what) {
  const a = text.indexOf(open), z = text.indexOf(close);
  if (a < 0 || z < a || text.indexOf(open, a + 1) >= 0) throw new Error('Fence not found exactly once: ' + (what || open));
  return text.slice(a, z + close.length);
}
const jsFence = (name) => fence(src146, '// === ' + name + ' BEGIN ===', '// === ' + name + ' END ===', name) + '\n';
const cssFence = (name) => fence(src146, '/* === ' + name + ' CSS BEGIN === */', '/* === ' + name + ' CSS END === */', name + ' CSS') + '\n';

// ---------------------------------------------------------------- the vendored file list
// Each entry: out (path here), owner (day), from (a description), text (what the owner holds, as a string).
const files = [];
function add(out, owner, from, text) { files.push({ out, owner, from, text }); }
const fromDir = (dir, owner, rel) => fs.readFileSync(path.join(dir, rel), 'utf8');

// Day 146: KIT:CORE once, then the five workspace fences. KIT:CORE keeps its markers so it can be re-verified at any time.
add('core/kit.js', '146', 'index.html KIT:CORE fence', jsFence('KIT:CORE'));
add('core/kit.css', '146', 'index.html KIT:CORE CSS fence', cssFence('KIT:CORE'));
const WS146 = ['charter', 'codex', 'rules', 'arena', 'sim'];
WS146.forEach((n) => {
  add('forge/146/ws-' + n + '.js', '146', 'index.html WS:' + n.toUpperCase() + ' fence', jsFence('WS:' + n.toUpperCase()));
  add('forge/146/ws-' + n + '.css', '146', 'index.html WS:' + n.toUpperCase() + ' CSS fence', cssFence('WS:' + n.toUpperCase()));
});

// Days 147 to 149: the src files each build.js splices into its page, in its order, minus app-boot.js and the demo fixture.
const html147 = fromDir(dir147, '147', 'index.html');
const artShell = fence(html147, '/* === ART:SHELL CSS BEGIN === */', '/* === ART:SHELL CSS END === */', 'ART:SHELL CSS') + '\n';
const LIST = {
  '147': {
    dir: dir147,
    js: ['art-store', 'art-contract', 'art-palette', 'ws-palette', 'art-sprites', 'art-pixed', 'ws-sprites', 'ws-interface', 'art-motion', 'ws-motion', 'art-tiles', 'ws-world', 'ws-playtest', 'art-ui', 'art-battle', 'ws-battle', 'art-audio', 'ws-sound', 'art-links', 'art-ai', 'art-coverage', 'ws-art147'],
    css: ['art-palette', 'art-sprites', 'art-motion', 'art-world', 'art-ui', 'art-sound', 'art-ai', 'art-coverage']
  },
  '148': {
    dir: dir148,
    js: ['world-store', 'world-generate', 'world-checks', 'world-bake', 'world-viewer', 'world-audio', 'ws-world', 'ws-sites', 'ws-encounters', 'ws-validation', 'ws-world148'],
    css: ['world-shell', 'world-viewer', 'world-map', 'world-sites', 'world-encounters', 'world-validation']
  },
  '149': {
    dir: dir149,
    js: ['story-store', 'story-scaffold', 'story-quests', 'story-dialogue', 'story-events', 'story-endings', 'story-checks', 'story-day150', 'ws-flags', 'ws-cond', 'ws-quests', 'ws-dialogue', 'ws-events', 'ws-endings', 'ws-validation', 'ws-story149'],
    css: ['story-shell', 'story-flags', 'story-quests', 'story-dialogue', 'story-events', 'story-endings', 'story-validation']
  }
};
add('forge/147/art-shell.css', '147', 'index.html ART:SHELL CSS fence', artShell);
Object.keys(LIST).forEach((day) => {
  const L = LIST[day];
  L.js.forEach((n) => { if (fs.existsSync(path.join(L.dir, 'src', n + '.js'))) add('forge/' + day + '/' + n + '.js', day, 'src/' + n + '.js', fromDir(L.dir, day, 'src/' + n + '.js')); else fail('Day ' + day + ' has no src/' + n + '.js'); });
  L.css.forEach((n) => { if (fs.existsSync(path.join(L.dir, 'src', n + '.css'))) add('forge/' + day + '/' + n + '.css', day, 'src/' + n + '.css', fromDir(L.dir, day, 'src/' + n + '.css')); else fail('Day ' + day + ' has no src/' + n + '.css'); });
});

// The five engines, copied from Day 149's root and checked against their owners. engine-world.js may carry one exported
// '/* Bundle hash <hex> */' line; the comparison and the recorded hash ignore it, as Day 149's build does.
const ENGINES = [
  { file: 'engine-render.js', global: 'ENGINE_RENDER', owner: '147', ownerText: () => fromDir(dir147, '147', 'engine-render.js') },
  { file: 'engine-audio.js', global: 'ENGINE_AUDIO', owner: '147', ownerText: () => fromDir(dir147, '147', 'engine-audio.js') },
  { file: 'engine-world.js', global: 'ENGINE_WORLD', owner: '148', ownerText: () => fromDir(dir148, '148', 'engine-world.js') },
  { file: 'engine-battle.js', global: 'ENGINE_BATTLE', owner: '146', ownerText: null },
  { file: 'engine-story.js', global: 'ENGINE_STORY', owner: '149', ownerText: () => fromDir(dir149, '149', 'engine-story.js') }
];
const BATTLE_OPEN = '// === ENGINE:BATTLE BEGIN ===', BATTLE_CLOSE = '// === ENGINE:BATTLE END ===';
function battleInner(text) {
  let a = text.indexOf(BATTLE_OPEN), z = text.indexOf(BATTLE_CLOSE, a + 1);
  if (a < 0 || z < 0) throw new Error('ENGINE:BATTLE fence not found in Day 146.');
  a = text.indexOf('\n', a); z = text.lastIndexOf('\n', z);
  return text.slice(a + 1, z + 1);
}
const battleSrc = battleInner(src146);
const engineTexts = {};
ENGINES.forEach((e) => {
  const t = fromDir(dir149, '149', e.file);
  engineTexts[e.file] = t;
  add('engines/' + e.file, '149', 'repository root ' + e.file, t);
  // verified against the engine's own owner
  if (e.ownerText) { if (noHashLine(e.ownerText()) !== noHashLine(t)) fail(e.file + ' in Day 149 differs from its owner, Day ' + e.owner + '.'); }
  else if (t.slice(t.indexOf('*/\n') + 3) !== battleSrc) fail('engine-battle.js in Day 149 differs from Day 146\'s ENGINE:BATTLE fence.');
  // permanent assertion: an engine must inline into a script element byte for byte
  if (/<\/script/i.test(t)) fail(e.file + ' contains a closing script tag and could not be inlined byte for byte.');
});

// The game kit table Day 149's build.js writes into its page (the one build time placeholder in the vendored sources:
// ws-story149.js carries /*ENGINE_FILES*/null). Same fields, same order, same version and hash rules; checked below against
// the table in Day 149's own built page, so the Studio hands the forge exactly what its build would have.
const ENGINE_KEYS = { 'engine-render.js': 'render', 'engine-audio.js': 'audio', 'engine-world.js': 'world', 'engine-battle.js': 'battle', 'engine-story.js': 'story' };
const engineFiles = ENGINES.map((e) => {
  const t = engineTexts[e.file];
  return { key: ENGINE_KEYS[e.file], file: e.file, global: e.global, owner: Number(e.owner), version: (/engine version ([0-9.]+)/.exec(t.slice(0, 400)) || /version: '([0-9.]+)'/.exec(t) || [0, 'unknown'])[1], bytes: Buffer.byteLength(noHashLine(t)), sha256: sha(noHashLine(t)) };
});
{
  const page149 = fromDir(dir149, '149', 'index.html');
  const m = /FILES: (\[\{.*?\}\]) \}/.exec(page149);
  if (!m) fail('Day 149\'s page carries no engine table.');
  else if (JSON.stringify(JSON.parse(m[1])) !== JSON.stringify(engineFiles)) fail('The engine table derived here differs from the one in Day 149\'s page.');
}

// ---------------------------------------------------------------- derived files
// Derived files hold the same text in a form a page with no build step can read. They are regenerated, never edited.
const esc = (s) => JSON.stringify(s).replace(/<\//g, '<\\/').replace(/[\u007f-\uffff]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));
function stageCss(list) { return list.map((f) => files.find((x) => x.out === f).text.trim()).join('\n') + '\n'; }
const css = {
  charter: stageCss(WS146.map((n) => 'forge/146/ws-' + n + '.css')),
  art: stageCss(['forge/147/art-shell.css'].concat(LIST['147'].css.map((n) => 'forge/147/' + n + '.css'))),
  world: stageCss(LIST['148'].css.map((n) => 'forge/148/' + n + '.css')),
  story: stageCss(LIST['149'].css.map((n) => 'forge/149/' + n + '.css'))
};
add('core/styles.js', 'derived', 'each stage\'s vendored stylesheets, concatenated in page order, as strings for runtime selector scoping',
  '// Derived by vendor.js. Do not edit. Each forge\'s stylesheets as one string per stage; core/studio.js scopes the selectors.\n' +
  'window.STUDIO_STYLES = {\n' + Object.keys(css).map((k) => '  ' + k + ': ' + esc(css[k])).join(',\n') + '\n};\n');
const eng = {};
ENGINES.forEach((e) => { eng[e.file.replace(/^engine-|\.js$/g, '')] = engineTexts[e.file]; });
// Kit.engine.source() is the text between Day 146's two ENGINE:BATTLE marker lines, not the file with its header.
add('core/engine-text.js', 'derived', 'the five engine files as strings, plus the ENGINE:BATTLE fence text Kit.engine.source() returns',
  '// Derived by vendor.js. Do not edit. The engine files as strings (the Studio reads them when a forge asks for engine source).\n' +
  'window.STUDIO_ENGINE_TEXT = {\n' + Object.keys(eng).map((k) => '  ' + k + ': ' + esc(eng[k])).join(',\n') + ',\n  battleFence: ' + esc(battleSrc) + '\n};\n' +
  '// The game kit table (key, file, global, owner, version, bytes, sha256 per engine, in load order).\n' +
  'window.STUDIO_ENGINE_FILES = ' + JSON.stringify(engineFiles) + ';\n');

// Phase 6: the player as strings, so Build game can write a game from the Studio page alone (also opened from disk, where
// a browser refuses to read files beside the page). The player is the Studio's own, not vendored, so its source of truth is
// player/; this derived copy is checked against it like every other derived file. The same permanent assertion as the
// engines: what Build game inlines must go into a script or style element byte for byte, and be ASCII.
const playerJs = fs.readFileSync(root('player/player.js'), 'utf8'), playerCss = fs.readFileSync(root('player/player.css'), 'utf8');
if (/<\/script/i.test(playerJs)) fail('player/player.js contains a closing script tag and could not be inlined byte for byte.');
if (/<\/style/i.test(playerCss)) fail('player/player.css contains a closing style tag and could not be inlined byte for byte.');
[['player/player.js', playerJs], ['player/player.css', playerCss]].concat(ENGINES.map((e) => ['engines/' + e.file, engineTexts[e.file]])).forEach((p) => {
  if (/[^\x00-\x7f]/.test(p[1])) fail(p[0] + ' is not pure ASCII, so it could not be inlined byte for byte.');
});
add('core/player-text.js', 'derived', 'player/player.js and player/player.css as strings with their sha256, for Build game',
  '// Derived by vendor.js from player/. Do not edit. Build game writes the player from these strings and checks each sha256.\n' +
  'window.STUDIO_PLAYER_TEXT = {\n  js: ' + esc(playerJs) + ',\n  css: ' + esc(playerCss) + ',\n  sha256: ' +
  JSON.stringify({ js: sha(playerJs), css: sha(playerCss) }) + '\n};\n');

// ---------------------------------------------------------------- write or verify
const manifest = [];
files.forEach((f) => {
  const abs = root(f.out);
  if (!CHECK) { fs.mkdirSync(path.dirname(abs), { recursive: true }); fs.writeFileSync(abs, f.text); }
  const have = fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : null;
  if (have !== f.text) fail(f.out + (have === null ? ' is missing.' : ' differs from ' + (f.owner === 'derived' ? 'what vendor.js derives.' : 'Day ' + f.owner + ' (' + f.from + ').')));
  manifest.push({ path: f.out, owner: f.owner, from: f.from, bytes: Buffer.byteLength(f.text), sha256: sha(f.text) });
});
const engineTable = ENGINES.map((e) => ({ file: 'engines/' + e.file, global: e.global, owner: e.owner, sha256: sha(noHashLine(engineTexts[e.file])) }));
const manText = JSON.stringify({ note: 'Written by vendor.js. Every entry is byte for byte what its owner holds; node vendor.js --check proves it.', engines: engineTable, files: manifest }, null, 1) + '\n';
if (!CHECK) fs.writeFileSync(root('forge/manifest.json'), manText);
else if (!fs.existsSync(root('forge/manifest.json')) || fs.readFileSync(root('forge/manifest.json'), 'utf8') !== manText) fail('forge/manifest.json is missing or stale.');

const owners = {};
manifest.forEach((m) => { owners[m.owner] = (owners[m.owner] || 0) + 1; });
console.log('vendor.js ' + (CHECK ? 'check' : 'run') + ': ' + manifest.length + ' files (' + Object.keys(owners).map((k) => (k === 'derived' ? 'derived' : 'Day ' + k) + ' ' + owners[k]).join(', ') + ')');
engineTable.forEach((e) => console.log('  ' + e.file + ' ' + e.sha256.slice(0, 16) + ' owner Day ' + e.owner));
if (failures) { console.error(failures + ' problem(s).'); process.exit(1); }
console.log('All vendored files are byte for byte what their owners hold.');
