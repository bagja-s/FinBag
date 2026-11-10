import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrency,
  calculateNetWorth,
  calculateMonthlyCashFlow,
  calculateBudgetHealth,
  calculateSplitBill,
  filterTransactionsList,
  groupTransactionsByDate,
  calculateAutoBudgetSuggestions,
  calculateAutoBudget503020Summary,
  calculateNextRecurringDate,
  getDueRecurringOccurrences,
  getDatePeriodRange,
  calculateFilteredTransactionsSummary,
  calculateSixMonthCashFlowTrend,
  getUpcomingRecurringBills,
  calculateGoalProgressAndEta,
  calculateDebtSummary,
  calculateCreditUtilization,
} from './financeCalculations';
import { WalletAccount, Transaction, BudgetCategory, RecurringTransaction, SavingsGoal, DebtRecord } from '../types/finance';

test('formatCurrency correctly formats IDR with Rp prefix and thousands separators', () => {
  const result = formatCurrency(1500000, 'IDR');
  assert.equal(result, 'Rp 1.500.000');
});

test('formatCurrency correctly formats USD with $ symbol and 2 decimal places', () => {
  const result = formatCurrency(250.75, 'USD');
  assert.equal(result, '$250.75');
});

test('calculateNetWorth correctly sums multi-currency balances converted to IDR and skips excluded wallets', () => {
  const mockWallets: WalletAccount[] = [
    { id: 'w1', name: 'Kas Tunai', type: 'cash', balance: 1000000, currency: 'IDR', color: '#10B981' },
    { id: 'w2', name: 'PayPal USD', type: 'ewallet', balance: 100, currency: 'USD', color: '#3B82F6' },
    { id: 'w3', name: 'Kartu Kredit BCA', type: 'credit', balance: 15000000, currency: 'IDR', color: '#DC2626', excludeFromNetWorth: true },
  ];
  // 1 USD = 16,250 IDR in fallback rates; w3 is excluded from Net Worth
  const netWorth = calculateNetWorth(mockWallets, { USD: 1, IDR: 16250, EUR: 0.93, SGD: 1.33, MYR: 4.42, JPY: 151.2, GBP: 0.78, AUD: 1.51 }, 'IDR');
  assert.equal(netWorth, 1000000 + 100 * 16250);
});

test('calculateMonthlyCashFlow computes income and expenses while excluding inter-wallet transfers', () => {
  const mockTxs: Transaction[] = [
    { id: 't1', date: '2026-11-01', amount: 5000000, currency: 'IDR', type: 'income', sourceWalletId: 'w1', description: 'Gaji' },
    { id: 't2', date: '2026-11-02', amount: 1500000, currency: 'IDR', type: 'expense', sourceWalletId: 'w1', description: 'Belanja' },
    { id: 't3', date: '2026-11-03', amount: 500000, currency: 'IDR', type: 'transfer', sourceWalletId: 'w1', targetWalletId: 'w2', description: 'Transfer' },
    { id: 't4', date: '2026-10-15', amount: 2000000, currency: 'IDR', type: 'income', sourceWalletId: 'w1', description: 'Bulan Lalu' },
  ];

  const flow = calculateMonthlyCashFlow(mockTxs, '2026-11', { USD: 1, IDR: 1, EUR: 1, SGD: 1, MYR: 1, JPY: 1, GBP: 1, AUD: 1 }, 'IDR');
  assert.equal(flow.income, 5000000);
  assert.equal(flow.expense, 1500000);
  assert.equal(flow.net, 3500000);
});

test('calculateBudgetHealth handles safe, warning, and danger thresholds', () => {
  const safe = calculateBudgetHealth(500000, 1000000);
  assert.equal(safe.status, 'safe');
  assert.equal(safe.percentage, 50);
  assert.equal(safe.remaining, 500000);

  const warning = calculateBudgetHealth(850000, 1000000);
  assert.equal(warning.status, 'warning');
  assert.equal(warning.percentage, 85);

  const danger = calculateBudgetHealth(1200000, 1000000);
  assert.equal(danger.status, 'danger');
  assert.equal(danger.percentage, 120);
  assert.equal(danger.remaining, 0);
});

test('calculateSplitBill correctly calculates bill with tax, service, and per-person split', () => {
  const bill = calculateSplitBill(100000, 10, 5, 4); // 100k + 10k tax + 5k service = 115k / 4 = 28750
  assert.equal(bill.subtotal, 100000);
  assert.equal(bill.taxAmount, 10000);
  assert.equal(bill.serviceAmount, 5000);
  assert.equal(bill.grandTotal, 115000);
  assert.equal(bill.perPerson, 28750);
});

