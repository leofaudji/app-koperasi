// FAQ Page - Dokumentasi Tata Cara Penggunaan
const FAQPage = {
    render(container) {
        App.setTitle('Pusat Bantuan', 'Tata cara penggunaan aplikasi utama dan portal anggota');

        container.innerHTML = `
        <div class="max-w-5xl mx-auto animate-fadeIn">
            <!-- Header Section -->
            <div class="bg-gradient-to-r from-primary-600 to-indigo-700 rounded-[2rem] p-10 text-white mb-8 shadow-xl shadow-primary-900/10 relative overflow-hidden">
                <i class="ri-customer-service-2-line absolute -bottom-10 -right-5 text-[15rem] opacity-10"></i>
                <div class="relative z-10">
                    <h2 class="text-3xl font-black mb-3">Ada yang bisa kami bantu?</h2>
                    <p class="text-primary-100 max-w-xl">Pelajari cara mengelola operasional koperasi dan panduan bagi anggota untuk memaksimalkan fitur portal mandiri.</p>
                    
                    <div class="mt-8 relative max-w-md">
                        <i class="ri-search-line absolute left-4 top-1/2 -translate-y-1/2 text-primary-400"></i>
                        <input type="text" id="faq-search" onkeyup="FAQPage.filter()" 
                            class="w-full pl-12 pr-4 py-3.5 bg-white/10 border border-white/20 rounded-2xl text-white placeholder:text-primary-300 focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-md" 
                            placeholder="Cari panduan (misal: pinjaman, setoran)...">
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <!-- Sidebar Navigation -->
                <div class="lg:col-span-1 space-y-2">
                    <button onclick="FAQPage.scrollTo('section-admin')" class="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white border border-slate-100 text-slate-600 font-bold hover:bg-primary-50 hover:text-primary-600 transition-all shadow-sm group">
                        <i class="ri-admin-line text-lg group-hover:scale-110 transition-transform"></i> Aplikasi Utama
                    </button>
                    <button onclick="FAQPage.scrollTo('section-portal')" class="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white border border-slate-100 text-slate-600 font-bold hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-sm group">
                        <i class="ri-smartphone-line text-lg group-hover:scale-110 transition-transform"></i> Portal Anggota
                    </button>
                    <button onclick="FAQPage.scrollTo('section-savings')" class="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white border border-slate-100 text-slate-600 font-bold hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm group">
                        <i class="ri-wallet-3-line text-lg group-hover:scale-110 transition-transform"></i> Simpanan
                    </button>
                    <button onclick="FAQPage.scrollTo('section-calc')" class="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white border border-slate-100 text-slate-600 font-bold hover:bg-amber-50 hover:text-amber-600 transition-all shadow-sm group">
                        <i class="ri-calculator-line text-lg group-hover:scale-110 transition-transform"></i> Perhitungan
                    </button>
                    <button onclick="FAQPage.scrollTo('section-security')" class="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-white border border-slate-100 text-slate-600 font-bold hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm group">
                        <i class="ri-shield-keyhole-line text-lg group-hover:scale-110 transition-transform"></i> Keamanan
                    </button>
                </div>

                <!-- FAQ Content -->
                <div class="lg:col-span-3 space-y-12">
                    
                    <!-- Section: Aplikasi Utama -->
                    <section id="section-admin">
                        <div class="flex items-center gap-3 mb-6">
                            <div class="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center shadow-sm">
                                <i class="ri-computer-line text-xl"></i>
                            </div>
                            <h3 class="text-xl font-black text-slate-800">Panduan Aplikasi Utama (Admin/Petugas)</h3>
                        </div>

                        <div class="space-y-4">
                            ${this.item('Bagaimana cara mendaftarkan anggota baru?', `
                                Buka menu <b>Master Data > Data Anggota</b>, klik tombol <b>Tambah Anggota</b>. Isi data diri lengkap termasuk NIK dan nomor telepon aktif. Setelah disimpan, sistem akan otomatis membuatkan akun portal untuk anggota tersebut dengan username nomor anggota dan password default (tanggal lahir).
                                <div class="mt-3">
                                    <a href="#/anggota" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg text-xs font-bold hover:bg-primary-100 transition-colors">
                                        <i class="ri-user-add-line"></i> Buka Menu Anggota
                                    </a>
                                </div>
                            `)}
                            ${this.item('Bagaimana proses pencairan pinjaman?', `
                                1. Masukkan pengajuan di menu <b>Pinjaman</b>.<br>
                                2. Admin melakukan analisa di detail pinjaman melalui fitur <b>Credit Score</b>.<br>
                                3. Klik <b>Setujui</b>, masukkan rincian biaya pencairan (provisi, administrasi, asuransi, dll).<br>
                                4. Sistem akan otomatis menjurnal kas keluar dan membuat jadwal angsuran secara otomatis.
                                <div class="mt-3">
                                    <a href="#/pinjaman" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors">
                                        <i class="ri-hand-coin-line"></i> Kelola Pinjaman
                                    </a>
                                </div>
                            `)}
                            ${this.item('Apa itu fitur Reversal?', 'Fitur <b>Reversal</b> digunakan untuk membatalkan transaksi yang salah input (Simpanan/Angsuran/Jurnal) tanpa menghapus data asli demi menjaga validitas audit. Tombol reversal tersedia di detail transaksi atau pada menu <b>Jurnal Umum</b>.')}
                            ${this.item('Cara melakukan tutup buku akhir tahun?', `
                                Buka menu <b>Sistem > RAT & Akhir Tahun > Proses Akhir Tahun</b>. Pastikan semua transaksi tahun berjalan sudah selesai divalidasi. Klik proses untuk menolkan akun Pendapatan & Beban, dan memindahkan selisihnya ke Akun Modal (SHU Tahun Berjalan).
                                <div class="mt-3 flex gap-2">
                                    <a href="#/akhir-tahun" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors">
                                        <i class="ri-calendar-check-line"></i> Tutup Buku
                                    </a>
                                    <a href="#/laba-rugi" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-colors">
                                        <i class="ri-file-list-3-line"></i> Cek Laba Rugi
                                    </a>
                                </div>
                            `)}
                        </div>
                    </section>

                    <!-- Section: Portal Anggota -->
                    <section id="section-portal">
                        <div class="flex items-center gap-3 mb-6">
                            <div class="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
                                <i class="ri-smartphone-line text-xl"></i>
                            </div>
                            <h3 class="text-xl font-black text-slate-800">Panduan Portal Anggota (PWA)</h3>
                        </div>

                        <div class="space-y-4">
                            ${this.item('Bagaimana cara instal portal di HP anggota?', 'Aplikasi portal berbasis <b>PWA (Progressive Web App)</b>. Anggota cukup buka link portal di browser Chrome (Android) atau Safari (iOS), lalu pilih menu browser <b>"Add to Home Screen"</b> atau <b>"Tambahkan ke Layar Utama"</b>. Aplikasi akan terpasang tanpa melalui Playstore/Appstore.')}
                            ${this.item('Bagaimana jika anggota lupa password?', `
                                Untuk saat ini, anggota dapat menghubungi petugas koperasi. Petugas dapat meriset password melalui menu <b>Pengaturan > Manajemen User</b> dengan mencari nama anggota yang bersangkutan.
                                <div class="mt-3">
                                    <a href="#/users" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors">
                                        <i class="ri-user-settings-line"></i> Manajemen User
                                    </a>
                                </div>
                            `)}
                            ${this.item('Cara mengajukan pinjaman via portal?', 'Anggota masuk ke menu <b>Pinjaman</b>, klik tombol <b>Ajukan Pinjaman</b>. Anggota dapat melakukan simulasi terlebih dahulu sebelum mengirim pengajuan. Status pengajuan dapat dipantau secara real-time di halaman yang sama.')}
                            ${this.item('Bagaimana cara mengikuti voting RAT?', 'Saat sesi RAT aktif, akan muncul notifikasi di Dashboard portal. Anggota masuk ke menu <b>RAT</b>, melakukan absensi via QR/Lokasi, lalu dapat memberikan suara pada topik-topik voting yang disediakan pengurus.')}
                        </div>
                    </section>

                    <!-- Section: Simpanan -->
                    <section id="section-savings">
                        <div class="flex items-center gap-3 mb-6">
                            <div class="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
                                <i class="ri-wallet-3-line text-xl"></i>
                            </div>
                            <h3 class="text-xl font-black text-slate-800">Manajemen Simpanan</h3>
                        </div>

                        <div class="space-y-4">
                            ${this.item('Apa perbedaan jenis simpanan Pokok, Wajib, dan Sukarela?', `
                                1. <b>Simpanan Pokok</b>: Dibayarkan sekali saat mendaftar, tidak dapat ditarik selama menjadi anggota.<br>
                                2. <b>Simpanan Wajib</b>: Dibayarkan rutin setiap bulan, tidak dapat ditarik selama menjadi anggota.<br>
                                3. <b>Simpanan Sukarela</b>: Setoran bebas yang dapat ditarik kapan saja melalui kasir atau transfer.
                                <div class="mt-3">
                                    <a href="#/jenis-simpanan" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors">
                                        <i class="ri-settings-line"></i> Konfigurasi Jenis Simpanan
                                    </a>
                                </div>
                            `)}
                            ${this.item('Bagaimana cara melakukan penarikan simpanan?', 'Buka menu <b>Simpanan > Transaksi Simpanan</b>. Masukkan nomor rekening atau cari nama anggota. Pilih Kode Transaksi yang memiliki atribut <b>Kredit (K)</b> (misal: Penarikan Sukarela). Saldo anggota akan otomatis berkurang dan jurnal kas keluar akan terbentuk.')}
                        </div>
                    </section>

                    <!-- Section: Perhitungan & Rumus -->
                    <section id="section-calc">
                        <div class="flex items-center gap-3 mb-6">
                            <div class="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-sm">
                                <i class="ri-calculator-line text-xl"></i>
                            </div>
                            <h3 class="text-xl font-black text-slate-800">Rumus & Logika Perhitungan</h3>
                        </div>

                        <div class="space-y-4">
                            ${this.item('Bagaimana rumus perhitungan bunga pinjaman?', `
                                Aplikasi ini menggunakan metode <b>Bunga Flat</b> (Tetap). Bunga dihitung dari plafon pinjaman awal dan dibagi rata setiap bulannya selama masa tenor.
                                <div class="mt-3 p-4 bg-slate-50 rounded-xl font-mono text-xs border border-slate-100 leading-loose">
                                    <b>Total Bunga</b> = Plafon × (Bunga % per Bulan) × Tenor<br>
                                    <b>Bunga per Bulan</b> = Total Bunga / Tenor
                                </div>
                                <div class="mt-3">
                                    <a href="#/jenis-pinjaman" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-100 transition-colors">
                                        <i class="ri-settings-3-line"></i> Atur Suku Bunga
                                    </a>
                                </div>
                            `)}
                            ${this.item('Bagaimana cara menghitung angsuran bulanan?', `
                                Angsuran bulanan adalah penjumlahan antara angsuran pokok dan angsuran bunga.
                                <div class="mt-3 p-4 bg-slate-50 rounded-xl font-mono text-xs border border-slate-100 leading-loose">
                                    <b>Pokok per Bulan</b> = Plafon / Tenor<br>
                                    <b>Total Cicilan</b> = Pokok per Bulan + Bunga per Bulan
                                </div>
                            `)}
                            ${this.item('Bagaimana logika pembagian SHU?', `
                                Sisa Hasil Usaha (SHU) dibagikan berdasarkan kontribusi anggota yang diatur pada menu RAT.
                                <div class="mt-3 p-4 bg-slate-50 rounded-xl font-mono text-xs border border-slate-100 leading-loose">
                                    1. <b>Jasa Modal</b>: Dihitung dari proporsi simpanan anggota terhadap total modal.<br>
                                    2. <b>Jasa Anggota</b>: Dihitung dari proporsi partisipasi transaksi (bunga pinjaman) anggota.
                                </div>
                            `)}
                            ${this.item('Apa itu status Kolektibilitas (NPL)?', `
                                Tingkat kelancaran pembayaran pinjaman yang dibagi menjadi 5 tingkatan berdasarkan hari keterlambatan:
                                <div class="mt-3 grid grid-cols-1 gap-1 text-[11px]">
                                    <div class="flex justify-between p-2 bg-emerald-50 text-emerald-700 rounded-lg"><span><b>Kol-1 (Lancar)</b>: 0 Hari</span><i class="ri-checkbox-circle-line"></i></div>
                                    <div class="flex justify-between p-2 bg-amber-50 text-amber-700 rounded-lg"><span><b>Kol-2 (DPK)</b>: 1 - 90 Hari</span><i class="ri-time-line"></i></div>
                                    <div class="flex justify-between p-2 bg-rose-50 text-rose-700 rounded-lg"><span><b>Kol-3, 4, 5 (NPL/Macet)</b>: > 90 Hari</span><i class="ri-error-warning-line"></i></div>
                                </div>
                            `)}
                        </div>
                    </section>

                    <!-- Section: Keamanan -->
                    <section id="section-security">
                        <div class="flex items-center gap-3 mb-6">
                            <div class="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-sm">
                                <i class="ri-shield-star-line text-xl"></i>
                            </div>
                            <h3 class="text-xl font-black text-slate-800">Keamanan & Backup</h3>
                        </div>

                        <div class="space-y-4">
                            ${this.item('Apakah data koperasi aman?', 'Ya, sistem dilengkapi dengan <b>Daily Auto-Backup</b> dan log aktivitas. Setiap perubahan data keuangan mencatat siapa yang melakukan, kapan, dan dari perangkat mana.')}
                            ${this.item('Bagaimana cara backup data manual?', `
                                Admin dapat melakukan backup kapan saja melalui menu <b>Pengaturan > Aplikasi > Tab Backup</b>. File backup akan berbentuk .sql yang sangat disarankan disimpan di luar server (Cloud Drive/Flashdisk) secara rutin.
                                <div class="mt-3">
                                    <a href="#/pengaturan" class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors">
                                        <i class="ri-database-2-line"></i> Menu Backup
                                    </a>
                                </div>
                            `)}
                        </div>
                    </section>

                </div>
            </div>

            <div class="mt-16 py-10 border-t border-slate-100 text-center">
                <p class="text-slate-400 text-sm">Butuh bantuan teknis lebih lanjut?</p>
                <a href="https://wa.me/628123456789" target="_blank" class="mt-4 inline-flex items-center gap-2 px-8 py-3 bg-emerald-500 text-white rounded-2xl font-bold hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20">
                    <i class="ri-whatsapp-line text-lg"></i> Hubungi Technical Support
                </a>
            </div>
        </div>
        `;
    },

    item(question, answer) {
        const id = 'faq-' + Math.random().toString(36).substr(2, 9);
        return `
        <div class="faq-item group bg-white border border-slate-100 rounded-[1.5rem] overflow-hidden shadow-sm hover:shadow-md hover:border-primary-100 transition-all duration-300">
            <button onclick="FAQPage.toggle('${id}')" class="w-full px-6 py-5 text-left flex items-center justify-between gap-4">
                <span class="font-bold text-slate-700 group-hover:text-primary-600 transition-colors">${question}</span>
                <i id="icon-${id}" class="ri-arrow-down-s-line text-xl text-slate-400 group-hover:text-primary-500 transition-all duration-300"></i>
            </button>
            <div id="body-${id}" class="max-h-0 overflow-hidden transition-all duration-500 ease-in-out">
                <div class="px-6 pb-6 text-sm text-slate-500 leading-relaxed border-t border-slate-50 pt-4">
                    ${answer}
                </div>
            </div>
        </div>
        `;
    },

    toggle(id) {
        const body = document.getElementById('body-' + id);
        const icon = document.getElementById('icon-' + id);
        const allBodies = document.querySelectorAll('[id^="body-faq-"]');
        const allIcons = document.querySelectorAll('[id^="icon-faq-"]');

        // Close others
        allBodies.forEach(b => { if(b.id !== 'body-'+id) b.style.maxHeight = null; });
        allIcons.forEach(i => { if(i.id !== 'icon-'+id) i.style.transform = 'rotate(0deg)'; });

        if (body.style.maxHeight) {
            body.style.maxHeight = null;
            icon.style.transform = 'rotate(0deg)';
        } else {
            body.style.maxHeight = body.scrollHeight + "px";
            icon.style.transform = 'rotate(180deg)';
        }
    },

    scrollTo(id) {
        const el = document.getElementById(id);
        if (el) {
            const offset = 100;
            const bodyRect = document.body.getBoundingClientRect().top;
            const elementRect = el.getBoundingClientRect().top;
            const elementPosition = elementRect - bodyRect;
            const offsetPosition = elementPosition - offset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    },

    filter() {
        const query = document.getElementById('faq-search').value.toLowerCase();
        const items = document.querySelectorAll('.faq-item');
        
        items.forEach(item => {
            const text = item.innerText.toLowerCase();
            if (text.includes(query)) {
                item.style.display = 'block';
                item.classList.add('animate-fadeIn');
            } else {
                item.style.display = 'none';
            }
        });

        // Show section if it has visible items
        document.querySelectorAll('section').forEach(sec => {
            const visibleItems = sec.querySelectorAll('.faq-item[style="display: block;"]').length;
            sec.style.display = (visibleItems > 0 || query === '') ? 'block' : 'none';
        });
    }
};

window.FAQPage = FAQPage;
export default FAQPage;