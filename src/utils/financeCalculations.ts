import { 
  SupportedCurrency, 
  WalletAccount, 
  Transaction, 
  BudgetCategory,
  RecurringFrequency,
  RecurringTransaction,
  SavingsGoal,
  DebtRecord
} from '../types/finance';
import { CURRENCY_METADATA, FALLBACK_RATES_FROM_USD, convertCurrency } from '../services/currencyService';

let globalPrivacyMask = false;

export function setGlobalPrivacyMask(masked: boolean): void {
  globalPrivacyMask = masked;
}

export function isGlobalPrivacyMaskEnabled(): boolean {
  return globalPrivacyMask;
}

export function formatCurrency(
  amount: number, 
  currency: SupportedCurrency = 'IDR',
  showSymbol: boolean = true,
  forceUnmasked: boolean = false
): string {
  const meta = CURRENCY_METADATA[currency] || CURRENCY_METADATA.IDR;
  const isNegative = amount < 0;
  const sign = isNegative ? '-' : '';

  if (globalPrivacyMask && !forceUnmasked) {
    if (!showSymbol) return '•••••••';
    return currency === 'IDR' ? `${sign}Rp •••••••` : `${sign}${meta.symbol}••••••`;
  }

  const absAmount = Math.abs(amount);

  let formattedNumber: string;
  if (meta.decimals === 0) {
    formattedNumber = Math.round(absAmount).toLocaleString('id-ID');
  } else {
    formattedNumber = absAmount.toLocaleString('en-US', {
      minimumFractionDigits: meta.decimals,
      maximumFractionDigits: meta.decimals,
    });
  }

  if (!showSymbol) {
    return `${sign}${formattedNumber}`;
  }
  
  if (currency === 'IDR') {
    return `${sign}Rp ${formattedNumber}`;
  }
  return `${sign}${meta.symbol}${formattedNumber}`;
}

export function calculateNetWorth(
  wallets: WalletAccount[],
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  targetCurrency: SupportedCurrency = 'IDR'
): number {
  return wallets.reduce((total, wallet) => {
    const converted = convertCurrency(wallet.balance, wallet.currency, targetCurrency, ratesFromUsd);
    return total + converted;
  }, 0);
}

export function calculateMonthlyCashFlow(
  transactions: Transaction[],
  monthStr: string, // YYYY-MM
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  targetCurrency: SupportedCurrency = 'IDR'
): { income: number; expense: number; net: number } {
  let income = 0;
  let expense = 0;

  transactions.forEach((tx) => {
    if (tx.date.startsWith(monthStr)) {
      const converted = convertCurrency(tx.amount, tx.currency, targetCurrency, ratesFromUsd);
      if (tx.type === 'income') {
        income += converted;
      } else if (tx.type === 'expense') {
        expense += converted;
      }
      // Note: 'transfer' does not count as income or expense
    }
  });

  return {
    income,
    expense,
    net: income - expense,
  };
}

export function calculateCategorySpending(
  transactions: Transaction[],
  monthStr: string, // YYYY-MM
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  targetCurrency: SupportedCurrency = 'IDR'
): Record<string, number> {
  const spendingMap: Record<string, number> = {};

  transactions.forEach((tx) => {
    if (tx.date.startsWith(monthStr) && tx.type === 'expense' && tx.categoryId) {
      const converted = convertCurrency(tx.amount, tx.currency, targetCurrency, ratesFromUsd);
      spendingMap[tx.categoryId] = (spendingMap[tx.categoryId] || 0) + converted;
    }
  });

  return spendingMap;
}

export interface BudgetHealth {
  spent: number;
  limit: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
  remaining: number;
}

export function calculateBudgetHealth(spent: number, limit: number): BudgetHealth {
  if (limit <= 0) {
    return {
      spent,
      limit: 0,
      percentage: spent > 0 ? 100 : 0,
      status: spent > 0 ? 'danger' : 'safe',
      remaining: 0,
    };
  }

  const percentage = Math.min(Math.round((spent / limit) * 100), 999);
  let status: 'safe' | 'warning' | 'danger' = 'safe';

  if (percentage >= 100) {
    status = 'danger';
  } else if (percentage >= 80) {
    status = 'warning';
  }

  return {
    spent,
    limit,
    percentage,
    status,
    remaining: Math.max(0, limit - spent),
  };
}

export interface Rule503020Result {
  totalIncome: number;
  totalExpense: number;
  needsAmount: number;
  wantsAmount: number;
  savingsAmount: number;
  needsPercentage: number;
  wantsPercentage: number;
  savingsPercentage: number;
  healthScore: number; // 0 - 100
}

