const Portal = {
    member: null,
    haptic(type = 'light') {
        try {
            if (navigator.vibrate) {
                if (type === 'light') navigator.vibrate(10);
                else if (type === 'medium') navigator.vibrate(20);
                else if (type === 'success') navigator.vibrate([10, 30, 10]);
            }
        } catch (e) {}
    },
    csrfToken: '',
    VERSION: window.PORTAL_VERSION || '1.3.3', // Dynamic version from index.php
    pwaName: '',
    logoUrl: '',
    API: (() => {
        const path = window.location.pathname.replace(/\/[^\/]+\.[^\/]+$/, '/');
        const base = path.endsWith('/') ? path : path + '/';
        return base.replace(/\/portal\/$/, '/') + 'api';
    })(),
    PORTAL_BASE: (() => {
        const path = window.location.pathname.replace(/\/[^\/]+\.[^\/]+$/, '/');
        return path.endsWith('/') ? path : path + '/';
    })(),
    html5QrCode: null, // For QR scanner instance
    searchTimeout: null,
    currentTab: 'home',
    privacyMode: localStorage.getItem('kop_privacy_mode') === 'true',
    tabOrder: ['home', 'simpanan', 'pinjaman', 'rat', 'profil'],
    idleTimer: null,
    IDLE_TIMEOUT: 5 * 60 * 1000, // 5 Minutes
    currentData: { type: null, header: {}, items: [] },
    appSettings: {},
    recentActivities: [],
    activeReceiptData: null,
    viewCache: {},
    dataCache: {},
    loadedScripts: {},

    // Client-Side Stale-While-Revalidate (SWR) Engine
    getSwrKey(ep) {
        const memberId = this.member?.id || 'guest';
        const sanitized = String(ep).replace(/[^a-zA-Z0-9_-]/g, '_');
        return `kop_swr_${memberId}_${sanitized}`;
    },

    getSwrCache(ep) {
        try {
            const key = this.getSwrKey(ep);
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed?.data !== undefined ? parsed.data : null;
        } catch (e) {
            return null;
        }
    },

    setSwrCache(ep, data) {
        try {
            const key = this.getSwrKey(ep);
            localStorage.setItem(key, JSON.stringify({
                timestamp: Date.now(),
                data: data
            }));
        } catch (e) {
            console.warn('SWR cache write skipped:', e);
        }
    },

    clearSwrCache() {
        try {
            const toRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('kop_swr_')) {
                    toRemove.push(k);
                }
            }
            toRemove.forEach(k => localStorage.removeItem(k));
        } catch (e) {}
    },

    getAvatarUrl(name) {
        if (this.member && this.member.foto && this.member.foto.trim() !== '') {
            const f = this.member.foto.trim();
            if (f.startsWith('http://') || f.startsWith('https://') || f.startsWith('data:image/')) {
                return f;
            }
            return '../' + f.replace(/^\/+/, '');
        }

        const cleanName = (name || this.member?.nama || 'A').trim();
        const parts = cleanName.split(/\s+/).filter(Boolean);
        let initials = 'A';
        if (parts.length >= 2) {
            initials = (parts[0][0] + parts[1][0]).toUpperCase();
        } else if (parts.length === 1 && parts[0].length > 0) {
            initials = parts[0].substring(0, 2).toUpperCase();
        }

        const palettes = [
            { bg1: '#3b82f6', bg2: '#1d4ed8', fg: '#ffffff' },
            { bg1: '#0ea5e9', bg2: '#0369a1', fg: '#ffffff' },
            { bg1: '#10b981', bg2: '#047857', fg: '#ffffff' },
            { bg1: '#6366f1', bg2: '#4338ca', fg: '#ffffff' },
            { bg1: '#f59e0b', bg2: '#d97706', fg: '#ffffff' },
            { bg1: '#ec4899', bg2: '#be185d', fg: '#ffffff' },
            { bg1: '#14b8a6', bg2: '#0f766e', fg: '#ffffff' }
        ];
        const hash = cleanName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
        const p = palettes[hash % palettes.length];

        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><linearGradient id="g_${hash}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${p.bg1}" /><stop offset="100%" stop-color="${p.bg2}" /></linearGradient></defs><rect width="100" height="100" rx="28" fill="url(#g_${hash})" /><text x="50" y="55" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="700" fill="${p.fg}" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">${initials}</text></svg>`;

        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    },

    getOperationalStatus() {
        const now = new Date();
        const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        const hour = now.getHours();
        const min = now.getMinutes();
        const timeVal = hour * 60 + min;

        const wa = this.appSettings?.wa_admin || this.appSettings?.telepon || '628123456789';
        const cleanWa = wa.replace(/[^0-9]/g, '').replace(/^0/, '62');
        const waText = encodeURIComponent(`Halo Pengurus ${this.pwaName || 'Koperasi'}, saya ${this.member?.nama || 'Anggota'} (${this.member?.no_anggota || ''}) ingin berkonsultasi mengenai layanan kas/transaksi.`);
        const waLink = `https://wa.me/${cleanWa}?text=${waText}`;

        if (day === 0) {
            return {
                isOpen: false,
                label: '⚪ Layanan Kas Libur (Buka Senin 08.00 WIB)',
                color: 'text-gray-500 dark:text-obsidian-400',
                dotClass: 'bg-gray-400',
                isPulsing: false,
                waLink
            };
        } else if (day === 6) {
            const openTime = 8 * 60;
            const closeTime = 12 * 60;
            const isOpen = timeVal >= openTime && timeVal < closeTime;
            return {
                isOpen,
                label: isOpen ? '🟢 Layanan Kas Buka (Sabtu 08.00 - 12.00)' : '⚪ Layanan Kas Tutup (Buka Senin 08.00)',
                color: isOpen ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-obsidian-400',
                dotClass: isOpen ? 'bg-emerald-500' : 'bg-gray-400',
                isPulsing: isOpen,
                waLink
            };
        } else {
            const openTime = 8 * 60;
            const closeTime = 15 * 60;
            const isOpen = timeVal >= openTime && timeVal < closeTime;
            return {
                isOpen,
                label: isOpen ? '🟢 Layanan Kas Buka (08.00 - 15.00 WIB)' : (timeVal < openTime ? '⚪ Layanan Kas Buka Pk 08.00 WIB' : '⚪ Kantor Kas Tutup (Buka Besok 08.00)'),
                color: isOpen ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-500 dark:text-obsidian-400',
                dotClass: isOpen ? 'bg-emerald-500' : 'bg-gray-400',
                isPulsing: isOpen,
                waLink
            };
        }
    },

    updateOperationalBar() {
        const bar = document.getElementById('h-operational-bar');
        if (!bar) return;
        const status = this.getOperationalStatus();
        const textEl = document.getElementById('h-op-text');
        const waBtn = document.getElementById('h-op-wa-btn');
        const indicatorEl = document.getElementById('h-op-indicator');

        if (textEl) {
            textEl.textContent = status.label;
            textEl.className = `font-bold truncate ${status.color}`;
        }
        if (indicatorEl) {
            indicatorEl.innerHTML = status.isPulsing
                ? `<span class="animate-ping absolute inline-flex h-full w-full rounded-full ${status.dotClass} opacity-75"></span>
                   <span class="relative inline-flex rounded-full h-2.5 w-2.5 ${status.dotClass}"></span>`
                : `<span class="relative inline-flex rounded-full h-2.5 w-2.5 ${status.dotClass}"></span>`;
        }
        if (waBtn) {
            waBtn.href = status.waLink;
        }
    },

    currentMutasiList: [],

    showReceipt(item) {
        if (!item) return;
        this.activeReceiptData = item;

        const kopName = this.pwaName || this.appSettings?.app_name || 'KOSMIK Sandya Raharja';
        const elKop = document.getElementById('receipt-kop-name');
        if (elKop) elKop.textContent = kopName;

        const elKategori = document.getElementById('receipt-kategori');
        if (elKategori) elKategori.textContent = item.judul || (item.kategori ? item.kategori.toUpperCase() : 'TRANSAKSI');

        const elNominal = document.getElementById('receipt-nominal');
        const nominal = parseFloat(item.nominal || 0);
        const prefix = item.dk === 'D' ? '+' : '-';
        if (elNominal) elNominal.textContent = `${prefix}${this.rp(nominal)}`;

        const elRef = document.getElementById('receipt-ref');
        if (elRef) elRef.textContent = item.kode || `TRX-${Date.now().toString().slice(-8)}`;

        const elWaktu = document.getElementById('receipt-waktu');
        const trxDate = item.tanggal || item.created_at || new Date().toISOString();
        if (elWaktu) elWaktu.textContent = this.fdate(trxDate) + ' WIB';

        const elNama = document.getElementById('receipt-nama');
        if (elNama) elNama.textContent = this.member?.nama || '-';

        const elNoAnggota = document.getElementById('receipt-no-anggota');
        if (elNoAnggota) elNoAnggota.textContent = this.member?.no_anggota || '-';

        const elDeskripsi = document.getElementById('receipt-deskripsi');
        if (elDeskripsi) elDeskripsi.textContent = item.deskripsi || '-';

        const badgeStatus = document.getElementById('receipt-status-text');
        if (badgeStatus) {
            badgeStatus.textContent = (item.status === 'sukses' || item.status === 'lunas' || item.status === 'selesai')
                ? 'TERBUKUKAN & SAH'
                : (item.status ? item.status.toUpperCase() : 'TERCATAT');
        }

        this.openModal('modal-bukti-transaksi');
    },

    openReceiptModal(index) {
        const item = this.recentActivities ? this.recentActivities[index] : null;
        if (!item) return;
        this.showReceipt(item);
    },

    openReceiptQuickModal() {
        if (this.recentActivities && this.recentActivities.length > 0) {
            this.openReceiptModal(0);
        } else {
            // Sample official initial membership registration slip
            const sample = {
                kategori: 'simpanan',
                kode: `TRX-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}0001`,
                tanggal: new Date().toISOString(),
                judul: 'Simpanan Pokok Anggota',
                deskripsi: 'Setoran Awal Keanggotaan Koperasi Resmi',
                dk: 'D',
                nominal: 100000,
                status: 'sukses'
            };
            this.showReceipt(sample);
        }
    },

    openReceiptFromSimpananIndex(index) {
        const item = this.currentMutasiList ? this.currentMutasiList[index] : null;
        if (!item) return;
        const mapped = {
            kategori: 'simpanan',
            kode: item.no_transaksi || item.kode || `SMP-${Date.now().toString().slice(-8)}`,
            tanggal: item.tgl_transaksi || item.created_at || new Date().toISOString(),
            judul: item.nama_transaksi || 'Mutasi Simpanan',
            deskripsi: `${item.nama_transaksi || 'Simpanan'} • Saldo: ${this.rp(item.saldo_sesudah || item.jumlah)}`,
            dk: item.dk || 'D',
            nominal: item.jumlah,
            status: 'sukses'
        };
        this.showReceipt(mapped);
    },

    openReceiptFromAngsuran(item, noPinjaman = '', jenisPinjaman = '') {
        if (!item) return;
        const mapped = {
            kategori: 'pinjaman',
            kode: `${noPinjaman || 'PIN'}-ANG${item.angsuran_ke || '1'}`,
            tanggal: item.tgl_bayar || item.tgl_jatuh_tempo || new Date().toISOString(),
            judul: `Angsuran Ke-${item.angsuran_ke || 1} ${jenisPinjaman}`,
            deskripsi: `Pokok: ${this.rp(item.pokok || 0)} • Bunga/Jasa: ${this.rp(item.bunga || 0)}`,
            dk: 'K',
            nominal: item.total || (parseFloat(item.pokok || 0) + parseFloat(item.bunga || 0)),
            status: item.status === 'lunas' ? 'sukses' : item.status
        };
        this.showReceipt(mapped);
    },

    currentAngsuranList: [],
    currentPinjamanInfo: null,

    openReceiptFromAngsuranIndex(index) {
        const a = this.currentAngsuranList ? this.currentAngsuranList[index] : null;
        if (!a) return;
        const noPinjaman = this.currentPinjamanInfo?.no_pinjaman || 'PIN';
        const jenisPinjaman = this.currentPinjamanInfo?.jenis_pinjaman || 'Pinjaman';
        this.openReceiptFromAngsuran(a, noPinjaman, jenisPinjaman);
    },

    shareReceiptWA() {
        const item = this.activeReceiptData;
        if (!item) return;

        const kopName = this.pwaName || this.appSettings?.app_name || 'Koperasi';
        const nominal = parseFloat(item.nominal || 0);
        const prefix = item.dk === 'D' ? '+' : '-';
        const ref = item.kode || `TRX-${Date.now().toString().slice(-8)}`;
        const tgl = this.fdate(item.tanggal || item.created_at || new Date().toISOString());

        const text = `*BUKTI TRANSAKSI DIGITAL RESMI*
*${kopName.toUpperCase()}*
---------------------------------------
No. Ref : ${ref}
Waktu   : ${tgl} WIB
Anggota : ${this.member?.nama || '-'} (${this.member?.no_anggota || '-'})
---------------------------------------
Jenis   : ${item.judul || item.kategori}
Jumlah  : ${prefix}${this.rp(nominal)}
Status  : ${item.status ? item.status.toUpperCase() : 'SUKSES'} (SAH)
Uraian  : ${item.deskripsi || '-'}
---------------------------------------
_Bukti ini dihasilkan secara otomatis dan sah oleh Sistem Pembukuan Digital Koperasi._`;

        const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank');
    },

    printReceipt() {
        const printContent = document.getElementById('receipt-printable-area');
        if (!printContent) return;

        const kopName = this.pwaName || this.appSettings?.app_name || 'KOSMIK Sandya Raharja';
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.print();
            return;
        }
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Slip Transaksi - ${kopName}</title>
                <style>
                    body { font-family: 'Courier New', monospace; font-size: 13px; max-width: 380px; margin: 20px auto; padding: 15px; border: 1px solid #ccc; }
                    .center { text-align: center; }
                    .line { border-bottom: 1px dashed #000; margin: 10px 0; }
                    .row { display: flex; justify-content: space-between; margin: 4px 0; }
                    .bold { font-weight: bold; }
                    .title { font-size: 16px; font-weight: bold; }
                    @media print {
                        body { border: none; margin: 0; padding: 10px; }
                    }
                </style>
            </head>
            <body>
                <div class="center title">${kopName}</div>
                <div class="center">BUKTI TRANSAKSI DIGITAL</div>
                <div class="line"></div>
                <div class="row"><span>No. Ref:</span><span class="bold">${document.getElementById('receipt-ref')?.textContent || '-'}</span></div>
                <div class="row"><span>Waktu:</span><span>${document.getElementById('receipt-waktu')?.textContent || '-'}</span></div>
                <div class="row"><span>Anggota:</span><span>${document.getElementById('receipt-nama')?.textContent || '-'}</span></div>
                <div class="row"><span>No. Anggota:</span><span>${document.getElementById('receipt-no-anggota')?.textContent || '-'}</span></div>
                <div class="line"></div>
                <div class="row"><span>Uraian:</span><span>${document.getElementById('receipt-kategori')?.textContent || '-'}</span></div>
                <div class="row"><span class="bold">Jumlah:</span><span class="bold title">${document.getElementById('receipt-nominal')?.textContent || 'Rp 0'}</span></div>
                <div class="row"><span>Status:</span><span class="bold">${document.getElementById('receipt-status-text')?.textContent || 'SAH'}</span></div>
                <div class="line"></div>
                <div class="center" style="font-size: 11px;">Validasi Digital &bull; Disahkan Sistem Koperasi</div>
                <script>
                    window.onload = function() { window.print(); setTimeout(() => window.close(), 500); };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    },

    getFirstName(name) {
        if (!name) return 'Anggota';
        let cleanName = name.trim();
        // Regex to match common academic/religious titles at the start
        const titleRegex = /^(drs|dra|ir|h|hj|haji|hajah|prof|dr|kh|st|sh|skm|apt|ak|mpd|spd|mm|m\.pd|s\.pd|s\.t|s\.h|s\.e|se|spd|sh|st|h\.|hj\.|ir\.)[\s.]+/gi;

        // Repeatedly remove titles from the beginning
        let lastLength = 0;
        while (cleanName.length !== lastLength) {
            lastLength = cleanName.length;
            cleanName = cleanName.replace(titleRegex, '').trim();
        }

        const firstWord = cleanName.split(/\s+/)[0];
        return firstWord || name.trim().split(/\s+/)[0];
    },

    async api(ep, opt = {}) {
        const config = { method: opt.method || 'GET', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin' };
        if (['POST', 'PUT', 'DELETE'].includes(config.method) && this.csrfToken) {
            config.headers['X-CSRF-Token'] = this.csrfToken;
        }
        if (opt.body) config.body = JSON.stringify(opt.body);

        try {
            const r = await fetch(this.API + '/' + ep, config);
            const isLoginRequest = ['portal/login', 'portal/me'].includes(ep);
            let json = null;
            
            try { json = await r.json(); } catch(e) {}

            const wasLoggedIn = localStorage.getItem('kop_was_logged_in') === 'true';
            
            // Treat as unauthorized ONLY if 401 Unauthorized or response explicitly says session expired
            // Do not treat server errors (500) or general business logic errors as session expired!
            const isSessionExpiredMsg = json && json.success === false && typeof json.message === 'string' && json.message.toLowerCase().includes('sesi');
            const isUnauthorized = (r.status === 401) || (isSessionExpiredMsg && !isLoginRequest);

            // Handle Unauthorized / Session Expired
            if (isUnauthorized && wasLoggedIn) {
                this.clearSwrCache();
                localStorage.removeItem('kop_was_logged_in');
                this.member = null;
                
                if (window.Swal) {
                    Swal.fire({
                        title: 'Sesi Habis',
                        text: 'Sesi Anda telah habis. Silakan masuk kembali.',
                        icon: 'warning',
                        confirmButtonText: 'OK',
                        confirmButtonColor: '#2563eb',
                        timer: 5000,
                        timerProgressBar: true
                    }).then(() => {
                        location.reload();
                    });
                } else {
                    alert('Sesi Anda telah habis. Silakan masuk kembali.');
                    location.reload();
                }
                return null;
            }

            if (r.status === 401) return json;
            if (!r.ok) return json || null;
            return json;
        } catch (e) {
            if (!navigator.onLine) this.showOfflineToast();
            return null;
        }
    },

    showOfflineToast() {
        let toast = document.getElementById('offline-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'offline-toast';
            toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-full text-xs font-medium z-[100] shadow-lg flex items-center gap-2 transform transition-transform translate-y-[-100px]';
            toast.innerHTML = '<i class="bi bi-wifi-off text-rose-400"></i> Mode Offline';
            document.body.appendChild(toast);
        }

        // Animate entry
        setTimeout(() => toast.style.transform = 'translate(-50%, 0)', 10);

        // Hide after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translate(-50%, -100px)';
        }, 3000);
    },
    
    sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); },

    loadScript(src) {
        if (this.loadedScripts[src] || document.querySelector(`script[src="${src}"]`)) {
            this.loadedScripts[src] = true;
            return Promise.resolve(true);
        }
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = () => {
                this.loadedScripts[src] = true;
                resolve(true);
            };
            s.onerror = () => reject(new Error(`Gagal mengunduh pustaka: ${src}`));
            document.head.appendChild(s);
        });
    },

    preloadViews() {
        const tabs = ['home', 'simpanan', 'pinjaman', 'profil', 'rat', 'toko', 'laporan', 'pengajuan_pinjaman'];
        const schedule = window.requestIdleCallback || ((cb) => setTimeout(cb, 800));
        schedule(() => {
            tabs.forEach(async (t) => {
                if (!this.viewCache[t]) {
                    try {
                        const res = await fetch(`${this.PORTAL_BASE}views/${t}.html?v=${this.VERSION}`);
                        if (res.ok) {
                            this.viewCache[t] = await res.text();
                        }
                    } catch (e) {}
                }
            });
        });
    },

    async init() {
        this.initSplashTheme(); // Set dynamic background & tips
        this.initTheme(); // Load dark/light mode from storage

        const splashText = document.getElementById('splash-loader-text');
        
        // 1. Instant Service Worker Registration & Fast Version Check
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('sw.js');
                
                // Cek update di latar belakang tanpa menahan pengguna
                fetch('version.json', { cache: 'no-store' })
                    .then(res => res.json())
                    .then(async (vData) => {
                        const lastSwVersion = localStorage.getItem('portal_sw_version');
                        if (vData?.sw_version && vData.sw_version !== lastSwVersion) {
                            localStorage.setItem('portal_sw_version', vData.sw_version);
                            try { await registration.update(); } catch(e) {}
                            if (registration.installing || registration.waiting) {
                                await this.waitForUpdate(registration);
                            }
                            window.location.reload();
                        } else if (vData?.sw_version) {
                            localStorage.setItem('portal_sw_version', vData.sw_version);
                        }
                    })
                    .catch(e => console.warn('Pengecekan versi latar belakang:', e));
            } catch (e) {
                console.warn('Service worker registration failed:', e);
            }
        }

        // 2. System Initialization
        this.initIdleMonitor();
        this.initVisibilityCheck();

        window.addEventListener('hashchange', () => {
            if (!this.member) return;
            const h = (window.location.hash || '').replace('#', '').trim();
            if (['home', 'simpanan', 'pinjaman', 'rat', 'profil'].includes(h)) {
                this.tab(h);
            }
        });

        document.getElementById('p-login-form').addEventListener('submit', e => { e.preventDefault(); this.login(); });
        const r = await this.api('portal/me');
        if (r?.data?.csrf_token) this.csrfToken = r.data.csrf_token;

        const hideSplash = () => {
            const splash = document.getElementById('initial-splash');
            if (splash) {
                splash.classList.add('fade-out');
                document.body.classList.remove('overflow-hidden');
                setTimeout(() => splash.remove(), 350);
            }
        };

        if (r?.success) {
            localStorage.setItem('kop_was_logged_in', 'true');
            this.member = r.data.anggota;
            this.pwaName = r.data.pwa_name || '';
            this.logoUrl = r.data.logo_url || '';
            this.appSettings = r.data.settings || {};
            await this.showApp();
            hideSplash();
            this.preloadViews();
        } else {
            hideSplash();
        }
    },

    waitForUpdate(registration) {
        return new Promise((resolve) => {
            if (registration.waiting) {
                resolve(true);
                return;
            }

            const onStateChange = (e) => {
                if (e.target.state === 'installed') {
                    resolve(true);
                }
            };

            if (registration.installing) {
                registration.installing.addEventListener('statechange', onStateChange);
            } else {
                // If not installing, listen for updatefound
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', onStateChange);
                });
                
                // Timeout as fallback
                setTimeout(() => resolve(false), 5000);
            }
        });
    },

    async login() {
        const err = document.getElementById('p-login-error');
        err.classList.add('hidden');

        const btn = document.getElementById('p-login-btn');
        const ogText = btn.innerHTML;
        btn.innerHTML = '<i class="ri-loader-4-line animate-spin inline-block"></i> Proses...';
        btn.disabled = true;

        const r = await this.api('portal/login', { method: 'POST', body: { no_anggota: document.getElementById('p-no-anggota').value, password: document.getElementById('p-password').value } });

        btn.innerHTML = ogText;
        btn.disabled = false;

        if (r?.success) {
            this.clearSwrCache();
            localStorage.setItem('kop_was_logged_in', 'true');
            this.member = r.data.anggota || r.data;
            this.pwaName = r.data.pwa_name || '';
            this.logoUrl = r.data.logo_url || '';
            this.appSettings = r.data.settings || {};
            if (r.data.csrf_token) this.csrfToken = r.data.csrf_token;
            this.showSplash();
        }
        else { err.textContent = r?.message || 'Login gagal'; err.classList.remove('hidden'); }
    },

    showSplash() {
        document.getElementById('portal-login').classList.add('hidden');
        const splash = document.getElementById('portal-splash');

        // Redesign post-login splash to match initial
        splash.className = "fixed inset-0 bg-gradient-to-br from-emerald-500 to-teal-700 z-[1000] flex flex-col items-center justify-center p-6 transition-all duration-700";

        const displayName = this.member.nama;

        splash.innerHTML = `
            <div class="flex flex-col items-center branding-appear">
                <div class="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl splash-logo">
                    <i class="bi bi-check-lg text-5xl text-emerald-500 splash-icon"></i>
                </div>
                <h2 class="text-2xl font-bold text-white mb-2 splash-text">Berhasil Masuk</h2>
                <p class="text-emerald-100 text-xs splash-subtext">Selamat datang kembali, ${displayName}!</p>
            </div>
        `;

        splash.classList.remove('hidden');

        setTimeout(() => {
            splash.classList.add('opacity-0', 'scale-110');
            this.showApp();
            const hashTab = (window.location.hash || '').replace('#', '').trim();
            const validTabs = ['home', 'simpanan', 'pinjaman', 'rat', 'profil'];
            this.tab(validTabs.includes(hashTab) ? hashTab : 'home');
            this.preloadViews();
            setTimeout(() => splash.remove(), 350);
        }, 750);
    },

    async logout() {
        const result = await Swal.fire({
            title: 'Keluar Portal?',
            text: 'Anda harus login kembali untuk mengakses data Anda.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#f1f5f9',
            confirmButtonText: 'Ya, Keluar',
            cancelButtonText: 'Batal',
            reverseButtons: true,
            customClass: {
                popup: 'rounded-3xl',
                confirmButton: 'rounded-xl px-6 py-2.5 font-bold',
                cancelButton: 'rounded-xl px-6 py-2.5 font-bold text-gray-500'
            }
        });

        if (result.isConfirmed) {
            this.clearSwrCache();
            localStorage.removeItem('kop_was_logged_in');
            if (this.idleTimer) clearTimeout(this.idleTimer);
            await this.api('portal/logout', { method: 'POST' });
            location.reload();
        }
    },

    initIdleMonitor() {
        const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
        const reset = () => this.resetIdleTimer();
        events.forEach(name => document.addEventListener(name, reset, true));
        this.resetIdleTimer();
    },

    resetIdleTimer() {
        if (!this.member) return;
        if (this.idleTimer) clearTimeout(this.idleTimer);
        this.idleTimer = setTimeout(async () => {
            if (this.member) {
                // Perform real logout
                this.clearSwrCache();
                localStorage.removeItem('kop_was_logged_in');
                this.member = null;
                
                try {
                    await this.api('portal/logout', { method: 'POST' });
                } catch (e) {}

                Swal.fire({
                    title: 'Sesi Berakhir',
                    text: 'Anda telah dikeluarkan otomatis karena tidak ada aktivitas selama 5 menit.',
                    icon: 'info',
                    confirmButtonText: 'Masuk Kembali',
                    confirmButtonColor: '#2563eb'
                }).then(() => location.reload());
            }
        }, this.IDLE_TIMEOUT);
    },

    initVisibilityCheck() {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.member) {
                // Silently check session when coming back to tab
                this.api('portal/me');
            }
        });
    },

    async loadRAT() {
        const sessionContainer = document.getElementById('rat-session-container');
        const emptyState = document.getElementById('rat-empty-state');
        if (!sessionContainer || !emptyState) return;

        const res = await this.api('rat?status=aktif');
        if (!res?.success) {
            sessionContainer.innerHTML = '<div class="text-center py-20 text-gray-500 text-xs">Gagal memuat data RAT</div>';
            return;
        }

        if (res.data.length === 0) {
            sessionContainer.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            sessionContainer.classList.remove('hidden');
            emptyState.classList.add('hidden');

            sessionContainer.innerHTML = res.data.map(rat => `
                <div class="relative z-10 mb-8">
                    <div class="bg-gradient-to-br from-indigo-600 via-blue-700 to-indigo-900 rounded-[2.5rem] p-7 text-white shadow-xl shadow-indigo-500/20 overflow-hidden relative">
                        <!-- Premium Glass Ornaments -->
                        <div class="absolute top-0 right-0 -mt-6 -mr-6 w-32 h-32 bg-white rounded-full mix-blend-overlay opacity-20 blur-2xl"></div>
                        <div class="absolute bottom-0 left-0 -mb-6 -ml-6 w-24 h-24 bg-indigo-300 rounded-full mix-blend-overlay opacity-20 blur-xl"></div>
                        
                        <div class="relative z-10">
                            <div class="flex justify-between items-start mb-6">
                                <div class="max-w-[70%]">
                                    <p class="text-[10px] font-bold text-indigo-100 uppercase tracking-[0.2em] mb-1 opacity-80">Sesi Berlanjut</p>
                                    <h3 class="text-xl font-black tracking-tight leading-tight drop-shadow-sm">${rat.judul}</h3>
                                </div>
                                <span class="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[9px] font-bold uppercase border border-white/20 tracking-widest">AKTIF</span>
                            </div>
                            
                            <div class="flex items-center gap-2 mb-6 text-indigo-100/80">
                                <i class="bi bi-geo-alt text-sm"></i>
                                <p class="text-xs font-medium">${rat.lokasi || 'Lokasi Kegiatan'}</p>
                            </div>

                            <button onclick="Portal.openScanner(${rat.id})" class="w-full bg-white text-indigo-700 py-4 rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                                <i class="bi bi-qr-code-scan"></i> SCAN QR PRESENSI
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Menu Tabs -->
                <div class="flex items-center gap-6 border-b border-gray-100 mb-8 px-2">
                    <button onclick="Portal.switchRatTab(${rat.id}, 'voting')" id="rat-tab-btn-${rat.id}-voting" class="pb-4 text-[10px] font-black tracking-[0.2em] uppercase border-b-2 border-indigo-600 text-indigo-600 transition-all">VOTING</button>
                    <button onclick="Portal.switchRatTab(${rat.id}, 'documents')" id="rat-tab-btn-${rat.id}-documents" class="pb-4 text-[10px] font-black tracking-[0.2em] uppercase border-b-2 border-transparent text-gray-400 transition-all">MATERI & DOKUMEN</button>
                </div>

                <div id="rat-tab-content-${rat.id}-voting" class="rat-tab-content space-y-6">
                    <div class="flex items-center justify-between px-2">
                        <h4 class="font-black text-gray-900 text-xs uppercase tracking-widest">E-Voting</h4>
                        <i class="bi bi-info-circle text-gray-400" onclick="alert('Setiap anggota hanya memiliki 1 hak suara per topik.')"></i>
                    </div>
                    <div id="voting-container-${rat.id}" class="space-y-4 pb-10"></div>
                </div>

                <div id="rat-tab-content-${rat.id}-documents" class="rat-tab-content space-y-6 hidden pb-10">
                    <div class="px-2">
                        <h4 class="font-black text-gray-900 dark:text-obsidian-100 text-xs uppercase tracking-widest">Digital Reports</h4>
                    </div>
                    <div id="docs-container-${rat.id}" class="space-y-3"></div>
                </div>`).join('');

            // Trigger loading topics after render
            res.data.forEach(rat => {
                setTimeout(() => this.loadPortalTopics(rat.id), 100);
                setTimeout(() => this.loadRatDocuments(rat.id), 100);
            });
        }
    },

    switchRatTab(sessionId, tabName) {
        /* Hide all contents for this session */
        const contents = document.querySelectorAll(`[id^="rat-tab-content-${sessionId}-"]`);
        contents.forEach(c => c.classList.add('hidden'));

        /* Show selected content */
        document.getElementById(`rat-tab-content-${sessionId}-${tabName}`).classList.remove('hidden');

        /* Update tab buttons */
        const buttons = document.querySelectorAll(`[id^="rat-tab-btn-${sessionId}-"]`);
        buttons.forEach(b => {
            b.classList.remove('border-primary-600', 'text-primary-600');
            b.classList.add('border-transparent', 'text-gray-400');
        });

        const activeBtn = document.getElementById(`rat-tab-btn-${sessionId}-${tabName}`);
        activeBtn.classList.remove('border-transparent', 'text-gray-400');
        activeBtn.classList.add('border-primary-600', 'text-primary-600');
    },

    async loadRatDocuments(sessionId) {
        const container = document.getElementById(`docs-container-${sessionId}`);
        if (!container) return;

        const res = await this.api(`rat/sessions/${sessionId}/documents`);
        if (!res?.success) return;

        if (res.data.length === 0) {
            container.innerHTML = `
            <div class="bg-white dark:bg-obsidian-900 rounded-3xl p-10 text-center border border-gray-100 dark:border-obsidian-800 italic">
                <i class="bi bi-file-earmark-lock text-3xl text-gray-200 dark:text-obsidian-700 mb-2 block"></i>
                <p class="text-[10px] text-gray-400 dark:text-obsidian-500">Belum ada materi atau laporan digital yang diunggah untuk rapat ini.</p>
            </div>`;
            return;
        }

        container.innerHTML = res.data.map(d => `
            <div class="bg-white dark:bg-obsidian-900 rounded-2xl p-4 shadow-sm border border-gray-50 dark:border-obsidian-800 flex items-center justify-between group active:scale-[0.98] transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400 flex items-center justify-center text-xl shadow-sm border border-rose-100 dark:border-rose-800">
                        <i class="bi bi-file-earmark-pdf"></i>
                    </div>
                    <div>
                        <h5 class="text-xs font-extrabold text-gray-800 dark:text-obsidian-100 line-clamp-1">${d.nama_dokumen}</h5>
                        <p class="text-[9px] text-gray-400 dark:text-obsidian-500 font-black uppercase tracking-widest mt-0.5">${d.kategori}</p>
                    </div>
                </div>
                <a href="${this.API.replace(/\/api\/?$/, '')}/${d.file_path}" target="_blank" 
                    class="w-8 h-8 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center hover:bg-primary-600 dark:hover:bg-primary-500 hover:text-white transition-all">
                    <i class="bi bi-download"></i>
                </a>
            </div>
        `).join('');
    },

    async openScanner(sessionId) {
        const html = `
        <div class="p-6 text-center">
            <h3 class="text-lg font-bold text-gray-800 mb-2">Presensi RAT</h3>
            <p class="text-xs text-gray-500 mb-6">Arahkan kamera ke Kode QR di layar utama rapat.</p>
            <div id="reader" class="rounded-2xl overflow-hidden border-2 border-primary-100 bg-gray-50 shadow-inner" style="width: 100%;"></div>
            <button onclick="Swal.close(); Portal.stopScanner();" class="mt-6 w-full py-3 bg-gray-100 text-gray-500 rounded-2xl font-bold text-sm uppercase">Batal</button>
        </div>`;

        if (typeof Html5Qrcode === 'undefined') {
            try {
                await this.loadScript('https://unpkg.com/html5-qrcode');
            } catch (err) {
                Swal.fire('Error', 'Gagal memuat pustaka scanner QR: ' + err.message, 'error');
                return;
            }
        }

        Swal.fire({
            html: html,
            showConfirmButton: false,
            padding: 0,
            width: '90%',
            customClass: { container: 'z-[1000]' },
            didOpen: () => {
                this.html5QrCode = new Html5Qrcode("reader");
                const config = { fps: 10, qrbox: { width: 250, height: 250 } };

                this.html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        this.stopScanner();
                        this.submitAttendance(sessionId, decodedText);
                    },
                    (errorMessage) => { /* ignore */ }
                ).catch(err => {
                    Swal.fire('Error', 'Gagal mengakses kamera: ' + err, 'error');
                    Swal.close();
                });
            },
            willClose: () => {
                this.stopScanner();
            }
        });
    },

    stopScanner() {
        if (this.html5QrCode) {
            this.html5QrCode.stop().then(() => {
                this.html5QrCode.clear();
            }).catch(err => console.log(err));
        }
    },

    async submitAttendance(sessionId, token) {
        Swal.fire({ title: 'Proses...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
        const res = await this.api(`rat/attendance`, {
            method: 'POST',
            body: { session_id: sessionId, qr_token: token }
        });
        Swal.close();

        if (res?.success) {
            Swal.fire({
                title: 'Berhasil Hadir!',
                text: 'Presensi Anda telah tercatat dalam sistem RAT.',
                icon: 'success',
                confirmButtonText: 'Lanjutkan',
                confirmButtonColor: '#4f46e5'
            });
        } else {
            Swal.fire({
                title: 'Presensi Gagal',
                text: res?.message || 'Token QR tidak valid atau sudah expired.',
                icon: 'error',
                confirmButtonText: 'Coba Lagi'
            }).then(() => this.openScanner(sessionId));
        }
    },

    async loadPortalTopics(sessionId) {
        const res = await this.api(`rat/${sessionId}/topics`);
        if (!res?.success) return;

        const container = document.getElementById(`voting-container-${sessionId}`);
        if (!container) return;

        if (res.data.length === 0) {
            container.innerHTML = '<p class="text-[11px] text-center text-gray-400 dark:text-obsidian-500 py-6 font-medium bg-white dark:bg-obsidian-900 rounded-3xl border border-gray-100 dark:border-obsidian-800">Belum ada topik voting yang dibuka.</p>';
            return;
        }

        container.innerHTML = res.data.map(t => {
            if (t.status !== 'buka' && t.status !== 'tutup') return '';

            const isTutup = t.status === 'tutup';
            const isElection = t.is_member_election == 1;

            return `
            <div class="bg-white dark:bg-obsidian-900 rounded-3xl p-5 shadow-sm border border-gray-50 dark:border-obsidian-800 animate-fadeIn transition-all">
                <div class="flex items-center gap-2 mb-2">
                    <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${isTutup ? 'bg-gray-100 dark:bg-obsidian-800 text-gray-500 dark:text-obsidian-500' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 animate-pulse'}">
                        ${isTutup ? 'VOTING DITUTUP' : 'VOTING DIBUKA'}
                    </span>
                    ${isElection ? '<span class="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase">PEMILIHAN</span>' : ''}
                </div>
                <h5 class="text-sm font-extrabold text-gray-800 dark:text-obsidian-100 leading-tight">${t.judul}</h5>
                <p class="text-[10px] text-gray-400 dark:text-obsidian-500 mt-1">${t.deskripsi || ''}</p>
                
                <div class="mt-4 space-y-2">
                    ${t.options.map(opt => `
                        <button ${isTutup ? 'disabled' : `onclick="Portal.castVote(${t.id}, ${opt.id}, '${opt.label}')"`} 
                            class="w-full relative group overflow-hidden border border-gray-100 dark:border-obsidian-800 rounded-2xl p-3 text-left transition-all active:scale-95 ${isTutup ? 'opacity-70 grayscale-[0.5]' : 'hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 active:bg-primary-100'}">
                            <div class="flex items-center justify-between relative z-10">
                                <span class="text-xs font-bold ${isTutup ? 'text-gray-500 dark:text-obsidian-500' : 'text-gray-700 dark:text-obsidian-200 group-hover:text-primary-700 dark:group-hover:text-primary-400'}">${opt.label}</span>
                                ${isTutup ? `<span class="text-[10px] font-black text-primary-600 dark:text-primary-400">${opt.votes} Suara</span>` : '<i class="bi bi-chevron-right text-gray-300 dark:text-obsidian-700"></i>'}
                            </div>
                            ${isTutup ? `
                            <div class="absolute top-0 left-0 h-full bg-primary-100/50 dark:bg-primary-900/30 transition-all duration-1000" style="width: ${t.total_votes > 0 ? (opt.votes / t.total_votes) * 100 : 0}%"></div>
                            ` : ''}
                        </button>
                    `).join('')}
                </div>
                
                ${!isTutup && isElection ? `
                <button onclick="Portal.openMemberPicker(${t.id}, '${t.judul.replace(/'/g, "\\'")}')" class="w-full mt-3 py-3 border-2 border-dashed border-primary-200 dark:border-obsidian-700 rounded-2xl text-primary-600 dark:text-primary-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary-50 dark:hover:bg-obsidian-800 active:scale-95 transition-all">
                    <i class="bi bi-person-plus-fill"></i> Cari Anggota Lain
                </button>
                ` : ''}

                ${isTutup ? '' : `<p class="text-[9px] text-gray-400 dark:text-obsidian-500 mt-4 text-center italic">${isElection ? 'Pilih salah satu kandidat di atas atau cari anggota lain.' : 'Ketuk salah satu opsi di atas untuk mengirim suara Anda.'}</p>`}
            </div>`;
        }).join('');
    },

    async openMemberPicker(topicId, judul) {
        const html = `
        <div class="p-6">
            <h3 class="text-lg font-bold text-gray-800 dark:text-obsidian-100 mb-1">Cari Anggota</h3>
            <p class="text-[10px] text-gray-400 dark:text-obsidian-500 mb-6">Pilih anggota yang ingin Anda jadikan kandidat.</p>
            <div class="relative mb-4">
                <i class="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-obsidian-600"></i>
                <input type="text" id="member-search-input" oninput="Portal.searchMembersWithDebounce(this.value, ${topicId})" class="w-full bg-gray-50 dark:bg-obsidian-950 border border-gray-100 dark:border-obsidian-800 rounded-2xl px-5 py-3.5 pl-11 text-sm focus:bg-white dark:focus:bg-obsidian-900 focus:ring-2 focus:ring-primary-500 transition-all dark:text-obsidian-100" placeholder="Cari Nama / No. Anggota...">
            </div>
            <div id="member-search-results" class="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                <p class="text-[10px] text-center text-gray-400 dark:text-obsidian-600 py-10">Ketik minimal 3 karakter untuk mencari...</p>
            </div>
            <button onclick="Swal.close()" class="mt-6 w-full py-3 bg-gray-100 dark:bg-obsidian-800 text-gray-500 dark:text-obsidian-400 rounded-2xl font-bold text-sm uppercase">Batal</button>
        </div>`;
        Swal.fire({ html, showConfirmButton: false, width: '95%', padding: 0, customClass: { container: 'z-[1001]' } });
        setTimeout(() => document.getElementById('member-search-input').focus(), 300);
    },

    searchMembersWithDebounce(query, topicId) {
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.searchMembersForElection(query, topicId);
        }, 300);
    },

    async searchMembersForElection(query, topicId) {
        const resPanel = document.getElementById('member-search-results');
        if (query.length < 3) {
            resPanel.innerHTML = '<p class="text-[10px] text-center text-gray-400 py-10">Ketik minimal 3 karakter untuk mencari...</p>';
            return;
        }

        resPanel.innerHTML = '<div class="flex justify-center py-10"><i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>';

        // Using existing anggota API
        const r = await this.api(`anggota?search=${encodeURIComponent(query)}&per_page=10`);
        if (!r?.success || r.data.length === 0) {
            resPanel.innerHTML = '<p class="text-[10px] text-center text-gray-400 py-10">Anggota tidak ditemukan.</p>';
            return;
        }

        resPanel.innerHTML = r.data.map(a => `
            <button onclick="Portal.castVote(${topicId}, null, '${a.nama}', {anggota_id: ${a.id}})" class="w-full flex items-center justify-between p-3 bg-white dark:bg-obsidian-900 border border-gray-100 dark:border-obsidian-800 rounded-2xl hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all text-left">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-[10px]">${a.nama.charAt(0)}</div>
                    <div>
                        <p class="text-xs font-bold text-gray-800 dark:text-obsidian-100">${a.nama}</p>
                        <p class="text-[9px] text-gray-400 dark:text-obsidian-500 font-mono">${a.no_anggota}</p>
                    </div>
                </div>
                <i class="bi bi-chevron-right text-gray-300 dark:text-obsidian-700"></i>
            </button>
        `).join('');
    },

    async castVote(topicId, optionId, label, params = {}) {
        const ok = await Swal.fire({
            title: 'Konfirmasi Suara',
            text: `Anda yakin ingin memilih "${label}"? Pilihan tidak dapat diubah setelah dikirim.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Kirim Suara',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#f3f4f6',
            customClass: { confirmButton: 'text-sm font-bold rounded-xl', cancelButton: 'text-sm font-bold rounded-xl text-gray-600' }
        });

        if (!ok.isConfirmed) return;

        Swal.fire({ title: 'Proses...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

        const body = optionId === null ? { anggota_id: params.anggota_id } : { option_id: optionId };

        const res = await this.api(`rat/topics/${topicId}/vote`, {
            method: 'POST',
            body: body
        });
        Swal.close();

        if (res?.success) {
            Swal.fire({
                title: 'Suara Terkirim!',
                text: 'Terima kasih atas partisipasi Anda.',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            // Reload list to show results if it was the last topic or closed
            setTimeout(() => this.loadRAT(), 500);
        } else {
            Swal.fire('Gagal', res?.message || 'Gagal mengirim suara', 'error');
        }
    },

    showApp() {
        // Add logic to show the app container
        document.getElementById('portal-login').classList.add('hidden');
        document.getElementById('portal-app').classList.remove('hidden');

        // Populate shared member data (Digital Card in Profil)
        const elNama = document.getElementById('p-nama-profil');
        const elNo = document.getElementById('p-no-profil');
        const elTgl = document.getElementById('p-tgl-gabung');
        const elImg = document.getElementById('p-avatar-profil');

        if (elNama) elNama.textContent = this.member.nama;
        if (elNo) elNo.textContent = this.member.no_anggota;
        const tglAwal = this.parseDate(this.member.tgl_gabung || this.member.created_at);
        if (elTgl) elTgl.textContent = 'Bersama Sejak ' + (tglAwal ? tglAwal.getFullYear() : '2026');
        if (elImg) {
            elImg.src = this.getAvatarUrl(this.member.nama);
        }

        const hashTab = (window.location.hash || '').replace('#', '').trim();
        const validTabs = ['home', 'simpanan', 'pinjaman', 'rat', 'profil'];
        this.tab(validTabs.includes(hashTab) ? hashTab : 'home');
    },

    initTheme() {
        const theme = localStorage.getItem('kop_portal_theme') || 'light';
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
            document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#020617');
        } else {
            document.documentElement.classList.remove('dark');
            document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#4F46E5');
        }
    },

    toggleTheme() {
        const isDark = document.documentElement.classList.toggle('dark');
        const theme = isDark ? 'dark' : 'light';
        localStorage.setItem('kop_portal_theme', theme);
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#020617' : '#4F46E5');

        const Toast = Swal.mixin({
            toast: true,
            position: 'top',
            showConfirmButton: false,
            timer: 1500,
            timerProgressBar: true,
            customClass: { popup: 'rounded-2xl dark:bg-slate-800 dark:text-white' }
        });

        Toast.fire({
            icon: 'success',
            title: `Mode ${isDark ? 'Gelap' : 'Terang'} diaktifkan`
        });

        // Update charts if on home tab
        const activeTab = document.querySelector('.nav-item.active')?.id.replace('tab-', '');
        if (activeTab === 'home') this.loadDashboardData();
    },

    showSkeletonDashboard() {
        const containers = ['h-simpanan-breakdown', 'h-notif-list', 'shu-total-estimasi'];
        containers.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'shu-total-estimasi') el.innerHTML = '<div class="skeleton w-24 h-6"></div>';
                else el.innerHTML = '<div class="space-y-3"><div class="skeleton w-full h-12"></div><div class="skeleton w-full h-12"></div></div>';
            }
        });
    },

    showSkeletonSimpanan() {
        const el = document.getElementById('p-content-simpanan');
        if (el) el.innerHTML = '<div class="space-y-3"><div class="skeleton w-full h-24"></div><div class="skeleton w-full h-24"></div><div class="skeleton w-full h-24"></div></div>';
    },

    showSkeletonPinjaman() {
        const el = document.getElementById('p-content-pinjaman');
        if (el) el.innerHTML = '<div class="space-y-4"><div class="skeleton w-full h-32"></div><div class="skeleton w-full h-32"></div></div>';
    },

    async loadDashboardData() {
        // Initialize text values
        const displayName = this.member?.nama || 'Anggota';
        const elNama = document.getElementById('h-nama');
        const elNo = document.getElementById('h-no');
        if (elNama) elNama.textContent = displayName;
        if (elNo) elNo.textContent = this.member?.no_anggota || '';

        // Set avatar with generated initial
        const img = document.getElementById('h-avatar');
        if (img) {
            img.src = this.getAvatarUrl(displayName);
        }

        // Update Dynamic Greeting (Home Tab)
        const greeting = this.getGreeting();
        const elGreetText = document.getElementById('h-greeting-text');
        const elGreetIcon = document.getElementById('h-greeting-icon');
        if (elGreetText) elGreetText.textContent = greeting.text + ',';
        if (elGreetIcon) {
            elGreetIcon.innerHTML = `<i class="bi ${greeting.icon}"></i>`;
        }

        // 1. SWR STALE: Render cached dashboard immediately in 0ms if present
        const cachedSummary = this.getSwrCache('portal/dashboard-summary');
        if (cachedSummary) {
            this.renderDashboardData(cachedSummary);
            this.dataCache['dashboard'] = true;
        }

        // 2. REVALIDATE: Fetch fresh data from backend
        let freshData = null;
        const summary = await this.api('portal/dashboard-summary');
        if (summary?.success && summary.data) {
            freshData = summary.data;
        } else {
            // Fallback for backwards compatibility
            const [rSaldo, rPinjaman, rUpcoming, rNotif, rTagihan, rPengumuman, rRatWidget, rAktivitas] = await Promise.all([
                this.api('portal/saldo'),
                this.api('portal/pinjaman'),
                this.api('portal/angsuran-upcoming'),
                this.api('portal/notifications'),
                this.api('portal/tagihan-terdekat'),
                this.api('portal/pengumuman'),
                this.api('portal/rat-widget'),
                this.api('portal/aktivitas-terbaru')
            ]);
            if (rSaldo?.success) {
                freshData = {
                    saldo: rSaldo.data || [],
                    pinjaman: rPinjaman?.data || [],
                    upcoming: rUpcoming?.data || [],
                    notifications: rNotif?.data || [],
                    tagihan: rTagihan?.data || null,
                    pengumuman: rPengumuman?.data || [],
                    rat_widget: rRatWidget?.data || null,
                    aktivitas: rAktivitas?.data || []
                };
            }
        }

        if (freshData) {
            this.setSwrCache('portal/dashboard-summary', freshData);
            if (freshData.saldo) this.setSwrCache('portal/saldo', freshData.saldo);
            if (freshData.pinjaman) this.setSwrCache('portal/pinjaman', freshData.pinjaman);
            this.renderDashboardData(freshData);
            this.dataCache['dashboard'] = true;
        }
    },

    renderDashboardData(d) {
        if (!d) return;

        const rSaldo = { success: true, data: d.saldo || [] };
        const rPinjaman = { success: true, data: d.pinjaman || [] };
        const rUpcoming = { success: true, data: d.upcoming || [] };
        const rNotif = { success: true, data: d.notifications || [] };
        const rTagihan = { success: true, data: d.tagihan || null };
        const rPengumuman = { success: true, data: d.pengumuman || [] };
        const rRatWidget = { success: true, data: d.rat_widget || null };
        const rAktivitas = { success: true, data: d.aktivitas || [] };

        /* Update Widget Musim RAT */
        this.renderRatWidget(rRatWidget.data);

        /* Update Billing Card Widget */
        if (rTagihan.data) {
            this.renderBillingCard(rTagihan.data);
        }

        /* Update Feed Aktivitas Terbaru */
        this.renderRecentActivities(rAktivitas.data);

        // Muat Status Kesehatan & Transparansi Koperasi untuk banner
        this.loadTransparansiBanner();

        // Update Operational Cash Counter Status Bar
        this.updateOperationalBar();

        // Update Notifications
        let rawNotifs = rNotif.data || [];
        const readKeys = JSON.parse(localStorage.getItem('kop_notif_read') || '[]');

        this.notifications = rawNotifs.filter(n => {
            n.key = btoa(n.title + '|' + n.raw_date).replace(/=/g, '');
            return !readKeys.includes(n.key);
        });

        this.renderNotifications();

        let totalSimpanan = 0;
        let totalPinjaman = 0;

        // Notifikasi angsuran jatuh tempo
        const notifEl = document.getElementById('h-notif-angsuran');
        const notifList = document.getElementById('h-notif-list');
        if (rUpcoming.data.length > 0 && notifEl && notifList) {
            notifList.innerHTML = rUpcoming.data.map(a => {
                const hariLagi = parseInt(a.hari_lagi || 0);
                const isHariIni = hariLagi === 0;
                const urgencyColor = isHariIni ? 'text-red-700 font-bold' : 'text-amber-700';
                const hariLabel = isHariIni ? 'HARI INI!' : `${hariLagi} hari lagi`;
                return `
                <div class="flex justify-between items-center bg-white rounded-xl px-3 py-2 border border-amber-100 cursor-pointer" onclick="Portal.tab('pinjaman')">
                    <div>
                        <p class="text-xs font-semibold text-gray-800">${a.jenis_pinjaman} – Angsuran ke-${a.angsuran_ke}</p>
                        <p class="text-[9px] text-gray-500">${a.no_pinjaman} · ${this.fdate(a.tgl_jatuh_tempo)}</p>
                    </div>
                    <div class="text-right shrink-0 ml-2">
                        <p class="text-xs font-bold text-gray-800">${this.rp(a.total)}</p>
                        <p class="text-[9px] ${urgencyColor}">${hariLabel}</p>
                    </div>
                </div>`;
            }).join('');
            notifEl.classList.remove('hidden');
        } else if (notifEl) {
            notifEl.classList.add('hidden');
        }

        // Process Announcements (Pengumuman)
        const pengumumanContainer = document.getElementById('h-pengumuman-container');
        if (rPengumuman.data.length > 0 && pengumumanContainer) {
            const iconMap = {
                'info': '<i class="bi bi-info-circle-fill text-blue-500"></i>',
                'warning': '<i class="bi bi-exclamation-triangle-fill text-amber-500"></i>',
                'promo': '<i class="bi bi-stars text-emerald-500"></i>'
            };

            pengumumanContainer.innerHTML = rPengumuman.data.map(p => {
                const safeJudul = p.judul.replace(/\r?\n/g, ' ').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const safeKonten = p.konten.replace(/\r?\n/g, '<br>').replace(/'/g, "\\'").replace(/"/g, '&quot;');
                const swalIcon = p.tipe === 'promo' ? 'success' : (p.tipe === 'warning' ? 'warning' : 'info');

                const bgMap = {
                    'info': 'bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/30',
                    'warning': 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/30',
                    'promo': 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/30'
                };

                return `
                <div class="rounded-2xl border p-4 shadow-sm cursor-pointer transition active:scale-[0.98] ${bgMap[p.tipe] || bgMap['info']}" 
                     onclick="Swal.fire({ title: '${safeJudul}', html: '<div class=&quot;text-sm text-gray-600 dark:text-obsidian-300 text-left mb-2&quot;>${safeKonten}</div>', icon: '${swalIcon}', confirmButtonText: 'Tutup', confirmButtonColor: '#4f46e5' })">
                    <div class="flex items-start gap-3">
                        <div class="text-xl shrink-0 mt-0.5">${iconMap[p.tipe] || iconMap['info']}</div>
                        <div class="flex-1 min-w-0">
                            <div class="flex justify-between items-start gap-2 mb-1">
                                <h4 class="text-sm font-bold text-gray-800 dark:text-obsidian-100 line-clamp-1">${p.judul}</h4>
                                <span class="text-[9px] font-medium text-gray-500 dark:text-obsidian-500 shrink-0 whitespace-nowrap">${Portal.fdate(p.created_at)}</span>
                            </div>
                            <p class="text-xs text-gray-600 dark:text-obsidian-400 line-clamp-2">${p.konten}</p>
                        </div>
                    </div>
                </div>`;
            }).join('');
        } else if (pengumumanContainer) {
            pengumumanContainer.innerHTML = '';
        }

        // Process Saldo (Calculate total regardless of breakdown DOM element)
        if (Array.isArray(rSaldo?.data)) {
            rSaldo.data.forEach(s => {
                totalSimpanan += parseFloat(s.saldo || 0);
            });
        }

        const bd = document.getElementById('h-simpanan-breakdown');
        if (bd && Array.isArray(rSaldo?.data)) {
            bd.innerHTML = '';
            rSaldo.data.forEach(s => {
                const val = parseFloat(s.saldo || 0);
                let icon = 'bi-wallet2 text-blue-500 bg-blue-50 dark:bg-blue-900/30';
                if (s.nama.toLowerCase().includes('wajib')) icon = 'bi-shield-check text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30';
                if (s.nama.toLowerCase().includes('sukarela')) icon = 'bi-piggy-bank text-orange-500 bg-orange-50 dark:bg-orange-900/30';
                if (s.nama.toLowerCase().includes('partisipatif')) icon = 'bi-bank text-purple-500 bg-purple-50 border-purple-100 dark:bg-purple-900/30';

                bd.innerHTML += `
                <div class="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-obsidian-800/40 rounded-xl border border-gray-100 dark:border-obsidian-800 hover:border-blue-100 dark:hover:border-blue-900 hover:bg-white dark:hover:bg-obsidian-800 transition-all cursor-pointer" 
                    onclick="Portal.tab('simpanan').then(() => setTimeout(() => Portal.openSimpananDetail('${s.id}', '${s.nama}', ${val}), 300))">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full ${icon.split(' ')[2]} flex items-center justify-center border border-white dark:border-obsidian-700 shrink-0">
                            <i class="bi ${icon.split(' ')[0]} ${icon.split(' ')[1]}"></i>
                        </div>
                        <div><p class="text-xs font-bold text-gray-800 dark:text-obsidian-100">${s.nama}</p></div>
                    </div>
                    <p class="text-sm font-bold text-gray-800 dark:text-obsidian-100">${this.rp(val)}</p>
                </div>`;
            });
            if (rSaldo.data.length === 0) bd.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">Belum ada simpanan</p>';
        }

        // Process Pinjaman (Calculate total regardless of breakdown DOM element)
        if (Array.isArray(rPinjaman?.data)) {
            rPinjaman.data.forEach(p => {
                if (p.status === 'cair') totalPinjaman += parseFloat(p.sisa_pinjaman || 0);
            });
        }

        const bdPin = document.getElementById('h-pinjaman-breakdown');
        if (bdPin && Array.isArray(rPinjaman?.data)) {
            bdPin.innerHTML = '';
            const pinList = rPinjaman.data;
            if (pinList.length === 0) {
                bdPin.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">Belum ada pinjaman</p>';
            } else {
                pinList.forEach(p => {
                    const isLunas = p.status === 'lunas';
                    const isCair = p.status === 'cair';
                    const badgeClass = isLunas
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : (isCair ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400');
                    const badgeIcon = isLunas ? 'bi-check-circle-fill' : (isCair ? 'bi-clock-history' : 'bi-hourglass-split');
                    const sisa = parseFloat(p.sisa_pinjaman || 0);

                    bdPin.innerHTML += `
                    <div class="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-obsidian-800/40 rounded-xl border border-gray-100 dark:border-obsidian-800 hover:border-rose-100 dark:hover:border-rose-900 hover:bg-white dark:hover:bg-obsidian-800 transition-all cursor-pointer" 
                        onclick="Portal.tab('pinjaman').then(() => setTimeout(() => Portal.openPinjamanDetail('${p.id}', '${p.no_pinjaman}', '${p.jenis_pinjaman}', ${p.jumlah || 0}, ${sisa}, ${isLunas}), 300))">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center border border-white dark:border-obsidian-700 shrink-0">
                                <i class="bi bi-cash-stack text-rose-500 dark:text-rose-400"></i>
                            </div>
                            <div>
                                <p class="text-xs font-bold text-gray-800 dark:text-obsidian-100">${p.jenis_pinjaman}</p>
                                <p class="text-[9px] text-gray-400 dark:text-obsidian-400">${p.no_pinjaman} &bull; ${p.tenor} bln</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-xs font-bold ${isLunas ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}">${this.rp(sisa)}</p>
                            <span class="px-1.5 py-0.5 rounded-full text-[8px] font-bold ${badgeClass} inline-flex items-center gap-0.5 mt-0.5">
                                <i class="bi ${badgeIcon}"></i> ${p.status}
                            </span>
                        </div>
                    </div>`;
                });
            }
        }

        const elTotSimp = document.getElementById('h-total-simpanan');
        const elTotPinj = document.getElementById('h-total-pinjaman');
        if (elTotSimp) elTotSimp.textContent = this.rp(totalSimpanan);
        if (elTotPinj) elTotPinj.textContent = this.rp(totalPinjaman);

        // Ringkasan Aset
        const totalAset = totalSimpanan;
        const totalKewajiban = totalPinjaman;
        const ekuitas = totalAset - totalKewajiban;
        const totalCombined = totalAset + totalKewajiban;
        const rasio = totalCombined > 0 ? Math.round((totalAset / totalCombined) * 100) : 100;

        const elAsetTotal = document.getElementById('h-aset-total');
        const elAsetKewajiban = document.getElementById('h-aset-kewajiban');
        const elAsetEkuitas = document.getElementById('h-aset-ekuitas');
        const elAsetBar = document.getElementById('h-aset-bar');
        const elRasioLabel = document.getElementById('h-rasio-label');
        const elAsetTime = document.getElementById('h-aset-time');

        if (elAsetTotal) elAsetTotal.textContent = this.rp(totalAset);
        if (elAsetKewajiban) elAsetKewajiban.textContent = this.rp(totalKewajiban);
        if (elAsetEkuitas) {
            elAsetEkuitas.textContent = this.rp(ekuitas);
            elAsetEkuitas.className = `text-sm font-bold ${ekuitas >= 0 ? 'text-indigo-600' : 'text-rose-600'}`;
        }
        if (elRasioLabel) elRasioLabel.textContent = rasio + '%';
        if (elAsetTime) elAsetTime.textContent = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        if (elAsetBar) {
            const barColor = rasio >= 80
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                : (rasio >= 50
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400'
                    : 'bg-gradient-to-r from-rose-400 to-orange-400');
            elAsetBar.className = `h-full rounded-full ${barColor} transition-all duration-700`;
            setTimeout(() => { elAsetBar.style.width = rasio + '%'; }, 100);
        }
    },

    renderBillingCard(data) {
        const container = document.getElementById('h-billing-container');
        if (!container) return;

        if (!data) {
            container.innerHTML = '';
            return;
        }

        const { has_loan, tagihan, sukarela, pending_pengajuan } = data;

        // KASUS 1: Ada tagihan angsuran terdekat belum lunas
        if (tagihan) {
            const hariLagi = parseInt(tagihan.hari_lagi || 0);
            const isOverdue = hariLagi < 0;
            const isToday = hariLagi === 0;
            const totalNominal = parseFloat(tagihan.total || 0);
            const saldoSukarela = sukarela ? parseFloat(sukarela.saldo || 0) : 0;
            const isSaldoCukup = saldoSukarela >= totalNominal;

            // Perhitungan Tenor & Progress Pelunasan
            const tenorTotal = parseInt(tagihan.tenor || 1);
            const angsuranKe = parseInt(tagihan.angsuran_ke || 1);
            const sisaBulan = Math.max(0, tenorTotal - angsuranKe);
            const persenTenor = Math.min(100, Math.max(0, Math.round((angsuranKe / tenorTotal) * 100)));

            // Rincian Pokok, Bunga, Denda, Sisa Pinjaman
            const pokok = parseFloat(tagihan.pokok || 0);
            const bunga = parseFloat(tagihan.bunga || 0);
            const denda = parseFloat(tagihan.denda || 0);
            const sisaPinjaman = parseFloat(tagihan.sisa_pinjaman || 0);

            // Badge Urgensi Jatuh Tempo
            let urgencyClass = 'bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800';
            let urgencyIcon = 'bi-calendar-event';
            let urgencyText = `${hariLagi} Hari Lagi`;
            if (isOverdue) {
                const terlambat = Math.abs(hariLagi);
                urgencyClass = 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800 animate-pulse';
                urgencyIcon = 'bi-exclamation-triangle-fill';
                urgencyText = `Terlambat ${terlambat} Hari`;
            } else if (isToday) {
                urgencyClass = 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800 animate-pulse';
                urgencyIcon = 'bi-alarm-fill';
                urgencyText = 'Jatuh Tempo Hari Ini';
            } else if (hariLagi <= 3) {
                urgencyClass = 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
                urgencyIcon = 'bi-hourglass-split';
                urgencyText = `${hariLagi} Hari Lagi`;
            }

            // Status Kolektibilitas Standar Perbankan / Kemenkop UKM
            const kolStatus = isOverdue
                ? { label: 'KOL 2 • Perhatian Khusus', badge: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40', dot: 'bg-rose-500' }
                : { label: 'KOL 1 • Lancar', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40', dot: 'bg-emerald-500' };

            // Bagian Aksi / Pembayaran (Pending Pengajuan vs Saldo Cukup vs Saldo Kurang vs Kasir)
            let actionHtml = '';
            if (pending_pengajuan) {
                actionHtml = `
                <div class="mt-4 p-3.5 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <span class="relative flex h-3 w-3 shrink-0">
                            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span class="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                        </span>
                        <div class="min-w-0">
                            <p class="text-xs font-bold text-amber-900 dark:text-amber-200">Verifikasi Pembayaran Berjalan</p>
                            <p class="text-[10px] text-amber-700 dark:text-amber-400 truncate">Pengajuan #${pending_pengajuan.no_pengajuan || ''} sedang ditinjau Bendahara</p>
                        </div>
                    </div>
                    <button onclick="Portal.tab('pinjaman')" class="px-3 py-1.5 rounded-xl bg-amber-200/80 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100 text-[11px] font-bold hover:bg-amber-300 transition shrink-0">
                        Cek Status
                    </button>
                </div>`;
            } else if (sukarela && isSaldoCukup) {
                const sisaSaldo = saldoSukarela - totalNominal;
                actionHtml = `
                <div class="mt-4 space-y-2.5">
                    <!-- Kartu Autodebet Saldo Cukup -->
                    <div class="p-3 rounded-2xl bg-gradient-to-r from-emerald-50/90 to-teal-50/70 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-sm">
                                <i class="bi bi-wallet-check"></i>
                            </div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                    <span class="text-[10px] text-gray-500 dark:text-obsidian-400">Saldo Sukarela:</span>
                                    <strong class="text-xs text-gray-800 dark:text-obsidian-100">${this.rp(saldoSukarela)}</strong>
                                </div>
                                <p class="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
                                    <i class="bi bi-check-circle-fill"></i> Tersisa ${this.rp(sisaSaldo)} setelah autodebet
                                </p>
                            </div>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                            Saldo Cukup
                        </span>
                    </div>

                    <!-- Tombol Eksekusi Bayar 1-Click -->
                    <button onclick="Portal.bayarAngsuranSukarela('${tagihan.pinjaman_id}', '${tagihan.angsuran_id}', ${angsuranKe}, ${totalNominal}, ${saldoSukarela})"
                        class="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-md shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                        <i class="bi bi-lightning-charge-fill text-amber-300 text-sm"></i>
                        <span>Bayar Angsuran via Simpanan Sukarela</span>
                    </button>

                    <div class="flex items-center justify-between px-1 text-[11px]">
                        <span class="text-gray-400 dark:text-obsidian-500 text-[10px] flex items-center gap-1">
                            <i class="bi bi-shield-check text-emerald-500"></i> Autodebet instan & otomatis tercatat
                        </span>
                        <button onclick="Portal.tab('pinjaman')" class="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold text-[11px] flex items-center gap-1">
                            <span>Jadwal Lengkap</span> <i class="bi bi-chevron-right text-[9px]"></i>
                        </button>
                    </div>
                </div>`;
            } else if (sukarela) {
                const defisit = totalNominal - saldoSukarela;
                actionHtml = `
                <div class="mt-4 space-y-2.5">
                    <!-- Kartu Defisit Saldo -->
                    <div class="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-obsidian-800/80 border border-amber-200/70 dark:border-obsidian-700 flex items-center justify-between text-xs gap-2">
                        <div class="flex items-center gap-2.5 min-w-0">
                            <div class="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <i class="bi bi-exclamation-triangle text-sm"></i>
                            </div>
                            <div class="min-w-0">
                                <p class="text-[10px] text-gray-500 dark:text-obsidian-400">Saldo Sukarela: <strong class="text-gray-800 dark:text-obsidian-200">${this.rp(saldoSukarela)}</strong></p>
                                <p class="text-[11px] font-bold text-rose-600 dark:text-rose-400 truncate">Kurang ${this.rp(defisit)} untuk autodebet</p>
                            </div>
                        </div>
                        <button onclick="Portal.tab('simpanan')" class="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1 shrink-0 active:scale-95">
                            <i class="bi bi-wallet2 text-xs"></i> Top Up
                        </button>
                    </div>

                    <!-- Tombol Opsi Alternatif -->
                    <div class="grid grid-cols-2 gap-2">
                        <button onclick="Portal.tab('simpanan')" class="py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-obsidian-800 hover:bg-gray-200 dark:hover:bg-obsidian-700 text-gray-700 dark:text-obsidian-200 font-bold text-xs transition flex items-center justify-center gap-1.5">
                            <i class="bi bi-qr-code text-xs"></i> <span>Transfer / Setor</span>
                        </button>
                        <button onclick="Portal.tab('pinjaman')" class="py-2.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs transition flex items-center justify-center gap-1.5">
                            <span>Rincian Pinjaman</span> <i class="bi bi-arrow-right text-xs"></i>
                        </button>
                    </div>
                </div>`;
            } else {
                actionHtml = `
                <div class="mt-4 pt-3 border-t border-gray-100 dark:border-obsidian-800 flex items-center justify-between">
                    <span class="text-[11px] text-gray-500 dark:text-obsidian-400">Bayar di Kasir/Teller Koperasi</span>
                    <button onclick="Portal.tab('pinjaman')" class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition flex items-center gap-1 active:scale-95">
                        <span>Lihat Rincian Jadwal</span> <i class="bi bi-arrow-right text-[10px]"></i>
                    </button>
                </div>`;
            }

            container.innerHTML = `
            <div class="bg-white dark:bg-obsidian-900 rounded-3xl p-5 sm:p-6 shadow-sm border border-gray-100 dark:border-obsidian-800 relative overflow-hidden transition-colors duration-300">
                <!-- Background decorative radial glow -->
                <div class="absolute -top-16 -right-16 w-44 h-44 bg-gradient-to-br from-indigo-500/10 via-primary-500/5 to-transparent rounded-full blur-2xl pointer-events-none"></div>

                <!-- 1. Header Card: Nama Pinjaman, No Kontrak & Dua Status Badges -->
                <div class="flex items-start justify-between gap-3 mb-3 relative z-10">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-11 h-11 rounded-2xl ${isOverdue ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80 dark:border-rose-900/60' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-900/60'} flex items-center justify-center text-lg shrink-0 shadow-xs">
                            <i class="bi ${isOverdue ? 'bi-exclamation-octagon-fill' : 'bi-receipt-cutoff'}"></i>
                        </div>
                        <div class="min-w-0">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <h3 class="font-black text-gray-900 dark:text-obsidian-50 text-sm tracking-tight">Tagihan Angsuran</h3>
                                <span class="text-[9px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60 font-mono">
                                    ${tagihan.no_pinjaman}
                                </span>
                            </div>
                            <p class="text-[11px] text-gray-500 dark:text-obsidian-400 mt-0.5 font-medium truncate">
                                ${tagihan.jenis_pinjaman}
                            </p>
                        </div>
                    </div>

                    <!-- Badges (Kolektibilitas & Urgensi) -->
                    <div class="flex flex-col items-end gap-1.5 shrink-0">
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${urgencyClass}">
                            <i class="bi ${urgencyIcon}"></i> ${urgencyText}
                        </span>
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold border ${kolStatus.badge}">
                            <span class="w-1.5 h-1.5 rounded-full ${kolStatus.dot}"></span>
                            ${kolStatus.label}
                        </span>
                    </div>
                </div>

                <!-- 2. Tenor Progress Tracker Bar -->
                <div class="mb-3.5 p-2.5 rounded-2xl bg-gray-50/80 dark:bg-obsidian-800/50 border border-gray-100 dark:border-obsidian-800/80 relative z-10">
                    <div class="flex items-center justify-between text-[11px] mb-1.5">
                        <div class="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-obsidian-200">
                            <i class="bi bi-pie-chart-fill text-indigo-500"></i>
                            <span>Angsuran ke-<b>${angsuranKe}</b> dari <b>${tenorTotal}</b> bln</span>
                        </div>
                        <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900/50">
                            ${persenTenor}% Berjalan (${sisaBulan} sisa)
                        </span>
                    </div>
                    <div class="w-full h-2 bg-gray-200/70 dark:bg-obsidian-700 rounded-full overflow-hidden p-0.5">
                        <div class="h-full rounded-full bg-gradient-to-r from-indigo-500 via-primary-500 to-emerald-500 transition-all duration-700" style="width: ${persenTenor}%"></div>
                    </div>
                </div>

                <!-- 3. Financial Hero Card: Total Nominal, Jatuh Tempo & Sisa Pinjaman -->
                <div class="p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-gray-50/80 to-indigo-50/20 dark:from-obsidian-800/70 dark:via-obsidian-800/50 dark:to-indigo-950/20 border border-slate-100 dark:border-obsidian-700/70 relative z-10">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200/60 dark:border-obsidian-700/60">
                        <div>
                            <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-obsidian-400">Total Tagihan Bulan Ini</span>
                            <div class="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight mt-0.5">
                                ${this.rp(totalNominal)}
                            </div>
                            <div class="text-[11px] text-gray-500 dark:text-obsidian-400 mt-1 flex items-center gap-1.5">
                                <i class="bi bi-calendar-check text-indigo-500"></i>
                                <span>Jatuh Tempo: <b class="text-gray-700 dark:text-obsidian-200">${this.fdate(tagihan.tgl_jatuh_tempo)}</b></span>
                            </div>
                        </div>

                        ${sisaPinjaman > 0 ? `
                        <div class="sm:text-right pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/40 dark:border-obsidian-700">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-obsidian-400">Sisa Pokok Pinjaman</span>
                            <div class="text-base font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                                ${this.rp(sisaPinjaman)}
                            </div>
                            <span class="text-[10px] text-gray-400 dark:text-obsidian-500">Total utang tersisa</span>
                        </div>
                        ` : ''}
                    </div>

                    <!-- 4. Rincian Biaya (Pokok, Jasa/Bunga, Denda) -->
                    <div class="grid grid-cols-3 gap-2 pt-3 text-center">
                        <div class="p-2 rounded-xl bg-white/80 dark:bg-obsidian-900/60 border border-gray-100 dark:border-obsidian-700/50">
                            <span class="block text-[9px] uppercase tracking-wider text-gray-400 dark:text-obsidian-400 font-bold">Pokok</span>
                            <span class="text-xs font-bold text-gray-800 dark:text-obsidian-100 mt-0.5 block">${this.rp(pokok)}</span>
                        </div>
                        <div class="p-2 rounded-xl bg-white/80 dark:bg-obsidian-900/60 border border-gray-100 dark:border-obsidian-700/50">
                            <span class="block text-[9px] uppercase tracking-wider text-gray-400 dark:text-obsidian-400 font-bold">Jasa / Bunga</span>
                            <span class="text-xs font-bold text-gray-800 dark:text-obsidian-100 mt-0.5 block">${this.rp(bunga)}</span>
                        </div>
                        <div class="p-2 rounded-xl ${denda > 0 ? 'bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200/70 dark:border-rose-900/50' : 'bg-white/80 dark:bg-obsidian-900/60 border border-gray-100 dark:border-obsidian-700/50'}">
                            <span class="block text-[9px] uppercase tracking-wider ${denda > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-400 dark:text-obsidian-400'} font-bold">Denda</span>
                            <span class="text-xs font-bold ${denda > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-gray-800 dark:text-obsidian-100'} mt-0.5 block">${this.rp(denda)}</span>
                        </div>
                    </div>
                </div>

                <!-- 5. Actionable Simpanan Sukarela & Autodebet Section -->
                <div class="relative z-10">
                    ${actionHtml}
                </div>
            </div>`;
            return;
        }

        // KASUS 2: Punya pinjaman dan SEMUA SUDAH LUNAS
        if (has_loan && !tagihan) {
            container.innerHTML = `
            <div class="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent dark:from-emerald-950/30 dark:via-teal-950/10 dark:to-transparent rounded-3xl p-5 border border-emerald-200/80 dark:border-emerald-800/50 shadow-xs relative overflow-hidden transition-all duration-300">
                <div class="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>
                <div class="flex items-start gap-3.5 relative z-10">
                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-md shadow-emerald-500/20">
                        <i class="bi bi-shield-check"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap mb-1">
                            <h3 class="font-bold text-gray-900 dark:text-white text-sm">Semua Angsuran Lunas!</h3>
                            <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                                <i class="bi bi-award-fill text-amber-500 mr-0.5"></i> Rekam Jejak KOL 1
                            </span>
                        </div>
                        <p class="text-xs text-gray-600 dark:text-obsidian-300 leading-relaxed">
                            Luar biasa! Seluruh kewajiban pinjaman Anda telah lunas tepat waktu. Kedisiplinan Anda membuka fasilitas kredit dengan limit lebih tinggi.
                        </p>
                    </div>
                </div>

                <div class="mt-4 pt-3 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-between relative z-10">
                    <button onclick="Portal.tab('pinjaman')" class="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1">
                        <i class="bi bi-clock-history"></i> Riwayat Pinjaman
                    </button>
                    <button onclick="Portal.tab('pengajuan_pinjaman')" class="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1 active:scale-95">
                        <span>Ajukan Pinjaman Baru</span> <i class="bi bi-arrow-right text-[10px]"></i>
                    </button>
                </div>
            </div>`;
            return;
        }

        // KASUS 3: Tidak punya pinjaman sama sekali
        container.innerHTML = `
        <div class="bg-gradient-to-br from-indigo-500/10 via-primary-500/5 to-transparent dark:from-indigo-950/30 dark:via-primary-950/10 dark:to-transparent rounded-3xl p-5 border border-indigo-200/70 dark:border-indigo-800/50 shadow-xs relative overflow-hidden transition-all duration-300">
            <div class="absolute -top-12 -right-12 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div class="flex items-start gap-3.5 relative z-10">
                <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-primary-600 text-white flex items-center justify-center text-2xl shrink-0 shadow-md shadow-indigo-600/20">
                    <i class="bi bi-shield-heart-fill"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap mb-1">
                        <h3 class="font-bold text-gray-900 dark:text-white text-sm">Bebas Kewajiban Pinjaman</h3>
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                            Fasilitas Tersedia
                        </span>
                    </div>
                    <p class="text-xs text-gray-600 dark:text-obsidian-300 leading-relaxed">
                        Saat ini Anda tidak memiliki tanggungan pinjaman aktif. Dapatkan akses permodalan usaha atau dana darurat dengan bunga kompetitif dan proses transparan.
                    </p>
                </div>
            </div>

            <div class="mt-4 pt-3 border-t border-indigo-200/60 dark:border-indigo-800/60 flex items-center justify-between relative z-10">
                <span class="text-[10px] text-gray-400 dark:text-obsidian-400 font-medium">Bunga ringan & syarat mudah</span>
                <button onclick="Portal.tab('pengajuan_pinjaman')" class="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition shadow-xs flex items-center gap-1 active:scale-95">
                    <span>Simulasi Pinjaman</span> <i class="bi bi-arrow-right text-[10px]"></i>
                </button>
            </div>
        </div>`;
    },

    renderRatWidget(data) {
        const el = document.getElementById('h-rat-widget');
        if (!el) return;

        if (!data || !data.session) {
            el.classList.add('hidden');
            el.innerHTML = '';
            return;
        }

        const s = data.session;
        const att = data.attendance || {};
        const vote = data.voting || {};
        const isAktif = s.status === 'aktif';
        const qPct = att.quorum_percent || 0;
        const isQuorum = att.quorum_reached;
        const isPresent = att.is_present;

        // Badge Status
        const badgeStatusClass = isAktif ? 'bg-emerald-400 text-gray-900 animate-pulse' : 'bg-amber-400 text-gray-900';
        const badgeStatusText = isAktif ? '🟢 RAT BERLANGSUNG' : '🟡 PERSIAPAN RAT';

        // Chip Presensi
        const chipPresensi = isPresent
            ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 flex items-center gap-1"><i class="bi bi-check-circle-fill"></i> Presensi Tercatat</span>'
            : '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/30 flex items-center gap-1"><i class="bi bi-exclamation-circle-fill"></i> Belum Presensi</span>';

        // Chip E-Voting
        let chipVoting = '';
        if (vote.open_topics > 0) {
            if (vote.has_pending_vote) {
                const sisaVote = vote.open_topics - vote.voted_topics;
                chipVoting = `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-200 border border-rose-400/30 flex items-center gap-1"><i class="bi bi-box-seam-fill"></i> ${sisaVote} Topik Belum Memilih</span>`;
            } else {
                chipVoting = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/20 text-blue-200 border border-blue-400/30 flex items-center gap-1"><i class="bi bi-check2-all"></i> Hak Suara Lengkap</span>';
            }
        } else {
            chipVoting = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/10 text-indigo-200 border border-white/20 flex items-center gap-1"><i class="bi bi-info-circle"></i> Sesi Musyawarah</span>';
        }

        el.classList.remove('hidden');
        el.innerHTML = `
        <div class="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-blue-950 p-5 text-white shadow-xl shadow-indigo-900/20 border border-indigo-500/30 transition-all duration-300">
            <!-- Background Ornaments -->
            <div class="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
            <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-400/10 rounded-full blur-xl pointer-events-none"></div>

            <div class="relative z-10 space-y-3.5">
                <!-- Header Card -->
                <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${badgeStatusClass}">
                                ${badgeStatusText}
                            </span>
                            <span class="text-[10px] text-indigo-200 font-medium truncate">${this.fdate(s.tanggal)}</span>
                        </div>
                        <h3 class="text-sm font-black text-white leading-tight line-clamp-1">${s.judul}</h3>
                        <p class="text-[10px] text-indigo-200/80 flex items-center gap-1 mt-0.5 truncate">
                            <i class="bi bi-geo-alt text-[9px]"></i> ${s.lokasi || 'Kantor Koperasi'}
                        </p>
                    </div>
                    <div class="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white shrink-0 border border-white/15">
                        <i class="bi bi-people-fill text-lg text-cyan-300"></i>
                    </div>
                </div>

                <!-- Quorum Progress Meter -->
                <div class="bg-black/25 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                    <div class="flex justify-between items-baseline mb-1.5">
                        <span class="text-[10px] font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1">
                            <i class="bi bi-bar-chart-fill text-cyan-300"></i> Kuorum Kehadiran
                        </span>
                        <span class="text-[11px] font-black ${isQuorum ? 'text-emerald-300' : 'text-amber-300'}">
                            ${qPct}% <span class="text-[9px] font-normal text-indigo-200">(${att.total_hadir || 0}/${att.total_anggota || 0} Anggota)</span>
                        </span>
                    </div>
                    <div class="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div class="h-full rounded-full ${isQuorum ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : 'bg-gradient-to-r from-amber-400 to-cyan-400'} transition-all duration-1000"
                             style="width: ${Math.min(qPct, 100)}%"></div>
                    </div>
                    <div class="flex justify-between items-center mt-1 text-[8px] text-indigo-200/70">
                        <span>Target Minimum: 50%</span>
                        <span class="${isQuorum ? 'text-emerald-300 font-bold' : 'text-amber-300 font-bold'}">
                            ${isQuorum ? '✓ Kuorum Sah Terpenuhi' : 'Menuju Kuorum 50%'}
                        </span>
                    </div>
                </div>

                <!-- Status Anggota & Tombol Aksi -->
                <div class="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                    <div class="flex flex-wrap items-center gap-1.5">
                        ${chipPresensi}
                        ${chipVoting}
                    </div>
                    <button onclick="Portal.tab('rat')" 
                        class="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold text-[11px] shadow-md shadow-indigo-900/30 active:scale-95 transition-all flex items-center gap-1.5 shrink-0">
                        <span>Buka RAT</span>
                        <i class="bi bi-arrow-right text-[10px]"></i>
                    </button>
                </div>
            </div>
        </div>`;
    },

    renderRecentActivities(list) {
        const container = document.getElementById('h-recent-list');
        if (!container) return;

        this.recentActivities = list || [];

        if (!list || list.length === 0) {
            container.innerHTML = `
                <div class="p-6 text-center rounded-2xl bg-gray-50/70 dark:bg-obsidian-800/40 border border-dashed border-gray-200 dark:border-obsidian-700">
                    <div class="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 dark:text-indigo-400 flex items-center justify-center mx-auto mb-2 text-base">
                        <i class="bi bi-journal-check"></i>
                    </div>
                    <p class="text-xs font-bold text-gray-800 dark:text-obsidian-100">Buku Aktivitas Masih Bersih</p>
                    <p class="text-[10px] text-gray-500 dark:text-obsidian-400 mt-1 max-w-[280px] mx-auto leading-relaxed">Setiap mutasi simpanan, angsuran pinjaman, dan transaksi kasir akan tertera resmi di sini.</p>
                    <button onclick="Portal.openReceiptQuickModal()" class="mt-3 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs inline-flex items-center gap-1.5 active:scale-95 transition-all shadow-sm">
                        <i class="bi bi-receipt"></i> Buka Contoh Struk Digital
                    </button>
                </div>`;
            return;
        }

        container.innerHTML = list.map((t, idx) => {
            const isMasuk = t.dk === 'D';
            const nominal = parseFloat(t.nominal || 0);

            let iconName = 'bi-wallet2';
            let boxClass = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-800/40';
            let iconColor = 'text-emerald-600 dark:text-emerald-400';
            let nominalClass = 'text-emerald-600 dark:text-emerald-400';
            let nominalPrefix = '+';

            if (t.kategori === 'simpanan') {
                if (isMasuk) {
                    iconName = 'bi-arrow-down-left';
                    boxClass = 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-800/40';
                    iconColor = 'text-emerald-600 dark:text-emerald-400';
                    nominalClass = 'text-emerald-600 dark:text-emerald-400';
                    nominalPrefix = '+';
                } else {
                    iconName = 'bi-arrow-up-right';
                    boxClass = 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-800/40';
                    iconColor = 'text-rose-600 dark:text-rose-400';
                    nominalClass = 'text-gray-900 dark:text-obsidian-100';
                    nominalPrefix = '-';
                }
            } else if (t.kategori === 'pinjaman') {
                iconName = 'bi-credit-card-2-front';
                boxClass = 'bg-orange-50 dark:bg-orange-950/40 border-orange-100 dark:border-orange-800/40';
                iconColor = 'text-orange-600 dark:text-orange-400';
                nominalClass = 'text-gray-900 dark:text-obsidian-100';
                nominalPrefix = '-';
            } else if (t.kategori === 'toko') {
                iconName = 'bi-bag-check';
                boxClass = 'bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-800/40';
                iconColor = 'text-blue-600 dark:text-blue-400';
                nominalClass = 'text-gray-900 dark:text-obsidian-100';
                nominalPrefix = '-';
            }

            const badgeStatus = t.status === 'sukses' || t.status === 'lunas' || t.status === 'selesai'
                ? '<span class="text-[8px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">Sukses</span>'
                : `<span class="text-[8px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 capitalize">${t.status}</span>`;

            return `
            <div onclick="Portal.openReceiptModal(${idx})" 
                 title="Ketuk untuk melihat bukti transaksi digital resmi"
                 class="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 dark:bg-obsidian-800/40 border border-gray-100 dark:border-obsidian-800 hover:bg-white dark:hover:bg-obsidian-800 hover:border-indigo-100 dark:hover:border-indigo-900 transition-all cursor-pointer active:scale-[0.99] group">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${boxClass}">
                        <i class="bi ${iconName} ${iconColor} text-base"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5">
                            <p class="text-xs font-bold text-gray-800 dark:text-obsidian-100 truncate">${t.judul}</p>
                            <i class="bi bi-receipt text-[10px] text-indigo-500"></i>
                        </div>
                        <p class="text-[10px] text-gray-400 dark:text-obsidian-400 truncate mt-0.5">
                            ${t.deskripsi} &bull; <span class="font-mono">${this.fdate(t.tanggal)}</span>
                        </p>
                    </div>
                </div>
                <div class="text-right shrink-0 ml-3">
                    <p class="text-xs font-black ${nominalClass}">
                        ${nominalPrefix}${this.rp(nominal)}
                    </p>
                    <div class="mt-1 flex items-center justify-end gap-1">
                        <span class="text-[8px] px-1.5 py-0.5 rounded-md font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/50 flex items-center gap-0.5">
                            <i class="bi bi-receipt"></i> Struk
                        </span>
                        ${badgeStatus}
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    async tab(name, isManual = false) {
        // Return early if the clicked tab is already active to prevent redundant API calls
        const targetNav = document.getElementById('tab-' + name);
        if (targetNav && targetNav.classList.contains('active')) return;

        // Add Haptic Feedback (Vibration) - Only on manual tap
        if (isManual) this.haptic('light');

        // Determine direction for animation
        const oldIndex = this.tabOrder.indexOf(this.currentTab);
        const newIndex = this.tabOrder.indexOf(name);
        const directionClass = newIndex > oldIndex ? 'slide-in-right' : 'slide-in-left';
        this.currentTab = name;

        // Toggle active class on nav items
        document.querySelectorAll('.nav-item').forEach(t => {
            t.classList.remove('active', 'text-blue-600');
            t.classList.add('text-gray-400');

            const icon = t.querySelector('i');
            if (icon) {
                // Reset to base icons (outlined)
                const baseClass = [...icon.classList].find(c => c.startsWith('bi-'));
                if (baseClass && baseClass.endsWith('-fill')) {
                    const outlined = baseClass.replace('-fill', '');
                    icon.classList.remove(baseClass);
                    icon.classList.add(outlined);
                }
            }
        });

        const activeNav = document.getElementById('tab-' + name);
        if (activeNav) {
            activeNav.classList.add('active', 'text-blue-600');
            activeNav.classList.remove('text-gray-400');

            const icon = activeNav.querySelector('i');
            if (icon) {
                const baseClass = [...icon.classList].find(c => c.startsWith('bi-'));
                if (baseClass && !baseClass.endsWith('-fill')) {
                    icon.classList.remove(baseClass);
                    icon.classList.add(baseClass + '-fill');
                }
            }
        }

        // Global header visibility - Notification bell only visible on Home
        const bell = document.getElementById('notif-bell');
        if (bell) {
            bell.style.display = (name === 'home' ? 'flex' : 'none');
        }

        // Toggle active content and lazy load
        document.querySelectorAll('.tab-content').forEach(c => {
            c.classList.add('hidden');
            c.classList.remove('slide-in-right', 'slide-in-left');
        });

        const activeContent = document.getElementById('tab-content-' + name);
        if (activeContent) {
            activeContent.classList.remove('hidden');
            activeContent.classList.add(directionClass);
            
            // Clean up animation class after it finishes to restore 'fixed' positioning behavior
            activeContent.onanimationend = () => {
                activeContent.classList.remove(directionClass);
                activeContent.onanimationend = null;
            };

            if (activeContent.innerHTML.trim() === '') {
                if (this.viewCache[name]) {
                    activeContent.innerHTML = this.viewCache[name];
                    this.updatePrivacyIcons();
                } else {
                    activeContent.innerHTML = '<div class="flex justify-center py-20"><i class="ri-loader-4-line text-4xl animate-spin text-blue-500"></i></div>';
                    try {
                        const html = await fetch(`${this.PORTAL_BASE}views/${name}.html?v=${this.VERSION}`).then(res => {
                            if (!res.ok) throw new Error('Failed to load view');
                            return res.text();
                        });
                        this.viewCache[name] = html;
                        activeContent.innerHTML = html;
                        this.updatePrivacyIcons();
                    } catch (e) {
                        activeContent.innerHTML = '<div class="text-center py-20 text-gray-500 text-xs">Gagal memuat tampilan</div>';
                    }
                }
            }
        }

        // Load appropriate data with SWR (Stale-While-Revalidate)
        if (name === 'home') {
            if (!this.dataCache['dashboard'] && !this.getSwrCache('portal/dashboard-summary')) {
                this.showSkeletonDashboard();
            }
            await this.loadDashboardData();
        }
        else if (name === 'simpanan') {
            const container = document.getElementById('p-content-simpanan');
            if (!this.dataCache['simpanan'] && !this.getSwrCache('portal/saldo')) {
                this.showSkeletonSimpanan();
            }
            await this.loadSimpanan(container);
            this.dataCache['simpanan'] = true;
        }
        else if (name === 'pinjaman') {
            const container = document.getElementById('p-content-pinjaman');
            if (!this.dataCache['pinjaman'] && !this.getSwrCache('portal/pinjaman')) {
                this.showSkeletonPinjaman();
            }
            await this.loadPinjaman(container);
            this.dataCache['pinjaman'] = true;
        }
        else if (name === 'pengajuan_pinjaman') this.loadPengajuanPinjaman();
        else if (name === 'rat') await this.loadRAT();
        else if (name === 'laporan') await this.loadLaporan();
        else if (name === 'profil') this.loadProfil();
        else if (name === 'toko') await this.loadToko();
    },

    loadProfil() {
        if (!this.member) return;

        const elAvatar = document.getElementById('p-avatar-profil');
        if (elAvatar) elAvatar.src = this.getAvatarUrl(this.member.nama);

        const elNama = document.getElementById('p-nama-profil');
        const elNo = document.getElementById('p-no-profil');
        const elTgl = document.getElementById('p-tgl-gabung');

        if (elNama) elNama.textContent = this.member.nama;
        if (elNo) elNo.textContent = this.member.no_anggota;

        const elPwa = document.getElementById('p-card-app-name');
        if (elPwa) elPwa.textContent = this.pwaName || 'Portal Anggota Koperasi';

        // Format tanggal bergabung menjadi tahun jika ada, default 2024
        const dtGabung = this.parseDate(this.member.created_at || this.member.tgl_gabung);
        const tglGabung = dtGabung ? dtGabung.getFullYear() : '2024';
        if (elTgl) elTgl.textContent = `${tglGabung}`;

        // Populate Institutional Legal Card
        const legalNama = document.getElementById('p-legal-nama');
        const legalSk = document.getElementById('p-legal-sk');
        const legalKetua = document.getElementById('p-legal-ketua');
        const legalAlamat = document.getElementById('p-legal-alamat');
        const legalWaBtn = document.getElementById('p-legal-wa-btn');

        if (legalNama) legalNama.textContent = this.pwaName || this.appSettings?.app_name || 'KOSMIK Sandya Raharja';
        if (legalSk) legalSk.textContent = this.appSettings?.no_badan_hukum || 'AHU-0004128.AH.01.26.TAHUN 2020';
        if (legalKetua) legalKetua.textContent = this.appSettings?.ketua_koperasi || 'Sangga';
        if (legalAlamat) legalAlamat.textContent = this.appSettings?.alamat || 'Jl. Ikan Piranha Atas';
        if (legalWaBtn) {
            const wa = this.appSettings?.wa_admin || this.appSettings?.telepon || '628123456789';
            const cleanWa = wa.replace(/[^0-9]/g, '').replace(/^0/, '62');
            legalWaBtn.href = `https://wa.me/${cleanWa}?text=Halo%20Pengurus%20Koperasi,%20saya%20${encodeURIComponent(this.member.nama)}%20ingin%20berkonsultasi.`;
        }

        // Sync Theme Toggle Checkbox State
        const themeToggle = document.getElementById('theme-toggle-check');
        if (themeToggle) {
            themeToggle.checked = document.documentElement.classList.contains('dark');
        }

        // Sync Push Notification UI State
        this.initPushNotificationUI();
    },

    showSecurity() {
        Swal.fire({
            title: 'Keamanan Akun',
            html: `
                <div class="text-left py-4">
                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4 px-1">Ganti Password</p>
                    <div class="space-y-4">
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Password Lama</label>
                            <div class="relative">
                                <i class="bi bi-key-fill absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                <input type="password" id="sw-old-pwd" inputmode="numeric" pattern="[0-9]*" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="swal2-input !mt-0 !w-full !m-0 !rounded-xl !border-gray-100 !bg-gray-50 !pl-10 !text-sm focus:!ring-blue-500" placeholder="Masukkan password saat ini">
                            </div>
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Password Baru</label>
                            <div class="relative">
                                <i class="bi bi-lock-fill absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                <input type="password" id="sw-new-pwd" inputmode="numeric" pattern="[0-9]*" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="swal2-input !mt-0 !w-full !m-0 !rounded-xl !border-gray-100 !bg-gray-50 !pl-10 !text-sm focus:!ring-blue-500" placeholder="Minimal 6 karakter">
                            </div>
                        </div>
                        <div class="space-y-1.5">
                            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ulangi Password Baru</label>
                            <div class="relative">
                                <i class="bi bi-check-circle-fill absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                <input type="password" id="sw-confirm-pwd" inputmode="numeric" pattern="[0-9]*" oninput="this.value = this.value.replace(/[^0-9]/g, '')" class="swal2-input !mt-0 !w-full !m-0 !rounded-xl !border-gray-100 !bg-gray-50 !pl-10 !text-sm focus:!ring-blue-500" placeholder="Ketik ulang password baru">
                            </div>
                        </div>
                    </div>
                </div>`,
            showCancelButton: true,
            confirmButtonText: 'Simpan Perubahan',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#2563eb',
            showLoaderOnConfirm: true,
            customClass: {
                popup: 'rounded-[2.5rem] p-8',
                confirmButton: 'rounded-2xl w-full py-4 font-bold text-sm shadow-lg shadow-blue-500/20 order-2',
                cancelButton: 'rounded-2xl w-full py-4 font-bold text-sm text-gray-500 bg-gray-100 order-1'
            },
            preConfirm: async () => {
                const oldPwd = document.getElementById('sw-old-pwd').value;
                const newPwd = document.getElementById('sw-new-pwd').value;
                const confirmPwd = document.getElementById('sw-confirm-pwd').value;

                if (!oldPwd || !newPwd || !confirmPwd) {
                    Swal.showValidationMessage('Mohon isi semua field');
                    return false;
                }

                if (newPwd !== confirmPwd) {
                    Swal.showValidationMessage('Konfirmasi password tidak cocok');
                    return false;
                }

                if (newPwd.length < 6) {
                    Swal.showValidationMessage('Password minimal 6 karakter');
                    return false;
                }

                try {
                    const r = await this.api('portal/change-password', {
                        method: 'POST',
                        body: { old_password: oldPwd, new_password: newPwd }
                    });

                    if (!r.success) {
                        throw new Error(r.message || 'Gagal mengubah password');
                    }
                    return r;
                } catch (error) {
                    Swal.showValidationMessage(`Error: ${error.message}`);
                }
            },
            allowOutsideClick: () => !Swal.isLoading()
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    icon: 'success',
                    title: 'Berhasil!',
                    text: 'Password Anda telah berhasil diubah.',
                    customClass: { popup: 'rounded-[2rem]' }
                });
            }
        });
    },

    async showAbout() {
        const name = this.pwaName || 'Portal Anggota Koperasi';
        const version = this.VERSION || '1.0.0';

        // Pre-check version mismatch
        let versionStatus = '<div class="animate-pulse text-[9px] text-gray-400 mt-2">Mengecek sinkronisasi...</div>';
        
        const showModal = (status) => {
            Swal.fire({
                title: 'Tentang Aplikasi',
                html: `
                    <div class='flex flex-col items-center py-4'>
                        <div class='w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-blue-500/20'>
                            <i class='bi bi-wallet2 text-4xl text-white'></i>
                        </div>
                        <p class='font-black text-gray-900 text-lg'>${name}</p>
                        <p class='text-xs text-gray-400 font-bold mb-1 tracking-widest uppercase'>Versi ${version}</p>
                        <div id="v-status">${status}</div>
                        <div class='w-full border-t border-gray-100 dark:border-obsidian-800 pt-6 mt-6 text-center'>
                            <p class='text-[10px] text-gray-400 dark:text-obsidian-500 font-medium leading-relaxed'>
                                &copy; ${new Date().getFullYear()} <a href="https://crudworks.com/produk" target="_blank" class="text-blue-600 dark:text-blue-400 font-bold hover:underline">CRUDWorks</a><br>
                                Seluruh hak cipta dilindungi.<br>
                                <span class="mt-1 block text-gray-300 dark:text-obsidian-700">Stable Release</span>
                            </p>
                        </div>
                    </div>`,
                showConfirmButton: false,
                showCloseButton: true,
                customClass: { popup: 'rounded-[2.5rem]' }
            });
        };

        showModal(versionStatus);

        try {
            const res = await fetch(`${this.PORTAL_BASE}version.json?t=${Date.now()}`);
            const data = await res.json();
            const elStatus = document.getElementById('v-status');
            
            if (data.version === version) {
                versionStatus = '<div class="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full mt-2 border border-emerald-100"><i class="bi bi-check-circle-fill mr-1"></i> Aplikasi Terupdate</div>';
            } else {
                versionStatus = `
                    <div class="flex flex-col items-center mt-2">
                        <div class="text-[10px] font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100"><i class="bi bi-exclamation-triangle-fill mr-1"></i> Versi Baru Tersedia: ${data.version}</div>
                        <button onclick="Portal.forceUpdate()" class="mt-3 text-[10px] font-black text-blue-600 underline uppercase tracking-widest">Update Sekarang</button>
                    </div>`;
            }
            if (elStatus) elStatus.innerHTML = versionStatus;
        } catch (e) {
            const elStatus = document.getElementById('v-status');
            if (elStatus) elStatus.innerHTML = '<div class="text-[10px] font-bold text-gray-400 mt-2 italic">Gagal terhubung ke server</div>';
        }
    },

    async forceUpdate() {
        console.log('forceUpdate triggered, clearing cache and reloading...');
        Swal.fire({
            title: 'Memperbarui...',
            text: 'Sedang menyelaraskan versi aplikasi',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        // 1. Unregister Service Workers
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    console.log('Unregistering SW:', registration.scope);
                    await registration.unregister();
                }
            } catch (e) { console.error('SW Unregister failed:', e); }
        }

        // 2. Clear Caches
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                console.log('Clearing caches:', cacheNames);
                for (let name of cacheNames) {
                    await caches.delete(name);
                }
            } catch (e) { console.error('Cache Clear failed:', e); }
        }

        // 3. Hard reload with cache bypass
        setTimeout(() => {
            window.location.href = window.location.href;
        }, 500);
    },

    async showChangelog() {
        try {
            const res = await fetch(`${this.PORTAL_BASE}changelog.md?v=${this.VERSION}`);
            const text = await res.text();

            // Modern Timeline Parser
            const regex = /##\s*\[([\d.]+)\]\s*-\s*([\d-]+)\s*\r?\n###\s*(.*)\r?\n([\s\S]*?)(?=\r?\n\s*---|\r?\n\s*##\s*\[|$)/g;
            let updates = [];
            let match;
            while ((match = regex.exec(text)) !== null) {
                updates.push({
                    version: match[1],
                    date: match[2],
                    title: match[3],
                    description: match[4].trim()
                });
            }

            if (updates.length === 0) throw new Error('Data tidak ditemukan');

            // Simple Markdown Formatter
            const formatDesc = (desc) => {
                return desc.split('\n').map(line => {
                    line = line.trim();
                    if (!line) return '';
                    if (line.startsWith('-') || line.startsWith('*')) {
                        return `
                            <div class="flex items-start gap-2.5 mb-1.5">
                                <div class="w-1.5 h-1.5 rounded-full bg-blue-500/50 mt-1.5 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.3)]"></div>
                                <span class="text-[11px] leading-relaxed text-gray-600 dark:text-obsidian-400">${line.substring(1).trim()}</span>
                            </div>`;
                    }
                    return `<p class="text-[11px] leading-relaxed text-gray-700 dark:text-obsidian-200 mb-2 font-medium">${line}</p>`;
                }).join('');
            };

            Swal.fire({
                title: 'Update Terbaru',
                html: `
                    <div class="text-left py-2">
                        <div class="flex items-center justify-between mb-8 px-1">
                            <p class="text-[10px] text-gray-400 dark:text-obsidian-500 font-black uppercase tracking-[0.2em]">Release History</p>
                            <span class="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-black border border-blue-100 dark:border-blue-800">Current v${this.VERSION}</span>
                        </div>
                        <style>
                            .custom-scrollbar::-webkit-scrollbar { display: none; }
                            .custom-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
                        </style>
                        <div class="space-y-8 max-h-[450px] overflow-y-auto pr-3 custom-scrollbar relative">
                            <!-- Vertical Timeline Line -->
                            <div class="absolute left-[7px] top-2 bottom-4 w-[2px] bg-gradient-to-b from-blue-500/30 via-blue-200/20 dark:via-obsidian-800 to-transparent"></div>
                            
                            ${updates.map((u, i) => `
                                <div class="relative pl-7 group">
                                    <!-- Timeline Node -->
                                    <div class="absolute left-0 top-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-obsidian-900 border-[3px] ${i === 0 ? 'border-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)] scale-110' : 'border-gray-200 dark:border-obsidian-800'} z-10 transition-transform group-hover:scale-125"></div>
                                    
                                    <div class="mb-2">
                                        <div class="flex items-center justify-between gap-4">
                                            <h4 class="text-xs font-black text-gray-900 dark:text-obsidian-100 tracking-tight">${u.title}</h4>
                                            <span class="text-[8px] font-black text-gray-300 dark:text-obsidian-600 uppercase tracking-widest whitespace-nowrap">${u.date}</span>
                                        </div>
                                        <p class="text-[9px] font-black text-blue-600/60 dark:text-blue-400/50 mt-0.5 tracking-wider uppercase">Build ${u.version}</p>
                                    </div>
                                    
                                    <div class="bg-gray-50/50 dark:bg-obsidian-800/30 border border-gray-50 dark:border-obsidian-800/50 rounded-2xl p-3.5 mt-2 transition-all group-hover:border-blue-100 dark:group-hover:border-blue-900/30 group-hover:bg-white dark:group-hover:bg-obsidian-800/50">
                                        ${formatDesc(u.description)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `,
                showConfirmButton: true,
                confirmButtonText: 'Terima Kasih',
                confirmButtonColor: '#2563eb',
                customClass: {
                    popup: 'rounded-[3rem] p-8 dark:bg-obsidian-950 dark:border dark:border-obsidian-800 shadow-2xl',
                    confirmButton: 'rounded-2xl w-full py-4 font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all'
                }
            });
        } catch (e) {
            console.error(e);
            Swal.fire({
                title: 'Error',
                text: 'Gagal memuat riwayat perubahan',
                icon: 'error',
                customClass: { popup: 'rounded-[2.5rem]' }
            });
        }
    },

    async loadSimpanan(container) {
        if (!container) return;

        // 1. SWR STALE: Render cached data immediately in 0ms
        const cached = this.getSwrCache('portal/saldo');
        if (cached && Array.isArray(cached)) {
            this.renderSimpananList(container, cached);
        } else {
            container.innerHTML = `<div class="space-y-3">${Array(3).fill().map(() => `
                <div class="animate-pulse bg-white dark:bg-obsidian-900 rounded-2xl border border-gray-100 dark:border-obsidian-800 p-4 flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gray-200 dark:bg-obsidian-700 shrink-0"></div>
                    <div class="flex-1">
                        <div class="h-3 bg-gray-200 dark:bg-obsidian-700 rounded-full w-2/3 mb-2"></div>
                        <div class="h-2 bg-gray-100 dark:bg-obsidian-800 rounded-full w-1/3"></div>
                    </div>
                    <div class="h-4 bg-gray-200 dark:bg-obsidian-700 rounded-full w-20 shrink-0"></div>
                </div>`).join('')}</div>`;
        }

        // 2. REVALIDATE: Fetch latest from server
        const r = await this.api('portal/saldo');
        if (r?.success && r.data) {
            this.setSwrCache('portal/saldo', r.data);
            this.renderSimpananList(container, r.data);
        }
    },

    renderSimpananList(container, data) {
        if (!container || !Array.isArray(data)) return;

        // Populate summary
        const totalSaldo = data.reduce((s, p) => s + parseFloat(p.saldo || 0), 0);
        const elTotal = document.getElementById('simp-total-saldo');
        if (elTotal) elTotal.textContent = this.rp(totalSaldo);
        const elCount = document.getElementById('simp-produk-count');
        if (elCount) elCount.textContent = data.filter(p => parseFloat(p.saldo) > 0).length + ' Produk';
        const elTime = document.getElementById('simp-update-time');
        if (elTime) elTime.textContent = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

        const iconMap = {
            'pokok': 'bi-shield-fill text-blue-500 bg-blue-50 border-blue-100 dark:bg-blue-900/30 dark:border-blue-800/30',
            'wajib': 'bi-shield-check text-emerald-500 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800/30',
            'sukarela': 'bi-piggy-bank text-orange-500 bg-orange-50 border-orange-100 dark:bg-orange-900/30 dark:border-orange-800/30',
            'partisipatif': 'bi-bank text-purple-500 bg-purple-50 border-purple-100 dark:bg-purple-900/30 dark:border-purple-800/30'
        };

        container.innerHTML = data.length ? data.map((p, i) => {
            const lcNama = (p.nama || '').toLowerCase();
            const iconCls = iconMap[Object.keys(iconMap).find(k => lcNama.includes(k))] || 'bi-wallet2 text-purple-500 bg-purple-50 border-purple-100';
            const iconName = iconCls.split(' ')[0];
            const iconColor = iconCls.split(' ').slice(1).join(' ');
            const saldo = parseFloat(p.saldo || 0);

            return `
            <div class="bg-white dark:bg-obsidian-900 rounded-2xl border border-gray-100 dark:border-obsidian-800 shadow-sm p-4 cursor-pointer active:scale-[0.99] transition-all hover:shadow-md simp-prod-row" data-id="${p.id || i}" data-jenis-id="${p.id || i}" data-nama="${p.nama}" data-saldo="${saldo}">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-2xl flex items-center justify-center border ${iconColor} dark:border-obsidian-700 shrink-0">
                            <i class="bi ${iconName} text-xl"></i>
                        </div>
                        <div>
                            <p class="font-bold text-gray-800 dark:text-obsidian-100 text-sm">${p.nama}</p>
                            <p class="text-[10px] text-gray-400 dark:text-obsidian-500 font-mono tracking-wide">${p.no_rekening || p.kode}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-bold text-gray-900 dark:text-obsidian-100 text-sm">${this.rp(saldo)}</p>
                        <p class="text-[9px] text-emerald-500 dark:text-emerald-400 font-medium flex items-center gap-1 justify-end mt-0.5"><i class="bi bi-chevron-right"></i> Lihat Mutasi</p>
                    </div>
                </div>
                <div class="flex justify-between bg-gray-50 dark:bg-obsidian-800/40 rounded-xl px-3 py-2 text-[9px] text-gray-400 dark:text-obsidian-500">
                    <span><i class="bi bi-calendar-check mr-1"></i>Buka: <span class="font-semibold text-gray-600 dark:text-obsidian-300">${p.tgl_buka ? this.fdate(p.tgl_buka) : '—'}</span></span>
                    <span><i class="bi bi-hash mr-1"></i>Kode: <span class="font-semibold text-gray-600 dark:text-obsidian-300">${p.kode}</span></span>
                </div>
            </div>`;
        }).join('') : '<div class="text-center py-10 bg-gray-50 dark:bg-obsidian-900 rounded-3xl border border-dashed border-gray-200 dark:border-obsidian-800"><i class="bi bi-piggy-bank text-3xl text-gray-400 dark:text-obsidian-600"></i><p class="text-xs font-bold text-gray-700 dark:text-obsidian-200 mt-2">Belum Ada Rekening Simpanan Aktif</p><p class="text-[10px] text-gray-400 dark:text-obsidian-500 mt-1 max-w-[260px] mx-auto">Kunjungi kantor kas koperasi atau hubungi pengurus untuk pembukaan simpanan pertama Anda.</p></div>';

        // Wire click — open mutasi modal
        container.querySelectorAll('.simp-prod-row').forEach(el => {
            el.addEventListener('click', async () => {
                const jenisId = el.dataset.jenisId;
                const namaJenis = el.dataset.nama;
                const saldoJenis = parseFloat(el.dataset.saldo);

                document.getElementById('simp-mut-judul').textContent = namaJenis;
                document.getElementById('simp-mut-saldo').textContent = 'Saldo: ' + this.rp(saldoJenis);

                // Populate Years and set defaults
                const selBulan = document.getElementById('simp-mut-bulan');
                const selTahun = document.getElementById('simp-mut-tahun');
                
                // Robustness check: Ensure elements exist before setting values
                if (selBulan && selTahun) {
                    if (selTahun.options.length === 0) {
                        const currentYear = new Date().getFullYear();
                        selTahun.innerHTML = '<option value="all">Semua Tahun</option>';
                        for (let y = currentYear; y >= currentYear - 3; y--) {
                            selTahun.innerHTML += `<option value="${y}">${y}</option>`;
                        }
                    }
                    
                    // Set to current month/year by default
                    selBulan.value = new Date().getMonth() + 1;
                    selTahun.value = new Date().getFullYear();
                    
                    // Set onchange handlers
                    selBulan.onchange = () => refreshMutasi();
                    selTahun.onchange = () => refreshMutasi();
                }

                let mPage = 1;
                let mLoading = false;
                let mHasMore = true;

                const refreshMutasi = async (append = false) => {
                    if (mLoading) return;
                    if (!append) {
                        mPage = 1;
                        mHasMore = true;
                        document.getElementById('simp-mut-list').innerHTML = `<div class="space-y-2">${Array(5).fill().map(() => `
                            <div class="animate-pulse flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 dark:bg-obsidian-800/30">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-2xl bg-gray-200 dark:bg-obsidian-700 shrink-0"></div>
                                    <div>
                                        <div class="h-2.5 bg-gray-200 dark:bg-obsidian-700 rounded-full w-24 mb-2"></div>
                                        <div class="h-2 bg-gray-100 dark:bg-obsidian-800 rounded-full w-16"></div>
                                    </div>
                                </div>
                                <div class="h-3 bg-gray-200 dark:bg-obsidian-700 rounded-full w-20 shrink-0"></div>
                            </div>`).join('')}</div>`;
                    } else {
                        const loader = document.createElement('div');
                        loader.id = 'mut-scroll-loader';
                        loader.className = 'text-center py-4';
                        loader.innerHTML = '<i class="bi bi-hourglass-split animate-pulse text-emerald-500 text-xl"></i>';
                        document.getElementById('simp-mut-list').appendChild(loader);
                    }

                    mLoading = true;
                    const b = selBulan ? selBulan.value : 'all';
                    const t = selTahun ? selTahun.value : 'all';
                    
                    const rm = await this.api(`portal/mutasi-per-jenis?jenis_id=${jenisId}&bulan=${b}&tahun=${t}&page=${mPage}`);
                    mLoading = false;
                    
                    const listEl = document.getElementById('simp-mut-list');
                    const loader = document.getElementById('mut-scroll-loader');
                    if (loader) loader.remove();
                    
                    if (!rm?.success || !rm.data.length) {
                        mHasMore = false;
                        if (!append) {
                            listEl.innerHTML = `
                            <div class="text-center py-20 animate-fadeIn">
                                <div class="w-20 h-20 bg-gray-50/50 dark:bg-obsidian-800/30 rounded-[2.5rem] flex items-center justify-center mx-auto mb-5 border-2 border-dashed border-gray-200 dark:border-obsidian-700">
                                    <i class="bi bi-inbox text-3xl text-gray-300 dark:text-obsidian-600"></i>
                                </div>
                                <p class="text-[10px] font-black uppercase tracking-widest text-gray-400">Belum ada mutasi</p>
                            </div>`;
                        }
                        return;
                    }

                    if (rm.data.length < 20) mHasMore = false;

                    const html = rm.data.map(t => {
                        const isMasuk = t.dk === 'D';
                        const colorText = isMasuk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
                        const iconCls2 = isMasuk ? 'bi-arrow-down-left text-emerald-500 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800/30' : 'bi-arrow-up-right text-rose-500 bg-rose-50 border-rose-100 dark:bg-rose-900/30 dark:border-rose-800/30';
                        const prefix = isMasuk ? '+' : '-';
                        return `
                        <div class="bg-gray-50/50 dark:bg-obsidian-800/20 p-4 rounded-2xl flex items-center justify-between border border-gray-50/50 dark:border-obsidian-800/50 animate-fadeIn hover:bg-white dark:hover:bg-obsidian-800 transition-all">
                            <div class="flex items-center gap-3">
                                <div class="w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center border ${iconCls2.split(' ').slice(1).join(' ')}">
                                    <i class="bi ${iconCls2.split(' ')[0]} text-lg"></i>
                                </div>
                                <div>
                                    <p class="text-xs font-black text-gray-800 dark:text-obsidian-100 tracking-tight">${t.nama_transaksi}</p>
                                    <div class="flex flex-col gap-0.5 mt-0.5">
                                        <p class="text-[9px] text-gray-400 dark:text-obsidian-500 font-bold uppercase tracking-wider">${this.fdate(t.tgl_transaksi)}</p>
                                        ${t.keterangan ? `<p class="text-[9px] text-gray-500 dark:text-obsidian-400 italic line-clamp-1 leading-tight">${t.keterangan}</p>` : ''}
                                    </div>
                                </div>
                            </div>
                            <div class="text-right">
                                <p class="text-xs font-black ${colorText}">${prefix}${this.rp(t.jumlah)}</p>
                                <p class="text-[9px] text-gray-400 dark:text-obsidian-500 font-medium mt-0.5">Saldo: ${this.rp(t.saldo_sesudah)}</p>
                            </div>
                        </div>`;
                    }).join('');

                    if (append) {
                        listEl.innerHTML += html;
                        this.currentData.items = [...this.currentData.items, ...rm.data];
                    } else {
                        listEl.innerHTML = html;
                        listEl.scrollTop = 0;
                        this.currentData = {
                            type: 'simpanan',
                            header: { 
                                judul: namaJenis, 
                                saldo: saldoJenis, 
                                sub: 'Rekening Koran Simpanan',
                                period: b !== 'all' ? `${selBulan.options[selBulan.selectedIndex].text} ${t}` : `Tahun ${t}`
                            },
                            items: rm.data
                        };
                    }
                    
                    mPage++;
                };

                const listEl = document.getElementById('simp-mut-list');
                listEl.onscroll = () => {
                    if (!mHasMore || mLoading) return;
                    if (listEl.scrollTop + listEl.clientHeight >= listEl.scrollHeight - 50) {
                        refreshMutasi(true);
                    }
                };

                this.openModal('simp-mutasi-modal');
                refreshMutasi();
            });
        });
    },

    async loadPinjaman(container) {
        if (!container) return;

        // 1. SWR STALE: Render cached data immediately in 0ms
        const cached = this.getSwrCache('portal/pinjaman');
        if (cached && Array.isArray(cached)) {
            this.renderPinjamanList(container, cached);
        } else {
            container.innerHTML = `<div class="space-y-4">${Array(2).fill().map(() => `
                <div class="animate-pulse bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div class="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                        <div>
                            <div class="h-3 bg-gray-200 rounded-full w-32 mb-2"></div>
                            <div class="h-2 bg-gray-100 rounded-full w-20"></div>
                        </div>
                        <div class="h-6 bg-gray-200 rounded-full w-14"></div>
                    </div>
                    <div class="p-4">
                        <div class="grid grid-cols-2 gap-4 mb-3">
                            <div><div class="h-2 bg-gray-100 rounded-full w-20 mb-2"></div><div class="h-4 bg-gray-200 rounded-full w-24"></div></div>
                            <div class="text-right"><div class="h-2 bg-gray-100 rounded-full w-16 mb-2 ml-auto"></div><div class="h-4 bg-gray-200 rounded-full w-20 ml-auto"></div></div>
                        </div>
                        <div class="h-10 bg-gray-100 rounded-xl"></div>
                    </div>
                </div>`).join('')}</div>`;
        }

        // 2. REVALIDATE: Fetch latest from server
        const r = await this.api('portal/pinjaman');
        if (r?.success && r.data) {
            this.setSwrCache('portal/pinjaman', r.data);
            this.renderPinjamanList(container, r.data);
        }
    },

    renderPinjamanList(container, data) {
        if (!container || !Array.isArray(data)) return;

        // Separate lunas vs non-lunas
        const lunasList = data.filter(p => p.status === 'lunas');
        const aktifList = data.filter(p => p.status !== 'lunas');

        // Header: hanya pinjaman status=cair yang masuk hitungan
        const aktifCair = aktifList.filter(p => p.status === 'cair');
        const totalSisa = aktifCair.reduce((s, p) => s + parseFloat(p.sisa_pinjaman || 0), 0);
        const totalPinjam = aktifCair.reduce((s, p) => s + parseFloat(p.jumlah || 0), 0);
        const totalBayar = aktifCair.reduce((s, p) => s + parseFloat(p.total_bayar || 0), 0);

        const elSisa = document.getElementById('pin-total-sisa');
        if (elSisa) elSisa.textContent = this.rp(totalSisa);
        const elPinjam = document.getElementById('pin-total-pinjam');
        if (elPinjam) elPinjam.textContent = this.rp(totalPinjam);
        const elBayar = document.getElementById('pin-total-bayar');
        if (elBayar) elBayar.textContent = this.rp(totalBayar);
        const elJml = document.getElementById('pin-jml');
        if (elJml) elJml.textContent = aktifCair.length + ' Akun';

        const renderCard = (p, i, dataset) => {
            const isLunas = p.status === 'lunas';
            const badgeClass = isLunas ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-800' : (p.status === 'cair' ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-800' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-800');
            const badgeIcon = isLunas ? 'bi-check-circle-fill' : (p.status === 'cair' ? 'bi-clock-history' : 'bi-hourglass-split');
            return `
            <div class="bg-white dark:bg-obsidian-900 rounded-2xl border border-gray-100 dark:border-obsidian-800 shadow-sm overflow-hidden active:scale-[0.99] transition-all cursor-pointer pin-row" data-idx="${i}">
                <div class="p-4 border-b border-gray-50 dark:border-obsidian-800 flex items-center justify-between bg-gray-50/50 dark:bg-obsidian-800/30">
                    <div>
                        <p class="text-xs font-bold text-gray-800 dark:text-obsidian-100 tracking-wide">${p.no_pinjaman}</p>
                        <p class="text-[10px] text-gray-500 dark:text-obsidian-500">${p.jenis_pinjaman}</p>
                    </div>
                    <span class="px-2.5 py-1 rounded-full text-[10px] font-bold border flex items-center gap-1 uppercase tracking-wider ${badgeClass}">
                        <i class="bi ${badgeIcon}"></i> ${p.status}
                    </span>
                </div>
                <div class="p-4 bg-white dark:bg-obsidian-900">
                    <!-- Progress Visualization -->
                    ${!isLunas ? `
                    <div class="mb-5">
                        <div class="flex justify-between items-end mb-2">
                            <div>
                                <p class="text-[10px] font-bold text-gray-400 dark:text-obsidian-500 uppercase tracking-widest">Progres Pelunasan</p>
                                <p class="text-xs font-black text-blue-600 dark:text-blue-400 mt-0.5">${Math.round(((parseFloat(p.total_bayar) - parseFloat(p.sisa_pinjaman)) / parseFloat(p.total_bayar)) * 100)}% Terbayar</p>
                            </div>
                            <div class="text-right">
                                <p class="text-[9px] text-gray-400 dark:text-obsidian-500 italic">Estimasi Selesai: <span class="text-gray-600 dark:text-obsidian-300 font-bold">${p.tenor} Bulan</span></p>
                            </div>
                        </div>
                        <div class="w-full bg-gray-100 dark:bg-obsidian-800 h-2.5 rounded-full overflow-hidden flex shadow-inner">
                            <div class="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000" style="width: ${((parseFloat(p.total_bayar) - parseFloat(p.sisa_pinjaman)) / parseFloat(p.total_bayar)) * 100}%"></div>
                        </div>
                    </div>
                    ` : ''}

                    <div class="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p class="text-[10px] text-gray-400 dark:text-obsidian-500 uppercase tracking-wider mb-0.5 border-b border-gray-100 dark:border-obsidian-800 pb-1">Total Pinjaman</p>
                            <p class="font-bold text-gray-800 dark:text-obsidian-100 text-sm mt-1">${this.rp(p.jumlah)}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[10px] text-gray-400 dark:text-obsidian-500 uppercase tracking-wider mb-0.5 border-b border-gray-100 dark:border-obsidian-800 pb-1">Sisa Hutang</p>
                            <p class="font-bold border-gray-100 text-sm mt-1 ${isLunas ? 'text-emerald-500' : 'text-rose-500 dark:text-rose-400'}">${this.rp(p.sisa_pinjaman)}</p>
                        </div>
                    </div>
                    <div class="bg-gray-50 dark:bg-obsidian-800/40 rounded-xl p-3 mt-2 grid grid-cols-2 gap-2">
                        <div>
                            <p class="text-[9px] text-gray-400 dark:text-obsidian-500 mb-0.5"><i class="bi bi-calendar-event mr-0.5"></i> Tgl Pengajuan</p>
                            <p class="text-[10px] font-semibold text-gray-700 dark:text-obsidian-200">${this.fdate(p.tgl_pengajuan)}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-[9px] text-gray-400 dark:text-obsidian-500 mb-0.5"><i class="bi bi-send-check mr-0.5"></i> Tgl Pencairan</p>
                            <p class="text-[10px] font-semibold text-gray-700 dark:text-obsidian-200">${p.tgl_pencairan ? this.fdate(p.tgl_pencairan) : '—'}</p>
                        </div>
                    </div>
                    <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-2.5 mt-2 flex items-center justify-between">
                        <span class="text-[10px] font-medium text-blue-700 dark:text-blue-400"><i class="bi bi-calendar2-week mr-1"></i> Tenor ${p.tenor} Bln &bull; ${p.bunga_persen}%/thn</span>
                        <span class="text-[10px] font-medium text-blue-600 dark:text-blue-400"><i class="bi bi-chevron-right mr-1"></i> Lihat Angsuran</span>
                    </div>
                </div>
            </div>`;
        };

        container.innerHTML = aktifList.length
            ? aktifList.map((p, i) => renderCard(p, i, aktifList)).join('')
            : '<div class="text-center py-12 bg-gray-50 dark:bg-obsidian-900 rounded-3xl border border-dashed border-gray-200 dark:border-obsidian-800"><i class="bi bi-shield-check text-4xl text-emerald-500/70"></i><p class="text-sm font-bold text-gray-700 dark:text-obsidian-200 mt-3">Tidak Ada Pinjaman Berjalan</p><p class="text-xs text-gray-400 dark:text-obsidian-500 mt-1 max-w-[280px] mx-auto">Semua kewajiban telah lunas atau belum ada pinjaman aktif. Fasilitas kredit koperasi selalu siap mendukung kebutuhan usaha dan keluarga Anda.</p></div>';

        // Wire click -> angsuran modal for active loans
        container.querySelectorAll('.pin-row').forEach(el => {
            el.addEventListener('click', async () => {
                const p = aktifList[parseInt(el.dataset.idx)];
                const modal = document.getElementById('pin-angsuran-modal');
                document.getElementById('pin-ang-no').textContent = p.no_pinjaman;
                document.getElementById('pin-ang-jenis').textContent = p.jenis_pinjaman;
                document.getElementById('pin-ang-total').textContent = this.rp(p.jumlah);
                document.getElementById('pin-ang-bayar').textContent = this.rp(parseFloat(p.jumlah) - parseFloat(p.sisa_pinjaman));
                document.getElementById('pin-ang-sisa').textContent = this.rp(p.sisa_pinjaman);
                document.getElementById('pin-ang-list').innerHTML = `<div class="space-y-2">${Array(5).fill().map(() => `
                <div class="animate-pulse p-3 rounded-xl border bg-gray-50 border-gray-100">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-full bg-gray-200"></div>
                            <div>
                                <div class="h-2.5 bg-gray-200 rounded-full w-28 mb-1.5"></div>
                                <div class="h-2 bg-gray-100 rounded-full w-20"></div>
                            </div>
                        </div>
                        <div class="h-5 bg-gray-200 rounded-full w-12"></div>
                    </div>
                    <div class="grid grid-cols-3 gap-1 mt-2">
                        <div class="h-8 bg-gray-200 rounded-lg"></div>
                        <div class="h-8 bg-gray-200 rounded-lg"></div>
                        <div class="h-8 bg-gray-200 rounded-lg"></div>
                    </div>
                </div>`).join('')}</div>`;
                this.openModal('pin-angsuran-modal');

                const ra = await this.api('portal/angsuran?pinjaman_id=' + p.id);
                if (!ra?.success) return;

                this.currentData = {
                    type: 'pinjaman',
                    header: { judul: p.jenis_pinjaman, no: p.no_pinjaman, total: p.jumlah, bayar: parseFloat(p.jumlah) - parseFloat(p.sisa_pinjaman), sisa: p.sisa_pinjaman, sub: 'Rincian Angsuran Pinjaman' },
                    items: ra.data
                };

                const listEl = document.getElementById('pin-ang-list');
                if (!ra.data.length) {
                    listEl.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="bi bi-inbox text-2xl block mb-2"></i>Belum ada jadwal angsuran</div>';
                    return;
                }

                // Tampilkan info Saldo Simpanan Sukarela
                const sukarelaBox = document.getElementById('pin-ang-sukarela-box');
                const sukarelaSaldoEl = document.getElementById('pin-ang-sukarela-saldo');
                const saldoSukarela = parseFloat(ra.data[0]?.saldo_sukarela || 0);
                const hasSukarela = !!ra.data[0]?.has_sukarela;

                if (sukarelaBox && sukarelaSaldoEl) {
                    if (hasSukarela || saldoSukarela > 0) {
                        sukarelaBox.classList.remove('hidden');
                        sukarelaSaldoEl.textContent = this.rp(saldoSukarela);
                    } else {
                        sukarelaBox.classList.add('hidden');
                    }
                }

                // Cari angsuran belum lunas pertama yang belum diajukan
                const firstPayable = ra.data.find(x => x.status !== 'lunas' && x.status_pengajuan !== 'pending');

                listEl.innerHTML = ra.data.map(a => {
                    const isLunas2 = a.status === 'lunas';
                    const isTerlambat = a.status === 'terlambat';
                    const isPendingACC = a.status_pengajuan === 'pending';

                    let statusBadge = '';
                    if (isLunas2) {
                        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">Lunas</span>';
                    } else if (isPendingACC) {
                        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center gap-1"><i class="bi bi-hourglass-split animate-spin"></i> Menunggu ACC</span>';
                    } else if (isTerlambat) {
                        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">Terlambat</span>';
                    } else {
                        statusBadge = '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 dark:bg-obsidian-800 text-gray-600 dark:text-obsidian-500">Belum</span>';
                    }

                    const rowBg = isLunas2 
                        ? 'bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' 
                        : (isPendingACC 
                            ? 'bg-amber-50/70 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-800/40' 
                            : (isTerlambat 
                                ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/30' 
                                : 'bg-gray-50 dark:bg-obsidian-800/30 border-gray-100 dark:border-obsidian-800'));

                    // Area Aksi Pembayaran Sukarela
                    let actionHtml = '';
                    if (!isLunas2) {
                        if (isPendingACC) {
                            actionHtml = `
                            <div class="mt-2.5 p-2.5 bg-amber-100/60 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700/50 rounded-xl flex items-center justify-between text-[11px]">
                                <span class="text-amber-800 dark:text-amber-200 font-semibold flex items-center gap-1.5">
                                    <i class="bi bi-clock-history text-sm text-amber-600"></i> Pengajuan sedang diverifikasi Bendahara
                                </span>
                                <span class="text-[10px] text-amber-600 dark:text-amber-400 font-mono">${a.no_pengajuan || ''}</span>
                            </div>`;
                        } else if (firstPayable && a.id === firstPayable.id) {
                            const totalTagihan = parseFloat(a.total);
                            if (!hasSukarela) {
                                actionHtml = `
                                <div class="mt-2.5 p-2 bg-gray-100/80 dark:bg-obsidian-800 border border-gray-200 dark:border-obsidian-700 rounded-xl text-[10px] text-gray-500 dark:text-obsidian-400 flex items-center gap-1.5">
                                    <i class="bi bi-info-circle text-gray-400"></i> Anda belum memiliki rekening Simpanan Sukarela untuk bayar angsuran
                                </div>`;
                            } else if (saldoSukarela >= totalTagihan) {
                                actionHtml = `
                                <button onclick="event.stopPropagation(); Portal.bayarAngsuranSukarela(${p.id}, ${a.id}, ${a.angsuran_ke}, ${totalTagihan}, ${saldoSukarela})"
                                    class="w-full mt-2.5 py-2 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 active:scale-[0.98] transition-all">
                                    <i class="bi bi-wallet2 text-sm"></i> Bayar via Simpanan Sukarela
                                </button>`;
                            } else {
                                actionHtml = `
                                <div class="mt-2.5 p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/40 rounded-xl flex items-center justify-between text-[10px]">
                                    <span class="text-amber-700 dark:text-amber-300 font-medium flex items-center gap-1">
                                        <i class="bi bi-exclamation-circle text-amber-500"></i> Saldo sukarela (${this.rp(saldoSukarela)}) tidak cukup
                                    </span>
                                    <span class="text-gray-400 dark:text-obsidian-500 text-[9px] font-bold">Tagihan: ${this.rp(totalTagihan)}</span>
                                </div>`;
                            }
                        }
                    }

                    return `
                    <div class="p-3.5 rounded-2xl border ${rowBg} transition-all">
                        <div class="flex items-center justify-between mb-2">
                            <div class="flex items-center gap-2.5">
                                <span class="w-7 h-7 rounded-full ${isLunas2 ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200' : (isPendingACC ? 'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200' : 'bg-gray-200 dark:bg-obsidian-700 text-gray-600 dark:text-obsidian-400')} flex items-center justify-center text-[11px] font-bold">${a.angsuran_ke}</span>
                                <div>
                                    <p class="text-xs font-bold text-gray-800 dark:text-obsidian-100">Jatuh Tempo: ${this.fdate(a.tgl_jatuh_tempo)}</p>
                                    ${a.tgl_bayar ? '<p class="text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">Dibayar: ' + this.fdate(a.tgl_bayar) + '</p>' : ''}
                                </div>
                            </div>
                            ${statusBadge}
                        </div>
                        <div class="grid grid-cols-3 gap-1.5 text-center">
                            <div class="bg-white/70 dark:bg-obsidian-900/50 rounded-xl p-1.5 border border-black/5 dark:border-white/5">
                                <p class="text-[8px] text-gray-400 dark:text-obsidian-500 uppercase tracking-wider mb-0.5">Pokok</p>
                                <p class="text-[10px] font-bold text-gray-700 dark:text-obsidian-100">${this.rp(a.pokok)}</p>
                            </div>
                            <div class="bg-white/70 dark:bg-obsidian-900/50 rounded-xl p-1.5 border border-black/5 dark:border-white/5">
                                <p class="text-[8px] text-gray-400 dark:text-obsidian-500 uppercase tracking-wider mb-0.5">Bunga</p>
                                <p class="text-[10px] font-bold text-gray-700 dark:text-obsidian-100">${this.rp(a.bunga)}</p>
                            </div>
                            <div class="bg-white/70 dark:bg-obsidian-900/50 rounded-xl p-1.5 border border-black/5 dark:border-white/5">
                                <p class="text-[8px] text-gray-400 dark:text-obsidian-500 uppercase tracking-wider mb-0.5">Total</p>
                                <p class="text-[10px] font-bold text-gray-900 dark:text-obsidian-100">${this.rp(a.total)}</p>
                            </div>
                        </div>
                        ${actionHtml}
                    </div>`;
                }).join('');
            });
        });

        // Render lunas summary banner
        const lunasSummary = document.getElementById('pin-lunas-summary');
        const lunasCountEl = document.getElementById('pin-lunas-count');
        const lunasListEl = document.getElementById('pin-lunas-list');
        if (lunasList.length > 0 && lunasSummary) {
            lunasSummary.classList.remove('hidden');
            if (lunasCountEl) lunasCountEl.textContent = lunasList.length + ' akun terlunasi';
            // Pre-render lunas list for modal
            if (lunasListEl) {
                lunasListEl.innerHTML = lunasList.map((p, i) => `
                <div class="bg-white dark:bg-obsidian-900 rounded-2xl border border-emerald-100 dark:border-obsidian-800 shadow-sm overflow-hidden cursor-pointer pin-lunas-row" data-idx="${i}">
                    <div class="p-3 flex items-center justify-between">
                        <div>
                            <p class="text-xs font-bold text-gray-800 dark:text-obsidian-100">${p.no_pinjaman}</p>
                            <p class="text-[10px] text-gray-500 dark:text-obsidian-500">${p.jenis_pinjaman} &bull; Tenor ${p.tenor} bln</p>
                        </div>
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                            <i class="bi bi-check-circle-fill"></i> Lunas
                        </span>
                    </div>
                    <div class="px-3 pb-3 grid grid-cols-2 gap-3 bg-emerald-50/50 dark:bg-obsidian-800/40 rounded-b-2xl">
                        <div class="pt-2">
                            <p class="text-[9px] text-gray-400 dark:text-obsidian-500">Total Pinjaman</p>
                            <p class="text-xs font-bold text-gray-700 dark:text-obsidian-100">${this.rp(p.jumlah)}</p>
                        </div>
                        <div class="pt-2 text-right">
                            <p class="text-[9px] text-gray-400 dark:text-obsidian-500">Tgl Pencairan</p>
                            <p class="text-xs font-semibold text-gray-700 dark:text-obsidian-200">${p.tgl_pencairan ? this.fdate(p.tgl_pencairan) : '—'}</p>
                        </div>
                    </div>
                </div>`).join('');

                // Wire-up click on lunas cards to show angsuran in the angsuran modal
                lunasListEl.querySelectorAll('.pin-lunas-row').forEach(el => {
                    el.addEventListener('click', async () => {
                        const p = lunasList[parseInt(el.dataset.idx)];
                        this.closeModal('pin-lunas-modal');
                        document.getElementById('pin-ang-no').textContent = p.no_pinjaman;
                        document.getElementById('pin-ang-jenis').textContent = p.jenis_pinjaman + ' (Lunas)';
                        document.getElementById('pin-ang-total').textContent = this.rp(p.jumlah);
                        document.getElementById('pin-ang-bayar').textContent = this.rp(p.jumlah);
                        document.getElementById('pin-ang-sisa').textContent = this.rp(0);
                        document.getElementById('pin-ang-list').innerHTML = `<div class="space-y-2">${Array(5).fill().map(() => `
                <div class="animate-pulse p-3 rounded-xl border bg-gray-50 border-gray-100">
                    <div class="flex items-center justify-between mb-2">
                        <div class="flex items-center gap-2">
                            <div class="w-7 h-7 rounded-full bg-gray-200"></div>
                            <div>
                                <div class="h-2.5 bg-gray-200 rounded-full w-28 mb-1.5"></div>
                                <div class="h-2 bg-gray-100 rounded-full w-20"></div>
                            </div>
                        </div>
                        <div class="h-5 bg-gray-200 rounded-full w-12"></div>
                    </div>
                    <div class="grid grid-cols-3 gap-1 mt-2">
                        <div class="h-8 bg-gray-200 rounded-lg"></div>
                        <div class="h-8 bg-gray-200 rounded-lg"></div>
                        <div class="h-8 bg-gray-200 rounded-lg"></div>
                    </div>
                </div>`).join('')}</div>`;
                        this.openModal('pin-angsuran-modal');

                        const ra = await this.api('portal/angsuran?pinjaman_id=' + p.id);
                        const listEl2 = document.getElementById('pin-ang-list');
                        if (!ra?.success || !ra.data.length) {
                            listEl2.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="bi bi-inbox text-2xl block mb-2"></i>Tidak ada data</div>';
                            return;
                        }
                        listEl2.innerHTML = ra.data.map(a => {
                            return `
                            <div class="p-3 rounded-xl border bg-emerald-50 border-emerald-100">
                                <div class="flex items-center justify-between mb-1.5">
                                    <div class="flex items-center gap-2">
                                        <span class="w-7 h-7 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-[10px] font-bold">${a.angsuran_ke}</span>
                                        <div>
                                            <p class="text-xs font-semibold text-gray-700">Jatuh Tempo: ${this.fdate(a.tgl_jatuh_tempo)}</p>
                                            ${a.tgl_bayar ? '<p class="text-[9px] text-emerald-600">Dibayar: ' + this.fdate(a.tgl_bayar) + '</p>' : ''}
                                        </div>
                                    </div>
                                    <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">Lunas</span>
                                </div>
                                <div class="grid grid-cols-3 gap-1 mt-2 text-center">
                                    <div class="bg-white/70 rounded-lg p-1.5"><p class="text-[8px] text-gray-400 mb-0.5">Pokok</p><p class="text-[10px] font-bold text-gray-700">${this.rp(a.pokok)}</p></div>
                                    <div class="bg-white/70 rounded-lg p-1.5"><p class="text-[8px] text-gray-400 mb-0.5">Bunga</p><p class="text-[10px] font-bold text-gray-700">${this.rp(a.bunga)}</p></div>
                                    <div class="bg-white/70 rounded-lg p-1.5"><p class="text-[8px] text-gray-400 mb-0.5">Total</p><p class="text-[10px] font-bold text-gray-800">${this.rp(a.total)}</p></div>
                                </div>
                            </div>`;
                        }).join('');
                    });
                });
            }
        }
    },

    async bayarAngsuranSukarela(pinjamanId, angsuranId, angsuranKe, totalBayar, saldoSukarela) {
        const sisaEstimasi = saldoSukarela - totalBayar;
        const confirm = await Swal.fire({
            title: 'Bayar via Simpanan Sukarela?',
            html: `
                <div class="text-left space-y-3 text-xs">
                    <div class="p-3 bg-gray-50 dark:bg-obsidian-800 rounded-xl space-y-1.5 border border-gray-100 dark:border-obsidian-700">
                        <div class="flex justify-between text-gray-500 dark:text-obsidian-400">
                            <span>Angsuran Ke:</span>
                            <span class="font-bold text-gray-800 dark:text-obsidian-100">${angsuranKe}</span>
                        </div>
                        <div class="flex justify-between text-gray-500 dark:text-obsidian-400">
                            <span>Total Tagihan:</span>
                            <span class="font-bold text-rose-600 dark:text-rose-400">${this.rp(totalBayar)}</span>
                        </div>
                    </div>
                    <div class="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl space-y-1.5 border border-emerald-100 dark:border-emerald-800/40">
                        <div class="flex justify-between text-emerald-800 dark:text-emerald-300">
                            <span>Saldo Sukarela Saat Ini:</span>
                            <span class="font-bold">${this.rp(saldoSukarela)}</span>
                        </div>
                        <div class="flex justify-between text-emerald-800 dark:text-emerald-300 border-t border-emerald-200/50 dark:border-emerald-700/50 pt-1.5 font-bold">
                            <span>Estimasi Saldo Akhir:</span>
                            <span class="text-emerald-600 dark:text-emerald-400">${this.rp(sisaEstimasi)}</span>
                        </div>
                    </div>
                    <p class="text-[10px] text-gray-400 dark:text-obsidian-500 text-center">
                        <i class="bi bi-shield-check text-emerald-500"></i> Pengajuan pembayaran akan diteruskan ke Bendahara untuk diverifikasi & disetujui (ACC).
                    </p>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '<i class="bi bi-check-lg mr-1"></i> Ajukan Pembayaran',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#059669',
            cancelButtonColor: '#6b7280',
            customClass: {
                popup: 'rounded-3xl dark:bg-obsidian-900 dark:text-obsidian-100',
                confirmButton: 'rounded-xl font-bold text-xs py-3 px-4',
                cancelButton: 'rounded-xl font-bold text-xs py-3 px-4'
            }
        });

        if (!confirm.isConfirmed) return;

        Swal.fire({
            title: 'Memproses...',
            text: 'Mengirimkan pengajuan ke Bendahara...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const res = await this.api('portal/bayar-angsuran-sukarela', {
            method: 'POST',
            body: { pinjaman_id: pinjamanId, angsuran_id: angsuranId }
        });

        if (res?.success) {
            await Swal.fire({
                icon: 'success',
                title: 'Pengajuan Terkirim!',
                text: res.message || 'Pengajuan pembayaran angsuran telah dikirim ke Bendahara.',
                confirmButtonColor: '#059669',
                customClass: { popup: 'rounded-3xl' }
            });
            // Reload data
            if (this.currentTab === 'home') {
                await this.loadDashboardData();
            } else {
                await this.loadPinjaman(document.getElementById('p-content-pinjaman'));
                const card = document.querySelector(`.pin-row`);
                if (card) card.click();
            }
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Gagal Mengajukan',
                text: res?.message || 'Terjadi kesalahan saat mengajukan pembayaran angsuran.',
                confirmButtonColor: '#e11d48',
                customClass: { popup: 'rounded-3xl' }
            });
        }
    },

    rp(n) { 
        if (this.privacyMode) return 'Rp ••••••';
        return 'Rp ' + new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n || 0); 
    },

    updatePrivacyIcons() {
        const icons = document.querySelectorAll('.privacy-toggle-icon');
        icons.forEach(icon => {
            icon.className = 'privacy-toggle-icon bi ' + (this.privacyMode ? 'bi-eye-slash-fill' : 'bi-eye-fill');
        });
    },

    togglePrivacy() {
        this.privacyMode = !this.privacyMode;
        localStorage.setItem('kop_privacy_mode', this.privacyMode);
        
        this.updatePrivacyIcons();

        // Re-render current data
        if (this.currentTab === 'home') this.loadDashboardData();
        if (this.currentTab === 'simpanan') this.loadSimpanan(document.getElementById('p-content-simpanan'));
        if (this.currentTab === 'pinjaman') this.loadPinjaman(document.getElementById('p-content-pinjaman'));
        if (this.currentTab === 'laporan') this.loadLaporan();
    },

    parseDate(d) {
        if (!d) return null;
        if (d instanceof Date) return isNaN(d.getTime()) ? null : d;
        if (typeof d === 'number') {
            const dt = new Date(d);
            return isNaN(dt.getTime()) ? null : dt;
        }
        if (typeof d !== 'string') return null;

        let s = d.trim();
        if (!s) return null;

        // 1. MySQL DATETIME "YYYY-MM-DD HH:mm:ss" -> ganti spasi dengan "T" (Standar ISO 8601 Safari WebKit)
        if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) {
            const iso = s.replace(/\s+/, 'T');
            const dt = new Date(iso);
            if (!isNaN(dt.getTime())) return dt;
        }

        // 2. Direct Date constructor
        let dt = new Date(s);
        if (!isNaN(dt.getTime())) return dt;

        // 3. WebKit / Safari iOS Classic Fallback: format slash "YYYY/MM/DD HH:mm:ss"
        const slashStr = s.replace(/-/g, '/').replace('T', ' ');
        dt = new Date(slashStr);
        if (!isNaN(dt.getTime())) return dt;

        // 4. Regex manual extractor fallback (komponen numerik aman tanpa parsing engine bug)
        const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:[T\s](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
        if (m) {
            const y = parseInt(m[1], 10);
            const mo = parseInt(m[2], 10) - 1;
            const day = parseInt(m[3], 10);
            const h = m[4] ? parseInt(m[4], 10) : 0;
            const mi = m[5] ? parseInt(m[5], 10) : 0;
            const sec = m[6] ? parseInt(m[6], 10) : 0;
            dt = new Date(y, mo, day, h, mi, sec);
            if (!isNaN(dt.getTime())) return dt;
        }

        return null;
    },

    fdate(d) {
        const dt = this.parseDate(d);
        if (!dt) return '-';
        try {
            return dt.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch (e) {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
            const day = String(dt.getDate()).padStart(2, '0');
            const month = months[dt.getMonth()];
            const year = dt.getFullYear();
            return `${day} ${month} ${year}`;
        }
    },

    async openSimpananDetail(jenisId, namaJenis, saldoJenis) {
        const modal = document.getElementById('simp-mutasi-modal');
        if (!modal) return;

        document.getElementById('simp-mut-judul').textContent = namaJenis;
        document.getElementById('simp-mut-saldo').textContent = 'Saldo: ' + this.rp(saldoJenis);
        document.getElementById('simp-mut-list').innerHTML = `<div class="space-y-2">${Array(5).fill().map(() => `
            <div class="animate-pulse flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full bg-gray-200 shrink-0"></div>
                    <div>
                        <div class="h-2.5 bg-gray-200 rounded-full w-24 mb-1.5"></div>
                        <div class="h-2 bg-gray-100 rounded-full w-16"></div>
                    </div>
                </div>
                <div class="h-3 bg-gray-200 rounded-full w-16 shrink-0"></div>
            </div>`).join('')}</div>`;
        this.openModal('simp-mutasi-modal');

        const rm = await this.api('portal/mutasi-per-jenis?jenis_id=' + jenisId);
        const listEl = document.getElementById('simp-mut-list');
        if (!rm?.success || !rm.data.length) {
            listEl.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="bi bi-inbox text-2xl block mb-2"></i>Belum ada mutasi</div>';
            return;
        }
        this.currentMutasiList = rm.data;
        listEl.innerHTML = rm.data.map((t, i) => {
            const isMasuk = t.dk === 'D';
            const colorText = isMasuk ? 'text-emerald-600' : 'text-rose-600';
            const iconCls2 = isMasuk ? 'bi-arrow-down-left text-emerald-500 bg-emerald-50 border-emerald-100' : 'bi-arrow-up-right text-rose-500 bg-rose-50 border-rose-100';
            const prefix = isMasuk ? '+' : '-';
            return `
            <div onclick="Portal.openReceiptFromSimpananIndex(${i})" 
                 title="Ketuk untuk melihat bukti transaksi digital resmi"
                 class="bg-gray-50 dark:bg-obsidian-800/40 hover:bg-white dark:hover:bg-obsidian-800 p-3 rounded-2xl flex items-center justify-between border border-gray-100/60 dark:border-obsidian-800/50 cursor-pointer transition-all active:scale-[0.99] group shadow-2xs">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 shrink-0 rounded-full flex items-center justify-center border ${iconCls2.split(' ').slice(1).join(' ')} dark:border-opacity-20">
                        <i class="bi ${iconCls2.split(' ')[0]}"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-1.5">
                            <p class="text-xs font-bold text-gray-800 dark:text-obsidian-100">${t.nama_transaksi}</p>
                            <i class="bi bi-receipt text-[10px] text-indigo-500 opacity-80"></i>
                        </div>
                        <p class="text-[10px] text-gray-500 dark:text-obsidian-500">${this.fdate(t.tgl_transaksi)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xs font-bold ${colorText}">${prefix}${this.rp(t.jumlah)}</p>
                    <div class="flex items-center justify-end gap-1 mt-0.5">
                        <span class="text-[8px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.2 rounded border border-indigo-100 dark:border-indigo-800/50 flex items-center gap-0.5">
                            <i class="bi bi-receipt"></i> Slip
                        </span>
                        <p class="text-[9px] text-gray-400 dark:text-obsidian-500">Saldo: ${this.rp(t.saldo_sesudah)}</p>
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    async openPinjamanDetail(p_id, no_pinjaman, jenis_pinjaman, jumlah, sisa_pinjaman, isLunas) {
        const modal = document.getElementById('pin-angsuran-modal');
        if (!modal) return;

        document.getElementById('pin-ang-no').textContent = no_pinjaman;
        document.getElementById('pin-ang-jenis').textContent = jenis_pinjaman + (isLunas ? ' (Lunas)' : '');
        document.getElementById('pin-ang-total').textContent = this.rp(jumlah);
        document.getElementById('pin-ang-bayar').textContent = this.rp(parseFloat(jumlah) - parseFloat(sisa_pinjaman));
        document.getElementById('pin-ang-sisa').textContent = this.rp(sisa_pinjaman);
        document.getElementById('pin-ang-list').innerHTML = `<div class="space-y-2">${Array(5).fill().map(() => `
        <div class="animate-pulse p-3 rounded-xl border bg-gray-50 border-gray-100">
            <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 rounded-full bg-gray-200"></div>
                    <div>
                        <div class="h-2.5 bg-gray-200 rounded-full w-28 mb-1.5"></div>
                        <div class="h-2 bg-gray-100 rounded-full w-20"></div>
                    </div>
                </div>
                <div class="h-5 bg-gray-200 rounded-full w-12"></div>
            </div>
            <div class="grid grid-cols-3 gap-1 mt-2">
                <div class="h-8 bg-gray-200 rounded-lg"></div>
                <div class="h-8 bg-gray-200 rounded-lg"></div>
                <div class="h-8 bg-gray-200 rounded-lg"></div>
            </div>
        </div>`).join('')}</div>`;
        this.openModal('pin-angsuran-modal');

        const ra = await this.api('portal/angsuran?pinjaman_id=' + p_id);
        const listEl = document.getElementById('pin-ang-list');
        if (!ra?.success || !ra.data.length) {
            listEl.innerHTML = '<div class="text-center py-8 text-gray-400"><i class="bi bi-inbox text-2xl block mb-2"></i>Tidak ada data angsuran</div>';
            return;
        }
        this.currentAngsuranList = ra.data;
        this.currentPinjamanInfo = { no_pinjaman, jenis_pinjaman };
        listEl.innerHTML = ra.data.map((a, idx) => {
            const isLunas2 = a.status === 'lunas';
            const isTerlambat = a.status === 'terlambat';
            const statusBadge = isLunas2
                ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">Lunas</span>'
                : (isTerlambat
                    ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700">Terlambat</span>'
                    : '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-600">Belum</span>');
            const rowBg = isLunas2 ? 'bg-emerald-50/70 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-800/40' : (isTerlambat ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100 dark:bg-obsidian-800/40 dark:border-obsidian-800');
            const receiptBtn = (isLunas2 || a.tgl_bayar)
                ? `<button onclick="Portal.openReceiptFromAngsuranIndex(${idx})" class="mt-2.5 w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold rounded-xl text-[10px] flex items-center justify-center gap-1.5 active:scale-95 transition-all border border-indigo-100 dark:border-indigo-800/40 shadow-2xs">
                    <i class="bi bi-receipt"></i> Lihat Bukti Bayar (Struk Resmi)
                   </button>`
                : '';
            return `
            <div class="p-3.5 rounded-2xl border ${rowBg}">
                <div class="flex items-center justify-between mb-1.5">
                    <div class="flex items-center gap-2">
                        <span class="w-7 h-7 rounded-full ${isLunas2 ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-200 text-gray-600'} flex items-center justify-center text-[10px] font-bold">${a.angsuran_ke}</span>
                        <div>
                            <p class="text-xs font-semibold text-gray-700 dark:text-obsidian-200">Jatuh Tempo: ${this.fdate(a.tgl_jatuh_tempo)}</p>
                            ${a.tgl_bayar ? '<p class="text-[9px] text-emerald-600 font-medium">Dibayar: ' + this.fdate(a.tgl_bayar) + '</p>' : ''}
                        </div>
                    </div>
                    ${statusBadge}
                </div>
                <div class="grid grid-cols-3 gap-1 mt-2 text-center">
                    <div class="bg-white/70 dark:bg-obsidian-800/60 rounded-xl p-1.5"><p class="text-[8px] text-gray-400 mb-0.5">Pokok</p><p class="text-[10px] font-bold text-gray-700 dark:text-obsidian-200">${this.rp(a.pokok)}</p></div>
                    <div class="bg-white/70 dark:bg-obsidian-800/60 rounded-xl p-1.5"><p class="text-[8px] text-gray-400 mb-0.5">Bunga</p><p class="text-[10px] font-bold text-gray-700 dark:text-obsidian-200">${this.rp(a.bunga)}</p></div>
                    <div class="bg-white/70 dark:bg-obsidian-800/60 rounded-xl p-1.5"><p class="text-[8px] text-gray-400 mb-0.5">Total</p><p class="text-[10px] font-bold text-gray-800 dark:text-obsidian-100">${this.rp(a.total)}</p></div>
                </div>
                ${receiptBtn}
            </div>`;
        }).join('');
    },


    toggleNotifications() {
        const overlay = document.getElementById('notif-overlay');
        const panel = document.getElementById('notif-panel');
        if (overlay.classList.contains('hidden')) {
            overlay.classList.remove('hidden');
            setTimeout(() => panel.classList.remove('translate-y-full'), 10);
        } else {
            panel.classList.add('translate-y-full');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }
    },

    renderNotifications() {
        const list = document.getElementById('notif-list');
        const badge = document.getElementById('notif-badge');
        if (!list) return;

        const data = this.notifications;

        if (!data || data.length === 0) {
            list.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-center">
                    <i class="bi bi-bell-slash text-4xl text-gray-200 mb-4"></i>
                    <p class="text-sm font-medium text-gray-500">Belum ada notifikasi baru</p>
                </div>`;
            if (badge) badge.classList.add('hidden');
            return;
        }

        if (badge) {
            badge.textContent = data.length;
            badge.classList.remove('hidden');
        }

        list.innerHTML = data.map(n => `
            <div class="flex items-start gap-4 p-4 ${n.bg} dark:bg-obsidian-800/40 rounded-2xl border border-gray-100 dark:border-obsidian-800 transition-all hover:shadow-md cursor-pointer group" onclick="Portal.handleNotifClick('${n.type}', '${n.key}')">
                <div class="w-10 h-10 rounded-xl bg-white dark:bg-obsidian-900 flex items-center justify-center shrink-0 border border-gray-50 dark:border-obsidian-700 shadow-sm mt-0.5">
                    <i class="bi ${n.icon} ${n.color} text-lg"></i>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-start mb-0.5">
                        <p class="text-xs font-bold text-gray-900 dark:text-obsidian-100">${n.title}</p>
                        <p class="text-[9px] text-gray-400 dark:text-obsidian-500 whitespace-nowrap ml-2">${this.timeSince(n.raw_date)}</p>
                    </div>
                    <p class="text-xs font-semibold text-gray-700 dark:text-obsidian-300 leading-snug mb-1">${n.message}</p>
                    <p class="text-[10px] text-gray-500 dark:text-obsidian-500 truncate">${n.sub_message}</p>
                </div>
            </div>
        `).join('');
    },

    handleNotifClick(type, key) {
        // Mark as read
        if (key) {
            let readKeys = JSON.parse(localStorage.getItem('kop_notif_read') || '[]');
            if (!readKeys.includes(key)) {
                readKeys.push(key);
                if (readKeys.length > 50) readKeys.shift(); // Keep max 50 history
                localStorage.setItem('kop_notif_read', JSON.stringify(readKeys));
            }
            // Remove instantly from view
            this.notifications = this.notifications.filter(n => n.key !== key);
            this.renderNotifications();
        }

        this.toggleNotifications();
        if (type === 'loan') this.tab('pinjaman');
        if (type === 'savings') this.tab('simpanan');
    },
    flipCard() {
        const card = document.querySelector('.flip-card');
        if (card) {
            card.classList.toggle('flipped');
            if (card.classList.contains('flipped')) {
                this.generateQRCode();
            }
        }
    },
    async generateQRCode() {
        const container = document.getElementById('p-qrcode');
        if (!container || container.innerHTML.trim() || !this.member) return;

        if (typeof QRCode === 'undefined') {
            container.innerHTML = '<div class="py-4 text-center"><i class="ri-loader-4-line animate-spin text-xl text-blue-500"></i></div>';
            try {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js');
                container.innerHTML = '';
            } catch (e) {
                container.innerHTML = '<p class="text-[10px] text-rose-500 font-semibold">Gagal memuat QR</p>';
                return;
            }
        }

        new QRCode(container, {
            text: this.member.no_anggota,
            width: 110,
            height: 110,
            colorDark: "#0f172a",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    },
    getGreeting() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 11) return { text: 'Selamat Pagi', icon: 'bi-brightness-alt-high text-amber-500' };
        if (hour >= 11 && hour < 15) return { text: 'Selamat Siang', icon: 'bi-brightness-high text-yellow-500' };
        if (hour >= 15 && hour < 18) return { text: 'Selamat Sore', icon: 'bi-cloud-sun text-orange-400' };
        return { text: 'Selamat Malam', icon: 'bi-moon-stars text-indigo-400' };
    },
    async simulateNFC() {
        Swal.fire({
            title: 'Mencari Perangkat NFC...',
            html: '<div class="py-6"><div class="relative w-24 h-24 mx-auto mb-4"><div class="absolute inset-0 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div><div class="absolute inset-4 bg-blue-500/20 rounded-full flex items-center justify-center"><i class="bi bi-phone-vibrate text-3xl text-blue-600 animate-bounce"></i></div></div><p class="text-sm text-gray-600">Tempelkan ponsel Anda ke alat pembaca di kantor koperasi.</p></div>',
            showConfirmButton: false,
            timer: 3500,
            timerProgressBar: true,
            customClass: { popup: 'rounded-3xl' }
        }).then((result) => {
            if (result.dismiss === Swal.DismissReason.timer) {
                Swal.fire({
                    title: 'Berhasil Diverifikasi!',
                    text: 'Identitas Anggota valid. Selamat datang!',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false,
                    customClass: { popup: 'rounded-3xl' }
                });
            }
        });
    },

    openModal(id) {
        const wrapper = document.getElementById(id);
        if (!wrapper) return;
        wrapper.classList.add('visible');
        const overlay = wrapper.querySelector('.modal-sheet-overlay');
        const panel = wrapper.querySelector('.modal-sheet-panel');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                if (overlay) overlay.classList.add('open');
                if (panel) panel.classList.add('open');
            });
        });
    },

    closeModal(id) {
        const wrapper = document.getElementById(id);
        if (!wrapper) return;
        const overlay = wrapper.querySelector('.modal-sheet-overlay');
        const panel = wrapper.querySelector('.modal-sheet-panel');
        if (overlay) overlay.classList.remove('open');
        if (panel) panel.classList.remove('open');
        setTimeout(() => wrapper.classList.remove('visible'), 380);
    },

    timeSince(date) {
        const dt = this.parseDate(date);
        if (!dt) return 'baru saja';
        const seconds = Math.floor((new Date() - dt) / 1000);
        if (isNaN(seconds) || seconds < 0) return 'baru saja';
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "th";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "bln";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "h";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "j";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m";
        return "baru saja";
    },
    async loadPengajuanPinjaman() {
        const form = document.getElementById('p-form-pengajuan-pinjaman');
        const selJenis = document.getElementById('p-sim-jenis');
        const inpNominal = document.getElementById('p-sim-nominal');
        const inpTenor = document.getElementById('p-sim-tenor');
        const txtTujuan = document.getElementById('p-sim-tujuan');
        const btnSubmit = document.getElementById('p-btn-submit-loan');
        const alertBox = document.getElementById('p-sim-alert');
        const resultBox = document.getElementById('p-sim-result');
        const hintNominal = document.getElementById('p-sim-limit-hint');

        if (!form) return;

        let loanConfig = [];

        // Reset state
        form.reset();
        resultBox.classList.add('hidden');
        alertBox.classList.add('hidden');
        btnSubmit.disabled = true;

        // Load Jenis Pinjaman Options
        try {
            const res = await this.api('portal/jenis-pinjaman');
            loanConfig = res.data || [];

            selJenis.innerHTML = '<option value="" disabled selected>Pilih salah satu...</option>';
            loanConfig.forEach(j => {
                const opt = document.createElement('option');
                opt.value = j.id;
                opt.textContent = `${j.nama} (Bunga ${j.bunga_persen}%/bln)`;
                selJenis.appendChild(opt);
            });
        } catch (e) {
            alertBox.className = 'text-xs px-4 py-3 rounded-xl border bg-red-50 text-red-600 border-red-200 mt-4';
            alertBox.innerHTML = '<i class="bi bi-exclamation-triangle mr-1"></i> Gagal memuat jenis pinjaman.';
            alertBox.classList.remove('hidden');
        }

        // Format Nominal (Rp) Input Realtime
        inpNominal.addEventListener('input', (e) => {
            let val = e.target.value.replace(/\D/g, "");
            if (val !== "") {
                e.target.value = parseInt(val).toLocaleString("id-ID");
            }
            debouncedSimulate();
        });

        // Interaction Listeners
        selJenis.addEventListener('change', () => {
            const selected = loanConfig.find(l => l.id == selJenis.value);
            if (selected) {
                hintNominal.innerHTML = `Maks. <span class="font-bold">Rp ${parseInt(selected.maksimal_pinjaman).toLocaleString('id-ID')}</span> | Tenor maks. <span class="font-bold">${selected.tenor_maksimal}</span> bln`;
                hintNominal.classList.add('text-blue-600');
            }
            debouncedSimulate();
        });

        inpTenor.addEventListener('input', () => debouncedSimulate());

        // Auto Simulation Logic
        let simTimeout;
        const debouncedSimulate = () => {
            clearTimeout(simTimeout);
            btnSubmit.disabled = true;
            alertBox.classList.add('hidden');

            const jenisId = selJenis.value;
            const nominal = inpNominal.value.replace(/\D/g, "");
            const tenor = inpTenor.value;

            if (!jenisId || !nominal || !tenor || tenor < 1) {
                resultBox.classList.add('hidden');
                return;
            }

            simTimeout = setTimeout(async () => {
                try {
                    const res = await this.api('portal/simulate-loan', {
                        method: 'POST',
                        body: { jenis_pinjaman_id: jenisId, jumlah: nominal, tenor: tenor }
                    });

                    if (!res) {
                        alertBox.className = 'text-xs px-4 py-3 rounded-xl border bg-rose-50 text-rose-700 border-rose-200 mt-2';
                        alertBox.innerHTML = '<i class="bi bi-x-circle mr-1"></i> Gagal menghubungi server, coba lagi.';
                        alertBox.classList.remove('hidden');
                        return;
                    }

                    const resultBox = document.getElementById('p-sim-result');
                    const existingBox = document.getElementById('p-sim-existing');
                    
                    if (res.success) {
                        if (res.data.has_existing) {
                            // Show existing loan info and hide simulation result
                            resultBox.classList.add('hidden');
                            existingBox.classList.remove('hidden');
                            
                            const ex = res.data.existing;
                            document.getElementById('se-no').textContent = ex.no_pinjaman;
                            document.getElementById('se-status').textContent = 'Status: ' + (ex.status === 'pending' ? 'Dalam Proses' : 'Aktif');
                            document.getElementById('se-jumlah').textContent = `Rp ${ex.jumlah.toLocaleString('id-ID')}`;
                            document.getElementById('se-sisa').textContent = `Rp ${ex.sisa.toLocaleString('id-ID')}`;
                            
                            btnSubmit.disabled = true;
                            alertBox.classList.add('hidden');
                        } else {
                            existingBox.classList.add('hidden');
                            const setVal = (id, val) => {
                                const el = document.getElementById(id);
                                if (el) el.textContent = val;
                            };

                            setVal('sr-pokok', `Rp ${res.data.estimasi_pokok.toLocaleString('id-ID')}`);
                            setVal('sr-bunga', `Rp ${res.data.estimasi_bunga.toLocaleString('id-ID')}`);
                            setVal('sr-angsuran', `Rp ${res.data.estimasi_angsuran.toLocaleString('id-ID')}`);
                            setVal('sr-total-bunga', `Rp ${res.data.total_bunga ? res.data.total_bunga.toLocaleString('id-ID') : '0'}`);
                            setVal('sr-total-bayar', `Rp ${res.data.total_bayar ? res.data.total_bayar.toLocaleString('id-ID') : '0'}`);

                            resultBox.classList.remove('hidden');
                            alertBox.classList.add('hidden');

                            // Enable Submit if everything is filled
                            if (txtTujuan.value.trim().length > 3) {
                                btnSubmit.disabled = false;
                            }
                        }
                    } else {
                        resultBox.classList.add('hidden');
                        existingBox.classList.add('hidden');
                        alertBox.className = 'text-xs px-4 py-3 rounded-xl border bg-amber-50 text-amber-700 border-amber-200 mt-2';
                        alertBox.innerHTML = `<i class="bi bi-info-circle mr-1"></i> ${res.message}`;
                        alertBox.classList.remove('hidden');
                    }
                } catch (e) {
                    console.error('Simulation error:', e);
                }
            }, 500); // 500ms debounce
        };

        // Validate textarea before enabling submit
        txtTujuan.addEventListener('input', () => {
            if (resultBox.classList.contains('hidden') === false && txtTujuan.value.trim().length > 3) {
                btnSubmit.disabled = false;
            } else {
                btnSubmit.disabled = true;
            }
        });

        // Submit Form Logic
        btnSubmit.onclick = async () => {
            const originalBtnText = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Mengirim...';
            btnSubmit.disabled = true;

            try {
                const res = await this.api('portal/submit-loan', {
                    method: 'POST',
                    body: {
                        jenis_pinjaman_id: selJenis.value,
                        jumlah: inpNominal.value.replace(/\D/g, ""),
                        tenor: inpTenor.value,
                        tujuan: txtTujuan.value
                    }
                });

                alertBox.classList.remove('hidden');
                if (res.success) {
                    alertBox.className = 'text-xs px-4 py-3 rounded-xl border bg-emerald-50 text-emerald-700 border-emerald-200 mt-2';
                    alertBox.innerHTML = '<i class="bi bi-check-circle-fill mr-1"></i> ' + res.message;

                    // Clear form
                    form.reset();
                    resultBox.classList.add('hidden');

                    // Redirect to pinjaman tab after 2s
                    setTimeout(() => {
                        this.tab('pinjaman');
                    }, 2000);
                } else {
                    alertBox.className = 'text-xs px-4 py-3 rounded-xl border bg-red-50 text-red-600 border-red-200 mt-2';
                    alertBox.innerHTML = '<i class="bi bi-exclamation-triangle mr-1"></i> ' + res.message;
                    btnSubmit.disabled = false;
                }
            } catch (e) {
                alertBox.className = 'text-xs px-4 py-3 rounded-xl border bg-red-50 text-red-600 border-red-200 mt-2';
                alertBox.innerHTML = '<i class="bi bi-exclamation-triangle mr-1"></i> Terjadi kesalahan koneksi.';
                alertBox.classList.remove('hidden');
                btnSubmit.disabled = false;
            }

            btnSubmit.innerHTML = originalBtnText;
        };
    },

    async loadLaporan() {
        const loading = document.getElementById('p-lap-loading');
        const content = document.getElementById('p-lap-content');
        const errorBox = document.getElementById('p-lap-error');

        if (!loading || !content) return;

        loading.classList.remove('hidden');
        content.classList.add('hidden');
        errorBox.classList.add('hidden');

        try {
            const res = await this.api('portal/laporan-genggaman');
            if (res.success) {
                const data = res.data;

                document.getElementById('p-lap-aset').textContent = this.rp(data.total_aset);
                document.getElementById('p-lap-simpanan').textContent = this.rp(data.rincian_aset.simpanan);
                document.getElementById('p-lap-shu').textContent = this.rp(data.rincian_aset.shu);
                document.getElementById('p-lap-kewajiban').textContent = this.rp(data.total_kewajiban);
                const syncDt = this.parseDate(data.last_sync);
                document.getElementById('p-lap-time').textContent = syncDt ? syncDt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-';

                // Hitung Rasio Kesehatan
                const total = data.total_aset + data.total_kewajiban;
                let pctAset = 100;
                let pctKewajiban = 0;

                if (total > 0) {
                    pctAset = (data.total_aset / total) * 100;
                    pctKewajiban = (data.total_kewajiban / total) * 100;
                } else if (data.total_aset === 0 && data.total_kewajiban > 0) {
                    pctAset = 0;
                    pctKewajiban = 100;
                } else if (data.total_aset === 0 && data.total_kewajiban === 0) {
                    pctAset = 100;
                    pctKewajiban = 0;
                }

                // Update Bar width (animate small delay)
                setTimeout(() => {
                    const barAset = document.getElementById('p-lap-bar-aset');
                    const barKewajiban = document.getElementById('p-lap-bar-kewajiban');

                    // Adjust for visuals if zero
                    barAset.style.width = pctAset > 0 ? Math.max(pctAset, 2) + '%' : '0%';
                    barKewajiban.style.width = pctKewajiban > 0 ? Math.max(pctKewajiban, 2) + '%' : '0%';

                    document.getElementById('p-lap-pct-aset').textContent = `Aset ${Math.round(pctAset)}%`;
                    document.getElementById('p-lap-pct-kewajiban').textContent = `Kewajiban ${Math.round(pctKewajiban)}%`;
                }, 50);

                loading.classList.add('hidden');
                content.classList.remove('hidden');
            } else {
                throw new Error(res.message);
            }
        } catch (e) {
            loading.classList.add('hidden');
            errorBox.classList.remove('hidden');
            console.error('Laporan error:', e);
        }
    },

    async downloadStatement(type) {
        if (!this.currentData || !this.currentData.items || this.currentData.items.length === 0) {
            Swal.fire('Info', 'Tidak ada data untuk diunduh', 'info');
            return;
        }

        Swal.fire({
            title: 'Menyiapkan PDF...',
            html: 'Mohon tunggu sebentar',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const data = this.currentData;
        const member = this.member;
        const isSimpanan = data.type === 'simpanan';

        // Create temporary container for PDF
        const container = document.createElement('div');
        container.style.padding = '40px';
        container.style.color = '#1f2937';
        container.style.fontFamily = "'Plus Jakarta Sans', sans-serif";

        const itemsHtml = data.items.map((item, index) => {
            if (isSimpanan) {
                return `
                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px;">${this.fdate(item.tgl_transaksi)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px;">
                        <div style="font-weight: bold;">${item.nama_transaksi}</div>
                        <div style="font-size: 9px; color: #6b7280;">${item.keterangan || '-'}</div>
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px; text-align: right; color: ${item.dk === 'D' ? '#059669' : '#dc2626'}">
                        ${item.dk === 'D' ? '+' : '-'}${this.rp(item.jumlah)}
                    </td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px; text-align: right; font-weight: bold;">
                        ${this.rp(item.saldo_sesudah)}
                    </td>
                </tr>`;
            } else {
                const isLunas = item.status === 'lunas';
                return `
                <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'};">
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px; text-align: center;">${item.angsuran_ke}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px;">${this.fdate(item.tgl_jatuh_tempo)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px; text-align: right;">${this.rp(item.pokok)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px; text-align: right;">${this.rp(item.bunga)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px; text-align: right; font-weight: bold;">${this.rp(item.total)}</td>
                    <td style="padding: 10px; border-bottom: 1px solid #e5e7eb; font-size: 10px; text-align: center;">
                        <span style="padding: 2px 8px; border-radius: 99px; font-size: 8px; font-weight: bold; background-color: ${isLunas ? '#d1fae5' : '#fee2e2'}; color: ${isLunas ? '#065f46' : '#991b1b'};">
                            ${item.status.toUpperCase()}
                        </span>
                    </td>
                </tr>`;
            }
        }).join('');

        const brandingHtml = this.logoUrl 
            ? `<img src="${this.API.replace(/\/api\/?$/, '')}/${this.logoUrl}" style="width: 50px; height: 50px; object-contain; border-radius: 12px;">`
            : `<div style="width: 50px; height: 50px; background: #4f46e5; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 24px;">${(this.pwaName || 'K').charAt(0).toUpperCase()}</div>`;

        container.innerHTML = `
            <div style="border-bottom: 3px double #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 15px;">
                    ${brandingHtml}
                    <div>
                        <h1 style="margin: 0; font-size: 20px; font-weight: 900; color: #111827; letter-spacing: -0.5px;">${(this.pwaName || 'KOPERASI KARYAWAN').toUpperCase()}</h1>
                        <p style="margin: 0; font-size: 10px; color: #6b7280; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;">Member Financial Statement</p>
                    </div>
                </div>
                <div style="text-align: right;">
                    <p style="margin: 0; font-size: 10px; color: #9ca3af; font-weight: bold;">${data.header.sub}</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 900; color: #111827;">${data.header.judul}</p>
                    ${data.header.period ? `<p style="margin: 0; font-size: 9px; color: #6b7280; font-weight: bold;">Periode: ${data.header.period}</p>` : ''}
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px;">
                <div style="background: #f8fafc; padding: 20px; border-radius: 20px; border: 1px solid #f1f5f9;">
                    <p style="margin: 0 0 10px 0; font-size: 10px; color: #94a3b8; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Informasi Anggota</p>
                    <table style="width: 100%; font-size: 11px; border-collapse: collapse;">
                        <tr><td style="padding: 4px 0; color: #64748b;">No. Anggota</td><td style="padding: 4px 0; font-weight: 800; text-align: right;">${member.no_anggota}</td></tr>
                        <tr><td style="padding: 4px 0; color: #64748b;">Nama Lengkap</td><td style="padding: 4px 0; font-weight: 800; text-align: right;">${member.nama}</td></tr>
                        <tr><td style="padding: 4px 0; color: #64748b;">No. Rekening</td><td style="padding: 4px 0; font-weight: 800; text-align: right;">${data.header.no || '-'}</td></tr>
                    </table>
                </div>
                <div style="background: #4f46e5; color: white; padding: 20px; border-radius: 20px; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.2);">
                    <p style="margin: 0 0 10px 0; font-size: 10px; color: rgba(255,255,255,0.7); font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
                        ${isSimpanan ? 'Saldo Saat Ini' : 'Sisa Kewajiban'}
                    </p>
                    <h2 style="margin: 0; font-size: 24px; font-weight: 900;">${this.rp(isSimpanan ? data.header.saldo : data.header.sisa)}</h2>
                    <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; font-size: 9px; font-weight: bold; opacity: 0.8;">
                        <span>Dicetak Pada</span>
                        <span>${new Date().toLocaleString('id-ID')}</span>
                    </div>
                </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        ${isSimpanan ? `
                            <th style="padding: 12px 10px; text-align: left; font-size: 10px; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Tanggal</th>
                            <th style="padding: 12px 10px; text-align: left; font-size: 10px; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Keterangan</th>
                            <th style="padding: 12px 10px; text-align: right; font-size: 10px; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Mutasi</th>
                            <th style="padding: 12px 10px; text-align: right; font-size: 10px; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Saldo</th>
                        ` : `
                            <th style="padding: 12px 10px; text-align: center; font-size: 10px; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Ke</th>
                            <th style="padding: 12px 10px; text-align: left; font-size: 10px; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Jatuh Tempo</th>
                            <th style="padding: 12px 10px; text-align: right; font-size: 10px; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Pokok</th>
                            <th style="padding: 12px 10px; text-align: right; font-size: 10px; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Bunga</th>
                            <th style="padding: 12px 10px; text-align: right; font-size: 10px; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Total</th>
                            <th style="padding: 12px 10px; text-align: center; font-size: 10px; color: #475569; text-transform: uppercase; border-bottom: 2px solid #e2e8f0;">Status</th>
                        `}
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>

            <div style="margin-top: 50px; text-align: center; border-top: 1px solid #f1f5f9; pt-10;">
                <p style="font-size: 9px; color: #94a3b8; font-weight: 500;">Dokumen ini dihasilkan secara otomatis oleh Portal Anggota Digital Koperasi.<br>Dicetak oleh ${member.nama} pada ${new Date().toLocaleString('id-ID')}.</p>
            </div>
        `;

        const opt = {
            margin: 0,
            filename: `${data.header.sub}_${member.no_anggota}_${Date.now()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        if (typeof html2pdf === 'undefined') {
            try {
                await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js');
            } catch (err) {
                Swal.fire('Error', 'Gagal memuat modul generator PDF: ' + err.message, 'error');
                return;
            }
        }

        try {
            const worker = html2pdf().set(opt).from(container);
            const blobUrl = await worker.output('bloburl');
            window.open(blobUrl, '_blank');
            
            Swal.close();
        } catch (error) {
            console.error('PDF Generation failed:', error);
            Swal.fire('Error', 'Gagal membuat PDF. Silakan coba lagi.', 'error');
        }
    },

    initSplashTheme() {
        const hour = new Date().getHours();
        const splash = document.getElementById('initial-splash');
        if (!splash) return;

        // 1. Dynamic Background
        if (hour >= 5 && hour < 11) splash.classList.add('bg-morning');
        else if (hour >= 11 && hour < 15) splash.classList.add('bg-day');
        else if (hour >= 15 && hour < 18) splash.classList.add('bg-evening');
        else splash.classList.add('bg-night');

        // 2. Financial Wisdom / Tips
        const tips = [
            "Menyisihkan 10% penghasilan secara rutin dapat memperkuat dana darurat Anda.",
            "Gunakan fitur Simulasi Pinjaman untuk merencanakan keuangan dengan lebih bijak.",
            "Keamanan akun adalah tanggung jawab bersama. Ganti password Anda secara berkala.",
            "Simpanan Wajib yang rutin adalah bentuk investasi jangka panjang bagi masa depan Anda.",
            "Portal ini memudahkan Anda memantau saldo secara real-time, kapan pun dan di mana pun.",
            "Tahukah Anda? Bunga simpanan di koperasi seringkali lebih kompetitif dibanding bank umum.",
            "Kedisiplinan dalam mengangsur pinjaman membantu meningkatkan skor kesehatan finansial Anda."
        ];
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        const tipEl = document.getElementById('splash-tip');
        if (tipEl) tipEl.textContent = randomTip;
    },

    // ══════════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════
    // MODUL: TRANSPARANSI & KESEHATAN KOPERASI
    // ══════════════════════════════════════════════════════════════
    async loadTransparansiBanner() {
        try {
            const res = await this.api('portal/transparansi-kesehatan');
            if (res?.success && res.data) {
                this.kesehatanData = res.data;
                this.updateTransparansiBanner(res.data);
            }
        } catch (e) {
            console.warn('Gagal sinkronisasi banner kesehatan koperasi:', e);
        }
    },

    updateTransparansiBanner(d) {
        if (!d) return;
        const badge = document.getElementById('banner-transparansi-badge');
        const desc = document.getElementById('banner-transparansi-desc');
        const icon = document.getElementById('banner-transparansi-icon');
        const banner = document.getElementById('banner-transparansi');

        if (badge) {
            badge.className = `px-2 py-0.5 rounded-full ${d.badge_color || 'bg-emerald-400 text-gray-900'} text-[8px] font-black uppercase tracking-wider`;
            badge.textContent = d.badge_label || (d.predikat ? d.predikat.toUpperCase() : 'SEHAT');
        }
        if (desc) {
            desc.textContent = `Skor KKPKK: ${d.skor_akhir}/100 · Predikat: ${d.predikat}`;
        }
        if (icon && d.icon) {
            icon.innerHTML = `<i class="bi ${d.icon}"></i>`;
        }
        if (banner && d.bg_gradient) {
            banner.className = `cursor-pointer bg-gradient-to-r ${d.bg_gradient} rounded-2xl p-4 text-white shadow-lg flex items-center justify-between transition-all active:scale-[0.98]`;
        }
    },

    async showTransparansiModal() {
        this.haptic('light');
        if (window.Swal) {
            Swal.fire({
                title: 'Memuat Transparansi...',
                html: '<div class="flex justify-center py-4"><i class="bi bi-arrow-repeat animate-spin text-3xl text-teal-500"></i></div>',
                allowOutsideClick: false,
                showConfirmButton: false,
                customClass: { popup: 'rounded-[2.5rem] dark:bg-obsidian-900 p-6' }
            });
        }

        const res = await this.api('portal/transparansi-kesehatan');
        if (window.Swal) Swal.close();

        if (!res?.success || !res.data) {
            if (window.Swal) {
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Memuat Data',
                    text: 'Informasi kepatuhan belum dapat diakses saat ini.',
                    confirmButtonColor: '#0d9488',
                    customClass: { popup: 'rounded-[2.5rem] dark:bg-obsidian-900 p-6' }
                });
            }
            return;
        }

        const d = res.data;
        this.kesehatanData = d;
        this.updateTransparansiBanner(d);

        const pilarHtml = d.pilar.map(p => `
            <div class="bg-gray-50 dark:bg-obsidian-800/50 p-3.5 rounded-2xl border border-gray-100 dark:border-obsidian-700/50 text-left">
                <div class="flex items-center justify-between mb-1.5">
                    <span class="text-xs font-bold text-gray-800 dark:text-obsidian-100">${p.nama}</span>
                    <span class="text-xs font-black text-teal-600 dark:text-teal-400">${p.skor} / ${p.bobot}</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-obsidian-700 h-2 rounded-full overflow-hidden mb-1">
                    <div class="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full" style="width: ${Math.min(100, (p.skor/p.bobot)*100)}%"></div>
                </div>
                <span class="text-[9px] text-gray-500 dark:text-obsidian-400 font-medium">${p.status}</span>
            </div>
        `).join('');

        const nplFormatted = d.indikator_publik.rasio_npl <= 5 ? `${d.indikator_publik.rasio_npl}% (Sehat)` : `${d.indikator_publik.rasio_npl}% (Perlu Perhatian)`;

        const publikHtml = `
            <div class="grid grid-cols-2 gap-2 text-left pt-2">
                <div class="bg-teal-50/60 dark:bg-teal-900/20 p-3 rounded-2xl border border-teal-100 dark:border-teal-800/40">
                    <p class="text-[9px] text-teal-700 dark:text-teal-300 font-bold uppercase tracking-wider">Total Aset Publik</p>
                    <p class="text-xs font-black text-teal-900 dark:text-teal-100 mt-0.5">${this.rp(d.indikator_publik.total_aset)}</p>
                </div>
                <div class="bg-blue-50/60 dark:bg-blue-900/20 p-3 rounded-2xl border border-blue-100 dark:border-blue-800/40">
                    <p class="text-[9px] text-blue-700 dark:text-blue-300 font-bold uppercase tracking-wider">Modal Sendiri</p>
                    <p class="text-xs font-black text-blue-900 dark:text-blue-100 mt-0.5">${this.rp(d.indikator_publik.modal_sendiri)}</p>
                </div>
                <div class="bg-emerald-50/60 dark:bg-emerald-900/20 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-800/40">
                    <p class="text-[9px] text-emerald-700 dark:text-emerald-300 font-bold uppercase tracking-wider">Anggota Aktif</p>
                    <p class="text-xs font-black text-emerald-900 dark:text-emerald-100 mt-0.5">${d.indikator_publik.total_anggota} Orang</p>
                </div>
                <div class="bg-purple-50/60 dark:bg-purple-900/20 p-3 rounded-2xl border border-purple-100 dark:border-purple-800/40">
                    <p class="text-[9px] text-purple-700 dark:text-purple-300 font-bold uppercase tracking-wider">Rasio NPL</p>
                    <p class="text-xs font-black text-purple-900 dark:text-purple-100 mt-0.5">${nplFormatted}</p>
                </div>
            </div>
        `;

        Swal.fire({
            title: '',
            html: `
                <div class="text-center pt-2">
                    <div class="w-14 h-14 bg-gradient-to-tr ${d.bg_gradient || 'from-emerald-500 to-teal-600'} rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-lg text-white text-2xl">
                        <i class="bi ${d.icon || 'bi-shield-check'}"></i>
                    </div>
                    <h3 class="text-lg font-black text-gray-900 dark:text-obsidian-100 tracking-tight leading-tight">${d.nama_koperasi}</h3>
                    <p class="text-[10px] text-gray-400 mt-0.5">Badan Hukum: ${d.no_badan_hukum}</p>

                    <!-- Health Score Hero Badge -->
                    <div class="my-4 p-4 rounded-3xl bg-gradient-to-br ${d.bg_gradient || 'from-emerald-500 to-teal-700'} text-white shadow-xl text-center relative overflow-hidden">
                        <span class="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-black tracking-widest uppercase mb-1">
                            PREDIKAT RESMI: ${d.predikat.toUpperCase()}
                        </span>
                        <h2 class="text-4xl font-black tracking-tight">${d.skor_akhir}<span class="text-lg font-medium opacity-80">/100</span></h2>
                        <p class="text-[10px] text-white/90 mt-1">${d.regulasi}</p>
                    </div>

                    <div class="space-y-2 text-left mb-3">
                        <p class="text-[11px] font-bold text-gray-700 dark:text-obsidian-300 uppercase tracking-wider flex items-center gap-1.5">
                            <i class="bi bi-bar-chart-fill text-teal-500"></i> Evaluasi 4 Aspek Kemenkop
                        </p>
                        ${pilarHtml}
                    </div>

                    <div class="text-left">
                        <p class="text-[11px] font-bold text-gray-700 dark:text-obsidian-300 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                            <i class="bi bi-pie-chart-fill text-indigo-500"></i> Indikator Keuangan Terbuka
                        </p>
                        ${publikHtml}
                    </div>
                </div>
            `,
            confirmButtonText: 'Tutup',
            confirmButtonColor: '#0d9488',
            customClass: {
                popup: 'rounded-[2.5rem] p-6 max-w-[440px] dark:bg-obsidian-900',
                confirmButton: 'rounded-xl w-full py-3 font-bold text-xs shadow-md'
            }
        });
    },

    // ══════════════════════════════════════════════════════════════
    // MODUL: PUSAT BANTUAN & ASPIRASI PENGAWAS
    // ══════════════════════════════════════════════════════════════
    async showBantuanAspirasiModal() {
        this.haptic('light');
        if (window.Swal) {
            Swal.fire({
                title: 'Memuat Informasi...',
                html: '<div class="flex justify-center py-4"><i class="bi bi-arrow-repeat animate-spin text-3xl text-rose-500"></i></div>',
                allowOutsideClick: false,
                showConfirmButton: false,
                customClass: { popup: 'rounded-[2.5rem] dark:bg-obsidian-900 p-6' }
            });
        }

        const res = await this.api('portal/bantuan-info');
        if (window.Swal) Swal.close();

        const info = res?.data || {
            wa_admin: '6281234567890',
            wa_pengawas: '6281987654321',
            email: 'support@koperasi.id',
            jam_operasional: 'Senin – Jumat 08.00 – 16.00 WIB',
            faqs: []
        };

        const faqItems = (info.faqs || []).map((f, idx) => `
            <details class="group bg-gray-50 dark:bg-obsidian-800/50 rounded-2xl p-3 border border-gray-100 dark:border-obsidian-700/50 text-left cursor-pointer">
                <summary class="text-xs font-bold text-gray-800 dark:text-obsidian-200 list-none flex justify-between items-center">
                    <span>${idx+1}. ${f.q}</span>
                    <i class="bi bi-chevron-down text-gray-400 group-open:rotate-180 transition-transform text-[10px]"></i>
                </summary>
                <p class="text-[11px] text-gray-600 dark:text-obsidian-400 mt-2 leading-relaxed border-t border-gray-100 dark:border-obsidian-700/40 pt-2">${f.a}</p>
            </details>
        `).join('');

        Swal.fire({
            title: '',
            html: `
                <div class="text-center pt-2">
                    <div class="w-14 h-14 bg-gradient-to-tr from-rose-500 to-pink-600 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-pink-500/30 text-white text-2xl">
                        <i class="bi bi-headset"></i>
                    </div>
                    <h3 class="text-lg font-black text-gray-900 dark:text-obsidian-100 tracking-tight leading-tight">Pusat Bantuan & Aspirasi</h3>
                    <p class="text-[10px] text-gray-400 mt-0.5">Layanan bantuan resmi pengurus dan pengawas koperasi</p>

                    <!-- Action Cards -->
                    <div class="grid grid-cols-2 gap-2 my-4">
                        <a href="https://wa.me/${info.wa_admin}?text=Halo%20Admin%20Koperasi,%20saya%20anggota%20dengan%20No%20${this.member?.no_anggota || ''}" target="_blank" class="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200/60 dark:border-emerald-800/40 rounded-2xl text-left block active:scale-95 transition-all">
                            <div class="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-sm mb-2 shadow-sm">
                                <i class="bi bi-whatsapp"></i>
                            </div>
                            <h4 class="text-xs font-bold text-emerald-900 dark:text-emerald-100 leading-tight">Admin & Kasir</h4>
                            <p class="text-[9px] text-emerald-600 dark:text-emerald-400 mt-0.5">Chat cepat WA</p>
                        </a>
                        <a href="https://wa.me/${info.wa_pengawas}?text=Halo%20Badan%20Pengawas%20Koperasi,%20saya%20anggota%20No%20${this.member?.no_anggota || ''}" target="_blank" class="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200/60 dark:border-purple-800/40 rounded-2xl text-left block active:scale-95 transition-all">
                            <div class="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center text-sm mb-2 shadow-sm">
                                <i class="bi bi-shield-lock-fill"></i>
                            </div>
                            <h4 class="text-xs font-bold text-purple-900 dark:text-purple-100 leading-tight">Dewan Pengawas</h4>
                            <p class="text-[9px] text-purple-600 dark:text-purple-400 mt-0.5">Kontak independen</p>
                        </a>
                    </div>

                    <!-- Kirim Aspirasi Button -->
                    <button onclick="Portal.openFormAspirasi()" class="w-full py-3 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-pink-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 mb-2.5">
                        <i class="bi bi-envelope-paper-heart-fill"></i> Kirim Aspirasi / Pengaduan ke Pengawas
                    </button>

                    <!-- Riwayat Aspirasi Button -->
                    <button onclick="Portal.openRiwayatAspirasi()" class="w-full py-2 bg-gray-100 dark:bg-obsidian-800 text-gray-700 dark:text-obsidian-300 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-all mb-4 flex items-center justify-center gap-1.5">
                        <i class="bi bi-clock-history"></i> Lihat Riwayat Aspirasi Saya
                    </button>

                    <!-- FAQ Accordion -->
                    <div class="space-y-2 text-left">
                        <p class="text-[11px] font-bold text-gray-700 dark:text-obsidian-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                            <i class="bi bi-question-circle-fill text-rose-500"></i> Pertanyaan Sering Diajukan (FAQ)
                        </p>
                        ${faqItems}
                    </div>
                </div>
            `,
            showConfirmButton: false,
            showCloseButton: true,
            customClass: {
                popup: 'rounded-[2.5rem] p-6 max-w-[440px] dark:bg-obsidian-900'
            }
        });
    },

    openFormAspirasi() {
        this.haptic('light');
        Swal.fire({
            title: 'Kirim Aspirasi Pengawas',
            html: `
                <div class="space-y-3.5 text-left pt-2">
                    <p class="text-xs text-gray-500 dark:text-obsidian-400">Pesan ini diteruskan langsung ke Badan Pengawas Koperasi untuk evaluasi tata kelola.</p>
                    <div>
                        <label class="block text-[11px] font-bold text-gray-700 dark:text-obsidian-300 mb-1">Kategori</label>
                        <select id="asp-kategori" class="w-full bg-gray-50 dark:bg-obsidian-800 border border-gray-200 dark:border-obsidian-700 rounded-xl px-3 py-2.5 text-xs text-gray-800 dark:text-obsidian-200 focus:outline-none focus:ring-2 focus:ring-rose-500">
                            <option value="usulan">💡 Usulan & Saran Kemajuan</option>
                            <option value="pelayanan">🤝 Pelayanan Petugas & Kasir</option>
                            <option value="keuangan">💰 Transparansi & Keuangan</option>
                            <option value="pengawas">⚖️ Pengawasan Kebijakan Pengurus</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-gray-700 dark:text-obsidian-300 mb-1">Judul / Subjek</label>
                        <input type="text" id="asp-judul" placeholder="Contoh: Usul penambahan produk sembako..." class="w-full bg-gray-50 dark:bg-obsidian-800 border border-gray-200 dark:border-obsidian-700 rounded-xl px-3 py-2.5 text-xs text-gray-800 dark:text-obsidian-200 focus:outline-none focus:ring-2 focus:ring-rose-500">
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-gray-700 dark:text-obsidian-300 mb-1">Isi Pesan Aspirasi</label>
                        <textarea id="asp-pesan" rows="4" placeholder="Tuliskan aspirasi, kritik konstruktif, atau pengaduan Anda secara rinci..." class="w-full bg-gray-50 dark:bg-obsidian-800 border border-gray-200 dark:border-obsidian-700 rounded-xl p-3 text-xs text-gray-800 dark:text-obsidian-200 focus:outline-none focus:ring-2 focus:ring-rose-500"></textarea>
                    </div>
                    <div class="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-obsidian-800 rounded-xl border border-gray-100 dark:border-obsidian-700">
                        <input type="checkbox" id="asp-anonim" class="w-4 h-4 rounded text-rose-600 focus:ring-rose-500">
                        <label for="asp-anonim" class="text-[11px] text-gray-700 dark:text-obsidian-300 font-medium cursor-pointer">
                            Kirim sebagai <strong class="text-rose-600">Anonim</strong> (Nama saya dirahasiakan)
                        </label>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Kirim Sekarang',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#94a3b8',
            customClass: {
                popup: 'rounded-[2.5rem] p-6 max-w-[420px] dark:bg-obsidian-900',
                confirmButton: 'rounded-xl px-5 py-2.5 font-bold text-xs shadow-md',
                cancelButton: 'rounded-xl px-5 py-2.5 font-bold text-xs'
            },
            preConfirm: () => {
                const kategori = document.getElementById('asp-kategori').value;
                const judul = document.getElementById('asp-judul').value.trim();
                const pesan = document.getElementById('asp-pesan').value.trim();
                const is_anonim = document.getElementById('asp-anonim').checked ? 1 : 0;

                if (!judul || !pesan) {
                    Swal.showValidationMessage('Judul dan isi aspirasi tidak boleh kosong');
                    return false;
                }
                return { kategori, judul, pesan, is_anonim };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: 'Mengirim Aspirasi...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading(),
                    customClass: { popup: 'rounded-[2rem] dark:bg-obsidian-900' }
                });

                const res = await this.api('portal/aspirasi', {
                    method: 'POST',
                    body: result.value
                });

                if (res?.success) {
                    Swal.fire({
                        icon: 'success',
                        title: 'Aspirasi Terkirim!',
                        text: `Nomor Tiket Anda: ${res.data?.no_tiket || '-'}. Pesan Anda telah disampaikan ke Dewan Pengawas.`,
                        confirmButtonColor: '#e11d48',
                        customClass: { popup: 'rounded-[2rem] dark:bg-obsidian-900' }
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal Mengirim',
                        text: res?.message || 'Terjadi kesalahan sistem.',
                        confirmButtonColor: '#e11d48',
                        customClass: { popup: 'rounded-[2rem]' }
                    });
                }
            }
        });
    },

    async openRiwayatAspirasi() {
        this.haptic('light');
        Swal.fire({
            title: 'Memuat Riwayat...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            customClass: { popup: 'rounded-[2rem] dark:bg-obsidian-900' }
        });

        const res = await this.api('portal/aspirasi');
        Swal.close();

        const list = res?.data || [];
        if (list.length === 0) {
            Swal.fire({
                title: 'Riwayat Aspirasi',
                html: '<div class="text-center py-6 text-gray-400"><i class="bi bi-inbox text-3xl block mb-2"></i>Anda belum pernah mengirim aspirasi/pengaduan.</div>',
                confirmButtonText: 'Tutup',
                confirmButtonColor: '#e11d48',
                customClass: { popup: 'rounded-[2.5rem] p-6 max-w-[420px] dark:bg-obsidian-900' }
            });
            return;
        }

        const itemsHtml = list.map(item => {
            const statusBadge = item.status === 'dijawab' 
                ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">Dijawab</span>'
                : (item.status === 'ditinjau' 
                    ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700">Ditinjau</span>'
                    : '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-100 text-blue-700">Terkirim</span>');
            return `
            <div class="bg-gray-50 dark:bg-obsidian-800/60 p-3.5 rounded-2xl border border-gray-100 dark:border-obsidian-700 text-left">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-[10px] font-mono font-bold text-gray-500">${item.no_tiket}</span>
                    ${statusBadge}
                </div>
                <h4 class="text-xs font-bold text-gray-900 dark:text-obsidian-100">${item.judul}</h4>
                <p class="text-[11px] text-gray-600 dark:text-obsidian-300 mt-1 line-clamp-2">${item.pesan}</p>
                ${item.tanggapan ? `
                <div class="mt-2.5 p-2.5 bg-emerald-50/80 dark:bg-emerald-900/30 rounded-xl border border-emerald-100 dark:border-emerald-800/50">
                    <p class="text-[9px] font-bold text-emerald-800 dark:text-emerald-300 mb-0.5">Tanggapan Pengawas:</p>
                    <p class="text-[10px] text-emerald-700 dark:text-emerald-200 leading-relaxed">${item.tanggapan}</p>
                </div>` : ''}
                <div class="flex items-center justify-between text-[9px] text-gray-400 mt-2">
                    <span class="capitalize">Kategori: ${item.kategori}</span>
                    <span>${this.fdate(item.created_at)}</span>
                </div>
            </div>`;
        }).join('');

        Swal.fire({
            title: 'Riwayat Aspirasi',
            html: `
                <div class="max-h-[360px] overflow-y-auto space-y-2.5 custom-scrollbar pr-1 pt-1">
                    ${itemsHtml}
                </div>
            `,
            confirmButtonText: 'Tutup',
            confirmButtonColor: '#e11d48',
            customClass: { popup: 'rounded-[2.5rem] p-6 max-w-[440px] dark:bg-obsidian-900' }
        });
    },

    // ══════════════════════════════════════════════════════════════
    // MODUL: EKOSISTEM RETAIL & TOKO KOPERASI
    // ══════════════════════════════════════════════════════════════
    tokoCart: [],
    tokoProdukList: [],
    tokoActiveKategori: 'Semua',

    async loadToko() {
        this.renderTokoCartBar();
        // Load Saldo Simpanan Sukarela
        const rSaldo = await this.api('portal/saldo');
        let saldoSukarela = 0;
        if (rSaldo?.success && Array.isArray(rSaldo.data)) {
            const ss = rSaldo.data.find(s => s.kode === 'SS' || (s.nama && s.nama.toLowerCase().includes('sukarela')));
            if (ss) saldoSukarela = parseFloat(ss.saldo) || 0;
        }
        const elSaldo = document.getElementById('toko-saldo-sukarela');
        if (elSaldo) elSaldo.textContent = this.rp(saldoSukarela);

        // Fetch Produk & Order History
        await this.fetchTokoProduk();
        await this.loadTokoOrders();
    },

    async fetchTokoProduk() {
        const res = await this.api('portal/retail-produk');
        if (res?.success && res.data) {
            this.tokoProdukList = res.data.produk || [];
            this.renderTokoCategories(res.data.kategori || ['Semua']);
            this.renderTokoProduk(this.tokoProdukList);
        }
    },

    renderTokoCategories(categories) {
        const el = document.getElementById('toko-category-pills');
        if (!el) return;
        el.innerHTML = categories.map(cat => {
            const isActive = cat === this.tokoActiveKategori;
            const cls = isActive 
                ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20 font-bold' 
                : 'bg-white dark:bg-obsidian-900 text-gray-600 dark:text-obsidian-400 border border-gray-200 dark:border-obsidian-800 font-medium hover:bg-gray-50';
            return `<button onclick="Portal.filterTokoKategori('${cat}')" class="px-3.5 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all ${cls}">${cat}</button>`;
        }).join('');
    },

    filterTokoKategori(cat) {
        this.tokoActiveKategori = cat;
        this.filterTokoProduk();
    },

    filterTokoProduk() {
        const search = (document.getElementById('toko-search-input')?.value || '').toLowerCase().trim();
        let filtered = this.tokoProdukList;
        if (this.tokoActiveKategori && this.tokoActiveKategori !== 'Semua') {
            filtered = filtered.filter(p => p.kategori === this.tokoActiveKategori);
        }
        if (search) {
            filtered = filtered.filter(p => p.nama_produk.toLowerCase().includes(search) || (p.deskripsi && p.deskripsi.toLowerCase().includes(search)));
        }
        const allCats = ['Semua', ...new Set(this.tokoProdukList.map(p => p.kategori))];
        this.renderTokoCategories(allCats);
        this.renderTokoProduk(filtered);
    },

    renderTokoProduk(products) {
        const grid = document.getElementById('toko-products-grid');
        const empty = document.getElementById('toko-empty-state');
        if (!grid) return;
        if (!products || products.length === 0) {
            grid.innerHTML = '';
            if (empty) empty.classList.remove('hidden');
            return;
        }
        if (empty) empty.classList.add('hidden');

        grid.innerHTML = products.map(p => {
            const pId = Number(p.id);
            const hemat = p.harga_umum - p.harga_anggota;
            const inCart = this.tokoCart.find(c => Number(c.id) === pId);
            const qtyInCart = inCart ? inCart.qty : 0;
            const isHabis = parseInt(p.stok) <= 0;
            const img = p.gambar || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300';
            return `
            <div class="bg-white dark:bg-obsidian-900 rounded-2xl border border-gray-100 dark:border-obsidian-800 shadow-sm overflow-hidden flex flex-col justify-between transition-all hover:shadow-md ${isHabis ? 'opacity-70' : ''}">
                <div>
                    <div class="relative w-full h-32 bg-gray-100 dark:bg-obsidian-800 overflow-hidden">
                        <img src="${img}" alt="${p.nama_produk}" class="w-full h-full object-cover" onerror="this.src='https://images.unsplash.com/photo-1542838132-92c53300491e?w=300';">
                        ${hemat > 0 ? `<span class="absolute top-2 left-2 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm">Hemat ${this.rp(hemat)}</span>` : ''}
                        <span class="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[8px] font-bold px-2 py-0.5 rounded-full">${p.satuan}</span>
                        ${isHabis ? `<span class="absolute inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center text-white text-[11px] font-black uppercase tracking-wider">Stok Habis</span>` : ''}
                    </div>
                    <div class="p-3">
                        <div class="flex items-center justify-between mb-0.5">
                            <p class="text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">${p.kategori}</p>
                            <span class="text-[9px] ${parseInt(p.stok) <= 5 ? 'text-rose-500 font-bold' : 'text-gray-400 dark:text-obsidian-400'}">Sisa ${p.stok}</span>
                        </div>
                        <h4 class="text-xs font-bold text-gray-900 dark:text-obsidian-100 line-clamp-2 leading-tight">${p.nama_produk}</h4>
                        <div class="mt-2 flex items-baseline gap-1.5 flex-wrap">
                            <span class="text-xs font-black text-emerald-600 dark:text-emerald-400">${this.rp(p.harga_anggota)}</span>
                            ${p.harga_umum > p.harga_anggota ? `<span class="text-[10px] text-gray-400 line-through">${this.rp(p.harga_umum)}</span>` : ''}
                        </div>
                    </div>
                </div>
                <div class="p-3 pt-0">
                    ${isHabis ? `
                    <button disabled class="w-full py-2 bg-gray-100 dark:bg-obsidian-800 text-gray-400 text-[11px] font-bold rounded-xl cursor-not-allowed">
                        Stok Habis
                    </button>` : (qtyInCart > 0 ? `
                    <div class="flex items-center justify-between bg-amber-50 dark:bg-amber-900/30 rounded-xl p-1 border border-amber-200 dark:border-amber-800/50">
                        <button onclick="Portal.changeCartQty(${pId}, -1)" class="w-7 h-7 rounded-lg bg-white dark:bg-obsidian-800 text-amber-600 font-bold flex items-center justify-center shadow-sm active:scale-90 transition-all">-</button>
                        <span class="text-xs font-black text-amber-700 dark:text-amber-300">${qtyInCart}</span>
                        <button onclick="Portal.changeCartQty(${pId}, 1)" class="w-7 h-7 rounded-lg bg-amber-500 text-white font-bold flex items-center justify-center shadow-sm active:scale-90 transition-all">+</button>
                    </div>` : `
                    <button onclick="Portal.addToCart(${pId})" class="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-xl shadow-sm shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5">
                        <i class="bi bi-cart-plus"></i> Beli
                    </button>`)}
                </div>
            </div>`;
        }).join('');
    },

    addToCart(productId) {
        const pId = Number(productId);
        const prod = this.tokoProdukList.find(p => Number(p.id) === pId);
        if (!prod) {
            console.warn('Produk tidak ditemukan di daftar:', productId, this.tokoProdukList);
            return;
        }
        if (parseInt(prod.stok) <= 0) {
            Swal.fire({
                title: 'Stok Kosong',
                text: 'Maaf, stok produk ini sedang habis.',
                icon: 'warning',
                confirmButtonColor: '#f59e0b',
                customClass: { popup: 'rounded-[2rem] dark:bg-obsidian-900' }
            });
            return;
        }
        const existing = this.tokoCart.find(c => Number(c.id) === pId);
        if (existing) {
            if (existing.qty >= parseInt(prod.stok)) {
                Swal.fire({
                    title: 'Batas Stok',
                    text: `Maksimal pembelian ${prod.stok} ${prod.satuan}.`,
                    icon: 'warning',
                    confirmButtonColor: '#f59e0b',
                    customClass: { popup: 'rounded-[2rem] dark:bg-obsidian-900' }
                });
                return;
            }
            existing.qty += 1;
        } else {
            this.tokoCart.push({
                id: pId,
                nama: prod.nama_produk,
                harga: parseFloat(prod.harga_anggota),
                qty: 1,
                gambar: prod.gambar,
                satuan: prod.satuan
            });
        }
        this.haptic('medium');
        this.renderTokoCartBar();
        this.filterTokoProduk();
    },

    changeCartQty(productId, delta) {
        const pId = Number(productId);
        const item = this.tokoCart.find(c => Number(c.id) === pId);
        if (!item) return;
        const prod = this.tokoProdukList.find(p => Number(p.id) === pId);
        if (delta > 0 && prod && item.qty >= parseInt(prod.stok)) {
            Swal.fire({
                title: 'Batas Stok',
                text: `Stok tersedia hanya ${prod.stok} ${prod.satuan}.`,
                icon: 'warning',
                confirmButtonColor: '#f59e0b',
                customClass: { popup: 'rounded-[2rem] dark:bg-obsidian-900' }
            });
            return;
        }
        item.qty += delta;
        if (item.qty <= 0) {
            this.tokoCart = this.tokoCart.filter(c => Number(c.id) !== pId);
        }
        this.haptic('light');
        this.renderTokoCartBar();
        this.filterTokoProduk();
    },

    renderTokoCartBar() {
        const bar = document.getElementById('toko-floating-cart');
        const badge = document.getElementById('cart-badge');
        const countEl = document.getElementById('floating-cart-count');
        const totalEl = document.getElementById('floating-cart-total');

        const totalQty = this.tokoCart.reduce((sum, item) => sum + item.qty, 0);
        const totalPrice = this.tokoCart.reduce((sum, item) => sum + (item.harga * item.qty), 0);

        if (badge) {
            if (totalQty > 0) {
                badge.textContent = totalQty;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }

        if (bar) {
            if (totalQty > 0) {
                bar.classList.remove('hidden', 'translate-y-32');
                bar.classList.add('translate-y-0');
                if (countEl) countEl.textContent = totalQty;
                if (totalEl) totalEl.textContent = this.rp(totalPrice);
            } else {
                bar.classList.add('translate-y-32');
                setTimeout(() => bar.classList.add('hidden'), 300);
            }
        }
    },

    setTokoTab(tabName) {
        const katContent = document.getElementById('toko-content-katalog');
        const pesContent = document.getElementById('toko-content-pesanan');
        const btnKat = document.getElementById('btn-tab-katalog');
        const btnPes = document.getElementById('btn-tab-pesanan');
        const floatCart = document.getElementById('toko-floating-cart');

        if (tabName === 'katalog') {
            if (katContent) katContent.classList.remove('hidden');
            if (pesContent) pesContent.classList.add('hidden');
            if (btnKat) btnKat.className = "flex-1 py-2 rounded-xl text-xs font-bold text-gray-800 dark:text-obsidian-100 bg-white dark:bg-obsidian-800 shadow-sm transition-all flex items-center justify-center gap-1.5";
            if (btnPes) btnPes.className = "flex-1 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-obsidian-400 hover:text-gray-800 transition-all flex items-center justify-center gap-1.5";
            this.renderTokoCartBar();
        } else {
            if (katContent) katContent.classList.add('hidden');
            if (pesContent) pesContent.classList.remove('hidden');
            if (btnPes) btnPes.className = "flex-1 py-2 rounded-xl text-xs font-bold text-gray-800 dark:text-obsidian-100 bg-white dark:bg-obsidian-800 shadow-sm transition-all flex items-center justify-center gap-1.5";
            if (btnKat) btnKat.className = "flex-1 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-obsidian-400 hover:text-gray-800 transition-all flex items-center justify-center gap-1.5";
            if (floatCart) floatCart.classList.add('hidden');
            this.loadTokoOrders();
        }
    },

    openCartModal() {
        this.haptic('light');
        if (this.tokoCart.length === 0) {
            Swal.fire({
                title: 'Keranjang Kosong',
                text: 'Silakan pilih produk terlebih dahulu.',
                icon: 'info',
                confirmButtonColor: '#f59e0b',
                customClass: { popup: 'rounded-[2rem] dark:bg-obsidian-900 p-6' }
            });
            return;
        }

        const totalPrice = this.tokoCart.reduce((sum, item) => sum + (item.harga * item.qty), 0);
        const cartItemsHtml = this.tokoCart.map(c => `
            <div class="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-obsidian-800/60 rounded-xl border border-gray-100 dark:border-obsidian-700/50">
                <div>
                    <h5 class="text-xs font-bold text-gray-900 dark:text-obsidian-100 leading-tight">${c.nama}</h5>
                    <p class="text-[10px] text-gray-500 dark:text-obsidian-400">${this.rp(c.harga)} x ${c.qty} ${c.satuan}</p>
                </div>
                <div class="text-right">
                    <p class="text-xs font-black text-amber-600 dark:text-amber-400">${this.rp(c.harga * c.qty)}</p>
                </div>
            </div>
        `).join('');

        Swal.fire({
            title: 'Keranjang Belanja',
            html: `
                <div class="text-left space-y-3 pt-1">
                    <div class="max-h-[200px] overflow-y-auto space-y-2 custom-scrollbar pr-1">
                        ${cartItemsHtml}
                    </div>
                    <div class="pt-2 border-t border-gray-100 dark:border-obsidian-700 flex justify-between items-center">
                        <span class="text-xs font-bold text-gray-700 dark:text-obsidian-300">Total Pembayaran:</span>
                        <span class="text-base font-black text-amber-600 dark:text-amber-400">${this.rp(totalPrice)}</span>
                    </div>
                    <div class="pt-2">
                        <label class="block text-[11px] font-bold text-gray-700 dark:text-obsidian-300 mb-1.5">Metode Pembayaran</label>
                        <div class="grid grid-cols-2 gap-2">
                            <label class="p-3 bg-emerald-50/70 dark:bg-emerald-900/20 border-2 border-emerald-500 rounded-xl cursor-pointer block text-center">
                                <input type="radio" name="cart_metode" value="sukarela" checked class="hidden">
                                <i class="bi bi-wallet2 text-emerald-600 text-lg block mb-0.5"></i>
                                <span class="text-[11px] font-bold text-emerald-800 dark:text-emerald-200 block">Potong Sukarela</span>
                                <span class="text-[9px] text-emerald-600 dark:text-emerald-400 block">Langsung lunas</span>
                            </label>
                            <label class="p-3 bg-gray-50 dark:bg-obsidian-800 border-2 border-transparent hover:border-gray-300 rounded-xl cursor-pointer block text-center" onclick="this.classList.add('border-blue-500'); this.previousElementSibling.classList.remove('border-emerald-500');">
                                <input type="radio" name="cart_metode" value="tunai_ambil" class="hidden">
                                <i class="bi bi-cash-stack text-blue-600 text-lg block mb-0.5"></i>
                                <span class="text-[11px] font-bold text-gray-800 dark:text-obsidian-200 block">Bayar Tunai</span>
                                <span class="text-[9px] text-gray-500 dark:text-obsidian-400 block">Ambil di kasir</span>
                            </label>
                        </div>
                    </div>
                    <div>
                        <label class="block text-[11px] font-bold text-gray-700 dark:text-obsidian-300 mb-1">Catatan Pesanan (Opsional)</label>
                        <input type="text" id="cart-catatan" placeholder="Contoh: Ambil jam 14.00 di kasir..." class="w-full bg-gray-50 dark:bg-obsidian-800 border border-gray-200 dark:border-obsidian-700 rounded-xl px-3 py-2 text-xs text-gray-800 dark:text-obsidian-200 focus:outline-none">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Konfirmasi Pesanan',
            cancelButtonText: 'Kembali',
            confirmButtonColor: '#f59e0b',
            cancelButtonColor: '#94a3b8',
            customClass: {
                popup: 'rounded-[2.5rem] p-6 max-w-[420px] dark:bg-obsidian-900',
                confirmButton: 'rounded-xl px-5 py-2.5 font-bold text-xs shadow-md',
                cancelButton: 'rounded-xl px-5 py-2.5 font-bold text-xs'
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const metodeInput = document.querySelector('input[name="cart_metode"]:checked');
                const metode = metodeInput ? metodeInput.value : 'sukarela';
                const catatan = document.getElementById('cart-catatan')?.value || '';

                Swal.fire({
                    title: 'Memproses Pesanan...',
                    allowOutsideClick: false,
                    didOpen: () => Swal.showLoading(),
                    customClass: { popup: 'rounded-[2rem] dark:bg-obsidian-900' }
                });

                const payload = {
                    items: this.tokoCart.map(c => ({ produk_id: c.id, qty: c.qty })),
                    metode_pembayaran: metode,
                    catatan: catatan
                };

                const res = await this.api('portal/retail-order', {
                    method: 'POST',
                    body: payload
                });

                if (res?.success) {
                    this.tokoCart = [];
                    this.renderTokoCartBar();
                    this.filterTokoProduk();

                    Swal.fire({
                        icon: 'success',
                        title: 'Pesanan Berhasil!',
                        text: `Nomor Pesanan: ${res.data?.no_pesanan || '-'}. Barang Anda siap disiapkan oleh petugas toko koperasi.`,
                        confirmButtonColor: '#f59e0b',
                        customClass: { popup: 'rounded-[2rem] dark:bg-obsidian-900' }
                    }).then(() => {
                        this.setTokoTab('pesanan');
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Gagal Membuat Pesanan',
                        text: res?.message || 'Terjadi kendala pada pesanan.',
                        confirmButtonColor: '#f59e0b',
                        customClass: { popup: 'rounded-[2rem]' }
                    });
                }
            }
        });
    },

    async loadTokoOrders() {
        const listEl = document.getElementById('toko-orders-list');
        const emptyEl = document.getElementById('toko-orders-empty');
        if (!listEl) return;

        const res = await this.api('portal/retail-orders');
        const orders = res?.data || [];
        this.tokoOrders = orders;

        if (orders.length === 0) {
            listEl.innerHTML = '';
            if (emptyEl) emptyEl.classList.remove('hidden');
            return;
        }
        if (emptyEl) emptyEl.classList.add('hidden');

        listEl.innerHTML = orders.map((ord, idx) => {
            const badgeCls = ord.status === 'selesai' 
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                : (ord.status === 'siap_diambil'
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                    : (ord.status === 'diproses'
                        ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300'
                        : (ord.status === 'dibatalkan'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300')));
            
            const dotColor = ord.status === 'selesai'
                ? 'bg-emerald-500'
                : (ord.status === 'siap_diambil' ? 'bg-indigo-500' : (ord.status === 'diproses' ? 'bg-cyan-500' : (ord.status === 'dibatalkan' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse')));

            const statusLabel = ord.status === 'siap_diambil' ? 'Siap Diambil' : (ord.status === 'diproses' ? 'Disiapkan' : ord.status.toUpperCase());
            const itemsText = (ord.items || []).map(i => `${i.nama_produk} (${i.qty}x)`).join(', ');

            return `
            <div onclick="Portal.showTokoOrderDetail(${idx})"
                class="bg-white dark:bg-obsidian-900 p-4 rounded-2xl border border-gray-100 dark:border-obsidian-800 shadow-sm text-left hover:border-amber-400 dark:hover:border-amber-600 active:scale-[0.99] transition-all cursor-pointer group">
                <div class="flex items-center justify-between mb-2">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full ${dotColor}"></span>
                        <span class="text-[11px] font-mono font-bold text-gray-500 dark:text-obsidian-400">${ord.no_pesanan}</span>
                    </div>
                    <span class="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${badgeCls}">${statusLabel}</span>
                </div>
                
                <div class="space-y-1 mb-2.5">
                    <p class="text-xs font-bold text-gray-900 dark:text-obsidian-100 line-clamp-1 leading-snug">${itemsText || 'Pesanan Toko'}</p>
                    <p class="text-[10px] text-gray-400 dark:text-obsidian-500">${(ord.items || []).length} jenis barang belanja</p>
                </div>

                <div class="flex items-center justify-between pt-2.5 border-t border-gray-50 dark:border-obsidian-800 text-[11px]">
                    <div class="text-gray-500 dark:text-obsidian-400">
                        <span>${this.fdate(ord.tgl_pesanan)}</span>
                        <span class="block text-[10px] text-gray-400 dark:text-obsidian-500">${ord.metode_pembayaran === 'sukarela' ? '🟢 Potong Sukarela' : '🔵 Tunai di Kasir'}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-xs font-black text-amber-600 dark:text-amber-400 block">${this.rp(ord.total_nominal)}</span>
                        <span class="text-[10px] font-bold text-amber-500 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5">
                            Lihat Rincian <i class="bi bi-chevron-right text-[9px]"></i>
                        </span>
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    showTokoOrderDetail(idx) {
        this.haptic('light');
        if (!this.tokoOrders || !this.tokoOrders[idx]) return;
        const ord = this.tokoOrders[idx];

        document.getElementById('modal-ord-no').textContent = ord.no_pesanan;
        document.getElementById('modal-ord-tgl').textContent = this.fdate(ord.tgl_pesanan);
        document.getElementById('modal-ord-total').textContent = this.rp(ord.total_nominal);
        document.getElementById('modal-ord-item-count').textContent = `${(ord.items || []).length} Jenis Barang`;

        // Metode
        document.getElementById('modal-ord-metode').innerHTML = ord.metode_pembayaran === 'sukarela'
            ? `<span class="text-emerald-600 dark:text-emerald-400">🟢 Potong Sukarela (Lunas)</span>`
            : `<span class="text-blue-600 dark:text-blue-400">🔵 Tunai (Bayar di Kasir)</span>`;

        // Catatan
        const catatanBox = document.getElementById('modal-ord-catatan-box');
        const catatanText = document.getElementById('modal-ord-catatan-text');
        if (ord.catatan && ord.catatan.trim()) {
            catatanText.textContent = ord.catatan;
            catatanBox.classList.remove('hidden');
        } else {
            catatanBox.classList.add('hidden');
        }

        // Status Box
        const statusBox = document.getElementById('modal-ord-status-box');
        let statusHtml = '';
        if (ord.status === 'pending') {
            statusHtml = `
                <div class="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center text-base shrink-0">
                    <i class="bi bi-hourglass-split"></i>
                </div>
                <div>
                    <h5 class="font-bold text-amber-800 dark:text-amber-200">Pesanan Masuk (Pending)</h5>
                    <p class="text-[11px] text-amber-700/80 dark:text-amber-300/80 mt-0.5 leading-relaxed">Pesanan Anda telah diterima sistem dan menunggu penyiapan barang oleh petugas toko koperasi.</p>
                </div>
            `;
            statusBox.className = "p-3.5 rounded-2xl border text-xs flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50";
        } else if (ord.status === 'diproses') {
            statusHtml = `
                <div class="w-8 h-8 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center text-base shrink-0">
                    <i class="bi bi-box-seam"></i>
                </div>
                <div>
                    <h5 class="font-bold text-cyan-800 dark:text-cyan-200">Sedang Disiapkan Petugas</h5>
                    <p class="text-[11px] text-cyan-700/80 dark:text-cyan-300/80 mt-0.5 leading-relaxed">Petugas toko sedang mengumpulkan dan memeriksa kondisi barang belanja pesanan Anda.</p>
                </div>
            `;
            statusBox.className = "p-3.5 rounded-2xl border text-xs flex items-start gap-3 bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800/50";
        } else if (ord.status === 'siap_diambil') {
            statusHtml = `
                <div class="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-base shrink-0">
                    <i class="bi bi-bag-check-fill"></i>
                </div>
                <div>
                    <h5 class="font-bold text-indigo-800 dark:text-indigo-200">Siap Diambil di Kasir!</h5>
                    <p class="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 mt-0.5 leading-relaxed">Barang belanja Anda sudah siap. Silakan ambil di kasir/kantor koperasi dan tunjukkan nomor pesanan ini.</p>
                </div>
            `;
            statusBox.className = "p-3.5 rounded-2xl border text-xs flex items-start gap-3 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50";
        } else if (ord.status === 'selesai') {
            statusHtml = `
                <div class="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-base shrink-0">
                    <i class="bi bi-check-circle-fill"></i>
                </div>
                <div>
                    <h5 class="font-bold text-emerald-800 dark:text-emerald-200">Pesanan Selesai</h5>
                    <p class="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 mt-0.5 leading-relaxed">Barang telah diserahterimakan dan transaksi tuntas. Terima kasih telah berbelanja di Toko Koperasi!</p>
                </div>
            `;
            statusBox.className = "p-3.5 rounded-2xl border text-xs flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50";
        } else if (ord.status === 'dibatalkan') {
            statusHtml = `
                <div class="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 flex items-center justify-center text-base shrink-0">
                    <i class="bi bi-x-circle-fill"></i>
                </div>
                <div>
                    <h5 class="font-bold text-rose-800 dark:text-rose-200">Pesanan Dibatalkan</h5>
                    <p class="text-[11px] text-rose-700/80 dark:text-rose-300/80 mt-0.5 leading-relaxed">Pesanan ini dibatalkan. Jika menggunakan saldo Sukarela, saldo telah otomatis dikembalikan.</p>
                </div>
            `;
            statusBox.className = "p-3.5 rounded-2xl border text-xs flex items-start gap-3 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800/50";
        }
        statusBox.innerHTML = statusHtml;

        // Items List
        const itemsListEl = document.getElementById('modal-ord-items-list');
        itemsListEl.innerHTML = (ord.items || []).map(it => {
            const imgHtml = it.gambar 
                ? `<img src="${it.gambar}" alt="${it.nama_produk}" class="w-11 h-11 object-cover rounded-xl border border-gray-100 dark:border-obsidian-700 shrink-0">`
                : `<div class="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-lg shrink-0 border border-amber-100 dark:border-amber-800/30"><i class="bi bi-basket2"></i></div>`;
            return `
            <div class="flex items-center justify-between p-3 bg-gray-50/80 dark:bg-obsidian-800/50 rounded-2xl border border-gray-100 dark:border-obsidian-700/50 gap-3">
                <div class="flex items-center gap-3 min-w-0">
                    ${imgHtml}
                    <div class="min-w-0">
                        <h5 class="text-xs font-bold text-gray-900 dark:text-obsidian-100 truncate leading-tight">${it.nama_produk}</h5>
                        <p class="text-[10px] text-gray-400 dark:text-obsidian-400 mt-1">${this.rp(it.harga_satuan)} × <b class="text-gray-700 dark:text-obsidian-200">${it.qty} ${it.satuan || 'pcs'}</b></p>
                    </div>
                </div>
                <div class="text-right shrink-0">
                    <span class="text-xs font-black text-amber-600 dark:text-amber-400 block">${this.rp(it.subtotal)}</span>
                </div>
            </div>`;
        }).join('');

        this.currentTokoOrder = ord;
        this.openModal('toko-order-detail-modal');
    },

    openReceiptFromCurrentTokoOrder() {
        this.closeModal('toko-order-detail-modal');
        setTimeout(() => {
            if (this.currentTokoOrder) {
                this.openReceiptFromTokoOrder(this.currentTokoOrder);
            }
        }, 350);
    },

    openReceiptFromTokoOrder(ord) {
        if (!ord) return;
        const mapped = {
            kategori: 'toko',
            kode: ord.no_pesanan || `ORD-${Date.now().toString().slice(-8)}`,
            tanggal: ord.tgl_pesanan || ord.created_at || new Date().toISOString(),
            judul: `Belanja Toko Retail (${ord.metode_pembayaran ? ord.metode_pembayaran.toUpperCase() : 'KAS'})`,
            deskripsi: `${(ord.items || []).length} jenis barang belanjaan • Status: ${(ord.status || 'SELESAI').toUpperCase()}`,
            dk: 'K',
            nominal: ord.total_nominal,
            status: ord.status === 'selesai' || ord.status === 'diproses' ? 'sukses' : ord.status
        };
        this.showReceipt(mapped);
    },

    showKtaModal() {
        this.haptic('light');
        this.tab('profil');
        setTimeout(() => {
            const flipCard = document.querySelector('.flip-card');
            if (flipCard) flipCard.scrollIntoView({ behavior: 'smooth' });
        }, 300);
    },

    // ==========================================
    // Web Push Notification Client (RFC 8291/8292)
    // ==========================================
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    },

    async initPushNotificationUI() {
        const toggle = document.getElementById('push-toggle-check');
        const desc = document.getElementById('push-status-desc');
        const testBtn = document.getElementById('push-test-btn');
        if (!toggle) return;

        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
            toggle.disabled = true;
            if (desc) desc.textContent = 'Perangkat ini tidak mendukung Web Push';
            return;
        }

        try {
            const reg = await navigator.serviceWorker.ready;
            const sub = await reg.pushManager.getSubscription();
            if (sub && Notification.permission === 'granted') {
                toggle.checked = true;
                if (desc) desc.textContent = 'Aktif (Menerima pengingat tagihan & pencairan)';
                if (testBtn) testBtn.classList.remove('hidden');
            } else {
                toggle.checked = false;
                if (desc) desc.textContent = 'Nonaktif (Ketuk untuk mengaktifkan)';
                if (testBtn) testBtn.classList.add('hidden');
            }
        } catch (e) {
            console.error('Check push status error:', e);
        }
    },

    async togglePushNotification(enable) {
        this.haptic('light');
        const toggle = document.getElementById('push-toggle-check');
        const desc = document.getElementById('push-status-desc');
        const testBtn = document.getElementById('push-test-btn');

        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
            if (toggle) toggle.checked = false;
            Swal.fire({
                icon: 'warning',
                title: 'Tidak Didukung',
                text: 'Perangkat atau browser Anda belum mendukung Web Push Notification.',
                confirmButtonColor: '#2563eb'
            });
            return;
        }

        const reg = await navigator.serviceWorker.ready;

        if (enable) {
            let perm = Notification.permission;
            if (perm === 'denied') {
                if (toggle) toggle.checked = false;
                Swal.fire({
                    icon: 'warning',
                    title: 'Izin Ditolak',
                    text: 'Izin notifikasi telah diblokir di browser Anda. Buka Pengaturan Browser HP Anda untuk mengizinkan notifikasi aplikasi ini.',
                    confirmButtonColor: '#2563eb'
                });
                return;
            }

            if (perm !== 'granted') {
                perm = await Notification.requestPermission();
                if (perm !== 'granted') {
                    if (toggle) toggle.checked = false;
                    return;
                }
            }

            // Fetch VAPID Public Key from server
            const r = await this.api('portal/push-vapid-key');
            if (!r?.success || !r.data?.public_key) {
                if (toggle) toggle.checked = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Menghubungkan',
                    text: 'Gagal mengambil kunci otentikasi notifikasi dari server.',
                    confirmButtonColor: '#2563eb'
                });
                return;
            }

            try {
                // Subscribe via PushManager
                const appServerKey = this.urlBase64ToUint8Array(r.data.public_key);
                const sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: appServerKey
                });

                // Send subscription to server
                const subJson = sub.toJSON();
                const saveRes = await this.api('portal/push-subscribe', {
                    method: 'POST',
                    body: subJson
                });

                if (saveRes?.success) {
                    if (desc) desc.textContent = 'Aktif (Menerima pengingat tagihan & pencairan)';
                    if (testBtn) testBtn.classList.remove('hidden');
                    Swal.fire({
                        icon: 'success',
                        title: 'Notifikasi Aktif! 🔔',
                        text: 'Anda akan menerima pengingat otomatis saat angsuran mendekati jatuh tempo dan saat pencairan pinjaman disetujui.',
                        confirmButtonColor: '#2563eb'
                    });
                } else {
                    throw new Error(saveRes?.message || 'Gagal menyimpan subscription');
                }
            } catch (err) {
                console.error('Subscription error:', err);
                if (toggle) toggle.checked = false;
                Swal.fire({
                    icon: 'error',
                    title: 'Gagal Mengaktifkan',
                    text: err.message || 'Terjadi kesalahan saat mendaftarkan notifikasi push.',
                    confirmButtonColor: '#2563eb'
                });
            }
        } else {
            // Disable push notification
            try {
                const sub = await reg.pushManager.getSubscription();
                if (sub) {
                    await this.api('portal/push-unsubscribe', {
                        method: 'POST',
                        body: { endpoint: sub.endpoint }
                    });
                    await sub.unsubscribe();
                }
                if (desc) desc.textContent = 'Nonaktif (Ketuk untuk mengaktifkan)';
                if (testBtn) testBtn.classList.add('hidden');
                Swal.fire({
                    icon: 'info',
                    title: 'Notifikasi Dinonaktifkan',
                    text: 'Pengingat notifikasi push telah dimatikan pada perangkat ini.',
                    confirmButtonColor: '#2563eb'
                });
            } catch (err) {
                console.error('Unsubscribe error:', err);
            }
        }
    },

    async testPushNotification() {
        this.haptic('medium');
        Swal.fire({
            title: 'Mengirim Notifikasi...',
            html: '<div class="py-3"><i class="bi bi-send animate-bounce text-3xl text-indigo-500"></i></div>',
            allowOutsideClick: false,
            showConfirmButton: false,
            timer: 1500
        });

        const res = await this.api('portal/push-test', { method: 'POST' });
        if (res?.success) {
            Swal.fire({
                icon: 'success',
                title: 'Terkirim! 🚀',
                text: 'Notifikasi uji coba berhasil dikirim ke perangkat Anda. Cek bilah notifikasi ponsel Anda!',
                confirmButtonColor: '#2563eb'
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Gagal Mengirim',
                text: res?.message || 'Pastikan izin notifikasi browser telah aktif.',
                confirmButtonColor: '#2563eb'
            });
        }
    },
};

