// Laporan Saldo Pinjaman Page
const LaporanPinjamanPage = {
    data: [],
    summary: [],
    footer: null,
    sortKey: 'anggota_nama',
    sortDir: 1,
    selectedProduk: null,
    searchQuery: '',

    async render(container) {
        App.setTitle('Laporan Saldo Pinjaman', 'Rekapitulasi saldo pinjaman per anggota');
        container.innerHTML = `
        <div class="flex flex-col gap-6 animate-fadeIn">
            <!-- Header Actions -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">Laporan Saldo Pinjaman</h3>
                    <p class="text-xs text-gray-400 mt-1">Rekapitulasi saldo pinjaman per anggota</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="LaporanPinjamanPage.export('pdf')" class="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-red-100 shadow-sm active:scale-95">
                        <i class="ri-file-pdf-line"></i> PDF
                    </button>
                    <button onclick="LaporanPinjamanPage.export('csv')" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-emerald-100 shadow-sm active:scale-95">
                        <i class="ri-file-excel-line"></i> CSV
                    </button>
                    <div class="w-px h-8 bg-gray-200 mx-2"></div>
                    <button onclick="LaporanPinjamanPage.load()" class="bg-white border border-gray-200 text-gray-600 hover:text-primary-600 hover:border-primary-500 p-2.5 rounded-xl transition-all shadow-sm active:scale-95" title="Refresh">
                        <i class="ri-refresh-line text-lg"></i>
                    </button>
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4" id="lp-summary">
                <div class="col-span-2 md:col-span-4 lg:col-span-5 flex justify-center py-10 bg-white rounded-2xl border border-gray-100 shadow-sm">
                    <i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
                </div>
            </div>
            
            <!-- Filter Row -->
            <div class="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                <div class="flex flex-col sm:flex-row items-end gap-4">
                    <div class="flex-1 w-full">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Cari Anggota</label>
                        <div class="relative">
                            <input type="text" id="lp-search" class="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2.5 shadow-sm" placeholder="Ketik nama atau nomor anggota..." oninput="LaporanPinjamanPage.filter(this.value)">
                            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <i class="ri-search-line text-gray-400"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Table Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
                <div id="lp-table">
                    <div class="flex justify-center py-20">
                        <div class="flex flex-col items-center gap-3">
                            <i class="ri-loader-4-line animate-spin text-4xl text-primary-500"></i>
                            <p class="text-xs text-gray-400 animate-pulse">Memuat data pinjaman...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        this.load();
    },

    async load() {
        const res = await App.api('pinjaman/laporan-saldo');
        if (!res?.success) return;

        this.data = res.data.list;
        this.summary = res.data.summary;
        this.updateSummary();
        this.applyFilters();
    },

    filter(query) {
        this.searchQuery = query || '';
        this.applyFilters();
    },

    filterByProduk(produk) {
        if (this.selectedProduk === produk) {
            this.selectedProduk = null;
        } else {
            this.selectedProduk = produk;
        }
        this.updateSummary();
        this.applyFilters();
    },

    applyFilters() {
        const q = this.searchQuery.toLowerCase();
        const filtered = this.data.map(r => {
            // Jika ada filter produk, gunakan angka spesifik produk tersebut
            if (this.selectedProduk && r.breakdown && r.breakdown[this.selectedProduk]) {
                const b = r.breakdown[this.selectedProduk];
                return {
                    ...r,
                    total_pinjaman: b.plafon,
                    total_terbayar: b.terbayar,
                    sisa_pinjaman: b.sisa,
                    no_pinjaman_display: b.nos.join(', ')
                };
            }
            return {
                ...r,
                no_pinjaman_display: r.no_pinjaman_str
            };
        }).filter(r => {
            const matchSearch = (r.anggota_nama || '').toLowerCase().includes(q) || 
                                (r.no_anggota || '').toLowerCase().includes(q) ||
                                (r.no_pinjaman_display || '').toLowerCase().includes(q);
            const matchProduk = !this.selectedProduk || (r.produk_list_str || '').includes(this.selectedProduk);
            return matchSearch && matchProduk;
        });
        this.renderTable(filtered);
    },

    updateSummary() {
        const totalSemua = this.data.reduce((a, b) => a + parseFloat(b.sisa_pinjaman || 0), 0);
        
        let summaryHtml = '';
        
        // Add dynamic product cards
        this.summary.forEach(item => {
            const isSelected = this.selectedProduk === item.produk;
            summaryHtml += `
            <div onclick="LaporanPinjamanPage.filterByProduk('${item.produk}')" class="cursor-pointer transition-all ${isSelected ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-500/10' : 'bg-white border-gray-100 hover:border-primary-200'} p-4 rounded-2xl border shadow-sm active:scale-95">
                <p class="text-[10px] font-bold ${isSelected ? 'text-primary-600' : 'text-gray-400'} uppercase tracking-wider mb-1 truncate" title="${item.produk}">${item.produk}</p>
                <h4 class="text-sm font-bold ${isSelected ? 'text-primary-900' : 'text-gray-800'}">${App.formatRupiah(item.total_saldo)}</h4>
            </div>`;
        });

        // Add Grand Total card
        const isGrandSelected = !this.selectedProduk;
        summaryHtml += `
        <div onclick="LaporanPinjamanPage.filterByProduk(null)" class="cursor-pointer transition-all ${isGrandSelected ? 'bg-primary-600 border-primary-700 shadow-primary-500/20 ring-4 ring-primary-500/30' : 'bg-gray-100 border-gray-200 opacity-50'} p-4 rounded-2xl border shadow-lg col-span-2 md:col-span-1 active:scale-95">
            <p class="text-[10px] font-bold ${isGrandSelected ? 'text-primary-100' : 'text-gray-500'} uppercase tracking-wider mb-1">Grand Total Saldo</p>
            <h4 class="text-lg font-black ${isGrandSelected ? 'text-white' : 'text-gray-700'}">${App.formatRupiah(totalSemua)}</h4>
        </div>`;

        document.getElementById('lp-summary').innerHTML = summaryHtml;
    },

    sortBy(key) {
        if (this.sortKey === key) {
            this.sortDir *= -1;
        } else {
            this.sortKey = key;
            this.sortDir = 1;
        }
        
        this.data.sort((a, b) => {
            let v1 = a[key];
            let v2 = b[key];
            
            const numericFields = ['total_pinjaman', 'total_terbayar', 'sisa_pinjaman'];
            if (numericFields.includes(key)) {
                v1 = parseFloat(v1 || 0);
                v2 = parseFloat(v2 || 0);
            } else {
                v1 = (v1 || '').toString().toLowerCase();
                v2 = (v2 || '').toString().toLowerCase();
            }
            
            if (v1 < v2) return -1 * this.sortDir;
            if (v1 > v2) return 1 * this.sortDir;
            return 0;
        });

        this.applyFilters();
    },

    renderTable(data = null) {
        const renderData = data || this.data;
        
        // Calculate footer based on rendered data
        const totalPinjaman = renderData.reduce((a, b) => a + parseFloat(b.total_pinjaman || 0), 0);
        const totalTerbayar = renderData.reduce((a, b) => a + parseFloat(b.total_terbayar || 0), 0);
        const totalSisa = renderData.reduce((a, b) => a + parseFloat(b.sisa_pinjaman || 0), 0);

        this.footer = {
            anggota_nama: this.selectedProduk ? `TOTAL ${this.selectedProduk.toUpperCase()}` : 'TOTAL KESELURUHAN',
            total_pinjaman: App.formatRupiah(totalPinjaman),
            total_terbayar: App.formatRupiah(totalTerbayar),
            sisa_pinjaman: App.formatRupiah(totalSisa)
        };

        const getSortIcon = (key) => {
            if (this.sortKey !== key) return '<i class="ri-arrow-up-down-line ml-1 opacity-20"></i>';
            return this.sortDir === 1 ? '<i class="ri-arrow-up-s-line ml-1 text-primary-500"></i>' : '<i class="ri-arrow-down-s-line ml-1 text-primary-500"></i>';
        };

        const html = `<div class="table-wrapper">
            <table class="data-table w-full text-sm">
                <thead>
                    <tr class="bg-gray-50 text-gray-500 font-medium">
                        <th class="px-4 py-3 text-left w-12">No</th>
                        <th class="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onclick="LaporanPinjamanPage.sortBy('anggota_nama')">
                            Anggota ${getSortIcon('anggota_nama')}
                        </th>
                        <th class="px-4 py-3 text-left">No. Rekening</th>
                        <th class="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onclick="LaporanPinjamanPage.sortBy('total_pinjaman')">
                            Total Pinjaman ${getSortIcon('total_pinjaman')}
                        </th>
                        <th class="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onclick="LaporanPinjamanPage.sortBy('total_terbayar')">
                            Total Terbayar ${getSortIcon('total_terbayar')}
                        </th>
                        <th class="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onclick="LaporanPinjamanPage.sortBy('sisa_pinjaman')">
                            Saldo Pinjaman ${getSortIcon('sisa_pinjaman')}
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    ${renderData.map((r, i) => `
                        <tr class="hover:bg-gray-50/50 transition-colors">
                            <td class="px-4 py-3 text-gray-400">${i + 1}</td>
                            <td class="px-4 py-3">
                                <div class="font-medium text-gray-800">${r.anggota_nama}</div>
                                <div class="text-[10px] font-mono text-gray-400 mt-0.5">${r.no_anggota}</div>
                            </td>
                            <td class="px-4 py-3">
                                <div class="text-[10px] font-mono text-primary-600 font-bold break-all">${r.no_pinjaman_display}</div>
                                <div class="text-[9px] text-gray-400 italic">${this.selectedProduk || r.produk_list_str}</div>
                            </td>
                            <td class="px-4 py-3 text-right font-medium text-gray-600">${App.formatRupiah(r.total_pinjaman)}</td>
                            <td class="px-4 py-3 text-right font-medium text-emerald-600">${App.formatRupiah(r.total_terbayar)}</td>
                            <td class="px-4 py-3 text-right font-bold text-primary-700">${App.formatRupiah(r.sisa_pinjaman)}</td>
                        </tr>
                    `).join('')}
                    ${renderData.length === 0 ? '<tr><td colspan="6" class="text-center py-10 text-gray-400">Tidak ada data pinjaman</td></tr>' : ''}
                </tbody>
                ${renderData.length > 0 ? `
                <tfoot class="bg-gray-50/50 font-bold border-t border-gray-100">
                    <tr>
                        <td colspan="3" class="px-4 py-3 text-right text-gray-500 uppercase tracking-wider">${this.footer.anggota_nama}</td>
                        <td class="px-4 py-3 text-right text-gray-700">${this.footer.total_pinjaman}</td>
                        <td class="px-4 py-3 text-right text-emerald-600">${this.footer.total_terbayar}</td>
                        <td class="px-4 py-3 text-right text-primary-700 font-extrabold text-base">${this.footer.sisa_pinjaman}</td>
                    </tr>
                </tfoot>` : ''}
            </table>
        </div>`;
        document.getElementById('lp-table').innerHTML = html;
    },

    getColumns() {
        return [
            { title: 'No', key: 'no' },
            { title: 'Anggota', key: 'anggota_nama' },
            { title: 'No. Rekening', key: 'no_pinjaman_display' },
            { title: 'Total Pinjaman', key: 'total_pinjaman', align: 'right' },
            { title: 'Total Terbayar', key: 'total_terbayar', align: 'right' },
            { title: 'Saldo Pinjaman', key: 'sisa_pinjaman', align: 'right' }
        ];
    },

    export(type) {
        const exportData = this.searchQuery || this.selectedProduk ? this.applyFiltersAndGet() : this.data;
        if (!exportData.length) return;
        
        const formattedData = exportData.map((r, i) => ({
            ...r,
            no: i + 1,
            total_pinjaman: App.formatRupiah(r.total_pinjaman),
            total_terbayar: App.formatRupiah(r.total_terbayar),
            sisa_pinjaman: App.formatRupiah(r.sisa_pinjaman)
        }));
        
        App.export(type, 'Laporan Saldo Pinjaman', this.getColumns(), formattedData, {
            filename: 'laporan_pinjaman_saldo',
            footer: this.footer
        });
    },

    applyFiltersAndGet() {
        const q = this.searchQuery.toLowerCase();
        return this.data.map(r => {
            if (this.selectedProduk && r.breakdown && r.breakdown[this.selectedProduk]) {
                const b = r.breakdown[this.selectedProduk];
                return {
                    ...r,
                    total_pinjaman: b.plafon,
                    total_terbayar: b.terbayar,
                    sisa_pinjaman: b.sisa,
                    no_pinjaman_display: b.nos.join(', ')
                };
            }
            return {
                ...r,
                no_pinjaman_display: r.no_pinjaman_str
            };
        }).filter(r => {
            const matchSearch = (r.anggota_nama || '').toLowerCase().includes(q) || 
                                (r.no_anggota || '').toLowerCase().includes(q) ||
                                (r.no_pinjaman_display || '').toLowerCase().includes(q);
            const matchProduk = !this.selectedProduk || (r.produk_list_str || '').includes(this.selectedProduk);
            return matchSearch && matchProduk;
        });
    }
};

window.LaporanPinjamanPage = LaporanPinjamanPage;
export default LaporanPinjamanPage;
