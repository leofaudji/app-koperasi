// Kesehatan Koperasi Page
// Penilaian berdasarkan Permenkop No. 20/Per/M.KUKM/XI/2008
const KesehatanKoperasiPage = {
    hasilData: null,

    async render(container) {
        App.setTitle('Tingkat Kesehatan Koperasi', 'Penilaian berdasarkan Permenkop No. 20 Tahun 2008');

        const tahunIni = new Date().getFullYear();
        const tahunOpts = Array.from({ length: 5 }, (_, i) => tahunIni - i)
            .map(y => `<option value="${y}" ${y === tahunIni ? 'selected' : ''}>${y}</option>`).join('');

        container.innerHTML = `
        <div class="space-y-5 animate-fadeIn">
            <!-- Filter -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div class="flex flex-col sm:flex-row items-end gap-3">
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 mb-1.5">Tahun Penilaian</label>
                        <select id="kk-tahun" class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 min-w-[140px]">
                            ${tahunOpts}
                        </select>
                    </div>
                    <button onclick="KesehatanKoperasiPage.load()"
                        class="bg-primary-600 hover:bg-primary-700 text-white px-6 h-10 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
                        <i class="ri-heart-pulse-line"></i> Hitung Kesehatan
                    </button>
                    <button onclick="KesehatanKoperasiPage.exportPDF()"
                        class="bg-red-50 text-red-600 hover:bg-red-100 px-4 h-10 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all" id="kk-export-btn" style="display:none">
                        <i class="ri-file-pdf-line"></i> Cetak PDF
                    </button>
                </div>
            </div>
            <div id="kk-content">
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center h-52">
                    <div class="text-center">
                        <div class="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <i class="ri-heart-pulse-line text-3xl text-emerald-400"></i>
                        </div>
                        <p class="text-gray-500 text-sm font-medium">Pilih tahun dan klik "Hitung Kesehatan"</p>
                        <p class="text-gray-400 text-xs mt-1">Berdasarkan Permenkop No. 20/Per/M.KUKM/XI/2008</p>
                    </div>
                </div>
            </div>
        </div>`;
    },

    async load() {
        const tahun = document.getElementById('kk-tahun').value;
        const content = document.getElementById('kk-content');
        content.innerHTML = `<div class="flex items-center justify-center h-40">
            <div class="flex flex-col items-center gap-3">
                <div class="animate-spin w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
                <p class="text-sm text-gray-400">Menghitung tingkat kesehatan...</p>
            </div>
        </div>`;

        const res = await App.api(`kesehatan?tahun=${tahun}`);
        if (!res?.success) {
            content.innerHTML = `<div class="bg-white rounded-2xl border p-10 text-center text-gray-400">
                <i class="ri-error-warning-line text-4xl"></i><p class="mt-2 text-sm">Gagal memuat data</p></div>`;
            return;
        }

        this.hasilData = res.data;
        const d = res.data;
        const r = d.ringkasan;

        // Warna predikat
        const predikatMap = {
            'sehat': { bg: 'from-emerald-500 to-emerald-700', badge: 'bg-emerald-100 text-emerald-700', icon: 'ri-shield-check-line', ring: 'stroke-emerald-500' },
            'cukup': { bg: 'from-blue-500 to-blue-700', badge: 'bg-blue-100 text-blue-700', icon: 'ri-shield-line', ring: 'stroke-blue-500' },
            'kurang': { bg: 'from-amber-500 to-amber-700', badge: 'bg-amber-100 text-amber-700', icon: 'ri-alert-line', ring: 'stroke-amber-500' },
            'tidak': { bg: 'from-orange-500 to-orange-700', badge: 'bg-orange-100 text-orange-700', icon: 'ri-error-warning-line', ring: 'stroke-orange-500' },
            'sangat_tidak': { bg: 'from-red-500 to-red-700', badge: 'bg-red-100 text-red-700', icon: 'ri-close-circle-line', ring: 'stroke-red-500' }
        };
        const pk = predikatMap[d.predikat_kode] || predikatMap['cukup'];
        const pct = Math.min(100, Math.max(0, d.total_skor));
        const radius = 52, circumference = 2 * Math.PI * radius;
        const dashOffset = circumference - (pct / 100) * circumference;

        // Skor per aspek label
        const aspekColor = (skor, bobot) => {
            const pctA = bobot > 0 ? (skor / bobot) * 100 : 0;
            if (pctA >= 80) return 'bg-emerald-500';
            if (pctA >= 60) return 'bg-blue-500';
            if (pctA >= 40) return 'bg-amber-500';
            return 'bg-red-500';
        };
        const aspekBadge = (skor, bobot) => {
            const pctA = bobot > 0 ? (skor / bobot) * 100 : 0;
            if (pctA >= 80) return 'badge-success';
            if (pctA >= 60) return 'badge-info';
            if (pctA >= 40) return 'badge-warning';
            return 'badge-danger';
        };

        content.innerHTML = `
        <!-- Hero Skor -->
        <div class="bg-gradient-to-br ${pk.bg} rounded-2xl p-6 text-white shadow-xl overflow-hidden relative">
            <div class="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-24 translate-x-24"></div>
            <div class="absolute -bottom-12 -left-12 w-56 h-56 bg-white/5 rounded-full"></div>

            <div class="relative z-10 flex flex-col lg:flex-row items-center gap-8">
                <!-- Gauge -->
                <div class="flex flex-col items-center shrink-0">
                    <svg width="140" height="140" viewBox="0 0 140 140">
                        <!-- Track -->
                        <circle cx="70" cy="70" r="${radius}" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="12"/>
                        <!-- Progress -->
                        <circle cx="70" cy="70" r="${radius}" fill="none" stroke="white" stroke-width="12"
                            stroke-dasharray="${circumference}" stroke-dashoffset="${dashOffset}"
                            stroke-linecap="round" transform="rotate(-90 70 70)"
                            style="transition: stroke-dashoffset 1s ease"/>
                        <!-- Center text -->
                        <text x="70" y="64" text-anchor="middle" class="fill-white" font-size="26" font-weight="bold" fill="white">${d.total_skor}</text>
                        <text x="70" y="82" text-anchor="middle" font-size="11" fill="rgba(255,255,255,0.75)">dari 100</text>
                    </svg>
                    <div class="mt-1 text-center">
                        <i class="${pk.icon} text-3xl text-white/80"></i>
                    </div>
                </div>

                <!-- Info -->
                <div class="flex-1 text-center lg:text-left">
                    <p class="text-white/70 text-sm font-medium uppercase tracking-widest">Tahun ${d.tahun}</p>
                    <h2 class="text-4xl font-black mt-1">${d.predikat}</h2>
                    <p class="text-white/70 text-sm mt-2">Total Skor: <strong class="text-white">${d.total_skor}</strong> / 100 poin</p>
                    <p class="text-white/60 text-xs mt-1">Berdasarkan Permenkop No. 20/Per/M.KUKM/XI/2008</p>

                    <!-- Bar skor per aspek ringkasan -->
                    <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                        ${d.aspek.map(a => `
                        <div class="bg-white/15 backdrop-blur rounded-xl p-2.5 text-center">
                            <p class="text-[10px] text-white/70 leading-tight">${a.nama}</p>
                            <p class="text-lg font-black text-white mt-0.5">${a.skor}<span class="text-xs font-normal text-white/60">/${a.bobot}</span></p>
                            <div class="w-full bg-white/20 rounded-full h-1 mt-1">
                                <div class="bg-white rounded-full h-1" style="width:${Math.min(100, (a.skor / a.bobot) * 100)}%"></div>
                            </div>
                        </div>`).join('')}
                    </div>
                </div>

                <!-- Ringkasan Keuangan -->
                <div class="grid grid-cols-2 gap-2 shrink-0 w-full lg:w-auto">
                    ${[
                ['Total Aset', App.formatRupiah(r.total_aset)],
                ['Modal Sendiri', App.formatRupiah(r.modal_sendiri)],
                ['Total Simpanan', App.formatRupiah(r.total_simpanan)],
                ['Sisa Pinjaman', App.formatRupiah(r.sisa_pinjaman)],
                ['SHU', App.formatRupiah(r.shu)],
                ['Total Anggota', r.total_anggota + ' org'],
            ].map(([l, v]) => `
                    <div class="bg-white/15 backdrop-blur rounded-xl p-3 border border-white/20">
                        <p class="text-[10px] text-white/60 uppercase tracking-wide">${l}</p>
                        <p class="text-sm font-bold text-white mt-0.5">${v}</p>
                    </div>`).join('')}
                </div>
            </div>
        </div>

        <!-- 7 Aspek Detail -->
        <div class="space-y-4" id="kk-aspek-list">
            ${d.aspek.map(a => {
                const pctA = a.bobot > 0 ? Math.min(100, (a.skor / a.bobot) * 100) : 0;
                const colors = {
                    good: 'from-emerald-50 to-emerald-50 border-emerald-200',
                    ok: 'from-blue-50 to-blue-50 border-blue-200',
                    warn: 'from-amber-50 to-amber-50 border-amber-200',
                    bad: 'from-red-50 to-red-50 border-red-200'
                };
                const cls = pctA >= 80 ? colors.good : pctA >= 60 ? colors.ok : pctA >= 40 ? colors.warn : colors.bad;
                const barCls = pctA >= 80 ? 'bg-emerald-500' : pctA >= 60 ? 'bg-blue-500' : pctA >= 40 ? 'bg-amber-500' : 'bg-red-500';
                const textCls = pctA >= 80 ? 'text-emerald-700' : pctA >= 60 ? 'text-blue-700' : pctA >= 40 ? 'text-amber-700' : 'text-red-700';

                return `
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <!-- Aspek Header -->
                    <div class="flex items-center justify-between px-5 py-4 bg-gradient-to-r ${cls} border-b">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-xl flex items-center justify-center font-black text-gray-600 bg-white shadow-sm text-sm">
                                ${a.no}
                            </div>
                            <div>
                                <h3 class="font-bold text-gray-800">${a.nama}</h3>
                                <p class="text-xs text-gray-500">Bobot: ${a.bobot} poin</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="text-2xl font-black ${textCls}">${a.skor}<span class="text-sm font-normal text-gray-400">/${a.bobot}</span></p>
                            <div class="flex items-center gap-2 mt-1">
                                <div class="w-24 bg-gray-200 rounded-full h-2">
                                    <div class="${barCls} rounded-full h-2 transition-all" style="width:${pctA}%"></div>
                                </div>
                                <span class="text-xs font-semibold ${textCls}">${pctA.toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>

                    <!-- Indikator Table -->
                    <div class="overflow-x-auto">
                        <table class="w-full text-sm">
                            <thead>
                                <tr class="bg-gray-50 border-b border-gray-100">
                                    <th class="px-4 py-2.5 text-left font-semibold text-gray-500 text-xs">Indikator</th>
                                    <th class="px-4 py-2.5 text-left font-semibold text-gray-500 text-xs hidden md:table-cell">Formula</th>
                                    <th class="px-4 py-2.5 text-right font-semibold text-gray-500 text-xs">Nilai</th>
                                    <th class="px-4 py-2.5 text-center font-semibold text-gray-500 text-xs">Bobot</th>
                                    <th class="px-4 py-2.5 text-center font-semibold text-gray-500 text-xs">Skor</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${a.indikator.map(ind => {
                    const indPct = ind.bobot > 0 ? (ind.skor / ind.bobot) * 100 : 0;
                    const indBadge = indPct >= 80 ? 'badge-success' : indPct >= 60 ? 'badge-info' : indPct >= 40 ? 'badge-warning' : 'badge-danger';
                    const nilaiDisplay = ind.satuan === '%' ? `${ind.nilai}%`
                        : ind.satuan === 'Rp' ? App.formatRupiah(ind.nilai)
                            : `${ind.nilai} ${ind.satuan}`;
                    return `
                                    <tr class="border-b border-gray-50 hover:bg-gray-50/70">
                                        <td class="px-4 py-3 font-medium text-gray-800">${ind.nama}</td>
                                        <td class="px-4 py-3 text-gray-400 text-xs hidden md:table-cell font-mono">${ind.formula}</td>
                                        <td class="px-4 py-3 text-right font-bold text-gray-700">${nilaiDisplay}</td>
                                        <td class="px-4 py-3 text-center text-gray-500 text-xs">${ind.bobot}</td>
                                        <td class="px-4 py-3 text-center">
                                            <span class="badge ${indBadge} text-xs font-bold">${ind.skor}</span>
                                        </td>
                                    </tr>`;
                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>`;
            }).join('')}
        </div>

        <!-- Tabel Rekapitulasi -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <div class="w-8 h-8 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                    <i class="ri-table-line"></i>
                </div>
                <h3 class="font-bold text-gray-800">Rekapitulasi Penilaian</h3>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-100">
                            <th class="px-4 py-3 text-left font-semibold text-gray-500 text-xs">Aspek Penilaian</th>
                            <th class="px-4 py-3 text-center font-semibold text-gray-500 text-xs">Bobot Maks.</th>
                            <th class="px-4 py-3 text-center font-semibold text-gray-500 text-xs">Skor Diperoleh</th>
                            <th class="px-4 py-3 text-center font-semibold text-gray-500 text-xs">Persentase</th>
                            <th class="px-4 py-3 text-center font-semibold text-gray-500 text-xs">Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${d.aspek.map(a => {
                const pctA = a.bobot > 0 ? ((a.skor / a.bobot) * 100).toFixed(1) : '0';
                const indBadge = parseFloat(pctA) >= 80 ? 'badge-success' : parseFloat(pctA) >= 60 ? 'badge-info' : parseFloat(pctA) >= 40 ? 'badge-warning' : 'badge-danger';
                const ket = parseFloat(pctA) >= 80 ? 'Baik' : parseFloat(pctA) >= 60 ? 'Cukup Baik' : parseFloat(pctA) >= 40 ? 'Kurang Baik' : 'Tidak Baik';
                return `<tr class="border-b border-gray-50 hover:bg-gray-50/70">
                                <td class="px-4 py-3 font-medium text-gray-800">${a.no}. ${a.nama}</td>
                                <td class="px-4 py-3 text-center text-gray-600">${a.bobot}</td>
                                <td class="px-4 py-3 text-center font-bold text-gray-800">${a.skor}</td>
                                <td class="px-4 py-3 text-center">
                                    <div class="flex items-center justify-center gap-2">
                                        <div class="w-16 bg-gray-100 rounded-full h-1.5">
                                            <div class="${parseFloat(pctA) >= 80 ? 'bg-emerald-500' : parseFloat(pctA) >= 60 ? 'bg-blue-500' : parseFloat(pctA) >= 40 ? 'bg-amber-500' : 'bg-red-500'} rounded-full h-1.5" style="width:${pctA}%"></div>
                                        </div>
                                        <span class="text-xs font-semibold text-gray-600">${pctA}%</span>
                                    </div>
                                </td>
                                <td class="px-4 py-3 text-center"><span class="badge ${indBadge}">${ket}</span></td>
                            </tr>`;
            }).join('')}
                        <!-- Total -->
                        <tr class="bg-gray-50 border-t-2 border-gray-200 font-bold">
                            <td class="px-4 py-3 font-bold text-gray-800">TOTAL</td>
                            <td class="px-4 py-3 text-center font-bold text-gray-800">100</td>
                            <td class="px-4 py-3 text-center font-black text-primary-700 text-lg">${d.total_skor}</td>
                            <td class="px-4 py-3 text-center font-bold text-gray-700">${d.total_skor}%</td>
                            <td class="px-4 py-3 text-center">
                                <span class="badge ${d.predikat_kode === 'sehat' ? 'badge-success' : d.predikat_kode === 'cukup' ? 'badge-info' : 'badge-warning'}">
                                    ${d.predikat}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Skala Penilaian -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <i class="ri-information-line text-blue-500"></i> Skala Penilaian Kesehatan KSP
            </h3>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                ${[
                ['80–100', 'Sehat', 'emerald'],
                ['60–79', 'Cukup Sehat', 'blue'],
                ['40–59', 'Kurang Sehat', 'amber'],
                ['20–39', 'Tidak Sehat', 'orange'],
                ['< 20', 'Sangat Tidak Sehat', 'red'],
            ].map(([range, label, color]) => `
                <div class="bg-${color}-50 border border-${color}-200 rounded-xl p-3 text-center ${d.predikat === label ? `ring-2 ring-${color}-400 shadow-md` : ''}">
                    <p class="text-${color}-700 font-black text-lg">${range}</p>
                    <p class="text-${color}-600 text-xs font-semibold mt-0.5">${label}</p>
                    ${d.predikat === label ? '<i class="ri-map-pin-line text-' + color + '-600 text-sm mt-1 inline-block"></i>' : ''}
                </div>`).join('')}
            </div>
            <p class="text-xs text-gray-400 mt-4">
                * Penilaian berdasarkan <strong>Peraturan Menteri Koperasi dan UKM No. 20/Per/M.KUKM/XI/2008</strong> tentang Pedoman Penilaian Kesehatan KSP dan USP Koperasi.
                Aspek Manajemen dihitung menggunakan <em>proxy kuantitatif</em> dari data operasional karena penilaian manajemen idealnya memerlukan kuesioner evaluatif.
            </p>
        </div>`;

        document.getElementById('kk-export-btn').style.display = 'flex';
    },

    exportPDF() {
        if (!this.hasilData) return;
        const d = this.hasilData;
        const r = d.ringkasan;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();

        const title = 'LAPORAN PENILAIAN TINGKAT KESEHATAN KOPERASI';

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

        // Metadata Subtitle cleanly aligned at y=44 (below title drawn at 38.5)
        doc.setFontSize(7.5); 
        doc.setFont('helvetica', 'normal'); 
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`Tahun Buku Penilaian: ${d.tahun}  |  Rujukan: Permenkop RI No. 20/Per/M.KUKM/XI/2008`, 14, 44);

        // ── Predikat & Skor Bento Box shifted down to y=47 to prevent overlap ──
        const sColor = d.predikat_kode === 'sehat' ? [16, 185, 129] // Emerald
            : d.predikat_kode === 'cukup' ? [59, 130, 246]       // Blue
                : d.predikat_kode === 'kurang' ? [245, 158, 11]  // Amber
                    : [239, 68, 68];                             // Red

        const sTint = d.predikat_kode === 'sehat' ? [220, 252, 231]   // bg-emerald-100
            : d.predikat_kode === 'cukup' ? [219, 234, 254]           // bg-blue-100
                : d.predikat_kode === 'kurang' ? [254, 243, 199]      // bg-amber-100
                    : [254, 242, 242];                                // bg-red-100

        const sText = d.predikat_kode === 'sehat' ? [21, 128, 61]     // text-emerald-700
            : d.predikat_kode === 'cukup' ? [29, 78, 216]             // text-blue-700
                : d.predikat_kode === 'kurang' ? [180, 83, 9]         // text-amber-700
                    : [185, 28, 28];                                  // text-red-700

        doc.setFillColor(sTint[0], sTint[1], sTint[2]);
        doc.roundedRect(14, 47, pw - 28, 17, 2, 2, 'F');
        
        doc.setFillColor(sColor[0], sColor[1], sColor[2]);
        doc.rect(14, 47, 1.8, 17, 'F'); // Left vertical brand accent line

        // Left Column (Total Score)
        doc.setFontSize(6.5); 
        doc.setFont('helvetica', 'bold'); 
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text("TOTAL SKOR PENILAIAN KESEHATAN", 20, 52.5);
        
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
        doc.text("PREDIKAT TINGKAT KESEHATAN KOPERASI", pw - 20, 52.5, { align: 'right' });
        
        doc.setFontSize(12); 
        doc.setFont('helvetica', 'black'); 
        doc.setTextColor(sText[0], sText[1], sText[2]);
        doc.text(d.predikat.toUpperCase(), pw - 20, 59, { align: 'right' });

        // ── Ringkasan Keuangan (Executive 3-Column Bento Grid) ──
        doc.setFontSize(8.5); 
        doc.setFont('helvetica', 'bold'); 
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text('RINGKASAN DATA KEUANGAN', 14, 69.5);
        
        doc.setFillColor(bgRGB[0], bgRGB[1], bgRGB[2]);
        doc.roundedRect(14, 71.5, pw - 28, 20, 2, 2, 'F');
        
        doc.setFillColor(brandRGB[0], brandRGB[1], brandRGB[2]);
        doc.rect(14, 71.5, 1.5, 20, 'F'); // Left vertical brand accent line

        const keuData = [
            ['Total Aset', App.formatRupiah(r.total_aset)],
            ['Modal Sendiri', App.formatRupiah(r.modal_sendiri)],
            ['Total Simpanan', App.formatRupiah(r.total_simpanan)],
            ['Sisa Pinjaman', App.formatRupiah(r.sisa_pinjaman)],
            ['SHU Berjalan', App.formatRupiah(r.shu)],
            ['Total Anggota', r.total_anggota + ' Orang'],
        ];

        keuData.forEach(([l, v], i) => {
            const col = Math.floor(i / 2);
            const row = i % 2;
            const x = 20 + col * 58;
            const y = 77 + row * 8.5;
            
            // Draw small label
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139); // slate-500
            doc.text(l.toUpperCase(), x, y);
            
            // Draw clean bold value
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8.5);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text(v, x, y + 4.2);
        });

        // ── Tabel 7 Aspek ──
        doc.setFontSize(8.5); 
        doc.setFont('helvetica', 'bold'); 
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text('PENILAIAN TINGKAT KESEHATAN PER ASPEK', 14, 97.5);

        const body = d.aspek.map(a => {
            const pctA = a.bobot > 0 ? ((a.skor / a.bobot) * 100).toFixed(1) : '0';
            const ket = parseFloat(pctA) >= 80 ? 'Baik' : parseFloat(pctA) >= 60 ? 'Cukup Baik' : parseFloat(pctA) >= 40 ? 'Kurang' : 'Tidak Baik';
            return [a.no, a.nama, a.bobot, a.skor, pctA + '%', ket];
        });
        body.push(['', 'TOTAL PENILAIAN KESEHATAN', 100, d.total_skor, d.total_skor + '%', d.predikat]);

        doc.autoTable({
            startY: 100.5,
            head: [['No', 'Aspek Penilaian Tingkat Kesehatan', 'Bobot', 'Skor', '%', 'Keterangan']],
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
                4: { halign: 'center', cellWidth: 18 },
                5: { halign: 'center', cellWidth: 32 }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14, top: 48, bottom: 20 },
            didParseCell: (data) => {
                // Style the final total row
                if (data.row.index === body.length - 1) {
                    data.cell.styles.fontStyle = 'bold';
                    data.cell.styles.fillColor = [241, 245, 249];
                    data.cell.styles.textColor = [15, 23, 42];
                    if (data.column.index === 5) {
                        data.cell.styles.textColor = sText; // Color code the final predicate in the table
                    }
                }
                
                // Color code the "Keterangan" status column cells
                if (data.column.index === 5 && data.row.index < body.length - 1) {
                    const val = String(data.cell.raw).trim();
                    if (val === 'Baik') {
                        data.cell.styles.fillColor = [220, 252, 231]; // bg-green-100
                        data.cell.styles.textColor = [21, 128, 61];   // text-green-700
                        data.cell.styles.fontStyle = 'bold';
                    } else if (val === 'Cukup Baik') {
                        data.cell.styles.fillColor = [219, 234, 254]; // bg-blue-100
                        data.cell.styles.textColor = [29, 78, 216];   // text-blue-700
                        data.cell.styles.fontStyle = 'bold';
                    } else if (val === 'Kurang') {
                        data.cell.styles.fillColor = [254, 243, 199]; // bg-amber-100
                        data.cell.styles.textColor = [180, 83, 9];    // text-amber-700
                        data.cell.styles.fontStyle = 'bold';
                    } else {
                        data.cell.styles.fillColor = [254, 242, 242]; // bg-red-100
                        data.cell.styles.textColor = [185, 28, 28];   // text-red-700
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
            curY = 46; // FIXED: shifted down below header title to prevent overlap on new page!
        }

        doc.setFontSize(8.5); 
        doc.setFont('helvetica', 'bold'); 
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text('RANGKUMAN DETAIL INDIKATOR PENILAIAN PER ASPEK', 14, curY);

        const detailBody = [];
        d.aspek.forEach(a => {
            // Elegant background matching theme tint for aspect sub-headers inside the body
            detailBody.push([{ 
                content: `${a.no}. ${a.nama.toUpperCase()}`, 
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
                const nilaiDisplay = ind.satuan === '%' ? `${ind.nilai}%`
                    : ind.satuan === 'Rp' ? App.formatRupiah(ind.nilai)
                        : `${ind.nilai} ${ind.satuan}`;
                detailBody.push([ind.nama, nilaiDisplay, ind.bobot, ind.skor]);
            });
        });

        doc.autoTable({
            startY: curY + 3,
            head: [['Indikator Penilaian Aspek', 'Nilai Riil Koperasi', 'Bobot Poin', 'Skor Perolehan']],
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
                1: { halign: 'right', cellWidth: 35 },
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
