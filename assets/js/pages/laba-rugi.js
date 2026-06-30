// Laba Rugi Page
const LabaRugiPage = {
    data: null,
    dari: '',
    sampai: '',
    mode: 'sesudah', // 'sebelum' | 'sesudah'

    async render(container) {
        App.setTitle('Laporan Laba Rugi', 'Pendapatan dan beban koperasi');
        this.container = container;
        this.load();
    },

    async load() {
        const dariEl = document.getElementById('lr-dari');
        const sampaiEl = document.getElementById('lr-sampai');
        const dariUI = dariEl ? dariEl.value : '01-01-' + new Date().getFullYear();
        const sampaiUI = sampaiEl ? sampaiEl.value : App.todayDMY();
        this.dari = App.dateToISO(dariUI);
        this.sampai = App.dateToISO(sampaiUI);
        const modeEl = document.querySelector('input[name="lr-mode"]:checked');
        if (modeEl) this.mode = modeEl.value;

        const res = await App.api(`keuangan/laba-rugi?dari=${this.dari}&sampai=${this.sampai}&mode=${this.mode}`);
        if (!res?.success) return;

        this.data = res.data;
        const d = this.data;

        this.container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col gap-4 mb-8">
                <div class="flex flex-col md:flex-row md:items-end gap-3 md:gap-4">
                    <div class="w-full md:w-auto">
                        <label class="block text-xs font-semibold text-gray-400 mb-1">Dari</label>
                        <input type="text" id="lr-dari" class="w-full md:w-auto border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Dari">
                    </div>
                    <div class="w-full md:w-auto">
                        <label class="block text-xs font-semibold text-gray-400 mb-1">Sampai</label>
                        <input type="text" id="lr-sampai" class="w-full md:w-auto border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Sampai">
                    </div>
                    <!-- Toggle Mode -->
                    <div class="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-full md:w-auto">
                        <label class="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-semibold transition-all flex-1 md:flex-initial
                            ${this.mode === 'sebelum' ? 'bg-white shadow text-amber-700' : 'text-gray-500 hover:text-gray-700'}">
                            <input type="radio" name="lr-mode" value="sebelum" ${this.mode === 'sebelum' ? 'checked' : ''} class="hidden" onchange="LabaRugiPage.load()">
                            <i class="ri-time-line"></i> <span class="hidden sm:inline">Sebelum</span>
                        </label>
                        <label class="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-semibold transition-all flex-1 md:flex-initial
                            ${this.mode === 'sesudah' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}">
                            <input type="radio" name="lr-mode" value="sesudah" ${this.mode === 'sesudah' ? 'checked' : ''} class="hidden" onchange="LabaRugiPage.load()">
                            <i class="ri-checkbox-circle-line"></i> <span class="hidden sm:inline">Sesudah</span>
                        </label>
                    </div>
                    <button onclick="LabaRugiPage.load()" class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors w-full md:w-auto">Tampilkan</button>
                </div>
                
                <div class="flex flex-col md:flex-row gap-2 md:justify-end">
                    ${App.hasPerm('keuangan.jurnal') ? `
                    <button onclick="LabaRugiPage.importForm()" class="bg-white border border-gray-200 hover:border-primary-500 hover:text-primary-600 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all">
                        <i class="ri-file-upload-line"></i> Import Saldo Awal
                    </button>
                    ` : ''}
                    <button onclick="LabaRugiPage.export('pdf')" class="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Export PDF">
                        <i class="ri-file-pdf-line text-xl"></i>
                    </button>
                    <button onclick="LabaRugiPage.export('csv')" class="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Export CSV">
                        <i class="ri-file-excel-line text-xl"></i>
                    </button>
                    <button onclick="window.print()" class="p-2.5 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors" title="Cetak">
                        <i class="ri-printer-line text-xl"></i>
                    </button>
                </div>
            </div>

            <div class="text-center mb-8 md:mb-10">
                <h2 class="text-xl md:text-2xl font-black text-gray-800 tracking-tight uppercase">LAPORAN LABA RUGI</h2>
                <p class="text-xs md:text-sm text-gray-400 font-medium mt-1">${App.formatDate(d.periode.dari)} s/d ${App.formatDate(d.periode.sampai)}</p>
                <span class="inline-flex items-center gap-1.5 mt-2 text-xs font-bold px-3 py-1 rounded-full
                    ${d.mode === 'sebelum' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}">
                    <i class="${d.mode === 'sebelum' ? 'ri-time-line' : 'ri-checkbox-circle-line'}"></i>
                    ${d.mode === 'sebelum' ? 'Sebelum Akhir Tahun' : 'Sesudah Akhir Tahun'}
                </span>
            </div>

            <div class="max-w-3xl mx-auto space-y-1">
                <!-- PENDAPATAN -->
                <div class="flex justify-between py-2 text-sm border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded-lg transition-colors bg-gray-100">
                    <span class="text-gray-700 font-bold">PENDAPATAN</span>
                    <span class="font-mono font-bold text-gray-900"></span>
                </div>
                ${d.pendapatan.map(a => `<div class="flex justify-between py-2 text-sm border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded-lg transition-colors ml-4">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-mono text-gray-400 leading-none mb-0.5">${a.kode}</span>
                        <span class="text-gray-700">${a.nama}</span>
                    </div>
                    <span class="font-mono font-bold text-emerald-600">${App.formatRupiah(a.saldo)}</span>
                </div>`).join('')}
                
                <div class="flex justify-between py-2 text-sm border-b-2 border-gray-300 px-2 rounded-lg mt-2 font-bold">
                    <span class="text-gray-700">Total Pendapatan</span>
                    <span class="font-mono text-gray-900">${App.formatRupiah(d.total_pendapatan)}</span>
                </div>

                <!-- BEBAN OPERASIONAL -->
                <div class="flex justify-between py-3 text-sm border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded-lg transition-colors bg-gray-100 mt-4 font-bold">
                    <span class="text-gray-700">BEBAN OPERASIONAL</span>
                    <span class="font-mono text-gray-900"></span>
                </div>
                ${d.beban_operasional.map(a => `<div class="flex justify-between py-2 text-sm border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded-lg transition-colors ml-4">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-mono text-gray-400 leading-none mb-0.5">${a.kode}</span>
                        <span class="text-gray-700">${a.nama}</span>
                    </div>
                    <span class="font-mono font-bold text-red-500">${App.formatRupiah(a.saldo)}</span>
                </div>`).join('')}
                
                <div class="flex justify-between py-2 text-sm border-b-2 border-gray-300 px-2 rounded-lg font-bold">
                    <span class="text-gray-700">Total Beban Operasional</span>
                    <span class="font-mono text-gray-900">${App.formatRupiah(d.total_beban_operasional)}</span>
                </div>

                <!-- LABA KOTOR -->
                <div class="flex justify-between py-3 text-sm px-2 rounded-lg mt-3 font-bold bg-blue-50 border border-blue-200">
                    <span class="text-blue-700">LABA KOTOR</span>
                    <span class="font-mono text-blue-900">${App.formatRupiah(d.laba_kotor)}</span>
                </div>

                <!-- BEBAN PAJAK -->
                ${d.beban_pajak.length > 0 ? `
                <div class="flex justify-between py-3 text-sm border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded-lg transition-colors bg-gray-100 mt-4 font-bold">
                    <span class="text-gray-700">PAJAK</span>
                    <span class="font-mono text-gray-900"></span>
                </div>
                ${d.beban_pajak.map(a => `<div class="flex justify-between py-2 text-sm border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded-lg transition-colors ml-4">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-mono text-gray-400 leading-none mb-0.5">${a.kode}</span>
                        <span class="text-gray-700">${a.nama}</span>
                    </div>
                    <span class="font-mono font-bold text-orange-600">${App.formatRupiah(a.saldo)}</span>
                </div>`).join('')}
                
                <div class="flex justify-between py-2 text-sm border-b-2 border-gray-300 px-2 rounded-lg font-bold">
                    <span class="text-gray-700">Total Pajak</span>
                    <span class="font-mono text-gray-900">${App.formatRupiah(d.total_beban_pajak)}</span>
                </div>
                ` : ''}

                <!-- LABA SETELAH PAJAK -->
                <div class="flex justify-between py-4 px-4 rounded-lg mt-4 font-black text-white text-lg
                    ${d.laba_setelah_pajak >= 0 ? 'bg-emerald-600 shadow-lg shadow-emerald-100' : 'bg-red-600 shadow-lg shadow-red-100'}">
                    <span>${d.laba_setelah_pajak >= 0 ? 'SISA HASIL USAHA (SHU)' : 'RUGI BERSIH'}</span>
                    <span class="font-mono">${App.formatRupiah(Math.abs(d.laba_setelah_pajak))}</span>
                </div>
            </div>
        </div>`;
        App.initDatepicker('#lr-dari', { defaultDate: dariUI });
        App.initDatepicker('#lr-sampai', { defaultDate: sampaiUI });
    },

    export(type) {
        if (!this.data) return;
        const d = this.data;
        
        // Build row data with metadata for grouping
        const rows = [];
        
        // PENDAPATAN
        rows.push({
            keterangan: 'PENDAPATAN',
            nominal: '',
            keterangan_isGroup: true,
            keterangan_isTotal: false,
            nominal_isGroup: true,
            nominal_isTotal: false
        });
        d.pendapatan.forEach(a => rows.push({
            keterangan: `${a.kode} ${a.nama}`,
            nominal: App.formatRupiah(a.saldo),
            keterangan_isGroup: false,
            keterangan_isTotal: false,
            nominal_isGroup: false,
            nominal_isTotal: false
        }));
        rows.push({
            keterangan: 'Total Pendapatan',
            nominal: App.formatRupiah(d.total_pendapatan),
            keterangan_isGroup: true,
            keterangan_isTotal: true,
            nominal_isGroup: true,
            nominal_isTotal: true
        });
        
        // BEBAN OPERASIONAL
        rows.push({
            keterangan: 'BEBAN OPERASIONAL',
            nominal: '',
            keterangan_isGroup: true,
            keterangan_isTotal: false,
            nominal_isGroup: true,
            nominal_isTotal: false
        });
        d.beban_operasional.forEach(a => rows.push({
            keterangan: `${a.kode} ${a.nama}`,
            nominal: App.formatRupiah(a.saldo),
            keterangan_isGroup: false,
            keterangan_isTotal: false,
            nominal_isGroup: false,
            nominal_isTotal: false
        }));
        rows.push({
            keterangan: 'Total Beban Operasional',
            nominal: App.formatRupiah(d.total_beban_operasional),
            keterangan_isGroup: true,
            keterangan_isTotal: false,
            nominal_isGroup: true,
            nominal_isTotal: false
        });
        
        // LABA KOTOR
        rows.push({
            keterangan: 'LABA KOTOR',
            nominal: App.formatRupiah(d.laba_kotor),
            keterangan_isGroup: true,
            keterangan_isTotal: true,
            nominal_isGroup: true,
            nominal_isTotal: true
        });
        
        // PAJAK
        if (d.beban_pajak && d.beban_pajak.length > 0) {
            rows.push({
                keterangan: 'PAJAK',
                nominal: '',
                keterangan_isGroup: true,
                keterangan_isTotal: false,
                nominal_isGroup: true,
                nominal_isTotal: false
            });
            d.beban_pajak.forEach(a => rows.push({
                keterangan: `${a.kode} ${a.nama}`,
                nominal: App.formatRupiah(a.saldo),
                keterangan_isGroup: false,
                keterangan_isTotal: false,
                nominal_isGroup: false,
                nominal_isTotal: false
            }));
            rows.push({
                keterangan: 'Total Pajak',
                nominal: App.formatRupiah(d.total_beban_pajak),
                keterangan_isGroup: true,
                keterangan_isTotal: false,
                nominal_isGroup: true,
                nominal_isTotal: false
            });
        }
        
        // LABA SETELAH PAJAK
        const finalLabel = d.laba_setelah_pajak >= 0 ? 'SISA HASIL USAHA (SHU)' : 'RUGI BERSIH';
        rows.push({
            keterangan: finalLabel,
            nominal: App.formatRupiah(Math.abs(d.laba_setelah_pajak)),
            keterangan_isGroup: true,
            keterangan_isTotal: true,
            nominal_isGroup: true,
            nominal_isTotal: true
        });
        
        const cols = [
            { title: 'Keterangan', key: 'keterangan' },
            { title: 'Jumlah', key: 'nominal', align: 'right' }
        ];

        App.export(type, `Laporan Laba Rugi ${App.formatDate(d.periode.dari)} s/d ${App.formatDate(d.periode.sampai)}`, cols, rows, { filename: 'laporan_laba_rugi' });
    },

    async importForm() {
        const { value: formValues } = await Swal.fire({
            title: 'Import Saldo Awal (CSV)',
            html: `
                <div class="text-left space-y-4">
                    <p class="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100 leading-relaxed">
                        <i class="ri-information-line text-blue-500 mr-1"></i>
                        Pastikan file CSV memiliki kolom: <b>No, Keterangan, Saldo</b>.<br>
                        Jika ada, kolom <b>Kelompok</b> juga akan dipakai untuk mengisi master akun kolom <b>kelompok</b>.<br>
                        Sistem hanya akan menghapus dan memperbarui akun yang sesuai dengan jenis laporan pilihan Anda.
                    </p>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Tipe Impor *</label>
                        <select id="import-tipe-laporan" class="w-full text-sm border border-gray-300 rounded-xl px-4 py-2.5">
                            <option value="neraca">Neraca (Akun 1xx, 2xx, 3xx - Aset, Kewajiban, Modal)</option>
                            <option value="labarugi" selected>Laba Rugi (Akun 4xx, 5xx - Pendapatan, Beban)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">Tanggal Saldo Awal</label>
                        <input type="date" id="import-tgl" class="w-full text-sm border border-gray-300 rounded-xl px-4 py-2.5" value="${new Date().getFullYear()}-01-01">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-600 mb-1">File CSV</label>
                        <input type="file" id="csv-file" class="w-full text-sm border border-gray-300 rounded-xl px-4 py-2.5" accept=".csv">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Lanjut ke Pratinjau',
            confirmButtonColor: '#4f46e5',
            preConfirm: () => {
                const fileInput = document.getElementById('csv-file');
                const tglInput = document.getElementById('import-tgl');
                const tipeInput = document.getElementById('import-tipe-laporan');
                if (!fileInput.files.length) {
                    Swal.showValidationMessage('Pilih file CSV terlebih dahulu');
                    return false;
                }
                if (!tglInput.value) {
                    Swal.showValidationMessage('Tentukan tanggal saldo awal');
                    return false;
                }
                return {
                    file: fileInput.files[0],
                    tgl: tglInput.value,
                    tipe: tipeInput.value
                };
            }
        });

        if (formValues) {
            this.showPreview(formValues.file, formValues.tgl, formValues.tipe);
        }
    },

    showPreview(file, tgl, tipeLaporan) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line !== '');
            if (lines.length < 2) {
                Swal.fire('Error', 'File CSV kosong atau tidak memiliki data', 'error');
                return;
            }

            // Detect delimiter
            const firstLine = lines[0];
            let delimiter = ',';
            if (firstLine.includes(';') && !firstLine.includes(',')) {
                delimiter = ';';
            }

            // Split headers
            const headers = this.parseCSVLine(firstLine, delimiter);
            let noIdx = -1;
            let ketIdx = -1;
            let saldoIdx = -1;

            headers.forEach((header, idx) => {
                const hClean = header.toLowerCase().trim();
                if (hClean === 'no' || hClean === 'kode' || hClean === 'nomor' || hClean === 'no_akun') {
                    noIdx = idx;
                } else if (hClean === 'keterangan' || hClean === 'nama' || hClean === 'nama_akun') {
                    ketIdx = idx;
                } else if (hClean === 'saldo' || hClean === 'nominal' || hClean === 'saldo_awal') {
                    saldoIdx = idx;
                }
            });

            if (noIdx === -1) noIdx = 0;
            if (ketIdx === -1) ketIdx = 1;
            if (saldoIdx === -1) saldoIdx = 2;

            const previewData = [];
            let totalDebit = 0;
            let totalKredit = 0;

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i];
                const cols = this.parseCSVLine(line, delimiter);
                if (cols.length <= Math.max(noIdx, ketIdx, saldoIdx)) continue;

                const no = cols[noIdx].trim();
                const keterangan = cols[ketIdx].trim();
                const saldoStr = cols[saldoIdx].trim();

                if (no === '' || no.toLowerCase() === 'no' || no.toLowerCase() === 'kode') continue;

                // Parse Saldo
                let cleanSaldo = saldoStr.replace(/[^\d,\.-]/g, '');
                if (cleanSaldo.includes(',') && cleanSaldo.includes('.')) {
                    if (cleanSaldo.lastIndexOf(',') > cleanSaldo.lastIndexOf('.')) {
                        cleanSaldo = cleanSaldo.replace(/\./g, '').replace(/,/g, '.');
                    } else {
                        cleanSaldo = cleanSaldo.replace(/,/g, '');
                    }
                } else if (cleanSaldo.includes(',')) {
                    const parts = cleanSaldo.split(',');
                    if (parts.length === 2 && parts[1].length === 2) {
                        cleanSaldo = cleanSaldo.replace(/,/g, '.');
                    } else {
                        cleanSaldo = cleanSaldo.replace(/,/g, '');
                    }
                }
                const saldo = parseFloat(cleanSaldo) || 0;

                // Account type rule
                const num = parseInt(no);
                let tipe = 'Lainnya';
                let normal = 'D';

                if (num >= 100 && num <= 199) {
                    tipe = 'Aset';
                    normal = 'D';
                } else if (num >= 200 && num <= 299) {
                    tipe = 'Kewajiban';
                    normal = 'K';
                } else if (num >= 300 && num <= 399) {
                    tipe = 'Modal';
                    normal = 'K';
                } else if (num >= 400 && num <= 499) {
                    tipe = 'Pendapatan';
                    normal = 'K';
                } else if (num >= 500 && num <= 599) {
                    tipe = 'Beban';
                    normal = 'D';
                } else {
                    const firstChar = no.charAt(0);
                    if (firstChar === '1') {
                        tipe = 'Aset';
                        normal = 'D';
                    } else if (firstChar === '2') {
                        tipe = 'Kewajiban';
                        normal = 'K';
                    } else if (firstChar === '3') {
                        tipe = 'Modal';
                        normal = 'K';
                    } else if (firstChar === '4') {
                        tipe = 'Pendapatan';
                        normal = 'K';
                    } else if (firstChar === '5') {
                        tipe = 'Beban';
                        normal = 'D';
                    }
                }

                // Mismatch Validations
                if (tipeLaporan === 'neraca' && !['Aset', 'Kewajiban', 'Modal'].includes(tipe)) {
                    Swal.fire('Gagal', `Akun "${no} - ${keterangan}" (${tipe}) bukan merupakan tipe akun Neraca (Aset, Kewajiban, Modal).`, 'error');
                    return;
                }
                if (tipeLaporan === 'labarugi' && !['Pendapatan', 'Beban'].includes(tipe)) {
                    Swal.fire('Gagal', `Akun "${no} - ${keterangan}" (${tipe}) bukan merupakan tipe akun Laba Rugi (Pendapatan, Beban).`, 'error');
                    return;
                }

                let debit = 0;
                let kredit = 0;
                if (normal === 'D') {
                    if (saldo >= 0) debit = saldo;
                    else kredit = Math.abs(saldo);
                } else {
                    if (saldo >= 0) kredit = saldo;
                    else debit = Math.abs(saldo);
                }

                totalDebit += debit;
                totalKredit += kredit;

                previewData.push({ no, keterangan, tipe, normal, debit, kredit });
            }

            const diff = totalDebit - totalKredit;
            const isBalanced = Math.abs(diff) <= 0.01;

            let diffRowHtml = '';
            if (!isBalanced) {
                const balDebit = diff > 0 ? 0 : Math.abs(diff);
                const balKredit = diff > 0 ? diff : 0;
                diffRowHtml = `
                    <tr class="bg-amber-50 font-semibold text-amber-700">
                        <td class="px-3 py-2 text-center font-mono">3999</td>
                        <td class="px-3 py-2 text-left">Selisih Saldo Awal (Penyeimbang Otomatis)</td>
                        <td class="px-3 py-2 text-center">Modal</td>
                        <td class="px-3 py-2 text-right font-mono text-gray-700">${App.formatRupiah(balDebit)}</td>
                        <td class="px-3 py-2 text-right font-mono text-gray-700">${App.formatRupiah(balKredit)}</td>
                    </tr>
                `;
            }

            // Show preview modal
            const { isConfirmed } = await Swal.fire({
                title: 'Pratinjau Saldo Awal (' + (tipeLaporan === 'neraca' ? 'Neraca' : 'Laba Rugi') + ')',
                width: '800px',
                html: `
                    <div class="text-left space-y-4">
                        <div class="flex justify-between items-center text-xs bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div><b>Tanggal Transaksi:</b> ${App.formatDate(tgl)}</div>
                            <div><b>Total Akun:</b> ${previewData.length} baris</div>
                        </div>
                        <div class="max-h-60 overflow-y-auto border border-gray-200 rounded-xl">
                            <table class="w-full text-xs">
                                <thead class="bg-gray-100 sticky top-0">
                                    <tr>
                                        <th class="px-3 py-2.5 text-center font-bold text-gray-600">No Akun</th>
                                        <th class="px-3 py-2.5 text-left font-bold text-gray-600">Nama Akun</th>
                                        <th class="px-3 py-2.5 text-center font-bold text-gray-600">Tipe</th>
                                        <th class="px-3 py-2.5 text-right font-bold text-gray-600">Debit</th>
                                        <th class="px-3 py-2.5 text-right font-bold text-gray-600">Kredit</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100">
                                    ${previewData.map(d => `
                                        <tr>
                                            <td class="px-3 py-2 text-center font-mono font-medium">${d.no}</td>
                                            <td class="px-3 py-2 text-left">${d.keterangan}</td>
                                            <td class="px-3 py-2 text-center">${d.tipe}</td>
                                            <td class="px-3 py-2 text-right font-mono text-gray-700">${App.formatRupiah(d.debit)}</td>
                                            <td class="px-3 py-2 text-right font-mono text-gray-700">${App.formatRupiah(d.kredit)}</td>
                                        </tr>
                                    `).join('')}
                                    ${diffRowHtml}
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 text-xs font-semibold p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div class="flex justify-between">
                                <span>Total Debit:</span>
                                <span class="font-mono text-gray-900">${App.formatRupiah(totalDebit + (!isBalanced && diff < 0 ? Math.abs(diff) : 0))}</span>
                            </div>
                            <div class="flex justify-between">
                                <span>Total Kredit:</span>
                                <span class="font-mono text-gray-900">${App.formatRupiah(totalKredit + (!isBalanced && diff > 0 ? diff : 0))}</span>
                            </div>
                        </div>

                        ${isBalanced ? `
                            <div class="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 flex items-center gap-2 font-bold">
                                <i class="ri-checkbox-circle-fill text-sm"></i>
                                Saldo Seimbang (Balanced)
                            </div>
                        ` : `
                            <div class="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg p-2.5 flex items-center gap-2 font-bold">
                                <i class="ri-error-warning-fill text-sm"></i>
                                Saldo tidak seimbang! Selisih: ${App.formatRupiah(Math.abs(diff))}. Sistem akan menyeimbangkan otomatis menggunakan akun Selisih Saldo Awal (3999).
                            </div>
                        `}
                    </div>
                `,
                showCancelButton: true,
                confirmButtonText: 'Konfirmasi & Simpan',
                cancelButtonText: 'Batal',
                confirmButtonColor: '#10b981',
                cancelButtonColor: '#ef4444'
            });

            if (isConfirmed) {
                this.handleImport(file, tgl, tipeLaporan);
            }
        };
        reader.readAsText(file);
    },

    parseCSVLine(line, delimiter) {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
                result.push(current.replace(/^"|"$/g, ''));
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current.replace(/^"|"$/g, ''));
        return result;
    },

    async handleImport(file, tgl, tipeLaporan) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('tgl_transaksi', tgl);
        formData.append('tipe_laporan', tipeLaporan);

        Swal.fire({
            title: 'Memproses Import...',
            text: 'Harap tunggu sebentar...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const res = await fetch(`${App.API_BASE}/keuangan/import-saldo-awal`, {
                method: 'POST',
                body: formData,
                headers: { 'X-CSRF-Token': App.csrfToken }
            }).then(r => r.json());

            if (res?.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Import Berhasil!',
                    text: res.message,
                    confirmButtonColor: '#4f46e5'
                });
                this.load();
            } else {
                Swal.fire('Gagal', res?.message || 'Terjadi kesalahan saat mengimpor', 'error');
            }
        } catch (e) {
            console.error('Import Error:', e);
            Swal.fire('Error', 'Gagal menghubungi server', 'error');
        }
    }
};

window.LabaRugiPage = LabaRugiPage;
export default LabaRugiPage;