test('filterTransactionsList filters by search query and type', () => {
  const mockTxs: Transaction[] = [
    { id: '1', date: '2026-11-01', amount: 50000, currency: 'IDR', type: 'expense', sourceWalletId: 'w1', description: 'Kopi Kenangan' },
    { id: '2', date: '2026-11-02', amount: 150000, currency: 'IDR', type: 'expense', sourceWalletId: 'w1', description: 'Makan Siang Padang' },
    { id: '3', date: '2026-11-03', amount: 3000000, currency: 'IDR', type: 'income', sourceWalletId: 'w2', description: 'Freelance Design' },
  ];

  const filtered = filterTransactionsList(mockTxs, { query: 'kopi' });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].description, 'Kopi Kenangan');

  const incomes = filterTransactionsList(mockTxs, { type: 'income' });
  assert.equal(incomes.length, 1);
  assert.equal(incomes[0].id, '3');
});

test('groupTransactionsByDate sorts newest dates first and newest transactions within the same date first', () => {
  const mockTxs: Transaction[] = [
    { id: 'tx_100', date: '2026-11-05', createdAt: '2026-11-05T08:00:00Z', amount: 25000, currency: 'IDR', type: 'expense', sourceWalletId: 'w1', description: 'Sarapan' },
    { id: 'tx_300', date: '2026-11-08', createdAt: '2026-11-08T18:00:00Z', amount: 75000, currency: 'IDR', type: 'expense', sourceWalletId: 'w1', description: 'Makan Malam' },
    { id: 'tx_200', date: '2026-11-08', createdAt: '2026-11-08T12:00:00Z', amount: 50000, currency: 'IDR', type: 'expense', sourceWalletId: 'w1', description: 'Makan Siang' },
  ];

  const groups = groupTransactionsByDate(mockTxs);
  assert.equal(groups.length, 2);
  assert.equal(groups[0].date, '2026-11-08');
  assert.equal(groups[0].transactions[0].id, 'tx_300');
  assert.equal(groups[0].transactions[1].id, 'tx_200');
  assert.equal(groups[0].dailyExpense, 125000);
  assert.equal(groups[1].date, '2026-11-05');
});

test('calculateAutoBudgetSuggestions computes suggested budget from historical transactions', () => {
  const mockCategories: BudgetCategory[] = [
    { id: 'food', name: 'Makanan', nameEn: 'Food', icon: 'Utensils', color: '#F59E0B', monthlyLimit: 500000, type: 'expense', budgetGroup: 'needs' },
  ];
  const mockTxs: Transaction[] = [
    { id: '1', date: '2026-10-10', amount: 1000000, currency: 'IDR', type: 'expense', categoryId: 'food', sourceWalletId: 'w1', description: 'Makan Oktober' },
    { id: '2', date: '2026-11-05', amount: 1000000, currency: 'IDR', type: 'expense', categoryId: 'food', sourceWalletId: 'w1', description: 'Makan November' },
  ];

  const balanced = calculateAutoBudgetSuggestions(mockTxs, mockCategories, '2026-11', 'balanced');
  assert.equal(balanced.length, 1);
  assert.equal(balanced[0].historicalAvg, 1000000);
  assert.equal(balanced[0].suggestedLimit, 1000000);

  const flexible = calculateAutoBudgetSuggestions(mockTxs, mockCategories, '2026-11', 'flexible');
  assert.equal(flexible[0].suggestedLimit, 1150000);
});

