// Laporan Baki Debet Page
const LaporanBakiDebetPage = {
    data: [],
    footer: null,

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

            <!-- Filter Row -->
            <div class="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 mb-6">
                <div class="flex flex-col sm:flex-row items-end gap-4">
                    <div class="flex-1 w-full">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Cari Anggota / No. Pinjaman</label>
                        <div class="relative">
                            <input type="text" id="bd-search" class="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2.5 shadow-sm" placeholder="Ketik nama atau nomor pinjaman..." oninput="LaporanBakiDebetPage.filter(this.value)">
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

        this.data = res.data;
        this.renderTable(this.data);
    },

    filter(query) {
        const q = query.toLowerCase();
        const filtered = this.data.filter(r => 
            (r.anggota_nama || '').toLowerCase().includes(q) || 
            (r.no_anggota || '').toLowerCase().includes(q) || 
            (r.no_pinjaman || '').toLowerCase().includes(q)
        );
        this.renderTable(filtered);
    },

    renderTable(data) {
        const totalBakiDebet = data.reduce((a, b) => a + parseFloat(b.sisa_pinjaman), 0);
        this.footer = {
            tenor: 'TOTAL BAKI DEBET',
            sisa_pinjaman: App.formatRupiah(totalBakiDebet)
        };

        const html = `<div class="table-wrapper">
            <table class="data-table w-full text-sm">
                <thead>
                    <tr class="bg-gray-50 text-gray-500 font-medium">
                        <th class="px-4 py-3 text-left w-12">No</th>
                        <th class="px-4 py-3 text-left">No. Pinjaman</th>
                        <th class="px-4 py-3 text-left">Nama Anggota</th>
                        <th class="px-4 py-3 text-left">Tgl Pencairan</th>
                        <th class="px-4 py-3 text-right">Plafon Pinjaman</th>
                        <th class="px-4 py-3 text-center">Tenor</th>
                        <th class="px-4 py-3 text-right">Baki Debet</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    ${data.map((r, i) => `
                        <tr class="hover:bg-gray-50/50 transition-colors">
                            <td class="px-4 py-3 text-gray-400">${i + 1}</td>
                            <td class="px-4 py-3 font-mono text-xs text-primary-600 font-bold">${r.no_pinjaman}</td>
                            <td class="px-4 py-3 text-gray-700">${r.anggota_nama}</td>
                            <td class="px-4 py-3 text-gray-500">${App.formatDate(r.tgl_pencairan)}</td>
                            <td class="px-4 py-3 text-right font-medium text-gray-600">${App.formatRupiah(r.jumlah)}</td>
                            <td class="px-4 py-3 text-center text-gray-500">${r.tenor} Bln</td>
                            <td class="px-4 py-3 text-right font-bold text-primary-700">${App.formatRupiah(r.sisa_pinjaman)}</td>
                        </tr>
                    `).join('')}
                    ${data.length === 0 ? '<tr><td colspan="7" class="text-center py-10 text-gray-400">Tidak ada pinjaman aktif</td></tr>' : ''}
                </tbody>
                ${data.length > 0 ? `
                <tfoot class="bg-gray-50/50 font-bold border-t border-gray-100">
                    <tr>
                        <td colspan="6" class="px-4 py-3 text-right text-gray-500 uppercase tracking-wider">${this.footer.tenor}</td>
                        <td class="px-4 py-3 text-right text-primary-700 font-extrabold text-base">${this.footer.sisa_pinjaman}</td>
                    </tr>
                </tfoot>` : ''}
            </table>
        </div>`;
        document.getElementById('bd-table').innerHTML = html;
    },

    getColumns() {
        return [
            { title: 'No', key: 'no' },
            { title: 'No. Pinjaman', key: 'no_pinjaman' },
            { title: 'Nama Anggota', key: 'anggota_nama' },
            { title: 'Tgl Cair', key: 'tgl_pencairan' },
            { title: 'Plafon', key: 'jumlah', align: 'right' },
            { title: 'Tenor', key: 'tenor', align: 'center' },
            { title: 'Baki Debet', key: 'sisa_pinjaman', align: 'right' }
        ];
    },

    export(type) {
        if (!this.data.length) return;
        const formattedData = this.data.map((r, i) => ({
            ...r,
            no: i + 1,
            tgl_pencairan: App.formatDate(r.tgl_pencairan),
            jumlah: App.formatRupiah(r.jumlah),
            tenor: r.tenor + ' Bln',
            sisa_pinjaman: App.formatRupiah(r.sisa_pinjaman)
        }));
        App.export(type, 'Laporan Baki Debet Pinjaman', this.getColumns(), formattedData, {
            filename: 'laporan_baki_debet',
            footer: this.footer
        });
    }
};

window.LaporanBakiDebetPage = LaporanBakiDebetPage;
export default LaporanBakiDebetPage;
