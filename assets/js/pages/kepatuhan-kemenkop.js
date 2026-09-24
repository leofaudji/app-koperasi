// ============================================================
// Kepatuhan Regulasi Kemenkop UKM (KUK & ODS)
// Berdasarkan Permenkop UKM No. 2/2024 & Permenkop UKM No. 9/2020
// ============================================================

const KepatuhanKemenkopPage = {
    data: null,
    tahun: '',

    formatRupiah(num) {
        const val = Number(num) || 0;
        const sign = val < 0 ? '-' : '';
        return sign + 'Rp ' + Math.abs(val).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    },

    formatPersen(num) {
        return (Number(num) || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
    },

    async render(container) {
        App.setTitle('Kepatuhan Kemenkop UKM', 'Klasifikasi Usaha Koperasi (KUK) & Standar Pelaporan ODS');

        const tahunIni = new Date().getFullYear();
        this.tahun = String(tahunIni);
        const tahunOpts = Array.from({ length: 5 }, (_, i) => tahunIni - i)
            .map(y => `<option value="${y}" ${y === tahunIni ? 'selected' : ''}>${y}</option>`).join('');

        container.innerHTML = `
        <div class="space-y-6 animate-fadeIn pb-12">
            <!-- Filter Bar -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div class="flex flex-col sm:flex-row items-end justify-between gap-4">
                    <div class="flex items-end gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 mb-1.5">Tahun Buku / Evaluasi</label>
                            <select id="km-tahun" onchange="KepatuhanKemenkopPage.load()"
                                class="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 min-w-[140px]">
                                ${tahunOpts}
                            </select>
                        </div>
                        <button onclick="KepatuhanKemenkopPage.load()"
                            class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
                            <i class="ri-government-line"></i> Evaluasi Kepatuhan
                        </button>
                    </div>

                    <div class="flex items-center gap-2">
                        <button onclick="KepatuhanKemenkopPage.exportPDF()"
                            class="bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all" title="Download / Cetak PDF">
                            <i class="ri-file-pdf-line text-base"></i> Cetak PDF
                        </button>
                        <button onclick="KepatuhanKemenkopPage.exportExcel()"
                            class="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all" title="Ekspor Format ODS (CSV / Excel)">
                            <i class="ri-file-excel-line text-base"></i> Ekspor Excel (ODS)
                        </button>
                        <button onclick="window.print()"
                            class="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors" title="Print Halaman">
                            <i class="ri-printer-line text-lg"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Content Area -->
            <div id="km-content">
                <div class="flex items-center justify-center h-48 bg-white rounded-2xl border border-gray-100">
                    <div class="flex flex-col items-center gap-3">
                        <div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
                        <p class="text-sm text-gray-400 font-medium">Mengevaluasi data kepatuhan Kemenkop...</p>
                    </div>
                </div>
            </div>
        </div>`;

        await this.load();
    },

    async load() {
        const tahunEl = document.getElementById('km-tahun');
        if (tahunEl) this.tahun = tahunEl.value;

        const content = document.getElementById('km-content');
        if (!content) return;

        content.innerHTML = `
        <div class="flex items-center justify-center h-48 bg-white rounded-2xl border border-gray-100">
            <div class="flex flex-col items-center gap-3">
                <div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
                <p class="text-sm text-gray-400 font-medium">Memuat evaluasi kepatuhan Kemenkop tahun ${this.tahun}...</p>
            </div>
        </div>`;

        const res = await App.api(`kemenkop?tahun=${this.tahun}`);
        if (!res?.success) {
            content.innerHTML = `
            <div class="bg-white rounded-2xl border border-red-100 p-8 text-center text-gray-500">
                <i class="ri-error-warning-line text-4xl text-rose-500"></i>
                <p class="mt-2 font-semibold text-gray-700">Gagal memuat Data Kepatuhan</p>
                <p class="text-xs text-gray-400 mt-1">${res?.message || 'Terjadi kesalahan pada server'}</p>
            </div>`;
            return;
        }

        this.data = res.data;
        this.renderDashboard(content);
    },

    renderDashboard(content) {
        const d = this.data;
        const kuk = d.kuk;
        const p = d.prudensial;
        const prof = d.profil;
        const kb = d.kelembagaan;

        const kukGradients = {
            1: 'from-blue-600 to-indigo-700',
            2: 'from-teal-600 to-emerald-700',
            3: 'from-purple-600 to-indigo-800',
            4: 'from-amber-600 to-orange-700'
        };
        const grad = kukGradients[kuk.level] || 'from-primary-600 to-primary-800';

        content.innerHTML = `
        <div id="print-kemenkop" class="space-y-6">
            <!-- Kop Cetak PDF Browser -->
            <div class="hidden print:block text-center border-b pb-4 mb-4">
                <h1 class="text-xl font-bold uppercase tracking-wider text-gray-900">${prof.nama_koperasi}</h1>
                <p class="text-xs text-gray-500">No. Badan Hukum: ${prof.badan_hukum} | NIK ODS: ${prof.nik_koperasi}</p>
                <p class="text-xs text-gray-500">${prof.alamat} | Telp: ${prof.telepon}</p>
                <h2 class="text-base font-bold text-gray-800 mt-2 uppercase">LAPORAN KEPATUHAN REGULASI KEMENKOP UKM & ODS TAHUN ${d.tahun}</h2>
            </div>

            <!-- Hero: Klasifikasi Usaha Koperasi (KUK) Badge & Overview -->
            <div class="bg-gradient-to-br ${grad} text-white rounded-3xl p-6 sm:p-8 shadow-md relative overflow-hidden">
                <div class="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div class="space-y-2 max-w-2xl">
                        <div class="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white uppercase tracking-wider">
                            <i class="ri-award-line"></i> Permenkop UKM No. 2 Tahun 2024
                        </div>
                        <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight">${kuk.info.label}</h2>
                        <p class="text-white/90 text-sm leading-relaxed">${kuk.info.ketentuan}</p>
                        
                        <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 text-xs">
                            <div class="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                                <span class="text-white/70 block">Wilayah Usaha:</span>
                                <span class="font-semibold">${kuk.info.wilayah}</span>
                            </div>
                            <div class="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs">
                                <span class="text-white/70 block">Jangkauan Layanan:</span>
                                <span class="font-semibold">${kuk.info.pelayanan}</span>
                            </div>
                            <div class="bg-white/10 rounded-xl p-2.5 backdrop-blur-xs col-span-2 sm:col-span-1">
                                <span class="text-white/70 block">Status Pelaksanaan RAT:</span>
                                <span class="font-semibold">${kb.status_rat}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Tier Breakdown Cards -->
                    <div class="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/15 min-w-[260px] space-y-3 shrink-0">
                        <span class="text-xs font-bold uppercase tracking-wider text-white/80 block border-b border-white/15 pb-1.5">Parameter Penentu KUK:</span>
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-white/80">Jumlah Anggota (${kuk.detail_tier.anggota.nilai} org):</span>
                            <span class="bg-white/20 px-2 py-0.5 rounded font-bold">Tier ${kuk.detail_tier.anggota.tier}</span>
                        </div>
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-white/80">Modal Sendiri (${this.formatRupiah(kuk.detail_tier.modal.nilai)}):</span>
                            <span class="bg-white/20 px-2 py-0.5 rounded font-bold">Tier ${kuk.detail_tier.modal.tier}</span>
                        </div>
                        <div class="flex items-center justify-between text-xs">
                            <span class="text-white/80">Total Aset (${this.formatRupiah(kuk.detail_tier.aset.nilai)}):</span>
                            <span class="bg-white/20 px-2 py-0.5 rounded font-bold">Tier ${kuk.detail_tier.aset.tier}</span>
                        </div>
                        <div class="pt-2 border-t border-white/15 text-[11px] text-white/70">
                            *Level KUK ditetapkan berdasarkan parameter tertinggi untuk kepatuhan regulasi.
                        </div>
                    </div>
                </div>
            </div>

            <!-- Grid Indikator Kepatuhan & Rasio Prudensial Kemenkop -->
            <div class="space-y-3">
                <div class="flex items-center justify-between">
                    <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <i class="ri-shield-keyhole-line text-primary-600"></i> Batas Prudensial & Kepatuhan Kehati-hatian
                    </h3>
                    <span class="text-xs text-gray-500 font-medium">Standar Pengawasan Kemenkop UKM</span>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <!-- 1. BMPP -->
                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative space-y-3">
                        <div class="flex items-start justify-between gap-2">
                            <div>
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider block">BMPP (Maks. 20%)</span>
                                <h4 class="font-bold text-gray-900 text-sm mt-0.5">Batas Pinjaman Perorangan</h4>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${p.bmpp.color === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                                ${p.bmpp.status}
                            </span>
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span class="text-2xl font-extrabold font-mono ${p.bmpp.color === 'success' ? 'text-emerald-600' : 'text-rose-600'}">${this.formatPersen(p.bmpp.nilai)}</span>
                            <span class="text-xs text-gray-400">dari Modal Sendiri</span>
                        </div>
                        <div class="text-xs text-gray-500 space-y-1 bg-gray-50 p-2.5 rounded-xl">
                            <div class="flex justify-between"><span>Debitur Terbesar:</span><span class="font-semibold text-gray-700 truncate max-w-[140px]">${p.bmpp.peminjam}</span></div>
                            <div class="flex justify-between"><span>Baki Debet Pinjaman:</span><span class="font-mono text-gray-700">${this.formatRupiah(p.bmpp.sisa_pinjaman)}</span></div>
                        </div>
                    </div>

                    <!-- 2. Likuiditas (Cash Ratio) -->
                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative space-y-3">
                        <div class="flex items-start justify-between gap-2">
                            <div>
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Likuiditas (Min. 10%)</span>
                                <h4 class="font-bold text-gray-900 text-sm mt-0.5">Rasio Kas thd Kewajiban Lancar</h4>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${p.likuiditas.color === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                                ${p.likuiditas.status}
                            </span>
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span class="text-2xl font-extrabold font-mono text-primary-600">${this.formatPersen(p.likuiditas.nilai)}</span>
                            <span class="text-xs text-gray-400">Standar: Min. 10 - 15%</span>
                        </div>
                        <div class="text-xs text-gray-500 space-y-1 bg-gray-50 p-2.5 rounded-xl">
                            <div class="flex justify-between"><span>Kas & Bank:</span><span class="font-mono text-gray-700">${this.formatRupiah(p.likuiditas.kas_bank)}</span></div>
                            <div class="flex justify-between"><span>Kewajiban Lancar:</span><span class="font-mono text-gray-700">${this.formatRupiah(p.likuiditas.kewajiban_lancar)}</span></div>
                        </div>
                    </div>

                    <!-- 3. Solvabilitas -->
                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative space-y-3">
                        <div class="flex items-start justify-between gap-2">
                            <div>
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Solvabilitas (Min. 20%)</span>
                                <h4 class="font-bold text-gray-900 text-sm mt-0.5">Modal Sendiri thd Aset</h4>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                                ${p.solvabilitas.status}
                            </span>
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span class="text-2xl font-extrabold font-mono text-emerald-600">${this.formatPersen(p.solvabilitas.nilai)}</span>
                            <span class="text-xs text-gray-400">Standar: Min. 20 - 30%</span>
                        </div>
                        <div class="text-xs text-gray-500 space-y-1 bg-gray-50 p-2.5 rounded-xl">
                            <div class="flex justify-between"><span>Modal Sendiri:</span><span class="font-mono text-gray-700">${this.formatRupiah(p.solvabilitas.modal_sendiri)}</span></div>
                            <div class="flex justify-between"><span>Total Aset Koperasi:</span><span class="font-mono text-gray-700">${this.formatRupiah(p.solvabilitas.total_aset)}</span></div>
                        </div>
                    </div>

                    <!-- 4. NPL (Non Performing Loan) -->
                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative space-y-3">
                        <div class="flex items-start justify-between gap-2">
                            <div>
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Kualitas Kredit (Maks. 5%)</span>
                                <h4 class="font-bold text-gray-900 text-sm mt-0.5">Rasio Kredit Macet / NPL</h4>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${p.npl.color === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                                ${p.npl.status}
                            </span>
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span class="text-2xl font-extrabold font-mono ${p.npl.color === 'success' ? 'text-emerald-600' : 'text-rose-600'}">${this.formatPersen(p.npl.nilai)}</span>
                            <span class="text-xs text-gray-400">Toleransi: Maks. 5%</span>
                        </div>
                        <div class="text-xs text-gray-500 space-y-1 bg-gray-50 p-2.5 rounded-xl">
                            <div class="flex justify-between"><span>Baki Bermasalah:</span><span class="font-mono text-rose-600 font-semibold">${this.formatRupiah(p.npl.bermasalah)}</span></div>
                            <div class="flex justify-between"><span>Total Baki Debet:</span><span class="font-mono text-gray-700">${this.formatRupiah(p.npl.total_baki_debet)}</span></div>
                        </div>
                    </div>

                    <!-- 5. Kemandirian Modal -->
                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative space-y-3">
                        <div class="flex items-start justify-between gap-2">
                            <div>
                                <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Kemandirian Usaha</span>
                                <h4 class="font-bold text-gray-900 text-sm mt-0.5">Modal Sendiri vs Modal Luar</h4>
                            </div>
                            <span class="px-2.5 py-1 rounded-full text-xs font-bold ${p.kemandirian.color === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                                ${p.kemandirian.status}
                            </span>
                        </div>
                        <div class="flex items-baseline gap-2">
                            <span class="text-2xl font-extrabold font-mono text-primary-600">${this.formatPersen(p.kemandirian.nilai)}</span>
                            <span class="text-xs text-gray-400">Standar: >= 100%</span>
                        </div>
                        <p class="text-xs text-gray-500">Menunjukkan kemampuan pembiayaan usaha koperasi yang bersumber dari partisipasi modal anggota sendiri.</p>
                    </div>

                    <!-- 6. Rentabilitas Modal & Aset -->
                    <div class="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm relative space-y-3">
                        <div>
                            <span class="text-xs font-semibold text-gray-400 uppercase tracking-wider block">Kinerja Profitabilitas</span>
                            <h4 class="font-bold text-gray-900 text-sm mt-0.5">ROE & ROA Koperasi</h4>
                        </div>
                        <div class="grid grid-cols-2 gap-3 pt-1">
                            <div class="bg-gray-50 p-2.5 rounded-xl">
                                <span class="text-[11px] text-gray-400 block font-medium">Return on Equity (ROE):</span>
                                <span class="text-lg font-bold font-mono ${p.roe.nilai >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${this.formatPersen(p.roe.nilai)}</span>
                            </div>
                            <div class="bg-gray-50 p-2.5 rounded-xl">
                                <span class="text-[11px] text-gray-400 block font-medium">Return on Asset (ROA):</span>
                                <span class="text-lg font-bold font-mono ${p.roa.nilai >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${this.formatPersen(p.roa.nilai)}</span>
                            </div>
                        </div>
                        <div class="flex justify-between text-xs text-gray-500 pt-1">
                            <span>Sisa Hasil Usaha (SHU):</span>
                            <span class="font-mono font-bold ${d.phu_ringkas.shu >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${this.formatRupiah(d.phu_ringkas.shu)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Matriks Data Pelaporan ODS (Online Data System) Kemenkop -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 class="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center gap-2">
                        <i class="ri-database-2-line text-primary-600"></i> Matriks Data Profil & Keuangan ODS Kemenkop UKM
                    </h3>
                    <span class="text-xs text-gray-500 font-medium">Tahun Buku: ${d.tahun}</span>
                </div>

                <div class="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                    <!-- Kolom Kiri: Kelembagaan -->
                    <div class="space-y-4">
                        <h4 class="font-bold text-gray-900 border-b pb-2 text-xs uppercase tracking-wider text-primary-700">A. Data Kelembagaan & Legalitas</h4>
                        <div class="divide-y divide-gray-100 text-gray-700">
                            <div class="py-2 flex justify-between"><span class="text-gray-500">Nama Resmi Koperasi:</span><span class="font-semibold text-gray-900">${prof.nama_koperasi}</span></div>
                            <div class="py-2 flex justify-between"><span class="text-gray-500">Nomor Badan Hukum:</span><span class="font-mono font-medium">${prof.badan_hukum}</span></div>
                            <div class="py-2 flex justify-between"><span class="text-gray-500">Nomor Induk Koperasi (NIK ODS):</span><span class="font-mono font-semibold text-primary-700">${prof.nik_koperasi}</span></div>
                            <div class="py-2 flex justify-between"><span class="text-gray-500">Tahun Pendirian:</span><span>${prof.tahun_berdiri}</span></div>
                            <div class="py-2 flex justify-between"><span class="text-gray-500">Alamat Kantor:</span><span class="text-right max-w-xs">${prof.alamat}</span></div>
                            <div class="py-2 flex justify-between"><span class="text-gray-500">Ketua Pengurus:</span><span class="font-semibold">${prof.ketua}</span></div>
                            <div class="py-2 flex justify-between"><span class="text-gray-500">Ketua Pengawas:</span><span>${prof.pengawas}</span></div>
                            <div class="py-2 flex justify-between"><span class="text-gray-500">Manajer / Pengelola:</span><span>${prof.manajer}</span></div>
                            <div class="py-2 flex justify-between bg-primary-50/50 px-2 rounded"><span class="text-gray-700 font-medium">Total Anggota Aktif:</span><span class="font-bold text-primary-800">${kb.total_anggota} Orang (${kb.anggota_pria} Pria, ${kb.anggota_wanita} Wanita)</span></div>
                        </div>
                    </div>

                    <!-- Kolom Kanan: Finansial ODS -->
                    <div class="space-y-4">
                        <h4 class="font-bold text-gray-900 border-b pb-2 text-xs uppercase tracking-wider text-primary-700">B. Ringkasan Kinerja Finansial ODS</h4>
                        <div class="divide-y divide-gray-100 text-gray-700 font-mono">
                            <div class="py-2 flex justify-between font-sans"><span class="text-gray-500 font-sans">Total Aset Koperasi:</span><span class="font-bold text-gray-900">${this.formatRupiah(d.neraca_ringkas.total_aset)}</span></div>
                            <div class="py-2 flex justify-between font-sans"><span class="text-gray-500 font-sans">Modal Sendiri (Ekuitas):</span><span class="font-bold text-emerald-700">${this.formatRupiah(d.neraca_ringkas.modal_sendiri)}</span></div>
                            <div class="py-2 flex justify-between font-sans"><span class="text-gray-500 font-sans">Modal Luar (Kewajiban):</span><span class="text-gray-800">${this.formatRupiah(d.neraca_ringkas.total_kewajiban)}</span></div>
                            <div class="py-2 flex justify-between font-sans"><span class="text-gray-500 font-sans">Volume Usaha (Penyaluran Pinjaman):</span><span class="text-gray-800">${this.formatRupiah(d.operasional_pinjaman.total_penyaluran)}</span></div>
                            <div class="py-2 flex justify-between font-sans"><span class="text-gray-500 font-sans">Baki Debet Pinjaman Beredar:</span><span class="text-gray-800">${this.formatRupiah(d.operasional_pinjaman.baki_debet_aktif)}</span></div>
                            <div class="py-2 flex justify-between font-sans"><span class="text-gray-500 font-sans">Total Simpanan Pokok & Wajib:</span><span class="text-gray-800">${this.formatRupiah(d.neraca_ringkas.simpanan_pokok_wajib)}</span></div>
                            <div class="py-2 flex justify-between font-sans"><span class="text-gray-500 font-sans">Pendapatan Koperasi (Omset):</span><span class="text-gray-800">${this.formatRupiah(d.phu_ringkas.total_pendapatan)}</span></div>
                            <div class="py-2 flex justify-between font-sans"><span class="text-gray-500 font-sans">Beban Operasional & Organisasi:</span><span class="text-rose-600">(${this.formatRupiah(d.phu_ringkas.total_beban)})</span></div>
                            <div class="py-2 flex justify-between bg-emerald-50 px-2 rounded font-sans"><span class="font-bold text-emerald-900 font-sans">Sisa Hasil Usaha (SHU):</span><span class="font-bold ${d.phu_ringkas.shu >= 0 ? 'text-emerald-700' : 'text-rose-700'}">${this.formatRupiah(d.phu_ringkas.shu)}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tanda Tangan Khusus Print Browser -->
            <div class="hidden print:grid grid-cols-2 text-center text-xs mt-12 pt-8 border-t">
                <div>
                    <p class="mb-16">Pengawas Koperasi,<br><strong>Ketua Pengawas</strong></p>
                    <p class="font-bold underline">${prof.pengawas}</p>
                </div>
                <div>
                    <p class="mb-16">Pengurus Koperasi,<br><strong>Ketua Koperasi</strong></p>
                    <p class="font-bold underline">${prof.ketua}</p>
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
        const prof = d.profil;
        const kb = d.kelembagaan;
        const kuk = d.kuk;
        const p = d.prudensial;
        const nr = d.neraca_ringkas;
        const phu = d.phu_ringkas;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');

        const title = 'LAPORAN EVALUASI KEPATUHAN KEMENKOP UKM';
        App.drawPDFHeader(doc, title);
        App.drawPDFFooter(doc);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`Tahun Evaluasi: ${d.tahun}  |  Standar: Permenkop UKM No. 2/2024 & Permenkop UKM No. 9/2020`, 14, 44);

        const cards = [
            { label: 'Tingkat KUK', value: `KUK ${kuk.level}` },
            { label: 'Total Aset', value: App.formatRupiah(nr.total_aset) },
            { label: 'Modal Sendiri', value: App.formatRupiah(nr.modal_sendiri) },
            { label: 'Sisa Hasil Usaha', value: App.formatRupiah(phu.shu) }
        ];
        const curY = App.drawPDFSummaryCards(doc, cards, 48);

        // Tabel I: 7 Indikator Kepatuhan Prudensial
        const bodyPrudensial = [
            ['1. Batas Maks. Pinjaman (BMPP)', `${p.bmpp.nilai}%`, 'Maks. 20%', p.bmpp.status],
            ['2. Rasio Likuiditas (Cash Ratio)', `${p.likuiditas.nilai}%`, 'Min. 10 - 15%', p.likuiditas.status],
            ['3. Rasio Solvabilitas', `${p.solvabilitas.nilai}%`, 'Min. 20 - 30%', p.solvabilitas.status],
            ['4. Rasio Kredit Bermasalah (NPL)', `${p.npl.nilai}%`, 'Maks. 5.00%', p.npl.status],
            ['5. Kemandirian Modal (Modal Sendiri/Luar)', `${p.kemandirian.nilai}%`, '>= 100%', p.kemandirian.status],
            ['6. Rentabilitas Modal Sendiri (ROE)', `${p.roe.nilai}%`, 'Positif', p.roe.nilai >= 0 ? 'Baik' : 'Perhatian'],
            ['7. Rentabilitas Aset Koperasi (ROA)', `${p.roa.nilai}%`, 'Positif', p.roa.nilai >= 0 ? 'Baik' : 'Perhatian'],
        ];

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('I. INDIKATOR KEPATUHAN PRUDENSIAL KEMENKOP UKM', 14, curY + 4);

        doc.autoTable({
            startY: curY + 6,
            head: [['Indikator Rasio Prudensial', 'Nilai Riil', 'Batas Regulasi', 'Status Kepatuhan']],
            body: bodyPrudensial,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
            bodyStyles: { fontSize: 7.5, cellPadding: 2.5, textColor: [51, 65, 85] },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { cellWidth: 28, halign: 'center', fontStyle: 'bold' },
                2: { cellWidth: 32, halign: 'center' },
                3: { cellWidth: 38, halign: 'center', fontStyle: 'bold' }
            },
            margin: { left: 14, right: 14, top: 46, bottom: 20 },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 3) {
                    const text = String(data.cell.raw || '');
                    if (text.includes('Aman') || text.includes('Sehat') || text.includes('Sangat Solvabel') || text.includes('Mandiri') || text.includes('Baik')) {
                        data.cell.styles.textColor = [21, 128, 61];
                    } else if (text.includes('Rawan') || text.includes('Buruk') || text.includes('Perhatian')) {
                        data.cell.styles.textColor = [185, 28, 28];
                    }
                }
            },
            didDrawPage: () => {
                App.drawPDFHeader(doc, title);
                App.drawPDFFooter(doc);
            }
        });

        const nextY = doc.lastAutoTable.finalY + 6;

        // Tabel II: Matriks Data ODS
        const bodyODS = [
            ['Nama Koperasi & NIK ODS', `${prof.nama_koperasi} (NIK: ${prof.nik_koperasi})`],
            ['Nomor Badan Hukum', prof.badan_hukum],
            ['Alamat / Kontak', `${prof.alamat} | Telp: ${prof.telepon}`],
            ['Pengurus & Pengawas', `Ketua: ${prof.ketua} | Pengawas: ${prof.pengawas} | Manajer: ${prof.manajer}`],
            ['Total Anggota', `${kb.total_anggota} Orang (${kb.anggota_pria} Pria, ${kb.anggota_wanita} Wanita) | RAT: ${kb.status_rat}`],
            ['Total Aset Koperasi', App.formatRupiah(nr.total_aset)],
            ['Kas & Bank (Aktiva Lancar)', App.formatRupiah(nr.kas_bank)],
            ['Piutang Pinjaman Anggota', App.formatRupiah(nr.piutang_pinjaman)],
            ['Total Kewajiban (Hutang)', App.formatRupiah(nr.total_kewajiban)],
            ['Modal Sendiri (Ekuitas)', App.formatRupiah(nr.modal_sendiri)],
            ['Volume Penyaluran Pinjaman', App.formatRupiah(d.operasional_pinjaman.total_penyaluran)],
            ['Total Pendapatan (Omzet)', App.formatRupiah(phu.total_pendapatan)],
            ['Total Beban Operasional & Pajak', App.formatRupiah(phu.total_beban)],
            ['Sisa Hasil Usaha (SHU)', App.formatRupiah(phu.shu)]
        ];

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('II. MATRIKS DATA KELEMBAGAAN & FINANSIAL ODS', 14, nextY);

        doc.autoTable({
            startY: nextY + 2,
            head: [['Parameter Pelaporan ODS', 'Nilai / Keterangan Pelaporan']],
            body: bodyODS,
            theme: 'plain',
            headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'left' },
            bodyStyles: { fontSize: 7.5, cellPadding: 2.2, textColor: [51, 65, 85], lineColor: [241, 245, 249], lineWidth: 0.1 },
            columnStyles: {
                0: { cellWidth: 65, fontStyle: 'bold' },
                1: { cellWidth: 'auto' }
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
        const prof = d.profil;
        const kb = d.kelembagaan;
        const nr = d.neraca_ringkas;
        const phu = d.phu_ringkas;
        const p = d.prudensial;

        let csv = '\uFEFF'; // UTF-8 BOM for Microsoft Excel
        csv += "DATA KEPATUHAN & PELAPORAN ODS KEMENKOP UKM\r\n";
        csv += `Tahun Evaluasi,${d.tahun}\r\n`;
        csv += `Klasifikasi KUK,"${d.kuk.info.label}"\r\n`;
        csv += `Tanggal Unduh,${new Date().toLocaleString('id-ID')}\r\n\r\n`;

        csv += "I. DATA KELEMBAGAAN & LEGALITAS KOPERASI,Keterangan\r\n";
        csv += `"Nama Resmi Koperasi","${prof.nama_koperasi}"\r\n`;
        csv += `"Nomor Badan Hukum","${prof.badan_hukum}"\r\n`;
        csv += `"Nomor Induk Koperasi (NIK ODS)","${prof.nik_koperasi}"\r\n`;
        csv += `"Tahun Berdiri",${prof.tahun_berdiri}\r\n`;
        csv += `"Alamat","${prof.alamat}"\r\n`;
        csv += `"Nomor Telepon","${prof.telepon}"\r\n`;
        csv += `"Email","${prof.email}"\r\n`;
        csv += `"Ketua Pengurus","${prof.ketua}"\r\n`;
        csv += `"Ketua Pengawas","${prof.pengawas}"\r\n`;
        csv += `"Manajer / Pengelola","${prof.manajer}"\r\n`;
        csv += `"Jumlah Total Anggota",${kb.total_anggota}\r\n`;
        csv += `"Anggota Pria",${kb.anggota_pria}\r\n`;
        csv += `"Anggota Wanita",${kb.anggota_wanita}\r\n`;
        csv += `"Anggota Baru Tahun Ini",${kb.anggota_baru}\r\n`;
        csv += `"Status Pelaksanaan RAT","${kb.status_rat}"\r\n\r\n`;

        csv += "II. DATA KINERJA KEUANGAN ODS,Nominal (Rp)\r\n";
        csv += `"Total Aset Koperasi",${nr.total_aset}\r\n`;
        csv += `"Kas & Bank (Aktiva Lancar)",${nr.kas_bank}\r\n`;
        csv += `"Piutang Pinjaman Anggota",${nr.piutang_pinjaman}\r\n`;
        csv += `"Penyertaan Jangka Panjang",${nr.penyertaan}\r\n`;
        csv += `"Aktiva Tetap",${nr.aktiva_tetap}\r\n`;
        csv += `"Kewajiban Lancar",${nr.kewajiban_lancar}\r\n`;
        csv += `"Kewajiban Jangka Panjang",${nr.kewajiban_panjang}\r\n`;
        csv += `"Total Kewajiban (Modal Luar)",${nr.total_kewajiban}\r\n`;
        csv += `"Simpanan Pokok & Wajib",${nr.simpanan_pokok_wajib}\r\n`;
        csv += `"Modal Sendiri (Ekuitas)",${nr.modal_sendiri}\r\n`;
        csv += `"Volume Penyaluran Pinjaman",${d.operasional_pinjaman.total_penyaluran}\r\n`;
        csv += `"Baki Debet Pinjaman",${d.operasional_pinjaman.baki_debet_aktif}\r\n`;
        csv += `"Baki Debet Bermasalah",${d.operasional_pinjaman.baki_bermasalah}\r\n`;
        csv += `"Total Pendapatan Koperasi",${phu.total_pendapatan}\r\n`;
        csv += `"Total Beban Koperasi",${phu.total_beban}\r\n`;
        csv += `"Sisa Hasil Usaha (SHU)",${phu.shu}\r\n\r\n`;

        csv += "III. INDIKATOR KEPATUHAN PRUDENSIAL,Nilai Riil (%),Batas Standar,Status Kepatuhan\r\n";
        csv += `"Batas Maksimum Pinjaman (BMPP)",${p.bmpp.nilai}%,"Maks. 20%","${p.bmpp.status}"\r\n`;
        csv += `"Rasio Likuiditas (Cash Ratio)",${p.likuiditas.nilai}%,"Min. 10 - 15%","${p.likuiditas.status}"\r\n`;
        csv += `"Rasio Solvabilitas",${p.solvabilitas.nilai}%,"Min. 20 - 30%","${p.solvabilitas.status}"\r\n`;
        csv += `"Kredit Bermasalah (NPL)",${p.npl.nilai}%,"Maks. 5.00%","${p.npl.status}"\r\n`;
        csv += `"Kemandirian Modal",${p.kemandirian.nilai}%,"Min. 100%","${p.kemandirian.status}"\r\n`;
        csv += `"Rentabilitas Modal Sendiri (ROE)",${p.roe.nilai}%,"Positif","-"\r\n`;
        csv += `"Rentabilitas Aset (ROA)",${p.roa.nilai}%,"Positif","-"\r\n`;

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Laporan_Kepatuhan_ODS_Kemenkop_${d.tahun}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // Aliases for compatibility
    cetakPDF() { this.exportPDF(); },
    exportODS() { this.exportExcel(); },
    export(type) {
        if (type === 'pdf') this.exportPDF();
        else this.exportExcel();
    }
};

window.KepatuhanKemenkopPage = KepatuhanKemenkopPage;
export default KepatuhanKemenkopPage;
