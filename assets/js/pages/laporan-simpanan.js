// Laporan Saldo Simpanan Page
const LaporanSimpananPage = {
    data: [],
    footer: null,

    async render(container) {
        App.setTitle('Laporan Saldo Simpanan', 'Rekapitulasi saldo simpanan per anggota');
        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h3 class="font-semibold text-gray-800">Rekapitulasi Saldo</h3>
                <div class="flex items-center gap-2">
                <div class="flex items-center gap-2">
                    <button onclick="LaporanSimpananPage.export('pdf')" class="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
                        <i class="ri-file-pdf-line mr-1"></i> PDF
                    </button>
                    <button onclick="LaporanSimpananPage.export('csv')" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
                        <i class="ri-file-excel-line mr-1"></i> CSV
                    </button>
                    <div class="w-px h-6 bg-gray-100 mx-1"></div>
                    <button onclick="LaporanSimpananPage.load()" class="text-primary-600 hover:text-primary-700 p-2 rounded-lg hover:bg-primary-50 transition-colors" title="Refresh">
                        <i class="ri-refresh-line text-lg"></i>
                    </button>
                </div>
            </div>
            <div id="ls-table"><div class="flex justify-center py-10"><i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div></div>
        </div>`;
        this.load();
    },

    async load() {
        const res = await App.api('simpanan/laporan-saldo');
        if (!res?.success) return;

        this.data = res.data;
        const totalPokok = res.data.reduce((a, b) => a + parseFloat(b.pokok), 0);
        const totalWajib = res.data.reduce((a, b) => a + parseFloat(b.wajib), 0);
        const totalSukarela = res.data.reduce((a, b) => a + parseFloat(b.sukarela), 0);
        const totalSemua = res.data.reduce((a, b) => a + parseFloat(b.total_saldo), 0);

        this.footer = {
            anggota_nama: 'TOTAL KESELURUHAN',
            pokok: App.formatRupiah(totalPokok),
            wajib: App.formatRupiah(totalWajib),
            sukarela: App.formatRupiah(totalSukarela),
            total_saldo: App.formatRupiah(totalSemua)
        };

        const html = `<div class="table-wrapper">
            <table class="data-table w-full text-sm">
                <thead>
                    <tr class="bg-gray-50 text-gray-500 font-medium">
                        <th class="px-4 py-3 text-left w-12">No</th>
                        <th class="px-4 py-3 text-left">No. Anggota</th>
                        <th class="px-4 py-3 text-left">Nama Anggota</th>
                        <th class="px-4 py-3 text-right">Simp. Pokok</th>
                        <th class="px-4 py-3 text-right">Simp. Wajib</th>
                        <th class="px-4 py-3 text-right">Simp. Sukarela</th>
                        <th class="px-4 py-3 text-right">Total Saldo</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    ${res.data.map((r, i) => `
                        <tr class="hover:bg-gray-50/50 transition-colors">
                            <td class="px-4 py-3 text-gray-400">${i + 1}</td>
                            <td class="px-4 py-3 font-medium text-gray-700">${r.no_anggota}</td>
                            <td class="px-4 py-3 text-gray-600">${r.anggota_nama}</td>
                            <td class="px-4 py-3 text-right font-medium text-gray-700">${App.formatRupiah(r.pokok)}</td>
                            <td class="px-4 py-3 text-right font-medium text-gray-700">${App.formatRupiah(r.wajib)}</td>
                            <td class="px-4 py-3 text-right font-medium text-gray-700">${App.formatRupiah(r.sukarela)}</td>
                            <td class="px-4 py-3 text-right font-bold text-primary-700">${App.formatRupiah(r.total_saldo)}</td>
                        </tr>
                    `).join('')}
                    ${res.data.length === 0 ? '<tr><td colspan="7" class="text-center py-10 text-gray-400">Tidak ada data simpanan</td></tr>' : ''}
                </tbody>
                ${res.data.length > 0 ? `
                <tfoot class="bg-gray-50/50 font-bold border-t border-gray-100">
                    <tr>
                        <td colspan="3" class="px-4 py-3 text-right text-gray-500 uppercase tracking-wider">${this.footer.anggota_nama}</td>
                        <td class="px-4 py-3 text-right text-gray-700">${this.footer.pokok}</td>
                        <td class="px-4 py-3 text-right text-gray-700">${this.footer.wajib}</td>
                        <td class="px-4 py-3 text-right text-gray-700">${this.footer.sukarela}</td>
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
            { title: 'Total Saldo', key: 'total_saldo', align: 'right' }
        ];
    },

    export(type) {
        if (!this.data.length) return;
        const formattedData = this.data.map((r, i) => ({
            ...r,
            no: i + 1,
            pokok: App.formatRupiah(r.pokok),
            wajib: App.formatRupiah(r.wajib),
            sukarela: App.formatRupiah(r.sukarela),
            total_saldo: App.formatRupiah(r.total_saldo)
        }));
        App.export(type, 'Laporan Saldo Simpanan', this.getColumns(), formattedData, {
            filename: 'laporan_simpanan',
            footer: this.footer
        });
    }
};

window.LaporanSimpananPage = LaporanSimpananPage;
export default LaporanSimpananPage;
