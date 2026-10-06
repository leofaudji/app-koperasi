// ============================================================
// Laporan & Tindak Lanjut Aspirasi Anggota (Dewan Pengawas & Manajemen)
// Terhubung dengan portal_aspirasi pada Portal Anggota PWA
// ============================================================

const LaporanAspirasiPage = {
    data: [],
    stats: {},
    pagination: { total: 0, page: 1, per_page: 15, total_pages: 1 },
    koperasi: {},
    activeAspirasi: null,

    async render(container) {
        App.setTitle('Laporan Aspirasi & Pengaduan Anggota', 'Pusat aspirasi pengawasan, kotak saran, dan tindak lanjut anggota');

        container.innerHTML = `
        <div class="space-y-6 animate-fadeIn pb-12">
            <!-- Header Action Toolbar -->
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl shadow-inner">
                        <i class="ri-question-answer-line"></i>
                    </div>
                    <div>
                        <h2 class="text-lg font-bold text-gray-800 leading-tight">Aspirasi & Pengawasan Koperasi</h2>
                        <p class="text-xs text-gray-500 mt-0.5">Dengarkan masukan anggota untuk transparansi dan tata kelola yang lebih sehat</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                    <button onclick="LaporanAspirasiPage.exportPDF()"
                        class="bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all">
                        <i class="ri-file-pdf-line text-base"></i> Cetak PDF
                    </button>
                    <button onclick="LaporanAspirasiPage.exportCSV()"
                        class="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all">
                        <i class="ri-file-excel-line text-base"></i> Ekspor CSV
                    </button>
                    <button onclick="LaporanAspirasiPage.load(1)"
                        class="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all" title="Segarkan Data">
                        <i class="ri-refresh-line"></i> Refresh
                    </button>
                </div>
            </div>

            <!-- KPI Summary Cards -->
            <div class="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl shrink-0">
                        <i class="ri-inbox-archive-line"></i>
                    </div>
                    <div>
                        <p class="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Total Masuk</p>
                        <h3 id="stat-total" class="text-xl font-black text-gray-800 mt-0.5">0</h3>
                    </div>
                </div>

                <div class="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
                        <i class="ri-time-line"></i>
                    </div>
                    <div>
                        <p class="text-[11px] font-semibold text-amber-600 uppercase tracking-wider">Menunggu</p>
                        <h3 id="stat-terkirim" class="text-xl font-black text-amber-700 mt-0.5">0</h3>
                    </div>
                </div>

                <div class="bg-white rounded-2xl p-4 border border-cyan-100 shadow-sm flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-xl shrink-0">
                        <i class="ri-eye-line"></i>
                    </div>
                    <div>
                        <p class="text-[11px] font-semibold text-cyan-600 uppercase tracking-wider">Ditinjau</p>
                        <h3 id="stat-ditinjau" class="text-xl font-black text-cyan-700 mt-0.5">0</h3>
                    </div>
                </div>

                <div class="bg-white rounded-2xl p-4 border border-emerald-100 shadow-sm flex items-center gap-3">
                    <div class="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
                        <i class="ri-checkbox-circle-line"></i>
                    </div>
                    <div>
                        <p class="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider">Dijawab</p>
                        <h3 id="stat-dijawab" class="text-xl font-black text-emerald-700 mt-0.5">0</h3>
                    </div>
                </div>

                <div class="bg-white rounded-2xl p-4 border border-purple-100 shadow-sm flex items-center gap-3 col-span-2 lg:col-span-1">
                    <div class="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center text-xl shrink-0">
                        <i class="ri-shield-keyhole-line"></i>
                    </div>
                    <div>
                        <p class="text-[11px] font-semibold text-purple-600 uppercase tracking-wider">Anonim</p>
                        <h3 id="stat-anonim" class="text-xl font-black text-purple-700 mt-0.5">0</h3>
                    </div>
                </div>
            </div>

            <!-- Filter & Search Panel -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    <!-- Search input -->
                    <div class="lg:col-span-2">
                        <label class="block text-xs font-semibold text-gray-500 mb-1">Cari Aspirasi / Tiket</label>
                        <div class="relative">
                            <i class="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" id="fl-search" placeholder="No tiket, nama, judul..."
                                class="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                onkeypress="if(event.key==='Enter') LaporanAspirasiPage.load(1)">
                        </div>
                    </div>

                    <!-- Kategori -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 mb-1">Kategori</label>
                        <select id="fl-kategori" onchange="LaporanAspirasiPage.load(1)"
                            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500">
                            <option value="">Semua Kategori</option>
                            <option value="pelayanan">Pelayanan</option>
                            <option value="keuangan">Keuangan</option>
                            <option value="pengawas">Pengawas</option>
                            <option value="usulan">Usulan / Inovasi</option>
                        </select>
                    </div>

                    <!-- Status -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 mb-1">Status Respon</label>
                        <select id="fl-status" onchange="LaporanAspirasiPage.load(1)"
                            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500">
                            <option value="">Semua Status</option>
                            <option value="terkirim">Menunggu Respon</option>
                            <option value="ditinjau">Sedang Ditinjau</option>
                            <option value="dijawab">Sudah Dijawab</option>
                        </select>
                    </div>

                    <!-- Identitas -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 mb-1">Identitas</label>
                        <select id="fl-anonim" onchange="LaporanAspirasiPage.load(1)"
                            class="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500">
                            <option value="">Semua Identitas</option>
                            <option value="0">Terbuka / Bernama</option>
                            <option value="1">Anonim (Terlindungi)</option>
                        </select>
                    </div>

                    <!-- Action filter -->
                    <div class="flex items-end gap-2">
                        <button onclick="LaporanAspirasiPage.load(1)"
                            class="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all">
                            <i class="ri-filter-3-line"></i> Terapkan
                        </button>
                        <button onclick="LaporanAspirasiPage.resetFilter()"
                            class="bg-gray-100 hover:bg-gray-200 text-gray-600 py-2 px-3 rounded-xl text-xs font-semibold" title="Reset Filter">
                            <i class="ri-restart-line"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Table Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 class="font-bold text-gray-800 text-sm flex items-center gap-2">
                        <i class="ri-list-check text-indigo-500"></i> Daftar Tiket Aspirasi Anggota
                    </h3>
                    <span id="label-total-rows" class="text-xs font-semibold text-gray-400">0 Data Ditemukan</span>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="bg-gray-50/75 border-b border-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                                <th class="px-4 py-3.5 w-12 text-center">No</th>
                                <th class="px-4 py-3.5">Tiket & Tanggal</th>
                                <th class="px-4 py-3.5">Pengirim</th>
                                <th class="px-4 py-3.5">Kategori</th>
                                <th class="px-4 py-3.5">Subjek & Pesan</th>
                                <th class="px-4 py-3.5 text-center">Status</th>
                                <th class="px-4 py-3.5">Tindak Lanjut</th>
                                <th class="px-4 py-3.5 text-center w-28">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="aspirasi-tbody" class="divide-y divide-gray-100 text-gray-700">
                            <tr>
                                <td colspan="8" class="text-center py-12 text-gray-400">
                                    <i class="ri-loader-4-line text-2xl animate-spin text-primary-500 block mb-2"></i>
                                    Memuat data aspirasi...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination Footer -->
                <div class="px-5 py-3.5 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div id="pagination-info" class="text-gray-500 font-medium">
                        Menampilkan 0 dari 0 data
                    </div>
                    <div id="pagination-controls" class="flex items-center gap-1.5">
                        <!-- Dynamic Buttons -->
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL DETAIL & TANGGAPI ASPIRASI -->
        <div id="modal-aspirasi-detail" class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 hidden">
            <div class="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden animate-scaleUp">
                <!-- Modal Header -->
                <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                    <div class="flex items-center gap-2.5">
                        <span id="m-kategori-badge" class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700">Kategori</span>
                        <h3 class="font-bold text-gray-800 text-base">Detail Aspirasi Anggota</h3>
                    </div>
                    <button onclick="LaporanAspirasiPage.closeModal()" class="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
                    <!-- Ticket Meta Banner -->
                    <div class="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs">
                        <div>
                            <span class="text-indigo-600 font-bold block">Nomor Tiket:</span>
                            <span id="m-no-tiket" class="font-mono font-bold text-gray-800 text-sm">#TIKET</span>
                        </div>
                        <div>
                            <span class="text-indigo-600 font-bold block">Waktu Pengiriman:</span>
                            <span id="m-created-at" class="text-gray-700 font-medium">-</span>
                        </div>
                        <div>
                            <span class="text-indigo-600 font-bold block">Status:</span>
                            <span id="m-status-badge" class="font-bold">-</span>
                        </div>
                    </div>

                    <!-- Sender Info -->
                    <div class="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-xs">
                        <div class="flex items-start justify-between gap-4">
                            <div>
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Identitas Pengirim</p>
                                <h4 id="m-pengirim-nama" class="font-bold text-sm text-gray-800">Nama Pengirim</h4>
                                <p id="m-pengirim-meta" class="text-gray-500 mt-0.5">No Anggota: -</p>
                            </div>
                            <div id="m-wa-btn-container"></div>
                        </div>
                    </div>

                    <!-- Aspirasi Message Box -->
                    <div>
                        <p class="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Subjek & Uraian Aspirasi / Pengaduan:</p>
                        <div class="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm">
                            <h4 id="m-judul" class="font-bold text-gray-900 text-sm mb-2 text-left">Judul</h4>
                            <div id="m-pesan" class="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap text-left">Pesan</div>
                        </div>
                    </div>

                    <!-- Respon / Form Tindak Lanjut -->
                    <div class="border-t border-gray-100 pt-4">
                        <div class="flex items-center justify-between mb-2">
                            <label class="block text-xs font-bold text-gray-800">Tindak Lanjut & Tanggapan Resmi:</label>
                            <span class="text-[11px] text-gray-400">Terbaca langsung di Portal Anggota</span>
                        </div>

                        <div class="space-y-3">
                            <div>
                                <label class="block text-[11px] font-semibold text-gray-500 mb-1">Update Status Tiket</label>
                                <select id="m-form-status" class="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-primary-500">
                                    <option value="terkirim">Menunggu Respon (Terkirim)</option>
                                    <option value="ditinjau">Sedang Ditinjau Dewan Pengawas / Pengurus</option>
                                    <option value="dijawab">Sudah Dijawab & Ditindaklanjuti</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-[11px] font-semibold text-gray-500 mb-1">Teks Tanggapan / Keterangan Solusi</label>
                                <textarea id="m-form-tanggapan" rows="4" placeholder="Tuliskan jawaban resmi dewan pengawas atau manajemen koperasi..."
                                    class="w-full border border-gray-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-primary-500"></textarea>
                            </div>

                            <div id="m-existing-tanggapan-info" class="text-[11px] text-gray-400 italic hidden"></div>
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-2.5">
                    <button onclick="LaporanAspirasiPage.closeModal()"
                        class="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 text-xs font-semibold">
                        Batal
                    </button>
                    <button id="btn-save-tanggapan" onclick="LaporanAspirasiPage.saveTanggapan()"
                        class="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold shadow-md shadow-primary-600/20 flex items-center gap-1.5 transition-all">
                        <i class="ri-send-plane-fill"></i> Simpan Tanggapan
                    </button>
                </div>
            </div>
        </div>
        `;

        await this.load(1);
    },

    resetFilter() {
        const s = document.getElementById('fl-search'); if (s) s.value = '';
        const k = document.getElementById('fl-kategori'); if (k) k.value = '';
        const st = document.getElementById('fl-status'); if (st) st.value = '';
        const a = document.getElementById('fl-anonim'); if (a) a.value = '';
        this.load(1);
    },

    async load(page = 1) {
        const search = document.getElementById('fl-search')?.value || '';
        const kategori = document.getElementById('fl-kategori')?.value || '';
        const status = document.getElementById('fl-status')?.value || '';
        const isAnonim = document.getElementById('fl-anonim')?.value || '';

        const tbody = document.getElementById('aspirasi-tbody');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-gray-400"><i class="ri-loader-4-line text-2xl animate-spin text-primary-500 block mb-2"></i>Memuat data...</td></tr>`;
        }

        const params = new URLSearchParams({
            page: page,
            per_page: 15,
            search: search,
            kategori: kategori,
            status: status,
            is_anonim: isAnonim
        });

        const res = await App.api(`aspirasi?${params.toString()}`);
        if (!res?.success || !res.data) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="8" class="text-center py-10 text-red-500 font-semibold">Gagal memuat data aspirasi</td></tr>`;
            return;
        }

        this.data = res.data.items || [];
        this.stats = res.data.stats || {};
        this.pagination = res.data.pagination || { total: 0, page: 1, per_page: 15, total_pages: 1 };
        this.koperasi = res.data.koperasi || {};

        this.renderStats();
        this.renderTable();
        this.renderPagination();
    },

    renderStats() {
        const s = this.stats;
        const setTxt = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = Number(val || 0).toLocaleString('id-ID');
        };
        setTxt('stat-total', s.total);
        setTxt('stat-terkirim', s.terkirim);
        setTxt('stat-ditinjau', s.ditinjau);
        setTxt('stat-dijawab', s.dijawab);
        setTxt('stat-anonim', s.anonim);

        const lbl = document.getElementById('label-total-rows');
        if (lbl) lbl.textContent = `${this.pagination.total} Data Ditemukan`;
    },

    getKategoriBadge(kat) {
        const map = {
            'pelayanan': { label: 'Pelayanan', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
            'keuangan': { label: 'Keuangan', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
            'pengawas': { label: 'Pengawas', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
            'usulan': { label: 'Usulan', bg: 'bg-amber-50 text-amber-700 border-amber-200' }
        };
        const c = map[kat] || { label: kat || 'Umum', bg: 'bg-gray-50 text-gray-700 border-gray-200' };
        return `<span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${c.bg}">${c.label}</span>`;
    },

    getStatusBadge(st) {
        const map = {
            'terkirim': { label: 'Menunggu', bg: 'bg-amber-100 text-amber-800' },
            'ditinjau': { label: 'Ditinjau', bg: 'bg-cyan-100 text-cyan-800' },
            'dijawab': { label: 'Dijawab', bg: 'bg-emerald-100 text-emerald-800' }
        };
        const c = map[st] || { label: st || '-', bg: 'bg-gray-100 text-gray-700' };
        return `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${c.bg}">${c.label}</span>`;
    },

    renderTable() {
        const tbody = document.getElementById('aspirasi-tbody');
        if (!tbody) return;

        if (this.data.length === 0) {
            tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-16 text-gray-400">
                    <i class="ri-chat-voice-line text-4xl mb-2 block opacity-30"></i>
                    <p class="font-semibold text-gray-500">Belum ada aspirasi anggota yang cocok dengan filter</p>
                    <p class="text-xs text-gray-400 mt-1">Coba sesuaikan kata kunci pencarian atau status</p>
                </td>
            </tr>`;
            return;
        }

        const startIdx = (this.pagination.page - 1) * this.pagination.per_page;

        tbody.innerHTML = this.data.map((item, idx) => {
            const isAnon = Number(item.is_anonim) === 1;
            const senderName = isAnon ? '<span class="text-purple-600 font-bold flex items-center gap-1"><i class="ri-shield-keyhole-line"></i> Anonim</span>' : `<span class="font-bold text-gray-800">${item.nama_pengirim}</span>`;
            const senderMeta = isAnon ? '<span class="text-[10px] text-gray-400">Identitas Terlindungi</span>' : `<span class="text-[10px] text-gray-500">${item.no_anggota || '-'}</span>`;

            const tgl = item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

            const previewPesan = item.pesan.length > 70 ? item.pesan.substring(0, 70) + '...' : item.pesan;
            const tindakLanjut = item.status === 'dijawab' && item.tanggapan ? `
                <div class="text-[11px] text-emerald-700 font-medium truncate max-w-xs" title="${item.tanggapan}">
                    <i class="ri-check-line font-bold"></i> ${item.tanggapan}
                </div>
                <span class="text-[9px] text-gray-400">${item.nama_penanggap || 'Pengawas'}</span>
            ` : (item.status === 'ditinjau' ? '<span class="text-[11px] text-cyan-600 italic">Sedang dalam peninjauan</span>' : '<span class="text-[11px] text-amber-600 italic">Belum ditanggapi</span>');

            return `
            <tr class="hover:bg-gray-50/75 transition-colors">
                <td class="px-4 py-3.5 text-center font-medium text-gray-400">${startIdx + idx + 1}</td>
                <td class="px-4 py-3.5">
                    <span class="font-mono font-bold text-indigo-600 text-xs block">${item.no_tiket}</span>
                    <span class="text-[10px] text-gray-400">${tgl}</span>
                </td>
                <td class="px-4 py-3.5">
                    <div>${senderName}</div>
                    <div>${senderMeta}</div>
                </td>
                <td class="px-4 py-3.5">${this.getKategoriBadge(item.kategori)}</td>
                <td class="px-4 py-3.5 max-w-xs">
                    <h5 class="font-bold text-gray-800 truncate" title="${item.judul}">${item.judul}</h5>
                    <p class="text-gray-500 text-[11px] mt-0.5 line-clamp-1">${previewPesan}</p>
                </td>
                <td class="px-4 py-3.5 text-center">${this.getStatusBadge(item.status)}</td>
                <td class="px-4 py-3.5 max-w-[200px]">${tindakLanjut}</td>
                <td class="px-4 py-3.5 text-center">
                    <div class="flex items-center justify-center gap-1">
                        <button onclick="LaporanAspirasiPage.openDetail(${item.id})"
                            class="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-semibold text-[11px] flex items-center gap-1 transition-all" title="Buka Detail & Beri Tanggapan">
                            <i class="ri-eye-line"></i> Respon
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    },

    renderPagination() {
        const p = this.pagination;
        const info = document.getElementById('pagination-info');
        const controls = document.getElementById('pagination-controls');
        if (!info || !controls) return;

        const start = (p.page - 1) * p.per_page + 1;
        const end = Math.min(p.page * p.per_page, p.total);
        info.textContent = p.total > 0 ? `Menampilkan ${start} - ${end} dari ${p.total} data` : 'Menampilkan 0 data';

        if (p.total_pages <= 1) {
            controls.innerHTML = '';
            return;
        }

        let html = `
            <button onclick="LaporanAspirasiPage.load(${p.page - 1})" ${p.page <= 1 ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-gray-200"'}
                class="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-semibold">
                <i class="ri-arrow-left-s-line"></i>
            </button>
        `;

        for (let i = 1; i <= p.total_pages; i++) {
            if (i === 1 || i === p.total_pages || (i >= p.page - 1 && i <= p.page + 1)) {
                html += `
                    <button onclick="LaporanAspirasiPage.load(${i})"
                        class="px-3 py-1 rounded-lg text-xs font-semibold ${i === p.page ? 'bg-primary-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}">
                        ${i}
                    </button>
                `;
            } else if (i === p.page - 2 || i === p.page + 2) {
                html += `<span class="px-1 text-gray-400">...</span>`;
            }
        }

        html += `
            <button onclick="LaporanAspirasiPage.load(${p.page + 1})" ${p.page >= p.total_pages ? 'disabled class="opacity-40 cursor-not-allowed"' : 'class="hover:bg-gray-200"'}
                class="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 font-semibold">
                <i class="ri-arrow-right-s-line"></i>
            </button>
        `;

        controls.innerHTML = html;
    },

    openDetail(id) {
        const item = this.data.find(d => d.id == id);
        if (!item) return;

        this.activeAspirasi = item;
        const isAnon = Number(item.is_anonim) === 1;

        document.getElementById('m-no-tiket').textContent = item.no_tiket;
        document.getElementById('m-created-at').textContent = new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
        document.getElementById('m-status-badge').innerHTML = this.getStatusBadge(item.status);
        document.getElementById('m-kategori-badge').innerHTML = this.getKategoriBadge(item.kategori);

        const pengirimEl = document.getElementById('m-pengirim-nama');
        const metaEl = document.getElementById('m-pengirim-meta');
        const waContainer = document.getElementById('m-wa-btn-container');

        if (isAnon) {
            pengirimEl.innerHTML = '<span class="text-purple-600 font-bold"><i class="ri-shield-keyhole-line"></i> Anggota Anonim (Terlindungi)</span>';
            metaEl.textContent = 'Pengirim memilih untuk menyembunyikan identitas diri dari pengawas & manajemen.';
            waContainer.innerHTML = '';
        } else {
            pengirimEl.textContent = item.nama_pengirim;
            metaEl.textContent = `No. Anggota: ${item.no_anggota || '-'} | Telp: ${item.telepon || '-'}`;
            if (item.telepon) {
                let cleanPhone = item.telepon.replace(/[^0-9]/g, '');
                if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
                waContainer.innerHTML = `
                    <a href="https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(item.nama_pengirim)},%20terkait%20aspirasi%20koperasi%20tiket%20${item.no_tiket}" target="_blank"
                        class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all">
                        <i class="ri-whatsapp-line"></i> Hubungi WA
                    </a>
                `;
            } else {
                waContainer.innerHTML = '';
            }
        }

        document.getElementById('m-judul').textContent = item.judul;
        document.getElementById('m-pesan').textContent = item.pesan;

        document.getElementById('m-form-status').value = item.status || 'terkirim';
        document.getElementById('m-form-tanggapan').value = item.tanggapan || '';

        const existingInfo = document.getElementById('m-existing-tanggapan-info');
        if (item.tgl_tanggapan) {
            existingInfo.classList.remove('hidden');
            existingInfo.textContent = `Tanggapan terakhir diberikan pada ${new Date(item.tgl_tanggapan).toLocaleString('id-ID')} oleh ${item.nama_penanggap || 'Pengawas'}.`;
        } else {
            existingInfo.classList.add('hidden');
        }

        document.getElementById('modal-aspirasi-detail').classList.remove('hidden');
    },

    closeModal() {
        document.getElementById('modal-aspirasi-detail').classList.add('hidden');
        this.activeAspirasi = null;
    },

    async saveTanggapan() {
        if (!this.activeAspirasi) return;

        const status = document.getElementById('m-form-status').value;
        const tanggapan = document.getElementById('m-form-tanggapan').value.trim();

        if (status === 'dijawab' && !tanggapan) {
            App.toast('Mohon isi teks tanggapan resmi jika status diubah menjadi Dijawab.', 'warning');
            return;
        }

        const btn = document.getElementById('btn-save-tanggapan');
        btn.disabled = true;
        btn.innerHTML = `<i class="ri-loader-4-line animate-spin"></i> Menyimpan...`;

        const res = await App.api(`aspirasi/${this.activeAspirasi.id}`, {
            method: 'POST',
            body: { status: status, tanggapan: tanggapan }
        });

        btn.disabled = false;
        btn.innerHTML = `<i class="ri-send-plane-fill"></i> Simpan Tanggapan`;

        if (res?.success) {
            App.toast(res.message || 'Tanggapan berhasil disimpan!', 'success');
            this.closeModal();
            await this.load(this.pagination.page);
        } else {
            App.toast(res?.message || 'Gagal menyimpan tanggapan', 'error');
        }
    },

    // ===== EKSPOR LAPORAN ASPIRASI (PDF) =====
    async exportPDF() {
        const res = await App.api(`aspirasi?export=1`);
        if (!res?.success || !res.data) {
            App.toast('Gagal mengambil data untuk ekspor PDF', 'error');
            return;
        }

        const rows = res.data.items || [];
        const kop = res.data.koperasi || {};

        if (rows.length === 0) {
            App.toast('Tidak ada data aspirasi untuk dicetak', 'warning');
            return;
        }

        if (!window.jspdf || !window.jspdf.jsPDF) {
            App.toast('Library PDF belum siap, silakan gunakan Cetak Browser', 'warning');
            window.print();
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        const title = 'LAPORAN ASPIRASI, PENGADUAN & KOTAK SARAN ANGGOTA';
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(kop.nama || 'KOPERASI SIMPAN PINJAM', 14, 15);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Badan Hukum: ${kop.badan_hukum || '-'} | Unit Pengawasan Independen`, 14, 20);
        doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')} | Total Aspirasi Masuk: ${rows.length}`, 14, 25);
        doc.setLineWidth(0.5);
        doc.line(14, 28, 283, 28);

        const tableBody = rows.map((r, i) => {
            const isAnon = Number(r.is_anonim) === 1;
            const nama = isAnon ? 'Anonim (Terlindungi)' : `${r.nama_pengirim} (${r.no_anggota || '-'})`;
            const tgl = r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '-';
            const statusLabel = r.status === 'dijawab' ? 'Dijawab' : (r.status === 'ditinjau' ? 'Ditinjau' : 'Menunggu');
            const tanggapanStr = r.tanggapan ? `${r.tanggapan} (oleh: ${r.nama_penanggap || 'Pengawas'})` : '-';

            return [
                i + 1,
                r.no_tiket,
                tgl,
                nama,
                (r.kategori || '').toUpperCase(),
                r.judul,
                r.pesan,
                statusLabel,
                tanggapanStr
            ];
        });

        doc.autoTable({
            startY: 32,
            head: [['No', 'No. Tiket', 'Tanggal', 'Pengirim', 'Kategori', 'Subjek', 'Uraian Aspirasi', 'Status', 'Tanggapan Resmi']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [49, 46, 129], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
            bodyStyles: { fontSize: 7, cellPadding: 2, textColor: [30, 41, 59] },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 22, fontStyle: 'bold' },
                2: { cellWidth: 18, halign: 'center' },
                3: { cellWidth: 32 },
                4: { cellWidth: 20, halign: 'center' },
                5: { cellWidth: 35, fontStyle: 'bold' },
                6: { cellWidth: 55 },
                7: { cellWidth: 20, halign: 'center' },
                8: { cellWidth: 55 }
            },
            margin: { left: 14, right: 14, bottom: 20 }
        });

        const nextY = doc.lastAutoTable.finalY + 12;
        if (nextY < 180) {
            doc.setFontSize(8.5);
            doc.text('Mengetahui,', 220, nextY);
            doc.text('Dewan Pengawas Koperasi', 220, nextY + 5);
            doc.text('_______________________', 220, nextY + 25);
            doc.text(kop.pengawas || 'Ketua Pengawas', 220, nextY + 30);
        }

        doc.save(`Laporan_Aspirasi_Anggota_${new Date().toISOString().slice(0, 10)}.pdf`);
    },

    // ===== EKSPOR CSV / EXCEL =====
    async exportCSV() {
        const res = await App.api(`aspirasi?export=1`);
        if (!res?.success || !res.data) {
            App.toast('Gagal mengambil data untuk ekspor CSV', 'error');
            return;
        }

        const rows = res.data.items || [];
        if (rows.length === 0) {
            App.toast('Tidak ada data aspirasi untuk diekspor', 'warning');
            return;
        }

        let csv = '\uFEFF'; // UTF-8 BOM
        csv += "LAPORAN ASPIRASI DAN PENGADUAN ANGGOTA KOPERASI\r\n";
        csv += `Tanggal Ekspor,${new Date().toLocaleString('id-ID')}\r\n\r\n`;
        csv += "No,No Tiket,Tanggal Kirim,Status Anonim,Nama Pengirim,No Anggota,Telepon,Kategori,Judul,Isi Aspirasi,Status,Tanggapan Resmi,Tanggal Tanggapan,Penanggap\r\n";

        rows.forEach((r, i) => {
            const isAnon = Number(r.is_anonim) === 1 ? 'Anonim' : 'Terbuka';
            const nama = `"${(r.nama_pengirim || '').replace(/"/g, '""')}"`;
            const noAnggota = `"${(r.no_anggota || '').replace(/"/g, '""')}"`;
            const telp = `"${(r.telepon || '').replace(/"/g, '""')}"`;
            const kat = `"${(r.kategori || '').replace(/"/g, '""')}"`;
            const judul = `"${(r.judul || '').replace(/"/g, '""')}"`;
            const pesan = `"${(r.pesan || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
            const tanggapan = `"${(r.tanggapan || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
            const penanggap = `"${(r.nama_penanggap || '').replace(/"/g, '""')}"`;

            csv += `${i + 1},${r.no_tiket},${r.created_at},${isAnon},${nama},${noAnggota},${telp},${kat},${judul},${pesan},${r.status},${tanggapan},${r.tgl_tanggapan || '-'},${penanggap}\r\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Laporan_Aspirasi_Anggota_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

window.LaporanAspirasiPage = LaporanAspirasiPage;
export default LaporanAspirasiPage;
