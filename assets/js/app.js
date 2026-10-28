// ============================================
// APP CORE - SPA Router, AJAX, Layout Manager
// ============================================

const App = {
    user: null,
    settings: {}, // Global app settings (from app_settings table)
    menus: [],
    permissions: [],
    csrfToken: '',
    currentRoute: '',
    version: '2.9.9', // Slide-Over Drawer Inspection, Human-Touch Briefing & Serrated Thermal Receipt UX
    _apiCache: {}, // In-memory client cache for master data
    _inFlight: {}, // Promise pooling for deduplicating in-flight requests
    _pageModules: {}, // Cache for loaded page JS modules
    _masterDataEndpoints: [
        'keuangan/akun',
        'jenis-simpanan',
        'jenis-pinjaman',
        'kode-transaksi',
        'roles',
        'settings',
        'menus'
    ],
    API_BASE: (() => {
        // Best way: find the root based on where this script is loaded from
        const script = document.currentScript || document.querySelector('script[src*="assets/js/app.js"]');
        let root = '/';
        if (script && script.src) {
            const url = new URL(script.src);
            root = url.pathname.split('assets/js/app.js')[0];
        } else {
            // Fallback for unexpected cases
            const p = window.location.pathname;
            root = p.substring(0, p.lastIndexOf('/') + 1).replace(/\/$/, '') + '/';
        }
        console.log('[App] Detected root:', root);
        return root + 'api';
    })(),

    // ===== Cached API Helper (0ms response for master data) =====
    async cachedApi(endpoint, ttlMs = 300000, options = {}) {
        return this.api(endpoint, { ...options, cache: true, ttl: ttlMs });
    },

    clearApiCache(prefix = '') {
        if (!prefix) {
            this._apiCache = {};
            return;
        }
        Object.keys(this._apiCache).forEach(k => {
            if (k.startsWith(prefix) || (prefix === 'keuangan' && k.startsWith('keuangan/akun'))) {
                delete this._apiCache[k];
            }
        });
    },

    // ===== High-Performance AJAX Helper (with Auto-Cache & In-Flight Promise Pooling) =====
    async api(endpoint, options = {}) {
        const cleanEp = endpoint.replace(/^\//, '');
        const method = (options.method || 'GET').toUpperCase();
        const isGet = method === 'GET';

        // 1. Auto-cache check for master data GET requests (5 minutes TTL default)
        const isMasterData = isGet && (options.cache !== false) && 
            this._masterDataEndpoints.some(ep => cleanEp === ep || cleanEp.startsWith(ep + '?'));

        if (isMasterData && this._apiCache[cleanEp] && this._apiCache[cleanEp].exp > Date.now()) {
            return JSON.parse(JSON.stringify(this._apiCache[cleanEp].data));
        }

        // 2. In-flight promise pooling (prevents duplicate simultaneous GET requests)
        if (isGet && this._inFlight[cleanEp]) {
            return this._inFlight[cleanEp];
        }

        const url = this.API_BASE + '/' + cleanEp;
        const config = {
            method,
            headers: options.headers || {},
            credentials: 'same-origin'
        };

        if (!config.headers['Content-Type'] && !(options.body instanceof FormData)) {
            config.headers['Content-Type'] = 'application/json';
        }

        // Attach CSRF token for state-changing requests
        if (['POST', 'PUT', 'DELETE'].includes(config.method) && this.csrfToken) {
            config.headers['X-CSRF-Token'] = this.csrfToken;
        }

        if (options.body) {
            if (options.body instanceof FormData) {
                config.body = options.body;
                // Fetch automatically sets boundary for FormData if Content-Type is NOT set manually
                delete config.headers['Content-Type'];
            } else {
                config.body = JSON.stringify(options.body);
            }
        }

        const requestPromise = (async () => {
            try {
                const res = await fetch(url, config);
                const data = await res.json();
                if (res.status === 401 && !cleanEp.includes('auth/login')) {
                    this.showLogin(); 
                    return null;
                }

                // Cache master data response if successful
                if (isMasterData && data && data.success) {
                    this._apiCache[cleanEp] = { data, exp: Date.now() + (options.ttl || 300000) };
                }

                // Auto-invalidate matching cache on state changes
                if (['POST', 'PUT', 'DELETE'].includes(config.method) && data && data.success) {
                    const epBase = cleanEp.split('/')[0].split('?')[0];
                    this.clearApiCache(epBase);
                }
                return data;
            } catch (e) {
                console.error('API Error:', e);
                this.toast('Gagal menghubungi server', 'error');
                return null;
            } finally {
                delete this._inFlight[cleanEp];
            }
        })();

        if (isGet) {
            this._inFlight[cleanEp] = requestPromise;
        }

        return requestPromise;
    },

    // ===== Init =====
    async init() {
        // Load the latest version dynamically from CHANGELOG.md (falls back to hardcoded value if offline)
        await this._loadAppVersion();

        document.getElementById('current-date').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('login-form').addEventListener('submit', e => { e.preventDefault(); this.login(); });
        document.querySelectorAll('.copyright-year').forEach(el => el.textContent = new Date().getFullYear());

        document.addEventListener('click', (e) => {
            if (!e.target || typeof e.target.closest !== 'function') return;
            if (!e.target.closest('.row-dropdown-trigger')) {
                document.querySelectorAll('.row-dropdown-menu').forEach(el => el.classList.add('hidden'));
            }
            if (!e.target.closest('#notif-bell-wrapper')) {
                const nd = document.getElementById('notif-dropdown');
                if (nd && !nd.classList.contains('hidden')) nd.classList.add('hidden');
            }
        });

        // Global Instant Button Ripple Effect (0ms tactile feedback)
        document.addEventListener('pointerdown', (e) => {
            if (!e.target || typeof e.target.closest !== 'function') return;
            const btn = e.target.closest('button, .btn-ripple, .menu-item, .tab-btn');
            if (!btn || btn.disabled) return;

            const rect = btn.getBoundingClientRect();
            const diameter = Math.max(rect.width, rect.height);
            const radius = diameter / 2;

            const ripple = document.createElement('span');
            ripple.className = 'ripple-wave';
            ripple.style.width = ripple.style.height = `${diameter}px`;
            ripple.style.left = `${e.clientX - rect.left - radius}px`;
            ripple.style.top = `${e.clientY - rect.top - radius}px`;

            const prev = btn.querySelector('.ripple-wave');
            if (prev) prev.remove();

            btn.appendChild(ripple);

            setTimeout(() => {
                if (ripple.parentElement) ripple.remove();
            }, 600);
        });

        // Global Instant 0ms Navigation: Prefetch page modules on hover
        document.addEventListener('pointerenter', (e) => {
            if (!e.target || typeof e.target.closest !== 'function') return;
            const link = e.target.closest('#sidebar-menu [data-url], a[href^="#/"]');
            if (!link) return;
            const hash = link.getAttribute('data-url') || link.getAttribute('href');
            if (!hash || !hash.startsWith('#/')) return;
            const page = hash.replace('#/', '').split('?')[0].split('/')[0];
            if (page && !this._pageModules[page]) {
                const basePath = this.API_BASE.substring(0, this.API_BASE.length - 3);
                import(`${basePath}assets/js/pages/${page}.js?v=${this.version}`)
                    .then(mod => { this._pageModules[page] = mod; })
                    .catch(() => {});
            }
        }, { capture: true, passive: true });

        // Global Auto Button Loading on Form Submit
        document.addEventListener('submit', (e) => {
            const form = e.target;
            const submitBtn = form.querySelector('button[type="submit"]:not([data-no-auto-loading])');
            if (submitBtn && !submitBtn.disabled) {
                setTimeout(() => {
                    if (form.checkValidity && !form.checkValidity()) return;
                    App.btnLoading(submitBtn);
                }, 10);
            }
        });

        // 1. Load global settings first (publicly accessible now)
        const settRes = await this.api('settings');
        if (settRes && settRes.success) {
            this.settings = settRes.data;
            this.applyBranding();
        }

        // 2. Fetch public stats for login page
        this.api('public/stats').then(res => {
            if (res && res.success && res.data.total_anggota !== undefined) {
                const el = document.getElementById('login-total-anggota');
                if (el) el.textContent = res.data.total_anggota + ' Anggota';
            }
        });

        // 3. Check auth
        const res = await this.api('auth/me');
        this.initTableDensity();

        if (res && res.success) {
            this.setUser(res.data);
            this.showApp();
        } else {
            this.showLogin();
        }
        window.addEventListener('hashchange', () => this.handleRoute());
        window.addEventListener('focus', () => this.checkNotifications());
        window.addEventListener('resize', () => this.applyCompactSidebarState());

        // Global Unified Table Search Auto-Debounce (350ms)
        // Automatically syncs typing in table search fields to their controllers with cursor focus preservation
        const triggerTableSearch = (id) => {
            const activeInput = document.getElementById(id);
            if (!activeInput) return;
            const cursorPos = activeInput.selectionStart;

            const restoreFocus = () => {
                setTimeout(() => {
                    const el = document.getElementById(id);
                    if (el && document.activeElement !== el) {
                        el.focus();
                        if (typeof cursorPos === 'number') {
                            try { el.setSelectionRange(cursorPos, cursorPos); } catch (_) {}
                        }
                    }
                }, 80);
            };

            if (id === 'anggota-search' && window.AnggotaPage) {
                AnggotaPage.loadList(document.getElementById('app-content'));
                restoreFocus();
            } else if (id === 'simp-search' && window.SimpananPage) {
                SimpananPage.loadList(SimpananPage.container);
                restoreFocus();
            } else if (id === 'pnj-search' && window.PinjamanPage) {
                PinjamanPage.loadList(PinjamanPage.container);
                restoreFocus();
            } else if (id === 'ags-search' && window.AngsuranPage) {
                AngsuranPage.loadList(AngsuranPage.container);
                restoreFocus();
            } else if (id === 'kas-search' && window.KasTransaksiPage) {
                KasTransaksiPage.loadList();
                restoreFocus();
            } else if (id === 'jrn-search' && window.JurnalPage) {
                JurnalPage.load();
                restoreFocus();
            }
        };

        const debouncedTableSearch = this.debounce((id) => {
            triggerTableSearch(id);
        }, 350);

        document.addEventListener('input', (e) => {
            const target = e.target;
            if (!target || target.tagName !== 'INPUT' || target.type !== 'text') return;
            const id = target.id || '';
            if (['anggota-search', 'simp-search', 'pnj-search', 'ags-search', 'kas-search', 'jrn-search'].includes(id)) {
                debouncedTableSearch(id);
            }
        });

        // Clear active chip highlight when user manually modifies date inputs
        document.addEventListener('change', (e) => {
            const target = e.target;
            if (!target || target.tagName !== 'INPUT') return;
            const id = target.id || '';
            if ((id.includes('dari') || id.includes('sampai') || id.includes('date-range')) && !this._isApplyingPreset) {
                const groupKey = id.replace('sampai', 'dari');
                if (this._activeDatePresets) {
                    this._activeDatePresets[groupKey] = null;
                }
                const container = target.closest('.bg-white, div')?.querySelector('.quick-date-chips');
                if (container) {
                    container.querySelectorAll('.date-chip').forEach(c => {
                        c.classList.remove('is-active', 'bg-primary-600', 'text-white', 'shadow-xs', 'font-bold');
                        c.classList.add('bg-slate-100', 'hover:bg-slate-200', 'text-slate-600');
                    });
                }
            }
        });

        // Omni-Search & Productivity Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
                e.preventDefault();
                this.toggleSearch();
            }
            if ((e.altKey && (e.key === 'c' || e.key === 'C')) || ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'c' || e.key === 'C'))) {
                e.preventDefault();
                this.toggleCalculator();
            }
            if (e.key === 'Escape') {
                const calcModal = document.getElementById('calculator-modal');
                if (calcModal && !calcModal.classList.contains('hidden')) {
                    this.toggleCalculator(false);
                    return;
                }
                const searchModal = document.getElementById('omni-search-modal');
                if (searchModal && !searchModal.classList.contains('hidden')) {
                    this.toggleSearch(false);
                    return;
                }
                const modalContainer = document.getElementById('modal-container');
                if (modalContainer && !modalContainer.classList.contains('hidden')) {
                    this.closeModal();
                    return;
                }
                const drawerContainer = document.getElementById('drawer-container');
                if (drawerContainer && !drawerContainer.classList.contains('hidden')) {
                    this.closeDrawer();
                    return;
                }
            }
        });

        // Initialize Productivity Features: Audio Feedback & OmniSearch
        this.initAudio();
        this.initOmniSearch();

        // Set Version on Splash
        const vEl = document.getElementById('splash-version');
        if (vEl) vEl.textContent = `Core Engine v${this.version}`;

        // Dynamic Splash Messages & System Health Check
        const splashMsg = document.getElementById('splash-msg');
        const splashStatus = document.getElementById('splash-status');
        const splashTip = document.getElementById('splash-tip');
        
        const systemTips = [
            "Sistem dioptimalkan dengan Redis v2.0 untuk performa maksimal.",
            "Keamanan data dilindungi oleh Encryption Layer terbaru.",
            "Gunakan Ctrl+K untuk mencari anggota atau menu secara instan.",
            "Sistem cadangan data otomatis berjalan setiap malam.",
            "Monitoring likuiditas membantu pengambilan keputusan tepat.",
            "Log aktivitas mencatat setiap perubahan penting secara detail."
        ];

        if (splashTip) {
            // Show Tip immediately
            const randomTip = systemTips[Math.floor(Math.random() * systemTips.length)];
            splashTip.innerHTML = `<i class="ri-lightbulb-line text-amber-500 animate-pulse"></i> ${randomTip}`;
            
            // Smart Time-Based Greeting
            const hours = new Date().getHours();
            let timeGreeting = "Selamat Malam";
            if (hours < 11) timeGreeting = "Selamat Pagi";
            else if (hours < 15) timeGreeting = "Selamat Siang";
            else if (hours < 19) timeGreeting = "Selamat Sore";

            const userNama = this.user?.nama_lengkap?.split(' ')[0] || '';
            const greeting = userNama ? `${timeGreeting}, ${userNama}` : "Initializing System";
            if (splashMsg) splashMsg.textContent = greeting;
            
            // Phase 1: DB Status
            setTimeout(() => {
                if (splashStatus) {
                    splashStatus.classList.remove('opacity-0');
                    splashStatus.textContent = "Menghubungkan ke Database...";
                }
            }, 400);

            // Phase 2: Redis Status
            setTimeout(() => {
                if (splashStatus) splashStatus.textContent = "Mengaktifkan Redis Cache...";
            }, 1200);

            // Phase 3: Auth Status
            setTimeout(() => {
                if (splashStatus) splashStatus.textContent = "Validasi Sesi Keamanan...";
                if (splashMsg) {
                    splashMsg.textContent = "System Ready";
                    splashMsg.classList.replace('text-primary-600', 'text-emerald-500');
                }
            }, 2200);
        }

        // Hide Splash Screen with smooth transition
        const hideSplash = () => {
            const splash = document.getElementById('splash-screen');
            if (splash && !splash.classList.contains('hidden')) {
                splash.classList.add('opacity-0', 'invisible', 'scale-110');
                setTimeout(() => splash.classList.add('hidden'), 500);
            }
        };
        setTimeout(hideSplash, 1000);
    },

    applyBranding() {
        const getS = (key, def = '') => this.settings[key]?.value || def;
        
        // Update App Name
        const appName = getS('app_name');
        if (appName) {
            const el = document.getElementById('login-app-name');
            if (el) el.textContent = appName;
            document.title = appName;
        }

        // Update Logo
        const logoUrl = getS('logo_url');
        if (logoUrl) {
            const el = document.getElementById('login-logo');
            if (el) el.src = logoUrl;
        }

        // Update Sidebar Koperasi Name
        const kopName = getS('nama_koperasi') || getS('app_name');
        if (kopName) {
            const el = document.getElementById('sidebar-koperasi-name');
            if (el) el.textContent = kopName;
        }
    },

    // ===== Auth =====
    async login() {
        const btn = document.getElementById('login-btn');
        const err = document.getElementById('login-error');
        btn.disabled = true;
        document.getElementById('login-btn-text').textContent = 'Memproses...';
        document.getElementById('login-btn-loader').classList.remove('hidden');
        err.classList.add('hidden');
        const res = await this.api('auth/login', {
            method: 'POST',
            body: { username: document.getElementById('login-username').value, password: document.getElementById('login-password').value }
        });
        btn.disabled = false;
        document.getElementById('login-btn-text').textContent = 'Masuk Dashboard';
        document.getElementById('login-btn-loader').classList.add('hidden');
        if (res && res.success) {
            this.setUser(res.data);

            // 1. Show splash screen instantly
            const splash = document.getElementById('splash-screen');
            if (splash) {
                // Reset states
                splash.classList.remove('hidden', 'opacity-0', 'invisible', 'scale-110');
                splash.classList.add('opacity-100');
                
                // Update text to Dashboard specific
                const sMsg = document.getElementById('splash-msg');
                const sStatus = document.getElementById('splash-status');
                if (sMsg) {
                    sMsg.textContent = "Welcome Back";
                    sMsg.classList.remove('text-emerald-500');
                    sMsg.classList.add('text-primary-600');
                }
                if (sStatus) sStatus.textContent = "Menyiapkan Dashboard Anda...";
            }

            // 2. Hide login page immediately
            document.getElementById('login-page').classList.add('hidden');

            // 3. Wait 1.8s for the "Experience"
            setTimeout(() => {
                // 4. Start fade out
                splash.classList.replace('opacity-100', 'opacity-0');

                setTimeout(() => {
                    // 5. Finally show the app layout and hide splash completely
                    splash.classList.add('hidden');

                    // Load global settings after successful login
                    this.api('settings').then(settRes => {
                        if (settRes && settRes.success) {
                            this.settings = settRes.data;
                        }
                        this.showApp();
                        this.toast('Selamat datang, ' + this.user.nama_lengkap, 'success');
                    });
                }, 500); // Wait for fade out duration (duration-500)
            }, 1800);
        } else {
            const span = err.querySelector('span');
            if (span) span.textContent = res?.message || 'Login gagal';
            else err.textContent = res?.message || 'Login gagal';
            err.classList.remove('hidden');
        }
    },

    async logout() {
        const ok = await this.confirm('Logout', 'Yakin ingin keluar dari sistem?', 'warning');
        if (!ok) return;
        if (this._notifInterval) clearInterval(this._notifInterval);
        await this.api('auth/logout', { method: 'POST' });
        this.user = null;
        this.showLogin();
    },

    setUser(data) {
        this.user = data.user;
        this.menus = data.menus;
        this.permissions = data.permissions || [];
        if (data.csrf_token) this.csrfToken = data.csrf_token;
        document.getElementById('user-name').textContent = this.user.nama_lengkap;
        document.getElementById('user-role').textContent = this.user.role;
        document.getElementById('user-avatar').textContent = this.user.nama_lengkap.charAt(0).toUpperCase();
    },

    hasPerm(code) { return this.permissions.includes(code) || this.user?.role_id == 1; },

    // ===== Layout =====
    showLogin() {
        document.getElementById('login-page').classList.remove('hidden');
        document.getElementById('app-layout').classList.add('hidden');
        const userField = document.getElementById('login-username');
        userField.value = '';
        document.getElementById('login-password').value = '';
        setTimeout(() => userField.focus(), 100);
    },

    sidebarBadges: {},
    isCompactSidebar: false,
    favoriteMenus: [],

    getFavoriteMenus() {
        try {
            return JSON.parse(localStorage.getItem('sidebar_favorite_menus') || '[]');
        } catch (_) {
            return [];
        }
    },

    toggleFavorite(url, e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        let favs = this.getFavoriteMenus();
        if (favs.includes(url)) {
            favs = favs.filter(u => u !== url);
        } else {
            favs.push(url);
        }
        try {
            localStorage.setItem('sidebar_favorite_menus', JSON.stringify(favs));
        } catch (_) {}
        this.favoriteMenus = favs;
        this.renderMenu();
        this.setActiveMenu(this.currentRoute);
    },

    initCompactSidebar() {
        const saved = localStorage.getItem('sidebar_compact_mode');
        this.isCompactSidebar = saved === 'true';
        this.applyCompactSidebarState();
    },

    toggleCompactSidebar() {
        this.isCompactSidebar = !this.isCompactSidebar;
        try {
            localStorage.setItem('sidebar_compact_mode', this.isCompactSidebar ? 'true' : 'false');
        } catch (_) {}
        this.applyCompactSidebarState();
    },

    applyCompactSidebarState() {
        const sb = document.getElementById('sidebar');
        const icon = document.getElementById('icon-toggle-compact');
        const btn = document.getElementById('btn-toggle-compact');
        const topbarIcon = document.getElementById('topbar-compact-icon');
        if (!sb) return;

        if (this.isCompactSidebar && window.innerWidth >= 1024) {
            sb.classList.add('compact');
            if (icon) icon.className = 'ri-sidebar-unfold-line text-sm';
            if (btn) btn.title = 'Perluas Sidebar';
            if (topbarIcon) {
                topbarIcon.className = 'ri-layout-left-line text-lg text-primary-600';
                if (topbarIcon.parentElement) topbarIcon.parentElement.title = 'Perluas Sidebar';
            }
        } else {
            sb.classList.remove('compact');
            if (icon) icon.className = 'ri-sidebar-fold-line text-sm';
            if (btn) btn.title = 'Lipat Sidebar (Mode Ramping)';
            if (topbarIcon) {
                topbarIcon.className = 'ri-layout-left-line text-lg text-gray-500';
                if (topbarIcon.parentElement) topbarIcon.parentElement.title = 'Lipat Sidebar (Mode Ramping)';
            }
        }
    },

    getCollapsedSections() {
        try {
            return JSON.parse(localStorage.getItem('sidebar_collapsed_sections') || '[]');
        } catch (_) {
            return [];
        }
    },

    toggleSection(secId, forceOpen = false) {
        const content = document.getElementById(secId);
        const arrow = document.getElementById('sec_arrow_' + secId);
        if (!content) return;

        let collapsed = this.getCollapsedSections();
        const isCurrentlyCollapsed = content.classList.contains('collapsed');

        if (forceOpen) {
            content.classList.remove('collapsed');
            if (arrow) arrow.classList.remove('collapsed');
            collapsed = collapsed.filter(id => id !== secId);
        } else {
            if (isCurrentlyCollapsed) {
                content.classList.remove('collapsed');
                if (arrow) arrow.classList.remove('collapsed');
                collapsed = collapsed.filter(id => id !== secId);
            } else {
                content.classList.add('collapsed');
                if (arrow) arrow.classList.add('collapsed');
                if (!collapsed.includes(secId)) collapsed.push(secId);
            }
        }

        try {
            localStorage.setItem('sidebar_collapsed_sections', JSON.stringify(collapsed));
        } catch (_) {}

        this.updateSectionHeaderBadge(secId);
    },

    updateSectionHeaderBadge(secId) {
        const badgeEl = document.getElementById('badge_' + secId);
        const content = document.getElementById(secId);
        if (!badgeEl || !content) return;
        const isCollapsed = content.classList.contains('collapsed');
        const count = parseInt(badgeEl.getAttribute('data-count') || '0', 10);
        if (isCollapsed && count > 0) {
            badgeEl.classList.remove('hidden');
        } else {
            badgeEl.classList.add('hidden');
        }
    },

    async fetchSidebarBadges() {
        if (!this.user || document.visibilityState === 'hidden') return;
        try {
            const res = await this.api('menus?badges=1');
            if (res && res.success && res.data) {
                this.sidebarBadges = res.data;
                this.updateBadgeElements();
            }
        } catch (e) {
            // Silently fallback without breaking UI
        }
    },

    updateBadgeElements() {
        // 1. Update individual leaf badges
        document.querySelectorAll('[data-badge-url]').forEach(el => {
            const url = el.getAttribute('data-badge-url');
            const count = this.sidebarBadges[url] || 0;
            const textEl = el.querySelector('span:last-child');
            if (textEl) textEl.textContent = count > 99 ? '99+' : count;
            if (count > 0) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });

        // 2. Update parent submenu pills
        document.querySelectorAll('[data-sub-parent]').forEach(btn => {
            const subId = btn.getAttribute('data-sub-parent');
            const subEl = document.getElementById(subId);
            const pillEl = document.getElementById('parent_badge_' + subId);
            if (!subEl || !pillEl) return;

            let totalPending = 0;
            subEl.querySelectorAll('[data-badge-url]').forEach(leaf => {
                const url = leaf.getAttribute('data-badge-url');
                totalPending += (this.sidebarBadges[url] || 0);
            });

            const textEl = pillEl.querySelector('span:last-child');
            if (textEl) textEl.textContent = totalPending > 99 ? '99+' : totalPending;

            const isOpen = subEl.classList.contains('open');
            if (!isOpen && totalPending > 0) {
                pillEl.classList.remove('hidden');
            } else {
                pillEl.classList.add('hidden');
            }
        });

        // 3. Update section header badges
        document.querySelectorAll('.sidebar-section').forEach(sec => {
            const secId = sec.getAttribute('data-section');
            const content = document.getElementById(secId);
            const badgeEl = document.getElementById('badge_' + secId);
            if (!content || !badgeEl) return;

            let secTotal = 0;
            content.querySelectorAll('[data-badge-url]').forEach(leaf => {
                const url = leaf.getAttribute('data-badge-url');
                secTotal += (this.sidebarBadges[url] || 0);
            });

            badgeEl.setAttribute('data-count', secTotal);
            badgeEl.textContent = secTotal > 99 ? '99+' : secTotal;

            const isCollapsed = content.classList.contains('collapsed');
            if (isCollapsed && secTotal > 0) {
                badgeEl.classList.remove('hidden');
            } else {
                badgeEl.classList.add('hidden');
            }
        });
    },

    async showApp() {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('app-layout').classList.remove('hidden');
        document.getElementById('app-layout').classList.add('flex');

        // Apply compact dock mode preference
        this.initCompactSidebar();

        // Fetch live status badges before rendering so initial paint has accurate counters
        await this.fetchSidebarBadges();

        this.renderMenu();
        if (!location.hash || location.hash === '#/') location.hash = '#/dashboard';
        else this.handleRoute();

        // Check & poll notification pengajuan portal and live status badges
        this.checkNotifications();
        if (this._notifInterval) clearInterval(this._notifInterval);
        this._notifInterval = setInterval(() => {
            this.checkNotifications();
            this.fetchSidebarBadges();
        }, 30000);

        // Auto-populate sidebar version badge from CHANGELOG.md
        await this._loadAppVersion();
    },

    async _loadAppVersion() {
        try {
            const script = document.querySelector('script[src*="assets/js/app.js"]');
            let root = '/';
            if (script?.src) root = new URL(script.src).pathname.split('assets/js/app.js')[0];
            const res = await fetch(root + 'CHANGELOG.md?v=' + Date.now());
            if (!res.ok) return;
            const text = await res.text();
            const match = text.match(/^##\s+\[([^\]]+)\]/m);
            if (match) {
                this.version = match[1].replace(/^v/, '');
                const el = document.getElementById('sidebar-version');
                if (el) el.textContent = this.version;
            }
        } catch { /* silently fail */ }
    },

    toggleSidebar() {
        const sb = document.getElementById('sidebar');
        const ov = document.getElementById('sidebar-overlay');
        sb.classList.toggle('-translate-x-full');
        ov.classList.toggle('hidden');
    },

    // ===== Render Sidebar Menu with Live Badges, Favorites, Collapsible Sections & Organic Tree Lines =====
    renderMenu() {
        const nav = document.getElementById('sidebar-menu');
        const searchEl = document.getElementById('sidebar-search');
        if (searchEl) searchEl.value = '';

        // Build flat list of all leaf items first so favorites and search have immediate access
        this._flatMenuItems = [];
        const collectLeaves = (items) => {
            (items || []).forEach(m => {
                if (m.is_header) { collectLeaves(m.children); return; }
                if (m.children) { collectLeaves(m.children); return; }
                if (m.url) this._flatMenuItems.push({ nama: m.nama, url: m.url, icon: m.icon || 'ri-circle-line' });
            });
        };
        collectLeaves(this.menus);

        this.favoriteMenus = this.getFavoriteMenus();
        const collapsedSections = this.getCollapsedSections();

        // Render Pinned Favorite Menus Section if any exist
        let favoritesHtml = '';
        if (this.favoriteMenus.length > 0) {
            const favItems = this._flatMenuItems.filter(item => this.favoriteMenus.includes(item.url));
            if (favItems.length > 0) {
                favoritesHtml = `
                <div class="sidebar-favorites-section mb-2" data-section="sec_favorites">
                    <div class="sidebar-section-header cursor-default">
                        <span class="sidebar-section-title flex items-center gap-1.5 text-amber-600 font-bold">
                            <i class="ri-star-fill text-amber-500 text-xs"></i>
                            <span>Favorit Saya</span>
                        </span>
                        <span class="text-[9px] bg-amber-50 text-amber-600 border border-amber-200/60 font-bold px-1.5 py-0.2 rounded-full leading-none">${favItems.length}</span>
                    </div>
                    <div class="sidebar-favorites-list">
                        ${favItems.map(item => {
                            const bCount = this.sidebarBadges[item.url] || 0;
                            return `
                            <a href="${item.url}" class="menu-item group" data-url="${item.url}" data-tooltip="${item.nama}">
                                <i class="${item.icon} menu-icon text-amber-500"></i>
                                <span class="flex-1 truncate menu-text">${item.nama}</span>
                                <span class="sidebar-badge ${bCount > 0 ? '' : 'hidden'}" data-badge-url="${item.url}">
                                    <span class="badge-dot"></span>
                                    <span>${bCount > 99 ? '99+' : bCount}</span>
                                </span>
                                <button type="button" onclick="App.toggleFavorite('${item.url}', event)" 
                                    class="menu-star text-amber-400 hover:text-red-500" 
                                    title="Hapus dari favorit">
                                    <i class="ri-star-fill text-xs"></i>
                                </button>
                            </a>`;
                        }).join('')}
                    </div>
                    <div class="mx-3 my-1.5 border-b border-gray-100"></div>
                </div>`;
            }
        }

        const renderItem = (m) => {
            if (m.children && m.children.length) {
                const id = 'sub_' + m.id;
                let parentPending = 0;
                m.children.forEach(c => {
                    if (c.url && this.sidebarBadges[c.url]) parentPending += this.sidebarBadges[c.url];
                });

                return `<div>
                    <button onclick="App.toggleSubmenu('${id}')" class="menu-item w-full group" data-sub-parent="${id}" data-tooltip="${m.nama}">
                        <i class="${m.icon} menu-icon"></i>
                        <span class="flex-1 text-left truncate menu-text">${m.nama}</span>
                        <span class="parent-pending-pill ${parentPending > 0 ? '' : 'hidden'}" id="parent_badge_${id}">
                            <span class="badge-dot"></span>
                            <span>${parentPending > 99 ? '99+' : parentPending}</span>
                        </span>
                        <i class="ri-arrow-down-s-line menu-arrow" id="arrow_${id}"></i>
                    </button>
                    <div id="${id}" class="submenu">
                        ${m.children.map(c => {
                            const bCount = this.sidebarBadges[c.url] || 0;
                            const isFav = this.favoriteMenus.includes(c.url);
                            return `<a href="${c.url}" class="submenu-item group" data-url="${c.url}" data-tooltip="${c.nama}">
                                <span class="truncate flex-1 menu-text">${c.nama}</span>
                                <span class="sidebar-badge ${bCount > 0 ? '' : 'hidden'}" data-badge-url="${c.url}">
                                    <span class="badge-dot"></span>
                                    <span>${bCount > 99 ? '99+' : bCount}</span>
                                </span>
                                <button type="button" onclick="App.toggleFavorite('${c.url}', event)" 
                                    class="menu-star ${isFav ? 'text-amber-400' : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-400'}" 
                                    title="${isFav ? 'Hapus dari favorit' : 'Tambah ke favorit'}">
                                    <i class="${isFav ? 'ri-star-fill' : 'ri-star-line'} text-xs"></i>
                                </button>
                            </a>`;
                        }).join('')}
                    </div>
                </div>`;
            }
            const bCount = this.sidebarBadges[m.url] || 0;
            const isFav = this.favoriteMenus.includes(m.url);
            return `<a href="${m.url}" class="menu-item group" data-url="${m.url}" data-tooltip="${m.nama}">
                <i class="${m.icon} menu-icon"></i>
                <span class="flex-1 truncate menu-text">${m.nama}</span>
                <span class="sidebar-badge ${bCount > 0 ? '' : 'hidden'}" data-badge-url="${m.url}">
                    <span class="badge-dot"></span>
                    <span>${bCount > 99 ? '99+' : bCount}</span>
                </span>
                <button type="button" onclick="App.toggleFavorite('${m.url}', event)" 
                    class="menu-star ${isFav ? 'text-amber-400' : 'text-gray-300 opacity-0 group-hover:opacity-100 hover:text-amber-400'}" 
                    title="${isFav ? 'Hapus dari favorit' : 'Tambah ke favorit'}">
                    <i class="${isFav ? 'ri-star-fill' : 'ri-star-line'} text-xs"></i>
                </button>
            </a>`;
        };

        const sectionsHtml = this.menus.map((m, idx) => {
            if (m.is_header) {
                const secId = 'sec_' + (m.nama || ('item_' + idx)).toLowerCase().replace(/[^a-z0-9]/g, '_');
                const isSecCollapsed = collapsedSections.includes(secId);

                // Calculate pending count in this section
                let secPendingCount = 0;
                const countPending = (items) => {
                    (items || []).forEach(item => {
                        if (item.url && this.sidebarBadges[item.url]) {
                            secPendingCount += this.sidebarBadges[item.url];
                        }
                        if (item.children) countPending(item.children);
                    });
                };
                countPending(m.children);

                return `
                <div class="sidebar-section" data-section="${secId}">
                    <button type="button" onclick="App.toggleSection('${secId}')" class="sidebar-section-header group" title="Klik untuk melipat / membuka kategori ${m.nama}">
                        <span class="sidebar-section-title">${m.nama}</span>
                        <div class="flex items-center">
                            <span class="section-pending-badge ${secPendingCount > 0 && isSecCollapsed ? '' : 'hidden'}" id="badge_${secId}" data-count="${secPendingCount}">
                                ${secPendingCount > 99 ? '99+' : secPendingCount}
                            </span>
                            <i class="ri-arrow-down-s-line section-chevron ${isSecCollapsed ? 'collapsed' : ''}" id="sec_arrow_${secId}"></i>
                        </div>
                    </button>
                    <div id="${secId}" class="sidebar-section-content ${isSecCollapsed ? 'collapsed' : ''}">
                        ${(m.children || []).map(c => renderItem(c)).join('')}
                    </div>
                </div>`;
            }
            return renderItem(m);
        }).join('');

        nav.innerHTML = favoritesHtml + sectionsHtml;
    },

    filterMenu(query) {
        const nav = document.getElementById('sidebar-menu');
        const q = (query || '').trim().toLowerCase();

        if (!q) {
            this.renderMenu();
            this.setActiveMenu(this.currentRoute);
            return;
        }

        const matches = (this._flatMenuItems || []).filter(m => m.nama.toLowerCase().includes(q));

        if (matches.length === 0) {
            nav.innerHTML = `
            <div class="px-4 py-8 text-center">
                <i class="ri-search-line text-3xl text-gray-200"></i>
                <p class="mt-2 text-xs text-gray-400">Tidak ditemukan</p>
            </div>`;
            return;
        }

        const highlight = (text) => {
            const idx = text.toLowerCase().indexOf(q);
            if (idx === -1) return text;
            return text.slice(0, idx) + '<mark class="bg-yellow-100 text-yellow-800 rounded px-0.5">' + text.slice(idx, idx + q.length) + '</mark>' + text.slice(idx + q.length);
        };

        nav.innerHTML = `<div class="px-2 pt-1 pb-2">
            <p class="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-2 mb-1">${matches.length} hasil</p>
            ${matches.map(m => {
                const bCount = this.sidebarBadges[m.url] || 0;
                return `
                <a href="${m.url}" class="menu-item group" data-url="${m.url}" data-tooltip="${m.nama}">
                    <i class="${m.icon} menu-icon"></i>
                    <span class="flex-1 truncate menu-text">${highlight(m.nama)}</span>
                    <span class="sidebar-badge ${bCount > 0 ? '' : 'hidden'}" data-badge-url="${m.url}">
                        <span class="badge-dot"></span>
                        <span>${bCount > 99 ? '99+' : bCount}</span>
                    </span>
                </a>`;
            }).join('')}
        </div>`;
    },

    toggleSubmenu(id, forceOpen = false) {
        const sub = document.getElementById(id);
        const arrow = document.getElementById('arrow_' + id);
        const parentPill = document.getElementById('parent_badge_' + id);
        if (!sub) return;

        if (forceOpen) {
            sub.classList.add('open');
            if (arrow) arrow.style.transform = 'rotate(180deg)';
            if (parentPill) parentPill.classList.add('hidden');
        } else {
            sub.classList.toggle('open');
            const isOpen = sub.classList.contains('open');
            if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : '';

            // If closed, check if parent pill should show
            if (parentPill) {
                let totalPending = 0;
                sub.querySelectorAll('[data-badge-url]').forEach(leaf => {
                    const url = leaf.getAttribute('data-badge-url');
                    totalPending += (this.sidebarBadges[url] || 0);
                });
                if (!isOpen && totalPending > 0) {
                    parentPill.classList.remove('hidden');
                } else {
                    parentPill.classList.add('hidden');
                }
            }
        }
    },

    setActiveMenu(hash) {
        document.querySelectorAll('#sidebar-menu .menu-item, #sidebar-menu .submenu-item').forEach(el => el.classList.remove('active'));
        const link = document.querySelector(`#sidebar-menu [data-url="${hash}"]`);
        if (link) {
            link.classList.add('active');

            // Auto-expand parent submenu if inside one
            const parent = link.closest('.submenu');
            if (parent) {
                this.toggleSubmenu(parent.id, true);
            }

            // Auto-expand parent section if collapsed
            const secContent = link.closest('.sidebar-section-content');
            if (secContent && secContent.classList.contains('collapsed')) {
                this.toggleSection(secContent.id, true);
            }
        }
    },

    // ===== Router =====
    async handleRoute() {
        this.detachStickySummary();
        const hash = location.hash || '#/dashboard';
        if (hash === this.currentRoute && !hash.includes('?')) return; // Allow re-route if query params change
        this.currentRoute = hash;
        this.setActiveMenu(hash.split('?')[0]); // Highlight menu based on base path

        const content = document.getElementById('app-content');
        content.innerHTML = '<div class="flex items-center justify-center h-64"><div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div></div>';
        
        const route = hash.replace('#/', '');
        const [path, query] = route.split('?');
        const parts = path.split('/');
        const page = parts[0] || 'dashboard';
        const param = parts[1] || null;

        // Parse query params
        this.queryParams = {};
        if (query) {
            query.split('&').forEach(p => {
                const [key, val] = p.split('=');
                if (key) this.queryParams[key] = decodeURIComponent(val || '');
            });
        }

        try {
            const basePath = this.API_BASE.substring(0, this.API_BASE.length - 3);
            let mod = this._pageModules[page];
            if (!mod) {
                mod = await import(`${basePath}assets/js/pages/${page}.js?v=${this.version}`);
                this._pageModules[page] = mod;
            }
            if (mod.default && typeof mod.default.render === 'function') {
                await mod.default.render(content, param);
                setTimeout(() => this.enhanceSelects(content), 100);
            }
        } catch (e) {
            console.error('Page load error:', e);
            content.innerHTML = `<div class="text-center py-20"><i class="ri-error-warning-line text-6xl text-gray-300"></i><p class="mt-4 text-gray-500 text-lg">Halaman tidak ditemukan</p><p class="text-gray-400 text-sm mt-1">${hash}</p></div>`;
        }
        // Close mobile sidebar
        const sb = document.getElementById('sidebar');
        if (!sb.classList.contains('-translate-x-full') && window.innerWidth < 1024) this.toggleSidebar();
    },

    setTitle(title, subtitle = '') {
        this.detachStickySummary();
        document.getElementById('page-title').textContent = title;
        const st = document.getElementById('page-subtitle');
        if (subtitle) { st.textContent = subtitle; st.classList.remove('hidden'); }
        else st.classList.add('hidden');
    },

    // ===== Toast =====
    toast(msg, type = 'info', duration = 3000) {
        if (type === 'error' || type === 'warning') {
            document.querySelectorAll('button[type="submit"]:disabled').forEach(btn => this.btnReset(btn));
        }
        const c = document.getElementById('toast-container');
        const colors = { success: 'bg-emerald-500', error: 'bg-red-500', warning: 'bg-amber-500', info: 'bg-blue-500' };
        const icons = { success: 'ri-check-line', error: 'ri-close-line', warning: 'ri-alert-line', info: 'ri-information-line' };
        const el = document.createElement('div');
        el.className = `toast-enter flex items-center gap-3 ${colors[type]} text-white px-5 py-3 rounded-xl shadow-lg text-sm max-w-sm`;
        el.innerHTML = `<i class="${icons[type]} text-lg"></i><span class="flex-1">${msg}</span>`;
        c.appendChild(el);
        setTimeout(() => { el.classList.replace('toast-enter', 'toast-leave'); setTimeout(() => el.remove(), 300); }, duration);
    },

    // ===== SweetAlert2 Confirm =====
    async confirm(title, text, icon = 'warning') {
        const result = await Swal.fire({
            title,
            text,
            icon,
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Ya, Lanjutkan',
            cancelButtonText: 'Batal',
            reverseButtons: true,
            customClass: { popup: 'swal-popup' }
        });
        return result.isConfirmed;
    },

    // ===== SweetAlert2 Success =====
    swalSuccess(title, text = '') {
        Swal.fire({ icon: 'success', title, text, timer: 2000, showConfirmButton: false });
    },

    // ===== Modal =====
    openModal(html, size = 'max-w-2xl') {
        const mc = document.getElementById('modal-content');
        if (mc) {
            mc.className = mc.className.replace(/max-w-[^\s]+/g, '').trim();
            mc.classList.add(size);
            if (size === 'max-w-6xl') mc.style.maxWidth = '1152px';
            else if (size === 'max-w-5xl') mc.style.maxWidth = '1024px';
            else if (size === 'max-w-4xl') mc.style.maxWidth = '896px';
            else if (size === 'max-w-3xl') mc.style.maxWidth = '768px';
            else mc.style.maxWidth = '';
            mc.innerHTML = html;
        }
        document.getElementById('modal-container').classList.remove('hidden');
        setTimeout(() => this.enhanceSelects(mc), 25);
    },
    openModalLoading(title = 'Memuat Data...', size = 'max-w-2xl') {
        const skeletonHtml = `
            <div class="p-6">
                <div class="flex items-center justify-between border-b border-gray-100 pb-4 mb-5">
                    <div class="flex items-center gap-3">
                        <div class="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                        <h3 class="text-lg font-bold text-gray-800">${title}</h3>
                    </div>
                    <button onclick="App.closeModal()" class="text-gray-400 hover:text-gray-600 text-lg transition-colors"><i class="ri-close-line"></i></button>
                </div>
                <div class="space-y-4 animate-pulse">
                    <div class="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div class="h-10 bg-gray-100 rounded-xl"></div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="h-10 bg-gray-100 rounded-xl"></div>
                        <div class="h-10 bg-gray-100 rounded-xl"></div>
                    </div>
                    <div class="h-20 bg-gray-100 rounded-xl"></div>
                </div>
            </div>`;
        this.openModal(skeletonHtml, size);
    },
    closeModal() {
        document.querySelectorAll('.smart-select-wrapper.is-open').forEach(w => {
            if (w._smartSelectClose) w._smartSelectClose();
        });
        const mc = document.getElementById('modal-content');
        if (mc) {
            mc.className = mc.className.replace(/max-w-[^\s]+/g, '').trim();
            mc.classList.add('max-w-2xl');
            mc.style.maxWidth = '';
            mc.innerHTML = '';
        }
        document.getElementById('modal-container').classList.add('hidden');
    },

    // ============================================================
    // SLIDE-OVER DRAWER INSPECTION (Panel Samping Non-Destruktif)
    // ============================================================
    _drawerState: null,

    openDrawer(contentHtml, opts = {}) {
        const container = document.getElementById('drawer-container');
        const backdrop = document.getElementById('drawer-backdrop');
        const panel = document.getElementById('drawer-panel');
        const headerLeft = document.getElementById('drawer-header-left');
        const headerRight = document.getElementById('drawer-header-right');
        const body = document.getElementById('drawer-content');
        const footer = document.getElementById('drawer-footer');

        if (!container || !panel || !body) return;

        this._drawerState = opts;

        // Reset and apply width
        panel.className = panel.className.replace(/max-w-[^\s]+/g, '').trim();
        const widthClass = opts.width || 'max-w-xl';
        panel.classList.add(widthClass);

        // Header Left: Icon, Title, Subtitle, Badge
        const iconHtml = opts.icon ? `<div class="w-9 h-9 rounded-xl ${opts.iconBg || 'bg-primary-50 text-primary-600'} flex items-center justify-center text-lg shrink-0"><i class="${opts.icon}"></i></div>` : '';
        const titleHtml = opts.title ? `<div class="min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
                <h3 class="text-base font-black text-slate-800 tracking-tight truncate">${opts.title}</h3>
                ${opts.badge || ''}
            </div>
            ${opts.subtitle ? `<p class="text-xs text-slate-500 font-medium truncate">${opts.subtitle}</p>` : ''}
        </div>` : '<div class="text-sm font-bold text-slate-700">Inspeksi Data</div>';

        if (headerLeft) headerLeft.innerHTML = `${iconHtml}${titleHtml}`;

        // Header Right: Prev/Next record controls & Close button
        let navHtml = '';
        if (opts.nav) {
            const { hasPrev, hasNext, onPrev, onNext, currentIdx, total } = opts.nav;
            navHtml = `
                <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-xl mr-2 text-xs font-semibold text-slate-600">
                    <button type="button" class="px-2 py-1 rounded-lg hover:bg-white hover:shadow-xs transition-all disabled:opacity-30 disabled:hover:bg-transparent" ${!hasPrev ? 'disabled' : ''} onclick="${onPrev || ''}" title="Data Sebelumnya">
                        <i class="ri-arrow-left-s-line"></i>
                    </button>
                    ${total ? `<span class="px-1 text-[11px] font-mono font-bold text-slate-500">${currentIdx || 1}/${total}</span>` : ''}
                    <button type="button" class="px-2 py-1 rounded-lg hover:bg-white hover:shadow-xs transition-all disabled:opacity-30 disabled:hover:bg-transparent" ${!hasNext ? 'disabled' : ''} onclick="${onNext || ''}" title="Data Berikutnya">
                        <i class="ri-arrow-right-s-line"></i>
                    </button>
                </div>
            `;
        }

        const closeBtnHtml = `
            <button type="button" onclick="App.closeDrawer()" class="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors" title="Tutup Panel (Esc)">
                <i class="ri-close-line text-lg"></i>
            </button>
        `;

        if (headerRight) headerRight.innerHTML = `${navHtml}${closeBtnHtml}`;

        // Content
        body.innerHTML = contentHtml;

        // Footer
        if (footer) {
            if (opts.footerHtml) {
                footer.classList.remove('hidden');
                footer.innerHTML = opts.footerHtml;
            } else {
                footer.classList.remove('hidden');
                footer.innerHTML = `
                    <div class="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                        <kbd class="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-mono">ESC</kbd> untuk menutup panel
                    </div>
                    <button type="button" onclick="App.closeDrawer()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all">
                        Selesai
                    </button>
                `;
            }
        }

        // Show container and animate slide in
        container.classList.remove('hidden');
        requestAnimationFrame(() => {
            container.classList.add('drawer-open');
            if (backdrop) backdrop.classList.remove('opacity-0');
            if (panel) panel.classList.remove('translate-x-full');
        });

        setTimeout(() => this.enhanceSelects(body), 50);
    },

    openDrawerLoading(title = 'Memuat Data...', opts = {}) {
        const skeleton = `
            <div class="space-y-6 animate-pulse">
                <div class="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                    <div class="h-4 bg-slate-200 rounded w-1/3"></div>
                    <div class="h-8 bg-slate-100 rounded-xl"></div>
                    <div class="grid grid-cols-2 gap-3 pt-2">
                        <div class="h-12 bg-slate-100 rounded-xl"></div>
                        <div class="h-12 bg-slate-100 rounded-xl"></div>
                    </div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-slate-100 space-y-3">
                    <div class="h-4 bg-slate-200 rounded w-1/4"></div>
                    <div class="h-20 bg-slate-100 rounded-xl"></div>
                </div>
            </div>
        `;
        this.openDrawer(skeleton, {
            title,
            subtitle: 'Mengambil data dari server...',
            icon: 'ri-loader-4-line animate-spin',
            ...opts
        });
    },

    closeDrawer() {
        const container = document.getElementById('drawer-container');
        const backdrop = document.getElementById('drawer-backdrop');
        const panel = document.getElementById('drawer-panel');

        if (!container || !panel) return;

        container.classList.remove('drawer-open');
        if (backdrop) backdrop.classList.add('opacity-0');
        if (panel) panel.classList.add('translate-x-full');

        setTimeout(() => {
            container.classList.add('hidden');
            const body = document.getElementById('drawer-content');
            if (body) body.innerHTML = '';
            if (this._drawerState?.onClose && typeof this._drawerState.onClose === 'function') {
                this._drawerState.onClose();
            }
            this._drawerState = null;
        }, 300);
    },

    async inspectAnggota(id) {
        this.openDrawerLoading('Memuat Profil Anggota...', { icon: 'ri-user-search-line' });

        const res = await this.api(`anggota/${id}`);
        if (!res?.success || !res.data) {
            this.closeDrawer();
            this.toast('Gagal memuat profil anggota', 'error');
            return;
        }

        const a = res.data;
        const tenure = a.tgl_daftar ? (new Date().getFullYear() - new Date(a.tgl_daftar).getFullYear()) : 0;
        const totalSimpanan = (a.saldo_simpanan || []).reduce((acc, s) => acc + parseFloat(s.saldo || 0), 0);
        const pinjamanAktif = (a.pinjaman || []).filter(p => p.status === 'cair');
        const sisaPinjaman = pinjamanAktif.reduce((acc, p) => acc + parseFloat(p.sisa_pinjaman || 0), 0);

        const statusBadge = a.status === 'aktif' 
            ? '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200">Aktif</span>'
            : `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600">${a.status}</span>`;

        const html = `
            <div class="space-y-6">
                <!-- Profile Header Card -->
                <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center gap-4">
                    <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-primary-200 shrink-0">
                        ${a.nama.charAt(0).toUpperCase()}
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                            <h4 class="text-lg font-black text-slate-900 truncate">${a.nama}</h4>
                            ${statusBadge}
                        </div>
                        <p class="font-mono text-xs font-bold text-slate-400 tracking-wider">${a.no_anggota}</p>
                        <p class="text-xs text-slate-500 mt-1 flex items-center gap-1">
                            <i class="ri-calendar-line text-slate-400"></i> Terdaftar sejak ${this.formatDate(a.tgl_daftar)} (${tenure > 0 ? tenure + ' tahun' : '< 1 thn'})
                        </p>
                    </div>
                </div>

                <!-- Financial Snapshot -->
                <div class="grid grid-cols-2 gap-3">
                    <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                        <div class="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                            <i class="ri-wallet-3-line text-emerald-500"></i> Total Simpanan
                        </div>
                        <div class="text-base font-black text-slate-900 font-mono">${this.formatRupiah(totalSimpanan)}</div>
                        <div class="text-[10px] text-slate-400 mt-0.5">${(a.saldo_simpanan || []).length} Rekening Aktif</div>
                    </div>
                    <div class="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                        <div class="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                            <i class="ri-hand-coin-line text-amber-500"></i> Sisa Pinjaman
                        </div>
                        <div class="text-base font-black text-amber-600 font-mono">${this.formatRupiah(sisaPinjaman)}</div>
                        <div class="text-[10px] text-slate-400 mt-0.5">${pinjamanAktif.length} Pinjaman Berjalan</div>
                    </div>
                </div>

                <!-- Savings Breakdown Pill List -->
                ${(a.saldo_simpanan || []).length > 0 ? `
                <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3">
                    <h5 class="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                        <span>Rincian Simpanan</span>
                        <a href="#/simpanan" onclick="App.closeDrawer()" class="text-primary-600 hover:underline normal-case font-semibold text-[11px]">Buka Simpanan →</a>
                    </h5>
                    <div class="space-y-2">
                        ${a.saldo_simpanan.map(s => `
                        <div class="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0 text-xs">
                            <span class="font-semibold text-slate-700">${s.nama}</span>
                            <span class="font-bold font-mono text-slate-900">${this.formatRupiah(s.saldo)}</span>
                        </div>
                        `).join('')}
                    </div>
                </div>` : ''}

                <!-- Contact & Identity Details -->
                <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3">
                    <h5 class="text-xs font-black uppercase tracking-wider text-slate-400">Identitas & Kontak</h5>
                    <div class="grid grid-cols-2 gap-3 text-xs">
                        <div>
                            <span class="text-slate-400 block text-[10px] uppercase font-bold">NIK</span>
                            <span class="font-mono font-semibold text-slate-800">${a.nik || '-'}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px] uppercase font-bold">Telepon</span>
                            <span class="font-semibold text-slate-800">${a.telepon || '-'}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                            <span class="font-semibold text-slate-800 truncate block">${a.email || '-'}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px] uppercase font-bold">Pekerjaan</span>
                            <span class="font-semibold text-slate-800">${a.pekerjaan || '-'}</span>
                        </div>
                        <div class="col-span-2">
                            <span class="text-slate-400 block text-[10px] uppercase font-bold">Alamat</span>
                            <span class="font-medium text-slate-700">${a.alamat || '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const footerHtml = `
            <div class="flex items-center gap-2">
                <a href="#/anggota/${id}" onclick="App.closeDrawer()" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5">
                    <i class="ri-fullscreen-line"></i> Halaman Penuh
                </a>
            </div>
            <div class="flex items-center gap-2">
                <button type="button" onclick="App.closeDrawer(); if(window.AnggotaPage) AnggotaPage.form(${id});" class="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-md shadow-primary-500/20 transition-all flex items-center gap-1.5">
                    <i class="ri-edit-line"></i> Edit Anggota
                </button>
            </div>
        `;

        this.openDrawer(html, {
            title: a.nama,
            subtitle: `ID: ${a.no_anggota} • Inspeksi Cepat`,
            icon: 'ri-user-3-line',
            footerHtml
        });
    },

    async inspectPinjaman(id) {
        this.openDrawerLoading('Memuat Rincian Pinjaman...', { icon: 'ri-hand-coin-line' });

        const res = await this.api(`pinjaman/${id}`);
        if (!res?.success || !res.data) {
            this.closeDrawer();
            this.toast('Gagal memuat rincian pinjaman', 'error');
            return;
        }

        const p = res.data;
        const sisaPokok = parseFloat(p.sisa_pinjaman || 0);
        const jumlahPlafon = parseFloat(p.jumlah || 0);
        const terbayar = Math.max(0, jumlahPlafon - sisaPokok);
        const progressPct = jumlahPlafon > 0 ? Math.min(100, Math.round((terbayar / jumlahPlafon) * 100)) : 0;

        let stampHtml = '';
        if (p.status === 'lunas') {
            stampHtml = this.renderRubberStamp({ type: 'lunas', size: 'sm', title: 'LUNAS', sub: 'PEMBIAYAAN TUNTAS' });
        } else if (p.status === 'cair') {
            stampHtml = this.renderRubberStamp({ type: 'approved', size: 'sm', title: 'AKTIF', sub: 'BERJALAN' });
        } else if (p.status === 'ditolak') {
            stampHtml = this.renderRubberStamp({ type: 'rejected', size: 'sm', title: 'DITOLAK', sub: 'KOMITE KREDIT' });
        }

        const html = `
            <div class="space-y-6">
                <!-- Loan Summary Card with Rubber Stamp -->
                <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs relative overflow-hidden">
                    ${stampHtml ? `<div class="absolute right-3 top-3 pointer-events-none opacity-85">${stampHtml}</div>` : ''}
                    <div>
                        <span class="text-[10px] font-mono font-bold text-primary-600 uppercase tracking-widest">${p.no_pinjaman}</span>
                        <h4 class="text-xl font-black text-slate-900 mt-0.5">${this.formatRupiah(jumlahPlafon)}</h4>
                        <p class="text-xs text-slate-500 font-medium">${p.jenis_pinjaman || 'Pinjaman Reguler'} • Tenor ${p.tenor} Bulan</p>
                    </div>

                    <!-- Progress Bar -->
                    <div class="mt-4 pt-3 border-t border-slate-50">
                        <div class="flex justify-between text-xs font-bold mb-1">
                            <span class="text-slate-500">Progres Pelunasan</span>
                            <span class="text-primary-600 font-mono">${progressPct}%</span>
                        </div>
                        <div class="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500" style="width: ${progressPct}%"></div>
                        </div>
                        <div class="flex justify-between text-[10px] text-slate-400 font-mono mt-1.5">
                            <span>Terbayar: ${this.formatRupiah(terbayar)}</span>
                            <span>Sisa: ${this.formatRupiah(sisaPokok)}</span>
                        </div>
                    </div>
                </div>

                <!-- Borrower Card -->
                <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs flex items-center justify-between">
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-black shrink-0">
                            ${(p.anggota_nama || 'A').charAt(0)}
                        </div>
                        <div class="min-w-0">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Peminjam</span>
                            <div class="text-sm font-black text-slate-800 truncate">${p.anggota_nama}</div>
                            <div class="text-xs font-mono text-slate-400">${p.no_anggota || '-'}</div>
                        </div>
                    </div>
                    <button type="button" onclick="App.inspectAnggota(${p.anggota_id})" class="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold transition-all shrink-0">
                        Lihat Anggota
                    </button>
                </div>

                <!-- Loan Parameters -->
                <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3">
                    <h5 class="text-xs font-black uppercase tracking-wider text-slate-400">Parameter Pembiayaan</h5>
                    <div class="grid grid-cols-2 gap-3 text-xs font-mono">
                        <div>
                            <span class="text-slate-400 block text-[10px] uppercase font-sans font-bold">Bunga / Jasa</span>
                            <span class="font-bold text-slate-800">${p.bunga_persen}% / bln (${p.metode_bunga || 'flat'})</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px] uppercase font-sans font-bold">Angsuran / Bln</span>
                            <span class="font-bold text-slate-900">${this.formatRupiah(p.angsuran_bulanan || 0)}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px] uppercase font-sans font-bold">Tgl Pengajuan</span>
                            <span class="font-sans font-semibold text-slate-700">${this.formatDate(p.tgl_pengajuan)}</span>
                        </div>
                        <div>
                            <span class="text-slate-400 block text-[10px] uppercase font-sans font-bold">Tgl Pencairan</span>
                            <span class="font-sans font-semibold text-slate-700">${p.tgl_cair ? this.formatDate(p.tgl_cair) : '-'}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const footerHtml = `
            <div class="flex items-center gap-2">
                <a href="#/pinjaman/${id}" onclick="App.closeDrawer()" class="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5">
                    <i class="ri-fullscreen-line"></i> Halaman Penuh
                </a>
            </div>
            <div class="flex items-center gap-2">
                <a href="#/kartu-angsuran?pinjaman_id=${id}" onclick="App.closeDrawer()" class="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5">
                    <i class="ri-file-list-3-line"></i> Kartu Angsuran
                </a>
            </div>
        `;

        this.openDrawer(html, {
            title: `Pinjaman #${p.no_pinjaman}`,
            subtitle: `${p.anggota_nama} • Inspeksi Pembiayaan`,
            icon: 'ri-hand-coin-line',
            footerHtml
        });
    },

    // ===== Button Instant Loading Helpers =====
    btnLoading(btn, text = 'Memproses...') {
        if (!btn) return;
        if (!btn.dataset.origHtml) {
            btn.dataset.origHtml = btn.innerHTML;
        }
        btn.disabled = true;
        btn.classList.add('opacity-85', 'cursor-not-allowed');
        btn.innerHTML = `<span class="btn-spinner mr-2"></span><span>${text}</span>`;
    },

    btnReset(btn) {
        if (!btn) return;
        if (btn.dataset.origHtml) {
            btn.innerHTML = btn.dataset.origHtml;
            delete btn.dataset.origHtml;
        }
        btn.disabled = false;
        btn.classList.remove('opacity-85', 'cursor-not-allowed');
    },

    toggleSearch() {
        const modal = document.getElementById('omni-search-modal');
        const content = document.getElementById('omni-search-content');
        const input = document.getElementById('omni-search-input');

        if (modal.classList.contains('hidden')) {
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.add('opacity-100');
                content.classList.remove('scale-95');
                content.classList.add('scale-100');
                input.focus();
            }, 10);
        } else {
            modal.classList.remove('opacity-100');
            content.classList.remove('scale-100');
            content.classList.add('scale-95');
            setTimeout(() => {
                modal.classList.add('hidden');
                input.value = '';
            }, 300);
        }
    },

    renderSearchResults(results) {
        const container = document.getElementById('omni-search-results');
        if (!results.length) {
            container.innerHTML = '<div class="p-8 text-center text-slate-400"><i class="ri-find-replace-line text-4xl mb-3 block opacity-20"></i><p class="text-sm font-medium">Tidak ada hasil ditemukan.</p></div>';
            return;
        }

        container.innerHTML = results.map((r, i) => `
            <div onclick="App.openSearchUrl('${r.url}')" class="group flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl cursor-pointer transition-all border border-transparent hover:border-slate-100">
                <div class="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-primary-600 group-hover:shadow-md transition-all">
                    <i class="${r.icon} text-xl"></i>
                </div>
                <div class="flex-1">
                    <div class="flex items-center justify-between">
                        <h5 class="text-sm font-bold text-slate-800">${r.title}</h5>
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-300 group-hover:text-primary-400 transition-colors">${r.type}</span>
                    </div>
                    <p class="text-xs text-slate-400 font-medium">${r.subtitle}</p>
                </div>
                <i class="ri-arrow-right-s-line text-slate-300 group-hover:translate-x-1 transition-transform"></i>
            </div>
        `).join('');
    },

    openSearchUrl(url) {
        this.toggleSearch();
        location.hash = url;
    },

    toggleMagicMenu() {
        const menu = document.getElementById('magic-menu');
        const icon = document.getElementById('magic-btn-icon');
        if (!menu || !icon) return;

        const isOpen = !menu.classList.contains('scale-0');
        if (isOpen) {
            menu.classList.add('scale-0', 'opacity-0', 'pointer-events-none');
            menu.classList.remove('scale-100', 'opacity-100', 'pointer-events-auto');
            icon.classList.remove('rotate-45');
        } else {
            menu.classList.remove('scale-0', 'opacity-0', 'pointer-events-none');
            menu.classList.add('scale-100', 'opacity-100', 'pointer-events-auto');
            icon.classList.add('rotate-45');
        }
    },

    // ===== Notifikasi Pengajuan Pembayaran Angsuran =====
    toggleNotifDropdown(forceState) {
        const dd = document.getElementById('notif-dropdown');
        if (!dd) return;
        if (forceState !== undefined) {
            if (forceState) {
                dd.classList.remove('hidden');
                this.checkNotifications(true);
            } else {
                dd.classList.add('hidden');
            }
            return;
        }
        const isHidden = dd.classList.contains('hidden');
        if (isHidden) {
            dd.classList.remove('hidden');
            this.checkNotifications(true);
        } else {
            dd.classList.add('hidden');
        }
    },

    async checkNotifications(forceFetchList = false) {
        if (!this.user || document.visibilityState === 'hidden') return;
        this.fetchSidebarBadges();
        try {
            const countRes = await this.api('angsuran/pengajuan/count');
            const count = (countRes && countRes.data && (countRes.data.pending_count !== undefined ? countRes.data.pending_count : countRes.data.count)) || 0;
            const badge = document.getElementById('notif-badge-count');
            const bellBtn = document.getElementById('notif-bell-btn');
            if (badge) {
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            }
            if (bellBtn) {
                if (count > 0) {
                    bellBtn.classList.add('text-amber-500', 'bg-amber-50');
                    bellBtn.classList.remove('text-gray-500');
                } else {
                    bellBtn.classList.remove('text-amber-500', 'bg-amber-50');
                    bellBtn.classList.add('text-gray-500');
                }
            }

            const dd = document.getElementById('notif-dropdown');
            const listEl = document.getElementById('notif-dropdown-list');
            if (listEl && dd && (!dd.classList.contains('hidden') || forceFetchList)) {
                const listRes = await this.api('angsuran/pengajuan?status=pending');
                const items = listRes?.data || [];
                if (!items.length) {
                    listEl.innerHTML = `
                        <div class="p-6 text-center text-gray-400">
                            <i class="ri-checkbox-circle-line text-2xl text-emerald-400 mb-1 block"></i>
                            Tidak ada pengajuan angsuran pending
                        </div>`;
                } else {
                    listEl.innerHTML = items.map(item => `
                        <div class="p-3.5 hover:bg-gray-50/80 transition cursor-pointer" onclick="App.openPengajuanFromNotif(${item.id})">
                            <div class="flex items-start justify-between gap-2">
                                <span class="font-bold text-gray-800 text-xs truncate">${item.nama_anggota || 'Anggota'}</span>
                                <span class="text-[10px] text-gray-400 whitespace-nowrap">${App.formatDate(item.tgl_pengajuan)}</span>
                            </div>
                            <div class="text-[11px] text-gray-500 mt-1 flex items-center justify-between">
                                <span>Angsuran Ke-${item.angsuran_ke} (${item.no_pinjaman})</span>
                                <span class="font-bold text-primary-600">${App.formatRupiah(item.total_bayar)}</span>
                            </div>
                            <div class="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"></span>
                                Potong Simp. Sukarela: ${item.no_rekening || '-'}
                            </div>
                        </div>
                    `).join('');
                }
            }
        } catch (e) {
            console.error('Error checking notifications:', e);
        }
    },

    openPengajuanFromNotif(pengajuanId) {
        this.toggleNotifDropdown(false);
        location.hash = '#/angsuran';
        setTimeout(() => {
            if (window.AngsuranPage && typeof window.AngsuranPage.showAntreanPengajuan === 'function') {
                window.AngsuranPage.showAntreanPengajuan(pengajuanId);
            }
        }, 350);
    },

    // ===== Helpers =====
    formatRupiah(n) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0); },

    formatDate(d) {
        if (!d) return '-';
        const dt = new Date(d);
        const dd = String(dt.getDate()).padStart(2, '0');
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const yyyy = dt.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    },

    formatDateIndo(d) {
        if (!d) return '-';
        const dt = (d instanceof Date) ? d : new Date(d);
        if (isNaN(dt.getTime())) return String(d);
        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
        return `${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear()}`;
    },

    escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    renderPagination(pag, onPage) {
        if (!pag || pag.total_pages <= 1) return '';
        let h = '<div class="flex items-center justify-between mt-4"><div class="text-sm text-gray-500">Halaman ' + pag.page + ' dari ' + pag.total_pages + ' (' + pag.total + ' data)</div><div class="flex gap-1">';
        for (let i = 1; i <= pag.total_pages; i++) {
            if (pag.total_pages > 7 && i > 3 && i < pag.total_pages - 2 && Math.abs(i - pag.page) > 1) { if (i === 4) h += '<span class="px-2 py-1 text-gray-400">...</span>'; continue; }
            h += `<button onclick="${onPage}(${i})" class="px-3 py-1 rounded-lg text-sm ${i === pag.page ? 'bg-primary-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}">${i}</button>`;
        }
        return h + '</div></div>';
    },

    statusBadge(status) {
        const map = { aktif: 'badge-success', nonaktif: 'badge-warning', keluar: 'badge-danger', pending: 'badge-warning', disetujui: 'badge-info', ditolak: 'badge-danger', cair: 'badge-success', lunas: 'badge-success', belum: 'badge-warning', terlambat: 'badge-danger' };
        return `<span class="badge ${map[status] || 'badge-info'}">${status}</span>`;
    },

    dkBadge(dk) {
        return dk === 'D' ? '<span class="badge badge-debit">Debit</span>' : '<span class="badge badge-kredit">Kredit</span>';
    },

    // ===== Modern Smart Searchable Select / Combobox Component =====
    searchableSelect(target, options = {}) {
        const selectEl = typeof target === 'string' ? document.querySelector(target) : target;
        if (!selectEl || selectEl.tagName !== 'SELECT') return null;

        // Jika sudah pernah di-init, perbarui options & trigger
        if (selectEl._smartSelectInstance) {
            selectEl._smartSelectInstance.update();
            return selectEl._smartSelectInstance;
        }

        const defaults = {
            placeholder: selectEl.getAttribute('data-placeholder') || 'Pilih...',
            searchPlaceholder: selectEl.getAttribute('data-search-placeholder') || 'Ketik untuk mencari...',
            clearable: selectEl.getAttribute('data-clearable') === 'true' || !selectEl.required,
            icon: selectEl.getAttribute('data-icon') || null,
            emptyText: 'Tidak ada data ditemukan',
            onChange: null
        };
        const config = { ...defaults, ...options };

        // Sembunyikan elemen select asli secara ramah form & aksesibilitas
        selectEl.classList.add('smart-select-hidden');

        // Buat container pembungkus kustom
        const wrapper = document.createElement('div');
        wrapper.className = 'smart-select-wrapper ' + (selectEl.className.includes('w-full') ? 'w-full' : '');
        selectEl.parentNode.insertBefore(wrapper, selectEl.nextSibling);

        // Ekstraksi dan parsing cerdas untuk data dari option
        const parseOptions = () => {
            const items = [];
            Array.from(selectEl.options).forEach((opt, idx) => {
                const text = (opt.textContent || '').trim();
                if (opt.value === '' && !text) return; // skip placeholder kosong mutlak

                let code = opt.getAttribute('data-code') || '';
                let title = text;
                let meta = opt.getAttribute('data-meta') || '';

                // Parsing otomatis untuk Akun COA / Rekening: "1101 - Kas Utama (Aset Lancar)"
                if (!code && text.includes(' - ')) {
                    const parts = text.split(' - ');
                    code = parts[0].trim();
                    const remainder = parts.slice(1).join(' - ').trim();
                    const metaMatch = remainder.match(/\((.*?)\)$/);
                    if (metaMatch) {
                        meta = metaMatch[1];
                        title = remainder.replace(/\((.*?)\)$/, '').trim();
                    } else {
                        title = remainder;
                    }
                }

                // Cek dataset khusus seperti bunga & tenor
                if (opt.dataset.bunga) {
                    meta = `${opt.dataset.bunga}% · Maks ${opt.dataset.tenor || 0} bln`;
                }

                items.push({
                    value: opt.value,
                    text: text,
                    code: code,
                    title: title,
                    meta: meta,
                    selected: opt.selected,
                    disabled: opt.disabled,
                    element: opt
                });
            });
            return items;
        };

        let items = parseOptions();

        // Helper highlight teks pencarian
        const highlightMatch = (text, query) => {
            if (!query) return App.escapeHtml(text);
            const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedQ})`, 'gi');
            return App.escapeHtml(text).replace(regex, '<mark>$1</mark>');
        };

        const getSelectedItem = () => {
            const val = selectEl.value;
            return items.find(i => i.value === val) || null;
        };

        // Render Trigger Box
        const trigger = document.createElement('div');
        trigger.className = 'smart-select-trigger';
        trigger.tabIndex = 0;

        const updateTrigger = () => {
            const cur = getSelectedItem();
            const showClear = config.clearable && cur && cur.value !== '';
            let contentHtml = '';

            if (!cur || cur.value === '') {
                contentHtml = `<span class="text-gray-400 font-normal truncate">${App.escapeHtml(config.placeholder)}</span>`;
            } else if (cur.code) {
                contentHtml = `
                    <div class="flex items-center gap-2 min-w-0 flex-1 truncate">
                        <span class="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60 shrink-0">${App.escapeHtml(cur.code)}</span>
                        <span class="font-semibold text-gray-800 truncate">${App.escapeHtml(cur.title)}</span>
                        ${cur.meta ? `<span class="text-[11px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">${App.escapeHtml(cur.meta)}</span>` : ''}
                    </div>
                `;
            } else {
                contentHtml = `<span class="font-semibold text-gray-800 truncate">${App.escapeHtml(cur.text)}</span>`;
            }

            trigger.innerHTML = `
                <div class="flex items-center gap-2 flex-1 min-w-0">
                    ${config.icon ? `<i class="${config.icon} text-gray-400 shrink-0"></i>` : ''}
                    <div class="smart-select-value flex-1 min-w-0 flex items-center">
                        ${contentHtml}
                    </div>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    ${showClear ? `<button type="button" class="smart-select-clear" title="Reset Pilihan"><i class="ri-close-circle-fill"></i></button>` : ''}
                    <i class="ri-arrow-down-s-line smart-select-arrow"></i>
                </div>
            `;

            const clearBtn = trigger.querySelector('.smart-select-clear');
            if (clearBtn) {
                clearBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectValue('');
                });
            }
        };

        // Render Popover Dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'smart-select-dropdown';
        dropdown.innerHTML = `
            <div class="smart-select-search-box">
                <i class="ri-search-line smart-select-search-icon"></i>
                <input type="text" class="smart-select-search-input" placeholder="${App.escapeHtml(config.searchPlaceholder)}" autocomplete="off">
                <i class="ri-close-line smart-select-search-clear hidden"></i>
            </div>
            <div class="smart-select-options"></div>
            <div class="smart-select-footer">
                <span class="smart-select-count"></span>
                <span class="flex items-center gap-1"><kbd class="px-1 py-0.2 bg-white border border-gray-200 rounded text-[9px] font-mono">↑↓</kbd> navigasi <kbd class="px-1 py-0.2 bg-white border border-gray-200 rounded text-[9px] font-mono">↵</kbd> pilih</span>
            </div>
        `;

        wrapper.appendChild(trigger);
        wrapper.appendChild(dropdown);

        const searchInput = dropdown.querySelector('.smart-select-search-input');
        const searchClear = dropdown.querySelector('.smart-select-search-clear');
        const optionsContainer = dropdown.querySelector('.smart-select-options');
        const countLabel = dropdown.querySelector('.smart-select-count');

        let activeIndex = -1;
        let visibleItems = [];

        // Render Options List
        const renderList = (filterQuery = '') => {
            const query = filterQuery.toLowerCase().trim();
            visibleItems = items.filter(item => {
                if (item.value === '' && !query) return true;
                if (!query) return true;
                return item.text.toLowerCase().includes(query) ||
                       (item.code && item.code.toLowerCase().includes(query)) ||
                       (item.meta && item.meta.toLowerCase().includes(query));
            });

            if (visibleItems.length === 0) {
                optionsContainer.innerHTML = `
                    <div class="smart-select-empty">
                        <i class="ri-search-2-line text-2xl mb-1 block text-gray-300"></i>
                        ${App.escapeHtml(config.emptyText)} "${App.escapeHtml(filterQuery)}"
                    </div>
                `;
                countLabel.textContent = '0 data';
                activeIndex = -1;
                return;
            }

            countLabel.textContent = `${visibleItems.length} pilihan`;

            optionsContainer.innerHTML = visibleItems.map((item, idx) => {
                const isSelected = item.value === selectEl.value;
                const isActive = idx === activeIndex;

                let itemBody = '';
                if (item.value === '') {
                    itemBody = `<span class="italic text-gray-400 font-normal">${App.escapeHtml(item.text || config.placeholder)}</span>`;
                } else if (item.code) {
                    itemBody = `
                        <div class="flex items-center justify-between w-full gap-2 min-w-0">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60 shrink-0">
                                    ${highlightMatch(item.code, query)}
                                </span>
                                <span class="font-semibold text-gray-800 truncate">
                                    ${highlightMatch(item.title, query)}
                                </span>
                            </div>
                            ${item.meta ? `<span class="text-[11px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded shrink-0">${highlightMatch(item.meta, query)}</span>` : ''}
                        </div>
                    `;
                } else {
                    itemBody = `<span class="truncate flex-1 font-medium text-gray-700">${highlightMatch(item.text, query)}</span>`;
                }

                return `
                    <div class="smart-select-item ${isSelected ? 'is-selected' : ''} ${isActive ? 'is-active' : ''}" 
                         data-index="${idx}" data-val="${App.escapeHtml(item.value)}">
                        <div class="flex items-center gap-2 flex-1 min-w-0">
                            ${itemBody}
                        </div>
                        ${isSelected ? '<i class="ri-check-line text-indigo-600 font-bold shrink-0 text-base"></i>' : ''}
                    </div>
                `;
            }).join('');

            optionsContainer.querySelectorAll('.smart-select-item').forEach(el => {
                el.addEventListener('click', () => {
                    const idx = parseInt(el.getAttribute('data-index'), 10);
                    const selected = visibleItems[idx];
                    if (selected) {
                        selectValue(selected.value);
                        close();
                        trigger.focus();
                    }
                });
            });
        };

        const selectValue = (val) => {
            selectEl.value = val;
            updateTrigger();
            selectEl.dispatchEvent(new Event('change', { bubbles: true }));
            selectEl.dispatchEvent(new Event('input', { bubbles: true }));
            if (typeof config.onChange === 'function') {
                config.onChange(val, getSelectedItem(), selectEl);
            }
        };

        // Open Dropdown dengan pendeteksi viewport auto-flip ke atas jika mepet bawah
        const open = () => {
            document.querySelectorAll('.smart-select-wrapper.is-open').forEach(w => {
                if (w !== wrapper && w._smartSelectClose) w._smartSelectClose();
            });

            // Hitung posisi vertikal relatif terhadap layar
            const rect = trigger.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < 280 && rect.top > 280) {
                dropdown.style.top = 'auto';
                dropdown.style.bottom = 'calc(100% + 5px)';
            } else {
                dropdown.style.bottom = 'auto';
                dropdown.style.top = 'calc(100% + 5px)';
            }

            wrapper.classList.add('is-open');
            renderList(searchInput.value);
            setTimeout(() => {
                searchInput.focus();
                const sel = optionsContainer.querySelector('.is-selected');
                if (sel) sel.scrollIntoView({ block: 'nearest' });
            }, 30);
        };

        const close = () => {
            wrapper.classList.remove('is-open');
            searchInput.value = '';
            searchClear.classList.add('hidden');
            activeIndex = -1;
        };

        wrapper._smartSelectClose = close;

        // Toggle Trigger
        trigger.addEventListener('click', (e) => {
            if (e.target.closest('.smart-select-clear')) return;
            if (wrapper.classList.contains('is-open')) close();
            else open();
        });

        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                e.preventDefault();
                open();
            }
        });

        // Search Input Events
        searchInput.addEventListener('input', () => {
            const q = searchInput.value;
            searchClear.classList.toggle('hidden', !q);
            activeIndex = 0;
            renderList(q);
            highlightActiveItem();
        });

        searchClear.addEventListener('click', () => {
            searchInput.value = '';
            searchClear.classList.add('hidden');
            activeIndex = -1;
            renderList('');
            searchInput.focus();
        });

        const highlightActiveItem = () => {
            const els = optionsContainer.querySelectorAll('.smart-select-item');
            els.forEach((el, idx) => {
                if (idx === activeIndex) {
                    el.classList.add('is-active');
                    el.scrollIntoView({ block: 'nearest' });
                } else {
                    el.classList.remove('is-active');
                }
            });
        };

        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (visibleItems.length > 0) {
                    activeIndex = (activeIndex + 1) % visibleItems.length;
                    highlightActiveItem();
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (visibleItems.length > 0) {
                    activeIndex = (activeIndex - 1 + visibleItems.length) % visibleItems.length;
                    highlightActiveItem();
                }
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < visibleItems.length) {
                    selectValue(visibleItems[activeIndex].value);
                    close();
                    trigger.focus();
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                close();
                trigger.focus();
            }
        });

        // Close on outside click
        const onDocClick = (e) => {
            if (!wrapper.contains(e.target)) {
                close();
            }
        };
        document.addEventListener('click', onDocClick);

        // Sync when native select is changed via code
        const syncListener = () => {
            updateTrigger();
        };
        selectEl.addEventListener('change', syncListener);

        updateTrigger();

        const instance = {
            wrapper,
            selectEl,
            open,
            close,
            update: () => {
                items = parseOptions();
                updateTrigger();
                if (wrapper.classList.contains('is-open')) {
                    renderList(searchInput.value);
                }
            },
            setValue: (val) => {
                selectValue(val);
            },
            destroy: () => {
                document.removeEventListener('click', onDocClick);
                selectEl.removeEventListener('change', syncListener);
                wrapper.remove();
                selectEl.classList.remove('smart-select-hidden');
                delete selectEl._smartSelectInstance;
            }
        };

        selectEl._smartSelectInstance = instance;
        return instance;
    },

    // Otomatis enhance seluruh elemen select bertanda data-searchable="true" atau class "searchable-select"
    enhanceSelects(container = document) {
        if (!container) return;
        const selects = container.querySelectorAll('select.searchable-select, select[data-searchable="true"]');
        selects.forEach(sel => this.searchableSelect(sel));
    },

    // ===== Flatpickr Date Picker (DD-MM-YYYY) =====
    initDatepicker(selector, opts = {}) {
        const defaults = {
            dateFormat: 'd-m-Y',
            altInput: true,
            altFormat: 'd-m-Y',
            allowInput: true,
            disableMobile: true,
            ...opts
        };
        return flatpickr(selector, defaults);
    },

    datepicker(selector, opts = {}) { return this.initDatepicker(selector, opts); },

    todayDMY() {
        const d = new Date();
        return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();
    },

    todayISO() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },

    firstDayOfMonthISO() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-01';
    },

    monthAgoISO() {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },

    monthAgoDMY() {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();
    },

    // Convert DD-MM-YYYY to YYYY-MM-DD for API submission
    dateToISO(dmy) {
        if (!dmy) return '';
        const parts = dmy.split('-');
        if (parts.length !== 3) return dmy;
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    },

    debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    // ===== Export Helpers =====
    /**
     * Unified Export Function
     * @param {string} type - 'pdf' or 'csv'
     * @param {string} title - Report title
     * @param {Array} columns - [{title, key, align, width}]
     * @param {Array} data - Array of objects
     * @param {Object} options - {filename, orientation, footer, sections, startY, tableStyle, columnStyles, didParseCell, didDrawPage, onAfterDraw}
     */
    export(type, title, columns, data, options = {}) {
        if (type.toLowerCase() === 'csv') {
            return this.exportCSV(options.filename || title.toLowerCase().replace(/\s+/g, '_'), columns, data, options.footer);
        }
        return this.exportPDF(title, options.filename || title.toLowerCase().replace(/\s+/g, '_'), columns, data, options.footer, options);
    },

    /**
     * Draw Official Executive Kop Surat Koperasi (Letterhead)
     * Ink-friendly, high-contrast, professional, and compliant with Indonesian cooperative standards.
     * @param {Object} doc - jsPDF instance
     * @param {string} title - Report title
     * @param {Object} options - {subtitle, periode, docRef}
     * @returns {number} Y coordinate where content should begin
     */
    drawPDFHeader(doc, title, options = {}) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const getS = (key, def = '') => this.settings[key]?.value || def;
        const namaKop = getS('nama_koperasi') || getS('app_name', 'KOPERASI SIMPAN PINJAM');
        const alamat = getS('alamat', 'Jl. Raya Utama No. 123');
        const telp = getS('telepon', '-');
        const email = getS('email', '-');
        const web = getS('website', '-');
        const logoUrl = getS('logo_url');

        // Brand colors dynamically from active theme
        const activeThemeKey = localStorage.getItem('app_theme') || 'indigo';
        const theme = window.THEMES?.[activeThemeKey] || { shade: '#4f46e5', p: { 50: '#eef2ff', 700: '#4338ca', 900: '#312e81' } };
        
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [79, 70, 229];
        };
        const brandRGB = hexToRgb(theme.shade);
        const softRGB = hexToRgb(theme.p[50] || '#f8fafc');

        // 1. Top Edge Executive Accent Bar (Only 2.4mm, saves ink, high-end look)
        doc.setFillColor(brandRGB[0], brandRGB[1], brandRGB[2]);
        doc.rect(0, 0, pageWidth, 2.4, 'F');

        // 2. Logo / Emblem
        const logoX = 14;
        const logoY = 6.2;
        const logoSize = 13.5;
        let drawLogoFallback = true;

        if (logoUrl) {
            try {
                const ext = logoUrl.split('.').pop().split('?')[0].toUpperCase();
                const format = ['PNG', 'JPEG', 'JPG', 'WEBP'].includes(ext) ? ext : 'PNG';
                doc.addImage(logoUrl, format, logoX, logoY, logoSize, logoSize);
                drawLogoFallback = false;
            } catch (e) {
                drawLogoFallback = true;
            }
        }

        if (drawLogoFallback) {
            // Elegant Vector Emblem with Monogram Badge
            doc.setFillColor(softRGB[0], softRGB[1], softRGB[2]);
            doc.setDrawColor(brandRGB[0], brandRGB[1], brandRGB[2]);
            doc.setLineWidth(0.35);
            doc.roundedRect(logoX, logoY, logoSize, logoSize, 2, 2, 'FD');

            // Inner subtle border
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.12);
            doc.roundedRect(logoX + 0.8, logoY + 0.8, logoSize - 1.6, logoSize - 1.6, 1.4, 1.4, 'D');

            // Monogram Text
            const words = namaKop.split(/\s+/).filter(w => w.length > 0);
            let initials = '';
            if (words.length > 0) initials += words[0][0];
            if (words.length > 1) initials += words[1][0];
            if (initials.length === 0) initials = 'KP';

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(brandRGB[0], brandRGB[1], brandRGB[2]);
            doc.text(initials.toUpperCase(), logoX + (logoSize / 2), logoY + 8.6, { align: 'center' });
        }

        // 3. Institution Details (Left Column)
        const textStartX = 31;
        // Nama Koperasi
        doc.setFontSize(11.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(namaKop.toUpperCase(), textStartX, 10.5);

        // Subtitle / Legalitas / Tagline
        const tagline = getS('app_tagline') || 'Badan Hukum Koperasi Simpan Pinjam Indonesia';
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // slate-600
        doc.text(tagline, textStartX, 14.5);

        // Alamat
        doc.setFontSize(7.2);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(alamat, textStartX, 18);

        // Kontak (Telp, Email, Web)
        doc.setFontSize(6.8);
        doc.text(`Telp: ${telp}   |   Email: ${email}   |   Web: ${web}`, textStartX, 21.5);

        // 4. Executive Metadata Info Box (Right Corner)
        const isLandscape = pageWidth > 220;
        const boxW = isLandscape ? 66 : 58;
        const boxH = 15;
        const boxX = pageWidth - 14 - boxW;
        const boxY = 6.2;

        // Card container
        doc.setFillColor(248, 250, 252); // slate-50
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.roundedRect(boxX, boxY, boxW, boxH, 1.5, 1.5, 'FD');

        // Accent indicator bar on left side of the info box
        doc.setFillColor(brandRGB[0], brandRGB[1], brandRGB[2]);
        doc.roundedRect(boxX, boxY, 1.4, boxH, 0.7, 0.7, 'F');

        // Meta Line 1: Tanggal & Waktu Cetak
        const now = new Date();
        const timeStr = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0') + ' WIB';
        doc.setFontSize(5.6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text('WAKTU CETAK', boxX + 3.8, boxY + 4.2);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`${this.todayDMY()} ${timeStr}`, boxX + 3.8, boxY + 7.8);

        // Meta Line 2: Operator Cetak
        doc.setFontSize(5.6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(100, 116, 139);
        doc.text('OPERATOR', boxX + 3.8, boxY + 11.2);

        const userName = this.user?.nama_lengkap || 'Administrator';
        const userRole = this.user?.role || 'Admin';
        const opStr = `${userName} (${userRole})`;
        doc.setFontSize(6.7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const maxOpLen = isLandscape ? 28 : 23;
        const cleanOpStr = opStr.length > maxOpLen ? opStr.substring(0, maxOpLen - 2) + '..' : opStr;
        doc.text(cleanOpStr, boxX + 3.8, boxY + 14.1);

        // 5. Official Double Line Rule (Standard Kop Surat Resmi Indonesia)
        const lineY = 24.2;
        doc.setDrawColor(30, 41, 59); // slate-800
        doc.setLineWidth(0.65);
        doc.line(14, lineY, pageWidth - 14, lineY);

        doc.setDrawColor(brandRGB[0], brandRGB[1], brandRGB[2]);
        doc.setLineWidth(0.2);
        doc.line(14, lineY + 0.8, pageWidth - 14, lineY + 0.8);

        // 6. Title & Subtitle Banner Strip
        const titleY = 28.2;
        // Accent Bar
        doc.setFillColor(brandRGB[0], brandRGB[1], brandRGB[2]);
        doc.roundedRect(14, titleY + 1, 2.8, 8, 0.8, 0.8, 'F');

        // Document Title
        doc.setFontSize(10.8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(title.toUpperCase(), 19.5, titleY + 5.5);

        // Subtitle / Periode
        const subtitle = options.subtitle || (options.periode ? `Periode: ${options.periode}` : '');
        if (subtitle) {
            doc.setFontSize(7.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(subtitle, 19.5, titleY + 9.5);
        }

        // Ref Tag on the far right
        const refNo = options.docRef || `REF: KOP-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184);
        doc.text(refNo, pageWidth - 14, titleY + 5.5, { align: 'right' });

        return titleY + (subtitle ? 13 : 10);
    },

    /**
     * Draw Official Executive Footer
     * @param {Object} doc - jsPDF instance
     * @param {Object} options - {currentPage, totalPages}
     */
    drawPDFFooter(doc, options = {}) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const getS = (key, def = '') => this.settings[key]?.value || def;
        const namaKop = getS('nama_koperasi') || getS('app_name', 'Koperasi');

        const curr = options.currentPage || doc.internal.getNumberOfPages();
        const total = options.totalPages || doc.internal.getNumberOfPages();
        const pageStr = `Halaman ${curr} dari ${total}`;

        // Hairline separator
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.2);
        doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

        // Left: Page number & Electronic document notice
        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`${pageStr}   •   Dokumen Sah Elektronik Sistem Informasi Koperasi`, 14, pageHeight - 7);

        // Right: Official copyright
        doc.text(`© ${new Date().getFullYear()} ${namaKop}. Hak Cipta Dilindungi.`, pageWidth - 14, pageHeight - 7, { align: 'right' });
    },

    /**
     * Draw Dynamic Executive Summary Cards
     * @param {Object} doc - jsPDF instance
     * @param {Array} cards - [{label, value, color, sub}]
     * @param {number} startY - Y coordinate
     * @returns {number} Next Y coordinate
     */
    drawPDFSummaryCards(doc, cards, startY) {
        if (!cards || cards.length === 0) return startY;
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 14;
        const availableWidth = pageWidth - (margin * 2);
        const gap = 3.5;
        const cardWidth = (availableWidth - (gap * (cards.length - 1))) / cards.length;
        const cardHeight = 17.5;

        // Theme colors
        const activeThemeKey = localStorage.getItem('app_theme') || 'indigo';
        const theme = window.THEMES?.[activeThemeKey] || { shade: '#4f46e5', p: { 50: '#eef2ff' } };
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [79, 70, 229];
        };
        const primaryRGB = hexToRgb(theme.shade);

        const colorMap = {
            emerald: [16, 185, 129],
            teal: [20, 184, 166],
            rose: [244, 63, 94],
            amber: [245, 158, 11],
            blue: [59, 130, 246],
            indigo: [79, 70, 229],
            purple: [168, 85, 247],
        };

        cards.forEach((card, idx) => {
            const x = margin + (idx * (cardWidth + gap));
            const y = startY;

            // Card container: clean white with slate-200 border
            doc.setFillColor(255, 255, 255);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.roundedRect(x, y, cardWidth, cardHeight, 1.8, 1.8, 'FD');

            // Left vertical accent line
            const cardAccentRGB = (card.color && colorMap[card.color]) ? colorMap[card.color] : primaryRGB;
            doc.setFillColor(cardAccentRGB[0], cardAccentRGB[1], cardAccentRGB[2]);
            doc.roundedRect(x, y, 1.8, cardHeight, 0.9, 0.9, 'F');

            // Label
            doc.setFontSize(6.4);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139); // slate-500
            const cleanLabel = String(card.label || '').toUpperCase();
            doc.text(cleanLabel, x + 4.5, y + 5.5);

            // Value
            const valStr = String(card.value || '0');
            // Auto scale font size if value is very long
            let valFontSize = 9.2;
            if (valStr.length > 20) valFontSize = 7.5;
            else if (valStr.length > 15) valFontSize = 8.2;

            doc.setFontSize(valFontSize);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text(valStr, x + 4.5, y + 12.2);

            // Mini secondary note/badge if available
            if (card.sub) {
                doc.setFontSize(5.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(148, 163, 184);
                doc.text(String(card.sub), x + 4.5, y + 15.5);
            }
        });

        return startY + cardHeight + 5;
    },

    /**
     * Draw Official Indonesian Cooperative Signatures Block (Pengesahan)
     * @param {Object} doc - jsPDF instance
     * @param {number} finalY - Current Y coordinate after table
     * @param {Object} options - Options
     * @returns {number} Ending Y coordinate
     */
    drawPDFSignatures(doc, finalY, options = {}) {
        const pageHeight = doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.getWidth();
        const getS = (key, def = '') => this.settings[key]?.value || def;

        const neededHeight = 36;
        let startY = finalY + 6;

        // Auto page break if space is tight
        if (startY + neededHeight > pageHeight - 16) {
            doc.addPage();
            this.drawPDFHeader(doc, options.title || 'LEMBAR PENGESAHAN DOKUMEN', options);
            startY = 44;
        }

        const margin = 14;

        // Date & Place
        const kota = getS('kota') || (getS('alamat', '').includes('Malang') ? 'Malang' : 'Kantor Pusat');
        const tglText = `${kota}, ${this.formatDateIndo(new Date())}`;

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(tglText, pageWidth - margin, startY, { align: 'right' });

        const sigY = startY + 5;

        // Column Left: Mengetahui (Ketua Pengurus)
        const leftX = margin + 15;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Mengetahui / Menyetujui,', leftX, sigY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Ketua Pengurus Koperasi', leftX, sigY + 4);

        // Sign space line
        const ketuaName = getS('ketua_koperasi') || 'Ketua Pengurus';
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`( ${ketuaName} )`, leftX, sigY + 23);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(leftX - 2, sigY + 24.5, leftX + 48, sigY + 24.5);
        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Pengurus Bidang Operasional', leftX, sigY + 28);

        // Column Right: Dibuat Oleh (Bendahara / Bagian Pembukuan)
        const rightX = pageWidth - margin - 50;
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('Dibuat & Diverifikasi Oleh,', rightX, sigY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Bagian Pembukuan / Keuangan', rightX, sigY + 4);

        const userName = this.user?.nama_lengkap || 'Staff Akuntansi';
        const userRole = this.user?.role || 'Bendahara';
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`( ${userName} )`, rightX, sigY + 23);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.line(rightX - 2, sigY + 24.5, rightX + 48, sigY + 24.5);
        doc.setFontSize(6.8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Jabatan: ${userRole}`, rightX, sigY + 28);

        return sigY + 32;
    },

    exportPDF(title, filename, columns, rows, footer = null, options = {}) {
        const activeThemeKey = localStorage.getItem('app_theme') || 'indigo';
        const theme = window.THEMES?.[activeThemeKey] || { shade: '#4f46e5', p: { 50: '#eef2ff', 700: '#4338ca', 900: '#312e81' } };
        
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [79, 70, 229];
        };
        const primaryRGB = hexToRgb(theme.shade);
        const primary50RGB = hexToRgb(theme.p[50] || '#f8fafc');
        const primary900RGB = hexToRgb(theme.p[900] || '#0f172a');

        const { jsPDF } = window.jspdf;
        const orientation = options.orientation || (columns.length > 7 ? 'l' : 'p');
        const doc = new jsPDF(orientation, 'mm', 'a4');

        // Dynamic printable width calculation based on margins
        const docWidth = doc.internal.pageSize.getWidth();
        const defaultMargin = { top: 44, bottom: 16, left: 14, right: 14 };
        const userMargin = options.tableStyle?.margin || {};
        const leftMargin = typeof userMargin === 'number' ? userMargin : (userMargin.left !== undefined ? userMargin.left : 14);
        const rightMargin = typeof userMargin === 'number' ? userMargin : (userMargin.right !== undefined ? userMargin.right : 14);
        const printableWidth = docWidth - leftMargin - rightMargin;

        let currentStartY = options.startY || 44;
        if (options.cards && options.cards.length > 0) {
            currentStartY = this.drawPDFSummaryCards(doc, options.cards, currentStartY);
        }

        // Proportional column width calculations to ensure gorgeous sizing
        const getColumnWidths = (cols, totalWidth) => {
            const weights = cols.map(col => {
                if (col.width) {
                    if (typeof col.width === 'number') return col.width;
                    if (typeof col.width === 'string' && col.width.endsWith('%')) {
                        const pct = parseFloat(col.width) / 100;
                        return pct * totalWidth;
                    }
                }
                const key = (col.key || '').toLowerCase();
                const colTitle = (col.title || '').toLowerCase();

                if (key === 'no' || key === 'index' || key === 'id' || colTitle === 'no') {
                    return 1.0;
                }
                if (key.includes('tanggal') || key.includes('date') || key.includes('tgl') || colTitle.includes('tgl') || colTitle.includes('tanggal')) {
                    return 2.2;
                }
                if (key.includes('no_') || key.includes('kode') || key.includes('rekening') || key.includes('norek') || key.includes('ref')) {
                    return 2.8;
                }
                if (key.includes('nama') || key.includes('anggota') || key.includes('user') || colTitle.includes('nama') || colTitle.includes('anggota')) {
                    return 4.6;
                }
                if (key.includes('keterangan') || key.includes('keperluan') || key.includes('deskripsi') || key.includes('uraian') || colTitle.includes('keterangan') || colTitle.includes('keperluan')) {
                    return 6.5;
                }
                if (['jumlah', 'debit', 'kredit', 'saldo', 'total', 'nominal', 'plafon', 'bayar', 'tagihan', 'shu', 'simpanan', 'jasa', 'bunga', 'denda', 'pokok'].some(k => key.includes(k) || colTitle.includes(k))) {
                    return 3.1;
                }
                return 3.0;
            });

            const totalWeight = weights.reduce((a, b) => a + b, 0);
            return cols.map((col, idx) => {
                const calculatedWidth = (weights[idx] / totalWeight) * totalWidth;
                const key = (col.key || '').toLowerCase();
                const colTitle = (col.title || '').toLowerCase();
                
                if (key === 'no' || key === 'index' || colTitle === 'no') {
                    return Math.max(10, Math.min(calculatedWidth, 14));
                }
                return Math.round(calculatedWidth * 10) / 10;
            });
        };

        const calculatedColWidths = getColumnWidths(columns, printableWidth);

        const tableStyle = {
            theme: 'striped',
            headStyles: { 
                fillColor: [241, 245, 249], // slate-100 for crisp, ink-saving contrast
                textColor: [15, 23, 42],     // slate-900 for razor-sharp legibility
                fontSize: 7.8, 
                cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 }, 
                fontStyle: 'bold', 
                halign: 'center',
                valign: 'middle',
                lineColor: [203, 213, 225], // slate-300 clean borders
                lineWidth: 0.15
            },
            bodyStyles: { 
                fontSize: 7.5,
                cellPadding: { top: 3, bottom: 3, left: 3, right: 3 }, 
                textColor: [30, 41, 59], // Slate-800
                lineColor: [241, 245, 249], // slate-100 hairline dividers
                lineWidth: 0.08 
            },
            alternateRowStyles: { 
                fillColor: [250, 252, 254] // Subtle tint for effortless row scanning
            },
            margin: defaultMargin,
            ...options.tableStyle
        };

        const columnStyles = {};
        columns.forEach((col, idx) => {
            columnStyles[idx] = {};
            const key = (col.key || '').toLowerCase();
            const colTitle = (col.title || '').toLowerCase();

            if (col.align) {
                columnStyles[idx].halign = col.align;
            } else if (['jumlah', 'debit', 'kredit', 'saldo', 'total', 'pokok', 'bunga', 'denda', 'nominal', 'plafon', 'bayar', 'tagihan', 'shu', 'simpanan', 'jasa'].some(k => key.includes(k) || colTitle.includes(k))) {
                columnStyles[idx].halign = 'right';
            } else if (key === 'no' || key === 'index' || colTitle === 'no' || key.includes('tanggal') || key.includes('tgl')) {
                columnStyles[idx].halign = 'center';
            }
            columnStyles[idx].cellWidth = calculatedColWidths[idx];
        });

        let tableBody = rows;
        let rowsMetadata = null;
        if (rows.length > 0 && !Array.isArray(rows[0])) {
            rowsMetadata = rows;
            tableBody = rows.map((row, i) => columns.map(col => col.key === 'no' ? (i + 1) : row[col.key]));
        }

        if (footer) tableBody.push(columns.map(col => footer[col.key] || ''));

        doc.autoTable({
            startY: currentStartY,
            head: [columns.map(col => col.title)],
            body: tableBody,
            ...tableStyle,
            columnStyles: { ...columnStyles, ...options.columnStyles },
            didParseCell: (data) => {
                const origRow = rowsMetadata && rowsMetadata[data.row.index];
                const colKey = columns[data.column.index]?.key || '';
                
                const groupKeyForThisCol = colKey.replace('_keterangan', '_isGroup').replace('_nominal', '_isGroup');
                const totalKeyForThisCol = colKey.replace('_keterangan', '_isTotal').replace('_nominal', '_isTotal');
                
                const isGroupRow = origRow && origRow[groupKeyForThisCol] === true;
                const isTotalRow = origRow && origRow[totalKeyForThisCol] === true;
                
                if (isGroupRow) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [15, 23, 42];
                    data.cell.styles.lineColor = [226, 232, 240];
                    data.cell.styles.lineWidth = 0.12;
                    
                    if (isTotalRow) {
                        data.cell.styles.fillColor = [238, 242, 255]; // Soft indigo tint
                        data.cell.styles.textColor = primary900RGB;
                        data.cell.styles.lineColor = [203, 213, 225];
                        data.cell.styles.lineWidth = 0.2;
                    } else {
                        data.cell.styles.fillColor = [248, 250, 252];
                    }
                } else if (footer && data.row.index === tableBody.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [241, 245, 249];
                    data.cell.styles.textColor = [15, 23, 42];
                    data.cell.styles.lineColor = [203, 213, 225];
                    data.cell.styles.lineWidth = 0.2;
                } else {
                    // Smart Executive Status Badge Highlighting
                    const rawVal = String(data.cell.raw || '').trim().toUpperCase();
                    const colIndex = data.column.index;
                    const originalCol = columns[colIndex];
                    
                    if (originalCol) {
                        const key = String(originalCol.key || '').toLowerCase();
                        const colTitle = String(originalCol.title || '').toLowerCase();
                        
                        const isStatusColumn = key.includes('status') || key.includes('kolek') || key.includes('tipe') || key.includes('jenis') || 
                                               colTitle.includes('status') || colTitle.includes('kolek') || colTitle.includes('tipe') || colTitle.includes('jenis');
                                               
                        const isShortText = rawVal.length > 0 && rawVal.length <= 40;
                        
                        if (isStatusColumn && isShortText) {
                            if (['MACET', 'MENUNGGAK', 'DITOLAK', 'REJECTED', 'BATAL', 'CANCELLED', 'NON-AKTIF', 'NON ACTIVE', 'KELUAR', 'TERLAMBAT'].some(s => rawVal.includes(s))) {
                                data.cell.styles.fillColor = [254, 226, 226]; // bg-red-100
                                data.cell.styles.textColor = [185, 28, 28];   // text-red-700
                                data.cell.styles.fontStyle = 'bold';
                            } else if (['KURANG LANCAR', 'DIRAGUKAN', 'PENDING', 'PROSES', 'MENUNGGU', 'DRAFT', 'JATUH TEMPO', 'DPK'].some(s => rawVal.includes(s))) {
                                data.cell.styles.fillColor = [254, 243, 199]; // bg-amber-100
                                data.cell.styles.textColor = [180, 83, 9];    // text-amber-700
                                data.cell.styles.fontStyle = 'bold';
                            } else if (['LANCAR', 'AKTIF', 'ACTIVE', 'LUNAS', 'SUKSES', 'SUCCESS', 'APPROVED', 'DISETUJUI', 'MASUK', 'SELESAI', 'CAIR'].some(s => rawVal.includes(s))) {
                                data.cell.styles.fillColor = [220, 252, 231]; // bg-green-100
                                data.cell.styles.textColor = [21, 128, 61];   // text-green-700
                                data.cell.styles.fontStyle = 'bold';
                            }
                        }
                    }
                }
                if (options.didParseCell) options.didParseCell(data);
            },
            didDrawPage: (data) => {
                this.drawPDFHeader(doc, title, options);
                if (options.didDrawPage) options.didDrawPage(data);
            }
        });

        // Draw Official Signatures Block (if enabled, default true)
        if (options.signatures !== false) {
            const finalTableY = doc.lastAutoTable ? doc.lastAutoTable.finalY : currentStartY + 20;
            this.drawPDFSignatures(doc, finalTableY, { title, ...options });
        }

        // Two-Pass Page Numbering & Footer Drawing for Absolute Accuracy
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            this.drawPDFFooter(doc, { currentPage: i, totalPages });
        }

        if (options.onAfterDraw) options.onAfterDraw(doc);
        window.open(doc.output('bloburl'), '_blank');
    },

    exportCSV(filename, columns, data, footer = null) {
        let csv = columns
            .filter(col => !col.key.includes('_isGroup') && !col.key.includes('_isTotal'))
            .map(col => `"${col.title}"`)
            .join(',') + '\n';
        
        data.forEach((row, i) => {
            const csvRow = columns
                .filter(col => !col.key.includes('_isGroup') && !col.key.includes('_isTotal'))
                .map((col, colIdx) => {
                    const val = col.key === 'no' ? (i + 1) : (row[col.key] === null || row[col.key] === undefined ? '' : row[col.key]);
                    const strVal = String(val);
                    
                    // Get isGroup and isTotal flags
                    const groupKey = col.key.replace('_keterangan', '_isGroup').replace('_nominal', '_isGroup');
                    const totalKey = col.key.replace('_keterangan', '_isTotal').replace('_nominal', '_isTotal');
                    const isGroup = row[groupKey] === true;
                    const isTotal = row[totalKey] === true;
                    
                    // Format: add markers only for keterangan columns
                    let finalVal = strVal;
                    if (col.key.includes('_keterangan')) {
                        if (isTotal) {
                            finalVal = '=== ' + strVal + ' ===';
                        } else if (isGroup) {
                            finalVal = '>> ' + strVal;
                        }
                    }
                    
                    return `"${finalVal.replace(/"/g, '""')}"`;
                })
                .join(',');
            
            csv += csvRow + '\n';
        });
        
        if (footer) {
            const footerRow = columns
                .filter(col => !col.key.includes('_isGroup') && !col.key.includes('_isTotal'))
                .map(col => `"${(footer[col.key] || '').replace(/"/g, '""')}"`)
                .join(',');
            csv += footerRow + '\n';
        }

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${filename}_${new Date().getTime()}.csv`);
        link.click();
    },

    async showAuditHistory(table, id) {
        const res = await this.api(`keuangan/audit-history?table=${table}&id=${id}`);
        if (!res?.success || !res.data.length) {
            this.toast('Gagal memuat atau tidak ada riwayat perubahan', 'info');
            return;
        }

        const logs = res.data;
        const modalHtml = `
            <div class="p-6">
                <div class="pb-5 border-b border-gray-100 flex justify-between items-center mb-6">
                    <div>
                        <h3 class="text-lg font-bold text-gray-800"><i class="ri-history-line text-amber-500 mr-2"></i>Riwayat Koreksi Data</h3>
                        <p class="text-xs text-gray-500 font-mono">Log perubahan untuk data ID ${id} di tabel ${table.toUpperCase()}</p>
                    </div>
                    <button onclick="App.closeModal()" class="p-2 hover:bg-gray-100 rounded-xl transition-colors"><i class="ri-close-line text-xl text-gray-400"></i></button>
                </div>
                <div class="max-h-[60vh] overflow-y-auto space-y-6 pr-2">
                    <div class="relative border-l-2 border-amber-100 ml-4 pl-6 space-y-6">
                        ${logs.map((log, index) => {
                            let diffHtml = '';
                            if (log.old_data && log.new_data) {
                                diffHtml = '<div class="mt-2 text-xs bg-gray-50 rounded-xl p-3 border border-gray-100 space-y-1 font-mono">';
                                Object.keys(log.new_data).forEach(key => {
                                    const oldVal = log.old_data[key];
                                    const newVal = log.new_data[key];
                                    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
                                        const isMoney = key.includes('jumlah') || key.includes('total') || key.includes('pokok') || key.includes('bunga') || key.includes('denda');
                                        const fmtOld = (oldVal !== null && oldVal !== '' && !isNaN(oldVal) && isMoney) ? App.formatRupiah(oldVal) : (oldVal ?? '-');
                                        const fmtNew = (newVal !== null && newVal !== '' && !isNaN(newVal) && isMoney) ? App.formatRupiah(newVal) : (newVal ?? '-');
                                        diffHtml += `<div class="flex flex-wrap items-center gap-1.5 text-gray-600"><span class="font-bold text-gray-800">${key}:</span> <span class="line-through text-red-500 bg-red-50 px-1 rounded">${fmtOld}</span> <i class="ri-arrow-right-line text-gray-400"></i> <span class="text-emerald-600 bg-emerald-50 px-1 rounded">${fmtNew}</span></div>`;
                                    }
                                });
                                diffHtml += '</div>';
                            }

                            return `
                            <div class="relative">
                                <div class="absolute -left-[31px] top-1.5 bg-amber-500 text-white w-4.5 h-4.5 rounded-full border-2 border-white flex items-center justify-center"><i class="ri-edit-2-fill text-[9px]"></i></div>
                                <div class="flex items-center justify-between text-xs text-gray-500 mb-1">
                                    <span class="font-bold text-gray-700"><i class="ri-user-line mr-1"></i>${log.user_nama || 'System'}</span>
                                    <span><i class="ri-time-line mr-1"></i>${moment(log.created_at).format('DD/MM/YYYY HH:mm:ss')}</span>
                                </div>
                                <div class="text-sm font-semibold text-gray-800 capitalize">${log.action} Data</div>
                                ${diffHtml}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                <div class="pt-5 border-t border-gray-100 flex justify-end mt-6">
                    <button onclick="App.closeModal()" class="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded-xl text-sm font-medium transition-all">Tutup</button>
                </div>
            </div>`;
        this.openModal(modalHtml, 'max-w-2xl');
    },

    async printReceipt(type, id) {
        const res = await this.api(`${type}/${id}`);
        if (!res?.success || !res.data) {
            this.toast('Gagal memuat detail transaksi untuk mencetak', 'error');
            return;
        }

        const trx = res.data;
        const kopName = this.settings['nama_koperasi']?.value || this.settings['app_name']?.value || 'KSP APP KOPERASI';
        const kopAddress = this.settings['alamat_koperasi']?.value || 'Alamat Koperasi';
        const kasirName = this.user?.nama_lengkap || 'Kasir';

        let itemsHtml = '';
        let totalAmount = 0;

        if (type === 'simpanan') {
            totalAmount = parseFloat(trx.jumlah);
            itemsHtml = `
                <tr>
                    <td>Setoran ${trx.jenis_simpanan}<br><span style="font-size:8px;color:#555;">(${trx.nama_transaksi})</span></td>
                    <td class="text-right" style="vertical-align:middle;">${this.formatRupiah(totalAmount)}</td>
                </tr>
            `;
        } else if (type === 'angsuran') {
            totalAmount = parseFloat(trx.total);
            const pokok = parseFloat(trx.pokok || 0);
            const bunga = parseFloat(trx.bunga || 0);
            const denda = parseFloat(trx.denda || 0);
            itemsHtml = `
                <tr>
                    <td>Pokok Angsuran</td>
                    <td class="text-right">${this.formatRupiah(pokok)}</td>
                </tr>
                ${bunga > 0 ? `<tr>
                    <td>Jasa/Bunga Pinjaman</td>
                    <td class="text-right">${this.formatRupiah(bunga)}</td>
                </tr>` : ''}
                ${denda > 0 ? `<tr>
                    <td>Denda Keterlambatan</td>
                    <td class="text-right" style="color:red;">${this.formatRupiah(denda)}</td>
                </tr>` : ''}
            `;
        }

        let printFrame = document.getElementById('receipt-print-frame');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'receipt-print-frame';
            printFrame.style.position = 'fixed';
            printFrame.style.right = '0';
            printFrame.style.bottom = '0';
            printFrame.style.width = '0';
            printFrame.style.height = '0';
            printFrame.style.border = '0';
            document.body.appendChild(printFrame);
        }

        const doc = printFrame.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Cetak Struk POS</title>
                <style>
                    @media print {
                        @page { margin: 0; size: auto; }
                        body { margin: 0; }
                    }
                    body {
                        font-family: 'Courier New', Courier, monospace;
                        font-size: 11px;
                        color: #000;
                        width: 76mm;
                        padding: 3mm 3mm 8mm 3mm;
                        box-sizing: border-box;
                        background: #fff;
                    }
                    .text-center { text-align: center; }
                    .text-right { text-align: right; }
                    .bold { font-weight: bold; }
                    .divider { border-top: 1px dashed #000; margin: 6px 0; }
                    .title { font-size: 12px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase; }
                    .subtitle { font-size: 9px; margin-bottom: 6px; }
                    .info-table, .item-table { width: 100%; border-collapse: collapse; font-size: 10px; }
                    .info-table td { padding: 1.5px 0; vertical-align: top; }
                    .item-table th, .item-table td { padding: 3px 0; vertical-align: top; }
                    .item-table th { border-bottom: 1px dashed #000; text-align: left; }
                    .footer { margin-top: 12px; font-size: 9px; line-height: 1.3; }
                    .sig-box { margin-top: 15px; display: flex; justify-content: space-between; font-size: 9px; }
                    .sig-col { text-align: center; width: 45%; }
                </style>
            </head>
            <body>
                <div class="text-center">
                    <div class="title">${kopName}</div>
                    <div class="subtitle">${kopAddress}</div>
                </div>
                <div class="divider"></div>
                <table class="info-table">
                    <tr><td>No Trx : ${trx.no_transaksi}</td><td class="text-right">${moment(trx.tgl_transaksi || trx.tgl_bayar).format('DD/MM/YYYY')}</td></tr>
                    <tr><td>Anggota: ${trx.no_anggota}</td><td class="text-right">${trx.anggota_nama}</td></tr>
                    ${trx.no_rekening ? `<tr><td>Rekening: ${trx.no_rekening}</td><td></td></tr>` : ''}
                    ${trx.no_pinjaman ? `<tr><td>Pinjaman: ${trx.no_pinjaman}</td><td></td></tr>` : ''}
                    ${trx.angsuran_ke ? `<tr><td>Angsuran: Ke-${trx.angsuran_ke}</td><td></td></tr>` : ''}
                </table>
                <div class="divider"></div>
                <table class="item-table">
                    <thead>
                        <tr><th>Keterangan</th><th class="text-right">Jumlah</th></tr>
                    </thead>
                    <tbody>
                        ${itemsHtml}
                    </tbody>
                </table>
                <div class="divider"></div>
                <table class="info-table">
                    <tr class="bold"><td>TOTAL BAYAR</td><td class="text-right">${this.formatRupiah(totalAmount)}</td></tr>
                    <tr><td>Metode: ${trx.metode_pembayaran === 'sukarela' ? 'SIMPANAN SUKARELA' : (trx.metode_pembayaran ? trx.metode_pembayaran.toUpperCase() : 'TUNAI')}</td><td></td></tr>
                </table>
                <div class="divider"></div>
                <div class="text-center footer">
                    Simpan struk ini sebagai bukti pembayaran resmi.<br>
                    Terima kasih atas partisipasi Anda.
                </div>
                <div class="sig-box">
                    <div class="sig-col">Anggota<br><br><br><br>( ${trx.anggota_nama.split(',')[0]} )</div>
                    <div class="sig-col">Kasir<br><br><br><br>( ${kasirName} )</div>
                </div>
            </body>
            </html>
        `);
        doc.close();

        setTimeout(() => {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
        }, 300);
    },

    // ============================================================
    // BESPOKE FINTECH UI: Thermal Receipt Preview with Serrated Edge
    // ============================================================
    async showThermalReceiptPreview(type, id) {
        this.openModalLoading('Menyiapkan Struk Pembayaran...');
        const res = await this.api(`${type}/${id}`);
        if (!res?.success || !res.data) {
            this.closeModal();
            this.toast('Gagal memuat detail transaksi untuk pratinjau', 'error');
            return;
        }

        const trx = res.data;
        const kopName = this.settings['nama_koperasi']?.value || this.settings['app_name']?.value || 'KSP APP KOPERASI';
        const kopAddress = this.settings['alamat_koperasi']?.value || 'Jl. Koperasi No. 1, Jakarta';
        const kopTelp = this.settings['telepon_koperasi']?.value || '(021) 7890-1234';
        const kasirName = this.user?.nama_lengkap || this.user?.username || 'Kasir';
        
        const trxNo = trx.no_transaksi || trx.no_pinjaman || `TRX-${id}`;
        const rawDate = trx.tgl_transaksi || trx.tgl_bayar || trx.created_at || new Date().toISOString();
        const trxDateStr = (typeof moment !== 'undefined' && moment(rawDate).isValid()) ? moment(rawDate).format('DD/MM/YYYY HH:mm') : this.formatDate(rawDate);

        let items = [];
        let totalAmount = 0;
        let stampType = 'lunas';
        let stampTitle = 'LUNAS';

        if (type === 'simpanan') {
            totalAmount = parseFloat(trx.jumlah || 0);
            items.push({
                desc: `Setoran ${trx.jenis_simpanan || 'Simpanan'}`,
                sub: trx.nama_transaksi ? `(${trx.nama_transaksi})` : '',
                amount: totalAmount
            });
            stampType = 'lunas';
            stampTitle = 'DITERIMA';
        } else if (type === 'angsuran') {
            totalAmount = parseFloat(trx.total || 0);
            const pokok = parseFloat(trx.pokok || 0);
            const bunga = parseFloat(trx.bunga || 0);
            const denda = parseFloat(trx.denda || 0);
            if (pokok > 0) items.push({ desc: `Pokok Angsuran Ke-${trx.angsuran_ke || '-'}`, amount: pokok });
            if (bunga > 0) items.push({ desc: 'Jasa/Bunga Pinjaman', amount: bunga });
            if (denda > 0) items.push({ desc: 'Denda Keterlambatan', amount: denda, isAlert: true });
            stampType = 'lunas';
            stampTitle = 'LUNAS';
        } else if (type === 'kas' || type === 'keuangan/transaksi') {
            totalAmount = parseFloat(trx.jumlah || 0);
            items.push({
                desc: trx.deskripsi || 'Transaksi Kas',
                sub: trx.nama_akun ? `[${trx.kode_akun || ''}] ${trx.nama_akun}` : '',
                amount: totalAmount
            });
            stampType = trx.dk === 'K' ? 'verified' : 'lunas';
            stampTitle = trx.dk === 'K' ? 'TERVERIFIKASI' : 'DITERIMA';
        }

        const anggotaName = trx.anggota_nama || trx.nama_anggota || 'Anggota Umum';
        const anggotaNo = trx.no_anggota || '-';
        const metode = (trx.metode_pembayaran === 'sukarela' ? 'Simpanan Sukarela' : (trx.metode_pembayaran || 'tunai')).toUpperCase();

        // Barcode lines generator (repeating varied bar widths for authentic look)
        const barcodePattern = [2, 4, 1, 3, 2, 5, 2, 1, 4, 2, 3, 1, 4, 2, 2, 5, 1, 3, 2, 4, 2, 1, 3, 4, 2, 5, 1, 2, 4, 2];
        const barcodeBarsHtml = barcodePattern.map(w => `<span class="receipt-barcode-bar" style="width: ${w}px;"></span>`).join('');

        const receiptDateStamp = (typeof moment !== 'undefined' && moment(rawDate).isValid()) ? moment(rawDate).format('DD/MM/YYYY') : '';

        const receiptModalHtml = `
            <div class="p-6 bg-slate-900/95 text-slate-100 rounded-3xl relative overflow-hidden">
                <!-- Preview Toolbar -->
                <div class="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <h3 class="text-sm font-bold text-slate-200">Pratinjau Struk Kasir Thermal (Serrated Paper Edge)</h3>
                    </div>
                    <div class="flex items-center gap-2">
                        <button type="button" onclick="App.copyReceiptText('${trxNo}', '${anggotaName.replace(/'/g, "\\'")}', ${totalAmount}, '${trxDateStr}')" class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1.5" title="Salin Ringkasan">
                            <i class="ri-file-copy-line"></i> Salin
                        </button>
                        <button type="button" onclick="App.closeModal()" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors">
                            <i class="ri-close-line text-lg"></i>
                        </button>
                    </div>
                </div>

                <!-- Authentic Serrated Paper Thermal Receipt -->
                <div class="receipt-paper-serrated relative">
                    <!-- Rubber stamp overlay positioned diagonally -->
                    <div class="absolute right-4 bottom-24 pointer-events-none opacity-90 z-20">
                        ${this.renderRubberStamp({
                            type: stampType,
                            size: 'sm',
                            title: stampTitle,
                            date: receiptDateStamp
                        })}
                    </div>

                    <!-- Header -->
                    <div class="text-center">
                        <div class="text-sm font-black text-slate-900 tracking-tight uppercase">${kopName}</div>
                        <div class="text-[10px] text-slate-500 font-medium leading-tight mt-0.5">${kopAddress}</div>
                        <div class="text-[9px] text-slate-400 font-mono mt-0.5">Telp: ${kopTelp}</div>
                    </div>

                    <div class="receipt-double-line"></div>

                    <!-- Transaction Metadata -->
                    <div class="text-[11px] font-mono leading-relaxed text-slate-700 space-y-0.5">
                        <div class="flex justify-between">
                            <span class="text-slate-500">NO TRX:</span>
                            <span class="font-bold text-slate-900">${trxNo}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-500">WAKTU :</span>
                            <span class="font-semibold text-slate-800">${trxDateStr}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-500">KASIR :</span>
                            <span class="font-semibold text-slate-800">${kasirName}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-500">ANGGOTA:</span>
                            <span class="font-bold text-slate-900 truncate max-w-[180px]">${anggotaName}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-slate-500">NO.ID :</span>
                            <span class="font-mono text-slate-600">${anggotaNo}</span>
                        </div>
                        ${trx.no_pinjaman ? `
                        <div class="flex justify-between">
                            <span class="text-slate-500">NO PINJ:</span>
                            <span class="font-mono text-slate-700">${trx.no_pinjaman}</span>
                        </div>` : ''}
                    </div>

                    <div class="receipt-dashed-line"></div>

                    <!-- Line Items -->
                    <div class="space-y-2 text-[11px] font-mono">
                        ${items.map(it => `
                        <div>
                            <div class="flex justify-between items-start">
                                <span class="font-bold text-slate-800">${it.desc}</span>
                                <span class="font-black text-slate-900 text-right ${it.isAlert ? 'text-rose-600' : ''}">${this.formatRupiah(it.amount)}</span>
                            </div>
                            ${it.sub ? `<div class="text-[9px] text-slate-400">${it.sub}</div>` : ''}
                        </div>
                        `).join('')}
                    </div>

                    <div class="receipt-dashed-line"></div>

                    <!-- Total & Payment Method -->
                    <div class="space-y-1 text-xs font-mono">
                        <div class="flex justify-between items-center text-sm font-black text-slate-900 pt-1">
                            <span>TOTAL BAYAR</span>
                            <span class="text-base font-black text-slate-950">${this.formatRupiah(totalAmount)}</span>
                        </div>
                        <div class="flex justify-between text-[10px] text-slate-600 pt-0.5">
                            <span>METODE BAYAR:</span>
                            <span class="font-bold uppercase">${metode}</span>
                        </div>
                        <div class="flex justify-between text-[10px] text-slate-600">
                            <span>STATUS TRANSAKSI:</span>
                            <span class="font-bold text-emerald-700">BERHASIL / SAH</span>
                        </div>
                    </div>

                    <!-- Barcode Visual -->
                    <div class="mt-4 pt-2">
                        <div class="receipt-barcode">
                            ${barcodeBarsHtml}
                        </div>
                        <div class="text-center font-mono text-[9px] tracking-[0.25em] text-slate-500 font-bold">
                            *${trxNo.replace(/[^A-Za-z0-9]/g, '')}*
                        </div>
                    </div>

                    <div class="receipt-dashed-line"></div>

                    <!-- Footer Note -->
                    <div class="text-center text-[9px] font-mono text-slate-500 leading-tight space-y-1">
                        <p>Simpan bukti pembayaran fisik ini sebagai tanda terima resmi.</p>
                        <p class="font-bold text-slate-700">Terima kasih atas kebersamaan Anda bersama kami.</p>
                    </div>
                </div>

                <!-- Action Button Toolbar -->
                <div class="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800">
                    <div class="text-xs text-slate-400 font-medium text-center sm:text-left">
                        Format POS 58mm / 80mm ESC/POS kompatibel
                    </div>
                    <div class="flex items-center gap-3 w-full sm:w-auto">
                        <button type="button" onclick="App.closeModal()" class="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors">
                            Tutup
                        </button>
                        <button type="button" onclick="App.printReceipt('${type}', ${id})" class="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black shadow-lg shadow-emerald-500/30 transition-all flex items-center justify-center gap-2">
                            <i class="ri-printer-line text-base"></i> Cetak ke Printer Fisik
                        </button>
                    </div>
                </div>
            </div>
        `;

        this.openModal(receiptModalHtml, 'max-w-lg');
    },

    copyReceiptText(trxNo, anggotaName, total, date) {
        const text = `STRUK KOPERASI\nNo: ${trxNo}\nTanggal: ${date}\nAnggota: ${anggotaName}\nTotal: ${this.formatRupiah(total)}\nStatus: LUNAS/BERHASIL`;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                this.toast('Teks rincian struk disalin ke papan klip 📋', 'success');
            }).catch(() => {
                this.toast('Gagal menyalin teks', 'info');
            });
        }
    },

    // ============================================================
    // BESPOKE FINTECH UI: Physical Rubber Stamp Generator
    // ============================================================
    renderRubberStamp(opts = {}) {
        const type = (opts.type || 'lunas').toLowerCase();
        const size = opts.size || 'md'; // 'sm' | 'md' | 'lg'
        let title = opts.title || '';
        let sub = opts.sub || '';
        let cls = 'stamp-lunas';

        switch (type) {
            case 'lunas':
                title = title || 'LUNAS';
                sub = sub || (opts.date ? `TGL: ${opts.date}` : 'KASIR KOPERASI');
                cls = 'stamp-lunas';
                break;
            case 'early_settled':
            case 'lunas_dipercepat':
                title = title || 'LUNAS DIPERCEPAT';
                sub = sub || (opts.date ? `TGL: ${opts.date}` : 'SETTLED EARLY');
                cls = 'stamp-early-settled';
                break;
            case 'verified':
            case 'sah':
            case 'terverifikasi':
                title = title || 'TERVERIFIKASI';
                sub = sub || 'AUDIT KOPERASI';
                cls = 'stamp-verified';
                break;
            case 'approved':
            case 'disetujui':
                title = title || 'DISETUJUI';
                sub = sub || 'KOMITE KREDIT';
                cls = 'stamp-approved';
                break;
            case 'reversed':
            case 'batal':
            case 'dikoreksi':
                title = title || 'DIBATALKAN';
                sub = sub || 'REVERSED / KOREKSI';
                cls = 'stamp-reversed';
                break;
            case 'rejected':
            case 'ditolak':
                title = title || 'DITOLAK';
                sub = sub || 'REJECTED';
                cls = 'stamp-rejected';
                break;
            default:
                title = title || 'TERVERIFIKASI';
                sub = sub || 'KASIR KOPERASI';
                cls = 'stamp-verified';
                break;
        }

        const sizeCls = size === 'sm' ? 'stamp-sm' : (size === 'lg' ? 'stamp-lg' : 'stamp-md');
        const extraCls = opts.class || '';

        return `<div class="rubber-stamp ${cls} ${sizeCls} ${extraCls}" role="status" aria-label="${title}">
            <span class="stamp-title">${title}</span>
            ${sub ? `<span class="stamp-sub">${sub}</span>` : ''}
        </div>`;
    },

    // ============================================================
    // PRODUCTIVITY & TELLER UX: Audio Feedback (Web Audio API)
    // ============================================================
    soundEnabled: true,
    _audioCtx: null,

    initAudio() {
        const saved = localStorage.getItem('app_sound_enabled');
        this.soundEnabled = saved !== 'false';
        this.updateAudioIcon();
    },

    updateAudioIcon() {
        const icon = document.getElementById('topbar-audio-icon');
        const btn = document.getElementById('topbar-audio-btn');
        if (icon) {
            icon.className = this.soundEnabled ? 'ri-volume-up-line text-xl text-emerald-600' : 'ri-volume-mute-line text-xl text-slate-400';
        }
        if (btn) {
            btn.title = this.soundEnabled ? 'Suara Kasir & Notifikasi: Aktif (Klik untuk Membisukan)' : 'Suara Kasir & Notifikasi: Bisu (Klik untuk Mengaktifkan)';
        }
    },

    toggleAudio() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('app_sound_enabled', this.soundEnabled ? 'true' : 'false');
        this.updateAudioIcon();
        if (this.soundEnabled) {
            this.playSound('success');
            this.toast('Suara konfirmasi transaksi diaktifkan 🔊', 'success');
        } else {
            this.toast('Suara konfirmasi transaksi dimatikan 🔇', 'info');
        }
    },

    playSound(type = 'success') {
        if (!this.soundEnabled) return;
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            if (!this._audioCtx) {
                this._audioCtx = new AudioContext();
            }
            if (this._audioCtx.state === 'suspended') {
                this._audioCtx.resume();
            }

            const ctx = this._audioCtx;
            const now = ctx.currentTime;

            if (type === 'success') {
                // Harmonic dual chime (D5 587.33Hz -> A5 880Hz)
                const playTone = (freq, start, duration) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(freq, start);
                    gain.gain.setValueAtTime(0.001, start);
                    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(start);
                    osc.stop(start + duration);
                };
                playTone(587.33, now, 0.28);
                playTone(880.00, now + 0.09, 0.45);
            } else if (type === 'cash') {
                // POS Register cash chime (B5 987Hz -> E6 1318Hz)
                const playTone = (freq, start, duration) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, start);
                    gain.gain.setValueAtTime(0.001, start);
                    gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02);
                    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(start);
                    osc.stop(start + duration);
                };
                playTone(987.77, now, 0.2);
                playTone(1318.51, now + 0.07, 0.4);
            } else if (type === 'warning') {
                // Double tap reminder
                const playBeep = (start) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, start);
                    gain.gain.setValueAtTime(0.15, start);
                    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.1);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(start);
                    osc.stop(start + 0.1);
                };
                playBeep(now);
                playBeep(now + 0.12);
            } else if (type === 'error') {
                // Gentle low warning buzzer
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.exponentialRampToValueAtTime(175, now + 0.25);
                gain.gain.setValueAtTime(0.18, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.25);
            }
        } catch (_) {}
    },

    // ============================================================
    // TOAST NOTIFICATION HELPER
    // ============================================================
    toast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const colorMap = {
            success: { bg: 'bg-emerald-600 text-white', icon: 'ri-checkbox-circle-fill' },
            error: { bg: 'bg-rose-600 text-white', icon: 'ri-error-warning-fill' },
            warning: { bg: 'bg-amber-500 text-white', icon: 'ri-alert-fill' },
            info: { bg: 'bg-slate-900 text-white', icon: 'ri-information-fill' }
        };

        const config = colorMap[type] || colorMap.info;
        const toastEl = document.createElement('div');
        toastEl.className = `flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-xl ${config.bg} text-xs font-bold toast-enter transition-all duration-300`;
        toastEl.innerHTML = `
            <i class="${config.icon} text-base shrink-0"></i>
            <span class="flex-1">${message}</span>
            <button onclick="this.parentElement.remove()" class="opacity-70 hover:opacity-100 transition-opacity">
                <i class="ri-close-line text-sm"></i>
            </button>
        `;

        container.appendChild(toastEl);
        this.playSound(type === 'success' ? 'success' : (type === 'error' ? 'error' : 'warning'));

        setTimeout(() => {
            toastEl.classList.replace('toast-enter', 'toast-leave');
            setTimeout(() => toastEl.remove(), 320);
        }, duration);
    },

    // ============================================================
    // HELPER TERBILANG BAHASA INDONESIA
    // ============================================================
    terbilang(n) {
        n = Math.floor(Math.abs(Number(n) || 0));
        if (n === 0) return 'Nol Rupiah';
        const huruf = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
        function toWords(num) {
            if (num < 12) return huruf[num];
            if (num < 20) return toWords(num - 10) + ' Belas';
            if (num < 100) return toWords(Math.floor(num / 10)) + ' Puluh ' + toWords(num % 10);
            if (num < 200) return 'Seratus ' + toWords(num - 100);
            if (num < 1000) return toWords(Math.floor(num / 100)) + ' Ratus ' + toWords(num % 100);
            if (num < 2000) return 'Seribu ' + toWords(num - 1000);
            if (num < 1000000) return toWords(Math.floor(num / 1000)) + ' Ribu ' + toWords(num % 1000);
            if (num < 1000000000) return toWords(Math.floor(num / 1000000)) + ' Juta ' + toWords(num % 1000000);
            if (num < 1000000000000) return toWords(Math.floor(num / 1000000000)) + ' Miliar ' + toWords(num % 1000000000);
            return toWords(Math.floor(num / 1000000000000)) + ' Triliun ' + toWords(num % 1000000000000);
        }
        return toWords(n).replace(/\s+/g, ' ').trim() + ' Rupiah';
    },

    // ============================================================
    // OMNI-SEARCH & COMMAND PALETTE (Ctrl + K)
    // ============================================================
    _searchSelectedIndex: 0,
    _searchItems: [],

    initOmniSearch() {
        const input = document.getElementById('omni-search-input');
        if (!input) return;

        // Input listener with debounce
        input.addEventListener('input', (e) => {
            clearTimeout(this.searchTimer);
            const q = e.target.value.trim();
            if (q.length === 0) {
                this.renderOmniDefaultActions();
                return;
            }

            // Instantly search client-side registered menus first
            this.renderOmniSearchResults(q, []);

            // If query is >= 2 chars, fetch members and loans from backend in parallel
            if (q.length >= 2) {
                this.searchTimer = setTimeout(async () => {
                    const res = await this.api(`search?q=${encodeURIComponent(q)}`);
                    if (res?.success) {
                        this.renderOmniSearchResults(q, res.data);
                    }
                }, 200);
            }
        });

        // Keyboard navigation (Arrow keys + Enter) inside search input
        input.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.highlightOmniIndex(this._searchSelectedIndex + 1);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.highlightOmniIndex(this._searchSelectedIndex - 1);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (this._searchItems.length > 0 && this._searchSelectedIndex >= 0) {
                    this.executeOmniItem(this._searchSelectedIndex);
                }
            }
        });
    },

    toggleSearch(force) {
        const modal = document.getElementById('omni-search-modal');
        const content = document.getElementById('omni-search-content');
        const input = document.getElementById('omni-search-input');
        if (!modal) return;

        const isCurrentlyOpen = !modal.classList.contains('hidden');
        const willOpen = typeof force === 'boolean' ? force : !isCurrentlyOpen;

        if (willOpen) {
            modal.classList.remove('hidden');
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
                if (content) {
                    content.classList.remove('scale-95');
                    content.classList.add('scale-100');
                }
            });
            if (input) {
                input.value = '';
                input.focus();
            }
            this.renderOmniDefaultActions();
        } else {
            modal.classList.add('opacity-0');
            if (content) {
                content.classList.remove('scale-100');
                content.classList.add('scale-95');
            }
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 250);
        }
    },

    renderOmniDefaultActions() {
        const resultsEl = document.getElementById('omni-search-results');
        if (!resultsEl) return;

        const quickActions = [
            { title: 'Input Kas Masuk (+)', subtitle: 'Penerimaan Kas & Setoran Tunai', icon: 'ri-add-circle-line', badge: 'Kasir', url: '#/kas-transaksi', action: () => { location.hash = '#/kas-transaksi'; setTimeout(() => window.KasTransaksiPage?.showForm?.('masuk'), 300); } },
            { title: 'Input Kas Keluar (−)', subtitle: 'Pengeluaran Biaya & Beban Operasional', icon: 'ri-indeterminate-circle-line', badge: 'Kasir', url: '#/kas-transaksi', action: () => { location.hash = '#/kas-transaksi'; setTimeout(() => window.KasTransaksiPage?.showForm?.('keluar'), 300); } },
            { title: 'Setor Simpanan Anggota', subtitle: 'Pencatatan Setoran Wajib / Pokok / Sukarela', icon: 'ri-wallet-3-line', badge: 'Teller', url: '#/simpanan' },
            { title: 'Pembayaran Angsuran Pinjaman', subtitle: 'Verifikasi & Pelunasan Cicilan Anggota', icon: 'ri-hand-coin-line', badge: 'Teller', url: '#/angsuran' },
            { title: 'Pengajuan Pinjaman Baru', subtitle: 'Formulir Permohonan Kredit Anggota', icon: 'ri-file-text-line', badge: 'Kredit', url: '#/pinjaman' },
            { title: 'Daftar / Tambah Anggota Baru', subtitle: 'Manajemen Data & Registrasi Anggota', icon: 'ri-user-add-line', badge: 'Master', url: '#/anggota' },
            { title: 'Kalkulator Kasir & Simulasi', subtitle: 'Hitung Kembalian & Simulasi Cicilan (Alt+C)', icon: 'ri-calculator-line', badge: 'Peralatan', action: () => this.toggleCalculator() },
            { title: 'Cetak Laporan Buku Besar', subtitle: 'Buku Besar & Mutasi Akun Standar SAK EP', icon: 'ri-book-open-line', badge: 'Laporan', url: '#/buku-besar' },
            { title: 'Cetak Laporan Neraca Keuangan', subtitle: 'Posisi Aset, Kewajiban, dan Modal Koperasi', icon: 'ri-scales-3-line', badge: 'Laporan', url: '#/neraca' },
            { title: 'Riwayat Pembaruan & Changelog', subtitle: 'Daftar Fitur Baru & Perkembangan Sistem', icon: 'ri-git-repository-line', badge: 'Sistem', url: '#/changelog' }
        ];

        this._searchItems = quickActions;
        this._searchSelectedIndex = 0;

        resultsEl.innerHTML = `
            <div class="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>⚡ Aksi Cepat & Navigasi Populer</span>
                <span class="text-primary-600 font-bold lowercase">Gunakan ↑↓ untuk memilih</span>
            </div>
            <div class="space-y-1 mt-1">
                ${quickActions.map((item, idx) => `
                    <div onclick="App.executeOmniItem(${idx})" data-omni-index="${idx}"
                        class="omni-item flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${idx === 0 ? 'bg-primary-50 text-primary-900 font-semibold ring-1 ring-primary-200' : 'hover:bg-slate-50 text-slate-700'}">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-primary-600 shrink-0">
                                <i class="${item.icon} text-lg"></i>
                            </div>
                            <div class="truncate">
                                <p class="text-xs font-bold truncate">${item.title}</p>
                                <p class="text-[10px] text-slate-400 truncate">${item.subtitle}</p>
                            </div>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-600 shrink-0">${item.badge}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    renderOmniSearchResults(query, backendResults = []) {
        const resultsEl = document.getElementById('omni-search-results');
        if (!resultsEl) return;

        const lowerQ = query.toLowerCase();
        const combined = [];

        // 1. Client-side matching in system menus (0ms instant)
        if (Array.isArray(this.menus)) {
            this.menus.forEach(menu => {
                if (menu.submenus && menu.submenus.length > 0) {
                    menu.submenus.forEach(sub => {
                        if (sub.nama?.toLowerCase().includes(lowerQ) || sub.url?.toLowerCase().includes(lowerQ)) {
                            combined.push({
                                title: sub.nama,
                                subtitle: `${menu.nama} ➔ ${sub.nama}`,
                                icon: sub.icon || menu.icon || 'ri-menu-line',
                                badge: 'Menu',
                                url: sub.url
                            });
                        }
                    });
                } else if (menu.nama?.toLowerCase().includes(lowerQ) || menu.url?.toLowerCase().includes(lowerQ)) {
                    combined.push({
                        title: menu.nama,
                        subtitle: 'Menu Utama',
                        icon: menu.icon || 'ri-menu-line',
                        badge: 'Menu',
                        url: menu.url
                    });
                }
            });
        }

        // 2. Add backend results (Anggota, No Pinjaman, etc.)
        if (Array.isArray(backendResults)) {
            backendResults.forEach(item => {
                // Avoid duplicate if same url
                if (!combined.some(c => c.url === item.url)) {
                    combined.push({
                        title: item.title,
                        subtitle: item.subtitle,
                        icon: item.icon || (item.type === 'Anggota' ? 'ri-user-line' : 'ri-file-text-line'),
                        badge: item.type || 'Data',
                        url: item.url
                    });
                }
            });
        }

        this._searchItems = combined;
        this._searchSelectedIndex = combined.length > 0 ? 0 : -1;

        if (combined.length === 0) {
            resultsEl.innerHTML = `
                <div class="p-8 text-center text-slate-400">
                    <i class="ri-search-eye-line text-4xl block opacity-30 mb-2"></i>
                    <p class="text-xs font-semibold text-slate-600">Tidak ada hasil untuk "${query}"</p>
                    <p class="text-[10px] text-slate-400 mt-1">Coba gunakan nama anggota, nomor buku, atau nama menu.</p>
                </div>
            `;
            return;
        }

        resultsEl.innerHTML = `
            <div class="px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Ditemukan ${combined.length} Hasil</span>
                <span class="text-primary-600 font-bold lowercase">Tekan Enter untuk membuka</span>
            </div>
            <div class="space-y-1 mt-1">
                ${combined.map((item, idx) => `
                    <div onclick="App.executeOmniItem(${idx})" data-omni-index="${idx}"
                        class="omni-item flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all ${idx === 0 ? 'bg-primary-50 text-primary-900 font-semibold ring-1 ring-primary-200' : 'hover:bg-slate-50 text-slate-700'}">
                        <div class="flex items-center gap-3 min-w-0">
                            <div class="w-8 h-8 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-primary-600 shrink-0">
                                <i class="${item.icon} text-lg"></i>
                            </div>
                            <div class="truncate">
                                <p class="text-xs font-bold truncate">${item.title}</p>
                                <p class="text-[10px] text-slate-400 truncate">${item.subtitle}</p>
                            </div>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-[9px] font-bold ${item.badge === 'Anggota' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'} shrink-0">${item.badge}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    highlightOmniIndex(newIndex) {
        if (!this._searchItems || this._searchItems.length === 0) return;
        if (newIndex < 0) newIndex = this._searchItems.length - 1;
        if (newIndex >= this._searchItems.length) newIndex = 0;

        this._searchSelectedIndex = newIndex;
        const allItems = document.querySelectorAll('.omni-item');
        allItems.forEach((el, idx) => {
            if (idx === newIndex) {
                el.className = 'omni-item flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all bg-primary-50 text-primary-900 font-semibold ring-1 ring-primary-200';
                el.scrollIntoView({ block: 'nearest' });
            } else {
                el.className = 'omni-item flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-all hover:bg-slate-50 text-slate-700';
            }
        });
    },

    executeOmniItem(index) {
        const item = this._searchItems[index];
        if (!item) return;
        this.toggleSearch(false);
        this.playSound('success');
        if (typeof item.action === 'function') {
            item.action();
        } else if (item.url) {
            location.hash = item.url;
        }
    },

    // ============================================================
    // FLOATING FINANCIAL & TELLER CALCULATOR
    // ============================================================
    calcState: {
        tab: 'cash',
        display: '0',
        formula: '',
        newInput: true,
        operator: null,
        operand: null
    },

    toggleCalculator(force) {
        const modal = document.getElementById('calculator-modal');
        const content = document.getElementById('calculator-content');
        if (!modal) return;

        const isCurrentlyOpen = !modal.classList.contains('hidden');
        const willOpen = typeof force === 'boolean' ? force : !isCurrentlyOpen;

        if (willOpen) {
            modal.classList.remove('hidden');
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
                if (content) {
                    content.classList.remove('scale-95');
                    content.classList.add('scale-100');
                }
            });
            this.calcHitungKembalian();
            this.calcHitungSimulasi();
        } else {
            modal.classList.add('opacity-0');
            if (content) {
                content.classList.remove('scale-100');
                content.classList.add('scale-95');
            }
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 250);
        }
    },

    calcSetTab(tab) {
        this.calcState.tab = tab;
        const btnCash = document.getElementById('calc-tab-cash');
        const btnLoan = document.getElementById('calc-tab-loan');
        const viewCash = document.getElementById('calc-view-cash');
        const viewLoan = document.getElementById('calc-view-loan');

        if (tab === 'cash') {
            btnCash?.classList.add('bg-white', 'shadow-sm', 'text-primary-600');
            btnCash?.classList.remove('text-slate-500');
            btnLoan?.classList.remove('bg-white', 'shadow-sm', 'text-primary-600');
            btnLoan?.classList.add('text-slate-500');
            viewCash?.classList.remove('hidden');
            viewLoan?.classList.add('hidden');
        } else {
            btnLoan?.classList.add('bg-white', 'shadow-sm', 'text-primary-600');
            btnLoan?.classList.remove('text-slate-500');
            btnCash?.classList.remove('bg-white', 'shadow-sm', 'text-primary-600');
            btnCash?.classList.add('text-slate-500');
            viewLoan?.classList.remove('hidden');
            viewCash?.classList.add('hidden');
            this.calcHitungSimulasi();
        }
    },

    calcUpdateDisplay() {
        const disp = document.getElementById('calc-display');
        const formEl = document.getElementById('calc-formula');
        const terbEl = document.getElementById('calc-terbilang');
        if (!disp) return;

        const rawVal = this.calcState.display;
        disp.textContent = rawVal;
        if (formEl) formEl.textContent = this.calcState.formula;

        const numeric = parseFloat(rawVal.replace(/,/g, ''));
        if (terbEl) {
            if (!isNaN(numeric) && isFinite(numeric)) {
                terbEl.textContent = this.terbilang(numeric);
            } else {
                terbEl.textContent = '-';
            }
        }
    },

    calcAction(key) {
        this.playSound('cash');
        let d = this.calcState.display;

        if (key === 'C') {
            this.calcState.display = '0';
            this.calcState.formula = '';
            this.calcState.newInput = true;
            this.calcState.operator = null;
            this.calcState.operand = null;
        } else if (key === 'backspace') {
            if (d.length <= 1 || d === 'Error') {
                this.calcState.display = '0';
                this.calcState.newInput = true;
            } else {
                this.calcState.display = d.slice(0, -1);
            }
        } else if (['+', '-', '*', '/'].includes(key)) {
            this.calcState.formula = d + ' ' + (key === '*' ? '×' : (key === '/' ? '÷' : key));
            this.calcState.operator = key;
            this.calcState.operand = parseFloat(d);
            this.calcState.newInput = true;
        } else if (key === '%') {
            const val = parseFloat(d) / 100;
            this.calcState.display = String(val);
            this.calcState.newInput = true;
        } else if (key === '=') {
            if (this.calcState.operator && typeof this.calcState.operand === 'number') {
                const a = this.calcState.operand;
                const b = parseFloat(d);
                let res = 0;
                if (this.calcState.operator === '+') res = a + b;
                else if (this.calcState.operator === '-') res = a - b;
                else if (this.calcState.operator === '*') res = a * b;
                else if (this.calcState.operator === '/') res = b !== 0 ? (a / b) : 'Error';

                this.calcState.formula = `${a} ${this.calcState.operator} ${b} =`;
                this.calcState.display = String(res);
                this.calcState.operator = null;
                this.calcState.operand = null;
                this.calcState.newInput = true;
            }
        } else if (key === '.') {
            if (!d.includes('.')) {
                this.calcState.display = d + '.';
                this.calcState.newInput = false;
            }
        } else if (key === '000') {
            if (this.calcState.newInput || d === '0') {
                this.calcState.display = '0';
            } else {
                this.calcState.display = d + '000';
            }
        } else {
            // Numbers 0-9
            if (this.calcState.newInput || d === '0' || d === 'Error') {
                this.calcState.display = key;
                this.calcState.newInput = false;
            } else {
                this.calcState.display = d + key;
            }
        }

        this.calcUpdateDisplay();
    },

    calcAddNominal(val) {
        this.playSound('cash');
        const curr = parseFloat(this.calcState.display) || 0;
        this.calcState.display = String(curr + val);
        this.calcState.newInput = true;
        this.calcUpdateDisplay();
    },

    calcCopyResult() {
        const val = this.calcState.display;
        if (navigator.clipboard) {
            navigator.clipboard.writeText(val);
            this.toast(`Nominal ${this.formatRupiah(parseFloat(val) || 0)} berhasil disalin! 📋`, 'success');
        }
    },

    calcApplyDisplayToTagihan() {
        const val = parseFloat(this.calcState.display) || 0;
        const tagihanInput = document.getElementById('calc-tagihan');
        if (tagihanInput) {
            tagihanInput.value = val;
            this.calcHitungKembalian();
            this.playSound('cash');
            this.toast('Total tagihan diset: ' + this.formatRupiah(val), 'info');
        }
    },

    calcHitungKembalian() {
        const tagihan = parseFloat(document.getElementById('calc-tagihan')?.value) || 0;
        const diterima = parseFloat(document.getElementById('calc-diterima')?.value) || 0;
        const textEl = document.getElementById('calc-kembalian-text');
        const boxEl = document.getElementById('calc-kembalian-box');
        if (!textEl || !boxEl) return;

        const selisih = diterima - tagihan;
        if (diterima === 0 && tagihan === 0) {
            textEl.textContent = 'Rp 0';
            boxEl.className = 'p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between';
            textEl.className = 'text-sm font-bold font-mono text-slate-700';
        } else if (selisih >= 0) {
            textEl.textContent = this.formatRupiah(selisih);
            boxEl.className = 'p-2.5 rounded-xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-between';
            textEl.className = 'text-sm font-bold font-mono text-emerald-700';
        } else {
            textEl.textContent = `Kurang ${this.formatRupiah(Math.abs(selisih))}`;
            boxEl.className = 'p-2.5 rounded-xl bg-rose-50 border border-rose-200/60 flex items-center justify-between';
            textEl.className = 'text-sm font-bold font-mono text-rose-600';
        }
    },

    calcHitungSimulasi() {
        const plafon = parseFloat(document.getElementById('calc-loan-plafon')?.value) || 0;
        const tenor = parseInt(document.getElementById('calc-loan-tenor')?.value) || 1;
        const bungaPersen = parseFloat(document.getElementById('calc-loan-bunga')?.value) || 0;

        const simAngsuran = document.getElementById('calc-sim-angsuran');
        const simPokok = document.getElementById('calc-sim-pokok');
        const simBunga = document.getElementById('calc-sim-bunga');
        const simTotal = document.getElementById('calc-sim-total');
        if (!simAngsuran) return;

        if (plafon <= 0 || tenor <= 0) {
            simAngsuran.textContent = 'Rp 0';
            if (simPokok) simPokok.textContent = 'Rp 0';
            if (simBunga) simBunga.textContent = 'Rp 0';
            if (simTotal) simTotal.textContent = 'Rp 0';
            return;
        }

        const pokokBln = Math.round(plafon / tenor);
        const bungaBln = Math.round(plafon * (bungaPersen / 100));
        const totalBln = pokokBln + bungaBln;
        const totalSemua = totalBln * tenor;

        simAngsuran.textContent = this.formatRupiah(totalBln) + ' / bln';
        if (simPokok) simPokok.textContent = this.formatRupiah(pokokBln);
        if (simBunga) simBunga.textContent = this.formatRupiah(bungaBln);
        if (simTotal) simTotal.textContent = this.formatRupiah(totalSemua);
    },

    calcCopySimulasi() {
        const plafon = parseFloat(document.getElementById('calc-loan-plafon')?.value) || 0;
        const tenor = parseInt(document.getElementById('calc-loan-tenor')?.value) || 1;
        const bungaPersen = parseFloat(document.getElementById('calc-loan-bunga')?.value) || 0;
        const totalBln = document.getElementById('calc-sim-angsuran')?.textContent || '';
        const totalSemua = document.getElementById('calc-sim-total')?.textContent || '';

        const text = `*SIMULASI PINJAMAN KOPERASI*\n` +
            `• Plafon: ${this.formatRupiah(plafon)}\n` +
            `• Jangka Waktu: ${tenor} Bulan\n` +
            `• Bunga: ${bungaPersen}% per bulan\n` +
            `• Angsuran per Bulan: ${totalBln}\n` +
            `• Total Pengembalian: ${totalSemua}\n\n` +
            `_Simulasi ini merupakan estimasi awal. Hubungi kantor koperasi untuk pengajuan resmi._`;

        if (navigator.clipboard) {
            navigator.clipboard.writeText(text);
            this.toast('Rincian simulasi berhasil disalin! Siap dikirim via WhatsApp 📲', 'success');
        }
    },

    // ============================================================
    // BUTTON LOADING AUTO-RESET HELPERS
    // ============================================================
    btnLoading(btn, text = 'Memproses...') {
        if (!btn || btn._isLoading) return;
        btn._isLoading = true;
        btn._originalHtml = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<span class="btn-spinner mr-1.5"></span> ${text}`;
    },

    btnReset(btn) {
        if (!btn || !btn._isLoading) return;
        btn._isLoading = false;
        btn.disabled = false;
        if (btn._originalHtml) btn.innerHTML = btn._originalHtml;
    },

    // ============================================================
    // CATATAN MEMO INTERNAL ANGGOTA (STAFF STICKY NOTES)
    // ============================================================
    getMemberNotes(anggotaId) {
        try {
            return JSON.parse(localStorage.getItem('member_staff_notes_' + anggotaId) || '[]');
        } catch (_) { return []; }
    },

    saveMemberNote(anggotaId, text) {
        if (!text || !text.trim()) return;
        const notes = this.getMemberNotes(anggotaId);
        const newNote = {
            id: Date.now(),
            text: text.trim(),
            author: this.user?.nama_lengkap || 'Petugas',
            date: new Date().toISOString()
        };
        notes.unshift(newNote);
        localStorage.setItem('member_staff_notes_' + anggotaId, JSON.stringify(notes));
        this.toast('Catatan memo internal berhasil disimpan 📝', 'success');
        return newNote;
    },

    deleteMemberNote(anggotaId, noteId) {
        let notes = this.getMemberNotes(anggotaId);
        notes = notes.filter(n => n.id !== noteId);
        localStorage.setItem('member_staff_notes_' + anggotaId, JSON.stringify(notes));
        this.toast('Catatan dihapus', 'info');
    },

    showMemberNotes(anggotaId, namaAnggota = '') {
        const renderNotesList = () => {
            const list = this.getMemberNotes(anggotaId);
            if (list.length === 0) {
                return `<div class="p-8 text-center text-slate-400">
                    <i class="ri-sticky-note-line text-4xl block opacity-30 mb-2"></i>
                    <p class="text-xs">Belum ada catatan internal untuk anggota ini.</p>
                </div>`;
            }
            return list.map(n => `
                <div class="p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl relative group mb-2">
                    <div class="flex items-center justify-between text-[10px] text-amber-800 font-bold mb-1.5">
                        <span class="flex items-center gap-1"><i class="ri-user-star-line"></i> ${n.author}</span>
                        <span>${this.formatDate(n.date)}</span>
                    </div>
                    <p class="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-wrap">${n.text}</p>
                    <button onclick="App.deleteMemberNote(${anggotaId}, ${n.id}); App.showMemberNotes(${anggotaId}, '${namaAnggota.replace(/'/g, "\\'")}');"
                        class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-rose-500 hover:text-rose-700 transition-all" title="Hapus Catatan">
                        <i class="ri-delete-bin-line text-sm"></i>
                    </button>
                </div>
            `).join('');
        };

        const html = `
            <div class="p-6">
                <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-lg">
                            <i class="ri-sticky-note-fill"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-base text-slate-900">Catatan Memo Internal Petugas</h3>
                            <p class="text-xs text-slate-400">Anggota: <strong class="text-slate-700">${namaAnggota || 'ID #' + anggotaId}</strong> (Hanya untuk catatan staf)</p>
                        </div>
                    </div>
                    <button onclick="App.closeModal()" class="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-slate-400">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                </div>

                <div class="mb-4">
                    <div class="relative">
                        <textarea id="new-member-note-text" rows="3" placeholder="Tulis catatan penting (contoh: Janji bayar angsuran tgl 25, nomor telepon keluarga: 0812..., konfirmasi via istri, dll)..."
                            class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-amber-500"></textarea>
                    </div>
                    <div class="flex justify-end mt-2">
                        <button onclick="
                            const t = document.getElementById('new-member-note-text').value;
                            if (t && t.trim()) {
                                App.saveMemberNote(${anggotaId}, t);
                                App.showMemberNotes(${anggotaId}, '${namaAnggota.replace(/'/g, "\\'")}');
                            }
                        " class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all">
                            <i class="ri-add-line"></i> Simpan Catatan Memo
                        </button>
                    </div>
                </div>

                <div class="border-t border-slate-100 pt-3">
                    <h4 class="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Riwayat Catatan Petugas:</h4>
                    <div class="max-h-60 overflow-y-auto pr-1">
                        ${renderNotesList()}
                    </div>
                </div>
            </div>
        `;

        this.openModal(html);
    },

    /**
     * Render modern SVG Micro Sparkline Trend Wave (Indikator Gelombang Tren)
     * Pure zero-dependency SVG micro-chart with smooth Catmull-Rom cubic Bezier curve,
     * area gradient fill, glowing end-beacon, and trend badge.
     * 
     * @param {Array<number>} data - Array of numeric values
     * @param {Object} options - Customization options
     * @returns {Object} Object with { svg, badge, html, pctChange, isUp, isDown, isNeutral, toString() }
     */
    renderSparkline(data = [], options = {}) {
        const {
            color = '#3b82f6',              // Base wave color (hex)
            width = 100,                    // SVG width in px
            height = 36,                    // SVG height in px
            strokeWidth = 2.5,              // Path stroke width
            showBadge = true,               // Whether to render trend percentage pill
            badgeText = null,               // Custom badge text override (e.g. '+8.5%')
            badgeSubtext = '',              // Optional subtext next to badge
            fillOpacity = 0.22,             // Area gradient opacity at peak
            showBeacon = true,              // Pulsing beacon circle at latest coordinate
            id = 'spk_' + Math.random().toString(36).substring(2, 9),
            className = '',
            trend = null                    // Force trend: 'up' | 'down' | 'neutral'
        } = options;

        let points = Array.isArray(data) && data.length > 0 ? [...data].map(Number) : [];
        if (points.length < 2) {
            // Default elegant harmonic wave
            points = [20, 28, 25, 34, 30, 42, 38];
        }

        const minVal = Math.min(...points);
        const maxVal = Math.max(...points);
        const range = maxVal - minVal;

        const padX = 4;
        const padY = 5;
        const usableWidth = width - (padX * 2);
        const usableHeight = height - (padY * 2);
        const stepX = usableWidth / (points.length - 1);

        // Map values to coordinates
        const coords = points.map((val, idx) => {
            const normalizedY = range === 0 ? 0.5 : (val - minVal) / range;
            return {
                x: Number((padX + (idx * stepX)).toFixed(1)),
                y: Number((height - padY - (normalizedY * usableHeight)).toFixed(1))
            };
        });

        // Catmull-Rom to Cubic Bezier curve path calculation
        let pathD = `M ${coords[0].x} ${coords[0].y}`;
        for (let i = 0; i < coords.length - 1; i++) {
            const p0 = coords[i === 0 ? 0 : i - 1];
            const p1 = coords[i];
            const p2 = coords[i + 1];
            const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

            const smoothing = 0.18;
            const cp1x = (p1.x + (p2.x - p0.x) * smoothing).toFixed(1);
            const cp1y = (p1.y + (p2.y - p0.y) * smoothing).toFixed(1);
            const cp2x = (p2.x - (p3.x - p1.x) * smoothing).toFixed(1);
            const cp2y = (p2.y - (p3.y - p1.y) * smoothing).toFixed(1);

            pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }

        const firstPt = coords[0];
        const lastPt = coords[coords.length - 1];
        const areaD = `${pathD} L ${lastPt.x} ${height} L ${firstPt.x} ${height} Z`;

        // Calculate trend percentage
        const firstVal = points[0];
        const lastVal = points[points.length - 1];
        let pctChange = 0;
        if (firstVal > 0) {
            pctChange = ((lastVal - firstVal) / firstVal) * 100;
        } else if (lastVal > 0) {
            pctChange = 100;
        }

        const isUp = trend === 'up' || (trend === null && pctChange > 0.05);
        const isDown = trend === 'down' || (trend === null && pctChange < -0.05);
        const isNeutral = !isUp && !isDown;

        const trendSign = pctChange > 0 ? '+' : '';
        const pctFormatted = isNeutral ? '0.0%' : `${trendSign}${pctChange.toFixed(1)}%`;
        const trendIcon = isNeutral 
            ? 'ri-subtract-line' 
            : (isUp ? 'ri-arrow-right-up-line' : 'ri-arrow-right-down-line');
        const trendColorClass = isNeutral 
            ? 'text-slate-600 bg-slate-100 border-slate-200' 
            : (isUp ? 'text-emerald-700 bg-emerald-50 border-emerald-200/70' : 'text-rose-700 bg-rose-50 border-rose-200/70');

        const badgeHtml = `
            <span class="sparkline-badge inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${trendColorClass}">
                <i class="${trendIcon} text-xs"></i>
                <span>${badgeText || pctFormatted}</span>
                ${badgeSubtext ? `<span class="text-[10px] font-normal text-slate-400 ml-0.5">${badgeSubtext}</span>` : ''}
            </span>
        `;

        const svgHtml = `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" class="sparkline-svg overflow-visible ${className}" style="--spk-color: ${color};">
                <defs>
                    <linearGradient id="${id}_grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="${color}" stop-opacity="${fillOpacity}"/>
                        <stop offset="85%" stop-color="${color}" stop-opacity="0.01"/>
                        <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
                    </linearGradient>
                </defs>
                <path d="${areaD}" fill="url(#${id}_grad)" class="sparkline-area" />
                <path d="${pathD}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="sparkline-path" />
                ${showBeacon ? `
                    <circle cx="${lastPt.x}" cy="${lastPt.y}" r="5" fill="${color}" opacity="0.3" class="sparkline-beacon" />
                    <circle cx="${lastPt.x}" cy="${lastPt.y}" r="2.5" fill="${color}" class="sparkline-dot" />
                ` : ''}
            </svg>
        `;

        const fullHtml = `
            <div class="sparkline-wrapper inline-flex flex-col items-end gap-1.5" data-sparkline-id="${id}">
                ${svgHtml}
                ${showBadge ? badgeHtml : ''}
            </div>
        `;

        return {
            svg: svgHtml,
            badge: badgeHtml,
            html: fullHtml,
            pctChange,
            isUp,
            isDown,
            isNeutral,
            toString() {
                return svgHtml;
            }
        };
    },

    // ===== MODE KERAPATAN TABEL (Compact vs Comfortable Density View) =====
    tableDensity: 'comfortable',

    initTableDensity() {
        const saved = localStorage.getItem('koperasi_table_density') || 'comfortable';
        this.applyTableDensity(saved, false);
    },

    applyTableDensity(density, notify = false) {
        this.tableDensity = density === 'compact' ? 'compact' : 'comfortable';
        const isCompact = this.tableDensity === 'compact';

        document.body.classList.toggle('table-compact-mode', isCompact);
        try {
            localStorage.setItem('koperasi_table_density', this.tableDensity);
        } catch (_) {}

        // Update Topbar Icon
        const iconEl = document.getElementById('topbar-density-icon');
        const btnEl = document.getElementById('topbar-density-btn');
        if (iconEl && btnEl) {
            if (isCompact) {
                iconEl.className = 'ri-table-view text-xl text-primary-600 font-bold';
                btnEl.title = 'Mode Kerapatan: Padat (Klik untuk Mode Nyaman)';
            } else {
                iconEl.className = 'ri-table-line text-xl';
                btnEl.title = 'Mode Kerapatan: Nyaman (Klik untuk Mode Padat)';
            }
        }

        // Update any inline density segmented buttons in current DOM
        document.querySelectorAll('[data-density-switcher]').forEach(switcher => {
            const comfBtn = switcher.querySelector('.density-opt-comfortable');
            const compBtn = switcher.querySelector('.density-opt-compact');
            if (comfBtn && compBtn) {
                if (isCompact) {
                    comfBtn.classList.remove('active');
                    compBtn.classList.add('active');
                } else {
                    compBtn.classList.remove('active');
                    comfBtn.classList.add('active');
                }
            }
        });

        if (notify) {
            this.toast(isCompact ? 'Mode Kerapatan: Padat (Ringkas)' : 'Mode Kerapatan: Nyaman (Lega)', 'info', 1600);
        }
    },

    toggleTableDensity(forceDensity = null) {
        let next;
        if (forceDensity === 'compact' || forceDensity === 'comfortable') {
            next = forceDensity;
        } else {
            next = this.tableDensity === 'compact' ? 'comfortable' : 'compact';
        }
        this.applyTableDensity(next, true);
    },

    renderDensityToggle() {
        const isCompact = this.tableDensity === 'compact';
        return `
            <div class="density-switcher-btn shrink-0" data-density-switcher title="Ubah kerapatan baris tabel (Padat / Nyaman)">
                <button type="button" onclick="App.toggleTableDensity('comfortable')" class="density-opt-comfortable ${!isCompact ? 'active' : ''}">
                    <i class="ri-menu-line"></i> <span class="hidden sm:inline">Nyaman</span>
                </button>
                <button type="button" onclick="App.toggleTableDensity('compact')" class="density-opt-compact ${isCompact ? 'active' : ''}">
                    <i class="ri-menu-fold-line"></i> <span class="hidden sm:inline">Padat</span>
                </button>
            </div>
        `;
    },

    // ===== FILTER PRESET WAKTU CEPAT (Quick Date Chips) =====
    _activeDatePresets: {},

    normalizePresetKey(p) {
        if (!p) return '';
        if (p === 'month' || p === 'this_month') return 'thisMonth';
        if (p === 'last_month' || p === 'prevMonth') return 'lastMonth';
        if (p === 'year' || p === 'this_year') return 'thisYear';
        if (p === 'last_year') return 'lastYear';
        return p;
    },

    renderDateChips(options = {}) {
        const {
            active = '',
            fromId = '',
            toId = '',
            callback = '',
            chips = ['today', '7days', 'thisMonth', 'lastMonth', 'thisYear'],
            flatpickrId = ''
        } = options;

        const groupKey = fromId || flatpickrId || callback || 'default';
        this._activeDatePresets = this._activeDatePresets || {};
        const storedActive = this._activeDatePresets[groupKey];
        const currentActive = this.normalizePresetKey(active || storedActive || 'thisMonth');

        const labels = {
            today: 'Hari Ini',
            '7days': '7 Hari',
            thisMonth: 'Bulan Ini',
            month: 'Bulan Ini',
            lastMonth: 'Bulan Lalu',
            last_month: 'Bulan Lalu',
            thisYear: 'Tahun Ini',
            year: 'Tahun Ini',
            lastYear: 'Tahun Lalu'
        };

        const chipHtml = chips.map(key => {
            const normalizedKey = this.normalizePresetKey(key);
            const isActive = normalizedKey === currentActive;
            const clickCall = `App.applyDatePreset('${key}', '${fromId}', '${toId}', '${callback}', '${flatpickrId}', this)`;
            return `
                <button type="button" 
                    data-date-chip="${key}"
                    onclick="${clickCall}"
                    class="date-chip px-2.5 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                        isActive 
                            ? 'is-active bg-primary-600 text-white shadow-xs font-bold' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }">
                    ${labels[key] || key}
                </button>
            `;
        }).join('');

        return `
            <div class="quick-date-chips inline-flex items-center gap-1.5 overflow-x-auto py-1 max-w-full" data-group-key="${groupKey}">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                    <i class="ri-calendar-event-line text-xs"></i> Periode:
                </span>
                ${chipHtml}
            </div>
        `;
    },

    applyDatePreset(preset, fromId, toId, callbackStr = '', flatpickrId = '', btnEl = null) {
        const normKey = this.normalizePresetKey(preset);
        const groupKey = fromId || flatpickrId || callbackStr || 'default';
        this._activeDatePresets = this._activeDatePresets || {};
        this._activeDatePresets[groupKey] = normKey;

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        const formatDate = (d, format = 'iso') => {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return format === 'dmy' ? `${day}-${m}-${y}` : `${y}-${m}-${day}`;
        };

        let startD, endD;
        if (normKey === 'today') {
            startD = now;
            endD = now;
        } else if (normKey === '7days') {
            const past7 = new Date();
            past7.setDate(past7.getDate() - 6);
            startD = past7;
            endD = now;
        } else if (normKey === 'thisMonth') {
            startD = new Date(year, month, 1);
            endD = new Date(year, month + 1, 0);
        } else if (normKey === 'lastMonth') {
            startD = new Date(year, month - 1, 1);
            endD = new Date(year, month, 0);
        } else if (normKey === 'thisYear') {
            startD = new Date(year, 0, 1);
            endD = new Date(year, 11, 31);
        } else if (normKey === 'lastYear') {
            startD = new Date(year - 1, 0, 1);
            endD = new Date(year - 1, 11, 31);
        } else {
            startD = new Date(year, month, 1);
            endD = new Date(year, month + 1, 0);
        }

        // Update active chip styling in the group immediately
        const container = btnEl ? btnEl.closest('.quick-date-chips') : document.querySelector(`[data-group-key="${groupKey}"]`);
        if (container) {
            container.querySelectorAll('.date-chip').forEach(el => {
                const elKey = this.normalizePresetKey(el.getAttribute('data-date-chip'));
                if (elKey === normKey) {
                    el.classList.add('is-active', 'bg-primary-600', 'text-white', 'shadow-xs', 'font-bold');
                    el.classList.remove('bg-slate-100', 'hover:bg-slate-200', 'text-slate-600');
                } else {
                    el.classList.remove('is-active', 'bg-primary-600', 'text-white', 'shadow-xs', 'font-bold');
                    el.classList.add('bg-slate-100', 'hover:bg-slate-200', 'text-slate-600');
                }
            });
        }

        // Handle flatpickr range input if provided
        if (flatpickrId) {
            const fpInput = document.getElementById(flatpickrId);
            if (fpInput && fpInput._flatpickr) {
                fpInput._flatpickr.setDate([startD, endD], false);
            }
        }

        // Handle separate from/to inputs
        const fromEl = document.getElementById(fromId);
        const toEl = document.getElementById(toId);
        if (fromEl && toEl) {
            const isDMY = fromEl.getAttribute('placeholder')?.includes('DD') || 
                          (fromEl.value && fromEl.value.includes('-') && fromEl.value.split('-')[0].length <= 2) ||
                          fromEl.id.startsWith('ak-') || fromEl.id.startsWith('bb-') || fromEl.id.startsWith('lr-') || fromEl.id.startsWith('jrn-');
            fromEl.value = formatDate(startD, isDMY ? 'dmy' : 'iso');
            toEl.value = formatDate(endD, isDMY ? 'dmy' : 'iso');
            fromEl.dispatchEvent(new Event('change'));
            toEl.dispatchEvent(new Event('change'));
        }

        this._isApplyingPreset = true;

        // Execute callback
        if (callbackStr) {
            try {
                if (typeof callbackStr === 'function') {
                    callbackStr(normKey, startD, endD);
                } else if (callbackStr.includes('(')) {
                    new Function(callbackStr)();
                } else {
                    new Function('preset', 'startD', 'endD', `${callbackStr}(preset, startD, endD)`)(normKey, startD, endD);
                }
            } catch (err) {
                console.warn('applyDatePreset callback error:', err);
            }
        }
        setTimeout(() => { this._isApplyingPreset = false; }, 400);
    },

    toggleRowDropdown(button) {
        const menu = button.nextElementSibling;
        document.querySelectorAll('.row-dropdown-menu').forEach(el => {
            if (el !== menu) el.classList.add('hidden');
        });
        menu.classList.toggle('hidden');
    },

    // ===== STICKY FLOATING SUMMARY BAR =====
    _stickySummaryState: {
        active: false,
        element: null,
        scrollListener: null,
        targetTfoot: null,
        targetTable: null
    },

    attachStickySummary(options = {}) {
        const {
            table = '.data-table',
            items = null, // [ { label: '...', value: '...', color: 'emerald' } ]
            title = 'Ringkasan Total',
            targetTfoot = null,
            targetBottom = null
        } = options;

        this.detachStickySummary();

        const tableEl = typeof table === 'string' ? document.querySelector(table) : table;
        if (!tableEl) return;

        const tfootEl = targetTfoot 
            ? (typeof targetTfoot === 'string' ? document.querySelector(targetTfoot) : targetTfoot)
            : tableEl.querySelector('tfoot');

        // Create or get container
        let bar = document.getElementById('app-floating-summary-bar');
        if (!bar) {
            bar = document.createElement('div');
            bar.id = 'app-floating-summary-bar';
            bar.className = 'floating-summary-bar is-hidden p-3 sm:px-6 sm:py-3.5';
            document.body.appendChild(bar);
        }

        // Generate items if not provided, by scraping tfoot cells
        let summaryItems = items;
        if (!summaryItems && tfootEl) {
            summaryItems = [];
            const cells = tfootEl.querySelectorAll('th, td');
            cells.forEach(cell => {
                const text = cell.innerText.trim();
                if (text && text !== '-' && text.length > 1) {
                    if (text.includes('Rp') || text.includes('%') || /\d/.test(text)) {
                        summaryItems.push({
                            label: cell.getAttribute('data-label') || 'Total',
                            value: text,
                            color: 'primary'
                        });
                    }
                }
            });
        }

        if (!summaryItems || !summaryItems.length) return;

        // Render content inside bar
        const itemsHtml = summaryItems.map(it => `
            <div class="flex flex-col min-w-0">
                <span class="text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-widest truncate">${it.label}</span>
                <span class="font-mono text-sm sm:text-base font-black ${
                    it.color === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' :
                    it.color === 'rose' || it.color === 'red' ? 'text-rose-600 dark:text-rose-400' :
                    it.color === 'amber' ? 'text-amber-600 dark:text-amber-400' :
                    'text-slate-900 dark:text-white'
                }">${it.value}</span>
            </div>
        `).join('');

        bar.innerHTML = `
            <div class="flex items-center justify-between gap-4">
                <div class="flex items-center gap-2.5 shrink-0">
                    <span class="w-9 h-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center font-bold text-base shadow-xs">
                        <i class="ri-calculator-line"></i>
                    </span>
                    <div class="hidden md:block">
                        <div class="text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">${title}</div>
                        <div class="text-[9px] text-slate-400 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Nilai Kumulatif</div>
                    </div>
                </div>

                <div class="floating-summary-body flex items-center gap-5 sm:gap-8 overflow-x-auto flex-1 justify-center sm:justify-start px-2">
                    ${itemsHtml}
                </div>

                <div class="flex items-center gap-1 shrink-0">
                    <button type="button" onclick="App.scrollToTableElement()" class="p-1.5 text-slate-400 hover:text-primary-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Gulir ke Ujung Tabel">
                        <i class="ri-arrow-down-double-line text-lg"></i>
                    </button>
                    <button type="button" onclick="App.toggleMinimizeStickySummary()" class="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors" title="Kecilkan / Besarkan">
                        <i class="ri-subtract-line text-lg"></i>
                    </button>
                    <button type="button" onclick="App.detachStickySummary()" class="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors" title="Tutup Ringkasan">
                        <i class="ri-close-line text-lg"></i>
                    </button>
                </div>
            </div>
        `;

        // Scroll listener to show/hide
        const checkVisibility = () => {
            if (!tableEl || !document.body.contains(tableEl)) {
                this.detachStickySummary();
                return;
            }

            const tableRect = tableEl.getBoundingClientRect();
            const bottomTarget = tfootEl || targetBottom || tableEl;
            const bottomRect = bottomTarget.getBoundingClientRect();
            const vh = window.innerHeight || document.documentElement.clientHeight;

            // Table has started scrolling into view, but bottom/tfoot is below viewport
            const tableTopVisibleOrPassed = tableRect.top < vh - 100;
            const bottomIsOffScreenBelow = bottomRect.top > vh - 40;
            const tableNotCompletelyPassed = tableRect.bottom > 150;

            if (tableTopVisibleOrPassed && bottomIsOffScreenBelow && tableNotCompletelyPassed) {
                bar.classList.remove('is-hidden');
            } else {
                bar.classList.add('is-hidden');
            }
        };

        window.addEventListener('scroll', checkVisibility, { passive: true });
        window.addEventListener('resize', checkVisibility, { passive: true });
        checkVisibility();

        this._stickySummaryState = {
            active: true,
            element: bar,
            scrollListener: checkVisibility,
            targetTable: tableEl,
            targetTfoot: tfootEl
        };
    },

    detachStickySummary() {
        if (this._stickySummaryState.scrollListener) {
            window.removeEventListener('scroll', this._stickySummaryState.scrollListener);
            window.removeEventListener('resize', this._stickySummaryState.scrollListener);
        }
        const bar = document.getElementById('app-floating-summary-bar');
        if (bar) {
            bar.classList.add('is-hidden');
        }
        this._stickySummaryState = {
            active: false,
            element: null,
            scrollListener: null,
            targetTable: null,
            targetTfoot: null
        };
    },

    scrollToTableElement() {
        if (this._stickySummaryState.targetTfoot) {
            this._stickySummaryState.targetTfoot.scrollIntoView({ behavior: 'smooth', block: 'end' });
        } else if (this._stickySummaryState.targetTable) {
            this._stickySummaryState.targetTable.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    },

    toggleMinimizeStickySummary() {
        const bar = document.getElementById('app-floating-summary-bar');
        if (bar) {
            bar.classList.toggle('is-minimized');
        }
    },

    // ===== KALENDER JATUH TEMPO FINANSIAL (Due-Dates Tracker) =====
    DueCalendar: {
        containerId: 'dashboard-due-calendar-widget',
        currentMonth: '', // 'YYYY-MM'
        selectedDate: null,
        filterTab: 'all', // 'all' | 'overdue' | 'today' | 'upcoming'
        viewMode: 'calendar', // 'calendar' | 'list'
        data: null,

        async init(containerId = 'dashboard-due-calendar-widget', initialMonth = null) {
            this.containerId = containerId;
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            this.currentMonth = initialMonth || `${y}-${m}`;
            this.selectedDate = `${y}-${m}-${String(now.getDate()).padStart(2, '0')}`;
            await this.load(this.currentMonth);
        },

        async load(monthStr) {
            const container = document.getElementById(this.containerId);
            if (!container) return;

            if (monthStr) this.currentMonth = monthStr;
            container.innerHTML = `
                <div class="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                    <div class="flex items-center justify-center py-12">
                        <div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
                        <span class="ml-3 text-sm text-slate-500 font-medium">Memuat Kalender Jatuh Tempo...</span>
                    </div>
                </div>
            `;

            const res = await App.api(`dashboard/due-calendar?month=${this.currentMonth}`);
            if (!res || !res.success) {
                container.innerHTML = `
                    <div class="bg-white rounded-2xl border border-red-100 p-6 text-center text-red-500 text-sm">
                        Gagal memuat kalender angsuran jatuh tempo.
                    </div>
                `;
                return;
            }

            this.data = res.data;
            this.render();
        },

        changeMonth(offset) {
            const [y, m] = this.currentMonth.split('-').map(Number);
            const d = new Date(y, m - 1 + offset, 1);
            const newY = d.getFullYear();
            const newM = String(d.getMonth() + 1).padStart(2, '0');
            this.currentMonth = `${newY}-${newM}`;
            this.selectedDate = null;
            this.load(this.currentMonth);
        },

        setFilterTab(tab) {
            this.filterTab = tab;
            this.render();
        },

        setViewMode(mode) {
            this.viewMode = mode;
            this.render();
        },

        selectDate(dateStr) {
            this.selectedDate = dateStr;
            this.render();
        },

        openWhatsApp(phone, nama, noPinjaman, angsuranKe, totalRp, tgl) {
            if (!phone) {
                App.toast('Nomor telepon anggota tidak tersedia', 'warning');
                return;
            }
            let cleanPhone = phone.replace(/[^0-9]/g, '');
            if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
            else if (cleanPhone.startsWith('8')) cleanPhone = '62' + cleanPhone;

            const tglFormatted = App.formatDate(tgl);
            const rpFormatted = App.formatRupiah(totalRp);
            const msg = `Halo Bpk/Ibu *${nama}*,\n\nKami dari *Koperasi* menginformasikan jadwal angsuran pinjaman:\n• No. Pinjaman: *${noPinjaman}*\n• Angsuran ke: *${angsuranKe}*\n• Jumlah: *${rpFormatted}*\n• Jatuh Tempo: *${tglFormatted}*\n\nMohon dapat melakukan pembayaran tepat waktu. Pembayaran dapat dilakukan via transfer atau setor tunai di kantor koperasi.\n\nTerima kasih.`;

            const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
            window.open(url, '_blank');
        },

        payNow(noPinjaman) {
            location.hash = `#/angsuran?search=${encodeURIComponent(noPinjaman)}`;
        },

        render() {
            const container = document.getElementById(this.containerId);
            if (!container || !this.data) return;

            const d = this.data;
            const summary = d.summary || {};
            const daysData = d.days || {};
            const today = d.today;

            const [y, m] = this.currentMonth.split('-').map(Number);
            const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
            const monthLabel = `${monthNames[m - 1]} ${y}`;

            const html = `
            <div class="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 p-6 sm:p-8 shadow-sm transition-all animate-fadeIn">
                <!-- Header Title & Controls -->
                <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100 dark:border-slate-800">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center text-2xl shadow-xs">
                            <i class="ri-calendar-todo-line"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="text-xl font-black text-slate-900 dark:text-white">Kalender Jatuh Tempo Finansial</h3>
                                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60">
                                    Due-Dates Tracker
                                </span>
                            </div>
                            <p class="text-xs text-slate-400 font-medium mt-0.5">Monitoring jadwal angsuran, proyeksi kas masuk harian, dan kirim pengingat WhatsApp 1-klik</p>
                        </div>
                    </div>

                    <!-- Month Picker & Navigation -->
                    <div class="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                        <div class="inline-flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                            <button type="button" onclick="App.DueCalendar.changeMonth(-1)" class="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors" title="Bulan Sebelumnya">
                                <i class="ri-arrow-left-s-line text-lg"></i>
                            </button>
                            <span class="px-3 text-xs font-bold text-slate-800 dark:text-slate-100 min-w-[120px] text-center">${monthLabel}</span>
                            <button type="button" onclick="App.DueCalendar.changeMonth(1)" class="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors" title="Bulan Berikutnya">
                                <i class="ri-arrow-right-s-line text-lg"></i>
                            </button>
                        </div>
                        <div class="inline-flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 text-xs font-bold">
                            <button type="button" onclick="App.DueCalendar.setViewMode('calendar')" class="px-3 py-1.5 rounded-lg transition-all ${this.viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-xs' : 'text-slate-500'}">
                                <i class="ri-grid-fill mr-1"></i> Kalender
                            </button>
                            <button type="button" onclick="App.DueCalendar.setViewMode('list')" class="px-3 py-1.5 rounded-lg transition-all ${this.viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-primary-400 shadow-xs' : 'text-slate-500'}">
                                <i class="ri-list-check-2 mr-1"></i> Daftar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- KPI Summary Cards -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div onclick="App.DueCalendar.setFilterTab('all')" class="cursor-pointer p-4 rounded-2xl border transition-all ${this.filterTab === 'all' ? 'bg-primary-50/70 dark:bg-primary-950/30 border-primary-300 dark:border-primary-800 ring-2 ring-primary-500/10' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-primary-200'}">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Tagihan Bulan Ini</span>
                            <span class="text-xs font-black text-primary-600 dark:text-primary-400">${summary.month_count || 0} Angsuran</span>
                        </div>
                        <div class="text-lg font-black text-slate-900 dark:text-white font-mono">${App.formatRupiah(summary.month_amount || 0)}</div>
                        <div class="text-[10px] text-slate-400 mt-1">Estimasi kas masuk ${monthLabel}</div>
                    </div>

                    <div onclick="App.DueCalendar.setFilterTab('today')" class="cursor-pointer p-4 rounded-2xl border transition-all ${this.filterTab === 'today' ? 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-800 ring-2 ring-indigo-500/10' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-indigo-200'}">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                <span class="w-2 h-2 rounded-full bg-indigo-500 animate-ping"></span> Jatuh Tempo Hari Ini
                            </span>
                            <span class="text-xs font-black text-indigo-600 dark:text-indigo-400">${summary.today_count || 0} Tagihan</span>
                        </div>
                        <div class="text-lg font-black text-indigo-700 dark:text-indigo-300 font-mono">${App.formatRupiah(summary.today_amount || 0)}</div>
                        <div class="text-[10px] text-slate-400 mt-1">Jatuh tempo tepat hari ini (${App.formatDate(today)})</div>
                    </div>

                    <div onclick="App.DueCalendar.setFilterTab('overdue')" class="cursor-pointer p-4 rounded-2xl border transition-all ${this.filterTab === 'overdue' ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 ring-2 ring-rose-500/10' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-rose-200'}">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                <i class="ri-error-warning-fill"></i> Terlambat / Menunggak
                            </span>
                            <span class="text-xs font-black text-rose-600 dark:text-rose-400">${summary.overdue_count || 0} Tagihan</span>
                        </div>
                        <div class="text-lg font-black text-rose-700 dark:text-rose-400 font-mono">${App.formatRupiah(summary.overdue_amount || 0)}</div>
                        <div class="text-[10px] text-slate-400 mt-1">Perlu tindakan penagihan segera</div>
                    </div>
                </div>

                <!-- Main View Area (Calendar Grid vs Full List) -->
                ${this.viewMode === 'calendar' ? this.renderCalendarView(y, m, daysData, today) : this.renderFullListView(d.all_items, today)}
            </div>
            `;

            container.innerHTML = html;
        },

        renderCalendarView(year, month, daysData, today) {
            const firstDayIdx = new Date(year, month - 1, 1).getDay();
            const startCol = (firstDayIdx + 6) % 7; 
            const totalDaysInMonth = new Date(year, month, 0).getDate();

            const dayHeaders = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
            const headerHtml = dayHeaders.map(h => `
                <div class="text-center font-bold text-[11px] uppercase tracking-wider text-slate-400 py-1.5">${h}</div>
            `).join('');

            let cellsHtml = '';
            for (let i = 0; i < startCol; i++) {
                cellsHtml += `<div class="due-calendar-cell is-empty bg-slate-50/40 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-100 dark:border-slate-800"></div>`;
            }

            for (let day = 1; day <= totalDaysInMonth; day++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayData = daysData[dateStr];
                const isToday = (dateStr === today);
                const isSelected = (this.selectedDate === dateStr);
                const isPast = (dateStr < today);

                const count = dayData?.count || 0;
                const total = dayData?.total || 0;
                const hasOverdue = dayData?.has_overdue || false;

                let badge = '';
                if (count > 0) {
                    if (isPast || hasOverdue) {
                        badge = `<div class="mt-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 truncate font-mono">${count} due &bull; ${App.formatRupiah(total).replace('Rp ', '')}</div>`;
                    } else if (isToday) {
                        badge = `<div class="mt-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 truncate font-mono">${count} hari ini</div>`;
                    } else {
                        badge = `<div class="mt-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 truncate font-mono">${count} tagihan</div>`;
                    }
                }

                cellsHtml += `
                    <div onclick="App.DueCalendar.selectDate('${dateStr}')" 
                        class="due-calendar-cell cursor-pointer p-2 rounded-xl border flex flex-col justify-between transition-all ${
                            isSelected ? 'is-selected ring-2 ring-primary-500 bg-primary-50/30 border-primary-500' :
                            isToday ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800' :
                            (count > 0 && isPast) ? 'bg-rose-50/30 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900' :
                            'bg-white dark:bg-slate-800/60 border-slate-100 dark:border-slate-800'
                        }">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-black ${
                                isToday ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold' :
                                isSelected ? 'text-primary-600 dark:text-primary-400 font-black' :
                                'text-slate-700 dark:text-slate-300'
                            }">${day}</span>
                            ${count > 0 ? `<span class="w-2 h-2 rounded-full ${isPast ? 'bg-rose-500 due-pulse-beacon' : isToday ? 'bg-indigo-500' : 'bg-emerald-500'}"></span>` : ''}
                        </div>
                        <div>
                            ${badge}
                        </div>
                    </div>
                `;
            }

            const selectedItems = this.selectedDate && daysData[this.selectedDate] ? daysData[this.selectedDate].items : [];

            return `
                <div class="space-y-6">
                    <div class="due-calendar-grid">
                        ${headerHtml}
                        ${cellsHtml}
                    </div>

                    <!-- Selected Day Detail Drilldown -->
                    <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                            <div>
                                <h4 class="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    <i class="ri-user-received-2-line text-primary-500"></i>
                                    Daftar Anggota Jatuh Tempo: 
                                    <span class="text-primary-600 dark:text-primary-400">${this.selectedDate ? App.formatDate(this.selectedDate) : 'Pilih Tanggal di Atas'}</span>
                                </h4>
                                <p class="text-xs text-slate-400">Total ${selectedItems.length} angsuran pada tanggal ini</p>
                            </div>
                            ${this.selectedDate && selectedItems.length > 0 ? `
                                <span class="font-mono text-xs font-black px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
                                    Total: ${App.formatRupiah(selectedItems.reduce((acc, x) => acc + parseFloat(x.total || 0), 0))}
                                </span>
                            ` : ''}
                        </div>

                        ${this.renderItemsList(selectedItems, today)}
                    </div>
                </div>
            `;
        },

        renderFullListView(allItems, today) {
            let filtered = allItems || [];
            if (this.filterTab === 'overdue') {
                filtered = filtered.filter(it => it.tgl_jatuh_tempo < today);
            } else if (this.filterTab === 'today') {
                filtered = filtered.filter(it => it.tgl_jatuh_tempo === today);
            } else if (this.filterTab === 'upcoming') {
                filtered = filtered.filter(it => it.tgl_jatuh_tempo > today);
            }

            return `
                <div class="space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold text-slate-500">Menampilkan ${filtered.length} tagihan</span>
                    </div>
                    ${this.renderItemsList(filtered, today)}
                </div>
            `;
        },

        renderItemsList(items, today) {
            if (!items || !items.length) {
                return `
                    <div class="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                        <i class="ri-checkbox-circle-line text-3xl text-emerald-400 mb-2 block"></i>
                        <p class="text-xs font-bold text-slate-500 uppercase tracking-wider">Tidak ada jadwal jatuh tempo pada tanggal / filter ini</p>
                        <p class="text-[11px] text-slate-400 mt-0.5">Semua angsuran terbayar lunas atau belum mendekati tanggal tagihan.</p>
                    </div>
                `;
            }

            return `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    ${items.map(it => {
                        const isOverdue = it.tgl_jatuh_tempo < today;
                        const isToday = it.tgl_jatuh_tempo === today;
                        const daysLate = Math.max(0, it.hari_terlambat || 0);

                        return `
                        <div class="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary-200 transition-all flex flex-col justify-between gap-3 group">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <div class="font-black text-slate-900 dark:text-white text-sm truncate" title="${it.anggota}">${it.anggota}</div>
                                    <div class="text-[10px] text-slate-400 font-mono mt-0.5">${it.no_anggota} &bull; ${it.no_pinjaman}</div>
                                    <div class="inline-flex items-center gap-1.5 mt-1.5 text-[11px] font-bold ${
                                        isOverdue ? 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-lg' :
                                        isToday ? 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-lg' :
                                        'text-slate-600 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-lg'
                                    }">
                                        <i class="${isOverdue ? 'ri-error-warning-line' : 'ri-time-line'}"></i>
                                        Angsuran ke-${it.angsuran_ke}/${it.tenor} &bull; ${
                                            isOverdue ? `Terlambat ${daysLate} hari` :
                                            isToday ? 'Jatuh Tempo Hari Ini' :
                                            App.formatDate(it.tgl_jatuh_tempo)
                                        }
                                    </div>
                                </div>

                                <div class="text-right shrink-0">
                                    <div class="font-mono font-black text-base ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}">
                                        ${App.formatRupiah(it.total)}
                                    </div>
                                    <div class="text-[9px] text-slate-400 mt-0.5">Pokok + Bunga</div>
                                </div>
                            </div>

                            <!-- Action Bar -->
                            <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                ${it.no_telp ? `
                                <button type="button" 
                                    onclick="App.DueCalendar.openWhatsApp('${it.no_telp}', '${it.anggota}', '${it.no_pinjaman}', ${it.angsuran_ke}, ${it.total}, '${it.tgl_jatuh_tempo}')" 
                                    class="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold transition-all flex items-center gap-1.5"
                                    title="Kirim pengingat WhatsApp ke ${it.no_telp}">
                                    <i class="ri-whatsapp-line text-sm text-emerald-600"></i> Pengingat WA
                                </button>
                                ` : ''}

                                <button type="button" 
                                    onclick="App.DueCalendar.payNow('${it.no_pinjaman}')" 
                                    class="px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs shadow-primary-500/20"
                                    title="Buka form input pembayaran angsuran">
                                    <i class="ri-secure-payment-line text-sm"></i> Bayar
                                </button>
                            </div>
                        </div>
                        `;
                    }).join('')}
                </div>
            `;
        }
    }
};

// ===== Boot =====
document.addEventListener('DOMContentLoaded', () => App.init());
