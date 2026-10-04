// Preload for running a forge's own phase tests inside the Studio page:  node -r ../../appaday-150-saga-studio/test/hook-studio.js phase3.js
// (run from the forge's test directory). The forge's tests call their own test/boot.js with the forge's index.html. This hook
// answers that require with a boot that opens the Studio page instead, starting in the stage that forge became, so every
// assertion about the forge now runs against the stacked page. Nothing in the forge's repository is edited.
'use strict';
const Module = require('module');
const path = require('path');
const fs = require('fs');
const { boot } = require('./boot');
const STAGE_OF = { '146': 'charter', '147': 'art', '148': 'world', '149': 'story' };
function stageFor(file) { const m = /appaday-(14[6-9])-|[\\/]app(14[6-9])[\\/]/.exec(String(file)); return m ? STAGE_OF[m[1] || m[2]] : null; }
// Each forge's build.js embeds its fixtures into src/<x>-demo.js. The same embedding (as each forge does it) is evaluated in
// the Studio window after boot, so ART_DEMO, WORLD_DEMO and STORY_DEMO are the forge's own while its tests run.
const embed = (f) => JSON.stringify(JSON.parse(fs.readFileSync(f, 'utf8'))).replace(/<\//g, '<\\/').replace(/[\u007f-\uffff]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));
function demoSource(stage, dir) {
  const R = (p) => fs.readFileSync(path.join(dir, p), 'utf8'), O = (f) => path.join(dir, 'test', 'out', f);
  if (stage === 'art') return R('src/art-demo.js').replace('/*DEMO_JSON*/null', () => embed(O('demo-bundle.json')));
  if (stage === 'world') return R('src/world-demo.js').replace('/*DEMO_JSON*/null', () => embed(O('demo147-bundle.json'))).replace('/*FOUR_JSON*/null', () => embed(O('four147-bundle.json')));
  if (stage === 'story') return R('src/story-demo.js').replace('/*DEMO_JSON*/null', () => embed(O('demo148-bundle.json'))).replace('/*FOUR_JSON*/null', () => embed(O('four148-bundle.json')));
  return null;
}
const orig = Module._load;
Module._load = function (request, parent, isMain) {
  if (/(^|[\\/])boot(\.js)?$/.test(request) && parent && /[\\/]test[\\/]/.test(parent.filename || '') && /appaday-14[6-9]/.test(parent.filename || '')) {
    const forgeBoot = function (file, opts) {
      const stage = stageFor(file);
      if (!stage || /\.html$/.test(String(file)) === false) return orig.apply(this, arguments);
      const r = boot(Object.assign({}, opts, { stage }));
      // each forge's tests await its own NS.booted promise; in the Studio that promise is Studio.booted
      const dir = path.dirname(String(file));
      const demo = demoSource(stage, dir);
      if (demo) r.win.eval(demo);
      const g = r.win.Studio.stages[stage].global;
      if (g && r.win[g]) r.win[g].booted = r.win.Studio.booted;
      return r;
    };
    return { boot: forgeBoot };
  }
  return orig.apply(this, arguments);
};
