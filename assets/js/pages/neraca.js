// Neraca Page
const NeracaPage = {
    data: null,
    tanggal: '',
    mode: 'sesudah', // 'sebelum' | 'sesudah'

    async render(container) {
        App.setTitle('Laporan Neraca', 'Posisi keuangan koperasi');
        this.container = container;
        this.load();
    },

    async load() {
        const tglEl = document.getElementById('nr-tgl');
        this.tanggal = tglEl ? App.dateToISO(tglEl.value) : App.todayISO();
        const modeEl = document.querySelector('input[name="nr-mode"]:checked');
        if (modeEl) this.mode = modeEl.value;

        const res = await App.api(`keuangan/neraca?tanggal=${this.tanggal}&mode=${this.mode}`);
        if (!res?.success) return;

        this.data = res.data;
        const d = this.data;

        this.container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <div class="flex flex-wrap gap-2 w-full sm:w-auto items-end">
                    <div>
                        <label class="block text-xs font-semibold text-gray-400 mb-1">Tanggal</label>
                        <input type="text" id="nr-tgl" class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Tanggal">
                    </div>
                    <!-- Toggle Mode -->
                    <div class="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                        <label class="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-semibold transition-all
                            ${this.mode === 'sebelum' ? 'bg-white shadow text-amber-700' : 'text-gray-500 hover:text-gray-700'}">
                            <input type="radio" name="nr-mode" value="sebelum" ${this.mode === 'sebelum' ? 'checked' : ''} class="hidden" onchange="NeracaPage.load()">
                            <i class="ri-time-line"></i> Sebelum
                        </label>
                        <label class="flex items-center gap-1.5 px-3 py-2 rounded-lg cursor-pointer text-sm font-semibold transition-all
                            ${this.mode === 'sesudah' ? 'bg-white shadow text-emerald-700' : 'text-gray-500 hover:text-gray-700'}">
                            <input type="radio" name="nr-mode" value="sesudah" ${this.mode === 'sesudah' ? 'checked' : ''} class="hidden" onchange="NeracaPage.load()">
                            <i class="ri-checkbox-circle-line"></i> Sesudah
                        </label>
                    </div>
                    <button onclick="NeracaPage.load()" class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">Tampilkan</button>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="NeracaPage.export('pdf')" class="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Export PDF">
                        <i class="ri-file-pdf-line text-xl"></i>
                    </button>
                    <button onclick="NeracaPage.export('csv')" class="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Export CSV">
                        <i class="ri-file-excel-line text-xl"></i>
                    </button>
                    <button onclick="window.print()" class="p-2.5 text-gray-400 hover:bg-gray-50 rounded-xl transition-colors" title="Cetak">
                        <i class="ri-printer-line text-xl"></i>
                    </button>
                </div>
            </div>

            <div class="text-center mb-10">
                <h2 class="text-2xl font-black text-gray-800 tracking-tight uppercase">NERACA</h2>
                <p class="text-gray-400 font-medium">Per Tanggal ${App.formatDate(this.tanggal)}</p>
                <span class="inline-flex items-center gap-1.5 mt-2 text-xs font-bold px-3 py-1 rounded-full
                    ${d.mode === 'sebelum' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}">
                    <i class="${d.mode === 'sebelum' ? 'ri-time-line' : 'ri-checkbox-circle-line'}"></i>
                    ${d.mode === 'sebelum' ? 'Sebelum Akhir Tahun' : 'Sesudah Akhir Tahun'}
                </span>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div>
                    <h3 class="font-bold text-gray-700 mb-4 pb-2 border-b-2 border-primary-500 flex justify-between">
                        <span>AKTIVA (Aset)</span>
                    </h3>
                    <div class="space-y-1">
                        ${d.aset.map(a => `<div class="flex justify-between py-2 text-sm border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded-lg transition-colors">
                            <div class="flex flex-col">
                                <span class="text-[10px] font-mono text-gray-400 leading-none mb-0.5">${a.kode}</span>
                                <span class="text-gray-700 font-medium">${a.nama}</span>
                            </div>
                            <span class="font-mono font-bold text-gray-900">${App.formatRupiah(a.saldo)}</span>
                        </div>`).join('')}
                    </div>
                    <div class="flex justify-between py-4 mt-4 bg-primary-50/50 px-4 rounded-xl border border-primary-100 font-black text-primary-700">
                        <span>TOTAL AKTIVA</span>
                        <span>${App.formatRupiah(d.total_aset)}</span>
                    </div>
                </div>
                <div>
                    <h3 class="font-bold text-gray-700 mb-4 pb-2 border-b-2 border-primary-500">PASIVA (Kewajiban & Modal)</h3>
                    
                    <div class="mb-6">
                        <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-amber-400"></span> KEWAJIBAN
                        </h4>
                        <div class="space-y-1">
                            ${d.kewajiban.map(a => `<div class="flex justify-between py-2 text-sm border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded-lg transition-colors">
                                <div class="flex flex-col">
                                    <span class="text-[10px] font-mono text-gray-400 leading-none mb-0.5">${a.kode}</span>
                                    <span class="text-gray-700 font-medium">${a.nama}</span>
                                </div>
                                <span class="font-mono font-bold text-gray-900">${App.formatRupiah(a.saldo)}</span>
                            </div>`).join('')}
                        </div>
                    </div>

                    <div class="mb-6">
                        <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full bg-purple-400"></span> MODAL
                        </h4>
                        <div class="space-y-1">
                            ${d.modal.map(a => `<div class="flex justify-between py-2 text-sm border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded-lg transition-colors">
                                <div class="flex flex-col">
                                    <span class="text-[10px] font-mono text-gray-400 leading-none mb-0.5">${a.kode}</span>
                                    <span class="text-gray-700 font-medium">${a.nama}</span>
                                </div>
                                <span class="font-mono font-bold text-gray-900">${App.formatRupiah(a.saldo)}</span>
                            </div>`).join('')}
                            <!-- Laba/Rugi Berjalan -->
                            <div class="flex justify-between py-2 text-sm border-b border-gray-50 hover:bg-gray-50/50 px-2 rounded-lg transition-colors"
                                 title="Periode: ${App.formatDate(d.periode_lr?.dari)} s/d ${App.formatDate(d.periode_lr?.sampai)}">
                                <div class="flex flex-col">
                                    <span class="text-[10px] font-mono text-gray-400 leading-none mb-0.5">LRB</span>
                                    <div class="flex items-center gap-1.5">
                                        <span class="text-gray-700 font-medium">Laba/Rugi Berjalan</span>
                                        <span class="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-semibold">1 Jan – ${App.formatDate(d.tanggal)}</span>
                                    </div>
                                </div>
                                <span class="font-mono font-bold ${(d.laba_rugi_berjalan ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-500'}">
                                    ${App.formatRupiah(d.laba_rugi_berjalan ?? 0)}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-between py-4 mt-4 bg-primary-50/50 px-4 rounded-xl border border-primary-100 font-black text-primary-700">
                        <span>TOTAL PASIVA</span>
                        <span>${App.formatRupiah(d.total_pasiva)}</span>
                    </div>
                </div>
            </div>

            <div class="mt-8 flex justify-center">
                ${Math.abs(d.total_aset - d.total_pasiva) > 0.01 ?
                `<div class="bg-red-50 border border-red-100 text-red-600 rounded-2xl px-8 py-3.5 text-sm font-bold shadow-sm shadow-red-100 flex items-center gap-2 animate-pulse">
                        <i class="ri-error-warning-fill text-lg"></i> Neraca tidak seimbang! Selisih: ${App.formatRupiah(Math.abs(d.total_aset - d.total_pasiva))}
                    </div>` :
                `<div class="bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl px-8 py-3.5 text-sm font-bold shadow-sm shadow-emerald-100 flex items-center gap-2">
                        <i class="ri-checkbox-circle-fill text-lg"></i> Neraca Balance
                    </div>`}
            </div>
        </div>`;
        App.initDatepicker('#nr-tgl', { defaultDate: this.tanggal });
    },

    export(type) {
        if (!this.data) return;
        const d = this.data;
        const rows = [];

        // For PDF table structure
        if (type === 'pdf') {
            // Aktiva
            rows.push([{ content: 'AKTIVA', colSpan: 3, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }]);
            d.aset.forEach(a => rows.push([a.kode, a.nama, App.formatRupiah(a.saldo)]));
            rows.push(['', { content: 'TOTAL AKTIVA', styles: { fontStyle: 'bold' } }, { content: App.formatRupiah(d.total_aset), styles: { fontStyle: 'bold' } }]);

            // Spacer
            rows.push([{ content: '', colSpan: 3, styles: { minCellHeight: 5 } }]);

            // Kewajiban
            rows.push([{ content: 'KEWAJIBAN', colSpan: 3, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }]);
            d.kewajiban.forEach(a => rows.push([a.kode, a.nama, App.formatRupiah(a.saldo)]));

            // Modal
            rows.push([{ content: 'MODAL', colSpan: 3, styles: { fillColor: [241, 245, 249], fontStyle: 'bold' } }]);
            d.modal.forEach(a => rows.push([a.kode, a.nama, App.formatRupiah(a.saldo)]));

            // Laba/Rugi Berjalan (dalam bagian modal)
            const lrb = d.laba_rugi_berjalan ?? 0;
            const lrbLabel = `Laba/Rugi Berjalan (1 Jan – ${App.formatDate(d.tanggal)})`;
            rows.push([
                { content: 'LRB', styles: { fontStyle: 'bold', textColor: lrb >= 0 ? [5, 150, 105] : [220, 38, 38] } },
                { content: lrbLabel, styles: { fontStyle: 'bold', textColor: lrb >= 0 ? [5, 150, 105] : [220, 38, 38] } },
                { content: App.formatRupiah(lrb), styles: { fontStyle: 'bold', textColor: lrb >= 0 ? [5, 150, 105] : [220, 38, 38], halign: 'right' } }
            ]);

            rows.push(['', { content: 'TOTAL PASIVA', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
                { content: App.formatRupiah(d.total_pasiva), styles: { fontStyle: 'bold', fillColor: [241, 245, 249], halign: 'right' } }]);
        } else {
            // For CSV/Other flat structure
            rows.push({ kode: 'AKTIVA', nama: '', saldo: '' });
            d.aset.forEach(a => rows.push({ kode: a.kode, nama: a.nama, saldo: App.formatRupiah(a.saldo) }));
            rows.push({ kode: 'TOTAL AKTIVA', nama: '', saldo: App.formatRupiah(d.total_aset) });
            rows.push({ kode: '', nama: '', saldo: '' });
            rows.push({ kode: 'KEWAJIBAN', nama: '', saldo: '' });
            d.kewajiban.forEach(a => rows.push({ kode: a.kode, nama: a.nama, saldo: App.formatRupiah(a.saldo) }));
            rows.push({ kode: 'MODAL', nama: '', saldo: '' });
            d.modal.forEach(a => rows.push({ kode: a.kode, nama: a.nama, saldo: App.formatRupiah(a.saldo) }));
            const lrb = d.laba_rugi_berjalan ?? 0;
            rows.push({ kode: 'LRB', nama: `Laba/Rugi Berjalan (1 Jan – ${App.formatDate(d.tanggal)})`, saldo: App.formatRupiah(lrb) });
            rows.push({ kode: 'TOTAL PASIVA', nama: '', saldo: App.formatRupiah(d.total_pasiva) });
        }

        const cols = [
            { title: 'Kode', key: 'kode' },
            { title: 'Nama Akun', key: 'nama' },
            { title: 'Saldo', key: 'saldo', align: 'right' }
        ];

        App.export(type, `Laporan Neraca per ${App.formatDate(this.tanggal)}`, cols, rows, { filename: 'laporan_neraca' });
    }
};

window.NeracaPage = NeracaPage;
export default NeracaPage;