export function calculate503020Rule(
  transactions: Transaction[],
  categories: BudgetCategory[],
  monthStr: string,
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  targetCurrency: SupportedCurrency = 'IDR'
): Rule503020Result {
  const categoryGroupMap = new Map<string, 'needs' | 'wants' | 'savings'>();
  categories.forEach((cat) => {
    categoryGroupMap.set(cat.id, cat.budgetGroup || 'wants');
  });

  let totalIncome = 0;
  let totalExpense = 0;
  let needsAmount = 0;
  let wantsAmount = 0;
  let savingsAmount = 0;

  transactions.forEach((tx) => {
    if (tx.date.startsWith(monthStr)) {
      const converted = convertCurrency(tx.amount, tx.currency, targetCurrency, ratesFromUsd);
      if (tx.type === 'income') {
        totalIncome += converted;
      } else if (tx.type === 'expense') {
        totalExpense += converted;
        const group = tx.categoryId ? categoryGroupMap.get(tx.categoryId) || 'wants' : 'wants';
        if (group === 'needs') {
          needsAmount += converted;
        } else if (group === 'savings') {
          savingsAmount += converted;
        } else {
          wantsAmount += converted;
        }
      }
    }
  });

  // Calculate actual savings as (Income - Expense) if positive
  const netSavings = Math.max(0, totalIncome - totalExpense);
  const effectiveSavings = savingsAmount + netSavings;

  const baseForPct = totalIncome > 0 ? totalIncome : totalExpense > 0 ? totalExpense : 1;
  const needsPercentage = Math.round((needsAmount / baseForPct) * 100);
  const wantsPercentage = Math.round((wantsAmount / baseForPct) * 100);
  const savingsPercentage = Math.round((effectiveSavings / baseForPct) * 100);

  // Score calculation:
  // Ideal: Needs <= 50%, Wants <= 30%, Savings >= 20%
  let score = 100;
  if (needsPercentage > 50) score -= (needsPercentage - 50) * 1.5;
  if (wantsPercentage > 30) score -= (wantsPercentage - 30) * 1.5;
  if (savingsPercentage < 20) score -= (20 - savingsPercentage) * 2;
  score = Math.max(10, Math.min(100, Math.round(score)));

  return {
    totalIncome,
    totalExpense,
    needsAmount,
    wantsAmount,
    savingsAmount: effectiveSavings,
    needsPercentage,
    wantsPercentage,
    savingsPercentage,
    healthScore: score,
  };
}

export interface SplitBillResult {
  subtotal: number;
  taxAmount: number;
  serviceAmount: number;
  grandTotal: number;
  perPerson: number;
}

export function calculateSplitBill(
  totalBill: number,
  taxPercent: number = 0,
  servicePercent: number = 0,
  numPeople: number = 1
): SplitBillResult {
  const safePeople = Math.max(1, Math.round(numPeople));
  const taxAmount = (totalBill * Math.max(0, taxPercent)) / 100;
  const serviceAmount = (totalBill * Math.max(0, servicePercent)) / 100;
  const grandTotal = totalBill + taxAmount + serviceAmount;
  const perPerson = Math.ceil(grandTotal / safePeople);

  return {
    subtotal: totalBill,
    taxAmount,
    serviceAmount,
    grandTotal,
    perPerson,
  };
}

export function sortTransactionsNewestFirst(a: Transaction, b: Transaction): number {
  const dateDiff = (b.date || '').localeCompare(a.date || '');
  if (dateDiff !== 0) return dateDiff;
  const timeA = a.createdAt || a.id || '';
  const timeB = b.createdAt || b.id || '';
  return timeB.localeCompare(timeA);
}

export function filterTransactionsList(
  transactions: Transaction[],
  filters: {
    query?: string;
    walletId?: string;
    categoryId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
  }
): Transaction[] {
  return transactions
    .filter((tx) => {
      if (filters.query) {
        const q = filters.query.toLowerCase();
        const matchDesc = tx.description.toLowerCase().includes(q);
        const matchNotes = tx.notes ? tx.notes.toLowerCase().includes(q) : false;
        if (!matchDesc && !matchNotes) return false;
      }
      if (filters.walletId && filters.walletId !== 'all') {
        if (tx.sourceWalletId !== filters.walletId && tx.targetWalletId !== filters.walletId) {
          return false;
        }
      }
      if (filters.categoryId && filters.categoryId !== 'all') {
        if (tx.categoryId !== filters.categoryId) return false;
      }
      if (filters.type && filters.type !== 'all') {
        if (tx.type !== filters.type) return false;
      }
      if (filters.startDate && tx.date < filters.startDate) {
        return false;
      }
      if (filters.endDate && tx.date > filters.endDate) {
        return false;
      }
      return true;
    })
    .sort(sortTransactionsNewestFirst);
}

