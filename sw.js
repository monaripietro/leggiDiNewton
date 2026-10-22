// Service Worker: rende il sito consultabile offline dopo la prima visita.
// Strategia "prima la rete, poi la cache": i contenuti sono sempre aggiornati quando c'è connessione,
// e la copia in cache viene usata solo offline. Percorsi relativi: il sito vive in /<nome-repo>/.
const CACHE = "nim-v2";
const PRECACHE = [
  "./",
  "index.html",
  "storia.html",
  "legge-1.html",
  "legge-2.html",
  "legge-3.html",
  "quiz.html",
  "fonti.html",
  "assets/css/tokens.css",
  "assets/css/base.css",
  "assets/css/components.css",
  "assets/css/pages.css",
  "assets/js/theme-init.js",
  "assets/js/nav.js",
  "assets/js/i18n.js",
  "assets/js/richtext.js",
  "assets/js/theme.js",
  "assets/js/a11y.js",
  "assets/js/quiz.js",
  "assets/js/timeline.js",
  "assets/js/sim/engine.js",
  "assets/js/sim/vec.js",
  "assets/js/sim/canvas-utils.js",
  "assets/js/sim/sim-ui.js",
  "assets/js/sim/sim-inertia.js",
  "assets/js/sim/sim-force.js",
  "assets/js/sim/sim-reaction.js",
  "assets/js/pages/legge-1.js",
  "assets/js/pages/legge-2.js",
  "assets/js/pages/legge-3.js",
  "assets/js/pages/quiz.js",
  "assets/i18n/it.json",
  "assets/i18n/en.json",
  "assets/img/favicon.svg",
  "assets/img/hero.svg",
  "assets/fonts/atkinson-hyperlegible-latin-400-normal.woff2",
  "assets/fonts/atkinson-hyperlegible-latin-400-italic.woff2",
  "assets/fonts/atkinson-hyperlegible-latin-700-normal.woff2",
  "assets/fonts/fraunces-latin-600-normal.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match("index.html"))),
  );
});