Portal.init();

// PWA Service Worker & Install Prompt
let deferredPrompt;
const installBanner = document.getElementById('pwa-install-banner');
const installBtn = document.getElementById('pwa-install-btn');
const dismissBtn = document.getElementById('pwa-install-dismiss');

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Show custom install banner if not dismissed before
    if (!localStorage.getItem('pwa-prompt-dismissed')) {
        setTimeout(() => installBanner.classList.add('show'), 3000);
    }
});

installBtn.addEventListener('click', async () => {
    installBanner.classList.remove('show');
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }
        deferredPrompt = null;
    }
});

dismissBtn.addEventListener('click', () => {
    installBanner.classList.remove('show');
    localStorage.setItem('pwa-prompt-dismissed', 'true');
});

window.addEventListener('appinstalled', () => {
    installBanner.classList.remove('show');
    deferredPrompt = null;
    console.log('PWA was installed');
});

// Pull to Refresh Logic
let pStartY = 0;
let pCurrentY = 0;
let pIsRefreshing = false;
const pAppContainer = document.getElementById('portal-app');
const pSpinner = document.getElementById('ptr-spinner');
const pThreshold = 80;

pAppContainer.addEventListener('touchstart', (e) => {
    if (window.scrollY === 0 && !pIsRefreshing) {
        pStartY = e.touches[0].clientY;
    } else {
        pStartY = 0;
    }
}, { passive: true });

