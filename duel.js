/* 主題島挑戰者：會考塔旁站著 3 位打扮浮誇的培育家（易、中、難），題目用這座島的例題
   另外負責：記住穿搭（登島不用重穿）、對戰後回到挑戰者身邊、套裝加成提示 */
(function(){
'use strict';
var TIERS=[
  {k:1,name:'易',col:'#3f9a55',hex:0x3f9a55,role:'新星培育家',lines:['嘿！看到我的竹蜻蜓帽了嗎？我的理化獸跟它一樣轉得飛快！','新星對新星，來場閃亮亮的對戰吧！']},
  {k:2,name:'中',col:'#e9a23b',hex:0xe9a23b,role:'菁英培育家',lines:['特斯拉線圈帽可不是戴好看的，我的理化獸可是充飽電了。','想挑戰菁英？先讓我看看你對這座島有多熟！']},
  {k:3,name:'難',col:'#d4483a',hex:0xd4483a,role:'島主・傳說培育家',lines:['我是這座島的島主。贏得了我，就送你島主勳章。','王冠只有一頂，能站上這座島頂點的人也只有一個。拿出全力吧！']}
];
var NAMES={A:['原子學徒','元素研究員','物質島主'],B:['能量學徒','焦耳研究員','能量島主'],C:['結晶學徒','結構研究員','結構島主'],D:['細胞學徒','生物研究員','構造島主'],E:['槓桿學徒','力學研究員','系統島主'],F:['觀星學徒','地科研究員','環境島主'],G:['化石學徒','遺傳研究員','演化島主'],H:['地層學徒','化石研究員','歷史島主'],I:['板塊學徒','氣象研究員','地球島主'],J:['燒杯學徒','化學研究員','反應島主'],K:['回音學徒','光學研究員','聲光島主'],L:['生態學徒','保育研究員','生態島主'],M:['發明學徒','科技研究員','人文島主'],N:['綠能學徒','永續研究員','永續島主'],Q:['線圈學徒','電磁研究員','電磁島主']};
var ISLE_NAMES={A:'物質組成島',B:'能量島',C:'結構功能島',D:'生物構造島',E:'物質系統島',F:'地球環境島',G:'演化島',H:'地球歷史島',I:'變動的地球島',J:'化學反應島',K:'聲光島',L:'生態島',M:'科技人文島',N:'永續島',Q:'電磁島'};
/* 三套浮誇造型（直接給 3D 外觀參數） */
var LOOKS=[
  {sex:1,skin:16176051,style:3,hair:14263361,hat:'propeller',hatc:5210022,top:'chroma',shirt:9417075,bottom:'skirt',pants:5205903,neck:'rainbow',scarfc:5210022,acc:'balloon',back:'kite',glasses:'round',shoe:'#fffaf3'},
  {sex:0,skin:15646874,style:4,hair:9067062,hat:'tesla',hatc:15909997,top:'bolt',shirt:15909997,bottom:'boots',pants:4016739,neck:'medal',scarfc:15909997,acc:'sparkler',back:'boltcape',glasses:'sun',shoe:'#3d4a63'},
  {sex:0,skin:14262906,style:5,hair:2826784,hat:'crown',hatc:16037826,top:'volcano',shirt:14702410,bottom:'pants',pants:4869973,neck:'flame',scarfc:14702410,acc:'crystal',back:'cape',glasses:'sun',shoe:'#c96a3f'}
];
var ISL=typeof ISLAND!=='undefined'?ISLAND:null;if(!ISL)return;var HAS_DUEL=!!NAMES[ISL];
var AKEY='sciIsles.avatar';
function readJ(k){try{return JSON.parse(localStorage.getItem(k)||'null')||{}}catch(e){return{}}}
function hasAvatar(){try{return !!localStorage.getItem(AKEY)}catch(e){return false}}
function myMons(){return (readJ('sciIsles.P.v1').mons)||[]}
function duelRec(){return readJ('sciIsles.P.v1').duel||{}}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function G(n){try{return eval(n)}catch(e){return undefined}}

/* 頭上的交叉劍標記 */
var TEX={};
function badgeTex(col){if(TEX[col])return TEX[col];var c=document.createElement('canvas');c.width=c.height=128;var g=c.getContext('2d');
  g.fillStyle='#fffaf3';g.beginPath();g.arc(64,58,46,0,7);g.fill();g.lineWidth=7;g.strokeStyle=col;g.stroke();
  g.beginPath();g.moveTo(52,104);g.lineTo(64,122);g.lineTo(76,104);g.closePath();g.fillStyle='#fffaf3';g.fill();
  g.strokeStyle=col;g.lineWidth=9;g.lineCap='round';g.beginPath();g.moveTo(40,34);g.lineTo(86,80);g.moveTo(88,34);g.lineTo(42,80);g.stroke();
  g.lineWidth=7;g.beginPath();g.moveTo(32,74);g.lineTo(48,88);g.moveTo(96,74);g.lineTo(80,88);g.stroke();
  TEX[col]=new THREE.CanvasTexture(c);return TEX[col]}
function glowTex(){if(TEX._g)return TEX._g;var c=document.createElement('canvas');c.width=c.height=64;var g=c.getContext('2d'),r=g.createRadialGradient(32,32,0,32,32,32);
  r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.35,'rgba(255,255,255,.55)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,64,64);TEX._g=new THREE.CanvasTexture(c);return TEX._g}

var CH=[],FX=[];
/* 在會考塔周圍找 3 個站位 */
function towerSpots(){var T=G('CAPT');if(!T||T.x==null)return null;var HB=G('HUB')||{x:0,z:0},a0=Math.atan2(HB.x-T.x,HB.z-T.z),out=[];
  var fb=G('blocked');if(typeof fb!=='function')return null;
  for(var r=2.1;r<=3.6&&out.length<3;r+=.15){for(var s=0;s<24&&out.length<3;s++){var a=a0+(s%2?1:-1)*Math.ceil(s/2)*.26+(out.length?0:0),x=T.x+Math.sin(a)*r,z=T.z+Math.cos(a)*r;
    if(fb(x,z,.42))continue;var ok=true;for(var i=0;i<out.length;i++)if(Math.hypot(out[i].x-x,out[i].z-z)<1.25){ok=false;break}if(ok)out.push({x:x,z:z,face:Math.atan2(x-T.x,z-T.z)})}}
  return out.length===3?out:null}
function spawnFancy(){var spots=towerSpots();if(!spots)return false;var gy=G('groundY');
  // 難度依離島中心遠近排序：最靠近大家的是新星，島主站在最後面
  spots.forEach(function(sp,i){var t=TIERS[i],p=person(LOOKS[i],1);p.g.scale.setScalar(.95*(1.08+i*.05));
    var y=typeof gy==='function'?gy(sp.x,sp.z):.12,e={p:p,x:sp.x,z:sp.z,y:y,face:sp.face,rot:sp.face,duel:t,fancy:1,home:{x:sp.x,z:sp.z},wait:1+i*1.3,tgt:null,sp:.42+i*.04};
    p.g.position.set(e.x,y,e.z);p.g.rotation.y=e.face;
    // 腳下的光環與環繞光點
    var ring=new THREE.Mesh(new THREE.RingGeometry(.42,.56,40),new THREE.MeshBasicMaterial({color:t.hex,transparent:true,opacity:.75,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
    ring.rotation.x=-Math.PI/2;ring.position.set(sp.x,y+.02,sp.z);scene.add(ring);
    var disc=new THREE.Mesh(new THREE.CircleGeometry(.5,32),new THREE.MeshBasicMaterial({color:t.hex,transparent:true,opacity:.18,depthWrite:false}));disc.rotation.x=-Math.PI/2;disc.position.set(sp.x,y+.015,sp.z);scene.add(disc);
    var dots=[];for(var d=0;d<(4+i*2);d++){var s=new THREE.Sprite(new THREE.SpriteMaterial({map:glowTex(),color:i===2?0xffd56a:t.hex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));s.scale.set(.16,.16,1);scene.add(s);dots.push(s)}
    FX.push({e:e,ring:ring,disc:disc,dots:dots,i:i});CH.push(e)});
  return true}
/* 備用：找不到會考塔時，從島民中挑 3 位 */
function pickIdlers(){var pool=idlers.filter(function(e){return e&&e.p&&e.p.g});if(pool.length<3)return false;
  var seed=ISL.charCodeAt(0),chosen=[pool[seed%pool.length]];
  while(chosen.length<3){var best=null,bd=-1;pool.forEach(function(e){if(chosen.indexOf(e)>=0)return;var d=Math.min.apply(null,chosen.map(function(c){return Math.hypot(e.x-c.x,e.z-c.z)}));if(d>bd){bd=d;best=e}});chosen.push(best)}
  chosen.forEach(function(e,i){e.duel=TIERS[i];CH.push(e)});return true}
function tick(T){CH.forEach(function(e,i){var t=e.duel,g=e.p&&e.p.g;if(!g)return;
  if(!e.mk||e.mk.parent!==g){var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:badgeTex(t.col),depthTest:false,transparent:true}));sp.scale.set(.62,.62,1);sp.renderOrder=999;g.add(sp);e.mk=sp}
  e.mk.position.y=(e.fancy?2.15:1.95)+Math.sin(T*2.2+i)*.08;
  e.p.cn=[NAMES[ISL][i],t.col,'挑戰者・'+t.name+'・'+t.role]});
  FX.forEach(function(f){var e=f.e,k=1+.08*Math.sin(T*3+f.i);f.ring.scale.set(k,k,1);f.ring.rotation.z=T*(.6+f.i*.3);f.ring.material.opacity=.55+.25*Math.sin(T*3+f.i);
    var n=f.dots.length;f.dots.forEach(function(s,j){var a=T*(1.1+f.i*.25)+j/n*Math.PI*2,r=.5+.06*Math.sin(T*2+j);s.position.set(e.x+Math.sin(a)*r,e.y+.35+((T*.45+j/n)%1)*1.5,e.z+Math.cos(a)*r);s.material.opacity=1-((T*.45+j/n)%1)})})}
/* 挑戰者在會考塔附近散步：不佔碰撞、玩家靠近就停下來面向玩家 */
var FANCY=false,TW=G('CAPT');
function pickTarget(e){var fb=G('blocked');for(var n=0;n<12;n++){var a=Math.random()*Math.PI*2,r=.4+Math.random()*1.4,x=e.home.x+Math.sin(a)*r,z=e.home.z+Math.cos(a)*r;
  if(TW&&Math.hypot(x-TW.x,z-TW.z)<1.95)continue;var ok=true;for(var k=1;k<=4&&ok;k++){var mx=e.x+(x-e.x)*k/4,mz=e.z+(z-e.z)*k/4;if(typeof fb==='function'&&fb(mx,mz,.3))ok=false}
  if(ok&&CH.every(function(o){return o===e||Math.hypot((o.tgt?o.tgt.x:o.x)-x,(o.tgt?o.tgt.z:o.z)-z)>.9}))return{x:x,z:z}}return null}
function walkTick(T,dt){if(!FANCY)return;dt=Math.min(dt||.016,.05);var gy=G('groundY'),pw=false,px=0,pz=0;try{pw=walking&&!!player;px=PL.x;pz=PL.z}catch(x){}
  CH.forEach(function(e){var moving=false,near=pw&&Math.hypot(px-e.x,pz-e.z)<1.7;
    if(e.talk||near){e.face=Math.atan2(px-e.x,pz-e.z);e.wait=Math.max(e.wait,1.2)}
    else if(e.wait>0)e.wait-=dt;
    else{if(!e.tgt){e.tgt=pickTarget(e);if(!e.tgt)e.wait=1}
      if(e.tgt){var dx=e.tgt.x-e.x,dz=e.tgt.z-e.z,d=Math.hypot(dx,dz);
        if(d<.05){e.tgt=null;e.wait=1.5+Math.random()*3.5}
        else{var st=Math.min(d,e.sp*dt);e.x+=dx/d*st;e.z+=dz/d*st;e.face=Math.atan2(dx,dz);moving=true}}}
    var df=Math.atan2(Math.sin(e.face-e.rot),Math.cos(e.face-e.rot));e.rot+=df*Math.min(1,dt*7);
    e.y=typeof gy==='function'?gy(e.x,e.z):e.y;var g=e.p.g;g.position.set(e.x,e.y,e.z);g.rotation.y=e.rot;
    try{animPerson(e.p,moving,dt*.8,T)}catch(x){}})}
function wire(){FANCY=spawnFancy();if(FANCY){var cp=chatPeople;window.chatPeople=chatPeople=function(){return cp().concat(CH)}}else if(!pickIdlers())return;
  var orig=openChat;
  window.openChat=openChat=function(k){var e=chatPeople()[k];if(e&&e.duel)return openDuel(e,k);return orig(k)};
  if(typeof anim!=='undefined'&&anim.push)anim.push(function(T,dt){walkTick(T,dt);tick(T)});else setInterval(function(){var T=performance.now()/1000;walkTick(T,.05);tick(T)},50);
  tick(0);returnFromDuel();
}
function openDuel(e,k){
  var t=e.duel,i=TIERS.indexOf(t),o=$('chat');if(!o)return;
  CHAT.who&&CHAT.who!==e&&(CHAT.who.talk=0);CHAT.on=1;(CHAT.who=e).talk=1;try{SFX.page&&SFX.page()}catch(x){}
  var name=NAMES[ISL][i],mons=myMons(),rec=duelRec()[ISL+t.k]||{},head='<div class="ch-h"><div class="ch-av" style="background:'+t.col+'">'+name[0]+'</div><div><div class="ch-n">'+esc(name)+'</div><div class="ch-r">挑戰者・難度'+t.name+(rec.w?'・已擊敗 '+rec.w+' 次':'')+'</div></div><button class="ch-x" aria-label="結束對話">×</button></div>';
  var body;
  if(!mons.length){
    body='<div class="ch-t">'+t.lines[0]+'<br>咦？你身邊還沒有理化獸耶。<br>先去航海圖的<b>理化獸競技島</b>，在<b>培育中心</b>領養一隻，再回來找我對戰吧！</div><div class="ch-o"><button class="pri" data-go="adopt">帶我去培育中心</button><button data-end="1">好，等等再來</button></div>';
  }else{
    var lv=mons.map(function(m){return lvOfXp(m.xp)}),mx=Math.max.apply(null,lv),cnt=[1,2,3][i],foeLv=Math.max(1,[mx-3,Math.round((mx+lv.reduce(function(a,b){return a+b},0)/lv.length)/2),mx+2][i]),rw=[15,30,60][i];
    body='<div class="ch-t">'+t.lines[(Math.random()*t.lines.length)|0]+'<br><span style="font-size:13px;color:var(--ink-soft)">對手 '+cnt+' 隻・約 Lv'+foeLv+'・題目出自這座島的例題・勝利 +'+rw+' 經驗能量'+(i===2&&!rec.w?'・首勝送島主勳章':'')+'</span></div>'+
      '<div class="ch-o"><button class="pri" data-go="duel">接受挑戰</button><button data-end="1">下次吧</button></div>';
  }
  o.innerHTML=head+body;o.classList.add('show');var ba=$('bAct');if(ba)ba.hidden=true;
  o.querySelector('.ch-x').onclick=closeChat;
  o.querySelectorAll('[data-end]').forEach(function(b){b.onclick=closeChat});
  o.querySelectorAll('[data-go]').forEach(function(b){b.onclick=function(){
    try{localStorage.setItem('sciIsles.lastIsle',ISL)}catch(x){}
    if(b.dataset.go==='adopt'){location.href='P.html#nursery';return}
    location.href='P-battle.html#d='+ISL+t.k;
  }});
}
function lvOfXp(xp){var lv=1,s=0;while(lv<30){var need=30+lv*15;if(xp<s+need)break;s+=need;lv++}return lv}

/* 對戰結束回島：直接站在剛才那位挑戰者面前 */
function returnFromDuel(){var m=/ret=([A-Z])([123])/.exec(location.hash||'');if(!m||m[1]!==ISL)return;
  try{history.replaceState(null,'',location.pathname+location.search)}catch(x){}
  if(!hasAvatar())return;var e=CH[+m[2]-1];if(!e)return;var n=0;
  (function go(){var b=document.getElementById('boot');if(b&&!b.classList.contains('done')&&++n<80)return setTimeout(go,100);
    requestAnimationFrame(function(){requestAnimationFrame(function(){try{
      if(typeof enterWalk!=='function')return;enterWalk();var fb=G('blocked'),best=null;
      for(var r=1.05;r<=2.2&&!best;r+=.15)for(var s=0;s<16;s++){var a=e.face+(s%2?1:-1)*Math.ceil(s/2)*.35,x=e.x+Math.sin(a)*r,z=e.z+Math.cos(a)*r;if(typeof fb!=='function'||!fb(x,z,.35)){best={x:x,z:z};break}}
      if(best){PL.x=best.x;PL.z=best.z;yaw=Math.atan2(e.x-PL.x,e.z-PL.z)}
      tween=null;try{toast('對戰結束，回到 <b>'+esc(e.p.cn?e.p.cn[0]:NAMES[ISL][+m[2]-1])+'</b> 身邊',2400)}catch(x){}
    }catch(x){console.error(x)}})})})()}

/* 記住穿搭：存過角色就直接走進島；走路中換裝不會被傳回廣場 */
function wireWalk(){var bw=$('bWalk'),go=$('avGo');if(!bw||!go||typeof enterWalk!=='function')return;
  bw.onclick=function(){try{closeList()}catch(x){}try{0<=current&&closeUnit(!0)}catch(x){}
    if(hasAvatar()){enterWalk();return}renderCreator();document.body.classList.add('creating')};
  go.onclick=function(){try{localStorage.setItem(AKEY,JSON.stringify(avatar))}catch(x){}document.body.classList.remove('creating');
    if(G('walking')&&typeof buildPlayer==='function'){buildPlayer();try{toast('換好了！',1400)}catch(x){}}else enterWalk()};
  var top=document.querySelector('.wtop'),ex=$('bExit');
  if(top&&!$('bDress')){var b=document.createElement('button');b.className='sbtn';b.id='bDress';b.textContent='換裝';b.onclick=function(){try{CHAT.on&&closeChat()}catch(x){}renderCreator();document.body.classList.add('creating')};top.insertBefore(b,ex||null)}}

/* 套裝提示：換上有加成的服裝時浮出小視窗 */
var lastSet=null,lastAv=null;
function curTotal(){try{return GEAR.total(avatar,AV_OPTS)}catch(e){return null}}
function islCount(){var c={};try{Object.keys(AV_OPTS).forEach(function(cat){var o=AV_OPTS[cat],i=avatar[cat];if(i==null||!o.lock)return;var code=o.lock[i];if(!code||!o.names)return;var I=String(code)[0];if(/[A-Q]/.test(I))c[I]=(c[I]||0)+1})}catch(e){}return c}
function pop(html,gold){var el=$('setPop');if(!el){el=document.createElement('div');el.id='setPop';document.body.appendChild(el);
  var st=document.createElement('style');st.textContent='#setPop{position:fixed;left:50%;top:calc(14px + env(safe-area-inset-top,0px));transform:translate(-50%,-140%);z-index:9999;max-width:min(92vw,380px);padding:12px 16px;border-radius:18px;background:#fffaf3;color:#2b2622;box-shadow:0 10px 30px rgba(0,0,0,.25);border:2px solid #e9c46a;font-size:14px;line-height:1.55;transition:transform .45s cubic-bezier(.2,.9,.2,1.2);pointer-events:none}#setPop.show{transform:translate(-50%,0)}#setPop.gold{background:linear-gradient(135deg,#fff3c4,#ffd978);border-color:#d9a21b}#setPop b.t{display:block;font-size:15.5px;font-weight:900;color:#8a5a00;margin-bottom:2px}#setPop .s{display:block;font-size:12.5px;color:#6b5a3a}';document.head.appendChild(st)}
  el.className=gold?'gold':'';el.innerHTML=html;void el.offsetWidth;el.classList.add('show');clearTimeout(pop.t);pop.t=setTimeout(function(){el.classList.remove('show')},gold?3600:2400)}
function onDress(cat,idx){var tot=curTotal();if(!tot)return;var set=tot.set?tot.set.isl:null;
  if(set&&set!==lastSet){try{SFX.done&&SFX.done()}catch(x){}pop('<b class="t">套裝效果啟動！'+(ISLE_NAMES[set]||set)+'套裝</b>同一座島的服裝穿了 '+tot.set.n+' 件：理化獸血量 +5%・攻擊 +2%<span class="s">目前總加成：'+GEAR.fmt(tot.sum)+'</span>',true)}
  else if(!set&&lastSet){pop('<b class="t">套裝效果解除</b>'+(ISLE_NAMES[lastSet]||lastSet)+'的服裝少於 3 件了')}
  else{var o=AV_OPTS[cat],code=o&&o.lock&&o.lock[idx],b=code&&o.names?GEAR.itemBonus(cat,o.names[idx],code):null;
    if(b){var I=String(code)[0],c=islCount()[I]||0,nd=GEAR.need?GEAR.need(I,AV_OPTS):3,hint=!set&&c===nd-1&&nd>1?'<span class="s">再穿 1 件'+(ISLE_NAMES[I]||'')+'的服裝，就能湊成套裝</span>':'';pop('<b class="t">'+esc(o.names[idx])+'</b>理化獸加成：'+GEAR.fmt(b)+hint)}}
  lastSet=set}
function wireSetPop(){if(typeof GEAR==='undefined'||typeof AV_OPTS==='undefined')return;var t=curTotal();lastSet=t&&t.set?t.set.isl:null;
  document.addEventListener('click',function(ev){var c=ev.target.closest&&ev.target.closest('.avc');if(!c||c.classList.contains('lock'))return;var k=c.dataset.k,i=+c.dataset.i;setTimeout(function(){if(avatar[k]===i)onDress(k,i)},30)});
  var r=$('avRand');if(r)r.addEventListener('click',function(){setTimeout(function(){var t=curTotal(),s=t&&t.set?t.set.isl:null;if(s&&s!==lastSet)onDress('',0);lastSet=s},30)})}


/* 換裝清單：同一座島的服裝用同一個顏色，正在湊套裝的標上「套」 */
var ICOL={A:'#c4602f',B:'#b9790f',C:'#b2566a',D:'#5e8a40',E:'#3f6f99',F:'#3f8a84',G:'#6c9152',H:'#93704a',I:'#b05e12',J:'#c2463a',K:'#3d8fb5',L:'#4a874a',M:'#8a6646',N:'#3f7a55',Q:'#6a5fb0'};
function paintCreator(){var rows=$('avRows');if(!rows||typeof AV_OPTS==='undefined')return;var cnt=islCount(),tot=curTotal(),sets=tot&&tot.sets?tot.sets:[],inSet=function(I){return sets.some(function(x){return x.isl===I})};
  rows.querySelectorAll('.avc.txt[data-k]').forEach(function(b){if(b.classList.contains('lock'))return;var o=AV_OPTS[b.dataset.k],code=o&&o.lock&&o.lock[+b.dataset.i],I=code?String(code)[0]:'';if(!ICOL[I])return;
    b.style.color=b.classList.contains('on')?'':ICOL[I];b.style.boxShadow='inset 3px 0 0 '+ICOL[I];
    var nd=GEAR.need?GEAR.need(I,AV_OPTS):3;if(b.classList.contains('on')&&(cnt[I]>=2||inSet(I))&&!b.querySelector('.stag')){var t=document.createElement('span');t.className='stag';t.textContent=inSet(I)?'套':cnt[I]+'/'+nd;t.style.cssText='margin-left:5px;font-size:10.5px;font-weight:800;border-radius:99px;padding:0 5px;line-height:16px;color:#fff;background:'+ICOL[I];b.appendChild(t)}});
  var hint=$('avHint');if(hint&&!$('setLegend')){var l=document.createElement('span');l.id='setLegend';l.style.cssText='display:block;margin-top:4px;font-size:12.5px';hint.appendChild(l)}
  var L=$('setLegend');if(L)L.innerHTML='左邊色條和文字顏色相同的服裝，來自同一座島；同一座島穿滿 3 件就有套裝效果，可以同時湊好幾套'+(sets.length?'。目前生效：'+sets.map(function(x){return '<b style="color:'+ICOL[x.isl]+'">'+(ISLE_NAMES[x.isl]||x.isl)+'・'+x.name+'</b>'}).join('、'):'')}
function wirePaint(){var rows=$('avRows');if(!rows)return;var busy=false;new MutationObserver(function(){if(busy)return;busy=true;try{paintCreator()}catch(e){}if(SETMODE)try{renderSets()}catch(e){}setTimeout(function(){busy=false},0)}).observe(rows,{childList:true});try{paintCreator()}catch(e){}}

/* 套裝選單：列出每座島的套裝，一鍵換上，直接看效果 */
var SETMODE=false;
function setsInfo(){var out={};Object.keys(AV_OPTS).forEach(function(cat){var o=AV_OPTS[cat];if(!o.lock||!o.names)return;o.lock.forEach(function(code,i){if(!code)return;var I=String(code)[0];if(!ICOL[I])return;
    var s=out[I]||(out[I]={I:I,items:[],cats:{}});var lk=false;try{lk=isLocked(cat,i)}catch(e){}s.items.push({cat:cat,i:i,name:o.names[i],lock:lk});if(!lk)(s.cats[cat]=s.cats[cat]||[]).push(i)})});
  return Object.keys(out).map(function(k){return out[k]})}
function bestPick(cat,list){var best=list[0],bv=-1;list.forEach(function(i){var b=GEAR.itemBonus(cat,AV_OPTS[cat].names[i],AV_OPTS[cat].lock[i])||{},v=0;for(var k in b)v+=b[k];if(v>bv){bv=v;best=i}});return best}
function wearSet(s,base){var av=Object.assign({},base||avatar),cats=Object.keys(s.cats);cats.forEach(function(cat){av[cat]=bestPick(cat,s.cats[cat])});return av}
function renderSets(){var box=$('setPanel');if(!box)return;var cur=curTotal(),curSets=(cur&&cur.sets||[]).map(function(x){return x.isl}),list=setsInfo();
  list.forEach(function(s){var nd=GEAR.need(s.I,AV_OPTS),have=Object.keys(s.cats).length;s.nd=nd;s.ok=have>=nd;var t=GEAR.total(wearSet(s),AV_OPTS);s.prev=t;s.unl=s.items.filter(function(x){return !x.lock}).length});
  list.sort(function(a,b){return (curSets.indexOf(b.I)>=0)-(curSets.indexOf(a.I)>=0)||(b.ok-a.ok)||(b.unl/b.items.length-a.unl/a.items.length)});
  box.innerHTML='<p class="sp-cur">目前加成：<b>'+(cur&&GEAR.fmt(cur.sum)||'沒有')+'</b>'+(curSets.length?'<br>套裝效果生效中：'+curSets.map(function(I){return '<b style="color:'+ICOL[I]+'">'+(ISLE_NAMES[I]||I)+'・'+GEAR.tierName(I)+'</b>'}).join('、'):'')+'</p>'+
   list.map(function(s){var c=ICOL[s.I],on=curSets.indexOf(s.I)>=0;return '<div class="sp-card'+(on?' on':'')+'" style="--c:'+c+'"><div class="sp-h"><b>'+(ISLE_NAMES[s.I]||s.I)+'・'+GEAR.tierName(s.I)+'</b><span>已解鎖 '+s.unl+'/'+s.items.length+'・穿 '+s.nd+' 件成套</span></div>'+
     '<div class="sp-it">'+s.items.map(function(x){return '<span class="'+(x.lock?'lk':'')+'">'+esc(x.name)+'</span>'}).join('')+'</div>'+
     (s.ok?'<div class="sp-ef">換上後：'+GEAR.fmt(s.prev.sum)+((s.prev.sets||[]).some(function(x){return x.isl===s.I})?'<em>含套裝效果</em>':'')+'</div><button class="sp-go" data-set="'+s.I+'">'+(on?'已穿上':'一鍵換上')+'</button>':
       '<div class="sp-ef lk">還差 '+(s.nd-Object.keys(s.cats).length)+' 個部位的服裝，到'+(ISLE_NAMES[s.I]||'')+'蓋章就能解鎖</div>')+'</div>'}).join('');
  box.querySelectorAll('[data-set]').forEach(function(b){b.onclick=function(){var s=list.filter(function(x){return x.I===b.dataset.set})[0];if(!s)return;
    var nv=wearSet(s);Object.keys(nv).forEach(function(k){avatar[k]=nv[k]});try{SFX.tick&&SFX.tick()}catch(e){}
    try{renderCreator()}catch(e){}onDress('',0);renderSets()}})}
function wireSets(){var cr=$('creator'),rows=$('avRows');if(!cr||!rows||$('setTabs'))return;
  var st=document.createElement('style');st.textContent='#setTabs{display:flex;gap:6px;margin:0 0 10px}#setTabs button{flex:1;border:0;border-radius:12px;padding:9px;font:inherit;font-weight:800;font-size:14px;cursor:pointer;background:var(--paper-2,#f6efe4);color:var(--ink,#3b302a)}#setTabs button.on{background:var(--ink,#3b302a);color:var(--paper,#fffaf3)}'+
   '#setPanel{display:none;flex-direction:column;gap:8px;min-width:0}body.setmode #setPanel{display:flex}body.setmode #avRows{display:none!important}.sp-cur{margin:0 0 2px;font-size:13px;line-height:1.6;color:var(--ink-soft,#7a6c62)}.sp-cur b{color:#b0700f}'+
   '.sp-card{border-radius:16px;background:var(--paper-2,#f6efe4);padding:10px 12px;box-shadow:inset 4px 0 0 var(--c)}.sp-card.on{background:#fff6dc;box-shadow:inset 4px 0 0 var(--c),0 0 0 2px var(--c)}.sp-h{display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap}.sp-h b{color:var(--c);font-size:15.5px}.sp-h span{font-size:12px;color:var(--ink-soft,#7a6c62)}'+
   '.sp-it{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.sp-it span{font-size:12px;border-radius:99px;padding:1px 8px;background:#fff;color:var(--c);font-weight:700}.sp-it span.lk{color:#b9ada0;font-weight:500;text-decoration:line-through}'+
   '.sp-ef{font-size:12.5px;font-weight:700;color:#b0700f;line-height:1.6}.sp-ef.lk{color:var(--ink-soft,#7a6c62);font-weight:500}.sp-ef em{font-style:normal;margin-left:6px;background:var(--c);color:#fff;border-radius:99px;padding:0 6px;font-size:11px}'+
   '.sp-go{margin-top:6px;width:100%;border:0;border-radius:12px;padding:9px;font:inherit;font-weight:800;cursor:pointer;background:var(--c);color:#fff}.sp-card.on .sp-go{background:#fff;color:var(--c);box-shadow:inset 0 0 0 2px var(--c)}';
  document.head.appendChild(st);
  var tabs=document.createElement('div');tabs.id='setTabs';tabs.innerHTML='<button type="button" data-m="0" class="on">單件服裝</button><button type="button" data-m="1">套裝選單</button>';
  var wrap=rows.closest('.avwrap')||rows.parentNode;wrap.parentNode.insertBefore(tabs,wrap);var pn=document.createElement('div');pn.id='setPanel';rows.parentNode.insertBefore(pn,rows.nextSibling);
  tabs.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;SETMODE=b.dataset.m==='1';tabs.querySelectorAll('button').forEach(function(x){x.classList.toggle('on',x===b)});document.body.classList.toggle('setmode',SETMODE);if(SETMODE)renderSets();try{SFX.tick&&SFX.tick()}catch(x){}})}
var tries=0;(function wait(){if(typeof idlers!=='undefined'&&idlers.length&&typeof THREE!=='undefined'&&typeof openChat==='function'&&typeof $==='function'&&typeof person==='function'){
  try{wireWalk()}catch(e){console.error(e)}try{wireSetPop()}catch(e){console.error(e)}try{wirePaint()}catch(e){console.error(e)}try{wireSets()}catch(e){console.error(e)}if(HAS_DUEL)try{wire()}catch(e){console.error(e)}return}if(++tries<100)setTimeout(wait,200)})();
})();
