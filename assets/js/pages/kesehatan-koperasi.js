// ============================================================
// Pemeriksaan Tingkat Kesehatan Koperasi
// Berdasarkan Permenkop UKM No. 9 Tahun 2020 jo. Permenkop UKM No. 2 Tahun 2024 & Permenkop UKM No. 8 Tahun 2023
// Instrumen: Kertas Kerja Pemeriksaan Kesehatan Koperasi (KKPKK) 4 Aspek
// ============================================================

const KesehatanKoperasiPage = {
    hasilData: null,

    async render(container) {
        App.setTitle('Tingkat Kesehatan Koperasi', 'Pemeriksaan Kesehatan Berdasarkan Permenkop UKM No. 9/2020 jo. Permenkop UKM No. 2/2024 (KKPKK)');

        const tahunIni = new Date().getFullYear();
        const tahunOpts = Array.from({ length: 5 }, (_, i) => tahunIni - i)
            .map(y => `<option value="${y}" ${y === tahunIni ? 'selected' : ''}>${y}</option>`).join('');

        container.innerHTML = `
        <div class="space-y-5 animate-fadeIn">
            <!-- Filter -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div class="flex flex-col sm:flex-row items-end justify-between gap-4">
                    <div class="flex items-end gap-3">
                        <div>
                            <label class="block text-xs font-semibold text-gray-500 mb-1.5">Tahun Buku Penilaian</label>
                            <select id="kk-tahun" class="border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-primary-500 min-w-[140px]">
                                ${tahunOpts}
                            </select>
                        </div>
                        <button onclick="KesehatanKoperasiPage.load()"
                            class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
                            <i class="ri-heart-pulse-line"></i> Hitung Tingkat Kesehatan
                        </button>
                    </div>

                    <div class="flex items-center gap-2">
                        <button onclick="KesehatanKoperasiPage.exportPDF()"
                            class="bg-rose-50 text-rose-600 hover:bg-rose-100 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-all shadow-sm" id="kk-export-btn" style="display:none">
                            <i class="ri-file-pdf-line text-base"></i> Cetak Dokumen PDF (KKPKK)
                        </button>
                    </div>
                </div>
            </div>

            <!-- Content Area -->
            <div id="kk-content">
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center h-52">
                    <div class="text-center">
                        <div class="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <i class="ri-heart-pulse-line text-3xl text-emerald-500"></i>
                        </div>
                        <p class="text-gray-700 text-sm font-semibold">Pilih tahun buku dan klik "Hitung Tingkat Kesehatan"</p>
                        <p class="text-gray-400 text-xs mt-1">Standar Kertas Kerja Pemeriksaan Kesehatan Koperasi (KKPKK) Permenkop UKM No. 9/2020 jo. Permenkop UKM No. 2/2024</p>
                    </div>
                </div>
            </div>
        </div>`;
    },

    async load() {
        const tahun = document.getElementById('kk-tahun').value;
        const content = document.getElementById('kk-content');
        content.innerHTML = `<div class="flex items-center justify-center h-48">
            <div class="flex flex-col items-center gap-3">
                <div class="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
                <p class="text-sm font-medium text-gray-500">Memproses evaluasi 4 aspek kesehatan koperasi (KKPKK)...</p>
            </div>
        </div>`;

        const res = await App.api(`kesehatan?tahun=${tahun}`);
        if (!res?.success) {
            content.innerHTML = `<div class="bg-white rounded-2xl border border-red-100 p-10 text-center text-red-500">
                <i class="ri-error-warning-line text-4xl mb-2 inline-block"></i>
                <p class="text-sm font-semibold">Gagal memuat data evaluasi kesehatan koperasi</p>
                <p class="text-xs text-gray-400 mt-1">${res?.message || 'Terjadi kesalahan sistem'}</p>
            </div>`;
            return;
        }

        this.hasilData = res.data;
        const d = res.data;
        const r = d.ringkasan;

        // Warna & Icon predikat resmi Kemenkop UKM
        const predikatMap = {
            'sehat': {
                bg: 'from-emerald-600 to-emerald-800',
                badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
                icon: 'ri-shield-check-fill',
                ring: 'stroke-emerald-500',
                keterangan: 'Koperasi memiliki kondisi tata kelola, permodalan, dan kinerja yang sangat prima serta mematuhi regulasi perundang-undangan.'
            },
            'cukup': {
                bg: 'from-blue-600 to-blue-800',
                badge: 'bg-blue-100 text-blue-800 border-blue-300',
                icon: 'ri-shield-check-line',
                ring: 'stroke-blue-500',
                keterangan: 'Kondisi koperasi secara umum tergolong baik, namun perlu peningkatan pada aspek efisiensi dan mitigasi risiko pinjaman.'
            },
            'dalam_pengawasan': {
                bg: 'from-amber-500 to-amber-700',
                badge: 'bg-amber-100 text-amber-800 border-amber-300',
                icon: 'ri-alert-line',
                ring: 'stroke-amber-500',
                keterangan: 'Koperasi memerlukan pembinaan intensif terkait kualitas aset kredit/NPL, rentabilitas usaha, atau penyelenggaraan RAT.'
            },
            'pengawasan_khusus': {
                bg: 'from-rose-600 to-rose-800',
                badge: 'bg-rose-100 text-rose-800 border-rose-300',
                icon: 'ri-alarm-warning-line',
                ring: 'stroke-rose-500',
                keterangan: 'Koperasi berada dalam perhatian khusus otoritas pengawas koperasi dan memerlukan tindakan perbaikan (action plan) segera.'
            },
            // Fallbacks
            'kurang': {
                bg: 'from-amber-500 to-amber-700',
                badge: 'bg-amber-100 text-amber-800 border-amber-300',
                icon: 'ri-alert-line',
                ring: 'stroke-amber-500',
                keterangan: 'Koperasi memerlukan perbaikan mendesak pada aspek risiko dan efisiensi.'
            },
            'tidak': {
                bg: 'from-rose-600 to-rose-800',
                badge: 'bg-rose-100 text-rose-800 border-rose-300',
                icon: 'ri-alarm-warning-line',
                ring: 'stroke-rose-500',
                keterangan: 'Koperasi berada dalam kondisi tidak sehat dan memerlukan audit khusus.'
            }
        };

        const pk = predikatMap[d.predikat_kode] || predikatMap['dalam_pengawasan'];
        const pct = Math.min(100, Math.max(0, d.total_skor));
        const radius = 52, circumference = 2 * Math.PI * radius;
        const dashOffset = circumference - (pct / 100) * circumference;

        content.innerHTML = `
        <!-- Hero Skor & Status KKPKK -->
        <div class="bg-gradient-to-br ${pk.bg} rounded-2xl p-6 text-white shadow-xl overflow-hidden relative">
            <div class="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-28 translate-x-28 pointer-events-none"></div>
            <div class="absolute -bottom-16 -left-16 w-64 h-64 bg-white/5 rounded-full pointer-events-none"></div>

            <div class="relative z-10 flex flex-col lg:flex-row items-center gap-8">
                <!-- Gauge Circle -->
                <div class="flex flex-col items-center shrink-0">
                    <svg width="140" height="140" viewBox="0 0 140 140">
                        <circle cx="70" cy="70" r="${radius}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="12"/>
                        <circle cx="70" cy="70" r="${radius}" fill="none" stroke="white" stroke-width="12"
                            stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
                            stroke-linecap="round" transform="rotate(-90 70 70)"
                            style="transition: stroke-dashoffset 1s ease"/>
                        <text x="70" y="64" text-anchor="middle" font-size="26" font-weight="bold" fill="white">${d.total_skor}</text>
                        <text x="70" y="82" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.8)">dari 100</text>
                    </svg>
                    <div class="mt-2 text-center">
                        <i class="${pk.icon} text-3xl text-white/90"></i>
                    </div>
                </div>

                <!-- Info Utama -->
                <div class="flex-1 text-center lg:text-left">
                    <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-semibold text-white mb-2">
                        <i class="ri-government-line"></i> Standar Resmi Kemenkop UKM RI
                    </div>
                    <h2 class="text-3xl sm:text-4xl font-black">${d.predikat}</h2>
                    <p class="text-white/80 text-sm mt-1 max-w-2xl">${pk.keterangan}</p>
                    <p class="text-white/60 text-xs mt-2">
                        Rujukan: Permenkop UKM No. 9 Tahun 2020 jo. Permenkop UKM No. 2 Tahun 2024 & No. 8 Tahun 2023 (KKPKK)
                    </p>

                    <!-- Ringkasan 4 Aspek (4 Kolom) -->
                    <div class="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        ${d.aspek.map(a => `
                        <div class="bg-white/15 backdrop-blur rounded-xl p-3 text-center border border-white/10">
                            <p class="text-[11px] font-semibold text-white/80 leading-tight truncate" title="${a.nama}">${a.nama.split('(')[0].trim()}</p>
                            <p class="text-xl font-black text-white mt-1">${a.skor}<span class="text-xs font-normal text-white/70">/${a.bobot}</span></p>
                            <div class="w-full bg-white/20 rounded-full h-1.5 mt-1.5 overflow-hidden">
                                <div class="bg-white rounded-full h-1.5" style="width:${Math.min(100, (a.skor / a.bobot) * 100)}%"></div>
                            </div>
                        </div>`).join('')}
                    </div>
                </div>

                <!-- Ringkasan Keuangan Penting -->
                <div class="grid grid-cols-2 gap-2.5 shrink-0 w-full lg:w-72">
                    ${[
                        ['Total Aset', App.formatRupiah(r.total_aset)],
                        ['Modal Sendiri', App.formatRupiah(r.modal_sendiri)],
                        ['Total Simpanan', App.formatRupiah(r.total_simpanan)],
                        ['Baki Debet Pinjaman', App.formatRupiah(r.sisa_pinjaman)],
                        ['SHU Berjalan', App.formatRupiah(r.shu)],
                        ['Total Anggota', r.total_anggota + ' Orang'],
                    ].map(([l, v]) => `
                    <div class="bg-white/15 backdrop-blur rounded-xl p-2.5 border border-white/15">
                        <p class="text-[10px] text-white/70 uppercase font-semibold tracking-wider">${l}</p>
                        <p class="text-xs sm:text-sm font-bold text-white mt-0.5 truncate" title="${v}">${v}</p>
                    </div>`).join('')}
                </div>
            </div>
        </div>

        <!-- 4 Pilar Aspek Pemeriksaan Kesehatan Koperasi (KKPKK) -->
        <div class="space-y-4" id="kk-aspek-list">
            <div class="flex items-center justify-between">
                <h3 class="font-bold text-gray-800 flex items-center gap-2 text-base">
                    <i class="ri-file-list-3-line text-primary-600"></i> Detail 4 Aspek Kertas Kerja Pemeriksaan (KKPKK)
                </h3>
                <span class="text-xs text-gray-400">Total Akumulasi Bobot: 100 Poin</span>
            </div>

            ${d.aspek.map(a => {
                const pctA = a.bobot > 0 ? Math.min(100, (a.skor / a.bobot) * 100) : 0;
                const aspectStyles = {
                    1: { icon: 'ri-government-line', color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                    2: { icon: 'ri-shield-cross-line', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
                    3: { icon: 'ri-line-chart-line', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                    4: { icon: 'ri-bank-card-2-line', color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' }
                };
                const aspStyle = aspectStyles[a.no] || { icon: 'ri-checkbox-circle-line', color: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-100' };

                const barCls = pctA >= 80 ? 'bg-emerald-500' : pctA >= 66 ? 'bg-blue-500' : pctA >= 51 ? 'bg-amber-500' : 'bg-rose-500';
                const textCls = pctA >= 80 ? 'text-emerald-700' : pctA >= 66 ? 'text-blue-700' : pctA >= 51 ? 'text-amber-700' : 'text-rose-700';

                return `
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <!-- Aspek Header -->
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between px-5 py-4 bg-gray-50/70 border-b border-gray-100 gap-3">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${aspStyle.bg} ${aspStyle.border} shadow-xs">
                                <i class="${aspStyle.icon} ${aspStyle.color}"></i>
                            </div>
                            <div>
                                <div class="flex items-center gap-2">
                                    <span class="text-xs font-bold px-2 py-0.5 rounded-md bg-gray-200 text-gray-700">Aspek ${a.no}</span>
                                    <h3 class="font-bold text-gray-900 text-base">${a.nama}</h3>
                                </div>
                                <p class="text-xs text-gray-500 mt-0.5">Bobot Aspek: <strong>${a.bobot} Poin</strong></p>
                            </div>
                        </div>
                        <div class="text-right flex sm:flex-col items-center sm:items-end justify-between">
                            <p class="text-2xl font-black ${textCls}">${a.skor}<span class="text-sm font-normal text-gray-400">/${a.bobot}</span></p>
                            <div class="flex items-center gap-2 mt-0.5">
                                <div class="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                                    <div class="${barCls} rounded-full h-2 transition-all" style="width:${pctA}%"></div>
                                </div>
                                <span class="text-xs font-bold ${textCls}">${pctA.toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>

                    <!-- Indikator Table -->
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="bg-white border-b border-gray-100 text-gray-500 text-xs">
                                    <th class="px-5 py-3 text-left font-semibold">Indikator Penilaian</th>
                                    <th class="px-4 py-3 text-left font-semibold hidden md:table-cell">Metodologi & Formula</th>
                                    <th class="px-4 py-3 text-right font-semibold">Kondisi / Nilai Riil</th>
                                    <th class="px-4 py-3 text-center font-semibold">Bobot</th>
                                    <th class="px-4 py-3 text-center font-semibold">Skor</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50">
                                ${a.indikator.map(ind => {
                                    const indPct = ind.bobot > 0 ? (ind.skor / ind.bobot) * 100 : 0;
                                    const indBadge = indPct >= 80 ? 'badge-success' : indPct >= 66 ? 'badge-info' : indPct >= 51 ? 'badge-warning' : 'badge-danger';
                                    
                                    let nilaiDisplay = '';
                                    if (typeof ind.nilai === 'string') {
                                        nilaiDisplay = ind.nilai;
                                    } else if (ind.satuan === '%') {
                                        nilaiDisplay = ind.nilai.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
                                    } else if (ind.satuan === 'Rp') {
                                        nilaiDisplay = App.formatRupiah(ind.nilai);
                                    } else {
                                        nilaiDisplay = `${ind.nilai} ${ind.satuan}`.trim();
                                    }

                                    return `
                                    <tr class="hover:bg-gray-50/60 transition-colors">
                                        <td class="px-5 py-3.5 font-medium text-gray-800">
                                            ${ind.nama}
                                        </td>
                                        <td class="px-4 py-3.5 text-gray-400 text-xs hidden md:table-cell font-mono">
                                            ${ind.formula}
                                        </td>
                                        <td class="px-4 py-3.5 text-right font-bold text-gray-700">
                                            ${nilaiDisplay}
                                        </td>
                                        <td class="px-4 py-3.5 text-center text-gray-500 font-semibold text-xs">
                                            ${ind.bobot}
                                        </td>
                                        <td class="px-4 py-3.5 text-center">
                                            <span class="badge ${indBadge} text-xs font-bold px-2.5 py-1">
                                                ${ind.skor}
                                            </span>
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
            }).join('')}
        </div>

        <!-- Tabel Rekapitulasi KKPKK -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                        <i class="ri-table-line"></i>
                    </div>
                    <h3 class="font-bold text-gray-800">Rekapitulasi Kertas Kerja Pemeriksaan Kesehatan Koperasi</h3>
                </div>
                <span class="text-xs font-semibold text-gray-500">Tahun Buku: ${d.tahun}</span>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs">
                            <th class="px-5 py-3 text-left font-semibold">Pilar Aspek Penilaian</th>
                            <th class="px-4 py-3 text-center font-semibold">Bobot Maks.</th>
                            <th class="px-4 py-3 text-center font-semibold">Skor Diperoleh</th>
                            <th class="px-4 py-3 text-center font-semibold">Capaian (%)</th>
                            <th class="px-4 py-3 text-center font-semibold">Status Kategori</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                        ${d.aspek.map(a => {
                            const pctA = a.bobot > 0 ? ((a.skor / a.bobot) * 100).toFixed(1) : '0';
                            const numPct = parseFloat(pctA);
                            const indBadge = numPct >= 80 ? 'badge-success' : numPct >= 66 ? 'badge-info' : numPct >= 51 ? 'badge-warning' : 'badge-danger';
                            const ket = numPct >= 80 ? 'Sangat Baik' : numPct >= 66 ? 'Baik' : numPct >= 51 ? 'Cukup' : 'Perlu Perbaikan';

                            return `<tr class="hover:bg-gray-50/70 transition-colors">
                                <td class="px-5 py-3.5 font-medium text-gray-800">${a.no}. ${a.nama}</td>
                                <td class="px-4 py-3.5 text-center text-gray-600 font-semibold">${a.bobot}</td>
                                <td class="px-4 py-3.5 text-center font-bold text-gray-900">${a.skor}</td>
                                <td class="px-4 py-3.5 text-center">
                                    <div class="flex items-center justify-center gap-2">
                                        <div class="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                            <div class="${numPct >= 80 ? 'bg-emerald-500' : numPct >= 66 ? 'bg-blue-500' : numPct >= 51 ? 'bg-amber-500' : 'bg-rose-500'} rounded-full h-1.5" style="width:${pctA}%"></div>
                                        </div>
                                        <span class="text-xs font-semibold text-gray-600">${pctA}%</span>
                                    </div>
                                </td>
                                <td class="px-4 py-3.5 text-center"><span class="badge ${indBadge}">${ket}</span></td>
                            </tr>`;
                        }).join('')}
                        <!-- Total Row -->
                        <tr class="bg-gray-50/90 font-bold border-t-2 border-gray-200">
                            <td class="px-5 py-4 text-gray-900 font-extrabold">TOTAL SKOR AKUMULASI (KKPKK)</td>
                            <td class="px-4 py-4 text-center text-gray-800 font-extrabold">100</td>
                            <td class="px-4 py-4 text-center font-black text-primary-700 text-xl">${d.total_skor}</td>
                            <td class="px-4 py-4 text-center font-bold text-gray-700">${d.total_skor}%</td>
                            <td class="px-4 py-4 text-center">
                                <span class="badge ${pk.badge} text-xs font-black uppercase px-3 py-1 border shadow-xs">
                                    ${d.predikat}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Standar Nomenklatur Predikat Resmi Kemenkop UKM -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i class="ri-shield-check-line text-primary-600"></i> Klasifikasi Predikat Kesehatan Koperasi Resmi Kemenkop UKM
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                ${[
                    ['80.00 – 100.00', 'Sehat', 'emerald'],
                    ['66.00 – 79.99', 'Cukup Sehat', 'blue'],
                    ['51.00 – 65.99', 'Dalam Pengawasan', 'amber'],
                    ['< 51.00', 'Dalam Pengawasan Khusus', 'rose'],
                ].map(([range, label, color]) => {
                    const isSelected = d.predikat.toLowerCase() === label.toLowerCase();
                    return `
                    <div class="bg-${color}-50 border ${isSelected ? `border-${color}-400 ring-2 ring-${color}-400 shadow-md` : `border-${color}-200`} rounded-xl p-3.5 text-center transition-all">
                        <p class="text-${color}-700 font-black text-lg">${range}</p>
                        <p class="text-${color}-800 text-xs font-bold mt-0.5">${label}</p>
                        ${isSelected ? `<span class="inline-flex items-center gap-1 text-[11px] font-bold text-${color}-700 mt-1.5 px-2 py-0.5 rounded-full bg-${color}-100"><i class="ri-check-line"></i> Posisi Koperasi</span>` : ''}
                    </div>`;
                }).join('')}
            </div>
            <div class="mt-4 p-3.5 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-500 leading-relaxed">
                <p>
                    <strong>Dasar Hukum & Harmonisasi Regulasi:</strong> Penilaian tingkat kesehatan di atas mengacu pada <strong>Permenkop UKM No. 9 Tahun 2020</strong> tentang Pengawasan Koperasi beserta instrumen Kertas Kerja Pemeriksaan Kesehatan Koperasi (KKPKK), diselaraskan dengan <strong>Permenkop UKM No. 2 Tahun 2024</strong> tentang Kebijakan Akuntansi Koperasi (kepatuhan penerapan standar SAK EP) dan <strong>Permenkop UKM No. 8 Tahun 2023</strong> tentang Usaha Simpan Pinjam oleh Koperasi.
                </p>
            </div>
        </div>`;

        document.getElementById('kk-export-btn').style.display = 'inline-flex';
    },

    exportPDF() {
        if (!this.hasilData) return;
        const d = this.hasilData;
        const r = d.ringkasan;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();

        const title = 'LAPORAN PEMERIKSAAN TINGKAT KESEHATAN KOPERASI';

        // Get dynamic brand color theme
        const activeThemeKey = localStorage.getItem('app_theme') || 'indigo';
        const theme = window.THEMES?.[activeThemeKey] || { shade: '#4f46e5', p: { 50: '#eef2ff', 900: '#312e81' } };
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [79, 70, 229];
        };
        const brandRGB = hexToRgb(theme.shade);
        const bgRGB = hexToRgb(theme.p[50] || '#eef2ff');

        // Draw dynamic headers and footers on the first page
        App.drawPDFHeader(doc, title);
        App.drawPDFFooter(doc);

        // Metadata Subtitle cleanly aligned below title
        doc.setFontSize(7.5); 
        doc.setFont('helvetica', 'normal'); 
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`Tahun Buku Penilaian: ${d.tahun}  |  Rujukan: Permenkop UKM No. 9/2020 jo. Permenkop UKM No. 2/2024 & No. 8/2023 (KKPKK)`, 14, 44);

        // Color coding based on official predicate
        const sColor = d.predikat_kode === 'sehat' ? [16, 185, 129] // Emerald
            : d.predikat_kode === 'cukup' ? [59, 130, 246]       // Blue
                : d.predikat_kode === 'dalam_pengawasan' || d.predikat_kode === 'kurang' ? [245, 158, 11]  // Amber
                    : [225, 29, 72];                             // Rose/Red

        const sTint = d.predikat_kode === 'sehat' ? [220, 252, 231]   // bg-emerald-100
            : d.predikat_kode === 'cukup' ? [219, 234, 254]           // bg-blue-100
                : d.predikat_kode === 'dalam_pengawasan' || d.predikat_kode === 'kurang' ? [254, 243, 199]      // bg-amber-100
                    : [255, 228, 230];                                // bg-rose-100

        const sText = d.predikat_kode === 'sehat' ? [21, 128, 61]     // text-emerald-700
            : d.predikat_kode === 'cukup' ? [29, 78, 216]             // text-blue-700
                : d.predikat_kode === 'dalam_pengawasan' || d.predikat_kode === 'kurang' ? [180, 83, 9]         // text-amber-700
                    : [190, 18, 60];                                  // text-rose-700

        doc.setFillColor(sTint[0], sTint[1], sTint[2]);
        doc.roundedRect(14, 47, pw - 28, 17, 2, 2, 'F');
        
        doc.setFillColor(sColor[0], sColor[1], sColor[2]);
        doc.rect(14, 47, 1.8, 17, 'F'); // Left vertical brand accent line

        // Left Column (Total Score)
        doc.setFontSize(6.5); 
        doc.setFont('helvetica', 'bold'); 
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("TOTAL SKOR AKUMULASI (KKPKK)", 20, 52.5);
        
        doc.setFontSize(14); 
        doc.setFont('helvetica', 'black'); 
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(`${d.total_skor}`, 20, 59);
        
        doc.setFontSize(7.5); 
        doc.setFont('helvetica', 'bold'); 
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text("/ 100 POIN", 20 + doc.getTextWidth(`${d.total_skor}`) + 1.5, 59);

        // Right Column (Predicate Badge)
        doc.setFontSize(6.5); 
        doc.setFont('helvetica', 'bold'); 
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("PREDIKAT KESEHATAN RESMI KEMENKOP UKM", pw - 20, 52.5, { align: 'right' });
        
        doc.setFontSize(11); 
        doc.setFont('helvetica', 'black'); 
        doc.setTextColor(sText[0], sText[1], sText[2]);
        doc.text(d.predikat.toUpperCase(), pw - 20, 59, { align: 'right' });

        // ── Ringkasan Keuangan (Executive 3-Column Grid) ──
        doc.setFontSize(8.5); 
        doc.setFont('helvetica', 'bold'); 
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text('RINGKASAN POSISI KEUANGAN & OPERASIONAL', 14, 69.5);
        
        doc.setFillColor(bgRGB[0], bgRGB[1], bgRGB[2]);
        doc.roundedRect(14, 71.5, pw - 28, 20, 2, 2, 'F');
        
        doc.setFillColor(brandRGB[0], brandRGB[1], brandRGB[2]);
        doc.rect(14, 71.5, 1.5, 20, 'F'); // Left vertical brand accent line

        const keuData = [
            ['Total Aset', App.formatRupiah(r.total_aset)],
            ['Modal Sendiri', App.formatRupiah(r.modal_sendiri)],
            ['Total Simpanan', App.formatRupiah(r.total_simpanan)],
            ['Baki Debet Pinjaman', App.formatRupiah(r.sisa_pinjaman)],
            ['SHU Berjalan', App.formatRupiah(r.shu)],
            ['Total Anggota', r.total_anggota + ' Orang'],
        ];

        keuData.forEach(([l, v], i) => {
            const col = Math.floor(i / 2);
            const row = i % 2;
            const x = 20 + col * 58;
            const y = 77 + row * 8.5;
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text(l.toUpperCase(), x, y);
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42);
            doc.text(v, x, y + 4.2);
        });

        // ── Tabel 4 Aspek KKPKK ──
        doc.setFontSize(8.5); 
        doc.setFont('helvetica', 'bold'); 
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text('REKAPITULASI 4 PILAR PEMERIKSAAN KESEHATAN KOPERASI (KKPKK)', 14, 97.5);

        const body = d.aspek.map(a => {
            const pctA = a.bobot > 0 ? ((a.skor / a.bobot) * 100).toFixed(1) : '0';
            const numPct = parseFloat(pctA);
            const ket = numPct >= 80 ? 'Sangat Baik' : numPct >= 66 ? 'Baik' : numPct >= 51 ? 'Cukup' : 'Perlu Perbaikan';
            return [a.no, a.nama, a.bobot, a.skor, pctA + '%', ket];
        });
        body.push(['', 'TOTAL PENILAIAN KESEHATAN (KKPKK)', 100, d.total_skor, d.total_skor + '%', d.predikat]);

        doc.autoTable({
            startY: 100.5,
            head: [['No', 'Pilar Aspek Pemeriksaan (KKPKK)', 'Bobot', 'Skor', 'Capaian', 'Kategori']],
            body,
            theme: 'striped',
            headStyles: { 
                fillColor: [brandRGB[0], brandRGB[1], brandRGB[2]], 
                textColor: 255, 
                fontSize: 8, 
                fontStyle: 'bold', 
                halign: 'center', 
                cellPadding: 3.5 
            },
            bodyStyles: { 
                fontSize: 8, 
                cellPadding: 3.5, 
                textColor: [51, 65, 85] 
            },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { cellWidth: 'auto' },
                2: { halign: 'center', cellWidth: 18 },
                3: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
                4: { halign: 'center', cellWidth: 20 },
                5: { halign: 'center', cellWidth: 32 }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14, top: 48, bottom: 20 },
            didParseCell: (data) => {
                if (data.row.index === body.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [241, 245, 249];
                    data.cell.styles.textColor = [15, 23, 42];
                    if (data.column.index === 5) {
                        data.cell.styles.textColor = sText;
                    }
                }
                
                if (data.column.index === 5 && data.row.index < body.length - 1) {
                    const val = String(data.cell.raw).trim();
                    if (val === 'Sangat Baik') {
                        data.cell.styles.fillColor = [220, 252, 231];
                        data.cell.styles.textColor = [21, 128, 61];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (val === 'Baik') {
                        data.cell.styles.fillColor = [219, 234, 254];
                        data.cell.styles.textColor = [29, 78, 216];
                        data.cell.styles.fontStyle = 'bold';
                    } else if (val === 'Cukup') {
                        data.cell.styles.fillColor = [254, 243, 199];
                        data.cell.styles.textColor = [180, 83, 9];
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.fillColor = [255, 228, 230];
                        data.cell.styles.textColor = [190, 18, 60];
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            },
            didDrawPage: (data) => {
                App.drawPDFHeader(doc, title);
                App.drawPDFFooter(doc);
            }
        });

        // ── Detail per Indikator ──
        let curY = doc.lastAutoTable.finalY + 8;
        if (curY + 25 > ph - 20) {
            doc.addPage();
            curY = 46;
        }

        doc.setFontSize(8.5); 
        doc.setFont('helvetica', 'bold'); 
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text('DETAIL INDIKATOR PENILAIAN KKPKK PER ASPEK', 14, curY);

        const detailBody = [];
        d.aspek.forEach(a => {
            detailBody.push([{ 
                content: `ASPEK ${a.no}. ${a.nama.toUpperCase()} (BOBOT: ${a.bobot} POIN)`, 
                colSpan: 4, 
                styles: { 
                    fillColor: [bgRGB[0], bgRGB[1], bgRGB[2]], 
                    textColor: [brandRGB[0], brandRGB[1], brandRGB[2]], 
                    fontStyle: 'bold', 
                    fontSize: 7.5,
                    cellPadding: 3.5
                } 
            }]);
            a.indikator.forEach(ind => {
                let nilaiDisplay = '';
                if (typeof ind.nilai === 'string') {
                    nilaiDisplay = ind.nilai;
                } else if (ind.satuan === '%') {
                    nilaiDisplay = ind.nilai.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%';
                } else if (ind.satuan === 'Rp') {
                    nilaiDisplay = App.formatRupiah(ind.nilai);
                } else {
                    nilaiDisplay = `${ind.nilai} ${ind.satuan}`.trim();
                }
                detailBody.push([ind.nama, nilaiDisplay, ind.bobot, ind.skor]);
            });
        });

        doc.autoTable({
            startY: curY + 3,
            head: [['Indikator Pemeriksaan KKPKK', 'Nilai / Kondisi Riil Koperasi', 'Bobot Poin', 'Skor']],
            body: detailBody,
            theme: 'striped',
            headStyles: { 
                fillColor: [brandRGB[0], brandRGB[1], brandRGB[2]], 
                textColor: 255, 
                fontSize: 8, 
                fontStyle: 'bold', 
                halign: 'center', 
                cellPadding: 3 
            },
            bodyStyles: { 
                fontSize: 7.5, 
                cellPadding: 2.5, 
                textColor: [51, 65, 85] 
            },
            columnStyles: {
                0: { cellWidth: 'auto' },
                1: { halign: 'right', cellWidth: 50 },
                2: { halign: 'center', cellWidth: 18 },
                3: { halign: 'center', cellWidth: 18, fontStyle: 'bold' }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14, top: 48, bottom: 20 },
            didDrawPage: (data) => {
                App.drawPDFHeader(doc, title);
                App.drawPDFFooter(doc);
            }
        });

        window.open(doc.output('bloburl'), '_blank');
    }
};

window.KesehatanKoperasiPage = KesehatanKoperasiPage;
export default KesehatanKoperasiPage;
