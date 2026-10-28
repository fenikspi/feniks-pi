/* Feniks π: rad bez interneta. Sprema aplikaciju u predmemoriju uređaja; podaci korisnika su u IndexedDB, ne ovdje. */
var VERZIJA = 'feniks-app-8';
var DATOTEKE = ['./', 'index.html', 'app.js', 'i18n.js', 'jezici/hr.js', 'jezici/en.js', 'jezici/de.js', 'jezici/it.js', 'jezici/es.js', 'jezici/fr.js', 'jezici/sl.js', 'jezici/sr.js', 'jezici/ru.js', 'jezici/uk.js', 'nebo.js', 'mjesto-trazi.js', 'kineski.js', 'citanje.js', 'prijedlozi.js', 'simboli.js', 'core.js', 'asteroids.js', 'astronomy.js', 'manifest.webmanifest', 'ikona-192.png', 'ikona-512.png',
  '/stil.css', '/fontovi/fontovi.css', '/glazba.js', '/favicon.ico'];
self.addEventListener('install', function (e) { e.waitUntil(caches.open(VERZIJA).then(function (c) { return c.addAll(DATOTEKE); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (k) { return Promise.all(k.filter(function (x) { return x !== VERZIJA; }).map(function (x) { return caches.delete(x); })); }).then(function () { return self.clients.claim(); }));
});
// prvo mreža (da stigne nova inačica), a bez interneta iz predmemorije
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (r) {
    var kopija = r.clone(); caches.open(VERZIJA).then(function (c) { c.put(e.request, kopija); }); return r;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }); }));
});
