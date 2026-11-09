import { 
  SupportedCurrency, 
  WalletAccount, 
  Transaction, 
  BudgetCategory 
} from '../types/finance';
import { CURRENCY_METADATA, FALLBACK_RATES_FROM_USD, convertCurrency } from '../services/currencyService';

export function formatCurrency(
  amount: number, 
  currency: SupportedCurrency = 'IDR',
  showSymbol: boolean = true
): string {
  const meta = CURRENCY_METADATA[currency] || CURRENCY_METADATA.IDR;
  const isNegative = amount < 0;
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

  const sign = isNegative ? '-' : '';
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

export type AutoBudgetStrategy = 'saver' | 'balanced' | 'flexible';

export interface AutoBudgetSuggestion {
  categoryId: string;
  historicalAvg: number;
  lastMonthSpent: number;
  currentMonthSpent: number;
  activeMonthsCount: number;
  currentLimit: number;
  suggestedLimit: number;
  txCount: number;
}

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

export function calculateAutoBudgetSuggestions(
  transactions: Transaction[],
  categories: BudgetCategory[],
  currentMonthStr: string, // YYYY-MM
  strategy: AutoBudgetStrategy = 'balanced',
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD,
  targetCurrency: SupportedCurrency = 'IDR'
): AutoBudgetSuggestion[] {
  const multiplier = strategy === 'saver' ? 0.9 : strategy === 'flexible' ? 1.15 : 1.0;

  // Determine previous month string YYYY-MM
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

  const suggestions: AutoBudgetSuggestion[] = [];

  expenseCategories.forEach((cat) => {
    const monthMap = catMonthTotals.get(cat.id);
    const txCount = catTxCounts.get(cat.id) || 0;
    if (!monthMap || txCount === 0) return;

    const currentMonthSpent = monthMap.get(currentMonthStr) || 0;
    const lastMonthSpent = monthMap.get(lastMonthStr) || 0;

    // Collect past months (< currentMonthStr)
    const pastMonths: number[] = [];
    monthMap.forEach((val, mKey) => {
      if (mKey < currentMonthStr && val > 0) {
        pastMonths.push(val);
      }
    });

    let baseAvg = 0;
    let activeMonthsCount = 0;

    if (pastMonths.length > 0 && currentMonthSpent > 0) {
      // Blend past months and current month if current month exceeds past average, or average all active months
      const allActive = [...pastMonths, currentMonthSpent];
      baseAvg = allActive.reduce((s, v) => s + v, 0) / allActive.length;
      activeMonthsCount = allActive.length;
    } else if (pastMonths.length > 0) {
      baseAvg = pastMonths.reduce((s, v) => s + v, 0) / pastMonths.length;
      activeMonthsCount = pastMonths.length;
    } else {
      // Only current month data exists
      baseAvg = currentMonthSpent;
      activeMonthsCount = 1;
    }

    const rawSuggested = baseAvg * multiplier;
    const suggestedLimit = roundBudgetAmount(rawSuggested, targetCurrency);

    if (suggestedLimit > 0) {
      suggestions.push({
        categoryId: cat.id,
        historicalAvg: Math.round(baseAvg),
        lastMonthSpent: Math.round(lastMonthSpent),
        currentMonthSpent: Math.round(currentMonthSpent),
        activeMonthsCount,
        currentLimit: cat.monthlyLimit || 0,
        suggestedLimit,
        txCount,
      });
    }
  });

  // Sort by highest suggested limit first
  suggestions.sort((a, b) => b.suggestedLimit - a.suggestedLimit);
  return suggestions;
}

