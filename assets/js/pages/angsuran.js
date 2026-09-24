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
        const search = document.getElementById('ags-search')?.value ?? (App.queryParams?.search || '');
        const status = document.getElementById('ags-status')?.value ?? (App.queryParams?.status || '');
        const metode = document.getElementById('ags-filter-metode')?.value ?? (App.queryParams?.metode || '');
        const dari = document.getElementById('ags-filter-dari')?.value ?? (App.queryParams?.dari || '');
        const sampai = document.getElementById('ags-filter-sampai')?.value ?? (App.queryParams?.sampai || '');
        const [res, countRes] = await Promise.all([
            App.api(`angsuran?page=${page}&search=${encodeURIComponent(search)}&status=${status}&metode_pembayaran=${metode}&dari=${dari}&sampai=${sampai}`),
            App.api('angsuran/pengajuan/count')
        ]);
        if (!res?.success) return;
        const pendingCount = (countRes && countRes.data && (countRes.data.pending_count !== undefined ? countRes.data.pending_count : countRes.data.count)) || 0;

        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <!-- Header Bar: Search & Actions -->
            <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-5">
                <div class="relative flex-1 max-w-lg">
                    <i class="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-base"></i>
                    <input type="text" id="ags-search" class="w-full pl-10 pr-10 py-2.5 bg-gray-50/80 hover:bg-white focus:bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-gray-400" placeholder="Cari transaksi, anggota, no. pinjaman..." value="${search}" onkeyup="if(event.key==='Enter')AngsuranPage.loadList(AngsuranPage.container)">
                    ${search ? `<button onclick="document.getElementById('ags-search').value='';AngsuranPage.loadList(AngsuranPage.container)" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors" title="Hapus pencarian"><i class="ri-close-circle-line text-base"></i></button>` : ''}
                </div>
                
                <div class="flex items-center gap-2 justify-end shrink-0">
                    <button onclick="AngsuranPage.showAntreanPengajuan()" class="relative bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all active:scale-95">
                        <i class="ri-shield-check-line text-lg"></i>
                        <span>Verifikasi Pengajuan</span>
                        ${pendingCount > 0 ? `<span class="min-w-[18px] h-[18px] bg-rose-600 text-white text-[10px] font-bold rounded-full px-1 flex items-center justify-center animate-pulse">${pendingCount}</span>` : ''}
                    </button>
                    <div class="flex items-center gap-1 bg-gray-50 border border-gray-200 p-1 rounded-xl">
                        <button onclick="AngsuranPage.export('pdf')" class="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1.5" title="Export PDF">
                            <i class="ri-file-pdf-line text-base"></i> PDF
                        </button>
                        <div class="w-px h-4 bg-gray-200"></div>
                        <button onclick="AngsuranPage.export('csv')" class="px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors flex items-center gap-1.5" title="Export CSV">
                            <i class="ri-file-excel-line text-base"></i> Excel/CSV
                        </button>
                    </div>
                    ${App.hasPerm('angsuran.create') ? '<button onclick="AngsuranPage.form()" class="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-lg shadow-emerald-500/25 transition-all active:scale-95"><i class="ri-money-dollar-circle-line text-lg"></i> Bayar Angsuran</button>' : ''}
                </div>
            </div>

            ${pendingCount > 0 ? `
                <!-- Banner Antrean Pengajuan Sukarela dari Portal -->
                <div class="mb-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center text-xl shrink-0">
                            <i class="ri-alarm-warning-line"></i>
                        </div>
                        <div>
                            <h4 class="text-sm font-bold text-gray-800">Terdapat ${pendingCount} Pengajuan Pembayaran Angsuran Pending</h4>
                            <p class="text-xs text-gray-500">Anggota mengajukan pembayaran via Simpanan Sukarela dari portal dan menunggu persetujuan Bendahara/Admin.</p>
                        </div>
                    </div>
                    <button onclick="AngsuranPage.showAntreanPengajuan()" class="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition shadow-sm flex items-center gap-1.5 shrink-0">
                        <i class="ri-eye-line"></i> Periksa Sekarang
                    </button>
                </div>
            ` : ''}

            <!-- Filter Panel: Status, Metode, Periode & Controls -->
            <div class="bg-slate-50/70 border border-slate-100 rounded-2xl p-3.5 mb-6">
                <div class="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
                    <div class="flex flex-wrap items-center gap-2.5">
                        <!-- Filter Status -->
                        <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                            <i class="ri-checkbox-circle-line text-primary-600 text-sm"></i>
                            <span class="text-xs text-gray-500 font-medium">Status:</span>
                            <select id="ags-status" class="bg-transparent border-0 p-0 text-xs font-semibold text-gray-800 focus:ring-0 focus:outline-none cursor-pointer pr-1" onchange="AngsuranPage.loadList(AngsuranPage.container)">
                                <option value="">Semua Transaksi</option>
                                <option value="lunas" ${status === 'lunas' ? 'selected' : ''}>Lunas</option>
                                <option value="terlambat" ${status === 'terlambat' ? 'selected' : ''}>Terlambat</option>
                                <option value="belum" ${status === 'belum' ? 'selected' : ''}>Belum Bayar</option>
                            </select>
                        </div>

                        <!-- Filter Metode -->
                        <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                            <i class="ri-wallet-3-line text-amber-600 text-sm"></i>
                            <span class="text-xs text-gray-500 font-medium">Metode:</span>
                            <select id="ags-filter-metode" class="bg-transparent border-0 p-0 text-xs font-semibold text-gray-800 focus:ring-0 focus:outline-none cursor-pointer pr-1" onchange="AngsuranPage.loadList(AngsuranPage.container)">
                                <option value="">Semua Metode</option>
                                <option value="tunai" ${metode === 'tunai' ? 'selected' : ''}>Tunai</option>
                                <option value="transfer" ${metode === 'transfer' ? 'selected' : ''}>Transfer</option>
                                <option value="sukarela" ${metode === 'sukarela' ? 'selected' : ''}>Simpanan Sukarela</option>
                            </select>
                        </div>

                        <!-- Filter Periode -->
                        <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                            <i class="ri-calendar-line text-emerald-600 text-sm"></i>
                            <span class="text-xs text-gray-500 font-medium">Periode:</span>
                            <input type="date" id="ags-filter-dari" value="${dari}" onchange="AngsuranPage.loadList(AngsuranPage.container)" class="bg-transparent border-0 p-0 text-xs font-semibold text-gray-800 focus:ring-0 focus:outline-none w-28 cursor-pointer" title="Dari Tanggal">
                            <span class="text-gray-400 text-xs font-bold px-0.5">s/d</span>
                            <input type="date" id="ags-filter-sampai" value="${sampai}" onchange="AngsuranPage.loadList(AngsuranPage.container)" class="bg-transparent border-0 p-0 text-xs font-semibold text-gray-800 focus:ring-0 focus:outline-none w-28 cursor-pointer" title="Sampai Tanggal">
                        </div>
                    </div>

                    <div class="flex items-center gap-2 justify-end">
                        ${(search || status || metode || dari || sampai) ? `
                            <button onclick="AngsuranPage.resetFilters()" class="text-xs font-semibold text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 px-3 py-2 rounded-xl transition-all border border-rose-200 shadow-sm flex items-center gap-1.5" title="Reset Semua Filter">
                                <i class="ri-refresh-line text-sm"></i> Reset Filter
                            </button>
                        ` : ''}
                        <button onclick="AngsuranPage.loadList(AngsuranPage.container)" class="p-2 text-gray-500 hover:text-primary-600 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-all shadow-sm" title="Segarkan Data">
                            <i class="ri-refresh-line text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
             <div class="table-wrapper"><table class="data-table w-full text-sm">
                <thead><tr class="bg-gray-50">
                    <th class="px-4 py-3 text-left font-medium text-gray-500">No. Transaksi & Anggota</th>
                    <th class="px-4 py-3 text-left font-medium text-gray-500">Tgl Transaksi</th>
                    <th class="px-4 py-3 text-right font-medium text-gray-500">Rincian Pembayaran</th>
                    <th class="px-4 py-3 text-center font-medium text-gray-500">Status & Metode</th>
                    <th class="px-4 py-3 text-center font-medium text-gray-500">Aksi</th>
                </tr></thead>
                <tbody>${res.data.map(a => `<tr class="border-t border-gray-50">
                    <td class="px-4 py-3">
                        <div class="flex flex-col">
                            <div class="flex items-center gap-1.5 flex-wrap">
                                <span class="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-100">${a.no_transaksi || '-'}</span>
                                <span class="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-bold">KE-${a.angsuran_ke}</span>
                                ${a.is_edited > 0 ? `<span onclick="App.showAuditHistory('angsuran', ${a.id})" class="cursor-pointer text-[9px] bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-full font-bold uppercase transition-all inline-flex items-center gap-0.5" title="Klik untuk lihat riwayat perubahan"><i class="ri-history-line"></i> Diedit</span>` : ''}
                            </div>
                            <span class="font-bold text-gray-800 text-sm mt-1">${a.anggota_nama}</span>
                            <div class="text-[11px] text-gray-500 font-mono mt-0.5">
                                ${a.no_anggota ? `<span class="text-gray-400">${a.no_anggota}</span> · ` : ''}<span class="text-primary-600 font-semibold">${a.no_pinjaman}</span>
                            </div>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-gray-600">
                        ${a.tgl_bayar ? `
                            <div class="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
                                <i class="ri-calendar-check-line text-emerald-600"></i> ${App.formatDate(a.tgl_bayar)}
                            </div>
                            <div class="text-[11px] text-gray-400 mt-0.5">Jatuh Tempo: ${App.formatDate(a.tgl_jatuh_tempo)}</div>
                        ` : `
                            <div class="font-medium text-amber-700 text-sm flex items-center gap-1.5">
                                <i class="ri-time-line text-amber-500"></i> ${App.formatDate(a.tgl_jatuh_tempo)}
                            </div>
                            <div class="text-[11px] text-amber-600 font-medium mt-0.5">Jatuh Tempo</div>
                        `}
                    </td>
                    <td class="px-4 py-3 text-right">
                        <div class="font-bold text-gray-900 text-sm">${App.formatRupiah(a.total)}</div>
                        <div class="text-[11px] text-gray-500 mt-0.5">
                            Pokok: ${App.formatRupiah(a.pokok)} · Bunga: ${App.formatRupiah(a.bunga)}${parseFloat(a.denda) > 0 ? ` · Denda: <span class="text-red-500 font-medium">${App.formatRupiah(a.denda)}</span>` : ''}
                        </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <div>${App.statusBadge(a.status)}</div>
                        ${a.metode_pembayaran ? `<div class="text-[10px] text-gray-600 mt-1 uppercase font-semibold tracking-wider font-mono">${a.metode_pembayaran === 'transfer' ? '💳 Transfer' : (a.metode_pembayaran === 'sukarela' ? '<span class="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block font-sans font-bold">💰 Sukarela</span>' : '💵 Tunai')}</div>` : ''}
                    </td>
                    <td class="px-4 py-3 text-center" onclick="event.stopPropagation()">
                        ${a.status === 'belum' && App.hasPerm('angsuran.create') ? `
                            <button onclick="AngsuranPage.form(${a.pinjaman_id})" class="bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-md shadow-emerald-200 transition-all"><i class="ri-money-dollar-circle-line mr-1"></i>Bayar</button>
                        ` : (a.tgl_bayar ? `
                            <div class="relative inline-block text-left">
                                <button onclick="App.toggleRowDropdown(this)" class="row-dropdown-trigger p-1 px-2.5 text-gray-500 hover:text-gray-700 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold transition-all inline-flex items-center gap-1">
                                    Aksi <i class="ri-arrow-down-s-line"></i>
                                </button>
                                <div class="row-dropdown-menu hidden absolute right-0 mt-1 w-32 bg-white border border-gray-100 rounded-xl shadow-xl z-50 py-1 overflow-hidden animate-fadeIn">
                                    <button onclick="App.printReceipt('angsuran', ${a.id})" class="w-full text-left px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center gap-1.5"><i class="ri-printer-line text-sm"></i> Struk</button>
                                    <button onclick="AngsuranPage.form(null, { editId: ${a.id} })" class="w-full text-left px-3 py-1.5 text-xs font-semibold text-primary-600 hover:bg-primary-50 transition-colors flex items-center gap-1.5"><i class="ri-edit-line text-sm"></i> Koreksi</button>
                                    <button onclick="AngsuranPage.confirmReverse(${a.id}, '${a.no_pinjaman}', ${a.angsuran_ke})" class="w-full text-left px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-1.5"><i class="ri-arrow-go-back-line text-sm"></i> Reversal</button>
                                </div>
                            </div>
                        ` : '-')}
                    </td>
                </tr>`).join('')}
                ${res.data.length === 0 ? '<tr><td colspan="5" class="text-center py-8 text-gray-400">Tidak ada data transaksi pembayaran angsuran</td></tr>' : ''}</tbody></table></div>
            ${App.renderPagination(res.pagination, 'AngsuranPage.paginate')}</div>`;
    },

    async form(pinjamanId = null, options = {}) {
        let accounts = [];
        const resAkun = await App.api('keuangan/akun');
        if (resAkun?.success) {
            accounts = resAkun.data;
        }

        const isEdit = !!options.editId;
        let trx = null;
        if (isEdit) {
            const editRes = await App.api('angsuran/' + options.editId);
            if (editRes?.success) {
                trx = editRes.data;
            } else {
                App.toast('Gagal memuat data angsuran', 'error');
                return;
            }
        }

        App.openModal(`<div class="p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-6"><i class="ri-money-dollar-circle-line text-emerald-500 mr-2"></i>${isEdit ? `Koreksi Pembayaran Angsuran: ${trx.no_pinjaman}` : 'Pembayaran Angsuran'}</h3>
            <form id="ags-form" class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Cari Anggota atau No. Pinjaman *</label>
                    <div class="relative">
                        <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="af-search" class="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 ${isEdit ? 'bg-gray-50 text-gray-500 cursor-not-allowed border-gray-200' : ''}" placeholder="Ketik nama atau no pinjaman..." autocomplete="off" ${isEdit ? 'disabled' : ''} value="${isEdit ? `${trx.no_pinjaman} - ${trx.anggota_nama}` : ''}">
                    </div>
                    <div id="af-results" class="hidden border border-gray-200 rounded-xl mt-1 max-h-60 overflow-auto bg-white shadow-xl z-50"></div>
                </div>

                <div id="af-loan-box" class="${isEdit ? '' : 'hidden'} bg-emerald-50 border border-emerald-100 rounded-xl p-4 animate-fadeIn">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <div id="info-nama" class="font-bold text-gray-800 text-base">${isEdit ? trx.anggota_nama : ''}</div>
                            <div id="info-pinjaman" class="font-mono text-xs text-primary-600">${isEdit ? trx.no_pinjaman : ''}</div>
                        </div>
                        <div class="text-right">
                            <div class="text-[0.65rem] text-gray-400 uppercase tracking-wider">${isEdit ? 'Saldo Sebelum' : 'Sisa Hutang'}</div>
                            <div id="info-sisa" class="font-bold text-emerald-700 text-lg">${isEdit ? App.formatRupiah(trx.sisa_pinjaman || 0) : ''}</div>
                        </div>
                    </div>
                    <div class="flex items-center gap-4 text-xs">
                        <div class="bg-white/50 px-2.5 py-1 rounded-lg border border-emerald-100">
                            <span class="text-gray-400">Angsuran Ke:</span> <span id="info-ke" class="font-bold text-gray-700">${isEdit ? trx.angsuran_ke : ''}</span>
                        </div>
                        <div class="bg-white/50 px-2.5 py-1 rounded-lg border border-emerald-100">
                            <span class="text-gray-400">Status:</span> <span id="info-status" class="font-bold text-gray-700">${isEdit ? trx.status : ''}</span>
                        </div>
                        <div class="bg-white/50 px-2.5 py-1 rounded-lg border border-emerald-100">
                            <span class="text-gray-400">Saldo Sukarela:</span> <span id="info-sukarela" class="font-bold text-amber-700">${isEdit ? App.formatRupiah(trx.saldo_sukarela || 0) : '-'}</span>
                        </div>
                    </div>
                </div>

                <input type="hidden" id="af-angsuran-id" value="${isEdit ? trx.id : ''}">
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Tanggal Transaksi *</label>
                        <input type="text" id="af-tgl" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" required>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Metode Pembayaran *</label>
                        <select id="af-metode" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500">
                            <option value="tunai" ${isEdit && trx.metode_pembayaran === 'tunai' ? 'selected' : ''}>Tunai (Kas)</option>
                            <option value="transfer" ${isEdit && trx.metode_pembayaran === 'transfer' ? 'selected' : ''}>Transfer Bank</option>
                            <option value="sukarela" ${isEdit && trx.metode_pembayaran === 'sukarela' ? 'selected' : ''}>Simpanan Sukarela</option>
                        </select>
                    </div>
                </div>

                <div id="af-akun-kas-container" class="${isEdit && trx.metode_pembayaran === 'transfer' ? '' : 'hidden'}">
                    <label class="block text-sm font-medium text-gray-600 mb-1">Pilih Rekening Bank/COA *</label>
                    <div class="relative" id="af-akun-kas-wrapper">
                        <input type="text" id="af-akun-kas-search" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" placeholder="Ketik untuk mencari akun..." autocomplete="off">
                        <input type="hidden" id="af-akun-kas" value="${isEdit ? trx.akun_kas_id || '' : ''}">
                        <div id="af-akun-kas-results" class="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-xl hidden"></div>
                    </div>
                </div>

                <div id="af-sukarela-container" class="${isEdit && trx.metode_pembayaran === 'sukarela' ? '' : 'hidden'} bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 animate-fadeIn">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2.5">
                            <div class="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold shadow-sm">
                                <i class="ri-wallet-3-line text-lg"></i>
                            </div>
                            <div>
                                <div class="text-xs text-amber-800 font-medium">Saldo Simpanan Sukarela Anggota</div>
                                <div id="af-sukarela-saldo" class="text-sm font-bold text-amber-900 font-mono">Rp 0</div>
                            </div>
                        </div>
                        <div id="af-sukarela-status" class="text-right">
                            <span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1"><i class="ri-checkbox-circle-line"></i> Saldo Cukup</span>
                        </div>
                    </div>
                    <div id="af-sukarela-warning" class="hidden mt-2.5 text-xs text-rose-600 bg-rose-50 p-2.5 rounded-lg border border-rose-200 flex items-center gap-2">
                        <i class="ri-error-warning-line text-base flex-shrink-0"></i>
                        <span id="af-sukarela-warning-text">Saldo simpanan sukarela tidak mencukupi untuk pembayaran tagihan ini.</span>
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Pokok (Rp) *</label>
                        <input type="number" id="af-pokok" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 font-medium" placeholder="0" value="${isEdit ? trx.pokok : ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Jasa/Bunga (Rp) *</label>
                        <input type="number" id="af-bunga" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 font-medium" placeholder="0" value="${isEdit ? trx.bunga : ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1 text-red-600">Denda Terlambat (Rp)</label>
                        <input type="number" id="af-denda" class="w-full border border-red-200 bg-red-50 focus:ring-2 focus:ring-red-500 rounded-xl px-4 py-2.5 text-sm font-bold text-red-600" placeholder="0" value="${isEdit ? trx.denda : ''}">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Total Bayar (Rp)</label>
                        <input type="text" id="af-total-view" class="w-full border border-emerald-200 bg-emerald-50 rounded-xl px-4 py-2.5 text-sm font-bold text-emerald-700 text-lg" readonly>
                    </div>
                </div>

                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Keterangan</label>
                    <textarea id="af-ket" rows="2" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" placeholder="Contoh: Angsuran k-3 lancar...">${isEdit ? trx.keterangan || '' : ''}</textarea>
                </div>

                <div class="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onclick="App.closeModal()" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 text-gray-600">Batal</button>
                    <button type="submit" id="af-submit" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-600/20" ${isEdit ? '' : 'disabled'}>${isEdit ? 'Simpan Koreksi' : 'Simpan Pembayaran'}</button>
                </div>
            </form>
        </div>`);

        App.datepicker('#af-tgl', { defaultDate: isEdit ? App.formatDate(trx.tgl_bayar) : 'today' });

        this.selectedSukarelaSaldo = isEdit ? (parseFloat(trx.saldo_sukarela) || 0) : 0;

        const searchInput = document.getElementById('af-search');
        const resultsDiv = document.getElementById('af-results');
        const pokokInput = document.getElementById('af-pokok');
        const bungaInput = document.getElementById('af-bunga');
        const dendaInput = document.getElementById('af-denda');
        const totalView = document.getElementById('af-total-view');
        const metodeSelect = document.getElementById('af-metode');
        const akunKasContainer = document.getElementById('af-akun-kas-container');
        const searchCoaInput = document.getElementById('af-akun-kas-search');
        const hiddenCoaInput = document.getElementById('af-akun-kas');
        const dropCoaContainer = document.getElementById('af-akun-kas-results');

        const sukarelaContainer = document.getElementById('af-sukarela-container');
        const sukarelaSaldoEl = document.getElementById('af-sukarela-saldo');
        const sukarelaStatusEl = document.getElementById('af-sukarela-status');
        const sukarelaWarningEl = document.getElementById('af-sukarela-warning');
        const sukarelaWarningText = document.getElementById('af-sukarela-warning-text');
        const submitBtn = document.getElementById('af-submit');

        const assetAccounts = accounts.filter(a => a.tipe === 'aset');

        const filterCoa = (q = '') => {
            const query = q.toLowerCase().trim();
            const filtered = assetAccounts.filter(a => 
                a.kode.toLowerCase().includes(query) || 
                a.nama.toLowerCase().includes(query)
            );

            if (filtered.length) {
                dropCoaContainer.innerHTML = filtered.map(a => `
                    <div class="px-4 py-2.5 hover:bg-emerald-50 cursor-pointer text-sm border-b border-gray-50 last:border-0" data-id="${a.id}" data-text="${a.kode} - ${a.nama}">
                        <span class="font-mono text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded mr-2">${a.kode}</span>
                        <span class="font-medium text-gray-800">${a.nama}</span>
                    </div>
                `).join('');
                dropCoaContainer.classList.remove('hidden');
            } else {
                dropCoaContainer.innerHTML = '<div class="px-4 py-3 text-gray-400 text-xs italic">Akun tidak ditemukan</div>';
                dropCoaContainer.classList.remove('hidden');
            }
        };

        if (isEdit && trx.akun_kas_id) {
            const activeAcc = assetAccounts.find(a => a.id == trx.akun_kas_id);
            if (activeAcc) {
                searchCoaInput.value = `${activeAcc.kode} - ${activeAcc.nama}`;
            }
        }

        searchCoaInput.addEventListener('focus', () => {
            filterCoa(searchCoaInput.value);
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('#af-akun-kas-wrapper')) {
                dropCoaContainer.classList.add('hidden');
            }
        });

        searchCoaInput.addEventListener('input', (e) => {
            filterCoa(e.target.value);
        });

        dropCoaContainer.addEventListener('click', (e) => {
            const item = e.target.closest('[data-id]');
            if (item) {
                const id = item.getAttribute('data-id');
                const text = item.getAttribute('data-text');
                hiddenCoaInput.value = id;
                searchCoaInput.value = text;
                dropCoaContainer.classList.add('hidden');
            }
        });

        const updateSukarelaValidation = (total) => {
            if (metodeSelect.value !== 'sukarela') {
                sukarelaContainer.classList.add('hidden');
                if (submitBtn && (!isEdit || trx)) submitBtn.disabled = false;
                return;
            }

            sukarelaContainer.classList.remove('hidden');
            const saldoSS = AngsuranPage.selectedSukarelaSaldo || 0;
            sukarelaSaldoEl.textContent = App.formatRupiah(saldoSS);

            if (saldoSS >= total && total > 0) {
                sukarelaStatusEl.innerHTML = `<span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1"><i class="ri-checkbox-circle-line"></i> Saldo Cukup</span>`;
                sukarelaWarningEl.classList.add('hidden');
                if (submitBtn) submitBtn.disabled = false;
            } else {
                const defisit = total - saldoSS;
                sukarelaStatusEl.innerHTML = `<span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1"><i class="ri-close-circle-line"></i> Saldo Kurang</span>`;
                sukarelaWarningText.innerHTML = `Saldo simpanan sukarela tidak mencukupi (Kurang <b>${App.formatRupiah(defisit)}</b>). Silakan gunakan tunai/transfer atau lakukan setoran simpanan sukarela terlebih dahulu.`;
                sukarelaWarningEl.classList.remove('hidden');
                if (submitBtn) submitBtn.disabled = true;
            }
        };

        metodeSelect.addEventListener('change', () => {
            if (metodeSelect.value === 'transfer') {
                akunKasContainer.classList.remove('hidden');
                searchCoaInput.setAttribute('required', 'required');
            } else {
                akunKasContainer.classList.add('hidden');
                searchCoaInput.removeAttribute('required');
            }

            const p = parseFloat(pokokInput.value) || 0;
            const b = parseFloat(bungaInput.value) || 0;
            const d = parseFloat(dendaInput.value) || 0;
            updateSukarelaValidation(p + b + d);
        });

        const calculateTotal = () => {
            const p = parseFloat(pokokInput.value) || 0;
            const b = parseFloat(bungaInput.value) || 0;
            const d = parseFloat(dendaInput.value) || 0;
            const total = p + b + d;
            totalView.value = App.formatRupiah(total);
            updateSukarelaValidation(total);
        };

        [pokokInput, bungaInput, dendaInput].forEach(el => {
            el.addEventListener('input', calculateTotal);
        });

        if (isEdit) {
            calculateTotal();
        }

        let debounce;
        if (!isEdit) {
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
        }

        if (!isEdit && pinjamanId) this.selectLoan(pinjamanId);

        document.getElementById('ags-form').onsubmit = async e => {
            e.preventDefault();
            const angsuranId = document.getElementById('af-angsuran-id').value;
            const loanId = isEdit ? trx.pinjaman_id : this.currentLoanId;
            const p = parseFloat(pokokInput.value) || 0;
            const b = parseFloat(bungaInput.value) || 0;
            const d = parseFloat(dendaInput.value) || 0;
            const total = p + b + d;

            if (metodeSelect.value === 'sukarela') {
                const saldoSS = AngsuranPage.selectedSukarelaSaldo || 0;
                if (saldoSS < total) {
                    App.toast(`Saldo Simpanan Sukarela (${App.formatRupiah(saldoSS)}) tidak mencukupi untuk total tagihan ${App.formatRupiah(total)}`, 'error');
                    return;
                }
            }

            const body = {
                angsuran_id: angsuranId,
                pinjaman_id: loanId,
                pokok: p,
                bunga: b,
                denda: d,
                tgl_transaksi: App.dateToISO(document.getElementById('af-tgl').value),
                metode_pembayaran: metodeSelect.value,
                akun_kas_id: metodeSelect.value === 'transfer' ? hiddenCoaInput.value : null,
                keterangan: document.getElementById('af-ket').value
            };

            const url = isEdit ? `angsuran/${options.editId}` : 'angsuran';
            const method = isEdit ? 'PUT' : 'POST';
            const res = await App.api(url, { method, body });

            if (res?.success) {
                App.closeModal();
                if (isEdit) {
                    App.toast(`Berhasil mengoreksi data pembayaran angsuran.`, 'success', 5000);
                } else {
                    const d = res.data;
                    App.toast(`Berhasil: Angsuran ${d.angsuran_ke === 'Manual' ? 'Manual' : 'ke-' + d.angsuran_ke} telah dibayar. Total: ${App.formatRupiah(d.total_bayar)}`, 'success', 5000);
                }
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

        // Saldo Sukarela
        this.selectedSukarelaSaldo = parseFloat(data.saldo_sukarela || 0);
        const infoSukarela = document.getElementById('info-sukarela');
        if (infoSukarela) infoSukarela.textContent = App.formatRupiah(this.selectedSukarelaSaldo);

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
            const total = p + b + d;
            totalView.value = App.formatRupiah(total);
            const metodeSelect = document.getElementById('af-metode');
            if (metodeSelect && metodeSelect.value === 'sukarela') {
                const sukarelaSaldoEl = document.getElementById('af-sukarela-saldo');
                const sukarelaStatusEl = document.getElementById('af-sukarela-status');
                const sukarelaWarningEl = document.getElementById('af-sukarela-warning');
                const sukarelaWarningText = document.getElementById('af-sukarela-warning-text');
                const submitBtn = document.getElementById('af-submit');
                if (sukarelaSaldoEl) sukarelaSaldoEl.textContent = App.formatRupiah(AngsuranPage.selectedSukarelaSaldo);

                if (AngsuranPage.selectedSukarelaSaldo >= total && total > 0) {
                    if (sukarelaStatusEl) sukarelaStatusEl.innerHTML = `<span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1"><i class="ri-checkbox-circle-line"></i> Saldo Cukup</span>`;
                    if (sukarelaWarningEl) sukarelaWarningEl.classList.add('hidden');
                    if (submitBtn) submitBtn.disabled = false;
                } else {
                    const defisit = total - AngsuranPage.selectedSukarelaSaldo;
                    if (sukarelaStatusEl) sukarelaStatusEl.innerHTML = `<span class="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 inline-flex items-center gap-1"><i class="ri-close-circle-line"></i> Saldo Kurang</span>`;
                    if (sukarelaWarningText) sukarelaWarningText.innerHTML = `Saldo simpanan sukarela tidak mencukupi (Kurang <b>${App.formatRupiah(defisit)}</b>). Silakan gunakan tunai/transfer atau lakukan setoran simpanan sukarela terlebih dahulu.`;
                    if (sukarelaWarningEl) sukarelaWarningEl.classList.remove('hidden');
                    if (submitBtn) submitBtn.disabled = true;
                }
            }
        };
        calc();

        document.getElementById('af-submit').disabled = false;
        document.getElementById('af-ket').focus();
    },

    paginate(p) { this.loadList(this.container, p); },

    resetFilters() {
        const s = document.getElementById('ags-search');
        const st = document.getElementById('ags-status');
        const m = document.getElementById('ags-filter-metode');
        const d = document.getElementById('ags-filter-dari');
        const sm = document.getElementById('ags-filter-sampai');
        if (s) s.value = '';
        if (st) st.value = '';
        if (m) m.value = '';
        if (d) d.value = '';
        if (sm) sm.value = '';
        if (App.queryParams) {
            delete App.queryParams.search;
            delete App.queryParams.status;
            delete App.queryParams.metode;
            delete App.queryParams.dari;
            delete App.queryParams.sampai;
        }
        this.loadList(this.container, 1);
    },

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
        const metode = document.getElementById('ags-filter-metode')?.value || '';
        const dari = document.getElementById('ags-filter-dari')?.value || '';
        const sampai = document.getElementById('ags-filter-sampai')?.value || '';
        const res = await App.api(`angsuran?search=${encodeURIComponent(search)}&status=${status}&metode_pembayaran=${metode}&dari=${dari}&sampai=${sampai}&per_page=1000`);
        if (!res?.success) return;

        const columns = [
            { title: 'No. Transaksi', key: 'no_transaksi' },
            { title: 'Tgl Transaksi', key: 'tgl_transaksi_formatted' },
            { title: 'No. Pinjaman', key: 'no_pinjaman' },
            { title: 'Anggota', key: 'anggota_nama' },
            { title: 'Ke', key: 'angsuran_ke', align: 'center' },
            { title: 'Pokok', key: 'pokok', align: 'right' },
            { title: 'Bunga', key: 'bunga', align: 'right' },
            { title: 'Denda', key: 'denda', align: 'right' },
            { title: 'Total', key: 'total_val', align: 'right' },
            { title: 'Metode', key: 'metode_label' },
            { title: 'Status', key: 'status_label' }
        ];

        const rows = res.data.map(a => ({
            ...a,
            no_transaksi: a.no_transaksi || '-',
            tgl_transaksi_formatted: a.tgl_bayar ? App.formatDate(a.tgl_bayar) : App.formatDate(a.tgl_jatuh_tempo),
            pokok: App.formatRupiah(a.pokok),
            bunga: App.formatRupiah(a.bunga),
            denda: App.formatRupiah(a.denda || 0),
            total_val: App.formatRupiah(a.total),
            metode_label: (a.metode_pembayaran || '-').toUpperCase(),
            status_label: a.status.toUpperCase()
        }));

        App.export(type, 'Daftar Transaksi Pembayaran Angsuran', columns, rows, { filename: 'transaksi_pembayaran_angsuran' });
    },

    // ===== Antrean Pengajuan Pembayaran dari Portal =====
    async showAntreanPengajuan(focusPengajuanId = null, filterStatus = 'pending') {
        this._currentPengajuanStatus = filterStatus;
        this._focusPengajuanId = focusPengajuanId;

        const modalHtml = `
            <div class="p-6">
                <!-- Header Modal -->
                <div class="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-2xl shrink-0 border border-amber-200/50">
                            <i class="ri-shield-check-line"></i>
                        </div>
                        <div>
                            <h3 class="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                                Verifikasi Pengajuan Pembayaran Angsuran
                                <span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Simpanan Sukarela</span>
                            </h3>
                            <p class="text-xs text-gray-500">Persetujuan autodebet angsuran melalui Simpanan Sukarela anggota portal mandiri</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="AngsuranPage.loadPengajuanTable(AngsuranPage._currentPengajuanStatus)" class="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-xl transition border border-gray-200" title="Segarkan Data">
                            <i class="ri-refresh-line text-base"></i>
                        </button>
                        <button onclick="App.closeModal()" class="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100 transition">
                            <i class="ri-close-line text-2xl"></i>
                        </button>
                    </div>
                </div>

                <!-- Ringkasan Stat Pills (1 Baris Ringkas & Rapi) -->
                <div class="flex flex-wrap items-center gap-2.5 mb-4 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl text-xs" id="pengajuan-stats-cards">
                    <div class="flex items-center gap-2 px-3 py-1 bg-amber-50 border border-amber-200/80 rounded-lg text-amber-800">
                        <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span class="text-gray-600">Menunggu ACC:</span>
                        <span id="stat-pending-count" class="font-bold text-gray-900">-</span>
                    </div>
                    <div class="flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200/80 rounded-lg text-emerald-800">
                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span class="text-gray-600">Disetujui:</span>
                        <span id="stat-approved-count" class="font-bold text-gray-900">-</span>
                    </div>
                    <div class="flex items-center gap-2 px-3 py-1 bg-rose-50 border border-rose-200/80 rounded-lg text-rose-800">
                        <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span class="text-gray-600">Ditolak:</span>
                        <span id="stat-rejected-count" class="font-bold text-gray-900">-</span>
                    </div>
                </div>

                <!-- Toolbar: Filter Tabs & Search -->
                <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3">
                    <div class="flex flex-wrap items-center gap-1 bg-gray-100 p-1 rounded-xl">
                        <button onclick="AngsuranPage.loadPengajuanTable('pending')" id="tab-pengajuan-pending" class="tab-pengajuan px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-500 text-white shadow-xs">
                            Menunggu ACC
                        </button>
                        <button onclick="AngsuranPage.loadPengajuanTable('disetujui')" id="tab-pengajuan-disetujui" class="tab-pengajuan px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-600 hover:text-gray-900">
                            Disetujui
                        </button>
                        <button onclick="AngsuranPage.loadPengajuanTable('ditolak')" id="tab-pengajuan-ditolak" class="tab-pengajuan px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-600 hover:text-gray-900">
                            Ditolak
                        </button>
                        <button onclick="AngsuranPage.loadPengajuanTable('')" id="tab-pengajuan-all" class="tab-pengajuan px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-600 hover:text-gray-900">
                            Semua
                        </button>
                    </div>

                    <div class="relative flex-1 sm:max-w-xs">
                        <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                        <input type="text" id="pengajuan-search" oninput="AngsuranPage.filterPengajuanLocal(this.value)" placeholder="Cari nama, pinjaman, rekening..." class="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition">
                    </div>
                </div>

                <!-- Container Table (Data Table Rapi & Terstruktur) -->
                <div id="pengajuan-table-container" class="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                    <div class="text-center py-16 text-gray-400">
                        <div class="animate-spin w-8 h-8 border-4 border-amber-200 border-t-amber-600 rounded-full mx-auto mb-2"></div>
                        Memuat data pengajuan...
                    </div>
                </div>

                <!-- Footer Modal -->
                <div class="mt-4 pt-3 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
                    <div class="flex items-center gap-1.5 text-gray-500">
                        <i class="ri-information-line text-amber-500 text-sm"></i>
                        <span>Persetujuan memotong saldo Simpanan Sukarela dan mencatat pembayaran angsuran lunas otomatis.</span>
                    </div>
                    <button onclick="App.closeModal()" class="px-5 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition">Tutup</button>
                </div>
            </div>
        `;
        App.openModal(modalHtml, 'max-w-6xl');
        this.loadPengajuanTable(filterStatus, focusPengajuanId);
    },

    async loadPengajuanTable(status = 'pending', focusPengajuanId = null) {
        this._currentPengajuanStatus = status;

        document.querySelectorAll('.tab-pengajuan').forEach(btn => {
            btn.className = 'tab-pengajuan px-3 py-1.5 rounded-lg text-xs font-bold transition-all text-gray-600 hover:text-gray-900';
        });
        const activeTab = document.getElementById(`tab-pengajuan-${status || 'all'}`);
        if (activeTab) {
            activeTab.className = 'tab-pengajuan px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-amber-500 text-white shadow-xs';
        }

        const container = document.getElementById('pengajuan-table-container');
        if (!container) return;

        // Fetch data
        const [res, allRes] = await Promise.all([
            App.api(`angsuran/pengajuan?status=${status}`),
            App.api('angsuran/pengajuan?status=')
        ]);

        if (allRes?.success && allRes.data) {
            const allItems = allRes.data;
            const pendingItems = allItems.filter(x => x.status === 'pending');
            const approvedItems = allItems.filter(x => x.status === 'disetujui');
            const rejectedItems = allItems.filter(x => x.status === 'ditolak');

            const pCountEl = document.getElementById('stat-pending-count');
            const aCountEl = document.getElementById('stat-approved-count');
            const rCountEl = document.getElementById('stat-rejected-count');

            if (pCountEl) {
                const totalNominal = pendingItems.reduce((acc, curr) => acc + parseFloat(curr.total_bayar || 0), 0);
                pCountEl.innerHTML = `${pendingItems.length} <span class="text-xs font-normal text-gray-500">(${App.formatRupiah(totalNominal)})</span>`;
            }
            if (aCountEl) {
                const totalNominal = approvedItems.reduce((acc, curr) => acc + parseFloat(curr.total_bayar || 0), 0);
                aCountEl.innerHTML = `${approvedItems.length} <span class="text-xs font-normal text-gray-500">(${App.formatRupiah(totalNominal)})</span>`;
            }
            if (rCountEl) {
                rCountEl.textContent = `${rejectedItems.length} Pengajuan`;
            }
        }

        if (!res?.success || !res.data) {
            container.innerHTML = `
                <div class="text-center py-16 text-gray-400 bg-gray-50/50">
                    <i class="ri-error-warning-line text-4xl mb-2 block opacity-30 text-rose-500"></i>
                    <p class="text-sm font-medium">Gagal memuat data pengajuan pembayaran angsuran.</p>
                </div>
            `;
            return;
        }

        this._pengajuanList = res.data;
        this.renderPengajuanRows(this._pengajuanList, focusPengajuanId);
    },

    filterPengajuanLocal(query) {
        const q = (query || '').trim().toLowerCase();
        if (!this._pengajuanList) return;

        if (!q) {
            this.renderPengajuanRows(this._pengajuanList);
            return;
        }

        const filtered = this._pengajuanList.filter(p => {
            return (p.nama_anggota || '').toLowerCase().includes(q) ||
                   (p.no_anggota || '').toLowerCase().includes(q) ||
                   (p.no_pinjaman || '').toLowerCase().includes(q) ||
                   (p.no_pengajuan || '').toLowerCase().includes(q) ||
                   (p.no_rekening || '').toLowerCase().includes(q);
        });

        this.renderPengajuanRows(filtered);
    },

    renderPengajuanRows(items, focusPengajuanId = null) {
        const container = document.getElementById('pengajuan-table-container');
        if (!container) return;

        if (!items || !items.length) {
            container.innerHTML = `
                <div class="text-center py-16 text-gray-400 bg-gray-50/50">
                    <i class="ri-inbox-line text-5xl mb-2 block opacity-30"></i>
                    <p class="text-sm font-medium text-gray-600">Tidak ada data pengajuan pembayaran angsuran.</p>
                    <p class="text-xs text-gray-400 mt-1">Coba ganti tab status atau kata kunci pencarian.</p>
                </div>
            `;
            return;
        }

        const rowsHtml = items.map(p => {
            const isFocus = focusPengajuanId && p.id == focusPengajuanId;
            const totalBayar = parseFloat(p.total_bayar || 0);
            const saldoSukarela = parseFloat(p.saldo_sukarela ?? p.saldo_sukarela_terkini ?? 0);
            const sisaSetelahBayar = saldoSukarela - totalBayar;
            const cukupSaldo = saldoSukarela >= totalBayar;
            const sisaPinjaman = parseFloat(p.sisa_pinjaman || 0);

            return `
                <tr class="hover:bg-slate-50/80 transition-colors border-b border-gray-100 ${isFocus ? 'bg-amber-50/70 font-semibold' : ''}">
                    <!-- 1. No Pengajuan & Tgl -->
                    <td class="px-4 py-3 align-top whitespace-nowrap">
                        <span class="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            ${p.no_pengajuan}
                        </span>
                        <div class="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                            <i class="ri-time-line"></i> ${App.formatDate(p.tgl_pengajuan)}
                        </div>
                    </td>

                    <!-- 2. Identitas Anggota -->
                    <td class="px-4 py-3 align-top">
                        <div class="font-bold text-gray-900 text-xs leading-snug">
                            ${App.escapeHtml(p.nama_anggota)}
                        </div>
                        <div class="text-[11px] text-gray-500 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>${p.no_anggota || '-'}</span>
                            ${p.telepon ? `<span>·</span> <span class="text-emerald-600"><i class="ri-phone-line"></i> ${p.telepon}</span>` : ''}
                        </div>
                    </td>

                    <!-- 3. Pinjaman & Angsuran -->
                    <td class="px-4 py-3 align-top whitespace-nowrap">
                        <div class="font-mono font-bold text-primary-700 text-xs">${p.no_pinjaman}</div>
                        <div class="text-gray-700 text-[11px] mt-0.5">
                            Angsuran Ke-<b>${p.angsuran_ke}</b>${p.tenor ? ` dari ${p.tenor}` : ''}
                        </div>
                        <div class="text-[10px] text-gray-400 mt-0.5">
                            Tempo: ${App.formatDate(p.tgl_jatuh_tempo)} · Sisa Pokok: ${App.formatRupiah(sisaPinjaman)}
                        </div>
                    </td>

                    <!-- 4. Rincian Tagihan -->
                    <td class="px-4 py-3 align-top text-right whitespace-nowrap">
                        <div class="font-bold text-gray-900 text-xs">${App.formatRupiah(totalBayar)}</div>
                        <div class="text-[10px] text-gray-500 font-mono mt-0.5">
                            P: ${App.formatRupiah(p.pokok)} | B: ${App.formatRupiah(p.bunga)}
                        </div>
                        ${parseFloat(p.denda) > 0 ? `<div class="text-[10px] text-rose-600 font-mono">Denda: ${App.formatRupiah(p.denda)}</div>` : ''}
                    </td>

                    <!-- 5. Simpanan Sukarela & Kelayakan -->
                    <td class="px-4 py-3 align-top whitespace-nowrap">
                        <div class="font-mono text-gray-600 text-[11px]">${p.no_rekening || 'Rekening Sukarela'}</div>
                        <div class="font-bold text-xs ${cukupSaldo ? 'text-emerald-700' : 'text-rose-700'} mt-0.5">
                            Saldo: ${App.formatRupiah(saldoSukarela)}
                        </div>
                        <div class="mt-1">
                            ${cukupSaldo ? `
                                <span class="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    <i class="ri-checkbox-circle-fill text-emerald-500"></i> Cukup (Sisa ${App.formatRupiah(sisaSetelahBayar)})
                                </span>
                            ` : `
                                <span class="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                    <i class="ri-error-warning-fill text-rose-500"></i> Saldo Kurang Rp ${App.formatRupiah(totalBayar - saldoSukarela)}
                                </span>
                            `}
                        </div>
                    </td>

                    <!-- 6. Status -->
                    <td class="px-4 py-3 align-top text-center whitespace-nowrap">
                        ${p.status === 'pending' ? `
                            <span class="badge badge-warning text-[10px] font-bold inline-flex items-center">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping mr-1"></span>Menunggu ACC
                            </span>
                        ` : (p.status === 'disetujui' ? `
                            <span class="badge badge-success text-[10px] font-bold inline-flex items-center">
                                <i class="ri-check-double-line mr-1"></i>Disetujui
                            </span>
                            ${p.approver_nama ? `<div class="text-[9px] text-gray-400 mt-0.5">Oleh: ${p.approver_nama}</div>` : ''}
                            ${p.tgl_approval ? `<div class="text-[9px] text-gray-400">${App.formatDate(p.tgl_approval)}</div>` : ''}
                        ` : `
                            <span class="badge badge-danger text-[10px] font-bold inline-flex items-center">
                                <i class="ri-close-circle-line mr-1"></i>Ditolak
                            </span>
                            ${p.approver_nama ? `<div class="text-[9px] text-gray-400 mt-0.5">Oleh: ${p.approver_nama}</div>` : ''}
                        `)}
                    </td>

                    <!-- 7. Aksi / Verifikasi -->
                    <td class="px-4 py-3 align-top text-center whitespace-nowrap">
                        ${p.status === 'pending' ? `
                            <div class="flex items-center justify-center gap-1.5">
                                <button onclick="AngsuranPage.approvePengajuan(${p.id})" 
                                    class="px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-xs flex items-center gap-1 active:scale-95 ${!cukupSaldo ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}" 
                                    title="${cukupSaldo ? 'Setujui Pembayaran (ACC)' : 'Saldo Simpanan Sukarela Tidak Mencukupi'}">
                                    <i class="ri-check-line text-sm"></i> Setujui
                                </button>
                                <button onclick="AngsuranPage.rejectPengajuan(${p.id})" 
                                    class="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-600 hover:text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition active:scale-95 shadow-2xs flex items-center gap-1" 
                                    title="Tolak Pengajuan">
                                    <i class="ri-close-line text-sm"></i> Tolak
                                </button>
                            </div>
                        ` : (p.status === 'disetujui' ? `
                            <button onclick="App.printReceipt('angsuran', ${p.angsuran_id})" 
                                class="px-2.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-xs font-medium transition inline-flex items-center gap-1">
                                <i class="ri-printer-line"></i> Cetak Struk
                            </button>
                        ` : `
                            ${p.alasan_penolakan ? `
                                <span class="text-[10px] text-rose-600 italic bg-rose-50/80 px-2 py-1 rounded border border-rose-100 inline-block max-w-[150px] truncate" title="${App.escapeHtml(p.alasan_penolakan)}">
                                    "${App.escapeHtml(p.alasan_penolakan)}"
                                </span>
                            ` : '<span class="text-gray-400 text-xs">-</span>'}
                        `)}
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <div class="overflow-x-auto max-h-[60vh] overflow-y-auto scrollbar-thin">
                <table class="w-full text-xs text-left border-collapse">
                    <thead class="bg-gray-50/90 text-gray-600 uppercase text-[10px] font-bold tracking-wider sticky top-0 z-10 border-b border-gray-200 backdrop-blur-xs">
                        <tr>
                            <th class="px-4 py-3">No. Pengajuan</th>
                            <th class="px-4 py-3">Anggota</th>
                            <th class="px-4 py-3">Pinjaman & Angsuran</th>
                            <th class="px-4 py-3 text-right">Tagihan Angsuran</th>
                            <th class="px-4 py-3">Simpanan Sukarela</th>
                            <th class="px-4 py-3 text-center">Status</th>
                            <th class="px-4 py-3 text-center">Aksi / Verifikasi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 bg-white">
                        ${rowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    },

    async approvePengajuan(id) {
        const p = (this._pengajuanList || []).find(x => x.id == id);
        if (!p) {
            App.toast('Data pengajuan tidak ditemukan', 'error');
            return;
        }

        const totalBayar = parseFloat(p.total_bayar || 0);
        const saldoSukarela = parseFloat(p.saldo_sukarela ?? p.saldo_sukarela_terkini ?? 0);
        const sisaSaldo = saldoSukarela - totalBayar;
        const sisaPinjaman = parseFloat(p.sisa_pinjaman || 0);
        const sisaPinjamanBaru = Math.max(0, sisaPinjaman - parseFloat(p.pokok || 0));

        if (saldoSukarela < totalBayar) {
            App.toast('Saldo Simpanan Sukarela anggota tidak mencukupi untuk disetujui.', 'error');
            return;
        }

        const ok = await Swal.fire({
            title: 'Setujui Pembayaran Angsuran?',
            html: `
                <div class="text-left text-xs text-gray-600 space-y-3">
                    <div class="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                        <div class="font-bold text-gray-800 text-sm mb-0.5">${p.nama_anggota}</div>
                        <div class="text-gray-500 font-mono text-[11px]">${p.no_anggota || '-'}</div>
                        <div class="mt-1 text-gray-600">No. Pengajuan: <b class="font-mono text-gray-900">${p.no_pengajuan}</b></div>
                        <div class="text-gray-600">Pinjaman: <b class="font-mono text-primary-700">${p.no_pinjaman}</b> · Angsuran ke-<b>${p.angsuran_ke}</b>${p.tenor ? ` dari ${p.tenor}` : ''}</div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <!-- Kotak Simpanan Sukarela -->
                        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                            <div class="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1 border-b border-slate-200 pb-1">
                                <i class="ri-wallet-3-line text-amber-500"></i> Simpanan Sukarela
                            </div>
                            <div class="flex justify-between"><span>No. Rekening:</span> <span class="font-mono font-semibold text-gray-800">${p.no_rekening || '-'}</span></div>
                            <div class="flex justify-between"><span>Saldo Terkini:</span> <span class="font-bold text-emerald-700">${App.formatRupiah(saldoSukarela)}</span></div>
                            <div class="flex justify-between text-rose-600 font-semibold"><span>Dipotong:</span> <span>- ${App.formatRupiah(totalBayar)}</span></div>
                            <div class="flex justify-between border-t border-slate-200 pt-1 font-bold text-primary-700"><span>Sisa Saldo Baru:</span> <span>${App.formatRupiah(sisaSaldo)}</span></div>
                        </div>

                        <!-- Kotak Tagihan Pinjaman -->
                        <div class="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                            <div class="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1 border-b border-slate-200 pb-1">
                                <i class="ri-bank-card-line text-primary-600"></i> Rincian Angsuran
                            </div>
                            <div class="flex justify-between"><span>Pokok Angsuran:</span> <span class="text-gray-800 font-semibold">${App.formatRupiah(p.pokok)}</span></div>
                            <div class="flex justify-between"><span>Jasa / Bunga:</span> <span class="text-gray-800 font-semibold">${App.formatRupiah(p.bunga)}</span></div>
                            ${parseFloat(p.denda) > 0 ? `<div class="flex justify-between text-rose-600 font-semibold"><span>Denda:</span> <span>${App.formatRupiah(p.denda)}</span></div>` : ''}
                            <div class="flex justify-between border-t border-slate-200 pt-1 font-bold text-primary-700"><span>Total Tagihan:</span> <span>${App.formatRupiah(totalBayar)}</span></div>
                            <div class="flex justify-between text-[10px] text-gray-500 pt-0.5"><span>Sisa Pokok Nanti:</span> <span class="font-mono font-bold">${App.formatRupiah(sisaPinjamanBaru)}</span></div>
                        </div>
                    </div>

                    <div class="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-start gap-2">
                        <i class="ri-checkbox-circle-fill text-emerald-600 text-sm mt-0.5 shrink-0"></i>
                        <div>
                            Ketika Anda klik <b>Setujui (ACC)</b>, saldo simpanan sukarela anggota akan otomatis dipotong, angsuran tercatat <b>LUNAS</b>, dan jurnal akuntansi pemindahbukuan akan dibuat secara atomik.
                        </div>
                    </div>
                </div>
            `,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#059669',
            cancelButtonColor: '#6b7280',
            confirmButtonText: '<i class="ri-check-line mr-1"></i> Ya, Setujui (ACC)',
            cancelButtonText: 'Batal',
            customClass: { popup: 'swal-popup' }
        });

        if (!ok.isConfirmed) return;

        const res = await App.api('angsuran/pengajuan-approve', {
            method: 'POST',
            body: { pengajuan_id: id }
        });

        if (res?.success) {
            App.toast(res.message || 'Pengajuan pembayaran angsuran berhasil disetujui', 'success');
            App.checkNotifications();
            this.loadPengajuanTable(this._currentPengajuanStatus || 'pending');
            this.loadList(this.container, this.page);
        } else {
            App.toast(res?.message || 'Gagal menyetujui pengajuan', 'error');
        }
    },

    async rejectPengajuan(id) {
        const p = (this._pengajuanList || []).find(x => x.id == id);
        if (!p) {
            App.toast('Data pengajuan tidak ditemukan', 'error');
            return;
        }

        const { value: alasan } = await Swal.fire({
            title: 'Tolak Pengajuan Pembayaran?',
            html: `
                <div class="text-left text-xs text-gray-600 mb-2">
                    Tolak pengajuan <b>${p.no_pengajuan}</b> untuk anggota <b>${p.nama_anggota}</b> (${p.no_pinjaman} Angsuran ke-${p.angsuran_ke}):
                </div>
            `,
            input: 'textarea',
            inputPlaceholder: 'Tuliskan alasan penolakan untuk anggota (wajib diisi)...',
            showCancelButton: true,
            confirmButtonColor: '#e11d48',
            cancelButtonColor: '#6b7280',
            confirmButtonText: 'Tolak Pengajuan',
            cancelButtonText: 'Batal',
            inputValidator: (value) => {
                if (!value || !value.trim()) {
                    return 'Alasan penolakan wajib diisi!';
                }
            },
            customClass: { popup: 'swal-popup' }
        });

        if (!alasan) return;

        const res = await App.api('angsuran/pengajuan-reject', {
            method: 'POST',
            body: { pengajuan_id: id, alasan: alasan.trim() }
        });

        if (res?.success) {
            App.toast(res.message || 'Pengajuan telah ditolak', 'info');
            App.checkNotifications();
            this.loadPengajuanTable(this._currentPengajuanStatus || 'pending');
            this.loadList(this.container, this.page);
        } else {
            App.toast(res?.message || 'Gagal menolak pengajuan', 'error');
        }
    }
};
window.AngsuranPage = AngsuranPage;
export default AngsuranPage;
