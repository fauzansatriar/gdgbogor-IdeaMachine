# Product Requirements Document (PRD)

## Web App: Idea Machine

| Metadata | Detail |
| :--- | :--- |
| **Nama Aplikasi** | Idea Machine |
| **Versi Dokumen** | 3.1 (Flat Google Presentation UI, Dedicated Timer Page & Number-Only Queue) |
| **Target Pengguna** | Moderator Panggung & 5 Peserta Interaktif (Self-Spin) |
| **Platform** | Web Browser (Desktop / Layar Proyektor & Mobile Scanner) |
| **Build Environment** | Google AI Studio (`ai.studio/build`) — *Tech stack* fleksibel menyesuaikan hasil generate **Gemini 4 Neon** |

## 1. Ringkasan Produk (Product Overview)

**Idea Machine** adalah aplikasi web interaktif berbentuk mesin slot 3 kolom (*3-Reel Slot Machine*) untuk mengundi kombinasi ide aplikasi berbasis **masalah nyata (*real-life problem*) di Bogor**, **komponen ekosistem Google**, serta **target perangkat (*Mobile* atau *Desktop*)**.

Aplikasi ini mengadopsi gaya antarmuka **flat ala presentasi resmi Google** yang bersih dan modern, dilengkapi dengan:
* **Halaman Utama (Idea Machine & Papan 5 Peserta):** Tanpa perlu input nama peserta—peserta maju satu per satu ke layar utama untuk menekan tombol spin sendiri dan mengunci hasil ke nomor urut (`#1` sampai `#5`).
* **Halaman Khusus Stage Timer:** Halaman/tampilan terpisah layar penuh (*full-screen timer view*) yang dapat diakses melalui navigasi atas untuk fase *Build Sprint* dan *Lightning Pitch*.
* **QR Code & PDF Handover:** Membagikan konteks tantangan (target pengguna, masalah, solusi ekosistem Google, dan target perangkat) lewat pemindaian QR Code maupun ekspor PDF tanpa menyertakan *pre-written prompt*.

## 2. Struktur Halaman & Navigasi (Information Architecture)

Aplikasi memiliki **2 halaman utama** yang dapat diakses melalui bilah navigasi (*top navigation bar*) yang bersih:

1. **Halaman 1: `Idea Machine` (Halaman Utama Undian)**
   * Berisi mesin slot 3 kolom, tombol kontrol putaran, undian target perangkat (*Mobile* / *Desktop*), serta ringkasan 5 slot hasil undian (`Peserta #1` hingga `Peserta #5`).
2. **Halaman 2: `Stage Timer` (Halaman Khusus Hitung Mundur)**
   * Halaman terpisah dengan tampilan fokus (*distraction-free*) berlayar penuh untuk memandu waktu pengerjaan dan presentasi di panggung.

## 3. Fitur Utama & Spesifikasi Fungsional (Functional Requirements)

### 3.1. Mesin Slot 3 Kolom (Halaman 1)

* **Animasi Gulungan Bertahap (*Staggered Spin*):**
  * Saat tombol utama ditekan, ketiga kolom berputar secara vertikal dengan efek perlambatan halus (*ease-out*) dan berhenti secara berurutan (Kolom 1 → Kolom 2 → Kolom 3).
  * Setiap kartu dalam gulungan menampilkan **Ikon/Emoji**, **Judul Utama**, dan **Sub-label/Tag** singkat.
* **Undian Target Perangkat (`Mobile` vs `Desktop`):**
  * Setiap hasil putaran menyertakan indikator **Target Perangkat Utama** (**📱 Mobile** atau **💻 Desktop**) yang ikut teracak secara otomatis agar peserta merancang antarmuka sesuai platform tersebut.
* **Kontrol Per Kolom:**
  * **Lock / Unlock Toggle:** Mengunci salah satu kolom agar tidak ikut berubah saat tombol spin utama ditekan.
  * **Re-roll Kolom:** Memutar ulang hanya 1 kolom tertentu tanpa mengubah 2 kolom lainnya.
* **Pintasan Keyboard (*Keyboard Shortcuts*):**
  * Tombol **`SPACE`** untuk memicu putaran utama (*Spin All*) saat berada di halaman *Idea Machine*.
  * Tombol **`ESC`** untuk menutup jendela modal QR Code.

### 3.2. Struktur Data Konten (3-Reel Data Pools + Device Target)

1. **Kolom 1 — Target Pengguna & Real-Life Problem Bogor:**
   * *Commuter KRL Bogor–Jakarta:* Krisis Transit & Gangguan Perjalanan KRL (Pohon tumbang / antrean padat).
   * *Pejalan Kaki & Pengguna Transportasi:* Terjebak Hujan Badai Dadakan tanpa payung & lokasi berteduh.
   * *Penumpang Angkot & Pendatang:* Kebingungan memilih nomor trayek angkot & titik *ngetem* macet.
   * *Wisatawan Kuliner Akhir Pekan (Suryakencana/Pajajaran):* Antrean kuliner panjang & ranjau parkir liar.
   * *Supir Angkot / Pengendara Lokal:* Terjebak Sistem Satu Arah (SSA) & rekayasa buka-tutup jalur.
