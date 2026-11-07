export type SupportedCurrency = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'MYR' | 'JPY' | 'GBP' | 'AUD';

export type SupportedLanguage = 'id' | 'en';

export type WalletType = 'cash' | 'bank' | 'ewallet' | 'investment';

export type TransactionType = 'expense' | 'income' | 'transfer';

export interface WalletAccount {
  id: string;
  name: string;
  type: WalletType;
  balance: number;
  currency: SupportedCurrency;
  color: string;
  accountNumber?: string;
  userId?: string;
}

export interface BudgetCategory {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  monthlyLimit: number;
  type: 'expense' | 'income';
  budgetGroup?: 'needs' | 'wants' | 'savings'; // For 50/30/20 calculation
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  currency: SupportedCurrency;
  exchangeRateToBase?: number;
  type: TransactionType;
  categoryId?: string;
  sourceWalletId: string;
  targetWalletId?: string; // Only for transfer
  description: string;
  notes?: string;
  userId?: string;
  createdAt?: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  currency: SupportedCurrency;
  targetDate?: string;
  color: string;
  icon: string;
  userId?: string;
}

export interface CurrencyRatesResponse {
  base: SupportedCurrency;
  date: string;
  time_last_update_utc?: string;
  rates: Record<SupportedCurrency, number>;
}

export interface CurrencyRateInfo {
  currency: SupportedCurrency;
  symbol: string;
  name: string;
  flag: string;
  rateToIdr: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'creator' | 'admin' | 'user';
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt: string;
  baseCurrency?: SupportedCurrency;
  language?: SupportedLanguage;
  notificationPreferences?: NotificationPreferences;
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'TRANSFER' | 'CLEAR';
export type AuditEntity = 'TRANSACTION' | 'WALLET' | 'GOAL' | 'BUDGET' | 'DATABASE' | 'SECURITY';

export interface AuditLogEntry {
  id: string;
  userId: string;
  userEmail?: string;
  timestamp: string;
  action: AuditAction;
  entity: AuditEntity;
  summary: string;
  details?: Record<string, any>;
}

export interface NotificationPreferences {
  budgetAlerts: boolean;
  goalMilestones: boolean;
  lowBalanceAlert: boolean;
  weeklySummary: boolean;
  transactionReminder: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  budgetAlerts: true,
  goalMilestones: true,
  lowBalanceAlert: true,
  weeklySummary: true,
  transactionReminder: false,
};
