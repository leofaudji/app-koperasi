// ============================================================
// agunan.js — Manajemen Agunan (Jaminan) Pinjaman
// ============================================================

const TIPE_AGUNAN = ['SHM', 'SHGB', 'BPKB', 'Deposito', 'Lainnya'];

const TIPE_COLOR = {
    SHM: 'bg-emerald-100 text-emerald-800',
    SHGB: 'bg-teal-100 text-teal-800',
    BPKB: 'bg-blue-100 text-blue-800',
    Deposito: 'bg-amber-100 text-amber-800',
    Lainnya: 'bg-gray-100 text-gray-700',
};

const TIPE_ICON = {
    SHM: 'ri-home-2-line',
    SHGB: 'ri-building-line',
    BPKB: 'ri-car-line',
    Deposito: 'ri-bank-line',
    Lainnya: 'ri-file-paper-line',
};

// Field definitions per tipe — label: fieldId
const TIPE_FIELDS = {
    SHM: [
        { label: 'No. Sertifikat', id: 'no_dokumen', placeholder: 'Contoh: 12345/Desa/2020', required: true },
        { label: 'Nama Pemilik', id: 'pemilik', placeholder: 'Nama sesuai sertifikat', required: true },
        { label: 'Luas Tanah (m²)', id: 'luas', placeholder: '0', type: 'number' },
        { label: 'Lokasi', id: 'lokasi', placeholder: 'Desa/Kelurahan, Kecamatan' },
        { label: 'Nilai Taksasi (Rp)', id: 'nilai_taksasi', placeholder: '0', type: 'currency', required: true },
    ],
    SHGB: [
        { label: 'No. Sertifikat HGB', id: 'no_dokumen', placeholder: 'No. SHGB', required: true },
        { label: 'Nama Pemegang', id: 'pemilik', placeholder: 'Nama sesuai SHGB', required: true },
        { label: 'Berlaku Hingga', id: 'berlaku', placeholder: 'Tahun berakhir HGB' },
        { label: 'Luas (m²)', id: 'luas', placeholder: '0', type: 'number' },
        { label: 'Nilai Taksasi (Rp)', id: 'nilai_taksasi', placeholder: '0', type: 'currency', required: true },
    ],
    BPKB: [
        { label: 'No. BPKB', id: 'no_dokumen', placeholder: 'Nomor BPKB', required: true },
        { label: 'No. Polisi', id: 'nopol', placeholder: 'Contoh: B 1234 ABC', required: true },
        { label: 'Merek/Tipe', id: 'merek', placeholder: 'Contoh: Toyota Avanza 1.3', required: true },
        { label: 'Tahun', id: 'tahun', placeholder: 'Contoh: 2020', type: 'number' },
        { label: 'Nama Pemilik', id: 'pemilik', placeholder: 'Nama sesuai STNK' },
        { label: 'Nilai Taksasi (Rp)', id: 'nilai_taksasi', placeholder: '0', type: 'currency', required: true },
    ],
    Deposito: [
        { label: 'No. Rekening', id: 'no_dokumen', placeholder: 'No. rekening/deposito', required: true },
        { label: 'Bank / Koperasi', id: 'bank', placeholder: 'Nama bank/koperasi', required: true },
        { label: 'Atas Nama', id: 'pemilik', placeholder: 'Nama nasabah', required: true },
        { label: 'Nominal Saldo (Rp)', id: 'nilai_taksasi', placeholder: '0', type: 'currency', required: true },
    ],
    Lainnya: [
        { label: 'Deskripsi Jaminan', id: 'deskripsi_extra', placeholder: 'Jelaskan jaminan secara detail', required: true },
        { label: 'No. Dokumen', id: 'no_dokumen', placeholder: 'No. surat/dokumen (jika ada)' },
        { label: 'Pemilik', id: 'pemilik', placeholder: 'Nama pemilik jaminan' },
        { label: 'Nilai Taksasi (Rp)', id: 'nilai_taksasi', placeholder: '0', type: 'currency' },
    ],
};

let _page = 1;
let _filter = { search: '', status: '', tipe: '' };
let _editId = null;
let _selectedPinjaman = null;  // holds full pinjaman object from autocomplete

// ── Helpers ───────────────────────────────────────────────────
const r = (id) => document.getElementById(id);
const rp = (id, html) => { const el = r(id); if (el) el.innerHTML = html; };
const fmtRp = (n) => App.formatRupiah(n || 0);
const fmtD = (d) => d ? App.formatDate(d) : '-';
const PER_PAGE = 15;

