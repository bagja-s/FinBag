import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { 
  formatCurrency, 
  filterTransactionsList, 
  groupTransactionsByDate,
  calculateMonthlyRecurringSummary,
  getDatePeriodRange,
  calculateFilteredTransactionsSummary,
  DatePeriodPreset
} from '../../utils/financeCalculations';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { 
  Transaction, 
  RecurringTransaction, 
  RecurringFrequency, 
  TransactionType, 
  SupportedCurrency 
} from '../../types/finance';
import { 
  History, 
  Search, 
  Download, 
  Trash2, 
  Edit3,
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight,
  Plus,
  Calendar,
  Repeat,
  Play,
  Pause,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { 
    transactions, 
    recurringTransactions,
    wallets, 
    categories, 
    baseCurrency,
    exchangeRates,
    deleteTransaction, 
    openEditTransaction,
    addRecurringTransaction,
    updateRecurringTransaction,
    deleteRecurringTransaction,
    toggleRecurringTransaction,
    executeRecurringTransactionNow,
    exportCSV, 
    setIsTransactionModalOpen,
    language 
  } = useFinance();

  const t = getTranslation(language);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [datePeriod, setDatePeriod] = useState<DatePeriodPreset>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Recurring Manager UI state
  const [isRecurringExpanded, setIsRecurringExpanded] = useState<boolean>(true);
  const [isRecurringFormOpen, setIsRecurringFormOpen] = useState<boolean>(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringTransaction | null>(null);
  const [runningRuleId, setRunningRuleId] = useState<string | null>(null);
  const [recurringFeedback, setRecurringFeedback] = useState<string | null>(null);

  // Recurring Form fields
  const [recType, setRecType] = useState<TransactionType>('expense');
  const [recDesc, setRecDesc] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recCurrency, setRecCurrency] = useState<SupportedCurrency>(baseCurrency);
  const [recSourceWalletId, setRecSourceWalletId] = useState(wallets[0]?.id || '');
  const [recTargetWalletId, setRecTargetWalletId] = useState(wallets[1]?.id || '');
  const [recCategoryId, setRecCategoryId] = useState(categories[0]?.id || 'subscription');
  const [recFrequency, setRecFrequency] = useState<RecurringFrequency>('monthly');
  const [recNextRunDate, setRecNextRunDate] = useState(new Date().toISOString().split('T')[0]);
  const [recEndDate, setRecEndDate] = useState('');
  const [recNotes, setRecNotes] = useState('');
  const [recError, setRecError] = useState('');

  // Confirmation state for deleting a transaction
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Recurring summary metrics
  const recurringSummary = useMemo(() => {
    return calculateMonthlyRecurringSummary(recurringTransactions, exchangeRates.rates, baseCurrency);
  }, [recurringTransactions, exchangeRates.rates, baseCurrency]);

  const openCreateRecurringForm = () => {
    setEditingRecurring(null);
    setRecType('expense');
    setRecDesc('');
    setRecAmount('');
    setRecCurrency(wallets[0]?.currency || baseCurrency);
    setRecSourceWalletId(wallets[0]?.id || '');
    setRecTargetWalletId(wallets[1]?.id || wallets[0]?.id || '');
    setRecCategoryId('subscription');
    setRecFrequency('monthly');
    setRecNextRunDate(new Date().toISOString().split('T')[0]);
    setRecEndDate('');
    setRecNotes('');
    setRecError('');
    setIsRecurringFormOpen(true);
    setIsRecurringExpanded(true);
  };

  const openEditRecurringForm = (rule: RecurringTransaction) => {
    setEditingRecurring(rule);
    setRecType(rule.type);
    setRecDesc(rule.description);
    setRecAmount(rule.amount.toString());
    setRecCurrency(rule.currency);
    setRecSourceWalletId(rule.sourceWalletId);
    setRecTargetWalletId(rule.targetWalletId || wallets[1]?.id || '');
    setRecCategoryId(rule.categoryId || 'subscription');
    setRecFrequency(rule.frequency);
    setRecNextRunDate(rule.nextRunDate);
    setRecEndDate(rule.endDate || '');
    setRecNotes(rule.notes || '');
    setRecError('');
    setIsRecurringFormOpen(true);
    setIsRecurringExpanded(true);
  };

  const handleSaveRecurringForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmt = parseFloat(recAmount);
    if (!recDesc.trim()) {
      setRecError(language === 'id' ? 'Nama jadwal wajib diisi.' : 'Schedule description is required.');
      return;
    }
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setRecError(language === 'id' ? 'Nominal harus lebih dari 0.' : 'Amount must be greater than 0.');
      return;
    }
    if (!recSourceWalletId) {
      setRecError(language === 'id' ? 'Pilih dompet terlebih dahulu.' : 'Please select a wallet.');
      return;
    }
    if (recType === 'transfer' && recSourceWalletId === recTargetWalletId) {
      setRecError(language === 'id' ? 'Dompet asal dan tujuan tidak boleh sama.' : 'Source and destination wallets cannot match.');
      return;
    }

    setRecError('');
    if (editingRecurring) {
      await updateRecurringTransaction(editingRecurring.id, {
        description: recDesc.trim(),
        amount: parsedAmt,
        currency: recCurrency,
        type: recType,
        sourceWalletId: recSourceWalletId,
        targetWalletId: recType === 'transfer' ? recTargetWalletId : undefined,
        categoryId: recType !== 'transfer' ? recCategoryId : undefined,
        frequency: recFrequency,
        nextRunDate: recNextRunDate,
        endDate: recEndDate || undefined,
        notes: recNotes.trim() || undefined,
      });
      setRecurringFeedback(
        language === 'id'
          ? `Jadwal "${recDesc.trim()}" berhasil diperbarui.`
          : `Schedule "${recDesc.trim()}" updated.`
      );
    } else {
      await addRecurringTransaction({
        description: recDesc.trim(),
        amount: parsedAmt,
        currency: recCurrency,
        type: recType,
        sourceWalletId: recSourceWalletId,
        targetWalletId: recType === 'transfer' ? recTargetWalletId : undefined,
        categoryId: recType !== 'transfer' ? recCategoryId : undefined,
        frequency: recFrequency,
        startDate: recNextRunDate,
        nextRunDate: recNextRunDate,
        endDate: recEndDate || undefined,
        active: true,
        notes: recNotes.trim() || undefined,
      });
      setRecurringFeedback(
        language === 'id'
          ? `Jadwal otomatis "${recDesc.trim()}" berhasil ditambahkan.`
          : `Recurring schedule "${recDesc.trim()}" created.`
      );
    }

    setIsRecurringFormOpen(false);
    setEditingRecurring(null);
    setTimeout(() => setRecurringFeedback(null), 4000);
  };

  const handleRunRuleNow = async (rule: RecurringTransaction) => {
    setRunningRuleId(rule.id);
    setRecError('');
    try {
      await executeRecurringTransactionNow(rule.id);
      setRecurringFeedback(
        language === 'id'
          ? `Transaksi "${rule.description}" berhasil dicatat & jadwal berikutnya diperbarui.`
          : `Transaction "${rule.description}" recorded and next schedule advanced.`
      );
      setTimeout(() => setRecurringFeedback(null), 4000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : (language === 'id' ? 'Gagal menjalankan jadwal.' : 'Failed to run schedule.');
      setRecError(msg);
    } finally {
      setRunningRuleId(null);
    }
  };

  const getFrequencyLabel = (freq: RecurringFrequency) => {
    if (language === 'id') {
      if (freq === 'daily') return 'Harian';
      if (freq === 'weekly') return 'Mingguan';
      if (freq === 'monthly') return 'Bulanan';
      return 'Tahunan';
    }
    if (freq === 'daily') return 'Daily';
    if (freq === 'weekly') return 'Weekly';
    if (freq === 'monthly') return 'Monthly';
    return 'Yearly';
  };

  const todayIsoStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const periodRange = useMemo(() => {
    return getDatePeriodRange(datePeriod, todayIsoStr, customStartDate, customEndDate);
  }, [datePeriod, todayIsoStr, customStartDate, customEndDate]);

  // Filter and sort newest first
  const filtered = useMemo(() => {
    return filterTransactionsList(transactions, {
      query: searchQuery,
      walletId: selectedWallet,
      categoryId: selectedCategory,
      type: selectedType,
      startDate: periodRange.startDate,
      endDate: periodRange.endDate,
    });
  }, [transactions, searchQuery, selectedWallet, selectedCategory, selectedType, periodRange]);

  const filteredSummary = useMemo(() => {
    return calculateFilteredTransactionsSummary(filtered, exchangeRates.rates, baseCurrency);
  }, [filtered, exchangeRates.rates, baseCurrency]);

  // Group filtered transactions by date (newest date at the top, newest tx within date at the top)
  const dateGroups = useMemo(() => {
    return groupTransactionsByDate(filtered, exchangeRates.rates, baseCurrency);
  }, [filtered, exchangeRates.rates, baseCurrency]);

  // Format YYYY-MM-DD into natural localized date label with Today / Yesterday prefix
  const formatDateGroupHeader = (dateStr: string): string => {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const [yr, mo, dy] = dateStr.split('-').map(Number);
    const txDate = new Date(yr, mo - 1, dy);

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const yesterdayStr = `${yest.getFullYear()}-${String(yest.getMonth() + 1).padStart(2, '0')}-${String(yest.getDate()).padStart(2, '0')}`;

    const formattedFull = txDate.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    if (dateStr === todayStr) {
      return `${language === 'id' ? 'Hari Ini' : 'Today'} · ${formattedFull}`;
    }
    if (dateStr === yesterdayStr) {
      return `${language === 'id' ? 'Kemarin' : 'Yesterday'} · ${formattedFull}`;
    }
    return formattedFull;
  };

  const handleConfirmDelete = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(txToDelete.id);
      setTxToDelete(null);
    } catch (err) {
      console.error('Delete transaction error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const walletOfTxToDelete = txToDelete ? wallets.find(w => w.id === txToDelete.sourceWalletId) : null;
  const categoryOfTxToDelete = txToDelete ? categories.find(c => c.id === txToDelete.categoryId) : null;

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header with Primary Action & CSV Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <History className="h-5 w-5 text-blue-500" />
            <span>{language === 'id' ? 'Riwayat & Mutasi Transaksi' : 'Transaction History & Mutations'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {filtered.length} {language === 'id' ? 'transaksi ditemukan' : 'transactions found'} · {language === 'id' ? 'Diurutkan dari terbaru & dikelompokkan per tanggal' : 'Sorted newest first & grouped by date'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="h-3.5 w-3.5 text-blue-500" />
            <span>{t.exportCSV}</span>
          </button>
        </div>
      </div>

      {/* Automatic Recurring Transactions Panel */}
      <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-white to-blue-50/50 p-4 sm:p-5 shadow-sm dark:border-indigo-900/50 dark:from-indigo-950/30 dark:via-slate-900 dark:to-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'id' ? 'Jadwal Transaksi Berulang Otomatis' : 'Automatic Recurring Transactions'}
                </h2>
                <span className="rounded-md bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                  {recurringSummary.activeCount} {language === 'id' ? 'Aktif' : 'Active'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'id'
                  ? 'Transaksi rutin (langganan, tagihan, gaji, cicilan) dicatat otomatis saat tanggal jatuh tempo tiba.'
                  : 'Scheduled transactions (subscriptions, bills, salary) are automatically recorded on their due date.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {recurringSummary.monthlyExpenseEstimate > 0 && (
              <div className="hidden md:block text-right mr-2">
                <span className="block text-[10px] text-slate-400">
                  {language === 'id' ? 'Beban Rutin / Bulan' : 'Monthly Recurring Expense'}
                </span>
                <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                  -{formatCurrency(recurringSummary.monthlyExpenseEstimate, baseCurrency)}
                </span>
              </div>
            )}
            <button
              type="button"
              onClick={openCreateRecurringForm}
              className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{language === 'id' ? 'Jadwal Baru' : 'New Schedule'}</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRecurringExpanded((prev) => !prev)}
              className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
              title={isRecurringExpanded ? (language === 'id' ? 'Sembunyikan' : 'Hide') : (language === 'id' ? 'Tampilkan' : 'Show')}
            >
              {isRecurringExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>

        {recurringFeedback && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/90 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{recurringFeedback}</span>
          </div>
        )}

        {recError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {recError}
          </div>
        )}

        {isRecurringExpanded && (
          <div className="mt-4 space-y-3 border-t border-indigo-100 pt-4 dark:border-slate-800">
            {/* Inline Create / Edit Recurring Schedule Form */}
            {isRecurringFormOpen && (
              <form
                onSubmit={handleSaveRecurringForm}
                className="rounded-xl border border-indigo-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Repeat className="h-3.5 w-3.5 text-indigo-500" />
                    <span>
                      {editingRecurring
                        ? (language === 'id' ? 'Edit Jadwal Transaksi Otomatis' : 'Edit Recurring Schedule')
                        : (language === 'id' ? 'Tambah Jadwal Transaksi Otomatis Baru' : 'New Recurring Transaction Schedule')}
                    </span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => { setIsRecurringFormOpen(false); setEditingRecurring(null); setRecError(''); }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Type */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {language === 'id' ? 'Tipe Transaksi' : 'Type'}
                    </label>
                    <select
                      value={recType}
                      onChange={(e) => setRecType(e.target.value as TransactionType)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="expense">{t.typeExpense}</option>
                      <option value="income">{t.typeIncome}</option>
                      <option value="transfer">{t.typeTransfer}</option>
                    </select>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {language === 'id' ? 'Nama / Keterangan' : 'Description'}
                    </label>
                    <input
                      type="text"
                      required
                      value={recDesc}
                      onChange={(e) => setRecDesc(e.target.value)}
                      placeholder={language === 'id' ? 'cth: Netflix, Tagihan WiFi, Gaji' : 'e.g. Netflix, Internet Bill, Salary'}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none"
                    />
                  </div>

                  {/* Amount & Currency */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t.amount}
                    </label>
                    <div className="flex h-9 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
                      <select
                        value={recCurrency}
                        onChange={(e) => setRecCurrency(e.target.value as SupportedCurrency)}
                        className="border-r border-slate-200 bg-transparent px-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200 focus:outline-none"
                      >
                        <option value="IDR">IDR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="SGD">SGD</option>
                        <option value="MYR">MYR</option>
                        <option value="JPY">JPY</option>
                        <option value="GBP">GBP</option>
                        <option value="AUD">AUD</option>
                      </select>
                      <input
                        type="number"
                        step="any"
                        required
                        value={recAmount}
                        onChange={(e) => setRecAmount(e.target.value)}
                        placeholder="0"
                        className="w-full bg-transparent px-2.5 font-mono text-xs font-bold text-slate-900 dark:text-white focus:outline-none tabular-nums"
                      />
                    </div>
                  </div>

                  {/* Frequency */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {language === 'id' ? 'Frekuensi Berulang' : 'Frequency'}
                    </label>
                    <select
                      value={recFrequency}
                      onChange={(e) => setRecFrequency(e.target.value as RecurringFrequency)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      <option value="daily">{language === 'id' ? 'Harian (Setiap Hari)' : 'Daily'}</option>
                      <option value="weekly">{language === 'id' ? 'Mingguan (Setiap Minggu)' : 'Weekly'}</option>
                      <option value="monthly">{language === 'id' ? 'Bulanan (Setiap Bulan)' : 'Monthly'}</option>
                      <option value="yearly">{language === 'id' ? 'Tahunan (Setiap Tahun)' : 'Yearly'}</option>
                    </select>
                  </div>

                  {/* Source Wallet */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {t.fromWallet}
                    </label>
                    <select
                      value={recSourceWalletId}
                      onChange={(e) => setRecSourceWalletId(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({formatCurrency(w.balance, w.currency)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category or Target Wallet */}
                  {recType === 'transfer' ? (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {t.toWallet}
                      </label>
                      <select
                        value={recTargetWalletId}
                        onChange={(e) => setRecTargetWalletId(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        {wallets.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        {t.category}
                      </label>
                      <select
                        value={recCategoryId}
                        onChange={(e) => setRecCategoryId(e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none"
                      >
                        {categories
                          .filter((c) => (recType === 'income' ? c.type === 'income' : c.type === 'expense'))
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {language === 'en' ? c.nameEn : c.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Next Run Date */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {language === 'id' ? 'Tanggal Eksekusi Berikutnya' : 'Next Run Date'}
                    </label>
                    <input
                      type="date"
                      required
                      value={recNextRunDate}
                      onChange={(e) => setRecNextRunDate(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>

                  {/* End Date (Optional) */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      {language === 'id' ? 'Tanggal Berakhir (Opsional)' : 'End Date (Optional)'}
                    </label>
                    <input
                      type="date"
                      value={recEndDate}
                      onChange={(e) => setRecEndDate(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setIsRecurringFormOpen(false); setEditingRecurring(null); setRecError(''); }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-500 cursor-pointer"
                  >
                    {editingRecurring
                      ? (language === 'id' ? 'Simpan Perubahan' : 'Save Changes')
                      : (language === 'id' ? 'Simpan Jadwal Otomatis' : 'Save Recurring Schedule')}
                  </button>
                </div>
              </form>
            )}

            {/* List of Recurring Schedules */}
            {recurringTransactions.length === 0 ? (
              <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-slate-200 bg-white/80 p-3.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                <Clock className="h-4 w-4 text-slate-400 shrink-0" />
                <span>
                  {language === 'id'
                    ? 'Belum ada jadwal transaksi berulang. Klik "+ Jadwal Baru" di atas untuk menjadwalkan gaji bulanan, tagihan rutin, atau langganan.'
                    : 'No automatic recurring schedules yet. Click "+ New Schedule" above to schedule monthly salary, utility bills, or subscriptions.'}
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recurringTransactions.map((rule) => {
                  const sourceW = wallets.find((w) => w.id === rule.sourceWalletId);
                  const targetW = rule.targetWalletId ? wallets.find((w) => w.id === rule.targetWalletId) : null;
                  const cat = categories.find((c) => c.id === rule.categoryId);
                  const isRunning = runningRuleId === rule.id;

                  return (
                    <div
                      key={rule.id}
                      className={`flex flex-col justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                        rule.active
                          ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                          : 'border-slate-200/60 bg-slate-50/70 opacity-75 dark:border-slate-800/60 dark:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {rule.description}
                            </span>
                            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                              {getFrequencyLabel(rule.frequency)}
                            </span>
                            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                              rule.active
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                                : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                              {rule.active
                                ? (language === 'id' ? 'Aktif' : 'Active')
                                : (language === 'id' ? 'Dijeda' : 'Paused')}
                            </span>
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{sourceW?.name || rule.sourceWalletId}</span>
                            {targetW && (
                              <>
                                <span>→</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">{targetW.name}</span>
                              </>
                            )}
                            {cat && (
                              <>
                                <span>·</span>
                                <span>{language === 'en' ? cat.nameEn : cat.name}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="text-right font-mono text-xs font-bold tabular-nums shrink-0">
                          <span className={
                            rule.type === 'income'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : rule.type === 'expense'
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }>
                            {rule.type === 'income' ? '+' : rule.type === 'expense' ? '-' : ''}
                            {formatCurrency(rule.amount, rule.currency)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-slate-800/80">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          <span>
                            {language === 'id' ? 'Berikutnya: ' : 'Next: '}
                            <strong className="font-mono text-slate-700 dark:text-slate-200">{rule.nextRunDate}</strong>
                          </span>
                          {rule.lastRunDate && (
                            <span className="ml-2 text-slate-400">
                              ({language === 'id' ? 'Terakhir: ' : 'Last: '}{rule.lastRunDate})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={isRunning}
                            onClick={() => handleRunRuleNow(rule)}
                            title={language === 'id' ? 'Catat Transaksi Ini Sekarang' : 'Execute Now'}
                            className="flex items-center gap-1 rounded-lg bg-indigo-50 px-2 py-1 text-[11px] font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 cursor-pointer disabled:opacity-50"
                          >
                            <Play className="h-3 w-3" />
                            <span>{language === 'id' ? 'Jalankan' : 'Run Now'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleRecurringTransaction(rule.id)}
                            title={rule.active ? (language === 'id' ? 'Jeda Jadwal' : 'Pause') : (language === 'id' ? 'Aktifkan Jadwal' : 'Resume')}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:text-slate-400 dark:hover:text-amber-400 dark:hover:bg-amber-950/40 rounded-lg cursor-pointer"
                          >
                            {rule.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditRecurringForm(rule)}
                            title={t.edit}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 rounded-lg cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteRecurringTransaction(rule.id)}
                            title={t.delete}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filter Bar (Search, Wallet, Category, Type, Date Period) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {/* Search Input */}
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
            <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchTransactions}
              className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
            />
          </div>

          {/* Period Preset Filter */}
          <select
            value={datePeriod}
            onChange={(e) => setDatePeriod(e.target.value as DatePeriodPreset)}
            aria-label={language === 'id' ? 'Filter Periode Waktu' : 'Date Period Filter'}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">{language === 'id' ? 'Semua Periode Waktu' : 'All Time'}</option>
            <option value="this_month">{language === 'id' ? 'Bulan Ini' : 'This Month'}</option>
            <option value="last_month">{language === 'id' ? 'Bulan Lalu' : 'Last Month'}</option>
            <option value="last_30_days">{language === 'id' ? '30 Hari Terakhir' : 'Last 30 Days'}</option>
            <option value="custom">{language === 'id' ? 'Rentang Tanggal Kustom' : 'Custom Date Range'}</option>
          </select>

          {/* Wallet Filter */}
          <select
            value={selectedWallet}
            onChange={(e) => setSelectedWallet(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">{t.allWallets}</option>
            {wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">{t.allCategories}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {language === 'en' ? c.nameEn : c.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="all">{t.allTypes}</option>
            <option value="expense">{t.typeExpense}</option>
            <option value="income">{t.typeIncome}</option>
            <option value="transfer">{t.typeTransfer}</option>
          </select>
        </div>

        {/* Custom Date Range Pickers */}
        {datePeriod === 'custom' && (
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {language === 'id' ? 'Dari:' : 'From:'}
              </span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {language === 'id' ? 'Sampai:' : 'To:'}
              </span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Filtered Cash Flow Summary Strip */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between rounded-xl bg-emerald-50/70 px-3 py-2 dark:bg-emerald-950/30">
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                {language === 'id' ? 'Total Pemasukan (Filter)' : 'Filtered Income'}
              </span>
              <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{formatCurrency(filteredSummary.totalIncome, baseCurrency)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-rose-50/70 px-3 py-2 dark:bg-rose-950/30">
              <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                {language === 'id' ? 'Total Pengeluaran (Filter)' : 'Filtered Expense'}
              </span>
              <span className="font-mono text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                -{formatCurrency(filteredSummary.totalExpense, baseCurrency)}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-100/80 px-3 py-2 dark:bg-slate-800/70">
              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                {language === 'id' ? 'Selisih Bersih (Net)' : 'Net Cash Flow'}
              </span>
              <span className={`font-mono text-xs font-bold tabular-nums ${
                filteredSummary.netCashFlow >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}>
                {filteredSummary.netCashFlow >= 0 ? '+' : ''}
                {formatCurrency(filteredSummary.netCashFlow, baseCurrency)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Grouped Transactions List by Date */}
      {dateGroups.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 sm:p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <History className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {language === 'id' ? 'Tidak Ada Catatan Transaksi' : 'No Transactions Found'}
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
            {language === 'id' 
              ? 'Belum ada transaksi di database atau tidak ada transaksi yang cocok dengan filter Anda.' 
              : 'No transactions found matching your criteria.'}
          </p>
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{t.addTransaction}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {dateGroups.map((group) => (
            <div
              key={group.date}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden"
            >
              {/* Date Group Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 bg-slate-50/90 dark:bg-slate-800/60 px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>{formatDateGroupHeader(group.date)}</span>
                  <span className="text-slate-400 font-normal">·</span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {group.transactions.length} {language === 'id' ? 'transaksi' : group.transactions.length === 1 ? 'entry' : 'entries'}
                  </span>
                </div>

                {/* Daily Cashflow Summary */}
                <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums">
                  {group.dailyIncome > 0 && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      +{formatCurrency(group.dailyIncome, baseCurrency)}
                    </span>
                  )}
                  {group.dailyExpense > 0 && (
                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                      -{formatCurrency(group.dailyExpense, baseCurrency)}
                    </span>
                  )}
                </div>
              </div>

              {/* Transactions within this Date */}
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.transactions.map((tx) => {
                  const wallet = wallets.find((w) => w.id === tx.sourceWalletId);
                  const targetWallet = tx.targetWalletId ? wallets.find((w) => w.id === tx.targetWalletId) : null;
                  const category = categories.find((c) => c.id === tx.categoryId);

                  return (
                    <div
                      key={tx.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-50/90 dark:hover:bg-slate-800/40 transition-colors duration-150"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-xs transition-transform duration-200 group-hover:scale-105 ${
                          tx.type === 'income'
                            ? 'bg-emerald-500'
                            : tx.type === 'expense'
                            ? 'bg-rose-500'
                            : 'bg-blue-600'
                        }`}>
                          {tx.type === 'income' ? (
                            <ArrowDownLeft className="h-5 w-5" />
                          ) : tx.type === 'expense' ? (
                            <ArrowUpRight className="h-5 w-5" />
                          ) : (
                            <ArrowLeftRight className="h-5 w-5" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {tx.description}
                            </h4>
                            {tx.recurringRuleId && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-300">
                                <Repeat className="h-2.5 w-2.5" />
                                <span>{language === 'id' ? 'Berulang' : 'Recurring'}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            <span>{wallet?.name || tx.sourceWalletId}</span>
                            {targetWallet && (
                              <>
                                <span aria-hidden="true">→</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">{targetWallet.name}</span>
                              </>
                            )}
                            {category && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-medium text-slate-600 dark:text-slate-300">
                                  {language === 'en' ? category.nameEn : category.name}
                                </span>
                              </>
                            )}
                          </div>
                          {tx.notes && (
                            <p className="text-[10px] text-slate-400 italic mt-0.5 truncate">{tx.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                        <div className="text-left sm:text-right font-mono font-bold text-xs sm:text-sm tabular-nums">
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

                        {/* Action Buttons: Edit and Delete with Confirmation */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditTransaction(tx)}
                            title={language === 'id' ? 'Edit Transaksi' : 'Edit Transaction'}
                            aria-label={`Edit ${tx.description}`}
                            className="flex items-center gap-1 p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer"
                          >
                            <Edit3 className="h-4 w-4" />
                            <span className="text-[11px] font-medium sm:hidden">{t.edit}</span>
                          </button>

                          <button
                            onClick={() => setTxToDelete(tx)}
                            title={language === 'id' ? 'Hapus Transaksi' : 'Delete Transaction'}
                            aria-label={`Hapus ${tx.description}`}
                            className="flex items-center gap-1 p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-[11px] font-medium sm:hidden">{t.delete}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(txToDelete)}
        title={t.confirmDeleteTransactionTitle}
        message={t.confirmDeleteTransactionDesc}
        confirmText={language === 'id' ? 'Hapus Transaksi' : 'Delete Transaction'}
        cancelText={t.cancel}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTxToDelete(null)}
        details={txToDelete ? [
          { label: language === 'id' ? 'Keterangan' : 'Description', value: txToDelete.description },
          { label: language === 'id' ? 'Nominal' : 'Amount', value: formatCurrency(txToDelete.amount, txToDelete.currency) },
          { label: language === 'id' ? 'Tanggal' : 'Date', value: txToDelete.date },
          { label: language === 'id' ? 'Dompet Terkait' : 'Related Wallet', value: walletOfTxToDelete?.name || txToDelete.sourceWalletId },
          ...(categoryOfTxToDelete ? [{ label: language === 'id' ? 'Kategori' : 'Category', value: language === 'en' ? categoryOfTxToDelete.nameEn : categoryOfTxToDelete.name }] : [])
        ] : []}
      />
    </div>
  );
};

