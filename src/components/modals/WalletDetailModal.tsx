import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency } from '../../utils/financeCalculations';
import { convertCurrency } from '../../services/currencyService';
import { Transaction } from '../../types/finance';
import { 
  X, 
  Wallet, 
  Building2, 
  Coins, 
  CreditCard, 
  PiggyBank, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Search, 
  Plus, 
  Edit3, 
  AlertCircle, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { modalSpringVariants, backdropVariants } from '../../utils/motionVariants';

export const WalletDetailModal: React.FC = () => {
  const { 
    selectedWalletDetail, 
    closeWalletDetail, 
    openEditWallet,
    openEditTransaction,
    openAddTransactionWithWallet,
    transactions,
    wallets,
    categories,
    baseCurrency,
    exchangeRates,
    language 
  } = useFinance();

  const t = getTranslation(language);

  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense' | 'transfer'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const wallet = selectedWalletDetail;

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'bank': return Building2;
      case 'cash': return Coins;
      case 'credit': return CreditCard;
      case 'investment': return PiggyBank;
      default: return Wallet;
    }
  };

  // Filter all transactions associated with this wallet (as source or target)
  const walletMutations = useMemo(() => {
    if (!wallet) return [];
    return transactions.filter(
      (tx) => tx.sourceWalletId === wallet.id || tx.targetWalletId === wallet.id
    );
  }, [wallet, transactions]);

  // Compute metrics for this wallet
  const stats = useMemo(() => {
    if (!wallet) return { totalIn: 0, totalOut: 0, count: 0 };
    let totalIn = 0;
    let totalOut = 0;

    walletMutations.forEach((tx) => {
      if (tx.type === 'income' && tx.sourceWalletId === wallet.id) {
        totalIn += tx.amount;
      } else if (tx.type === 'expense' && tx.sourceWalletId === wallet.id) {
        totalOut += tx.amount;
      } else if (tx.type === 'transfer') {
        if (tx.sourceWalletId === wallet.id) {
          totalOut += tx.amount;
        } else if (tx.targetWalletId === wallet.id) {
          // Converted transfer amount if currencies differ
          const converted = convertCurrency(tx.amount, tx.currency, wallet.currency, exchangeRates.rates);
          totalIn += converted;
        }
      }
    });

    return { totalIn, totalOut, count: walletMutations.length };
  }, [wallet, walletMutations, exchangeRates.rates]);

  // Filtered mutations based on tab & search
  const filteredMutations = useMemo(() => {
    return walletMutations.filter((tx) => {
      // Tab filter
      if (activeFilter === 'income') {
        const isIncome = tx.type === 'income' || (tx.type === 'transfer' && tx.targetWalletId === wallet?.id);
        if (!isIncome) return false;
      } else if (activeFilter === 'expense') {
        const isExpense = tx.type === 'expense' || (tx.type === 'transfer' && tx.sourceWalletId === wallet?.id);
        if (!isExpense) return false;
      } else if (activeFilter === 'transfer') {
        if (tx.type !== 'transfer') return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = tx.description?.toLowerCase().includes(q);
        const notesMatch = tx.notes?.toLowerCase().includes(q);
        const catObj = categories.find((c) => c.id === tx.categoryId);
        const catMatch = catObj && (catObj.name.toLowerCase().includes(q) || catObj.nameEn.toLowerCase().includes(q));
        if (!descMatch && !notesMatch && !catMatch) return false;
      }

      return true;
    });
  }, [walletMutations, activeFilter, searchQuery, categories, wallet?.id]);

  if (!wallet || typeof document === 'undefined') return null;

  const Icon = getWalletIcon(wallet.type);
  const isBalanceZeroOrNegative = wallet.balance <= 0;
  const convertedToBase = convertCurrency(wallet.balance, wallet.currency, baseCurrency, exchangeRates.rates);

  const handleRecordTxClick = () => {
    closeWalletDetail();
    // If balance is 0 or less, open with income to top up, otherwise expense
    openAddTransactionWithWallet(wallet.id, isBalanceZeroOrNegative ? 'income' : 'expense');
  };

  const handleEditWalletClick = () => {
    closeWalletDetail();
    openEditWallet(wallet);
  };

  const handleEditMutation = (tx: Transaction) => {
    closeWalletDetail();
    openEditTransaction(tx);
  };

  return createPortal(
    <AnimatePresence>
      {selectedWalletDetail && (
        <motion.div
          key="wallet-detail-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-[2px]"
        >
          {/* Backdrop click dismiss */}
          <div 
            className="fixed inset-0"
            onClick={closeWalletDetail}
            aria-hidden="true"
          />

          <motion.div
            key="wallet-detail-dialog"
            variants={modalSpringVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{ willChange: 'transform, opacity' }}
            className="relative z-10 w-full max-w-xl rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] flex flex-col"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div 
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white shadow-md"
                  style={{ backgroundColor: wallet.color || '#3B82F6' }}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                      {wallet.name}
                    </h2>
                    <span className="rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-mono font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {wallet.currency}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    <span>
                      {wallet.type === 'bank' 
                        ? t.bank 
                        : wallet.type === 'cash' 
                        ? t.cash 
                        : wallet.type === 'credit' 
                        ? t.creditCard 
                        : wallet.type === 'investment' 
                        ? t.investment 
                        : t.ewallet}
                    </span>
                    {wallet.accountNumber && (
                      <>
                        <span>•</span>
                        <span className="font-mono">{wallet.accountNumber}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={closeWalletDetail}
                aria-label={t.cancel}
                className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-1">
              {/* Balance Hero Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 to-blue-50/30 dark:from-slate-800/50 dark:to-blue-950/20 p-4 sm:p-5 relative overflow-hidden">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {language === 'id' ? 'Saldo Dompet Saat Ini' : 'Current Wallet Balance'}
                    </span>
                    <h3 className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                      {formatCurrency(wallet.balance, wallet.currency)}
                    </h3>
                    {wallet.currency !== baseCurrency && (
                      <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                        ≈ {formatCurrency(convertedToBase, baseCurrency)} ({baseCurrency})
                      </p>
                    )}
                  </div>

                  {/* Balance Status Badge */}
                  <div>
                    {wallet.balance > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>{t.activeBalanceBadge}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/30 px-2.5 py-1 text-xs font-bold text-rose-600 dark:text-rose-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{t.emptyBalanceBadge}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Warning notice if balance is <= 0 */}
                {isBalanceZeroOrNegative && (
                  <div className="mt-3.5 flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-bold">{t.walletBalanceZeroOrLess}</p>
                      <p className="text-[11px] mt-0.5 text-amber-700/90 dark:text-amber-400">
                        {language === 'id' 
                          ? 'Anda tidak dapat membuat transaksi pengeluaran atau transfer keluar dari dompet ini sampai saldo terisi kembali.'
                          : 'You cannot make expenses or outgoing transfers from this wallet until it is topped up.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/60 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="truncate">{t.totalIn}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white truncate tabular-nums">
                    +{formatCurrency(stats.totalIn, wallet.currency)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/60 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-semibold mb-1">
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span className="truncate">{t.totalOut}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white truncate tabular-nums">
                    -{formatCurrency(stats.totalOut, wallet.currency)}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/60 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1">
                    <Layers className="h-3.5 w-3.5" />
                    <span className="truncate">{t.totalMutations}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    {stats.count} {language === 'id' ? 'Catatan' : 'Records'}
                  </p>
                </div>
              </div>

              {/* Mutation Section Header & Search */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {t.walletMutations}
                  </h4>
                  <span className="text-[11px] font-mono text-slate-400">
                    {filteredMutations.length} {language === 'id' ? 'mutasi' : 'mutations'}
                  </span>
                </div>

                {/* Filter Tabs & Search Bar */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      onClick={() => setActiveFilter('all')}
                      className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                        activeFilter === 'all'
                          ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {t.allMutations}
                    </button>
                    <button
                      onClick={() => setActiveFilter('income')}
                      className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                        activeFilter === 'income'
                          ? 'bg-white text-emerald-600 shadow-xs dark:bg-slate-900 dark:text-emerald-400'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {t.typeIncome}
                    </button>
                    <button
                      onClick={() => setActiveFilter('expense')}
                      className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                        activeFilter === 'expense'
                          ? 'bg-white text-rose-600 shadow-xs dark:bg-slate-900 dark:text-rose-400'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {t.typeExpense}
                    </button>
                    <button
                      onClick={() => setActiveFilter('transfer')}
                      className={`flex-1 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer ${
                        activeFilter === 'transfer'
                          ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-900 dark:text-blue-400'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                      }`}
                    >
                      {t.typeTransfer}
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={t.searchMutationPlaceholder}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800/80 dark:text-white"
                    />
                  </div>
                </div>

                {/* Mutations List */}
                <div className="mt-2 divide-y divide-slate-100 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 overflow-hidden">
                  {filteredMutations.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 mb-2">
                        <Calendar className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {t.noMutationsYet}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {language === 'id' 
                          ? 'Transaksi yang melibatkan dompet ini akan otomatis tercatat di sini.' 
                          : 'Transactions involving this wallet will appear here automatically.'}
                      </p>
                    </div>
                  ) : (
                    filteredMutations.map((tx) => {
                      const category = categories.find((c) => c.id === tx.categoryId);
                      const isTransfer = tx.type === 'transfer';
                      const isIncomingTransfer = isTransfer && tx.targetWalletId === wallet.id;
                      const isOutgoingTransfer = isTransfer && tx.sourceWalletId === wallet.id;
                      const isIncome = tx.type === 'income' || isIncomingTransfer;

                      // Display other wallet if transfer
                      const sourceW = wallets.find((w) => w.id === tx.sourceWalletId);
                      const targetW = wallets.find((w) => w.id === tx.targetWalletId);

                      return (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between gap-3 p-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {/* Type Icon */}
                            <div className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${
                              isIncome
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                            }`}>
                              {tx.type === 'income' ? (
                                <ArrowDownLeft className="h-4 w-4" />
                              ) : tx.type === 'expense' ? (
                                <ArrowUpRight className="h-4 w-4" />
                              ) : (
                                <ArrowLeftRight className="h-4 w-4" />
                              )}
                            </div>

                            {/* Details */}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {tx.description}
                              </p>
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                                <span>{tx.date}</span>
                                <span>•</span>
                                {isTransfer ? (
                                  <span className="font-semibold text-blue-600 dark:text-blue-400">
                                    {isIncomingTransfer 
                                      ? `${t.transferIn} ${sourceW?.name || (language === 'id' ? 'Dompet Asal' : 'Source Wallet')}` 
                                      : `${t.transferOut} ${targetW?.name || (language === 'id' ? 'Dompet Tujuan' : 'Destination Wallet')}`}
                                  </span>
                                ) : category ? (
                                  <span>{language === 'en' ? category.nameEn : category.name}</span>
                                ) : (
                                  <span>{tx.type === 'income' ? t.typeIncome : t.typeExpense}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Amount & Edit */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <p className={`text-xs sm:text-sm font-bold font-mono tabular-nums ${
                                isIncome
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }`}>
                                {isIncome ? '+' : '-'}{formatCurrency(tx.amount, tx.currency)}
                              </p>
                            </div>
                            <button
                              onClick={() => handleEditMutation(tx)}
                              title={t.edit}
                              aria-label={t.edit}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="w-full sm:w-auto flex items-center gap-2">
                <button
                  onClick={handleEditWalletClick}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                  <span>{t.editWallet}</span>
                </button>
                <button
                  onClick={closeWalletDetail}
                  className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {t.cancel}
                </button>
              </div>

              <button
                onClick={handleRecordTxClick}
                className="w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>
                  {isBalanceZeroOrNegative 
                    ? (language === 'id' ? 'Isi Saldo (Catat Pemasukan)' : 'Top Up (Record Income)') 
                    : t.walletActionRecordTx}
                </span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
