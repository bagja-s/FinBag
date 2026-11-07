# Implementasi Pengaturan Kategori & Jenis Notifikasi Push (Notification Preferences)

## Ringkasan Fitur
Fitur ini memungkinkan pengguna untuk memilih secara terperinci jenis pemberitahuan push apa saja yang ingin diterima atau dinonaktifkan di perangkat mereka, serta menyinkronkan preferensi tersebut secara persisten ke akun database Cloud Firestore.

### 1. Kategori Notifikasi yang Didukung (`src/types/finance.ts`)
- **`budgetAlerts`**: Peringatan Pagu Anggaran (saat pengeluaran mendekati 80% atau melampaui 100% dari batas pagu bulanan kategori).
- **`goalMilestones`**: Pencapaian Target Tabungan (notifikasi perayaan saat impian tabungan tercapai 100%).
- **`lowBalanceAlert`**: Peringatan Saldo Rekening Rendah (peringatan dini saat sisa saldo rekening/dompet menipis di bawah ambang batas minimal).
- **`weeklySummary`**: Ringkasan & Evaluasi Mingguan (laporan berkala pengeluaran mingguan dan pos kategori terbesar).
- **`transactionReminder`**: Pengingat Catat Transaksi Harian (pengingat otomatis untuk mencatat pengeluaran dan scan struk).

### 2. State & Logika Terpusat (`src/context/FinanceContext.tsx`)
- **State `notificationPreferences`**: Disimpan di `localStorage` dan tersinkronisasi otomatis dengan dokumen profil pengguna di Firestore (`users/{userId}.notificationPreferences`).
- **Fungsi `updateNotificationPreferences(newPrefs)`**: Menyimpan perubahan preferensi secara realtime.
- **Fungsi `triggerCategoryNotificationTest(category)`**: Menguji coba pengiriman notifikasi spesifik untuk masing-masing kategori secara terpisah.
- **Kondisi Pemicu Otomatis**:
  - `addTransaction`: Pengecekan pagu anggaran hanya dijalankan jika `budgetAlerts === true`.
  - `addTransaction`: Pengecekan saldo menipis dijalankan jika `lowBalanceAlert === true`.
  - `contributeToGoal`: Pengecekan target tabungan tercapai hanya dijalankan jika `goalMilestones === true`.

### 3. Tampilan Antarmuka Pengguna (`src/components/views/SettingsView.tsx`)
- Terdapat sub-panel khusus "Jenis & Kategori Notifikasi" di dalam Bagian Notifikasi Push.
- Setiap kategori dilengkapi:
  - Ikon visual berwarna representatif.
  - Judul dan deskripsi fungsi yang jelas.
  - Tombol **Uji** individual untuk langsung mencoba tampilan notifikasi di perangkat.
  - **Toggle Switch** interaktif dengan animasi transisi yang mulus.
  - Pesan peringatan jika izin notifikasi sistem browser belum diizinkan.

### 4. Perbaikan Persistensi Saldo Dompet & Kategori Kartu Kredit (Credit Card)
- **Akar Masalah**: Sebelumnya mutasi transaksi (`addTransaction`, `updateTransaction`, `deleteTransaction`) hanya memperbarui state React lokal dan menyimpan catatan transaksi ke sub-koleksi `users/{userId}/transactions`, tanpa menyinkronkan saldo dompet yang terpengaruh ke sub-koleksi `users/{userId}/wallets`. Akibatnya, saat halaman di-reload, `onSnapshot` Firestore mengambil data dompet dengan saldo sebelum transaksi, menyebabkan saldo dompet dan kekayaan bersih tampak kembali ke semula.
- **Solusi yang Diterapkan**:
  1. **Persistensi Realtime**: Pada `addTransaction`, `updateTransaction`, dan `deleteTransaction`, setiap dompet yang terpengaruh (sumber maupun tujuan transfer) langsung diperbarui saldonya ke Firestore (`users/{userId}/wallets/{walletId}`).
  2. **Auto-Rekonsiliasi Cerdas**: Menambahkan rekonsiliasi otomatis saat aplikasi pertama kali dimuat; jika ada dompet lama dengan transaksi yang belum tersinkron, sistem menghitung delta transaksi secara otomatis, memperbarui saldo dompet, dan menyimpannya secara persisten ke Firestore.
  3. **Kategori Dompet Baru `credit` (Kartu Kredit)**:
     - Menambahkan tipe `'credit'` pada `WalletType` (`src/types/finance.ts`).
     - Memperbarui skema `firebase-blueprint.json` dan aturan keamanan Firestore `firestore.rules` (`isValidWallet`) agar mengizinkan tipe `credit`.
     - Aturan keamanan berhasil di-deploy ke Cloud Firestore (`deploy_firebase`).
     - Menyediakan opsi "Kartu Kredit" (Credit Card) di `AddWalletModal.tsx` dengan ikon visual `CreditCard` di `WalletsView.tsx` dan `DashboardView.tsx`.
     - Menambahkan translasi multi-bahasa (ID: "Kartu Kredit", EN: "Credit Card").

### 5. Hasil Pengujian & Verifikasi
- Kompilasi `compile_applet`: **Berhasil (0 error)**.
- Linting TypeScript `lint_applet`: **0 error**.
- Unit Test `npm test`: **15/15 Lolos**.
- Dev Server: **HTTP 200 OK**.
