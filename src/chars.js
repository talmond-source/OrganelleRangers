/* ================= Ranger looks (matched to the model sheets) and move data ================= */
function stripe(x, cx, w, col, H) { x.fillStyle = col; x.fillRect(cx - w / 2, 0, w, H); }
function honeycomb(x, x0, y0, x1, y1, r, line, fill) {
  x.save(); x.beginPath(); x.rect(x0, y0, x1 - x0, y1 - y0); x.clip(); x.fillStyle = fill; x.fillRect(x0, y0, x1 - x0, y1 - y0);
  x.strokeStyle = line; x.lineWidth = r * 0.28; const dx = r * Math.sqrt(3), dy = r * 1.5;
  for (let j = -1; j * dy < y1 - y0 + r * 2; j++) for (let i = -1; i * dx < x1 - x0 + r * 2; i++) { const cx = x0 + i * dx + (j % 2 ? dx / 2 : 0), cy = y0 + j * dy; x.beginPath(); for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r; k ? x.lineTo(px, py) : x.moveTo(px, py); } x.closePath(); x.stroke(); }
  x.restore();
}
function finShape(pts) { const s = new THREE.Shape(); pts.forEach((p, i) => (i ? s.lineTo(p[0], p[1]) : s.moveTo(p[0], p[1]))); s.closePath(); return s; }
function finMesh(pts, depth, mat, bevel = 0.006) { const g = new THREE.ExtrudeGeometry(finShape(pts), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 }); g.translate(0, 0, -depth / 2); g.computeVertexNormals(); return new THREE.Mesh(g, mat); }
const gloss = (c, o = {}) => M(c, Object.assign({ physical: true, clearcoat: 1, ccr: 0.1, rough: 0.3, env: 0.7, rimStr: 0.14 }, o));
const metal = (c, o = {}) => M(c, Object.assign({ metal: 0.85, rough: 0.28, env: 1.4, rimStr: 0.25 }, o));

/* belt ring + buckle, worn on the hips joint */
function addBelt(J, col, buckle) {
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.151, 0.151, 0.045, 28, 1, true), col.isMaterial ? col : metal(col)); belt.material.side = THREE.DoubleSide;
  belt.scale.z = 0.8; belt.position.y = 0.075; J.hips.add(belt);
  if (buckle) { buckle.position.set(0, 0.075, 0.122); J.hips.add(buckle); }
  return belt;
}
function addCuff(J, s, mat, y = -0.13, r = 0.047, h = 0.045) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.95, h, 18), mat); c.position.y = y; J["elbow" + s].add(c); return c; }
function addBootTop(J, s, mat, y = -0.17, r = 0.066, h = 0.045) { const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 18), mat); c.position.y = y; J["knee" + s].add(c); return c; }

