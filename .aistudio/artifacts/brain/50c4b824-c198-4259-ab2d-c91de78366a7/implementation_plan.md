# FinBag - Aplikasi PWA Pencatat Keuangan Personal Multi-User, Multi-Bahasa & Multi-Mata Uang

Aplikasi Progressive Web App (PWA) pencatat keuangan personal modern bernama **FinBag**, dibangun dengan filosofi desain **Mobile-First** yang ergonomis dan elegan berestetika **Eksekutif Navy**. Mendukung akses **Multi-User & Multi-Device**, **Multi-Bahasa (Indonesian & English)**, serta **Multi-Currency** dengan pembaruan kurs valuta asing secara **Real-Time**.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> Seluruh parameter spesifikasi aplikasi dan rekomendasi fitur strategis telah dirangkum:

- **Nama Resmi Aplikasi**: **FinBag** (*Finance in your Bag*).
- **Arsitektur PWA Mobile-First**:
  - Dioptimalkan khusus untuk pengoperasian satu tangan pada layar sentuh smartphone (*natural thumb-zone* 375px–430px) dengan *Fixed Bottom Navigation Bar*, *Floating Quick Add Action Button*, dan *Bottom Sheet Drawer*.
  - Layout responsif adaptif: bertransformasi mulus ke tampilan dasbor eksekutif dengan sidebar di layar tablet/desktop tanpa distorsi.
  - PWA installable: *Service Worker*, Web App Manifest (`standalone`), ikon adaptif 192px/512px, serta komponen tombol instalasi langsung (*In-App Install Prompt* untuk Android, Windows, Mac, dan panduan iOS).
- **Multi-User & Multi-Device Sync**:
  - Integrasi Firebase Authentication (Google Sign-In) untuk akun unik tiap pengguna.
  - Sinkronisasi Cloud Firestore instan lintas perangkat (`/users/{userId}/...`) dengan pembaruan real-time saat transaksi dimasukkan dari smartphone maupun laptop.
  - *Guest & Offline Mode*: pengguna dapat langsung memakai aplikasi seketika tanpa harus login terlebih dahulu, dengan opsi sinkronisasi ke cloud kapan saja.
- **Multi-Bahasa (Bilingual ID & EN)**:
  - Antarmuka dwibahasa penuh: Bahasa Indonesia (ID) dan English (EN) dengan tombol pengubah instan di bar atas dan menu pengaturan.
  - Seluruh label, kategori, format tanggal, dan pesan status otomatis menyesuaikan bahasa terpilih.
- **Sistem Multi-Mata Uang & Kurs Real-Time**:
  - Pilihan Base Currency: IDR (Rp), USD ($), EUR (€), SGD (S$), MYR (RM), JPY (¥), GBP (£), dan AUD (A$).
  - *Live Exchange Rate Engine*: Pengambilan kurs valuta asing terkini secara langsung via open exchange API publik dengan sistem caching offline.
  - *Multi-Currency Wallets*: Setiap dompet dapat memiliki mata uang aslinya sendiri, dengan konversi agregat otomatis ke mata uang utama pada metrik Net Worth.
  - *Currency Converter*: Alat kalkulator konversi kurs instan di dalam aplikasi.
- **Fitur Finansial Inti**:
  - Multi-dompet: Tunai, Rekening Bank, dan E-Wallet dengan fitur transfer antar-dompet.
  - Anggaran Kategori Dinamis: Pemantauan pagu bulanan dengan visual progress bar dan status overbudget.
  - Transaksi Berulang & Filter: Pengelolaan tagihan rutin berkala dan ekspor laporan CSV/JSON.
  - Estetika Eksekutif Navy: Nuansa biru tua perbankan profesional dengan dukungan penuh mode Gelap (Dark) dan Terang (Light).

---

### 1. Overview & Core Concept

- **Apa yang Dilakukan**: **FinBag** menyediakan asisten keuangan digital terpadu dalam genggaman yang dapat diinstal langsung ke homescreen, mendukung pencatatan pengeluaran harian, transfer saldo antar-rekening, pelacakan anggaran bulanan, dan konversi kurs mata uang global secara real-time.
- **Target Pengguna**: Individu aktif, profesional, freelancer penerima mata uang ganda, serta keluarga yang menginginkan aplikasi pencatat keuangan yang cepat, aman, responsif, dan dapat diakses dari berbagai gadget sekaligus.
- **Nilai Utama**: Fleksibilitas tinggi (multi-dompet, multi-mata uang, multi-bahasa), tampilan visual premium, dan privasi penuh dengan isolasi data tingkat cloud.

---

### 2. User Experience & Visual Design (Mobile-First)

