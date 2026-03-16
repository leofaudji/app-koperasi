// Buku Besar Page
const BukuBesarPage = {
    data: [],
    dari: '',
    sampai: '',

    async render(container) {
        App.setTitle('Buku Besar', 'Ringkasan saldo per akun');
        this.container = container;
        this.load();
    },

    async load(page = 1) {
        const dariEl = document.getElementById('bb-dari');
        const sampaiEl = document.getElementById('bb-sampai');
        this.dari = dariEl ? App.dateToISO(dariEl.value) : App.monthAgoISO();
        this.sampai = sampaiEl ? App.dateToISO(sampaiEl.value) : App.todayISO();

        const res = await App.api(`keuangan/buku-besar?dari=${this.dari}&sampai=${this.sampai}`);
        if (!res?.success) return;

        this.data = res.data;

        this.container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div class="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
                    <input type="text" id="bb-dari" class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Dari">
                    <input type="text" id="bb-sampai" class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Sampai">
                    <button onclick="BukuBesarPage.load()" class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
                        <i class="ri-search-line mr-1"></i> Filter
                    </button>
                </div>
                <div class="flex gap-1">
                    <button onclick="BukuBesarPage.export('pdf')" class="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Export PDF">
                        <i class="ri-file-pdf-line text-xl"></i>
                    </button>
                    <button onclick="BukuBesarPage.export('csv')" class="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Export CSV">
                        <i class="ri-file-excel-line text-xl"></i>
                    </button>
                </div>
            </div>

            <div class="table-wrapper">
                <table class="data-table w-full text-sm">
                    <thead>
                        <tr class="bg-gray-50">
                            <th class="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-widest text-[10px]">Kode</th>
                            <th class="px-4 py-3 text-left font-bold text-gray-500 uppercase tracking-widest text-[10px]">Nama Akun</th>
                            <th class="px-4 py-3 text-center font-bold text-gray-500 uppercase tracking-widest text-[10px]">Tipe</th>
                            <th class="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-widest text-[10px]">Debit</th>
                            <th class="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-widest text-[10px]">Kredit</th>
                            <th class="px-4 py-3 text-right font-bold text-gray-500 uppercase tracking-widest text-[10px]">Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.data.map(a => `<tr class="border-t border-gray-50 hover:bg-primary-50/30 cursor-pointer transition-colors" onclick="BukuBesarPage.detail(${a.id},'${a.nama}')">
                            <td class="px-4 py-3 font-mono text-xs font-bold text-primary-600">${a.kode}</td>
                            <td class="px-4 py-3 font-medium text-gray-800">${a.nama}</td>
                            <td class="px-4 py-3 text-center"><span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${App.getAkunBadge(a.tipe)}">${a.tipe}</span></td>
                            <td class="px-4 py-3 text-right font-mono">${App.formatRupiah(a.total_debit)}</td>
                            <td class="px-4 py-3 text-right font-mono">${App.formatRupiah(a.total_kredit)}</td>
                            <td class="px-4 py-3 text-right font-mono font-bold text-primary-700">${App.formatRupiah(a.saldo)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;

        App.initDatepicker('#bb-dari', { defaultDate: this.dari });
        App.initDatepicker('#bb-sampai', { defaultDate: this.sampai });
    },

    async detail(akunId, nama) {
        const res = await App.api(`keuangan/buku-besar/${akunId}?dari=${this.dari}&sampai=${this.sampai}`);
        if (!res?.success) return;

        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn';
        modal.innerHTML = `
            <div class="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col scale-in">
                <div class="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">${res.data.akun.kode} - ${res.data.akun.nama}</h3>
                        <p class="text-xs text-gray-500">Rincian transaksi periode ${App.formatDate(this.dari)} - ${App.formatDate(this.sampai)}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="BukuBesarPage.exportDetailPDF(${JSON.stringify(res.data).replace(/"/g, '&quot;')})" class="p-2 text-red-600 hover:bg-white rounded-xl transition-colors" title="Export PDF"><i class="ri-file-pdf-line text-xl"></i></button>
                        <button onclick="this.closest('.fixed').remove()" class="p-2 hover:bg-white rounded-xl transition-colors ml-2"><i class="ri-close-line text-2xl text-gray-400"></i></button>
                    </div>
                </div>
                
                <div class="flex-1 overflow-auto p-8">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="px-4 py-3 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Tanggal</th>
                                <th class="px-4 py-3 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">No Bukti</th>
                                <th class="px-4 py-3 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Keterangan</th>
                                <th class="px-4 py-3 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Debit</th>
                                <th class="px-4 py-3 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Kredit</th>
                                <th class="px-4 py-3 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Saldo</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
                            ${(res.data.details || []).map(d => `
                                <tr class="hover:bg-gray-50/50 transition-colors">
                                    <td class="px-4 py-3">${App.formatDate(d.tgl_transaksi)}</td>
                                    <td class="px-4 py-3 font-mono text-[11px] font-bold text-primary-600">${d.no_bukti}</td>
                                    <td class="px-4 py-3 text-gray-600">${d.keterangan || '-'}</td>
                                    <td class="px-4 py-3 text-right font-mono">${d.debit > 0 ? App.formatRupiah(d.debit) : '-'}</td>
                                    <td class="px-4 py-3 text-right font-mono">${d.kredit > 0 ? App.formatRupiah(d.kredit) : '-'}</td>
                                    <td class="px-4 py-3 text-right font-mono font-bold text-gray-800">${App.formatRupiah(d.saldo)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="px-8 py-5 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                    <div class="text-sm font-medium text-gray-500">Saldo Akhir</div>
                    <div class="text-xl font-bold text-primary-700">${App.formatRupiah(res.data.saldo_akhir)}</div>
                </div>
            </div>`;
        document.body.appendChild(modal);
    },

    getColumns() {
        return [
            { title: 'Kode', key: 'kode' },
            { title: 'Nama Akun', key: 'nama' },
            { title: 'Tipe', key: 'tipe' },
            { title: 'Debit', key: 'total_debit', align: 'right' },
            { title: 'Kredit', key: 'total_kredit', align: 'right' },
            { title: 'Saldo', key: 'saldo', align: 'right' }
        ];
    },

    export(type) {
        if (!this.data.length) return;
        const formattedData = this.data.map(r => ({
            ...r,
            total_debit: App.formatRupiah(r.total_debit),
            total_kredit: App.formatRupiah(r.total_kredit),
            saldo: App.formatRupiah(r.saldo)
        }));
        App.export(type, `Buku Besar (${App.formatDate(this.dari)} - ${App.formatDate(this.sampai)})`, this.getColumns(), formattedData, {
            filename: 'buku_besar_summary'
        });
    },

    exportDetailPDF(data) {
        const cols = [
            { title: 'Tanggal', key: 'tgl' },
            { title: 'No Bukti', key: 'no_bukti' },
            { title: 'Keterangan', key: 'keterangan' },
            { title: 'Debit', key: 'debit', align: 'right' },
            { title: 'Kredit', key: 'kredit', align: 'right' },
            { title: 'Saldo', key: 'saldo', align: 'right' }
        ];
        const rows = data.details.map(d => ({
            tgl: App.formatDate(d.tgl_transaksi),
            no_bukti: d.no_bukti,
            keterangan: d.keterangan,
            debit: d.debit > 0 ? App.formatRupiah(d.debit) : '-',
            kredit: d.kredit > 0 ? App.formatRupiah(d.kredit) : '-',
            saldo: App.formatRupiah(d.saldo)
        }));
        App.export('pdf', `Rincian Jurnal: ${data.akun.kode} - ${data.akun.nama}`, cols, rows, {
            filename: `buku_besar_${data.akun.kode}`
        });
    }
};

// Helper for badge colors
App.getAkunBadge = function (tipe) {
    const colors = {
        aset: 'bg-blue-50 text-blue-600',
        kewajiban: 'bg-amber-50 text-amber-600',
        modal: 'bg-purple-50 text-purple-600',
        pendapatan: 'bg-emerald-50 text-emerald-600',
        beban: 'bg-rose-50 text-rose-600'
    };
    return colors[tipe] || 'bg-gray-50 text-gray-600';
};

window.BukuBesarPage = BukuBesarPage;
export default BukuBesarPage;
