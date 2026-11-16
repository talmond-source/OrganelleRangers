/* ================= Megaform ultimates: scripted cinematics with impact frames ================= */
const ULTS = {};
function cineBase(game, att, def, dur) {
  att.set("cine"); def.set("cine"); att.vx = def.vx = 0; att.y = def.y = 0;
  att.face = def.x >= att.x ? 1 : -1; def.face = -att.face;
  const want = att.x + att.face * 4.2; def.x = clamp(want, -HALF + 0.5, HALF - 0.5); if (Math.abs(def.x - att.x) < 3) att.x = clamp(def.x - att.face * 4.2, -HALF + 0.5, HALF - 0.5);
  const root = new THREE.Group(); game.view.scene.add(root);
  return { game, att, def, dmg: 35, t: 0, dur, root, cam: { p: V3(), l: V3(), fov: 30 }, fired: {},
    once(k, t) { if (this.t >= t && !this.fired[k]) { this.fired[k] = 1; return true; } return false; },
    dispose() { game.view.scene.remove(root); disposeTree(root); }, };
}
const camRel = (c, x, face, p, l, fov) => ({ p: V3(x + p[0] * face, p[1], p[2]), l: V3(x + l[0] * face, l[1], l[2]), fov });
function impactAt(game, wpos, dur = 0.32) {
  const v = game.view; const s = wpos.clone().project(v.camera); FX2D.cx = (s.x + 1) / 2; FX2D.cy = (1 - s.y) / 2; v.impact = dur; game.sfx("impact"); v.shake = 0.5;
}

/* Shared image textures stay available across intros, matches and rematches. */
const MEGA_IMAGE_SIZES = {"atp":[1024,561],"crispr":[1024,685],"cytoplasm":[512,512],"dna":[350,350],"golgi":[860,700],"lysosome":[512,512],"membrane":[512,512],"mito":[700,700],"mitosis":[700,700],"nucleus":[310,296],"phage":[1020,1024],"ribosome":[1024,960],"rna":[1024,918],"rougher":[1024,490],"smoother":[1024,326]};
const megaImageLoader = new THREE.TextureLoader();
const megaImageTextures = new Map();
function megaSprite(id, size = 4.8) {
  let texture = megaImageTextures.get(id);
  if (!texture) {
    texture = megaImageLoader.load("images/mega/" + id + ".png");
    texture.encoding = THREE.sRGBEncoding;
    megaImageTextures.set(id, texture);
  }
  const [width, height] = MEGA_IMAGE_SIZES[id];
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, alphaTest: 0.02, toneMapped: false, depthWrite: false }));
  sprite.scale.set(size * width / Math.max(width, height), size * height / Math.max(width, height), 1);
  const group = new THREE.Group();
  group.add(sprite);
  group.userData.sprite = sprite;
  return group;
}
function keepMegaTexture(cine, model) {
  const dispose = cine.dispose;
  cine.dispose = () => {
    const sprite = model.userData.sprite;
    sprite.removeFromParent();
    sprite.material.dispose();
    dispose();
  };
}

