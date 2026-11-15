/* decode a packed body mesh (see body/finalize.py) and bind it to a Mixamo skeleton */
function decodeBody(buf, meta) {
  const nv = meta.nv, nf = meta.nf; let o = 0;
  const q = new Uint16Array(buf, o, nv * 3); o += nv * 6;
  const nq = new Int8Array(buf, o, nv * 3); o += nv * 3;
  const si = new Uint8Array(buf, o, nv * 4); o += nv * 4;
  const sw = new Uint8Array(buf, o, nv * 4); o += nv * 4;
  const idx = meta.idx32 ? new Uint32Array(buf.slice(o, o + nf * 12)) : new Uint16Array(buf.slice(o, o + nf * 6));
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3), W = new Float32Array(nv * 4);
  for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++) { P[i * 3 + k] = meta.lo[k] + (q[i * 3 + k] / 65535) * (meta.hi[k] - meta.lo[k]); N[i * 3 + k] = nq[i * 3 + k] / 127; }
  for (let i = 0; i < nv * 4; i++) W[i] = sw[i] / 255;
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3));
  g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(Uint16Array.from(si), 4)); g.setAttribute("skinWeight", new THREE.BufferAttribute(W, 4));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}
function bindBody(rig, geo, mat) {
  const ref = rig.meshes[0];
  const m = new THREE.SkinnedMesh(geo, mat); m.name = "suit";
  ref.parent.add(m); m.position.copy(ref.position); m.quaternion.copy(ref.quaternion); m.scale.copy(ref.scale);
  m.bind(ref.skeleton, ref.bindMatrix.clone());
  rig.meshes.forEach((r) => (r.visible = false));
  m.frustumCulled = false; m.castShadow = true; m.receiveShadow = true;
  return m;
}
function decodeHelmet(buf, meta) {
  const nv = meta.nv, nf = meta.nf; let o = 0;
  const q = new Uint16Array(buf, o, nv * 3); o += nv * 6; const nq = new Int8Array(buf, o, nv * 3); o += nv * 3; o += (4 - (o % 4)) % 4 ? 0 : 0;
  const uq = new Uint16Array(buf.slice(o, o + nv * 12)); o += nv * 12; const idx = new Uint16Array(buf.slice(o, o + nf * 6));
  const P = new Float32Array(nv * 3), N = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) for (let k = 0; k < 3; k++) { P[i * 3 + k] = meta.lo[k] + (q[i * 3 + k] / 65535) * (meta.hi[k] - meta.lo[k]); N[i * 3 + k] = nq[i * 3 + k] / 127; }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(P, 3)); g.setAttribute("normal", new THREE.BufferAttribute(N, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.userData.px = uq; return g;
}
/* helmet: rigid, parented to the Head bone; texture coords come pre-baked in sheet pixels */
function attachHelmet(rig, geo, mat, L) {
  const crop = L.crop, W = crop[2] - crop[0], H = crop[3] - crop[1], nv = geo.attributes.position.count, px = geo.userData.px;
  const mk = (o) => { const a = new Float32Array(nv * 2); for (let i = 0; i < nv; i++) { a[i * 2] = (px[i * 6 + o] / 4 - crop[0]) / W; a[i * 2 + 1] = 1 - (px[i * 6 + o + 1] / 4 - crop[1]) / H; } return new THREE.BufferAttribute(a, 2); };
  geo.setAttribute("uvF", mk(0)); geo.setAttribute("uvS", mk(2)); geo.setAttribute("uvB", mk(4));
  const nor = geo.attributes.normal, wts = new Float32Array(nv * 3);
  for (let i = 0; i < nv; i++) { const nx = nor.getX(i), nz = nor.getZ(i); const wf = Math.pow(Math.max(nz, 0), 3), wb = Math.pow(Math.max(-nz, 0), 3) * 0.7, ws = Math.pow(Math.abs(nx), 3) * 1.2 + 1e-4; const s = wf + wb + ws; wts[i * 3] = wf / s; wts[i * 3 + 1] = wb / s; wts[i * 3 + 2] = ws / s; }
  geo.setAttribute("wts", new THREE.BufferAttribute(wts, 3));
  // bind-pose world -> head local (rig must be at rest pose here)
  rig.root.updateMatrixWorld(true); const inv = rig.b.Head.matrixWorld.clone().invert(); geo.applyMatrix4(inv);
  const m = new THREE.Mesh(geo, mat); m.name = "helmet"; m.castShadow = true; rig.b.Head.add(m); return m;
}
