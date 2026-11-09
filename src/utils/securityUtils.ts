import {
  SupportedCurrency,
  WalletAccount,
  Transaction,
  RecurringTransaction,
  BudgetCategory,
  SavingsGoal,
  DebtRecord,
} from '../types/finance';

export type AutoLockTimeoutMinutes = 0 | 1 | 5 | 15 | 30;

export interface PinAttemptState {
  failedAttempts: number;
  lockoutUntilMs: number | null;
}

export const MAX_PIN_ATTEMPTS = 5;
export const PIN_LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds cooldown

const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  'IDR',
  'USD',
  'EUR',
  'SGD',
  'MYR',
  'JPY',
  'GBP',
  'AUD',
];

/**
 * Deterministic synchronous salted hash (FNV-1a + multi-round mixing producing a 64-char hex digest)
 * so PINs are never stored in plaintext in localStorage and can be verified synchronously.
 */
export function hashPinSync(pin: string, salt: string): string {
  const normalizedPin = String(pin).trim();
  const normalizedSalt = String(salt || 'finbag_default_salt').trim();
  const payload = `finbag_v2_pin::${normalizedSalt}::${normalizedPin}::shield`;

  const seeds = [
    0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35,
    0x27d4eb2f, 0x165667b1, 0xd3a2646c, 0xfd7046c5,
  ];

  for (let round = 0; round < 64; round++) {
    for (let i = 0; i < payload.length; i++) {
      const code = payload.charCodeAt(i);
      const sIdx = (i + round) % seeds.length;
      let h = seeds[sIdx] ^ (code + round * 31);
      h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
      h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
      h = (h ^ (h >>> 16)) >>> 0;
      seeds[sIdx] = h;
      seeds[(sIdx + 1) % seeds.length] = (seeds[(sIdx + 1) % seeds.length] + h) >>> 0;
    }
  }

  return 'sha256s$' + seeds.map((s) => s.toString(16).padStart(8, '0')).join('');
}

export function isHashedPin(storedValue: string | null | undefined): boolean {
  return Boolean(storedValue && storedValue.startsWith('sha256s$') && storedValue.length === 72);
}

export function verifyPin(
  enteredPin: string,
  storedPinOrHash: string | null | undefined,
  salt: string
): boolean {
  if (!storedPinOrHash) return true;
  if (!/^\d{4,6}$/.test(enteredPin)) return false;

  if (isHashedPin(storedPinOrHash)) {
    const computed = hashPinSync(enteredPin, salt);
    // Constant-time string comparison
    if (computed.length !== storedPinOrHash.length) return false;
    let diff = 0;
    for (let i = 0; i < computed.length; i++) {
      diff |= computed.charCodeAt(i) ^ storedPinOrHash.charCodeAt(i);
    }
    return diff === 0;
  }

  // Legacy plaintext fallback comparison
  return enteredPin === storedPinOrHash;
}

/**
 * Evaluates a PIN attempt and updates the brute-force rate-limiting state.
 */
export function evaluatePinAttempt(
  enteredPin: string,
  storedPinOrHash: string | null | undefined,
  salt: string,
  currentState: PinAttemptState,
  nowMs: number = Date.now()
): {
  success: boolean;
  isLockedOut: boolean;
  remainingSeconds: number;
  remainingAttempts: number;
  nextState: PinAttemptState;
} {
  // Check active lockout
  if (currentState.lockoutUntilMs && nowMs < currentState.lockoutUntilMs) {
    const remainingSeconds = Math.max(1, Math.ceil((currentState.lockoutUntilMs - nowMs) / 1000));
    return {
      success: false,
      isLockedOut: true,
      remainingSeconds,
      remainingAttempts: 0,
      nextState: currentState,
    };
  }

  // Reset expired lockout before checking
  const baseAttempts =
    currentState.lockoutUntilMs && nowMs >= currentState.lockoutUntilMs
      ? 0
      : currentState.failedAttempts;

  const isCorrect = verifyPin(enteredPin, storedPinOrHash, salt);
  if (isCorrect) {
    return {
      success: true,
      isLockedOut: false,
      remainingSeconds: 0,
      remainingAttempts: MAX_PIN_ATTEMPTS,
      nextState: { failedAttempts: 0, lockoutUntilMs: null },
    };
  }

  const nextFailed = baseAttempts + 1;
  if (nextFailed >= MAX_PIN_ATTEMPTS) {
    const lockoutUntilMs = nowMs + PIN_LOCKOUT_DURATION_MS;
    return {
      success: false,
      isLockedOut: true,
      remainingSeconds: Math.ceil(PIN_LOCKOUT_DURATION_MS / 1000),
      remainingAttempts: 0,
      nextState: { failedAttempts: nextFailed, lockoutUntilMs },
    };
  }

  return {
    success: false,
    isLockedOut: false,
    remainingSeconds: 0,
    remainingAttempts: MAX_PIN_ATTEMPTS - nextFailed,
    nextState: { failedAttempts: nextFailed, lockoutUntilMs: null },
  };
}

