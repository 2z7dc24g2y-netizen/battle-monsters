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
