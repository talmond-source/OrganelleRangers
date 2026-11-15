/* ================= Molecular + cellular models for Blueprint Rescue ================= */
/* Units: cell world in arbitrary "cell units"; molecular worlds in nanometres. */

const BC = { A: "#e8505b", T: "#f2b631", G: "#3fae7a", C: "#3460e0", U: "#9b6cff" };   // base colours (match lanes + legend)
const BNAME = { A: "Adenine", T: "Thymine", G: "Guanine", C: "Cytosine", U: "Uracil" };
const PAIR_DNA = { A: "T", T: "A", G: "C", C: "G" };
const PAIR_RNA = { A: "U", T: "A", G: "C", C: "G" };   // DNA template base -> mRNA base
const PURINE = { A: true, G: true };
const HB = { A: 2, T: 2, U: 2, G: 3, C: 3 };          // hydrogen bonds per pair
const MCOL = { phos: "#f08a3c", oxy: "#e8505b", dsug: "#f4efe6", rsug: "#ffd9f2", link: "#f4efe6", mom: "#ff6aa6", dad: "#4b8cff" };
const GEO = {};

/* ---------- small helpers ---------- */
function polyShape(cx, cy, r, n, rot = 0) {
  const s = new THREE.Shape();
  for (let k = 0; k < n; k++) { const a = rot + (k / n) * TAU; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; k ? s.lineTo(x, y) : s.moveTo(x, y); }
  s.closePath(); return s;
}
function extrude(shape, depth = 0.07, bevel = 0.018) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: !LITE, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 1, curveSegments: 4 });
  g.translate(0, 0, -depth / 2); return g;
}
/* base slab: lies along +X (0 -> 1 after normalising), width in Y, thin in Z (stacking axis) */
function baseGeo(purine) {
  const key = purine ? "pur" : "pyr"; if (GEO[key]) return GEO[key];
  const parts = [];
  const stem = new THREE.BoxGeometry(0.16, 0.07, 0.06); stem.translate(0.08, 0, 0); parts.push({ geo: stem });
  let len;
  if (purine) {   // 5-ring bonded to sugar (N9) fused to a 6-ring
    parts.push({ geo: extrude(polyShape(0.27, 0, 0.13, 5, Math.PI)) });
    parts.push({ geo: extrude(polyShape(0.5, 0, 0.155, 6, 0)) });
    len = 0.67;
  } else {        // single 6-ring (N1 to sugar)
    parts.push({ geo: extrude(polyShape(0.3, 0, 0.155, 6, 0)) });
    len = 0.47;
  }
  const g = mergeGeos(parts); g.deleteAttribute("color"); g.scale(1 / len, 1, 1); g.computeVertexNormals();
  return (GEO[key] = g);
}
/* phosphate group: P with four O (vertex coloured) */
function phosGeo(detail = 1) {
  const key = "phos" + detail; if (GEO[key]) return GEO[key];
  const big = new THREE.IcosahedronGeometry(0.15, detail), sm = new THREE.IcosahedronGeometry(0.095, detail);
  const parts = [{ geo: big, color: MCOL.phos }];
  const dirs = [V3(1, 1, 1), V3(-1, -1, 1), V3(-1, 1, -1), V3(1, -1, -1)];
  if (detail > 0) for (const d of dirs) parts.push({ geo: sm, matrix: mat4(d.normalize().multiplyScalar(0.15)), color: MCOL.oxy });
  return (GEO[key] = mergeGeos(parts));
}
/* sugar: pentagon ring with ring oxygen; ribose adds a 2'-OH bump */
function sugarGeo(rna) {
  const key = rna ? "rib" : "deox"; if (GEO[key]) return GEO[key];
  const ring = extrude(polyShape(0, 0, 0.16, 5, Math.PI / 2), 0.06, 0.02);
  const parts = [{ geo: ring, color: rna ? MCOL.rsug : MCOL.dsug }];
  const o = new THREE.IcosahedronGeometry(0.055, LQ(1, 0)); parts.push({ geo: o, matrix: mat4(V3(0, 0.16, 0)), color: MCOL.oxy });
  if (rna) { const oh = new THREE.IcosahedronGeometry(0.065, LQ(1, 0)); parts.push({ geo: oh, matrix: mat4(V3(-0.2, -0.17, 0.05)), color: "#ff3b6b" }); }
  return (GEO[key] = mergeGeos(parts));
}
function linkGeo() { return GEO.link || (GEO.link = (() => { const g = new THREE.CylinderGeometry(0.045, 0.045, 1, LQ(6, 4), 1, LITE); g.translate(0, 0.5, 0); return g; })()); }

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _s = V3(), _v = V3(), _w = V3(), _x = V3(), _y = V3(), _z = V3();
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
function setLink(mesh, i, a, b, vis) {
  if (!vis) { mesh.setMatrixAt(i, ZERO_M); return; }
  _v.subVectors(b, a); const L = _v.length(); if (L < 1e-5) { mesh.setMatrixAt(i, ZERO_M); return; }
  _q.setFromUnitVectors(V3(0, 1, 0), _v.divideScalar(L)); _m.compose(a, _q, _s.set(1, L, 1)); mesh.setMatrixAt(i, _m);
}
function basisMatrix(pos, X, Zhint, sx, sy, sz) {
  _x.copy(X).normalize(); _z.copy(Zhint).addScaledVector(_x, -_z.copy(Zhint).dot(_x)); if (_z.lengthSq() < 1e-6) _z.set(0, 0, 1).addScaledVector(_x, -_x.z);
  _z.normalize(); _y.crossVectors(_z, _x);
  _m.makeBasis(_x.multiplyScalar(sx), _y.multiplyScalar(sy), _z.multiplyScalar(sz)); _m.setPosition(pos); return _m;
}

