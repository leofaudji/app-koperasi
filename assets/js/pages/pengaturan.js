// ============================================================
// pengaturan.js — App Settings Page (Tab Layout)
// ============================================================

let _settings = {};
let _activeTab = 'umum';

const escHtml = str => String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ── Tab definitions ──────────────────────────────────────────
const TABS = {
    umum: { label: 'Informasi Umum', icon: 'ri-information-line', color: 'blue' },
    pwa: { label: 'Portal (PWA)', icon: 'ri-smartphone-line', color: 'indigo' },
    tampilan: { label: 'Tampilan & Logo', icon: 'ri-palette-line', color: 'rose' },
    tema: { label: 'Tema', icon: 'ri-palette-2-line', color: 'purple' },
    backup: { label: 'Backup & Restore', icon: 'ri-database-2-line', color: 'emerald' },
};

// ── Field row helper ─────────────────────────────────────────
function fieldRow(key, cfg) {
    const val = cfg.value ?? '';
    const isColor = key.includes('color');
    const isTextarea = ['alamat', 'pwa_description'].includes(key);
    let input;

    if (isColor) {
        input = `
        <div class="flex items-center gap-3">
            <input type="color" id="s-${key}" value="${val}"
                class="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer p-0.5"
                oninput="document.getElementById('s-${key}-text').value=this.value">
            <input type="text" id="s-${key}-text" value="${escHtml(val)}" maxlength="9"
                class="w-28 px-3 py-1.5 text-sm border border-gray-200 rounded-lg font-mono"
                oninput="document.getElementById('s-${key}').value=this.value">
        </div>`;
    } else if (isTextarea) {
        input = `<textarea id="s-${key}" rows="2"
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30 resize-none">${escHtml(val)}</textarea>`;
    } else if (key === 'logo_url') {
        input = `
        <div class="space-y-3">
            <div class="flex gap-3 items-start">
                <div class="flex-1 space-y-2">
                    <input type="text" id="s-${key}" value="${escHtml(val)}" placeholder="URL Logo (otomatis terisi jika upload)"
                        class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                        oninput="document.getElementById('preview-${key}').src=this.value">
                    <div class="flex items-center gap-2">
                        <label for="file-${key}" class="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 text-gray-600 transition-colors border-dashed border-2">
                            <i class="ri-upload-2-line mr-1"></i> Upload Logo Baru
                        </label>
                        <input type="file" id="file-${key}" class="hidden" accept="image/*" onchange="PengaturanPage.handleLogoSelect(this, '${key}')">
                        <span id="file-name-${key}" class="text-[10px] text-gray-400 truncate max-w-[150px]"></span>
                    </div>
                </div>
                <div class="w-14 h-14 rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    <img id="preview-${key}" src="${val || 'assets/img/placeholder-logo.png'}" 
                        class="max-w-full max-h-full object-contain" 
                        onerror="this.src='assets/img/placeholder-logo.png'">
                </div>
            </div>
            <p class="text-[10px] text-gray-400">Gunakan file PNG/JPG transparan untuk hasil terbaik di PDF.</p>
        </div>`;
    } else if (key.includes('_url')) {
        input = `
        <div class="space-y-3">
            <div class="flex gap-3">
                <input type="text" id="s-${key}" value="${escHtml(val)}"
                    class="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                    oninput="document.getElementById('preview-${key}').src=this.value">
                <div class="w-10 h-10 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                    <img id="preview-${key}" src="${val || 'assets/img/placeholder-logo.png'}" 
                        class="max-w-full max-h-full object-contain" 
                        onerror="this.src='assets/img/placeholder-logo.png'">
                </div>
            </div>
            <p class="text-[10px] text-gray-400">Masukkan URL gambar atau gunakan URL yang sudah ada.</p>
        </div>`;
    } else {
        input = `<input type="text" id="s-${key}" value="${escHtml(val)}"
            class="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/30">`;
    }

    return `
    <div class="grid grid-cols-12 gap-3 items-start py-3.5 border-b border-gray-50 last:border-b-0">
        <label for="s-${key}" class="col-span-4 text-sm font-medium text-gray-600 pt-2">${escHtml(cfg.label)}</label>
        <div class="col-span-8">${input}</div>
    </div>`;
}

// ── Tab nav bar ───────────────────────────────────────────────
function renderTabNav() {
    return `
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div class="flex overflow-x-auto scrollbar-none border-b border-gray-100" id="tab-nav" role="tablist">
            ${Object.entries(TABS).map(([key, t]) => `
            <button role="tab" id="tabnav-${key}"
                onclick="PengaturanPage.switchTab('${key}')"
                class="tab-btn flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all duration-150
                    ${key === _activeTab
            ? 'border-primary-600 text-primary-700 bg-primary-50/50'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}">
                <i class="${t.icon} text-base"></i>
                ${t.label}
            </button>`).join('')}
        </div>
    </div>`;
}

