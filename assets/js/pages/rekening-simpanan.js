// Rekening Simpanan Page
const RekeningSimpananPage = {
    async render(container, anggotaId = null, page = 1) {
        App.setTitle('Daftar Rekening Simpanan', 'Manajemen rekening simpanan anggota');

        let url = `rekening-simpanan?page=${page}`;
        if (anggotaId) url += '&anggota_id=' + anggotaId;

        const res = await App.api(url);
        if (!res?.success) return;

        container.innerHTML = `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fadeIn">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 class="font-semibold text-gray-800">Data Rekening</h3>
                        <p class="text-xs text-gray-400 mt-1">Total ${res.pagination.total} rekening terdaftar</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="RekeningSimpananPage.export('pdf')" class="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Export PDF"><i class="ri-file-pdf-line text-lg"></i></button>
                        <button onclick="RekeningSimpananPage.export('csv')" class="p-2.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Export CSV"><i class="ri-file-excel-line text-lg"></i></button>
                        <button onclick="RekeningSimpananPage.form()" class="bg-primary-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 shadow-sm hover:shadow-primary-200 transition-all ml-2">
                            <i class="ri-add-line"></i> Buka Rekening Baru
                        </button>
                    </div>
                </div>

                <div class="table-wrapper">
                    <table class="data-table w-full text-sm">
                        <thead>
                            <tr class="bg-gray-50">
                                <th class="px-4 py-3 text-left font-medium text-gray-500">No. Rekening</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-500">Anggota</th>
                                <th class="px-4 py-3 text-left font-medium text-gray-500">Jenis Simpanan</th>
                                <th class="px-4 py-3 text-right font-medium text-gray-500">Saldo</th>
                                <th class="px-4 py-3 text-center font-medium text-gray-500">Tgl Buka</th>
                                <th class="px-4 py-3 text-center font-medium text-gray-500">Status</th>
                                <th class="px-4 py-3 text-center font-medium text-gray-500">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${res.data.length ? res.data.map(r => `
                                <tr class="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                                    <td class="px-4 py-3 font-mono font-bold text-primary-600">${r.no_rekening}</td>
                                    <td class="px-4 py-3">
                                        <div class="font-medium text-gray-800">${r.anggota_nama}</div>
                                        <div class="text-[0.7rem] text-gray-400 font-mono">${r.no_anggota}</div>
                                    </td>
                                    <td class="px-4 py-3">${r.jenis_simpanan_nama}</td>
                                    <td class="px-4 py-3 text-right font-semibold text-gray-700">${App.formatRupiah(r.saldo)}</td>
                                    <td class="px-4 py-3 text-center text-gray-500">${App.formatDate(r.tgl_buka)}</td>
                                    <td class="px-4 py-3 text-center">${App.statusBadge(r.status)}</td>
                                    <td class="px-4 py-3 text-center">
                                        <div class="flex justify-center gap-1">
                                            <button onclick="location.hash='#/simpanan/mutasi/${r.anggota_id}?rekening_id=${r.id}'" class="p-2 hover:bg-primary-50 rounded-lg text-primary-600 transition-colors" title="Lihat Mutasi">
                                                <i class="ri-history-line"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('') : '<tr><td colspan="7" class="text-center py-10 text-gray-400">Belum ada data rekening</td></tr>'}
                        </tbody>
                    </table>
                </div>
                ${App.renderPagination(res.pagination, 'RekeningSimpananPage.goto')}
            </div>
        `;
    },

    async form() {
        const jenisRes = await App.api('jenis-simpanan');
        const jenisOpts = (jenisRes?.data || []).map(j => `<option value="${j.id}">${j.nama} (${j.kode_numerik || '--'})</option>`).join('');

        App.openModal(`
            <div class="p-6">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                        <i class="ri-add-box-line text-xl"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">Buka Rekening Baru</h3>
                        <p class="text-xs text-gray-400">Cari anggota dan pilih jenis simpanan</p>
                    </div>
                </div>
                
                <form id="rs-form" class="space-y-4">
                    <div class="relative">
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Anggota Koperasi</label>
                        <div class="relative">
                            <i class="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" id="rsf-member-search" class="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" placeholder="Ketik Nama atau No. Anggota..." autocomplete="off" required>
                            <input type="hidden" id="rsf-anggota" required>
                        </div>
                        <!-- Search Results Dropdown -->
                        <div id="rsf-search-results" class="hidden absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-fadeInSmall"></div>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Jenis Simpanan</label>
                        <select id="rsf-jenis" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" required>
                            <option value="">-- Pilih Jenis --</option>
                            ${jenisOpts}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-semibold text-gray-700 mb-1">Tanggal Pembukaan</label>
                        <input type="date" id="rsf-tgl" class="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all" value="${App.todayISO()}" required>
                    </div>

                    <div class="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-2">
                        <div class="flex gap-3">
                            <i class="ri-information-line text-blue-500 mt-0.5"></i>
                            <div class="text-xs text-blue-700 leading-relaxed">
                                Nomor rekening akan digenerate otomatis dengan format <strong>YY.JS.AAAAAAA.NN</strong>.
                                <br>Pastikan data anggota dan jenis simpanan sudah benar.
                            </div>
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 pt-6 border-t mt-6">
                        <button type="button" onclick="App.closeModal()" class="px-6 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Batal</button>
                        <button type="submit" class="px-6 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all">Proses Pembukaan</button>
                    </div>
                </form>
            </div>
        `);

        const searchInput = document.getElementById('rsf-member-search');
        const hiddenInput = document.getElementById('rsf-anggota');
        const resultsBox = document.getElementById('rsf-search-results');
        let searchTimeout;

        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            const query = searchInput.value.trim();
            hiddenInput.value = ''; // Reset ID while typing

            if (query.length < 2) {
                resultsBox.innerHTML = '';
                resultsBox.classList.add('hidden');
                return;
            }

            searchTimeout = setTimeout(async () => {
                const res = await App.api(`anggota?search=${query}&per_page=10`);
                if (!res?.success || !res.data.length) {
                    resultsBox.innerHTML = '<div class="p-4 text-xs text-gray-400 text-center">Anggota tidak ditemukan</div>';
                    resultsBox.classList.remove('hidden');
                    return;
                }

                resultsBox.innerHTML = res.data.map(a => `
                    <div class="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-0 transition-colors" onclick="RekeningSimpananPage.selectMember(${a.id}, '${a.no_anggota}', '${a.nama}')">
                        <div class="text-sm font-bold text-gray-800">${a.nama}</div>
                        <div class="text-xs text-gray-500 font-mono">${a.no_anggota}</div>
                    </div>
                `).join('');
                resultsBox.classList.remove('hidden');
            }, 300);
        });

        // Close results when clicking outside
        document.addEventListener('click', e => {
            if (e.target !== searchInput && e.target !== resultsBox) {
                resultsBox.classList.add('hidden');
            }
        });

        document.getElementById('rs-form').onsubmit = async e => {
            e.preventDefault();
            const anggotaId = hiddenInput.value;
            if (!anggotaId) return App.toast('Harap pilih anggota dari hasil pencarian', 'warning');

            const body = {
                anggota_id: anggotaId,
                jenis_simpanan_id: document.getElementById('rsf-jenis').value,
                tgl_buka: document.getElementById('rsf-tgl').value
            };

            const r = await App.api('rekening-simpanan', { method: 'POST', body });
            if (r?.success) {
                App.closeModal();
                App.swalSuccess('Berhasil!', 'Rekening baru berhasil dibuat: ' + r.data.no_rekening);
                this.render(document.getElementById('app-content'));
            } else {
                App.toast(r?.message || 'Gagal membuat rekening', 'error');
            }
        };
    },

    selectMember(id, no, nama) {
        document.getElementById('rsf-member-search').value = `${no} - ${nama}`;
        document.getElementById('rsf-anggota').value = id;
        document.getElementById('rsf-search-results').classList.add('hidden');
    },

    export(type) {
        App.api('rekening-simpanan?limit=1000').then(res => {
            if (!res?.success) return;
            const columns = [
                { title: 'No. Rekening', key: 'no_rekening' },
                { title: 'Nama Anggota', key: 'anggota_nama' },
                { title: 'No. Anggota', key: 'no_anggota' },
                { title: 'Jenis Simpanan', key: 'jenis_simpanan_nama' },
                { title: 'Saldo', key: 'saldo_fmt', align: 'right' },
                { title: 'Tgl Buka', key: 'tgl_fmt', align: 'center' },
                { title: 'Status', key: 'status_label' }
            ];
            const rows = res.data.map(r => ({
                ...r,
                saldo_fmt: App.formatRupiah(r.saldo),
                tgl_fmt: App.formatDate(r.tgl_buka),
                status_label: (r.status || '-').toUpperCase()
            }));
            App.export(type, 'Daftar Rekening Simpanan', columns, rows, { filename: 'daftar_rekening' });
        });
    },

    async goto(page) {
        const urlParams = new URLSearchParams(location.hash.split('?')[1]);
        const anggotaId = urlParams.get('anggota_id');
        this.render(document.getElementById('app-content'), anggotaId, page);
    }
};

window.RekeningSimpananPage = RekeningSimpananPage;
export default RekeningSimpananPage;
