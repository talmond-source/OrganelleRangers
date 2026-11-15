"""Write a game .rmdl from a finished movie-rig GLB (rangers_v3: fixed joints + repaired skin weights),
keeping the texture blobs of the existing game model (avoids a second JPEG pass)."""
import json, struct, sys, numpy as np
sys.path.insert(0, "/home/claude/rangers/meshy")
from convert import read_glb, acc

def load_rmdl(p):
    b = open(p, "rb").read(); hl = struct.unpack("<I", b[4:8])[0]; H = json.loads(b[8:8 + hl]); return H, b, 8 + hl

def build(glb, rig, old, out):
    g, bin_ = read_glb(glb); R = json.load(open(rig)); H0, b0, base0 = load_rmdl(old)
    pr = g["meshes"][0]["primitives"][0]; at = pr["attributes"]
    pos = acc(g, bin_, at["POSITION"]).astype(np.float64); nrm = acc(g, bin_, at["NORMAL"]); uv = acc(g, bin_, at["TEXCOORD_0"])
    jnt = acc(g, bin_, at["JOINTS_0"]).astype(np.uint8); wt = acc(g, bin_, at["WEIGHTS_0"]).astype(np.float32)
    idx = acc(g, bin_, pr["indices"]).ravel()
    if wt.max() > 1.5: wt /= 255.0
    wt /= np.maximum(wt.sum(1, keepdims=True), 1e-6)
    w8 = np.round(wt * 255).astype(np.int32); w8[:, 0] += 255 - w8.sum(1); w8 = np.clip(w8, 0, 255).astype(np.uint8)
    lo, hi = pos.min(0), pos.max(0); q16 = np.round((pos - lo) / (hi - lo) * 65535).astype(np.uint16)
    n8 = np.round(np.clip(nrm, -1, 1) * 127).astype(np.int8)
    uv16 = np.round(np.clip(uv, 0, 1) * 65535).astype(np.uint16)
    idx = idx.astype(np.uint16 if len(pos) < 65536 else np.uint32)
    tex = {k[4:]: b0[base0 + o: base0 + o + n] for k, (o, n) in H0["views"].items() if k.startswith("tex_")}
    blobs = [("pos", q16.tobytes()), ("nrm", n8.tobytes()), ("uv", uv16.tobytes()), ("jnt", jnt.tobytes()),
             ("wt", w8.tobytes()), ("idx", idx.tobytes())] + [("tex_" + k, v) for k, v in tex.items()]
    views, body, o = {}, bytearray(), 0
    for k, v in blobs:
        views[k] = [o, len(v)]; body += v; pad = (-len(v)) % 4; body += b"\0" * pad; o += len(v) + pad
    P = np.array(R["P"]); Q = np.array(R["Q"]); Q /= np.linalg.norm(Q, axis=1, keepdims=True)
    hdr = {"v": 1, "count": int(len(pos)), "icount": int(len(idx)), "i32": bool(idx.dtype == np.uint32),
           "lo": lo.tolist(), "hi": hi.tolist(), "bones": R["bones"], "parents": R["parents"],
           "bpos": P.round(6).ravel().tolist(), "bquat": Q.round(7).ravel().tolist(),
           "clipBones": R["clipBones"], "D": np.array(R["D"]).round(7).ravel().tolist(),
           "hipOff": np.array(R["hipOff"]).round(5).tolist(), "views": views, "pbr": H0.get("pbr", {"metal": 1, "rough": 1})}
    hb = json.dumps(hdr, separators=(",", ":")).encode(); hb += b" " * ((-len(hb)) % 4)
    open(out, "wb").write(b"RMDL" + struct.pack("<I", len(hb)) + hb + bytes(body))
    return len(pos), H0["count"], 8 + len(hb) + len(body)

if __name__ == "__main__":
    import os
    V3 = "/mnt/user-data/outputs/movie/rangers_v3/"; G = "/home/claude/organellerangers/models/"
    for r in ["atp", "ribosome", "rougher", "golgi", "cytoplasm", "membrane", "mito", "nucleus", "smoother", "lysosome", "dna", "rna", "mitosis", "crispr", "phage"]:
        n, n0, sz = build(V3 + r + ".glb", V3 + r + ".rig.json", G + r + ".rmdl", "/home/claude/rangers/meshy/v3_" + r + ".rmdl")
        print(r, n, n0, sz, os.path.getsize(G + r + ".rmdl"))
