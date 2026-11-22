/* 理化獸競技島（科學島版）：建築入口、競技場／培育中心／能量站面板（iframe）、五系神殿雕像、陪你散步的理化獸 */
(function(){
'use strict';
var KIND=['wardrobe','dex','medal','guide','meadow','nursery','arena','energy'];var DEXS=[["water", 0.0, 0.76, -1.01], ["fire", 0.818, 0.76, -0.416], ["wood", 0.505, 0.76, 0.546], ["earth", -0.505, 0.76, 0.546], ["elec", -0.818, 0.76, -0.416]];
var MONEL={"earth": {"n": "土", "c": "#c79a6a", "s": ["小岩狼", "晶甲狼", "晶甲狼王"]}, "water": {"n": "水", "c": "#47a3f0", "s": ["小水滴獸", "水靈龍獸", "潮汐龍王"]}, "elec": {"n": "電", "c": "#f2c522", "s": ["小雷獸", "雷鬃獸", "雷霆神獸"]}, "fire": {"n": "火", "c": "#ff7a3d", "s": ["火羽雛", "炎翼鳥", "炎鷹獸"]}, "wood": {"n": "木", "c": "#5fbf5a", "s": ["小芽精靈", "花葉精靈", "森林花神"]}};
var HUB_V='a18f2d1e';
function readJ(k){try{return JSON.parse(localStorage.getItem(k)||'null')||{}}catch(e){return{}}}
function lvOf(xp){var lv=1,s=0;while(lv<30){var n=30+lv*15;if(xp<s+n)break;s+=n;lv++}return lv}
function stageOf(lv){return lv>=20?3:lv>=10?2:1}
try{localStorage.setItem('sciIsles.lastIsle','P')}catch(e){}

/* ---------- 面板（iframe 載入 P-hub.html） ---------- */
var box=document.createElement('div');box.id='phub';box.setAttribute('aria-hidden','true');
box.innerHTML='<div class="phl"><i></i><span>載入中…</span></div>';document.body.appendChild(box);
var fr=null,ready=false,want=null,isOpen=false;
var st=document.createElement('style');st.textContent=
 '#phub{position:fixed;inset:0;z-index:80;visibility:hidden;pointer-events:none}#phub.open{visibility:visible;pointer-events:auto}'+
 '#phub iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:transparent}'+
 '#phub .phl{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:none;align-items:center;gap:10px;background:#fffaf3;border-radius:16px;padding:12px 18px;box-shadow:0 10px 30px rgba(0,0,0,.2);font-weight:700}'+
 '#phub.loading .phl{display:flex}#phub .phl i{width:18px;height:18px;border-radius:50%;border:3px solid #f2b63c;border-top-color:transparent;animation:phs 1s linear infinite}@keyframes phs{to{transform:rotate(360deg)}}'+
 'body.hubbing .side,body.hubbing .brand,body.hubbing #labels,body.hubbing .pdock,body.hubbing .wui{visibility:hidden}'+
 '.pdock{position:fixed;z-index:6;left:50%;transform:translateX(-50%);bottom:calc(14px + env(safe-area-inset-bottom,0px));display:flex;gap:8px;padding:6px;background:rgba(255,250,243,.94);border-radius:20px;box-shadow:0 6px 20px rgba(59,48,42,.14)}'+
 '.pdock button{all:unset;cursor:pointer;display:flex;align-items:center;gap:6px;padding:9px 14px;border-radius:14px;font-weight:800;font-size:14.5px;white-space:nowrap}.pdock button i{width:10px;height:10px;border-radius:50%}'+
 '.pdock button:hover,.pdock button:focus-visible{background:#f3ead9}.pdock b{font-family:var(--f-mono,monospace);font-size:12px;color:#7a6c62;font-weight:700}'+
 'body.walking .pdock,body.creating .pdock,body.reading .pdock,body.listing .pdock,body.questing .pdock,body.intro .pdock{display:none}'+
 '@media (max-width:420px){.pdock button{padding:8px 10px;font-size:13.5px}}';
document.head.appendChild(st);
function makeFrame(h){fr=document.createElement('iframe');fr.title='理化獸競技島';fr.src='P-hub.html?v='+HUB_V+(h?'#'+h:'');box.appendChild(fr);
  fr.addEventListener('load',function(){ready=true;box.classList.remove('loading');if(want!=null){var w=want;want=null;setHub(w)}})}
function setHub(h){try{if(fr.contentWindow.location.hash.replace('#','')!==h)fr.contentWindow.location.hash=h;else fr.contentWindow.dispatchEvent(new HashChangeEvent('hashchange'))}catch(e){fr.src='P-hub.html?v='+HUB_V+'#'+h}}
function openHub(h){if(!h)return;isOpen=true;box.classList.add('open');box.setAttribute('aria-hidden','false');document.body.classList.add('hubbing');
  try{CHAT.on&&closeChat()}catch(e){}
  if(!fr){box.classList.add('loading');makeFrame(h)}else if(!ready){box.classList.add('loading');want=h}else setHub(h);
  try{if(location.hash!=='#'+h)history.replaceState(null,'','#'+h)}catch(e){}}
function closeHub(){if(!isOpen)return;isOpen=false;box.classList.remove('open','loading');box.setAttribute('aria-hidden','true');document.body.classList.remove('hubbing');
  try{history.replaceState(null,'',location.pathname+location.search)}catch(e){}syncMons(true);refreshDock()}
window.addEventListener('message',function(e){var d=e.data;if(d&&d.t==='phub-nav'&&typeof d.u==='string'&&/^[A-Za-z0-9_.\/-]*(\.html)?(#[\w=-]*)?$/.test(d.u)){location.href=d.u;return}if(!d||d.t!=='phub')return;if(!d.h)closeHub();else{try{history.replaceState(null,'','#'+d.h)}catch(x){}}if(d.dirty)syncMons(true)});
function hashRoute(){var h=location.hash.replace('#','');if(/^(arena|nursery|energy|medal|guide|dex(-(fire|water|wood|earth|elec))?)$/.test(h))openHub(h)}
window.addEventListener('hashchange',hashRoute);

/* ---------- 建築：點下去開面板 ---------- */
function enter(i){var k=KIND[i];if(!k)return;try{SFX.open&&SFX.open()}catch(e){}try{closeList()}catch(e){}
  if(k==='wardrobe'){try{CHAT.on&&closeChat()}catch(e){}renderCreator();document.body.classList.add('creating');return}
  if(k==='meadow'){openHub('nursery');return}
  openHub(k)}
window.openUnit=openUnit=function(i){enter(i)};
window.openQuest=openQuest=function(){openHub('nursery')};
['bQuest','bQuest2'].forEach(function(id){var b=$(id);if(!b)return;var t=b.childNodes[b.childNodes.length-1];if(t&&t.nodeType===3)t.textContent='理化獸';else b.textContent='理化獸';b.onclick=function(){openHub('nursery')}});

/* 下方快捷列 */
var dock=document.createElement('div');dock.className='pdock';dock.innerHTML=
 '<button data-h="arena"><i style="background:#e0583a"></i>競技場<b id="pdA"></b></button><button data-h="nursery"><i style="background:#3f9a55"></i>培育中心<b id="pdN"></b></button><button data-h="energy"><i style="background:#f2b63c"></i>能量站</button>';
document.body.appendChild(dock);dock.addEventListener('click',function(e){var b=e.target.closest('button');if(b){try{SFX.tick&&SFX.tick()}catch(x){}openHub(b.dataset.h)}});
function refreshDock(){var P=readJ('sciIsles.P.v1');var a=$('pdA'),n=$('pdN');if(a)a.textContent=Object.keys(P.clear||{}).length+'/16';if(n)n.textContent=(P.mons||[]).length+'/3'}
refreshDock();

/* ---------- 3D：雕像與陪伴的理化獸 ---------- */
var TEX={};
function texOf(key,cb){if(TEX[key])return cb(TEX[key]);var src=window.STAND&&STAND[key];if(!src)return;var im=new Image();im.onload=function(){var t=new THREE.Texture(im);t.needsUpdate=true;try{t.encoding=THREE.sRGBEncoding}catch(e){}TEX[key]={t:t,w:im.width,h:im.height};cb(TEX[key])};im.src=src}
function spriteOf(T,h){var t=T.t.clone();t.needsUpdate=true;var m=new THREE.SpriteMaterial({map:t,transparent:true,alphaTest:.2});var s=new THREE.Sprite(m);s.scale.set(h*T.w/T.h,h,1);s.center.set(.5,.04);return s}
function gY(x,z){try{return groundY(x,z)}catch(e){return .12}}
/* 圖鑑館：五座展示台上的第三型雕像 */
function statues(){var i=KIND.indexOf('dex'),g=clickables.filter(function(c){return c.userData.uid===i})[0];if(!g)return;g.updateMatrixWorld(true);
  DEXS.forEach(function(sp,j){texOf(sp[0]+'3',function(T){var s=spriteOf(T,sp[0]==='wood'?.47:.58);s.center.set(.5,0);var p=g.localToWorld(new THREE.Vector3(sp[1],sp[2],sp[3]));s.position.copy(p);scene.add(s);var y0=p.y;
    anim.push(function(t){s.position.y=y0+.03+Math.sin(t*1.4+j)*.03})})})}
/* 散步的理化獸 */
var MONS=[],sig='';
function monSig(P){return (P.mons||[]).map(function(m){return m.el+stageOf(lvOf(m.xp||0))}).join(',')}
function syncMons(force){var P=readJ('sciIsles.P.v1'),s=monSig(P);if(!force&&s===sig)return;if(s===sig&&MONS.length)return;sig=s;
  MONS.forEach(function(m){scene.remove(m.s);scene.remove(m.sh);if(m.lb){m.lb.el.remove();var k=labels.indexOf(m.lb);k>=0&&labels.splice(k,1)}});MONS=[];
  (P.mons||[]).forEach(function(pm,i){var lv=lvOf(pm.xp||0),stg=stageOf(lv),key=pm.el+stg;
    texOf(key,function(T){var h=[.4,.56,.78][stg-1]*(pm.el==='wood'?.8:1),s=spriteOf(T,h),a=i*2.1+.6,r=.5+i*.2,H0=home();
      var m={s:s,i:i,x:H0.x+Math.sin(a)*r,z:H0.z+Math.cos(a)*r,tx:0,tz:0,wait:Math.random()*2,h:h,ph:Math.random()*6,dirR:false};m.tx=m.x;m.tz=m.z;
      var sh=new THREE.Mesh(new THREE.CircleGeometry(.5,18),new THREE.MeshBasicMaterial({color:0x1d3a2c,transparent:true,opacity:.18,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.scale.set(h*.5,h*.28,1);m.sh=sh;
      scene.add(s);scene.add(sh);
      var nm=(MONEL[pm.el]||{}),el=document.createElement('div');el.className='lbl mon-lbl';el.innerHTML='<b style="color:'+(nm.c||'#333')+'">'+(nm.n||'')+'</b><span>'+(nm.s?nm.s[stg-1]:'')+' Lv'+lv+'</span>';
      el.style.pointerEvents='none';labelsEl.appendChild(el);m.lb={el:el,a:new THREE.Vector3(m.x,h+.35,m.z)};labels.push(m.lb);
      MONS.push(m)})})}
function home(){try{var u=UNITS[KIND.indexOf('meadow')].pos;return{x:u[0],z:u[1]}}catch(e){return{x:HUB.x,z:HUB.z}}}
function wanderTarget(m){var fb=null,H=home();for(var n=0;n<14;n++){var a=Math.random()*6.283,r=Math.random()*1.0,x=H.x+Math.sin(a)*r,z=H.z+Math.cos(a)*r;if(!fb||!fb(x,z,.3))return[x,z]}return[m.x,m.z]}
var lastCam=new THREE.Vector3();
anim.push(function(T,dt){dt=Math.min(dt||.016,.05);var walk=false,px=0,pz=0;try{walk=walking&&!!player;px=PL.x;pz=PL.z}catch(e){}
  MONS.forEach(function(m){var tx,tz,moving=false,sp=1.1;
    if(walk&&Math.hypot(px-m.x,pz-m.z)<1.3){tx=m.x;tz=m.z;m.wait=Math.max(m.wait,.8)}
    else{if(m.wait>0){m.wait-=dt;tx=m.x;tz=m.z}else{if(Math.hypot(m.tx-m.x,m.tz-m.z)<.05){var p=wanderTarget(m);m.tx=p[0];m.tz=p[1];m.wait=1.2+Math.random()*3}tx=m.tx;tz=m.tz}}
    var dx=tx-m.x,dz=tz-m.z,d=Math.hypot(dx,dz);if(d>.03){var s=Math.min(d,sp*dt);m.x+=dx/d*s;m.z+=dz/d*s;moving=true;
      // 依螢幕左右決定面向（雕像原圖面向左）
      try{var a=new THREE.Vector3(m.x,0,m.z).project(camera),b=new THREE.Vector3(m.x+dx,0,m.z+dz).project(camera);if(Math.abs(b.x-a.x)>.002)m.dirR=b.x>a.x}catch(e){}}
    var y=Math.max(gY(m.x,m.z),.2)+.235,hop=moving?Math.abs(Math.sin(T*9+m.ph))*.1:Math.sin(T*2.2+m.ph)*.015,sq=moving?1:1+Math.sin(T*2.2+m.ph)*.025;
    m.s.position.set(m.x,y+hop,m.z);var w=Math.abs(m.s.scale.x)||m.h;m.s.scale.set((m.dirR?-1:1)*w,m.h*sq,1);
    m.sh.position.set(m.x,y+.015,m.z);m.lb.a.set(m.x,y+m.h+.3,m.z);m.lb.el.style.opacity=(walk?Math.hypot(px-m.x,pz-m.z)<3.2:camera.position.distanceTo(controls.target)<26)?1:0})});


/* ---------- 帳號同步：面板在 iframe 裡拿不到 Claude 帳號，由這一頁代為讀寫 ---------- */
var PK='sciIsles.P.v1',CDOC=null,ctimer=0,synced=false;
function scoreP(p){return (p.bxp||0)+(p.mons||[]).reduce(function(s,m){return s+(m.xp||0)+20},0)+Object.keys(p.clear||{}).length*50+(p.battles||0)}
function blankP(p){return !(p.mons||[]).length&&!Object.keys(p.clear||{}).length&&!p.battles}
function pushCloud(){if(!CDOC||!synced)return;clearTimeout(ctimer);ctimer=setTimeout(function(){var p=readJ(PK);if(blankP(p))return;CDOC.set({p:JSON.stringify(p),t:Date.now()}).catch(function(){})},1500)}
(async function(){try{var use=window.claude&&window.claude.use;if(!use)return;var r=await Promise.all([use('db'),use('user')]);if(!r[0]||!r[1])return;
  var id=await r[1].id();if(!id)return;CDOC=r[0].doc('data/users/'+id+'/sciIslesP');var snap=await CDOC.get(),p=readJ(PK);synced=true;
  if(snap.exists){var c={};try{c=JSON.parse(snap.data().p)||{}}catch(e){}
    if((blankP(p)&&!blankP(c))||scoreP(c)>scoreP(p)){try{localStorage.setItem(PK,JSON.stringify(c))}catch(e){}
      /* iframe 裡的面板會收到 storage 事件自動重讀；這一頁的雕像與快捷列也更新 */
      try{syncMons(true)}catch(e){}refreshDock();
      try{if(fr&&fr.contentWindow)fr.contentWindow.dispatchEvent(new StorageEvent('storage',{key:PK}))}catch(e){}return}}
  if(!blankP(p))pushCloud()}catch(e){}})();
/* ---------- 啟動 ---------- */
var css2=document.createElement('style');css2.textContent='.mon-lbl{padding:3px 9px!important;font-size:11.5px!important;gap:5px!important;background:rgba(255,250,243,.9)!important}.mon-lbl b{font-family:var(--f-body)!important;font-size:12px!important}';document.head.appendChild(css2);
var tries=0;(function wait(){if(typeof clickables!=='undefined'&&clickables.length&&window.STAND&&typeof scene!=='undefined'){try{statues()}catch(e){console.error(e)}try{syncMons(true)}catch(e){console.error(e)}
    setTimeout(function(){if(!fr)makeFrame('')},4000);
    var b=document.getElementById('boot');(function go(){if(b&&!b.classList.contains('done')&&++tries<60)return setTimeout(go,120);hashRoute()})();return}
  if(++tries<120)setTimeout(wait,150)})();
document.addEventListener('visibilitychange',function(){if(!document.hidden){syncMons();refreshDock()}});
window.addEventListener('storage',function(e){if(e.key==='sciIsles.P.v1'){syncMons();refreshDock();pushCloud()}});
window.addEventListener('pageshow',function(e){if(e.persisted)location.reload()});
})();
