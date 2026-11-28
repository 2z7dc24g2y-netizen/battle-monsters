/* 理化獸競技島 共用核心：怪獸資料、關卡、存檔、經驗值來源（競技島首頁與戰鬥頁共用） */
var PKEY='sciIsles.P.v1';
var EL={
  earth:{name:'土',color:'#c79a6a',stages:['小岩狼','晶甲狼','晶甲狼王'],role:'坦克',row:'front',range:'melee',hp:136,atk:30,def:28,spd:10,beats:'elec',fx:'rock',
    normal:'岩石撞擊',ult:{name:'岩盾壁壘',desc:'這一輪全隊被攻擊時自動擋下 55% 傷害',kind:'shield'},
    intro:'皮厚血多，站最前排替隊友擋攻擊。大招讓全隊一整輪都擋下一半以上的傷害。',why:'土能把電導入地下'},
  water:{name:'水',color:'#47a3f0',stages:['小水滴獸','水靈龍獸','潮汐龍王'],role:'平衡',row:'mid',range:'melee',hp:130,atk:28,def:24,spd:12,beats:'fire',fx:'splash',
    normal:'水刃',ult:{name:'潮汐衝擊',desc:'打一整排，被打到的下次防守球變快',kind:'row',mult:1.3},
    intro:'攻守平均，最好上手。大招打一整排，還會讓對手下次防守變難。',why:'水能吸熱滅火'},
  elec:{name:'電',color:'#f2c522',stages:['小雷獸','雷鬃獸','雷霆神獸'],role:'速度',row:'mid',range:'ranged',hp:100,atk:32,def:15,spd:22,beats:'water',fx:'bolt',
    normal:'電擊',ult:{name:'連鎖閃電',desc:'連打 3 下，每一擊各按一次攻擊條',kind:'chain',mult:0.75},
    intro:'速度最快、總是先出手，可以打任何位置。血比較少，要注意防守。',why:'電能把水電解成氫和氧'},
  fire:{name:'火',color:'#ff7a3d',stages:['火羽雛','炎翼鳥','炎鷹獸'],role:'範圍輸出',row:'back',range:'row',hp:108,atk:37,def:10,spd:15,beats:'wood',fx:'flame',
    normal:'火焰吐息',ult:{name:'烈焰風暴',desc:'攻擊對方全體',kind:'all',mult:0.75},
    intro:'攻擊力最高，一次燒一整排。血少防低，適合躲在後排。',why:'火能燃燒木材'},
  wood:{name:'木',color:'#5fbf5a',stages:['小芽精靈','花葉精靈','森林花神'],role:'治療',row:'back',range:'ranged',hp:125,atk:30,def:26,spd:10,beats:'earth',fx:'leaf',
    normal:'藤蔓鞭',passive:'攻擊後替血最少的隊友回 4% 血',ult:{name:'光合作用',desc:'全隊回血，按得越準補越多（24%～45%）',kind:'heal'},
    intro:'每次攻擊都順便幫隊友補血，大招全隊回血。隊伍裡有它會很耐打。',why:'植物的根能鑽開土壤'}
};
var EORDER=['water','fire','wood','earth','elec'];
var ROW_NAME={front:'前排',mid:'中排',back:'後排'};
var LV_MAX=30, MAX_MONS=3;
function needXp(lv){return 30+lv*15}               // 從 lv 升到 lv+1 需要的經驗
function xpAt(lv){var s=0;for(var l=1;l<lv;l++)s+=needXp(l);return s}
function lvOf(xp){var lv=1;while(lv<LV_MAX&&xp>=xpAt(lv+1))lv++;return lv}
function stageOf(lv){return lv>=20?3:lv>=10?2:1}
function monName(el,lv){return EL[el].stages[stageOf(lv)-1]}
function lvProgress(xp){var lv=lvOf(xp);if(lv>=LV_MAX)return{lv:lv,cur:1,need:1,pct:1};var a=xpAt(lv),b=xpAt(lv+1);return{lv:lv,cur:xp-a,need:b-a,pct:(xp-a)/(b-a)}}

