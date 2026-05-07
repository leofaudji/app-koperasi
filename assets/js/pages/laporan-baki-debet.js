// Laporan Baki Debet Page
const LaporanBakiDebetPage = {
    data: [],
    summary: [],
    footer: null,
    selectedProduk: null,
    searchQuery: '',

    async render(container) {
        App.setTitle('Laporan Baki Debet', 'Data outstanding pokok pinjaman aktif');
        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">Laporan Baki Debet</h3>
                    <p class="text-xs text-gray-400 mt-1">Data outstanding pokok pinjaman aktif anggota</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="LaporanBakiDebetPage.export('pdf')" class="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-red-100 shadow-sm active:scale-95">
                        <i class="ri-file-pdf-line"></i> PDF
                    </button>
                    <button onclick="LaporanBakiDebetPage.export('csv')" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-emerald-100 shadow-sm active:scale-95">
                        <i class="ri-file-excel-line"></i> CSV
                    </button>
                    <div class="w-px h-8 bg-gray-100 mx-1"></div>
                    <button onclick="LaporanBakiDebetPage.load()" class="text-gray-500 hover:text-primary-600 p-2.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100" title="Refresh">
                        <i class="ri-refresh-line text-lg"></i>
                    </button>
                </div>
            </div>

            <!-- Analytics Summary -->
            <div id="bd-summary" class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <!-- Shimmer Loading -->
                ${Array(4).fill(0).map(() => `
                    <div class="h-24 bg-gray-50 rounded-2xl animate-pulse"></div>
                `).join('')}
            </div>

            <!-- Filter Row -->
            <div class="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 mb-6">
                <div class="flex flex-col sm:flex-row items-end gap-4">
                    <div class="flex-1 w-full">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Cari Anggota / No. Pinjaman</label>
                        <div class="relative">
                            <input type="text" id="bd-search" class="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2.5 shadow-sm" placeholder="Ketik nama atau nomor pinjaman..." oninput="LaporanBakiDebetPage.onSearch(this.value)">
                            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <i class="ri-search-line text-gray-400"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="bd-table"><div class="flex justify-center py-10"><i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div></div>
        </div>`;
        this.load();
    },

    async load() {
        const res = await App.api('pinjaman/laporan-baki-debet');
        if (!res?.success) return;

        // Support both old structure (array) and new structure (object)
        if (Array.isArray(res.data)) {
            this.data = res.data;
            this.summary = [];
        } else {
            this.data = res.data.list || [];
            this.summary = res.data.summary || [];
        }

        this.updateSummary();
        this.applyFilters();
    },

    onSearch(query) {
        this.searchQuery = query;
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

    updateSummary() {
        const totalSemua = this.data.reduce((a, b) => a + parseFloat(b.sisa_pinjaman || 0), 0);
        
        let summaryHtml = '';
        
        // Product cards
        this.summary.forEach(item => {
            const isSelected = this.selectedProduk === item.produk;
            summaryHtml += `
            <div onclick="LaporanBakiDebetPage.filterByProduk('${item.produk}')" class="cursor-pointer transition-all ${isSelected ? 'bg-primary-50 border-primary-500 ring-2 ring-primary-500/10' : 'bg-white border-gray-100 hover:border-primary-200'} p-4 rounded-2xl border shadow-sm active:scale-95">
                <p class="text-[10px] font-bold ${isSelected ? 'text-primary-600' : 'text-gray-400'} uppercase tracking-wider mb-1 truncate" title="${item.produk}">${item.produk}</p>
                <h4 class="text-sm font-bold ${isSelected ? 'text-primary-900' : 'text-gray-800'}">${App.formatRupiah(item.total_saldo)}</h4>
            </div>`;
        });

        // Grand Total card
        const isGrandSelected = !this.selectedProduk;
        summaryHtml += `
        <div onclick="LaporanBakiDebetPage.filterByProduk(null)" class="cursor-pointer transition-all ${isGrandSelected ? 'bg-primary-600 border-primary-700 shadow-primary-500/20 ring-4 ring-primary-500/30' : 'bg-gray-100 border-gray-200 opacity-50'} p-4 rounded-2xl border shadow-lg col-span-2 md:col-span-1 active:scale-95">
            <p class="text-[10px] font-bold ${isGrandSelected ? 'text-primary-100' : 'text-gray-500'} uppercase tracking-wider mb-1">Total Baki Debet</p>
            <h4 class="text-lg font-black ${isGrandSelected ? 'text-white' : 'text-gray-700'}">${App.formatRupiah(totalSemua)}</h4>
        </div>`;

        document.getElementById('bd-summary').innerHTML = summaryHtml;
    },

    applyFilters() {
        const q = this.searchQuery.toLowerCase();
        const filtered = this.data.filter(r => {
            const matchSearch = (r.anggota_nama || '').toLowerCase().includes(q) || 
                                (r.no_anggota || '').toLowerCase().includes(q) || 
                                (r.no_pinjaman || '').toLowerCase().includes(q);
            const matchProduk = !this.selectedProduk || r.produk === this.selectedProduk;
            return matchSearch && matchProduk;
        });
        this.renderTable(filtered);
    },

    renderTable(data) {
        const totalBakiDebet = data.reduce((a, b) => a + parseFloat(b.sisa_pinjaman), 0);
        this.footer = {
            tenor: this.selectedProduk ? `TOTAL ${this.selectedProduk.toUpperCase()}` : 'TOTAL BAKI DEBET',
            sisa_pinjaman: App.formatRupiah(totalBakiDebet)
        };

        let tableContent = '';
        if (this.selectedProduk || data.length === 0) {
            // Flat list
            tableContent = data.map((r, i) => this.renderRow(r, i)).join('');
        } else {
            // Grouped by product
            const groups = {};
            data.forEach(r => {
                if (!groups[r.produk]) groups[r.produk] = [];
                groups[r.produk].push(r);
            });

            Object.entries(groups).forEach(([produk, rows]) => {
                const subtotal = rows.reduce((a, b) => a + parseFloat(b.sisa_pinjaman), 0);
                tableContent += `
                    <tr>
                        <td colspan="8" class="px-4 py-2 text-xs font-black text-primary-800 uppercase tracking-widest bg-gray-50 border-y border-gray-100">
                            <div class="flex justify-between items-center">
                                <span><i class="ri-bookmark-3-line mr-2 text-primary-500"></i>${produk}</span>
                                <span class="text-[10px] text-primary-700 bg-white px-2 py-0.5 rounded-lg border border-primary-100 shadow-sm">
                                    Subtotal: ${App.formatRupiah(subtotal)}
                                </span>
                            </div>
                        </td>
                    </tr>
                `;
                tableContent += rows.map((r, i) => this.renderRow(r, i)).join('');
            });
        }

        const html = `<div class="table-wrapper">
            <table class="data-table w-full text-sm">
                <thead>
                    <tr class="bg-gray-50 text-gray-500 font-medium">
                        <th class="px-4 py-3 text-left w-12">No</th>
                        <th class="px-4 py-3 text-left">No. Pinjaman</th>
                        <th class="px-4 py-3 text-left">Nama Anggota</th>
                        <th class="px-4 py-3 text-left">Produk</th>
                        <th class="px-4 py-3 text-left">Tgl Pencairan</th>
                        <th class="px-4 py-3 text-right">Plafon Pinjaman</th>
                        <th class="px-4 py-3 text-center">Tenor</th>
                        <th class="px-4 py-3 text-right">Baki Debet</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    ${tableContent}
                    ${data.length === 0 ? '<tr><td colspan="8" class="text-center py-10 text-gray-400 italic">Tidak ada data baki debet ditemukan</td></tr>' : ''}
                </tbody>
                ${data.length > 0 ? `
                <tfoot class="bg-primary-50/30 font-bold border-t border-primary-100">
                    <tr>
                        <td colspan="7" class="px-4 py-4 text-right text-primary-800 uppercase tracking-widest text-[10px]">${this.footer.tenor}</td>
                        <td class="px-4 py-4 text-right text-primary-800 font-black text-base">${this.footer.sisa_pinjaman}</td>
                    </tr>
                </tfoot>` : ''}
            </table>
        </div>`;
        document.getElementById('bd-table').innerHTML = html;
    },

    renderRow(r, i) {
        return `
            <tr class="hover:bg-gray-50/50 transition-colors">
                <td class="px-4 py-3 text-gray-400 text-xs">${i + 1}</td>
                <td class="px-4 py-3 font-mono text-xs text-primary-600 font-bold">${r.no_pinjaman}</td>
                <td class="px-4 py-3">
                    <div class="font-medium text-gray-700">${r.anggota_nama}</div>
                    <div class="text-[10px] font-mono text-gray-400">${r.no_anggota}</div>
                </td>
                <td class="px-4 py-3 text-[11px] text-gray-500">${r.produk}</td>
                <td class="px-4 py-3 text-gray-500 text-xs">${App.formatDate(r.tgl_pencairan)}</td>
                <td class="px-4 py-3 text-right font-medium text-gray-600">${App.formatRupiah(r.jumlah)}</td>
                <td class="px-4 py-3 text-center text-gray-500 text-xs">${r.tenor} Bln</td>
                <td class="px-4 py-3 text-right font-bold text-primary-700">${App.formatRupiah(r.sisa_pinjaman)}</td>
            </tr>
        `;
    },

    getColumns() {
        return [
            { title: 'No', key: 'no' },
            { title: 'No. Pinjaman', key: 'no_pinjaman' },
            { title: 'Nama Anggota', key: 'anggota_nama' },
            { title: 'Produk', key: 'produk' },
            { title: 'Tgl Cair', key: 'tgl_pencairan' },
            { title: 'Plafon', key: 'jumlah', align: 'right' },
            { title: 'Tenor', key: 'tenor', align: 'center' },
            { title: 'Baki Debet', key: 'sisa_pinjaman', align: 'right' }
        ];
    },

    export(type) {
        const exportData = this.searchQuery || this.selectedProduk ? this.applyFiltersAndGet() : this.data;
        if (!exportData.length) return;
        
        const formattedData = exportData.map((r, i) => ({
            ...r,
            no: i + 1,
            anggota_nama: `${r.anggota_nama} (${r.no_anggota})`,
            tgl_pencairan: App.formatDate(r.tgl_pencairan),
            jumlah: App.formatRupiah(r.jumlah),
            tenor: r.tenor + ' Bln',
            sisa_pinjaman: App.formatRupiah(r.sisa_pinjaman)
        }));
        
        App.export(type, 'Laporan Baki Debet Pinjaman', this.getColumns(), formattedData, {
            filename: 'laporan_baki_debet',
            footer: this.footer
        });
    },

    applyFiltersAndGet() {
        const q = this.searchQuery.toLowerCase();
        return this.data.filter(r => {
            const matchSearch = (r.anggota_nama || '').toLowerCase().includes(q) || 
                                (r.no_anggota || '').toLowerCase().includes(q) || 
                                (r.no_pinjaman || '').toLowerCase().includes(q);
            const matchProduk = !this.selectedProduk || r.produk === this.selectedProduk;
            return matchSearch && matchProduk;
        });
    }
};

window.LaporanBakiDebetPage = LaporanBakiDebetPage;
export default LaporanBakiDebetPage;
