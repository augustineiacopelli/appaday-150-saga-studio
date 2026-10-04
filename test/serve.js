// A tiny static server for the browser tests: serves the repository root on a free port, so player/player.html can load
// ../engines/*.js and ?bundle=../test/out/*.json exactly as GitHub Pages serves them.
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png' };
function serve(port) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const u = decodeURIComponent(req.url.split('?')[0]);
      const file = path.join(ROOT, u.endsWith('/') ? u + 'index.html' : u);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end('not found'); return; }
      res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(port || 0, '127.0.0.1', () => resolve({ srv, url: 'http://127.0.0.1:' + srv.address().port }));
  });
}
module.exports = { serve, ROOT };
if (require.main === module) serve(Number(process.argv[2]) || 8150).then(({ url }) => console.log('serving ' + ROOT + ' at ' + url));
