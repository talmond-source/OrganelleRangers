/* ================= View: renderer, lights, post-processing, camera, screen shake, impact frames ================= */
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
    this.flashLayer = document.createElement("div");
    this.flashLayer.id = "viewFlash";
    this.flashLayer.hidden = true;
    host.append(this.flashLayer);
    new ResizeObserver(() => this.resize()).observe(host); this.resize();
  }
  lights() {
    const s = this.scene;
    this.hemi = new THREE.HemisphereLight(0xdfe8ff, 0x2a1830, 0.55); s.add(this.hemi);
    this.key = new THREE.DirectionalLight(0xfff0dc, 2.1); this.key.position.set(-3.5, 8, 6); s.add(this.key); s.add(this.key.target);
    if (!LITE) { this.key.castShadow = true; this.key.shadow.mapSize.set(2048, 2048); const c = this.key.shadow.camera; c.left = -11; c.right = 11; c.top = 6; c.bottom = -2; c.near = 1; c.far = 26; this.key.shadow.bias = -0.0004; this.key.shadow.normalBias = 0.02; this.key.shadow.radius = 3; }
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
    this.shake *= Math.pow(0.0015, dt);
    if (this.flash > 0 || !this.flashLayer.hidden) {
      this.flash = Math.max(0, this.flash - dt * 4);
      this.flashLayer.hidden = this.flash === 0;
      this.flashLayer.style.opacity = this.flash;
    }
    // adaptive quality on slow machines
    this._ft = this._ft ? this._ft * 0.93 + dt * 1000 * 0.07 : 16; this._n = (this._n || 0) + 1;
    if (this._n > 90 && this._ft > 36 && (this.q || 1) > 0.6 && dt < 0.3) { this.q = (this.q || 1) - 0.15; this._n = 0; this.resize(); }
    if (this.impact > 0) {
      this.impact -= dt; const odd = Math.floor(this.impact * 30) % 2 === 0;
      const bg = this.scene.background; const fog = this.scene.fog; this.scene.fog = null;
      this.scene.background = new THREE.Color(odd ? 0xffffff : 0x000000); this.scene.overrideMaterial = odd ? this.black : this.white;
      this.renderer.toneMapping = THREE.NoToneMapping; this.renderer.render(this.scene, this.camera);
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping; this.scene.overrideMaterial = null; this.scene.background = bg; this.scene.fog = fog;
      FX2D.impact(odd); return;
    }
    FX2D.impact(null);
    this.renderer.render(this.scene, this.camera);
  }
}
