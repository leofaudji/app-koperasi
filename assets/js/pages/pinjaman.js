// Pinjaman Page
const PinjamanPage = {
    page: 1,
    async render(container, id = null) {
        this.container = container;
        if (id) {
            App.setTitle('Detail Pinjaman', 'Informasi lengkap pengajuan pinjaman');
            this.loadDetail(container, id);
        } else {
            App.setTitle('Daftar Pinjaman', 'Kelola pinjaman anggota');
            this.loadList(container);
        }
    },

    async loadDetail(container, id) {
        const res = await App.api(`pinjaman/${id}`);
        if (!res?.success) {
            container.innerHTML = '<div class="p-6 text-center text-red-500">Gagal memuat detail pinjaman</div>';
            return;
        }

        const p = res.data;
        this.currentData = p;
        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex items-center justify-between mb-6">
                <button onclick="location.hash='#/pinjaman'" class="text-gray-500 hover:text-gray-700 font-medium flex items-center gap-2"><i class="ri-arrow-left-line"></i> Kembali</button>
                <div class="flex items-center gap-2">
                    ${App.statusBadge(p.status)}
                    ${p.status === 'pending' && App.hasPerm('pinjaman.approve') ? `<button onclick="PinjamanPage.approve(${p.id})" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium ml-2"><i class="ri-check-line mr-1"></i>Setujui</button><button onclick="PinjamanPage.reject(${p.id})" class="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium"><i class="ri-close-line mr-1"></i>Tolak</button>` : ''}
                    ${p.status === 'cair' && App.hasPerm('angsuran.create') ? `<button onclick="PinjamanPage.pelunasan(${p.id})" class="bg-gradient-to-r from-violet-600 to-primary-600 hover:from-violet-700 hover:to-primary-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium ml-2 flex items-center gap-1.5 shadow-md"><i class="ri-checkbox-circle-line"></i>Lunasi Sekarang</button>` : ''}
                    ${p.status === 'cair' && App.hasPerm('pinjaman.approve') ? `<button onclick="PinjamanPage.confirmReverse(${p.id}, '${p.no_pinjaman}')" class="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-medium ml-2 flex items-center gap-1" title="Batalkan Pencairan (Reversal)"><i class="ri-arrow-go-back-line"></i> Reversal</button>` : ''}
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informasi Peminjam</h4>
                    <div class="bg-gray-50 rounded-xl p-4 border border-gray-100 space-y-3">
                        <div><div class="text-xs text-gray-500">Nama Anggota</div><div class="font-medium text-gray-800">${p.anggota_nama}</div></div>
                        <div><div class="text-xs text-gray-500">No. Anggota</div><div class="font-mono text-sm text-gray-600">${p.no_anggota}</div></div>
                    </div>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informasi Pinjaman</h4>
                    <div class="bg-blue-50/50 rounded-xl p-4 border border-blue-100 space-y-3">
                        <div class="flex justify-between">
                            <div><div class="text-xs text-gray-500">No. Pinjaman</div><div class="font-mono font-medium text-primary-700">${p.no_pinjaman}</div></div>
                            <div class="text-right"><div class="text-xs text-gray-500">Jenis Pinjaman</div><div class="font-medium text-gray-800">${p.jenis_pinjaman}</div></div>
                        </div>
                        <div class="flex justify-between items-center border-t border-blue-100/50 pt-2">
                            <div><div class="text-xs text-gray-500">Jumlah Pinjaman</div><div class="font-bold text-gray-800 text-lg">${App.formatRupiah(p.jumlah)}</div></div>
                            <div class="text-right"><div class="text-xs text-gray-500">Tenor</div><div class="font-medium text-gray-800">${p.tenor} Bulan (${p.bunga_persen}%)</div></div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="mb-8">
                <h4 class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Detail Tambahan</h4>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="border border-gray-100 rounded-xl p-4">
                        <div class="text-xs text-gray-500 mb-2">Agunan / Jaminan</div>
                        ${(() => {
                // Helper render satu item agunan
                const renderItem = (agu, prefix = '') => {
                    if (!agu || typeof agu !== 'object' || !agu.tipe) return '';
                    return `<div class="space-y-1.5">
                        <div class="inline-block px-2 py-1 bg-amber-100 text-amber-800 text-xs font-semibold rounded-lg mb-1">${prefix}${agu.tipe}</div>
                        <div class="grid gap-1.5">
                        ${Object.entries(agu.data || {}).map(([k, v]) => `
                            <div class="flex justify-between border-b border-gray-50 pb-1 last:border-0">
                                <span class="text-xs text-gray-500 break-words w-1/3">${k}</span>
                                <span class="text-sm font-medium text-gray-800 text-right w-2/3">${v}</span>
                            </div>`).join('')}
                        </div>
                    </div>`;
                };

                if (!p.agunan) return '<div class="text-gray-400 italic text-sm">Tidak ada agunan</div>';

                // Array of agunan
                if (Array.isArray(p.agunan)) {
                    return p.agunan.map((a, i) =>
                        `<div class="border border-gray-100 rounded-lg p-3 mb-2 last:mb-0">${renderItem(a, `#${i + 1} `)}</div>`
                    ).join('');
                }

                // Single object
                if (typeof p.agunan === 'object' && p.agunan.tipe) {
                    return renderItem(p.agunan);
                }

                return `<div class="text-sm font-medium text-amber-700">${p.agunan}</div>`;
            })()}
                    </div>
                    <div class="border border-gray-100 rounded-xl p-4">
                        <div class="text-xs text-gray-500 mb-1">Keterangan</div>
                        <div class="text-sm ${p.keterangan ? 'text-gray-700' : 'text-gray-400 italic'}">${p.keterangan || 'Tidak ada keterangan'}</div>
                    </div>
                </div>
            </div>

            <!-- Disbursement Costs -->
            ${(p.biaya_pencairan || []).length ? `
            <div class="mb-8 animate-fadeIn">
                <h4 class="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <i class="ri-calculator-line text-amber-500"></i> Rincian Biaya Pencairan
                </h4>
                <div class="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-100/50">
                            <tr>
                                <th class="px-4 py-2 text-left text-gray-500 font-medium">Keterangan</th>
                                <th class="px-4 py-2 text-right text-gray-500 font-medium">Jumlah</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${p.biaya_pencairan.map(b => `
                            <tr>
                                <td class="px-4 py-2 text-gray-600">${b.nama_biaya}</td>
                                <td class="px-4 py-2 text-right font-medium text-red-600">-${App.formatRupiah(b.jumlah)}</td>
                            </tr>`).join('')}
                        </tbody>
                        <tfoot class="bg-amber-50/50 font-bold border-t border-amber-100">
                            <tr>
                                <td class="px-4 py-2 text-amber-900">Total Potongan Biaya</td>
                                <td class="px-4 py-2 text-right text-amber-600">${App.formatRupiah(p.total_biaya || 0)}</td>
                            </tr>
                            <tr class="text-emerald-700 bg-emerald-50/30">
                                <td class="px-4 py-2">Diterima Bersih (Net)</td>
                                <td class="px-4 py-2 text-right text-lg">${App.formatRupiah(p.jumlah - (p.total_biaya || 0))}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>` : ''}

            <div class="border border-gray-200 rounded-xl overflow-hidden mb-8">
                <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h4 class="font-semibold text-gray-700 text-sm">Jadwal Angsuran</h4>
                    ${p.status !== 'ditolak' ? `
                    <button onclick="PinjamanPage.exportApprovalLetter(PinjamanPage.currentData)" class="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-lg border border-amber-100 transition-all">
                        <i class="ri-file-pdf-line"></i> Cetak SPK
                    </button>` : ''}
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm text-left">
                        <thead class="bg-gray-50/50 text-gray-500">
                            <tr>
                                <th class="px-4 py-3 font-medium">Ke-</th>
                                <th class="px-4 py-3 font-medium">Jatuh Tempo</th>
                                <th class="px-4 py-3 font-medium text-right">Pokok</th>
                                <th class="px-4 py-3 font-medium text-right">Bunga</th>
                                <th class="px-4 py-3 font-medium text-right">Total</th>
                                <th class="px-4 py-3 font-medium text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${(p.angsuran || []).map(a => `
                            <tr class="hover:bg-gray-50/50 transition-colors">
                                <td class="px-4 py-3 text-center">${a.angsuran_ke}</td>
                                <td class="px-4 py-3 text-gray-600">${App.formatDate(a.tgl_jatuh_tempo)}</td>
                                <td class="px-4 py-3 text-right">${App.formatRupiah(a.pokok)}</td>
                                <td class="px-4 py-3 text-right">${App.formatRupiah(a.bunga)}</td>
                                <td class="px-4 py-3 text-right font-medium">${App.formatRupiah(a.total)}</td>
                                <td class="px-4 py-3 text-center">${App.statusBadge(a.status)}</td>
                            </tr>`).join('')}
                            ${!(p.angsuran || []).length ? '<tr><td colspan="6" class="text-center py-4 text-gray-400 italic">Jadwal angsuran belum tersedia (pinjaman belum cair)</td></tr>' : ''}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div id="detail-credit-score" class="mb-8 hidden animate-fadeIn"></div>

            <div class="text-xs text-gray-400 text-center">
                Dibuat oleh: ${p.created_by_nama || '-'} pada ${App.formatDate(p.created_at)}
                ${p.approved_by_nama ? `<br>Disetujui oleh: ${p.approved_by_nama} pada ${App.formatDate(p.tgl_disetujui)}` : ''}
            </div>
        </div>`;

        // If status is pending, show credit score analysis
        if (p.status === 'pending') {
            this.renderDetailCreditScore(p);
        }
    },

    async renderDetailCreditScore(p) {
        const container = document.getElementById('detail-credit-score');
        if (!container) return;

        container.classList.remove('hidden');
        container.innerHTML = `
            <div class="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div class="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                    <h4 class="font-bold text-gray-800 text-sm flex items-center gap-2"><i class="ri-shield-check-line text-lg text-primary-600"></i> Analisa Kelayakan Pinjaman</h4>
                    <span id="dcs-badge" class="text-xs font-bold px-2.5 py-1 rounded-md bg-gray-100 text-gray-400"><i class="ri-loader-4-line animate-spin"></i> Menganalisa...</span>
                </div>
                <div class="p-6" id="dcs-body">
                    <div class="flex justify-center py-4"><i class="ri-loader-4-line animate-spin text-3xl text-gray-300"></i></div>
                </div>
            </div>
        `;

        let nilaiAgunan = 0;
        if (p.agunan && p.agunan.data) {
            const val = p.agunan.data['Estimasi Nilai'] || p.agunan.data['Nominal Saldo'] || 0;
            nilaiAgunan = parseFloat(val.toString().replace(/[^0-9]/g, '')) || 0;
        }

        const res = await App.api(`pinjaman/credit-score?anggota_id=${p.anggota_id}&nominal=${p.jumlah}&lama_angsuran=${p.tenor}&bunga=${p.bunga_persen}&nilai_agunan=${nilaiAgunan}`);

        const badge = document.getElementById('dcs-badge');
        const body = document.getElementById('dcs-body');

        if (!res?.success) {
            badge.innerHTML = 'Gagal';
            body.innerHTML = `<div class="text-red-500 text-center text-sm">${res?.message || 'Gagal memuat analisa'}</div>`;
            return;
        }

        const s = res.data;
        const colorMap = {
            'hijau': { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'ri-checkbox-circle-fill text-emerald-500' },
            'kuning': { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'ri-error-warning-fill text-amber-500' },
            'merah': { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'ri-close-circle-fill text-rose-500' }
        };

        const cw = colorMap[s.warna];
        badge.className = `text-xs font-bold px-2.5 py-1 rounded-md ${cw.bg} ${cw.text}`;
        badge.innerHTML = s.kesimpulan;

        const getPill = (score, label) => {
            const c = colorMap[score];
            return `<span class="${c.bg} ${c.text} px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><i class="${c.icon}"></i> ${label}</span>`;
        };

        body.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div class="flex justify-between items-start mb-2">
                        <div class="text-xs text-gray-500 font-medium">Kapasitas Bayar (DSR)</div>
                        ${getPill(s.dsr.score, s.dsr.score === 'merah' ? 'Buruk' : (s.dsr.score === 'kuning' ? 'Waspada' : 'Baik'))}
                    </div>
                    <div class="font-bold text-gray-800 text-lg">${s.dsr.rate}%</div>
                    <div class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">Gaji: ${App.formatRupiah(s.dsr.gaji)}</div>
                </div>

                <div class="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div class="flex justify-between items-start mb-2">
                        <div class="text-xs text-gray-500 font-medium">Histori Keterlambatan</div>
                        ${getPill(s.histori.score, s.histori.score === 'merah' ? 'Banyak' : (s.histori.score === 'kuning' ? 'Ada' : 'Bersih'))}
                    </div>
                    <div class="font-bold text-gray-800 text-lg">${s.histori.telat} <span class="text-sm font-normal text-gray-500">kali</span></div>
                    <div class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">Pinjaman Sebelumnya</div>
                </div>

                <div class="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                    <div class="flex justify-between items-start mb-2">
                        <div class="text-xs text-gray-500 font-medium">Coverage Jaminan</div>
                        ${getPill(s.simpanan.score, s.simpanan.score === 'merah' ? 'Rendah' : (s.simpanan.score === 'kuning' ? 'Cukup' : 'Tinggi'))}
                    </div>
                    <div class="font-bold text-gray-800 text-lg">${s.simpanan.rate}%</div>
                    <div class="text-[10px] text-gray-400 mt-1 uppercase tracking-wider font-semibold">Total: ${App.formatRupiah(s.simpanan.saldo)}</div>
                </div>
            </div>
            <div class="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-blue-700 flex items-start gap-2">
                <i class="ri-information-line text-sm"></i>
                <div>Hasil analisa ini berdasarkan data real-time saat ini sebagai bahan pertimbangan persetujuan pengurus.</div>
            </div>
        `;
    },

    async loadList(container, page = 1) {
        this.page = page;
        const search = document.getElementById('pnj-search')?.value || '';
        const status = document.getElementById('pnj-status')?.value || '';
        const anggotaId = App.queryParams?.anggota_id || '';
        const res = await App.api(`pinjaman?page=${page}&search=${encodeURIComponent(search)}&status=${status}&anggota_id=${anggotaId}`);
        if (!res?.success) return;

        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div class="flex items-center gap-3 flex-1">
                    <div class="relative flex-1 max-w-md"><i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="pnj-search" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="Cari..." value="${search}" onkeyup="if(event.key==='Enter')PinjamanPage.loadList(PinjamanPage.container)"></div>
                    <select id="pnj-status" class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" onchange="PinjamanPage.loadList(PinjamanPage.container)">
                        <option value="">Semua Status</option><option value="pending">Pending</option><option value="cair">Cair</option><option value="lunas">Lunas</option><option value="ditolak">Ditolak</option></select>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="PinjamanPage.export('pdf')" class="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Export PDF"><i class="ri-file-pdf-line text-lg"></i></button>
                    <button onclick="PinjamanPage.export('csv')" class="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Export CSV"><i class="ri-file-excel-line text-lg"></i></button>
                    ${App.hasPerm('pinjaman.create') ? '<button onclick="PinjamanPage.form()" class="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-amber-500/25 ml-2"><i class="ri-add-line"></i> Pengajuan Baru</button>' : ''}
                </div>
            </div>
            <div class="table-wrapper"><table class="data-table w-full text-sm">
                <thead><tr class="bg-gray-50"><th class="px-4 py-3 text-left font-medium text-gray-500">No. Pinjaman</th><th class="px-4 py-3 text-left font-medium text-gray-500">Anggota</th><th class="px-4 py-3 text-left font-medium text-gray-500">Jenis</th><th class="px-4 py-3 text-right font-medium text-gray-500">Jumlah</th><th class="px-4 py-3 text-center font-medium text-gray-500">Tenor</th><th class="px-4 py-3 text-right font-medium text-gray-500">Sisa</th><th class="px-4 py-3 text-center font-medium text-gray-500">Status</th><th class="px-4 py-3 text-center font-medium text-gray-500">Aksi</th></tr></thead>
                <tbody>${res.data.map(p => `<tr class="border-t border-gray-50">
                    <td class="px-4 py-3 font-mono text-xs text-primary-600">${p.no_pinjaman}</td>
                    <td class="px-4 py-3"><span class="font-medium">${p.anggota_nama}</span><br><span class="text-xs text-gray-400">${p.no_anggota}</span></td>
                    <td class="px-4 py-3 text-gray-500">${p.jenis_pinjaman}</td>
                    <td class="px-4 py-3 text-right font-semibold">${App.formatRupiah(p.jumlah)}</td>
                    <td class="px-4 py-3 text-center">${p.tenor} bln</td>
                    <td class="px-4 py-3 text-right font-semibold text-amber-600">${App.formatRupiah(p.sisa_pinjaman)}</td>
                    <td class="px-4 py-3 text-center">${App.statusBadge(p.status)}</td>
                    <td class="px-4 py-3 text-center"><div class="flex justify-center gap-1">
                        <a href="#/pinjaman/${p.id}" class="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500" title="Detail"><i class="ri-eye-line"></i></a>
                        ${p.status === 'pending' && App.hasPerm('pinjaman.approve') ? `<button onclick="PinjamanPage.approve(${p.id})" class="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-500" title="Approve"><i class="ri-check-line"></i></button><button onclick="PinjamanPage.reject(${p.id})" class="p-1.5 hover:bg-red-50 rounded-lg text-red-400" title="Tolak"><i class="ri-close-line"></i></button>` : ''}
                        ${p.status === 'cair' && App.hasPerm('pinjaman.approve') ? `<button onclick="PinjamanPage.confirmReverse(${p.id}, '${p.no_pinjaman}')" class="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Reverse Pencairan"><i class="ri-arrow-go-back-line"></i></button>` : ''}
                    </div></td></tr>`).join('')}
                ${res.data.length === 0 ? '<tr><td colspan="8" class="text-center py-8 text-gray-400">Tidak ada data</td></tr>' : ''}</tbody></table></div>
            ${App.renderPagination(res.pagination, 'PinjamanPage.paginate')}</div>`;
    },

    async form() {
        this._agunanList = [];
        const jp = await App.api('jenis-pinjaman');
        App.openModal(`<div class="p-6"><h3 class="text-lg font-bold text-gray-800 mb-4"><i class="ri-hand-coin-line text-amber-500 mr-2"></i>Pengajuan Pinjaman Baru</h3>
        
        <!-- Tabs Navigation -->
        <div class="flex border-b border-gray-200 mb-6 font-medium text-sm">
            <button type="button" class="tab-btn px-4 py-3 text-primary-600 border-b-2 border-primary-600 outline-none" onclick="PinjamanPage.switchTab(0)">1. Data Pinjaman</button>
            <button type="button" class="tab-btn px-4 py-3 text-gray-500 border-b-2 border-transparent hover:text-gray-700 outline-none" onclick="PinjamanPage.switchTab(1)">
                2. Data Agunan
                <span id="pf-agunan-count" class="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold hidden">0</span>
            </button>
            <button type="button" class="tab-btn px-4 py-3 text-gray-500 border-b-2 border-transparent hover:text-gray-700 outline-none" onclick="PinjamanPage.switchTab(2)">3. Analisa Kelayakan</button>
        </div>

        <form id="pnj-form" class="space-y-4" novalidate>
            
            <!-- TAB 1: FORM PENGAJUAN -->
            <div id="tab-form" class="tab-content block animate-fadeIn">
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Cari Anggota *</label>
                <input type="text" id="pf-anggota-search" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="Ketik nama/no anggota..." autocomplete="off">
                <input type="hidden" id="pf-anggota-id"><div id="pf-anggota-dd" class="hidden border border-gray-200 rounded-xl mt-1 max-h-40 overflow-auto bg-white shadow-lg"></div></div>
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div><label class="block text-sm font-medium text-gray-600 mb-1">Pekerjaan</label><input type="text" id="pf-pekerjaan" class="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm" readonly placeholder="-"></div>
                    <div><label class="block text-sm font-medium text-gray-600 mb-1">Penghasilan Bulanan (Rp)</label><input type="text" id="pf-penghasilan" class="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-2.5 text-sm" readonly placeholder="0"></div>
                </div>

                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium text-gray-600 mb-1">Jenis Pinjaman *</label><select id="pf-jenis" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm">${(jp?.data || []).map(j => `<option value="${j.id}" data-bunga="${j.bunga_persen}" data-tenor="${j.max_tenor}" data-max="${j.max_jumlah}">${j.nama} (${j.bunga_persen}%)</option>`).join('')}</select></div>
                    <div><label class="block text-sm font-medium text-gray-600 mb-1">Tanggal</label><input type="text" id="pf-tgl" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="Tanggal"></div>
                    <div><label class="block text-sm font-medium text-gray-600 mb-1">Jumlah (Rp) *</label><input type="number" id="pf-jumlah" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" min="1" required oninput="PinjamanPage.calcSim()"></div>
                    <div><label class="block text-sm font-medium text-gray-600 mb-1">Tenor (bulan) *</label><input type="number" id="pf-tenor" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" min="1" required oninput="PinjamanPage.calcSim()"></div>
                </div>
                <div id="pf-sim" class="hidden bg-blue-50 rounded-xl p-4 text-sm mt-4"></div>
                <div id="pf-existing-error" class="hidden bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4 text-sm mt-4 animate-fadeIn"></div>


                <!-- Top-up Section -->
                <div id="pf-topup-section" class="hidden mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 shadow-sm animate-fadeIn">
                    <div class="flex items-center gap-3 mb-2">
                        <input type="checkbox" id="pf-is-topup" class="w-5 h-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer" onchange="PinjamanPage.toggleTopup(this.checked)">
                        <label for="pf-is-topup" class="text-sm font-bold text-amber-900 cursor-pointer flex items-center gap-2">
                            <i class="ri-refresh-line text-amber-600"></i> Top-up Pinjaman (Refinancing)
                        </label>
                    </div>
                    <div id="pf-topup-details" class="hidden text-xs text-amber-800 space-y-2 pl-8 pt-2 border-t border-amber-200 mt-2">
                        <!-- Filled via checkActiveLoan -->
                    </div>
                </div>

                <div><label class="block text-sm font-medium text-gray-600 mb-1 mt-4">Keterangan</label><textarea id="pf-ket" rows="2" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"></textarea></div>
                <div class="flex justify-end gap-3 pt-4 border-t mt-4">
                    <button type="button" onclick="App.closeModal()" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 text-gray-600">Batal</button>
                    <button type="button" onclick="PinjamanPage.switchTab(1)" class="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-medium flex items-center gap-1">Lanjut Agunan <i class="ri-arrow-right-line"></i></button>
                </div>
            </div>

            <!-- TAB 2: DATA AGUNAN -->
            <div id="tab-agunan" class="tab-content hidden animate-fadeIn">
                <div class="flex items-center gap-3 mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                    <i class="ri-shield-check-line text-2xl text-amber-500"></i>
                    <div>
                        <div class="font-semibold text-gray-800 text-sm">Data Agunan / Jaminan</div>
                        <div class="text-xs text-gray-500 mt-0.5">Tambahkan agunan yang akan diserahkan. Dapat lebih dari 1 item.</div>
                    </div>
                </div>

                <!-- Daftar agunan yang sudah ditambahkan -->
                <div id="pf-agunan-list" class="space-y-2 mb-4"></div>

                <!-- Form tambah agunan baru -->
                <div id="pf-agunan-addform" class="border border-dashed border-amber-300 rounded-xl p-4 bg-amber-50/30">
                    <div class="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                        <i class="ri-add-circle-line text-amber-500"></i> Tambah Item Agunan
                    </div>

                    <!-- Search dari DB -->
                    <div class="relative mb-2">
                        <i class="ri-shield-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input type="text" id="pf-agunan-search" autocomplete="off"
                            placeholder="Cari agunan tersimpan di database (no. dok, nama, deskripsi)..."
                            class="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400/30 bg-white"
                            oninput="PinjamanPage.searchAgunanDB(this.value)">
                    </div>
                    <div id="pf-agunan-db-dd" class="hidden border border-gray-200 rounded-xl mb-3 max-h-40 overflow-auto bg-white shadow-lg"></div>

                    <select id="pf-agunan-tipe" class="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm mb-3" onchange="PinjamanPage.toggleAgunan(this.value)">
                        <option value="">-- Pilih Tipe Agunan --</option>
                        <option value="Sertifikat Tanah (SHM/SHGB)">Sertifikat Tanah (SHM/SHGB)</option>
                        <option value="BPKB Kendaraan">BPKB Kendaraan</option>
                        <option value="Deposito/Simpanan">Deposito/Simpanan</option>
                    </select>
                    <div id="pf-agunan-fields" class="hidden space-y-3 mb-3"></div>

                    <button type="button" onclick="PinjamanPage.addAgunanItem()"
                        class="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2">
                        <i class="ri-add-line"></i> Tambah ke Daftar
                    </button>
                </div>

                <div class="flex justify-between gap-3 pt-4 border-t mt-4">
                    <button type="button" onclick="PinjamanPage.switchTab(0)" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 text-gray-600 flex items-center gap-1"><i class="ri-arrow-left-line"></i> Kembali</button>
                    <button type="button" onclick="PinjamanPage.switchTab(2)" class="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-sm font-medium flex items-center gap-1">Lanjut Analisa <i class="ri-arrow-right-line"></i></button>
                </div>
            </div>

            <!-- TAB 3: CREDIT SCORE & SUBMIT -->
            <div id="tab-score" class="tab-content hidden animate-fadeIn">
                <!-- Credit Score Card Module -->
                <div id="pf-credit-score" class="bg-white border rounded-xl overflow-hidden shadow-sm transition-all">
                    <div class="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                        <h4 class="font-bold text-gray-800 text-sm flex items-center gap-2"><i class="ri-shield-check-line text-lg"></i> Analisa Kelayakan</h4>
                        <span id="cs-badge-kesimpulan" class="text-xs font-bold px-2.5 py-1 rounded-md text-gray-400">Belum Dikalkulasi</span>
                    </div>
                    <div class="p-4 space-y-3 text-sm" id="cs-details">
                        <div class="text-center py-6 text-gray-400">
                            <i class="ri-information-line text-3xl mb-2"></i><br>
                            Silakan lengkapi data anggota dan jumlah di Tab sebelumnya.
                        </div>
                    </div>
                </div>
                
                <div class="flex justify-between items-center pt-6 mt-4 border-t">
                    <button type="button" onclick="PinjamanPage.switchTab(1)" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 text-gray-600 flex items-center gap-1"><i class="ri-arrow-left-line"></i> Kembali</button>
                    <button type="submit" class="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/30" id="btn-submit-pinjaman" disabled>Ajukan Pinjaman Sekarang</button>
                </div>
            </div>

        </form></div>`);

        let deb;
        App.datepicker('#pf-tgl', { defaultDate: 'today' });
        document.getElementById('pf-jenis').addEventListener('change', () => {
            const aid = document.getElementById('pf-anggota-id').value;
            if (aid) PinjamanPage.checkExistingLoan(aid);
            PinjamanPage.calcSim();
        });
        document.getElementById('pf-anggota-search').addEventListener('input', e => {
            clearTimeout(deb); deb = setTimeout(async () => {
                if (e.target.value.length < 2) {
                    document.getElementById('pf-anggota-dd').classList.add('hidden');
                    return;
                }
                const r = await App.api('anggota?search=' + encodeURIComponent(e.target.value) + '&per_page=5');
                const dd = document.getElementById('pf-anggota-dd');

                if (r?.data?.length) {
                    dd.innerHTML = r.data.map(a => `<div class="px-4 py-3 hover:bg-primary-50 cursor-pointer border-b border-gray-50 last:border-0" onclick="
                        document.getElementById('pf-anggota-id').value = ${a.id};
                        document.getElementById('pf-anggota-search').value = '${a.no_anggota} - ${a.nama}';
                        document.getElementById('pf-pekerjaan').value = '${a.pekerjaan || '-'}';
                        document.getElementById('pf-penghasilan').value = '${App.formatRupiah(a.penghasilan_bulanan || 0)}';
                        document.getElementById('pf-penghasilan').dataset.gaji = '${a.penghasilan_bulanan || 0}';
                        document.getElementById('pf-anggota-dd').classList.add('hidden');
                        PinjamanPage.checkActiveLoan(${a.id});
                        PinjamanPage.calcSim();
                    ">
                        <div class="font-medium text-gray-800">${a.nama}</div>
                        <div class="text-xs text-gray-500 font-mono mt-0.5">${a.no_anggota}</div>
                    </div>`).join('');
                    dd.classList.remove('hidden');
                } else {
                    dd.innerHTML = '<div class="px-4 py-3 text-gray-400 text-xs italic">Anggota tidak ditemukan</div>';
                    dd.classList.remove('hidden');
                }
            }, 300);
        });

        document.getElementById('pnj-form').onsubmit = async e => {
            e.preventDefault();
            if (!document.getElementById('pf-anggota-id').value) { App.toast('Pilih anggota terlebih dahulu', 'warning'); return; }

            const submitBtn = e.target.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="ri-loader-4-line animate-spin mr-2"></i>Menyimpan...';

            // Build agunan payload from the multi-item list
            const agunanArr = PinjamanPage._agunanList || [];
            const agunanPayload = agunanArr.length === 0 ? null
                : agunanArr.length === 1 ? agunanArr[0]
                    : agunanArr;

            const payload = {
                anggota_id: document.getElementById('pf-anggota-id').value,
                jenis_pinjaman_id: document.getElementById('pf-jenis').value,
                tgl_pengajuan: App.dateToISO(document.getElementById('pf-tgl').value),
                jumlah: document.getElementById('pf-jumlah').value,
                tenor: document.getElementById('pf-tenor').value,
                agunan: agunanPayload,
                is_topup: document.getElementById('pf-is-topup')?.checked ? 1 : 0,
                topup_ref_id: PinjamanPage._activeLoan?.id || null,
                keterangan: document.getElementById('pf-ket').value
            };

            const r = await App.api('pinjaman', { method: 'POST', body: payload });

            if (r?.success) {
                App.closeModal();
                App.toast(r.message, 'success');
                this.loadList(this.container);
            } else {
                App.toast(r?.message || 'Gagal mengajukan pinjaman', 'error');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Ajukan Pinjaman';
            }
        };
    },

    toggleAgunan(tipe) {
        const container = document.getElementById('pf-agunan-fields');
        if (!tipe) {
            container.innerHTML = '';
            container.classList.add('hidden');
            return;
        }

        container.classList.remove('hidden');
        let html = '';
        if (tipe === 'Sertifikat Tanah (SHM/SHGB)') {
            html = `<div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-medium text-gray-500 mb-1">No. Sertifikat *</label><input type="text" id="ag-no_sertifikat" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required></div>
                <div><label class="block text-xs font-medium text-gray-500 mb-1">Nama Pemilik *</label><input type="text" id="ag-nama_pemilik" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required></div>
                <div><label class="block text-xs font-medium text-gray-500 mb-1">Luas (m²) *</label><input type="number" id="ag-luas" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required></div>
                <div><label class="block text-xs font-medium text-gray-500 mb-1">Estimasi Nilai (Rp) *</label><input type="text" id="ag-nilai_estimasi" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" onkeyup="this.value=App.formatRupiah(this.value.replace(/[^0-9]/g,''))" required></div>
            </div>`;
        } else if (tipe === 'BPKB Kendaraan') {
            html = `<div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-medium text-gray-500 mb-1">No. BPKB *</label><input type="text" id="ag-no_bpkb" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required></div>
                <div><label class="block text-xs font-medium text-gray-500 mb-1">Nopol *</label><input type="text" id="ag-nopol" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required></div>
                <div><label class="block text-xs font-medium text-gray-500 mb-1">Merek Kendaraan *</label><input type="text" id="ag-merek_kendaraan" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required></div>
                <div><label class="block text-xs font-medium text-gray-500 mb-1">Tahun Pembuatan *</label><input type="number" id="ag-tahun" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required></div>
                <div class="col-span-2"><label class="block text-xs font-medium text-gray-500 mb-1">Estimasi Nilai (Rp) *</label><input type="text" id="ag-nilai_estimasi" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" onkeyup="this.value=App.formatRupiah(this.value.replace(/[^0-9]/g,''))" required></div>
            </div>`;
        } else if (tipe === 'Deposito/Simpanan') {
            html = `<div class="grid grid-cols-2 gap-4">
                <div><label class="block text-xs font-medium text-gray-500 mb-1">No. Rekening *</label><input type="text" id="ag-no_rekening" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required></div>
                <div><label class="block text-xs font-medium text-gray-500 mb-1">Bank / Koperasi *</label><input type="text" id="ag-bank_atau_koperasi" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required></div>
                <div><label class="block text-xs font-medium text-gray-500 mb-1">Atas Nama *</label><input type="text" id="ag-atas_nama" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" required></div>
                <div><label class="block text-xs font-medium text-gray-500 mb-1">Nominal Saldo (Rp) *</label><input type="text" id="ag-nominal_saldo" class="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" onkeyup="this.value=App.formatRupiah(this.value.replace(/[^0-9]/g,''))" required></div>
            </div>`;
        }
        container.innerHTML = html;
    },

    // ── Search agunan dari DB ─────────────────────────────────
    _agunanSearchTimer: null,
    async searchAgunanDB(val) {
        clearTimeout(this._agunanSearchTimer);
        const dd = document.getElementById('pf-agunan-db-dd');
        if (!dd) return;

        if (!val || val.length < 2) {
            dd.innerHTML = '';
            dd.classList.add('hidden');
            return;
        }

        this._agunanSearchTimer = setTimeout(async () => {
            const res = await App.api(`agunan?search=${encodeURIComponent(val)}&status=aktif&per_page=8`);
            if (!res?.data?.length) {
                dd.innerHTML = '<div class="px-4 py-3 text-gray-400 text-xs italic">Tidak ada agunan tersimpan ditemukan</div>';
                dd.classList.remove('hidden');
                return;
            }
            const tipeIcon = { SHM: 'ri-home-2-line', SHGB: 'ri-building-line', BPKB: 'ri-car-line', Deposito: 'ri-bank-line', Lainnya: 'ri-file-paper-line' };
            const tipeColor = { SHM: 'text-emerald-600', SHGB: 'text-teal-600', BPKB: 'text-blue-600', Deposito: 'text-amber-600', Lainnya: 'text-gray-500' };

            dd.innerHTML = res.data.map(a => `
            <div class="px-4 py-3 hover:bg-amber-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-start gap-3"
                onclick="PinjamanPage.selectAgunanFromDB(${JSON.stringify(a).replace(/"/g, '&quot;')})">
                <i class="${tipeIcon[a.tipe_agunan] || 'ri-file-paper-line'} ${tipeColor[a.tipe_agunan] || 'text-gray-400'} mt-0.5 shrink-0"></i>
                <div class="min-w-0">
                    <div class="text-xs font-bold text-gray-600">${a.tipe_agunan} &nbsp;·&nbsp; <span class="font-mono">${a.no_dokumen || '-'}</span></div>
                    <div class="text-sm font-medium text-gray-800 truncate">${a.deskripsi}</div>
                    <div class="text-xs text-gray-400">Pemilik: ${a.pemilik || '-'} &nbsp;·&nbsp; ${App.formatRupiah(a.nilai_taksasi)} &nbsp;·&nbsp; <span class="font-mono">${a.no_pinjaman}</span></div>
                </div>
            </div>`).join('');
            dd.classList.remove('hidden');
        }, 300);
    },

    selectAgunanFromDB(a) {
        // Map tipe DB → pinjaman form option
        const tipeMap = { SHM: 'Sertifikat Tanah (SHM/SHGB)', SHGB: 'Sertifikat Tanah (SHM/SHGB)', BPKB: 'BPKB Kendaraan', Deposito: 'Deposito/Simpanan', Lainnya: '' };
        const tipe = tipeMap[a.tipe_agunan] || '';

        const tipeEl = document.getElementById('pf-agunan-tipe');
        if (tipeEl) tipeEl.value = tipe;
        this.toggleAgunan(tipe);

        setTimeout(() => {
            const fill = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
            const fillRp = (id, v) => { const el = document.getElementById(id); if (el) el.value = App.formatRupiah(v || 0); };

            if (a.tipe_agunan === 'SHM' || a.tipe_agunan === 'SHGB') {
                fill('ag-no_sertifikat', a.no_dokumen); fill('ag-nama_pemilik', a.pemilik); fillRp('ag-nilai_estimasi', a.nilai_taksasi);
            } else if (a.tipe_agunan === 'BPKB') {
                fill('ag-no_bpkb', a.no_dokumen); fill('ag-nama_pemilik', a.pemilik); fillRp('ag-nilai_estimasi', a.nilai_taksasi);
            } else if (a.tipe_agunan === 'Deposito') {
                fill('ag-no_rekening', a.no_dokumen); fill('ag-atas_nama', a.pemilik); fillRp('ag-nominal_saldo', a.nilai_taksasi);
            }
        }, 50);

        const dd = document.getElementById('pf-agunan-db-dd');
        if (dd) dd.classList.add('hidden');
        const srch = document.getElementById('pf-agunan-search');
        if (srch) srch.value = a.deskripsi;
        App.toast('Data agunan berhasil diisi', 'info', 1500);
    },

    clearAgunanSearch() {
        const srch = document.getElementById('pf-agunan-search');
        const dd = document.getElementById('pf-agunan-db-dd');
        if (srch) srch.value = '';
        if (dd) dd.classList.add('hidden');
        const tipeEl = document.getElementById('pf-agunan-tipe');
        if (tipeEl) { tipeEl.value = ''; this.toggleAgunan(''); }
    },

    // ── Multi-agunan list management ───────────────────────────
    _agunanList: [],

    addAgunanItem() {
        const tipe = document.getElementById('pf-agunan-tipe')?.value;
        if (!tipe) { App.toast('Pilih tipe agunan terlebih dahulu', 'warning'); return; }

        // Collect all ag-* inputs
        const item = { tipe, data: {} };
        const inputs = document.getElementById('pf-agunan-fields')?.querySelectorAll('input') || [];
        let valid = true;
        inputs.forEach(inp => {
            if (inp.required && !inp.value.trim()) {
                App.toast(`Lengkapi: ${inp.previousElementSibling?.textContent?.replace(' *', '') || inp.id}`, 'warning');
                inp.focus(); valid = false;
            }
            if (valid && inp.id.startsWith('ag-')) {
                const key = inp.id.replace('ag-', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                item.data[key] = inp.value;
            }
        });
        if (!valid) return;

        // Derive human label
        const noDoc = item.data['No. Sertifikat'] || item.data['No. Bpkb'] || item.data['No. Rekening'] || '';
        const nilai = item.data['Nilai Estimasi'] || item.data['Nominal Saldo'] || 0;
        item._label = `${tipe}${noDoc ? ' — ' + noDoc : ''}${nilai ? ' · ' + App.formatRupiah(parseFloat(String(nilai).replace(/[^0-9]/g, '')) || 0) : ''}`;

        this._agunanList.push(item);
        this.renderAgunanList();

        // Reset form
        document.getElementById('pf-agunan-tipe').value = '';
        this.toggleAgunan('');
        const srch = document.getElementById('pf-agunan-search');
        if (srch) srch.value = '';

        // Recalc credit score with updated total nilai
        this.calcSim();
        App.toast(`Agunan ${this._agunanList.length} berhasil ditambahkan ke daftar`, 'success', 1800);
    },

    removeAgunanItem(idx) {
        this._agunanList.splice(idx, 1);
        this.renderAgunanList();
        this.calcSim();
    },

    renderAgunanList() {
        const list = document.getElementById('pf-agunan-list');
        const counter = document.getElementById('pf-agunan-count');
        if (!list) return;

        const tipeColor = {
            'Sertifikat Tanah (SHM/SHGB)': 'bg-emerald-100 text-emerald-800',
            'BPKB Kendaraan': 'bg-blue-100 text-blue-800',
            'Deposito/Simpanan': 'bg-amber-100 text-amber-800',
        };
        const tipeIcon = {
            'Sertifikat Tanah (SHM/SHGB)': 'ri-home-2-line',
            'BPKB Kendaraan': 'ri-car-line',
            'Deposito/Simpanan': 'ri-bank-line',
        };

        if (!this._agunanList.length) {
            list.innerHTML = '';
            if (counter) counter.classList.add('hidden');
            return;
        }

        if (counter) {
            counter.textContent = `${this._agunanList.length} Item`;
            counter.classList.remove('hidden');
        }

        list.innerHTML = this._agunanList.map((item, i) => `
        <div class="flex items-start gap-3 bg-white border border-gray-200 rounded-xl px-3 py-2.5 shadow-sm">
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold shrink-0 mt-0.5 ${tipeColor[item.tipe] || 'bg-gray-100 text-gray-600'}">
                <i class="${tipeIcon[item.tipe] || 'ri-file-paper-line'} text-xs"></i>${item.tipe}
            </span>
            <div class="flex-1 min-w-0">
                <div class="text-xs text-gray-700 font-medium truncate">${item._label}</div>
                <div class="text-[10px] text-gray-400 mt-0.5">${Object.entries(item.data).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')}</div>
            </div>
            <button type="button" onclick="PinjamanPage.removeAgunanItem(${i})" class="text-gray-300 hover:text-red-500 text-lg leading-none shrink-0">&times;</button>
        </div>`).join('');
    },

    async checkExistingLoan(anggotaId) {
        const jenisId = document.getElementById('pf-jenis').value;
        if (!anggotaId || !jenisId) return;

        const errorBox = document.getElementById('pf-existing-error');
        const simBox = document.getElementById('pf-sim');
        const section = document.getElementById('pf-topup-section');
        const isTopup = document.getElementById('pf-is-topup');

        errorBox.classList.add('hidden');
        if (isTopup) isTopup.checked = false;
        PinjamanPage._activeLoan = null;
        PinjamanPage._topupPelunasan = 0;
        document.getElementById('pf-topup-details').classList.add('hidden');
        section.classList.add('hidden');

        const res = await App.api(`pinjaman?anggota_id=${anggotaId}&jenis_pinjaman_id=${jenisId}&status=pending,disetujui,cair&per_page=1`);
        
        if (res?.success && res.data.length > 0) {
            const loan = res.data[0];
            PinjamanPage._activeLoan = (loan.status === 'cair') ? loan : null;
            
            errorBox.classList.remove('hidden');
            simBox.classList.add('hidden');

            let msg = `
                <div class="flex items-start gap-3">
                    <i class="ri-error-warning-fill text-xl mt-0.5"></i>
                    <div>
                        <div class="font-bold uppercase text-[10px] tracking-widest mb-1">Peringatan: Pinjaman Terdeteksi</div>
                        <p class="text-xs leading-relaxed">
                            Anggota sudah memiliki pinjaman <strong>${loan.jenis_pinjaman}</strong> (${loan.no_pinjaman}) 
                            dengan status <strong>${loan.status.toUpperCase()}</strong>.
                        </p>
                        ${loan.status === 'cair' ? `
                            <p class="text-[10px] mt-2 font-medium bg-white/50 p-2 rounded-lg border border-rose-100">
                                Sisa Baki Debet: <strong>${App.formatRupiah(loan.sisa_pinjaman)}</strong>. 
                                <br>Gunakan fitur <b>Top-up</b> jika ingin melakukan pembiayaan ulang.
                            </p>
                        ` : `
                            <p class="text-[10px] mt-2 font-bold text-rose-800">
                                Pengajuan baru tidak diizinkan sampai pengajuan sebelumnya selesai diproses.
                            </p>
                        `}
                    </div>
                </div>
            `;
            errorBox.innerHTML = msg;

            if (loan.status === 'cair') {
                section.classList.remove('hidden');
            }
        }
    },

    async checkActiveLoan(anggotaId) {
        // We now use checkExistingLoan which is more specific
        this.checkExistingLoan(anggotaId);
    },

    async toggleTopup(checked) {
        const details = document.getElementById('pf-topup-details');
        if (checked && PinjamanPage._activeLoan) {
            details.classList.remove('hidden');
            details.innerHTML = `<div class="flex items-center gap-2 py-2"><i class="ri-loader-4-line animate-spin text-lg"></i> Menghitung detail pelunasan...</div>`;

            const res = await App.api(`angsuran/kalkulasi-lunas?pinjaman_id=${PinjamanPage._activeLoan.id}`);
            if (res?.success) {
                const s = res.data;
                PinjamanPage._topupPelunasan = s.total_pelunasan;
                details.innerHTML = `
                    <div class="grid grid-cols-2 gap-x-4 gap-y-1 bg-white/50 p-3 rounded-lg border border-amber-100 mt-1">
                        <div class="text-gray-500">Sisa Pokok:</div><div class="font-semibold text-right">${App.formatRupiah(s.sisa_pokok)}</div>
                        <div class="text-gray-500">Bunga Berjalan:</div><div class="font-semibold text-right">${App.formatRupiah(s.bunga_berjalan)}</div>
                        <div class="text-gray-500">Denda:</div><div class="font-semibold text-right text-red-600">${App.formatRupiah(s.denda_berjalan)}</div>
                        <div class="col-span-2 border-t border-amber-200 my-1 pt-1 flex justify-between">
                            <span class="font-bold">Total Pelunasan:</span>
                            <span class="font-bold text-primary-700">${App.formatRupiah(s.total_pelunasan)}</span>
                        </div>
                    </div>
                    <div class="text-[10px] italic text-amber-600 mt-1">* Bunga belum jatuh tempo ${App.formatRupiah(s.bunga_dibebaskan)} dibebaskan.</div>
                `;

                // Auto copy old agunan if any
                if (PinjamanPage._activeLoan.agunan) {
                    try {
                        let parsedAgunan = null;
                        const rawAgunan = PinjamanPage._activeLoan.agunan;
                        if (typeof rawAgunan === 'object') {
                            parsedAgunan = rawAgunan;
                        } else if (typeof rawAgunan === 'string') {
                            const trimmed = rawAgunan.trim();
                            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
                                parsedAgunan = JSON.parse(trimmed);
                            }
                        }

                        if (parsedAgunan) {
                            let list = [];
                            if (Array.isArray(parsedAgunan)) {
                                list = parsedAgunan;
                            } else if (typeof parsedAgunan === 'object' && parsedAgunan.tipe) {
                                list = [parsedAgunan];
                            }
                            
                            // Map and ensure _label exists for each item
                            PinjamanPage._agunanList = list.map(item => {
                                if (!item._label) {
                                    const noDoc = item.data['No. Sertifikat'] || item.data['No. Bpkb'] || item.data['No. Rekening'] || item.data['No Sertifikat'] || item.data['No Bpkb'] || item.data['No Rekening'] || '';
                                    const nilai = item.data['Nilai Estimasi'] || item.data['Nominal Saldo'] || item.data['Estimasi Nilai'] || 0;
                                    item._label = `${item.tipe}${noDoc ? ' — ' + noDoc : ''}${nilai ? ' · ' + App.formatRupiah(parseFloat(String(nilai).replace(/[^0-9]/g, '')) || 0) : ''}`;
                                }
                                return item;
                            });
                            
                            PinjamanPage.renderAgunanList();
                            App.toast('Agunan pinjaman lama berhasil disalin otomatis!', 'info', 2500);
                        } else if (typeof rawAgunan === 'string' && rawAgunan.trim().length > 0) {
                            // Fallback for plain text agunan
                            const text = rawAgunan.trim();
                            let tipe = "Lainnya";
                            if (text.includes("Sertifikat")) {
                                tipe = "Sertifikat Tanah (SHM/SHGB)";
                            } else if (text.includes("BPKB") || text.includes("Bpkb")) {
                                tipe = "BPKB Kendaraan";
                            } else if (text.includes("Deposito") || text.includes("Simpanan")) {
                                tipe = "Deposito/Simpanan";
                            }
                            
                            PinjamanPage._agunanList = [{
                                tipe: tipe,
                                data: { "Keterangan": text },
                                _label: text
                            }];
                            PinjamanPage.renderAgunanList();
                            App.toast('Agunan pinjaman lama berhasil disalin otomatis!', 'info', 2500);
                        }
                    } catch (e) {
                        console.error("Gagal memproses agunan lama", e);
                    }
                }
            } else {
                App.toast('Gagal memuat detail pelunasan', 'error');
                document.getElementById('pf-is-topup').checked = false;
                details.classList.add('hidden');
            }
        } else {
            details.classList.add('hidden');
            PinjamanPage._topupPelunasan = 0;
            PinjamanPage._agunanList = [];
            PinjamanPage.renderAgunanList();
        }
        this.calcSim();
    },

    calcSim() {
        const opt = document.getElementById('pf-jenis').selectedOptions[0];
        const jumlah = parseFloat(document.getElementById('pf-jumlah').value) || 0;
        const tenor = parseInt(document.getElementById('pf-tenor').value) || 0;
        const bunga = parseFloat(opt?.dataset.bunga) || 0;
        const btnSubmit = document.getElementById('btn-submit-pinjaman');

        // Nilai agunan: sum dari semua item di _agunanList (Tab 2)
        let nilaiAgunan = (PinjamanPage._agunanList || []).reduce((sum, item) => {
            const v = item.data['Nilai Estimasi'] || item.data['Nominal Saldo'] || '0';
            return sum + (parseFloat(String(v).replace(/[^0-9]/g, '')) || 0);
        }, 0);
        // Fallback: jika list kosong, cek DOM (untuk kasus form tab 1 masih ada)
        if (!nilaiAgunan) {
            const inputEstimasi = document.getElementById('ag-nilai_estimasi');
            const inputSaldo = document.getElementById('ag-nominal_saldo');
            if (inputEstimasi?.value) nilaiAgunan = parseFloat(inputEstimasi.value.replace(/[^0-9]/g, '')) || 0;
            else if (inputSaldo?.value) nilaiAgunan = parseFloat(inputSaldo.value.replace(/[^0-9]/g, '')) || 0;
        }


        const existingErr = document.getElementById('pf-existing-error');
        const isTopup = document.getElementById('pf-is-topup');

        if (jumlah > 0 && tenor > 0 && (existingErr?.classList.contains('hidden') || isTopup?.checked)) {
            const totalBunga = jumlah * (bunga / 100) * tenor; const angsuran = (jumlah + totalBunga) / tenor;
            const topupSettlement = PinjamanPage._topupPelunasan || 0;
            const netCair = Math.max(0, jumlah - topupSettlement);

            document.getElementById('pf-sim').classList.remove('hidden');
            document.getElementById('pf-sim').className = 'block mt-4 animate-fadeIn'; // Reset from bg-blue-50 to plain for our card

            let simHtml = `
                <div class="bg-white border border-primary-100 rounded-2xl overflow-hidden shadow-sm">
                    <div class="px-4 py-2 bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-between">
                        <span>Simulasi Angsuran</span>
                        <i class="ri-calculator-line"></i>
                    </div>
                    <div class="p-5">
                        <div class="grid grid-cols-2 gap-6">
                            <div>
                                <div class="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-tight">Angsuran / Bulan</div>
                                <div class="text-2xl font-black text-primary-700 leading-none tracking-tight">${App.formatRupiah(angsuran)}</div>
                                <div class="text-[10px] text-gray-500 mt-1.5 flex items-center gap-1"><i class="ri-calendar-line"></i> Selama ${tenor} Bulan</div>
                            </div>
                            <div class="border-l border-gray-100 pl-6">
                                <div class="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-tight">Total Pengembalian</div>
                                <div class="text-xl font-bold text-gray-800 leading-none tracking-tight">${App.formatRupiah(jumlah + totalBunga)}</div>
                                <div class="text-[10px] text-gray-500 mt-1.5">Bunga ${bunga}% / Bulan</div>
                            </div>
                        </div>
                        
                        <div class="mt-5 pt-4 border-t border-dashed border-gray-100 flex justify-between items-center">
                            <div>
                                <div class="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Pokok Pinjaman</div>
                                <div class="text-sm font-bold text-gray-700">${App.formatRupiah(jumlah)}</div>
                            </div>
                            <div class="text-right">
                                <div class="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Total Jasa / Bunga</div>
                                <div class="text-sm font-bold text-amber-600">${App.formatRupiah(totalBunga)}</div>
                            </div>
                        </div>
                    </div>
                    ${topupSettlement > 0 ? `
                        <div class="bg-amber-50/50 p-4 border-t border-amber-100">
                            <div class="flex justify-between items-center mb-1">
                                <span class="text-xs font-black text-amber-900 uppercase tracking-tight">Estimasi Terima Bersih</span>
                                <span class="text-xl font-black text-amber-600 tracking-tight">${App.formatRupiah(netCair)}</span>
                            </div>
                            <div class="text-[10px] text-amber-600 flex items-start gap-1.5 leading-relaxed bg-white/50 p-2 rounded-lg border border-amber-100 mt-2">
                                <i class="ri-information-fill text-amber-500 text-xs"></i>
                                <span>Dana cair bersih setelah dikurangi pelunasan sisa pinjaman lama sebesar <b>${App.formatRupiah(topupSettlement)}</b>.</span>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;

            document.getElementById('pf-sim').innerHTML = simHtml;

            // Hitung Credit Score (Kelayakan Pinjaman)
            const anggotaId = document.getElementById('pf-anggota-id').value;
            if (anggotaId) {
                // Tampilkan loading state
                const csCard = document.getElementById('pf-credit-score');
                const badge = document.getElementById('cs-badge-kesimpulan');
                const details = document.getElementById('cs-details');

                csCard.classList.remove('hidden');
                badge.className = 'text-xs font-bold px-2.5 py-1 rounded-md bg-gray-100 text-gray-400';
                badge.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Menghitung...';
                details.innerHTML = '<div class="text-center py-4 text-gray-400"><i class="ri-loader-4-line animate-spin text-2xl"></i></div>';
                if (btnSubmit) btnSubmit.disabled = true;

                // Debounce simple
                clearTimeout(this._csTimer);
                this._csTimer = setTimeout(async () => {
                    const res = await App.api(`pinjaman/credit-score?anggota_id=${anggotaId}&nominal=${jumlah}&lama_angsuran=${tenor}&bunga=${bunga}&nilai_agunan=${nilaiAgunan}`);
                    if (!res?.success) {
                        badge.className = 'text-xs font-bold px-2.5 py-1 rounded-md bg-red-100 text-red-600';
                        badge.innerHTML = 'Error Kalkulasi';
                        details.innerHTML = `<div class="text-red-500 text-center">${res?.message || 'Gagal komunikasi server'}</div>`;
                        if (btnSubmit) btnSubmit.disabled = false;
                        return;
                    }

                    const s = res.data;

                    // Set Colors
                    const colorMap = {
                        'hijau': { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: 'ri-checkbox-circle-fill text-emerald-500', bar: 'bg-emerald-500' },
                        'kuning': { bg: 'bg-amber-50', text: 'text-amber-700', icon: 'ri-error-warning-fill text-amber-500', bar: 'bg-amber-500' },
                        'merah': { bg: 'bg-rose-50', text: 'text-rose-700', icon: 'ri-close-circle-fill text-rose-500', bar: 'bg-rose-500' }
                    };

                    const cw = colorMap[s.warna];
                    badge.className = `text-xs font-bold px-2.5 py-1 rounded-md ${cw.bg} ${cw.text}`;
                    badge.innerHTML = s.kesimpulan;

                    const getPill = (score, label) => {
                        const c = colorMap[score];
                        return `<span class="${c.bg} ${c.text} px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"><i class="${c.icon}"></i> ${label}</span>`;
                    };

                    details.innerHTML = `
                        <div class="grid grid-cols-1 gap-3">
                            <!-- Capacity -->
                            <div class="p-3 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center gap-4">
                                <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 shadow-sm border border-gray-50">
                                    <i class="ri-wallet-3-line text-lg"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="flex justify-between items-center mb-1">
                                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Kapasitas Bayar (DSR)</span>
                                        ${getPill(s.dsr.score, s.dsr.score === 'merah' ? 'Resiko Tinggi' : (s.dsr.score === 'kuning' ? 'Waspada' : 'Aman'))}
                                    </div>
                                    <div class="flex items-baseline gap-1.5">
                                        <span class="text-lg font-black text-gray-800">${s.dsr.rate}%</span>
                                        <span class="text-[10px] text-gray-400">beban cicilan dari gaji</span>
                                    </div>
                                    <div class="text-[9px] text-gray-400 mt-0.5">Cicilan ${App.formatRupiah(s.dsr.cicilan)} vs Gaji ${App.formatRupiah(s.dsr.gaji)}</div>
                                </div>
                            </div>

                            <!-- Character -->
                            <div class="p-3 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center gap-4">
                                <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 shadow-sm border border-gray-50">
                                    <i class="ri-user-star-line text-lg"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="flex justify-between items-center mb-1">
                                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Karakter / Histori Telat</span>
                                        ${getPill(s.histori.score, s.histori.score === 'merah' ? 'Buruk' : (s.histori.score === 'kuning' ? 'Cukup' : 'Sangat Baik'))}
                                    </div>
                                    <div class="flex items-baseline gap-1.5">
                                        <span class="text-lg font-black text-gray-800">${s.histori.telat}</span>
                                        <span class="text-[10px] text-gray-400">kali nunggak dalam 12 bulan</span>
                                    </div>
                                </div>
                            </div>

                            <!-- Capital/Collateral -->
                            <div class="p-3 bg-gray-50/50 rounded-2xl border border-gray-100 flex items-center gap-4">
                                <div class="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-gray-400 shadow-sm border border-gray-50">
                                    <i class="ri-safe-2-line text-lg"></i>
                                </div>
                                <div class="flex-1">
                                    <div class="flex justify-between items-center mb-1">
                                        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Coverage (Simpanan + Agunan)</span>
                                        ${getPill(s.simpanan.score, s.simpanan.score === 'merah' ? 'Lemah' : (s.simpanan.score === 'kuning' ? 'Cukup' : 'Kuat'))}
                                    </div>
                                    <div class="flex items-baseline gap-1.5">
                                        <span class="text-lg font-black text-gray-800">${s.simpanan.rate}%</span>
                                        <span class="text-[10px] text-gray-400">jaminan dari total pinjaman</span>
                                    </div>
                                    <div class="text-[9px] text-gray-400 mt-0.5">Total Jaminan: ${App.formatRupiah(s.simpanan.saldo)}</div>
                                </div>
                            </div>
                        </div>
                    `;

                    if (btnSubmit) btnSubmit.disabled = false;
                }, 800);
            }
        } else {
            document.getElementById('pf-sim').classList.add('hidden');
            const csCard = document.getElementById('pf-credit-score');
            if (csCard) csCard.classList.add('hidden');
            if (btnSubmit) btnSubmit.disabled = false;
        }
    },

    switchTab(index) {
        // Validate Tab 0 before proceeding to Tab 1
        if (index >= 1) {
            const anggotaId = document.getElementById('pf-anggota-id')?.value;
            const jumlah = parseFloat(document.getElementById('pf-jumlah')?.value) || 0;
            const tenor = parseInt(document.getElementById('pf-tenor')?.value) || 0;

            if (!anggotaId) { App.toast('Pilih anggota terlebih dahulu', 'warning'); return; }
            if (jumlah <= 0) { App.toast('Masukkan jumlah pinjaman yang valid', 'warning'); document.getElementById('pf-jumlah')?.focus(); return; }
            if (tenor <= 0) { App.toast('Masukkan tenor yang valid', 'warning'); document.getElementById('pf-tenor')?.focus(); return; }
        }

        const tabs = document.querySelectorAll('.tab-content');
        const btns = document.querySelectorAll('.tab-btn');
        tabs.forEach((t, i) => {
            if (i === index) t.classList.replace('hidden', 'block');
            else t.classList.replace('block', 'hidden');
        });
        btns.forEach((b, i) => {
            if (i === index) {
                b.classList.add('text-primary-600', 'border-primary-600');
                b.classList.remove('text-gray-500', 'border-transparent', 'hover:text-gray-700');
            } else {
                b.classList.remove('text-primary-600', 'border-primary-600');
                b.classList.add('text-gray-500', 'border-transparent', 'hover:text-gray-700');
            }
        });

        // Auto trigger kalkulasi saat masuk Tab 3 (Analisa Kelayakan)
        if (index === 2) this.calcSim();
    },

    async approve(id) {
        // Load data pinjaman & jenis biaya secara paralel
        const [resPnj, resBiaya] = await Promise.all([
            App.api(`pinjaman/${id}`),
            App.api('biaya-pinjaman?active=1')
        ]);
        if (!resPnj?.success) { App.toast('Gagal memuat data pinjaman', 'error'); return; }
        const p = resPnj.data;
        const biayaList = resBiaya?.data || [];

        // Hitung estimasi otomatis berdasarkan jumlah pinjaman
        const renderBiayaRows = (list, jumlah) => list.map((b, i) => {
            const est = b.tipe === 'persen' ? Math.round(jumlah * b.nilai / 100) : Math.round(b.nilai);
            return `<tr id="biaya-row-${i}">
                <td class="py-2 pr-3">
                    <input type="text" value="${b.nama}" class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" id="bname-${i}">
                </td>
                <td class="py-2 pr-2">
                    <input type="number" value="${est}" min="0" class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right" id="bjml-${i}" oninput="PinjamanPage.calcTotalBiaya()">
                    <input type="hidden" value="${b.id}" id="bjenis-${i}">
                </td>
                <td class="py-2 text-center">
                    <button type="button" onclick="PinjamanPage.removeBiayaRow(${i})" class="text-red-400 hover:text-red-600 p-1"><i class="ri-delete-bin-line"></i></button>
                </td>
            </tr>`;
        }).join('');

        App.openModal(`<div class="p-6 mx-auto w-full max-w-lg">
            <h3 class="text-lg font-bold text-gray-800 mb-1"><i class="ri-check-double-line text-emerald-500 mr-2"></i>Setujui & Cairkan Pinjaman</h3>
            <div class="bg-blue-50 rounded-xl px-4 py-3 mb-5 text-sm">
                <div class="font-semibold text-gray-700">${p.anggota_nama} &nbsp;·&nbsp; <span class="font-mono text-primary-600">${p.no_pinjaman}</span></div>
                <div class="mt-1">Jumlah: <span class="font-bold">${App.formatRupiah(p.jumlah)}</span> &nbsp;·&nbsp; Tenor: <span class="font-semibold">${p.tenor} bulan</span></div>
            </div>

            <div class="mb-4">
                <div class="flex items-center justify-between mb-2">
                    <h4 class="text-sm font-semibold text-gray-700"><i class="ri-coins-line text-amber-500 mr-1"></i>Biaya Pencairan</h4>
                    <button type="button" onclick="PinjamanPage.addBiayaRow()" class="text-xs bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5 text-gray-600 font-medium"><i class="ri-add-line mr-1"></i>Tambah Biaya</button>
                </div>
                <div class="border border-gray-200 rounded-xl overflow-hidden">
                    <table class="w-full text-sm">
                        <thead class="bg-gray-50">
                            <tr><th class="px-3 py-2 text-left font-medium text-gray-500 text-xs">Nama Biaya</th><th class="px-3 py-2 text-right font-medium text-gray-500 text-xs">Jumlah (Rp)</th><th class="w-8"></th></tr>
                        </thead>
                        <tbody id="biaya-tbody" class="divide-y divide-gray-100">
                            ${renderBiayaRows(biayaList, p.jumlah)}
                        </tbody>
                    </table>
                </div>
                <div class="flex justify-between items-center mt-2 px-1">
                    <span class="text-xs text-gray-500">Total biaya</span>
                    <span class="font-bold text-amber-700" id="total-biaya-lbl">${App.formatRupiah(biayaList.reduce((s, b) => s + (b.tipe === 'persen' ? Math.round(p.jumlah * b.nilai / 100) : Math.round(b.nilai)), 0))}</span>
                </div>
            </div>

            <div class="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onclick="App.closeModal()" class="px-4 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 text-gray-600">Batal</button>
                <button type="button" onclick="PinjamanPage.doApprove(${id})" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold"><i class="ri-check-line mr-1"></i>Setujui & Cairkan</button>
            </div>
        </div>`);

        // Simpan rowCount agar addBiayaRow tahu index
        PinjamanPage._approveJml = p.jumlah;
        PinjamanPage._biayaCount = biayaList.length;
    },

    calcTotalBiaya() {
        let total = 0;
        document.querySelectorAll('[id^="bjml-"]').forEach(el => { total += parseFloat(el.value) || 0; });
        const lbl = document.getElementById('total-biaya-lbl');
        if (lbl) lbl.textContent = App.formatRupiah(total);
    },

    addBiayaRow() {
        const tbody = document.getElementById('biaya-tbody');
        if (!tbody) return;
        const i = PinjamanPage._biayaCount++;
        const tr = document.createElement('tr');
        tr.id = `biaya-row-${i}`;
        tr.innerHTML = `
            <td class="py-2 pr-3">
                <input type="text" placeholder="Nama biaya" class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm" id="bname-${i}">
            </td>
            <td class="py-2 pr-2">
                <input type="number" value="0" min="0" class="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right" id="bjml-${i}" oninput="PinjamanPage.calcTotalBiaya()">
                <input type="hidden" value="" id="bjenis-${i}">
            </td>
            <td class="py-2 text-center">
                <button type="button" onclick="PinjamanPage.removeBiayaRow(${i})" class="text-red-400 hover:text-red-600 p-1"><i class="ri-delete-bin-line"></i></button>
            </td>`;
        tbody.appendChild(tr);
    },

    removeBiayaRow(i) {
        const row = document.getElementById(`biaya-row-${i}`);
        if (row) { row.remove(); this.calcTotalBiaya(); }
    },

    async doApprove(id) {
        // Kumpulkan data biaya dari form
        const biaya = [];
        document.querySelectorAll('[id^="bjml-"]').forEach(el => {
            const idx = el.id.replace('bjml-', '');
            const nama = document.getElementById(`bname-${idx}`)?.value?.trim();
            const jml = parseFloat(el.value) || 0;
            const jenisId = document.getElementById(`bjenis-${idx}`)?.value || null;
            if (nama && jml > 0) biaya.push({ nama, jumlah: jml, jenis_biaya_id: jenisId });
        });

        const ok = await App.confirm('Setujui Pinjaman', `Yakin ingin menyetujui pinjaman ini${biaya.length ? ` dengan ${biaya.length} komponen biaya` : ''}?`, 'question');
        if (!ok) return;

        const r = await App.api(`pinjaman/${id}/approve`, { method: 'PUT', body: { status: 'disetujui', biaya } });
        if (r?.success) {
            App.closeModal();
            App.toast(r.message, 'success');
            this.loadList(this.container);
        } else App.toast(r?.message || 'Gagal menyetujui pinjaman', 'error');
    },
    async pelunasan(pinjamanId) {
        const btn = document.querySelector(`button[onclick="PinjamanPage.pelunasan(${pinjamanId})"]`);
        if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ri-loader-4-line animate-spin mr-1"></i>Menghitung...'; }

        const res = await App.api(`angsuran/kalkulasi-lunas?pinjaman_id=${pinjamanId}`);

        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ri-checkbox-circle-line"></i>Lunasi Sekarang'; }

        if (!res?.success) { App.toast(res?.message || 'Gagal memuat kalkulasi', 'error'); return; }
        const k = res.data;
        this._lunasData = k; // Simpan untuk kalkulasi live

        App.openModal(`<div class="w-full">
            <div class="bg-gradient-to-br from-violet-600 to-primary-700 p-6 rounded-t-2xl sm:rounded-tl-2xl sm:rounded-tr-2xl text-white relative overflow-hidden">
                <div class="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                <button onclick="App.closeModal()" class="absolute top-4 right-4 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 rounded-full p-1.5 transition-colors"><i class="ri-close-line"></i></button>
                <div class="relative z-10">
                    <h3 class="text-xl font-bold mb-1 flex items-center"><i class="ri-checkbox-circle-line mr-2 text-violet-200"></i>Pelunasan Pinjaman</h3>
                    <p class="text-violet-100 text-sm opacity-90">${k.pinjaman.anggota_nama} &nbsp;·&nbsp; <span class="font-mono text-white">${k.pinjaman.no_pinjaman}</span></p>
                </div>
            </div>

            <div class="p-6">
                <!-- Sisa Pokok (Readonly) -->
                <div class="flex justify-between items-center mb-5 pb-4 border-b border-gray-100">
                    <div>
                        <div class="text-sm font-medium text-gray-500">Sisa Pokok Pinjaman</div>
                        <div class="text-xs text-gray-400 mt-0.5">Wajib dibayar penuh</div>
                    </div>
                    <div class="text-lg font-bold text-gray-800">${App.formatRupiah(k.sisa_pokok)}</div>
                </div>

                <!-- Bunga & Denda (Editable) -->
                <div class="space-y-4 mb-6">
                    <div>
                        <div class="flex justify-between mb-1.5 align-middle items-end">
                            <label class="block text-sm font-medium text-gray-700">Bunga Jatuh Tempo</label>
                            <span class="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">Bisa diubah</span>
                        </div>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">Rp</span>
                            <input type="number" id="lunas-bunga" value="${k.bunga_berjalan}" class="w-full border border-gray-300 focus:border-violet-500 focus:ring-violet-500 rounded-xl pl-9 pr-4 py-2.5 text-sm font-semibold text-gray-800 transition-colors" oninput="PinjamanPage.calcPelunasan()" min="0">
                        </div>
                        <div class="flex justify-between mt-1.5 text-xs">
                            <span class="text-gray-400">Total bunga berjalan dari sistem</span>
                            <span class="font-medium text-gray-500">${App.formatRupiah(k.bunga_berjalan)}</span>
                        </div>
                    </div>

                    ${k.denda_berjalan > 0 ? `
                    <div>
                        <div class="flex justify-between mb-1.5 align-middle items-end">
                            <label class="block text-sm font-medium text-red-600 flex items-center"><i class="ri-alarm-warning-line mr-1"></i>Denda Keterlambatan</label>
                            <span class="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-medium">Bisa diubah</span>
                        </div>
                        <div class="relative">
                            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-red-400 font-medium">Rp</span>
                            <input type="number" id="lunas-denda" value="${k.denda_berjalan}" class="w-full border border-red-200 focus:border-red-500 focus:ring-red-500 rounded-xl pl-9 pr-4 py-2.5 text-sm font-semibold text-red-700 box-border bg-red-50/30 transition-colors" oninput="PinjamanPage.calcPelunasan()" min="0">
                        </div>
                    </div>` : '<input type="hidden" id="lunas-denda" value="0">'}
                </div>

                <!-- Info Diskon & Sisa Angsuran -->
                ${k.bunga_dibebaskan > 0 || k.sisa_angsuran > 0 ? `
                <div class="bg-blue-50/50 border border-blue-100 rounded-xl p-3 mb-6 space-y-2">
                    ${k.bunga_dibebaskan > 0 ? `<div class="flex items-start gap-2 text-sm">
                        <i class="ri-gift-line text-blue-500 mt-0.5"></i>
                        <div><span class="text-gray-600">Diskon pelunasan:</span> <span class="font-semibold text-emerald-600">${App.formatRupiah(k.bunga_dibebaskan)}</span> <span class="text-xs text-gray-500 block">Bunga belum jatuh tempo dibebaskan</span></div>
                    </div>` : ''}
                    ${k.sisa_angsuran > 0 ? `<div class="flex items-start gap-2 text-sm pt-2 ${k.bunga_dibebaskan > 0 ? 'border-t border-blue-100/50' : ''}">
                        <i class="ri-information-line text-blue-500 mt-0.5"></i>
                        <div><span class="font-semibold text-gray-700">${k.sisa_angsuran} sisa angsuran</span> <span class="text-gray-600">berikutnya otomatis ditandai lunas.</span></div>
                    </div>` : ''}
                </div>` : ''}

                <!-- Total Pelunasan (Live) -->
                <div class="bg-gray-900 rounded-xl px-5 py-4 flex items-center justify-between mb-5 shadow-inner">
                    <span class="text-gray-300 font-medium">Total Pembayaran</span>
                    <span class="text-2xl font-bold text-white tracking-tight" id="lunas-total-lbl">${App.formatRupiah(k.total_pelunasan)}</span>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Keterangan (opsional)</label>
                    <input type="text" id="lunas-ket" class="w-full border border-gray-300 focus:border-violet-500 focus:ring-violet-500 rounded-xl px-4 py-2.5 text-sm transition-colors" placeholder="Contoh: Pelunasan dipercepat bulan ke-4">
                </div>

                <div class="flex gap-3 pt-6 mt-2">
                    <button type="button" onclick="App.closeModal()" class="w-1/3 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 text-gray-600 transition-colors">Batal</button>
                    <button type="button" onclick="PinjamanPage.doPelunasan(${pinjamanId})" class="w-2/3 py-2.5 bg-gradient-to-r from-violet-600 to-primary-600 hover:from-violet-700 hover:to-primary-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-500/30 transition-all transform hover:-translate-y-0.5"><i class="ri-checkbox-circle-line mr-1"></i>Konfirmasi Pelunasan</button>
                </div>
            </div>
        </div>`);
    },

    calcPelunasan() {
        if (!this._lunasData) return;
        const k = this._lunasData;

        let customBunga = document.getElementById('lunas-bunga')?.value;
        customBunga = customBunga === '' ? k.bunga_berjalan : (parseFloat(customBunga) || 0);

        let customDenda = document.getElementById('lunas-denda')?.value;
        customDenda = customDenda === '' ? k.denda_berjalan : (parseFloat(customDenda) || 0);

        const total = parseFloat(k.sisa_pokok) + customBunga + customDenda;
        document.getElementById('lunas-total-lbl').textContent = App.formatRupiah(total);
    },

    async doPelunasan(pinjamanId) {
        if (!this._lunasData) return;

        const k = this._lunasData;
        const totalHtml = document.getElementById('lunas-total-lbl').textContent;
        const keterangan = document.getElementById('lunas-ket')?.value || '';

        const bInput = document.getElementById('lunas-bunga')?.value;
        const dInput = document.getElementById('lunas-denda')?.value;

        const payload = { keterangan };
        if (bInput !== '') payload.bunga_custom = parseFloat(bInput) || 0;
        if (dInput !== '') payload.denda_custom = parseFloat(dInput) || 0;

        const ok = await App.confirm(
            'Konfirmasi Pelunasan',
            `Proses pelunasan sebesar <strong class="text-violet-700 text-lg">${totalHtml}</strong>?<br><small class="text-gray-500 mt-1 block">Tindakan ini tidak dapat dibatalkan dan mengubah status pinjaman menjadi Lunas.</small>`,
            'question'
        );
        if (!ok) return;

        const r = await App.api(`angsuran/${pinjamanId}/pelunasan`, {
            method: 'PUT',
            body: payload
        });

        if (r?.success) {
            App.closeModal();
            App.toast('Pelunasan berhasil! Pinjaman dinyatakan lunas.', 'success', 4000);
            this.loadDetail(this.container, pinjamanId);
        } else {
            App.toast(r?.message || 'Gagal memproses pelunasan', 'error');
        }
    },

    async exportApprovalLetter(p) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;

        // --- Digital Signature Generation ---
        const verifyUrl = `${window.location.origin}${window.location.pathname}?v=verify&id=${p.id}&no=${p.no_pinjaman}`;
        const verifyText = `Verified SPK: ${p.no_pinjaman}\nAnggota: ${p.anggota_nama}\nPlafon: ${App.formatRupiah(p.jumlah)}\nDate: ${new Date().toISOString()}`;
        
        // Use QRCode.js to generate data URL
        const qrContainer = document.createElement('div');
        qrContainer.style.display = 'none';
        document.body.appendChild(qrContainer);
        
        const qrcode = new QRCode(qrContainer, {
            text: verifyUrl,
            width: 256,
            height: 256,
            correctLevel: QRCode.CorrectLevel.H
        });

        // Wait a bit for canvas to render
        await new Promise(resolve => setTimeout(resolve, 100));
        const qrCanvas = qrContainer.querySelector('canvas');
        const qrImage = qrCanvas.toDataURL('image/png');
        document.body.removeChild(qrContainer);

        // --- PDF Rendering ---
        // Header
        const getS = (key, def = '') => App.settings[key]?.value || def;
        const namaKop = getS('nama_koperasi', 'KOPERASI SIMPAN PINJAM "APP-KOPERASI"');
        const alamatKop = getS('alamat', 'Jl. Raya Utama No. 123, Kel. Suka Maju, Kec. Cerdas, Kota Digital');
        const telpEmail = `Telp: ${getS('telepon', '(021) 1234567')} | Email: ${getS('email', 'info@koperasi-app.com')}`;

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(namaKop.toUpperCase(), pageWidth / 2, 15, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(alamatKop, pageWidth / 2, 20, { align: 'center' });
        doc.text(telpEmail, pageWidth / 2, 24, { align: 'center' });

        doc.setDrawColor(226, 232, 240); // slate-200
        doc.setLineWidth(0.5);
        doc.line(margin, 27, pageWidth - margin, 27);
        doc.setLineWidth(0.1);
        doc.line(margin, 28, pageWidth - margin, 28);

        // Title
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('SURAT PERSETUJUAN KREDIT (SPK)', pageWidth / 2, 38, { align: 'center' });
        doc.setFontSize(10);
        doc.setFont('courier', 'bold');
        doc.text('REF: ' + p.no_pinjaman, pageWidth / 2, 43, { align: 'center' });
        doc.setFont('helvetica', 'normal');

        // Body Content
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('I. RINCIAN PINJAMAN', margin, 53);

        doc.setFont('helvetica', 'normal');
        let y = 60;
        const leftCol = 25;
        const valCol = 80;

        const drawRow = (label, value, boldValue = false) => {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100, 116, 139);
            doc.text(label, leftCol, y);
            doc.text(':', valCol - 5, y);
            doc.setTextColor(15, 23, 42);
            if (boldValue) doc.setFont('helvetica', 'bold');
            doc.text(value.toString(), valCol, y);
            y += 6;
        };

        drawRow('Nama Anggota', p.anggota_nama);
        drawRow('No. Anggota', p.no_anggota);
        drawRow('Jenis Pinjaman', p.jenis_pinjaman);
        drawRow('Plafon Pinjaman', App.formatRupiah(p.jumlah), true);
        drawRow('Jangka waktu', p.tenor + ' Bulan');
        drawRow('Suku Bunga', p.bunga_persen + '% per bulan');
        drawRow('Tanggal Pengajuan', App.formatDate(p.created_at));

        // Section: Agunan
        if (p.agunan) {
            y += 2;
            doc.setFont('helvetica', 'bold');
            doc.text('II. AGUNAN / JAMINAN', margin, y);
            y += 7;
            doc.setFont('helvetica', 'normal');

            if (typeof p.agunan === 'object' && p.agunan.tipe) {
                drawRow('Tipe Agunan', p.agunan.tipe);
                if (p.agunan.data) {
                    Object.entries(p.agunan.data).forEach(([k, v]) => {
                        drawRow('- ' + k, v);
                    });
                }
            } else if (Array.isArray(p.agunan)) {
                p.agunan.forEach((a, i) => {
                    drawRow(`Item #${i+1}`, a.tipe);
                    Object.entries(a.data || {}).forEach(([k, v]) => {
                        drawRow('  ' + k, v);
                    });
                });
            } else {
                drawRow('Keterangan', p.agunan);
            }
        }

        // Section: Biaya
        y += 2;
        doc.setFont('helvetica', 'bold');
        doc.text('III. RINCIAN BIAYA & POTONGAN', margin, y);
        y += 7;
        doc.setFont('helvetica', 'normal');

        (p.biaya_pencairan || []).forEach(b => {
            drawRow('- ' + b.nama_biaya, App.formatRupiah(b.jumlah));
        });

        doc.setFont('helvetica', 'bold');
        drawRow('Total Potongan', App.formatRupiah(p.total_biaya || 0));
        doc.setTextColor(16, 185, 129); // emerald-500
        drawRow('JUMLAH DITERIMA BERSIH', App.formatRupiah(p.jumlah - (p.total_biaya || 0)), true);
        doc.setTextColor(15, 23, 42);

        // Section: Jadwal Angsuran
        y += 4;
        doc.setFont('helvetica', 'bold');
        doc.text('IV. JADWAL ANGSURAN', margin, y);

        const scheduleData = (p.angsuran || []).map(a => [
            a.angsuran_ke,
            App.formatDate(a.tgl_jatuh_tempo),
            App.formatRupiah(a.pokok),
            App.formatRupiah(a.bunga),
            App.formatRupiah(parseFloat(a.pokok) + parseFloat(a.bunga))
        ]);

        doc.autoTable({
            startY: y + 4,
            margin: { left: margin, right: margin },
            head: [['Ke-', 'Jatuh Tempo', 'Pokok', 'Bunga', 'Total Tagihan']],
            body: scheduleData,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], fontSize: 8, halign: 'center', fontStyle: 'bold' },
            bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                2: { halign: 'right' },
                3: { halign: 'right' },
                4: { halign: 'right', fontStyle: 'bold' }
            }
        });

        y = doc.lastAutoTable.finalY + 10;

        // Terms
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105); // slate-600
        const terms = 'Pernyataan: Dengan menandatangani surat ini, Anggota menyatakan telah memahami dan setuju terhadap rincian pinjaman tersebut di atas serta bersedia mematuhi segala peraturan yang berlaku di Koperasi.';
        const splitText = doc.splitTextToSize(terms, pageWidth - (margin * 2));

        // Final page check
        if (y + splitText.length * 5 + 50 > pageHeight) {
            doc.addPage();
            y = 20;
        }

        doc.text(splitText, margin, y);
        y += (splitText.length * 5) + 10;

        // Signatures Area
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(9);
        doc.text('Kota Digital, ' + App.todayDMY(), pageWidth - margin - 50, y);
        
        y += 7;
        const sigY = y;
        doc.setFont('helvetica', 'bold');
        doc.text('PENGURUS KOPERASI', margin + 5, sigY);
        doc.text('ANGGOTA / PEMINJAM', pageWidth - margin - 45, sigY);

        // Digital Signature Stamp (Koperasi side)
        y += 5;
        doc.addImage(qrImage, 'PNG', margin + 10, y, 22, 22);
        
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(79, 70, 229); // indigo-600
        doc.text('DIGITALLY SIGNED', margin + 35, y + 8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text('Verify authenticity by', margin + 35, y + 12);
        doc.text('scanning this QR Code', margin + 35, y + 15);
        doc.setFont('courier', 'normal');
        doc.text('ID: ' + btoa(p.no_pinjaman).substring(0, 12), margin + 35, y + 19);

        // Member Signature Placeholder
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(203, 213, 225); // slate-300
        doc.text('( Tanda Tangan Anggota )', pageWidth - margin - 45, y + 15);

        y += 30;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('( ' + (p.approved_by_nama || 'PENGURUS') + ' )', margin + 5, y);
        doc.text('( ' + p.anggota_nama + ' )', pageWidth - margin - 45, y);

        // Footer small print
        doc.setFontSize(7);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(148, 163, 184);
        doc.text('Dokumen ini diterbitkan secara elektronik dan merupakan bukti sah persetujuan kredit.', pageWidth / 2, pageHeight - 10, { align: 'center' });

        window.open(doc.output('bloburl'), '_blank');
    },

    export(type) {
        const search = document.getElementById('pnj-search')?.value || '';
        const status = document.getElementById('pnj-status')?.value || '';
        App.api(`pinjaman?search=${encodeURIComponent(search)}&status=${status}&limit=1000`).then(res => {
            if (!res?.success) return;
            const columns = [
                { title: 'No. Pinjaman', key: 'no_pinjaman' },
                { title: 'Anggota', key: 'anggota_nama' },
                { title: 'Jenis', key: 'jenis_pinjaman' },
                { title: 'Jumlah', key: 'jumlah_fmt', align: 'right' },
                { title: 'Tenor', key: 'tenor_fmt', align: 'center' },
                { title: 'Sisa', key: 'sisa_fmt', align: 'right' },
                { title: 'Status', key: 'status_label' }
            ];
            const rows = res.data.map(p => ({
                ...p,
                jumlah_fmt: App.formatRupiah(p.jumlah),
                tenor_fmt: p.tenor + ' bln',
                sisa_fmt: App.formatRupiah(p.sisa_pinjaman),
                status_label: (p.status || '-').toUpperCase()
            }));
            App.export(type, 'Data Pinjaman', columns, rows, { filename: 'data_pinjaman' });
        });
    },

    async reject(id) {
        const ok = await App.confirm('Tolak Pinjaman', 'Yakin ingin menolak pinjaman ini?', 'warning');
        if (!ok) return;
        const r = await App.api(`pinjaman/${id}/approve`, { method: 'PUT', body: { status: 'ditolak' } });
        if (r?.success) {
            App.toast(r.message, 'success');
            this.loadList(this.container);
        } else App.toast(r?.message || 'Gagal', 'error');
    },

    paginate(p) {
        this.loadList(this.container, p);
    },

    async confirmReverse(id, noPinjaman) {
        const ok = await App.confirm(`Konfirmasi Reversal Pencairan`, `Apakah Anda yakin ingin membatalkan (reverse) pencairan pinjaman <b>${noPinjaman}</b>? Status pinjaman akan kembali menjadi Disetujui (sebelum cair).`, 'warning');
        if (ok) this.reverse(id);
    },

    async reverse(id) {
        const res = await App.api(`pinjaman/reverse`, {
            method: 'POST',
            body: { id }
        });
        if (res?.success) {
            App.toast(res.message, 'success');
            if (location.hash.includes(`pinjaman/${id}`)) {
                this.loadDetail(this.container, id);
            } else {
                this.loadList(this.container, this.page);
            }
        } else {
            App.toast(res?.message || 'Gagal melakukan reversal', 'error');
        }
    }
};
window.PinjamanPage = PinjamanPage;
export default PinjamanPage;
