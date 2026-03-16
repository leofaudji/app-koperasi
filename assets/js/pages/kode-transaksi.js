// Kode Transaksi Simpanan Page
const KodeTransaksiPage = {
    _akun: [],
    async render(container) {
        App.setTitle('Kode Transaksi Simpanan', 'Setting kode transaksi (D/K)');
        const res = await App.api('kode-transaksi');
        if (!res?.success) return;
        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex justify-between mb-6"><h3 class="font-semibold text-gray-800">Daftar Kode Transaksi</h3>
            ${App.hasPerm('simpanan.setting') ? '<button onclick="KodeTransaksiPage.form()" class="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><i class="ri-add-line"></i> Tambah</button>' : ''}</div>
            <div class="table-wrapper"><table class="data-table w-full text-sm"><thead><tr class="bg-gray-50"><th class="px-4 py-3 text-left font-medium text-gray-500">Kode</th><th class="px-4 py-3 text-left font-medium text-gray-500">Nama</th><th class="px-4 py-3 text-center font-medium text-gray-500">D/K</th><th class="px-4 py-3 text-left font-medium text-gray-500">Akun Debit</th><th class="px-4 py-3 text-left font-medium text-gray-500">Akun Kredit</th><th class="px-4 py-3 text-center font-medium text-gray-500">Aksi</th></tr></thead>
            <tbody>${res.data.map(k => `<tr class="border-t border-gray-50"><td class="px-4 py-3 font-mono font-bold">${k.kode}</td><td class="px-4 py-3 font-medium">${k.nama}</td><td class="px-4 py-3 text-center">${App.dkBadge(k.dk)}</td>
            <td class="px-4 py-3">${k.akun_debit_kode ? `<span class="font-mono text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">${k.akun_debit_kode}</span> ${k.akun_debit_nama}` : '<span class="text-gray-400 text-xs">Dari Jenis Simpanan</span>'}</td>
            <td class="px-4 py-3">${k.akun_kredit_kode ? `<span class="font-mono text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">${k.akun_kredit_kode}</span> ${k.akun_kredit_nama}` : '<span class="text-gray-400 text-xs">Dari Jenis Simpanan</span>'}</td>
            <td class="px-4 py-3 text-center"><div class="flex justify-center gap-1">${App.hasPerm('simpanan.setting') ? `<button onclick="KodeTransaksiPage.form(${k.id})" class="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500"><i class="ri-edit-line"></i></button><button onclick="KodeTransaksiPage.del(${k.id},'${k.nama}')" class="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><i class="ri-delete-bin-line"></i></button>` : ''}</div></td></tr>`).join('')}</tbody></table></div></div>`;
    },
    async form(id = null) {
        // Load akun list for dropdown
        if (!this._akun.length) {
            const akunRes = await App.api('keuangan/akun');
            this._akun = akunRes?.data || [];
        }
        const akunOpts = this._akun.map(a => `<option value="${a.id}">${a.kode} - ${a.nama} (${a.tipe})</option>`).join('');

        App.openModal(`<div class="p-6"><h3 class="text-lg font-bold text-gray-800 mb-6">${id ? 'Edit' : 'Tambah'} Kode Transaksi</h3>
        <form id="kt-form" class="space-y-4"><input type="hidden" id="ktf-id" value="${id || ''}">
            <div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-gray-600 mb-1">Kode *</label><input type="text" id="ktf-kode" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" maxlength="5" ${id ? 'readonly' : ''} required></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Nama *</label><input type="text" id="ktf-nama" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" required></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Debit/Kredit *</label><select id="ktf-dk" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"><option value="D">D - Debit (menambah saldo)</option><option value="K">K - Kredit (mengurangi saldo)</option></select></div></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Deskripsi</label><input type="text" id="ktf-desc" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"></div>
            <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium text-gray-600 mb-1"><i class="ri-arrow-left-down-line text-emerald-500"></i> Akun Debit</label>
                <select id="ktf-akun-debit" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"><option value="">-- Dari Jenis Simpanan --</option>${akunOpts}</select>
                <p class="text-xs text-gray-400 mt-1">Akun yang di-debit saat transaksi</p></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1"><i class="ri-arrow-right-up-line text-red-500"></i> Akun Kredit</label>
                <select id="ktf-akun-kredit" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"><option value="">-- Dari Jenis Simpanan --</option>${akunOpts}</select>
                <p class="text-xs text-gray-400 mt-1">Akun yang di-kredit saat transaksi</p></div>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t"><button type="button" onclick="App.closeModal()" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm">Batal</button><button type="submit" class="px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium">Simpan</button></div></form></div>`);

        if (id) App.api('kode-transaksi/' + id).then(r => {
            if (r?.data) {
                document.getElementById('ktf-kode').value = r.data.kode;
                document.getElementById('ktf-nama').value = r.data.nama;
                document.getElementById('ktf-dk').value = r.data.dk;
                document.getElementById('ktf-desc').value = r.data.deskripsi || '';
                document.getElementById('ktf-akun-debit').value = r.data.akun_debit_id || '';
                document.getElementById('ktf-akun-kredit').value = r.data.akun_kredit_id || '';
            }
        });

        document.getElementById('kt-form').onsubmit = async e => {
            e.preventDefault();
            const fid = document.getElementById('ktf-id').value;
            const body = {
                kode: document.getElementById('ktf-kode').value,
                nama: document.getElementById('ktf-nama').value,
                dk: document.getElementById('ktf-dk').value,
                deskripsi: document.getElementById('ktf-desc').value,
                akun_debit_id: document.getElementById('ktf-akun-debit').value,
                akun_kredit_id: document.getElementById('ktf-akun-kredit').value
            };
            const r = await App.api(fid ? `kode-transaksi/${fid}` : 'kode-transaksi', { method: fid ? 'PUT' : 'POST', body });
            if (r?.success) { App.closeModal(); App.toast(r.message, 'success'); this.render(document.getElementById('app-content')); }
            else App.toast(r?.message || 'Gagal', 'error');
        };
    },
    async del(id, name) { const ok = await App.confirm('Hapus Data', `Yakin ingin menghapus "${name}"?`); if (!ok) return; const r = await App.api(`kode-transaksi/${id}`, { method: 'DELETE' }); if (r?.success) { App.toast(r.message, 'success'); this.render(document.getElementById('app-content')); } else App.toast(r?.message || 'Gagal', 'error'); }
};
window.KodeTransaksiPage = KodeTransaksiPage;
export default KodeTransaksiPage;
