"""The auto-rig put the Neck joint down at shoulder height (and sometimes the Head joint below the real neck), so every
head turn swung the helmet on a long lever into the chest and dragged collars / shoulder armour with it.
Move Neck and Head to the real neck (narrowest slice of the mesh), hand neck/head weight below the neck back to the
chest, and keep rigid shoulder armour on the shoulder bone instead of the upper arm."""
import sys, numpy as np, rm
ss = lambda x: np.clip(x, 0, 1) ** 2 * (3 - 2 * np.clip(x, 0, 1))
def fix(src, out, log=print, pads=True):
    M = rm.load(src); H = M['H']; n = H['bones']; P = np.array(H['bpos']).reshape(-1, 3); pos = M['pos']; N = len(pos)
    ix = n.index; sp2, nk, hd = ix('Spine2'), ix('Neck'), ix('Head')
    Wd = np.zeros((N, len(n))); np.put_along_axis(Wd, M['jnt'].astype(int), M['wt'], 1); Wd /= np.maximum(Wd.sum(1, keepdims=True), 1e-9)
    # narrowest slice between the shoulders and the helmet
    top = pos[:, 1].max(); ys = np.arange(P[sp2][1] + 0.08, min(P[sp2][1] + 0.30, top - 0.18), 0.005); best = None
    for y in ys:
        s = pos[np.abs(pos[:, 1] - y) < 0.008]; c = np.median(s[np.abs(s[:, 0]) < 0.15][:, [0, 2]], 0) if len(s) > 30 else None
        if c is None: continue
        rr = np.hypot(s[:, 0] - c[0], s[:, 2] - c[1]); rr = rr[rr < 0.22]
        if len(rr) > 20:
            r = np.percentile(rr, 70)
            if best is None or r < best[0]: best = (r, y, c)
    r, yn, c = best
    newP = P.copy()
    newP[nk] = (0.0, yn - 0.05, c[1]); newP[hd] = (0.0, yn + 0.025, c[1])
    for k in ('HeadTop_End', 'headfront'):
        if k in n: newP[ix(k)] = P[ix(k)] + (newP[hd] - P[hd])
    # neck / head influence below the neck goes back to the chest
    y = pos[:, 1]; keep = ss((y - (newP[nk][1] - 0.035)) / 0.05)
    rad = np.hypot(pos[:, 0], pos[:, 2] - c[1]); keep *= np.where(y < yn, 1 - ss((rad - (r + 0.035)) / 0.04), 1.0)   # collars and pads beside the neck stay on the chest
    for j in (nk, hd):
        mv = Wd[:, j] * (1 - keep); Wd[:, j] -= mv; Wd[:, sp2] += mv
    # anything on the chest that hangs off Spine2 but sits in the neck column should now bend with the neck a little: leave as is
    moved_pad = 0
    if pads:
        for s in ('Left', 'Right'):
            a, sh = ix(s + 'Arm'), ix(s + 'Shoulder'); ay = P[a][1]
            f = ss((y - (ay + 0.045)) / 0.05)          # above the top of the shoulder joint = armour, not deltoid
            mv = Wd[:, a] * f; Wd[:, a] -= mv; Wd[:, sh] += mv * 0.5; Wd[:, sp2] += mv * 0.5; moved_pad += int((mv > 0.05).sum())
            fa = ix(s + 'ForeArm'); mv = Wd[:, fa] * f; Wd[:, fa] -= mv; Wd[:, sp2] += mv
    # The auto-rig hung the whole chest and upper back on the two collar-bone ("Shoulder") bones and almost nothing on
    # the chest bone, so any shrug sheared the torso in half. The middle of the torso belongs to Spine2.
    ax = np.abs(pos[:, 0]); chest = 0
    for s in ('Left', 'Right'):
        sh, a = ix(s + 'Shoulder'), ix(s + 'Arm'); jx = abs(P[a][0])
        keep_sh = ss((ax - 0.45 * jx) / (0.45 * jx))          # none at the centre line, full by the shoulder joint
        mv = Wd[:, sh] * (1 - keep_sh); Wd[:, sh] -= mv; Wd[:, sp2] += mv; chest += int((mv > 0.05).sum())
        for j in (a, ix(s + 'ForeArm'), ix(s + 'Hand')):
            keep_a = ss((ax - 0.55 * jx) / (0.3 * jx)); mv = Wd[:, j] * (1 - keep_a) * (y > P[ix('Hips')][1]); Wd[:, j] -= mv; Wd[:, sp2] += mv
    log('  chest verts returned to Spine2: %d' % chest)
    log('%s neck %.3f->%.3f head %.3f->%.3f (narrowest %.3f r %.3f) pad verts %d' % (src.split('/')[-1], P[nk][1], newP[nk][1], P[hd][1], newP[hd][1], yn, r, moved_pad))
    rm.save(M, out, Wd, newP)
if __name__ == '__main__':
    import os; out = sys.argv[1]; os.makedirs(out, exist_ok=True)
    for r in sys.argv[2:]: fix('/home/claude/organellerangers/models/%s.rmdl' % r, '%s/%s.rmdl' % (out, r))
