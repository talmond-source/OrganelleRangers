/* ================= Megaforms for the rest of the roster =================
   Each one is the real structure of its organelle or molecule, built in the same packed-sphere
   molecular style, and driven by one shared cinematic with four attack modes. */
const mm = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.45, envMapIntensity: 0.5 }, o));
function megaCine(game, att, def, o) {
  const c = cineBase(game, att, def, 5.8); const F = att.face, X = att.x, hitT = 4.3;
  const m = o.build(); c.root.add(m); const S = o.scale || 1;
  const home = V3(X - F * 0.4, o.y ?? 2.6, -1.8), tgt = V3(def.x, o.ty ?? 1.3, 0); const shots = [];
  c.step = function (dt) {
    this.t += dt; const t = this.t;
    att.cineAnim = t < 1.2 ? AN("cast", t * 30, { fade: 0.15 }) : AN("magic2", Math.min(45, 25 + (t - 1.2) * 20), { fade: 0.2 });
    def.cineAnim = t < hitT - 1.3 ? AN("idle", t * 30, { loop: true }) : AN("hitHigh", 2 + ((t * 30) % 16), { tag: Math.floor(t / 0.5) });
    if (this.once("ban", 0.15)) { FX2D.banner(o.name.toUpperCase() + "!", att.info.hex, "MEGAFORM · " + att.info.name, F); HUD.science(att, o.name); game.parts.boom(V3(X, 0, -0.5), att.info.hex, 1.2); game.sfx("boom"); }
    const rise = ss(t, 0.8, 1.9), out = ss(t, 5.1, 5.8), u = clamp((t - 2.1) / (hitT - 2.1));
    m.visible = t > 0.75; const pos = home.clone();
    if (o.mode === "ram") { pos.lerp(tgt, smooth(u) * smooth(u)); m.rotation.y += dt * (o.spin || 0) * (1 + u * 8); }
    else if (o.mode === "slam") { const up = V3(tgt.x, 5.2, 0); if (u < 0.65) pos.lerp(up, smooth(u / 0.65)); else pos.copy(up).lerp(tgt, Math.pow((u - 0.65) / 0.35, 2)); }
    else if (o.mode === "engulf") { pos.lerp(tgt, smooth(Math.min(1, u / 0.45))); if (u > 0.45 && t < hitT) { def.rig.visible = !!o.seeThrough; pos.x += Math.sin(t * 34) * 0.07; pos.y += Math.cos(t * 27) * 0.06; if (o.seeThrough) { def.x = tgt.x + Math.sin(t * 13) * 0.9; def.y = 0.9 + Math.abs(Math.sin(t * 17)) * 1.1; } if (Math.floor(t / 0.16) !== this._e) { this._e = Math.floor(t / 0.16); game.sfx("hit"); game.view.shake = Math.max(game.view.shake, 0.15); } } }
    else if (o.mode === "shoot") { m.rotation.y += dt * (o.spin || 0);
      if (u > 0.05 && u < 0.92 && Math.floor(t / 0.15) !== this._s) { this._s = Math.floor(t / 0.15); const b = o.shot(); const from = m.position.clone().add(V3(F * 1.2 * S, (Math.random() - 0.5) * S, 0)); b.position.copy(from); c.root.add(b); shots.push({ b, v: V3(def.x - from.x, 1.1 + Math.random() * 0.6 - from.y, 0).normalize().multiplyScalar(20) }); game.sfx("shoot"); } }
    for (const s of shots) { if (s.dead) continue; s.b.position.addScaledVector(s.v, dt); s.b.rotation.z += dt * 8; if (Math.abs(s.b.position.x - def.x) < 0.45) { s.dead = true; c.root.remove(s.b); game.parts.hit(V3(def.x, s.b.position.y, 0.3), att.info.hex, 0.9); game.sfx("hit"); def.flash = 0.06; game.view.shake = Math.max(game.view.shake, 0.14); } }
    if (o.assemble) { pos.y += 10 * out; m.position.copy(pos); m.scale.setScalar(S); } else { pos.y -= 8 * (1 - rise); pos.y += 10 * out; m.position.copy(pos); m.scale.setScalar(S * (0.25 + 0.75 * rise)); }
    if (o.anim) o.anim(m, t, dt, u);
    if (this.once("hit", hitT)) { def.rig.visible = true; def.x = tgt.x; def.y = 0; impactAt(game, V3(def.x, 1.2, 0)); game.parts.boom(V3(def.x, 0, 0), att.info.hex, 1.6); game.parts.hit(V3(def.x, 1.2, 0.3), att.info.hex, 2.4); game.sfx("heavy"); }
    const k = [{ t: 0, p: [1.0, 1.55, 2.6], l: [0, 1.4, 0], fov: 30 }, { t: 0.9, p: [1.4, 1.5, 3.6], l: [0, 1.4, 0], fov: 30 }, { t: 2.0, p: [1.2, 0.9, 9.5], l: [1.4, 2.4, -0.8], fov: 40 }, { t: 3.2, p: [2.6, 1.5, 9], l: [2.8, 1.7, 0], fov: 36 }, { t: 4.3, p: [3.4, 1.4, 6.5], l: [4.1, 1.3, 0], fov: 32 }, { t: 5.8, p: [2.1, 1.5, 10.5], l: [2.1, 1.05, 0], fov: 30 }];
    const ck = camAt(k, t); this.cam = { p: V3(X + ck.p.x * F, ck.p.y, ck.p.z), l: V3(X + ck.l.x * F, ck.l.y, ck.l.z), fov: ck.fov };
    return t >= this.dur;
  };
  const disp = c.dispose; c.dispose = () => { def.rig.visible = true; def.y = 0; disp(); };
  return c;
}
const inSphere = (sx, sy, sz, ox = 0, oy = 0, oz = 0) => (p) => { if (p.length() > 1) return false; p.set(p.x * sx + ox, p.y * sy + oy, p.z * sz + oz); return true; };
const shellOnly = (sx, sy, sz, th = 0.82) => (p) => { const d = p.length(); if (d > 1 || d < th) return false; p.set(p.x * sx, p.y * sy, p.z * sz); return true; };
function tube(pts, r, col, o) { return new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 6, r, 8), mm(col, o)); }
function helixPts(n, R, pitch, ph, turns) { const a = []; for (let i = 0; i <= n; i++) { const t = (i / n) * turns * TAU; a.push(V3(Math.cos(t + ph) * R, (i / n - 0.5) * pitch, Math.sin(t + ph) * R)); } return a; }