const LOOKS = {};
/* ---------- GREEN · ATP RANGER ---------- */
LOOKS.atp = {
  suit: "#13afa0", helmet: "#20b882", glove: "#22c46a", boot: "#22c46a", neck: "#13afa0", rim: "#bfffe9",
  paint: {
    chest(x, w, h) {
      // yellow piping down both sides of the front, honeycomb over the wearer's left shoulder
      honeycomb(x, w * 0.56, 0, w * 0.74, h * 0.55, 13, "#e5b02e", "#2fc6b0");
      x.fillStyle = "#13afa0"; x.beginPath(); x.moveTo(w * 0.56, h * 0.55); x.lineTo(w * 0.62, h * 0.55); x.lineTo(w * 0.56, h * 0.3); x.fill();
      stripe(x, w * 0.37, 7, "#f4d63d", h); stripe(x, w * 0.63, 7, "#f4d63d", h);
      x.fillStyle = "rgba(0,0,0,.12)"; x.fillRect(0, 0, w * 0.22, h); x.fillRect(w * 0.78, 0, w * 0.22, h);
    },
    abs(x, w, h) { stripe(x, w * 0.37, 4, "#f4d63d", h); stripe(x, w * 0.63, 4, "#f4d63d", h); },
    pelvis(x, w, h) { stripe(x, w * 0.33, 4, "#f4d63d", h); stripe(x, w * 0.67, 4, "#f4d63d", h); },
    upper(x, w, h, s) { if (s === "L") honeycomb(x, 0, 0, w, h * 0.45, 9, "#e5b02e", "#2fc6b0"); },
    fore(x, w, h) { x.fillStyle = "#22c46a"; x.fillRect(0, h * 0.42, w, h); },
    thigh(x, w, h, s) { stripe(x, w * (s === "L" ? 0.72 : 0.28), 9, "#f4d63d", h); },
    shin(x, w, h, s) { stripe(x, w * (s === "L" ? 0.72 : 0.28), 9, "#f4d63d", h * 0.4); x.fillStyle = "#22c46a"; x.fillRect(0, h * 0.36, w, h); x.fillStyle = "rgba(255,255,255,.18)"; x.fillRect(0, h * 0.36, w, 5); },
  },
  paintHelmet(x, w, h) {
    // lime visor frame + chin V
    x.fillStyle = "#6ff04a"; polyPath(x, [[-52, 74], [-12, 76], [0, 80], [12, 76], [52, 74], [52, 95], [16, 100], [0, 106], [-16, 100], [-52, 95]], HX, HY, w, h); x.fill();
    x.strokeStyle = "rgba(0,60,30,.35)"; x.lineWidth = 3; x.beginPath(); x.moveTo(HX(-26, w), HY(112, h)); x.lineTo(HX(0, w), HY(128, h)); x.lineTo(HX(26, w), HY(112, h)); x.stroke();
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,255,255,.18)"); g.addColorStop(0.4, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(0,0,0,.15)"); x.fillStyle = g; x.fillRect(0, 0, w, h);
  },
  visorShape(x, w, h) { polyPath(x, [[-47, 78], [-12, 80], [0, 84], [12, 80], [47, 78], [47, 92], [15, 96], [0, 101], [-15, 96], [-47, 92]], VX, VY, w, h); x.fill(); },
  helmetExtras(g, R) {
    const m = gloss("#20b882");
    const fin = finMesh([[0, 0], [0.04, 0.016], [0.066, 0.06], [0.047, 0.085], [0.024, 0.047], [-0.055, 0.016], [-0.085, -0.008]], 0.019, m, 0.006);
    fin.rotation.y = -Math.PI / 2; fin.position.set(0, R * 1.02, 0.02); g.add(fin);
    for (const s of [-1, 1]) { const ear = finMesh([[0, 0], [0.06, 0.055], [0.016, -0.028]], 0.016, m, 0.005); ear.position.set(s * R * 0.98, 0.0, -0.01); ear.rotation.set(0, s > 0 ? 0.3 : Math.PI - 0.3, 0.15); g.add(ear); }
  },
  extras(J) {
    const rim = metal("#c5c9c6"), yel = gloss("#f4d63d", { emissive: "#f4d63d", ei: 0.12 });
    // the three ATP "phosphate" discs on the chest
    const discs = [];
    [[-0.032, 0.2], [0.032, 0.2], [0.0, 0.25]].forEach((p, i) => {
      const d = new THREE.Group(); d.add(new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.033, 0.014, 24), rim)); const f = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.016, 24), yel); f.position.y = 0.001; d.add(f);
      d.rotation.x = Math.PI / 2 - 0.12; d.position.set(p[0] - 0.02, p[1], 0.117); J.chest.add(d); discs.push(d);
    });
    J.chest.userData.discs = discs;
    const bm = gloss("#22c46a"); addBelt(J, bm, (() => { const b = new THREE.Group(); const hx = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.02, 6), M("#14321f", { rough: 0.3 })); hx.rotation.x = Math.PI / 2; hx.rotation.y = Math.PI / 2; const c = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.022, 6), gloss("#7ef25a", { emissive: "#7ef25a", ei: 0.3 })); c.rotation.x = Math.PI / 2; c.rotation.y = Math.PI / 2; b.add(hx, c); return b; })());
    for (const s of ["L", "R"]) { addCuff(J, s, bm, -0.125, 0.048, 0.05); addBootTop(J, s, bm, -0.16, 0.062, 0.036); }
  },
};

