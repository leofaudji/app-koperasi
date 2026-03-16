// Chart of Accounts Page
const AkunPage = {
    async render(container) {
        App.setTitle('Chart of Account', 'Daftar akun keuangan');
        const res = await App.api('keuangan/akun');
        if (!res?.success) return;
        const tipeColors = { aset: 'badge-info', kewajiban: 'badge-warning', modal: 'badge-success', pendapatan: 'badge-success', beban: 'badge-danger' };
        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex justify-between mb-6"><h3 class="font-semibold text-gray-800">Chart of Accounts</h3>
            ${App.hasPerm('keuangan.akun') ? '<button onclick="AkunPage.form()" class="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><i class="ri-add-line"></i> Tambah Akun</button>' : ''}</div>
            <div class="table-wrapper"><table class="data-table w-full text-sm"><thead><tr class="bg-gray-50"><th class="px-4 py-3 text-left font-medium text-gray-500">Kode</th><th class="px-4 py-3 text-left font-medium text-gray-500">Nama Akun</th><th class="px-4 py-3 text-center font-medium text-gray-500">Tipe</th><th class="px-4 py-3 text-center font-medium text-gray-500">Saldo Normal</th><th class="px-4 py-3 text-center font-medium text-gray-500">Aksi</th></tr></thead>
            <tbody>${res.data.map(a => `<tr class="border-t border-gray-50"><td class="px-4 py-3 font-mono font-bold">${a.kode}</td><td class="px-4 py-3 font-medium">${a.nama}</td><td class="px-4 py-3 text-center"><span class="badge ${tipeColors[a.tipe] || 'badge-info'}">${a.tipe}</span></td><td class="px-4 py-3 text-center font-mono">${a.saldo_normal}</td>
            <td class="px-4 py-3 text-center"><div class="flex justify-center gap-1">${App.hasPerm('keuangan.akun') ? `<button onclick="AkunPage.form(${a.id})" class="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500"><i class="ri-edit-line"></i></button><button onclick="AkunPage.del(${a.id},'${a.nama}')" class="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><i class="ri-delete-bin-line"></i></button>` : ''}</div></td></tr>`).join('')}</tbody></table></div></div>`;
    },
    form(id = null) {
        App.openModal(`<div class="p-6"><h3 class="text-lg font-bold text-gray-800 mb-6">${id ? 'Edit' : 'Tambah'} Akun</h3>
        <form id="akun-form" class="space-y-4"><input type="hidden" id="af-id" value="${id || ''}">
            <div class="grid grid-cols-2 gap-4"><div><label class="block text-sm font-medium text-gray-600 mb-1">Kode *</label><input type="text" id="af-kode" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" ${id ? 'readonly' : ''} required></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Nama *</label><input type="text" id="af-nama" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" required></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Tipe *</label><select id="af-tipe" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"><option value="aset">Aset</option><option value="kewajiban">Kewajiban</option><option value="modal">Modal</option><option value="pendapatan">Pendapatan</option><option value="beban">Beban</option></select></div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Saldo Normal</label><select id="af-sn" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"><option value="D">Debit</option><option value="K">Kredit</option></select></div></div>
            <div class="flex justify-end gap-3 pt-4 border-t"><button type="button" onclick="App.closeModal()" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm">Batal</button><button type="submit" class="px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium">Simpan</button></div></form></div>`);
        if (id) App.api('keuangan/akun/' + id).then(r => { if (r?.data) { document.getElementById('af-kode').value = r.data.kode; document.getElementById('af-nama').value = r.data.nama; document.getElementById('af-tipe').value = r.data.tipe; document.getElementById('af-sn').value = r.data.saldo_normal; } });
        document.getElementById('akun-form').onsubmit = async e => { e.preventDefault(); const fid = document.getElementById('af-id').value; const body = { kode: document.getElementById('af-kode').value, nama: document.getElementById('af-nama').value, tipe: document.getElementById('af-tipe').value, saldo_normal: document.getElementById('af-sn').value }; const endpoint = fid ? `keuangan/akun/${fid}` : 'keuangan/akun'; const r = await App.api(endpoint, { method: fid ? 'PUT' : 'POST', body }); if (r?.success) { App.closeModal(); App.toast(r.message, 'success'); this.render(document.getElementById('app-content')); } else App.toast(r?.message || 'Gagal', 'error'); };
    },
    async del(id, name) { const ok = await App.confirm('Hapus Akun', `Yakin ingin menghapus akun "${name}"?`); if (!ok) return; const r = await App.api(`keuangan/akun/${id}`, { method: 'DELETE' }); if (r?.success) { App.toast(r.message, 'success'); this.render(document.getElementById('app-content')); } else App.toast(r?.message || 'Gagal', 'error'); }
};
window.AkunPage = AkunPage;
export default AkunPage;
