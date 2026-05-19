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
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div class="flex flex-wrap gap-2 w-full sm:w-auto items-end">
                    <div>
                        <label class="block text-xs font-semibold text-gray-400 mb-1">Dari</label>
                        <input type="text" id="lr-dari" class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Dari">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-400 mb-1">Sampai</label>
                        <input type="text" id="lr-sampai" class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Sampai">
                    </div>
                    <!-- Toggle Mode -->
                    <div class="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                        <label class="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-semibold transition-all
                            ${this.mode === 'sebelum' ? 'bg-white shadow text-amber-700' : 'text-gray-500 hover:text-gray-700'}">
                            <input type="radio" name="lr-mode" value="sebelum" ${this.mode === 'sebelum' ? 'checked' : ''} class="hidden" onchange="LabaRugiPage.load()">
                            <i class="ri-time-line"></i> Sebelum
                        </label>
                        <label class="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-semibold transition-all
                            ${this.mode === 'sesudah' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}">
                            <input type="radio" name="lr-mode" value="sesudah" ${this.mode === 'sesudah' ? 'checked' : ''} class="hidden" onchange="LabaRugiPage.load()">
                            <i class="ri-checkbox-circle-line"></i> Sesudah
                        </label>
                    </div>
                    <button onclick="LabaRugiPage.load()" class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">Tampilkan</button>
                </div>
                <div class="flex items-center gap-2">
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

            <div class="text-center mb-10">
                <h2 class="text-2xl font-black text-gray-800 tracking-tight uppercase">LAPORAN LABA RUGI</h2>
                <p class="text-gray-400 font-medium">${App.formatDate(d.periode.dari)} s/d ${App.formatDate(d.periode.sampai)}</p>
                <span class="inline-flex items-center gap-1.5 mt-2 text-xs font-bold px-3 py-1 rounded-full
                    ${d.mode === 'sebelum' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}">
                    <i class="${d.mode === 'sebelum' ? 'ri-time-line' : 'ri-checkbox-circle-line'}"></i>
                    ${d.mode === 'sebelum' ? 'Sebelum Akhir Tahun' : 'Sesudah Akhir Tahun'}
                </span>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <!-- Column PENDAPATAN -->
                <div>
                    <h3 class="font-bold text-gray-700 mb-4 pb-2 border-b-2 border-primary-500 flex justify-between uppercase tracking-wider text-sm">
                        <span>PENDAPATAN</span>
                        <i class="ri-funds-box-line text-primary-500"></i>
                    </h3>
                    <div class="space-y-1">
                        ${d.pendapatan.map(a => `<div class="flex justify-between py-2 text-sm border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded-lg transition-colors">
                            <div class="flex flex-col">
                                <span class="text-[10px] font-mono text-gray-400 leading-none mb-0.5">${a.kode}</span>
                                <span class="text-gray-700 font-medium">${a.nama}</span>
                            </div>
                            <span class="font-mono font-bold text-emerald-600">${App.formatRupiah(a.saldo)}</span>
                        </div>`).join('')}
                    </div>
                </div>

                <!-- Column BEBAN -->
                <div>
                    <h3 class="font-bold text-gray-700 mb-4 pb-2 border-b-2 border-primary-500 flex justify-between uppercase tracking-wider text-sm">
                        <span>BEBAN OPERASIONAL</span>
                        <i class="ri-send-plane-2-line text-primary-500"></i>
                    </h3>
                    <div class="space-y-1">
                        ${d.beban.map(a => `<div class="flex justify-between py-2 text-sm border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded-lg transition-colors">
                            <div class="flex flex-col">
                                <span class="text-[10px] font-mono text-gray-400 leading-none mb-0.5">${a.kode}</span>
                                <span class="text-gray-700 font-medium">${a.nama}</span>
                            </div>
                            <span class="font-mono font-bold text-red-500">${App.formatRupiah(a.saldo)}</span>
                        </div>`).join('')}
                    </div>
                </div>
            </div>

            <!-- Totals Row (Aligned Sebaris) -->
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-8">
                <div class="flex justify-between py-5 bg-emerald-600 px-6 rounded-2xl shadow-lg shadow-emerald-100 text-white font-black">
                    <span class="uppercase tracking-widest text-xs opacity-80">Total Pendapatan</span>
                    <span class="text-lg font-mono">${App.formatRupiah(d.total_pendapatan)}</span>
                </div>
                <div class="flex justify-between py-5 bg-red-600 px-6 rounded-2xl shadow-lg shadow-red-100 text-white font-black">
                    <span class="uppercase tracking-widest text-xs opacity-80">Total Beban</span>
                    <span class="text-lg font-mono">${App.formatRupiah(d.total_beban)}</span>
                </div>
            </div>

            <div class="mt-8 flex justify-center">
                <div class="w-full max-w-lg flex justify-between py-6 px-10 bg-gray-900 rounded-[2.5rem] text-white shadow-2xl shadow-gray-200 border-4 border-white relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-4 opacity-10">
                        <i class="ri-funds-line text-8xl"></i>
                    </div>
                    <div class="flex flex-col relative z-10">
                        <span class="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">${d.laba_rugi >= 0 ? 'Surplus Hasil Usaha' : 'Defisit Hasil Usaha'}</span>
                        <span class="text-2xl font-black">${d.laba_rugi >= 0 ? 'SHU (LABA)' : 'RUGI BERSIH'}</span>
                    </div>
                    <div class="text-3xl font-black self-center relative z-10 ${d.laba_rugi >= 0 ? 'text-emerald-400' : 'text-red-400'}">
                        ${App.formatRupiah(Math.abs(d.laba_rugi))}
                    </div>
                </div>
            </div>
        </div>`;
        App.initDatepicker('#lr-dari', { defaultDate: dariUI });
        App.initDatepicker('#lr-sampai', { defaultDate: sampaiUI });
    },

    export(type) {
        if (!this.data) return;
        const d = this.data;
        const rows = [];

        if (type === 'pdf') {
            // Pendapatan
            rows.push([{ content: 'PENDAPATAN', colSpan: 3, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }]);
            d.pendapatan.forEach(a => rows.push([a.kode, a.nama, App.formatRupiah(a.saldo)]));
            rows.push(['', { content: 'TOTAL PENDAPATAN', styles: { fontStyle: 'bold' } }, { content: App.formatRupiah(d.total_pendapatan), styles: { fontStyle: 'bold' } }]);

            rows.push([{ content: '', colSpan: 3, styles: { minCellHeight: 5 } }]);

            // Beban
            rows.push([{ content: 'BEBAN', colSpan: 3, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }]);
            d.beban.forEach(a => rows.push([a.kode, a.nama, App.formatRupiah(a.saldo)]));
            rows.push(['', { content: 'TOTAL BEBAN', styles: { fontStyle: 'bold' } }, { content: App.formatRupiah(d.total_beban), styles: { fontStyle: 'bold' } }]);

            rows.push([{ content: '', colSpan: 3, styles: { minCellHeight: 8 } }]);

            const label = d.laba_rugi >= 0 ? 'SISA HASIL USAHA (SHU)' : 'RUGI BERSIH';
            rows.push([
                { content: label, colSpan: 2, styles: { fontStyle: 'bold', fontSize: 11, fillColor: [15, 23, 42], textColor: [255, 255, 255] } },
                { content: App.formatRupiah(Math.abs(d.laba_rugi)), styles: { fontStyle: 'bold', fontSize: 11, fillColor: [15, 23, 42], textColor: [255, 255, 255], halign: 'right' } }
            ]);
        } else {
            rows.push({ kode: 'PENDAPATAN', nama: '', saldo: '' });
            d.pendapatan.forEach(a => rows.push({ kode: a.kode, nama: a.nama, saldo: App.formatRupiah(a.saldo) }));
            rows.push({ kode: 'TOTAL PENDAPATAN', nama: '', saldo: App.formatRupiah(d.total_pendapatan) });
            rows.push({ kode: '', nama: '', saldo: '' });
            rows.push({ kode: 'BEBAN', nama: '', saldo: '' });
            d.beban.forEach(a => rows.push({ kode: a.kode, nama: a.nama, saldo: App.formatRupiah(a.saldo) }));
            rows.push({ kode: 'TOTAL BEBAN', nama: '', saldo: App.formatRupiah(d.total_beban) });
            rows.push({ kode: '', nama: '', saldo: '' });
            rows.push({ kode: d.laba_rugi >= 0 ? 'SHU (LABA)' : 'RUGI', nama: '', saldo: App.formatRupiah(Math.abs(d.laba_rugi)) });
        }

        const cols = [
            { title: 'Kode', key: 'kode' },
            { title: 'Keterangan', key: 'nama' },
            { title: 'Jumlah', key: 'saldo', align: 'right' }
        ];

        App.export(type, `Laporan Laba Rugi`, cols, rows, { filename: 'laporan_laba_rugi' });
    }
};

window.LabaRugiPage = LabaRugiPage;
export default LabaRugiPage;
