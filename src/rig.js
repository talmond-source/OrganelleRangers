/* ================= Ranger rig: jointed humanoid built from smooth segments ================= */
const DIM = { hipY: 0.98, thigh: 0.45, shin: 0.44, upper: 0.29, fore: 0.27, spine: 0.11, chestH: 0.31, neck: 0.075, shoulderX: 0.205, hipX: 0.095 };
const JOINTS = ["hips", "spine", "chest", "neck", "head", "shoulderL", "elbowL", "handL", "shoulderR", "elbowR", "handR", "hipL", "kneeL", "ankleL", "hipR", "kneeR", "ankleR"];

/* lathe profile helper; phiStart = PI puts the seam at the back so u=0.5 is the front (+z) */
function latheSeg(pts, seg = 20) { return new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(Math.max(0.0005, p[0]), p[1])), LQ(seg, Math.max(10, seg >> 1)), Math.PI, TAU); }
function limbGeo(len, r0, rMid, r1) {
  return latheSeg([[0.001, 0.02], [r0 * 0.75, 0.012], [r0, -len * 0.06], [rMid, -len * 0.38], [lerp(rMid, r1, 0.6), -len * 0.75], [r1, -len * 0.94], [r1 * 0.7, -len * 1.0], [0.001, -len - 0.01]], 22);
}
function torsoGeo() { // chest block from waist (0) to shoulder line (chestH), flattened front-to-back later via scale.z
  const H = DIM.chestH;
  return latheSeg([[0.001, -0.07], [0.116, -0.07], [0.118, 0], [0.128, H * 0.25], [0.162, H * 0.56], [0.178, H * 0.74], [0.17, H * 0.88], [0.12, H * 0.98], [0.055, H * 1.03], [0.001, H * 1.04]], 26);
}
function absGeo() { return latheSeg([[0.001, -0.06], [0.132, -0.06], [0.133, 0], [0.12, DIM.spine * 0.5], [0.122, DIM.spine + 0.03], [0.001, DIM.spine + 0.03]], 22); }
function pelvisGeo() { return latheSeg([[0.001, -0.11], [0.095, -0.1], [0.148, -0.04], [0.15, 0.04], [0.138, 0.1], [0.132, 0.15], [0.001, 0.15]], 22); }
function footGeo() {
  const g = new THREE.SphereGeometry(1, LQ(18, 10), LQ(12, 8)); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y < 0) y *= 0.35; p.setXYZ(i, x * 0.055, y * 0.055 + 0.018, z * 0.12 + (z > 0 ? 0.035 : 0)); }
  g.computeVertexNormals(); return g;
}
function fistGeo() {
  const g = new THREE.SphereGeometry(1, LQ(16, 10), LQ(12, 8)); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) * 0.04, p.getY(i) * 0.05 - 0.04, p.getZ(i) * 0.046 + 0.006);
  g.computeVertexNormals(); return g;
}

/* ---------- textures painted per body part ---------- */
function partTex(w, h, draw) { const t = canvasTex(w, h, draw); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t; }
// in lathe UVs: u = 0.5 is the front, u = 0.25 the model's right (-x), 0.75 its left (+x); v = 0 bottom, 1 top (canvas y = 0 is the top)

