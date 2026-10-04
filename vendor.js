// Saga Studio vendor tool (AppADay 150). A developer tool, like each forge's build.js; the shipped page has no build step.
// It copies, never edits, the four forges' code into this repository and proves every copy is byte for byte its owner's.
//
//   core/kit.js, core/kit.css   KIT:CORE and KIT:CORE CSS, cut once from Day 146's page (every forge carries it verbatim;
//                               the check below proves Days 147, 148, and 149 still do).
//   forge/<day>/<fence>.js|css  one file per fence, cut from each forge's built index.html in page order: 146's WS:CHARTER
//                               through WS:SIM, and every fence of 147, 148, and 149, except KIT:CORE, the engine fences
//                               (they live in engines/), the demo fixtures (ART:DEMO, WORLD:DEMO, STORY:DEMO), and
//                               APP:BOOT. Each file is the fence text, BEGIN line through END line, plus one newline.
//   engines/                    the five engine files copied from Day 149's root (render, audio, world, battle, story), each
//                               checked against its owner's root file or page fence.
//   forge/manifest.json         every vendored file with its sha256, size, and load order, plus the owners' commits.
//
// The pages are the source because they are what each forge shipped: build.js substitutions (demo JSON, the engine table,
// spliced engine sections) are already applied there. Where a forge keeps the fence in src/, the page fence is checked
// against src/ too, with a /*NAME*/null placeholder matched as a gap, so a page left unbuilt after a src edit is caught.
//
//   node vendor.js           cut, write, and verify
//   node vendor.js --check   verify the files on disk against the owners and the manifest; write nothing
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const CHECK = process.argv.includes('--check');
const ROOT = __dirname;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const bytes = (s) => Buffer.byteLength(s);
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const failures = [];
const fail = (msg) => { failures.push(msg); console.error('FAIL ' + msg); };

const FILE146 = require('./day146');
const OWNERS = {
  146: { dir: path.dirname(FILE146), page: FILE146, repo: 'appaday-146-saga-forge' },
  147: { dir: require('./day147'), repo: 'appaday-147-art-and-audio-forge' },
  148: { dir: require('./day148'), repo: 'appaday-148-world-forge' },
  149: { dir: require('./day149'), repo: 'appaday-149-story-forge' }
};
Object.keys(OWNERS).forEach((d) => { const o = OWNERS[d]; o.page = o.page || path.join(o.dir, 'index.html'); o.text = fs.readFileSync(o.page, 'utf8'); });

// Fences that are not vendored into forge/<day>/, and why.
const SKIP = {
  'KIT:CORE': 'core/kit.js', 'KIT:CORE CSS': 'core/kit.css', 'APP:BOOT': 'each forge boots itself; the Studio shell replaces it',
  'ENGINE:BATTLE': 'engines/engine-battle.js', 'ENGINE:RENDER': 'engines/engine-render.js', 'ENGINE:AUDIO': 'engines/engine-audio.js',
  'ENGINE:WORLD': 'engines/engine-world.js', 'ENGINE:STORY': 'engines/engine-story.js',
  'ART:DEMO': 'demo fixture (declares window.ART_DEMO)', 'WORLD:DEMO': 'demo fixture (declares window.WORLD_DEMO)', 'STORY:DEMO': 'demo fixture (declares window.STORY_DEMO)'
};

