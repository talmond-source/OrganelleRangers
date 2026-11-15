"""Convert an Organelle Rangers .rmdl (the game's compact model format) to a standard skinned .glb
(opens in Blender, three.js, Unity, Unreal...). Usage: python3 rmdl2glb.py in.rmdl out.glb"""
import json, struct, sys, numpy as np

def load(p):
    b = open(p, "rb").read(); hl = struct.unpack("<I", b[4:8])[0]; H = json.loads(b[8:8 + hl]); base = 8 + hl
    raw = lambda k: b[base + H["views"][k][0]: base + H["views"][k][0] + H["views"][k][1]]
    return H, raw

def qmat(q):
    x, y, z, w = q
    return np.array([[1 - 2*(y*y + z*z), 2*(x*y - z*w), 2*(x*z + y*w)], [2*(x*y + z*w), 1 - 2*(x*x + z*z), 2*(y*z - x*w)], [2*(x*z - y*w), 2*(y*z + x*w), 1 - 2*(x*x + y*y)]])
def qinv(q): return np.array([-q[0], -q[1], -q[2], q[3]])
def qmul(a, b):
    ax, ay, az, aw = a; bx, by, bz, bw = b
    return np.array([aw*bx + ax*bw + ay*bz - az*by, aw*by - ax*bz + ay*bw + az*bx, aw*bz + ax*by - ay*bx + az*bw, aw*bw - ax*bx - ay*by - az*bz])

def convert(src, dst):
    H, raw = load(src); N = H["count"]; lo, hi = np.array(H["lo"]), np.array(H["hi"])
    pos = (lo + np.frombuffer(raw("pos"), np.uint16).reshape(-1, 3) / 65535 * (hi - lo)).astype(np.float32)
    nrm = np.frombuffer(raw("nrm"), np.int8).reshape(-1, 3).astype(np.float32) / 127; nrm /= np.maximum(np.linalg.norm(nrm, axis=1, keepdims=True), 1e-6)
    uv = (np.frombuffer(raw("uv"), np.uint16).reshape(-1, 2) / 65535).astype(np.float32)
    jnt = np.frombuffer(raw("jnt"), np.uint8).reshape(-1, 4).copy(); wt = np.frombuffer(raw("wt"), np.uint8).reshape(-1, 4).copy()
    idx = np.frombuffer(raw("idx"), np.uint32 if H["i32"] else np.uint16).copy()
    names, par = H["bones"], H["parents"]; nb = len(names)
    P = np.array(H["bpos"]).reshape(-1, 3); Q = np.array(H["bquat"]).reshape(-1, 4); Q /= np.linalg.norm(Q, axis=1, keepdims=True)
    bin_ = bytearray(); views = []; accs = []
    def add(arr, ctype, typ, target=None, norm=False, mm=False):
        a = np.ascontiguousarray(arr); off = len(bin_); bin_.extend(a.tobytes()); bin_.extend(b"\0" * ((-len(bin_)) % 4))
        v = {"buffer": 0, "byteOffset": off, "byteLength": a.nbytes}
        if target: v["target"] = target
        views.append(v); acc = {"bufferView": len(views) - 1, "componentType": ctype, "count": int(a.shape[0]), "type": typ}
        if norm: acc["normalized"] = True
        if mm: acc["min"] = a.min(0).tolist(); acc["max"] = a.max(0).tolist()
        accs.append(acc); return len(accs) - 1
    a_pos = add(pos, 5126, "VEC3", 34962, mm=True); a_nrm = add(nrm, 5126, "VEC3", 34962); a_uv = add(uv, 5126, "VEC2", 34962)
    a_j = add(jnt, 5121, "VEC4", 34962); a_w = add(wt, 5121, "VEC4", 34962, norm=True)
    a_i = add(idx, 5125 if H["i32"] else 5123, "SCALAR", 34963)
    ibm = []
    for i in range(nb):
        M = np.eye(4); M[:3, :3] = qmat(Q[i]); M[:3, 3] = P[i]; ibm.append(np.linalg.inv(M).T.ravel())
    a_ibm = add(np.array(ibm, np.float32), 5126, "MAT4")
    images = []; textures = []
    for k in ("map", "normal", "mr"):
        if "tex_" + k in H["views"]:
            d = raw("tex_" + k); off = len(bin_); bin_.extend(d); bin_.extend(b"\0" * ((-len(bin_)) % 4))
            views.append({"buffer": 0, "byteOffset": off, "byteLength": len(d)})
            images.append({"bufferView": len(views) - 1, "mimeType": "image/png" if d[:4] == b"\x89PNG" else "image/jpeg", "name": k})
            textures.append({"source": len(images) - 1})
    tix = {im["name"]: i for i, im in enumerate(images)}
    pbr = {"metallicFactor": 1.0 if "mr" in tix else 0.0, "roughnessFactor": 1.0 if "mr" in tix else 0.6}
    if "map" in tix: pbr["baseColorTexture"] = {"index": tix["map"]}
    if "mr" in tix: pbr["metallicRoughnessTexture"] = {"index": tix["mr"]}
    mat = {"name": "suit", "pbrMetallicRoughness": pbr}
    if "normal" in tix: mat["normalTexture"] = {"index": tix["normal"]}
    nodes = []
    for i in range(nb):
        p = par[i]
        if p < 0: t, r = P[i], Q[i]
        else: pq = qinv(Q[p]); t = qmat(pq) @ (P[i] - P[p]); r = qmul(pq, Q[i])
        nodes.append({"name": names[i], "translation": [float(x) for x in t], "rotation": [float(x) for x in r / np.linalg.norm(r)],
                      "children": [k for k in range(nb) if par[k] == i]})
    for nd in nodes:
        if not nd["children"]: del nd["children"]
    roots = [i for i in range(nb) if par[i] < 0]
    nodes.append({"name": "suit", "mesh": 0, "skin": 0}); mesh_node = len(nodes) - 1
    armature = {"name": "Armature", "children": roots + [mesh_node]}; nodes.append(armature)
    g = {"asset": {"version": "2.0", "generator": "Organelle Rangers rmdl2glb"}, "scene": 0, "scenes": [{"nodes": [len(nodes) - 1]}], "nodes": nodes,
         "meshes": [{"name": "suit", "primitives": [{"attributes": {"POSITION": a_pos, "NORMAL": a_nrm, "TEXCOORD_0": a_uv, "JOINTS_0": a_j, "WEIGHTS_0": a_w}, "indices": a_i, "material": 0}]}],
         "skins": [{"joints": list(range(nb)), "inverseBindMatrices": a_ibm, "skeleton": roots[0]}],
         "materials": [mat], "textures": textures, "images": images, "samplers": [], "accessors": accs, "bufferViews": views,
         "buffers": [{"byteLength": len(bin_)}],
         "extras": {"organelleRangers": {"clipBones": H["clipBones"], "D": H["D"], "hipOff": H["hipOff"]}}}
    if not g["samplers"]: del g["samplers"]
    js = json.dumps(g, separators=(",", ":")).encode(); js += b" " * ((-len(js)) % 4)
    out = b"glTF" + struct.pack("<II", 2, 12 + 8 + len(js) + 8 + len(bin_)) + struct.pack("<I", len(js)) + b"JSON" + js + struct.pack("<I", len(bin_)) + b"BIN\0" + bytes(bin_)
    open(dst, "wb").write(out)

if __name__ == "__main__":
    convert(sys.argv[1], sys.argv[2])