function helmetShellGeo(R) {
  const g = new THREE.SphereGeometry(R, LQ(48, 28), LQ(32, 18)); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const ny = y / R, nz = z / R;
    if (ny < 0) { const d = -ny; if (nz > -0.2) { y *= 1 + 0.22 * clamp(nz + 0.2); x *= 1 - 0.18 * d * clamp(nz + 0.3); } else { y *= 1 + 0.32 * clamp(-nz - 0.2); } }
    p.setXYZ(i, x, y, z); }
  g.computeVertexNormals(); return g;
}
/* ---------- helmet: painted shell + glossy visor patch + sculpted add-ons ---------- */
function helmetGroup(look) {
  const g = new THREE.Group(); const R = 0.118;
  const shellTex = partTex(1024, 512, (x, w, h) => { x.fillStyle = look.helmet; x.fillRect(0, 0, w, h); if (look.paintHelmet) look.paintHelmet(x, w, h); });
  const sg = helmetShellGeo(R);
  const shell = new THREE.Mesh(sg, M("#ffffff", { map: shellTex, physical: true, clearcoat: 1, ccr: 0.08, rough: 0.3, env: 0.7, rimStr: 0.15 }));
  shell.scale.set(0.94, 1.14, 1.1); g.add(shell);
  // visor: a slightly larger sphere patch, alpha-shaped, glossy black
  if (look.visor !== false) {
    const vt = partTex(512, 256, (x, w, h) => { x.fillStyle = "#000"; x.fillRect(0, 0, w, h); x.fillStyle = "#fff"; look.visorShape(x, w, h); });
    // phi window centred on the front (+z is phi = PI/2 in SphereGeometry), theta window around the eyes
    const geo = new THREE.SphereGeometry(R * 1.018, LQ(40, 24), LQ(16, 10), Math.PI / 2 - 1.05, 2.1, 1.05, 0.95);
    const vm = M(look.visorColor || "#0b0c12", { physical: true, clearcoat: 1, ccr: 0.02, rough: 0.05, env: 1.6, alphaMap: vt, alphaTest: 0.5, rimStr: 0.15, side: THREE.DoubleSide });
    const v = new THREE.Mesh(geo, vm); v.scale.copy(shell.scale); g.add(v); g.userData.visor = v;
  }
  if (look.helmetExtras) look.helmetExtras(g, R);
  g.userData.shell = shell; return g;
}
/* sphere-UV helper for painting the helmet: front of the face is u = 0.75 after the visor flip, so we use angle helpers */
// shell canvas: x = (90 + a) / 360 * w where a = degrees from straight ahead (+ toward the wearer's left); y = theta / 180 * h (0 = crown)
const HX = (a, w) => ((90 + a) / 360) * w, HY = (t, h) => (t / 180) * h;
// visor canvas: phi -60..60 across, theta 60..114.4 down
const VX = (a, w) => ((a + 60) / 120) * w, VY = (t, h) => ((t - 60) / 54.4) * h;
function polyPath(x, pts, fx, fy, w, h) { x.beginPath(); pts.forEach((p, i) => (i ? x.lineTo(fx(p[0], w), fy(p[1], h)) : x.moveTo(fx(p[0], w), fy(p[1], h)))); x.closePath(); }

