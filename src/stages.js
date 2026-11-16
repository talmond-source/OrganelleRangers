/* ================= Arenas ================= */
const STAGES = {};
const STAGE_LIST = [{ id: "euk", name: "Training Room", sub: "", ready: true, col: "#5a6070" }];
function skyDome(top, mid, bot, r = 160) {
  const g = new THREE.SphereGeometry(r, 32, 16); const cols = []; const p = g.attributes.position; const T = new THREE.Color(top), Mi = new THREE.Color(mid), B = new THREE.Color(bot);
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / r; const c = y > 0 ? Mi.clone().lerp(T, y) : Mi.clone().lerp(B, -y); cols.push(c.r, c.g, c.b); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  return new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true, fog: false, depthWrite: false }));
}
/* a microtubule built from real parts: 13 protofilaments of alternating α/β tubulin, hollow in the middle */
function microtubule(len, R = 0.86, bead = 0.175, cols = ["#86e0cf", "#3b84c8"]) {
  const g = new THREE.Group(); const sp = bead * 1.9, n = Math.floor(len / sp); const geo = new THREE.SphereGeometry(bead, LQ(10, 7), LQ(8, 5));
  const ms = cols.map((c) => M(c, { rough: 0.5, rimStr: 0.08, rimColor: "#bff6ff" }));
  const inst = ms.map((m) => new THREE.InstancedMesh(geo, m, Math.ceil((n * 13) / 2) + 13)); const cnt = [0, 0];
  for (let pf = 0; pf < 13; pf++) { const a = (pf / 13) * TAU; const off = (pf * sp * 3) / 13;
    for (let i = 0; i < n; i++) { const which = (i + (pf === 0 ? 1 : 0)) % 2; const x = -len / 2 + i * sp + off; inst[which].setMatrixAt(cnt[which]++, mat4(V3(x, Math.cos(a) * R, Math.sin(a) * R), null, V3(1.12, 0.92, 1))); } }
  inst.forEach((m, k) => { m.count = cnt[k]; m.receiveShadow = !LITE; g.add(m); });
  const core = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.86, R * 0.86, len, 26, 1, true), M("#0d1c2c", { side: THREE.BackSide, rim: false })); core.rotation.z = Math.PI / 2; g.add(core);
  return g;
}
function simpleTube(len, r, col) { const t = canvasTex(64, 64, (x, w, h) => { x.fillStyle = col; x.fillRect(0, 0, w, h); for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { const g = x.createRadialGradient(i * 16 + 8, j * 16 + 8, 1, i * 16 + 8, j * 16 + 8, 8); g.addColorStop(0, "rgba(255,255,255,.28)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(i * 16, j * 16, 16, 16); } }, [len / 0.7, 6]); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 20, 1, true), M("#ffffff", { map: t, rough: 0.55, rimStr: 0.18, rimColor: "#9fe8ff" })); return m; }
function kinesin() {
  const g = new THREE.Group(); const m = M("#ffcf5a", { rough: 0.4, emissive: "#ffcf5a", ei: 0.1 });
  const heads = [0, 1].map(() => { const h = new THREE.Mesh(smoothBlob(0.35, 4, 0.12, [1.2, 0.8, 0.9], 14, 10), m); g.add(h); return h; });
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3, 8), m); stalk.position.y = 2; g.add(stalk);
  const ves = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 16), M("#f6a5c8", { physical: true, transparent: true, opacity: 0.75, clearcoat: 1, rough: 0.2, rimStr: 0.8 })); ves.position.y = 4.4; g.add(ves);
  g.userData = { heads, stalk, ves }; return g;
}

/* soft vertical light shaft (additive) */
function shaftTex() { return canvasTex(64, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,255,255,0.0)"); g.addColorStop(0.25, "rgba(255,255,255,0.55)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); const g2 = x.createLinearGradient(0, 0, w, 0); g2.addColorStop(0, "rgba(0,0,0,1)"); g2.addColorStop(0.5, "rgba(0,0,0,0)"); g2.addColorStop(1, "rgba(0,0,0,1)"); x.globalCompositeOperation = "destination-out"; x.fillStyle = g2; x.fillRect(0, 0, w, h); }); }
function shaft(col, w, h, op) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: shaftTex(), color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, side: THREE.DoubleSide })); return m; }
/* mitochondrion: outer membrane shell + visible folded cristae through a cut window */
function mitoTex() { return canvasTex(256, 128, (x, w, h) => { x.fillStyle = "#e0703a"; x.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { const cx = 10 + i * 18; x.strokeStyle = "rgba(255,190,120,.9)"; x.lineWidth = 5; x.beginPath(); x.moveTo(cx, 6); for (let y = 6; y < h - 6; y += 8) x.lineTo(cx + Math.sin(y * 0.15 + i) * 5, y); x.stroke(); x.strokeStyle = "rgba(120,30,10,.6)"; x.lineWidth = 2; x.beginPath(); x.moveTo(cx + 4, 6); for (let y = 6; y < h - 6; y += 8) x.lineTo(cx + 4 + Math.sin(y * 0.15 + i) * 5, y); x.stroke(); } }); }
function nucleusTex() { return canvasTex(512, 256, (x, w, h) => { x.fillStyle = "#4a2a96"; x.fillRect(0, 0, w, h); for (let i = 0; i < 700; i++) { const px = Math.random() * w, py = Math.random() * h, r = 2 + Math.random() * 7; const g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, "rgba(190,160,255,.5)"); g.addColorStop(1, "rgba(190,160,255,0)"); x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2); } for (let i = 0; i < 260; i++) { const px = Math.random() * w, py = Math.random() * h; x.strokeStyle = "rgba(230,215,255,.85)"; x.lineWidth = 1.6; x.beginPath(); x.arc(px, py, 3, 0, TAU); x.stroke(); } }); }

