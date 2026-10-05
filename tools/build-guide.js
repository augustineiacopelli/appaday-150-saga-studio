'use strict';
// Builds guide.html and GUIDE.md from one content source (tools/guide/part*.js).
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const dir = process.argv[2] || path.join(__dirname, 'guide');
const secs = [].concat(...['part1', 'part2', 'part3', 'part4'].map((n) => require(path.join(dir, n + '.js'))));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inl = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
const mdc = (s) => String(s).replace(/\|/g, '\\|');
const lines = (s) => String(s).split('\n');

function toMd() {
  const o = ['# Saga Studio Creator\'s Guide', '',
    'A complete guide to making a role playing game with Saga Studio, from a blank page to a finished game. It is written for a first time creator who enjoys RPGs and has never made one.', '',
    'Read it online at guide.html inside the Studio, or keep this file. Both contain the same material.', '', '## Contents', ''];
  secs.forEach((s) => o.push('* [' + s.title + '](#' + s.id + ')'));
  o.push('');
  secs.forEach((s) => {
    o.push('<a id="' + s.id + '"></a>', '', '## ' + s.title, '', s.lead, '');
    s.blocks.forEach((b) => {
      if (b.t === 'h3') o.push('### ' + b.x, '');
      else if (b.t === 'p') o.push(b.x, '');
      else if (b.t === 'ul') { b.items.forEach((i) => o.push('* ' + i)); o.push(''); }
      else if (b.t === 'ol') { b.items.forEach((i, n) => o.push((n + 1) + '. ' + i)); o.push(''); }
      else if (b.t === 'steps') { b.items.forEach((i, n) => o.push((n + 1) + '. **' + i.title + '.** ' + i.x)); o.push(''); }
      else if (b.t === 'table') {
        o.push('| ' + b.head.map(mdc).join(' | ') + ' |', '| ' + b.head.map(() => '---').join(' | ') + ' |');
        b.rows.forEach((r) => o.push('| ' + r.map(mdc).join(' | ') + ' |')); o.push('');
      } else if (b.t === 'callout') o.push('> **' + b.title + '.** ' + b.x, '');
      else if (b.t === 'example') {
        o.push('> **' + b.title + '**', '>');
        lines(b.x).forEach((l, i, a) => { o.push('> ' + l); if (i < a.length - 1) o.push('>'); }); o.push('');
      } else if (b.t === 'sheet') { o.push('**' + b.title + '**', ''); b.items.forEach((i) => o.push('* [ ] ' + i)); o.push(''); }
    });
  });
  return o.join('\n').replace(/\n{3,}/g, '\n\n') + '\n';
}