function atpBall(scale = 1) {
  const g = new THREE.Group(); const ad = M("#3c8dff", { emissive: "#3c8dff", ei: 0.35, rough: 0.3 }), rb = M("#f4efe6", { rough: 0.35 }), ph = M("#f2a23a", { emissive: "#ff9a2a", ei: 0.6 });
  const hex = new THREE.CylinderGeometry(0.16, 0.16, 0.07, 6), pent = new THREE.CylinderGeometry(0.14, 0.14, 0.07, 5);
  const a1 = new THREE.Mesh(hex, ad); a1.rotation.x = Math.PI / 2; a1.position.set(-0.32, 0.12, 0); const a2 = new THREE.Mesh(pent, ad); a2.rotation.x = Math.PI / 2; a2.position.set(-0.55, 0.2, 0);
  const r = new THREE.Mesh(pent, rb); r.rotation.x = Math.PI / 2; r.position.set(-0.08, -0.05, 0);
  g.add(a1, a2, r); for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), ph); p.position.set(0.15 + i * 0.2, -0.08 + (i % 2) * 0.06, 0); g.add(p); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: starTex(), color: 0xffe08a, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(1.4); g.add(glow);
  g.scale.setScalar(scale); return g;
}
ULTS.atp = (game, att, def) => {
  const c = cineBase(game, att, def, 6.4); const F = att.face, X = att.x;
  const syn = megaSprite("atp", 4.6); const S = 1.35; syn.scale.setScalar(S); c.root.add(syn);
  const muzzleGlow = glowSprite("#fff2a8", 2.4);
  muzzleGlow.position.y = 2.2;
  syn.add(muzzleGlow);
  keepMegaTexture(c, syn);
  const base = V3(X - F * 1.6, 2.1, -1.4); syn.rotation.z = -F * Math.PI / 2; // stalk axis points at the opponent
  const protons = []; for (let i = 0; i < 26; i++) { const s = glowSprite("#ff6a8a", 0.5); c.root.add(s); protons.push({ s, ph: Math.random() }); }
  const balls = [];
  c.step = function (dt) {
    this.t += dt; const t = this.t;
    att.cineAnim = t < 1.2 ? AN("cast", t * 30, { fade: 0.15 }) : AN("magic2", Math.min(45, 25 + (t - 1.2) * 20), { fade: 0.2 }); def.cineAnim = t < 2.4 ? AN("idle", t * 30, { loop: true }) : AN("hitHigh", 2 + ((t * 30) % 16), { tag: Math.floor(t / 0.53) });
    if (this.once("ban", 0.15)) { FX2D.banner("ATP SYNTHASE TURBINE!", att.info.hex, "MEGAFORM · " + att.info.name, F); HUD.science(att, "ATP Synthase Turbine"); game.parts.boom(V3(X, 0, -0.5), att.info.hex, 1.2); game.sfx("boom"); }
    // rise from below
    const rise = ss(t, 0.8, 2.0), sink = ss(t, 5.6, 6.3);
    syn.position.copy(base).add(V3(0, -6 * (1 - rise) - 6 * sink, 0)); syn.visible = t > 0.75;
    muzzleGlow.material.opacity = 0.4 + 0.6 * Math.abs(Math.sin(t * 20)) * ss(t, 2.2, 2.5) * (1 - sink);
    protons.forEach((p, i) => { const ph = (p.ph + t * 0.9) % 1; const a = i * 2.4; const lp = V3(Math.cos(a) * 2.2 * (1 - ph), -1.6 + ph * 1.6, Math.sin(a) * 2.2 * (1 - ph)); p.s.position.copy(lp.applyEuler(syn.rotation).multiplyScalar(S).add(syn.position)); p.s.visible = t > 1.4 && t < 5.7; });
    // rapid fire of ATP "cannonballs"
    const muzzle = muzzleGlow.getWorldPosition(V3());
    if (t > 2.4 && t < 4.5 && Math.floor(t / 0.11) !== this._lastShot) { this._lastShot = Math.floor(t / 0.11); const b = atpBall(0.9); b.position.copy(muzzle); c.root.add(b); balls.push({ b, v: V3(def.x - muzzle.x, 1.2 + Math.random() * 0.6 - muzzle.y, (Math.random() - 0.5) * 0.6).normalize().multiplyScalar(22), big: false }); game.sfx("shoot"); }
    if (this.once("big", 4.7)) { const b = atpBall(2.4); b.position.copy(muzzle); c.root.add(b); balls.push({ b, v: V3(def.x - muzzle.x, 1.2 - muzzle.y, 0).normalize().multiplyScalar(16), big: true }); game.sfx("charge"); }
    for (const o of balls) { if (o.dead) continue; o.b.position.addScaledVector(o.v, dt); o.b.rotation.z += dt * 10;
      if (Math.abs(o.b.position.x - def.x) < (o.big ? 0.7 : 0.4)) { o.dead = true; c.root.remove(o.b); game.parts.hit(V3(def.x, o.b.position.y, 0.3), att.info.hex, o.big ? 2.4 : 0.8); game.sfx(o.big ? "heavy" : "hit"); def.flash = 0.06; game.view.shake = Math.max(game.view.shake, o.big ? 0.6 : 0.12);
        if (o.big) { impactAt(game, V3(def.x, 1.2, 0)); game.parts.boom(V3(def.x, 0, 0), "#f4d63d", 1.6); } } }
    if (t > 2.4 && t < 4.6) def.x += F * dt * 0.25;
    const k = [
      { t: 0.0, p: [1.0, 1.55, 2.6], l: [0, 1.4, 0], fov: 30 },
      { t: 0.9, p: [1.4, 1.5, 3.6], l: [0, 1.4, 0], fov: 30 },
      { t: 2.0, p: [-0.6, 0.6, 9.0], l: [1.6, 2.6, -0.8], fov: 42 },
      { t: 3.0, p: [2.0, 1.6, 9.5], l: [2.4, 1.6, 0], fov: 36 },
      { t: 4.4, p: [3.0, 1.4, 6.5], l: [4.0, 1.2, 0], fov: 32 },
      { t: 5.2, p: [3.4, 1.4, 5.5], l: [4.2, 1.2, 0], fov: 30 },
      { t: 6.4, p: [2.1, 1.55, 11], l: [2.1, 1.05, 0], fov: 30 },
    ];
    const ck = camAt(k, t); this.cam = { p: V3(X + ck.p.x * F, ck.p.y, ck.p.z), l: V3(X + ck.l.x * F, ck.l.y, ck.l.z), fov: ck.fov };
    return t >= this.dur;
  };
  return c;
};

