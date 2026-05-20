/**
 * Pengundian RAT — Slot Machine / Roulette Style
 * Fitur:
 * - Pilih mode: No. Anggota atau No. Rekening Simpanan
 * - Peserta otomatis diload dari API
 * - Spinner bergaya slot machine digital (rolling numbers)
 * - Confetti animasi saat pemenang ditentukan
 * - Daftar pemenang disimpan per sesi (tidak bisa menang 2x)
 * - Reset sesi, export PDF daftar pemenang
 */
const PengundianRATPage = {
    pool: [],       // semua peserta
    remaining: [],       // belum menang
    winners: [],       // pemenang sesi ini
    spinning: false,
    spinInterval: null,
    audioCtx: null,

    async render(container) {
        App.setTitle('Pengundian RAT', 'Rapat Anggota Tahunan — Undian Hadiah');

        container.innerHTML = `
        <div class="space-y-5 animate-fadeIn">

            <!-- Setup Card -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5" id="rat-setup">
                <h3 class="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <i class="ri-settings-3-line text-primary-600"></i> Pengaturan Undian
                </h3>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <!-- Mode -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 mb-1.5">Sumber Peserta</label>
                        <select id="rat-mode" class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500" onchange="PengundianRATPage.onModeChange()">
                            <option value="anggota">Nomor Anggota</option>
                            <option value="rekening">Nomor Rekening Simpanan</option>
                        </select>
                    </div>
                    <!-- Filter jenis simpanan (muncul jika rekening) -->
                    <div id="rat-jenis-wrap" class="hidden">
                        <label class="block text-xs font-semibold text-gray-500 mb-1.5">Jenis Simpanan</label>
                        <select id="rat-jenis" class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500">
                            <option value="">Semua Jenis</option>
                        </select>
                    </div>
                    <!-- Hadiah label -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-500 mb-1.5">Label Hadiah (opsional)</label>
                        <input type="text" id="rat-hadiah" placeholder="Contoh: Motor, TV, Rp 500.000"
                            class="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500">
                    </div>
                </div>
                <div class="mt-4 flex gap-2 flex-wrap">
                    <button onclick="PengundianRATPage.loadPool()"
                        class="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm hover:shadow-primary-200">
                        <i class="ri-refresh-line"></i> Muat Peserta
                    </button>
                    <button onclick="PengundianRATPage.resetSesi()"
                        class="bg-gray-100 hover:bg-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all">
                        <i class="ri-restart-line"></i> Reset Sesi
                    </button>
                    <button onclick="PengundianRATPage.exportPDF()" id="rat-export-btn" style="display:none"
                        class="bg-red-50 hover:bg-red-100 text-red-600 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all">
                        <i class="ri-file-pdf-line"></i> Cetak Pemenang
                    </button>
                    <div id="rat-pool-info" class="ml-auto flex items-center gap-2 text-sm text-gray-500"></div>
                </div>
            </div>

            <!-- Main Stage: Slot Machine -->
            <div class="relative overflow-hidden rounded-3xl shadow-2xl"
                 style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%); min-height: 460px;">

                <!-- Stars background -->
                <div class="absolute inset-0 overflow-hidden" id="rat-stars"></div>

                <!-- Confetti layer -->
                <canvas id="rat-confetti" class="absolute inset-0 pointer-events-none" style="z-index:10"></canvas>

                <!-- Content -->
                <div class="relative z-10 flex flex-col items-center justify-center py-10 px-6 gap-6">

                    <!-- Title -->
                    <div class="text-center">
                        <div class="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 mb-3">
                            <i class="ri-star-line text-yellow-400"></i>
                            <span class="text-white/80 text-xs font-semibold uppercase tracking-widest">Rapat Anggota Tahunan</span>
                            <i class="ri-star-line text-yellow-400"></i>
                        </div>
                        <h2 class="text-white text-3xl font-black tracking-tight drop-shadow-lg">🎰 PENGUNDIAN HADIAH</h2>
                        <p id="rat-hadiah-label" class="text-yellow-300 text-sm font-semibold mt-1 hidden"></p>
                    </div>

                    <!-- Slot Machine Display -->
                    <div class="relative">
                        <!-- Frame -->
                        <div class="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl p-3 shadow-2xl border border-white/10"
                             style="box-shadow: 0 0 60px rgba(139,92,246,0.4), inset 0 1px 0 rgba(255,255,255,0.1)">

                            <!-- Lights top -->
                            <div class="flex justify-center gap-2 mb-3" id="rat-lights">
                                ${Array.from({ length: 9 }, (_, i) => `<div class="w-3 h-3 rounded-full light-bulb" style="animation-delay:${i * 0.12}s; background: ${['#f59e0b', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#10b981'][i]}"></div>`).join('')}
                            </div>

                            <!-- Slot reel window -->
                            <div class="relative bg-black rounded-2xl overflow-hidden border-4 border-gray-700"
                                 style="width: 360px; height: 120px; max-width: 80vw; box-shadow: inset 0 0 30px rgba(0,0,0,0.8)">

                                <!-- Scanlines overlay -->
                                <div class="absolute inset-0 pointer-events-none" style="background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px); z-index:2"></div>

                                <!-- Highlight center line -->
                                <div class="absolute left-0 right-0 z-10 pointer-events-none" style="top:50%; transform:translateY(-50%); height:44px">
                                    <div class="w-full h-full border-t-2 border-b-2 border-yellow-400/60" style="box-shadow: 0 0 20px rgba(251,191,36,0.3)"></div>
                                </div>

                                <!-- Rolling display -->
                                <div id="rat-reel" class="absolute inset-0 flex flex-col items-center justify-center" style="z-index:1">
                                    <div id="rat-display"
                                         class="text-center transition-none select-none"
                                         style="font-family:'Courier New',monospace; color: #4ade80; text-shadow: 0 0 20px #4ade80, 0 0 40px #4ade80;">
                                        <div style="font-size:2.5rem; font-weight:900; letter-spacing:4px; line-height:1.1" id="rat-no">- - - - -</div>
                                        <div style="font-size:0.75rem; color: rgba(74,222,128,0.7); letter-spacing:2px" id="rat-nama">SIAP DIPUTAR</div>
                                    </div>
                                </div>

                                <!-- Glow effect -->
                                <div class="absolute inset-0 pointer-events-none" style="background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.7) 100%); z-index:3"></div>
                            </div>

                            <!-- Lights bottom -->
                            <div class="flex justify-center gap-2 mt-3">
                                ${Array.from({ length: 9 }, (_, i) => `<div class="w-3 h-3 rounded-full light-bulb" style="animation-delay:${(8 - i) * 0.12}s; background: ${['#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899', '#10b981', '#ef4444', '#f59e0b'][i]}"></div>`).join('')}
                            </div>
                        </div>

                        <!-- Lever (decorative) -->
                        <div class="absolute -right-3 top-1/2 -translate-y-1/2 hidden sm:flex flex-col items-center gap-1">
                            <div class="w-5 h-14 bg-gradient-to-b from-gray-400 to-gray-600 rounded-full shadow-lg"></div>
                            <div class="w-7 h-7 bg-gradient-to-br from-red-400 to-red-600 rounded-full shadow-lg border-2 border-red-300"></div>
                        </div>
                    </div>

                    <!-- PUTAR Button -->
                    <button id="rat-spin-btn" onclick="PengundianRATPage.spin()" disabled
                        class="relative overflow-hidden group px-14 py-4 rounded-2xl text-white font-black text-xl tracking-wide transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        style="background: linear-gradient(135deg, #7c3aed, #4f46e5); box-shadow: 0 8px 32px rgba(124,58,237,0.5), 0 0 0 1px rgba(255,255,255,0.1)">
                        <span class="relative z-10 flex items-center gap-3" id="rat-btn-text">
                            <i class="ri-play-circle-fill text-2xl"></i> PUTAR!
                        </span>
                        <div class="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-all rounded-2xl"></div>
                    </button>

                    <!-- Counter -->
                    <div class="flex gap-6 text-center">
                        <div class="bg-white/10 backdrop-blur rounded-xl px-5 py-2 border border-white/20">
                            <p class="text-white/60 text-[10px] uppercase tracking-wider">Peserta</p>
                            <p class="text-white font-black text-lg" id="rat-count-total">-</p>
                        </div>
                        <div class="bg-white/10 backdrop-blur rounded-xl px-5 py-2 border border-white/20">
                            <p class="text-white/60 text-[10px] uppercase tracking-wider">Tersisa</p>
                            <p class="text-yellow-300 font-black text-lg" id="rat-count-remain">-</p>
                        </div>
                        <div class="bg-white/10 backdrop-blur rounded-xl px-5 py-2 border border-white/20">
                            <p class="text-white/60 text-[10px] uppercase tracking-wider">Pemenang</p>
                            <p class="text-emerald-400 font-black text-lg" id="rat-count-win">0</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Daftar Pemenang -->
            <div id="rat-winners-card" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hidden">
                <div class="px-5 py-4 bg-gradient-to-r from-yellow-50 to-amber-50 border-b border-amber-100 flex items-center justify-between">
                    <h3 class="font-bold text-amber-800 flex items-center gap-2">
                        <i class="ri-trophy-line text-yellow-500 text-lg"></i> Daftar Pemenang
                    </h3>
                    <span id="rat-winners-count" class="bg-amber-200 text-amber-800 text-xs font-bold px-3 py-1 rounded-full">0 Pemenang</span>
                </div>
                <div id="rat-winners-list" class="divide-y divide-gray-50"></div>
            </div>
        </div>

        <style>
        @keyframes lightBulb {
            0%, 100% { opacity: 1; filter: brightness(1.5) drop-shadow(0 0 6px currentColor); }
            50%       { opacity: 0.3; filter: brightness(0.5); }
        }
        .light-bulb { animation: lightBulb 1.2s ease-in-out infinite; }

        @keyframes slotRoll {
            0%   { transform: translateY(0); }
            100% { transform: translateY(-100%); }
        }

        @keyframes winnerGlow {
            0%, 100% { color: #4ade80; text-shadow: 0 0 20px #4ade80, 0 0 40px #4ade80; }
            50%       { color: #fbbf24; text-shadow: 0 0 30px #fbbf24, 0 0 60px #fbbf24; }
        }
        .winner-glow { animation: winnerGlow 0.8s ease-in-out infinite; }

        @keyframes starTwinkle {
            0%, 100% { opacity: 0.3; transform: scale(1); }
            50%       { opacity: 1; transform: scale(1.4); }
        }
        .star-particle { animation: starTwinkle ease-in-out infinite; position: absolute; color: white; font-size: 10px; }

        @keyframes winnerSlide {
            from { opacity: 0; transform: translateX(-20px); }
            to   { opacity: 1; transform: translateX(0); }
        }
        .winner-row { animation: winnerSlide 0.4s ease-out; }
        </style>`;

        this._addStars();
        this._loadJenis();
    },

    _addStars() {
        const el = document.getElementById('rat-stars');
        if (!el) return;
        for (let i = 0; i < 60; i++) {
            const s = document.createElement('div');
            s.className = 'star-particle';
            s.textContent = Math.random() > 0.5 ? '✦' : '·';
            s.style.cssText = `left:${Math.random() * 100}%; top:${Math.random() * 100}%; animation-duration:${1.5 + Math.random() * 3}s; animation-delay:${Math.random() * 3}s; opacity:${0.2 + Math.random() * 0.5}; font-size:${6 + Math.random() * 8}px;`;
            el.appendChild(s);
        }
    },

    async _loadJenis() {
        const r = await App.api('jenis-simpanan');
        const sel = document.getElementById('rat-jenis');
        if (r?.data?.length) {
            r.data.forEach(j => {
                const o = document.createElement('option');
                o.value = j.id; o.textContent = j.nama;
                sel.appendChild(o);
            });
        }
    },

    onModeChange() {
        const mode = document.getElementById('rat-mode').value;
        const wrap = document.getElementById('rat-jenis-wrap');
        wrap.classList.toggle('hidden', mode !== 'rekening');
    },

    async loadPool() {
        const mode = document.getElementById('rat-mode').value;
        const jenisId = document.getElementById('rat-jenis').value;
        const info = document.getElementById('rat-pool-info');
        info.innerHTML = `<div class="animate-spin w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full"></div> Memuat...`;

        let all = [];
        if (mode === 'anggota') {
            // load all anggota aktif
            let page = 1, done = false;
            while (!done) {
                const r = await App.api(`anggota?status=aktif&per_page=200&page=${page}`);
                if (!r?.data?.length) { done = true; break; }
                all.push(...r.data.map(a => ({ no: a.no_anggota, nama: a.nama, id: a.id })));
                if (r.pagination && page >= r.pagination.total_pages) done = true;
                page++;
            }
        } else {
            // load semua rekening simpanan
            let query = 'per_page=500';
            if (jenisId) query += `&jenis_simpanan_id=${jenisId}`;
            const r = await App.api(`rekening-simpanan?${query}`);
            if (r?.data?.length) {
                all = r.data
                    .filter(rk => rk.status === 'aktif')
                    .map(rk => ({ no: rk.no_rekening, nama: rk.anggota_nama, id: rk.id }));
            }
        }

        if (!all.length) {
            App.toast('Tidak ada peserta ditemukan', 'warning');
            info.innerHTML = '';
            return;
        }

        // Fisher-Yates shuffle
        for (let i = all.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [all[i], all[j]] = [all[j], all[i]];
        }

        this.pool = all;
        this.remaining = [...all];
        this.winners = [];
        this._updateCounters();
        this._updateWinnersList();

        document.getElementById('rat-spin-btn').disabled = false;
        document.getElementById('rat-no').textContent = '- - - - -';
        document.getElementById('rat-nama').textContent = 'SIAP DIPUTAR';
        document.getElementById('rat-display').classList.remove('winner-glow');

        App.toast(`${all.length} peserta siap diundi!`, 'success');
        info.innerHTML = `<i class="ri-group-line text-emerald-500"></i><span class="font-semibold text-emerald-700">${all.length} peserta dimuat</span>`;

        // Label hadiah
        const hadiah = document.getElementById('rat-hadiah').value.trim();
        const lbl = document.getElementById('rat-hadiah-label');
        if (hadiah) { lbl.textContent = '🎁 ' + hadiah; lbl.classList.remove('hidden'); }
        else lbl.classList.add('hidden');
    },

    _updateCounters() {
        document.getElementById('rat-count-total').textContent = this.pool.length || '-';
        document.getElementById('rat-count-remain').textContent = this.remaining.length || '-';
        document.getElementById('rat-count-win').textContent = this.winners.length;
    },

    _updateWinnersList() {
        const card = document.getElementById('rat-winners-card');
        const list = document.getElementById('rat-winners-list');
        const cnt = document.getElementById('rat-winners-count');
        if (!this.winners.length) { card.classList.add('hidden'); return; }
        card.classList.remove('hidden');
        cnt.textContent = this.winners.length + ' Pemenang';
        document.getElementById('rat-export-btn').style.display = 'flex';

        list.innerHTML = this.winners.map((w, i) => `
        <div class="flex items-center gap-4 px-5 py-3 hover:bg-amber-50/40 transition-colors winner-row">
            <div class="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0
                        ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-800' : i === 2 ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}">
                ${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1)}
            </div>
            <div class="flex-1">
                <p class="font-bold text-gray-800">${w.nama}</p>
                <p class="text-xs text-gray-500 font-mono">${w.no}</p>
            </div>
            ${w.hadiah ? `<div class="bg-yellow-100 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">🎁 ${w.hadiah}</div>` : ''}
            <div class="text-xs text-gray-400">${w.waktu}</div>
        </div>`).join('');
    },

    async spin() {
        if (this.spinning) return;
        if (!this.remaining.length) {
            App.toast('Semua peserta sudah menang! Reset sesi untuk mengulang.', 'warning');
            return;
        }

        this.spinning = true;
        const btn = document.getElementById('rat-spin-btn');
        btn.disabled = true;
        document.getElementById('rat-display').classList.remove('winner-glow');

        // Pick winner
        const idx = Math.floor(Math.random() * this.remaining.length);
        const winner = this.remaining[idx];

        // Sound: spinning beeps
        this._playSpinSound();

        // Animation: rolling random numbers/names
        let spinCount = 0;
        const maxSpin = 35;
        const noEl = document.getElementById('rat-no');
        const namaEl = document.getElementById('rat-nama');
        const allNos = this.pool.map(p => p.no);

        const roll = () => {
            const fake = allNos[Math.floor(Math.random() * allNos.length)];
            const fakePeserta = this.pool[Math.floor(Math.random() * this.pool.length)];

            // Speed: fast at start, slow at end
            const progress = spinCount / maxSpin;
            const interval = progress < 0.5 ? 60 : progress < 0.75 ? 100 : progress < 0.9 ? 160 : 250;

            noEl.textContent = spinCount < maxSpin ? fake : winner.no;
            namaEl.textContent = spinCount < maxSpin ? fakePeserta.nama.toUpperCase() : winner.nama.toUpperCase();

            spinCount++;
            if (spinCount <= maxSpin) {
                this.spinInterval = setTimeout(() => requestAnimationFrame(roll), interval);
            } else {
                // WINNER!
                this._onWinner(winner, idx);
            }
        };
        requestAnimationFrame(roll);
    },

    _onWinner(winner, idx) {
        this.spinning = false;

        // Remove from remaining
        this.remaining.splice(idx, 1);

        // Save winner
        const hadiah = document.getElementById('rat-hadiah').value.trim();
        const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        this.winners.unshift({ ...winner, hadiah, waktu: now });

        // Visual effects
        document.getElementById('rat-display').classList.add('winner-glow');
        this._playWinSound();
        this._confetti();

        // Update UI
        this._updateCounters();
        this._updateWinnersList();

        // Re-enable button
        const btn = document.getElementById('rat-spin-btn');
        btn.disabled = !this.remaining.length;
        document.getElementById('rat-btn-text').innerHTML = this.remaining.length
            ? '<i class="ri-play-circle-fill text-2xl"></i> PUTAR LAGI!'
            : '<i class="ri-check-line text-2xl"></i> SELESAI';

        // Toast
        App.toast(`🎉 Pemenang: ${winner.nama} (${winner.no})`, 'success', 5000);
    },

    resetSesi() {
        if (this.spinInterval) clearTimeout(this.spinInterval);
        this.spinning = false;
        this.remaining = [...this.pool];
        this.winners = [];
        this._updateCounters();
        this._updateWinnersList();
        document.getElementById('rat-no').textContent = '- - - - -';
        document.getElementById('rat-nama').textContent = 'SIAP DIPUTAR';
        document.getElementById('rat-display').classList.remove('winner-glow');
        document.getElementById('rat-btn-text').innerHTML = '<i class="ri-play-circle-fill text-2xl"></i> PUTAR!';
        document.getElementById('rat-spin-btn').disabled = !this.pool.length;
        document.getElementById('rat-export-btn').style.display = 'none';
        App.toast('Sesi direset, semua peserta masuk kembali', 'info');
    },

    // ── Web Audio: spinning beeps ──
    _playSpinSound() {
        try {
            if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            let t = this.audioCtx.currentTime;
            for (let i = 0; i < 18; i++) {
                const o = this.audioCtx.createOscillator();
                const g = this.audioCtx.createGain();
                o.connect(g); g.connect(this.audioCtx.destination);
                o.frequency.value = 200 + (i * 15);
                g.gain.setValueAtTime(0.08, t + i * 0.06);
                g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.06 + 0.05);
                o.start(t + i * 0.06);
                o.stop(t + i * 0.06 + 0.05);
            }
        } catch (e) { }
    },

    // ── Web Audio: win fanfare ──
    _playWinSound() {
        try {
            if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const notes = [523, 659, 784, 1047]; // C E G C
            let t = this.audioCtx.currentTime;
            notes.forEach((freq, i) => {
                const o = this.audioCtx.createOscillator();
                const g = this.audioCtx.createGain();
                o.type = 'sine';
                o.connect(g); g.connect(this.audioCtx.destination);
                o.frequency.value = freq;
                g.gain.setValueAtTime(0, t + i * 0.15);
                g.gain.linearRampToValueAtTime(0.2, t + i * 0.15 + 0.05);
                g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.15 + 0.4);
                o.start(t + i * 0.15);
                o.stop(t + i * 0.15 + 0.45);
            });
        } catch (e) { }
    },

    // ── Confetti ──
    _confetti() {
        const canvas = document.getElementById('rat-confetti');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const pieces = Array.from({ length: 120 }, () => ({
            x: Math.random() * canvas.width,
            y: -20 - Math.random() * 100,
            w: 6 + Math.random() * 6,
            h: 10 + Math.random() * 8,
            r: Math.random() * Math.PI * 2,
            dr: (Math.random() - 0.5) * 0.3,
            dy: 3 + Math.random() * 5,
            dx: (Math.random() - 0.5) * 3,
            color: [`#f59e0b`, `#ef4444`, `#10b981`, `#3b82f6`, `#8b5cf6`, `#ec4899`, `#fbbf24`, `#34d399`][Math.floor(Math.random() * 8)],
            alpha: 1
        }));

        let frame;
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            let alive = false;
            pieces.forEach(p => {
                if (p.y > canvas.height + 20 || p.alpha < 0.01) return;
                alive = true;
                p.x += p.dx; p.y += p.dy; p.r += p.dr;
                if (p.y > canvas.height * 0.6) p.alpha -= 0.02;
                ctx.save();
                ctx.globalAlpha = Math.max(0, p.alpha);
                ctx.translate(p.x, p.y);
                ctx.rotate(p.r);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
                ctx.restore();
            });
            if (alive) frame = requestAnimationFrame(draw);
            else ctx.clearRect(0, 0, canvas.width, canvas.height);
        };
        if (frame) cancelAnimationFrame(frame);
        draw();
    },

    // ── Export PDF ──
    exportPDF() {
        if (!this.winners.length) return;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();

        const title = 'BERITA ACARA PENGUNDIAN HADIAH RAT';

        // Use App helpers for consistent branding
        App.drawPDFHeader(doc, title);
        App.drawPDFFooter(doc);

        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(100);
        doc.text(`Tanggal: ${App.todayDMY()}  |  Jumlah Pemenang: ${this.winners.length}  |  Total Peserta: ${this.pool.length}`, pw / 2, 42, { align: 'center' });

        // Tabel pemenang
        const body = this.winners.map((w, i) => [i + 1, w.no, w.nama, w.hadiah || '-', w.waktu]);

        doc.autoTable({
            startY: 48,
            head: [['No', 'Nomor', 'Nama Pemenang', 'Hadiah', 'Waktu']],
            body,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 9, fontStyle: 'bold', halign: 'center', cellPadding: 3.5 },
            bodyStyles: { fontSize: 9, cellPadding: 3, textColor: [51, 65, 85] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                1: { cellWidth: 40, fontStyle: 'bold' },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 40 },
                4: { halign: 'center', cellWidth: 28 }
            },
            alternateRowStyles: { fillColor: [255, 251, 235] },
            margin: { left: 14, right: 14, top: 48, bottom: 30 },
            didParseCell: (data) => {
                if (data.row.index < 3 && data.section === 'body') {
                    const colors = [[254, 240, 138], [229, 231, 235], [251, 191, 36]];
                    data.cell.styles.fillColor = colors[data.row.index] || [255, 240, 138];
                    data.cell.styles.fontStyle = 'bold';
                }
            },
            didDrawPage: () => {
                App.drawPDFHeader(doc, title);
                App.drawPDFFooter(doc);
            }
        });

        // Tanda tangan
        const finalY = Math.min(doc.lastAutoTable.finalY + 15, ph - 50);
        const thirds = (pw - 28) / 3;
        ['Panitia Pengundian', 'Ketua Koperasi', 'Saksi'].forEach((label, i) => {
            const x = 14 + i * thirds + thirds / 2;
            doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(71, 85, 105);
            doc.text(label, x, finalY, { align: 'center' });
            doc.setDrawColor(180, 180, 180);
            doc.line(x - 25, finalY + 18, x + 25, finalY + 18);
            doc.text('(................................)', x, finalY + 23, { align: 'center' });
        });

        window.open(doc.output('bloburl'), '_blank');
    }
};

window.PengundianRATPage = PengundianRATPage;
export default PengundianRATPage;