// ── Tab panels ────────────────────────────────────────────────
function renderTabPanel(key) {
    const t = TABS[key];
    const show = key === _activeTab;

    let body = '';

    if (key === 'tema') {
        body = renderThemePanel();
    } else if (key === 'backup') {
        body = renderBackupPanel();
    } else {
        // Settings group panel
        const items = Object.entries(_settings)
            .filter(([, cfg]) => (cfg.group || 'umum') === key)
            .map(([k, cfg]) => fieldRow(k, cfg))
            .join('');
        body = items
            ? `<div class="divide-y divide-gray-50">${items}</div>`
            : `<p class="text-sm text-gray-400 text-center py-6">Tidak ada pengaturan di bagian ini.</p>`;
    }

    return `
    <div id="tabpanel-${key}" role="tabpanel"
        class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200
            ${show ? '' : 'hidden'}">
        <div class="px-6 py-5">
            ${body}
        </div>
    </div>`;
}

function renderThemePanel() {
    const current = localStorage.getItem('app_theme') || 'indigo';
    const themes = window.THEMES || {};
    const cards = Object.entries(themes).map(([key, t]) => {
        const isActive = key === current;
        return `
        <button onclick="PengaturanPage.pickTheme('${key}')"
            id="theme-btn-${key}" title="${t.name}"
            class="flex flex-col items-center gap-2 group">
            <div class="w-12 h-12 rounded-full border-[3px] transition-all duration-200
                ${isActive ? 'border-gray-800 scale-110 shadow-lg' : 'border-transparent hover:border-gray-300 hover:scale-105'}"
                style="background:${t.shade}">
            </div>
            <span class="text-[11px] font-semibold ${isActive ? 'text-gray-800' : 'text-gray-400 group-hover:text-gray-600'} transition-colors">${t.name}</span>
        </button>`;
    }).join('');

    return `
    <div>
        <p class="text-sm text-gray-500 mb-5">Pilih palet warna tampilan aplikasi. Tema disimpan otomatis di browser ini.</p>
        <div class="flex flex-wrap gap-6" id="theme-palette-grid">
            ${cards}
        </div>
    </div>`;
}

function renderBackupPanel() {
    return `
    <div class="space-y-5">

        <!-- Backup -->
        <div class="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4 gap-4">
            <div class="flex items-start gap-3">
                <div class="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <i class="ri-download-cloud-2-line text-lg"></i>
                </div>
                <div>
                    <p class="text-sm font-semibold text-gray-800">Download Backup</p>
                    <p class="text-xs text-gray-400 mt-0.5">Unduh seluruh data database dalam format <code class="bg-gray-200 px-1 rounded">.sql</code></p>
                </div>
            </div>
            <button id="btn-backup-db"
                onclick="PengaturanPage.doBackup()"
                class="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.97] text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-emerald-500/20 shrink-0">
                <i class="ri-download-line"></i>
                Download Backup
            </button>
        </div>

        <!-- Restore -->
        <div class="bg-red-50 border border-red-100 rounded-xl px-5 py-4 space-y-3">
            <div class="flex items-start gap-3">
                <div class="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <i class="ri-upload-cloud-2-line text-lg"></i>
                </div>
                <div>
                    <p class="text-sm font-semibold text-gray-800">Restore Database</p>
                    <p class="text-xs text-red-500 mt-0.5">&#9888;&#65039; Akan <strong>menimpa semua data</strong> yang ada. Pastikan sudah backup terlebih dahulu.</p>
                </div>
            </div>
            <div class="flex items-center gap-3">
                <label class="flex-1">
                    <div class="relative flex items-center gap-3 border-2 border-dashed border-red-200 rounded-xl px-4 py-3
                        cursor-pointer hover:border-red-400 hover:bg-red-50/50 transition-all group bg-white">
                        <i class="ri-file-upload-line text-red-400 text-lg group-hover:text-red-500 transition-colors"></i>
                        <span id="restore-filename" class="text-sm text-gray-400 flex-1 truncate">Pilih file .sql untuk restore...</span>
                        <input type="file" id="restore-file-input" accept=".sql"
                            class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            onchange="PengaturanPage.onRestoreFileChange(this)">
                    </div>
                </label>
                <button id="btn-restore-db"
                    onclick="PengaturanPage.doRestore()"
                    disabled
                    class="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:scale-[0.97] text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-red-500/20 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100">
                    <i class="ri-refresh-line"></i>
                    Restore
                </button>
            </div>
            <p class="text-xs text-red-400">* Hanya file .sql dari fitur backup ini yang dijamin kompatibel. Maks. 50 MB.</p>
        </div>

    </div>`;
}