/* ---------- RED · RIBOSOME RANGER ---------- */
LOOKS.ribosome = {
  suit: "#c9212b", helmet: "#c9212b", glove: "#e6e2ef", boot: "#f2f0f4", neck: "#d8d2e4", rim: "#ffd0c8",
  paint: {
    chest(x, w, h) {
      // lavender V panel with gold border, front and back
      const panel = (cx, half) => { x.fillStyle = "#c78b32"; x.beginPath(); x.moveTo(cx - half, 0); x.lineTo(cx + half, 0); x.lineTo(cx, h * 0.9); x.closePath(); x.fill();
        x.fillStyle = "#d8d2e4"; x.beginPath(); x.moveTo(cx - half + 16, 0); x.lineTo(cx + half - 16, 0); x.lineTo(cx, h * 0.72); x.closePath(); x.fill(); };
      panel(w * 0.5, w * 0.2); panel(0, w * 0.2); panel(w, w * 0.2);
      x.fillStyle = "rgba(0,0,0,.12)"; x.fillRect(w * 0.2, h * 0.6, w * 0.06, h); x.fillRect(w * 0.74, h * 0.6, w * 0.06, h);
    },
    fore(x, w, h) { x.fillStyle = "#e6e2ef"; x.fillRect(0, h * 0.5, w, h); },
    shin(x, w, h) { x.fillStyle = "#f2f0f4"; x.fillRect(0, h * 0.42, w, h); },
  },
  paintHelmet(x, w, h) {
    x.fillStyle = "#c78b32";
    polyPath(x, [[-56, 72], [-14, 80], [0, 86], [14, 80], [56, 72], [56, 96], [18, 102], [0, 99], [-18, 102], [-56, 96]], HX, HY, w, h); x.fill();
    // gold sweeps from the crown to the visor corners
    x.lineWidth = 13; x.strokeStyle = "#d29a3a"; x.lineCap = "round";
    for (const s of [-1, 1]) { x.beginPath(); x.moveTo(HX(s * 4, w), HY(24, h)); x.quadraticCurveTo(HX(s * 22, w), HY(48, h), HX(s * 50, w), HY(74, h)); x.stroke(); }
    x.fillStyle = "#d8d2e4"; polyPath(x, [[-30, 100], [-14, 104], [0, 102], [14, 104], [30, 100], [24, 120], [0, 128], [-24, 120]], HX, HY, w, h); x.fill();
    x.fillStyle = "#9b93ad"; x.fillRect(HX(-14, w), HY(116, h), HX(14, w) - HX(-14, w), 4);
    x.fillStyle = "#111119"; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(HX(s * 14, w), HY(58, h), 9, 5, s * 0.5, 0, TAU); x.fill(); }
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, "rgba(255,255,255,.2)"); g.addColorStop(0.45, "rgba(255,255,255,0)"); g.addColorStop(1, "rgba(0,0,0,.18)"); x.fillStyle = g; x.fillRect(0, 0, w, h);
  },
  visorShape(x, w, h) { polyPath(x, [[-50, 81], [-16, 85], [0, 89], [16, 85], [50, 81], [50, 93], [18, 99], [0, 97], [-18, 99], [-50, 93]], VX, VY, w, h); x.fill(); },
  helmetExtras(g, R) { const m = metal("#d29a3a"); const c = finMesh([[0, 0], [0.03, 0.02], [0.0, 0.05], [-0.03, 0.02]], 0.014, m, 0.004); c.position.set(0, R * 0.62, R * 0.97); c.rotation.x = -0.6; g.add(c); },
  extras(J) {
    const gold = metal("#c78b32");
    for (const s of [-1, 1]) { // pointed gold shoulder pads
      const pad = finMesh([[-0.02, 0], [0.14, -0.025], [0.165, 0.03], [0.09, 0.035], [0.0, 0.045]], 0.12, gold, 0.01);
      pad.position.set(s * 0.1, DIM.chestH * 0.93, 0); pad.rotation.set(0, 0, s > 0 ? -0.18 : Math.PI + 0.18); if (s < 0) pad.rotation.x = Math.PI; J.chest.add(pad);
    }
    // ribosome emblem: concentric bead rings around a yellow centre
    const em = new THREE.Group(); const cols = [["#22b8b1", "#d74780"], ["#d74780", "#f1c746"], ["#f1c746"]];
    const ring = (r, n, cs, size) => { for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const b = new THREE.Mesh(new THREE.SphereGeometry(size, 8, 6), gloss(cs[i % cs.length], { emissive: cs[i % cs.length], ei: 0.08 })); b.position.set(Math.cos(a) * r, Math.sin(a) * r, 0); em.add(b); } };
    ring(0.058, 22, cols[0], 0.0105); ring(0.04, 16, cols[1], 0.0095); ring(0.018, 8, ["#f1c746"], 0.011);
    em.add(new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), gloss("#f1c746")));
    em.position.set(0, 0.21, 0.11); em.rotation.x = -0.12; J.chest.add(em); J.chest.userData.emblem = em;
    const silver = metal("#dad9d6"); const bk = new THREE.Group(); bk.add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.048, 0.02), gold)); const ins = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.028, 0.022), M("#111119")); bk.add(ins);
    addBelt(J, silver, bk);
    for (const s of ["L", "R"]) { addCuff(J, s, gold, -0.135, 0.047, 0.055); addBootTop(J, s, gold, -0.185, 0.06, 0.028); }
  },
};

