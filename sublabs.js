/* 子單元的動手實驗（拆細單元時新增的 15 個）。作者：辛巴王
 * 每個實驗都是 (容器, 單元編號) => {...}，用島嶼頁面原本的 labDone、mkCanvas、loopRAF、sorter、rounds、SFX。 */
(function () {
  'use strict';
  var C = { ink: '#3b302a', soft: '#7a6a5a', paper: '#fbf7f0', line: '#d8cdb8', red: '#e0574a', blue: '#4f7fa6',
    green: '#6fae5a', yellow: '#f2c46d', orange: '#e9a23b', sky: '#cfe6f4', dark: '#2f3e52' };
  function css() {
    if (document.getElementById('sublab-css')) return;
    var s = document.createElement('style'); s.id = 'sublab-css';
    s.textContent = '.sl-tab{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}.sl-tab td,.sl-tab th{border-bottom:1px solid var(--line,#d8cdb8);padding:4px 6px;text-align:center}' +
      '.sl-tab th{font-weight:700;color:var(--ink-soft,#7a6a5a)}.sl-key{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12.5px;margin:4px 0 8px}' +
      '.sl-key b{padding:3px 9px;border-radius:99px;background:#fff;border:1.5px solid var(--line,#d8cdb8);font-weight:600}.sl-key i{font-style:normal;color:var(--ink-soft,#7a6a5a)}' +
      '.sl-range{width:100%;max-width:340px}.sl-fig{display:block;width:100%;max-width:420px;margin:4px auto}.lab .lbtn[disabled]{opacity:.45}';
    document.head.appendChild(s);
  }
  function add(el, html) { el.insertAdjacentHTML('beforeend', html); }
  function q(el, sel) { return el.querySelector(sel); }
  function seg(el, id, labels, on, pick) {
    add(el, '<div class="seg" data-sl="' + id + '">' + labels.map(function (t, i) { return '<button data-k="' + i + '" class="' + (i === (on || 0) ? 'on' : '') + '">' + t + '</button>'; }).join('') + '</div>');
    var box = el.querySelector('[data-sl="' + id + '"]');
    box.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { box.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); SFX.tick(); pick(+b.dataset.k); };
    });
    return box;
  }
  function row(el, label, build) { add(el, '<div class="lrow"><span class="small">' + label + '</span></div>'); var r = el.lastElementChild; build(r); return r; }
  function tasks(el) {
    add(el, '<div class="btask"></div>'); var box = el.lastElementChild;
    return function (list) { box.innerHTML = list.map(function (t) { return '<span class="' + (t[0] ? 'ok' : '') + '">' + (t[0] ? '✓ ' : '○ ') + t[1] + '</span>'; }).join(''); };
  }
  function canvas(el, h) { var cv = mkCanvas(el, h); var w = cv.fit(); return { ctx: cv.ctx, w: w, h: cv.h, c: cv.c }; }
  function run(fn) { var stop = loopRAF(fn); var prev = labStop; labStop = function () { stop(); if (prev) prev(); }; }
  function arrow(x, a, b, c, d, col, w, head) {
    x.strokeStyle = col; x.fillStyle = col; x.lineWidth = w || 3; x.lineCap = 'round';
    x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke();
    var ang = Math.atan2(d - b, c - a), hs = head || 10;
    x.beginPath(); x.moveTo(c, d); x.lineTo(c - hs * Math.cos(ang - .45), d - hs * Math.sin(ang - .45)); x.lineTo(c - hs * Math.cos(ang + .45), d - hs * Math.sin(ang + .45)); x.closePath(); x.fill();
  }
  function txt(x, s, a, b, col, font, align) { x.fillStyle = col || C.ink; x.font = font || '13px sans-serif'; x.textAlign = align || 'left'; x.fillText(s, a, b); }
  function rr(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }
  var DIR8 = ['東', '東北', '北', '西北', '西', '西南', '南', '東南'];
  function dirName(dx, dy) { var a = Math.atan2(dy, dx); var k = Math.round(a / (Math.PI / 4)); return DIR8[(k + 8) % 8]; }
  function tap(cv, fn) {
    cv.c.addEventListener('pointerdown', function (ev) { var r = cv.c.getBoundingClientRect(); fn((ev.clientX - r.left) * cv.w / r.width, (ev.clientY - r.top) * cv.h / r.height); });
  }

  var L = {};

  /* ---------- 位移與速度：導航地圖 ---------- */
  L.navmap = function (el, u) {
    css();
    add(el, '<p class="lt">地圖每一格是 <b>10 公尺</b>，你以 <b>2 m/s</b> 的速率步行。從藍色起點出發，<b>點地圖上的路口</b>畫出路線。比一比：<b>路徑長</b>和<b>位移</b>有什麼不同？</p>');
    var cv = canvas(el, 250), X = cv.ctx;
    add(el, '<div class="lrow"><button class="lbtn ghost" data-a="undo">退一步</button><button class="lbtn ghost" data-a="reset">重新出發</button></div><p class="lnote"></p>');
    var note = el.lastElementChild, tk = tasks(el);
    var COLS = 9, ROWS = 5, S = [1, 3], F = [7, 1], path = [S.slice()], got = [false, false, false];
    function geo() { var m = 26, gw = (cv.w - 2 * m) / (COLS - 1), gh = (cv.h - 2 * m - 30) / (ROWS - 1); return { m: m, gw: gw, gh: gh }; }
    function P(p) { var g = geo(); return [g.m + p[0] * g.gw, g.m + p[1] * g.gh]; }
    function stats() {
      var Ls = 0; for (var i = 1; i < path.length; i++) Ls += 10 * Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
      var e = path[path.length - 1], dx = (e[0] - S[0]) * 10, dy = -(e[1] - S[1]) * 10, d = Math.hypot(dx, dy), t = Ls / 2;
      return { L: Ls, d: d, dx: dx, dy: dy, t: t, end: e };
    }
    function check() {
      var s = stats(), atF = s.end[0] === F[0] && s.end[1] === F[1], atS = s.end[0] === S[0] && s.end[1] === S[1];
      if (atF && path.length > 1) got[0] = true;
      if (atF && s.L >= 2 * s.d - 1e-6) got[1] = true;
      if (atS && path.length > 2 && s.L > 0) got[2] = true;
      tk([[got[0], '走到紅旗'], [got[1], '走到紅旗，而且路徑長至少是位移的 2 倍'], [got[2], '繞一圈回到起點（位移是 0）']]);
      if (s.L === 0) note.innerHTML = '點一個路口開始走。';
      else note.innerHTML = '路徑長 <b>' + s.L.toFixed(0) + ' m</b>　位移 <b>' + s.d.toFixed(0) + ' m' + (s.d > 0 ? ' 向' + dirName(s.dx, s.dy) : '') + '</b>　時間 ' + s.t.toFixed(0) + ' s<br>' +
        '平均速率 = ' + s.L.toFixed(0) + ' ÷ ' + s.t.toFixed(0) + ' = <b>2.0 m/s</b>　平均速度 = ' + s.d.toFixed(0) + ' ÷ ' + s.t.toFixed(0) + ' = <b>' + (s.t ? (s.d / s.t).toFixed(2) : '0') + ' m/s</b>';
      if (got[0] && got[1] && got[2]) labDone(u, '你分清楚了路徑長和位移');
    }
    tap(cv, function (x, y) {
      var g = geo(), cx = Math.round((x - g.m) / g.gw), cy = Math.round((y - g.m) / g.gh);
      if (cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
      var last = path[path.length - 1]; if (last[0] === cx && last[1] === cy) return;
      path.push([cx, cy]); SFX.tick(); check();
    });
    el.querySelectorAll('[data-a]').forEach(function (b) { b.onclick = function () { if (b.dataset.a === 'undo') { if (path.length > 1) path.pop(); } else path = [S.slice()]; SFX.tick(); check(); }; });
    check();
    run(function () {
      var g = geo(); X.fillStyle = '#eef3e6'; X.fillRect(0, 0, cv.w, cv.h);
      X.fillStyle = '#d9e6cc'; for (var i = 0; i < COLS - 1; i++) for (var j = 0; j < ROWS - 1; j++) { var p = P([i, j]); rr(X, p[0] + 4, p[1] + 4, g.gw - 8, g.gh - 8, 6); X.fill(); }
      for (i = 0; i < COLS; i++) for (j = 0; j < ROWS; j++) { p = P([i, j]); X.fillStyle = '#b9c7ad'; X.beginPath(); X.arc(p[0], p[1], 3, 0, 7); X.fill(); }
      X.strokeStyle = C.blue; X.lineWidth = 4; X.lineJoin = 'round'; X.beginPath(); path.forEach(function (pt, k) { var p = P(pt); if (k) X.lineTo(p[0], p[1]); else X.moveTo(p[0], p[1]); }); X.stroke();
      var s = P(S), f = P(F), e = P(path[path.length - 1]);
      if (path.length > 1 && (e[0] !== s[0] || e[1] !== s[1])) arrow(X, s[0], s[1], e[0], e[1], C.red, 3, 12);
      X.fillStyle = C.blue; X.beginPath(); X.arc(s[0], s[1], 8, 0, 7); X.fill(); txt(X, '起點', s[0] - 12, s[1] + 22, C.blue, 'bold 12px sans-serif');
      X.strokeStyle = C.ink; X.lineWidth = 2; X.beginPath(); X.moveTo(f[0], f[1]); X.lineTo(f[0], f[1] - 22); X.stroke();
      X.fillStyle = C.red; X.beginPath(); X.moveTo(f[0], f[1] - 22); X.lineTo(f[0] + 16, f[1] - 16); X.lineTo(f[0], f[1] - 10); X.fill();
      X.fillStyle = C.ink; X.beginPath(); X.arc(e[0], e[1], 5, 0, 7); X.fill();
      txt(X, '北 ↑', cv.w - 40, 18, C.soft, 'bold 12px sans-serif');
      X.fillStyle = C.blue; X.fillRect(14, cv.h - 22, 18, 4); txt(X, '路徑', 36, cv.h - 16, C.soft, '12px sans-serif');
      X.fillStyle = C.red; X.fillRect(80, cv.h - 22, 18, 4); txt(X, '位移', 102, cv.h - 16, C.soft, '12px sans-serif');
    });
  };

  /* ---------- 運動圖形：遙控小車畫 x–t、v–t ---------- */
  L.rcgraph = function (el, u) {
    css();
    add(el, '<p class="lt">拖動滑桿控制小車的<b>速度</b>（向右為正），按「開始」後 12 秒內，下方會同時畫出 <b>x–t 圖</b>和 <b>v–t 圖</b>。完成三個任務。</p>');
    var cv = canvas(el, 300), X = cv.ctx;
    add(el, '<div class="lrow"><span class="small">速度</span><input class="sl-range" type="range" min="-3" max="3" step="0.5" value="1"><b class="lstat">+1.0 m/s</b></div>' +
      '<div class="lrow"><button class="lbtn">開始 ▶</button></div><p class="lnote">按開始後，邊開邊調速度。</p>');
    var rg = q(el, 'input'), lab = q(el, '.lstat'), go = el.querySelector('.lrow:last-of-type .lbtn'), note = el.querySelector('.lnote');
    var tk = tasks(el), v = 1, x = 4, t = 0, on = false, rec = [], got = [false, false, false];
    rg.oninput = function () { v = +rg.value; lab.textContent = (v > 0 ? '+' : '') + v.toFixed(1) + ' m/s'; };
    go.onclick = function () { SFX.tick(); x = 4; t = 0; rec = []; on = true; note.textContent = '開始囉！'; };
    function upd() {
      tk([[got[0], '讓 x–t 圖出現一段水平線（停下來至少 1.5 秒）'], [got[1], '讓小車等速前進至少 2 秒（v–t 圖是水平線）'], [got[2], '讓 v–t 圖跑到時間軸下方至少 1.5 秒（往回走）']]);
      if (got[0] && got[1] && got[2]) labDone(u, '你會讀 x–t 圖和 v–t 圖了');
    }
    function judge() {
      var n = rec.length; if (n < 2) return;
      function hold(test, sec) { var s = 0; for (var i = n - 1; i > 0 && test(rec[i]); i--) s += rec[i].t - rec[i - 1].t; return s >= sec; }
      if (!got[0] && hold(function (r) { return Math.abs(r.v) < 1e-9 && r.t > .3; }, 1.5)) { got[0] = true; SFX.good(); note.innerHTML = '<b class="okc">對！</b>位置不變，x–t 圖就是水平線。'; upd(); }
      if (!got[1] && hold(function (r) { return r.v > 0 && r.v === rec[n - 1].v; }, 2)) { got[1] = true; SFX.good(); note.innerHTML = '<b class="okc">對！</b>等速前進：x–t 圖是斜直線，v–t 圖是水平線。'; upd(); }
      if (!got[2] && hold(function (r) { return r.v < 0; }, 1.5)) { got[2] = true; SFX.good(); note.innerHTML = '<b class="okc">對！</b>速度是負的，代表往回走，x–t 圖往下斜。'; upd(); }
    }
    upd();
    run(function (dt) {
      if (on) { t += dt; var vv = v; x += vv * dt; if (x < 0) { x = 0; vv = 0; } if (x > 20) { x = 20; vv = 0; } rec.push({ t: t, x: x, v: vv }); judge(); if (t >= 12) { on = false; note.textContent = note.textContent || '時間到，可以再開一次。'; } }
      var W = cv.w, H = cv.h; X.fillStyle = C.paper; X.fillRect(0, 0, W, H);
      var tx0 = 30, tx1 = W - 20, ty = 46;
      X.fillStyle = '#e8dcc4'; X.fillRect(tx0, ty, tx1 - tx0, 8);
      for (var i = 0; i <= 20; i += 5) { var px = tx0 + (tx1 - tx0) * i / 20; X.fillStyle = C.soft; X.fillRect(px - 1, ty + 8, 2, 6); txt(X, i + ' m', px, ty + 26, C.soft, '11px sans-serif', 'center'); }
      var cx = tx0 + (tx1 - tx0) * x / 20; X.fillStyle = C.yellow; rr(X, cx - 16, ty - 18, 32, 18, 5); X.fill();
      X.fillStyle = C.ink; X.beginPath(); X.arc(cx - 9, ty, 4, 0, 7); X.arc(cx + 9, ty, 4, 0, 7); X.fill();
      if (Math.abs(v) > 0 && on) arrow(X, cx, ty - 26, cx + v * 12, ty - 26, C.red, 2.5, 7);
      var gw = (W - 50) / 2, gy = 104, gh = H - gy - 14;
      function axes(ox, title, ymin, ymax, key) {
        X.strokeStyle = C.line; X.lineWidth = 1; X.strokeRect(ox, gy, gw, gh);
        var y0 = gy + gh * (ymax / (ymax - ymin)); X.strokeStyle = C.ink; X.beginPath(); X.moveTo(ox, y0); X.lineTo(ox + gw, y0); X.stroke();
        txt(X, title, ox + 4, gy - 6, C.ink, 'bold 12px sans-serif'); txt(X, 't', ox + gw - 8, y0 - 4, C.soft, '11px sans-serif');
        X.strokeStyle = key === 'x' ? C.blue : C.red; X.lineWidth = 2.4; X.beginPath();
        rec.forEach(function (r, k) { var px = ox + gw * r.t / 12, py = y0 - (r[key]) / (ymax - ymin) * gh; if (k) X.lineTo(px, py); else X.moveTo(px, py); }); X.stroke();
      }
      axes(20, 'x–t 圖（位置）', 0, 20, 'x'); axes(30 + gw, 'v–t 圖（速度）', -3.5, 3.5, 'v');
    });
  };

  /* ---------- 慣性：硬幣與卡片、公車乘客 ---------- */
  L.coincard = function (el, u) {
    css();
    add(el, '<p class="lt">杯口放一張卡片，卡片上放一枚硬幣。<b>快速彈走</b>卡片和<b>慢慢拉走</b>卡片，硬幣會怎樣？再看看<b>公車上的乘客</b>。</p>');
    var cv = canvas(el, 200), X = cv.ctx;
    add(el, '<div class="lrow"><button class="lbtn" data-a="fast">快速彈卡片</button><button class="lbtn ghost" data-a="slow">慢慢拉卡片</button></div>' +
      '<div class="lrow"><span class="small">公車</span><button class="lbtn ghost" data-b="brake">急煞車</button><button class="lbtn ghost" data-b="start">突然起步</button><button class="lbtn ghost" data-b="turn">向右急轉</button></div><p class="lnote"></p>');
    var note = el.querySelector('.lnote'), tk = tasks(el);
    var st = { mode: 0, cardX: 0, coinX: 0, coinY: 0, vy: 0, phase: 0, t: 0 }, bus = { k: '', t: 0 }, did = { fast: 0, slow: 0, brake: 0, start: 0, turn: 0 };
    function upd() {
      tk([[did.fast, '快速彈走卡片'], [did.slow, '慢慢拉走卡片'], [did.brake && did.start && did.turn, '公車三種狀況都試過（' + (did.brake + did.start + did.turn) + '/3）']]);
      if (did.fast && did.slow && did.brake && did.start && did.turn) labDone(u, '你看到了慣性');
    }
    el.querySelectorAll('[data-a]').forEach(function (b) {
      b.onclick = function () { SFX.tick(); st = { mode: b.dataset.a === 'fast' ? 1 : 2, cardX: 0, coinX: 0, coinY: 0, vy: 0, phase: 1, t: 0 }; };
    });
    var BUS = { brake: ['乘客往前傾', '車子突然停下，乘客的身體仍想保持原來向前的運動。'], start: ['乘客往後仰', '車子突然往前，乘客的身體仍想保持原來的靜止。'], turn: ['乘客往左（外側）倒', '車子向右轉，乘客的身體仍想沿原來的方向直直前進。'] };
    el.querySelectorAll('[data-b]').forEach(function (b) {
      b.onclick = function () { SFX.tick(); bus = { k: b.dataset.b, t: 0 }; did[b.dataset.b] = 1; note.innerHTML = '<b>' + BUS[b.dataset.b][0] + '</b>：' + BUS[b.dataset.b][1]; upd(); };
    });
    upd();
    run(function (dt) {
      var W = cv.w, H = cv.h, cupX = W * .3, top = 110;
      if (st.phase === 1) {
        st.t += dt;
        if (st.mode === 1) { st.cardX += 900 * dt; if (st.cardX > 40) { st.vy += 900 * dt; st.coinY += st.vy * dt; if (st.coinY > 46) { st.coinY = 46; st.phase = 2; did.fast = 1; SFX.good(); note.innerHTML = '<b class="okc">硬幣掉進杯子！</b>卡片被快速彈走，硬幣因為慣性留在原地，然後落下。'; upd(); } } }
        else { st.cardX += 70 * dt; st.coinX = st.cardX; if (st.cardX > 52) { st.vy += 900 * dt; st.coinY += st.vy * dt; if (st.coinY > 70) { st.coinY = 70; st.phase = 2; did.slow = 1; SFX.bad(); note.innerHTML = '<b>硬幣跟著卡片走，掉在杯子外面。</b>慢慢拉時，摩擦力有足夠時間帶著硬幣一起動。'; upd(); } } }
      }
      X.fillStyle = C.paper; X.fillRect(0, 0, W, H); X.fillStyle = '#e8dcc4'; X.fillRect(0, top + 70, W * .6, 8);
      X.fillStyle = '#dff3f7'; X.strokeStyle = C.blue; X.lineWidth = 2; X.beginPath(); X.moveTo(cupX - 34, top); X.lineTo(cupX - 26, top + 70); X.lineTo(cupX + 26, top + 70); X.lineTo(cupX + 34, top); X.closePath(); X.fill(); X.stroke();
      X.fillStyle = C.red; X.fillRect(cupX - 42 + st.cardX, top - 6, 84, 6);
      X.fillStyle = C.yellow; X.strokeStyle = '#b8902e'; X.beginPath(); X.ellipse(cupX + st.coinX, top - 10 + st.coinY, 13, 5, 0, 0, 7); X.fill(); X.stroke();
      var bx = W * .78, by = H / 2; bus.t += dt;
      X.fillStyle = C.yellow; rr(X, bx - 38, by - 70, 76, 140, 14); X.fill(); X.fillStyle = '#9cc7e0'; rr(X, bx - 28, by - 64, 56, 18, 5); X.fill();
      txt(X, '前', bx, by - 76, C.soft, 'bold 12px sans-serif', 'center');
      var k = Math.min(1, bus.t * 4) * (bus.t < 2.2 ? 1 : Math.max(0, 1 - (bus.t - 2.2) * 2)), dx = 0, dy = 0;
      if (bus.k === 'brake') dy = -18 * k; if (bus.k === 'start') dy = 18 * k; if (bus.k === 'turn') dx = -18 * k;
      X.fillStyle = C.blue; X.beginPath(); X.arc(bx, by + 10, 12, 0, 7); X.fill(); X.fillStyle = '#f3d2b5'; X.beginPath(); X.arc(bx + dx, by + 10 + dy, 8, 0, 7); X.fill();
      if (bus.k && k > .3) arrow(X, bx, by + 10, bx + dx * 2.2, by + 10 + dy * 2.2, C.red, 2.5, 8);
      if (bus.k === 'turn') { X.strokeStyle = C.soft; X.lineWidth = 1.5; X.beginPath(); X.arc(bx + 70, by - 70, 50, Math.PI * .6, Math.PI * .95); X.stroke(); }
    });
  };

  /* ---------- 作用力與反作用力：滑板互推 ---------- */
  L.skatepush = function (el, u) {
    css();
    add(el, '<p class="lt">甲、乙兩人站在滑板上<b>互推一下</b>。選兩人的質量再推推看：誰受的力比較大？誰退得比較快？</p>');
    var cv = canvas(el, 170), X = cv.ctx, mA = 60, mB = 60;
    row(el, '甲', function (r) { seg(r, 'ma', ['40 kg', '60 kg', '80 kg'], 1, function (k) { mA = [40, 60, 80][k]; }); });
    row(el, '乙', function (r) { seg(r, 'mb', ['40 kg', '60 kg', '80 kg'], 1, function (k) { mB = [40, 60, 80][k]; }); });
    add(el, '<div class="lrow"><button class="lbtn">互推 ↔</button></div><p class="lnote"></p><table class="sl-tab"><thead><tr><th>甲</th><th>乙</th><th>兩人受力</th><th>甲退後速度</th><th>乙退後速度</th></tr></thead><tbody></tbody></table>');
    var go = el.querySelector('.lrow:last-of-type .lbtn'), note = el.querySelector('.lnote'), tb = el.querySelector('tbody'), tk = tasks(el);
    var s = null, trials = [], same = false, diff = false;
    function upd() { tk([[same, '兩人質量相同時互推一次'], [diff, '兩人質量不同時互推一次']]); if (same && diff) labDone(u, '作用力與反作用力大小相等'); }
    go.onclick = function () {
      SFX.tick(); var F = 120, T = .5, vA = F * T / mA, vB = F * T / mB;
      s = { t: 0, xA: 0, xB: 0, vA: 0, vB: 0, VA: vA, VB: vB, mA: mA, mB: mB };
      trials.unshift([mA, mB, vA, vB]); if (trials.length > 5) trials.pop();
      tb.innerHTML = trials.map(function (r) { return '<tr><td>' + r[0] + ' kg</td><td>' + r[1] + ' kg</td><td>各 120 N</td><td>' + r[2].toFixed(2) + ' m/s</td><td>' + r[3].toFixed(2) + ' m/s</td></tr>'; }).join('');
      if (mA === mB) { same = true; note.innerHTML = '質量相同：兩人受力一樣大（120 N），退後的速度也一樣。'; }
      else { diff = true; note.innerHTML = '<b class="okc">注意看！</b>兩人受力<b>仍然一樣大</b>（作用力與反作用力），但質量小的那個人加速度大，退得比較快。'; }
      upd();
    };
    upd();
    run(function (dt) {
      var W = cv.w, H = cv.h, mid = W / 2, gy = H - 40;
      if (s) { s.t += dt; if (s.t < .5) { s.vA = s.VA * s.t / .5; s.vB = s.VB * s.t / .5; } else { s.vA = Math.max(0, s.vA - .25 * dt); s.vB = Math.max(0, s.vB - .25 * dt); } s.xA += s.vA * dt * 40; s.xB += s.vB * dt * 40; }
      X.fillStyle = C.paper; X.fillRect(0, 0, W, H); X.fillStyle = '#e8dcc4'; X.fillRect(0, gy + 12, W, 6);
      function guy(x, m, col, name) {
        var sc = .75 + (m - 40) / 160; X.fillStyle = '#8a6a4c'; X.fillRect(x - 22, gy, 44, 6); X.fillStyle = C.ink; X.beginPath(); X.arc(x - 14, gy + 9, 4, 0, 7); X.arc(x + 14, gy + 9, 4, 0, 7); X.fill();
        X.fillStyle = col; rr(X, x - 12 * sc, gy - 56 * sc, 24 * sc, 56 * sc, 8 * sc); X.fill(); X.fillStyle = '#f3d2b5'; X.beginPath(); X.arc(x, gy - 64 * sc, 9 * sc, 0, 7); X.fill();
        txt(X, name + ' ' + m + ' kg', x, gy + 30, C.ink, 'bold 12px sans-serif', 'center');
      }
      var xa = mid - 28 - (s ? s.xA : 0), xb = mid + 28 + (s ? s.xB : 0);
      guy(Math.max(24, xa), s ? s.mA : mA, C.blue, '甲'); guy(Math.min(W - 24, xb), s ? s.mB : mB, C.red, '乙');
      if (s && s.t < .9) { arrow(X, mid - 30, gy - 40, mid - 30 - 50, gy - 40, C.ink, 3, 9); arrow(X, mid + 30, gy - 40, mid + 30 + 50, gy - 40, C.ink, 3, 9); txt(X, '120 N', mid - 58, gy - 48, C.ink, 'bold 12px sans-serif', 'center'); txt(X, '120 N', mid + 58, gy - 48, C.ink, 'bold 12px sans-serif', 'center'); }
    });
  };

  /* ---------- 蒸散作用：氣泡蒸散計 ---------- */
  L.potometer = function (el, u) {
    css();
    add(el, '<p class="lt">枝條插在裝滿水的管子裡，植物蒸散失水時會從管子吸水，<b>細管中的氣泡就往左移</b>。一次只改一個條件，比較 10 分鐘內氣泡移動多遠。</p>');
    var cv = canvas(el, 190), X = cv.ctx, cnd = [1, 0, 0, 0];
    var names = [['光照', ['暗', '亮']], ['風扇', ['關', '開']], ['空氣', ['潮濕', '乾燥']], ['塗白膠', ['不塗', '塗在葉背']]];
    names.forEach(function (nm, i) { row(el, nm[0], function (r) { seg(r, 'p' + i, nm[1], cnd[i], function (k) { cnd[i] = k; }); }); });
    add(el, '<div class="lrow"><button class="lbtn">開始 10 分鐘 ▶</button></div><p class="lnote"></p><table class="sl-tab"><thead><tr><th>光照</th><th>風扇</th><th>空氣</th><th>白膠</th><th>氣泡移動</th></tr></thead><tbody></tbody></table>');
    var go = el.querySelector('.lrow:last-of-type .lbtn'), note = el.querySelector('.lnote'), tb = el.querySelector('tbody'), tk = tasks(el);
    var trials = [], cmp = [0, 0, 0, 0], r = null;
    function rate(c) { return .6 * (c[0] ? 2 : 1) * (c[1] ? 1.8 : 1) * (c[2] ? 1.6 : 1) * (c[3] ? .3 : 1); }
    function upd() {
      tk(names.map(function (nm, i) { return [cmp[i], '比較「' + nm[0] + '」的影響（兩次只差這個條件）']; }));
      if (cmp.every(Boolean)) labDone(u, '你找到了影響蒸散作用的因素');
    }
    go.onclick = function () {
      if (r && r.t < 1) return; SFX.tick(); var c = cnd.slice(), d = rate(c) * 10;
      r = { t: 0, c: c, d: d };
      trials.forEach(function (o) { var df = []; for (var i = 0; i < 4; i++) if (o.c[i] !== c[i]) df.push(i); if (df.length === 1) cmp[df[0]] = 1; });
      trials.unshift({ c: c, d: d }); if (trials.length > 8) trials.pop();
      tb.innerHTML = trials.map(function (o) { return '<tr>' + o.c.map(function (v, i) { return '<td>' + names[i][1][v] + '</td>'; }).join('') + '<td><b>' + o.d.toFixed(1) + ' cm</b></td></tr>'; }).join('');
      note.innerHTML = c[3] ? '葉背塗上白膠，大部分氣孔被堵住，蒸散變慢。' : (c[0] && c[1] && c[2] ? '亮、有風、乾燥，蒸散最快！' : '和上一次比一比，哪個條件讓氣泡移動變多或變少？');
      upd();
    };
    upd();
    run(function (dt) {
      var W = cv.w, H = cv.h; if (r && r.t < 1) r.t = Math.min(1, r.t + dt / 2.5);
      var c = r ? r.c : cnd; X.fillStyle = c[0] ? '#fff6dc' : '#e9e6f0'; X.fillRect(0, 0, W, H);
      if (c[0]) { X.fillStyle = '#ffd75e'; X.beginPath(); X.arc(W - 36, 30, 16, 0, 7); X.fill(); }
      var px = W * .42, py = 120;
      X.strokeStyle = '#6f8f4a'; X.lineWidth = 4; X.beginPath(); X.moveTo(px, py); X.lineTo(px, 40); X.stroke();
      [[-1, 70], [1, 58], [-1, 46]].forEach(function (lf) { X.fillStyle = C.green; X.beginPath(); X.ellipse(px + lf[0] * 24, lf[1], 24, 9, lf[0] * .4, 0, 7); X.fill(); if (c[3]) { X.strokeStyle = '#fffaf3'; X.lineWidth = 2; X.stroke(); } });
      X.fillStyle = '#dff3f7'; X.strokeStyle = C.blue; X.lineWidth = 2; X.fillRect(px - 10, py, 20, 40); X.strokeRect(px - 10, py, 20, 40);
      var x0 = 20, x1 = px - 10, ty = py + 34; X.fillStyle = '#dff3f7'; X.fillRect(x0, ty - 4, x1 - x0, 8); X.strokeRect(x0, ty - 4, x1 - x0, 8);
      for (var i = 0; i <= 10; i++) { var tx = x1 - 10 - i * (x1 - x0 - 20) / 10; X.fillStyle = C.soft; X.fillRect(tx, ty + 5, 1, 5); }
      var mv = r ? r.d * r.t : 0, bx = x1 - 10 - Math.min(1, mv / 12) * (x1 - x0 - 20);
      X.fillStyle = '#fff'; X.strokeStyle = C.ink; X.lineWidth = 1.5; X.beginPath(); X.ellipse(bx, ty, 6, 3, 0, 0, 7); X.fill(); X.stroke();
      txt(X, '氣泡移動 ' + mv.toFixed(1) + ' cm', 20, ty + 26, C.ink, 'bold 12px sans-serif');
      if (c[1]) { var fx = W - 60, fy = 110; X.strokeStyle = C.soft; X.lineWidth = 2; X.beginPath(); X.arc(fx, fy, 18, 0, 7); X.stroke(); var a = performance.now() / 80; for (i = 0; i < 4; i++) { X.beginPath(); X.moveTo(fx, fy); X.lineTo(fx + 16 * Math.cos(a + i * 1.57), fy + 16 * Math.sin(a + i * 1.57)); X.stroke(); } for (i = 0; i < 3; i++) arrow(X, fx - 28, fy - 14 + i * 14, fx - 70, fy - 14 + i * 14, '#9cc7e0', 2, 6); }
      txt(X, c[2] ? '空氣乾燥' : '空氣潮濕', W - 90, H - 12, C.soft, '12px sans-serif');
    });
  };

  /* ---------- 神經系統的構造：腦的分工 ---------- */
  L.brainmap = function (el, u) {
    css();
    add(el, '<p class="lt">先看看腦和脊髓的位置，再把每個情境交給<b>負責的部位</b>。</p>' +
      '<svg class="sl-fig" viewBox="0 0 320 170"><path d="M70 95C55 45 110 15 170 22S265 55 255 95C250 118 228 126 205 122L150 122C110 126 78 120 70 95Z" fill="#f4c6b8" stroke="#c07a6a" stroke-width="2"/>' +
      '<path d="M200 122C205 140 228 150 246 140S258 112 240 108" fill="#e8a898" stroke="#c07a6a" stroke-width="2"/><path d="M178 120L182 150L190 150L192 120Z" fill="#d89a8a" stroke="#c07a6a" stroke-width="2"/>' +
      '<rect x="182" y="150" width="9" height="20" fill="#e9b8a8" stroke="#c07a6a" stroke-width="2"/>' +
      '<g font-size="13" font-weight="700" fill="#3b302a"><text x="120" y="70">大腦</text><text x="262" y="128">小腦</text><text x="120" y="146">腦幹</text><text x="146" y="168" font-size="12">脊髓</text></g>' +
      '<path d="M150 142L178 135" stroke="#3b302a" stroke-width="1"/></svg>');
    sorter(el, u, [['背英文單字、記住朋友的名字', 0, '大腦負責思考、記憶與學習。'], ['閉上眼睛單腳站立，保持平衡', 1, '小腦協調動作、維持平衡。'],
      ['睡著時仍然持續呼吸、心跳', 2, '腦幹控制心跳、呼吸等維持生命的活動。'], ['醫生敲膝蓋，小腿自己往前踢', 3, '膝跳反射由脊髓控制。'],
      ['聞到榴槤，覺得香還是臭', 0, '鼻子是受器，感覺在大腦產生。'], ['騎腳踏車時手腳動作協調', 1, '小腦協調肌肉的動作。']],
      ['大腦', '小腦', '腦幹', '脊髓'], '你認識了腦的分工');
  };

  /* ---------- 體溫與水分恆定 ---------- */
  L.homeo = function (el, u) {
    css();
    add(el, '<p class="lt">身體遇到不同狀況時，會怎麼把<b>體溫</b>和<b>水分</b>調回正常範圍？每一題選出身體的反應。</p>' +
      '<svg class="sl-fig" viewBox="0 0 320 120"><g fill="none" stroke="#7a6a5a" stroke-width="2"><circle cx="60" cy="22" r="14"/><path d="M60 36V80M60 48L36 66M60 48L84 66M60 80L44 112M60 80L76 112"/></g>' +
      '<path d="M120 48C110 40 100 52 106 62S128 70 132 60" fill="#b8574a"/><text x="96" y="88" font-size="12" fill="#3b302a">肝臟</text><text x="96" y="103" font-size="11" fill="#7a6a5a">形成尿素</text>' +
      '<path d="M190 40C182 44 182 62 190 66S204 60 200 54 202 36 190 40Z" fill="#c0564a"/><path d="M214 40C222 44 222 62 214 66S200 60 204 54 202 36 214 40Z" fill="#c0564a"/>' +
      '<text x="186" y="88" font-size="12" fill="#3b302a">腎臟</text><text x="180" y="103" font-size="11" fill="#7a6a5a">過濾血液</text><rect x="262" y="12" width="12" height="70" rx="6" fill="#fffaf3" stroke="#7a6a5a"/><circle cx="268" cy="90" r="10" fill="#e0574a"/><rect x="265" y="40" width="6" height="50" fill="#e0574a"/><text x="250" y="112" font-size="12" fill="#3b302a">約 37 ℃</text></svg>');
    rounds(el, u, [
      { q: '大熱天在操場跑步，體溫開始上升。身體會怎麼調節？', o: ['流汗、皮膚血管擴張', '發抖、皮膚血管收縮', '停止呼吸'], a: 0, e: '流汗和皮膚血管擴張幫助散熱，讓體溫回到正常範圍。' },
      { q: '寒流來襲，在戶外站了很久。身體會怎麼調節？', o: ['大量流汗', '皮膚血管收縮、肌肉發抖', '尿量變得很少'], a: 1, e: '血管收縮減少散熱，肌肉發抖產生熱。' },
      { q: '一口氣喝了一大瓶水。腎臟會怎麼調節？', o: ['尿量增加', '尿量減少', '停止過濾血液'], a: 0, e: '多餘的水由腎臟排出，尿量增加。' },
      { q: '打完球流了很多汗。腎臟會怎麼調節？', o: ['尿量增加', '尿量減少', '把汗水吸回來'], a: 1, e: '流汗失去很多水，腎臟減少尿量來保留水分。' },
      { q: '吃了很多肉，蛋白質分解產生含氮廢物。它會先在哪裡變成尿素？', o: ['腎臟', '肝臟', '肺'], a: 1, e: '含氮廢物在肝臟轉變成尿素。' },
      { q: '尿素最後怎麼離開身體？', o: ['由腎臟過濾血液，隨尿液排出', '由肝臟直接排出體外', '隨呼吸呼出'], a: 0, e: '腎臟過濾血液，把尿素和多餘的水形成尿液排出。' }
    ], '你學會了身體怎麼維持恆定');
  };

  /* ---------- 植物的感應：暗箱與含羞草 ---------- */
  L.darkbox = function (el, u) {
    css();
    add(el, '<p class="lt">把幼苗放進<b>只開一個小洞</b>的暗箱，改變小洞的位置，快轉幾天看看莖往哪裡彎。再<b>點一下右邊的含羞草</b>。</p>');
    var cv = canvas(el, 210), X = cv.ctx, hole = 0, bend = 0, target = 0, tried = {}, touched = 0, fold = 0, ft = 0, grow = null;
    row(el, '小洞位置', function (r) { seg(r, 'hole', ['右邊', '左邊', '正上方'], 0, function (k) { hole = k; }); });
    add(el, '<div class="lrow"><button class="lbtn">快轉 3 天 ▶</button></div><p class="lnote"></p>');
    var go = el.querySelector('.lrow:last-of-type .lbtn'), note = el.querySelector('.lnote'), tk = tasks(el);
    function upd() { var n = Object.keys(tried).length; tk([[n >= 2, '換兩種小洞位置，觀察莖彎曲的方向（' + n + '/2）'], [touched, '碰一下含羞草']]); if (n >= 2 && touched) labDone(u, '你分辨了向光性和觸發運動'); }
    go.onclick = function () { SFX.tick(); bend = 0; target = [1, -1, 0][hole]; grow = { t: 0, h: hole }; note.textContent = '快轉中……'; };
    tap(cv, function (x, y) { if (x > cv.w * .66) { touched = 1; ft = 0; fold = 1; SFX.tick(); note.innerHTML = '<b>含羞草的葉子一下子就合起來了！</b>這是觸發運動，反應很快，和碰的方向無關；向光性則要好幾天。'; upd(); } });
    upd();
    run(function (dt) {
      var W = cv.w, H = cv.h, bw = W * .55;
      if (grow && grow.t < 1) { grow.t = Math.min(1, grow.t + dt / 2); bend = target * grow.t; if (grow.t >= 1) { tried[grow.h] = 1; note.innerHTML = ['莖彎向右邊的小洞：<b>向光性</b>。', '莖彎向左邊的小洞：<b>向光性</b>，光源換位置，彎的方向也跟著換。', '光從正上方來，莖就直直往上長。'][grow.h]; SFX.good(); upd(); } }
      X.fillStyle = C.paper; X.fillRect(0, 0, W, H);
      X.fillStyle = '#2f2a33'; X.fillRect(10, 20, bw, H - 40);
      var hx = [10 + bw - 4, 10, 10 + bw / 2 - 16][hole], hy = [70, 70, 20][hole]; X.fillStyle = '#fff3c4';
      if (hole === 2) X.fillRect(hx, hy - 2, 32, 8); else X.fillRect(hx - 2, hy, 8, 30);
      var g = grow ? grow.t : 0, base = [10 + bw / 2, H - 40], len = 50 + 60 * g;
      X.fillStyle = '#8a6a4c'; X.fillRect(base[0] - 22, H - 56, 44, 16);
      X.strokeStyle = C.green; X.lineWidth = 4; X.beginPath(); X.moveTo(base[0], base[1] - 16);
      var tipx = base[0] + bend * len * .7, tipy = base[1] - 16 - len * (1 - Math.abs(bend) * .25);
      X.quadraticCurveTo(base[0], base[1] - 16 - len * .6, tipx, tipy); X.stroke();
      X.fillStyle = C.green; X.beginPath(); X.ellipse(tipx - 8, tipy, 9, 4, -.4, 0, 7); X.ellipse(tipx + 8, tipy, 9, 4, .4, 0, 7); X.fill();
      txt(X, '暗箱', 18, 38, '#cfc6d8', 'bold 12px sans-serif');
      var mx = W * .83, my = H - 30; ft += dt; if (fold && ft > 3) fold = Math.max(0, fold - dt);
      X.strokeStyle = '#6f8f4a'; X.lineWidth = 3; X.beginPath(); X.moveTo(mx, my); X.lineTo(mx, my - 120); X.stroke();
      for (var i = 0; i < 6; i++) { var yy = my - 30 - i * 16; [-1, 1].forEach(function (sd) { var ang = sd > 0 ? (fold ? -1.25 : -.12) : Math.PI + (fold ? 1.25 : .12); X.fillStyle = C.green; X.save(); X.translate(mx, yy); X.rotate(ang); X.beginPath(); X.ellipse(12, 0, 12, 4, 0, 0, 7); X.fill(); X.restore(); }); }
      txt(X, '含羞草（點我）', mx, H - 8, C.soft, '12px sans-serif', 'center');
      X.fillStyle = '#8a6a4c'; X.fillRect(mx - 16, my, 32, 14);
    });
  };

  /* ---------- 植物的分類 ---------- */
  L.planttree = function (el, u) {
    css();
    add(el, '<p class="lt">照著三個問題分類：<b>有沒有維管束？</b> → <b>會不會產生種子？</b> → <b>種子外面有沒有果皮包著（會不會開花結果）？</b></p>' +
      '<div class="sl-key"><b>蘚苔</b><i>沒有維管束</i><b>蕨類</b><i>有維管束、沒有種子</i><b>裸子</b><i>種子裸露</i><b>被子</b><i>開花結果</i></div>');
    sorter(el, u, [['地錢：矮小、長在潮濕的牆角', 0, '沒有維管束，是蘚苔植物。'], ['腎蕨：葉背有一顆顆孢子囊', 1, '有維管束、用孢子繁殖，是蕨類。'],
      ['筆筒樹：高大，但不開花、沒有種子', 1, '筆筒樹是高大的蕨類植物。'], ['松樹：結出毬果', 2, '種子長在毬果的鱗片上，沒有果皮包著。'],
      ['銀杏：會長出白果', 2, '白果是裸露的種子，銀杏是裸子植物。'], ['蘇鐵：種子長在葉片基部', 2, '蘇鐵是裸子植物。'],
      ['玉米：平行葉脈、會開花', 3, '單子葉的被子植物。'], ['向日葵：網狀葉脈、會開花結果', 3, '雙子葉的被子植物。'],
      ['仙人掌：針狀葉，會開花結果', 3, '針狀葉是適應乾燥的構造，它是被子植物。']],
      ['蘚苔植物', '蕨類植物', '裸子植物', '被子植物'], '你會替植物分類了');
  };

  /* ---------- 動物的分類 ---------- */
  L.animaltree = function (el, u) {
    css();
    add(el, '<p class="lt">先看有沒有脊椎，再看<b>怎麼呼吸、皮膚上有什麼、怎麼生寶寶</b>，替每種動物找到牠的類別。</p>' +
      '<div class="sl-key"><b>魚類</b><i>鰓、鱗、鰭</i><b>兩生類</b><i>幼體鰓、成體肺和皮膚</i><b>爬蟲類</b><i>乾燥鱗片、卵有殼</i><b>鳥類</b><i>羽毛</i><b>哺乳類</b><i>毛、哺乳</i><b>節肢動物</b><i>外骨骼、腳分節</i></div>');
    sorter(el, u, [['鯊魚', 0, '用鰓呼吸、有鰭，是魚類。'], ['青蛙', 1, '蝌蚪用鰓、成蛙用肺和皮膚呼吸。'], ['山椒魚', 1, '名字有「魚」，其實是兩生類。'],
      ['海龜', 2, '用肺呼吸、卵有殼，是爬蟲類。'], ['蛇', 2, '皮膚有乾燥的鱗片，是爬蟲類。'], ['企鵝', 3, '不會飛，但有羽毛，是鳥類。'],
      ['蝙蝠', 4, '有毛、哺乳，是哺乳類。'], ['鯨魚', 4, '用肺呼吸、哺乳，是哺乳類。'], ['蝦', 5, '有外骨骼、腳分節，是節肢動物。'], ['蝴蝶', 5, '昆蟲是節肢動物。']],
      ['魚類', '兩生類', '爬蟲類', '鳥類', '哺乳類', '節肢動物'], '你會替動物分類了');
  };

  /* ---------- 地球的分層 ---------- */
  L.earthlayers = function (el, u) {
    css();
    add(el, '<p class="lt">這是剖開的地球。<b>點每一層</b>看看它的深度和狀態，四層都看過以後回答問題。</p>');
    var cv = canvas(el, 230), X = cv.ctx, seen = {}, pick = -1, asked = false;
    var LY = [['地殼', '0～約 35 公里（海洋地殼只有約 7 公里）', '固態，最薄的一層', '#8a6a4c', 1], ['地函', '約 35～2900 公里', '固態岩石，但能非常緩慢地流動；上部最硬的部分和地殼合成岩石圈', '#e07f56', .945],
      ['外核', '約 2900～5150 公里', '液態（主要是鐵和鎳）', '#f29b4b', .545], ['內核', '約 5150～6370 公里', '固態，溫度最高、壓力最大', '#f2c46d', .19]];
    add(el, '<p class="lnote">點地球的任一層。</p>'); var note = el.lastElementChild; var qbox = document.createElement('div'); el.appendChild(qbox);
    function R() { return Math.min(cv.h - 20, cv.w * .55); }
    tap(cv, function (x, y) {
      var cx = 20, cy = cv.h - 10, r = Math.hypot(x - cx, y - cy) / R(); if (r > 1) return;
      var k = 0; for (var i = 0; i < 4; i++) if (r <= LY[i][4]) k = i; pick = k; seen[k] = 1; SFX.tick();
      note.innerHTML = '<b>' + LY[k][0] + '</b>：' + LY[k][1] + '。' + LY[k][2] + '。';
      if (Object.keys(seen).length === 4 && !asked) {
        asked = true;
        rounds(qbox, u, [{ q: '地震波的速度在約 2900 公里深處突然改變，這裡是哪兩層的交界？', o: ['地殼與地函', '地函與地核', '外核與內核'], a: 1, e: '科學家用地震波速度的變化找出分層的界面。' },
          { q: '岩石圈包含哪些部分？', o: ['只有地殼', '地殼和上部地函的堅硬部分', '整個地函'], a: 1, e: '板塊就是岩石圈，不只有地殼。' },
          { q: '地球內部唯一呈液態的是？', o: ['地函', '外核', '內核'], a: 1, e: '外核是液態，地函大部分是固態岩石。' }], '你認識了地球的內部構造');
      }
    });
    run(function () {
      var W = cv.w, H = cv.h, cx = 20, cy = H - 10, Rr = R(); X.fillStyle = '#0f1d33'; X.fillRect(0, 0, W, H);
      LY.forEach(function (l, i) { X.fillStyle = l[3]; X.beginPath(); X.moveTo(cx, cy); X.arc(cx, cy, Rr * l[4], -Math.PI / 2, 0); X.closePath(); X.fill(); if (pick === i) { X.strokeStyle = '#fff'; X.lineWidth = 3; X.beginPath(); X.arc(cx, cy, Rr * l[4] - 2, -Math.PI / 2, 0); X.stroke(); } });
      X.fillStyle = '#4f7fa6'; X.beginPath(); X.arc(cx, cy, Rr + 3, -Math.PI / 2, 0); X.lineTo(cx + Rr, cy); X.arc(cx, cy, Rr, 0, -Math.PI / 2, true); X.closePath(); X.fill();
      LY.forEach(function (l, i) { var rr0 = Rr * (i < 3 ? (l[4] + LY[i + 1][4]) / 2 : l[4] / 2), a = -.6; txt(X, l[0] + (seen[i] ? ' ✓' : ''), cx + rr0 * Math.cos(a) - 14, cy + rr0 * Math.sin(a), i === 0 ? '#fff' : C.ink, 'bold 13px sans-serif'); });
      txt(X, '地表', cx + Rr * .72, cy - Rr * .74, '#cfe6f4', '12px sans-serif');
      var lx = W * .64; txt(X, '由外而內', lx, 30, '#cfe6f4', 'bold 13px sans-serif');
      LY.forEach(function (l, i) { X.fillStyle = l[3]; X.fillRect(lx, 44 + i * 26, 14, 14); txt(X, l[0] + (i === 2 ? '（液態）' : '（固態）'), lx + 20, 56 + i * 26, '#e8eef2', '12px sans-serif'); });
    });
  };

  /* ---------- 張裂型交界：海底擴張 ---------- */
  L.spreading = function (el, u) {
    css();
    add(el, '<p class="lt">中洋脊下方岩漿上湧，形成新的海洋地殼，再往兩側推開。按「播放」看 1000 萬年的變化，再回答問題。</p>');
    var cv = canvas(el, 200), X = cv.ctx, T = 0, play = false, stage = 0;
    add(el, '<div class="lrow"><button class="lbtn">播放 1000 萬年 ▶</button></div><p class="lnote"></p>');
    var go = el.querySelector('.lrow:last-of-type .lbtn'), note = el.querySelector('.lnote'), tk = tasks(el), got = [0, 0, 0];
    function upd() { tk([[got[0], '看完海底擴張'], [got[1], '點出最老的海洋地殼'], [got[2], '點出最年輕的海洋地殼']]); if (got[0] && got[1] && got[2]) labDone(u, '你看懂了海洋地殼的年齡分布'); }
    go.onclick = function () { SFX.tick(); T = 0; play = true; note.textContent = '每年約往兩側各推開 2.5 公分……'; };
    function age(x) { var mid = cv.w / 2, half = cv.w / 2 - 20, d = Math.abs(x - mid) / half; return d <= T ? (T - d) * 10 : null; }
    tap(cv, function (x, y) {
      if (!got[0]) return; var a = age(x); if (a == null || y < 70 || y > 130) return;
      var d = Math.abs(x - cv.w / 2) / (cv.w / 2 - 20);
      note.innerHTML = '這裡的海洋地殼大約 <b>' + Math.max(0, (d * 10)).toFixed(1) + ' 百萬年</b>。';
      if (stage === 1 && d > .8) { got[1] = 1; stage = 2; SFX.good(); note.innerHTML += '<br><b class="okc">對！</b>離中洋脊最遠的最老。接著點出最年輕的海洋地殼。'; }
      else if (stage === 2 && d < .12) { got[2] = 1; stage = 3; SFX.good(); note.innerHTML += '<br><b class="okc">對！</b>中洋脊旁邊剛形成的地殼最年輕，兩側年齡對稱。'; }
      else SFX.tick();
      upd();
    });
    upd();
    run(function (dt) {
      var W = cv.w, H = cv.h, mid = W / 2, half = W / 2 - 20;
      if (play) { T = Math.min(1, T + dt / 6); if (T >= 1) { play = false; got[0] = 1; stage = 1; note.innerHTML = '播放完畢！現在<b>點出最老的海洋地殼</b>。'; upd(); } }
      X.fillStyle = '#cfe6f4'; X.fillRect(0, 0, W, 80); X.fillStyle = '#7fb3d9'; X.fillRect(0, 30, W, 50);
      for (var x = 20; x < W - 20; x += 2) {
        var d = Math.abs(x - mid) / half, a = d <= T ? 1 - d / Math.max(T, .001) : -1;
        var col = a < 0 ? '#8a7a6a' : 'hsl(' + (10 + (1 - a) * 200) + ',55%,' + (48 + a * 6) + '%)';
        X.fillStyle = col; var top = 80 - Math.max(0, 22 * (1 - d * 3)); X.fillRect(x, top, 2, 130 - top);
      }
      X.fillStyle = '#c0503f'; X.beginPath(); X.moveTo(mid - 18, H); X.quadraticCurveTo(mid, 120, mid, 70); X.quadraticCurveTo(mid, 120, mid + 18, H); X.fill();
      X.fillStyle = '#e07f56'; X.fillRect(0, 130, W, H - 130); X.fillStyle = '#c0503f'; X.beginPath(); X.moveTo(mid - 30, H); X.quadraticCurveTo(mid, 140, mid + 30, H); X.fill();
      arrow(X, mid - 30, 150, mid - 90, 150, '#fffaf3', 2.5, 8); arrow(X, mid + 30, 150, mid + 90, 150, '#fffaf3', 2.5, 8);
      txt(X, '中洋脊', mid, 24, C.ink, 'bold 12px sans-serif', 'center'); txt(X, '軟流圈', 12, H - 10, '#fffaf3', '12px sans-serif');
      txt(X, '年齡：', W - 150, H - 10, '#fffaf3', '12px sans-serif');
      for (var i = 0; i < 5; i++) { X.fillStyle = 'hsl(' + (10 + i / 4 * 200) + ',55%,' + (54 - i * 1.5) + '%)'; X.fillRect(W - 110 + i * 14, H - 20, 14, 10); }
      txt(X, '新→老', W - 38, H - 10, '#fffaf3', '11px sans-serif');
    });
  };

  /* ---------- 高低氣壓與風向 ---------- */
  L.hlwind = function (el, u) {
    css();
    add(el, '<p class="lt">在地圖中央放一個<b>高氣壓 H</b> 或<b>低氣壓 L</b>，看看地面的風怎麼吹。點地圖上任一點，會告訴你那裡吹什麼風（風從哪裡吹來）。</p>');
    var cv = canvas(el, 240), X = cv.ctx, kind = 'L', south = false, seen = {}, asked = false;
    row(el, '氣壓', function (r) { seg(r, 'hl', ['低氣壓 L', '高氣壓 H'], 0, function (k) { kind = k ? 'H' : 'L'; mark(); }); });
    row(el, '半球', function (r) { seg(r, 'ns', ['北半球', '南半球'], 0, function (k) { south = !!k; mark(); }); });
    add(el, '<p class="lnote">北半球的風會向右偏。</p>'); var note = el.lastElementChild, tk = tasks(el), qbox = document.createElement('div'); el.appendChild(qbox);
    function wind(px, py, cx, cy, k, s) {
      var dx = px - cx, dy = -(py - cy), r = Math.hypot(dx, dy) || 1, rx = dx / r, ry = dy / r;
      if (k === 'L') { rx = -rx; ry = -ry; }
      var th = (s ? 1 : -1) * 50 * Math.PI / 180, vx = rx * Math.cos(th) - ry * Math.sin(th), vy = rx * Math.sin(th) + ry * Math.cos(th);
      return [vx, vy];
    }
    function nameOf(v) { return dirName(-v[0], -v[1]) + '風'; }
    function mark() { seen[(south ? 'S' : 'N') + kind] = 1; upd(); }
    function upd() {
      var n = Object.keys(seen).length; tk([[seen.NL, '看北半球的低氣壓'], [seen.NH, '看北半球的高氣壓'], [seen.SL || seen.SH, '看南半球（旋轉方向相反）']]);
      if (seen.NL && seen.NH && (seen.SL || seen.SH) && !asked) {
        asked = true;
        var qs = [['北半球有一個低氣壓，中心在甲地的正北方。甲地吹什麼風？', 0, -1, 'L'], ['北半球有一個高氣壓，中心在甲地的正北方。甲地吹什麼風？', 0, -1, 'H'], ['北半球有一個低氣壓，中心在甲地的正東方。甲地吹什麼風？', -1, 0, 'L']];
        rounds(qbox, u, qs.map(function (z) {
          var v = wind(z[1], -z[2], 0, 0, z[3], false), right = nameOf(v), all = ['東北風', '西南風', '西北風', '東南風', '南風', '北風'].filter(function (x) { return x !== right; }), opts = [right, all[0], all[1]];
          if (right === '東北風') opts = [right, '西南風', '西北風']; if (right === '西南風') opts = [right, '東北風', '東南風'];
          var sh = Math.floor(Math.random() * 3), o = opts.slice(sh).concat(opts.slice(0, sh));
          return { q: z[0], o: o, a: o.indexOf(right), e: (z[3] === 'L' ? '北半球低氣壓：空氣逆時針旋入中心。' : '北半球高氣壓：空氣順時針從中心旋出。') + '風向是指風吹來的方向，所以是' + right + '。' };
        }), '你會判斷高低氣壓附近的風向了');
      }
    }
    tap(cv, function (x, y) { var v = wind(x, y, cv.w / 2, cv.h / 2, kind, south); SFX.tick(); note.innerHTML = '這裡的空氣往<b>' + dirName(v[0], v[1]) + '</b>流動，所以吹的是<b>' + nameOf(v) + '</b>（風從' + dirName(-v[0], -v[1]) + '方吹來）。'; });
    mark();
    run(function () {
      var W = cv.w, H = cv.h, cx = W / 2, cy = H / 2, t = performance.now() / 1000; X.fillStyle = '#eaf3f8'; X.fillRect(0, 0, W, H);
      X.strokeStyle = '#b8cfe0'; X.lineWidth = 1.2; for (var r = 30; r < 200; r += 30) { X.beginPath(); X.arc(cx, cy, r, 0, 7); X.stroke(); }
      for (var gx = 24; gx < W; gx += 40) for (var gy = 22; gy < H; gy += 40) {
        if (Math.hypot(gx - cx, gy - cy) < 22) continue; var v = wind(gx, gy, cx, cy, kind, south), ph = ((t * .8 + (gx + gy) / 97) % 1);
        arrow(X, gx - v[0] * 10, gy + v[1] * 10, gx + v[0] * 10, gy - v[1] * 10, kind === 'L' ? '#4f7fa6' : '#e07f56', 2, 6);
        X.fillStyle = 'rgba(255,255,255,.8)'; X.beginPath(); X.arc(gx + v[0] * (ph * 20 - 10), gy - v[1] * (ph * 20 - 10), 1.8, 0, 7); X.fill();
      }
      X.fillStyle = kind === 'L' ? C.blue : C.red; X.beginPath(); X.arc(cx, cy, 18, 0, 7); X.fill(); txt(X, kind, cx, cy + 6, '#fff', 'bold 18px sans-serif', 'center');
      txt(X, '北 ↑', W - 40, 18, C.soft, 'bold 12px sans-serif'); txt(X, south ? '南半球' : '北半球', 10, 18, C.ink, 'bold 13px sans-serif');
      txt(X, kind === 'L' ? (south ? '順時針旋入、中心上升：多雲雨' : '逆時針旋入、中心上升：多雲雨') : (south ? '逆時針旋出、中心下沉：晴朗' : '順時針旋出、中心下沉：晴朗'), 10, H - 10, C.ink, '12px sans-serif');
    });
  };

  /* ---------- 溫度與催化劑：雙氧水分解 ---------- */
  L.peroxide = function (el, u) {
    css();
    add(el, '<p class="lt">在錐形瓶加入同量的<b>雙氧水</b>，用量筒收集 60 秒內產生的氧氣。改變<b>催化劑</b>或<b>水溫</b>，一次只改一個。</p>');
    var cv = canvas(el, 210), X = cv.ctx, cat = 1, tmp = 1;
    row(el, '催化劑', function (r) { seg(r, 'cat', ['不加', '二氧化錳', '胡蘿蔔泥'], 1, function (k) { cat = k; }); });
    row(el, '水溫', function (r) { seg(r, 'tmp', ['冷水', '室溫', '溫水'], 1, function (k) { tmp = k; }); });
    add(el, '<div class="lrow"><button class="lbtn">開始 60 秒 ▶</button><button class="lbtn ghost" data-w hidden>秤二氧化錳</button></div><p class="lnote"></p>');
    var go = el.querySelector('.lrow:last-of-type .lbtn'), wb = el.querySelector('[data-w]'), note = el.querySelector('.lnote'), tk = tasks(el);
    var runs = [], cur = null, got = [0, 0, 0], COL = ['#7a6a5a', '#4f7fa6', '#e07f56', '#6fae5a', '#c06fa0', '#e9a23b'];
    var K = [.004, .09, .05], TM = [.45, 1, 1.9], CN = ['不加', '二氧化錳', '胡蘿蔔泥'], TN = ['冷水', '室溫', '溫水'];
    function upd() { tk([[got[0], '比較「加與不加催化劑」（水溫相同）'], [got[1], '比較「水溫」的影響（催化劑相同）'], [got[2], '反應後秤一秤二氧化錳']]); if (got.every(Boolean)) labDone(u, '你比較了溫度和催化劑'); }
    go.onclick = function () {
      if (cur && cur.t < 60) return; SFX.tick();
      cur = { c: cat, m: tmp, k: K[cat] * TM[tmp], t: 0, col: COL[runs.length % COL.length] };
      runs.forEach(function (o) { if (o.m === cur.m && (o.c === 0) !== (cur.c === 0)) got[0] = 1; if (o.c === cur.c && o.m !== cur.m) got[1] = 1; });
      runs.push(cur); if (runs.length > 6) runs.shift(); wb.hidden = cur.c !== 1; note.textContent = '收集中……'; upd();
    };
    wb.onclick = function () { SFX.good(); got[2] = 1; note.innerHTML = '反應前 <b>1.00 g</b>，反應後 <b>1.00 g</b>：二氧化錳的質量沒變，它是<b>催化劑</b>，可以重複使用。'; upd(); };
    upd();
    run(function (dt) {
      var W = cv.w, H = cv.h; if (cur && cur.t < 60) { cur.t = Math.min(60, cur.t + dt * 20); if (cur.t >= 60) { var v = 100 * (1 - Math.exp(-cur.k * 60)); note.innerHTML = CN[cur.c] + '、' + TN[cur.m] + '：60 秒收集 <b>' + v.toFixed(0) + ' mL</b>。' + (cur.c ? '' : '不加催化劑，雙氧水分解得很慢。') + '（雙氧水的量都一樣，等得夠久，最後都會接近 100 mL。）'; SFX.done(); } }
      X.fillStyle = C.paper; X.fillRect(0, 0, W, H);
      var fx = 50, fy = H - 30, k = cur ? cur.k : 0, bub = cur && cur.t < 60 ? Math.min(14, 2 + k * 160) : 0;
      X.fillStyle = ['#cfe6f4', '#f3f6f8', '#ffe2cc'][cur ? cur.m : tmp]; X.fillRect(fx - 40, fy - 30, 80, 30);
      X.fillStyle = '#dff3f7'; X.strokeStyle = C.blue; X.lineWidth = 2; X.beginPath(); X.moveTo(fx - 8, fy - 90); X.lineTo(fx - 8, fy - 66); X.lineTo(fx - 30, fy - 4); X.lineTo(fx + 30, fy - 4); X.lineTo(fx + 8, fy - 66); X.lineTo(fx + 8, fy - 90); X.fill(); X.stroke();
      if ((cur ? cur.c : cat) === 1) { X.fillStyle = '#3b302a'; X.fillRect(fx - 20, fy - 10, 40, 5); } if ((cur ? cur.c : cat) === 2) { X.fillStyle = '#e9a23b'; X.fillRect(fx - 20, fy - 12, 40, 7); }
      for (var i = 0; i < bub; i++) { var ph = (performance.now() / 700 + i * .37) % 1; X.fillStyle = 'rgba(255,255,255,.9)'; X.strokeStyle = C.blue; X.beginPath(); X.arc(fx - 15 + (i * 7) % 30, fy - 8 - ph * 50, 2.5, 0, 7); X.fill(); X.stroke(); }
      var gx = 110, gw = W - gx - 20, gy = 20, gh = H - 50; X.strokeStyle = C.ink; X.lineWidth = 1.2; X.beginPath(); X.moveTo(gx, gy); X.lineTo(gx, gy + gh); X.lineTo(gx + gw, gy + gh); X.stroke();
      txt(X, '氧氣（mL）', gx + 4, gy + 10, C.soft, '11px sans-serif'); txt(X, '時間 60 秒', gx + gw - 60, gy + gh + 14, C.soft, '11px sans-serif');
      [50, 100].forEach(function (v) { var yy = gy + gh - v / 100 * gh; X.strokeStyle = C.line; X.beginPath(); X.moveTo(gx, yy); X.lineTo(gx + gw, yy); X.stroke(); txt(X, '' + v, gx - 26, yy + 4, C.soft, '11px sans-serif'); });
      runs.forEach(function (o) { X.strokeStyle = o.col; X.lineWidth = 2.4; X.beginPath(); for (var s = 0; s <= o.t; s += 1) { var px = gx + gw * s / 60, py = gy + gh - 100 * (1 - Math.exp(-o.k * s)) / 100 * gh; if (s) X.lineTo(px, py); else X.moveTo(px, py); } X.stroke(); });
      runs.slice(-4).forEach(function (o, j) { X.fillStyle = o.col; X.fillRect(gx + 8, gy + 18 + j * 15, 10, 4); txt(X, CN[o.c] + '・' + TN[o.m], gx + 22, gy + 23 + j * 15, C.ink, '11px sans-serif'); });
    });
  };

  /* ---------- 酵素：唾液、澱粉、碘液與本氏液 ---------- */
  L.iodine = function (el, u) {
    css();
    add(el, '<p class="lt">五支試管都裝了同量的<b>澱粉液</b>。等 20 分鐘後，用<b>碘液</b>檢驗還有沒有澱粉，用<b>本氏液加熱</b>檢驗有沒有產生糖。</p>');
    var cv = canvas(el, 210), X = cv.ctx, phase = 0, test = '', a = 0;
    var T = [['甲', '唾液', '37 ℃'], ['乙', '唾液', '0 ℃ 冰水'], ['丙', '煮沸過的唾液', '37 ℃'], ['丁', '唾液＋鹽酸', '37 ℃'], ['戊', '清水', '37 ℃']];
    var SUGAR = [1, .15, 0, 0, 0];
    add(el, '<div class="lrow"><button class="lbtn" data-a="wait">等 20 分鐘 ⏱</button><button class="lbtn ghost" data-a="i" disabled>滴碘液</button><button class="lbtn ghost" data-a="b" disabled>加本氏液並加熱</button></div><p class="lnote"></p>');
    var note = el.querySelector('.lnote'), tk = tasks(el), did = { i: 0, b: 0 }, qbox = document.createElement('div'), asked = false; el.appendChild(qbox);
    function upd() {
      tk([[phase > 0, '等待 20 分鐘'], [did.i, '用碘液檢驗澱粉'], [did.b, '用本氏液檢驗糖']]);
      if (did.i && did.b && !asked) {
        asked = true;
        rounds(qbox, u, [{ q: '哪一支試管裡的澱粉被分解了？', o: ['甲', '丙', '戊'], a: 0, e: '甲試管碘液不變藍黑、本氏液變紅：澱粉被唾液中的酵素分解成糖。' },
          { q: '丙試管的唾液先煮沸過，澱粉沒有被分解，原因是？', o: ['高溫使酵素變性，失去作用', '溫度太低，酵素作用太慢', '丙試管沒有澱粉'], a: 0, e: '酵素的主要成分是蛋白質，高溫會使它變性。' },
          { q: '戊試管只加清水，它在實驗中的作用是？', o: ['對照組，確認澱粉不會自己分解', '讓反應更快', '提供酵素'], a: 0, e: '對照組和實驗組只差「有沒有唾液」，才能比較。' }], '你做完了酵素的檢驗實驗');
      }
    }
    el.querySelectorAll('[data-a]').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.a; SFX.tick();
        if (k === 'wait') { phase = 1; a = 0; el.querySelectorAll('[data-a="i"],[data-a="b"]').forEach(function (x) { x.disabled = false; }); note.textContent = '20 分鐘過去了，選一種檢驗方法。'; }
        else { test = k; a = 0; did[k] = 1; note.innerHTML = k === 'i' ? '碘液遇到澱粉呈<b>藍黑色</b>。只有甲試管沒有變藍黑：甲的澱粉已被分解。' : '本氏液和糖加熱後，由藍色變成<b>黃、橙或紅色</b>。甲試管變紅，表示產生了糖；乙只稍微變綠。'; }
        upd();
      };
    });
    upd();
    run(function (dt) {
      var W = cv.w, H = cv.h; a = Math.min(1, a + dt * 1.5); X.fillStyle = C.paper; X.fillRect(0, 0, W, H);
      var sp = W / 5.4;
      T.forEach(function (tb, i) {
        var x = sp * (i + .7), top = 30, bh = 110, col;
        if (!test) col = '#f3f0e6';
        else if (test === 'i') col = SUGAR[i] > .9 ? '#d8b45a' : '#2f3e66';
        else col = SUGAR[i] > .9 ? '#d9573a' : (SUGAR[i] > .1 ? '#7fae7a' : '#5c8fd6');
        var base = test === 'b' ? '#5c8fd6' : (test === 'i' ? '#d8b45a' : '#f3f0e6');
        X.fillStyle = '#dff3f7'; X.strokeStyle = C.soft; X.lineWidth = 2; X.beginPath(); X.moveTo(x - 12, top); X.lineTo(x - 12, top + bh - 12); X.arc(x, top + bh - 12, 12, Math.PI, 0, true); X.lineTo(x + 12, top); X.stroke();
        X.globalAlpha = 1; X.fillStyle = test ? mix(base, col, a) : col; X.beginPath(); X.moveTo(x - 10, top + 40); X.lineTo(x - 10, top + bh - 12); X.arc(x, top + bh - 12, 10, Math.PI, 0, true); X.lineTo(x + 10, top + 40); X.fill();
        txt(X, tb[0], x, top - 10, C.ink, 'bold 14px sans-serif', 'center'); txt(X, tb[1], x, top + bh + 18, C.ink, '11px sans-serif', 'center'); txt(X, tb[2], x, top + bh + 33, C.soft, '11px sans-serif', 'center');
      });
    });
    function mix(c1, c2, t) { function p(c) { return [1, 3, 5].map(function (i) { return parseInt(c.substr(i, 2), 16); }); } var A = p(c1), B = p(c2); return 'rgb(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t); }).join(',') + ')'; }
  };

  window.SUBLABS = L;
})();
