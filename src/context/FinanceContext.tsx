import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { 
  SupportedCurrency, 
  SupportedLanguage, 
  WalletAccount, 
  Transaction, 
  RecurringTransaction,
  BudgetCategory, 
  SavingsGoal,
  DebtRecord,
  UserProfile,
  AuditAction,
  AuditEntity,
  AuditLogEntry,
  NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES
} from '../types/finance';
import { 
  INITIAL_WALLETS, 
  INITIAL_CATEGORIES, 
  INITIAL_TRANSACTIONS, 
  INITIAL_GOALS 
} from '../utils/demoData';
import { 
  fetchLiveExchangeRates, 
  RatesData, 
  convertCurrency, 
  FALLBACK_RATES_FROM_USD 
} from '../services/currencyService';
import { 
  auth, 
  db, 
  loginWithGoogle as fbLoginWithGoogle, 
  logoutUser as fbLogoutUser, 
  onAuthStateChanged, 
  OperationType, 
  handleFirestoreError,
  cleanFirestoreData
} from '../services/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query,
  getDocs 
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { 
  getNotificationPermission, 
  requestNotificationPermission, 
  triggerBudgetAlertNotification, 
  triggerGoalAchievedNotification, 
  triggerTestNotification, 
  triggerLowBalanceNotification,
  triggerWeeklySummaryNotification,
  triggerTransactionReminderNotification,
  NotificationPermissionStatus 
} from '../services/notificationService';
import { 
  formatCurrency, 
  setGlobalPrivacyMask,
  sortTransactionsNewestFirst, 
  calculateNextRecurringDate, 
  getDueRecurringOccurrences 
} from '../utils/financeCalculations';
import {
  AutoLockTimeoutMinutes,
  PinAttemptState,
  BiometricConfig,
  hashPinSync,
  isHashedPin,
  verifyPin,
  evaluatePinAttempt,
  sanitizeCsvCell,
  computeBackupChecksum,
  validateAndSanitizeBackupJSON,
  detectMobilePlatform,
  shouldRequireBiometricAfterPin,
  enrollWebAuthnBiometric,
  verifyWebAuthnBiometric,
} from '../utils/securityUtils';

interface FinanceContextType {
  // User & Auth
  user: User | null;
  currentUserProfile: UserProfile | null;
  allUsers: UserProfile[];
  isLoadingUsers: boolean;
  refreshUsers: () => Promise<void>;
  toggleUserStatus: (targetUid: string, currentStatus: 'active' | 'suspended') => Promise<void>;
  deleteUserProfile: (targetUid: string) => Promise<void>;
  isAdmin: boolean;
  isAuthLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  announcementNotice: string | null;
  announcementExpiry: string | null; // ISO string timestamp
  setAnnouncementNotice: (msg: string | null, expiry?: Date | null) => void;
  clearAnnouncementExpiry: () => void;

  // Push Notifications
  notificationPermission: NotificationPermissionStatus;
  requestNotifications: () => Promise<NotificationPermissionStatus>;
  sendTestNotification: () => Promise<boolean>;
  notificationPreferences: NotificationPreferences;
  updateNotificationPreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  triggerCategoryNotificationTest: (category: keyof NotificationPreferences) => Promise<boolean>;

  // Preferences
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  baseCurrency: SupportedCurrency;
  setBaseCurrency: (curr: SupportedCurrency) => void;
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  // Security Lock, Biometric 2FA & Privacy
  appPin: string | null;
  isAppUnlocked: boolean;
  isPinVerifiedForSession: boolean;
  isBiometricStepRequired: boolean;
  biometricConfig: BiometricConfig | null;
  pinAttemptState: PinAttemptState;
  setAppPin: (pin: string | null) => void;
  verifyCurrentPin: (enteredPin: string) => boolean;
  unlockApp: (enteredPin: string) => boolean;
  verifyBiometricUnlock: () => Promise<{ success: boolean; error?: string }>;
  registerBiometric: (options?: {
    mobileOnly?: boolean;
    allowFallbackIfRestricted?: boolean;
  }) => Promise<{ success: boolean; isEnvironmentRestricted?: boolean; error?: string }>;
  removeBiometric: () => void;
  setBiometricMobileOnly: (mobileOnly: boolean) => void;
  lockApp: () => void;
  autoLockMinutes: AutoLockTimeoutMinutes;
  setAutoLockMinutes: (minutes: AutoLockTimeoutMinutes) => void;
  lockOnTabHidden: boolean;
  setLockOnTabHidden: (enabled: boolean) => void;
  isPrivacyMode: boolean;
  togglePrivacyMode: () => void;

