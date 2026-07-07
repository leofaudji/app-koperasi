// Jurnal Umum Page
const JurnalPage = {
    data: [],
    container: null,
    akuns: [],

    async render(container) {
        App.setTitle('Jurnal Umum', 'Catatan jurnal transaksi');
        this.container = container;
        this.load();
    },

    async load(page = 1) {
        const dariEl = document.getElementById('jrn-dari');
        const sampaiEl = document.getElementById('jrn-sampai');
        const dariUI = dariEl ? dariEl.value : App.monthAgoDMY();
        const sampaiUI = sampaiEl ? sampaiEl.value : App.todayDMY();
        const dari = App.dateToISO(dariUI);
        const sampai = App.dateToISO(sampaiUI);
        const search = document.getElementById('jrn-search')?.value || '';

        const res = await App.api(`keuangan/jurnal?dari=${dari}&sampai=${sampai}&search=${encodeURIComponent(search)}&page=${page}`);
        if (!res?.success) return;

        this.data = res.data;

        this.container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div class="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
                    <div class="relative flex-1">
                        <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="jrn-search" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500" placeholder="Cari no. bukti atau keterangan..." value="${search}">
                    </div>
                    <input type="text" id="jrn-dari" class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Dari">
                    <input type="text" id="jrn-sampai" class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Sampai">
                    <button onclick="JurnalPage.load()" class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                        <i class="ri-search-line mr-1"></i> Filter
                    </button>
                </div>
                <div class="flex items-center gap-2 w-full lg:w-auto">
                    <button onclick="JurnalPage.showForm()" class="bg-primary-50 text-primary-600 hover:bg-primary-100 px-4 py-2.5 rounded-xl text-sm font-bold flex-1 lg:flex-none transition-all">
                        <i class="ri-add-line mr-1"></i> Tambah Jurnal
                    </button>
                    <div class="flex gap-1">
                        <button onclick="JurnalPage.export('pdf')" class="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Export PDF">
                            <i class="ri-file-pdf-line text-xl"></i>
                        </button>
                        <button onclick="JurnalPage.export('csv')" class="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Export CSV">
                            <i class="ri-file-excel-line text-xl"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div class="space-y-3">
                ${res.data.map(j => `
                    <div class="border border-gray-100 rounded-2xl overflow-hidden hover:border-primary-100 transition-all hover:shadow-md bg-white">
                        <div class="bg-gray-50/50 px-5 py-3.5 flex justify-between items-center cursor-pointer select-none" onclick="JurnalPage.toggleDetails(${j.id})">
                            <div class="flex items-center gap-3 flex-1 min-w-0">
                                <i class="ri-arrow-right-s-line text-lg text-gray-400 transition-all duration-200" id="jrn-arrow-${j.id}"></i>
                                <span class="font-mono text-xs font-bold text-primary-600 bg-white border border-primary-100 px-2.5 py-1 rounded-lg shrink-0">${j.no_bukti}</span>
                                <span class="text-sm font-medium text-gray-500 flex items-center gap-1.5 shrink-0" title="Tanggal Transaksi"><i class="ri-calendar-line text-gray-400"></i> ${App.formatDate(j.tgl_transaksi)}</span>
                                <div class="text-sm text-gray-700 font-medium truncate flex-1 ml-2" title="${j.keterangan || ''}">${j.keterangan || '-'}</div>
                            </div>
                            <div class="flex items-center gap-3 shrink-0" onclick="event.stopPropagation()">
                                <span class="font-mono text-xs font-bold text-gray-800 bg-gray-100/80 px-2.5 py-1 rounded-lg" title="Total Nilai">${App.formatRupiah(j.total_debit)}</span>
                                <span class="text-[10px] sm:text-xs font-bold uppercase tracking-wider ${j.ref_tipe === 'manual' ? 'text-amber-600 bg-amber-50' : 'text-blue-600 bg-blue-50'} px-2.5 py-1 rounded-full">${j.ref_tipe || 'manual'}</span>
                                ${j.ref_tipe !== 'reversal' ? `<button onclick="JurnalPage.confirmReverse(${j.id}, '${j.no_bukti}')" class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Reverse Jurnal"><i class="ri-arrow-go-back-line"></i></button>` : ''}
                            </div>
                        </div>
                        
                        <div id="jrn-details-${j.id}" class="hidden border-t border-gray-100 bg-white">
                            <div class="px-5 py-2.5 text-[11px] text-gray-400 flex items-center gap-4 bg-gray-50/20 border-b border-gray-50">
                                <span title="Waktu Input System"><i class="ri-time-line text-gray-400 mr-1"></i>Diinput: ${j.created_at ? moment(j.created_at).format('DD/MM/YYYY HH:mm') : '-'}</span>
                                <span title="Petugas Input"><i class="ri-user-line text-gray-400 mr-1"></i>Oleh: ${j.created_by_nama || 'System'}</span>
                            </div>
                            <div class="overflow-x-auto">
                                <table class="w-full text-sm">
                                    <thead>
                                        <tr class="bg-white">
                                            <th class="px-5 py-2.5 text-left font-bold text-gray-400 text-[10px] uppercase tracking-widest">Akun</th>
                                            <th class="px-5 py-2.5 text-right font-bold text-gray-400 text-[10px] uppercase tracking-widest">Debit</th>
                                            <th class="px-5 py-2.5 text-right font-bold text-gray-400 text-[10px] uppercase tracking-widest">Kredit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${(j.details || []).map(d => `
                                            <tr class="border-t border-gray-50 transition-colors hover:bg-gray-50/30">
                                                <td class="px-5 py-3">
                                                    <div class="flex flex-col ${d.kredit > 0 ? 'ml-8' : ''}">
                                                        <span class="font-semibold text-gray-800">${d.akun_nama}</span>
                                                        <span class="text-[10px] font-mono text-gray-400">${d.akun_kode}</span>
                                                    </div>
                                                </td>
                                                <td class="px-5 py-3 text-right font-mono ${d.debit > 0 ? 'text-gray-900 font-bold' : 'text-gray-300'}">
                                                    ${d.debit > 0 ? App.formatRupiah(d.debit) : '-'}
                                                </td>
                                                <td class="px-5 py-3 text-right font-mono ${d.kredit > 0 ? 'text-gray-900 font-bold' : 'text-gray-300'}">
                                                    ${d.kredit > 0 ? App.formatRupiah(d.kredit) : '-'}
                                                </td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                    <tfoot class="bg-gray-50/30 font-bold">
                                        <tr>
                                            <td class="px-5 py-3 text-right text-[10px] uppercase text-gray-400 tracking-widest">Balance</td>
                                            <td class="px-5 py-3 text-right text-primary-700">${App.formatRupiah(j.total_debit)}</td>
                                            <td class="px-5 py-3 text-right text-primary-700">${App.formatRupiah(j.total_kredit)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                `).join('')}
                ${res.data.length === 0 ? `
                    <div class="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                        <i class="ri-book-3-line text-6xl text-gray-200"></i>
                        <p class="mt-4 text-gray-400 text-lg font-medium">Belum ada catatan jurnal</p>
                    </div>` : ''}
            </div>
            ${App.renderPagination(res.pagination, 'JurnalPage.paginate')}
        </div>`;

        App.initDatepicker('#jrn-dari', { defaultDate: dariUI });
        App.initDatepicker('#jrn-sampai', { defaultDate: sampaiUI });
    },

    paginate(p) { this.load(p); },

    async showForm() {
        if (this.akuns.length === 0) {
            const res = await App.api('keuangan/akun');
            if (res?.success) this.akuns = res.data;
        }

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col scale-in">
                <div class="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">Tambah Jurnal Manual</h3>
                        <p class="text-sm text-gray-500">Buat entri jurnal umum baru</p>
                    </div>
                    <button onclick="this.closest('.fixed').remove()" class="p-2 hover:bg-white rounded-xl transition-colors"><i class="ri-close-line text-2xl text-gray-400"></i></button>
                </div>
                
                <form id="form-jurnal" class="flex-1 overflow-auto p-8 space-y-6">
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label class="block text-sm font-bold text-gray-600 mb-2">Tanggal Transaksi</label>
                            <input type="text" id="jrn-tgl" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500" required>
                        </div>
                        <div>
                            <label class="block text-sm font-bold text-gray-600 mb-2">Keterangan</label>
                            <input type="text" id="jrn-ket" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-500" placeholder="Misal: Biaya Listrik & Air Jan 2026" required>
                        </div>
                    </div>

                    <div class="border border-gray-100 rounded-2xl">
                        <table class="w-full text-sm" id="table-entry">
                            <thead>
                                <tr class="bg-gray-50">
                                    <th class="px-4 py-3 text-left font-bold text-gray-500">Akun</th>
                                    <th class="px-4 py-3 text-right font-bold text-gray-500 w-40">Debit</th>
                                    <th class="px-4 py-3 text-right font-bold text-gray-500 w-40">Kredit</th>
                                    <th class="px-4 py-3 text-center w-12"></th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50" id="entry-rows">
                                <!-- Dynamic rows -->
                            </tbody>
                            <tfoot class="bg-gray-50/50 font-bold">
                                <tr>
                                    <td class="px-4 py-4">
                                        <button type="button" onclick="JurnalPage.addRow()" class="text-primary-600 hover:text-primary-700 font-bold flex items-center gap-1">
                                            <i class="ri-add-circle-line text-lg"></i> Tambah Baris
                                        </button>
                                    </td>
                                    <td class="px-4 py-4 text-right" id="total-debit">Rp 0</td>
                                    <td class="px-4 py-4 text-right" id="total-kredit">Rp 0</td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div id="balance-alert" class="hidden bg-red-50 text-red-600 p-4 rounded-xl text-center font-bold text-sm border border-red-100">
                        <i class="ri-error-warning-line mr-1"></i> Jurnal tidak seimbang! Total Debit harus sama dengan Total Kredit.
                    </div>
                </form>

                <div class="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button onclick="this.closest('.fixed').remove()" class="px-6 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors">Batal</button>
                    <button type="button" onclick="JurnalPage.save()" id="btn-save-jurnal" class="bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary-200 transition-all">Simpan Jurnal</button>
                </div>
            </div>`;

        document.body.appendChild(modal);
        App.initDatepicker('#jrn-tgl', { defaultDate: App.todayISO() });
        this.addRow();
        this.addRow();
    },

    addRow() {
        const tbody = document.getElementById('entry-rows');
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-gray-50/50 transition-colors entry-row';
        tr.innerHTML = `
            <td class="px-3 py-3 relative">
                <div class="relative w-full jurnal-akun-wrapper">
                    <input type="text" class="jurnal-akun-search w-full border-none bg-transparent focus:ring-0 text-sm font-medium" placeholder="Pilih Akun..." autocomplete="off">
                    <input type="hidden" class="row-akun">
                    <div class="jurnal-akun-results absolute left-0 right-0 z-50 mt-1 max-h-40 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl hidden"></div>
                </div>
            </td>
            <td class="px-3 py-3">
                <input type="number" class="row-debit w-full border-none bg-transparent focus:ring-0 text-right text-sm font-mono font-bold" value="0" step="100" oninput="JurnalPage.calcBalance()">
            </td>
            <td class="px-3 py-3">
                <input type="number" class="row-kredit w-full border-none bg-transparent focus:ring-0 text-right text-sm font-mono font-bold" value="0" step="100" oninput="JurnalPage.calcBalance()">
            </td>
            <td class="px-3 py-3 text-center">
                <button type="button" onclick="JurnalPage.removeRow(this)" class="text-gray-300 hover:text-red-500 p-1 rounded-lg hover:bg-red-50 transition-all"><i class="ri-delete-bin-line"></i></button>
            </td>`;
        tbody.appendChild(tr);

        // Search events
        const searchInput = tr.querySelector('.jurnal-akun-search');
        const hiddenInput = tr.querySelector('.row-akun');
        const resultsDiv = tr.querySelector('.jurnal-akun-results');
        const wrapper = tr.querySelector('.jurnal-akun-wrapper');

        const filterRowAccounts = (q = '') => {
            const query = q.toLowerCase().trim();
            const filtered = this.akuns.filter(a => 
                a.kode.toLowerCase().includes(query) || 
                a.nama.toLowerCase().includes(query)
            );

            if (filtered.length) {
                resultsDiv.innerHTML = filtered.map(a => `
                    <div class="px-3 py-2 hover:bg-emerald-50 cursor-pointer text-xs border-b border-gray-50 last:border-0" data-id="${a.id}" data-text="${a.kode} - ${a.nama}">
                        <span class="font-mono text-gray-500 bg-gray-100 px-1 py-0.5 rounded mr-1.5">${a.kode}</span>
                        <span class="font-medium text-gray-800">${a.nama}</span>
                    </div>
                `).join('');
                resultsDiv.classList.remove('hidden');
            } else {
                resultsDiv.innerHTML = '<div class="px-3 py-2 text-gray-400 text-xs italic">Akun tidak ditemukan</div>';
                resultsDiv.classList.remove('hidden');
            }
        };

        searchInput.addEventListener('focus', () => {
            filterRowAccounts(searchInput.value);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.jurnal-akun-wrapper') || e.target.closest('.jurnal-akun-wrapper') !== wrapper) {
                resultsDiv.classList.add('hidden');
            }
        });

        searchInput.addEventListener('input', (e) => {
            filterRowAccounts(e.target.value);
        });

        resultsDiv.addEventListener('click', (e) => {
            const item = e.target.closest('[data-id]');
            if (item) {
                const id = item.getAttribute('data-id');
                const text = item.getAttribute('data-text');
                hiddenInput.value = id;
                searchInput.value = text;
                resultsDiv.classList.add('hidden');
            }
        });
    },

    removeRow(btn) {
        const rows = document.querySelectorAll('.entry-row');
        if (rows.length <= 2) {
            App.toast('Minimal harus ada 2 baris jurnal', 'warning');
            return;
        }
        btn.closest('tr').remove();
        this.calcBalance();
    },

    calcBalance() {
        let td = 0, tk = 0;
        document.querySelectorAll('.row-debit').forEach(i => td += parseFloat(i.value || 0));
        document.querySelectorAll('.row-kredit').forEach(i => tk += parseFloat(i.value || 0));

        document.getElementById('total-debit').textContent = App.formatRupiah(td);
        document.getElementById('total-kredit').textContent = App.formatRupiah(tk);

        const alert = document.getElementById('balance-alert');
        const btn = document.getElementById('btn-save-jurnal');

        if (Math.abs(td - tk) > 0.01 || (td === 0 && tk === 0)) {
            alert.classList.remove('hidden');
            btn.disabled = true;
            btn.className = 'bg-gray-200 text-gray-400 cursor-not-allowed px-8 py-2.5 rounded-xl text-sm font-bold';
        } else {
            alert.classList.add('hidden');
            btn.disabled = false;
            btn.className = 'bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-primary-200 transition-all';
        }
    },

    async save() {
        const tgl = App.dateToISO(document.getElementById('jrn-tgl').value);
        const ket = document.getElementById('jrn-ket').value;
        const details = [];
        let valid = true;

        document.querySelectorAll('.entry-row').forEach(row => {
            const akun_id = row.querySelector('.row-akun').value;
            const debit = parseFloat(row.querySelector('.row-debit').value || 0);
            const kredit = parseFloat(row.querySelector('.row-kredit').value || 0);

            if (!akun_id) valid = false;
            if (debit > 0 || kredit > 0) {
                details.push({ akun_id, debit, kredit });
            }
        });

        if (!valid || !ket) {
            App.toast('Lengkapi semua field (Akun & Keterangan)', 'error');
            return;
        }

        const res = await App.api('keuangan/jurnal', {
            method: 'POST',
            body: { tgl_transaksi: tgl, keterangan: ket, details }
        });

        if (res?.success) {
            App.toast(res.message, 'success');
            document.querySelector('.fixed').remove();
            this.load();
        }
    },

    async confirmReverse(id, noBukti) {
        const ok = await App.confirm(`Konfirmasi Reversal`, `Apakah Anda yakin ingin membatalkan (reverse) jurnal <b>${noBukti}</b>? Tindakan ini akan membuat jurnal pembalik baru.`, 'warning');
        if (ok) this.reverse(id);
    },

    async reverse(id) {
        const res = await App.api(`keuangan/jurnal/reverse`, {
            method: 'POST',
            body: { id }
        });
        if (res?.success) {
            App.toast(res.message, 'success');
            this.load();
        } else {
            App.toast(res?.message || 'Gagal melakukan reversal', 'error');
        }
    },

    toggleDetails(id) {
        const el = document.getElementById(`jrn-details-${id}`);
        const arrow = document.getElementById(`jrn-arrow-${id}`);
        if (el && arrow) {
            if (el.classList.contains('hidden')) {
                el.classList.remove('hidden');
                arrow.classList.add('rotate-90');
            } else {
                el.classList.add('hidden');
                arrow.classList.remove('rotate-90');
            }
        }
    },

    getColumns() {
        return [
            { title: 'Tgl', key: 'tgl_transaksi' },
            { title: 'No. Bukti', key: 'no_bukti' },
            { title: 'Keterangan', key: 'keterangan' },
            { title: 'Debit', key: 'total_debit', align: 'right' },
            { title: 'Kredit', key: 'total_kredit', align: 'right' },
            { title: 'Tipe', key: 'ref_tipe' }
        ];
    },

    export(type) {
        if (!this.data.length) return;
        const formattedData = this.data.map(r => ({
            ...r,
            tgl_transaksi: App.formatDate(r.tgl_transaksi),
            total_debit: App.formatRupiah(r.total_debit),
            total_kredit: App.formatRupiah(r.total_kredit)
        }));
        App.export(type, 'Laporan Jurnal Umum', this.getColumns(), formattedData, {
            filename: 'laporan_jurnal'
        });
    }
};

window.JurnalPage = JurnalPage;
export default JurnalPage;
