import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  SupportedCurrency, 
  SupportedLanguage, 
  WalletAccount, 
  Transaction, 
  BudgetCategory, 
  SavingsGoal 
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

interface FinanceContextType {
  // User & Auth
  user: User | null;
  isAuthLoading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;

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
  activeTab: 'dashboard' | 'wallets' | 'rates' | 'tools' | 'budgets' | 'transactions';
  setActiveTab: (tab: 'dashboard' | 'wallets' | 'rates' | 'tools' | 'budgets' | 'transactions') => void;
  isTransactionModalOpen: boolean;
  setIsTransactionModalOpen: (open: boolean) => void;
  isAddWalletModalOpen: boolean;
  setIsAddWalletModalOpen: (open: boolean) => void;

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
  deleteTransaction: (id: string) => Promise<void>;
  addWallet: (wallet: Omit<WalletAccount, 'id'>) => Promise<void>;
  transferFunds: (sourceId: string, targetId: string, amount: number, currency: SupportedCurrency) => Promise<void>;
  updateBudgetLimit: (categoryId: string, limit: number) => Promise<void>;
  addGoal: (goal: Omit<SavingsGoal, 'id' | 'currentAmount'>) => Promise<void>;
  contributeToGoal: (goalId: string, walletId: string, amount: number) => Promise<void>;

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

  // Security PIN
  const [appPin, setAppPinState] = useState<string | null>(() => {
    return localStorage.getItem(`${LOCAL_STORAGE_PREFIX}pin`) || null;
  });
  const [isAppUnlocked, setIsAppUnlocked] = useState<boolean>(() => !localStorage.getItem(`${LOCAL_STORAGE_PREFIX}pin`));

  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'wallets' | 'rates' | 'tools' | 'budgets' | 'transactions'>('dashboard');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isAddWalletModalOpen, setIsAddWalletModalOpen] = useState(false);

  // Financial Data - strictly empty initial state directly loaded from user database
  const [wallets, setWallets] = useState<WalletAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>(() => {
    const saved = localStorage.getItem(`${LOCAL_STORAGE_PREFIX}categories`);
    return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
  });
  const [goals, setGoals] = useState<SavingsGoal[]>([]);

  // Purge any legacy dummy data from localStorage
  useEffect(() => {
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}wallets`);
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}transactions`);
    localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}goals`);
  }, []);

  // FX Rates
  const [exchangeRates, setExchangeRates] = useState<RatesData>({
    base: 'USD',
    rates: FALLBACK_RATES_FROM_USD,
    lastUpdated: 'Loading...',
  });
  const [isRatesLoading, setIsRatesLoading] = useState(false);

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

  // PIN Lock handlers
  const setAppPin = (pin: string | null) => {
    setAppPinState(pin);
    if (pin) {
      localStorage.setItem(`${LOCAL_STORAGE_PREFIX}pin`, pin);
      setIsAppUnlocked(true);
    } else {
      localStorage.removeItem(`${LOCAL_STORAGE_PREFIX}pin`);
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
    if (!user) return;

    const userId = user.uid;

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

    return () => {
      unsubscribeWallets();
      unsubscribeTxs();
      unsubscribeGoals();
    };
  }, [user]);

  // Auth methods
  const loginWithGoogle = async () => {
    await fbLoginWithGoogle();
  };

  const logout = async () => {
    await fbLogoutUser();
    setUser(null);
    setWallets([]);
    setTransactions([]);
    setGoals([]);
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

    // Update balances of associated wallets
    setWallets((prevWallets) => {
      return prevWallets.map((w) => {
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
    });

    setTransactions((prev) => [newTx, ...prev]);

    // Sync to Firestore if authenticated
    if (user) {
      const txPath = `users/${user.uid}/transactions`;
      try {
        await setDoc(doc(db, txPath, newId), cleanFirestoreData(newTx));
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, txPath);
      }
    }
  };

  const deleteTransaction = async (id: string) => {
    const txToDelete = transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    // Rollback wallet balance
    setWallets((prevWallets) => {
      return prevWallets.map((w) => {
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
    });

    setTransactions((prev) => prev.filter((t) => t.id !== id));

    if (user) {
      const txPath = `users/${user.uid}/transactions`;
      try {
        await deleteDoc(doc(db, txPath, id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, txPath);
      }
    }
  };

  // Wallet mutations
  const addWallet = async (walletData: Omit<WalletAccount, 'id'>) => {
    const newId = `w_${Date.now()}`;
    const newWallet: WalletAccount = {
      ...walletData,
      id: newId,
      userId: user?.uid,
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
    } catch (err) {
      console.error('Error clearing database data:', err);
    }
  };

  return (
    <FinanceContext.Provider
      value={{
        user,
        isAuthLoading,
        loginWithGoogle,
        logout,
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
        wallets,
        transactions,
        categories,
        goals,
        exchangeRates,
        isRatesLoading,
        refreshExchangeRates,
        addTransaction,
        deleteTransaction,
        addWallet,
        transferFunds,
        updateBudgetLimit,
        addGoal,
        contributeToGoal,
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