#### Navigasi & Ergonomi Mobile-First
- **Top App Bar Eksekutif**:
  - Logo wordmark **FinBag**, indikator status koneksi (Online/Offline), tombol beralih bahasa (`ID` / `EN`), pemilih mata uang utama (`IDR`, `USD`, dll.), dan profil akun pengguna.
- **Bilah Navigasi Bawah (Fixed Bottom Tab Bar)**:
  - Ditempatkan di zona jangkauan jempol paling nyaman:
    1. **Ringkasan (Home)**: Kartu Net Worth multi-kurs, kartu dompet geser, diagram donat kategori, dan ringkasan pengeluaran harian.
    2. **Dompet (Wallets)**: Daftar dompet aktif berikon bendera mata uang, rincian mutasi saldo, dan formulir transfer antar-dompet.
    3. **[+] Tombol Tambah Cepat (Center Action Button)**: Membuka Bottom Sheet transisi halus untuk mencatat transaksi dengan keypad kalkulator instan.
    4. **Kurs Live (FX Rates)**: Tabel kurs valuta asing real-time, grafik tren valas, dan kalkulator konversi mata uang terintegrasi.
    5. **Fitur Lebih (More Tools)**: Target Tabungan (Goals), Evaluasi Rasio 50/30/20, Anggaran Kategori, Filter Transaksi, Ekspor CSV/JSON, dan tombol instalasi PWA.

#### Tampilan Eksekutif Navy
- **Palet Warna**:
  - Canvas: Deep Navy Blue (`#0B132B` / `#0A192F`) pada mode Gelap, Crisp Slate White (`#F8FAFC`) pada mode Terang.
  - Surface Card: Rich Navy Slate (`#112240` / `#1E293B`) dengan hairline border presisi.
  - Aksen Primer: Royal Sapphire (`#2563EB` / `#3B82F6`) untuk aksi utama dan tab aktif.
  - Indikator Finansial: Emerald Green (`#10B981`) untuk pemasukan/penguatan kurs; Crimson Red (`#EF4444`) untuk pengeluaran/overbudget; Amber Gold (`#F59E0B`) untuk peringatan mendekati pagu belanja.
- **Tipografi**:
  - Teks & Judul: *Plus Jakarta Sans* untuk keterbacaan tajam pada layar sentuh.
  - Angka & Metrik: *Monospace Tabular Figures* (`tabular-nums`) untuk penjajaran angka nominal yang presisi.

---

### 3. Rekomendasi Fitur Strategis Bernilai Tinggi (Saran Pengembangan)

Sebagai pengembang profesional, berikut 4 fitur tambahan yang sangat direkomendasikan untuk menjadikan FinBag aplikasi finansial kelas atas yang sangat berguna dan dicintai pengguna:

1. **Target Tabungan & Celengan Impian (Financial Goals / Savings Pots)**:
   - Memungkinkan pengguna membuat target tabungan tertentu (misal: "Dana Darurat 6 Bulan", "Liburan ke Jepang", "Beli Gadget Baru").
   - Pengguna dapat menyisihkan dana dari dompet tertentu ke pos target tabungan dengan indikator visual persentase progres pencapaian dan estimasi sisa waktu.
2. **Analisis Kesehatan Finansial & Rasio Anggaran 50/30/20**:
   - Menghitung secara otomatis proporsi pengeluaran pengguna ke dalam 3 pilar:
     - **50% Kebutuhan Pokok (Needs)**: Makanan, sewa/rumah, listrik, air, transportasi rutin.
     - **30% Keinginan (Wants)**: Hiburan, belanja hobi, nongkrong/kuliner rekreasional.
     - **20% Tabungan & Investasi (Savings)**: Dana darurat, investasi, tabungan masa depan.
   - Memberikan skor kesehatan keuangan instan (*Financial Health Score*) untuk panduan alokasi dana yang sehat.
3. **Kalkulator Bagi Tagihan Instan (Split Bill Calculator)**:
   - Sangat berguna untuk gaya hidup sosial (makan bersama teman/keluarga). Pengguna dapat memasukkan total tagihan, persentase pajak & service charge, jumlah orang, lalu membagi nominal secara adil.
   - Hasil bagian pengguna dapat langsung dimasukkan ke riwayat pengeluaran FinBag dengan 1 ketukan.
4. **Fitur Keamanan Kunci Aplikasi (App PIN Lock)**:
   - Opsi mengaktifkan kode PIN 4 digit untuk membuka aplikasi saat dibuka di ponsel, memastikan kerahasiaan catatan keuangan tetap terlindungi saat ponsel dipinjam orang lain.

---

### 4. Technical Architecture & Data Strategy

