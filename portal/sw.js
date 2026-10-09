const CACHE_NAME = 'koperasi-portal-v99';
const ASSETS = [
    './',
    'index.html',
    'icons/icon-192.png',
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

// ==========================================
// Web Push Notification Handlers (RFC 8291)
// ==========================================
self.addEventListener('push', e => {
    let data = {
        title: 'Koperasi Simpan Pinjam',
        body: 'Pemberitahuan baru dari Koperasi',
        url: './'
    };

    if (e.data) {
        try {
            data = Object.assign(data, e.data.json());
        } catch (err) {
            data.body = e.data.text();
        }
    }

    // Resolve icon URL reliably using ServiceWorker scope
    let iconUrl = '';
    try {
        iconUrl = new URL('icons/icon-192.png', self.registration.scope).href;
    } catch (_) {}

    let clickUrl = self.registration.scope;
    if (data.url) {
        try {
            clickUrl = new URL(data.url, self.registration.scope).href;
        } catch (_) {}
    }

    const options = {
        body: data.body || 'Pemberitahuan baru dari Koperasi',
        icon: iconUrl || undefined,
        badge: iconUrl || undefined,
        vibrate: [100, 50, 100],
        data: {
            url: clickUrl,
            timestamp: data.timestamp || Date.now()
        },
        tag: data.tag || ('kop_' + Date.now()),
        renotify: true
    };

    e.waitUntil(
        self.registration.showNotification(data.title || 'Koperasi Simpan Pinjam', options)
            .catch(err => {
                console.warn('[SW Push] Fallback showNotification:', err);
                // Fallback without rich icon/vibrate if browser restricts it
                return self.registration.showNotification(data.title || 'Koperasi Simpan Pinjam', {
                    body: data.body || 'Pemberitahuan baru dari Koperasi',
                    data: { url: clickUrl }
                });
            })
    );
});

self.addEventListener('notificationclick', e => {
    e.notification.close();
    const targetUrl = e.notification.data?.url || '/portal/';
    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
            for (let client of windowClients) {
                if (client.url.includes('/portal/') && 'focus' in client) {
                    return client.focus().then(() => {
                        if ('navigate' in client && targetUrl) {
                            return client.navigate(targetUrl);
                        }
                    });
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
