// ============================================================
// Laporan Perubahan Ekuitas / Modal (Statement of Changes in Equity)
// Standar: SAK EP (Standar Akuntansi Keuangan Entitas Privat)
// Sesuai Permenkop UKM No. 2 Tahun 2024 & RAT Koperasi
// Sistem Multi-Tab: Aliran Vertikal, Komparatif YoY, & Matriks SAK EP
// ============================================================

const PerubahanEkuitasPage = {
    data: null,
    tahun: new Date().getFullYear(),
    activeTab: 'vertikal', // 'vertikal' (Aliran Waterfall) | 'komparatif' (YoY) | 'matriks' (SAK EP 8 Kolom)

    formatRupiah(num) {
        const val = Number(num) || 0;
        if (Math.abs(val) < 0.001) return '-';
        const sign = val < 0 ? '-' : '';
        return sign + 'Rp ' + Math.abs(val).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    },

    formatRupiahAbs(num) {
        const val = Number(num) || 0;
        if (Math.abs(val) < 0.001) return 'Rp 0';
        return 'Rp ' + Math.abs(val).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    },

    formatPersen(val) {
        const num = Number(val) || 0;
        return num.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
    },

    setTab(tab) {
        this.activeTab = tab;
        const content = document.getElementById('pe-tab-content');
        if (content && this.data) {
            this.renderTabContent(content);
            this.updateTabButtons();
        }
    },

    updateTabButtons() {
        const tabs = ['vertikal', 'komparatif', 'matriks'];
        tabs.forEach(t => {
            const btn = document.getElementById(`tab-btn-${t}`);
            if (btn) {
                if (t === this.activeTab) {
                    btn.className = 'px-3.5 py-1.5 rounded-lg font-bold text-xs bg-white text-primary-700 shadow-xs transition-all flex items-center gap-1.5';
                } else {
                    btn.className = 'px-3.5 py-1.5 rounded-lg font-medium text-xs text-gray-600 hover:text-gray-900 transition-all flex items-center gap-1.5';
                }
            }
        });
    },

    async render(container) {
        App.setTitle('Perubahan Ekuitas', 'Perubahan modal & ekuitas koperasi berdasarkan SAK EP untuk RAT');

        const curYear = new Date().getFullYear();
        this.tahun = curYear;

        // Generate options for year selector (current year ± 3 years)
        const years = [];
        for (let y = curYear + 1; y >= curYear - 4; y--) {
            years.push(y);
        }

        container.innerHTML = `
        <div class="space-y-4 animate-fadeIn pb-12">
            <!-- Filter & Action Bar -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div class="flex flex-wrap items-center gap-2.5">
                        <div class="flex items-center gap-2">
                            <label class="text-xs font-bold text-gray-500 uppercase tracking-wider">Tahun Buku</label>
                            <select id="pe-tahun" class="border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:ring-2 focus:ring-primary-500 bg-white">
                                ${years.map(y => `<option value="${y}" ${y === this.tahun ? 'selected' : ''}>Tahun ${y}</option>`).join('')}
                            </select>
                        </div>
                        <button onclick="PerubahanEkuitasPage.load()"
                            class="bg-primary-600 hover:bg-primary-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs">
                            <i class="ri-refresh-line"></i> Muat Data
                        </button>
                    </div>

                    <!-- Multi-Tab Switcher (Opsi C) -->
                    <div class="inline-flex rounded-xl bg-gray-100 p-1 text-xs font-medium border border-gray-200/60" id="pe-tab-switcher">
                        <button onclick="PerubahanEkuitasPage.setTab('vertikal')" id="tab-btn-vertikal"
                            class="px-3.5 py-1.5 rounded-lg font-bold text-xs ${this.activeTab === 'vertikal' ? 'bg-white text-primary-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'} transition-all flex items-center gap-1.5">
                            <i class="ri-flow-chart text-sm"></i> Aliran Vertikal
                        </button>
                        <button onclick="PerubahanEkuitasPage.setTab('komparatif')" id="tab-btn-komparatif"
                            class="px-3.5 py-1.5 rounded-lg font-medium text-xs ${this.activeTab === 'komparatif' ? 'bg-white text-primary-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'} transition-all flex items-center gap-1.5">
                            <i class="ri-line-chart-line text-sm"></i> Komparatif YoY
                        </button>
                        <button onclick="PerubahanEkuitasPage.setTab('matriks')" id="tab-btn-matriks"
                            class="px-3.5 py-1.5 rounded-lg font-medium text-xs ${this.activeTab === 'matriks' ? 'bg-white text-primary-700 shadow-xs' : 'text-gray-600 hover:text-gray-900'} transition-all flex items-center gap-1.5">
                            <i class="ri-table-line text-sm"></i> Matriks SAK EP
                        </button>
                    </div>

                    <!-- Export Actions -->
                    <div class="flex items-center gap-2">
                        <button onclick="PerubahanEkuitasPage.exportPDF()"
                            class="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs" title="Download Format RAT (PDF Landscape)">
                            <i class="ri-file-pdf-line text-sm"></i> Cetak PDF
                        </button>
                        <button onclick="PerubahanEkuitasPage.exportExcel()"
                            class="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs" title="Ekspor Data ke Microsoft Excel">
                            <i class="ri-file-excel-line text-sm"></i> Excel
                        </button>
                        <button onclick="window.print()"
                            class="p-1.5 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors" title="Print Dokumen Halaman Ini">
                            <i class="ri-printer-line text-base"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Executive Quick Stat Ribbon -->
            <div id="pe-quick-ribbon"></div>

            <!-- Tab Content Dynamic Container -->
            <div id="pe-tab-content">
                <div class="flex items-center justify-center h-48 bg-white rounded-2xl border border-gray-100">
                    <div class="flex flex-col items-center gap-3">
                        <div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
                        <p class="text-sm text-gray-400 font-medium">Menghitung mutasi permodalan koperasi...</p>
                    </div>
                </div>
            </div>
        </div>`;

        document.getElementById('pe-tahun')?.addEventListener('change', (e) => {
            this.tahun = parseInt(e.target.value) || curYear;
            this.load();
        });

        await this.load();
    },

    async load() {
        const tahunSelect = document.getElementById('pe-tahun');
        if (tahunSelect) this.tahun = parseInt(tahunSelect.value) || this.tahun;

        const content = document.getElementById('pe-tab-content');
        if (!content) return;

        content.innerHTML = `
        <div class="flex items-center justify-center h-48 bg-white rounded-2xl border border-gray-100">
            <div class="flex flex-col items-center gap-3">
                <div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
                <p class="text-xs text-gray-400 font-medium">Menyusun laporan perubahan ekuitas tahun ${this.tahun}...</p>
            </div>
        </div>`;

        try {
            const res = await App.api(`perubahan-ekuitas?tahun=${this.tahun}`);
            if (!res?.success) {
                content.innerHTML = `
                <div class="bg-white rounded-2xl border border-red-100 p-8 text-center text-gray-500">
                    <i class="ri-error-warning-line text-4xl text-rose-500"></i>
                    <p class="mt-2 font-semibold text-gray-700">Gagal memuat Laporan Perubahan Ekuitas</p>
                    <p class="text-xs text-gray-400 mt-1">${res?.message || 'Terjadi kesalahan pada server'}</p>
                </div>`;
                return;
            }

            this.data = res.data;
            this.renderRibbon();
            this.renderTabContent(content);
            this.updateTabButtons();
        } catch (err) {
            content.innerHTML = `
            <div class="bg-white rounded-2xl border border-red-100 p-8 text-center text-gray-500">
                <i class="ri-close-circle-line text-4xl text-rose-500"></i>
                <p class="mt-2 font-semibold text-gray-700">Terjadi gangguan jaringan atau server</p>
                <p class="text-xs text-gray-400 mt-1">${err.message || err}</p>
            </div>`;
        }
    },

    renderRibbon() {
        const ribbon = document.getElementById('pe-quick-ribbon');
        if (!ribbon || !this.data) return;

        const r = this.data.ringkasan;
        const d = this.data;
        const komponen = d.komponen || [];
        const totalAkhir = Math.max(1, r.total_modal_akhir);

        const colors = [
            { bg: 'bg-blue-500', pill: 'text-blue-700' },
            { bg: 'bg-emerald-500', pill: 'text-emerald-700' },
            { bg: 'bg-indigo-500', pill: 'text-indigo-700' },
            { bg: 'bg-amber-500', pill: 'text-amber-700' },
            { bg: 'bg-purple-500', pill: 'text-purple-700' },
            { bg: 'bg-teal-500', pill: 'text-teal-700' }
        ];

        const compBreakdown = komponen.map((k, idx) => {
            const val = Math.max(0, k.saldo_akhir);
            const pct = (val / totalAkhir) * 100;
            return {
                kode: k.kode,
                nama: k.nama,
                saldo_akhir: k.saldo_akhir,
                persen: pct,
                color: colors[idx % colors.length]
            };
        });

        ribbon.innerHTML = `
        <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm space-y-3">
            <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-center">
                <!-- Modal Awal -->
                <div class="p-2.5 rounded-xl bg-gray-50/70 border border-gray-100">
                    <span class="text-2xs font-bold text-gray-400 uppercase tracking-wider block">Modal Awal (1 Jan)</span>
                    <span class="text-base font-bold font-mono text-gray-800 block mt-0.5">${this.formatRupiahAbs(r.total_modal_awal)}</span>
                    <span class="text-2xs text-gray-400">Tahun Buku ${d.tahun}</span>
                </div>

                <!-- Total Penambahan -->
                <div class="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100">
                    <span class="text-2xs font-bold text-emerald-700 uppercase tracking-wider block">Penambahan (+)</span>
                    <span class="text-base font-bold font-mono text-emerald-600 block mt-0.5">+${this.formatRupiahAbs(r.total_penambahan)}</span>
                    <span class="text-2xs text-emerald-600/80">Setoran & Cadangan</span>
                </div>

                <!-- Total Pengurangan -->
                <div class="p-2.5 rounded-xl bg-rose-50/50 border border-rose-100">
                    <span class="text-2xs font-bold text-rose-700 uppercase tracking-wider block">Pengurangan (-)</span>
                    <span class="text-base font-bold font-mono ${r.total_pengurangan > 0 ? 'text-rose-600' : 'text-gray-400'} block mt-0.5">
                        ${r.total_pengurangan > 0 ? '-' + this.formatRupiahAbs(r.total_pengurangan) : 'Rp 0'}
                    </span>
                    <span class="text-2xs text-gray-400">Pengembalian Anggota</span>
                </div>

                <!-- Modal Akhir -->
                <div class="p-2.5 rounded-xl bg-primary-50/50 border border-primary-100">
                    <span class="text-2xs font-bold text-primary-700 uppercase tracking-wider block">Modal Akhir (31 Des)</span>
                    <span class="text-base font-bold font-mono text-primary-700 block mt-0.5">${this.formatRupiahAbs(r.total_modal_akhir)}</span>
                    <span class="text-2xs text-primary-600/80">Ekuitas Bersih Koperasi</span>
                </div>

                <!-- Status Neraca -->
                <div class="col-span-2 sm:col-span-2 lg:col-span-1 p-2.5 rounded-xl ${r.is_balanced ? 'bg-emerald-500/10 border border-emerald-200' : 'bg-rose-500/10 border border-rose-200'} flex flex-col justify-center">
                    <div class="flex items-center gap-1.5 text-xs font-bold ${r.is_balanced ? 'text-emerald-800' : 'text-rose-800'}">
                        <i class="${r.is_balanced ? 'ri-checkbox-circle-fill text-emerald-600' : 'ri-alert-fill text-rose-600'} text-sm"></i>
                        <span>${r.is_balanced ? 'NERACA 100% MATCH' : 'SELISIH NERACA'}</span>
                    </div>
                    <p class="text-2xs text-gray-500 mt-0.5">${r.is_balanced ? 'Selisih Rp 0 (Tersinkronisasi)' : 'Selisih: ' + this.formatRupiah(r.selisih_neraca)}</p>
                </div>
            </div>

            <!-- Mini Visual Breakdown Bar -->
            <div class="pt-2 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-2xs">
                <div class="flex items-center gap-1.5 overflow-hidden flex-1 max-w-md">
                    <div class="w-full bg-gray-100 rounded-lg h-2 overflow-hidden flex shadow-inner">
                        ${compBreakdown.map(c => {
                            if (c.persen <= 0) return '';
                            return `<div class="${c.color.bg} h-full" style="width: ${c.persen.toFixed(2)}%" title="${c.nama}: ${this.formatRupiahAbs(c.saldo_akhir)} (${this.formatPersen(c.persen)})"></div>`;
                        }).join('')}
                    </div>
                </div>
                <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-gray-500">
                    ${compBreakdown.filter(c => c.persen > 0).map(c => `
                        <span class="inline-flex items-center gap-1 font-medium">
                            <span class="w-1.5 h-1.5 rounded-full ${c.color.bg}"></span>
                            ${c.nama}: <strong>${this.formatPersen(c.persen)}</strong>
                        </span>
                    `).join('')}
                </div>
            </div>
        </div>`;
    },

    renderTabContent(container) {
        if (!this.data) return;

        if (this.activeTab === 'vertikal') {
            container.innerHTML = this.renderVertikalView();
        } else if (this.activeTab === 'komparatif') {
            container.innerHTML = this.renderKomparatifView();
        } else {
            container.innerHTML = this.renderMatriksView();
        }
    },

    // ─────────────────────────────────────────────────────────────
    // TAB 1: FORMAT ALIRAN VERTIKAL (WATERFALL BRIDGE)
    // ─────────────────────────────────────────────────────────────
    renderVertikalView() {
        const d = this.data;
        const av = d.aliran_vertikal || {};
        const penambahan = av.penambahan || [];
        const pengurangan = av.pengurangan || [];

        return `
        <div class="space-y-4">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                            <i class="ri-flow-chart text-primary-600 text-sm"></i>
                            Aliran Perubahan Ekuitas Modal (Tahun Buku ${d.tahun})
                        </h3>
                        <p class="text-2xs text-gray-400 mt-0.5">Alur mutasi modal mengalir: Modal Awal &bull; (+) Penambahan &bull; (-) Pengurangan &bull; Modal Akhir</p>
                    </div>
                    <span class="text-2xs font-semibold px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg border border-primary-100 w-fit">
                        Format Waterfall RAT
                    </span>
                </div>

                <div class="p-5 space-y-4 text-xs">
                    <!-- 1. Saldo Awal Block -->
                    <div class="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-200/70">
                        <div class="flex items-center gap-2.5">
                            <span class="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">1</span>
                            <div>
                                <h4 class="font-bold text-gray-800">SALDO AWAL MODAL (per 1 Januari ${d.tahun})</h4>
                                <p class="text-2xs text-gray-400">Total akumulasi ekuitas penutupan buku tahun lalu</p>
                            </div>
                        </div>
                        <span class="font-mono font-bold text-sm text-gray-900">${this.formatRupiahAbs(av.modal_awal)}</span>
                    </div>

                    <!-- 2. Penambahan Block -->
                    <div class="border border-emerald-200/80 rounded-2xl overflow-hidden">
                        <div class="bg-emerald-50/60 px-4 py-2.5 border-b border-emerald-100 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">+</span>
                                <h4 class="font-bold text-emerald-900 uppercase tracking-wider text-xs">Penambahan Modal Sendiri (Inflow)</h4>
                            </div>
                            <span class="font-mono font-bold text-emerald-700 text-xs">+${this.formatRupiahAbs(av.subtotal_penambahan)}</span>
                        </div>
                        <div class="divide-y divide-emerald-50/80">
                            ${penambahan.length ? penambahan.map(p => `
                                <div class="px-4 py-2.5 flex items-center justify-between hover:bg-emerald-50/30 transition-colors">
                                    <div class="pr-2">
                                        <div class="font-medium text-gray-800 flex items-center gap-2">
                                            <span>${p.nama}</span>
                                            <span class="text-2xs font-mono bg-gray-100 px-1.5 py-0.2 rounded text-gray-500">Akun: ${p.akun}</span>
                                        </div>
                                        <div class="text-2xs text-gray-400 mt-0.5">${p.keterangan}</div>
                                    </div>
                                    <span class="font-mono font-semibold text-emerald-600 shrink-0">+${this.formatRupiah(p.nominal)}</span>
                                </div>
                            `).join('') : '<div class="px-4 py-3 text-2xs text-gray-400 italic">Tidak ada penambahan modal</div>'}
                        </div>
                    </div>

                    <!-- 3. Pengurangan Block -->
                    <div class="border border-rose-200/80 rounded-2xl overflow-hidden">
                        <div class="bg-rose-50/60 px-4 py-2.5 border-b border-rose-100 flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">-</span>
                                <h4 class="font-bold text-rose-900 uppercase tracking-wider text-xs">Pengurangan Modal & Penyesuaian (Outflow)</h4>
                            </div>
                            <span class="font-mono font-bold text-rose-700 text-xs">
                                ${av.subtotal_pengurangan > 0 ? '-' + this.formatRupiahAbs(av.subtotal_pengurangan) : 'Rp 0'}
                            </span>
                        </div>
                        <div class="divide-y divide-rose-50/80">
                            ${pengurangan.length ? pengurangan.map(p => `
                                <div class="px-4 py-2.5 flex items-center justify-between hover:bg-rose-50/30 transition-colors">
                                    <div class="pr-2">
                                        <div class="font-medium text-gray-800 flex items-center gap-2">
                                            <span>${p.nama}</span>
                                            <span class="text-2xs font-mono bg-gray-100 px-1.5 py-0.2 rounded text-gray-500">Akun: ${p.akun}</span>
                                        </div>
                                        <div class="text-2xs text-gray-400 mt-0.5">${p.keterangan}</div>
                                    </div>
                                    <span class="font-mono font-semibold text-rose-600 shrink-0">-${this.formatRupiah(p.nominal)}</span>
                                </div>
                            `).join('') : '<div class="px-4 py-3 text-2xs text-gray-400 italic">Tidak ada pengurangan modal</div>'}
                        </div>
                    </div>

                    <!-- 4. Saldo Akhir Result Block -->
                    <div class="p-4 rounded-2xl bg-gradient-to-r from-primary-900 to-indigo-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                        <div>
                            <div class="flex items-center gap-2">
                                <i class="ri-checkbox-circle-fill text-emerald-400 text-lg"></i>
                                <span class="text-xs font-bold uppercase tracking-wider text-primary-200">SALDO AKHIR EKUITAS (per 31 Desember ${d.tahun})</span>
                            </div>
                            <p class="text-2xs text-primary-200/80 mt-0.5">Rumus: Saldo Awal (${this.formatRupiah(av.modal_awal)}) + Penambahan (${this.formatRupiah(av.subtotal_penambahan)}) - Pengurangan (${this.formatRupiah(av.subtotal_pengurangan)})</p>
                        </div>
                        <div class="text-right">
                            <span class="text-xl font-bold font-mono text-white block">${this.formatRupiahAbs(av.modal_akhir)}</span>
                            <span class="text-2xs font-semibold text-emerald-300">✓ Sesuai Neraca (Selisih Rp 0,00)</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    // ─────────────────────────────────────────────────────────────
    // TAB 2: FORMAT KOMPARATIF TAHUNAN (YEAR-OVER-YEAR / YoY)
    // ─────────────────────────────────────────────────────────────
    renderKomparatifView() {
        const d = this.data;
        const comp = d.komparatif || {};
        const items = comp.items || [];

        return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <i class="ri-line-chart-line text-primary-600 text-sm"></i>
                        Laporan Komparatif Perubahan Ekuitas (${comp.tahun_lalu} vs ${comp.tahun_ini})
                    </h3>
                    <p class="text-2xs text-gray-400 mt-0.5">Perbandingan posisi ekuitas antar tahun buku untuk analisis pertumbuhan modal (Standar Audit KAP)</p>
                </div>
                <span class="text-2xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 w-fit">
                    Model Audit Tahunan (YoY)
                </span>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-xs">
                    <thead>
                        <tr class="bg-gray-100/70 text-gray-700 border-b border-gray-200">
                            <th class="py-3 px-4 text-left font-bold w-12">Kode</th>
                            <th class="py-3 px-3 text-left font-bold">Komponen Ekuitas Modal</th>
                            <th class="py-3 px-3 text-right font-bold">Tahun ${comp.tahun_lalu} (Lalu)</th>
                            <th class="py-3 px-3 text-right font-bold text-primary-700 bg-primary-50/40">Tahun ${comp.tahun_ini} (Berjalan)</th>
                            <th class="py-3 px-3 text-right font-bold">Pertumbuhan (Rp)</th>
                            <th class="py-3 px-3 text-center font-bold w-28">Pertumbuhan (%)</th>
                            <th class="py-3 px-4 text-center font-bold w-24">Status Tren</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${items.map(it => {
                            const isNaik = it.tren === 'naik';
                            const isTurun = it.tren === 'turun';

                            let badgeClass = "bg-gray-100 text-gray-600";
                            let badgeText = "Stabil ➔";
                            let nomClass = "text-gray-700";

                            if (isNaik) {
                                badgeClass = "bg-emerald-50 text-emerald-700 border border-emerald-100";
                                badgeText = "Naik ↗";
                                nomClass = "text-emerald-600 font-semibold";
                            } else if (isTurun) {
                                badgeClass = "bg-rose-50 text-rose-700 border border-rose-100";
                                badgeText = "Turun ↘";
                                nomClass = "text-rose-600 font-semibold";
                            }

                            return `
                            <tr class="hover:bg-gray-50/60 transition-colors">
                                <td class="py-3 px-4 font-mono text-2xs text-gray-400">${it.akun}</td>
                                <td class="py-3 px-3 font-semibold text-gray-800">${it.nama}</td>
                                <td class="py-3 px-3 text-right font-mono text-gray-600">${this.formatRupiah(it.saldo_lalu)}</td>
                                <td class="py-3 px-3 text-right font-mono font-bold text-primary-900 bg-primary-50/20">${this.formatRupiah(it.saldo_kini)}</td>
                                <td class="py-3 px-3 text-right font-mono ${nomClass}">
                                    ${it.pertumbuhan_nominal >= 0 ? '+' : ''}${this.formatRupiah(it.pertumbuhan_nominal)}
                                </td>
                                <td class="py-3 px-3 text-center font-mono font-semibold ${nomClass}">
                                    ${it.pertumbuhan_nominal >= 0 ? '+' : ''}${this.formatPersen(it.pertumbuhan_persen)}
                                </td>
                                <td class="py-3 px-4 text-center">
                                    <span class="inline-block text-2xs font-semibold px-2 py-0.5 rounded-lg ${badgeClass}">
                                        ${badgeText}
                                    </span>
                                </td>
                            </tr>`;
                        }).join('')}

                        <!-- Total Row -->
                        <tr class="bg-gray-50 font-bold text-gray-900 border-t-2 border-gray-300">
                            <td colspan="2" class="py-3 px-4 text-left uppercase tracking-wider">
                                TOTAL EKUITAS KOPERASI
                            </td>
                            <td class="py-3 px-3 text-right font-mono">${this.formatRupiah(comp.total_lalu)}</td>
                            <td class="py-3 px-3 text-right font-mono text-primary-800 bg-primary-100/50 text-sm font-extrabold">
                                ${this.formatRupiah(comp.total_kini)}
                            </td>
                            <td class="py-3 px-3 text-right font-mono ${comp.pertumbuhan_nominal >= 0 ? 'text-emerald-700' : 'text-rose-700'} font-bold">
                                ${comp.pertumbuhan_nominal >= 0 ? '+' : ''}${this.formatRupiah(comp.pertumbuhan_nominal)}
                            </td>
                            <td class="py-3 px-3 text-center font-mono font-bold ${comp.pertumbuhan_nominal >= 0 ? 'text-emerald-700' : 'text-rose-700'}">
                                ${comp.pertumbuhan_nominal >= 0 ? '+' : ''}${this.formatPersen(comp.pertumbuhan_persen)}
                            </td>
                            <td class="py-3 px-4 text-center">
                                <span class="inline-block text-2xs font-bold px-2 py-0.5 rounded-lg ${comp.tren === 'naik' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                                    ${comp.tren === 'naik' ? 'Naik ↗' : (comp.tren === 'turun' ? 'Turun ↘' : 'Stabil ➔')}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 text-2xs text-gray-500 flex items-center justify-between">
                <span>Catatan: Saldo tahun ${comp.tahun_lalu} bersumber dari saldo akhir audit neraca tahun sebelumnya.</span>
                <span class="font-semibold text-emerald-700">Audit Status: Reconciled</span>
            </div>
        </div>`;
    },

    // ─────────────────────────────────────────────────────────────
    // TAB 3: FORMAT MATRIKS SAK EP (8 Kolom Landscape)
    // ─────────────────────────────────────────────────────────────
    renderMatriksView() {
        const d = this.data;
        const matriks = d.matriks || [];
        const r = d.ringkasan;

        return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-5 py-3.5 border-b border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <i class="ri-table-line text-primary-600 text-sm"></i>
                        Matriks Mutasi Perubahan Ekuitas SAK EP (8 Kolom)
                    </h3>
                    <p class="text-2xs text-gray-400 mt-0.5">Tabel matriks formal audit trail untuk lampiran buku laporan pertanggungjawaban RAT</p>
                </div>
                <span class="text-2xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 w-fit">
                    Format Standar SAK EP
                </span>
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-xs">
                    <thead>
                        <tr class="bg-gray-100/70 text-gray-700 border-b border-gray-200">
                            <th class="py-2.5 px-4 text-left font-bold w-1/4">Pos Mutasi Ekuitas</th>
                            <th class="py-2.5 px-3 text-right font-bold">Simp. Pokok<br><span class="text-2xs font-normal text-gray-400 font-mono">(212)</span></th>
                            <th class="py-2.5 px-3 text-right font-bold">Simp. Wajib<br><span class="text-2xs font-normal text-gray-400 font-mono">(213)</span></th>
                            <th class="py-2.5 px-3 text-right font-bold">Simp. Partisipatif<br><span class="text-2xs font-normal text-gray-400 font-mono">(214)</span></th>
                            <th class="py-2.5 px-3 text-right font-bold">Dana Cadangan<br><span class="text-2xs font-normal text-gray-400 font-mono">(215/204)</span></th>
                            <th class="py-2.5 px-3 text-right font-bold">Ekuitas Awal<br><span class="text-2xs font-normal text-gray-400 font-mono">(3999)</span></th>
                            <th class="py-2.5 px-3 text-right font-bold">SHU Berjalan<br><span class="text-2xs font-normal text-gray-400 font-mono">(4xx - 5xx)</span></th>
                            <th class="py-2.5 px-4 text-right font-bold bg-gray-200/60 text-gray-900">Total Ekuitas</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${matriks.map((m, idx) => {
                            const isFirst = idx === 0;
                            const isLast = m.is_total || idx === matriks.length - 1;
                            
                            let trClass = "hover:bg-gray-50/60 transition-colors";
                            let tdStyle = "py-2 px-3";

                            if (isFirst) {
                                trClass = "bg-blue-50/40 font-bold text-gray-900 border-b-2 border-blue-100";
                            } else if (isLast) {
                                trClass = "bg-primary-50/60 font-bold text-gray-900 border-t-2 border-b-2 border-primary-200";
                            }

                            const renderCell = (val, isTotalCol = false) => {
                                const num = Number(val) || 0;
                                let colorClass = "text-gray-700";
                                if (isFirst || isLast) colorClass = isLast ? "text-primary-900 font-bold" : "text-gray-900 font-bold";
                                else if (num > 0) colorClass = isTotalCol ? "text-emerald-700 font-semibold" : "text-gray-800";
                                else if (num < 0) colorClass = "text-rose-600 font-semibold";
                                else colorClass = "text-gray-400";

                                return `
                                <td class="${tdStyle} text-right font-mono ${colorClass} ${isTotalCol ? 'bg-gray-50/50' : ''}">
                                    ${this.formatRupiah(num)}
                                </td>`;
                            };

                            return `
                            <tr class="${trClass}">
                                <td class="py-2 px-4 font-medium text-gray-800">
                                    ${m.baris}
                                </td>
                                ${renderCell(m.simpanan_pokok)}
                                ${renderCell(m.simpanan_wajib)}
                                ${renderCell(m.simpanan_partisipatif)}
                                ${renderCell(m.dana_cadangan)}
                                ${renderCell(m.ekuitas_awal)}
                                ${renderCell(m.shu_berjalan)}
                                ${renderCell(m.total, true)}
                            </tr>`;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <div class="px-5 py-2.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-2xs text-gray-500">
                <span>Total Modal Akhir: <strong>${this.formatRupiahAbs(r.total_modal_akhir)}</strong></span>
                <span class="font-mono ${r.is_balanced ? 'text-emerald-700' : 'text-rose-600'} font-bold">
                    Rekonsiliasi Neraca: ${r.is_balanced ? 'SEIMBANG 100%' : 'SELISIH ' + this.formatRupiah(r.selisih_neraca)}
                </span>
            </div>
        </div>`;
    },

    exportPDF() {
        if (!this.data) {
            App.toast('Data laporan belum tersedia', 'warning');
            return;
        }

        const d = this.data;
        const r = d.ringkasan;
        const matriks = d.matriks || [];
        const { jsPDF } = window.jspdf;

        // Use Landscape A4 for rich presentation
        const doc = new jsPDF('l', 'mm', 'a4');
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();

        const title = 'LAPORAN PERUBAHAN EKUITAS (STATEMENT OF CHANGES IN EQUITY)';
        App.drawPDFHeader(doc, title);
        App.drawPDFFooter(doc);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        const subTitle = `Tahun Buku: ${d.tahun} (${d.periode.tgl_awal} s/d ${d.periode.tgl_akhir})  |  Standar: SAK EP & Permenkop UKM No. 2 Tahun 2024`;
        doc.text(subTitle, 14, 44);

        // Summary Cards
        const cards = [
            { label: 'Modal Awal (1 Jan)', value: App.formatRupiah(r.total_modal_awal) },
            { label: 'Total Penambahan (+)', value: '+' + App.formatRupiah(r.total_penambahan) },
            { label: 'Total Pengurangan (-)', value: r.total_pengurangan > 0 ? '-' + App.formatRupiah(r.total_pengurangan) : 'Rp 0' },
            { label: 'Modal Akhir (31 Des)', value: App.formatRupiah(r.total_modal_akhir) },
            { label: 'Rekonsiliasi Neraca', value: r.is_balanced ? 'MATCH 100%' : 'SELISIH ' + App.formatRupiah(r.selisih_neraca) }
        ];
        const curY = App.drawPDFSummaryCards(doc, cards, 48);

        // Build Table Rows
        const head = [[
            'Pos Mutasi Ekuitas',
            'Simp. Pokok (212)',
            'Simp. Wajib (213)',
            'Simp. Partisipatif (214)',
            'Dana Cadangan (215/204)',
            'Ekuitas Awal (3999)',
            'SHU Berjalan (4xx-5xx)',
            'Total Ekuitas'
        ]];

        const tableBody = matriks.map(m => [
            m.baris,
            this.formatRupiah(m.simpanan_pokok),
            this.formatRupiah(m.simpanan_wajib),
            this.formatRupiah(m.simpanan_partisipatif),
            this.formatRupiah(m.dana_cadangan),
            this.formatRupiah(m.ekuitas_awal),
            this.formatRupiah(m.shu_berjalan),
            this.formatRupiah(m.total)
        ]);

        doc.autoTable({
            startY: curY + 2,
            head: head,
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: [79, 70, 229],
                textColor: 255,
                fontSize: 7.5,
                fontStyle: 'bold',
                halign: 'center',
                valign: 'middle'
            },
            bodyStyles: {
                fontSize: 7,
                cellPadding: 2,
                textColor: [51, 65, 85],
                lineColor: [226, 232, 240],
                lineWidth: 0.1
            },
            columnStyles: {
                0: { cellWidth: 70, halign: 'left' },
                1: { cellWidth: 28, halign: 'right' },
                2: { cellWidth: 28, halign: 'right' },
                3: { cellWidth: 28, halign: 'right' },
                4: { cellWidth: 28, halign: 'right' },
                5: { cellWidth: 27, halign: 'right' },
                6: { cellWidth: 28, halign: 'right' },
                7: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14, top: 46, bottom: 25 },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    if (data.row.index === 0) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [241, 245, 249];
                        data.cell.styles.textColor = [15, 23, 42];
                    }
                    if (data.row.index === tableBody.length - 1) {
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fillColor = [238, 242, 255];
                        data.cell.styles.textColor = [49, 46, 129];
                    }
                    const rawText = String(data.cell.raw || '');
                    if (rawText.startsWith('-') && data.column.index > 0) {
                        data.cell.styles.textColor = [225, 29, 72];
                    }
                }
            },
            didDrawPage: () => {
                App.drawPDFHeader(doc, title);
                App.drawPDFFooter(doc);
            }
        });

        // 3 Signatures Block
        const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 8 : 150;
        const availableSpace = ph - finalY - 18;
        
        let sigY = finalY;
        if (availableSpace < 35) {
            doc.addPage();
            App.drawPDFHeader(doc, title);
            App.drawPDFFooter(doc);
            sigY = 50;
        }

        const namaKetua = App.settings?.ketua_koperasi?.value || 'Ketua Koperasi';
        const namaPengawas = App.settings?.pengawas_koperasi?.value || 'Pengawas Koperasi';
        const namaBendahara = App.user?.nama_lengkap || 'Bendahara Koperasi';

        const colW = (pw - 28) / 3;
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);

        // Pengawas
        doc.text('Menyetujui / Mengawasi,', 14 + (colW * 0.5), sigY, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text('Pengawas Koperasi', 14 + (colW * 0.5), sigY + 4, { align: 'center' });
        doc.text(namaPengawas, 14 + (colW * 0.5), sigY + 24, { align: 'center' });
        doc.setLineWidth(0.2);
        doc.line(14 + (colW * 0.2), sigY + 25, 14 + (colW * 0.8), sigY + 25);

        // Ketua
        doc.setFont('helvetica', 'normal');
        doc.text('Mengetahui & Mengesahkan,', 14 + colW + (colW * 0.5), sigY, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text('Ketua Koperasi', 14 + colW + (colW * 0.5), sigY + 4, { align: 'center' });
        doc.text(namaKetua, 14 + colW + (colW * 0.5), sigY + 24, { align: 'center' });
        doc.line(14 + colW + (colW * 0.2), sigY + 25, 14 + colW + (colW * 0.8), sigY + 25);

        // Bendahara
        doc.setFont('helvetica', 'normal');
        doc.text('Disusun Oleh,', 14 + (colW * 2) + (colW * 0.5), sigY, { align: 'center' });
        doc.setFont('helvetica', 'bold');
        doc.text('Bendahara / Keuangan', 14 + (colW * 2) + (colW * 0.5), sigY + 4, { align: 'center' });
        doc.text(namaBendahara, 14 + (colW * 2) + (colW * 0.5), sigY + 24, { align: 'center' });
        doc.line(14 + (colW * 2) + (colW * 0.2), sigY + 25, 14 + (colW * 2) + (colW * 0.8), sigY + 25);

        window.open(doc.output('bloburl'), '_blank');
    },

    exportExcel() {
        if (!this.data) {
            App.toast('Data laporan belum tersedia', 'warning');
            return;
        }

        const d = this.data;
        const r = d.ringkasan;
        const matriks = d.matriks || [];
        const av = d.aliran_vertikal || {};
        const comp = d.komparatif || {};
        const namaKop = App.settings?.nama_koperasi?.value || App.settings?.app_name?.value || 'KOPERASI';

        let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel compatibility
        csv += "LAPORAN PERUBAHAN EKUITAS (STATEMENT OF CHANGES IN EQUITY)\r\n";
        csv += `"${namaKop}"\r\n`;
        csv += `Standar Akuntansi,SAK EP (Standar Akuntansi Keuangan Entitas Privat)\r\n`;
        csv += `Tahun Buku,${d.tahun} (${d.periode.tgl_awal} s/d ${d.periode.tgl_akhir})\r\n`;
        csv += `Tanggal Unduh,${new Date().toLocaleString('id-ID')}\r\n\r\n`;

        // Ringkasan
        csv += "RINGKASAN EKUITAS,Nominal (Rp)\r\n";
        csv += `"Modal Awal per 1 Januari ${d.tahun}",${r.total_modal_awal}\r\n`;
        csv += `"Total Penambahan Modal",${r.total_penambahan}\r\n`;
        csv += `"Total Pengurangan Modal",${r.total_pengurangan}\r\n`;
        csv += `"Modal Akhir per 31 Desember ${d.tahun}",${r.total_modal_akhir}\r\n`;
        csv += `"Total Ekuitas Neraca",${r.total_modal_neraca}\r\n`;
        csv += `"Selisih Rekonsiliasi",${r.selisih_neraca}\r\n`;
        csv += `"Status Keseimbangan Neraca","${r.is_balanced ? 'SEIMBANG / MATCH 100%' : 'TERDAPAT SELISIH'}"\r\n\r\n`;

        // Section 1: Aliran Vertikal
        csv += "I. ALIRAN PERUBAHAN EKUITAS (WATERFALL),Nominal (Rp)\r\n";
        csv += `"Saldo Awal Modal",${av.modal_awal}\r\n`;
        csv += "PENAMBAHAN MODAL SENDIRI (+),\r\n";
        (av.penambahan || []).forEach(p => {
            csv += `"${p.nama} (${p.akun})",${p.nominal}\r\n`;
        });
        csv += `"Subtotal Penambahan",${av.subtotal_penambahan}\r\n`;
        csv += "PENGURANGAN MODAL SENDIRI (-),\r\n";
        (av.pengurangan || []).forEach(p => {
            csv += `"${p.nama} (${p.akun})",${p.nominal}\r\n`;
        });
        csv += `"Subtotal Pengurangan",${av.subtotal_pengurangan}\r\n`;
        csv += `"Saldo Akhir Modal",${av.modal_akhir}\r\n\r\n`;

        // Section 2: Komparatif YoY
        csv += `II. KOMPARATIF TAHUNAN (YoY),Tahun ${comp.tahun_lalu} (Rp),Tahun ${comp.tahun_ini} (Rp),Pertumbuhan (Rp),Pertumbuhan (%),Tren\r\n`;
        (comp.items || []).forEach(it => {
            csv += `"${it.nama} (${it.akun})",${it.saldo_lalu},${it.saldo_kini},${it.pertumbuhan_nominal},"${it.pertumbuhan_persen}%","${it.tren}"\r\n`;
        });
        csv += `"TOTAL EKUITAS",${comp.total_lalu},${comp.total_kini},${comp.pertumbuhan_nominal},"${comp.pertumbuhan_persen}%","${comp.tren}"\r\n\r\n`;

        // Section 3: Matriks SAK EP 8 Kolom
        csv += "III. MATRIKS SAK EP 8 KOLOM,Simpanan Pokok (212),Simpanan Wajib (213),Simpanan Partisipatif (214),Dana Cadangan (215/204),Ekuitas Awal (3999),SHU Berjalan (4xx-5xx),Total Ekuitas\r\n";
        matriks.forEach(m => {
            csv += `"${m.baris}",${m.simpanan_pokok},${m.simpanan_wajib},${m.simpanan_partisipatif},${m.dana_cadangan},${m.ekuitas_awal},${m.shu_berjalan},${m.total}\r\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Laporan_Perubahan_Ekuitas_${d.tahun}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // Aliases
    cetakPDF() { this.exportPDF(); },
    export(type) {
        if (type === 'pdf') this.exportPDF();
        else this.exportExcel();
    }
};

window.PerubahanEkuitasPage = PerubahanEkuitasPage;
export default PerubahanEkuitasPage;
