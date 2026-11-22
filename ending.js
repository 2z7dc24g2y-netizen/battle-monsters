/* 全破 30 關的破關動畫（約 10 秒，程式即時繪製，不用影片檔）。作者：辛巴王
 * Ending.play({mons:{fire:圖,...}, bg:可選的電繪背景圖}) → Promise，播完或點一下跳過就結束 */
(function () {
  'use strict';
  var ORDER = [['fire', '#ff7a3d', '烈焰風暴'], ['water', '#47a3f0', '潮汐衝擊'], ['wood', '#5fbf5a', '光合作用'], ['earth', '#c79a6a', '岩盾壁壘'], ['elec', '#f2c522', '連鎖閃電']];
  var CSS = '.endg{position:fixed;inset:0;z-index:60;overflow:hidden;background:#050b1a;color:#fff;font-family:var(--f-display,system-ui);cursor:pointer;animation:enIn .6s both}' +
    '.endg .sky{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 120%,#1d3b66 0%,#0b1630 45%,#050b1a 100%)}' +
    '.endg .bgart{position:absolute;inset:0;background-size:cover;background-position:center;opacity:0;animation:enBg 10s 0s both}' +
    '.endg .stars{position:absolute;inset:0;background-image:radial-gradient(1.5px 1.5px at 12% 18%,#fff,transparent),radial-gradient(1px 1px at 28% 40%,#fff,transparent),radial-gradient(1.5px 1.5px at 66% 14%,#fff,transparent),radial-gradient(1px 1px at 82% 34%,#fff,transparent),radial-gradient(1px 1px at 46% 26%,#fff,transparent),radial-gradient(1.5px 1.5px at 90% 12%,#fff,transparent),radial-gradient(1px 1px at 6% 52%,#fff,transparent);opacity:.7}' +
    '.endg .arena{position:absolute;left:50%;bottom:-38vh;width:150vw;height:60vh;transform:translateX(-50%);border-radius:50%;background:radial-gradient(ellipse at 50% 30%,#3a2c4d,#1a1228 70%);box-shadow:0 -6px 40px rgba(242,193,78,.35),inset 0 8px 0 rgba(242,193,78,.6)}' +
    '.endg .lights{position:absolute;left:0;right:0;bottom:21vh;display:flex;justify-content:space-around}.endg .lights i{width:10px;height:10px;border-radius:50%;background:#ffe9a8;box-shadow:0 0 14px #ffd166;opacity:0;animation:enLamp .3s both}' +
    '.endg .mon{position:absolute;bottom:14vh;width:min(19vw,190px);transform:translateX(-50%);opacity:0}' +
    '.endg .mon img{width:100%;display:block;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5))}' +
    '.endg .mon.in{animation:enJump .7s cubic-bezier(.2,1.4,.4,1) both}' +
    '.endg .beam{position:absolute;bottom:22vh;width:min(5vw,46px);height:0;transform:translateX(-50%);border-radius:30px;mix-blend-mode:screen;filter:blur(2px);opacity:.9}' +
    '.endg .beam.go{animation:enBeam 1.2s ease-out both}' +
    '.endg .tag{position:absolute;bottom:6vh;transform:translateX(-50%);background:rgba(10,6,20,.65)!important;border:0!important;border-radius:999px;padding:3px 12px;font-weight:700;font-size:clamp(11px,1.5vw,16px);white-space:nowrap;opacity:0;text-shadow:0 2px 6px #000}.endg .tag.in{animation:enIn .4s both}' +
    '.endg .title{position:absolute;left:0;right:0;top:9vh;text-align:center;opacity:0}' +
    '.endg .title b{display:block;font-size:clamp(40px,8vw,96px);letter-spacing:.08em;background:linear-gradient(180deg,#fff6d0,#f2c14e 60%,#c98a1d);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 14px rgba(242,193,78,.5))}' +
    '.endg .title span{display:block;margin-top:8px;font-size:clamp(15px,2.2vw,24px);opacity:.9}.endg .title.in{animation:enTitle 1s cubic-bezier(.2,1.2,.4,1) both}' +
    '.endg .skip{position:absolute;right:16px;bottom:12px;font:12px system-ui;opacity:.6}.endg .credit{position:absolute;left:16px;bottom:12px;font:12px system-ui;opacity:.6}' +
    '.endg.out{animation:enOut .6s both}' +
    '@keyframes enIn{from{opacity:0}to{opacity:1}}@keyframes enOut{to{opacity:0}}@keyframes enLamp{to{opacity:1}}@keyframes enBg{0%,40%{opacity:0}70%,100%{opacity:.55}}' +
    '@keyframes enJump{0%{opacity:0;transform:translate(-50%,40vh) scale(.6)}70%{opacity:1;transform:translate(-50%,-4vh) scale(1.08)}100%{opacity:1;transform:translate(-50%,0) scale(1)}}' +
    '@keyframes enBeam{0%{height:0;opacity:1}60%{height:80vh;opacity:1}100%{height:80vh;opacity:0}}' +
    '@keyframes enTitle{from{opacity:0;transform:scale(1.6);filter:blur(8px)}to{opacity:1;transform:none;filter:none}}' +
    '@media (prefers-reduced-motion:reduce){.endg *{animation-duration:.01s!important}}';
  function play(o) {
    o = o || {};
    if (!document.getElementById('endgCss')) { var st = document.createElement('style'); st.id = 'endgCss'; st.textContent = CSS; document.head.appendChild(st); }
    var d = document.createElement('div'), xs = [18, 34, 50, 66, 82];
    d.className = 'endg'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', '全破動畫');
    d.innerHTML = '<div class="sky"></div>' + (o.bg ? '<div class="bgart" style="background-image:url(' + o.bg + ')"></div>' : '') + '<div class="stars"></div><div class="arena"></div><div class="lights">' + new Array(12).join('<i></i>') + '</div>' +
      ORDER.map(function (e, i) { return '<div class="beam" style="left:' + xs[i] + '%;background:linear-gradient(0deg,' + e[1] + ',rgba(255,255,255,.9) 70%,transparent)"></div>' +
        '<div class="mon" style="left:' + xs[i] + '%">' + (o.mons && o.mons[e[0]] ? '<img src="' + o.mons[e[0]] + '" alt="">' : '') + '</div><div class="tag" style="left:' + xs[i] + '%;color:' + e[1] + '">' + e[2] + '</div>'; }).join('') +
      '<div class="title"><b>全破 30 關</b><span>' + (o.sub || '理化獸競技場冠軍誕生！') + '</span></div><div class="credit">對戰吧！理化獸・作者：辛巴王</div><div class="skip">點一下跳過</div>';
    document.body.appendChild(d);
    var T = [], done = false, res;
    var p = new Promise(function (r) { res = r; });
    function at(ms, f) { T.push(setTimeout(f, ms)); }
    function end() { if (done) return; done = true; T.forEach(clearTimeout); d.classList.add('out'); setTimeout(function () { d.remove(); res(); }, 600); }
    d.addEventListener('click', end);
    /* 0～2 秒：競技場燈一盞一盞亮起 */
    d.querySelectorAll('.lights i').forEach(function (l, i) { l.style.animationDelay = (.2 + i * .12) + 's'; });
    /* 2～5 秒：五系依序登場 */
    var mons = d.querySelectorAll('.mon'), tags = d.querySelectorAll('.tag'), beams = d.querySelectorAll('.beam');
    ORDER.forEach(function (e, i) { at(1800 + i * 550, function () { mons[i].classList.add('in'); tags[i].classList.add('in'); if (o.onStep) o.onStep('mon', i); }); });
    /* 5～6.5 秒：五道光柱往天空 */
    ORDER.forEach(function (e, i) { at(5000 + i * 120, function () { beams[i].classList.add('go'); }); });
    /* 6 秒起：光柱在天空炸成煙火（hanabi.js），標題出現 */
    at(6000, function () {
      if (window.Hanabi) {
        Hanabi.start(d, { duration: 30, density: .85, auto: false, sound: o.sound !== false });
        [['kiku', .5, .18, '#FFD166', 1.5], ['botan', .2, .25, '#FF7043'], ['botan', .8, .25, '#64DDFF'], ['kamuro', .35, .14, '#FFD166', 1.3], ['kamuro', .65, .14, '#FFD166', 1.3], ['senrin', .5, .3], ['henka', .12, .2], ['henka', .88, .2], ['kiku', .5, .12, '#FF4F81', 1.6]]
          .forEach(function (s, i) { at(i * 420, function () { Hanabi.burst(s[0], s[1], s[2], { color: s[3], scale: s[4] || 1.1, rise: i > 0 }); }); });
      }
    });
    at(7600, function () { d.querySelector('.title').classList.add('in'); if (o.onStep) o.onStep('title'); });
    /* 10 秒之後停在最後畫面，點一下才離開（最多再等 20 秒） */
    at(30000, end);
    p.then(function () { if (window.Hanabi) Hanabi.stop(); });
    return p;
  }
  window.Ending = { play: play };
})();
