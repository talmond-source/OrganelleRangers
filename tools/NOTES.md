# Ranger model repair – working notes (2026-11-14)
Problem: in game (and in the rendered movie) rangers deform badly: head sinks into chest, shoulder armour / collars stretch.
Found: Meshy auto-rig put the Neck joint at shoulder height (Ribosome worst: 2.6 cm above Spine2) and sometimes the Head
joint below the real neck; rigid armour is weighted to neck / arm / several spine bones so it bends.
Mocap itself is fine (idle = hunched guard: chest leans ~33 deg, head ~19 deg down).
Fix in progress: fixneck.py (moves Neck/Head joints to the mesh's narrowest neck slice, returns neck/head weight below
the neck to Spine2, moves upper-arm weight above the shoulder joint to shoulder/Spine2). Works on the repo's models/*.rmdl.
Test: serve a copy of the site, run t4.js (Playwright, close-up poses) and compare.
Movie: same rigs are baked into the rendered frames; fixing the movie means re-rendering (rig fix must be ported to
rangers/*.glb + rig.json, i.e. P of Neck/Head and the weights).
- All 15 models in models/ have the neck + chest repair (fixneck.py) applied and were checked close up in stance, punch and kick.
- 2026-11-15: pause button (PAUSE under timer; P / Enter / Esc) and a fight camera that keeps both fighters in frame are in the current build.
- Open: Phage stray strands (arm→chest) on punches; movie still has old rigs baked in (needs a re-render after rig fixes are ported to the Blender rangers).
- 2026-11-16: merged Tom's ChatGPT update (Cell in Crisis mode removed at Tom's request). Intentional performance choices by Tom: Megaforms are 2D PNG sprites (images/mega/), no bloom / colour grade, no floor reflection, 2048 shadows, side column shows only the player's moves. Ribosome model re-made by ChatGPT (upright head; shoulder-pad edges look jagged in close-ups). Smoother render interpolation and basic-attack timing in fight.js.