// ── Save ──────────────────────────────────────────────────────
async function save() {
    const btn = document.getElementById('btn-save-settings');
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<i class="ri-loader-4-line animate-spin mr-1"></i> Menyimpan...';

    const formData = new FormData();
    const settingsData = {};
    for (const key of Object.keys(_settings)) {
        const el = document.getElementById(`s-${key}`);
        if (el) settingsData[key] = el.value;
    }

    // Append each setting to FormData
    for (const [k, v] of Object.entries(settingsData)) {
        formData.append(k, v);
    }

    // Check for logo file upload
    const logoInput = document.getElementById('file-logo_url');
    if (logoInput?.files?.[0]) {
        formData.append('logo_file', logoInput.files[0]);
    }

    // Use POST with FormData
    const res = await App.api('settings', { method: 'POST', body: formData });

    btn.disabled = false;
    btn.innerHTML = '<i class="ri-save-line mr-1"></i> Simpan Pengaturan';

    if (res?.success) {
        App.toast('Pengaturan berhasil disimpan!', 'success');

        // Refresh settings to get new uploaded URL
        const settRes = await App.api('settings');
        if (settRes?.success) {
            _settings = settRes.data;
            App.settings = settRes.data;
            const container = document.getElementById('page-container');
            if (container) renderAll(container);
        }
    } else {
        App.toast(res?.message || 'Gagal menyimpan pengaturan', 'error');
    }
}

// ── Full render ───────────────────────────────────────────────
function renderAll(container) {
    // Tab nav
    container.querySelector('#tab-nav-wrapper').innerHTML = renderTabNav();

    // Tab panels
    const panelWrap = container.querySelector('#tab-panels');
    panelWrap.innerHTML = Object.keys(TABS).map(key => renderTabPanel(key)).join('');
}

