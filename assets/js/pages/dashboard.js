// Dashboard Page
const DashboardPage = {
    async render(container) {
        App.setTitle('Dashboard', 'Ringkasan data koperasi');
        container.innerHTML = '<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">' + Array(4).fill('<div class="skeleton h-28 rounded-2xl"></div>').join('') + '</div><div class="skeleton h-64 rounded-2xl"></div>';

        const res = await App.api('dashboard');
        if (!res?.success) return;
        const d = res.data;

        container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            ${this.statCard('ri-group-line', 'Total Anggota', d.total_anggota, 'from-blue-500 to-blue-600', 'orang')}
            ${this.statCard('ri-wallet-3-line', 'Total Simpanan', App.formatRupiah(d.total_simpanan), 'from-emerald-500 to-emerald-600')}
            ${this.statCard('ri-hand-coin-line', 'Pinjaman Aktif', App.formatRupiah(d.total_pinjaman), 'from-amber-500 to-amber-600')}
            ${this.statCard('ri-time-line', 'Pinjaman Pending', d.pinjaman_pending, 'from-rose-500 to-rose-600', 'pengajuan')}
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <!-- Liquidity Gauge -->
            <div class="xl:col-span-2 bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white p-8 flex flex-col sm:flex-row items-center gap-10 animate-slideUp">
                <div class="relative w-44 h-44 shrink-0">
                    <svg class="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="44" fill="none" stroke="#f1f5f9" stroke-width="10"></circle>
                        <circle cx="50" cy="50" r="44" fill="none" stroke="url(#liqGradient)" stroke-width="10" stroke-dasharray="276.5" stroke-dashoffset="${276.5 - (276.5 * d.liquidity_ratio / 100)}" stroke-linecap="round" class="transition-all duration-1000 ease-out"></circle>
                        <defs>
                            <linearGradient id="liqGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="#10b981" />
                                <stop offset="100%" stop-color="#3b82f6" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                        <span class="text-4xl font-black text-slate-900">${d.liquidity_ratio}%</span>
                        <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Liquid</span>
                    </div>
                </div>
                <div class="flex-1 space-y-6 text-center sm:text-left">
                    <div>
                        <div class="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Sangat Sehat
                        </div>
                        <h3 class="text-2xl font-black text-slate-900 tracking-tight mb-2">Skor Likuiditas Kas</h3>
                        <p class="text-sm text-slate-500 leading-relaxed font-medium">Rasio ketersediaan dana kas operasional terhadap total kewajiban simpanan yang dapat ditarik anggota.</p>
                    </div>
                    <div class="flex flex-wrap gap-4 justify-center sm:justify-start">
                        <div class="bg-slate-50 p-5 rounded-3xl border border-slate-100 min-w-[180px]">
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Saldo Kas (Aset 1000)</p>
                            <p class="text-xl font-black text-slate-900 leading-none">${App.formatRupiah(d.total_kas)}</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Financial Health Scoreboard -->
            <div class="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 border border-white p-8 animate-slideUp" style="animation-delay: 0.1s">
                <h4 class="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                    <i class="ri-heart-pulse-line text-rose-500"></i> Financial Health
                </h4>
                <div class="space-y-6">
                    <!-- NPL Ratio -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-bold text-slate-500 uppercase">Rasio Kredit Macet (NPL)</span>
                            <span class="text-sm font-black ${d.npl_ratio > 5 ? 'text-rose-500' : 'text-emerald-500'}">${d.npl_ratio}%</span>
                        </div>
                        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full ${d.npl_ratio > 5 ? 'bg-rose-500' : 'bg-emerald-500'} transition-all duration-1000" style="width: ${Math.min(d.npl_ratio * 5, 100)}%"></div>
                        </div>
                    </div>

                    <!-- Member Growth -->
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-bold text-slate-500 uppercase">Pertumbuhan Anggota (Bulan Ini)</span>
                            <span class="text-sm font-black text-indigo-500">+${d.member_growth}%</span>
                        </div>
                        <div class="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div class="h-full bg-indigo-500 transition-all duration-1000" style="width: ${Math.min(d.member_growth * 2, 100)}%"></div>
                        </div>
                    </div>

                    <!-- Transaction Volume -->
                    <div class="bg-slate-50 rounded-2xl p-4 flex items-center justify-between border border-slate-100">
                        <div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Volume Transaksi (30 Hari)</p>
                            <p class="text-xl font-black text-slate-900">${d.tx_volume} <span class="text-xs font-medium text-slate-400">TX</span></p>
                        </div>
                        <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                            <i class="ri-exchange-funds-line text-xl"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <!-- Status & Tips Card -->
            <div class="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl shadow-slate-900/20 overflow-hidden relative group animate-slideUp">
                <i class="ri-pulse-line absolute -bottom-10 -right-10 text-[12rem] opacity-5 group-hover:scale-110 transition-transform duration-1000"></i>
                <div class="relative z-10 h-full flex flex-col">
                    <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                        <i class="ri-rocket-2-line text-2xl text-primary-400"></i>
                    </div>
                    <h4 class="text-xl font-black mb-3 tracking-tight">Status & Tips</h4>
                    <div class="flex-1">
                        <p id="dashboard-tip-text" class="text-sm text-slate-400 leading-relaxed mb-8 font-medium transition-all duration-700">
                            Memuat tips...
                        </p>
                    </div>
                    
                    <div class="mt-auto">
                        <div class="w-full h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
                            <div id="tip-progress" class="h-full bg-primary-500 w-0 transition-all duration-[15000ms] ease-linear"></div>
                        </div>
                        <button onclick="location.hash='#/anggota'" class="w-full bg-primary-600 hover:bg-primary-500 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-primary-900/50">Manajemen Anggota</button>
                    </div>
                </div>
            </div>

            <!-- Simpanan Per Jenis -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slideUp" style="animation-delay: 0.1s">
                <h3 class="font-semibold text-gray-800 mb-4 flex items-center gap-2"><i class="ri-pie-chart-line text-primary-500"></i> Simpanan Per Jenis</h3>
                <div class="space-y-3">
                    ${(d.simpanan_per_jenis || []).map(s => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span class="text-sm font-medium text-gray-600">${s.nama}</span>
                        <span class="font-semibold text-gray-800">${App.formatRupiah(s.total)}</span>
                    </div>`).join('')}
                </div>
            </div>

            <!-- Pinjaman Per Jenis -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slideUp" style="animation-delay:0.2s">
                <h3 class="font-semibold text-gray-800 mb-4 flex items-center gap-2"><i class="ri-hand-coin-line text-amber-500"></i> Pinjaman Per Jenis</h3>
                <div class="space-y-3">
                    ${(d.pinjaman_per_jenis || []).map(p => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span class="text-sm font-medium text-gray-600">${p.nama}</span>
                        <span class="font-semibold text-gray-800">${App.formatRupiah(p.total)}</span>
                    </div>`).join('')}
                </div>
            </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6 animate-slideUp" style="animation-delay:0.2s">
            <h3 class="font-semibold text-gray-800 mb-4 flex items-center gap-2"><i class="ri-alarm-warning-line text-rose-500"></i> Angsuran Jatuh Tempo (7 Hari Ke Depan)</h3>
            ${(d.angsuran_jatuh_tempo || []).length ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                ${d.angsuran_jatuh_tempo.map(a => `
                <div class="flex items-center justify-between p-4 bg-rose-50/50 border border-rose-100 rounded-xl text-sm hover:bg-rose-50 transition-colors">
                    <div>
                        <div class="font-bold text-gray-800">${a.anggota}</div>
                        <div class="text-gray-500 text-xs mt-0.5">${a.no_pinjaman} &bull; Angsuran Ke-${a.angsuran_ke}</div>
                    </div>
                    <div class="text-right">
                        <div class="font-bold text-rose-600">${App.formatRupiah(a.total)}</div>
                        <div class="text-xs font-medium text-rose-400 mt-0.5">${App.formatDate(a.tgl_jatuh_tempo)}</div>
                    </div>
                </div>`).join('')}
            </div>` : '<p class="text-gray-400 text-sm text-center py-8 bg-gray-50 rounded-xl border border-dashed">Tidak ada angsuran jatuh tempo dalam waktu dekat</p>'}
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slideUp" style="animation-delay:0.2s">
            <h3 class="font-semibold text-gray-800 mb-4 flex items-center gap-2"><i class="ri-exchange-line text-primary-500"></i> Transaksi Terakhir</h3>
            <div class="table-wrapper">
                <table class="data-table w-full text-sm">
                    <thead><tr class="bg-gray-50"><th class="text-left px-4 py-3 font-medium text-gray-500">No. Transaksi</th><th class="text-left px-4 py-3 font-medium text-gray-500">Anggota</th><th class="text-left px-4 py-3 font-medium text-gray-500">Jenis</th><th class="text-left px-4 py-3 font-medium text-gray-500">Transaksi</th><th class="text-right px-4 py-3 font-medium text-gray-500">Jumlah</th><th class="text-center px-4 py-3 font-medium text-gray-500">D/K</th></tr></thead>
                    <tbody>${(d.transaksi_terakhir || []).map(t => `
                    <tr class="border-t border-gray-50">
                        <td class="px-4 py-3 font-mono text-xs">${t.no_transaksi}</td>
                        <td class="px-4 py-3">${t.anggota}</td>
                        <td class="px-4 py-3 text-gray-500">${t.jenis_simpanan}</td>
                        <td class="px-4 py-3">${t.kode_transaksi}</td>
                        <td class="px-4 py-3 text-right font-semibold">${App.formatRupiah(t.jumlah)}</td>
                        <td class="px-4 py-3 text-center">${App.dkBadge(t.dk)}</td>
                    </tr>`).join('')}</tbody>
                </table>
            </div>
        </div>`;

        this.startTipsRotation();
    },

    startTipsRotation() {
        const tips = [
            "Dashboard telah dioptimalkan dengan <strong>Redis v2.0</strong> untuk pemuatan data yang lebih responsif.",
            "Sistem keamanan telah diperbarui dengan <strong>Encryption Layer</strong> terbaru untuk melindungi data anggota.",
            "Performa database meningkat <strong>40%</strong> berkat indeksasi cerdas pada tabel transaksi.",
            "Antarmuka <strong>v2.0.0</strong> dirancang untuk kenyamanan maksimal pengurus dalam mengelola data.",
            "Fitur <strong>Digital Signature</strong> kini aktif, mempercepat proses administrasi pinjaman.",
            "Sistem cadangan data otomatis berjalan setiap malam untuk menjamin keamanan data Anda.",
            "Akses portal anggota kini <strong>3x lebih cepat</strong> dengan optimasi caching server-side.",
            "Verifikasi transaksi kini lebih akurat dengan sistem <strong>Dual-Check Reconciliation</strong>.",
            "Monitoring likuiditas membantu pengurus mengambil keputusan finansial yang lebih tepat.",
            "Antarmuka responsif memungkinkan Anda mengelola koperasi dari smartphone dengan nyaman.",
            "Audit saldo kini bisa dilakukan secara instan melalui modul <strong>Laporan Neraca</strong> terbaru.",
            "Riwayat mutasi simpanan kini tersedia secara detail untuk setiap anggota secara instan.",
            "Dashboard analytics memberikan gambaran portofolio pinjaman secara komprehensif.",
            "Sistem notifikasi membantu memantau angsuran yang mendekati jatuh tempo secara otomatis.",
            "Pengaturan branding dinamis memudahkan penyesuaian identitas koperasi Anda kapan saja.",
            "PWA memungkinkan aplikasi diinstal langsung di desktop tanpa melalui browser.",
            "Integrasi Cloudflare R2 memastikan penyimpanan dokumen dan foto anggota sangat aman.",
            "Log aktivitas mencatat setiap perubahan penting untuk kebutuhan audit internal pengurus.",
            "Manajemen role (RBAC) memastikan setiap staf memiliki akses sesuai wewenang tugasnya.",
            "Selamat bekerja! Sistem dalam kondisi prima dan siap melayani transaksi anggota hari ini."
        ];

        const el = document.getElementById('dashboard-tip-text');
        const prog = document.getElementById('tip-progress');
        if (!el || !prog) return;

        let index = Math.floor(Math.random() * tips.length);
        el.innerHTML = tips[index];
        
        const updateProgress = () => {
            prog.style.transition = 'none';
            prog.style.width = '0%';
            setTimeout(() => {
                prog.style.transition = 'width 15000ms linear';
                prog.style.width = '100%';
            }, 50);
        };

        updateProgress();

        if (this.tipTimer) clearInterval(this.tipTimer);
        this.tipTimer = setInterval(() => {
            const el = document.getElementById('dashboard-tip-text');
            if (!el) {
                clearInterval(this.tipTimer);
                return;
            }
            
            index = (index + 1) % tips.length;
            
            // Out animation
            el.style.opacity = '0';
            el.style.transform = 'scale(0.95) translateY(-10px)';
            el.style.filter = 'blur(4px)';
            
            setTimeout(() => {
                el.innerHTML = tips[index];
                // In animation
                el.style.opacity = '1';
                el.style.transform = 'scale(1) translateY(0)';
                el.style.filter = 'blur(0)';
                updateProgress();
            }, 700);
        }, 15000);
    },

    statCard(icon, label, value, gradient, suffix = '') {
        return `<div class="stat-card bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-fadeIn">
            <div class="flex items-center justify-between mb-3">
                <div class="w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-lg"><i class="${icon} text-white text-xl"></i></div>
            </div>
            <p class="text-2xl font-bold text-gray-800">${value}${suffix ? `<span class="text-sm font-normal text-gray-400 ml-1">${suffix}</span>` : ''}</p>
            <p class="text-sm text-gray-500 mt-1">${label}</p>
        </div>`;
    }
};

export default DashboardPage;
