// Web Push Notifications Page
const WebPushPage = {
    activeTab: 'subscriptions',
    stats: null,
    subFilters: { page: 1, limit: 15, search: '' },
    logFilters: { page: 1, limit: 15, search: '', tipe: '', status: '' },
    subData: [],
    subPagination: {},
    logData: [],
    logPagination: {},

    async render(container) {
        App.setTitle('Web Push Notifikasi', 'Laporan, pemantauan perangkat & pengiriman push notification');

        container.innerHTML = `
        <div class="flex flex-col gap-6 animate-fadeIn pb-12">
            <!-- Header & Action -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">Layanan Web Push Notifikasi</h3>
                    <p class="text-xs text-gray-400 mt-1">Sistem pengiriman notifikasi real-time native RFC 8291 / RFC 8292 VAPID</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="WebPushPage.loadStats(); WebPushPage.loadActiveTab();" class="bg-white border border-gray-200 text-gray-600 hover:text-primary-600 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 active:scale-95">
                        <i class="ri-refresh-line"></i> Refresh Data
                    </button>
                    <button onclick="WebPushPage.switchTab('broadcast')" class="bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shadow-primary-500/20 flex items-center gap-1.5 active:scale-95">
                        <i class="ri-broadcast-line text-sm"></i> Kirim Broadcast
                    </button>
                </div>
            </div>

            <!-- Stats Overview Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="push-stats-grid">
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
                    <div class="h-4 w-24 bg-gray-100 rounded mb-2"></div>
                    <div class="h-8 w-16 bg-gray-100 rounded"></div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
                    <div class="h-4 w-24 bg-gray-100 rounded mb-2"></div>
                    <div class="h-8 w-16 bg-gray-100 rounded"></div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
                    <div class="h-4 w-24 bg-gray-100 rounded mb-2"></div>
                    <div class="h-8 w-16 bg-gray-100 rounded"></div>
                </div>
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
                    <div class="h-4 w-24 bg-gray-100 rounded mb-2"></div>
                    <div class="h-8 w-16 bg-gray-100 rounded"></div>
                </div>
            </div>

            <!-- Tabs Navigation -->
            <div class="flex items-center gap-2 border-b border-gray-200/80 pb-3 overflow-x-auto scrollbar-none">
                <button onclick="WebPushPage.switchTab('subscriptions')" id="tab-btn-subscriptions" 
                    class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-primary-600 text-white shadow-sm">
                    <i class="ri-smartphone-line text-sm"></i> Perangkat Terdaftar
                    <span id="badge-total-devices" class="px-2 py-0.5 rounded-full bg-white/20 text-[10px] ml-1">0</span>
                </button>
                <button onclick="WebPushPage.switchTab('logs')" id="tab-btn-logs" 
                    class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                    <i class="ri-history-line text-sm"></i> Riwayat Pengiriman
                </button>
                <button onclick="WebPushPage.switchTab('broadcast')" id="tab-btn-broadcast" 
                    class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                    <i class="ri-megaphone-line text-sm"></i> Kirim Broadcast
                </button>
                <button onclick="WebPushPage.switchTab('diagnostics')" id="tab-btn-diagnostics" 
                    class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                    <i class="ri-shield-check-line text-sm"></i> Diagnostik VAPID
                </button>
            </div>

            <!-- Tab Content Container -->
            <div id="push-tab-content">
                <!-- Content injected dynamically -->
            </div>
        </div>

        <!-- Modal Detail Log -->
        <div id="modal-log-detail" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 transform transition-all animate-scaleUp">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center text-lg">
                            <i class="ri-notification-3-line"></i>
                        </div>
                        <div>
                            <h4 class="text-sm font-bold text-gray-800" id="m-log-title">-</h4>
                            <p class="text-[10px] text-gray-400" id="m-log-time">-</p>
                        </div>
                    </div>
                    <button onclick="WebPushPage.closeModal('modal-log-detail')" class="text-gray-400 hover:text-gray-600 p-1 rounded-xl">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                </div>
                
                <div class="space-y-3.5 text-xs">
                    <div class="p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Isi Pesan Notifikasi</p>
                        <p class="text-gray-700 leading-relaxed font-medium" id="m-log-message">-</p>
                    </div>

                    <div class="grid grid-cols-2 gap-2.5">
                        <div class="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span class="text-[10px] text-gray-400 block mb-0.5">Tipe Event:</span>
                            <span class="font-bold text-gray-700 uppercase" id="m-log-tipe">-</span>
                        </div>
                        <div class="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span class="text-[10px] text-gray-400 block mb-0.5">Penerima:</span>
                            <span class="font-bold text-gray-700" id="m-log-recipient">-</span>
                        </div>
                        <div class="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span class="text-[10px] text-gray-400 block mb-0.5">Status Pengiriman:</span>
                            <span class="font-bold" id="m-log-status">-</span>
                        </div>
                        <div class="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span class="text-[10px] text-gray-400 block mb-0.5">Hasil Kirim:</span>
                            <span class="font-bold text-gray-700" id="m-log-counts">-</span>
                        </div>
                    </div>

                    <div class="p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span class="text-[10px] text-gray-400 block mb-0.5">URL Tujuan Link:</span>
                        <code class="font-mono text-[11px] text-primary-600 select-all" id="m-log-url">-</code>
                    </div>

                    <div id="m-log-error-box" class="p-3 bg-rose-50 border border-rose-100 rounded-xl hidden">
                        <span class="text-[10px] font-bold text-rose-700 block mb-0.5">Rincian Error:</span>
                        <code class="font-mono text-[11px] text-rose-600 block whitespace-pre-wrap" id="m-log-error">-</code>
                    </div>
                </div>

                <div class="mt-6 flex justify-end">
                    <button onclick="WebPushPage.closeModal('modal-log-detail')" class="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
        `;

        await this.loadStats();
        this.renderTabSubscriptions();
    },

    switchTab(tab) {
        this.activeTab = tab;
        const tabs = ['subscriptions', 'logs', 'broadcast', 'diagnostics'];
        tabs.forEach(t => {
            const btn = document.getElementById(`tab-btn-${t}`);
            if (btn) {
                if (t === tab) {
                    btn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 bg-primary-600 text-white shadow-sm';
                } else {
                    btn.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100';
                }
            }
        });

        this.loadActiveTab();
    },

    loadActiveTab() {
        if (this.activeTab === 'subscriptions') this.renderTabSubscriptions();
        else if (this.activeTab === 'logs') this.renderTabLogs();
        else if (this.activeTab === 'broadcast') this.renderTabBroadcast();
        else if (this.activeTab === 'diagnostics') this.renderTabDiagnostics();
    },

    async loadStats() {
        const res = await App.api('web-push/stats');
        if (!res?.success) return;
        this.stats = res.data;

        const totalDevices = this.stats.subscriptions.total_devices || 0;
        const totalAnggota = this.stats.subscriptions.total_anggota || 0;
        const sentToday = this.stats.today.sent || 0;
        const totalSent = this.stats.all_time.total_sent || 0;

        const badgeTotal = document.getElementById('badge-total-devices');
        if (badgeTotal) badgeTotal.textContent = totalDevices;

        const grid = document.getElementById('push-stats-grid');
        if (grid) {
            grid.innerHTML = `
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <div class="flex items-center gap-3 mb-2.5">
                        <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <i class="ri-smartphone-line text-xl"></i>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Perangkat Terdaftar</p>
                            <h4 class="text-2xl font-black text-gray-800">${totalDevices}</h4>
                        </div>
                    </div>
                    <p class="text-[10px] text-gray-400">Total browser anggota yang aktif menerima push</p>
                </div>

                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <div class="flex items-center gap-3 mb-2.5">
                        <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <i class="ri-user-follow-line text-xl"></i>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Anggota Terkoneksi</p>
                            <h4 class="text-2xl font-black text-emerald-600">${totalAnggota}</h4>
                        </div>
                    </div>
                    <p class="text-[10px] text-gray-400">Anggota unik dengan izin notifikasi aktif</p>
                </div>

                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <div class="flex items-center gap-3 mb-2.5">
                        <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <i class="ri-send-plane-fill text-xl"></i>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Terkirim Hari Ini</p>
                            <h4 class="text-2xl font-black text-amber-600">${sentToday}</h4>
                        </div>
                    </div>
                    <p class="text-[10px] text-gray-400">${this.stats.today.logs || 0} event transaksi / pengingat dibukukan</p>
                </div>

                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <div class="flex items-center gap-3 mb-2.5">
                        <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <i class="ri-shield-keyhole-line text-xl"></i>
                        </div>
                        <div>
                            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Engine Kripto VAPID</p>
                            <div class="flex items-center gap-1.5 mt-0.5">
                                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <h4 class="text-base font-bold text-emerald-600">RFC 8291 Ready</h4>
                            </div>
                        </div>
                    </div>
                    <p class="text-[10px] text-gray-400">Total sepanjang masa: <b>${totalSent}</b> notifikasi sukses</p>
                </div>
            `;
        }
    },

    // ==========================================
    // TAB 1: SUBSCRIPTIONS
    // ==========================================
    async renderTabSubscriptions() {
        const container = document.getElementById('push-tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <!-- Toolbar -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                    <div class="relative w-full sm:w-80">
                        <i class="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="sub-search" placeholder="Cari nama, no. anggota, browser..." 
                            class="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                            value="${this.subFilters.search}">
                    </div>
                    <p class="text-xs text-gray-400" id="sub-count-label">Memuat daftar perangkat...</p>
                </div>

                <!-- Table -->
                <div class="overflow-x-auto rounded-2xl border border-gray-100">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="bg-gray-50/80 text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-100">
                                <th class="py-3 px-4 w-12 text-center">No</th>
                                <th class="py-3 px-4">Anggota</th>
                                <th class="py-3 px-4">Perangkat & Browser</th>
                                <th class="py-3 px-4">Push Provider</th>
                                <th class="py-3 px-4">Terdaftar Sejak</th>
                                <th class="py-3 px-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="sub-table-body" class="divide-y divide-gray-50 text-gray-700">
                            <tr><td colspan="6" class="text-center py-10 text-gray-400">Memuat data perangkat...</td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div class="flex justify-between items-center mt-5 text-xs text-gray-500" id="sub-pagination"></div>
            </div>
        `;

        document.getElementById('sub-search')?.addEventListener('input', App.debounce((e) => {
            this.subFilters.search = e.target.value;
            this.subFilters.page = 1;
            this.fetchSubscriptions();
        }, 400));

        await this.fetchSubscriptions();
    },

    async fetchSubscriptions() {
        const query = new URLSearchParams(this.subFilters).toString();
        const res = await App.api(`web-push/subscriptions?${query}`);
        if (!res?.success) return;

        this.subData = res.data.data;
        this.subPagination = res.data.pagination;

        const countLabel = document.getElementById('sub-count-label');
        if (countLabel) countLabel.textContent = `Menampilkan ${this.subData.length} dari total ${this.subPagination.total} perangkat`;

        const tbody = document.getElementById('sub-table-body');
        if (!tbody) return;

        if (this.subData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-12">
                        <div class="flex flex-col items-center justify-center text-gray-400">
                            <i class="ri-smartphone-line text-4xl mb-2 text-gray-300"></i>
                            <p class="font-medium text-xs">Belum ada perangkat yang terdaftar</p>
                            <p class="text-[10px] text-gray-400 mt-1">Anggota dapat mengaktifkan notifikasi melalui menu Profil di Portal PWA</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        const startNo = (this.subPagination.page - 1) * this.subPagination.limit;
        tbody.innerHTML = this.subData.map((s, idx) => {
            const initial = (s.anggota_nama || 'A').charAt(0).toUpperCase();
            return `
                <tr class="hover:bg-gray-50/50 transition">
                    <td class="py-3 px-4 text-center font-mono text-gray-400">${startNo + idx + 1}</td>
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-2.5">
                            <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                                ${initial}
                            </div>
                            <div>
                                <strong class="text-gray-800 font-bold block">${s.anggota_nama}</strong>
                                <span class="font-mono text-[10px] text-gray-400">${s.no_anggota}</span>
                            </div>
                        </div>
                    </td>
                    <td class="py-3 px-4">
                        <div class="flex items-center gap-2">
                            <i class="${s.device_icon} text-base text-gray-500"></i>
                            <div>
                                <span class="font-semibold text-gray-800 block">${s.device}</span>
                                <span class="text-[10px] text-gray-400">${s.browser}</span>
                            </div>
                        </div>
                    </td>
                    <td class="py-3 px-4">
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            <i class="ri-cloud-line"></i> ${s.provider}
                        </span>
                    </td>
                    <td class="py-3 px-4 text-gray-500">
                        <span>${App.formatDate(s.updated_at || s.created_at)}</span>
                        <span class="text-[10px] text-gray-400 block">${(s.updated_at || s.created_at).substring(11, 16)} WIB</span>
                    </td>
                    <td class="py-3 px-4 text-center">
                        <div class="flex items-center justify-center gap-1.5">
                            <button onclick="WebPushPage.promptTestAnggota(${s.anggota_id}, '${s.anggota_nama.replace(/'/g, "\\'")}')" 
                                class="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] transition flex items-center gap-1"
                                title="Kirim notifikasi tes langsung ke perangkat anggota ini">
                                <i class="ri-send-plane-line"></i> Tes Kirim
                            </button>
                            <button onclick="WebPushPage.deleteSubscription(${s.id})" 
                                class="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition"
                                title="Hapus subscription perangkat ini">
                                <i class="ri-delete-bin-line"></i>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');

        this.renderPagination('sub-pagination', this.subPagination, (p) => {
            this.subFilters.page = p;
            this.fetchSubscriptions();
        });
    },

    async promptTestAnggota(anggotaId, nama) {
        const { value: text } = await Swal.fire({
            title: 'Kirim Notifikasi Tes',
            html: `<p class="text-xs text-gray-500 mb-3">Kirim notifikasi percobaan langsung ke perangkat milik <b>${nama}</b>:</p>`,
            input: 'text',
            inputValue: `Halo ${nama}, ini adalah tes notifikasi resmi dari pengurus koperasi! 🚀`,
            showCancelButton: true,
            confirmButtonText: 'Kirim Sekarang',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#4f46e5',
            inputValidator: (val) => {
                if (!val) return 'Pesan tidak boleh kosong!';
            }
        });

        if (!text) return;

        Swal.fire({ title: 'Mengirim...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const res = await App.api('web-push/test-anggota', {
            method: 'POST',
            body: {
                anggota_id: anggotaId,
                title: 'Tes Notifikasi Koperasi 🔔',
                message: text,
                url: '/portal/'
            }
        });

        Swal.close();

        if (res?.success) {
            Swal.fire('Berhasil!', res.message || 'Notifikasi tes terkirim!', 'success');
            this.loadStats();
        } else {
            Swal.fire('Gagal!', res?.message || 'Gagal mengirim push notifikasi', 'error');
        }
    },

    async deleteSubscription(id) {
        const confirm = await Swal.fire({
            title: 'Hapus Perangkat?',
            text: 'Perangkat ini tidak akan menerima notifikasi hingga didaftarkan ulang oleh anggota.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#e11d48'
        });

        if (!confirm.isConfirmed) return;

        const res = await App.api(`web-push/subscriptions/${id}`, { method: 'DELETE' });
        if (res?.success) {
            App.toast('Perangkat berhasil dihapus', 'success');
            this.loadStats();
            this.fetchSubscriptions();
        } else {
            App.toast(res?.message || 'Gagal menghapus perangkat', 'error');
        }
    },

    // ==========================================
    // TAB 2: LOGS
    // ==========================================
    async renderTabLogs() {
        const container = document.getElementById('push-tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <!-- Toolbar Filters -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                    <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <div class="relative w-full sm:w-64">
                            <i class="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" id="log-search" placeholder="Cari judul, pesan, anggota..." 
                                class="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                value="${this.logFilters.search}">
                        </div>
                        <select id="log-filter-tipe" class="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-500/20">
                            <option value="">Semua Tipe Event</option>
                            <option value="simpanan" ${this.logFilters.tipe === 'simpanan' ? 'selected' : ''}>🪙 Simpanan</option>
                            <option value="pinjaman" ${this.logFilters.tipe === 'pinjaman' ? 'selected' : ''}>🎉 Pencairan Kredit</option>
                            <option value="tagihan" ${this.logFilters.tipe === 'tagihan' ? 'selected' : ''}>⚠️ Tagihan Angsuran</option>
                            <option value="broadcast" ${this.logFilters.tipe === 'broadcast' ? 'selected' : ''}>📢 Broadcast Manual</option>
                            <option value="test" ${this.logFilters.tipe === 'test' ? 'selected' : ''}>🧪 Uji Coba</option>
                        </select>
                        <select id="log-filter-status" class="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-500/20">
                            <option value="">Semua Status</option>
                            <option value="success" ${this.logFilters.status === 'success' ? 'selected' : ''}>Sukses</option>
                            <option value="partial" ${this.logFilters.status === 'partial' ? 'selected' : ''}>Sebagian</option>
                            <option value="failed" ${this.logFilters.status === 'failed' ? 'selected' : ''}>Gagal</option>
                            <option value="no_device" ${this.logFilters.status === 'no_device' ? 'selected' : ''}>Tidak Ada Perangkat</option>
                        </select>
                    </div>
                    <p class="text-xs text-gray-400" id="log-count-label">Memuat log...</p>
                </div>

                <!-- Table Logs -->
                <div class="overflow-x-auto rounded-2xl border border-gray-100">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="bg-gray-50/80 text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-100">
                                <th class="py-3 px-4 w-12 text-center">No</th>
                                <th class="py-3 px-4">Waktu</th>
                                <th class="py-3 px-4">Tipe Event</th>
                                <th class="py-3 px-4">Judul & Pesan</th>
                                <th class="py-3 px-4">Penerima</th>
                                <th class="py-3 px-4 text-center">Hasil Kirim</th>
                                <th class="py-3 px-4 text-center">Status</th>
                                <th class="py-3 px-4 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="log-table-body" class="divide-y divide-gray-50 text-gray-700">
                            <tr><td colspan="8" class="text-center py-10 text-gray-400">Memuat log...</td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div class="flex justify-between items-center mt-5 text-xs text-gray-500" id="log-pagination"></div>
            </div>
        `;

        document.getElementById('log-search')?.addEventListener('input', App.debounce((e) => {
            this.logFilters.search = e.target.value;
            this.logFilters.page = 1;
            this.fetchLogs();
        }, 400));

        document.getElementById('log-filter-tipe')?.addEventListener('change', (e) => {
            this.logFilters.tipe = e.target.value;
            this.logFilters.page = 1;
            this.fetchLogs();
        });

        document.getElementById('log-filter-status')?.addEventListener('change', (e) => {
            this.logFilters.status = e.target.value;
            this.logFilters.page = 1;
            this.fetchLogs();
        });

        await this.fetchLogs();
    },

    async fetchLogs() {
        const query = new URLSearchParams(this.logFilters).toString();
        const res = await App.api(`web-push/logs?${query}`);
        if (!res?.success) return;

        this.logData = res.data.data;
        this.logPagination = res.data.pagination;

        const countLabel = document.getElementById('log-count-label');
        if (countLabel) countLabel.textContent = `Menampilkan ${this.logData.length} dari total ${this.logPagination.total} log`;

        const tbody = document.getElementById('log-table-body');
        if (!tbody) return;

        if (this.logData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-12">
                        <div class="flex flex-col items-center justify-center text-gray-400">
                            <i class="ri-inbox-line text-4xl mb-2 text-gray-300"></i>
                            <p class="font-medium text-xs">Belum ada catatan riwayat push notifikasi</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        const startNo = (this.logPagination.page - 1) * this.logPagination.limit;
        tbody.innerHTML = this.logData.map((l, idx) => {
            // Badge tipe
            let tipeBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">General</span>';
            if (l.tipe === 'simpanan') tipeBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100">🪙 Simpanan</span>';
            else if (l.tipe === 'pinjaman') tipeBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">🎉 Pinjaman</span>';
            else if (l.tipe === 'tagihan') tipeBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100">⚠️ Tagihan</span>';
            else if (l.tipe === 'broadcast') tipeBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">📢 Broadcast</span>';
            else if (l.tipe === 'test') tipeBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">🧪 Tes</span>';

            // Badge status
            let statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Sukses</span>';
            if (l.status === 'partial') statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">Sebagian</span>';
            else if (l.status === 'failed') statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Gagal</span>';
            else if (l.status === 'no_device') statusBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600">No Device</span>';

            const recipientText = l.tipe === 'broadcast' 
                ? '<strong class="text-purple-700 font-bold">📢 Semua Anggota</strong>' 
                : (l.anggota_nama ? `<strong class="text-gray-800">${l.anggota_nama}</strong><span class="text-[10px] text-gray-400 block">${l.no_anggota || ''}</span>` : 'Tamu / Umum');

            return `
                <tr class="hover:bg-gray-50/50 transition">
                    <td class="py-3 px-4 text-center font-mono text-gray-400">${startNo + idx + 1}</td>
                    <td class="py-3 px-4 whitespace-nowrap text-gray-500">
                        <span>${App.formatDate(l.created_at)}</span>
                        <span class="text-[10px] text-gray-400 block">${l.created_at.substring(11, 16)} WIB</span>
                    </td>
                    <td class="py-3 px-4">${tipeBadge}</td>
                    <td class="py-3 px-4 max-w-[260px]">
                        <strong class="font-bold text-gray-800 block truncate" title="${l.title}">${l.title}</strong>
                        <p class="text-[11px] text-gray-500 truncate" title="${l.message}">${l.message}</p>
                    </td>
                    <td class="py-3 px-4">${recipientText}</td>
                    <td class="py-3 px-4 text-center font-mono font-bold text-gray-700">
                        ${l.success_count}/${l.total_devices}
                    </td>
                    <td class="py-3 px-4 text-center">${statusBadge}</td>
                    <td class="py-3 px-4 text-center">
                        <button onclick="WebPushPage.openLogDetail(${idx})" 
                            class="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[10px] transition">
                            Rincian
                        </button>
                    </td>
                </tr>`;
        }).join('');

        this.renderPagination('log-pagination', this.logPagination, (p) => {
            this.logFilters.page = p;
            this.fetchLogs();
        });
    },

    openLogDetail(idx) {
        const item = this.logData[idx];
        if (!item) return;

        document.getElementById('m-log-title').textContent = item.title;
        document.getElementById('m-log-time').textContent = item.created_at + ' WIB';
        document.getElementById('m-log-message').textContent = item.message;
        document.getElementById('m-log-tipe').textContent = item.tipe;
        document.getElementById('m-log-recipient').textContent = item.anggota_nama ? `${item.anggota_nama} (${item.no_anggota})` : (item.tipe === 'broadcast' ? 'Semua Anggota' : '-');
        document.getElementById('m-log-status').textContent = item.status.toUpperCase();
        document.getElementById('m-log-counts').textContent = `${item.success_count} sukses dari ${item.total_devices} perangkat`;
        document.getElementById('m-log-url').textContent = item.url || '/portal/';

        const errBox = document.getElementById('m-log-error-box');
        const errText = document.getElementById('m-log-error');
        if (item.error_detail) {
            errBox.classList.remove('hidden');
            errText.textContent = item.error_detail;
        } else {
            errBox.classList.add('hidden');
        }

        this.openModal('modal-log-detail');
    },

    // ==========================================
    // TAB 3: BROADCAST MANUAL
    // ==========================================
    renderTabBroadcast() {
        const container = document.getElementById('push-tab-content');
        if (!container) return;

        const totalDevices = this.stats?.subscriptions?.total_devices || 0;

        container.innerHTML = `
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <!-- Form Input -->
                <div class="lg:col-span-7 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8">
                    <div class="flex items-center gap-3 mb-6">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-md shadow-purple-500/20">
                            <i class="ri-broadcast-line"></i>
                        </div>
                        <div>
                            <h4 class="text-base font-bold text-gray-800">Kirim Broadcast Notifikasi</h4>
                            <p class="text-xs text-gray-400">Pesan akan dikirim seketika ke <b>${totalDevices} perangkat</b> anggota aktif</p>
                        </div>
                    </div>

                    <form id="form-broadcast" onsubmit="WebPushPage.handleSendBroadcast(event)" class="space-y-4 text-xs">
                        <div>
                            <label class="block font-bold text-gray-700 mb-1.5">Judul Notifikasi <span class="text-rose-500">*</span></label>
                            <input type="text" id="bc-title" required maxlength="65"
                                placeholder="Contoh: Pengumuman Jadwal RAT Koperasi 📢"
                                oninput="WebPushPage.updatePreview()"
                                class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-800 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition">
                            <span class="text-[10px] text-gray-400 mt-1 block">Maksimal 65 karakter agar nyaman dibaca di layar HP.</span>
                        </div>

                        <div>
                            <label class="block font-bold text-gray-700 mb-1.5">Isi Pesan Notifikasi <span class="text-rose-500">*</span></label>
                            <textarea id="bc-message" required rows="4" maxlength="200"
                                placeholder="Tuliskan pesan ringkas yang penting bagi anggota..."
                                oninput="WebPushPage.updatePreview()"
                                class="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-800 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition leading-relaxed"></textarea>
                            <span class="text-[10px] text-gray-400 mt-1 block">Disarankan di bawah 150 karakter untuk tampilan push optimal.</span>
                        </div>

                        <div>
                            <label class="block font-bold text-gray-700 mb-1.5">URL Tujuan Saat Notifikasi Ditekan</label>
                            <select id="bc-url-preset" onchange="WebPushPage.handleUrlPreset(this.value)" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 mb-2 outline-none">
                                <option value="/portal/">Beranda Portal (/portal/)</option>
                                <option value="/portal/#simpanan">Tab Simpanan (/portal/#simpanan)</option>
                                <option value="/portal/#pinjaman">Tab Pinjaman (/portal/#pinjaman)</option>
                                <option value="/portal/#rat">Tab RAT & Presensi (/portal/#rat)</option>
                                <option value="/portal/#profil">Tab Profil (/portal/#profil)</option>
                                <option value="custom">Ketik URL Kustom...</option>
                            </select>
                            <input type="text" id="bc-url" value="/portal/" 
                                class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl font-mono text-[11px] text-gray-600 outline-none">
                        </div>

                        <div class="pt-4 border-t border-gray-100 flex items-center justify-between">
                            <div class="flex items-center gap-2 text-gray-500">
                                <i class="ri-information-line text-sm text-primary-600"></i>
                                <span>Penerima: <b>${totalDevices} Device</b></span>
                            </div>
                            <button type="submit" id="btn-submit-broadcast"
                                class="px-6 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-bold text-xs shadow-lg shadow-primary-500/25 active:scale-95 transition flex items-center gap-2">
                                <i class="ri-send-plane-fill"></i> Kirim Broadcast Sekarang
                            </button>
                        </div>
                    </form>
                </div>

                <!-- Preview Box -->
                <div class="lg:col-span-5 flex flex-col items-center justify-start">
                    <div class="w-full max-w-sm bg-gray-900 rounded-[2.5rem] p-4 shadow-2xl border-4 border-gray-800">
                        <!-- Phone Screen Top Bar -->
                        <div class="flex justify-between items-center px-4 py-1.5 text-[10px] text-gray-400 font-mono mb-6">
                            <span>15:00</span>
                            <div class="flex items-center gap-1.5 text-xs">
                                <i class="ri-wifi-line"></i>
                                <i class="ri-battery-charge-line"></i>
                            </div>
                        </div>

                        <!-- Push Notification Banner Card -->
                        <div class="bg-gray-800/90 backdrop-blur-md rounded-2xl p-4 border border-gray-700 text-white shadow-xl animate-fadeIn">
                            <div class="flex items-center justify-between gap-2 mb-2">
                                <div class="flex items-center gap-2">
                                    <div class="w-5 h-5 rounded-md bg-indigo-500 flex items-center justify-center text-[10px]">
                                        <i class="ri-wallet-3-line text-white"></i>
                                    </div>
                                    <span class="text-[10px] font-bold text-gray-300">Portal Koperasi</span>
                                </div>
                                <span class="text-[9px] text-gray-400">Sekarang</span>
                            </div>
                            <h5 class="text-xs font-bold text-white mb-1" id="preview-title">Pengumuman Resmi Koperasi 📢</h5>
                            <p class="text-[11px] text-gray-300 leading-snug" id="preview-body">Tuliskan pesan notifikasi pada form di sebelah kiri untuk melihat simulasi tampilan di ponsel anggota.</p>
                        </div>

                        <!-- Phone Bottom Nav hint -->
                        <div class="mt-40 text-center">
                            <div class="w-24 h-1 bg-gray-700 rounded-full mx-auto"></div>
                        </div>
                    </div>
                    <p class="text-[10px] text-gray-400 mt-3 text-center">Simulasi notifikasi pada layar ponsel (Android / iOS PWA)</p>
                </div>
            </div>
        `;
    },

    updatePreview() {
        const title = document.getElementById('bc-title')?.value || 'Pengumuman Resmi Koperasi 📢';
        const body = document.getElementById('bc-message')?.value || 'Tuliskan pesan notifikasi pada form di sebelah kiri untuk melihat simulasi tampilan.';
        
        const elTitle = document.getElementById('preview-title');
        const elBody = document.getElementById('preview-body');
        if (elTitle) elTitle.textContent = title;
        if (elBody) elBody.textContent = body;
    },

    handleUrlPreset(val) {
        const input = document.getElementById('bc-url');
        if (!input) return;
        if (val === 'custom') {
            input.focus();
        } else {
            input.value = val;
        }
    },

    async handleSendBroadcast(e) {
        e.preventDefault();
        const title = document.getElementById('bc-title').value.trim();
        const message = document.getElementById('bc-message').value.trim();
        const url = document.getElementById('bc-url').value.trim() || '/portal/';

        if (!title || !message) return;

        const confirm = await Swal.fire({
            title: 'Kirim Broadcast Push?',
            html: `Pesan ini akan dikirim langsung ke <b>${this.stats?.subscriptions?.total_devices || 0} perangkat</b> anggota.<br><br><b>${title}</b>`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Kirim Sekarang',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#4f46e5'
        });

        if (!confirm.isConfirmed) return;

        const btn = document.getElementById('btn-submit-broadcast');
        btn.disabled = true;
        btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Memproses Pengiriman...';

        const res = await App.api('web-push/broadcast', {
            method: 'POST',
            body: { title, message, url }
        });

        btn.disabled = false;
        btn.innerHTML = '<i class="ri-send-plane-fill"></i> Kirim Broadcast Sekarang';

        if (res?.success) {
            Swal.fire({
                title: 'Broadcast Berhasil! 🎉',
                text: `Notifikasi berhasil dikirimkan ke ${res.data?.sent || 0} perangkat anggota.`,
                icon: 'success',
                confirmButtonColor: '#4f46e5'
            });
            document.getElementById('form-broadcast')?.reset();
            this.loadStats();
        } else {
            Swal.fire('Gagal!', res?.message || 'Gagal mengirim broadcast notifikasi', 'error');
        }
    },

    // ==========================================
    // TAB 4: DIAGNOSTICS
    // ==========================================
    renderTabDiagnostics() {
        const container = document.getElementById('push-tab-content');
        if (!container) return;

        const vapid = this.stats?.vapid || {};
        const isReady = vapid.is_ready;

        container.innerHTML = `
            <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-8 max-w-4xl">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-12 h-12 rounded-2xl ${isReady ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center text-2xl">
                        <i class="${isReady ? 'ri-shield-check-line' : 'ri-error-warning-line'}"></i>
                    </div>
                    <div>
                        <h4 class="text-base font-bold text-gray-800">Status Diagnostik Engine VAPID</h4>
                        <p class="text-xs text-gray-400">Verifikasi standar kriptografi RFC 8291 (aes128gcm) & RFC 8292 (ES256 VAPID)</p>
                    </div>
                </div>

                <div class="space-y-4 text-xs">
                    <div class="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                        <div>
                            <span class="text-gray-400 text-[10px] uppercase font-bold block mb-1">Status Kunci Kriptografi</span>
                            <div class="flex items-center gap-2">
                                <span class="w-2.5 h-2.5 rounded-full ${isReady ? 'bg-emerald-500' : 'bg-rose-500'}"></span>
                                <strong class="text-sm font-bold ${isReady ? 'text-emerald-700' : 'text-rose-700'}">
                                    ${isReady ? 'Kunci VAPID P-256 Aktif & Siap Digunakan' : 'Kunci VAPID Belum Lengkap'}
                                </strong>
                            </div>
                        </div>
                        <span class="px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Operational</span>
                    </div>

                    <div class="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <span class="text-gray-400 text-[10px] uppercase font-bold block mb-1">VAPID Public Key (Uncompressed P-256):</span>
                        <div class="p-3 bg-white rounded-xl border border-gray-200/80 font-mono text-[11px] text-gray-700 break-all select-all">
                            ${vapid.public_key || 'Kunci publik belum dibuat'}
                        </div>
                    </div>

                    <div class="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <span class="text-gray-400 text-[10px] uppercase font-bold block mb-1">VAPID Subject / Contact:</span>
                        <div class="p-3 bg-white rounded-xl border border-gray-200/80 font-mono text-[11px] text-gray-700">
                            ${vapid.subject || 'mailto:admin@koperasi.id'}
                        </div>
                    </div>

                    <!-- Compatibility Matrix -->
                    <div class="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                        <span class="text-gray-400 text-[10px] uppercase font-bold block mb-3">Matriks Kompatibilitas Browser & OS Anggota:</span>
                        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                            <div class="p-3 bg-white rounded-xl border border-gray-100 flex items-center gap-2.5">
                                <i class="ri-android-line text-emerald-600 text-lg"></i>
                                <div>
                                    <strong class="block text-gray-800 text-xs font-bold">Android OS</strong>
                                    <span class="text-[10px] text-emerald-600 font-semibold">Chrome, Edge, Samsung</span>
                                </div>
                            </div>
                            <div class="p-3 bg-white rounded-xl border border-gray-100 flex items-center gap-2.5">
                                <i class="ri-apple-line text-indigo-600 text-lg"></i>
                                <div>
                                    <strong class="block text-gray-800 text-xs font-bold">iOS / iPadOS 16.4+</strong>
                                    <span class="text-[10px] text-indigo-600 font-semibold">Safari PWA (Add to Home)</span>
                                </div>
                            </div>
                            <div class="p-3 bg-white rounded-xl border border-gray-100 flex items-center gap-2.5">
                                <i class="ri-windows-line text-blue-600 text-lg"></i>
                                <div>
                                    <strong class="block text-gray-800 text-xs font-bold">Windows & Mac</strong>
                                    <span class="text-[10px] text-blue-600 font-semibold">Chrome, Edge, Firefox, Safari</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // ==========================================
    // HELPERS
    // ==========================================
    renderPagination(containerId, pagination, onPageClick) {
        const el = document.getElementById(containerId);
        if (!el || !pagination) return;

        const { page, total_pages, total } = pagination;
        if (total_pages <= 1) {
            el.innerHTML = `<span>Menampilkan semua (${total}) data</span>`;
            return;
        }

        el.innerHTML = `
            <span>Halaman <b>${page}</b> dari <b>${total_pages}</b></span>
            <div class="flex items-center gap-1">
                <button id="${containerId}-prev" ${page <= 1 ? 'disabled' : ''} 
                    class="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition">
                    <i class="ri-arrow-left-s-line"></i> Prev
                </button>
                <button id="${containerId}-next" ${page >= total_pages ? 'disabled' : ''} 
                    class="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition">
                    Next <i class="ri-arrow-right-s-line"></i>
                </button>
            </div>
        `;

        document.getElementById(`${containerId}-prev`)?.addEventListener('click', () => onPageClick(page - 1));
        document.getElementById(`${containerId}-next`)?.addEventListener('click', () => onPageClick(page + 1));
    },

    openModal(id) {
        document.getElementById(id)?.classList.remove('hidden');
    },

    closeModal(id) {
        document.getElementById(id)?.classList.add('hidden');
    }
};

window.WebPushPage = WebPushPage;
export default WebPushPage;
