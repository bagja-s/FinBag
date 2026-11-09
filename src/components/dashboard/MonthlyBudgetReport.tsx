import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { 
  formatCurrency, 
  calculateCategorySpending 
} from '../../utils/financeCalculations';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingDown, 
  Target, 
  SlidersHorizontal 
} from 'lucide-react';

export const MonthlyBudgetReport: React.FC = () => {
  const { 
    transactions, 
    categories, 
    baseCurrency, 
    exchangeRates, 
    language, 
    theme,
    setActiveTab 
  } = useFinance();

  const t = getTranslation(language);

  // Generate current month in YYYY-MM
  const currentMonthStr = useMemo(() => new Date().toISOString().slice(0, 7), []);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);
  const [chartFilter, setChartFilter] = useState<'active' | 'all'>('all');

  // Generate the last 12 months for selector
  const availableMonths = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    const date = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
        month: 'long',
        year: 'numeric'
      });
      list.push({ key, label });
    }
    return list;
  }, [language]);

  // Handle previous / next month navigation
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevDate = new Date(year, month - 2, 1);
    setSelectedMonth(prevDate.toISOString().slice(0, 7));
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const nextDate = new Date(year, month, 1);
    const nextStr = nextDate.toISOString().slice(0, 7);
    if (nextStr <= currentMonthStr) {
      setSelectedMonth(nextStr);
    }
  };

  const selectedMonthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
      month: 'long',
      year: 'numeric'
    });
  }, [selectedMonth, language]);

  // Category spending for the selected month
  const categorySpending = useMemo(() => {
    return calculateCategorySpending(
      transactions,
      selectedMonth,
      exchangeRates.rates,
      baseCurrency
    );
  }, [transactions, selectedMonth, exchangeRates.rates, baseCurrency]);

  // Prepare chart and summary comparison data
  const { chartData, activeSpendingData, totalActual, totalBudget, overbudgetItems } = useMemo(() => {
    let actualSum = 0;
    let budgetSum = 0;
    const overList: {
      name: string;
      actual: number;
      limit: number;
      excess: number;
      color: string;
    }[] = [];

    // Filter only expense categories
    const expenseCategories = categories.filter((c) => c.type === 'expense');

    const data = expenseCategories
      .map((cat) => {
        const actual = categorySpending[cat.id] || 0;
        const limit = cat.monthlyLimit || 0;
        const name = language === 'en' ? cat.nameEn : cat.name;

        actualSum += actual;
        budgetSum += limit;

        const isOver = limit > 0 && actual > limit;
        const diff = limit - actual;

        if (isOver) {
          overList.push({
            name,
            actual,
            limit,
            excess: actual - limit,
            color: cat.color || '#F43F5E',
          });
        }

        return {
          id: cat.id,
          name,
          shortName: name.length > 22 ? `${name.slice(0, 20)}…` : name,
          actualSpent: actual,
          budgetLimit: limit,
          difference: diff,
          isOver,
          color: cat.color || '#3B82F6',
        };
      })
      // Only include categories that either have a limit set or have spending this month
      .filter((item) => item.budgetLimit > 0 || item.actualSpent > 0)
      // Sort by highest actualSpent first, then by highest budgetLimit
      .sort((a, b) => {
        if (b.actualSpent !== a.actualSpent) return b.actualSpent - a.actualSpent;
        return b.budgetLimit - a.budgetLimit;
      });

    const activeOnly = data.filter((item) => item.actualSpent > 0);

    return {
      chartData: data,
      activeSpendingData: activeOnly,
      totalActual: actualSum,
      totalBudget: budgetSum,
      overbudgetItems: overList,
    };
  }, [categories, categorySpending, language]);

  const displayedChartData = useMemo(() => {
    if (chartFilter === 'active' && activeSpendingData.length > 0) {
      return activeSpendingData;
    }
    return chartData;
  }, [chartFilter, activeSpendingData, chartData]);

  const variance = totalBudget - totalActual;
  const isOverallOverBudget = totalBudget > 0 && totalActual > totalBudget;
  const overallPercentage = totalBudget > 0 ? Math.round((totalActual / totalBudget) * 100) : 0;

  // Chart theme colors
  const isDark = theme === 'dark';
  const gridColor = isDark ? 'rgba(51, 65, 85, 0.4)' : '#F1F5F9';
  const axisColor = isDark ? '#CBD5E1' : '#475569';

  // Dynamic chart height so vertical category rows never overlap
  const dynamicChartHeight = Math.max(280, displayedChartData.length * 46 + 50);

  // Custom Y-Axis Category Tick so labels never collide or wrap awkwardly
  const renderCategoryTick = (props: any) => {
    const { x, y, payload } = props;
    const labelText: string = payload?.value || '';
    const displayLabel = labelText.length > 22 ? `${labelText.slice(0, 21)}…` : labelText;

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={-8}
          y={0}
          dy={4}
          textAnchor="end"
          fill={axisColor}
          fontSize={11}
          fontWeight={600}
        >
          {displayLabel}
        </text>
      </g>
    );
  };

  // Custom Recharts Tooltip Component
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;

    const actual = data.actualSpent;
    const limit = data.budgetLimit;
    const isOver = data.isOver;
    const diff = Math.abs(data.difference);
    const percent = limit > 0 ? Math.round((actual / limit) * 100) : 0;

    return (
      <div className="rounded-xl border border-slate-200 bg-white/95 p-3.5 shadow-xl backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/95 text-xs min-w-[220px] space-y-2 z-50">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
          <span 
            className="h-3 w-3 rounded-full shrink-0" 
            style={{ backgroundColor: data.color }}
          />
          <span className="font-bold text-slate-900 dark:text-white">
            {data.name}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between items-center gap-4 text-slate-600 dark:text-slate-300">
            <span>{t.actualSpending}:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(actual, baseCurrency)}
            </span>
          </div>
          <div className="flex justify-between items-center gap-4 text-slate-600 dark:text-slate-300">
            <span>{t.budgetLimit}:</span>
            <span className="font-mono font-semibold text-slate-500 dark:text-slate-400 tabular-nums">
              {limit > 0 ? formatCurrency(limit, baseCurrency) : '-'}
            </span>
          </div>
        </div>

        {limit > 0 && (
          <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between font-medium">
              <span className="text-[11px] text-slate-500">
                {isOver ? t.overbudgetBy : t.underbudgetBy}:
              </span>
              <span className={`font-mono text-[11px] font-bold tabular-nums ${
                isOver ? 'text-rose-500' : 'text-emerald-500'
              }`}>
                {isOver ? '+' : '-'}{formatCurrency(diff, baseCurrency)}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
              <span>{language === 'id' ? 'Realisasi' : 'Realization'}</span>
              <span className="font-mono font-bold">{percent}%</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all duration-300">
      {/* Header with Title & Month Stepper */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Calendar className="h-4 w-4" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {t.monthlyReportTitle}
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t.monthlyReportSubtitle}
          </p>
        </div>

        {/* Month Selector & Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {activeSpendingData.length > 0 && activeSpendingData.length < chartData.length && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/60">
              <button
                onClick={() => setChartFilter('active')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  chartFilter === 'active'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {language === 'id' ? `Aktif (${activeSpendingData.length})` : `Active (${activeSpendingData.length})`}
              </button>
              <button
                onClick={() => setChartFilter('all')}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  chartFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                {language === 'id' ? `Semua (${chartData.length})` : `All (${chartData.length})`}
              </button>
            </div>
          )}

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/60 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-inner">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
              title={t.prevMonth}
              aria-label={t.prevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-medium text-xs text-slate-800 dark:text-slate-200 px-2 py-1 outline-none cursor-pointer text-center font-mono"
              aria-label={t.selectMonth}
            >
              {availableMonths.map((m) => (
                <option key={m.key} value={m.key} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                  {m.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleNextMonth}
              disabled={selectedMonth >= currentMonthStr}
              className={`p-1.5 rounded-xl transition-colors ${
                selectedMonth >= currentMonthStr
                  ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                  : 'hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer'
              }`}
              title={t.nextMonth}
              aria-label={t.nextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('budgets')}
            className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-blue-400 dark:hover:bg-slate-700/70 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Target className="h-3.5 w-3.5" />
            <span>{t.configureBudgets}</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards Strip */}
      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Actual Spending */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">{t.actualSpending}</span>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {formatCurrency(totalActual, baseCurrency)}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {selectedMonthLabel}
          </div>
        </div>

        {/* 2. Total Budget Limit */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">{t.totalBudget}</span>
            <Target className="h-4 w-4 text-blue-500" />
          </div>
          <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white font-mono tabular-nums">
            {totalBudget > 0 ? formatCurrency(totalBudget, baseCurrency) : '-'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{totalBudget > 0 ? `${overallPercentage}% ${language === 'id' ? 'terpakai' : 'utilized'}` : t.noBudgetsConfigured}</span>
          </div>
        </div>

        {/* 3. Variance / Budget Deficit */}
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30 p-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">
              {isOverallOverBudget ? t.overbudgetTotal : t.remainingBudget}
            </span>
            {isOverallOverBudget ? (
              <AlertTriangle className="h-4 w-4 text-rose-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            )}
          </div>
          <div className={`mt-2 text-xl font-extrabold font-mono tabular-nums ${
            isOverallOverBudget ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}>
            {totalBudget > 0 ? (
              `${isOverallOverBudget ? '-' : '+'}${formatCurrency(Math.abs(variance), baseCurrency)}`
            ) : (
              formatCurrency(totalActual, baseCurrency)
            )}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`inline-flex items-center text-[11px] font-semibold ${
              isOverallOverBudget 
                ? 'text-rose-600 dark:text-rose-400' 
                : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {isOverallOverBudget ? t.overBudget : t.withinBudget}
            </span>
          </div>
        </div>
      </div>

      {/* Overbudget Warning Alert Strip */}
      {overbudgetItems.length > 0 && (
        <div className="mt-4 rounded-2xl bg-rose-50 border border-rose-200/80 p-3.5 dark:bg-rose-950/30 dark:border-rose-900/50 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
              {t.overbudgetAlertTitle}: {overbudgetItems.length} {t.overbudgetAlertDesc}
            </h4>
            <div className="mt-2 flex flex-wrap gap-2">
              {overbudgetItems.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-xl bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800"
                >
                  <span className="font-bold">{item.name}</span>
                  <span className="font-mono text-rose-600 dark:text-rose-300 tabular-nums">
                    +{formatCurrency(item.excess, baseCurrency)}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recharts Horizontal Grouped Bar Chart (Prevents Category Label Overlapping) */}
      <div className="mt-6">
        {displayedChartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
            <SlidersHorizontal className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t.noExpenseThisMonth}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
              {language === 'id' 
                ? 'Catat transaksi pengeluaran baru atau atur pagu anggaran kategori untuk melihat visualisasi perbandingan di sini.' 
                : 'Record new expenses or set up category budget limits to view the comparison chart here.'}
            </p>
            <button
              onClick={() => setActiveTab('budgets')}
              className="mt-3 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              {t.configureBudgets} →
            </button>
          </div>
        ) : (
          <div className="w-full" style={{ height: `${dynamicChartHeight}px` }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={displayedChartData}
                layout="vertical"
                margin={{ top: 12, right: 20, left: 10, bottom: 12 }}
                barGap={4}
                barCategoryGap="22%"
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={true} stroke={gridColor} />
                <XAxis 
                  type="number"
                  tick={{ fill: axisColor, fontSize: 10 }}
                  axisLine={{ stroke: gridColor }}
                  tickLine={false}
                  tickFormatter={(val) => {
                    if (val >= 1000000) {
                      return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}M`;
                    }
                    if (val >= 1000) {
                      return `${(val / 1000).toFixed(0)}k`;
                    }
                    return String(val);
                  }}
                />
                <YAxis 
                  type="category"
                  dataKey="name"
                  width={155}
                  tick={renderCategoryTick}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }} />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ paddingBottom: 14, fontSize: 11 }}
                  formatter={(value) => {
                    const label = value === 'actualSpent' ? t.actualSpending : t.budgetLimit;
                    return <span className="text-slate-600 dark:text-slate-300 font-medium ml-1 mr-3">{label}</span>;
                  }}
                />
                
                {/* Bar 1: Actual Spending */}
                <Bar 
                  dataKey="actualSpent" 
                  name="actualSpent"
                  radius={[0, 6, 6, 0]}
                  barSize={12}
                >
                  {displayedChartData.map((entry, index) => (
                    <Cell 
                      key={`actual-cell-${index}`} 
                      fill={entry.isOver ? '#F43F5E' : '#3B82F6'} 
                    />
                  ))}
                </Bar>

                {/* Bar 2: Budget Limit */}
                <Bar 
                  dataKey="budgetLimit" 
                  name="budgetLimit"
                  fill={isDark ? '#475569' : '#94A3B8'} 
                  radius={[0, 6, 6, 0]}
                  barSize={12}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Footer Insight / Tip */}
      {displayedChartData.length > 0 && overbudgetItems.length === 0 && totalBudget > 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-50 border border-emerald-200/80 p-3 text-xs text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{t.budgetHealthyDesc}</span>
        </div>
      )}
    </div>
  );
};
