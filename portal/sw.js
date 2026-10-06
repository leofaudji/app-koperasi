const CACHE_NAME = 'koperasi-portal-v80';
const ASSETS = [
    './',
    'index.html',
    'assets/js/tailwind.min.js',
    'assets/js/sweetalert2.all.min.js',
    'assets/js/portal.js',
    'views/home.html',
    'views/simpanan.html',
    'views/pinjaman.html',
    'views/profil.html',
    'views/pengajuan_pinjaman.html',
    'views/laporan.html',
    'views/toko.html',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css'
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(c => c.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    )));
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    // version.json: Always network first, never cache
    if (e.request.url.includes('version.json')) {
        e.respondWith(fetch(e.request));
        return;
    }

    // API Requests: Network First, Fallback to Cache
    if (e.request.url.includes('/api/')) {
        // Do not cache non-GET requests (e.g., POST login, PUT, DELETE)
        if (e.request.method !== 'GET') {
            e.respondWith(fetch(e.request));
            return;
        }

        e.respondWith(
            fetch(e.request)
                .then(response => {
                    // Only cache successful 200 responses (do not cache 401 or 500 errors)
                    if (response.status === 200) {
                        const clonedResponse = response.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(e.request, clonedResponse);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // If network fails (offline), return from cache
                    return caches.match(e.request);
                })
        );
    } else {
        // Assets: Cache First, Fallback to Network
        e.respondWith(
            caches.match(e.request).then(response => {
                return response || fetch(e.request);
            })
        );
    }
});
