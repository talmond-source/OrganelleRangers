/* ================= View: renderer, lights, post-processing, camera, screen shake, impact frames ================= */
const GRADE_SHADER = {
  uniforms: { tDiffuse: { value: null }, exposure: { value: 1.0 }, sat: { value: 1.12 }, contrast: { value: 1.06 }, vign: { value: 0.32 }, ca: { value: 0.0015 }, tint: { value: new THREE.Vector3(1, 1, 1) }, flash: { value: 0 } },
  vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
  fragmentShader: `uniform sampler2D tDiffuse; uniform float exposure, sat, contrast, vign, ca, flash; uniform vec3 tint; varying vec2 vUv;
    vec3 rrtFit_(vec3 v){ vec3 a=v*(v+0.0245786)-0.000090537; vec3 b=v*(0.983729*v+0.4329510)+0.238081; return a/b; }
    vec3 acesT_(vec3 c){ const mat3 I=mat3(vec3(0.59719,0.07600,0.02840),vec3(0.35458,0.90834,0.13383),vec3(0.04823,0.01566,0.83777)); const mat3 O=mat3(vec3(1.60475,-0.10208,-0.00327),vec3(-0.53108,1.10813,-0.07276),vec3(-0.07367,-0.00605,1.07602)); c=I*c; c=rrtFit_(c); return clamp(O*c,0.,1.); }
    vec3 toSrgb_(vec3 c){ return mix(c*12.92, 1.055*pow(c,vec3(1./2.4))-0.055, step(0.0031308,c)); }
    void main(){ vec2 d=vUv-0.5; float r2=dot(d,d);
      vec3 c; c.r=texture2D(tDiffuse,vUv+d*ca*r2*8.).r; c.g=texture2D(tDiffuse,vUv).g; c.b=texture2D(tDiffuse,vUv-d*ca*r2*8.).b;
      c*=exposure*tint; c=acesT_(c);
      float l=dot(c,vec3(.2126,.7152,.0722)); c=mix(vec3(l),c,sat); c=(c-0.5)*contrast+0.5;
      c*=1.-vign*smoothstep(0.08,0.55,r2*1.6); c=mix(c,vec3(1.),flash);
      gl_FragColor=vec4(toSrgb_(clamp(c,0.,1.)),1.); }`,
};
class View {
  constructor(host) {
    this.host = host;
    this.canvas = document.createElement("canvas"); this.canvas.id = "gl"; host.prepend(this.canvas);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: LITE, powerPreference: "high-performance" });
    this.renderer.outputEncoding = THREE.sRGBEncoding; this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = !LITE; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene(); this.camera = new THREE.PerspectiveCamera(30, 16 / 9, 0.1, 400);
    this.pixel = 1; this.shake = 0; this.impact = 0; this.impactPhase = 0; this.flash = 0;
    this.lights(); this.envMap();
    this.white = new THREE.MeshBasicMaterial({ color: 0xffffff }); this.black = new THREE.MeshBasicMaterial({ color: 0x000000 });
    if (!LITE) this.post();
    new ResizeObserver(() => this.resize()).observe(host); this.resize();
  }
  post() {
    const rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples: this.renderer.capabilities.isWebGL2 ? 4 : 0 });
    this.composer = new THREE.EffectComposer(this.renderer, rt);
    this.composer.addPass(new THREE.RenderPass(this.scene, this.camera));
    this.bloom = new THREE.UnrealBloomPass(new THREE.Vector2(256, 256), 0.35, 0.4, 0.95); this.composer.addPass(this.bloom);
    this.grade = new THREE.ShaderPass(GRADE_SHADER); this.composer.addPass(this.grade);
  }
  lights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(0xdfe8ff, 0x2a1830, 0.55); s.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xfff0dc, 2.1); this.key.position.set(-3.5, 8, 6); s.add(this.key); s.add(this.key.target);
    if (!LITE) { this.key.castShadow = true; this.key.shadow.mapSize.set(4096, 4096); const c = this.key.shadow.camera; c.left = -11; c.right = 11; c.top = 6; c.bottom = -2; c.near = 1; c.far = 26; this.key.shadow.bias = -0.0004; this.key.shadow.normalBias = 0.02; this.key.shadow.radius = 3; }
    this.fill = new THREE.DirectionalLight(0x9fb8ff, 0.45); this.fill.position.set(5, 3, 7); s.add(this.fill);
    this.rimA = new THREE.DirectionalLight(0x6fd6ff, 2.2); this.rimA.position.set(6, 4, -6); s.add(this.rimA);
    this.rimB = new THREE.DirectionalLight(0xff5fb0, 1.8); this.rimB.position.set(-7, 3, -5); s.add(this.rimB);
  }
  envMap() {
    const pm = new THREE.PMREMGenerator(this.renderer); const es = new THREE.Scene();
    const g = new THREE.SphereGeometry(10, 32, 16); const cols = []; const p = g.attributes.position; const top = new THREE.Color("#cfd8ff"), mid = new THREE.Color("#3c4a7a"), low = new THREE.Color("#0b0712");
    for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 10; const c = y > 0 ? mid.clone().lerp(top, y) : mid.clone().lerp(low, -y); cols.push(c.r, c.g, c.b); }
    g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3)); es.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
    // studio strip lights for crisp reflections on visors and gloss suits
    [[-4, 6, 5, 0xffffff, 7, 1.2], [5, 4, 5, 0xffffff, 2, 6], [6, 3, -3, 0x7fd8ff, 6, 2], [-6, 2, -4, 0xff7fc8, 5, 2], [0, 9, 0, 0xffffff, 8, 8]].forEach(([x, y, z, c, w, h]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); es.add(m); });
    this.scene.environment = pm.fromScene(es, 0.03).texture; pm.dispose();
  }
  setPixel(on) { this.pixel = on ? 3 : 1; this.canvas.classList.toggle("pixel", on); this.resize(); }
  resize() {
    const r = this.host.getBoundingClientRect(); if (!r.width) return; this.w = r.width; this.h = r.height;
    const dpr = Math.min(window.devicePixelRatio || 1, LQ(2, 1)) / this.pixel * (this.q || 1);
    this.renderer.setPixelRatio(dpr); this.renderer.setSize(this.w, this.h, false);
    if (this.composer) { this.composer.setPixelRatio(dpr); this.composer.setSize(this.w, this.h); }
    this.camera.aspect = this.w / this.h; this.camera.updateProjectionMatrix();
  }
  setCam(p, l, fov = 30) {
    this.camera.position.copy(p); this.camera.lookAt(l); this.camera.fov = fov; this.camera.updateProjectionMatrix();
    if (this.shake > 0.001) { const s = this.shake; this.camera.position.x += (Math.random() - 0.5) * s; this.camera.position.y += (Math.random() - 0.5) * s; this.camera.rotation.z += (Math.random() - 0.5) * s * 0.05; }
    // keep the shadow frustum centred on the action
    this.key.target.position.set(l.x, 0, 0); this.key.position.set(l.x - 3.5, 8, 6);
  }
  /* anime impact frame: whole scene flips to stark silhouettes for a few frames */
  render(dt) {
    this.shake *= Math.pow(0.0015, dt); this.flash = Math.max(0, this.flash - dt * 4);
    // adaptive quality on slow machines
    this._ft = this._ft ? this._ft * 0.93 + dt * 1000 * 0.07 : 16; this._n = (this._n || 0) + 1;
    if (this._n > 90 && this._ft > 36 && (this.q || 1) > 0.6 && dt < 0.3) { this.q = (this.q || 1) - 0.15; this._n = 0; if (this.q < 0.8 && this.bloom) this.bloom.enabled = false; this.resize(); }
    if (this.impact > 0) {
      this.impact -= dt; const odd = Math.floor(this.impact * 30) % 2 === 0;
      const bg = this.scene.background; const fog = this.scene.fog; this.scene.fog = null;
      this.scene.background = new THREE.Color(odd ? 0xffffff : 0x000000); this.scene.overrideMaterial = odd ? this.black : this.white;
      this.renderer.toneMapping = THREE.NoToneMapping; this.renderer.render(this.scene, this.camera);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.scene.overrideMaterial = null; this.scene.background = bg; this.scene.fog = fog;
      FX2D.impact(odd); return;
    }
    FX2D.impact(null);
    if (this.composer) { this.grade.uniforms.flash.value = this.flash; this.composer.render(dt); }
    else this.renderer.render(this.scene, this.camera);
  }
}
