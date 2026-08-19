// Kas Masuk & Keluar Page
const KasTransaksiPage = {
    page: 1,
    container: null,
    _accounts: [],
    _kasAccounts: [],
    _expandedRows: new Set(),

    async render(container) {
        this.container = container;
        App.setTitle('Kas Masuk & Keluar', 'Pencatatan kas masuk dan kas keluar');

        // Fetch accounts
        const acRes = await App.api('keuangan/akun');
        if (acRes?.success) {
            this._accounts = acRes.data;
            // Filter accounts that represent cash or bank
            this._kasAccounts = this._accounts.filter(a => 
                a.tipe === 'aset' && 
                (/(kas|bank|jatim|bendahara)/i.test(a.nama) || a.kode.startsWith('101') || a.kode.startsWith('102'))
            );
        }

        await this.loadList(container);
    },

    async loadList(container, page = 1) {
        this.page = page;
        const search = document.getElementById('kas-search')?.value || '';
        const dari = document.getElementById('kas-filter-dari')?.value || App.firstDayOfMonthISO();
        const sampai = document.getElementById('kas-filter-sampai')?.value || App.todayISO();

        // Fetch manual journals
        const res = await App.api(`keuangan/jurnal?page=${page}&search=${encodeURIComponent(search)}&dari=${dari}&sampai=${sampai}&tipe=manual&limit=25`);
        if (!res?.success) return;

        // Since we want to display total summary dynamically, we query a separate overall stats or calculate locally
        let totalMasuk = 0;
        let totalKeluar = 0;

        // Fetch summary totals for the current date range using a lightweight query loop or just summing current page
        // To be safe and show overall accurate totals, let's calculate based on the current page's transactions
        // Or fetch details in parallel only for the current page items to keep it extremely fast
        const parsePromises = res.data.map(async (j) => {
            const detRes = await App.api(`keuangan/jurnal/${j.id}`);
            if (detRes?.success) {
                const details = detRes.data.details || [];
                const kasDebit = details.find(d => parseFloat(d.debit) > 0 && this._kasAccounts.some(ka => ka.id == d.akun_id));
                const kasKredit = details.find(d => parseFloat(d.kredit) > 0 && this._kasAccounts.some(ka => ka.id == d.akun_id));
                
                let tipe = 'umum';
                let akunKas = '-';
                let akunLawan = '-';
                let jumlah = parseFloat(j.total_debit);

                if (kasDebit) {
                    tipe = 'masuk';
                    const lawan = details.find(d => d.id !== kasDebit.id) || {};
                    akunKas = kasDebit.akun_nama;
                    akunLawan = lawan.akun_nama || 'Lain-lain';
                    jumlah = parseFloat(kasDebit.debit);
                    totalMasuk += jumlah;
                } else if (kasKredit) {
                    tipe = 'keluar';
                    const lawan = details.find(d => d.id !== kasKredit.id) || {};
                    akunKas = kasKredit.akun_nama;
                    akunLawan = lawan.akun_nama || 'Lain-lain';
                    jumlah = parseFloat(kasKredit.kredit);
                    totalKeluar += jumlah;
                } else {
                    const mainDebit = details.find(d => parseFloat(d.debit) > 0) || {};
                    const mainKredit = details.find(d => parseFloat(d.kredit) > 0) || {};
                    akunKas = mainKredit.akun_nama || '-';
                    akunLawan = mainDebit.akun_nama || '-';
                }

                return {
                    id: j.id,
                    no_bukti: j.no_bukti,
                    tgl_transaksi: j.tgl_transaksi,
                    tipe,
                    akun_kas: akunKas,
                    akun_lawan: akunLawan,
                    keterangan: j.keterangan,
                    jumlah,
                    created_at: j.created_at,
                    created_by_nama: j.created_by_nama,
                    details
                };
            }
            return null;
        });

        const parsedTransactions = (await Promise.all(parsePromises)).filter(t => t !== null);

        // Render Page Layout
        container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Summary Widgets -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <!-- Kas Masuk Widget -->
                <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-md hover:shadow-lg p-6 text-white relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1">
                    <div class="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15">
                        <i class="ri-arrow-down-circle-fill text-[120px]"></i>
                    </div>
                    <div class="relative z-10 space-y-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-emerald-100/90">Total Kas Masuk (Halaman Ini)</span>
                        <h3 class="text-3xl font-black tracking-tight">${App.formatRupiah(totalMasuk)}</h3>
                        <div class="text-[11px] text-emerald-100/80 flex items-center gap-1">
                            <i class="ri-checkbox-circle-line"></i> Terkalkulasi dari daftar aktif
                        </div>
                    </div>
                </div>

                <!-- Kas Keluar Widget -->
                <div class="bg-gradient-to-br from-rose-500 to-red-600 rounded-2xl shadow-md hover:shadow-lg p-6 text-white relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1">
                    <div class="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15">
                        <i class="ri-arrow-up-circle-fill text-[120px]"></i>
                    </div>
                    <div class="relative z-10 space-y-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-rose-100/90">Total Kas Keluar (Halaman Ini)</span>
                        <h3 class="text-3xl font-black tracking-tight">${App.formatRupiah(totalKeluar)}</h3>
                        <div class="text-[11px] text-rose-100/80 flex items-center gap-1">
                            <i class="ri-checkbox-circle-line"></i> Terkalkulasi dari daftar aktif
                        </div>
                    </div>
                </div>

                <!-- Selisih Bersih Widget -->
                <div class="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-md hover:shadow-lg p-6 text-white relative overflow-hidden transition-all duration-300 transform hover:-translate-y-1">
                    <div class="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15">
                        <i class="ri-wallet-3-fill text-[120px]"></i>
                    </div>
                    <div class="relative z-10 space-y-2">
                        <span class="text-xs font-bold uppercase tracking-wider text-indigo-100/90">Arus Kas Bersih (Net Flow)</span>
                        <h3 class="text-3xl font-black tracking-tight">${App.formatRupiah(totalMasuk - totalKeluar)}</h3>
                        <div class="text-[11px] text-indigo-100/80 flex items-center gap-1">
                            <i class="ri-scales-3-line"></i> Selisih pemasukan & pengeluaran
                        </div>
                    </div>
                </div>
            </div>

            <!-- Filter & Action Bar -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-6">
                    <!-- Left Side: Filters (Search & Dates) -->
                    <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 w-full lg:w-auto">
                        <!-- Search Box -->
                        <div class="relative flex-1 max-w-md">
                            <i class="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" id="kas-search" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 bg-white" placeholder="Cari keterangan / no bukti..." value="${search}" onkeyup="if(event.key==='Enter')KasTransaksiPage.loadList(KasTransaksiPage.container)">
                        </div>
                        
                        <!-- Date Range (Unified & Clean) -->
                        <div class="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 shrink-0">
                            <div class="flex items-center gap-1.5">
                                <i class="ri-calendar-line text-gray-400 text-sm"></i>
                                <input type="date" id="kas-filter-dari" value="${dari}" onchange="KasTransaksiPage.loadList(KasTransaksiPage.container)" class="bg-transparent border-0 p-0 text-xs font-semibold text-gray-700 focus:ring-0 focus:outline-none w-28" title="Dari Tanggal">
                            </div>
                            <span class="text-gray-400 text-xs font-bold">s/d</span>
                            <div class="flex items-center gap-1.5">
                                <input type="date" id="kas-filter-sampai" value="${sampai}" onchange="KasTransaksiPage.loadList(KasTransaksiPage.container)" class="bg-transparent border-0 p-0 text-xs font-semibold text-gray-700 focus:ring-0 focus:outline-none w-28" title="Sampai Tanggal">
                            </div>
                        </div>

                        <!-- Refresh Button -->
                        <button onclick="KasTransaksiPage.loadList(KasTransaksiPage.container)" class="p-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl transition-all flex items-center justify-center shrink-0" title="Refresh Data">
                            <i class="ri-refresh-line"></i>
                        </button>
                    </div>

                    <!-- Right Side: Actions & Exports -->
                    <div class="flex items-center justify-between sm:justify-end gap-3 w-full lg:w-auto shrink-0 border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-100">
                        <div class="flex items-center gap-2 flex-1 sm:flex-initial">
                            <button onclick="KasTransaksiPage.form('masuk')" class="flex-1 sm:flex-initial bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-4.5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
                                <i class="ri-arrow-down-circle-line text-base"></i> Kas Masuk
                            </button>
                            <button onclick="KasTransaksiPage.form('keluar')" class="flex-1 sm:flex-initial bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white px-4.5 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all">
                                <i class="ri-arrow-up-circle-line text-base"></i> Kas Keluar
                            </button>
                        </div>
                        <div class="flex gap-1 bg-gray-50 p-1 rounded-xl border border-gray-200 shrink-0">
                            <button onclick="KasTransaksiPage.export('pdf')" class="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center justify-center" title="Export PDF">
                                <i class="ri-file-pdf-line text-lg"></i>
                            </button>
                            <button onclick="KasTransaksiPage.export('csv')" class="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors flex items-center justify-center" title="Export CSV">
                                <i class="ri-file-excel-line text-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Card List Layout (Format Lebih Bagus & Rapi) -->
                <div class="space-y-3">
                    ${parsedTransactions.map(t => {
                        const isExpanded = this._expandedRows.has(t.id);
                        return `
                        <div class="border border-gray-100 rounded-2xl overflow-hidden hover:border-primary-100 transition-all hover:shadow-md bg-white">
                            <!-- Main Row -->
                            <div class="bg-gray-50/40 px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 cursor-pointer select-none" onclick="KasTransaksiPage.toggleRowDetails(${t.id})">
                                <div class="flex items-center gap-3 flex-1 min-w-0">
                                    <i class="ri-arrow-right-s-line text-lg text-gray-400 transition-all duration-200 ${isExpanded ? 'rotate-90 text-primary-500' : ''}" id="kas-arrow-${t.id}"></i>
                                    
                                    <!-- Status Pill Icon -->
                                    <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.tipe === 'masuk' ? 'bg-emerald-50 text-emerald-600' : t.tipe === 'keluar' ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-600'}">
                                        <i class="${t.tipe === 'masuk' ? 'ri-arrow-down-circle-line' : t.tipe === 'keluar' ? 'ri-arrow-up-circle-line' : 'ri-exchange-line'} text-xl"></i>
                                    </div>

                                    <div class="flex flex-col shrink-0 min-w-[130px]">
                                        <span class="font-mono text-xs font-bold text-primary-600">${t.no_bukti}</span>
                                        <span class="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                                            <i class="ri-calendar-line"></i> ${App.formatDate(t.tgl_transaksi)}
                                        </span>
                                    </div>
                                    
                                    <!-- Accounts info -->
                                    <div class="hidden md:flex flex-col shrink-0 min-w-[200px] text-xs">
                                        <span class="text-gray-700 font-semibold truncate">${t.akun_kas}</span>
                                        <span class="text-gray-400 mt-0.5 flex items-center gap-1">
                                            <i class="ri-arrow-left-right-line text-[9px]"></i> ${t.akun_lawan}
                                        </span>
                                    </div>

                                    <!-- Description -->
                                    <div class="text-sm text-gray-600 font-medium truncate flex-1 ml-2" title="${t.keterangan || ''}">
                                        ${t.keterangan || '-'}
                                    </div>
                                </div>

                                <div class="flex items-center gap-4 shrink-0 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0" onclick="event.stopPropagation()">
                                    <!-- Amount Badge -->
                                    <span class="font-mono text-sm font-black ${t.tipe === 'masuk' ? 'text-emerald-600' : t.tipe === 'keluar' ? 'text-rose-600' : 'text-gray-800'}">
                                        ${t.tipe === 'masuk' ? '+' : t.tipe === 'keluar' ? '-' : ''}${App.formatRupiah(t.jumlah)}
                                    </span>

                                    <!-- Action options -->
                                    <div class="flex items-center gap-1.5">
                                        <button onclick="App.showAuditHistory('jurnal', ${t.id})" class="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition-all" title="Riwayat Audit">
                                            <i class="ri-history-line"></i>
                                        </button>
                                        <button onclick="KasTransaksiPage.confirmReverse(${t.id}, '${t.no_bukti}')" class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Batalkan / Reversal Transaksi">
                                            <i class="ri-arrow-go-back-line"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <!-- Expanded Ledger View -->
                            <div id="kas-details-${t.id}" class="${isExpanded ? '' : 'hidden'} border-t border-gray-100 bg-white">
                                <div class="px-6 py-2.5 text-[11px] text-gray-400 flex flex-wrap items-center gap-4 bg-gray-50/20 border-b border-gray-50">
                                    <span><i class="ri-time-line text-gray-400 mr-1"></i>Diinput: ${t.created_at ? moment(t.created_at).format('DD/MM/YYYY HH:mm') : '-'}</span>
                                    <span><i class="ri-user-line text-gray-400 mr-1"></i>Petugas: ${t.created_by_nama || 'System'}</span>
                                </div>
                                <div class="p-6 bg-slate-50/30">
                                    <div class="max-w-xl bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                        <div class="bg-gray-50/75 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                                            <span class="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Double-Entry Journal Postings</span>
                                            <span class="text-xs font-mono font-bold text-gray-700">${t.no_bukti}</span>
                                        </div>
                                        <table class="w-full text-xs">
                                            <thead>
                                                <tr class="text-gray-400 border-b border-gray-50">
                                                    <th class="px-4 py-2.5 text-left font-bold uppercase">Nama Akun Akuntansi</th>
                                                    <th class="px-4 py-2.5 text-right font-bold uppercase w-28">Debit</th>
                                                    <th class="px-4 py-2.5 text-right font-bold uppercase w-28">Kredit</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                ${t.details.map(d => `
                                                <tr class="border-b border-gray-50 last:border-0 hover:bg-gray-50/20">
                                                    <td class="px-4 py-2.5">
                                                        <div class="font-medium text-gray-800">${d.akun_nama}</div>
                                                        <div class="text-[9px] font-mono text-gray-400 mt-0.5">${d.akun_kode}</div>
                                                    </td>
                                                    <td class="px-4 py-2.5 text-right font-mono font-bold text-emerald-600">
                                                        ${d.debit > 0 ? App.formatRupiah(d.debit) : '-'}
                                                    </td>
                                                    <td class="px-4 py-2.5 text-right font-mono font-bold text-red-500">
                                                        ${d.kredit > 0 ? App.formatRupiah(d.kredit) : '-'}
                                                    </td>
                                                </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                        `;
                    }).join('')}
                    ${parsedTransactions.length === 0 ? `
                    <div class="text-center py-16 bg-white border border-gray-100 rounded-2xl">
                        <i class="ri-inbox-line text-5xl text-gray-300"></i>
                        <p class="mt-3 text-gray-400 text-sm italic">Belum ada transaksi kas masuk / keluar untuk periode ini</p>
                    </div>
                    ` : ''}
                </div>
                ${App.renderPagination(res.pagination, 'KasTransaksiPage.paginate')}
            </div>
        </div>
        `;
    },

    toggleRowDetails(id) {
        const detailEl = document.getElementById(`kas-details-${id}`);
        const arrowEl = document.getElementById(`kas-arrow-${id}`);
        if (!detailEl || !arrowEl) return;

        if (detailEl.classList.contains('hidden')) {
            detailEl.classList.remove('hidden');
            arrowEl.classList.add('rotate-90', 'text-primary-500');
            this._expandedRows.add(id);
        } else {
            detailEl.classList.add('hidden');
            arrowEl.classList.remove('rotate-90', 'text-primary-500');
            this._expandedRows.delete(id);
        }
    },

    async confirmReverse(id, code) {
        const ok = await App.confirm('Reversal Transaksi Kas', `Apakah Anda yakin ingin membatalkan/reversal transaksi kas ${code}?\nTindakan ini akan membuat entri jurnal pembalik secara otomatis.`, 'warning');
        if (!ok) return;

        const res = await App.api('keuangan/jurnal/reverse', {
            method: 'POST',
            body: { id }
        });

        if (res?.success) {
            App.toast(res.message || 'Transaksi berhasil dibatalkan', 'success');
            this.loadList(this.container, this.page);
        } else {
            App.toast(res?.message || 'Gagal membatalkan transaksi kas', 'error');
        }
    },

    paginate(p) { 
        this.loadList(this.container, p); 
    },

    form(type) {
        const title = type === 'masuk' ? 'Input Kas Masuk (Cash Receipt)' : 'Input Kas Keluar (Cash Disbursement)';
        const accentColor = type === 'masuk' ? 'emerald' : 'rose';
        
        App.openModal(`
            <div class="p-6 max-w-lg mx-auto">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-12 h-12 rounded-2xl flex items-center justify-center bg-${accentColor}-50 text-${accentColor}-600 shrink-0">
                        <i class="${type === 'masuk' ? 'ri-arrow-down-circle-line' : 'ri-arrow-up-circle-line'} text-3xl"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-extrabold text-gray-900">${title}</h3>
                        <p class="text-xs text-gray-500">Buat posting transaksi kas otomatis ke pembukuan jurnal</p>
                    </div>
                </div>

                <form id="kas-form" class="space-y-4">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tanggal Transaksi *</label>
                            <input type="date" id="kf-tanggal" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-${accentColor}-500 bg-white" required>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nominal Rupiah (Rp) *</label>
                            <input type="number" id="kf-nominal" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-black focus:ring-2 focus:ring-${accentColor}-500" placeholder="0" min="1" required>
                        </div>
                    </div>

                    <!-- Kas/Bank COA Search -->
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Akun Kas / Bank (Debit) *</label>
                        <div class="relative" id="kf-kas-wrapper">
                            <i class="ri-search-2-line absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" id="kf-kas-search" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-${accentColor}-500 bg-white" placeholder="Cari akun kas atau bank..." autocomplete="off" required>
                            <input type="hidden" id="kf-kas-id" value="">
                            <div id="kf-kas-results" class="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl hidden"></div>
                        </div>
                    </div>

                    <!-- Target COA Search -->
                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                            ${type === 'masuk' ? 'Akun Lawan / Kredit (Pilih Akun Sumber) *' : 'Akun Lawan / Debit (Pilih Akun Pengeluaran) *'}
                        </label>
                        <div class="relative" id="kf-target-wrapper">
                            <i class="ri-search-2-line absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" id="kf-target-search" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-${accentColor}-500 bg-white" placeholder="Cari akun lawan..." autocomplete="off" required>
                            <input type="hidden" id="kf-target-id" value="">
                            <div id="kf-target-results" class="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-100 rounded-xl shadow-xl hidden"></div>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Keterangan Transaksi *</label>
                        <textarea id="kf-keterangan" rows="2" class="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-${accentColor}-500 bg-white" placeholder="Contoh: Penerimaan pembayaran piutang atau biaya ATK..." required></textarea>
                    </div>

                    <div class="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onclick="App.closeModal()" class="px-5 py-3 border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                            Batal
                        </button>
                        <button type="submit" class="px-6 py-3 bg-gradient-to-r from-${accentColor}-600 to-${accentColor}-700 hover:from-${accentColor}-700 hover:to-${accentColor}-800 text-white rounded-xl text-sm font-bold shadow-lg shadow-${accentColor}-500/20 transition-all transform hover:-translate-y-0.5">
                            Simpan Transaksi
                        </button>
                    </div>
                </form>
            </div>
        `);

        // Set Default Date
        document.getElementById('kf-tanggal').value = App.todayISO();

        // Autocomplete setup for Kas/Bank
        const kasSearch = document.getElementById('kf-kas-search');
        const kasId = document.getElementById('kf-kas-id');
        const kasResults = document.getElementById('kf-kas-results');

        const filterKas = (q = '') => {
            const query = q.toLowerCase().trim();
            const filtered = this._kasAccounts.filter(a => 
                a.kode.toLowerCase().includes(query) || 
                a.nama.toLowerCase().includes(query)
            );
            if (filtered.length) {
                kasResults.innerHTML = filtered.map(a => `
                    <div class="px-4 py-3 hover:bg-${accentColor}-50/50 cursor-pointer text-sm border-b border-gray-50 last:border-0" data-id="${a.id}" data-text="${a.kode} - ${a.nama}">
                        <span class="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mr-2">${a.kode}</span>
                        <span class="font-semibold text-gray-800">${a.nama}</span>
                    </div>
                `).join('');
                kasResults.classList.remove('hidden');
            } else {
                kasResults.innerHTML = '<div class="px-4 py-3 text-gray-400 text-xs italic">Akun Kas tidak ditemukan</div>';
                kasResults.classList.remove('hidden');
            }
        };

        kasSearch.addEventListener('focus', () => filterKas(kasSearch.value));
        kasSearch.addEventListener('input', (e) => filterKas(e.target.value));
        kasResults.addEventListener('click', (e) => {
            const item = e.target.closest('[data-id]');
            if (item) {
                kasId.value = item.getAttribute('data-id');
                kasSearch.value = item.getAttribute('data-text');
                kasResults.classList.add('hidden');
            }
        });

        // Autocomplete setup for Target Account
        const targetSearch = document.getElementById('kf-target-search');
        const targetId = document.getElementById('kf-target-id');
        const targetResults = document.getElementById('kf-target-results');

        const filterTarget = (q = '') => {
            const query = q.toLowerCase().trim();
            const filtered = this._accounts.filter(a => 
                !this._kasAccounts.some(ka => ka.id == a.id) &&
                (a.kode.toLowerCase().includes(query) || a.nama.toLowerCase().includes(query))
            );
            if (filtered.length) {
                targetResults.innerHTML = filtered.map(a => `
                    <div class="px-4 py-3 hover:bg-${accentColor}-50/50 cursor-pointer text-sm border-b border-gray-50 last:border-0" data-id="${a.id}" data-text="${a.kode} - ${a.nama}">
                        <span class="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mr-2">${a.kode}</span>
                        <span class="font-semibold text-gray-800">${a.nama}</span>
                    </div>
                `).join('');
                targetResults.classList.remove('hidden');
            } else {
                targetResults.innerHTML = '<div class="px-4 py-3 text-gray-400 text-xs italic">Akun tidak ditemukan</div>';
                targetResults.classList.remove('hidden');
            }
        };

        targetSearch.addEventListener('focus', () => filterTarget(targetSearch.value));
        targetSearch.addEventListener('input', (e) => filterTarget(e.target.value));
        targetResults.addEventListener('click', (e) => {
            const item = e.target.closest('[data-id]');
            if (item) {
                targetId.value = item.getAttribute('data-id');
                targetSearch.value = item.getAttribute('data-text');
                targetResults.classList.add('hidden');
            }
        });

        // Hide result drop when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#kf-kas-wrapper')) kasResults.classList.add('hidden');
            if (!e.target.closest('#kf-target-wrapper')) targetResults.classList.add('hidden');
        });

        // Form Submit
        document.getElementById('kas-form').onsubmit = async (e) => {
            e.preventDefault();

            const tgl = document.getElementById('kf-tanggal').value;
            const nominal = parseFloat(document.getElementById('kf-nominal').value) || 0;
            const kasAccId = document.getElementById('kf-kas-id').value;
            const tarAccId = document.getElementById('kf-target-id').value;
            const keterangan = document.getElementById('kf-keterangan').value;

            if (!kasAccId) {
                App.toast('Silakan pilih rekening kas / bank', 'warning');
                return;
            }
            if (!tarAccId) {
                App.toast('Silakan pilih akun lawan', 'warning');
                return;
            }
            if (nominal <= 0) {
                App.toast('Nominal harus lebih besar dari 0', 'warning');
                return;
            }

            // Build journal transaction details
            const details = [];
            if (type === 'masuk') {
                // Kas Masuk: Kas (D), Akun Lawan (K)
                details.push({ akun_id: kasAccId, debit: nominal, kredit: 0, keterangan });
                details.push({ akun_id: tarAccId, debit: 0, kredit: nominal, keterangan });
            } else {
                // Kas Keluar: Akun Lawan (D), Kas (K)
                details.push({ akun_id: tarAccId, debit: nominal, kredit: 0, keterangan });
                details.push({ akun_id: kasAccId, debit: 0, kredit: nominal, keterangan });
            }

            const body = {
                tgl_transaksi: tgl,
                keterangan: (type === 'masuk' ? '[KAS MASUK] ' : '[KAS KELUAR] ') + keterangan,
                details
            };

            const r = await App.api('keuangan/jurnal', { method: 'POST', body });
            if (r?.success) {
                App.closeModal();
                App.toast(`Berhasil menyimpan transaksi ${type === 'masuk' ? 'Kas Masuk' : 'Kas Keluar'}`, 'success');
                this.loadList(this.container);
            } else {
                App.toast(r?.message || 'Gagal menyimpan transaksi', 'error');
            }
        };
    },

    export(type) {
        const search = document.getElementById('kas-search')?.value || '';
        const dari = document.getElementById('kas-filter-dari')?.value || App.firstDayOfMonthISO();
        const sampai = document.getElementById('kas-filter-sampai')?.value || App.todayISO();

        App.api(`keuangan/jurnal?search=${encodeURIComponent(search)}&dari=${dari}&sampai=${sampai}&tipe=manual&limit=1000`).then(async res => {
            if (!res?.success) return;

            // Fetch detail details for the export
            const parsePromises = res.data.map(async (j) => {
                const detRes = await App.api(`keuangan/jurnal/${j.id}`);
                if (detRes?.success) {
                    const details = detRes.data.details || [];
                    const kasDebit = details.find(d => parseFloat(d.debit) > 0 && this._kasAccounts.some(ka => ka.id == d.akun_id));
                    const kasKredit = details.find(d => parseFloat(d.kredit) > 0 && this._kasAccounts.some(ka => ka.id == d.akun_id));
                    
                    let tipe = 'Jurnal';
                    let akunKas = '-';
                    let akunLawan = '-';
                    let jumlah = parseFloat(j.total_debit);

                    if (kasDebit) {
                        tipe = 'Masuk';
                        const lawan = details.find(d => d.id !== kasDebit.id) || {};
                        akunKas = kasDebit.akun_nama;
                        akunLawan = lawan.akun_nama || 'Lain-lain';
                        jumlah = parseFloat(kasDebit.debit);
                    } else if (kasKredit) {
                        tipe = 'Keluar';
                        const lawan = details.find(d => d.id !== kasKredit.id) || {};
                        akunKas = kasKredit.akun_nama;
                        akunLawan = lawan.akun_nama || 'Lain-lain';
                        jumlah = parseFloat(kasKredit.kredit);
                    }

                    return {
                        ...j,
                        tgl_fmt: App.formatDate(j.tgl_transaksi),
                        tipe_txt: tipe,
                        akun_kas: akunKas,
                        akun_lawan: akunLawan,
                        jumlah_fmt: App.formatRupiah(jumlah)
                    };
                }
                return null;
            });

            const rows = (await Promise.all(parsePromises)).filter(t => t !== null);

            const columns = [
                { title: 'No. Bukti', key: 'no_bukti' },
                { title: 'Tanggal', key: 'tgl_fmt' },
                { title: 'Tipe', key: 'tipe_txt' },
                { title: 'Kas / Bank', key: 'akun_kas' },
                { title: 'Lawan Akun', key: 'akun_lawan' },
                { title: 'Keterangan', key: 'keterangan' },
                { title: 'Jumlah', key: 'jumlah_fmt', align: 'right' }
            ];

            App.export(type, 'Laporan Kas Masuk & Keluar', columns, rows, { 
                filename: 'laporan_kas_masuk_keluar', 
                orientation: 'l' 
            });
        });
    }
};

window.KasTransaksiPage = KasTransaksiPage;
export default KasTransaksiPage;
