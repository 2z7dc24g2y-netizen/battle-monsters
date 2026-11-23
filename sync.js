/* 自然科學島 × 對戰吧！理化獸：學校網站版的登入與存檔同步
 * - 用老師給的「班級代碼、座號、PIN」登入（和對戰吧同一組）
 * - 島上的進度（sciIsles.*）定時上傳到老師的 Google 試算表，換電腦登入就能接著玩
 * - 島上新答對的題目、做完的實驗、蓋到的印章，會換成班上理化獸的經驗（每天有上限）
 * 作者：辛巴王 */
(function () {
  'use strict';
  var API = window.HATCH_API;
  var LOCAL = (!API && window.HATCH_DEMO && typeof window.runApi_ === 'function' && window.DemoStore) || !!window.HATCH_FB;
  var AK = 'sciHatch.auth', OK = 'sciHatch.owner', SK = 'sciHatch.sent';
  var SKIP = /^sciIsles\.(sound|sideMin|season|tod|lastIsle|lastBackup|P\.snd)$/;
  var ISLE = /^sciIsles\.([A-OQ-Z]\.)?v1$/;
  var page = window.SCI_PAGE || 'isle';
  /* 只有被自己網站的頁面嵌進去（例如競技島的面板）才算在框架裡；被別的網站包住時照常運作 */
  var inFrame = false; try { inFrame = window.parent !== window && window.parent.location.host === location.host && !!window.parent.document; } catch (e) { inFrame = false; }

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function auth() { try { var a = JSON.parse(ls(AK) || 'null'); return a && a.code && a.seat && a.pin ? a : null; } catch (e) { return null; } }
  function who(a) { return a ? a.code + '-' + a.seat : ''; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function call(action, payload, keep) {
    if (window.HATCH_FB && window.fbCall) return window.fbCall(action, payload);
    if (LOCAL) return new Promise(function (ok, no) { setTimeout(function () { var r = JSON.parse(window.runApi_(window.DemoStore, action, payload)); if (r.ok) ok(r.data); else no(new Error(r.error)); }, 120); });
    if (!API) return Promise.reject(new Error('還沒設定伺服器網址（config.js）'));
    return fetch(API, { method: 'POST', keepalive: !!keep, headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, payload: payload }) })
      .then(function (r) { return r.text(); })
      .then(function (t) { var r = JSON.parse(t); if (!r.ok) throw new Error(r.error); return r.data; }, function (e) { throw e && e.message && e.message !== 'Failed to fetch' ? e : new Error('連線失敗，請檢查網路。'); });
  }

  /* ---------- 本機存檔 ---------- */
  function keys() { var o = []; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf('sciIsles.') === 0 && !SKIP.test(k)) o.push(k); } } catch (e) {} return o.sort(); }
  function snap() { var d = {}; keys().forEach(function (k) { var v = ls(k); if (v != null) d[k] = v; }); return d; }
  function clearLocal() { keys().forEach(function (k) { ls(k, null); }); ls(SK, null); }
  function J(s) { try { return JSON.parse(s) || {}; } catch (e) { return {}; } }
  function union(a, b) { var o = {}; [b, a].forEach(function (x) { if (x && typeof x === 'object') Object.keys(x).forEach(function (k) { if (x[k] && (!o[k] || typeof x[k] === 'object')) o[k] = x[k]; }); }); return o; }
  function scoreP(p) { return (p.bxp || 0) + (p.mons || []).reduce(function (s, m) { return s + (m.xp || 0) + 20; }, 0) + Object.keys(p.clear || {}).length * 50 + (p.battles || 0); }
  /* 同一個人在兩台裝置都玩過：島的進度取聯集，其他取進度較多的一份 */
  function mergeKey(k, loc, srv) {
    if (loc == null) return srv;
    if (ISLE.test(k)) {
      var a = J(loc), b = J(srv);
      ['answered', 'labs', 'stamps', 'visited'].forEach(function (f) { if (a[f] || b[f]) a[f] = union(a[f], b[f]); });
      if (b.lamp) a.lamp = b.lamp;
      return JSON.stringify(a);
    }
    if (k === 'sciIsles.P.v1') return scoreP(J(srv)) > scoreP(J(loc)) ? srv : loc;
    if (k === 'sciIsles.cap.v1') return Object.keys(J(srv).a || {}).length > Object.keys(J(loc).a || {}).length ? srv : loc;
    return loc;
  }
  /* 學校版只有一套理化獸：把對戰吧的隊伍放進競技島的存檔（領養、注入在學校版關閉） */
  function keepServer(r) {
    if (r && r.team) ls('sciHatch.team', JSON.stringify(r.team));
    if (r && (r.isle || r.cap)) ls('sciHatch.isle', JSON.stringify(r.isle || { today: r.todayXp, cap: r.cap, left: r.left }));
    if (r && r.left != null) { var I = J(ls('sciHatch.isle')); I.left = r.left; ls('sciHatch.isle', JSON.stringify(I)); }
  }
  function mirror() {
    var a = auth(); if (!a || ls(OK) !== who(a)) return;
    var team; try { team = JSON.parse(ls('sciHatch.team') || 'null'); } catch (e) { team = null; }
    if (!Array.isArray(team)) return;
    var need = function (l) { return 30 + l * 15; }, at = function (L) { var s = 0; for (var l = 1; l < L; l++) s += need(l); return s; };
    var P = J(ls('sciIsles.P.v1')), was = JSON.stringify(P.mons || []);
    P.mons = team.map(function (m, i) { var L = Math.max(1, Math.min(30, m.lv | 0)); return { id: i + 1, el: m.el, xp: at(L) + Math.floor((m.frac || 0) * need(L)), born: 0 }; });
    if (JSON.stringify(P.mons) === was) return;
    if (!P.clear) { P.spent = 0; P.bxp = P.bxp || 0; P.clear = {}; P.day = { d: '', n: 0 }; P.wins = 0; P.battles = 0; }
    P.nid = P.mons.length + 1; P.t = Date.now();
    ls('sciIsles.P.v1', JSON.stringify(P));
  }
  /* 從伺服器拿回存檔寫進這台裝置；回傳有沒有改到東西 */
  function pull(a) {
    return call('isleLoad', a).then(function (r) {
      var srv = r.data ? J(r.data) : {}, changed = false, mine = ls(OK) === who(a);
      /* 伺服器上還是拆島前的舊存檔：先拆開搬到新的島 */
      if (window.SPLIT) SPLIT.fixAll(srv);
      if (!mine) { clearLocal(); ls(OK, who(a)); changed = true; }
      Object.keys(srv).forEach(function (k) {
        if (k.indexOf('sciIsles.') !== 0 || SKIP.test(k)) return;
        var loc = ls(k), v = mine ? mergeKey(k, loc, srv[k]) : srv[k];
        if (v !== loc) { ls(k, v); changed = true; }
      });
      keepServer(r); mirror();
      if (r.me) { var x = auth(); if (x) { x.name = r.me.name; x.cls = r.me.clsName; ls(AK, JSON.stringify(x)); } }
      return changed;
    });
  }
  var busy = false;
  function push(keep) {
    var a = auth(); if (!a || busy || ls(OK) !== who(a)) return Promise.resolve(null);
    var data = JSON.stringify(snap());
    if (data === ls(SK) || data === '{}') return Promise.resolve(null);
    busy = true;
    return call('isleSave', { code: a.code, seat: a.seat, pin: a.pin, data: data }, keep && data.length < 60000).then(function (r) {
      ls(SK, data); busy = false; keepServer(r); mirror();
      if (r && (r.xp > 0 || r.hatch > 0)) gain(r);
      if (r && r.mission && r.mission.finished) misDone(r.mission);
      return r;
    }, function (e) { busy = false; return null; });
  }

  /* ---------- 小提示 ---------- */
  var CSS = '.shx{position:fixed;z-index:9000;font:600 14px/1.4 system-ui,-apple-system,"PingFang TC","Microsoft JhengHei",sans-serif;color:#3b302a}' +
    '.shx-chip{top:calc(10px + env(safe-area-inset-top,0px));right:10px;display:flex;align-items:center;gap:6px;background:rgba(255,250,243,.95);border-radius:999px;padding:5px 6px 5px 12px;box-shadow:0 4px 14px rgba(59,48,42,.18)}' +
    '.shx-chip.hb{top:auto;right:auto;left:10px;bottom:calc(10px + env(safe-area-inset-bottom,0px));padding:5px}.shx-chip.hb .nm{display:none}.shx-chip b{font-weight:800}.shx-chip button,.shx-chip a{all:unset;cursor:pointer;padding:6px 11px;border-radius:999px;font-weight:800;font-size:13px}' +
    '.shx-chip .h{background:#3f9a55;color:#fff}.shx-chip .o{background:#efe6d8}.shx-chip button:focus-visible,.shx-chip a:focus-visible{outline:3px solid #47a3f0}' +
    '.shx-toast{left:50%;bottom:calc(84px + env(safe-area-inset-bottom,0px));transform:translateX(-50%);background:#3b302a;color:#fff;border-radius:14px;padding:10px 16px;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:min(92vw,420px);text-align:center;transition:opacity .4s}' +
    '.shx-back{inset:0;background:rgba(30,24,20,.55);display:grid;place-items:center;padding:16px}' +
    '.shx-box{background:#fffaf3;border-radius:22px;padding:22px 20px;width:min(100%,360px);box-shadow:0 20px 50px rgba(0,0,0,.3);display:flex;flex-direction:column;gap:12px}' +
    '.shx-box h2{margin:0;font-size:22px}.shx-box p{margin:0;color:#7a6c62;font-weight:500;font-size:13.5px}' +
    '.shx-box label{display:flex;flex-direction:column;gap:4px;font-size:13px}.shx-box input{font:700 18px system-ui;padding:10px 12px;border-radius:12px;border:2px solid #e3d6c3;background:#fff;color:#3b302a;width:100%;box-sizing:border-box}' +
    '.shx-box input:focus{outline:none;border-color:#e08a2e}.shx-row{display:flex;gap:10px}.shx-row label{flex:1}' +
    '.shx-go{all:unset;cursor:pointer;text-align:center;background:#e08a2e;color:#fff;font-weight:800;font-size:17px;padding:12px;border-radius:14px}.shx-go[disabled]{opacity:.6}' +
    '.shx-err{color:#c0392b;font-size:13.5px;min-height:1.2em}@media (max-width:520px){.shx-chip .nm{display:none}.shx-chip:not(.hb){top:auto;bottom:calc(12px + env(safe-area-inset-bottom,0px))}}';
  function style() { if (document.getElementById('shx-css')) return; var s = document.createElement('style'); s.id = 'shx-css'; s.textContent = CSS; document.head.appendChild(s); }
  function toast(html, ms) {
    style(); var t = document.createElement('div'); t.className = 'shx shx-toast'; t.innerHTML = html; document.body.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 450); }, ms || 3200);
  }
  function gain(r) {
    var bits = [];
    if (r.xp > 0) bits.push('經驗 +' + r.xp);
    if (r.hatch > 0) bits.push('蛋孵化 +' + r.hatch + '%');
    toast('科學島練功：理化獸' + bits.join('、') + (r.levelUps ? '，升級了！' : '') + (r.left > 0 ? '<br><small>今天已換滿 ' + r.cap + ' 經驗，剩下的明天再領</small>' : ''), 4200);
  }

  /* 課堂任務（參觀科學島）完成 */
  function misDone(g) {
    var w = g.reward || {}, txt = w.kind === 'hatch' ? '蛋孵化 +' + w.amount + '%' : '經驗 +' + w.amount;
    setTimeout(function () { toast('<b>課堂任務完成！</b>理化獸獲得 ' + txt + '<br><small>回到對戰吧的研究室就能看到</small>', 5200); }, 1500);
  }

  /* 科學島上的小名牌：回到對戰吧（學生從對戰吧登入、登出） */
  function chip() {
    style(); var a = auth(); if (!a) return;
    var c = document.getElementById('shx-chip') || document.createElement('div');
    c.className = 'shx shx-chip'; c.id = 'shx-chip';
    c.innerHTML = '<span class="nm"><b>' + esc(a.seat) + ' 號</b>' + (a.name ? ' ' + esc(a.name) : '') + '</span><a href="index.html" class="h">回我的理化獸</a>';
    document.body.appendChild(c);
  }

  /* ---------- 對外 ---------- */
  function setAuth(x, name) {
    var old = auth(), prev = old && who(old) !== who(x) ? push() : Promise.resolve();
    return prev.then(function () { return call('isleLoad', x); }).then(function () {
      if (name) x.name = name;
      ls(AK, JSON.stringify(x)); return pull(x);
    });
  }
  function logout() {
    return push().then(function () { clearLocal(); ls(OK, null); ls(AK, null); }, function () { clearLocal(); ls(OK, null); ls(AK, null); });
  }
  if ((API || LOCAL) && !inFrame) mirror();
  window.SciSync = { mirror: mirror, auth: auth, setAuth: setAuth, logout: logout, push: push, pull: pull };

  if ((!API && !LOCAL) || inFrame) return;
  function boot() {
    if (page === 'hatch') return;
    var a = auth();
    /* 沒登入就回對戰吧登入 */
    if (!a) { location.replace('index.html'); return; }
    if (page === 'map') {
      chip();
      /* 每次回到航海圖就把別台裝置的進度拉回來；有變動就重新整理一次 */
      pull(a).then(function (changed) {
        if (changed && !sessionStorage.getItem('shx-r')) { sessionStorage.setItem('shx-r', '1'); location.reload(); return; }
        sessionStorage.removeItem('shx-r'); push();
      }).catch(function (e) { if (/PIN|班級|沒有/.test(e.message)) { ls(AK, null); location.replace('index.html'); } });
    } else push();
  }
  /* 課堂監控：每分鐘回報在哪一座島、哪個單元，有沒有在操作（老師看板亮綠、黃、灰燈） */
  var lastAct = Date.now();
  ['pointerdown', 'keydown', 'wheel', 'touchstart'].forEach(function (ev) { document.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true, capture: true }); });
  function whereIsle() {
    if (page === 'map') return '科學島航海圖';
    var w = (document.title || '自然科學島').trim();
    try { /* 島上頁面的全域變數：目前打開的單元 */
      if (typeof current !== 'undefined' && current >= 0 && typeof UNITS !== 'undefined' && UNITS[current]) w += ' ' + (current < 9 ? '0' : '') + (current + 1) + ' ' + (UNITS[current].short || '');
    } catch (e) {}
    return w.slice(0, 40);
  }
  function beat() { var a = auth(); if (!a || page === 'hatch') return; call('ping', { code: a.code, seat: a.seat, pin: a.pin, where: whereIsle(), act: Date.now() - lastAct, vis: !document.hidden }).then(function (r) { if (r && r.misGain) misDone(r.misGain); }).catch(function () {}); }
  setTimeout(beat, 3000); setInterval(beat, 60000);
  document.addEventListener('visibilitychange', beat);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  setInterval(function () { push(); }, 60000);
  document.addEventListener('visibilitychange', function () { if (document.hidden) push(true); });
  window.addEventListener('pagehide', function () { push(true); });
})();