export interface TransactionDateGroup {
  date: string;
  transactions: Transaction[];
  dailyIncome: number;
  dailyExpense: number;
}

export function groupTransactionsByDate(
  transactions: Transaction[],
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  targetCurrency: SupportedCurrency = 'IDR'
): TransactionDateGroup[] {
  const sorted = [...transactions].sort(sortTransactionsNewestFirst);
  const groupsMap = new Map<string, TransactionDateGroup>();

  sorted.forEach((tx) => {
    const dateKey = tx.date || 'Unknown';
    let group = groupsMap.get(dateKey);
    if (!group) {
      group = {
        date: dateKey,
        transactions: [],
        dailyIncome: 0,
        dailyExpense: 0,
      };
      groupsMap.set(dateKey, group);
    }
    group.transactions.push(tx);

    const converted = convertCurrency(tx.amount, tx.currency, targetCurrency, ratesFromUsd);
    if (tx.type === 'income') {
      group.dailyIncome += converted;
    } else if (tx.type === 'expense') {
      group.dailyExpense += converted;
    }
  });

  return Array.from(groupsMap.values());
}

export type AutoBudgetStrategy = 'rule_50_30_20' | 'saver' | 'balanced' | 'flexible';

export interface AutoBudgetSuggestion {
  categoryId: string;
  budgetGroup: 'needs' | 'wants' | 'savings';
  historicalAvg: number;
  lastMonthSpent: number;
  currentMonthSpent: number;
  activeMonthsCount: number;
  currentLimit: number;
  suggestedLimit: number;
  shareOfGroupPercent: number;
  txCount: number;
}

export interface AutoBudgetOptions {
  customMonthlyIncome?: number;
  distributeAllCategories?: boolean;
}

export interface AutoBudget503020Summary {
  referenceIncome: number;
  detectedHistoricalIncome: number;
  isIncomeEstimatedFromExpenses: boolean;
  needsPool50: number;
  wantsPool30: number;
  savingsTarget20: number;
  suggestedNeedsTotal: number;
  suggestedWantsTotal: number;
  historicalNeedsAvg: number;
  historicalWantsAvg: number;
  suggestions: AutoBudgetSuggestion[];
}

// Default benchmark weights within Needs (sum = 100) and Wants (sum = 100)
const DEFAULT_NEEDS_WEIGHTS: Record<string, number> = {
  food: 25,
  housing: 22,
  groceries: 18,
  transport: 12,
  utilities: 10,
  health: 5,
  education: 4,
  family: 2,
  taxes_fees: 2,
};

const DEFAULT_WANTS_WEIGHTS: Record<string, number> = {
  shopping: 24,
  entertainment: 18,
  subscription: 14,
  personal_care: 12,
  travel: 12,
  charity: 10,
  pet: 5,
  other_expense: 5,
};

function roundBudgetAmount(amount: number, currency: SupportedCurrency): number {
  if (amount <= 0) return 0;
  if (currency === 'IDR') {
    if (amount < 50000) return Math.ceil(amount / 5000) * 5000;
    if (amount < 500000) return Math.ceil(amount / 10000) * 10000;
    return Math.ceil(amount / 25000) * 25000;
  }
  if (currency === 'JPY') {
    return Math.ceil(amount / 500) * 500;
  }
  if (amount < 20) return Math.ceil(amount);
  return Math.ceil(amount / 5) * 5;
}

export function calculateAverageMonthlyIncome(
  transactions: Transaction[],
  currentMonthStr: string,
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  targetCurrency: SupportedCurrency = 'IDR'
): number {
  const monthTotals = new Map<string, number>();

  transactions.forEach((tx) => {
    if (tx.type !== 'income' || !tx.date) return;
    const mKey = tx.date.slice(0, 7);
    const converted = convertCurrency(tx.amount, tx.currency, targetCurrency, ratesFromUsd);
    monthTotals.set(mKey, (monthTotals.get(mKey) || 0) + converted);
  });

  if (monthTotals.size === 0) return 0;

  const pastMonths: number[] = [];
  monthTotals.forEach((val, mKey) => {
    if (mKey < currentMonthStr && val > 0) {
      pastMonths.push(val);
    }
  });

  const currentMoIncome = monthTotals.get(currentMonthStr) || 0;
  if (pastMonths.length > 0 && currentMoIncome > 0) {
    const all = [...pastMonths, currentMoIncome];
    return Math.round(all.reduce((a, b) => a + b, 0) / all.length);
  }
  if (pastMonths.length > 0) {
    return Math.round(pastMonths.reduce((a, b) => a + b, 0) / pastMonths.length);
  }
  return Math.round(currentMoIncome);
}

