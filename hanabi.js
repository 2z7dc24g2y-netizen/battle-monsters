/* HANABI.JS 日本花火特效模組（由 ChatGPT 初版改寫：效能、生命週期、上升動畫）。作者：辛巴王
 * Hanabi.start(container, {duration, density, sound, auto})  開一場煙火，放完自動移除，回傳 Promise
 * Hanabi.burst(type, x, y, {color, scale, rise})             在 0~1 相對座標放一發；rise:true 先從底部升空
 * Hanabi.show(container, {duration, shots, sky})             一行搞定（sky 0~1：淺色畫面上先鋪一層夜空）：開場＋依序施放 shots（勝利、進化、全破用）
 * Hanabi.stop()
 * 種類：kiku 菊、botan 牡丹、kamuro 冠菊（柳）、senrin 千輪、poka 雙層芯、henka 變色星 */
(function () {
  'use strict';
  var MAX = 2500, TYPES = ['kiku', 'botan', 'kamuro', 'senrin', 'poka', 'henka'];
  var COLORS = ['#FFD166', '#FF7043', '#FF4F81', '#B388FF', '#64DDFF', '#FFFFFF', '#A5E887', '#FFCA28'];
  function rand(a, b) { return Math.random() * (b - a) + a; }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function hex(c) { var n = parseInt(String(c).replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { var x = hex(a), y = hex(b); return '#' + x.map(function (v, i) { return Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0'); }).join(''); }

  /* 每種顏色預先畫一張發光圓點，取代逐顆 shadowBlur（平板上差很多） */
  var SPR = {};
  function sprite(c) {
    if (SPR[c]) return SPR[c];
    var s = document.createElement('canvas'); s.width = s.height = 32;
    var g = s.getContext('2d'), r = hex(c), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.18, 'rgba(' + r + ',1)'); gr.addColorStop(.45, 'rgba(' + r + ',.35)'); gr.addColorStop(1, 'rgba(' + r + ',0)');
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
    return (SPR[c] = s);
  }

  /* ---- 聲音（Web Audio 合成，不用音檔） ---- */
  var AC = null;
  function audio() {
    try { if (!AC) { var A = window.AudioContext || window.webkitAudioContext; if (!A) return null; AC = new A(); } if (AC.state === 'suspended') AC.resume(); } catch (e) { return null; }
    return AC;
  }
  function boom(power, delay) {
    var c = AC; if (!c || c.state !== 'running') return;
    var t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(28, t + .35);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.16 * power, t + .015); g.gain.exponentialRampToValueAtTime(.0001, t + .5);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + .55);
    var d = .35, buf = c.createBuffer(1, Math.floor(c.sampleRate * d), c.sampleRate), ch = buf.getChannelData(0);
    for (var i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2);
    var n = c.createBufferSource(), f = c.createBiquadFilter(), ng = c.createGain();
    n.buffer = buf; f.type = 'highpass'; f.frequency.value = 900;
    ng.gain.setValueAtTime(.0001, t); ng.gain.linearRampToValueAtTime(.1 * power, t + .01); ng.gain.exponentialRampToValueAtTime(.0001, t + d);
    n.connect(f); f.connect(ng); ng.connect(c.destination); n.start(t); n.stop(t + d);
  }
  function whistle() {
    var c = AC; if (!c || c.state !== 'running') return;
    var t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(100, t); o.frequency.exponentialRampToValueAtTime(850, t + .55);
    g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.03, t + .1); g.gain.exponentialRampToValueAtTime(.0001, t + .55);
    o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + .6);
  }

  var engine = null;
  function Engine(box, opt) {
    var me = this;
    this.box = box;
    this.opt = Object.assign({ duration: 15, density: .75, sound: true, auto: true }, opt || {});
    this.opt.density = clamp(+this.opt.density || .75, .05, 1);
    this.reduced = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    this.shots = 0;
    this.cv = document.createElement('canvas');
    this.ctx = this.cv.getContext('2d');
    this.cv.style.cssText = 'position:' + (box === document.body ? 'fixed' : 'absolute') + ';inset:0;width:100%;height:100%;pointer-events:none;z-index:9999;display:block';
    this.ps = []; this.rk = []; this.sch = [];
    this.active = true; this.t0 = this.last = performance.now(); this.nextAuto = 0; this.flash = 0;
    this.pos0 = box.style.position; this.moved = false;
    if (box !== document.body && getComputedStyle(box).position === 'static') { box.style.position = 'relative'; this.moved = true; }
    box.appendChild(this.cv);
    this.onResize = function () { me.resize(); };
    this.resize();
    if (window.ResizeObserver) { this.ro = new ResizeObserver(this.onResize); this.ro.observe(box); } else addEventListener('resize', this.onResize);
    if (this.opt.sound) audio();
    this.done = new Promise(function (res) { me.resolve = res; });
    this.timer = setTimeout(function () { me.stop(); }, Math.max(.1, +this.opt.duration || 15) * 1000);
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }
  var E = Engine.prototype;
  E.resize = function () {
    if (!this.active) return;
    var r = this.box === document.body ? { width: innerWidth, height: innerHeight } : this.box.getBoundingClientRect();
    this.w = Math.max(1, r.width); this.h = Math.max(1, r.height); this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.round(this.w * this.dpr); this.cv.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  };
  E.add = function (p) { if (this.ps.length < MAX) { this.ps.push(p); return p; } return null; };
  E.dens = function () { return this.reduced ? .15 : this.opt.density * (this.ps.length > MAX * .7 ? .5 : 1); };
  E.allow = function () { if (!this.reduced) return true; if (this.shots >= 3) return false; this.shots++; return true; };
  E.launch = function (type, x, y, o) {
    if (!this.active || !this.allow()) return;
    o = o || {};
    this.rk.push({ type: type, x: x * this.w, y: this.h + 8, ty: y * this.h, vx: rand(-.3, .3), vy: -Math.max(5, Math.sqrt(2 * .11 * Math.max(60, this.h - y * this.h)) * 1.04),
      c: o.color || pick(COLORS), s: clamp(+o.scale || 1, .3, 2.5), tr: [] });
    if (this.opt.sound && !this.reduced) whistle();
  };
  E.explode = function (type, x, y, o) {
    if (!this.active) return;
    type = TYPES.indexOf(type) >= 0 ? type : 'kiku';
    var c = o.color || pick(COLORS), s = clamp(+o.scale || 1, .3, 2.5), d = this.dens();
    if (!this.reduced) this.flash = Math.max(this.flash, .1);
    if (this.opt.sound) { var cx = this.w / 2, cy = this.h / 2; boom(.8 * s, .15 + .35 * Math.hypot(x - cx, y - cy) / Math.max(1, Math.hypot(cx, cy))); }
    var k = Math.min(this.w, this.h) / 600; s *= clamp(k, .55, 1.6);   /* 小螢幕自動縮小 */
    if (this.reduced) { this.sphere(x, y, 12, c, { speed: 1.6 * s, r: 3, life: .9 }); return; }
    this['t_' + type](x, y, c, s, d);
  };
  E.sphere = function (x, y, n, c, o) {
    var out = [];
    for (var i = 0; i < n; i++) {
      /* 球面上平均分布再投影到畫面：中間也有星，邊緣較密，像真的球形花火 */
      var a = 2.39996 * i + rand(-.05, .05), zz = 1 - 2 * (i + .5) / n, rr = Math.sqrt(1 - zz * zz), v = (o.speed || 4) * rand(.94, 1.06);
      var p = this.add({ x: x, y: y, vx: Math.cos(a) * rr * v, vy: Math.sin(a) * rr * v, c: c, c0: c, r: (o.r || 2) * rand(.75, 1.2), life: (o.life || 1.8) * rand(.85, 1.15), age: 0,
        g: o.g || .055, drag: o.drag || .985, tail: o.tail || 0, fl: !!o.fl, to: o.to || null, at: o.at || .65 });
      if (p) out.push(p);
    }
    return out;
  };
  E.t_kiku = function (x, y, c, s, d) { this.sphere(x, y, Math.floor(100 * d * s), c, { speed: 4.2 * s, r: 1.8, tail: 8, g: .045, life: 2.3, to: '#A5E887', at: .62 }); };
  E.t_botan = function (x, y, c, s, d) { var n = Math.floor(70 * d * s); this.sphere(x, y, n, c, { speed: 3.5 * s, r: 3, g: .07, life: 1.5 }); this.sphere(x, y, Math.floor(n * .2), '#FFFFFF', { speed: 2.6 * s, r: 1.8, life: 1.2 }); };
  E.t_kamuro = function (x, y, c, s, d) { this.sphere(x, y, Math.floor(120 * d * s), '#FFD166', { speed: 3.3 * s, r: 1.4, tail: 18, g: .1, life: 4.2, drag: .99, fl: true }); };
  E.t_poka = function (x, y, c, s, d) { this.sphere(x, y, Math.floor(90 * d * s), c, { speed: 4.2 * s, r: 1.8, tail: 6, life: 2 }); this.sphere(x, y, Math.floor(42 * d * s), '#FFFFFF', { speed: 2.1 * s, r: 2.5, g: .06, life: 1.6 }); };
  E.t_henka = function (x, y, c, s, d) { /* 變色星：飛到一半整顆換色，再換一次 */
    var a = pick(['#FF4F81', '#64DDFF', '#FFD166']), b = pick(['#A5E887', '#B388FF', '#FFFFFF']);
    this.sphere(x, y, Math.floor(95 * d * s), c, { speed: 3.9 * s, r: 2.1, tail: 5, life: 2.4, to: a, at: .35 }).forEach(function (p) { p.to2 = b; });
  };
  E.t_senrin = function (x, y, c, s, d) {
    var me = this, fc = ['#FF5C7A', '#FFD166', '#70DBA8', '#64DDFF', '#B388FF', '#FFFFFF'];
    this.sphere(x, y, Math.floor(60 * d * s), '#FFFFFF', { speed: 2.9 * s, r: 1.5, life: 1, tail: 3 });
    for (var i = 0; i < Math.max(4, Math.floor(10 * d)); i++) this.sch.push({ t: performance.now() + 320 + i * 45, f: function () {
      var a = rand(0, Math.PI * 2), r = rand(35, 90) * s;
      me.sphere(x + Math.cos(a) * r, y + Math.sin(a) * r, Math.floor(22 * d) + 6, pick(fc), { speed: 1.8 * s, r: 1.8, tail: 2, life: 1.3 });
      if (me.opt.sound && Math.random() < .35) boom(.25, 0);
    } });
  };
  E.loop = function (now) {
    if (!this.active) return;
    var dt = Math.min((now - this.last) / 1000, .04), x = this.ctx, i, f = dt * 60;
    this.last = now;
    x.clearRect(0, 0, this.w, this.h);
    if (this.opt.sky) { /* 淺色畫面上先拉一層夜空（上暗下透明），煙火才看得到；開頭淡入、結尾淡出 */
      var el = (now - this.t0) / 1000, D = +this.opt.duration || 15, fa = Math.min(1, el / .4, Math.max(0, (D - el) / .8));
      var gr = x.createLinearGradient(0, 0, 0, this.h * .75); gr.addColorStop(0, 'rgba(7,19,41,' + this.opt.sky * fa + ')'); gr.addColorStop(.6, 'rgba(7,19,41,' + this.opt.sky * fa * .6 + ')'); gr.addColorStop(1, 'rgba(7,19,41,0)');
      x.fillStyle = gr; x.fillRect(0, 0, this.w, this.h * .75);
    }
    x.globalCompositeOperation = 'lighter';
    if (this.flash > .002) { x.globalAlpha = this.flash; x.fillStyle = '#fff'; x.fillRect(0, 0, this.w, this.h); this.flash *= Math.pow(.05, dt); }
    if (this.opt.auto && !this.reduced && now >= this.nextAuto && now - this.t0 < this.opt.duration * 1000 - 2200) {
      this.nextAuto = now + rand(650, 1100);
      this.launch(pick(TYPES), rand(.15, .85), rand(.17, .45), { color: pick(COLORS), scale: rand(.7, 1.15) });
    }
    for (i = this.sch.length - 1; i >= 0; i--) if (now >= this.sch[i].t) this.sch.splice(i, 1)[0].f();
    for (i = this.rk.length - 1; i >= 0; i--) {
      var r = this.rk[i];
      r.vy += .11 * f; r.x += r.vx * f; r.y += r.vy * f; r.tr.push(r.x, r.y); if (r.tr.length > 18) r.tr.splice(0, 2);
      for (var j = 0; j < r.tr.length; j += 2) { x.globalAlpha = j / r.tr.length * .7; x.drawImage(sprite(j % 4 ? r.c : '#FFFFFF'), r.tr[j] - 4, r.tr[j + 1] - 4, 8, 8); }
      x.globalAlpha = 1; x.drawImage(sprite(r.c), r.x - 9, r.y - 9, 18, 18);
      if (r.vy >= -.3 || r.y <= r.ty) { this.explode(r.type, r.x, r.y, { color: r.c, scale: r.s }); this.rk.splice(i, 1); }
    }
    for (i = this.ps.length - 1; i >= 0; i--) {
      var p = this.ps[i]; p.age += dt;
      if (p.age >= p.life) { this.ps[i] = this.ps[this.ps.length - 1]; this.ps.pop(); continue; }
      p.vy += p.g * f; var dr = Math.pow(p.drag, f); p.vx *= dr; p.vy *= dr; p.x += p.vx * f; p.y += p.vy * f;
      var k = p.age / p.life, col = p.c;
      if (p.to && k > p.at) { var t = clamp((k - p.at) / (p.to2 ? .3 : 1 - p.at), 0, 1); col = mix(p.c0, p.to, t); if (p.to2 && t >= 1) col = k > p.at + .4 ? p.to2 : p.to; }
      var al = Math.pow(1 - k, 1.4); if (p.fl) al *= rand(.5, 1);
      if (p.tail) { x.globalAlpha = al * .45; x.strokeStyle = col; x.lineWidth = p.r * .75; x.beginPath(); x.moveTo(p.x, p.y); x.lineTo(p.x - p.vx * p.tail * .15, p.y - p.vy * p.tail * .15); x.stroke(); }
      x.globalAlpha = al; var z = p.r * 5; x.drawImage(sprite(col), p.x - z / 2, p.y - z / 2, z, z);
    }
    x.globalAlpha = 1; x.globalCompositeOperation = 'source-over';
    this.raf = requestAnimationFrame(this.loop);
  };
  E.stop = function () {
    if (!this.active) return;
    this.active = false; cancelAnimationFrame(this.raf); clearTimeout(this.timer);
    if (this.ro) this.ro.disconnect(); else removeEventListener('resize', this.onResize);
    this.ps.length = this.rk.length = this.sch.length = 0; this.cv.remove();
    if (this.moved) this.box.style.position = this.pos0;
    if (engine === this) engine = null;
    this.resolve();
  };

  window.Hanabi = {
    TYPES: TYPES.slice(),
    start: function (box, opt) {
      if (!box || !box.appendChild) return Promise.reject(new Error('Hanabi.start：請提供有效的 HTML 容器'));
      if (engine) engine.stop();
      engine = new Engine(box, opt);
      return engine.done;
    },
    burst: function (type, x, y, o) {
      if (!engine || !engine.active) return;
      o = Object.assign({ color: pick(COLORS), scale: 1 }, o || {});
      x = clamp(x, 0, 1); y = clamp(y, 0, 1);
      if (o.rise) { engine.launch(type, x, y, o); return; }
      if (!engine.allow()) return;
      engine.explode(type, x * engine.w, y * engine.h, o);
    },
    /* shots: [[秒, 種類, x, y, 顏色, 大小], ...]；沒給就依 duration 自動施放 */
    show: function (box, o) {
      o = o || {};
      var p = Hanabi.start(box, { duration: o.duration || 4, density: o.density || .7, sound: o.sound !== false, auto: !o.shots, sky: o.sky || 0 });
      (o.shots || []).forEach(function (s) { setTimeout(function () { Hanabi.burst(s[1], s[2], s[3], { color: s[4], scale: s[5] || 1, rise: true }); }, s[0] * 1000); });
      return p;
    },
    stop: function () { if (engine) engine.stop(); },
    unlock: audio
  };
})();
