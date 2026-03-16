// Users Page
const UsersPage = {
    async render(container) {
        App.setTitle('Manajemen User', 'Kelola akun pengguna');
        this.container = container;
        this.loadList(container);
    },
    async loadList(container, page = 1) {
        const search = document.getElementById('usr-search')?.value || '';
        const res = await App.api(`users?page=${page}&search=${encodeURIComponent(search)}`);
        if (!res?.success) return;
        const roles = await App.api('roles');
        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div class="relative flex-1 max-w-md"><i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input type="text" id="usr-search" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder="Cari user..." value="${search}" onkeyup="if(event.key==='Enter')UsersPage.loadList(UsersPage.container)"></div>
                ${App.hasPerm('user.create') ? '<button onclick="UsersPage.form()" class="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2"><i class="ri-add-line"></i> Tambah User</button>' : ''}
            </div>
            <div class="table-wrapper"><table class="data-table w-full text-sm">
                <thead><tr class="bg-gray-50"><th class="px-4 py-3 text-left font-medium text-gray-500">Username</th><th class="px-4 py-3 text-left font-medium text-gray-500">Nama</th><th class="px-4 py-3 text-left font-medium text-gray-500">Role</th><th class="px-4 py-3 text-center font-medium text-gray-500">Status</th><th class="px-4 py-3 text-left font-medium text-gray-500">Login Terakhir</th><th class="px-4 py-3 text-center font-medium text-gray-500">Aksi</th></tr></thead>
                <tbody>${res.data.map(u => `<tr class="border-t border-gray-50">
                    <td class="px-4 py-3 font-mono text-sm">${u.username}</td><td class="px-4 py-3 font-medium">${u.nama_lengkap}</td>
                    <td class="px-4 py-3"><span class="badge badge-info">${u.role_nama}</span></td>
                    <td class="px-4 py-3 text-center">${u.is_active ? '<span class="badge badge-success">Aktif</span>' : '<span class="badge badge-danger">Nonaktif</span>'}</td>
                    <td class="px-4 py-3 text-gray-500 text-sm">${u.last_login ? App.formatDate(u.last_login) : '-'}</td>
                    <td class="px-4 py-3 text-center"><div class="flex justify-center gap-1">
                        ${App.hasPerm('user.edit') ? `<button onclick="UsersPage.form(${u.id})" class="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500"><i class="ri-edit-line"></i></button>` : ''}
                        ${App.hasPerm('user.delete') && u.id != 1 ? `<button onclick="UsersPage.del(${u.id},'${u.username}')" class="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><i class="ri-delete-bin-line"></i></button>` : ''}
                    </div></td></tr>`).join('')}</tbody></table></div></div>`;
        this._roles = roles?.data || [];
    },
    form(id = null) {
        const title = id ? 'Edit User' : 'Tambah User';
        App.openModal(`<div class="p-6"><h3 class="text-lg font-bold text-gray-800 mb-6">${title}</h3>
        <form id="usr-form" class="space-y-4">
            <input type="hidden" id="uf-id" value="${id || ''}">
            <div class="grid grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Username *</label><input type="text" id="uf-username" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" required ${id ? 'readonly' : ''}></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1">${id ? 'Password (kosongkan jika tidak diubah)' : 'Password *'}</label><input type="password" id="uf-password" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" ${id ? '' : 'required'}></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Nama Lengkap *</label><input type="text" id="uf-nama" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" required></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Email</label><input type="email" id="uf-email" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Role *</label><select id="uf-role" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm">${(this._roles || []).map(r => `<option value="${r.id}">${r.nama}</option>`).join('')}</select></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Status</label><select id="uf-active" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"><option value="1">Aktif</option><option value="0">Nonaktif</option></select></div>
            </div>
            <div class="flex justify-end gap-3 pt-4 border-t"><button type="button" onclick="App.closeModal()" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm">Batal</button><button type="submit" class="px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium">Simpan</button></div>
        </form></div>`);
        if (id) this.loadForm(id);
        document.getElementById('usr-form').onsubmit = e => { e.preventDefault(); this.save(); };
    },
    async loadForm(id) { const r = await App.api('users/' + id); if (!r?.success) return; const u = r.data; document.getElementById('uf-username').value = u.username; document.getElementById('uf-nama').value = u.nama_lengkap; document.getElementById('uf-email').value = u.email || ''; document.getElementById('uf-role').value = u.role_id; document.getElementById('uf-active').value = u.is_active; },
    async save() { const id = document.getElementById('uf-id').value; const body = { username: document.getElementById('uf-username').value, nama_lengkap: document.getElementById('uf-nama').value, email: document.getElementById('uf-email').value, role_id: document.getElementById('uf-role').value, is_active: document.getElementById('uf-active').value }; const pw = document.getElementById('uf-password').value; if (pw) body.password = pw; const r = await App.api(id ? `users/${id}` : 'users', { method: id ? 'PUT' : 'POST', body }); if (r?.success) { App.closeModal(); App.toast(r.message, 'success'); this.loadList(this.container); } else App.toast(r?.message || 'Gagal', 'error'); },
    async del(id, name) { const ok = await App.confirm('Hapus User', `Yakin ingin menghapus user "${name}"?`); if (!ok) return; const r = await App.api(`users/${id}`, { method: 'DELETE' }); if (r?.success) { App.toast(r.message, 'success'); this.loadList(this.container); } else App.toast(r?.message || 'Gagal', 'error'); }
};
window.UsersPage = UsersPage;
export default UsersPage;
