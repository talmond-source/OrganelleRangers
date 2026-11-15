/* ================= Embedded asset loader ================= */
const ASSETS = { ready: null, rangers: {} };
function b64buf(s) { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u.buffer; }
function loadTex(url, srgb) { return new Promise((res) => { const im = new Image(); im.onload = () => { const t = new THREE.Texture(im); t.encoding = srgb ? THREE.sRGBEncoding : THREE.LinearEncoding; t.anisotropy = LITE ? 1 : 4; t.needsUpdate = true; res(t); }; im.onerror = () => res(new THREE.Texture()); im.src = url; }); }
function loadMask(url) { return new Promise((res) => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); const px = x.getImageData(0, 0, im.width, im.height).data; const d = new Uint8Array(im.width * im.height); for (let i = 0; i < d.length; i++) d[i] = px[i * 4]; res({ w: im.width, h: im.height, d, s: 0.5 }); }; im.onerror = () => res(null); im.src = url; }); }
ASSETS.ready = (async () => {
  const D = window.ASSET_DATA;
  R3D.init({ skel: D.skel, body: { meta: D.body.meta, buf: b64buf(D.body.b64) }, anims: { meta: D.anims.meta, buf: b64buf(D.anims.b64) } });
  for (const [id, r] of Object.entries(D.rangers)) {
    ASSETS.rangers[id] = { L: r.L, col: await loadTex(r.col, true), mat: await loadTex(r.mat, false), helmet: { meta: r.helmet.meta, buf: b64buf(r.helmet.b64) }, mask: r.fg ? await loadMask(r.fg) : null };
  }
  if (window.MOVIE && MOVIE.whenBuffered && MOVIE.state !== "done") await MOVIE.whenBuffered(8000);
  await RMODEL.loadAll(ASSETS.rangers);
  return true;
})();