  // Navigation & Modals
  activeTab: 'dashboard' | 'wallets' | 'rates' | 'tools' | 'budgets' | 'transactions' | 'admin' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'wallets' | 'rates' | 'tools' | 'budgets' | 'transactions' | 'admin' | 'settings') => void;
  isTransactionModalOpen: boolean;
  setIsTransactionModalOpen: (open: boolean) => void;
  isAddWalletModalOpen: boolean;
  setIsAddWalletModalOpen: (open: boolean) => void;
  editingWallet: WalletAccount | null;
  setEditingWallet: (w: WalletAccount | null) => void;
  openEditWallet: (w: WalletAccount) => void;
  openAddWallet: () => void;
  editingTransaction: Transaction | null;
  setEditingTransaction: (tx: Transaction | null) => void;
  openEditTransaction: (tx: Transaction) => void;

  // Wallet Detail & Mutations Modal
  selectedWalletDetail: WalletAccount | null;
  setSelectedWalletDetail: (w: WalletAccount | null) => void;
  openWalletDetail: (w: WalletAccount) => void;
  closeWalletDetail: () => void;
  preselectedWalletId: string | null;
  setPreselectedWalletId: (id: string | null) => void;
  openAddTransactionWithWallet: (walletId: string, defaultType?: 'expense' | 'income' | 'transfer') => void;

  // Onboarding Tutorial
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  openTutorial: () => void;

  // Data
  wallets: WalletAccount[];
  transactions: Transaction[];
  recurringTransactions: RecurringTransaction[];
  categories: BudgetCategory[];
  goals: SavingsGoal[];
  debts: DebtRecord[];
  exchangeRates: RatesData;
  isRatesLoading: boolean;
  refreshExchangeRates: () => Promise<void>;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, updatedTx: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addRecurringTransaction: (rule: Omit<RecurringTransaction, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  updateRecurringTransaction: (id: string, updated: Partial<Omit<RecurringTransaction, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  deleteRecurringTransaction: (id: string) => Promise<void>;
  toggleRecurringTransaction: (id: string) => Promise<void>;
  executeRecurringTransactionNow: (id: string) => Promise<void>;
  processDueRecurringTransactions: () => Promise<number>;
  addWallet: (wallet: Omit<WalletAccount, 'id'>) => Promise<void>;
  updateWallet: (id: string, updated: Omit<WalletAccount, 'id' | 'userId'>) => Promise<void>;
  deleteWallet: (id: string) => Promise<void>;
  transferFunds: (sourceId: string, targetId: string, amount: number, currency: SupportedCurrency) => Promise<void>;
  updateBudgetLimit: (categoryId: string, limit: number) => Promise<void>;
  batchUpdateBudgetLimits: (limitsMap: Record<string, number>) => Promise<void>;
  addGoal: (goal: Omit<SavingsGoal, 'id' | 'currentAmount'>) => Promise<void>;
  contributeToGoal: (goalId: string, walletId: string, amount: number) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  addDebt: (debt: Omit<DebtRecord, 'id' | 'status' | 'paidAmount' | 'userId' | 'createdAt'>) => Promise<void>;
  settleDebt: (debtId: string, walletId: string) => Promise<void>;
  deleteDebt: (debtId: string) => Promise<void>;

  // Audit Logs
  auditLogs: AuditLogEntry[];
  logActivity: (action: AuditAction, entity: AuditEntity, summary: string, details?: Record<string, any>) => Promise<void>;

  // Export / Backup / Reset
  exportCSV: () => void;
  exportJSON: () => void;
  importJSON: (jsonString: string) => boolean;
  clearAllDatabaseData: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

const LOCAL_STORAGE_PREFIX = 'finbag_';

export const FinanceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // App settings
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    return (localStorage.getItem(`${LOCAL_STORAGE_PREFIX}lang`) as SupportedLanguage) || 'id';
  });
  const [baseCurrency, setBaseCurrencyState] = useState<SupportedCurrency>(() => {
    return (localStorage.getItem(`${LOCAL_STORAGE_PREFIX}curr`) as SupportedCurrency) || 'IDR';
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem(`${LOCAL_STORAGE_PREFIX}theme`) as 'dark' | 'light') || 'dark';
  });

  // Security PIN (per-account, stored as salted hash), Biometric WebAuthn 2FA & Privacy Mode
  const [appPin, setAppPinState] = useState<string | null>(null);
  const [isAppUnlocked, setIsAppUnlocked] = useState<boolean>(true);
  const [isPinVerifiedForSession, setIsPinVerifiedForSession] = useState<boolean>(false);
  const [biometricConfig, setBiometricConfigState] = useState<BiometricConfig | null>(null);
  const [pinAttemptState, setPinAttemptState] = useState<PinAttemptState>({
    failedAttempts: 0,
    lockoutUntilMs: null,
  });
  const [autoLockMinutes, setAutoLockMinutesState] = useState<AutoLockTimeoutMinutes>(() => {
    const saved = Number(localStorage.getItem(`${LOCAL_STORAGE_PREFIX}autolock_min`) || '5');
    return ([0, 1, 5, 15, 30].includes(saved) ? saved : 5) as AutoLockTimeoutMinutes;
  });
  const [lockOnTabHidden, setLockOnTabHiddenState] = useState<boolean>(() => {
    return localStorage.getItem(`${LOCAL_STORAGE_PREFIX}lock_tab_hidden`) === 'true';
  });
  const [isPrivacyMode, setIsPrivacyMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}privacy_mode`) === 'true';
    setGlobalPrivacyMask(saved);
    return saved;
  });

  // Push Notifications state
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionStatus>(() => {
    return getNotificationPermission();
  });

  // Notification Preferences state
  const [notificationPreferences, setNotificationPreferences] = useState<NotificationPreferences>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}notification_prefs`);
    if (saved) {
      try {
        return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_NOTIFICATION_PREFERENCES;
      }
    }
    return DEFAULT_NOTIFICATION_PREFERENCES;
  });

  const requestNotifications = async (): Promise<NotificationPermissionStatus> => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    return perm;
  };

  const updateNotificationPreferences = async (newPrefs: Partial<NotificationPreferences>) => {
    const updated: NotificationPreferences = { ...notificationPreferences, ...newPrefs };
    setNotificationPreferences(updated);
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}notification_prefs`, JSON.stringify(updated));

    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userDocRef, { notificationPreferences: updated }, { merge: true });
      } catch (err) {
        console.warn('Failed to save notification preferences to Firestore:', err);
      }
    }
  };

  const sendTestNotification = async (): Promise<boolean> => {
    return triggerTestNotification(language);
  };

  const triggerCategoryNotificationTest = async (category: keyof NotificationPreferences): Promise<boolean> => {
    if (category === 'budgetAlerts') {
      return triggerBudgetAlertNotification(
        language === 'id' ? 'Makanan & Minuman' : 'Food & Dining',
        85,
        formatCurrency(850000, baseCurrency),
        formatCurrency(1000000, baseCurrency),
        language
      );
    } else if (category === 'goalMilestones') {
      return triggerGoalAchievedNotification(
        language === 'id' ? 'Dana Darurat' : 'Emergency Fund',
        formatCurrency(10000000, baseCurrency),
        language
      );
    } else if (category === 'lowBalanceAlert') {
      const sampleWallet = wallets[0]?.name || (language === 'id' ? 'Dompet Utama' : 'Main Wallet');
      const sampleAmount = baseCurrency === 'IDR' ? 45000 : 4.5;
      return triggerLowBalanceNotification(
        sampleWallet,
        formatCurrency(sampleAmount, baseCurrency),
        language
      );
    } else if (category === 'weeklySummary') {
      const sampleSpent = baseCurrency === 'IDR' ? 1250000 : 125;
      return triggerWeeklySummaryNotification(
        formatCurrency(sampleSpent, baseCurrency),
        language === 'id' ? 'Belanja Kebutuhan' : 'Groceries',
        language
      );
    } else if (category === 'transactionReminder') {
      return triggerTransactionReminderNotification(language);
    }
    return sendTestNotification();
  };

  const ADMIN_EMAILS = ['sm.bagja@gmail.com'];
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  const [announcementNotice, setAnnouncementNoticeState] = useState<string | null>(() => {
    return localStorage.getItem(`${LOCAL_STORAGE_PREFIX}announcement`);
  });

  const [announcementExpiry, setAnnouncementExpiryState] = useState<string | null>(() => {
    return localStorage.getItem(`${LOCAL_STORAGE_PREFIX}announcement_expiry`);
  });

  const setAnnouncementNotice = (msg: string | null, expiry?: Date | null) => {
    setAnnouncementNoticeState(msg);
    if (msg) {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}announcement`, msg);
    } else {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}announcement`);
    }
    if (expiry) {
      const expiryIso = expiry.toISOString();
      setAnnouncementExpiryState(expiryIso);
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}announcement_expiry`, expiryIso);
    } else {
      setAnnouncementExpiryState(null);
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}announcement_expiry`);
    }
  };

  const clearAnnouncementExpiry = () => {
    setAnnouncementExpiryState(null);
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}announcement_expiry`);
  };

  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'wallets' | 'rates' | 'tools' | 'budgets' | 'transactions' | 'admin' | 'settings'>('dashboard');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAddWalletModalOpen, setIsAddWalletModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingWallet, setEditingWallet] = useState<WalletAccount | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);

  const openEditTransaction = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsTransactionModalOpen(true);
  };

  const openEditWallet = (wallet: WalletAccount) => {
    setEditingWallet(wallet);
    setIsAddWalletModalOpen(true);
  };

  const openAddWallet = () => {
    setEditingWallet(null);
    setIsAddWalletModalOpen(true);
  };

  const openTutorial = () => {
    setIsOnboardingOpen(true);
  };

  // Wallet Detail & Mutations Modal
  const [selectedWalletDetail, setSelectedWalletDetail] = useState<WalletAccount | null>(null);
  const [preselectedWalletId, setPreselectedWalletId] = useState<string | null>(null);

  const openWalletDetail = (wallet: WalletAccount) => {
    setSelectedWalletDetail(wallet);
  };

  const closeWalletDetail = () => {
    setSelectedWalletDetail(null);
  };

  const openAddTransactionWithWallet = (walletId: string, defaultType: 'expense' | 'income' | 'transfer' = 'expense') => {
    setEditingTransaction(null);
    setPreselectedWalletId(walletId);
    setIsTransactionModalOpen(true);
  };

  // Financial Data - strictly empty initial state directly loaded from user database
  const [wallets, setWallets] = useState<WalletAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}categories`);
    if (!saved) return INITIAL_CATEGORIES;
    try {
      const parsed: BudgetCategory[] = JSON.parse(saved);
      // Ensure all 24 categories from INITIAL_CATEGORIES are present, preserving custom limits from saved
      const savedMap = new Map(parsed.map((c) => [c.id, c]));
      const merged: BudgetCategory[] = INITIAL_CATEGORIES.map((cat) => {
        const existing = savedMap.get(cat.id);
        if (existing) {
          return {
            ...cat,
            monthlyLimit: typeof existing.monthlyLimit === 'number' ? existing.monthlyLimit : cat.monthlyLimit,
            color: existing.color || cat.color,
            icon: existing.icon || cat.icon,
          };
        }
        return cat;
      });
      // Also retain any custom user-added categories not in INITIAL_CATEGORIES
      parsed.forEach((c) => {
        if (!merged.some((m) => m.id === c.id)) {
          merged.push(c);
        }
      });
      return merged;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Purge any legacy dummy data from localStorage
  useEffect(() => {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}wallets`);
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}transactions`);
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}goals`);
  }, []);

  // Persist categories (budget limits) to localStorage whenever updated
  useEffect(() => {
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}categories`, JSON.stringify(categories));
  }, [categories]);

  // Keep selectedWalletDetail in sync with latest wallets updates
  useEffect(() => {
    if (selectedWalletDetail) {
      const refreshed = wallets.find((w) => w.id === selectedWalletDetail.id);
      if (refreshed) {
        setSelectedWalletDetail(refreshed);
      } else {
        setSelectedWalletDetail(null);
      }
    }
  }, [wallets]);

  // FX Rates
  const [exchangeRates, setExchangeRates] = useState<RatesData>({
    base: 'USD',
    rates: FALLBACK_RATES_FROM_USD,
    lastUpdated: 'Loading...',
  });
  const [isRatesLoading, setIsRatesLoading] = useState(false);

  const reconciledOnceRef = useRef(false);

  // Auto-reconcile legacy wallets if initialBalance was never persisted
  useEffect(() => {
    if (!user || wallets.length === 0 || isAuthLoading || reconciledOnceRef.current) {
      return;
    }

    let needsUpdate = false;
    const reconciledWallets = wallets.map((w) => {
      if (w.initialBalance === undefined) {
        needsUpdate = true;
        let netTxDelta = 0;
        for (const t of transactions) {
          if (t.type === 'expense' && t.sourceWalletId === w.id) {
            netTxDelta -= t.amount;
          } else if (t.type === 'income' && t.sourceWalletId === w.id) {
            netTxDelta += t.amount;
          } else if (t.type === 'transfer') {
            if (t.sourceWalletId === w.id) {
              netTxDelta -= t.amount;
            } else if (t.targetWalletId === w.id) {
              const converted = convertCurrency(t.amount, t.currency, w.currency, exchangeRates.rates);
              netTxDelta += converted;
            }
          }
        }

        const initialBalance = w.balance;
        const recalculatedBalance = initialBalance + netTxDelta;
        return {
          ...w,
          initialBalance,
          balance: recalculatedBalance,
        };
      }
      return w;
    });

    if (needsUpdate) {
      reconciledOnceRef.current = true;
      setWallets(reconciledWallets);
      for (const w of reconciledWallets) {
        if (w.initialBalance !== undefined) {
          const wPath = `users/${user.uid}/wallets`;
          setDoc(doc(db, wPath, w.id), cleanFirestoreData(w), { merge: true }).catch((err) => {
            console.warn('Reconciliation persist warning:', err);
          });
        }
      }
    }
  }, [user, wallets, transactions, isAuthLoading, exchangeRates.rates]);

  // Theme synchronization with HTML tag
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}theme`, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}lang`, lang);
  };

  const setBaseCurrency = (curr: SupportedCurrency) => {
    setBaseCurrencyState(curr);
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}curr`, curr);
  };

  // Announcement expiry checker - auto-clear banner when timer expires
  useEffect(() => {
    if (!announcementExpiry) return;
    const expiryTime = new Date(announcementExpiry).getTime();
    const now = Date.now();
    if (expiryTime <= now) {
      // Timer expired, clear the announcement
      setAnnouncementNotice(null);
      setAnnouncementExpiryState(null);
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}announcement_expiry`);
    } else {
      // Set a timeout to clear when it expires
      const timeoutMs = expiryTime - now;
      const timer = setTimeout(() => {
        setAnnouncementNotice(null);
        setAnnouncementExpiryState(null);
        localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}announcement_expiry`);
      }, timeoutMs);
      return () => clearTimeout(timer);
    }
  }, [announcementExpiry]);

  // Security & Privacy handlers
  const togglePrivacyMode = () => {
    setIsPrivacyMode((prev) => {
      const next = !prev;
      setGlobalPrivacyMask(next);
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}privacy_mode`, String(next));
      return next;
    });
  };

  const setAutoLockMinutes = (minutes: AutoLockTimeoutMinutes) => {
    setAutoLockMinutesState(minutes);
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}autolock_min`, String(minutes));
  };

  const setLockOnTabHidden = (enabled: boolean) => {
    setLockOnTabHiddenState(enabled);
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}lock_tab_hidden`, String(enabled));
  };

  const isBiometricStepRequired = shouldRequireBiometricAfterPin(
    Boolean(appPin),
    biometricConfig,
    detectMobilePlatform().isMobile
  );

  const setAppPin = (pin: string | null) => {
    if (!user) {
      setAppPinState(pin ? hashPinSync(pin, 'local_user') : null);
      return;
    }
    const userPinKey = `${LOCAL_STORAGE_PREFIX}pin_${user.uid}`;
    const userBioKey = `${LOCAL_STORAGE_PREFIX}biometric_${user.uid}`;
    if (pin) {
      const hashed = isHashedPin(pin) ? pin : hashPinSync(pin, user.uid);
      localStorage.setItem(userPinKey, hashed);
      setAppPinState(hashed);
      setIsPinVerifiedForSession(true);
      setIsAppUnlocked(true);
      setPinAttemptState({ failedAttempts: 0, lockoutUntilMs: null });
      logActivity(
        'UPDATE',
        'SECURITY',
        'Mengaktifkan / memperbarui PIN Keamanan Aplikasi (Salted SHA-256)',
        { autoLockMinutes }
      );
    } else {
      localStorage.removeItem(userPinKey);
      localStorage.removeItem(userBioKey);
      setAppPinState(null);
      setBiometricConfigState(null);
      setIsPinVerifiedForSession(false);
      setIsAppUnlocked(true);
      setPinAttemptState({ failedAttempts: 0, lockoutUntilMs: null });
      logActivity('DELETE', 'SECURITY', 'Menonaktifkan PIN Keamanan & Lapis Biometrik Aplikasi', {});
    }
  };

  const registerBiometric = async (options?: {
    mobileOnly?: boolean;
    allowFallbackIfRestricted?: boolean;
  }): Promise<{ success: boolean; isEnvironmentRestricted?: boolean; error?: string }> => {
    const uid = user?.uid || 'local_user';
    const result = await enrollWebAuthnBiometric({
      userId: uid,
      userEmail: user?.email || 'user@finbag.app',
      displayName: user?.displayName || 'FinBag User',
      mobileOnly: options?.mobileOnly ?? true,
      allowFallbackIfRestricted: options?.allowFallbackIfRestricted ?? false,
    });

    if (result.success && result.config) {
      setBiometricConfigState(result.config);
      localStorage.setItem(
        `${LOCAL_STORAGE_PREFIX}biometric_${uid}`,
        JSON.stringify(result.config)
      );
      logActivity(
        'CREATE',
        'SECURITY',
        `Mengaktifkan Lapis Ke-2 Biometrik WebAuthn (${result.config.authenticatorLabel}) setelah PIN`,
        { mobileOnly: result.config.mobileOnly }
      );
      return { success: true };
    }

    return {
      success: false,
      isEnvironmentRestricted: result.isEnvironmentRestricted,
      error: result.error,
    };
  };

  const removeBiometric = () => {
    const uid = user?.uid || 'local_user';
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}biometric_${uid}`);
    setBiometricConfigState(null);
    logActivity(
      'DELETE',
      'SECURITY',
      'Menonaktifkan Lapis Ke-2 Biometrik WebAuthn (FaceID / Sidik Jari)',
      {}
    );
  };

  const setBiometricMobileOnly = (mobileOnly: boolean) => {
    if (!biometricConfig) return;
    const uid = user?.uid || 'local_user';
    const updated: BiometricConfig = { ...biometricConfig, mobileOnly };
    setBiometricConfigState(updated);
    localStorage.setItem(`${LOCAL_STORAGE_PREFIX}biometric_${uid}`, JSON.stringify(updated));
  };

  const verifyCurrentPin = (enteredPin: string): boolean => {
    if (!appPin) return true;
    return verifyPin(enteredPin, appPin, user?.uid || 'local_user');
  };

  const unlockApp = (enteredPin: string): boolean => {
    if (!appPin) {
      setIsPinVerifiedForSession(true);
      setIsAppUnlocked(true);
      return true;
    }
    const evaluation = evaluatePinAttempt(
      enteredPin,
      appPin,
      user?.uid || 'local_user',
      pinAttemptState
    );
    setPinAttemptState(evaluation.nextState);

    if (evaluation.success) {
      setIsPinVerifiedForSession(true);
      // If biometric 2nd layer is required after PIN (specifically on mobile or when configured),
      // keep isAppUnlocked false until Step 2 (Biometric WebAuthn verification) completes.
      if (!isBiometricStepRequired) {
        setIsAppUnlocked(true);
      }
      return true;
    }

    if (evaluation.isLockedOut && evaluation.nextState.failedAttempts === 5) {
      logActivity(
        'UPDATE',
        'SECURITY',
        'Peringatan Keamanan: Percobaan PIN gagal 5x berturut-turut (Kunci Cooldown 30 detik aktif)',
        { failedAttempts: evaluation.nextState.failedAttempts }
      );
    }
    return false;
  };

  const verifyBiometricUnlock = async (): Promise<{ success: boolean; error?: string }> => {
    if (!biometricConfig || !biometricConfig.enabled) {
      setIsAppUnlocked(true);
      return { success: true };
    }
    const res = await verifyWebAuthnBiometric(biometricConfig);
    if (res.success) {
      setIsAppUnlocked(true);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const lockApp = () => {
    if (appPin) {
      setIsPinVerifiedForSession(false);
      setIsAppUnlocked(false);
    }
  };

  // Auto-Lock on Inactivity & Tab Visibility Change
  useEffect(() => {
    if (!appPin || !isAppUnlocked) return;

    let idleTimer: ReturnType<typeof setTimeout> | null = null;

    const resetIdleTimer = () => {
      if (idleTimer) clearTimeout(idleTimer);
      if (autoLockMinutes > 0) {
        idleTimer = setTimeout(() => {
          setIsPinVerifiedForSession(false);
          setIsAppUnlocked(false);
        }, autoLockMinutes * 60 * 1000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && lockOnTabHidden) {
        setIsPinVerifiedForSession(false);
        setIsAppUnlocked(false);
      } else if (document.visibilityState === 'visible') {
        resetIdleTimer();
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetIdleTimer, { passive: true }));
    document.addEventListener('visibilitychange', handleVisibilityChange);
    resetIdleTimer();

    return () => {
      if (idleTimer) clearTimeout(idleTimer);
      events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [appPin, isAppUnlocked, autoLockMinutes, lockOnTabHidden]);

  // Fetch Exchange Rates on Mount & on change
  const refreshExchangeRates = async () => {
    setIsRatesLoading(true);
    try {
      const data = await fetchLiveExchangeRates('USD');
      setExchangeRates(data);
    } catch (e) {
      console.warn('FX fetch error:', e);
    } finally {
      setIsRatesLoading(false);
    }
  };

  useEffect(() => {
    refreshExchangeRates();
  }, []);

  // Auth observer & Firestore listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

    // Firestore Sync when user is authenticated - 100% direct database, NO dummy seeding
  useEffect(() => {
    if (!user) {
      setCurrentUserProfile(null);
      setAppPinState(null);
      setIsAppUnlocked(true);
      setRecurringTransactions([]);
      setDebts([]);
      setAuditLogs([]);
      return;
    }

    // Trigger onboarding tutorial on first user login
    const hasSeenTutorial = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}onboarding_completed`);
    if (!hasSeenTutorial) {
      setIsOnboardingOpen(true);
    }

    const userId = user.uid;
    const nowIso = new Date().toISOString();
    const isCreatorEmail = user.email?.toLowerCase() === 'sm.bagja@gmail.com';

    // Load account-specific PIN and automatically upgrade plaintext PINs to salted SHA-256 hash
    const userPinKey = `${LOCAL_STORAGE_PREFIX}pin_${userId}`;
    const legacyPinKey = `${LOCAL_STORAGE_PREFIX}pin`;
    const legacyPin = localStorage.getItem(legacyPinKey);
    if (legacyPin && !localStorage.getItem(userPinKey)) {
      localStorage.setItem(userPinKey, hashPinSync(legacyPin, userId));
    }
    localStorage.removeItem(legacyPinKey); // Always purge legacy key
    let savedPin = localStorage.getItem(userPinKey);
    if (savedPin && !isHashedPin(savedPin)) {
      // Automatically migrate plaintext 4-digit PIN to salted hash
      savedPin = hashPinSync(savedPin, userId);
      localStorage.setItem(userPinKey, savedPin);
    }
    setAppPinState(savedPin);
    setIsPinVerifiedForSession(!savedPin);
    setIsAppUnlocked(!savedPin); // Lock if PIN exists

    // Load account-specific Biometric WebAuthn configuration
    const userBioKey = `${LOCAL_STORAGE_PREFIX}biometric_${userId}`;
    const savedBioRaw = localStorage.getItem(userBioKey);
    if (savedBioRaw) {
      try {
        setBiometricConfigState(JSON.parse(savedBioRaw) as BiometricConfig);
      } catch {
        setBiometricConfigState(null);
      }
    } else {
      setBiometricConfigState(null);
    }

    // Synchronize user profile in Firestore
    const userDocRef = doc(db, 'users', userId);
    
    // Listen to current user profile for live status updates (active vs suspended)
    const unsubscribeProfile = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const profileData = docSnap.data() as UserProfile;
          setCurrentUserProfile(profileData);
          if (profileData.notificationPreferences) {
            setNotificationPreferences(profileData.notificationPreferences);
            localStorage.setItem(
              `${LOCAL_STORAGE_PREFIX}notification_prefs`,
              JSON.stringify(profileData.notificationPreferences)
            );
          }
        } else {
          // Initialize fresh user profile
          const newProfile: UserProfile = {
            uid: userId,
            email: user.email || '',
            displayName: user.displayName || (user.email?.split('@')[0] || 'Pengguna FinBag'),
            photoURL: user.photoURL || undefined,
            role: isCreatorEmail ? 'creator' : 'user',
            status: 'active',
            createdAt: nowIso,
            lastLoginAt: nowIso,
            baseCurrency,
            language,
            notificationPreferences,
          };
          setDoc(userDocRef, cleanFirestoreData(newProfile), { merge: true }).catch(console.warn);
          setCurrentUserProfile(newProfile);
        }
      },
      (error) => {
        console.warn('Profile read warning:', error);
      }
    );

    // Update lastLoginAt & keep basic info fresh
    setDoc(
      userDocRef,
      cleanFirestoreData({
        uid: userId,
        email: user.email || '',
        displayName: user.displayName || (user.email?.split('@')[0] || 'Pengguna FinBag'),
        photoURL: user.photoURL || undefined,
        role: isCreatorEmail ? 'creator' : 'user',
        lastLoginAt: nowIso,
      }),
      { merge: true }
    ).catch(console.warn);

    // Listen to wallets directly from Firestore
    const walletsPath = `users/${userId}/wallets`;
    const unsubscribeWallets = onSnapshot(
      collection(db, walletsPath),
      (snapshot) => {
        const cloudWallets: WalletAccount[] = [];
        snapshot.forEach((d) => {
          cloudWallets.push({ id: d.id, ...d.data() } as WalletAccount);
        });
        setWallets(cloudWallets);
      },
      (error) => handleFirestoreError(error, OperationType.GET, walletsPath)
    );

    // Listen to transactions directly from Firestore
    const txsPath = `users/${userId}/transactions`;
    const unsubscribeTxs = onSnapshot(
      collection(db, txsPath),
      (snapshot) => {
        const cloudTxs: Transaction[] = [];
        snapshot.forEach((d) => {
          cloudTxs.push({ id: d.id, ...d.data() } as Transaction);
        });
        cloudTxs.sort(sortTransactionsNewestFirst);
        setTransactions(cloudTxs);
      },
      (error) => handleFirestoreError(error, OperationType.GET, txsPath)
    );

    // Listen to budgets directly from Firestore
    const budgetsPath = `users/${userId}/budgets`;
    const unsubscribeBudgets = onSnapshot(
      collection(db, budgetsPath),
      (snapshot) => {
        if (!snapshot.empty) {
          const cloudLimits = new Map<string, number>();
          snapshot.forEach((d) => {
            const data = d.data();
            if (typeof data.monthlyLimit === 'number') {
              cloudLimits.set(d.id, data.monthlyLimit);
            }
          });
          if (cloudLimits.size > 0) {
            setCategories((prev) =>
              prev.map((cat) =>
                cloudLimits.has(cat.id)
                  ? { ...cat, monthlyLimit: cloudLimits.get(cat.id)! }
                  : cat
              )
            );
          }
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, budgetsPath)
    );

    // Listen to goals directly from Firestore
    const goalsPath = `users/${userId}/goals`;
    const unsubscribeGoals = onSnapshot(
      collection(db, goalsPath),
      (snapshot) => {
        const cloudGoals: SavingsGoal[] = [];
        snapshot.forEach((d) => {
          cloudGoals.push({ id: d.id, ...d.data() } as SavingsGoal);
        });
        setGoals(cloudGoals);
      },
      (error) => handleFirestoreError(error, OperationType.GET, goalsPath)
    );

    // Listen to recurring transactions from Firestore (with localStorage fallback)
    const recurringStorageKey = `${LOCAL_STORAGE_PREFIX}recurring_${userId}`;
    const cachedRecurring = localStorage.getItem(recurringStorageKey);
    if (cachedRecurring) {
      try {
        setRecurringTransactions(JSON.parse(cachedRecurring));
      } catch {
        // ignore invalid cache
      }
    }

    const recurringPath = `users/${userId}/recurring_transactions`;
    const unsubscribeRecurring = onSnapshot(
      collection(db, recurringPath),
      (snapshot) => {
        const cloudRecurring: RecurringTransaction[] = [];
        snapshot.forEach((d) => {
          cloudRecurring.push({ id: d.id, ...d.data() } as RecurringTransaction);
        });
        cloudRecurring.sort((a, b) => (a.nextRunDate || '').localeCompare(b.nextRunDate || ''));
        setRecurringTransactions(cloudRecurring);
        localStorage.setItem(recurringStorageKey, JSON.stringify(cloudRecurring));
      },
      (error) => {
        console.warn('Recurring transactions read warning:', error);
      }
    );

    // Listen to debts from Firestore (with localStorage fallback)
    const debtsStorageKey = `${LOCAL_STORAGE_PREFIX}debts_${userId}`;
    const cachedDebts = localStorage.getItem(debtsStorageKey);
    if (cachedDebts) {
      try {
        setDebts(JSON.parse(cachedDebts));
      } catch {
        // ignore invalid cache
      }
    }

    const debtsPath = `users/${userId}/debts`;
    const unsubscribeDebts = onSnapshot(
      collection(db, debtsPath),
      (snapshot) => {
        const cloudDebts: DebtRecord[] = [];
        snapshot.forEach((d) => {
          cloudDebts.push({ id: d.id, ...d.data() } as DebtRecord);
        });
        cloudDebts.sort((a, b) => {
          if (a.status !== b.status) return a.status === 'unpaid' ? -1 : 1;
          return (b.createdAt || '').localeCompare(a.createdAt || '');
        });
        setDebts(cloudDebts);
        localStorage.setItem(debtsStorageKey, JSON.stringify(cloudDebts));
      },
      (error) => {
        console.warn('Debts read warning:', error);
      }
    );

    // Listen to audit logs directly from Firestore
    const auditLogsPath = `users/${userId}/audit_logs`;
    const unsubscribeAudit = onSnapshot(
      collection(db, auditLogsPath),
      (snapshot) => {
        const cloudLogs: AuditLogEntry[] = [];
        snapshot.forEach((d) => {
          cloudLogs.push({ id: d.id, ...d.data() } as AuditLogEntry);
        });
        cloudLogs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        setAuditLogs(cloudLogs.slice(0, 100));
      },
      (error) => handleFirestoreError(error, OperationType.GET, auditLogsPath)
    );

    return () => {
      unsubscribeProfile();
      unsubscribeWallets();
      unsubscribeTxs();
      unsubscribeBudgets();
      unsubscribeGoals();
      unsubscribeRecurring();
      unsubscribeDebts();
      unsubscribeAudit();
    };
  }, [user]);

  // Admin: Listen to all registered users
  useEffect(() => {
    if (!isAdmin) {
      setAllUsers([]);
      return;
    }

    setIsLoadingUsers(true);
    const usersCollection = collection(db, 'users');
    const unsubscribeAllUsers = onSnapshot(
      usersCollection,
      (snapshot) => {
        const list: UserProfile[] = [];
        snapshot.forEach((d) => {
          const val = d.data();
          list.push({
            uid: d.id,
            email: val.email || '',
            displayName: val.displayName || 'Pengguna FinBag',
            photoURL: val.photoURL,
            role: val.role || 'user',
            status: val.status || 'active',
            createdAt: val.createdAt || new Date().toISOString(),
            lastLoginAt: val.lastLoginAt || new Date().toISOString(),
            baseCurrency: val.baseCurrency,
            language: val.language,
          });
        });
        // Sort: newest activity first
        list.sort((a, b) => (b.lastLoginAt || '').localeCompare(a.lastLoginAt || ''));
        setAllUsers(list);
        setIsLoadingUsers(false);
      },
      (error) => {
        console.warn('Admin user directory listener error:', error);
        setIsLoadingUsers(false);
      }
    );

    return () => unsubscribeAllUsers();
  }, [isAdmin]);

  // Admin user management actions
  const refreshUsers = async () => {
    if (!isAdmin) return;
    setIsLoadingUsers(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        const val = d.data();
        list.push({
          uid: d.id,
          email: val.email || '',
          displayName: val.displayName || 'Pengguna FinBag',
          photoURL: val.photoURL,
          role: val.role || 'user',
          status: val.status || 'active',
          createdAt: val.createdAt || new Date().toISOString(),
          lastLoginAt: val.lastLoginAt || new Date().toISOString(),
          baseCurrency: val.baseCurrency,
          language: val.language,
        });
      });
      list.sort((a, b) => (b.lastLoginAt || '').localeCompare(a.lastLoginAt || ''));
      setAllUsers(list);
    } catch (err) {
      console.warn('Error refreshing users:', err);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const toggleUserStatus = async (targetUid: string, currentStatus: 'active' | 'suspended') => {
    if (!isAdmin) return;
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    const targetDoc = doc(db, 'users', targetUid);
    try {
      await setDoc(targetDoc, { status: newStatus }, { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUid}`);
    }
  };

  const deleteUserProfile = async (targetUid: string) => {
    if (!isAdmin) return;
    const targetDoc = doc(db, 'users', targetUid);
    try {
      await deleteDoc(targetDoc);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${targetUid}`);
    }
  };

  // Auth methods
  const loginWithGoogle = async () => {
    await fbLoginWithGoogle();
  };

  const logout = async () => {
    await fbLogoutUser();
    setUser(null);
    setCurrentUserProfile(null);
    setAllUsers([]);
    setAppPinState(null);
    setIsAppUnlocked(true);
    setWallets([]);
    setTransactions([]);
    setRecurringTransactions([]);
    setGoals([]);
    setDebts([]);
    setAuditLogs([]);
    reconciledOnceRef.current = false;
  };

  // Audit logging helper
  const logActivity = async (
    action: AuditAction,
    entity: AuditEntity,
    summary: string,
    details?: Record<string, any>
  ) => {
    const newEntry: AuditLogEntry = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: user?.uid || 'local_user',
      userEmail: user?.email || undefined,
      timestamp: new Date().toISOString(),
      action,
      entity,
      summary,
      details: details ? JSON.parse(JSON.stringify(details)) : {},
    };

    setAuditLogs((prev) => [newEntry, ...prev.slice(0, 99)]);

    if (user) {
      const auditPath = `users/${user.uid}/audit_logs`;
      try {
        await setDoc(doc(db, auditPath, newEntry.id), cleanFirestoreData(newEntry));
      } catch (err) {
        console.warn('Audit log write warning:', err);
      }
    }
  };

  // Transaction mutations
  const addTransaction = async (txData: Omit<Transaction, 'id'>) => {
    const newId = `tx_${Date.now()}`;
    const newTx: Transaction = {
      ...txData,
      id: newId,
      userId: user?.uid,
      createdAt: new Date().toISOString(),
    };

    // Validation: prevent expense or outgoing transfer if wallet balance is 0, negative, or insufficient
    if (newTx.type === 'expense' || newTx.type === 'transfer') {
      const sourceW = wallets.find((w) => w.id === newTx.sourceWalletId);
      if (sourceW) {
        if (sourceW.balance <= 0) {
          throw new Error(
            language === 'id'
              ? `Saldo dompet "${sourceW.name}" kosong atau kurang (${formatCurrency(sourceW.balance, sourceW.currency)}). Pengeluaran tidak dapat dilakukan dari dompet ini.`
              : `Wallet "${sourceW.name}" has zero or negative balance (${formatCurrency(sourceW.balance, sourceW.currency)}). Cannot make expenses.`
          );
        }
        if (newTx.amount > sourceW.balance) {
          throw new Error(
            language === 'id'
              ? `Nominal transaksi (${formatCurrency(newTx.amount, newTx.currency)}) melebihi sisa saldo dompet "${sourceW.name}" (${formatCurrency(sourceW.balance, sourceW.currency)}).`
              : `Transaction amount exceeds remaining balance in "${sourceW.name}".`
          );
        }
      }
    }

    // Update balances of associated wallets
    let updatedWalletsList: WalletAccount[] = [];
    setWallets((prevWallets) => {
      const updated = prevWallets.map((w) => {
        let newBalance = w.balance;
        if (newTx.type === 'expense' && w.id === newTx.sourceWalletId) {
          newBalance -= newTx.amount;
        } else if (newTx.type === 'income' && w.id === newTx.sourceWalletId) {
          newBalance += newTx.amount;
        } else if (newTx.type === 'transfer') {
          if (w.id === newTx.sourceWalletId) {
            newBalance -= newTx.amount;
          } else if (w.id === newTx.targetWalletId) {
            // Convert if wallets have different currencies
            const sourceW = prevWallets.find((x) => x.id === newTx.sourceWalletId);
            const sourceCurr = sourceW ? sourceW.currency : newTx.currency;
            const targetCurr = w.currency;
            const converted = convertCurrency(newTx.amount, sourceCurr, targetCurr, exchangeRates.rates);
            newBalance += converted;
          }
        }
        return { ...w, balance: newBalance };
      });
      updatedWalletsList = updated;
      return updated;
    });

    setTransactions((prev) => [newTx, ...prev].sort(sortTransactionsNewestFirst));

    // Push Notification trigger: check budget limits on expense transactions if enabled
    if (notificationPreferences.budgetAlerts && newTx.type === 'expense' && newTx.categoryId) {
      const category = categories.find((c) => c.id === newTx.categoryId);
      if (category && category.monthlyLimit > 0) {
        const currentMonthStr = newTx.date.substring(0, 7);
        const existingExpenses = transactions
          .filter((t) => t.type === 'expense' && t.categoryId === newTx.categoryId && t.date.startsWith(currentMonthStr))
          .reduce((sum, t) => sum + convertCurrency(t.amount, t.currency, baseCurrency, exchangeRates.rates), 0);
        const addedExpenseInBase = convertCurrency(newTx.amount, newTx.currency, baseCurrency, exchangeRates.rates);
        const totalSpent = existingExpenses + addedExpenseInBase;
        const limitInBase = category.monthlyLimit;
        const percentage = (totalSpent / limitInBase) * 100;

        if (percentage >= 80) {
          triggerBudgetAlertNotification(
            language === 'en' ? category.nameEn : category.name,
            percentage,
            formatCurrency(totalSpent, baseCurrency),
            formatCurrency(limitInBase, baseCurrency),
            language
          ).catch(console.warn);
        }
      }
    }

    // Push Notification trigger: check low balance warning on source wallet if enabled
    if (notificationPreferences.lowBalanceAlert && newTx.sourceWalletId && newTx.type !== 'income') {
      const sourceW = wallets.find((w) => w.id === newTx.sourceWalletId);
      if (sourceW) {
        const remaining = sourceW.balance - newTx.amount;
        const remainingInBase = convertCurrency(remaining, sourceW.currency, baseCurrency, exchangeRates.rates);
        const lowThresholdInBase = baseCurrency === 'IDR' ? 50000 : 5;
        if (remainingInBase <= lowThresholdInBase && remaining >= 0) {
          triggerLowBalanceNotification(
            sourceW.name,
            formatCurrency(remaining, sourceW.currency),
            language
          ).catch(console.warn);
        }
      }
    }

    // Sync to Firestore if authenticated
    if (user) {
      const txPath = `users/${user.uid}/transactions`;
      try {
        await setDoc(doc(db, txPath, newId), cleanFirestoreData(newTx));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, txPath);
      }

      // Persist updated wallet balances to Firestore
      const affectedWalletIds = [newTx.sourceWalletId, newTx.targetWalletId].filter(Boolean);
      for (const w of updatedWalletsList) {
        if (affectedWalletIds.includes(w.id)) {
          const wPath = `users/${user.uid}/wallets`;
          try {
            await setDoc(doc(db, wPath, w.id), cleanFirestoreData(w), { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, wPath);
          }
        }
      }
    }

    // Record audit log
    logActivity(
      newTx.type === 'transfer' ? 'TRANSFER' : 'CREATE',
      'TRANSACTION',
      newTx.type === 'transfer'
        ? `Transfer ${formatCurrency(newTx.amount, newTx.currency)}`
        : `Catat ${newTx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}: ${newTx.description || 'Transaksi'} (${formatCurrency(newTx.amount, newTx.currency)})`,
      { transactionId: newId, amount: newTx.amount, currency: newTx.currency, type: newTx.type }
    );
  };

  const updateTransaction = async (
    id: string,
    updatedData: Omit<Transaction, 'id' | 'userId' | 'createdAt'>
  ) => {
    const oldTx = transactions.find((t) => t.id === id);
    if (!oldTx) return;

    const updatedTx: Transaction = {
      ...updatedData,
      id,
      userId: user?.uid,
      createdAt: oldTx.createdAt || new Date().toISOString(),
    };

    // Validation: prevent expense or outgoing transfer if wallet balance after rollback is 0, negative, or insufficient
    if (updatedTx.type === 'expense' || updatedTx.type === 'transfer') {
      const sourceW = wallets.find((w) => w.id === updatedTx.sourceWalletId);
      if (sourceW) {
        let availableBalance = sourceW.balance;
        if (oldTx.type === 'expense' && oldTx.sourceWalletId === sourceW.id) {
          availableBalance += oldTx.amount;
        } else if (oldTx.type === 'transfer' && oldTx.sourceWalletId === sourceW.id) {
          availableBalance += oldTx.amount;
        }

        if (availableBalance <= 0) {
          throw new Error(
            language === 'id'
              ? `Saldo dompet "${sourceW.name}" kosong atau kurang. Pengeluaran tidak dapat dilakukan dari dompet ini.`
              : `Wallet "${sourceW.name}" has zero or negative balance.`
          );
        }
        if (updatedTx.amount > availableBalance) {
          throw new Error(
            language === 'id'
              ? `Nominal transaksi melebihi sisa saldo dompet "${sourceW.name}".`
              : `Transaction amount exceeds available balance in "${sourceW.name}".`
          );
        }
      }
    }

    // Recalculate wallet balances: rollback oldTx and apply updatedTx
    let updatedWalletsList: WalletAccount[] = [];
    setWallets((prevWallets) => {
      const updated = prevWallets.map((w) => {
        let newBalance = w.balance;

        // 1. Rollback old transaction impact
        if (oldTx.type === 'expense' && w.id === oldTx.sourceWalletId) {
          newBalance += oldTx.amount;
        } else if (oldTx.type === 'income' && w.id === oldTx.sourceWalletId) {
          newBalance -= oldTx.amount;
        } else if (oldTx.type === 'transfer') {
          if (w.id === oldTx.sourceWalletId) {
            newBalance += oldTx.amount;
          } else if (w.id === oldTx.targetWalletId) {
            const sourceW = prevWallets.find((x) => x.id === oldTx.sourceWalletId);
            const sourceCurr = sourceW ? sourceW.currency : oldTx.currency;
            const targetCurr = w.currency;
            const converted = convertCurrency(oldTx.amount, sourceCurr, targetCurr, exchangeRates.rates);
            newBalance -= converted;
          }
        }

        // 2. Apply new transaction impact
        if (updatedTx.type === 'expense' && w.id === updatedTx.sourceWalletId) {
          newBalance -= updatedTx.amount;
        } else if (updatedTx.type === 'income' && w.id === updatedTx.sourceWalletId) {
          newBalance += updatedTx.amount;
        } else if (updatedTx.type === 'transfer') {
          if (w.id === updatedTx.sourceWalletId) {
            newBalance -= updatedTx.amount;
          } else if (w.id === updatedTx.targetWalletId) {
            const sourceW = prevWallets.find((x) => x.id === updatedTx.sourceWalletId);
            const sourceCurr = sourceW ? sourceW.currency : updatedTx.currency;
            const targetCurr = w.currency;
            const converted = convertCurrency(updatedTx.amount, sourceCurr, targetCurr, exchangeRates.rates);
            newBalance += converted;
          }
        }

        return { ...w, balance: newBalance };
      });
      updatedWalletsList = updated;
      return updated;
    });

    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? updatedTx : t)).sort(sortTransactionsNewestFirst)
    );

    // Sync to Firestore
    if (user) {
      const txPath = `users/${user.uid}/transactions`;
      try {
        await setDoc(doc(db, txPath, id), cleanFirestoreData(updatedTx));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, txPath);
      }

      // Persist affected wallet balances to Firestore
      const affectedWalletIds = [
        oldTx.sourceWalletId,
        oldTx.targetWalletId,
        updatedTx.sourceWalletId,
        updatedTx.targetWalletId,
      ].filter(Boolean);

      for (const w of updatedWalletsList) {
        if (affectedWalletIds.includes(w.id)) {
          const wPath = `users/${user.uid}/wallets`;
          try {
            await setDoc(doc(db, wPath, w.id), cleanFirestoreData(w), { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, wPath);
          }
        }
      }
    }

    // Record audit log
    logActivity(
      'UPDATE',
      'TRANSACTION',
      `Ubah transaksi: ${updatedTx.description || updatedTx.id} (${formatCurrency(updatedTx.amount, updatedTx.currency)})`,
      { transactionId: id, oldAmount: oldTx.amount, newAmount: updatedTx.amount }
    );
  };

  const deleteTransaction = async (id: string) => {
    const txToDelete = transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    let updatedWalletsList: WalletAccount[] = [];
    // Rollback wallet balance
    setWallets((prevWallets) => {
      const updated = prevWallets.map((w) => {
        let newBalance = w.balance;
        if (txToDelete.type === 'expense' && w.id === txToDelete.sourceWalletId) {
          newBalance += txToDelete.amount;
        } else if (txToDelete.type === 'income' && w.id === txToDelete.sourceWalletId) {
          newBalance -= txToDelete.amount;
        } else if (txToDelete.type === 'transfer') {
          if (w.id === txToDelete.sourceWalletId) {
            newBalance += txToDelete.amount;
          } else if (w.id === txToDelete.targetWalletId) {
            const sourceW = prevWallets.find((x) => x.id === txToDelete.sourceWalletId);
            const sourceCurr = sourceW ? sourceW.currency : txToDelete.currency;
            const targetCurr = w.currency;
            const converted = convertCurrency(txToDelete.amount, sourceCurr, targetCurr, exchangeRates.rates);
            newBalance -= converted;
          }
        }
        return { ...w, balance: newBalance };
      });
      updatedWalletsList = updated;
      return updated;
    });

    setTransactions((prev) => prev.filter((t) => t.id !== id));

    if (user) {
      const txPath = `users/${user.uid}/transactions`;
      try {
        await deleteDoc(doc(db, txPath, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, txPath);
      }

      // Persist affected wallet balances to Firestore
      const affectedWalletIds = [txToDelete.sourceWalletId, txToDelete.targetWalletId].filter(Boolean);
      for (const w of updatedWalletsList) {
        if (affectedWalletIds.includes(w.id)) {
          const wPath = `users/${user.uid}/wallets`;
          try {
            await setDoc(doc(db, wPath, w.id), cleanFirestoreData(w), { merge: true });
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE, wPath);
          }
        }
      }
    }

    // Record audit log
    logActivity(
      'DELETE',
      'TRANSACTION',
      `Hapus transaksi: ${txToDelete.description || txToDelete.id} (${formatCurrency(txToDelete.amount, txToDelete.currency)})`,
      { transactionId: id, amount: txToDelete.amount, currency: txToDelete.currency }
    );
  };

  // Recurring Transaction CRUD & Auto-Execution Engine
  const persistRecurringItem = async (item: RecurringTransaction) => {
    if (!user) return;
    const recurringStorageKey = `${LOCAL_STORAGE_PREFIX}recurring_${user.uid}`;
    setRecurringTransactions((prev) => {
      const exists = prev.some((r) => r.id === item.id);
      const next = exists ? prev.map((r) => (r.id === item.id ? item : r)) : [...prev, item];
      next.sort((a, b) => (a.nextRunDate || '').localeCompare(b.nextRunDate || ''));
      localStorage.setItem(recurringStorageKey, JSON.stringify(next));
      return next;
    });

    const path = `users/${user.uid}/recurring_transactions`;
    try {
      await setDoc(doc(db, path, item.id), cleanFirestoreData(item), { merge: true });
    } catch (err) {
      console.warn('Recurring persist warning:', err);
    }
  };

  const addRecurringTransaction = async (
    ruleData: Omit<RecurringTransaction, 'id' | 'userId' | 'createdAt'>
  ) => {
    const newId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRule: RecurringTransaction = {
      ...ruleData,
      id: newId,
      userId: user?.uid || 'local_user',
      createdAt: new Date().toISOString(),
    };

    await persistRecurringItem(newRule);

    logActivity(
      'CREATE',
      'TRANSACTION',
      `Buat jadwal transaksi otomatis (${newRule.frequency}): ${newRule.description} (${formatCurrency(newRule.amount, newRule.currency)})`,
      { recurringId: newId, frequency: newRule.frequency, nextRunDate: newRule.nextRunDate }
    );
  };

  const updateRecurringTransaction = async (
    id: string,
    updatedData: Partial<Omit<RecurringTransaction, 'id' | 'userId' | 'createdAt'>>
  ) => {
    const existing = recurringTransactions.find((r) => r.id === id);
    if (!existing) return;

    const updatedRule: RecurringTransaction = {
      ...existing,
      ...updatedData,
      id,
      userId: user?.uid || existing.userId || 'local_user',
    };

    await persistRecurringItem(updatedRule);

    logActivity(
      'UPDATE',
      'TRANSACTION',
      `Perbarui jadwal transaksi otomatis: ${updatedRule.description}`,
      { recurringId: id, nextRunDate: updatedRule.nextRunDate, active: updatedRule.active }
    );
  };

  const deleteRecurringTransaction = async (id: string) => {
    const target = recurringTransactions.find((r) => r.id === id);
    if (!target) return;

    setRecurringTransactions((prev) => {
      const next = prev.filter((r) => r.id !== id);
      if (user) {
        localStorage.setItem(`${LOCAL_STORAGE_PREFIX}recurring_${user.uid}`, JSON.stringify(next));
      }
      return next;
    });

    if (user) {
      const path = `users/${user.uid}/recurring_transactions`;
      try {
        await deleteDoc(doc(db, path, id));
      } catch (err) {
        console.warn('Delete recurring warning:', err);
      }
    }

    logActivity(
      'DELETE',
      'TRANSACTION',
      `Hapus jadwal transaksi otomatis: ${target.description}`,
      { recurringId: id }
    );
  };

  const toggleRecurringTransaction = async (id: string) => {
    const existing = recurringTransactions.find((r) => r.id === id);
    if (!existing) return;
    await updateRecurringTransaction(id, { active: !existing.active });
  };

  const executeRecurringTransactionNow = async (id: string) => {
    const rule = recurringTransactions.find((r) => r.id === id);
    if (!rule) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const runDate = rule.nextRunDate <= todayStr ? rule.nextRunDate : todayStr;

    await addTransaction({
      date: runDate,
      amount: rule.amount,
      currency: rule.currency,
      type: rule.type,
      categoryId: rule.type !== 'transfer' ? rule.categoryId : undefined,
      sourceWalletId: rule.sourceWalletId,
      targetWalletId: rule.type === 'transfer' ? rule.targetWalletId : undefined,
      description: `${rule.description} (Otomatis)`,
      notes: rule.notes ? `${rule.notes} · [Jadwal Berulang]` : '[Jadwal Transaksi Berulang Otomatis]',
      recurringRuleId: rule.id,
    });

    const nextDate = calculateNextRecurringDate(runDate, rule.frequency);
    const shouldDeactivate = Boolean(rule.endDate && nextDate > rule.endDate);

    await updateRecurringTransaction(rule.id, {
      lastRunDate: runDate,
      nextRunDate: nextDate,
      active: shouldDeactivate ? false : rule.active,
    });
  };

  const isProcessingRecurringRef = useRef(false);

  const processDueRecurringTransactions = async (): Promise<number> => {
    if (isProcessingRecurringRef.current || wallets.length === 0 || recurringTransactions.length === 0) {
      return 0;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const dueRules = recurringTransactions.filter((r) => r.active && r.nextRunDate && r.nextRunDate <= todayStr);
    if (dueRules.length === 0) return 0;

    isProcessingRecurringRef.current = true;
    let executedCount = 0;

    try {
      for (const rule of dueRules) {
        const { dueDates, updatedNextRunDate, shouldDeactivate } = getDueRecurringOccurrences(rule, todayStr, 6);
        if (dueDates.length === 0) {
          if (shouldDeactivate) {
            await persistRecurringItem({ ...rule, active: false });
          }
          continue;
        }

        let lastSuccessfulDate = rule.lastRunDate;
        let haltedDueToBalance = false;
        let nextScheduledDate = updatedNextRunDate;

        for (const dueDate of dueDates) {
          // Idempotency guard: skip if a transaction for this rule & date already exists
          const alreadyCreated = transactions.some(
            (tx) => tx.recurringRuleId === rule.id && tx.date === dueDate
          );
          if (alreadyCreated) {
            lastSuccessfulDate = dueDate;
            continue;
          }

          // Check wallet balance before auto-executing expense/transfer
          if (rule.type === 'expense' || rule.type === 'transfer') {
            const sourceW = wallets.find((w) => w.id === rule.sourceWalletId);
            if (!sourceW || sourceW.balance <= 0 || sourceW.balance < rule.amount) {
              haltedDueToBalance = true;
              nextScheduledDate = dueDate;
              break;
            }
          }

          try {
            await addTransaction({
              date: dueDate,
              amount: rule.amount,
              currency: rule.currency,
              type: rule.type,
              categoryId: rule.type !== 'transfer' ? rule.categoryId : undefined,
              sourceWalletId: rule.sourceWalletId,
              targetWalletId: rule.type === 'transfer' ? rule.targetWalletId : undefined,
              description: `${rule.description} (Otomatis)`,
              notes: rule.notes ? `${rule.notes} · [Jadwal Berulang]` : '[Jadwal Transaksi Berulang Otomatis]',
              recurringRuleId: rule.id,
            });
            lastSuccessfulDate = dueDate;
            executedCount += 1;
          } catch (err) {
            console.warn('Auto-recurring execution skipped for rule:', rule.id, err);
            haltedDueToBalance = true;
            nextScheduledDate = dueDate;
            break;
          }
        }

        await persistRecurringItem({
          ...rule,
          lastRunDate: lastSuccessfulDate,
          nextRunDate: nextScheduledDate,
          active: !haltedDueToBalance && shouldDeactivate ? false : rule.active,
        });
      }
    } finally {
      isProcessingRecurringRef.current = false;
    }

    return executedCount;
  };

  // Automatically process any due recurring transactions when wallets & rules are ready
  useEffect(() => {
    if (!user || isAuthLoading || wallets.length === 0 || recurringTransactions.length === 0) {
      return;
    }
    const todayStr = new Date().toISOString().split('T')[0];
    const hasDue = recurringTransactions.some((r) => r.active && r.nextRunDate && r.nextRunDate <= todayStr);
    if (hasDue) {
      processDueRecurringTransactions().catch(console.warn);
    }
  }, [user, isAuthLoading, wallets.length, recurringTransactions]);

  // Wallet mutations
  const addWallet = async (walletData: Omit<WalletAccount, 'id'>) => {
    const newId = `w_${Date.now()}`;
    const newWallet: WalletAccount = {
      ...walletData,
      id: newId,
      userId: user?.uid,
      initialBalance: walletData.initialBalance ?? walletData.balance,
    };

    setWallets((prev) => [...prev, newWallet]);

    if (user) {
      const path = `users/${user.uid}/wallets`;
      try {
        await setDoc(doc(db, path, newId), cleanFirestoreData(newWallet));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    // Record audit log
    logActivity(
      'CREATE',
      'WALLET',
      `Tambah dompet baru: ${newWallet.name} (${formatCurrency(newWallet.balance, newWallet.currency)})`,
      { walletId: newId, name: newWallet.name, currency: newWallet.currency, balance: newWallet.balance }
    );
  };

  const updateWallet = async (
    id: string,
    updatedData: Omit<WalletAccount, 'id' | 'userId'>
  ) => {
    const existing = wallets.find((w) => w.id === id);
    if (!existing) return;

    const updatedWallet: WalletAccount = {
      ...existing,
      ...updatedData,
      id,
      userId: user?.uid,
    };

    setWallets((prev) => prev.map((w) => (w.id === id ? updatedWallet : w)));
    setSelectedWalletDetail((prev) => (prev && prev.id === id ? updatedWallet : prev));

    if (user) {
      const path = `users/${user.uid}/wallets`;
      try {
        await setDoc(doc(db, path, id), cleanFirestoreData(updatedWallet), { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    // Record audit log
    logActivity(
      'UPDATE',
      'WALLET',
      `Ubah data dompet: ${updatedWallet.name} (${formatCurrency(updatedWallet.balance, updatedWallet.currency)})`,
      { walletId: id, name: updatedWallet.name, balance: updatedWallet.balance }
    );
  };

  const deleteWallet = async (id: string) => {
    const walletToDelete = wallets.find((w) => w.id === id);
    setWallets((prev) => prev.filter((w) => w.id !== id));

    if (user) {
      const path = `users/${user.uid}/wallets`;
      try {
        await deleteDoc(doc(db, path, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }

    // Record audit log
    logActivity(
      'DELETE',
      'WALLET',
      `Hapus dompet: ${walletToDelete?.name || id}`,
      { walletId: id, name: walletToDelete?.name }
    );
  };

  const transferFunds = async (
    sourceId: string, 
    targetId: string, 
    amount: number, 
    currency: SupportedCurrency
  ) => {
    await addTransaction({
      date: new Date().toISOString().split('T')[0],
      amount,
      currency,
      type: 'transfer',
      sourceWalletId: sourceId,
      targetWalletId: targetId,
      description: 'Transfer Dana Antar-Dompet',
    });
  };

  // Budget limit mutation
  const updateBudgetLimit = async (categoryId: string, limit: number) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, monthlyLimit: limit } : c))
    );

    if (user) {
      const path = `users/${user.uid}/budgets`;
      try {
        await setDoc(doc(db, path, categoryId), cleanFirestoreData({
          categoryName: categoryId,
          monthlyLimit: limit,
          currency: baseCurrency,
          userId: user.uid,
        }));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    // Record audit log
    logActivity(
      'UPDATE',
      'BUDGET',
      `Perbarui pagu anggaran kategori ${categoryId}: ${formatCurrency(limit, baseCurrency)}/bulan`,
      { categoryId, limit }
    );
  };

  // Batch update multiple budget limits (used by Auto Budget)
  const batchUpdateBudgetLimits = async (limitsMap: Record<string, number>) => {
    const entries = Object.entries(limitsMap);
    if (entries.length === 0) return;

    setCategories((prev) =>
      prev.map((c) =>
        Object.prototype.hasOwnProperty.call(limitsMap, c.id)
          ? { ...c, monthlyLimit: limitsMap[c.id] }
          : c
      )
    );

    if (user) {
      const path = `users/${user.uid}/budgets`;
      for (const [categoryId, limit] of entries) {
        try {
          await setDoc(
            doc(db, path, categoryId),
            cleanFirestoreData({
              categoryName: categoryId,
              monthlyLimit: limit,
              currency: baseCurrency,
              userId: user.uid,
            })
          );
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        }
      }
    }

    logActivity(
      'UPDATE',
      'BUDGET',
      `Terapkan Auto Budget otomatis pada ${entries.length} kategori pengeluaran`,
      { updatedCount: entries.length, limitsMap }
    );
  };

  // Savings Goal mutations
  const addGoal = async (goalData: Omit<SavingsGoal, 'id' | 'currentAmount'>) => {
    const newId = `goal_${Date.now()}`;
    const newGoal: SavingsGoal = {
      ...goalData,
      id: newId,
      currentAmount: 0,
      userId: user?.uid,
    };

    setGoals((prev) => [...prev, newGoal]);

    if (user) {
      const path = `users/${user.uid}/goals`;
      try {
        await setDoc(doc(db, path, newId), cleanFirestoreData(newGoal));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    // Record audit log
    logActivity(
      'CREATE',
      'GOAL',
      `Tambah target tabungan: "${newGoal.title}" (${formatCurrency(newGoal.targetAmount, newGoal.currency)})`,
      { goalId: newId, title: newGoal.title, targetAmount: newGoal.targetAmount, currency: newGoal.currency }
    );
  };

  const contributeToGoal = async (goalId: string, walletId: string, amount: number) => {
    const goal = goals.find((g) => g.id === goalId);
    const wallet = wallets.find((w) => w.id === walletId);
    if (!goal || !wallet) return;

    // Convert amount from wallet currency to goal currency
    const convertedAmount = convertCurrency(amount, wallet.currency, goal.currency, exchangeRates.rates);

    // Update goal
    const updatedGoal = {
      ...goal,
      currentAmount: goal.currentAmount + convertedAmount,
    };
    setGoals((prev) => prev.map((g) => (g.id === goalId ? updatedGoal : g)));

    // Push notification trigger: check if goal target is achieved if enabled
    if (notificationPreferences.goalMilestones && updatedGoal.currentAmount >= updatedGoal.targetAmount && goal.currentAmount < goal.targetAmount) {
      triggerGoalAchievedNotification(
        goal.title,
        formatCurrency(updatedGoal.targetAmount, updatedGoal.currency),
        language
      ).catch(console.warn);
    }

    // Record as expense from wallet
    await addTransaction({
      date: new Date().toISOString().split('T')[0],
      amount,
      currency: wallet.currency,
      type: 'expense',
      categoryId: 'savings',
      sourceWalletId: walletId,
      description: `Tabungan: ${goal.title}`,
    });

    if (user) {
      const path = `users/${user.uid}/goals`;
      try {
        await setDoc(doc(db, path, goalId), cleanFirestoreData(updatedGoal));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    // Record audit log
    logActivity(
      'UPDATE',
      'GOAL',
      `Setor tabungan "${goal.title}": +${formatCurrency(amount, wallet.currency)}`,
      { goalId, walletId, amount, targetAmount: updatedGoal.targetAmount, currentAmount: updatedGoal.currentAmount }
    );
  };

  const deleteGoal = async (goalId: string) => {
    const existing = goals.find((g) => g.id === goalId);
    setGoals((prev) => prev.filter((g) => g.id !== goalId));

    if (user) {
      const path = `users/${user.uid}/goals`;
      try {
        await deleteDoc(doc(db, path, goalId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }

    if (existing) {
      logActivity(
        'DELETE',
        'GOAL',
        `Hapus target tabungan: "${existing.title}"`,
        { goalId, title: existing.title }
      );
    }
  };

  // Debt & Receivable mutations
  const addDebt = async (debtData: Omit<DebtRecord, 'id' | 'status' | 'paidAmount' | 'userId' | 'createdAt'>) => {
    const newId = `debt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newDebt: DebtRecord = {
      ...debtData,
      id: newId,
      paidAmount: 0,
      status: 'unpaid',
      userId: user?.uid || 'local_user',
      createdAt: new Date().toISOString(),
    };

    setDebts((prev) => {
      const next = [newDebt, ...prev];
      const storageKey = `${LOCAL_STORAGE_PREFIX}debts_${user?.uid || 'guest'}`;
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });

    if (user) {
      const path = `users/${user.uid}/debts`;
      try {
        await setDoc(doc(db, path, newId), cleanFirestoreData(newDebt));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    logActivity(
      'CREATE',
      'DEBT',
      `Catat ${newDebt.type === 'receivable' ? 'piutang' : 'utang'}: ${newDebt.personName} - "${newDebt.title}" (${formatCurrency(newDebt.amount, newDebt.currency)})`,
      { debtId: newId, ...newDebt }
    );
  };

  const settleDebt = async (debtId: string, walletId: string) => {
    const debt = debts.find((d) => d.id === debtId);
    const wallet = wallets.find((w) => w.id === walletId);
    if (!debt || debt.status === 'settled' || !wallet) return;

    const remainingInDebtCurr = Math.max(0, debt.amount - (debt.paidAmount || 0));
    const amountInWalletCurr = convertCurrency(
      remainingInDebtCurr,
      debt.currency,
      wallet.currency,
      exchangeRates.rates
    );

    // Record wallet transaction first (will throw if payable expense exceeds wallet balance)
    if (debt.type === 'receivable') {
      await addTransaction({
        date: new Date().toISOString().split('T')[0],
        amount: Math.round(amountInWalletCurr * 100) / 100,
        currency: wallet.currency,
        type: 'income',
        categoryId: 'other_income',
        sourceWalletId: wallet.id,
        description: `Pelunasan Piutang: ${debt.personName} (${debt.title})`,
      });
    } else {
      await addTransaction({
        date: new Date().toISOString().split('T')[0],
        amount: Math.round(amountInWalletCurr * 100) / 100,
        currency: wallet.currency,
        type: 'expense',
        categoryId: 'debt',
        sourceWalletId: wallet.id,
        description: `Pelunasan Utang: ${debt.personName} (${debt.title})`,
      });
    }

    const updatedDebt: DebtRecord = {
      ...debt,
      paidAmount: debt.amount,
      status: 'settled',
    };

    setDebts((prev) => {
      const next = prev.map((d) => (d.id === debtId ? updatedDebt : d));
      const storageKey = `${LOCAL_STORAGE_PREFIX}debts_${user?.uid || 'guest'}`;
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });

    if (user) {
      const path = `users/${user.uid}/debts`;
      try {
        await setDoc(doc(db, path, debtId), cleanFirestoreData(updatedDebt));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }

    logActivity(
      'UPDATE',
      'DEBT',
      `Tandai lunas ${debt.type === 'receivable' ? 'piutang' : 'utang'} "${debt.title}" (${debt.personName})`,
      { debtId, walletId, amount: debt.amount }
    );
  };

  const deleteDebt = async (debtId: string) => {
    const existing = debts.find((d) => d.id === debtId);
    setDebts((prev) => {
      const next = prev.filter((d) => d.id !== debtId);
      const storageKey = `${LOCAL_STORAGE_PREFIX}debts_${user?.uid || 'guest'}`;
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });

    if (user) {
      const path = `users/${user.uid}/debts`;
      try {
        await deleteDoc(doc(db, path, debtId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    }

    if (existing) {
      logActivity(
        'DELETE',
        'DEBT',
        `Hapus catatan ${existing.type === 'receivable' ? 'piutang' : 'utang'}: ${existing.personName} - "${existing.title}"`,
        { debtId }
      );
    }
  };

  // Export functions (hardened against CSV Formula Injection & signed with Integrity Checksum)
  const exportCSV = () => {
    const headers = ['ID', 'Date', 'Type', 'Amount', 'Currency', 'Category', 'Source Wallet', 'Target Wallet', 'Description', 'Notes'];
    const rows = transactions.map((t) => [
      sanitizeCsvCell(t.id),
      sanitizeCsvCell(t.date),
      sanitizeCsvCell(t.type),
      t.amount,
      sanitizeCsvCell(t.currency),
      sanitizeCsvCell(t.categoryId || '-'),
      sanitizeCsvCell(wallets.find((w) => w.id === t.sourceWalletId)?.name || t.sourceWalletId),
      sanitizeCsvCell(wallets.find((w) => w.id === t.targetWalletId)?.name || t.targetWalletId || '-'),
      sanitizeCsvCell(t.description || ''),
      sanitizeCsvCell(t.notes || ''),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FinBag_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    logActivity('CREATE', 'SECURITY', `Ekspor data transaksi CSV (${transactions.length} baris)`, {});
  };

  const exportJSON = () => {
    const integrityChecksum = computeBackupChecksum({
      wallets,
      transactions,
      recurringTransactions,
      goals,
      debts,
    });

    const backupData = {
      version: '1.2',
      exportedAt: new Date().toISOString(),
      integrityChecksum,
      wallets,
      transactions,
      recurringTransactions,
      categories,
      goals,
      debts,
      preferences: { language, baseCurrency, theme },
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `FinBag_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    logActivity('CREATE', 'SECURITY', 'Ekspor cadangan JSON terverifikasi checksum', {
      wallets: wallets.length,
      transactions: transactions.length,
    });
  };

  const importJSON = (jsonString: string): boolean => {
    const validation = validateAndSanitizeBackupJSON(jsonString);
    if (!validation.valid || !validation.data) {
      return false;
    }

    const {
      wallets: safeWallets,
      transactions: safeTxs,
      recurringTransactions: safeRec,
      goals: safeGoals,
      debts: safeDebts,
    } = validation.data;

    if (safeWallets.length > 0) setWallets(safeWallets);
    if (safeTxs.length > 0) setTransactions(safeTxs);
    if (safeRec.length > 0) setRecurringTransactions(safeRec);
    if (safeGoals.length > 0) setGoals(safeGoals);
    if (safeDebts.length > 0) setDebts(safeDebts);

    // Persist validated entities to Firestore if user is authenticated
    if (user) {
      const uid = user.uid;
      safeWallets.forEach((w) => {
        setDoc(doc(db, `users/${uid}/wallets`, w.id), cleanFirestoreData({ ...w, userId: uid })).catch(console.warn);
      });
      safeTxs.forEach((tx) => {
        setDoc(doc(db, `users/${uid}/transactions`, tx.id), cleanFirestoreData({ ...tx, userId: uid })).catch(console.warn);
      });
      safeRec.forEach((rec) => {
        setDoc(doc(db, `users/${uid}/recurring_transactions`, rec.id), cleanFirestoreData({ ...rec, userId: uid })).catch(console.warn);
      });
      safeGoals.forEach((g) => {
        setDoc(doc(db, `users/${uid}/goals`, g.id), cleanFirestoreData({ ...g, userId: uid })).catch(console.warn);
      });
      safeDebts.forEach((d) => {
        setDoc(doc(db, `users/${uid}/debts`, d.id), cleanFirestoreData({ ...d, userId: uid })).catch(console.warn);
      });
    }

    logActivity(
      'UPDATE',
      'SECURITY',
      `Impor cadangan JSON tervalidasi (${safeWallets.length} dompet, ${safeTxs.length} transaksi)`,
      { checksumVerified: validation.checksumVerified }
    );
    return true;
  };

  const clearAllDatabaseData = async () => {
    if (!user) return;
    const userId = user.uid;

    try {
      const walletsSnap = await getDocs(collection(db, `users/${userId}/wallets`));
      for (const d of walletsSnap.docs) {
        await deleteDoc(d.ref);
      }

      const txsSnap = await getDocs(collection(db, `users/${userId}/transactions`));
      for (const d of txsSnap.docs) {
        await deleteDoc(d.ref);
      }

      const goalsSnap = await getDocs(collection(db, `users/${userId}/goals`));
      for (const d of goalsSnap.docs) {
        await deleteDoc(d.ref);
      }

      const debtsSnap = await getDocs(collection(db, `users/${userId}/debts`));
      for (const d of debtsSnap.docs) {
        await deleteDoc(d.ref);
      }

      setWallets([]);
      setTransactions([]);
      setGoals([]);
      setDebts([]);

      // Record audit log
      logActivity(
        'CLEAR',
        'DATABASE',
        'Pengosongan seluruh data dompet, transaksi, utang/piutang, dan target tabungan database cloud',
        { timestamp: new Date().toISOString() }
      );
    } catch (err) {
      console.error('Error clearing database data:', err);
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        user,
        currentUserProfile,
        allUsers,
        isLoadingUsers,
        refreshUsers,
        toggleUserStatus,
        deleteUserProfile,
        isAdmin,
        isAuthLoading,
        notificationPermission,
        requestNotifications,
        sendTestNotification,
        notificationPreferences,
        updateNotificationPreferences,
        triggerCategoryNotificationTest,
        loginWithGoogle,
        logout,
        announcementNotice,
        announcementExpiry,
        setAnnouncementNotice,
        clearAnnouncementExpiry,
        language,
        setLanguage,
        baseCurrency,
        setBaseCurrency,
        theme,
        toggleTheme,
        appPin,
        isAppUnlocked,
        isPinVerifiedForSession,
        isBiometricStepRequired,
        biometricConfig,
        pinAttemptState,
        setAppPin,
        verifyCurrentPin,
        unlockApp,
        verifyBiometricUnlock,
        registerBiometric,
        removeBiometric,
        setBiometricMobileOnly,
        lockApp,
        autoLockMinutes,
        setAutoLockMinutes,
        lockOnTabHidden,
        setLockOnTabHidden,
        isPrivacyMode,
        togglePrivacyMode,
        activeTab,
        setActiveTab,
        isTransactionModalOpen,
        setIsTransactionModalOpen,
        isAddWalletModalOpen,
        setIsAddWalletModalOpen,
        editingWallet,
        setEditingWallet,
        openEditWallet,
        openAddWallet,
        editingTransaction,
        setEditingTransaction,
        openEditTransaction,
        isOnboardingOpen,
        setIsOnboardingOpen,
        openTutorial,
        selectedWalletDetail,
        setSelectedWalletDetail,
        openWalletDetail,
        closeWalletDetail,
        preselectedWalletId,
        setPreselectedWalletId,
        openAddTransactionWithWallet,
        wallets,
        transactions,
        recurringTransactions,
        categories,
        goals,
        debts,
        exchangeRates,
        isRatesLoading,
        refreshExchangeRates,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        toggleRecurringTransaction,
        executeRecurringTransactionNow,
        processDueRecurringTransactions,
        addWallet,
        updateWallet,
        deleteWallet,
        transferFunds,
        updateBudgetLimit,
        batchUpdateBudgetLimits,
        addGoal,
        contributeToGoal,
        deleteGoal,
        addDebt,
        settleDebt,
        deleteDebt,
        auditLogs,
        logActivity,
        exportCSV,
        exportJSON,
        importJSON,
        clearAllDatabaseData,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