function toHtml() {
  const toc = secs.map((s) => '<li><a href="#' + s.id + '">' + esc(s.title) + '</a></li>').join('');
  let body = '';
  secs.forEach((s) => {
    body += '<section id="' + s.id + '"><h2>' + esc(s.title) + '</h2><p class="lead">' + inl(s.lead) + '</p>';
    s.blocks.forEach((b) => {
      if (b.t === 'h3') body += '<h3>' + inl(b.x) + '</h3>';
      else if (b.t === 'p') body += '<p>' + inl(b.x) + '</p>';
      else if (b.t === 'ul') body += '<ul>' + b.items.map((i) => '<li>' + inl(i) + '</li>').join('') + '</ul>';
      else if (b.t === 'ol') body += '<ol>' + b.items.map((i) => '<li>' + inl(i) + '</li>').join('') + '</ol>';
      else if (b.t === 'steps') body += '<ol class="steps">' + b.items.map((i) => '<li><strong>' + inl(i.title) + '.</strong> ' + inl(i.x) + '</li>').join('') + '</ol>';
      else if (b.t === 'table') {
        body += '<div class="tw"><table><thead><tr>' + b.head.map((h) => '<th>' + esc(h) + '</th>').join('') + '</tr></thead><tbody>' +
          b.rows.map((r) => '<tr>' + r.map((c, i) => '<td data-label="' + esc(b.head[i]) + '">' + inl(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
      } else if (b.t === 'callout') body += '<aside class="callout ' + b.kind + '"><strong>' + esc(b.title) + '</strong><p>' + inl(b.x) + '</p></aside>';
      else if (b.t === 'example') body += '<aside class="callout example"><strong>' + esc(b.title) + '</strong>' + lines(b.x).map((l) => '<p>' + inl(l) + '</p>').join('') + '</aside>';
      else if (b.t === 'sheet') body += '<div class="sheet"><h4>' + esc(b.title) + '</h4><ul>' + b.items.map((i) => '<li>' + inl(i) + '</li>').join('') + '</ul></div>';
    });
    body += '</section>';
  });
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n<title>Saga Studio Creator\'s Guide</title>\n' +
'<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Alegreya+Sans:wght@400;500;700&family=Cinzel:wght@600;700&display=swap" rel="stylesheet">\n<style>\n' +
':root{--bg:#10121a;--panel:#1b2030;--ink:#ece4cf;--muted:#b7b09c;--accent:#e3b453;--accent2:#6fc7b6;--line:#343b52}\n' +
':root[data-theme=parchment]{--bg:#efe4c8;--panel:#fbf5e3;--ink:#2a2315;--muted:#5c5238;--accent:#8a5a08;--accent2:#14675a;--line:#cdbd96}\n' +
'*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:72px}\n' +
'body{margin:0;background:var(--bg);color:var(--ink);font:1.05rem/1.65 "Alegreya Sans",system-ui,sans-serif;overflow-wrap:anywhere}\n' +
'a{color:var(--accent2)}h1,h2,h3,h4{font-family:Cinzel,Georgia,serif;line-height:1.25;color:var(--accent)}\n' +
'header.top{position:sticky;top:0;z-index:5;display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 16px;background:var(--panel);border-bottom:1px solid var(--line)}\n' +
'header.top .t{font-family:Cinzel,serif;font-weight:700;color:var(--accent);margin-right:auto}\n' +
'.btn{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--ink);font:inherit;text-decoration:none;cursor:pointer}\n' +
'.btn:hover,.btn:focus-visible{border-color:var(--accent);outline:none}\n' +
'.wrap{display:grid;grid-template-columns:minmax(0,260px) minmax(0,1fr);gap:24px;padding:16px;max-width:1200px;margin:0 auto}\n' +
'nav.toc{position:sticky;top:76px;align-self:start;max-height:calc(100vh - 92px);overflow:auto;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 14px}\n' +
'nav.toc summary{min-height:44px;display:flex;align-items:center;cursor:pointer;font-family:Cinzel,serif;color:var(--accent)}\n' +
'nav.toc ol{list-style:none;margin:0;padding:0}nav.toc a{display:block;padding:10px 0;text-decoration:none;color:var(--ink)}\n' +
'main{min-width:0}h1{font-size:2rem;margin:.2em 0}h2{font-size:1.5rem;margin-top:2em;border-bottom:1px solid var(--line);padding-bottom:.3em}h3{font-size:1.15rem;margin-top:1.6em}\n' +
'.lead{color:var(--muted);font-size:1.15rem}code{background:var(--panel);padding:1px 5px;border-radius:4px;font-size:.92em}\n' +
'.tw{margin:1em 0}table{width:100%;border-collapse:collapse;background:var(--panel);border:1px solid var(--line)}th,td{text-align:left;vertical-align:top;padding:9px 12px;border-bottom:1px solid var(--line)}th{color:var(--accent);font-weight:700}\n' +
'.callout{margin:1.2em 0;padding:4px 16px 8px;border-left:4px solid var(--accent2);background:var(--panel);border-radius:0 8px 8px 0}.callout.warn{border-color:#d9694f}.callout.tip{border-color:var(--accent)}.callout.example{border-color:var(--accent)}\n' +
'.callout>strong{display:block;margin-top:8px;font-family:Cinzel,serif;color:var(--accent)}.sheet{margin:1em 0;padding:4px 16px 8px;border:1px dashed var(--line);border-radius:8px}.sheet h4{margin:.8em 0 .3em}\n' +
'.steps li{margin:.8em 0}li{margin:.3em 0}\n' +
'footer{max-width:1200px;margin:0 auto;padding:24px 16px 48px;color:var(--muted)}\n' +
'@media(max-width:640px){header.top{position:static}header.top .t{flex:1 0 100%}}\n@media(max-width:860px){.wrap{grid-template-columns:minmax(0,1fr)}nav.toc{position:static;max-height:none}}\n' +
'@media(max-width:640px){body{font-size:1rem}thead{position:absolute;left:-9999px}table,tbody,tr,td{display:block;width:100%}table{background:none;border:0}tr{margin:0 0 12px;background:var(--panel);border:1px solid var(--line);border-radius:8px}td{border:0;padding:6px 12px}td[data-label]:not([data-label=""])::before{content:attr(data-label);display:block;font-size:.8rem;color:var(--accent);font-weight:700}}\n' +
'@media print{header.top,nav.toc{display:none}.wrap{display:block}body{background:#fff;color:#000}:root{--panel:#fff;--ink:#000;--accent:#000;--muted:#333;--line:#999}}\n' +
'</style></head><body>\n' +
'<header class="top"><span class="t">Saga Studio Guide</span><a class="btn" href="./">Open the Studio</a><a class="btn" href="GUIDE.md" download>Download as Markdown</a><a class="btn" href="https://augustineiacopelli.github.io/appaday/">AppADay</a><button class="btn" id="th" type="button">Theme</button></header>\n' +
'<div class="wrap"><nav class="toc" aria-label="Contents"><details id="tocd" open><summary>Contents</summary><ol>' + toc + '</ol></details></nav>\n' +
'<main><h1>Saga Studio Creator\'s Guide</h1><p class="lead">A complete guide to making a role playing game with Saga Studio, from a blank page to a finished game. It is written for a first time creator who enjoys RPGs and has never made one.</p>' + body + '</main></div>\n' +
'<footer>Saga Studio, AppADay Day 150. <a href="./">Back to the Studio</a> and <a href="https://augustineiacopelli.github.io/appaday/">the AppADay portfolio</a>.</footer>\n' +
'<script>\n(function(){var r=document.documentElement,K="saga150guide:theme";\nfunction get(){try{return localStorage.getItem(K)}catch(e){return null}}\nfunction set(v){try{localStorage.setItem(K,v)}catch(e){}}\nvar t=get();if(t==="parchment")r.setAttribute("data-theme","parchment");\ndocument.getElementById("th").addEventListener("click",function(){var p=r.getAttribute("data-theme")==="parchment";if(p){r.removeAttribute("data-theme");set("night")}else{r.setAttribute("data-theme","parchment");set("parchment")}});\nif(window.matchMedia&&window.matchMedia("(max-width:860px)").matches){document.getElementById("tocd").removeAttribute("open")}\n})();\n</script>\n</body></html>\n';
}

fs.writeFileSync(path.join(ROOT, 'GUIDE.md'), toMd());
fs.writeFileSync(path.join(ROOT, 'guide.html'), toHtml());
console.log('built', secs.length, 'sections');
