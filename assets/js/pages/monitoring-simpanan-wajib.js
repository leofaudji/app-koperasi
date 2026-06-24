// Monitoring Simpanan Wajib Page
const MonitoringSimpananWajibPage = {
    data: [],
    year: new Date().getFullYear(),
    searchQuery: '',
    filterStatus: 'all', // 'all', 'debt' (has unpaid), 'clear' (fully paid)

    async render(container) {
        App.setTitle('Monitoring Simpanan Wajib', 'Pencatatan & kepatuhan setoran wajib anggota');
        
        container.innerHTML = `<div class="flex flex-col gap-6 animate-fadeIn">
            <!-- Header Actions -->
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">Matriks Kepatuhan Simpanan Wajib</h3>
                    <p class="text-xs text-gray-400 mt-1">Monitoring status pembayaran simpanan pokok & wajib bulanan</p>
                </div>
                <div class="flex items-center gap-2">
                    <button onclick="MonitoringSimpananWajibPage.export('pdf')" class="bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-red-100 shadow-sm">
                        <i class="ri-file-pdf-line"></i> PDF
                    </button>
                    <button onclick="MonitoringSimpananWajibPage.goToSimpananWajib()" class="bg-primary-600 text-white hover:bg-primary-700 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-sm">
                        <i class="ri-wallet-3-line"></i> Transaksi Wajib
                    </button>
                    <button onclick="MonitoringSimpananWajibPage.export('csv')" class="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 border border-emerald-100 shadow-sm">
                        <i class="ri-file-excel-line"></i> CSV
                    </button>
                    <div class="w-px h-8 bg-gray-200 mx-2"></div>
                    <button onclick="MonitoringSimpananWajibPage.load()" class="bg-white border border-gray-200 text-gray-600 hover:text-primary-600 hover:border-primary-500 p-2.5 rounded-xl transition-all shadow-sm" title="Refresh">
                        <i class="ri-refresh-line text-lg"></i>
                    </button>
                </div>
            </div>

            <!-- Dashboard / Stats Row -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4" id="msw-stats">
                <!-- Summary Card 1 -->
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div class="w-12 h-12 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 text-xl font-bold">
                        <i class="ri-group-line"></i>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Anggota</p>
                        <h4 class="text-xl font-black text-gray-800" id="stat-total-members">0</h4>
                    </div>
                </div>
                <!-- Summary Card 2 -->
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div class="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 text-xl font-bold">
                        <i class="ri-checkbox-circle-line"></i>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Tertib Setoran (Lunas)</p>
                        <h4 class="text-xl font-black text-emerald-600" id="stat-compliant">0</h4>
                    </div>
                </div>
                <!-- Summary Card 3 -->
                <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div class="w-12 h-12 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 text-xl font-bold">
                        <i class="ri-alert-line"></i>
                    </div>
                    <div>
                        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Memiliki Tunggakan</p>
                        <h4 class="text-xl font-black text-rose-600" id="stat-uncompliant">0</h4>
                    </div>
                </div>
            </div>

            <!-- Filter Panel -->
            <div class="bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                <div class="flex flex-col md:flex-row items-end gap-4">
                    <!-- Search Input -->
                    <div class="flex-1 w-full">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Cari Anggota</label>
                        <div class="relative">
                            <input type="text" id="msw-search" class="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 p-2.5 shadow-sm" placeholder="Ketik nama atau nomor anggota..." oninput="MonitoringSimpananWajibPage.handleSearch(this.value)">
                            <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <i class="ri-search-line text-gray-400"></i>
                            </div>
                        </div>
                    </div>
                    <!-- Status Filter -->
                    <div class="w-full md:w-48">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Status Kepatuhan</label>
                        <select id="msw-filter-status" class="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 shadow-sm" onchange="MonitoringSimpananWajibPage.handleStatusChange(this.value)">
                            <option value="all">Semua Status</option>
                            <option value="clear">Lunas Semua</option>
                            <option value="debt">Ada Tunggakan</option>
                        </select>
                    </div>
                    <!-- Year Selection -->
                    <div class="w-full md:w-36">
                        <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Tahun Laporan</label>
                        <select id="msw-year" class="bg-white border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 shadow-sm" onchange="MonitoringSimpananWajibPage.handleYearChange(this.value)">
                            <!-- Dynamic years -->
                        </select>
                    </div>
                </div>
            </div>

            <!-- Table Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-hidden">
                <!-- Legend -->
                <div class="flex items-center gap-6 mb-4 text-xs font-semibold text-gray-500 bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                    <span class="text-gray-400 uppercase text-[9px] tracking-wider font-bold">Keterangan:</span>
                    <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 text-[10px] font-black"><i class="ri-check-line"></i></span> Lunas</span>
                    <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 text-[10px] font-black"><i class="ri-close-line"></i></span> Belum Setor</span>
                    <span class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 text-[10px] font-black">-</span> N/A (Belum Terdaftar)</span>
                </div>

                <div id="msw-table">
                    <div class="flex justify-center py-20">
                        <div class="flex flex-col items-center gap-3">
                            <i class="ri-loader-4-line animate-spin text-4xl text-primary-500"></i>
                            <p class="text-xs text-gray-400 animate-pulse">Menyusun matriks wajib simpanan...</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        this.initYearSelect();
        this.load();
    },

    initYearSelect() {
        const curY = new Date().getFullYear();
        let html = '';
        for (let y = curY; y >= curY - 5; y--) {
            html += `<option value="${y}" ${y === this.year ? 'selected' : ''}>${y}</option>`;
        }
        document.getElementById('msw-year').innerHTML = html;
    },

    async load() {
        const res = await App.api(`simpanan/monitoring-wajib?tahun=${this.year}`);
        if (!res?.success) return;

        this.data = res.data.data;
        this.applyFilters();
    },

    handleSearch(val) {
        this.searchQuery = val || '';
        this.applyFilters();
    },

    handleStatusChange(val) {
        this.filterStatus = val || 'all';
        this.applyFilters();
    },

    handleYearChange(val) {
        this.year = parseInt(val) || new Date().getFullYear();
        this.load();
    },

    goToSimpananWajib() {
        location.hash = '#/simpanan?jenis_simpanan=SW&auto_form=1';
    },

    applyFilters() {
        const q = this.searchQuery.toLowerCase();
        const curMonth = new Date().getMonth() + 1;
        const curYear = new Date().getFullYear();

        const filtered = this.data.filter(r => {
            const matchSearch = (r.nama || '').toLowerCase().includes(q) || 
                                (r.no_anggota || '').toLowerCase().includes(q);

            // Determine if they have any unpaid month for this year so far
            let hasDebt = false;
            const joinDate = moment(r.tgl_daftar);
            const joinYear = joinDate.year();
            const joinMonth = joinDate.month() + 1;

            for (let b = 1; b <= 12; b++) {
                // If it's a future month in the current year, skip
                if (this.year === curYear && b > curMonth) continue;
                
                // If they were not a member yet, skip
                if (this.year < joinYear || (this.year === joinYear && b < joinMonth)) continue;

                // If unpaid
                if (this.getSwMonthAmount(r, b) <= 0) {
                    hasDebt = true;
                    break;
                }
            }

            // Also check Simpanan Pokok
            if (!r.sp_lunas) {
                hasDebt = true;
            }

            const matchStatus = this.filterStatus === 'all' || 
                               (this.filterStatus === 'debt' && hasDebt) || 
                               (this.filterStatus === 'clear' && !hasDebt);

            return matchSearch && matchStatus;
        });

        // Compute Stats based on full data
        let compliantCount = 0;
        let uncompliantCount = 0;

        this.data.forEach(r => {
            let hasDebt = false;
            const joinDate = moment(r.tgl_daftar);
            const joinYear = joinDate.year();
            const joinMonth = joinDate.month() + 1;

            for (let b = 1; b <= 12; b++) {
                if (this.year === curYear && b > curMonth) continue;
                if (this.year < joinYear || (this.year === joinYear && b < joinMonth)) continue;
                if (this.getSwMonthAmount(r, b) <= 0) {
                    hasDebt = true;
                    break;
                }
            }
            if (!r.sp_lunas) hasDebt = true;

            if (hasDebt) uncompliantCount++;
            else compliantCount++;
        });

        document.getElementById('stat-total-members').textContent = this.data.length;
        document.getElementById('stat-compliant').textContent = compliantCount;
        document.getElementById('stat-uncompliant').textContent = uncompliantCount;

        this.renderTable(filtered);
    },

    getSwMonthAmount(r, b) {
        return (r.sw_months && typeof r.sw_months[b] !== 'undefined') ? r.sw_months[b] : 0;
    },

    renderTable(data) {
        const curMonth = new Date().getMonth() + 1;
        const curYear = new Date().getFullYear();
        const monthLabels = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

        const getMonthStatus = (r, b) => {
            const joinDate = moment(r.tgl_daftar);
            const joinYear = joinDate.year();
            const joinMonth = joinDate.month() + 1;

            if (this.year < joinYear || (this.year === joinYear && b < joinMonth)) {
                return { status: 'na', title: `Belum terdaftar (Daftar: ${joinDate.format('DD/MM/YYYY')})` };
            }

            const amt = this.getSwMonthAmount(r, b);
            if (amt > 0) {
                return { status: 'paid', title: `Lunas: ${App.formatRupiah(amt)}` };
            }

            if (this.year === curYear && b > curMonth) {
                return { status: 'future', title: 'Belum waktunya setor' };
            }

            return { status: 'debt', title: 'Belum menyetor simpanan wajib' };
        };

        const renderMonthBadges = (r) => {
            return monthLabels.map((label, index) => {
                const status = getMonthStatus(r, index + 1);
                const classes = {
                    paid: 'bg-emerald-50 border-emerald-200 text-emerald-700',
                    debt: 'bg-rose-50 border-rose-200 text-rose-600',
                    future: 'bg-gray-100 border-gray-200 text-gray-400',
                    na: 'bg-gray-50 border-gray-200 text-gray-300'
                }[status.status];
                return `<span class="inline-flex items-center justify-center rounded-full border px-2 py-1 text-[10px] leading-none ${classes}" title="${label}: ${status.title}">${label}</span>`;
            }).join('<span class="mx-1">&middot;</span>');
        };

        const html = `<div class="table-wrapper overflow-x-auto">
            <table class="data-table w-full text-xs">
                <thead>
                    <tr class="bg-gray-50 text-gray-500 font-medium">
                        <th class="px-4 py-3 text-left w-12">No</th>
                        <th class="px-4 py-3 text-left">Anggota</th>
                        <th class="px-3 py-3 text-center w-24">Simp. Pokok</th>
                        <th class="px-4 py-3 text-center">Kepatuhan 12 Bulan</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    ${data.map((r, i) => `
                        <tr class="hover:bg-gray-50/50 transition-colors">
                            <td class="px-4 py-3.5 text-gray-400">${i + 1}</td>
                            <td class="px-4 py-3.5">
                                <div class="font-bold text-gray-800 leading-tight">${r.nama}</div>
                                <div class="text-[10px] font-mono text-primary-500 mt-0.5">${r.no_anggota}</div>
                            </td>
                            <td class="px-3 py-3.5 text-center">
                                ${r.sp_lunas ? 
                                    `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-[10px]">
                                        <i class="ri-checkbox-circle-line"></i> Lunas
                                     </span>` : 
                                    `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px]">
                                        <i class="ri-error-warning-line"></i> Belum
                                     </span>`
                                }
                            </td>
                            <td class="px-4 py-3.5 text-center space-x-1">
                                ${renderMonthBadges(r)}
                            </td>
                        </tr>
                    `).join('')}
                    ${data.length === 0 ? '<tr><td colspan="4" class="text-center py-10 text-gray-400 italic">Tidak ada data anggota</td></tr>' : ''}
                </tbody>
            </table>
        </div>`;
        document.getElementById('msw-table').innerHTML = html;
    },

    getColumns() {
        return [
            { title: 'No', key: 'no' },
            { title: 'No. Anggota', key: 'no_anggota' },
            { title: 'Nama Anggota', key: 'nama' },
            { title: 'Simp. Pokok', key: 'pokok_status' },
            { title: 'Kepatuhan Bulanan (' + this.year + ')', key: 'compliance' }
        ];
    },

    export(type) {
        if (!this.data.length) return;
        
        const curMonth = new Date().getMonth() + 1;
        const curYear = new Date().getFullYear();

        const formatted = this.data.map((r, i) => {
            const joinDate = moment(r.tgl_daftar);
            const joinYear = joinDate.year();
            const joinMonth = joinDate.month() + 1;

            let swStatuses = [];
            for (let b = 1; b <= 12; b++) {
                const monthName = moment().month(b - 1).format('MMM');
                
                if (this.year < joinYear || (this.year === joinYear && b < joinMonth)) {
                    swStatuses.push(`${monthName}: N/A`);
                } else if (this.getSwMonthAmount(r, b) > 0) {
                    swStatuses.push(`${monthName}: Lunas`);
                } else if (this.year === curYear && b > curMonth) {
                    swStatuses.push(`${monthName}: -`);
                } else {
                    swStatuses.push(`${monthName}: Belum`);
                }
            }

            return {
                no: i + 1,
                no_anggota: r.no_anggota,
                nama: r.nama,
                pokok_status: r.sp_lunas ? 'Lunas' : 'Belum Setor',
                compliance: swStatuses.join(', ')
            };
        });

        App.export(type, `Laporan Kepatuhan Simpanan Wajib (${this.year})`, this.getColumns(), formatted, {
            filename: `kepatuhan_simpanan_wajib_${this.year}`
        });
    }
};

window.LaporanMutasiSimpananPage = undefined; // clear potential namespace leak
window.MonitoringSimpananWajibPage = MonitoringSimpananWajibPage;
export default MonitoringSimpananWajibPage;