/* ---------- roster: everyone shows on the select screen; Phase 1 plays ATP + Ribosome ---------- */
const KITS_READY = { atp: 1, ribosome: 1, rougher: 1, golgi: 1, cytoplasm: 1, membrane: 1, mito: 1, nucleus: 1, smoother: 1, lysosome: 1, dna: 1, rna: 1, mitosis: 1, crispr: 1 };
const ROSTER = [
  { id: "atp", name: "ATP Ranger", color: "Green", hex: "#20b882", dark: "#0c5a4f", accent: "#f4d63d", style: "Fast rushdown", ready: true },
  { id: "ribosome", name: "Ribosome Ranger", color: "Red", hex: "#c9212b", dark: "#5a0c12", accent: "#c78b32", style: "Combo grappler", ready: true },
  { id: "rougher", name: "Rough ER Ranger", color: "Orange", hex: "#e47a21", dark: "#5c2c08", accent: "#bec3cc" },
  { id: "golgi", name: "Golgi Ranger", color: "Yellow", hex: "#e4b51d", dark: "#5a4508", accent: "#16b8c3" },
  { id: "cytoplasm", name: "Cytoplasm Ranger", color: "Blue", hex: "#17478e", dark: "#0b2149", accent: "#d5d8d9" },
  { id: "membrane", name: "Cell Membrane Ranger", color: "Pink", hex: "#e74791", dark: "#5c1236", accent: "#c99a36" },
  { id: "mito", name: "Mitochondria Ranger", color: "White", hex: "#f0f0ee", dark: "#4a4a48", accent: "#b68134" },
  { id: "nucleus", name: "Nucleus Ranger", color: "Purple", hex: "#54258a", dark: "#22103a", accent: "#c59a3e" },
  { id: "smoother", name: "Smooth ER Ranger", color: "Teal", hex: "#087f83", dark: "#033435", accent: "#a23bc5" },
  { id: "lysosome", name: "Lysosome Ranger", color: "Maroon", hex: "#741a35", dark: "#2c0914", accent: "#b8bec3" },
  { id: "dna", name: "DNA Ranger", color: "Gold", hex: "#c59a39", dark: "#4a3610", accent: "#3969b2" },
  { id: "rna", name: "RNA Ranger", color: "Shadow", hex: "#7139c8", dark: "#100b18", accent: "#9c201d" },
  { id: "mitosis", name: "Mitosis Ranger", color: "Chrome", hex: "#c5cbd1", dark: "#4b5058", accent: "#d21a9a" },
  { id: "crispr", name: "CRISPR Ranger", color: "Nanotech", hex: "#13c9c6", dark: "#14304a", accent: "#e544b8" },
];
const BYID = Object.fromEntries(ROSTER.map((r) => [r.id, r]));

