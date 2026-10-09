// Web Push Notifications Page
const WebPushPage = {
    activeTab: 'subscriptions',
    stats: null,
    subFilters: { page: 1, limit: 15, search: '' },
    logFilters: { page: 1, limit: 15, search: '', tipe: '', status: '' },
    dueFilters: { page: 1, limit: 15, kategori: 'h_min_5', has_device: 'all', search: '' },
    subData: [],
    subPagination: {},
    logData: [],
    logPagination: {},
    dueData: [],
    dueStats: null,
    duePagination: {},
    selectedDueIds: new Set(),
    dueTargetMode: 'selected',
    singleDueTargetId: null,

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
                <button onclick="WebPushPage.switchTab('tagihan')" id="tab-btn-tagihan" 
                    class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                    <i class="ri-alarm-warning-line text-sm"></i> Tagihan Jatuh Tempo
                    <span id="badge-due-count" class="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] ml-1">0</span>
                </button>
                <button onclick="WebPushPage.switchTab('broadcast')" id="tab-btn-broadcast" 
                    class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                    <i class="ri-megaphone-line text-sm"></i> Kirim Broadcast
                </button>
                <button onclick="WebPushPage.switchTab('logs')" id="tab-btn-logs" 
                    class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                    <i class="ri-history-line text-sm"></i> Riwayat Pengiriman
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

        <!-- Modal Broadcast Tagihan -->
        <div id="modal-broadcast-tagihan" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
            <div class="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-gray-100 transform transition-all animate-scaleUp">
                <div class="flex justify-between items-start mb-4">
                    <div class="flex items-center gap-2.5">
                        <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg">
                            <i class="ri-alarm-warning-line"></i>
                        </div>
                        <div>
                            <h4 class="text-sm font-bold text-gray-800" id="m-due-title">Kirim Push Pengingat Tagihan</h4>
                            <p class="text-[10px] text-gray-400" id="m-due-subtitle">Kustomisasi judul dan pesan notifikasi sebelum dikirimkan</p>
                        </div>
                    </div>
                    <button onclick="WebPushPage.closeModal('modal-broadcast-tagihan')" class="text-gray-400 hover:text-gray-600 p-1 rounded-xl">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                </div>

                <div class="space-y-4 text-xs">
                    <!-- Target Summary Banner -->
                    <div class="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                                <i class="ri-send-plane-2-line"></i>
                            </div>
                            <div>
                                <p class="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Target Penerima</p>
                                <p class="text-xs font-black text-gray-900" id="m-due-target-count">-</p>
                            </div>
                        </div>
                        <span class="text-[10px] px-2.5 py-1 rounded-full font-bold bg-white text-amber-800 border border-amber-200" id="m-due-kategori-badge">
                            Kategori
                        </span>
                    </div>

                    <!-- Template Preset Selector -->
                    <div>
                        <label class="block text-[11px] font-bold text-gray-600 mb-1">Gunakan Pola Rekomendasi:</label>
                        <select id="m-due-template-preset" onchange="WebPushPage.applyDueTemplatePreset(this.value)"
                            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500/20">
                            <option value="auto">⚡ Otomatis Cerdas (Sesuai Kategori Status Masing-Masing)</option>
                            <option value="h_min_5">📅 Pengingat Halus (H-5 s/d H-1 Sebelum Jatuh Tempo)</option>
                            <option value="today">⚠️ Mendesak (Jatuh Tempo Hari Ini H-0)</option>
                            <option value="late_7">⏳ Peringatan Denda (Terlambat 1 - 7 Hari)</option>
                            <option value="late_30">🚨 Surat Peringatan 1 (Menunggak 8 - 30 Hari)</option>
                            <option value="late_over_30">🛑 Peringatan Keras Restrukturisasi (Menunggak > 30 Hari)</option>
                            <option value="custom">✏️ Teks Bebas / Manual Custom</option>
                        </select>
                    </div>

                    <!-- Judul Input -->
                    <div>
                        <label class="block text-[11px] font-bold text-gray-600 mb-1">Judul Notifikasi:</label>
                        <input type="text" id="m-due-input-title" 
                            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500/20 font-bold text-gray-800"
                            placeholder="Contoh: Pengingat Tagihan Pinjaman 📅">
                    </div>

                    <!-- Pesan Input -->
                    <div>
                        <div class="flex justify-between items-center mb-1">
                            <label class="text-[11px] font-bold text-gray-600">Isi Pesan Notifikasi:</label>
                            <span class="text-[10px] text-gray-400">Klik tag untuk menyisipkan variabel:</span>
                        </div>
                        <div class="flex flex-wrap gap-1.5 mb-2">
                            <button type="button" onclick="WebPushPage.insertDueToken('{nama}')" class="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-[10px] font-mono text-gray-600 border border-gray-200">+{nama}</button>
                            <button type="button" onclick="WebPushPage.insertDueToken('{angsuran_ke}')" class="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-[10px] font-mono text-gray-600 border border-gray-200">+{angsuran_ke}</button>
                            <button type="button" onclick="WebPushPage.insertDueToken('{jenis_pinjaman}')" class="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-[10px] font-mono text-gray-600 border border-gray-200">+{jenis_pinjaman}</button>
                            <button type="button" onclick="WebPushPage.insertDueToken('{no_pinjaman}')" class="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-[10px] font-mono text-gray-600 border border-gray-200">+{no_pinjaman}</button>
                            <button type="button" onclick="WebPushPage.insertDueToken('{total}')" class="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-[10px] font-mono text-gray-600 border border-gray-200">+{total}</button>
                            <button type="button" onclick="WebPushPage.insertDueToken('{jatuh_tempo}')" class="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-[10px] font-mono text-gray-600 border border-gray-200">+{jatuh_tempo}</button>
                            <button type="button" onclick="WebPushPage.insertDueToken('{hari}')" class="px-2 py-0.5 rounded-md bg-gray-100 hover:bg-amber-50 hover:text-amber-700 text-[10px] font-mono text-gray-600 border border-gray-200">+{hari}</button>
                        </div>
                        <textarea id="m-due-input-message" rows="3" 
                            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500/20 leading-relaxed text-gray-700"
                            placeholder="Tulis pesan..."></textarea>
                    </div>

                    <!-- Target URL -->
                    <div>
                        <label class="block text-[11px] font-bold text-gray-600 mb-1">Tautan URL saat Notifikasi Diklik:</label>
                        <input type="text" id="m-due-input-url" value="/portal/#pinjaman"
                            class="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-primary-500/20 font-mono text-gray-600">
                    </div>

                    <!-- Options -->
                    <div class="p-3 bg-amber-50/60 border border-amber-100 rounded-xl flex items-center gap-2.5">
                        <input type="checkbox" id="m-due-only-devices" checked class="w-4 h-4 text-amber-600 rounded">
                        <label for="m-due-only-devices" class="text-[11px] text-amber-900 font-medium">
                            Hanya prioritaskan anggota yang telah mengaktifkan izin Web Push (lewatkan yang tidak memiliki perangkat)
                        </label>
                    </div>
                </div>

                <div class="mt-6 flex justify-end gap-2.5">
                    <button onclick="WebPushPage.closeModal('modal-broadcast-tagihan')" class="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs">
                        Batal
                    </button>
                    <button onclick="WebPushPage.executeSendBroadcastTagihan()" class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-1.5 active:scale-95">
                        <i class="ri-send-plane-fill"></i> Kirim Notifikasi Push Sekarang
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
        const tabs = ['subscriptions', 'tagihan', 'broadcast', 'logs', 'diagnostics'];
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
        else if (this.activeTab === 'tagihan') this.renderTabTagihan();
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

        // Fetch due stats for badge counter
        try {
            const dueRes = await App.api('web-push/due-installments?limit=1');
            if (dueRes?.success && dueRes.data?.stats) {
                this.dueStats = dueRes.data.stats;
                const urgentDue = (parseInt(this.dueStats.today_count) || 0) + (parseInt(this.dueStats.h_min_5_count) || 0);
                const badgeDue = document.getElementById('badge-due-count');
                if (badgeDue) badgeDue.textContent = urgentDue;
            }
        } catch (e) {}

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
    // TAB: BROADCAST TAGIHAN JATUH TEMPO
    // ==========================================
    async renderTabTagihan() {
        const container = document.getElementById('push-tab-content');
        if (!container) return;

        container.innerHTML = `
            <div class="flex flex-col gap-6">
                <!-- Segment Kategori Cards Grid -->
                <div class="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3" id="due-category-cards">
                    <!-- Cards injected dynamically in fetchDueInstallments() -->
                </div>

                <!-- Main Card Table & Actions -->
                <div class="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                    <!-- Toolbar & Batch Actions -->
                    <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-5">
                        <div class="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
                            <!-- Search -->
                            <div class="relative w-full sm:w-64">
                                <i class="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                                <input type="text" id="due-search" placeholder="Cari nama, no anggota, pinjaman..." 
                                    class="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                                    value="${this.dueFilters.search}">
                            </div>

                            <!-- Filter Status Perangkat -->
                            <select id="due-filter-device" class="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-primary-500/20">
                                <option value="all" ${this.dueFilters.has_device === 'all' ? 'selected' : ''}>Semua Status Perangkat</option>
                                <option value="yes" ${this.dueFilters.has_device === 'yes' ? 'selected' : ''}>🟢 Hanya yang Ada Perangkat Push</option>
                                <option value="no" ${this.dueFilters.has_device === 'no' ? 'selected' : ''}>⚪ Belum Ada Perangkat</option>
                            </select>

                            <button onclick="WebPushPage.fetchDueInstallments()" class="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition" title="Refresh Data Tagihan">
                                <i class="ri-refresh-line"></i>
                            </button>
                        </div>

                        <!-- Action Buttons -->
                        <div class="flex items-center gap-2.5 w-full lg:w-auto justify-end">
                            <button id="btn-broadcast-selected" onclick="WebPushPage.openBroadcastTagihanModal('selected')" disabled
                                class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-gray-100 text-gray-400 cursor-not-allowed">
                                <i class="ri-checkbox-multiple-line"></i> Kirim ke Terpilih (<span id="due-selected-count">0</span>)
                            </button>
                            <button id="btn-broadcast-category" onclick="WebPushPage.openBroadcastTagihanModal('category')"
                                class="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md shadow-amber-500/20 active:scale-95">
                                <i class="ri-broadcast-fill"></i> Broadcast Kategori Ini
                            </button>
                        </div>
                    </div>

                    <!-- Selection Quick Alert Bar -->
                    <div id="due-selection-banner" class="mb-4 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/60 hidden flex justify-between items-center text-xs">
                        <div class="flex items-center gap-2 text-amber-900">
                            <i class="ri-information-line text-base text-amber-600"></i>
                            <span>Terpilih <b id="due-banner-count">0</b> tagihan untuk dikirimi Web Push.</span>
                        </div>
                        <button onclick="WebPushPage.clearDueSelection()" class="text-[11px] text-amber-700 hover:underline font-bold">
                            Batalkan Pilihan
                        </button>
                    </div>

                    <!-- Table -->
                    <div class="overflow-x-auto rounded-2xl border border-gray-100">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="bg-gray-50/80 text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-100">
                                    <th class="py-3 px-4 w-10 text-center">
                                        <input type="checkbox" id="check-all-due" onchange="WebPushPage.toggleSelectDueAll(this.checked)" class="rounded text-primary-600">
                                    </th>
                                    <th class="py-3 px-4">Anggota</th>
                                    <th class="py-3 px-4">Pinjaman</th>
                                    <th class="py-3 px-4">Jatuh Tempo</th>
                                    <th class="py-3 px-4 text-right">Total Tagihan</th>
                                    <th class="py-3 px-4 text-center">Status Push</th>
                                    <th class="py-3 px-4 text-center">Push Terakhir</th>
                                    <th class="py-3 px-4 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody id="due-table-body" class="divide-y divide-gray-50 text-gray-700">
                                <tr><td colspan="8" class="text-center py-10 text-gray-400">Memuat data tagihan...</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    <div class="flex justify-between items-center mt-5 text-xs text-gray-500" id="due-pagination"></div>
                </div>
            </div>
        `;

        // Event listeners
        document.getElementById('due-search')?.addEventListener('input', App.debounce((e) => {
            this.dueFilters.search = e.target.value;
            this.dueFilters.page = 1;
            this.fetchDueInstallments();
        }, 400));

        document.getElementById('due-filter-device')?.addEventListener('change', (e) => {
            this.dueFilters.has_device = e.target.value;
            this.dueFilters.page = 1;
            this.fetchDueInstallments();
        });

        await this.fetchDueInstallments();
    },

    selectDueKategori(kategori) {
        this.dueFilters.kategori = kategori;
        this.dueFilters.page = 1;
        this.clearDueSelection();
        this.fetchDueInstallments();
    },

    async fetchDueInstallments() {
        const query = new URLSearchParams(this.dueFilters).toString();
        const res = await App.api(`web-push/due-installments?${query}`);
        if (!res?.success) return;

        this.dueData = res.data.data;
        this.dueStats = res.data.stats;
        this.duePagination = res.data.pagination;

        // Render Category KPI Cards
        this.renderDueCategoryCards();

        // Render Table Rows
        const tbody = document.getElementById('due-table-body');
        if (!tbody) return;

        if (this.dueData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-12">
                        <div class="flex flex-col items-center justify-center text-gray-400">
                            <i class="ri-checkbox-circle-line text-4xl mb-2 text-emerald-300"></i>
                            <p class="font-medium text-xs">Tidak ada tagihan yang sesuai dengan kriteria filter saat ini</p>
                        </div>
                    </td>
                </tr>`;
            return;
        }

        tbody.innerHTML = this.dueData.map((d) => {
            const isChecked = this.selectedDueIds.has(d.id);
            const diff = parseInt(d.diff_days);
            const absDays = Math.abs(diff);

            let dueBadge = '';
            if (diff > 0) {
                dueBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1 w-max"><i class="ri-time-line"></i> Sisa ${diff} hari</span>`;
            } else if (diff === 0) {
                dueBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-white animate-pulse flex items-center gap-1 w-max"><i class="ri-alarm-warning-line"></i> HARI INI</span>`;
            } else if (absDays <= 7) {
                dueBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1 w-max"><i class="ri-hourglass-2-line"></i> Telat ${absDays} hari</span>`;
            } else if (absDays <= 30) {
                dueBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-max"><i class="ri-error-warning-line"></i> SP 1 (${absDays} hari)</span>`;
            } else {
                dueBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1 w-max"><i class="ri-close-circle-line"></i> Macet (${absDays} hari)</span>`;
            }

            const deviceBadge = d.device_count > 0 
                ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100"><i class="ri-smartphone-line"></i> ${d.device_count} Aktif</span>`
                : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500"><i class="ri-smartphone-line"></i> Belum Ada</span>`;

            const lastPushText = d.last_push_at 
                ? `<span>${App.formatDate(d.last_push_at)}</span><span class="text-[10px] text-gray-400 block">${d.last_push_at.substring(11, 16)} WIB (${d.push_sent_count}x)</span>`
                : `<span class="text-gray-400 italic">Belum Pernah</span>`;

            return `
                <tr class="hover:bg-gray-50/60 transition ${isChecked ? 'bg-amber-50/30' : ''}">
                    <td class="py-3 px-4 text-center">
                        <input type="checkbox" ${isChecked ? 'checked' : ''} onchange="WebPushPage.toggleSelectDue(${d.id})" class="rounded text-primary-600 due-row-checkbox">
                    </td>
                    <td class="py-3 px-4">
                        <strong class="font-bold text-gray-800 block">${d.nama_anggota}</strong>
                        <div class="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                            <span>${d.no_anggota || '-'}</span>
                            ${d.telepon ? `<span>• <i class="ri-phone-line"></i> ${d.telepon}</span>` : ''}
                        </div>
                    </td>
                    <td class="py-3 px-4">
                        <span class="font-semibold text-gray-700 block">${d.jenis_pinjaman}</span>
                        <div class="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
                            <code>${d.no_pinjaman}</code>
                            <span class="px-1.5 py-0.2 rounded bg-gray-100 font-bold text-gray-600">Ke-${d.angsuran_ke}</span>
                        </div>
                    </td>
                    <td class="py-3 px-4">
                        <span class="text-gray-700 font-medium block">${App.formatDate(d.tgl_jatuh_tempo)}</span>
                        <div class="mt-1">${dueBadge}</div>
                    </td>
                    <td class="py-3 px-4 text-right">
                        <strong class="font-black text-gray-900 block">${App.formatRupiah(d.total)}</strong>
                        <span class="text-[10px] text-gray-400 block">Pokok: ${App.formatRupiah(d.pokok)}</span>
                    </td>
                    <td class="py-3 px-4 text-center">${deviceBadge}</td>
                    <td class="py-3 px-4 text-center text-gray-600">${lastPushText}</td>
                    <td class="py-3 px-4 text-center">
                        <button onclick="WebPushPage.openBroadcastTagihanModal('single', ${d.id})"
                            class="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-[10px] transition flex items-center gap-1 mx-auto"
                            title="Kirim notifikasi tagihan ke anggota ini">
                            <i class="ri-send-plane-fill"></i> Kirim Push
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        this.updateDueSelectionBar();

        this.renderPagination('due-pagination', this.duePagination, (p) => {
            this.dueFilters.page = p;
            this.fetchDueInstallments();
        });
    },

    renderDueCategoryCards() {
        const grid = document.getElementById('due-category-cards');
        if (!grid || !this.dueStats) return;

        const s = this.dueStats;
        const current = this.dueFilters.kategori;

        const categories = [
            {
                key: 'h_min_5',
                title: 'H-5 s/d H-1',
                subtitle: '< 5 Hari Lagi',
                count: parseInt(s.h_min_5_count) || 0,
                withDevice: parseInt(s.h_min_5_with_device) || 0,
                nominal: parseFloat(s.h_min_5_nominal) || 0,
                icon: 'ri-time-line',
                color: 'blue'
            },
            {
                key: 'today',
                title: 'H-0 Hari Ini',
                subtitle: 'Jatuh Tempo Hari Ini',
                count: parseInt(s.today_count) || 0,
                withDevice: parseInt(s.today_with_device) || 0,
                nominal: parseFloat(s.today_nominal) || 0,
                icon: 'ri-alarm-warning-line',
                color: 'amber'
            },
            {
                key: 'late_7',
                title: '1 - 7 Hari',
                subtitle: 'Masa Tenggang',
                count: parseInt(s.late_7_count) || 0,
                withDevice: parseInt(s.late_7_with_device) || 0,
                nominal: parseFloat(s.late_7_nominal) || 0,
                icon: 'ri-hourglass-2-line',
                color: 'orange'
            },
            {
                key: 'late_30',
                title: '8 - 30 Hari',
                subtitle: 'Telat ~1 Bulan (SP 1)',
                count: parseInt(s.late_30_count) || 0,
                withDevice: parseInt(s.late_30_with_device) || 0,
                nominal: parseFloat(s.late_30_nominal) || 0,
                icon: 'ri-error-warning-line',
                color: 'rose'
            },
            {
                key: 'late_over_30',
                title: '> 30 Hari',
                subtitle: 'Macet (SP 2 & 3)',
                count: parseInt(s.late_over_30_count) || 0,
                withDevice: parseInt(s.late_over_30_with_device) || 0,
                nominal: parseFloat(s.late_over_30_nominal) || 0,
                icon: 'ri-close-circle-line',
                color: 'red'
            },
            {
                key: 'all',
                title: 'Semua Tagihan',
                subtitle: 'Total Belum Lunas',
                count: parseInt(s.total_unpaid) || 0,
                withDevice: parseInt(s.total_with_device) || 0,
                nominal: parseFloat(s.total_nominal) || 0,
                icon: 'ri-file-list-3-line',
                color: 'slate'
            }
        ];

        grid.innerHTML = categories.map(c => {
            const isActive = current === c.key;
            const borderCls = isActive 
                ? 'ring-2 ring-amber-500 border-amber-500 bg-amber-50/20 shadow-md' 
                : 'border-gray-100 hover:border-gray-200 bg-white hover:shadow-sm';

            return `
                <div onclick="WebPushPage.selectDueKategori('${c.key}')" 
                    class="p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${borderCls} group">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-bold text-gray-700">${c.title}</span>
                            <div class="w-7 h-7 rounded-lg bg-${c.color}-50 text-${c.color}-600 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                                <i class="${c.icon}"></i>
                            </div>
                        </div>
                        <h4 class="text-xl font-black text-gray-900">${c.count}</h4>
                        <p class="text-[10px] text-gray-400 truncate mt-0.5">${c.subtitle}</p>
                    </div>
                    <div class="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[10px]">
                        <span class="text-emerald-600 font-bold flex items-center gap-0.5" title="${c.withDevice} anggota punya izin Web Push">
                            <i class="ri-smartphone-line"></i> ${c.withDevice} Siap
                        </span>
                        <span class="text-gray-400 font-mono truncate" title="${App.formatRupiah(c.nominal)}">
                            ${App.formatRupiah(c.nominal)}
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    },

    toggleSelectDueAll(checked) {
        if (checked) {
            this.dueData.forEach(d => this.selectedDueIds.add(d.id));
        } else {
            this.dueData.forEach(d => this.selectedDueIds.delete(d.id));
        }
        this.fetchDueInstallments();
    },

    toggleSelectDue(id) {
        if (this.selectedDueIds.has(id)) {
            this.selectedDueIds.delete(id);
        } else {
            this.selectedDueIds.add(id);
        }
        this.updateDueSelectionBar();
    },

    clearDueSelection() {
        this.selectedDueIds.clear();
        this.updateDueSelectionBar();
        document.querySelectorAll('.due-row-checkbox').forEach(cb => cb.checked = false);
        const allCb = document.getElementById('check-all-due');
        if (allCb) allCb.checked = false;
    },

    updateDueSelectionBar() {
        const count = this.selectedDueIds.size;
        const banner = document.getElementById('due-selection-banner');
        const countLabel = document.getElementById('due-banner-count');
        const selectedCount = document.getElementById('due-selected-count');
        const btnSelected = document.getElementById('btn-broadcast-selected');

        if (selectedCount) selectedCount.textContent = count;
        if (countLabel) countLabel.textContent = count;

        if (count > 0) {
            banner?.classList.remove('hidden');
            if (btnSelected) {
                btnSelected.disabled = false;
                btnSelected.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:scale-95 cursor-pointer';
            }
        } else {
            banner?.classList.add('hidden');
            if (btnSelected) {
                btnSelected.disabled = true;
                btnSelected.className = 'px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 bg-gray-100 text-gray-400 cursor-not-allowed';
            }
        }

        const allCb = document.getElementById('check-all-due');
        if (allCb && this.dueData.length > 0) {
            allCb.checked = this.dueData.every(d => this.selectedDueIds.has(d.id));
        }
    },

    openBroadcastTagihanModal(mode, singleId = null) {
        this.dueTargetMode = mode;
        this.singleDueTargetId = singleId;

        const targetCountLabel = document.getElementById('m-due-target-count');
        const katBadge = document.getElementById('m-due-kategori-badge');
        const presetSelect = document.getElementById('m-due-template-preset');

        let targetCount = 0;
        let katLabel = '';

        if (mode === 'single' && singleId) {
            const row = this.dueData.find(d => d.id === singleId);
            targetCount = 1;
            katLabel = row ? `${row.nama_anggota}` : '1 Tagihan';
        } else if (mode === 'selected') {
            targetCount = this.selectedDueIds.size;
            katLabel = `${targetCount} Tagihan Terpilih`;
        } else {
            // Category mode
            const cat = this.dueFilters.kategori;
            const s = this.dueStats;
            if (cat === 'h_min_5') { targetCount = s?.h_min_5_count || 0; katLabel = 'H-5 s/d H-1 (< 5 Hari)'; }
            else if (cat === 'today') { targetCount = s?.today_count || 0; katLabel = 'Jatuh Tempo Hari Ini (H-0)'; }
            else if (cat === 'late_7') { targetCount = s?.late_7_count || 0; katLabel = 'Terlambat 1 - 7 Hari'; }
            else if (cat === 'late_30') { targetCount = s?.late_30_count || 0; katLabel = 'Terlambat 8 - 30 Hari (SP 1)'; }
            else if (cat === 'late_over_30') { targetCount = s?.late_over_30_count || 0; katLabel = 'Menunggak > 30 Hari (Macet)'; }
            else { targetCount = s?.total_unpaid || 0; katLabel = 'Semua Tagihan'; }
        }

        if (targetCountLabel) targetCountLabel.textContent = `${targetCount} Rekening Pinjaman`;
        if (katBadge) katBadge.textContent = katLabel;

        if (presetSelect) {
            presetSelect.value = (mode === 'category' ? this.dueFilters.kategori : 'auto');
            this.applyDueTemplatePreset(presetSelect.value);
        }

        this.openModal('modal-broadcast-tagihan');
    },

    applyDueTemplatePreset(preset) {
        const titleInput = document.getElementById('m-due-input-title');
        const msgInput = document.getElementById('m-due-input-message');
        if (!titleInput || !msgInput) return;

        if (preset === 'auto') {
            titleInput.value = '';
            msgInput.value = '';
            titleInput.placeholder = '⚡ Otomatis Cerdas (Sistem memilih template sesuai status keterlambatan masing-masing)';
            msgInput.placeholder = '⚡ Otomatis Cerdas (Pesan menyesuaikan secara otomatis: santun untuk H-5, mendesak untuk H-0, dan denda/SP untuk yang menunggak)';
        } else if (preset === 'h_min_5') {
            titleInput.value = 'Pengingat Tagihan Pinjaman 📅';
            msgInput.value = 'Halo {nama}, angsuran {angsuran_ke} ({jenis_pinjaman}) sebesar {total} akan jatuh tempo dalam {hari} hari ({jatuh_tempo}). Mohon siapkan dana Anda.';
        } else if (preset === 'today') {
            titleInput.value = 'Tagihan Jatuh Tempo HARI INI ⚠️';
            msgInput.value = 'Halo {nama}, angsuran {angsuran_ke} ({jenis_pinjaman}) sebesar {total} jatuh tempo HARI INI ({jatuh_tempo}). Segera lakukan pembayaran untuk menghindari denda.';
        } else if (preset === 'late_7') {
            titleInput.value = 'Peringatan Keterlambatan Angsuran ⏳';
            msgInput.value = 'Halo {nama}, angsuran {angsuran_ke} ({jenis_pinjaman}) sebesar {total} telah melewati jatuh tempo {hari} hari. Denda harian mulai berjalan, mohon segera selesaikan pembayaran.';
        } else if (preset === 'late_30') {
            titleInput.value = 'Pemberitahuan Tunggakan Angsuran (SP 1) 🚨';
            msgInput.value = 'PENTING: Tagihan angsuran {angsuran_ke} ({jenis_pinjaman} - {no_pinjaman}) sebesar {total} telah menunggak {hari} hari. Mohon segera lunasi pembayaran atau hubungi kantor koperasi.';
        } else if (preset === 'late_over_30') {
            titleInput.value = 'Peringatan Keras Menunggak Pinjaman 🛑';
            msgInput.value = 'PERINGATAN: Pinjaman Anda ({jenis_pinjaman} - {no_pinjaman}) telah menunggak {hari} hari. Segera selesaikan kewajiban Anda atau hubungi pengurus koperasi untuk restrukturisasi.';
        }
    },

    insertDueToken(token) {
        const msgInput = document.getElementById('m-due-input-message');
        if (!msgInput) return;
        const start = msgInput.selectionStart;
        const end = msgInput.selectionEnd;
        const text = msgInput.value;
        msgInput.value = text.substring(0, start) + token + text.substring(end);
        msgInput.focus();
        msgInput.selectionStart = msgInput.selectionEnd = start + token.length;
    },

    async executeSendBroadcastTagihan() {
        const title = document.getElementById('m-due-input-title')?.value || '';
        const msg = document.getElementById('m-due-input-message')?.value || '';
        const url = document.getElementById('m-due-input-url')?.value || '/portal/#pinjaman';
        const onlyWithDevices = document.getElementById('m-due-only-devices')?.checked ?? true;

        let payload = {
            mode: this.dueTargetMode,
            kategori: this.dueFilters.kategori,
            custom_title: title,
            custom_message: msg,
            url: url,
            only_with_devices: onlyWithDevices
        };

        if (this.dueTargetMode === 'single' && this.singleDueTargetId) {
            payload.mode = 'selected';
            payload.angsuran_ids = [this.singleDueTargetId];
        } else if (this.dueTargetMode === 'selected') {
            payload.angsuran_ids = Array.from(this.selectedDueIds);
            if (payload.angsuran_ids.length === 0) {
                App.toast('Pilih minimal satu tagihan untuk dikirimi push notifikasi', 'warning');
                return;
            }
        }

        const confirm = await Swal.fire({
            title: 'Kirim Web Push Tagihan?',
            text: 'Notifikasi akan diproses dan dikirimkan langsung ke perangkat browser anggota terkait.',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Kirim Sekarang',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#d97706'
        });

        if (!confirm.isConfirmed) return;

        Swal.fire({
            title: 'Sedang Mengirim Web Push...',
            text: 'Proses enkripsi VAPID dan pengiriman ke gateway sedang berlangsung...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        const res = await App.api('web-push/broadcast-tagihan', {
            method: 'POST',
            body: payload
        });

        Swal.close();

        if (res?.success) {
            this.closeModal('modal-broadcast-tagihan');
            await Swal.fire({
                title: 'Broadcast Tagihan Selesai! 🎉',
                html: `
                    <div class="text-left text-xs bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-2 mt-2">
                        <div class="flex justify-between"><span>Total Diproses:</span><b>${res.data.processed}</b></div>
                        <div class="flex justify-between text-emerald-600"><span>Sukses Terkirim:</span><b>${res.data.sent} Perangkat</b></div>
                        <div class="flex justify-between text-gray-500"><span>Belum Ada Perangkat:</span><b>${res.data.no_device} Anggota</b></div>
                        <div class="flex justify-between text-rose-600"><span>Gagal / Error:</span><b>${res.data.failed}</b></div>
                    </div>
                `,
                icon: 'success'
            });

            this.clearDueSelection();
            this.loadStats();
            this.fetchDueInstallments();
        } else {
            Swal.fire('Gagal!', res?.message || 'Terjadi kesalahan saat memproses broadcast tagihan', 'error');
        }
    },

    // ==========================================
    // TAB 3: LOGS
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
                            <option value="angsuran" ${this.logFilters.tipe === 'angsuran' ? 'selected' : ''}>💳 Bayar Angsuran</option>
                            <option value="pinjaman" ${this.logFilters.tipe === 'pinjaman' ? 'selected' : ''}>🎉 Pencairan Kredit</option>
                            <option value="reversal" ${this.logFilters.tipe === 'reversal' ? 'selected' : ''}>🔄 Koreksi / Reversal</option>
                            <option value="tagihan" ${this.logFilters.tipe === 'tagihan' ? 'selected' : ''}>⚠️ Tagihan Jatuh Tempo</option>
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
            else if (l.tipe === 'angsuran') tipeBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-100">💳 Bayar Angsuran</span>';
            else if (l.tipe === 'pinjaman') tipeBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">🎉 Pinjaman</span>';
            else if (l.tipe === 'reversal') tipeBadge = '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100">🔄 Koreksi / Reversal</span>';
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
