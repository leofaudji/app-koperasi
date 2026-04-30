// Laporan Saldo Pinjaman Page
const LaporanPinjamanPage = {
    data: [],
    footer: null,

    async render(container) {
        App.setTitle('Laporan Saldo Pinjaman', 'Rekap saldo pinjaman per anggota');
        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
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
                    <div class="w-px h-8 bg-gray-100 mx-1"></div>
                    <button onclick="LaporanPinjamanPage.load()" class="text-gray-500 hover:text-primary-600 p-2.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100" title="Refresh">
                        <i class="ri-refresh-line text-lg"></i>
                    </button>
                </div>
            </div>

            <!-- Filter Row -->
            <div class="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 mb-6">
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

            <div id="lp-table"><div class="flex justify-center py-10"><i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div></div>
        </div>`;
        this.load();
    },

    async load() {
        const res = await App.api('pinjaman/laporan-saldo');
        if (!res?.success) return;

        this.data = res.data;
        this.renderTable(this.data);
    },

    filter(query) {
        const q = query.toLowerCase();
        const filtered = this.data.filter(r => 
            (r.anggota_nama || '').toLowerCase().includes(q) || 
            (r.no_anggota || '').toLowerCase().includes(q)
        );
        this.renderTable(filtered);
    },

    renderTable(data = null) {
        if (!data) data = this.data;
        const totalPinjaman = data.reduce((a, b) => a + parseFloat(b.total_pinjaman), 0);
        const totalTerbayar = data.reduce((a, b) => a + parseFloat(b.total_terbayar), 0);
        const totalSisa = data.reduce((a, b) => a + parseFloat(b.sisa_pinjaman), 0);

        this.footer = {
            anggota_nama: 'TOTAL KESELURUHAN',
            total_pinjaman: App.formatRupiah(totalPinjaman),
            total_terbayar: App.formatRupiah(totalTerbayar),
            sisa_pinjaman: App.formatRupiah(totalSisa)
        };

        const html = `<div class="table-wrapper">
            <table class="data-table w-full text-sm">
                <thead>
                    <tr class="bg-gray-50 text-gray-500 font-medium">
                        <th class="px-4 py-3 text-left w-12">No</th>
                        <th class="px-4 py-3 text-left">No. Anggota</th>
                        <th class="px-4 py-3 text-left">Nama Anggota</th>
                        <th class="px-4 py-3 text-right">Total Pinjaman</th>
                        <th class="px-4 py-3 text-right">Total Terbayar</th>
                        <th class="px-4 py-3 text-right">Saldo Pinjaman</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    ${data.map((r, i) => `
                        <tr class="hover:bg-gray-50/50 transition-colors">
                            <td class="px-4 py-3 text-gray-400">${i + 1}</td>
                            <td class="px-4 py-3 font-medium text-gray-700">${r.no_anggota}</td>
                            <td class="px-4 py-3 text-gray-600">${r.anggota_nama}</td>
                            <td class="px-4 py-3 text-right font-semibold text-gray-700">${App.formatRupiah(r.total_pinjaman)}</td>
                            <td class="px-4 py-3 text-right font-medium text-emerald-600">${App.formatRupiah(r.total_terbayar)}</td>
                            <td class="px-4 py-3 text-right font-bold text-primary-700">${App.formatRupiah(r.sisa_pinjaman)}</td>
                        </tr>
                    `).join('')}
                    ${data.length === 0 ? '<tr><td colspan="6" class="text-center py-10 text-gray-400">Tidak ada data pinjaman</td></tr>' : ''}
                </tbody>
                ${data.length > 0 ? `
                <tfoot class="bg-gray-50/50 font-bold border-t border-gray-100">
                    <tr>
                        <td colspan="3" class="px-4 py-3 text-right text-gray-500 uppercase tracking-wider">${this.footer.anggota_nama}</td>
                        <td class="px-4 py-3 text-right text-gray-700">${this.footer.total_pinjaman}</td>
                        <td class="px-4 py-3 text-right text-emerald-600">${this.footer.total_terbayar}</td>
                        <td class="px-4 py-3 text-right text-primary-700">${this.footer.sisa_pinjaman}</td>
                    </tr>
                </tfoot>` : ''}
            </table>
        </div>`;
        document.getElementById('lp-table').innerHTML = html;
    },

    getColumns() {
        return [
            { title: 'No', key: 'no' },
            { title: 'No. Anggota', key: 'no_anggota' },
            { title: 'Nama Anggota', key: 'anggota_nama' },
            { title: 'Total Pinjaman', key: 'total_pinjaman', align: 'right' },
            { title: 'Total Terbayar', key: 'total_terbayar', align: 'right' },
            { title: 'Saldo Pinjaman', key: 'sisa_pinjaman', align: 'right' }
        ];
    },

    export(type) {
        if (!this.data.length) return;
        const formattedData = this.data.map((r, i) => ({
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
    }
};

window.LaporanPinjamanPage = LaporanPinjamanPage;
export default LaporanPinjamanPage;
