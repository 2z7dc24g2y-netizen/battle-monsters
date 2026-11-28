/* Firebase 要用到才下載（不擋住頁面）。頁面照常呼叫 fbCall，第一次呼叫時才載入 Firebase 與遊戲資料層。 */
(function () {
  window.HATCH_FB = true;
  var P = null, B = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-';
  function ld(src) {
    return new Promise(function (ok, no) {
      var s = document.createElement('script'); s.src = src; s.onload = ok;
      s.onerror = function () { no(new Error('載入失敗，請檢查網路後再試。')); };
      document.head.appendChild(s);
    });
  }
  window.fbLoad = function () {
    if (P) return P;
    P = ld(B + 'app-compat.js').then(function () { return Promise.all([ld(B + 'auth-compat.js'), ld(B + 'database-compat.js')]); })
      .then(function () { return ld('fbconfig.js'); }).then(function () { return ld('hatch-fb.js?v=7'); });
    P.catch(function () { P = null; });
    return P;
  };
  var stub = function (a, p) {
    return window.fbLoad().then(function () {
      if (window.fbCall === stub) throw new Error('遊戲資料層載入失敗，請重新整理。');
      return window.fbCall(a, p);
    });
  };
  window.fbCall = stub;
  /* 首頁（孵化吧）一定會用到：畫面畫完、閒下來再預先載入 */
  if (/(^|\/)(index\.html)?$/.test(location.pathname)) window.addEventListener('load', function () { setTimeout(function () { window.fbLoad().catch(function () {}); }, 400); });
})();
