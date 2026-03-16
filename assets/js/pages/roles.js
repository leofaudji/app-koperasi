// Roles Page - Menu-based Permission Management
const RolesPage = {
    _menus: [],
    _perms: [],

    async render(container) {
        App.setTitle('Manajemen Role', 'Kelola peran dan hak akses menu');
        const res = await App.api('roles');
        if (!res?.success) return;

        container.innerHTML = `<div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex justify-between mb-6">
                <h3 class="font-semibold text-gray-800 text-lg">Daftar Role</h3>
                ${App.hasPerm('role.manage') ? '<button onclick="RolesPage.form()" class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition"><i class="ri-add-line"></i> Tambah Role</button>' : ''}
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${res.data.map(r => `<div class="border border-gray-100 rounded-xl p-5 hover:shadow-md transition group">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <h4 class="font-bold text-gray-800">${r.nama}</h4>
                            <p class="text-xs text-gray-400 mt-0.5">${r.keterangan || 'Tidak ada keterangan'}</p>
                        </div>
                        <span class="badge badge-info">${r.user_count} user</span>
                    </div>
                    <div class="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                        ${r.id <= 3 ? '' : `${App.hasPerm('role.manage') ? `
                            <button onclick="RolesPage.form(${r.id})" class="text-amber-500 hover:bg-amber-50 px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1"><i class="ri-edit-line"></i> Edit</button>
                            <button onclick="RolesPage.del(${r.id},'${r.nama}')" class="text-red-400 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1"><i class="ri-delete-bin-line"></i> Hapus</button>` : ''}`}
                        <button onclick="RolesPage.viewPerms(${r.id})" class="text-primary-500 hover:bg-primary-50 px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ml-auto"><i class="ri-shield-check-line"></i> Lihat Akses</button>
                    </div>
                </div>`).join('')}
            </div>
        </div>`;
    },

    async viewPerms(id) {
        const r = await App.api('roles/' + id);
        if (!r?.success) return;
        const menuData = await App.api('roles/menus');
        const perms = r.data.permissions || [];
        const permIds = perms.map(p => p.id);
        const menus = menuData?.data || [];

        let html = `<div class="p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-4"><i class="ri-shield-check-line text-primary-500 mr-2"></i>Hak Akses: ${r.data.nama}</h3>
            <div class="space-y-2 max-h-[60vh] overflow-auto">`;

        menus.forEach(m => {
            const hasAccess = m.permission_id && permIds.includes(m.permission_id);
            const childMenus = menus.filter(c => c.parent_id === m.id);

            if (m.parent_id) return; // skip children, handled in parent

            html += `<div class="border border-gray-100 rounded-lg overflow-hidden">
                <div class="flex items-center gap-3 px-4 py-3 bg-gray-50">
                    <i class="${m.icon} text-gray-500"></i>
                    <span class="font-medium text-gray-700">${m.nama}</span>
                    ${!m.permission_id ? '' : (hasAccess ? '<span class="ml-auto badge badge-success text-xs">Aktif</span>' : '<span class="ml-auto badge badge-danger text-xs">Tidak</span>')}
                </div>`;

            if (childMenus.length > 0) {
                html += '<div class="divide-y divide-gray-50">';
                childMenus.forEach(c => {
                    const cAccess = c.permission_id && permIds.includes(c.permission_id);
                    html += `<div class="flex items-center gap-3 px-4 py-2.5 pl-10">
                        <i class="${c.icon} text-gray-400 text-sm"></i>
                        <span class="text-sm text-gray-600">${c.nama}</span>
                        ${!c.permission_id ? '' : (cAccess ? '<span class="ml-auto badge badge-success text-xs">Aktif</span>' : '<span class="ml-auto badge badge-danger text-xs">Tidak</span>')}
                    </div>`;
                });
                html += '</div>';
            }
            html += '</div>';
        });

        html += `</div>
            <div class="mt-4 text-right"><button onclick="App.closeModal()" class="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm font-medium transition">Tutup</button></div>
        </div>`;
        App.openModal(html);
    },

    async form(id = null) {
        // Fetch all menus and permissions
        const menuData = await App.api('roles/menus');
        const allMenus = menuData?.data || [];

        this._menus = allMenus;

        // Build the menu tree checkbox form
        const parentMenus = allMenus.filter(m => !m.parent_id);

        let menuHtml = '';
        parentMenus.forEach(parent => {
            const children = allMenus.filter(c => c.parent_id === parent.id);

            menuHtml += `<div class="border border-gray-100 rounded-xl overflow-hidden">
                <div class="flex items-center gap-3 px-4 py-3 bg-gray-50/80 cursor-pointer hover:bg-gray-100 transition" onclick="RolesPage.toggleMenuGroup(${parent.id})">
                    <input type="checkbox" class="rf-menu rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                        data-menu-id="${parent.id}" data-permission-id="${parent.permission_id || ''}"
                        ${parent.permission_id ? '' : 'data-parent-only="true"'}
                        onchange="RolesPage.onParentCheck(this, ${parent.id})"
                        onclick="event.stopPropagation()">
                    <i class="${parent.icon} text-gray-500"></i>
                    <span class="font-medium text-gray-700 text-sm">${parent.nama}</span>
                    ${children.length > 0 ? `<i class="ri-arrow-down-s-line ml-auto text-gray-400 menu-group-arrow-${parent.id} transition-transform"></i>` : ''}
                </div>`;

            if (children.length > 0) {
                menuHtml += `<div id="menu-group-${parent.id}" class="hidden divide-y divide-gray-50 bg-white">`;
                children.forEach(child => {
                    menuHtml += `<label class="flex items-center gap-3 px-4 py-2.5 pl-12 hover:bg-gray-50 transition cursor-pointer">
                        <input type="checkbox" class="rf-menu rf-child-${parent.id} rounded text-primary-600 focus:ring-primary-500"
                            data-menu-id="${child.id}" data-permission-id="${child.permission_id || ''}" data-parent-id="${parent.id}"
                            onchange="RolesPage.onChildCheck(${parent.id})">
                        <i class="${child.icon} text-gray-400 text-sm"></i>
                        <span class="text-sm text-gray-600">${child.nama}</span>
                    </label>`;
                });
                menuHtml += '</div>';
            }
            menuHtml += '</div>';
        });

        App.openModal(`<div class="p-6">
            <h3 class="text-lg font-bold text-gray-800 mb-6"><i class="ri-shield-star-line text-primary-500 mr-2"></i>${id ? 'Edit' : 'Tambah'} Role</h3>
            <form id="role-form" class="space-y-5">
                <input type="hidden" id="rf-id" value="${id || ''}">
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-sm font-medium text-gray-600 mb-1">Nama Role *</label>
                    <input type="text" id="rf-nama" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" required></div>
                    <div><label class="block text-sm font-medium text-gray-600 mb-1">Keterangan</label>
                    <input type="text" id="rf-ket" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"></div>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-3">
                        <label class="block text-sm font-semibold text-gray-700">Akses Menu</label>
                        <div class="flex gap-2">
                            <button type="button" onclick="RolesPage.checkAll(true)" class="text-xs text-primary-600 hover:text-primary-700 font-medium">Pilih Semua</button>
                            <span class="text-gray-300">|</span>
                            <button type="button" onclick="RolesPage.checkAll(false)" class="text-xs text-gray-500 hover:text-gray-700 font-medium">Hapus Semua</button>
                        </div>
                    </div>
                    <div class="space-y-2 max-h-[50vh] overflow-auto rounded-xl border border-gray-100 p-3 bg-gray-50/30">
                        ${menuHtml}
                    </div>
                </div>
                <div class="flex justify-end gap-3 pt-4 border-t">
                    <button type="button" onclick="App.closeModal()" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 transition">Batal</button>
                    <button type="submit" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition">Simpan</button>
                </div>
            </form>
        </div>`);

        if (id) await this.loadRoleForm(id);
        document.getElementById('role-form').onsubmit = e => { e.preventDefault(); this.save(); };
    },

    toggleMenuGroup(parentId) {
        const group = document.getElementById('menu-group-' + parentId);
        const arrow = document.querySelector('.menu-group-arrow-' + parentId);
        if (group) {
            group.classList.toggle('hidden');
            if (arrow) arrow.style.transform = group.classList.contains('hidden') ? '' : 'rotate(180deg)';
        }
    },

    onParentCheck(cb, parentId) {
        const checked = cb.checked;
        document.querySelectorAll(`.rf-child-${parentId}`).forEach(child => { child.checked = checked; });
        // Open group when checking
        if (checked) {
            const group = document.getElementById('menu-group-' + parentId);
            if (group) group.classList.remove('hidden');
        }
    },

    onChildCheck(parentId) {
        const children = document.querySelectorAll(`.rf-child-${parentId}`);
        const anyChecked = [...children].some(c => c.checked);
        const parentCb = document.querySelector(`.rf-menu[data-menu-id="${parentId}"]`);
        if (parentCb) {
            parentCb.checked = anyChecked;
            parentCb.indeterminate = anyChecked && ![...children].every(c => c.checked);
        }
    },

    checkAll(checked) {
        document.querySelectorAll('.rf-menu').forEach(cb => { cb.checked = checked; cb.indeterminate = false; });
    },

    async loadRoleForm(id) {
        const r = await App.api('roles/' + id);
        if (!r?.success) return;
        document.getElementById('rf-nama').value = r.data.nama;
        document.getElementById('rf-ket').value = r.data.keterangan || '';

        const permIds = (r.data.permissions || []).map(p => p.id);

        // Check menus that have matching permissions
        document.querySelectorAll('.rf-menu').forEach(cb => {
            const permId = parseInt(cb.dataset.permissionId);
            if (permId && permIds.includes(permId)) {
                cb.checked = true;
            }
        });

        // Update parent indeterminate states
        const parentMenus = this._menus.filter(m => !m.parent_id);
        parentMenus.forEach(p => {
            const children = document.querySelectorAll(`.rf-child-${p.id}`);
            if (children.length > 0) {
                const anyChecked = [...children].some(c => c.checked);
                const allChecked = [...children].every(c => c.checked);
                const parentCb = document.querySelector(`.rf-menu[data-menu-id="${p.id}"]`);
                if (parentCb) {
                    parentCb.checked = anyChecked;
                    parentCb.indeterminate = anyChecked && !allChecked;
                }
                // Open group if any checked
                if (anyChecked) {
                    const group = document.getElementById('menu-group-' + p.id);
                    if (group) group.classList.remove('hidden');
                }
            }
        });
    },

    async save() {
        const id = document.getElementById('rf-id').value;
        const permissions = [];

        // Collect permission IDs from checked checkboxes
        document.querySelectorAll('.rf-menu:checked').forEach(cb => {
            const permId = parseInt(cb.dataset.permissionId);
            if (permId) permissions.push(permId);
        });

        const body = {
            nama: document.getElementById('rf-nama').value,
            keterangan: document.getElementById('rf-ket').value,
            permissions
        };

        const r = await App.api(id ? `roles/${id}` : 'roles', { method: id ? 'PUT' : 'POST', body });
        if (r?.success) {
            App.closeModal();
            App.toast(r.message, 'success');
            this.render(document.getElementById('app-content'));
        } else {
            App.toast(r?.message || 'Gagal', 'error');
        }
    },

    async del(id, name) {
        const ok = await App.confirm('Hapus Role', `Yakin ingin menghapus role "${name}"?`);
        if (!ok) return;
        const r = await App.api(`roles/${id}`, { method: 'DELETE' });
        if (r?.success) {
            App.toast(r.message, 'success');
            this.render(document.getElementById('app-content'));
        } else {
            App.toast(r?.message || 'Gagal', 'error');
        }
    }
};
window.RolesPage = RolesPage;
export default RolesPage;
