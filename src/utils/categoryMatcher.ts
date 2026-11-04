import { TransactionType } from '../types/finance';

// Comprehensive keyword mapping for auto-categorization supporting Indonesian and English
export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    'makan siang', 'makan malam', 'sarapan pagi', 'makan', 'minum', 'resto', 'restoran', 
    'cafe', 'kafe', 'kopi', 'coffee', 'starbucks', 'kenangan', 'janji jiwa', 'fore', 
    'boba', 'chatime', 'mixue', 'grabfood', 'gofood', 'shopeefood', 'warteg', 'bakso', 
    'sate', 'bakmi', 'indomie', 'lunch', 'dinner', 'breakfast', 'sarapan', 'cemilan', 
    'snack', 'burger', 'pizza', 'mcd', 'kfc', 'dcost', 'padang', 'kantin', 'kuliner', 
    'roti', 'cake', 'es krim', 'ice cream', 'jajan', 'beverage', 'restaurant', 'food', 
    'martabak', 'geprek', 'seblak', 'nasi padang', 'nasi goreng'
  ],
  transport: [
    'isi bensin', 'bensin', 'pertamax', 'pertalite', 'solar', 'spbu', 'ojol', 'gojek',
    'goride', 'gocar', 'grab', 'grabride', 'grabcar', 'maxim', 'indrive', 'taxi', 'taksi',
    'bluebird', 'parkir', 'parking', 'tol', 'toll', 'etoll', 'e-toll', 'emoney', 'kereta',
    'krl', 'mrt', 'lrt', 'bus', 'transjakarta', 'tiket pesawat', 'travel', 'garuda',
    'lion air', 'kai', 'commuter', 'flight', 'gasoline', 'fuel', 'subway'
  ],
  utilities: [
    'token listrik', 'listrik pln', 'listrik', 'pln', 'tagihan', 'pdam', 'tagihan air',
    'wifi', 'indihome', 'firstmedia', 'biznet', 'myrepublic', 'internet', 'pulsa', 
    'kuota', 'paket data', 'telkomsel', 'indosat', 'tri', 'smartfren', 'bpjs', 'gas elpiji', 
    'iuran', 'pbb', 'kebersihan', 'utility', 'electricity', 'water bill', 'phone bill'
  ],
  shopping: [
    'belanja bulanan', 'belanja mingguan', 'belanja', 'supermarket', 'minimarket', 
    'indomaret', 'alfamart', 'alfamidi', 'hypermart', 'transmart', 'superindo', 
    'shopee', 'tokopedia', 'lazada', 'blibli', 'tiktok shop', 'baju', 'celana', 
    'pakaian', 'sepatu', 'tas', 'mall', 'fashion', 'skincare', 'kosmetik', 'makeup', 
    'groceries', 'pasar', 'shopping', 'amazon'
  ],
  entertainment: [
    'nonton bioskop', 'nonton', 'bioskop', 'cinema', 'xxi', 'cgv', 'cinepolis', 
    'netflix', 'disney', 'spotify', 'youtube premium', 'youtube', 'hbo', 'steam', 
    'game', 'playstation', 'ps5', 'nintendo', 'concert', 'konser', 'karaoke', 
    'rekreasi', 'liburan', 'hotel', 'villa', 'staycation', 'tiket masuk', 'wisata', 
    'movie', 'subscription', 'vacation'
  ],
  health: [
    'rumah sakit', 'dokter gigi', 'dokter', 'obat', 'apotek', 'pharmacy', 'klinik', 
    'vitamin', 'supplement', 'checkup', 'swab', 'periksa', 'optik', 'kacamata', 
    'dentist', 'hospital', 'medicine', 'doctor', 'medical', 'halodoc', 'alodokter', 
    'kimia farma', 'k24'
  ],
  education: [
    'uang spp', 'spp', 'sekolah', 'kuliah', 'kursus', 'les privat', 'les', 'buku', 
    'alat tulis', 'bootcamp', 'udemy', 'coursera', 'seminar', 'webinar', 'tuition', 
    'school', 'university', 'course', 'training', 'sertifikasi', 'skripsi'
  ],
  salary: [
    'gaji bulanan', 'gaji', 'salary', 'payroll', 'upah', 'honor', 'thr', 'bonus', 
    'bonus tahunan', 'dividen', 'dividend', 'freelance', 'fee proyek', 'fee', 
    'komisi', 'cashback', 'refund', 'pendapatan', 'reward', 'bunga bank', 'side hustle'
  ],
  savings: [
    'tabungan', 'nabung', 'deposit', 'reksadana', 'saham', 'bibit', 'bareksa', 
    'crypto', 'binance', 'tokocrypto', 'emas antam', 'emas', 'antam', 'investasi', 
    'investment', 'savings', 'deposito'
  ]
};

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Predicts the most matching category ID based on the transaction description and type.
 * Uses exact word boundary or phrase matching with priority scoring.
 */
export function predictCategory(
  description: string, 
  transactionType: TransactionType = 'expense'
): string | null {
  if (!description || !description.trim()) {
    return null;
  }

  const normalized = description.toLowerCase().trim();

  // If transaction type is income, check income categories first
  if (transactionType === 'income') {
    for (const kw of CATEGORY_KEYWORDS.salary) {
      const pattern = new RegExp(`(^|[^a-zA-Z0-9])${escapeRegex(kw)}([^a-zA-Z0-9]|$)`, 'i');
      if (pattern.test(normalized)) {
        return 'salary';
      }
    }
  }

  let bestMatchCategory: string | null = null;
  let maxKeywordLength = 0;

  for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    // If expense, avoid matching salary
    if (transactionType === 'expense' && categoryId === 'salary') {
      continue;
    }

    for (const kw of keywords) {
      const pattern = new RegExp(`(^|[^a-zA-Z0-9])${escapeRegex(kw)}([^a-zA-Z0-9]|$)`, 'i');
      if (pattern.test(normalized)) {
        // Prefer longer, more specific keyword matches (e.g. "tiket pesawat" over "tiket")
        if (kw.length > maxKeywordLength) {
          maxKeywordLength = kw.length;
          bestMatchCategory = categoryId;
        }
      }
    }
  }

  return bestMatchCategory;
}
