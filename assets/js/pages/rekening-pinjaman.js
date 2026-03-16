// Rekening Pinjaman Page (Daftar Akun Pinjaman)
const RekeningPinjamanPage = {
    async render(container, anggotaId = null, page = 1) {
        App.setTitle('Daftar Rekening Pinjaman', 'Manajemen akun pinjaman anggota');

        let url = `rekening-pinjaman?page=${page}`;
        if (anggotaId) url += '&anggota_id=' + anggotaId;

        const res = await App.api(url);
        if (!res?.success) return;

        container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 class="font-semibold text-gray-800">Data Rekening Pinjaman</h3>
                        <p class="text-xs text-gray-400 mt-1">Total ${res.pagination.total} pinjaman terdaftar</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="RekeningPinjamanPage.export('pdf')" class="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Export PDF">
                            <i class="ri-file-pdf-line text-xl"></i>
                        </button>
                        <button onclick="RekeningPinjamanPage.export('csv')" class="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Export CSV">
                            <i class="ri-file-excel-line text-xl"></i>
                        </button>
                        <button onclick="location.hash='#/pinjaman'" class="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-primary-200 transition-all">
                            <i class="ri-add-line"></i> Ajukan Pinjaman Baru
                        </button>
                    </div>
                </div>

                <div class="table-wrapper">
                    <table class="data-table w-full text-sm">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="px-4 py-3 text-left font-medium text-gray-500">No. Rekening/Pinjaman</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-500">Anggota</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-500">Jenis Pinjaman</th>
                                <th class="px-4 py-3 text-right font-medium text-gray-500">Plafond</th>
                                <th class="px-4 py-3 text-right font-medium text-gray-500">Sisa Pinjaman</th>
                                <th class="px-4 py-3 text-center font-medium text-gray-500">Tenor</th>
                                <th class="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                                <th class="px-4 py-3 text-center font-medium text-gray-500">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${res.data.length ? res.data.map(p => `
                                <tr class="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td class="px-4 py-3 font-mono font-bold text-primary-600">${p.no_pinjaman}</td>
                                    <td class="px-4 py-3">
                                        <div class="font-medium text-gray-800">${p.anggota_nama}</div>
                                        <div class="text-[0.7rem] text-gray-400 font-mono">${p.no_anggota}</div>
                                    </td>
                                    <td class="px-4 py-3">${p.jenis_pinjaman}</td>
                                    <td class="px-4 py-3 text-right font-medium text-gray-600">${App.formatRupiah(p.jumlah)}</td>
                                    <td class="px-4 py-3 text-right font-semibold text-amber-600">${App.formatRupiah(p.sisa_pinjaman)}</td>
                                    <td class="px-4 py-3 text-center text-gray-500">${p.tenor} bln</td>
                                    <td class="px-4 py-3 text-center">${this.statusBadge(p.status)}</td>
                                    <td class="px-4 py-3 text-center">
                                        <div class="flex justify-center gap-1">
                                            <button onclick="location.hash='#/pinjaman/detail/${p.id}'" class="p-2 hover:bg-primary-50 rounded-lg text-primary-600 transition-colors" title="Lihat Detail">
                                                <i class="ri-eye-line"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="8" class="text-center py-10 text-gray-400">Belum ada data pinjaman</td></tr>'}
                        </tbody>
                    </table>
                </div>
                ${App.renderPagination(res.pagination, 'RekeningPinjamanPage.goto')}
            </div>
        `;
    },

    statusBadge(status) {
        const colors = {
            'pending': 'bg-amber-50 text-amber-600 border-amber-100',
            'disetujui': 'bg-blue-50 text-blue-600 border-blue-100',
            'ditolak': 'bg-red-50 text-red-600 border-red-100',
            'cair': 'bg-emerald-50 text-emerald-600 border-emerald-100',
            'lunas': 'bg-gray-50 text-gray-500 border-gray-100'
        };
        const color = colors[status] || 'bg-gray-50 text-gray-500 border-gray-100';
        return `<span class="px-2.5 py-1 rounded-full text-[0.7rem] font-bold border ${color} uppercase">${status}</span>`;
    },

    async goto(page) {
        this.render(document.getElementById('app-content'), null, page);
    },

    async export(type) {
        const res = await App.api(`rekening-pinjaman?per_page=1000`);
        if (!res?.success) return;

        const columns = [
            { title: 'No. Pinjaman', key: 'no_pinjaman' },
            { title: 'Anggota', key: 'anggota' },
            { title: 'Jenis Pinjaman', key: 'jenis_pinjaman' },
            { title: 'Plafond', key: 'jumlah', align: 'right' },
            { title: 'Sisa Pinjaman', key: 'sisa_pinjaman', align: 'right' },
            { title: 'Tenor', key: 'tenor', align: 'center' },
            { title: 'Status', key: 'status_label' }
        ];

        const rows = res.data.map(p => ({
            ...p,
            anggota: `${p.anggota_nama} (${p.no_anggota})`,
            jumlah: App.formatRupiah(p.jumlah),
            sisa_pinjaman: App.formatRupiah(p.sisa_pinjaman),
            tenor: p.tenor + ' Bln',
            status_label: p.status.toUpperCase()
        }));

        App.export(type, 'Daftar Rekening Pinjaman', columns, rows, { filename: 'rekening_pinjaman' });
    }
};

window.RekeningPinjamanPage = RekeningPinjamanPage;
export default RekeningPinjamanPage;
