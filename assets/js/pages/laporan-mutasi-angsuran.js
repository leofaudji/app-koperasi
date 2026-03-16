// Laporan Mutasi Angsuran Page
const LaporanMutasiAngsuranPage = {
    data: [],
    from: '',
    to: '',

    async render(container) {
        if (!this.from) this.from = moment().startOf('month').format('YYYY-MM-DD');
        if (!this.to) this.to = moment().endOf('month').format('YYYY-MM-DD');

        App.setTitle('Laporan Mutasi Angsuran', 'Histori pembayaran angsuran pinjaman');
        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <div class="relative">
                        <input type="text" id="lma-date-range" class="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2.5" placeholder="Pilih Periode">
                        <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <i class="ri-calendar-line text-gray-400"></i>
                        </div>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                <div class="flex items-center gap-2">
                    <button onclick="LaporanMutasiAngsuranPage.export('pdf')" class="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
                        <i class="ri-file-pdf-line mr-1"></i> PDF
                    </button>
                    <button onclick="LaporanMutasiAngsuranPage.export('csv')" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
                        <i class="ri-file-excel-line mr-1"></i> CSV
                    </button>
                    <div class="w-px h-6 bg-gray-100 mx-1"></div>
                    <button onclick="LaporanMutasiAngsuranPage.load()" class="text-primary-600 hover:text-primary-700 p-2 rounded-lg hover:bg-primary-50 transition-colors" title="Refresh">
                        <i class="ri-refresh-line text-lg"></i>
                    </button>
                </div>
            </div>
            <div id="lma-table-container">
                <div class="flex justify-center py-10"><i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>
            </div>
        </div>`;

        this.initFilters();
        this.load();
    },

    initFilters() {
        flatpickr("#lma-date-range", {
            mode: "range",
            dateFormat: "Y-m-d",
            defaultDate: [this.from, this.to],
            onClose: (selectedDates) => {
                if (selectedDates.length === 2) {
                    this.from = moment(selectedDates[0]).format('YYYY-MM-DD');
                    this.to = moment(selectedDates[1]).format('YYYY-MM-DD');
                    this.load();
                }
            }
        });
    },

    async load() {
        const container = document.getElementById('lma-table-container');
        container.innerHTML = '<div class="flex justify-center py-10"><i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>';

        const res = await App.api(`pinjaman/laporan-mutasi-angsuran?from=${this.from}&to=${this.to}`);
        if (!res?.success) {
            container.innerHTML = `<div class="text-center py-10 text-red-500">Gagal memuat data: ${res?.message || 'Unknown error'}</div>`;
            return;
        }

        this.data = res.data;
        this.renderTable(this.data);
    },

    renderTable(data) {
        const html = `<div class="table-wrapper">
            <table class="data-table w-full text-sm">
                <thead>
                    <tr class="bg-gray-50 text-gray-500 font-medium">
                        <th class="px-4 py-3 text-left w-12">No</th>
                        <th class="px-4 py-3 text-left">Tgl Bayar</th>
                        <th class="px-4 py-3 text-left">No. Transaksi</th>
                        <th class="px-4 py-3 text-left">Anggota</th>
                        <th class="px-4 py-3 text-left">Keterangan</th>
                        <th class="px-4 py-3 text-right">Pokok</th>
                        <th class="px-4 py-3 text-right">Jasa</th>
                        <th class="px-4 py-3 text-right">Denda</th>
                        <th class="px-4 py-3 text-right font-bold text-gray-700">Total</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    ${data.map((r, i) => `
                        <tr class="hover:bg-gray-50/50 transition-colors">
                            <td class="px-4 py-4 text-gray-400">${i + 1}</td>
                            <td class="px-4 py-4 font-medium">${moment(r.tgl_bayar).format('DD/MM/YYYY')}</td>
                            <td class="px-4 py-4"><span class="font-mono text-xs text-primary-600 font-bold">${r.no_transaksi}</span></td>
                            <td class="px-4 py-4">
                                <div class="font-medium text-gray-800">${r.anggota_nama}</div>
                                <div class="text-[10px] text-gray-400">${r.no_anggota}</div>
                            </td>
                            <td class="px-4 py-4">
                                <div class="text-xs text-gray-600">${r.no_pinjaman}</div>
                                <div class="text-[10px] text-gray-400">Angsuran ke-${r.angsuran_ke}</div>
                            </td>
                            <td class="px-4 py-4 text-right">${App.formatRupiah(r.pokok)}</td>
                            <td class="px-4 py-4 text-right">${App.formatRupiah(r.bunga)}</td>
                            <td class="px-4 py-4 text-right text-red-500">${App.formatRupiah(r.denda)}</td>
                            <td class="px-4 py-4 text-right font-bold text-gray-800">${App.formatRupiah(r.total)}</td>
                        </tr>
                    `).join('')}
                    ${data.length === 0 ? '<tr><td colspan="9" class="text-center py-10 text-gray-400 italic">Tidak ada mutasi angsuran dalam periode ini</td></tr>' : ''}
                </tbody>
                ${data.length > 0 ? `
                <tfoot class="bg-gray-50 font-bold">
                    <tr>
                        <td colspan="5" class="px-4 py-3 text-right">TOTAL</td>
                        <td class="px-4 py-3 text-right">${App.formatRupiah(data.reduce((s, r) => s + parseFloat(r.pokok), 0))}</td>
                        <td class="px-4 py-3 text-right">${App.formatRupiah(data.reduce((s, r) => s + parseFloat(r.bunga), 0))}</td>
                        <td class="px-4 py-3 text-right">${App.formatRupiah(data.reduce((s, r) => s + parseFloat(r.denda), 0))}</td>
                        <td class="px-4 py-3 text-right text-primary-600">${App.formatRupiah(data.reduce((s, r) => s + parseFloat(r.total), 0))}</td>
                    </tr>
                </tfoot>` : ''}
            </table>
        </div>`;
        document.getElementById('lma-table-container').innerHTML = html;
    },

    getColumns() {
        return [
            { title: 'No', key: 'no' },
            { title: 'Tgl Bayar', key: 'tgl' },
            { title: 'No. Transaksi', key: 'no_trx' },
            { title: 'Anggota', key: 'anggota' },
            { title: 'Keterangan', key: 'ket' },
            { title: 'Pokok', key: 'pokok' },
            { title: 'Jasa', key: 'jasa' },
            { title: 'Denda', key: 'denda' },
            { title: 'Total', key: 'total' }
        ];
    },

    export(type) {
        if (!this.data.length) return;
        const formatted = this.data.map((r, i) => ({
            no: i + 1,
            tgl: moment(r.tgl_bayar).format('DD/MM/YYYY'),
            no_trx: r.no_transaksi,
            anggota: `${r.anggota_nama} (${r.no_anggota})`,
            ket: `${r.no_pinjaman} (Ke-${r.angsuran_ke})`,
            pokok: App.formatRupiah(r.pokok),
            jasa: App.formatRupiah(r.bunga),
            denda: App.formatRupiah(r.denda),
            total: App.formatRupiah(r.total)
        }));

        const footer = {
            ket: 'TOTAL',
            pokok: App.formatRupiah(this.data.reduce((s, r) => s + parseFloat(r.pokok), 0)),
            jasa: App.formatRupiah(this.data.reduce((s, r) => s + parseFloat(r.bunga), 0)),
            denda: App.formatRupiah(this.data.reduce((s, r) => s + parseFloat(r.denda), 0)),
            total: App.formatRupiah(this.data.reduce((s, r) => s + parseFloat(r.total), 0))
        };

        App.export(type, `Laporan Mutasi Angsuran (${this.from} - ${this.to})`, this.getColumns(), formatted, {
            filename: 'mutasi_angsuran',
            footer: footer
        });
    }
};

window.LaporanMutasiAngsuranPage = LaporanMutasiAngsuranPage;
export default LaporanMutasiAngsuranPage;