#### Diagram Arsitektur FinBag Lengkap

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FinBag PWA Container                            │
│  ├── Service Worker & Manifest (Offline App Shell, PWA Install Hook)   │
│  ├── CurrencyRateService (Real-Time Live FX Rates + Local Fallback)    │
│  ├── I18nContext (Bilingual ID/EN Reactive Dictionary)                 │
│  └── SecurityLockContext (Optional 4-Digit Privacy PIN)                │
├────────────────────────────────────────────────────────────────────────┤
│                           App.tsx (Root)                               │
│  ├── AuthProvider (Firebase Auth: Google Sign-In & Offline Guest Mode) │
│  ├── CurrencyProvider (Base Currency Selection & Conversion Helpers)   │
│  ├── ThemeProvider (Dark / Light Mode - Executive Navy Palette)        │
│  └── FinanceSyncProvider (Firestore Real-time Subscriptions + Cache)   │
├────────────────────────────────────────────────────────────────────────┤
│                       Mobile-First Presentation                        │
│  ├── Top Bar (FinBag Brand · FX Ticker · Language Switch · Currency)   │
│  ├── Viewport Canvas:                                                  │
│  │    ├── Tab 'Ringkasan': Multi-Currency Net Worth, Carousel, Donut   │
│  │    ├── Tab 'Dompet': Wallets with Currency Flags, Balance, Transfer │
│  │    ├── Tab 'Kurs Live': Real-Time FX Table & Currency Converter     │
│  │    ├── Tab 'Anggaran': Pagu Belanja Kategori & Status Overbudget    │
│  │    └── Tab 'Alat & Lainnya': Target Tabungan, Rasio 50/30/20,       │
│  │                              Split Bill, Filter & Ekspor CSV/JSON   │
│  └── Fixed Bottom Bar (5 Destination Tabs + Floating [+] Action Button)│
└────────────────────────────────────────────────────────────────────────┘
                 │                                        ▲
                 │ (Offline / Online Bi-directional Sync) │
                 ▼                                        │
┌────────────────────────────────────────────────────────────────────────┐
│                   Cloud Backend & Persistence Layer                    │
│  ├── Firebase Auth: Google OAuth Popup Provider                        │
│  ├── Cloud Firestore Schema:                                           │
│  │    └── /users/{userId}/wallets/{walletId}                           │
│  │    └── /users/{userId}/transactions/{txnId}                         │
│  │    └── /users/{userId}/budgets/{budgetId}                           │
│  │    └── /users/{userId}/goals/{goalId} (Target Tabungan)             │
│  │    └── /users/{userId}/recurring/{recurringId}                      │
│  └── Security Rules: Strict user-isolation (owner-only read/write)     │
└────────────────────────────────────────────────────────────────────────┘
```

---

### 5. Langkah Eksekusi (Implementation Steps)

1. **Konfigurasi Firebase & PWA**:
   - Membuka wizard setup Firebase (`show_aistudio_ui` dengan `ui_type: "firebase_setup"`) dan memverifikasi persetujuan untuk Firestore & Auth.
   - Mengonfigurasi `vite-plugin-pwa`, `manifest.webmanifest`, service worker, dan hook instalasi `usePWAInstall`.
2. **Modul Kurs Valas & Multi-Bahasa**:
   - `src/services/currencyService.ts` untuk live exchange rate dan konversi mata uang.
   - `src/i18n/translations.ts` untuk kamus terstruktur Indonesia & Inggris.
3. **Logika Murni & Unit Testing**:
   - `src/utils/financeCalculations.ts` (kalkulasi mutasi saldo, konversi kurs, batas anggaran, rasio 50/30/20, dan progres tabungan).
   - Menjalankan tes otomatis: `npx --yes tsx --test src/utils/financeCalculations.test.ts`.
4. **Pengembangan Antarmuka FinBag Mobile-First**:
   - Komponen Top Header dengan brand FinBag, tombol bahasa, pemilih mata uang, dan status koneksi.
   - Fixed Bottom Nav ergonomis dengan tab Ringkasan, Dompet, Tambah Cepat, Kurs Live, dan Alat Lainnya.
   - Bottom Sheet Quick Add dengan kalkulator nominal dan pemilihan mata uang transaksi.
   - Modul Target Tabungan, Analisis Rasio 50/30/20, dan Kalkulator Split Bill.
   - Tema Eksekutif Navy dengan transisi Dark/Light mode mulus.
5. **Verifikasi Kualitas (Ultra Mode)**:
   - Kompilasi kode bersih (`compile_applet`).
   - Uji verifikasi visual browser pada layar mobile (390x844) dan desktop (1440x900) via `playwright-cli`.
