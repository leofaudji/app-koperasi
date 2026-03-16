const Pengumuman = {
    render: async function (container) {
        App.setTitle('Pengumuman', 'Kelola broadcast & notifikasi portal anggota');

        container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
                <!-- Toolbar -->
                <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div class="flex items-center gap-2 flex-1 w-full sm:w-auto">
                        <div class="relative flex-1 max-w-md">
                            <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" id="search" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Cari judul/konten...">
                        </div>
                        <select id="filter_tipe" class="w-auto border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none">
                            <option value="">Semua Tipe</option>
                            <option value="info">Info</option>
                            <option value="warning">Warning</option>
                            <option value="promo">Promo</option>
                        </select>
                        <button id="btn-search" class="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2.5 rounded-xl">
                            <i class="ri-search-line"></i>
                        </button>
                    </div>
                    <div class="flex items-center gap-2">
                        ${App.hasPerm('pengumuman.create') ? `
                        <button id="btn-add" class="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary-500/25 transition-all">
                            <i class="ri-add-line"></i> Buat Pengumuman
                        </button>
                        ` : ''}
                    </div>
                </div>

                <!-- Table -->
                <div class="table-wrapper">
                    <table class="data-table w-full text-sm">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="px-4 py-3 text-center font-medium text-gray-500 w-12">No</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-500">Judul</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-500">Tipe</th>
                                <th class="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-500">Dibuat Pada</th>
                                <th class="px-4 py-3 text-center font-medium text-gray-500">Aksi</th>
                            </tr>
                        </thead>
                        <tbody id="data-body">
                            <tr><td colspan="6" class="text-center py-4">Memuat data...</td></tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div id="pagination" class="mt-4"></div>
            </div>
        `;

        this.bindEvents();
        await this.loadData(1);
    },

    bindEvents: function () {
        document.getElementById('btn-search')?.addEventListener('click', () => this.loadData(1));
        document.getElementById('search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.loadData(1);
        });
        document.getElementById('btn-add')?.addEventListener('click', () => this.showModal());
    },

    loadData: async function (page = 1) {
        const search = document.getElementById('search')?.value || '';
        const tipe = document.getElementById('filter_tipe')?.value || '';

        const tbody = document.getElementById('data-body');
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></td></tr>`;

        const res = await App.api(`pengumuman?page=${page}&per_page=10&search=${encodeURIComponent(search)}&tipe=${tipe}`);
        if (!res || !res.success) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-red-500">Gagal memuat data</td></tr>`;
            return;
        }

        const data = res.data;
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-gray-500">Belum ada data pengumuman.</td></tr>`;
            document.getElementById('pagination').innerHTML = '';
            return;
        }

        let html = '';
        data.forEach((row, idx) => {
            const no = ((res.pagination.page - 1) * res.pagination.per_page) + idx + 1;

            const tipeLabel = {
                'info': '<span class="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700"><i class="ri-information-line mr-1"></i>Info</span>',
                'warning': '<span class="px-2.5 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700"><i class="ri-alert-line mr-1"></i>Warning</span>',
                'promo': '<span class="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700"><i class="ri-price-tag-3-line mr-1"></i>Promo</span>'
            }[row.tipe] || '-';

            const statusLabel = row.is_active
                ? '<span class="px-2.5 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-700">Aktif</span>'
                : '<span class="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Nonaktif</span>';

            html += `
                <tr class="border-t border-gray-50 hover:bg-gray-50/50">
                    <td class="px-4 py-3 text-center font-mono text-xs text-primary-600">${no}</td>
                    <td class="px-4 py-3">
                        <div class="font-medium text-gray-800">${row.judul}</div>
                        <div class="text-xs text-gray-500 truncate max-w-xs mt-0.5">${row.konten}</div>
                    </td>
                    <td class="px-4 py-3">${tipeLabel}</td>
                    <td class="px-4 py-3 text-center">${statusLabel}</td>
                    <td class="px-4 py-3 text-sm text-gray-500">${App.formatDate(row.created_at)}</td>
                    <td class="px-4 py-3 text-center">
                        <div class="flex items-center justify-center gap-1">
                            ${App.hasPerm('pengumuman.update') ? `
                                <button onclick="Pengumuman.showModal(${row.id})" class="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500" title="Edit">
                                    <i class="ri-edit-line"></i>
                                </button>
                            ` : ''}
                            ${App.hasPerm('pengumuman.delete') ? `
                                <button onclick="Pengumuman.delete(${row.id})" class="p-1.5 hover:bg-red-50 rounded-lg text-red-400" title="Hapus">
                                    <i class="ri-delete-bin-line"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        document.getElementById('pagination').innerHTML = App.renderPagination(res.pagination, 'Pengumuman.loadData');
    },

    showModal: async function (id = null) {
        let title = 'Buat Pengumuman Baru';
        let row = { judul: '', konten: '', tipe: 'info', is_active: 1 };

        if (id) {
            title = 'Edit Pengumuman';
            const res = await App.api(`pengumuman/${id}`);
            if (res && res.success) {
                row = res.data;
            } else {
                return;
            }
        }

        const html = `
            <div class="p-6">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="text-lg font-bold text-gray-800">${title}</h3>
                    <button onclick="App.closeModal()" class="text-gray-400 hover:text-gray-600 transition-colors"><i class="ri-close-line text-2xl"></i></button>
                </div>
                <form id="form-pengumuman" onsubmit="Pengumuman.save(event, ${id})">
                    <div class="space-y-4">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Judul Pengumuman</label>
                            <input type="text" id="f_judul" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all" value="${row.judul}" required autofocus>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Isi Pesan / Konten</label>
                            <textarea id="f_konten" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none h-32 resize-none transition-all" required placeholder="Tulis pesan pengumuman di sini...">${row.konten}</textarea>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Tipe Pesan</label>
                                <select id="f_tipe" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all">
                                    <option value="info" ${row.tipe === 'info' ? 'selected' : ''}>ℹ️ Info (Biru)</option>
                                    <option value="warning" ${row.tipe === 'warning' ? 'selected' : ''}>⚠️ Warning (Kuning)</option>
                                    <option value="promo" ${row.tipe === 'promo' ? 'selected' : ''}>🏷️ Promo (Hijau)</option>
                                </select>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-1">Status Penayangan</label>
                                <select id="f_is_active" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all">
                                    <option value="1" ${row.is_active == 1 ? 'selected' : ''}>Aktif (Tampil di Portal)</option>
                                    <option value="0" ${row.is_active == 0 ? 'selected' : ''}>Nonaktif (Sembunyikan)</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="mt-8 flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onclick="App.closeModal()" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition-colors">Batal</button>
                        <button type="submit" class="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary-500/25 transition-all" id="btn-save">
                            <i class="ri-save-3-line"></i> Simpan
                        </button>
                    </div>
                </form>
            </div>
        `;

        App.openModal(html);
    },

    save: async function (e, id) {
        e.preventDefault();
        const btn = document.getElementById('btn-save');
        const origText = btn.innerHTML;
        btn.innerHTML = '<i class="ri-loader-4-line animate-spin"></i> Menyimpan...';
        btn.disabled = true;

        const payload = {
            judul: document.getElementById('f_judul').value,
            konten: document.getElementById('f_konten').value,
            tipe: document.getElementById('f_tipe').value,
            is_active: document.getElementById('f_is_active').value
        };

        const endpoint = id ? `pengumuman/${id}` : 'pengumuman';
        const method = id ? 'PUT' : 'POST';

        const res = await App.api(endpoint, { method, body: payload });

        if (res && res.success) {
            App.closeModal();
            App.swalSuccess('Berhasil', res.message);
            this.loadData();
        }

        btn.disabled = false;
        btn.innerHTML = origText;
    },

    delete: async function (id) {
        const ok = await App.confirm('Hapus Pengumuman', 'Apakah Anda yakin ingin menghapus data pengumuman ini secara permanen?');
        if (!ok) return;

        const res = await App.api(`pengumuman/${id}`, { method: 'DELETE' });
        if (res && res.success) {
            App.toast('Pengumuman berhasil dihapus', 'success');
            this.loadData();
        }
    }
};

window.Pengumuman = Pengumuman;
export default Pengumuman;