/* ---- 關卡：30 關。原本 16 關的代號不變（學生的通關紀錄照舊），中間加入聯合特訓；第 26～30 關是 Boss 戰 ---- */
/* [代號, 題目來源島, 關卡名稱, 對手, 隊伍, 混合出題的島(選填), Boss] */
/* 雙 Boss：五系兩兩配對共 10 關，依序解鎖（第一關要先通過「深海指揮艦」）；掉落的服裝跟兩隻 Boss 的屬性一樣 */
var EL_NM={water:'水',fire:'火',wood:'木',earth:'土',elec:'電'};
var BOSS_OF={water:{img:'BS2',name:'深海指揮官 波賽',short:'波賽',role:'sup'},fire:{img:'BS1',name:'熔岩鍛造師 赫菲',short:'赫菲',role:'atk'},
  wood:{img:'BS3',name:'森林賢者 綠蒂',short:'綠蒂',role:'sup'},earth:{img:'BS4',name:'大地守護者 岩鐵',short:'岩鐵',role:'def'},elec:{img:'ALL',name:'雷霆元帥 辛巴王',short:'辛巴王',role:'atk'}};
var DBL_ISL={water:['K','F'],fire:['J','B'],wood:['L','D'],earth:['H','I'],elec:['Q','A']};
var DBL_COMBO={'water,fire':'熔岩蒸氣爆','water,wood':'森林豪雨','water,earth':'土石流','water,elec':'雷暴巨浪','fire,wood':'燎原野火','fire,earth':'火山爆發','fire,elec':'電漿風暴','wood,earth':'樹根地裂','wood,elec':'雷擊森林','earth,elec':'地磁風暴'};
var DBL=[];(function(){var o=['water','fire','wood','earth','elec'],n=0;for(var i=0;i<5;i++)for(var j=i+1;j<5;j++){DBL.push({id:n?'DB'+(n+1):'DB',a:o[i],b:o[j],n:n,lv:Math.min(30,27+Math.floor(n/3)),pow:+(1+n*.04).toFixed(2)});n++}})();
var STAGES=[
 ['A','A','物質組成島','原子守衛 阿道',[['earth',1]]],
 ['K','K','聲光島','回音劇團 小波',[['water',2]]],
 ['AK','A','聯合特訓・物質與聲光','光譜偵探 小虹',[['wood',3],['water',2]],['A','K']],
 ['B','B','能量島','熱力學徒 焦耳',[['fire',4],['wood',3]]],
 ['E','E','物質系統島','槓桿隊長 阿基',[['earth',5],['elec',4]]],
 ['BE','B','聯合特訓・能量與力學','雲霄飛車師 阿動',[['elec',6],['fire',5],['earth',5]],['B','E']],
 ['Q','Q','電磁島','線圈博士 法拉',[['elec',7],['water',6]]],
 ['EQ','E','聯合特訓・力與電磁','磁浮列車長 阿磁',[['earth',8],['elec',7],['fire',7]],['E','Q']],
 ['C','C','結構功能島','結晶師 小晶',[['wood',9],['fire',8]]],
 ['J','J','化學反應島','實驗狂人 拉瓦',[['fire',10],['water',9],['earth',9]]],
 ['CJ','J','聯合特訓・物質與化學','元素鍊金師 門德',[['water',11],['fire',10],['wood',10]],['A','C','J']],
 ['F','F','地球環境島','月相觀測員 小望',[['earth',12],['wood',11],['elec',11]]],
 ['D','D','生物構造島','細胞醫師 虎克',[['water',13],['wood',12],['earth',12]]],
 ['H','H','地球歷史島','化石獵人 阿石',[['earth',14],['fire',13],['elec',13]]],
 ['FH','F','聯合特訓・地球的過去與現在','岩層解說員 阿層',[['fire',15],['earth',14],['water',14]],['F','H']],
 ['G','G','演化島','遺傳學家 孟德',[['wood',16],['water',15],['fire',15]]],
 ['DG','D','聯合特訓・生命的構造與演化','顯微鏡隊長 小雷',[['elec',17],['wood',16],['water',16]],['D','G']],
 ['I','I','變動的地球島','板塊旅人 魏格',[['fire',18],['earth',17],['elec',17]]],
 ['HI','I','聯合特訓・地球科學','颱風追風人 阿颯',[['water',19],['elec',18],['earth',18]],['F','H','I']],
 ['L','L','生態島','森林守護者 小鹿',[['wood',20],['water',19],['earth',19]]],
 ['GL','L','聯合特訓・生物大會考','生態調查員 小蕨',[['earth',21],['wood',20],['fire',20]],['D','G','L']],
 ['M','M','科技人文島','發明家 阿迪',[['elec',22],['fire',21],['wood',21]]],
 ['N','N','永續島','綠能指揮官 小風',[['water',23],['wood',22],['earth',22]]],
 ['MN','N','聯合特訓・科技與永續','太陽能工程師 小晴',[['fire',24],['elec',23],['water',23]],['M','N']],
 ['PX','E','聯合特訓・理化總複習','理化特訓教官 阿牛',[['elec',25],['earth',24],['fire',24]],['A','B','C','E','J','K','Q']],
 ['BS1','J','Boss 戰・熔岩鍛造廠','熔岩鍛造師 赫菲',[['fire',26],['earth',25],['wood',25]],['B','C','J'],1],
 ['BS2','I','Boss 戰・深海指揮艦','深海指揮官 波賽',[['water',27],['elec',26],['fire',26]],['F','I','K'],1],
 ['BS3','L','Boss 戰・古森林神殿','森林賢者 綠蒂',[['wood',28],['water',27],['earth',27]],['D','G','L'],1],
 ['BS4','H','Boss 戰・水晶地心','大地守護者 岩鐵',[['earth',29],['fire',28],['elec',28]],['A','E','H'],1],
 ['ALL','ALL','最終 Boss・理化獸競技場','雷霆元帥 辛巴王',[['elec',30],['earth',29],['water',29]],null,1]
].concat(DBL.map(function(d){return [d.id,DBL_ISL[d.a][0],'雙 Boss 戰・'+EL_NM[d.a]+'與'+EL_NM[d.b],BOSS_OF[d.a].short+' ＆ '+BOSS_OF[d.b].short,[[d.a,d.lv],[d.b,d.lv]],DBL_ISL[d.a].concat(DBL_ISL[d.b]),2]}))
 .concat([['TB','ALL','三 Boss 戰・三神殿聯軍','岩鐵・綠蒂・赫菲',[['earth',30],['wood',30],['fire',30]],null,3]]).map(function(s,i){var b=!!s[6];return{id:s[0],isl:s[1],isle:s[2],boss:s[3],team:s[4].map(function(t){return{el:t[0],lv:t[1]}}),mix:s[5]||null,isBoss:b,bossN:s[6]||0,i:i,
  cpuAns:Math.min(.9,.5+i*.012+(b?.04:0)),cpuK:Math.min(.46,.18+i*.009+(b?.03:0)),first:40+i*12+(b?60:0),again:10+Math.round(i*1.6)}});
