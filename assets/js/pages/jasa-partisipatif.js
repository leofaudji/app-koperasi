const JasaPartisipatifPage = {
    details: [],
    bulan: new Date().getMonth() + 1,
    tahun: new Date().getFullYear(),

    render(container) {
        App.setTitle('Posting Jasa Partisipatif', 'Alokasi bunga pinjaman ke Simpanan Partisipatif');

        container.innerHTML = `
        <div class="space-y-6 animate-fadeIn">
            <!-- Yearly Status Monitoring -->
            <div id="yearly-status-area" class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 hidden">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <i class="ri-calendar-check-line text-primary-500"></i> Monitoring Status Posting Tahun <span id="monitor-year"></span>
                    </h4>
                    <div class="flex items-center gap-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> Selesai</span>
                        <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-amber-500"></span> Parsial</span>
                        <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-500"></span> Belum</span>
                    </div>
                </div>
                <div class="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-3" id="month-indicator-grid">
                    <!-- Indicators filled by JS -->
                </div>
            </div>

            <!-- Toolbar & Filters -->
            <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div class="flex flex-wrap items-center gap-3">
                    <div class="flex items-center bg-slate-50 rounded-2xl p-1 border border-slate-100">
                        <select id="filter-bulan" class="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 px-4 py-2 cursor-pointer">
                            ${[...Array(12)].map((_, i) => `<option value="${i + 1}" ${this.bulan == i + 1 ? 'selected' : ''}>${new Date(0, i).toLocaleString('id-ID', { month: 'long' })}</option>`).join('')}
                        </select>
                        <div class="w-px h-4 bg-slate-200"></div>
                        <select id="filter-tahun" class="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 px-4 py-2 cursor-pointer">
                            ${[2024, 2025, 2026].map(y => `<option value="${y}" ${this.tahun == y ? 'selected' : ''}>${y}</option>`).join('')}
                        </select>
                    </div>
                    
                    <button onclick="JasaPartisipatifPage.loadPreview()" class="px-6 py-3 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all flex items-center gap-2 shadow-lg shadow-primary-200 active:scale-95">
                        <i class="ri-search-line"></i> Tampilkan Data
                    </button>
                    <div id="cancel-area" class="border-l border-slate-100 pl-3">
                        <button id="btn-cancel-posting" onclick="JasaPartisipatifPage.cancelPosting()" class="px-5 py-3 bg-rose-50 text-rose-600 rounded-2xl font-bold hover:bg-rose-100 transition-all flex items-center gap-2 border border-rose-100 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95" title="Batalkan semua posting pada periode ini">
                            <i class="ri-history-line"></i> Batal Posting
                        </button>
                    </div>
                </div>
                
                <div id="action-area" class="hidden flex items-center gap-3">
                    <button onclick="JasaPartisipatifPage.exportPDF()" class="px-5 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-bold hover:bg-slate-50 transition-all flex items-center gap-2 active:scale-95">
                        <i class="ri-file-pdf-line text-rose-500 text-lg"></i> PDF
                    </button>
                    <button onclick="JasaPartisipatifPage.processPosting()" class="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all flex items-center gap-2 active:scale-95">
                        <i class="ri-checkbox-circle-line text-lg"></i> Eksekusi Posting
                    </button>
                </div>
            </div>

            <!-- Summary Cards -->
            <div id="summary-cards" class="grid grid-cols-1 md:grid-cols-3 gap-6 hidden">
                <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Target Anggota</p>
                    <h3 id="summary-count" class="text-3xl font-black text-slate-800">0</h3>
                </div>
                <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <p class="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Akumulasi Bunga</p>
                    <h3 id="summary-bunga" class="text-3xl font-black text-primary-600">Rp 0</h3>
                </div>
                <div class="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div class="absolute -right-4 -bottom-4 w-24 h-24 bg-emerald-50 rounded-full group-hover:scale-110 transition-transform"></div>
                    <div class="relative z-10">
                        <p class="text-emerald-500 text-[10px] font-black uppercase tracking-widest mb-1">Estimasi Jasa (15%)</p>
                        <h3 id="summary-partisipatif" class="text-3xl font-black text-emerald-600">Rp 0</h3>
                    </div>
                </div>
            </div>

            <!-- Table Area -->
            <div class="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse">
                        <thead>
                            <tr class="bg-slate-50/50 border-b border-slate-100">
                                <th class="px-8 py-5 w-10"><input type="checkbox" id="select-all-posting" onchange="JasaPartisipatifPage.toggleSelectAll(this.checked)" class="w-5 h-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-500"></th>
                                <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Informasi Anggota</th>
                                <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Bunga Terbayar</th>
                                <th class="px-6 py-5 text-[10px] font-black text-emerald-600 uppercase tracking-widest text-right">Alokasi Jasa (15%)</th>
                            </tr>
                        </thead>
                        <tbody id="preview-table-body">
                            <tr>
                                <td colspan="4" class="px-6 py-20 text-center">
                                    <div class="flex flex-col items-center gap-3">
                                        <div class="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-200">
                                            <i class="ri-search-eye-line text-4xl"></i>
                                        </div>
                                        <p class="text-slate-400 font-medium">Silakan pilih periode dan klik Tampilkan Data</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        `;
    },

    async loadPreview() {
        this.bulan = document.getElementById('filter-bulan').value;
        this.tahun = document.getElementById('filter-tahun').value;

        if (typeof App !== 'undefined' && typeof App.loading === 'function') {
            App.loading(true); 
        }
        try {
            const resp = await App.api(`keuangan/jasa-partisipatif?bulan=${this.bulan}&tahun=${this.tahun}`);
            if (resp && resp.success) {
                this.details = resp.data.details || [];
                this.updateUI(resp.data);
            }
        } catch (e) {
            if (typeof App !== 'undefined' && typeof App.toast === 'function') {
                App.toast('error', e.message);
            } else { console.error('Error:', e.message); }
        } finally {
            if (typeof App !== 'undefined' && typeof App.loading === 'function') {
                App.loading(false);
            }
        }
    },

    updateUI(resp) {
        const tbody = document.getElementById('preview-table-body');
        const summaryCards = document.getElementById('summary-cards');
        const actionArea = document.getElementById('action-area');
        const btnCancel = document.getElementById('btn-cancel-posting');
        const cancelArea = document.getElementById('cancel-area');
        const yearlyArea = document.getElementById('yearly-status-area');
        const monthGrid = document.getElementById('month-indicator-grid');

        // Render Yearly Status Indicators
        if (resp.monthly_summary) {
            yearlyArea.classList.remove('hidden');
            document.getElementById('monitor-year').innerText = this.tahun;
            
            let indicatorHtml = '';
            for(let m = 1; m <= 12; m++) {
                const data = resp.monthly_summary[m];
                let color = 'bg-slate-100 text-slate-400'; // Tidak ada transaksi
                let title = `Bulan ${m}: Tidak ada transaksi`;
                
                if (data) {
                    const diff = data.target - data.posted;
                    if (data.target > 0 && diff <= 1) {
                        color = 'bg-emerald-500 text-white shadow-lg shadow-emerald-200'; // Selesai
                        title = `Bulan ${m}: Selesai Diposting`;
                    } else if (data.posted > 0) {
                        color = 'bg-amber-500 text-white shadow-lg shadow-amber-200'; // Parsial
                        title = `Bulan ${m}: Baru Diposting Sebagian (Sisa ${App.formatRupiah(diff)})`;
                    } else {
                        color = 'bg-rose-500 text-white shadow-lg shadow-rose-200'; // Belum sama sekali
                        title = `Bulan ${m}: Belum Diposting (Target ${App.formatRupiah(data.target)})`;
                    }
                }
                indicatorHtml += `<div class="aspect-square rounded-xl ${color} flex items-center justify-center text-[10px] font-black cursor-help transition-all hover:scale-110" title="${title}">${m}</div>`;
            }
            monthGrid.innerHTML = indicatorHtml;
        }

         // Enable/disable tombol pembatalan jika terdeteksi sudah ada data yang terposting
        btnCancel.disabled = !(resp.already_posted > 0);


        if (!this.details || this.details.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="px-6 py-12 text-center text-slate-400">Tidak ada data pembayaran bunga pada periode ini.</td></tr>`;
            summaryCards.classList.add('hidden');
            actionArea.classList.add('hidden');
            return;
        }

        let totalBunga = 0;
        let totalSisa = 0;

        tbody.innerHTML = this.details.map(row => {
            totalBunga += parseFloat(row.total_bunga_bayar);
            totalSisa += parseFloat(row.sisa_posting);
            
            const isLunas = row.sisa_posting <= 1;
            const statusBadge = isLunas 
                ? `<span class="px-2 py-0.5 bg-emerald-100 text-emerald-600 text-[10px] font-bold rounded-full uppercase">Selesai</span>`
                : `<span class="px-2 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-bold rounded-full uppercase">Belum Posting</span>`;

            return `
            <tr class="border-b border-slate-50 hover:bg-slate-50/50 transition-colors ${isLunas ? 'opacity-50' : ''}">
                <td class="px-8 py-5">
                    ${!isLunas ? `<input type="checkbox" class="row-checkbox w-5 h-5 rounded-lg border-slate-300 text-primary-600 focus:ring-primary-500" data-id="${row.anggota_id}">` : '<i class="ri-checkbox-circle-fill text-emerald-500 text-xl"></i>'}
                </td>
                <td class="px-6 py-5">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-bold uppercase text-xs">
                            ${row.anggota_nama.charAt(0)}
                        </div>
                        <div>
                            <div class="font-bold text-slate-700 leading-tight">${row.anggota_nama}</div>
                            <div class="text-[10px] text-slate-400 font-mono mt-0.5">${row.no_anggota} &bull; ${statusBadge}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-5 text-right font-bold text-slate-600">${App.formatRupiah(row.total_bunga_bayar)}</td>
                <td class="px-6 py-5 text-right">
                    <div class="font-black text-emerald-600 text-base">${App.formatRupiah(row.sisa_posting)}</div>
                    ${row.sudah_diposting > 0 ? `<div class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">Sudah Masuk: ${App.formatRupiah(row.sudah_diposting)}</div>` : ''}
                </td>
            </tr>
            `;
        }).join('');

        document.getElementById('summary-count').innerText = this.details.length;
        document.getElementById('summary-bunga').innerText = App.formatRupiah(totalBunga);
        
        const partisipatifEl = document.getElementById('summary-partisipatif');
        partisipatifEl.innerText = App.formatRupiah(totalSisa);
        partisipatifEl.dataset.value = totalSisa; // Simpan nilai asli untuk konfirmasi

        summaryCards.classList.remove('hidden');

        if (totalSisa > 1) {
            actionArea.classList.remove('hidden');
        } else {
            actionArea.classList.add('hidden');
        }
    },

    toggleSelectAll(checked) {
        document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = checked);
    },

    async processPosting() {
        const selected = Array.from(document.querySelectorAll('.row-checkbox:checked')).map(cb => cb.dataset.id);
        
        if (selected.length === 0) {
            App.toast('error', 'Silakan pilih minimal satu anggota untuk diposting.');
            return;
        }

        // Hitung total hanya untuk yang dicentang
        const totalVal = this.details
            .filter(d => selected.includes(d.anggota_id.toString()))
            .reduce((sum, d) => sum + parseFloat(d.sisa_posting), 0);

        const totalLabel = App.formatRupiah(totalVal);
        
        const confirm = await App.confirm('Proses Posting?', `Sistem akan memproses ${selected.length} anggota dengan total ${totalLabel}. Tindakan ini akan membentuk jurnal otomatis.`);
        
        if (!confirm) return;

        if (typeof App !== 'undefined' && typeof App.loading === 'function') {
            App.loading(true);
        }
        try {
            const resp = await App.api('keuangan/jasa-partisipatif', {
                method: 'POST',
                body: {
                    bulan: this.bulan,
                    tahun: this.tahun,
                    selected_ids: selected
                }
            });

            if (resp.success) {
                App.toast('success', resp.message);
                this.loadPreview(); // Refresh data
            }
        } catch (e) {
            if (typeof App !== 'undefined' && typeof App.toast === 'function') {
                App.toast('error', e.message);
            } else { console.error('Error:', e.message); }
        } finally {
            if (typeof App !== 'undefined' && typeof App.loading === 'function') {
                App.loading(false);
            }
        }
    },

    async cancelPosting() {
        const confirm = await App.confirm(
            'Batalkan Posting?', 
            'Seluruh transaksi posting pada periode ini akan direversal. Saldo simpanan anggota akan dikurangi kembali secara otomatis.'
        );
        
        if (!confirm) return;

        if (typeof App !== 'undefined' && typeof App.loading === 'function') {
            App.loading(true);
        }
        try {
            // Perbaikan: Kirim bulan dan tahun melalui URL agar terbaca oleh backend sebagai params
            const resp = await App.api(`keuangan/jasa-partisipatif?bulan=${this.bulan}&tahun=${this.tahun}`, {
                method: 'DELETE'
            });

            if (resp.success) {
                App.toast('success', resp.message);
                this.loadPreview(); // Refresh tampilan
            }
        } catch (e) {
            if (typeof App !== 'undefined' && typeof App.toast === 'function') {
                App.toast('error', e.message);
            } else { console.error('Error:', e.message); }
        } finally {
            if (typeof App !== 'undefined' && typeof App.loading === 'function') {
                App.loading(false);
            }
        }
    },

    exportPDF() {
        if (!this.details || this.details.length === 0) return;
        
        const columns = [
            { title: 'Nama Anggota', key: 'anggota_nama' },
            { title: 'No. Anggota', key: 'no_anggota' },
            { title: 'Bunga Dibayar', key: 'bunga_fmt', align: 'right' },
            { title: 'Jasa Partisipatif', key: 'jasa_fmt', align: 'right' },
            { title: 'Status', key: 'status' }
        ];

        const rows = this.details.map(d => ({
            anggota_nama: d.anggota_nama,
            no_anggota: d.no_anggota,
            bunga_fmt: App.formatRupiah(d.total_bunga_bayar),
            jasa_fmt: App.formatRupiah(d.nilai_partisipatif),
            status: d.sisa_posting <= 1 ? 'SELESAI' : 'BELUM'
        }));

        const bulanName = new Date(0, this.bulan - 1).toLocaleString('id-ID', { month: 'long' });
        
        App.export('pdf', `Daftar Jasa Partisipatif - ${bulanName} ${this.tahun}`, columns, rows, {
            filename: `jasa_partisipatif_${this.bulan}_${this.tahun}`,
            cards: [
                { label: 'Total Anggota', value: this.details.length },
                { label: 'Total Jasa (15%)', value: App.formatRupiah(this.details.reduce((s, d) => s + parseFloat(d.nilai_partisipatif), 0)) }
            ]
        });
    }
};

window.JasaPartisipatifPage = JasaPartisipatifPage;
export default JasaPartisipatifPage;