import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { 
  formatCurrency, 
  calculateCategorySpending, 
  calculateBudgetHealth,
  calculateAutoBudgetSuggestions,
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
  Plus
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

  // Auto Budget state
  const [showAutoBudgetModal, setShowAutoBudgetModal] = useState(false);
  const [strategy, setStrategy] = useState<AutoBudgetStrategy>('balanced');
  const [zeroUnusedCategories, setZeroUnusedCategories] = useState(false);
  const [deselectedCatIds, setDeselectedCatIds] = useState<Record<string, boolean>>({});
  const [isApplyingAuto, setIsApplyingAuto] = useState(false);
  const [autoBudgetSuccessMsg, setAutoBudgetSuccessMsg] = useState<string | null>(null);

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const categorySpending = calculateCategorySpending(transactions, currentMonthStr, exchangeRates.rates, baseCurrency);

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // Compute Auto Budget suggestions based on past transactions
  const autoSuggestions = useMemo(() => {
    return calculateAutoBudgetSuggestions(
      transactions,
      categories,
      currentMonthStr,
      strategy,
      exchangeRates.rates,
      baseCurrency
    );
  }, [transactions, categories, currentMonthStr, strategy, exchangeRates.rates, baseCurrency]);

  const totalSuggestedBudget = useMemo(() => {
    return autoSuggestions.reduce((acc, item) => {
      if (deselectedCatIds[item.categoryId]) return acc;
      return acc + item.suggestedLimit;
    }, 0);
  }, [autoSuggestions, deselectedCatIds]);

  const totalCurrentBudget = useMemo(() => {
    return expenseCategories.reduce((sum, c) => sum + (c.monthlyLimit || 0), 0);
  }, [expenseCategories]);

  const totalSpentThisMonth = useMemo(() => {
    return Object.values(categorySpending).reduce((sum, v) => sum + v, 0);
  }, [categorySpending]);

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
            ? `Auto Budget berhasil diterapkan pada ${updatedCount} kategori berdasarkan riwayat transaksi Anda.`
            : `Auto Budget successfully applied to ${updatedCount} categories based on your transaction history.`
        );
        setTimeout(() => setAutoBudgetSuccessMsg(null), 5000);
      }
      setShowAutoBudgetModal(false);
    } finally {
      setIsApplyingAuto(false);
    }
  };

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
              ? 'Kontrol pagu pengeluaran bulanan per kategori atau hitung otomatis dari riwayat transaksi' 
              : 'Control monthly spending limits per category or auto-calculate from past transactions'}
          </p>
        </div>

        <button
          onClick={() => setShowAutoBudgetModal(!showAutoBudgetModal)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 active:scale-95 transition-all cursor-pointer self-start sm:self-auto whitespace-nowrap"
        >
          <Wand2 className="h-4 w-4" />
          <span>{language === 'id' ? 'Auto Budget dari Transaksi' : 'Auto-Budget from History'}</span>
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

      {/* Summary KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {language === 'id' ? 'Total Pagu Anggaran Bulanan' : 'Total Monthly Budget'}
          </p>
          <p className="mt-1 text-xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
            {formatCurrency(totalCurrentBudget, baseCurrency)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {language === 'id' ? 'Total Terpakai Bulan Ini' : 'Total Spent This Month'}
          </p>
          <p className="mt-1 text-xl font-extrabold font-mono text-rose-600 dark:text-rose-400 tabular-nums">
            {formatCurrency(totalSpentThisMonth, baseCurrency)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            {language === 'id' ? 'Sisa Pagu Keseluruhan' : 'Total Remaining Budget'}
          </p>
          <p className={`mt-1 text-xl font-extrabold font-mono tabular-nums ${
            totalCurrentBudget - totalSpentThisMonth < 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {formatCurrency(Math.max(0, totalCurrentBudget - totalSpentThisMonth), baseCurrency)}
          </p>
        </div>
      </div>

      {/* Interactive Auto Budget Panel */}
      {showAutoBudgetModal && (
        <div className="rounded-3xl border border-blue-200 bg-blue-50/40 p-5 sm:p-6 shadow-lg dark:border-blue-900/50 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
                <Wand2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'id' 
                    ? 'Rekomendasi Auto Budget Berdasarkan Transaksi Sebelumnya' 
                    : 'Auto-Budget Recommendations Based on Past Transactions'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {language === 'id'
                    ? 'Sistem menganalisis rata-rata pengeluaran historis Anda per kategori dan membulatkan nominal pagu secara cerdas.'
                    : 'Analyzes your historical spending per category and calculates smart rounded monthly limits.'}
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

          {/* Strategy Selector */}
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                {language === 'id' ? 'Pilih Strategi Perhitungan:' : 'Select Calculation Strategy:'}
              </label>
              <div className="inline-flex flex-wrap items-center gap-1.5 rounded-xl bg-white dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setStrategy('saver')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    strategy === 'saver'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {language === 'id' ? 'Mode Hemat (-10%)' : 'Saver Mode (-10%)'}
                </button>
                <button
                  onClick={() => setStrategy('balanced')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    strategy === 'balanced'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {language === 'id' ? 'Sesuai Rata-Rata (100%)' : 'Historical Average (100%)'}
                </button>
                <button
                  onClick={() => setStrategy('flexible')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    strategy === 'flexible'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {language === 'id' ? 'Mode Aman (+15% Buffer)' : 'Safe Buffer (+15%)'}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={zeroUnusedCategories}
                onChange={(e) => setZeroUnusedCategories(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span>
                {language === 'id'
                  ? 'Nolkan pagu kategori yang belum pernah dipakai'
                  : 'Set unused categories to 0'}
              </span>
            </label>
          </div>

          {/* Suggestions List */}
          {autoSuggestions.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-800/50 p-8 text-center">
              <History className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {language === 'id'
                  ? 'Belum Ada Riwayat Transaksi Pengeluaran'
                  : 'No Expense Transaction History Yet'}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {language === 'id'
                  ? 'Catat minimal beberapa transaksi pengeluaran terlebih dahulu agar fitur Auto Budget dapat menghitung estimasi pagu bulanan otomatis untuk Anda.'
                  : 'Record some expense transactions first so Auto Budget can calculate monthly budget limits from your spending patterns.'}
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
            <>
              <div className="mt-4 divide-y divide-slate-200/70 dark:divide-slate-800 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 overflow-hidden">
                {autoSuggestions.map((item) => {
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
                            {item.txCount} {language === 'id' ? 'transaksi' : 'txs'} · {language === 'id' ? 'Rata-rata riwayat:' : 'Historical avg:'}{' '}
                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                              {formatCurrency(item.historicalAvg, baseCurrency)}
                            </span>
                            {item.lastMonthSpent > 0 && (
                              <>
                                {' '}· {language === 'id' ? 'Bulan lalu:' : 'Last mo:'}{' '}
                                <span className="font-mono tabular-nums">
                                  {formatCurrency(item.lastMonthSpent, baseCurrency)}
                                </span>
                              </>
                            )}
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

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  <span>{language === 'id' ? 'Total Estimasi Auto Budget:' : 'Total Suggested Auto-Budget:'} </span>
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
                        : (language === 'id' ? 'Terapkan Auto Budget Sekarang' : 'Apply Auto-Budget Now')}
                    </span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Category Budget Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {expenseCategories.map((cat) => {
          const spent = categorySpending[cat.id] || 0;
          const health = calculateBudgetHealth(spent, cat.monthlyLimit);
          const isEditing = editingId === cat.id;
          const catName = language === 'en' ? cat.nameEn : cat.name;

          return (
            <div
              key={cat.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {catName}
                  </span>
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
