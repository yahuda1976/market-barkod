// Market Pro - minimal service worker
// Sadece uygulamanin "yuklenebilir" (installable) sayilmasi icin var.
// Agresif onbellekleme yapmaz; her istek normal sekilde internete gider.

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Pass-through: sadece normal network isteklerini oldugu gibi yonlendir.
    event.respondWith(fetch(event.request));
});
