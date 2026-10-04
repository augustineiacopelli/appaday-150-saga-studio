// The bot that plays a Saga game the way a person would: it reads the game's own debug face (SagaPlayer.debug), walks
// with the route planner over the real map rules, presses A to talk, open, and step, answers choices from a script, and
// lets battles run on auto. It runs inside the page (page.evaluate), synchronously, on a paused clock, so a whole golden
// path plays in seconds. Shared by test/phase4.js and, later, the Phase 7 exported game test.
'use strict';
// botRun({golden: [steps], choices: [text], maxMs, encounters}) -> {ok, ending, played, log, faults, reason, ticks}
function botRun(o) {
  var D = SagaPlayer.debug, log = [], tm = 0, budget = o.maxMs || 4 * 3600 * 1000, golden = o.golden || [], choiceQ = (o.choices || []).slice(), attempts = { tail: 0 };
  D.pause(true);
  D.encounters(!!o.encounters);
  D.autoBattle(true);
  function key(s) { return s.by + ':' + (s.evt || s.npc); }
  function done() {
    var pl = D.played().map(key), j = 0;
    for (var i = 0; i < pl.length && j < golden.length; i++) if (pl[i] === key(golden[j])) j++;
    return j;
  }
  function tick(ms) { tm += ms; return D.tick(ms, 25); }
  function keyChestFor(mapId) {
    var rec = D.record(mapId), site = rec && rec.site ? D.record(rec.site) : null, maps = site && site.maps ? site.maps : [mapId], held = D.held(), shell = D.shell();
    for (var i = 0; i < maps.length; i++) {
      var mi = D.mapInfo(maps[i]);
      for (var f = 0; mi && f < mi.features.length; f++) {
        var ft = mi.features[f];
        if (ft.kind === 'chest' && typeof ft.item === 'string' && ft.item.indexOf('item:key:') === 0 && !held[ft.item] && !shell.opened[maps[i] + '@' + ft.at[0] + ',' + ft.at[1]]) return { map: maps[i], at: ft.at };
      }
    }
    return null;
  }
  function settle(limit) {
    // Plays out whatever is running (text, fades, battles, choices) until the field is quiet again.
    var t0 = tm;
    while (tm - t0 < (limit || 600000)) {
      var s = D.state();
      if (s.ending || s.mode === 'gameover' || s.mode === 'title') return s;
      if (s.overlay === 'choice') {
        var want = choiceQ.length ? choiceQ.shift() : (s.choices || [])[0];
        if (!D.choose(want)) { log.push('no option ' + want + ' in ' + JSON.stringify(s.choices)); D.choose((s.choices || [])[0]); }
        tick(25); continue;
      }
      if (s.mode === 'event') { if (s.text) D.press('a'); tick(60); continue; }
      if (s.mode === 'battle') { tick(120); continue; }
      if (s.mode === 'menu' || s.overlay) { D.press('b'); tick(25); continue; }
      if (s.mode === 'field' && (s.autopilot || s.moving)) { tick(40); continue; }
      return s;
    }
    return D.state();
  }
  var s = settle();
  while (tm < budget) {
    s = settle();
    if (s.ending) break;
    if (s.mode === 'gameover') return { ok: false, reason: 'game over', log: log, played: D.played(), ticks: tm };
    var j = done();
    if (j >= golden.length) { tick(200); if (++attempts.tail > 50) break; continue; }
    var g = golden[j], k = key(g);
    attempts[k] = (attempts[k] || 0) + 1;
    if (attempts[k] > 8) return { ok: false, reason: 'stuck at step ' + (j + 1) + ' ' + k, log: log, played: D.played(), state: s, ticks: tm };
    var target = null, adjacent = false;
    if (g.by === 'step' || g.by === 'mapEnter') {
      var ev = D.record(g.evt);
      if (g.by === 'mapEnter') { var mi = D.mapInfo(ev.map); var a0 = mi.exits[0] ? mi.exits[0].arrive : [1, 1]; target = { map: ev.map, at: a0 }; }
      else target = { map: ev.map, at: ev.at };
    } else if (g.by === 'talk' || g.by === 'dialogue') {
      var np = D.record(g.npc); target = { map: np.map, at: np.at }; adjacent = true;
    } else if (g.by === 'autorun') {
      var ar = D.record(g.evt);
      if (s.map === ar.map) { tick(200); continue; }
      var mi2 = D.mapInfo(ar.map); target = { map: ar.map, at: mi2.exits[0] ? mi2.exits[0].arrive : [1, 1] };
    } else { tick(200); continue; }
    if (!adjacent && s.map === target.map && s.x === target.at[0] && s.y === target.at[1]) { D.press('a'); tick(50); continue; }
    var n = null;
    if (!adjacent) n = D.travel(target.map, target.at[0], target.at[1], { avoidSteps: true });
    if (!adjacent && n == null) n = D.travel(target.map, target.at[0], target.at[1], {});
    if (n == null) { adjacent = true; n = D.travel(target.map, target.at[0], target.at[1], { adjacent: true, avoidSteps: true }); }
    if (n == null) n = D.travel(target.map, target.at[0], target.at[1], { adjacent: true });
    if (n == null) {
      // A locked door in the way: fetch the small key from its chest on the same site first, as a person would.
      var kc = keyChestFor(target.map);
      if (kc) {
        n = D.travel(kc.map, kc.at[0], kc.at[1], { adjacent: true });
        if (n != null) {
          log.push((j + 1) + ' ' + k + ': fetch the key first, ' + n + ' steps');
          var t0k = tm;
          while (tm - t0k < 900000) { var sk = D.state(); if (sk.mode !== 'field' || (!sk.autopilot && !sk.moving)) break; tick(40); }
          if (D.state().mode === 'field') { D.press('a'); tick(30); }
          attempts[k]--;
          continue;
        }
      }
    }
    if (n == null) return { ok: false, reason: 'no route to step ' + (j + 1) + ' ' + k + ' at ' + target.map + ' ' + target.at, log: log, played: D.played(), state: s, ticks: tm };
    log.push((j + 1) + ' ' + k + ': ' + n + ' steps' + (adjacent ? ', then A' : ''));
    var t1 = tm;
    while (tm - t1 < 900000) { var s2 = D.state(); if (s2.mode !== 'field' || (!s2.autopilot && !s2.moving)) break; tick(40); }
    s = D.state();
    if (adjacent && s.mode === 'field' && !s.autopilot) { D.press('a'); tick(30); }
  }
  s = settle();
  return { ok: !!s.ending, ending: s.ending, played: D.played(), log: log, faults: D.faults(), state: s, ticks: tm };
}
module.exports = { botRun: botRun };