/* ---------- Strand: instanced nucleotides (phosphate + sugar + base + backbone links) ---------- */
class Strand {
  constructor(cap, o = {}) {
    this.cap = cap; this.rna = !!o.rna; this.group = new THREE.Group();
    const det = LITE && cap > 1 ? 0 : o.detail ?? 1;
    const mk = (geo, mat, n) => { const m = new THREE.InstancedMesh(geo, mat, n); m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; this.group.add(m); return m; };
    this.P = mk(phosGeo(det), M("#ffffff", { vc: true, rough: 0.3, rimStr: 0.25, env: 0.7 }), cap);
    this.S = mk(sugarGeo(this.rna), M("#ffffff", { vc: true, rough: 0.35, rimStr: 0.25, env: 0.7 }), cap);
    const bm = M("#ffffff", { rough: 0.28, rimStr: 0.35, env: 0.8, physical: true, clearcoat: 0.8 });
    this.bmat = bm;
    this.pur = mk(baseGeo(true), bm, cap); this.pyr = mk(baseGeo(false), bm, cap);
    this.L = mk(linkGeo(), M(MCOL.link, { rough: 0.4, rimStr: 0.2 }), cap * 2);
    const white = new THREE.Color(1, 1, 1);
    for (let i = 0; i < cap; i++) { this.pur.setColorAt(i, white); this.pyr.setColorAt(i, white); }
    this.col = new THREE.Color();
  }
  /* nucs: [{base, P, S, tip, nrm, vis, link?, glow?}] ; pAfter: phosphate i links to sugar i+1 (else to sugar i-1) */
  set(nucs, pAfter = false) {
    const n = Math.min(nucs.length, this.cap);
    for (let i = 0; i < this.cap; i++) {
      const u = i < n ? nucs[i] : null;
      if (!u || !u.vis) { this.P.setMatrixAt(i, ZERO_M); this.S.setMatrixAt(i, ZERO_M); this.pur.setMatrixAt(i, ZERO_M); this.pyr.setMatrixAt(i, ZERO_M); this.L.setMatrixAt(2 * i, ZERO_M); this.L.setMatrixAt(2 * i + 1, ZERO_M); continue; }
      const sc = u.scale ?? 1;
      _m.compose(u.P, _q.identity(), _s.set(sc, sc, sc)); this.P.setMatrixAt(i, _m);
      _v.subVectors(u.tip, u.S);
      const L = _v.length();
      basisMatrix(u.S, _v.lengthSq() > 1e-8 ? _v : V3(1, 0, 0), u.nrm, sc, sc, sc); this.S.setMatrixAt(i, _m);
      const pur = !!PURINE[u.base];
      const mesh = pur ? this.pur : this.pyr, other = pur ? this.pyr : this.pur;
      basisMatrix(u.S, _v.lengthSq() > 1e-8 ? _v : V3(1, 0, 0), u.nrm, Math.max(L, 0.01), sc * (pur ? 1.0 : 1.0), sc);
      mesh.setMatrixAt(i, _m); other.setMatrixAt(i, ZERO_M);
      this.col.set(BC[u.base] || "#ccc"); if (u.dim) this.col.lerp(new THREE.Color("#9fb3c4"), u.dim); if (u.glow) this.col.lerp(new THREE.Color("#ffffff"), u.glow * 0.55);
      mesh.setColorAt(i, this.col);
      setLink(this.L, 2 * i, u.P, u.S, u.link !== false);
      const j = pAfter ? i + 1 : i - 1, w = nucs[j];
      setLink(this.L, 2 * i + 1, u.P, w && w.vis && j < n ? w.S : u.P, !!(w && w.vis && u.link !== false && w.link !== false && !u.cut && j >= 0 && j < n));
    }
    for (const m of [this.P, this.S, this.pur, this.pyr, this.L]) m.instanceMatrix.needsUpdate = true;
    this.pur.instanceColor.needsUpdate = true; this.pyr.instanceColor.needsUpdate = true;
  }
}

