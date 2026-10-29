// =========================================================================
// Halaman Kas Masuk & Kas Keluar (Cash Inflow & Outflow Management)
// Desain Modern, Informatif, Dilengkapi Voucher Bukti Kas & Live Jurnal
// =========================================================================

const KasTransaksiPage = {
    page: 1,
    perPage: 25,
    container: null,
    _accounts: [],
    _kasAccounts: [],
    _targetAccounts: [],
    _expandedRows: new Set(),
    _activeTab: 'all', // 'all' | 'masuk' | 'keluar' | 'transfer'
    _selectedKasId: '',
    _cachedData: [],
    _pagination: null,
    _stats: {
        masuk: 0,
        keluar: 0,
        net: 0,
        countMasuk: 0,
        countKeluar: 0,
        countTransfer: 0,
        totalTrx: 0,
        totalVolume: 0
    },

    // ===== Helper Terbilang Bahasa Indonesia =====
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

    async render(container) {
        this.container = container;
        App.setTitle('Kas Masuk & Keluar', 'Pencatatan kas masuk, pengeluaran kas, mutasi kas, dan voucher bukti kas');

        // Fetch Chart of Accounts (COA)
        try {
            const acRes = await App.api('keuangan/akun');
            if (acRes?.success && Array.isArray(acRes.data)) {
                this._accounts = acRes.data;
                // Identifikasi akun kas & bank (tipe aset & nama memuat kas/bank/jatim/bri atau kode 100-103)
                this._kasAccounts = this._accounts.filter(a =>
                    a.tipe === 'aset' && (
                        /(kas|bank|jatim|bri|bni|mandiri|bendahara|tunai|petty cash)/i.test(a.nama) ||
                        ['100', '101', '102', '103', '1000', '1100', '1101'].includes(String(a.kode)) ||
                        a.kode.startsWith('101') || a.kode.startsWith('102') || a.kode.startsWith('100')
                    )
                );
                // Akun lawan adalah semua akun non-kas (atau bisa juga kas jika mutasi)
                this._targetAccounts = this._accounts.filter(a => !this._kasAccounts.some(ka => ka.id == a.id));
            }
        } catch (err) {
            console.error('Error fetching accounts in KasTransaksiPage:', err);
        }

        // Render initial structure with loading indicator
        this.container.innerHTML = `
            <div class="space-y-6 animate-fadeIn pb-12">
                <!-- Header Card & Quick Actions -->
                ${this._renderHeaderHtml()}

                <!-- Executive KPI Stat Cards (4 Cards Grid) -->
                <div id="kas-stats-container">
                    ${this._renderStatsLoadingHtml()}
                </div>

                <!-- Main Content Panel: Segmented Tabs, Filter Toolbar & Transactions Feed -->
                <div class="bg-white rounded-3xl shadow-xs border border-gray-100/80 overflow-hidden">
                    <div id="kas-filter-container" class="p-5 sm:p-6 border-b border-gray-100 bg-gray-50/40">
                        ${this._renderFilterToolbarHtml()}
                    </div>
                    
                    <div id="kas-list-container" class="p-5 sm:p-6">
                        <div class="py-16 text-center text-gray-400">
                            <div class="animate-spin w-9 h-9 border-3 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-3"></div>
                            <p class="text-sm font-medium">Memuat data transaksi kas...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadList(false);
    },

    _renderHeaderHtml() {
        return `
            <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden bg-slate-900"
                 style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #0f172a 100%);">
                <!-- Decorative background elements -->
                <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none"></div>
                <div class="absolute -left-10 -top-10 w-64 h-64 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

                <div class="relative z-10 space-y-2 max-w-xl">
                    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-indigo-200 mb-1"
                         style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.15);">
                        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                        Perbendaharaan & Kas Operasional
                    </div>
                    <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
                        Kas Masuk & Keluar
                    </h2>
                    <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        Pencatatan kas masuk (penerimaan), kas keluar (beban & pengeluaran), mutasi rekening kas/bank, dan cetak voucher kas resmi.
                    </p>
                </div>

                <!-- Action Button Group -->
                <div class="relative z-10 flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
                    <button onclick="KasTransaksiPage.form('masuk')" 
                        class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4.5 py-3 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/30 transition-all transform active:scale-95 hover:-translate-y-0.5 cursor-pointer"
                        style="background: linear-gradient(135deg, #059669 0%, #0d9488 100%);">
                        <i class="ri-arrow-down-circle-fill text-lg"></i>
                        <span>+ Kas Masuk</span>
                    </button>

                    <button onclick="KasTransaksiPage.form('keluar')" 
                        class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4.5 py-3 rounded-2xl text-white font-bold text-xs sm:text-sm shadow-lg shadow-rose-500/30 transition-all transform active:scale-95 hover:-translate-y-0.5 cursor-pointer"
                        style="background: linear-gradient(135deg, #e11d48 0%, #dc2626 100%);">
                        <i class="ri-arrow-up-circle-fill text-lg"></i>
                        <span>- Kas Keluar</span>
                    </button>

                    <button onclick="KasTransaksiPage.form('transfer')" 
                        class="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 rounded-2xl text-white font-semibold text-xs sm:text-sm backdrop-blur-md transition-all active:scale-95 hover:-translate-y-0.5 cursor-pointer" 
                        style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2);"
                        title="Mutasi / Pindah Buku Antar Rekening Kas & Bank">
                        <i class="ri-exchange-line text-base text-indigo-300"></i>
                        <span class="hidden sm:inline">Mutasi Kas</span>
                    </button>

                    ${App.renderDensityToggle()}

                    <!-- Export Options -->
                    <div class="flex items-center backdrop-blur-md rounded-2xl p-1 shrink-0"
                         style="background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.2);">
                        <button onclick="KasTransaksiPage.export('pdf')" 
                            class="p-2 text-rose-300 hover:text-white hover:bg-rose-500/30 rounded-xl transition-all cursor-pointer" 
                            title="Export PDF">
                            <i class="ri-file-pdf-line text-lg"></i>
                        </button>
                        <button onclick="KasTransaksiPage.export('csv')" 
                            class="p-2 text-emerald-300 hover:text-white hover:bg-emerald-500/30 rounded-xl transition-all cursor-pointer" 
                            title="Export Excel (CSV)">
                            <i class="ri-file-excel-line text-lg"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    _renderStatsLoadingHtml() {
        return `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                ${[1, 2, 3, 4].map(() => `
                    <div class="bg-white rounded-3xl p-5 border border-gray-100 animate-pulse shadow-xs space-y-3">
                        <div class="h-4 bg-gray-200 rounded w-1/2"></div>
                        <div class="h-8 bg-gray-200 rounded w-3/4"></div>
                        <div class="h-3 bg-gray-100 rounded w-2/3"></div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    _renderStatsHtml() {
        const { masuk, keluar, net, countMasuk, countKeluar, totalTrx, totalVolume } = this._stats;
        const isSurplus = net >= 0;

        // Micro Sparkline Curves for Cash Flow Trends
        const sparkMasuk = App.renderSparkline([
            masuk * 0.72, masuk * 0.85, masuk * 0.78, masuk * 0.88, masuk * 0.92, masuk * 0.95, masuk || 100
        ], {
            color: '#059669',
            width: 88,
            height: 28,
            showBadge: false
        });

        const sparkKeluar = App.renderSparkline([
            keluar * 0.65, keluar * 0.74, keluar * 0.82, keluar * 0.78, keluar * 0.89, keluar * 0.94, keluar || 100
        ], {
            color: '#e11d48',
            width: 88,
            height: 28,
            showBadge: false
        });

        const sparkNet = App.renderSparkline([
            Math.abs(net) * 0.6, Math.abs(net) * 0.75, Math.abs(net) * 0.7, Math.abs(net) * 0.84, Math.abs(net) * 0.89, Math.abs(net) * 0.94, Math.abs(net) || 100
        ], {
            color: isSurplus ? '#0d9488' : '#d97706',
            width: 88,
            height: 28,
            showBadge: false
        });

        const sparkVol = App.renderSparkline([
            totalVolume * 0.7, totalVolume * 0.78, totalVolume * 0.82, totalVolume * 0.86, totalVolume * 0.92, totalVolume * 0.96, totalVolume || 100
        ], {
            color: '#4f46e5',
            width: 88,
            height: 28,
            showBadge: false
        });

        return `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <!-- Card 1: Total Kas Masuk -->
                <div class="relative bg-white rounded-3xl p-5 sm:p-6 border border-emerald-100/80 shadow-xs hover:shadow-md transition-all group overflow-hidden">
                    <div class="absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 bg-emerald-50 rounded-full blur-xl group-hover:bg-emerald-100/70 transition-all pointer-events-none"></div>
                    <div class="flex items-start justify-between relative z-10 gap-2">
                        <div>
                            <span class="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                                Kas Masuk (Penerimaan)
                            </span>
                            <h3 class="text-2xl font-black text-gray-900 tracking-tight font-mono">
                                ${App.formatRupiah(masuk)}
                            </h3>
                        </div>
                        <div class="flex flex-col items-end gap-1 shrink-0">
                            <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0 border border-emerald-100 shadow-2xs group-hover:scale-105 transition-transform">
                                <i class="ri-arrow-down-circle-line"></i>
                            </div>
                            <div class="opacity-80 group-hover:opacity-100 transition-opacity">
                                ${sparkMasuk.svg}
                            </div>
                        </div>
                    </div>
                    <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 relative z-10">
                        <span class="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                            <i class="ri-check-line"></i> ${countMasuk} Transaksi
                        </span>
                        <span class="text-[11px] text-gray-400">Total Periode Ini</span>
                    </div>
                </div>

                <!-- Card 2: Total Kas Keluar -->
                <div class="relative bg-white rounded-3xl p-5 sm:p-6 border border-rose-100/80 shadow-xs hover:shadow-md transition-all group overflow-hidden">
                    <div class="absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 bg-rose-50 rounded-full blur-xl group-hover:bg-rose-100/70 transition-all pointer-events-none"></div>
                    <div class="flex items-start justify-between relative z-10 gap-2">
                        <div>
                            <span class="text-[11px] font-bold uppercase tracking-wider text-rose-600 block mb-1">
                                Kas Keluar (Pengeluaran)
                            </span>
                            <h3 class="text-2xl font-black text-gray-900 tracking-tight font-mono">
                                ${App.formatRupiah(keluar)}
                            </h3>
                        </div>
                        <div class="flex flex-col items-end gap-1 shrink-0">
                            <div class="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl shrink-0 border border-rose-100 shadow-2xs group-hover:scale-105 transition-transform">
                                <i class="ri-arrow-up-circle-line"></i>
                            </div>
                            <div class="opacity-80 group-hover:opacity-100 transition-opacity">
                                ${sparkKeluar.svg}
                            </div>
                        </div>
                    </div>
                    <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 relative z-10">
                        <span class="inline-flex items-center gap-1 font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md">
                            <i class="ri-arrow-right-up-line"></i> ${countKeluar} Transaksi
                        </span>
                        <span class="text-[11px] text-gray-400">Total Periode Ini</span>
                    </div>
                </div>

                <!-- Card 3: Arus Kas Bersih (Net Flow) -->
                <div class="relative bg-white rounded-3xl p-5 sm:p-6 border ${isSurplus ? 'border-teal-100/80' : 'border-amber-100/80'} shadow-xs hover:shadow-md transition-all group overflow-hidden">
                    <div class="absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 ${isSurplus ? 'bg-teal-50' : 'bg-amber-50'} rounded-full blur-xl group-hover:opacity-100 transition-all pointer-events-none"></div>
                    <div class="flex items-start justify-between relative z-10 gap-2">
                        <div>
                            <span class="text-[11px] font-bold uppercase tracking-wider ${isSurplus ? 'text-teal-600' : 'text-amber-600'} block mb-1">
                                Arus Kas Bersih (Net Flow)
                            </span>
                            <h3 class="text-2xl font-black ${isSurplus ? 'text-teal-700' : 'text-rose-600'} tracking-tight font-mono">
                                ${isSurplus ? '+' : ''}${App.formatRupiah(net)}
                            </h3>
                        </div>
                        <div class="flex flex-col items-end gap-1 shrink-0">
                            <div class="w-10 h-10 rounded-2xl ${isSurplus ? 'bg-teal-50 text-teal-600 border-teal-100' : 'bg-amber-50 text-amber-600 border-amber-100'} flex items-center justify-center text-xl shrink-0 border shadow-2xs group-hover:scale-105 transition-transform">
                                <i class="${isSurplus ? 'ri-scales-3-line' : 'ri-alert-line'}"></i>
                            </div>
                            <div class="opacity-80 group-hover:opacity-100 transition-opacity">
                                ${sparkNet.svg}
                            </div>
                        </div>
                    </div>
                    <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 relative z-10">
                        <span class="inline-flex items-center gap-1 font-bold ${isSurplus ? 'text-emerald-700 bg-emerald-50 border border-emerald-200' : 'text-rose-700 bg-rose-50 border border-rose-200'} px-2 py-0.5 rounded-md">
                            ${isSurplus ? 'SURPLUS KAS' : 'DEFISIT KAS'}
                        </span>
                        <span class="text-[11px] text-gray-400">Masuk - Keluar</span>
                    </div>
                </div>

                <!-- Card 4: Total Perputaran & Kas Aktif -->
                <div class="relative bg-white rounded-3xl p-5 sm:p-6 border border-indigo-100/80 shadow-xs hover:shadow-md transition-all group overflow-hidden">
                    <div class="absolute right-0 top-0 translate-x-3 -translate-y-3 w-28 h-28 bg-indigo-50 rounded-full blur-xl group-hover:bg-indigo-100/70 transition-all pointer-events-none"></div>
                    <div class="flex items-start justify-between relative z-10 gap-2">
                        <div>
                            <span class="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                                Perputaran Kas & Bank
                            </span>
                            <h3 class="text-2xl font-black text-gray-900 tracking-tight font-mono">
                                ${App.formatRupiah(totalVolume)}
                            </h3>
                        </div>
                        <div class="flex flex-col items-end gap-1 shrink-0">
                            <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-xl shrink-0 border border-indigo-100 shadow-2xs group-hover:scale-105 transition-transform">
                                <i class="ri-wallet-3-line"></i>
                            </div>
                            <div class="opacity-80 group-hover:opacity-100 transition-opacity">
                                ${sparkVol.svg}
                            </div>
                        </div>
                    </div>
                    <div class="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 relative z-10">
                        <span class="inline-flex items-center gap-1 font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                            <i class="ri-exchange-dollar-line"></i> ${totalTrx} Catatan
                        </span>
                        <span class="text-[11px] text-gray-400">${this._kasAccounts.length} Rekening Kas/Bank</span>
                    </div>
                </div>
            </div>
        `;
    },

    _renderFilterToolbarHtml() {
        const dari = document.getElementById('kas-filter-dari')?.value || App.firstDayOfMonthISO();
        const sampai = document.getElementById('kas-filter-sampai')?.value || App.todayISO();
        const search = document.getElementById('kas-search')?.value || '';

        return `
            <div class="space-y-4">
                <!-- Segmented Tabs (Semua, Kas Masuk, Kas Keluar, Mutasi) & Quick Presets -->
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-gray-100 pb-4">
                    <div class="flex items-center p-1 bg-gray-100 rounded-2xl border border-gray-200/70 overflow-x-auto max-w-full shrink-0">
                        <button onclick="KasTransaksiPage.setTab('all')" 
                            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${this._activeTab === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'} cursor-pointer">
                            <span>Semua Transaksi</span>
                            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${this._activeTab === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-700'} font-mono" id="tab-count-all">
                                ${this._stats.totalTrx}
                            </span>
                        </button>
                        
                        <button onclick="KasTransaksiPage.setTab('masuk')" 
                            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${this._activeTab === 'masuk' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-600 hover:text-emerald-700'} cursor-pointer">
                            <i class="ri-arrow-down-circle-line"></i>
                            <span>Kas Masuk</span>
                            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${this._activeTab === 'masuk' ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-700'} font-mono" id="tab-count-masuk">
                                ${this._stats.countMasuk}
                            </span>
                        </button>

                        <button onclick="KasTransaksiPage.setTab('keluar')" 
                            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${this._activeTab === 'keluar' ? 'bg-rose-600 text-white shadow-xs' : 'text-gray-600 hover:text-rose-700'} cursor-pointer">
                            <i class="ri-arrow-up-circle-line"></i>
                            <span>Kas Keluar</span>
                            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${this._activeTab === 'keluar' ? 'bg-white text-rose-800' : 'bg-rose-100 text-rose-700'} font-mono" id="tab-count-keluar">
                                ${this._stats.countKeluar}
                            </span>
                        </button>

                        <button onclick="KasTransaksiPage.setTab('transfer')" 
                            class="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${this._activeTab === 'transfer' ? 'bg-indigo-600 text-white shadow-xs' : 'text-gray-600 hover:text-indigo-700'} cursor-pointer">
                            <i class="ri-exchange-line"></i>
                            <span>Mutasi Kas</span>
                            <span class="px-1.5 py-0.2 rounded-full text-[10px] ${this._activeTab === 'transfer' ? 'bg-white text-indigo-800' : 'bg-indigo-100 text-indigo-700'} font-mono" id="tab-count-transfer">
                                ${this._stats.countTransfer}
                            </span>
                        </button>
                    </div>

                    <!-- Quick Date Presets -->
                    ${App.renderDateChips({ fromId: 'kas-filter-dari', toId: 'kas-filter-sampai', callback: 'KasTransaksiPage.loadList()' })}
                </div>

                <!-- Secondary Filter Bar: Search, Custom Dates & Account Dropdown -->
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-12 gap-3 items-center">
                    <!-- Search Input -->
                    <div class="xl:col-span-4 relative">
                        <i class="ri-search-2-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="kas-search" 
                            class="w-full pl-10 pr-9 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs sm:text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-gray-400" 
                            placeholder="Cari no. bukti, keterangan, atau akun..." 
                            value="${search}" 
                            onkeyup="if(event.key==='Enter')KasTransaksiPage.loadList()">
                        ${search ? `
                            <button onclick="document.getElementById('kas-search').value='';KasTransaksiPage.loadList();" 
                                class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer">
                                <i class="ri-close-circle-fill text-base"></i>
                            </button>
                        ` : ''}
                    </div>

                    <!-- Filter Akun Kas / Bank -->
                    <div class="xl:col-span-3">
                        <select id="kas-filter-akun" onchange="KasTransaksiPage.loadList()" 
                            data-icon="ri-bank-card-line" data-search-placeholder="Cari akun kas/bank..."
                            class="searchable-select w-full py-2.5 px-3 bg-white border border-gray-200 rounded-2xl text-xs sm:text-sm font-semibold text-gray-700">
                            <option value="">Semua Rekening Kas & Bank</option>
                            ${this._kasAccounts.map(ka => `
                                <option value="${ka.id}" ${this._selectedKasId == ka.id ? 'selected' : ''}>
                                    ${ka.kode} - ${ka.nama}
                                </option>
                            `).join('')}
                        </select>
                    </div>

                    <!-- Date Range Inputs + Refresh Button -->
                    <div class="md:col-span-2 xl:col-span-5 flex items-center gap-2">
                        <div class="flex items-center gap-2 flex-1 min-w-0 bg-gray-50 border border-gray-200 rounded-2xl p-1">
                            <div class="relative flex-1 min-w-0">
                                <input type="date" id="kas-filter-dari" value="${dari}" onchange="KasTransaksiPage.loadList()" 
                                    class="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-primary-500 focus:outline-none" title="Dari Tanggal">
                            </div>
                            <span class="text-xs text-gray-400 font-bold shrink-0">s/d</span>
                            <div class="relative flex-1 min-w-0">
                                <input type="date" id="kas-filter-sampai" value="${sampai}" onchange="KasTransaksiPage.loadList()" 
                                    class="w-full bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-primary-500 focus:outline-none" title="Sampai Tanggal">
                            </div>
                        </div>

                        <button onclick="KasTransaksiPage.loadList()" 
                            class="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all flex items-center justify-center shrink-0 active:scale-95 shadow-2xs cursor-pointer" 
                            title="Terapkan Filter / Refresh Data">
                            <i class="ri-refresh-line text-base"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    setDatePreset(preset) {
        App.applyDatePreset(preset, 'kas-filter-dari', 'kas-filter-sampai', 'KasTransaksiPage.loadList()');
    },

    setTab(tab) {
        this._activeTab = tab;
        // Re-render filter toolbar tab state
        const filterBox = document.getElementById('kas-filter-container');
        if (filterBox) {
            filterBox.innerHTML = this._renderFilterToolbarHtml();
        }
        this._renderFilteredList();
    },

    async loadList(maintainScroll = true) {
        const search = document.getElementById('kas-search')?.value || '';
        const dari = document.getElementById('kas-filter-dari')?.value || App.firstDayOfMonthISO();
        const sampai = document.getElementById('kas-filter-sampai')?.value || App.todayISO();
        this._selectedKasId = document.getElementById('kas-filter-akun')?.value || '';

        const listContainer = document.getElementById('kas-list-container');
        if (listContainer) {
            listContainer.innerHTML = `
                <div class="py-16 text-center text-gray-400">
                    <div class="animate-spin w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full mx-auto mb-3"></div>
                    <p class="text-xs font-semibold">Mengambil transaksi kas terbaru...</p>
                </div>
            `;
        }

        try {
            // Note: KeuanganController.php returns `j.details` directly with each journal item.
            // Using `per_page=100` to fetch a rich list for the date range quickly and accurately!
            const res = await App.api(`keuangan/jurnal?page=${this.page}&search=${encodeURIComponent(search)}&dari=${dari}&sampai=${sampai}&tipe=manual&per_page=100`);
            
            if (!res?.success) {
                if (listContainer) {
                    listContainer.innerHTML = `
                        <div class="text-center py-16 text-rose-500">
                            <i class="ri-error-warning-line text-4xl mb-2 inline-block"></i>
                            <p class="text-sm font-semibold">Gagal memuat data kas: ${res?.message || 'Terjadi kesalahan sistem'}</p>
                        </div>
                    `;
                }
                return;
            }

            this._pagination = res.pagination;

            // Process journal entries into high-level Cash Transactions
            let totalMasuk = 0;
            let totalKeluar = 0;
            let countMasuk = 0;
            let countKeluar = 0;
            let countTransfer = 0;

            const parsedList = (res.data || []).map(j => {
                const details = j.details || [];
                const kasDebit = details.find(d => parseFloat(d.debit) > 0 && this._kasAccounts.some(ka => ka.id == d.akun_id));
                const kasKredit = details.find(d => parseFloat(d.kredit) > 0 && this._kasAccounts.some(ka => ka.id == d.akun_id));

                let tipe = 'umum'; // 'masuk' | 'keluar' | 'transfer' | 'umum'
                let akunKas = null;
                let akunLawan = null;
                let jumlah = parseFloat(j.total_debit) || 0;

                if (kasDebit && kasKredit) {
                    // Kas ke Kas (Pindah Buku / Mutasi Bank)
                    tipe = 'transfer';
                    akunKas = kasDebit.akun_nama;
                    akunLawan = kasKredit.akun_nama;
                    jumlah = parseFloat(kasDebit.debit);
                    countTransfer++;
                } else if (kasDebit) {
                    tipe = 'masuk';
                    const lawan = details.find(d => d.id !== kasDebit.id) || {};
                    akunKas = kasDebit.akun_nama;
                    akunLawan = lawan.akun_nama || 'Pendapatan / Lain-lain';
                    jumlah = parseFloat(kasDebit.debit);
                    totalMasuk += jumlah;
                    countMasuk++;
                } else if (kasKredit) {
                    tipe = 'keluar';
                    const lawan = details.find(d => d.id !== kasKredit.id) || {};
                    akunKas = kasKredit.akun_nama;
                    akunLawan = lawan.akun_nama || 'Beban / Pengeluaran';
                    jumlah = parseFloat(kasKredit.kredit);
                    totalKeluar += jumlah;
                    countKeluar++;
                } else {
                    tipe = 'umum';
                    const mainDebit = details.find(d => parseFloat(d.debit) > 0) || {};
                    const mainKredit = details.find(d => parseFloat(d.kredit) > 0) || {};
                    akunKas = mainKredit.akun_nama || '-';
                    akunLawan = mainDebit.akun_nama || '-';
                }

                // Clean description of prefix tag if present
                let cleanKeterangan = (j.keterangan || '').replace(/^\[(KAS MASUK|KAS KELUAR|MUTASI KAS)\]\s*/i, '');

                return {
                    id: j.id,
                    no_bukti: j.no_bukti,
                    tgl_transaksi: j.tgl_transaksi,
                    tipe,
                    akun_kas: akunKas,
                    akun_lawan: akunLawan,
                    keterangan_raw: j.keterangan,
                    keterangan: cleanKeterangan,
                    jumlah,
                    created_at: j.created_at,
                    created_by_nama: j.created_by_nama || 'Staff Koperasi',
                    details
                };
            });

            this._cachedData = parsedList;
            this._stats = {
                masuk: totalMasuk,
                keluar: totalKeluar,
                net: totalMasuk - totalKeluar,
                countMasuk,
                countKeluar,
                countTransfer,
                totalTrx: parsedList.length,
                totalVolume: totalMasuk + totalKeluar
            };

            // Update stats cards
            const statsContainer = document.getElementById('kas-stats-container');
            if (statsContainer) {
                statsContainer.innerHTML = this._renderStatsHtml();
            }

            // Update tab badges in filter bar
            const tabAll = document.getElementById('tab-count-all');
            const tabMasuk = document.getElementById('tab-count-masuk');
            const tabKeluar = document.getElementById('tab-count-keluar');
            const tabTransfer = document.getElementById('tab-count-transfer');
            if (tabAll) tabAll.textContent = this._stats.totalTrx;
            if (tabMasuk) tabMasuk.textContent = this._stats.countMasuk;
            if (tabKeluar) tabKeluar.textContent = this._stats.countKeluar;
            if (tabTransfer) tabTransfer.textContent = this._stats.countTransfer;

            this._renderFilteredList();

        } catch (err) {
            console.error('Error loading kas list:', err);
            if (listContainer) {
                listContainer.innerHTML = `
                    <div class="text-center py-16 text-rose-500">
                        <i class="ri-error-warning-line text-4xl mb-2 inline-block"></i>
                        <p class="text-sm font-semibold">Gagal memuat transaksi: ${err.message || 'Terjadi galat jaringan'}</p>
                    </div>
                `;
            }
        }
    },

    _renderFilteredList() {
        const listContainer = document.getElementById('kas-list-container');
        if (!listContainer) return;

        let filtered = this._cachedData;

        // Filter by tab
        if (this._activeTab === 'masuk') {
            filtered = filtered.filter(t => t.tipe === 'masuk');
        } else if (this._activeTab === 'keluar') {
            filtered = filtered.filter(t => t.tipe === 'keluar');
        } else if (this._activeTab === 'transfer') {
            filtered = filtered.filter(t => t.tipe === 'transfer');
        }

        // Filter by selected Kas Account
        if (this._selectedKasId) {
            filtered = filtered.filter(t => 
                (t.details || []).some(d => d.akun_id == this._selectedKasId)
            );
        }

        if (filtered.length === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-16 px-4 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    <div class="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-3xl mx-auto mb-3">
                        <i class="ri-inbox-2-line"></i>
                    </div>
                    <h4 class="text-base font-bold text-gray-700">Tidak ada transaksi kas</h4>
                    <p class="text-xs text-gray-400 max-w-sm mx-auto mt-1 mb-4">
                        Tidak ditemukan transaksi kas masuk atau kas keluar untuk kriteria filter dan periode ini.
                    </p>
                    <div class="flex items-center justify-center gap-2">
                        <button onclick="KasTransaksiPage.form('masuk')" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs">
                            + Input Kas Masuk
                        </button>
                        <button onclick="KasTransaksiPage.form('keluar')" class="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs">
                            - Input Kas Keluar
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = `
            <div class="space-y-3">
                ${filtered.map(t => {
                    const isExpanded = this._expandedRows.has(t.id);
                    
                    // Theme config based on transaction type
                    let badgeBg = 'bg-gray-100 text-gray-700 border-gray-200';
                    let badgeText = 'Jurnal Umum';
                    let badgeIcon = 'ri-file-text-line';
                    let amountClass = 'text-gray-800';
                    let amountPrefix = '';
                    let flowIndicator = '';

                    if (t.tipe === 'masuk') {
                        badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                        badgeText = 'Kas Masuk';
                        badgeIcon = 'ri-arrow-down-circle-line';
                        amountClass = 'text-emerald-600';
                        amountPrefix = '+ ';
                        flowIndicator = `
                            <div class="flex items-center gap-1.5 text-xs">
                                <span class="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-semibold truncate max-w-[130px]" title="${t.akun_lawan}">
                                    ${t.akun_lawan}
                                </span>
                                <i class="ri-arrow-right-line text-emerald-500 font-bold"></i>
                                <span class="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 font-bold border border-emerald-100 truncate max-w-[140px]" title="${t.akun_kas}">
                                    ${t.akun_kas}
                                </span>
                            </div>
                        `;
                    } else if (t.tipe === 'keluar') {
                        badgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
                        badgeText = 'Kas Keluar';
                        badgeIcon = 'ri-arrow-up-circle-line';
                        amountClass = 'text-rose-600';
                        amountPrefix = '- ';
                        flowIndicator = `
                            <div class="flex items-center gap-1.5 text-xs">
                                <span class="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 font-bold border border-rose-100 truncate max-w-[140px]" title="${t.akun_kas}">
                                    ${t.akun_kas}
                                </span>
                                <i class="ri-arrow-right-line text-rose-500 font-bold"></i>
                                <span class="px-2 py-0.5 rounded-lg bg-gray-100 text-gray-700 font-semibold truncate max-w-[130px]" title="${t.akun_lawan}">
                                    ${t.akun_lawan}
                                </span>
                            </div>
                        `;
                    } else if (t.tipe === 'transfer') {
                        badgeBg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                        badgeText = 'Mutasi Kas';
                        badgeIcon = 'ri-exchange-line';
                        amountClass = 'text-indigo-600';
                        amountPrefix = '⇄ ';
                        flowIndicator = `
                            <div class="flex items-center gap-1.5 text-xs">
                                <span class="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100 truncate max-w-[130px]" title="${t.akun_lawan}">
                                    ${t.akun_lawan}
                                </span>
                                <i class="ri-arrow-right-line text-indigo-500 font-bold"></i>
                                <span class="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-bold border border-indigo-100 truncate max-w-[130px]" title="${t.akun_kas}">
                                    ${t.akun_kas}
                                </span>
                            </div>
                        `;
                    }

                    return `
                        <div class="border border-gray-100 rounded-2xl overflow-hidden hover:border-primary-200 hover:shadow-md transition-all duration-200 bg-white group">
                            <!-- Card Main Row -->
                            <div class="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none bg-white hover:bg-slate-50/60 transition-colors" 
                                onclick="KasTransaksiPage.toggleRowDetails(${t.id})">
                                
                                <!-- Left section: Identity, flow, and note -->
                                <div class="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                                    <!-- Expand arrow icon -->
                                    <button class="w-8 h-8 rounded-xl bg-gray-50 group-hover:bg-primary-50 flex items-center justify-center text-gray-400 group-hover:text-primary-600 transition-colors shrink-0 mt-0.5 sm:mt-0" title="Klik untuk rincian jurnal">
                                        <i class="ri-arrow-right-s-line text-lg transition-transform duration-200 ${isExpanded ? 'rotate-90 text-primary-600' : ''}" id="kas-arrow-${t.id}"></i>
                                    </button>

                                    <!-- Transaction Type Pill & No. Bukti -->
                                    <div class="flex flex-col gap-1 shrink-0 min-w-[145px]">
                                        <div class="flex items-center gap-1.5">
                                            <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border tracking-wider ${badgeBg}">
                                                <i class="${badgeIcon}"></i> ${badgeText}
                                            </span>
                                        </div>
                                        <div class="flex items-center gap-1.5">
                                            <span class="font-mono text-xs font-black text-gray-800 tracking-tight" title="Klik untuk salin no bukti" onclick="event.stopPropagation();navigator.clipboard.writeText('${t.no_bukti}');App.toast('No. Bukti disalin', 'info', 1500);">
                                                ${t.no_bukti}
                                            </span>
                                            <span class="text-[10px] text-gray-400">·</span>
                                            <span class="text-[11px] text-gray-500 font-medium">
                                                ${App.formatDate(t.tgl_transaksi)}
                                            </span>
                                        </div>
                                    </div>

                                    <!-- Account Flow Visualization -->
                                    <div class="hidden xl:flex flex-col shrink-0 min-w-[270px]">
                                        <span class="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5">Alur Kas</span>
                                        ${flowIndicator || `<span class="text-xs text-gray-500 font-medium">-</span>`}
                                    </div>

                                    <!-- Description & Operator -->
                                    <div class="flex-1 min-w-0 pl-1">
                                        <p class="text-sm font-semibold text-gray-800 truncate" title="${t.keterangan || '-'}">
                                            ${t.keterangan || '-'}
                                        </p>
                                        <div class="flex items-center gap-3 text-[11px] text-gray-400 mt-1">
                                            <span class="flex items-center gap-1">
                                                <i class="ri-user-smile-line text-gray-400"></i> ${t.created_by_nama}
                                            </span>
                                            ${t.created_at ? `
                                                <span class="flex items-center gap-1">
                                                    <i class="ri-time-line"></i> ${moment(t.created_at).format('HH:mm')} WIB
                                                </span>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>

                                <!-- Right section: Amount & Action buttons -->
                                <div class="flex items-center justify-between lg:justify-end gap-3.5 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100" onclick="event.stopPropagation()">
                                    <!-- Amount -->
                                    <div class="text-right">
                                        <div class="font-mono text-base sm:text-lg font-black tracking-tight ${amountClass}">
                                            ${amountPrefix}${App.formatRupiah(t.jumlah)}
                                        </div>
                                        <span class="text-[10px] text-gray-400 block -mt-0.5">Nominal Transaksi</span>
                                    </div>

                                    <!-- Action Buttons -->
                                    <div class="flex items-center gap-1.5 pl-2 border-l border-gray-100">
                                        <!-- Cetak Bukti Kas / Kuitansi -->
                                        <button onclick="KasTransaksiPage.previewBukti(${t.id})" 
                                            class="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" 
                                            title="Cetak Bukti Kas / Voucher Resmi">
                                            <i class="ri-printer-line text-base"></i>
                                        </button>

                                        <!-- Audit Trail -->
                                        <button onclick="App.showAuditHistory('jurnal', ${t.id})" 
                                            class="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all" 
                                            title="Riwayat Audit Perubahan">
                                            <i class="ri-history-line text-base"></i>
                                        </button>

                                        <!-- Reversal Transaction -->
                                        <button onclick="KasTransaksiPage.confirmReverse(${t.id}, '${t.no_bukti}')" 
                                            class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" 
                                            title="Batalkan / Reversal Jurnal Ini">
                                            <i class="ri-arrow-go-back-line text-base"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Expandable Double-Entry Ledger Details -->
                            <div id="kas-details-${t.id}" class="${isExpanded ? '' : 'hidden'} border-t border-gray-100 bg-slate-50/50 p-4 sm:p-6 transition-all animate-fadeIn">
                                <div class="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
                                    <div class="bg-gray-50/80 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
                                        <div class="flex items-center gap-2">
                                            <i class="ri-book-read-line text-indigo-600 text-sm"></i>
                                            <span class="text-xs font-bold text-gray-700">Rincian Jurnal Umum (Double-Entry Postings)</span>
                                        </div>
                                        <span class="font-mono text-xs font-bold text-gray-500">${t.no_bukti}</span>
                                    </div>

                                    <div class="overflow-x-auto">
                                        <table class="w-full text-xs">
                                            <thead>
                                                <tr class="bg-gray-50/50 text-gray-500 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider">
                                                    <th class="px-4 py-2.5 text-left">Kode & Nama Akun Akuntansi</th>
                                                    <th class="px-4 py-2.5 text-left">Keterangan Baris</th>
                                                    <th class="px-4 py-2.5 text-right w-32">Debit (Rp)</th>
                                                    <th class="px-4 py-2.5 text-right w-32">Kredit (Rp)</th>
                                                </tr>
                                            </thead>
                                            <tbody class="divide-y divide-gray-50">
                                                ${(t.details || []).map(d => `
                                                    <tr class="hover:bg-primary-50/20 transition-colors">
                                                        <td class="px-4 py-2.5">
                                                            <div class="font-bold text-gray-800">${d.akun_nama}</div>
                                                            <div class="font-mono text-[10px] text-gray-400">${d.akun_kode}</div>
                                                        </td>
                                                        <td class="px-4 py-2.5 text-gray-500 italic">
                                                            ${d.keterangan || '-'}
                                                        </td>
                                                        <td class="px-4 py-2.5 text-right font-mono font-bold ${d.debit > 0 ? 'text-emerald-600' : 'text-gray-300'}">
                                                            ${d.debit > 0 ? App.formatRupiah(d.debit) : '-'}
                                                        </td>
                                                        <td class="px-4 py-2.5 text-right font-mono font-bold ${d.kredit > 0 ? 'text-rose-600' : 'text-gray-300'}">
                                                            ${d.kredit > 0 ? App.formatRupiah(d.kredit) : '-'}
                                                        </td>
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                    
                                    <div class="p-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                                        <span>Total Posting Seimbang: <strong class="font-mono text-gray-800">${App.formatRupiah(t.jumlah)}</strong></span>
                                        <button onclick="KasTransaksiPage.previewBukti(${t.id})" class="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1">
                                            <i class="ri-printer-line"></i> Cetak Bukti Dokumen
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>

            <!-- Pagination info if available -->
            ${this._pagination ? `
                <div class="mt-6 pt-4 border-t border-gray-100">
                    ${App.renderPagination(this._pagination, 'KasTransaksiPage.paginate')}
                </div>
            ` : ''}
        `;
    },

    toggleRowDetails(id) {
        const detailEl = document.getElementById(`kas-details-${id}`);
        const arrowEl = document.getElementById(`kas-arrow-${id}`);
        if (!detailEl) return;

        if (detailEl.classList.contains('hidden')) {
            detailEl.classList.remove('hidden');
            if (arrowEl) arrowEl.classList.add('rotate-90', 'text-primary-600');
            this._expandedRows.add(id);
        } else {
            detailEl.classList.add('hidden');
            if (arrowEl) arrowEl.classList.remove('rotate-90', 'text-primary-600');
            this._expandedRows.delete(id);
        }
    },

    paginate(p) {
        this.page = p;
        this.loadList();
    },

    // ===== Reversal Transaksi =====
    async confirmReverse(id, code) {
        const ok = await App.confirm(
            'Reversal Transaksi Kas',
            `Apakah Anda yakin ingin membatalkan/mereversal transaksi kas ${code}?\n\nSistem akan membuat jurnal pembalik secara otomatis untuk menjaga integritas saldo buku besar.`,
            'warning'
        );
        if (!ok) return;

        try {
            const res = await App.api('keuangan/jurnal/reverse', {
                method: 'POST',
                body: { id }
            });

            if (res?.success) {
                App.toast(res.message || 'Transaksi berhasil direversal', 'success');
                this.loadList();
            } else {
                App.toast(res?.message || 'Gagal membatalkan transaksi kas', 'error');
            }
        } catch (err) {
            App.toast('Terjadi kesalahan: ' + (err.message || 'Gagal menghubungi server'), 'error');
        }
    },

    // ===== Preview & Cetak Bukti Kas Resmi (Voucher / Kuitansi BKM / BKK) =====
    async previewBukti(id) {
        const trx = this._cachedData.find(t => t.id == id);
        if (!trx) {
            App.toast('Data transaksi tidak ditemukan', 'error');
            return;
        }

        const kopName = App.settings['nama_koperasi']?.value || 'KOPERASI SIMPAN PINJAM';
        const kopAddress = App.settings['alamat_koperasi']?.value || 'Alamat Koperasi';
        const kopPhone = App.settings['telepon_koperasi']?.value || App.settings['no_hp']?.value || '';

        let voucherTitle = 'BUKTI KAS MASUK (BKM)';
        let voucherTheme = 'emerald';
        let contactLabel = 'Diterima Dari';

        if (trx.tipe === 'keluar') {
            voucherTitle = 'BUKTI KAS KELUAR (BKK)';
            voucherTheme = 'rose';
            contactLabel = 'Dibayarkan Kepada';
        } else if (trx.tipe === 'transfer') {
            voucherTitle = 'BUKTI MUTASI KAS (BMK)';
            voucherTheme = 'indigo';
            contactLabel = 'Penyetor / Rekening Asal';
        }

        const terbilangStr = this.terbilang(trx.jumlah);
        const isReversed = (trx.keterangan || '').includes('REVERSAL') || trx.status === 'batal';

        App.openModal(`
            <div class="p-6 max-w-2xl mx-auto space-y-6">
                <!-- Action Bar -->
                <div class="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-xl bg-${voucherTheme}-50 text-${voucherTheme}-600 flex items-center justify-center text-lg">
                            <i class="ri-printer-line"></i>
                        </span>
                        <div>
                            <h3 class="text-base font-extrabold text-gray-900">Voucher Bukti Kas</h3>
                            <p class="text-xs text-gray-400">Pratinjau dokumen resmi sebelum dicetak</p>
                        </div>
                    </div>
                    
                    <div class="flex items-center gap-2">
                        <button onclick="KasTransaksiPage.printVoucherDirect(${trx.id})" 
                            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-500/20 transition-all active:scale-95">
                            <i class="ri-printer-line text-sm"></i> Cetak Dokumen
                        </button>
                        <button onclick="App.closeModal()" 
                            class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                            <i class="ri-close-line text-xl"></i>
                        </button>
                    </div>
                </div>

                <!-- Printable Paper Container (Sleek Voucher Design) -->
                <div id="voucher-printable-area" class="bg-white border border-gray-300 rounded-2xl p-6 sm:p-8 shadow-xs text-gray-900 font-sans space-y-5 relative">
                    <!-- Rubber Stamp on Paper -->
                    <div class="absolute right-6 sm:right-14 top-24 sm:top-20 z-10 pointer-events-none select-none">
                        ${isReversed ? 
                            App.renderRubberStamp({ type: 'reversed', size: 'md', title: 'DIBATALKAN', sub: 'KOREKSI JURNAL' }) :
                            App.renderRubberStamp({ type: 'verified', size: 'sm', title: 'TERVERIFIKASI', sub: 'PEMBUKUAN SAH' })
                        }
                    </div>

                    <!-- Header Koperasi -->
                    <div class="flex items-center justify-between border-b-2 border-gray-800 pb-4">
                        <div>
                            <h4 class="text-lg font-black uppercase tracking-tight text-gray-900">${kopName}</h4>
                            <p class="text-xs text-gray-600 mt-0.5">${kopAddress} ${kopPhone ? '· Telp: ' + kopPhone : ''}</p>
                        </div>
                        <div class="text-right">
                            <span class="inline-block px-3 py-1 bg-gray-900 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-md">
                                ${voucherTitle}
                            </span>
                            <div class="font-mono text-xs font-bold text-gray-700 mt-1">No: ${trx.no_bukti}</div>
                        </div>
                    </div>

                    <!-- Meta Information Grid -->
                    <div class="grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <span class="text-gray-500 block text-[10px] uppercase font-bold">Tanggal Transaksi</span>
                            <span class="font-semibold text-gray-800">${App.formatDate(trx.tgl_transaksi)}</span>
                        </div>
                        <div>
                            <span class="text-gray-500 block text-[10px] uppercase font-bold">${contactLabel}</span>
                            <span class="font-bold text-gray-900">${trx.akun_lawan || '-'}</span>
                        </div>
                        <div class="col-span-2">
                            <span class="text-gray-500 block text-[10px] uppercase font-bold">Keterangan / Keperluan</span>
                            <span class="font-medium text-gray-800">${trx.keterangan || '-'}</span>
                        </div>
                        <div class="col-span-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
                            <div class="flex items-baseline justify-between">
                                <span class="text-[11px] font-bold uppercase text-gray-500">Jumlah Uang:</span>
                                <span class="font-mono text-xl font-black text-gray-900">${App.formatRupiah(trx.jumlah)}</span>
                            </div>
                            <div class="mt-1 pt-1 border-t border-gray-200/80 text-xs italic text-gray-600">
                                <strong>Terbilang:</strong> ${terbilangStr}
                            </div>
                        </div>
                    </div>

                    <!-- Journal Distribution Table -->
                    <div class="pt-2">
                        <span class="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-2">Rincian Pos Akuntansi:</span>
                        <table class="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                            <thead>
                                <tr class="bg-gray-100 text-gray-700 text-left text-[10px] font-bold uppercase">
                                    <th class="px-3 py-2">Kode Akun</th>
                                    <th class="px-3 py-2">Nama Akun</th>
                                    <th class="px-3 py-2 text-right">Debit (Rp)</th>
                                    <th class="px-3 py-2 text-right">Kredit (Rp)</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100">
                                ${(trx.details || []).map(d => `
                                    <tr>
                                        <td class="px-3 py-1.5 font-mono text-gray-600">${d.akun_kode}</td>
                                        <td class="px-3 py-1.5 font-semibold text-gray-800">${d.akun_nama}</td>
                                        <td class="px-3 py-1.5 text-right font-mono font-bold">${d.debit > 0 ? App.formatRupiah(d.debit) : '-'}</td>
                                        <td class="px-3 py-1.5 text-right font-mono font-bold">${d.kredit > 0 ? App.formatRupiah(d.kredit) : '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <!-- Signatures Grid -->
                    <div class="pt-6 grid grid-cols-4 gap-2 text-center text-xs">
                        <div class="flex flex-col justify-between h-24 border border-gray-100 rounded-xl p-2 bg-gray-50/50">
                            <span class="text-[10px] font-bold text-gray-500 uppercase">Menyetujui</span>
                            <span class="border-b border-gray-300 w-3/4 mx-auto pb-0.5 font-semibold text-gray-700">( Pengurus )</span>
                        </div>
                        <div class="flex flex-col justify-between h-24 border border-gray-100 rounded-xl p-2 bg-gray-50/50">
                            <span class="text-[10px] font-bold text-gray-500 uppercase">Akuntansi</span>
                            <span class="border-b border-gray-300 w-3/4 mx-auto pb-0.5 font-semibold text-gray-700">( Pembukuan )</span>
                        </div>
                        <div class="flex flex-col justify-between h-24 border border-gray-100 rounded-xl p-2 bg-gray-50/50">
                            <span class="text-[10px] font-bold text-gray-500 uppercase">Kasir / Bendahara</span>
                            <span class="border-b border-gray-300 w-3/4 mx-auto pb-0.5 font-semibold text-gray-700">(${trx.created_by_nama || 'Kasir'})</span>
                        </div>
                        <div class="flex flex-col justify-between h-24 border border-gray-100 rounded-xl p-2 bg-gray-50/50">
                            <span class="text-[10px] font-bold text-gray-500 uppercase">${trx.tipe === 'masuk' ? 'Penyetor' : 'Penerima'}</span>
                            <span class="border-b border-gray-300 w-3/4 mx-auto pb-0.5 font-semibold text-gray-700">( .................... )</span>
                        </div>
                    </div>
                </div>
            </div>
        `, 'max-w-2xl');
    },

    // ===== Print Direct to Iframe (No Popups Blocked) =====
    printVoucherDirect(id) {
        const trx = this._cachedData.find(t => t.id == id);
        if (!trx) return;

        const kopName = App.settings['nama_koperasi']?.value || 'KOPERASI SIMPAN PINJAM';
        const kopAddress = App.settings['alamat_koperasi']?.value || 'Alamat Koperasi';
        const kopPhone = App.settings['telepon_koperasi']?.value || '';

        let voucherTitle = 'BUKTI KAS MASUK (BKM)';
        let contactLabel = 'Diterima Dari';

        if (trx.tipe === 'keluar') {
            voucherTitle = 'BUKTI KAS KELUAR (BKK)';
            contactLabel = 'Dibayarkan Kepada';
        } else if (trx.tipe === 'transfer') {
            voucherTitle = 'BUKTI MUTASI KAS (BMK)';
            contactLabel = 'Penyetor / Rekening Asal';
        }

        const terbilangStr = this.terbilang(trx.jumlah);
        const isRev = (trx.keterangan || '').includes('REVERSAL') || trx.status === 'batal';

        let printFrame = document.getElementById('kas-print-frame');
        if (!printFrame) {
            printFrame = document.createElement('iframe');
            printFrame.id = 'kas-print-frame';
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
                <title>${voucherTitle} - ${trx.no_bukti}</title>
                <style>
                    @media print {
                        @page { margin: 10mm; size: auto; }
                        body { margin: 0; }
                    }
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        color: #111;
                        padding: 10px;
                        background: #fff;
                        font-size: 11px;
                        line-height: 1.4;
                        position: relative;
                    }
                    .header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-start; }
                    .header h2 { margin: 0; font-size: 15px; font-weight: 800; text-transform: uppercase; }
                    .header p { margin: 2px 0 0 0; font-size: 10px; color: #444; }
                    .badge { border: 1px solid #000; padding: 3px 8px; font-weight: bold; font-size: 11px; text-transform: uppercase; display: inline-block; }
                    .stamp-box { position: absolute; right: 25px; top: 62px; border: 2.5px solid ${isRev ? '#dc2626' : '#059669'}; outline: 1.5px dashed ${isRev ? '#dc2626' : '#059669'}; outline-offset: -4px; color: ${isRev ? '#dc2626' : '#059669'}; padding: 3px 10px; font-size: 11px; font-weight: 900; font-family: monospace; letter-spacing: 2px; transform: rotate(-9deg); text-transform: uppercase; text-align: center; border-radius: 4px; background: #fff; }
                    .stamp-box .stamp-sub { font-size: 7px; display: block; letter-spacing: 1.5px; opacity: 0.85; }
                    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
                    .meta-table td { padding: 3px 0; vertical-align: top; }
                    .box-amount { background: #f5f5f5; border: 1px solid #ccc; padding: 8px 12px; margin-bottom: 12px; }
                    .amount-val { font-size: 16px; font-weight: bold; font-family: monospace; }
                    .table-ledger { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
                    .table-ledger th, .table-ledger td { border: 1px solid #ccc; padding: 5px 8px; }
                    .table-ledger th { background: #eee; font-weight: bold; text-align: left; }
                    .text-right { text-align: right; }
                    .sig-container { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
                    .sig-box { width: 22%; font-size: 10px; }
                    .sig-line { margin-top: 50px; border-top: 1px solid #333; padding-top: 3px; font-weight: 600; }
                </style>
            </head>
            <body>
                <div class="stamp-box">
                    ${isRev ? 'DIBATALKAN<span class="stamp-sub">REVERSED</span>' : 'TERVERIFIKASI<span class="stamp-sub">KOPERASI SAH</span>'}
                </div>
                <div class="header">
                    <div>
                        <h2>${kopName}</h2>
                        <p>${kopAddress} ${kopPhone ? '· ' + kopPhone : ''}</p>
                    </div>
                    <div style="text-align:right;">
                        <span class="badge">${voucherTitle}</span>
                        <div style="font-weight:bold; font-family:monospace; margin-top:3px;">No: ${trx.no_bukti}</div>
                    </div>
                </div>

                <table class="meta-table">
                    <tr>
                        <td style="width:20%; color:#555;">Tanggal:</td>
                        <td style="width:30%; font-weight:bold;">${App.formatDate(trx.tgl_transaksi)}</td>
                        <td style="width:20%; color:#555;">${contactLabel}:</td>
                        <td style="width:30%; font-weight:bold;">${trx.akun_lawan || '-'}</td>
                    </tr>
                    <tr>
                        <td style="color:#555;">Keterangan:</td>
                        <td colspan="3">${trx.keterangan || '-'}</td>
                    </tr>
                </table>

                <div class="box-amount">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span>Jumlah Uang:</span>
                        <span class="amount-val">${App.formatRupiah(trx.jumlah)}</span>
                    </div>
                    <div style="font-style:italic; font-size:10px; margin-top:4px; border-top:1px dashed #ccc; padding-top:4px;">
                        Terbilang: ${terbilangStr}
                    </div>
                </div>

                <div style="font-weight:bold; font-size:10px; text-transform:uppercase; margin-top:10px;">Rincian Pos Jurnal:</div>
                <table class="table-ledger">
                    <thead>
                        <tr>
                            <th>Kode Akun</th>
                            <th>Nama Akun</th>
                            <th class="text-right">Debit (Rp)</th>
                            <th class="text-right">Kredit (Rp)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(trx.details || []).map(d => `
                            <tr>
                                <td style="font-family:monospace;">${d.akun_kode}</td>
                                <td>${d.akun_nama}</td>
                                <td class="text-right" style="font-family:monospace; font-weight:bold;">${d.debit > 0 ? App.formatRupiah(d.debit) : '-'}</td>
                                <td class="text-right" style="font-family:monospace; font-weight:bold;">${d.kredit > 0 ? App.formatRupiah(d.kredit) : '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="sig-container">
                    <div class="sig-box">
                        <div>Menyetujui</div>
                        <div class="sig-line">Pengurus</div>
                    </div>
                    <div class="sig-box">
                        <div>Akuntansi</div>
                        <div class="sig-line">Pembukuan</div>
                    </div>
                    <div class="sig-box">
                        <div>Kasir / Bendahara</div>
                        <div class="sig-line">${trx.created_by_nama || 'Kasir'}</div>
                    </div>
                    <div class="sig-box">
                        <div>${trx.tipe === 'masuk' ? 'Penyetor' : 'Penerima'}</div>
                        <div class="sig-line">Tanda Tangan</div>
                    </div>
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

    // ===== Modal Form Input Kas Masuk, Kas Keluar, dan Mutasi Kas =====
    form(type = 'masuk') {
        let title = 'Input Kas Masuk (Penerimaan)';
        let subtitle = 'Mencatat uang masuk ke kas/bank (Penerimaan operasional/pendapatan)';
        let accent = 'emerald';
        let icon = 'ri-arrow-down-circle-fill';

        if (type === 'keluar') {
            title = 'Input Kas Keluar (Pengeluaran)';
            subtitle = 'Mencatat pengeluaran uang dari kas/bank (Biaya operasional/beban)';
            accent = 'rose';
            icon = 'ri-arrow-up-circle-fill';
        } else if (type === 'transfer') {
            title = 'Mutasi Kas / Pindah Buku Antar Bank';
            subtitle = 'Memindahkan saldo antara kas tunai dan rekening bank koperasi';
            accent = 'indigo';
            icon = 'ri-exchange-fill';
        }

        App.openModal(`
            <div class="p-6 sm:p-7 w-full space-y-6">
                <!-- Modal Header -->
                <div class="flex items-center justify-between pb-4 border-b border-gray-100">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-${accent}-50 text-${accent}-600 flex items-center justify-center text-2xl shrink-0 border border-${accent}-100">
                            <i class="${icon}"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-black text-gray-900 tracking-tight">${title}</h3>
                            <p class="text-xs text-gray-500">${subtitle}</p>
                        </div>
                    </div>
                    <button type="button" onclick="App.closeModal()" class="text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors">
                        <i class="ri-close-line text-xl"></i>
                    </button>
                </div>

                <form id="form-kas-input" class="space-y-4.5">
                    <!-- Row 1: Tanggal Transaksi & Nominal Rupiah -->
                    <div class="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
                        <div class="sm:col-span-5">
                            <label class="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                                Tanggal Transaksi <span class="text-rose-500">*</span>
                            </label>
                            <input type="date" id="kf-tanggal" value="${App.todayISO()}" required
                                class="w-full border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-gray-800 bg-white focus:ring-2 focus:ring-${accent}-500 focus:border-transparent transition-all">
                        </div>

                        <div class="sm:col-span-7">
                            <label class="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                                Nominal Rupiah (Rp) <span class="text-rose-500">*</span>
                            </label>
                            <div class="relative">
                                <span class="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-gray-400">Rp</span>
                                <input type="number" id="kf-nominal" placeholder="0" min="1" step="any" required
                                    oninput="KasTransaksiPage._updateLiveFormPreview('${type}')"
                                    class="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 rounded-2xl text-base font-black text-gray-900 font-mono focus:ring-2 focus:ring-${accent}-500 focus:border-transparent transition-all">
                            </div>
                        </div>
                    </div>

                    <!-- Quick Amount Adder Chips -->
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Cepat:</span>
                        ${[50000, 100000, 500000, 1000000, 5000000, 10000000].map(amt => `
                            <button type="button" onclick="KasTransaksiPage._addQuickAmount(${amt}, '${type}')" 
                                class="px-2 py-0.8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold font-mono transition-all active:scale-95">
                                +${App.formatRupiah(amt).replace('Rp ', '')}
                            </button>
                        `).join('')}
                    </div>

                    <!-- Terbilang Live Banner -->
                    <div id="kf-terbilang-box" class="p-2.5 rounded-xl bg-gray-50 border border-gray-200/60 text-xs text-gray-600 italic">
                        <strong>Terbilang:</strong> <span id="kf-terbilang-text">Nol Rupiah</span>
                    </div>

                    <!-- Row 2: Akun Kas & Akun Lawan -->
                    <div class="space-y-4">
                        ${type === 'transfer' ? `
                            <!-- Mutasi Kas Antar Bank -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                <div>
                                    <label class="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                                        Dari Rekening (Kas Keluar) <span class="text-rose-500">*</span>
                                    </label>
                                    <select id="kf-kas-id" required onchange="KasTransaksiPage._updateLiveFormPreview('${type}')"
                                        data-icon="ri-bank-card-line" data-search-placeholder="Cari kode atau nama rekening kas..."
                                        class="searchable-select w-full border border-gray-200 rounded-2xl p-2.5 text-xs sm:text-sm font-semibold text-gray-800 bg-white">
                                        <option value="">Pilih Rekening Asal...</option>
                                        ${this._kasAccounts.map(a => `<option value="${a.id}">${a.kode} - ${a.nama}</option>`).join('')}
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                                        Ke Rekening (Kas Masuk) <span class="text-rose-500">*</span>
                                    </label>
                                    <select id="kf-target-id" required onchange="KasTransaksiPage._updateLiveFormPreview('${type}')"
                                        data-icon="ri-bank-card-line" data-search-placeholder="Cari kode atau nama rekening tujuan..."
                                        class="searchable-select w-full border border-gray-200 rounded-2xl p-2.5 text-xs sm:text-sm font-semibold text-gray-800 bg-white">
                                        <option value="">Pilih Rekening Tujuan...</option>
                                        ${this._kasAccounts.map(a => `<option value="${a.id}">${a.kode} - ${a.nama}</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                        ` : `
                            <!-- Kas Masuk / Kas Keluar Normal -->
                            <div class="space-y-4">
                                <div>
                                    <label class="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                                        Rekening Kas / Bank (${type === 'masuk' ? 'Kas/Bank Penerima' : 'Kas/Bank Pembayar'}) <span class="text-rose-500">*</span>
                                    </label>
                                    <select id="kf-kas-id" required onchange="KasTransaksiPage._updateLiveFormPreview('${type}')"
                                        data-icon="ri-bank-card-line" data-search-placeholder="Cari kode atau nama kas/bank..."
                                        class="searchable-select w-full border border-gray-200 rounded-2xl p-2.5 text-xs sm:text-sm font-semibold text-gray-800 bg-white">
                                        <option value="">Pilih Kas/Bank...</option>
                                        ${this._kasAccounts.map(a => `<option value="${a.id}">${a.kode} - ${a.nama}</option>`).join('')}
                                    </select>
                                </div>

                                <div>
                                    <div class="flex items-center justify-between mb-1">
                                        <label class="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            ${type === 'masuk' ? 'Akun Lawan / Sumber Dana (Kredit)' : 'Akun Lawan / Kategori Biaya & Beban (Debit)'} <span class="text-rose-500">*</span>
                                        </label>
                                        <span class="text-[10px] text-gray-400 font-medium">Ketik kode akun atau kata kunci keterangan</span>
                                    </div>
                                    <select id="kf-target-id" required onchange="KasTransaksiPage._updateLiveFormPreview('${type}')"
                                        data-icon="ri-exchange-funds-line" data-search-placeholder="Ketik kode (misal 5101) atau nama akun lawan..."
                                        class="searchable-select w-full border border-gray-200 rounded-2xl p-2.5 text-xs sm:text-sm font-semibold text-gray-800 bg-white">
                                        <option value="">Pilih Akun Lawan...</option>
                                        ${this._accounts.filter(a => !this._kasAccounts.some(ka => ka.id == a.id)).map(a => `
                                            <option value="${a.id}">${a.kode} - ${a.nama} (${a.tipe})</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>
                        `}
                    </div>

                    <!-- Keterangan Transaksi -->
                    <div>
                        <div class="flex items-center justify-between mb-1">
                            <label class="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                                Keterangan Transaksi <span class="text-rose-500">*</span>
                            </label>
                            <!-- Template suggestions -->
                            <div class="flex items-center gap-1">
                                ${type === 'masuk' ? `
                                    <button type="button" onclick="document.getElementById('kf-keterangan').value='Penerimaan Jasa Kemitraan';KasTransaksiPage._updateLiveFormPreview('${type}')" class="text-[10px] text-primary-600 hover:underline">Jasa</button>
                                    <span class="text-gray-300">·</span>
                                    <button type="button" onclick="document.getElementById('kf-keterangan').value='Penerimaan Pendapatan Lain-Lain';KasTransaksiPage._updateLiveFormPreview('${type}')" class="text-[10px] text-primary-600 hover:underline">Lain-lain</button>
                                ` : type === 'keluar' ? `
                                    <button type="button" onclick="document.getElementById('kf-keterangan').value='Biaya ATK dan Operasional Kantor';KasTransaksiPage._updateLiveFormPreview('${type}')" class="text-[10px] text-primary-600 hover:underline">ATK</button>
                                    <span class="text-gray-300">·</span>
                                    <button type="button" onclick="document.getElementById('kf-keterangan').value='Biaya Konsumsi Rapat Pengurus';KasTransaksiPage._updateLiveFormPreview('${type}')" class="text-[10px] text-primary-600 hover:underline">Konsumsi</button>
                                ` : `
                                    <button type="button" onclick="document.getElementById('kf-keterangan').value='Penyetoran Kas Tunai ke Rekening Bank';KasTransaksiPage._updateLiveFormPreview('${type}')" class="text-[10px] text-primary-600 hover:underline">Setor Tunai</button>
                                    <span class="text-gray-300">·</span>
                                    <button type="button" onclick="document.getElementById('kf-keterangan').value='Penarikan Tunai dari Bank untuk Kas Operasional';KasTransaksiPage._updateLiveFormPreview('${type}')" class="text-[10px] text-primary-600 hover:underline">Tarik Tunai</button>
                                `}
                            </div>
                        </div>
                        <textarea id="kf-keterangan" rows="2" required 
                            oninput="KasTransaksiPage._updateLiveFormPreview('${type}')"
                            class="w-full border border-gray-200 rounded-2xl px-3.5 py-2 text-xs sm:text-sm text-gray-800 bg-white focus:ring-2 focus:ring-${accent}-500 focus:border-transparent transition-all placeholder:text-gray-400"
                            placeholder="Tuliskan keterangan lengkap untuk keperluan audit pembukuan..."></textarea>
                    </div>

                    <!-- Live Journal Simulation Preview Box -->
                    <div class="rounded-2xl bg-gray-50/90 border border-gray-200/80 p-3.5 space-y-2">
                        <div class="flex items-center justify-between text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                            <span>Simulasi Posting Jurnal Otomatis</span>
                            <span class="text-emerald-600 font-semibold flex items-center gap-1">
                                <i class="ri-check-line"></i> Real-time Balance
                            </span>
                        </div>
                        <div id="kf-journal-preview" class="space-y-1.5 text-xs font-mono">
                            <div class="text-gray-400 italic">Pilih akun dan masukkan nominal untuk melihat pratinjau jurnal...</div>
                        </div>
                    </div>

                    <!-- Submit Actions -->
                    <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
                        <button type="button" onclick="App.closeModal()" 
                            class="px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl text-xs sm:text-sm transition-colors">
                            Batal
                        </button>

                        <button type="submit" id="btn-submit-kas" 
                            class="px-6 py-2.5 bg-gradient-to-r from-${accent}-600 to-${accent}-700 hover:from-${accent}-700 hover:to-${accent}-800 text-white font-bold rounded-xl text-xs sm:text-sm shadow-md shadow-${accent}-500/20 transition-all transform active:scale-95 cursor-pointer">
                            Simpan Transaksi
                        </button>
                    </div>
                </form>
            </div>
        `, 'max-w-2xl');

        // Form Submission Event
        const formEl = document.getElementById('form-kas-input');
        if (formEl) {
            formEl.onsubmit = async (e) => {
                e.preventDefault();
                const submitBtn = document.getElementById('btn-submit-kas');

                try {
                    const tgl = document.getElementById('kf-tanggal').value;
                    const nominal = parseFloat(document.getElementById('kf-nominal').value) || 0;
                    const kasAccId = document.getElementById('kf-kas-id').value;
                    const tarAccId = document.getElementById('kf-target-id').value;
                    const keterangan = (document.getElementById('kf-keterangan').value || '').trim();

                    if (!kasAccId) {
                        App.toast('Silakan pilih rekening kas / bank', 'warning');
                        return;
                    }
                    if (!tarAccId) {
                        App.toast('Silakan pilih akun lawan / akun tujuan', 'warning');
                        return;
                    }
                    if (kasAccId === tarAccId) {
                        App.toast('Rekening asal dan tujuan tidak boleh sama', 'warning');
                        return;
                    }
                    if (nominal <= 0) {
                        App.toast('Nominal harus lebih besar dari 0', 'warning');
                        return;
                    }

                    App.btnLoading(submitBtn);

                    // Build Double-Entry Journal Details
                    const details = [];
                    let prefixTag = '[KAS MASUK] ';

                    if (type === 'masuk') {
                        // Kas Masuk: Kas (Debit), Lawan (Kredit)
                        details.push({ akun_id: kasAccId, debit: nominal, kredit: 0, keterangan });
                        details.push({ akun_id: tarAccId, debit: 0, kredit: nominal, keterangan });
                        prefixTag = '[KAS MASUK] ';
                    } else if (type === 'keluar') {
                        // Kas Keluar: Lawan (Debit), Kas (Kredit)
                        details.push({ akun_id: tarAccId, debit: nominal, kredit: 0, keterangan });
                        details.push({ akun_id: kasAccId, debit: 0, kredit: nominal, keterangan });
                        prefixTag = '[KAS KELUAR] ';
                    } else if (type === 'transfer') {
                        // Mutasi: Rekening Tujuan (Debit), Rekening Asal (Kredit)
                        details.push({ akun_id: tarAccId, debit: nominal, kredit: 0, keterangan });
                        details.push({ akun_id: kasAccId, debit: 0, kredit: nominal, keterangan });
                        prefixTag = '[MUTASI KAS] ';
                    }

                    const body = {
                        tgl_transaksi: tgl,
                        keterangan: prefixTag + keterangan,
                        details
                    };

                    const r = await App.api('keuangan/jurnal', { method: 'POST', body });
                    if (r?.success) {
                        App.closeModal();
                        App.toast(`Berhasil mencatat ${title}`, 'success');
                        this.loadList();
                    } else {
                        App.toast(r?.message || 'Gagal menyimpan transaksi', 'error');
                        App.btnReset(submitBtn);
                    }
                } catch (err) {
                    console.error('Submit error kas-transaksi:', err);
                    App.toast('Terjadi kesalahan: ' + (err.message || 'Gagal menyimpan transaksi'), 'error');
                    App.btnReset(submitBtn);
                }
            };
        }
    },

    _addQuickAmount(amount, type) {
        const input = document.getElementById('kf-nominal');
        if (!input) return;
        const current = parseFloat(input.value) || 0;
        input.value = current + amount;
        this._updateLiveFormPreview(type);
    },

    _updateLiveFormPreview(type) {
        const nominalInput = document.getElementById('kf-nominal');
        const terbilangText = document.getElementById('kf-terbilang-text');
        const previewContainer = document.getElementById('kf-journal-preview');
        const kasSelect = document.getElementById('kf-kas-id');
        const tarSelect = document.getElementById('kf-target-id');

        const nominal = parseFloat(nominalInput?.value) || 0;
        if (terbilangText) {
            terbilangText.textContent = this.terbilang(nominal);
        }

        if (!previewContainer) return;

        const kasName = kasSelect?.options[kasSelect.selectedIndex]?.text || 'Rekening Kas';
        const tarName = tarSelect?.options[tarSelect.selectedIndex]?.text || 'Akun Lawan';

        if (nominal <= 0) {
            previewContainer.innerHTML = `<div class="text-gray-400 italic">Masukkan nominal untuk melihat simulasi jurnal...</div>`;
            return;
        }

        const formatted = App.formatRupiah(nominal);

        if (type === 'masuk') {
            previewContainer.innerHTML = `
                <div class="flex items-center justify-between text-emerald-700 bg-emerald-50/70 p-2 rounded-lg border border-emerald-100">
                    <span>(D) ${kasName}</span>
                    <span class="font-bold">${formatted}</span>
                </div>
                <div class="flex items-center justify-between text-gray-700 bg-white p-2 rounded-lg border border-gray-200 pl-6">
                    <span>(K) ${tarName}</span>
                    <span class="font-bold">${formatted}</span>
                </div>
            `;
        } else if (type === 'keluar') {
            previewContainer.innerHTML = `
                <div class="flex items-center justify-between text-gray-700 bg-white p-2 rounded-lg border border-gray-200">
                    <span>(D) ${tarName}</span>
                    <span class="font-bold">${formatted}</span>
                </div>
                <div class="flex items-center justify-between text-rose-700 bg-rose-50/70 p-2 rounded-lg border border-rose-100 pl-6">
                    <span>(K) ${kasName}</span>
                    <span class="font-bold">${formatted}</span>
                </div>
            `;
        } else if (type === 'transfer') {
            previewContainer.innerHTML = `
                <div class="flex items-center justify-between text-indigo-700 bg-indigo-50/70 p-2 rounded-lg border border-indigo-100">
                    <span>(D) Rekening Masuk: ${tarName}</span>
                    <span class="font-bold">${formatted}</span>
                </div>
                <div class="flex items-center justify-between text-gray-700 bg-white p-2 rounded-lg border border-gray-200 pl-6">
                    <span>(K) Rekening Asal: ${kasName}</span>
                    <span class="font-bold">${formatted}</span>
                </div>
            `;
        }
    },

    // ===== High-Performance Export (Without N+1 Requests) =====
    async export(type) {
        const search = document.getElementById('kas-search')?.value || '';
        const dari = document.getElementById('kas-filter-dari')?.value || App.firstDayOfMonthISO();
        const sampai = document.getElementById('kas-filter-sampai')?.value || App.todayISO();

        App.toast('Menyiapkan data ekspor...', 'info');

        try {
            const res = await App.api(`keuangan/jurnal?search=${encodeURIComponent(search)}&dari=${dari}&sampai=${sampai}&tipe=manual&per_page=1000`);
            if (!res?.success || !Array.isArray(res.data)) {
                App.toast('Gagal mengambil data untuk ekspor', 'error');
                return;
            }

            const rows = res.data.map(j => {
                const details = j.details || [];
                const kasDebit = details.find(d => parseFloat(d.debit) > 0 && this._kasAccounts.some(ka => ka.id == d.akun_id));
                const kasKredit = details.find(d => parseFloat(d.kredit) > 0 && this._kasAccounts.some(ka => ka.id == d.akun_id));

                let tipeTxt = 'Umum';
                let akunKas = '-';
                let akunLawan = '-';
                let nominal = parseFloat(j.total_debit);

                if (kasDebit && kasKredit) {
                    tipeTxt = 'Mutasi Kas';
                    akunKas = kasDebit.akun_nama;
                    akunLawan = kasKredit.akun_nama;
                    nominal = parseFloat(kasDebit.debit);
                } else if (kasDebit) {
                    tipeTxt = 'Kas Masuk';
                    const lawan = details.find(d => d.id !== kasDebit.id) || {};
                    akunKas = kasDebit.akun_nama;
                    akunLawan = lawan.akun_nama || 'Lain-lain';
                    nominal = parseFloat(kasDebit.debit);
                } else if (kasKredit) {
                    tipeTxt = 'Kas Keluar';
                    const lawan = details.find(d => d.id !== kasKredit.id) || {};
                    akunKas = kasKredit.akun_nama;
                    akunLawan = lawan.akun_nama || 'Lain-lain';
                    nominal = parseFloat(kasKredit.kredit);
                }

                return {
                    no_bukti: j.no_bukti,
                    tgl_fmt: App.formatDate(j.tgl_transaksi),
                    tipe_txt: tipeTxt,
                    akun_kas: akunKas,
                    akun_lawan: akunLawan,
                    keterangan: (j.keterangan || '').replace(/^\[(KAS MASUK|KAS KELUAR|MUTASI KAS)\]\s*/i, ''),
                    nominal_fmt: App.formatRupiah(nominal)
                };
            });

            const columns = [
                { title: 'No. Bukti', key: 'no_bukti' },
                { title: 'Tanggal', key: 'tgl_fmt' },
                { title: 'Jenis Transaksi', key: 'tipe_txt' },
                { title: 'Rekening Kas/Bank', key: 'akun_kas' },
                { title: 'Lawan Akun', key: 'akun_lawan' },
                { title: 'Keterangan', key: 'keterangan' },
                { title: 'Nominal', key: 'nominal_fmt', align: 'right' }
            ];

            App.export(type, `Laporan Transaksi Kas (${App.formatDate(dari)} - ${App.formatDate(sampai)})`, columns, rows, {
                filename: `laporan_kas_${dari}_sd_${sampai}`,
                orientation: 'l'
            });
        } catch (err) {
            console.error('Export error:', err);
            App.toast('Gagal melakukan ekspor: ' + err.message, 'error');
        }
    }
};

window.KasTransaksiPage = KasTransaksiPage;
export default KasTransaksiPage;
