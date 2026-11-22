/* 炎鷹獸動畫播放器：把每個動作的橫向格子圖畫到 canvas 上，腳底對齊同一條地平線 */
var FIRE_FPS = { idle: 6, fly: 10, attack: 12, skill: 11, hurt: 9, victory: 8 };
var FIRE_LOOP = { idle: true, fly: true };
function AnimPlayer(canvas, anims, opt) {
  opt = opt || {};
  this.c = canvas; this.ctx = canvas.getContext('2d'); this.anims = anims;
  this.imgs = {}; this.scale = opt.scale || 1; this.baseline = opt.baseline || 0.92; this.flip = !!opt.flip;
  this.cur = null; this.frame = 0; this.t = 0; this.fps = 8; this.loop = true; this.speed = 1; this.paused = false;
  this.onFrame = null; this.queue = [];
  var self = this;
  Object.keys(anims).forEach(function (k) { var im = new Image(); im.src = anims[k].src; self.imgs[k] = im; });
  this._raf = function (ts) {
    if (!self.c.isConnected) return;
    if (self.last == null) self.last = ts;
    var dt = Math.min(100, ts - self.last); self.last = ts;
    if (self.cur && !self.paused) {
      self.t += dt * self.speed;
      var step = 1000 / self.fps;
      while (self.t >= step) { self.t -= step; self.advance(); }
    }
    self.draw();
    requestAnimationFrame(self._raf);
  };
  requestAnimationFrame(this._raf);
}
AnimPlayer.prototype.play = function (name, o) {
  o = o || {};
  this.cur = name; this.frame = 0; this.t = 0;
  this.fps = o.fps || FIRE_FPS[name] || 8;
  this.loop = o.loop != null ? o.loop : !!FIRE_LOOP[name];
  this.then = o.then || (this.loop ? null : 'idle');
  this.onEnd = o.onEnd || null;
  if (this.onFrame) this.onFrame(this.cur, this.frame);
};
AnimPlayer.prototype.sequence = function (list) { // [{name, loops}]
  var self = this, i = 0;
  var next = function () {
    if (i >= list.length) { self.play('idle'); return; }
    var it = list[i++], n = it.times || 1;
    var go = function () { self.play(it.name, { loop: false, fps: it.fps, then: null, onEnd: function () { if (--n > 0) go(); else next(); } }); };
    go();
  };
  next();
};
AnimPlayer.prototype.advance = function () {
  var a = this.anims[this.cur]; if (!a) return;
  if (this.frame < a.frames - 1) this.frame++;
  else if (this.loop) this.frame = 0;
  else {
    var cb = this.onEnd, then = this.then; this.onEnd = null;
    if (cb) cb(); else if (then) this.play(then);
    return;
  }
  if (this.onFrame) this.onFrame(this.cur, this.frame);
};
AnimPlayer.prototype.step = function (d) {
  var a = this.anims[this.cur]; if (!a) return;
  this.frame = (this.frame + d + a.frames) % a.frames; this.draw();
  if (this.onFrame) this.onFrame(this.cur, this.frame);
};
AnimPlayer.prototype.draw = function () {
  var ctx = this.ctx, W = this.c.width, H = this.c.height;
  ctx.clearRect(0, 0, W, H);
  var a = this.anims[this.cur], im = this.imgs[this.cur];
  if (!a || !im || !im.complete || !im.naturalWidth) return;
  var s = this.scale * (W / 340), gy = H * this.baseline;
  ctx.save();
  // 自畫一個柔和的地面影子
  ctx.fillStyle = 'rgba(40,20,40,.28)';
  ctx.beginPath(); ctx.ellipse(W / 2, gy, 70 * s, 11 * s, 0, 0, Math.PI * 2); ctx.fill();
  if (this.flip) { ctx.translate(W, 0); ctx.scale(-1, 1); }
  ctx.imageSmoothingEnabled = !(a.pixel || this.pixel); ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(im, this.frame * a.w, 0, a.w, a.h, W / 2 - a.anchorX * s, gy - a.groundY * s, a.w * s, a.h * s);
  ctx.restore();
};
