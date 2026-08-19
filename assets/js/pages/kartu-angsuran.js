// Kartu Angsuran Page — tampilan kartu cicilan per rekening pinjaman
const KartuAngsuranPage = {
    pinjamanData: null,
    angsuranData: [],

    async render(container) {
        App.setTitle('Kartu Angsuran', 'Rincian jadwal & riwayat angsuran per pinjaman');

        container.innerHTML = `
        <div class="space-y-5 animate-fadeIn">

            <!-- Filter Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div class="flex flex-col lg:flex-row gap-3 items-end">
                    <div class="flex-1 relative">
                        <label class="block text-xs font-semibold text-gray-500 mb-1.5">No. Pinjaman / Nama Anggota</label>
                        <input type="text" id="ka-search"
                            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-400"
                            placeholder="Ketik no. pinjaman atau nama anggota..." autocomplete="off">
                        <input type="hidden" id="ka-pinjaman-id">
                        <div id="ka-dd"
                            class="hidden border border-gray-200 rounded-xl mt-1 max-h-60 overflow-auto bg-white shadow-xl absolute z-50 w-full">
                        </div>
                    </div>
                    <button onclick="KartuAngsuranPage.load()"
                        class="bg-primary-600 hover:bg-primary-700 text-white px-5 h-10 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm hover:shadow-primary-200">
                        <i class="ri-search-line"></i> Tampilkan
                    </button>
                </div>
            </div>

            <!-- Content Area -->
            <div id="ka-content">
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center h-52">
                    <div class="text-center">
                        <div class="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <i class="ri-coupon-3-line text-3xl text-rose-400"></i>
                        </div>
                        <p class="text-gray-500 text-sm font-medium">Pilih pinjaman untuk menampilkan kartu angsuran</p>
                        <p class="text-gray-400 text-xs mt-1">Cari berdasarkan nomor pinjaman atau nama anggota</p>
                    </div>
                </div>
            </div>
        </div>`;

        // Autocomplete pinjaman
        let debounce;
        document.getElementById('ka-search').addEventListener('input', (e) => {
            clearTimeout(debounce);
            debounce = setTimeout(async () => {
                const q = e.target.value.trim();
                if (q.length < 2) { document.getElementById('ka-dd').classList.add('hidden'); return; }

                const r = await App.api(`pinjaman?search=${encodeURIComponent(q)}&per_page=10`);
                const dd = document.getElementById('ka-dd');
                if (r?.data?.length) {
                    dd.innerHTML = r.data.map(p => {
                        const statusColor = p.status === 'lunas' ? 'text-emerald-600 bg-emerald-50'
                            : p.status === 'cair' ? 'text-blue-600 bg-blue-50'
                                : 'text-amber-600 bg-amber-50';
                        return `
                        <div class="px-4 py-3 hover:bg-primary-50 cursor-pointer border-b border-gray-50 last:border-0"
                             onclick="KartuAngsuranPage.selectPinjaman(${p.id},'${p.no_pinjaman}','${p.anggota_nama}','${p.jenis_pinjaman}')">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center shrink-0">
                                    <i class="ri-hand-coin-line text-rose-600 text-sm"></i>
                                </div>
                                <div class="flex-1">
                                    <p class="text-sm font-bold text-gray-800 font-mono">${p.no_pinjaman}</p>
                                    <p class="text-xs text-gray-500">${p.anggota_nama} &bull; ${p.jenis_pinjaman} &bull; ${p.tenor} bln</p>
                                </div>
                                <div class="text-right shrink-0">
                                    <p class="text-sm font-bold text-rose-600">${App.formatRupiah(p.jumlah)}</p>
                                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColor}">${p.status}</span>
                                </div>
                            </div>
                        </div>`;
                    }).join('');
                    dd.classList.remove('hidden');
                } else {
                    dd.innerHTML = '<p class="px-4 py-3 text-sm text-gray-400">Pinjaman tidak ditemukan</p>';
                    dd.classList.remove('hidden');
                }
            }, 300);
        });

        document.addEventListener('click', (e) => {
            if (!document.getElementById('ka-search')?.contains(e.target)) {
                document.getElementById('ka-dd')?.classList.add('hidden');
            }
        });
    },

    selectPinjaman(id, noPinjaman, nama, jenis) {
        document.getElementById('ka-pinjaman-id').value = id;
        document.getElementById('ka-search').value = `${noPinjaman} — ${nama} (${jenis})`;
        document.getElementById('ka-dd').classList.add('hidden');
        this.load();
    },

    async load() {
        const pinjamanId = document.getElementById('ka-pinjaman-id').value;
        if (!pinjamanId) { App.toast('Pilih pinjaman terlebih dahulu', 'warning'); return; }

        const content = document.getElementById('ka-content');
        content.innerHTML = `<div class="flex items-center justify-center h-40">
            <div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
        </div>`;

        const res = await App.api(`pinjaman/${pinjamanId}`);
        if (!res?.success) {
            content.innerHTML = `<div class="bg-white rounded-2xl border p-10 text-center text-gray-400">
                <i class="ri-error-warning-line text-4xl"></i><p class="mt-2 text-sm">Gagal memuat data</p></div>`;
            return;
        }

        const p = res.data;
        const txs = res.data.angsuran || [];
        this.pinjamanData = p;
        this.angsuranData = txs;

        // Statistik
        const terbayar = txs.filter(a => a.status !== 'belum').length;
        const tersisa = txs.filter(a => a.status === 'belum').length;
        const terlambat = txs.filter(a => a.status === 'terlambat').length;
        const totalPokok = txs.reduce((s, a) => s + parseFloat(a.pokok || 0), 0);
        const totalBunga = txs.reduce((s, a) => s + parseFloat(a.bunga || 0), 0);
        const totalDenda = txs.reduce((s, a) => s + parseFloat(a.denda || 0), 0);
        const sudahBayar = txs.filter(a => a.status !== 'belum').reduce((s, a) => s + parseFloat(a.total || 0), 0);
        const progressPct = p.total_bayar > 0 ? Math.min(100, Math.round(((parseFloat(p.total_bayar) - parseFloat(p.sisa_pinjaman)) / parseFloat(p.total_bayar)) * 100)) : 0;
        
        // Hitung Baki Debet secara progresif/realistis menyesuaikan p.sisa_pinjaman
        const sisaPinjaman = parseFloat(p.sisa_pinjaman || 0);
        let lastPaidIdx = -1;
        for (let i = 0; i < txs.length; i++) {
            if (txs[i].status !== 'belum') {
                lastPaidIdx = i;
            }
        }
        const bakiDebetList = new Array(txs.length);
        let currentBD = sisaPinjaman;
        for (let i = lastPaidIdx; i >= 0; i--) {
            bakiDebetList[i] = currentBD;
            currentBD += parseFloat(txs[i].pokok || 0);
        }
        for (let i = lastPaidIdx + 1; i < txs.length; i++) {
            bakiDebetList[i] = sisaPinjaman;
        }

        const statusColor = p.status === 'lunas'
            ? 'from-emerald-600 via-emerald-700 to-emerald-900'
            : p.status === 'cair'
                ? 'from-rose-600 via-rose-700 to-rose-900'
                : 'from-amber-600 via-amber-700 to-amber-900';

        content.innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            <!-- Header Kartu Pinjaman -->
            <div class="relative bg-gradient-to-br ${statusColor} p-6 text-white overflow-hidden">
                <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-20 translate-x-20"></div>
                <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full"></div>

                <div class="relative z-10 flex flex-col md:flex-row gap-5 justify-between">
                    <!-- Info Pinjaman -->
                    <div class="flex items-start gap-4">
                        <div class="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/30 shrink-0">
                            <i class="ri-coupon-3-line text-2xl text-white"></i>
                        </div>
                        <div>
                            <p class="text-rose-200 text-xs font-medium uppercase tracking-wider mb-0.5">Kartu Angsuran</p>
                            <h2 class="text-xl font-bold tracking-tight font-mono">${p.no_pinjaman}</h2>
                            <p class="text-rose-200 text-sm mt-0.5">${p.jenis_pinjaman}</p>
                        </div>
                    </div>

                    <!-- Grid Info -->
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div class="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                            <p class="text-[10px] opacity-70 uppercase tracking-wider">Anggota</p>
                            <p class="text-white text-sm font-bold mt-0.5">${p.anggota_nama}</p>
                            <p class="text-[10px] opacity-60">${p.no_anggota}</p>
                        </div>
                        <div class="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                            <p class="text-[10px] opacity-70 uppercase tracking-wider">Jumlah Pinjaman</p>
                            <p class="text-white text-sm font-bold mt-0.5">${App.formatRupiah(p.jumlah)}</p>
                            <p class="text-[10px] opacity-60">${p.tenor} bulan · ${p.bunga_persen}%/bln</p>
                        </div>
                        <div class="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                            <p class="text-[10px] opacity-70 uppercase tracking-wider">Sisa Pinjaman</p>
                            <p class="text-white text-sm font-bold mt-0.5">${App.formatRupiah(p.sisa_pinjaman)}</p>
                            <p class="text-[10px] opacity-60">dari ${App.formatRupiah(p.total_bayar)}</p>
                        </div>
                        <div class="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                            <p class="text-[10px] opacity-70 uppercase tracking-wider">Tgl Pencairan</p>
                            <p class="text-white text-sm font-bold mt-0.5">${App.formatDate(p.tgl_pencairan || p.tgl_pengajuan)}</p>
                            <p class="text-[10px] opacity-60">${App.statusBadge(p.status)}</p>
                        </div>
                    </div>
                </div>

                <!-- Progress Bar -->
                <div class="relative z-10 mt-5">
                    <div class="flex justify-between text-xs text-white/70 mb-1">
                        <span>Progres Pelunasan</span>
                        <span class="font-bold text-white">${progressPct}% (${terbayar}/${p.tenor} angsuran)</span>
                    </div>
                    <div class="w-full bg-white/20 rounded-full h-2.5">
                        <div class="bg-white rounded-full h-2.5 transition-all duration-700" style="width:${progressPct}%"></div>
                    </div>
                </div>

                <!-- Tombol Export -->
                <div class="relative z-10 flex gap-2 mt-4">
                    <button onclick="KartuAngsuranPage.exportPDF()"
                        class="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur border border-white/30 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all">
                        <i class="ri-printer-line"></i> Cetak PDF
                    </button>
                    <button onclick="KartuAngsuranPage.exportCSV()"
                        class="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur border border-white/30 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all">
                        <i class="ri-file-excel-line"></i> Export CSV
                    </button>
                </div>
            </div>

            <!-- Statistik Row -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-0 border-b border-gray-100 divide-x divide-gray-100">
                ${[
                { label: 'Sudah Dibayar', val: terbayar + ' angsuran', cls: 'text-emerald-600' },
                { label: 'Belum Dibayar', val: tersisa + ' angsuran', cls: 'text-amber-600' },
                { label: 'Terlambat', val: terlambat + ' angsuran', cls: 'text-red-500' },
                { label: 'Total Bunga', val: App.formatRupiah(totalBunga), cls: 'text-blue-600' },
                { label: 'Total Denda', val: App.formatRupiah(totalDenda), cls: 'text-orange-600' }
            ].map(s => `
                    <div class="px-4 py-3 text-center">
                        <p class="text-xs text-gray-400">${s.label}</p>
                        <p class="font-bold text-sm ${s.cls} mt-0.5">${s.val}</p>
                    </div>`).join('')}
            </div>

            <!-- Tabel Angsuran -->
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-100">
                            <th class="px-4 py-3 text-center font-semibold text-gray-500 text-xs w-12">Ke-</th>
                            <th class="px-4 py-3 text-left font-semibold text-gray-500 text-xs">Transaksi / Tgl Bayar</th>
                            <th class="px-4 py-3 text-center font-semibold text-gray-500 text-xs">Jatuh Tempo</th>
                            <th class="px-4 py-3 text-right font-semibold text-gray-500 text-xs">Pokok</th>
                            <th class="px-4 py-3 text-right font-semibold text-gray-500 text-xs">Bunga</th>
                            <th class="px-4 py-3 text-right font-semibold text-gray-500 text-xs">Denda</th>
                            <th class="px-4 py-3 text-right font-semibold text-gray-500 text-xs">Total</th>
                            <th class="px-4 py-3 text-right font-semibold text-gray-500 text-xs">Baki Debet</th>
                            <th class="px-4 py-3 text-center font-semibold text-gray-500 text-xs">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${txs.length === 0 ? `<tr><td colspan="9" class="text-center py-12 text-gray-400">
                            <i class="ri-inbox-line text-4xl block mb-2"></i>Belum ada jadwal angsuran</td></tr>`
                : txs.map((a, idx) => {
                    const isLunas = a.status === 'lunas';
                    const isTerlambat = a.status === 'terlambat';
                    const isBelum = a.status === 'belum';
                    const today = App.todayISO();
                    const isJatuhTempo = isBelum && a.tgl_jatuh_tempo <= today;

                    const rowClass = isLunas ? 'bg-emerald-50/30'
                        : isTerlambat ? 'bg-red-50/30'
                            : isJatuhTempo ? 'bg-amber-50/40'
                                : '';

                    return `<tr class="border-b border-gray-50 hover:bg-gray-50/70 transition-colors ${rowClass}">
                                <td class="px-4 py-3 text-center font-bold text-gray-600">${a.angsuran_ke}</td>
                                <td class="px-4 py-3">
                                    <span class="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded block w-fit mb-1">${a.no_transaksi || '-'}</span>
                                    <span class="text-xs ${a.tgl_bayar ? 'text-gray-600' : 'text-gray-300'}">${a.tgl_bayar ? App.formatDate(a.tgl_bayar) : '—'}</span>
                                </td>
                                <td class="px-4 py-3 text-center text-sm ${isJatuhTempo ? 'text-red-600 font-bold' : 'text-gray-600'}">
                                    ${App.formatDate(a.tgl_jatuh_tempo)}
                                    ${isJatuhTempo ? '<br><span class="text-[9px] bg-red-100 text-red-600 px-1 rounded">Jatuh Tempo!</span>' : ''}
                                </td>
                                <td class="px-4 py-3 text-right text-sm font-semibold text-gray-700">${App.formatRupiah(a.pokok)}</td>
                                <td class="px-4 py-3 text-right text-sm text-blue-600">${App.formatRupiah(a.bunga)}</td>
                                <td class="px-4 py-3 text-right text-sm ${parseFloat(a.denda || 0) > 0 ? 'text-red-500 font-semibold' : 'text-gray-300'}">${parseFloat(a.denda || 0) > 0 ? App.formatRupiah(a.denda) : '—'}</td>
                                <td class="px-4 py-3 text-right text-sm font-bold text-gray-800">${App.formatRupiah(a.total)}</td>
                                <td class="px-4 py-3 text-right text-sm font-semibold text-gray-700">${App.formatRupiah(bakiDebetList[idx])}</td>
                                <td class="px-4 py-3 text-center">${App.statusBadge(a.status)}</td>
                            </tr>`;
                }).join('')}

                        <!-- Row Total -->
                        <tr class="bg-gray-50 border-t-2 border-gray-200 font-bold">
                            <td class="px-4 py-3 text-center text-gray-500 text-xs" colspan="3">TOTAL</td>
                            <td class="px-4 py-3 text-right text-gray-800">${App.formatRupiah(totalPokok)}</td>
                            <td class="px-4 py-3 text-right text-blue-600">${App.formatRupiah(totalBunga)}</td>
                            <td class="px-4 py-3 text-right text-red-500">${App.formatRupiah(totalDenda)}</td>
                            <td class="px-4 py-3 text-right text-gray-800 text-base">${App.formatRupiah(totalPokok + totalBunga + totalDenda)}</td>
                            <td class="px-4 py-3 text-right text-gray-800">${App.formatRupiah(p.sisa_pinjaman)}</td>
                            <td></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Keterangan Legend -->
            <div class="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
                <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-emerald-100 inline-block"></span>Lunas</span>
                <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-red-100 inline-block"></span>Terlambat</span>
                <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-amber-100 inline-block"></span>Jatuh Tempo Hari Ini / Lewat</span>
                <span class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-white border border-gray-200 inline-block"></span>Belum Jatuh Tempo</span>
            </div>
        </div>`;
    },

    /* ─── Export PDF ─── */
    exportPDF() {
        if (!this.pinjamanData) return;
        const p = this.pinjamanData;
        const txs = this.angsuranData;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'mm', 'a4'); // landscape untuk banyak kolom
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();

        const title = 'KARTU ANGSURAN PINJAMAN';

        // Use App helpers for consistent branding
        App.drawPDFHeader(doc, title);
        App.drawPDFFooter(doc);

        // ── Info Box (shifted down to y=47 to prevent overlap with title at y=38.5) ──
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(14, 47, pw - 28, 28, 2, 2, 'F');
        doc.setFontSize(8); doc.setTextColor(71, 85, 105);

        const L = 18, R = pw / 2 + 2;
        const row = (x, y, label, val) => {
            doc.setFont('helvetica', 'bold'); doc.text(label, x, y);
            doc.setFont('helvetica', 'normal'); doc.text(': ' + (val || '-'), x + 36, y);
        };
        row(L, 54, 'No. Pinjaman', p.no_pinjaman);
        row(L, 60, 'Nama Anggota', p.anggota_nama);
        row(L, 66, 'No. Anggota', p.no_anggota);
        row(R, 54, 'Jenis Pinjaman', p.jenis_pinjaman);
        row(R, 60, 'Jumlah Pinjaman', App.formatRupiah(p.jumlah));
        row(R, 66, 'Tenor / Bunga', `${p.tenor} bulan / ${p.bunga_persen}%/bln`);

        // ── Tabel ──
        const sisaPinjaman = parseFloat(p.sisa_pinjaman || 0);
        let lastPaidIdx = -1;
        for (let i = 0; i < txs.length; i++) {
            if (txs[i].status !== 'belum') {
                lastPaidIdx = i;
            }
        }
        const bakiDebetList = new Array(txs.length);
        let currentBD = sisaPinjaman;
        for (let i = lastPaidIdx; i >= 0; i--) {
            bakiDebetList[i] = currentBD;
            currentBD += parseFloat(txs[i].pokok || 0);
        }
        for (let i = lastPaidIdx + 1; i < txs.length; i++) {
            bakiDebetList[i] = sisaPinjaman;
        }

        const body = txs.map((a, i) => [
            a.angsuran_ke,
            `${a.no_transaksi || '-'}\n${a.tgl_bayar ? App.formatDate(a.tgl_bayar) : '-'}`,
            App.formatDate(a.tgl_jatuh_tempo),
            App.formatRupiah(a.pokok),
            App.formatRupiah(a.bunga),
            parseFloat(a.denda || 0) > 0 ? App.formatRupiah(a.denda) : '-',
            App.formatRupiah(a.total),
            App.formatRupiah(bakiDebetList[i]),
            (a.status || '-').toUpperCase()
        ]);

        doc.autoTable({
            startY: 80,
            head: [['Ke-', 'Transaksi / Tgl Bayar', 'Jatuh Tempo', 'Pokok', 'Bunga', 'Denda', 'Total', 'Baki Debet', 'Status']],
            body,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 7.5, cellPadding: 2.5, textColor: [51, 65, 85] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { cellWidth: 40 },
                2: { halign: 'center', cellWidth: 28 },
                3: { halign: 'right', cellWidth: 28 },
                4: { halign: 'right', cellWidth: 28 },
                5: { halign: 'right', cellWidth: 24 },
                6: { halign: 'right', cellWidth: 30, fontStyle: 'bold' },
                7: { halign: 'right', cellWidth: 30 },
                8: { halign: 'center', cellWidth: 22 }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14, top: 48, bottom: 20 },
            didDrawPage: () => {
                App.drawPDFHeader(doc, title);
                App.drawPDFFooter(doc);
            }
        });

        // ── Ringkasan bawah ──
        const fy = doc.lastAutoTable.finalY + 5;
        const totalPokok = txs.reduce((s, a) => s + parseFloat(a.pokok || 0), 0);
        const totalBunga = txs.reduce((s, a) => s + parseFloat(a.bunga || 0), 0);
        const totalDenda = txs.reduce((s, a) => s + parseFloat(a.denda || 0), 0);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(pw - 110, fy, 96, 22, 2, 2, 'F');
        doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text('Sisa Pinjaman', pw - 106, fy + 7);
        doc.text(App.formatRupiah(p.sisa_pinjaman), pw - 16, fy + 7, { align: 'right' });
        doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
        doc.text(`Total Bunga: ${App.formatRupiah(totalBunga)}  |  Total Denda: ${App.formatRupiah(totalDenda)}`, pw - 106, fy + 14);

        window.open(doc.output('bloburl'), '_blank');
    },

    /* ─── Export CSV ─── */
    exportCSV() {
        if (!this.pinjamanData) return;
        const cols = [
            { title: 'Ke-', key: 'angsuran_ke' },
            { title: 'Transaksi / Tgl Bayar', key: 'transaksi_tgl_bayar' },
            { title: 'Jatuh Tempo', key: 'tgl_jatuh_tempo' },
            { title: 'Pokok', key: 'pokok' },
            { title: 'Bunga', key: 'bunga' },
            { title: 'Denda', key: 'denda' },
            { title: 'Total', key: 'total' },
            { title: 'Baki Debet', key: 'baki_debet' },
            { title: 'Status', key: 'status' }
        ];
        let csvBakiDebetList = new Array(this.angsuranData.length);
        const sisaPinjamanCSV = parseFloat(this.pinjamanData.sisa_pinjaman || 0);
        let lastPaidIdxCSV = -1;
        for (let i = 0; i < this.angsuranData.length; i++) {
            if (this.angsuranData[i].status !== 'belum') {
                lastPaidIdxCSV = i;
            }
        }
        let currentBDCSV = sisaPinjamanCSV;
        for (let i = lastPaidIdxCSV; i >= 0; i--) {
            csvBakiDebetList[i] = currentBDCSV;
            currentBDCSV += parseFloat(this.angsuranData[i].pokok || 0);
        }
        for (let i = lastPaidIdxCSV + 1; i < this.angsuranData.length; i++) {
            csvBakiDebetList[i] = sisaPinjamanCSV;
        }

        const data = this.angsuranData.map((a, i) => {
            return {
                angsuran_ke: a.angsuran_ke,
                transaksi_tgl_bayar: `${a.no_transaksi || '-'} / ${a.tgl_bayar ? App.formatDate(a.tgl_bayar) : '-'}`,
                tgl_jatuh_tempo: App.formatDate(a.tgl_jatuh_tempo),
                pokok: App.formatRupiah(a.pokok),
                bunga: App.formatRupiah(a.bunga),
                denda: parseFloat(a.denda || 0) > 0 ? App.formatRupiah(a.denda) : '-',
                total: App.formatRupiah(a.total),
                baki_debet: App.formatRupiah(csvBakiDebetList[i]),
                status: a.status
            };
        });
        App.exportCSV(`kartu_angsuran_${this.pinjamanData.no_pinjaman}`, cols, data);
    }
};

window.KartuAngsuranPage = KartuAngsuranPage;
export default KartuAngsuranPage;