function owner(d) {
  try { return execSync('git -C "' + OWNERS[d].dir + '" rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch (e) { return null; }
}

// Splits a region into its fences. Every line in the region must belong to a fence: a stray line means the forge has code
// outside any fence, which this tool would silently drop, so it stops instead.
function fences(text, startTag, endTag, kind, day) {
  const a = text.indexOf(startTag);
  if (a < 0 || text.indexOf(startTag, a + 1) >= 0) throw new Error('Day ' + day + ': ' + kind + ' region start not found exactly once.');
  const z = text.indexOf(endTag, a);
  const region = text.slice(a + startTag.length, z);
  const lines = region.split('\n');
  const isCss = kind === 'css';
  const openRe = isCss ? /^\/\* === ([A-Z0-9:_ ]+) BEGIN === \*\/$/ : /^\/\/ === ([A-Z0-9:_ ]+) BEGIN ===$/;
  const out = [], seen = {};
  let i = 0;
  while (i < lines.length) {
    const ln = lines[i];
    if (ln === '' && (i === 0 || i === lines.length - 1)) { i++; continue; }
    const m = openRe.exec(ln);
    if (!m) {
      // Lines between fences. A forge's src file can hold a fence and then a few lines after it (Day 149's story-shell.css
      // does); build.js copies the file whole, so those lines ship. They are kept as a TAIL of the fence before them.
      if (!out.length) throw new Error('Day ' + day + ': ' + kind + ' text before the first fence: ' + JSON.stringify(ln.slice(0, 80)));
      let j = i;
      while (j < lines.length && !openRe.test(lines[j]) && !(lines[j] === '' && j === lines.length - 1)) j++;
      const prev = out[out.length - 1];
      out.push({ name: prev.name.replace(/ CSS$/, '') + ' TAIL' + (isCss ? ' CSS' : ''), text: lines.slice(i, j).join('\n'), tailOf: prev.name });
      i = j;
      continue;
    }
    const name = m[1];
    if (seen[name]) throw new Error('Day ' + day + ': fence ' + name + ' appears twice.');
    seen[name] = true;
    const close = isCss ? '/* === ' + name + ' END === */' : '// === ' + name + ' END ===';
    let j = i + 1;
    while (j < lines.length && lines[j] !== close) j++;
    if (j >= lines.length) throw new Error('Day ' + day + ': fence ' + name + ' has no END line.');
    const body = lines.slice(i, j + 1).join('\n');
    const inner = lines.slice(i + 1, j).join('\n');
    if (inner.split('\n').some((l) => openRe.test(l))) throw new Error('Day ' + day + ': fence ' + name + ' contains another fence.');
    out.push({ name, text: body });
    i = j + 1;
  }
  // Rejoining every fence with newlines must give the region back exactly.
  const rejoined = out.map((f) => f.text).join('\n');
  if (region.replace(/^\n/, '').replace(/\n$/, '') !== rejoined) throw new Error('Day ' + day + ': ' + kind + ' fences do not rejoin to the page region.');
  return out;
}

const fileName = (name) => name.replace(/ CSS$/, '').toLowerCase().replace(/[:_ ]+/g, '-');

// Checks a page fence against the owner's src/ copy, if the owner keeps one. Returns 'equal', 'filled' (a placeholder in
// src was filled by the owner's build.js), or 'no-src'.
function srcCheck(day, fence, ext, tail) {
  const dir = path.join(OWNERS[day].dir, 'src');
  if (!fs.existsSync(dir)) return 'no-src';
  const first = fence.text.split('\n')[0];
  const hit = fs.readdirSync(dir).filter((f) => f.endsWith(ext)).find((f) => fs.readFileSync(path.join(dir, f), 'utf8').split('\n')[0] === first);
  if (!hit) return 'no-src';
  const src = fs.readFileSync(path.join(dir, hit), 'utf8').trim();
  if (src === fence.text) return 'equal';
  if (tail && src === fence.text + '\n' + tail.text) return 'equal';
  const parts = src.split(/\/\*[A-Z_]+\*\/null/);
  if (parts.length > 1) {
    let pos = 0, ok = true;
    parts.forEach((p, k) => {
      const at = k === 0 ? (fence.text.startsWith(p) ? 0 : -1) : fence.text.indexOf(p, pos);
      if (at < 0 || (k === parts.length - 1 && !fence.text.endsWith(p))) ok = false; else pos = at + p.length;
    });
    if (ok) return 'filled';
  }
  fail('Day ' + day + ' ' + fence.name + ': the page fence differs from src/' + hit + ' (rebuild Day ' + day + ' first).');
  return 'differs';
}

// ---------------------------------------------------------------- 1. KIT:CORE, once, from Day 146; verbatim in every forge.
const cut = (text, open, close) => { const a = text.indexOf(open), z = text.indexOf(close); if (a < 0 || z < a) throw new Error('Fence not found: ' + open); return text.slice(a, z + close.length); };
const KIT_JS = ['// === KIT:CORE BEGIN ===', '// === KIT:CORE END ==='];
const KIT_CSS = ['/* === KIT:CORE CSS BEGIN === */', '/* === KIT:CORE CSS END === */'];
const kitJs = cut(OWNERS[146].text, KIT_JS[0], KIT_JS[1]) + '\n';
const kitCss = cut(OWNERS[146].text, KIT_CSS[0], KIT_CSS[1]) + '\n';
[147, 148, 149].forEach((d) => {
  if (cut(OWNERS[d].text, KIT_JS[0], KIT_JS[1]) + '\n' !== kitJs) fail('Day ' + d + ' no longer carries KIT:CORE verbatim from Day 146.');
  if (cut(OWNERS[d].text, KIT_CSS[0], KIT_CSS[1]) + '\n' !== kitCss) fail('Day ' + d + ' no longer carries KIT:CORE CSS verbatim from Day 146.');
});

// ---------------------------------------------------------------- 2. Engines, from Day 149's root, checked against owners.
// Each root file is a two line header, then (render, audio, world, story) the owner's fence and a newline, or (battle) the
// lines between Day 146's ENGINE:BATTLE markers. A '/* Bundle hash <hex> */' line is never present in a repository copy.
const afterHeader = (t) => t.slice(t.indexOf('*/\n') + 3);
const ENGINES = [
  { key: 'render', file: 'engine-render.js', global: 'ENGINE_RENDER', owner: 147, fence: 'ENGINE:RENDER' },
  { key: 'audio', file: 'engine-audio.js', global: 'ENGINE_AUDIO', owner: 147, fence: 'ENGINE:AUDIO' },
  { key: 'world', file: 'engine-world.js', global: 'ENGINE_WORLD', owner: 148, fence: 'ENGINE:WORLD' },
  { key: 'battle', file: 'engine-battle.js', global: 'ENGINE_BATTLE', owner: 146, fence: 'ENGINE:BATTLE' },
  { key: 'story', file: 'engine-story.js', global: 'ENGINE_STORY', owner: 149, fence: 'ENGINE:STORY' }
];
const engineOut = ENGINES.map((e) => {
  const text = fs.readFileSync(path.join(OWNERS[149].dir, e.file), 'utf8');
  const open = '// === ' + e.fence + ' BEGIN ===', close = '// === ' + e.fence + ' END ===';
  const page = OWNERS[e.owner].text;
  let expect;
  if (e.key === 'battle') {
    let a = page.indexOf(open), z = page.indexOf(close, a + 1);
    a = page.indexOf('\n', a); z = page.lastIndexOf('\n', z);
    expect = page.slice(a + 1, z + 1);
  } else expect = cut(page, open, close) + '\n';
  if (afterHeader(text) !== expect) fail(e.file + ' in Day 149 differs from Day ' + e.owner + '\'s ' + e.fence + ' fence.');
  if (e.owner !== 149 && e.key !== 'battle') {
    const theirs = fs.readFileSync(path.join(OWNERS[e.owner].dir, e.file), 'utf8');
    if (theirs !== text) fail(e.file + ' in Day 149 differs from Day ' + e.owner + '\'s root file.');
  }
  if (/<\/script/i.test(text)) fail(e.file + ' contains </script, so Phase 6 could not inline it byte for byte.');
  if (/<!--/.test(text)) fail(e.file + ' contains <!--, which a browser treats specially inside an inline script.');
  const ver = /engine version ([0-9.]+)/.exec(text.slice(0, 300));
  return { key: e.key, file: 'engines/' + e.file, global: e.global, owner: e.owner, version: ver ? ver[1] : 'unknown', bytes: bytes(text), sha256: sha(text), text };
});

// ---------------------------------------------------------------- 3. Forge fences.
const forgeOut = {};
Object.keys(OWNERS).forEach((d) => {
  const t = OWNERS[d].text;
  const css = fences(t, '\n<style>\n', '\n</style>', 'css', d);
  const jsStart = '<script>\n' + KIT_JS[0];
  // The inline script is the one that opens with KIT:CORE; scripts with a src attribute never match '<script>\n'.
  const sIdx = t.indexOf(jsStart);
  if (sIdx < 0) throw new Error('Day ' + d + ': inline script with KIT:CORE not found.');
  const jsFences = fences(t.slice(sIdx), '<script>\n', '\n</script>', 'js', d);
  const take = (list, kind) => list.filter((f) => !SKIP[f.name]).map((f, i) => {
    const file = 'forge/' + d + '/' + fileName(f.name) + (kind === 'css' ? '.css' : '.js');
    const text = f.text + '\n';
    const next = list[list.indexOf(f) + 1];
    const src = f.tailOf ? 'tail' : srcCheck(d, f, kind === 'css' ? '.css' : '.js', next && next.tailOf === f.name ? next : null);
    return { fence: f.name, file, order: i, bytes: bytes(text), sha256: sha(text), src, text };
  });
  const skipped = css.concat(jsFences).filter((f) => SKIP[f.name]).map((f) => ({ fence: f.name, why: SKIP[f.name] }));
  forgeOut[d] = { css: take(css, 'css'), js: take(jsFences, 'js'), skipped };
  // Two forges may not write the same file name within one day folder.
  const names = forgeOut[d].css.concat(forgeOut[d].js).map((f) => f.file);
  if (new Set(names).size !== names.length) fail('Day ' + d + ': two fences map to the same file name.');
});
// The shell markup each forge's code reaches for by id (getElementById or querySelector('#id')), for Phase 1's shell.
Object.keys(forgeOut).forEach((d) => {
  const ids = new Set();
  forgeOut[d].js.forEach((f) => {
    let m; const re = /getElementById\('([A-Za-z][\w-]*)'\)|querySelector\('#([A-Za-z][\w-]*)'\)/g;
    while ((m = re.exec(f.text))) ids.add(m[1] || m[2]);
  });
  forgeOut[d].ids = Array.from(ids).sort();
});

// ---------------------------------------------------------------- 4. Write (unless --check), then verify the disk.
const manifest = {
  about: 'Saga Studio vendored sources. Written by node vendor.js; checked by node vendor.js --check. Never edit these files by hand.',
  owners: {},
  core: [{ file: 'core/kit.js', fence: 'KIT:CORE', owner: 146, bytes: bytes(kitJs), sha256: sha(kitJs) }, { file: 'core/kit.css', fence: 'KIT:CORE CSS', owner: 146, bytes: bytes(kitCss), sha256: sha(kitCss) }],
  engines: engineOut.map(({ text, ...e }) => e),
  loadOrder: ENGINES.map((e) => 'engines/' + e.file),
  forges: {}
};
Object.keys(OWNERS).forEach((d) => {
  manifest.owners[d] = { repo: OWNERS[d].repo, commit: owner(d), pageSha256: sha(OWNERS[d].text) };
  const strip = (l) => l.map(({ text, ...f }) => f);
  manifest.forges[d] = { css: strip(forgeOut[d].css), js: strip(forgeOut[d].js), skipped: forgeOut[d].skipped, ids: forgeOut[d].ids };
});
const manifestText = JSON.stringify(manifest, null, 2) + '\n';

const all = [{ file: 'core/kit.js', text: kitJs }, { file: 'core/kit.css', text: kitCss }]
  .concat(engineOut.map((e) => ({ file: e.file, text: e.text })))
  .concat(...Object.keys(forgeOut).map((d) => forgeOut[d].css.concat(forgeOut[d].js)))
  .concat([{ file: 'forge/manifest.json', text: manifestText, isManifest: true }]);

if (!CHECK) {
  // Clear old vendored files first, so a fence an owner removed cannot linger here.
  ['forge', 'engines'].forEach((dir) => { const p = path.join(ROOT, dir); if (fs.existsSync(p)) fs.rmSync(p, { recursive: true }); });
  all.forEach((f) => { const p = path.join(ROOT, f.file); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, f.text); });
}
all.forEach((f) => {
  const p = path.join(ROOT, f.file);
  if (!fs.existsSync(p)) { fail(f.file + ' is missing. Run node vendor.js.'); return; }
  const disk = fs.readFileSync(p, 'utf8');
  if (f.isManifest) {
    // The owners' commits may move without any vendored byte changing; compare everything else.
    const a = JSON.parse(disk), b = JSON.parse(f.text);
    Object.keys(a.owners || {}).forEach((d) => { delete a.owners[d].commit; delete a.owners[d].pageSha256; });
    Object.keys(b.owners).forEach((d) => { delete b.owners[d].commit; delete b.owners[d].pageSha256; });
    if (JSON.stringify(a) !== JSON.stringify(b)) fail('forge/manifest.json is stale. Run node vendor.js.');
  } else if (disk !== f.text) fail(f.file + ' differs from its owner (' + sha(disk).slice(0, 12) + ' here, ' + sha(f.text).slice(0, 12) + ' from the owner). Run node vendor.js.');
});
// Nothing extra may sit in forge/ or engines/.
const listed = new Set(all.map((f) => f.file));
const walk = (dir) => fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]) : [];
walk(path.join(ROOT, 'forge')).concat(walk(path.join(ROOT, 'engines'))).map(rel).forEach((f) => { if (!listed.has(f)) fail(f + ' is not a vendored file. Remove it or run node vendor.js.'); });

// ---------------------------------------------------------------- 5. Report.
console.log('core: kit.js ' + bytes(kitJs) + ' bytes, kit.css ' + bytes(kitCss) + ' bytes, verbatim in Days 147, 148, 149');
engineOut.forEach((e) => console.log('engine ' + e.file + ' ' + e.version + ' from Day ' + e.owner + ', ' + e.bytes + ' bytes, sha256 ' + e.sha256.slice(0, 16)));
Object.keys(forgeOut).forEach((d) => {
  const f = forgeOut[d], srcs = f.css.concat(f.js).reduce((a, x) => { a[x.src] = (a[x.src] || 0) + 1; return a; }, {});
  console.log('forge ' + d + ': ' + f.css.length + ' css, ' + f.js.length + ' js; src check ' + JSON.stringify(srcs) + '; skipped ' + f.skipped.map((s) => s.fence).join(', '));
});
if (failures.length) { console.error(failures.length + ' check(s) failed.'); process.exit(1); }
console.log(CHECK ? 'vendor --check: every vendored file is byte equal to its owner.' : 'vendored and verified.');
