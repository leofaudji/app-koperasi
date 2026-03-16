// Proses Akhir Tahun (Tutup Buku) Page
const AkhirTahunPage = {
    dataPreview: null,

    async render(container) {
        App.setTitle('Proses Akhir Tahun', 'Tutup buku & jurnal penutup tahunan');

        const tahunIni = new Date().getFullYear();
        const tahunOpts = Array.from({ length: 4 }, (_, i) => tahunIni - i)
            .map(y => `<option value="${y}" ${y === tahunIni ? 'selected' : ''}>${y}</option>`).join('');

        container.innerHTML = `
        <div class="space-y-5 animate-fadeIn">

            <!-- Info Banner -->
            <div class="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                <i class="ri-information-line text-amber-600 text-xl shrink-0 mt-0.5"></i>
                <div class="text-sm text-amber-800">
                    <p class="font-bold mb-1">📌 Tentang Proses Akhir Tahun (Tutup Buku)</p>
                    <p>Proses ini membuat <strong>jurnal penutup</strong> yang menolkan seluruh akun pendapatan dan beban, kemudian mentransfer Sisa Hasil Usaha (SHU) ke akun modal yang dipilih. Proses bersifat <strong>irreversibel</strong> kecuali di-reset oleh admin.</p>
                </div>
            </div>

            <!-- Form Pilih Tahun -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i class="ri-calendar-check-line text-primary-600"></i> Pengaturan Tutup Buku
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 mb-1.5">Tahun yang Ditutup</label>
                        <select id="at-tahun" class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500">
                            ${tahunOpts}
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 mb-1.5">Akun Tujuan SHU</label>
                        <select id="at-akun-shu" class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500">
                            <option value="">-- Memuat akun modal... --</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 mb-1.5">Tanggal Jurnal Penutup</label>
                        <input type="text" id="at-tgl-tutup"
                            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500">
                    </div>
                </div>
                <div class="mt-4 flex gap-2">
                    <button onclick="AkhirTahunPage.preview()"
                        class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
                        <i class="ri-eye-line"></i> Preview Tutup Buku
                    </button>
                </div>
            </div>

            <!-- Preview & Konfirmasi -->
            <div id="at-preview"></div>

            <!-- Riwayat -->
            <div id="at-riwayat"></div>
        </div>`;

        // Load akun modal
        this._loadAkunModal();

        // Datepicker tanggal tutup
        const lastYear = document.getElementById('at-tahun').value;
        App.datepicker('#at-tgl-tutup', { defaultDate: `${lastYear}-12-31` });
        document.getElementById('at-tahun').addEventListener('change', (e) => {
            const y = e.target.value;
            document.getElementById('at-tgl-tutup')._flatpickr?.setDate(`${y}-12-31`);
        });
    },

    async _loadAkunModal() {
        const r = await App.api('keuangan/akun');
        const sel = document.getElementById('at-akun-shu');
        if (!sel) return;
        const modalAkuns = (r?.data || []).filter(a => a.tipe === 'modal' && a.is_active == 1);
        sel.innerHTML = '<option value="">-- Pilih akun tujuan SHU --</option>'
            + modalAkuns.map(a => `<option value="${a.id}">${a.kode} - ${a.nama}</option>`).join('');
        // Auto-select akun SHU jika ada
        const shuAkun = modalAkuns.find(a => a.nama.toLowerCase().includes('shu') || a.nama.toLowerCase().includes('laba'));
        if (shuAkun) sel.value = shuAkun.id;
    },

    async preview() {
        const tahun = document.getElementById('at-tahun').value;
        const previewEl = document.getElementById('at-preview');
        const riwayatEl = document.getElementById('at-riwayat');

        previewEl.innerHTML = `<div class="flex items-center justify-center h-24">
            <div class="animate-spin w-6 h-6 border-3 border-primary-200 border-t-primary-600 rounded-full"></div>
        </div>`;

        const res = await App.api(`akhir-tahun?tahun=${tahun}`);
        if (!res?.success) { previewEl.innerHTML = ''; return; }

        const d = res.data;
        this.dataPreview = d;

        const sudahTutup = d.sudah_ditutup;
        const shuColor = d.shu >= 0 ? 'text-emerald-600' : 'text-red-500';
        const shuBg = d.shu >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200';

        previewEl.innerHTML = `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            <!-- Status Banner -->
            <div class="${sudahTutup ? 'bg-emerald-600' : 'bg-slate-700'} px-5 py-3 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <i class="${sudahTutup ? 'ri-checkbox-circle-fill' : 'ri-time-line'} text-white text-xl"></i>
                    <div>
                        <p class="text-white font-bold">Tahun ${d.tahun}</p>
                        <p class="text-white/70 text-xs">${sudahTutup
                ? `Tutup buku sudah dilakukan — Jurnal: ${d.jurnal_tutup?.no_bukti}`
                : 'Belum dilakukan tutup buku'}</p>
                    </div>
                </div>
                ${sudahTutup
                ? `<span class="bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full">✓ SUDAH DITUTUP</span>`
                : `<span class="bg-amber-400 text-amber-900 text-xs font-bold px-3 py-1 rounded-full">⚠ BELUM DITUTUP</span>`}
            </div>

            <div class="p-5 space-y-5">
                <!-- Ringkasan SHU -->
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                        <p class="text-xs text-emerald-600 font-semibold uppercase tracking-wide">Total Pendapatan</p>
                        <p class="text-lg font-black text-emerald-700 mt-1">${App.formatRupiah(d.total_pendapatan)}</p>
                    </div>
                    <div class="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                        <p class="text-xs text-red-600 font-semibold uppercase tracking-wide">Total Beban</p>
                        <p class="text-lg font-black text-red-700 mt-1">${App.formatRupiah(d.total_beban)}</p>
                    </div>
                    <div class="${shuBg} border rounded-xl p-4 text-center">
                        <p class="text-xs font-semibold uppercase tracking-wide ${shuColor}">SHU (Laba/Rugi)</p>
                        <p class="text-lg font-black mt-1 ${shuColor}">${App.formatRupiah(d.shu)}</p>
                    </div>
                </div>

                <!-- Detail Akun -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span class="w-2 h-2 bg-emerald-500 rounded-full"></span>Akun Pendapatan
                        </h4>
                        <div class="space-y-1">
                            ${d.pendapatan.length ? d.pendapatan.map(a => `
                            <div class="flex justify-between text-sm py-2 border-b border-gray-50 px-2 hover:bg-gray-50/60 rounded-lg">
                                <span class="text-gray-700">${a.kode} - ${a.nama}</span>
                                <span class="font-mono font-bold text-emerald-600">${App.formatRupiah(a.saldo)}</span>
                            </div>`).join('')
                : '<p class="text-gray-400 text-sm py-3 text-center">Tidak ada akun pendapatan</p>'}
                        </div>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <span class="w-2 h-2 bg-red-400 rounded-full"></span>Akun Beban
                        </h4>
                        <div class="space-y-1">
                            ${d.beban.length ? d.beban.map(a => `
                            <div class="flex justify-between text-sm py-2 border-b border-gray-50 px-2 hover:bg-gray-50/60 rounded-lg">
                                <span class="text-gray-700">${a.kode} - ${a.nama}</span>
                                <span class="font-mono font-bold text-red-500">${App.formatRupiah(a.saldo)}</span>
                            </div>`).join('')
                : '<p class="text-gray-400 text-sm py-3 text-center">Tidak ada akun beban</p>'}
                        </div>
                    </div>
                </div>

                <!-- Tombol Proses -->
                ${!sudahTutup ? `
                <div class="border-t border-gray-100 pt-4">
                    <div class="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 flex items-center gap-2 text-sm text-amber-800">
                        <i class="ri-alert-line text-amber-600"></i>
                        Setelah diproses, seluruh akun pendapatan & beban akan dinolkan dan SHU akan masuk ke akun modal yang dipilih.
                    </div>
                    <button onclick="AkhirTahunPage.proses()"
                        class="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm hover:shadow-red-200">
                        <i class="ri-lock-line"></i> Proses Tutup Buku Tahun ${d.tahun}
                    </button>
                </div>` : `
                <div class="border-t border-gray-100 pt-4">
                    <div class="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2 text-sm text-emerald-700">
                        <i class="ri-checkbox-circle-line text-emerald-600"></i>
                        Tutup buku sudah selesai. Lihat hasilnya di Neraca (mode: Sesudah Akhir Tahun).
                    </div>
                    ${App.user?.role_id == 1 ? `
                    <button onclick="AkhirTahunPage.reset('${d.tahun}')"
                        class="mt-3 bg-gray-100 hover:bg-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all">
                        <i class="ri-restart-line"></i> Reset Tutup Buku (Admin Only)
                    </button>` : ''}
                </div>`}
            </div>
        </div>`;

        // Load riwayat
        if (d.riwayat?.length) {
            riwayatEl.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                    <i class="ri-history-line text-gray-500"></i>
                    <h3 class="font-bold text-gray-800">Riwayat Tutup Buku</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead><tr class="bg-gray-50 border-b border-gray-100">
                            <th class="px-4 py-2.5 text-left font-semibold text-gray-500 text-xs">No. Bukti</th>
                            <th class="px-4 py-2.5 text-center font-semibold text-gray-500 text-xs">Tanggal</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-gray-500 text-xs">Keterangan</th>
                            <th class="px-4 py-2.5 text-right font-semibold text-gray-500 text-xs">SHU</th>
                            <th class="px-4 py-2.5 text-left font-semibold text-gray-500 text-xs">Diproses Oleh</th>
                        </tr></thead>
                        <tbody>
                            ${d.riwayat.map(r => `
                            <tr class="border-b border-gray-50 hover:bg-gray-50/60">
                                <td class="px-4 py-3 font-mono text-xs bg-gray-50 font-bold">${r.no_bukti}</td>
                                <td class="px-4 py-3 text-center text-xs">${App.formatDate(r.tgl_transaksi)}</td>
                                <td class="px-4 py-3 text-sm">${r.keterangan}</td>
                                <td class="px-4 py-3 text-right font-bold ${r.shu >= 0 ? 'text-emerald-600' : 'text-red-500'}">${App.formatRupiah(r.shu)}</td>
                                <td class="px-4 py-3 text-xs text-gray-500">${r.diproses_oleh || '-'}</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
        } else {
            riwayatEl.innerHTML = '';
        }
    },

    async proses() {
        const tahun = document.getElementById('at-tahun').value;
        const akunSHU = document.getElementById('at-akun-shu').value;
        const tglTutup = App.dateToISO(document.getElementById('at-tgl-tutup').value);

        if (!akunSHU) { App.toast('Pilih akun tujuan SHU terlebih dahulu', 'warning'); return; }

        const ok = await App.confirm(
            `Tutup Buku Tahun ${tahun}`,
            `SHU sebesar ${App.formatRupiah(this.dataPreview?.shu || 0)} akan ditransfer ke akun modal yang dipilih. Proses ini tidak bisa dibatalkan secara otomatis. Lanjutkan?`,
            'warning'
        );
        if (!ok) return;

        const res = await App.api('akhir-tahun', {
            method: 'POST',
            body: { tahun, akun_shu_id: akunSHU, tgl_tutup: tglTutup }
        });

        if (res?.success) {
            App.swalSuccess(`Tutup Buku Tahun ${tahun} Berhasil!`, res.message);
            this.preview();
        } else {
            App.toast(res?.message || 'Gagal memproses tutup buku', 'error', 5000);
        }
    },

    async reset(tahun) {
        const ok = await App.confirm(`Reset Tutup Buku ${tahun}`, 'Jurnal penutup akan dihapus permanen. Yakin?', 'warning');
        if (!ok) return;
        const res = await App.api(`akhir-tahun?tahun=${tahun}`, { method: 'DELETE' });
        if (res?.success) {
            App.swalSuccess('Reset berhasil', res.message);
            this.preview();
        } else {
            App.toast(res?.message || 'Gagal reset', 'error');
        }
    }
};

window.AkhirTahunPage = AkhirTahunPage;
export default AkhirTahunPage;