export function calculateAutoBudget503020Summary(
  transactions: Transaction[],
  categories: BudgetCategory[],
  currentMonthStr: string, // YYYY-MM
  strategy: AutoBudgetStrategy = 'rule_50_30_20',
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  targetCurrency: SupportedCurrency = 'IDR',
  options?: AutoBudgetOptions
): AutoBudget503020Summary {
  const [yr, mo] = currentMonthStr.split('-').map(Number);
  const prevDate = new Date(yr, mo - 2, 1);
  const lastMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  // Map: categoryId -> Map<monthStr, totalInTargetCurrency>
  const catMonthTotals = new Map<string, Map<string, number>>();
  const catTxCounts = new Map<string, number>();

  transactions.forEach((tx) => {
    if (tx.type !== 'expense' || !tx.categoryId || !tx.date) return;
    const monthKey = tx.date.slice(0, 7);
    const converted = convertCurrency(tx.amount, tx.currency, targetCurrency, ratesFromUsd);

    if (!catMonthTotals.has(tx.categoryId)) {
      catMonthTotals.set(tx.categoryId, new Map());
    }
    const monthMap = catMonthTotals.get(tx.categoryId)!;
    monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + converted);
    catTxCounts.set(tx.categoryId, (catTxCounts.get(tx.categoryId) || 0) + 1);
  });

  // Compute historical monthly average per category
  const catStats = new Map<
    string,
    {
      historicalAvg: number;
      lastMonthSpent: number;
      currentMonthSpent: number;
      activeMonthsCount: number;
      txCount: number;
    }
  >();

  let historicalNeedsAvg = 0;
  let historicalWantsAvg = 0;

  expenseCategories.forEach((cat) => {
    const monthMap = catMonthTotals.get(cat.id);
    const txCount = catTxCounts.get(cat.id) || 0;
    const currentMonthSpent = monthMap?.get(currentMonthStr) || 0;
    const lastMonthSpent = monthMap?.get(lastMonthStr) || 0;

    const pastMonths: number[] = [];
    monthMap?.forEach((val, mKey) => {
      if (mKey < currentMonthStr && val > 0) {
        pastMonths.push(val);
      }
    });

    let baseAvg = 0;
    let activeMonthsCount = 0;

    if (pastMonths.length > 0 && currentMonthSpent > 0) {
      const allActive = [...pastMonths, currentMonthSpent];
      baseAvg = allActive.reduce((s, v) => s + v, 0) / allActive.length;
      activeMonthsCount = allActive.length;
    } else if (pastMonths.length > 0) {
      baseAvg = pastMonths.reduce((s, v) => s + v, 0) / pastMonths.length;
      activeMonthsCount = pastMonths.length;
    } else if (currentMonthSpent > 0) {
      baseAvg = currentMonthSpent;
      activeMonthsCount = 1;
    }

    catStats.set(cat.id, {
      historicalAvg: baseAvg,
      lastMonthSpent,
      currentMonthSpent,
      activeMonthsCount,
      txCount,
    });

    const group = cat.budgetGroup || 'wants';
    if (group === 'needs') {
      historicalNeedsAvg += baseAvg;
    } else {
      historicalWantsAvg += baseAvg;
    }
  });

  // Determine reference monthly income for 50/30/20 calculation
  const detectedHistoricalIncome = calculateAverageMonthlyIncome(
    transactions,
    currentMonthStr,
    ratesFromUsd,
    targetCurrency
  );

  const totalHistoricalExpenseAvg = historicalNeedsAvg + historicalWantsAvg;
  let referenceIncome = 0;
  let isIncomeEstimatedFromExpenses = false;

  if (options?.customMonthlyIncome && options.customMonthlyIncome > 0) {
    referenceIncome = options.customMonthlyIncome;
  } else if (detectedHistoricalIncome > 0) {
    referenceIncome = detectedHistoricalIncome;
  } else if (totalHistoricalExpenseAvg > 0) {
    // Derive implied monthly income assuming historical expenses represent 80% (50% Needs + 30% Wants)
    referenceIncome = Math.round(totalHistoricalExpenseAvg / 0.8);
    isIncomeEstimatedFromExpenses = true;
  }

  const needsPool50 = Math.round(referenceIncome * 0.5);
  const wantsPool30 = Math.round(referenceIncome * 0.3);
  const savingsTarget20 = Math.round(referenceIncome * 0.2);

  const suggestions: AutoBudgetSuggestion[] = [];
  const distributeAll = Boolean(options?.distributeAllCategories);

  if (strategy === 'rule_50_30_20') {
    const needsCats = expenseCategories.filter((c) => (c.budgetGroup || 'wants') === 'needs');
    const wantsCats = expenseCategories.filter((c) => (c.budgetGroup || 'wants') !== 'needs');

    // Helper to allocate a pool (50% Needs or 30% Wants) across categories
    const allocatePool = (
      groupCats: BudgetCategory[],
      poolAmount: number,
      groupTotalHistAvg: number,
      defaultWeights: Record<string, number>,
      groupType: 'needs' | 'wants'
    ) => {
      if (poolAmount <= 0) return;

      // Determine weights for each category in this group
      const weights = new Map<string, number>();
      let totalWeight = 0;

      const usePureHistory = groupTotalHistAvg > 0 && !distributeAll;

      groupCats.forEach((cat) => {
        const st = catStats.get(cat.id);
        const hist = st?.historicalAvg || 0;
        const defW = defaultWeights[cat.id] || 5;

        let w = 0;
        if (usePureHistory) {
          w = hist > 0 ? hist / groupTotalHistAvg : 0;
        } else if (groupTotalHistAvg > 0 && distributeAll) {
          // Blend 70% historical share + 30% default benchmark weight so all categories get a sensible allocation
          const histShare = (hist / groupTotalHistAvg) * 100;
          w = histShare * 0.7 + defW * 0.3;
        } else {
          // No historical transactions in this group yet: use default benchmark weights
          w = defW;
        }

        if (w > 0) {
          weights.set(cat.id, w);
          totalWeight += w;
        }
      });

      if (totalWeight <= 0) return;

      groupCats.forEach((cat) => {
        const w = weights.get(cat.id) || 0;
        if (w <= 0) return;
        const shareRatio = w / totalWeight;
        const rawTarget = poolAmount * shareRatio;
        const suggestedLimit = roundBudgetAmount(rawTarget, targetCurrency);
        const st = catStats.get(cat.id)!;

        if (suggestedLimit > 0) {
          suggestions.push({
            categoryId: cat.id,
            budgetGroup: groupType,
            historicalAvg: Math.round(st.historicalAvg),
            lastMonthSpent: Math.round(st.lastMonthSpent),
            currentMonthSpent: Math.round(st.currentMonthSpent),
            activeMonthsCount: st.activeMonthsCount,
            currentLimit: cat.monthlyLimit || 0,
            suggestedLimit,
            shareOfGroupPercent: Math.round(shareRatio * 100),
            txCount: st.txCount,
          });
        }
      });
    };

    allocatePool(needsCats, needsPool50, historicalNeedsAvg, DEFAULT_NEEDS_WEIGHTS, 'needs');
    allocatePool(wantsCats, wantsPool30, historicalWantsAvg, DEFAULT_WANTS_WEIGHTS, 'wants');
  } else {
    // Historical multiplier strategies: 'saver' (0.9), 'balanced' (1.0), 'flexible' (1.15)
    const multiplier = strategy === 'saver' ? 0.9 : strategy === 'flexible' ? 1.15 : 1.0;

    expenseCategories.forEach((cat) => {
      const st = catStats.get(cat.id);
      if (!st || st.txCount === 0 || st.historicalAvg <= 0) return;

      const groupType: 'needs' | 'wants' = (cat.budgetGroup || 'wants') === 'needs' ? 'needs' : 'wants';
      const groupHistTotal = groupType === 'needs' ? historicalNeedsAvg : historicalWantsAvg;
      const sharePct = groupHistTotal > 0 ? Math.round((st.historicalAvg / groupHistTotal) * 100) : 0;

      const rawSuggested = st.historicalAvg * multiplier;
      const suggestedLimit = roundBudgetAmount(rawSuggested, targetCurrency);

      if (suggestedLimit > 0) {
        suggestions.push({
          categoryId: cat.id,
          budgetGroup: groupType,
          historicalAvg: Math.round(st.historicalAvg),
          lastMonthSpent: Math.round(st.lastMonthSpent),
          currentMonthSpent: Math.round(st.currentMonthSpent),
          activeMonthsCount: st.activeMonthsCount,
          currentLimit: cat.monthlyLimit || 0,
          suggestedLimit,
          shareOfGroupPercent: sharePct,
          txCount: st.txCount,
        });
      }
    });
  }

  // Sort: Needs first, then by highest suggested limit
  suggestions.sort((a, b) => {
    if (a.budgetGroup !== b.budgetGroup) {
      return a.budgetGroup === 'needs' ? -1 : 1;
    }
    return b.suggestedLimit - a.suggestedLimit;
  });

  const suggestedNeedsTotal = suggestions
    .filter((s) => s.budgetGroup === 'needs')
    .reduce((sum, s) => sum + s.suggestedLimit, 0);
  const suggestedWantsTotal = suggestions
    .filter((s) => s.budgetGroup === 'wants')
    .reduce((sum, s) => sum + s.suggestedLimit, 0);

  return {
    referenceIncome: Math.round(referenceIncome),
    detectedHistoricalIncome,
    isIncomeEstimatedFromExpenses,
    needsPool50,
    wantsPool30,
    savingsTarget20,
    suggestedNeedsTotal,
    suggestedWantsTotal,
    historicalNeedsAvg: Math.round(historicalNeedsAvg),
    historicalWantsAvg: Math.round(historicalWantsAvg),
    suggestions,
  };
}

