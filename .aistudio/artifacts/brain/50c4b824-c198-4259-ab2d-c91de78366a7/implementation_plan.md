# FinBag - Rencana Implementasi: Optimasi Tampilan List Transaksi Dashboard (Mobile Compact)

**Tujuan**: Merapikan dan membuat daftar transaksi terakhir (*Recent Transactions*) di Dashboard jauh lebih ringkas (*compact*), elegan, dan efisien pada layar perangkat mobile tanpa mengurangi informasi penting atau fitur edit/hapus.

---

## Masalah pada Tampilan Mobile Saat Ini
1. Container menggunakan `flex-col` pada mobile, sehingga memecah transaksi menjadi 2 baris terpisah (nama & rincian di baris atas, nominal & tombol aksi di baris bawah).
2. Padding vertikal (`py-3`) dan gap yang terlalu lebar memakan banyak ruang vertikal layar HP.
3. Metadata teks (`tanggal · dompet · target · kategori`) terlalu panjang dan sering terpotong tidak rapi (*overflow*).
4. Tombol aksi (Edit & Hapus) memakan tempat signifikan di baris kedua.

---

## Rencana Solusi & Perubahan Desain Mobile

### 1. Desain Single-Row Horizontal (1 Baris Ringkas & Rapi)
- Mengubah struktur layout dari `flex-col sm:flex-row` menjadi **1 baris horizontal penuh** (`flex items-center justify-between`) baik di mobile maupun desktop.
- Mengurangi tinggi baris dan padding: dari `py-3 px-2.5` menjadi `py-2 px-1.5 sm:py-2.5 sm:px-2.5`.

### 2. Ukuran Elemen Visual Proporsional
- **Ikon Kategori/Arah**: Dari `h-9 w-9` menjadi `h-8 w-8` di mobile (`sm:h-9 sm:w-9`) dengan radius rounded yang rapi.
- **Judul Transaksi**: `text-xs font-semibold text-slate-900 dark:text-white truncate` dengan batas lebar fleksibel agar tidak menabrak nominal.
- **Sub-informasi (Subtitle)**: Diringkas menjadi format bersih 1 baris:
  `[Tanggal] · [Dompet/Kategori]` dengan teks `text-[10px] text-slate-400 truncate`.

### 3. Nominal & Aksi Cepat yang Ergonomis
- **Nominal Transaksi**: Rata kanan (`text-right font-mono font-bold text-xs sm:text-sm tabular-nums`), berwarna hijau untuk pemasukan (+), merah untuk pengeluaran (-), dan biru untuk transfer.
- **Tombol Edit & Hapus**:
  - Dibuat ringkas di sebelah kanan nominal (`p-1 text-slate-400 hover:text-blue-500` / `hover:text-rose-500`).
  - Ukuran ikon `h-3 w-3 sm:h-3.5 sm:w-3.5`, sehingga tetap mudah ditekan (*touch-target* nyaman) namun tidak membuat tata letak berantakan.

---

## Modul yang Akan Dimodifikasi
- `src/components/views/DashboardView.tsx`: Refaktor JSX item daftar `recentTxs.map(...)` agar mengadopsi format single-line compact modern.

---

## Status Implementasi: SELESAI (COMPLETED)

- [x] **Format 1 Baris Horizontal (Single-Row Compact)**:
  - Mengubah layout item transaksi dari `flex-col sm:flex-row` menjadi 1 baris sejajar (`flex items-center justify-between`) di mobile dan desktop.
  - Padding vertikal dioptimalkan menjadi `py-2 sm:py-2.5` dan padding horizontal `px-1.5 sm:px-2.5`.
- [x] **Elemen Visual & Tipografi Proporsional**:
  - Ukuran ikon disesuaikan (`h-8 w-8` di mobile, `h-9 w-9` di desktop).
  - Judul transaksi terpotong rapi dengan `truncate`.
  - Subtitle dibuat ringkas: `[Tanggal] · [Dompet]` dengan tag kategori sekunder yang disembunyikan di layar sempit agar tidak tumpang tindih.
- [x] **Nominal & Tombol Aksi Sejajar**:
  - Nominal rata kanan dengan warna kontras (+ hijau, - merah, biru).
  - Tombol Edit & Hapus diletakkan sejajar di samping nominal (`h-3 w-3 sm:h-3.5 sm:w-3.5`) dengan touch-target responsif.
- [x] **Pengujian & Validasi Kualitas**:
  - TypeScript typecheck (`pnpm exec tsc --noEmit`): 0 error.
  - Vite production build: Sukses terbundel tanpa error.