2. **Kolom 2 — Konteks Solusi & Gemini AI Superpower:**
   * *Gemini Multimodal Vision:* Analisis kamera/foto langsung (kondisi cuaca, keramaian antrean, foto menu, atau papan trayek).
   * *Gemini + Google Search Grounding:* Penarikan informasi lalu lintas, gangguan KRL, atau cuaca terkini secara *real-time*.
   * *Gemini Live API / Text-to-Speech (TTS):* Asisten suara *hands-free* saat berkendara atau berjalan di tengah hujan.
   * *Gemini Structured Output & Function Calling:* Kalkulator rute cerdas, estimator waktu/biaya, dan rekomendasi alternatif.
3. **Kolom 3 — Google Ecosystem Stack:**
   * *Google Maps Platform (Places & Routes API):* Pemetaan lokasi teduhan, kantong parkir resmi, titik kumpul *carpooling*, dan rute alternatif.
   * *Firebase Realtime Database / Firestore:* Papan pembaruan kondisi lapangan secara *real-time* berbasis laporan komunitas.
   * *Google Cloud Run:* Publikasi instan menjadi *public web app* yang dapat diakses lewat tautan/QR Code.
4. **Atribut Target Perangkat (*Platform Target*):**
   * **📱 Mobile (`Mobile-First`):** Dioptimalkan untuk layar vertikal smartphone, interaksi satu tangan, dan penggunaan di lapangan.
   * **💻 Desktop (`Desktop Web`):** Dioptimalkan untuk layar lebar laptop/monitor dan tampilan dashboard interaktif.

### 3.3. Sistem Giliran & Papan 5 Peserta (Tanpa Input Nama)

* **Tanpa Input / Kolom Nama Peserta:**
  * Untuk mempercepat alur di panggung, aplikasi **tidak menyediakan input teks nama peserta**. Setiap peserta diidentifikasi murni berdasarkan nomor urut (`Peserta #1`, `Peserta #2`, `Peserta #3`, `Peserta #4`, `Peserta #5`).
* **Indikator Giliran Aktif:**
  * Header pada mesin slot menampilkan nomor giliran aktif secara jelas (contoh: `GILIRAN SPIN: Peserta #1`).
* **Papan 5 Kartu Hasil (`#1` s/d `#5`):**
  * Menampilkan 5 kartu ringkasan di bagian bawah layar.
  * Klik kartu nomor tertentu jika ingin memindahkan giliran aktif secara manual.
* **Kunci Topik & Auto-Advance:**
  * Tombol **"Kunci ke Peserta #X"** menyimpan kombinasi 3 kolom + target perangkat ke slot nomor tersebut, menampilkan modal QR Code peserta, dan otomatis memindahkan giliran aktif ke slot nomor berikutnya yang masih kosong (`#1` → `#2` → `#3` → `#4` → `#5`).
* **Reset Papan:**
  * Satu tombol **"Reset Semua"** untuk mengosongkan kelima kartu hasil dan mengembalikan giliran ke `Peserta #1`.

### 3.4. QR Code Handover (Murni Konteks & Target Perangkat)

* **Generasi QR Code Otomatis (*Client-Side*):**
  * Muncul otomatis saat hasil dikunci ke peserta atau ketika tombol **QR Code** pada salah satu kartu peserta (`#1`–`#5`) diklik.
* **Isi Payload QR Code (Tanpa Prompt):**
  * QR Code **tidak berisi teks prompt siap pakai**, melainkan berisi **Kartu Konteks Tantangan** yang mencakup:
    1. **Nomor Peserta:** `Peserta #1` – `Peserta #5`.
    2. **Target Pengguna & Masalah Nyata:** Siapa penggunanya dan masalah apa di Bogor yang diselesaikan.
    3. **Konteks Solusi & Ekosistem Google:** Tujuan aplikasi beserta komponen AI & Google stack yang dipakai.
    4. **Target Perangkat:** **📱 Mobile** atau **💻 Desktop**.
* **Tampilan Setelah Di-Scan (`Mission Brief View`):**
  * Saat di-scan lewat HP/laptop, peserta melihat halaman ringkasan *flat* yang bersih berisi 4 poin di atas beserta tombol pintasan membuka **`ai.studio/build`**.

### 3.5. Ekspor PDF Hasil Spin (Mission Card & Rekap)

* **Individual Mission Card PDF (Per Peserta):**
  * Tombol **"Download PDF"** pada setiap kartu peserta (`#1`–`#5`) untuk mengunduh kartu misi individual (contoh: `Mission_Peserta_1.pdf`) berisi rincian target pengguna, konteks solusi, ekosistem Google, target perangkat (`Mobile`/`Desktop`), serta gambar **QR Code tertanam**.
