import json, struct, numpy as np
def load(p):
    b = open(p, 'rb').read(); hl = struct.unpack('<I', b[4:8])[0]; H = json.loads(b[8:8+hl]); base = 8+hl
    v = lambda k, T, n: np.frombuffer(b, T, n, base + H['views'][k][0]).copy()
    N = H['count']; q = v('pos', np.uint16, N*3).reshape(-1, 3); lo, hi = np.array(H['lo']), np.array(H['hi'])
    return dict(H=H, b=b, base=base, pos=lo + q/65535*(hi-lo), jnt=v('jnt', np.uint8, N*4).reshape(-1, 4), wt=v('wt', np.uint8, N*4).reshape(-1, 4)/255.0)
def save(M, out, Wd, P):
    H = M['H']; b = M['b']; base = M['base']
    top = np.argsort(-Wd, 1)[:, :4]; tw = np.take_along_axis(Wd, top, 1); tw /= np.maximum(tw.sum(1, keepdims=True), 1e-9)
    w8 = np.round(tw*255).astype(np.int32); w8[:, 0] += 255 - w8.sum(1); w8 = np.clip(w8, 0, 255).astype(np.uint8)
    body = bytearray(b[base:]); o, n = H['views']['jnt']; body[o:o+n] = top.astype(np.uint8).tobytes(); o, n = H['views']['wt']; body[o:o+n] = w8.tobytes()
    H = dict(H); H['bpos'] = np.round(P, 6).ravel().tolist()
    hb = json.dumps(H, separators=(',', ':')).encode(); hb += b' ' * ((-len(hb)) % 4)
    open(out, 'wb').write(b'RMDL' + struct.pack('<I', len(hb)) + hb + bytes(body))
