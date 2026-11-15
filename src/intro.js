/* ================= Opening cinematic + title backdrop =================
   A) tracking shot down the line: each ranger snaps into a pose as the camera reaches them
   B) solo shots: push-in on the ranger, then pull back as their Megaform rises behind them
   C) the whole team under every Megaform, explosion, fade to black  ->  logo */
const INTRO = {
  POSES: [["win", 46], ["cast", 30], ["magic2", 32], ["win2", 42], ["fireball", 29], ["magic1", 28], ["upper", 10], ["intro", 34], ["hook", 10], ["cross", 16], ["win", 30], ["kick", 19], ["throw", 21], ["win2", 60]],
  A: 6.4, SOLO: 1.75,
  init(view) {
    this.view = view; this.ids = ROSTER.map((r) => r.id); this.root = new THREE.Group(); view.scene.add(this.root); this.megas = {}; this.phase = "off"; this.t = 0;
    const fl = new THREE.Mesh(new THREE.CircleGeometry(60, 48), new THREE.MeshStandardMaterial({ color: "#14161f", roughness: 0.85, metalness: 0, envMapIntensity: 0.08 })); fl.rotation.x = -Math.PI / 2; fl.receiveShadow = true; this.root.add(fl);
    this.halo = glowSprite("#ffffff", 16); this.halo.material.fog = false; this.root.add(this.halo);
    // radial speed lines behind the hero, tinted per ranger
    const lt = canvasTex(512, 512, (x, w, h) => { x.clearRect(0, 0, w, h); x.translate(w / 2, h / 2); const r = mulberry(3); for (let i = 0; i < 90; i++) { const a = r() * TAU, wd = 0.006 + r() * 0.02, r0 = 40 + r() * 70; x.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.6})`; x.beginPath(); x.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); x.lineTo(Math.cos(a - wd) * 256, Math.sin(a - wd) * 256); x.lineTo(Math.cos(a + wd) * 256, Math.sin(a + wd) * 256); x.fill(); } });
    this.lines = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: lt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0.5 })); this.root.add(this.lines);
    this.cap = $id("introCap"); this.nameEl = $id("introName"); this.fade = $id("fade"); this.wipe = $id("wipe"); this.root.visible = false;
    this.form = this.ids.map((id, i) => { const row = i < 7 ? 0 : 1, k = (i % 7) - 3; return V3(k * 1.35 + row * 0.67, 0, row ? -1.5 : 0.4); });
    this.line = this.ids.map((id, i) => { const x = (i - 6.5) * 1.2; return V3(x, 0, -Math.abs(x) * 0.05); });
    this.st = this.ids.map(() => ({ f: 0 }));
  },
  mega(id) { if (!this.megas[id]) { const m = id === "atp" ? atpSynthaseModel() : id === "ribosome" ? bigRibosome() : MEGA[id].build(); m.traverse((o) => { o.castShadow = false; }); if (MEGA[id] && MEGA[id].assemble) MEGA[id].anim(m, 99); m.visible = false; this.root.add(m); this.megas[id] = m; } return this.megas[id]; },
  show(on) { this.root.visible = on; document.body.classList.toggle("cine", on && this.phase === "play"); if (!on) { this.cap.textContent = ""; this.nameEl.innerHTML = ""; this.fade.style.opacity = 0; $id("skipHint").hidden = true; return; }
    const v = this.view; v.scene.background = new THREE.Color("#05060a"); v.scene.fog = null; v.hemi.color.set("#ffffff"); v.hemi.groundColor.set("#30303a"); v.hemi.intensity = 0.4; v.key.color.set("#ffffff"); v.key.intensity = 1.5; v.rimA.color.set("#7fd8ff"); v.rimA.intensity = 1.5; v.rimB.color.set("#ff7fc8"); v.rimB.intensity = 1.2; v.fill.intensity = 0.3; },
  start() { this.t = 0; this.phase = "play"; this.shot = -2; this.boomed = false; this.st.forEach((s) => { s.f = 0; s.on = false; }); $id("skipHint").hidden = false; document.body.classList.add("cine"); },
  toLogo() { SHOW.parts.clear(); this.phase = "logo"; this.t = 0; this.cap.textContent = ""; this.nameEl.innerHTML = ""; $id("skipHint").hidden = true; this.fade.style.opacity = 0; document.body.classList.remove("cine"); this.lines.visible = false; },
  /* pose a ranger: e = 0 (still in stance) .. 1 (pose hit), then a slow drift so nobody is ever frozen */
  pose(i, p, yaw, e, hold, dt) { const r = SHOW.rig(this.ids[i]), ps = this.POSES[i]; r.root.visible = true; r.root.position.copy(p); r.root.scale.setScalar(1); r.body.rotation.y = yaw; r.shadow.visible = true;
    if (e <= 0) r.anim.play(AN("idle", this.t * 30 + i * 11, { loop: true, fade: 0.15 }), dt); else r.anim.play(AN(ps[0], Math.max(0, ps[1] - (1 - e) * 16 + Math.min(3, hold * 1.6)), { fade: 0.1 }), dt); return r; },
  doWipe(col, side) { const w = this.wipe; w.style.setProperty("--c", col); w.className = ""; void w.offsetWidth; w.className = side > 0 ? "go l" : "go r"; },
  group(t, dt, megaRise) {
    this.ids.forEach((id, i) => { const p = this.form[i]; this.pose(i, p, -p.x * 0.07, 1, 1 + Math.sin(t * 0.8 + i) * 0.5, dt);
      const m = this.mega(id), k = (i % 7) - 3, row = i < 7 ? 0 : 1, e = megaRise == null ? 1 : easeOutBack(clamp((megaRise - i * 0.07) / 0.9)); m.visible = e > 0.01;
      m.position.set(k * 4.2 + row * 2.1, (row ? 8.2 : 3.6) - (1 - e) * 9 + Math.sin(t * 0.9 + i) * 0.15, row ? -13 : -8); m.scale.setScalar(0.62); m.rotation.y = t * 0.4 + i; });
    this.halo.visible = true; this.halo.position.set(0, 5, -16); this.halo.scale.setScalar(46); this.halo.material.color.set("#ff9a3a"); this.halo.material.opacity = 0.5;
  },
  update(dt) {
    if (!this.root.visible) return; this.t += dt; const t = this.t, v = this.view; SHOW.parts.update(dt);
    if (this.phase === "logo") { this.lines.visible = false; this.group(t, dt, null); v.scene.background.set("#07060c"); const a = t * 0.12; v.setCam(V3(Math.sin(a) * 3.5, 1.5 + Math.sin(t * 0.2) * 0.2, 13.5), V3(0, 2.6, 0), 40); return; }
    const B0 = this.A, C0 = B0 + this.ids.length * this.SOLO, n = this.ids.length;
    if (t < B0) { // ---------- A: tracking shot down the line
      if (this.shot !== -1) { this.shot = -1; v.scene.background.set("#05060a"); this.ids.forEach((id) => (this.mega(id).visible = false)); this.halo.visible = false; this.lines.visible = false; }
      const u = clamp((t - 0.3) / (B0 - 0.9)), camX = this.line[0].x - 1.6 + (this.line[n - 1].x - this.line[0].x + 3.2) * (u * u * (3 - 2 * u) * 0.5 + u * 0.5);
      this.ids.forEach((id, i) => { const p = this.line[i], s = this.st[i], r = SHOW.rig(id); if (Math.abs(p.x - camX) > 5.5) { r.root.visible = false; return; }
        if (!s.on && camX > p.x - 1.5) { s.on = true; s.f = 0; SHOW.parts.boom(V3(p.x, 0, p.z - 1.0), BYID[id].hex, 0.7); SHOW.parts.ring(V3(p.x, 1.1, p.z + 0.2), BYID[id].hex, 0.4, 9, 0.3); AUDIO.sfx(i % 2 ? "jab" : "kick"); }
        if (s.on) s.f += dt; this.pose(i, p, 0.25, s.on ? easeOut(clamp(s.f / 0.32)) : 0, s.f, dt); });
      v.setCam(V3(camX - 1.1, 1.05 + Math.sin(t * 0.7) * 0.04, 3.7), V3(camX + 0.7, 1.12, -0.2), 38);
      this.cap.textContent = t < 2.6 ? "INSIDE EVERY LIVING CELL…" : t < 5.2 ? "…FOURTEEN GUARDIANS STAND READY" : ""; this.nameEl.innerHTML = ""; return;
    }
    if (t < C0) { // ---------- B: solos
      const k = Math.floor((t - B0) / this.SOLO), lt = (t - B0) % this.SOLO, u = lt / this.SOLO, id = this.ids[k], info = BYID[id], side = k % 2 ? -1 : 1;
      if (this.shot !== k) { this.shot = k; this.cap.textContent = ""; this.ids.forEach((o) => { SHOW.rig(o).root.visible = false; this.mega(o).visible = false; }); SHOW.parts.clear();
        v.scene.background.set(info.dark).multiplyScalar(0.5); this.doWipe(info.hex, side); AUDIO.sfx("whoosh"); this.st[k].b = false;
        this.nameEl.style.setProperty("--c", info.hex); this.nameEl.className = side > 0 ? "l" : "r"; this.nameEl.innerHTML = `<small>${info.color.toUpperCase()} RANGER</small><b>${info.name.replace(" Ranger", "").toUpperCase()}</b><i>MEGAFORM · ${MOVES[id].ult.name.toUpperCase()}</i>`; this.nameEl.classList.remove("go"); void this.nameEl.offsetWidth; this.nameEl.classList.add("go"); }
      const e = easeOut(clamp(lt / 0.75)), pe = easeOut(clamp((lt - 0.12) / 0.34));
      this.pose(k, V3(0, 0, 0), side * 0.5, pe, lt, dt);
      if (!this.st[k].b && lt > 0.3) { this.st[k].b = true; SHOW.parts.boom(V3(-side * 0.5, 0, -2.2), info.hex, 1.1); SHOW.parts.ring(V3(0, 1.1, 0.3), info.hex, 0.5, 12, 0.35); AUDIO.sfx("boom"); v.shake = 0.1; }
      const m = this.mega(id), me = easeOutBack(clamp((lt - 0.18) / 0.7)); m.visible = me > 0.01; m.position.set(-side * 0.7, -1.5 + 4.9 * me + Math.sin(t * 1.3) * 0.08, -4.4); m.scale.setScalar(0.55 + 0.42 * me); m.rotation.y = t * 0.8;
      this.halo.visible = true; this.halo.position.set(-side * 0.7, 3.3, -6.5); this.halo.scale.setScalar(6 + 8 * me); this.halo.material.color.set(info.hex); this.halo.material.opacity = 0.55;
      this.lines.visible = true; this.lines.position.set(-side * 0.7, 3.2, -8); this.lines.scale.setScalar(26 + u * 5); this.lines.rotation.z += dt * 0.5; this.lines.material.color.set(info.hex); this.lines.material.opacity = 0.55 * me;
      // push in close on the helmet, then crane back and down to reveal the Megaform towering behind
      const a = V3(side * 0.75, 1.5, 2.1), b = V3(side * 1.75, 0.5, 4.9), la = V3(0, 1.45, 0), lb = V3(-side * 0.25, 1.95, -1.4);
      v.setCam(a.lerp(b, e).add(V3(side * u * -0.25, u * 0.06, u * -0.2)), la.lerp(lb, e), 34 + 8 * e); return;
    }
    // ---------- C: finale
    const u = t - C0; if (this.shot !== 99) { this.shot = 99; this.nameEl.innerHTML = ""; this.lines.visible = false; SHOW.parts.clear(); v.scene.background.set("#0a0608"); this.doWipe("#ffd21f", 1); this.cap.textContent = "TOGETHER THEY ARE…"; AUDIO.sfx("whoosh"); }
    this.group(t, dt, u - 0.3); const e = easeOut(clamp(u / 2.2));
    v.setCam(V3(0, 0.75 + e * 0.75, 6.2 + e * 6.3 + u * 0.25), V3(0, 1.2 + e * 1.7, 0), 36 + 6 * e);
    if (u > 1.9 && !this.boomed) { this.boomed = true; for (let i = 0; i < 9; i++) SHOW.parts.boom(V3((i - 4) * 2.6, 0.5 + (i % 3) * 1.6, -3.5 - (i % 2) * 2), ["#ff8a2a", "#ffd21f", "#ff4a2a"][i % 3], 2.6); v.flash = 0.8; v.shake = 0.6; AUDIO.sfx("boom"); AUDIO.sfx("heavy"); this.cap.textContent = ""; }
    if (this.boomed) this.halo.material.opacity = 1;
    this.fade.style.opacity = clamp((u - 3.4) / 0.9);
    if (u > 4.6) this.toLogo();
  },
};
const easeOut = (x) => 1 - Math.pow(1 - x, 3);
const easeOutBack = (x) => { const c1 = 1.4, c3 = c1 + 1; return x <= 0 ? 0 : x >= 1 ? 1 : 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
