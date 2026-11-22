/* 學校版的競技島：理化獸來自「對戰吧！理化獸」，島上不能領養、注入或送走
 * 島上答題、做實驗、蓋印章、對戰贏到的經驗，回到對戰吧時加給夥伴（每天有上限） */
(function () {
  'use strict';
  if (!window.HATCH_API && !window.HATCH_DEMO) return;
  function J(k) { try { return JSON.parse(localStorage.getItem(k) || 'null') || {}; } catch (e) { return {}; } }
  function e2(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function goHatch() { try { if (parent !== window) { parent.postMessage({ t: 'phub-nav', u: 'index.html' }, '*'); return; } } catch (e) {} location.href = 'index.html'; }
  window.SCHOOL_GO_HATCH = goHatch;

  /* 島上的「經驗能量」不能注入，戰鬥建議也不再提注入、聊天與每日任務 */
  if (typeof xpSources === 'function') {
    var xs = xpSources;
    window.xpSources = xpSources = function (p) { var X = xs(p); X.pool = 0; return X; };
  }
  if (typeof XP_RULE === 'object') { XP_RULE.stamp = 20; XP_RULE.capFirst = 5; }
  if (typeof earnTips === 'function') {
    var et = earnTips;
    window.earnTips = earnTips = function (p, st) {
      return et(p, st).filter(function (t) { return ['pool', 'chat', 'daily'].indexOf(t.k) < 0; }).map(function (t) {
        if (t.k === 'lv') t.d = t.d.replace(/建議練到.*$/, '回對戰吧做歷屆會考題訓練、在島上練功，夥伴升級後再來');
        if (t.k === 'battle') t.t = t.t.replace('每場', '贏了');
        return t;
      });
    };
  }

  function rate() {
    var I = J('sciHatch.isle'), today = I.today || 0, cap = I.cap || 100;
    return '<div class="howto" style="line-height:1.7"><b>經驗怎麼來？</b><br>在各島新答對一題 +5、完成一個實驗 +10、蓋到一枚印章 +20，競技場和島上挑戰者對戰贏到的經驗也算。' +
      '回到對戰吧時，這些經驗會加給你的<b>夥伴</b>（有蛋的話蛋也會一起孵化）。<br>每天最多 ' + cap + '，今天已經換了 <b class="num">' + today + '</b>' + (I.left > 0 ? '，還有 ' + I.left + ' 留到明天' : '') + '。</div>';
  }
  var BTN = '<div style="margin-top:12px"><button class="btn gold" id="schoolHatch" type="button">回對戰吧！理化獸</button></div>';
  function bind() { var b = document.getElementById('schoolHatch'); if (b) b.onclick = goHatch; }

  /* P-hub 的程式包在函式裡，打包時會在它啟動前呼叫這兩個函式取代培育中心與能量站 */
  window.SCHOOL_P = {
    nursery: function (P, img) {
      var h = '<div class="howto" style="line-height:1.7"><b>你的理化獸住在「對戰吧！理化獸」。</b><br>這裡的隊伍就是你在對戰吧的理化獸，等級也一樣。要孵蛋、換夥伴、看完整資料，請回對戰吧。</div>';
      if (!P.mons.length) h += '<div class="howto">你的蛋還沒孵化。回對戰吧做訓練、在島上練功，蛋孵化後就能來競技場對戰。</div>';
      else h += '<div class="schoolTeam">' + P.mons.map(function (m) {
        var lv = lvOf(m.xp), e = EL[m.el];
        return '<div class="st"><img src="' + img(m.el, lv) + '" alt=""><b>' + e2(e.stages[stageOf(lv) - 1]) + '</b><span class="num">Lv' + lv + '</span><small>' + e.name + '系・' + e2(e.role) + '・站' + ROW_NAME[e.row] + '</small></div>';
      }).join('') + '</div>';
      document.getElementById('nurseryBody').innerHTML = CSS + h + rate() + BTN; bind();
    },
    energy: function () { document.getElementById('energyBody').innerHTML = rate() + BTN; bind(); }
  };
  var CSS = '<style>.schoolTeam{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;margin:12px 0}.schoolTeam .st{background:#fff;border-radius:18px;padding:12px;display:flex;flex-direction:column;align-items:center;gap:2px;box-shadow:0 4px 14px rgba(59,48,42,.08);text-align:center}.schoolTeam img{height:110px;width:auto;max-width:100%;object-fit:contain}.schoolTeam b{font-size:17px}.schoolTeam small{color:#7a6c62}</style>';
})();
