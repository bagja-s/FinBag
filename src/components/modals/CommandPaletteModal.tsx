import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency } from '../../utils/financeCalculations';
import {
  Search,
  X,
  Plus,
  Wallet,
  ArrowLeftRight,
  LayoutDashboard,
  PieChart,
  History,
  Wrench,
  Settings,
  TrendingUp,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Lock,
  CornerDownLeft,
  CreditCard,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { backdropVariants, modalSpringVariants } from '../../utils/motionVariants';

interface CommandActionItem {
  id: string;
  group: 'actions' | 'wallets' | 'transactions' | 'navigation';
  title: string;
  subtitle?: string;
  badge?: string;
  icon: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
}

export const CommandPaletteModal: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    wallets,
    transactions,
    language,
    setActiveTab,
    setIsTransactionModalOpen,
    openAddWallet,
    openWalletDetail,
    openEditTransaction,
    theme,
    toggleTheme,
    isPrivacyMode,
    togglePrivacyMode,
    appPin,
    lockApp,
  } = useFinance();

  const t = getTranslation(language);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
    }
  }, [isCommandPaletteOpen]);

  const handleClose = () => {
    setIsCommandPaletteOpen(false);
  };

  const allItems = useMemo<CommandActionItem[]>(() => {
    const items: CommandActionItem[] = [
      // Quick Actions
      {
        id: 'act_add_tx',
        group: 'actions',
        title: language === 'id' ? 'Catat Transaksi Baru (Pengeluaran / Pemasukan)' : 'Record New Transaction (Expense / Income)',
        subtitle: language === 'id' ? 'Aksi Cepat' : 'Quick Action',
        badge: '+ Tx',
        icon: Plus,
        onSelect: () => {
          handleClose();
          setIsTransactionModalOpen(true);
        },
      },
      {
        id: 'act_add_wallet',
        group: 'actions',
        title: language === 'id' ? 'Tambah Dompet / Rekening / Kartu Kredit Baru' : 'Add New Wallet / Account / Credit Card',
        subtitle: language === 'id' ? 'Aksi Cepat' : 'Quick Action',
        badge: '+ Wallet',
        icon: Wallet,
        onSelect: () => {
          handleClose();
          openAddWallet();
        },
      },
      {
        id: 'act_privacy',
        group: 'actions',
        title: isPrivacyMode
          ? language === 'id'
            ? 'Matikan Mode Privasi (Tampilkan Nominal Saldo)'
            : 'Disable Privacy Mode (Show Balances)'
          : language === 'id'
          ? 'Aktifkan Mode Privasi (Sensor Nominal Rp •••••••)'
          : 'Enable Privacy Mode (Mask Balances)',
        subtitle: language === 'id' ? 'Keamanan & Privasi' : 'Security & Privacy',
        icon: isPrivacyMode ? Eye : EyeOff,
        onSelect: () => {
          togglePrivacyMode();
          handleClose();
        },
      },
      {
        id: 'act_theme',
        group: 'actions',
        title:
          theme === 'dark'
            ? language === 'id'
              ? 'Ganti ke Tema Terang (Light Mode)'
              : 'Switch to Light Theme'
            : language === 'id'
            ? 'Ganti ke Tema Gelap (Dark Mode)'
            : 'Switch to Dark Theme',
        subtitle: language === 'id' ? 'Tampilan' : 'Appearance',
        icon: theme === 'dark' ? Sun : Moon,
        onSelect: () => {
          toggleTheme();
          handleClose();
        },
      },
    ];

    if (appPin) {
      items.push({
        id: 'act_lock',
        group: 'actions',
        title: language === 'id' ? 'Kunci Aplikasi Sekarang (PIN Lock)' : 'Lock Application Now (PIN Lock)',
        subtitle: language === 'id' ? 'Keamanan' : 'Security',
        icon: Lock,
        onSelect: () => {
          handleClose();
          lockApp();
        },
      });
    }

    // Wallets
    wallets.forEach((w) => {
      items.push({
        id: `wallet_${w.id}`,
        group: 'wallets',
        title: w.name,
        subtitle: `${w.type.toUpperCase()}${w.excludeFromNetWorth ? (language === 'id' ? ' · Dikecualikan dari Net Worth' : ' · Excluded from Net Worth') : ''}`,
        badge: formatCurrency(w.balance, w.currency),
        icon: w.type === 'credit' ? CreditCard : Wallet,
        onSelect: () => {
          handleClose();
          openWalletDetail(w);
        },
      });
    });

    // Recent or Matching Transactions (up to 30)
    transactions.slice(0, 40).forEach((tx) => {
      items.push({
        id: `tx_${tx.id}`,
        group: 'transactions',
        title: tx.description,
        subtitle: `${tx.date}${tx.notes ? ` · ${tx.notes}` : ''}`,
        badge: `${tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}${formatCurrency(tx.amount, tx.currency)}`,
        icon: tx.type === 'income' ? ArrowDownLeft : tx.type === 'expense' ? ArrowUpRight : ArrowLeftRight,
        onSelect: () => {
          handleClose();
          openEditTransaction(tx);
        },
      });
    });

    // Navigation
    const navItems: { id: string; tab: 'dashboard' | 'wallets' | 'budgets' | 'transactions' | 'rates' | 'tools' | 'settings'; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { id: 'nav_dash', tab: 'dashboard', label: t.navDashboard, icon: LayoutDashboard },
      { id: 'nav_wallets', tab: 'wallets', label: t.navWallets, icon: Wallet },
      { id: 'nav_budgets', tab: 'budgets', label: t.navBudgets, icon: PieChart },
      { id: 'nav_txs', tab: 'transactions', label: t.navTransactions, icon: History },
      { id: 'nav_rates', tab: 'rates', label: t.navRates, icon: TrendingUp },
      { id: 'nav_tools', tab: 'tools', label: t.navTools, icon: Wrench },
      { id: 'nav_settings', tab: 'settings', label: t.settingsTitle, icon: Settings },
    ];

    navItems.forEach((n) => {
      items.push({
        id: n.id,
        group: 'navigation',
        title: `${language === 'id' ? 'Buka Menu' : 'Go to'}: ${n.label}`,
        subtitle: language === 'id' ? 'Navigasi Halaman' : 'Page Navigation',
        icon: n.icon,
        onSelect: () => {
          setActiveTab(n.tab);
          handleClose();
        },
      });
    });

    return items;
  }, [
    language,
    isPrivacyMode,
    theme,
    appPin,
    wallets,
    transactions,
    t,
    setIsTransactionModalOpen,
    openAddWallet,
    togglePrivacyMode,
    toggleTheme,
    lockApp,
    openWalletDetail,
    openEditTransaction,
    setActiveTab,
  ]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show top actions, wallets, and navigation when query is empty
      return allItems.filter((item) => item.group !== 'transactions').slice(0, 14);
    }
    return allItems
      .filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
          (item.badge && item.badge.toLowerCase().includes(q))
      )
      .slice(0, 18);
  }, [allItems, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0
      );
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].onSelect();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isCommandPaletteOpen && (
        <motion.div
          key="cmd-palette-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 pt-14 sm:pt-24 px-4 backdrop-blur-[2px]"
        >
          <div className="fixed inset-0" onClick={handleClose} aria-hidden="true" />

          <motion.div
            key="cmd-palette-dialog"
            variants={modalSpringVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onKeyDown={handleKeyDown}
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
            role="dialog"
            aria-modal="true"
            aria-label="Command Palette"
          >
            {/* Search Input Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 dark:border-slate-800">
              <Search className="h-4 w-4 shrink-0 text-blue-500" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  language === 'id'
                    ? 'Cari dompet, transaksi, atau ketik perintah cepat...'
                    : 'Search wallets, transactions, or type a quick command...'
                }
                className="w-full bg-transparent text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none dark:text-white"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* Results List */}
            <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
              {filteredItems.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  {language === 'id'
                    ? `Tidak ditemukan hasil untuk "${query}"`
                    : `No results found for "${query}"`}
                </div>
              ) : (
                filteredItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onMouseEnter={() => setSelectedIndex(idx)}
                      onClick={item.onSelect}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isActive
                              ? 'bg-blue-600 text-white shadow-xs'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{item.title}</p>
                          {item.subtitle && (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {item.badge && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300 tabular-nums">
                            {item.badge}
                          </span>
                        )}
                        {isActive && <CornerDownLeft className="h-3.5 w-3.5 text-blue-500" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer Hints */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-2 text-[10px] text-slate-400 dark:border-slate-800 dark:bg-slate-900/60">
              <span>
                {language === 'id'
                  ? 'Gunakan ↑↓ untuk navigasi · Enter untuk memilih'
                  : 'Use ↑↓ to navigate · Enter to select'}
              </span>
              <span className="font-mono font-semibold">Ctrl + K</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