test('calculateAutoBudget503020Summary allocates 50% Needs, 30% Wants, and 20% Savings based on monthly income', () => {
  const mockCategories: BudgetCategory[] = [
    { id: 'food', name: 'Makanan', nameEn: 'Food', icon: 'Utensils', color: '#F59E0B', monthlyLimit: 0, type: 'expense', budgetGroup: 'needs' },
    { id: 'utilities', name: 'Tagihan', nameEn: 'Utilities', icon: 'Zap', color: '#8B5CF6', monthlyLimit: 0, type: 'expense', budgetGroup: 'needs' },
    { id: 'entertainment', name: 'Hiburan', nameEn: 'Entertainment', icon: 'Film', color: '#84CC16', monthlyLimit: 0, type: 'expense', budgetGroup: 'wants' },
  ];
  const mockTxs: Transaction[] = [
    { id: 'i1', date: '2026-10-25', amount: 10000000, currency: 'IDR', type: 'income', categoryId: 'salary', sourceWalletId: 'w1', description: 'Gaji Oktober' },
    { id: 'e1', date: '2026-10-10', amount: 3000000, currency: 'IDR', type: 'expense', categoryId: 'food', sourceWalletId: 'w1', description: 'Makan' },
    { id: 'e2', date: '2026-10-12', amount: 1000000, currency: 'IDR', type: 'expense', categoryId: 'utilities', sourceWalletId: 'w1', description: 'Listrik' },
    { id: 'e3', date: '2026-10-15', amount: 1500000, currency: 'IDR', type: 'expense', categoryId: 'entertainment', sourceWalletId: 'w1', description: 'Nonton' },
  ];

  const summary = calculateAutoBudget503020Summary(mockTxs, mockCategories, '2026-11', 'rule_50_30_20');
  assert.equal(summary.referenceIncome, 10000000);
  assert.equal(summary.needsPool50, 5000000);
  assert.equal(summary.wantsPool30, 3000000);
  assert.equal(summary.savingsTarget20, 2000000);
  assert.equal(summary.suggestedNeedsTotal, 5000000);
  assert.equal(summary.suggestedWantsTotal, 3000000);
});

test('calculateNextRecurringDate advances daily, weekly, monthly (with end-of-month clamping), and yearly dates', () => {
  assert.equal(calculateNextRecurringDate('2026-11-09', 'daily'), '2026-11-10');
  assert.equal(calculateNextRecurringDate('2026-11-09', 'weekly'), '2026-11-16');
  assert.equal(calculateNextRecurringDate('2026-01-31', 'monthly'), '2026-02-28');
  assert.equal(calculateNextRecurringDate('2026-11-09', 'yearly'), '2027-11-09');
});

test('getDueRecurringOccurrences collects due dates up to today and respects endDate', () => {
  const rule: RecurringTransaction = {
    id: 'rec_1',
    description: 'Langganan Netflix',
    amount: 186000,
    currency: 'IDR',
    type: 'expense',
    categoryId: 'subscription',
    sourceWalletId: 'w1',
    frequency: 'monthly',
    startDate: '2026-09-05',
    nextRunDate: '2026-09-05',
    endDate: '2026-10-20',
    active: true,
  };

  const due = getDueRecurringOccurrences(rule, '2026-11-09');
  assert.deepEqual(due.dueDates, ['2026-09-05', '2026-10-05']);
  assert.equal(due.updatedNextRunDate, '2026-11-05');
  assert.equal(due.shouldDeactivate, true);
});

test('getDatePeriodRange and calculateFilteredTransactionsSummary compute accurate date bounds and totals', () => {
  const thisMonth = getDatePeriodRange('this_month', '2026-11-09');
  assert.equal(thisMonth.startDate, '2026-11-01');
  assert.equal(thisMonth.endDate, '2026-11-30');

  const lastMonth = getDatePeriodRange('last_month', '2026-11-09');
  assert.equal(lastMonth.startDate, '2026-10-01');
  assert.equal(lastMonth.endDate, '2026-10-31');

  const mockTxs: Transaction[] = [
    { id: '1', date: '2026-11-02', amount: 8000000, currency: 'IDR', type: 'income', sourceWalletId: 'w1', description: 'Gaji' },
    { id: '2', date: '2026-11-05', amount: 2500000, currency: 'IDR', type: 'expense', sourceWalletId: 'w1', description: 'Sewa' },
    { id: '3', date: '2026-11-06', amount: 1000000, currency: 'IDR', type: 'transfer', sourceWalletId: 'w1', targetWalletId: 'w2', description: 'Tabung' },
  ];

  const summary = calculateFilteredTransactionsSummary(mockTxs);
  assert.equal(summary.totalIncome, 8000000);
  assert.equal(summary.totalExpense, 2500000);
  assert.equal(summary.netCashFlow, 5500000);
  assert.equal(summary.transferVolume, 1000000);
  assert.equal(summary.count, 3);
});