const MEGA = {
  rougher: { name: "Rough ER", mode: "shoot", y: 2.7, scale: 1.1, shot: () => vesicle("#e47a21", 0.3),
    build() { const g = new THREE.Group(); for (let i = 0; i < 6; i++) { const sac = globCluster(LQ(190, 90), (p) => { if (Math.abs(p.x) > 1 || Math.abs(p.z) > 1 || p.x * p.x + p.z * p.z > 1) return false; p.set(p.x * (2.0 - i * 0.12), 0.55 * i - 1.4 + Math.sin(p.x * 3 + i) * 0.1 + p.y * 0.08, p.z * 1.0); return true; }, [0.13, 0.19], ["#e58a3a", "#d2702a", "#f0a050"], 50 + i); g.add(sac);
        const rb = globCluster(LQ(70, 30), (p) => { if (p.x * p.x + p.z * p.z > 1) return false; p.set(p.x * (2.0 - i * 0.12), 0.55 * i - 1.4 + Math.sin(p.x * 3 + i) * 0.1 + (p.y > 0 ? 0.2 : -0.2), p.z * 1.0); return true; }, [0.07, 0.09], ["#7f6fe0", "#9b8cf2"], 70 + i); g.add(rb); } return g; } },
  golgi: { name: "Golgi Apparatus", mode: "shoot", y: 2.7, scale: 1.05, shot: () => vesicle("#16b8c3", 0.28),
    build() { const g = new THREE.Group(); for (let i = 0; i < 6; i++) { const w = 2.1 - Math.abs(i - 2.5) * 0.28; g.add(globCluster(LQ(170, 80), (p) => { if (p.x * p.x + p.z * p.z > 1) return false; const x = p.x * w; p.set(x, i * 0.5 - 1.25 + x * x * 0.16 + p.y * 0.07, p.z * 0.9); return true; }, [0.12, 0.18], i < 3 ? ["#f0c23a", "#e4b51d"] : ["#f2a23a", "#e88f22"], 80 + i)); }
      for (let i = 0; i < 7; i++) { const v = vesicle(i % 2 ? "#16b8c3" : "#e84a8f", 0.2); v.position.set(2.4 + (i % 3) * 0.4, -1 + i * 0.4, (i % 2) * 0.5 - 0.2); g.add(v); } return g; } },
  cytoplasm: { name: "Cytoplasm Colossus", mode: "slam", y: 2.4, scale: 1.0,
    build() { const g = new THREE.Group(); const jel = new THREE.MeshPhysicalMaterial({ color: "#2f7fe0", transparent: true, opacity: 0.5, roughness: 0.08, clearcoat: 1, depthWrite: false });
      [[0, 0, 0, 1.5, 1.8, 1.2], [0, 2.1, 0, 0.8, 0.8, 0.8], [-1.6, 0.6, 0, 0.6, 1.2, 0.6], [1.6, 0.6, 0, 0.6, 1.2, 0.6], [-0.6, -2.1, 0, 0.6, 1.0, 0.6], [0.6, -2.1, 0, 0.6, 1.0, 0.6]].forEach(([x, y, z, a, b, c2], i) => { const s = new THREE.Mesh(smoothBlob(1, 90 + i, 0.1, [a, b, c2], 28, 20), jel); s.position.set(x, y, z); g.add(s); });
      g.add(globCluster(40, inSphere(0.5, 0.5, 0.5, 0, 0.3, 0), [0.08, 0.12], ["#6a3fc9", "#8a5cff"], 91)); for (let i = 0; i < 5; i++) { const mi = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.34, 6, 12), mm("#f08a4b")); mi.position.set(Math.sin(i * 2.2) * 0.9, -1 + i * 0.5, 0.3); mi.rotation.z = i; g.add(mi); }
      g.add(globCluster(60, inSphere(1.2, 1.5, 0.9), [0.03, 0.05], ["#c9a3ff"], 92)); return g; },
    anim(m, t) { m.children.forEach((s, i) => { if (i < 6) s.scale.setScalar(1 + Math.sin(t * 6 + i) * 0.05); }); } },
  membrane: { name: "Fluid Mosaic Membrane", mode: "engulf", y: 2.4, scale: 1.0,
    build() { const g = new THREE.Group(); const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 8, 6), mm("#f08ab4"), LQ(1300, 560)); let k = 0; const st = LQ(0.2, 0.3);
      for (const r of [1.55, 1.95]) for (let a = 0; a < Math.PI; a += st / r) for (let b = 0; b < TAU; b += st / (r * Math.max(0.2, Math.sin(a)))) { if (k >= heads.count) break; heads.setMatrixAt(k++, mat4(V3(r * Math.sin(a) * Math.cos(b), r * Math.cos(a), r * Math.sin(a) * Math.sin(b)))); }
      heads.count = k; g.add(heads); g.add(new THREE.Mesh(new THREE.SphereGeometry(1.75, 32, 20), new THREE.MeshStandardMaterial({ color: "#f6dc7a", transparent: true, opacity: 0.35, depthWrite: false })));
      for (let i = 0; i < 7; i++) { const a = i * 0.9, b = i * 2.1; const pr = globCluster(24, inSphere(0.2, 0.45, 0.2), [0.07, 0.1], i % 2 ? ["#6fb7e8", "#4f97d0"] : ["#9b8cf2", "#7f6fe0"], 100 + i); const d = V3(Math.sin(a) * Math.cos(b), Math.cos(a), Math.sin(a) * Math.sin(b)); pr.position.copy(d.clone().multiplyScalar(1.75)); pr.quaternion.setFromUnitVectors(V3(0, 1, 0), d); g.add(pr); } return g; },
    anim(m, t, dt) { m.rotation.y += dt * 0.8; } },
  mito: { name: "Mitochondrion Pinball", mode: "engulf", seeThrough: true, y: 2.4, ty: 1.6, scale: 1.0,
    build() { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 2.6, 12, 32), new THREE.MeshPhysicalMaterial({ color: "#f08a4b", transparent: true, opacity: 0.28, roughness: 0.15, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false })).rotateZ(Math.PI / 2));
      for (let i = 0; i < 9; i++) { const x = -2.2 + i * 0.55, up = i % 2 ? 1 : -1; const cr = globCluster(LQ(60, 30), (p) => { p.set(x + p.x * 0.09, up * (1.35 - (p.y + 1) * 0.5), p.z * 0.9); return true; }, [0.09, 0.12], ["#e0703a", "#f2a060", "#c85a28"], 110 + i); g.add(cr); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 30), mm("#7fe8ff", { emissive: "#3fb0d0", emissiveIntensity: 0.8 })); ring.position.set(-1.6, 0, 0.6); g.add(ring); return g; } },
  nucleus: { name: "Razor Nucleus", mode: "ram", spin: 3, y: 2.6, scale: 0.95,
    build() { const g = new THREE.Group(); g.add(globCluster(LQ(520, 240), shellOnly(1.7, 1.7, 1.7, 0.88), [0.14, 0.2], ["#54258a", "#6a3fc9", "#7a4fd8"], 120));
      g.add(new THREE.Mesh(new THREE.SphereGeometry(1.5, 24, 16), mm("#32164f"))); const sp = mm("#ffd36b", { emissive: "#ffb020", emissiveIntensity: 0.5, metalness: 0.4, roughness: 0.3 });
      for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; const pore = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 8, 16), mm("#e3d5ff")); const d = V3(Math.cos(a), Math.sin(i * 2.4) * 0.35, Math.sin(a)).normalize(); pore.position.copy(d.clone().multiplyScalar(1.72)); pore.quaternion.setFromUnitVectors(V3(0, 0, 1), d); g.add(pore);
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 1.5, 10), sp); spike.position.copy(d.clone().multiplyScalar(2.4)); spike.quaternion.setFromUnitVectors(V3(0, 1, 0), d); spike.userData.d = d; g.add(spike); } return g; },
    anim(m, t) { const e = ss(t, 1.9, 2.5); m.children.forEach((s) => { if (s.userData.d) { s.position.copy(s.userData.d.clone().multiplyScalar(1.3 + 1.1 * e)); } }); } },
  smoother: { name: "Smooth ER", mode: "engulf", y: 2.5, scale: 1.0,
    build() { const g = new THREE.Group(); const r = mulberry(7); for (let i = 0; i < 14; i++) { const pts = []; let p = V3((r() - 0.5) * 3, (r() - 0.5) * 3, (r() - 0.5) * 1.6); for (let k = 0; k < 6; k++) { pts.push(p.clone()); p = p.clone().add(V3((r() - 0.5) * 1.8, (r() - 0.5) * 1.8, (r() - 0.5) * 1.0)); p.clampLength(0, 2.2); } g.add(tube(pts, 0.14, i % 3 ? "#0a9a9e" : "#087f83", { roughness: 0.25 })); }
      for (let i = 0; i < 14; i++) { const s = glowSprite("#ffffff", 0.5); s.position.set((r() - 0.5) * 3.6, (r() - 0.5) * 3.6, (r() - 0.5) * 1.4); s.userData.ca = 1; g.add(s); } return g; },
    anim(m, t, dt, u) { m.rotation.z += dt * 0.6; m.children.forEach((s, i) => { if (s.userData.ca) s.material.opacity = u > 0.5 ? 0.4 + 0.6 * Math.abs(Math.sin(t * 22 + i)) : 0.1; }); } },
  lysosome: { name: "Lysosome", mode: "engulf", y: 2.5, scale: 1.0,
    build() { const g = new THREE.Group(); g.add(globCluster(LQ(480, 220), shellOnly(1.75, 1.75, 1.75, 0.9), [0.13, 0.19], ["#741a35", "#8f2a48", "#5c1028"], 130)); g.add(new THREE.Mesh(new THREE.SphereGeometry(1.55, 24, 16), mm("#9bd13a", { emissive: "#5a8a10", emissiveIntensity: 0.7, transparent: true, opacity: 0.85 })));
      for (let i = 0; i < 9; i++) { const d = V3(Math.cos(i * 2.4), Math.sin(i * 1.3) * 0.8, Math.sin(i * 2.4)).normalize(); const pump = globCluster(18, inSphere(0.16, 0.3, 0.16), [0.06, 0.09], ["#b8bec3", "#dfe4e8"], 140 + i); pump.position.copy(d.clone().multiplyScalar(1.8)); pump.quaternion.setFromUnitVectors(V3(0, 1, 0), d); g.add(pump); } return g; },
    anim(m, t, dt) { m.rotation.y += dt * 0.7; } },
  dna: { name: "Double Helix", mode: "slam", y: 2.6, scale: 0.95,
    build() { const g = new THREE.Group(); const N = 60, R = 0.75, H = 5.2, turns = 2.6; for (const ph of [0, Math.PI * 0.85]) g.add(tube(helixPts(N, R, H, ph, turns), 0.13, ph ? "#3969b2" : "#c59a39", { metalness: 0.3, roughness: 0.3 }));
      const cols = { A: "#e8505b", T: "#f2c23a", G: "#3fbf7f", C: "#5ab0f0" }, seq = "ATGCGTACCGATTAGCAGTCAGGCTA";
      for (let i = 0; i < 26; i++) { const f = (i + 0.5) / 26, a = f * turns * TAU, y = (f - 0.5) * H; const p1 = V3(Math.cos(a) * R, y, Math.sin(a) * R), p2 = V3(Math.cos(a + Math.PI * 0.85) * R, y, Math.sin(a + Math.PI * 0.85) * R), mid = p1.clone().lerp(p2, 0.5); const b = seq[i], pr = { A: "T", T: "A", G: "C", C: "G" }[b];
        for (const [pa, pb, col] of [[p1, mid, cols[b]], [mid, p2, cols[pr]]]) { const d = pb.clone().sub(pa), l = d.length(); const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, l, 8), mm(col)); rung.position.copy(pa).addScaledVector(d, 0.5); rung.quaternion.setFromUnitVectors(V3(0, 1, 0), d.normalize()); g.add(rung); } } return g; },
    anim(m, t, dt, u) { m.rotation.y += dt * (2 + u * 14); m.rotation.z = u > 0.65 ? 0 : 0.5; } },
  rna: { name: "Folded tRNA", mode: "shoot", y: 2.9, scale: 1.0, shot: () => { const b = aminoBead(Math.floor(Math.random() * 8), 0.3); return b; },
    build() { const g = new THREE.Group(); const arm = (pts, col) => { for (const ph of [0, Math.PI]) { const hp = []; for (let i = 0; i <= 30; i++) { const f = i / 30; const c = new THREE.CatmullRomCurve3(pts).getPoint(f); hp.push(c.add(V3(Math.cos(f * 14 + ph) * 0.16, 0, Math.sin(f * 14 + ph) * 0.16))); } g.add(tube(hp, 0.07, col, { roughness: 0.3 })); } };
      arm([V3(1.9, 1.6, 0), V3(0.6, 1.6, 0), V3(-0.3, 1.4, 0)], "#7139c8"); arm([V3(-0.3, 1.4, 0), V3(-0.5, 0, 0), V3(-0.4, -1.7, 0)], "#9c5cf0");
      const anti = globCluster(22, inSphere(0.3, 0.2, 0.25, -0.4, -1.9, 0), [0.07, 0.1], ["#ff5a5a", "#ffd84a", "#5ad1ff"], 150); g.add(anti); const aa = aminoBead(2, 0.3); aa.position.set(2.2, 1.6, 0); g.add(aa); return g; } },
  mitosis: { name: "Multicellular Mech", mode: "slam", assemble: true, y: 2.6, scale: 1.0,
    build() { const g = new THREE.Group(); const parts = [[0, 0.3, 0.9, 1.3, 0.6], [0, 2.0, 0.45, 0.45, 0.45], [-1.3, 0.6, 0.35, 1.0, 0.35], [1.3, 0.6, 0.35, 1.0, 0.35], [-0.5, -1.9, 0.4, 1.1, 0.4], [0.5, -1.9, 0.4, 1.1, 0.4]];
      // each "cell" is a tiny copy of the ranger: body capsule + helmet
      const geo = THREE.BufferGeometryUtils.mergeBufferGeometries([new THREE.CapsuleGeometry(0.05, 0.13, 3, 8), new THREE.SphereGeometry(0.058, 8, 6).translate(0, 0.15, 0)]);
      const N = LQ(900, 380), body = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.75, roughness: 0.25 }), N); const r = mulberry(5); const col = new THREE.Color(); const T = [], S0 = [], D = []; let k = 0;
      while (k < N) { const [x, y, a, b, c2] = parts[(r() * parts.length) | 0]; const p = V3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1); if (p.length() > 1) continue; const t = V3(x + p.x * a, y + p.y * b, p.z * c2); T.push(t, new THREE.Euler(r() * 0.5, r() * 6, r() * 0.5)); const a2 = r() * TAU, rad = 5 + r() * 6; S0.push(V3(Math.cos(a2) * rad, -3 + r() * 9, Math.sin(a2) * rad * 0.6 + 2)); D.push((t.y + 3.2) / 6 * 0.6 + r() * 0.15);
        col.set(["#c5cbd1", "#e8e8e8", "#d21a9a", "#16c94a", "#c5cbd1"][(r() * 5) | 0]); body.setColorAt(k, col); k++; }
      g.add(body); g.userData = { body, T, S0, D, N }; return g; },
    // feet first, the copies fly in and stack upward into the mech; then it stays locked together
    anim(m, t) { const { body, T, S0, D, N } = m.userData; const a = clamp((t - 0.9) / 2.0); if (m.userData.done && a >= 1) return; const p = V3(), e = new THREE.Euler(), q = new THREE.Quaternion();
      for (let i = 0; i < N; i++) { const u = smooth(clamp((a - D[i] * 0.75) / 0.25)); p.copy(S0[i]).lerp(T[i * 2], u); const tr = T[i * 2 + 1]; e.set(tr.x + (1 - u) * 6, tr.y + (1 - u) * 9, tr.z); body.setMatrixAt(i, mat4(p, q.setFromEuler(e))); }
      body.instanceMatrix.needsUpdate = true; m.userData.done = a >= 1; } },
  crispr: { name: "Cas9", mode: "ram", y: 2.6, scale: 1.0,
    build() { const g = new THREE.Group(); g.add(globCluster(LQ(260, 120), inSphere(1.2, 1.0, 0.9, -0.5, 0.75, 0), [0.14, 0.2], ["#13c9c6", "#2b6ee8", "#3fd8d0"], 160)); g.add(globCluster(LQ(220, 100), inSphere(1.1, 0.85, 0.9, 0.4, -0.75, 0), [0.14, 0.2], ["#7949d6", "#e544b8", "#9a6cf0"], 161));
      for (const ph of [0, Math.PI * 0.85]) g.add(tube(helixPts(40, 0.28, 5.4, ph, 2.4).map((p) => V3(p.y, p.x * 0.6, p.z + 0.2)), 0.07, ph ? "#3969b2" : "#c59a39"));
      g.add(tube([V3(-1.6, 0.9, 0.5), V3(-0.6, 0.3, 0.6), V3(0.2, 0.1, 0.6), V3(1.0, 0.5, 0.5), V3(1.7, 1.2, 0.4)], 0.06, "#ffd84a", { emissive: "#c08a00", emissiveIntensity: 0.6 })); return g; },
    anim(m, t) { m.rotation.z = Math.sin(t * 2) * 0.15; } },
};
MEGA.phage = { name: "T4 Bacteriophage", mode: "slam", y: 3.0, ty: 2.3, scale: 0.9,
  build() { const g = new THREE.Group(); const mint = mm("#b9e4d6", { roughness: 0.35, flatShading: true }), rust = mm("#a64b2a", { roughness: 0.7 }), sil = mm("#aebbc0", { metalness: 0.8, roughness: 0.3 });
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 0), mint); head.scale.y = 1.25; head.position.y = 2.3; g.add(head);
    g.add(globCluster(LQ(160, 80), shellOnly(1.12, 1.4, 1.12, 0.93), [0.07, 0.1], ["#b9e4d6", "#9fd4c4", "#d0f0e6"], 170).translateY(2.3));
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.14, 12), sil); collar.position.y = 0.85; g.add(collar);
    for (let i = 0; i < 12; i++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.085, 8, 18), rust); ring.rotation.x = Math.PI / 2; ring.position.y = 0.7 - i * 0.16; g.add(ring); }
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.16, 6), sil); plate.position.y = -1.3; g.add(plate);
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.7, 8), mm("#b5d737", { emissive: "#7a9a10", emissiveIntensity: 0.8 })); spike.rotation.x = Math.PI; spike.position.y = -1.7; g.add(spike);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU, cx = Math.cos(a), sz = Math.sin(a); g.add(tube([V3(cx * 0.45, -1.3, sz * 0.45), V3(cx * 1.5, -0.5, sz * 1.5), V3(cx * 2.1, -2.2, sz * 2.1)], 0.045, "#aebbc0", { metalness: 0.8, roughness: 0.3 })); }
    return g; },
  anim(m, t, dt, u) { m.rotation.y += dt * 0.9; } };
for (const id in MEGA) ULTS[id] = (game, att, def) => megaCine(game, att, def, MEGA[id]);