export function calculateAutoBudgetSuggestions(
  transactions: Transaction[],
  categories: BudgetCategory[],
  currentMonthStr: string, // YYYY-MM
  strategy: AutoBudgetStrategy = 'balanced',
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  targetCurrency: SupportedCurrency = 'IDR',
  options?: AutoBudgetOptions
): AutoBudgetSuggestion[] {
  return calculateAutoBudget503020Summary(
    transactions,
    categories,
    currentMonthStr,
    strategy,
    ratesFromUsd,
    targetCurrency,
    options
  ).suggestions;
}

export function calculateNextRecurringDate(
  currentDateStr: string,
  frequency: RecurringFrequency
): string {
  if (!currentDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(currentDateStr)) {
    return new Date().toISOString().split('T')[0];
  }

  const [yr, mo, dy] = currentDateStr.split('-').map(Number);

  if (frequency === 'daily') {
    const d = new Date(Date.UTC(yr, mo - 1, dy + 1));
    return d.toISOString().split('T')[0];
  }

  if (frequency === 'weekly') {
    const d = new Date(Date.UTC(yr, mo - 1, dy + 7));
    return d.toISOString().split('T')[0];
  }

  if (frequency === 'monthly') {
    const targetMonthIndex = mo; // mo is 1-based, so mo in 0-based Date is next month
    const targetYear = yr + Math.floor(targetMonthIndex / 12);
    const normalizedMonth = targetMonthIndex % 12;
    // Clamp day to max days in target month (e.g. Jan 31 -> Feb 28/29)
    const maxDaysInTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
    const clampedDay = Math.min(dy, maxDaysInTargetMonth);
    const d = new Date(Date.UTC(targetYear, normalizedMonth, clampedDay));
    return d.toISOString().split('T')[0];
  }

  // yearly
  const targetYear = yr + 1;
  const maxDaysInTargetMonth = new Date(Date.UTC(targetYear, mo, 0)).getUTCDate();
  const clampedDay = Math.min(dy, maxDaysInTargetMonth);
  const d = new Date(Date.UTC(targetYear, mo - 1, clampedDay));
  return d.toISOString().split('T')[0];
}

