import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency } from '../../utils/financeCalculations';
import { convertCurrency } from '../../services/currencyService';
import { 
  Wallet, 
  Plus, 
  ArrowLeftRight, 
  CreditCard, 
  Building2, 
  Coins, 
  PiggyBank 
} from 'lucide-react';

export const WalletsView: React.FC = () => {
  const { 
    wallets, 
    baseCurrency, 
    exchangeRates, 
    setIsAddWalletModalOpen, 
    setIsTransactionModalOpen, 
    language 
  } = useFinance();

  const t = getTranslation(language);

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'bank': return Building2;
      case 'cash': return Coins;
      case 'investment': return PiggyBank;
      default: return CreditCard;
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.walletTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {wallets.length} {t.activeWallets} · {language === 'id' ? 'Multi-Rekening & E-Wallet' : 'Multi-Accounts & E-Wallets'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>{t.transferMoney}</span>
          </button>
          <button
            onClick={() => setIsAddWalletModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>{t.addWallet}</span>
          </button>
        </div>
      </div>

      {/* Wallets Grid or Empty State */}
      {wallets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 sm:p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-4 shadow-inner">
            <Wallet className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {language === 'id' ? 'Database Dompet Masih Kosong' : 'No Wallets Found in Database'}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {language === 'id' 
              ? 'Anda belum menambahkan rekening bank, dompet tunai, atau e-wallet. FinBag terhubung langsung ke database cloud Anda tanpa data dummy.' 
              : 'You have not added any bank accounts or wallets yet. FinBag connects directly to your cloud database without dummy records.'}
          </p>
          <button
            onClick={() => setIsAddWalletModalOpen(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{t.addWallet}</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((wallet) => {
            const Icon = getWalletIcon(wallet.type);
            const convertedToBase = convertCurrency(wallet.balance, wallet.currency, baseCurrency, exchangeRates.rates);

            return (
              <div
                key={wallet.id}
                className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-all hover:border-blue-500/40"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-md"
                      style={{ backgroundColor: wallet.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {wallet.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {wallet.type === 'bank' ? t.bank : wallet.type === 'cash' ? t.cash : wallet.type === 'investment' ? t.investment : t.ewallet}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {wallet.currency}
                  </span>
                </div>

                <div className="mt-5">
                  <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(wallet.balance, wallet.currency)}
                  </p>
                  {wallet.currency !== baseCurrency && (
                    <p className="text-xs font-mono text-slate-400 mt-1 tabular-nums">
                      ≈ {formatCurrency(convertedToBase, baseCurrency)} ({baseCurrency})
                    </p>
                  )}
                </div>

                {wallet.accountNumber && (
                  <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Nomor Akun:</span>
                    <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                      {wallet.accountNumber}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