/* ---------- Hydrogen bonds between paired bases ---------- */
class Bonds {
  constructor(cap) {
    const g = new THREE.CylinderGeometry(0.022, 0.022, 1, 5, 1); g.rotateZ(Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(g, M("#ffffff", { emissive: "#bff3ff", ei: 0.6, rim: false }), cap * 3); this.mesh.frustumCulled = false; this.cap = cap;
  }
  set(list) { // list: [{a: tip1, b: tip2, n: 2|3, nrm, vis}]
    let k = 0;
    for (const p of list) {
      if (!p || !p.vis) continue;
      _w.subVectors(p.b, p.a); const L = _w.length(); if (L < 1e-4) continue;
      const mid = _v.addVectors(p.a, p.b).multiplyScalar(0.5);
      const side = V3().crossVectors(_w, p.nrm).normalize();
      for (let j = 0; j < p.n; j++) {
        const off = (j - (p.n - 1) / 2) * 0.095;
        const pos = mid.clone().addScaledVector(side, off);
        basisMatrix(pos, _w.clone(), p.nrm, L + 0.06, 1, 1); this.mesh.setMatrixAt(k++, _m);
        if (k >= this.cap * 3) break;
      }
    }
    for (let i = k; i < this.cap * 3; i++) this.mesh.setMatrixAt(i, ZERO_M);
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

/* ---------- Letter sprites ---------- */
const LTEX = {};
function letterTex(ch, ring) {
  const key = ch + (ring || ""); if (LTEX[key]) return LTEX[key];
  const t = canvasTex(128, 128, (x, w, h) => {
    const g = x.createRadialGradient(w * 0.38, h * 0.3, 4, w / 2, h / 2, w / 2);
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.7, "#eef8ff"); g.addColorStop(1, "#cbe9fb");
    x.fillStyle = g; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 6, 0, TAU); x.fill();
    x.lineWidth = 9; x.strokeStyle = ring || BC[ch] || "#0a6fae"; x.stroke();
    x.fillStyle = "#0d3550"; x.font = "900 74px Nunito, Arial Black, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(ch, w / 2, h / 2 + 5);
  });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.encoding = THREE.sRGBEncoding;
  return (LTEX[key] = t);
}
function letterSprite(ch, size = 0.6) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: letterTex(ch), depthTest: false, transparent: true }));
  s.scale.set(size, size, 1); s.renderOrder = 10; s.userData.ch = ch; return s;
}
function setSpriteLetter(s, ch) { if (s.userData.ch !== ch) { s.material.map = letterTex(ch); s.material.needsUpdate = true; s.userData.ch = ch; } }
function textSprite(text, o = {}) {
  const fs = o.size || 44, pad = 14; const c = document.createElement("canvas"); const x = c.getContext("2d");
  x.font = `900 ${fs}px Nunito, Arial Black, sans-serif`; const tw = Math.ceil(x.measureText(text).width) + pad * 2;
  c.width = tw; c.height = fs + pad * 2; x.font = `900 ${fs}px Nunito, Arial Black, sans-serif`;
  if (o.bg !== false) { x.fillStyle = o.bg || "rgba(255,255,255,.92)"; const r = c.height / 2; x.beginPath(); x.moveTo(r, 0); x.lineTo(tw - r, 0); x.arc(tw - r, r, r, -Math.PI / 2, Math.PI / 2); x.lineTo(r, c.height); x.arc(r, r, r, Math.PI / 2, -Math.PI / 2); x.fill(); }
  x.fillStyle = o.color || "#0d3550"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(text, tw / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: o.depthTest ?? false, transparent: true }));
  const h = o.h || 1; s.scale.set((h * c.width) / c.height, h, 1); s.renderOrder = 11; return s;
}

/* ---------- Duplex layout ---------- */
/* Lays out a double strand along an axis. Each bp i gets centre c, frame T (axis), N, B and an angle.
   top strand sits at angle a, bottom at a+delta (antiparallel). Returns nucleotide pose lists. */
