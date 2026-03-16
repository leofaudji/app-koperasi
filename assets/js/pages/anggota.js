// Anggota Page
const AnggotaPage = {
    page: 1,
    async render(container, id) {
        App.setTitle('Data Anggota', 'Kelola data anggota koperasi');
        if (id) return this.detail(container, id);
        this.page = 1;
        this.loadList(container);
    },

    async loadList(container, page = 1) {
        this.page = page;
        const search = document.getElementById('anggota-search')?.value || '';
        const status = document.getElementById('anggota-status')?.value || '';
        const res = await App.api(`anggota?page=${page}&search=${encodeURIComponent(search)}&status=${status}`);
        if (!res?.success) return;

        const html = `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div class="flex items-center gap-2 flex-1 w-full sm:w-auto">
                    <div class="relative flex-1 max-w-md"><i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                    <input type="text" id="anggota-search" class="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Cari anggota..." value="${search}" onkeyup="if(event.key==='Enter')AnggotaPage.loadList(document.getElementById('app-content'))"></div>
                    
                    <select id="anggota-status" onchange="AnggotaPage.loadList(document.getElementById('app-content'))" class="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all">
                        <option value="">Semua Status</option>
                        <option value="aktif" ${status === 'aktif' ? 'selected' : ''}>Aktif</option>
                        <option value="nonaktif" ${status === 'nonaktif' ? 'selected' : ''}>Nonaktif</option>
                        <option value="keluar" ${status === 'keluar' ? 'selected' : ''}>Keluar</option>
                    </select>

                    <button onclick="AnggotaPage.loadList(document.getElementById('app-content'))" class="bg-gray-100 hover:bg-gray-200 text-gray-600 p-2.5 rounded-xl mr-2"><i class="ri-refresh-line"></i></button>

                    <button onclick="AnggotaPage.export('pdf')" class="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Export PDF">
                        <i class="ri-file-pdf-line text-xl"></i>
                    </button>
                    <button onclick="AnggotaPage.export('csv')" class="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Export CSV">
                        <i class="ri-file-excel-line text-xl"></i>
                    </button>
                </div>
                <div class="flex items-center gap-2">
                    ${App.hasPerm('anggota.create') ? `
                        <button onclick="AnggotaPage.importForm()" class="bg-white border border-gray-200 hover:border-primary-500 hover:text-primary-600 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition-all"><i class="ri-file-upload-line"></i> Import CSV</button>
                        <button onclick="AnggotaPage.form()" class="bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary-500/25 transition-all"><i class="ri-add-line"></i> Tambah Anggota</button>
                    ` : ''}
                </div>
            </div>
            <div class="table-wrapper">
                <table class="data-table w-full text-sm">
                    <thead><tr class="bg-gray-50"><th class="px-4 py-3 text-left font-medium text-gray-500">No. Anggota</th><th class="px-4 py-3 text-left font-medium text-gray-500">Nama</th><th class="px-4 py-3 text-left font-medium text-gray-500">Telepon</th><th class="px-4 py-3 text-left font-medium text-gray-500">Tgl Daftar</th><th class="px-4 py-3 text-center font-medium text-gray-500">Status</th><th class="px-4 py-3 text-center font-medium text-gray-500">Aksi</th></tr></thead>
                    <tbody>${res.data.map(a => `<tr class="border-t border-gray-50">
                        <td class="px-4 py-3 font-mono text-xs text-primary-600">${a.no_anggota}</td>
                        <td class="px-4 py-3 font-medium">${a.nama}</td>
                        <td class="px-4 py-3 text-gray-500">${a.telepon || '-'}</td>
                        <td class="px-4 py-3 text-gray-500">${App.formatDate(a.tgl_daftar)}</td>
                        <td class="px-4 py-3 text-center">${App.statusBadge(a.status)}</td>
                        <td class="px-4 py-3 text-center"><div class="flex justify-center gap-1">
                            <a href="#/anggota/${a.id}" class="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500" title="Detail"><i class="ri-eye-line"></i></a>
                            ${App.hasPerm('anggota.edit') ? `<button onclick="AnggotaPage.form(${a.id})" class="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500" title="Edit"><i class="ri-edit-line"></i></button>` : ''}
                            ${App.hasPerm('anggota.delete') ? `<button onclick="AnggotaPage.del(${a.id},'${a.nama}')" class="p-1.5 hover:bg-red-50 rounded-lg text-red-400" title="Hapus"><i class="ri-delete-bin-line"></i></button>` : ''}
                        </div></td></tr>`).join('')}
                    ${res.data.length === 0 ? '<tr><td colspan="6" class="text-center py-8 text-gray-400">Tidak ada data</td></tr>' : ''}</tbody>
                </table>
            </div>
            ${App.renderPagination(res.pagination, 'AnggotaPage.paginate')}
        </div>`;
        container.innerHTML = html;
    },

    async detail(container, id) {
        const res = await App.api('anggota/' + id);
        if (!res?.success) { container.innerHTML = '<p class="text-center text-gray-400 py-10">Anggota tidak ditemukan</p>'; return; }
        const a = res.data;
        container.innerHTML = `
        <div class="mb-4"><a href="#/anggota" class="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"><i class="ri-arrow-left-line"></i> Kembali</a></div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
                <div class="text-center mb-4">
                    <div class="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3">${a.nama.charAt(0)}</div>
                    <h3 class="font-bold text-lg text-gray-800">${a.nama}</h3>
                    <p class="text-primary-600 font-mono text-sm">${a.no_anggota}</p>
                    ${App.statusBadge(a.status)}
                </div>
                <div class="space-y-3 text-sm border-t border-gray-100 pt-4">
                    <div class="flex justify-between"><span class="text-gray-400">No. Anggota Lama</span><span class="font-medium font-mono text-xs">${a.no_anggota_lama || '-'}</span></div>
                    <div class="flex justify-between"><span class="text-gray-400">NIK</span><span class="font-medium">${a.nik || '-'}</span></div>
                    <div class="flex justify-between"><span class="text-gray-400">Telepon</span><span class="font-medium">${a.telepon || '-'}</span></div>
                    <div class="flex justify-between"><span class="text-gray-400">Email</span><span class="font-medium">${a.email || '-'}</span></div>
                    <div class="flex justify-between"><span class="text-gray-400">Pekerjaan</span><span class="font-medium">${a.pekerjaan || '-'}</span></div>
                    <div class="flex justify-between"><span class="text-gray-400">Tgl Daftar</span><span class="font-medium">${App.formatDate(a.tgl_daftar)}</span></div>
                    <div class="flex justify-between"><span class="text-gray-400">Alamat</span><span class="font-medium text-right max-w-[200px]">${a.alamat || '-'}</span></div>
                </div>
            </div>
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slideUp">
                    <h4 class="font-semibold text-gray-800 mb-4"><i class="ri-wallet-3-line text-primary-500 mr-2"></i>Saldo Simpanan</h4>
                    <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        ${(a.saldo_simpanan || []).map(s => `<div class="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 text-center">
                            <p class="text-xs text-gray-500 mb-1">${s.nama}</p>
                            <p class="text-lg font-bold text-gray-800">${App.formatRupiah(s.saldo)}</p>
                        </div>`).join('')}
                    </div>
                </div>
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slideUp" style="animation-delay:0.1s">
                    <div class="flex justify-between items-center mb-4">
                        <h4 class="font-semibold text-gray-800"><i class="ri-hand-coin-line text-amber-500 mr-2"></i>Pinjaman Aktif</h4>
                    </div>
                    ${(a.pinjaman_aktif || []).length ? a.pinjaman_aktif.map(p => `<div class="bg-amber-50 rounded-xl p-4 flex justify-between items-center">
                        <div><p class="font-medium text-gray-800">${p.no_pinjaman}</p><p class="text-xs text-gray-500">${p.jenis_pinjaman}</p></div>
                        <div class="text-right"><p class="font-bold text-amber-600">${App.formatRupiah(p.sisa_pinjaman)}</p><p class="text-xs text-gray-400">sisa pinjaman</p></div>
                    </div>`).join('') : '<p class="text-gray-400 text-sm text-center py-4">Tidak ada pinjaman aktif</p>'}
                </div>
                <div class="flex gap-3">
                    <a href="#/mutasi-simpanan?anggota_id=${a.id}" class="flex-1 bg-primary-50 hover:bg-primary-100 text-primary-700 py-3 rounded-xl text-center text-sm font-medium transition"><i class="ri-file-list-3-line mr-1"></i> Mutasi Simpanan</a>
                    <a href="#/simpanan?anggota_id=${a.id}" class="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-3 rounded-xl text-center text-sm font-medium transition"><i class="ri-add-circle-line mr-1"></i> Transaksi Simpanan</a>
                </div>
            </div>
        </div>`;
    },

    form(id = null) {
        const title = id ? 'Edit Anggota' : 'Tambah Anggota';
        const formHtml = `<div class="p-6"><h3 class="text-lg font-bold text-gray-800 mb-6">${title}</h3>
        <form id="anggota-form" class="space-y-4">
            <input type="hidden" id="f-id" value="${id || ''}">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Nama Lengkap *</label><input type="text" id="f-nama" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" required></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1">NIK</label><input type="text" id="f-nik" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" maxlength="16"></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Tempat Lahir</label><input type="text" id="f-tempat-lahir" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500"></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Tanggal Lahir *</label><input type="text" id="f-tgl-lahir" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" placeholder="Pilih tanggal..." required></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Jenis Kelamin</label><select id="f-jk" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500"><option value="L">Laki-laki</option><option value="P">Perempuan</option></select></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Telepon</label><input type="text" id="f-telepon" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500"></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Email</label><input type="email" id="f-email" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500"></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Pekerjaan</label><input type="text" id="f-pekerjaan" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500"></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Penghasilan per Bulan (Rp)</label><input type="number" id="f-penghasilan" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" value="0"></div>
                <div><label class="block text-sm font-medium text-gray-600 mb-1">Tgl Daftar</label><input type="text" id="f-tgl" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" placeholder="Tgl Daftar"></div>
                ${id ? `<div><label class="block text-sm font-medium text-gray-600 mb-1">Status</label><select id="f-status" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option><option value="keluar">Keluar</option></select></div>` : ''}
            </div>
            <div><label class="block text-sm font-medium text-gray-600 mb-1">Alamat</label><textarea id="f-alamat" rows="2" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500"></textarea></div>
            <div class="flex justify-end gap-3 pt-4 border-t"><button type="button" onclick="App.closeModal()" class="px-5 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50">Batal</button><button type="submit" class="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium">Simpan</button></div>
        </form></div>`;
        App.openModal(formHtml);
        App.datepicker('#f-tgl', { defaultDate: 'today' });
        App.datepicker('#f-tgl-lahir');
        if (id) this.loadForm(id);
        document.getElementById('anggota-form').onsubmit = e => { e.preventDefault(); this.save(); };
    },

    async loadForm(id) {
        const res = await App.api('anggota/' + id);
        if (!res?.success) return;
        const a = res.data;
        document.getElementById('f-nama').value = a.nama;
        document.getElementById('f-nik').value = a.nik || '';
        document.getElementById('f-tempat-lahir').value = a.tempat_lahir || '';
        const fpLahir = document.getElementById('f-tgl-lahir')._flatpickr;
        if (fpLahir) fpLahir.setDate(a.tanggal_lahir, true); else document.getElementById('f-tgl-lahir').value = a.tanggal_lahir || '';
        document.getElementById('f-jk').value = a.jenis_kelamin;
        document.getElementById('f-telepon').value = a.telepon || '';
        document.getElementById('f-email').value = a.email || '';
        document.getElementById('f-pekerjaan').value = a.pekerjaan || '';
        document.getElementById('f-penghasilan').value = a.penghasilan_bulanan || '';
        const fp = document.getElementById('f-tgl')._flatpickr;
        if (fp) fp.setDate(a.tgl_daftar, true); else document.getElementById('f-tgl').value = a.tgl_daftar;
        document.getElementById('f-alamat').value = a.alamat || '';
        if (document.getElementById('f-status')) document.getElementById('f-status').value = a.status;
    },

    async save() {
        const id = document.getElementById('f-id').value;
        const body = {
            nama: document.getElementById('f-nama').value,
            nik: document.getElementById('f-nik').value,
            tempat_lahir: document.getElementById('f-tempat-lahir').value,
            tanggal_lahir: App.dateToISO(document.getElementById('f-tgl-lahir').value),
            jenis_kelamin: document.getElementById('f-jk').value,
            telepon: document.getElementById('f-telepon').value,
            email: document.getElementById('f-email').value,
            pekerjaan: document.getElementById('f-pekerjaan').value,
            penghasilan_bulanan: document.getElementById('f-penghasilan').value,
            tgl_daftar: App.dateToISO(document.getElementById('f-tgl').value),
            alamat: document.getElementById('f-alamat').value
        };
        if (id) body.status = document.getElementById('f-status')?.value || 'aktif';
        const res = await App.api(id ? `anggota/${id}` : 'anggota', { method: id ? 'PUT' : 'POST', body });
        if (res?.success) { App.closeModal(); App.toast(res.message, 'success'); this.loadList(document.getElementById('app-content'), this.page); }
        else App.toast(res?.message || 'Gagal menyimpan', 'error');
    },

    async del(id, nama) {
        const ok = await App.confirm('Hapus Anggota', `Yakin ingin menghapus anggota "${nama}"?`);
        if (!ok) return;
        const res = await App.api(`anggota/${id}`, { method: 'DELETE' });
        if (res?.success) { App.toast(res.message, 'success'); this.loadList(document.getElementById('app-content'), this.page); }
        else App.toast(res?.message || 'Gagal menghapus', 'error');
    },

    paginate(p) { this.loadList(document.getElementById('app-content'), p); },

    async importForm() {
        const { value: file } = await Swal.fire({
            title: 'Import Anggota dari CSV',
            html: `
                <div class="text-left space-y-3">
                    <p class="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                        <i class="ri-information-line text-blue-500 mr-1"></i>
                        Pastikan file CSV memiliki kolom: <b>no, noanggota, nama, jeniskelamin</b>.<br>
                        Data lainnya akan diisi otomatis dengan nilai default.
                    </p>
                    <input type="file" id="csv-file" class="w-full text-sm border border-gray-300 rounded-xl px-4 py-2.5" accept=".csv">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Mulai Import',
            preConfirm: () => {
                const fileInput = document.getElementById('csv-file');
                if (!fileInput.files.length) {
                    Swal.showValidationMessage('Pilih file CSV terlebih dahulu');
                    return false;
                }
                return fileInput.files[0];
            }
        });

        if (file) this.handleImport(file);
    },

    async handleImport(file) {
        const formData = new FormData();
        formData.append('file', file);

        Swal.fire({
            title: 'Memproses Import...',
            text: 'Harap tunggu sebentar...',
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading()
        });

        try {
            const res = await fetch(`${App.API_BASE}/anggota/import`, {
                method: 'POST',
                body: formData,
                headers: { 'X-CSRF-Token': App.csrfToken }
            }).then(r => r.json());

            if (res?.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Import Berhasil!',
                    text: res.message,
                    confirmButtonColor: '#4f46e5'
                });
                this.loadList(document.getElementById('app-content'));
            } else {
                Swal.fire('Gagal', res?.message || 'Terjadi kesalahan saat mengimpor', 'error');
            }
        } catch (e) {
            console.error('Import Error:', e);
            Swal.fire('Error', 'Gagal menghubungi server', 'error');
        }
    },

    paginate(page) {
        this.loadList(document.getElementById('app-content'), page);
    },

    async export(type) {
        const search = document.getElementById('anggota-search')?.value || '';
        const status = document.getElementById('anggota-status')?.value || '';
        const res = await App.api(`anggota?search=${encodeURIComponent(search)}&status=${status}&per_page=1000`);
        if (!res?.success) return;

        const columns = [
            { title: 'No. Anggota', key: 'no_anggota' },
            { title: 'Nama', key: 'nama' },
            { title: 'Telepon', key: 'telepon' },
            { title: 'Tgl Daftar', key: 'tgl_daftar' },
            { title: 'Status', key: 'status_label' }
        ];

        const rows = res.data.map(a => ({
            ...a,
            tgl_daftar: App.formatDate(a.tgl_daftar),
            status_label: a.status.toUpperCase()
        }));

        App.export(type, 'Data Anggota Koperasi', columns, rows, { filename: 'data_anggota' });
    }
};

window.AnggotaPage = AnggotaPage;
export default AnggotaPage;
