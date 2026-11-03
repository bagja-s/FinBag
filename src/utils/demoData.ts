import { WalletAccount, BudgetCategory, Transaction, SavingsGoal } from '../types/finance';

export const INITIAL_CATEGORIES: BudgetCategory[] = [
  {
    id: 'food',
    name: 'Makanan & Minuman',
    nameEn: 'Food & Dining',
    icon: 'Utensils',
    color: '#F59E0B',
    monthlyLimit: 0,
    type: 'expense',
    budgetGroup: 'needs',
  },
  {
    id: 'transport',
    name: 'Transportasi & Bensin',
    nameEn: 'Transportation',
    icon: 'Car',
    color: '#3B82F6',
    monthlyLimit: 0,
    type: 'expense',
    budgetGroup: 'needs',
  },
  {
    id: 'utilities',
    name: 'Tagihan, Listrik & Air',
    nameEn: 'Bills & Utilities',
    icon: 'Zap',
    color: '#8B5CF6',
    monthlyLimit: 0,
    type: 'expense',
    budgetGroup: 'needs',
  },
  {
    id: 'shopping',
    name: 'Belanja & Kebutuhan',
    nameEn: 'Shopping',
    icon: 'ShoppingBag',
    color: '#EC4899',
    monthlyLimit: 0,
    type: 'expense',
    budgetGroup: 'wants',
  },
  {
    id: 'entertainment',
    name: 'Hiburan & Liburan',
    nameEn: 'Entertainment',
    icon: 'Film',
    color: '#10B981',
    monthlyLimit: 0,
    type: 'expense',
    budgetGroup: 'wants',
  },
  {
    id: 'health',
    name: 'Kesehatan & Medis',
    nameEn: 'Healthcare',
    icon: 'HeartPulse',
    color: '#EF4444',
    monthlyLimit: 0,
    type: 'expense',
    budgetGroup: 'needs',
  },
  {
    id: 'salary',
    name: 'Gaji Bulanan',
    nameEn: 'Monthly Salary',
    icon: 'Briefcase',
    color: '#10B981',
    monthlyLimit: 0,
    type: 'income',
    budgetGroup: 'savings',
  },
  {
    id: 'freelance',
    name: 'Side Income / Freelance',
    nameEn: 'Freelance & Projects',
    icon: 'Laptop',
    color: '#06B6D4',
    monthlyLimit: 0,
    type: 'income',
    budgetGroup: 'savings',
  },
];

// No dummy data - strictly empty initial state directly bound to real database
export const INITIAL_WALLETS: WalletAccount[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const INITIAL_GOALS: SavingsGoal[] = [];
