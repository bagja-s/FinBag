import http from 'http';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Body parser with 15MB limit for receipt images
app.use(express.json({ limit: '15mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: AI Receipt Scanner via Gemini 3.8 Flash
app.post('/api/scan-receipt', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Data gambar struk tidak ditemukan.' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType,
              data: cleanBase64,
            },
          },
          {
            text: `Anda adalah asisten cerdas pencatat keuangan personal FinBag.
Analisis foto struk/bon belanja ini secara teliti dan akurat. Ekstrak informasi berikut ke dalam format JSON:
1. merchant: Nama toko, minimarket, kafe, atau restoran (contoh: "Indomaret", "Alfamart", "Starbucks", "Pertamina").
2. totalAmount: Total nominal yang harus dibayar / grand total (angka murni positif, tanpa koma desimal atau titik pemisah ribuan).
3. date: Tanggal transaksi dalam format "YYYY-MM-DD" (jika tahun tidak tertera jelas, gunakan tahun berjalan).
4. category: Pilih kategori yang paling akurat dari daftar berikut:
   - "food" (makanan, minuman, restoran, kafe, warung)
   - "transport" (bensin, tol, tiket transportasi, parkir, ojol)
   - "utilities" (listrik, air, pulsa, kuota, internet)
   - "shopping" (belanja kebutuhan rumah tangga, pakaian, swalayan)
   - "entertainment" (bioskop, hobi, rekreasi, game)
   - "health" (obat, apotek, dokter, klinik)
   - "education" (buku, kursus, perlengkapan sekolah)
   - "other" (jika tidak cocok kategori di atas)
5. currency: Simbol kode mata uang 3-huruf (contoh "IDR", "USD", dll. Default: "IDR").
6. notes: Ringkasan singkat 1-3 barang belanjaan utama yang dibeli (contoh: "2x Kopi, 1x Roti").`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            totalAmount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            category: { type: Type.STRING },
            currency: { type: Type.STRING },
            notes: { type: Type.STRING },
          },
          required: ['merchant', 'totalAmount', 'category'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({ success: true, data: parsed });
  } catch (err: unknown) {
    console.error('Scan receipt error:', err);
    const message = err instanceof Error ? err.message : 'Gagal memproses struk.';
    return res.status(500).json({ error: message });
  }
});

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`FinBag Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
