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
    version: '2.1.2', // Traceability Link & Audit Trail History
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

    // ===== AJAX Helper =====
    async api(endpoint, options = {}) {
        const url = this.API_BASE + '/' + endpoint.replace(/^\//, '');
        const config = {
            method: options.method || 'GET',
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
        try {
            const res = await fetch(url, config);
            const data = await res.json();
            if (res.status === 401 && !endpoint.includes('auth/login')) {
                this.showLogin(); return null;
            }
            return data;
        } catch (e) {
            console.error('API Error:', e);
            this.toast('Gagal menghubungi server', 'error');
            return null;
        }
    },

    // ===== Init =====
    async init() {
        // Load the latest version dynamically from CHANGELOG.md (falls back to hardcoded value if offline)
        await this._loadAppVersion();

        document.getElementById('current-date').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('login-form').addEventListener('submit', e => { e.preventDefault(); this.login(); });
        document.querySelectorAll('.copyright-year').forEach(el => el.textContent = new Date().getFullYear());

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
        if (res && res.success) {
            this.setUser(res.data);
            this.showApp();
        } else {
            this.showLogin();
        }
        window.addEventListener('hashchange', () => this.handleRoute());

        // Omni-Search Keyboard Shortcuts
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.toggleSearch();
            }
            if (e.key === 'Escape') {
                const modal = document.getElementById('omni-search-modal');
                if (modal && !modal.classList.contains('hidden')) this.toggleSearch();
            }
        });

        // Omni-Search Input Event
        document.getElementById('omni-search-input')?.addEventListener('input', (e) => {
            clearTimeout(this.searchTimer);
            const q = e.target.value.trim();
            if (q.length < 2) {
                document.getElementById('omni-search-results').innerHTML = '<div class="p-8 text-center text-slate-400"><i class="ri-command-line text-4xl mb-3 block opacity-20"></i><p class="text-sm font-medium">Gunakan <strong>Ctrl + K</strong> untuk mencari apapun secara instan.</p></div>';
                return;
            }

            this.searchTimer = setTimeout(async () => {
                document.getElementById('omni-search-results').innerHTML = '<div class="p-8 text-center"><i class="ri-loader-4-line text-4xl animate-spin text-primary-500"></i></div>';
                const res = await this.api(`search?q=${encodeURIComponent(q)}`);
                if (res?.success) this.renderSearchResults(res.data);
            }, 300);
        });

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

        // Hide Splash Screen with smooth transition (3s total)
        setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if (splash) {
                splash.classList.add('opacity-0', 'invisible', 'scale-110');
                setTimeout(() => splash.classList.add('hidden'), 700);
            }
        }, 3200);
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

    async showApp() {
        document.getElementById('login-page').classList.add('hidden');
        document.getElementById('app-layout').classList.remove('hidden');
        document.getElementById('app-layout').classList.add('flex');
        this.renderMenu();
        if (!location.hash || location.hash === '#/') location.hash = '#/dashboard';
        else this.handleRoute();

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
                this.version = match[1].replace(/^v/, ''); // Set version without 'v' prefix
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

    // ===== Render Sidebar Menu (Cloudflare-style) =====
    renderMenu() {
        const nav = document.getElementById('sidebar-menu');
        // Clear search input on menu re-render
        const searchEl = document.getElementById('sidebar-search');
        if (searchEl) searchEl.value = '';

        const renderItem = (m) => {
            if (m.children && m.children.length) {
                const id = 'sub_' + m.id;
                return `<div>
                    <button onclick="App.toggleSubmenu('${id}')" class="menu-item w-full">
                        <i class="${m.icon} menu-icon"></i>
                        <span class="flex-1 text-left">${m.nama}</span>
                        <i class="ri-arrow-down-s-line menu-arrow" id="arrow_${id}"></i>
                    </button>
                    <div id="${id}" class="submenu">
                        ${m.children.map(c => `<a href="${c.url}" class="submenu-item" data-url="${c.url}">${c.nama}</a>`).join('')}
                    </div>
                </div>`;
            }
            return `<a href="${m.url}" class="menu-item" data-url="${m.url}">
                <i class="${m.icon} menu-icon"></i><span>${m.nama}</span></a>`;
        };

        nav.innerHTML = this.menus.map(m => {
            if (m.is_header) {
                let html = `<div class="sidebar-label">${m.nama}</div>`;
                if (m.children) html += m.children.map(c => renderItem(c)).join('');
                return html;
            }
            return renderItem(m);
        }).join('');

        // Build flat list of all leaf items for search
        this._flatMenuItems = [];
        const collectLeaves = (items) => {
            (items || []).forEach(m => {
                if (m.is_header) { collectLeaves(m.children); return; }
                if (m.children) { collectLeaves(m.children); return; }
                if (m.url) this._flatMenuItems.push({ nama: m.nama, url: m.url, icon: m.icon || 'ri-circle-line' });
            });
        };
        collectLeaves(this.menus);
    },

    filterMenu(query) {
        const nav = document.getElementById('sidebar-menu');
        const q = (query || '').trim().toLowerCase();

        if (!q) {
            // Restore full menu
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
            ${matches.map(m => `
            <a href="${m.url}" class="menu-item" data-url="${m.url}">
                <i class="${m.icon} menu-icon"></i>
                <span>${highlight(m.nama)}</span>
            </a>`).join('')}
        </div>`;
    },

    toggleSubmenu(id) {
        const sub = document.getElementById(id);
        const arrow = document.getElementById('arrow_' + id);
        sub.classList.toggle('open');
        arrow.style.transform = sub.classList.contains('open') ? 'rotate(180deg)' : '';
    },

    setActiveMenu(hash) {
        document.querySelectorAll('#sidebar-menu .menu-item, #sidebar-menu .submenu-item').forEach(el => el.classList.remove('active'));
        const link = document.querySelector(`#sidebar-menu [data-url="${hash}"]`);
        if (link) {
            link.classList.add('active');
            const parent = link.closest('.submenu');
            if (parent) parent.classList.add('open');
        }
    },

    // ===== Router =====
    async handleRoute() {
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
            const mod = await import(`${basePath}assets/js/pages/${page}.js?v=${this.version}`);
            if (mod.default && typeof mod.default.render === 'function') {
                await mod.default.render(content, param);
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
        document.getElementById('page-title').textContent = title;
        const st = document.getElementById('page-subtitle');
        if (subtitle) { st.textContent = subtitle; st.classList.remove('hidden'); }
        else st.classList.add('hidden');
    },

    // ===== Toast =====
    toast(msg, type = 'info', duration = 3000) {
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
    openModal(html) {
        document.getElementById('modal-content').innerHTML = html;
        document.getElementById('modal-container').classList.remove('hidden');
    },
    closeModal() { document.getElementById('modal-container').classList.add('hidden'); },

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

    selectSearch(id, endpoint, valField = 'id', labelField = 'nama', placeholder = 'Pilih...') {
        return `<div class="relative" id="ss_${id}"><input type="text" id="${id}_search" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="${placeholder}" autocomplete="off"><input type="hidden" id="${id}"><div id="${id}_dd" class="hidden absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-auto"></div></div>`;
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

    drawPDFHeader(doc, title) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const getS = (key, def = '') => this.settings[key]?.value || def;
        const namaKop = getS('nama_koperasi') || getS('app_name', 'KOPERASI SIMPAN PINJAM "APP-KOPERASI"');

        // Get brand colors dynamically from active theme
        const activeThemeKey = localStorage.getItem('app_theme') || 'indigo';
        const theme = window.THEMES?.[activeThemeKey] || { shade: '#4f46e5', p: { 50: '#eef2ff', 900: '#312e81' } };
        
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [79, 70, 229];
        };
        const primaryRGB = hexToRgb(theme.p[400] || theme.shade);
        const darkRGB = hexToRgb(theme.p[700] || theme.shade);
        const brandRGB = hexToRgb(theme.shade);

        // 1. Draw Gorgeous Smooth Linear Gradient Header Background from y=0 to y=28
        const headerHeight = 28;
        const gradientSteps = 40;
        const stepHeight = headerHeight / gradientSteps;
        for (let i = 0; i < gradientSteps; i++) {
            const t = i / (gradientSteps - 1);
            const r = Math.round(primaryRGB[0] + t * (darkRGB[0] - primaryRGB[0]));
            const g = Math.round(primaryRGB[1] + t * (darkRGB[1] - primaryRGB[1]));
            const b = Math.round(primaryRGB[2] + t * (darkRGB[2] - primaryRGB[2]));
            
            doc.setFillColor(r, g, b);
            doc.rect(0, i * stepHeight, pageWidth, stepHeight + 0.1, 'F');
        }

        // 2. Logo / Emblem with modern card styling
        const logoUrl = getS('logo_url');
        let drawLogoFallback = true;
        if (logoUrl) {
            try {
                const ext = logoUrl.split('.').pop().split('?')[0].toUpperCase();
                const format = ['PNG', 'JPEG', 'JPG', 'WEBP'].includes(ext) ? ext : 'PNG';
                
                // Draw a beautiful white card wrapper for the logo image
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(14, 9, 10, 10, 1.5, 1.5, 'F');
                doc.addImage(logoUrl, format, 14.5, 9.5, 9, 9);
                drawLogoFallback = false;
            } catch (e) {
                drawLogoFallback = true;
            }
        }
        
        if (drawLogoFallback) {
            // Elegant glowing white card with primary-colored text initials
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(14, 9, 10, 10, 1.5, 1.5, 'F');
            
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(brandRGB[0], brandRGB[1], brandRGB[2]); // Solid primary theme color text
            
            const words = namaKop.split(/\s+/).filter(w => w.length > 0);
            let initials = '';
            if (words.length > 0) initials += words[0][0];
            if (words.length > 1) initials += words[1][0];
            if (initials.length === 0) initials = 'KP';
            doc.text(initials.toUpperCase(), 19, 15.5, { align: 'center' });
        }

        // 3. Institution details in elegant contrast white & slate-200
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255); // White for high contrast
        doc.text(namaKop.toUpperCase(), 28, 13);

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(226, 232, 240); // slate-200 for clean secondary text
        const alamat = getS('alamat', 'Jl. Raya Utama No. 123, Kel. Suka Maju, Kec. Cerdas, Kota Digital');
        doc.text(alamat, 28, 17.5);

        const telp = getS('telepon', '(021) 1234567');
        const email = getS('email', 'info@koperasi-app.com');
        const web = getS('website', 'www.koperasi-app.com');
        doc.text(`Telp: ${telp}  |  Email: ${email}  |  Website: ${web}`, 28, 21.5);



        // 4. Subtle glowing bottom accent line
        doc.setFillColor(brandRGB[0], brandRGB[1], brandRGB[2]);
        doc.rect(0, 27.5, pageWidth, 0.5, 'F');

        // 5. Title & Date section with brand color vertical vertical accent bar
        doc.setFillColor(brandRGB[0], brandRGB[1], brandRGB[2]);
        doc.rect(14, 34, 2.5, 5.5, 'F');

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text(title.toUpperCase(), 18.5, 38.5);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text('Tanggal Cetak: ' + this.todayDMY(), pageWidth - 14, 38.5, { align: 'right' });
    },

    drawPDFFooter(doc) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const str = 'Halaman ' + doc.internal.getNumberOfPages();
        
        // Thin gray line above footer
        doc.setDrawColor(241, 245, 249); // slate-100
        doc.setLineWidth(0.3);
        doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(str, 14, pageHeight - 9);
        doc.text('© ' + new Date().getFullYear() + ' CRUDWorks.com - Allright Reserved.', pageWidth - 14, pageHeight - 9, { align: 'right' });
    },





    drawPDFSummaryCards(doc, cards, startY) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 14;
        const availableWidth = pageWidth - (margin * 2);
        const gap = 4;
        const cardWidth = (availableWidth - (gap * (cards.length - 1))) / cards.length;
        const cardHeight = 16;

        // Get theme colors dynamically
        const activeThemeKey = localStorage.getItem('app_theme') || 'indigo';
        const theme = window.THEMES?.[activeThemeKey] || { shade: '#4f46e5', p: { 50: '#eef2ff', 900: '#312e81' } };
        
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [79, 70, 229];
        };
        const primaryRGB = hexToRgb(theme.shade);
        const bgRGB = hexToRgb(theme.p[50] || '#f8fafc');

        cards.forEach((card, idx) => {
            const x = margin + (idx * (cardWidth + gap));
            const y = startY;

            // Draw Card Background with beautiful rounded borders
            doc.setFillColor(bgRGB[0], bgRGB[1], bgRGB[2]);
            doc.roundedRect(x, y, cardWidth, cardHeight, 1.5, 1.5, 'F');
            
            // Draw Dynamic left vertical accent line in solid primary theme color
            doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
            doc.rect(x, y, 1.5, cardHeight, 'F');

            // Draw Labels (faint slate-500)
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(100, 116, 139); // slate-500
            
            const cleanLabel = String(card.label).toUpperCase();
            doc.text(cleanLabel, x + 4, y + 5.5);

            // Draw Values (bold slate-900)
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text(String(card.value), x + 4, y + 11.5);
        });

        return startY + cardHeight + 6; // Return new startY for the table
    },



    exportPDF(title, filename, columns, rows, footer = null, options = {}) {
        const activeThemeKey = localStorage.getItem('app_theme') || 'indigo';
        const theme = window.THEMES?.[activeThemeKey] || { shade: '#4f46e5', p: { 50: '#eef2ff', 900: '#312e81' } };
        
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [79, 70, 229];
        };
        const primary50RGB = hexToRgb(theme.p[50] || '#f1f5f9');
        const primary900RGB = hexToRgb(theme.p[900] || '#0f172a');

        const { jsPDF } = window.jspdf;
        const orientation = options.orientation || (columns.length > 7 ? 'l' : 'p');
        const doc = new jsPDF(orientation, 'mm', 'a4');

        // Dynamic printable width calculation based on margins
        const docWidth = doc.internal.pageSize.getWidth();
        const defaultMargin = { top: 48, bottom: 20, left: 14, right: 14 };
        const userMargin = options.tableStyle?.margin || {};
        const leftMargin = typeof userMargin === 'number' ? userMargin : (userMargin.left !== undefined ? userMargin.left : 14);
        const rightMargin = typeof userMargin === 'number' ? userMargin : (userMargin.right !== undefined ? userMargin.right : 14);
        const printableWidth = docWidth - leftMargin - rightMargin;

        let currentStartY = options.startY || 48;
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
                const title = (col.title || '').toLowerCase();

                if (key === 'no' || key === 'index' || key === 'id' || title === 'no') {
                    return 1.1; // Better weight for No column to prevent text wrapping
                }
                if (key.includes('tanggal') || key.includes('date') || key.includes('tgl') || title.includes('tgl') || title.includes('tanggal')) {
                    return 2.2;
                }
                if (key.includes('no_') || key.includes('kode') || key.includes('rekening') || key.includes('norek') || key.includes('ref')) {
                    return 2.8;
                }
                if (key.includes('nama') || key.includes('anggota') || key.includes('user') || title.includes('nama') || title.includes('anggota')) {
                    return 4.8; // Generous space for names
                }
                if (key.includes('keterangan') || key.includes('keperluan') || key.includes('deskripsi') || key.includes('uraian') || title.includes('keterangan') || title.includes('keperluan')) {
                    return 6.5; // Very generous space for descriptions
                }
                if (['jumlah', 'debit', 'kredit', 'saldo', 'total', 'nominal', 'plafon', 'bayar', 'tagihan', 'shu', 'simpanan', 'jasa'].some(k => key.includes(k) || title.includes(k))) {
                    return 3.2; // Medium-wide space for formatting currencies nicely
                }
                return 3.0; // Standard fallback weight
            });

            const totalWeight = weights.reduce((a, b) => a + b, 0);
            return cols.map((col, idx) => {
                const calculatedWidth = (weights[idx] / totalWeight) * totalWidth;
                const key = (col.key || '').toLowerCase();
                const title = (col.title || '').toLowerCase();
                
                // Fine-tune bounding constraints to prevent wrap issues
                if (key === 'no' || key === 'index' || title === 'no') {
                    return Math.max(11, Math.min(calculatedWidth, 16));
                }
                return Math.round(calculatedWidth * 10) / 10;
            });
        };

        const calculatedColWidths = getColumnWidths(columns, printableWidth);

        const tableStyle = {
            theme: 'striped',
            headStyles: { 
                fillColor: primary50RGB, // Soft active brand color tint for a modern SaaS dashboard feel
                textColor: primary900RGB, // Deep brand color text for outstanding contrast and legibility
                fontSize: 8, 
                cellPadding: { top: 4, bottom: 4, left: 3.5, right: 3.5 }, 
                fontStyle: 'bold', 
                halign: 'center',
                valign: 'middle',
                lineColor: [226, 232, 240], // Soft gray bottom divider
                lineWidth: 0.1
            },
            bodyStyles: { 
                fontSize: 7.8, // Elegant, crisp small text for premium readability
                cellPadding: { top: 3.5, bottom: 3.5, left: 3.5, right: 3.5 }, 
                textColor: [30, 41, 59], // Soft Slate-800 instead of heavy pure black
                lineColor: [241, 245, 249], // Minimalist tailwind slate-100 dividers
                lineWidth: 0.08 
            },
            alternateRowStyles: { 
                fillColor: [252, 253, 254] // Faint slate tint for clean row distinction
            },
            margin: defaultMargin,
            ...options.tableStyle
        };

        const columnStyles = {};
        columns.forEach((col, idx) => {
            columnStyles[idx] = {};
            if (col.align) columnStyles[idx].halign = col.align;
            else if (['jumlah', 'debit', 'kredit', 'saldo', 'total', 'pokok', 'bunga', 'denda'].some(k => col.key.toLowerCase().includes(k))) {
                columnStyles[idx].halign = 'right';
            }
            // Enforce proportional column width
            columnStyles[idx].cellWidth = calculatedColWidths[idx];
        });

        let tableBody = rows;
        let rowsMetadata = null;
        if (rows.length > 0 && !Array.isArray(rows[0])) {
            rowsMetadata = rows; // Keep original rows for metadata lookup
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
                // Check if this row has isGroup metadata (from rowsMetadata)
                const origRow = rowsMetadata && rowsMetadata[data.row.index];
                const colKey = columns[data.column.index]?.key || '';
                
                // Build the metadata keys to check
                const groupKeyForThisCol = colKey.replace('_keterangan', '_isGroup').replace('_nominal', '_isGroup');
                const totalKeyForThisCol = colKey.replace('_keterangan', '_isTotal').replace('_nominal', '_isTotal');
                
                const isGroupRow = origRow && origRow[groupKeyForThisCol] === true;
                const isTotalRow = origRow && origRow[totalKeyForThisCol] === true;
                
                // Style group/category rows and total rows with stronger visual emphasis
                if (isGroupRow) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.textColor = [15, 23, 42];
                    data.cell.styles.lineColor = [226, 232, 240];
                    data.cell.styles.lineWidth = 0.12;
                    
                    if (isTotalRow) {
                        data.cell.styles.fillColor = primary50RGB;
                        data.cell.styles.textColor = primary900RGB;
                        data.cell.styles.lineColor = [203, 213, 225];
                        data.cell.styles.lineWidth = 0.2;
                    } else {
                        data.cell.styles.fillColor = [248, 250, 252];
                    }
                }
                // Style footer summary row with soft color matching current active theme and slate-300 borders
                else if (footer && data.row.index === tableBody.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = primary50RGB;
                    data.cell.styles.textColor = primary900RGB;
                    data.cell.styles.lineColor = [203, 213, 225]; // slate-300
                    data.cell.styles.lineWidth = 0.2;
                } else {
                    // --- Premium Status Badge Styling ---
                    const rawVal = String(data.cell.raw || '').trim().toUpperCase();
                    const colIndex = data.column.index;
                    const originalCol = columns[colIndex];
                    
                    if (originalCol) {
                        const key = String(originalCol.key || '').toLowerCase();
                        const title = String(originalCol.title || '').toLowerCase();
                        
                        const isStatusColumn = key.includes('status') || key.includes('kolek') || key.includes('tipe') || key.includes('jenis') || 
                                               title.includes('status') || title.includes('kolek') || title.includes('tipe') || title.includes('jenis');
                                               
                        const isShortText = rawVal.length > 0 && rawVal.length <= 60;
                        
                        if (isStatusColumn && isShortText) {
                        // 1. Red / Danger Statuses (Check first to avoid partial green match on KURANG LANCAR)
                        if (['MACET', 'MENUNGGAK', 'DITOLAK', 'REJECTED', 'BATAL', 'CANCELLED', 'NON-AKTIF', 'NON ACTIVE', 'KELUAR', 'PENARIKAN', 'DEBIT'].some(s => rawVal.includes(s))) {
                            data.cell.styles.fillColor = [254, 226, 226]; // bg-red-100
                            data.cell.styles.textColor = [185, 28, 28];   // text-red-700
                            data.cell.styles.fontStyle = 'bold';
                        }
                        // 2. Yellow / Warning Statuses
                        else if (['KURANG LANCAR', 'DIRAGUKAN', 'PENDING', 'PROSES', 'MENUNGGU', 'DRAFT', 'JATUH TEMPO', 'DPK'].some(s => rawVal.includes(s))) {
                            data.cell.styles.fillColor = [254, 243, 199]; // bg-amber-100
                            data.cell.styles.textColor = [180, 83, 9];    // text-amber-700
                            data.cell.styles.fontStyle = 'bold';
                        }
                        // 3. Green / Success Statuses
                        else if (['LANCAR', 'AKTIF', 'ACTIVE', 'LUNAS', 'SUKSES', 'SUCCESS', 'APPROVED', 'DISETUJUI', 'MASUK', 'SETORAN', 'KREDIT'].some(s => rawVal.includes(s))) {
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
                this.drawPDFHeader(doc, title);
                this.drawPDFFooter(doc);
                if (options.didDrawPage) options.didDrawPage(data);
            }
        });

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
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col scale-in">
                <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 class="text-lg font-bold text-gray-800"><i class="ri-history-line text-amber-500 mr-2"></i>Riwayat Koreksi Data</h3>
                        <p class="text-xs text-gray-500 font-mono">Log perubahan untuk data ID ${id} di tabel ${table.toUpperCase()}</p>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="p-2 hover:bg-gray-100 rounded-xl transition-colors"><i class="ri-close-line text-xl text-gray-400"></i></button>
                </div>
                <div class="p-6 overflow-y-auto flex-1 space-y-6">
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
                <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button onclick="this.closest('.fixed').remove()" class="bg-gray-850 hover:bg-gray-900 text-white px-6 py-2 rounded-xl text-sm font-medium transition-all">Tutup</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
    }
};

// ===== Boot =====
document.addEventListener('DOMContentLoaded', () => App.init());
