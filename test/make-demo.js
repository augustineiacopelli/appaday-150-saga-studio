// Builds the Saga Studio fixtures by running Day 149's own page on Day 149's own fixtures, so every fixture is a real
// Day 149 Final export: import the Day 148 Final, scaffold the whole story the order a person presses the buttons (quests,
// dialogue, flags, endings, events, as Day 149's Phase 8 suite does), check the forge reports a clean world, then
// Kit.buildExport('final', { engines: true }). These are the first true Day 149 Finals: Day 149 ships Day 148 Finals as
// its own fixtures, and its Phase 8 suite builds these Finals in memory only.
// Outputs (test/out):
//   demo149-bundle.json     the Day 146 demo saga, two chapters, dressed by 147, world by 148, story by 149, Final.
//   demo149-manifest.json   its forge 149 manifest, with the day150 contract block the player shell reads.
//   four149-bundle.json     six chapters on four continents, Final.
//   four149-manifest.json   its forge 149 manifest.
//   fixtures-report.json    what each fixture holds, and what Days 146, 147, 148, and 149 make of it on reopening.
// The export page runs on a clock pinned to 2026-10-04T12:00:00Z, so rebuilding writes byte identical fixtures.
// Run from test/ after npm install.
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { boot } = require('./boot-phase0');

const OUT = path.join(__dirname, 'out');
const APP146 = require('../day146');
const DIR147 = require('../day147'), DIR148 = require('../day148'), DIR149 = require('../day149');
const URL = {
  146: 'https://augustineiacopelli.github.io/appaday-146-saga-forge/',
  147: 'https://augustineiacopelli.github.io/appaday-147-art-and-audio-forge/',
  148: 'https://augustineiacopelli.github.io/appaday-148-world-forge/',
  149: 'https://augustineiacopelli.github.io/appaday-149-story-forge/'
};
const PAGE = { 146: APP146, 147: path.join(DIR147, 'index.html'), 148: path.join(DIR148, 'index.html'), 149: path.join(DIR149, 'index.html') };
// Days 148 and 149 load engines by relative script tag, which jsdom does not fetch; they are evaluated before parsing.
const ENGINES = {
  146: [], 147: [],
  148: ['engine-render.js', 'engine-audio.js'].map((f) => path.join(DIR148, f)),
  149: ['engine-render.js', 'engine-audio.js', 'engine-world.js'].map((f) => path.join(DIR149, f))
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const noHashLine = (s) => s.replace(/^\/\* Bundle hash [0-9a-f]+ \*\/\n/m, '');

// The export page runs on a pinned clock, so a rebuild writes the same bytes: the only things that change between runs of
// Day 149's Final export are kit.updatedAt, kit.forges['149'].exportedAt, and the content hash over them.
const CLOCK = Date.parse('2026-10-04T12:00:00.000Z');
function pinClock(win) {
  const Real = win.Date;
  class Pinned extends Real { constructor(...a) { if (a.length) super(...a); else super(CLOCK); } static now() { return CLOCK; } }
  win.Date = Pinned;
}
async function page(day, dev, pinned) {
  const r = boot(PAGE[day], { url: URL[day] + (dev ? '?dev=1' : ''), engines: ENGINES[day], indexedDB: day === 149, setup: pinned ? pinClock : undefined });
  await wait(60);
  if (r.win.ART && r.win.ART.booted) await r.win.ART.booted;
  if (r.win.WORLD && r.win.WORLD.booted) await r.win.WORLD.booted;
  if (r.win.STORY && r.win.STORY.booted) await r.win.STORY.booted;
  return r;
}
// Reopens a bundle in one forge and reports what that forge makes of it.
async function reopen(day, text) {
  const { win, errors } = await page(day, false);
  const Kit = win.Kit;
  let r;
  try { r = Kit.bundle.importText(text); } catch (e) { return { rejected: e.message }; }
  await wait(10);
  const res = Kit.refreshValidation();
  return { matches: r.matches, summary: Kit.validate.summary(res), errors: res.errors.length, broken: res.broken.length, forward: res.forward.length, pageErrors: errors.length };
}

async function finalOf(key) {
  const src = fs.readFileSync(path.join(DIR149, 'test', 'out', key + '148-bundle.json'), 'utf8');
  const { win, errors } = await page(149, true, true);
  if (errors.length) throw new Error('Day 149 page errors: ' + errors.join('\n'));
  const { Kit, STORY } = win;
  const imp = Kit.bundle.importText(src); await wait(20);
  if (!imp.matches) throw new Error(key + ': the Day 148 fixture hash does not verify in Day 149');
  const b = Kit.bundle.current();
  STORY.quests.scaffold(b); STORY.dialogue.scaffold(b); STORY.flags.sync(b); STORY.ends.scaffold(b); STORY.events.scaffold(b);
  if (STORY.readiness(b) !== true) throw new Error(key + ': Day 149 readiness is not true: ' + JSON.stringify(STORY.readiness(b)));
  const wc = STORY.worldCheck(b);
  if (wc.length) throw new Error(key + ': Day 149 world check: ' + JSON.stringify(wc));
  const out = Kit.buildExport('final', { engines: true });
  const [bundleFile, manFile, engFile] = out.files;
  if (!bundleFile || !manFile || !engFile) throw new Error(key + ': the Final export did not produce bundle, manifest, and engine-story.js');
  return { text: bundleFile.text, manText: manFile.text, engine: engFile.text, hash: out.hash, names: out.files.map((f) => f.name) };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const report = {};
  const engineStory = fs.readFileSync(path.join(__dirname, '..', 'engines', 'engine-story.js'), 'utf8');
  for (const key of ['demo', 'four']) {
    const f = await finalOf(key);
    const b = JSON.parse(f.text), man = JSON.parse(f.manText);
    fs.writeFileSync(path.join(OUT, key + '149-bundle.json'), f.text);
    fs.writeFileSync(path.join(OUT, key + '149-manifest.json'), f.manText);
    const reopened = {};
    for (const day of [146, 147, 148, 149]) reopened[day] = await reopen(day, f.text);
    const d = man.day150 || {};
    report[key] = {
      exported: f.names, bytes: f.text.length, hash: f.hash.slice(0, 16), bundleHashMatches: b.kit.contentHash === f.hash,
      forges: Object.keys(b.kit.forges).map((x) => x + ':' + b.kit.forges[x].status).join(' '), opened: b.kit.opened.join(' '),
      chapters: b.charter.sections.chapters.length, minutes: b.charter.sections.chapters.reduce((a, c) => a + c.targetMinutes, 0),
      unresolved: man.unresolved.length, loadOrder: man.loadOrder,
      day150: { keys: Object.keys(d).sort(), golden: d.golden ? { steps: d.golden.steps.length, ending: d.golden.ending, hash: d.golden.hash } : null, endings: d.endings ? d.endings.length : 0, engines: (d.engines || []).map((e) => e.file + ' ' + e.sha256.slice(0, 12)) },
      engineStoryMatchesVendored: sha(noHashLine(f.engine)) === sha(engineStory),
      reopened
    };
  }
  fs.writeFileSync(path.join(OUT, 'fixtures-report.json'), JSON.stringify(report, null, 1) + '\n');
  console.log(JSON.stringify(report, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