// ── Module ────────────────────────────────────────────────────
const PengaturanPage = {
    async render(container, _param) {
        App.setTitle('Pengaturan', 'Konfigurasi aplikasi');

        container.innerHTML = `
        <div class="max-w-3xl mx-auto space-y-4">

            <!-- Header -->
            <div class="flex items-center justify-between">
                <div>
                    <h2 class="text-xl font-bold text-gray-900">Pengaturan Aplikasi</h2>
                    <p class="text-sm text-gray-400 mt-0.5">Konfigurasi koperasi, tampilan, tema, dan database</p>
                </div>
                <button id="btn-save-settings"
                    class="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition shadow-sm shadow-primary-500/20 active:scale-[0.97]">
                    <i class="ri-save-line"></i> Simpan Pengaturan
                </button>
            </div>

            <!-- Tab Nav -->
            <div id="tab-nav-wrapper">
                <!-- Skeleton -->
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm animate-pulse h-14"></div>
            </div>

            <!-- Tab Panels -->
            <div id="tab-panels" class="space-y-0">
                <!-- Skeleton panels -->
                ${[1, 2].map(() => `
                <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse space-y-4">
                    ${[1, 2, 3].map(() => `
                    <div class="grid grid-cols-12 gap-3">
                        <div class="col-span-4 h-4 bg-gray-100 rounded"></div>
                        <div class="col-span-8 h-8 bg-gray-100 rounded-xl"></div>
                    </div>`).join('')}
                </div>`).join('')}
            </div>

        </div>`;

        document.getElementById('btn-save-settings').addEventListener('click', save);

        // Load settings
        const res = await App.api('settings');
        if (!res?.success) { App.toast('Gagal memuat pengaturan', 'error'); return; }
        _settings = res.data;

        renderAll(container);
    },

    switchTab(key) {
        if (_activeTab === key) return;
        _activeTab = key;

        // Update nav buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const isActive = btn.id === `tabnav-${key}`;
            btn.classList.toggle('border-primary-600', isActive);
            btn.classList.toggle('text-primary-700', isActive);
            btn.classList.toggle('bg-primary-50/50', isActive);
            btn.classList.toggle('border-transparent', !isActive);
            btn.classList.toggle('text-gray-500', !isActive);
            btn.classList.toggle('hover:text-gray-700', !isActive);
            btn.classList.toggle('hover:bg-gray-50', !isActive);
        });

        // Show/hide panels
        document.querySelectorAll('[role="tabpanel"]').forEach(panel => {
            panel.classList.toggle('hidden', panel.id !== `tabpanel-${key}`);
        });
    },

    pickTheme(key) {
        if (!window.THEMES?.[key]) { App.toast('Tema tidak ditemukan', 'error'); return; }
        window.applyTheme(key);

        Object.keys(window.THEMES).forEach(k => {
            const btn = document.getElementById(`theme-btn-${k}`);
            if (!btn) return;
            const circle = btn.querySelector('div');
            const label = btn.querySelector('span');
            if (k === key) {
                circle.style.boxShadow = '0 0 0 3px #1f2937';
                circle.style.transform = 'scale(1.15)';
                label.style.color = '#1f2937';
                label.style.fontWeight = '700';
            } else {
                circle.style.boxShadow = '';
                circle.style.transform = '';
                label.style.color = '#9ca3af';
                label.style.fontWeight = '600';
            }
        });
        App.toast(`Tema "${window.THEMES[key].name}" diterapkan!`, 'success', 2000);
    },

    // ── Backup ────────────────────────────────────────────────
    async doBackup() {
        const btn = document.getElementById('btn-backup-db');
        if (!btn) return;
        btn.disabled = true;
        btn.innerHTML = '<i class="ri-loader-4-line animate-spin mr-1"></i> Menyiapkan...';

        try {
            const headers = {};
            if (App.csrfToken) headers['X-CSRF-Token'] = App.csrfToken;

            const response = await fetch('api/?route=backup', {
                method: 'GET',
                credentials: 'include',
                headers,
            });

            if (!response.ok) {
                const err = await response.json().catch(() => ({ message: 'Gagal menghubungi server' }));
                throw new Error(err.message || `HTTP ${response.status}`);
            }

            const blob = await response.blob();
            const filename = response.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1]
                || `backup_db_koperasi_${new Date().toISOString().slice(0, 10)}.sql`;

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            App.toast('Backup berhasil diunduh!', 'success');
        } catch (e) {
            App.toast('Backup gagal: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="ri-download-line mr-1"></i> Download Backup';
        }
    },

    // ── File picker ───────────────────────────────────────────
    onRestoreFileChange(input) {
        const label = document.getElementById('restore-filename');
        const btn = document.getElementById('btn-restore-db');
        if (input.files?.[0]) {
            label.textContent = input.files[0].name;
            label.classList.replace('text-gray-400', 'text-gray-700');
            label.classList.add('font-medium');
            btn.disabled = false;
        } else {
            label.textContent = 'Pilih file .sql untuk restore...';
            label.classList.replace('text-gray-700', 'text-gray-400');
            label.classList.remove('font-medium');
            btn.disabled = true;
        }
    },

    // ── Restore ───────────────────────────────────────────────
    async doRestore() {
        const fileInput = document.getElementById('restore-file-input');
        const btn = document.getElementById('btn-restore-db');

        if (!fileInput?.files?.[0]) {
            App.toast('Pilih file .sql terlebih dahulu', 'error');
            return;
        }

        const confirmed = await App.confirm(
            'Restore Database',
            'Semua data akan DITIMPA oleh data dari file backup. Lanjutkan?',
            'warning'
        );
        if (!confirmed) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="ri-loader-4-line animate-spin mr-1"></i> Memproses...';

        try {
            const formData = new FormData();
            formData.append('sql_file', fileInput.files[0]);

            const headers = {};
            if (App.csrfToken) headers['X-CSRF-Token'] = App.csrfToken;

            const response = await fetch('api/?route=backup', {
                method: 'POST',
                credentials: 'include',
                headers,
                body: formData,
            });

            const result = await response.json().catch(() => ({ success: false, message: 'Respons tidak valid dari server' }));

            if (result?.success) {
                App.toast(result.message || 'Restore berhasil!', 'success', 5000);
                fileInput.value = '';
                PengaturanPage.onRestoreFileChange(fileInput);
            } else {
                App.toast(result?.message || 'Restore gagal', 'error');
            }
        } catch (e) {
            App.toast('Restore gagal: ' + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="ri-refresh-line mr-1"></i> Restore';
        }
    },

    handleLogoSelect(input, key) {
        const file = input.files[0];
        if (!file) return;

        const label = document.getElementById(`file-name-${key}`);
        if (label) label.textContent = file.name;

        // Preview local file
        const reader = new FileReader();
        reader.onload = e => {
            const preview = document.getElementById(`preview-${key}`);
            if (preview) preview.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
};

window.PengaturanPage = PengaturanPage;
export default PengaturanPage;
