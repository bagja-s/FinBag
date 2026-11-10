import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { 
  formatCurrency, 
  calculateNetWorth, 
  calculateMonthlyCashFlow,
  getUpcomingRecurringBills
} from '../../utils/financeCalculations';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  ChevronRight, 
  CreditCard,
  Edit3,
  Trash2,
  Repeat,
  AlertTriangle,
  CheckCircle2,
  Play,
  EyeOff
} from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { Transaction } from '../../types/finance';
import { MonthlyBudgetReport } from '../dashboard/MonthlyBudgetReport';
import { PWAInstallBanner } from '../common/PWAInstallBanner';
import { motion } from 'motion/react';
import { containerStaggerVariants, cardItemVariants } from '../../utils/motionVariants';

export const DashboardView: React.FC = () => {
  const { 
    wallets, 
    transactions, 
    recurringTransactions,
    categories, 
    baseCurrency, 
    exchangeRates, 
    setActiveTab, 
    setIsAddWalletModalOpen, 
    openWalletDetail,
    openEditTransaction,
    deleteTransaction,
    executeRecurringTransactionNow,
    language 
  } = useFinance();

  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [runningBillId, setRunningBillId] = useState<string | null>(null);

  const t = getTranslation(language);

  const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const netWorth = calculateNetWorth(wallets, exchangeRates.rates, baseCurrency);
  const excludedWalletsCount = wallets.filter((w) => w.excludeFromNetWorth).length;
  const includedWalletsCount = wallets.length - excludedWalletsCount;
  const cashFlow = calculateMonthlyCashFlow(transactions, currentMonthStr, exchangeRates.rates, baseCurrency);

  // Upcoming recurring bills within the next 7 days
  const upcomingBills = useMemo(() => {
    return getUpcomingRecurringBills(
      recurringTransactions,
      wallets,
      todayStr,
      7,
      exchangeRates.rates,
      baseCurrency
    );
  }, [recurringTransactions, wallets, todayStr, exchangeRates.rates, baseCurrency]);

  const recentTxs = transactions.slice(0, 5);

  const handleRunBillNow = async (ruleId: string) => {
    setRunningBillId(ruleId);
    try {
      await executeRecurringTransactionNow(ruleId);
    } catch (err) {
      console.error('Failed to execute recurring bill:', err);
    } finally {
      setRunningBillId(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Smart PWA Install Suggestion Banner */}
      <PWAInstallBanner />

      {/* 1. Executive Net Worth Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 text-white shadow-xl border border-blue-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-300">
            <CreditCard className="h-4 w-4" />
            <span>{t.netWorth}</span>
          </div>
          <span className="text-[11px] font-mono rounded px-2 py-0.5 bg-blue-500/20 text-blue-200 border border-blue-400/30">
            Base: {baseCurrency}
          </span>
        </div>

        <div className="mt-3">
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono tabular-nums">
            {formatCurrency(netWorth, baseCurrency)}
          </div>
          <p className="mt-1 text-xs text-slate-400 flex flex-wrap items-center gap-1.5">
            <span>
              {excludedWalletsCount > 0
                ? language === 'id'
                  ? `${includedWalletsCount} dari ${wallets.length} ${t.activeWallets} dihitung`
                  : `${includedWalletsCount} of ${wallets.length} ${t.activeWallets} included`
                : `${wallets.length} ${t.activeWallets}`}
            </span>
            <span>·</span>
            <span>{language === 'id' ? 'Terkonversi Kurs Live' : 'Live FX Converted'}</span>
            {excludedWalletsCount > 0 && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 border border-amber-400/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                <EyeOff className="h-3 w-3" />
                {language === 'id'
                  ? `${excludedWalletsCount} dikecualikan`
                  : `${excludedWalletsCount} excluded`}
              </span>
            )}
          </p>
        </div>

        {/* Cash Flow Strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 border-t border-blue-900/40 pt-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 shrink-0">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">{t.totalIncome}</p>
              <p className="text-xs sm:text-sm font-bold text-emerald-400 font-mono tabular-nums">
                +{formatCurrency(cashFlow.income, baseCurrency)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 shrink-0">
              <ArrowUpRight className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-medium">{t.totalExpense}</p>
              <p className="text-xs sm:text-sm font-bold text-rose-400 font-mono tabular-nums">
                -{formatCurrency(cashFlow.expense, baseCurrency)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Wallet Cards Carousel */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <Wallet className="h-4 w-4 text-blue-500" />
            <span>{t.activeWallets}</span>
          </h2>
          <button
            onClick={() => setIsAddWalletModalOpen(true)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t.addWallet}</span>
          </button>
        </div>

        {wallets.length === 0 ? (
          <div
            onClick={() => setIsAddWalletModalOpen(true)}
            className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 p-6 text-center cursor-pointer hover:border-blue-500 bg-white/60 dark:bg-slate-900/40 transition-colors"
          >
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {language === 'id' ? '+ Tambah Rekening / Dompet Pertama Anda' : '+ Add Your First Wallet / Account'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {language === 'id' ? 'Database Anda masih kosong. Klik untuk mencatat dompet atau rekening riil Anda.' : 'Your database is currently empty. Click to record your real wallet or bank.'}
            </p>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none snap-x">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                onClick={() => openWalletDetail(wallet)}
                className={`min-w-[200px] sm:min-w-[230px] rounded-2xl border p-4 shadow-sm hover:shadow-md hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 ease-out cursor-pointer snap-start ${
                  wallet.excludeFromNetWorth
                    ? 'border-amber-200/80 bg-white/95 dark:border-amber-900/40 dark:bg-slate-900/90'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between mb-2 gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {wallet.name}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    {wallet.excludeFromNetWorth && (
                      <span
                        title={language === 'id' ? 'Dikecualikan dari Net Worth' : 'Excluded from Net Worth'}
                        className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400"
                      >
                        <EyeOff className="h-3 w-3" />
                      </span>
                    )}
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {wallet.currency}
                    </span>
                  </div>
                </div>
                <p className="text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(wallet.balance, wallet.currency)}
                </p>
                <div className="flex items-center justify-between gap-1 mt-1">
                  <p className="text-[11px] text-slate-500 truncate">
                    {wallet.accountNumber || (wallet.type === 'cash' ? t.cash : wallet.type === 'credit' ? t.creditCard : wallet.type === 'investment' ? t.investment : wallet.type === 'ewallet' ? t.ewallet : t.bank)}
                  </p>
                  {wallet.excludeFromNetWorth && (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                      {language === 'id' ? 'Non-Net Worth' : 'Excluded'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2.5 Upcoming Recurring Bills Indicator (Next 7 Days) */}
      {upcomingBills.length > 0 && (
        <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/40 p-4 sm:p-5 shadow-sm dark:border-indigo-900/50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900">
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-indigo-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Repeat className="h-3.5 w-3.5" />
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'id'
                    ? `Tagihan & Jadwal Rutin Terdekat (${upcomingBills.length})`
                    : `Upcoming Bills & Schedules (${upcomingBills.length})`}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {language === 'id'
                    ? 'Jatuh tempo dalam 7 hari ke depan'
                    : 'Due within the next 7 days'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab('transactions')}
              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>{language === 'id' ? 'Kelola' : 'Manage'}</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {upcomingBills.map((item) => {
              const { rule, daysUntilDue, isBalanceSufficient } = item;
              const sourceW = wallets.find((w) => w.id === rule.sourceWalletId);
              const dueBadgeText =
                daysUntilDue <= 0
                  ? (language === 'id' ? 'Hari Ini' : 'Today')
                  : daysUntilDue === 1
                  ? (language === 'id' ? 'Besok' : 'Tomorrow')
                  : (language === 'id' ? `${daysUntilDue} hari lagi` : `In ${daysUntilDue} days`);

              return (
                <div
                  key={rule.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {rule.description}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        daysUntilDue <= 1
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300'
                          : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300'
                      }`}>
                        {dueBadgeText}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{sourceW?.name || rule.sourceWalletId}</span>
                      <span>·</span>
                      {isBalanceSufficient ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{language === 'id' ? 'Saldo cukup' : 'Balance OK'}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-semibold">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{language === 'id' ? 'Saldo dompet kurang' : 'Low wallet balance'}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-mono text-xs font-bold tabular-nums ${
                      rule.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {rule.type === 'income' ? '+' : '-'}
                      {formatCurrency(rule.amount, rule.currency)}
                    </span>
                    <button
                      type="button"
                      disabled={runningBillId === rule.id || !isBalanceSufficient}
                      onClick={() => handleRunBillNow(rule.id)}
                      title={language === 'id' ? 'Catat Sekarang' : 'Record Now'}
                      className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-500 disabled:opacity-40 cursor-pointer"
                    >
                      <Play className="h-3 w-3" />
                      <span className="hidden sm:inline">
                        {runningBillId === rule.id
                          ? '...'
                          : (language === 'id' ? 'Catat' : 'Run')}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Monthly Financial Summary Report (Recharts Spending vs Budget) */}
      <MonthlyBudgetReport />

      {/* 4. Recent Transactions Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-xs font-bold text-slate-900 dark:text-white">
            {t.recentTransactions}
          </h3>
          <button
            onClick={() => setActiveTab('transactions')}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5"
          >
            <span>{t.viewAll}</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {recentTxs.length === 0 ? (
          <p className="mt-6 text-center text-xs text-slate-400 py-6">{t.noTransactionsYet}</p>
        ) : (
          <motion.div 
            variants={containerStaggerVariants} 
            initial="hidden" 
            animate="visible" 
            className="mt-3 divide-y divide-slate-100 dark:divide-slate-800"
          >
            {recentTxs.map((tx) => {
              const category = categories.find((c) => c.id === tx.categoryId);
              const wallet = wallets.find((w) => w.id === tx.sourceWalletId);
              const targetWallet = wallets.find((w) => w.id === tx.targetWalletId);

              return (
                <motion.div 
                  key={tx.id} 
                  variants={cardItemVariants}
                  className="group flex items-center justify-between gap-2 py-2 sm:py-2.5 px-1.5 sm:px-2.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 rounded-xl transition-all duration-150"
                >
                  {/* Left: Icon & Transaction Details */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                      tx.type === 'income'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : tx.type === 'expense'
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                        : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                    }`}>
                      {tx.type === 'income' ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : tx.type === 'expense' ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 rotate-45" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate leading-tight">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium">
                        <span className="shrink-0">{tx.date}</span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">{wallet?.name || tx.sourceWalletId}</span>
                        {targetWallet && (
                          <>
                            <span aria-hidden="true">→</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400 truncate">{targetWallet.name}</span>
                          </>
                        )}
                        {category && !targetWallet && (
                          <>
                            <span aria-hidden="true" className="hidden sm:inline">·</span>
                            <span className="text-[10px] text-slate-400 truncate hidden sm:inline">{language === 'en' ? category.nameEn : category.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Compact Actions */}
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <div className="text-right font-mono font-bold text-xs sm:text-sm tabular-nums">
                      <span className={
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : tx.type === 'expense'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }>
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {formatCurrency(tx.amount, tx.currency)}
                      </span>
                    </div>

                    <div className="flex items-center">
                      <button
                        onClick={() => openEditTransaction(tx)}
                        title={language === 'id' ? 'Edit Transaksi' : 'Edit Transaction'}
                        aria-label={`Edit ${tx.description}`}
                        className="p-1 sm:p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer"
                      >
                        <Edit3 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </button>
                      <button
                        onClick={() => setTxToDelete(tx)}
                        title={language === 'id' ? 'Hapus Transaksi' : 'Delete Transaction'}
                        aria-label={`Hapus ${tx.description}`}
                        className="p-1 sm:p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer"
                      >
                        <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>

      {/* Delete Confirmation Modal for Recent Transactions */}
      <ConfirmationModal
        isOpen={Boolean(txToDelete)}
        title={t.confirmDeleteTransactionTitle}
        message={t.confirmDeleteTransactionDesc}
        confirmText={language === 'id' ? 'Hapus Transaksi' : 'Delete Transaction'}
        cancelText={t.cancel}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={async () => {
          if (!txToDelete) return;
          setIsDeleting(true);
          try {
            await deleteTransaction(txToDelete.id);
            setTxToDelete(null);
          } finally {
            setIsDeleting(false);
          }
        }}
        onCancel={() => setTxToDelete(null)}
        details={txToDelete ? [
          { label: language === 'id' ? 'Keterangan' : 'Description', value: txToDelete.description },
          { label: language === 'id' ? 'Nominal' : 'Amount', value: formatCurrency(txToDelete.amount, txToDelete.currency) },
          { label: language === 'id' ? 'Tanggal' : 'Date', value: txToDelete.date },
        ] : []}
      />
    </div>
  );
};
