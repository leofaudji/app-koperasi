// Dashboard Page
const DashboardPage = {
    async render(container) {
        App.setTitle('Dashboard', 'Ringkasan data koperasi');
        
        // Premium Skeleton Loader
        container.innerHTML = `
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            ${Array(4).fill(`
                <div class="bg-white rounded-2xl p-5 border border-slate-100">
                    <div class="skeleton w-10 h-10 rounded-xl mb-4"></div>
                    <div class="skeleton w-24 h-6 rounded-md mb-2"></div>
                    <div class="skeleton w-16 h-4 rounded-md"></div>
                </div>
            `).join('')}
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div class="lg:col-span-2 bg-white rounded-[2rem] p-8 border border-slate-100">
                <div class="skeleton w-full h-48 rounded-3xl"></div>
            </div>
            <div class="bg-white rounded-[2rem] p-8 border border-slate-100">
                <div class="skeleton w-full h-48 rounded-3xl"></div>
            </div>
        </div>
        `;

        const res = await App.api('dashboard');
        if (!res?.success) return;
        const d = res.data;

        const trends = d.trends || {};

        // Determine Human-Touch Time Greeting
        const now = new Date();
        const hour = now.getHours();
        let greetingTime = 'Selamat Pagi';
        let greetingEmoji = '🌅';
        let greetingTheme = 'from-amber-500/10 via-orange-500/5 to-transparent border-amber-200/60';
        let greetingBadgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
        
        if (hour >= 11 && hour < 15) {
            greetingTime = 'Selamat Siang';
            greetingEmoji = '☀️';
            greetingTheme = 'from-blue-500/10 via-sky-500/5 to-transparent border-sky-200/60';
            greetingBadgeColor = 'bg-sky-100 text-sky-800 border-sky-200';
        } else if (hour >= 15 && hour < 18) {
            greetingTime = 'Selamat Sore';
            greetingEmoji = '🌤️';
            greetingTheme = 'from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-200/60';
            greetingBadgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';
        } else if (hour >= 18 || hour < 4) {
            greetingTime = 'Selamat Malam';
            greetingEmoji = '🌙';
            greetingTheme = 'from-slate-800/10 via-indigo-950/5 to-transparent border-slate-300/60';
            greetingBadgeColor = 'bg-slate-200 text-slate-800 border-slate-300';
        }

        const userName = App.user?.nama_lengkap || App.user?.username || 'Rekan Pengurus';
        const userRole = App.user?.role_nama || 'Pengurus Koperasi';

        const indonesianDate = new Intl.DateTimeFormat('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).format(now);

        const quotes = [
            { text: "Koperasi bukan sekadar neraca angka, melainkan jembatan gotong royong dan amanah kesejahteraan bersama.", author: "Bung Hatta" },
            { text: "Kejujuran dan ketelitian dalam setiap pembukuan rupiah adalah fondasi kepercayaan seluruh anggota.", author: "Etika Koperasi" },
            { text: "Kemakmuran sejati lahir saat usaha dikelola bersama di atas asas kekeluargaan dan saling menguatkan.", author: "Prinsip Koperasi" },
            { text: "Setiap simpanan anggota adalah benih ketahanan ekonomi umat yang harus dijaga dengan penuh tanggung jawab.", author: "Amanah Kasir" },
            { text: "Pelayanan yang ramah, transparan, dan sigap adalah kunci utama merawat loyalitas anggota.", author: "Filosofi Pelayanan" }
        ];
        const todayQuote = quotes[now.getDate() % quotes.length];

        const pendingLoans = d.pinjaman_pending || 0;
        const liqRatio = d.liquidity_ratio || 0;

        container.innerHTML = `
        <!-- Human-Touch Greeting & Daily Operational Briefing -->
        <div class="mb-6 bg-gradient-to-r ${greetingTheme} bg-white rounded-3xl p-6 sm:p-7 border shadow-xs relative overflow-hidden transition-all duration-300">
            <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-primary-100/30 rounded-full blur-3xl pointer-events-none"></div>

            <div class="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
                <!-- Greeting & Quote -->
                <div class="space-y-2">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${greetingBadgeColor}">
                            <span>${greetingEmoji}</span> ${greetingTime}
                        </span>
                        <span class="text-xs font-semibold text-slate-500 flex items-center gap-1">
                            <i class="ri-calendar-event-line"></i> ${indonesianDate}
                        </span>
                        <span class="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 font-bold text-slate-600 font-mono">
                            ${userRole}
                        </span>
                    </div>

                    <h1 class="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                        Halo, <span class="bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">${userName}</span>
                    </h1>

                    <div class="flex items-start gap-2 pt-1 max-w-2xl text-slate-600">
                        <i class="ri-double-quotes-l text-primary-400 text-lg shrink-0 mt-0.5"></i>
                        <p class="text-xs sm:text-sm italic font-medium leading-relaxed">
                            "${todayQuote.text}" <span class="not-italic font-bold text-slate-400 text-xs">— ${todayQuote.author}</span>
                        </p>
                    </div>
                </div>

                <!-- Daily Operational Briefing Card -->
                <div class="w-full lg:w-auto shrink-0 bg-white/90 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-2xl ${pendingLoans > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'} flex items-center justify-center text-xl shrink-0">
                            <i class="${pendingLoans > 0 ? 'ri-alarm-warning-line animate-bounce' : 'ri-shield-check-line'}"></i>
                        </div>
                        <div>
                            <div class="text-[10px] font-black uppercase tracking-wider text-slate-400">Briefing Hari Ini</div>
                            <div class="text-sm font-extrabold text-slate-800">
                                ${pendingLoans > 0 ? `${pendingLoans} Pinjaman Butuh Review` : 'Antrean Pengajuan Bersih'}
                            </div>
                            <div class="text-[11px] text-slate-500 font-medium">
                                Kas: ${App.formatRupiah(d.total_kas)} (${liqRatio}% Likuid)
                            </div>
                        </div>
                    </div>

                    <div class="h-auto w-px bg-slate-200 hidden sm:block"></div>

                    <div class="flex sm:flex-col gap-2 justify-end">
                        <a href="#/pinjaman" class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs">
                            <i class="ri-folder-user-line"></i> Cek Pinjaman
                        </a>
                        <a href="#/kas-transaksi" class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all">
                            <i class="ri-exchange-dollar-line"></i> Buku Kas
                        </a>
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            ${this.statCard('ri-group-line', 'Total Anggota', d.total_anggota, 'from-blue-500 to-blue-600', 'orang', {
                points: trends.anggota || [138, 139, 140, 141, 142, 143, d.total_anggota || 143],
                color: '#2563eb',
                note: 'Tren 7 hari'
            })}
            ${this.statCard('ri-wallet-3-line', 'Total Simpanan', App.formatRupiah(d.total_simpanan), 'from-emerald-500 to-emerald-600', '', {
                points: trends.simpanan || [42000000, 42800000, 43500000, 44200000, 45100000, 46300000, d.total_simpanan || 47000000],
                color: '#059669',
                note: 'Inflow kumulatif'
            })}
            ${this.statCard('ri-hand-coin-line', 'Pinjaman Aktif', App.formatRupiah(d.total_pinjaman), 'from-amber-500 to-amber-600', '', {
                points: trends.pinjaman || [31000000, 31800000, 32100000, 32500000, 33000000, 33800000, d.total_pinjaman || 34200000],
                color: '#d97706',
                note: 'Portofolio aktif'
            })}
            ${this.statCard('ri-time-line', 'Pinjaman Pending', d.pinjaman_pending, 'from-rose-500 to-rose-600', 'pengajuan', {
                points: trends.pending || [2, 3, 2, 4, 3, 2, d.pinjaman_pending || 0],
                color: '#e11d48',
                note: d.pinjaman_pending > 0 ? 'Perlu tindakan' : 'Antrean bersih',
                badgeText: d.pinjaman_pending > 0 ? `${d.pinjaman_pending} antre` : 'Terkendali',
                trend: d.pinjaman_pending > 0 ? 'down' : 'neutral'
            })}
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
            <!-- Liquidity Gauge -->
            <div class="xl:col-span-2 bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 flex flex-col sm:flex-row items-center gap-10 animate-slideUp">
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
                        <div class="bg-slate-50 p-5 rounded-3xl border border-slate-100 min-w-[200px] flex items-center justify-between gap-4">
                            <div>
                                <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Saldo Kas (Aset 1000)</p>
                                <p class="text-xl font-black text-slate-900 leading-none">${App.formatRupiah(d.total_kas)}</p>
                            </div>
                            <div class="shrink-0 opacity-85">
                                ${App.renderSparkline(trends.kas || [d.total_kas * 0.95, d.total_kas * 0.97, d.total_kas * 0.96, d.total_kas * 0.98, d.total_kas * 0.99, d.total_kas], {
                                    color: '#10b981',
                                    width: 80,
                                    height: 28,
                                    showBadge: false
                                }).svg}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Financial Health Scoreboard -->
            <div class="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 animate-slideUp" style="animation-delay: 0.1s">
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
                            <span class="text-xs font-bold text-slate-500 uppercase">Pertumbuhan Anggota</span>
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
            <div class="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-900/10 overflow-hidden relative group animate-slideUp">
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
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-slideUp" style="animation-delay: 0.1s">
                <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2"><i class="ri-pie-chart-line text-primary-500"></i> Simpanan Per Jenis</h3>
                <div class="space-y-3">
                    ${(d.simpanan_per_jenis || []).map(s => `
                    <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span class="text-xs font-bold text-slate-500 uppercase tracking-wide">${s.nama}</span>
                        <span class="font-black text-slate-900">${App.formatRupiah(s.total)}</span>
                    </div>`).join('')}
                </div>
            </div>

            <!-- Pinjaman Per Jenis -->
            <div class="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-slideUp" style="animation-delay:0.2s">
                <h3 class="font-bold text-slate-800 mb-4 flex items-center gap-2"><i class="ri-hand-coin-line text-amber-500"></i> Pinjaman Per Jenis</h3>
                <div class="space-y-3">
                    ${(d.pinjaman_per_jenis || []).map(p => `
                    <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span class="text-xs font-bold text-slate-500 uppercase tracking-wide">${p.nama}</span>
                        <span class="font-black text-slate-900">${App.formatRupiah(p.total)}</span>
                    </div>`).join('')}
                </div>
            </div>
        </div>

        <!-- Widget Kalender Jatuh Tempo Finansial (Due-Dates Tracker) -->
        <div id="dashboard-due-calendar-widget" class="mb-6 animate-slideUp" style="animation-delay:0.2s"></div>

        <!-- Enterprise Data Table -->
        <div class="bg-white rounded-2xl shadow-sm border border-slate-100 animate-slideUp" style="animation-delay:0.2s">
            <div class="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 class="font-bold text-slate-800 flex items-center gap-2"><i class="ri-exchange-line text-primary-500"></i> Transaksi Terakhir</h3>
                <button class="text-[10px] font-bold text-primary-600 uppercase tracking-widest hover:text-primary-700 transition-colors">Lihat Semua</button>
            </div>
            <div class="table-wrapper">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>No. Transaksi</th>
                            <th>Anggota</th>
                            <th>Jenis Simpanan</th>
                            <th>Transaksi</th>
                            <th class="text-right">Jumlah</th>
                            <th class="text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${(d.transaksi_terakhir || []).map(t => `
                        <tr>
                            <td class="font-mono font-bold text-slate-400">${t.no_transaksi}</td>
                            <td>
                                <div class="font-bold text-slate-900">${t.anggota}</div>
                            </td>
                            <td>
                                <span class="text-xs font-bold text-slate-500 uppercase tracking-wide">${t.jenis_simpanan}</span>
                            </td>
                            <td class="text-xs font-medium text-slate-600">${t.kode_transaksi}</td>
                            <td class="text-right font-black text-slate-900">${App.formatRupiah(t.jumlah)}</td>
                            <td class="text-center">${App.dkBadge(t.dk)}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;

        // Initialize Due Dates Financial Calendar Widget
        App.DueCalendar.init('dashboard-due-calendar-widget');

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

    statCard(icon, label, value, gradient, suffix = '', sparkOptions = {}) {
        const {
            points = [],
            color = '#3b82f6',
            note = 'Tren 7 hari',
            badgeText = null,
            trend = null
        } = sparkOptions;

        const spark = App.renderSparkline(points, {
            color,
            width: 96,
            height: 34,
            strokeWidth: 2.2,
            showBadge: true,
            badgeText,
            trend
        });

        return `
        <div class="stat-card bg-white rounded-2xl shadow-xs border border-slate-100 p-5 animate-fadeIn hover:border-slate-200 transition-all group flex flex-col justify-between">
            <div>
                <!-- Baris Atas: Ikon Badge & Micro Sparkline Gelombang Tren -->
                <div class="flex items-center justify-between gap-2 mb-3.5">
                    <div class="w-11 h-11 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center shadow-md shadow-slate-200/50 group-hover:scale-105 transition-transform shrink-0">
                        <i class="${icon} text-white text-xl"></i>
                    </div>
                    <div class="sparkline-slot shrink-0">
                        ${spark.svg}
                    </div>
                </div>

                <!-- Angka Metrik & Label -->
                <p class="text-2xl font-black text-slate-900 tracking-tight flex items-baseline">
                    ${value}
                    ${suffix ? `<span class="text-xs font-semibold text-slate-400 ml-1.5 uppercase">${suffix}</span>` : ''}
                </p>
                <p class="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">${label}</p>
            </div>

            <!-- Baris Bawah: Lencana Tren & Catatan Waktu -->
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                ${spark.badge}
                <span class="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                    <i class="ri-pulse-line text-slate-300"></i> ${note}
                </span>
            </div>
        </div>`;
    }
};

export default DashboardPage;
