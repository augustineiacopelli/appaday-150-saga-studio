// === STUDIO:BOOT BEGIN ===
// The Studio's own boot, in the place of each forge's app-boot.js. Wires the shell, restores or creates the project, and
// enters a stage. Phase 2: one store (IndexedDB, core/idb.js), one importer and one project list (core/projects.js). With
// window.STUDIO_NATIVE set (a test, before the page loads) the Phase 1 path runs instead: each forge keeps its own storage.
(function () {
  'use strict';
  var Kit = window.Kit, Studio = window.Studio;
  function wire(id, icon, label, fn) {
    var b = document.getElementById(id);
    if (!b) return;
    if (icon) b.innerHTML = Kit.icon(icon) + (label ? '<span class="lbl">' + label + '</span>' : '');
    b.addEventListener('click', fn);
  }
  Studio.watchTabs();
  // One store, one importer, one export dispatcher: swapped in once, after every forge has loaded.
  if (!Studio.native) { Studio.store.install(); Studio.projects.install(); Studio.pipeline.install(); }
  Kit.theme.apply();
  try { window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', function () { if (Kit.theme.get() === 'system') Kit.theme.apply(); }); } catch (e) {}
  wire('btnSettings', 'gear', null, function () { Kit.settings.open(); });
  var th = document.getElementById('btnTheme');
  if (th) th.addEventListener('click', Kit.theme.toggle);
  wire('btnTitle', null, null, Kit.renameProject);
  wire('btnValidation', null, null, Kit.openValidation);
  // The size and coverage chips belong to the stage on screen: each click goes to that forge's own opener.
  function stageApi(name) { var st = Studio.stages[Studio.stage], a = st && st.api; return a && typeof a[name] === 'function' ? a[name] : null; }
  wire('btnSize', null, null, function () { var f = stageApi('openSize'); if (f) f(); });
  wire('btnCoverage', null, null, function () { var f = stageApi('openCoverage'); if (f) f(); });
  wire('btnSave', 'save', 'Save', function () { if (Kit.bundle.save()) Kit.ui.toast('Draft saved in this browser.', 'ok'); });
  wire('btnSlots', 'slots', 'Projects', function () { if (Studio.native) Kit.openSlots(); else Studio.projects.openList(); });
  wire('btnImport', 'import', 'Import', function () { var f = document.getElementById('fileImport'); f.value = ''; f.click(); });
  wire('btnExport', 'export', 'Export', function () { Kit.openExport(); });
  var fi = document.getElementById('fileImport');
  if (fi) fi.addEventListener('change', function (e) { Kit.importPicked(e.target.files && e.target.files[0]); });
  // The stage bar. Shipped, it is the pipeline header (core/pipeline.js): five stages, locked until the one before is Final.
  // In native mode (the forges' own phase suites) it stays the Phase 1 bar, one ungated button per forge.
  var bar = document.getElementById('stages');
  if (bar && !Studio.native) Studio.pipeline.mountHeader(bar);
  else if (bar) {
    Studio.STAGES.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'btn'; b.setAttribute('data-stage-btn', s.id);
      b.textContent = s.label;
      b.addEventListener('click', function () { Studio.show(s.id); });
      bar.appendChild(b);
    });
  }
  Studio.show = function (stageId, tab) {
    // A stage that is locked lands on the furthest stage that is not (a project opens where it stands; a bundle whose upstream
    // was edited out from under it opens at the last stage that still holds). The stage bar refuses with a reason instead.
    if (!Studio.native && Studio.pipeline) { var land = Studio.pipeline.landing(stageId); if (land !== stageId) { stageId = land; tab = null; } }
    if (!Studio.enter(stageId)) return false;
    var want = tab || (stageId === 'charter' ? 'charter' : 'start');
    var ok = Kit.go(stageId + '.' + want, { silent: true });
    if (bar) Array.prototype.forEach.call(bar.querySelectorAll('[data-stage-btn]'), function (b) { b.setAttribute('aria-current', b.getAttribute('data-stage-btn') === Studio.stage ? 'true' : 'false'); });
    if (!Studio.native && Studio.pipeline) Studio.pipeline.paint();
    return ok;
  };
  if (!Studio.native) Studio.unresolved.install();
  if (!Studio.native && Studio.testplay) Studio.testplay.install();
  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      if (Kit.bundle.save()) Kit.ui.toast('Draft saved in this browser.', 'ok');
    } else if (e.key === 'Escape' && Kit.ui.overlayCount() && !Kit.ui.busy.active()) { e.preventDefault(); Kit.ui.closeTop(); }
  });
  // Starting a stage mirrors what the forge's own app-boot does: wait for its storage mirror (Days 147 to 149 may keep the
  // draft in IndexedDB), restore or create the bundle, run the forge's ensure pass, open the saved tab, paint its meters.
  // window.STUDIO_START names the stage to start in (tests set it); otherwise the saved tab decides, then the charter.
  Studio.startStage = function (stageId) {
    var st = Studio.stages[stageId];
    Studio.enter(stageId);
    var api = st.api, ready = api && api.storage && api.storage.ready ? api.storage.ready() : Promise.resolve();
    Studio.booted = Promise.resolve(ready).then(function () {
      var b = Kit.bundle.restoreDraft() || Kit.bundle.create('Untitled Saga');
      if (api && api.ensure) { var changed = api.ensure(b); if (api.registerCodex) changed = api.registerCodex(b) || changed; if (changed) Kit.bundle.touch(st.ns + '-ensure'); }
      var tab = Kit.uiState.get().tab;
      var local = tab && tab.indexOf('.') > 0 && tab.slice(0, tab.indexOf('.')) === stageId ? tab.slice(tab.indexOf('.') + 1) : null;
      if (!(local && Kit.go(stageId + '.' + local, { silent: true }))) Studio.show(stageId);
      else Studio.show(stageId, local);
      if (api && api.paintMeter) api.paintMeter();
      if (api && api.paintCoverage) api.paintCoverage();
    });
    return Studio.booted;
  };
  // Phase 2 start: wait for the store's mirror, pick the stage (a test's STUDIO_START, then where the author was, then where the
  // project stands, then the Charter), make it the stage on screen before the project loads so Kit's load event reaches only
  // the stages that bundle has reached, restore or create the project, run the stage's ensure pass, open the saved tab.
  Studio.startProject = function () {
    Studio.booted = Studio.store.ready().then(function () {
      Kit.theme.apply();   // the saved theme lives in the store, which was not ready when the shell first painted
      var entry = Studio.store.list().filter(function (p) { return p.id === Studio.store.currentId(); })[0];
      var tab = (Kit.uiState.get() || {}).tab, fromTab = tab && tab.indexOf('.') > 0 ? tab.slice(0, tab.indexOf('.')) : null;
      var stage = window.STUDIO_START || fromTab || (entry && entry.stage) || 'charter';
      if (!Studio.stages[stage] || !Studio.stages[stage].loaded) stage = 'charter';
      var st = Studio.stages[stage], api = st.api;
      Studio.preselect(stage);
      var b = Kit.bundle.restoreDraft() || Kit.bundle.create('Untitled Saga');
      // The stage the project stood at may be locked now (the Charter was relocked, a Final was downgraded): open the last one that holds.
      var land = Studio.pipeline.landing(stage, b);
      if (land !== stage) { stage = land; st = Studio.stages[stage]; api = st.api; tab = null; fromTab = null; Studio.preselect(stage); }
      if (api && api.ensure) { var changed = api.ensure(b); if (api.registerCodex) changed = api.registerCodex(b) || changed; if (changed) Kit.bundle.touch(st.ns + '-ensure'); }
      Studio.enter(stage);
      var local = tab && fromTab === stage ? tab.slice(tab.indexOf('.') + 1) : null;
      if (!(local && Kit.go(stage + '.' + local, { silent: true }))) Studio.show(stage);
      else Studio.show(stage, local);
      if (api && api.paintMeter) api.paintMeter();
      if (api && api.paintCoverage) api.paintCoverage();
      if (Studio.unresolved && Studio.unresolved.restore) Studio.unresolved.restore();
    });
    return Studio.booted;
  };
  if (Studio.native) {
    var ui = Kit.uiState.get(), tab = ui && ui.tab, first = window.STUDIO_START || (tab && tab.indexOf('.') > 0 ? tab.slice(0, tab.indexOf('.')) : 'charter');
    if (!Studio.stages[first] || !Studio.stages[first].loaded) first = 'charter';
    Studio.startStage(first);
  } else Studio.startProject();
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') Kit.bundle.suspend.save(); });
  window.addEventListener('pagehide', function () { Kit.bundle.suspend.save(); });
})();
// === STUDIO:BOOT END ===
