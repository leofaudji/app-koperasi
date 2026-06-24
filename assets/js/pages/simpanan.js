// Simpanan Page
const SimpananPage = {
    page: 1,
    async render(container) {
        App.setTitle('Transaksi Simpanan', 'Kelola simpanan anggota');
        this.container = container;
        this.defaultJenisCode = App.queryParams?.jenis_simpanan || '';
        this.autoOpenForm = App.queryParams?.auto_form === '1';
        await this.loadList(container);
        if (this.autoOpenForm) {
            this.form({ defaultJenisCode: this.defaultJenisCode });
        }
    },

    async loadList(container, page = 1) {
        this.page = page;
        const search = document.getElementById('simp-search')?.value || '';
        const anggotaId = App.queryParams?.anggota_id || '';
        const res = await App.api(`simpanan?page=${page}&search=${encodeURIComponent(search)}&anggota_id=${anggotaId}`);
        if (!res?.success) return;

        container.innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div class="relative flex-1 max-w-md"><i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input type="text" id="simp-search" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" placeholder="Cari transaksi..." value="${search}" onkeyup="if(event.key==='Enter')SimpananPage.loadList(SimpananPage.container)"></div>
                <div class="flex items-center gap-2">
                    <button onclick="SimpananPage.export('pdf')" class="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Export PDF"><i class="ri-file-pdf-line text-lg"></i></button>
                    <button onclick="SimpananPage.export('csv')" class="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Export CSV"><i class="ri-file-excel-line text-lg"></i></button>
                    ${App.hasPerm('simpanan.create') ? '<button onclick="SimpananPage.form()" class="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-emerald-500/25 ml-2"><i class="ri-add-line"></i> Transaksi Baru</button>' : ''}
                </div>
            </div>
            <div class="table-wrapper">
                <table class="data-table w-full text-sm">
                    <thead><tr class="bg-gray-50"><th class="px-3 py-3 text-left font-medium text-gray-500">No. Transaksi</th><th class="px-3 py-3 text-left font-medium text-gray-500">Tanggal</th><th class="px-3 py-3 text-left font-medium text-gray-500">Anggota / Rekening</th><th class="px-3 py-3 text-left font-medium text-gray-500">Jenis / Transaksi</th><th class="px-3 py-3 text-right font-medium text-gray-500">Jumlah</th><th class="px-3 py-3 text-center font-medium text-gray-500">Aksi</th></tr></thead>
                    <tbody>${res.data.map(s => `<tr class="border-t border-gray-50">
                        <td class="px-3 py-3 font-mono text-xs text-primary-600">${s.no_transaksi}</td>
                        <td class="px-3 py-3 text-gray-500">${App.formatDate(s.tgl_transaksi)}</td>
                        <td class="px-3 py-3"><div class="font-medium text-gray-800">${s.anggota_nama}</div><div class="text-[11px] text-gray-400 mt-1">${s.no_anggota}${s.no_rekening ? ` · ${s.no_rekening}` : ''}</div></td>
                        <td class="px-3 py-3 text-gray-500"><div class="font-medium">${s.jenis_simpanan}</div><div class="text-[11px] text-gray-400 mt-1"><span class="font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">${s.kode_transaksi}</span> ${s.nama_transaksi}</div></td>
                        <td class="px-3 py-3 text-right font-semibold ${s.dk === 'D' ? 'text-emerald-600' : 'text-red-500'}"><span class="inline-flex items-center gap-1"><span class="text-[10px] ${s.dk === 'D' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} rounded-full px-2 py-1">${s.dk}</span>${s.dk === 'D' ? '+' : '-'}${App.formatRupiah(s.jumlah)}</span></td>
                        <td class="px-3 py-3 text-center">
                            ${s.keterangan?.includes('REVERSAL') ? `<span class="text-[10px] bg-red-50 text-red-600 px-2 py-1 rounded font-bold uppercase">Reversed</span>` : `
                            <button onclick="SimpananPage.confirmReverse(${s.id}, '${s.no_transaksi}')" class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Reverse Transaksi"><i class="ri-arrow-go-back-line"></i></button>
                            `}
                        </td>
                    </tr>`).join('')}
                    ${res.data.length === 0 ? '<tr><td colspan="6" class="text-center py-8 text-gray-400">Tidak ada transaksi</td></tr>' : ''}</tbody>
                </table>
            </div>
            ${App.renderPagination(res.pagination, 'SimpananPage.paginate')}
        </div>`;
    },

    async form(options = {}) {
        const ktRes = await App.api('kode-transaksi');
        const kodeList = ktRes?.data || [];
        const defaultJenisCode = options.defaultJenisCode || this.defaultJenisCode || '';
        const jenisLabel = defaultJenisCode === 'SW' ? 'Simpanan Wajib' : defaultJenisCode === 'SP' ? 'Simpanan Pokok' : defaultJenisCode === 'SS' ? 'Simpanan Sukarela' : '';
        const jenisFilter = defaultJenisCode ? `&jenis_simpanan=${defaultJenisCode}` : '';

        App.openModal(`<div class="p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-6"><i class="ri-exchange-funds-line text-emerald-500 mr-2"></i>Transaksi Simpanan</h3>
            ${jenisLabel ? `<div class="rounded-2xl border border-primary-100 bg-primary-50 text-primary-700 px-4 py-3 mb-4 text-sm">Mode shortcut: <strong>${jenisLabel}</strong>. Pilih rekening anggota yang memiliki jenis simpanan ini.</div>` : ''}
            <form id="simp-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Cari Rekening atau Anggota *</label>
                    <div class="relative">
                        <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="sf-search" class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" placeholder="${jenisLabel ? `Ketik nomor rekening / anggota untuk ${jenisLabel}...` : 'Ketik nomor rekening, nama, atau no anggota...'}" autocomplete="off">
                    </div>
                    <div id="sf-results" class="hidden border border-gray-200 rounded-xl mt-1 max-h-60 overflow-auto bg-white shadow-xl z-50"></div>
                </div>

                <div id="sf-account-box" class="hidden bg-emerald-50 border border-emerald-100 rounded-xl p-4 animate-fadeIn">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <div id="info-nama" class="font-bold text-gray-800 text-base"></div>
                            <div id="info-rekening" class="font-mono text-xs text-primary-600"></div>
                        </div>
                        <div class="text-right">
                            <div class="text-[0.65rem] text-gray-400 uppercase tracking-wider">Saldo Saat Ini</div>
                            <div id="info-saldo" class="font-bold text-emerald-700 text-lg"></div>
                        </div>
                    </div>
                    <div id="info-jenis" class="text-xs text-gray-500 italic"></div>
                </div>

                <input type="hidden" id="sf-rekening-id">
                <input type="hidden" id="sf-anggota-id">
                <input type="hidden" id="sf-jenis-id">
                <input type="hidden" id="sf-default-jenis" value="${defaultJenisCode}">

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Kode Transaksi *</label>
                        <select id="sf-kode" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500">
                            ${kodeList.map(k => `<option value="${k.id}" data-dk="${k.dk}">${k.kode} - ${k.nama} (${k.dk === 'D' ? 'Debit/Masuk' : 'Kredit/Keluar'})</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Tanggal *</label>
                        <input type="text" id="sf-tgl" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Jumlah (Rp) *</label>
                        <input type="number" id="sf-jumlah" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 font-bold" min="1" step="any" required>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Keterangan</label>
                    <textarea id="sf-ket" rows="2" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" placeholder="Opsional..."></textarea>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onclick="App.closeModal()" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 text-gray-600">Batal</button>
                    <button type="submit" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/20">Simpan Transaksi</button>
                </div>
            </form>
        </div>`);

        App.datepicker('#sf-tgl', { defaultDate: 'today' });

        let debounce;
        const searchInput = document.getElementById('sf-search');
        const resultsDiv = document.getElementById('sf-results');

        searchInput.addEventListener('input', e => {
            clearTimeout(debounce);
            const q = e.target.value.trim();
            if (q.length < 2) {
                resultsDiv.classList.add('hidden');
                return;
            }

            debounce = setTimeout(async () => {
                const jenisFilter = defaultJenisCode ? `&jenis_simpanan=${defaultJenisCode}` : '';
                const res = await App.api(`rekening-simpanan?search=${encodeURIComponent(q)}&per_page=5${jenisFilter}`);
                if (res?.data?.length) {
                    resultsDiv.innerHTML = res.data.map(r => `
                        <div class="px-4 py-3 hover:bg-emerald-50 cursor-pointer border-b border-gray-50 last:border-0" 
                             onclick="SimpananPage.selectAccount(${JSON.stringify(r).replace(/"/g, '&quot;')})">
                            <div class="flex justify-between items-center">
                                <span class="font-medium text-gray-800">${r.anggota_nama}</span>
                                <span class="text-[0.65rem] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-mono">${r.no_rekening}</span>
                            </div>
                            <div class="text-xs text-gray-400 mt-0.5">${r.jenis_simpanan_nama} | Saldo: ${App.formatRupiah(r.saldo)}</div>
                        </div>
                    `).join('');
                    resultsDiv.classList.remove('hidden');
                } else {
                    resultsDiv.innerHTML = '<div class="px-4 py-3 text-gray-400 text-xs italic">Rekening tidak ditemukan</div>';
                    resultsDiv.classList.remove('hidden');
                }
            }, 300);
        });

        document.getElementById('simp-form').onsubmit = async e => {
            e.preventDefault();
            const rekeningId = document.getElementById('sf-rekening-id').value;
            if (!rekeningId) {
                App.toast('Silakan cari dan pilih rekening terlebih dahulu', 'warning');
                searchInput.focus();
                return;
            }

            const body = {
                rekening_id: rekeningId,
                anggota_id: document.getElementById('sf-anggota-id').value,
                jenis_simpanan_id: document.getElementById('sf-jenis-id').value,
                kode_transaksi_id: document.getElementById('sf-kode').value,
                tgl_transaksi: App.dateToISO(document.getElementById('sf-tgl').value),
                jumlah: document.getElementById('sf-jumlah').value,
                keterangan: document.getElementById('sf-ket').value
            };

            const res = await App.api('simpanan', { method: 'POST', body });
            if (res?.success) {
                App.closeModal();
                App.toast(`Berhasil: ${res.message} | Saldo Akhir: ${App.formatRupiah(res.data.saldo_sesudah)}`, 'success', 5000);
                this.loadList(this.container, this.page);
            } else {
                App.toast(res?.message || 'Gagal menyimpan transaksi', 'error');
            }
        };
    },

    selectAccount(r) {
        document.getElementById('sf-rekening-id').value = r.id;
        document.getElementById('sf-anggota-id').value = r.anggota_id;
        document.getElementById('sf-jenis-id').value = r.jenis_simpanan_id;
        document.getElementById('sf-search').value = `${r.no_rekening} - ${r.anggota_nama}`;
        document.getElementById('sf-results').classList.add('hidden');

        // Update Info Box
        const box = document.getElementById('sf-account-box');
        document.getElementById('info-nama').textContent = r.anggota_nama;
        document.getElementById('info-rekening').textContent = r.no_rekening;
        document.getElementById('info-saldo').textContent = App.formatRupiah(r.saldo);
        document.getElementById('info-jenis').textContent = r.jenis_simpanan_nama;

        box.classList.remove('hidden');
        document.getElementById('sf-jumlah').focus();
    },

    export(type) {
        const search = document.getElementById('simp-search')?.value || '';
        App.api(`simpanan?search=${encodeURIComponent(search)}&limit=1000`).then(res => {
            if (!res?.success) return;
            const columns = [
                { title: 'No. Transaksi', key: 'no_transaksi' },
                { title: 'Tanggal', key: 'tgl_fmt' },
                { title: 'Anggota', key: 'anggota_nama' },
                { title: 'No. Anggota', key: 'no_anggota' },
                { title: 'Jenis', key: 'jenis_simpanan' },
                { title: 'Kode', key: 'kode_transaksi' },
                { title: 'Nama Transaksi', key: 'nama_transaksi' },
                { title: 'D/K', key: 'dk' },
                { title: 'Jumlah', key: 'jumlah_fmt', align: 'right' }
            ];
            const rows = res.data.map(s => ({
                ...s,
                tgl_fmt: App.formatDate(s.tgl_transaksi),
                jumlah_fmt: (s.dk === 'D' ? '+' : '-') + App.formatRupiah(s.jumlah)
            }));
            App.export(type, 'Data Transaksi Simpanan', columns, rows, { filename: 'data_simpanan' });
        });
    },

    paginate(p) { this.loadList(this.container, p); },

    async confirmReverse(id, noTrx) {
        const ok = await App.confirm(`Konfirmasi Reversal`, `Apakah Anda yakin ingin membatalkan (reverse) transaksi <b>${noTrx}</b>? Saldo anggota akan disesuaikan kembali.`, 'warning');
        if (ok) this.reverse(id);
    },

    async reverse(id) {
        const res = await App.api(`simpanan/reverse`, {
            method: 'POST',
            body: { id }
        });
        if (res?.success) {
            App.toast(res.message, 'success');
            this.loadList(this.container, this.page);
        } else {
            App.toast(res?.message || 'Gagal melakukan reversal', 'error');
        }
    }

};

window.SimpananPage = SimpananPage;
export default SimpananPage;
