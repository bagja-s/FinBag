import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { 
  SupportedCurrency, 
  SupportedLanguage, 
  WalletAccount, 
  Transaction, 
  BudgetCategory, 
  SavingsGoal,
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
import { formatCurrency } from '../utils/financeCalculations';

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

  // Security Lock
  appPin: string | null;
  isAppUnlocked: boolean;
  setAppPin: (pin: string | null) => void;
  unlockApp: (enteredPin: string) => boolean;
  lockApp: () => void;

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
  categories: BudgetCategory[];
  goals: SavingsGoal[];
  exchangeRates: RatesData;
  isRatesLoading: boolean;
  refreshExchangeRates: () => Promise<void>;

  // Actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, updatedTx: Omit<Transaction, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addWallet: (wallet: Omit<WalletAccount, 'id'>) => Promise<void>;
  updateWallet: (id: string, updated: Omit<WalletAccount, 'id' | 'userId'>) => Promise<void>;
  deleteWallet: (id: string) => Promise<void>;
  transferFunds: (sourceId: string, targetId: string, amount: number, currency: SupportedCurrency) => Promise<void>;
  updateBudgetLimit: (categoryId: string, limit: number) => Promise<void>;
  addGoal: (goal: Omit<SavingsGoal, 'id' | 'currentAmount'>) => Promise<void>;
  contributeToGoal: (goalId: string, walletId: string, amount: number) => Promise<void>;

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

  // Security PIN (per-account, loaded after user auth)
  const [appPin, setAppPinState] = useState<string | null>(null);
  const [isAppUnlocked, setIsAppUnlocked] = useState<boolean>(true);

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
  const [categories, setCategories] = useState<BudgetCategory[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}categories`);
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Purge any legacy dummy data from localStorage
  useEffect(() => {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}wallets`);
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}transactions`);
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}goals`);
  }, []);

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

  // PIN Lock handlers
  const setAppPin = (pin: string | null) => {
    setAppPinState(pin);
    if (!user) return;
    const userPinKey = `${LOCAL_STORAGE_PREFIX}pin_${user.uid}`;
    if (pin) {
      localStorage.setItem(userPinKey, pin);
      setIsAppUnlocked(true);
    } else {
      localStorage.removeItem(userPinKey);
      setIsAppUnlocked(true);
    }
  };

  const unlockApp = (enteredPin: string): boolean => {
    if (!appPin || enteredPin === appPin) {
      setIsAppUnlocked(true);
      return true;
    }
    return false;
  };

  const lockApp = () => {
    if (appPin) {
      setIsAppUnlocked(false);
    }
  };

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

    // Load account-specific PIN and migrate legacy global key
    const userPinKey = `${LOCAL_STORAGE_PREFIX}pin_${userId}`;
    const legacyPinKey = `${LOCAL_STORAGE_PREFIX}pin`;
    const legacyPin = localStorage.getItem(legacyPinKey);
    if (legacyPin && !localStorage.getItem(userPinKey)) {
      // Migrate legacy global PIN to this user's scoped key
      localStorage.setItem(userPinKey, legacyPin);
    }
    localStorage.removeItem(legacyPinKey); // Always purge legacy key
    const savedPin = localStorage.getItem(userPinKey);
    setAppPinState(savedPin);
    setIsAppUnlocked(!savedPin); // Lock if PIN exists

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
        cloudTxs.sort((a, b) => b.date.localeCompare(a.date));
        setTransactions(cloudTxs);
      },
      (error) => handleFirestoreError(error, OperationType.GET, txsPath)
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
      unsubscribeGoals();
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
    setGoals([]);
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

    setTransactions((prev) => [newTx, ...prev]);

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

    setTransactions((prev) => prev.map((t) => (t.id === id ? updatedTx : t)));

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
      ...updatedData,
      id,
      userId: user?.uid,
    };

    setWallets((prev) => prev.map((w) => (w.id === id ? updatedWallet : w)));

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

  // Export functions
  const exportCSV = () => {
    const headers = ['ID', 'Date', 'Type', 'Amount', 'Currency', 'Category', 'Source Wallet', 'Target Wallet', 'Description', 'Notes'];
    const rows = transactions.map((t) => [
      t.id,
      t.date,
      t.type,
      t.amount,
      t.currency,
      t.categoryId || '-',
      wallets.find((w) => w.id === t.sourceWalletId)?.name || t.sourceWalletId,
      wallets.find((w) => w.id === t.targetWalletId)?.name || t.targetWalletId || '-',
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `FinBag_Transactions_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      wallets,
      transactions,
      categories,
      goals,
      preferences: { language, baseCurrency, theme },
    };

    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `FinBag_Backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importJSON = (jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString);
      if (parsed.wallets && Array.isArray(parsed.wallets)) {
        setWallets(parsed.wallets);
      }
      if (parsed.transactions && Array.isArray(parsed.transactions)) {
        setTransactions(parsed.transactions);
      }
      if (parsed.categories && Array.isArray(parsed.categories)) {
        setCategories(parsed.categories);
      }
      if (parsed.goals && Array.isArray(parsed.goals)) {
        setGoals(parsed.goals);
      }
      return true;
    } catch (e) {
      console.error('Failed to parse backup JSON:', e);
      return false;
    }
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

      setWallets([]);
      setTransactions([]);
      setGoals([]);

      // Record audit log
      logActivity(
        'CLEAR',
        'DATABASE',
        'Pengosongan seluruh data dompet, transaksi, dan target tabungan database cloud',
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
        setAppPin,
        unlockApp,
        lockApp,
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
        categories,
        goals,
        exchangeRates,
        isRatesLoading,
        refreshExchangeRates,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addWallet,
        updateWallet,
        deleteWallet,
        transferFunds,
        updateBudgetLimit,
        addGoal,
        contributeToGoal,
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
