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
        if (!res?.success) { 
            container.innerHTML = `
                <div class="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm animate-fadeIn">
                    <i class="ri-user-search-line text-6xl text-slate-200 mb-4 block"></i>
                    <p class="text-slate-500 text-lg font-medium">Anggota tidak ditemukan</p>
                    <button onclick="location.hash='#/anggota'" class="mt-4 text-primary-600 font-bold hover:underline">Kembali ke Daftar</button>
                </div>`;
            return; 
        }
        
        const a = res.data;
        const totalSimpanan = (a.saldo_simpanan || []).reduce((sum, s) => sum + parseFloat(s.saldo || 0), 0);
        const totalPinjaman = (a.pinjaman_aktif || []).reduce((sum, p) => sum + parseFloat(p.sisa_pinjaman || 0), 0);
        
        // Calculate years of membership
        const joinDate = new Date(a.tgl_daftar);
        const now = new Date();
        const tenure = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24 * 365));

        container.innerHTML = `
        <div class="animate-fadeIn pb-10">
            <!-- Top Action Bar -->
            <div class="flex items-center justify-between mb-6">
                <button onclick="location.hash='#/anggota'" class="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all font-bold text-sm">
                    <div class="w-8 h-8 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center group-hover:-translate-x-1 transition-transform">
                        <i class="ri-arrow-left-line"></i>
                    </div>
                    Kembali
                </button>
                <div class="flex items-center gap-2">
                    ${App.hasPerm('anggota.edit') ? `
                    <button onclick="AnggotaPage.form(${a.id})" class="bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm">
                        <i class="ri-edit-line"></i> Edit Profil
                    </button>` : ''}
                    <button onclick="window.print()" class="bg-slate-900 text-white hover:bg-black px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-slate-200">
                        <i class="ri-printer-line"></i> Cetak Kartu
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <!-- LEFT COLUMN: PROFILE CARD -->
                <div class="lg:col-span-4 space-y-6">
                    <div class="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-white p-8 relative overflow-hidden group">
                        <!-- Decorative Background -->
                        <div class="absolute -top-24 -right-24 w-48 h-48 bg-primary-50 rounded-full blur-3xl opacity-50 group-hover:bg-primary-100 transition-colors"></div>
                        
                        <div class="relative flex flex-col items-center text-center">
                            <div class="relative mb-6">
                                <div class="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-primary-200 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                                    ${a.nama.charAt(0).toUpperCase()}
                                </div>
                                <div class="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-lg flex items-center justify-center text-emerald-500 border border-slate-50">
                                    <i class="ri-checkbox-circle-fill text-2xl"></i>
                                </div>
                            </div>

                            <h2 class="text-2xl font-black text-slate-900 leading-tight mb-1">${a.nama}</h2>
                            <p class="font-mono text-xs font-bold text-slate-400 tracking-widest uppercase mb-4">${a.no_anggota}</p>
                            
                            <div class="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-wider mb-6">
                                <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> ${a.status}
                            </div>

                            <div class="w-full grid grid-cols-2 gap-4 pt-6 border-t border-slate-50">
                                <div class="text-left">
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bergabung</p>
                                    <p class="text-sm font-bold text-slate-700">${App.formatDate(a.tgl_daftar)}</p>
                                </div>
                                <div class="text-right">
                                    <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Masa Keanggotaan</p>
                                    <p class="text-sm font-bold text-slate-700">${tenure > 0 ? tenure + ' Tahun' : '< 1 Tahun'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Quick Contacts -->
                    <div class="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-900/20">
                        <h4 class="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                            <i class="ri-contacts-book-line text-primary-400"></i> Kontak Anggota
                        </h4>
                        <div class="space-y-6">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-primary-400">
                                    <i class="ri-phone-line text-xl"></i>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nomor Telepon</p>
                                    <p class="text-sm font-bold">${a.telepon || '-'}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-primary-400">
                                    <i class="ri-mail-line text-xl"></i>
                                </div>
                                <div>
                                    <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alamat Email</p>
                                    <p class="text-sm font-bold truncate max-w-[150px]">${a.email || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- RIGHT COLUMN: DYNAMIC TABS -->
                <div class="lg:col-span-8 space-y-6">
                    <!-- Tab Navigation -->
                    <div class="bg-white p-2 rounded-2xl shadow-sm border border-slate-100 flex gap-1 overflow-x-auto no-scrollbar">
                        <button onclick="AnggotaPage.switchDetailTab('overview')" id="tab-btn-overview" class="detail-tab-btn active px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0">
                            <i class="ri-dashboard-line"></i> Ringkasan
                        </button>
                        <button onclick="AnggotaPage.switchDetailTab('savings')" id="tab-btn-savings" class="detail-tab-btn px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0">
                            <i class="ri-wallet-3-line"></i> Simpanan
                        </button>
                        <button onclick="AnggotaPage.switchDetailTab('loans')" id="tab-btn-loans" class="detail-tab-btn px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0">
                            <i class="ri-hand-coin-line"></i> Pinjaman
                        </button>
                        <button onclick="AnggotaPage.switchDetailTab('profile')" id="tab-btn-profile" class="detail-tab-btn px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 shrink-0">
                            <i class="ri-user-4-line"></i> Profil Lengkap
                        </button>
                    </div>

                    <!-- TAB CONTENT: OVERVIEW -->
                    <div id="detail-tab-overview" class="detail-tab-content block space-y-6">
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div class="bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-[2rem] p-8 text-white shadow-lg shadow-emerald-200 overflow-hidden relative group">
                                <i class="ri-safe-2-line absolute -bottom-6 -right-6 text-9xl opacity-10 group-hover:scale-110 transition-transform duration-700"></i>
                                <p class="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Total Saldo Simpanan</p>
                                <h3 class="text-3xl font-black mb-4">${App.formatRupiah(totalSimpanan)}</h3>
                                <div class="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                    <div class="h-full bg-white rounded-full" style="width: 75%"></div>
                                </div>
                                <p class="text-[10px] mt-4 font-bold opacity-70 italic">* Akumulasi dari semua jenis simpanan</p>
                            </div>
                            <div class="bg-gradient-to-br from-amber-500 to-amber-700 rounded-[2rem] p-8 text-white shadow-lg shadow-amber-200 overflow-hidden relative group">
                                <i class="ri-hand-coin-line absolute -bottom-6 -right-6 text-9xl opacity-10 group-hover:scale-110 transition-transform duration-700"></i>
                                <p class="text-xs font-black uppercase tracking-widest opacity-80 mb-2">Total Baki Debet</p>
                                <h3 class="text-3xl font-black mb-4">${App.formatRupiah(totalPinjaman)}</h3>
                                <div class="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                                    <div class="h-full bg-white rounded-full" style="width: 45%"></div>
                                </div>
                                <p class="text-[10px] mt-4 font-bold opacity-70 italic">* Sisa pokok pinjaman aktif</p>
                            </div>
                        </div>

                        <div class="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                            <div class="flex items-center justify-between mb-8">
                                <h4 class="text-sm font-black text-slate-900 uppercase tracking-widest">Aktivitas Terakhir</h4>
                                <button onclick="AnggotaPage.loadActivities(${a.id})" class="text-slate-400 hover:text-primary-600 transition-colors">
                                    <i class="ri-refresh-line"></i>
                                </button>
                            </div>
                            <div id="activity-list" class="space-y-0 relative">
                                <div class="flex items-center justify-center py-10 text-slate-300 italic text-sm">
                                    <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-300 mr-2"></div>
                                    Memuat aktivitas...
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- TAB CONTENT: SAVINGS -->
                    <div id="detail-tab-savings" class="detail-tab-content hidden space-y-6">
                        <div class="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                            <div class="flex items-center justify-between mb-8">
                                <h4 class="text-sm font-black text-slate-900 uppercase tracking-widest">Daftar Rekening Simpanan</h4>
                                <a href="#/simpanan?anggota_id=${a.id}" class="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-emerald-100 transition-colors uppercase tracking-widest">
                                    <i class="ri-add-line"></i> Transaksi Baru
                                </a>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                ${(a.saldo_simpanan || []).map(s => `
                                <div onclick="AnggotaPage.showMutasiSimpanan(${a.id}, ${s.id}, '${s.nama}')" class="group bg-slate-50 border border-slate-100 hover:border-emerald-200 p-6 rounded-[1.5rem] transition-all hover:shadow-lg cursor-pointer relative overflow-hidden">
                                    <div class="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform"></div>
                                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] mb-1">${s.nama}</p>
                                    <p class="text-2xl font-black text-slate-900">${App.formatRupiah(s.saldo)}</p>
                                    <div class="mt-4 flex items-center justify-between">
                                        <span class="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">Aktif</span>
                                        <i class="ri-arrow-right-up-line text-slate-300 group-hover:text-emerald-500 transition-colors"></i>
                                    </div>
                                </div>`).join('')}
                            </div>
                        </div>
                    </div>

                    <!-- TAB CONTENT: LOANS -->
                    <div id="detail-tab-loans" class="detail-tab-content hidden space-y-6">
                        <div class="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                            <div class="flex items-center justify-between mb-8">
                                <h4 class="text-sm font-black text-slate-900 uppercase tracking-widest">Daftar Pinjaman Aktif</h4>
                                <a href="#/pinjaman?anggota_id=${a.id}" class="bg-amber-50 text-amber-600 px-4 py-2 rounded-xl text-xs font-black hover:bg-amber-100 transition-colors uppercase tracking-widest">
                                    <i class="ri-file-list-line"></i> Semua Pinjaman
                                </a>
                            </div>
                            ${(a.pinjaman_aktif || []).length ? `
                            <div class="space-y-4">
                                ${a.pinjaman_aktif.map(p => {
                                    const progress = Math.min(100, Math.round(((parseFloat(p.jumlah) - parseFloat(p.sisa_pinjaman)) / parseFloat(p.jumlah)) * 100));
                                    return `
                                    <div onclick="AnggotaPage.showMutasiPinjaman(${p.id}, '${p.no_pinjaman}')" class="group bg-slate-50 border border-slate-100 hover:border-amber-200 p-6 rounded-[1.5rem] transition-all hover:shadow-lg cursor-pointer">
                                        <div class="flex justify-between items-start mb-6">
                                            <div class="flex items-center gap-4">
                                                <div class="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center text-amber-500 group-hover:rotate-12 transition-transform">
                                                    <i class="ri-hand-coin-fill text-2xl"></i>
                                                </div>
                                                <div>
                                                    <p class="font-black text-slate-900 text-lg tracking-tight">${p.no_pinjaman}</p>
                                                    <p class="text-[10px] font-bold text-amber-600 uppercase tracking-widest">${p.jenis_pinjaman}</p>
                                                </div>
                                            </div>
                                            <div class="text-right">
                                                <p class="text-xl font-black text-slate-900">${App.formatRupiah(p.sisa_pinjaman)}</p>
                                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sisa Baki Debet</p>
                                            </div>
                                        </div>
                                        <div class="space-y-2">
                                            <div class="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                                                <span class="text-slate-400">Progress Pelunasan</span>
                                                <span class="text-amber-600">${progress}%</span>
                                            </div>
                                            <div class="h-2 w-full bg-white rounded-full overflow-hidden border border-slate-100 p-0.5">
                                                <div class="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-1000" style="width: ${progress}%"></div>
                                            </div>
                                        </div>
                                    </div>`;
                                }).join('')}
                            </div>` : `
                            <div class="text-center py-20 bg-slate-50 rounded-[1.5rem] border border-dashed border-slate-200">
                                <i class="ri-shake-hands-line text-6xl text-slate-200 mb-4 block"></i>
                                <p class="text-slate-400 font-bold uppercase tracking-widest text-xs">Tidak ada pinjaman aktif</p>
                            </div>`}
                        </div>
                    </div>

                    <!-- TAB CONTENT: PROFILE -->
                    <div id="detail-tab-profile" class="detail-tab-content hidden space-y-6">
                        <div class="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                            <h4 class="text-sm font-black text-slate-900 uppercase tracking-widest mb-8">Informasi Personal</h4>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                                ${this.infoRow('Nomor Induk Kependudukan (NIK)', a.nik || '-', 'ri-fingerprint-line')}
                                ${this.infoRow('Tempat, Tanggal Lahir', (a.tempat_lahir || '-') + ', ' + (a.tanggal_lahir ? App.formatDate(a.tanggal_lahir) : '-'), 'ri-calendar-event-line')}
                                ${this.infoRow('Jenis Kelamin', a.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan', 'ri-men-line')}
                                ${this.infoRow('Pekerjaan Utama', a.pekerjaan || '-', 'ri-briefcase-line')}
                                ${this.infoRow('No. Anggota Lama', a.no_anggota_lama || '-', 'ri-history-line')}
                                <div class="sm:col-span-2 pt-4 border-t border-slate-50">
                                    <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Alamat Sesuai KTP / Domisili</label>
                                    <p class="text-sm text-slate-700 font-bold leading-relaxed">${a.alamat || '<span class="italic text-slate-300 font-normal">Belum diisi</span>'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <style>
            .detail-tab-btn { color: #64748b; border: 1px solid transparent; }
            .detail-tab-btn:hover { background-color: #f8fafc; }
            .detail-tab-btn.active { background-color: #0f172a; color: #fff; border-color: #0f172a; box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.1); }
            .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
            @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        </style>
        `;
        
        this.loadActivities(id);
    },

    async loadActivities(anggotaId) {
        const container = document.getElementById('activity-list');
        if (!container) return;

        const res = await App.api(`log/activities?anggota_id=${anggotaId}`);
        if (!res?.success || !res.data.length) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-10 text-slate-300 italic text-sm">
                    <i class="ri-history-line text-4xl mb-2 opacity-20"></i>
                    Belum ada riwayat aktivitas
                </div>`;
            return;
        }

        container.innerHTML = res.data.map(log => {
            let icon = 'ri-record-circle-line';
            let color = 'slate';
            if (log.type === 'security') { icon = 'ri-shield-user-line'; color = 'indigo'; }
            else if (log.type === 'finance') { icon = 'ri-exchange-funds-line'; color = 'emerald'; }
            else if (log.type === 'profile') { icon = 'ri-user-settings-line'; color = 'blue'; }

            return `
            <div class="flex gap-4 relative">
                <div class="absolute left-[1.1rem] top-10 bottom-0 w-px bg-slate-100 last:hidden"></div>
                <div class="w-9 h-9 rounded-xl bg-${color}-50 text-${color}-600 flex items-center justify-center shrink-0 z-10 border border-${color}-100">
                    <i class="${icon} text-lg"></i>
                </div>
                <div class="pb-6">
                    <p class="text-sm font-bold text-slate-800 leading-tight">${log.title}</p>
                    <p class="text-[10px] text-slate-400 font-medium mt-1">${log.detail}</p>
                    <p class="text-[9px] text-slate-400 mt-1.5 uppercase tracking-widest font-bold">${App.formatDate(log.created_at)} · ${log.created_at.split(' ')[1]}</p>
                </div>
            </div>`;
        }).join('');
    },

    switchDetailTab(tabId) {
        document.querySelectorAll('.detail-tab-content').forEach(c => c.classList.replace('block', 'hidden'));
        document.querySelectorAll('.detail-tab-btn').forEach(b => b.classList.remove('active'));
        
        document.getElementById('detail-tab-' + tabId).classList.replace('hidden', 'block');
        document.getElementById('tab-btn-' + tabId).classList.add('active');
    },

    async showMutasiSimpanan(anggotaId, jenisId, nama) {
        App.openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h3 class="text-xl font-black text-slate-900">Mutasi ${nama}</h3>
                        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">30 Transaksi Terakhir</p>
                    </div>
                    <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="ri-close-line text-2xl"></i></button>
                </div>
                <div id="modal-mutasi-content" class="min-h-[300px]">
                    <div class="flex items-center justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
                </div>
            </div>
        `, 'max-w-3xl');

        const res = await App.api(`simpanan/mutasi/${anggotaId}?jenis_simpanan_id=${jenisId}&per_page=30`);
        const content = document.getElementById('modal-mutasi-content');
        if (!res?.success || !res.data.length) {
            content.innerHTML = '<div class="text-center py-20 text-slate-400">Tidak ada riwayat transaksi</div>';
            return;
        }

        content.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="text-left border-b border-slate-100">
                            <th class="pb-3 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Tanggal</th>
                            <th class="pb-3 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Keterangan</th>
                            <th class="pb-3 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Jumlah</th>
                            <th class="pb-3 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Saldo</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${res.data.map(t => `
                        <tr>
                            <td class="py-3 text-slate-600">${App.formatDate(t.tgl_transaksi)}</td>
                            <td class="py-3">
                                <div class="font-bold text-slate-800">${t.nama_transaksi}</div>
                                <div class="text-[10px] text-slate-400">${t.no_transaksi}</div>
                            </td>
                            <td class="py-3 text-right font-bold ${t.dk === 'D' ? 'text-emerald-600' : 'text-rose-600'}">
                                ${t.dk === 'D' ? '+' : '-'}${App.formatRupiah(t.jumlah)}
                            </td>
                            <td class="py-3 text-right font-bold text-slate-700">${App.formatRupiah(t.saldo_sesudah)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    },

    async showMutasiPinjaman(pinjamanId, noPinjaman) {
        App.openModal(`
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h3 class="text-xl font-black text-slate-900">Riwayat Angsuran</h3>
                        <p class="text-xs text-slate-400 font-bold uppercase tracking-widest">${noPinjaman}</p>
                    </div>
                    <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600"><i class="ri-close-line text-2xl"></i></button>
                </div>
                <div id="modal-mutasi-content" class="min-h-[300px]">
                    <div class="flex items-center justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div></div>
                </div>
            </div>
        `, 'max-w-4xl');

        const res = await App.api(`angsuran?pinjaman_id=${pinjamanId}&per_page=100`);
        const content = document.getElementById('modal-mutasi-content');
        if (!res?.success || !res.data.length) {
            content.innerHTML = '<div class="text-center py-20 text-slate-400">Data angsuran tidak ditemukan</div>';
            return;
        }

        content.innerHTML = `
            <div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead>
                        <tr class="text-left border-b border-slate-100">
                            <th class="pb-3 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-center">Ke-</th>
                            <th class="pb-3 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Tgl Bayar</th>
                            <th class="pb-3 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Pokok</th>
                            <th class="pb-3 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Bunga</th>
                            <th class="pb-3 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-right">Total</th>
                            <th class="pb-3 font-bold text-slate-400 uppercase tracking-widest text-[10px] text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50">
                        ${res.data.map(a => `
                        <tr>
                            <td class="py-3 text-center font-bold text-slate-500">${a.angsuran_ke}</td>
                            <td class="py-3 text-slate-600">${a.tgl_bayar ? App.formatDate(a.tgl_bayar) : '<span class="text-slate-300">-</span>'}</td>
                            <td class="py-3 text-right font-medium text-slate-700">${App.formatRupiah(a.pokok)}</td>
                            <td class="py-3 text-right font-medium text-slate-700">${App.formatRupiah(a.bunga)}</td>
                            <td class="py-3 text-right font-bold text-slate-900">${App.formatRupiah(a.total)} ${a.denda > 0 ? `<br><span class="text-[9px] text-rose-500">Denda: ${App.formatRupiah(a.denda)}</span>` : ''}</td>
                            <td class="py-3 text-center">${App.statusBadge(a.status)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>`;
    },

    infoRow(label, value, icon) {
        return `
        <div class="flex items-center gap-4">
            <div class="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                <i class="${icon} text-lg"></i>
            </div>
            <div class="min-w-0">
                <label class="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">${label}</label>
                <p class="text-sm text-slate-700 font-semibold truncate">${value || '<span class="italic font-normal text-slate-300">Kosong</span>'}</p>
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
