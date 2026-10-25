// Market Pro - cevrimdisi (internetsiz) calisma icin service worker
// Internet varsa her zaman en yeni surumu getirir, yoksa telefona kayitli kopyayi acar.

const SURUM = 'marketpro-v1';

const YEREL_DOSYALAR = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

const DIS_DOSYALAR = [
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;600;700;800;900&display=swap',
    'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js',
    'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
    'https://cdn.jsdelivr.net/npm/@zxing/library@0.19.1/umd/index.min.js'
];

// Sadece bu adreslerden gelen dosyalar telefona kaydedilir
const KAYDEDILECEK_SITELER = [
    'cdnjs.cloudflare.com',
    'cdn.jsdelivr.net',
    'fonts.googleapis.com',
    'fonts.gstatic.com'
];

self.addEventListener('install', (event) => {
    event.waitUntil((async () => {
        const cache = await caches.open(SURUM);
        await Promise.all(YEREL_DOSYALAR.map(async (url) => {
            try { await cache.add(new Request(url, { cache: 'reload' })); } catch (e) {}
        }));
        await Promise.all(DIS_DOSYALAR.map(async (url) => {
            try {
                const cevap = await fetch(url, { mode: 'cors' });
                if (cevap.ok) await cache.put(url, cevap);
            } catch (e) {
                try {
                    const cevap2 = await fetch(url, { mode: 'no-cors' });
                    await cache.put(url, cevap2);
                } catch (e2) {}
            }
        }));
        self.skipWaiting();
    })());
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        const isimler = await caches.keys();
        await Promise.all(isimler.filter((n) => n !== SURUM).map((n) => caches.delete(n)));
        await self.clients.claim();
    })());
});

function zamanAsimi(ms) {
    return new Promise((_, reddet) => setTimeout(() => reddet(new Error('zaman asimi')), ms));
}

// Ana sayfa: once internetten en yenisini dene (en fazla 4 sn), olmazsa kayitli kopyayi ac
async function sayfaGetir(istek) {
    const cache = await caches.open(SURUM);
    try {
        const cevap = await Promise.race([fetch(istek), zamanAsimi(4000)]);
        if (cevap && cevap.ok) {
            cache.put('./index.html', cevap.clone());
            return cevap;
        }
        throw new Error('hatali cevap');
    } catch (e) {
        const kayitli = await cache.match('./index.html') || await cache.match('./');
        if (kayitli) return kayitli;
        return new Response('<h2 style="font-family:sans-serif;text-align:center;margin-top:40vh">Internet yok. Uygulamayi bir kere internetle acman gerekiyor.</h2>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
}

// Diger dosyalar: kayitliysa hemen ver, arkada internetten guncelle
async function dosyaGetir(istek) {
    const cache = await caches.open(SURUM);
    const kayitli = await cache.match(istek);
    const internetten = fetch(istek).then((cevap) => {
        if (cevap && (cevap.ok || cevap.type === 'opaque')) cache.put(istek, cevap.clone());
        return cevap;
    }).catch(() => null);
    if (kayitli) return kayitli;
    const cevap = await internetten;
    return cevap || new Response('', { status: 504 });
}

self.addEventListener('fetch', (event) => {
    const istek = event.request;
    if (istek.method !== 'GET') return;
    const url = new URL(istek.url);

    if (istek.mode === 'navigate' && url.origin === self.location.origin) {
        event.respondWith(sayfaGetir(istek));
        return;
    }
    if (url.origin === self.location.origin) {
        event.respondWith(dosyaGetir(istek));
        return;
    }
    if (KAYDEDILECEK_SITELER.includes(url.hostname)) {
        event.respondWith(dosyaGetir(istek));
        return;
    }
    // Diger her sey (Google Drive vb.) normal sekilde internete gider
});