export interface DueRecurringResult {
  dueDates: string[];
  updatedNextRunDate: string;
  shouldDeactivate: boolean;
}

export function getDueRecurringOccurrences(
  rule: RecurringTransaction,
  todayStr: string,
  maxCatchUpOccurrences: number = 12
): DueRecurringResult {
  if (!rule.active || !rule.nextRunDate || !/^\d{4}-\d{2}-\d{2}$/.test(rule.nextRunDate)) {
    return {
      dueDates: [],
      updatedNextRunDate: rule.nextRunDate,
      shouldDeactivate: false,
    };
  }

  const dueDates: string[] = [];
  let cursorDate = rule.nextRunDate;
  let shouldDeactivate = false;
  let safetyCounter = 0;

  while (cursorDate <= todayStr && safetyCounter < maxCatchUpOccurrences) {
    if (rule.endDate && cursorDate > rule.endDate) {
      shouldDeactivate = true;
      break;
    }
    dueDates.push(cursorDate);
    cursorDate = calculateNextRecurringDate(cursorDate, rule.frequency);
    safetyCounter += 1;

    if (rule.endDate && cursorDate > rule.endDate) {
      shouldDeactivate = true;
      break;
    }
  }

  return {
    dueDates,
    updatedNextRunDate: cursorDate,
    shouldDeactivate,
  };
}