/* move list + science shown in the side column (keys filled in by the UI) */
const MOVES = {
  atp: {
    fact: "ATP (adenosine triphosphate) is the cell's energy currency. Snapping off the last of its three phosphates releases the energy that powers almost every job in the cell.",
    specials: [
      { dir: "", name: "Phosphate Snap", desc: "Energy blast. Your third phosphate flies off; you're ADP for 3 seconds.", bio: "ATP → ADP + phosphate releases energy. Cells rebuild ATP constantly, about your body weight's worth every day." },
      { dir: "fwd", name: "Power Stroke", desc: "Lunging punch that crosses half the screen.", bio: "Myosin spends one ATP per pull on actin. Millions of these power strokes make a muscle contract." },
      { dir: "down", name: "Overdrive", desc: "Close-range zap that paralyzes the opponent briefly.", bio: "ATP's energy drives ion pumps and nerve signals; a sudden surge is a jolt." },
    ],
    ult: { name: "ATP Synthase Turbine", bio: "ATP synthase is a real rotary motor. Protons rushing through spin its rotor about 100 times a second, and each turn builds 3 ATP." },
  },
  ribosome: {
    fact: "Ribosomes build proteins. They read mRNA three letters (one codon) at a time and link the matching amino acids into a chain.",
    specials: [
      { dir: "", name: "tRNA Delivery", desc: "Throws a tRNA carrying an amino acid.", bio: "Each tRNA carries one amino acid and matches a codon with its anticodon." },
      { dir: "fwd", name: "Polypeptide Lash", desc: "Amino-acid whip. Gets longer every time it hits (up to 4 links).", bio: "The ribosome adds one amino acid at a time; a protein can be thousands long." },
      { dir: "down", name: "Codon Combo", desc: "Rush combo that starts on AUG and ends on a STOP codon.", bio: "Translation starts at AUG (methionine) and ends at a stop codon: UAA, UAG or UGA." },
    ],
    ult: { name: "Amino Acid Constrictor", bio: "A new protein leaves the ribosome as a long chain of amino acids joined by peptide bonds, then folds into its working shape." },
  },
};

