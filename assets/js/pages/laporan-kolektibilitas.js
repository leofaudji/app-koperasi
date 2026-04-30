const KolektibilitasPage = {
    async render(container) {
        if (!App.hasPerm('laporan.view')) {
            container.innerHTML = '<div class="p-8 text-center text-red-500">Akses ditolak</div>';
            return App.toast('Akses ditolak', 'error');
        }

        App.setTitle('Laporan Kolektibilitas (NPL)', 'Pemantauan kelancaran pinjaman aktif');

        container.innerHTML = `
            <div class="space-y-6 animate-fadeIn">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <div class="p-2 bg-rose-50 rounded-xl"><i class="ri-pie-chart-2-fill text-rose-500"></i></div>
                            Laporan Kolektibilitas & NPL
                        </h2>
                        <p class="text-gray-500 text-sm mt-1">Pemantauan kelancaran pinjaman aktif berdasarkan hari keterlambatan</p>
                    </div>
                    <div class="flex gap-2 w-full sm:w-auto">
                        <button onclick="KolektibilitasPage.export('pdf')" class="w-full sm:w-auto bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                            <i class="ri-file-pdf-line"></i> PDF
                        </button>
                        <button onclick="KolektibilitasPage.export('csv')" class="w-full sm:w-auto bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                            <i class="ri-file-excel-line"></i> CSV
                        </button>
                        <button onclick="window.print()" class="w-full sm:w-auto bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                            <i class="ri-printer-line"></i> Print
                        </button>
                        <button onclick="KolektibilitasPage.loadData(true)" class="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                            <i class="ri-refresh-line"></i> Refresh
                        </button>
                    </div>
                </div>

                <!-- Stats Summary -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kol-stats">
                    <div class="col-span-full text-center py-10 text-gray-400"><i class="ri-loader-4-line animate-spin text-2xl"></i></div>
                </div>

                <!-- Rekap per Kolektibilitas -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                    <h3 class="font-bold text-gray-800 mb-4 flex items-center text-lg"><i class="ri-bar-chart-grouped-line text-blue-500 mr-2"></i>Distribusi Kolektibilitas (Filter)</h3>
                    <div class="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4" id="kol-dist"></div>
                </div>

                <!-- Datatable -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h3 class="font-bold text-gray-800 flex items-center"><i class="ri-file-list-3-line text-gray-400 mr-2"></i>Rincian Pinjaman Aktif</h3>
                            <div class="relative w-64 hidden sm:block">
                            </div>
                        </div>
                        <div class="overflow-x-auto flex-1">
                            <table class="w-full text-left border-collapse">
                                <thead>
                                    <tr class="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                                        <th class="p-4 font-semibold">Anggota</th>
                                        <th class="p-4 font-semibold">Pinjaman</th>
                                        <th class="p-4 font-semibold text-right">Baki Debet</th>
                                        <th class="p-4 font-semibold text-center">Hari Telat</th>
                                        <th class="p-4 font-semibold text-center">Kolektibilitas</th>
                                    </tr>
                                </thead>
                                <tbody id="kol-table" class="divide-y divide-gray-100 text-sm"></tbody>
                            </table>
                        </div>
                    </div>
                </div>

            </div>
            
            <style>
                @media print {
                    body * { visibility: hidden; }
                    #app, #app * { visibility: visible; }
                    #app { position: absolute; left: 0; top: 0; width: 100%; }
                    .bg-gray-50 { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; }
                    button, .ri-refresh-line { display: none !important; }
                    .shadow-sm, .rounded-2xl { box-shadow: none !important; border-radius: 0 !important; }
                    .border { border-color: #e5e7eb !important; }
                }
            </style>
        `;

        this.init();
    },

    async init() {
        this._selectedKolek = null;
        this._data = null;
        this.loadData();
    },

    async loadData(isRefresh = false) {
        if (!this._data || isRefresh) {
            const statsEl = document.getElementById('kol-stats');
            const tbody = document.getElementById('kol-table');
            if (statsEl) statsEl.innerHTML = '<div class="col-span-full text-center py-6 text-gray-400"><i class="ri-loader-4-line animate-spin text-2xl"></i></div>';
            if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="text-center py-8 text-gray-400">Memuat data...</td></tr>';

            const res = await App.api('laporan-kolektibilitas');
            if (!res?.success) {
                if (tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-500">${res?.message || 'Gagal memuat data'}</td></tr>`;
                return;
            }
            this._data = res.data;
            this._selectedKolek = null; // Reset filter on refresh
        }
        this.renderAll();
    },

    renderAll() {
        this.renderSummary();
        this.renderDistribusi();
        this.renderTable();
    },

    renderSummary() {
        const statsEl = document.getElementById('kol-stats');
        if (!statsEl || !this._data) return;
        const sum = this._data.summary;

        statsEl.innerHTML = `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div class="relative z-10">
                    <p class="text-sm font-medium text-gray-500 mb-1">Total Outstanding (Baki Debet)</p>
                    <h3 class="text-2xl font-bold text-gray-900">${App.formatRupiah(sum.total.nominal)}</h3>
                    <div class="mt-2 flex items-center text-xs text-gray-500">
                        <span class="font-medium bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md mr-2">${sum.total.count} Rekening</span> Aktif
                    </div>
                </div>
            </div>
            
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div class="relative z-10">
                    <p class="text-sm font-medium text-gray-500 mb-1">Kredit Lancar (Kol 1)</p>
                    <h3 class="text-2xl font-bold text-emerald-600">${App.formatRupiah(sum.lancar.nominal)}</h3>
                    <div class="mt-2 flex items-center text-xs text-gray-500">
                        <span class="font-medium bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md mr-2">${sum.lancar.count} Rekening</span> Tepat waktu
                    </div>
                </div>
            </div>

            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden group">
                <div class="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                <div class="relative z-10">
                    <p class="text-sm font-medium text-gray-500 mb-1">Total NPL (Kol 3, 4, 5)</p>
                    <h3 class="text-2xl font-bold text-rose-600">${App.formatRupiah(sum.total_npl.nominal)}</h3>
                    <div class="mt-2 flex items-center text-xs text-gray-500">
                        <span class="font-medium bg-rose-50 text-rose-600 px-2 py-0.5 rounded-md mr-2">${sum.total_npl.count} Rekening</span> Bermasalah
                    </div>
                </div>
            </div>

             <div class="bg-gradient-to-br from-gray-900 to-gray-800 p-5 rounded-2xl shadow-lg relative overflow-hidden">
                <div class="absolute -right-4 -bottom-4 opacity-10">
                    <i class="ri-percent-line text-8xl"></i>
                </div>
                <div class="relative z-10 text-white">
                    <p class="text-sm font-medium text-gray-400 mb-1">Rasio NPL</p>
                    <div class="flex items-baseline gap-2">
                        <h3 class="text-4xl font-black ${this._data.npl_ratio > 5 ? 'text-rose-400' : 'text-emerald-400'}">${this._data.npl_ratio}%</h3>
                    </div>
                    <div class="mt-2 text-xs text-gray-300">
                        Ambang batas sehat < 5%
                    </div>
                </div>
            </div>
        `;
    },

    renderDistribusi() {
        const distEl = document.getElementById('kol-dist');
        if (!distEl || !this._data) return;
        const sum = this._data.summary;

        const distItems = [
            { id: 1, label: 'Lancar', val: sum.lancar, color: 'emerald', sub: '0 hari' },
            { id: 2, label: 'DPK', val: sum.dpk, color: 'blue', sub: '1 - 90 hari' },
            { id: 3, label: 'Kurang Lancar', val: sum.kurang_lancar, color: 'amber', sub: '91 - 120 hari' },
            { id: 4, label: 'Diragukan', val: sum.diragukan, color: 'orange', sub: '121 - 180 hari' },
            { id: 5, label: 'Macet', val: sum.macet, color: 'rose', sub: '> 180 hari' }
        ];

        distEl.innerHTML = distItems.map(item => {
            const pct = sum.total.nominal > 0 ? ((item.val.nominal / sum.total.nominal) * 100).toFixed(1) : 0;
            const isActive = this._selectedKolek === item.id;

            return `
                <div onclick="KolektibilitasPage.setFilter(${item.id})" class="group cursor-pointer p-3 rounded-xl transition-all ${isActive ? `bg-${item.color}-50 ring-2 ring-${item.color}-500 shadow-sm` : 'hover:bg-gray-50'}">
                    <div class="flex justify-between items-end mb-1">
                        <div>
                            <div class="text-sm font-bold ${isActive ? `text-${item.color}-700` : 'text-gray-700'}">${item.label}</div>
                            <div class="text-xs text-gray-400 font-medium">${item.sub} &bull; ${item.val.count} rek</div>
                        </div>
                        <div class="text-right">
                            <div class="text-sm font-bold text-gray-900">${App.formatRupiah(item.val.nominal)}</div>
                            <div class="text-xs font-bold text-${item.color}-600">${pct}%</div>
                        </div>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                        <div class="bg-${item.color}-500 h-1.5 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');

        // Reset filter option
        if (this._selectedKolek) {
            distEl.insertAdjacentHTML('beforeend', `
                <button onclick="KolektibilitasPage.setFilter(null)" class="w-full mt-4 text-xs font-bold text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-200 rounded-lg hover:border-gray-400 transition-all">
                    <i class="ri-close-circle-line"></i> Reset Filter Kategori
                </button>
            `);
        }
    },

    renderTable() {
        const tbody = document.getElementById('kol-table');
        if (!tbody || !this._data) return;

        let filtered = this._data.detail;
        if (this._selectedKolek) {
            filtered = filtered.filter(p => p.kolektibilitas === this._selectedKolek);
        }

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center py-10 text-gray-400">
                <i class="ri-information-line text-2xl block mb-2"></i>
                Tidak ada data pinjaman untuk kategori ini
            </td></tr>`;
            return;
        }

        const getBadge = (kol, label) => {
            const colors = {
                1: 'bg-emerald-50 text-emerald-600 ring-emerald-500/20',
                2: 'bg-blue-50 text-blue-600 ring-blue-500/20',
                3: 'bg-amber-50 text-amber-600 ring-amber-500/20',
                4: 'bg-orange-50 text-orange-600 ring-orange-500/20',
                5: 'bg-rose-50 text-rose-600 ring-rose-500/20'
            };
            const c = colors[kol] || colors[1];
            return `<span class="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold ring-1 ring-inset ${c}">${label} (Kol ${kol})</span>`;
        };

        tbody.innerHTML = filtered.map(p => `
            <tr class="hover:bg-gray-50/50 transition-colors">
                <td class="p-4">
                    <div class="font-semibold text-gray-800">${p.anggota_nama}</div>
                    <div class="text-xs text-gray-500 font-mono mt-0.5">${p.no_anggota}</div>
                </td>
                <td class="p-4">
                    <div class="text-sm text-gray-700">${p.jenis_pinjaman}</div>
                    <div class="text-xs text-gray-400 font-mono mt-0.5">${p.no_pinjaman}</div>
                </td>
                <td class="p-4 text-right">
                    <div class="font-medium text-gray-900">${App.formatRupiah(p.sisa_pinjaman)}</div>
                </td>
                <td class="p-4 text-center">
                    ${p.hari_telat > 0
                ? `<span class="font-semibold ${p.hari_telat > 90 ? 'text-red-500' : 'text-amber-500'}">${p.hari_telat} Hari</span>`
                : `<span class="text-gray-400">-</span>`}
                </td>
                <td class="p-4 text-center">
                    ${getBadge(p.kolektibilitas, p.kolektibilitas_label)}
                </td>
            </tr>
        `).join('');
    },

    setFilter(kol) {
        if (this._selectedKolek === kol) {
            this._selectedKolek = null;
        } else {
            this._selectedKolek = kol;
        }
        this.renderDistribusi();
        this.renderTable();
    },

    export(type) {
        if (!this._data) return;
        let filtered = this._data.detail;
        if (this._selectedKolek) {
            filtered = filtered.filter(p => p.kolektibilitas === this._selectedKolek);
        }

        const columns = [
            { title: 'Anggota', key: 'anggota' },
            { title: 'Pinjaman', key: 'pinjaman' },
            { title: 'No. Pinjaman', key: 'no_pinjaman' },
            { title: 'Baki Debet', key: 'saldo', align: 'right' },
            { title: 'Hari Telat', key: 'hari', align: 'center' },
            { title: 'Kolektibilitas', key: 'kolek_label' }
        ];

        const rows = filtered.map(p => ({
            anggota: `${p.anggota_nama} (${p.no_anggota})`,
            pinjaman: p.jenis_pinjaman,
            no_pinjaman: p.no_pinjaman,
            saldo: App.formatRupiah(p.sisa_pinjaman),
            hari: (p.hari_telat || 0) + ' Hari',
            kolek_label: `${p.kolektibilitas_label} (Kol ${p.kolektibilitas})`
        }));

        const title = this._selectedKolek
            ? `Laporan Kolektibilitas - Kategori Kol ${this._selectedKolek}`
            : 'Laporan Kolektibilitas & NPL';

        App.export(type, title, columns, rows, { filename: 'laporan_kolektibilitas' });
    }
};

window.KolektibilitasPage = KolektibilitasPage;
export default KolektibilitasPage;
