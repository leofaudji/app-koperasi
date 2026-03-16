// Audit Page - Rekonsiliasi & Log Aktivitas
const AuditPage = {
    data: null,
    orphans: [],
    anomalies: [],
    discrepancies: [],
    logs: [],
    pagination: { page: 1, per_page: 20, total: 0 },
    activeTab: 'summary', // 'summary' or 'logs'
    searchLog: '',

    async render(container) {
        App.setTitle('Audit Saldo', 'Pengawasan Keuangan & Integritas Data');
        this.container = container;
        this.load();
    },

    async load() {
        this.container.innerHTML = `<div class="flex items-center justify-center h-64"><div class="animate-spin w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full"></div></div>`;

        try {
            if (this.activeTab === 'summary') {
                // Load reconciliation data
                const res = await App.api('audit/reconcile');
                if (res?.success) this.data = res.data;

                // Load orphan records data
                const resOrp = await App.api('audit/orphans');
                this.orphans = resOrp?.success ? resOrp.data : [];

                // Load anomalies data
                const resAno = await App.api('audit/anomalies');
                this.anomalies = resAno?.success ? resAno.data : [];

                // Load discrepancies (fraud detection)
                const resDis = await App.api('audit/discrepancies');
                this.discrepancies = resDis?.success ? resDis.data : [];
            } else {
                // Load Activity Logs
                const resLogs = await App.api('audit/logs', {
                    page: this.pagination.page,
                    search: this.searchLog
                });
                if (resLogs?.success) {
                    this.logs = resLogs.data;
                    this.pagination = resLogs.pagination;
                }
            }

            // Load health score
            const resHealth = await App.api('audit/health');
            this.health = resHealth?.success ? resHealth.data : { score: 100, status: 'Sehat', color: 'emerald', penalties: [] };

            this.renderAll();
        } catch (e) {
            console.error(e);
            this.container.innerHTML = `<div class="p-6 text-center text-red-500">Gagal memuat data audit. Silakan coba lagi.</div>`;
        }
    },

    renderAll() {
        let html = `
        <div class="space-y-6 animate-fadeIn pb-20">
            <!-- Tabs Navigation -->
            <div class="flex items-center gap-1 bg-gray-100 p-1.5 rounded-2xl w-fit">
                <button onclick="AuditPage.switchTab('summary')" class="px-6 py-2 rounded-xl text-sm font-bold transition-all ${this.activeTab === 'summary' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">
                    <i class="ri-dashboard-3-line mr-1"></i> Ringkasan Audit
                </button>
                <button onclick="AuditPage.switchTab('logs')" class="px-6 py-2 rounded-xl text-sm font-bold transition-all ${this.activeTab === 'logs' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">
                    <i class="ri-history-line mr-1"></i> Log Aktivitas
                </button>
            </div>

            ${this.activeTab === 'summary' ? this.renderSummary() : this.renderLogs()}
        </div>`;

        this.container.innerHTML = html;
    },

    renderSummary() {
        const d = this.data || [];
        const o = this.orphans;
        const a = this.anomalies;
        const dis = this.discrepancies;

        return `
            ${this.renderHealthScore()}
            
            <!-- Reconciliation Table -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">Rekonsiliasi Saldo</h2>
                        <p class="text-sm text-gray-500">Memastikan total saldo di modul sama dengan saldo di Neraca (GL)</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="AuditPage.exportComprehensivePDF()" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm shadow-primary-100 mr-2">
                            <i class="ri-file-list-3-line text-lg"></i> Laporan Komprehensif
                        </button>
                        <button onclick="AuditPage.exportPDF()" class="p-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors" title="Export PDF">
                            <i class="ri-file-pdf-line text-xl"></i>
                        </button>
                        <button onclick="AuditPage.load()" class="p-2.5 text-gray-400 hover:bg-gray-100 rounded-xl transition-all" title="Refresh Data">
                            <i class="ri-refresh-line text-xl"></i>
                        </button>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                                <th class="px-4 py-3 text-left">Kategori</th>
                                <th class="px-4 py-3 text-left">Akun Neraca</th>
                                <th class="px-4 py-3 text-right">Saldo Modul</th>
                                <th class="px-4 py-3 text-right">Saldo Neraca</th>
                                <th class="px-4 py-3 text-right">Selisih</th>
                                <th class="px-4 py-3 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
                            ${d.length ? d.map(item => {
            const hasDiff = Math.abs(item.selisih) > 0.01;
            return `
                                <tr class="hover:bg-gray-50/50 transition-colors">
                                    <td class="px-4 py-4">
                                        <div class="font-bold text-gray-700">${item.kategori}</div>
                                        <div class="text-[10px] text-gray-400 font-medium">${item.nama}</div>
                                    </td>
                                    <td class="px-4 py-4 text-gray-500 font-medium">${item.akun}</td>
                                    <td class="px-4 py-4 text-right font-mono font-bold text-gray-700">${App.formatRupiah(item.saldo_modul)}</td>
                                    <td class="px-4 py-4 text-right font-mono font-bold text-gray-700">${App.formatRupiah(item.saldo_gl)}</td>
                                    <td class="px-4 py-4 text-right font-mono font-bold ${hasDiff ? 'text-red-600' : 'text-emerald-600'}">
                                        ${App.formatRupiah(item.selisih)}
                                    </td>
                                    <td class="px-4 py-4 text-center">
                                        ${hasDiff ?
                    `<span class="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm shadow-red-100 animate-pulse">Selisih</span>` :
                    `<span class="px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm shadow-emerald-100">OK</span>`
                }
                                    </td>
                                </tr>
                                `;
        }).join('') : `<tr><td colspan="6" class="p-6 text-center text-gray-400">Tidak ada data rekonsiliasi</td></tr>`}
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Discrepancies (Amount Mismatch) -->
            ${dis.length > 0 ? `
                <div class="bg-red-50 rounded-2xl border border-red-100 p-6 animate-shake">
                    <div class="mb-4 flex items-center gap-2">
                        <i class="ri-shield-flash-line text-red-600 text-2xl"></i>
                        <h2 class="text-lg font-bold text-red-800">Peringatan: Selisih Nominal Transaksi vs Jurnal</h2>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${dis.map(item => `
                            <div class="bg-white p-4 rounded-xl border border-red-200 shadow-sm relative overflow-hidden">
                                <div class="absolute top-0 right-0 w-16 h-16 bg-red-50 -mr-8 -mt-8 rounded-full"></div>
                                <div class="relative">
                                    <div class="flex justify-between items-start mb-2">
                                        <span class="text-[10px] bg-red-600 text-white px-2 py-0.5 rounded-full font-bold uppercase">${item.tipe}</span>
                                        <span class="text-[10px] text-gray-400">${item.tgl}</span>
                                    </div>
                                    <h4 class="font-bold text-gray-800">${item.no}</h4>
                                    <p class="text-[11px] text-red-600 font-bold mt-1">${item.info}</p>
                                    <p class="text-[11px] text-gray-500 mt-1">${item.masalah}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Orphans & Anomalies Grid -->
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <!-- Orphan Records -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div class="mb-6">
                        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                             <i class="ri-link-unlink-m text-amber-500"></i> Integritas Data
                        </h2>
                        <p class="text-xs text-gray-500">Transaksi operasional tanpa jurnal atau sebaliknya</p>
                    </div>

                    ${o.length === 0 ? `
                        <div class="flex flex-col items-center justify-center py-8 text-center bg-emerald-50/30 rounded-xl border border-dashed border-emerald-100">
                            <i class="ri-checkbox-circle-fill text-emerald-500 text-2xl mb-2"></i>
                            <h3 class="text-sm font-bold text-gray-700">Semua Data Sinkron</h3>
                        </div>
                    ` : `
                        <div class="space-y-3">
                            ${o.map(item => `
                                <div class="p-3 bg-red-50/50 rounded-xl border border-red-100 flex gap-3">
                                    <div class="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <i class="ri-error-warning-fill"></i>
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <div class="flex justify-between items-start">
                                            <span class="text-[10px] font-bold text-red-600 uppercase tracking-wider">${item.tipe}</span>
                                            <span class="text-[10px] text-gray-400">${item.tgl}</span>
                                        </div>
                                        <div class="font-bold text-gray-700 text-sm truncate">${item.no}</div>
                                        <div class="text-[11px] text-red-500 font-medium mt-1 leading-relaxed">${item.masalah}</div>
                                        
                                        <div class="mt-3 flex justify-end">
                                            ${item.tipe.startsWith('Jurnal') ? `
                                                <button onclick="AuditPage.deleteOrphanJournal('${item.id}')" class="px-3 py-1.5 bg-gray-100 hover:bg-red-600 hover:text-white text-gray-600 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 group">
                                                    <i class="ri-delete-bin-line group-hover:animate-bounce"></i> Hapus Jurnal Yatim
                                                </button>
                                            ` : `
                                                <button onclick="AuditPage.fixOrphan('${item.tipe}', '${item.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-100">
                                                    <i class="ri-magic-line"></i> Fix (Generate Jurnal)
                                                </button>
                                            `}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>

                <!-- Anomaly Detection -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                    <div class="mb-6">
                        <h2 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <i class="ri-radar-line text-primary-500"></i> Deteksi Anomali
                        </h2>
                        <p class="text-xs text-gray-500">Pola transaksi tidak wajar atau kesalahan input</p>
                    </div>

                    ${a.length === 0 ? `
                        <div class="flex flex-col items-center justify-center py-8 text-center bg-primary-50/30 rounded-xl border border-dashed border-primary-100">
                            <i class="ri-shield-check-fill text-primary-500 text-2xl mb-2"></i>
                            <h3 class="text-sm font-bold text-gray-700">Tidak Ada Anomali</h3>
                        </div>
                    ` : `
                        <div class="space-y-3">
                            ${a.map(item => `
                                <div class="p-3 bg-amber-50/50 rounded-xl border border-amber-100 flex gap-3">
                                    <div class="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <i class="ri-alarm-warning-fill"></i>
                                    </div>
                                    <div class="min-w-0 flex-1">
                                        <div class="flex justify-between items-start">
                                            <span class="px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded text-[9px] font-black uppercase tracking-tighter">${item.tipe}</span>
                                        </div>
                                        <div class="font-bold text-gray-700 text-sm mt-1">${item.no}</div>
                                        <div class="text-[11px] text-amber-700 font-medium mt-1 flex items-start gap-1">
                                            <i class="ri-information-fill flex-shrink-0"></i> ${item.alasan}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `}
                </div>
            </div>`;
    },

    renderLogs() {
        return `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                    <div>
                        <h2 class="text-xl font-bold text-gray-800">Log Aktivitas</h2>
                        <p class="text-sm text-gray-500">Riwayat perubahan data transaksi koperasi</p>
                    </div>
                    <div class="flex items-center gap-2 w-full sm:w-auto">
                        <div class="relative flex-1 sm:w-64">
                            <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" value="${this.searchLog}" 
                                onkeyup="if(event.key==='Enter')AuditPage.search(this.value)" 
                                placeholder="Cari log..." 
                                class="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500">
                        </div>
                        <button onclick="AuditPage.load()" class="p-2.5 text-gray-400 hover:bg-gray-100 rounded-xl">
                            <i class="ri-refresh-line text-xl"></i>
                        </button>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest border-b border-gray-100">
                                <th class="px-4 py-3 text-left">Waktu</th>
                                <th class="px-4 py-3 text-left">User</th>
                                <th class="px-4 py-3 text-left">Aksi</th>
                                <th class="px-4 py-3 text-left">Objek</th>
                                <th class="px-4 py-3 text-left">Detail Perubahan</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
                            ${this.logs.length ? this.logs.map(log => {
            const newData = JSON.parse(log.new_data || '{}');
            return `
                                <tr class="hover:bg-gray-50/50 transition-colors">
                                    <td class="px-4 py-4 whitespace-nowrap">
                                        <div class="font-bold text-gray-700">${App.formatDate(log.created_at)}</div>
                                        <div class="text-[10px] text-gray-400">${log.created_at.split(' ')[1]}</div>
                                    </td>
                                    <td class="px-4 py-4">
                                        <div class="font-bold text-gray-700">${log.user_nama}</div>
                                        <div class="text-[10px] text-gray-400">${log.ip_address}</div>
                                    </td>
                                    <td class="px-4 py-4">
                                        <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase ${log.action === 'create' ? 'bg-emerald-100 text-emerald-600' :
                    log.action === 'update' ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'
                }">${log.action}</span>
                                    </td>
                                    <td class="px-4 py-4">
                                        <div class="font-bold text-gray-700 capitalize">${log.table_name}</div>
                                        <div class="text-[10px] text-gray-400">ID: ${log.record_id}</div>
                                    </td>
                                    <td class="px-4 py-4">
                                        <div class="text-[11px] text-gray-600 leading-relaxed max-w-xs truncate">
                                            ${Object.entries(newData).map(([k, v]) => `<b>${k}:</b> ${v}`).join(', ')}
                                        </div>
                                    </td>
                                </tr>`;
        }).join('') : '<tr><td colspan="5" class="p-6 text-center text-gray-400">Tidak ada log aktivitas</td></tr>'}
                        </tbody>
                    </table>
                </div>

                <div class="mt-8 flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                    <div class="text-xs text-gray-500">
                        Menampilkan <span class="font-black text-gray-700">${this.logs.length}</span> log
                    </div>
                    <div class="flex gap-2">
                        <button onclick="AuditPage.changePage(${this.pagination.page - 1})" 
                            ${this.pagination.page <= 1 ? 'disabled' : ''} 
                            class="p-2 bg-white border border-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:border-primary-500 transition-colors">
                            <i class="ri-arrow-left-s-line"></i>
                        </button>
                        <div class="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold font-mono">
                            ${this.pagination.page} / ${this.pagination.total_pages}
                        </div>
                        <button onclick="AuditPage.changePage(${this.pagination.page + 1})" 
                            ${this.pagination.page >= this.pagination.total_pages ? 'disabled' : ''} 
                            class="p-2 bg-white border border-gray-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:border-primary-500 transition-colors">
                            <i class="ri-arrow-right-s-line"></i>
                        </button>
                    </div>
                </div>
            </div>`;
    },

    renderHealthScore() {
        const h = this.health || { score: 100, status: 'Sehat', color: 'emerald', penalties: [] };

        // Map color to tailwind classes
        const colors = {
            emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', progress: 'bg-emerald-500', icon: 'ri-checkbox-circle-fill' },
            primary: { bg: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-100', progress: 'bg-primary-500', icon: 'ri-check-double-line' },
            amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', progress: 'bg-amber-500', icon: 'ri-error-warning-fill' },
            red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-100', progress: 'bg-red-500', icon: 'ri-shield-flash-line' }
        };

        const c = colors[h.color] || colors.primary;

        return `
        <div class="${c.bg} rounded-2xl border ${c.border} p-6 flex flex-col md:flex-row gap-8 items-center justify-between">
            <div class="flex items-center gap-6">
                <!-- Circular progress simplified as a numeric gauge -->
                <div class="relative w-24 h-24 flex items-center justify-center bg-white rounded-full shadow-inner border-4 ${c.border}">
                    <div class="text-3xl font-black ${c.text}">${h.score}</div>
                    <div class="absolute -bottom-2 px-2 py-0.5 bg-white border ${c.border} rounded-full text-[8px] font-black uppercase tracking-tighter shadow-sm">SCORE</div>
                </div>
                
                <div>
                    <div class="flex items-center gap-2 mb-1">
                        <i class="${c.icon} ${c.text} text-xl"></i>
                        <h3 class="text-xl font-black ${c.text} uppercase tracking-tight">${h.status}</h3>
                    </div>
                    <p class="text-sm ${c.text} opacity-70">Status Kesehatan Data & Integritas Koperasi</p>
                </div>
            </div>
            
            <div class="flex-1 w-full max-w-md">
                <div class="text-[10px] font-black uppercase text-gray-400 mb-2 tracking-widest flex justify-between">
                    <span>Penilaian Berjalan</span>
                    <span>${h.score}%</span>
                </div>
                <div class="w-full h-3 bg-white/50 rounded-full overflow-hidden border border-gray-100">
                    <div class="h-full ${c.progress} transition-all duration-1000 shadow-sm" style="width: ${h.score}%"></div>
                </div>
                
                <div class="mt-4 flex flex-wrap gap-2">
                    ${h.penalties.length ? h.penalties.map(p => `
                        <div class="px-3 py-1 bg-white/50 border ${c.border} rounded-lg flex items-center gap-2">
                            <span class="text-[10px] font-bold text-gray-600">${p.label}</span>
                            <span class="text-[10px] font-black text-red-600">${p.points}</span>
                        </div>
                    `).join('') : `<div class="text-[10px] italic text-emerald-600 font-bold flex items-center gap-1"><i class="ri-medal-fill"></i> Sempurna! Tidak ada penalti integritas ditemukan.</div>`}
                </div>
            </div>
        </div>`;
    },

    switchTab(tab) {
        this.activeTab = tab;
        this.pagination.page = 1;
        this.load();
    },

    search(query) {
        this.searchLog = query;
        this.pagination.page = 1;
        this.load();
    },

    changePage(p) {
        this.pagination.page = p;
        this.load();
    },

    async fixOrphan(type, id) {
        if (!await App.confirm(`Konfirmasi Automate Fix?`, `Sistem akan mencoba membuat ulang jurnal untuk transaksi ${type} ini secara otomatis.`)) return;
        App.loading(true);
        const res = await App.api('audit/fix-orphan', { type, id }, 'POST');
        App.loading(false);
        if (res?.success) {
            App.notification('Success', 'Jurnal berhasil dibangkitkan ulang.', 'success');
            this.load();
        }
    },

    async deleteOrphanJournal(id) {
        if (!await App.confirm(`Hapus Jurnal Yatim?`, `Jurnal ini merujuk ke data yang sudah dihapus. Apakah Anda yakin ingin menghapus jurnal ini juga?`)) return;
        App.loading(true);
        const res = await App.api('audit/delete-orphan-journal', { id }, 'POST');
        App.loading(false);
        if (res?.success) {
            App.notification('Success', 'Jurnal yatim berhasil dihapus.', 'success');
            this.load();
        }
    },

    exportComprehensivePDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        const tableStyle = {
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8, fontStyle: 'bold', halign: 'center' },
            bodyStyles: { fontSize: 7, textColor: [51, 65, 85] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 14, right: 14 }
        };

        const title = 'Laporan Audit Komprehensif';

        // Use App helpers for consistent branding
        const drawPageDecoration = () => {
            App.drawPDFHeader(doc, title);
            App.drawPDFFooter(doc);
        };

        drawPageDecoration();
        let finalY = 45;

        // Section 1: Reconciliation
        doc.setFontSize(10).setFont('helvetica', 'bold').text('1. REKONSILIASI SALDO MODUL VS GL', 14, finalY);
        const d = this.data || [];
        const reconRows = d.map(item => [item.kategori, item.nama, item.akun, App.formatRupiah(item.saldo_modul), App.formatRupiah(item.saldo_gl), App.formatRupiah(item.selisih), Math.abs(item.selisih) > 0.01 ? 'SELISIH' : 'OK']);
        doc.autoTable({
            startY: finalY + 4,
            head: [['Kategori', 'Nama Akun', 'Kode Akun', 'Saldo Modul', 'Saldo GL', 'Selisih', 'Status']],
            body: reconRows,
            ...tableStyle,
            didDrawPage: drawPageDecoration
        });

        finalY = doc.lastAutoTable.finalY + 12;

        // Section 2: Discrepancies if any
        if (this.discrepancies.length > 0) {
            if (finalY > pageHeight - 40) { doc.addPage(); finalY = 20; }
            doc.setTextColor(220, 38, 38).text('(!) TEMUAN SELISIH NOMINAL TRANS vs JURNAL', 14, finalY).setTextColor(30, 41, 59);
            const disRows = this.discrepancies.map(i => [i.tipe, i.no, i.tgl, i.info]);
            doc.autoTable({
                startY: finalY + 4,
                head: [['Jenis Selisih', 'No Ref', 'Tanggal', 'Keterangan']],
                body: disRows,
                ...tableStyle,
                didDrawPage: drawPageDecoration
            });
            finalY = doc.lastAutoTable.finalY + 12;
        }

        // Section 3: Orphans
        if (finalY > pageHeight - 40) { doc.addPage(); finalY = 20; }
        doc.text('2. INTEGRITAS DATA (ORPHAN RECORDS)', 14, finalY);
        const orpRows = this.orphans.map(item => [item.tipe, item.no, item.tgl, item.masalah]);
        doc.autoTable({
            startY: finalY + 4,
            head: [['Tipe', 'No Transaksi', 'Tanggal', 'Keterangan Masalah']],
            body: orpRows,
            ...tableStyle,
            didDrawPage: drawPageDecoration
        });

        window.open(doc.output('bloburl'), '_blank');
    },

    export(type) {
        if (!this.data) return;
        const columns = [
            { title: 'Kategori', key: 'kategori' },
            { title: 'Nama', key: 'nama' },
            { title: 'Akun Neraca', key: 'akun' },
            { title: 'Saldo Modul', key: 'saldo_modul_fmt', align: 'right' },
            { title: 'Saldo Neraca', key: 'saldo_gl_fmt', align: 'right' },
            { title: 'Selisih', key: 'selisih_fmt', align: 'right' },
            { title: 'Status', key: 'status' }
        ];
        const rows = this.data.map(item => ({
            ...item,
            saldo_modul_fmt: App.formatRupiah(item.saldo_modul),
            saldo_gl_fmt: App.formatRupiah(item.saldo_gl),
            selisih_fmt: App.formatRupiah(item.selisih),
            status: Math.abs(item.selisih) > 0.01 ? 'SELISIH' : 'OK'
        }));
        App.export(type, 'Laporan Rekonsiliasi Saldo', columns, rows, { filename: 'audit_reconcile' });
    }
};

window.AuditPage = AuditPage;
export default AuditPage;
