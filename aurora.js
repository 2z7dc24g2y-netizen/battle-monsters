/* 會考極光：依歷屆會考（520 題）出現次數，在每個單元上方升起彩色極光
 * 越常考 → 越高、越亮、顏色越暖（綠 → 青藍 → 紫紅 → 金紅）。作者：辛巴王 */
(function () {
  'use strict';
  /* 每座島、每個單元（01 起算）在歷屆會考出現的題數 */
  var CNT = {"A":{"1":9,"3":3,"4":4,"7":7,"8":5,"9":6},"B":{"1":1,"3":4,"4":2,"6":4,"7":4,"8":2,"10":6,"11":9},"C":{"1":1,"2":3,"4":1},"D":{"1":5,"2":3,"3":3,"4":2,"6":4,"7":2,"8":7,"9":2,"10":7,"11":4,"13":4,"14":4,"15":3,"16":7,"17":2},"E":{"1":13,"3":2,"4":4,"5":4,"6":3,"7":5,"8":8,"9":5,"10":2,"11":5,"12":2,"13":2,"14":4,"15":2,"16":5,"17":4,"18":2},"F":{"2":2,"4":1,"5":1,"6":5,"7":3,"8":3,"10":8,"11":2},"G":{"1":1,"2":3,"3":2,"4":3,"6":7,"8":5,"9":1,"10":1,"11":6,"12":5,"13":3,"14":2,"15":4},"H":{"1":2,"4":2,"5":3,"6":1,"7":1,"8":1},"I":{"1":3,"2":2,"3":4,"4":3,"5":8,"6":3,"7":5,"8":4,"9":5,"10":4,"11":3,"12":3,"13":2,"14":4,"15":2,"16":8},"J":{"1":4,"2":4,"3":7,"4":2,"5":7,"6":9,"7":4,"8":2,"9":4,"10":5,"11":7,"12":3,"13":1,"14":7,"15":4,"16":3},"K":{"1":6,"2":1,"3":4,"4":2,"5":2,"7":3,"9":3},"L":{"1":1,"2":2,"4":4,"5":1,"6":4,"7":1,"10":1,"13":1,"14":3},"M":{"6":2,"7":2,"9":3,"11":2},"N":{"6":3,"8":2,"11":1,"14":5},"Q":{"1":4,"2":7,"3":1,"4":4,"5":1,"6":4,"7":2,"8":1}};
  /* 四級：題數門檻、高度、亮度、底色 → 頂色 */
  var TIER = [null,
    { min: 1, h: 13, a: .2, c1: 0x2fe39a, c2: 0x2bc6ff, name: '偶爾考' },
    { min: 3, h: 18, a: .27, c1: 0x22d3ff, c2: 0x6f7bff, name: '常考' },
    { min: 5, h: 24, a: .35, c1: 0x8a5cff, c2: 0xff4fd8, name: '很常考' },
    { min: 8, h: 32, a: .44, c1: 0xffc23a, c2: 0xff3d7a, name: '必考重點' }];
  function tierOf(n) { for (var t = 4; t >= 1; t--) if (n >= TIER[t].min) return t; return 0; }
  var KEY = 'sciIsles.aurora', on = true;
  try { on = localStorage.getItem(KEY) !== '0'; } catch (e) {}

  var VS = 'varying vec2 vUv;uniform float uT;uniform float uPh;' +
    'void main(){vUv=uv;vec3 p=position;float w=sin(p.y*.18+uT*1.1+uPh)*.35+sin(p.x*2.1+uT*.7+uPh)*.1;p.x+=w*uv.y;p.z+=cos(p.y*.14+uT+uPh)*.25*uv.y;' +
    'gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}';
  var FS = 'varying vec2 vUv;uniform float uT;uniform float uPh;uniform float uA;uniform vec3 uC1;uniform vec3 uC2;' +
    'void main(){float y=vUv.y;' +
    /* 由下往上衝的光束：垂直條紋＋往上流動的亮帶 */
    'float rays=.55+.45*sin(vUv.x*38.+uPh*3.+sin(vUv.x*9.+uT*.6)*2.);' +
    'float flow=.6+.4*sin((y*14.-uT*3.)+vUv.x*4.+uPh);' +
    'float edge=smoothstep(0.,.12,vUv.x)*smoothstep(1.,.88,vUv.x);' +
    'float fade=smoothstep(0.,.03,y)*pow(1.-y,1.15);' +
    'float a=uA*rays*flow*edge*fade;vec3 col=mix(uC1,uC2,smoothstep(.05,.9,y))*(.85+.3*flow);' +
    'gl_FragColor=vec4(col,a);}';
  var GS = 'varying vec2 vUv;uniform float uT;uniform float uA;uniform vec3 uC1;' +
    'void main(){float d=length(vUv-.5)*2.;float a=uA*smoothstep(1.,.2,d)*(.75+.25*sin(uT*2.));gl_FragColor=vec4(uC1*1.2,a*.4);}';

  var ROOT = null, MATS = [];
  function curtain(T, i, n, r) {
    /* 一片彎成弧形的極光簾，繞著單元 */
    var seg = 28, g = new THREE.PlaneGeometry(1, T.h, seg, 16), pos = g.attributes.position;
    var a0 = (i / n) * Math.PI * 2 + Math.random() * .6, span = Math.PI * (.55 + Math.random() * .25);
    for (var k = 0; k < pos.count; k++) {
      var u = pos.getX(k) + .5, ang = a0 + u * span, y = pos.getY(k) + T.h / 2;
      var rr = r * (1 + .35 * y / T.h); pos.setXYZ(k, Math.cos(ang) * rr, y, Math.sin(ang) * rr);
    }
    g.computeBoundingSphere();
    var m = new THREE.ShaderMaterial({
      vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uPh: { value: Math.random() * 6.28 }, uA: { value: T.a }, uC1: { value: new THREE.Color(T.c1) }, uC2: { value: new THREE.Color(T.c2) } }
    });
    MATS.push(m);
    var mesh = new THREE.Mesh(g, m); mesh.renderOrder = 5; mesh.frustumCulled = false;
    return mesh;
  }
  function build() {
    var isl = typeof ISLAND !== 'undefined' ? ISLAND : '', cnt = CNT[isl];
    if (!cnt || typeof UNITS === 'undefined') return false;
    ROOT = new THREE.Group(); ROOT.name = 'aurora';
    UNITS.forEach(function (U, i) {
      var n = cnt[String(i + 1)] || 0, t = tierOf(n); if (!t || !U.pos) return;
      var T = TIER[t], x = U.pos[0], z = U.pos[1], y0 = 0;
      if (typeof PY !== 'undefined') y0 = PY; else { try { y0 = groundY(x, z); } catch (e) { y0 = 0; } }
      var g = new THREE.Group(); g.position.set(x, y0 + .05, z);
      var nc = t >= 3 ? 3 : 2, r = .85 + t * .12;
      for (var k = 0; k < nc; k++) g.add(curtain(T, k, nc, r - k * .12));
      /* 地面光暈 */
      var gm = new THREE.ShaderMaterial({ vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}', fragmentShader: GS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uT: { value: 0 }, uA: { value: T.a }, uC1: { value: new THREE.Color(T.c1) } } });
      MATS.push(gm);
      var ring = new THREE.Mesh(new THREE.PlaneGeometry(r * 2.6, r * 2.6), gm); ring.rotation.x = -Math.PI / 2; ring.position.y = .06; ring.renderOrder = 4;
      g.add(ring); ROOT.add(g);
    });
    ROOT.visible = on; scene.add(ROOT);
    anim.push(function (T) { if (!ROOT.visible) return; for (var i = 0; i < MATS.length; i++) MATS[i].uniforms.uT.value = T; });
    ui(cnt);
    return true;
  }

  /* 左上角的開關與圖例 */
  function ui(cnt) {
    var st = document.createElement('style');
    st.textContent = '#aurBtn{position:fixed;z-index:5;left:max(14px,env(safe-area-inset-left,0px));top:calc(env(safe-area-inset-top,0px) + 92px);display:flex;align-items:center;gap:8px;border:0;cursor:pointer;' +
      'background:rgba(255,250,243,.94);border-radius:14px;padding:7px 12px;font:700 13px var(--f-body,system-ui);color:#3b302a;box-shadow:0 4px 14px rgba(59,48,42,.16)}' +
      '#aurBtn i{display:block;width:46px;height:8px;border-radius:4px;background:linear-gradient(90deg,#2fe39a,#22d3ff,#8a5cff,#ff4fd8,#ffc23a)}#aurBtn.off{opacity:.65}#aurBtn.off i{filter:grayscale(1)}' +
      'body:has(.cap-chip) #aurBtn{top:calc(env(safe-area-inset-top,0px) + 136px)}' +
      '#aurBtn:focus-visible{outline:3px solid #e2774a;outline-offset:2px}' +
      'body.walking #aurBtn,body.creating #aurBtn,body.reading #aurBtn,body.listing #aurBtn,body.questing #aurBtn,body.intro #aurBtn,body.hubbing #aurBtn{display:none}';
    document.head.appendChild(st);
    var b = document.createElement('button'); b.id = 'aurBtn'; b.type = 'button';
    var hot = Object.keys(cnt).filter(function (u) { return tierOf(cnt[u]) === 4; }).length;
    b.title = '極光越高、越亮、越偏金紅色，代表這個單元在歷屆會考越常出現';
    var paint = function () { b.classList.toggle('off', !on); b.innerHTML = '<i aria-hidden="true"></i>會考極光' + (on ? (hot ? '・必考 ' + hot : '') : '（關）'); b.setAttribute('aria-pressed', on); };
    b.onclick = function () { on = !on; ROOT.visible = on; try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {} paint(); };
    paint(); document.body.appendChild(b);
  }

  var tries = 0;
  (function wait() {
    if (typeof THREE !== 'undefined' && typeof scene !== 'undefined' && typeof anim !== 'undefined' && typeof UNITS !== 'undefined') { try { build(); } catch (e) { console.error(e); } return; }
    if (++tries < 120) setTimeout(wait, 150);
  })();
  window.AURORA = { count: function (isl, u) { return (CNT[isl] || {})[String(u)] || 0; }, tierOf: tierOf, TIER: TIER };
})();