function tipeBadge(tipe) {
    const cls = TIPE_COLOR[tipe] || TIPE_COLOR.Lainnya;
    const icon = TIPE_ICON[tipe] || TIPE_ICON.Lainnya;
    return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold ${cls}">
        <i class="${icon} text-xs"></i>${tipe}
    </span>`;
}

function statusBadge(status) {
    return status === 'aktif'
        ? `<span class="badge badge-success">Aktif</span>`
        : `<span class="badge badge-info">Dikembalikan</span>`;
}

/**
 * Render dynamic field rows based on selected tipe_agunan.
 * Optionally pre-fill values from `prefill` object.
 */
function renderTipeFields(tipe, prefill = {}) {
    const fields = TIPE_FIELDS[tipe] || TIPE_FIELDS.Lainnya;
    return fields.map(f => {
        const val = prefill[f.id] ?? '';
        let input;
        if (f.type === 'currency') {
            input = `<input type="text" id="agf-${f.id}" value="${val ? fmtRp(val) : ''}"
                placeholder="${f.placeholder}"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                oninput="this.value=App.formatRupiah(this.value.replace(/[^0-9]/g,''))"
                ${f.required ? 'required' : ''}>`;
        } else if (f.type === 'number') {
            input = `<input type="number" id="agf-${f.id}" value="${val}"
                placeholder="${f.placeholder}"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                ${f.required ? 'required' : ''}>`;
        } else {
            input = `<input type="text" id="agf-${f.id}" value="${val}"
                placeholder="${f.placeholder}"
                class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                ${f.required ? 'required' : ''}>`;
        }
        return `
        <div>
            <label class="text-xs font-medium text-gray-600 mb-1 block">${f.label}${f.required ? ' <span class="text-red-500">*</span>' : ''}</label>
            ${input}
        </div>`;
    }).join('');
}

/**
 * Extract plain values from dynamic fields.
 * Returns { no_dokumen, pemilik, nilai_taksasi, ...extras }
 */
function collectTipeFields(tipe) {
    const fields = TIPE_FIELDS[tipe] || TIPE_FIELDS.Lainnya;
    const result = {};
    fields.forEach(f => {
        const el = r(`agf-${f.id}`);
        if (!el) return;
        if (f.type === 'currency') {
            result[f.id] = parseFloat(el.value.replace(/[^0-9]/g, '')) || 0;
        } else {
            result[f.id] = el.value.trim();
        }
    });
    return result;
}

/**
 * Extract prefill values from existing pinjaman.agunan JSON.
 * pinjaman.agunan = { tipe: "...", data: { "No. Sertifikat": "xxx", ... } }
 */
function prefillFromPinjaman(agunanJson, tipe) {
    if (!agunanJson || typeof agunanJson !== 'object') return {};
    const data = agunanJson.data || {};
    const fields = TIPE_FIELDS[tipe] || [];
    const prefill = {};

    // Map the pinjaman.js-style keys (capitalized) back to field ids
    const keyMap = {
        'No. Sertifikat': 'no_dokumen',
        'Nama Pemilik': 'pemilik',
        'Luas': 'luas',
        'Estimasi Nilai': 'nilai_taksasi',
        'No. BPKB': 'no_dokumen',
        'Nopol': 'nopol',
        'Merek Kendaraan': 'merek',
        'Tahun': 'tahun',
        'No. Rekening': 'no_dokumen',
        'Bank Atau Koperasi': 'bank',
        'Atas Nama': 'pemilik',
        'Nominal Saldo': 'nilai_taksasi',
        'Nama Pemegang': 'pemilik',
    };

    Object.entries(data).forEach(([k, v]) => {
        const id = keyMap[k];
        if (id) prefill[id] = v;
    });

    return prefill;
}

/**
 * Map tipe from pinjaman.js naming to AgunanPage naming.
 */
function mapTipe(rawTipe) {
    if (!rawTipe) return 'Lainnya';
    if (rawTipe.includes('SHM') || rawTipe.includes('SHGB')) {
        return rawTipe.includes('SHGB') ? 'SHGB' : 'SHM';
    }
    if (rawTipe.includes('BPKB')) return 'BPKB';
    if (rawTipe.includes('Deposito') || rawTipe.includes('Simpanan')) return 'Deposito';
    return 'Lainnya';
}

// ── Main Page ─────────────────────────────────────────────────
const AgunanPage = {
    async render(container) {
        App.setTitle('Manajemen Agunan', 'Data jaminan/agunan dari pinjaman anggota');

        container.innerHTML = `
        <div class="space-y-4 animate-fadeIn">

            <!-- Header -->
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <h2 class="text-xl font-bold text-gray-900">Manajemen Agunan</h2>
                    <p class="text-sm text-gray-400 mt-0.5">Pencatatan & pengelolaan jaminan pinjaman anggota</p>
                </div>
                <button id="btn-tambah-agunan"
                    class="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-primary-500/20 active:scale-[0.97]">
                    <i class="ri-add-line text-base"></i> Tambah Agunan
                </button>
            </div>

            <!-- Stats -->
            <div id="agunan-stats" class="grid grid-cols-2 sm:grid-cols-4 gap-3"></div>

            <!-- Toolbar -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-wrap gap-3 items-center">
                <div class="relative flex-1 min-w-48">
                    <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <input id="ag-search" type="text" placeholder="Cari nama, no. pinjaman, dokumen..."
                        class="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                        oninput="AgunanPage.onSearch(this.value)">
                </div>
                <select id="ag-filter-tipe" onchange="AgunanPage.onFilter()"
                    class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30">
                    <option value="">Semua Tipe</option>
                    ${TIPE_AGUNAN.map(t => `<option value="${t}">${t}</option>`).join('')}
                </select>
                <select id="ag-filter-status" onchange="AgunanPage.onFilter()"
                    class="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/30">
                    <option value="">Semua Status</option>
                    <option value="aktif">Aktif</option>
                    <option value="dikembalikan">Dikembalikan</option>
                </select>
                <button onclick="AgunanPage.exportPDF()"
                    class="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium rounded-xl transition">
                    <i class="ri-file-pdf-line"></i> PDF
                </button>
                <button onclick="AgunanPage.exportCSV()"
                    class="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 text-sm font-medium rounded-xl transition">
                    <i class="ri-file-excel-line"></i> CSV
                </button>
            </div>

            <!-- Table -->
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div id="agunan-table"><div class="flex justify-center py-16"><i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div></div>
            </div>

        </div>`;

        r('btn-tambah-agunan').addEventListener('click', () => AgunanPage.openModal());
        this.load();
        this.loadStats();
    },

    _searchTimer: null,
    onSearch(val) {
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(() => {
            _filter.search = val;
            _page = 1;
            this.load();
        }, 400);
    },

    onFilter() {
        _filter.tipe = r('ag-filter-tipe').value;
        _filter.status = r('ag-filter-status').value;
        _page = 1;
        this.load();
    },

    // ── Stats ─────────────────────────────────────────────────
    async loadStats() {
        const res = await App.api('agunan?per_page=9999');
        const all = res?.data || [];
        const aktif = all.filter(d => d.status === 'aktif');
        const total = all.reduce((s, d) => s + parseFloat(d.nilai_taksasi || 0), 0);
        const byTipe = {};
        TIPE_AGUNAN.forEach(t => byTipe[t] = all.filter(d => d.tipe_agunan === t).length);

        rp('agunan-stats', `
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div class="text-xs text-gray-400 font-medium mb-1">Total Agunan</div>
            <div class="text-2xl font-bold text-gray-800">${all.length}</div>
            <div class="text-xs text-gray-400 mt-0.5">${aktif.length} aktif</div>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div class="text-xs text-gray-400 font-medium mb-1">Total Nilai Taksasi</div>
            <div class="text-lg font-bold text-emerald-600">${fmtRp(total)}</div>
            <div class="text-xs text-gray-400 mt-0.5">estimasi nilai jaminan</div>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div class="text-xs text-gray-400 font-medium mb-2">Per Tipe</div>
            <div class="space-y-1">
                ${['SHM', 'SHGB', 'BPKB'].map(t => `
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-500">${t}</span>
                    <span class="font-semibold text-gray-700">${byTipe[t] || 0}</span>
                </div>`).join('')}
            </div>
        </div>
        <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div class="text-xs text-gray-400 font-medium mb-2">Per Tipe (lanjutan)</div>
            <div class="space-y-1">
                ${['Deposito', 'Lainnya'].map(t => `
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-500">${t}</span>
                    <span class="font-semibold text-gray-700">${byTipe[t] || 0}</span>
                </div>`).join('')}
            </div>
            <div class="mt-2 pt-2 border-t border-gray-50 flex items-center justify-between text-xs">
                <span class="text-gray-400">Dikembalikan</span>
                <span class="font-semibold text-gray-500">${all.length - aktif.length}</span>
            </div>
        </div>`);
    },

    // ── Table ─────────────────────────────────────────────────
    async load() {
        rp('agunan-table', '<div class="flex justify-center py-16"><i class="ri-loader-4-line animate-spin text-2xl text-primary-500"></i></div>');

        const q = new URLSearchParams({
            page: _page, per_page: PER_PAGE,
            ..._filter.search ? { search: _filter.search } : {},
            ..._filter.status ? { status: _filter.status } : {},
            ..._filter.tipe ? { tipe: _filter.tipe } : {},
        });

        const res = await App.api(`agunan?${q}`);
        if (!res?.success) {
            rp('agunan-table', `<div class="text-center py-16 text-red-500">${res?.message || 'Gagal memuat data'}</div>`);
            return;
        }
        this._lastData = res.data;
        this._lastPag = res.pagination;
        this.renderTable(res.data, res.pagination);
    },

    renderTable(data, pag) {
        if (!data.length) {
            rp('agunan-table', `
            <div class="text-center py-16">
                <i class="ri-shield-check-line text-5xl text-gray-200"></i>
                <p class="text-gray-400 mt-3">Belum ada data agunan</p>
                <button onclick="AgunanPage.openModal()"
                    class="mt-3 px-4 py-2 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition">
                    + Tambah Agunan
                </button>
            </div>`);
            return;
        }

        const rows = data.map((d, i) => `
        <tr class="hover:bg-gray-50/60 transition-colors align-top">
            <td class="px-4 py-3 text-gray-400 text-sm">${((pag.page - 1) * pag.per_page) + i + 1}</td>
            <td class="px-4 py-3">
                <div class="font-medium text-gray-800 text-sm">${d.anggota_nama}</div>
                <div class="text-xs font-mono text-gray-400 mt-0.5">${d.no_anggota}</div>
            </td>
            <td class="px-4 py-3">
                <div class="font-mono text-xs text-primary-600 font-bold">${d.no_pinjaman}</div>
                <div class="text-xs text-gray-500 mt-0.5">${fmtRp(d.jumlah_pinjaman)}</div>
            </td>
            <td class="px-4 py-3">${tipeBadge(d.tipe_agunan)}</td>
            <td class="px-4 py-3">
                <div class="text-sm font-medium text-gray-800">${d.deskripsi}</div>
                ${d.no_dokumen ? `<div class="text-xs text-gray-400 mt-0.5 font-mono">No: ${d.no_dokumen}</div>` : ''}
                ${d.pemilik ? `<div class="text-xs text-gray-500 mt-0.5">Pemilik: ${d.pemilik}</div>` : ''}
            </td>
            <td class="px-4 py-3 text-right">
                <div class="text-sm font-semibold text-emerald-700">${fmtRp(d.nilai_taksasi)}</div>
            </td>
            <td class="px-4 py-3">
                <div class="text-xs text-gray-500">${fmtD(d.tgl_terima)}</div>
                ${d.tgl_kembali ? `<div class="text-xs text-blue-500 mt-0.5">Kembali: ${fmtD(d.tgl_kembali)}</div>` : ''}
            </td>
            <td class="px-4 py-3 text-center">${statusBadge(d.status)}</td>
            <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                    <button onclick="AgunanPage.openModal(${d.id})" title="Edit"
                        class="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition">
                        <i class="ri-pencil-line text-base"></i>
                    </button>
                    ${d.status === 'aktif' ? `
                    <button onclick="AgunanPage.gantiAgunan(${d.id})" title="Ganti Agunan"
                        class="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition">
                        <i class="ri-refresh-line text-base"></i>
                    </button>
                    <button onclick="AgunanPage.kembalikan(${d.id})" title="Tandai Dikembalikan"
                        class="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition">
                        <i class="ri-check-double-line text-base"></i>
                    </button>` : ''}
                    <button onclick="AgunanPage.cetakSuratPenyerahan(${d.id})" title="Cetak Surat Penyerahan"
                        class="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <i class="ri-printer-line text-base"></i>
                    </button>
                    <button onclick="AgunanPage.hapus(${d.id})" title="Hapus"
                        class="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <i class="ri-delete-bin-line text-base"></i>
                    </button>
                </div>
            </td>
        </tr>`).join('');

        rp('agunan-table', `
        <div class="overflow-x-auto">
            <table class="w-full text-sm">
                <thead>
                    <tr class="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100">
                        <th class="px-4 py-3 text-left w-10">No</th>
                        <th class="px-4 py-3 text-left">Anggota</th>
                        <th class="px-4 py-3 text-left">Pinjaman</th>
                        <th class="px-4 py-3 text-left">Tipe</th>
                        <th class="px-4 py-3 text-left">Deskripsi / Detail</th>
                        <th class="px-4 py-3 text-right">Nilai Taksasi</th>
                        <th class="px-4 py-3 text-left">Tanggal</th>
                        <th class="px-4 py-3 text-center">Status</th>
                        <th class="px-4 py-3 text-right">Aksi</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">${rows}</tbody>
            </table>
        </div>
        ${App.renderPagination(pag, 'AgunanPage.goPage')}`);
    },

    goPage(p) {
        _page = p;
        AgunanPage.load();
    },

    // ── Modal ─────────────────────────────────────────────────
    async openModal(id = null) {
        _editId = id;
        _selectedPinjaman = null;

        let data = {};
        if (id) {
            const res = await App.api(`agunan/${id}`);
            if (!res?.success) { App.toast('Gagal memuat data', 'error'); return; }
            data = res.data;
        }

        // Initial tipe
        const initTipe = data.tipe_agunan || 'SHM';
        const tipeOpts = TIPE_AGUNAN.map(t =>
            `<option value="${t}" ${t === initTipe ? 'selected' : ''}>${t}</option>`
        ).join('');

        // Prefill for dynamic fields (on edit)
        const initPrefill = id ? {
            no_dokumen: data.no_dokumen || '',
            pemilik: data.pemilik || '',
            nilai_taksasi: data.nilai_taksasi || 0,
        } : {};

        const tglTerima = data.tgl_terima ? App.formatDate(data.tgl_terima) : (App.todayDMY ? App.todayDMY() : '');

        App.openModal(`
        <div class="p-6">
            <div class="flex items-center gap-3 mb-5">
                <div class="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shrink-0">
                    <i class="ri-shield-check-line text-lg"></i>
                </div>
                <div>
                    <h3 class="font-bold text-gray-800">${id ? 'Edit Agunan' : 'Tambah Agunan'}</h3>
                    <p class="text-xs text-gray-400 mt-0.5">Isi detail jaminan / agunan pinjaman</p>
                </div>
            </div>

            <form id="form-agunan" class="space-y-4" onsubmit="AgunanPage.save(event)">

                <!-- Pinjaman Autocomplete -->
                <div>
                    <label class="text-sm font-medium text-gray-700 mb-1 block">
                        Pinjaman <span class="text-red-500">*</span>
                    </label>
                    ${id ? `
                    <!-- Edit mode: show read-only pinjaman info -->
                    <div class="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                        <i class="ri-file-text-line text-primary-500"></i>
                        <div>
                            <div class="text-sm font-mono font-semibold text-primary-700">${data.no_pinjaman}</div>
                            <div class="text-xs text-gray-500">${data.anggota_nama} · ${fmtRp(data.jumlah_pinjaman)}</div>
                        </div>
                    </div>
                    <input type="hidden" id="ag-pinjaman_id" value="${data.pinjaman_id}">
                    ` : `
                    <!-- Add mode: autocomplete search -->
                    <div class="relative">
                        <i class="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                        <input type="text" id="ag-pinjaman-search" autocomplete="off"
                            placeholder="Cari no. anggota, nama, atau no. pinjaman..."
                            class="w-full pl-8 pr-10 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30">
                        <span id="ag-pinjaman-clear" class="hidden absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 cursor-pointer text-lg leading-none" onclick="AgunanPage.clearPinjaman()">×</span>
                    </div>
                    <div id="ag-pinjaman-dd" class="hidden border border-gray-200 rounded-xl mt-1 max-h-44 overflow-auto bg-white shadow-lg z-50"></div>
                    <div id="ag-pinjaman-selected" class="hidden mt-2 flex items-center gap-2 bg-primary-50 border border-primary-100 rounded-xl px-3 py-2">
                        <i class="ri-checkbox-circle-fill text-primary-500"></i>
                        <span id="ag-pinjaman-selected-text" class="text-sm text-primary-700 font-medium"></span>
                    </div>
                    <input type="hidden" id="ag-pinjaman_id">
                    `}
                </div>

                <!-- Tipe Agunan -->
                <div>
                    <label class="text-sm font-medium text-gray-700 mb-1 block">
                        Tipe Agunan <span class="text-red-500">*</span>
                    </label>
                    <select id="ag-tipe_agunan" onchange="AgunanPage.onTipeChange(this.value)"
                        class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30">
                        ${tipeOpts}
                    </select>
                </div>

                <!-- Deskripsi -->
                <div>
                    <label class="text-sm font-medium text-gray-700 mb-1 block">
                        Nama/Deskripsi Agunan <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="ag-deskripsi" required value="${data.deskripsi || ''}"
                        placeholder="Contoh: Sertifikat Tanah SHM No.12345 atas nama Budi"
                        class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30">
                </div>

                <!-- Dynamic fields per tipe -->
                <div id="ag-dynamic-fields" class="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    ${renderTipeFields(initTipe, initPrefill)}
                </div>

                <!-- Tanggal Terima -->
                <div>
                    <label class="text-sm font-medium text-gray-700 mb-1 block">
                        Tanggal Terima <span class="text-red-500">*</span>
                    </label>
                    <input type="text" id="ag-tgl_terima" required value="${tglTerima}"
                        class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30">
                </div>

                <!-- Keterangan -->
                <div>
                    <label class="text-sm font-medium text-gray-700 mb-1 block">Keterangan</label>
                    <textarea id="ag-keterangan" rows="2"
                        class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none"
                        placeholder="Catatan tambahan...">${data.keterangan || ''}</textarea>
                </div>

                <div class="flex justify-end gap-3 pt-2">
                    <button type="button" onclick="App.closeModal()"
                        class="px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition">
                        Batal
                    </button>
                    <button type="submit" id="btn-save-agunan"
                        class="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-primary-500/20 active:scale-[0.97]">
                        <i class="ri-save-line"></i> ${id ? 'Perbarui' : 'Simpan'}
                    </button>
                </div>
            </form>
        </div>`);

        // Init datepicker
        if (App.datepicker) App.datepicker('#ag-tgl_terima');
        else if (App.initDatepicker) App.initDatepicker('#ag-tgl_terima');

        // Setup autocomplete if add mode
        if (!id) {
            this._setupPinjamanSearch();
        }
    },

    // ── Pinjaman Autocomplete Setup ───────────────────────────
    _setupPinjamanSearch() {
        const inp = r('ag-pinjaman-search');
        if (!inp) return;

        let debTimer;
        inp.addEventListener('input', e => {
            clearTimeout(debTimer);
            const val = e.target.value.trim();
            if (val.length < 2) {
                rp('ag-pinjaman-dd', '');
                r('ag-pinjaman-dd').classList.add('hidden');
                return;
            }
            debTimer = setTimeout(async () => {
                const res = await App.api(`pinjaman?search=${encodeURIComponent(val)}&per_page=8`);
                const dd = r('ag-pinjaman-dd');
                if (!res?.data?.length) {
                    dd.innerHTML = '<div class="px-4 py-3 text-gray-400 text-xs italic">Tidak ada pinjaman ditemukan</div>';
                    dd.classList.remove('hidden');
                    return;
                }
                dd.innerHTML = res.data.map(p => `
                <div class="px-4 py-3 hover:bg-primary-50 cursor-pointer border-b border-gray-50 last:border-0 flex items-start gap-3"
                    onclick="AgunanPage.selectPinjaman(${JSON.stringify(p).replace(/"/g, '&quot;')})">
                    <i class="ri-file-text-line text-primary-400 mt-0.5 shrink-0"></i>
                    <div class="min-w-0">
                        <div class="font-mono text-xs font-bold text-primary-700">${p.no_pinjaman}</div>
                        <div class="font-medium text-gray-800 text-sm truncate">${p.anggota_nama}</div>
                        <div class="text-xs text-gray-400">${p.no_anggota} · ${fmtRp(p.jumlah)} · <span class="capitalize">${p.status}</span></div>
                    </div>
                </div>`).join('');
                dd.classList.remove('hidden');
            }, 300);
        });

        // Close dropdown on outside click
        document.addEventListener('click', function onOutside(e) {
            if (!r('ag-pinjaman-dd')?.contains(e.target) && e.target !== inp) {
                r('ag-pinjaman-dd')?.classList.add('hidden');
                document.removeEventListener('click', onOutside);
            }
        });
    },

    selectPinjaman(p) {
        _selectedPinjaman = p;
        r('ag-pinjaman_id').value = p.id;
        r('ag-pinjaman-search').value = `${p.no_pinjaman} — ${p.anggota_nama}`;
        r('ag-pinjaman-dd').classList.add('hidden');
        r('ag-pinjaman-clear').classList.remove('hidden');

        // Show selected chip
        const sel = r('ag-pinjaman-selected');
        r('ag-pinjaman-selected-text').textContent =
            `${p.no_pinjaman} · ${p.anggota_nama} · ${fmtRp(p.jumlah)} · ${p.status}`;
        sel.classList.remove('hidden');

        // Auto-populate from existing pinjaman.agunan
        if (p.agunan && typeof p.agunan === 'object' && p.agunan.tipe) {
            const mappedTipe = mapTipe(p.agunan.tipe);
            const tipeEl = r('ag-tipe_agunan');
            if (tipeEl) {
                tipeEl.value = mappedTipe;
                const prefill = prefillFromPinjaman(p.agunan, mappedTipe);
                this.onTipeChange(mappedTipe, prefill);
            }

            // Auto deskripsi from pinjaman.agunan
            const deskEl = r('ag-deskripsi');
            if (deskEl && !deskEl.value) {
                const t = p.agunan.tipe;
                const d = p.agunan.data || {};
                const parts = [t, d['No. Sertifikat'] || d['No. BPKB'] || d['No. Rekening'] || ''].filter(Boolean);
                deskEl.value = parts.join(' - ');
            }

            App.toast('Data agunan dari pengajuan berhasil diisi otomatis', 'info', 2500);
        }
    },

    clearPinjaman() {
        _selectedPinjaman = null;
        r('ag-pinjaman_id').value = '';
        r('ag-pinjaman-search').value = '';
        r('ag-pinjaman-clear').classList.add('hidden');
        r('ag-pinjaman-selected').classList.add('hidden');
        r('ag-pinjaman-selected-text').textContent = '';
    },

    // ── Dynamic fields on tipe change ─────────────────────────
    onTipeChange(tipe, prefill = {}) {
        const container = r('ag-dynamic-fields');
        if (!container) return;
        container.innerHTML = renderTipeFields(tipe, prefill);
    },

    // ── Save ──────────────────────────────────────────────────
    async save(e) {
        e.preventDefault();
        const btn = r('btn-save-agunan');
        btn.disabled = true;
        btn.innerHTML = '<i class="ri-loader-4-line animate-spin mr-1"></i> Menyimpan...';

        const pinjamanId = r('ag-pinjaman_id')?.value;
        const tipe = r('ag-tipe_agunan')?.value || 'Lainnya';
        const tglRaw = r('ag-tgl_terima')?.value;
        const tglISO = App.dateToISO ? App.dateToISO(tglRaw) : tglRaw;

        // Collect dynamic fields
        const dynFields = collectTipeFields(tipe);
        const nilaiTaksasi = dynFields.nilai_taksasi ?? 0;
        const noDokumen = dynFields.no_dokumen ?? '';
        const pemilik = dynFields.pemilik ?? '';

        const body = {
            pinjaman_id: pinjamanId,
            tipe_agunan: tipe,
            deskripsi: r('ag-deskripsi')?.value || '',
            no_dokumen: noDokumen,
            pemilik: pemilik,
            nilai_taksasi: nilaiTaksasi,
            tgl_terima: tglISO,
            keterangan: r('ag-keterangan')?.value || '',
        };

        if (!body.pinjaman_id) {
            App.toast('Pilih pinjaman terlebih dahulu', 'error');
            btn.disabled = false;
            btn.innerHTML = `<i class="ri-save-line mr-1"></i> ${_editId ? 'Perbarui' : 'Simpan'}`;
            return;
        }

        const res = _editId
            ? await App.api(`agunan/${_editId}`, { method: 'PUT', body })
            : await App.api('agunan', { method: 'POST', body });

        btn.disabled = false;
        btn.innerHTML = `<i class="ri-save-line mr-1"></i> ${_editId ? 'Perbarui' : 'Simpan'}`;

        if (res?.success) {
            App.closeModal();
            App.toast(res.message || 'Berhasil disimpan', 'success');
            this.load();
            this.loadStats();
        } else {
            App.toast(res?.message || 'Gagal menyimpan', 'error');
        }
    },

    // ── Ganti Agunan ──────────────────────────────────────────
    async gantiAgunan(id) {
        // Load agunan lama
        const res = await App.api(`agunan/${id}`);
        if (!res?.success) { App.toast('Gagal memuat data agunan', 'error'); return; }
        const lama = res.data;

        const ok = await App.confirm(
            'Ganti Agunan',
            `Agunan lama (${lama.tipe_agunan} — ${lama.deskripsi}) akan ditandai <b>Dikembalikan</b> dan Anda akan memasukkan agunan pengganti untuk pinjaman yang sama. Lanjutkan?`,
            'warning'
        );
        if (!ok) return;

        // Mark agunan lama sebagai dikembalikan
        const resKbl = await App.api(`agunan/${id}/kembalikan`, {
            method: 'PUT',
            body: { tgl_kembali: new Date().toISOString().slice(0, 10) }
        });
        if (!resKbl?.success) { App.toast(resKbl?.message || 'Gagal menandai agunan lama', 'error'); return; }

        // Buka modal tambah agunan baru — pre-fill pinjaman
        _editId = null;
        _selectedPinjaman = {
            id: lama.pinjaman_id,
            no_pinjaman: lama.no_pinjaman,
            anggota_nama: lama.anggota_nama,
            jumlah: lama.jumlah_pinjaman,
            status: lama.status_pinjaman,
            no_anggota: lama.no_anggota,
            agunan: null   // no auto-populate from old
        };

        await this.openModal(null);

        // Auto-fill pinjaman field in the just-opened modal
        const pidEl = r('ag-pinjaman_id');
        const srchEl = r('ag-pinjaman-search');
        const selEl = r('ag-pinjaman-selected');
        const selTxt = r('ag-pinjaman-selected-text');
        if (pidEl) pidEl.value = lama.pinjaman_id;
        if (srchEl) srchEl.value = `${lama.no_pinjaman} — ${lama.anggota_nama}`;
        if (selEl) selEl.classList.remove('hidden');
        if (selTxt) selTxt.textContent = `${lama.no_pinjaman} · ${lama.anggota_nama} · ${fmtRp(lama.jumlah_pinjaman)}`;
        const clrEl = r('ag-pinjaman-clear');
        if (clrEl) clrEl.classList.remove('hidden');

        App.toast('Silakan isi data agunan pengganti', 'info', 3000);
    },

    // ── Kembalikan ────────────────────────────────────────────
    async kembalikan(id) {
        const ok = await App.confirm('Tandai Dikembalikan',
            'Agunan akan ditandai sudah dikembalikan ke pemilik. Lanjutkan?', 'question');
        if (!ok) return;

        const res = await App.api(`agunan/${id}/kembalikan`, {
            method: 'PUT',
            body: { tgl_kembali: new Date().toISOString().slice(0, 10) }
        });
        if (res?.success) {
            App.toast('Agunan berhasil ditandai dikembalikan', 'success');
            this.load(); this.loadStats();
        } else {
            App.toast(res?.message || 'Gagal', 'error');
        }
    },

    // ── Cetak Surat Penyerahan Agunan (PDF) ──────────────────
    async cetakSuratPenyerahan(id) {
        const res = await App.api(`agunan/${id}`);
        if (!res?.success) { App.toast('Gagal memuat data agunan', 'error'); return; }
        const d = res.data;

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const m = 20;

        const setFont = (size, style = 'normal', color = [30, 30, 30]) => {
            doc.setFontSize(size);
            doc.setFont('helvetica', style);
            doc.setTextColor(...color);
        };

        const title = 'Surat Penyerahan Agunan / Jaminan';

        // Use App helpers for consistent branding
        App.drawPDFHeader(doc, title);
        App.drawPDFFooter(doc);

        let y = 44;

        // ── Nomor & Tanggal Surat ────────────────────────────
        const today = new Date();
        const tglSurat = today.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
        const noSurat = `${String(id).padStart(4, '0')}/AGN/${today.getFullYear()}`;

        setFont(9, 'normal', [60, 60, 60]);
        doc.text(`No. Surat   : ${noSurat}`, m, y);
        doc.text(`Tanggal     : ${tglSurat}`, m, y + 6);
        y += 18;

        // ── Judul ────────────────────────────────────────────
        setFont(12, 'bold', [15, 23, 42]);
        doc.text('SURAT PENYERAHAN AGUNAN', pw / 2, y, { align: 'center' });
        y += 4;
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(m, y, pw - m, y);
        y += 8;

        // ── Pembuka ──────────────────────────────────────────
        setFont(10, 'normal', [40, 40, 40]);
        const namaKop = App.settings['nama_koperasi']?.value || 'KOPERASI';
        const pembuka = doc.splitTextToSize(
            `Yang bertanda tangan di bawah ini, anggota dari ${namaKop}, dengan ini menyerahkan agunan/jaminan sebagai syarat pinjaman kepada pihak koperasi, dengan rincian sebagai berikut:`,
            pw - 2 * m
        );
        doc.text(pembuka, m, y);
        y += pembuka.length * 5.5 + 6;

        // ── Box Info Anggota & Pinjaman ──────────────────────
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(200, 210, 220);
        doc.setLineWidth(0.3);
        doc.rect(m, y, pw - 2 * m, 26, 'FD');
        y += 6;

        const row = (label, val, indent = m + 4) => {
            setFont(9, 'bold', [80, 80, 80]);
            doc.text(label, indent, y);
            setFont(9, 'normal', [30, 30, 30]);
            doc.text(String(val || '-'), indent + 50, y);
            y += 5.5;
        };

        row('Nama Anggota', d.anggota_nama);
        row('No. Anggota', d.no_anggota);
        row('No. Pinjaman', d.no_pinjaman);
        row('Jumlah Pinjaman', fmtRp(d.jumlah_pinjaman));
        y += 6;

        // ── Box Detail Agunan ────────────────────────────────
        setFont(10, 'bold', [15, 23, 42]);
        doc.text('Detail Agunan / Jaminan', m, y);
        y += 5;

        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(200, 210, 220);
        doc.setLineWidth(0.3);
        doc.rect(m, y, pw - 2 * m, 50, 'FD');
        y += 6;

        row('Tipe Agunan', d.tipe_agunan);
        row('Deskripsi', d.deskripsi);
        row('No. Dokumen', d.no_dokumen || '-');
        row('Nama Pemilik', d.pemilik || '-');
        row('Nilai Taksasi', fmtRp(d.nilai_taksasi));
        row('Tanggal Terima', fmtD(d.tgl_terima));
        if (d.keterangan) row('Keterangan', d.keterangan);
        y += 8;

        // ── Penutup ──────────────────────────────────────────
        setFont(10, 'normal', [40, 40, 40]);
        const penutup = doc.splitTextToSize(
            'Demikian surat penyerahan agunan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya. Agunan tersebut diterima dalam kondisi baik dan akan dikembalikan setelah pinjaman dinyatakan lunas.',
            pw - 2 * m
        );
        doc.text(penutup, m, y);
        y += penutup.length * 5.5 + 12;

        // ── Tanda Tangan ─────────────────────────────────────
        const colLeft = m;
        const colRight = pw / 2 + 5;
        const colW = (pw / 2) - m - 5;

        setFont(10, 'bold', [30, 30, 30]);
        doc.text('Pihak Penyerah (Anggota)', colLeft, y, { maxWidth: colW });
        doc.text('Pihak Penerima (Koperasi)', colRight, y, { maxWidth: colW });
        y += 5;

        setFont(8, 'normal', [100, 100, 100]);
        doc.text(`(${d.anggota_nama})`, colLeft, y);
        doc.text(`(${namaKop})`, colRight, y);
        y += 28;

        // Garis TTD
        doc.setDrawColor(150, 150, 150);
        doc.setLineWidth(0.3);
        doc.line(colLeft, y, colLeft + colW, y);
        doc.line(colRight, y, colRight + colW, y);
        y += 4;

        setFont(8, 'normal', [100, 100, 100]);
        doc.text(d.anggota_nama, colLeft + (colW / 2), y, { align: 'center' });
        doc.text('Pengurus/Petugas', colRight + (colW / 2), y, { align: 'center' });

        // ── Footer ───────────────────────────────────────────
        doc.setFillColor(15, 23, 42);
        doc.rect(0, ph - 10, pw, 10, 'F');
        setFont(7, 'normal', [150, 160, 180]);
        doc.text(`Dicetak otomatis oleh sistem · ${tglSurat}`, pw / 2, ph - 4, { align: 'center' });

        // ── Open in new tab ───────────────────────────────────
        window.open(doc.output('bloburl'), '_blank');
        App.toast('Surat Penyerahan Agunan berhasil dibuka', 'success');
    },

    // ── Hapus ─────────────────────────────────────────────────
    async hapus(id) {
        const ok = await App.confirm('Hapus Agunan', 'Data agunan akan dihapus permanen. Lanjutkan?', 'warning');
        if (!ok) return;

        const res = await App.api(`agunan/${id}`, { method: 'DELETE' });
        if (res?.success) {
            App.toast('Agunan berhasil dihapus', 'success');
            this.load(); this.loadStats();
        } else {
            App.toast(res?.message || 'Gagal menghapus', 'error');
        }
    },

    // ── Export ────────────────────────────────────────────────
    _exportCols() {
        return [
            { title: 'No', key: 'no' },
            { title: 'Anggota', key: 'anggota_nama' },
            { title: 'No. Pinjaman', key: 'no_pinjaman' },
            { title: 'Tipe Agunan', key: 'tipe_agunan' },
            { title: 'Deskripsi', key: 'deskripsi' },
            { title: 'No. Dokumen', key: 'no_dokumen' },
            { title: 'Pemilik', key: 'pemilik' },
            { title: 'Nilai Taksasi', key: 'nilai_taksasi_fmt' },
            { title: 'Tgl Terima', key: 'tgl_terima_fmt' },
            { title: 'Status', key: 'status' },
        ];
    },
    _prepareData() {
        return (this._lastData || []).map((d, i) => ({
            ...d,
            no: i + 1,
            nilai_taksasi_fmt: fmtRp(d.nilai_taksasi),
            tgl_terima_fmt: fmtD(d.tgl_terima),
            status: d.status.toUpperCase(),
        }));
    },
    exportPDF() { App.exportPDF('Laporan Manajemen Agunan', 'agunan', this._exportCols(), this._prepareData()); },
    exportCSV() { App.exportCSV('agunan', this._exportCols(), this._prepareData()); },
};

window.AgunanPage = AgunanPage;
export default AgunanPage;
