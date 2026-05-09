// ============================================================
// changelog.js — Changelog & Version History Page
// ============================================================

const CHANGELOG_URL = (() => {
    const script = document.querySelector('script[src*="assets/js/app.js"]');
    let root = '/';
    if (script?.src) root = new URL(script.src).pathname.split('assets/js/app.js')[0];
    return root + 'CHANGELOG.md';
})();

// ── Markdown-like parser (changelog specific) ────────────────
function parseChangelog(text) {
    const lines = text.split('\n');
    const versions = [];
    let current = null;
    let currentType = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trimEnd();

        // Version header: ## [vX.X.X] - YYYY-MM-DD
        const vMatch = line.match(/^##\s+\[([^\]]+)\]\s*-\s*(.+)/);
        if (vMatch) {
            current = { version: vMatch[1], date: vMatch[2].trim(), groups: [], _currentGroup: null };
            versions.push(current);
            currentType = null;
            continue;
        }

        if (!current) continue;

        // Change type header: ### ✨ Ditambahkan
        const typeMatch = line.match(/^###\s+(.+)/);
        if (typeMatch) {
            const label = typeMatch[1].trim();
            current._currentGroup = { type: label, items: [] };
            current.groups.push(current._currentGroup);
            continue;
        }

        // List item under a group
        const itemMatch = line.match(/^-\s+(.+)/);
        if (itemMatch && current._currentGroup) {
            current._currentGroup.items.push(itemMatch[1]);
            continue;
        }
    }

    return versions;
}

// ── Type to badge mapper ──────────────────────────────────────
function typeBadge(label) {
    const lower = label.toLowerCase();
    if (lower.includes('ditambahkan') || lower.includes('tambah')) {
        return { bg: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', icon: 'ri-add-circle-line', key: 'tambah' };
    }
    if (lower.includes('diubah') || lower.includes('ubah')) {
        return { bg: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500', icon: 'ri-edit-2-line', key: 'ubah' };
    }
    if (lower.includes('dihapus') || lower.includes('hapus')) {
        return { bg: 'bg-red-100 text-red-700', dot: 'bg-red-500', icon: 'ri-delete-bin-line', key: 'hapus' };
    }
    if (lower.includes('diperbaiki') || lower.includes('perbaiki') || lower.includes('fixed') || lower.includes('fix')) {
        return { bg: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500', icon: 'ri-bug-line', key: 'perbaiki' };
    }
    return { bg: 'bg-gray-100 text-gray-600', dot: 'bg-gray-400', icon: 'ri-information-line', key: 'lainnya' };
}

// ── Render an item text with **bold** and `code` ─────────────
function renderItemText(text) {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-gray-800">$1</strong>')
        .replace(/`(.+?)`/g, '<code class="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>');
}

// ── Parse a date string flexibly ─────────────────────────────
function formatDate(dateStr) {
    try {
        const d = new Date(dateStr.trim());
        if (isNaN(d)) return dateStr;
        return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch { return dateStr; }
}

// ── Build version card HTML ───────────────────────────────────
function buildVersionCard(v, index) {
    const isLatest = index === 0;
    const groupsHtml = v.groups.map(g => {
        const badge = typeBadge(g.type);
        const items = g.items.map(item =>
            `<li class="flex items-start gap-2.5 text-sm text-gray-600 leading-relaxed py-1">
                <span class="mt-1.5 w-1.5 h-1.5 rounded-full ${badge.dot} shrink-0"></span>
                <span>${renderItemText(item)}</span>
            </li>`
        ).join('');

        return `
        <div class="group-block mb-5 last:mb-0" data-type="${badge.key}">
            <div class="flex items-center gap-2 mb-2">
                <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${badge.bg}">
                    <i class="${badge.icon} text-[11px]"></i>
                    ${g.type}
                </span>
            </div>
            <ul class="space-y-0.5 pl-1">${items}</ul>
        </div>`;
    }).join('');

    const bodyId = `cl-body-${v.version.replace(/[^a-z0-9]/gi, '-')}`;
    const arrowId = `cl-arrow-${v.version.replace(/[^a-z0-9]/gi, '-')}`;

    return `
    <div class="version-card relative flex gap-5" data-version="${v.version}">
        <!-- Timeline line & dot -->
        <div class="flex flex-col items-center shrink-0 mt-1">
            <div class="w-4 h-4 rounded-full border-2 flex items-center justify-center ${isLatest ? 'border-primary-600 bg-primary-600' : 'border-gray-300 bg-white'} transition-all">
                ${isLatest ? '<div class="w-1.5 h-1.5 rounded-full bg-white"></div>' : '<div class="w-1.5 h-1.5 rounded-full bg-gray-300"></div>'}
            </div>
            <div class="w-px flex-1 mt-2 ${isLatest ? 'bg-primary-100' : 'bg-gray-100'}"></div>
        </div>

        <!-- Card -->
        <div class="flex-1 mb-8 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
            <!-- Card Header -->
            <div onclick="ChangelogPage.toggleVersion('${v.version}')" 
                class="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-gray-50/50 cursor-pointer hover:bg-gray-100/50 transition-colors group">
                <div class="flex items-center gap-3">
                    <span class="font-bold text-lg text-gray-900 tracking-tight font-mono">${v.version}</span>
                    ${isLatest ? '<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary-100 text-primary-700"><i class="ri-rocket-line text-[11px]"></i> Terbaru</span>' : ''}
                </div>
                <div class="flex items-center gap-4">
                    <div class="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                        <i class="ri-calendar-line"></i>
                        <span>${formatDate(v.date)}</span>
                    </div>
                    <div class="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 group-hover:bg-white transition-all shadow-sm border border-transparent group-hover:border-gray-100">
                        <i id="${arrowId}" class="ri-arrow-down-s-line text-xl transition-transform duration-300 ${isLatest ? 'rotate-180' : ''}"></i>
                    </div>
                </div>
            </div>
            <!-- Card Body -->
            <div id="${bodyId}" class="px-6 py-5 ${isLatest ? '' : 'hidden'}">
                ${groupsHtml || '<p class="text-sm text-gray-400">Tidak ada detail perubahan.</p>'}
            </div>
        </div>
    </div>`;
}

// ── Filter bar ────────────────────────────────────────────────
function filterBar() {
    const filters = [
        { key: 'all', label: 'Semua', icon: 'ri-stack-line', color: 'gray' },
        { key: 'tambah', label: 'Ditambahkan', icon: 'ri-add-circle-line', color: 'emerald' },
        { key: 'ubah', label: 'Diubah', icon: 'ri-edit-2-line', color: 'blue' },
        { key: 'perbaiki', label: 'Diperbaiki', icon: 'ri-bug-line', color: 'amber' },
        { key: 'hapus', label: 'Dihapus', icon: 'ri-delete-bin-line', color: 'red' },
    ];
    const colorMap = {
        gray: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
        emerald: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
        blue: 'bg-blue-50 text-blue-700 hover:bg-blue-100',
        amber: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
        red: 'bg-red-50 text-red-700 hover:bg-red-100',
    };
    return filters.map(f =>
        `<button onclick="ChangelogPage.applyFilter('${f.key}')" id="filter-${f.key}"
            class="filter-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-semibold transition-all ${f.key === 'all' ? colorMap[f.color] + ' ring-2 ring-offset-1 ring-gray-300' : colorMap[f.color]}">
            <i class="${f.icon} text-sm"></i>${f.label}
        </button>`
    ).join('');
}

// ── Module ────────────────────────────────────────────────────
const ChangelogPage = {
    _versions: [],
    _activeFilter: 'all',

    async render(container) {
        App.setTitle('Changelog', 'Riwayat perubahan & versi aplikasi');

        container.innerHTML = `
        <div class="max-w-3xl mx-auto">

            <!-- Header hero -->
            <div class="mb-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl px-8 py-7 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
                <div class="absolute top-0 right-0 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
                <div class="relative z-10">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                            <i class="ri-git-repository-line text-xl text-white"></i>
                        </div>
                        <div>
                            <h2 class="text-xl font-bold tracking-tight">Changelog</h2>
                            <p class="text-slate-400 text-xs font-medium">Riwayat Versi Aplikasi</p>
                        </div>
                    </div>
                    <p class="text-slate-300 text-sm leading-relaxed max-w-lg">
                        Semua perubahan, penambahan fitur, perbaikan bug, dan pembaruan sistem dicatat di sini secara kronologis.
                    </p>
                    <div class="mt-5 flex items-center gap-4">
                        <div id="cl-latest-badge" class="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur rounded-xl text-sm font-semibold border border-white/10">
                            <i class="ri-loader-4-line animate-spin text-slate-400"></i>
                            <span class="text-slate-400">Memuat...</span>
                        </div>
                        <a href="CHANGELOG.md" target="_blank"
                            class="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors font-medium">
                            <i class="ri-file-text-line"></i> Lihat Raw CHANGELOG.md
                        </a>
                    </div>
                </div>
            </div>

            <!-- Filter -->
            <div class="mb-6 flex flex-wrap gap-2">
                ${filterBar()}
            </div>

            <!-- Timeline container -->
            <div id="cl-timeline" class="relative">
                <!-- Loading skeleton -->
                ${[1, 2].map(() => `
                <div class="flex gap-5 mb-8 animate-pulse">
                    <div class="shrink-0 mt-1"><div class="w-4 h-4 rounded-full bg-gray-200"></div></div>
                    <div class="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div class="flex items-center justify-between px-6 py-4 border-b border-gray-50 bg-gray-50/50">
                            <div class="h-5 w-20 bg-gray-200 rounded"></div>
                            <div class="h-4 w-28 bg-gray-100 rounded"></div>
                        </div>
                        <div class="px-6 py-5 space-y-3">
                            <div class="h-4 w-32 bg-gray-100 rounded-full"></div>
                            ${[1, 2, 3].map(() => `<div class="h-3 bg-gray-50 rounded w-full"></div>`).join('')}
                        </div>
                    </div>
                </div>`).join('')}
            </div>

        </div>`;

        // Load and parse the CHANGELOG.md
        try {
            const res = await fetch(CHANGELOG_URL + '?v=' + Date.now());
            if (!res.ok) throw new Error('Gagal memuat CHANGELOG.md');
            const text = await res.text();
            this._versions = parseChangelog(text);
            this._renderTimeline();
            this._updateLatestBadge();
        } catch (e) {
            document.getElementById('cl-timeline').innerHTML = `
                <div class="text-center py-16">
                    <i class="ri-error-warning-line text-5xl text-gray-200"></i>
                    <p class="mt-4 text-gray-400 text-sm">${e.message}</p>
                </div>`;
        }
    },

    _renderTimeline() {
        const timeline = document.getElementById('cl-timeline');
        if (!timeline) return;

        const filter = this._activeFilter;
        let filtered = this._versions;

        if (filter !== 'all') {
            filtered = this._versions.map(v => ({
                ...v,
                groups: v.groups.filter(g => typeBadge(g.type).key === filter)
            })).filter(v => v.groups.length > 0);
        }

        if (filtered.length === 0) {
            timeline.innerHTML = `
                <div class="text-center py-16">
                    <i class="ri-filter-off-line text-5xl text-gray-200"></i>
                    <p class="mt-4 text-gray-400 text-sm">Tidak ada data untuk filter ini.</p>
                </div>`;
            return;
        }

        timeline.innerHTML = filtered.map((v, i) => buildVersionCard(v, i)).join('');
    },

    toggleVersion(version) {
        const safeId = version.replace(/[^a-z0-9]/gi, '-');
        const body = document.getElementById(`cl-body-${safeId}`);
        const arrow = document.getElementById(`cl-arrow-${safeId}`);
        if (!body || !arrow) return;

        const isHidden = body.classList.contains('hidden');
        if (isHidden) {
            body.classList.remove('hidden');
            arrow.classList.add('rotate-180');
        } else {
            body.classList.add('hidden');
            arrow.classList.remove('rotate-180');
        }
    },

    _updateLatestBadge() {
        const badge = document.getElementById('cl-latest-badge');
        if (!badge || !this._versions.length) return;
        const latest = this._versions[0];
        badge.innerHTML = `
            <i class="ri-rocket-line text-primary-400"></i>
            <span class="text-white font-bold">${latest.version}</span>
            <span class="text-slate-400 font-normal text-xs">${formatDate(latest.date)}</span>`;
    },

    applyFilter(key) {
        this._activeFilter = key;

        // Update active button styles
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('ring-2', 'ring-offset-1', 'ring-gray-300', 'ring-emerald-300',
                'ring-blue-300', 'ring-amber-300', 'ring-red-300');
        });
        const activeBtn = document.getElementById('filter-' + key);
        if (activeBtn) {
            const ringColor = { all: 'ring-gray-300', tambah: 'ring-emerald-300', ubah: 'ring-blue-300', perbaiki: 'ring-amber-300', hapus: 'ring-red-300' };
            activeBtn.classList.add('ring-2', 'ring-offset-1', ringColor[key] || 'ring-gray-300');
        }

        this._renderTimeline();
    }
};

window.ChangelogPage = ChangelogPage;
export default ChangelogPage;