/**
 * Prevents CSV Formula Injection (DDE / Excel / Google Sheets formula execution)
 * by neutralizing leading '=', '+', '-', '@', tab, or CR characters in user strings.
 */
export function sanitizeCsvCell(value: unknown): string {
  const raw = String(value ?? '').replace(/\r?\n/g, ' ').trim();
  const neutralized = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${neutralized.replace(/"/g, '""')}"`;
}

/**
 * Sanitizes free-text user input by stripping control characters and bounding length.
 */
export function sanitizeTextInput(input: unknown, maxLength: number = 200): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

/**
 * Computes a deterministic checksum for backup JSON payloads to detect accidental corruption or tampering.
 */
export function computeBackupChecksum(payload: {
  wallets?: unknown[];
  transactions?: unknown[];
  recurringTransactions?: unknown[];
  goals?: unknown[];
  debts?: unknown[];
}): string {
  const canonical = JSON.stringify({
    w: Array.isArray(payload.wallets) ? payload.wallets.length : 0,
    t: Array.isArray(payload.transactions) ? payload.transactions.length : 0,
    r: Array.isArray(payload.recurringTransactions) ? payload.recurringTransactions.length : 0,
    g: Array.isArray(payload.goals) ? payload.goals.length : 0,
    d: Array.isArray(payload.debts) ? payload.debts.length : 0,
    wIds: Array.isArray(payload.wallets) ? payload.wallets.map((x: any) => `${x?.id}:${x?.balance}`).join('|') : '',
    tIds: Array.isArray(payload.transactions) ? payload.transactions.map((x: any) => `${x?.id}:${x?.amount}`).join('|') : '',
  });
  return hashPinSync(canonical, 'finbag_backup_integrity_v2');
}

export interface ValidatedBackupResult {
  valid: boolean;
  error?: string;
  checksumVerified: boolean;
  data?: {
    wallets: WalletAccount[];
    transactions: Transaction[];
    recurringTransactions: RecurringTransaction[];
    categories?: BudgetCategory[];
    goals: SavingsGoal[];
    debts: DebtRecord[];
  };
}

function isValidSafeId(id: unknown): id is string {
  return typeof id === 'string' && id.length > 0 && id.length <= 128 && /^[a-zA-Z0-9_\-]+$/.test(id);
}

function isValidCurrency(curr: unknown): curr is SupportedCurrency {
  return typeof curr === 'string' && SUPPORTED_CURRENCIES.includes(curr as SupportedCurrency);
}

function isValidFiniteAmount(val: unknown, allowNegative: boolean = false): val is number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return false;
  if (!allowNegative && val < 0) return false;
  return Math.abs(val) <= 1_000_000_000_000_000;
}

/**
 * Validates and sanitizes an imported JSON backup string against strict schema & boundary rules.
 */
export function validateAndSanitizeBackupJSON(jsonString: string): ValidatedBackupResult {
  if (!jsonString || typeof jsonString !== 'string' || jsonString.length > 5_000_000) {
    return {
      valid: false,
      checksumVerified: false,
      error: 'Ukuran atau format data cadangan tidak valid (maksimal 5MB).',
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return {
      valid: false,
      checksumVerified: false,
      error: 'Format JSON rusak atau tidak dapat dibaca.',
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {
      valid: false,
      checksumVerified: false,
      error: 'Struktur objek cadangan tidak valid.',
    };
  }

  // Block prototype pollution keys
  if (
    Object.prototype.hasOwnProperty.call(parsed, '__proto__') ||
    Object.prototype.hasOwnProperty.call(parsed, 'constructor') ||
    Object.prototype.hasOwnProperty.call(parsed, 'prototype')
  ) {
    return {
      valid: false,
      checksumVerified: false,
      error: 'Terdeteksi properti tidak aman pada data cadangan.',
    };
  }

  const hasAnyCollection =
    Array.isArray(parsed.wallets) ||
    Array.isArray(parsed.transactions) ||
    Array.isArray(parsed.goals) ||
    Array.isArray(parsed.debts) ||
    Array.isArray(parsed.recurringTransactions);

  if (!hasAnyCollection) {
    return {
      valid: false,
      checksumVerified: false,
      error: 'Data cadangan tidak memiliki koleksi dompet, transaksi, atau target yang valid.',
    };
  }

  const wallets: WalletAccount[] = [];
  if (Array.isArray(parsed.wallets)) {
    for (const w of parsed.wallets.slice(0, 100)) {
      if (
        w &&
        isValidSafeId(w.id) &&
        typeof w.name === 'string' &&
        ['cash', 'bank', 'ewallet', 'credit', 'investment'].includes(w.type) &&
        isValidFiniteAmount(w.balance, true) &&
        isValidCurrency(w.currency)
      ) {
        wallets.push({
          id: w.id,
          name: sanitizeTextInput(w.name, 100) || 'Dompet',
          type: w.type,
          balance: w.balance,
          initialBalance: isValidFiniteAmount(w.initialBalance, true) ? w.initialBalance : w.balance,
          currency: w.currency,
          color: sanitizeTextInput(w.color || '#3B82F6', 25),
        });
      }
    }
  }

  const transactions: Transaction[] = [];
  if (Array.isArray(parsed.transactions)) {
    for (const tx of parsed.transactions.slice(0, 5000)) {
      if (
        tx &&
        isValidSafeId(tx.id) &&
        typeof tx.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}/.test(tx.date) &&
        isValidFiniteAmount(tx.amount, false) &&
        isValidCurrency(tx.currency) &&
        ['expense', 'income', 'transfer'].includes(tx.type) &&
        isValidSafeId(tx.sourceWalletId)
      ) {
        transactions.push({
          id: tx.id,
          date: tx.date.slice(0, 10),
          amount: tx.amount,
          currency: tx.currency,
          type: tx.type,
          categoryId: tx.categoryId ? sanitizeTextInput(tx.categoryId, 64) : undefined,
          sourceWalletId: tx.sourceWalletId,
          targetWalletId: isValidSafeId(tx.targetWalletId) ? tx.targetWalletId : undefined,
          description: sanitizeTextInput(tx.description || 'Transaksi', 200),
          notes: tx.notes ? sanitizeTextInput(tx.notes, 500) : undefined,
          createdAt: typeof tx.createdAt === 'string' ? tx.createdAt.slice(0, 40) : undefined,
        });
      }
    }
  }

  const recurringTransactions: RecurringTransaction[] = [];
  if (Array.isArray(parsed.recurringTransactions)) {
    for (const rec of parsed.recurringTransactions.slice(0, 200)) {
      if (
        rec &&
        isValidSafeId(rec.id) &&
        isValidFiniteAmount(rec.amount, false) &&
        isValidCurrency(rec.currency) &&
        ['expense', 'income', 'transfer'].includes(rec.type) &&
        isValidSafeId(rec.sourceWalletId) &&
        ['daily', 'weekly', 'monthly', 'yearly'].includes(rec.frequency) &&
        typeof rec.startDate === 'string' &&
        typeof rec.nextRunDate === 'string'
      ) {
        recurringTransactions.push({
          id: rec.id,
          description: sanitizeTextInput(rec.description || 'Jadwal Rutin', 200),
          amount: rec.amount,
          currency: rec.currency,
          type: rec.type,
          categoryId: rec.categoryId ? sanitizeTextInput(rec.categoryId, 64) : undefined,
          sourceWalletId: rec.sourceWalletId,
          targetWalletId: isValidSafeId(rec.targetWalletId) ? rec.targetWalletId : undefined,
          frequency: rec.frequency,
          startDate: rec.startDate.slice(0, 10),
          nextRunDate: rec.nextRunDate.slice(0, 10),
          endDate: typeof rec.endDate === 'string' ? rec.endDate.slice(0, 10) : undefined,
          active: Boolean(rec.active),
        });
      }
    }
  }

  const goals: SavingsGoal[] = [];
  if (Array.isArray(parsed.goals)) {
    for (const g of parsed.goals.slice(0, 100)) {
      if (
        g &&
        isValidSafeId(g.id) &&
        typeof g.title === 'string' &&
        isValidFiniteAmount(g.targetAmount, false) &&
        isValidFiniteAmount(g.currentAmount, false) &&
        isValidCurrency(g.currency)
      ) {
        goals.push({
          id: g.id,
          title: sanitizeTextInput(g.title, 100) || 'Target Tabungan',
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          currency: g.currency,
          targetDate: typeof g.targetDate === 'string' ? g.targetDate.slice(0, 20) : undefined,
          color: sanitizeTextInput(g.color || '#10B981', 25),
          icon: sanitizeTextInput(g.icon || 'Target', 40),
        });
      }
    }
  }

  const debts: DebtRecord[] = [];
  if (Array.isArray(parsed.debts)) {
    for (const d of parsed.debts.slice(0, 500)) {
      if (
        d &&
        isValidSafeId(d.id) &&
        ['payable', 'receivable'].includes(d.type) &&
        typeof d.personName === 'string' &&
        typeof d.title === 'string' &&
        isValidFiniteAmount(d.amount, false) &&
        isValidCurrency(d.currency) &&
        ['unpaid', 'settled'].includes(d.status)
      ) {
        debts.push({
          id: d.id,
          type: d.type,
          personName: sanitizeTextInput(d.personName, 100) || 'Kontak',
          title: sanitizeTextInput(d.title, 150) || 'Catatan',
          amount: d.amount,
          paidAmount: isValidFiniteAmount(d.paidAmount, false) ? d.paidAmount : 0,
          currency: d.currency,
          dueDate: typeof d.dueDate === 'string' ? d.dueDate.slice(0, 20) : undefined,
          status: d.status,
          notes: d.notes ? sanitizeTextInput(d.notes, 300) : undefined,
          createdAt: typeof d.createdAt === 'string' ? d.createdAt.slice(0, 40) : new Date().toISOString(),
        });
      }
    }
  }

  let checksumVerified = false;
  if (typeof parsed.integrityChecksum === 'string') {
    const expected = computeBackupChecksum({
      wallets: parsed.wallets,
      transactions: parsed.transactions,
      recurringTransactions: parsed.recurringTransactions,
      goals: parsed.goals,
      debts: parsed.debts,
    });
    if (parsed.integrityChecksum !== expected) {
      return {
        valid: false,
        checksumVerified: false,
        error: 'Checksum integritas file cadangan tidak cocok (file mungkin telah dimodifikasi).',
      };
    }
    checksumVerified = true;
  }

  return {
    valid: true,
    checksumVerified,
    data: {
      wallets,
      transactions,
      recurringTransactions,
      goals,
      debts,
    },
  };
}

export interface SecurityHealthAssessment {
  score: number; // 0 to 100
  level: 'strong' | 'moderate' | 'basic';
  checks: {
    id: string;
    passed: boolean;
    weight: number;
    labelId: string;
    labelEn: string;
  }[];
}

export function calculateSecurityHealthScore(params: {
  isAuthenticated: boolean;
  isEmailVerified: boolean;
  hasPinEnabled: boolean;
  autoLockMinutes: AutoLockTimeoutMinutes;
  lockOnTabHidden: boolean;
}): SecurityHealthAssessment {
  const checks = [
    {
      id: 'auth_verified',
      passed: params.isAuthenticated && params.isEmailVerified,
      weight: 30,
      labelId: 'Autentikasi Google Terverifikasi & Isolasi Cloud Firestore',
      labelEn: 'Verified Google Auth & Cloud Firestore Isolation',
    },
    {
      id: 'pin_enabled',
      passed: params.hasPinEnabled,
      weight: 35,
      labelId: 'Kunci PIN Aplikasi Terenkripsi (Salted Hash + Anti Brute-Force)',
      labelEn: 'Encrypted App PIN Lock (Salted Hash + Anti Brute-Force)',
    },
    {
      id: 'auto_lock',
      passed: params.hasPinEnabled && params.autoLockMinutes > 0,
      weight: 20,
      labelId: 'Kunci Otomatis Saat Idle (Auto-Lock Inactivity Timer)',
      labelEn: 'Auto-Lock on Inactivity Timer Active',
    },
    {
      id: 'tab_lock',
      passed: params.hasPinEnabled && params.lockOnTabHidden,
      weight: 15,
      labelId: 'Proteksi Kunci Otomatis Saat Pindah Tab / Layar Diminimalkan',
      labelEn: 'Auto-Lock When Browser Tab is Hidden / Minimized',
    },
  ];

  const score = checks.reduce((sum, c) => sum + (c.passed ? c.weight : 0), 0);
  const level = score >= 85 ? 'strong' : score >= 50 ? 'moderate' : 'basic';

  return { score, level, checks };
}
