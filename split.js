/* 存檔搬家（所有頁面最先載入）。作者：辛巴王
 * 1. 合回天氣島：曾經短暫把「變動的地球島」拆成兩座島（拆島版存檔有 _s 標記，天氣島存在 sciIsles.V.v1），這裡搬回原本的 13 單元編號。
 * 2. 單元拆細：六座島把重要單元拆成子單元（例如牛頓定律 → 慣性、運動定律、作用力與反作用力），單元編號和題目代號跟著改。
 *    舊單元已蓋的章，所有子單元都蓋上；舊實驗的完成紀錄給承接那個實驗的子單元；答對過的題目換成新代號。
 *    搬過的存檔有 _sv 標記，不會再搬第二次；搬之前在這台裝置留一份備份。 */
(function () {
  'use strict';
  var BACK = {
    I: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 12, 8: 13 },
    V: { 1: 7, 2: 8, 3: 9, 4: 10, 5: 11 }
  };
  /* 舊單元 → 新單元（u）、承接舊實驗的新單元（lab）、題目代號（id，只列有改的） */
  var SUB = {"E":{"u":{"1":[1],"2":[2],"3":[3],"4":[4],"5":[5],"6":[6],"7":[7],"8":[8],"9":[9,10,11],"10":[12],"11":[13,14,15],"12":[16],"13":[17],"14":[18]},"lab":{"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":10,"10":12,"11":14,"12":16,"13":17,"14":18},"id":{"E-09-05":"E-10-02","E-09-03":"E-11-02","E-10-01":"E-12-01","E-10-02":"E-12-02","E-10-03":"E-12-03","E-10-04":"E-12-04","E-10-05":"E-12-05","E-11-01":"E-13-01","E-11-02":"E-13-02","E-11-03":"E-14-02","E-11-04":"E-15-02","E-11-05":"E-15-04","E-12-01":"E-16-01","E-12-02":"E-16-02","E-12-03":"E-16-03","E-12-04":"E-16-04","E-12-05":"E-16-05","E-13-01":"E-17-01","E-13-02":"E-17-02","E-13-03":"E-17-03","E-13-04":"E-17-04","E-13-05":"E-17-05","E-14-01":"E-18-01","E-14-02":"E-18-02","E-14-03":"E-18-03","E-14-04":"E-18-04","E-14-05":"E-18-05"}},"D":{"u":{"1":[1],"2":[2],"3":[3],"4":[4],"5":[5],"6":[6],"7":[7],"8":[8],"9":[9],"10":[10,11],"11":[12],"12":[13,14],"13":[15,16,17],"14":[18]},"lab":{"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"11":12,"12":14,"13":15,"14":18},"id":{"D-10-05":"D-11-04","D-11-01":"D-12-01","D-11-02":"D-12-02","D-11-03":"D-12-03","D-11-04":"D-12-04","D-11-05":"D-12-05","D-12-01":"D-13-01","D-12-02":"D-13-02","D-12-04":"D-13-03","D-12-03":"D-14-02","D-12-05":"D-14-04","D-13-01":"D-15-01","D-13-02":"D-15-02","D-13-03":"D-15-03","D-13-04":"D-16-03","D-13-05":"D-16-05","D-14-01":"D-18-01","D-14-02":"D-18-02","D-14-03":"D-18-03","D-14-04":"D-18-04","D-14-05":"D-18-05"}},"G":{"u":{"1":[1],"2":[2],"3":[3],"4":[4],"5":[5],"6":[6],"7":[7],"8":[8],"9":[9],"10":[10],"11":[11],"12":[12,13,14],"13":[15],"14":[16]},"lab":{"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"11":11,"12":12,"13":15,"14":16},"id":{"G-13-01":"G-15-01","G-13-02":"G-15-02","G-13-03":"G-15-03","G-13-04":"G-15-04","G-13-05":"G-15-05","G-14-01":"G-16-01","G-14-02":"G-16-02","G-14-03":"G-16-03","G-14-04":"G-16-04","G-14-05":"G-16-05"}},"I":{"u":{"1":[1],"2":[2,3,4],"3":[5],"4":[6],"5":[7],"6":[8],"7":[9,10],"8":[11],"9":[12],"10":[13],"11":[14],"12":[15],"13":[16]},"lab":{"1":1,"2":4,"3":5,"4":6,"5":7,"6":8,"7":9,"8":11,"9":12,"10":13,"11":14,"12":15,"13":16},"id":{"I-02-04":"I-02-03","I-02-02":"I-03-01","I-02-03":"I-04-02","I-02-05":"I-04-05","I-03-01":"I-05-01","I-03-02":"I-05-02","I-03-03":"I-05-03","I-03-04":"I-05-04","I-03-05":"I-05-05","I-04-01":"I-06-01","I-04-02":"I-06-02","I-04-03":"I-06-03","I-04-04":"I-06-04","I-04-05":"I-06-05","I-05-01":"I-07-01","I-05-02":"I-07-02","I-05-03":"I-07-03","I-05-04":"I-07-04","I-05-05":"I-07-05","I-06-01":"I-08-01","I-06-02":"I-08-02","I-06-03":"I-08-03","I-06-04":"I-08-04","I-06-05":"I-08-05","I-07-01":"I-09-01","I-07-03":"I-09-03","I-07-02":"I-10-01","I-07-04":"I-10-03","I-07-05":"I-10-05","I-08-01":"I-11-01","I-08-02":"I-11-02","I-08-03":"I-11-03","I-08-04":"I-11-04","I-08-05":"I-11-05","I-09-01":"I-12-01","I-09-02":"I-12-02","I-09-03":"I-12-03","I-09-04":"I-12-04","I-09-05":"I-12-05","I-10-01":"I-13-01","I-10-02":"I-13-02","I-10-03":"I-13-03","I-10-04":"I-13-04","I-10-05":"I-13-05","I-11-01":"I-14-01","I-11-02":"I-14-02","I-11-03":"I-14-03","I-11-04":"I-14-04","I-11-05":"I-14-05","I-12-01":"I-15-01","I-12-02":"I-15-02","I-12-03":"I-15-03","I-12-04":"I-15-04","I-12-05":"I-15-05","I-13-01":"I-16-01","I-13-02":"I-16-02","I-13-03":"I-16-03","I-13-04":"I-16-04","I-13-05":"I-16-05"}},"J":{"u":{"1":[1],"2":[2],"3":[3],"4":[4],"5":[5],"6":[6],"7":[7],"8":[8],"9":[9],"10":[10],"11":[11,12],"12":[13],"13":[14],"14":[15],"15":[16]},"lab":{"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"11":11,"12":13,"13":14,"14":15,"15":16},"id":{"J-11-03":"J-11-02","J-11-04":"J-11-03","J-11-01":"J-12-01","J-11-02":"J-12-02","J-11-05":"J-12-05","J-12-01":"J-13-01","J-12-02":"J-13-02","J-12-03":"J-13-03","J-12-04":"J-13-04","J-12-05":"J-13-05","J-13-01":"J-14-01","J-13-02":"J-14-02","J-13-03":"J-14-03","J-13-04":"J-14-04","J-13-05":"J-14-05","J-14-01":"J-15-01","J-14-02":"J-15-02","J-14-03":"J-15-03","J-14-04":"J-15-04","J-14-05":"J-15-05","J-15-01":"J-16-01","J-15-02":"J-16-02","J-15-03":"J-16-03","J-15-04":"J-16-04","J-15-05":"J-16-05"}},"B":{"u":{"1":[1],"2":[2],"3":[3],"4":[4],"5":[5],"6":[6],"7":[7],"8":[8],"9":[9],"10":[10],"11":[11,12],"12":[13]},"lab":{"1":1,"2":2,"3":3,"4":4,"5":5,"6":6,"7":7,"8":8,"9":9,"10":10,"11":12,"12":13},"id":{"B-11-04":"B-11-02","B-11-05":"B-11-04","B-11-01":"B-12-01","B-11-02":"B-12-02","B-11-03":"B-12-03","B-12-01":"B-13-01","B-12-02":"B-13-02","B-12-03":"B-13-03","B-12-04":"B-13-04","B-12-05":"B-13-05"}}};
  var FIELDS = ['answered', 'labs', 'stamps', 'visited'];
  var KI = 'sciIsles.I.v1', KV = 'sciIsles.V.v1';
  function key(L) { return L === 'A' ? 'sciIsles.v1' : 'sciIsles.' + L + '.v1'; }
  function J(s) { try { return typeof s === 'string' ? JSON.parse(s) || {} : s || {}; } catch (e) { return {}; } }
  function remap(L, o) {
    var m = BACK[L], out = {};
    Object.keys(o).forEach(function (k) { if (k !== '_s') out[k] = o[k]; });
    ['labs', 'stamps'].forEach(function (f) {
      var src = o[f] || {}, dst = {};
      Object.keys(src).forEach(function (u) { dst[m[u] || u] = src[u]; });
      out[f] = dst;
    });
    out.answered = Object.assign({}, o.answered || {});
    out.visited = L === 'I' ? Object.assign({}, o.visited || {}) : {};
    return out;
  }
  /* 物質系統島更早之前插入「圓周運動」的搬家（和 wardrobe.js 的 migrateE 相同） */
  function oldE(l) {
    if (l && !(2 <= l.ev)) {
      ['stamps', 'labs', 'ready'].forEach(function (f) { var e = l[f]; if (e) for (var t = 12; t >= 10; t--) if (e[t] != null) { e[t + 1] = e[t]; delete e[t]; } });
      var r = l.answered;
      if (r) { var i = {}; for (var a in r) { var c = /^E-(\d\d)-(\d\d)$/.exec(a); if (c) { var t = +c[1], e = +c[2]; if (t >= 10) t++; else if (t === 9 && e === 5) { t = 10; e = 1; } i['E-' + String(t).padStart(2, '0') + '-' + String(e).padStart(2, '0')] = r[a]; } else i[a] = r[a]; } l.answered = i; }
      l.ev = 2;
    }
    return l;
  }
  /* 單元拆細：舊編號 → 新編號 */
  function sub(L, o) {
    var m = SUB[L]; if (!o || !m || o._sv) return o;
    if (L === 'E') o = oldE(o);
    var out = {};
    Object.keys(o).forEach(function (k) { if (['stamps', 'labs', 'ready', 'answered'].indexOf(k) < 0) out[k] = o[k]; });
    var st = o.stamps || {}, lb = o.labs || {}, rd = o.ready || {}, an = o.answered || {};
    out.stamps = {}; out.labs = {}; out.ready = {}; out.answered = {};
    Object.keys(st).forEach(function (u) { (m.u[u] || [+u]).forEach(function (n) { out.stamps[n] = st[u]; }); });
    Object.keys(lb).forEach(function (u) { out.labs[m.lab[u] || u] = lb[u]; });
    Object.keys(rd).forEach(function (u) { out.ready[m.lab[u] || u] = rd[u]; });
    Object.keys(an).forEach(function (id) { out.answered[m.id[id] || id] = an[id]; });
    out._sv = 1;
    return out;
  }
  function merge(a, b) {
    var o = Object.assign({}, b, a);
    FIELDS.forEach(function (f) { o[f] = Object.assign({}, b[f] || {}, a[f] || {}); });
    delete o._s; return o;
  }
  /* 島嶼頁面或地圖從 Claude 雲端（或備份碼）拿回存檔：舊格式先搬成新格式 */
  function cloud(L, obj) {
    if (!obj) return obj;
    if (L === 'V') return sub('I', remap('V', obj));
    if (L === 'I' && obj._s) obj = remap('I', obj);
    return sub(L, obj);
  }
  /* 一組存檔（鍵 → 字串）：天氣島併回地球島，再把各島換成新的單元編號 */
  function fixAll(map, get) {
    var changed = false, rd = function (k) { return map[k] != null ? map[k] : get ? get(k) : null; };
    var ri = rd(KI), rv = rd(KV);
    if (ri != null || rv != null) {
      var I = J(ri), c0 = false;
      if (I._s) { I = remap('I', I); c0 = true; }
      if (ri != null && !I._sv) { I = sub('I', I); c0 = true; }
      if (rv != null) { I = merge(I._sv ? I : sub('I', I), sub('I', remap('V', J(rv)))); c0 = true; }
      if (c0) { map[KI] = JSON.stringify(I); changed = true; }
    }
    Object.keys(SUB).forEach(function (L) {
      if (L === 'I') return;
      var k = key(L), r = rd(k); if (r == null) return;
      var o = J(r); if (o._sv) return;
      map[k] = JSON.stringify(sub(L, o)); changed = true;
    });
    return changed;
  }
  function ls(k, v) {
    try {
      if (v === undefined) return localStorage.getItem(k);
      if (v === null) return localStorage.removeItem(k);
      localStorage.setItem(k, v);
    } catch (e) { return null; }
  }
  /* 這台裝置：打開新版時搬一次，搬之前備份 */
  function local() {
    var keys = [KI, KV].concat(Object.keys(SUB).map(key)), before = {}, map = {};
    keys.forEach(function (k) { var v = ls(k); if (v != null) before[k] = v; });
    if (!Object.keys(before).length) return;
    if (!fixAll(map, ls)) return;
    if (before[KV] != null && !ls('sciIsles.mergeBackup')) ls('sciIsles.mergeBackup', JSON.stringify({ at: Date.now(), I: before[KI], V: before[KV] }));
    if (!ls('sciIsles.subBackup')) ls('sciIsles.subBackup', JSON.stringify({ at: Date.now(), data: before }));
    Object.keys(map).forEach(function (k) { ls(k, map[k]); });
    if (before[KV] != null) ls(KV, null);
  }
  /* 物質系統島的 loadP 會呼叫 migrateE，但定義它的 wardrobe.js 比島嶼主程式晚載入；
     先在這裡定義，免得讀存檔失敗、進度被當成空白存回去（wardrobe.js 之後載入時會換成同樣的版本） */
  if (typeof window.migrateE !== 'function') window.migrateE = oldE;
  try { local(); } catch (e) {}
  window.SPLIT = { BACK: BACK, SUB: SUB, remap: remap, sub: sub, cloud: cloud, fixAll: fixAll, key: key,
    /* 舊的服裝解鎖代號（例如 E11）換成新的（E13） */
    code: function (c) { var m = /^([A-Z])(\d+)$/.exec(c || ''); if (!m || !SUB[m[1]]) return c; var t = SUB[m[1]].u[m[2]]; return t ? m[1] + t[0] : c; } };
})();
