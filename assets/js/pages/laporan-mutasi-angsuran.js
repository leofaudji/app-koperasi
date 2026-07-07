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
            <!-- Header -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">Daftar Mutasi Angsuran</h3>
                    <p class="text-xs text-gray-400 mt-1">Histori pembayaran angsuran pinjaman</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="LaporanMutasiAngsuranPage.export('pdf')" class="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-red-100">
                        <i class="ri-file-pdf-line"></i> PDF
                    </button>
                    <button onclick="LaporanMutasiAngsuranPage.export('csv')" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-emerald-100">
                        <i class="ri-file-excel-line"></i> CSV
                    </button>
                    <div class="w-px h-8 bg-gray-100 mx-1"></div>
                    <button onclick="LaporanMutasiAngsuranPage.load()" class="text-gray-500 hover:text-primary-600 p-2.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100" title="Refresh">
                        <i class="ri-refresh-line text-lg"></i>
                    </button>
                </div>
            </div>

            <!-- Filter Row -->
            <div class="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 mb-6">
                <div class="flex flex-col sm:flex-row items-end gap-4">
                    <div class="flex-1 w-full">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Periode Transaksi</label>
                        <div class="relative">
                            <input type="text" id="lma-date-range" class="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2.5 shadow-sm" placeholder="Pilih Periode">
                            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <i class="ri-calendar-line text-gray-400"></i>
                            </div>
                        </div>
                    </div>
                    <div class="w-full sm:w-48">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Metode Pembayaran</label>
                        <select id="lma-metode" onchange="LaporanMutasiAngsuranPage.metode = this.value; LaporanMutasiAngsuranPage.load()" class="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 shadow-sm">
                            <option value="">Semua Metode</option>
                            <option value="tunai">Tunai</option>
                            <option value="transfer">Transfer</option>
                        </select>
                    </div>
                    <div class="w-full sm:w-auto">
                         <button onclick="LaporanMutasiAngsuranPage.load()" class="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary-500/20 transition-all active:scale-95">
                            Tampilkan Data
                        </button>
                    </div>
                </div>
            </div>

            <div id="lma-table-container">
                <div class="flex justify-center py-10"><i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>
            </div>
        </div>`;

        this.metode = '';
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

        const res = await App.api(`pinjaman/laporan-mutasi-angsuran?from=${this.from}&to=${this.to}&metode_pembayaran=${this.metode || ''}`);
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
                        <th class="px-4 py-3 text-left">Transaksi</th>
                        <th class="px-4 py-3 text-left">Anggota</th>
                        <th class="px-4 py-3 text-left">Keterangan</th>
                        <th class="px-4 py-3 text-right w-48">Rincian (P / J / D)</th>
                        <th class="px-4 py-3 text-right font-bold text-gray-700">Total</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    ${data.map((r, i) => `
                        <tr class="hover:bg-gray-50/50 transition-colors">
                            <td class="px-4 py-4 text-gray-400">${i + 1}</td>
                            <td class="px-4 py-4">
                                <div class="font-medium text-gray-800">${moment(r.tgl_bayar).format('DD/MM/YYYY')}</div>
                                <div class="font-mono text-[10px] text-primary-600 font-bold mt-0.5">${r.no_transaksi}</div>
                            </td>
                            <td class="px-4 py-4">
                                <div class="font-medium text-gray-800">${r.anggota_nama}</div>
                                <div class="text-[10px] text-gray-400">${r.no_anggota}</div>
                            </td>
                            <td class="px-4 py-4">
                                <div class="text-xs text-gray-600">${r.no_pinjaman}</div>
                                <div class="text-[10px] ${r.is_pelunasan ? 'text-emerald-600 font-bold' : 'text-gray-400'}">${r.is_pelunasan ? r.angsuran_ke : `Angsuran ke-${r.angsuran_ke}`}</div>
                            </td>
                            <td class="px-4 py-4 text-right text-xs">
                                <div class="flex justify-between gap-4">
                                    <span class="text-gray-400">P:</span>
                                    <span class="font-medium text-gray-700">${App.formatRupiah(r.pokok)}</span>
                                </div>
                                <div class="flex justify-between gap-4">
                                    <span class="text-gray-400">J:</span>
                                    <span class="font-medium text-gray-700">${App.formatRupiah(r.bunga)}</span>
                                </div>
                                <div class="flex justify-between gap-4">
                                    <span class="text-gray-400">D:</span>
                                    <span class="${parseFloat(r.denda) > 0 ? 'text-red-500 font-bold' : 'text-gray-700'}">${App.formatRupiah(r.denda)}</span>
                                </div>
                            </td>
                            <td class="px-4 py-4 text-right font-bold text-gray-800">${App.formatRupiah(r.total)}</td>
                        </tr>
                    `).join('')}
                    ${data.length === 0 ? '<tr><td colspan="6" class="text-center py-10 text-gray-400 italic">Tidak ada mutasi angsuran dalam periode ini</td></tr>' : ''}
                </tbody>
                ${data.length > 0 ? `
                <tfoot class="bg-gray-50 font-bold">
                    <tr>
                        <td colspan="4" class="px-4 py-3 text-right text-gray-500">TOTAL</td>
                        <td class="px-4 py-3 text-right text-xs">
                            <div class="flex justify-between gap-4">
                                <span class="text-gray-400">P:</span>
                                <span class="text-gray-700">${App.formatRupiah(data.reduce((s, r) => s + parseFloat(r.pokok), 0))}</span>
                            </div>
                            <div class="flex justify-between gap-4">
                                <span class="text-gray-400">J:</span>
                                <span class="text-gray-700">${App.formatRupiah(data.reduce((s, r) => s + parseFloat(r.bunga), 0))}</span>
                            </div>
                            <div class="flex justify-between gap-4">
                                <span class="text-gray-400">D:</span>
                                <span class="text-gray-700">${App.formatRupiah(data.reduce((s, r) => s + parseFloat(r.denda), 0))}</span>
                            </div>
                        </td>
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
            { title: 'Transaksi', key: 'transaksi' },
            { title: 'Anggota', key: 'anggota' },
            { title: 'Keterangan', key: 'ket' },
            { title: 'Rincian (Pokok/Jasa/Denda)', key: 'rincian' },
            { title: 'Total', key: 'total' }
        ];
    },

    export(type) {
        if (!this.data.length) return;
        const formatted = this.data.map((r, i) => ({
            no: i + 1,
            transaksi: `${moment(r.tgl_bayar).format('DD/MM/YYYY')} - ${r.no_transaksi}`,
            anggota: `${r.anggota_nama} (${r.no_anggota})`,
            ket: `${r.no_pinjaman} (${r.is_pelunasan ? r.angsuran_ke : `Ke-${r.angsuran_ke}`})`,
            rincian: `P: ${App.formatRupiah(r.pokok)} | J: ${App.formatRupiah(r.bunga)} | D: ${App.formatRupiah(r.denda)}`,
            total: App.formatRupiah(r.total)
        }));

        const footer = {
            ket: 'TOTAL',
            rincian: `P: ${App.formatRupiah(this.data.reduce((s, r) => s + parseFloat(r.pokok), 0))} | J: ${App.formatRupiah(this.data.reduce((s, r) => s + parseFloat(r.bunga), 0))} | D: ${App.formatRupiah(this.data.reduce((s, r) => s + parseFloat(r.denda), 0))}`,
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
