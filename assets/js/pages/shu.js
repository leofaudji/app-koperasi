// SHU Calculation and Processing Page
const SHUPage = {
    results: null,
    params: {
        tahun: new Date().getFullYear(),
        total_profit: 0,
        persen_modal: 40,
        persen_anggota: 40,
        pagu_shu: 0
    },

    async render(container) {
        App.setTitle('Pembagian SHU', 'Kalkulasi dan pembagian Sisa Hasil Usaha tahunan');
        container.innerHTML = `<div class="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fadeIn">
            <!-- Sidebar: Parameters -->
            <div class="lg:col-span-1 space-y-6">
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <h3 class="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="ri-settings-4-line text-primary-500"></i> Parameter SHU
                    </h3>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Tahun Buku</label>
                            <select id="shu-tahun" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-primary-500">
                                ${[...Array(5)].map((_, i) => {
            const y = new Date().getFullYear() - i;
            return `<option value="${y}">${y}</option>`;
        }).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Total Laba (SHU Sebelum Pajak)</label>
                            <input type="number" id="shu-profit" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Contoh: 50000000">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Pagu SHU yang Dibagikan</label>
                            <input type="number" id="shu-pagu" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm" placeholder="Contoh: 40000000">
                        </div>
                        <div class="pt-2 border-t border-gray-50">
                            <label class="block text-xs text-gray-400 mb-1">Persentase Jasa Modal (%)</label>
                            <input type="number" id="shu-persen-modal" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm" value="40">
                        </div>
                        <div>
                            <label class="block text-xs text-gray-400 mb-1">Persentase Jasa Anggota (%)</label>
                            <input type="number" id="shu-persen-anggota" class="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm" value="40">
                        </div>
                        <button onclick="SHUPage.preview()" class="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 rounded-xl transition-all shadow-lg shadow-primary-200 mt-2">
                            Kalkulasi Preview
                        </button>
                    </div>
                </div>
            </div>

            <!-- Main: Preview Results -->
            <div class="lg:col-span-3">
                <div id="shu-preview-container" class="bg-white rounded-2xl shadow-sm border border-gray-100 min-h-[400px]">
                    <div class="flex flex-col items-center justify-center h-full py-20 text-gray-300">
                        <i class="ri-calculator-line text-6xl mb-4"></i>
                        <p>Masukkan parameter di samping dan klik "Kalkulasi Preview"</p>
                    </div>
                </div>
            </div>
        </div>`;

        // Sync inputs with state
        document.getElementById('shu-tahun').value = this.params.tahun;
        document.getElementById('shu-profit').value = this.params.total_profit || '';
        document.getElementById('shu-pagu').value = this.params.pagu_shu || '';
        document.getElementById('shu-persen-modal').value = this.params.persen_modal;
        document.getElementById('shu-persen-anggota').value = this.params.persen_anggota;
    },

    async preview() {
        this.params.tahun = document.getElementById('shu-tahun').value;
        this.params.total_profit = parseFloat(document.getElementById('shu-profit').value) || 0;
        this.params.pagu_shu = parseFloat(document.getElementById('shu-pagu').value) || this.params.total_profit;
        this.params.persen_modal = parseFloat(document.getElementById('shu-persen-modal').value) || 0;
        this.params.persen_anggota = parseFloat(document.getElementById('shu-persen-anggota').value) || 0;

        if (this.params.total_profit <= 0) {
            App.toast('Total laba harus lebih dari 0', 'error'); return;
        }

        const container = document.getElementById('shu-preview-container');
        container.innerHTML = '<div class="flex justify-center py-20"><i class="ri-loader-4-line animate-spin text-4xl text-primary-500"></i></div>';

        const q = new URLSearchParams(this.params).toString();
        const res = await App.api(`SHU/preview?${q}`);
        if (!res?.success) {
            container.innerHTML = `<div class="p-10 text-center text-red-500">${res?.message || 'Gagal menghitung SHU'}</div>`;
            return;
        }

        this.results = res.data;
        this.renderPreview(res.data);
    },

    renderPreview(data) {
        const s = data.summary;
        const html = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-gray-800">Preview Pembagian SHU ${data.tahun}</h3>
                    <div class="flex items-center gap-2">
                        <button onclick="SHUPage.export('pdf')" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Export PDF">
                            <i class="ri-file-pdf-line text-lg"></i>
                        </button>
                        <button onclick="SHUPage.export('csv')" class="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Export CSV">
                            <i class="ri-file-excel-line text-lg"></i>
                        </button>
                        <div class="w-px h-4 bg-gray-200 mx-1"></div>
                        <div class="flex gap-2 text-[10px] uppercase font-bold tracking-wider">
                        <div class="bg-blue-50 text-blue-600 px-2 py-1 rounded">Modal: ${App.formatRupiah(s.total_jasa_modal)}</div>
                        <div class="bg-emerald-50 text-emerald-600 px-2 py-1 rounded">Jasa: ${App.formatRupiah(s.total_jasa_anggota)}</div>
                    </div>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="text-left text-gray-400 border-b border-gray-50">
                                <th class="pb-3 pl-2">Anggota</th>
                                <th class="pb-3 text-right">Modal</th>
                                <th class="pb-3 text-right">Jasa Pinj.</th>
                                <th class="pb-3 text-right">SHU Modal</th>
                                <th class="pb-3 text-right">SHU Jasa</th>
                                <th class="pb-3 text-right font-bold text-gray-700 pr-2">Total SHU</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
                            ${data.details.map(d => `
                                <tr class="hover:bg-gray-50/50 transition-colors">
                                    <td class="py-3 pl-2">
                                        <div class="font-medium text-gray-800">${d.anggota_nama}</div>
                                        <div class="text-[10px] text-gray-400">${d.no_anggota}</div>
                                    </td>
                                    <td class="py-3 text-right text-xs text-gray-500">${App.formatRupiah(d.simpanan_total)}</td>
                                    <td class="py-3 text-right text-xs text-gray-500">${App.formatRupiah(d.jasa_pinjaman_total)}</td>
                                    <td class="py-3 text-right">${App.formatRupiah(d.bagian_jasa_modal)}</td>
                                    <td class="py-3 text-right">${App.formatRupiah(d.bagian_jasa_anggota)}</td>
                                    <td class="py-3 text-right font-bold text-primary-600 pr-2">${App.formatRupiah(d.total_shu)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
                    <div class="text-xs text-gray-400">
                        * SHU akan diproses dan dicatat dalam data permanen.
                    </div>
                    <button onclick="SHUPage.proses()" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-emerald-200">
                        Proses Pembagian Permanen
                    </button>
                </div>
            </div>`;
        document.getElementById('shu-preview-container').innerHTML = html;
    },

    async proses() {
        if (!this.results) return;
        const ok = await App.confirm('Proses SHU', `Konfirmasi pembagian SHU tahun ${this.results.tahun} sebesar ${App.formatRupiah(this.results.summary.pagu_shu)}?`, 'question');
        if (!ok) return;

        // Add percentages to payload
        const payload = {
            ...this.results,
            persen_modal: this.params.persen_modal,
            persen_anggota: this.params.persen_anggota
        };

        const res = await App.api('SHU/proses', {
            method: 'POST',
            body: payload
        });

        if (res?.success) {
            App.swalSuccess('Berhasil!', res.message);
            this.results = null;
            this.render(document.getElementById('app-content'));
        } else {
            App.toast(res?.message || 'Gagal memproses SHU', 'error');
        }
    },

    getColumns() {
        return [
            { title: 'Anggota', key: 'anggota' },
            { title: 'Simpanan', key: 'simpanan', align: 'right' },
            { title: 'Jasa Pinj.', key: 'jasa_pinjaman', align: 'right' },
            { title: 'SHU Modal', key: 'shu_modal', align: 'right' },
            { title: 'SHU Jasa', key: 'shu_jasa', align: 'right' },
            { title: 'Total SHU', key: 'total', align: 'right' }
        ];
    },

    export(type) {
        if (!this.results) return;
        const data = this.results;
        const formattedData = data.details.map(d => ({
            anggota: `${d.anggota_nama} (${d.no_anggota})`,
            simpanan: App.formatRupiah(d.simpanan_total),
            jasa_pinjaman: App.formatRupiah(d.jasa_pinjaman_total),
            shu_modal: App.formatRupiah(d.bagian_jasa_modal),
            shu_jasa: App.formatRupiah(d.bagian_jasa_anggota),
            total: App.formatRupiah(d.total_shu)
        }));

        App.export(type, `Preview Pembagian SHU Tahun ${data.tahun}`, this.getColumns(), formattedData, {
            filename: `preview_shu_${data.tahun}`
        });
    }
};

export default SHUPage;
window.SHUPage = SHUPage;
