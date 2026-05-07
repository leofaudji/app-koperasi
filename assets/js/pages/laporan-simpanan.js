// Laporan Saldo Simpanan Page
const LaporanSimpananPage = {
    data: [],
    footer: null,
    sortKey: 'anggota_nama',
    sortDir: 1,
    selectedProduk: null, // key like 'pokok', 'wajib', etc.
    selectedProdukLabel: null,
    searchQuery: '',

    async render(container) {
        App.setTitle('Laporan Saldo Simpanan', 'Rekapitulasi saldo simpanan per anggota');
        container.innerHTML = `
        <div class="flex flex-col gap-6 animate-fadeIn">
            <!-- Header Actions -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">Rekapitulasi Saldo</h3>
                    <p class="text-xs text-gray-400 mt-1">Laporan saldo simpanan seluruh anggota</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="LaporanSimpananPage.export('pdf')" class="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-red-100 shadow-sm active:scale-95">
                        <i class="ri-file-pdf-line"></i> PDF
                    </button>
                    <button onclick="LaporanSimpananPage.export('csv')" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-emerald-100 shadow-sm active:scale-95">
                        <i class="ri-file-excel-line"></i> CSV
                    </button>
                    <div class="w-px h-8 bg-gray-200 mx-2"></div>
                    <button onclick="LaporanSimpananPage.load()" class="bg-white border border-gray-200 text-gray-600 hover:text-primary-600 hover:border-primary-500 p-2.5 rounded-xl transition-all shadow-sm active:scale-95" title="Refresh">
                        <i class="ri-refresh-line text-lg"></i>
                    </button>
                </div>
            </div>

            <!-- Summary Cards -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4" id="ls-summary">
                <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Pokok</p>
                    <h4 class="text-sm font-bold text-gray-800" id="sum-pokok">Rp 0</h4>
                </div>
                <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Wajib</p>
                    <h4 class="text-sm font-bold text-gray-800" id="sum-wajib">Rp 0</h4>
                </div>
                <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Sukarela</p>
                    <h4 class="text-sm font-bold text-gray-800" id="sum-sukarela">Rp 0</h4>
                </div>
                <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Total Partisipatif</p>
                    <h4 class="text-sm font-bold text-gray-800" id="sum-partisipatif">Rp 0</h4>
                </div>
                <div class="bg-primary-600 p-4 rounded-2xl border border-primary-700 shadow-lg shadow-primary-500/20 col-span-2 md:col-span-1">
                    <p class="text-[10px] font-bold text-primary-100 uppercase tracking-wider mb-1">Grand Total</p>
                    <h4 class="text-lg font-black text-white" id="sum-grand">Rp 0</h4>
                </div>
            </div>
            
            <!-- Filter Row -->
            <div class="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                <div class="flex flex-col sm:flex-row items-end gap-4">
                    <div class="flex-1 w-full">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Cari Anggota</label>
                        <div class="relative">
                            <input type="text" id="ls-search" class="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2.5 shadow-sm" placeholder="Ketik nama atau nomor anggota..." oninput="LaporanSimpananPage.filter(this.value)">
                            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <i class="ri-search-line text-gray-400"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Table Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
                <div id="ls-table">
                    <div class="flex justify-center py-20">
                        <div class="flex flex-col items-center gap-3">
                            <i class="ri-loader-4-line animate-spin text-4xl text-primary-500"></i>
                            <p class="text-xs text-gray-400 animate-pulse">Memuat data simpanan...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
        this.load();
    },

    async load() {
        const res = await App.api('simpanan/laporan-saldo');
        if (!res?.success) return;

        this.data = res.data;
        this.updateSummary();
        this.applyFilters();
    },

    filter(query) {
        this.searchQuery = query || '';
        this.applyFilters();
    },

    filterByProduk(key, label = null) {
        if (this.selectedProduk === key) {
            this.selectedProduk = null;
            this.selectedProdukLabel = null;
        } else {
            this.selectedProduk = key;
            this.selectedProdukLabel = label;
        }
        this.updateSummary();
        this.applyFilters();
    },

    applyFilters() {
        const q = this.searchQuery.toLowerCase();
        const filtered = this.data.filter(r => {
            const matchSearch = (r.anggota_nama || '').toLowerCase().includes(q) || 
                                (r.no_anggota || '').toLowerCase().includes(q);
            const matchProduk = !this.selectedProduk || parseFloat(r[this.selectedProduk] || 0) > 0;
            return matchSearch && matchProduk;
        });
        this.renderTable(filtered);
    },

    updateSummary() {
        const totalPokok = this.data.reduce((a, b) => a + parseFloat(b.pokok || 0), 0);
        const totalWajib = this.data.reduce((a, b) => a + parseFloat(b.wajib || 0), 0);
        const totalSukarela = this.data.reduce((a, b) => a + parseFloat(b.sukarela || 0), 0);
        const totalPartisipatif = this.data.reduce((a, b) => a + parseFloat(b.partisipatif || 0), 0);
        const totalSemua = this.data.reduce((a, b) => a + parseFloat(b.total_saldo || 0), 0);

        const summaryData = [
            { id: 'sum-pokok', key: 'pokok', label: 'Simp. Pokok', total: totalPokok },
            { id: 'sum-wajib', key: 'wajib', label: 'Simp. Wajib', total: totalWajib },
            { id: 'sum-sukarela', key: 'sukarela', label: 'Simp. Sukarela', total: totalSukarela },
            { id: 'sum-partisipatif', key: 'partisipatif', label: 'Simp. Partisipatif', total: totalPartisipatif }
        ];

        let summaryHtml = '';
        summaryData.forEach(item => {
            const isSelected = this.selectedProduk === item.key;
            summaryHtml += `
            <div onclick="LaporanSimpananPage.filterByProduk('${item.key}', '${item.label}')" class="cursor-pointer transition-all ${isSelected ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-500/10' : 'bg-white border-gray-100 hover:border-primary-200'} p-4 rounded-2xl border shadow-sm active:scale-95">
                <p class="text-[10px] font-bold ${isSelected ? 'text-primary-600' : 'text-gray-400'} uppercase tracking-wider mb-1">${item.label}</p>
                <h4 class="text-sm font-bold ${isSelected ? 'text-primary-900' : 'text-gray-800'}">${App.formatRupiah(item.total)}</h4>
            </div>`;
        });

        // Add Grand Total
        const isGrandSelected = !this.selectedProduk;
        summaryHtml += `
        <div onclick="LaporanSimpananPage.filterByProduk(null)" class="cursor-pointer transition-all ${isGrandSelected ? 'bg-primary-600 border-primary-700 shadow-lg shadow-primary-500/20 ring-4 ring-primary-500/30' : 'bg-gray-100 border-gray-200 opacity-50'} p-4 rounded-2xl border col-span-2 md:col-span-1 active:scale-95">
            <p class="text-[10px] font-bold ${isGrandSelected ? 'text-primary-100' : 'text-gray-500'} uppercase tracking-wider mb-1">Grand Total</p>
            <h4 class="text-lg font-black ${isGrandSelected ? 'text-white' : 'text-gray-700'}">${App.formatRupiah(totalSemua)}</h4>
        </div>`;

        document.getElementById('ls-summary').innerHTML = summaryHtml;
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
            
            const numericFields = ['pokok', 'wajib', 'sukarela', 'partisipatif', 'total_saldo'];
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
        
        const totalPokok = renderData.reduce((a, b) => a + parseFloat(b.pokok || 0), 0);
        const totalWajib = renderData.reduce((a, b) => a + parseFloat(b.wajib || 0), 0);
        const totalSukarela = renderData.reduce((a, b) => a + parseFloat(b.sukarela || 0), 0);
        const totalPartisipatif = renderData.reduce((a, b) => a + parseFloat(b.partisipatif || 0), 0);
        const totalSemua = renderData.reduce((a, b) => a + parseFloat(b.total_saldo || 0), 0);

        this.footer = {
            anggota_nama: this.selectedProdukLabel ? `TOTAL ${this.selectedProdukLabel.toUpperCase()}` : 'TOTAL KESELURUHAN',
            pokok: App.formatRupiah(totalPokok),
            wajib: App.formatRupiah(totalWajib),
            sukarela: App.formatRupiah(totalSukarela),
            partisipatif: App.formatRupiah(totalPartisipatif),
            total_saldo: App.formatRupiah(totalSemua)
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
                        <th class="px-4 py-3 text-left cursor-pointer hover:bg-gray-100 transition-colors" onclick="LaporanSimpananPage.sortBy('anggota_nama')">
                            Anggota ${getSortIcon('anggota_nama')}
                        </th>
                        <th class="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onclick="LaporanSimpananPage.sortBy('pokok')">
                            Simp. Pokok ${getSortIcon('pokok')}
                        </th>
                        <th class="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onclick="LaporanSimpananPage.sortBy('wajib')">
                            Simp. Wajib ${getSortIcon('wajib')}
                        </th>
                        <th class="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onclick="LaporanSimpananPage.sortBy('sukarela')">
                            Simp. Sukarela ${getSortIcon('sukarela')}
                        </th>
                        <th class="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onclick="LaporanSimpananPage.sortBy('partisipatif')">
                            Simp. Partisipatif ${getSortIcon('partisipatif')}
                        </th>
                        <th class="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 transition-colors" onclick="LaporanSimpananPage.sortBy('total_saldo')">
                            Total Saldo ${getSortIcon('total_saldo')}
                        </th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    ${renderData.map((r, i) => `
                        <tr class="hover:bg-gray-50/50 transition-colors">
                            <td class="px-4 py-3 text-gray-400">${i + 1}</td>
                            <td class="px-4 py-3">
                                <div class="font-bold text-gray-800 leading-tight">${r.anggota_nama}</div>
                                <div class="text-[10px] font-mono text-primary-500 mt-0.5">${r.no_anggota}</div>
                            </td>
                            <td class="px-4 py-3 text-right font-medium text-gray-700">${App.formatRupiah(r.pokok)}</td>
                            <td class="px-4 py-3 text-right font-medium text-gray-700">${App.formatRupiah(r.wajib)}</td>
                            <td class="px-4 py-3 text-right font-medium text-gray-700">${App.formatRupiah(r.sukarela)}</td>
                            <td class="px-4 py-3 text-right font-medium text-gray-700">${App.formatRupiah(r.partisipatif)}</td>
                            <td class="px-4 py-3 text-right font-bold text-primary-700">${App.formatRupiah(r.total_saldo)}</td>
                        </tr>
                    `).join('')}
                    ${renderData.length === 0 ? '<tr><td colspan="7" class="text-center py-10 text-gray-400">Tidak ada data simpanan</td></tr>' : ''}
                </tbody>
                ${renderData.length > 0 ? `
                <tfoot class="bg-gray-50/50 font-bold border-t border-gray-100">
                    <tr>
                        <td colspan="2" class="px-4 py-3 text-right text-gray-500 uppercase tracking-wider">${this.footer.anggota_nama}</td>
                        <td class="px-4 py-3 text-right text-gray-700">${this.footer.pokok}</td>
                        <td class="px-4 py-3 text-right text-gray-700">${this.footer.wajib}</td>
                        <td class="px-4 py-3 text-right text-gray-700">${this.footer.sukarela}</td>
                        <td class="px-4 py-3 text-right text-gray-700">${this.footer.partisipatif}</td>
                        <td class="px-4 py-3 text-right text-primary-700 font-extrabold text-base">${this.footer.total_saldo}</td>
                    </tr>
                </tfoot>` : ''}
            </table>
        </div>`;
        document.getElementById('ls-table').innerHTML = html;
    },

    getColumns() {
        return [
            { title: 'No', key: 'no' },
            { title: 'No. Anggota', key: 'no_anggota' },
            { title: 'Nama Anggota', key: 'anggota_nama' },
            { title: 'Pokok', key: 'pokok', align: 'right' },
            { title: 'Wajib', key: 'wajib', align: 'right' },
            { title: 'Sukarela', key: 'sukarela', align: 'right' },
            { title: 'Partisipatif', key: 'partisipatif', align: 'right' },
            { title: 'Total Saldo', key: 'total_saldo', align: 'right' }
        ];
    },

    export(type) {
        const exportData = this.searchQuery || this.selectedProduk ? this.applyFiltersAndGet() : this.data;
        if (!exportData.length) return;
        
        const formattedData = exportData.map((r, i) => ({
            ...r,
            no: i + 1,
            pokok: App.formatRupiah(r.pokok),
            wajib: App.formatRupiah(r.wajib),
            sukarela: App.formatRupiah(r.sukarela),
            partisipatif: App.formatRupiah(r.partisipatif),
            total_saldo: App.formatRupiah(r.total_saldo)
        }));
        
        App.export(type, 'Laporan Saldo Simpanan', this.getColumns(), formattedData, {
            filename: 'laporan_simpanan',
            footer: this.footer
        });
    },

    applyFiltersAndGet() {
        const q = this.searchQuery.toLowerCase();
        return this.data.filter(r => {
            const matchSearch = (r.anggota_nama || '').toLowerCase().includes(q) || 
                                (r.no_anggota || '').toLowerCase().includes(q);
            const matchProduk = !this.selectedProduk || parseFloat(r[this.selectedProduk] || 0) > 0;
            return matchSearch && matchProduk;
        });
    }
};

window.LaporanSimpananPage = LaporanSimpananPage;
export default LaporanSimpananPage;