test('calculateSixMonthCashFlowTrend returns 6 chronological months with savings rate', () => {
  const mockTxs: Transaction[] = [
    { id: '1', date: '2026-10-05', amount: 10000000, currency: 'IDR', type: 'income', sourceWalletId: 'w1', description: 'Gaji Okt' },
    { id: '2', date: '2026-10-15', amount: 7500000, currency: 'IDR', type: 'expense', sourceWalletId: 'w1', description: 'Biaya Okt' },
    { id: '3', date: '2026-11-05', amount: 10000000, currency: 'IDR', type: 'income', sourceWalletId: 'w1', description: 'Gaji Nov' },
    { id: '4', date: '2026-11-10', amount: 6000000, currency: 'IDR', type: 'expense', sourceWalletId: 'w1', description: 'Biaya Nov' },
  ];

  const trend = calculateSixMonthCashFlowTrend(mockTxs, '2026-11');
  assert.equal(trend.length, 6);
  assert.equal(trend[0].monthKey, '2026-06');
  assert.equal(trend[4].monthKey, '2026-10');
  assert.equal(trend[4].savingsRatePercent, 25);
  assert.equal(trend[5].monthKey, '2026-11');
  assert.equal(trend[5].savingsRatePercent, 40);
});

test('getUpcomingRecurringBills identifies bills due within 7 days and checks wallet sufficiency', () => {
  const wallets: WalletAccount[] = [
    { id: 'w1', name: 'BCA', type: 'bank', balance: 100000, currency: 'IDR', color: '#3B82F6' },
  ];
  const rules: RecurringTransaction[] = [
    {
      id: 'r1',
      description: 'Internet Fiber',
      amount: 350000,
      currency: 'IDR',
      type: 'expense',
      categoryId: 'utilities',
      sourceWalletId: 'w1',
      frequency: 'monthly',
      startDate: '2026-01-12',
      nextRunDate: '2026-11-12',
      active: true,
    },
    {
      id: 'r2',
      description: 'Spotify',
      amount: 55000,
      currency: 'IDR',
      type: 'expense',
      categoryId: 'subscription',
      sourceWalletId: 'w1',
      frequency: 'monthly',
      startDate: '2026-01-25',
      nextRunDate: '2026-11-25',
      active: true,
    },
  ];

  const upcoming = getUpcomingRecurringBills(rules, wallets, '2026-11-09', 7);
  assert.equal(upcoming.length, 1);
  assert.equal(upcoming[0].rule.id, 'r1');
  assert.equal(upcoming[0].daysUntilDue, 3);
  assert.equal(upcoming[0].isBalanceSufficient, false);
});

test('calculateGoalProgressAndEta and calculateDebtSummary compute goal ETA and net debt position', () => {
  const goal: SavingsGoal = {
    id: 'g1',
    title: 'Dana Darurat 6x',
    targetAmount: 30000000,
    currentAmount: 10000000,
    currency: 'IDR',
    color: '#10B981',
    icon: 'Shield',
  };

  const eta = calculateGoalProgressAndEta(goal, 2000000);
  assert.equal(eta.percentage, 33);
  assert.equal(eta.remainingAmount, 20000000);
  assert.equal(eta.estimatedMonths, 10);

  const debts: DebtRecord[] = [
    { id: 'd1', personName: 'Budi', title: 'Patungan Makan', type: 'receivable', amount: 500000, paidAmount: 0, currency: 'IDR', status: 'unpaid', createdAt: '2026-11-01' },
    { id: 'd2', personName: 'Andi', title: 'Pinjam Cash', type: 'payable', amount: 200000, paidAmount: 0, currency: 'IDR', status: 'unpaid', createdAt: '2026-11-02' },
    { id: 'd3', personName: 'Siti', title: 'Tiket Nonton', type: 'receivable', amount: 300000, paidAmount: 300000, currency: 'IDR', status: 'settled', createdAt: '2026-10-01' },
  ];

  const debtSum = calculateDebtSummary(debts);
  assert.equal(debtSum.totalReceivable, 500000);
  assert.equal(debtSum.totalPayable, 200000);
  assert.equal(debtSum.netPosition, 300000);
  assert.equal(debtSum.unpaidReceivableCount, 1);
  assert.equal(debtSum.unpaidPayableCount, 1);
});

test('calculateCreditUtilization computes credit card limit usage and status accurately', () => {
  const safe = calculateCreditUtilization(16000000, 20000000); // 16M remaining out of 20M limit -> 4M used (20%)
  assert.ok(safe);
  assert.equal(safe.usedAmount, 4000000);
  assert.equal(safe.availableCredit, 16000000);
  assert.equal(safe.utilizationPercent, 20);
  assert.equal(safe.status, 'safe');

  const danger = calculateCreditUtilization(2000000, 20000000); // 2M remaining out of 20M limit -> 18M used (90%)
  assert.ok(danger);
  assert.equal(danger.usedAmount, 18000000);
  assert.equal(danger.utilizationPercent, 90);
  assert.equal(danger.status, 'danger');

  const noLimit = calculateCreditUtilization(5000000, undefined);
  assert.equal(noLimit, null);
});
