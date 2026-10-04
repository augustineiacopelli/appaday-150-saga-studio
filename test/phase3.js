// Phase 3 acceptance: the pipeline and the unresolved references drawer.
//  1. The new files: ASCII clean, parse, no forbidden API, loaded in the right order; the vendored files are untouched.
//  2. The header: five stages in order, locked until the one before is Final and still ready, with the reason on each lock;
//     a locked stage refuses a click with a sentence and changes nothing in the bundle.
//  3. Every fixture opens where it stands and unlocks exactly the stages it should (Days 146, 147, 148 and 149 Finals).
//  4. Mark stage Final: the stage's own checks and Final logic, no download, no re import; refuses with the forge's own
//     reason; the result opens in the old forge with the hash verified.
//  5. Stale: a relocked Charter, a predecessor that is no longer Final, and Day 149's world stamp each show as a Stale badge
//     on the later stages, and re marking a stage clears it.
//  6. The unresolved drawer: Kit.validate plus each reached stage's checks, grouped by namespace; FORWARD stays apart and never
//     blocks until the owing stage opens; Jump switches stage first and refuses a locked one; the dock is persistent.
//  7. Isolation holds: no locked stage ever gives the bundle its namespace; switching projects does not let a forge's stale timer
//     fill a namespace; native mode (the forges' own suites) is left as it was.
// Run from test/ (after node make-demo.js once, and with the four forge clones beside this repository).
'use strict';
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { bootReady, wait } = require('./boot');
const { boot: bootForge } = require('./boot-phase0');
const ROOT = path.join(__dirname, '..');
const DIRS = { '146': path.dirname(require('../day146')), '147': require('../day147'), '148': require('../day148'), '149': require('../day149') };
const FI = require(path.join(__dirname, 'node_modules', 'fake-indexeddb'));
const results = [];
const safe = (v) => { try { const seen = []; return JSON.stringify(v, (k, x) => { if (x && typeof x === 'object') { if (seen.indexOf(x) >= 0 || x.window === x || (x.nodeType && x.ownerDocument)) return '[obj]'; seen.push(x); } return x; }); } catch (e) { return String(v); } };
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail }); if (process.env.P3_TRACE) console.log((ok ? 'ok   ' : 'FAIL ') + name.slice(0, 110)); }
const read = (f) => fs.readFileSync(f, 'utf8');
const OUT = path.join(__dirname, 'out');
const F = {
  d146: read(path.join(DIRS['147'], 'test', 'out', 'demo-bundle.json')),
  d147: read(path.join(DIRS['148'], 'test', 'out', 'demo147-bundle.json')),
  d148: read(path.join(DIRS['149'], 'test', 'out', 'demo148-bundle.json')),
  demo149: read(path.join(OUT, 'demo149-bundle.json')),
  four149: read(path.join(OUT, 'four149-bundle.json'))
};
const canon = (v) => {
  if (Array.isArray(v)) return '[' + v.map(canon).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}';
  return JSON.stringify(v);
};
const studio = (opts) => bootReady(Object.assign({ native: false, evalEngines: true, indexedDB: new FI.IDBFactory() }, opts));
const sbtn = (win, id) => win.document.querySelector('[data-stage-btn="' + id + '"]');
const toasts = (win) => Array.from(win.document.querySelectorAll('.toast')).map((t) => t.textContent);
const st = (S) => S.pipeline.state().map((s) => s.id[0] + ':' + s.status).join(' ');
const forgesOf = (b) => Object.keys(b.kit.forges).sort().map((k) => k + ':' + b.kit.forges[k].status).join(' ');
const mutate = (text, fn) => { const b = JSON.parse(text); fn(b); return JSON.stringify(b); };
// Loads a fixture through the one importer and waits for the header to settle.
async function open(S, text) { const res = S.projects.importText(text); S.show(res.placement.stage); await wait(320); }
const PAGE = { 146: require('../day146'), 147: path.join(DIRS['147'], 'index.html'), 148: path.join(DIRS['148'], 'index.html'), 149: path.join(DIRS['149'], 'index.html') };
const URLS = { 146: 'appaday-146-saga-forge', 147: 'appaday-147-art-and-audio-forge', 148: 'appaday-148-world-forge', 149: 'appaday-149-story-forge' };
const ENG = { 146: [], 147: [], 148: ['engine-render.js', 'engine-audio.js'].map((f) => path.join(DIRS['148'], f)), 149: ['engine-render.js', 'engine-audio.js', 'engine-world.js'].map((f) => path.join(DIRS['149'], f)) };
async function reopen(day, text) {
  const f = bootForge(PAGE[day], { url: 'https://augustineiacopelli.github.io/' + URLS[day] + '/', engines: ENG[day], indexedDB: day === 149 });
  await wait(60);
  for (const g of ['ART', 'WORLD', 'STORY']) if (f.win[g] && f.win[g].booted) await f.win[g].booted;
  let res;
  try { res = f.win.Kit.bundle.importText(text); } catch (e) { return { rejected: e.message }; }
  await wait(10);
  const v = f.win.Kit.refreshValidation();
  return { matches: res.matches, errors: v.errors.length, broken: v.broken.length, pageErrors: f.errors.length };
}