* **All-Challengers Summary PDF (Rekap 5 Peserta):**
  * Tombol **"Download Semua Hasil (PDF)"** untuk mengunduh 1 dokumen PDF ringkasan berisi hasil undian seluruh 5 peserta (`#1`–`#5`).

### 3.6. Halaman Khusus Stage Timer (Halaman 2 — Separate Page)

* **Tampilan Layar Penuh (*Dedicated Full-Page View*):**
  * Dapat dibuka melalui tab/tombol navigasi **"Stage Timer"** di bagian atas aplikasi (berpindah dari halaman utama ke halaman timer penuh).
* **2 Mode Preset Cepat:**
  * **🛠️ Build Sprint (`07:00`):** Hitung mundur 7 menit untuk fase pembuatan aplikasi.
  * **🎤 Lightning Pitch (`01:00`):** Hitung mundur 1 menit untuk fase presentasi peserta.
* **Tampilan & Kontrol Timer:**
  * Angka hitung mundur berukuran sangat besar di tengah layar agar terbaca jelas dari seluruh ruangan.
  * Tombol kontrol **Mulai / Jeda** dan **Reset**, perubahan warna aksen menjadi merah (`#EA4335`) saat waktu tersisa $\le 15$ detik, serta efek bunyi peringatan saat waktu habis (`00:00`).

### 3.7. Efek Suara Sintetis (Web Audio API)

* Menggunakan **Web Audio API** bawaan browser (tanpa ketergantungan file audio eksternal) untuk:
  * Efek *tick* mekanis saat item berputar.
  * Nada lembut saat masing-masing kolom berhenti dan *fanfare* ringan saat ketiga kolom selesai.
  * Bunyi peringatan pada 5 detik terakhir di halaman *Stage Timer*.
* Dilengkapi tombol **SFX ON / MUTED** di header navigasi.

## 4. Spesifikasi Desain UI/UX (Flat Google Presentation Style)

* **Gaya Visual *Flat* Ala Presentasi Google (Non-Brutalist):**
  * Mengadopsi estetika bersih khas Google Material & slide presentasi Google I/O / DevFest—**tanpa garis tepi hitam tebal dan tanpa bayangan kotak padat (*no hard offset shadows*)**.
  * **Latar Belakang & Permukaan (*Surfaces*):** Kanvas utama putih bersih (`#FFFFFF`) dengan kartu-kartu kontainer menggunakan warna permukaan abu-abu lembut (`#F8F9FA` atau `#F1F3F4`), sudut membulat modern (`rounded-2xl` / `20px–24px`), garis tepi tipis halus (`1px solid #E2E8F0`), atau elevasi bayangan lembut (*soft diffused elevation shadow*).
  * **Palet Warna Google & Gradien Pill:**
    * Warna teks utama abu-abu gelap modern (`#202124`) dan teks sekunder (`#5F6368`).
    * Header tiap kolom menggunakan *pill badge* gradien khas Google: Biru (`#4285F4`), Hijau-Cyan (`#34A853` → `#06B6D4`), dan Coral-Merah (`#EA4335` → `#FB7185`), serta garis spektrum 4 warna Google tipis di bagian bawah layar.
    * Elemen dekoratif sudut berupa ilustrasi maskot pelangi *flat* di bagian atas kanan.
* **Tipografi:**
  * Menggunakan **Google Sans** untuk *headings*, angka timer, tombol, dan elemen UI utama, serta **Google Sans Flex** untuk label dinamis di dalam kartu slot, *badge* perangkat, dan ringkasan hasil.
* **Notifikasi Non-Blocking:**
  * Menggunakan *Snackbar / Toast* bergaya *flat* Google di bagian bawah layar untuk umpan balik aksi (tanpa pop-up `alert()` bawaan browser).

## 5. Edge Cases & Validasi Sistem

* **Anti-Double Spin:** Tombol spin dinonaktifkan sementara selama animasi gulungan masih berjalan agar state tidak bertabrakan.
* **Validasi Semua Kolom Terkunci:** Jika tombol spin ditekan saat ketiga kolom dalam status *Locked*, aplikasi menampilkan *snackbar* peringatan untuk membuka minimal satu kunci.
* **Kontras QR Code:** QR Code dirender dengan warna hitam pekat (`#000000`) di atas latar putih murni (`#FFFFFF`) dengan margin putih (*quiet zone*) yang cukup agar selalu mudah dipindai dari layar proyektor.
* **Persistensi Lokal (`localStorage`):** Hasil undian yang sudah dikunci ke nomor peserta (`#1`–`#5`) tetap tersimpan jika halaman tidak sengaja ter-refresh, dan hanya terhapus saat tombol **Reset Semua** ditekan.