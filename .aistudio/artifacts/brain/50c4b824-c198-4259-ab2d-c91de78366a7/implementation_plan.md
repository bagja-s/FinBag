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

## Status Implementasi: SELESAI (COMPLETED)

- [x] **Modul 1: Model Data & Sinkronisasi Profil Otomatis (`src/types/finance.ts` & `src/context/FinanceContext.tsx`)**:
  - Tipe `UserProfile` (`uid`, `email`, `displayName`, `photoURL`, `role`, `status`, `createdAt`, `lastLoginAt`) ditambahkan.
  - Sinkronisasi metadata otomatis saat login ke Firestore doc `/users/{userId}`.
  - Listener live untuk seluruh pengguna (`allUsers`) dan fungsi admin: `toggleUserStatus()`, `deleteUserProfile()`, dan `refreshUsers()`.

- [x] **Modul 2: Pembaruan Aturan Keamanan (`firestore.rules` & `firebase-blueprint.json`)**:
  - Helper `isAdmin()` berbasis verifikasi email `sm.bagja@gmail.com`.
  - Hak `allow list: if isAdmin();` pada `/users`.
  - Hak `allow update, delete: if isOwner(userId) || isAdmin();`.
  - Aturan Firestore dideploy dan aktif.

- [x] **Modul 3: Antarmuka Direktori & Manajemen Pengguna di `AdminView.tsx`**:
  - Counter metrics: Total Pengguna, Pengguna Aktif (hijau), Akun Ditangguhkan (merah).
  - Search bar interaktif (berdasarkan nama, email, atau UID) dan filter pill (Semua, Aktif, Ditangguhkan).
  - Kartu baris pengguna dengan avatar, nama, email, badge status dan role (`Creator` vs `User`).
  - Tombol aksi Tangguhkan / Aktifkan dan Hapus Akun dengan modal konfirmasi (`ConfirmationModal`).
  - Akun Creator diproteksi secara otomatis agar tidak dapat ditangguhkan/dihapus secara sengaja.

- [x] **Modul 4: Proteksi Akun Ditangguhkan di Tampilan Utama (`App.tsx`)**:
  - Jika pengguna berstatus `suspended` masuk, aplikasi mengarahkan ke layar pemberitahuan ramah bahwa akun dinonaktifkan sementara oleh Administrator dengan tombol Logout.

- [x] **Modul 5: Pengujian & Validasi Kualitas**:
  - `pnpm exec tsc --noEmit` lulus dengan 0 error.
  - `pnpm exec vite build` sukses menghasilkan bundel produksi teroptimasi.
  - 8/8 unit tests lulus (100%).
