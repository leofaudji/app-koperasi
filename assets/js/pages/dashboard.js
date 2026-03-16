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

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slideUp">
                <h3 class="font-semibold text-gray-800 mb-4 flex items-center gap-2"><i class="ri-pie-chart-line text-primary-500"></i> Simpanan Per Jenis</h3>
                <div class="space-y-3">
                    ${(d.simpanan_per_jenis || []).map(s => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span class="text-sm font-medium text-gray-600">${s.nama}</span>
                        <span class="font-semibold text-gray-800">${App.formatRupiah(s.total)}</span>
                    </div>`).join('')}
                </div>
            </div>
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-slideUp" style="animation-delay:0.1s">
                <h3 class="font-semibold text-gray-800 mb-4 flex items-center gap-2"><i class="ri-alarm-warning-line text-amber-500"></i> Angsuran Jatuh Tempo</h3>
                ${(d.angsuran_jatuh_tempo || []).length ? `<div class="space-y-2">${d.angsuran_jatuh_tempo.map(a => `
                <div class="flex items-center justify-between p-3 bg-amber-50 rounded-xl text-sm">
                    <div><span class="font-medium text-gray-700">${a.anggota}</span><br><span class="text-gray-400 text-xs">${a.no_pinjaman} - Ke-${a.angsuran_ke}</span></div>
                    <div class="text-right"><span class="font-semibold text-amber-600">${App.formatRupiah(a.total)}</span><br><span class="text-xs text-gray-400">${App.formatDate(a.tgl_jatuh_tempo)}</span></div>
                </div>`).join('')}</div>` : '<p class="text-gray-400 text-sm text-center py-8">Tidak ada angsuran jatuh tempo</p>'}
            </div>
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
