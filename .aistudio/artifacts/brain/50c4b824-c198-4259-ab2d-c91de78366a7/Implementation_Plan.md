# FinBag - Penyederhanaan Top Navbar pada Perangkat Mobile (Mobile Header Decluttering)

Rencana optimasi antarmuka untuk merapikan navbar atas (`TopBar.tsx`) pada layar HP/mobile agar tidak sesak, bersih, dan sesuai standar aplikasi finansial modern.

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **Masalah Saat Ini**:
> Pada layar mobile (< 640px), navbar atas dijejali oleh 5 elemen kontrol sekaligus di sebelah logo:
> 1. Pilihan Mata Uang (`<select>` IDR, USD, EUR, dsb.)
> 2. Tombol Ganti Bahasa (`ID / EN`)
> 3. Tombol Ganti Tema (Dark / Light)
> 4. Tombol Kunci Aplikasi (PIN Lock)
> 5. Tombol Profil Pengguna / Masuk Google
>
> Hal ini menyebabkan navbar terlihat sangat padat, sempit, berdesakan, dan rentan salah sentuh (*fat-finger error*).

#### Solusi yang Diusulkan:
- **Tampilan Mobile (`< sm` / layar ponsel)**:
  - **Kiri**: Logo FinBag & Nama Aplikasi (bersih dan proporsional).
  - **Kanan**: Hanya menyisakan **1 tombol ringkas & elegan**:
    - Tombol Avatar / Profil Pengguna (atau ikon Pengaturan Ringkas `SlidersHorizontal` / `User`).
    - Jika pengguna belum login: tombol ringkas "Masuk" / icon akun.
  - **Menu Sheet Mobile Terpadu (Mobile Quick Preferences Popover/Sheet)**:
    - Ketika tombol di kanan atas disentuh, terbuka menu popover/bottom sheet modern yang menampung:
      - **Profil & Akun**: Nama, email, dan tombol Masuk / Keluar.
      - **Pilihan Mata Uang Utama**: Grid tombol pilihan mata uang (IDR, USD, EUR, SGD, MYR, dll.) yang nyaman disentuh jari (touch-friendly).
      - **Ganti Bahasa**: Pilihan Indonesia (ID) & English (EN).
      - **Mode Tampilan**: Toggle Mode Gelap / Terang yang jelas.
      - **Keamanan Aplikasi**: Tombol "Kunci Aplikasi Sekarang" (jika PIN aktif).
      - **Pasang Aplikasi (PWA)**: Opsi pasang aplikasi ke home screen jika tersedia.
- **Tampilan Desktop (`sm:` dan `md:` / layar komputer)**:
  - Tetap mempertahankan seluruh kontrol inline seperti saat ini tanpa perubahan apa pun, sehingga navigasi 1-klik di desktop tetap cepat dan nyaman.

---

### 1. Overview & Core Concept
- **Tujuan**: Menghadirkan antarmuka mobile yang bersih (*minimalist & uncluttered*), berestetika tinggi ala aplikasi perbankan modern, tanpa mengurangi fungsi apa pun yang sudah ada.
- **Dampak**: 
  - Ruang pandang di mobile menjadi jauh lebih lapang.
  - Navigasi preferensi pengguna menjadi jauh lebih mudah dioperasikan dengan satu tangan.
  - Tampilan desktop tetap 100% konsisten dan fungsional.

---

### 2. User Experience & Visual Comparison

```
SEBELUM (MOBILE):
[ [F] FinBag ] [IDR v] [ID] [☀️] [🔒] [👤 Akun] -> Sangat sempit & berdesakan!

SESUDAH (MOBILE):
[ [F] FinBag ]                          [👤 Profil / ⚙️] -> Sangat bersih & lega!
                                               │
                                               ▼
                              ┌──────────────────────────────────┐
                              │ 👤 sm.bagja@gmail.com            │
                              ├──────────────────────────────────┤
                              │ 💵 Mata Uang Utama: [IDR] [USD]..│
                              │ 🌐 Bahasa: [Indonesia] [English] │
                              │ 🌙 Tema: [Terang / Gelap]        │
                              │ 🔒 Kunci Aplikasi                │
                              │ 🚪 Keluar Akun                   │
                              └──────────────────────────────────┘
```

---

### 3. Rencana Tahapan Eksekusi (Implementation Steps)

1. **Langkah 1: Perbarui Komponen `src/components/TopBar.tsx`**:
   - Berikan kelas responsif `hidden sm:flex` pada tombol Currency picker, Language button, dan Theme button langsung di header bar.
   - Perkaya modal/dropdown profil di mobile (`sm:hidden`) sehingga mencakup:
     - Header info akun pengguna (foto/avatar, nama, email).
     - Bagian "Preferensi Cepat":
       - Selector Mata Uang Utama dengan chip tombol yang ramah sentuhan.
       - Selector Bahasa (ID / EN).
       - Switch Tema Gelap/Terang.
       - Tombol Kunci Aplikasi (jika PIN aktif).
     - Tombol Masuk Google (jika belum login) atau Keluar (jika sudah login).
2. **Langkah 2: Sinkronisasi Terjemahan (i18n)**:
   - Pastikan label pada menu preferensi mobile (seperti "Pengaturan Cepat", "Mata Uang Utama", "Tema", "Bahasa") tersedia dalam Bahasa Indonesia dan Bahasa Inggris.
3. **Langkah 3: Pengujian & Verifikasi**:
   - Jalankan `compile_applet` dan `lint_applet` untuk menjamin zero compilation & type error.
   - Buka browser menggunakan `playwright-cli` pada ukuran viewport mobile (390 x 844 px) untuk memverifikasi tampilan navbar mobile yang baru.
