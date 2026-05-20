// Buku Simpanan Page — tampilan buku tabungan per rekening
const BukuSimpananPage = {
    rekeningData: null,
    transaksiData: [],

    async render(container) {
        App.setTitle('Buku Simpanan', 'Cetak buku tabungan per rekening anggota');

        container.innerHTML = `
        <div class="space-y-5 animate-fadeIn">

            <!-- Filter Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div class="flex flex-col lg:flex-row gap-3">
                    <!-- Pilih Rekening -->
                    <div class="flex-1 relative">
                        <label class="block text-xs font-semibold text-gray-500 mb-1.5">No. Rekening / Nama Anggota</label>
                        <input type="text" id="bs-rek-search"
                            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-400 transition-all"
                            placeholder="Ketik no. rekening atau nama anggota..." autocomplete="off">
                        <input type="hidden" id="bs-rek-id">
                        <div id="bs-rek-dd"
                            class="hidden border border-gray-200 rounded-xl mt-1 max-h-52 overflow-auto bg-white shadow-xl absolute z-50 w-full">
                        </div>
                    </div>
                    <!-- Dari -->
                    <div class="w-full lg:w-44">
                        <label class="block text-xs font-semibold text-gray-500 mb-1.5">Dari Tanggal</label>
                        <input type="text" id="bs-dari"
                            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500">
                    </div>
                    <!-- Sampai -->
                    <div class="w-full lg:w-44">
                        <label class="block text-xs font-semibold text-gray-500 mb-1.5">Sampai Tanggal</label>
                        <input type="text" id="bs-sampai"
                            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500">
                    </div>
                    <!-- Semua Periode -->
                    <div class="flex flex-col justify-end gap-2 lg:flex-row items-end">
                        <label class="flex items-center gap-2 text-sm text-gray-600 cursor-pointer mb-2.5">
                            <input type="checkbox" id="bs-all-period" class="w-4 h-4 rounded text-primary-600">
                            <span class="text-xs font-medium">Semua Periode</span>
                        </label>
                        <button onclick="BukuSimpananPage.load()"
                            class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm hover:shadow-primary-200 mb-0 lg:mb-0 h-10">
                            <i class="ri-search-line"></i> Tampilkan
                        </button>
                    </div>
                </div>
            </div>

            <!-- Content Area -->
            <div id="bs-content">
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center justify-center h-52">
                    <div class="text-center">
                        <div class="w-14 h-14 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                            <i class="ri-book-open-line text-3xl text-primary-400"></i>
                        </div>
                        <p class="text-gray-500 text-sm font-medium">Pilih rekening untuk menampilkan buku simpanan</p>
                        <p class="text-gray-400 text-xs mt-1">Cari berdasarkan nomor rekening atau nama anggota</p>
                    </div>
                </div>
            </div>
        </div>`;

        // Datepickers
        const today = App.todayDMY();
        const monthAgo = App.monthAgoDMY();
        App.datepicker('#bs-dari', { defaultDate: monthAgo });
        App.datepicker('#bs-sampai', { defaultDate: today });

        // Toggle semua periode
        document.getElementById('bs-all-period').addEventListener('change', (e) => {
            const disabled = e.target.checked;
            document.getElementById('bs-dari')._flatpickr?.set('clickOpens', !disabled);
            document.getElementById('bs-sampai')._flatpickr?.set('clickOpens', !disabled);
            document.getElementById('bs-dari').disabled = disabled;
            document.getElementById('bs-sampai').disabled = disabled;
        });

        // Search rekening autocomplete
        let debounce;
        document.getElementById('bs-rek-search').addEventListener('input', (e) => {
            clearTimeout(debounce);
            debounce = setTimeout(async () => {
                const q = e.target.value.trim();
                if (q.length < 2) {
                    document.getElementById('bs-rek-dd').classList.add('hidden');
                    return;
                }
                const r = await App.api(`rekening-simpanan?search=${encodeURIComponent(q)}&per_page=10`);
                const dd = document.getElementById('bs-rek-dd');
                if (r?.data?.length) {
                    dd.innerHTML = r.data.map(rk => `
                        <div class="px-4 py-3 hover:bg-primary-50 cursor-pointer border-b border-gray-50 last:border-0"
                             onclick="BukuSimpananPage.selectRekening(${rk.id},'${rk.no_rekening}','${rk.anggota_nama}','${rk.jenis_simpanan_nama}')">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                                    <i class="ri-bank-card-line text-primary-600 text-sm"></i>
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-gray-800 font-mono">${rk.no_rekening}</p>
                                    <p class="text-xs text-gray-500">${rk.anggota_nama} &bull; ${rk.jenis_simpanan_nama}</p>
                                </div>
                                <div class="ml-auto text-right">
                                    <p class="text-sm font-bold text-primary-600">${App.formatRupiah(rk.saldo)}</p>
                                </div>
                            </div>
                        </div>`).join('');
                    dd.classList.remove('hidden');
                } else {
                    dd.innerHTML = '<p class="px-4 py-3 text-sm text-gray-400">Rekening tidak ditemukan</p>';
                    dd.classList.remove('hidden');
                }
            }, 300);
        });

        // Tutup dropdown jika klik di luar
        document.addEventListener('click', (e) => {
            if (!document.getElementById('bs-rek-search')?.contains(e.target)) {
                document.getElementById('bs-rek-dd')?.classList.add('hidden');
            }
        });
    },

    selectRekening(id, noRek, nama, jenis) {
        document.getElementById('bs-rek-id').value = id;
        document.getElementById('bs-rek-search').value = `${noRek} — ${nama} (${jenis})`;
        document.getElementById('bs-rek-dd').classList.add('hidden');
        this.load();
    },

    async load() {
        const rekeningId = document.getElementById('bs-rek-id').value;
        if (!rekeningId) {
            App.toast('Pilih rekening terlebih dahulu', 'warning');
            return;
        }

        const content = document.getElementById('bs-content');
        content.innerHTML = `<div class="flex items-center justify-center h-40">
            <div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div>
        </div>`;

        const allPeriod = document.getElementById('bs-all-period').checked;
        let query = '';
        if (!allPeriod) {
            const dari = App.dateToISO(document.getElementById('bs-dari').value);
            const sampai = App.dateToISO(document.getElementById('bs-sampai').value);
            if (dari) query += `&dari=${dari}`;
            if (sampai) query += `&sampai=${sampai}`;
        }

        const res = await App.api(`simpanan/buku/${rekeningId}?${query}`);
        if (!res?.success) {
            content.innerHTML = `<div class="bg-white rounded-2xl border border-gray-100 p-10 text-center text-gray-400">
                <i class="ri-error-warning-line text-4xl"></i><p class="mt-2 text-sm">Gagal memuat data</p></div>`;
            return;
        }

        this.rekeningData = res.rekening;
        this.transaksiData = res.data || [];

        const rek = res.rekening;
        const txs = res.data || [];
        const saldoAwal = parseFloat(res.saldo_awal || 0);

        // Hitung saldo berjalan
        let saldoBerjalan = saldoAwal;
        const rows = txs.map(t => {
            const jumlah = parseFloat(t.jumlah);
            saldoBerjalan = parseFloat(t.saldo_sesudah);
            return { ...t, _saldo: saldoBerjalan };
        });

        const saldoAkhir = rows.length > 0 ? rows[rows.length - 1]._saldo : saldoAwal;

        content.innerHTML = `
        <!-- Header Info Rekening -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            <!-- Identitas Rekening (seperti sampul buku tabungan) -->
            <div class="relative bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 p-6 text-white overflow-hidden">
                <!-- Dekorasi -->
                <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-20 translate-x-20"></div>
                <div class="absolute -bottom-10 -left-10 w-40 h-40 bg-white/5 rounded-full"></div>

                <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div class="flex items-center gap-4">
                        <div class="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center border border-white/30 shrink-0">
                            <i class="ri-book-open-line text-2xl text-white"></i>
                        </div>
                        <div>
                            <p class="text-primary-200 text-xs font-medium uppercase tracking-wider mb-0.5">Buku Simpanan</p>
                            <h2 class="text-xl font-bold tracking-tight font-mono">${rek.no_rekening}</h2>
                            <p class="text-primary-200 text-sm mt-0.5">${rek.jenis_simpanan_nama} &bull; ${rek.jenis_kode}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div class="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                            <p class="text-primary-200 text-[10px] uppercase tracking-wider">Nama Anggota</p>
                            <p class="text-white text-sm font-bold mt-0.5">${rek.anggota_nama}</p>
                            <p class="text-primary-300 text-xs">${rek.no_anggota}</p>
                        </div>
                        <div class="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20">
                            <p class="text-primary-200 text-[10px] uppercase tracking-wider">Tgl Buka</p>
                            <p class="text-white text-sm font-bold mt-0.5">${App.formatDate(rek.tgl_buka)}</p>
                            <p class="text-primary-300 text-xs">${App.statusBadge(rek.status)}</p>
                        </div>
                        <div class="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 col-span-2 md:col-span-1">
                            <p class="text-primary-200 text-[10px] uppercase tracking-wider">Saldo Akhir</p>
                            <p class="text-white text-lg font-bold mt-0.5">${App.formatRupiah(saldoAkhir)}</p>
                            <p class="text-primary-300 text-xs">${txs.length} transaksi</p>
                        </div>
                    </div>
                </div>

                <!-- Tombol Export -->
                <div class="relative z-10 flex gap-2 mt-4">
                    <button onclick="BukuSimpananPage.exportPDF()"
                        class="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur border border-white/30 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all">
                        <i class="ri-printer-line"></i> Cetak PDF
                    </button>
                    <button onclick="BukuSimpananPage.exportCSV()"
                        class="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur border border-white/30 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all">
                        <i class="ri-file-excel-line"></i> Export CSV
                    </button>
                </div>
            </div>

            <!-- Ringkasan Saldo -->
            <div class="px-5 py-3 bg-gray-50 border-b border-gray-100 flex flex-wrap gap-5 items-center text-sm">
                <div class="flex items-center gap-2">
                    <span class="text-gray-400 text-xs">Saldo Awal Periode</span>
                    <span class="font-bold text-gray-700">${App.formatRupiah(saldoAwal)}</span>
                </div>
                <i class="ri-arrow-right-line text-gray-300"></i>
                <div class="flex items-center gap-2">
                    <span class="text-gray-400 text-xs">Total Debit</span>
                    <span class="font-bold text-emerald-600">+${App.formatRupiah(txs.reduce((s, t) => s + (t.dk === 'D' ? parseFloat(t.jumlah) : 0), 0))}</span>
                </div>
                <i class="ri-arrow-right-line text-gray-300"></i>
                <div class="flex items-center gap-2">
                    <span class="text-gray-400 text-xs">Total Kredit</span>
                    <span class="font-bold text-red-500">-${App.formatRupiah(txs.reduce((s, t) => s + (t.dk === 'K' ? parseFloat(t.jumlah) : 0), 0))}</span>
                </div>
                <i class="ri-arrow-right-line text-gray-300"></i>
                <div class="flex items-center gap-2">
                    <span class="text-gray-400 text-xs">Saldo Akhir</span>
                    <span class="font-bold text-primary-600 text-base">${App.formatRupiah(saldoAkhir)}</span>
                </div>
            </div>

            <!-- Tabel Buku Tabungan -->
            <div class="overflow-x-auto">
                <table class="w-full text-sm" id="bs-table">
                    <thead>
                        <tr class="bg-gray-50 border-b border-gray-100">
                            <th class="px-4 py-3 text-left font-semibold text-gray-500 text-xs w-10">No</th>
                            <th class="px-4 py-3 text-left font-semibold text-gray-500 text-xs">Tanggal</th>
                            <th class="px-4 py-3 text-left font-semibold text-gray-500 text-xs">No. Transaksi</th>
                            <th class="px-4 py-3 text-left font-semibold text-gray-500 text-xs">Keterangan</th>
                            <th class="px-4 py-3 text-right font-semibold text-gray-500 text-xs">Debit</th>
                            <th class="px-4 py-3 text-right font-semibold text-gray-500 text-xs">Kredit</th>
                            <th class="px-4 py-3 text-right font-semibold text-gray-500 text-xs">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Baris saldo awal -->
                        <tr class="bg-blue-50/50 border-b border-blue-100/50">
                            <td class="px-4 py-2.5" colspan="3"></td>
                            <td class="px-4 py-2.5 text-xs font-semibold text-blue-700">
                                <i class="ri-flag-line mr-1"></i>Saldo Awal Periode
                            </td>
                            <td class="px-4 py-2.5 text-right"></td>
                            <td class="px-4 py-2.5 text-right"></td>
                            <td class="px-4 py-2.5 text-right font-bold text-blue-700">${App.formatRupiah(saldoAwal)}</td>
                        </tr>
                        ${rows.length === 0 ? `
                        <tr>
                            <td colspan="7" class="text-center py-12 text-gray-400">
                                <i class="ri-inbox-line text-4xl block mb-2"></i>
                                Tidak ada transaksi pada periode ini
                            </td>
                        </tr>` : rows.map((t, i) => `
                        <tr class="border-b border-gray-50 hover:bg-gray-50/70 transition-colors">
                            <td class="px-4 py-3 text-gray-400 text-xs">${i + 1}</td>
                            <td class="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">${App.formatDate(t.tgl_transaksi)}</td>
                            <td class="px-4 py-3">
                                <span class="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">${t.no_transaksi}</span>
                            </td>
                            <td class="px-4 py-3">
                                <p class="text-gray-800 text-sm font-medium">${t.nama_transaksi}</p>
                                ${t.keterangan ? `<p class="text-gray-400 text-xs mt-0.5">${t.keterangan}</p>` : ''}
                            </td>
                            <td class="px-4 py-3 text-right font-semibold ${t.dk === 'D' ? 'text-emerald-600' : 'text-gray-300'}">
                                ${t.dk === 'D' ? App.formatRupiah(t.jumlah) : '-'}
                            </td>
                            <td class="px-4 py-3 text-right font-semibold ${t.dk === 'K' ? 'text-red-500' : 'text-gray-300'}">
                                ${t.dk === 'K' ? App.formatRupiah(t.jumlah) : '-'}
                            </td>
                            <td class="px-4 py-3 text-right font-bold text-gray-800">${App.formatRupiah(t._saldo)}</td>
                        </tr>`).join('')}
                        <!-- Baris saldo akhir -->
                        <tr class="bg-primary-50/50 border-t-2 border-primary-100">
                            <td class="px-4 py-3" colspan="3"></td>
                            <td class="px-4 py-3 text-xs font-bold text-primary-700">
                                <i class="ri-checkbox-circle-line mr-1"></i>Saldo Akhir
                            </td>
                            <td class="px-4 py-3 text-right font-bold text-emerald-600">
                                ${App.formatRupiah(txs.reduce((s, t) => s + (t.dk === 'D' ? parseFloat(t.jumlah) : 0), 0))}
                            </td>
                            <td class="px-4 py-3 text-right font-bold text-red-500">
                                ${App.formatRupiah(txs.reduce((s, t) => s + (t.dk === 'K' ? parseFloat(t.jumlah) : 0), 0))}
                            </td>
                            <td class="px-4 py-3 text-right font-bold text-primary-700 text-base">
                                ${App.formatRupiah(saldoAkhir)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    /* ---------- Export ---------- */
    exportPDF() {
        if (!this.rekeningData) return;
        const rek = this.rekeningData;
        const txs = this.transaksiData;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();

        const title = 'BUKU SIMPANAN';

        // Use App helpers for consistent branding
        App.drawPDFHeader(doc, title);
        App.drawPDFFooter(doc);

        // ── Info Rekening Box ──
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(14, 47, pw - 28, 28, 2, 2, 'F');
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);

        const leftX = 18; const rightX = pw / 2 + 2;
        doc.setFont('helvetica', 'bold'); doc.text('No. Rekening', leftX, 54);
        doc.setFont('helvetica', 'normal'); doc.text(': ' + rek.no_rekening, leftX + 30, 54);
        doc.setFont('helvetica', 'bold'); doc.text('Nama Anggota', leftX, 60);
        doc.setFont('helvetica', 'normal'); doc.text(': ' + rek.anggota_nama, leftX + 30, 60);
        doc.setFont('helvetica', 'bold'); doc.text('No. Anggota', leftX, 66);
        doc.setFont('helvetica', 'normal'); doc.text(': ' + rek.no_anggota, leftX + 30, 66);

        doc.setFont('helvetica', 'bold'); doc.text('Jenis Simpanan', rightX, 54);
        doc.setFont('helvetica', 'normal'); doc.text(': ' + rek.jenis_simpanan_nama, rightX + 32, 54);
        doc.setFont('helvetica', 'bold'); doc.text('Tgl Pembukaan', rightX, 60);
        doc.setFont('helvetica', 'normal'); doc.text(': ' + App.formatDate(rek.tgl_buka), rightX + 32, 60);
        doc.setFont('helvetica', 'bold'); doc.text('Status', rightX, 66);
        doc.setFont('helvetica', 'normal'); doc.text(': ' + (rek.status || '-').toUpperCase(), rightX + 32, 66);

        // ── Tabel Transaksi ──
        let saldoBerjalan = parseFloat(this.rekeningData?._saldo_awal || 0);

        const body = [];
        txs.forEach((t, i) => {
            const debit = t.dk === 'D' ? parseFloat(t.jumlah) : 0;
            const kredit = t.dk === 'K' ? parseFloat(t.jumlah) : 0;
            saldoBerjalan = parseFloat(t.saldo_sesudah);
            body.push([
                i + 1,
                App.formatDate(t.tgl_transaksi),
                t.no_transaksi,
                t.nama_transaksi + (t.keterangan ? '\n' + t.keterangan : ''),
                debit > 0 ? App.formatRupiah(debit) : '-',
                kredit > 0 ? App.formatRupiah(kredit) : '-',
                App.formatRupiah(saldoBerjalan)
            ]);
        });

        doc.autoTable({
            startY: 80,
            head: [['No', 'Tanggal', 'No. Transaksi', 'Keterangan', 'Debit', 'Kredit', 'Saldo']],
            body,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center', cellPadding: 3 },
            bodyStyles: { fontSize: 7.5, cellPadding: 2.5, textColor: [51, 65, 85] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 8 },
                1: { cellWidth: 22, halign: 'center' },
                2: { cellWidth: 30 },
                3: { cellWidth: 'auto' },
                4: { halign: 'right', cellWidth: 28 },
                5: { halign: 'right', cellWidth: 28 },
                6: { halign: 'right', cellWidth: 30, fontStyle: 'bold' }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14, top: 48, bottom: 20 },
            didDrawPage: (data) => {
                App.drawPDFHeader(doc, title);
                App.drawPDFFooter(doc);
            }
        });

        // ── Saldo Akhir di bawah tabel ──
        const finalY = doc.lastAutoTable.finalY + 5;
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(pw - 80, finalY, 66, 14, 2, 2, 'F');
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(15, 23, 42);
        doc.text('Saldo Akhir', pw - 76, finalY + 6);
        doc.text(App.formatRupiah(saldoBerjalan), pw - 16, finalY + 6, { align: 'right' });
        doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
        doc.text(`per ${App.todayDMY()}`, pw - 76, finalY + 11);

        window.open(doc.output('bloburl'), '_blank');
    },

    exportCSV() {
        if (!this.rekeningData) return;
        const cols = [
            { title: 'No', key: 'no' },
            { title: 'Tanggal', key: 'tgl_transaksi' },
            { title: 'No. Transaksi', key: 'no_transaksi' },
            { title: 'Keterangan', key: 'keterangan_full' },
            { title: 'Debit', key: 'debit' },
            { title: 'Kredit', key: 'kredit' },
            { title: 'Saldo', key: 'saldo_sesudah' }
        ];
        const data = this.transaksiData.map((t, i) => ({
            no: i + 1,
            tgl_transaksi: App.formatDate(t.tgl_transaksi),
            no_transaksi: t.no_transaksi,
            keterangan_full: t.nama_transaksi + (t.keterangan ? ' - ' + t.keterangan : ''),
            debit: t.dk === 'D' ? App.formatRupiah(t.jumlah) : '-',
            kredit: t.dk === 'K' ? App.formatRupiah(t.jumlah) : '-',
            saldo_sesudah: App.formatRupiah(t.saldo_sesudah)
        }));
        App.exportCSV(`buku_simpanan_${this.rekeningData.no_rekening}`, cols, data);
    }
};

window.BukuSimpananPage = BukuSimpananPage;
export default BukuSimpananPage;
