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
} from './financeCalculations';
import { WalletAccount, Transaction, BudgetCategory } from '../types/finance';

test('formatCurrency correctly formats IDR with Rp prefix and thousands separators', () => {
  const result = formatCurrency(1500000, 'IDR');
  assert.equal(result, 'Rp 1.500.000');
});

test('formatCurrency correctly formats USD with $ symbol and 2 decimal places', () => {
  const result = formatCurrency(250.75, 'USD');
  assert.equal(result, '$250.75');
});

test('calculateNetWorth correctly sums multi-currency balances converted to IDR', () => {
  const mockWallets: WalletAccount[] = [
    { id: 'w1', name: 'Kas Tunai', type: 'cash', balance: 1000000, currency: 'IDR', color: '#10B981' },
    { id: 'w2', name: 'PayPal USD', type: 'ewallet', balance: 100, currency: 'USD', color: '#3B82F6' },
  ];
  // 1 USD = 16,250 IDR in fallback rates
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


