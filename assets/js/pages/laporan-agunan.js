// Laporan Daftar Agunan Page
const LaporanAgunanPage = {
    data: [],

    async render(container) {
        App.setTitle('Laporan Daftar Agunan', 'Daftar jaminan/agunan dari pinjaman anggota');
        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div class="flex items-center gap-3">
                    <h3 class="font-semibold text-gray-800">Data Agunan Pinjaman</h3>
                    <select id="lag-filter-tipe" class="border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-50 focus:ring-2 focus:ring-amber-500 focus:outline-none" onchange="LaporanAgunanPage.filterData(this.value)">
                        <option value="">Semua Tipe</option>
                        <option value="Sertifikat Tanah (SHM/SHGB)">Sertifikat Tanah</option>
                        <option value="BPKB Kendaraan">BPKB Kendaraan</option>
                        <option value="Deposito/Simpanan">Deposito/Simpanan</option>
                        <option value="Lainnya">Lainnya / Manual</option>
                    </select>
                </div>
                <div class="flex items-center gap-2">
                <div class="flex items-center gap-2">
                    <button onclick="LaporanAgunanPage.export('pdf')" class="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
                        <i class="ri-file-pdf-line mr-1"></i> PDF
                    </button>
                    <button onclick="LaporanAgunanPage.export('csv')" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
                        <i class="ri-file-excel-line mr-1"></i> CSV
                    </button>
                    <div class="w-px h-6 bg-gray-100 mx-1"></div>
                    <button onclick="LaporanAgunanPage.load()" class="text-primary-600 hover:text-primary-700 p-2 rounded-lg hover:bg-primary-50 transition-colors" title="Refresh">
                        <i class="ri-refresh-line text-lg"></i>
                    </button>
                </div>
            </div>
            <div id="lag-table"><div class="flex justify-center py-10"><i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div></div>
        </div>`;
        this.load();
    },

    async load() {
        document.getElementById('lag-table').innerHTML = '<div class="flex justify-center py-10"><i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>';
        const res = await App.api('pinjaman/laporan-agunan');
        if (!res?.success) {
            document.getElementById('lag-table').innerHTML = `<div class="text-center py-10 text-red-500">Gagal memuat data: ${res?.message || 'Unknown error'}</div>`;
            return;
        }

        this.data = res.data;
        this.renderTable(this.data);
    },

    filterData(tipe) {
        if (!tipe) {
            this.renderTable(this.data);
            return;
        }

        const filtered = this.data.filter(r => {
            if (tipe === 'Lainnya') {
                return typeof r.agunan !== 'object';
            }
            return typeof r.agunan === 'object' && r.agunan.tipe === tipe;
        });
        this.renderTable(filtered);
    },

    renderTable(data) {
        const html = `<div class="table-wrapper">
            <table class="data-table w-full text-sm">
                <thead>
                    <tr class="bg-gray-50 text-gray-500 font-medium">
                        <th class="px-4 py-3 text-left w-12">No</th>
                        <th class="px-4 py-3 text-left">Peminjam</th>
                        <th class="px-4 py-3 text-left">Pinjaman</th>
                        <th class="px-4 py-3 text-left">Tipe Agunan</th>
                        <th class="px-4 py-3 text-left">Detail Jaminan</th>
                        <th class="px-4 py-3 text-center">Status</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    ${data.map((r, i) => {
            let tipeStr = 'Lainnya';
            let detailHtml = '';

            if (typeof r.agunan === 'object' && r.agunan.tipe) {
                tipeStr = r.agunan.tipe;
                detailHtml = `<div class="text-xs space-y-1">
                                ${Object.entries(r.agunan.data || {}).map(([k, v]) => `
                                    <div class="flex gap-2">
                                        <span class="text-gray-400 w-24 shrink-0">${k}:</span>
                                        <span class="font-medium text-gray-700">${v}</span>
                                    </div>
                                `).join('')}
                            </div>`;
            } else {
                detailHtml = `<div class="text-sm text-gray-600">${r.agunan || '-'}</div>`;
            }

            return `<tr class="hover:bg-gray-50/50 transition-colors align-top">
                            <td class="px-4 py-4 text-gray-400">${i + 1}</td>
                            <td class="px-4 py-4">
                                <div class="font-medium text-gray-800">${r.anggota_nama}</div>
                                <div class="text-xs font-mono text-gray-400 mt-0.5">${r.no_anggota}</div>
                            </td>
                            <td class="px-4 py-4">
                                <div class="font-mono text-xs text-primary-600 font-bold">${r.no_pinjaman}</div>
                                <div class="text-xs text-gray-500 mt-0.5">${r.jenis_pinjaman}</div>
                                <div class="text-xs font-semibold text-gray-700 mt-1">${App.formatRupiah(r.jumlah)}</div>
                            </td>
                            <td class="px-4 py-4">
                                <span class="inline-block px-2 py-1 ${this.getTipeColor(tipeStr)} text-[10px] font-bold rounded-lg uppercase tracking-wider">${tipeStr}</span>
                            </td>
                            <td class="px-4 py-4">
                                ${detailHtml}
                            </td>
                            <td class="px-4 py-4 text-center">
                                ${App.statusBadge(r.status)}
                            </td>
                        </tr>`;
        }).join('')}
                    ${data.length === 0 ? '<tr><td colspan="6" class="text-center py-10 text-gray-400 italic">Tidak ada data agunan ditemukan</td></tr>' : ''}
                </tbody>
            </table>
        </div>`;
        document.getElementById('lag-table').innerHTML = html;
    },

    getTipeColor(tipe) {
        if (tipe.includes('Sertifikat')) return 'bg-emerald-100 text-emerald-800';
        if (tipe.includes('BPKB')) return 'bg-blue-100 text-blue-800';
        if (tipe.includes('Deposito')) return 'bg-amber-100 text-amber-800';
        return 'bg-gray-100 text-gray-800';
    },

    getColumns() {
        return [
            { title: 'No', key: 'no' },
            { title: 'Nama Anggota', key: 'anggota_nama' },
            { title: 'No. Pinjaman', key: 'no_pinjaman' },
            { title: 'Tipe Agunan', key: 'tipe' },
            { title: 'Detail Agunan', key: 'detail' },
            { title: 'Status', key: 'status' }
        ];
    },

    export(type) {
        if (!this.data.length) return;
        const formattedData = this.prepareExportData();
        App.export(type, 'Laporan Daftar Agunan Pinjaman', this.getColumns(), formattedData, {
            filename: 'laporan_agunan'
        });
    },

    prepareExportData() {
        return this.data.map((r, i) => {
            let tipeStr = 'Lainnya';
            let detailStr = '';

            if (typeof r.agunan === 'object' && r.agunan.tipe) {
                tipeStr = r.agunan.tipe;
                detailStr = Object.entries(r.agunan.data || {}).map(([k, v]) => `${k}: ${v}`).join('; ');
            } else {
                detailStr = r.agunan || '-';
            }

            return {
                no: i + 1,
                anggota_nama: `${r.anggota_nama} (${r.no_anggota})`,
                no_pinjaman: r.no_pinjaman,
                tipe: tipeStr,
                detail: detailStr,
                status: r.status.toUpperCase()
            };
        });
    }
};

window.LaporanAgunanPage = LaporanAgunanPage;
export default LaporanAgunanPage;