/* The one arena: a plain training room. Deliberately quiet so the rangers are the detail on screen. */
STAGES.euk = { build(view) {
  const root = new THREE.Group();
  const apply = (v) => { v.scene.background = new THREE.Color("#171a21"); v.scene.fog = new THREE.Fog("#171a21", 30, 80);
    v.hemi.color.set("#ffffff"); v.hemi.groundColor.set("#5a5f6a"); v.hemi.intensity = 0.42; v.key.color.set("#ffffff"); v.key.intensity = 1.3; v.rimA.color.set("#eaf2ff"); v.rimA.intensity = 0.75; v.rimB.color.set("#fff1e6"); v.rimB.intensity = 0.6; v.fill.color.set("#ffffff"); v.fill.intensity = 0.3; };
  apply(view);
  const floorT = canvasTex(256, 256, (x, w, h) => { x.fillStyle = "#22262e"; x.fillRect(0, 0, w, h); x.strokeStyle = "rgba(255,255,255,.10)"; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2); x.strokeStyle = "rgba(255,255,255,.04)"; x.lineWidth = 1; x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke(); }, [40, 14]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 28), new THREE.MeshStandardMaterial({ color: "#8a8f9a", map: floorT, roughness: 0.6, metalness: 0.0, envMapIntensity: 0.25 })); floor.rotation.x = -Math.PI / 2; floor.position.z = -6; floor.receiveShadow = true; root.add(floor);
  const wallT = canvasTex(256, 256, (x, w, h) => { x.fillStyle = "#596070"; x.fillRect(0, 0, w, h); x.fillStyle = "#4c5262"; x.fillRect(0, 0, w, 6); x.fillRect(0, 0, 6, h); x.fillStyle = "rgba(255,255,255,.05)"; x.fillRect(6, 6, w - 6, 3); }, [20, 3]);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(80, 12), new THREE.MeshStandardMaterial({ color: "#ffffff", map: wallT, roughness: 0.8, envMapIntensity: 0.3 })); wall.position.set(0, 6, -9); wall.receiveShadow = true; root.add(wall);
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(80, 0.14), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.9, 1.0, 1.2) })); strip.position.set(0, 0.5, -8.98); root.add(strip);
  const strip2 = strip.clone(); strip2.position.y = 4.2; strip2.material = new THREE.MeshBasicMaterial({ color: "#3a404c" }); root.add(strip2);
  // fighting lane markings
  const lane = new THREE.Mesh(new THREE.PlaneGeometry(26, 0.05), new THREE.MeshBasicMaterial({ color: "#565d6c" })); lane.rotation.x = -Math.PI / 2; lane.position.set(0, 0.004, 1.1); root.add(lane);
  const lane2 = lane.clone(); lane2.position.z = -1.1; root.add(lane2);
  return { root, apply, update() {} };
} };
