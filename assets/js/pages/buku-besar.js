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
        const dariUI = dariEl ? dariEl.value : App.monthAgoDMY();
        const sampaiUI = sampaiEl ? sampaiEl.value : App.todayDMY();
        this.dari = App.dateToISO(dariUI);
        this.sampai = App.dateToISO(sampaiUI);

        const res = await App.api(`keuangan/buku-besar?dari=${this.dari}&sampai=${this.sampai}`);
        if (!res?.success) return;

        this.data = res.data;

        this.container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col gap-4 mb-6">
                <!-- Baris 1: Filter Preset Waktu Cepat & Pengatur Kerapatan -->
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-gray-100">
                    ${App.renderDateChips({ fromId: 'bb-dari', toId: 'bb-sampai', callback: 'BukuBesarPage.load()' })}
                    <div class="flex items-center gap-2">
                        ${App.renderDensityToggle()}
                        <div class="flex gap-1 shrink-0">
                            <button onclick="BukuBesarPage.export('pdf')" class="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Export PDF">
                                <i class="ri-file-pdf-line text-lg"></i>
                            </button>
                            <button onclick="BukuBesarPage.export('csv')" class="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Export CSV">
                                <i class="ri-file-excel-line text-lg"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Baris 2: Input Rentang Tanggal & Filter Akun -->
                <div class="flex flex-col sm:flex-row gap-3 flex-1 w-full items-center">
                    <input type="text" id="bb-dari" class="border border-gray-200 rounded-xl px-4 py-2 text-sm" placeholder="Dari" value="${dariUI}">
                    <input type="text" id="bb-sampai" class="border border-gray-200 rounded-xl px-4 py-2 text-sm" placeholder="Sampai" value="${sampaiUI}">
                    <button onclick="BukuBesarPage.load()" class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition-colors shrink-0">
                        <i class="ri-search-line mr-1"></i> Filter
                    </button>
                    <div class="w-full sm:w-80 md:w-96">
                        <select id="bb-filter-akun" data-icon="ri-book-2-line" data-search-placeholder="Cari kode atau nama akun..." class="searchable-select w-full" onchange="BukuBesarPage.filterAkun(this.value)">
                            <option value="">Semua Akun Buku Besar</option>
                            ${this.data.map(a => `<option value="${a.id}">${a.kode} - ${a.nama} (${a.tipe})</option>`).join('')}
                        </select>
                    </div>
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
                    <tbody id="bb-tbody">
                        ${this.data.map(a => `<tr class="border-t border-gray-50 hover:bg-primary-50/30 cursor-pointer transition-colors bb-row" data-akun-id="${a.id}" onclick="BukuBesarPage.detail(${a.id})">
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

        App.initDatepicker('#bb-dari', { defaultDate: dariUI });
        App.initDatepicker('#bb-sampai', { defaultDate: sampaiUI });

        const totalDebit = this.data.reduce((s, a) => s + parseFloat(a.total_debit || 0), 0);
        const totalKredit = this.data.reduce((s, a) => s + parseFloat(a.total_kredit || 0), 0);
        const totalSaldo = this.data.reduce((s, a) => s + parseFloat(a.saldo || 0), 0);
        App.attachStickySummary({
            table: '.data-table',
            title: 'Buku Besar Akun',
            items: [
                { label: 'Total Debit', value: App.formatRupiah(totalDebit), color: 'emerald' },
                { label: 'Total Kredit', value: App.formatRupiah(totalKredit), color: 'rose' },
                { label: 'Total Saldo', value: App.formatRupiah(totalSaldo), color: 'primary' }
            ]
        });
    },

    filterAkun(akunId) {
        const rows = document.querySelectorAll('#bb-tbody .bb-row');
        if (!akunId) {
            rows.forEach(r => r.classList.remove('hidden'));
            return;
        }
        rows.forEach(r => {
            const id = r.getAttribute('data-akun-id');
            r.classList.toggle('hidden', id !== String(akunId));
        });
    },

    async detail(akunId, nama) {
        App.openModalLoading('Memuat Rincian Buku Besar...', 'max-w-5xl');

        try {
            const res = await App.api(`keuangan/buku-besar/${akunId}?dari=${this.dari}&sampai=${this.sampai}`);
            if (!res?.success) {
                App.closeModal();
                App.toast('Gagal memuat rincian buku besar', 'error');
                return;
            }

            this._currentDetailData = res.data;

            const modalHtml = `
                <div class="p-6 sm:p-8">
                    <div class="pb-5 border-b border-gray-100 flex justify-between items-center mb-6">
                        <div>
                            <h3 class="text-xl font-bold text-gray-800">${res.data.akun.kode} - ${res.data.akun.nama}</h3>
                            <p class="text-xs text-gray-500">Rincian transaksi periode ${App.formatDate(this.dari)} - ${App.formatDate(this.sampai)}</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="BukuBesarPage.exportDetailPDF()" class="p-2 text-red-600 hover:bg-gray-100 rounded-xl transition-colors" title="Export PDF"><i class="ri-file-pdf-line text-xl"></i></button>
                            <button type="button" onclick="App.closeModal()" class="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"><i class="ri-close-line text-2xl"></i></button>
                        </div>
                    </div>
                
                <div class="overflow-x-auto max-h-[60vh] overflow-y-auto border border-gray-100 rounded-2xl mb-6">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="px-4 py-3 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Tgl / No Bukti</th>
                                <th class="px-4 py-3 text-left font-bold text-gray-500 uppercase text-[10px] tracking-widest">Keterangan</th>
                                <th class="px-4 py-3 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Debit</th>
                                <th class="px-4 py-3 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Kredit</th>
                                <th class="px-4 py-3 text-right font-bold text-gray-500 uppercase text-[10px] tracking-widest">Saldo</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
                            ${(res.data.details || []).map(d => `
                                <tr class="hover:bg-gray-50/50 transition-colors">
                                    <td class="px-4 py-3">
                                        <div class="text-gray-900 font-medium">${App.formatDate(d.tgl_transaksi)}</div>
                                        <div class="font-mono text-[10px] font-bold text-primary-500 mt-0.5">${d.no_bukti}</div>
                                    </td>
                                    <td class="px-4 py-3 text-gray-600">${d.keterangan || '-'}</td>
                                    <td class="px-4 py-3 text-right font-mono">${d.debit > 0 ? App.formatRupiah(d.debit) : '-'}</td>
                                    <td class="px-4 py-3 text-right font-mono">${d.kredit > 0 ? App.formatRupiah(d.kredit) : '-'}</td>
                                    <td class="px-4 py-3 text-right font-mono font-bold text-gray-800">${App.formatRupiah(d.saldo)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="pt-4 border-t border-gray-100 flex justify-between items-center">
                    <div class="text-sm font-medium text-gray-500">Saldo Akhir</div>
                    <div class="text-xl font-bold text-primary-700">${App.formatRupiah(res.data.saldo_akhir)}</div>
                </div>
            </div>`;

        App.openModal(modalHtml, 'max-w-5xl');
        } catch (err) {
            console.error('Error in BukuBesarPage.detail:', err);
            App.closeModal();
            App.toast('Gagal memuat rincian buku besar', 'error');
        }
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

    exportDetailPDF(data = null) {
        data = data || this._currentDetailData;
        if (!data || !data.details) return;
        const cols = [
            { title: 'Tgl / No Bukti', key: 'transaksi' },
            { title: 'Keterangan', key: 'keterangan' },
            { title: 'Debit', key: 'debit', align: 'right' },
            { title: 'Kredit', key: 'kredit', align: 'right' },
            { title: 'Saldo', key: 'saldo', align: 'right' }
        ];
        const rows = data.details.map(d => ({
            transaksi: `${App.formatDate(d.tgl_transaksi)}\n${d.no_bukti}`,
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