Object.assign(MOVES, {"rougher": {"fact": "Ribosome-studded membrane that makes, folds and ships proteins.", "specials": [{"dir": "", "name": "Ribosome Shot", "desc": "Fires the ribosomes studding its armor.", "bio": "Rough ER is “rough” because ribosomes are attached to its surface."}, {"dir": "fwd", "name": "Protein Processor", "desc": "Grabs the opponent and comically folds them into a knotted ball. Stun.", "bio": "New proteins fold into their 3D (tertiary) shape inside the ER."}, {"dir": "down", "name": "Signal Hook", "desc": "Grabs the opponent and reels them in.", "bio": "A signal sequence on a new protein docks it onto the ER."}], "ult": {"name": "Rough ER", "bio": "Proteins made on the rough ER leave in vesicles headed for the Golgi."}}, "golgi": {"fact": "The cell's shipping department: modifies, sorts and packages proteins.", "specials": [{"dir": "", "name": "Tag & Ship", "desc": "Marks the opponent with a sugar tag. The next vesicle “delivered” to them hits extra hard.", "bio": "The Golgi adds sugar tags that act like shipping labels."}, {"dir": "fwd", "name": "Vesicle Transport", "desc": "Wraps itself in a vesicle and teleports behind the opponent.", "bio": "Vesicles carry cargo from one place in the cell to another."}, {"dir": "down", "name": "Cis-to-Trans Dash", "desc": "Slides through its own stack and comes out the far side.", "bio": "Cargo enters the Golgi's cis face and leaves from the trans face."}], "ult": {"name": "Golgi Apparatus", "bio": "Vesicles from the trans face fuse with the membrane and release their contents (exocytosis)."}}, "cytoplasm": {"fact": "The gel-like fluid that fills the cell and holds the organelles.", "specials": [{"dir": "", "name": "Cytoplasmic Streaming", "desc": "Makes the floor flow, pushing the opponent.", "bio": "Cytoplasm moves in currents that carry materials around the cell."}, {"dir": "fwd", "name": "Microtubule Staff", "desc": "A long, hollow-tube staff for long-reach hits.", "bio": "Microtubules are hollow protein tubes in the cytoskeleton."}, {"dir": "down", "name": "CytoCurrents", "desc": "Opens a whirlpool that sucks in the opponent and drops them from a new whirlpool in the ceiling.", "bio": "Streaming cytoplasm moves things from one part of the cell to another."}], "ult": {"name": "Cytoplasm Colossus", "bio": "Cytosol is mostly water thickened with dissolved proteins, salts and sugars, so it behaves like a gel."}}, "membrane": {"fact": "The cell's border. Decides what gets in and what stays out.", "specials": [{"dir": "", "name": "Selective Guard", "desc": "A short parry that stops big projectiles; small fast ones still get through.", "bio": "The membrane is selectively permeable: small molecules pass, large ones need help."}, {"dir": "fwd", "name": "Endocytosis", "desc": "Pinches in around the opponent and swallows them. Command grab.", "bio": "Cells take in large particles by folding the membrane around them."}, {"dir": "down", "name": "Na⁺/K⁺ Pump", "desc": "Launches a triple sodium projectile, then spends a 3-second cooldown eating 2 potassium.", "bio": "The pump moves 3 Na⁺ out and 2 K⁺ in for every ATP it uses."}], "ult": {"name": "Fluid Mosaic Membrane", "bio": "The membrane is a fluid bilayer with proteins floating in it, like a mosaic."}}, "mito": {"fact": "Powerhouse of the cell. Turns food energy into ATP through cellular respiration.", "specials": [{"dir": "", "name": "Krebs Cycle", "desc": "A spinning attack that builds meter.", "bio": "The Krebs cycle strips energy-carrying electrons from food molecules."}, {"dir": "fwd", "name": "Electron Transport Chain", "desc": "Pulls a stream of glowing electrons out of the opponent, shapes them into a projectile and launches it back at them.", "bio": "The chain passes electrons along a line of proteins in the inner membrane, pumping protons as it goes."}, {"dir": "down", "name": "ATP Synthase Drill", "desc": "A spinning rotor punch powered by the proton gradient it has built up.", "bio": "Protons rushing back through ATP synthase power ATP production."}], "ult": {"name": "Mitochondrion Pinball", "bio": "The inner membrane folds into cristae, adding surface area for making ATP."}}, "nucleus": {"fact": "The control center. Holds the DNA and controls which genes are used.", "specials": [{"dir": "", "name": "Nucleolus Orb", "desc": "Hurls its nucleolus.", "bio": "The nucleolus makes the parts of ribosomes."}, {"dir": "fwd", "name": "Nuclear Pore Warp", "desc": "Teleports through a nuclear pore.", "bio": "Nuclear pores are gated channels through the double membrane."}, {"dir": "down", "name": "Envelope Barrier", "desc": "A double-membrane shield.", "bio": "The nuclear envelope is two membranes protecting the DNA."}], "ult": {"name": "Razor Nucleus", "bio": "mRNA leaves the nucleus through nuclear pores to reach the ribosomes."}}, "smoother": {"fact": "Ribosome-free tubes that make lipids, break down toxins and store calcium.", "specials": [{"dir": "", "name": "Detox", "desc": "Neutralizes an incoming projectile and clears its own debuffs.", "bio": "Smooth ER enzymes break down drugs and toxins (lots of it in liver cells)."}, {"dir": "fwd", "name": "Calcium Burst", "desc": "A calcium pulse that briefly locks the opponent's muscles. Stun.", "bio": "Smooth ER stores calcium; releasing it triggers muscle contraction."}, {"dir": "down", "name": "Lipid Slick", "desc": "An oil slick on the floor that makes the opponent slip.", "bio": "Smooth ER makes lipids, including the phospholipids in membranes."}], "ult": {"name": "Smooth ER", "bio": "Smooth ER is a tube network continuous with the rough ER."}}, "lysosome": {"fact": "The cell's recycling and cleanup crew, full of acid-loving digestive enzymes.", "specials": [{"dir": "", "name": "Enzyme Grenade", "desc": "Lobs a vesicle of digestive enzymes that breaks the opponent's guard.", "bio": "Lysosomes hold hydrolytic enzymes that break large molecules into building blocks."}, {"dir": "fwd", "name": "Autophagy", "desc": "Recycles its own armor to heal 14, costing some meter.", "bio": "In autophagy, lysosomes digest worn-out organelles so the parts can be reused."}, {"dir": "down", "name": "Acid Pool", "desc": "Drops a low-pH puddle that slowly wears the opponent down while they stand in it.", "bio": "Lysosomes keep their inside acidic (about pH 4.5), which their enzymes need."}], "ult": {"name": "Lysosome", "bio": "Lysosomes fuse with vesicles carrying waste or invaders and break them down."}}, "dna": {"fact": "The genetic instructions for building and running the cell.", "specials": [{"dir": "", "name": "Replication Clone", "desc": "Unzips and sends a temporary copy of itself charging forward.", "bio": "DNA replication is semi-conservative: each copy keeps one old strand and builds one new one."}, {"dir": "fwd", "name": "Base Pair Lock", "desc": "A grab that always lands. The animation shows the A–T and G–C pairing as it locks on.", "bio": "A always pairs with T and G always pairs with C."}, {"dir": "down", "name": "Helix Drill", "desc": "A spinning double-helix uppercut.", "bio": "DNA is a right-handed double helix with about 10.5 base pairs per turn."}], "ult": {"name": "Double Helix", "bio": "DNA coils tighter and tighter to fit inside the nucleus."}}, "rna": {"fact": "Single-stranded messenger, adapter and builder; short-lived on purpose.", "specials": [{"dir": "", "name": "Transcript", "desc": "Copies the opponent's last special attack.", "bio": "mRNA is a copy of a gene's instructions."}, {"dir": "fwd", "name": "mRNA Malice", "desc": "Draws a single-stranded “mRNA sword” for 7 seconds; basic attacks do extra damage.", "bio": "mRNA is a single strand, unlike double-stranded DNA."}, {"dir": "down", "name": "Uracil Swap", "desc": "Swaps places with the opponent.", "bio": "RNA uses uracil (U) in place of thymine (T)."}], "ult": {"name": "Folded tRNA", "bio": "tRNA folds into an L shape and matches codons using its anticodon."}}, "mitosis": {"fact": "Cell division: one cell becomes two identical cells. Each special moves to the next phase, in order.", "specials": [{"dir": "", "name": "Prophase", "desc": "Armors up as its chromosomes condense.", "bio": "Chromosomes condense and become visible; the spindle starts to form."}, {"dir": "fwd", "name": "Metaphase", "desc": "Pins the opponent at center screen.", "bio": "Chromosomes line up in the middle of the cell."}, {"dir": "down", "name": "Anaphase", "desc": "Sends both fighters to opposite sides of the screen.", "bio": "Sister chromatids are pulled to opposite ends of the cell."}, {"dir": "back", "name": "Telophase / Cytokinesis", "desc": "Splits off a second fighter that charges forward.", "bio": "Two new nuclei form and the cell pinches into two."}], "ult": {"name": "Multicellular Mech", "bio": "Repeated mitosis is how one cell grows into a multicellular body."}}, "crispr": {"fact": "A gene-editing tool, borrowed from bacteria, that cuts DNA at an exact address.", "specials": [{"dir": "", "name": "Guide RNA Lock-On", "desc": "A targeting reticle; the next hit can't miss.", "bio": "A 20-letter guide RNA leads Cas9 to the matching DNA sequence."}, {"dir": "fwd", "name": "Cas9 Cut", "desc": "A double-strand-break slash.", "bio": "Cas9 cuts both strands of the DNA."}, {"dir": "down", "name": "PAM Check", "desc": "High risk, high reward: a 50/50 coin flip with equal stakes. PAM present: the opponent loses 50% of their remaining health. PAM absent: CRISPR Ranger loses 50% of its own remaining health.", "bio": "Cas9 only cuts next to a PAM site (NGG); without one, nothing happens."}, {"dir": "back", "name": "Repair Choice", "desc": "Heal: precise (HDR, +14) from far away, quick and sloppy (NHEJ, +6) up close.", "bio": "Cells fix cuts by quick end-joining or by copying a template."}], "ult": {"name": "Cas9", "bio": "Cas9 has two cutting domains, one for each DNA strand."}}});
ROSTER.forEach((r) => { r.ready = !!KITS_READY[r.id]; });

