// Jenis Pinjaman Page
const JenisPinjamanPage = {
    _akun: [],
    async render(container) {
        App.setTitle('Jenis Pinjaman', 'Setting jenis pinjaman koperasi');
        const res = await App.api('jenis-pinjaman');
        if (!res?.success) return;
        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex justify-between mb-6"><h3 class="font-semibold text-gray-800">Daftar Jenis Pinjaman</h3>
            ${App.hasPerm('pinjaman.setting') ? '<button onclick="JenisPinjamanPage.form()" class="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><i class="ri-add-line"></i> Tambah</button>' : ''}</div>
            <div class="table-wrapper"><table class="data-table w-full text-sm"><thead><tr class="bg-gray-50"><th class="px-4 py-3 text-left font-medium text-gray-500">Kode</th><th class="px-4 py-3 text-left font-medium text-gray-500">JP</th><th class="px-4 py-3 text-left font-medium text-gray-500">Nama</th><th class="px-4 py-3 text-right font-medium text-gray-500">Bunga (%/bln)</th><th class="px-4 py-3 text-center font-medium text-gray-500">Max Tenor</th><th class="px-4 py-3 text-left font-medium text-gray-500">Akun Neraca</th><th class="px-4 py-3 text-center font-medium text-gray-500">Aksi</th></tr></thead>
            <tbody>${res.data.map(j => `<tr class="border-t border-gray-50"><td class="px-4 py-3 font-mono">${j.kode}</td><td class="px-4 py-3 font-mono text-primary-600 font-bold">${j.kode_numerik || '--'}</td><td class="px-4 py-3 font-medium">${j.nama}</td><td class="px-4 py-3 text-right">${j.bunga_persen}%</td><td class="px-4 py-3 text-center">${j.max_tenor} bln</td>
            <td class="px-4 py-3">${j.akun_kode ? `<span class="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">${j.akun_kode}</span> ${j.akun_nama}` : '<span class="text-gray-400">-</span>'}</td>
            <td class="px-4 py-3 text-center"><div class="flex justify-center gap-1">${App.hasPerm('pinjaman.setting') ? `<button onclick="JenisPinjamanPage.form(${j.id})" class="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500"><i class="ri-edit-line"></i></button><button onclick="JenisPinjamanPage.del(${j.id},'${j.nama}')" class="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><i class="ri-delete-bin-line"></i></button>` : ''}</div></td></tr>`).join('')}</tbody></table></div></div>`;
    },
    async form(id = null) {
        // Load akun list for dropdown
        if (!this._akun.length) {
            const akunRes = await App.api('keuangan/akun');
            this._akun = akunRes?.data || [];
        }
        const akunOpts = this._akun.map(a => `<option value="${a.id}">${a.kode} - ${a.nama} (${a.tipe})</option>`).join('');

        App.openModal(`<div class="p-6"><h3 class="text-lg font-bold text-gray-800 mb-6">${id ? 'Edit' : 'Tambah'} Jenis Pinjaman</h3>
        <form id="jp-form" class="space-y-4"><input type="hidden" id="jpf-id" value="${id || ''}">
            <div class="grid grid-cols-2 gap-4">
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Kode *</label><input type="text" id="jpf-kode" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" ${id ? 'readonly' : ''} required></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Kode Numerik (JP) *</label><input type="text" id="jpf-js" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" maxlength="2" placeholder="Contoh: 01" required></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Nama *</label><input type="text" id="jpf-nama" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" required></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Bunga (%/bulan)</label><input type="number" id="jpf-bunga" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" step="0.01" value="0"></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Max Tenor (bulan)</label><input type="number" id="jpf-tenor" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" value="12"></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Max Jumlah (Rp)</label><input type="number" id="jpf-max" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" value="0"></div></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Akun Neraca (Piutang)</label>
            <select id="jpf-akun" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"><option value="">-- Pilih Akun --</option>${akunOpts}</select>
            <p class="text-xs text-gray-400 mt-1">Akun piutang di neraca (misal: Piutang Pinjaman Anggota)</p></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Keterangan</label><input type="text" id="jpf-ket" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"></div>
            <div class="flex justify-end gap-3 pt-4 border-t"><button type="button" onclick="App.closeModal()" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm">Batal</button><button type="submit" class="px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium">Simpan</button></div></form></div>`);

        if (id) App.api('jenis-pinjaman/' + id).then(r => {
            if (r?.data) {
                document.getElementById('jpf-kode').value = r.data.kode;
                document.getElementById('jpf-js').value = r.data.kode_numerik || '';
                document.getElementById('jpf-nama').value = r.data.nama;
                document.getElementById('jpf-bunga').value = r.data.bunga_persen;
                document.getElementById('jpf-tenor').value = r.data.max_tenor;
                document.getElementById('jpf-max').value = r.data.max_jumlah;
                document.getElementById('jpf-akun').value = r.data.akun_id || '';
                document.getElementById('jpf-ket').value = r.data.keterangan || '';
            }
        });
        document.getElementById('jp-form').onsubmit = async e => {
            e.preventDefault();
            const fid = document.getElementById('jpf-id').value;
            const body = {
                kode: document.getElementById('jpf-kode').value,
                kode_numerik: document.getElementById('jpf-js').value,
                nama: document.getElementById('jpf-nama').value,
                bunga_persen: document.getElementById('jpf-bunga').value,
                max_tenor: document.getElementById('jpf-tenor').value,
                max_jumlah: document.getElementById('jpf-max').value,
                akun_id: document.getElementById('jpf-akun').value,
                keterangan: document.getElementById('jpf-ket').value
            };
            const r = await App.api(fid ? `jenis-pinjaman/${fid}` : 'jenis-pinjaman', { method: fid ? 'PUT' : 'POST', body });
            if (r?.success) {
                App.closeModal();
                App.toast(r.message, 'success');
                this.render(document.getElementById('app-content'));
            } else App.toast(r?.message || 'Gagal', 'error');
        };
    },
    async del(id, name) {
        const ok = await App.confirm('Hapus Data', `Yakin ingin menghapus "${name}"?`);
        if (!ok) return;
        const r = await App.api(`jenis-pinjaman/${id}`, { method: 'DELETE' });
        if (r?.success) {
            App.toast(r.message, 'success');
            this.render(document.getElementById('app-content'));
        } else App.toast(r?.message || 'Gagal', 'error');
    }
};

window.JenisPinjamanPage = JenisPinjamanPage;
export default JenisPinjamanPage;
