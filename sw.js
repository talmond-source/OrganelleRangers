// Offline cache: keeps the game playable from the home screen after the first visit.
const CACHE = "organelle-rangers-v20";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./images/mega/atp.png", "./images/mega/crispr.png", "./images/mega/cytoplasm.png", "./images/mega/dna.png", "./images/mega/golgi.png", "./images/mega/lysosome.png", "./images/mega/membrane.png", "./images/mega/mito.png", "./images/mega/mitosis.png", "./images/mega/nucleus.png", "./images/mega/phage.png", "./images/mega/ribosome.png", "./images/mega/rna.png", "./images/mega/rougher.png", "./images/mega/smoother.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  // the intro movie streams straight from the network (video players need ranged requests, which a cache copy would break)
  if (/\.mp4$/.test(new URL(e.request.url).pathname)) return;
  // network first for the page (so updates arrive), cache first for everything else
  if (e.request.mode === "navigate") { e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put("./index.html", cp)); return r; }).catch(() => caches.match("./index.html"))); return; }
  // everything else (icons, sculpted models): cache first, and keep a copy of anything fetched so it works offline next time
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request).then((r) => { if (r.ok && new URL(e.request.url).origin === location.origin) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, cp)); } return r; })));
});
