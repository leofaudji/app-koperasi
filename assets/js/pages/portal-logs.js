// Portal Logs Monitoring Page
const PortalLogsPage = {
    data: [],
    pagination: {},
    filters: {
        page: 1,
        search: ''
    },

    async render(container) {
        App.setTitle('Monitoring Portal', 'Pantau aktifitas anggota di portal');
        container.innerHTML = `
        <div class="flex flex-col gap-6 animate-fadeIn">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 class="text-xl font-bold text-gray-800">Aktifitas Portal</h3>
                    <p class="text-xs text-gray-400 mt-1">Log aktifitas real-time anggota koperasi</p>
                </div>
                <div class="flex items-center gap-2 w-full sm:w-auto">
                    <div class="relative flex-1 sm:flex-none">
                        <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                        <input type="text" id="log-search" placeholder="Cari anggota / IP / lokasi..." 
                            class="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm w-full focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                            value="${this.filters.search}">
                    </div>
                    <button onclick="PortalLogsPage.load()" class="bg-white border border-gray-200 text-gray-600 hover:text-primary-600 p-2.5 rounded-xl transition-all shadow-sm active:scale-95">
                        <i class="ri-refresh-line"></i>
                    </button>
                </div>
            </div>

            <!-- AI Insights & Summary -->
            <div class="flex flex-col lg:flex-row gap-4">
                <!-- AI Insights Box -->
                <div class="flex-1 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div class="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <i class="ri-robot-2-line text-6xl"></i>
                    </div>
                    <div class="flex items-center gap-3 mb-4">
                        <div class="flex items-center gap-2 px-3 py-1 bg-primary-50 text-primary-600 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                            <i class="ri-sparkling-fill"></i>
                            AI Security Insights
                        </div>
                        <div id="ai-status-badge" class="px-3 py-1 rounded-full text-[10px] font-bold uppercase">Memproses...</div>
                    </div>
                    <div id="ai-insights-content" class="text-sm text-gray-600 leading-relaxed min-h-[3em]">
                        Menganalisa data aktifitas terbaru...
                    </div>
                </div>

                <!-- Small Stats Grid -->
                <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-4 lg:w-[400px]" id="log-stats-mini">
                    ${Array(2).fill(0).map(() => `
                        <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
                            <div class="h-4 w-20 bg-gray-100 rounded mb-2"></div>
                            <div class="h-6 w-12 bg-gray-100 rounded"></div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Main Stats Grid -->
            <div class="grid grid-cols-2 md:grid-cols-5 gap-4" id="log-stats">
                ${Array(5).fill(0).map(() => `
                    <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm animate-pulse">
                        <div class="h-4 w-20 bg-gray-100 rounded mb-2"></div>
                        <div class="h-6 w-12 bg-gray-100 rounded"></div>
                    </div>
                `).join('')}
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div id="log-table-container">
                    <div class="flex justify-center py-20">
                        <i class="ri-loader-4-line animate-spin text-3xl text-primary-500"></i>
                    </div>
                </div>
                <div id="log-pagination" class="px-6 py-4 border-t border-gray-50 flex justify-between items-center"></div>
            </div>
        </div>`;

        document.getElementById('log-search').addEventListener('input', App.debounce((e) => {
            this.filters.search = e.target.value;
            this.filters.page = 1;
            this.load();
        }, 500));

        this.load();
    },

    async load() {
        const query = new URLSearchParams(this.filters).toString();
        
        // Load stats and table data in parallel
        const [statsRes, res] = await Promise.all([
            App.api('log/stats'),
            App.api('log/portal?' + query)
        ]);

        if (statsRes.success) {
            this.renderStats(statsRes.data);
        }

        if (res.success) {
            this.data = res.data;
            this.pagination = res.pagination;
            this.renderTable();
            this.renderPagination();
        }
    },

    renderStats(stats) {
        const desktop = stats.platforms.find(p => p.platform.includes('Desktop'))?.total || 0;
        const mobile = stats.platforms.reduce((acc, p) => !p.platform.includes('Desktop') ? acc + parseInt(p.total) : acc, 0);
        const topBrowser = stats.browsers.sort((a, b) => b.total - a.total)[0]?.browser || 'N/A';

        // Update AI Insights
        const ai = stats.ai_insight;
        const statusBadge = document.getElementById('ai-status-badge');
        const insightsContent = document.getElementById('ai-insights-content');

        const colorClasses = {
            emerald: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
            amber: 'bg-amber-50 text-amber-600 border border-amber-100',
            red: 'bg-red-50 text-red-600 border border-red-100'
        };

        statusBadge.className = `px-3 py-1 rounded-full text-[10px] font-bold uppercase ${colorClasses[ai.color]}`;
        statusBadge.innerText = ai.status;

        // Simple Typewriter effect for AI
        insightsContent.innerHTML = '';
        let fullText = ai.messages.join(' ');
        insightsContent.innerHTML = fullText.replace(/\*\*(.*?)\*\*/g, '<b class="text-gray-800">$1</b>');

        // Mini stats (Today's highlights)
        document.getElementById('log-stats-mini').innerHTML = `
            <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Gagal Login</p>
                <h4 class="text-xl font-black ${stats.ai_insight.color === 'red' ? 'text-red-600' : 'text-gray-800'}">${stats.login_today < 1 ? 0 : stats.ai_insight.messages.join('').match(/\d+/) || 0}</h4>
            </div>
            <div class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-center">
                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status Sistem</p>
                <div class="flex items-center gap-2">
                    <div class="w-2 h-2 rounded-full bg-${stats.ai_insight.color}-500 animate-pulse"></div>
                    <h4 class="text-sm font-bold text-gray-800">${stats.ai_insight.status}</h4>
                </div>
            </div>
        `;

        const html = `
            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i class="ri-login-box-line text-xl"></i>
                    </div>
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Login Hari Ini</p>
                </div>
                <h4 class="text-2xl font-black text-gray-800">${stats.login_today}</h4>
                <p class="text-[10px] text-gray-400 mt-1">Sesi login berhasil</p>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i class="ri-user-heart-line text-xl"></i>
                    </div>
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">User Aktif</p>
                </div>
                <h4 class="text-2xl font-black text-gray-800">${stats.active_users}</h4>
                <p class="text-[10px] text-gray-400 mt-1">Anggota beraktifitas</p>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group ${stats.suspicious_count > 0 ? 'ring-2 ring-red-500/20 bg-red-50/10' : ''}">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-xl ${stats.suspicious_count > 0 ? 'bg-red-100 text-red-600 animate-bounce' : 'bg-gray-50 text-gray-400'} flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i class="ri-shield-user-line text-xl"></i>
                    </div>
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Security Guard</p>
                </div>
                <h4 class="text-2xl font-black ${stats.suspicious_count > 0 ? 'text-red-600' : 'text-gray-800'}">${stats.suspicious_count}</h4>
                <p class="text-[10px] text-gray-400 mt-1">${stats.suspicious_count > 0 ? 'User dengan multi-IP (24j)' : 'Sistem aman'}</p>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i class="ri-compass-3-line text-xl"></i>
                    </div>
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Top Browser</p>
                </div>
                <h4 class="text-2xl font-black text-gray-800">${topBrowser}</h4>
                <p class="text-[10px] text-gray-400 mt-1">Browser paling populer</p>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md group">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <i class="ri-smartphone-line text-xl"></i>
                    </div>
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Platform Split</p>
                </div>
                <div class="flex items-end gap-2">
                    <h4 class="text-2xl font-black text-gray-800">${mobile}</h4>
                    <span class="text-[10px] text-gray-400 mb-1.5">Mob / ${desktop} PC</span>
                </div>
                <div class="w-full bg-gray-100 h-1 rounded-full mt-2 overflow-hidden flex">
                    <div class="bg-amber-500 h-full" style="width: ${(mobile / (mobile + desktop || 1) * 100)}%"></div>
                    <div class="bg-blue-500 h-full" style="width: ${(desktop / (mobile + desktop || 1) * 100)}%"></div>
                </div>
            </div>
        `;
        document.getElementById('log-stats').innerHTML = html;
    },

    renderTable() {
        const html = `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="bg-gray-50 text-gray-500 font-medium">
                        <th class="px-6 py-4 text-left">Waktu</th>
                        <th class="px-6 py-4 text-left">Anggota</th>
                        <th class="px-6 py-4 text-left">Aktifitas</th>
                        <th class="px-6 py-4 text-left">Device & Browser</th>
                        <th class="px-6 py-4 text-left">Lokasi & IP</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                    ${this.data.map(log => `
                        <tr class="hover:bg-gray-50/50 transition-colors ${log.session_ips > 1 ? 'bg-red-50/30' : ''}">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-gray-800 font-medium">${App.formatDate(log.created_at)}</div>
                                <div class="text-[10px] text-gray-400">${log.created_at.split(' ')[1]}</div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex items-center gap-2">
                                    <button onclick="PortalLogsPage.showJourney(${log.anggota_id}, '${log.anggota_nama.replace(/'/g, "\\'")}')" 
                                        class="text-left group">
                                        <div class="font-bold text-gray-800 group-hover:text-primary-600 transition-colors underline decoration-dotted underline-offset-4 decoration-gray-300 group-hover:decoration-primary-600">${log.anggota_nama}</div>
                                        <div class="text-[10px] font-mono text-primary-600 group-hover:text-primary-700">${log.no_anggota}</div>
                                    </button>
                                    ${log.session_ips > 1 ? `<span class="bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full animate-pulse" title="Multiple IP detected in 24h">SUSPICIOUS</span>` : ''}
                                </div>
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-1 rounded-lg text-xs font-medium ${this.getActivityColor(log.activity)}">
                                    ${log.activity}
                                </span>
                            </td>
                            <td class="px-6 py-4 text-gray-600">
                                <div class="flex items-center gap-2">
                                    <i class="${this.getPlatformIcon(log.platform)}"></i>
                                    <span class="text-xs">${log.platform}</span>
                                </div>
                                <div class="text-[10px] text-gray-400 mt-0.5">${log.browser}</div>
                            </td>
                            <td class="px-6 py-4">
                                <div class="text-gray-800 font-medium text-xs truncate max-w-[150px]" title="${log.location}">${log.location || 'Unknown'}</div>
                                <div class="text-[10px] font-mono text-gray-400">${log.ip_address}</div>
                            </td>
                        </tr>
                    `).join('')}
                    ${this.data.length === 0 ? '<tr><td colspan="5" class="text-center py-20 text-gray-400">Belum ada aktifitas portal</td></tr>' : ''}
                </tbody>
            </table>
        </div>`;
        document.getElementById('log-table-container').innerHTML = html;
    },

    async showJourney(anggotaId, name) {
        App.openModal(`
            <div class="p-6 max-w-2xl">
                <div class="flex justify-between items-start mb-8">
                    <div>
                        <h3 class="text-xl font-black text-gray-800">Member Journey</h3>
                        <p class="text-xs text-gray-400 mt-1">Garis waktu aktifitas: <span class="text-primary-600 font-bold">${name}</span></p>
                    </div>
                    <button onclick="App.closeModal()" class="text-gray-400 hover:text-gray-600 transition-colors">
                        <i class="ri-close-line text-2xl"></i>
                    </button>
                </div>

                <div id="journey-timeline" class="max-h-[70vh] overflow-auto pr-2 custom-scrollbar">
                    <div class="flex justify-center py-10">
                        <i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i>
                    </div>
                </div>
            </div>
        `);

        const res = await App.api(`log/journey?anggota_id=${anggotaId}`);
        if (!res.success) return;

        // Group by date
        const groups = {};
        res.data.forEach(log => {
            const date = App.formatDate(log.created_at.split(' ')[0]);
            if (!groups[date]) groups[date] = [];
            groups[date].push(log);
        });

        const html = Object.keys(groups).map(date => `
            <div class="mb-8">
                <div class="flex items-center gap-3 mb-6">
                    <div class="h-[1px] flex-1 bg-gray-100"></div>
                    <span class="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">${date}</span>
                    <div class="h-[1px] flex-1 bg-gray-100"></div>
                </div>
                
                <div class="relative pl-8 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
                    ${groups[date].map((log, idx) => `
                        <div class="relative mb-6 last:mb-0 animate-fadeIn" style="animation-delay: ${idx * 30}ms">
                            <!-- Dot indicator -->
                            <div class="absolute -left-[30px] top-1 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${this.getJourneyItemClass(log.activity)}">
                                <i class="${this.getActivityIcon(log.activity)} text-[10px] text-white"></i>
                            </div>
                            
                            <div class="bg-gray-50/50 rounded-2xl p-4 border border-gray-100 hover:border-primary-200 transition-all hover:bg-white hover:shadow-sm">
                                <div class="flex justify-between items-start mb-2">
                                    <span class="text-sm font-bold text-gray-800">${log.activity}</span>
                                    <span class="text-[10px] font-mono text-gray-400 bg-white px-2 py-1 rounded-lg border border-gray-100">${log.created_at.split(' ')[1]}</span>
                                </div>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="flex items-center gap-2 text-[10px] text-gray-500">
                                        <i class="ri-map-pin-line text-primary-500"></i>
                                        <span class="truncate">${log.location || 'Unknown'}</span>
                                    </div>
                                    <div class="flex items-center gap-2 text-[10px] text-gray-500">
                                        <i class="${this.getPlatformIcon(log.platform)} text-primary-500"></i>
                                        <span>${log.platform.split('(')[0]}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        document.getElementById('journey-timeline').innerHTML = html || '<div class="text-center py-10 text-gray-400 text-sm italic">Belum ada aktifitas terekam</div>';
    },

    getActivityIcon(act) {
        if (act.includes('Login')) return 'ri-login-box-line';
        if (act.includes('Logout')) return 'ri-logout-box-line';
        if (act.includes('Saldo')) return 'ri-wallet-line';
        if (act.includes('Mutasi')) return 'ri-file-list-3-line';
        if (act.includes('Pinjaman')) return 'ri-hand-coin-line';
        if (act.includes('Password')) return 'ri-lock-password-line';
        return 'ri-pulse-line';
    },

    getJourneyItemClass(act) {
        if (act.includes('Login')) return 'bg-blue-500';
        if (act.includes('Logout')) return 'bg-gray-500';
        if (act.includes('Gagal')) return 'bg-red-500';
        if (act.includes('Pinjaman')) return 'bg-amber-500';
        return 'bg-emerald-500';
    },

    getActivityColor(act) {
        if (act.includes('Login')) return 'bg-blue-50 text-blue-600';
        if (act.includes('Logout')) return 'bg-gray-50 text-gray-600';
        if (act.includes('Password')) return 'bg-red-50 text-red-600';
        if (act.includes('Pinjaman')) return 'bg-amber-50 text-amber-600';
        return 'bg-emerald-50 text-emerald-600';
    },

    getPlatformIcon(p) {
        if (p === 'Mobile') return 'ri-smartphone-line';
        if (p === 'Android') return 'ri-android-line';
        if (p === 'iOS') return 'ri-apple-line';
        return 'ri-computer-line';
    },

    renderPagination() {
        const { page, total_pages, total } = this.pagination;
        if (!total) {
            document.getElementById('log-pagination').innerHTML = '';
            return;
        }

        document.getElementById('log-pagination').innerHTML = `
            <p class="text-xs text-gray-500">Total <b>${total}</b> log aktifitas</p>
            <div class="flex gap-2">
                <button onclick="PortalLogsPage.setPage(${page - 1})" ${page === 1 ? 'disabled' : ''} 
                    class="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all active:scale-95">
                    <i class="ri-arrow-left-s-line"></i>
                </button>
                <div class="flex items-center px-4 text-sm font-medium text-gray-600 bg-gray-50 rounded-lg">
                    ${page} / ${total_pages}
                </div>
                <button onclick="PortalLogsPage.setPage(${page + 1})" ${page === total_pages ? 'disabled' : ''} 
                    class="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all active:scale-95">
                    <i class="ri-arrow-right-s-line"></i>
                </button>
            </div>
        `;
    },

    setPage(p) {
        this.filters.page = p;
        this.load();
    }
};

window.PortalLogsPage = PortalLogsPage;
export default PortalLogsPage;
