import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency, calculateCategorySpending, calculateBudgetHealth } from '../../utils/financeCalculations';
import { PieChart, AlertTriangle, CheckCircle, ShieldAlert, Edit2, Check } from 'lucide-react';

export const BudgetsView: React.FC = () => {
  const { 
    categories, 
    transactions, 
    baseCurrency, 
    exchangeRates, 
    updateBudgetLimit, 
    language 
  } = useFinance();

  const t = getTranslation(language);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLimitVal, setEditLimitVal] = useState<string>('');

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const categorySpending = calculateCategorySpending(transactions, currentMonthStr, exchangeRates.rates, baseCurrency);

  const expenseCategories = categories.filter((c) => c.type === 'expense');

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

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <PieChart className="h-5 w-5 text-blue-500" />
          <span>{t.budgetStatus}</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {language === 'id' ? 'Kontrol pagu pengeluaran bulanan per kategori dan hindari overbudget' : 'Control monthly spending limits per category and avoid overbudgeting'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="flex items-center gap-2.5">
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {catName}
                  </span>
                </div>

                {health.status === 'danger' ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-rose-500">
                    <ShieldAlert className="h-4 w-4" />
                    <span>{t.overBudget}</span>
                  </span>
                ) : health.status === 'warning' ? (
                  <span className="flex items-center gap-1 text-xs font-bold text-amber-500">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{t.nearLimit}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-500">
                    <CheckCircle className="h-4 w-4" />
                    <span>{t.withinBudget}</span>
                  </span>
                )}
              </div>

              {/* Spending vs Limit */}
              <div className="mt-4 flex items-end justify-between">
                <div>
                  <p className="text-[11px] text-slate-400 font-medium">Terpakai Bulan Ini</p>
                  <p className="text-lg font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(spent, baseCurrency)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[11px] text-slate-400 font-medium">Pagu Bulanan</p>
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
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white"
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
                        className="text-slate-400 hover:text-blue-500 p-1"
                        title="Ubah Batas Pagu"
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
                <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                  <span>{health.percentage}% terpakai</span>
                  <span>Sisa: {formatCurrency(health.remaining, baseCurrency)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
