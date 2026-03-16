// Jenis Simpanan Page
const JenisSimpananPage = {
    _akun: [],
    async render(container) {
        App.setTitle('Jenis Simpanan', 'Setting jenis simpanan koperasi');
        const res = await App.api('jenis-simpanan');
        if (!res?.success) return;
        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex justify-between mb-6"><h3 class="font-semibold text-gray-800">Daftar Jenis Simpanan</h3>
            ${App.hasPerm('simpanan.setting') ? '<button onclick="JenisSimpananPage.form()" class="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><i class="ri-add-line"></i> Tambah</button>' : ''}</div>
            <div class="table-wrapper"><table class="data-table w-full text-sm"><thead><tr class="bg-gray-50"><th class="px-4 py-3 text-left font-medium text-gray-500">Kode</th><th class="px-4 py-3 text-left font-medium text-gray-500">JS</th><th class="px-4 py-3 text-left font-medium text-gray-500">Nama</th><th class="px-4 py-3 text-right font-medium text-gray-500">Bunga (%)</th><th class="px-4 py-3 text-center font-medium text-gray-500">Wajib</th><th class="px-4 py-3 text-left font-medium text-gray-500">Akun COA</th><th class="px-4 py-3 text-center font-medium text-gray-500">Aksi</th></tr></thead>
            <tbody>${res.data.map(j => `<tr class="border-t border-gray-50"><td class="px-4 py-3 font-mono">${j.kode}</td><td class="px-4 py-3 font-mono text-primary-600 font-bold">${j.kode_numerik || '--'}</td><td class="px-4 py-3 font-medium">${j.nama}</td><td class="px-4 py-3 text-right">${j.bunga_persen}%</td><td class="px-4 py-3 text-center">${j.is_wajib ? '<span class="badge badge-success">Ya</span>' : '<span class="badge badge-warning">Tidak</span>'}</td>
            <td class="px-4 py-3">${j.akun_kode ? `<span class="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">${j.akun_kode}</span> ${j.akun_nama}` : '<span class="text-gray-400">-</span>'}</td>
            <td class="px-4 py-3 text-center"><div class="flex justify-center gap-1">${App.hasPerm('simpanan.setting') ? `<button onclick="JenisSimpananPage.form(${j.id})" class="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500"><i class="ri-edit-line"></i></button><button onclick="JenisSimpananPage.del(${j.id},'${j.nama}')" class="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><i class="ri-delete-bin-line"></i></button>` : ''}</div></td></tr>`).join('')}</tbody></table></div></div>`;
    },
    async form(id = null) {
        // Load akun list for dropdown
        if (!this._akun.length) {
            const akunRes = await App.api('keuangan/akun');
            this._akun = akunRes?.data || [];
        }
        const akunOpts = this._akun.map(a => `<option value="${a.id}">${a.kode} - ${a.nama} (${a.tipe})</option>`).join('');

        App.openModal(`<div class="p-6"><h3 class="text-lg font-bold text-gray-800 mb-6">${id ? 'Edit' : 'Tambah'} Jenis Simpanan</h3>
        <form id="js-form" class="space-y-4"><input type="hidden" id="jsf-id" value="${id || ''}">
            <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Kode *</label><input type="text" id="jsf-kode" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" ${id ? 'readonly' : ''} required></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Kode Numerik (JS) *</label><input type="text" id="jsf-js" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" maxlength="2" placeholder="Contoh: 01" required></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Nama *</label><input type="text" id="jsf-nama" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" required></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Bunga (%)</label> <input type="number" id="jsf-bunga" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" step="0.01" value="0"></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Wajib</label><select id="jsf-wajib" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"><option value="0">Tidak</option><option value="1">Ya</option></select></div></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Akun COA (Kewajiban)</label>
            <select id="jsf-akun" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"><option value="">-- Pilih Akun --</option>${akunOpts}</select>
            <p class="text-xs text-gray-400 mt-1">Akun kewajiban di neraca untuk jenis simpanan ini (misal: Simpanan Anggota)</p></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Keterangan</label><input type="text" id="jsf-ket" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"></div>
            <div class="flex justify-end gap-3 pt-4 border-t"><button type="button" onclick="App.closeModal()" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm">Batal</button><button type="submit" class="px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium">Simpan</button></div></form></div>`);

        if (id) App.api('jenis-simpanan/' + id).then(r => {
            if (r?.data) {
                document.getElementById('jsf-kode').value = r.data.kode;
                document.getElementById('jsf-js').value = r.data.kode_numerik || '';
                document.getElementById('jsf-nama').value = r.data.nama;
                document.getElementById('jsf-bunga').value = r.data.bunga_persen;
                document.getElementById('jsf-wajib').value = r.data.is_wajib;
                document.getElementById('jsf-akun').value = r.data.akun_id || '';
                document.getElementById('jsf-ket').value = r.data.keterangan || '';
            }
        });

        document.getElementById('js-form').onsubmit = async e => {
            e.preventDefault();
            const fid = document.getElementById('jsf-id').value;
            const body = {
                kode: document.getElementById('jsf-kode').value,
                kode_numerik: document.getElementById('jsf-js').value,
                nama: document.getElementById('jsf-nama').value,
                bunga_persen: document.getElementById('jsf-bunga').value,
                is_wajib: document.getElementById('jsf-wajib').value,
                akun_id: document.getElementById('jsf-akun').value,
                keterangan: document.getElementById('jsf-ket').value
            };
            const r = await App.api(fid ? `jenis-simpanan/${fid}` : 'jenis-simpanan', { method: fid ? 'PUT' : 'POST', body });
            if (r?.success) { App.closeModal(); App.toast(r.message, 'success'); this.render(document.getElementById('app-content')); }
            else App.toast(r?.message || 'Gagal', 'error');
        };
    },
    async del(id, name) { const ok = await App.confirm('Hapus Data', `Yakin ingin menghapus "${name}"?`); if (!ok) return; const r = await App.api(`jenis-simpanan/${id}`, { method: 'DELETE' }); if (r?.success) { App.toast(r.message, 'success'); this.render(document.getElementById('app-content')); } else App.toast(r?.message || 'Gagal', 'error'); }
};
window.JenisSimpananPage = JenisSimpananPage;
export default JenisSimpananPage;
