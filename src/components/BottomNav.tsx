import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { getTranslation } from '../i18n/translations';
import {
  LayoutDashboard,
  Wallet,
  Plus,
  History,
  Settings
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setIsTransactionModalOpen,
    language
  } = useFinance();

  const t = getTranslation(language);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 transition-colors pb-safe">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-2">
        {/* Tab 1: Ringkasan */}
        <button
          onClick={() => setActiveTab('dashboard')}
          aria-label={t.navDashboard}
          className={`relative flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-90 cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-blue-600 dark:text-blue-400 font-bold -translate-y-0.5'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className={`h-5 w-5 transition-transform duration-200 ${activeTab === 'dashboard' ? 'scale-110 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] tracking-tight">{t.navDashboard}</span>
          {activeTab === 'dashboard' && (
            <span className="h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-400 animate-in zoom-in duration-200" />
          )}
        </button>

        {/* Tab 2: Dompet */}
        <button
          onClick={() => setActiveTab('wallets')}
          aria-label={t.navWallets}
          className={`relative flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-90 cursor-pointer ${
            activeTab === 'wallets'
              ? 'text-blue-600 dark:text-blue-400 font-bold -translate-y-0.5'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Wallet className={`h-5 w-5 transition-transform duration-200 ${activeTab === 'wallets' ? 'scale-110 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] tracking-tight">{t.navWallets}</span>
          {activeTab === 'wallets' && (
            <span className="h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-400 animate-in zoom-in duration-200" />
          )}
        </button>

        {/* Tab 3 (Center): Quick Add Floating Action Button */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            aria-label="Catat Transaksi Cepat"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 active:scale-85 hover:scale-105 hover:bg-blue-500 transition-all duration-200 cursor-pointer"
          >
            <Plus className="h-6 w-6 stroke-[2.5] transition-transform duration-200" />
          </button>
        </div>

        {/* Tab 4: Riwayat Transaksi */}
        <button
          onClick={() => setActiveTab('transactions')}
          aria-label={t.navTransactions}
          className={`relative flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-90 cursor-pointer ${
            activeTab === 'transactions'
              ? 'text-blue-600 dark:text-blue-400 font-bold -translate-y-0.5'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <History className={`h-5 w-5 transition-transform duration-200 ${activeTab === 'transactions' ? 'scale-110 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] tracking-tight">{t.navTransactions}</span>
          {activeTab === 'transactions' && (
            <span className="h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-400 animate-in zoom-in duration-200" />
          )}
        </button>

        {/* Tab 5: Pengaturan */}
        <button
          onClick={() => setActiveTab('settings')}
          aria-label={t.navSettings}
          className={`relative flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-90 cursor-pointer ${
            activeTab === 'settings'
              ? 'text-blue-600 dark:text-blue-400 font-bold -translate-y-0.5'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Settings className={`h-5 w-5 transition-transform duration-200 ${activeTab === 'settings' ? 'scale-110 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] tracking-tight">{t.navSettings}</span>
          {activeTab === 'settings' && (
            <span className="h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-400 animate-in zoom-in duration-200" />
          )}
        </button>
      </div>
    </div>
  );
};