function duplexLayout(o) {
  const n = o.n, top = [], bot = [], bonds = [];
  const rS = o.rS ?? 0.72, rP = o.rP ?? 0.98, rise = o.rise ?? 0.34, delta = o.delta ?? Math.PI, face = o.face ?? 0, faceDir = o.faceDir || V3(0, 0, 1);
  for (let i = 0; i < n; i++) {
    const c = o.center(i), F = o.frame(i), a = o.angle(i);
    const u1 = F.N.clone().multiplyScalar(Math.cos(a)).addScaledVector(F.B, Math.sin(a));
    const u2 = F.N.clone().multiplyScalar(Math.cos(a + delta)).addScaledVector(F.B, Math.sin(a + delta));
    const S1 = c.clone().addScaledVector(u1, rS), S2 = c.clone().addScaledVector(u2, rS);
    const P1 = c.clone().addScaledVector(u1, rP).addScaledVector(F.T, -rise * 0.5), P2 = c.clone().addScaledVector(u2, rP).addScaledVector(F.T, rise * 0.5);
    const b1 = o.seqTop ? o.seqTop[i] : null, b2 = o.seqBot ? o.seqBot[i] : null;
    const chord = S1.distanceTo(S2), gap = 0.07;
    const f1 = b1 ? (PURINE[b1] ? 0.57 : 0.43) : 0.5;
    const tip1 = S1.clone().lerp(S2, f1 - gap / 2 / chord), tip2 = S1.clone().lerp(S2, f1 + gap / 2 / chord);
    const nrm = F.T.clone().lerp(faceDir, face).normalize();
    top.push({ base: b1, P: P1, S: S1, tip: tip1, nrm, vis: !!b1, u: u1, c });
    bot.push({ base: b2, P: P2, S: S2, tip: tip2, nrm, vis: !!b2, u: u2, c });
    bonds.push({ a: tip1, b: tip2, n: HB[b1 || "A"], nrm, vis: !!(b1 && b2) });
  }
  return { top, bot, bonds };
}
const straightFrame = { T: V3(1, 0, 0), N: V3(0, 1, 0), B: V3(0, 0, 1) };

/* rigidly move a nucleotide (fly-in, explosions) */
function moveNuc(u, off, rotAxis, rotAng, pivot) {
  const q = new THREE.Quaternion().setFromAxisAngle(rotAxis, rotAng); const pv = pivot || u.S;
  const tr = (p) => p.clone().sub(pv).applyQuaternion(q).add(pv).add(off);
  return Object.assign({}, u, { P: tr(u.P), S: tr(u.S), tip: tr(u.tip), nrm: u.nrm.clone().applyQuaternion(q) });
}

/* ---------- DNA model: two strands + bonds + letters ---------- */
class DNAModel {
  constructor(cap, o = {}) {
    this.group = new THREE.Group(); this.cap = cap;
    this.top = new Strand(cap, { rna: false, detail: o.detail }); this.bot = new Strand(cap, { rna: !!o.botRNA, detail: o.detail });
    this.group.add(this.top.group, this.bot.group);
    if (o.bonds !== false) { this.bonds = new Bonds(cap); this.group.add(this.bonds.mesh); }
  }
  apply(lay) { this.top.set(lay.top, false); this.bot.set(lay.bot, true); if (this.bonds) this.bonds.set(lay.bonds); }
}

function smoothBlob(r, seed, lump, stretch, ws = 16, hs = 12) {
  const g = new THREE.SphereGeometry(r, ws, hs); const p = g.attributes.position, rnd = mulberry(seed); const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
  for (let i = 0; i < p.count; i++) { const v = V3(p.getX(i), p.getY(i), p.getZ(i)); const n = v.clone().normalize();
    const k = 1 + lump * (Math.sin(n.x * 3.1 + ph[0]) * Math.sin(n.y * 2.7 + ph[1]) + 0.6 * Math.sin(n.z * 4.3 + ph[2]));
    v.copy(n.multiplyScalar(r * k)); v.x *= stretch[0]; v.y *= stretch[1]; v.z *= stretch[2]; p.setXYZ(i, v.x, v.y, v.z); }
  g.computeVertexNormals(); return g;
}
function scatterInstances(geo, mat, n, sampler, seed, scaleRange = [1, 1]) {
  const mesh = new THREE.InstancedMesh(geo, mat, n); const rnd = mulberry(seed);
  for (let i = 0; i < n; i++) { const p = sampler(rnd); const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rnd() * 6, rnd() * 6, rnd() * 6)); const s = lerp(scaleRange[0], scaleRange[1], rnd());
    mesh.setMatrixAt(i, mat4(p, q, V3(s, s, s))); }
  return mesh;
}
function fibSphere(n, i) { const y = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - y * y), a = i * 2.399963; return V3(Math.cos(a) * r, y, Math.sin(a) * r); }

/* glow sprite (additive) */
function glowTex(col = "#ffffff") {
  const key = "glow" + col; if (LTEX[key]) return LTEX[key];
  const t = canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, col); g.addColorStop(1, "rgba(0,0,0,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); });
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return (LTEX[key] = t);
}
function glowSprite(col, size) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(col), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.set(size, size, 1); return s; }
