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
            
            // Treat as unauthorized if 401 OR (success is false AND it's not a login attempt)
            // We no longer treat empty arrays as expired because new members might have empty balances/loans.
            const isUnauthorized = (r.status === 401) || (json && json.success === false && !isLoginRequest);

            // Handle Unauthorized / Session Expired
            if (isUnauthorized && wasLoggedIn) {
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
            if (!r.ok) return null;
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

    async init() {
        this.initSplashTheme(); // Set dynamic background & tips
        this.initTheme(); // Load dark/light mode from storage

        const splashText = document.getElementById('splash-loader-text');
        
        // 1. Version Check & Update
        if ('serviceWorker' in navigator) {
            try {
                if (splashText) splashText.textContent = 'Checking for updates...';
                await this.sleep(1000); // Visual delay
                
                const vRes = await fetch('version.json', { cache: 'no-store' });
                const vData = await vRes.json();
                const lastSwVersion = localStorage.getItem('portal_sw_version');
                
                // Register service worker first
                const registration = await navigator.serviceWorker.register('sw.js');
                
                if (vData.sw_version !== lastSwVersion) {
                    if (splashText) {
                        splashText.textContent = `New version available (v${vData.version})`;
                        await this.sleep(800);
                        splashText.textContent = 'Downloading updates...';
                        splashText.classList.remove('text-white/40');
                        splashText.classList.add('text-white', 'font-bold');
                    }
                    
                    // Trigger manual update check
                    try { await registration.update(); } catch(e) { console.warn(e); }
                    
                    // Wait for the update to complete if there is an installation in progress
                    if (registration.installing || registration.waiting) {
                        await this.waitForUpdate(registration);
                    }
                    
                    // Always update local storage so we don't prompt again for this version
                    localStorage.setItem('portal_sw_version', vData.sw_version);
                    
                    if (splashText) {
                        splashText.textContent = 'Updates installed successfully';
                    }
                    await this.sleep(800);
                    
                    // Reload to immediately load the new assets from the updated service worker
                    window.location.reload();
                    return; // Stop initialization and wait for reload
                } else {
                    localStorage.setItem('portal_sw_version', vData.sw_version);
                    if (splashText) {
                        splashText.textContent = `System up to date (v${vData.version})`;
                        splashText.classList.remove('animate-pulse');
                    }
                    await this.sleep(1000);
                }
            } catch (e) {
                console.warn('Update check failed, proceeding anyway:', e);
            }
        }

        // 2. System Initialization
        this.initIdleMonitor();
        this.initVisibilityCheck();

        if (splashText) {
            splashText.textContent = 'Initializing System...';
            splashText.classList.add('text-white/40', 'animate-pulse');
        }

        document.getElementById('p-login-form').addEventListener('submit', e => { e.preventDefault(); this.login(); });
        const r = await this.api('portal/me');
        if (r?.data?.csrf_token) this.csrfToken = r.data.csrf_token;

        if (r?.success) {
            localStorage.setItem('kop_was_logged_in', 'true');
            this.member = r.data.anggota;
            this.pwaName = r.data.pwa_name || '';
            this.logoUrl = r.data.logo_url || '';
            // Prepare app while splash is still showing
            await this.showApp();

            // Smooth exit of initial splash
            setTimeout(() => {
                const splash = document.getElementById('initial-splash');
                splash.classList.add('fade-out');
                document.body.classList.remove('overflow-hidden');
                setTimeout(() => splash.remove(), 800);
            }, 1200);
        } else {
            // Not logged in, show login after splash
            setTimeout(() => {
                const splash = document.getElementById('initial-splash');
                splash.classList.add('fade-out');
                document.body.classList.remove('overflow-hidden');
                setTimeout(() => splash.remove(), 800);
            }, 1200);
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
            localStorage.setItem('kop_was_logged_in', 'true');
            this.member = r.data.anggota || r.data;
            this.pwaName = r.data.pwa_name || '';
            this.logoUrl = r.data.logo_url || '';
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
            this.tab('home');
            setTimeout(() => splash.remove(), 700);
        }, 2200);
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
        if (elTgl) elTgl.textContent = 'Bersama Sejak ' + (this.member.tgl_gabung ? new Date(this.member.tgl_gabung).getFullYear() : '2026');
        if (elImg) {
            const initials = this.getFirstName(this.member.nama); // Use our helper just for avatar initials
            elImg.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=ffffff&color=2563eb&size=100`;
        }

        this.tab('home');
    },

    renderSHUChart(data) {
        const canvas = document.getElementById('shuChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (window.myShuChart) window.myShuChart.destroy();

        const isDark = document.documentElement.classList.contains('dark');
        const primaryColor = isDark ? '#818cf8' : '#4f46e5';
        const gridColor = isDark ? '#334155' : '#e2e8f0';
        const textColor = isDark ? '#94a3b8' : '#64748b';

        window.myShuChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => d.label),
                datasets: [{
                    label: 'Proyeksi SHU',
                    data: data.map(d => d.shu),
                    borderColor: primaryColor,
                    backgroundColor: (context) => {
                        const chart = context.chart;
                        const { ctx, canvas } = chart;
                        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
                        gradient.addColorStop(0, isDark ? 'rgba(129, 140, 248, 0.2)' : 'rgba(79, 70, 229, 0.2)');
                        gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');
                        return gradient;
                    },
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: data.map(d => d.is_projection ? 0 : 4),
                    pointBackgroundColor: isDark ? '#0f172a' : '#fff',
                    pointBorderColor: primaryColor,
                    pointBorderWidth: 2,
                    segment: {
                        borderDash: ctx => ctx.p0.parsed.x >= (new Date().getMonth()) ? [5, 5] : undefined
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: isDark ? '#1e293b' : '#0f172a',
                        titleFont: { size: 10, weight: 'bold' },
                        bodyFont: { size: 12, weight: 'black' },
                        padding: 12,
                        borderRadius: 12,
                        callbacks: {
                            label: (context) => ' Proyeksi: ' + this.rp(context.raw)
                        }
                    }
                },
                scales: {
                    y: { display: false, beginAtZero: true },
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { font: { size: 9, weight: 'bold' }, color: textColor }
                    }
                }
            }
        });
        this.tab('home');
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
        const displayName = this.member.nama;
        const elNama = document.getElementById('h-nama');
        const elNo = document.getElementById('h-no');
        if (elNama) elNama.textContent = displayName;
        if (elNo) elNo.textContent = this.member.no_anggota;

        // Set avatar with generated initial
        const img = document.getElementById('h-avatar');
        if (img) {
            const initials = this.getFirstName(displayName);
            img.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0D8ABC&color=fff&size=100`;
        }

        // Parallel fetching logic for dashboard
        const [rSaldo, rPinjaman, rUpcoming, rNotif, rSHU, rPengumuman] = await Promise.all([
            this.api('portal/saldo'),
            this.api('portal/pinjaman'),
            this.api('portal/angsuran-upcoming'),
            this.api('portal/notifications'),
            this.api('rat/shu/simulation'),
            this.api('portal/pengumuman')
        ]);

        /* Update SHU Widget if exists */
        if (rSHU?.success) {
            const shuData = rSHU.data;
            const elTotal = document.getElementById('shu-total-estimasi');
            const elModal = document.getElementById('shu-jasa-modal');
            const elPinjam = document.getElementById('shu-jasa-pinjaman');

            if (elTotal) elTotal.innerText = this.rp(shuData.summary.estimasi_total);
            if (elModal) elModal.innerText = this.rp(shuData.summary.jasa_modal);
            if (elPinjam) elPinjam.innerText = this.rp(shuData.summary.jasa_pinjaman);

            const elTahun = document.getElementById('shu-tahun');
            if (elTahun) elTahun.innerText = new Date().getFullYear();

            this.renderSHUChart(shuData.chart);
        }

        // Update Dynamic Greeting (Home Tab)
        const greeting = this.getGreeting();
        const elGreetText = document.getElementById('h-greeting-text');
        const elGreetIcon = document.getElementById('h-greeting-icon');
        if (elGreetText) elGreetText.textContent = greeting.text + ',';
        if (elGreetIcon) {
            elGreetIcon.innerHTML = `<i class="bi ${greeting.icon}"></i>`;
        }

        // Update Notifications
        // Base notifications from API
        let rawNotifs = rNotif?.data || [];
        const readKeys = JSON.parse(localStorage.getItem('kop_notif_read') || '[]');

        // Assign unique keys and filter unread
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
        if (rUpcoming?.success && rUpcoming.data.length > 0 && notifEl && notifList) {
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
        if (rPengumuman?.success && rPengumuman.data.length > 0 && pengumumanContainer) {
            const iconMap = {
                'info': '<i class="bi bi-info-circle-fill text-blue-500"></i>',
                'warning': '<i class="bi bi-exclamation-triangle-fill text-amber-500"></i>',
                'promo': '<i class="bi bi-stars text-emerald-500"></i>'
            };
            const bgMap = {
                'info': 'bg-blue-50 border-blue-100',
                'warning': 'bg-amber-50 border-amber-100',
                'promo': 'bg-emerald-50 border-emerald-100'
            };

            pengumumanContainer.innerHTML = rPengumuman.data.map(p => {
                // Create safe escaped strings for the onclick handler
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

        // Process Saldo
        if (rSaldo?.success) {
            const bd = document.getElementById('h-simpanan-breakdown');
            bd.innerHTML = '';

            rSaldo.data.forEach(s => {
                const val = parseFloat(s.saldo || 0);
                totalSimpanan += val;

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

        // Process Pinjaman
        if (rPinjaman?.success) {
            const bdPin = document.getElementById('h-pinjaman-breakdown');
            if (bdPin) bdPin.innerHTML = '';

            const pinList = rPinjaman.data;
            if (pinList.length === 0) {
                if (bdPin) bdPin.innerHTML = '<p class="text-center text-xs text-gray-400 py-4">Belum ada pinjaman</p>';
            } else {
                pinList.forEach(p => {
                    if (p.status === 'cair') totalPinjaman += parseFloat(p.sisa_pinjaman || 0);

                    const isLunas = p.status === 'lunas';
                    const isCair = p.status === 'cair';
                    const badgeClass = isLunas
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                        : (isCair ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400');
                    const badgeIcon = isLunas ? 'bi-check-circle-fill' : (isCair ? 'bi-clock-history' : 'bi-hourglass-split');
                    const sisa = parseFloat(p.sisa_pinjaman || 0);

                    if (bdPin) bdPin.innerHTML += `
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

        document.getElementById('h-total-simpanan').textContent = this.rp(totalSimpanan);
        document.getElementById('h-total-pinjaman').textContent = this.rp(totalPinjaman);

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
            // Colour-code the bar: red below 50%, yellow 50-80%, green above 80%
            const barColor = rasio >= 80
                ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                : (rasio >= 50
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400'
                    : 'bg-gradient-to-r from-rose-400 to-orange-400');
            elAsetBar.className = `h-full rounded-full ${barColor} transition-all duration-700`;
            setTimeout(() => { elAsetBar.style.width = rasio + '%'; }, 100);
        }
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
                activeContent.innerHTML = '<div class="flex justify-center py-20"><i class="ri-loader-4-line text-4xl animate-spin text-blue-500"></i></div>';
                try {
                    const html = await fetch(`${this.PORTAL_BASE}views/${name}.html?v=${this.VERSION}`).then(res => {
                        if (!res.ok) throw new Error('Failed to load view');
                        return res.text();
                    });
                    activeContent.innerHTML = html;
                    this.updatePrivacyIcons();
                } catch (e) {
                    activeContent.innerHTML = '<div class="text-center py-20 text-gray-500 text-xs">Gagal memuat tampilan</div>';
                }
            }
        }

        // Load appropriate data
        if (name === 'home') {
            this.showSkeletonDashboard();
            await this.loadDashboardData();
        }
        else if (name === 'simpanan') {
            this.showSkeletonSimpanan();
            await this.loadSimpanan(document.getElementById('p-content-simpanan'));
        }
        else if (name === 'pinjaman') {
            this.showSkeletonPinjaman();
            await this.loadPinjaman(document.getElementById('p-content-pinjaman'));
        }
        else if (name === 'pengajuan_pinjaman') this.loadPengajuanPinjaman();
        else if (name === 'rat') await this.loadRAT();
        else if (name === 'laporan') await this.loadLaporan();
        else if (name === 'profil') this.loadProfil();
    },

    loadProfil() {
        if (!this.member) return;

        const firstName = this.member.nama ? this.member.nama.split(' ')[0] : 'Anggota';
        const elAvatar = document.getElementById('p-avatar-profil');
        if (elAvatar) elAvatar.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=0D8ABC&color=fff&size=150`;

        const elNama = document.getElementById('p-nama-profil');
        const elNo = document.getElementById('p-no-profil');
        const elTgl = document.getElementById('p-tgl-gabung');

        if (elNama) elNama.textContent = this.member.nama;
        if (elNo) elNo.textContent = this.member.no_anggota;

        const elPwa = document.getElementById('p-card-app-name');
        if (elPwa) elPwa.textContent = this.pwaName || 'Portal Anggota Koperasi';

        // Format tanggal bergabung menjadi tahun jika ada, default 2024
        const tglGabung = this.member.created_at ? new Date(this.member.created_at).getFullYear() : '2024';
        if (elTgl) elTgl.textContent = `${tglGabung}`;

        // Sync Theme Toggle Checkbox State
        const themeToggle = document.getElementById('theme-toggle-check');
        if (themeToggle) {
            themeToggle.checked = document.documentElement.classList.contains('dark');
        }
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
        container.innerHTML = `<div class="space-y-3">${Array(3).fill().map(() => `
            <div class="animate-pulse bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-gray-200 shrink-0"></div>
                <div class="flex-1">
                    <div class="h-3 bg-gray-200 rounded-full w-2/3 mb-2"></div>
                    <div class="h-2 bg-gray-100 rounded-full w-1/3"></div>
                </div>
                <div class="h-4 bg-gray-200 rounded-full w-20 shrink-0"></div>
            </div>`).join('')}</div>`;
        const r = await this.api('portal/saldo');
        if (!r?.success) return;

        // Populate summary
        const totalSaldo = r.data.reduce((s, p) => s + parseFloat(p.saldo || 0), 0);
        const elTotal = document.getElementById('simp-total-saldo');
        if (elTotal) elTotal.textContent = this.rp(totalSaldo);
        const elCount = document.getElementById('simp-produk-count');
        if (elCount) elCount.textContent = r.data.filter(p => parseFloat(p.saldo) > 0).length + ' Produk';
        const elTime = document.getElementById('simp-update-time');
        if (elTime) elTime.textContent = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

        const iconMap = {
            'pokok': 'bi-shield-fill text-blue-500 bg-blue-50 border-blue-100 dark:bg-blue-900/30 dark:border-blue-800/30',
            'wajib': 'bi-shield-check text-emerald-500 bg-emerald-50 border-emerald-100 dark:bg-emerald-900/30 dark:border-emerald-800/30',
            'sukarela': 'bi-piggy-bank text-orange-500 bg-orange-50 border-orange-100 dark:bg-orange-900/30 dark:border-orange-800/30',
            'partisipatif': 'bi-bank text-purple-500 bg-purple-50 border-purple-100 dark:bg-purple-900/30 dark:border-purple-800/30'
        };

        container.innerHTML = r.data.length ? r.data.map((p, i) => {
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
        }).join('') : '<div class="text-center py-10 bg-gray-50 dark:bg-obsidian-900 rounded-2xl border border-dashed border-gray-200 dark:border-obsidian-800"><i class="bi bi-inbox text-3xl text-gray-300 dark:text-obsidian-700"></i><p class="text-xs text-gray-400 dark:text-obsidian-500 mt-2">Belum ada produk simpanan</p></div>';

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
        const r = await this.api('portal/pinjaman');
        if (!r?.success) return;

        // Separate lunas vs non-lunas
        const lunasList = r.data.filter(p => p.status === 'lunas');
        const aktifList = r.data.filter(p => p.status !== 'lunas');

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

        // Render active loans
        container.innerHTML = aktifList.length
            ? aktifList.map((p, i) => renderCard(p, i, aktifList)).join('')
            : '<div class="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200"><i class="bi bi-wallet2 text-4xl text-gray-300"></i><p class="text-sm font-medium text-gray-500 mt-3">Tidak ada pinjaman aktif</p></div>';

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
                listEl.innerHTML = ra.data.map(a => {
                    const isLunas2 = a.status === 'lunas';
                    const isTerlambat = a.status === 'terlambat';
                    const statusBadge = isLunas2
                        ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">Lunas</span>'
                        : (isTerlambat
                            ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400">Terlambat</span>'
                            : '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 dark:bg-obsidian-800 text-gray-600 dark:text-obsidian-500">Belum</span>');
                    const rowBg = isLunas2 ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/30' : (isTerlambat ? 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-800/30' : 'bg-gray-50 dark:bg-obsidian-800/30 border-gray-100 dark:border-obsidian-800');
                    return `
                    <div class="p-3 rounded-xl border ${rowBg}">
                        <div class="flex items-center justify-between mb-1.5">
                            <div class="flex items-center gap-2">
                                <span class="w-7 h-7 rounded-full ${isLunas2 ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-200' : 'bg-gray-200 dark:bg-obsidian-700 text-gray-600 dark:text-obsidian-400'} flex items-center justify-center text-[10px] font-bold">${a.angsuran_ke}</span>
                                <div>
                                    <p class="text-xs font-semibold text-gray-700 dark:text-obsidian-200">Jatuh Tempo: ${this.fdate(a.tgl_jatuh_tempo)}</p>
                                    ${a.tgl_bayar ? '<p class="text-[9px] text-emerald-600 dark:text-emerald-400">Dibayar: ' + this.fdate(a.tgl_bayar) + '</p>' : ''}
                                </div>
                            </div>
                            ${statusBadge}
                        </div>
                        <div class="grid grid-cols-3 gap-1 mt-2 text-center">
                            <div class="bg-white/60 dark:bg-obsidian-900/40 rounded-lg p-1.5">
                                <p class="text-[8px] text-gray-400 dark:text-obsidian-500 mb-0.5">Pokok</p>
                                <p class="text-[10px] font-bold text-gray-700 dark:text-obsidian-100">${this.rp(a.pokok)}</p>
                            </div>
                            <div class="bg-white/60 dark:bg-obsidian-900/40 rounded-lg p-1.5">
                                <p class="text-[8px] text-gray-400 dark:text-obsidian-500 mb-0.5">Bunga</p>
                                <p class="text-[10px] font-bold text-gray-700 dark:text-obsidian-100">${this.rp(a.bunga)}</p>
                            </div>
                            <div class="bg-white/60 dark:bg-obsidian-900/40 rounded-lg p-1.5">
                                <p class="text-[8px] text-gray-400 dark:text-obsidian-500 mb-0.5">Total</p>
                                <p class="text-[10px] font-bold text-gray-800 dark:text-obsidian-100">${this.rp(a.total)}</p>
                            </div>
                        </div>
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

    fdate(d) { return d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'; },

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
        listEl.innerHTML = rm.data.map(t => {
            const isMasuk = t.dk === 'D';
            const colorText = isMasuk ? 'text-emerald-600' : 'text-rose-600';
            const iconCls2 = isMasuk ? 'bi-arrow-down-left text-emerald-500 bg-emerald-50 border-emerald-100' : 'bi-arrow-up-right text-rose-500 bg-rose-50 border-rose-100';
            const prefix = isMasuk ? '+' : '-';
            return `
            <div class="bg-gray-50 dark:bg-obsidian-800/40 p-3 rounded-xl flex items-center justify-between border border-transparent dark:border-obsidian-800/50">
                <div class="flex items-center gap-3">
                    <div class="w-9 h-9 shrink-0 rounded-full flex items-center justify-center border ${iconCls2.split(' ').slice(1).join(' ')} dark:border-opacity-20">
                        <i class="bi ${iconCls2.split(' ')[0]}"></i>
                    </div>
                    <div>
                        <p class="text-xs font-bold text-gray-800 dark:text-obsidian-100">${t.nama_transaksi}</p>
                        <p class="text-[10px] text-gray-500 dark:text-obsidian-500">${this.fdate(t.tgl_transaksi)}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-xs font-bold ${colorText}">${prefix}${this.rp(t.jumlah)}</p>
                    <p class="text-[9px] text-gray-400 dark:text-obsidian-500">Saldo: ${this.rp(t.saldo_sesudah)}</p>
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
        listEl.innerHTML = ra.data.map(a => {
            const isLunas2 = a.status === 'lunas';
            const isTerlambat = a.status === 'terlambat';
            const statusBadge = isLunas2
                ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">Lunas</span>'
                : (isTerlambat
                    ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-700">Terlambat</span>'
                    : '<span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-gray-100 text-gray-600">Belum</span>');
            const rowBg = isLunas2 ? 'bg-emerald-50 border-emerald-100' : (isTerlambat ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100');
            return `
            <div class="p-3 rounded-xl border ${rowBg}">
                <div class="flex items-center justify-between mb-1.5">
                    <div class="flex items-center gap-2">
                        <span class="w-7 h-7 rounded-full ${isLunas2 ? 'bg-emerald-200 text-emerald-800' : 'bg-gray-200 text-gray-600'} flex items-center justify-center text-[10px] font-bold">${a.angsuran_ke}</span>
                        <div>
                            <p class="text-xs font-semibold text-gray-700">Jatuh Tempo: ${this.fdate(a.tgl_jatuh_tempo)}</p>
                            ${a.tgl_bayar ? '<p class="text-[9px] text-emerald-600">Dibayar: ' + this.fdate(a.tgl_bayar) + '</p>' : ''}
                        </div>
                    </div>
                    ${statusBadge}
                </div>
                <div class="grid grid-cols-3 gap-1 mt-2 text-center">
                    <div class="bg-white/60 rounded-lg p-1.5"><p class="text-[8px] text-gray-400 mb-0.5">Pokok</p><p class="text-[10px] font-bold text-gray-700">${this.rp(a.pokok)}</p></div>
                    <div class="bg-white/60 rounded-lg p-1.5"><p class="text-[8px] text-gray-400 mb-0.5">Bunga</p><p class="text-[10px] font-bold text-gray-700">${this.rp(a.bunga)}</p></div>
                    <div class="bg-white/60 rounded-lg p-1.5"><p class="text-[8px] text-gray-400 mb-0.5">Total</p><p class="text-[10px] font-bold text-gray-800">${this.rp(a.total)}</p></div>
                </div>
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
    generateQRCode() {
        const container = document.getElementById('p-qrcode');
        if (container && !container.innerHTML.trim()) {
            new QRCode(container, {
                text: this.member.no_anggota,
                width: 110,
                height: 110,
                colorDark: "#0f172a",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
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
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
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
                document.getElementById('p-lap-time').textContent = new Date(data.last_sync).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

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
