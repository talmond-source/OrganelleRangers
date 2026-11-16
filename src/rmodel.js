/* ================= Sculpted ranger models (Meshy, rigged to a Mixamo skeleton) =================
   Each ranger with a sculpted model ships as models/<id>.rmdl: a skinned mesh, its skeleton in bind
   pose, PBR textures (color, normal, roughness/metal) and per-bone retarget quaternions so the game's
   existing mocap clips drive it:  L_target = inv(D_parent) * L_source * D_self.
   Rangers without a sculpted model fall back to the projected-sheet body. */
const RMODEL = (() => {
  const VER = 10; // bump when a model file changes so cached copies refresh
  const LIST = ["atp", "ribosome", "rougher", "golgi", "cytoplasm", "membrane", "mito", "nucleus", "smoother", "lysosome", "dna", "rna", "mitosis", "crispr", "phage"]; // rangers that have a sculpted model on disk
  async function fetchModel(id) {
    const r = await fetch("models/" + id + ".rmdl?v=" + VER); if (!r.ok) throw new Error(id + " " + r.status);
    const buf = await r.arrayBuffer(); const dv = new DataView(buf);
    if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== "RMDL") throw new Error("bad model " + id);
    const hl = dv.getUint32(4, true); const H = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl))); const base = 8 + hl;
    const view = (k, T, n) => { const [o, len] = H.views[k]; return new T(buf, base + o, n ?? len / T.BYTES_PER_ELEMENT); };
    const N = H.count, q = view("pos", Uint16Array, N * 3), P = new Float32Array(N * 3);
    for (let i = 0; i < N * 3; i++) { const a = i % 3; P[i] = H.lo[a] + (q[i] / 65535) * (H.hi[a] - H.lo[a]); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(P, 3));
    geo.setAttribute("normal", new THREE.BufferAttribute(view("nrm", Int8Array, N * 3), 3, true));
    geo.setAttribute("uv", new THREE.BufferAttribute(view("uv", Uint16Array, N * 2), 2, true));
    geo.setAttribute("skinIndex", new THREE.BufferAttribute(view("jnt", Uint8Array, N * 4), 4));
    geo.setAttribute("skinWeight", new THREE.BufferAttribute(view("wt", Uint8Array, N * 4), 4, true));
    geo.setIndex(new THREE.BufferAttribute(H.i32 ? view("idx", Uint32Array, H.icount) : view("idx", Uint16Array, H.icount), 1));
    geo.computeBoundingSphere();
    const tex = async (k, srgb) => {
      if (!H.views["tex_" + k]) return null; const [o, len] = H.views["tex_" + k];
      const blob = new Blob([new Uint8Array(buf, base + o, len)], { type: "image/jpeg" });
      const img = await new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = URL.createObjectURL(blob); });
      const t = new THREE.Texture(img); t.flipY = false; t.encoding = srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
      t.anisotropy = LITE ? 2 : 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; return t;
    };
    const [map, normal, mr] = await Promise.all([tex("map", true), tex("normal", false), tex("mr", false)]);
    return { H, geo, map, normal, mr };
  }
  async function loadAll(into) {
    await Promise.all(LIST.map(async (id) => {
      if (!into[id]) return;
      try { into[id].sculpt = await fetchModel(id); } catch (e) { console.warn("sculpted model unavailable:", id, e.message); }
    }));
  }
  function material(S) {
    const m = LITE ? new THREE.MeshPhongMaterial({ map: S.map, normalMap: S.normal, shininess: 60, specular: new THREE.Color(0x404040) })
      : new THREE.MeshStandardMaterial({ map: S.map, normalMap: S.normal, roughnessMap: S.mr, metalnessMap: S.mr, metalness: 1, roughness: 1, envMapIntensity: 1.15 });
    if (S.normal) m.normalScale.set(1, -1); // glTF tangent space (flipY = false)
    const flash = { value: 0 }; m.userData.flash = flash;
    m.onBeforeCompile = (sh) => {
      sh.uniforms.flash = flash;
      sh.fragmentShader = "uniform float flash;\n" + sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3(1.0, 0.96, 0.9) * flash * 0.3;");
    };
    return m;
  }
  /* build a model object shaped like R3D.build's, so the fight code can't tell the difference */
  function build(id, S, clipBones) {
    const H = S.H, n = H.bones.length, root = new THREE.Group(), body = new THREE.Group(); root.add(body);
    const bones = [], W = [];
    for (let i = 0; i < n; i++) { const b = new THREE.Bone(); b.name = H.bones[i]; bones.push(b); W.push({ p: new THREE.Vector3().fromArray(H.bpos, i * 3), q: new THREE.Quaternion().fromArray(H.bquat, i * 4).normalize() }); }
    for (let i = 0; i < n; i++) {
      const pi = H.parents[i], b = bones[i];
      if (pi < 0) { b.position.copy(W[i].p); b.quaternion.copy(W[i].q); body.add(b); }
      else { const pq = W[pi].q.clone().invert(); b.position.copy(W[i].p).sub(W[pi].p).applyQuaternion(pq); b.quaternion.copy(pq.multiply(W[i].q)); bones[pi].add(b); }
    }
    const b = {}; bones.forEach((x) => (b[x.name] = x));
    root.updateMatrixWorld(true);
    const mat = material(S);
    const suit = new THREE.SkinnedMesh(S.geo, mat); suit.name = "suit"; suit.frustumCulled = false; suit.castShadow = true; suit.receiveShadow = true;
    body.add(suit); root.updateMatrixWorld(true); suit.bind(new THREE.Skeleton(bones));
    // retarget tables, indexed like the clip bones
    const D = clipBones.map((nm, j) => new THREE.Quaternion().fromArray(H.D, H.clipBones.indexOf(nm) * 4));
    const Dp = clipBones.map((nm) => { const bn = b[nm]; const p = bn && bn.parent && bn.parent.isBone ? clipBones.indexOf(bn.parent.name) : -1; return p >= 0 ? D[p].clone().invert() : new THREE.Quaternion(); });
    const hipOff = new THREE.Vector3().fromArray(H.hipOff);
    // Keep the chest, collar and helmet upright in Ribosome's neutral guard.
    const guardCorrection = id === "ribosome"
      ? Object.entries({ Spine: .87, Spine1: .84, Spine2: .67, Neck: .75, Head: .85, LeftArm: .22, RightArm: .22 })
        .map(([name, amount]) => ({ index: clipBones.indexOf(name), rest: b[name].quaternion.clone(), amount }))
        .filter(({ index }) => index >= 0)
      : null;
    return { guardCorrection, root, body, b, suit, helmet: null, mat, skeleton: suit.skeleton, extras: {}, L: null, sculpted: true, retarget: { D, Dp, hipOff } };
  }
  return { LIST, loadAll, build };
})();
