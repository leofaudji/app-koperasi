// Angsuran Page
const AngsuranPage = {
    page: 1,
    async render(container) {
        App.setTitle('Pembayaran Angsuran', 'Kelola angsuran pinjaman');
        this.container = container;
        this.loadList(container);
    },

    async loadList(container, page = 1) {
        this.page = page;
        const search = document.getElementById('ags-search')?.value || '';
        const status = document.getElementById('ags-status')?.value || '';
        const res = await App.api(`angsuran?page=${page}&search=${encodeURIComponent(search)}&status=${status}`);
        if (!res?.success) return;

        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div class="flex items-center gap-3 flex-1">
                    <div class="relative flex-1 max-w-md"><i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="ags-search" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="Cari..." value="${search}" onkeyup="if(event.key==='Enter')AngsuranPage.loadList(AngsuranPage.container)"></div>
                    <select id="ags-status" class="border border-gray-200 rounded-xl px-3 py-2.5 text-sm" onchange="AngsuranPage.loadList(AngsuranPage.container)">
                        <option value="">Semua</option><option value="belum" ${status === 'belum' ? 'selected' : ''}>Belum Bayar</option><option value="lunas">Lunas</option><option value="terlambat">Terlambat</option></select>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="AngsuranPage.export('pdf')" class="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Export PDF">
                        <i class="ri-file-pdf-line text-xl"></i>
                    </button>
                    <button onclick="AngsuranPage.export('csv')" class="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Export CSV">
                        <i class="ri-file-excel-line text-xl"></i>
                    </button>
                    ${App.hasPerm('angsuran.create') ? '<button onclick="AngsuranPage.form()" class="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-emerald-500/25"><i class="ri-money-dollar-circle-line"></i> Bayar Angsuran</button>' : ''}
                </div>
            </div>
            <div class="table-wrapper"><table class="data-table w-full text-sm">
                <thead><tr class="bg-gray-50"><th class="px-4 py-3 text-left font-medium text-gray-500">Informasi Pinjaman</th><th class="px-4 py-3 text-left font-medium text-gray-500">Jatuh Tempo</th><th class="px-4 py-3 text-right font-medium text-gray-500">Pokok</th><th class="px-4 py-3 text-right font-medium text-gray-500">Bunga</th><th class="px-4 py-3 text-right font-medium text-gray-500">Total</th><th class="px-4 py-3 text-center font-medium text-gray-500">Status</th><th class="px-4 py-3 text-center font-medium text-gray-500">Aksi</th></tr></thead>
                <tbody>${res.data.map(a => `<tr class="border-t border-gray-50">
                    <td class="px-4 py-3">
                        <div class="flex flex-col">
                            <span class="font-bold text-gray-800">${a.anggota_nama}</span>
                            <div class="flex items-center gap-2 mt-1">
                                <span class="font-mono text-[10px] text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded border border-primary-100">${a.no_pinjaman}</span>
                                <span class="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">KE-${a.angsuran_ke}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-gray-500">${App.formatDate(a.tgl_jatuh_tempo)}</td>
                    <td class="px-4 py-3 text-right">${App.formatRupiah(a.pokok)}</td>
                    <td class="px-4 py-3 text-right">${App.formatRupiah(a.bunga)}</td>
                    <td class="px-4 py-3 text-right font-semibold">${App.formatRupiah(a.total)}</td>
                    <td class="px-4 py-3 text-center">${App.statusBadge(a.status)}</td>
                    <td class="px-4 py-3 text-center">
                        ${a.status === 'belum' && App.hasPerm('angsuran.create') ? `
                            <button onclick="AngsuranPage.form(${a.pinjaman_id})" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"><i class="ri-money-dollar-circle-line mr-1"></i>Bayar</button>
                        ` : (a.tgl_bayar ? `
                            <div class="flex items-center justify-center gap-2">
                                <span class="text-xs text-gray-500">${App.formatDate(a.tgl_bayar)}</span>
                                <button onclick="AngsuranPage.confirmReverse(${a.id}, '${a.no_pinjaman}', ${a.angsuran_ke})" class="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all" title="Reverse Pembayaran"><i class="ri-arrow-go-back-line"></i></button>
                            </div>
                        ` : '-')}
                    </td>
                </tr>`).join('')}
                ${res.data.length === 0 ? '<tr><td colspan="7" class="text-center py-8 text-gray-400">Tidak ada data</td></tr>' : ''}</tbody></table></div>
            ${App.renderPagination(res.pagination, 'AngsuranPage.paginate')}</div>`;
    },

    async form(pinjamanId = null) {
        App.openModal(`<div class="p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-6"><i class="ri-money-dollar-circle-line text-emerald-500 mr-2"></i>Pembayaran Angsuran</h3>
            <form id="ags-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Cari Anggota atau No. Pinjaman *</label>
                    <div class="relative">
                        <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="af-search" class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" placeholder="Ketik nama atau no pinjaman..." autocomplete="off">
                    </div>
                    <div id="af-results" class="hidden border border-gray-200 rounded-xl mt-1 max-h-60 overflow-auto bg-white shadow-xl z-50"></div>
                </div>

                <div id="af-loan-box" class="hidden bg-emerald-50 border border-emerald-100 rounded-xl p-4 animate-fadeIn">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <div id="info-nama" class="font-bold text-gray-800 text-base"></div>
                            <div id="info-pinjaman" class="font-mono text-xs text-primary-600"></div>
                        </div>
                        <div class="text-right">
                            <div class="text-[0.65rem] text-gray-400 uppercase tracking-wider">Sisa Hutang</div>
                            <div id="info-sisa" class="font-bold text-emerald-700 text-lg"></div>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 text-xs">
                        <div class="bg-white/50 px-2.5 py-1 rounded-lg border border-emerald-100">
                            <span class="text-gray-400">Angsuran Ke:</span> <span id="info-ke" class="font-bold text-gray-700"></span>
                        </div>
                        <div class="bg-white/50 px-2.5 py-1 rounded-lg border border-emerald-100">
                            <span class="text-gray-400">Status:</span> <span id="info-status" class="font-bold text-gray-700"></span>
                        </div>
                    </div>
                </div>

                <input type="hidden" id="af-angsuran-id">
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Pokok (Rp) *</label>
                        <input type="number" id="af-pokok" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 font-medium" placeholder="0">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Jasa/Bunga (Rp) *</label>
                        <input type="number" id="af-bunga" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 font-medium" placeholder="0">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1 text-red-600">Denda Terlambat (Rp)</label>
                        <input type="number" id="af-denda" class="w-full border border-red-200 bg-red-50 focus:ring-2 focus:ring-red-500 rounded-xl px-4 py-2.5 text-sm font-bold text-red-600" placeholder="0">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Total Bayar (Rp)</label>
                        <input type="text" id="af-total-view" class="w-full border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-2.5 text-sm font-bold text-emerald-700 text-lg" readonly>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Keterangan</label>
                    <textarea id="af-ket" rows="2" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" placeholder="Contoh: Angsuran k-3 lancar..."></textarea>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onclick="App.closeModal()" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 text-gray-600">Batal</button>
                    <button type="submit" id="af-submit" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed" disabled>Simpan Pembayaran</button>
                </div>
            </form>
        </div>`);

        const searchInput = document.getElementById('af-search');
        const resultsDiv = document.getElementById('af-results');
        const pokokInput = document.getElementById('af-pokok');
        const bungaInput = document.getElementById('af-bunga');
        const dendaInput = document.getElementById('af-denda');
        const totalView = document.getElementById('af-total-view');

        let debounce;

        const calculateTotal = () => {
            const p = parseFloat(pokokInput.value) || 0;
            const b = parseFloat(bungaInput.value) || 0;
            const d = parseFloat(dendaInput.value) || 0;
            totalView.value = App.formatRupiah(p + b + d);
        };

        [pokokInput, bungaInput, dendaInput].forEach(el => {
            el.addEventListener('input', calculateTotal);
        });

        searchInput.addEventListener('input', e => {
            clearTimeout(debounce);
            const q = e.target.value.trim();
            if (q.length < 2) { resultsDiv.classList.add('hidden'); return; }

            debounce = setTimeout(async () => {
                const res = await App.api(`pinjaman?search=${encodeURIComponent(q)}&status=cair&per_page=5`);
                if (res?.data?.length) {
                    resultsDiv.innerHTML = res.data.map(p => `
                        <div class="px-4 py-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-50 last:border-0" 
                             onclick="AngsuranPage.selectLoan(${p.id})">
                            <div class="flex justify-between items-center">
                                <span class="font-medium text-gray-800">${p.anggota_nama}</span>
                                <span class="text-[0.65rem] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">${p.no_pinjaman}</span>
                            </div>
                            <div class="text-xs text-gray-400 mt-0.5">${p.jenis_pinjaman} | Sisa: ${App.formatRupiah(p.sisa_pinjaman)}</div>
                        </div>
                    `).join('');
                    resultsDiv.classList.remove('hidden');
                } else {
                    resultsDiv.innerHTML = '<div class="px-4 py-3 text-gray-400 text-xs italic">Pinjaman aktif tidak ditemukan</div>';
                    resultsDiv.classList.remove('hidden');
                }
            }, 300);
        });

        if (pinjamanId) this.selectLoan(pinjamanId);

        document.getElementById('ags-form').onsubmit = async e => {
            e.preventDefault();
            const angsuranId = document.getElementById('af-angsuran-id').value;
            const loanId = this.currentLoanId;

            const body = {
                angsuran_id: angsuranId,
                pinjaman_id: loanId,
                pokok: parseFloat(pokokInput.value) || 0,
                bunga: parseFloat(bungaInput.value) || 0,
                denda: parseFloat(dendaInput.value) || 0,
                keterangan: document.getElementById('af-ket').value
            };

            const res = await App.api('angsuran', { method: 'POST', body });

            if (res?.success) {
                App.closeModal();
                const d = res.data;
                App.toast(`Berhasil: Angsuran ${d.angsuran_ke === 'Manual' ? 'Manual' : 'ke-' + d.angsuran_ke} telah dibayar. Total: ${App.formatRupiah(d.total_bayar)}`, 'success', 5000);
                this.loadList(this.container, this.page);
            } else {
                App.toast(res?.message || 'Gagal menyimpan pembayaran', 'error');
            }
        };
    },

    async selectLoan(id) {
        this.currentLoanId = id;
        const res = await App.api(`angsuran/next?pinjaman_id=${id}`);
        const data = res?.data;

        document.getElementById('af-results').classList.add('hidden');
        if (!data) {
            App.toast('Hore! Pinjaman ini sudah lunas atau tidak memiliki jadwal angsuran.', 'info');
            return;
        }

        document.getElementById('af-search').value = `${data.no_pinjaman} - ${data.anggota_nama}`;
        document.getElementById('af-angsuran-id').value = data.id;

        // Update Info Box
        document.getElementById('af-loan-box').classList.remove('hidden');
        document.getElementById('info-nama').textContent = data.anggota_nama;
        document.getElementById('info-pinjaman').textContent = data.no_pinjaman;
        document.getElementById('info-sisa').textContent = App.formatRupiah(data.sisa_pinjaman);
        document.getElementById('info-ke').textContent = `${data.angsuran_ke} dari ${data.tenor}`;
        document.getElementById('info-status').textContent = data.terbayar >= data.tenor ? 'Lunas' : 'Aktif';

        // Update Form Fields (using numeric values for inputs)
        document.getElementById('af-pokok').value = data.pokok;
        document.getElementById('af-bunga').value = data.bunga;
        document.getElementById('af-denda').value = data.denda_hitung;

        // Trigger calculation
        const pokokInput = document.getElementById('af-pokok');
        const bungaInput = document.getElementById('af-bunga');
        const dendaInput = document.getElementById('af-denda');
        const totalView = document.getElementById('af-total-view');

        const calc = () => {
            const p = parseFloat(pokokInput.value) || 0;
            const b = parseFloat(bungaInput.value) || 0;
            const d = parseFloat(dendaInput.value) || 0;
            totalView.value = App.formatRupiah(p + b + d);
        };
        calc();

        document.getElementById('af-submit').disabled = false;
        document.getElementById('af-ket').focus();
    },

    paginate(p) { this.loadList(this.container, p); },

    async confirmReverse(id, noPinjaman, ke) {
        const ok = await App.confirm(`Konfirmasi Reversal`, `Apakah Anda yakin ingin membatalkan (reverse) pembayaran angsuran <b>${noPinjaman}</b> ke-<b>${ke}</b>? Baki debet pinjaman akan dikembalikan.`, 'warning');
        if (ok) this.reverse(id);
    },

    async reverse(id) {
        const res = await App.api(`angsuran/reverse`, {
            method: 'POST',
            body: { id }
        });
        if (res?.success) {
            App.toast(res.message, 'success');
            this.loadList(this.container, this.page);
        } else {
            App.toast(res?.message || 'Gagal melakukan reversal', 'error');
        }
    },

    async export(type) {
        const search = document.getElementById('ags-search')?.value || '';
        const status = document.getElementById('ags-status')?.value || '';
        const res = await App.api(`angsuran?search=${encodeURIComponent(search)}&status=${status}&per_page=1000`);
        if (!res?.success) return;

        const columns = [
            { title: 'No. Pinjaman', key: 'no_pinjaman' },
            { title: 'Anggota', key: 'anggota_nama' },
            { title: 'Ke', key: 'angsuran_ke', align: 'center' },
            { title: 'Jatuh Tempo', key: 'tgl_jatuh_tempo' },
            { title: 'Pokok', key: 'pokok', align: 'right' },
            { title: 'Bunga', key: 'bunga', align: 'right' },
            { title: 'Total', key: 'total_val', align: 'right' },
            { title: 'Status', key: 'status_label' }
        ];

        const rows = res.data.map(a => ({
            ...a,
            tgl_jatuh_tempo: App.formatDate(a.tgl_jatuh_tempo),
            pokok: App.formatRupiah(a.pokok),
            bunga: App.formatRupiah(a.bunga),
            total_val: App.formatRupiah(a.total),
            status_label: a.status.toUpperCase()
        }));

        App.export(type, 'Daftar Tagihan Angsuran', columns, rows, { filename: 'daftar_angsuran' });
    }
};
window.AngsuranPage = AngsuranPage;
export default AngsuranPage;