/* Boss 戰：帶頭的 Boss 理化獸血量 ×1.8、攻擊 ×1.15，而且不管你帶幾隻，Boss 一定上場 */
var BOSS_HP=1.8,BOSS_ATK=1.15;
/* 多 Boss：每隻 Boss 有自己的定位。atk 攻擊型（攻擊高）、sup 輔助型（替隊友補血）、def 防禦型（替全隊上護盾） */
var MULTI_BOSS={
  TB:{req:'BS4',combo:{name:'三神殿共鳴',desc:'兩隻以上 Boss 在場時，每 3 輪合力攻擊你的全隊一次'},list:[
    {img:'BS4',name:'大地守護者 岩鐵',role:'def'},{img:'BS3',name:'森林賢者 綠蒂',role:'sup'},{img:'BS1',name:'熔岩鍛造師 赫菲',role:'atk'}]}};
DBL.forEach(function(d,i){MULTI_BOSS[d.id]={req:i?DBL[i-1].id:'BS2',pow:d.pow,els:[d.a,d.b],combo:{name:DBL_COMBO[d.a+','+d.b],desc:'兩隻 Boss 都在場時，每 3 輪合力攻擊你的全隊一次'},list:[BOSS_OF[d.a],BOSS_OF[d.b]]}});
MULTI_BOSS.TB.els=['earth','wood','fire'];
var BOSS_ROLE={atk:{name:'攻擊型',hp:1.6,atk:1.3,desc:'攻擊特別痛'},sup:{name:'輔助型',hp:1.5,atk:1,desc:'每 2 輪替血最少的 Boss 補 15% 血'},def:{name:'防禦型',hp:2.1,atk:.9,desc:'每 3 輪替全部 Boss 上護盾'}};
STAGES.forEach(function(s){var m=MULTI_BOSS[s.id];if(m){s.bosses=m.list;s.req=m.req;s.combo=m.combo;s.img=m.list[0].img;s.els=m.els;s.pow=m.pow||1}});
function stageIsles(st){return st.id==='ALL'?null:(st.mix||[st.isl])}
var ISLE_COL={A:'#de774c',B:'#e9a23b',C:'#c96a7a',D:'#7aa35a',E:'#4f7fa6',F:'#5aa6a0',G:'#8fb173',H:'#b08a62',I:'#c06a1a',J:'#d9574a',K:'#5fa8c8',Q:'#7a6fb8',L:'#5f9b5b',M:'#a07a5a',N:'#4e8a62',ALL:'#e0583a'};
function stageCol(st){return ISLE_COL[st.id]||ISLE_COL[st.isl]||'#e0583a'}
function stageById(id){return STAGES.filter(function(s){return s.id===id})[0]}

