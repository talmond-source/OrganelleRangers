/* Shared cinematic for the image-based Megaforms. Projectiles and impacts remain in the scene. */
function megaCine(game, att, def, o) {
  const c = cineBase(game, att, def, 5.8); const F = att.face, X = att.x, hitT = 4.3;
  const m = megaSprite(att.id); c.root.add(m); keepMegaTexture(c, m); const S = o.scale || 1;
  const sprite = m.userData.sprite;
  const calcium = att.id === "smoother" ? Array.from({ length: 14 }, (_, i) => {
    const flash = glowSprite("#ffffff", 0.5);
    const angle = i * 2.4;
    flash.position.set(Math.cos(angle) * (1.1 + i % 3 * 0.3), Math.sin(angle) * 1.35, 0.35);
    m.add(flash);
    return flash;
  }) : [];
  const home = V3(X - F * 0.4, o.y ?? 2.6, -1.8), tgt = V3(def.x, o.ty ?? 1.3, 0); const shots = [];
  c.step = function (dt) {
    this.t += dt; const t = this.t;
    att.cineAnim = t < 1.2 ? AN("cast", t * 30, { fade: 0.15 }) : AN("magic2", Math.min(45, 25 + (t - 1.2) * 20), { fade: 0.2 });
    def.cineAnim = t < hitT - 1.3 ? AN("idle", t * 30, { loop: true }) : AN("hitHigh", 2 + ((t * 30) % 16), { tag: Math.floor(t / 0.5) });
    if (this.once("ban", 0.15)) { FX2D.banner(o.name.toUpperCase() + "!", att.info.hex, "MEGAFORM · " + att.info.name, F); HUD.science(att, o.name); game.parts.boom(V3(X, 0, -0.5), att.info.hex, 1.2); game.sfx("boom"); }
    const rise = ss(t, 0.8, 1.9), out = ss(t, 5.1, 5.8), u = clamp((t - 2.1) / (hitT - 2.1));
    m.visible = t > 0.75; const pos = home.clone();
    if (o.mode === "ram") { pos.lerp(tgt, smooth(u) * smooth(u)); sprite.material.rotation -= dt * (o.spin || 0) * (1 + u * 2); }
    else if (o.mode === "slam") { const up = V3(tgt.x, 5.2, 0); if (u < 0.65) pos.lerp(up, smooth(u / 0.65)); else pos.copy(up).lerp(tgt, Math.pow((u - 0.65) / 0.35, 2)); }
    else if (o.mode === "engulf") { pos.lerp(tgt, smooth(Math.min(1, u / 0.45))); if (u > 0.45 && t < hitT) { def.rig.visible = !!o.seeThrough; pos.x += Math.sin(t * 34) * 0.07; pos.y += Math.cos(t * 27) * 0.06; if (o.seeThrough) { def.x = tgt.x + Math.sin(t * 13) * 0.9; def.y = 0.9 + Math.abs(Math.sin(t * 17)) * 1.1; } if (Math.floor(t / 0.16) !== this._e) { this._e = Math.floor(t / 0.16); game.sfx("hit"); game.view.shake = Math.max(game.view.shake, 0.15); } } }
    else if (o.mode === "shoot") { sprite.material.rotation -= dt * (o.spin || 0);
      if (u > 0.05 && u < 0.92 && Math.floor(t / 0.15) !== this._s) { this._s = Math.floor(t / 0.15); const b = o.shot(); const from = m.position.clone().add(V3(F * 1.2 * S, (Math.random() - 0.5) * S, 0)); b.position.copy(from); c.root.add(b); shots.push({ b, v: V3(def.x - from.x, 1.1 + Math.random() * 0.6 - from.y, 0).normalize().multiplyScalar(20) }); game.sfx("shoot"); } }
    for (const s of shots) { if (s.dead) continue; s.b.position.addScaledVector(s.v, dt); s.b.rotation.z += dt * 8; if (Math.abs(s.b.position.x - def.x) < 0.45) { s.dead = true; c.root.remove(s.b); game.parts.hit(V3(def.x, s.b.position.y, 0.3), att.info.hex, 0.9); game.sfx("hit"); def.flash = 0.06; game.view.shake = Math.max(game.view.shake, 0.14); } }
    pos.y -= 8 * (1 - rise);
    pos.y += 10 * out;
    m.position.copy(pos);
    const assembly = o.assemble ? ss(t, 0.9, 2.9) : 1;
    m.scale.setScalar(S * (0.25 + 0.75 * rise) * (0.65 + 0.35 * assembly));
    sprite.material.opacity = (0.35 + 0.65 * assembly) * (o.seeThrough && u > 0.45 && t < hitT ? 0.42 : 1);
    if (att.id === "dna") sprite.material.rotation = 0.33 * (1 - u);
    if (att.id === "crispr") sprite.material.rotation = Math.sin(t * 2) * 0.15;
    if (att.id === "cytoplasm") sprite.scale.x = sprite.scale.y * (1 + Math.sin(t * 6) * 0.045);
    calcium.forEach((flash, i) => { flash.material.opacity = u > 0.5 ? 0.4 + 0.6 * Math.abs(Math.sin(t * 22 + i)) : 0.1; });
    if (this.once("hit", hitT)) { def.rig.visible = true; def.x = tgt.x; def.y = 0; impactAt(game, V3(def.x, 1.2, 0)); game.parts.boom(V3(def.x, 0, 0), att.info.hex, 1.6); game.parts.hit(V3(def.x, 1.2, 0.3), att.info.hex, 2.4); game.sfx("heavy"); }
    const k = [{ t: 0, p: [1.0, 1.55, 2.6], l: [0, 1.4, 0], fov: 30 }, { t: 0.9, p: [1.4, 1.5, 3.6], l: [0, 1.4, 0], fov: 30 }, { t: 2.0, p: [1.2, 0.9, 9.5], l: [1.4, 2.4, -0.8], fov: 40 }, { t: 3.2, p: [2.6, 1.5, 9], l: [2.8, 1.7, 0], fov: 36 }, { t: 4.3, p: [3.4, 1.4, 6.5], l: [4.1, 1.3, 0], fov: 32 }, { t: 5.8, p: [2.1, 1.5, 10.5], l: [2.1, 1.05, 0], fov: 30 }];
    const ck = camAt(k, t); this.cam = { p: V3(X + ck.p.x * F, ck.p.y, ck.p.z), l: V3(X + ck.l.x * F, ck.l.y, ck.l.z), fov: ck.fov };
    return t >= this.dur;
  };
  const disp = c.dispose; c.dispose = () => { def.rig.visible = true; def.y = 0; disp(); };
  return c;
}
const MEGA = {
  rougher: { name: "Rough ER", mode: "shoot", y: 2.7, scale: 1.1, shot: () => vesicle("#e47a21", 0.3) },
  golgi: { name: "Golgi Apparatus", mode: "shoot", y: 2.7, scale: 1.05, shot: () => vesicle("#16b8c3", 0.28) },
  cytoplasm: { name: "Cytoplasm Colossus", mode: "slam", y: 2.4, scale: 1.0 },
  membrane: { name: "Fluid Mosaic Membrane", mode: "engulf", y: 2.4, scale: 1.0 },
  mito: { name: "Mitochondrion Pinball", mode: "engulf", seeThrough: true, y: 2.4, ty: 1.6, scale: 1.0 },
  nucleus: { name: "Razor Nucleus", mode: "ram", spin: 3, y: 2.6, scale: 0.95 },
  smoother: { name: "Smooth ER", mode: "engulf", y: 2.5, scale: 1.0 },
  lysosome: { name: "Lysosome", mode: "engulf", y: 2.5, scale: 1.0 },
  dna: { name: "Double Helix", mode: "slam", y: 2.6, scale: 0.95 },
  rna: { name: "Folded tRNA", mode: "shoot", y: 2.9, scale: 1.0, shot: () => { const b = aminoBead(Math.floor(Math.random() * 8), 0.3); return b; } },
  mitosis: { name: "Multicellular Mech", mode: "slam", assemble: true, y: 2.6, scale: 1.0 },
  crispr: { name: "Cas9", mode: "ram", y: 2.6, scale: 1.0 },
  phage: { name: "T4 Bacteriophage", mode: "slam", y: 3.0, ty: 2.3, scale: 0.9 },
};
for (const id in MEGA) ULTS[id] = (game, att, def) => megaCine(game, att, def, MEGA[id]);