export function calculateMonthlyRecurringSummary(
  recurringList: RecurringTransaction[],
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  targetCurrency: SupportedCurrency = 'IDR'
): { activeCount: number; monthlyExpenseEstimate: number; monthlyIncomeEstimate: number } {
  let activeCount = 0;
  let monthlyExpenseEstimate = 0;
  let monthlyIncomeEstimate = 0;

  const freqMultiplier: Record<RecurringFrequency, number> = {
    daily: 30,
    weekly: 4.33,
    monthly: 1,
    yearly: 1 / 12,
  };

  recurringList.forEach((rule) => {
    if (!rule.active) return;
    activeCount += 1;
    const inTarget = convertCurrency(rule.amount, rule.currency, targetCurrency, ratesFromUsd);
    const monthlyEquivalent = inTarget * (freqMultiplier[rule.frequency] || 1);
    if (rule.type === 'expense') {
      monthlyExpenseEstimate += monthlyEquivalent;
    } else if (rule.type === 'income') {
      monthlyIncomeEstimate += monthlyEquivalent;
    }
  });

  return {
    activeCount,
    monthlyExpenseEstimate: Math.round(monthlyExpenseEstimate),
    monthlyIncomeEstimate: Math.round(monthlyIncomeEstimate),
  };
}

export type DatePeriodPreset = 'all' | 'this_month' | 'last_month' | 'last_30_days' | 'custom';

