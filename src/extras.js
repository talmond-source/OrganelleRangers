/* ================= Raised suit details (3D pieces on top of the painted sheet) ================= */
// find the body surface under a point of the sheet's front view (sheet pixel coords) -> rest-pose position + normal
function surfacePoint(model, X, Y, view = "F") {
  const g = model.suit.geometry, L = model.L, crop = L.crop, W = crop[2] - crop[0], H = crop[3] - crop[1];
  const u = (X - crop[0]) / W, v = 1 - (Y - crop[1]) / H; const uv = g.attributes["uv" + view], wts = g.attributes.wts, pos = g.attributes.position, nor = g.attributes.normal;
  let best = -1, bd = 1e9; const wi = view === "F" ? 0 : view === "B" ? 1 : 2;
  for (let i = 0; i < uv.count; i++) { if (wts.array[i * 3 + wi] < 0.45) continue; const du = uv.getX(i) - u, dv = uv.getY(i) - v, d = du * du + dv * dv; if (d < bd) { bd = d; best = i; } }
  return { p: new THREE.Vector3().fromBufferAttribute(pos, best), n: new THREE.Vector3().fromBufferAttribute(nor, best).normalize() };
}
function attachAt(model, boneName, obj, p, n, lift = 0) {
  const bone = model.b[boneName]; model.root.updateMatrixWorld(true);
  const wp = p.clone().addScaledVector(n, lift); const inv = bone.matrixWorld.clone().invert();
  obj.position.copy(wp.applyMatrix4(inv));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n); const bq = bone.getWorldQuaternion(new THREE.Quaternion()).invert();
  obj.quaternion.copy(bq.multiply(q)); bone.add(obj); return obj;
}
function pauldron(mat, trim) {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), mat); shell.scale.set(1.25, 0.55, 1.05); g.add(shell);
  const under = new THREE.Mesh(new THREE.SphereGeometry(0.097, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), mat); under.scale.set(1.25, 0.5, 1.05); under.material = mat; under.geometry.scale(1, 1, 1); g.add(under);
  const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.009, 8, 40, Math.PI), trim); ridge.rotation.y = Math.PI / 2; ridge.scale.set(1.05, 0.62, 1.25); ridge.position.y = 0.004; g.add(ridge);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.006, 6, 48), trim); edge.rotation.x = Math.PI / 2; edge.scale.set(1.25, 1.05, 1); edge.position.y = 0.0; g.add(edge);
  g.traverse((o) => o.isMesh && (o.castShadow = true)); return g;
}
/* a raised band that hugs the body: lofts rings fitted to the body's own cross-section between two points */
function bodyBand(model, boneName, A, B, t0, t1, mat, grow = 0.007, rmax = 0.12) {
  const pos = model.suit.geometry.attributes.position, u = B.clone().sub(A), len = u.length(); u.normalize();
  const e1 = new THREE.Vector3(0, 0, 1).cross(u); if (e1.lengthSq() < 0.01) e1.set(1, 0, 0).cross(u); e1.normalize(); const e2 = u.clone().cross(e1);
  const NB = 28, ts = [t0, t0 + (t1 - t0) * 0.12, (t0 + t1) / 2, t1 - (t1 - t0) * 0.12, t1], gr = [0.0005, grow, grow, grow, 0.0005];
  const rad = ts.map(() => new Float32Array(NB)); const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i).sub(A); const al = p.dot(u) / len; if (al < t0 - 0.1 || al > t1 + 0.1) continue; const x = p.dot(e1), y = p.dot(e2), r = Math.hypot(x, y); if (r > rmax) continue; const b = ((Math.atan2(y, x) / TAU + 1) % 1) * NB;
    ts.forEach((t, k) => { if (Math.abs(al - t) * len < 0.014) for (const bb of [Math.floor(b), Math.ceil(b) % NB]) rad[k][bb] = Math.max(rad[k][bb], r); }); }
  rad.forEach((R) => { for (let pass = 0; pass < 3; pass++) for (let b = 0; b < NB; b++) { if (!R[b]) R[b] = Math.max(R[(b + 1) % NB], R[(b + NB - 1) % NB]); } for (let pass = 0; pass < 2; pass++) { const c = Float32Array.from(R); for (let b = 0; b < NB; b++) R[b] = (c[(b + NB - 1) % NB] + c[b] * 2 + c[(b + 1) % NB]) / 4; } });
  const bone = model.b[boneName]; model.root.updateMatrixWorld(true); const inv = bone.matrixWorld.clone().invert(); const V = [], I = [];
  ts.forEach((t, k) => { for (let b = 0; b <= NB; b++) { const a = ((b % NB) / NB) * TAU, r = rad[k][b % NB] + gr[k]; p.copy(A).addScaledVector(u, t * len).addScaledVector(e1, Math.cos(a) * r).addScaledVector(e2, Math.sin(a) * r).applyMatrix4(inv); V.push(p.x, p.y, p.z); } });
  for (let k = 0; k < ts.length - 1; k++) for (let b = 0; b < NB; b++) { const a = k * (NB + 1) + b, c = a + NB + 1; I.push(a, a + 1, c, a + 1, c + 1, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(V, 3)); g.setIndex(I); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.material.side = THREE.DoubleSide; m.castShadow = true; bone.add(m); return m;
}
function limbBands(model, from, to, t0, t1, mat, grow) { for (const s of ["Left", "Right"]) { model.root.updateMatrixWorld(true); const A = model.b[s + from].getWorldPosition(new THREE.Vector3()), B = model.b[s + to].getWorldPosition(new THREE.Vector3()); bodyBand(model, s + from, A, B, t0, t1, mat, grow, 0.11); } }
function belt(model, y0, y1, mat, grow) { bodyBand(model, "Hips", new THREE.Vector3(0, y0, -0.01), new THREE.Vector3(0, y1, -0.01), 0, 1, mat, grow, 0.26); }
const glossM = (c, o = {}) => new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 0.6 }, o));
const EXTRAS = {
  atp(model) { // three raised phosphate discs: yellow caps in silver rims
    const cap = new THREE.MeshPhysicalMaterial({ color: "#f4d63d", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, emissive: "#6b5300", emissiveIntensity: 0.25 });
    const rim = new THREE.MeshStandardMaterial({ color: "#e4e7ea", metalness: 0.6, roughness: 0.3 });
    const discs = [[183, 201], [163, 221], [204, 221]].map(([x, y], i) => {
      const g = new THREE.Group(); const r = 0.047;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.016, 32), cap); c.rotation.x = Math.PI / 2; g.add(c);
      const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0075, 10, 40), rim); t.position.z = 0.004; g.add(t);
      g.traverse((o) => o.isMesh && (o.castShadow = true));
      const sp = surfacePoint(model, x, y); return attachAt(model, "Spine2", g, sp.p, sp.n, 0.006);
    });
    model.extras.discs = discs;
    const g2 = glossM("#2fd36a");
    limbBands(model, "ForeArm", "Hand", 0.08, 0.42, g2, 0.008); limbBands(model, "Leg", "Foot", 0.16, 0.25, g2, 0.008);
    belt(model, 1.045, 1.1, glossM("#20b882"), 0.008);
    const bk = new THREE.Group(); const rimM = glossM("#3ddb4e"); const o = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.016, 6), rimM); o.rotation.x = Math.PI / 2; bk.add(o);
    const inn = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 6), glossM("#0c1119")); inn.rotation.x = Math.PI / 2; bk.add(inn);
    const sp = surfacePoint(model, 182, 298); attachAt(model, "Hips", bk, sp.p, new THREE.Vector3(0, 0, 1), 0.014);
  },
  mito(model) { // gold shoulder armour + the glowing orange mitochondrion emblem
    const gold = new THREE.MeshStandardMaterial({ color: "#c9952f", metalness: 1, roughness: 0.3 }), trim = new THREE.MeshStandardMaterial({ color: "#e9c060", metalness: 1, roughness: 0.22 });
    model.root.updateMatrixWorld(true);
    for (const s of ["Left", "Right"]) { const arm = model.b[s + "Arm"].getWorldPosition(new THREE.Vector3()); const sx = s === "Left" ? 1 : -1; const p = arm.clone().add(new THREE.Vector3(0.01 * sx, 0.05, 0)); const n = new THREE.Vector3(0.5 * sx, 1, 0).normalize(); const pad = pauldron(gold, trim); pad.scale.set(1.25, 1, 1.1); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); const bone = model.b[s + "Shoulder"]; const inv = bone.matrixWorld.clone().invert(); pad.position.copy(p.applyMatrix4(inv)); pad.quaternion.copy(bone.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q)); bone.add(pad); }
    const em = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), new THREE.MeshStandardMaterial({ color: "#e47a24", emissive: "#e4631a", emissiveIntensity: 0.9, roughness: 0.25 })); em.scale.set(0.8, 1.7, 0.35);
    const sp = model.b.Spine2.getWorldPosition(new THREE.Vector3()); let best = null; const pos = model.suit.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); if (Math.abs(v.x) < 0.012 && Math.abs(v.y - (sp.y + 0.0)) < 0.012 && (!best || v.z > best.z)) best = v.clone(); }
    if (best) attachAt(model, "Spine2", em, best, new THREE.Vector3(0, 0, 1), 0.006);
  },
  phage(model) { // six silver tail fibers arcing out from the belt
    const sil = new THREE.MeshStandardMaterial({ color: "#c2ccd0", metalness: 0.9, roughness: 0.25 }); model.root.updateMatrixWorld(true);
    const hp = model.b.Hips.getWorldPosition(new THREE.Vector3()); const inv = model.b.Hips.matrixWorld.clone().invert();
    for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const z = (i - 1) * 0.09, out = 0.42 + i * 0.07, drop = 0.5 + i * 0.16;
      const pts = [new THREE.Vector3(sx * 0.15, 0.1, z), new THREE.Vector3(sx * (0.15 + out * 0.7), 0.16, z * 1.6), new THREE.Vector3(sx * (0.15 + out), -drop * 0.5, z * 2), new THREE.Vector3(sx * (0.1 + out * 0.8), -drop, z * 2.2)].map((p) => p.add(hp).applyMatrix4(inv));
      const t = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.014, 8), sil); t.castShadow = true; model.b.Hips.add(t); }
  },
  ribosome(model) { // gold shoulder armour + belt buckle
    const gold = new THREE.MeshStandardMaterial({ color: "#d39a3c", metalness: 1, roughness: 0.28 });
    const trim = new THREE.MeshStandardMaterial({ color: "#f3c766", metalness: 1, roughness: 0.2 });
    model.root.updateMatrixWorld(true);
    for (const s of ["Left", "Right"]) {
      const arm = model.b[s + "Arm"].getWorldPosition(new THREE.Vector3()); const sx = s === "Left" ? 1 : -1;
      const p = arm.clone().add(new THREE.Vector3(-0.02 * sx, 0.055, 0.0)); const n = new THREE.Vector3(0.38 * sx, 1, 0).normalize();
      const pad = pauldron(gold, trim); const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
      const bone = model.b[s + "Shoulder"]; const inv = bone.matrixWorld.clone().invert(); pad.position.copy(p.applyMatrix4(inv)); pad.quaternion.copy(bone.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(q)); bone.add(pad);
    }
    const bk = new THREE.Group(); const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.016, 6), gold); plate.rotation.x = Math.PI / 2; plate.scale.set(1.4, 1, 0.8); bk.add(plate);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.02, 24), new THREE.MeshStandardMaterial({ color: "#151319", metalness: 0.4, roughness: 0.25 })); core.rotation.x = Math.PI / 2; core.scale.set(1.3, 1, 0.8); core.position.z = 0.002; bk.add(core);
    const sp = surfacePoint(model, 272, 232); attachAt(model, "Hips", bk, sp.p, new THREE.Vector3(0, 0, 1), 0.016);
    belt(model, 1.0, 1.06, glossM("#e9e8e4", { clearcoat: 0.3 }), 0.008);
    limbBands(model, "ForeArm", "Hand", 0.04, 0.26, gold, 0.007); limbBands(model, "Leg", "Foot", 0.42, 0.52, gold, 0.008);
  },
};