/* ---------- build a whole ranger from a look ---------- */
function buildRanger(look) {
  const J = {}; const root = new THREE.Group(); const body = new THREE.Group(); root.add(body);
  const mk = (name, parent, pos) => { const j = new THREE.Group(); j.name = name; if (pos) j.position.set(pos[0], pos[1], pos[2]); parent.add(j); J[name] = j; return j; };
  const suitMat = (tex, o = {}) => M("#ffffff", Object.assign({ map: tex, physical: true, clearcoat: look.gloss ?? 0.45, ccr: 0.3, rough: look.rough ?? 0.46, env: 0.5, rimStr: 0.12, rimColor: look.rim || "#ffffff" }, o));
  const paint = (part, side, w = 256, h = 256) => partTex(w, h, (x, W, H) => { x.fillStyle = look.suit; x.fillRect(0, 0, W, H); if (look.paint && look.paint[part]) look.paint[part](x, W, H, side);
    const gx = x.createLinearGradient(0, 0, W, 0); gx.addColorStop(0, "rgba(0,0,0,.22)"); gx.addColorStop(0.3, "rgba(0,0,0,0)"); gx.addColorStop(0.5, "rgba(255,255,255,.06)"); gx.addColorStop(0.7, "rgba(0,0,0,0)"); gx.addColorStop(1, "rgba(0,0,0,.22)"); x.fillStyle = gx; x.fillRect(0, 0, W, H);
    if (part === "chest") { for (const cx of [0.43, 0.57]) { const r = x.createRadialGradient(W * cx, H * 0.38, 4, W * cx, H * 0.38, W * 0.09); r.addColorStop(0, "rgba(255,255,255,.07)"); r.addColorStop(0.8, "rgba(0,0,0,0)"); r.addColorStop(1, "rgba(0,0,0,.12)"); x.fillStyle = r; x.fillRect(W * (cx - 0.1), 0, W * 0.2, H * 0.75); } }
    const gy = x.createLinearGradient(0, 0, 0, H); gy.addColorStop(0, "rgba(0,0,0,0)"); gy.addColorStop(1, "rgba(0,0,0,.14)"); x.fillStyle = gy; x.fillRect(0, 0, W, H); });
  const hips = mk("hips", body, [0, DIM.hipY, 0]);
  const pelvis = new THREE.Mesh(pelvisGeo(), suitMat(paint("pelvis"))); pelvis.scale.z = 0.78; hips.add(pelvis);
  const spine = mk("spine", hips, [0, 0.1, 0]);
  const abs = new THREE.Mesh(absGeo(), suitMat(paint("abs"))); abs.scale.z = 0.74; spine.add(abs);
  const chest = mk("chest", spine, [0, DIM.spine, 0]);
  const torso = new THREE.Mesh(torsoGeo(), suitMat(paint("chest", 0, 512, 256))); torso.scale.z = 0.64; chest.add(torso);
  const neck = mk("neck", chest, [0, DIM.chestH, 0]);
  const neckM = new THREE.Mesh(latheSeg([[0.062, -0.01], [0.05, 0.05], [0.047, 0.1], [0.001, 0.105]], 16), M(look.neck || look.suit, { physical: true, clearcoat: 0.5, rough: 0.4 })); neck.add(neckM);
  const head = mk("head", neck, [0, DIM.neck + 0.062, 0.008]);
  const helm = helmetGroup(look); helm.position.y = 0.02; head.add(helm);
  for (const s of ["L", "R"]) {
    const sx = s === "L" ? 1 : -1; // L = model's left (+x)
    const sh = mk("shoulder" + s, chest, [sx * DIM.shoulderX, DIM.chestH * 0.86, 0]);
    const upM = suitMat(paint("upper", s)); const delt = new THREE.Mesh(new THREE.SphereGeometry(0.058, 16, 12), upM); delt.scale.set(1, 0.9, 0.95); sh.add(delt);
    const up = new THREE.Mesh(limbGeo(DIM.upper, 0.056, 0.049, 0.039), upM); sh.add(up);
    const el = mk("elbow" + s, sh, [0, -DIM.upper, 0]);
    const foM = suitMat(paint("fore", s)); el.add(new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), upM)); el.add(new THREE.Mesh(limbGeo(DIM.fore, 0.042, 0.042, 0.033), foM));
    const hd = mk("hand" + s, el, [0, -DIM.fore, 0]);
    hd.add(new THREE.Mesh(fistGeo(), M(look.glove || look.suit, { physical: true, clearcoat: 0.6, rough: 0.35, rimStr: 0.2 })));
    const hp = mk("hip" + s, hips, [sx * DIM.hipX, -0.04, 0]);
    hp.add(new THREE.Mesh(limbGeo(DIM.thigh, 0.082, 0.072, 0.052), suitMat(paint("thigh", s))));
    const kn = mk("knee" + s, hp, [0, -DIM.thigh, 0]);
    const shM = suitMat(paint("shin", s)); kn.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), shM)); kn.add(new THREE.Mesh(limbGeo(DIM.shin, 0.054, 0.056, 0.043), shM));
    const an = mk("ankle" + s, kn, [0, -DIM.shin, 0]);
    an.add(new THREE.Mesh(footGeo(), M(look.boot || look.suit, { physical: true, clearcoat: 0.8, rough: 0.3, rimStr: 0.2 })));
  }
  if (look.extras) look.extras(J, look);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = !LITE; } });
  // blob shadow on the floor
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.42, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; root.add(sh); root.userData.shadow = sh;
  root.userData.J = J; root.userData.body = body;
  return root;
}

