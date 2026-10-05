// === STUDIO:EXPORT BEGIN ===
// Saga Studio, Day 150, Phase 6: Build game.
//
// The Game stage writes the project out as a game that stands on its own, in two forms:
//   one file   <slug>.html: player.css in a style element, the five engines inline in contract order, the bundle as an
//              application/json script, then player.js. It opens from disk with no network and nothing beside it.
//   a folder   <slug>-game.zip holding <slug>/index.html (the player and the bundle inline, the five engines loaded from the
//              files beside it), the five engine files, bundle.json, the Day 149 story manifest and a README. Upload the
//              folder to any static host (GitHub Pages included) and it is a web game. JSZip comes from cdnjs; when it cannot
//              be reached the same files download one by one instead, as Day 149's game kit does.
//
// What a game is comes from Day 149's Day 150 contract: the five engine files in load order (render, audio, world, battle,
// story) and the Final bundle, nothing from any forge, no Kit, no network, no key. The player (player/player.js) is the
// same file Test Play runs in its frame, so what was tested is what ships.
//
// The gate: every forge stage Final and none stale, and the unresolved drawer empty (nothing blocking, nothing owed, every
// check actually run). Both forms recheck each engine's sha256 against the game kit table (STUDIO_ENGINE_FILES) and the
// player's against core/player-text.js before anything is written; a mismatch stops the build and names the file.
//
// DECISION, byte for byte: the one file inlines every engine exactly as the game kit holds it. No engine, player.js or
// player.css contains a closing script or style tag or any non ASCII character, and vendor.js asserts both permanently.
// The bundle is the only text escaped: '<', '>' and '&' as <, > and &, and every non ASCII character as
// \uXXXX, which leaves the JSON's meaning unchanged and the file pure ASCII.
// DECISION, the bundle hash: the one file names it in a comment; the folder's engine-story.js carries it on the
// '/* Bundle hash <hex> */' line under its header, exactly as Day 149's Final writes it. The sha256 rule ignores that line.
// DECISION, the bundle written is the one in memory with kit.contentHash stamped on a copy, so building changes nothing in
// the project and marks nothing dirty. Both outputs are deterministic: the same project builds the same bytes. The one stamp
// that would vary, the manifest's exportedAt, takes the project's last saved time, as do the zip's entry dates.
// Needs core/pipeline.js, core/unresolved.js, core/testplay.js, core/engine-text.js and core/player-text.js. Plain ES5.
(function () {
  'use strict';
  var Kit = window.Kit, Studio = window.Studio, U = Kit.util;
  if (!Studio || !Studio.pipeline) throw new Error('Studio export: core/pipeline.js must load first.');
  var B = Studio.build = {};
  B.VERSION = '1.0.0';
  B.JSZIP_URL = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
  B.LOAD_ORDER = ['render', 'audio', 'world', 'battle', 'story'];
  var FORGE_STAGES = ['charter', 'art', 'world', 'story'];
  // Closing tags are built from parts, so this file can itself be inlined into a page (a test harness does) without ending
  // the script element it sits in.
  var END_SCRIPT = '<' + '/script>', END_STYLE = '<' + '/style>';

  function bundle() { return Kit.bundle.current(); }
  function engineFiles() { return (window.STUDIO_ENGINE_FILES || []).slice(); }
  function noHashLine(s) { return String(s).replace(/^\/\* Bundle hash [0-9a-f]+ \*\/\n/m, ''); }
  function kb(n) { return n < 1024 ? n + ' bytes' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; }
  function bytes(s) { try { return new TextEncoder().encode(s).length; } catch (e) { return String(s).length; } }
  // ASCII for HTML text: anything outside ASCII becomes a numeric character reference.
  function asciiHtml(s) { return U.esc(String(s == null ? '' : s)).replace(/[^\x00-\x7f]/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }
  // JSON that is safe inside a script element and pure ASCII. Every escaped character can only sit inside a JSON string.
  B.scriptJson = function (value) {
    return JSON.stringify(value).replace(/[<>&\u007f-\uffff]/g, function (c) { return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4); });
  };

  // ---------------------------------------------------------------- the gate
  // Every requirement with whether it holds, in the order the Game panel lists them.
  B.requirements = function (b) {
    b = b || bundle();
    var P = Studio.pipeline, out = [];
    FORGE_STAGES.forEach(function (id) {
      var s = b ? P.stateOf(id, b) : null, ok = !!s && s.final && !s.stale.length;
      out.push({ key: id, label: P.LABEL[id] + ' is Final', ok: ok,
        why: !s ? 'No project is open.' : s.stale.length ? s.stale[0] : s.final ? null : 'Mark the ' + P.LABEL[id] + ' stage Final.' });
    });
    var sum = b && Studio.unresolved ? Studio.unresolved.summary(b) : null;
    out.push({ key: 'unresolved', label: 'Nothing unresolved', ok: !!sum && sum.empty,
      why: !sum ? 'The unresolved drawer is not loaded.' : sum.empty ? null : sum.pending ? 'Some checks have not run yet. Open the unresolved drawer to run them.' : (sum.blocking + sum.owed + sum.failed) + ' unresolved. Open the drawer to fix them.' });
    return out;
  };
  // Null when the project can be built, else the first reason it cannot.
  B.blocked = function (b) {
    b = b || bundle();
    if (!b) return 'No project is open.';
    var miss = B.requirements(b).filter(function (r) { return !r.ok; })[0];
    if (miss) return miss.why || miss.label;
    if (Studio.testplay) { var tp = Studio.testplay.blocked(b); if (tp) return tp; }
    return null;
  };

  // True when the one thing in the way is a stage check that has not run on the project as it is (the drawer's 'unchecked'):
  // every stage Final and current, nothing blocking, nothing owed, nothing failed. The Build buttons run the checks first then.
  B.onlyUnchecked = function (b) {
    b = b || bundle();
    if (!b || !Studio.unresolved) return false;
    var req = B.requirements(b), sum = Studio.unresolved.summary(b);
    if (req.some(function (r) { return !r.ok && r.key !== 'unresolved'; })) return false;
    if (Studio.testplay && Studio.testplay.blocked(b)) return false;
    return !sum.empty && sum.pending > 0 && !sum.blocking && !sum.owed && !sum.failed;
  };
  // Runs the unrun checks when they are all that stands in the way, then resolves; otherwise resolves at once.
  B.ensureChecked = function () {
    if (!B.onlyUnchecked()) return Promise.resolve(false);
    return Studio.unresolved.runStoryChecks().then(function () { try { Kit.rerender(); } catch (e) { /* the panel repaints on its next render */ } return true; });
  };

  // ---------------------------------------------------------------- the parts, each checked
  // The five engines in load order, each against the sha256 the game kit table holds. Throws naming every file that fails.
  B.engines = function () {
    var text = window.STUDIO_ENGINE_TEXT || {}, table = engineFiles(), bad = [];
    var order = table.map(function (f) { return f.key; });
    if (order.join() !== B.LOAD_ORDER.join()) throw new Error('The game kit lists its engines out of the contract order (' + order.join(', ') + ').');
    var out = table.map(function (f) {
      var t = text[f.key];
      if (typeof t !== 'string' || !t) { bad.push(f.file + ' (missing)'); return null; }
      if (U.sha256(noHashLine(t)) !== f.sha256) bad.push(f.file + ' (its sha256 is not the one in the game kit)');
      if (/<\/script/i.test(t) || /[^\x00-\x7f]/.test(t)) bad.push(f.file + ' (it cannot be inlined byte for byte)');
      return { key: f.key, file: f.file, global: f.global, owner: f.owner, version: f.version, sha256: f.sha256, text: t };
    });
    if (bad.length) throw new Error('Build game stopped: ' + bad.join('; ') + '.');
    return out;
  };
  // player.js and player.css, against the sha256 core/player-text.js was derived with.
  B.player = function () {
    var P = window.STUDIO_PLAYER_TEXT;
    if (!P || typeof P.js !== 'string' || typeof P.css !== 'string') throw new Error('Build game stopped: core/player-text.js is not loaded.');
    var bad = [];
    if (U.sha256(P.js) !== P.sha256.js) bad.push('player.js');
    if (U.sha256(P.css) !== P.sha256.css) bad.push('player.css');
    if (/<\/script/i.test(P.js) || /<\/style/i.test(P.css)) bad.push('the player (a closing tag inside it)');
    if (bad.length) throw new Error('Build game stopped: ' + bad.join(', ') + ' does not match its sha256.');
    return { js: P.js, css: P.css, sha256: { js: P.sha256.js, css: P.sha256.css } };
  };
  // The bundle as written: a copy of the one in memory with its content hash stamped.
  B.bundleOut = function (b) {
    b = b || bundle();
    var copy = JSON.parse(JSON.stringify(b)), hash = Kit.bundle.hash(b);
    copy.kit.contentHash = hash;
    return { value: copy, hash: hash, text: JSON.stringify(copy, null, 2) };
  };
  // Day 149's Final manifest for this bundle, built by the Story forge itself (with its stage live, the way Mark stage Final
  // runs it). Its day150 block is the contract; a manifest without one means the story is not proven, and nothing is built.
  B.manifest = function (b, hash) {
    var st = Studio.stages.story, api = st && st.api;
    if (!api || typeof api.manifest !== 'function') throw new Error('Build game stopped: the Story stage is not loaded.');
    var prev = Studio.stage, hop = prev !== 'story', m = null, err = null;
    if (hop) Studio.enter('story');
    try { m = api.manifest(b, hash); } catch (e) { err = e; }
    if (hop && prev) Studio.enter(prev);
    if (err) throw new Error('Build game stopped: the story manifest failed: ' + (err.message || String(err)));
    if (!m || !m.day150) throw new Error('Build game stopped: the story checks have not proven a path to an ending.');
    if (m.unresolved && m.unresolved.length) throw new Error('Build game stopped: the story manifest lists ' + m.unresolved.length + ' unresolved ID' + (m.unresolved.length === 1 ? '' : 's') + '.');
    return m;
  };

  // ---------------------------------------------------------------- the page
  // mode 'single' inlines the engines; mode 'folder' loads them from the files beside index.html.
  B.page = function (o) {
    var title = asciiHtml(o.title);
    var head = [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">',
      '<meta name="theme-color" content="#07070c">',
      '<meta name="generator" content="Saga Studio ' + B.VERSION + ' (AppADay 150)">',
      '<title>' + title + '</title>',
      '<meta name="description" content="' + title + ', a role playing game built with Saga Studio.">',
      '<style>',
      o.player.css + END_STYLE,
      '</head>',
      '<body>',
      '<!-- ' + title + '. Built with Saga Studio (AppADay 150, https://augustineiacopelli.github.io/appaday/).',
      '     Bundle hash ' + o.hash + '. Engines, in load order, with the sha256 of each (any Bundle hash line removed):',
      o.engines.map(function (e) { return '       ' + e.file + ' ' + e.sha256; }).join('\n'),
      '     The game is this page: the player, the five engines and the bundle. It needs nothing else, not even a network. -->'
    ];
    var eng = o.mode === 'single'
      ? o.engines.map(function (e) { return '<script>\n' + e.text + END_SCRIPT; })
      : o.engines.map(function (e) { return '<script src="' + e.file + '">' + END_SCRIPT; });
    return head.concat(eng, [
      '<script type="application/json" id="saga-bundle">' + B.scriptJson(o.bundle) + END_SCRIPT,
      '<script>\n' + o.player.js + END_SCRIPT,
      '</body>',
      '</html>',
      ''
    ]).join('\n');
  };
  // engine-story.js as the folder ships it: the bundle hash on its own line under the header, as Day 149's Final writes it.
  B.storyWithHash = function (text, hash) {
    var t = noHashLine(text), at = t.indexOf('*/\n');
    return at < 0 ? t : t.slice(0, at + 3) + '/* Bundle hash ' + hash + ' */\n' + t.slice(at + 3);
  };

  function readme(o) {
    var t = String(o.title || 'Untitled Saga').replace(/[^\x00-\x7f]/g, '?');
    return [
      '# ' + t,
      '',
      'A role playing game built with Saga Studio (AppADay 150).',
      '',
      '## Playing it',
      '',
      'Open `index.html` in a browser. Everything the game needs is in this folder, and it runs with no network.',
      'On a computer: arrows or WASD to walk, Enter, Space or Z to act, Escape or X to go back, M for the menu. On a phone the touch pad appears.',
      '',
      'To put it on the web, upload the contents of this folder to any static host. On GitHub Pages: make a repository, add',
      'these files at its root, and turn on Pages for the main branch.',
      '',
      'Saves live in the browser that plays the game, under keys named after the game. The save menu can download a save',
      'file and the title screen can load one back, which is the way to move a save between browsers or devices.',
      '',
      '## What is here',
      '',
      '| File | What it is |',
      '| --- | --- |',
      '| `index.html` | The player and the game bundle. It loads the five engines below, in this order. |',
      o.engines.map(function (e) { return '| `' + e.file + '` | ' + e.global + ', from AppADay ' + e.owner + ', version ' + e.version + '. sha256 `' + e.sha256 + '` |'; }).join('\n'),
      '| `bundle.json` | The Saga Bundle. Import it into Saga Studio to keep working on the game. |',
      '| `' + o.manifestName + '` | The Story forge manifest. Its `day150` block is the contract this game runs on. |',
      '',
      'Bundle hash `' + o.hash + '`. Each engine sha256 is taken over the file with any `/* Bundle hash ... */` line removed.',
      '',
      'Saga Studio: https://augustineiacopelli.github.io/appaday-150-saga-studio/',
      ''
    ].join('\n');
  }

  // ---------------------------------------------------------------- building (no download)
  // The date a build carries (the manifest's exportedAt, every zip entry): the project's last saved time, so the same project
  // builds the same bytes. A project with no usable time gets the day Build game shipped.
  function buildDate(b) {
    var d = new Date(b && b.kit && b.kit.updatedAt || 0);
    return isNaN(d.getTime()) || d.getTime() <= 0 ? new Date(Date.UTC(2026, 9, 4)) : d;
  }
  // Everything both forms share, checked. Throws with the reason when the gate is shut or a part fails its check.
  B.prepare = function (b) {
    b = b || bundle();
    var why = B.blocked(b);
    if (why) throw new Error('Build game is not ready. ' + why);
    var engines = B.engines(), player = B.player(), out = B.bundleOut(b), slug = Kit.bundle.slug(b);
    var manifest = B.manifest(b, out.hash);
    var order = (manifest.day150.loadOrder || []).join();
    if (order !== engines.map(function (e) { return e.file; }).join()) throw new Error('Build game stopped: the story manifest asks for the engines in a different order (' + order + ').');
    // Day 149 stamps exportedAt with the time of the call. A build stamps the project's own last saved time instead, the same
    // date the zip's entries carry, so the same project builds the same manifest.
    manifest.exportedAt = buildDate(b).toISOString();
    var pins = {};
    (manifest.day150.engines || []).forEach(function (f) { pins[f.file] = f.sha256; });
    var drift = engines.filter(function (e) { return pins[e.file] !== e.sha256; }).map(function (e) { return e.file; });
    if (drift.length) throw new Error('Build game stopped: the story manifest pins a different sha256 for ' + drift.join(', ') + '.');
    return { bundle: b, out: out, slug: slug, title: b.kit && b.kit.title || 'Untitled Saga', engines: engines, player: player, manifest: manifest,
      manifestName: slug + '-story-manifest.json' };
  };
  // The one file: {name, text, bytes, hash}.
  B.buildSingle = function (b) {
    var p = B.prepare(b);
    var text = B.page({ mode: 'single', title: p.title, hash: p.out.hash, engines: p.engines, player: p.player, bundle: p.out.value });
    return { name: p.slug + '.html', text: text, bytes: bytes(text), hash: p.out.hash };
  };
  // The folder: {folder, name, hash, files [{path, name, text, mime}]}, index.html first.
  B.buildFolder = function (b) {
    var p = B.prepare(b);
    var files = [{ path: 'index.html', text: B.page({ mode: 'folder', title: p.title, hash: p.out.hash, engines: p.engines, player: p.player, bundle: p.out.value }), mime: 'text/html' }];
    p.engines.forEach(function (e) { files.push({ path: e.file, text: e.key === 'story' ? B.storyWithHash(e.text, p.out.hash) : e.text, mime: 'text/javascript' }); });
    files.push({ path: 'bundle.json', text: p.out.text, mime: 'application/json' });
    files.push({ path: p.manifestName, text: JSON.stringify(p.manifest, null, 2), mime: 'application/json' });
    files.push({ path: 'README.md', text: readme({ title: p.title, hash: p.out.hash, engines: p.engines, manifestName: p.manifestName }), mime: 'text/markdown' });
    // A file downloaded on its own carries the game's slug, so two games' files never collide in a downloads folder.
    files.forEach(function (f) { f.name = f.path === 'index.html' ? p.slug + '.html' : f.path === 'bundle.json' ? p.slug + '-bundle.json' : f.path === 'README.md' ? p.slug + '-README.md' : f.path; });
    return { folder: p.slug, name: p.slug + '-game.zip', hash: p.out.hash, files: files, date: buildDate(p.bundle) };
  };

  // ---------------------------------------------------------------- JSZip, on demand
  var zipLoad = null;
  B.loadZip = function (ms) {
    if (window.JSZip) return Promise.resolve(window.JSZip);
    if (zipLoad) return zipLoad;
    zipLoad = new Promise(function (resolve, reject) {
      var s = document.createElement('script'), done = false;
      var finish = function (ok) {
        if (done) return; done = true;
        clearTimeout(timer);
        if (ok && window.JSZip) resolve(window.JSZip);
        else { if (s.parentNode) s.parentNode.removeChild(s); zipLoad = null; reject(new Error('JSZip could not be loaded from cdnjs.')); }
      };
      var timer = setTimeout(function () { finish(false); }, ms || 12000);
      s.src = B.JSZIP_URL; s.async = true; s.crossOrigin = 'anonymous';
      s.onload = function () { finish(true); }; s.onerror = function () { finish(false); };
      document.head.appendChild(s);
    });
    return zipLoad;
  };
  B.zip = function (folder, JSZip) {
    // Every entry, the folder's own included, carries the project's date (JSZip would stamp a folder it makes itself with the
    // time of the build), so the same project zips to the same bytes.
    var z = new JSZip(), root = folder.folder + '/';
    z.file(root, null, { dir: true, date: folder.date });
    folder.files.forEach(function (f) { z.file(root + f.path, f.text, { date: folder.date, createFolders: false }); });
    return z.generateAsync({ type: 'blob', mimeType: 'application/zip', compression: 'DEFLATE', compressionOptions: { level: 6 }, platform: 'UNIX' });
  };

  // ---------------------------------------------------------------- downloading
  function saveBlob(name, blob) {
    var a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = name; a.rel = 'noopener'; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); URL.revokeObjectURL(url); }, 4000);
  }
  function each(files) { files.forEach(function (f, i) { setTimeout(function () { U.download(f.name, f.text, f.mime); }, i * 350); }); }
  B.last = null;
  function report(kind, info) { B.last = { kind: kind, at: U.now(), info: info }; paintResult(); }
  // The buttons' handlers. Each returns a promise of {ok, kind, name, bytes, hash} or {ok:false, reason}.
  B.downloadSingle = function () { return B.ensureChecked().then(singleNow); };
  function singleNow() {
    var r;
    try { r = B.buildSingle(); } catch (e) { Kit.ui.toast(e.message, 'warn', 8000); report('error', { reason: e.message }); return Promise.resolve({ ok: false, reason: e.message }); }
    saveBlob(r.name, new Blob([r.text], { type: 'text/html' }));
    Kit.ui.toast('Built ' + r.name + ' (' + kb(r.bytes) + '). Open it in any browser to play.', 'ok', 6000);
    var res = { ok: true, kind: 'single', name: r.name, bytes: r.bytes, hash: r.hash };
    report('single', res);
    return Promise.resolve(res);
  }
  B.downloadZip = function (opts) { return B.ensureChecked().then(function () { return zipNow(opts || {}); }); };
  function zipNow(opts) {
    var f;
    try { f = B.buildFolder(); } catch (e) { Kit.ui.toast(e.message, 'warn', 8000); report('error', { reason: e.message }); return Promise.resolve({ ok: false, reason: e.message }); }
    return B.loadZip(opts.timeout).then(function (JSZip) {
      return B.zip(f, JSZip).then(function (blob) {
        saveBlob(f.name, blob);
        Kit.ui.toast('Built ' + f.name + ' (' + kb(blob.size) + '). Unzip it and open index.html, or upload the folder to a web host.', 'ok', 7000);
        var res = { ok: true, kind: 'zip', name: f.name, bytes: blob.size, hash: f.hash, files: f.files.map(function (x) { return x.path; }) };
        report('zip', res);
        return res;
      });
    }, function () {
      // No JSZip (offline, or cdnjs blocked): the same files, one download each, under names that cannot collide.
      each(f.files);
      Kit.ui.toast('JSZip could not be loaded, so the ' + f.files.length + ' game files are downloading one by one. Put them in one folder and rename ' + f.files[0].name + ' to index.html.', 'warn', 10000);
      var res = { ok: true, kind: 'files', name: f.folder, bytes: f.files.reduce(function (n, x) { return n + bytes(x.text); }, 0), hash: f.hash, files: f.files.map(function (x) { return x.name; }) };
      report('files', res);
      return res;
    });
  }

  // ---------------------------------------------------------------- the Game panel section
  var resultEl = null;
  function paintResult() {
    if (!resultEl || !resultEl.isConnected) return;
    var l = B.last;
    if (!l) { resultEl.textContent = ''; return; }
    if (l.kind === 'error') { resultEl.className = 'build-result build-error'; resultEl.textContent = l.info.reason; return; }
    resultEl.className = 'build-result build-ok';
    resultEl.textContent = (l.kind === 'files' ? 'Downloaded ' + l.info.files.length + ' files for ' + l.info.name : 'Built ' + l.info.name) + ', ' + kb(l.info.bytes) + ', bundle hash ' + String(l.info.hash).slice(0, 12) + '.';
  }
  B.renderPanel = function (p) {
    var sec = U.el('section', 'build-panel');
    sec.id = 'buildPanel';
    sec.appendChild(U.el('h3', 'section-h', 'Build game'));
    var why = B.blocked(), runFirst = !!why && B.onlyUnchecked();
    if (runFirst) why = null;
    sec.appendChild(U.el('p', 'muted', why
      ? U.esc('Build game opens when every stage is Final and nothing is unresolved. ' + why)
      : (runFirst ? 'The story checks have not run on the project as it is now, so building runs them first. ' : '') + 'Writes the project out as a game that plays on its own: the player, the five engines and the bundle. Nothing from Saga Studio comes along, and the game needs no network.'));
    var row = U.el('div', 'build-actions');
    var one = U.el('button', 'btn btn-primary', Kit.icon('export') + '<span class="lbl">One HTML file</span>'); one.type = 'button'; one.id = 'btnBuildSingle';
    var zip = U.el('button', 'btn', Kit.icon('export') + '<span class="lbl">Folder as a .zip</span>'); zip.type = 'button'; zip.id = 'btnBuildZip';
    [[one, B.downloadSingle, 'One file that opens in any browser, from disk or a web host.'], [zip, B.downloadZip, 'index.html, the five engine files, bundle.json, the story manifest and a README, ready for a web host.']].forEach(function (x) {
      var btn = x[0];
      if (why) { btn.setAttribute('aria-disabled', 'true'); btn.title = why; } else btn.title = x[2];
      btn.addEventListener('click', function () {
        if (btn.getAttribute('aria-disabled') === 'true' || btn.getAttribute('aria-busy') === 'true') { if (why) Kit.ui.toast(why, 'warn', 6000); return; }
        btn.setAttribute('aria-busy', 'true');
        x[1]().then(function () { btn.removeAttribute('aria-busy'); }, function () { btn.removeAttribute('aria-busy'); });
      });
      row.appendChild(btn);
    });
    sec.appendChild(row);
    resultEl = U.el('p', 'build-result');
    resultEl.setAttribute('aria-live', 'polite');
    sec.appendChild(resultEl);
    paintResult();
    p.appendChild(sec);
  };
  B.installed = true;
})();
// === STUDIO:EXPORT END ===
