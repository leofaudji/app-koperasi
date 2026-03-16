// Halaman Manajemen Jenis Biaya Pinjaman
const BiayaPinjamanPage = {
    async render(container) {
        App.setTitle('Jenis Biaya Pinjaman', 'Kelola komponen biaya pencairan pinjaman');
        this.container = container;
        this.load(container);
    },

    async load(container) {
        const res = await App.api('biaya-pinjaman?active=0');
        if (!res?.success) return;

        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-lg font-bold text-gray-800">Jenis Biaya Pinjaman</h2>
                    <p class="text-sm text-gray-400 mt-0.5">Komponen biaya yang muncul otomatis saat pencairan pinjaman</p>
                </div>
                <button onclick="BiayaPinjamanPage.form()" class="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary-500/20">
                    <i class="ri-add-line"></i> Tambah Biaya
                </button>
            </div>

            <div class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-800">
                <i class="ri-information-line mr-1"></i>
                Biaya bertanda <span class="font-semibold">Wajib</span> akan otomatis muncul di form pencairan pinjaman. Tipe <span class="font-semibold">Persen (%)</span> dihitung dari jumlah pinjaman.
            </div>

            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="bg-gray-50">
                            <th class="px-4 py-3 text-left font-medium text-gray-500">No</th>
                            <th class="px-4 py-3 text-left font-medium text-gray-500">Nama Biaya</th>
                            <th class="px-4 py-3 text-center font-medium text-gray-500">Tipe</th>
                            <th class="px-4 py-3 text-right font-medium text-gray-500">Nilai</th>
                            <th class="px-4 py-3 text-center font-medium text-gray-500">Wajib</th>
                            <th class="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                            <th class="px-4 py-3 text-center font-medium text-gray-500">Aksi</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100">
                        ${res.data.map((b, i) => `
                        <tr class="hover:bg-gray-50/50 transition-colors ${!b.is_active ? 'opacity-50' : ''}">
                            <td class="px-4 py-3 text-gray-400">${b.urutan || (i + 1)}</td>
                            <td class="px-4 py-3 font-medium text-gray-800">${b.nama}</td>
                            <td class="px-4 py-3 text-center">
                                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${b.tipe === 'persen' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}">
                                    ${b.tipe === 'persen' ? '<i class="ri-percent-line mr-1"></i>Persen' : '<i class="ri-money-rupee-circle-line mr-1"></i>Nominal'}
                                </span>
                            </td>
                            <td class="px-4 py-3 text-right font-mono font-semibold text-gray-700">
                                ${b.tipe === 'persen' ? parseFloat(b.nilai).toFixed(2) + '%' : App.formatRupiah(b.nilai)}
                            </td>
                            <td class="px-4 py-3 text-center">
                                ${b.is_wajib ? '<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700"><i class="ri-checkbox-circle-line mr-1"></i>Wajib</span>' : '<span class="text-gray-400 text-xs">Opsional</span>'}
                            </td>
                            <td class="px-4 py-3 text-center">
                                <button onclick="BiayaPinjamanPage.toggle(${b.id})" class="text-xs px-2 py-1 rounded-lg ${b.is_active ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}">
                                    ${b.is_active ? 'Aktif' : 'Nonaktif'}
                                </button>
                            </td>
                            <td class="px-4 py-3 text-center">
                                <div class="flex justify-center gap-1">
                                    <button onclick="BiayaPinjamanPage.form(${b.id})" class="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500" title="Edit"><i class="ri-edit-line"></i></button>
                                    <button onclick="BiayaPinjamanPage.hapus(${b.id})" class="p-1.5 hover:bg-red-50 rounded-lg text-red-400" title="Hapus"><i class="ri-delete-bin-line"></i></button>
                                </div>
                            </td>
                        </tr>`).join('')}
                        ${!res.data.length ? '<tr><td colspan="7" class="text-center py-10 text-gray-400">Belum ada jenis biaya</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        </div>`;
    },

    async form(id = null) {
        let data = null;
        if (id) {
            const r = await App.api(`biaya-pinjaman/${id}`);
            if (!r?.success) { App.toast('Gagal memuat data', 'error'); return; }
            data = r.data;
        }

        App.openModal(`<div class="p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-5"><i class="ri-coins-line text-amber-500 mr-2"></i>${data ? 'Edit' : 'Tambah'} Jenis Biaya</h3>
            <div class="space-y-4">
                <div>
                    <label class="block text-sm font-medium text-gray-600 mb-1">Nama Biaya *</label>
                    <input type="text" id="bb-nama" value="${data?.nama || ''}" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" placeholder="Contoh: Biaya Provisi">
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Tipe Perhitungan *</label>
                        <select id="bb-tipe" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" onchange="BiayaPinjamanPage.toggleTipe(this.value)">
                            <option value="nominal" ${data?.tipe !== 'persen' ? 'selected' : ''}>Nominal (Rp)</option>
                            <option value="persen" ${data?.tipe === 'persen' ? 'selected' : ''}>Persentase (%)</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1" id="bb-nilai-lbl">Nilai (Rp) *</label>
                        <input type="number" id="bb-nilai" value="${data?.nilai || 0}" min="0" step="0.01" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Status Keharusan</label>
                        <select id="bb-wajib" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm">
                            <option value="1" ${data?.is_wajib ? 'selected' : ''}>Biaya Wajib</option>
                            <option value="0" ${!data?.is_wajib ? 'selected' : ''}>Opsional</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-600 mb-1">Urutan Tampil</label>
                        <input type="number" id="bb-urutan" value="${data?.urutan || 0}" min="0" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm">
                    </div>
                </div>
                <div class="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onclick="App.closeModal()" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 text-gray-600">Batal</button>
                    <button type="button" onclick="BiayaPinjamanPage.save(${id || 'null'})" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium">Simpan</button>
                </div>
            </div>
        </div>`);

        if (data?.tipe === 'persen') BiayaPinjamanPage.toggleTipe('persen');
    },

    toggleTipe(tipe) {
        const lbl = document.getElementById('bb-nilai-lbl');
        if (lbl) lbl.textContent = tipe === 'persen' ? 'Nilai (%) *' : 'Nilai (Rp) *';
    },

    async save(id) {
        const payload = {
            nama: document.getElementById('bb-nama')?.value?.trim(),
            tipe: document.getElementById('bb-tipe')?.value,
            nilai: document.getElementById('bb-nilai')?.value,
            is_wajib: document.getElementById('bb-wajib')?.value,
            urutan: document.getElementById('bb-urutan')?.value,
        };
        if (!payload.nama) { App.toast('Nama biaya wajib diisi', 'warning'); return; }

        const r = id
            ? await App.api(`biaya-pinjaman/${id}`, { method: 'PUT', body: payload })
            : await App.api('biaya-pinjaman', { method: 'POST', body: payload });

        if (r?.success) {
            App.closeModal();
            App.toast(r.message, 'success');
            this.load(this.container);
        } else App.toast(r?.message || 'Gagal menyimpan', 'error');
    },

    async toggle(id) {
        const r = await App.api(`biaya-pinjaman/${id}/toggle`, { method: 'PUT', body: {} });
        if (r?.success) { App.toast(r.message, 'success'); this.load(this.container); }
        else App.toast(r?.message || 'Gagal', 'error');
    },

    async hapus(id) {
        const ok = await App.confirm('Hapus Jenis Biaya', 'Jenis biaya akan dinonaktifkan. Lanjutkan?', 'warning');
        if (!ok) return;
        const r = await App.api(`biaya-pinjaman/${id}`, { method: 'DELETE' });
        if (r?.success) { App.toast(r.message, 'success'); this.load(this.container); }
        else App.toast(r?.message || 'Gagal', 'error');
    }
};
window.BiayaPinjamanPage = BiayaPinjamanPage;
export default BiayaPinjamanPage;
