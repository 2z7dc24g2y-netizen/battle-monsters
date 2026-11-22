/* 島上的晨昏：跟首頁同一個設定（sciIsles.tod：跟著真實時間／清晨／白天／黃昏／夜晚）
   夜裡天色變暗、路燈亮起、星星出來。煙火時仍由煙火接管。 */
(function(){
'use strict';
var K={day:0,dawn:.38,dusk:.5,night:1};
function mode(){try{return localStorage.getItem('sciIsles.tod')||'auto'}catch(e){return 'auto'}}
function real(){var d=new Date(),h=d.getHours()+d.getMinutes()/60;return h<5?'night':h<7.5?'dawn':h<16.5?'day':h<18.8?'dusk':'night'}
var cur='',glows=[],stars=null,shown=0;
function ok(){return typeof THREE!=='undefined'&&typeof scene!=='undefined'&&typeof IN!=='undefined'}
function glowTex(){var c=document.createElement('canvas');c.width=c.height=64;var g=c.getContext('2d'),r=g.createRadialGradient(32,32,2,32,32,31);
  r.addColorStop(0,'rgba(255,246,214,1)');r.addColorStop(.25,'rgba(255,214,140,.75)');r.addColorStop(1,'rgba(255,190,110,0)');g.fillStyle=r;g.fillRect(0,0,64,64);return new THREE.CanvasTexture(c)}
function build(){if(glows.length||!ok())return;var tex=glowTex();
  (IN.lampHead||[]).forEach(function(p){var m=new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,opacity:0,fog:false});
    var s=new THREE.Sprite(m);s.position.set(p.x,p.y,p.z);s.scale.set(1.5,1.5,1);s.renderOrder=3;scene.add(s);glows.push(s)});
  var N=420,pos=new Float32Array(N*3);for(var i=0;i<N;i++){var a=Math.random()*6.283,b=Math.random()*1.25+.18,r=150;
    pos[i*3]=Math.cos(a)*Math.cos(b)*r;pos[i*3+1]=Math.sin(b)*r;pos[i*3+2]=Math.sin(a)*Math.cos(b)*r}
  var g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));
  stars=new THREE.Points(g,new THREE.PointsMaterial({color:0xfff6dc,size:1.1,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false,fog:false}));
  stars.frustumCulled=false;scene.add(stars);
  if(typeof anim!=='undefined')anim.push(function(T){var n=(typeof nightK!=='undefined'?nightK:0),w=Math.max(0,Math.min(1,(n-.25)/.45));
    if(w===shown&&w===0)return;shown=w;
    glows.forEach(function(s,i){s.material.opacity=w*(.82+.1*Math.sin(T*2+i));s.visible=w>.01});
    if(stars){stars.material.opacity=w*.9;stars.visible=w>.01;if(typeof camera!=='undefined')stars.position.copy(camera.position)}})}
function deepen(){try{if(typeof NIGHT!=='undefined'&&!NIGHT.__t){NIGHT.__t=1;NIGHT.hemi=.1;NIGHT.sun=.07;NIGHT.fill=.035;NIGHT.bg.setHex(0x0f1830);NIGHT.fog.setHex(0x0f1830)}}catch(e){}}
function upd(){deepen();var m=mode(),t=m==='auto'?real():m;if(t===cur)return;cur=t;window.TOD=t;window.TODN=K[t]||0;document.documentElement.dataset.tod=t;build()}
upd();setInterval(upd,30000);
addEventListener('storage',function(e){if(e.key==='sciIsles.tod')upd()});
document.addEventListener('visibilitychange',function(){if(!document.hidden)upd()});
var tries=0;(function wait(){if(ok()&&(IN.lampHead||[]).length){deepen();build();return}if(++tries<80)setTimeout(wait,250)})();
})();