/* ---------- poses ---------- */
// pose = { joint: [rx, ry, rz], drop: hips lowering, lean } ; missing joints are 0
const P = (o) => o;
function clonePose(p) { const o = {}; for (const k in p) o[k] = Array.isArray(p[k]) ? p[k].slice() : p[k]; return o; }
function blendPose(a, b, t) {
  const o = {}; const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) { const va = a[k], vb = b[k];
    if (Array.isArray(va) || Array.isArray(vb)) { const A = va || [0, 0, 0], B = vb || [0, 0, 0]; o[k] = [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)]; }
    else o[k] = lerp(va || 0, vb || 0, t); }
  return o;
}
/* swap left/right so a mirrored fighter keeps its lead limbs toward the camera */
function mirrorPose(p) {
  const o = {};
  for (const k in p) { const v = p[k]; let nk = k; if (k.endsWith("L")) nk = k.slice(0, -1) + "R"; else if (k.endsWith("R")) nk = k.slice(0, -1) + "L";
    o[nk] = Array.isArray(v) ? [v[0], -v[1], -v[2]] : v; }
  return o;
}
/* keyframe track: [[t, pose], ...] with t in 0..1, eased */
function track(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) { const [ta, pa] = keys[i], [tb, pb] = keys[i + 1]; if (t <= tb) return blendPose(pa, pb, smooth(seg(t, ta, tb))); }
  return keys[keys.length - 1][1];
}
/* apply a pose; ground=true plants the lower foot on the floor */
function applyPose(rig, pose, ground = true) {
  const J = rig.userData.J;
  for (const n of JOINTS) { const r = pose[n] || [0, 0, 0]; J[n].rotation.set(r[0], r[1], r[2]); }
  let hy = DIM.hipY;
  if (ground) {
    const ext = (s) => { const h = pose["hip" + s] || [0, 0, 0], k = pose["knee" + s] || [0, 0, 0]; const c = Math.cos(h[2] || 0); return (DIM.thigh * Math.cos(h[0]) + DIM.shin * Math.cos(h[0] + k[0])) * c + 0.075; };
    const sp = pose.hips || [0, 0, 0]; hy = Math.max(ext("L"), ext("R")) * Math.cos(sp[0] * 0.6);
  }
  J.hips.position.y = hy + (pose.lift || 0);
  J.hips.position.z = pose.shift || 0;
  return hy;
}

