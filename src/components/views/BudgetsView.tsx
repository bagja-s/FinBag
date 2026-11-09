import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { 
  formatCurrency, 
  calculateCategorySpending, 
  calculateBudgetHealth,
  calculateAutoBudget503020Summary,
  AutoBudgetStrategy
} from '../../utils/financeCalculations';
import { 
  PieChart, 
  AlertTriangle, 
  CheckCircle, 
  ShieldAlert, 
  Edit2, 
  Check, 
  Wand2, 
  X, 
  ArrowRight, 
  History,
  Plus,
  PiggyBank,
  Layers,
  Sparkles
} from 'lucide-react';

export const BudgetsView: React.FC = () => {
  const { 
    categories, 
    transactions, 
    baseCurrency, 
    exchangeRates, 
    updateBudgetLimit, 
    batchUpdateBudgetLimits,
    setIsTransactionModalOpen,
    language 
  } = useFinance();

  const t = getTranslation(language);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimitVal, setEditLimitVal] = useState<string>('');
  const [groupFilter, setGroupFilter] = useState<'all' | 'needs' | 'wants'>('all');

  // Auto Budget state (default to 50/30/20 rule)
  const [showAutoBudgetModal, setShowAutoBudgetModal] = useState(false);
  const [strategy, setStrategy] = useState<AutoBudgetStrategy>('rule_50_30_20');
  const [customIncomeInput, setCustomIncomeInput] = useState<string>('');
  const [distributeAllCategories, setDistributeAllCategories] = useState(false);
  const [zeroUnusedCategories, setZeroUnusedCategories] = useState(false);
  const [deselectedCatIds, setDeselectedCatIds] = useState<Record<string, boolean>>({});
  const [isApplyingAuto, setIsApplyingAuto] = useState(false);
  const [autoBudgetSuccessMsg, setAutoBudgetSuccessMsg] = useState<string | null>(null);

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const categorySpending = calculateCategorySpending(transactions, currentMonthStr, exchangeRates.rates, baseCurrency);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  const filteredExpenseCategories = useMemo(() => {
    if (groupFilter === 'all') return expenseCategories;
    return expenseCategories.filter((c) => (c.budgetGroup || 'wants') === groupFilter);
  }, [expenseCategories, groupFilter]);

  const parsedCustomIncome = useMemo(() => {
    const val = parseFloat(customIncomeInput);
    return !isNaN(val) && val > 0 ? val : undefined;
  }, [customIncomeInput]);

  // Compute 50/30/20 Auto Budget summary & category suggestions
  const autoBudgetSummary = useMemo(() => {
    return calculateAutoBudget503020Summary(
      transactions,
      categories,
      currentMonthStr,
      strategy,
      exchangeRates.rates,
      baseCurrency,
      {
        customMonthlyIncome: parsedCustomIncome,
        distributeAllCategories,
      }
    );
  }, [
    transactions,
    categories,
    currentMonthStr,
    strategy,
    exchangeRates.rates,
    baseCurrency,
    parsedCustomIncome,
    distributeAllCategories,
  ]);

  const autoSuggestions = autoBudgetSummary.suggestions;

  const { selectedNeedsTotal, selectedWantsTotal, totalSuggestedBudget } = useMemo(() => {
    let needsSum = 0;
    let wantsSum = 0;
    autoSuggestions.forEach((item) => {
      if (deselectedCatIds[item.categoryId]) return;
      if (item.budgetGroup === 'needs') {
        needsSum += item.suggestedLimit;
      } else {
        wantsSum += item.suggestedLimit;
      }
    });
    return {
      selectedNeedsTotal: needsSum,
      selectedWantsTotal: wantsSum,
      totalSuggestedBudget: needsSum + wantsSum,
    };
  }, [autoSuggestions, deselectedCatIds]);

  // Current configured budgets split by 50/30/20 groups
  const { totalCurrentBudget, currentNeedsBudget, currentWantsBudget, totalSpentThisMonth } = useMemo(() => {
    let totalB = 0;
    let needsB = 0;
    let wantsB = 0;
    expenseCategories.forEach((c) => {
      const lim = c.monthlyLimit || 0;
      totalB += lim;
      if ((c.budgetGroup || 'wants') === 'needs') {
        needsB += lim;
      } else {
        wantsB += lim;
      }
    });
    const spent = Object.values(categorySpending).reduce((sum, v) => sum + v, 0);
    return {
      totalCurrentBudget: totalB,
      currentNeedsBudget: needsB,
      currentWantsBudget: wantsB,
      totalSpentThisMonth: spent,
    };
  }, [expenseCategories, categorySpending]);

  const handleStartEdit = (catId: string, currentLimit: number) => {
    setEditingId(catId);
    setEditLimitVal(currentLimit.toString());
  };

  const handleSaveEdit = async (catId: string) => {
    const parsed = parseFloat(editLimitVal);
    if (!isNaN(parsed) && parsed >= 0) {
      await updateBudgetLimit(catId, parsed);
    }
    setEditingId(null);
  };

  const toggleSelectCategory = (catId: string) => {
    setDeselectedCatIds((prev) => ({
      ...prev,
      [catId]: !prev[catId],
    }));
  };

  const handleApplyAutoBudget = async () => {
    setIsApplyingAuto(true);
    try {
      const updates: Record<string, number> = {};
      const suggestedIds = new Set<string>();

      autoSuggestions.forEach((item) => {
        suggestedIds.add(item.categoryId);
        if (!deselectedCatIds[item.categoryId]) {
          updates[item.categoryId] = item.suggestedLimit;
        }
      });

      if (zeroUnusedCategories) {
        expenseCategories.forEach((cat) => {
          if (!suggestedIds.has(cat.id)) {
            updates[cat.id] = 0;
          }
        });
      }

      const updatedCount = Object.keys(updates).length;
      if (updatedCount > 0) {
        await batchUpdateBudgetLimits(updates);
        setAutoBudgetSuccessMsg(
          language === 'id'
            ? `Auto Budget (${strategy === 'rule_50_30_20' ? 'Rasio 50/30/20' : 'Riwayat Transaksi'}) berhasil diterapkan pada ${updatedCount} kategori.`
            : `Auto Budget (${strategy === 'rule_50_30_20' ? '50/30/20 Ratio' : 'Historical'}) successfully applied to ${updatedCount} categories.`
        );
        setTimeout(() => setAutoBudgetSuccessMsg(null), 5000);
      }
      setShowAutoBudgetModal(false);
    } finally {
      setIsApplyingAuto(false);
    }
  };

  const needsSuggestions = autoSuggestions.filter((s) => s.budgetGroup === 'needs');
  const wantsSuggestions = autoSuggestions.filter((s) => s.budgetGroup === 'wants');

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header & Auto Budget Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <PieChart className="h-5 w-5 text-blue-500" />
            <span>{t.budgetStatus}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'id' 
              ? 'Kelola pagu pengeluaran bulanan per kategori dengan metode Auto Budget 50/30/20 & riwayat transaksi' 
              : 'Manage monthly category budgets with 50/30/20 Auto-Budgeting & transaction history'}
          </p>
        </div>

        <button
          onClick={() => setShowAutoBudgetModal(!showAutoBudgetModal)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          <Wand2 className="h-4 w-4" />
          <span>{language === 'id' ? 'Auto Budget 50/30/20' : 'Auto-Budget 50/30/20'}</span>
        </button>
      </div>

      {/* Success Feedback Toast */}
      {autoBudgetSuccessMsg && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{autoBudgetSuccessMsg}</span>
          </div>
          <button
            onClick={() => setAutoBudgetSuccessMsg(null)}
            className="text-emerald-600 dark:text-emerald-400 hover:opacity-80 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Bar with 50/30/20 Split */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {language === 'id' ? 'Total Pagu Anggaran (80%)' : 'Total Monthly Budget (80%)'}
          </p>
          <p className="mt-1 text-xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
            {formatCurrency(totalCurrentBudget, baseCurrency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {language === 'id' ? 'Terpakai:' : 'Spent:'}{' '}
            <span className="font-mono font-semibold text-rose-500 tabular-nums">
              {formatCurrency(totalSpentThisMonth, baseCurrency)}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {language === 'id' ? 'Pagu Kebutuhan Pokok (50%)' : 'Needs Budget (50%)'}
            </p>
            <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 tabular-nums">
              {totalCurrentBudget > 0 ? `${Math.round((currentNeedsBudget / totalCurrentBudget) * 80)}%` : '50%'}
            </span>
          </div>
          <p className="mt-1 text-xl font-extrabold font-mono text-blue-600 dark:text-blue-400 tabular-nums">
            {formatCurrency(currentNeedsBudget, baseCurrency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {language === 'id' ? 'Pangan, sewa, tagihan, transportasi' : 'Food, housing, bills, transport'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {language === 'id' ? 'Pagu Keinginan & Gaya Hidup (30%)' : 'Wants Budget (30%)'}
            </p>
            <span className="text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 tabular-nums">
              {totalCurrentBudget > 0 ? `${Math.round((currentWantsBudget / totalCurrentBudget) * 80)}%` : '30%'}
            </span>
          </div>
          <p className="mt-1 text-xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
            {formatCurrency(currentWantsBudget, baseCurrency)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {language === 'id' ? 'Hiburan, belanja, langganan, liburan' : 'Entertainment, shopping, travel'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {language === 'id' ? 'Target Tabungan & Investasi (20%)' : 'Savings Target (20%)'}
            </p>
            <PiggyBank className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-1 text-xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
            {formatCurrency(
              autoBudgetSummary.savingsTarget20 > 0
                ? autoBudgetSummary.savingsTarget20
                : Math.round(totalCurrentBudget * 0.25),
              baseCurrency
            )}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {language === 'id' ? 'Cadangan wajib 20% dari pemasukan' : '20% reserved from monthly income'}
          </p>
        </div>
      </div>

      {/* Interactive 50/30/20 Auto Budget Panel */}
      {showAutoBudgetModal && (
        <div className="rounded-3xl border border-blue-200 bg-blue-50/40 p-5 sm:p-6 shadow-lg dark:border-blue-900/50 dark:bg-slate-900 space-y-5">
          {/* Panel Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'id' 
                    ? 'Auto Budgeting Cerdas dengan Metode 50/30/20 & Riwayat Transaksi' 
                    : 'Smart Auto-Budgeting with 50/30/20 Rule & Transaction History'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'id'
                    ? 'Membagi pemasukan bulanan menjadi 50% Kebutuhan Pokok, 30% Keinginan, dan menyisihkan 20% Tabungan secara proporsional sesuai pola belanja Anda.'
                    : 'Allocates monthly income into 50% Needs, 30% Wants, and reserves 20% Savings proportionally based on your spending history.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowAutoBudgetModal(false)}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Tutup"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Strategy & Monthly Income Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
            {/* Strategy Segmented Selector */}
            <div className="lg:col-span-7 space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {language === 'id' ? '1. Pilih Metode Auto Budget:' : '1. Select Auto-Budget Method:'}
              </label>
              <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 p-1.5 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setStrategy('rule_50_30_20')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    strategy === 'rule_50_30_20'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {language === 'id' ? 'Rasio 50/30/20 (Ideal)' : '50/30/20 Ratio (Ideal)'}
                </button>
                <button
                  onClick={() => setStrategy('balanced')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    strategy === 'balanced'
                      ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {language === 'id' ? '100% Rata-Rata Riwayat' : '100% Historical Avg'}
                </button>
                <button
                  onClick={() => setStrategy('saver')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    strategy === 'saver'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {language === 'id' ? 'Hemat (-10%)' : 'Saver (-10%)'}
                </button>
                <button
                  onClick={() => setStrategy('flexible')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    strategy === 'flexible'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {language === 'id' ? 'Longgar (+15%)' : 'Flexible (+15%)'}
                </button>
              </div>
            </div>

            {/* Monthly Income Basis Input for 50/30/20 */}
            <div className="lg:col-span-5 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  {language === 'id' ? '2. Basis Pemasukan Bulanan' : '2. Monthly Income Basis'} ({baseCurrency})
                </label>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                  {autoBudgetSummary.detectedHistoricalIncome > 0
                    ? `${language === 'id' ? 'Terdeteksi:' : 'Detected:'} ${formatCurrency(autoBudgetSummary.detectedHistoricalIncome, baseCurrency)}`
                    : autoBudgetSummary.isIncomeEstimatedFromExpenses
                    ? `${language === 'id' ? 'Estimasi dari belanja' : 'Estimated from expenses'}`
                    : ''}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={customIncomeInput}
                  onChange={(e) => setCustomIncomeInput(e.target.value)}
                  placeholder={
                    autoBudgetSummary.referenceIncome > 0
                      ? String(autoBudgetSummary.referenceIncome)
                      : baseCurrency === 'IDR'
                      ? 'Contoh: 10000000'
                      : 'e.g. 3000'
                  }
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-xs font-mono font-bold text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {customIncomeInput && (
                  <button
                    onClick={() => setCustomIncomeInput('')}
                    className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer whitespace-nowrap"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 50 / 30 / 20 Envelope Breakdown Cards */}
          {autoBudgetSummary.referenceIncome > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 50% Needs Envelope */}
              <div className="rounded-2xl border border-blue-200/80 dark:border-blue-900/50 bg-white dark:bg-slate-800/80 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {language === 'id' ? '50% Kebutuhan Pokok (Needs)' : '50% Essential Needs'}
                  </span>
                  <span className="font-mono font-semibold text-slate-500 tabular-nums">
                    Target: {formatCurrency(autoBudgetSummary.needsPool50, baseCurrency)}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(selectedNeedsTotal, baseCurrency)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                    {language === 'id' ? 'Riwayat:' : 'History:'} {formatCurrency(autoBudgetSummary.historicalNeedsAvg, baseCurrency)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, autoBudgetSummary.needsPool50 > 0 ? Math.round((selectedNeedsTotal / autoBudgetSummary.needsPool50) * 100) : 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* 30% Wants Envelope */}
              <div className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-white dark:bg-slate-800/80 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {language === 'id' ? '30% Keinginan (Wants)' : '30% Lifestyle & Wants'}
                  </span>
                  <span className="font-mono font-semibold text-slate-500 tabular-nums">
                    Target: {formatCurrency(autoBudgetSummary.wantsPool30, baseCurrency)}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(selectedWantsTotal, baseCurrency)}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                    {language === 'id' ? 'Riwayat:' : 'History:'} {formatCurrency(autoBudgetSummary.historicalWantsAvg, baseCurrency)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, autoBudgetSummary.wantsPool30 > 0 ? Math.round((selectedWantsTotal / autoBudgetSummary.wantsPool30) * 100) : 100)}%`,
                    }}
                  />
                </div>
              </div>

              {/* 20% Savings Envelope */}
              <div className="rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-white dark:bg-slate-800/80 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {language === 'id' ? '20% Tabungan & Investasi' : '20% Savings & Invest'}
                  </span>
                  <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    20% Protected
                  </span>
                </div>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(
                      Math.max(0, autoBudgetSummary.referenceIncome - totalSuggestedBudget),
                      baseCurrency
                    )}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                    Ideal: {formatCurrency(autoBudgetSummary.savingsTarget20, baseCurrency)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-full" />
                </div>
              </div>
            </div>
          )}

          {/* Checkboxes for Category Scope */}
          <div className="flex flex-wrap items-center gap-4 pt-1">
            {strategy === 'rule_50_30_20' && (
              <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={distributeAllCategories}
                  onChange={(e) => setDistributeAllCategories(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span>
                  {language === 'id'
                    ? 'Alokasikan porsi 50/30/20 ke seluruh 17 kategori (termasuk kategori tanpa riwayat transaksi)'
                    : 'Distribute 50/30/20 across all 17 categories (including categories without history)'}
                </span>
              </label>
            )}

            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={zeroUnusedCategories}
                onChange={(e) => setZeroUnusedCategories(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                {language === 'id'
                  ? 'Nolkan pagu kategori yang tidak dipilih'
                  : 'Set unselected categories to 0'}
              </span>
            </label>
          </div>

          {/* Suggestions List Grouped by 50% Needs and 30% Wants */}
          {autoSuggestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/50 p-8 text-center">
              <History className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {language === 'id'
                  ? 'Belum Ada Transaksi atau Basis Pemasukan'
                  : 'No Transactions or Income Basis Yet'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {language === 'id'
                  ? 'Masukkan nominal pada kolom "2. Basis Pemasukan Bulanan" di atas atau catat transaksi terlebih dahulu untuk menghitung pagu 50/30/20 otomatis.'
                  : 'Enter an amount in "2. Monthly Income Basis" above or record transactions first to calculate 50/30/20 budgets automatically.'}
              </p>
              <button
                onClick={() => {
                  setShowAutoBudgetModal(false);
                  setIsTransactionModalOpen(true);
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t.addTransaction}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Group 1: 50% Needs */}
              {needsSuggestions.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 overflow-hidden">
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-700/70">
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
                      <Layers className="h-3.5 w-3.5" />
                      <span>
                        {language === 'id' ? 'Alokasi 50% Kebutuhan Pokok (Needs)' : '50% Essential Needs Allocation'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      Subtotal: {formatCurrency(selectedNeedsTotal, baseCurrency)}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {needsSuggestions.map((item) => {
                      const cat = categories.find((c) => c.id === item.categoryId);
                      if (!cat) return null;
                      const catName = language === 'en' ? cat.nameEn : cat.name;
                      const isSelected = !deselectedCatIds[item.categoryId];

                      return (
                        <div
                          key={item.categoryId}
                          onClick={() => toggleSelectCategory(item.categoryId)}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 transition-colors cursor-pointer ${
                            isSelected
                              ? 'hover:bg-blue-50/40 dark:hover:bg-slate-800'
                              : 'opacity-50 bg-slate-50 dark:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {catName}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                <span>{item.shareOfGroupPercent}% {language === 'id' ? 'dari porsi Needs' : 'of Needs pool'}</span>
                                <span aria-hidden="true"> · </span>
                                <span>
                                  {language === 'id' ? 'Rata-rata riwayat:' : 'Historical avg:'}{' '}
                                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                                    {formatCurrency(item.historicalAvg, baseCurrency)}
                                  </span>
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs tabular-nums">
                            <span className="text-slate-400 line-through">
                              {formatCurrency(item.currentLimit, baseCurrency)}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                              {formatCurrency(item.suggestedLimit, baseCurrency)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Group 2: 30% Wants */}
              {wantsSuggestions.length > 0 && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 overflow-hidden">
                  <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 px-4 py-2.5 border-b border-slate-200/80 dark:border-slate-700/70">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>
                        {language === 'id' ? 'Alokasi 30% Keinginan & Gaya Hidup (Wants)' : '30% Lifestyle & Wants Allocation'}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                      Subtotal: {formatCurrency(selectedWantsTotal, baseCurrency)}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {wantsSuggestions.map((item) => {
                      const cat = categories.find((c) => c.id === item.categoryId);
                      if (!cat) return null;
                      const catName = language === 'en' ? cat.nameEn : cat.name;
                      const isSelected = !deselectedCatIds[item.categoryId];

                      return (
                        <div
                          key={item.categoryId}
                          onClick={() => toggleSelectCategory(item.categoryId)}
                          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 transition-colors cursor-pointer ${
                            isSelected
                              ? 'hover:bg-indigo-50/40 dark:hover:bg-slate-800'
                              : 'opacity-50 bg-slate-50 dark:bg-slate-900/40'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                            />
                            <span
                              className="h-3 w-3 rounded-full shrink-0"
                              style={{ backgroundColor: cat.color }}
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {catName}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                <span>{item.shareOfGroupPercent}% {language === 'id' ? 'dari porsi Wants' : 'of Wants pool'}</span>
                                <span aria-hidden="true"> · </span>
                                <span>
                                  {language === 'id' ? 'Rata-rata riwayat:' : 'Historical avg:'}{' '}
                                  <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                                    {formatCurrency(item.historicalAvg, baseCurrency)}
                                  </span>
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto font-mono text-xs tabular-nums">
                            <span className="text-slate-400 line-through">
                              {formatCurrency(item.currentLimit, baseCurrency)}
                            </span>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              {formatCurrency(item.suggestedLimit, baseCurrency)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer Apply Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <span>{language === 'id' ? 'Total Rekomendasi Pagu (50% + 30%):' : 'Total Recommended Budget (50% + 30%):'} </span>
                  <span className="font-mono font-extrabold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(totalSuggestedBudget, baseCurrency)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowAutoBudgetModal(false)}
                    className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    onClick={handleApplyAutoBudget}
                    disabled={isApplyingAuto || totalSuggestedBudget === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    <Check className="h-4 w-4" />
                    <span>
                      {isApplyingAuto
                        ? (language === 'id' ? 'Menyimpan...' : 'Applying...')
                        : (language === 'id' ? 'Terapkan Auto Budget 50/30/20' : 'Apply 50/30/20 Auto-Budget')}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filter Bar for Category Grid (All / 50% Needs / 30% Wants) */}
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 dark:bg-slate-900 p-1 border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setGroupFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              groupFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            {language === 'id' ? `Semua Kategori (${expenseCategories.length})` : `All (${expenseCategories.length})`}
          </button>
          <button
            onClick={() => setGroupFilter('needs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              groupFilter === 'needs'
                ? 'bg-white text-blue-600 shadow-xs dark:bg-slate-800 dark:text-blue-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            {language === 'id' ? '50% Kebutuhan Pokok' : '50% Needs'}
          </button>
          <button
            onClick={() => setGroupFilter('wants')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              groupFilter === 'wants'
                ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            {language === 'id' ? '30% Keinginan & Lifestyle' : '30% Wants'}
          </button>
        </div>
      </div>

      {/* Category Budget Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredExpenseCategories.map((cat) => {
          const spent = categorySpending[cat.id] || 0;
          const health = calculateBudgetHealth(spent, cat.monthlyLimit);
          const isEditing = editingId === cat.id;
          const catName = language === 'en' ? cat.nameEn : cat.name;
          const isNeeds = (cat.budgetGroup || 'wants') === 'needs';

          return (
            <div
              key={cat.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {catName}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5 pl-5">
                    {isNeeds
                      ? (language === 'id' ? 'Kelompok: 50% Kebutuhan Pokok' : 'Group: 50% Essential Needs')
                      : (language === 'id' ? 'Kelompok: 30% Keinginan & Gaya Hidup' : 'Group: 30% Wants & Lifestyle')}
                  </p>
                </div>

                {health.status === 'danger' ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-500 shrink-0">
                    <ShieldAlert className="h-4 w-4" />
                    <span>{t.overBudget}</span>
                  </span>
                ) : health.status === 'warning' ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-500 shrink-0">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{t.nearLimit}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500 shrink-0">
                    <CheckCircle className="h-4 w-4" />
                    <span>{t.withinBudget}</span>
                  </span>
                )}
              </div>

              {/* Spending vs Limit */}
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {language === 'id' ? 'Terpakai Bulan Ini' : 'Spent This Month'}
                  </p>
                  <p className="text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(spent, baseCurrency)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-slate-400 font-medium">
                    {language === 'id' ? 'Pagu Bulanan' : 'Monthly Limit'}
                  </p>
                  {isEditing ? (
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        value={editLimitVal}
                        onChange={(e) => setEditLimitVal(e.target.value)}
                        className="h-8 w-28 rounded-lg border border-blue-500 px-2 text-xs font-mono font-bold dark:bg-slate-800 tabular-nums focus:outline-none"
                      />
                      <button
                        onClick={() => handleSaveEdit(cat.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white cursor-pointer"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 justify-end">
                      <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 tabular-nums">
                        {formatCurrency(cat.monthlyLimit, baseCurrency)}
                      </span>
                      <button
                        onClick={() => handleStartEdit(cat.id, cat.monthlyLimit)}
                        className="text-slate-400 hover:text-blue-500 p-1 cursor-pointer"
                        title={language === 'id' ? 'Ubah Batas Pagu' : 'Edit Budget Limit'}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 space-y-1">
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all ${
                      health.status === 'danger'
                        ? 'bg-rose-500'
                        : health.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                    style={{ width: `${Math.min(100, health.percentage)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1 tabular-nums">
                  <span>{health.percentage}% {language === 'id' ? 'terpakai' : 'used'}</span>
                  <span>{language === 'id' ? 'Sisa' : 'Remaining'}: {formatCurrency(health.remaining, baseCurrency)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
