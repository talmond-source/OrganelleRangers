"use strict";
THREE.ColorManagement.legacyMode = false;
/* =====================================================================
   DNA Pre-Test: engine helpers (materials, geometry, camera keys)
   Units: 1 world unit = 1 nanometre.
   ===================================================================== */
const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
if (typeof LITE === "undefined") var LITE = false;
if (typeof MOBILE === "undefined") var MOBILE = false;
const LQ = (hi, lo) => (LITE ? lo : hi);   // graphics level: full (board demo) vs lite (student Chromebooks)
const $ = (s) => document.querySelector(s);
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const es = (t, a, b) => ease(seg(t, a, b));
const smooth = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const ss = (t, a, b) => smooth(seg(t, a, b));
const TAU = Math.PI * 2;
const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let CLOCK = 0;
function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* smooth pseudo-random wobble (for Brownian-looking drift) */
function wob(seed, t, f = 1) {
  return Math.sin(t * 1.13 * f + seed * 1.7) * 0.5 + Math.sin(t * 0.71 * f + seed * 4.1) * 0.3 + Math.sin(t * 2.37 * f + seed * 0.3) * 0.2;
}
function wob3(seed, t, amp, f = 1) { return V3(wob(seed, t, f) * amp, wob(seed + 11, t, f) * amp, wob(seed + 23, t, f) * amp); }
const lerpV = (a, b, t) => V3(lerp(a.x, b.x, t), lerp(a.y, b.y, t), lerp(a.z, b.z, t));
const toV = (a) => (a.isVector3 ? a : V3(a[0], a[1], a[2]));

/* ---------- geometry helpers ---------- */
function mergeGeos(parts) {
  // parts: [{geo, matrix?, color?}] -> non-indexed BufferGeometry with position, normal (+color if any part has color)
  let n = 0; const prepared = [];
  const anyColor = parts.some((p) => p.color);
  for (const p of parts) {
    let g = p.geo.index ? p.geo.toNonIndexed() : p.geo.clone();
    if (p.matrix) g.applyMatrix4(p.matrix);
    if (!g.attributes.normal) g.computeVertexNormals();
    prepared.push({ g, color: p.color ? new THREE.Color(p.color) : new THREE.Color(1, 1, 1) });
    n += g.attributes.position.count;
  }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = anyColor ? new Float32Array(n * 3) : null;
  let o = 0;
  for (const { g, color } of prepared) {
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (col) for (let i = 0; i < g.attributes.position.count; i++) { col[(o + i) * 3] = color.r; col[(o + i) * 3 + 1] = color.g; col[(o + i) * 3 + 2] = color.b; }
    o += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  if (col) out.setAttribute("color", new THREE.BufferAttribute(col, 3));
  return out;
}
function mat4(pos, quat, scale) { const m = new THREE.Matrix4(); m.compose(pos || V3(), quat || new THREE.Quaternion(), scale || V3(1, 1, 1)); return m; }
function quatFromZ(dir, xHint) {
  // rotation taking +Z to dir, with +X as close as possible to xHint
  const z = dir.clone().normalize();
  let x = xHint ? xHint.clone() : V3(1, 0, 0);
  x.sub(z.clone().multiplyScalar(x.dot(z)));
  if (x.lengthSq() < 1e-6) { x = Math.abs(z.x) < 0.9 ? V3(1, 0, 0) : V3(0, 1, 0); x.sub(z.clone().multiplyScalar(x.dot(z))); }
  x.normalize(); const y = z.clone().cross(x);
  const m = new THREE.Matrix4().makeBasis(x, y, z); return new THREE.Quaternion().setFromRotationMatrix(m);
}
function quatFromY(dir, xHint) { const q = quatFromZ(dir, xHint); return q.multiply(new THREE.Quaternion().setFromAxisAngle(V3(1, 0, 0), Math.PI / 2)); }
/* lumpy blob geometry (proteins) */
function blobGeo(r = 1, detail = 1, lump = 0.18, seed = 1, stretch = [1, 1, 1]) {
  const g = new THREE.IcosahedronGeometry(r, detail);
  const p = g.attributes.position, rnd = mulberry(seed);
  const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
  for (let i = 0; i < p.count; i++) {
    const v = V3(p.getX(i), p.getY(i), p.getZ(i)); const n = v.clone().normalize();
    const k = 1 + lump * (Math.sin(n.x * 3.1 + ph[0]) * Math.sin(n.y * 2.7 + ph[1]) + 0.6 * Math.sin(n.z * 4.3 + ph[2]));
    v.copy(n.multiplyScalar(r * k)); v.x *= stretch[0]; v.y *= stretch[1]; v.z *= stretch[2];
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals(); return g;
}

/* ---------- textures ---------- */
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; if (repeat) t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4; return t;
}
const TEX = {};
function texLipid() { // packed lipid heads (bump)
  return TEX.lipid || (TEX.lipid = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = "#808080"; x.fillRect(0, 0, w, h); const r = mulberry(4);
    for (let j = 0; j < 12; j++) for (let i = 0; i < 12; i++) { const cx = (i + (j % 2) * 0.5) * (w / 12) + (r() - 0.5) * 3, cy = j * (h / 12) + (r() - 0.5) * 3;
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, 6); g.addColorStop(0, "#fff"); g.addColorStop(1, "#808080"); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, 6, 0, TAU); x.fill(); }
  }));
}
function texDNA() { // two grooves (major/minor) as diagonal stripes; u along strand, v around
  return TEX.dna || (TEX.dna = canvasTex(64, 64, (x, w, h) => {
    x.fillStyle = "#ffffff"; x.fillRect(0, 0, w, h);
    x.strokeStyle = "rgba(0,0,0,0.42)"; x.lineWidth = 9;
    for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(k * w, 0); x.lineTo(k * w + w, h); x.stroke(); x.beginPath(); x.moveTo(k * w + w * 0.42, 0); x.lineTo(k * w + w * 1.42, h); x.stroke(); }
    x.strokeStyle = "rgba(255,255,255,0.8)"; x.lineWidth = 2;
    for (let k = -2; k <= 2; k++) { x.beginPath(); x.moveTo(k * w + w * 0.2, 0); x.lineTo(k * w + w * 1.2, h); x.stroke(); }
  }));
}
function texMesh() { // peptidoglycan net (alpha)
  return TEX.pg || (TEX.pg = canvasTex(128, 128, (x, w, h) => {
    x.clearRect(0, 0, w, h); x.strokeStyle = "#fff"; x.lineWidth = 7;
    for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(0, i * h / 4); x.lineTo(w, i * h / 4); x.stroke(); }
    x.lineWidth = 4; for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * w / 8, 0); x.lineTo(i * w / 8 + 6, h); x.stroke(); }
  }));
}

