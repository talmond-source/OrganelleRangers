/* ================= Ranger models + motion-capture animation =================
   One shared athletic body (smoothed from a Mixamo base), a per-ranger helmet carved from the
   sheet close-ups, and the ranger's sheet art projected over both. Motion comes from retargeted
   mocap clips, sampled per frame and cross-faded. */
let _shadowTex = null;
function R3D_SHADOW() { if (_shadowTex) return _shadowTex; const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const g = x.createRadialGradient(64, 64, 4, 64, 64, 62); g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(0.5, 'rgba(0,0,0,.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); _shadowTex = new THREE.CanvasTexture(c); return _shadowTex; }
const R3D = (() => {
  let SK = null, BODY = null, CL = null, CLB = null, NB = 0, BONEIDX = null;
  const UPPER = new Set(["Spine1", "Spine2", "Neck", "Head", "LeftShoulder", "LeftArm", "LeftForeArm", "LeftHand", "RightShoulder", "RightArm", "RightForeArm", "RightHand"]);
  function init(A) {
    SK = A.skel;
    BODY = { meta: A.body.meta, buf: A.body.buf };
    CL = A.anims.meta; CLB = A.anims.buf; NB = CL.bones.length;
  }
  function makeSkeleton() {
    const n = SK.names.length, bones = [], W = [];
    for (let i = 0; i < n; i++) { const b = new THREE.Bone(); b.name = SK.names[i]; bones.push(b); W.push({ p: new THREE.Vector3().fromArray(SK.pos, i * 3), q: new THREE.Quaternion().fromArray(SK.quat, i * 4) }); }
    for (let i = 0; i < n; i++) {
      const pi = SK.parent[i], b = bones[i];
      if (pi < 0) { b.position.copy(W[i].p); b.quaternion.copy(W[i].q); }
      else { const pq = W[pi].q.clone().invert(); b.position.copy(W[i].p).sub(W[pi].p).applyQuaternion(pq); b.quaternion.copy(pq.multiply(W[i].q)); bones[pi].add(b); }
    }
    return bones;
  }
  /* ------- clip sampling ------- */
  const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
  function clipInfo(name) { return CL.clips[name]; }
  function readQ(c, f, j, out) { const o = c.off / 2 + (f * NB + j) * 3; const d = c._q || (c._q = new Int16Array(CLB, c.off, c.n * NB * 3)); const k = (f * NB + j) * 3; const x = d[k] / 32767, y = d[k + 1] / 32767, z = d[k + 2] / 32767; return out.set(x, y, z, Math.sqrt(Math.max(0, 1 - x * x - y * y - z * z))); }
  function readP(c, f, out) { const d = c._p || (c._p = new Int16Array(CLB.slice(c.off + c.n * NB * 6, c.off + c.n * NB * 6 + c.n * 6))); return out.set(d[f * 3] / 1000, d[f * 3 + 1] / 1000, d[f * 3 + 2] / 1000); }
  // sample a clip at a fractional frame into arrays of quaternions (per clip bone) and hips position
  function sample(name, frame, Q, P, opt = {}) {
    const c = CL.clips[name]; if (!c) return false;
    let f = opt.loop ? ((frame % (c.n - 1)) + (c.n - 1)) % (c.n - 1) : Math.max(0, Math.min(c.n - 1, frame));
    const f0 = Math.floor(f), f1 = Math.min(c.n - 1, f0 + 1), t = f - f0;
    for (let j = 0; j < NB; j++) { readQ(c, f0, j, Q[j]); if (t > 0.001) { readQ(c, f1, j, _q2); Q[j].slerp(_q2, t); } }
    readP(c, f0, P); if (t > 0.001) { const p1 = readP(c, f1, new THREE.Vector3()); P.lerp(p1, t); }
    if (opt.inPlace !== false) { const p0 = readP(c, 0, new THREE.Vector3()); P.x -= p0.x - (opt.ox || 0); P.z -= p0.z; }
    return true;
  }
  class Animator {
    constructor(model) {
      this.m = model; this.map = CL.bones.map((n) => model.b[n]);
      this.Q = CL.bones.map(() => new THREE.Quaternion()); this.P = new THREE.Vector3();
      this.Qb = CL.bones.map(() => new THREE.Quaternion()); this.Pb = new THREE.Vector3();
      this.from = CL.bones.map(() => new THREE.Quaternion()); this.fromP = new THREE.Vector3();
      this.cur = null; this.fade = 0; this.fadeT = 0; this.layer = null;
    }
    /* req = {clip, frame, loop, fade, upper:{clip,frame,loop}, hipsY} */
    play(req, dt) {
      const key = req.clip + "|" + (req.upper ? req.upper.clip : "") + "|" + (req.tag || "");
      if (key !== this.cur) { // start a cross-fade from whatever is on screen now
        this.map.forEach((b, j) => this.from[j].copy(b.quaternion)); this.fromP.copy(this.m.b.Hips.position);
        this.cur = key; this.fadeT = req.fade ?? 0.1; this.fade = this.fadeT > 0 ? 1 : 0;
      }
      sample(req.clip, req.frame, this.Q, this.P, req);
      if (req.upper) { sample(req.upper.clip, req.upper.frame, this.Qb, this.Pb, req.upper); CL.bones.forEach((n, j) => { if (!UPPER.has(n)) return;
        if (!req.ribosomeGuard) this.Q[j].copy(this.Qb[j]);
        else if (/^(Left|Right)(Arm|ForeArm|Hand)$/.test(n)) this.Q[j].slerp(this.Qb[j], 0.38); }); }
      const RT = this.m.retarget; // sculpted models: map the mocap skeleton's rotations onto this skeleton
      if (RT) { for (let j = 0; j < NB; j++) this.Q[j].premultiply(RT.Dp[j]).multiply(RT.D[j]); this.P.add(RT.hipOff); }
      if (req.ribosomeGuard && this.m.guardCorrection) {
        for (const { index, rest, amount } of this.m.guardCorrection) this.Q[index].slerp(rest, amount);
      }
      if (this.fade > 0) { this.fade = Math.max(0, this.fade - dt / Math.max(1e-3, this.fadeT)); const w = this.fade * this.fade * (3 - 2 * this.fade); this.Q.forEach((q, j) => q.slerp(this.from[j], w)); this.P.lerp(this.fromP, w); }
      this.map.forEach((b, j) => b && b.quaternion.copy(this.Q[j]));
      this.m.b.Hips.position.copy(this.P);
    }
    snapshot() { this.cur = null; }
  }
  /* fists: curl every finger joint */
  function makeFists(b, amt = 1) {
    // curl in world space (rest pose: arms out along X, palms down), so it works whatever each bone's local axes are
    const Z = new THREE.Vector3(0, 0, 1), Y = new THREE.Vector3(0, 1, 0), pq = new THREE.Quaternion(), wq = new THREE.Quaternion(), rq = new THREE.Quaternion();
    const rotW = (bone, axis, a) => { bone.parent.updateWorldMatrix(true, false); bone.parent.getWorldQuaternion(pq); bone.updateWorldMatrix(false, false); bone.getWorldQuaternion(wq); rq.setFromAxisAngle(axis, a); wq.premultiply(rq); bone.quaternion.copy(pq.invert().multiply(wq)); bone.updateWorldMatrix(false, true); };
    for (const s of ["Left", "Right"]) { const sg = s === "Left" ? -1 : 1;
      for (const f of ["Index", "Middle", "Ring", "Pinky"]) for (let k = 1; k <= 3; k++) { const bone = b[s + "Hand" + f + k]; if (bone) rotW(bone, Z, sg * amt * (k === 1 ? 1.15 : 1.35)); }
      for (let k = 1; k <= 3; k++) { const t = b[s + "HandThumb" + k]; if (t) rotW(t, Y, -sg * amt * (k === 1 ? 0.5 : 0.45)); } }
  }
  /* ------- build a ranger ------- */
  function build(id, R) { // R = per-ranger asset bundle {L, col, mat, helmet:{meta,buf}}
    if (R.sculpt) return withShadow(RMODEL.build(id, R.sculpt, CL.bones));
    const root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const bones = makeSkeleton(); body.add(bones[0]);
    const b = {}; bones.forEach((x) => (b[x.name] = x));
    root.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(bones);
    const geo = decodeBody(BODY.buf, BODY.meta);
    const mat = SUIT.material(R.col, R.mat, R.L.suit || {});
    const suit = new THREE.SkinnedMesh(geo, mat); suit.name = "suit"; suit.frustumCulled = false; suit.castShadow = true; suit.receiveShadow = true;
    body.add(suit); root.updateMatrixWorld(true); suit.bind(skeleton);
    const rig = { root, b, meshes: [suit] };
    // project the sheet in the sheet's own stance, then return to rest
    const rest = bones.map((x) => x.quaternion.clone());
    SUIT.applySheetPose(rig, SUIT.sheetPose(b, R.L)); root.updateMatrixWorld(true);
    const J = SUIT.jointsOf(rig); SUIT.project(suit, rig, R.L, J); if (R.mask && !LITE) SUIT.inflate(suit, rig, R.L, J, R.mask);
    bones.forEach((x, i) => x.quaternion.copy(rest[i])); root.updateMatrixWorld(true);
    const helmet = attachHelmet(rig, decodeHelmet(R.helmet.buf, R.helmet.meta), mat, R.L);
    makeFists(b, 1);
    return withShadow({ root, body, b, suit, helmet, mat, skeleton, extras: {}, L: R.L });
  }
  function withShadow(model) {
    // soft contact shadow (always on; real shadow maps add to it on capable machines)
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: R3D_SHADOW(), transparent: true, depthWrite: false, opacity: 0.75 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012; sh.renderOrder = 1; model.root.add(sh); model.shadow = sh;
    model.anim = new Animator(model);
    return model;
  }
  function hand(model, side) { return model.b[side + "Hand"].getWorldPosition(new THREE.Vector3()); }
  return { init, build, sample, clipInfo, Animator, hand, get clips() { return CL.clips; } };
})();
