# FinBag - Halaman Konsol Admin Khusus Pembuat Aplikasi (Creator Admin Console)

Rencana perancangan dan implementasi **Halaman Admin Khusus** bagi pembuat/pemilik aplikasi FinBag (`sm.bagja@gmail.com`), dengan kontrol hak akses berbasis peran (RBAC), diagnostik infrastruktur cloud realtime, dan alat manajemen platform.

---

### User Review & Decisions Grounded in Clarifications

> [!IMPORTANT]
> **Keputusan Spesifikasi Hak Akses & Keamanan**:
> 1. **Hak Akses Eksklusif**: Halaman Admin hanya dapat diakses oleh akun pembuat aplikasi (`sm.bagja@gmail.com`). Pengguna biasa tidak dapat melihat menu maupun mengakses rute admin ini.
> 2. **Navigasi Khusus**: Tombol navigasi "Konsol Admin" dengan ikon tameng (`ShieldCheck` / `Crown`) otomatis muncul di Sidebar dan TopBar saat akun pembuat login.
> 3. **Lencana Status**: Ditampilkan lencana verifikasi "Creator & Super Admin" pada profil akun.

---

### 1. Overview & Fitur Halaman Admin (`AdminView.tsx`)

Halaman Admin (`AdminView.tsx`) dirancang dengan antarmuka bertaraf *Executive Fintech Dashboard* yang menyajikan kendali menyeluruh:

1. **Ringkasan Akun Pembuat & Status Hak Akses**:
   - Menampilkan email terverifikasi (`sm.bagja@gmail.com`), status autentikasi Firebase, dan tanda pengenal peran *Super Admin*.
2. **Diagnostik Infrastruktur Cloud Real-Time**:
   - **Cloud Firestore**: Status koneksi aktif database (`ai-studio-50c4b824-c198-4259-ab2d-c91de78366a7`) dengan tombol uji latensi (*Ping Test*).
   - **Gemini 3.8 Flash AI**: Status kesiapan API scanner struk belanja (`/api/scan-receipt`).
   - **Live FX Currency Engine**: Status feed nilai tukar mata uang dunia dan waktu pembaruan terakhir.
   - **PWA Service Worker**: Status cache offline dan modul aplikasi.
3. **Statistik & Ringkasan Data**:
   - Jumlah dompet aktif terdaftar.
   - Volume mutasi transaksi yang tersimpan di cloud.
   - Pagu anggaran kategori dan target tabungan aktif.
4. **Alat Pengujian & Utilitas Pengembang (Developer Utilities)**:
   - Tombol *Force Refresh* kurs mata uang langsung dari API.
   - Simulator & penguji respon JSON Gemini 3.8 Flash untuk parsing struk.
   - Tinjauan skema kategori pengeluaran dan pagu default.
5. **Papan Pengumuman Sistem (Broadcast Banner)**:
   - Kemampuan bagi admin untuk menampilkan atau menyembunyikan banner informasi pemeliharaan/pembaruan ke seluruh aplikasi.

---

### 2. Technical Architecture & Component Tree

```
┌─────────────────────────────────────────────────────────────┐
│                        MainLayout                           │
├──────────────────────────────┬──────────────────────────────┤
│    Sidebar / TopBar          │          AdminView           │
│  [Konsol Admin] ◄──(isAdmin) │  ┌────────────────────────┐  │
│                              │  │ 1. Profil Super Admin  │  │
│                              │  ├────────────────────────┤  │
│                              │  │ 2. Status Cloud & AI   │  │
│                              │  ├────────────────────────┤  │
│                              │  │ 3. Statistik Platform  │  │
│                              │  ├────────────────────────┤  │
│                              │  │ 4. Utilitas Pengembang │  │
│                              │  └────────────────────────┘  │
└──────────────────────────────┴──────────────────────────────┘
```

---

### 3. Rencana Tahapan Eksekusi (Implementation Steps)

1. **Modul 1: Penambahan Kunci Terjemahan (i18n)**:
   - Tambahkan label untuk menu Admin, status infrastruktur, diagnostik, dan utilitas ke dalam `src/i18n/translations.ts` (ID & EN).
2. **Modul 2: Deteksi Hak Akses Admin di `FinanceContext.tsx`**:
   - Tambahkan getter `isAdmin` (bernilai `true` jika `user?.email === 'sm.bagja@gmail.com'`).
   - Izinkan tab `'admin'` pada navigasi `activeTab`.
3. **Modul 3: Pembuatan Komponen `src/components/views/AdminView.tsx`**:
   - Bangun tampilan dasbor admin modern dengan widget status cloud, statistik data, live ping test Firestore, dan kontrol pemeliharaan.
4. **Modul 4: Integrasi Menu Navigasi (`Sidebar.tsx`, `TopBar.tsx`, & `App.tsx`)**:
   - Tampilkan menu "Konsol Admin" di `Sidebar.tsx` dan lencana "Super Admin" di `TopBar.tsx` hanya jika `isAdmin === true`.
   - Pasang rute rendering `AdminView` di `src/App.tsx`.
5. **Modul 5: Verifikasi & Pengujian Kualitas**:
   - Jalankan `compile_applet` dan `lint_applet` (`tsc --noEmit`).
   - Jalankan test suite `categoryMatcher.test.ts`.
   - Uji responsivitas dan integritas keamanan rute.
