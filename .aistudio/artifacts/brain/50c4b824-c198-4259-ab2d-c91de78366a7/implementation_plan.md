# Implementasi Fitur Audit & Activity Log (Riwayat Perubahan Data)

## Ringkasan Fitur
Fitur Audit & Activity Log dirancang untuk mencatat dan melacak setiap tindakan penambahan, pengubahan, pemindahan saldo, serta penghapusan data secara otomatis dan persisten di database cloud.

### 1. Model Data & Tipe (`src/types/finance.ts`)
- **`AuditAction`**: `'CREATE' | 'UPDATE' | 'DELETE' | 'TRANSFER' | 'CLEAR'`
- **`AuditEntity`**: `'TRANSACTION' | 'WALLET' | 'GOAL' | 'BUDGET' | 'DATABASE' | 'SECURITY'`
- **`AuditLogEntry`**:
  - `id`: string unik (`log_${Date.now()}_...`)
  - `userId`: ID pengguna
  - `userEmail`: Email pengguna akun
  - `timestamp`: Format ISO 8601
  - `action`: Jenis tindakan
  - `entity`: Modul data terkait
  - `summary`: Ringkasan deskripsi perubahan ramah pengguna
  - `details`: Metadata detail (nominal, nama rekening, dsb.)

### 2. Aturan Keamanan & Skema Database (`firebase-blueprint.json` & `firestore.rules`)
- Koleksi: `/users/{userId}/audit_logs/{logId}`
- **Immutabilitas**: Sesuai standar audit trail keamanan tinggi, log data yang sudah tercatat **hanya dapat dibaca dan dibuat** (`allow read, create: if isOwner(userId); allow update, delete: if false;`), mencegah manipulasi atau penghapusan riwayat transaksi.
- Sudah dideploy ke Cloud Firestore melalui `deploy_firebase`.

### 3. Logika & Pemicu Mutasi Terpusat (`src/context/FinanceContext.tsx`)
- Fungsi `logActivity()` terpasang otomatis pada setiap fungsi mutasi:
  - `addTransaction`: Pemasukan, Pengeluaran, atau Transfer antar-dompet
  - `updateTransaction`: Perubahan nominal / kategori / dompet
  - `deleteTransaction`: Penghapusan transaksi
  - `addWallet`: Penambahan rekening baru
  - `updateWallet`: Pengubahan saldo / nama rekening
  - `deleteWallet`: Penutupan rekening
  - `updateBudgetLimit`: Penyesuaian pagu anggaran bulanan
  - `addGoal`: Pembuatan target tabungan
  - `contributeToGoal`: Penyetoran tabungan
  - `clearAllDatabaseData`: Pengosongan database
- Menyediakan *live listener* (`onSnapshot`) untuk sinkronisasi otomatis secara realtime antar-perangkat.

### 4. Tampilan Antarmuka Pengguna (UI)
- **Menu Pengaturan (`src/components/views/SettingsView.tsx`)**:
  - Kartu khusus "Log Riwayat Perubahan Data" dengan counter badge.
  - Filter aksi interaktif: *Semua*, *Dibuat*, *Diubah*, *Dihapus*, *Transfer*, *Dikosongkan*.
  - Indikator warna badge (Hijau: CREATE, Biru: UPDATE, Merah: DELETE, Ungu: TRANSFER, Amber: CLEAR).
  - Waktu lengkap (tanggal, jam, menit, detik).
- **Konsol Admin (`src/components/views/AdminView.tsx`)**:
  - Kartu inspeksi riwayat audit sistem berlabel *Immutable Trail*.

### 5. Verifikasi & Pengujian
- `compile_applet`: Berhasil tanpa error.
- `lint_applet`: 0 error linting TypeScript.
- `npm test`: 15/15 unit test berhasil lolos.
- Server lokal: HTTP 200 OK.