/* base fighting stance and the move library (model faces +z; R limbs are the camera-side "lead" limbs for P1) */
const POSE = {
  stance: P({ hips: [0, 0.35, 0], spine: [0.06, 0.12, 0], chest: [0.04, 0.15, 0], head: [-0.06, -0.35, 0],
    hipL: [0.32, 0, 0.1], kneeL: [0.38, 0, 0], ankleL: [-0.12, 0, 0], hipR: [-0.42, 0, -0.08], kneeR: [0.5, 0, 0], ankleR: [-0.1, 0, 0],
    shoulderR: [-1.05, 0, -0.2], elbowR: [-1.75, 0, 0], handR: [0, 0, 0], shoulderL: [-0.75, 0, 0.35], elbowL: [-2.05, 0, 0] }),
  crouch: P({ hips: [0.25, 0.35, 0], spine: [0.25, 0.1, 0], chest: [0.15, 0.1, 0], head: [-0.4, -0.3, 0],
    hipL: [-0.9, 0, 0.25], kneeL: [2.0, 0, 0], ankleL: [-0.9, 0, 0], hipR: [-1.5, 0, -0.18], kneeR: [1.75, 0, 0], ankleR: [-0.2, 0, 0],
    shoulderR: [-1.0, 0, -0.2], elbowR: [-1.9, 0, 0], shoulderL: [-0.8, 0, 0.4], elbowL: [-2.1, 0, 0] }),
  jump: P({ hips: [-0.2, 0.2, 0], spine: [0.2, 0, 0], hipL: [-1.3, 0, 0.1], kneeL: [2.1, 0, 0], hipR: [-0.6, 0, -0.1], kneeR: [1.6, 0, 0],
    shoulderR: [-1.4, 0, -0.5], elbowR: [-1.5, 0, 0], shoulderL: [-1.2, 0, 0.6], elbowL: [-1.6, 0, 0], head: [-0.1, -0.2, 0] }),
  block: P({ hips: [0, 0.3, 0], spine: [0.15, 0.05, 0], chest: [0.08, 0.05, 0], head: [0.15, -0.2, 0],
    hipL: [0.28, 0, 0.1], kneeL: [0.45, 0, 0], hipR: [-0.4, 0, -0.08], kneeR: [0.55, 0, 0],
    shoulderR: [-1.25, 0.2, -0.65], elbowR: [-2.2, 0, 0], shoulderL: [-1.15, 0, 0.75], elbowL: [-2.3, 0, 0] }),
  crouchBlock: P({ hips: [0.25, 0.3, 0], spine: [0.35, 0.05, 0], chest: [0.15, 0, 0], head: [-0.2, -0.2, 0],
    hipL: [-0.9, 0, 0.25], kneeL: [2.0, 0, 0], ankleL: [-0.9, 0, 0], hipR: [-1.5, 0, -0.18], kneeR: [1.75, 0, 0],
    shoulderR: [-1.25, 0.2, -0.65], elbowR: [-2.2, 0, 0], shoulderL: [-1.15, 0, 0.75], elbowL: [-2.3, 0, 0] }),
  hit: P({ hips: [0, 0.35, 0], spine: [-0.35, 0.2, 0], chest: [-0.25, 0.2, 0], head: [-0.5, -0.1, 0.2],
    hipL: [0.15, 0, 0.12], kneeL: [0.3, 0, 0], hipR: [-0.2, 0, -0.1], kneeR: [0.35, 0, 0],
    shoulderR: [-0.3, 0, -0.6], elbowR: [-0.6, 0, 0], shoulderL: [-0.2, 0, 0.7], elbowL: [-0.7, 0, 0] }),
  hitLow: P({ hips: [0.1, 0.35, 0], spine: [0.45, 0.1, 0], chest: [0.2, 0, 0], head: [0.25, 0, 0], hipL: [-0.3, 0, 0.15], kneeL: [0.8, 0, 0], hipR: [-0.6, 0, -0.1], kneeR: [1.0, 0, 0],
    shoulderR: [-0.4, 0, -0.4], elbowR: [-0.8, 0, 0], shoulderL: [-0.3, 0, 0.5], elbowL: [-0.8, 0, 0] }),
  air: P({ hips: [-0.5, 0.2, 0], spine: [-0.3, 0, 0], head: [-0.4, 0, 0], hipL: [0.3, 0, 0.2], kneeL: [0.9, 0, 0], hipR: [-0.6, 0, -0.1], kneeR: [1.0, 0, 0],
    shoulderR: [0.6, 0, -1.1], elbowR: [-0.4, 0, 0], shoulderL: [0.5, 0, 1.2], elbowL: [-0.4, 0, 0] }),
  down: P({ hips: [-1.52, 0.3, 0], spine: [0.05, 0, 0], head: [0.2, 0.4, 0], hipL: [0.05, 0, 0.15], kneeL: [0.3, 0, 0], hipR: [-0.3, 0, -0.1], kneeR: [0.6, 0, 0],
    shoulderR: [0.2, 0, -1.3], elbowR: [-0.3, 0, 0], shoulderL: [0.1, 0, 1.2], elbowL: [-0.5, 0, 0], lift: -0.82 }),
  ko: P({ hips: [-1.55, 0.2, 0], spine: [0.0, 0, 0], head: [0.1, 0.9, 0], hipL: [0.1, 0, 0.25], kneeL: [0.15, 0, 0], hipR: [-0.1, 0, -0.2], kneeR: [0.2, 0, 0],
    shoulderR: [0.3, 0, -1.4], elbowR: [-0.2, 0, 0], shoulderL: [0.1, 0, 1.5], elbowL: [-0.2, 0, 0], lift: -0.86 }),
  dizzy: P({ hips: [0, 0.2, 0.1], spine: [0.2, 0, 0.15], head: [0.3, 0.3, 0.3], hipL: [0.1, 0, 0.15], kneeL: [0.25, 0, 0], hipR: [-0.1, 0, -0.1], kneeR: [0.3, 0, 0],
    shoulderR: [0.1, 0, -0.3], elbowR: [-0.3, 0, 0], shoulderL: [0.1, 0, 0.3], elbowL: [-0.3, 0, 0] }),
  // sentai roll-call pose (intro / victory)
  rollcall: P({ hips: [0, 0.6, 0], spine: [0, 0.2, 0], chest: [0, 0.25, 0], head: [-0.1, -0.5, 0],
    hipL: [0.05, 0, 0.45], kneeL: [0.2, 0, 0], hipR: [0.05, 0, -0.45], kneeR: [0.25, 0, 0],
    shoulderR: [-0.2, 0, -1.6], elbowR: [-0.2, 0, 0], shoulderL: [-1.5, 0.3, 0.4], elbowL: [-1.2, 0.5, 0] }),
  victory: P({ hips: [0, 0.3, 0], spine: [-0.1, 0.1, 0], chest: [-0.1, 0.1, 0], head: [-0.25, -0.2, 0],
    hipL: [0.05, 0, 0.32], kneeL: [0.1, 0, 0], hipR: [0.05, 0, -0.32], kneeR: [0.1, 0, 0],
    shoulderR: [-2.9, 0, -0.3], elbowR: [-0.1, 0, 0], shoulderL: [0.15, 0, 0.5], elbowL: [-1.6, 0, 0] }),
};
const A = {}; // attack key poses, merged onto stance
const W = (o) => Object.assign(clonePose(POSE.stance), o);
A.jabWind = W({ shoulderR: [-1.0, 0.1, -0.4], elbowR: [-2.2, 0, 0], chest: [0.04, 0.35, 0] });
A.jabHit = W({ shoulderR: [-1.6, 0.0, -0.05], elbowR: [-0.1, 0, 0], chest: [0.06, -0.25, 0], spine: [0.06, -0.15, 0], head: [-0.06, -0.15, 0] });
A.kickWind = W({ hipR: [-1.6, 0, -0.1], kneeR: [2.0, 0, 0], spine: [-0.15, 0.2, 0], shoulderR: [-0.7, 0, -0.5] });
A.kickHit = W({ hipR: [-1.55, 0, 0.0], kneeR: [0.08, 0, 0], ankleR: [0.4, 0, 0], hipL: [0.15, 0, 0.1], kneeL: [0.25, 0, 0], spine: [-0.35, 0.1, 0], chest: [-0.1, 0.1, 0], shoulderR: [-0.4, 0, -0.9], elbowR: [-0.8, 0, 0], shoulderL: [-0.3, 0, 0.9], elbowL: [-0.9, 0, 0] });
A.upWind = Object.assign(clonePose(POSE.crouch), { shoulderR: [-0.2, 0, -0.3], elbowR: [-1.9, 0, 0] });
A.upHit = W({ hips: [0, 0.2, 0], hipL: [0.1, 0, 0.1], kneeL: [0.2, 0, 0], hipR: [-0.2, 0, -0.05], kneeR: [0.2, 0, 0], ankleR: [0.3, 0, 0], spine: [-0.25, -0.1, 0], chest: [-0.2, -0.25, 0], shoulderR: [-3.0, 0, -0.1], elbowR: [-0.5, 0, 0], head: [-0.4, -0.1, 0], lift: 0.05 });
A.sweepWind = Object.assign(clonePose(POSE.crouch), { spine: [0.35, 0.5, 0] });
A.sweepHit = Object.assign(clonePose(POSE.crouch), { hipR: [-1.5, 0, -0.1], kneeR: [0.1, 0, 0], ankleR: [0.3, 0, 0], hipL: [-1.3, 0, 0.2], kneeL: [2.3, 0, 0], spine: [0.5, -0.2, 0], chest: [0.2, -0.2, 0], shoulderL: [0.3, 0, 0.8], elbowL: [-0.3, 0, 0] });
A.jumpKick = Object.assign(clonePose(POSE.jump), { hipR: [-1.4, 0, 0], kneeR: [0.1, 0, 0], ankleR: [0.4, 0, 0], hipL: [-0.8, 0, 0.1], kneeL: [1.9, 0, 0], spine: [-0.3, 0, 0] });
A.jumpPunch = Object.assign(clonePose(POSE.jump), { shoulderR: [-1.9, 0, 0.1], elbowR: [-0.2, 0, 0], chest: [0.2, -0.3, 0] });
A.throwOut = W({ shoulderR: [-1.65, 0, 0.05], elbowR: [-0.05, 0, 0], handR: [0, 0, 0], shoulderL: [-1.4, 0, -0.1], elbowL: [-0.4, 0, 0], chest: [0.0, -0.2, 0], spine: [0.04, -0.1, 0] });
A.charge = W({ shoulderR: [-0.6, 0, -0.9], elbowR: [-1.6, 0, 0], shoulderL: [-0.6, 0, 0.9], elbowL: [-1.6, 0, 0], chest: [-0.15, 0, 0], head: [-0.2, -0.2, 0], hips: [0, 0.2, 0] });
A.lunge = W({ hipL: [-0.9, 0, 0.1], kneeL: [0.9, 0, 0], hipR: [0.6, 0, -0.1], kneeR: [0.3, 0, 0], spine: [0.35, -0.1, 0], chest: [0.2, -0.3, 0], shoulderR: [-1.7, 0, 0.0], elbowR: [-0.05, 0, 0], shoulderL: [0.4, 0, 0.6], elbowL: [-0.8, 0, 0], shift: 0.1 });
A.whipWind = W({ shoulderR: [-2.6, 0.3, -0.6], elbowR: [-1.0, 0, 0], chest: [-0.15, 0.4, 0], spine: [-0.1, 0.25, 0] });
A.whipHit = W({ shoulderR: [-1.3, 0, -0.1], elbowR: [-0.05, 0, 0], chest: [0.15, -0.35, 0], spine: [0.1, -0.2, 0] });
A.zap = W({ shoulderR: [-1.55, -0.2, -0.2], elbowR: [-0.2, 0, 0], shoulderL: [-1.55, 0.2, 0.2], elbowL: [-0.2, 0, 0], chest: [0.1, 0, 0], hips: [0, 0.15, 0] });
const WALK = (phase, dir, base) => {
  const p = clonePose(base); const s = Math.sin(phase), c = Math.cos(phase);
  p.hipL = [p.hipL[0] + s * 0.38 * dir, 0, p.hipL[2]]; p.hipR = [p.hipR[0] - s * 0.38 * dir, 0, p.hipR[2]];
  p.kneeL = [p.kneeL[0] + Math.max(0, -c) * 0.55, 0, 0]; p.kneeR = [p.kneeR[0] + Math.max(0, c) * 0.55, 0, 0];
  p.spine = [p.spine[0], p.spine[1] + s * 0.05, 0]; return p;
};
