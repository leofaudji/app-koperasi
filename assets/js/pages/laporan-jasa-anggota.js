// Laporan Pendapatan Jasa Pinjaman (SHU) Page
const LaporanJasaAnggotaPage = {
    data: [],
    footer: null,
    tahun: new Date().getFullYear(),

    async render(container) {
        App.setTitle('Laporan Jasa Pinjaman (SHU)', 'Data pendapatan jasa (bunga) dari setiap anggota');

        let yearOptions = '';
        const currentYear = new Date().getFullYear();
        for (let y = currentYear; y >= currentYear - 10; y--) {
            yearOptions += `<option value="${y}" ${this.tahun == y ? 'selected' : ''}>${y}</option>`;
        }

        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">Pendapatan Jasa Pinjaman</h3>
                    <p class="text-xs text-gray-400 mt-1">Data pendapatan jasa (bunga) per anggota per tahun</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="LaporanJasaAnggotaPage.export('pdf')" class="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-red-100 shadow-sm active:scale-95">
                        <i class="ri-file-pdf-line"></i> PDF
                    </button>
                    <button onclick="LaporanJasaAnggotaPage.export('csv')" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-emerald-100 shadow-sm active:scale-95">
                        <i class="ri-file-excel-line"></i> CSV
                    </button>
                    <div class="w-px h-8 bg-gray-100 mx-1"></div>
                    <button onclick="LaporanJasaAnggotaPage.load()" class="text-gray-500 hover:text-primary-600 p-2.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100" title="Refresh">
                        <i class="ri-refresh-line text-lg"></i>
                    </button>
                </div>
            </div>

            <!-- Filter Row -->
            <div class="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 mb-6">
                <div class="flex flex-col sm:flex-row items-end gap-4">
                    <div class="flex-1 w-full">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Tahun Laporan</label>
                        <div class="relative">
                            <select id="ljp-tahun" class="w-full border border-gray-200 rounded-xl px-10 py-2.5 text-sm font-medium text-primary-700 bg-white focus:ring-2 focus:ring-primary-500 shadow-sm appearance-none" onchange="LaporanJasaAnggotaPage.changeYear(this.value)">
                                ${yearOptions}
                            </select>
                            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <i class="ri-calendar-event-line text-gray-400"></i>
                            </div>
                            <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <i class="ri-arrow-down-s-line text-gray-400"></i>
                            </div>
                        </div>
                    </div>
                    <div class="w-full sm:w-auto">
                         <button onclick="LaporanJasaAnggotaPage.load()" class="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary-500/20 transition-all active:scale-95">
                            Tampilkan
                        </button>
                    </div>
                </div>
            </div>
            <div id="ljp-table"><div class="flex justify-center py-10"><i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div></div>
        </div>`;
        this.load();
    },

    changeYear(year) {
        this.tahun = year;
        this.load();
    },

    async load() {
        document.getElementById('ljp-table').innerHTML = '<div class="flex justify-center py-10"><i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>';

        const res = await App.api(`pinjaman/laporan-jasa-anggota?tahun=${this.tahun}`);
        if (!res?.success) {
            document.getElementById('ljp-table').innerHTML = `<div class="text-center py-10 text-red-500">Gagal memuat data: ${res?.message || 'Unknown error'}</div>`;
            return;
        }

        this.data = res.data;
        const totalJasa = res.data.reduce((a, b) => a + parseFloat(b.total_jasa || 0), 0);
        const totalDenda = res.data.reduce((a, b) => a + parseFloat(b.total_denda || 0), 0);

        this.footer = {
            total_jasa: App.formatRupiah(totalJasa),
            total_denda: App.formatRupiah(totalDenda),
            total_semua: App.formatRupiah(totalJasa + totalDenda)
        };

        const html = `<div class="table-wrapper">
            <table class="data-table w-full text-sm">
                <thead>
                    <tr class="bg-gray-50 text-gray-500 font-medium whitespace-nowrap">
                        <th class="px-4 py-3 text-left w-12">No</th>
                        <th class="px-4 py-3 text-left">No. Anggota</th>
                        <th class="px-4 py-3 text-left">Nama Anggota</th>
                        <th class="px-4 py-3 text-right">Total Jasa Pinjaman</th>
                        <th class="px-4 py-3 text-right">Total Denda</th>
                        <th class="px-4 py-3 text-right">Total Pendapatan</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    ${res.data.map((r, i) => `
                        <tr class="hover:bg-gray-50/50 transition-colors">
                            <td class="px-4 py-3 text-gray-400">${i + 1}</td>
                            <td class="px-4 py-3 font-mono text-xs text-primary-600 font-bold">${r.no_anggota}</td>
                            <td class="px-4 py-3 text-gray-700 font-medium">${r.anggota_nama}</td>
                            <td class="px-4 py-3 text-right text-emerald-600 font-semibold">${App.formatRupiah(r.total_jasa || 0)}</td>
                            <td class="px-4 py-3 text-right text-red-500">${App.formatRupiah(r.total_denda || 0)}</td>
                            <td class="px-4 py-3 text-right font-bold text-gray-800">${App.formatRupiah(parseFloat(r.total_jasa || 0) + parseFloat(r.total_denda || 0))}</td>
                        </tr>
                    `).join('')}
                    ${res.data.length === 0 ? `<tr><td colspan="6" class="text-center py-10 text-gray-400">Tidak ada pendapatan jasa pinjaman di tahun ${this.tahun}</td></tr>` : ''}
                </tbody>
                ${res.data.length > 0 ? `
                <tfoot class="bg-gray-50/50 font-bold border-t border-gray-100">
                    <tr>
                        <td colspan="3" class="px-4 py-3 text-right text-gray-500 uppercase tracking-wider">TOTAL KESELURUHAN</td>
                        <td class="px-4 py-3 text-right text-emerald-700 font-bold text-base">${this.footer.total_jasa}</td>
                        <td class="px-4 py-3 text-right text-red-600 font-bold text-base">${this.footer.total_denda}</td>
                        <td class="px-4 py-3 text-right text-primary-800 font-extrabold text-base">${this.footer.total_semua}</td>
                    </tr>
                </tfoot>` : ''}
            </table>
        </div>`;
        document.getElementById('ljp-table').innerHTML = html;
    },

    getColumns() {
        return [
            { title: 'No', key: 'no' },
            { title: 'No. Anggota', key: 'no_anggota' },
            { title: 'Nama Anggota', key: 'anggota_nama' },
            { title: 'Total Jasa Pnj.', key: 'total_jasa', align: 'right' },
            { title: 'Total Denda', key: 'total_denda', align: 'right' },
            { title: 'Total Pendapatan', key: 'total_semua', align: 'right' }
        ];
    },

    export(type) {
        if (!this.data.length) return;
        const title = `Laporan Pendapatan Jasa Pinjaman - Tahun ${this.tahun}`;
        const fileName = `laporan_jasa_pinjaman_${this.tahun}`;

        const formattedData = this.data.map((r, i) => {
            const tjasa = parseFloat(r.total_jasa || 0);
            const tdenda = parseFloat(r.total_denda || 0);
            return {
                no: i + 1,
                no_anggota: r.no_anggota,
                anggota_nama: r.anggota_nama,
                total_jasa: App.formatRupiah(tjasa),
                total_denda: App.formatRupiah(tdenda),
                total_semua: App.formatRupiah(tjasa + tdenda)
            };
        });

        const customFooter = {
            anggota_nama: 'TOTAL KESELURUHAN',
            total_jasa: this.footer.total_jasa,
            total_denda: this.footer.total_denda,
            total_semua: this.footer.total_semua
        };

        App.export(type, title, this.getColumns(), formattedData, {
            filename: fileName,
            footer: customFooter
        });
    }
};

window.LaporanJasaAnggotaPage = LaporanJasaAnggotaPage;
export default LaporanJasaAnggotaPage;
