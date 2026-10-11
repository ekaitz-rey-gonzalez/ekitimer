/*! EKITIMER service worker · GPL-3.0-or-later
 * Permite usar el timer sin conexión e instalarlo como app.
 * - Páginas: primero la red (para recibir actualizaciones), si no hay, la copia guardada.
 * - Archivos propios y librerías externas: copia guardada al instante y se refresca en segundo plano.
 */
const VERSION = 'ekitimer-v1.0.0';
const SHELL = [
  './', 'index.html', 'css/styles.css', 'js/puzzles.js', 'js/core.js', 'js/app.js',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'
];
// Orígenes externos que merece la pena guardar (fuentes, Excel, scrambles oficiales)
const CDN = /^https:\/\/(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com|cdn\.cubing\.net)\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function fetchAndStore(req) {
  return fetch(req).then(res => {
    if (res && (res.ok || res.type === 'opaque')) {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy));
    }
    return res;
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !CDN.test(req.url)) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetchAndStore(req).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
    return;
  }
  e.respondWith(
    caches.match(req).then(cached => {
      const net = fetchAndStore(req).catch(() => cached);
      return cached || net;
    })
  );
});