/* ---------- materials ---------- */
function rimify(mat, color = "#ffffff", power = 2.6, strength = 0.35, backDim = 0.55) {
  const col = new THREE.Color(color);
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.rimColor = { value: col }; sh.uniforms.rimPow = { value: power }; sh.uniforms.rimStr = { value: strength };
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 rimColor; uniform float rimPow; uniform float rimStr;")
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        float rimF = pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), rimPow);
        totalEmissiveRadiance += rimColor * rimF * rimStr;
        if (!gl_FrontFacing) { diffuseColor.rgb *= ${backDim.toFixed(2)}; }`);
  };
  mat.customProgramCacheKey = () => `rim_${color}_${power}_${strength}_${backDim}`;
  return mat;
}
function M(color, o = {}) {
  if (LITE) {   // cheaper Blinn-Phong shading: same colours and gloss highlight, no PBR or reflections
    const m = new THREE.MeshPhongMaterial({ color, transparent: !!o.transparent, opacity: o.opacity ?? 1, side: o.side ?? THREE.FrontSide, vertexColors: !!o.vc, depthWrite: o.depthWrite ?? true,
      emissive: o.emissive || 0x000000, emissiveIntensity: o.ei ?? 1, shininess: o.rough !== undefined ? Math.max(8, 90 * (1 - o.rough)) : 50, specular: new THREE.Color(0x3a3a3a), flatShading: !!o.flat });
    if (o.map) m.map = o.map; if (o.alphaMap) { m.alphaMap = o.alphaMap; m.alphaTest = o.alphaTest ?? 0.4; }
    if (o.clip) m.clippingPlanes = o.clip;
    if (o.rim !== false) rimify(m, o.rimColor || "#ffffff", o.rimPow ?? 2.6, o.rimStr ?? 0.3, o.backDim ?? 0.55);
    return m;
  }
  const m = new (o.physical ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial)({
    color, roughness: o.rough ?? 0.42, metalness: o.metal ?? 0.0, transparent: !!o.transparent, opacity: o.opacity ?? 1,
    side: o.side ?? THREE.FrontSide, vertexColors: !!o.vc, depthWrite: o.depthWrite ?? true, emissive: o.emissive || 0x000000,
    emissiveIntensity: o.ei ?? 1, flatShading: !!o.flat,
  });
  m.envMapIntensity = o.env ?? 0.55;
  if (o.physical) { m.clearcoat = o.clearcoat ?? 0.6; m.clearcoatRoughness = o.ccr ?? 0.25; }
  if (o.map) m.map = o.map; if (o.bump) { m.bumpMap = o.bump; m.bumpScale = o.bumpScale ?? 1; }
  if (o.alphaMap) { m.alphaMap = o.alphaMap; m.alphaTest = o.alphaTest ?? 0.4; }
  if (o.clip) m.clippingPlanes = o.clip;
  if (o.rim !== false) rimify(m, o.rimColor || "#ffffff", o.rimPow ?? 2.6, o.rimStr ?? 0.3, o.backDim ?? 0.55);
  return m;
}

/* ---------- camera keyframes ---------- */
function camAt(keys, t) {
  // keys: [{t, p:[x,y,z], l:[x,y,z], fov?}] eased between consecutive keys
  if (t <= keys[0].t) return { p: toV(keys[0].p), l: toV(keys[0].l), fov: keys[0].fov || 40 };
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t <= b.t) { const u = smooth(seg(t, a.t, b.t)); return { p: lerpV(toV(a.p), toV(b.p), u), l: lerpV(toV(a.l), toV(b.l), u), fov: lerp(a.fov || 40, b.fov || 40, u) }; }
  }
  const k = keys[keys.length - 1]; return { p: toV(k.p), l: toV(k.l), fov: k.fov || 40 };
}

