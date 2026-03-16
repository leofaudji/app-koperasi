const RATPage = {
    v: '2.0.2', // Visual debug marker
    page: 1,
    activeSession: null,
    liveInterval: null,

    async render(container, id) {
        App.setTitle('Manajemen RAT', 'Kelola rapat anggota, presensi, dan voting');
        if (id) return this.detail(container, id);
        this.page = 1;
        this.loadList(container);
    },

    async loadList(container, page = 1) {
        this.page = page;
        const res = await App.api(`rat?page=${page}`);
        if (!res?.success) return;

        const html = `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div class="flex items-center gap-3 flex-1">
                    <h3 class="text-lg font-bold text-gray-800">Daftar Sesi RAT</h3>
                </div>
                ${App.hasPerm('rat.manage') ? '<button onclick="RATPage.form()" class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-lg shadow-primary-500/25 transition-all"><i class="ri-add-line"></i> Buat Sesi Baru</button>' : ''}
            </div>
            <div class="table-wrapper">
                <table class="data-table w-full text-sm">
                    <thead><tr class="bg-gray-50">
                        <th class="px-4 py-3 text-left font-medium text-gray-500">Judul Sesi</th>
                        <th class="px-4 py-3 text-left font-medium text-gray-500">Tanggal</th>
                        <th class="px-4 py-3 text-left font-medium text-gray-500">Lokasi</th>
                        <th class="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                        <th class="px-4 py-3 text-center font-medium text-gray-500">Aksi</th>
                    </tr></thead>
                    <tbody>${res.data.map(r => `<tr class="border-t border-gray-50">
                        <td class="px-4 py-3 font-semibold text-gray-800">${r.judul}</td>
                        <td class="px-4 py-3 text-gray-500">${App.formatDate(r.tanggal)}</td>
                        <td class="px-4 py-3 text-gray-500">${r.lokasi || '-'}</td>
                        <td class="px-4 py-3 text-center">
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${r.status === 'aktif' ? 'bg-emerald-100 text-emerald-700' : (r.status === 'selesai' ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700')}">
                                ${r.status}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-center"><div class="flex justify-center gap-1">
                            <a href="#/rat/${r.id}" class="p-1.5 hover:bg-primary-50 rounded-lg text-primary-600" title="Kelola"><i class="ri-settings-4-line"></i></a>
                            ${App.hasPerm('rat.manage') ? `
                                <button onclick="RATPage.form(${r.id})" class="p-1.5 hover:bg-amber-50 rounded-lg text-amber-500" title="Edit"><i class="ri-edit-line"></i></button>
                                <button onclick="RATPage.del(${r.id},'${r.judul}')" class="p-1.5 hover:bg-red-50 rounded-lg text-red-500" title="Hapus"><i class="ri-delete-bin-line"></i></button>
                            ` : ''}
                        </div></td></tr>`).join('')}
                    ${res.data.length === 0 ? '<tr><td colspan="5" class="text-center py-8 text-gray-400 font-medium">Belum ada sesi RAT yang dijadwalkan</td></tr>' : ''}</tbody>
                </table>
            </div>
            ${App.renderPagination(res.pagination, 'RATPage.paginate')}
        </div>`;
        container.innerHTML = html;
    },

    async detail(container, id) {
        const res = await App.api('rat/' + id);
        if (!res?.success) { container.innerHTML = '<p class="text-center text-gray-400 py-10">Sesi tidak ditemukan</p>'; return; }
        const s = res.data;
        this.activeSession = s;

        container.innerHTML = `
        <div class="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <a href="#/rat" class="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"><i class="ri-arrow-left-line"></i> Kembali</a>
            <div class="flex items-center gap-3">
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">Status Sesi:</span>
                    <span class="px-3 py-1 bg-white border border-gray-100 rounded-full text-[10px] font-bold uppercase text-primary-600">${s.status}</span>
                </div>
                ${App.hasPerm('rat.manage') ? `<button onclick="RATPage.printReport(${s.id})" class="bg-gray-900 hover:bg-black text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-lg shadow-gray-200 transition-all flex items-center gap-2" title="Cetak Laporan RAT"><i class="ri-printer-line"></i> Cetak Laporan</button>` : ''}
            </div>
        </div>

        <!-- Analytics Cards -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-lg"><i class="ri-group-line"></i></div>
                <div><div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Anggota</div><div class="text-lg font-black text-gray-800">${s.total_anggota || 0}</div></div>
            </div>
            <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center text-lg"><i class="ri-user-follow-line"></i></div>
                <div><div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Hadir</div><div class="text-lg font-black text-gray-800" id="stat-hadir">${s.total_hadir || 0}</div></div>
            </div>
            <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center text-lg"><i class="ri-user-unfollow-line"></i></div>
                <div><div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Tidak Hadir</div><div class="text-lg font-black text-gray-800" id="stat-absen">${(s.total_anggota || 0) - (s.total_hadir || 0)}</div></div>
            </div>
            <div class="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center text-lg"><i class="ri-pie-chart-2-line"></i></div>
                <div><div class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Kuorum</div><div class="text-lg font-black text-gray-800" id="stat-kuorum">${s.total_anggota > 0 ? Math.round(((s.total_hadir || 0) / s.total_anggota) * 100) : 0}%</div></div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Session Info & QR -->
            <div class="space-y-6">
                <div class="bg-gradient-to-br from-primary-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl shadow-primary-500/20">
                    <h3 class="text-xl font-bold mb-2">${s.judul}</h3>
                    <div class="space-y-3 text-sm text-primary-100 mt-4">
                        <div class="flex items-center gap-2"><i class="ri-calendar-line"></i> ${App.formatDate(s.tanggal)}</div>
                        <div class="flex items-center gap-2"><i class="ri-map-pin-line"></i> ${s.lokasi || 'Lokasi belum diset'}</div>
                    </div>
                    
                    <div class="mt-8 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20">
                        <p class="text-xs font-bold uppercase tracking-wider mb-3 text-center text-primary-200">Presensi Digital (Scan QR)</p>
                        <div class="bg-white p-4 rounded-xl shadow-inner mx-auto w-fit" id="qr-container"></div>
                        <p class="text-[10px] text-center mt-3 text-primary-200 opacity-75">Gunakan Portal Anggota untuk memindai kode ini untuk mencatat kehadiran.</p>
                        <button onclick="RATPage.refreshToken(${s.id})" class="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-white/10">
                            <i class="ri-refresh-line"></i> Perbarui Kode QR
                        </button>
                    </div>
                </div>

                <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 overflow-hidden">
                    <div class="flex items-center justify-between mb-4">
                        <h4 class="font-bold text-gray-800">Pusat Dokumen</h4>
                        <button onclick="RATPage.uploadForm(${s.id})" class="text-primary-600 hover:text-primary-700 text-xs font-bold transition-all flex items-center gap-1">
                            <i class="ri-upload-cloud-2-line"></i> Unggah PDF
                        </button>
                    </div>
                    <div id="docs-list" class="space-y-3">
                        <p class="text-[11px] text-center text-gray-400 py-6 font-medium">Memuat dokumen...</p>
                    </div>
                    <p class="text-[10px] text-gray-400 mt-4 leading-relaxed font-medium italic">* File PDF laporan akan tersedia di Portal Anggota untuk dipelajari anggota.</p>
                </div>

                <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 overflow-hidden relative">
                    <div class="flex items-center justify-between mb-4">
                        <h4 class="font-bold text-gray-800">Kehadiran Anggota</h4>
                        <span id="attendance-count" class="bg-primary-50 text-primary-600 px-2.5 py-1 rounded-full text-[10px] font-bold">... Memuat</span>
                    </div>
                    <div id="attendance-list" class="space-y-2 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin">
                        <!-- Attendance list memuat -->
                    </div>
                </div>
            </div>

            <!-- Voting Topics -->
            <div class="lg:col-span-2 space-y-6">
                <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 transition-all">
                    <div class="flex items-center justify-between mb-8">
                        <div>
                            <h4 class="text-xl font-bold text-gray-800">Modul E-Voting</h4>
                            <p class="text-xs text-gray-400 mt-1">Kelola topik pemungutan suara dalam rapat</p>
                        </div>
                        <button onclick="RATPage.topicForm(${s.id})" class="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all">
                            <i class="ri-add-line"></i> Tambah Topik
                        </button>
                    </div>

                    <div id="topics-list" class="space-y-6">
                        <!-- Topics data memuat -->
                    </div>
                </div>
            </div>
        </div>`;

        // Generate QR
        if (s.qr_token) {
            new QRCode(document.getElementById("qr-container"), {
                text: s.qr_token,
                width: 160,
                height: 160,
                colorDark: "#003bde",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }

        this.loadAttendance(s.id);
        this.loadTopics(s.id);
        this.loadDocuments(s.id);
    },

    async refreshToken(id) {
        const res = await App.api(`rat/${id}/token`, { method: 'POST' });
        if (res?.success) {
            this.activeSession.qr_token = res.qr_token;
            const container = document.getElementById("qr-container");
            container.innerHTML = "";
            new QRCode(container, {
                text: res.qr_token,
                width: 160,
                height: 160,
                colorDark: "#003bde",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
            App.toast('QR Token berhasil diperbarui', 'success');
        }
    },

    async loadAttendance(id) {
        const res = await App.api(`rat/${id}/attendance`);
        if (!res?.success) return;

        const hadir = res.data.length;
        document.getElementById('attendance-count').textContent = hadir + ' Hadir';

        // Update stats dynamically if on page
        if (this.activeSession) {
            this.activeSession.total_hadir = hadir;
            const total = this.activeSession.total_anggota || 0;
            const absen = Math.max(0, total - hadir);
            const kuorum = total > 0 ? Math.round((hadir / total) * 100) : 0;

            const statHadir = document.getElementById('stat-hadir');
            if (statHadir) {
                statHadir.textContent = hadir;
                document.getElementById('stat-absen').textContent = absen;
                document.getElementById('stat-kuorum').textContent = kuorum + '%';
            }
        }

        const container = document.getElementById('attendance-list');
        container.innerHTML = res.data.map(a => `
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-transparent hover:border-primary-100 transition-all">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-[10px]">${a.nama.charAt(0)}</div>
                    <div>
                        <p class="text-xs font-bold text-gray-800 line-clamp-1">${a.nama}</p>
                        <p class="text-[9px] text-gray-400 font-mono">${a.no_anggota}</p>
                    </div>
                </div>
                <div class="text-[9px] text-gray-400 font-medium">${new Date(a.waktu_hadir).toLocaleTimeString()}</div>
            </div>
        `).join('');

        if (res.data.length === 0) container.innerHTML = '<p class="text-[11px] text-center text-gray-400 py-6 font-medium">Belum ada anggota yang hadir</p>';
    },

    async loadTopics(id) {
        const res = await App.api(`rat/${id}/topics`);
        if (!res?.success) return;

        const container = document.getElementById('topics-list');
        container.innerHTML = res.data.map(t => {
            const isTutup = t.status === 'tutup';
            const isBuka = t.status === 'buka';
            const totalPeserta = this.activeSession?.total_hadir || 0;
            const abstain = Math.max(0, totalPeserta - t.total_votes);
            const abstainPct = totalPeserta > 0 ? Math.round((abstain / totalPeserta) * 100) : 0;

            return `
            <div class="border border-gray-100 rounded-3xl p-6 hover:shadow-lg hover:shadow-gray-200/20 transition-all bg-white group relative">
                <div class="flex flex-col sm:flex-row items-start justify-between gap-4 mb-6">
                    <div>
                        <div class="flex items-center gap-2 mb-2">
                            <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${isBuka ? 'bg-emerald-100 text-emerald-700 animate-pulse' : (isTutup ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700')}">
                                ${t.status}
                            </span>
                            ${t.is_member_election == 1 ? '<span class="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black uppercase">PEMILIHAN (OPSI BEBAS)</span>' : ''}
                            <span class="text-[10px] text-gray-400 font-medium"><i class="ri-user-voice-line"></i> ${t.total_votes} Total Suara Masuk</span>
                        </div>
                        <h5 class="text-lg font-bold text-gray-800 group-hover:text-primary-600 transition-colors">${t.judul}</h5>
                        <p class="text-sm text-gray-500 mt-1">${t.deskripsi || 'Tidak ada deskripsi'}</p>
                    </div>
                    <div class="flex gap-2 shrink-0">
                        ${!isBuka && !isTutup ? `<button onclick="RATPage.updateTopicStatus(${t.id}, 'buka')" class="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100" title="Buka Voting"><i class="ri-play-fill text-xl"></i></button>` : ''}
                        ${isBuka ? `<button onclick="RATPage.updateTopicStatus(${t.id}, 'tutup')" class="p-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100" title="Tutup Voting"><i class="ri-stop-fill text-xl"></i></button>` : ''}
                        ${isTutup ? `<button onclick="RATPage.updateTopicStatus(${t.id}, 'buka')" class="p-2.5 bg-amber-50 text-amber-600 rounded-xl hover:bg-amber-100" title="Buka Kembali"><i class="ri-restart-line text-xl"></i></button>` : ''}
                        <button onclick="RATPage.openLiveDashboard(${t.id})" class="p-2.5 bg-primary-50 text-primary-600 rounded-xl hover:bg-primary-100" title="Buka Live Dashboard"><i class="ri-tv-2-line text-xl"></i></button>
                    </div>
                </div>

                <div class="space-y-4 pt-4 border-t border-gray-50">
                    ${t.options.map(opt => {
                const pct = totalPeserta > 0 ? Math.round((opt.votes / totalPeserta) * 100) : 0;
                return `
                        <div class="space-y-1.5">
                            <div class="flex justify-between text-xs font-bold">
                                <span class="text-gray-700">${opt.label}</span>
                                <span class="text-primary-600">${opt.votes} (${pct}%)</span>
                            </div>
                            <div class="h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                                <div class="h-full bg-primary-500 transition-all duration-1000" style="width: ${pct}%"></div>
                            </div>
                        </div>`;
            }).join('')}
                    ${isTutup ? `
                        <div class="space-y-1.5 pt-2">
                            <div class="flex justify-between text-xs font-bold text-gray-400">
                                <span>Abstain / Tidak Memilih</span>
                                <span>${abstain} (${abstainPct}%)</span>
                            </div>
                            <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div class="h-full bg-gray-300 transition-all duration-1000" style="width: ${abstainPct}%"></div>
                            </div>
                        </div>
                    ` : ''}
                </div>
                ${isTutup && (t.judul.toLowerCase().includes('shu') || t.judul.toLowerCase().includes('sisa hasil usaha')) && App.hasPerm('keuangan.laba_rugi') ? `
                    <div class="mt-6 pt-5 border-t border-dashed border-gray-200">
                        <button onclick="RATPage.executeSHU(${t.id}, '${t.judul.replace(/'/g, "\\'")}')" class="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all">
                            <i class="ri-shake-hands-line text-lg"></i> Eksekusi Pembagian SHU Otomatis ke Simpanan Anggota
                        </button>
                    </div>
                ` : ''}
            </div>`;
        }).join('');

        if (res.data.length === 0) container.innerHTML = '<div class="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200"><i class="ri-ball-pen-line text-3xl text-gray-300 mb-2"></i><p class="text-sm text-gray-400 font-medium">Klik "Tambah Topik" untuk membuat pemungutan suara</p></div>';
    },

    async loadDocuments(sessionId) {
        const res = await App.api(`rat/sessions/${sessionId}/documents`);
        if (!res?.success) return;

        const container = document.getElementById('docs-list');
        if (res.data.length === 0) {
            container.innerHTML = '<p class="text-[11px] text-center text-gray-400 py-6 font-medium">Belum ada dokumen/laporan</p>';
            return;
        }

        container.innerHTML = res.data.map(d => `
            <div class="p-3 bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all flex items-center justify-between group">
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center text-lg"><i class="ri-file-pdf-2-line"></i></div>
                    <div class="min-w-0">
                        <p class="text-xs font-bold text-gray-800 line-clamp-1">${d.nama_dokumen}</p>
                        <p class="text-[9px] text-gray-400 uppercase font-black tracking-widest">${d.kategori}</p>
                    </div>
                </div>
                <div class="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                    <a href="${App.API_BASE.replace(/\/api\/?$/, '')}/${d.file_path}" target="_blank" class="p-1.5 hover:bg-white rounded-lg text-primary-600" title="Buka/Download"><i class="ri-external-link-line"></i></a>
                    <button onclick="RATPage.deleteDoc(${d.id}, '${d.nama_dokumen.replace(/'/g, "\\'")}')" class="p-1.5 hover:bg-white rounded-lg text-rose-600" title="Hapus"><i class="ri-delete-bin-line"></i></button>
                </div>
            </div>
        `).join('');
    },

    uploadForm(sessionId) {
        Swal.fire({
            title: 'Unggah Dokumen RAT',
            html: `
                <div class="text-left space-y-4 pt-4">
                    <div>
                        <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nama Dokumen</label>
                        <input type="text" id="swal-doc-name" class="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all" placeholder="Contoh: Laporan Pertanggungjawaban 2023">
                    </div>
                    <div>
                        <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kategori</label>
                        <select id="swal-doc-cat" class="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:bg-white focus:ring-2 focus:ring-primary-500 transition-all">
                            <option value="LPJ">Laporan Pertanggungjawaban (LPJ)</option>
                            <option value="Rencana Kerja">Rencana Kerja</option>
                            <option value="Keuangan">Laporan Keuangan</option>
                            <option value="Lainnya">Dokumen Lainnya</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Pilih File PDF</label>
                        <input type="file" id="swal-doc-file" accept="application/pdf" class="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 transition-all">
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Mulai Unggah',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#003bde',
            preConfirm: () => {
                const name = document.getElementById('swal-doc-name').value;
                const cat = document.getElementById('swal-doc-cat').value;
                const fileInput = document.getElementById('swal-doc-file');
                const file = fileInput.files[0];

                if (!name) return Swal.showValidationMessage('Nama dokumen wajib diisi');
                if (!file) return Swal.showValidationMessage('Silakan pilih file PDF');
                if (file.type !== 'application/pdf') return Swal.showValidationMessage('Hanya file PDF yang diperbolehkan');

                return { name, cat, file };
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                const { name, cat, file } = result.value;
                const formData = new FormData();
                formData.append('file', file);
                formData.append('nama_dokumen', name);
                formData.append('kategori', cat);

                Swal.fire({ title: 'Mengunggah Dokumen...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

                try {
                    const res = await fetch(`${App.API_BASE}/rat/sessions/${sessionId}/documents`, {
                        method: 'POST',
                        body: formData,
                        headers: {
                            'X-CSRF-Token': App.csrfToken
                        }
                    }).then(r => r.json());

                    if (res?.success) {
                        Swal.fire('Berhasil', 'Dokumen berhasil diunggah', 'success');
                        this.loadDocuments(sessionId);
                    } else {
                        Swal.fire('Gagal', res?.message || 'Gagal mengunggah dokumen', 'error');
                    }
                } catch (e) {
                    Swal.fire('Error', 'Terjadi kesalahan koneksi', 'error');
                }
            }
        });
    },

    async deleteDoc(docId, name) {
        const ok = await Swal.fire({
            title: 'Hapus Dokumen?',
            text: `Apakah Anda yakin ingin menghapus "${name}"? File akan dihapus permanen dari server.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal'
        });

        if (ok.isConfirmed) {
            const res = await App.api(`rat/documents/${docId}`, { method: 'DELETE' });
            if (res?.success) {
                App.toast('Dokumen berhasil dihapus', 'success');
                this.loadDocuments(this.activeSession.id);
            }
        }
    },

    async executeSHU(topicId, judul) {
        const ok = await Swal.fire({
            title: 'Eksekusi SHU Otomatis?',
            html: `Sistem akan menghitung dan mendistribusikan SHU berdasarkan proporsi Simpanan & Pinjaman anggota langsung ke saldo Simpanan Sukarela mereka.<br><br><b>Perhatian:</b> Tindakan ini tidak dapat dibatalkan melalui antarmuka ini!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#4f46e5',
            cancelButtonColor: '#ef4444',
            confirmButtonText: '<i class="ri-check-line"></i> Ya, Bagikan SHU Sekarang!',
            cancelButtonText: 'Batal'
        });

        if (!ok.isConfirmed) return;

        Swal.fire({ title: 'Menghitung Proporsi & Mendistribusikan SHU...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const res = await App.api(`rat/topics/${topicId}/execute-shu`, { method: 'POST' });

        if (res?.success) {
            Swal.fire('BERHASIL!', res.message, 'success');
        } else {
            Swal.fire('Gagal Eksekusi', res?.message || 'Terjadi kesalahan sistem', 'error');
        }
    },

    async updateTopicStatus(topicId, status) {
        const res = await App.api('rat/topic-status', { method: 'POST', body: { topic_id: topicId, status: status } });
        if (res?.success) {
            App.toast('Status voting diperbarui', 'success');
            this.loadTopics(this.activeSession.id);
        }
    },

    openLiveDashboard(topicId) {
        // Create overlay if not exists
        let overlay = document.getElementById('live-dashboard-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'live-dashboard-overlay';
            overlay.className = 'fixed inset-0 bg-gray-950 z-[9999] text-white p-10 flex flex-col items-center justify-center animate-fadeIn';
            overlay.innerHTML = `
                <button onclick="RATPage.closeLiveDashboard()" class="absolute top-8 right-10 text-gray-500 hover:text-white text-3xl transition-colors">
                    <i class="ri-close-circle-line"></i>
                </button>
                <div id="live-topic-info" class="text-center mb-16">
                    <div id="live-status-pill" class="inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase mb-4 tracking-[0.2em]">MEMUAT...</div>
                    <h1 id="live-topic-title" class="text-5xl font-black mb-4 tracking-tight">Menghubungkan ke Server...</h1>
                    <p id="live-topic-desc" class="text-gray-400 text-lg max-w-2xl mx-auto"></p>
                </div>
                <div id="live-results-container" class="w-full max-w-5xl space-y-12">
                    <!-- Results here -->
                </div>
                <div class="mt-20 flex gap-12 text-center border-t border-white/5 pt-12">
                    <div>
                        <p class="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-1">Total Suara Masuk</p>
                        <p id="live-stat-votes" class="text-4xl font-black text-indigo-400">0</p>
                    </div>
                    <div>
                        <p class="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-1">Total Anggota Hadir</p>
                        <p id="live-stat-attendance" class="text-4xl font-black text-emerald-400">0</p>
                    </div>
                    <div>
                        <p class="text-gray-500 text-[10px] uppercase font-black tracking-widest mb-1">Persentase Suara</p>
                        <p id="live-stat-pct" class="text-4xl font-black text-amber-400">0%</p>
                    </div>
                </div>
                <div class="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-gray-700 font-black uppercase tracking-[0.3em] flex items-center gap-2">
                    <span class="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span> LIVE CALCULATION MODE 
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        this.pollLiveResults(topicId);
        this.liveInterval = setInterval(() => this.pollLiveResults(topicId), 3000);
    },

    async pollLiveResults(topicId) {
        const res = await App.api(`rat/topics/${topicId}/live-results`);
        if (!res?.success) return;

        const data = res.data;
        const topic = data.topic;

        // Update Header
        const statusEl = document.getElementById('live-status-pill');
        const isBuka = topic.status === 'buka';
        statusEl.className = `inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase mb-4 tracking-[0.2em] ${isBuka ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-pulse' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`;
        statusEl.textContent = isBuka ? 'VOTING SEDANG BERLANGSUNG' : 'VOTING DITUTUP';

        document.getElementById('live-topic-title').textContent = topic.judul;
        document.getElementById('live-topic-desc').textContent = topic.deskripsi || '';

        // Update Stats
        document.getElementById('live-stat-votes').textContent = data.total_votes;
        document.getElementById('live-stat-attendance').textContent = data.total_hadir;
        const pct = data.total_hadir > 0 ? Math.round((data.total_votes / data.total_hadir) * 100) : 0;
        document.getElementById('live-stat-pct').textContent = pct + '%';

        // Update Results
        const container = document.getElementById('live-results-container');
        // Simple logic: re-render only if needed to avoid flicker, or update bars via CSS
        // Let's sort options by vote for competitive feel
        const sortedOptions = data.options.sort((a, b) => b.votes - a.votes);

        container.innerHTML = sortedOptions.map((opt, i) => {
            const optPct = data.total_votes > 0 ? Math.round((opt.votes / data.total_votes) * 100) : 0;
            const colors = [
                'from-indigo-500 to-primary-600',
                'from-emerald-500 to-teal-600',
                'from-amber-500 to-orange-600',
                'from-rose-500 to-pink-600',
                'from-purple-500 to-violet-600',
                'from-sky-500 to-blue-600'
            ];
            const color = colors[i % colors.length];

            return `
            <div class="space-y-3">
                <div class="flex justify-between items-end">
                    <div>
                        <span class="text-gray-500 text-[10px] font-black uppercase tracking-widest mb-1 block">KANDIDAT / OPSI</span>
                        <h4 class="text-2xl font-bold">${opt.label}</h4>
                    </div>
                    <div class="text-right">
                        <span class="text-primary-400 text-3xl font-black">${opt.votes}</span>
                        <span class="text-gray-500 text-sm font-bold ml-1">Suara (${optPct}%)</span>
                    </div>
                </div>
                <div class="h-6 bg-white/5 rounded-full overflow-hidden p-1 border border-white/5">
                    <div class="h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000 relative shadow-[0_0_20px_rgba(37,99,235,0.3)]" style="width: ${optPct}%">
                        <div class="absolute inset-0 bg-white/20 animate-pulse"></div>
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    closeLiveDashboard() {
        clearInterval(this.liveInterval);
        const overlay = document.getElementById('live-dashboard-overlay');
        if (overlay) overlay.classList.add('hidden');
        document.body.style.overflow = '';
    },
    topicForm(sessionId) {
        const html = `
        <div class="p-8">
            <h3 class="text-xl font-bold text-gray-800 mb-2">Tambah Topik Voting</h3>
            <form id="topic-form" class="space-y-5">
                <input type="hidden" id="t-session-id" value="${sessionId}">
                <div>
                    <label class="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Judul Voting *</label>
                    <input type="text" id="t-judul" class="w-full border border-gray-200 rounded-2xl px-5 py-3.5 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium" placeholder="Contoh: Pemilihan Ketua Pengurus" required>
                </div>
                <div>
                    <label class="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Deskripsi (Opsional)</label>
                    <textarea id="t-deskripsi" class="w-full border border-gray-200 rounded-2xl px-5 py-3.5 text-sm focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all font-medium" rows="2" placeholder="Detail informasi topik..."></textarea>
                </div>
                <div>
                    <label class="flex items-center gap-2 cursor-pointer mb-2">
                        <input type="checkbox" id="t-is-election" onchange="RATPage.toggleElectionType(this.checked)" class="w-4 h-4 rounded text-primary-600">
                        <span class="text-xs font-black uppercase text-gray-400 tracking-widest">Opsi Bebas (Pilih dari Anggota)</span>
                    </label>
                </div>
                <div id="options-manual-container">
                    <label class="block text-xs font-black uppercase text-gray-400 tracking-widest mb-2">Opsi Jawaban (Min. 2)</label>
                    <div id="options-container" class="space-y-3">
                        <div class="flex gap-2"><input type="text" class="topic-opt w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium" placeholder="Opsi 1" required></div>
                        <div class="flex gap-2"><input type="text" class="topic-opt w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium" placeholder="Opsi 2" required></div>
                    </div>
                    <button type="button" onclick="RATPage.addOptionInput()" class="mt-3 text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"><i class="ri-add-circle-line text-lg"></i> Tambah Opsi Lain</button>
                </div>
                <div class="flex justify-end gap-3 pt-6 border-t mt-4">
                    <button type="button" onclick="App.closeModal()" class="px-6 py-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-500 hover:bg-gray-50">Batal</button>
                    <button type="submit" class="px-10 py-3 bg-gray-900 hover:bg-black text-white rounded-2xl text-sm font-bold shadow-xl shadow-gray-200">Simpan Topik</button>
                </div>
            </form>
        </div>`;
        App.openModal(html);
        const form = document.getElementById('topic-form');
        if (!form) return;
        document.getElementById('topic-form').onsubmit = e => { e.preventDefault(); this.saveTopic(); };
    },

    toggleElectionType(isElection) {
        const manual = document.getElementById('options-manual-container');
        if (isElection) {
            manual.classList.add('opacity-40', 'pointer-events-none');
            manual.querySelectorAll('input').forEach(i => i.required = false);
        } else {
            manual.classList.remove('opacity-40', 'pointer-events-none');
            manual.querySelectorAll('input').forEach(i => i.required = true);
        }
    },

    addOptionInput() {
        const div = document.createElement('div');
        div.className = 'flex gap-2 animate-slideInLeft';
        const num = document.querySelectorAll('.topic-opt').length + 1;
        div.innerHTML = `<input type="text" class="topic-opt w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-primary-500" placeholder="Opsi ${num}"><button type="button" onclick="this.parentElement.remove()" class="text-rose-500 p-2"><i class="ri-delete-bin-line"></i></button>`;
        document.getElementById('options-container').appendChild(div);
    },

    async saveTopic() {
        const sessionId = document.getElementById('t-session-id').value;
        const isElection = document.getElementById('t-is-election').checked;
        const options = isElection ? [] : Array.from(document.querySelectorAll('.topic-opt')).map(i => i.value).filter(v => v.trim() !== '');

        if (!isElection && options.length < 2) return App.toast('Minimal 2 opsi diperlukan', 'error');

        const body = {
            judul: document.getElementById('t-judul').value,
            deskripsi: document.getElementById('t-deskripsi').value,
            is_member_election: isElection ? 1 : 0,
            options: options
        };

        const res = await App.api(`rat/${sessionId}/add-topic`, { method: 'POST', body });
        if (res?.success) {
            App.closeModal();
            App.toast('Topik voting ditambahkan', 'success');
            this.loadTopics(sessionId);
        } else {
            App.toast(res?.message || 'Gagal menyimpan topik', 'error');
        }
    },

    form(id = null) {
        const html = `
        <div class="p-8">
            <h3 class="text-xl font-bold text-gray-800 mb-6">${id ? 'Edit Sesi RAT' : 'Buat Sesi RAT Baru'}</h3>
            <form id="rat-form" class="space-y-4">
                <input type="hidden" id="f-id" value="${id || ''}">
                <div><label class="block text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">Judul Rapat *</label><input type="text" id="f-judul" class="w-full border border-gray-200 rounded-2xl px-5 py-3.5 text-sm font-medium" required></div>
                <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">Tanggal *</label><input type="date" id="f-tanggal" class="w-full border border-gray-200 rounded-2xl px-5 py-3.5 text-sm font-medium" required></div>
                    <div><label class="block text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">Status</label><select id="f-status" class="w-full border border-gray-200 rounded-2xl px-5 py-3.5 text-sm font-medium"><option value="persiapan">Persiapan</option><option value="aktif">Aktif (Live)</option><option value="selesai">Selesai</option></select></div>
                </div>
                <div><label class="block text-xs font-black uppercase text-gray-400 mb-2 tracking-widest">Lokasi</label><input type="text" id="f-lokasi" class="w-full border border-gray-200 rounded-2xl px-5 py-3.5 text-sm font-medium" placeholder="Gedung / Link Meeting"></div>
                <div class="flex justify-end gap-3 pt-6"><button type="button" onclick="App.closeModal()" class="px-6 py-3 border border-gray-200 rounded-2xl text-sm font-bold text-gray-500">Batal</button><button type="submit" class="px-10 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl text-sm font-bold">Simpan Sesi</button></div>
            </form>
        </div>`;
        App.openModal(html);
        if (id) this.loadForm(id); else {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('f-tanggal').value = today;
        }
        document.getElementById('rat-form').onsubmit = e => { e.preventDefault(); this.save(); };
    },

    async loadForm(id) {
        const res = await App.api('rat/' + id);
        if (!res?.success) return;
        const s = res.data;
        document.getElementById('f-judul').value = s.judul;
        document.getElementById('f-tanggal').value = s.tanggal;
        document.getElementById('f-status').value = s.status;
        document.getElementById('f-lokasi').value = s.lokasi || '';
    },

    async save() {
        const id = document.getElementById('f-id').value;
        const body = {
            judul: document.getElementById('f-judul').value,
            tanggal: document.getElementById('f-tanggal').value,
            status: document.getElementById('f-status').value,
            lokasi: document.getElementById('f-lokasi').value
        };
        const res = await App.api(id ? `rat/${id}` : 'rat', { method: id ? 'PUT' : 'POST', body });
        if (res?.success) { App.closeModal(); App.toast(res.message, 'success'); if (App.currentRoute === 'rat' && !id) this.loadList(document.getElementById('app-content')); else location.reload(); }
        else App.toast(res?.message || 'Gagal menyimpan', 'error');
    },

    async del(id, judul) {
        const ok = await App.confirm('Hapus Sesi', `Yakin ingin menghapus sesi rapat "${judul}"? Semua data presensi dan voting akan hilang.`);
        if (!ok) return;
        const res = await App.api(`rat/${id}`, { method: 'DELETE' });
        if (res?.success) { App.toast(res.message, 'success'); this.loadList(document.getElementById('app-content'), this.page); }
        else App.toast(res?.message || 'Gagal menghapus', 'error');
    },

    async printReport(id) {
        if (typeof window.jspdf === 'undefined') {
            App.toast('Library pembuat PDF belum termuat', 'error');
            return;
        }

        Swal.fire({ title: 'Menyiapkan Laporan...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        try {
            // Fetch comprehensive data
            const [sessionRes, attendanceRes, topicsRes] = await Promise.all([
                App.api(`rat/${id}`),
                App.api(`rat/${id}/attendance`),
                App.api(`rat/${id}/topics`)
            ]);

            if (!sessionRes?.success || !attendanceRes?.success || !topicsRes?.success) {
                throw new Error('Gagal mengambil data laporan');
            }

            const s = sessionRes.data;
            const att = attendanceRes.data;
            const tops = topicsRes.data;

            const doc = new window.jspdf.jsPDF();
            const pageWidth = doc.internal.pageSize.getWidth();
            let y = 15;

            // HEADER
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.text('LAPORAN HASIL RAPAT ANGGOTA TAHUNAN (RAT)', pageWidth / 2, y, { align: 'center' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            y += 8;
            doc.text('KOPERASI SIMPAN PINJAM', pageWidth / 2, y, { align: 'center' });

            y += 5;
            doc.setLineWidth(0.5);
            doc.line(14, y, pageWidth - 14, y);
            y += 10;

            // INFO SESI
            doc.setFont('helvetica', 'bold');
            doc.text('I. Keterangan Sesi', 14, y);
            doc.setFont('helvetica', 'normal');
            y += 6;
            doc.text(`Judul RAT : ${s.judul}`, 14, y); y += 6;
            doc.text(`Tanggal   : ${App.formatDate(s.tanggal)}`, 14, y); y += 6;
            doc.text(`Lokasi    : ${s.lokasi || '-'}`, 14, y); y += 6;
            doc.text(`Status    : ${s.status.toUpperCase()}`, 14, y); y += 10;

            // STATISTIK KEHADIRAN
            doc.setFont('helvetica', 'bold');
            doc.text('II. Statistik Kehadiran', 14, y); y += 6;
            doc.setFont('helvetica', 'normal');

            const totalAnggota = s.total_anggota || 0;
            const hadir = att.length;
            const kuorum = totalAnggota > 0 ? Math.round((hadir / totalAnggota) * 100) + '%' : '0%';

            const tableDataKehadiran = [
                ['Total Anggota Koperasi', totalAnggota],
                ['Anggota Hadir', hadir],
                ['Tingkat Partisipasi (Kuorum)', kuorum]
            ];

            doc.autoTable({
                startY: y,
                body: tableDataKehadiran,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] },
                margin: { left: 14, right: 14 }
            });
            y = doc.lastAutoTable.finalY + 10;

            // HASIL VOTING
            doc.setFont('helvetica', 'bold');
            doc.text('III. Hasil Pemungutan Suara (Voting)', 14, y); y += 6;

            if (tops.length === 0) {
                doc.setFont('helvetica', 'normal');
                doc.text('Tidak ada topik voting pada sesi ini.', 14, y);
                y += 10;
            } else {
                tops.forEach((t) => {
                    if (y > 250) { doc.addPage(); y = 20; }

                    doc.setFont('helvetica', 'bold');
                    doc.text(`Topik: ${t.judul}`, 14, y); y += 5;
                    doc.setFont('helvetica', 'normal');

                    const abstain = Math.max(0, hadir - t.total_votes);

                    const tData = t.options.map(o => [
                        o.label,
                        o.votes + ' Suara',
                        hadir > 0 ? Math.round((o.votes / hadir) * 100) + '%' : '0%'
                    ]);

                    tData.push(['Abstain / Tidak Memilih', abstain + ' Suara', hadir > 0 ? Math.round((abstain / hadir) * 100) + '%' : '0%']);

                    doc.autoTable({
                        startY: y,
                        head: [['Opsi Jawaban', 'Jumlah Suara Masuk', 'Persentase (dari Hadir)']],
                        body: tData,
                        theme: 'striped',
                        headStyles: { fillColor: [55, 65, 81] },
                        margin: { left: 14, right: 14 },
                        columnStyles: {
                            0: { cellWidth: 90 },
                            1: { cellWidth: 40, halign: 'center' },
                            2: { cellWidth: 40, halign: 'center' }
                        }
                    });
                    y = doc.lastAutoTable.finalY + 10;
                });
            }

            // TANDA TANGAN (always at the end of voting)
            if (y > 240) { doc.addPage(); y = 20; }
            doc.setFont('helvetica', 'normal');
            const todayStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });
            doc.text(`...................., ${todayStr}`, pageWidth - 70, y); y += 10;

            doc.text('Mengetahui / Mengesahkan,', 14, y);
            doc.text('Pengurus Koperasi', pageWidth - 70, y);

            y += 30;
            doc.text('(........................................)', 14, y);
            doc.text('Ketua Koperasi', 20, y + 5);

            doc.text('(........................................)', pageWidth - 70, y);
            doc.text('Sekretaris', pageWidth - 60, y + 5);

            // DAFTAR HADIR (Lampiran di halaman baru)
            doc.addPage(); y = 20;
            doc.setFont('helvetica', 'bold');
            doc.text('LAMPIRAN: Daftar Anggota Hadir', 14, y); y += 6;

            const hadirData = att.map((a, i) => [
                i + 1,
                a.no_anggota,
                a.nama,
                new Date(a.waktu_hadir).toLocaleString('id-ID')
            ]);

            doc.autoTable({
                startY: y,
                head: [['No', 'Nomor Anggota', 'Nama Anggota', 'Waktu Kehadiran']],
                body: hadirData.length ? hadirData : [['-', '-', 'Belum ada data kehadiran', '-']],
                theme: 'grid',
                headStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0] },
                margin: { left: 14, right: 14 }
            });

            // SAVE (Open in new tab instead of download)
            const pdfUrl = doc.output('bloburl');
            window.open(pdfUrl, '_blank');
            Swal.close();
            App.toast('Laporan PDF berhasil dibuka di tab baru', 'success');

        } catch (e) {
            console.error(e);
            Swal.fire('Gagal', e.message || 'Terjadi kesalahan saat membuat PDF', 'error');
        }
    },

    paginate(p) { this.loadList(document.getElementById('app-content'), p); }
};

window.RATPage = RATPage;
export default RATPage;
