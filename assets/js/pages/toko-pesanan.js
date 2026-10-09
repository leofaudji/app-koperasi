// ============================================================
// Manajemen Pesanan Toko Koperasi (Admin & Kasir)
// Terhubung dengan toko_pesanan & toko_pesanan_detail dari Portal Anggota
// Desain Modern, Responsif, Interaktif, dan Mudah Dibaca
// ============================================================

const TokoPesananPage = {
    data: [],
    stats: {},
    pagination: { total: 0, page: 1, per_page: 12, total_pages: 1 },
    koperasi: {},
    activeOrder: null,
    currentStatusFilter: 'all',
    viewMode: 'table', // 'table' atau 'cards'

    async render(container) {
        App.setTitle('Pesanan Toko Koperasi', 'Kelola antrean belanja, penyiapan barang, dan serah terima retail anggota');

        container.innerHTML = `
        <div class="space-y-6 animate-fadeIn pb-16">
            <!-- Header Action Toolbar -->
            <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative overflow-hidden">
                <div class="absolute -right-10 -bottom-10 w-44 h-44 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>
                <div class="flex items-center gap-4 relative z-10">
                    <div class="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center text-2xl shadow-lg shadow-amber-500/25 shrink-0">
                        <i class="ri-store-2-fill"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2 flex-wrap">
                            <h2 class="text-xl font-black text-gray-900 tracking-tight">Antrean Pesanan Toko</h2>
                            <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Retail Toko PWA
                            </span>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">Pantau pesanan masuk secara real-time, percepat penyiapan barang, dan catat serah terima belanja anggota</p>
                    </div>
                </div>

                <!-- Action Controls -->
                <div class="flex items-center gap-2.5 flex-wrap w-full lg:w-auto relative z-10">
                    <!-- View Mode Toggle -->
                    <div class="inline-flex p-1 bg-gray-100/90 rounded-2xl border border-gray-200/70">
                        <button onclick="TokoPesananPage.setViewMode('table')" id="btn-view-table"
                            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${this.viewMode === 'table' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'}">
                            <i class="ri-table-line text-sm"></i> Tabel
                        </button>
                        <button onclick="TokoPesananPage.setViewMode('cards')" id="btn-view-cards"
                            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${this.viewMode === 'cards' ? 'bg-white text-gray-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'}">
                            <i class="ri-grid-fill text-sm"></i> Kartu Tiket
                        </button>
                    </div>

                    <!-- Export Tools -->
                    <button onclick="TokoPesananPage.exportPDF()"
                        class="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs">
                        <i class="ri-file-pdf-line text-sm"></i> Cetak PDF
                    </button>
                    <button onclick="TokoPesananPage.exportCSV()"
                        class="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-2xs">
                        <i class="ri-file-excel-line text-sm"></i> Ekspor CSV
                    </button>
                    <button onclick="TokoPesananPage.refresh()" id="btn-refresh-toko"
                        class="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all" title="Segarkan Data">
                        <i class="ri-refresh-line text-sm" id="icon-refresh-toko"></i> Segarkan
                    </button>
                </div>
            </div>

            <!-- KPI Interactive Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
                <!-- Total -->
                <div onclick="TokoPesananPage.filterByStatus('all')" id="card-stat-all"
                    class="stat-pill-card cursor-pointer bg-white rounded-3xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Pesanan</span>
                        <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                            <i class="ri-shopping-basket-2-line"></i>
                        </div>
                    </div>
                    <div class="flex items-baseline gap-1.5">
                        <h3 id="stat-total" class="text-2xl font-black text-gray-900 tracking-tight">0</h3>
                        <span class="text-[10px] text-gray-400 font-semibold">order</span>
                    </div>
                    <p class="text-[10px] text-gray-400 mt-1 truncate">Semua data riwayat</p>
                </div>

                <!-- Pending -->
                <div onclick="TokoPesananPage.filterByStatus('pending')" id="card-stat-pending"
                    class="stat-pill-card cursor-pointer bg-white rounded-3xl p-4 border border-amber-200 shadow-sm hover:shadow-md transition-all relative overflow-hidden group bg-gradient-to-b from-amber-50/30 to-white">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span> Menunggu
                        </span>
                        <div class="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                            <i class="ri-time-line"></i>
                        </div>
                    </div>
                    <div class="flex items-baseline gap-1.5">
                        <h3 id="stat-pending" class="text-2xl font-black text-amber-700 tracking-tight">0</h3>
                        <span class="text-[10px] text-amber-600 font-semibold">perlu diproses</span>
                    </div>
                    <p class="text-[10px] text-amber-600/80 mt-1 truncate font-medium">Antrean order baru</p>
                </div>

                <!-- Diproses -->
                <div onclick="TokoPesananPage.filterByStatus('diproses')" id="card-stat-diproses"
                    class="stat-pill-card cursor-pointer bg-white rounded-3xl p-4 border border-cyan-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-black uppercase tracking-wider text-cyan-600">Disiapkan</span>
                        <div class="w-8 h-8 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                            <i class="ri-loader-2-line"></i>
                        </div>
                    </div>
                    <div class="flex items-baseline gap-1.5">
                        <h3 id="stat-diproses" class="text-2xl font-black text-cyan-700 tracking-tight">0</h3>
                        <span class="text-[10px] text-cyan-600 font-semibold">dikemas</span>
                    </div>
                    <p class="text-[10px] text-gray-400 mt-1 truncate font-medium">Sedang dipacking</p>
                </div>

                <!-- Siap Diambil -->
                <div onclick="TokoPesananPage.filterByStatus('siap_diambil')" id="card-stat-siap_diambil"
                    class="stat-pill-card cursor-pointer bg-white rounded-3xl p-4 border border-indigo-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-black uppercase tracking-wider text-indigo-600">Siap Diambil</span>
                        <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                            <i class="ri-hand-coin-line"></i>
                        </div>
                    </div>
                    <div class="flex items-baseline gap-1.5">
                        <h3 id="stat-siap" class="text-2xl font-black text-indigo-700 tracking-tight">0</h3>
                        <span class="text-[10px] text-indigo-600 font-semibold">di kasir</span>
                    </div>
                    <p class="text-[10px] text-gray-400 mt-1 truncate font-medium">Menunggu anggota</p>
                </div>

                <!-- Selesai -->
                <div onclick="TokoPesananPage.filterByStatus('selesai')" id="card-stat-selesai"
                    class="stat-pill-card cursor-pointer bg-white rounded-3xl p-4 border border-emerald-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-black uppercase tracking-wider text-emerald-600">Selesai</span>
                        <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                            <i class="ri-checkbox-circle-line"></i>
                        </div>
                    </div>
                    <div class="flex items-baseline gap-1.5">
                        <h3 id="stat-selesai" class="text-2xl font-black text-emerald-700 tracking-tight">0</h3>
                        <span class="text-[10px] text-emerald-600 font-semibold">lunas</span>
                    </div>
                    <p class="text-[10px] text-gray-400 mt-1 truncate font-medium">Serah terima tuntas</p>
                </div>

                <!-- Omset Selesai -->
                <div class="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-3xl p-4 border border-gray-800 shadow-sm relative overflow-hidden col-span-2 sm:col-span-1 lg:col-span-1">
                    <div class="flex items-center justify-between mb-2">
                        <span class="text-[10px] font-black uppercase tracking-wider text-gray-300">Omset Berhasil</span>
                        <div class="w-8 h-8 rounded-xl bg-white/10 text-amber-400 flex items-center justify-center text-sm">
                            <i class="ri-coins-line"></i>
                        </div>
                    </div>
                    <h3 id="stat-omset" class="text-lg font-black text-white tracking-tight truncate">Rp 0</h3>
                    <p class="text-[10px] text-gray-400 mt-1 font-medium">Total penjualan toko</p>
                </div>
            </div>

            <!-- Filter Controls & Tabbed Quick Status Pills -->
            <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-4">
                <!-- Status Tab Pills (Super Easy 1-Click Filter) -->
                <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold border-b border-gray-100">
                    <span class="text-gray-400 text-[11px] font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                        <i class="ri-filter-2-line"></i> Status:
                    </span>
                    <button onclick="TokoPesananPage.filterByStatus('all')" id="tab-status-all"
                        class="tab-status-btn px-4 py-2 rounded-2xl transition-all shrink-0 bg-primary-600 text-white shadow-xs">
                        Semua Pesanan <span id="badge-tab-all" class="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">0</span>
                    </button>
                    <button onclick="TokoPesananPage.filterByStatus('pending')" id="tab-status-pending"
                        class="tab-status-btn px-4 py-2 rounded-2xl transition-all shrink-0 text-gray-600 hover:bg-gray-100 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-amber-500"></span> Pending
                        <span id="badge-tab-pending" class="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800">0</span>
                    </button>
                    <button onclick="TokoPesananPage.filterByStatus('diproses')" id="tab-status-diproses"
                        class="tab-status-btn px-4 py-2 rounded-2xl transition-all shrink-0 text-gray-600 hover:bg-gray-100 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-cyan-500"></span> Sedang Disiapkan
                        <span id="badge-tab-diproses" class="px-1.5 py-0.5 rounded-full text-[10px] bg-cyan-100 text-cyan-800">0</span>
                    </button>
                    <button onclick="TokoPesananPage.filterByStatus('siap_diambil')" id="tab-status-siap_diambil"
                        class="tab-status-btn px-4 py-2 rounded-2xl transition-all shrink-0 text-gray-600 hover:bg-gray-100 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-indigo-500"></span> Siap Diambil
                        <span id="badge-tab-siap_diambil" class="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-800">0</span>
                    </button>
                    <button onclick="TokoPesananPage.filterByStatus('selesai')" id="tab-status-selesai"
                        class="tab-status-btn px-4 py-2 rounded-2xl transition-all shrink-0 text-gray-600 hover:bg-gray-100 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Selesai
                        <span id="badge-tab-selesai" class="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">0</span>
                    </button>
                    <button onclick="TokoPesananPage.filterByStatus('dibatalkan')" id="tab-status-dibatalkan"
                        class="tab-status-btn px-4 py-2 rounded-2xl transition-all shrink-0 text-gray-600 hover:bg-gray-100 flex items-center gap-1.5">
                        <span class="w-2 h-2 rounded-full bg-rose-500"></span> Dibatalkan
                        <span id="badge-tab-dibatalkan" class="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800">0</span>
                    </button>
                </div>

                <!-- Search & Filters Inputs -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-1">
                    <!-- Search Input -->
                    <div class="lg:col-span-5 relative">
                        <i class="ri-search-2-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base"></i>
                        <input type="text" id="filter-search" placeholder="Cari No. Pesanan / Nama Anggota / No. Telp..."
                            class="w-full bg-gray-50/80 border border-gray-200 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all font-medium">
                        <button onclick="TokoPesananPage.clearSearch()" id="btn-clear-search" class="hidden absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm">
                            <i class="ri-close-circle-fill"></i>
                        </button>
                    </div>

                    <!-- Metode Pembayaran -->
                    <div class="lg:col-span-3">
                        <select id="filter-metode" onchange="TokoPesananPage.load(1)"
                            class="w-full bg-gray-50/80 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all cursor-pointer">
                            <option value="all">💳 Semua Metode Pembayaran</option>
                            <option value="sukarela">🟢 Potong Simpanan Sukarela</option>
                            <option value="tunai_ambil">🔵 Bayar Tunai (Pick-up di Kasir)</option>
                        </select>
                    </div>

                    <!-- Date Picker -->
                    <div class="lg:col-span-2">
                        <input type="date" id="filter-tgl-mulai" title="Filter Tanggal Mulai" onchange="TokoPesananPage.load(1)"
                            class="w-full bg-gray-50/80 border border-gray-200 rounded-2xl px-3 py-2 text-xs text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 focus:bg-white transition-all cursor-pointer">
                    </div>

                    <!-- Reset & Apply -->
                    <div class="lg:col-span-2 flex items-center gap-2">
                        <button onclick="TokoPesananPage.load(1)"
                            class="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-bold py-2.5 px-3.5 rounded-2xl text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-primary-500/25 transition-all">
                            <i class="ri-check-line"></i> Filter
                        </button>
                        <button onclick="TokoPesananPage.resetFilter()"
                            class="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl text-xs font-semibold transition-all shrink-0" title="Reset Semua Filter">
                            <i class="ri-restart-line text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- CONTAINER PESANAN: TABLE VIEW ATAU CARDS VIEW -->
            <div id="view-container-table" class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden ${this.viewMode === 'table' ? '' : 'hidden'}">
                <div class="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div class="flex items-center gap-2.5">
                        <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                        <h3 class="font-bold text-gray-900 text-sm">Daftar Antrean Pesanan Masuk</h3>
                    </div>
                    <span id="label-total-rows" class="text-xs font-bold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
                        0 Data Ditemukan
                    </span>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs">
                        <thead>
                            <tr class="bg-gray-50/80 border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                                <th class="px-4 py-3.5 w-12 text-center whitespace-nowrap">#</th>
                                <th class="px-5 py-3.5 whitespace-nowrap min-w-[220px]">Pesanan & Pemesan</th>
                                <th class="px-5 py-3.5 min-w-[240px]">Barang Belanja</th>
                                <th class="px-5 py-3.5 whitespace-nowrap min-w-[170px]">Tagihan & Pembayaran</th>
                                <th class="px-5 py-3.5 text-center whitespace-nowrap w-32">Status</th>
                                <th class="px-5 py-3.5 text-right whitespace-nowrap w-44">Tindak Lanjut</th>
                            </tr>
                        </thead>
                        <tbody id="pesanan-tbody" class="divide-y divide-gray-100 text-gray-700">
                            <tr>
                                <td colspan="6" class="text-center py-16 text-gray-400">
                                    <i class="ri-loader-4-line text-3xl animate-spin text-primary-500 block mb-2"></i>
                                    Memuat data pesanan toko...
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination Footer -->
                <div class="px-6 py-4 border-t border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div id="pagination-info" class="text-gray-500 font-medium">
                        Menampilkan 0 dari 0 data
                    </div>
                    <div id="pagination-controls" class="flex items-center gap-1.5">
                        <!-- Dynamic Buttons -->
                    </div>
                </div>
            </div>

            <!-- CONTAINER CARDS VIEW (GRID TIKET) -->
            <div id="view-container-cards" class="${this.viewMode === 'cards' ? '' : 'hidden'} space-y-4">
                <div id="pesanan-cards-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- Dynamic Order Cards -->
                </div>

                <!-- Pagination Footer for Cards -->
                <div class="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div id="pagination-info-cards" class="text-gray-500 font-medium">
                        Menampilkan 0 dari 0 data
                    </div>
                    <div id="pagination-controls-cards" class="flex items-center gap-1.5">
                        <!-- Dynamic Buttons -->
                    </div>
                </div>
            </div>
        </div>

        <!-- MODAL DETAIL PESANAN YANG DIPERBAHARUI & LEBIH JELAS -->
        <div id="modal-pesanan-detail" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 hidden animate-fadeIn">
            <div class="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden animate-scaleUp flex flex-col max-h-[92vh]">
                <!-- Modal Header -->
                <div class="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50/80 via-white to-amber-50/40 shrink-0">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-lg shadow-sm shadow-amber-500/30">
                            <i class="ri-shopping-bag-3-line"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-black text-gray-900 text-base" id="m-no-pesanan">Pesanan #...</h3>
                                <span id="m-header-status-badge"></span>
                            </div>
                            <p class="text-[11px] text-gray-500 mt-0.5" id="m-tgl-pesanan">-</p>
                        </div>
                    </div>
                    <button onclick="TokoPesananPage.closeModal()" class="text-gray-400 hover:text-gray-700 p-2 rounded-2xl hover:bg-gray-100 transition-colors">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-6 space-y-5 overflow-y-auto flex-1">
                    <!-- Progress Stepper Alur Pesanan -->
                    <div class="bg-gray-50/90 rounded-2xl p-4 border border-gray-100">
                        <p class="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-3">Alur Status Pesanan</p>
                        <div class="flex items-center justify-between relative px-2" id="m-stepper-container">
                            <!-- Dynamic Stepper -->
                        </div>
                    </div>

                    <!-- Customer & Payment Cards -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <!-- Card Data Pemesan -->
                        <div class="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs text-xs space-y-2">
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-black text-gray-400 uppercase tracking-wider">Pemesan</span>
                                <span id="m-pemesan-no-agt" class="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">-</span>
                            </div>
                            <div class="flex items-center gap-2.5 pt-1">
                                <div id="m-pemesan-avatar" class="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 font-black flex items-center justify-center text-xs shrink-0">
                                    A
                                </div>
                                <div class="min-w-0">
                                    <h4 id="m-pemesan-nama" class="font-bold text-sm text-gray-900 truncate">-</h4>
                                    <p id="m-pemesan-hp" class="text-gray-500 font-mono text-[11px]">-</p>
                                </div>
                            </div>
                            <div id="m-pemesan-actions" class="pt-2"></div>
                        </div>

                        <!-- Card Info Pembayaran -->
                        <div class="p-4 rounded-2xl bg-white border border-gray-200/80 shadow-2xs text-xs space-y-2.5">
                            <span class="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Pembayaran & Tagihan</span>
                            <div class="flex items-center justify-between text-xs">
                                <span class="text-gray-500">Metode:</span>
                                <span id="m-metode-badge" class="font-bold text-right">-</span>
                            </div>
                            <div class="flex items-center justify-between text-xs">
                                <span class="text-gray-500">Status Saldo:</span>
                                <span id="m-saldo-info" class="font-bold text-emerald-600 text-right">-</span>
                            </div>
                            <div class="flex items-center justify-between pt-1.5 border-t border-gray-100">
                                <span class="text-gray-700 font-bold">Total Belanja:</span>
                                <span id="m-total-nominal" class="font-black text-amber-600 text-base">Rp 0</span>
                            </div>
                        </div>
                    </div>

                    <!-- Catatan Pembeli jika ada -->
                    <div id="m-catatan-container" class="hidden p-3.5 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
                        <i class="ri-chat-voice-line text-amber-600 text-base shrink-0 mt-0.5"></i>
                        <div>
                            <span class="font-black block text-amber-800">Catatan Khusus dari Anggota:</span>
                            <p id="m-catatan-text" class="mt-0.5 font-medium leading-relaxed"></p>
                        </div>
                    </div>

                    <!-- Rincian Produk Pesanan -->
                    <div>
                        <div class="flex items-center justify-between mb-2.5">
                            <h4 class="font-black text-xs text-gray-800 uppercase tracking-wider flex items-center gap-2">
                                <i class="ri-shopping-cart-2-fill text-amber-500"></i> Rincian Barang Belanja
                            </h4>
                            <span id="m-item-count-badge" class="text-[11px] font-bold text-gray-500">0 Item</span>
                        </div>
                        <div class="border border-gray-100 rounded-2xl overflow-hidden shadow-2xs">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-gray-50/80 text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                                    <tr>
                                        <th class="px-4 py-3">Barang / Produk</th>
                                        <th class="px-4 py-3 text-right">Harga Satuan</th>
                                        <th class="px-4 py-3 text-center w-16">Qty</th>
                                        <th class="px-4 py-3 text-right">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody id="m-items-tbody" class="divide-y divide-gray-100 text-gray-700 bg-white">
                                </tbody>
                                <tfoot class="bg-gray-50/90 font-bold text-xs border-t border-gray-100">
                                    <tr>
                                        <td colspan="3" class="px-4 py-3.5 text-right text-gray-600 font-bold">Total Pembayaran:</td>
                                        <td class="px-4 py-3.5 text-right text-amber-600 font-black text-base" id="m-items-total">Rp 0</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <!-- Tindak Lanjut Alur Kerja -->
                    <div class="pt-2">
                        <p class="text-[11px] font-black uppercase tracking-wider text-gray-600 mb-2 flex items-center gap-1.5">
                            <i class="ri-flashlight-line text-amber-500"></i> Perbarui Status & Tindak Lanjut:
                        </p>
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-2" id="m-workflow-buttons">
                            <!-- Dynamic Workflow Buttons -->
                        </div>
                    </div>
                </div>

                <!-- Modal Footer -->
                <div class="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between shrink-0">
                    <button onclick="TokoPesananPage.printReceiptFromModal()"
                        class="px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 rounded-2xl text-xs font-bold shadow-2xs flex items-center gap-2 transition-all">
                        <i class="ri-printer-line text-sm text-gray-600"></i> Cetak Struk POS 58mm
                    </button>
                    <button onclick="TokoPesananPage.closeModal()"
                        class="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-2xl text-xs font-bold transition-all">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
        `;

        // Event listener for enter on search input
        const searchInput = document.getElementById('filter-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const btnClear = document.getElementById('btn-clear-search');
                if (btnClear) {
                    if (e.target.value.length > 0) btnClear.classList.remove('hidden');
                    else btnClear.classList.add('hidden');
                }
            });
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') this.load(1);
            });
        }

        await this.load(1);
    },

    clearSearch() {
        const inp = document.getElementById('filter-search');
        if (inp) {
            inp.value = '';
            document.getElementById('btn-clear-search')?.classList.add('hidden');
            this.load(1);
        }
    },

    setViewMode(mode) {
        this.viewMode = mode;
        const btnTable = document.getElementById('btn-view-table');
        const btnCards = document.getElementById('btn-view-cards');
        const cntTable = document.getElementById('view-container-table');
        const cntCards = document.getElementById('view-container-cards');

        if (mode === 'table') {
            btnTable?.classList.add('bg-white', 'text-gray-800', 'shadow-xs');
            btnTable?.classList.remove('text-gray-500');
            btnCards?.classList.remove('bg-white', 'text-gray-800', 'shadow-xs');
            btnCards?.classList.add('text-gray-500');

            cntTable?.classList.remove('hidden');
            cntCards?.classList.add('hidden');
        } else {
            btnCards?.classList.add('bg-white', 'text-gray-800', 'shadow-xs');
            btnCards?.classList.remove('text-gray-500');
            btnTable?.classList.remove('bg-white', 'text-gray-800', 'shadow-xs');
            btnTable?.classList.add('text-gray-500');

            cntCards?.classList.remove('hidden');
            cntTable?.classList.add('hidden');
        }

        this.renderTable();
        this.renderCards();
    },

    async refresh() {
        const icon = document.getElementById('icon-refresh-toko');
        icon?.classList.add('animate-spin');
        await this.load(this.pagination.page);
        setTimeout(() => icon?.classList.remove('animate-spin'), 600);
    },

    filterByStatus(status) {
        this.currentStatusFilter = status;

        // Update tab pill styles
        document.querySelectorAll('.tab-status-btn').forEach(b => {
            b.classList.remove('bg-primary-600', 'text-white', 'shadow-xs');
            b.classList.add('text-gray-600');
        });
        const activeTab = document.getElementById(`tab-status-${status}`);
        if (activeTab) {
            activeTab.classList.remove('text-gray-600');
            activeTab.classList.add('bg-primary-600', 'text-white', 'shadow-xs');
        }

        // Highlight active stat card
        document.querySelectorAll('.stat-pill-card').forEach(c => {
            c.classList.remove('ring-2', 'ring-primary-500', 'shadow-md');
        });
        const activeCard = document.getElementById(`card-stat-${status}`);
        if (activeCard) {
            activeCard.classList.add('ring-2', 'ring-primary-500', 'shadow-md');
        }

        this.load(1);
    },

    async load(page = 1) {
        this.pagination.page = page;

        const search = document.getElementById('filter-search')?.value || '';
        const status = this.currentStatusFilter;
        const metode = document.getElementById('filter-metode')?.value || 'all';
        const tglMulai = document.getElementById('filter-tgl-mulai')?.value || '';

        const params = new URLSearchParams({
            page: page,
            per_page: this.pagination.per_page,
            search: search,
            status: status,
            metode: metode,
            tgl_mulai: tglMulai
        });

        const res = await App.api(`toko-pesanan?${params.toString()}`);
        if (!res || !res.success) {
            const errHtml = `<tr><td colspan="6" class="text-center py-10 text-rose-500 font-semibold">Gagal memuat data pesanan toko.</td></tr>`;
            document.getElementById('pesanan-tbody').innerHTML = errHtml;
            document.getElementById('pesanan-cards-grid').innerHTML = `<div class="col-span-3 text-center py-10 text-rose-500">Gagal memuat data.</div>`;
            return;
        }

        this.data = res.data.items || [];
        this.stats = res.data.stats || {};
        this.pagination = res.data.pagination || this.pagination;
        this.koperasi = res.data.koperasi || {};

        this.renderStats();
        this.renderTable();
        this.renderCards();
        this.renderPagination();
    },

    renderStats() {
        const s = this.stats;
        document.getElementById('stat-total').textContent = s.total || 0;
        document.getElementById('stat-pending').textContent = s.pending || 0;
        document.getElementById('stat-diproses').textContent = s.diproses || 0;
        document.getElementById('stat-siap').textContent = s.siap_diambil || 0;
        document.getElementById('stat-selesai').textContent = s.selesai || 0;
        document.getElementById('stat-omset').textContent = this.rp(s.omset_selesai || 0);

        // Update tab badge counts
        document.getElementById('badge-tab-all').textContent = s.total || 0;
        document.getElementById('badge-tab-pending').textContent = s.pending || 0;
        document.getElementById('badge-tab-diproses').textContent = s.diproses || 0;
        document.getElementById('badge-tab-siap_diambil').textContent = s.siap_diambil || 0;
        document.getElementById('badge-tab-selesai').textContent = s.selesai || 0;
        document.getElementById('badge-tab-dibatalkan').textContent = s.dibatalkan || 0;
    },

    renderTable() {
        const tbody = document.getElementById('pesanan-tbody');
        document.getElementById('label-total-rows').textContent = `${this.pagination.total} Data Ditemukan`;

        if (!this.data || this.data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center py-16 text-gray-400">
                        <div class="w-16 h-16 rounded-3xl bg-gray-50 text-gray-300 flex items-center justify-center text-3xl mx-auto mb-3">
                            <i class="ri-inbox-2-line"></i>
                        </div>
                        <h4 class="font-bold text-gray-600 text-sm">Tidak ada pesanan toko ditemukan</h4>
                        <p class="text-xs text-gray-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter status Anda.</p>
                    </td>
                </tr>
            `;
            return;
        }

        const startIdx = (this.pagination.page - 1) * this.pagination.per_page;

        tbody.innerHTML = this.data.map((row, idx) => {
            const no = startIdx + idx + 1;
            const statusBadge = this.getStatusBadge(row.status);
            const metodeBadge = row.metode_pembayaran === 'sukarela'
                ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 whitespace-nowrap"><i class="ri-wallet-3-line"></i> Sukarela</span>`
                : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200/80 whitespace-nowrap"><i class="ri-cash-line"></i> Tunai (COD)</span>`;

            const tgl = new Date(row.tgl_pesanan).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            // Member initials for avatar
            const initials = (row.nama_anggota || 'A').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

            // Format items into clean tags that read cleanly horizontally
            const itemTags = (row.ringkasan_items || '').split(', ').map(it => {
                return `<span class="inline-block bg-gray-100 hover:bg-gray-200/80 text-gray-700 font-medium px-2 py-0.5 rounded-lg text-[11px] mr-1.5 mb-1 transition-colors border border-gray-200/60">${it}</span>`;
            }).join('');

            // Quick advance button based on status
            const quickAction = this.getQuickActionButton(row);

            return `
            <tr class="hover:bg-amber-50/20 transition-colors group">
                <td class="px-4 py-4 text-center font-bold text-gray-400 text-xs">${no}</td>

                <!-- 1. PESANAN & PEMESAN (MERGED: Rapi, horizontal, jelas) -->
                <td class="px-5 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-2xl bg-primary-100 text-primary-700 font-black flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            ${initials}
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-gray-900 text-xs">${row.nama_anggota}</span>
                                <span class="font-mono font-bold text-amber-700 text-[10px] bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">${row.no_pesanan}</span>
                            </div>
                            <div class="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5 font-medium">
                                <span class="font-mono text-gray-500">${row.no_anggota}</span>
                                ${row.no_hp ? `<span class="text-gray-400">• ${row.no_hp}</span>` : ''}
                                <span class="text-gray-400">• <i class="ri-time-line text-[10px]"></i> ${tgl}</span>
                            </div>
                        </div>
                    </div>
                </td>

                <!-- 2. BARANG BELANJA (Luas & Mudah Dibaca) -->
                <td class="px-5 py-4">
                    <div class="flex items-center gap-1.5 mb-1">
                        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-bold whitespace-nowrap">
                            <i class="ri-shopping-basket-line text-amber-500"></i> ${row.total_items} Barang
                        </span>
                    </div>
                    <div class="text-xs text-gray-700 font-medium leading-relaxed">
                        ${itemTags || '<span class="text-gray-400 text-[11px]">-</span>'}
                    </div>
                </td>

                <!-- 3. TAGIHAN & PEMBAYARAN (MERGED: Finansial satu kesatuan) -->
                <td class="px-5 py-4 whitespace-nowrap">
                    <span class="font-black text-gray-900 text-sm block leading-tight">${this.rp(row.total_nominal)}</span>
                    <div class="mt-1">${metodeBadge}</div>
                </td>

                <!-- 4. STATUS -->
                <td class="px-5 py-4 text-center whitespace-nowrap">
                    ${statusBadge}
                </td>

                <!-- 5. TINDAK LANJUT -->
                <td class="px-5 py-4 text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1.5">
                        ${quickAction}
                        <button onclick="TokoPesananPage.openDetail(${row.id})"
                            class="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs transition-all" title="Lihat Rincian Pesanan">
                            <i class="ri-eye-line text-sm"></i>
                        </button>
                        <button onclick="TokoPesananPage.printReceipt(${row.id})"
                            class="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs transition-all" title="Cetak Struk POS Thermal">
                            <i class="ri-printer-line text-sm"></i>
                        </button>
                    </div>
                </td>
            </tr>`;
        }).join('');
    },

    renderCards() {
        const grid = document.getElementById('pesanan-cards-grid');
        if (!grid) return;

        if (!this.data || this.data.length === 0) {
            grid.innerHTML = `
                <div class="col-span-full text-center py-16 bg-white rounded-3xl border border-gray-100 text-gray-400">
                    <div class="w-16 h-16 rounded-3xl bg-gray-50 text-gray-300 flex items-center justify-center text-3xl mx-auto mb-3">
                        <i class="ri-inbox-2-line"></i>
                    </div>
                    <h4 class="font-bold text-gray-600 text-sm">Tidak ada pesanan toko ditemukan</h4>
                    <p class="text-xs text-gray-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter status Anda.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = this.data.map(row => {
            const statusBadge = this.getStatusBadge(row.status);
            const tgl = new Date(row.tgl_pesanan).toLocaleDateString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
            const initials = (row.nama_anggota || 'A').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
            const quickAction = this.getQuickActionButton(row, true);

            return `
            <div class="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between relative overflow-hidden group">
                <!-- Card Header -->
                <div>
                    <div class="flex items-center justify-between gap-2 pb-3 border-b border-gray-100">
                        <div>
                            <span class="font-mono font-black text-amber-700 text-xs bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60">${row.no_pesanan}</span>
                            <span class="text-[10px] text-gray-400 block mt-1">${tgl}</span>
                        </div>
                        <div>${statusBadge}</div>
                    </div>

                    <!-- Customer Info -->
                    <div class="flex items-center gap-3 py-3.5">
                        <div class="w-10 h-10 rounded-2xl bg-primary-100 text-primary-700 font-black flex items-center justify-center text-xs shrink-0">
                            ${initials}
                        </div>
                        <div class="min-w-0 flex-1">
                            <h4 class="font-bold text-sm text-gray-900 truncate">${row.nama_anggota}</h4>
                            <p class="text-[11px] text-gray-400 font-mono">${row.no_anggota} ${row.no_hp ? '• ' + row.no_hp : ''}</p>
                        </div>
                    </div>

                    <!-- Item Summary Box -->
                    <div class="p-3 bg-gray-50/80 rounded-2xl border border-gray-100 text-xs mb-3 space-y-1">
                        <div class="flex items-center justify-between text-[11px] text-gray-500 font-bold">
                            <span>Barang Belanja</span>
                            <span>${row.total_items} Item</span>
                        </div>
                        <p class="text-[11px] text-gray-700 font-medium line-clamp-2 leading-relaxed">
                            ${row.ringkasan_items || '-'}
                        </p>
                    </div>

                    <!-- Payment & Total -->
                    <div class="flex items-center justify-between pt-1 pb-3 text-xs">
                        <div>
                            <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Pembayaran</span>
                            <span class="font-bold text-gray-700">${row.metode_pembayaran === 'sukarela' ? '🟢 Potong Sukarela' : '🔵 Tunai di Kasir'}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Total Belanja</span>
                            <span class="font-black text-amber-600 text-sm">${this.rp(row.total_nominal)}</span>
                        </div>
                    </div>
                </div>

                <!-- Card Actions Footer -->
                <div class="pt-3 border-t border-gray-100 flex items-center gap-2">
                    ${quickAction}
                    <button onclick="TokoPesananPage.openDetail(${row.id})"
                        class="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all" title="Detail">
                        <i class="ri-eye-line text-sm"></i>
                    </button>
                    <button onclick="TokoPesananPage.printReceipt(${row.id})"
                        class="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl text-xs font-bold transition-all" title="Cetak Struk">
                        <i class="ri-printer-line text-sm"></i>
                    </button>
                </div>
            </div>`;
        }).join('');
    },

    getQuickActionButton(row, isCard = false) {
        const id = row.id;
        const st = row.status;

        if (st === 'pending') {
            return `
                <button onclick="TokoPesananPage.updateStatus(${id}, 'diproses')"
                    class="${isCard ? 'flex-1' : ''} px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs">
                    <i class="ri-loader-2-line"></i> Siapkan
                </button>
            `;
        } else if (st === 'diproses') {
            return `
                <button onclick="TokoPesananPage.updateStatus(${id}, 'siap_diambil')"
                    class="${isCard ? 'flex-1' : ''} px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs">
                    <i class="ri-check-double-line"></i> Siap Diambil
                </button>
            `;
        } else if (st === 'siap_diambil') {
            return `
                <button onclick="TokoPesananPage.updateStatus(${id}, 'selesai')"
                    class="${isCard ? 'flex-1' : ''} px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 shadow-2xs">
                    <i class="ri-checkbox-circle-line"></i> Serahkan
                </button>
            `;
        }

        return '';
    },

    getStatusBadge(status) {
        switch (status) {
            case 'pending':
                return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-100/90 text-amber-800 border border-amber-200/80"><span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span> Pending</span>`;
            case 'diproses':
                return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-cyan-100/90 text-cyan-800 border border-cyan-200/80"><i class="ri-loader-2-line text-cyan-600"></i> Disiapkan</span>`;
            case 'siap_diambil':
                return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-indigo-100/90 text-indigo-800 border border-indigo-200/80"><i class="ri-hand-coin-line text-indigo-600"></i> Siap Diambil</span>`;
            case 'selesai':
                return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100/90 text-emerald-800 border border-emerald-200/80"><i class="ri-check-line text-emerald-600"></i> Selesai</span>`;
            case 'dibatalkan':
                return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-100/90 text-rose-800 border border-rose-200/80"><i class="ri-close-line text-rose-600"></i> Dibatalkan</span>`;
            default:
                return `<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-gray-100 text-gray-800">${status}</span>`;
        }
    },

    renderPagination() {
        const info = document.getElementById('pagination-info');
        const infoCards = document.getElementById('pagination-info-cards');
        const ctrl = document.getElementById('pagination-controls');
        const ctrlCards = document.getElementById('pagination-controls-cards');
        const p = this.pagination;

        const start = p.total === 0 ? 0 : (p.page - 1) * p.per_page + 1;
        const end = Math.min(p.page * p.per_page, p.total);
        const textInfo = `Menampilkan ${start} - ${end} dari ${p.total} data pesanan`;

        if (info) info.textContent = textInfo;
        if (infoCards) infoCards.textContent = textInfo;

        if (p.total_pages <= 1) {
            if (ctrl) ctrl.innerHTML = '';
            if (ctrlCards) ctrlCards.innerHTML = '';
            return;
        }

        let btns = '';
        if (p.page > 1) {
            btns += `<button onclick="TokoPesananPage.load(${p.page - 1})" class="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"><i class="ri-arrow-left-s-line"></i></button>`;
        }
        for (let i = 1; i <= p.total_pages; i++) {
            if (i === 1 || i === p.total_pages || (i >= p.page - 1 && i <= p.page + 1)) {
                btns += `<button onclick="TokoPesananPage.load(${i})" class="px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${i === p.page ? 'bg-primary-600 text-white shadow-xs' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}">${i}</button>`;
            } else if (i === p.page - 2 || i === p.page + 2) {
                btns += `<span class="px-1 text-gray-400">...</span>`;
            }
        }
        if (p.page < p.total_pages) {
            btns += `<button onclick="TokoPesananPage.load(${p.page + 1})" class="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors"><i class="ri-arrow-right-s-line"></i></button>`;
        }

        if (ctrl) ctrl.innerHTML = btns;
        if (ctrlCards) ctrlCards.innerHTML = btns;
    },

    resetFilter() {
        document.getElementById('filter-search').value = '';
        document.getElementById('filter-metode').value = 'all';
        document.getElementById('filter-tgl-mulai').value = '';
        document.getElementById('btn-clear-search')?.classList.add('hidden');
        this.filterByStatus('all');
    },

    // ===== MODAL DETAIL & PROGRESS STEPPER =====
    async openDetail(id) {
        const res = await App.api(`toko-pesanan/${id}`);
        if (!res || !res.success) {
            App.toast('Gagal memuat detail pesanan', 'error');
            return;
        }

        const o = res.data;
        this.activeOrder = o;

        document.getElementById('m-no-pesanan').textContent = `Pesanan #${o.no_pesanan}`;
        document.getElementById('m-header-status-badge').innerHTML = this.getStatusBadge(o.status);

        document.getElementById('m-tgl-pesanan').textContent = new Date(o.tgl_pesanan).toLocaleDateString('id-ID', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        // Stepper Progress Tracker
        this.renderStepper(o.status);

        // Member Data
        document.getElementById('m-pemesan-nama').textContent = o.nama_anggota;
        document.getElementById('m-pemesan-no-agt').textContent = o.no_anggota;
        document.getElementById('m-pemesan-hp').textContent = o.no_hp || 'Tidak ada nomor telepon';

        const initials = (o.nama_anggota || 'A').split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        document.getElementById('m-pemesan-avatar').textContent = initials;

        // WhatsApp direct action
        const waContainer = document.getElementById('m-pemesan-actions');
        if (o.no_hp) {
            const cleanHp = o.no_hp.replace(/[^0-9]/g, '');
            const waHp = cleanHp.startsWith('0') ? '62' + cleanHp.substring(1) : cleanHp;
            const waText = encodeURIComponent(`Halo Bpk/Ibu ${o.nama_anggota}, kami dari Toko Koperasi mengonfirmasi pesanan #${o.no_pesanan} Anda saat ini berstatus: ${o.status.toUpperCase()}.`);
            waContainer.innerHTML = `
                <a href="https://wa.me/${waHp}?text=${waText}" target="_blank"
                    class="w-full py-2 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-bold hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition-all shadow-2xs">
                    <i class="ri-whatsapp-line text-sm"></i> Kirim Notifikasi WhatsApp
                </a>
            `;
        } else {
            waContainer.innerHTML = '';
        }

        // Payment Info
        document.getElementById('m-metode-badge').innerHTML = o.metode_pembayaran === 'sukarela'
            ? `<span class="text-emerald-700 font-bold">🟢 Potong Simpanan Sukarela</span>`
            : `<span class="text-blue-700 font-bold">🔵 Bayar Tunai (Di Kasir)</span>`;

        document.getElementById('m-saldo-info').innerHTML = o.metode_pembayaran === 'sukarela'
            ? `<span class="text-emerald-700">Lunas Terpotong Otomatis</span>`
            : `<span class="text-amber-600">Belum Lunas (Bayar saat ambil)</span>`;

        document.getElementById('m-total-nominal').textContent = this.rp(o.total_nominal);

        // Catatan Pembeli
        const catBox = document.getElementById('m-catatan-container');
        if (o.catatan) {
            document.getElementById('m-catatan-text').textContent = o.catatan;
            catBox.classList.remove('hidden');
        } else {
            catBox.classList.add('hidden');
        }

        // Render Items Table
        const tbody = document.getElementById('m-items-tbody');
        document.getElementById('m-item-count-badge').textContent = `${(o.items || []).length} Jenis Barang`;

        tbody.innerHTML = (o.items || []).map(it => {
            const imgHtml = it.gambar
                ? `<img src="${it.gambar}" alt="${it.nama_produk}" class="w-10 h-10 object-cover rounded-xl border border-gray-100 shrink-0">`
                : `<div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg shrink-0 border border-amber-100"><i class="ri-shopping-basket-line"></i></div>`;

            return `
            <tr class="hover:bg-gray-50/50 transition-colors">
                <td class="px-4 py-3">
                    <div class="flex items-center gap-3">
                        ${imgHtml}
                        <div class="min-w-0">
                            <span class="font-bold text-gray-900 text-xs block leading-tight">${it.nama_produk}</span>
                            <span class="text-[10px] text-gray-400 font-mono mt-0.5 block">${it.kode_produk || ''} • Satuan: ${it.satuan || 'pcs'}</span>
                        </div>
                    </div>
                </td>
                <td class="px-4 py-3 text-right font-medium text-gray-600">${this.rp(it.harga_satuan)}</td>
                <td class="px-4 py-3 text-center">
                    <span class="px-2.5 py-1 bg-gray-100 text-gray-800 font-black text-xs rounded-lg">${it.qty}</span>
                </td>
                <td class="px-4 py-3 text-right font-black text-gray-900">${this.rp(it.subtotal)}</td>
            </tr>`;
        }).join('');

        document.getElementById('m-items-total').textContent = this.rp(o.total_nominal);

        // Workflow Buttons
        this.renderWorkflowButtons(o);

        document.getElementById('modal-pesanan-detail').classList.remove('hidden');
    },

    renderStepper(currentStatus) {
        const container = document.getElementById('m-stepper-container');
        if (!container) return;

        if (currentStatus === 'dibatalkan') {
            container.innerHTML = `
                <div class="w-full py-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-center font-bold text-xs flex items-center justify-center gap-2">
                    <i class="ri-close-circle-fill text-base"></i> Pesanan Ini Telah Dibatalkan
                </div>
            `;
            return;
        }

        const steps = [
            { key: 'pending', label: '1. Pesanan Masuk', icon: 'ri-time-line' },
            { key: 'diproses', label: '2. Disiapkan', icon: 'ri-loader-2-line' },
            { key: 'siap_diambil', label: '3. Siap Diambil', icon: 'ri-hand-coin-line' },
            { key: 'selesai', label: '4. Selesai', icon: 'ri-checkbox-circle-line' }
        ];

        const stepRank = { 'pending': 1, 'diproses': 2, 'siap_diambil': 3, 'selesai': 4 };
        const currentRank = stepRank[currentStatus] || 1;

        container.innerHTML = steps.map((s, idx) => {
            const thisRank = stepRank[s.key];
            const isDone = thisRank <= currentRank;
            const isCurrent = thisRank === currentRank;

            const circleClass = isCurrent
                ? 'bg-amber-500 text-white ring-4 ring-amber-100 shadow-sm'
                : (isDone ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-500');

            return `
            <div class="flex-1 flex flex-col items-center relative z-10">
                <div class="w-8 h-8 rounded-full ${circleClass} flex items-center justify-center text-xs font-black transition-all">
                    <i class="${isDone && !isCurrent ? 'ri-check-line font-bold' : s.icon}"></i>
                </div>
                <span class="text-[10px] font-bold mt-1.5 text-center ${isCurrent ? 'text-amber-700 font-black' : (isDone ? 'text-gray-800' : 'text-gray-400')}">
                    ${s.label}
                </span>
            </div>
            `;
        }).join('');
    },

    renderWorkflowButtons(o) {
        const container = document.getElementById('m-workflow-buttons');
        const st = o.status;
        let btns = '';

        if (st === 'pending') {
            btns += `
                <button onclick="TokoPesananPage.updateStatus(${o.id}, 'diproses')"
                    class="py-2.5 px-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-2xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5">
                    <i class="ri-loader-2-line"></i> Mulai Siapkan Barang
                </button>
                <button onclick="TokoPesananPage.updateStatus(${o.id}, 'siap_diambil')"
                    class="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5">
                    <i class="ri-check-double-line"></i> Langsung Siap Diambil
                </button>
            `;
        } else if (st === 'diproses') {
            btns += `
                <button onclick="TokoPesananPage.updateStatus(${o.id}, 'siap_diambil')"
                    class="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5">
                    <i class="ri-hand-coin-line"></i> Barang Selesai, Siap Diambil
                </button>
                <button onclick="TokoPesananPage.updateStatus(${o.id}, 'selesai')"
                    class="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5">
                    <i class="ri-checkbox-circle-line"></i> Langsung Selesaikan
                </button>
            `;
        } else if (st === 'siap_diambil') {
            btns += `
                <button onclick="TokoPesananPage.updateStatus(${o.id}, 'selesai')"
                    class="col-span-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-sm shadow-emerald-600/30 transition-all flex items-center justify-center gap-2">
                    <i class="ri-checkbox-circle-line text-base"></i> Serahkan Barang & Selesaikan Pesanan
                </button>
            `;
        }

        if (st !== 'selesai' && st !== 'dibatalkan') {
            btns += `
                <button onclick="TokoPesananPage.promptCancel(${o.id})"
                    class="py-2.5 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-1.5">
                    <i class="ri-close-circle-line"></i> Batalkan Pesanan
                </button>
            `;
        } else if (st === 'selesai') {
            btns += `
                <div class="col-span-3 p-3 bg-emerald-50 rounded-2xl text-emerald-800 text-xs font-bold text-center border border-emerald-100 flex items-center justify-center gap-2">
                    <i class="ri-check-double-line text-base"></i> Pesanan Ini Telah Selesai & Diserahkan
                </div>
            `;
        } else if (st === 'dibatalkan') {
            btns += `
                <div class="col-span-3 p-3 bg-rose-50 rounded-2xl text-rose-800 text-xs font-bold text-center border border-rose-100 flex items-center justify-center gap-2">
                    <i class="ri-close-circle-line text-base"></i> Pesanan Ini Telah Dibatalkan
                </div>
            `;
        }

        container.innerHTML = btns;
    },

    closeModal() {
        document.getElementById('modal-pesanan-detail').classList.add('hidden');
        this.activeOrder = null;
    },

    async updateStatus(id, newStatus, alasan = '') {
        const labels = {
            'diproses': 'Mulai Siapkan Pesanan',
            'siap_diambil': 'Tandai Siap Diambil di Kasir',
            'selesai': 'Selesaikan Pesanan & Serahkan Barang',
            'dibatalkan': 'Batalkan Pesanan'
        };

        const ok = await Swal.fire({
            title: labels[newStatus] || 'Ubah Status Pesanan',
            text: `Apakah Anda yakin ingin memproses pesanan ini menjadi "${newStatus.replace('_', ' ').toUpperCase()}"?`,
            icon: newStatus === 'dibatalkan' ? 'warning' : 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Lanjutkan',
            cancelButtonText: 'Batal',
            confirmButtonColor: newStatus === 'dibatalkan' ? '#e11d48' : '#4f46e5',
            borderRadius: '1.25rem'
        });

        if (!ok.isConfirmed) return;

        const res = await App.api(`toko-pesanan/${id}/status`, {
            method: 'POST',
            body: { status: newStatus, alasan: alasan }
        });

        if (res && res.success) {
            App.toast(res.message || 'Status pesanan berhasil diperbarui', 'success');
            this.closeModal();
            this.load(this.pagination.page);
        } else {
            App.toast(res?.message || 'Gagal mengubah status pesanan', 'error');
        }
    },

    async promptCancel(id) {
        const { value: alasan } = await Swal.fire({
            title: 'Batalkan Pesanan',
            text: 'Stok barang akan otomatis dikembalikan ke etalase toko. Jika pembayaran menggunakan Simpanan Sukarela, saldo anggota akan otomatis direfund.',
            input: 'text',
            inputPlaceholder: 'Tuliskan alasan pembatalan (misal: stok fisik rusak, permintaan anggota)...',
            inputValidator: (val) => {
                if (!val) return 'Alasan pembatalan wajib diisi';
            },
            showCancelButton: true,
            confirmButtonText: 'Proses Pembatalan',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#e11d48',
            borderRadius: '1.25rem'
        });

        if (alasan) {
            await this.updateStatus(id, 'dibatalkan', alasan);
        }
    },

    printReceiptFromModal() {
        if (this.activeOrder) {
            this.printReceipt(this.activeOrder.id);
        }
    },

    async printReceipt(id) {
        const res = await App.api(`toko-pesanan/${id}/struk`);
        if (!res || !res.success || !res.data || !res.data.order) {
            App.toast('Gagal memuat struk pesanan: ' + (res?.message || 'Data tidak ditemukan'), 'error');
            return;
        }

        const o = res.data.order;
        const items = res.data.items || [];
        const kop = res.data.koperasi || {};

        const printWin = window.open('', '_blank', 'width=380,height=600');
        if (!printWin) {
            alert('Popup terblokir oleh browser. Izinkan popup untuk mencetak struk.');
            return;
        }

        const tgl = new Date(o.tgl_pesanan).toLocaleDateString('id-ID', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Struk Pesanan ${o.no_pesanan}</title>
            <style>
                @page { size: 58mm auto; margin: 2mm; }
                body {
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 11px;
                    line-height: 1.25;
                    color: #000;
                    margin: 0;
                    padding: 4px;
                    width: 58mm;
                }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .font-bold { font-weight: bold; }
                .border-dashed { border-top: 1px dashed #000; margin: 6px 0; }
                .border-double { border-top: 2px solid #000; margin: 6px 0; }
                .flex-between { display: flex; justify-content: space-between; }
                table { width: 100%; border-collapse: collapse; font-size: 10px; }
                th, td { padding: 2px 0; }
            </style>
        </head>
        <body>
            <div class="text-center font-bold" style="font-size: 13px;">${kop.nama}</div>
            <div class="text-center" style="font-size: 9px;">${kop.alamat}</div>
            <div class="text-center" style="font-size: 9px;">Telp: ${kop.telepon}</div>
            <div class="border-double"></div>

            <div class="flex-between"><span>No: ${o.no_pesanan}</span></div>
            <div class="flex-between"><span>Tgl: ${tgl}</span></div>
            <div class="flex-between"><span>Kasir: ${kop.kasir}</span></div>
            <div class="flex-between"><span>Anggota: ${o.nama_anggota}</span></div>
            <div class="flex-between"><span>No.Agt: ${o.no_anggota}</span></div>
            <div class="border-dashed"></div>

            <table>
                ${items.map(it => `
                    <tr>
                        <td colspan="3" class="font-bold">${it.nama_produk}</td>
                    </tr>
                    <tr>
                        <td style="width: 45%;">${Number(it.qty)} x ${this.rp(it.harga_satuan)}</td>
                        <td style="width: 10%;"></td>
                        <td class="text-right font-bold">${this.rp(it.subtotal)}</td>
                    </tr>
                `).join('')}
            </table>

            <div class="border-dashed"></div>
            <div class="flex-between font-bold" style="font-size: 12px;">
                <span>TOTAL:</span>
                <span>${this.rp(o.total_nominal)}</span>
            </div>
            <div class="flex-between" style="font-size: 10px; margin-top: 2px;">
                <span>Bayar:</span>
                <span>${o.metode_pembayaran === 'sukarela' ? 'Potong Sukarela' : 'Tunai (COD)'}</span>
            </div>
            <div class="flex-between font-bold" style="font-size: 10px;">
                <span>STATUS:</span>
                <span>${o.status.toUpperCase()}</span>
            </div>

            <div class="border-double"></div>
            <div class="text-center" style="font-size: 9px; margin-top: 8px;">
                Terima kasih telah berbelanja di Toko Koperasi.<br>
                Dari Anggota, Oleh Anggota, Untuk Anggota.
            </div>

            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 800);
                }
            </script>
        </body>
        </html>`;

        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
    },

    async exportPDF() {
        const search = document.getElementById('filter-search')?.value || '';
        const status = this.currentStatusFilter;
        const metode = document.getElementById('filter-metode')?.value || 'all';

        const params = new URLSearchParams({
            export: '1',
            search: search,
            status: status,
            metode: metode
        });

        const res = await App.api(`toko-pesanan?${params.toString()}`);
        if (!res || !res.success || !res.data.items) {
            App.toast('Gagal mengambil data untuk PDF', 'error');
            return;
        }

        const items = res.data.items;
        const kop = res.data.koperasi;

        const printWin = window.open('', '_blank');
        if (!printWin) {
            alert('Popup terblokir browser. Izinkan popup untuk mencetak laporan.');
            return;
        }

        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Laporan Pesanan Toko Koperasi</title>
            <style>
                body { font-family: Arial, sans-serif; font-size: 11px; color: #333; margin: 20px; }
                .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
                .header h2 { margin: 0; font-size: 16px; text-transform: uppercase; }
                .header p { margin: 2px 0; font-size: 11px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
                th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
                th { background-color: #f8fafc; font-weight: bold; }
                .text-right { text-align: right; }
                .text-center { text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <h2>${kop.nama}</h2>
                <p>${kop.alamat} • Telp: ${kop.telepon}</p>
                <h3 style="margin-top: 8px; margin-bottom: 2px;">REKAPITULASI PESANAN TOKO KOPERASI</h3>
                <p>Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th class="text-center" style="width: 30px;">No</th>
                        <th>No. Pesanan</th>
                        <th>Tanggal</th>
                        <th>Nama Anggota</th>
                        <th>Ringkasan Barang</th>
                        <th>Metode</th>
                        <th class="text-right">Total (Rp)</th>
                        <th class="text-center">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map((row, idx) => `
                        <tr>
                            <td class="text-center">${idx + 1}</td>
                            <td style="font-family: monospace; font-weight: bold;">${row.no_pesanan}</td>
                            <td>${new Date(row.tgl_pesanan).toLocaleDateString('id-ID')}</td>
                            <td>${row.nama_anggota} (${row.no_anggota})</td>
                            <td>${row.ringkasan_items || '-'}</td>
                            <td>${row.metode_pembayaran === 'sukarela' ? 'Sukarela' : 'Tunai COD'}</td>
                            <td class="text-right">${this.rp(row.total_nominal)}</td>
                            <td class="text-center">${row.status.toUpperCase()}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <script>
                window.onload = function() {
                    window.print();
                }
            </script>
        </body>
        </html>`;

        printWin.document.open();
        printWin.document.write(html);
        printWin.document.close();
    },

    async exportCSV() {
        const search = document.getElementById('filter-search')?.value || '';
        const status = this.currentStatusFilter;
        const metode = document.getElementById('filter-metode')?.value || 'all';

        const params = new URLSearchParams({
            export: '1',
            search: search,
            status: status,
            metode: metode
        });

        const res = await App.api(`toko-pesanan?${params.toString()}`);
        if (!res || !res.success || !res.data.items) {
            App.toast('Gagal mengambil data untuk CSV', 'error');
            return;
        }

        const items = res.data.items;
        const headers = ["No", "No Pesanan", "Tanggal", "No Anggota", "Nama Anggota", "No HP", "Metode", "Total Nominal", "Status", "Ringkasan Produk"];
        const rows = items.map((r, i) => [
            i + 1,
            `"${r.no_pesanan}"`,
            `"${r.tgl_pesanan}"`,
            `"${r.no_anggota}"`,
            `"${r.nama_anggota.replace(/"/g, '""')}"`,
            `"${r.no_hp || ''}"`,
            `"${r.metode_pembayaran}"`,
            r.total_nominal,
            `"${r.status}"`,
            `"${(r.ringkasan_items || '').replace(/"/g, '""')}"`
        ]);

        const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pesanan_toko_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    rp(val) {
        return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
    }
};

window.TokoPesananPage = TokoPesananPage;
export default TokoPesananPage;
