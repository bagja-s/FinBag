# FinBag - Rencana Implementasi: Manajemen Pengguna di Konsol Admin

**Tujuan**: Memberikan kemampuan penuh kepada Creator / Super Admin (`sm.bagja@gmail.com`) untuk melihat daftar seluruh pengguna terdaftar, memeriksa status dan aktivitas mereka, serta mengelola status akun (Aktif / Ditangguhkan / Hapus Data) langsung dari Konsol Admin.

---

## Arsitektur & Skema Teknis

### 1. Sinkronisasi Profil Pengguna ke Firestore (`users/{userId}`)
Setiap kali ada pengguna yang login dengan Google Auth di FinBag, aplikasi secara otomatis mencatat / memperbarui dokumen profil publik mereka:
- `uid`: string (ID unik dari Firebase Auth)
- `email`: string
- `displayName`: string
- `photoURL`: string
- `role`: `'creator'` (untuk `sm.bagja@gmail.com`) atau `'user'`
- `status`: `'active'` | `'suspended'` (default: `'active'`)
- `createdAt`: ISO string timestamp
- `lastLoginAt`: ISO string timestamp
- `baseCurrency`: string (default: `'IDR'`)
- `language`: string (default: `'id'`)

### 2. Keamanan & Hak Akses Firestore (`firestore.rules`)
- Admin (`sm.bagja@gmail.com` dengan `email_verified == true`) diberikan hak `allow list, get, update` pada koleksi `/users/{userId}`.
- Pengguna reguler hanya boleh membaca dan mengubah profil miliknya sendiri (`isOwner(userId)`).
- Pengguna reguler diblokir untuk memodifikasi field `role` atau `status` mereka sendiri.

### 3. Pengecekan Akun Ditangguhkan (Suspension Enforcement)
- Jika seorang pengguna ditandai dengan status `suspended` oleh Admin, saat mereka masuk ke aplikasi, akan ditampilkan layar peringatan ramah bahwa akun sedang ditangguhkan oleh Administrator dengan opsi logout atau hubungi bantuan.

---

## Rincian Modul & Langkah Kerja

### Modul 1: Model Data & Sinkronisasi Profil Otomatis (`src/context/FinanceContext.tsx`)
- Tambahkan interface `UserProfile` (`uid`, `email`, `displayName`, `photoURL`, `role`, `status`, `createdAt`, `lastLoginAt`).
- Saat `onAuthStateChanged` mendeteksi pengguna baru atau login kembali:
  - Lakukan `setDoc(doc(db, 'users', user.uid), { ...profileData }, { merge: true })` agar tidak menimpa status yang sudah diubah admin.
- Berikan state `allUsers: UserProfile[]` dan fungsi `fetchAllUsers()`, `updateUserStatus(uid, status)`.

### Modul 2: Pembaruan Aturan Keamanan (`firestore.rules` & `firebase-blueprint.json`)
- Tambahkan helper `isAdmin()` berbasis verifikasi email pembuat aplikasi.
- Izinkan `allow list: if isAdmin();` pada `/users`.
- Izinkan `allow update: if isOwner(userId) || isAdmin();` dengan proteksi field `role` dan `status`.

### Modul 3: Antarmuka Direktori Pengguna di `AdminView.tsx`
- Tambahkan tab/bagian baru **"Manajemen Pengguna" (User Directory)**:
  - **Statistik Cepat**: Total Pengguna Terdaftar, Pengguna Aktif, Pengguna Ditangguhkan.
  - **Kotak Pencarian**: Filter cepat berdasarkan nama atau alamat email pengguna.
  - **Tabel Pengguna**:
    - Kolom Avatar & Nama Lengkap
    - Kolom Email & Lencana Verifikasi
    - Kolom Peran (`CREATOR` emas, `USER` abu-abu)
    - Kolom Tanggal Bergabung & Terakhir Aktif
    - Kolom Status Akun (`Active` hijau, `Suspended` merah)
  - **Aksi Cepat**:
    - Tombol **Suspend / Aktifkan**: Mengubah status akses akun secara real-time.
    - Tombol **Hapus Riwayat/Data**: Modal konfirmasi untuk membersihkan data atas permintaan user.

### Modul 4: Proteksi Akun Ditangguhkan di Tampilan Utama (`App.tsx`)
- Jika user terdeteksi memiliki `status === 'suspended'`, render banner / kartu pemberitahuan akun ditangguhkan yang mengunci aksi penambahan transaksi baru.

### Modul 5: Pengujian & Validasi
- Jalankan `compile_applet` dan `lint_applet` untuk menjamin tidak ada regresi tipe TypeScript.
- Uji alur pembuatan akun baru, pembacaan daftar user oleh admin, dan toggle status suspend.

---

## Konfirmasi Pengguna
Apakah rencana arsitektur di atas sudah sesuai dengan kebutuhan Anda? Silakan klik tombol **Proceed** atau beri instruksi tambahan untuk memulai implementasi.