/* ---- 存檔（這台裝置的瀏覽器；登入 Claude 時另外同步到帳號） ---- */
function todayStr(){var d=new Date();return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
function blankP(){return{mons:[],spent:0,bxp:0,clear:{},day:{d:'',n:0},wins:0,battles:0,nid:1,t:0}}
function loadP(){try{var p=JSON.parse(localStorage.getItem(PKEY)||'null');if(p&&p.mons)return Object.assign(blankP(),p)}catch(e){}return blankP()}
var CLOUD={doc:null,timer:0};
function saveP(p){p.t=Date.now();try{localStorage.setItem(PKEY,JSON.stringify(p))}catch(e){}
  if(CLOUD.doc){clearTimeout(CLOUD.timer);CLOUD.timer=setTimeout(function(){CLOUD.doc.set({p:JSON.stringify(p),t:Date.now()}).catch(function(){})},1500)}}
function scoreP(p){return (p.bxp||0)+p.mons.reduce(function(s,m){return s+m.xp+20},0)+Object.keys(p.clear||{}).length*50+(p.battles||0)}
async function cloudSync(p,onChange){try{var use=window.claude&&window.claude.use;if(!use)return;var r=await Promise.all([use('db'),use('user')]);if(!r[0]||!r[1])return;
  var id=await r[1].id();if(!id)return;CLOUD.doc=r[0].doc('data/users/'+id+'/sciIslesP');var snap=await CLOUD.doc.get();
  if(snap.exists){var c=Object.assign(blankP(),JSON.parse(snap.data().p));
    /* 這台裝置是空的（換裝置、清過瀏覽紀錄）就用帳號裡的；否則取進度較多的一份 */
    var localEmpty=!p.mons.length&&!Object.keys(p.clear||{}).length&&!p.battles;
    if((localEmpty&&(c.mons.length||Object.keys(c.clear||{}).length))||scoreP(c)>scoreP(p)){Object.keys(c).forEach(function(k){p[k]=c[k]});try{localStorage.setItem(PKEY,JSON.stringify(p))}catch(e){}onChange&&onChange();return}}
  saveP(p)}catch(e){}}

/* ---- 經驗能量：從其他島嶼的紀錄即時算出，不會重複領取 ---- */
var XP_RULE={stamp:40,chat:8,capFirst:10,capRight:2,daily:30};
var ISLE_KEYS={A:'sciIsles.v1',B:'sciIsles.B.v1',C:'sciIsles.C.v1',D:'sciIsles.D.v1',E:'sciIsles.E.v1',F:'sciIsles.F.v1',G:'sciIsles.G.v1',H:'sciIsles.H.v1',I:'sciIsles.I.v1',J:'sciIsles.J.v1',K:'sciIsles.K.v1',L:'sciIsles.L.v1',M:'sciIsles.M.v1',N:'sciIsles.N.v1',Q:'sciIsles.Q.v1'};
function readJ(k){try{return JSON.parse(localStorage.getItem(k)||'null')||{}}catch(e){return{}}}
function xpSources(p){
  var stamps=0,per={};Object.keys(ISLE_KEYS).forEach(function(k){var s=readJ(ISLE_KEYS[k]).stamps||{},n=Object.keys(s).filter(function(x){return s[x]}).length;per[k]=n;stamps+=n});
  var cap=readJ('sciIsles.cap.v1'),a=cap.a||{},first=0,right=0;Object.keys(a).forEach(function(id){var o=a[id]||[];if(o[1]>0)first++;right+=o[1]||0});
  var chat=cap.tc||0,days=((cap.st||{}).tot)||0;
  var list=[
    {k:'stamp',t:'集印章',d:'在各島完成單元、蓋到印章',n:stamps,u:'枚',xp:stamps*XP_RULE.stamp,rate:'每枚 '+XP_RULE.stamp},
    {k:'chat',t:'和島民聊天',d:'在各島和島民聊科學',n:chat,u:'次',xp:chat*XP_RULE.chat,rate:'每次 '+XP_RULE.chat},
    {k:'cap',t:'寫會考題',d:'會考塔或模擬會考，答對的題目',n:first,u:'題',xp:first*XP_RULE.capFirst+right*XP_RULE.capRight,rate:'新答對每題 '+XP_RULE.capFirst+'，再答對 +'+XP_RULE.capRight},
    {k:'daily',t:'完成每日任務',d:'航海圖上的每日任務，三個都完成算一天',n:days,u:'天',xp:days*XP_RULE.daily,rate:'每天 '+XP_RULE.daily},
    {k:'battle',t:'競技場戰鬥',d:'挑戰競技場的關卡',n:p.battles||0,u:'場',xp:p.bxp||0,rate:'首勝最多'}];
  var earned=list.reduce(function(s,x){return s+x.xp},0);
  return{list:list,earned:earned,pool:Math.max(0,earned-(p.spent||0)),perIsle:per};
}
var DAILY_REWARDED=8;
function battleReward(p,st,won){var t=todayStr();if(p.day.d!==t)p.day={d:t,n:0};
  var first=won&&!p.clear[st.id];if(!first&&p.day.n>=DAILY_REWARDED)return{xp:0,capped:true,first:false};
  var xp=first?st.first:won?st.again:5;if(!first)p.day.n++;return{xp:xp,first:first}}
function unlocked(p,i){var s=STAGES[i];if(s&&s.req)return !!p.clear[s.req];return i===0||!!p.clear[STAGES[i-1].id]}

/* ---- 競技島 Boss 掉寶：只在 Boss 關卡勝利、而且今天的戰鬥獎勵還沒領完時判定 ----
 * 單 Boss：20% 金色；雙 Boss：保證金色，另外 20% 升成菁英（同一份獎勵）；三 Boss：保證菁英
 * 掉落的是你已經擁有的服裝，品質只升不降（普通 → 金色 → 菁英） */
function dropQuality(n,r){r=r==null?Math.random():r;if(n>=3)return 3;if(n===2)return r<.2?3:2;if(n===1)return r<.2?2:0;return 0}
function ownCode(code,p){
  if(code===0||code==null)return false;var c=String(code),m;
  if((m=/^([A-Q])(\d+)$/.exec(c)))return !!(readJ(ISLE_KEYS[m[1]]).stamps||{})[m[2]];
  if((m=/^([A-Q])all$/.exec(c))){var st=readJ(ISLE_KEYS[m[1]]).stamps||{};return Object.keys(st).filter(function(x){return st[x]}).length>=(ISLE_UNITS[m[1]]||99)}
  if((m=/^X(\d)$/.exec(c)))return !!((p||loadP()).hid||{})[m[1]];
  if((m=/^Z(.+)$/.exec(c)))return !!((readJ('sciIsles.cap.v1').ach)||{})[m[1]];
  return false}
function ownedItems(p){var out=[],I=window.GEAR_ITEMS||{};Object.keys(I).forEach(function(cat){var o=I[cat];(o.lock||[]).forEach(function(code,i){if(ownCode(code,p))out.push({cat:cat,name:o.names[i],code:code})})});return out}
function rollDrop(p,st){
  var q=dropQuality(st.bossN||0);if(!q||!window.GEAR||!GEAR.qUp)return null;
  var qm=GEAR.qLoad(),own=ownedItems(p),pool=own.filter(function(x){return GEAR.qOf(qm,x.cat,x.name)<q});
  /* 有屬性的關卡：優先掉那幾系的服裝；那幾系都升滿了才從其他服裝裡挑 */
  if(st.els&&GEAR.itemEl){var mine=pool.filter(function(x){return st.els.indexOf(GEAR.itemEl(x.name,x.code))>=0});if(mine.length)pool=mine}
  if(!pool.length)return{q:q,none:true,owned:own.length};
  var it=pool[Math.floor(Math.random()*pool.length)],was=GEAR.qOf(qm,it.cat,it.name);GEAR.qUp(it.cat,it.name,q);
  return{q:q,cat:it.cat,name:it.name,was:was,el:GEAR.itemEl?GEAR.itemEl(it.name,it.code):''}}
/* 隱藏服裝：1 蚊子斗篷（吸血）＝打贏生物構造島最強挑戰者；2 雷霆戰甲（暴擊）＝打贏電磁島最強挑戰者；3 仙人掌護甲（反傷）＝打贏三 Boss 戰 */
var HIDDEN={1:{name:'蚊子斗篷',eff:'攻擊時吸血'},2:{name:'雷霆戰甲',eff:'暴擊率提高'},3:{name:'仙人掌護甲',eff:'被攻擊時反傷'}};
function hiddenFor(st){if(st.duel&&st.tier===2&&st.isl==='D')return 1;if(st.duel&&st.tier===2&&st.isl==='Q')return 2;if(st.id==='TB')return 3;return 0}

/* ---- 怎麼變強：依目前紀錄給建議（戰敗畫面、能量站共用） ---- */
var ISLE_UNITS={A:9,B:13,C:7,D:18,E:18,F:11,G:16,H:10,I:16,J:16,K:9,Q:8,L:14,M:14,N:14};
var ISLE_NAMES={A:'物質組成島',B:'能量島',C:'結構功能島',D:'生物構造島',E:'物質系統島',F:'地球環境島',G:'演化島',H:'地球歷史島',I:'變動的地球島',J:'化學反應島',K:'聲光島',L:'生態島',M:'科技人文島',N:'永續島',Q:'電磁島'};
function counterOf(el){return Object.keys(EL).filter(function(k){return EL[k].beats===el})[0]}
function earnTips(p,stage){
  var X=xpSources(p),tips=[],cap=readJ('sciIsles.cap.v1'),d=cap.d||{},today=d.done;
  if(X.pool>0)tips.push({k:'pool',t:'還有 '+X.pool+' 經驗能量沒注入',d:'先到培育中心注入，馬上就能升級',href:'P.html#nursery',go:'去注入',hot:1});
  if(stage){var mx=Math.max.apply(null,stage.team.map(function(t){return t.lv})),my=p.mons.length?Math.max.apply(null,p.mons.map(function(m){return lvOf(m.xp)})):0;
    if(my&&my<mx)tips.push({k:'lv',t:'對手最高 Lv'+mx+'，你的最高 Lv'+my,d:'差 '+(mx-my)+' 級。建議練到 Lv'+Math.max(1,mx-1)+' 再來',hot:1});
    var foes=[];stage.team.forEach(function(t){if(foes.indexOf(t.el)<0)foes.push(t.el)});
    tips.push({k:'el',t:'帶對屬性',d:foes.map(function(f){return counterOf(f)}).filter(function(c,i,a){return a.indexOf(c)===i}).map(function(c){return EL[c].name}).join('、')+' 系可以克制這關的對手（'+foes.map(function(f){return EL[f].name}).join('、')+'）'})}
  var best=null;Object.keys(ISLE_UNITS).forEach(function(k){var left=ISLE_UNITS[k]-(X.perIsle[k]||0);if(left>0&&(!best||left>best.left))best={k:k,left:left}});
  if(best)tips.push({k:'stamp',t:'集印章：每枚 +'+XP_RULE.stamp,d:ISLE_NAMES[best.k]+'還有 '+best.left+' 枚印章沒蓋',href:best.k+'.html',go:'登島'});
  if(!today)tips.push({k:'daily',t:'完成今天的每日任務：+'+XP_RULE.daily,d:'航海圖上的三個任務都完成就算一天',href:'map.html',go:'看任務'});
  tips.push({k:'cap',t:'寫會考題：新答對每題 +'+XP_RULE.capFirst,d:'模擬會考或各島中央的會考塔',href:'map.html',go:'去寫題'});
  tips.push({k:'chat',t:'和島民聊天：每次 +'+XP_RULE.chat,d:'在任何一座島上點島民聊科學'});
  var again=STAGES.filter(function(s,i){return p.clear[s.id]&&s!==stage}).slice(-1)[0];
  if(again)tips.push({k:'battle',t:'重打已通過的關卡：每場 +'+again.again,d:'第 '+(again.i+1)+' 關 '+again.isle+'，每天前 '+DAILY_REWARDED+' 場有獎勵',href:'P-battle.html#s='+again.id,go:'去打'});
  return tips;
}

/* ---- 主題島挑戰者對戰（P-battle.html#d=Q2：Q 島、難度 2） ---- */
var DUEL_NAMES={A:['原子學徒','元素研究員','物質島主'],B:['能量學徒','焦耳研究員','能量島主'],C:['結晶學徒','結構研究員','結構島主'],D:['細胞學徒','生物研究員','構造島主'],E:['槓桿學徒','力學研究員','系統島主'],F:['觀星學徒','地科研究員','環境島主'],G:['化石學徒','遺傳研究員','演化島主'],H:['地層學徒','化石研究員','歷史島主'],I:['板塊學徒','地震研究員','地球島主'],J:['燒杯學徒','化學研究員','反應島主'],K:['回音學徒','光學研究員','聲光島主'],L:['生態學徒','保育研究員','生態島主'],M:['發明學徒','科技研究員','人文島主'],N:['綠能學徒','永續研究員','永續島主'],Q:['線圈學徒','電磁研究員','電磁島主']};
var DUEL_TIER=['易','中','難'],DUEL_RW=[15,30,60];
function duelStage(code,p){var m=/^([A-Z])([123])$/.exec(code||'');if(!m||!DUEL_NAMES[m[1]])return null;var isl=m[1],t=+m[2]-1;
  var lv=(p.mons||[]).map(function(x){return lvOf(x.xp)});if(!lv.length)lv=[1];var mx=Math.max.apply(null,lv),avg=lv.reduce(function(a,b){return a+b},0)/lv.length;
  var foeLv=Math.max(1,Math.min(LV_MAX,[mx-3,Math.round((mx+avg)/2),mx+2][t]));
  var seed=isl.charCodeAt(0)*7+t*3,els=[];for(var i=0;i<t+1;i++)els.push(EORDER[(seed+i*2)%5]);
  return{id:'D-'+isl+(t+1),duel:true,tier:t,isl:isl,isle:ISLE_NAMES[isl],boss:DUEL_NAMES[isl][t],team:els.map(function(e,i){return{el:e,lv:Math.max(1,foeLv-(i===0?0:1))}}),
    i:-1,cpuAns:[.45,.65,.82][t],cpuK:[.12,.25,.42][t],first:DUEL_RW[t],again:DUEL_RW[t]}}
function duelReward(p,st,won){var t=todayStr();if(p.day.d!==t)p.day={d:t,n:0};p.duel=p.duel||{};p.medals=p.medals||{};var key=st.isl+(st.tier+1),rec=p.duel[key]||(p.duel[key]={w:0,l:0});
  if(won)rec.w++;else rec.l++;var medal=won&&st.tier===2&&!p.medals[st.isl];if(medal)p.medals[st.isl]=1;
  if(p.day.n>=DAILY_REWARDED)return{xp:0,capped:true,medal:medal};p.day.n++;return{xp:won?st.first:5,medal:medal}}
/* ---- 服裝與勳章加成 ---- */
function gearNow(){var av=readJ('sciIsles.avatar'),g=(window.GEAR&&window.GEAR_ITEMS)?GEAR.total(av,GEAR_ITEMS):{sum:{},list:[],set:null};
  var med=Object.keys((loadP().medals)||{}).length;if(med){g.sum.atk=Math.min(15,(g.sum.atk||0)+med);g.medals=med}return g}