export function getDatePeriodRange(
  preset: DatePeriodPreset,
  todayStr: string = new Date().toISOString().split('T')[0],
  customStart?: string,
  customEnd?: string
): { startDate?: string; endDate?: string } {
  if (preset === 'all') {
    return {};
  }
  if (preset === 'custom') {
    return {
      startDate: customStart || undefined,
      endDate: customEnd || undefined,
    };
  }

  const [yr, mo, dy] = todayStr.split('-').map(Number);

  if (preset === 'this_month') {
    const startDate = `${yr}-${String(mo).padStart(2, '0')}-01`;
    const lastDay = new Date(Date.UTC(yr, mo, 0)).getUTCDate();
    const endDate = `${yr}-${String(mo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    return { startDate, endDate };
  }

  if (preset === 'last_month') {
    const prev = new Date(Date.UTC(yr, mo - 2, 1));
    const prevYr = prev.getUTCFullYear();
    const prevMo = prev.getUTCMonth() + 1;
    const lastDay = new Date(Date.UTC(prevYr, prevMo, 0)).getUTCDate();
    return {
      startDate: `${prevYr}-${String(prevMo).padStart(2, '0')}-01`,
      endDate: `${prevYr}-${String(prevMo).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  // last_30_days
  const d30 = new Date(Date.UTC(yr, mo - 1, dy - 29));
  return {
    startDate: d30.toISOString().split('T')[0],
    endDate: todayStr,
  };
}

export interface FilteredTransactionsSummary {
  totalIncome: number;
  totalExpense: number;
  netCashFlow: number;
  transferVolume: number;
  count: number;
}

export function calculateFilteredTransactionsSummary(
  transactions: Transaction[],
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  targetCurrency: SupportedCurrency = 'IDR'
): FilteredTransactionsSummary {
  let totalIncome = 0;
  let totalExpense = 0;
  let transferVolume = 0;

  transactions.forEach((tx) => {
    const converted = convertCurrency(tx.amount, tx.currency, targetCurrency, ratesFromUsd);
    if (tx.type === 'income') {
      totalIncome += converted;
    } else if (tx.type === 'expense') {
      totalExpense += converted;
    } else if (tx.type === 'transfer') {
      transferVolume += converted;
    }
  });

  return {
    totalIncome: Math.round(totalIncome),
    totalExpense: Math.round(totalExpense),
    netCashFlow: Math.round(totalIncome - totalExpense),
    transferVolume: Math.round(transferVolume),
    count: transactions.length,
  };
}

export interface MonthlyCashFlowTrendPoint {
  monthKey: string; // YYYY-MM
  shortLabel: string;
  fullLabel: string;
  income: number;
  expense: number;
  netSavings: number;
  savingsRatePercent: number;
}

export function calculateSixMonthCashFlowTrend(
  transactions: Transaction[],
  referenceMonthStr: string, // YYYY-MM
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  targetCurrency: SupportedCurrency = 'IDR',
  locale: 'id-ID' | 'en-US' = 'id-ID'
): MonthlyCashFlowTrendPoint[] {
  const [yr, mo] = referenceMonthStr.split('-').map(Number);
  const points: MonthlyCashFlowTrendPoint[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(yr, mo - 1 - i, 1);
    const mKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const shortLabel = d.toLocaleDateString(locale, { month: 'short', year: '2-digit' });
    const fullLabel = d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const cf = calculateMonthlyCashFlow(transactions, mKey, ratesFromUsd, targetCurrency);
    const netSavings = cf.income - cf.expense;
    const savingsRatePercent =
      cf.income > 0 ? Math.max(-100, Math.min(100, Math.round((netSavings / cf.income) * 100))) : 0;

    points.push({
      monthKey: mKey,
      shortLabel,
      fullLabel,
      income: Math.round(cf.income),
      expense: Math.round(cf.expense),
      netSavings: Math.round(netSavings),
      savingsRatePercent,
    });
  }

  return points;
}

export interface UpcomingRecurringBillItem {
  rule: RecurringTransaction;
  daysUntilDue: number;
  amountInBase: number;
  walletBalance: number;
  isBalanceSufficient: boolean;
}

export function getUpcomingRecurringBills(
  recurringList: RecurringTransaction[],
  wallets: WalletAccount[],
  todayStr: string = new Date().toISOString().split('T')[0],
  withinDays: number = 7,
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  targetCurrency: SupportedCurrency = 'IDR'
): UpcomingRecurringBillItem[] {
  if (!todayStr || !/^\d{4}-\d{2}-\d{2}$/.test(todayStr)) return [];
  const [tYr, tMo, tDy] = todayStr.split('-').map(Number);
  const todayUtcMs = Date.UTC(tYr, tMo - 1, tDy);

  const items: UpcomingRecurringBillItem[] = [];

  recurringList.forEach((rule) => {
    if (!rule.active || !rule.nextRunDate || !/^\d{4}-\d{2}-\d{2}$/.test(rule.nextRunDate)) return;
    if (rule.endDate && rule.nextRunDate > rule.endDate) return;

    const [rYr, rMo, rDy] = rule.nextRunDate.split('-').map(Number);
    const runUtcMs = Date.UTC(rYr, rMo - 1, rDy);
    const diffDays = Math.round((runUtcMs - todayUtcMs) / (1000 * 60 * 60 * 24));

    if (diffDays <= withinDays) {
      const wallet = wallets.find((w) => w.id === rule.sourceWalletId);
      const walletBalance = wallet ? wallet.balance : 0;
      const isBalanceSufficient =
        rule.type === 'income' ? true : wallet ? wallet.balance >= rule.amount : false;
      const amountInBase = Math.round(
        convertCurrency(rule.amount, rule.currency, targetCurrency, ratesFromUsd)
      );

      items.push({
        rule,
        daysUntilDue: diffDays,
        amountInBase,
        walletBalance,
        isBalanceSufficient,
      });
    }
  });

  return items.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}

export interface GoalProgressEta {
  percentage: number;
  remainingAmount: number;
  estimatedMonths: number | null; // null if already achieved or monthlyContribution <= 0
}

export function calculateGoalProgressAndEta(
  goal: SavingsGoal,
  monthlySavingsCapacityInBase: number,
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  baseCurrency: SupportedCurrency = 'IDR'
): GoalProgressEta {
  const safeTarget = Math.max(1, goal.targetAmount);
  const percentage = Math.min(100, Math.round((goal.currentAmount / safeTarget) * 100));
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);

  if (remainingAmount <= 0) {
    return { percentage: 100, remainingAmount: 0, estimatedMonths: 0 };
  }

  const capacityInGoalCurr = convertCurrency(
    monthlySavingsCapacityInBase,
    baseCurrency,
    goal.currency,
    ratesFromUsd
  );

  if (capacityInGoalCurr <= 0) {
    return { percentage, remainingAmount, estimatedMonths: null };
  }

  const estimatedMonths = Math.max(1, Math.ceil(remainingAmount / capacityInGoalCurr));
  return { percentage, remainingAmount, estimatedMonths };
}

export interface DebtSummary {
  totalPayable: number;
  totalReceivable: number;
  netPosition: number;
  unpaidPayableCount: number;
  unpaidReceivableCount: number;
}

export function calculateDebtSummary(
  debts: DebtRecord[],
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  targetCurrency: SupportedCurrency = 'IDR'
): DebtSummary {
  let totalPayable = 0;
  let totalReceivable = 0;
  let unpaidPayableCount = 0;
  let unpaidReceivableCount = 0;

  debts.forEach((d) => {
    if (d.status === 'settled') return;
    const remaining = Math.max(0, d.amount - (d.paidAmount || 0));
    const inTarget = convertCurrency(remaining, d.currency, targetCurrency, ratesFromUsd);
    if (d.type === 'payable') {
      totalPayable += inTarget;
      unpaidPayableCount += 1;
    } else {
      totalReceivable += inTarget;
      unpaidReceivableCount += 1;
    }
  });

  return {
    totalPayable: Math.round(totalPayable),
    totalReceivable: Math.round(totalReceivable),
    netPosition: Math.round(totalReceivable - totalPayable),
    unpaidPayableCount,
    unpaidReceivableCount,
  };
}




