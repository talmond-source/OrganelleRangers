# Organelle Rangers

Biology · Mr. Almond

An arcade-style fighting game where the fighters are cell organelles and molecules. Pick one of 14 rangers, climb a tower of seven fights and stop the Phage. Every special move and Megaform is tied to the real job of that organelle, and a Science Check panel beside the game explains each move as it is used.

- **Play:** https://talmond-source.github.io/OrganelleRangers/
- **Controls:** arrow keys move, Z punches, X kicks, Z+X together is a special (alone or with a direction), SPACE is the Megaform once the meter is full. Hold away from the opponent to block.
- **Phones and tablets:** open the link, then use "Add to Home Screen" to install it like an app. It plays with an on-screen D-pad and A / B / SP / MEGA buttons; the move list is in the pause menu.
- **Modes:** Single Player (Easy, Medium, Hard) and Training.
- **Lighter graphics:** Chromebooks get a lighter 3D mode automatically. Add `?lite` or `?hq` to the link to force one or the other.

The playable game is `index.html` (one self-contained file built from `src/`), which works offline once loaded.


---

## For developers (and AI coding assistants)

**Golden rule:** never edit `index.html` by hand. Edit the files in `src/`, then rebuild:

```
cd src
python3 build.py          # writes ../index.html (the game)
python3 build.py local    # writes ../test.html (same game, no install-as-app bits) for local testing
```

Needs Python 3 only. To play locally, serve this folder (the game loads `models/` and `video/` from beside `index.html`):
`python3 -m http.server 8000` then open http://localhost:8000/?nomovie (`?nomovie` skips the intro movie, `?hq` / `?lite` force the graphics mode).

**Publishing is Tom's call.** Helpers working from a copy of this folder must not push to, connect to, or change the GitHub repository: the repository is the preserved backup of the working game. Hand back the changed files instead. When changing models or files the game caches, bump `CACHE` in `sw.js` and `VER` in `src/rmodel.js` so phones fetch the new version once Tom publishes it.

### Folder map
| Path | What it is |
|---|---|
| `index.html` | Built game (do not edit). |
| `src/` | **Editable source.** `build.py` joins these into `index.html`. |
| `src/head.html` | All CSS (screens, HUD, menus, touch pad). |
| `src/body.html` | All screen markup (menus, HUD, pause, character select, touch pad) and the intro-movie player script. |
| `src/app.js` | Screens and flow (movie -> press start -> main menu -> select -> fight -> results), keyboard/pad input, HUD, side column, main loop. |
| `src/fight.js` | Fight engine: fighters, physics, moves, hit detection, damage, meter, CPU AI, fight camera. Touch-pad input at the top. |
| `src/chars.js` | Roster (`ROSTER`): names, colours, science tags; base move data (`MOVES`). |
| `src/kits.js`, `src/kits2.js` | Special moves for each ranger (built from shot / strike / self templates). |
| `src/ults.js`, `src/megas.js` | Megaform ultimates (cinematics) and the Megaform models. |
| `src/rmodel.js` | Loads the sculpted 3D rangers (`models/*.rmdl`) and retargets the mocap animation onto them. |
| `src/ranger3d.js` | Mocap animation clips (sampling, cross-fades, `AN(name, frame)` poses). |
| `src/view.js` | Renderer, lights, post-processing, camera shake, impact frames. |
| `src/fx.js` | Hit sparks, smoke, projectile looks, 2D banners. |
| `src/stages.js` | The training-room arena. |
| `src/intro.js` | Logo backdrop behind PRESS START (the old live intro is unused now that the movie plays). |
| `src/audio.js` | Synthesized sound effects and music (no audio files). |
| `src/engine.js`, `src/models.js`, `src/rig.js`, `src/suit.js`, `src/bodymesh.js`, `src/extras.js` | Older helpers and the earlier painted-body ranger system (still used for some fallbacks / megaform parts). |
| `src/assets.js`, `src/data/assets.js` | Embedded data: animation clips, skeleton, character sheets (base64). |
| `src/vendor.min.js` | three.js (r150-era) + post-processing, bundled. |
| `src/fonts/` | Fonts embedded into the page at build time. |
| `models/*.rmdl` | The 15 game models (14 rangers + Phage) in the game's compact format. |
| `models_glb/*.glb` | **Same 15 models as standard skinned glTF** (open in Blender, three.js, Unity, Unreal). Rig repairs included. |
| `video/intro.mp4`, `video/intro_sd.mp4` | Pre-rendered intro movie (720p, and 480p for phones/Chromebooks). |
| `tools/` | Python tools: `rmdl2glb.py` (game model -> .glb), `glb2rmdl.py`, `fixneck.py` (rig repair), `rm.py`, `NOTES.md` (repair history and open issues). |
| `sw.js`, `manifest.webmanifest`, `icon-*.png` | Install-as-app (PWA) and offline cache. |
| `refs/` | Reference art. |

### How the 3D rangers work
Each `.rmdl` is a skinned mesh: bind-pose skeleton (Mixamo bone names), 4 bone weights per vertex, colour / normal / metal-roughness textures, plus `D` (per-bone retarget rotations) and `hipOff`. The game's mocap clips are applied with `L_target = inv(D_parent) * L_source * D_self` (see `src/rmodel.js`). The `.glb` copies keep `clipBones`, `D` and `hipOff` under `extras.organelleRangers`. To bring an edited model back into the game, convert it with `tools/glb2rmdl.py` (needs the matching rig JSON layout described in that file) or extend `rmdl2glb.py` in reverse.

### Known open issues (Nov 2026)
- The Phage shows a few thin stretched strands from arm to chest on punches (skin weights).
- The intro movie was rendered before the rig repair, so some bodies in it look warped; the Blender project for the movie is on Tom's Mac (`~/Movies/OrganelleRangersMovie`).