/* ---------- Ribosome: a giant polypeptide chain constricts the opponent ---------- */
ULTS.ribosome = (game, att, def) => {
  const c = cineBase(game, att, def, 6.6); const F = att.face, X = att.x;
  const rib = megaSprite("ribosome", 5.4); c.root.add(rib); const ribPos = V3(X - F * 2.2, 3.0, -2.6);
  keepMegaTexture(c, rib);
  const N = 46; const beads = []; for (let i = 0; i < N; i++) { const b = aminoBead(i, i === 0 ? 0.2 : 0.13); c.root.add(b); beads.push(b); b.visible = false; }
  const exit = () => rib.position.clone().add(V3(F * 0.6, 1.4, 0.4));
  c.step = function (dt) {
    this.t += dt; const t = this.t;
    att.cineAnim = t < 1.2 ? AN("cast", t * 30, { fade: 0.15 }) : AN("fireball", Math.min(40, 20 + (t - 1.2) * 18), { fade: 0.2 });
    if (this.once("ban", 0.15)) { FX2D.banner("AMINO ACID CONSTRICTOR!", att.info.hex, "MEGAFORM · " + att.info.name, F); HUD.science(att, "Amino Acid Constrictor"); game.parts.boom(V3(X, 0, -0.5), att.info.hex, 1.2); game.sfx("boom"); }
    const rise = ss(t, 0.8, 2.0), sink = ss(t, 5.9, 6.5); rib.position.copy(ribPos).add(V3(0, -7 * (1 - rise) - 7 * sink, 0)); rib.visible = t > 0.75; rib.userData.sprite.material.rotation = Math.sin(t) * 0.12;
    // chain path: out of the exit tunnel, arcing to the opponent, then a tightening coil around them
    const e = exit(); const tgt = V3(def.x, 1.1, 0);
    const out = ss(t, 2.0, 3.1), coil = ss(t, 3.1, 4.2), squeeze = ss(t, 4.3, 4.7), lift = ss(t, 5.0, 5.35), slam = ss(t, 5.35, 5.6), go = ss(t, 5.9, 6.5);
    const r = lerp(0.95, 0.45, squeeze), defY = lift * 1.7 * (1 - slam);
    def.y = Math.max(0, defY); def.cineAnim = t > 3.1 ? AN("hitHigh", 4 + ((t * 40) % 10), { tag: Math.floor(t * 4), fade: 0.04 }) : AN("idle", t * 30, { loop: true });
    const shown = Math.round(N * out);
    beads.forEach((b, i) => {
      b.visible = i < shown && go < 0.98; const f = i / (N - 1);
      const arc = e.clone().lerp(tgt, f); arc.y += Math.sin(f * Math.PI) * 2.2; arc.z += Math.sin(f * Math.PI) * 1.2;
      const a = f * TAU * 4.2 + t * (2 + squeeze * 6), hy = 0.25 + f * 1.9 + def.y;
      const wrap = V3(def.x + Math.cos(a) * r, hy, Math.sin(a) * r * 0.9);
      // the tail stays anchored at the ribosome while the head end wraps the opponent
      const w = clamp(coil * 1.4 - (1 - f) * 0.9);
      b.position.copy(arc.lerp(wrap, w)); b.scale.setScalar((i === 0 ? 1.15 : 1) * (1 - go) * (1 + squeeze * 0.15 * Math.sin(t * 40 + i)));
      b.rotation.set(t * 2 + i, t * 3, 0);
    });
    if (this.once("sq", 4.45)) { impactAt(game, V3(def.x, 1.2, 0), 0.34); game.parts.hit(V3(def.x, 1.2, 0.3), att.info.hex, 2); }
    if (this.once("slam", 5.55)) { game.parts.dust(V3(def.x, 0, 0), 18); game.parts.hit(V3(def.x, 0.4, 0.3), "#ffffff", 2); game.view.shake = 0.6; game.sfx("heavy"); }
    if (t > 4.3 && t < 4.7 && Math.floor(t * 30) % 3 === 0) game.sfx("hit");
    const k = [
      { t: 0.0, p: [1.0, 1.55, 2.6], l: [0, 1.4, 0], fov: 30 },
      { t: 0.9, p: [1.4, 1.5, 3.6], l: [0, 1.4, 0], fov: 30 },
      { t: 2.0, p: [0.0, 1.0, 10.5], l: [0.4, 2.6, -1.5], fov: 42 },
      { t: 3.1, p: [2.6, 2.4, 9.5], l: [3.0, 1.8, 0], fov: 36 },
      { t: 4.2, p: [5.6, 1.6, 4.2], l: [4.2, 1.3, 0], fov: 32 },
      { t: 5.0, p: [6.0, 1.3, 4.6], l: [4.2, 1.6, 0], fov: 34 },
      { t: 5.6, p: [5.5, 1.0, 5.8], l: [4.2, 0.6, 0], fov: 32 },
      { t: 6.6, p: [2.1, 1.55, 11], l: [2.1, 1.05, 0], fov: 30 },
    ];
    const ck = camAt(k, t); this.cam = { p: V3(X + ck.p.x * F, ck.p.y, ck.p.z), l: V3(X + ck.l.x * F, ck.l.y, ck.l.z), fov: ck.fov };
    return t >= this.dur;
  };
  return c;
};
