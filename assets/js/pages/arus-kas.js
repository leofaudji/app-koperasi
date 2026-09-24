// ============================================================
// Laporan Arus Kas (Cash Flow Statement) - SAK EP / Koperasi
// ============================================================

const ArusKasPage = {
    data: null,
    dari: '',
    sampai: '',

    formatRupiah(num) {
        const val = Number(num) || 0;
        const sign = val < 0 ? '-' : '';
        return sign + 'Rp ' + Math.abs(val).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    },

    formatTanggal(dateStr) {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    },

    parseDateToISO(val) {
        if (!val) return '';
        const str = String(val).trim();
        const parts = str.split('-');
        if (parts.length !== 3) return str;
        if (parts[0].length === 4) return str; // already YYYY-MM-DD
        return `${parts[2]}-${parts[1]}-${parts[0]}`; // DD-MM-YYYY -> YYYY-MM-DD
    },

    activePreset: 'tahun_ini',

    updatePresetButtons() {
        document.querySelectorAll('[data-ak-preset]').forEach(btn => {
            const p = btn.getAttribute('data-ak-preset');
            if (p === this.activePreset) {
                btn.className = 'px-3 py-1.5 rounded-lg bg-white text-primary-700 font-semibold shadow-xs transition-all';
            } else {
                btn.className = 'px-3 py-1.5 rounded-lg hover:bg-white text-gray-600 transition-all';
            }
        });
    },

    async render(container) {
        App.setTitle('Laporan Arus Kas', 'Arus kas masuk & keluar berdasarkan SAK EP / Standar Koperasi');

        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');

        const defaultDariDMY = `01-01-${y}`;
        const defaultSampaiDMY = `${d}-${m}-${y}`;

        this.dari = `${y}-01-01`;
        this.sampai = `${y}-${m}-${d}`;
        this.activePreset = 'tahun_ini';

        container.innerHTML = `
        <div class="space-y-6 animate-fadeIn pb-12">
            <!-- Filter Bar -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <div class="flex flex-wrap items-end gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 mb-1.5">Dari Tanggal</label>
                            <input type="text" id="ak-dari" value="${defaultDariDMY}"
                                class="border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary-500 min-w-[140px]" placeholder="DD-MM-YYYY">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 mb-1.5">Sampai Tanggal</label>
                            <input type="text" id="ak-sampai" value="${defaultSampaiDMY}"
                                class="border border-gray-200 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-primary-500 min-w-[140px]" placeholder="DD-MM-YYYY">
                        </div>
                        <button onclick="ArusKasPage.load()"
                            class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
                            <i class="ri-refresh-line"></i> Tampilkan
                        </button>
                    </div>

                    <!-- Quick Preset & Export Buttons -->
                    <div class="flex flex-wrap items-center gap-2">
                        <div class="inline-flex rounded-xl bg-gray-100 p-1 text-xs font-medium" id="ak-preset-container">
                            <button data-ak-preset="bulan_ini" onclick="ArusKasPage.setPreset('bulan_ini')" class="px-3 py-1.5 rounded-lg hover:bg-white transition-all text-gray-600">Bulan Ini</button>
                            <button data-ak-preset="tahun_ini" onclick="ArusKasPage.setPreset('tahun_ini')" class="px-3 py-1.5 rounded-lg bg-white text-primary-700 font-semibold shadow-xs">Tahun Ini</button>
                            <button data-ak-preset="tahun_lalu" onclick="ArusKasPage.setPreset('tahun_lalu')" class="px-3 py-1.5 rounded-lg hover:bg-white transition-all text-gray-600">Tahun Lalu</button>
                        </div>
                        <button onclick="ArusKasPage.exportPDF()"
                            class="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all" title="Download / Cetak PDF">
                            <i class="ri-file-pdf-line text-base"></i> Cetak PDF
                        </button>
                        <button onclick="ArusKasPage.exportExcel()"
                            class="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all" title="Ekspor ke Excel (CSV)">
                            <i class="ri-file-excel-line text-base"></i> Ekspor Excel
                        </button>
                        <button onclick="window.print()"
                            class="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors" title="Print Halaman">
                            <i class="ri-printer-line text-lg"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Content Area -->
            <div id="ak-content">
                <div class="flex items-center justify-center h-48 bg-white rounded-2xl border border-gray-100">
                    <div class="flex flex-col items-center gap-3">
                        <div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
                        <p class="text-sm text-gray-400 font-medium">Memuat data arus kas...</p>
                    </div>
                </div>
            </div>
        </div>`;

        // Initialize flatpickr on date inputs
        if (typeof App.initDatepicker === 'function') {
            App.initDatepicker('#ak-dari', {
                defaultDate: defaultDariDMY,
                onChange: () => {
                    ArusKasPage.activePreset = null;
                    ArusKasPage.updatePresetButtons();
                }
            });
            App.initDatepicker('#ak-sampai', {
                defaultDate: defaultSampaiDMY,
                onChange: () => {
                    ArusKasPage.activePreset = null;
                    ArusKasPage.updatePresetButtons();
                }
            });
        }

        // Add manual input change listeners to clear preset highlight if user types a custom date
        document.getElementById('ak-dari')?.addEventListener('input', () => {
            this.activePreset = null;
            this.updatePresetButtons();
        });
        document.getElementById('ak-sampai')?.addEventListener('input', () => {
            this.activePreset = null;
            this.updatePresetButtons();
        });

        this.updatePresetButtons();
        await this.load();
    },

    setPreset(preset) {
        this.activePreset = preset;
        this.updatePresetButtons();

        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const lastDay = new Date(y, now.getMonth() + 1, 0).getDate();
        let dariDMY = '', sampaiDMY = '';

        if (preset === 'bulan_ini') {
            dariDMY = `01-${m}-${y}`;
            sampaiDMY = `${String(lastDay).padStart(2, '0')}-${m}-${y}`;
        } else if (preset === 'tahun_ini') {
            dariDMY = `01-01-${y}`;
            sampaiDMY = `31-12-${y}`;
        } else if (preset === 'tahun_lalu') {
            dariDMY = `01-01-${y - 1}`;
            sampaiDMY = `31-12-${y - 1}`;
        }

        const dariEl = document.getElementById('ak-dari');
        const sampaiEl = document.getElementById('ak-sampai');

        if (dariEl?._flatpickr) dariEl._flatpickr.setDate(dariDMY);
        else if (dariEl) dariEl.value = dariDMY;

        if (sampaiEl?._flatpickr) sampaiEl._flatpickr.setDate(sampaiDMY);
        else if (sampaiEl) sampaiEl.value = sampaiDMY;

        this.load();
    },

    async load() {
        const rawDari = document.getElementById('ak-dari')?.value || this.dari;
        const rawSampai = document.getElementById('ak-sampai')?.value || this.sampai;

        this.dari = this.parseDateToISO(rawDari);
        this.sampai = this.parseDateToISO(rawSampai);

        const content = document.getElementById('ak-content');
        if (!content) return;

        content.innerHTML = `
        <div class="flex items-center justify-center h-48 bg-white rounded-2xl border border-gray-100">
            <div class="flex flex-col items-center gap-3">
                <div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
                <p class="text-sm text-gray-400 font-medium">Menghitung arus kas...</p>
            </div>
        </div>`;

        const res = await App.api(`keuangan/arus-kas?dari=${this.dari}&sampai=${this.sampai}`);
        if (!res?.success) {
            content.innerHTML = `
            <div class="bg-white rounded-2xl border border-red-100 p-8 text-center text-gray-500">
                <i class="ri-error-warning-line text-4xl text-rose-500"></i>
                <p class="mt-2 font-semibold text-gray-700">Gagal memuat Laporan Arus Kas</p>
                <p class="text-xs text-gray-400 mt-1">${res?.message || 'Terjadi kesalahan pada server'}</p>
            </div>`;
            return;
        }

        this.data = res.data;
        this.renderReport(content);
    },

    renderReport(content) {
        const d = this.data;
        const op = d.operasi;
        const inv = d.investasi;
        const pend = d.pendanaan;

        const totalKasMasuk = (op.masuk.total || 0) + (inv.masuk.total || 0) + (pend.masuk.total || 0);
        const totalKasKeluar = (op.keluar.total || 0) + (inv.keluar.total || 0) + (pend.keluar.total || 0);

        const isBalance = d.is_balance;
        const statusPill = isBalance ? `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <i class="ri-checkbox-circle-fill text-emerald-600"></i> Rekonsiliasi Tervalidasi (Balance)
            </span>
        ` : `
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                <i class="ri-alert-line text-amber-600"></i> Selisih: ${this.formatRupiah(d.selisih)}
            </span>
        `;

        content.innerHTML = `
        <div id="print-area" class="space-y-6">
            <!-- Kop Surat Khusus Print Browser -->
            <div class="hidden print:block text-center border-b pb-4 mb-4">
                <h1 class="text-xl font-bold uppercase tracking-wider text-gray-900">${App.settings?.app_name?.value || 'KOPERASI SIMPAN PINJAM'}</h1>
                <p class="text-xs text-gray-500">${App.settings?.alamat?.value || ''} | Telp: ${App.settings?.telepon?.value || ''}</p>
                <h2 class="text-base font-bold text-gray-800 mt-2">LAPORAN ARUS KAS (CASH FLOW)</h2>
                <p class="text-xs text-gray-600">Periode: ${this.formatTanggal(d.periode.dari)} s/d ${this.formatTanggal(d.periode.sampai)}</p>
            </div>

            <!-- Top Summary Cards (KPIs) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Saldo Kas Awal</span>
                        <div class="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-base"><i class="ri-wallet-3-line"></i></div>
                    </div>
                    <p class="text-xl font-bold text-gray-800 mt-2 font-mono">${this.formatRupiah(d.saldo_awal)}</p>
                    <p class="text-[11px] text-gray-400 mt-1">Per ${this.formatTanggal(d.periode.dari)}</p>
                </div>

                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Kas Masuk</span>
                        <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base"><i class="ri-arrow-down-circle-line"></i></div>
                    </div>
                    <p class="text-xl font-bold text-emerald-600 mt-2 font-mono">${this.formatRupiah(totalKasMasuk)}</p>
                    <p class="text-[11px] text-emerald-500 mt-1 flex items-center gap-1"><i class="ri-arrow-up-line"></i> Penerimaan periode ini</p>
                </div>

                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Kas Keluar</span>
                        <div class="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base"><i class="ri-arrow-up-circle-line"></i></div>
                    </div>
                    <p class="text-xl font-bold text-rose-600 mt-2 font-mono">${this.formatRupiah(totalKasKeluar)}</p>
                    <p class="text-[11px] text-rose-500 mt-1 flex items-center gap-1"><i class="ri-arrow-down-line"></i> Pengeluaran periode ini</p>
                </div>

                <div class="bg-gradient-to-br from-primary-600 to-primary-800 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-primary-200 uppercase tracking-wider">Saldo Kas Akhir</span>
                        <div class="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center text-base"><i class="ri-safe-2-line"></i></div>
                    </div>
                    <p class="text-xl font-bold text-white mt-2 font-mono">${this.formatRupiah(d.saldo_akhir_perhitungan)}</p>
                    <div class="mt-1 flex items-center gap-2">
                        <span class="text-[11px] text-primary-100 font-medium">Per ${this.formatTanggal(d.periode.sampai)}</span>
                    </div>
                </div>
            </div>

            <!-- Status Banner Rekonsiliasi -->
            <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl ${isBalance ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'} flex items-center justify-center text-xl shrink-0">
                        <i class="${isBalance ? 'ri-shield-check-line' : 'ri-alert-line'}"></i>
                    </div>
                    <div>
                        <p class="text-sm font-semibold text-gray-800">Status Validasi Kas dengan Buku Besar & Neraca</p>
                        <p class="text-xs text-gray-500">Saldo perhitungan mutasi kas sinkron dengan akun kas buku besar per tanggal ${this.formatTanggal(d.periode.sampai)}</p>
                    </div>
                </div>
                <div>${statusPill}</div>
            </div>

            <!-- Detailed Cash Flow Statement Table -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <i class="ri-file-list-3-line text-primary-600"></i> Rincian 3 Aktivitas Arus Kas (SAK EP)
                    </h3>
                    <span class="text-xs text-gray-500 font-medium">Satuan Rupiah (IDR)</span>
                </div>

                <div class="p-6 space-y-8">
                    <!-- 1. AKTIVITAS OPERASI -->
                    <div class="space-y-3">
                        <div class="flex items-center justify-between border-b-2 border-primary-500 pb-2">
                            <h4 class="font-bold text-gray-900 text-sm tracking-wide">1. ARUS KAS DARI AKTIVITAS OPERASI</h4>
                            <span class="font-mono font-bold text-sm ${op.bersih >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${this.formatRupiah(op.bersih)}</span>
                        </div>
                        <div class="space-y-1.5 text-xs text-gray-700 pl-4">
                            <div class="font-semibold text-gray-500 pt-1">Arus Kas Masuk:</div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Penerimaan Angsuran Pokok Pinjaman Anggota</span>
                                <span class="font-mono font-medium">${this.formatRupiah(op.masuk.angsuran_pokok)}</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Penerimaan Jasa / Bunga Pinjaman Anggota</span>
                                <span class="font-mono font-medium">${this.formatRupiah(op.masuk.jasa_pinjaman)}</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Penerimaan Biaya Provisi & Administrasi Pencairan Pinjaman</span>
                                <span class="font-mono font-medium">${this.formatRupiah(op.masuk.provisi_administrasi)}</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Penerimaan Pendapatan Operasional Lainnya</span>
                                <span class="font-mono font-medium">${this.formatRupiah(op.masuk.pendapatan_lain)}</span>
                            </div>
                            <div class="flex justify-between py-1 text-primary-700 font-semibold bg-primary-50/40 px-2 rounded">
                                <span>Subtotal Kas Masuk Operasi</span>
                                <span class="font-mono">${this.formatRupiah(op.masuk.total)}</span>
                            </div>

                            <div class="font-semibold text-gray-500 pt-3">Arus Kas Keluar:</div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Pencairan Pinjaman Baru kepada Anggota</span>
                                <span class="font-mono font-medium text-rose-600">(${this.formatRupiah(op.keluar.pencairan_pinjaman)})</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Beban Operasional & Umum (Listrik, Gaji, ATK, Transport, dll.)</span>
                                <span class="font-mono font-medium text-rose-600">(${this.formatRupiah(op.keluar.beban_operasional)})</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Beban Bunga Simpanan Sukarela / Berjangka Anggota</span>
                                <span class="font-mono font-medium text-rose-600">(${this.formatRupiah(op.keluar.beban_bunga_simpanan)})</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Beban Organisasi & Penyelenggaraan RAT</span>
                                <span class="font-mono font-medium text-rose-600">(${this.formatRupiah(op.keluar.beban_organisasi_rat)})</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Beban Pajak Penghasilan (PPh)</span>
                                <span class="font-mono font-medium text-rose-600">(${this.formatRupiah(op.keluar.pajak)})</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Beban Non-Operasional & Pengeluaran Kas Lainnya</span>
                                <span class="font-mono font-medium text-rose-600">(${this.formatRupiah(op.keluar.beban_lain)})</span>
                            </div>
                            <div class="flex justify-between py-1 text-rose-700 font-semibold bg-rose-50/40 px-2 rounded">
                                <span>Subtotal Kas Keluar Operasi</span>
                                <span class="font-mono">(${this.formatRupiah(op.keluar.total)})</span>
                            </div>
                        </div>
                    </div>

                    <!-- 2. AKTIVITAS INVESTASI -->
                    <div class="space-y-3">
                        <div class="flex items-center justify-between border-b-2 border-primary-500 pb-2">
                            <h4 class="font-bold text-gray-900 text-sm tracking-wide">2. ARUS KAS DARI AKTIVITAS INVESTASI</h4>
                            <span class="font-mono font-bold text-sm ${inv.bersih >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${this.formatRupiah(inv.bersih)}</span>
                        </div>
                        <div class="space-y-1.5 text-xs text-gray-700 pl-4">
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Pelepasan / Penjualan Aktiva Tetap</span>
                                <span class="font-mono font-medium">${this.formatRupiah(inv.masuk.pelepasan_aktiva_tetap)}</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Pencairan Penyertaan Modal Jangka Panjang</span>
                                <span class="font-mono font-medium">${this.formatRupiah(inv.masuk.pencairan_penyertaan)}</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Pengadaan / Pembelian Aktiva Tetap Baru</span>
                                <span class="font-mono font-medium text-rose-600">(${this.formatRupiah(inv.keluar.pengadaan_aktiva_tetap)})</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Penempatan Penyertaan Modal Baru pada Entitas Lain</span>
                                <span class="font-mono font-medium text-rose-600">(${this.formatRupiah(inv.keluar.penempatan_penyertaan)})</span>
                            </div>
                        </div>
                    </div>

                    <!-- 3. AKTIVITAS PENDANAAN -->
                    <div class="space-y-3">
                        <div class="flex items-center justify-between border-b-2 border-primary-500 pb-2">
                            <h4 class="font-bold text-gray-900 text-sm tracking-wide">3. ARUS KAS DARI AKTIVITAS PENDANAAN</h4>
                            <span class="font-mono font-bold text-sm ${pend.bersih >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${this.formatRupiah(pend.bersih)}</span>
                        </div>
                        <div class="space-y-1.5 text-xs text-gray-700 pl-4">
                            <div class="font-semibold text-gray-500 pt-1">Arus Kas Masuk:</div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Penerimaan Simpanan Pokok & Wajib Anggota</span>
                                <span class="font-mono font-medium">${this.formatRupiah(pend.masuk.simpanan_pokok_wajib)}</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Penerimaan Simpanan Sukarela / Tabungan Anggota</span>
                                <span class="font-mono font-medium">${this.formatRupiah(pend.masuk.simpanan_sukarela)}</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Penerimaan Pinjaman Modal Luar (Bank / LPDB)</span>
                                <span class="font-mono font-medium">${this.formatRupiah(pend.masuk.pinjaman_luar)}</span>
                            </div>

                            <div class="font-semibold text-gray-500 pt-3">Arus Kas Keluar:</div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Pengembalian Simpanan Pokok & Wajib (Anggota Keluar)</span>
                                <span class="font-mono font-medium text-rose-600">(${this.formatRupiah(pend.keluar.pengembalian_pokok_wajib)})</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Penarikan Simpanan Sukarela / Tabungan Anggota</span>
                                <span class="font-mono font-medium text-rose-600">(${this.formatRupiah(pend.keluar.penarikan_simpanan_sukarela)})</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Pembayaran Cicilan Pokok Pinjaman Modal Luar</span>
                                <span class="font-mono font-medium text-rose-600">(${this.formatRupiah(pend.keluar.pembayaran_pinjaman_luar)})</span>
                            </div>
                            <div class="flex justify-between py-1 border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded">
                                <span>Pembagian SHU Bagian Anggota (Tahun Lalu)</span>
                                <span class="font-mono font-medium text-rose-600">(${this.formatRupiah(pend.keluar.pembagian_shu)})</span>
                            </div>
                        </div>
                    </div>

                    <!-- RINGKASAN KENAIKAN / PENURUNAN KAS -->
                    <div class="bg-gray-50 rounded-2xl p-4 border border-gray-200 space-y-2 text-xs">
                        <div class="flex justify-between items-center font-bold text-gray-900 text-sm">
                            <span>KENAIKAN (PENURUNAN) BERSIH KAS & SETARA KAS</span>
                            <span class="font-mono ${d.kenaikan_bersih >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                                ${this.formatRupiah(d.kenaikan_bersih)}
                            </span>
                        </div>
                        <div class="flex justify-between items-center text-gray-600 pt-1 border-t border-gray-200">
                            <span>Saldo Kas & Setara Kas pada Awal Periode</span>
                            <span class="font-mono font-semibold">${this.formatRupiah(d.saldo_awal)}</span>
                        </div>
                        <div class="flex justify-between items-center font-bold text-primary-900 text-sm pt-1 border-t border-gray-200">
                            <span>SALDO KAS & SETARA KAS PADA AKHIR PERIODE (PERHITUNGAN)</span>
                            <span class="font-mono text-base">${this.formatRupiah(d.saldo_akhir_perhitungan)}</span>
                        </div>
                        <div class="flex justify-between items-center text-gray-500 pt-1">
                            <span>Saldo Kas & Bank Fisik Buku Besar (Aktual)</span>
                            <span class="font-mono font-semibold text-gray-700">${this.formatRupiah(d.saldo_akhir_aktual)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detail Rekening Kas & Bank -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h4 class="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                        <i class="ri-wallet-line text-emerald-600"></i> Rincian Akun Kas & Bank (Buku Besar Per ${this.formatTanggal(d.periode.sampai)})
                    </h4>
                    <span class="text-xs font-bold font-mono text-primary-600">${this.formatRupiah(d.saldo_akhir_aktual)}</span>
                </div>
                <div class="p-4 overflow-x-auto">
                    <table class="w-full text-xs">
                        <thead>
                            <tr class="text-left text-gray-400 border-b border-gray-100 font-semibold">
                                <th class="py-2 px-3">Kode Akun</th>
                                <th class="py-2 px-3">Nama Rekening / Akun Kas</th>
                                <th class="py-2 px-3 text-right">Saldo Aktual</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 text-gray-700">
                            ${(d.rincian_kas || []).map(r => `
                                <tr class="hover:bg-gray-50/50">
                                    <td class="py-2 px-3 font-mono text-gray-500">${r.kode}</td>
                                    <td class="py-2 px-3 font-medium">${r.nama}</td>
                                    <td class="py-2 px-3 text-right font-mono font-semibold ${r.saldo < 0 ? 'text-rose-600' : 'text-gray-900'}">${this.formatRupiah(r.saldo)}</td>
                                </tr>
                            `).join('')}
                            <tr class="bg-gray-50 font-bold text-gray-900">
                                <td colspan="2" class="py-2.5 px-3 text-right uppercase">Total Saldo Kas & Bank di Neraca</td>
                                <td class="py-2.5 px-3 text-right font-mono text-primary-700">${this.formatRupiah(d.saldo_akhir_aktual)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Tanda Tangan Pengurus Khusus Print Browser -->
            <div class="hidden print:grid grid-cols-2 text-center text-xs mt-12 pt-8 border-t">
                <div>
                    <p class="mb-16">Mengetahui,<br><strong>Ketua Koperasi</strong></p>
                    <p class="font-bold underline">${App.settings?.ketua_koperasi?.value || 'Ketua Koperasi'}</p>
                </div>
                <div>
                    <p class="mb-16">Dibuat Oleh,<br><strong>Bendahara / Bagian Keuangan</strong></p>
                    <p class="font-bold underline">${App.user?.nama_lengkap || 'Bendahara'}</p>
                </div>
            </div>
        </div>`;
    },

    exportPDF() {
        if (!this.data) {
            App.toast('Data laporan belum tersedia', 'warning');
            return;
        }
        const d = this.data;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pw = doc.internal.pageSize.getWidth();

        const title = 'LAPORAN ARUS KAS (CASH FLOW)';
        App.drawPDFHeader(doc, title);
        App.drawPDFFooter(doc);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Periode: ${App.formatDate(d.periode.dari)} s/d ${App.formatDate(d.periode.sampai)}  |  Standar: SAK EP / Koperasi`, 14, 44);

        const op = d.operasi;
        const inv = d.investasi;
        const pend = d.pendanaan;
        const totalMasuk = (op.masuk.total || 0) + (inv.masuk.total || 0) + (pend.masuk.total || 0);
        const totalKeluar = (op.keluar.total || 0) + (inv.keluar.total || 0) + (pend.keluar.total || 0);

        const cards = [
            { label: 'Saldo Kas Awal', value: App.formatRupiah(d.saldo_awal) },
            { label: 'Total Kas Masuk', value: App.formatRupiah(totalMasuk) },
            { label: 'Total Kas Keluar', value: App.formatRupiah(totalKeluar) },
            { label: 'Kenaikan Bersih', value: App.formatRupiah(d.kenaikan_bersih) }
        ];
        const curY = App.drawPDFSummaryCards(doc, cards, 48);

        const tableBody = [];

        // 1. Aktivitas Operasi
        tableBody.push([{ content: 'I. ARUS KAS DARI AKTIVITAS OPERASI', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }]);
        tableBody.push(['   Penerimaan Angsuran Pokok Pinjaman Anggota', App.formatRupiah(op.masuk.angsuran_pokok)]);
        tableBody.push(['   Penerimaan Jasa / Bunga Pinjaman Anggota', App.formatRupiah(op.masuk.jasa_pinjaman)]);
        tableBody.push(['   Penerimaan Biaya Provisi & Administrasi Pencairan Pinjaman', App.formatRupiah(op.masuk.provisi_administrasi)]);
        tableBody.push(['   Penerimaan Pendapatan Operasional Lainnya', App.formatRupiah(op.masuk.pendapatan_lain)]);
        tableBody.push(['   (Pencairan Pinjaman Baru kepada Anggota)', `(${App.formatRupiah(op.keluar.pencairan_pinjaman)})`]);
        tableBody.push(['   (Beban Operasional & Umum: Gaji, Listrik, ATK, dll.)', `(${App.formatRupiah(op.keluar.beban_operasional)})`]);
        tableBody.push(['   (Beban Bunga Simpanan Sukarela / Berjangka)', `(${App.formatRupiah(op.keluar.beban_bunga_simpanan)})`]);
        tableBody.push(['   (Beban Organisasi & Penyelenggaraan RAT)', `(${App.formatRupiah(op.keluar.beban_organisasi_rat)})`]);
        tableBody.push(['   (Beban Pajak Penghasilan / PPh)', `(${App.formatRupiah(op.keluar.pajak)})`]);
        tableBody.push(['   (Beban Non-Operasional & Pengeluaran Kas Lainnya)', `(${App.formatRupiah(op.keluar.beban_lain)})`]);
        tableBody.push([{ content: 'Arus Kas Bersih dari Aktivitas Operasi', styles: { fontStyle: 'bold' } }, { content: App.formatRupiah(op.bersih), styles: { fontStyle: 'bold', halign: 'right' } }]);

        // 2. Aktivitas Investasi
        tableBody.push([{ content: 'II. ARUS KAS DARI AKTIVITAS INVESTASI', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }]);
        tableBody.push(['   Pelepasan / Penjualan Aktiva Tetap', App.formatRupiah(inv.masuk.pelepasan_aktiva_tetap)]);
        tableBody.push(['   Pencairan Penyertaan Modal Jangka Panjang', App.formatRupiah(inv.masuk.pencairan_penyertaan)]);
        tableBody.push(['   (Pengadaan / Pembelian Aktiva Tetap)', `(${App.formatRupiah(inv.keluar.pengadaan_aktiva_tetap)})`]);
        tableBody.push(['   (Penempatan Penyertaan Modal Baru)', `(${App.formatRupiah(inv.keluar.penempatan_penyertaan)})`]);
        tableBody.push([{ content: 'Arus Kas Bersih dari Aktivitas Investasi', styles: { fontStyle: 'bold' } }, { content: App.formatRupiah(inv.bersih), styles: { fontStyle: 'bold', halign: 'right' } }]);

        // 3. Aktivitas Pendanaan
        tableBody.push([{ content: 'III. ARUS KAS DARI AKTIVITAS PENDANAAN', colSpan: 2, styles: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } }]);
        tableBody.push(['   Penerimaan Simpanan Pokok & Wajib Anggota', App.formatRupiah(pend.masuk.simpanan_pokok_wajib)]);
        tableBody.push(['   Penerimaan Simpanan Sukarela / Tabungan Anggota', App.formatRupiah(pend.masuk.simpanan_sukarela)]);
        tableBody.push(['   Penerimaan Pinjaman Modal Luar (Bank / LPDB)', App.formatRupiah(pend.masuk.pinjaman_luar)]);
        tableBody.push(['   (Pengembalian Simpanan Pokok & Wajib Anggota Keluar)', `(${App.formatRupiah(pend.keluar.pengembalian_pokok_wajib)})`]);
        tableBody.push(['   (Penarikan Simpanan Sukarela / Tabungan Anggota)', `(${App.formatRupiah(pend.keluar.penarikan_simpanan_sukarela)})`]);
        tableBody.push(['   (Pembayaran Cicilan Pokok Pinjaman Modal Luar)', `(${App.formatRupiah(pend.keluar.pembayaran_pinjaman_luar)})`]);
        tableBody.push(['   (Pembagian SHU Bagian Anggota)', `(${App.formatRupiah(pend.keluar.pembagian_shu)})`]);
        tableBody.push([{ content: 'Arus Kas Bersih dari Aktivitas Pendanaan', styles: { fontStyle: 'bold' } }, { content: App.formatRupiah(pend.bersih), styles: { fontStyle: 'bold', halign: 'right' } }]);

        // Ringkasan & Rekonsiliasi
        tableBody.push([{ content: 'KENAIKAN (PENURUNAN) BERSIH KAS & SETARA KAS', styles: { fontStyle: 'bold', fillColor: [238, 242, 255] } }, { content: App.formatRupiah(d.kenaikan_bersih), styles: { fontStyle: 'bold', halign: 'right', fillColor: [238, 242, 255] } }]);
        tableBody.push(['SALDO KAS & SETARA KAS AWAL PERIODE', App.formatRupiah(d.saldo_awal)]);
        tableBody.push([{ content: 'SALDO KAS & SETARA KAS AKHIR PERIODE (PERHITUNGAN)', styles: { fontStyle: 'bold' } }, { content: App.formatRupiah(d.saldo_akhir_perhitungan), styles: { fontStyle: 'bold', halign: 'right' } }]);
        tableBody.push(['SALDO KAS & BANK FISIK BUKU BESAR (AKTUAL)', App.formatRupiah(d.saldo_akhir_aktual)]);
        tableBody.push([{ content: 'STATUS REKONSILIASI: ' + (d.is_balance ? 'SEIMBANG / BALANCE (SELISIH RP 0)' : `SELISIH: ${App.formatRupiah(d.selisih)}`), colSpan: 2, styles: { fontStyle: 'bold', halign: 'center', fillColor: d.is_balance ? [220, 252, 231] : [254, 226, 226], textColor: d.is_balance ? [21, 128, 61] : [185, 28, 28] } }]);

        doc.autoTable({
            startY: curY + 2,
            head: [['Uraian Mutasi Kas', 'Jumlah (Rp)']],
            body: tableBody,
            theme: 'plain',
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
            bodyStyles: { fontSize: 7.5, cellPadding: 2.2, textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: 0.1 },
            columnStyles: {
                0: { cellWidth: pw - 28 - 45 },
                1: { cellWidth: 45, halign: 'right' }
            },
            margin: { left: 14, right: 14, top: 46, bottom: 20 },
            didDrawPage: () => {
                App.drawPDFHeader(doc, title);
                App.drawPDFFooter(doc);
            }
        });

        window.open(doc.output('bloburl'), '_blank');
    },

    exportExcel() {
        if (!this.data) {
            App.toast('Data laporan belum tersedia', 'warning');
            return;
        }
        const d = this.data;
        const op = d.operasi;
        const inv = d.investasi;
        const pend = d.pendanaan;
        const namaKop = App.settings?.nama_koperasi?.value || App.settings?.app_name?.value || 'KOPERASI';

        let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
        csv += `LAPORAN ARUS KAS\r\n`;
        csv += `"${namaKop}"\r\n`;
        csv += `Periode: ${d.periode.dari} s/d ${d.periode.sampai}\r\n`;
        csv += `Tanggal Unduh: ${new Date().toLocaleString('id-ID')}\r\n\r\n`;

        csv += "Uraian Aktivitas Kas,Penerimaan (Rp),Pengeluaran (Rp),Jumlah Bersih (Rp)\r\n";

        csv += "I. AKTIVITAS OPERASI,,,\r\n";
        csv += `"Penerimaan Angsuran Pokok Pinjaman",${op.masuk.angsuran_pokok},,\r\n`;
        csv += `"Penerimaan Jasa / Bunga Pinjaman",${op.masuk.jasa_pinjaman},,\r\n`;
        csv += `"Penerimaan Biaya Provisi & Administrasi",${op.masuk.provisi_administrasi},,\r\n`;
        csv += `"Penerimaan Pendapatan Operasional Lainnya",${op.masuk.pendapatan_lain},,\r\n`;
        csv += `"Pencairan Pinjaman Baru kepada Anggota",,${op.keluar.pencairan_pinjaman},\r\n`;
        csv += `"Beban Operasional & Umum",,${op.keluar.beban_operasional},\r\n`;
        csv += `"Beban Bunga Simpanan Sukarela / Berjangka",,${op.keluar.beban_bunga_simpanan},\r\n`;
        csv += `"Beban Organisasi & RAT",,${op.keluar.beban_organisasi_rat},\r\n`;
        csv += `"Beban Pajak Penghasilan",,${op.keluar.pajak},\r\n`;
        csv += `"Beban Lain-lain",,${op.keluar.beban_lain},\r\n`;
        csv += `"Total Arus Kas Bersih Operasi",,,${op.bersih}\r\n\r\n`;

        csv += "II. AKTIVITAS INVESTASI,,,\r\n";
        csv += `"Pelepasan / Penjualan Aktiva Tetap",${inv.masuk.pelepasan_aktiva_tetap},,\r\n`;
        csv += `"Pencairan Penyertaan Modal",${inv.masuk.pencairan_penyertaan},,\r\n`;
        csv += `"Pengadaan / Pembelian Aktiva Tetap",,${inv.keluar.pengadaan_aktiva_tetap},\r\n`;
        csv += `"Penempatan Penyertaan Modal Baru",,${inv.keluar.penempatan_penyertaan},\r\n`;
        csv += `"Total Arus Kas Bersih Investasi",,,${inv.bersih}\r\n\r\n`;

        csv += "III. AKTIVITAS PENDANAAN,,,\r\n";
        csv += `"Penerimaan Simpanan Pokok & Wajib",${pend.masuk.simpanan_pokok_wajib},,\r\n`;
        csv += `"Penerimaan Simpanan Sukarela / Tabungan",${pend.masuk.simpanan_sukarela},,\r\n`;
        csv += `"Penerimaan Pinjaman Modal Luar",${pend.masuk.pinjaman_luar},,\r\n`;
        csv += `"Pengembalian Simpanan Pokok & Wajib",,${pend.keluar.pengembalian_pokok_wajib},\r\n`;
        csv += `"Penarikan Simpanan Sukarela / Tabungan",,${pend.keluar.penarikan_simpanan_sukarela},\r\n`;
        csv += `"Pembayaran Cicilan Pinjaman Luar",,${pend.keluar.pembayaran_pinjaman_luar},\r\n`;
        csv += `"Pembagian SHU Bagian Anggota",,${pend.keluar.pembagian_shu},\r\n`;
        csv += `"Total Arus Kas Bersih Pendanaan",,,${pend.bersih}\r\n\r\n`;

        csv += `"KENAIKAN (PENURUNAN) BERSIH KAS",,,${d.kenaikan_bersih}\r\n`;
        csv += `"SALDO KAS & SETARA KAS AWAL",,,${d.saldo_awal}\r\n`;
        csv += `"SALDO KAS & SETARA KAS AKHIR (PERHITUNGAN)",,,${d.saldo_akhir_perhitungan}\r\n`;
        csv += `"SALDO KAS & SETARA KAS AKHIR (BUKU BESAR)",,,${d.saldo_akhir_aktual}\r\n`;
        csv += `"SELISIH REKONSILIASI",,,${d.selisih}\r\n`;
        csv += `"STATUS KESEIMBANGAN",,,"${d.is_balance ? 'SEIMBANG / BALANCE' : 'SELISIH'}"\r\n\r\n`;

        csv += "RINCIAN AKUN KAS & BANK,Kode Akun,,Saldo Akhir (Rp)\r\n";
        (d.rincian_kas || []).forEach(r => {
            csv += `"${r.nama}","${r.kode}",,${r.saldo}\r\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Laporan_Arus_Kas_${d.periode.dari}_sd_${d.periode.sampai}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // Aliases for compatibility
    cetakPDF() { this.exportPDF(); },
    export(type) {
        if (type === 'pdf') this.exportPDF();
        else this.exportExcel();
    }
};

window.ArusKasPage = ArusKasPage;
export default ArusKasPage;
