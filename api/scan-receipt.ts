import { GoogleGenAI, Type } from '@google/genai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  // Hanya izinkan metode POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Gunakan POST.' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables Vercel.',
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'finbag-vercel',
        },
      },
    });

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { imageBase64, mimeType = 'image/jpeg' } = body || {};

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
    return res.status(200).json({ success: true, data: parsed });
  } catch (err: unknown) {
    console.error('Scan receipt serverless error:', err);
    const message = err instanceof Error ? err.message : 'Gagal memproses foto struk.';
    return res.status(500).json({ error: message });
  }
}
