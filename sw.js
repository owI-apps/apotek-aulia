const CACHE_NAME = 'apotek-aulia-v1';

// Daftar file yang akan di-cache saat pertama kali load
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/mod-dashboard.js',
  '/mod-rawat.js',
  '/mod-pasien.js',
  '/mod-obat.js',
  '/mod-transaksi.js',
  '/mod-inventory.js',
  '/mod-keuangan.js',
  '/mod-karyawan.js',
  '/mod-payroll.js',
  '/mod-laporan.js',
  '/mod-pengaturan.js',
  '/mod-pengeluaran.js',
  '/icon-192x192.png',
  '/logo.png'
];

// Event Install: Caching aset
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
  );
  self.skipWaiting(); // Aktifkan langsung tanpa menunggu tab ditutup
});

// Event Activate: Hapus cache lama jika ada update
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(cacheName => cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      );
    })
  );
  self.clients.claim(); // Ambil alih kontrol dari SW lama
});

// Event Fetch: Melayani request dari cache dulu, kalau gagal baru ke network
self.addEventListener('fetch', event => {
  // Hanya cache request GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Kalau ada di cache, pakai itu
        if (response) {
          return response;
        }

        // Kalau tidak ada di cache, ambil dari internet
        return fetch(event.request)
          .then(networkResponse => {
            // Cek apakah response valid dan bukan error
            if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone response untuk disimpan di cache
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          })
          .catch(() => {
            // Kalau internet mati dan bukan halaman HTML, biarkan error
            // Tapi kalau user buka halaman utama, tampilkan index.html dari cache
            if(event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});
