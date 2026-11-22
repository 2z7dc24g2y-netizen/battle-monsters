/* 戰鬥天氣：每場隨機一種，影響屬性攻擊力（只有 15%，不會壓過答題和屬性相剋）。作者：辛巴王
 * BWX.roll() 抽一種天氣；BWX.apply(unit, id) 開戰前套用；BWX.chip(id) 說明小標；BWX.scene(stageEl, id) 在戰場上加天氣畫面 */
(function () {
  'use strict';
  var LIST = [
    { id: 'rain', name: '大雨', buf: { water: 15 }, why: '水氣充足', eff: '水系攻擊 +15%', c: '#47a3f0' },
    { id: 'heat', name: '酷熱', buf: { fire: 15 }, why: '高溫讓燃燒更旺', eff: '火系攻擊 +15%', c: '#ff7a3d' },
    { id: 'drought', name: '乾旱', buf: { earth: 15 }, why: '地面乾硬', eff: '土系攻擊 +15%', c: '#c79a6a' },
    { id: 'storm', name: '雷雨', buf: { elec: 15, water: 5 }, why: '積雨雲裡電荷分離', eff: '電系攻擊 +15%、水系 +5%', c: '#f2c522' },
    { id: 'breeze', name: '春風', buf: { wood: 15 }, why: '溫暖濕潤，適合光合作用', eff: '木系攻擊 +15%', c: '#5fbf5a' },
    { id: 'clear', name: '晴朗', buf: {}, why: '好天氣', eff: '公平對決，沒有加成', c: '#f2b63c' },
    { id: 'aurora', name: '極光夜', buf: {}, gauge: 1, why: '太陽風帶來帶電粒子', eff: '全體開場集氣 +1', c: '#8a5cff' }
  ];
  var BY = {}; LIST.forEach(function (w) { BY[w.id] = w; });
  function get(id) { return BY[id] || BY.clear; }
  function roll() { return LIST[Math.floor(Math.random() * LIST.length)].id; }
  function apply(u, id) {
    var w = get(id), b = w.buf[u.el] || 0;
    if (b) u.atk = Math.round(u.atk * (1 + b / 100));
    if (w.gauge) u.gauge = Math.min(3, (u.gauge || 0) + w.gauge);
    return b;
  }
  function chip(id) {
    var w = get(id);
    return '<span class="wxchip" style="--wc:' + w.c + '"><i></i>天氣：' + w.name + '・' + w.eff + '</span>';
  }
  function line(id) { var w = get(id); return w.name + '：' + w.why + '，' + w.eff; }

  var CSS = '.wxchip{display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:999px;font-weight:700;font-size:13px;background:rgba(255,255,255,.1);border:1.5px solid var(--wc);color:inherit}' +
    '.wxchip i{width:9px;height:9px;border-radius:50%;background:var(--wc);box-shadow:0 0 8px var(--wc)}' +
    '.wxl{position:absolute;inset:0;pointer-events:none;z-index:1;overflow:hidden}' +
    '.wxl.rain,.wxl.storm{background:repeating-linear-gradient(105deg,transparent 0 14px,rgba(170,210,255,.28) 14px 15px,transparent 15px 34px);background-size:120px 120px;animation:wxRain .45s linear infinite}' +
    '.wxl.storm{background-color:rgba(20,16,50,.22)}.wxl.storm::after{content:"";position:absolute;inset:0;background:#fff;opacity:0;animation:wxFlash 7s infinite}' +
    '.wxl.heat{background:linear-gradient(0deg,rgba(255,110,40,.28),rgba(255,180,60,.08) 45%,transparent 70%);animation:wxHeat 2.4s ease-in-out infinite alternate}' +
    '.wxl.drought{background:linear-gradient(0deg,rgba(199,154,106,.32),rgba(230,200,150,.1) 50%,transparent);filter:saturate(.8)}' +
    '.wxl.breeze span{position:absolute;top:-20px;width:10px;height:7px;border-radius:7px 0;background:#ffc3dc;opacity:.8;animation:wxPetal linear infinite}' +
    '.wxl.clear{background:radial-gradient(circle at 85% 8%,rgba(255,230,150,.35),transparent 40%)}' +
    '.wxl.aurora{background:linear-gradient(180deg,rgba(47,227,154,.45),rgba(138,92,255,.3) 30%,transparent 60%);background-size:100% 200%;animation:wxAur 6s ease-in-out infinite alternate}' +
    '@keyframes wxRain{to{background-position:-40px 120px}}@keyframes wxFlash{0%,90%,94%,100%{opacity:0}91%,93%{opacity:.35}}' +
    '@keyframes wxHeat{to{opacity:.6}}@keyframes wxAur{to{background-position:0 40%;filter:hue-rotate(40deg)}}' +
    '@keyframes wxPetal{to{transform:translate(-160px,110vh) rotate(540deg)}}' +
    '@media (prefers-reduced-motion:reduce){.wxl,.wxl *{animation:none!important}}';
  var styled = false;
  function style() { if (styled) return; styled = true; var s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); }
  function scene(st, id) {
    style();
    if (!st) return;
    var old = st.querySelector('.wxl'); if (old) old.remove();
    var d = document.createElement('div'); d.className = 'wxl ' + get(id).id;
    if (id === 'breeze') for (var i = 0; i < 14; i++) {
      var p = document.createElement('span');
      p.style.left = (Math.random() * 110) + '%'; p.style.animationDuration = (5 + Math.random() * 5) + 's'; p.style.animationDelay = (-Math.random() * 8) + 's';
      d.appendChild(p);
    }
    st.insertBefore(d, st.firstChild);
  }
  style.css = CSS;
  try { if (document.head) style(); } catch (e) {}
  window.BWX = { LIST: LIST, get: get, roll: roll, apply: apply, chip: chip, line: line, scene: scene, style: style };
})();