const STYLES = {"ATP Ranger": "Fast rushdown", "Ribosome Ranger": "Combo grappler", "Rough ER Ranger": "Defensive zoner", "Golgi Ranger": "Trap setter", "Cytoplasm Ranger": "Terrain control", "Cell Membrane Ranger": "Counter fighter", "Mitochondria Ranger": "Heavy hitter", "Nucleus Ranger": "Control / boss-tier", "Smooth ER Ranger": "Status effects", "Lysosome Ranger": "Armor breaker", "DNA Ranger": "Balanced hero", "RNA Ranger": "Trickster", "Mitosis Ranger": "Phase cycler", "CRISPR Ranger": "Precision sniper"}; ROSTER.forEach((r) => { if (!r.style) r.style = STYLES[r.name] || ""; });

const PHAGE = { id: "phage", name: "Phage Ranger", color: "Rust", hex: "#c9623a", dark: "#3a1a0c", accent: "#b9e4d6", style: "Final boss", boss: true, ready: false };
BYID.phage = PHAGE;
MOVES.phage = { fact: "A bacteriophage is a virus that infects bacteria. It lands on the cell, injects its DNA, and turns the cell into a virus factory.",
  specials: [
    { dir: "", name: "DNA Injection", desc: "Fires its genome like a syringe.", bio: "A phage's tail works like a needle: the sheath contracts and drives the viral DNA through the cell wall." },
    { dir: "fwd", name: "Tail Fiber Grab", desc: "Long-range grab that cannot be blocked.", bio: "Tail fibers recognise and latch onto specific receptor molecules on the host cell's surface. No match, no infection." },
    { dir: "down", name: "Lytic Burst", desc: "Bursts outward in both directions.", bio: "In the lytic cycle, new phages build up until the host cell bursts open (lysis), releasing hundreds of copies." }],
  ult: { name: "T4 Bacteriophage", bio: "The T4 phage: an icosahedral head packed with DNA, a contractile tail, a baseplate and six tail fibers. It is one of the most studied viruses in biology." } };