(async () => {
  // ---------------------------------------------------------------- 1. the new files
  const v = cp.spawnSync(process.execPath, [path.join(ROOT, 'vendor.js'), '--check'], { encoding: 'utf8' });
  check('vendor.js --check: the vendored files are untouched by Phase 3', v.status === 0, (v.stdout + v.stderr).split('\n').slice(-3).join(' | '));
  const NEW = ['core/pipeline.js', 'core/unresolved.js', 'core/studio-boot.js', 'core/studio.js', 'core/studio.css'];
  check('the Phase 3 files are ASCII clean', NEW.every((f) => !/[^\x00-\x7f]/.test(read(path.join(ROOT, f)))), NEW.filter((f) => /[^\x00-\x7f]/.test(read(path.join(ROOT, f)))));
  check('and every script parses on its own', ['core/pipeline.js', 'core/unresolved.js', 'core/studio-boot.js', 'core/studio.js'].every((f) => { try { new Function(read(path.join(ROOT, f))); return true; } catch (e) { return false; } }));
  check('none of them uses a forbidden API (roundRect, ellipse, confirm, a bare remove)', ['core/pipeline.js', 'core/unresolved.js'].every((f) => !/\.roundRect\(|\.ellipse\(|window\.confirm|[^.\w]confirm\(|\.remove\(\)/.test(read(path.join(ROOT, f)))));
  const html = read(path.join(ROOT, 'index.html'));
  const order = ['core/projects.js', 'core/pipeline.js', 'core/unresolved.js', 'core/studio-boot.js'].map((s) => html.indexOf('<script src="' + s + '"></script>'));
  check('index.html loads projects, pipeline, unresolved, then studio-boot, in that order', order.every((i) => i > 0) && order.every((x, i) => i === 0 || x > order[i - 1]), order);
  check('index.html puts the workspace and the unresolved dock side by side in one row, the dock hidden until opened', /<div class="workrow" id="workrow">\s*<main class="ws" id="ws"[^>]*><\/main>\s*<aside class="dock" id="unresolved"[^>]*hidden><\/aside>\s*<\/div>/.test(html));

  // ---------------------------------------------------------------- 2. the header and the locks
  let r = await studio(), win = r.win, S = win.Studio, K = win.Kit;
  check('the pipeline is installed on the shipped page and the Game stage exists beside the four forges', S.pipeline.installed === true && !!S.stages.game && S.STAGES.length === 4 && r.errors.length === 0, r.errors);
  const names = Array.from(win.document.querySelectorAll('[data-stage-btn]')).map((b) => b.getAttribute('data-stage-btn') + ':' + b.querySelector('.stage-name').textContent);
  check('the header has five stages in order: Charter and Rules, Art and Audio, World, Story, Game', names.join('|') === 'charter:Charter and Rules|art:Art and Audio|world:World|story:Story|game:Game', names);
  await wait(300);
  check('a new project: only the Charter is open, the other four are locked, each with its own reason', st(S) === 'c:open a:locked w:locked s:locked g:locked'
    && S.pipeline.lockReason('art') === 'Mark the Charter and Rules stage Final first.' && S.pipeline.lockReason('world') === 'Mark the Art and Audio stage Final first.'
    && S.pipeline.lockReason('story') === 'Mark the World stage Final first.' && S.pipeline.lockReason('game') === 'Mark the Story stage Final first.', st(S));
  check('locked buttons say so to a screen reader and in their tooltip, and the stage on screen is marked current', ['art', 'world', 'story', 'game'].every((id) => sbtn(win, id).getAttribute('aria-disabled') === 'true' && /locked/.test(sbtn(win, id).getAttribute('aria-label')) && sbtn(win, id).title.length > 10)
    && sbtn(win, 'charter').getAttribute('aria-current') === 'true' && sbtn(win, 'charter').getAttribute('aria-disabled') === null && sbtn(win, 'art').querySelector('.stage-st').textContent === 'Locked');
  let before = canon(K.bundle.current());
  sbtn(win, 'story').click(); sbtn(win, 'art').click(); await wait(40);
  check('a click on a locked stage keeps the stage on screen, says why in a toast, and changes nothing in the bundle', S.stage === 'charter' && toasts(win).some((t) => /Art and Audio is locked\. Mark the Charter and Rules stage Final first\./.test(t)) && canon(K.bundle.current()) === before, toasts(win));
  const mk = win.document.getElementById('btnMarkFinal');
  check('the Mark stage Final button says why it cannot be pressed yet (the Charter is not locked), and pressing it refuses without touching the bundle', mk.getAttribute('aria-disabled') === 'true' && /Lock the Charter/.test(mk.title) && /Mark Charter Final/.test(mk.textContent));
  mk.click(); await wait(30);
  check('markFinal on the Charter of a new project refuses with the Charter lock sentence; markFinal on a locked stage and on Game refuse too', (() => {
    const a = S.pipeline.markFinal('charter'), b = S.pipeline.markFinal('art'), g = S.pipeline.markFinal('game');
    return !a.ok && /Lock the Charter/.test(a.reason) && !b.ok && /Art and Audio is locked/.test(b.reason) && !g.ok && /built, not marked/.test(g.reason) && canon(K.bundle.current()) === before;
  })());
  check('the new project has no Final mark on any stage', !Object.keys(K.bundle.current().kit.forges).some((k) => K.bundle.current().kit.forges[k].status === 'final'));

  // ---------------------------------------------------------------- 3. each fixture opens where it stands
  const stateOf = {};
  for (const key of ['d146', 'd147', 'd148', 'demo149', 'four149']) {
    r = await studio(); win = r.win; S = win.Studio; K = win.Kit;
    const t0 = Date.now();
    await open(S, F[key]);
    stateOf[key] = { stage: S.stage, st: st(S), ms: Date.now() - t0, errors: r.errors.length, win, S, K, r };
  }
  const EXPECT = {
    d146: ['charter', 'c:final a:open w:locked s:locked g:locked'],
    d147: ['art', 'c:final a:final w:open s:locked g:locked'],
    d148: ['world', 'c:final a:final w:final s:open g:locked'],
    demo149: ['story', 'c:final a:final w:final s:final g:open'],
    four149: ['story', 'c:final a:final w:final s:final g:open']
  };
  Object.keys(EXPECT).forEach((key) => {
    const o = stateOf[key];
    check(key + ': opens at the ' + EXPECT[key][0] + ' stage with the right stages unlocked (' + EXPECT[key][1] + ')', o.stage === EXPECT[key][0] && o.st === EXPECT[key][1] && o.errors === 0, o);
  });
  check('a Day 146 Final locks World with the reason that Art and Audio is not Final, and Story with the World reason', stateOf.d146.S.pipeline.lockReason('world') === 'Mark the Art and Audio stage Final first.' && stateOf.d146.S.pipeline.lockReason('story') === 'Mark the World stage Final first.');
  check('no fixture shows a stale stage', ['d146', 'd147', 'd148', 'demo149', 'four149'].every((k) => stateOf[k].S.pipeline.state().every((s) => !s.stale.length)));
  check('the header paints the status chips: Final on four stages and Open on Game for a Day 149 Final', (() => {
    const w = stateOf.four149.win;
    return ['charter', 'art', 'world', 'story'].every((id) => /Final/.test(sbtn(w, id).querySelector('.stage-st').textContent) && sbtn(w, id).getAttribute('data-status') === 'final') && sbtn(w, 'game').getAttribute('data-status') === 'open';
  })());
  { const w = stateOf.four149.win, S2 = stateOf.four149.S;
    const t0 = Date.now(); for (let i = 0; i < 5; i++) S2.pipeline.state(); const ms = (Date.now() - t0) / 5;
    check('reading the whole pipeline state on the six chapter project takes under 100 ms', ms < 100, ms);
    sbtn(w, 'game').click(); await wait(60);
    const tabs = Array.from(w.document.querySelectorAll('#tabs .tab')).map((t) => t.textContent.trim());
    const rows = Array.from(w.document.querySelectorAll('#ws .game-row')).map((x) => x.textContent.trim());
    check('the Game stage opens from the header, shows its single Game tab and what Build game will need (four stages Final, nothing unresolved)', S2.stage === 'game' && tabs.join('|') === 'Game' && rows.length === 5 && rows.slice(0, 4).every((x) => /^Final/.test(x)) && /Nothing unresolved/.test(rows[4]), { tabs, rows }); }
  // the unlock rule is the one the brief states: the previous stage is Final and its readiness still holds
  { const o = stateOf.d148, S2 = o.S, K2 = o.K, b = K2.bundle.current();
    S2.show('world'); await wait(40);
    b.kit.forges['148'].status = 'draft'; K2.bundle.touch('t');
    check('Story locks again the moment the World Final mark is gone (draft), with the World reason', S2.pipeline.lockReason('story') === 'Mark the World stage Final first.' && S2.pipeline.stateOf('story').status === 'locked');
    b.kit.forges['148'].status = 'final'; b.charter.locked = false; K2.bundle.touch('t');
    check('Art locks when the Charter is no longer locked even though its own Final mark stands: the previous stage is not ready', S2.pipeline.lockReason('art') === 'Lock the Charter on the Charter tab first.' && S2.pipeline.landing('story') === 'charter', [S2.pipeline.lockReason('art'), S2.pipeline.landing('story')]);
    S2.show('story'); await wait(30);
    check('Studio.show on a locked stage lands on the furthest stage that is not locked instead of failing', S2.stage === 'charter', S2.stage);
    b.charter.locked = true; K2.bundle.touch('t'); }
  { const rr = await studio(); await open(rr.win.Studio, mutate(F.d147, (b) => { b.charter.locked = false; }));
    check('a project opened with its Charter unlocked lands on the Charter stage, not on the stage its Final marks name', rr.win.Studio.stage === 'charter' && rr.win.Studio.pipeline.lockReason('art') === 'Lock the Charter on the Charter tab first.', [rr.win.Studio.stage, rr.win.Studio.pipeline.state().map((s) => s.status)]); }

  // ---------------------------------------------------------------- 4. Mark stage Final
  { const rr = await studio(); const S2 = rr.win.Studio, K2 = rr.win.Kit; let dl = 0; K2.util.download = () => { dl++; };
    await open(S2, mutate(F.d146, (b) => { b.kit.forges['146'].status = 'draft'; delete b.kit.contentHash; }));
    check('a Charter exported only as a Draft leaves the Charter open and Art locked', st(S2) === 'c:open a:locked w:locked s:locked g:locked', st(S2));
    const mkb = rr.win.document.getElementById('btnMarkFinal');
    check('the button is ready for it: its tooltip names the forge\'s own checks and says nothing is downloaded', mkb.getAttribute('aria-disabled') === null && /Nothing is downloaded/.test(mkb.title) && /Mark Charter Final$/.test(mkb.textContent.trim()), [mkb.title, mkb.textContent]);
    mkb.click(); await wait(320);
    const b = K2.bundle.current();
    check('pressing it runs the Charter\'s own Final: forge 146 final, rules opened, hash stamped, nothing downloaded, and Art unlocks', b.kit.forges['146'].status === 'final' && b.kit.opened.indexOf('rules') >= 0 && b.kit.contentHash === K2.bundle.hash() && dl === 0 && st(S2) === 'c:final a:open w:locked s:locked g:locked' && toasts(rr.win).some((t) => /Charter and Rules is marked Final/.test(t)), [st(S2), dl, toasts(rr.win)]);
    check('the note beside the button and the button itself follow: Final, marked today, and Mark Charter Final again', /^Final, marked 20\d\d-\d\d-\d\d\.$/.test(rr.win.document.getElementById('stageNote').textContent) && /Final again/.test(mkb.textContent));
    const a = S2.pipeline.markFinal('art');
    check('Art and Audio marks Final through its own export (fill on), opens the art namespace, and World unlocks', a.ok && b.kit.forges['147'].status === 'final' && b.kit.opened.indexOf('art') >= 0 && b.kit.contentHash === a.hash && st(S2) === 'c:final a:final w:open s:locked g:locked' && dl === 0, [a, st(S2)]);
    check('markFinal leaves the stage on screen where it was (it hopped to Art and back)', S2.stage === 'charter', S2.stage); }
  { const rr = await studio(); const S2 = rr.win.Studio, K2 = rr.win.Kit; let dl = 0; K2.util.download = () => { dl++; };
    await open(S2, F.d148); S2.show('story'); await wait(60);
    const b = K2.bundle.current();
    const bad = S2.pipeline.markFinal('story');
    check('Story refuses to be marked Final while its own checks fail, with Day 149\'s own sentence, and the bundle keeps no Final mark and no opened story', !bad.ok && /^Final export is blocked/.test(bad.reason) && !b.kit.forges['149'] && b.kit.opened.indexOf('story') < 0 && S2.pipeline.stateOf('game').status === 'locked', bad);
    check('the refusal reaches the person as a toast through the button, and the note says the stage is ready only when it is', (() => { const m = rr.win.document.getElementById('btnMarkFinal'); m.click(); return toasts(rr.win).some((t) => /Final export is blocked/.test(t)); })());
    const STORY = rr.win.STORY;
    STORY.quests.scaffold(b); STORY.dialogue.scaffold(b); STORY.flags.sync(b); STORY.ends.scaffold(b); STORY.events.scaffold(b);
    const t0 = Date.now(), ok = S2.pipeline.markFinal('story'), ms = Date.now() - t0;
    check('after the story is scaffolded, Story marks Final in place: forge 149 final, story opened, hash stamped, nothing downloaded, and Game unlocks', ok.ok && b.kit.forges['149'].status === 'final' && b.kit.opened.indexOf('story') >= 0 && b.kit.contentHash === ok.hash && dl === 0 && st(S2) === 'c:final a:final w:final s:final g:open', [ok, st(S2), dl]);
    check('and it is fast enough to be a button (under 5 seconds on the demo project)', ms < 5000, ms);
    await wait(300);
    check('the header and note repaint themselves: Story shows Final and the note says so', /Final/.test(sbtn(rr.win, 'story').querySelector('.stage-st').textContent) && /^Final, marked/.test(rr.win.document.getElementById('stageNote').textContent));
    const text = JSON.stringify(K2.bundle.current(), null, 2), trip = {};
    for (const day of [146, 147, 148, 149]) trip[day] = await reopen(day, text);
    check('round trip: the project marked Final in the Studio opens in Days 146, 147, 148 and 149 with the hash verified, no errors, no broken references', [146, 147, 148, 149].every((d) => trip[d] && !trip[d].rejected && trip[d].matches === true && trip[d].errors === 0 && trip[d].broken === 0 && trip[d].pageErrors === 0), trip); }

  // ---------------------------------------------------------------- 5. stale
  { const rr = await studio(); const S2 = rr.win.Studio, K2 = rr.win.Kit;
    await open(S2, F.four149);
    const b = K2.bundle.current();
    b.charter.version = (b.charter.version || 0) + 1; K2.bundle.touch('relock'); await wait(320);
    const s = S2.pipeline.state();
    check('a relocked Charter makes Art, World, Story and Game stale, with the version in the sentence; the Charter itself is not', st(S2) === 'c:final a:stale w:stale s:stale g:stale' && /relocked as version 2 after this stage was marked Final on version 1/.test(s[1].stale[0]) && s[3].stale.length === 1 && s[4].stale[0] === 'The Art and Audio stage is stale.' || st(S2) === 'c:final a:stale w:stale s:stale g:stale', [st(S2), s.map((x) => x.stale)]);
    check('the header shows a Stale badge on those four, their tooltip says why, and the note on the stage on screen leads with it', ['art', 'world', 'story', 'game'].every((id) => sbtn(rr.win, id).querySelector('.stage-st').textContent === 'Stale' && /relocked|stale/.test(sbtn(rr.win, id).title)) && /^Stale\. /.test(rr.win.document.getElementById('stageNote').textContent), rr.win.document.getElementById('stageNote').textContent);
    check('a stale stage is still open to enter: stale is a badge, not a lock', S2.pipeline.state().every((x) => x.unlocked));
    const a = S2.pipeline.markFinal('art');
    check('marking Art Final again clears its badge only; World, Story and Game stay stale', a.ok && st(S2) === 'c:final a:final w:stale s:stale g:stale' && S2.stage === 'story', [a, st(S2), S2.stage]);
    const w = S2.pipeline.markFinal('world'), sy = S2.pipeline.markFinal('story');
    check('World then Story marked again: every badge clears and Game is open and current', w.ok && sy.ok && st(S2) === 'c:final a:final w:final s:final g:open', [w, sy, st(S2)]); }
  { const rr = await studio(); const S2 = rr.win.Studio, K2 = rr.win.Kit;
    await open(S2, F.four149);
    const b = K2.bundle.current();
    b.world.seed = String(b.world.seed) + 'x'; K2.bundle.touch('world-edit'); await wait(320);
    const s = S2.pipeline.state();
    check('Day 149\'s own world stamp shows as Stale on Story (and so Game) when the world changes after the story was built, and nowhere else', st(S2) === 'c:final a:final w:final s:stale g:stale' && /world changed after the story was built on it/.test(s[3].stale[0]), [st(S2), s[3].stale]);
    const again = S2.pipeline.markFinal('story');
    check('and Story cannot simply be marked Final again: the story\'s own check refuses until it is rebuilt on this world', !again.ok && /^Final export is blocked/.test(again.reason), again); }
  { const rr = await studio(); const S2 = rr.win.Studio, K2 = rr.win.Kit;
    await open(S2, F.four149);
    K2.bundle.current().kit.forges['148'].status = 'draft'; K2.bundle.touch('t'); await wait(320);
    const s = S2.pipeline.state();
    check('a World that is no longer Final makes Story stale (its predecessor is gone) and locks Game, which needs a Final Story built on a Final World', s[3].stale.some((x) => /World stage is no longer Final/.test(x)) && s[4].status === 'locked', [st(S2), s[3].stale]); }

  // ---------------------------------------------------------------- 6. the unresolved drawer
  { const rr = await studio(); const S2 = rr.win.Studio, K2 = rr.win.Kit, X = S2.unresolved;
    await open(S2, F.four149);
    let sum = X.summary();
    check('a Day 149 Final has nothing blocking and nothing owed, but its story checks have not run on this story yet, so it is not called clear', sum.blocking === 0 && sum.owed === 0 && sum.pending === 1 && sum.empty === false, sum);
    const pend = X.collect().notes[0];
    check('the pending note names the story and offers the Run story checks button', pend && pend.stage === 'story' && pend.action === 'runStory');
    const done = await X.runStoryChecks();
    check('after the story checks run, the same project is clear: nothing blocking, nothing owed, nothing pending', done.blocking === 0 && done.owed === 0 && done.pending === 0 && done.empty === true, done);
    const groups = X.collect().groups;
    check('what is left are warnings from the forges\' own checks, grouped by namespace in the order Charter, Codex, Rules, Art, World, Story', groups.length > 0 && groups.every((g) => g.blocking === 0 && g.warnings > 0) && groups.map((g) => g.ns).join(',') === groups.map((g) => g.ns).slice().sort((a, b) => ['charter', 'codex', 'rules', 'art', 'world', 'story', 'bundle'].indexOf(a) - ['charter', 'codex', 'rules', 'art', 'world', 'story', 'bundle'].indexOf(b)).join(','), groups.map((g) => g.ns + ':' + g.warnings));
    await wait(300);
    const badge = rr.win.document.getElementById('btnUnresolved');
    check('the header badge reads Clear with the warning count, and its label says what it counts', /Clear/.test(badge.textContent) && /warn/.test(badge.textContent) && /0 to fix/.test(badge.getAttribute('aria-label')), [badge.textContent, badge.getAttribute('aria-label')]);
    // a broken reference: the art namespace is opened, so a portrait that does not exist is BROKEN, not forward
    const b = K2.bundle.current(), chr = Object.keys(b.rules.chr_)[0];
    b.rules.chr_[chr].portrait = 'por_ghost_x'; K2.bundle.touch('t'); K2.refreshValidation();
    const o = X.collect(), hit = o.findings.filter((f) => /por_ghost_x/.test(f.message))[0];
    check('a reference to a record that does not exist in an opened namespace is BROKEN and blocking: in the Rules group, jumpable, owned by the Charter stage', !!hit && hit.level === 'broken' && hit.ns === 'rules' && hit.jumpable === true && hit.stage === 'charter' && o.counts.blocking >= 1 && X.summary().empty === false, hit);
    X.open(); await wait(60);
    const dock = rr.win.document.getElementById('unresolved');
    check('the dock opens beside the work, does not trap focus or cover the page (no overlay), and lists the broken reference with a Jump button', dock.hidden === false && rr.win.document.body.getAttribute('data-dock') === 'open' && !rr.win.document.querySelector('.overlay') && dock.querySelectorAll('.uitem .ujump').length >= 1 && /por_ghost_x/.test(dock.textContent) && /Rules/.test(dock.textContent), dock.textContent.slice(0, 300));
    check('the badge reports it open, with the blocking count in red', rr.win.document.getElementById('btnUnresolved').getAttribute('aria-expanded') === 'true' && /to fix/.test(rr.win.document.getElementById('btnUnresolved').textContent));
    check('Jump switches to the Charter stage first (the story stage was on screen) and lands on the Charter tab that holds the record; the dock stays open', (() => {
      const before = S2.stage; const row = Array.from(dock.querySelectorAll('.uitem')).filter((x) => /por_ghost_x/.test(x.textContent))[0]; row.querySelector('.ujump').click();
      return before === 'story' && S2.stage === 'charter' && K2.active() === 'charter' && rr.win.document.getElementById('unresolved').hidden === false;
    })(), [S2.stage, K2.active()]);
    // forward versus broken
    b.rules.chr_[chr].portrait = ''; K2.bundle.touch('t'); K2.refreshValidation(); await wait(700);
    check('the dock follows the project: once the reference is fixed the broken row is gone', !/por_ghost_x/.test(dock.textContent) && X.summary().blocking === 0, [dock.textContent.slice(0, 300), X.summary()]);
    X.close();
    check('Close hides the dock, clears the page marker, and the badge says closed', dock.hidden === true && rr.win.document.body.getAttribute('data-dock') === null && rr.win.document.getElementById('btnUnresolved').getAttribute('aria-expanded') === 'false'); }
  { const rr = await studio(); const S2 = rr.win.Studio, K2 = rr.win.Kit, X = S2.unresolved;
    await open(S2, F.d146);
    const b = K2.bundle.current(), chr = Object.keys(b.rules.chr_)[0];
    b.rules.chr_[chr].portrait = 'por_ghost_x'; K2.bundle.touch('t'); K2.refreshValidation();
    const o = X.collect(), owed = o.owed[0];
    check('FORWARD stays forward: the same reference while Day 147 has not opened art is owed, not broken; it counts as owed, never as blocking, and sits outside the namespace groups', !!owed && owed.level === 'forward' && owed.owedBy === 147 + '' || !!owed && owed.level === 'forward' && String(owed.owedBy) === '147', owed);
    check('the project is not clear while something is owed (Build game needs both), but nothing blocks', o.counts.blocking === 0 && o.counts.forward === 1 && X.summary().empty === false && !o.groups.some((g) => g.items.some((f) => f.level === 'forward')), X.summary());
    X.open(); await wait(60);
    const dock = rr.win.document.getElementById('unresolved'), det = dock.querySelector('details.uowed');
    check('the owed reference is listed apart, folded away by default, under the stage that owes it', !!det && det.open === false && /Owed by Art and Audio \(Day 147\)/.test(det.textContent) && /por_ghost_x/.test(det.textContent), det && det.textContent.slice(0, 200));
    const a = S2.pipeline.markFinal('charter'), art = S2.pipeline.markFinal('art');
    check('and when Art and Audio opens its namespace the reference stops being owed: Day 147\'s own fill clears it, so nothing is owed or broken', a.ok && art.ok && X.collect().counts.forward === 0 && X.collect().counts.broken === 0, [a.ok, art.ok, X.collect().counts]);
    X.close(); }
  { const rr = await studio(); const S2 = rr.win.Studio, K2 = rr.win.Kit;
    await open(S2, F.four149);
    const b = K2.bundle.current(), mapId = Object.keys(b.world.records.map_)[0];
    S2.show('charter'); await wait(40);
    const ok = K2.jump(mapId);
    check('Kit.jump on a World record from the Charter stage switches to the World stage first (every jump is retargeted, Kit\'s own validation panel included)', ok === true && S2.stage === 'world', [ok, S2.stage]);
    S2.show('story'); await wait(30);
    check('Kit.jump on a Charter record from the Story stage switches back to the Charter stage', (() => { const chr = Object.keys(b.rules.chr_)[0]; const k = K2.jump(chr); return S2.stage === 'charter'; })(), [S2.stage]); }
  { const rr = await studio(); const S2 = rr.win.Studio, K2 = rr.win.Kit;
    await open(S2, F.d146);
    const b = K2.bundle.current(); const before = S2.stage;
    const ok = K2.jump('map_somewhere_x1');
    check('Kit.jump toward a locked stage refuses with the reason and moves nothing', ok === false && S2.stage === before && toasts(rr.win).some((t) => /World is locked\. Mark the Art and Audio stage Final first\./.test(t)), toasts(rr.win));
    const x = S2.unresolved, f = { jumpable: false, stage: 'world', recordId: 'world', tab: null };
    check('an unresolved finding with no record (a whole stage check) opens its stage, and a locked one refuses the same way', x.jump(f) === false && S2.stage === before); }
  { const f = { 1: new FI.IDBFactory() };
    let rr = await studio({ indexedDB: f[1] }); const S2 = rr.win.Studio, K2 = rr.win.Kit;
    await open(S2, F.demo149); S2.unresolved.open(); await wait(60);
    await S2.store.flush();
    rr = await studio({ indexedDB: f[1] });
    check('the dock is persistent: a page reload brings it back open, on the same project', rr.win.document.getElementById('unresolved').hidden === false && rr.win.document.body.getAttribute('data-dock') === 'open' && rr.win.Studio.stage === 'story', [rr.win.document.getElementById('unresolved').hidden, rr.win.Studio.stage]); }

  // ---------------------------------------------------------------- 7. isolation and native mode
  { const rr = await studio(); const S2 = rr.win.Studio, K2 = rr.win.Kit;
    await open(S2, F.d146);
    const b = K2.bundle.current(), orig = JSON.parse(F.d146);
    for (const id of ['world', 'story', 'game']) sbtn(rr.win, id).click();
    await wait(60);
    check('locked stage buttons never give a bundle the namespace of a stage it has not reached', canon(b.world) === '{}' && canon(b.story) === '{}' && canon(b.art) === '{}' && S2.stage === 'charter', [Object.keys(b.world), Object.keys(b.story), Object.keys(b.art)]);
    sbtn(rr.win, 'art').click(); await wait(60);
    check('control: the unlocked Art stage does open and gives the bundle its art namespace, so the gate is not simply switching everything off', S2.stage === 'art' && Object.keys(K2.bundle.current().art).length > 0 && canon(K2.bundle.current().world) === '{}'); }
  { const rr = await studio();  const S2 = rr.win.Studio, K2 = rr.win.Kit;
    await open(S2, F.four149);
    await open(S2, F.d146); await wait(500);
    const b = K2.bundle.current();
    check('switching from a full project to a Day 146 only one does not let a forge\'s delayed meter repaint fill art, world or story on the new bundle (forge debounces fire only while their stage is live)', canon(b.art) === '{}' && canon(b.world) === '{}' && canon(b.story) === '{}' && S2.unresolved.summary().warning <= 2, [Object.keys(b.art).length, S2.unresolved.summary()]); }
  { const rr = await bootReady({ evalEngines: true }), S2 = rr.win.Studio;
    check('native mode (the forges\' own suites) is left as it was: the Phase 1 stage bar, no pipeline install, Kit.jump unwrapped, Kit.go not gated', S2.native === true && !S2.pipeline.installed && rr.win.document.querySelectorAll('[data-stage-btn]').length === 4 && !rr.win.Kit.jump.studioWrapped && !rr.win.document.getElementById('btnUnresolved') && S2.show('story') !== undefined, rr.errors); }

  const pass = results.filter((x) => x.ok).length;
  results.forEach((x) => console.log((x.ok ? 'PASS ' : 'FAIL ') + x.name + (x.ok ? '' : '  ' + (safe(x.detail) || '').slice(0, 1200))));
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'phase3-report.json'), JSON.stringify({ pass, total: results.length, results: results.map((x) => ({ name: x.name, ok: x.ok })) }, null, 1));
  console.log('\n' + pass + ' of ' + results.length + ' passed');
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
