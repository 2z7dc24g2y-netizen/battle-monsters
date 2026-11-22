(function(){
/* ============================================================
 *  孵化吧！理化獸 — 遊戲規則（伺服器與示範版共用）
 *  作者：辛巴王
 * ============================================================ */
var GAME = {
  DAILY: 10,            // 每天題數
  XP_RIGHT: 10,         // 答對經驗
  XP_WRONG: 2,          // 答錯也給一點參與經驗
  XP_FINISH: 20,        // 完成當日訓練獎勵
  HATCH_RIGHT: 6,       // 蛋：答對孵化 +6%
  HATCH_WRONG: 2,
  HATCH_FINISH: 10,
  BATTLES_PER_DAY: 3,
  XP_WIN: 15,
  XP_LOSE: 5,
  REVIEW_PER_DAY: 3,    // 每天最多放幾題錯題複習
  STAGE2: 10,           // Lv10 進化成長體
  STAGE3: 20,           // Lv20 進化進化體
  MAX_MONS: 3,          // 每人最多 3 隻理化獸
  EGG_LV: [0, 5, 10],   // 第 2 顆蛋：任一隻 Lv5；第 3 顆蛋：任一隻 Lv10
  ISLE_XP_Q: 5,         // 科學島：新答對一題
  ISLE_XP_LAB: 10,      // 科學島：完成一個實驗
  ISLE_XP_STAMP: 20,    // 科學島：蓋到一枚印章
  ISLE_DAY_CAP: 500,    // 科學島練功每天最多換到的經驗（超過的留到隔天）；0 = 不設上限
  ISLE_MAX_CHARS: 600000,
  PIN_TRIES: 8,         // 學生 PIN 連錯幾次就暫停 10 分鐘
  STAFF_TRIES: 5,       // 網管密碼、老師 PIN 連錯幾次就暫停 15 分鐘
  TOKEN_SEC: 21600      // 網管、老師登入一次可用 6 小時
};

var ORDER = ['fire', 'water', 'wood', 'earth', 'elec'];

/* 五系數值與說明：與自然科學島「理化獸競技島」相同 */
var ELEMENTS = {
  fire:  { name: '火', trait: '範圍輸出', row: 'back', stages: ['火羽雛', '炎翼鳥', '炎鷹獸'], beats: 'wood',  why: '火能燃燒木材',
           hp: 108, atk: 37, def: 10, spd: 15, intro: '攻擊力最高，一次燒一整排。血少防低，適合躲在後排。' },
  water: { name: '水', trait: '平衡', row: 'mid', stages: ['小水滴獸', '水靈龍獸', '潮汐龍王'], beats: 'fire',  why: '水能吸熱滅火',
           hp: 130, atk: 28, def: 24, spd: 12, intro: '攻守平均，最好上手。大招打一整排，還會讓對手下次防守變難。' },
  wood:  { name: '木', trait: '治療', row: 'back', stages: ['小芽精靈', '花葉精靈', '森林花神'], beats: 'earth', why: '植物的根能鑽開土壤',
           hp: 125, atk: 30, def: 26, spd: 10, intro: '每次攻擊都順便幫隊友補血，大招全隊回血。隊伍裡有它會很耐打。' },
  earth: { name: '土', trait: '坦克', row: 'front', stages: ['小岩狼', '晶甲狼', '晶甲狼王'], beats: 'elec',  why: '土能把電導入地下',
           hp: 136, atk: 30, def: 28, spd: 10, intro: '皮厚血多，站最前排替隊友擋攻擊。大招讓全隊一整輪都擋下一半以上的傷害。' },
  elec:  { name: '電', trait: '速度', row: 'mid', stages: ['小雷獸', '雷鬃獸', '雷霆神獸'], beats: 'water', why: '電能把水電解成氫和氧',
           hp: 100, atk: 32, def: 15, spd: 22, intro: '速度最快、總是先出手，可以打任何位置。血比較少，要注意防守。' }
};

/* 出題範圍裡章節的排列順序（依課本章次；題庫裡沒列到的章節排在後面） */
var CH_ORDER = {
  '第一冊': ['生命世界與科學方法', '生物體的組成', '生物體的營養', '生物體的運輸作用', '生物體的協調作用', '生物體的恆定性'],
  '第二冊': ['生殖', '遺傳', '演化與生物分類', '生物與環境', '人類與環境'],
  '第三冊': ['基本測量', '物質的世界', '波動與聲音', '光', '溫度與熱', '物質的基本結構'],
  '第四冊': ['化學反應', '氧化與還原', '酸、鹼、鹽', '反應速率與平衡', '有機化合物', '力與壓力'],
  '第五冊': ['直線運動', '力與運動', '功與能', '基本的靜電現象與電路', '水與陸地', '板塊運動與地球歷史', '運動中的天體'],
  '第六冊': ['電流的效應', '電流與磁現象', '千變萬化的天氣', '全球氣候變遷與因應']
};

var EGG_COLORS = ['#F28B82', '#F6B85F', '#F2D46B', '#9BCB8D', '#71C7C4', '#79B8E8', '#9A9BE2', '#C49BD8', '#E9A9C8', '#D5B7A0', '#A9C5B8', '#F1A77C'];

/* ---------- 小工具 ---------- */
function rnd_(n) { return Math.floor(Math.random() * n); }
function shuffle_(a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = rnd_(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function pad2_(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
function fail_(msg) { throw new Error(msg); }
function needXp(level) { return 60 + 15 * level; }
function stageOf(level) { return level >= GAME.STAGE3 ? 3 : level >= GAME.STAGE2 ? 2 : 1; }
function monsterId(code, seat) { return String(code) + pad2_(seat); }

/* 已取消的屬性（例如舊的風系）依座號改成五系之一，並在下次存檔時寫回 */
function elOf_(st) { if (!ELEMENTS[st.element]) st.element = ORDER[(Number(st.seat) || 0) % ORDER.length]; return st.element; }

/* 能力值：與競技島對戰的算法相同 */
function statsOf(m) {
  var e = ELEMENTS[m.element] || ELEMENTS.fire, k = 1 + 0.015 * ((m.level || 1) - 1);
  return { hp: Math.round(e.hp * k * 1.275), atk: Math.round(e.atk * k), def: e.def, spd: Math.round(e.spd + (m.level || 1) * 0.1) };
}

/* ---------- 每人最多 3 隻：第 1 隻沿用原本的欄位，第 2、3 隻存在 ext.mons（舊資料完全不用搬） ---------- */
function ext_(st) {
  if (!st.ext || typeof st.ext !== 'object' || Array.isArray(st.ext)) st.ext = {};
  var x = st.ext;
  if (!Array.isArray(x.mons)) x.mons = [];
  if (typeof x.lead !== 'number') x.lead = 0;
  return x;
}
function monsOf_(st) {
  elOf_(st);
  var x = ext_(st);
  var m0 = { element: st.element, eggColor: st.eggColor, hatch: Number(st.hatch) || 0, hatched: !!st.hatched, level: Number(st.level) || 1, xp: Number(st.xp) || 0, seenHatch: st.seenHatch !== false };
  return [m0].concat(x.mons.map(function (m) { if (!ELEMENTS[m.element]) m.element = ORDER[0]; return m; }));
}
function setMons_(st, ms) {
  var m0 = ms[0];
  st.element = m0.element; st.eggColor = m0.eggColor; st.hatch = m0.hatch; st.hatched = m0.hatched; st.level = m0.level; st.xp = m0.xp; st.seenHatch = m0.seenHatch;
  var x = ext_(st); x.mons = ms.slice(1);
  if (x.lead >= ms.length) x.lead = 0;
}
function leadOf_(st, ms) { var i = ext_(st).lead; return i < ms.length ? i : 0; }
/* 孵化點數給還沒孵化的蛋（最舊的那顆） */
function eggIndex_(ms) { for (var i = 0; i < ms.length; i++) if (!ms[i].hatched) return i; return -1; }
/* 達到等級就送下一顆蛋（屬性挑還沒有的） */
function grantEgg_(st, ms, force) {
  if (ms.length >= GAME.MAX_MONS || eggIndex_(ms) >= 0) return -1;
  var top = ms.reduce(function (a, m) { return Math.max(a, m.hatched ? m.level : 0); }, 0);
  if (!force && top < GAME.EGG_LV[ms.length]) return -1;
  var have = {}; ms.forEach(function (m) { have[m.element] = 1; });
  var pool = ORDER.filter(function (k) { return !have[k]; }); if (!pool.length) pool = ORDER;
  ms.push({ element: pool[rnd_(pool.length)], eggColor: EGG_COLORS[rnd_(EGG_COLORS.length)], hatch: 0, hatched: false, level: 1, xp: 0, seenHatch: true, born: Date.now() });
  return ms.length - 1;
}

function newStudent_(code, seat) {
  return {
    key: code + '-' + seat, code: String(code), seat: seat, name: '', pin: String(1000 + rnd_(9000)),
    element: ORDER[rnd_(ORDER.length)], eggColor: EGG_COLORS[rnd_(EGG_COLORS.length)],
    hatch: 0, hatched: false, level: 1, xp: 0, totalXp: 0, answered: 0, correct: 0,
    streak: 0, lastDay: '', todayDate: '', todayQs: [], todayAns: {}, mastered: [], wrong: [],
    battleDate: '', battleCount: 0, wins: 0, losses: 0, seenHatch: true, ext: { mons: [], lead: 0 }
  };
}

function applyXp_(m, amt) {
  m.xp += amt;
  var ups = 0;
  while (m.xp >= needXp(m.level)) { m.xp -= needXp(m.level); m.level++; ups++; }
  return ups;
}
function applyHatch_(m, amt) {
  if (!m || m.hatched) return false;
  m.hatch = Math.min(100, m.hatch + amt);
  if (m.hatch >= 100) { m.hatched = true; m.seenHatch = false; return true; }
  return false;
}

function inScope_(q, scope) {
  if (!scope || !scope.length) return true;
  for (var i = 0; i < scope.length; i++) {
    if (scope[i] === q.book || scope[i] === q.book + '/' + q.chapter) return true;
  }
  return false;
}

/* 公開給畫面的怪獸資料（不含 PIN、不含未孵化的屬性） */
function pubMon_(m, i) {
  var o = { i: i, eggColor: m.eggColor, hatch: m.hatch, hatched: !!m.hatched, level: m.level, xp: m.xp, need: needXp(m.level), stage: stageOf(m.level) };
  if (m.hatched) {
    var e = ELEMENTS[m.element];
    o.element = m.element; o.elementName = e.name; o.trait = e.trait; o.monName = e.stages[o.stage - 1];
    o.stats = statsOf(m); o.beats = e.beats; o.why = e.why;
  }
  return o;
}
/* ---------- 課堂任務：老師設定範圍、目標、獎賞與時限；學生在時限內答對指定題數就自動拿獎賞 ---------- */
function misOn_(cls) { var m = cls && cls.mission; return !!(m && m.id && Number(m.ends) > Date.now()); }
function misOf_(st, cls) { var x = ext_(st), m = cls.mission; if (!x.mis || x.mis.id !== m.id) x.mis = { id: m.id, ok: 0, n: 0, done: false, asked: [], cur: '' }; return x.mis; }
function misPub_(st, cls) {
  if (!misOn_(cls)) return null;
  var m = cls.mission, x = ext_(st), me = x.mis && x.mis.id === m.id ? x.mis : { ok: 0, n: 0, done: false };
  return { id: m.id, title: m.title, goal: m.goal, ends: m.ends, reward: m.reward, ok: me.ok, n: me.n, done: !!me.done };
}
function pub_(st, cls) {
  var ms = monsOf_(st), lead = leadOf_(st, ms), x = ext_(st);
  var o = {
    id: monsterId(st.code, st.seat), code: st.code, seat: st.seat, name: st.name || '',
    totalXp: st.totalXp, answered: st.answered, correct: st.correct,
    streak: st.streak, wins: st.wins, losses: st.losses,
    todayCount: st.todayDate === (cls && cls._today) ? Object.keys(st.todayAns || {}).length : 0,
    todayTotal: st.todayDate === (cls && cls._today) ? (st.todayQs || []).length : GAME.DAILY,
    mons: ms.map(pubMon_), lead: lead,
    nextEgg: ms.length < GAME.MAX_MONS ? GAME.EGG_LV[ms.length] : 0,
    mission: misPub_(st, cls),
    isle: { today: x.isle && cls && x.isle.d === cls._today ? x.isle.x : 0, cap: GAME.ISLE_DAY_CAP, q: GAME.ISLE_XP_Q, lab: GAME.ISLE_XP_LAB, stamp: GAME.ISLE_XP_STAMP }
  };
  /* 夥伴（帶在身邊的那隻）的資料也放在最上層，白板與排行榜直接用 */
  var L = o.mons[lead];
  ['eggColor', 'hatch', 'hatched', 'level', 'xp', 'need', 'stage', 'element', 'elementName', 'trait', 'monName', 'stats', 'beats', 'why'].forEach(function (k) { if (L[k] !== undefined) o[k] = L[k]; });
  o.hatchedCount = o.mons.filter(function (m) { return m.hatched; }).length;
  return o;
}

/* ---------- 驗證 ---------- */
function hashPin_(S, id, pin) { return S.hash('sciHatch:' + String(id).toLowerCase() + ':' + pin); }
/* 網管與老師登入後拿到一張通行證（tok），之後每個動作只送通行證 */
function authStaff_(S, p, needAdmin) {
  var who = p.tok ? S.tokGet(String(p.tok)) : null;
  if (!who) fail_('登入已過期，請重新登入。');
  if (who.role === 'teacher') {
    var t = S.getTeacher(who.id);
    if (!t || !t.active) fail_('這個老師帳號已停用，請洽網管。');
    who.name = t.name;
  }
  if (needAdmin && who.role !== 'admin') fail_('只有網管可以做這件事。');
  return who;
}
function myClass_(S, who, code) {
  var cls = getClass_(S, code);
  if (who.role !== 'admin' && String(cls.owner || '') !== who.id) fail_('這不是你的班級。');
  return cls;
}
function newPin6_() { return String(100000 + rnd_(900000)); }
function classesFor_(S, who) {
  var names = {}; S.listTeachers().forEach(function (t) { names[t.id] = t.name; });
  return S.listClasses().filter(function (c) { return who.role === 'admin' || String(c.owner || '') === who.id; }).map(function (c) {
    c._today = S.today();
    var b = board_(S, c);
    return { code: c.code, name: c.name, count: c.count, hatched: b.hatched, doneToday: b.doneToday, scope: c.scope || [], owner: c.owner || '', ownerName: names[c.owner] || '' };
  });
}
function getClass_(S, code) {
  var cls = S.getClass(String(code || '').trim());
  if (!cls) fail_('找不到班級代碼「' + code + '」。');
  cls._today = S.today();
  return cls;
}
function authStudent_(S, p) {
  var cls = getClass_(S, p.code);
  var seat = Number(p.seat);
  var st = S.getStudent(cls.code, seat);
  if (!st) fail_('這個班級沒有 ' + p.seat + ' 號。');
  var lk = 'pin:' + cls.code + '-' + seat;
  if (S.lockCheck && S.lockCheck(lk) >= GAME.PIN_TRIES) fail_('PIN 錯太多次，請 10 分鐘後再試，或請老師確認 PIN。');
  if (String(st.pin) !== String(p.pin || '').trim()) { if (S.lockFail) S.lockFail(lk); fail_('PIN 碼不正確，請向老師確認。'); }
  return { cls: cls, st: st };
}

/* ---------- 每日題目 ---------- */
function ensureDaily_(S, cls, st) {
  var today = S.today();
  if (st.todayDate === today && st.todayQs && st.todayQs.length) return false;
  var index = S.questionIndex();
  var pool = index.filter(function (q) { return inScope_(q, cls.scope); });
  if (!pool.length) pool = index;
  if (!pool.length) fail_('題庫是空的，請老師先匯入題目。');
  var mastered = {}, wrong = {};
  (st.mastered || []).forEach(function (id) { mastered[id] = 1; });
  (st.wrong || []).forEach(function (id) { wrong[id] = 1; });
  var review = shuffle_(pool.filter(function (q) { return wrong[q.id]; })).slice(0, GAME.REVIEW_PER_DAY);
  var fresh = shuffle_(pool.filter(function (q) { return !mastered[q.id] && !wrong[q.id]; }));
  var picks = review.concat(fresh).slice(0, GAME.DAILY);
  if (picks.length < GAME.DAILY) {
    var taken = {}; picks.forEach(function (q) { taken[q.id] = 1; });
    picks = picks.concat(shuffle_(pool.filter(function (q) { return !taken[q.id]; }))).slice(0, GAME.DAILY);
  }
  st.todayDate = today;
  st.todayQs = shuffle_(picks.map(function (q) { return q.id; }));
  st.todayAns = {};
  return true;
}

/* ---------- 對戰共用 ---------- */
function teamOf_(st) {
  return monsOf_(st).map(function (m, i) { return { m: m, i: i }; }).filter(function (x) { return x.m.hatched; }).map(function (x) {
    var stg = stageOf(x.m.level);
    return { mi: x.i, seat: st.seat, sname: st.name || '', el: x.m.element, lv: x.m.level, stage: stg, mon: ELEMENTS[x.m.element].stages[stg - 1] };
  });
}
/* ---------- 服裝加成：讀學生在科學島的穿搭（學校網站版才有），算法與島上相同 ---------- */
function gearOn_(cls) { return String(cls && cls.gear) !== '0'; }
function gearFromData_(data) {
  if (typeof GEAR_SRV === 'undefined' || !data) return null;
  var d; try { d = JSON.parse(data); } catch (e) { return null; }
  var av = null; try { av = JSON.parse(d['sciIsles.avatar'] || 'null'); } catch (e) {}
  var g = av ? GEAR_SRV.G.total(av, GEAR_SRV.I) : { sum: {}, sets: [] };
  var med = 0; try { med = Object.keys(JSON.parse(d['sciIsles.P.v1'] || '{}').medals || {}).length; } catch (e) {}
  if (med) g.sum.atk = Math.min(15, (g.sum.atk || 0) + med);
  if (!Object.keys(g.sum).length) return null;
  return { sum: g.sum, sets: (g.sets || []).map(function (x) { return x.name; }), txt: GEAR_SRV.G.fmt(g.sum) };
}
/* 一次讀好幾位學生的服裝（回傳 key → 加成） */
function gearMap_(S, list) {
  var out = {}; if (!S.getIsle) return out;
  var all = S.allIsles ? S.allIsles() : null;
  list.forEach(function (st) { var k = st.key || (st.code + '-' + st.seat), sv = all ? all[k] : S.getIsle(k); var g = gearFromData_(sv && sv.data !== undefined ? sv.data : sv); if (g) out[k] = g; });
  return out;
}
function gearTxt_(g) { return g ? (g.sets.length ? g.sets.join('、') : '單件服裝') : '沒有'; }

/* ---------- 班級看板 ---------- */
function board_(S, cls) {
  var list = S.listStudents(cls.code).sort(function (a, b) { return a.seat - b.seat; });
  var students = list.map(function (st) { return pub_(st, cls); });
  var hatched = students.filter(function (s) { return s.hatchedCount > 0; }).length;
  var doneToday = students.filter(function (s) { return s.todayCount >= s.todayTotal && s.todayCount > 0; }).length;
  return {
    cls: { code: cls.code, name: cls.name, count: cls.count, scope: cls.scope || [], gear: gearOn_(cls), mission: misOn_(cls) ? cls.mission : null },
    students: students, hatched: hatched, doneToday: doneToday, today: S.today()
  };
}

/* ============================================================
 *  API：每個動作都收一個 payload，回傳純資料
 * ============================================================ */
var API = {
  /* ----- 公開 ----- */
  bankInfo: function (S) {
    var idx = S.questionIndex(), books = {};
    idx.forEach(function (q) {
      var b = books[q.book] || (books[q.book] = { book: q.book, count: 0, chapters: {} });
      b.count++; b.chapters[q.chapter] = (b.chapters[q.chapter] || 0) + 1;
    });
    /* 依冊別順序排（第一冊、第二冊…），不是依字碼排 */
    var N = '一二三四五六七八九十', num = function (b) { var m = /第(.)冊/.exec(b); return m ? N.indexOf(m[1]) : 99; };
    return { total: idx.length, books: Object.keys(books).sort(function (a, b) { return num(a) - num(b) || (a < b ? -1 : 1); }).map(function (k) {
      var b = books[k];
      var ord = CH_ORDER[b.book] || [], at = function (c) { var i = ord.indexOf(c); return c === '' ? 999 : i < 0 ? 500 : i; };
      return { book: b.book, count: b.count, chapters: Object.keys(b.chapters).sort(function (x, y) { return at(x) - at(y); }).map(function (c) { return { name: c, count: b.chapters[c] }; }) };
    }) };
  },
  lookup: function (S, p) {
    var id = String(p.id || '').trim();
    if (id.length < 3) fail_('請輸入完整的怪獸編號（班級代碼＋兩位座號）。');
    var cls = getClass_(S, id.slice(0, -2));
    var st = S.getStudent(cls.code, Number(id.slice(-2)));
    if (!st) fail_('找不到怪獸編號 ' + id + '。');
    return pub_(st, cls);
  },

  /* ----- 學生 ----- */
  studentLogin: function (S, p) {
    var a = authStudent_(S, p), st = a.st, ms = monsOf_(st);
    var newEgg = grantEgg_(st, ms);
    if (newEgg >= 0) { setMons_(st, ms); S.saveStudent(st); }
    var unseen = ms.map(function (m, i) { return m.hatched && m.seenHatch === false ? i : -1; }).filter(function (i) { return i >= 0; });
    return { me: pub_(st, a.cls), clsName: a.cls.name, seenHatch: !unseen.length, unseen: unseen, newEgg: newEgg, battlesLeft: battlesLeft_(S, st) };
  },
  setLead: function (S, p) {
    var a = authStudent_(S, p), st = a.st, ms = monsOf_(st), i = Number(p.i);
    if (!(i >= 0 && i < ms.length)) fail_('找不到這隻理化獸。');
    ext_(st).lead = i; S.saveStudent(st);
    return { me: pub_(st, a.cls) };
  },
  daily: function (S, p) {
    var a = authStudent_(S, p), st = a.st;
    if (ensureDaily_(S, a.cls, st)) S.saveStudent(st);
    var qs = S.getQuestions(st.todayQs);
    return {
      me: pub_(st, a.cls),
      questions: qs.map(function (q) {
        var r = st.todayAns[q.id];
        return { id: q.id, book: q.book, chapter: q.chapter, stem: q.stem, A: q.A, B: q.B, C: q.C, D: q.D, image: q.image || '',
                 result: r ? { choice: r.c, correct: r.ok, answer: q.answer, explanation: q.explanation } : null };
      })
    };
  },
  answer: function (S, p) {
    var a = authStudent_(S, p), st = a.st, cls = a.cls;
    ensureDaily_(S, cls, st);
    var qid = String(p.qid), choice = String(p.choice || '').toUpperCase();
    if (st.todayQs.indexOf(qid) < 0) fail_('這題不在今天的訓練裡，請重新整理。');
    if (st.todayAns[qid]) fail_('這題已經作答過了。');
    if (['A', 'B', 'C', 'D'].indexOf(choice) < 0) fail_('請選擇 A、B、C 或 D。');
    var q = S.getQuestions([qid])[0];
    if (!q) fail_('題庫裡找不到這題，可能已被老師刪除。');
    var ok = choice === String(q.answer).trim().toUpperCase();
    st.todayAns[qid] = { c: choice, ok: ok };
    st.answered++; if (ok) st.correct++;
    st.mastered = (st.mastered || []).filter(function (x) { return x !== qid; });
    st.wrong = (st.wrong || []).filter(function (x) { return x !== qid; });
    if (ok) st.mastered.push(qid); else st.wrong.push(qid);
    if (st.wrong.length > 200) st.wrong = st.wrong.slice(-200);

    var xp = ok ? GAME.XP_RIGHT : GAME.XP_WRONG, hatch = ok ? GAME.HATCH_RIGHT : GAME.HATCH_WRONG;
    var done = Object.keys(st.todayAns).length >= st.todayQs.length, bonus = false;
    if (done) {
      bonus = true; xp += GAME.XP_FINISH; hatch += GAME.HATCH_FINISH;
      var today = S.today();
      st.streak = st.lastDay === S.yesterday() ? st.streak + 1 : 1;
      st.lastDay = today;
    }
    var ms = monsOf_(st), li = leadOf_(st, ms), lead = ms[li], ei = eggIndex_(ms);
    var prevStage = stageOf(lead.level), wasHatched = lead.hatched;
    var ups = applyXp_(lead, xp); st.totalXp = (Number(st.totalXp) || 0) + xp;
    var hatchedNow = ei >= 0 ? applyHatch_(ms[ei], hatch) : false;
    var newEgg = grantEgg_(st, ms);
    setMons_(st, ms);
    S.saveStudent(st);
    S.logAnswer({ code: st.code, seat: st.seat, qid: qid, choice: choice, ok: ok });
    return {
      correct: ok, answer: q.answer, explanation: q.explanation, xpGain: xp, hatchGain: ei >= 0 ? hatch : 0,
      levelUps: ups, evolved: wasHatched && stageOf(lead.level) > prevStage, evolvedIdx: li, hatchedNow: hatchedNow, hatchedIdx: ei, newEgg: newEgg,
      done: done, bonus: bonus, me: pub_(st, cls)
    };
  },
  seenHatch: function (S, p) {
    var a = authStudent_(S, p), ms = monsOf_(a.st), ch = false;
    ms.forEach(function (m) { if (m.seenHatch === false) { m.seenHatch = true; ch = true; } });
    if (ch) { setMons_(a.st, ms); S.saveStudent(a.st); }
    return { me: pub_(a.st, a.cls) };
  },
  arenaInfo: function (S, p) {
    var a = authStudent_(S, p), st = a.st;
    var mates = S.listStudents(a.cls.code).filter(function (o) { return o.seat !== st.seat; }).map(function (o) {
      var t = teamOf_(o); if (!t.length) return null;
      var ms = monsOf_(o), L = ms[leadOf_(o, ms)];
      return { seat: o.seat, name: o.name || '', team: t.map(function (u) { return { el: u.el, lv: u.lv, stage: u.stage, mon: u.mon }; }), wins: o.wins || 0 };
    }).filter(Boolean).sort(function (x1, x2) { return x1.seat - x2.seat; });
    return {
      mates: mates, battlesLeft: battlesLeft_(S, st)
    };
  },
  battleStart: function (S, p) {
    var a = authStudent_(S, p), st = a.st, x = ext_(st);
    var mine = teamOf_(st);
    if (!mine.length) fail_('你的蛋還沒孵化，先完成每日訓練讓它孵出來吧！');
    if (battlesLeft_(S, st) <= 0) fail_('今天的 ' + GAME.BATTLES_PER_DAY + ' 次挑戰已經用完，明天再來。');
    var cfg = { mode: 'student', teamA: mine.map(function (u) { u.seat = 0; return u; }), cpuAns: 0.62, cpuK: 0.25 };
    var seat = Number(p.opp), opp = S.getStudent(a.cls.code, seat);
    if (!opp || seat === st.seat) fail_('找不到這位同學。');
    cfg.teamB = teamOf_(opp);
    if (!cfg.teamB.length) fail_('對方的蛋還沒孵化，暫時不能對戰。');
    cfg.foeName = seat + ' 號' + (opp.name ? ' ' + opp.name : ''); cfg.title = '挑戰同學';
    cfg.note = '勝利每隻出戰的理化獸 +' + GAME.XP_WIN + ' XP，輸了也有 +' + GAME.XP_LOSE + ' XP。開始戰鬥就算一次挑戰。';
    if (gearOn_(a.cls)) {
      var gm = gearMap_(S, [st, opp]), gA = gm[st.key], gB = gm[opp.key];
      cfg.teamA.forEach(function (u) { if (gA) u.g = gA.sum; }); cfg.teamB.forEach(function (u) { if (gB) u.g = gB.sum; });
      cfg.note += '<br>服裝加成：你（' + gearTxt_(gA) + '）・對手（' + gearTxt_(gB) + '）';
    }
    x.pend = { tok: String(Date.now()) + rnd_(1000), id: seat };
    S.saveStudent(st);
    /* 對戰題目用自然科學島的題庫（內建在對戰畫面裡），不用會考題 */
    cfg.tok = x.pend.tok;
    return { cfg: cfg, battlesLeft: battlesLeft_(S, st) };
  },
  /* 按下「開始戰鬥」才算一次挑戰（在出戰準備畫面離開不扣次數） */
  battleGo: function (S, p) {
    var a = authStudent_(S, p), st = a.st, x = ext_(st), pd = x.pend;
    if (!pd || String(p.tok) !== String(pd.tok) || pd.go) return { battlesLeft: battlesLeft_(S, st) };
    var today = S.today();
    if (st.battleDate !== today) { st.battleDate = today; st.battleCount = 0; }
    st.battleCount++; pd.go = 1; S.saveStudent(st);
    return { battlesLeft: battlesLeft_(S, st) };
  },
  battleEnd: function (S, p) {
    var a = authStudent_(S, p), st = a.st, x = ext_(st), pd = x.pend;
    if (!pd || String(p.tok) !== String(pd.tok)) fail_('這場對戰已經結算過了。');
    delete x.pend;
    var ms = monsOf_(st), win = p.result === 'A', quit = p.result === 'quit' && !pd.go;
    var used = (p.used || []).map(Number).filter(function (i, k, arr) { return i >= 0 && i < ms.length && ms[i].hatched && arr.indexOf(i) === k; });
    var gain = quit ? 0 : win ? GAME.XP_WIN : GAME.XP_LOSE;
    if (!quit) { if (win) st.wins++; else st.losses++; }
    var ev = used.map(function (i) { var pre = stageOf(ms[i].level), ups = applyXp_(ms[i], gain); return { i: i, levelUps: ups, evolved: stageOf(ms[i].level) > pre }; });
    st.totalXp = (Number(st.totalXp) || 0) + gain * used.length;
    var newEgg = grantEgg_(st, ms);
    setMons_(st, ms); S.saveStudent(st);
    return { win: win, quit: quit, xpGain: gain, events: ev, newEgg: newEgg, me: pub_(st, a.cls), battlesLeft: battlesLeft_(S, st) };
  },

  /* ----- 網管與老師 ----- */
  /* 帳號＋密碼（網管）或帳號＋6 碼 PIN（老師）登入；已登入時只帶 tok 也能重新整理班級列表 */
  teacherLogin: function (S, p) {
    var who;
    if (p.tok && !p.id) who = authStaff_(S, p);
    else {
      var id = String(p.id || '').trim(), pw = String(p.pw || '').trim(), lk = 'staff:' + id.toLowerCase();
      if (!id || !pw) fail_('請輸入帳號和密碼。');
      if (S.lockCheck(lk) >= GAME.STAFF_TRIES) fail_('密碼錯太多次，請 15 分鐘後再試。');
      var adm = S.adminAccount();
      if (adm.id && id.toLowerCase() === adm.id.toLowerCase()) {
        if (!adm.ok(pw)) { S.lockFail(lk, 900); fail_('帳號或密碼不正確。'); }
        who = { role: 'admin', id: adm.id, name: '網管' };
      } else {
        var t = S.getTeacher(id);
        if (!t || t.pinHash !== hashPin_(S, t.id, pw)) {
          S.lockFail(lk, 900);
          fail_(adm.id || S.listTeachers().length ? '帳號或密碼不正確。' : '網管帳號還沒設定：請網管到試算表「設定」工作表填入網管帳號與密碼。');
        }
        if (!t.active) fail_('這個老師帳號已停用，請洽網管。');
        who = { role: 'teacher', id: t.id, name: t.name };
      }
      who.tok = S.tokNew(who);
    }
    var out = { tok: who.tok || p.tok, role: who.role, id: who.id, name: who.name, classes: classesFor_(S, who) };
    if (who.role === 'admin') { out.teachers = API.adminTeachers(S, { tok: out.tok }).teachers; out.apps = API.adminApps(S, { tok: out.tok }).apps; }
    return out;
  },
  logout: function (S, p) { if (p.tok) S.tokDel(String(p.tok)); return {}; },
  changePin: function (S, p) {
    var who = authStaff_(S, p);
    if (who.role !== 'teacher') fail_('網管密碼請到試算表「設定」工作表修改。');
    var t = S.getTeacher(who.id), oldPin = String(p.old || '').trim(), pin = String(p.pin || '').trim();
    if (t.pinHash !== hashPin_(S, t.id, oldPin)) fail_('原本的 PIN 不正確。');
    if (!/^\d{6}$/.test(pin)) fail_('新的 PIN 請輸入 6 個數字。');
    t.pinHash = hashPin_(S, t.id, pin); S.saveTeacher(t);
    return { ok: true };
  },
  adminTeachers: function (S, p) {
    authStaff_(S, p, true);
    var n = {}; S.listClasses().forEach(function (c) { if (c.owner) n[c.owner] = (n[c.owner] || 0) + 1; });
    return { teachers: S.listTeachers().map(function (t) { return { id: t.id, name: t.name, active: !!t.active, classes: n[t.id] || 0, createdAt: t.createdAt }; }) };
  },
  adminAddTeacher: function (S, p) {
    authStaff_(S, p, true);
    var name = String(p.name || '').trim().slice(0, 20);
    if (!name) fail_('請輸入老師姓名。');
    var all = S.listTeachers(), used = {}, k = all.length + 1, id;
    all.forEach(function (t) { used[t.id.toLowerCase()] = 1; });
    do { id = 'T' + pad2_(k++); } while (used[id.toLowerCase()]);
    var pin = newPin6_();
    S.saveTeacher({ id: id, name: name, pinHash: hashPin_(S, id, pin), active: true, createdAt: S.today() });
    return { id: id, name: name, pin: pin, teachers: API.adminTeachers(S, p).teachers };
  },
  /* 老師自己申請帳號（不用登入）；網管在後台核准 */
  teacherApply: function (S, p) {
    var name = String(p.name || '').trim().slice(0, 20), school = String(p.school || '').trim().slice(0, 30),
      email = String(p.email || '').trim().slice(0, 80), note = String(p.note || '').trim().slice(0, 200);
    if (!name) fail_('請輸入姓名。');
    if (!school) fail_('請輸入學校名稱。');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail_('Email 格式不正確，核准後要寄帳號給你。');
    var lk = 'apply:' + email.toLowerCase();
    if (S.lockCheck(lk) >= 3) fail_('這個 Email 已經送出好幾次了，請等網管處理。');
    var all = S.listApps(), pend = all.filter(function (a) { return a.status === 'wait'; });
    if (pend.some(function (a) { return String(a.email).toLowerCase() === email.toLowerCase(); })) fail_('這個 Email 已經在等待核准了，請耐心等候。');
    if (pend.length >= 200) fail_('目前申請人數太多，請稍後再試。');
    S.lockFail(lk, 86400);
    S.saveApp({ id: 'A' + Date.now().toString(36).toUpperCase(), name: name, school: school, email: email, note: note, status: 'wait', createdAt: S.today(), teacherId: '' });
    return { ok: true };
  },
  adminApps: function (S, p) {
    authStaff_(S, p, true);
    return { apps: S.listApps().filter(function (a) { return a.status === 'wait'; }).map(function (a) { return { id: a.id, name: a.name, school: a.school, email: a.email, note: a.note, createdAt: a.createdAt }; }) };
  },
  adminApprove: function (S, p) {
    authStaff_(S, p, true);
    var a = S.listApps().filter(function (x) { return x.id === p.id; })[0];
    if (!a || a.status !== 'wait') fail_('這筆申請已經處理過了。');
    var r = API.adminAddTeacher(S, { tok: p.tok, name: a.name });
    a.status = 'ok'; a.teacherId = r.id; S.saveApp(a);
    var url = String(p.url || '').slice(0, 300);
    r.mailed = S.sendMail(a.email, '對戰吧！理化獸：老師帳號已開通',
      a.name + ' 老師您好：\n\n您申請的老師帳號已經開通。\n帳號：' + r.id + '\nPIN：' + r.pin + '\n' + (url ? '登入網址：' + url + '\n' : '') +
      '\n登入後請到「修改我的 PIN」換成自己記得的號碼。\n\n對戰吧！理化獸・作者：辛巴王');
    r.email = a.email; r.apps = API.adminApps(S, p).apps;
    return r;
  },
  adminReject: function (S, p) {
    authStaff_(S, p, true);
    var a = S.listApps().filter(function (x) { return x.id === p.id; })[0];
    if (!a || a.status !== 'wait') fail_('這筆申請已經處理過了。');
    a.status = 'no'; S.saveApp(a);
    return { apps: API.adminApps(S, p).apps };
  },
  adminResetTeacher: function (S, p) {
    authStaff_(S, p, true);
    var t = S.getTeacher(p.id); if (!t) fail_('找不到這位老師。');
    var pin = newPin6_(); t.pinHash = hashPin_(S, t.id, pin); S.saveTeacher(t);
    S.lockClear('staff:' + t.id.toLowerCase());
    return { id: t.id, name: t.name, pin: pin };
  },
  adminSetTeacher: function (S, p) {
    authStaff_(S, p, true);
    var t = S.getTeacher(p.id); if (!t) fail_('找不到這位老師。');
    if (p.name != null && String(p.name).trim()) t.name = String(p.name).trim().slice(0, 20);
    if (p.active != null) t.active = !!p.active;
    S.saveTeacher(t);
    return { teachers: API.adminTeachers(S, p).teachers };
  },
  adminAssignClass: function (S, p) {
    var who = authStaff_(S, p, true), cls = getClass_(S, p.code), owner = String(p.owner || '');
    if (owner && !S.getTeacher(owner)) fail_('找不到這位老師。');
    cls.owner = owner;
    var save = {}; for (var k in cls) if (k.charAt(0) !== '_') save[k] = cls[k];
    S.saveClass(save);
    return { classes: classesFor_(S, who) };
  },
  createClass: function (S, p) {
    var who = authStaff_(S, p);
    if (who.role !== 'teacher') fail_('網管帳號只管理老師帳號。班級請由老師用自己的帳號登入後建立。');
    var code = String(p.code || '').trim(), name = String(p.name || '').trim(), count = Number(p.count);
    if (!/^[A-Za-z0-9]{2,8}$/.test(code)) fail_('班級代碼請用 2～8 個英文字母或數字，例如 803。');
    if (!name) fail_('請輸入班級名稱。');
    if (!(count >= 1 && count <= 60 && Math.floor(count) === count)) fail_('學生人數請輸入 1～60。');
    if (S.getClass(code)) fail_('班級代碼 ' + code + ' 已經有人使用了（全校共用，不能重複）。');
    var cls = { code: code, name: name, count: count, scope: p.scope || [], createdAt: S.today(), owner: who.role === 'teacher' ? who.id : String(p.owner || '') };
    S.saveClass(cls);
    var list = [];
    for (var i = 1; i <= count; i++) list.push(newStudent_(code, i));
    S.addStudents(list);
    cls._today = S.today();
    return board_(S, cls);
  },
  board: function (S, p) {
    return board_(S, myClass_(S, authStaff_(S, p), p.code));
  },
  updateClass: function (S, p) {
    var cls = myClass_(S, authStaff_(S, p), p.code);
    if (p.name != null && String(p.name).trim()) cls.name = String(p.name).trim();
    if (p.scope) cls.scope = p.scope;
    if (p.gear != null) cls.gear = p.gear ? '1' : '0';
    if (p.count != null) {
      var n = Number(p.count);
      if (!(n >= 1 && n <= 60)) fail_('學生人數請輸入 1～60。');
      if (n > cls.count) {
        var add = [];
        for (var i = cls.count + 1; i <= n; i++) if (!S.getStudent(cls.code, i)) add.push(newStudent_(cls.code, i));
        if (add.length) S.addStudents(add);
        cls.count = n;
      }
    }
    if (p.names) {
      var list = S.listStudents(cls.code);
      list.forEach(function (st) {
        if (Object.prototype.hasOwnProperty.call(p.names, st.seat)) { st.name = String(p.names[st.seat] || '').slice(0, 12); S.saveStudent(st); }
      });
    }
    var save = {}; for (var k in cls) if (k.charAt(0) !== '_') save[k] = cls[k];
    S.saveClass(save);
    return board_(S, cls);
  },
  pins: function (S, p) {
    var cls = myClass_(S, authStaff_(S, p), p.code);
    return { cls: { code: cls.code, name: cls.name }, list: S.listStudents(cls.code).sort(function (a, b) { return a.seat - b.seat; })
      .map(function (st) { return { seat: st.seat, name: st.name, pin: st.pin, id: monsterId(st.code, st.seat) }; }) };
  },
  resetPin: function (S, p) {
    var cls = myClass_(S, authStaff_(S, p), p.code), st = S.getStudent(cls.code, Number(p.seat));
    if (!st) fail_('找不到這位學生。');
    st.pin = String(1000 + rnd_(9000)); S.saveStudent(st);
    return { seat: st.seat, pin: st.pin };
  },
  reward: function (S, p) {
    var cls = myClass_(S, authStaff_(S, p), p.code), seats = (p.seats || []).map(Number), amt = Number(p.amount) || 0, events = [];
    if (!seats.length) fail_('請先選擇學生。');
    if (['hatch', 'xp', 'hatchNow', 'egg'].indexOf(p.kind) < 0) fail_('獎勵種類不正確。');
    seats.forEach(function (seat) {
      var st = S.getStudent(cls.code, seat); if (!st) return;
      var ms = monsOf_(st), li = p.mi != null && ms[Number(p.mi)] ? Number(p.mi) : leadOf_(st, ms), ei = eggIndex_(ms);
      var ev = { seat: seat, hatchedNow: false, levelUps: 0, evolved: false, idx: li, newEgg: -1 };
      if (p.kind === 'hatch') { ev.hatchedNow = applyHatch_(ms[ei], amt); ev.idx = ei; }
      else if (p.kind === 'hatchNow') { ev.hatchedNow = applyHatch_(ms[ei], 100); ev.idx = ei; }
      else if (p.kind === 'egg') { ev.newEgg = grantEgg_(st, ms, true); }
      else { var pre = stageOf(ms[li].level), was = ms[li].hatched; ev.levelUps = applyXp_(ms[li], amt); st.totalXp = (Number(st.totalXp) || 0) + amt; ev.evolved = was && stageOf(ms[li].level) > pre; }
      if (ev.hatchedNow && ms[ev.idx]) ms[ev.idx].seenHatch = true; // 在白板上揭曉過了
      if (p.kind !== 'egg' || ev.newEgg < 0) ev.newEgg = Math.max(ev.newEgg, grantEgg_(st, ms));
      setMons_(st, ms); S.saveStudent(st);
      ev.mon = pub_(st, cls);
      events.push(ev);
    });
    var b = board_(S, cls); b.events = events;
    return b;
  },
  teacherRoster: function (S, p) {
    var cls = myClass_(S, authStaff_(S, p), p.code), roster = [], list = S.listStudents(cls.code), gm = gearOn_(cls) ? gearMap_(S, list) : {};
    list.sort(function (x1, x2) { return x1.seat - x2.seat; }).forEach(function (st) {
      var t = teamOf_(st); if (!t.length) return;
      var ms = monsOf_(st), li = leadOf_(st, ms), pick = t.filter(function (u) { return u.mi === li; })[0] || t.slice().sort(function (a, b) { return b.lv - a.lv; })[0];
      if (gm[st.key]) { pick.g = gm[st.key].sum; pick.gs = gearTxt_(gm[st.key]); }
      roster.push(pick);
    });
    if (!roster.length) fail_('班上還沒有孵化的理化獸，先讓同學完成每日訓練吧。');
    return { roster: roster, questions: [], xpWin: GAME.XP_WIN, xpLose: GAME.XP_LOSE };
  },
  teacherAward: function (S, p) {
    var cls = myClass_(S, authStaff_(S, p), p.code), events = [];
    [['win', p.draw ? GAME.XP_LOSE : GAME.XP_WIN], ['lose', GAME.XP_LOSE]].forEach(function (g) {
      (p[g[0]] || []).forEach(function (w) {
        var st = S.getStudent(cls.code, Number(w.seat)); if (!st) return;
        var ms = monsOf_(st), i = Number(w.mi); if (!ms[i] || !ms[i].hatched) return;
        var pre = stageOf(ms[i].level), ups = applyXp_(ms[i], g[1]);
        st.totalXp = (Number(st.totalXp) || 0) + g[1];
        if (g[0] === 'win' && !p.draw) st.wins++; else if (!p.draw) st.losses++;
        grantEgg_(st, ms); setMons_(st, ms); S.saveStudent(st);
        events.push({ seat: st.seat, idx: i, levelUps: ups, evolved: stageOf(ms[i].level) > pre, mon: pub_(st, cls) });
      });
    });
    var b = board_(S, cls); b.events = events;
    return b;
  },
  classQuestion: function (S, p) {
    var cls = myClass_(S, authStaff_(S, p), p.code);
    var scope = p.scope && p.scope.length ? p.scope : cls.scope;
    var idx = S.questionIndex().filter(function (q) { return inScope_(q, scope); });
    var skip = {}; (p.skip || []).forEach(function (id) { skip[id] = 1; });
    var pool = idx.filter(function (q) { return !skip[q.id]; });
    if (!pool.length) pool = idx;
    if (!pool.length) fail_('這個範圍沒有題目。');
    var q = S.getQuestions([pool[rnd_(pool.length)].id])[0];
    return { q: q, poolSize: idx.length };
  }
};

function battlesLeft_(S, st) {
  return st.battleDate === S.today() ? Math.max(0, GAME.BATTLES_PER_DAY - st.battleCount) : GAME.BATTLES_PER_DAY;
}

/* ---------- 自然科學島練功：從島上的存檔算出累積成績，換成理化獸經驗 ---------- */
function isleTally_(data) {
  var t = { q: 0, lab: 0, stamp: 0, bxp: 0 };
  Object.keys(data || {}).forEach(function (k) {
    var o; try { o = JSON.parse(data[k]); } catch (e) { return; }
    if (!o || typeof o !== 'object') return;
    if (/^sciIsles\.([A-OQ-Z]\.)?v1$/.test(k)) {
      var cnt = function (x) { return x && typeof x === 'object' ? Object.keys(x).filter(function (i) { return x[i]; }).length : 0; };
      t.q += cnt(o.answered); t.lab += cnt(o.labs); t.stamp += cnt(o.stamps);
    } else if (k === 'sciIsles.P.v1') {
      t.bxp = Math.max(0, Number(o.bxp) || 0);   // 競技島與各島挑戰者對戰贏到的經驗
    } else if (k === 'sciIsles.cap.v1' && o.a && typeof o.a === 'object') {
      Object.keys(o.a).forEach(function (id) { var r = o.a[id]; if (r && r[1] > 0) t.q++; });
    }
  });
  t.e = t.q * GAME.ISLE_XP_Q + t.lab * GAME.ISLE_XP_LAB + t.stamp * GAME.ISLE_XP_STAMP + t.bxp;
  return t;
}
function isleAward_(S, st, data) {
  var x = ext_(st), r = x.isle || (x.isle = { e: 0, d: '', x: 0 }), today = S.today();
  if (r.d !== today) { r.d = today; r.x = 0; }
  var t = isleTally_(data), owe = Math.max(0, t.e - r.e), give = GAME.ISLE_DAY_CAP > 0 ? Math.min(owe, Math.max(0, GAME.ISLE_DAY_CAP - r.x)) : owe;
  var out = { xp: 0, hatch: 0, levelUps: 0, evolved: false, hatchedNow: false, newEgg: -1, left: owe - give, todayXp: r.x, cap: GAME.ISLE_DAY_CAP, tally: t };
  if (give <= 0) return out;
  r.e += give; r.x += give;
  var ms = monsOf_(st), li = leadOf_(st, ms), lead = ms[li], ei = eggIndex_(ms), h = Math.max(1, Math.round(give / 5));
  if (lead.hatched) {
    var prev = stageOf(lead.level);
    out.levelUps = applyXp_(lead, give); out.evolved = stageOf(lead.level) > prev; out.xp = give;
    st.totalXp = (Number(st.totalXp) || 0) + give;
  }
  if (ei >= 0) { out.hatchedNow = applyHatch_(ms[ei], h); out.hatch = h; }
  out.newEgg = grantEgg_(st, ms);
  setMons_(st, ms);
  x.isle = r; out.todayXp = r.x;
  return out;
}
/* 學校版：島上的競技場直接用孵化吧的理化獸（只放已孵化的） */
function isleTeam_(st) {
  return monsOf_(st).filter(function (m) { return m.hatched; }).map(function (m) {
    return { el: m.element, lv: m.level, frac: Math.max(0, Math.min(0.999, (Number(m.xp) || 0) / needXp(m.level))) };
  });
}
API.isleLoad = function (S, p) {
  var a = authStudent_(S, p), st = a.st, sv = S.getIsle ? S.getIsle(st.key || (st.code + '-' + st.seat)) : null;
  return { team: isleTeam_(st), isle: pub_(st, a.cls).isle, data: sv ? sv.data : '', at: sv ? sv.at : 0, me: { code: st.code, seat: st.seat, name: st.name || '', clsName: a.cls.name || '' } };
};
API.isleSave = function (S, p) {
  var a = authStudent_(S, p), st = a.st, raw = String(p.data || '');
  if (raw.length > GAME.ISLE_MAX_CHARS) fail_('存檔太大，無法上傳。');
  var data; try { data = JSON.parse(raw || '{}'); } catch (e) { fail_('存檔格式不正確。'); }
  if (!data || typeof data !== 'object') fail_('存檔格式不正確。');
  Object.keys(data).forEach(function (k) { if (k.indexOf('sciIsles.') !== 0 || typeof data[k] !== 'string') delete data[k]; });
  var at = Date.now();
  if (S.putIsle) S.putIsle(st.key || (st.code + '-' + st.seat), JSON.stringify(data), at);
  var r = isleAward_(S, st, data);
  S.saveStudent(st);
  var me = pub_(st, a.cls);
  r.team = isleTeam_(st);
  r.at = at; r.mon = me.hatched ? me.monName + ' Lv' + me.level : '蛋 ' + me.hatch + '%';
  return r;
};

/* ---------- 課堂監控：學生頁面每分鐘回報一次在哪裡、有沒有在動（存在快取，不寫試算表） ---------- */
var LIVE_ON = 150000, LIVE_IDLE = 120000;   // 2.5 分鐘沒回報＝離線；2 分鐘沒操作＝發呆
API.ping = function (S, p) {
  var a = authStudent_(S, p), now = Date.now(), act = Math.max(0, Math.min(36e5, Number(p.act) || 0));
  S.liveSet(a.cls.code, a.st.seat, { t: now, a: now - act, v: p.vis !== false, w: String(p.where || '').slice(0, 40) });
  a.cls._today = S.today();
  return { ok: true, mission: misPub_(a.st, a.cls) };
};
API.liveBoard = function (S, p) {
  var who = authStaff_(S, p), cls = myClass_(S, who, p.code), list = S.listStudents(cls.code), now = Date.now(), today = S.today();
  var L = S.liveGet(cls.code, list.map(function (s) { return s.seat; })), out = {}, cnt = { g: 0, y: 0, x: 0 };
  list.forEach(function (st) {
    var l = L[st.seat], ans = st.todayDate === today ? st.todayAns || {} : {}, ks = Object.keys(ans), ok = ks.filter(function (k) { return ans[k] && ans[k].ok; }).length;
    var s = !l || now - l.t > LIVE_ON ? 'x' : (!l.v || now - l.a > LIVE_IDLE) ? 'y' : 'g';
    cnt[s]++;
    out[st.seat] = { s: s, w: l ? l.w : '', idle: l ? Math.round((now - l.a) / 1000) : null, seen: l ? Math.round((now - l.t) / 1000) : null, hid: l ? !l.v : false, n: ks.length, ok: ok };
  });
  return { live: out, count: cnt, at: now };
};
API.missionSet = function (S, p) {
  var cls = myClass_(S, authStaff_(S, p), p.code), goal = Math.round(Number(p.goal)), min = Math.round(Number(p.minutes)), amt = Math.round(Number(p.amount)), kind = p.kind === 'hatch' ? 'hatch' : 'xp';
  if (!(goal >= 1 && goal <= 30)) fail_('答對題數請設定 1～30 題。');
  if (!(min >= 5 && min <= 50)) fail_('時間請設定 5～50 分鐘。');
  if (!(amt >= 1 && amt <= (kind === 'xp' ? 200 : 50))) fail_('獎賞數量不正確。');
  var scope = Array.isArray(p.scope) ? p.scope.slice(0, 40).map(String) : [];
  if (!S.questionIndex().some(function (q) { return inScope_(q, scope); })) fail_('這個範圍裡沒有題目，請換一個範圍。');
  cls.mission = { id: 'M' + Date.now().toString(36), title: String(p.title || '').trim().slice(0, 30) || '本節任務', scope: scope, goal: goal, reward: { kind: kind, amount: amt }, ends: Date.now() + min * 60000, at: Date.now() };
  var save = {}; for (var k in cls) if (k.charAt(0) !== '_') save[k] = cls[k];
  S.saveClass(save); cls._today = S.today();
  return board_(S, cls);
};
API.missionEnd = function (S, p) {
  var cls = myClass_(S, authStaff_(S, p), p.code);
  cls.mission = {}; var save = {}; for (var k in cls) if (k.charAt(0) !== '_') save[k] = cls[k];
  S.saveClass(save); cls._today = S.today();
  return board_(S, cls);
};
/* 學生拿下一題任務題（不重複；題目用完就重新洗牌） */
API.missionQ = function (S, p) {
  var a = authStudent_(S, p), st = a.st, cls = a.cls; cls._today = S.today();
  if (!misOn_(cls)) fail_('現在沒有進行中的課堂任務。');
  var mi = misOf_(st, cls);
  if (mi.done) return { done: true, me: pub_(st, cls) };
  var pool = S.questionIndex().filter(function (q) { return inScope_(q, cls.mission.scope); });
  var left = pool.filter(function (q) { return mi.asked.indexOf(q.id) < 0; });
  if (!left.length) { mi.asked = []; left = pool; }
  var pick = left[rnd_(left.length)], q = S.getQuestions([pick.id])[0];
  mi.cur = q.id; mi.asked.push(q.id); if (mi.asked.length > 300) mi.asked = mi.asked.slice(-300);
  S.saveStudent(st);
  return { q: { id: q.id, stem: q.stem, A: q.A, B: q.B, C: q.C, D: q.D, image: q.image || '', book: q.book, chapter: q.chapter }, me: pub_(st, cls) };
};
API.missionA = function (S, p) {
  var a = authStudent_(S, p), st = a.st, cls = a.cls; cls._today = S.today();
  if (!misOn_(cls)) fail_('課堂任務已經結束了。');
  var mi = misOf_(st, cls), qid = String(p.qid), choice = String(p.choice || '').toUpperCase();
  if (mi.cur !== qid) fail_('這題已經作答過了，請按下一題。');
  if (['A', 'B', 'C', 'D'].indexOf(choice) < 0) fail_('請選擇 A、B、C 或 D。');
  var q = S.getQuestions([qid])[0]; if (!q) fail_('題庫裡找不到這題。');
  var ok = choice === String(q.answer).trim().toUpperCase(), res = { correct: ok, answer: q.answer, explanation: q.explanation };
  mi.cur = ''; mi.n++; if (ok) mi.ok++;
  st.answered++; if (ok) st.correct++;
  if (ok && !mi.done && mi.ok >= cls.mission.goal) {
    mi.done = true; res.finished = true;
    var ms = monsOf_(st), li = leadOf_(st, ms), ei = eggIndex_(ms), r = cls.mission.reward;
    if (r.kind === 'hatch' && ei >= 0) { res.hatchedNow = applyHatch_(ms[ei], r.amount); res.hatchedIdx = ei; }
    else { var pre = stageOf(ms[li].level), was = ms[li].hatched; res.levelUps = applyXp_(ms[li], r.amount); st.totalXp = (Number(st.totalXp) || 0) + r.amount; res.evolved = was && stageOf(ms[li].level) > pre; res.evolvedIdx = li; }
    res.newEgg = grantEgg_(st, ms); setMons_(st, ms);
  }
  S.saveStudent(st);
  S.logAnswer({ code: st.code, seat: st.seat, qid: qid, choice: choice, ok: ok });
  res.me = pub_(st, cls);
  return res;
};
var WRITE_ACTIONS = { missionSet: 1, missionEnd: 1, missionQ: 1, missionA: 1, teacherApply: 1, adminApprove: 1, adminReject: 1, teacherLogin: 1, changePin: 1, adminAddTeacher: 1, adminResetTeacher: 1, adminSetTeacher: 1, adminAssignClass: 1, isleSave: 1, studentLogin: 1, setLead: 1, daily: 1, answer: 1, seenHatch: 1, battleStart: 1, battleGo: 1, battleEnd: 1, createClass: 1, updateClass: 1, resetPin: 1, reward: 1, teacherAward: 1 };

function runApi_(S, action, payload) {
  try {
    var fn = API[action];
    if (!fn) fail_('未知的動作：' + action);
    return JSON.stringify({ ok: true, data: fn(S, payload || {}) });
  } catch (e) {
    return JSON.stringify({ ok: false, error: String((e && e.message) || e) });
  }
}

/* 服裝規則（與自然科學島 gear.js 相同） */
var GEAR_SRV = (function () { var window = {};
/* 服裝加成：穿在身上的已解鎖服裝會讓理化獸稍微變強
 * 套裝分三種（同一座島穿滿 3 件；那座島的服裝不到 3 個部位時，穿滿全部部位）：
 *   神裝        只加持那一系，數值高，另有專屬能力（暴擊、吸血、反擊…）
 *   屬性普裝    只加持那一系，數值約神裝一半
 *   全屬性普裝  全隊都加一點
 * 同時湊到好幾套，效果全部疊加（每項有上限）。 */
(function(){
'use strict';
var CAT={hat:{atk:2},top:{def:2},bottom:{hp:2},scarf:{spd:1},acc:{heal:3},back:{hp:3},glasses:{ball:3},shoe:{spd:1}};
var EL_KEY=[['elec',/閃電|線圈|特斯拉|電池|磁|電阻|色環/],['fire',/火|熔|太陽|燒瓶|仙女棒/],['water',/波浪|潛水|衝浪|雨|海|泡泡|溫泉|救生/],['wood',/葉|樹|芽|花|菇|豌豆|青蛙|鳥巢|細胞|DNA|白血球|心臟|恐龍尾/],['earth',/岩|化石|地質|礦|水晶|菊石|三葉蟲|恐龍頭骨|地層|火山|鏟|錘|考古/]];
/* 特殊服裝；crit 暴擊率、steal 吸血、counter 反擊 */
var SPECIAL={'太空人頭盔':{ult:5},'護目鏡':{ball:5},'會考塔帽':{atk:3,def:3},'金色桂冠':{atk:3,def:3,hp:3},'鑽石王冠':{def:4,counter:10},'七彩光環':{gauge:1},'科學獎章':{atk:2,def:2},'火焰圍巾':{spd:2,crit:5},'聽診器':{heal:6},'星空披風':{ult:3},'望遠鏡':{ball:4},
  '特斯拉線圈帽':{crit:5},'閃電披風':{crit:6},'地質錘':{crit:5},'仙女棒':{crit:4},
  '白血球小兵帽':{steal:5},'心臟光環':{steal:6},'菇菇帽':{steal:4},'DNA 光環':{steal:4},
  '恐龍尾巴':{counter:10},'三葉蟲背包':{counter:8},'護膝護肘':{counter:8},'菊石髮飾':{counter:6}};
var LABEL={atk:'攻擊',def:'防禦',hp:'血量',spd:'速度',heal:'治療',ball:'防守球變慢',ult:'大招傷害',gauge:'開場集氣',crit:'暴擊率',steal:'吸血',counter:'反擊'};
var ELN={fire:'火',water:'水',wood:'木',earth:'土',elec:'電'},ELS=['fire','water','wood','earth','elec'];
/* 每座島的套裝等級 */
var TIERS={J:['god','fire'],K:['god','water'],L:['god','wood'],H:['god','earth'],Q:['god','elec'],
  B:['el','fire'],F:['el','water'],D:['el','wood'],I:['el','earth'],A:['el','elec'],
  C:['all'],E:['all'],G:['all'],M:['all'],N:['all']};
var GOD={atk:8,hp:6,def:4},PERK={fire:{crit:15},water:{ult:12},wood:{steal:12},earth:{counter:30},elec:{gauge:1,spd:2}},ELSET={atk:4,hp:3},ALLSET={hp:5,atk:2};
function tierOf(I){var t=TIERS[I];return t?{tier:t[0],el:t[1]||''}:{tier:'all',el:''}}
function tierName(I){var t=tierOf(I);return t.tier==='god'?ELN[t.el]+'系神裝':t.tier==='el'?ELN[t.el]+'系套裝':'全屬性套裝'}
function itemBonus(cat,name,code){
  if(!code)return null;var b={};var base=CAT[cat];if(base)for(var k in base)b[k]=base[k];
  if(SPECIAL[name]){var s=SPECIAL[name];for(k in s)b[k]=(b[k]||0)+s[k]}
  for(var i=0;i<EL_KEY.length;i++)if(EL_KEY[i][1].test(name)){b['el_'+EL_KEY[i][0]]=4;break}
  return b}
function one(k,v){if(k==='spd')return'速度 +'+v;if(k==='gauge')return'開場集氣 +'+v+' 格';if(k==='crit')return'暴擊率 +'+v+'%';if(k==='steal')return'吸血 '+v+'%';if(k==='counter')return'反擊 '+v+'%';return LABEL[k]+' +'+v+'%'}
function fmt(b){if(!b)return'';var out=[],per={};for(var k in b){var v=b[k];if(!v)continue;
    if(k.indexOf('el_')===0)out.push(ELN[k.slice(3)]+'系攻擊 +'+v+'%');
    else if(k.indexOf('p_')===0){var p=k.split('_');(per[p[1]]=per[p[1]]||[]).push(one(p[2],v))}
    else if(LABEL[k])out.push(one(k,v))}
  ELS.forEach(function(e){if(per[e])out.push(ELN[e]+'系：'+per[e].join('、'))});
  return out.join('・')}
function short(b){if(!b)return'';var S={crit:'暴',steal:'吸',counter:'反'};for(var k in b){var v=b[k];if(k.indexOf('el_')===0)continue;if(S[k])return S[k]+v+'%';return (k==='spd'?'速':k==='gauge'?'氣':LABEL[k][0])+'+'+v+(k==='spd'||k==='gauge'?'':'%')}for(k in b)return ELN[k.slice(3)]+'+'+b[k]+'%';return''}
var NEED={};function need(I,items){var key=I+(items===window.GEAR_ITEMS?'g':'a');if(NEED[key])return NEED[key];var c={};Object.keys(items||{}).forEach(function(cat){var o=items[cat];if(!o||!o.lock||!o.names)return;o.lock.forEach(function(x){if(x&&String(x)[0]===I)c[cat]=1})});return NEED[key]=Math.max(1,Math.min(3,Object.keys(c).length))}
function add(sum,k,v){sum[k]=(sum[k]||0)+v}
/* 由穿搭算出總加成：sum 裡 p_火系_攻擊 這類鍵只套用在那一系的理化獸 */
function total(avatar,items){var sum={},src=[],isl={};if(!avatar||!items)return{sum:sum,list:src,set:null,sets:[]};
  Object.keys(items).forEach(function(cat){var o=items[cat],i=avatar[cat];if(i==null||!o.names||!o.lock)return;var code=o.lock[i];if(!code)return;var nm=o.names[i],b=itemBonus(cat,nm,code);if(!b)return;
    src.push({name:nm,b:b});for(var k in b)add(sum,k,b[k]);var I=String(code)[0];if(/[A-Q]/.test(I))isl[I]=(isl[I]||0)+1});
  var sets=[];Object.keys(isl).forEach(function(I){if(isl[I]<need(I,items))return;var t=tierOf(I);sets.push({isl:I,n:isl[I],tier:t.tier,el:t.el,name:tierName(I)});
    if(t.tier==='god'){for(var k in GOD)add(sum,'p_'+t.el+'_'+k,GOD[k]);var pk=PERK[t.el];for(k in pk)add(sum,'p_'+t.el+'_'+k,pk[k])}
    else if(t.tier==='el'){for(k in ELSET)add(sum,'p_'+t.el+'_'+k,ELSET[k])}
    else for(k in ALLSET)add(sum,k,ALLSET[k])});
  var CAP={atk:10,def:10,hp:12,spd:4,heal:12,ball:10,ult:8,gauge:1,crit:15,steal:12,counter:25},PCAP={atk:16,hp:12,def:8,spd:3,gauge:1,ult:15,crit:30,steal:24,counter:50};
  for(var k in sum){var c=k.indexOf('el_')===0?8:k.indexOf('p_')===0?PCAP[k.split('_')[2]]:CAP[k];if(c!=null&&sum[k]>c)sum[k]=c}
  var tr={god:0,el:1,all:2};sets.sort(function(a,b){return tr[a.tier]-tr[b.tier]||b.n-a.n});
  return{sum:sum,list:src,set:sets[0]||null,sets:sets}}
window.GEAR={itemBonus:itemBonus,fmt:fmt,short:short,total:total,LABEL:LABEL,need:need,tierOf:tierOf,tierName:tierName};
})();

window.GEAR_ITEMS={"style":{"names":["短髮","鮑伯頭","包包頭","馬尾","刺蝟頭","爆炸頭"],"lock":[0,0,0,0,0,"Q1"]},"hat":{"names":["不戴","毛線帽","貝雷帽","鴨舌帽","草帽","學士帽","安全帽","運動頭帶","耳罩","護目鏡","竹蜻蜓帽","太陽能帽","廚師帽","嫩芽髮飾","探險頭燈","星球髮飾","耳機","潛水蛙鏡","七彩光環","小吃店帽","小風扇帽","特斯拉線圈帽","夜光睡帽","太陽髮箍","風向標帽","漁夫帽","迷你地球儀帽","考古帽","菊石髮飾","恐龍頭骨帽","冒泡燒瓶帽","太空人頭盔","漏斗帽","鑽石王冠","顯微鏡頭飾","小花頭環","白血球小兵帽","心臟光環","豌豆花頭飾","恐龍帽","菇菇帽","DNA 光環","鳥巢帽","巡守員帽","小樹苗頭飾","綠葉光環","風車頭飾","永續光環","齒輪光環","會考塔帽","金色桂冠","雲朵帽"],"lock":[0,"A1","A2","A4","A8","Aall","E4","E3","E7","Eall","E12","B1","B9","B10","Ball","E18","K2","K6","Kall","Q4","Q7","Qall","I6","I7","I9","I16","Iall","H1","H4","Hall","Jall","Fall","C1","Call","D1","D12","D18","Dall","G6","G11","G16","Gall","L5","L14","L11","Lall","N11","Nall","Mall","Ztop1","Zex80","Iall"]},"top":{"names":["T恤","高領毛衣","連帽外套","實驗白袍","工作圍裙","救生衣","運動外套","閃電T恤","鐵匠圍裙","探險背心","波浪T恤","火山T恤","黃色雨衣","地層T恤","平衡T恤","大氣層T恤"],"lock":[0,"A7","A6","A9","E6","E8","E9","B5","B8","B13","K1","I5","I11","H5","J13","F7"]},"bottom":{"names":["長褲","短褲","裙子","吊帶褲","沙灘短褲","雨靴"],"lock":[0,0,"A5","E5","B7","I14"]},"scarf":{"names":["不戴","圍巾","領結","望遠鏡","溫泉毛巾","彩虹領巾","色環圍巾","四季圍巾","三葉蟲領巾","酸鹼領巾","月相領巾","色層領巾","聽診器","DNA 領巾","綠葉領巾","科學獎章","火焰圍巾"],"lock":[0,"A3","E13","E2","B6","K9","Q3","I8","H10","J9","F10","C3","D7","G7","L1","M1","Zst7"]},"acc":{"names":["無","背包","提袋","背心","工具腰包","氣球","搬運手套","護膝護肘","滑板","法國麵包","手電筒","放大鏡","電池背包","U 型磁鐵","線圈手環","沙灘小鏟子","地質錘","雨傘","化石刷","電子天平","仙女棒","紫水晶","探空氣球","石墨鉛筆"],"lock":[0,0,0,0,"E1","E16","B2","B3","B4","B11","K4","K7","Q2","Q5","Q6","I1","I2","I13","H2","J2","J4","F3","F6","C6"]},"back":{"names":["不背","星空披風","吉他","閃電披風","風箏","衝浪板","恐龍尾巴","泡泡瓶背包","土星環背包","分子模型背包","細胞抱枕背包","三葉蟲背包","青蛙背包","回收背包"],"lock":[0,"E17","K3","Q8","I12","I15","H8","J15","F8","C5","D2","G15","L4","N3"]},"glasses":{"names":["不戴","普通","太陽眼鏡","圓框"],"lock":[0,0,"K5","K8"]}};

return { G: window.GEAR, I: window.GEAR_ITEMS }; })();

/* ===== 示範版：資料只存在這個瀏覽器，正式版改存 Google 試算表 ===== */

/* ===== 對戰吧！理化獸：Firebase 版資料層 =====
 * 遊戲規則（logic.js）原封不動，只把「資料存哪裡」換成 Firebase：
 *   - 網管、老師：Google 登入（老師名單由網管核准）
 *   - 學生：班級代碼＋座號＋PIN（用 Firebase 帳號驗證，帳號由老師建立班級時一起開好）
 *   - 資料放在 Realtime Database，由資料庫規則決定誰能讀寫
 * 這個檔案會被包進 hatch-fb.js，放在 logic.js 後面。作者：辛巴王 */
var SUF = '@hatch';                       // 學生密碼 = PIN + 固定尾巴（Firebase 密碼至少 6 碼）
var FBX = (function () {
  var cfg = window.FB_CONFIG;
  var appS = firebase.initializeApp(cfg, 'staff'), appT = firebase.initializeApp(cfg, 'stu'), appX = firebase.initializeApp(cfg, 'sec');
  var dbS = appS.database(), dbT = appT.database();
  var C = { teachers: {}, apps: {}, classes: {}, students: {}, pins: {}, gear: {}, isle: {}, live: {} };
  var ME = null;                          // 目前的老師／網管 { role, id, name }
  var STU = null;                         // 目前的學生 { code, seat, pin }
  var CUR = { db: dbS };                  // 這次動作寫入用的資料庫
  var PEND = [], TASKS = [];
  var LISTEN = {};

  function today(off) {
    var d = new Date(Date.now() + (off || 0));
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d); } catch (e) { return d.toISOString().slice(0, 10); }
  }
  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  function ekey(email) { return String(email || '').trim().toLowerCase().replace(/\./g, ','); }
  function nice(e) {
    var c = e && e.code || '', m = String(e && e.message || e || '');
    if (/permission[_ ]denied/i.test(c + m)) return '沒有權限做這件事，請重新登入，或請網管確認資料庫規則。';
    if (/network|unavailable|offline/i.test(c + m)) return '連線失敗，請檢查網路後再試。';
    return m;
  }
  function put(path, val) { PEND.push(CUR.db.ref(path).set(val === undefined ? null : clone(val))); }
  function norm(code, seat, r) {
    var d = newStudent_(code, seat), o = {};
    for (var k in d) o[k] = d[k];
    for (var k2 in r) o[k2] = r[k2];
    if (!o.ext || typeof o.ext !== 'object') o.ext = {};
    if (!Array.isArray(o.ext.mons)) o.ext.mons = o.ext.mons ? Object.keys(o.ext.mons).map(function (i) { return o.ext.mons[i]; }) : [];
    ['todayQs', 'mastered', 'wrong'].forEach(function (f) { if (!Array.isArray(o[f])) o[f] = o[f] ? Object.keys(o[f]).map(function (i) { return o[f][i]; }) : []; });
    if (!o.todayAns || typeof o.todayAns !== 'object') o.todayAns = {};
    o.seat = Number(seat); o.code = String(code); o.key = code + '-' + seat;
    var pin = C.pins[code] && C.pins[code][seat] && C.pins[code][seat].pin;
    o.pin = (STU && STU.code === String(code) && STU.seat === Number(seat)) ? STU.pin : (pin || '');
    return o;
  }
  /* 讀一次、之後即時同步 */
  function watch(db, path, onVal) {
    var key = (db === dbS ? 'S:' : 'T:') + path;
    if (LISTEN[key]) return LISTEN[key];
    LISTEN[key] = new Promise(function (ok, no) {
      var first = true;
      db.ref(path).on('value', function (s) { onVal(s.val()); if (first) { first = false; ok(); } },
        function (e) { delete LISTEN[key]; if (first) { first = false; no(e); } });
    });
    return LISTEN[key];
  }
  function ensureClass(db, code, staff) {
    var j = [watch(db, 'classes/' + code, function (v) { if (v) C.classes[code] = v; else delete C.classes[code]; }),
      watch(db, 'students/' + code, function (v) { C.students[code] = v || {}; })];
    j.push(watch(db, 'gear/' + code, function (v) { C.gear[code] = v || {}; }));
    if (staff) {
      j.push(watch(db, 'pins/' + code, function (v) { C.pins[code] = v || {}; }));
      j.push(watch(db, 'live/' + code, function (v) { C.live[code] = v || {}; }));
    }
    return Promise.all(j);
  }
  function drop() { LISTEN = {}; C = { teachers: {}, apps: {}, classes: {}, students: {}, pins: {}, gear: {}, isle: {}, live: {} }; }

  var Store = {
    today: function () { return today(); }, yesterday: function () { return today(-864e5); },
    adminAccount: function () { return { id: '', ok: function () { return false; } }; },
    hash: function (s) { return s; },
    tokNew: function (who) { return 'fb'; },
    tokGet: function (t) { return ME && t === 'fb' ? clone(ME) : null; },
    tokDel: function () {},
    lockCheck: function () { return 0; }, lockFail: function () {}, lockClear: function () {},
    liveSet: function (code, seat, o) { PEND.push(dbT.ref('live/' + code + '/' + seat).set(o)); },
    liveGet: function (code, seats) { var m = C.live[code] || {}, out = {}; seats.forEach(function (s) { if (m[s]) out[s] = m[s]; }); return out; },
    listApps: function () { return Object.keys(C.apps || {}).map(function (k) { return clone(C.apps[k]); }); },
    saveApp: function (a) { C.apps[a.id] = clone(a); put('apps/' + a.id, a); },
    sendMail: function () { return false; },
    listTeachers: function () { return Object.keys(C.teachers).map(function (k) { return clone(C.teachers[k]); }); },
    getTeacher: function (id) { var t = C.teachers[ekey(id)] || C.teachers[id]; return t ? clone(t) : null; },
    saveTeacher: function (t) { C.teachers[t.id] = clone(t); put('teachers/' + t.id, t); },
    delTeacher: function (id) { delete C.teachers[id]; put('teachers/' + id, null); },
    delClass: function (code) {
      code = String(code); var pn = C.pins[code] || {};
      Object.keys(pn).forEach(function (s) { if (pn[s] && pn[s].uid) put('users/' + pn[s].uid, null); });
      ['students', 'gear', 'isle', 'live', 'pins', 'rooms'].forEach(function (n) { put(n + '/' + code, null); });
      put('classes/' + code, null);
      delete C.classes[code]; delete C.students[code]; delete C.pins[code]; delete C.gear[code]; delete C.live[code];
    },
    listClasses: function () { return Object.keys(C.classes).map(function (k) { return clone(C.classes[k]); }); },
    getClass: function (code) { var c = C.classes[String(code)]; return c ? norm_cls(c) : null; },
    saveClass: function (cls) { var c = clone(cls); delete c._today; C.classes[c.code] = c; put('classes/' + c.code, c); },
    listStudents: function (code) { var m = C.students[String(code)] || {}; return Object.keys(m).map(function (s) { return norm(code, s, m[s]); }); },
    getStudent: function (code, seat) { var m = C.students[String(code)] || {}, r = m[Number(seat)]; return r ? norm(code, Number(seat), r) : null; },
    saveStudent: function (st) {
      var rec = clone(st), pin = rec.pin; delete rec.pin; delete rec.key;
      (C.students[st.code] = C.students[st.code] || {})[st.seat] = rec;
      put('students/' + st.code + '/' + st.seat, rec);
      var old = C.pins[st.code] && C.pins[st.code][st.seat];
      if (ME && old && pin && old.pin !== pin) TASKS.push(function () { return changePw(st.code, st.seat, old.pin, pin); });
    },
    addStudents: function (list) {
      list.forEach(function (st) {
        var rec = clone(st), pin = rec.pin; delete rec.pin; delete rec.key;
        (C.students[st.code] = C.students[st.code] || {})[st.seat] = rec;
        put('students/' + st.code + '/' + st.seat, rec);
        TASKS.push(function () { return makeAccount(st.code, st.seat, pin); });
      });
    },
    questionIndex: function () { return QSRC().map(function (q) { return { id: q.id, book: q.book, chapter: q.chapter }; }); },
    getQuestions: function (ids) { var m = {}; QSRC().forEach(function (q) { m[q.id] = q; }); return ids.map(function (id) { return m[id]; }).filter(Boolean); },
    getIsle: function (key) { var v = C.isle[key]; return v ? clone(v) : null; },
    putIsle: function (key, data, at) {
      C.isle[key] = { data: data, at: at };
      var p = key.split('-'), code = p[0], seat = p[1];
      PEND.push(dbT.ref('isle/' + code + '/' + seat).set({ data: data, at: at }));
      var g = gearFromData_(data) || null;
      (C.gear[code] = C.gear[code] || {})[seat] = g;
      PEND.push(dbT.ref('gear/' + code + '/' + seat).set(g));
    },
    logAnswer: function () {}
  };
  function norm_cls(c) {
    var o = clone(c);
    if (!Array.isArray(o.scope)) o.scope = o.scope ? Object.keys(o.scope).map(function (i) { return o.scope[i]; }) : [];
    return o;
  }
  /* 完整題庫（歷屆會考題 535 題）放在 bank.json，第一次需要時才下載，之後瀏覽器會留著 */
  var BANK = null, BANKP = null;
  function QSRC() { return BANK || []; }
  function loadBank() {
    if (BANK) return Promise.resolve();
    return BANKP = BANKP || fetch('bank.json?v=1').then(function (r) { if (!r.ok) throw new Error('題庫下載失敗'); return r.json(); }).then(function (j) { BANK = j; }, function (e) { BANKP = null; throw new Error('題庫下載失敗，請檢查網路後再試。'); });
  }

  /* ---------- 學生帳號 ---------- */
  function sEmail(code, seat) { return String(code).toLowerCase() + '-' + Number(seat) + '@hatch.invalid'; }
  function makeAccount(code, seat, pin) {
    return appX.auth().createUserWithEmailAndPassword(sEmail(code, seat), pin + SUF).then(function (cr) {
      var uid = cr.user.uid;
      return appX.auth().signOut().then(function () {
        return Promise.all([dbS.ref('users/' + uid).set(code + '-' + seat), dbS.ref('pins/' + code + '/' + seat).set({ pin: pin, uid: uid })]);
      });
    }, function (e) {
      if (e.code === 'auth/email-already-in-use') throw new Error(code + ' 班 ' + seat + ' 號的帳號已經存在（這個班級代碼曾經用過），請換一個班級代碼。');
      if (e.code === 'auth/too-many-requests' || e.code === 'auth/quota-exceeded') throw new Error('一次開太多帳號被暫時擋住了，請等 1 小時後再建立班級。');
      throw e;
    });
  }
  function changePw(code, seat, oldPin, newPin) {
    var au = appX.auth();
    return au.signInWithEmailAndPassword(sEmail(code, seat), oldPin + SUF).then(function (cr) {
      return cr.user.updatePassword(newPin + SUF).then(function () { return au.signOut(); });
    }).then(function () { return dbS.ref('pins/' + code + '/' + seat + '/pin').set(newPin); }, function (e) {
      throw new Error('重設失敗：這位學生的帳號和 PIN 對不上（' + (e.code || e.message) + '）。');
    });
  }
  function studentIn(p) {
    var code = String(p.code || '').trim(), seat = Number(p.seat), pin = String(p.pin || '').trim();
    if (!code || !seat) throw new Error('請輸入班級代碼和座號。');
    if (STU && STU.code === code && STU.seat === seat && STU.pin === pin && appT.auth().currentUser) return Promise.resolve();
    return appT.auth().signInWithEmailAndPassword(sEmail(code, seat), pin + SUF).then(function () {
      STU = { code: code, seat: seat, pin: pin };
    }, function (e) {
      if (e.code === 'auth/too-many-requests') throw new Error('PIN 錯太多次，請稍後再試，或請老師確認 PIN。');
      if (/network/.test(e.code || '')) throw new Error('連線失敗，請檢查網路後再試。');
      throw new Error('PIN 碼不正確，請向老師確認（也請確認班級代碼和座號）。');
    });
  }

  /* ---------- 老師與網管 ---------- */
  function staffSetup(user) {
    var k = ekey(user.email);
    return dbS.ref('admin/ping').once('value').then(function () { return true; }, function () { return false; }).then(function (isAdmin) {
      if (isAdmin) {
        ME = { role: 'admin', id: 'admin', name: '網管' };
        return Promise.all([
          watch(dbS, 'teachers', function (v) { C.teachers = v || {}; }),
          watch(dbS, 'apps', function (v) { C.apps = v || {}; }),
          watch(dbS, 'classes', function (v) { C.classes = v || {}; })
        ]).then(function () { return Promise.all(Object.keys(C.classes).map(function (c) { return ensureClass(dbS, c, true); })); });
      }
      return dbS.ref('teachers/' + k).once('value').then(function (s) {
        var t = s.val();
        if (!t) throw new Error('這個 Google 帳號（' + user.email + '）還沒有核准。請先申請老師帳號，等網管核准後再登入。');
        if (t.active === false) throw new Error('這個老師帳號已停用，請洽網管。');
        C.teachers[k] = t; ME = { role: 'teacher', id: k, name: t.name };
        return watch(dbS, 'teachers/' + k, function (v) { if (v) C.teachers[k] = v; });
      }).then(function () {
        return new Promise(function (ok, no) {
          var first = true;
          dbS.ref('classes').orderByChild('owner').equalTo(k).on('value', function (s) {
            C.classes = s.val() || {};
            var j = Object.keys(C.classes).map(function (c) { return ensureClass(dbS, c, true); });
            Promise.all(j).then(function () { if (first) { first = false; ok(); } }, function (e) { if (first) { first = false; no(e); } });
          }, no);
        });
      });
    });
  }
  function staffIn(fresh) {
    var au = appS.auth();
    var u = au.currentUser ? Promise.resolve(au.currentUser) : new Promise(function (ok) { var off = au.onAuthStateChanged(function (x) { off(); ok(x); }); });
    return u.then(function (user) {
      if (!user && !fresh) throw new Error('登入已過期，請重新登入。');
      if (!user) { return au.signInWithPopup(new firebase.auth.GoogleAuthProvider()).then(function (r) { return r.user; }, function (e) {
        if (e.code === 'auth/popup-blocked') throw new Error('瀏覽器擋掉了登入視窗，請允許彈出視窗後再按一次。');
        if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') throw new Error('登入視窗被關掉了，請再按一次。');
        if (e.code === 'auth/unauthorized-domain') throw new Error('這個網址還沒加進 Firebase 的授權網域。');
        throw e; }); }
      return user;
    }).then(function (user) { return ME ? null : staffSetup(user); });
  }

  /* ---------- 入口：取代原本的伺服器呼叫 ---------- */
  var STAFF_ACT = /^(teacherLogin|logout|changePin|admin|board|updateClass|createClass|pins|resetPin|reward|teacherRoster|teacherAward|classQuestion|liveBoard|mission(Set|End)$|room(T|Open|Close|Assign|Team))/;
  function run(action, p) {
    var r = JSON.parse(runApi_(Store, action, p));
    if (!r.ok) throw new Error(r.error);
    return r.data;
  }
  function call(action, payload) {
    var p = payload || {}, staff = STAFF_ACT.test(action) || (!!p.tok && !p.pin), stu = !staff && p.code != null && p.pin != null && action !== 'teacherApply';
    var pre;
    var needQ = /^(bankInfo|daily|answer|classQuestion|mission(Set|Q|A))$/.test(action);
    if (action === 'teacherLogin' && !p.id) pre = staffIn(!p.tok);
    else if (action === 'logout') { ME = null; drop(); return appS.auth().signOut().then(function () { return {}; }); }
    else if (staff && action !== 'teacherApply') pre = staffIn(false);
    else if (stu) pre = Promise.resolve().then(function () { return studentIn(p); }).then(function () { return Promise.all([ensureClass(dbT, STU.code, false), watch(dbT, 'isle/' + STU.code + '/' + STU.seat, function (v) { C.isle[STU.code + '-' + STU.seat] = v || null; if (!v) delete C.isle[STU.code + '-' + STU.seat]; })]); });
    else pre = Promise.resolve();
    CUR.db = staff ? dbS : dbT;
    return pre.then(function () { return needQ ? loadBank() : null; }).then(function () {
      if (staff && p.code && ME) { var cc = String(p.code).trim(); return action === 'createClass' ? watch(dbS, 'classes/' + cc, function (v) { if (v) C.classes[cc] = v; else delete C.classes[cc]; }) : ensureClass(dbS, cc, true); }
    }).then(function () {
      CUR.db = staff ? dbS : dbT;
      if (action === 'teacherLogin') p = { tok: 'fb' };
      else if (staff && !p.tok) p = Object.assign({}, p, { tok: 'fb' });
      else if (staff) p = Object.assign({}, p, { tok: 'fb' });
      var data = run(action, p), mine = PEND, tasks = TASKS; PEND = []; TASKS = [];
      return Promise.all(mine).then(function () {
        return tasks.reduce(function (a, t) { return a.then(t); }, Promise.resolve());
      }).then(function () { return data; });
    }).catch(function (e) { PEND = []; TASKS = []; throw new Error(nice(e)); });
  }

  /* ---------- 白板作戰：老師白板 ⇄ 學生手機 ----------
   * rooms/{班級}/open      老師開放中（學生才會心跳、才看得到加入）
   * rooms/{班級}/presence  學生手機心跳（誰的手機在線，能被叫去操作）
   * rooms/{班級}/joined    學生按了「加入白板作戰」
   * rooms/{班級}/state     戰鬥狀態（哪些座號在場上）
   * rooms/{班級}/turn      輪到誰、要做什麼；手機回 ack（收到）與 resp（結果） */
  var Room = {
    T: {
      reset: function (code) { return dbS.ref('rooms/' + code).set({ open: true, at: Date.now() }); },
      close: function (code) { return dbS.ref('rooms/' + code).set(null); },
      state: function (code, o) { return dbS.ref('rooms/' + code + '/state').set(o); },
      watch: function (code, cb) {
        var seen = {}, pressed = [], lastKey = '', ref = dbS.ref('rooms/' + code);
        function calc() {
          var now = Date.now(), on = [];
          Object.keys(seen).forEach(function (s) { if (now - seen[s].t < 25000) on.push(Number(s)); });
          var k = JSON.stringify([on, pressed]); if (k !== lastKey) { lastKey = k; cb({ online: on, pressed: pressed }); }
        }
        ref.child('presence').on('value', function (snap) {
          var v = snap.val() || {};
          Object.keys(v).forEach(function (s) { var n = v[s] && v[s].n; if (!seen[s] || seen[s].n !== n) seen[s] = { n: n, t: Date.now() }; });
          calc();
        });
        ref.child('joined').on('value', function (snap) { pressed = Object.keys(snap.val() || {}).map(Number).sort(function (a, b) { return a - b; }); calc(); });
        var timer = setInterval(calc, 4000);
        return function () { ref.child('presence').off(); ref.child('joined').off(); clearInterval(timer); };
      },
      /* 叫某位同學的手機做一件事，回傳 {noack}｜{timeout}｜{v:結果} */
      turn: function (code, d) {
        var base = dbS.ref('rooms/' + code), id = d.id;
        return base.child('turn').set({ id: id, seat: d.seat, kind: d.kind, data: JSON.parse(JSON.stringify(d.data || {})), wait: d.wait, at: Date.now() }).then(function () {
          return new Promise(function (res) {
            var acked = false, done = false, t1, t2, ra = base.child('ack/' + id), rr = base.child('resp/' + id);
            function fin(v) {
              if (done) return; done = true; ra.off(); rr.off(); clearTimeout(t1); clearTimeout(t2);
              base.child('turn').set(null); ra.set(null); rr.set(null); res(v);
            }
            ra.on('value', function (s) { if (s.val()) acked = true; });
            rr.on('value', function (s) { var v = s.val(); if (v) fin({ v: v }); });
            t1 = setTimeout(function () { if (!acked) fin({ noack: true }); }, 6000);
            t2 = setTimeout(function () { fin({ timeout: true }); }, d.wait || 20000);
          });
        }, function () { return { noack: true }; });
      }
    },
    S: {
      watch: function (h) {
        if (!STU) return function () {};
        var base = dbT.ref('rooms/' + STU.code), me = String(STU.seat), offs = [];
        function on(path, fn) { var r = base.child(path); r.on('value', function (s) { fn(s.val()); }, function () {}); offs.push(function () { r.off(); }); }
        on('open', h.open); on('state', h.state); on('turn', h.turn); on('joined/' + me, function (v) { h.joined(!!v); });
        return function () { offs.forEach(function (f) { f(); }); };
      },
      beat: function () { if (!STU) return; dbT.ref('rooms/' + STU.code + '/presence/' + STU.seat).set({ n: Date.now() % 1e9 }).catch(function () {}); },
      join: function (on, name) { if (!STU) return Promise.resolve(); return dbT.ref('rooms/' + STU.code + '/joined/' + STU.seat).set(on ? { name: String(name || ''), at: Date.now() } : null); },
      ack: function (id) { return dbT.ref('rooms/' + STU.code + '/ack/' + id).set(true); },
      resp: function (id, v) { return dbT.ref('rooms/' + STU.code + '/resp/' + id).set(v); }
    }
  };

  return { room: Room, call: call, store: Store, C: function () { return C; }, ekey: ekey, ME: function () { return ME; }, dbS: dbS, dbT: dbT, STU: function () { return STU; }, ensureClass: ensureClass, watch: watch, nice: nice };
})();
window.fbCall = FBX.call;
window.fbRoom = FBX.room;
window.HATCH_FB = true;

/* ===== Firebase 版要改寫的規則（接在 logic.js 與 fb.js 之後） ===== */
FBX.store.ekey = FBX.ekey;
FBX.store.gearOf = function (code, seat) { var g = (FBX.C().gear[code] || {})[seat]; if (!g) return null; g = JSON.parse(JSON.stringify(g)); g.sets = Array.isArray(g.sets) ? g.sets : []; return g; };
gearMap_ = function (S, list) { var out = {}; list.forEach(function (st) { var g = S.gearOf(st.code, st.seat); if (g) out[st.key || (st.code + '-' + st.seat)] = g; }); return out; };

API.adminTeachers = function (S, p) {
  authStaff_(S, p, true);
  var n = {}; S.listClasses().forEach(function (c) { if (c.owner) n[c.owner] = (n[c.owner] || 0) + 1; });
  return { teachers: S.listTeachers().map(function (t) { return { id: t.id, name: t.name, email: t.email || '', active: t.active !== false, classes: n[t.id] || 0, createdAt: t.createdAt }; }) };
};
function emailOk_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
API.adminAddTeacher = function (S, p) {
  authStaff_(S, p, true);
  var name = String(p.name || '').trim().slice(0, 20), email = String(p.email || '').trim().toLowerCase().slice(0, 80);
  if (!name) fail_('請輸入老師姓名。');
  if (!emailOk_(email)) fail_('請輸入老師的 Google 帳號（Gmail）。');
  var id = S.ekey(email);
  if (S.getTeacher(id)) fail_('這個 Google 帳號已經開通過了。');
  S.saveTeacher({ id: id, name: name, email: email, active: true, createdAt: S.today() });
  return { id: id, name: name, email: email };
};
API.teacherApply = function (S, p) {
  var name = String(p.name || '').trim().slice(0, 20), school = String(p.school || '').trim().slice(0, 30),
    email = String(p.email || '').trim().toLowerCase().slice(0, 80), note = String(p.note || '').trim().slice(0, 200);
  if (!name) fail_('請輸入姓名。');
  if (!school) fail_('請輸入學校名稱。');
  if (!emailOk_(email)) fail_('請輸入你要用來登入的 Google 帳號（Gmail）。');
  S.saveApp({ id: 'A' + Date.now().toString(36).toUpperCase() + rnd_(1296).toString(36).toUpperCase(), name: name, school: school, email: email, note: note, status: 'wait', createdAt: S.today(), teacherId: '' });
  return { ok: true };
};
API.adminApprove = function (S, p) {
  authStaff_(S, p, true);
  var a = S.listApps().filter(function (x) { return x.id === p.id; })[0];
  if (!a || a.status !== 'wait') fail_('這筆申請已經處理過了。');
  var id = S.ekey(a.email);
  if (!S.getTeacher(id)) S.saveTeacher({ id: id, name: a.name, email: String(a.email).toLowerCase(), school: a.school || '', active: true, createdAt: S.today() });
  a.status = 'ok'; a.teacherId = id; S.saveApp(a);
  return { id: id, name: a.name, email: a.email, apps: API.adminApps(S, p).apps };
};
API.adminResetTeacher = function () { fail_('老師用 Google 登入，不需要重設密碼。'); };
API.changePin = function () { fail_('老師用 Google 登入，不需要 PIN。'); };
API.lookup = function () { fail_('請先登入再查詢怪獸。'); };

API.adminDeleteTeacher = function (S, p) {
  authStaff_(S, p, true);
  var t = S.getTeacher(p.id); if (!t) fail_('找不到這位老師。');
  var n = S.listClasses().filter(function (c) { return c.owner === t.id; }).length;
  if (n) fail_('這位老師還有 ' + n + ' 個班級。請先到班級清單把班級轉給別的老師，或改用「停用」。');
  S.delTeacher(t.id);
  return { ok: true };
};

API.deleteClass = function (S, p) {
  var who = authStaff_(S, p), cls = myClass_(S, who, p.code);
  S.delClass(cls.code);
  return { classes: classesFor_(S, who) };
};

})();
