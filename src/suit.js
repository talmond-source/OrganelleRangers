/* ================= Suit projection =================
   Wraps a ranger's own turnaround sheet (front / left side / back) onto the shared body.
   Each vertex is posed into the sheet's stance, then mapped bone-by-bone onto the matching
   limb in each view, and the three views are blended by which way the surface faces. */
const SUIT = (() => {
  const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _m = new THREE.Matrix4(), _acc = new THREE.Matrix4();
  const SEG = {
    LeftArm: ["sh", "el", "L"], LeftForeArm: ["el", "wr", "L"], LeftHand: ["wr", "ft", "L"],
    RightArm: ["sh", "el", "R"], RightForeArm: ["el", "wr", "R"], RightHand: ["wr", "ft", "R"],
    LeftUpLeg: ["hip", "kn", "L"], LeftLeg: ["kn", "an", "L"], LeftFoot: ["kn", "an", "L", "foot"],
    RightUpLeg: ["hip", "kn", "R"], RightLeg: ["kn", "an", "R"], RightFoot: ["kn", "an", "R", "foot"],
  };
  const MESHJ = { sh: ["LeftArm", "RightArm"], el: ["LeftForeArm", "RightForeArm"], wr: ["LeftHand", "RightHand"], ft: ["LeftHandMiddle4", "RightHandMiddle4"], hip: ["LeftUpLeg", "RightUpLeg"], kn: ["LeftLeg", "RightLeg"], an: ["LeftFoot", "RightFoot"], toe: ["LeftToe_End", "RightToe_End"] };
  function groupOf(name) {
    if (SEG[name]) return name;
    if (/^LeftHand/.test(name)) return "LeftHand"; if (/^RightHand/.test(name)) return "RightHand";
    if (/^LeftToe/.test(name)) return "LeftFoot"; if (/^RightToe/.test(name)) return "RightFoot";
    return "torso";
  }
  // project a model-space point to a view's 2D plane (y up). front: +x right; back: mirrored; side (left side facing viewer): forward(+z) to the left
  const P2 = { front: (p) => [p.x, p.y], back: (p) => [-p.x, p.y], side: (p) => [-p.z, p.y] };
  // segment similarity map: along-axis follows the segment, across-axis uses the view's overall scale
  function segMap(am, bm, ai, bi, k) {
    const ux = bm[0] - am[0], uy = bm[1] - am[1], lm = Math.hypot(ux, uy) || 1e-6;
    const vx = bi[0] - ai[0], vy = bi[1] - ai[1], li = Math.hypot(vx, vy) || 1e-6;
    const ex = ux / lm, ey = uy / lm, fx = vx / li, fy = vy / li;
    return (p) => { const dx = p[0] - am[0], dy = p[1] - am[1]; const t = (dx * ex + dy * ey) / lm, s = -dx * ey + dy * ex; return [ai[0] + vx * t - fy * s * k, ai[1] + vy * t + fx * s * k]; };
  }
  function affineFit(src, dst) { // least squares 2D affine, src/dst arrays of [x,y]
    let A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], bx = [0, 0, 0], by = [0, 0, 0];
    src.forEach((s, i) => { const r = [s[0], s[1], 1]; for (let a = 0; a < 3; a++) { for (let b = 0; b < 3; b++) A[a][b] += r[a] * r[b]; bx[a] += r[a] * dst[i][0]; by[a] += r[a] * dst[i][1]; } });
    const inv = new THREE.Matrix3().set(A[0][0], A[0][1], A[0][2], A[1][0], A[1][1], A[1][2], A[2][0], A[2][1], A[2][2]).invert().elements; // column-major
    const mul = (b) => [0, 1, 2].map((r) => inv[r] * b[0] + inv[3 + r] * b[1] + inv[6 + r] * b[2]);
    const cx = mul(bx), cy = mul(by);
    return (p) => [cx[0] * p[0] + cx[1] * p[1] + cx[2], cy[0] * p[0] + cy[1] * p[1] + cy[2]];
  }
  const up = (q) => [q[0], -q[1]]; // image coords -> y-up

  /* Pose the skeleton into the sheet's stance: arms dropped to the sheet's angle, legs spread to match. */
  function sheetPose(bones, L) {
    const f = L.front;
    const armAng = (s) => { const i = s === "L" ? 1 : 0; const a = f.sh[i], b = f.ft[i]; return Math.atan2(Math.abs(b[0] - a[0]), b[1] - a[1]); };
    const legAng = (s) => { const i = s === "L" ? 1 : 0; const a = f.hip[i], b = f.an[i]; return Math.atan2(Math.abs(b[0] - a[0]), b[1] - a[1]); };
    return { armL: armAng("L"), armR: armAng("R"), legL: legAng("L"), legR: legAng("R") };
  }
  function applySheetPose(rig, ang) {
    // rotate in world space so it is independent of each bone's local axes
    const rotW = (bone, axis, a) => { const pq = new THREE.Quaternion(); bone.parent.getWorldQuaternion(pq); const wq = new THREE.Quaternion(); bone.getWorldQuaternion(wq); const r = new THREE.Quaternion().setFromAxisAngle(axis, a); wq.premultiply(r); bone.quaternion.copy(pq.invert().multiply(wq)); bone.updateMatrixWorld(true); };
    const Z = new THREE.Vector3(0, 0, 1);
    rig.root.updateMatrixWorld(true);
    rotW(rig.b.LeftArm, Z, -(Math.PI / 2 - ang.armL)); rotW(rig.b.RightArm, Z, Math.PI / 2 - ang.armR);
    rotW(rig.b.LeftUpLeg, Z, ang.legL); rotW(rig.b.RightUpLeg, Z, -ang.legR);
  }
  function jointsOf(rig) { const o = {}; for (const k in MESHJ) o[k] = MESHJ[k].map((n) => rig.b[n].getWorldPosition(new THREE.Vector3())); return o; }

  /* compute per-vertex sheet coordinates for one skinned mesh */
  function project(mesh, rig, L, J, tex) {
    const g = mesh.geometry, pos = g.attributes.position, nor = g.attributes.normal, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, n = pos.count;
    const sk = mesh.skeleton; sk.update();
    const bm = sk.boneMatrices, groups = sk.bones.map((b) => groupOf(b.name.replace(/^mixamorig:?/, "")));
    const crop = L.crop, W = crop[2] - crop[0], H = crop[3] - crop[1];
    const toUV = (q) => [(q[0] - crop[0]) / W, 1 - (-q[1] - crop[1]) / H]; // q is y-up image coords
    // build per-view maps
    const maps = {};
    const meshTop = 1.80;
    for (const view of ["front", "back", "side"]) {
      const V = L[view], k = (V.floor - V.top) / meshTop, m = {}; const p2 = P2[view];
      if (view !== "side") {
        const side = (s) => (s === "L" ? 1 : 0);
        const src = [p2(J.sh[0]), p2(J.sh[1]), p2(J.hip[0]), p2(J.hip[1]), p2(rig.b.Head.getWorldPosition(_v))];
        const dst = [up(V.sh[side("L")]), up(V.sh[side("R")]), up(V.hip[side("L")]), up(V.hip[side("R")]), up(V.neck)];
        m.torso = affineFit(src, dst);
        for (const [bn, [a, b, s]] of Object.entries(SEG)) { const j = s === "L" ? 0 : 1, vi = side(s); m[bn] = segMap(p2(J[a][j]), p2(J[b][j]), up(V[a][vi]), up(V[b][vi]), k); }
      } else {
        // side: torso is a scale + per-height centring between chest and hips
        const zc = (y0) => { let lo = 1e9, hi = -1e9; for (let i = 0; i < n; i += 3) { _v.fromBufferAttribute(pos, i); mesh.boneTransform ? mesh.boneTransform(i, _v) : 0; _v.applyMatrix4(mesh.matrixWorld); if (Math.abs(_v.y - y0) < 0.025 && Math.abs(_v.x) < 0.1) { lo = Math.min(lo, _v.z); hi = Math.max(hi, _v.z); } } return (lo + hi) / 2; };
        const yC = (V.floor - V.chest[0][1]) / k, yH = (V.floor - V.hipz[0][1]) / k;
        const zC = zc(yC), zH = zc(yH), xC = (V.chest[0][0] + V.chest[1][0]) / 2, xH = (V.hipz[0][0] + V.hipz[1][0]) / 2;
        m.torso = (p) => { const t = THREE.MathUtils.clamp((p[1] - yH) / (yC - yH), -0.5, 2.2); const zc0 = zH + (zC - zH) * t, xc0 = xH + (xC - xH) * t; return [xc0 + (p[0] + zc0) * k, -(V.floor - p[1] * k)]; };
        for (const [bn, [a, b, s, foot]] of Object.entries(SEG)) { const j = s === "L" ? 0 : 1; const A = foot ? "an" : a, B = foot ? "toe" : b; m[bn] = segMap(p2(J[A][j]), p2(J[B][j]), up(V[A]), up(V[B]), k); }
      }
      maps[view] = m;
    }
    const uvF = new Float32Array(n * 2), uvB = new Float32Array(n * 2), uvS = new Float32Array(n * 2), wts = new Float32Array(n * 3);
    const P = new THREE.Vector3(), N = new THREE.Vector3(), tmp = new THREE.Vector3(); const pf = new Float32Array(n * 2);
    for (let i = 0; i < n; i++) {
      // CPU skinning of position + normal
      _acc.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      const idx = [si.getX(i), si.getY(i), si.getZ(i), si.getW(i)], w = [sw.getX(i), sw.getY(i), sw.getZ(i), sw.getW(i)];
      for (let j = 0; j < 4; j++) { if (!w[j]) continue; _m.fromArray(bm, idx[j] * 16); const e = _m.elements, a = _acc.elements; for (let q = 0; q < 16; q++) a[q] += e[q] * w[j]; }
      _m.copy(mesh.bindMatrixInverse).multiply(_acc).multiply(mesh.bindMatrix).premultiply(mesh.matrixWorld);
      P.fromBufferAttribute(pos, i).applyMatrix4(_m); N.fromBufferAttribute(nor, i).transformDirection(_m);
      pf[i * 2] = P.x; pf[i * 2 + 1] = P.y;
      for (const view of ["front", "back", "side"]) {
        const p2 = P2[view](P); let x = 0, y = 0, tw = 0;
        for (let j = 0; j < 4; j++) { if (!w[j]) continue; const gname = groups[idx[j]]; let f = maps[view][gname] || maps[view].torso; const q = f(p2); x += q[0] * w[j]; y += q[1] * w[j]; tw += w[j]; }
        const uv = toUV([x / tw, y / tw]); const arr = view === "front" ? uvF : view === "back" ? uvB : uvS; arr[i * 2] = uv[0]; arr[i * 2 + 1] = uv[1];
      }
      // in the side view the hanging arm hides the torso and thigh, so those parts lean on front/back instead
      let hid = 0; for (let j = 0; j < 4; j++) { const gn = groups[idx[j]]; if (gn === "torso" || /UpLeg/.test(gn)) hid += w[j]; }
      const pw = 4, wf = Math.pow(Math.max(N.z, 0), pw) + 0.02 * hid, wb = Math.pow(Math.max(-N.z, 0), pw) + 0.02 * hid, ws = (Math.pow(Math.abs(N.x), pw) * 0.9 + 0.0001) * (1 - 0.93 * hid);
      const s = wf + wb + ws; wts[i * 3] = wf / s; wts[i * 3 + 1] = wb / s; wts[i * 3 + 2] = ws / s;
    }
    mesh.userData.fit = { pf, groups };
    g.setAttribute("uvF", new THREE.BufferAttribute(uvF, 2)); g.setAttribute("uvB", new THREE.BufferAttribute(uvB, 2)); g.setAttribute("uvS", new THREE.BufferAttribute(uvS, 2)); g.setAttribute("wts", new THREE.BufferAttribute(wts, 3));
  }

  /* Sculpt the body out to the sheet's silhouette: wherever the drawn limb is thicker than the base body
     (boot shafts, glove cuffs, bracers, armoured thighs) the surface is pushed out to match, as real geometry. */
  const comp = (a, i, q) => (q === 0 ? a.getX(i) : q === 1 ? a.getY(i) : q === 2 ? a.getZ(i) : a.getW(i));
  function inflate(mesh, rig, L, J, mask) {
    const g = mesh.geometry, pos = g.attributes.position, si = g.attributes.skinIndex, sw = g.attributes.skinWeight, n = pos.count; const { pf, groups } = mesh.userData.fit;
    const V = L.front, k = (V.floor - V.top) / 1.8, crop = L.crop, NB = 24, cx = (V.hip[0][0] + V.hip[1][0]) / 2;
    const inM = (X, Y) => { const x = Math.round((X - crop[0]) * mask.s), y = Math.round((Y - crop[1]) * mask.s); return x >= 0 && y >= 0 && x < mask.w && y < mask.h && mask.d[y * mask.w + x] > 127; };
    const LIMBS = [["Arm", "sh", "el", "ForeArm", 0.35], ["ForeArm", "el", "wr", "Hand", 0], ["UpLeg", "hip", "kn", "Leg", 0.35], ["Leg", "kn", "an", "Foot", 0]];
    const ratio = {}, axis = {}; const sk = mesh.skeleton; const restPos = (name) => { const i = sk.bones.findIndex((b) => b.name === name); return new THREE.Vector3().setFromMatrixPosition(sk.boneInverses[i].clone().invert()); };
    for (const [S, j, vi] of [["Left", 0, 1], ["Right", 1, 0]]) for (const [limb, a, b, child, tmin] of LIMBS) {
      const gn = S + limb, am = [J[a][j].x, J[a][j].y], bm2 = [J[b][j].x, J[b][j].y], ai = V[a][vi], bi = V[b][vi];
      const um = [bm2[0] - am[0], bm2[1] - am[1]], lm = Math.hypot(um[0], um[1]); um[0] /= lm; um[1] /= lm; let nm = [-um[1], um[0]]; if (nm[0] * am[0] < 0) nm = [-nm[0], -nm[1]];
      const ui = [bi[0] - ai[0], bi[1] - ai[1]], li = Math.hypot(ui[0], ui[1]); ui[0] /= li; ui[1] /= li; let ni = [-ui[1], ui[0]]; if (ni[0] * ((ai[0] + bi[0]) / 2 - cx) < 0) ni = [-ni[0], -ni[1]];
      const img = new Float32Array(NB), msh = new Float32Array(NB);
      for (let q = 0; q < NB; q++) { const t = (q + 0.5) / NB, c = [ai[0] + ui[0] * li * t, ai[1] + ui[1] * li * t]; if (!inM(c[0], c[1])) { img[q] = NaN; continue; } let s = 0; const lim = 0.2 * k; while (s < lim && inM(c[0] + ni[0] * s, c[1] + ni[1] * s)) s += 0.5; img[q] = s >= lim ? NaN : s / k; }
      for (let i = 0; i < n; i++) { let w = 0; for (let q = 0; q < 4; q++) if (groups[comp(si, i, q)] === gn) w += comp(sw, i, q); if (w < 0.6) continue; const dx = pf[i * 2] - am[0], dy = pf[i * 2 + 1] - am[1]; const t = (dx * um[0] + dy * um[1]) / lm, s = dx * nm[0] + dy * nm[1]; const q = Math.floor(t * NB); if (q >= 0 && q < NB) msh[q] = Math.max(msh[q], s); }
      const r = new Float32Array(NB).fill(1); for (let q = 0; q < NB; q++) { const t = (q + 0.5) / NB; if (t > tmin && msh[q] > 0.02 && img[q] === img[q]) r[q] = Math.min(1.5, Math.max(1, img[q] / msh[q])); }
      const c = Float32Array.from(r); for (let q = 1; q < NB - 1; q++) r[q] = (c[q - 1] + c[q] * 2 + c[q + 1]) / 4;
      ratio[gn] = r; const A = restPos(gn), B = restPos(S + child); axis[gn] = { A, u: B.clone().sub(A), len: B.distanceTo(A) }; axis[gn].u.normalize();
    }
    const p = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 0; i < n; i++) { let f = 0, best = null, bw = 0;
      p.fromBufferAttribute(pos, i);
      for (let q = 0; q < 4; q++) { const gn = groups[comp(si, i, q)], w = comp(sw, i, q); const ax = axis[gn]; if (!ax || !w) continue; const t = d.copy(p).sub(ax.A).dot(ax.u) / ax.len; const b = Math.min(NB - 1, Math.max(0, Math.floor(t * NB))); f += w * (ratio[gn][b] - 1); if (w > bw) { bw = w; best = ax; } }
      if (!best || f < 0.01) continue; const t = d.copy(p).sub(best.A).dot(best.u); d.copy(best.A).addScaledVector(best.u, t); p.sub(d).multiplyScalar(1 + f).add(d); pos.setXYZ(i, p.x, p.y, p.z); }
    pos.needsUpdate = true; g.computeVertexNormals();
  }

  /* material: standard PBR with the sheet as albedo and the material map driving metal / gloss / visor */
  function material(colTex, matTex, opts = {}) {
    const m = LITE ? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: opts.rough ?? 0.3, metalness: 0, envMapIntensity: opts.env ?? 0.55 }) : new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: opts.rough ?? 0.4, metalness: 0, clearcoat: opts.clearcoat ?? 0.5, clearcoatRoughness: 0.22, envMapIntensity: opts.env ?? 0.32 });
    m.onBeforeCompile = (sh) => {
      sh.uniforms.sheet = { value: colTex }; sh.uniforms.flash = m.userData.flash; sh.uniforms.sheetMat = { value: matTex }; sh.uniforms.delight = { value: opts.delight ?? 0.35 };
      sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute vec2 uvF; attribute vec2 uvB; attribute vec2 uvS; attribute vec3 wts; varying vec2 vF; varying vec2 vB; varying vec2 vS; varying vec3 vW; varying vec3 vBind;")
        .replace("#include <begin_vertex>", "#include <begin_vertex>\nvF=uvF; vB=uvB; vS=uvS; vW=wts; vBind=position;");
      sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nuniform sampler2D sheet; uniform sampler2D sheetMat; uniform float flash; uniform float delight; varying vec2 vF; varying vec2 vB; varying vec2 vS; varying vec3 vW; varying vec3 vBind;\nvec4 sheetSample(sampler2D t){ return texture2D(t,vF)*vW.x + texture2D(t,vB)*vW.y + texture2D(t,vS)*vW.z; }")
        .replace("#include <map_fragment>", "vec4 sc = sheetSample(sheet); diffuseColor.rgb *= sc.rgb; vec3 mm = sheetSample(sheetMat).rgb;")
        .replace("#include <roughnessmap_fragment>", "#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.06, mm.b); roughnessFactor = mix(roughnessFactor, 0.28, mm.r);")
        .replace("#include <metalnessmap_fragment>", "#include <metalnessmap_fragment>\nmetalnessFactor = max(metalnessFactor, mm.r*0.9);")
        .replace("#include <normal_fragment_maps>", "#include <normal_fragment_maps>\n{ float hB = mm.g; float fw = fwidth(vBind.y) * 1900.0; float wv = sin(vBind.x * 1900.0 + vBind.z * 1300.0) * sin(vBind.y * 1900.0) ; hB += wv * 0.012 * clamp(1.0 - fw * 0.9, 0.0, 1.0) * (1.0 - mm.r) * (1.0 - mm.b); vec2 dH = vec2(dFdx(hB), dFdy(hB)) * 0.004; vec3 sx = dFdx(-vViewPosition), sy = dFdy(-vViewPosition); vec3 R1 = cross(sy, normal), R2 = cross(normal, sx); float det = dot(sx, R1); vec3 grad = sign(det) * (dH.x * R1 + dH.y * R2); normal = normalize(abs(det) * normal - grad); }")
        .replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(flash) + diffuseColor.rgb * pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.5) * 0.35 * (1.0 - mm.b);");
    };
    m.userData.flash = { value: 0 };
    m.customProgramCacheKey = () => "suit5";
    return m;
  }
  return { sheetPose, applySheetPose, jointsOf, project, inflate, material, groupOf };
})();
