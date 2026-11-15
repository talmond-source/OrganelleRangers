/* ================= Effects: hit sparks, smoke, projectiles' looks, 2D overlay (impact lines, banners) ================= */
const FXT = {};
function starTex() {
  return FXT.star || (FXT.star = (() => { const t = canvasTex(128, 128, (x, w, h) => { x.translate(w / 2, h / 2); const g = x.createRadialGradient(0, 0, 0, 0, 0, 60); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.25, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g;
    x.beginPath(); for (let i = 0; i < 16; i++) { const r = i % 2 ? 14 : 62, a = (i / 16) * TAU; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); x.fill(); }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; })());
}
function puffTex() {
  return FXT.puff || (FXT.puff = (() => { const t = canvasTex(128, 128, (x, w, h) => { const r = mulberry(5); for (let i = 0; i < 9; i++) { const cx = 64 + (r() - 0.5) * 50, cy = 64 + (r() - 0.5) * 50, rr = 20 + r() * 26; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, "rgba(255,255,255,.95)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rr, 0, TAU); x.fill(); } }); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; })());
}
function ringTex() { return FXT.ring || (FXT.ring = canvasTex(128, 128, (x, w, h) => { const g = x.createRadialGradient(64, 64, 40, 64, 64, 62); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.7, "rgba(255,255,255,1)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); })); }
function streakTex() { return FXT.streak || (FXT.streak = canvasTex(128, 16, (x, w, h) => { const g = x.createLinearGradient(0, 0, w, 0); g.addColorStop(0, "rgba(255,255,255,0)"); g.addColorStop(0.75, "rgba(255,255,255,.9)"); g.addColorStop(1, "rgba(255,255,255,1)"); x.fillStyle = g; x.beginPath(); x.moveTo(0, h / 2); x.lineTo(w * 0.8, 1); x.lineTo(w, h / 2); x.lineTo(w * 0.8, h - 1); x.closePath(); x.fill(); })); }
function coreTex() { return FXT.core || (FXT.core = canvasTex(64, 64, (x, w, h) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 31); g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.3, "rgba(255,255,255,.8)"); g.addColorStop(1, "rgba(255,255,255,0)"); x.fillStyle = g; x.fillRect(0, 0, w, h); })); }
const _streakGeo = new THREE.PlaneGeometry(1, 1).translate(-0.5, 0, 0);
class Particles {
  constructor(scene) { this.scene = scene; this.list = []; }
  sprite(tex, color, size, additive = true) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })); s.scale.setScalar(size); this.scene.add(s); return s; }
  add(p) { this.list.push(p); return p; }
  ring(pos, color, size = 0.3, grow = 10, life = 0.25) { const c = new THREE.Color(color).multiplyScalar(2); const r = this.sprite(ringTex(), c, size); r.position.copy(pos); return this.add({ s: r, life, t: 0, grow }); }
  /* sparks pulled inward toward a point: a charge-up */
  gather(pos, color, r = 1.1) { const a = Math.random() * TAU, from = V3(pos.x + Math.cos(a) * r, pos.y + Math.sin(a) * r, pos.z + 0.2); const sp = this.sprite(coreTex(), new THREE.Color(color).multiplyScalar(2), 0.09); sp.position.copy(from); return this.add({ s: sp, life: 0.22, t: 0, vel: V3(-Math.cos(a) * r / 0.22, -Math.sin(a) * r / 0.22, 0) }); }
  /* fan of streaks in a direction: a swing or muzzle flash */
  fan(pos, color, dir, n = 7, speed = 9, spread = 0.9) { const c = new THREE.Color(color).multiplyScalar(2.2); for (let i = 0; i < n; i++) { const a = (dir > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * spread; const v = speed * (0.6 + Math.random() * 0.7); this.streak(pos, i % 3 ? c : new THREE.Color(3, 3, 3), 0.3 + Math.random() * 0.3, 0.035, V3(Math.cos(a) * v, Math.sin(a) * v, 0), 0.14 + Math.random() * 0.1); } }
  clear() { for (const p of this.list) { this.scene.remove(p.s); if (p.s.material) p.s.material.dispose(); } this.list = []; }
  /* starburst + streaks: the "no blood" hit spark */
  streak(pos, color, len, width, vel, life) {
    const m = new THREE.Mesh(_streakGeo, new THREE.MeshBasicMaterial({ map: streakTex(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false }));
    m.position.copy(pos); m.scale.set(len, width, 1); this.scene.add(m); return this.add({ s: m, life, t: 0, vel, drag: 7, streak: true, len });
  }
  /* crisp impact: hot white core, a shock ring, and fast streaks in the attacker's colour (no blood) */
  hit(pos, color = "#ffffff", big = 1) {
    const c = new THREE.Color(color), hot = c.clone().multiplyScalar(2.2), white = new THREE.Color(3, 3, 3);
    const core = this.sprite(coreTex(), white, 0.42 * big); core.position.copy(pos); this.add({ s: core, life: 0.09, t: 0, grow: 4 });
    const flare = this.sprite(starTex(), hot, 0.75 * big); flare.position.copy(pos); flare.material.rotation = Math.random() * 3; this.add({ s: flare, life: 0.12, t: 0, grow: 3 });
    const ring = this.sprite(ringTex(), hot, 0.25 * big); ring.position.copy(pos); this.add({ s: ring, life: 0.2, t: 0, grow: 14 });
    const n = Math.round(9 * big);
    for (let i = 0; i < n; i++) { const a = Math.random() * TAU, v = 7 + Math.random() * 9 * big; const vel = V3(Math.cos(a) * v, Math.sin(a) * v, 0); this.streak(pos, i % 3 ? hot : white, 0.32 + Math.random() * 0.3 * big, 0.035 + Math.random() * 0.02, vel, 0.12 + Math.random() * 0.1); }
    for (let i = 0; i < 5 * big; i++) { const sp = this.sprite(coreTex(), hot, 0.06 + Math.random() * 0.05); sp.position.copy(pos); const a = Math.random() * TAU, v = 2 + Math.random() * 4; this.add({ s: sp, life: 0.35 + Math.random() * 0.3, t: 0, vel: V3(Math.cos(a) * v, Math.sin(a) * v + 1, (Math.random() - 0.5) * 2), drag: 3, grav: -7 }); }
  }
  block(pos) { const c = new THREE.Color(0.8, 1.6, 2.6); const ring = this.sprite(ringTex(), c, 0.3); ring.position.copy(pos); this.add({ s: ring, life: 0.16, t: 0, grow: 10 }); const core = this.sprite(coreTex(), c, 0.35); core.position.copy(pos); this.add({ s: core, life: 0.08, t: 0, grow: 3 });
    for (let i = 0; i < 6; i++) { const a = Math.random() * TAU; this.streak(pos, c, 0.22, 0.025, V3(Math.cos(a) * 6, Math.sin(a) * 6, 0), 0.1); } }
  dust(pos, n = 8) { for (let i = 0; i < n; i++) { const sp = this.sprite(puffTex(), 0xb8a8d8, 0.6, false); sp.material.opacity = 0.5; sp.position.copy(pos).add(V3((Math.random() - 0.5) * 0.6, 0.1, (Math.random() - 0.5) * 0.4)); this.add({ s: sp, life: 0.6, t: 0, vel: V3((Math.random() - 0.5) * 3, 0.6 + Math.random(), (Math.random() - 0.5)), drag: 3, grow: 1.8, fade: 0.5 }); } }
  /* sentai roll-call explosion: coloured smoke column + flash */
  boom(pos, color, scale = 1) {
    const c = new THREE.Color(color);
    for (let i = 0; i < 12; i++) { const sp = this.sprite(puffTex(), c.clone().lerp(new THREE.Color("#ffffff"), Math.random() * 0.3), (0.9 + Math.random() * 0.8) * scale, false); sp.material.opacity = 0.75;
      sp.position.copy(pos).add(V3((Math.random() - 0.5) * 1.6 * scale, Math.random() * 1.2 * scale, -0.4 - Math.random())); this.add({ s: sp, life: 0.9 + Math.random() * 0.5, t: 0, vel: V3((Math.random() - 0.5) * 2.4, 1.8 + Math.random() * 2.5, -0.6), drag: 1.5, grow: 1.2, fade: 0.7 }); }
    const f = this.sprite(starTex(), 0xffffff, 3 * scale); f.position.copy(pos).add(V3(0, 1, -0.5)); this.add({ s: f, life: 0.25, t: 0, grow: 2 });
  }
  spark(pos, color, size = 0.2, vel, life = 0.4) { const sp = this.sprite(starTex(), new THREE.Color(color), size); sp.position.copy(pos); return this.add({ s: sp, life, t: 0, vel: vel || V3(), drag: 2 }); }
  /* lightning bolt between two points (Overdrive, electron effects) */
  bolt(a, b, color = "#9fe8ff", life = 0.12) {
    const pts = []; const n = 10; for (let i = 0; i <= n; i++) { const p = a.clone().lerp(b, i / n); if (i && i < n) p.add(V3((Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.35, (Math.random() - 0.5) * 0.2)); pts.push(p); }
    const geo = new THREE.BufferGeometry().setFromPoints(pts); const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, transparent: true, blending: THREE.AdditiveBlending }));
    this.scene.add(l); this.add({ s: l, life, t: 0, line: true });
  }
  update(dt) {
    for (const p of this.list) {
      p.t += dt; const f = p.t / p.life;
      if (p.vel) { p.s.position.addScaledVector(p.vel, dt); p.vel.multiplyScalar(Math.exp(-(p.drag || 0) * dt)); if (p.grav) p.vel.y += p.grav * dt; }
      if (p.streak) { const sp = p.vel.length(); p.s.rotation.z = Math.atan2(p.vel.y, p.vel.x); p.s.scale.x = p.len * Math.min(1.4, 0.3 + sp / 10); }
      else if (p.grow && !p.line) p.s.scale.multiplyScalar(1 + p.grow * dt);
      if (p.spin) p.s.material.rotation += p.spin * dt;
      p.s.material.opacity = (p.fade ?? 1) * (1 - f);
    }
    this.list = this.list.filter((p) => { if (p.t >= p.life) { this.scene.remove(p.s); if (p.s.geometry && p.line) p.s.geometry.dispose(); p.s.material.dispose(); return false; } return true; });
  }
  clear() { this.list.forEach((p) => this.scene.remove(p.s)); this.list = []; }
}

/* ---------- 2D overlay: impact-frame speed lines + move-name banners ---------- */
const FX2D = {
  init(host) { this.c = document.createElement("canvas"); this.c.id = "fx2d"; host.appendChild(this.c); this.x = this.c.getContext("2d"); this.bannerEl = document.getElementById("banner"); },
  impact(odd) {
    const c = this.c; if (!c) return;
    if (odd === null) { if (this._on) { this.x.clearRect(0, 0, c.width, c.height); this._on = false; } return; }
    const r = c.getBoundingClientRect(); if (c.width !== Math.round(r.width)) { c.width = Math.round(r.width); c.height = Math.round(r.height); }
    const x = this.x, w = c.width, h = c.height; x.clearRect(0, 0, w, h); this._on = true;
    x.fillStyle = odd ? "#000" : "#fff"; const cx = w * (this.cx ?? 0.5), cy = h * (this.cy ?? 0.5);
    for (let i = 0; i < 90; i++) { const a = Math.random() * TAU, r0 = h * (0.18 + Math.random() * 0.2), wd = 0.004 + Math.random() * 0.012; x.beginPath(); x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); x.lineTo(cx + Math.cos(a - wd) * w * 1.5, cy + Math.sin(a - wd) * w * 1.5); x.lineTo(cx + Math.cos(a + wd) * w * 1.5, cy + Math.sin(a + wd) * w * 1.5); x.closePath(); x.fill(); }
  },
  /* anime-style attack callout across the screen */
  banner(text, color, sub, side = 1) {
    const el = this.bannerEl; if (!el) return;
    el.innerHTML = `<div class="bn-band" style="--c:${color}"><div class="bn-lines"></div><div class="bn-sub">${sub || ""}</div><div class="bn-text" data-t="${text}">${text.split("").map((ch, i) => `<span style="animation-delay:${i * 18}ms">${ch === " " ? "&nbsp;" : ch}</span>`).join("")}</div></div>`;
    el.className = "show " + (side > 0 ? "fromL" : "fromR"); clearTimeout(this._bt);
    this._bt = setTimeout(() => (el.className = "hide " + (side > 0 ? "fromL" : "fromR")), 1150);
  },
};

/* ---------- molecular projectile models ---------- */
function phosphateModel(scale = 1) {
  const g = new THREE.Group(); const P = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), M("#f2a23a", { emissive: "#ff9a2a", ei: 0.6 })); g.add(P);
  const om = M("#ff4f5e", { emissive: "#ff3040", ei: 0.4 });
  [[0, 1, 0], [0.94, -0.33, 0], [-0.47, -0.33, 0.82], [-0.47, -0.33, -0.82]].forEach((d) => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.085, 12, 8), om); o.position.set(d[0] * 0.17, d[1] * 0.17, d[2] * 0.17); g.add(o); });
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), color: 0xffd36b, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(0.9); g.add(glow);
  g.scale.setScalar(scale); return g;
}
function trnaModel(aaColor = "#f1c746") {
  // the real L-shape: acceptor arm on one end (carrying the amino acid), anticodon loop on the other
  const g = new THREE.Group(); const m = M("#e8505b", { physical: true, clearcoat: 0.6, rough: 0.35, emissive: "#e8505b", ei: 0.15 }), m2 = M("#f4efe6", { rough: 0.4 });
  const armA = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 10), m); armA.rotation.z = Math.PI / 2; armA.position.set(0.18, 0.3, 0); g.add(armA);
  const armB = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 10), m); armB.position.set(-0.12, 0.0, 0); g.add(armB);
  const loop = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.035, 8, 16), m2); loop.position.set(-0.12, -0.34, 0); g.add(loop);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.05), M(["#3fae7a", "#3460e0", "#f2b631"][i])); b.position.set(-0.2 + i * 0.08, -0.47, 0); g.add(b); }
  const aa = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), M(aaColor, { emissive: aaColor, ei: 0.4 })); aa.position.set(0.52, 0.3, 0); g.add(aa);
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), color: 0xff8090, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(1.1); g.add(glow);
  return g;
}
const AA_COLORS = ["#f1c746", "#22b8b1", "#d74780", "#7b6cf0", "#3fae7a", "#f08a3c", "#e8505b", "#a9c3ff"];
function aminoBead(i, r = 0.08) {
  const g = new THREE.Group(); const c = AA_COLORS[i % AA_COLORS.length];
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), M(c, { physical: true, clearcoat: 0.8, rough: 0.3, emissive: c, ei: 0.12 })));
  const side = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 8, 6), M("#f4efe6")); side.position.set(0, r * 0.9, 0); g.add(side); g.userData.side = side;
  return g;
}
