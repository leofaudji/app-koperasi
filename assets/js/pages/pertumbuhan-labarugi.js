// ============================================================
// Laporan Pertumbuhan Laba / Rugi (MoM & YoY)
// Analisis Tren Pendapatan, Beban Usaha, dan SHU Koperasi
// ============================================================

const PertumbuhanLabaRugiPage = {
    data: null,
    mode: 'bulanan', // 'bulanan' | 'tahunan'
    tahun: new Date().getFullYear(),
    tahunAwal: new Date().getFullYear() - 4,
    tahunAkhir: new Date().getFullYear(),

    formatRupiah(num) {
        const val = Number(num) || 0;
        const sign = val < 0 ? '-' : '';
        return sign + 'Rp ' + Math.abs(val).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    },

    formatPersen(num) {
        const val = Number(num) || 0;
        const sign = val > 0 ? '+' : '';
        return sign + val.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    },

    setMode(mode) {
        this.mode = mode;
        this.renderFilterSection();
        this.load();
    },

    async render(container) {
        App.setTitle('Pertumbuhan Laba Rugi', 'Analisis tren pertumbuhan pendapatan, beban operasional, dan SHU (MoM & YoY)');
        this.container = container;

        const currentYear = new Date().getFullYear();
        this.tahun = currentYear;
        this.tahunAwal = currentYear - 4;
        this.tahunAkhir = currentYear;

        container.innerHTML = `
        <div class="space-y-6 animate-fadeIn pb-12">
            <!-- Filter Bar -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div class="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
                    <div class="flex flex-wrap items-end gap-3">
                        <!-- Mode Switcher -->
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 mb-1.5">Model Analisis</label>
                            <div class="inline-flex rounded-xl bg-gray-100 p-1 text-xs font-medium">
                                <button id="btn-mode-bulanan" onclick="PertumbuhanLabaRugiPage.setMode('bulanan')"
                                    class="px-3.5 py-1.5 rounded-lg ${this.mode === 'bulanan' ? 'bg-white text-primary-700 font-semibold shadow-xs' : 'text-gray-600 hover:bg-white'} transition-all">
                                    <i class="ri-calendar-line mr-1"></i> Bulanan (MoM)
                                </button>
                                <button id="btn-mode-tahunan" onclick="PertumbuhanLabaRugiPage.setMode('tahunan')"
                                    class="px-3.5 py-1.5 rounded-lg ${this.mode === 'tahunan' ? 'bg-white text-primary-700 font-semibold shadow-xs' : 'text-gray-600 hover:bg-white'} transition-all">
                                    <i class="ri-calendar-event-line mr-1"></i> Tahunan (YoY)
                                </button>
                            </div>
                        </div>

                        <!-- Dynamic Filter Inputs Container -->
                        <div id="plr-filter-inputs" class="flex flex-wrap items-end gap-3">
                            <!-- Injected by renderFilterSection() -->
                        </div>

                        <button onclick="PertumbuhanLabaRugiPage.load()"
                            class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
                            <i class="ri-refresh-line"></i> Muat Data
                        </button>
                    </div>

                    <!-- Export Buttons -->
                    <div class="flex flex-wrap items-center gap-2">
                        <button onclick="PertumbuhanLabaRugiPage.exportPDF()"
                            class="bg-rose-50 text-rose-600 hover:bg-rose-100 px-3.5 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all" title="Download / Cetak PDF">
                            <i class="ri-file-pdf-line text-base"></i> Cetak PDF
                        </button>
                        <button onclick="PertumbuhanLabaRugiPage.exportExcel()"
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
            <div id="plr-content">
                <div class="flex items-center justify-center h-48 bg-white rounded-2xl border border-gray-100">
                    <div class="flex flex-col items-center gap-3">
                        <div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
                        <p class="text-sm text-gray-400 font-medium">Memuat data pertumbuhan laba rugi...</p>
                    </div>
                </div>
            </div>
        </div>`;

        this.renderFilterSection();
        await this.load();
    },

    renderFilterSection() {
        const container = document.getElementById('plr-filter-inputs');
        if (!container) return;

        const currentYear = new Date().getFullYear();
        const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - i);

        // Update mode toggle buttons
        const btnBulanan = document.getElementById('btn-mode-bulanan');
        const btnTahunan = document.getElementById('btn-mode-tahunan');
        if (btnBulanan && btnTahunan) {
            btnBulanan.className = `px-3.5 py-1.5 rounded-lg ${this.mode === 'bulanan' ? 'bg-white text-primary-700 font-semibold shadow-xs' : 'text-gray-600 hover:bg-white'} transition-all`;
            btnTahunan.className = `px-3.5 py-1.5 rounded-lg ${this.mode === 'tahunan' ? 'bg-white text-primary-700 font-semibold shadow-xs' : 'text-gray-600 hover:bg-white'} transition-all`;
        }

        if (this.mode === 'bulanan') {
            container.innerHTML = `
            <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1.5">Tahun Analisis</label>
                <select id="plr-tahun" onchange="PertumbuhanLabaRugiPage.load()"
                    class="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 min-w-[130px]">
                    ${yearOptions.map(y => `<option value="${y}" ${y === this.tahun ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
            </div>`;
        } else {
            container.innerHTML = `
            <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1.5">Dari Tahun</label>
                <select id="plr-tahun-awal" onchange="PertumbuhanLabaRugiPage.load()"
                    class="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 min-w-[120px]">
                    ${yearOptions.map(y => `<option value="${y}" ${y === this.tahunAwal ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
            </div>
            <div>
                <label class="block text-xs font-semibold text-gray-500 mb-1.5">Sampai Tahun</label>
                <select id="plr-tahun-akhir" onchange="PertumbuhanLabaRugiPage.load()"
                    class="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 min-w-[120px]">
                    ${yearOptions.map(y => `<option value="${y}" ${y === this.tahunAkhir ? 'selected' : ''}>${y}</option>`).join('')}
                </select>
            </div>`;
        }
    },

    async load() {
        if (this.mode === 'bulanan') {
            const tahunEl = document.getElementById('plr-tahun');
            if (tahunEl) this.tahun = parseInt(tahunEl.value) || new Date().getFullYear();
        } else {
            const tAwalEl = document.getElementById('plr-tahun-awal');
            const tAkhirEl = document.getElementById('plr-tahun-akhir');
            if (tAwalEl) this.tahunAwal = parseInt(tAwalEl.value) || (new Date().getFullYear() - 4);
            if (tAkhirEl) this.tahunAkhir = parseInt(tAkhirEl.value) || new Date().getFullYear();
        }

        const content = document.getElementById('plr-content');
        if (!content) return;

        content.innerHTML = `
        <div class="flex items-center justify-center h-48 bg-white rounded-2xl border border-gray-100">
            <div class="flex flex-col items-center gap-3">
                <div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
                <p class="text-sm text-gray-400 font-medium">Menganalisis tren laba rugi...</p>
            </div>
        </div>`;

        const query = this.mode === 'bulanan'
            ? `keuangan/pertumbuhan-labarugi?mode=bulanan&tahun=${this.tahun}`
            : `keuangan/pertumbuhan-labarugi?mode=tahunan&tahun_awal=${this.tahunAwal}&tahun_akhir=${this.tahunAkhir}`;

        const res = await App.api(query);
        if (!res?.success) {
            content.innerHTML = `
            <div class="bg-white rounded-2xl border border-red-100 p-8 text-center text-gray-500">
                <i class="ri-error-warning-line text-4xl text-rose-500"></i>
                <p class="mt-2 font-semibold text-gray-700">Gagal memuat Data Pertumbuhan</p>
                <p class="text-xs text-gray-400 mt-1">${res?.message || 'Terjadi kesalahan pada server'}</p>
            </div>`;
            return;
        }

        this.data = res.data;
        this.renderDashboard(content);
    },

    renderDashboard(content) {
        const d = this.data;
        const r = d.ringkasan;
        const items = d.items || [];
        const isBulanan = d.mode === 'bulanan';

        const subTitlePeriode = isBulanan 
            ? `Tahun Buku ${d.filter.tahun} (Perbandingan MoM)`
            : `Rentang ${d.filter.tahun_awal} s/d ${d.filter.tahun_akhir} (Perbandingan YoY)`;

        content.innerHTML = `
        <div id="print-plr" class="space-y-6">
            <!-- Kop Print Browser -->
            <div class="hidden print:block text-center border-b pb-4 mb-4">
                <h1 class="text-xl font-bold uppercase tracking-wider text-gray-900">${App.settings?.app_name?.value || 'KOPERASI SIMPAN PINJAM'}</h1>
                <p class="text-xs text-gray-500">${App.settings?.alamat?.value || ''} | Telp: ${App.settings?.telepon?.value || ''}</p>
                <h2 class="text-base font-bold text-gray-800 mt-2 uppercase">LAPORAN PERTUMBUHAN LABA / RUGI & TREN SHU</h2>
                <p class="text-xs text-gray-600">${subTitlePeriode}</p>
            </div>

            <!-- KPI Executive Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <!-- Total Pendapatan -->
                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Pendapatan</span>
                        <div class="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-base"><i class="ri-funds-line"></i></div>
                    </div>
                    <p class="text-xl font-bold text-emerald-600 mt-2 font-mono">${this.formatRupiah(r.total_pendapatan)}</p>
                    <p class="text-[11px] text-gray-400 mt-1">Rata-rata: ${this.formatRupiah(isBulanan ? r.rata_pendapatan_bulanan : r.rata_pendapatan_tahunan)}</p>
                </div>

                <!-- Total Beban -->
                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Beban</span>
                        <div class="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center text-base"><i class="ri-hand-coin-line"></i></div>
                    </div>
                    <p class="text-xl font-bold text-rose-600 mt-2 font-mono">${this.formatRupiah(r.total_beban)}</p>
                    <p class="text-[11px] text-gray-400 mt-1">Rata-rata: ${this.formatRupiah(isBulanan ? r.rata_beban_bulanan : r.rata_beban_tahunan)}</p>
                </div>

                <!-- Total SHU Bersih -->
                <div class="bg-gradient-to-br from-primary-600 to-primary-800 text-white rounded-2xl p-5 shadow-sm relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-primary-200 uppercase tracking-wider">SHU Bersih</span>
                        <div class="w-8 h-8 rounded-xl bg-white/20 text-white flex items-center justify-center text-base"><i class="ri-safe-2-line"></i></div>
                    </div>
                    <p class="text-xl font-bold text-white mt-2 font-mono">${this.formatRupiah(r.total_shu)}</p>
                    <p class="text-[11px] text-primary-100 mt-1">Rata-rata: ${this.formatRupiah(isBulanan ? r.rata_shu_bulanan : r.rata_shu_tahunan)}</p>
                </div>

                <!-- Periode Tertinggi -->
                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Puncak Kinerja</span>
                        <div class="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-base"><i class="ri-trophy-line"></i></div>
                    </div>
                    <p class="text-lg font-bold text-gray-800 mt-2 truncate">${r.periode_tertinggi}</p>
                    <p class="text-[11px] text-amber-600 font-mono font-medium mt-1">${this.formatRupiah(r.shu_tertinggi)}</p>
                </div>

                <!-- Rata Pertumbuhan -->
                <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative overflow-hidden">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider">Rata Pertumbuhan</span>
                        <div class="w-8 h-8 rounded-xl ${r.rata_pertumbuhan_persen >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} flex items-center justify-center text-base">
                            <i class="${r.rata_pertumbuhan_persen >= 0 ? 'ri-arrow-up-line' : 'ri-arrow-down-line'}"></i>
                        </div>
                    </div>
                    <p class="text-xl font-bold font-mono ${r.rata_pertumbuhan_persen >= 0 ? 'text-emerald-600' : 'text-rose-600'} mt-2">
                        ${this.formatPersen(r.rata_pertumbuhan_persen)}
                    </p>
                    <p class="text-[11px] text-gray-400 mt-1">${isBulanan ? 'Rata-rata MoM' : 'Rata-rata YoY'}</p>
                </div>
            </div>

            <!-- Interactive Visualizer (Bar & Trend Chart) -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2 mb-6">
                    <div>
                        <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                            <i class="ri-bar-chart-grouped-line text-primary-600 text-lg"></i> Visualisasi Komparasi & Tren Laba Rugi
                        </h3>
                        <p class="text-xs text-gray-500 mt-0.5">${subTitlePeriode}</p>
                    </div>
                    <div class="flex items-center gap-4 text-xs font-medium">
                        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Pendapatan</span>
                        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-rose-500 inline-block"></span> Beban Usaha</span>
                        <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded bg-primary-600 inline-block"></span> SHU Bersih</span>
                    </div>
                </div>

                ${this.renderVisualBars(items)}
            </div>

            <!-- Detailed Table -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h3 class="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <i class="ri-table-line text-primary-600 text-base"></i> Tabel Rincian Pertumbuhan Finansial
                    </h3>
                    <span class="text-xs text-gray-500 font-medium">Satuan Rupiah (IDR)</span>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-xs">
                        <thead>
                            <tr class="text-left text-gray-500 border-b border-gray-200 bg-gray-50/70 font-semibold">
                                <th class="py-3 px-4">Periode</th>
                                <th class="py-3 px-4 text-right">Pendapatan</th>
                                <th class="py-3 px-4 text-right">Beban Usaha</th>
                                <th class="py-3 px-4 text-right">SHU Bersih</th>
                                <th class="py-3 px-4 text-right">Pertumbuhan Nominal</th>
                                <th class="py-3 px-4 text-center">Pertumbuhan (%)</th>
                                <th class="py-3 px-4 text-center">Status / Tren</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 text-gray-700">
                            ${items.map(item => {
                                const isFuture = item.is_future === true;
                                const isZero = item.pendapatan === 0 && item.total_beban === 0;
                                const rowDim = isFuture ? 'opacity-40 bg-gray-50/30' : 'hover:bg-gray-50/60';

                                let badgeHtml = '';
                                if (isFuture) {
                                    badgeHtml = '<span class="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-400">Belum Berjalan</span>';
                                } else if (item.tren === 'awal') {
                                    badgeHtml = '<span class="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600">Basis Awal</span>';
                                } else if (item.tren === 'naik') {
                                    badgeHtml = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 flex items-center justify-center gap-0.5 mx-auto w-fit"><i class="ri-arrow-up-line"></i> Naik</span>';
                                } else if (item.tren === 'turun') {
                                    badgeHtml = '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 flex items-center justify-center gap-0.5 mx-auto w-fit"><i class="ri-arrow-down-line"></i> Turun</span>';
                                } else {
                                    badgeHtml = '<span class="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">Stabil</span>';
                                }

                                const nominalStr = (isFuture || item.tren === 'awal') 
                                    ? '-' 
                                    : (item.pertumbuhan_nominal >= 0 ? '+' : '') + this.formatRupiah(item.pertumbuhan_nominal);

                                const persenStr = (isFuture || item.tren === 'awal') 
                                    ? '-' 
                                    : this.formatPersen(item.pertumbuhan_persen);

                                return `
                                <tr class="${rowDim} transition-colors">
                                    <td class="py-3 px-4 font-semibold text-gray-900 flex items-center gap-2">
                                        <i class="ri-record-circle-fill text-[8px] ${item.shu >= 0 ? 'text-emerald-500' : 'text-rose-500'}"></i>
                                        ${item.periode}
                                    </td>
                                    <td class="py-3 px-4 text-right font-mono font-medium text-emerald-700">${this.formatRupiah(item.pendapatan)}</td>
                                    <td class="py-3 px-4 text-right font-mono font-medium text-rose-600">(${this.formatRupiah(item.total_beban)})</td>
                                    <td class="py-3 px-4 text-right font-mono font-bold ${item.shu >= 0 ? 'text-primary-700' : 'text-rose-600'}">${this.formatRupiah(item.shu)}</td>
                                    <td class="py-3 px-4 text-right font-mono font-semibold ${item.pertumbuhan_nominal >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${nominalStr}</td>
                                    <td class="py-3 px-4 text-center font-mono font-bold ${item.pertumbuhan_persen >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${persenStr}</td>
                                    <td class="py-3 px-4 text-center">${badgeHtml}</td>
                                </tr>`;
                            }).join('')}
                            <!-- Baris Total & Rata-rata -->
                            <tr class="bg-gray-50/80 font-bold text-gray-900 border-t-2 border-gray-200">
                                <td class="py-3 px-4 uppercase">Total Akumulasi</td>
                                <td class="py-3 px-4 text-right font-mono text-emerald-700">${this.formatRupiah(r.total_pendapatan)}</td>
                                <td class="py-3 px-4 text-right font-mono text-rose-600">(${this.formatRupiah(r.total_beban)})</td>
                                <td class="py-3 px-4 text-right font-mono text-primary-800">${this.formatRupiah(r.total_shu)}</td>
                                <td colspan="3" class="py-3 px-4 text-center text-gray-400 font-normal italic">Akumulasi periode berjalan</td>
                            </tr>
                            <tr class="bg-gray-100 font-bold text-gray-900">
                                <td class="py-3 px-4 uppercase">Rata-Rata ${isBulanan ? 'Bulanan' : 'Tahunan'}</td>
                                <td class="py-3 px-4 text-right font-mono text-emerald-700">${this.formatRupiah(isBulanan ? r.rata_pendapatan_bulanan : r.rata_pendapatan_tahunan)}</td>
                                <td class="py-3 px-4 text-right font-mono text-rose-600">(${this.formatRupiah(isBulanan ? r.rata_beban_bulanan : r.rata_beban_tahunan)})</td>
                                <td class="py-3 px-4 text-right font-mono text-primary-800">${this.formatRupiah(isBulanan ? r.rata_shu_bulanan : r.rata_shu_tahunan)}</td>
                                <td colspan="2" class="py-3 px-4 text-center font-mono text-primary-700 font-bold">Rata Pertumbuhan: ${this.formatPersen(r.rata_pertumbuhan_persen)}</td>
                                <td class="py-3 px-4 text-center text-gray-400 font-normal">Selesai</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Tanda Tangan Print Browser -->
            <div class="hidden print:grid grid-cols-2 text-center text-xs mt-12 pt-8 border-t">
                <div>
                    <p class="mb-16">Mengetahui,<br><strong>Ketua Koperasi</strong></p>
                    <p class="font-bold underline">${App.settings?.ketua_koperasi?.value || 'Ketua Koperasi'}</p>
                </div>
                <div>
                    <p class="mb-16">Dibuat Oleh,<br><strong>Bagian Keuangan / Bendahara</strong></p>
                    <p class="font-bold underline">${App.user?.nama_lengkap || 'Bendahara'}</p>
                </div>
            </div>
        </div>`;
    },

    renderVisualBars(items) {
        // Cari nilai maksimum untuk penskalaan tinggi batang
        let maxVal = 100000;
        items.forEach(it => {
            if (it.pendapatan > maxVal) maxVal = it.pendapatan;
            if (it.total_beban > maxVal) maxVal = it.total_beban;
            if (Math.abs(it.shu) > maxVal) maxVal = Math.abs(it.shu);
        });

        return `
        <div class="overflow-x-auto pb-2">
            <div class="min-w-[680px] flex items-end justify-between gap-3 h-52 pt-8 px-2 border-b border-gray-200">
                ${items.map(it => {
                    const hPend = Math.min(100, Math.max(4, Math.round((it.pendapatan / maxVal) * 100)));
                    const hBeban = Math.min(100, Math.max(4, Math.round((it.total_beban / maxVal) * 100)));
                    const hShu = Math.min(100, Math.max(4, Math.round((Math.abs(it.shu) / maxVal) * 100)));
                    const isFuture = it.is_future === true;
                    const shuColor = it.shu >= 0 ? 'bg-primary-500' : 'bg-rose-600';

                    return `
                    <div class="flex-1 flex flex-col items-center gap-1 group relative ${isFuture ? 'opacity-30' : ''}">
                        <!-- Tooltip Popup -->
                        <div class="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-20 z-20 pointer-events-none bg-slate-900 text-white text-[10px] rounded-xl p-2 shadow-xl whitespace-nowrap">
                            <p class="font-bold border-b border-slate-700 pb-1">${it.periode}</p>
                            <p class="text-emerald-300">Pendapatan: ${this.formatRupiah(it.pendapatan)}</p>
                            <p class="text-rose-300">Beban: ${this.formatRupiah(it.total_beban)}</p>
                            <p class="text-primary-300 font-bold">SHU: ${this.formatRupiah(it.shu)}</p>
                        </div>

                        <!-- Bar Columns Group -->
                        <div class="w-full flex items-end justify-center gap-1 h-36">
                            <!-- Pendapatan -->
                            <div class="w-2.5 sm:w-3 bg-emerald-500 rounded-t-md transition-all group-hover:brightness-110" style="height: ${hPend}%" title="Pendapatan"></div>
                            <!-- Beban -->
                            <div class="w-2.5 sm:w-3 bg-rose-500 rounded-t-md transition-all group-hover:brightness-110" style="height: ${hBeban}%" title="Beban"></div>
                            <!-- SHU -->
                            <div class="w-2.5 sm:w-3 ${shuColor} rounded-t-md transition-all group-hover:brightness-110" style="height: ${hShu}%" title="SHU"></div>
                        </div>

                        <!-- Period Label -->
                        <span class="text-[10px] text-gray-500 font-medium truncate max-w-[50px] text-center mt-1">
                            ${it.periode.length > 5 ? it.periode.substring(0, 3) : it.periode}
                        </span>
                    </div>`;
                }).join('')}
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
        const items = d.items || [];
        const isBulanan = d.mode === 'bulanan';

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pw = doc.internal.pageSize.getWidth();

        const title = 'LAPORAN PERTUMBUHAN LABA / RUGI & TREN SHU';
        App.drawPDFHeader(doc, title);
        App.drawPDFFooter(doc);

        const subTitle = isBulanan 
            ? `Tahun Analisis: ${d.filter.tahun}  |  Model: Bulanan (Month-over-Month)`
            : `Rentang Analisis: ${d.filter.tahun_awal} s/d ${d.filter.tahun_akhir}  |  Model: Tahunan (Year-over-Year)`;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(subTitle, 14, 44);

        // Summary Cards
        const cards = [
            { label: 'Total Pendapatan', value: App.formatRupiah(r.total_pendapatan) },
            { label: 'Total Beban', value: App.formatRupiah(r.total_beban) },
            { label: 'SHU Bersih', value: App.formatRupiah(r.total_shu) },
            { label: 'Rata Pertumbuhan', value: this.formatPersen(r.rata_pertumbuhan_persen) }
        ];
        const curY = App.drawPDFSummaryCards(doc, cards, 48);

        // Table Data
        const tableBody = items.map(it => {
            const isFuture = it.is_future === true;
            const nominalStr = (isFuture || it.tren === 'awal') ? '-' : (it.pertumbuhan_nominal >= 0 ? '+' : '') + App.formatRupiah(it.pertumbuhan_nominal);
            const persenStr = (isFuture || it.tren === 'awal') ? '-' : this.formatPersen(it.pertumbuhan_persen);
            const statusStr = isFuture ? 'Belum Berjalan' : it.tren === 'naik' ? 'Naik' : it.tren === 'turun' ? 'Turun' : it.tren === 'awal' ? 'Basis Awal' : 'Stabil';

            return [
                it.periode,
                App.formatRupiah(it.pendapatan),
                `(${App.formatRupiah(it.total_beban)})`,
                App.formatRupiah(it.shu),
                nominalStr,
                persenStr,
                statusStr
            ];
        });

        // Add Total & Average rows
        tableBody.push([
            'TOTAL AKUMULASI',
            App.formatRupiah(r.total_pendapatan),
            `(${App.formatRupiah(r.total_beban)})`,
            App.formatRupiah(r.total_shu),
            '-',
            '-',
            'Selesai'
        ]);
        tableBody.push([
            `RATA-RATA ${isBulanan ? 'BULANAN' : 'TAHUNAN'}`,
            App.formatRupiah(isBulanan ? r.rata_pendapatan_bulanan : r.rata_pendapatan_tahunan),
            `(${App.formatRupiah(isBulanan ? r.rata_beban_bulanan : r.rata_beban_tahunan)})`,
            App.formatRupiah(isBulanan ? r.rata_shu_bulanan : r.rata_shu_tahunan),
            '-',
            this.formatPersen(r.rata_pertumbuhan_persen),
            '-'
        ]);

        doc.autoTable({
            startY: curY + 4,
            head: [['Periode', 'Pendapatan', 'Beban Usaha', 'SHU Bersih', 'Pertumbuhan (Rp)', 'Pertumbuhan (%)', 'Tren']],
            body: tableBody,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
            bodyStyles: { fontSize: 7.5, cellPadding: 2.2, textColor: [51, 65, 85] },
            columnStyles: {
                0: { cellWidth: 26, fontStyle: 'bold' },
                1: { cellWidth: 30, halign: 'right' },
                2: { cellWidth: 30, halign: 'right' },
                3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
                4: { cellWidth: 28, halign: 'right' },
                5: { cellWidth: 22, halign: 'center' },
                6: { cellWidth: 'auto', halign: 'center' }
            },
            margin: { left: 14, right: 14, top: 46, bottom: 20 },
            didParseCell: (data) => {
                // Highlight Total & Average rows
                if (data.section === 'body' && (data.row.index === tableBody.length - 2 || data.row.index === tableBody.length - 1)) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [241, 245, 249];
                }
                // Color growth status
                if (data.section === 'body' && data.column.index === 5) {
                    const str = String(data.cell.raw || '');
                    if (str.startsWith('+')) data.cell.styles.textColor = [21, 128, 61];
                    else if (str.startsWith('-')) data.cell.styles.textColor = [185, 28, 28];
                }
            },
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
        const r = d.ringkasan;
        const items = d.items || [];
        const isBulanan = d.mode === 'bulanan';
        const namaKop = App.settings?.nama_koperasi?.value || App.settings?.app_name?.value || 'KOPERASI';

        let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
        csv += "LAPORAN PERTUMBUHAN LABA / RUGI & TREN SHU\r\n";
        csv += `"${namaKop}"\r\n`;
        csv += `Model Analisis,${isBulanan ? 'Bulanan (MoM)' : 'Tahunan (YoY)'}\r\n`;
        csv += `Periode,${isBulanan ? 'Tahun ' + d.filter.tahun : d.filter.tahun_awal + ' s/d ' + d.filter.tahun_akhir}\r\n`;
        csv += `Tanggal Unduh,${new Date().toLocaleString('id-ID')}\r\n\r\n`;

        csv += "Periode,Pendapatan (Rp),Beban Usaha (Rp),SHU Bersih (Rp),Pertumbuhan Nominal (Rp),Pertumbuhan (%),Status Tren\r\n";

        items.forEach(it => {
            const isFuture = it.is_future === true;
            const nomStr = (isFuture || it.tren === 'awal') ? '0' : it.pertumbuhan_nominal;
            const pctStr = (isFuture || it.tren === 'awal') ? '0%' : `${it.pertumbuhan_persen}%`;
            const statusStr = isFuture ? 'Belum Berjalan' : it.tren === 'naik' ? 'Naik' : it.tren === 'turun' ? 'Turun' : it.tren === 'awal' ? 'Basis Awal' : 'Stabil';

            csv += `"${it.periode}",${it.pendapatan},${it.total_beban},${it.shu},${nomStr},"${pctStr}","${statusStr}"\r\n`;
        });

        csv += `\r\n"TOTAL AKUMULASI",${r.total_pendapatan},${r.total_beban},${r.total_shu},,,\r\n`;
        csv += `"RATA-RATA ${isBulanan ? 'BULANAN' : 'TAHUNAN'}",${isBulanan ? r.rata_pendapatan_bulanan : r.rata_pendapatan_tahunan},${isBulanan ? r.rata_beban_bulanan : r.rata_beban_tahunan},${isBulanan ? r.rata_shu_bulanan : r.rata_shu_tahunan},,"${r.rata_pertumbuhan_persen}%",\r\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fname = isBulanan ? `Pertumbuhan_Laba_Rugi_Bulanan_${d.filter.tahun}.csv` : `Pertumbuhan_Laba_Rugi_Tahunan_${d.filter.tahun_awal}_${d.filter.tahun_akhir}.csv`;
        a.download = fname;
        a.click();
        URL.revokeObjectURL(url);
    },

    // Aliases
    cetakPDF() { this.exportPDF(); }
};

window.PertumbuhanLabaRugiPage = PertumbuhanLabaRugiPage;
export default PertumbuhanLabaRugiPage;
