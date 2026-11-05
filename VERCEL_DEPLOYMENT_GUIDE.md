# Panduan Lengkap Deploy FinBag ke Vercel

Panduan ini berisi langkah-langkah praktis dan terstruktur untuk mendeploy aplikasi **FinBag (Personal Finance & Multi-Currency)** ke platform **Vercel** agar dapat diakses publik secara online dengan domain `https://nama-aplikasi.vercel.app` atau domain kustom Anda.

---

## 📋 Ringkasan Arsitektur di Vercel

- **Frontend**: Dikompilasi otomatis oleh Vite menjadi file statis performa tinggi di folder `dist/` (React 19 + Tailwind CSS + PWA + Recharts).
- **Backend API (`/api/scan-receipt`)**: Berjalan otomatis sebagai **Vercel Serverless Function** menggunakan Node.js dan model AI `@google/genai` (`gemini-3.8-flash`).
- **Database & Auth**: Terhubung langsung ke **Cloud Firestore** dan **Firebase Authentication** dengan sinkronisasi realtime.

---

## 🛠️ Langkah-Langkah Deployment

### 1. Hubungkan Kode ke GitHub
Pastikan seluruh kode proyek FinBag Anda telah di-*push* ke repository Git (misalnya GitHub atau GitLab):

```bash
git init
git add .
git commit -m "feat: setup FinBag for Vercel deployment"
git branch -M main
git remote add origin https://github.com/USERNAME/finbag.git
git push -u origin main
```

---

### 2. Import Proyek di Vercel Dashboard

1. Buka [https://vercel.com](https://vercel.com) dan login menggunakan akun GitHub Anda.
2. Pada halaman utama Vercel, klik tombol **"Add New..."** lalu pilih **"Project"**.
3. Cari dan pilih repository `finbag` yang baru saja Anda push, lalu klik **"Import"**.
4. Di bagian **Configure Project**:
   - **Framework Preset**: Pilih `Vite` (biasanya terdeteksi otomatis).
   - **Root Directory**: `./` (biarkan default).
   - **Build Command**: `npm run build` (atau biarkan default).
   - **Output Directory**: `dist` (atau biarkan default).
   - **Install Command**: `npm install` (atau biarkan default).

---

### 3. Tambahkan Environment Variable di Vercel

Di halaman konfigurasi Vercel yang sama sebelum klik Deploy, buka bagian **"Environment Variables"**:

Tambahkan variabel berikut:
- **Key**: `GEMINI_API_KEY`
- **Value**: Masukkan API key Google Gemini Anda (didapatkan dari [Google AI Studio](https://aistudio.google.com/app/apikey)).

> *Catatan: Variabel ini diperlukan oleh serverless function `/api/scan-receipt` untuk menjalankan fitur scan struk belanja otomatis.*

Setelah itu, klik tombol **"Deploy"**. Vercel akan memproses build dalam 1–2 menit hingga selesai.

---

### 4. ⚠️ Langkah Krusial: Daftarkan Domain Vercel di Firebase Console

Agar fitur **Masuk dengan Google (Google Sign-In)** dapat berfungsi dan tidak ditolak dengan pesan error `auth/unauthorized-domain`:

1. Buka [Firebase Console](https://console.firebase.google.com).
2. Pilih project Firebase aplikasi FinBag Anda.
3. Di menu sebelah kiri, klik **Build** > **Authentication**.
4. Klik tab **Settings** di bagian atas, lalu pilih submenu **Authorized domains**.
5. Klik tombol **Add domain**.
6. Masukkan nama domain Vercel yang diberikan untuk aplikasi Anda, misalnya:
   ```text
   finbag.vercel.app
   ```
   *(atau domain kustom Anda jika menggunakan custom domain).*
7. Klik **Add**.

---

### 5. Verifikasi Fitur Aplikasi

Setelah deploy selesai dan domain terdaftar:
1. Buka URL Vercel aplikasi Anda di browser HP atau Laptop.
2. **Coba Login**: Klik tombol "Masuk dengan Google" untuk memverifikasi autentikasi Firebase.
3. **Coba Scan Struk**: Buka modal "Catat Transaksi" dan tekan tombol **Scan Struk (Kamera)** untuk menguji integrasi AI Gemini.
4. **Instal PWA**: Di Chrome/Edge/Safari, tekan opsi "Install FinBag" atau "Tambahkan ke Layar Utama" untuk memasangnya sebagai aplikasi mandiri di perangkat Anda.

---

## 📁 File Konfigurasi yang Telah Disediakan

1. `vercel.json`: Mengatur pengalihan URL (*routing rewrites*) agar navigasi SPA berjalan mulus dan rute `/api/*` diarahkan ke Serverless Function.
2. `api/scan-receipt.ts`: Endpoint serverless mandiri untuk memproses gambar struk hingga 15MB dengan Gemini 3.8 Flash.
