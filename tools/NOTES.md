# Ranger model repair – working notes (2026-11-14)
Problem: in game (and in the rendered movie) rangers deform badly: head sinks into chest, shoulder armour / collars stretch.
Found: Meshy auto-rig put the Neck joint at shoulder height (Ribosome worst: 2.6 cm above Spine2) and sometimes the Head
joint below the real neck; rigid armour is weighted to neck / arm / several spine bones so it bends.
Mocap itself is fine (idle = hunched guard: chest leans ~33 deg, head ~19 deg down).
Fix in progress: fixneck.py (moves Neck/Head joints to the mesh's narrowest neck slice, returns neck/head weight below
the neck to Spine2, moves upper-arm weight above the shoulder joint to shoulder/Spine2). Works on the repo's models/*.rmdl.
Test: serve a copy of the site, run t4.js (Playwright, close-up poses) and compare.
Live site currently has commit 30ceeb6 (movie + v3 models). Not yet pushed: neck fix.
Movie: same rigs are baked into the rendered frames; fixing the movie means re-rendering (rig fix must be ported to
rangers/*.glb + rig.json, i.e. P of Neck/Head and the weights).
- models_v4/ = all 15 with fixneck.py applied (neck+chest fix), tested OK on ribosome+mito, full-roster check running; not yet pushed.