pAppContainer.addEventListener('touchmove', (e) => {
    if (pStartY === 0 || pIsRefreshing) return;
    pCurrentY = e.touches[0].clientY;
    const diff = pCurrentY - pStartY;

    if (diff > 0 && window.scrollY === 0) {
        // Prevent default scrolling when pulling down
        if (e.cancelable) e.preventDefault();
        pSpinner.style.opacity = Math.min(diff / pThreshold, 1);
        pSpinner.style.transform = `scale(${Math.min(diff / pThreshold, 1)}) translateY(${Math.min(diff, pThreshold / 2)}px)`;
    }
}, { passive: false });

pAppContainer.addEventListener('touchend', async () => {
    if (pStartY === 0 || pIsRefreshing) return;
    const diff = pCurrentY - pStartY;

    if (diff > pThreshold && window.scrollY === 0) {
        pIsRefreshing = true;
        pSpinner.classList.add('refreshing');
        pSpinner.style.transform = `scale(1) translateY(${pThreshold / 2}px)`;

        // Refresh data
        await Portal.loadDashboardData();

        // Refresh specific tab contents if active
        if (!document.getElementById('tab-content-simpanan').classList.contains('hidden')) {
            await Portal.loadSimpanan(document.getElementById('p-content-simpanan'));
        }
        if (!document.getElementById('tab-content-pinjaman').classList.contains('hidden')) {
            await Portal.loadPinjaman(document.getElementById('p-content-pinjaman'));
        }

        pIsRefreshing = false;
        pSpinner.classList.remove('refreshing');
        pSpinner.style.opacity = 0;
        pSpinner.style.transform = 'scale(0.5) translateY(0)';
    } else if (!pIsRefreshing) {
        pSpinner.style.opacity = 0;
        pSpinner.style.transform = 'scale(0.5) translateY(0)';
    }

    pStartY = 0;
    pCurrentY = 0;
});

// PWA Service Worker was moved to Portal.init() for version checking flow
