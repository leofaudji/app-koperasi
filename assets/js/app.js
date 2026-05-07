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
    version: '1.8.0', // Default version, will be updated from CHANGELOG.md
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
        document.getElementById('current-date').textContent = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('login-form').addEventListener('submit', e => { e.preventDefault(); this.login(); });
        document.querySelectorAll('.copyright-year').forEach(el => el.textContent = new Date().getFullYear());

        // Fetch public stats for login page
        this.api('public/stats').then(res => {
            if (res && res.success && res.data.total_anggota !== undefined) {
                const el = document.getElementById('login-total-anggota');
                if (el) el.textContent = res.data.total_anggota + ' Anggota';
            }
        });

        const res = await this.api('auth/me');
        if (res && res.success) {
            this.setUser(res.data);

            // Load global settings after login
            const settRes = await this.api('settings');
            if (settRes && settRes.success) {
                this.settings = settRes.data;
            }

            this.showApp();
        } else {
            this.showLogin();
        }
        window.addEventListener('hashchange', () => this.handleRoute());
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

            // 1. Show splash screen instantly (solid background)
            const splash = document.getElementById('splash-screen');
            splash.classList.remove('hidden', 'opacity-0');
            splash.classList.add('opacity-100');

            // 2. Hide login page immediately so it's not visible during/after splash transition
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
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
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
        if (hash === this.currentRoute) return;
        this.currentRoute = hash;
        this.setActiveMenu(hash);
        const content = document.getElementById('app-content');
        content.innerHTML = '<div class="flex items-center justify-center h-64"><div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div></div>';
        const route = hash.replace('#/', '');
        const parts = route.split('/');
        const page = parts[0] || 'dashboard';
        const param = parts[1] || null;

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
        return new Date().toISOString().slice(0, 10);
    },

    monthAgoDMY() {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return String(d.getDate()).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + d.getFullYear();
    },

    monthAgoISO() {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().slice(0, 10);
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

        const logoUrl = getS('logo_url');
        if (logoUrl) {
            try {
                const ext = logoUrl.split('.').pop().split('?')[0].toUpperCase();
                const format = ['PNG', 'JPEG', 'JPG', 'WEBP'].includes(ext) ? ext : 'PNG';
                doc.addImage(logoUrl, format, 14, 10, 8, 8);
            } catch (e) {
                // Fallback to placeholder if image fails to load
                doc.setFillColor(15, 23, 42);
                doc.rect(14, 10, 8, 8, 'F');
            }
        } else {
            doc.setFillColor(15, 23, 42);
            doc.rect(14, 10, 8, 8, 'F');
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        const namaKop = getS('app_name', 'KOPERASI SIMPAN PINJAM "APP-KOPERASI"');
        doc.text(namaKop.toUpperCase(), 26, 16);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        const alamat = getS('alamat', 'Jl. Raya Utama No. 123, Kel. Suka Maju, Kec. Cerdas, Kota Digital');
        doc.text(alamat, 26, 21);

        const telp = getS('telepon', '(021) 1234567');
        const email = getS('email', 'info@koperasi-app.com');
        const web = getS('website', 'www.koperasi-app.com');
        doc.text(`Telp: ${telp} | Email: ${email} | Website: ${web}`, 26, 25);

        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(14, 29, pageWidth - 14, 29);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(title.toUpperCase(), 14, 38);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100);
        doc.text('Tanggal Cetak: ' + this.todayDMY(), pageWidth - 14, 38, { align: 'right' });
    },

    drawPDFFooter(doc) {
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const str = 'Halaman ' + doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(str, 14, pageHeight - 10);
        doc.text('© ' + new Date().getFullYear() + ' CRUDWorks.com - Allright Reserved.', pageWidth - 14, pageHeight - 10, { align: 'right' });
    },

    exportPDF(title, filename, columns, rows, footer = null, options = {}) {
        const { jsPDF } = window.jspdf;
        const orientation = options.orientation || (columns.length > 7 ? 'l' : 'p');
        const doc = new jsPDF(orientation, 'mm', 'a4');

        const tableStyle = {
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9, cellPadding: 4, fontStyle: 'bold', halign: 'center' },
            bodyStyles: { fontSize: 8, cellPadding: 3, textColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { top: 45, bottom: 20, left: 14, right: 14 },
            ...options.tableStyle
        };

        const columnStyles = {};
        columns.forEach((col, idx) => {
            if (col.align) columnStyles[idx] = { halign: col.align };
            else if (['jumlah', 'debit', 'kredit', 'saldo', 'total', 'pokok', 'bunga', 'denda'].some(k => col.key.toLowerCase().includes(k))) {
                columnStyles[idx] = { halign: 'right' };
            }
        });

        let tableBody = rows;
        if (rows.length > 0 && !Array.isArray(rows[0])) {
            tableBody = rows.map((row, i) => columns.map(col => col.key === 'no' ? (i + 1) : row[col.key]));
        }

        if (footer) tableBody.push(columns.map(col => footer[col.key] || ''));

        doc.autoTable({
            startY: options.startY || 45,
            head: [columns.map(col => col.title)],
            body: tableBody,
            ...tableStyle,
            columnStyles: { ...columnStyles, ...options.columnStyles },
            didParseCell: (data) => {
                if (footer && data.row.index === tableBody.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [241, 245, 249];
                    data.cell.styles.textColor = [15, 23, 42];
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
        let csv = columns.map(col => `"${col.title}"`).join(',') + '\n';
        data.forEach((row, i) => {
            csv += columns.map(col => {
                const val = col.key === 'no' ? (i + 1) : (row[col.key] === null || row[col.key] === undefined ? '' : row[col.key]);
                return `"${String(val).replace(/"/g, '""')}"`;
            }).join(',') + '\n';
        });
        if (footer) csv += columns.map(col => `"${footer[col.key] || ''}"`).join(',') + '\n';

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `${filename}_${new Date().getTime()}.csv`);
        link.click();
    }
};

// ===== Boot =====
document.addEventListener('DOMContentLoaded', () => App.init());
