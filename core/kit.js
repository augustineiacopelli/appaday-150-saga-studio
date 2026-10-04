// === KIT:CORE BEGIN ===
(function () {
  'use strict';

  var Kit = window.Kit = {};
  window.WS = window.WS || {};
  Kit.version = '1.0.0';

  // ---------------------------------------------------------------- util
  var U = Kit.util = {};
  U.now = function () { return new Date().toISOString(); };
  U.isObj = function (o) { return o !== null && typeof o === 'object' && !Array.isArray(o); };
  U.clone = function (o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); };
  U.noop = function () {};
  U.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  U.rand36 = function (n) {
    var out = '', chars = '0123456789abcdefghijklmnopqrstuvwxyz', buf = new Uint8Array(n);
    try { crypto.getRandomValues(buf); } catch (e) { for (var j = 0; j < n; j++) buf[j] = Math.floor(Math.random() * 256); }
    for (var i = 0; i < n; i++) out += chars[buf[i] % 36];
    return out;
  };
  U.slug = function (s, sep) {
    sep = sep || '-';
    var t = String(s == null ? '' : s).toLowerCase();
    try { t = t.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
    return t.replace(/[^a-z0-9]+/g, sep).replace(new RegExp('^' + sep + '+|' + sep + '+$', 'g'), '');
  };
  U.debounce = function (fn, ms) {
    var t = null, args = null, self = null;
    function run() { t = null; var a = args; args = null; fn.apply(self, a || []); }
    function d() { args = arguments; self = this; clearTimeout(t); t = setTimeout(run, ms); }
    d.flush = function () { if (t) { clearTimeout(t); run(); } };
    d.pending = function () { return !!t; };
    d.cancel = function () { clearTimeout(t); t = null; args = null; };
    return d;
  };
  U.canonical = function canonical(v) {
    if (v === null || typeof v !== 'object') {
      if (v === undefined || (typeof v === 'number' && !isFinite(v))) return 'null';
      return JSON.stringify(v);
    }
    if (Array.isArray(v)) {
      return '[' + v.map(function (x) { return x === undefined ? 'null' : canonical(x); }).join(',') + ']';
    }
    var keys = Object.keys(v).filter(function (k) { return v[k] !== undefined && typeof v[k] !== 'function'; }).sort();
    return '{' + keys.map(function (k) { return JSON.stringify(k) + ':' + canonical(v[k]); }).join(',') + '}';
  };
  // Path helpers: 'a.b[2].c'
  U.parsePath = function (path) {
    var out = [];
    String(path || '').replace(/\[(\d+)\]|[^.[\]]+/g, function (m, idx) { out.push(idx !== undefined ? Number(idx) : m); return m; });
    return out;
  };
  U.getPath = function (obj, path) {
    var parts = U.parsePath(path), cur = obj;
    for (var i = 0; i < parts.length; i++) { if (cur == null) return undefined; cur = cur[parts[i]]; }
    return cur;
  };
  U.parentPath = function (path) {
    path = String(path || '');
    var m = /^(.*)(\[\d+\]|\.[^.[\]]+)$/.exec(path);
    return m ? m[1] : '';
  };
  U.download = function (name, text, mime) {
    var blob = new Blob([text], { type: mime || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { U.detach(a); URL.revokeObjectURL(url); }, 1000);
  };
  U.readFile = function (file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(String(r.result)); };
      r.onerror = function () { reject(new Error('Could not read the file.')); };
      r.readAsText(file);
    });
  };
  U.detach = function (node) { if (node && node.parentNode) node.parentNode.removeChild(node); };
  U.clear = function (node) { while (node && node.firstChild) node.removeChild(node.firstChild); };
  U.el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  U.fmtDate = function (iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return iso; }
  };
  U.fmtSize = function (chars) { return chars > 1e6 ? (chars / 1e6).toFixed(2) + ' MB' : Math.max(1, Math.round(chars / 1e3)) + ' KB'; };

  // SHA-256 (sync, UTF-8), so hashing works on file:// and inside tests.
  var SHA_K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  U.sha256 = function (str) {
    var msg = new TextEncoder().encode(String(str));
    var l = msg.length, total = Math.ceil((l + 9) / 64) * 64;
    var buf = new Uint8Array(total);
    buf.set(msg); buf[l] = 0x80;
    var dv = new DataView(buf.buffer);
    dv.setUint32(total - 8, Math.floor(l / 0x20000000));
    dv.setUint32(total - 4, (l * 8) >>> 0);
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var W = new Array(64);
    for (var off = 0; off < total; off += 64) {
      var i;
      for (i = 0; i < 16; i++) W[i] = dv.getUint32(off + i * 4);
      for (i = 16; i < 64; i++) {
        var w15 = W[i - 15], w2 = W[i - 2];
        var s0 = ((w15 >>> 7) | (w15 << 25)) ^ ((w15 >>> 18) | (w15 << 14)) ^ (w15 >>> 3);
        var s1 = ((w2 >>> 17) | (w2 << 15)) ^ ((w2 >>> 19) | (w2 << 13)) ^ (w2 >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      var a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + SHA_K[i] + W[i]) >>> 0;
        var S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        var mj = (a & b) ^ (a & c) ^ (b & c);
        var t2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map(function (x) { return ('00000000' + x.toString(16)).slice(-8); }).join('');
  };

  // ---------------------------------------------------------------- icons
  var ICONS = {
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    slots: '<rect x="3" y="4" width="8" height="7" rx="1.5"/><rect x="13" y="4" width="8" height="7" rx="1.5"/><rect x="3" y="13" width="8" height="7" rx="1.5"/><rect x="13" y="13" width="8" height="7" rx="1.5"/>',
    import: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    export: '<path d="M12 15V3M7 8l5-5 5 5M4 21h16"/>',
    check: '<path d="M5 12l5 5 9-10"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    up: '<path d="M6 15l6-6 6 6"/>',
    down: '<path d="M6 9l6 6 6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
    spark: '<path d="M12 3l2.2 5.8L20 11l-5.8 2.2L12 19l-2.2-5.8L4 11l5.8-2.2z"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    warn: '<path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.2"/>',
    jump: '<path d="M7 17L17 7M9 7h8v8"/>',
    edit: '<path d="M4 20h4L20 8l-4-4L4 16z"/>',
    scroll: '<path d="M6 4h11a3 3 0 0 1 0 6h-1v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"/><path d="M8 9h5M8 13h5"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M8 7h8"/>',
    sword: '<path d="M14 4h6v6L9 21l-2-2-2 2-2-2 2-2-2-2z"/><path d="M13 11l-6 6"/>',
    arena: '<path d="M3 20h18M5 20V10l7-5 7 5v10"/><path d="M10 20v-5h4v5"/>',
    chart: '<path d="M4 20V4M4 20h16"/><path d="M8 16v-4M12 16V8M16 16v-6"/>',
    key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>'
  };
  Kit.icon = function (name, cls) {
    return '<svg class="ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  };

  // ---------------------------------------------------------------- events
  var listeners = {};
  Kit.on = function (evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); return function () { Kit.off(evt, fn); }; };
  Kit.off = function (evt, fn) { var l = listeners[evt] || []; var i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); };
  Kit.emit = function (evt, data) {
    (listeners[evt] || []).slice().forEach(function (fn) {
      try { fn(data); } catch (e) { console.error('[Kit] listener for ' + evt + ' failed', e); }
    });
  };

  // ---------------------------------------------------------------- store
  var STORE_WARN = 4.5e6;
  var lastStoreWarn = 0;
  function warnStorage(projected) {
    var t = Date.now();
    if (t - lastStoreWarn < 30000) return;
    lastStoreWarn = t;
    if (Kit.ui && Kit.ui.toast) Kit.ui.toast('Browser storage is nearly full (' + U.fmtSize(projected) + '). Export your bundle to keep your work safe.', 'warn', 7000);
  }
  Kit.store = {
    get: function (key, fallback) {
      try { var v = localStorage.getItem(key); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set: function (key, value) {
      var s;
      try { s = JSON.stringify(value); } catch (e) { return false; }
      try {
        var old = localStorage.getItem(key);
        var projected = Kit.store.usage() - (old != null ? old.length + key.length : 0) + s.length + key.length;
        if (projected > STORE_WARN) warnStorage(projected);
      } catch (e) {}
      try { localStorage.setItem(key, s); return true; } catch (e) {
        if (Kit.ui && Kit.ui.toast) Kit.ui.toast('Could not save to browser storage. Export your bundle now to keep your work.', 'error', 8000);
        return false;
      }
    },
    del: function (key) { try { localStorage.removeItem(key); return true; } catch (e) { return false; } },
    usage: function () {
      var n = 0;
      try {
        for (var i = 0; i < localStorage.length; i++) {
          var k = localStorage.key(i); var v = localStorage.getItem(k) || '';
          n += k.length + v.length;
        }
      } catch (e) {}
      return n;
    },
    keys: function (prefix) {
      var out = [];
      try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (!prefix || k.indexOf(prefix) === 0) out.push(k); } } catch (e) {}
      return out;
    },
    LIMIT_WARN: STORE_WARN
  };

  // UI state (kit:ui)
  Kit.uiState = {
    get: function () { var s = Kit.store.get('kit:ui', {}); return U.isObj(s) ? s : {}; },
    set: function (patch) { var s = Kit.uiState.get(); Object.keys(patch).forEach(function (k) { s[k] = patch[k]; }); Kit.store.set('kit:ui', s); return s; }
  };

  // ---------------------------------------------------------------- settings
  var SETTINGS_KEY = 'kit:settings';
  var TIERS = ['haiku', 'sonnet', 'opus', 'fable'];
  var settingsCache = null;
  Kit.settings = {
    TIERS: TIERS,
    get: function () {
      if (!settingsCache) {
        var s = Kit.store.get(SETTINGS_KEY, {});
        if (!U.isObj(s)) s = {};
        var tiers = U.isObj(s.tiers) ? s.tiers : {};
        settingsCache = { key: typeof s.key === 'string' ? s.key : '', session: typeof s.session === 'string' ? s.session : '', tiers: {} };
        TIERS.forEach(function (t) { settingsCache.tiers[t] = typeof tiers[t] === 'string' ? tiers[t] : ''; });
      }
      return settingsCache;
    },
    set: function (patch) {
      var s = Kit.settings.get();
      if (patch.key !== undefined) s.key = String(patch.key).trim();
      if (patch.session !== undefined) s.session = String(patch.session).trim();
      if (U.isObj(patch.tiers)) TIERS.forEach(function (t) { if (patch.tiers[t] !== undefined) s.tiers[t] = String(patch.tiers[t]).trim(); });
      Kit.store.set(SETTINGS_KEY, s);
      Kit.emit('settings', s);
      return s;
    },
    hasKey: function () { return !!Kit.settings.get().key; },
    open: function () { openSettings(); }
  };

  // ---------------------------------------------------------------- models
  var MODEL_FALLBACK = { haiku: 'claude-haiku-4-5-20251001', sonnet: 'claude-sonnet-5-5', opus: 'claude-opus-5-5', fable: 'claude-fable-5-1' };
  var configPromise = null;
  function loadConfig() {
    if (!configPromise) {
      configPromise = (async function () {
        var urls = ['../config.json', 'https://augustineiacopelli.github.io/appaday/config.json'];
        for (var i = 0; i < urls.length; i++) {
          try {
            var r = await fetch(urls[i], { cache: 'no-cache' });
            if (!r.ok) continue;
            var c = await r.json();
            if (c && c.models) return c;
          } catch (e) { /* try next */ }
        }
        return null;
      })();
    }
    return configPromise;
  }
  // Standard AppADay getModel(tier): Settings override, then ../config.json, then fallback.
  async function getModel(tier) {
    tier = tier || 'sonnet';
    var override = Kit.settings.get().tiers[tier];
    if (override) return override;
    try { var c = await loadConfig(); if (c && c.models && c.models[tier]) return c.models[tier]; } catch (e) {}
    return MODEL_FALLBACK[tier] || MODEL_FALLBACK.sonnet;
  }
  Kit.getModel = getModel;

  // ---------------------------------------------------------------- claude
  var API_URL = 'https://api.anthropic.com/v1/messages';
  var NO_KEY_MSG = 'Add your Claude API key in Settings to use AI features.';

  function firstBalanced(text) {
    var start = -1;
    for (var i = 0; i < text.length; i++) { if (text[i] === '{' || text[i] === '[') { start = i; break; } }
    if (start < 0) return null;
    var depth = 0, inStr = false, esc = false;
    for (var j = start; j < text.length; j++) {
      var c = text[j];
      if (inStr) {
        if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false;
        continue;
      }
      if (c === '"') inStr = true;
      else if (c === '{' || c === '[') depth++;
      else if (c === '}' || c === ']') { depth--; if (depth === 0) return text.slice(start, j + 1); }
    }
    return null;
  }
  function extractJson(text) {
    if (!text || !String(text).trim()) return { ok: false, error: 'empty reply' };
    text = String(text);
    var cands = [], lastErr = 'no JSON found';
    var fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(text);
    if (fence) cands.push(fence[1]);
    var bal = firstBalanced(text);
    if (bal) cands.push(bal);
    cands.push(text);
    for (var i = 0; i < cands.length; i++) {
      try { return { ok: true, value: JSON.parse(cands[i].trim()) }; } catch (e) { lastErr = e.message; }
    }
    return { ok: false, error: lastErr };
  }

  async function callApi(key, body) {
    var res, data = null;
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error('Could not reach the Claude API (' + e.message + ').');
    }
    try { data = await res.json(); } catch (e) { data = null; }
    if (!res.ok) {
      var m = data && data.error && data.error.message ? data.error.message : 'HTTP ' + res.status;
      var err = new Error('Claude API error: ' + m);
      err.status = res.status;
      throw err;
    }
    var blocks = (data && data.content) || [];
    var text = blocks.filter(function (b) { return b && b.type === 'text'; }).map(function (b) { return b.text; }).join('');
    if (!text.trim()) {
      console.warn('[Kit.claude] Empty reply.', { blockTypes: blocks.map(function (b) { return b && b.type; }), stop_reason: data && data.stop_reason });
      throw new Error('Claude returned an empty reply (stop_reason: ' + (data && data.stop_reason) + ').');
    }
    return { text: text, data: data };
  }

  // Some models reject thinking {type:'disabled'} and ask for {type:'between_tools'} instead. The first rejection is
  // detected from the API message, the request is retried once with the other mode, and the choice is remembered per model.
  var THINK_MODE = {};
  async function callApiThinking(key, body) {
    try {
      return await callApi(key, body);
    } catch (e) {
      var msg = String(e && e.message || '');
      if (e && e.status === 400 && msg.indexOf('between_tools') >= 0 && body.thinking && body.thinking.type !== 'between_tools') {
        THINK_MODE[body.model] = 'between_tools';
        body.thinking = { type: 'between_tools' };
        return await callApi(key, body);
      }
      throw e;
    }
  }

  Kit.claude = async function (opts) {
    opts = opts || {};
    var key = Kit.settings.get().key;
    if (!key) {
      var nk = new Error(NO_KEY_MSG); nk.code = 'NO_KEY';
      if (!opts.silent) Kit.ui.toast(NO_KEY_MSG, 'warn');
      throw nk;
    }
    try {
      var model = await getModel(opts.tier || 'sonnet');
      var messages = (opts.messages || []).slice();
      var body = { model: model, max_tokens: opts.maxTokens || 1024, messages: messages, thinking: { type: THINK_MODE[model] || 'disabled' } };
      if (opts.system) body.system = opts.system;
      var reply = await callApiThinking(key, body);
      if (!opts.expectJson) return { text: reply.text, json: null, model: model, response: reply.data };
      var parsed = extractJson(reply.text);
      if (!parsed.ok) {
        body.messages = messages.concat([
          { role: 'assistant', content: reply.text },
          { role: 'user', content: 'Your previous reply could not be parsed as JSON (' + parsed.error + '). Reply again with only the corrected, complete, valid JSON and nothing else.' }
        ]);
        reply = await callApiThinking(key, body);
        parsed = extractJson(reply.text);
        if (!parsed.ok) throw new Error('Claude returned JSON that could not be parsed, even after one repair attempt.');
      }
      return { text: reply.text, json: parsed.value, model: model, response: reply.data };
    } catch (e) {
      if (!opts.silent) Kit.ui.toast(e.message, 'error', 7000);
      throw e;
    }
  };
  Kit.claude.extractJson = extractJson;
  Kit.claude.NO_KEY_MSG = NO_KEY_MSG;

  // ---------------------------------------------------------------- codex (prefix table + types)
  var PREFIXES = {};
  function defPrefixes(ns, forge, list, module) {
    list.split(' ').forEach(function (p) { PREFIXES[p + '_'] = { prefix: p + '_', ns: ns, forge: forge, module: module || null }; });
  }
  defPrefixes('rules', 146, 'chr abl itm eqp sta frm fam enm gmb trp shp wth lim eps');
  defPrefixes('rules', 146, 'mat', 'materia');
  defPrefixes('rules', 146, 'job', 'jobs');
  defPrefixes('rules', 146, 'cls', 'classes');
  defPrefixes('rules', 146, 'rmr sdq bst', 'living');
  defPrefixes('charter', 146, 'chp');
  defPrefixes('art', 147, 'spr por anm sfx ico mus');
  defPrefixes('world', 148, 'map reg npc twn dgn');
  defPrefixes('story', 149, 'flg qst dlg evt end');
  var ID_RE = /^[a-z]{3}_[a-z0-9_]*[a-z0-9]$/;

  function normPrefix(p) {
    if (!p) return null;
    p = String(p).toLowerCase();
    if (p.length === 3) p += '_';
    return p;
  }
  function prefixOf(id) {
    var m = typeof id === 'string' && /^([a-z]{3})_/.exec(id);
    return m ? m[1] + '_' : null;
  }
  var typeRegistry = {};
  function mergedTypes(bundle) {
    var out = {};
    Object.keys(typeRegistry).forEach(function (k) { out[k] = typeRegistry[k]; });
    var bt = bundle && bundle.codex && U.isObj(bundle.codex.types) ? bundle.codex.types : {};
    Object.keys(bt).forEach(function (k) { if (U.isObj(bt[k])) out[k] = bt[k]; });
    return out;
  }
  Kit.codex = {
    PREFIXES: PREFIXES,
    ID_RE: ID_RE,
    normPrefix: normPrefix,
    prefixInfo: function (p) { return PREFIXES[normPrefix(p)] || null; },
    nsOf: function (p) { var i = PREFIXES[normPrefix(p)]; return i ? i.ns : null; },
    ownerOf: function (p) { var i = PREFIXES[normPrefix(p)]; return i ? i.forge : null; },
    isOpened: function (ns, bundle) {
      bundle = bundle || current;
      return !!(bundle && bundle.kit && Array.isArray(bundle.kit.opened) && bundle.kit.opened.indexOf(ns) >= 0);
    },
    // Runtime registration (not persisted). def = {name, prefix, label, fields:[descriptors], dependsOn:[paths], module}
    register: function (def) {
      if (!def || !def.name || !Array.isArray(def.fields)) throw new Error('Kit.codex.register needs {name, prefix, fields}.');
      var p = normPrefix(def.prefix);
      if (p && !PREFIXES[p]) PREFIXES[p] = { prefix: p, ns: def.ns || 'rules', forge: def.forge || 146, module: def.module || null };
      def.prefix = p;
      typeRegistry[def.name] = def;
      Kit.index.invalidate();
      return def;
    },
    unregister: function (name) { delete typeRegistry[name]; Kit.index.invalidate(); },
    types: function (bundle) { return mergedTypes(bundle || current); },
    type: function (name, bundle) { return mergedTypes(bundle || current)[name] || null; },
    typeFor: function (prefix, bundle) {
      bundle = bundle || current;
      var p = normPrefix(prefix);
      var cp = bundle && bundle.codex && bundle.codex.prefixes && bundle.codex.prefixes[p];
      if (typeof cp === 'string') return cp;
      if (U.isObj(cp) && cp.type) return cp.type;
      var all = mergedTypes(bundle), names = Object.keys(all);
      for (var i = 0; i < names.length; i++) { if (normPrefix(all[names[i]].prefix) === p) return names[i]; }
      return null;
    },
    fields: function (typeName, bundle) {
      var t = mergedTypes(bundle || current)[typeName];
      return t && Array.isArray(t.fields) ? t.fields : [];
    },
    // P7 (Pass 3): derived field functions, keyed by desc.derived. fn(record, bundle, path) -> value.
    derive: {}
  };

  // ---------------------------------------------------------------- bundle
  var SCHEMA_VERSION = 1;
  var DRAFT_KEY = 'kit:draft', SLOTS_KEY = 'kit:slots', SUSPEND_KEY = 'kit:suspend';
  var SLOT_COUNT = 4;
  var current = null;
  var changeCounter = 0;

  function emptyBundle(title) {
    var t = U.now();
    return {
      kit: {
        format: 'saga-bundle', schemaVersion: SCHEMA_VERSION, bundleId: 'bnd_' + U.rand36(12),
        title: title || 'Untitled Saga', createdAt: t, updatedAt: t, contentHash: '',
        opened: [], forges: { '146': { status: 'draft', exportedAt: null, charterVersion: 0 } }
      },
      charter: { version: 0, locked: false, lockedAt: null, sections: {}, specs: {}, quotas: {}, canon: [], glossary: [], ruleset: {}, amendments: [] },
      codex: { version: 0, generatedFromCharter: null, prefixes: {}, types: {}, modules: [] },
      rules: {}, art: {}, world: {}, story: {}
    };
  }
  function fillDefaults(target, base) {
    Object.keys(base).forEach(function (k) {
      if (target[k] === undefined) {
        target[k] = U.clone(base[k]);
      } else if (U.isObj(base[k]) && U.isObj(target[k]) && k !== 'types' && k !== 'rules') {
        fillDefaults(target[k], base[k]);
      }
    });
  }
  function migrate(b) {
    if (!U.isObj(b) || !U.isObj(b.kit) || b.kit.format !== 'saga-bundle') throw new Error('This file is not a Saga Forge bundle.');
    var v = Number(b.kit.schemaVersion) || 0;
    if (v > SCHEMA_VERSION) throw new Error('This bundle uses schema version ' + v + ', which is newer than this Forge supports.');
    var base = emptyBundle(b.kit.title);
    ['kit', 'charter', 'codex'].forEach(function (k) { if (!U.isObj(b[k])) b[k] = {}; });
    fillDefaults(b, base);
    if (!Array.isArray(b.kit.opened)) b.kit.opened = [];
    if (!U.isObj(b.kit.forges)) b.kit.forges = {};
    if (!U.isObj(b.kit.forges['146'])) b.kit.forges['146'] = { status: 'draft', exportedAt: null, charterVersion: 0 };
    ['rules', 'art', 'world', 'story'].forEach(function (k) { if (!U.isObj(b[k])) b[k] = {}; });
    b.kit.schemaVersion = SCHEMA_VERSION;
    return b;
  }
  function persistDraft() {
    if (!current) return false;
    return Kit.store.set(DRAFT_KEY, current);
  }
  var autosave = U.debounce(persistDraft, 800);
  function setCurrent(b) {
    autosave.cancel();
    current = b;
    changeCounter++;
    persistDraft();
    Kit.emit('load', b);
    Kit.emit('change', { reason: 'load' });
  }
  function hashOf(b) {
    if (!b) return '';
    var copy = {};
    Object.keys(b).forEach(function (k) { copy[k] = b[k]; });
    if (U.isObj(b.kit)) {
      copy.kit = {};
      Object.keys(b.kit).forEach(function (k) { if (k !== 'contentHash') copy.kit[k] = b.kit[k]; });
    }
    return U.sha256(U.canonical(copy));
  }
  function slotsRaw() {
    var arr = Kit.store.get(SLOTS_KEY, []);
    if (!Array.isArray(arr)) arr = [];
    for (var i = 0; i < SLOT_COUNT; i++) if (arr[i] === undefined) arr[i] = null;
    return arr.slice(0, SLOT_COUNT);
  }
  function titleSlug(b) { return U.slug((b && b.kit && b.kit.title) || 'saga') || 'saga'; }

  Kit.bundle = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    SLOT_COUNT: SLOT_COUNT,
    create: function (title) { var b = emptyBundle(title); setCurrent(b); return b; },
    blank: function (title) { return emptyBundle(title); },
    load: function (b) { migrate(b); setCurrent(b); return b; },
    current: function () { return current; },
    touch: function (reason) {
      if (!current) return;
      current.kit.updatedAt = U.now();
      changeCounter++;
      autosave();
      Kit.emit('change', { reason: reason || 'edit' });
    },
    hash: function (b) { return hashOf(b || current); },
    migrate: migrate,
    slug: function (b) { return titleSlug(b || current); },
    save: function () { autosave.cancel(); return persistDraft(); },
    flush: function () { if (autosave.pending()) autosave.flush(); },
    dirty: function () { return autosave.pending(); },
    open: function (ns) {
      if (!current || !ns) return;
      if (current.kit.opened.indexOf(ns) < 0) { current.kit.opened.push(ns); Kit.bundle.touch('open:' + ns); }
    },
    close: function (ns) {
      if (!current) return;
      var i = current.kit.opened.indexOf(ns);
      if (i >= 0) { current.kit.opened.splice(i, 1); Kit.bundle.touch('close:' + ns); }
    },
    restoreDraft: function () {
      var b = Kit.store.get(DRAFT_KEY, null);
      if (!b) return null;
      try { migrate(b); } catch (e) { console.warn('[Kit] Draft could not be restored', e); return null; }
      current = b; changeCounter++;
      Kit.emit('load', b); Kit.emit('change', { reason: 'restore' });
      return b;
    },
    // opts: {status:'draft'|'final', download:true}
    exportFile: function (opts) {
      opts = opts || {};
      if (!current) throw new Error('No project is open.');
      if (opts.status) {
        var f = current.kit.forges['146'] = current.kit.forges['146'] || {};
        f.status = opts.status;
        f.exportedAt = U.now();
        f.charterVersion = current.charter.version || 0;
      }
      current.kit.contentHash = hashOf(current);
      autosave.cancel(); persistDraft();
      changeCounter++;
      var text = JSON.stringify(current, null, 2);
      var name = titleSlug(current) + '-bundle.json';
      if (opts.download !== false) U.download(name, text, 'application/json');
      return { filename: name, text: text, hash: current.kit.contentHash };
    },
    importText: function (text) {
      var b;
      try { b = JSON.parse(text); } catch (e) { throw new Error('That file is not valid JSON.'); }
      migrate(b);
      var h = hashOf(b);
      var matches = !b.kit.contentHash || b.kit.contentHash === h;
      setCurrent(b);
      return { bundle: b, hash: h, storedHash: b.kit.contentHash || '', matches: matches };
    },
    importFile: function (file) { return U.readFile(file).then(function (text) { return Kit.bundle.importText(text); }); },
    slots: {
      list: function () {
        return slotsRaw().map(function (s, i) {
          return s ? { index: i, name: s.name, title: s.title, savedAt: s.savedAt, hash: s.hash, size: JSON.stringify(s.bundle || {}).length } : null;
        });
      },
      save: function (i, name) {
        if (!current) return false;
        if (i < 0 || i >= SLOT_COUNT) throw new Error('Slot index out of range.');
        Kit.bundle.flush();
        var arr = slotsRaw(), b = U.clone(current);
        arr[i] = { name: name || current.kit.title, title: current.kit.title, savedAt: U.now(), hash: hashOf(b), bundle: b };
        var ok = Kit.store.set(SLOTS_KEY, arr);
        if (ok) Kit.emit('slots', Kit.bundle.slots.list());
        return ok;
      },
      load: function (i) {
        var s = slotsRaw()[i];
        if (!s || !s.bundle) throw new Error('That slot is empty.');
        var b = U.clone(s.bundle);
        migrate(b);
        setCurrent(b);
        return b;
      },
      delete: function (i) {
        var arr = slotsRaw();
        arr[i] = null;
        var ok = Kit.store.set(SLOTS_KEY, arr);
        if (ok) Kit.emit('slots', Kit.bundle.slots.list());
        return ok;
      }
    },
    // Suspend: flushes the draft and records where the author was, restored on next boot.
    suspend: {
      save: function (extra) {
        if (!current) return false;
        Kit.bundle.flush();
        return Kit.store.set(SUSPEND_KEY, { at: U.now(), bundleId: current.kit.bundleId, hash: hashOf(current), workspace: Kit.active(), extra: extra || null });
      },
      load: function () { return Kit.store.get(SUSPEND_KEY, null); },
      clear: function () { return Kit.store.del(SUSPEND_KEY); }
    }
  };

  // ---------------------------------------------------------------- index + records
  var indexCache = { bundle: null, counter: -1, value: null };
  function buildIndex(b) {
    var byId = {}, byPrefix = {}, dupes = [];
    function visit(node, path, depth) {
      if (depth > 14 || node === null || typeof node !== 'object') return;
      if (Array.isArray(node)) { for (var i = 0; i < node.length; i++) visit(node[i], path + '[' + i + ']', depth + 1); return; }
      if (typeof node.id === 'string' && ID_RE.test(node.id) && PREFIXES[prefixOf(node.id)]) {
        var p = prefixOf(node.id);
        if (byId[node.id]) dupes.push({ id: node.id, path: path });
        else {
          var e = { id: node.id, prefix: p, name: String(node.name || node.title || node.term || node.id), path: path, record: node };
          byId[node.id] = e;
          (byPrefix[p] = byPrefix[p] || []).push(e);
        }
      }
      Object.keys(node).forEach(function (k) { visit(node[k], path ? path + '.' + k : k, depth + 1); });
    }
    ['charter', 'rules', 'art', 'world', 'story'].forEach(function (k) { if (b) visit(b[k], k, 0); });
    return { byId: byId, byPrefix: byPrefix, dupes: dupes };
  }
  Kit.index = function (bundle) {
    bundle = bundle || current;
    if (bundle !== current) return buildIndex(bundle);
    if (indexCache.bundle === bundle && indexCache.counter === changeCounter) return indexCache.value;
    indexCache = { bundle: bundle, counter: changeCounter, value: buildIndex(bundle) };
    return indexCache.value;
  };
  Kit.index.invalidate = function () { changeCounter++; };

  Kit.records = {
    list: function (prefix) { return (Kit.index().byPrefix[normPrefix(prefix)] || []).map(function (e) { return e.record; }); },
    get: function (id) { var e = Kit.index().byId[id]; return e ? e.record : null; },
    // Stores rules-namespace records at bundle.rules[prefix][id]. Other namespaces own their own storage.
    put: function (rec) {
      var p = prefixOf(rec && rec.id), info = PREFIXES[p];
      if (!info) throw new Error('Record has no valid ID prefix.');
      if (info.ns !== 'rules') throw new Error('Kit.records.put stores rules records only; ' + p + ' belongs to ' + info.ns + '.');
      current.rules[p] = current.rules[p] || {};
      current.rules[p][rec.id] = rec;
      Kit.index.invalidate();
      return rec;
    },
    del: function (id) {
      var p = prefixOf(id);
      if (p && current.rules[p] && current.rules[p][id]) {
        delete current.rules[p][id];
        if (!Object.keys(current.rules[p]).length) delete current.rules[p];
        Kit.index.invalidate();
        return true;
      }
      return false;
    }
  };

  // ---------------------------------------------------------------- ids
  var mintedThisSession = {};
  Kit.ids = {
    RE: ID_RE,
    prefixOf: prefixOf,
    isValid: function (id) { return typeof id === 'string' && ID_RE.test(id) && !!PREFIXES[prefixOf(id)]; },
    all: function () { return Object.keys(Kit.index().byId); },
    // IDs are permanent. There is deliberately no rename API; display names change freely.
    mint: function (prefix, name) {
      var p = normPrefix(prefix);
      if (!p || !PREFIXES[p]) throw new Error('Unknown ID prefix: ' + prefix);
      var slug = U.slug(name, '_').slice(0, 24).replace(/_+$/, '') || 'item';
      var taken = Kit.index().byId;
      for (var i = 0; i < 2000; i++) {
        var id = p + slug + '_' + U.rand36(4);
        if (!taken[id] && !mintedThisSession[id]) { mintedThisSession[id] = 1; return id; }
      }
      throw new Error('Could not mint a unique ID.');
    }
  };

  // ---------------------------------------------------------------- validation
  var validators = {};
  var BUCKET = { error: 'errors', broken: 'broken', forward: 'forward', warning: 'warnings' };
  function makeResult() { return { errors: [], broken: [], forward: [], warnings: [], byRecord: {} }; }
  function addItem(res, item) {
    item.level = BUCKET[item.level] ? item.level : 'error';
    res[BUCKET[item.level]].push(item);
    (res.byRecord[item.recordId] = res.byRecord[item.recordId] || []).push(item);
  }
  function vocabEntries(desc, bundle) {
    var src = null;
    if (Array.isArray(desc.values)) src = desc.values;
    else if (desc.enumFrom) src = U.getPath(bundle, desc.enumFrom);
    else return null;
    if (U.isObj(src) && Array.isArray(src.values)) src = src.values;
    if (!Array.isArray(src)) return [];
    return src.map(function (v) {
      if (U.isObj(v)) {
        var val = v.key != null ? v.key : v.id != null ? v.id : v.value;
        return { value: String(val), label: String(v.label || v.name || val) };
      }
      return { value: String(v), label: String(v) };
    }).filter(function (v) { return v.value !== 'undefined'; });
  }
  Kit.vocab = function (desc, bundle) { return vocabEntries(desc, bundle || current); };

  function checkRecord(bundle, idx, typeName, record, res, opts) {
    opts = opts || {};
    var rid = record.id || opts.draftId || '(draft)';
    var fields = Kit.codex.fields(typeName, bundle);
    var hasName = !!(Kit.codex.type(typeName, bundle) || {}).section || fields.some(function (f) { return f.key === 'name'; });
    if (!hasName && !String(record.name || '').trim()) addItem(res, { recordId: rid, fieldPath: 'name', message: 'Name is required.', level: 'error' });
    var typePrefix = normPrefix((Kit.codex.type(typeName, bundle) || {}).prefix);
    if (record.id && typePrefix && prefixOf(record.id) !== typePrefix) {
      addItem(res, { recordId: rid, fieldPath: 'id', message: 'ID prefix does not match type ' + typeName + '.', level: 'error' });
    }
    function err(path, msg, level, extra) {
      var it = { recordId: rid, fieldPath: path, message: msg, level: level || 'error' };
      if (extra) Object.keys(extra).forEach(function (k) { it[k] = extra[k]; });
      addItem(res, it);
    }
    function checkRef(desc, value, path, label) {
      if (typeof value !== 'string' || !ID_RE.test(value)) { err(path, label + ': "' + value + '" is not a valid ID.'); return; }
      var p = prefixOf(value), info = PREFIXES[p];
      if (!info) { err(path, label + ': unknown prefix ' + p + '.'); return; }
      if (desc.refPrefix) {
        var allowed = [].concat(desc.refPrefix).map(normPrefix);
        if (allowed.indexOf(p) < 0) { err(path, label + ' must reference ' + allowed.join(' or ') + ' records, not ' + p + '.'); return; }
      }
      var opened = Kit.codex.isOpened(info.ns, bundle);
      if (!opened) {
        if (opts.draft) err(path, label + ': forward ID ' + value + ' was not supplied in context. Leave it empty until forge ' + info.forge + ' provides it.', 'warning', { id: value });
        else err(path, 'Forward reference ' + value + ' is owed by forge ' + info.forge + '.', 'forward', { id: value, owedBy: info.forge });
      } else if (!idx.byId[value]) {
        err(path, (opts.draft ? 'Unknown reference: ' : 'Broken reference: ') + value + ' does not exist.', 'broken', { id: value });
      }
    }
    function checkField(desc, value, path) {
      if (desc.derived) return; // P7 (Pass 3): derived fields are computed, never validated.
      var label = desc.label || desc.key;
      var empty = value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length) || (desc.type === 'object' || desc.type === 'table') && U.isObj(value) && !Object.keys(value).length;
      if (empty) { if (desc.required) err(path, label + ' is required.'); return; }
      switch (desc.type) {
        case 'text': case 'longtext': case 'formula':
          if (typeof value !== 'string') { err(path, label + ' must be text.'); break; }
          if (desc.max != null && value.length > desc.max) err(path, label + ' is longer than ' + desc.max + ' characters.');
          if (desc.type === 'formula' && Kit.expr && typeof Kit.expr.parse === 'function') {
            try { Kit.expr.parse(value); } catch (e) { err(path, label + ': ' + e.message); }
          }
          break;
        case 'int': case 'num':
          if (typeof value !== 'number' || !isFinite(value)) { err(path, label + ' must be a number.'); break; }
          if (desc.type === 'int' && Math.floor(value) !== value) err(path, label + ' must be a whole number.');
          if (desc.min != null && value < desc.min) err(path, label + ' must be at least ' + desc.min + '.');
          if (desc.max != null && value > desc.max) err(path, label + ' must be at most ' + desc.max + '.');
          break;
        case 'bool':
          if (typeof value !== 'boolean') err(path, label + ' must be true or false.');
          break;
        case 'enum': {
          var v = vocabEntries(desc, bundle) || [];
          if (!v.some(function (e) { return e.value === String(value); })) {
            err(path, label + ': "' + value + '" is not in the declared vocabulary' + (desc.enumFrom ? ' (' + desc.enumFrom + ')' : '') + '.');
          }
          break;
        }
        case 'color':
          if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) err(path, label + ' must be a hex color like #a1b2c3.');
          break;
        case 'ref':
          checkRef(desc, value, path, label);
          break;
        case 'refList':
          if (!Array.isArray(value)) { err(path, label + ' must be a list of references.'); break; }
          value.forEach(function (x, i) { if (x != null && x !== '') checkRef(desc, x, path + '[' + i + ']', label); });
          if (desc.min != null && value.length < desc.min) err(path, label + ' needs at least ' + desc.min + ' entries.');
          if (desc.max != null && value.length > desc.max) err(path, label + ' allows at most ' + desc.max + ' entries.');
          break;
        case 'list':
          if (!Array.isArray(value)) { err(path, label + ' must be a list.'); break; }
          if (desc.min != null && value.length < desc.min) err(path, label + ' needs at least ' + desc.min + ' entries.');
          if (desc.max != null && value.length > desc.max) err(path, label + ' allows at most ' + desc.max + ' entries.');
          value.forEach(function (item, i) {
            var ip = path + '[' + i + ']';
            if (Array.isArray(desc.of)) {
              if (!U.isObj(item)) { err(ip, label + ' entry ' + (i + 1) + ' must be an object.'); return; }
              checkFields(desc.of, item, ip);
            } else if (desc.of) {
              checkField(Object.assign({ label: label + ' ' + (i + 1) }, desc.of), item, ip);
            }
          });
          break;
        case 'object':
          if (!U.isObj(value)) { err(path, label + ' must be an object.'); break; }
          if (Array.isArray(desc.of)) checkFields(desc.of, value, path);
          break;
        case 'table': {
          if (!U.isObj(value)) { err(path, label + ' must be a table.'); break; }
          var rows = desc.rows ? vocabEntries({ values: desc.rows }, bundle) : desc.rowsFrom ? vocabEntries({ enumFrom: desc.rowsFrom }, bundle) : null;
          var cellDesc = { type: desc.cell || 'num', min: desc.min, max: desc.max, values: desc.cellValues, enumFrom: desc.cellEnumFrom };
          Object.keys(value).forEach(function (rk) {
            var rp = path + '.' + rk;
            if (rows && !rows.some(function (r) { return r.value === rk; })) err(rp, label + ': row "' + rk + '" is not in the declared vocabulary' + (desc.rowsFrom ? ' (' + desc.rowsFrom + ')' : '') + '.');
            var cell = value[rk];
            if (Array.isArray(desc.columns)) {
              if (!U.isObj(cell)) { err(rp, label + ': row "' + rk + '" must hold column values.'); return; }
              desc.columns.forEach(function (c) {
                if (cell[c.key] !== undefined) checkField(Object.assign({}, cellDesc, c, { label: label + ' ' + rk + '/' + (c.label || c.key) }), cell[c.key], rp + '.' + c.key);
              });
            } else {
              checkField(Object.assign({}, cellDesc, { label: label + ' ' + rk }), cell, rp);
            }
          });
          break;
        }
        default:
          break;
      }
    }
    function checkFields(fields, obj, base) {
      fields.forEach(function (f) {
        if (!f || !f.key) return;
        checkField(f, obj[f.key], base ? base + '.' + f.key : f.key);
      });
    }
    checkFields(fields, record, '');
  }

  Kit.validate = function (bundle) {
    bundle = bundle || current;
    var res = makeResult();
    if (!bundle) return res;
    var idx = Kit.index(bundle);
    idx.dupes.forEach(function (d) { addItem(res, { recordId: d.id, fieldPath: 'id', message: 'Duplicate ID also found at ' + d.path + '.', level: 'error' }); });
    Object.keys(idx.byId).forEach(function (id) {
      var e = idx.byId[id];
      var tn = Kit.codex.typeFor(e.prefix, bundle);
      if (tn) checkRecord(bundle, idx, tn, e.record, res, {});
    });
    Object.keys(validators).forEach(function (name) {
      try {
        var out = validators[name](bundle, { index: idx, add: function (it) { addItem(res, it); } });
        if (Array.isArray(out)) out.forEach(function (it) { addItem(res, it); });
      } catch (e) {
        addItem(res, { recordId: '(validator)', fieldPath: name, message: 'Validator "' + name + '" failed: ' + e.message, level: 'warning' });
      }
    });
    if (bundle === current) Kit.validate.last = res;
    return res;
  };
  Kit.validate.last = null;
  Kit.validate.register = function (name, fn) { validators[name] = fn; Kit.index.invalidate(); };
  Kit.validate.unregister = function (name) { delete validators[name]; Kit.index.invalidate(); };
  Kit.validate.list = function () { return Object.keys(validators); };
  // Validate a single record (bundle record or unsaved draft). Returns a flat array of items.
  Kit.validate.record = function (typeName, record, opts) {
    opts = opts || {};
    var bundle = opts.bundle || current;
    var res = makeResult();
    checkRecord(bundle, Kit.index(bundle), typeName, record, res, opts);
    return res.errors.concat(res.broken, res.warnings, res.forward);
  };
  Kit.validate.summary = function (res) {
    res = res || Kit.validate.last || makeResult();
    return { errors: res.errors.length, broken: res.broken.length, forward: res.forward.length, warnings: res.warnings.length };
  };

  // ---------------------------------------------------------------- ui
  var overlayStack = [];
  function overlayRoot() { return document.getElementById('overlays') || document.body; }
  function pushOverlay(ov, close) {
    var prevFocus = document.activeElement;
    var entry = { el: ov, close: close, prevFocus: prevFocus };
    overlayStack.push(entry);
    overlayRoot().appendChild(ov);
    return entry;
  }
  function popOverlay(entry) {
    var i = overlayStack.indexOf(entry);
    if (i >= 0) overlayStack.splice(i, 1);
    U.detach(entry.el);
    if (entry.prevFocus && entry.prevFocus.focus && document.contains(entry.prevFocus)) { try { entry.prevFocus.focus({ preventScroll: true }); } catch (e) {} }
  }
  function focusFirst(node) {
    var f = node.querySelector('[autofocus], input:not([type=hidden]):not([disabled]), select, textarea, .dlg-body button, .dlg-foot button');
    if (f) { try { f.focus({ preventScroll: true }); } catch (e) {} }
  }

  Kit.ui = {};
  Kit.ui.toast = function (msg, kind, ms) {
    var root = document.getElementById('toasts');
    if (!root) { console.log('[toast]', msg); return; }
    var t = U.el('div', 'toast' + (kind ? ' ' + kind : ''));
    t.textContent = msg;
    t.setAttribute('role', kind === 'error' ? 'alert' : 'status');
    root.appendChild(t);
    while (root.children.length > 4) root.removeChild(root.firstChild);
    setTimeout(function () { U.detach(t); }, ms || (kind === 'error' ? 6000 : 3200));
    t.addEventListener('click', function () { U.detach(t); });
  };

  // dialog({title, body: Node|string|fn(bodyEl, handle), actions:[{label, kind, value, onClick(handle)->false keeps open, disabled}], onResult, wide, className})
  Kit.ui.dialog = function (o) {
    o = o || {};
    var ov = U.el('div', 'overlay');
    var dlg = U.el('div', 'dialog' + (o.wide ? ' wide' : '') + (o.className ? ' ' + o.className : ''));
    dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true');
    var titleId = 'dlgt_' + U.rand36(6);
    dlg.setAttribute('aria-labelledby', titleId);
    var head = U.el('div', 'dlg-head');
    var h = U.el('h2', 'dlg-title'); h.id = titleId; h.textContent = o.title || '';
    var x = U.el('button', 'btn btn-ghost btn-icon', Kit.icon('x')); x.type = 'button'; x.setAttribute('aria-label', 'Close');
    head.appendChild(h); head.appendChild(x);
    var body = U.el('div', 'dlg-body');
    var foot = U.el('div', 'dlg-foot');
    dlg.appendChild(head); dlg.appendChild(body); dlg.appendChild(foot);
    ov.appendChild(dlg);
    var done = false, entry;
    var handle = {
      el: dlg, body: body, foot: foot, head: head,
      close: function (value) {
        if (done) return; done = true;
        popOverlay(entry);
        if (o.onResult) o.onResult(value);
      },
      setActions: function (actions) {
        U.clear(foot);
        (actions || []).forEach(function (a) {
          var b = U.el('button', 'btn' + (a.kind ? ' btn-' + a.kind : ''), (a.icon ? Kit.icon(a.icon) : '') + '<span>' + U.esc(a.label) + '</span>');
          b.type = 'button';
          if (a.disabled) b.disabled = true;
          if (a.id) b.id = a.id;
          b.addEventListener('click', function () {
            if (a.onClick && a.onClick(handle) === false) return;
            handle.close(a.value);
          });
          foot.appendChild(b);
        });
        foot.style.display = (actions && actions.length) ? '' : 'none';
      }
    };
    x.addEventListener('click', function () { handle.close(undefined); });
    ov.addEventListener('mousedown', function (e) { if (e.target === ov && o.dismissable !== false) handle.close(undefined); });
    entry = pushOverlay(ov, function () { handle.close(undefined); });
    if (typeof o.body === 'function') o.body(body, handle);
    else if (o.body instanceof Node) body.appendChild(o.body);
    else if (o.body != null) body.innerHTML = o.body;
    handle.setActions(o.actions || []);
    focusFirst(dlg);
    return handle;
  };

  // Promise-based confirm that replaces window confirm dialogs.
  Kit.ui.confirm = function (o) {
    if (typeof o === 'string') o = { message: o };
    o = o || {};
    return new Promise(function (resolve) {
      Kit.ui.dialog({
        title: o.title || 'Please confirm',
        body: function (b) { var p = U.el('p'); p.textContent = o.message || 'Are you sure?'; b.appendChild(p); if (o.detail) { var d = U.el('p', 'muted'); d.textContent = o.detail; b.appendChild(d); } },
        actions: [
          { label: o.cancelLabel || 'Cancel', kind: 'ghost', value: false },
          { label: o.okLabel || 'Confirm', kind: o.danger ? 'danger solid' : 'primary', value: true }
        ],
        onResult: function (v) { resolve(v === true); }
      });
    });
  };

  Kit.ui.prompt = function (o) {
    if (typeof o === 'string') o = { label: o };
    o = o || {};
    return new Promise(function (resolve) {
      var input, msg;
      var dlg = Kit.ui.dialog({
        title: o.title || 'Enter a value',
        body: function (b) {
          var f = U.el('div', 'field');
          var lab = U.el('label', 'field-label'); lab.textContent = o.label || 'Value';
          input = U.el(o.multiline ? 'textarea' : 'input', 'inp');
          if (!o.multiline) input.type = 'text';
          input.id = 'kprompt_' + U.rand36(5); lab.htmlFor = input.id;
          input.value = o.value || ''; input.placeholder = o.placeholder || '';
          msg = U.el('div', 'field-msg');
          f.appendChild(lab); f.appendChild(input); f.appendChild(msg);
          b.appendChild(f);
          input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !o.multiline) { e.preventDefault(); submit(); } });
        },
        actions: [
          { label: 'Cancel', kind: 'ghost', value: null },
          { label: o.okLabel || 'OK', kind: 'primary', onClick: function () { submit(); return false; } }
        ],
        onResult: function (v) { resolve(v === undefined ? null : v); }
      });
      function submit() {
        var v = input.value;
        if (o.validate) {
          var problem = o.validate(v);
          if (problem) { msg.innerHTML = '<span class="msg msg-error">' + U.esc(problem) + '</span>'; input.focus(); return; }
        }
        dlg.close(v);
      }
      setTimeout(function () { try { input.focus(); input.select(); } catch (e) {} }, 0);
    });
  };

  // drawer({title, body(bodyEl, handle), actions, onClose}) -> handle {el, body, foot, close()}
  Kit.ui.drawer = function (o) {
    o = o || {};
    var ov = U.el('div', 'overlay drawer-overlay');
    var dr = U.el('aside', 'drawer');
    dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-modal', 'true');
    var tid = 'drt_' + U.rand36(6); dr.setAttribute('aria-labelledby', tid);
    var head = U.el('div', 'dlg-head');
    var h = U.el('h2', 'dlg-title'); h.id = tid; h.textContent = o.title || '';
    var x = U.el('button', 'btn btn-ghost btn-icon', Kit.icon('x')); x.type = 'button'; x.setAttribute('aria-label', 'Close');
    head.appendChild(h); head.appendChild(x);
    var body = U.el('div', 'dlg-body');
    var foot = U.el('div', 'dlg-foot'); foot.style.display = 'none';
    dr.appendChild(head); dr.appendChild(body); dr.appendChild(foot);
    ov.appendChild(dr);
    var done = false, entry;
    var handle = {
      el: dr, body: body, foot: foot, titleEl: h,
      setTitle: function (t) { h.textContent = t; },
      close: function () { if (done) return; done = true; popOverlay(entry); if (o.onClose) o.onClose(); }
    };
    x.addEventListener('click', handle.close);
    ov.addEventListener('mousedown', function (e) { if (e.target === ov) handle.close(); });
    entry = pushOverlay(ov, handle.close);
    if (typeof o.body === 'function') o.body(body, handle);
    else if (o.body instanceof Node) body.appendChild(o.body);
    focusFirst(dr);
    return handle;
  };

  var busyCount = 0, busyEl = null;
  Kit.ui.busy = {
    show: function (msg) {
      busyCount++;
      if (!busyEl) {
        busyEl = U.el('div', 'busy', '<div class="busy-card" role="status"><span class="spin"></span><span class="busy-msg"></span></div>');
        document.body.appendChild(busyEl);
      }
      busyEl.querySelector('.busy-msg').textContent = msg || 'Working...';
    },
    hide: function () {
      busyCount = Math.max(0, busyCount - 1);
      if (!busyCount && busyEl) { U.detach(busyEl); busyEl = null; }
    },
    active: function () { return busyCount > 0; }
  };

  Kit.ui.closeTop = function () {
    var top = overlayStack[overlayStack.length - 1];
    if (top) { top.close(); return true; }
    return false;
  };
  Kit.ui.overlayCount = function () { return overlayStack.length; };

  Kit.ui.stub = function (o) {
    var p = U.el('section', 'panel stub');
    p.innerHTML = '<div class="stub-glyph">' + Kit.icon(o.icon || 'scroll') + '</div><h2>' + U.esc(o.title) + '</h2><p>' + U.esc(o.lead || '') + '</p>' + (o.status ? '<p class="muted">' + U.esc(o.status) + '</p>' : '');
    return p;
  };

  // Searchable reference picker. Resolves an ID, null (cleared), or undefined (cancelled).
  Kit.ui.pickRef = function (o) {
    o = o || {};
    var prefixes = o.prefix ? [].concat(o.prefix).map(normPrefix) : Object.keys(PREFIXES);
    var idx = Kit.index();
    var items = [];
    prefixes.forEach(function (p) { (idx.byPrefix[p] || []).forEach(function (e) { items.push(e); }); });
    items.sort(function (a, b) { return a.name.localeCompare(b.name); });
    var fwd = prefixes.filter(function (p) { return PREFIXES[p] && !Kit.codex.isOpened(PREFIXES[p].ns); });
    return new Promise(function (resolve) {
      var dlg = Kit.ui.dialog({
        title: o.title || 'Choose a record',
        body: function (b, h) {
          var s = U.el('input', 'inp pick-search'); s.type = 'search'; s.placeholder = 'Search by name'; s.setAttribute('aria-label', 'Search records');
          var list = U.el('div', 'pick-list');
          b.appendChild(s); b.appendChild(list);
          function paint() {
            U.clear(list);
            var q = s.value.trim().toLowerCase();
            var shown = items.filter(function (e) { return !q || e.name.toLowerCase().indexOf(q) >= 0 || e.id.indexOf(q) >= 0; }).slice(0, 200);
            if (!shown.length) list.appendChild(U.el('div', 'empty-line', items.length ? 'No matches.' : 'No ' + prefixes.join(' / ') + ' records exist yet.'));
            shown.forEach(function (e) {
              var btn = U.el('button', 'btn pick-item', '<span class="ref-name">' + U.esc(e.name) + '</span><code class="id">' + U.esc(e.id) + '</code>');
              btn.type = 'button';
              if (e.id === o.current) btn.setAttribute('aria-current', 'true');
              btn.addEventListener('click', function () { h.close(e.id); });
              list.appendChild(btn);
            });
          }
          s.addEventListener('input', paint);
          paint();
          if (fwd.length) {
            var fw = U.el('div', 'field'); fw.style.marginTop = '14px';
            fw.innerHTML = '<label class="field-label">Forward ID</label><div class="field-help">' + U.esc(fwd.join(', ')) + ' records are owed by forge ' + U.esc(fwd.map(function (p) { return PREFIXES[p].forge; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ')) + '. Enter an ID to hold the slot.</div>';
            var row = U.el('div', 'ref-row');
            var fi = U.el('input', 'inp'); fi.type = 'text'; fi.placeholder = fwd[0] + 'example_ab12'; fi.setAttribute('aria-label', 'Forward ID');
            var go = U.el('button', 'btn', 'Use'); go.type = 'button';
            var fm = U.el('div', 'field-msg');
            row.appendChild(fi); row.appendChild(go); fw.appendChild(row); fw.appendChild(fm);
            go.addEventListener('click', function () {
              var v = fi.value.trim().toLowerCase();
              if (!ID_RE.test(v) || fwd.indexOf(prefixOf(v)) < 0) { fm.innerHTML = '<span class="msg msg-error">Use an ID starting with ' + U.esc(fwd.join(' or ')) + ' (lowercase letters, digits, underscores).</span>'; return; }
              h.close(v);
            });
            b.appendChild(fw);
          }
        },
        actions: [{ label: 'Clear', kind: 'ghost', value: null }, { label: 'Cancel', value: undefined }],
        onResult: function (v) { resolve(v); }
      });
      return dlg;
    });
  };

  // ---------------------------------------------------------------- form renderer
  var uid = 0;
  var FULL_TYPES = { longtext: 1, list: 1, object: 1, table: 1, refList: 1, formula: 1 };

  function refLabelHtml(v) {
    if (!v) return '<span class="ref-empty">None. Tap to choose.</span>';
    var e = Kit.index().byId[v], info = PREFIXES[prefixOf(v)], chip = '';
    if (info && !Kit.codex.isOpened(info.ns)) chip = '<span class="chip chip-forward">Forward &middot; ' + info.forge + '</span>';
    else if (!e) chip = '<span class="chip chip-broken">Broken</span>';
    return '<span class="ref-name">' + U.esc(e ? e.name : v) + '</span><code class="id">' + U.esc(v) + '</code>' + chip;
  }
  function iconBtn(icon, label, onClick, cls) {
    var b = U.el('button', 'btn btn-ghost btn-icon' + (cls ? ' ' + cls : ''), Kit.icon(icon));
    b.type = 'button'; b.setAttribute('aria-label', label); b.title = label;
    b.addEventListener('click', onClick);
    return b;
  }
  function defaultFor(desc) {
    if (!desc) return '';
    switch (desc.type) {
      case 'int': case 'num': return desc.min != null ? desc.min : 0;
      case 'bool': return false;
      case 'color': return '#888888';
      case 'ref': return null;
      case 'object': case 'table': return {};
      case 'list': case 'refList': return [];
      default: return '';
    }
  }
  function childSlot(slot, key) {
    return {
      get: function () { var o = slot.get(); return U.isObj(o) || Array.isArray(o) ? o[key] : undefined; },
      set: function (v) {
        var o = slot.get();
        if (!U.isObj(o)) { o = {}; slot.set(o); }
        if (v === undefined) delete o[key]; else o[key] = v;
      }
    };
  }
  function itemSlot(listSlot, i) {
    return {
      get: function () { var a = listSlot.get(); return Array.isArray(a) ? a[i] : undefined; },
      set: function (v) { var a = listSlot.get(); if (Array.isArray(a)) a[i] = v === undefined ? null : v; }
    };
  }

  var W = {};
  W.text = function (ctx, desc, slot, path, body, id) {
    var i = U.el('input', 'inp'); i.type = 'text'; i.id = id;
    i.value = slot.get() == null ? '' : String(slot.get());
    if (desc.placeholder) i.placeholder = desc.placeholder;
    if (ctx.readOnly) i.readOnly = true;
    i.addEventListener('input', function () { slot.set(i.value === '' ? undefined : i.value); ctx.changed(path); });
    body.appendChild(i);
  };
  W.longtext = function (ctx, desc, slot, path, body, id, mono) {
    var t = U.el('textarea', 'inp' + (mono ? ' mono' : '')); t.id = id; t.rows = mono ? 2 : 3;
    t.value = slot.get() == null ? '' : String(slot.get());
    if (desc.placeholder) t.placeholder = desc.placeholder;
    if (mono) { t.spellcheck = false; t.setAttribute('autocapitalize', 'off'); }
    if (ctx.readOnly) t.readOnly = true;
    function grow() { t.style.height = 'auto'; t.style.height = Math.min(480, t.scrollHeight + 2) + 'px'; }
    t.addEventListener('input', function () { slot.set(t.value === '' ? undefined : t.value); ctx.changed(path); grow(); });
    body.appendChild(t);
    setTimeout(grow, 0);
  };
  W.formula = function (ctx, desc, slot, path, body, id) { W.longtext(ctx, desc, slot, path, body, id, true); };
  W.int = W.num = function (ctx, desc, slot, path, body, id) {
    var i = U.el('input', 'inp'); i.type = 'number'; i.id = id;
    i.inputMode = desc.type === 'int' ? 'numeric' : 'decimal';
    i.step = desc.step != null ? desc.step : desc.type === 'int' ? 1 : 'any';
    if (desc.min != null) i.min = desc.min;
    if (desc.max != null) i.max = desc.max;
    var v = slot.get(); i.value = v == null ? '' : v;
    if (ctx.readOnly) i.readOnly = true;
    i.addEventListener('input', function () {
      if (i.value === '') slot.set(undefined);
      else { var n = Number(i.value); slot.set(isFinite(n) ? n : i.value); }
      ctx.changed(path);
    });
    body.appendChild(i);
  };
  W.bool = function (ctx, desc, slot, path, body, id) {
    var l = U.el('label', 'switch');
    var c = U.el('input'); c.type = 'checkbox'; c.id = id; c.checked = slot.get() === true;
    if (ctx.readOnly) c.disabled = true;
    var tr = U.el('span', 'track'); var tx = U.el('span', 'switch-text');
    function paint() { tx.textContent = c.checked ? 'Yes' : 'No'; }
    c.addEventListener('change', function () { slot.set(c.checked); ctx.changed(path); paint(); });
    l.appendChild(c); l.appendChild(tr); l.appendChild(tx); paint();
    body.appendChild(l);
  };
  W.enum = function (ctx, desc, slot, path, body, id) {
    var s = U.el('select', 'inp'); s.id = id;
    var vocab = vocabEntries(desc, current) || [];
    var cur = slot.get();
    s.appendChild(new Option(vocab.length ? 'Choose...' : 'No values declared yet', ''));
    vocab.forEach(function (e) { s.appendChild(new Option(e.label === e.value ? e.label : e.label + ' (' + e.value + ')', e.value)); });
    if (cur != null && cur !== '' && !vocab.some(function (e) { return e.value === String(cur); })) {
      s.appendChild(new Option(String(cur) + ' (not in vocabulary)', String(cur)));
    }
    s.value = cur == null ? '' : String(cur);
    if (ctx.readOnly) s.disabled = true;
    s.addEventListener('change', function () { slot.set(s.value === '' ? undefined : s.value); ctx.changed(path); });
    body.appendChild(s);
  };
  W.color = function (ctx, desc, slot, path, body, id) {
    var row = U.el('div', 'color-row');
    var c = U.el('input'); c.type = 'color'; c.setAttribute('aria-label', (desc.label || desc.key) + ' swatch');
    var t = U.el('input', 'inp mono'); t.type = 'text'; t.id = id; t.placeholder = '#rrggbb'; t.maxLength = 7; t.spellcheck = false;
    var v = slot.get();
    t.value = v || '';
    c.value = /^#[0-9a-fA-F]{6}$/.test(v || '') ? v : '#888888';
    if (ctx.readOnly) { c.disabled = true; t.readOnly = true; }
    c.addEventListener('input', function () { t.value = c.value; slot.set(c.value); ctx.changed(path); });
    t.addEventListener('input', function () {
      var val = t.value.trim();
      if (/^#[0-9a-fA-F]{6}$/.test(val)) c.value = val;
      slot.set(val === '' ? undefined : val); ctx.changed(path);
    });
    row.appendChild(c); row.appendChild(t);
    body.appendChild(row);
  };
  W.ref = function (ctx, desc, slot, path, body, id) {
    var row = U.el('div', 'ref-row');
    var btn = U.el('button', 'ref-btn'); btn.type = 'button'; btn.id = id;
    var clr = iconBtn('x', 'Clear reference', function () { slot.set(undefined); ctx.changed(path); paint(); });
    function paint() { btn.innerHTML = refLabelHtml(slot.get()); clr.style.visibility = slot.get() ? 'visible' : 'hidden'; }
    btn.addEventListener('click', function () {
      if (ctx.readOnly) return;
      Kit.ui.pickRef({ prefix: desc.refPrefix, title: 'Choose ' + (desc.label || desc.key), current: slot.get() }).then(function (v) {
        if (v === undefined) return;
        slot.set(v || undefined); ctx.changed(path); paint();
      });
    });
    row.appendChild(btn); row.appendChild(clr);
    body.appendChild(row);
    paint();
  };
  W.refList = function (ctx, desc, slot, path, body) {
    var box = U.el('div', 'klist');
    body.appendChild(box);
    function arr() { var a = slot.get(); return Array.isArray(a) ? a : []; }
    function paint() {
      U.clear(box);
      var a = arr();
      if (!a.length) box.appendChild(U.el('div', 'empty-line', 'No references yet.'));
      a.forEach(function (idv, i) {
        var row = U.el('div', 'reflist-row');
        row.dataset.path = path + '[' + i + ']';
        var st = U.el('div', 'ref-static', refLabelHtml(idv));
        row.appendChild(st);
        if (!ctx.readOnly) {
          row.appendChild(iconBtn('up', 'Move up', function () { if (i > 0) { var x = a[i - 1]; a[i - 1] = a[i]; a[i] = x; ctx.changed(path); paint(); } }));
          row.appendChild(iconBtn('down', 'Move down', function () { if (i < a.length - 1) { var x = a[i + 1]; a[i + 1] = a[i]; a[i] = x; ctx.changed(path); paint(); } }));
          row.appendChild(iconBtn('trash', 'Remove', function () { a.splice(i, 1); if (!a.length) slot.set(undefined); ctx.changed(path); paint(); }));
        }
        box.appendChild(row);
      });
      if (!ctx.readOnly) {
        var add = U.el('button', 'btn', Kit.icon('plus') + '<span>Add reference</span>'); add.type = 'button';
        add.addEventListener('click', function () {
          Kit.ui.pickRef({ prefix: desc.refPrefix, title: 'Add to ' + (desc.label || desc.key) }).then(function (v) {
            if (!v) return;
            var a2 = slot.get();
            if (!Array.isArray(a2)) { a2 = []; slot.set(a2); }
            a2.push(v); ctx.changed(path); paint();
          });
        });
        box.appendChild(add);
      }
    }
    paint();
  };
  W.object = function (ctx, desc, slot, path, body) {
    var fs = U.el('div', 'fieldset form-grid');
    (Array.isArray(desc.of) ? desc.of : []).forEach(function (f) {
      fs.appendChild(renderField(ctx, f, childSlot(slot, f.key), path + '.' + f.key));
    });
    body.appendChild(fs);
  };
  W.list = function (ctx, desc, slot, path, body) {
    var box = U.el('div', 'klist');
    body.appendChild(box);
    function paint() {
      U.clear(box);
      var a = slot.get();
      if (!Array.isArray(a) || !a.length) box.appendChild(U.el('div', 'empty-line', 'No entries yet.'));
      (Array.isArray(a) ? a : []).forEach(function (item, i) {
        var ip = path + '[' + i + ']';
        var card = U.el('div', 'klist-item');
        card.dataset.path = ip;
        var bar = U.el('div', 'klist-bar', '<span class="klist-num">' + U.esc(desc.itemLabel || 'Entry') + ' ' + (i + 1) + '</span>');
        var ctr = U.el('div', 'klist-ctrls');
        if (!ctx.readOnly) {
          ctr.appendChild(iconBtn('up', 'Move up', function () { if (i > 0) { var x = a[i - 1]; a[i - 1] = a[i]; a[i] = x; ctx.changed(path); paint(); } }));
          ctr.appendChild(iconBtn('down', 'Move down', function () { if (i < a.length - 1) { var x = a[i + 1]; a[i + 1] = a[i]; a[i] = x; ctx.changed(path); paint(); } }));
          ctr.appendChild(iconBtn('trash', 'Remove entry', function () { a.splice(i, 1); if (!a.length) slot.set(undefined); ctx.changed(path); paint(); }));
        }
        bar.appendChild(ctr); card.appendChild(bar);
        var isl = itemSlot(slot, i);
        if (Array.isArray(desc.of)) {
          if (!U.isObj(item)) { a[i] = {}; }
          var g = U.el('div', 'form-grid');
          desc.of.forEach(function (f) { g.appendChild(renderField(ctx, f, childSlot(isl, f.key), ip + '.' + f.key)); });
          card.appendChild(g);
        } else {
          var d2 = Object.assign({ key: String(i), label: 'Value' }, desc.of || { type: 'text' });
          card.appendChild(renderField(ctx, d2, isl, ip));
        }
        box.appendChild(card);
      });
      if (!ctx.readOnly) {
        var add = U.el('button', 'btn', Kit.icon('plus') + '<span>Add ' + U.esc((desc.itemLabel || 'entry').toLowerCase()) + '</span>'); add.type = 'button';
        add.addEventListener('click', function () {
          var a2 = slot.get();
          if (!Array.isArray(a2)) { a2 = []; slot.set(a2); }
          a2.push(Array.isArray(desc.of) ? {} : defaultFor(desc.of || { type: 'text' }));
          ctx.changed(path); paint();
          var items = box.querySelectorAll('.klist-item');
          var last = items[items.length - 1];
          if (last) { var f = last.querySelector('input, select, textarea, .ref-btn'); if (f) try { f.focus(); } catch (e) {} }
        });
        box.appendChild(add);
      }
    }
    paint();
  };
  W.table = function (ctx, desc, slot, path, body) {
    var wrap = U.el('div');
    body.appendChild(wrap);
    var cols = Array.isArray(desc.columns) && desc.columns.length ? desc.columns : null;
    var cellType = desc.cell || 'num';
    function rows() {
      if (desc.rows) return vocabEntries({ values: desc.rows }, current);
      if (desc.rowsFrom) return vocabEntries({ enumFrom: desc.rowsFrom }, current);
      var v = slot.get();
      return U.isObj(v) ? Object.keys(v).map(function (k) { return { value: k, label: k }; }) : [];
    }
    var free = !desc.rows && !desc.rowsFrom;
    function paint() {
      U.clear(wrap);
      var rs = rows();
      var val = U.isObj(slot.get()) ? slot.get() : {};
      Object.keys(val).forEach(function (k) { if (!rs.some(function (r) { return r.value === k; })) rs.push({ value: k, label: k + ' (undeclared)' }); });
      if (!rs.length) {
        wrap.appendChild(U.el('div', 'empty-line', free ? 'No rows yet.' : 'No rows yet. Declare ' + U.esc(desc.rowsFrom || 'rows') + ' first.'));
      } else {
        var tw = U.el('div', 'tbl-wrap');
        var t = U.el('table', 'tbl tbl-edit');
        var hr = '<tr><th scope="col">' + U.esc(desc.rowLabel || 'Row') + '</th>' + (cols ? cols.map(function (c) { return '<th scope="col">' + U.esc(c.label || c.key) + '</th>'; }).join('') : '<th scope="col">' + U.esc(desc.valueLabel || 'Value') + '</th>') + (free && !ctx.readOnly ? '<th><span class="sr-only">Remove</span></th>' : '') + '</tr>';
        t.innerHTML = '<thead>' + hr + '</thead>';
        var tb = U.el('tbody');
        rs.forEach(function (r) {
          var tr = U.el('tr');
          tr.dataset.path = path + '.' + r.value;
          var th = U.el('th', null, U.esc(r.label) + (r.label !== r.value ? '<small>' + U.esc(r.value) + '</small>' : ''));
          th.scope = 'row';
          tr.appendChild(th);
          (cols || [{ key: null }]).forEach(function (c) {
            var td = U.el('td');
            var ct = (c && c.type) || cellType;
            var cur = c.key ? (U.isObj(val[r.value]) ? val[r.value][c.key] : undefined) : val[r.value];
            if (ct === 'enum') {
              // P6 (Pass 3): enum cells render a select from desc.cellValues (or the column's values / enumFrom).
              var sel = U.el('select', 'inp');
              var cv = vocabEntries(c.key ? c : { values: desc.cellValues, enumFrom: desc.cellEnumFrom }, current) || [];
              sel.appendChild(new Option(desc.cellPlaceholder || '(default)', ''));
              cv.forEach(function (e) { sel.appendChild(new Option(e.label, e.value)); });
              if (cur != null && cur !== '' && !cv.some(function (e) { return e.value === String(cur); })) sel.appendChild(new Option(String(cur) + ' (not in vocabulary)', String(cur)));
              sel.value = cur == null ? '' : String(cur);
              sel.setAttribute('aria-label', r.label + (c.key ? ' ' + (c.label || c.key) : ''));
              if (ctx.readOnly) sel.disabled = true;
              sel.addEventListener('change', function () {
                var obj = slot.get();
                if (!U.isObj(obj)) { obj = {}; slot.set(obj); }
                var v2 = sel.value === '' ? undefined : sel.value;
                if (c.key) {
                  var ro = U.isObj(obj[r.value]) ? obj[r.value] : (obj[r.value] = {});
                  if (v2 === undefined) delete ro[c.key]; else ro[c.key] = v2;
                  if (!Object.keys(ro).length) delete obj[r.value];
                } else if (v2 === undefined) delete obj[r.value];
                else obj[r.value] = v2;
                ctx.changed(path + '.' + r.value + (c.key ? '.' + c.key : ''));
              });
              td.appendChild(sel);
              tr.appendChild(td);
              return;
            }
            var inp = U.el('input', 'inp');
            inp.type = ct === 'text' ? 'text' : 'number';
            if (ct !== 'text') { inp.inputMode = ct === 'int' ? 'numeric' : 'decimal'; inp.step = ct === 'int' ? 1 : 'any'; }
            inp.setAttribute('aria-label', r.label + (c.key ? ' ' + (c.label || c.key) : ''));
            inp.value = cur == null ? '' : cur;
            if (ctx.readOnly) inp.readOnly = true;
            inp.addEventListener('input', function () {
              var obj = slot.get();
              if (!U.isObj(obj)) { obj = {}; slot.set(obj); }
              var raw = inp.value, v = raw === '' ? undefined : ct === 'text' ? raw : Number(raw);
              if (c.key) {
                var rowObj = U.isObj(obj[r.value]) ? obj[r.value] : (obj[r.value] = {});
                if (v === undefined) delete rowObj[c.key]; else rowObj[c.key] = v;
                if (!Object.keys(rowObj).length) delete obj[r.value];
              } else if (v === undefined) delete obj[r.value];
              else obj[r.value] = v;
              ctx.changed(path + '.' + r.value + (c.key ? '.' + c.key : ''));
            });
            td.appendChild(inp);
            tr.appendChild(td);
          });
          if (free && !ctx.readOnly) {
            var td2 = U.el('td');
            td2.appendChild(iconBtn('trash', 'Remove row ' + r.value, function () { var o2 = slot.get(); if (U.isObj(o2)) delete o2[r.value]; ctx.changed(path); paint(); }));
            tr.appendChild(td2);
          }
          tb.appendChild(tr);
        });
        t.appendChild(tb); tw.appendChild(t); wrap.appendChild(tw);
      }
      if (free && !ctx.readOnly) {
        var add = U.el('button', 'btn', Kit.icon('plus') + '<span>Add row</span>'); add.type = 'button'; add.style.marginTop = '8px';
        add.addEventListener('click', function () {
          Kit.ui.prompt({ title: 'Add row', label: 'Row key', validate: function (v) { return v.trim() ? null : 'Enter a key.'; } }).then(function (k) {
            if (k == null) return;
            k = k.trim();
            var o3 = slot.get(); if (!U.isObj(o3)) { o3 = {}; slot.set(o3); }
            if (o3[k] === undefined) o3[k] = cols ? {} : defaultFor({ type: cellType });
            ctx.changed(path); paint();
          });
        });
        wrap.appendChild(add);
      }
    }
    paint();
  };

  function renderField(ctx, desc, slot, path) {
    var wrap = U.el('div', 'field');
    wrap.dataset.path = path;
    if (FULL_TYPES[desc.type] || desc.full) wrap.classList.add('span-all');
    var id = 'kf_' + (++uid);
    var lab = U.el('label', 'field-label');
    lab.textContent = desc.label || desc.key;
    if (desc.required) lab.insertAdjacentHTML('beforeend', ' <span class="req" aria-hidden="true">*</span>');
    if (desc.forward || (desc.refPrefix && [].concat(desc.refPrefix).every(function (p) { var i = PREFIXES[normPrefix(p)]; return i && i.forge !== 146; }))) {
      var fg = [].concat(desc.refPrefix || []).map(function (p) { var i = PREFIXES[normPrefix(p)]; return i ? i.forge : ''; }).filter(Boolean);
      lab.insertAdjacentHTML('beforeend', ' <span class="chip chip-forward">Forward' + (fg.length ? ' &middot; ' + fg[0] : '') + '</span>');
    }
    if (!{ list: 1, refList: 1, object: 1, table: 1 }[desc.type]) lab.htmlFor = id;
    wrap.appendChild(lab);
    var body = U.el('div', 'field-body');
    wrap.appendChild(body);
    // P7 (Pass 3): desc.readOnly locks one field; desc.derived names a Kit.codex.derive function whose result is shown read only.
    var fctx = ctx;
    if (desc.readOnly || desc.derived) {
      fctx = Object.create(ctx); fctx.readOnly = true;
      if (desc.derived) {
        wrap.classList.add('derived');
        lab.insertAdjacentHTML('beforeend', ' <span class="chip chip-muted">Derived</span>');
        var dfn = Kit.codex.derive && Kit.codex.derive[desc.derived];
        if (typeof dfn === 'function') {
          try {
            var dv = dfn(ctx.record, current, path);
            if (U.canonical(dv) !== U.canonical(slot.get())) slot.set(dv);
          } catch (e) { console.warn('[Kit] derive ' + desc.derived + ' failed', e); }
        }
      }
    }
    (W[desc.type] || W.text)(fctx, desc, slot, path, body, id);
    if (desc.help) wrap.appendChild(U.el('div', 'field-help', U.esc(desc.help)));
    var msg = U.el('div', 'field-msg'); msg.setAttribute('aria-live', 'polite');
    wrap.appendChild(msg);
    return wrap;
  }

  function showMessages(ctx) {
    var items = Kit.validate.record(ctx.typeName, ctx.record, { draft: ctx.draft });
    var wraps = ctx.root.querySelectorAll('.field[data-path]');
    var map = {};
    Array.prototype.forEach.call(wraps, function (w) {
      map[w.dataset.path] = w;
      w.classList.remove('has-error');
      var m = w.querySelector(':scope > .field-msg'); if (m) U.clear(m);
    });
    U.clear(ctx.headMsg);
    items.forEach(function (it) {
      var p = it.fieldPath, w = null;
      while (p) { if (map[p]) { w = map[p]; break; } p = U.parentPath(p); }
      var target = w ? w.querySelector(':scope > .field-msg') : ctx.headMsg;
      if (!target) return;
      var line = U.el('div', 'msg msg-' + it.level);
      line.textContent = it.message;
      target.appendChild(line);
      if (w && (it.level === 'error' || it.level === 'broken')) w.classList.add('has-error');
    });
    return items;
  }

  Kit.form = {};
  // render(container, typeName, record, onChange, opts{draft, readOnly}) -> {el, record, validate(), refresh()}
  Kit.form.render = function (container, typeName, record, onChange, opts) {
    opts = opts || {};
    U.clear(container);
    var tdef = Kit.codex.type(typeName);
    if (!tdef) { container.appendChild(U.el('p', 'muted', 'Unknown type: ' + U.esc(typeName))); return null; }
    var fields = (tdef.fields || []).slice();
    if (!tdef.section) {
      if (!fields.some(function (f) { return f.key === 'name'; })) fields.unshift({ key: 'name', label: 'Name', type: 'text', required: true });
      if (!fields.some(function (f) { return f.key === 'notes'; })) fields.push({ key: 'notes', label: 'Notes', type: 'longtext' });
    }
    var root = U.el('div', 'kform');
    var head = U.el('div', 'kform-head');
    head.innerHTML = '<span class="kform-type">' + U.esc(tdef.label || tdef.name) + '</span>' +
      (tdef.section ? '' : record.id ? '<code class="id">' + U.esc(record.id) + '</code>' : '<span class="chip chip-muted">ID assigned on accept</span>') +
      (record.charterVersion != null ? '<span class="chip chip-muted">Charter v' + U.esc(record.charterVersion) + '</span>' : '');
    var headMsg = U.el('div', 'field-msg'); head.appendChild(headMsg);
    root.appendChild(head);
    var ctx = { typeName: typeName, record: record, draft: !!opts.draft, readOnly: !!opts.readOnly, root: root, headMsg: headMsg };
    ctx.changed = function (path) { if (onChange) onChange(record, path); showMessages(ctx); };
    var rootSlot = { get: function () { return record; }, set: function () {} };
    var grid = U.el('div', 'form-grid');
    fields.forEach(function (f) {
      if (!f || !f.key || f.key === 'id' || f.key === 'charterVersion') return;
      grid.appendChild(renderField(ctx, f, childSlot(rootSlot, f.key), f.key));
    });
    root.appendChild(grid);
    container.appendChild(root);
    showMessages(ctx);
    return {
      el: root, record: record,
      validate: function () { return showMessages(ctx); },
      refresh: function () { return Kit.form.render(container, typeName, record, onChange, opts); },
      focusPath: function (p) {
        var w = null;
        while (p) { w = root.querySelector('.field[data-path="' + p.replace(/"/g, '') + '"]'); if (w) break; p = U.parentPath(p); }
        if (w) { w.scrollIntoView({ block: 'center' }); var f = w.querySelector('input, select, textarea, button'); if (f) try { f.focus({ preventScroll: true }); } catch (e) {} }
        return !!w;
      }
    };
  };
  // Open any record in a drawer editor (handy from the console).
  Kit.form.preview = function (typeName, record, onChange) {
    record = record || {};
    var ctl = null;
    Kit.ui.drawer({ title: 'Edit ' + ((Kit.codex.type(typeName) || {}).label || typeName), body: function (b) { ctl = Kit.form.render(b, typeName, record, onChange); } });
    return { record: record, form: ctl };
  };

  // ---------------------------------------------------------------- review drawer
  Kit.review = {};
  Kit.review.open = function (drafts, typeName, onAccept, ropts) {
    var tdef = Kit.codex.type(typeName);
    if (!tdef) { Kit.ui.toast('Unknown type ' + typeName + '.', 'error'); return null; }
    var prefix = normPrefix(tdef.prefix);
    ropts = ropts || {};
    var section = !!(ropts.section || tdef.section);
    onAccept = onAccept || function (rec) { Kit.records.put(rec); };
    var pending = (drafts || []).map(function (d, i) { var c = U.isObj(d) ? U.clone(d) : {}; delete c.id; delete c.charterVersion; return { key: i, draft: c, open: false }; });
    var accepted = 0;
    var dr = Kit.ui.drawer({ title: (section ? 'Review options: ' : 'Review drafts: ') + (tdef.label || tdef.name) });
    function draftTitle(p) {
      if (!section) return p.draft.name || '(unnamed draft)';
      var first = '';
      Object.keys(p.draft).some(function (k) { var v = p.draft[k]; if (typeof v === 'string' && v.trim()) { first = v.trim(); return true; } return false; });
      return 'Option ' + (p.key + 1) + (first ? ': ' + first.slice(0, 60) : '');
    }
    function issues(p) { return Kit.validate.record(typeName, p.draft, { draft: true }); }
    function isValid(p) { return !issues(p).some(function (it) { return it.level === 'error' || it.level === 'broken'; }); }
    function accept(p) {
      var rec = p.draft;
      if (!section) {
        rec.id = Kit.ids.mint(prefix, rec.name || tdef.name);
        rec.charterVersion = current.charter.version || 0;
      }
      try { onAccept(rec); } catch (e) { if (!section) delete rec.id; Kit.ui.toast('Could not accept draft: ' + e.message, 'error'); return false; }
      Kit.index.invalidate();
      pending.splice(pending.indexOf(p), 1);
      accepted++;
      Kit.bundle.touch('review-accept');
      return true;
    }
    function paint() {
      U.clear(dr.body);
      if (ropts.note) dr.body.appendChild(U.el('p', 'muted', U.esc(ropts.note)));
      var top = U.el('div', 'btn-row');
      top.style.marginBottom = '12px';
      var validCount = pending.filter(isValid).length;
      top.appendChild(U.el('span', 'muted', pending.length + ' pending, ' + accepted + ' accepted'));
      var all = U.el('button', 'btn btn-primary', Kit.icon('check') + '<span>Accept All Valid (' + validCount + ')</span>'); all.type = 'button';
      all.disabled = !validCount;
      all.addEventListener('click', function () {
        pending.filter(isValid).forEach(accept);
        Kit.ui.toast('Accepted ' + validCount + ' draft' + (validCount === 1 ? '' : 's') + '.', 'ok');
        paint();
      });
      top.appendChild(all);
      dr.body.appendChild(top);
      if (!pending.length) {
        var done = U.el('div', 'panel stub', '<div class="stub-glyph">' + Kit.icon('check') + '</div><h2>All drafts handled</h2><p>' + accepted + ' accepted into the bundle.</p>');
        var cb = U.el('button', 'btn btn-primary', 'Close'); cb.type = 'button'; cb.addEventListener('click', dr.close);
        done.appendChild(cb);
        dr.body.appendChild(done);
        return;
      }
      pending.forEach(function (p) {
        var its = issues(p);
        var nE = its.filter(function (i) { return i.level === 'error'; }).length;
        var nB = its.filter(function (i) { return i.level === 'broken'; }).length;
        var nW = its.filter(function (i) { return i.level === 'warning'; }).length;
        var card = U.el('div', 'review-card ' + (nE + nB ? 'bad' : 'ok'));
        var title = U.el('div', 'review-title');
        title.innerHTML = '<strong>' + U.esc(draftTitle(p)) + '</strong>' +
          (nE ? '<span class="chip chip-error">' + nE + ' error' + (nE > 1 ? 's' : '') + '</span>' : '') +
          (nB ? '<span class="chip chip-broken">' + nB + ' unknown ref' + (nB > 1 ? 's' : '') + '</span>' : '') +
          (nW ? '<span class="chip chip-warning">' + nW + ' warning' + (nW > 1 ? 's' : '') + '</span>' : '') +
          (!nE && !nB && !nW ? '<span class="chip chip-ok">Valid</span>' : '');
        card.appendChild(title);
        if (its.length && !p.open) {
          var ul = U.el('ul', 'review-issues');
          its.slice(0, 4).forEach(function (it) { ul.appendChild(U.el('li', 'msg msg-' + it.level, U.esc(it.message))); });
          if (its.length > 4) ul.appendChild(U.el('li', 'muted', '+' + (its.length - 4) + ' more'));
          card.appendChild(ul);
        }
        var row = U.el('div', 'btn-row');
        var bA = U.el('button', 'btn btn-primary', Kit.icon('check') + '<span>Accept</span>'); bA.type = 'button';
        var bE = U.el('button', 'btn', Kit.icon('edit') + '<span>' + (p.open ? 'Done editing' : 'Edit') + '</span>'); bE.type = 'button';
        var bR = U.el('button', 'btn btn-ghost', Kit.icon('x') + '<span>Reject</span>'); bR.type = 'button';
        bA.addEventListener('click', function () {
          var bad = nE + nB;
          var go = bad ? Kit.ui.confirm({ title: 'Accept with issues?', message: 'This draft has ' + bad + ' blocking issue' + (bad > 1 ? 's' : '') + '. Accept it anyway and fix it later?', okLabel: 'Accept anyway' }) : Promise.resolve(true);
          go.then(function (ok) { if (ok && accept(p)) paint(); });
        });
        bE.addEventListener('click', function () { p.open = !p.open; paint(); });
        bR.addEventListener('click', function () { pending.splice(pending.indexOf(p), 1); paint(); });
        row.appendChild(bA); row.appendChild(bE); row.appendChild(bR);
        card.appendChild(row);
        if (p.open) {
          var fwrap = U.el('div', 'review-form');
          card.appendChild(fwrap);
          Kit.form.render(fwrap, typeName, p.draft, function () {
            var its2 = issues(p);
            var bad2 = its2.some(function (i) { return i.level === 'error' || i.level === 'broken'; });
            card.className = 'review-card ' + (bad2 ? 'bad' : 'ok');
          }, { draft: true });
        }
        dr.body.appendChild(card);
      });
    }
    paint();
    return { drawer: dr, pending: pending };
  };

  // ---------------------------------------------------------------- AI helpers
  function summarizeCharter(b) {
    var c = b.charter || {};
    function trim(v, n) {
      if (typeof v === 'string') return v.length > n ? v.slice(0, n) + '...' : v;
      if (Array.isArray(v)) return v.slice(0, 24).map(function (x) { return trim(x, n); });
      if (U.isObj(v)) { var o = {}; Object.keys(v).forEach(function (k) { o[k] = trim(v[k], n); }); return o; }
      return v;
    }
    var rs = c.ruleset || {};
    return {
      locked: !!c.locked, version: c.version || 0,
      sections: trim(c.sections || {}, 400),
      ruleset: { preset: rs.preset, battleEngine: rs.battleEngine, scheduler: rs.scheduler, progression: rs.progression, stats: rs.stats, elements: rs.elements, elementRelations: rs.elementRelations, taxonomy: rs.taxonomy },
      canon: trim(c.canon || [], 240),
      glossary: trim(c.glossary || [], 200)
    };
  }
  function describeFields(fields, bundle) {
    return fields.filter(function (f) { return f && f.key && f.key !== 'id' && f.key !== 'charterVersion' && !f.derived && !f.readOnly; }).map(function (f) {
      var d = { key: f.key, type: f.type };
      if (f.type === 'table') { d.cell = f.cell || 'num'; if (f.cellValues || f.cellEnumFrom) d.cellValues = (vocabEntries({ values: f.cellValues, enumFrom: f.cellEnumFrom }, bundle) || []).map(function (e) { return e.value; }); }
      if (f.label) d.label = f.label;
      if (f.required) d.required = true;
      if (f.help) d.help = f.help;
      if (f.min != null) d.min = f.min;
      if (f.max != null) d.max = f.max;
      if (f.refPrefix) d.refPrefix = f.refPrefix;
      var v = vocabEntries(f, bundle);
      if (v) d.allowedValues = v.map(function (e) { return e.value; });
      if (f.rowsFrom || f.rows) d.rows = (vocabEntries(f.rows ? { values: f.rows } : { enumFrom: f.rowsFrom }, bundle) || []).map(function (e) { return e.value; });
      if (f.columns) d.columns = f.columns.map(function (c) { return c.key; });
      if (Array.isArray(f.of)) d.of = describeFields(f.of, bundle);
      else if (f.of) d.of = describeFields([Object.assign({ key: 'item' }, f.of)], bundle)[0];
      return d;
    });
  }
  function collectRefPrefixes(fields, out) {
    fields.forEach(function (f) {
      if (!f) return;
      if (f.refPrefix) [].concat(f.refPrefix).forEach(function (p) { out[normPrefix(p)] = 1; });
      if (Array.isArray(f.of)) collectRefPrefixes(f.of, out);
      else if (U.isObj(f.of)) collectRefPrefixes([f.of], out);
    });
    return out;
  }

  Kit.ai = {
    NO_KEY: NO_KEY_MSG,
    describeFields: function (fields, bundle) { return describeFields(fields, bundle || current); },
    hasKey: function () { return Kit.settings.hasKey(); },
    charterSummary: function (b) { return summarizeCharter(b || current); },
    // Build an AI button that shows a one-line Settings hint when no key is saved.
    button: function (label, handler, opts) {
      opts = opts || {};
      var wrap = U.el('span', 'ai-wrap');
      var b = U.el('button', 'btn' + (opts.kind ? ' btn-' + opts.kind : ''), Kit.icon('spark') + '<span>' + U.esc(label) + '</span>');
      b.type = 'button';
      var hint = U.el('span', 'ai-hint'); hint.hidden = true;
      hint.innerHTML = 'Add a Claude API key in <button type="button">Settings</button> to use this.';
      hint.querySelector('button').addEventListener('click', function () { Kit.settings.open(); });
      b.addEventListener('click', function () {
        if (!Kit.ai.hasKey()) { hint.hidden = false; return; }
        hint.hidden = true;
        var html = b.innerHTML;
        b.disabled = true; b.innerHTML = '<span class="spin"></span><span>' + U.esc(opts.busyLabel || 'Thinking...') + '</span>';
        Promise.resolve().then(handler).catch(function (e) { console.warn('[Kit.ai.button]', e); }).then(function () { b.disabled = false; b.innerHTML = html; });
      });
      wrap.appendChild(b); wrap.appendChild(hint);
      return wrap;
    },
    // Ask Claude (Sonnet) for draft records of a type, validate them, and open review.
    draftRecords: async function (typeName, o) {
      o = o || {};
      var tdef = Kit.codex.type(typeName);
      if (!tdef) throw new Error('Unknown type ' + typeName + '.');
      if (!Kit.ai.hasKey()) { Kit.ui.toast(NO_KEY_MSG, 'warn'); return null; }
      var count = Math.max(1, Math.min(12, o.count || 1));
      var b = current, idx = Kit.index();
      var refs = {};
      Object.keys(collectRefPrefixes(tdef.fields || [], {})).forEach(function (p) {
        var info = PREFIXES[p];
        if (!info) return;
        if (!Kit.codex.isOpened(info.ns, b)) { refs[p] = { forward: true, owedBy: info.forge, note: 'Not yet available. Use null.' }; return; }
        refs[p] = (idx.byPrefix[p] || []).slice(0, 120).map(function (e) { return { id: e.id, name: e.name }; });
      });
      var context = {
        charter: summarizeCharter(b),
        type: { name: tdef.name, label: tdef.label || tdef.name, prefix: tdef.prefix, fields: describeFields([{ key: 'name', type: 'text', required: true }].concat((tdef.fields || []).filter(function (f) { return f.key !== 'name'; })), b) },
        referenceTargets: refs,
        existingNames: (idx.byPrefix[normPrefix(tdef.prefix)] || []).slice(0, 80).map(function (e) { return e.name; })
      };
      var system = [
        'You draft records for Saga Forge, a tool for authoring a classic 16-bit style JRPG.',
        'Stay consistent with the Charter summary: its canon, glossary, tone, and ruleset vocabularies.',
        'Return ONLY JSON of the form {"drafts":[{...}, ...]} with exactly ' + count + ' draft' + (count > 1 ? 's' : '') + '.',
        'Each draft uses the field keys given. Never include "id" or "charterVersion"; IDs are assigned later.',
        'For enum fields and table rows use only the allowedValues or rows listed.',
        'For ref and refList fields use only IDs listed in referenceTargets. If none fit, or the target is forward, use null (or an empty list).',
        'Numbers must be plain JSON numbers. Avoid names already in existingNames.'
      ].join(' ');
      var user = 'Context:\n' + JSON.stringify(context) + '\n\nRequest: ' + (o.prompt || ('Draft ' + count + ' ' + (tdef.label || tdef.name) + ' record' + (count > 1 ? 's' : '') + '.'));
      Kit.ui.busy.show('Drafting with Claude...');
      var out;
      try {
        out = await Kit.claude({ tier: o.tier || 'sonnet', system: system, messages: [{ role: 'user', content: user }], maxTokens: Math.min(8000, 1200 + 900 * count), expectJson: true });
      } finally { Kit.ui.busy.hide(); }
      var j = out.json;
      var drafts = Array.isArray(j) ? j : j && Array.isArray(j.drafts) ? j.drafts : [];
      drafts = drafts.filter(U.isObj).map(function (d) { delete d.id; delete d.charterVersion; return d; });
      if (!drafts.length) { Kit.ui.toast('Claude returned no usable drafts.', 'warn'); return []; }
      Kit.review.open(drafts, typeName, o.onAccept);
      return drafts;
    }
  };

  // ---------------------------------------------------------------- workspaces
  var mounts = {}, order = [], activeId = null;
  Kit.mount = function (id, o) {
    o = o || {};
    if (!mounts[id]) order.push(id);
    mounts[id] = { id: id, title: o.title || id, icon: o.icon || null, render: o.render || U.noop, canEnter: o.canEnter || function () { return true; }, onLeave: o.onLeave || null, focus: o.focus || null };
    paintTabs();
    return mounts[id];
  };
  Kit.canEnter = function (id) {
    var m = mounts[id];
    if (!m) return { ok: false, reason: 'Unknown workspace.' };
    var r;
    try { r = m.canEnter(current); } catch (e) { r = 'This workspace could not check its requirements.'; }
    if (r === true || r === undefined) return { ok: true, reason: '' };
    if (typeof r === 'string') return { ok: false, reason: r };
    if (U.isObj(r)) return { ok: !!r.ok, reason: r.reason || '' };
    return { ok: false, reason: 'Locked for now.' };
  };
  Kit.active = function () { return activeId; };
  Kit.workspaces = function () { return order.slice(); };
  Kit.go = function (id, opts) {
    opts = opts || {};
    var c = Kit.canEnter(id);
    if (!c.ok) { if (!opts.silent) Kit.ui.toast(c.reason || 'That workspace is locked.', 'warn'); return false; }
    if (activeId && activeId !== id && mounts[activeId] && mounts[activeId].onLeave) {
      if (mounts[activeId].onLeave() === false) return false;
    }
    activeId = id;
    Kit.uiState.set({ tab: id });
    paintTabs();
    Kit.rerender();
    return true;
  };
  Kit.rerender = function () {
    var host = document.getElementById('ws');
    if (!host || !activeId) return;
    U.clear(host);
    var inner = U.el('div', 'ws-inner');
    inner.dataset.ws = activeId;
    host.appendChild(inner);
    try { mounts[activeId].render(inner, current); }
    catch (e) {
      console.error('[Kit] render failed for ' + activeId, e);
      inner.appendChild(Kit.ui.stub({ title: 'Something went wrong', lead: e.message, icon: 'warn' }));
    }
  };
  function paintTabs() {
    var nav = document.getElementById('tabs');
    if (!nav) return;
    U.clear(nav);
    order.forEach(function (id) {
      var m = mounts[id], c = Kit.canEnter(id);
      var b = U.el('button', 'tab' + (c.ok ? '' : ' locked'));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', id === activeId ? 'true' : 'false');
      b.dataset.ws = id;
      b.innerHTML = (c.ok ? '' : Kit.icon('lock')) + '<span>' + U.esc(m.title) + '</span>';
      if (!c.ok) { b.title = c.reason; b.setAttribute('aria-disabled', 'true'); b.setAttribute('aria-label', m.title + ' (locked: ' + c.reason + ')'); }
      else b.title = m.title;
      b.addEventListener('click', function () { Kit.go(id); });
      nav.appendChild(b);
    });
  }
  Kit.paintTabs = paintTabs;
  // Jump to a record (and field) from the Validation panel.
  var jumpHandlers = [];
  function jumpHandler(id) {
    for (var i = 0; i < jumpHandlers.length; i++) { if (jumpHandlers[i].test(id)) return jumpHandlers[i]; }
    return null;
  }
  Kit.jump = function (recordId, fieldPath) {
    var hd = jumpHandler(recordId);
    if (hd) return !!hd.go(recordId, fieldPath);
    var info = PREFIXES[prefixOf(recordId)];
    var ws = info ? (info.ns === 'charter' ? 'charter' : info.ns === 'rules' ? 'rules' : null) : null;
    if (!ws || !mounts[ws]) { Kit.ui.toast('No workspace edits ' + recordId + ' yet.', 'warn'); return false; }
    if (activeId !== ws && !Kit.go(ws)) return false;
    Kit.emit('jump', { recordId: recordId, fieldPath: fieldPath, workspace: ws });
    if (mounts[ws].focus) mounts[ws].focus(recordId, fieldPath);
    return true;
  };

  // Workspaces register {test(id), name(id), go(id, fieldPath)} for record IDs that are not prefixed records.
  Kit.jump.register = function (h) { jumpHandlers.push(h); };
  Kit.jump.can = function (id) { return Kit.ids.isValid(id) || !!jumpHandler(id); };

  // ---------------------------------------------------------------- validation badge + panel
  var lastResult = null;
  function paintBadge(res) {
    var b = document.getElementById('btnValidation');
    if (!b) return;
    var s = Kit.validate.summary(res);
    var html = '';
    if (!s.errors && !s.broken && !s.warnings && !s.forward) html = '<span class="chip chip-ok">' + Kit.icon('check') + 'Valid</span>';
    else {
      if (s.errors) html += '<span class="chip chip-error" title="Errors">' + s.errors + ' err</span>';
      if (s.broken) html += '<span class="chip chip-broken" title="Broken references">' + s.broken + ' broken</span>';
      if (s.forward) html += '<span class="chip chip-forward" title="Forward references">' + s.forward + ' fwd</span>';
      if (s.warnings) html += '<span class="chip chip-warning" title="Warnings">' + s.warnings + ' warn</span>';
      if (!s.errors && !s.broken) html = '<span class="chip chip-ok">' + Kit.icon('check') + 'OK</span>' + html;
    }
    b.innerHTML = html;
    b.setAttribute('aria-label', 'Validation: ' + s.errors + ' errors, ' + s.broken + ' broken, ' + s.forward + ' forward, ' + s.warnings + ' warnings. Open panel.');
  }
  Kit.refreshValidation = function () {
    lastResult = Kit.validate(current);
    paintBadge(lastResult);
    Kit.emit('validated', lastResult);
    return lastResult;
  };
  var refreshSoon = U.debounce(function () { Kit.refreshValidation(); paintTabs(); }, 200);

  function recordName(id) {
    var hd = jumpHandler(id);
    if (hd && hd.name) return hd.name(id);
    var e = Kit.index().byId[id];
    return e ? e.name : id;
  }
  Kit.openValidation = function () {
    var res = Kit.refreshValidation();
    var s = Kit.validate.summary(res);
    Kit.ui.drawer({
      title: 'Validation',
      body: function (b, h) {
        var sum = U.el('div', 'vsummary');
        sum.innerHTML = '<span class="chip chip-error">' + s.errors + ' errors</span><span class="chip chip-broken">' + s.broken + ' broken</span><span class="chip chip-forward">' + s.forward + ' forward</span><span class="chip chip-warning">' + s.warnings + ' warnings</span>';
        b.appendChild(sum);
        var intro = U.el('p', 'muted');
        intro.textContent = 'Errors and broken references block a final export. Forward references point at forges 147 to 149 and are legal. Drafts can always be exported.';
        b.appendChild(intro);
        var blocking = {}, warnOnly = {};
        res.errors.concat(res.broken).forEach(function (it) { (blocking[it.recordId] = blocking[it.recordId] || []).push(it); });
        res.warnings.forEach(function (it) { (warnOnly[it.recordId] = warnOnly[it.recordId] || []).push(it); });
        function group(title, map) {
          var ids = Object.keys(map);
          if (!ids.length) return;
          b.appendChild(U.el('h3', 'section-h', U.esc(title)));
          ids.forEach(function (rid) {
            var g = U.el('div', 'vgroup');
            var head = U.el('div', 'vgroup-head', '<strong>' + U.esc(recordName(rid)) + '</strong><code class="id">' + U.esc(rid) + '</code>');
            if (Kit.jump.can(rid)) {
              var j = U.el('button', 'btn btn-ghost', Kit.icon('jump') + '<span>Jump</span>'); j.type = 'button';
              j.addEventListener('click', function () { h.close(); Kit.jump(rid, map[rid][0].fieldPath); });
              head.appendChild(j);
            }
            g.appendChild(head);
            map[rid].forEach(function (it) {
              var row = U.el('div', 'vitem', '<span class="chip chip-' + it.level + '">' + it.level + '</span><span>' + U.esc(it.message) + '</span>' + (it.fieldPath ? '<code>' + U.esc(it.fieldPath) + '</code>' : ''));
              g.appendChild(row);
            });
            b.appendChild(g);
          });
        }
        group('Blocking', blocking);
        group('Warnings', warnOnly);
        if (res.forward.length) {
          b.appendChild(U.el('h3', 'section-h', 'Forward references by owing forge'));
          var byForge = {};
          res.forward.forEach(function (it) { (byForge[it.owedBy] = byForge[it.owedBy] || []).push(it); });
          Object.keys(byForge).sort().forEach(function (f) {
            var g = U.el('div', 'vgroup');
            g.appendChild(U.el('div', 'vgroup-head', '<strong>Forge ' + U.esc(f) + '</strong><span class="chip chip-forward">' + byForge[f].length + ' owed</span>'));
            byForge[f].forEach(function (it) {
              g.appendChild(U.el('div', 'vitem', '<code>' + U.esc(it.id) + '</code><span>from ' + U.esc(recordName(it.recordId)) + '</span><code>' + U.esc(it.fieldPath) + '</code>'));
            });
            b.appendChild(g);
          });
        }
        if (!res.errors.length && !res.broken.length && !res.warnings.length && !res.forward.length) {
          b.appendChild(U.el('div', 'panel stub', '<div class="stub-glyph">' + Kit.icon('check') + '</div><h2>No issues</h2><p>The bundle validates cleanly.</p>'));
        }
      }
    });
  };

  // ---------------------------------------------------------------- settings modal
  function openSettings() {
    var s = Kit.settings.get();
    var ui = Kit.uiState.get();
    var refs = {};
    Kit.ui.dialog({
      title: 'Settings',
      body: function (b) {
        b.innerHTML =
          '<div class="form-grid">' +
          '<div class="field span-all"><label class="field-label" for="setKey">Claude API key</label>' +
          '<div class="ref-row"><input class="inp mono" id="setKey" type="password" autocomplete="off" spellcheck="false" placeholder="sk-ant-...">' +
          '<button class="btn btn-icon" type="button" id="setKeyShow" aria-label="Show or hide key" title="Show or hide">' + Kit.icon('key') + '</button></div>' +
          '<div class="field-help">Stored only in this browser. AI features are optional; everything else works without a key.</div></div>' +
          '<div class="field span-all"><div class="btn-row"><button class="btn" type="button" id="setTest">' + Kit.icon('spark') + '<span>Test Key</span></button><span class="settings-test" id="setTestOut" aria-live="polite"></span></div></div>' +
          '<div class="field span-all"><label class="field-label" for="setSession">Session name</label><input class="inp" id="setSession" type="text" placeholder="e.g. Saga weekend build"><div class="field-help">A label for your own reference, kept with your settings.</div></div>' +
          '<div class="field"><label class="field-label" for="setTheme">Theme</label><select class="inp" id="setTheme"><option value="system">Match system</option><option value="night">Night</option><option value="parchment">Parchment</option></select></div>' +
          '</div>' +
          '<h3 class="section-h">Model tiers</h3><p class="field-help">Leave blank to use the portfolio config.json, then the built-in default.</p>' +
          '<div class="form-grid" id="setTiers"></div>' +
          '<h3 class="section-h">Storage</h3><p class="muted" id="setUsage"></p>';
        refs.key = b.querySelector('#setKey'); refs.key.value = s.key;
        refs.session = b.querySelector('#setSession'); refs.session.value = s.session;
        refs.theme = b.querySelector('#setTheme'); refs.theme.value = ui.theme || 'system';
        refs.out = b.querySelector('#setTestOut');
        b.querySelector('#setKeyShow').addEventListener('click', function () { refs.key.type = refs.key.type === 'password' ? 'text' : 'password'; });
        refs.theme.addEventListener('change', function () { Kit.theme.set(refs.theme.value); });
        var tg = b.querySelector('#setTiers');
        refs.tiers = {};
        TIERS.forEach(function (t) {
          var f = U.el('div', 'field');
          f.innerHTML = '<label class="field-label" for="setTier_' + t + '">' + t + '</label><input class="inp mono" id="setTier_' + t + '" type="text" spellcheck="false" placeholder="' + MODEL_FALLBACK[t] + '">';
          tg.appendChild(f);
          refs.tiers[t] = f.querySelector('input'); refs.tiers[t].value = s.tiers[t] || '';
        });
        var used = Kit.store.usage();
        b.querySelector('#setUsage').textContent = 'This browser holds about ' + U.fmtSize(used) + ' for this site. A warning appears past about 4.5 MB.';
        var test = b.querySelector('#setTest');
        test.addEventListener('click', function () {
          save();
          refs.out.className = 'settings-test';
          if (!Kit.settings.hasKey()) { refs.out.classList.add('bad'); refs.out.textContent = 'Enter a key first.'; return; }
          refs.out.textContent = 'Testing...';
          test.disabled = true;
          Kit.claude({ tier: 'haiku', maxTokens: 16, messages: [{ role: 'user', content: 'Reply with the single word OK.' }], silent: true })
            .then(function (r) { refs.out.classList.add('ok'); refs.out.textContent = 'Success. ' + r.model + ' replied "' + r.text.trim().slice(0, 20) + '".'; })
            .catch(function (e) { refs.out.classList.add('bad'); refs.out.textContent = 'Failed: ' + e.message; })
            .then(function () { test.disabled = false; });
        });
      },
      actions: [
        { label: 'Clear key', kind: 'ghost', onClick: function () { refs.key.value = ''; save(); Kit.ui.toast('API key removed from this browser.', 'ok'); return false; } },
        { label: 'Save', kind: 'primary', onClick: function () { save(); Kit.ui.toast('Settings saved.', 'ok'); } }
      ]
    });
    function save() {
      var tiers = {};
      TIERS.forEach(function (t) { tiers[t] = refs.tiers[t].value; });
      Kit.settings.set({ key: refs.key.value, session: refs.session.value, tiers: tiers });
    }
  }

  // ---------------------------------------------------------------- theme
  Kit.theme = {
    get: function () { return Kit.uiState.get().theme || 'system'; },
    effective: function () {
      var t = Kit.theme.get();
      if (t !== 'system') return t;
      try { return window.matchMedia('(prefers-color-scheme: light)').matches ? 'parchment' : 'night'; } catch (e) { return 'night'; }
    },
    apply: function () {
      var t = Kit.theme.get();
      if (t === 'system') document.documentElement.removeAttribute('data-theme');
      else document.documentElement.setAttribute('data-theme', t);
      var eff = Kit.theme.effective();
      var btn = document.getElementById('btnTheme');
      if (btn) btn.innerHTML = Kit.icon(eff === 'night' ? 'sun' : 'moon');
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', eff === 'night' ? '#10121a' : '#efe4c8');
      Kit.emit('theme', eff);
    },
    set: function (t) { Kit.uiState.set({ theme: t }); Kit.theme.apply(); },
    toggle: function () { Kit.theme.set(Kit.theme.effective() === 'night' ? 'parchment' : 'night'); }
  };

  // ---------------------------------------------------------------- top bar dialogs
  Kit.openSlots = function () {
    Kit.ui.dialog({
      title: 'Project slots',
      body: function (b, h) {
        function paint() {
          U.clear(b);
          var intro = U.el('p', 'muted');
          intro.textContent = 'Four named slots live in this browser. Your working draft autosaves separately.';
          b.appendChild(intro);
          Kit.bundle.slots.list().forEach(function (s, i) {
            var row = U.el('div', 'slot-row');
            var info = U.el('div', 'slot-info');
            info.innerHTML = s ? '<strong>' + (i + 1) + '. ' + U.esc(s.name) + '</strong><small>' + U.esc(s.title) + ' &middot; ' + U.esc(U.fmtDate(s.savedAt)) + ' &middot; ' + U.esc(U.fmtSize(s.size)) + ' &middot; <code>' + U.esc(s.hash.slice(0, 10)) + '</code></small>'
              : '<strong>' + (i + 1) + '. Empty slot</strong><small>Save the current project here.</small>';
            row.appendChild(info);
            var btns = U.el('div', 'btn-row');
            var sv = U.el('button', 'btn', Kit.icon('save') + '<span>' + (s ? 'Overwrite' : 'Save here') + '</span>'); sv.type = 'button';
            sv.addEventListener('click', function () {
              var go = s ? Kit.ui.confirm({ title: 'Overwrite slot ' + (i + 1) + '?', message: '"' + s.name + '" will be replaced with the current project.', okLabel: 'Overwrite', danger: true }) : Promise.resolve(true);
              go.then(function (ok) {
                if (!ok) return null;
                return Kit.ui.prompt({ title: 'Name this slot', label: 'Slot name', value: current.kit.title, okLabel: 'Save' });
              }).then(function (name) {
                if (name == null) return;
                if (Kit.bundle.slots.save(i, name.trim() || current.kit.title)) Kit.ui.toast('Saved to slot ' + (i + 1) + '.', 'ok');
                paint();
              });
            });
            btns.appendChild(sv);
            if (s) {
              var ld = U.el('button', 'btn btn-primary', '<span>Load</span>'); ld.type = 'button';
              ld.addEventListener('click', function () {
                Kit.ui.confirm({ title: 'Load slot ' + (i + 1) + '?', message: 'The current working draft will be replaced by "' + s.name + '". Save it to a slot first if you want to keep it.', okLabel: 'Load' }).then(function (ok) {
                  if (!ok) return;
                  try { Kit.bundle.slots.load(i); Kit.ui.toast('Loaded "' + s.name + '".', 'ok'); h.close(); } catch (e) { Kit.ui.toast(e.message, 'error'); }
                });
              });
              var dl = U.el('button', 'btn btn-danger btn-icon', Kit.icon('trash')); dl.type = 'button'; dl.setAttribute('aria-label', 'Delete slot ' + (i + 1)); dl.title = 'Delete slot';
              dl.addEventListener('click', function () {
                Kit.ui.confirm({ title: 'Delete slot ' + (i + 1) + '?', message: '"' + s.name + '" will be permanently removed from this browser.', okLabel: 'Delete', danger: true }).then(function (ok) {
                  if (!ok) return;
                  Kit.bundle.slots.delete(i); paint();
                });
              });
              btns.appendChild(ld); btns.appendChild(dl);
            }
            row.appendChild(btns);
            b.appendChild(row);
          });
        }
        paint();
      },
      actions: [
        { label: 'New project', kind: 'ghost', icon: 'plus', onClick: function (h) {
          Kit.ui.confirm({ title: 'Start a new project?', message: 'The current working draft will be replaced by an empty bundle. Save it to a slot or export it first if you want to keep it.', okLabel: 'Start new', danger: true }).then(function (ok) {
            if (!ok) return;
            return Kit.ui.prompt({ title: 'New project', label: 'Project title', value: 'Untitled Saga', okLabel: 'Create' }).then(function (t) {
              if (t == null) return;
              Kit.bundle.create(t.trim() || 'Untitled Saga');
              Kit.ui.toast('New project created.', 'ok');
              h.close();
            });
          });
          return false;
        } },
        { label: 'Close', value: null }
      ]
    });
  };

  // ---------------------------------------------------------------- engine source and export (Pass 6)
  // The ENGINE:BATTLE fence text is read from the page's own script source by marker search. The markers are assembled
  // from two pieces so that no literal marker string appears anywhere except on the two fence lines themselves.
  Kit.engine = (function () {
    var OPEN = '// === ENGINE:BATTLE' + ' BEGIN ===', CLOSE = '// === ENGINE:BATTLE' + ' END ===';
    var cache = null;
    function pageScript() {
      var list = document.getElementsByTagName('script'), i, t;
      for (i = 0; i < list.length; i++) {
        t = list[i].textContent || '';
        if (t.indexOf(OPEN) >= 0 && t.indexOf(CLOSE) >= 0) return t;
      }
      return '';
    }
    return {
      OPEN: OPEN, CLOSE: CLOSE,
      // The exact text between the two marker lines ('' when the page source cannot be read).
      source: function () {
        if (cache) return cache;
        var t = pageScript(), a = t.indexOf(OPEN), z = t.indexOf(CLOSE, a + 1);
        if (a < 0 || z < 0) return '';
        a = t.indexOf('\n', a);
        z = t.lastIndexOf('\n', z);
        if (a < 0 || z < a) return '';
        cache = t.slice(a + 1, z + 1);
        return cache;
      },
      version: function () { try { return window.ENGINE_BATTLE && window.ENGINE_BATTLE.version ? String(window.ENGINE_BATTLE.version) : 'unknown'; } catch (e) { return 'unknown'; } }
    };
  })();

  // Every valid ID mentioned inside a rules record, other than the record's own ID.
  function collectRefs(node, out, top) {
    if (typeof node === 'string') { if (Kit.ids.isValid(node)) out[node] = 1; return; }
    if (Array.isArray(node)) { node.forEach(function (n) { collectRefs(n, out, false); }); return; }
    if (U.isObj(node)) Object.keys(node).forEach(function (k) {
      if ((top && k === 'id') || k === 'name' || k === 'notes') return;
      collectRefs(node[k], out, false);
    });
  }
  Kit.exportManifest = function (bundle, res, hash) {
    var refs = {}, counts = {};
    var rules = bundle.rules || {};
    Object.keys(rules).forEach(function (p) {
      var map = rules[p], n = 0;
      if (!U.isObj(map)) return;
      Object.keys(map).forEach(function (id) {
        if (!U.isObj(map[id])) return;
        n++;
        collectRefs(map[id], refs, true);
      });
      if (n) counts[p] = n;
    });
    var chs = bundle.charter && bundle.charter.sections && Array.isArray(bundle.charter.sections.chapters) ? bundle.charter.sections.chapters : [];
    var nch = chs.filter(function (c) { return U.isObj(c) && c.id; }).length;
    if (nch) counts.chp_ = nch;
    var seen = {}, fwd = [];
    (res.forward || []).forEach(function (it) {
      if (!it.id || seen[it.id]) return;
      seen[it.id] = 1;
      fwd.push({ id: it.id, owedBy: it.owedBy == null ? null : it.owedBy });
    });
    fwd.sort(function (a, b) { return a.id < b.id ? -1 : a.id > b.id ? 1 : 0; });
    var brk = (res.broken || []).map(function (it) { return { id: it.id || null, recordId: it.recordId, fieldPath: it.fieldPath }; });
    var f = bundle.kit && bundle.kit.forges && bundle.kit.forges['146'] || {};
    var sorted = {};
    Object.keys(counts).sort().forEach(function (k) { sorted[k] = counts[k]; });
    return {
      forge: 146,
      bundleHash: hash,
      charterVersion: bundle.charter ? (bundle.charter.version || 0) : 0,
      created: f.exportedAt || U.now(),
      referenced: Object.keys(refs).sort(),
      forward: fwd,
      broken: brk,
      counts: sorted
    };
  };
  Kit.engineFile = function (hash) {
    var src = Kit.engine.source();
    if (!src) throw new Error('The engine source could not be read from the page.');
    return '/* Saga Forge ENGINE:BATTLE, engine version ' + Kit.engine.version() + '\n * Bundle hash: ' + hash + '\n * Forge 146 export. Declares one global, ENGINE_BATTLE. No dependencies. */\n' + src;
  };
  // which: 'all' or one of 'bundle', 'engine', 'manifest'. Returns {files:[{name, text, mime}], hash}.
  Kit.buildExport = function (status) {
    if (!current) throw new Error('No project is open.');
    if (Kit.codex.isOpened('rules') === false) Kit.bundle.open('rules');
    var res = Kit.refreshValidation();
    if (status === 'final' && res.broken.length) throw new Error('Final export is blocked by ' + res.broken.length + ' broken reference' + (res.broken.length > 1 ? 's' : '') + '.');
    var out = Kit.bundle.exportFile({ status: status, download: false });
    var slug = Kit.bundle.slug();
    var manifest = Kit.exportManifest(current, res, out.hash);
    return {
      hash: out.hash,
      files: [
        { key: 'bundle', name: out.filename, text: out.text, mime: 'application/json' },
        { key: 'engine', name: 'engine-battle.js', text: Kit.engineFile(out.hash), mime: 'text/javascript' },
        { key: 'manifest', name: slug + '-manifest.json', text: JSON.stringify(manifest, null, 2), mime: 'application/json' }
      ]
    };
  };

  Kit.openExport = function () {
    var res = Kit.refreshValidation();
    var s = Kit.validate.summary(res);
    var status = 'draft';
    var engineOk = !!Kit.engine.source();
    Kit.ui.dialog({
      title: 'Export forge 146',
      body: function (b) {
        var slug = Kit.bundle.slug();
        b.innerHTML = '<dl class="kv"><dt>Project</dt><dd>' + U.esc(current.kit.title) + '</dd><dt>Content hash</dt><dd><code id="expHash">' + U.esc(Kit.bundle.hash()) + '</code></dd><dt>Issues</dt><dd>' +
          '<span class="chip chip-error">' + s.errors + ' err</span> <span class="chip chip-broken">' + s.broken + ' broken</span> <span class="chip chip-forward">' + s.forward + ' fwd</span></dd></dl>';
        var rc = U.el('div', 'radio-cards');
        var finalBlocked = s.broken > 0;
        rc.innerHTML =
          '<label class="radio-card"><input type="radio" name="expStatus" value="draft" checked><span><strong>Draft</strong><br><span class="muted">Always allowed. Work in progress.</span></span></label>' +
          '<label class="radio-card' + (finalBlocked ? ' disabled' : '') + '"><input type="radio" name="expStatus" value="final"' + (finalBlocked ? ' disabled' : '') + '><span><strong>Final</strong><br><span class="muted">' + (finalBlocked ? 'Blocked by ' + s.broken + ' broken reference' + (s.broken > 1 ? 's' : '') + '.' : 'Marks forge 146 final.') + '</span></span></label>';
        b.appendChild(rc);
        Array.prototype.forEach.call(rc.querySelectorAll('input'), function (r) { r.addEventListener('change', function () { status = r.value; }); });
        if (finalBlocked) {
          b.appendChild(U.el('h3', 'section-h', 'Broken references'));
          var ul = U.el('ul');
          res.broken.slice(0, 30).forEach(function (it) { ul.appendChild(U.el('li', 'msg msg-broken', '<code>' + U.esc(it.id || '') + '</code> in ' + U.esc(recordName(it.recordId)) + ' <code>' + U.esc(it.fieldPath) + '</code>')); });
          if (res.broken.length > 30) ul.appendChild(U.el('li', 'muted', '+' + (res.broken.length - 30) + ' more'));
          b.appendChild(ul);
        }
        b.appendChild(U.el('h3', 'section-h', 'Files'));
        var list = U.el('div', 'exp-files');
        [
          ['bundle', slug + '-bundle.json', 'The project bundle with forge 146 status, rules opened, and a fresh content hash.'],
          ['engine', 'engine-battle.js', 'The battle engine exactly as it runs here, stamped with its version and the bundle hash.'],
          ['manifest', slug + '-manifest.json', 'Hash, Charter version, referenced IDs, forward references owed to other forges, broken list, counts by prefix.']
        ].forEach(function (f) {
          var row = U.el('div', 'exp-file');
          row.appendChild(U.el('div', 'exp-file-t', '<code>' + U.esc(f[1]) + '</code><span class="muted">' + U.esc(f[2]) + '</span>'));
          var bt = U.el('button', 'btn', Kit.icon('export') + '<span class="lbl">Download</span>');
          bt.type = 'button';
          if (f[0] === 'engine' && !engineOk) { bt.disabled = true; bt.title = 'The engine source could not be read from this page.'; }
          bt.addEventListener('click', function () {
            try {
              var out = Kit.buildExport(status);
              var hit = out.files.filter(function (x) { return x.key === f[0]; })[0];
              U.download(hit.name, hit.text, hit.mime);
              var hh = document.getElementById('expHash'); if (hh) hh.textContent = out.hash;
              Kit.ui.toast('Downloaded ' + hit.name + ' (' + status + ').', 'ok');
            } catch (e) { Kit.ui.toast(e.message, 'error', 7000); }
          });
          row.appendChild(bt);
          list.appendChild(row);
        });
        b.appendChild(list);
        if (!engineOk) b.appendChild(U.el('p', 'msg msg-warning', 'This page cannot read its own engine source, so engine-battle.js is unavailable.'));
      },
      actions: [
        { label: 'Close', kind: 'ghost', value: null },
        { label: 'Download all three', kind: 'primary', icon: 'export', onClick: function () {
          try {
            var out = Kit.buildExport(status);
            out.files.forEach(function (f, i) { setTimeout(function () { U.download(f.name, f.text, f.mime); }, i * 350); });
            Kit.ui.toast('Exported ' + out.files.length + ' files (' + status + '). Hash ' + out.hash.slice(0, 12) + '.', 'ok', 6000);
          } catch (e) { Kit.ui.toast(e.message, 'error', 7000); return false; }
        } }
      ]
    });
  };

  Kit.importPicked = function (file) {
    if (!file) return Promise.resolve(null);
    return Kit.ui.confirm({ title: 'Import ' + file.name + '?', message: 'The current working draft will be replaced by the imported bundle. Save it to a slot first if you want to keep it.', okLabel: 'Import' }).then(function (ok) {
      if (!ok) return null;
      return Kit.bundle.importFile(file).then(function (r) {
        if (r.matches) Kit.ui.toast('Imported "' + r.bundle.kit.title + '". Content hash verified.', 'ok');
        else Kit.ui.toast('Imported "' + r.bundle.kit.title + '", but its content hash does not match. The file was edited outside Saga Forge.', 'warn', 8000);
        return r;
      }).catch(function (e) { Kit.ui.toast(e.message, 'error', 7000); return null; });
    });
  };

  Kit.renameProject = function () {
    Kit.ui.prompt({ title: 'Rename project', label: 'Project title', value: current.kit.title, okLabel: 'Rename', validate: function (v) { return v.trim() ? null : 'Enter a title.'; } }).then(function (t) {
      if (t == null) return;
      current.kit.title = t.trim();
      Kit.bundle.touch('rename');
    });
  };

  function paintTitle() {
    var b = document.getElementById('btnTitle');
    if (b && current) { b.querySelector('.t').textContent = current.kit.title; b.title = 'Rename project: ' + current.kit.title; }
  }

  Kit.on('settings', function () {
    if (!Kit.ai.hasKey()) return;
    Array.prototype.forEach.call(document.querySelectorAll('.ai-hint'), function (h) { h.hidden = true; });
  });

  // Keep the chrome in sync with the bundle.
  Kit.on('change', function () { paintTitle(); refreshSoon(); });
  Kit.on('load', function () { paintTitle(); Kit.refreshValidation(); paintTabs(); if (activeId && !Kit.canEnter(activeId).ok) Kit.go(order[0], { silent: true }); else Kit.rerender(); });

  // ---------------------------------------------------------------- safe expression language (Pass 4a)
  // Tokenizer, shunting yard to AST, evaluator. Identical text lives in ENGINE:BATTLE (evalExpr); tests compare both.
  Kit.expr = (function () {
  'use strict';
    var FUNCS = { min: [1, 99], max: [1, 99], floor: [1, 1], ceil: [1, 1], round: [1, 1], clamp: [3, 3], pow: [2, 2], sqrt: [1, 1] };
    var FUNC_NAMES = ['min', 'max', 'floor', 'ceil', 'round', 'clamp', 'pow', 'sqrt'];
    var MAX_LEN = 2000;
    var VAR_HELP = 'Use a.<stat>, a.level, t.<stat>, t.level, power, or p.<param>.';
    var PREC = { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 };

    function fail(msg, pos) { var e = new Error(msg); if (pos != null) e.pos = pos; throw e; }
    function has(o, k) { return o !== null && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, k); }
    function isDigit(c) { return c >= '0' && c <= '9'; }
    function isIdStart(c) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_'; }
    function isIdPart(c) { return isIdStart(c) || isDigit(c); }

    function tokenize(src) {
      if (typeof src !== 'string') fail('The expression must be text.');
      if (src.length > MAX_LEN) fail('The expression is longer than ' + MAX_LEN + ' characters.');
      var out = [], i = 0, n = src.length, c, j, k, d, seenDot, nx;
      while (i < n) {
        c = src.charAt(i);
        if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
        if (isDigit(c) || (c === '.' && i + 1 < n && isDigit(src.charAt(i + 1)))) {
          j = i; seenDot = false;
          while (j < n) {
            d = src.charAt(j);
            if (isDigit(d)) j++;
            else if (d === '.' && !seenDot) { seenDot = true; j++; }
            else break;
          }
          nx = src.charAt(j);
          if (nx === '.') fail("Unexpected '.' at position " + (j + 1) + '.', j);
          if (nx !== '' && isIdStart(nx)) fail("Unexpected '" + nx + "' after a number at position " + (j + 1) + '.', j);
          out.push({ t: 'num', v: parseFloat(src.slice(i, j)), pos: i });
          i = j;
          continue;
        }
        if (isIdStart(c)) {
          k = i + 1;
          while (k < n && isIdPart(src.charAt(k))) k++;
          if (src.charAt(k) === '.' && k + 1 < n && isIdStart(src.charAt(k + 1))) {
            k++;
            while (k < n && isIdPart(src.charAt(k))) k++;
          }
          out.push({ t: 'id', v: src.slice(i, k), pos: i });
          i = k;
          continue;
        }
        if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^') { out.push({ t: 'op', v: c, pos: i }); i++; continue; }
        if (c === '(') { out.push({ t: 'lp', pos: i }); i++; continue; }
        if (c === ')') { out.push({ t: 'rp', pos: i }); i++; continue; }
        if (c === ',') { out.push({ t: 'comma', pos: i }); i++; continue; }
        fail("Illegal character '" + c + "' at position " + (i + 1) + '.', i);
      }
      return out;
    }

    function checkVar(name, pos, opts) {
      var m, who, key, i, ok;
      if (name === 'power') return;
      m = /^([atp])\.([A-Za-z_][A-Za-z0-9_]*)$/.exec(name);
      if (!m) fail("Unknown variable '" + name + "'. " + VAR_HELP, pos);
      who = m[1]; key = m[2];
      if (who === 'p') {
        if (opts && opts.params) {
          ok = false;
          for (i = 0; i < opts.params.length; i++) { if (opts.params[i] === key) ok = true; }
          if (!ok) fail("Unknown parameter 'p." + key + "'. Declared parameters: " + (opts.params.length ? opts.params.join(', ') : 'none') + '.', pos);
        }
        return;
      }
      if (key === 'level') return;
      if (!/^[a-z][a-z0-9]*$/.test(key)) fail("Unknown variable '" + name + "'. " + VAR_HELP, pos);
      if (opts && opts.stats) {
        ok = false;
        for (i = 0; i < opts.stats.length; i++) { if (opts.stats[i] === key) ok = true; }
        if (!ok) fail("Unknown stat '" + key + "' in " + name + '. Declared stats: ' + (opts.stats.length ? opts.stats.join(', ') : 'none') + '.', pos);
      }
    }

    // Tokenizer plus shunting yard parser. Returns an AST of {type:'num'|'var'|'un'|'bin'|'call'}.
    function parse(src, opts) {
      var toks = tokenize(src), out = [], ops = [], prev = 'start', i, t, top, nxt, prec, right, ar, argc, args, v;
      if (!toks.length) fail('The expression is empty.');
      function popApply() {
        var op = ops.pop(), r, l;
        if (op.k === 'un') {
          if (out.length < 1) fail("Missing operand after '" + op.v + "' at position " + (op.pos + 1) + '.', op.pos);
          out.push({ type: 'un', op: op.v, arg: out.pop() });
        } else {
          if (out.length < 2) fail("Missing operand for '" + op.v + "' at position " + (op.pos + 1) + '.', op.pos);
          r = out.pop(); l = out.pop();
          out.push({ type: 'bin', op: op.v, left: l, right: r });
        }
      }
      function unwindToMarker() {
        while (ops.length && ops[ops.length - 1].k !== 'lp' && ops[ops.length - 1].k !== 'fn') popApply();
      }
      for (i = 0; i < toks.length; i++) {
        t = toks[i];
        if (t.t === 'num') {
          if (prev === 'operand') fail("Missing operator before '" + t.v + "' at position " + (t.pos + 1) + '.', t.pos);
          out.push({ type: 'num', value: t.v });
          prev = 'operand';
        } else if (t.t === 'id') {
          if (prev === 'operand') fail("Missing operator before '" + t.v + "' at position " + (t.pos + 1) + '.', t.pos);
          nxt = toks[i + 1];
          if (nxt && nxt.t === 'lp') {
            if (!has(FUNCS, t.v)) fail("Unknown function '" + t.v + "'. Allowed functions: " + FUNC_NAMES.join(', ') + '.', t.pos);
            ops.push({ k: 'fn', v: t.v, argc: 0, pos: t.pos });
            i++;
            prev = 'open';
          } else {
            checkVar(t.v, t.pos, opts);
            out.push({ type: 'var', name: t.v });
            prev = 'operand';
          }
        } else if (t.t === 'lp') {
          if (prev === 'operand') fail("Missing operator before '(' at position " + (t.pos + 1) + '.', t.pos);
          ops.push({ k: 'lp', pos: t.pos });
          prev = 'open';
        } else if (t.t === 'rp') {
          if (prev === 'op' || prev === 'comma') fail("Missing operand before ')' at position " + (t.pos + 1) + '.', t.pos);
          unwindToMarker();
          if (!ops.length) fail("Unmatched ')' at position " + (t.pos + 1) + '.', t.pos);
          top = ops.pop();
          if (top.k === 'lp') {
            if (prev === 'open') fail("Empty parentheses at position " + (t.pos + 1) + '.', t.pos);
          } else {
            argc = prev === 'open' ? 0 : top.argc + 1;
            ar = FUNCS[top.v];
            if (argc < ar[0] || argc > ar[1]) {
              fail(top.v + ' takes ' + (ar[0] === ar[1] ? 'exactly ' + ar[0] : 'at least ' + ar[0]) + ' argument' + (ar[0] === 1 ? '' : 's') + ' but got ' + argc + '.', top.pos);
            }
            args = out.splice(out.length - argc, argc);
            out.push({ type: 'call', name: top.v, args: args });
          }
          prev = 'operand';
        } else if (t.t === 'comma') {
          if (prev !== 'operand') fail("Missing argument before ',' at position " + (t.pos + 1) + '.', t.pos);
          unwindToMarker();
          if (!ops.length || ops[ops.length - 1].k !== 'fn') fail("Unexpected ',' at position " + (t.pos + 1) + '. Commas only separate function arguments.', t.pos);
          ops[ops.length - 1].argc++;
          prev = 'comma';
        } else {
          v = t.v;
          if (prev === 'operand') {
            prec = PREC[v]; right = v === '^';
            while (ops.length) {
              top = ops[ops.length - 1];
              if (top.k !== 'bin' && top.k !== 'un') break;
              if (top.prec > prec || (top.prec === prec && !right)) popApply(); else break;
            }
            ops.push({ k: 'bin', v: v, prec: prec, pos: t.pos });
            prev = 'op';
          } else {
            if (v !== '-' && v !== '+') fail("Unexpected operator '" + v + "' at position " + (t.pos + 1) + '.', t.pos);
            ops.push({ k: 'un', v: v, prec: 3, pos: t.pos });
            prev = 'op';
          }
        }
      }
      if (prev !== 'operand') fail(prev === 'start' ? 'The expression is empty.' : 'The expression ends unexpectedly.');
      while (ops.length) {
        top = ops[ops.length - 1];
        if (top.k === 'lp' || top.k === 'fn') fail("Unmatched '(' at position " + (top.pos + 1) + '.', top.pos);
        popApply();
      }
      if (out.length !== 1) fail('The expression is not well formed.');
      return out[0];
    }

    function finite(v, what) {
      if (typeof v !== 'number' || !isFinite(v)) fail('The result of ' + what + ' is not a finite number.');
      return v;
    }
    function lookup(scope, name) {
      var dot, who, key, bag, v;
      if (name === 'power') v = scope ? scope.power : undefined;
      else {
        dot = name.indexOf('.'); who = name.slice(0, dot); key = name.slice(dot + 1);
        bag = scope ? (who === 'a' ? scope.a : who === 't' ? scope.t : scope.p) : undefined;
        v = has(bag, key) ? bag[key] : undefined;
      }
      if (typeof v !== 'number' || !isFinite(v)) fail('No value was supplied for ' + name + '.');
      return v;
    }
    function ev(node, scope) {
      var l, r, v, args, k;
      switch (node.type) {
        case 'num': return node.value;
        case 'var': return lookup(scope, node.name);
        case 'un': v = ev(node.arg, scope); return node.op === '-' ? -v : v;
        case 'bin':
          l = ev(node.left, scope); r = ev(node.right, scope);
          if (node.op === '+') v = l + r;
          else if (node.op === '-') v = l - r;
          else if (node.op === '*') v = l * r;
          else if (node.op === '/') { if (r === 0) fail('Division by zero.'); v = l / r; }
          else v = Math.pow(l, r);
          return finite(v, "'" + node.op + "'");
        case 'call':
          args = [];
          for (k = 0; k < node.args.length; k++) args.push(ev(node.args[k], scope));
          switch (node.name) {
            case 'min': v = Math.min.apply(null, args); break;
            case 'max': v = Math.max.apply(null, args); break;
            case 'floor': v = Math.floor(args[0]); break;
            case 'ceil': v = Math.ceil(args[0]); break;
            case 'round': v = Math.round(args[0]); break;
            case 'sqrt': if (args[0] < 0) fail('sqrt needs a value that is not negative.'); v = Math.sqrt(args[0]); break;
            case 'pow': v = Math.pow(args[0], args[1]); break;
            default:
              if (args[1] > args[2]) fail('clamp needs its low bound to be at most its high bound.');
              v = Math.min(Math.max(args[0], args[1]), args[2]);
          }
          return finite(v, node.name + '()');
        default:
          return fail('The expression is not well formed.');
      }
    }
    // scope = {a:{level, <stat>...}, t:{level, <stat>...}, power, p:{<param>...}}
    function evaluate(astOrSrc, scope, opts) {
      var ast = typeof astOrSrc === 'string' ? parse(astOrSrc, opts) : astOrSrc;
      return finite(ev(ast, scope || {}), 'the expression');
    }
    // Names of every variable an AST uses, sorted and unique.
    function variables(ast) {
      var seen = {}, list = [];
      (function walk(n) {
        var i;
        if (!n) return;
        if (n.type === 'var') { if (!seen[n.name]) { seen[n.name] = 1; list.push(n.name); } }
        else if (n.type === 'un') walk(n.arg);
        else if (n.type === 'bin') { walk(n.left); walk(n.right); }
        else if (n.type === 'call') { for (i = 0; i < n.args.length; i++) walk(n.args[i]); }
      })(ast);
      return list.sort();
    }
  return { parse: parse, evaluate: evaluate, variables: variables, FUNCTIONS: FUNC_NAMES.slice(), MAX_LEN: MAX_LEN, VAR_HELP: VAR_HELP };
  })();

  // ---------------------------------------------------------------- dev helpers
  Kit.dev = {
    // Registers a throwaway type covering every field type and opens it in the form renderer.
    fieldDemo: function () {
      Kit.codex.register({
        name: 'ZzDemo', prefix: 'rmr_', label: 'Field Type Demo', fields: [
          { key: 'name', label: 'Name', type: 'text', required: true },
          { key: 'blurb', label: 'Longtext', type: 'longtext', help: 'Multi-line text.' },
          { key: 'level', label: 'Int', type: 'int', min: 1, max: 99, required: true },
          { key: 'rate', label: 'Num', type: 'num', min: 0, max: 1 },
          { key: 'boss', label: 'Bool', type: 'bool' },
          { key: 'kind', label: 'Enum (static)', type: 'enum', values: ['magic', 'summon', 'support'] },
          { key: 'element', label: 'Enum (enumFrom)', type: 'enum', enumFrom: 'charter.ruleset.elements' },
          { key: 'ability', label: 'Ref', type: 'ref', refPrefix: 'abl_' },
          { key: 'portrait', label: 'Forward ref', type: 'ref', refPrefix: 'por_', forward: true },
          { key: 'limits', label: 'Ref list', type: 'refList', refPrefix: 'lim_' },
          { key: 'tags', label: 'List of text', type: 'list', of: { type: 'text' }, itemLabel: 'Tag' },
          { key: 'drops', label: 'List of objects', type: 'list', itemLabel: 'Drop', of: [{ key: 'itm', label: 'Item', type: 'ref', refPrefix: 'itm_' }, { key: 'chance', label: 'Chance', type: 'num', min: 0, max: 1 }] },
          { key: 'cost', label: 'Object', type: 'object', of: [{ key: 'mp', label: 'MP', type: 'int', min: 0 }, { key: 'ap', label: 'AP', type: 'int', min: 0 }] },
          { key: 'dmg', label: 'Formula', type: 'formula', help: 'Safe expression. Parsing arrives with Kit.expr.' },
          { key: 'leanings', label: 'Table (rowsFrom)', type: 'table', rowsFrom: 'charter.ruleset.stats', cell: 'num' },
          { key: 'mods', label: 'Table (free rows, columns)', type: 'table', columns: [{ key: 'rate', label: 'Rate', type: 'num' }, { key: 'note', label: 'Note', type: 'text' }] },
          { key: 'tint', label: 'Color', type: 'color' }
        ]
      });
      return Kit.form.preview('ZzDemo', { name: 'Demo record', kind: 'nonsense', portrait: 'por_hero_ab12', ability: 'abl_missing_zz99' });
    }
  };
})();
// === KIT:CORE END ===
