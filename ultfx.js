/* UltFX 大招特效（由 ChatGPT 初版改寫：統一繪圖迴圈、平板效能、雙方方向、依畫面縮放）。作者：辛巴王
 * UltFX.play(kind, {stage, from:{x,y}, targets:[{x,y}], onHit(i), dir:1|-1}) → Promise
 *   kind：fire 烈焰風暴、water 潮汐衝擊、elec 連鎖閃電、wood 光合作用、earth 岩盾壁壘
 *   座標是相對 stage 左上角的 CSS 像素；onHit(i) 在第 i 個目標被打中（或被補血、上盾）的那一格呼叫
 * 演出流程：暗場＋集中線蓄力 → 元素大招 → 命中閃白、震動、色偏、短暫停頓 → 淡出 */
(function () {
  'use strict';
  var MAXP = 1200;
  var COL = { fire: '#ff682e', water: '#36caff', elec: '#b7e9ff', wood: '#72f29b', earth: '#d6b77c' };
  var RM = window.matchMedia ? matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function R(a, b) { return Math.random() * (b - a) + a; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function eOut(t) { return 1 - Math.pow(1 - t, 3); }
  function eIO(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function hex(c) { var n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  var SPR = {};
  function glow(c) { /* 預先畫好的發光圓點，取代逐顆 shadowBlur */
    if (SPR[c]) return SPR[c];
    var s = document.createElement('canvas'); s.width = s.height = 32;
    var g = s.getContext('2d'), r = hex(c), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(' + r + ',1)'); gr.addColorStop(.55, 'rgba(' + r + ',.35)'); gr.addColorStop(1, 'rgba(' + r + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return (SPR[c] = s);
  }

  function Engine(stage) {
    this.stage = stage;
    var cv = this.cv = document.createElement('canvas');
    cv.className = 'ultfx-canvas';
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:30';
    if (getComputedStyle(stage).position === 'static') stage.style.position = 'relative';
    stage.appendChild(cv);
    this.ctx = cv.getContext('2d');
    this.ps = []; this.rings = []; this.layers = [];
    this.shake = 0; this.flash = 0; this.chroma = 0; this.stop = 0; this.active = false;
  }
  var E = Engine.prototype;
  E.resize = function () {
    var r = this.stage.getBoundingClientRect(); this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
    var d = Math.min(window.devicePixelRatio || 1, 2); this.cv.width = Math.round(this.w * d); this.cv.height = Math.round(this.h * d);
    this.ctx.setTransform(d, 0, 0, d, 0, 0);
    this.k = clamp(Math.min(this.w, this.h * 1.8) / 900, .45, 1.5);   /* 特效大小跟著戰場縮放 */
  };
  E.add = function (x, y, o) {
    if (this.ps.length >= MAXP) return;
    o = o || {};
    this.ps.push({ x: x, y: y, vx: o.vx != null ? o.vx : R(-2, 2), vy: o.vy != null ? o.vy : R(-3, 1), life: o.life || R(350, 800), max: o.life || 600,
      s: (o.size || R(2, 7)) * this.k, c: o.color || '#ffffff', g: o.gravity || 0, drag: o.drag || .985, type: o.type || 'dot', rot: R(0, 6.28), spin: R(-.08, .08) });
    var p = this.ps[this.ps.length - 1]; p.max = p.life;
  };
  E.burst = function (x, y, c, n, sp) {
    for (var i = 0; i < n; i++) { var a = R(0, 6.28), s = R(sp * .3, sp) * this.k;
      this.add(x, y, { vx: Math.cos(a) * s, vy: Math.sin(a) * s, color: c, size: R(2, 6), life: R(250, 650), type: Math.random() > .7 ? 'spark' : 'dot', drag: .96 }); }
  };
  E.ring = function (x, y, c, r) { this.rings.push({ x: x, y: y, c: c, r: r * this.k, life: 480 }); };
  /* 一段持續 dur 毫秒的畫面（龍捲、巨浪、光柱、盾牌…），每格由 fn(p) 畫出，p 從 0 到 1 */
  E.layer = function (dur, fn) { var me = this; return new Promise(function (res) { me.layers.push({ t0: performance.now(), dur: dur, fn: fn, done: res }); }); };
  E.hit = function (x, y, c, power) {
    if (!RM.matches) { this.flash = Math.max(this.flash, .55); this.shake = 9 * (power || 1) * this.k; this.chroma = 1; this.stop = performance.now() + 75; }
    this.burst(x, y, c, 30, 7); this.ring(x, y, c, 120);
  };
  E.frame = function (now) {
    if (!this.active) return;
    var dt = Math.min(now - (this.last || now), 32), x = this.ctx, frozen = now < this.stop, i, me = this;
    this.last = now;
    x.clearRect(0, 0, this.w, this.h);
    x.save();
    if (this.shake > .3) { x.translate(R(-this.shake, this.shake), R(-this.shake, this.shake)); if (!frozen) this.shake *= .86; }
    for (i = 0; i < this.layers.length; i++) {
      var L = this.layers[i], p = clamp((now - L.t0) / L.dur, 0, 1);
      x.save(); L.fn.call(this, p, x); x.restore();
      if (p >= 1) { this.layers.splice(i--, 1); L.done(); }
    }
    x.globalCompositeOperation = 'lighter';
    for (i = this.ps.length - 1; i >= 0; i--) {
      var q = this.ps[i];
      if (!frozen) { var t = dt / 16.67, d = Math.pow(q.drag, t); q.life -= dt; q.vx *= d; q.vy = q.vy * d + q.g * t; q.x += q.vx * t; q.y += q.vy * t; q.rot += q.spin * t; }
      if (q.life <= 0) { this.ps[i] = this.ps[this.ps.length - 1]; this.ps.pop(); continue; }
      x.globalAlpha = clamp(q.life / q.max, 0, 1);
      if (q.type === 'dot') { var z = q.s * 3.2; x.drawImage(glow(q.c), q.x - z / 2, q.y - z / 2, z, z); continue; }
      x.save(); x.translate(q.x, q.y); x.rotate(q.rot); x.fillStyle = q.c;
      if (q.type === 'leaf') { x.beginPath(); x.ellipse(0, 0, q.s, q.s * .48, 0, 0, 6.28); x.fill(); }
      else if (q.type === 'diamond') { x.globalCompositeOperation = 'source-over'; x.beginPath(); x.moveTo(0, -q.s); x.lineTo(q.s * .7, 0); x.lineTo(0, q.s); x.lineTo(-q.s * .7, 0); x.closePath(); x.fill(); x.strokeStyle = 'rgba(80,55,30,.6)'; x.lineWidth = 1; x.stroke(); }
      else { x.fillRect(-q.s * .2, -q.s, q.s * .4, q.s * 2); x.fillRect(-q.s, -q.s * .2, q.s * 2, q.s * .4); }
      x.restore();
    }
    x.globalAlpha = 1;
    this.rings = this.rings.filter(function (g) {
      if (!frozen) g.life -= dt; var pr = 1 - g.life / 480; if (pr >= 1) return false;
      x.globalAlpha = 1 - pr; x.strokeStyle = g.c; x.lineWidth = Math.max(1, 6 * (1 - pr) * me.k);
      x.beginPath(); x.arc(g.x, g.y, lerp(5, g.r, eOut(pr)), 0, 6.28); x.stroke(); return true;
    });
    x.restore();
    x.globalCompositeOperation = 'lighter';
    if (this.chroma > .02) { x.globalAlpha = .12 * this.chroma; var o = 3 * this.chroma; x.fillStyle = '#ff263c'; x.fillRect(-o, 0, this.w, this.h); x.fillStyle = '#247dff'; x.fillRect(o, 0, this.w, this.h); if (!frozen) this.chroma *= .9; }
    if (this.flash > .02) { x.globalCompositeOperation = 'source-over'; x.globalAlpha = this.flash; x.fillStyle = '#fff'; x.fillRect(0, 0, this.w, this.h); if (!frozen) this.flash *= .6; }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    this.raf = requestAnimationFrame(this.frame.bind(this));
  };

  /* ---- 共用：蓄力（暗場＋集中線＋聚氣光點） ---- */
  E.charge = function (from, c, ms) {
    var k = this.k, me = this;
    return this.layer(ms, function (p, x) {
      x.fillStyle = 'rgba(0,0,0,' + (.45 * Math.min(1, p * 3)) + ')'; x.fillRect(0, 0, me.w, me.h);
      if (RM.matches) return;
      x.translate(from.x, from.y); x.strokeStyle = 'rgba(255,255,255,' + (.18 + p * .4) + ')'; x.lineWidth = 1.5;
      var r0 = (110 - p * 60) * k;
      for (var i = 0; i < 36; i++) { var a = i / 36 * 6.28 + R(-.05, .05), ln = R(60, 160) * k; x.beginPath(); x.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); x.lineTo(Math.cos(a) * (r0 + ln), Math.sin(a) * (r0 + ln)); x.stroke(); }
      x.globalCompositeOperation = 'lighter'; var z = (60 + 70 * p) * k; x.globalAlpha = .4 + .5 * p; x.drawImage(glow(c), -z / 2, -z / 2, z, z);
      if (Math.random() < .8) { var a2 = R(0, 6.28), rr = R(40, 90) * k; me.add(from.x + Math.cos(a2) * rr, from.y + Math.sin(a2) * rr, { vx: -Math.cos(a2) * 3 * k, vy: -Math.sin(a2) * 3 * k, color: c, size: R(2, 5), life: 300 }); }
    });
  };
  /* 後面的暗場慢慢退掉 */
  E.dim = function (ms) { var me = this; return this.layer(ms, function (p, x) { x.fillStyle = 'rgba(0,0,0,' + (.45 * (1 - p)) + ')'; x.fillRect(0, 0, me.w, me.h); }); };

  /* ---- 火：火焰龍捲橫掃 ---- */
  E.fire = function (o) {
    var me = this, k = this.k, dir = o.dir, ts = o.targets, cy = ts.reduce(function (s, t) { return s + t.y; }, 0) / Math.max(1, ts.length) || this.h / 2;
    var x0 = o.from.x, x1 = dir > 0 ? Math.max.apply(null, ts.map(function (t) { return t.x; })) + 60 * k : Math.min.apply(null, ts.map(function (t) { return t.x; })) - 60 * k, hit = {};
    return this.layer(850, function (p, x) {
      var cx = lerp(x0, x1, eIO(p)); x.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 7; i++) {
        var gx = cx + Math.sin(i * 2 + p * 12) * 35 * k, gy = cy + Math.sin(p * 20 + i) * 40 * k, rw = (120 - i * 8) * k, rh = (45 + i * 8) * k;
        var gr = x.createRadialGradient(gx, gy, 0, gx, gy, rw); gr.addColorStop(0, 'rgba(255,240,140,.85)'); gr.addColorStop(.4, 'rgba(255,110,20,.55)'); gr.addColorStop(1, 'rgba(255,50,10,0)');
        x.fillStyle = gr; x.beginPath(); x.ellipse(gx, gy, rw, rh, p * 5 + i, 0, 6.28); x.fill();
      }
      var hz = 150 * k; x.drawImage(glow('#ffb12e'), cx + dir * 30 * k - hz / 2, cy - hz / 2, hz, hz);
      for (var j = 0; j < 8; j++) me.add(cx + R(-70, 70) * k, cy + R(-60, 60) * k, { vx: R(-1, 1) - dir * 2, vy: R(-3, 1), color: Math.random() > .5 ? '#ffb12e' : '#ff4828', size: R(3, 8), life: R(300, 650), gravity: -.03 });
      ts.forEach(function (t, i) { if (!hit[i] && (dir > 0 ? cx >= t.x - 40 * k : cx <= t.x + 40 * k)) { hit[i] = 1; me.hit(t.x, t.y, COL.fire, 1.2); o.onHit(i);
        for (var m = 0; m < 10; m++) me.add(t.x + R(-35, 35) * k, t.y + 40 * k, { vx: R(-1, 1), vy: R(-2, 0), color: '#ff8c32', size: R(2, 5), life: R(500, 900) }); } });
    });
  };
  /* ---- 水：巨浪推過整排 ---- */
  E.water = function (o) {
    var me = this, k = this.k, dir = o.dir, ts = o.targets, hit = {}, W = this.w, base = Math.max.apply(null, ts.map(function (t) { return t.y; })) + 40 * k;
    return this.layer(900, function (p, x) {
      var fx = dir > 0 ? lerp(o.from.x - 40 * k, W * 1.3, p) : lerp(o.from.x + 40 * k, -W * .3, p), back = fx - dir * 600 * k;
      var gr = x.createLinearGradient(0, base - 260 * k, 0, base + 40 * k); gr.addColorStop(0, 'rgba(200,248,255,.95)'); gr.addColorStop(.3, 'rgba(45,165,250,.85)'); gr.addColorStop(1, 'rgba(0,70,170,.25)');
      x.globalAlpha = .85; x.fillStyle = gr; x.beginPath(); x.moveTo(back, base + 40 * k);
      var pts = [];
      /* 浪頭在最前面最高、往前捲 */
      for (var i = 0; i <= 30; i++) { var u = i / 30, px = lerp(back, fx, u) + (u > .9 ? dir * 25 * k * (u - .9) / .1 : 0), crest = Math.sin(Math.min(u / .9, 1) * Math.PI / 2) * (u > .9 ? 1 - (u - .9) / .1 * .35 : 1) * (230 + 30 * Math.sin(p * 9)) * k, wv = Math.sin(i * .5 + p * 15) * 10 * k; pts.push([px, base - crest - wv]); x.lineTo(px, base - crest - wv); }
      x.lineTo(fx, base + 40 * k); x.closePath(); x.fill();
      x.globalAlpha = 1; x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 6 * k; x.beginPath(); pts.forEach(function (q, i) { i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); }); x.stroke();
      for (var j = 0; j < 6; j++) { var q = pts[30 - Math.floor(R(0, 6))]; me.add(q[0], q[1], { vx: dir * R(0, 3), vy: R(-5, 0), color: '#c5f8ff', size: R(3, 8), life: 600, gravity: .12 }); }
      ts.forEach(function (t, i) { if (!hit[i] && (dir > 0 ? fx >= t.x : fx <= t.x)) { hit[i] = 1; me.burst(t.x, t.y, '#ffffff', 30, 8); me.burst(t.x, t.y, '#43caff', 24, 6); me.hit(t.x, t.y, COL.water, 1); o.onHit(i); } });
    });
  };
  /* ---- 電：鋸齒閃電（每個目標一道，可一次打一隻做連鎖） ---- */
  E.bolt = function (a, b, ms) {
    var k = this.k;
    function path() { var ps = [[a.x, a.y]]; for (var i = 1; i < 14; i++) { var t = i / 14; ps.push([lerp(a.x, b.x, t) + R(-22, 22) * k, lerp(a.y, b.y, t) + R(-28, 28) * k]); } ps.push([b.x, b.y]); return ps; }
    return this.layer(ms, function (p, x) {
      if (p > .75 && Math.random() < .5) return;   /* 尾段閃爍 */
      var ps = path(); x.globalCompositeOperation = 'lighter'; x.lineJoin = 'round';
      [[16, 'rgba(50,140,255,.25)'], [8, 'rgba(70,160,255,.8)'], [3, '#ffffff']].forEach(function (s) {
        x.lineWidth = s[0] * k; x.strokeStyle = s[1]; x.beginPath(); ps.forEach(function (q, i) { i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); }); x.stroke();
      });
      x.lineWidth = 2 * k; x.strokeStyle = 'rgba(180,220,255,.8)';
      for (var i = 3; i < ps.length - 2; i += 4) { var q = ps[i], bx = q[0] + R(-55, 55) * k, by = q[1] + R(-60, 60) * k; x.beginPath(); x.moveTo(q[0], q[1]); x.lineTo(lerp(q[0], bx, .5) + R(-12, 12) * k, lerp(q[1], by, .5)); x.lineTo(bx, by); x.stroke(); }
    });
  };
  E.elec = async function (o) {
    for (var i = 0; i < o.targets.length; i++) {
      var t = o.targets[i], bp = this.bolt(o.from, t, 260);
      await wait(40); this.burst(t.x, t.y, '#d7f5ff', 26, 6); this.hit(t.x, t.y, COL.elec, 1.1); o.onHit(i);
      await bp; if (i < o.targets.length - 1) await wait(90);
    }
  };
  /* ---- 木：天降光柱、花瓣、治療光點 ---- */
  E.wood = async function (o) {
    var me = this, k = this.k;
    await this.layer(700, function (p, x) {
      x.globalCompositeOperation = 'lighter';
      for (var i = 0; i < 9; i++) {
        var cx = (i + .5) / 9 * me.w, w = (18 + Math.sin(p * 8 + i) * 8) * k, gr = x.createLinearGradient(0, 0, 0, me.h);
        gr.addColorStop(0, 'rgba(200,255,150,' + (.38 * Math.sin(p * Math.PI)) + ')'); gr.addColorStop(1, 'rgba(80,255,140,0)');
        x.fillStyle = gr; x.beginPath(); x.moveTo(cx - w, 0); x.lineTo(cx + w, 0); x.lineTo(cx + w * 2, me.h); x.lineTo(cx - w * 2, me.h); x.closePath(); x.fill();
      }
      if (Math.random() < .8) me.add(R(0, me.w), -10, { vx: R(-1.2, 1.2), vy: R(1, 3), color: Math.random() > .5 ? '#8bf0a3' : '#ffd1e5', size: R(4, 9), type: 'leaf', life: 1500, gravity: .01 });
    });
    o.targets.forEach(function (t, i) {
      me.ring(t.x, t.y + 35 * k, '#63f49b', 95);
      for (var j = 0; j < 26; j++) me.add(t.x + R(-40, 40) * k, t.y + 30 * k, { vx: R(-.8, .8), vy: R(-3, -1), color: '#7dffb0', size: R(2, 6), life: R(600, 1200), type: Math.random() > .5 ? 'spark' : 'dot' });
      o.onHit(i);
    });
    var ts = o.targets;
    await this.layer(500, function (p, x) {
      x.globalCompositeOperation = 'lighter'; x.strokeStyle = 'rgba(122,255,173,' + (1 - p) + ')'; x.lineWidth = 4 * k;
      ts.forEach(function (t) { x.beginPath(); x.ellipse(t.x, t.y + 35 * k, 55 * k * (1 + p * .3), 15 * k * (1 + p * .3), 0, 0, 6.28); x.stroke(); });
    });
  };
  /* ---- 土：裂地、碎石、晶岩盾 ---- */
  E.earth = async function (o) {
    var me = this, k = this.k, ts = o.targets, ang = [0, 1, 2, 3, 4, 5, 6].map(function (i) { return i / 7 * 6.28 + R(-.2, .2); });
    var cracks = this.layer(1300, function (p, x) {
      var L = 70 * k * eOut(Math.min(1, p * 2.5)); x.globalAlpha = p < .8 ? 1 : (1 - p) / .2; x.strokeStyle = '#e8c48c'; x.lineWidth = 3 * k;
      ts.forEach(function (t) { ang.forEach(function (a) { x.beginPath(); x.moveTo(t.x, t.y + 35 * k); x.lineTo(t.x + Math.cos(a) * L * .5, t.y + 35 * k + Math.sin(a) * L * .25); x.lineTo(t.x + Math.cos(a + .2) * L, t.y + 35 * k + Math.sin(a + .2) * L * .5); x.stroke(); }); });
    });
    await wait(380);
    ts.forEach(function (t) { for (var i = 0; i < 10; i++) me.add(t.x + R(-30, 30) * k, t.y + 40 * k, { vx: R(-3, 3), vy: R(-6, -2), color: Math.random() > .5 ? '#c6a47a' : '#9c7c58', size: R(4, 11), type: 'diamond', life: 700, gravity: .18 }); });
    me.shake = 6 * k;
    await wait(120);
    ts.forEach(function (t, i) { me.ring(t.x, t.y, '#e6d2ad', 100); o.onHit(i); });
    await this.layer(700, function (p, x) {
      var a = p < .75 ? 1 : (1 - p) / .25;
      ts.forEach(function (t) {
        var s = (55 + eOut(Math.min(1, p * 2)) * 15) * k; x.save(); x.translate(t.x, t.y); x.globalAlpha = .85 * a;
        var gr = x.createLinearGradient(-s, -s, s, s); gr.addColorStop(0, 'rgba(255,240,190,.7)'); gr.addColorStop(.35, 'rgba(160,130,90,.55)'); gr.addColorStop(.7, 'rgba(110,85,60,.55)'); gr.addColorStop(1, 'rgba(255,230,180,.7)');
        x.fillStyle = gr; x.strokeStyle = 'rgba(255,240,210,.9)'; x.lineWidth = 3 * k;
        x.beginPath(); x.moveTo(0, -s * 1.25); x.lineTo(s * .9, -s * .75); x.lineTo(s * 1.1, s * .25); x.lineTo(0, s * 1.2); x.lineTo(-s * 1.1, s * .25); x.lineTo(-s * .9, -s * .75); x.closePath(); x.fill(); x.stroke();
        x.globalAlpha = .45 * a; x.fillStyle = '#fff'; x.beginPath(); x.moveTo(0, -s * 1.15); x.lineTo(s * .65, -s * .7); x.lineTo(0, s * .15); x.closePath(); x.fill();
        x.restore();
      });
    });
    await cracks;
  };

  E.play = async function (kind, o) {
    this.active = true; this.resize(); this.ps.length = 0; this.rings.length = 0; this.layers.length = 0; this.cv.style.opacity = 1;
    this.last = 0; this.raf = requestAnimationFrame(this.frame.bind(this));
    var c = COL[kind];
    try {
      await this.charge(o.from, c, RM.matches ? 120 : 380);
      this.dim(kind === 'wood' || kind === 'earth' ? 1200 : 900);
      await this[kind](o);
      await wait(380);
      var cv = this.cv; await this.layer(260, function (p) { cv.style.opacity = String(1 - p); });
    } finally {
      this.active = false; cancelAnimationFrame(this.raf); this.ctx.clearRect(0, 0, this.w, this.h); this.cv.style.opacity = 1;
      this.layers.forEach(function (L) { L.done(); }); this.layers.length = 0;
    }
  };

  var inst = new WeakMap(), busy = new WeakMap();
  window.UltFX = {
    play: function (kind, o) {
      if (!COL[kind] || !o || !o.stage || !o.from || !Array.isArray(o.targets)) return Promise.reject(new Error('UltFX.play 參數不完整'));
      var st = o.stage, e = inst.get(st);
      if (!e || !e.cv.isConnected) { e = new Engine(st); inst.set(st, e); }
      var opt = { from: { x: +o.from.x, y: +o.from.y }, targets: o.targets.map(function (t) { return { x: +t.x, y: +t.y }; }), dir: o.dir || 1,
        onHit: function (i) { try { o.onHit && o.onHit(i); } catch (err) { console.error('[UltFX] onHit', err); } } };
      /* 同一個戰場若前一招還沒放完，排在後面接著放 */
      var prev = busy.get(st) || Promise.resolve(), run = prev.then(function () { return e.play(kind, opt); });
      busy.set(st, run.catch(function () {}));
      return run;
    }
  };
})();
