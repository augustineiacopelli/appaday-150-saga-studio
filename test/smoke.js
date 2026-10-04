const { boot } = require('./boot');
(async () => {
  const { win, errors } = await boot();
  console.log('errors:', errors.length); errors.slice(0, 8).forEach((e) => console.log(' -', e.slice(0, 400)));
  const S = win.Studio, K = win.Kit;
  console.log('stages loaded:', S.STAGES.map((s) => s.id + ':' + S.stages[s.id].loaded + ':' + S.stages[s.id].mounts.join('/')).join(' | '));
  console.log('active', K.active(), 'stage', S.stage, 'body', win.document.body.getAttribute('data-stage'));
  console.log('workspaces', K.workspaces().join(','));
  console.log('WS keys', Object.keys(win.WS).join(','));
  process.exit(0);
})();
