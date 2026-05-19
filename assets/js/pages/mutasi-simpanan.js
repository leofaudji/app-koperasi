// Mutasi Simpanan Page
const MutasiPage = {
    data: [],
    summary: '',

    async render(container) {
        App.setTitle('Mutasi Simpanan', 'Riwayat transaksi simpanan anggota');
        const urlP = new URLSearchParams(location.hash.split('?')[1] || '');
        const anggotaId = urlP.get('anggota_id') || '';

        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row gap-3 mb-6">
                <div class="flex-1 relative">
                    <input type="text" id="ms-anggota-search" class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" placeholder="Cari anggota..." autocomplete="off">
                    <input type="hidden" id="ms-anggota-id" value="${anggotaId}">
                    <div id="ms-anggota-dd" class="hidden border border-gray-200 rounded-xl mt-1 max-h-40 overflow-auto bg-white shadow-lg absolute z-50 w-full"></div>
                </div>
                <select id="ms-jenis" class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm"><option value="">Semua Jenis</option></select>
                <input type="text" id="ms-dari" class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Dari">
                <input type="text" id="ms-sampai" class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Sampai">
                <button onclick="MutasiPage.load()" class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium"><i class="ri-search-line mr-1"></i> Cari</button>
            </div>
            <div id="ms-saldo-area" class="hidden mb-6">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <div id="ms-saldo" class="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 w-full"></div>
                    <div class="flex items-center gap-2">
                        <button onclick="MutasiPage.export('pdf')" class="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
                            <i class="ri-file-pdf-line mr-1"></i> PDF
                        </button>
                        <button onclick="MutasiPage.export('csv')" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
                            <i class="ri-file-excel-line mr-1"></i> CSV
                        </button>
                    </div>
                </div>
            </div>
            <div id="ms-table"><p class="text-center text-gray-400 py-10">Pilih anggota untuk melihat mutasi</p></div></div>`;

        // Init datepickers
        const dariDefault = App.monthAgoDMY();
        const sampaiDefault = App.todayDMY();
        App.datepicker('#ms-dari', { defaultDate: dariDefault });
        App.datepicker('#ms-sampai', { defaultDate: sampaiDefault });

        // Load jenis simpanan
        const js = await App.api('jenis-simpanan');
        if (js?.data) document.getElementById('ms-jenis').innerHTML += js.data.map(j => `<option value="${j.id}">${j.nama}</option>`).join('');

        // Anggota search
        let deb;
        document.getElementById('ms-anggota-search').addEventListener('input', e => {
            clearTimeout(deb);
            deb = setTimeout(async () => {
                const search = e.target.value;
                if (search.length < 2) { document.getElementById('ms-anggota-dd').classList.add('hidden'); return; }
                const r = await App.api('anggota?search=' + encodeURIComponent(search) + '&per_page=5');
                const dd = document.getElementById('ms-anggota-dd');
                if (r?.data?.length) {
                    dd.innerHTML = r.data.map(a => `<div class="px-4 py-2 hover:bg-primary-50 cursor-pointer text-sm" onclick="MutasiPage.selectAnggota(${a.id},'${a.no_anggota}','${a.nama}')">${a.no_anggota} - ${a.nama}</div>`).join('');
                    dd.classList.remove('hidden');
                }
            }, 300);
        });

        if (anggotaId) { const a = await App.api('anggota/' + anggotaId); if (a?.data) { this.selectAnggota(a.data.id, a.data.no_anggota, a.data.nama); } }
    },

    selectAnggota(id, no, nama) {
        document.getElementById('ms-anggota-id').value = id;
        document.getElementById('ms-anggota-search').value = no + ' - ' + nama;
        this.summary = `${no} - ${nama}`;
        document.getElementById('ms-anggota-dd').classList.add('hidden');
        this.load();
    },

    async load(page = 1) {
        const anggotaId = document.getElementById('ms-anggota-id').value;
        if (!anggotaId) return;
        const dari = App.dateToISO(document.getElementById('ms-dari').value);
        const sampai = App.dateToISO(document.getElementById('ms-sampai').value);
        const params = `jenis_simpanan_id=${document.getElementById('ms-jenis').value}&dari=${dari}&sampai=${sampai}&page=${page}`;
        const res = await App.api(`simpanan/mutasi/${anggotaId}?${params}`);
        if (!res?.success) return;

        this.data = res.data;

        // Saldo cards
        document.getElementById('ms-saldo-area').classList.remove('hidden');
        const saldoDiv = document.getElementById('ms-saldo');
        saldoDiv.innerHTML = (res.saldo || []).map(s => `<div class="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 text-center"><p class="text-xs text-gray-500">${s.nama}</p><p class="text-lg font-bold text-primary-700">${App.formatRupiah(s.saldo)}</p></div>`).join('');

        // Table
        document.getElementById('ms-table').innerHTML = `<div class="table-wrapper"><table class="data-table w-full text-sm">
            <thead><tr class="bg-gray-50"><th class="px-4 py-3 text-left font-medium text-gray-500">Tanggal</th><th class="px-4 py-3 text-left font-medium text-gray-500">No. Transaksi</th><th class="px-4 py-3 text-left font-medium text-gray-500">Jenis</th><th class="px-4 py-3 text-left font-medium text-gray-500">Transaksi</th><th class="px-4 py-3 text-center font-medium text-gray-500">D/K</th><th class="px-4 py-3 text-right font-medium text-gray-500">Jumlah</th><th class="px-4 py-3 text-right font-medium text-gray-500">Saldo</th></tr></thead>
            <tbody>${(res.data || []).map(r => `<tr class="border-t border-gray-50">
                <td class="px-4 py-3 text-gray-500">${App.formatDate(r.tgl_transaksi)}</td>
                <td class="px-4 py-3 font-mono text-xs">${r.no_transaksi}</td>
                <td class="px-4 py-3">${r.jenis_simpanan}</td>
                <td class="px-4 py-3"><span class="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">${r.kode_transaksi}</span> ${r.nama_transaksi}</td>
                <td class="px-4 py-3 text-center">${App.dkBadge(r.dk)}</td>
                <td class="px-4 py-3 text-right font-semibold ${r.dk === 'D' ? 'text-emerald-600' : 'text-red-500'}">${r.dk === 'D' ? '+' : '-'}${App.formatRupiah(r.jumlah)}</td>
                <td class="px-4 py-3 text-right font-semibold">${App.formatRupiah(r.saldo_sesudah)}</td>
            </tr>`).join('')}
            ${res.data.length === 0 ? '<tr><td colspan="7" class="text-center py-8 text-gray-400">Tidak ada mutasi</td></tr>' : ''}</tbody></table></div>
            ${App.renderPagination(res.pagination, 'MutasiPage.load')}`;
    },

    getColumns() {
        return [
            { title: 'Tanggal', key: 'tgl_transaksi' },
            { title: 'No. Transaksi', key: 'no_transaksi' },
            { title: 'Jenis Simpanan', key: 'jenis_simpanan' },
            { title: 'Transaksi', key: 'nama_transaksi' },
            { title: 'D/K', key: 'dk', align: 'center' },
            { title: 'Jumlah', key: 'jumlah', align: 'right' },
            { title: 'Saldo', key: 'saldo_sesudah', align: 'right' }
        ];
    },

    export(type) {
        if (!this.data.length) return;
        const formattedData = this.data.map(r => ({
            ...r,
            tgl_transaksi: App.formatDate(r.tgl_transaksi),
            jumlah: (r.dk === 'D' ? '+' : '-') + App.formatRupiah(r.jumlah),
            saldo_sesudah: App.formatRupiah(r.saldo_sesudah)
        }));
        App.export(type, `Mutasi Simpanan - ${this.summary}`, this.getColumns(), formattedData, {
            filename: 'mutasi_simpanan'
        });
    }
};

window.MutasiPage = MutasiPage;
export default MutasiPage;
