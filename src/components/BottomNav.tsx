import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { getTranslation } from '../i18n/translations';
import { 
  LayoutDashboard, 
  Wallet, 
  Plus, 
  TrendingUp, 
  Grid 
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
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors ${
            activeTab === 'dashboard'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[10px] tracking-tight">{t.navDashboard}</span>
        </button>

        {/* Tab 2: Dompet */}
        <button
          onClick={() => setActiveTab('wallets')}
          aria-label={t.navWallets}
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors ${
            activeTab === 'wallets'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Wallet className="h-5 w-5" />
          <span className="text-[10px] tracking-tight">{t.navWallets}</span>
        </button>

        {/* Tab 3 (Center): Quick Add Floating Action Button */}
        <div className="flex items-center justify-center">
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            aria-label="Catat Transaksi Cepat"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 active:scale-95 hover:bg-blue-500 transition-all"
          >
            <Plus className="h-6 w-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 4: Kurs Live */}
        <button
          onClick={() => setActiveTab('rates')}
          aria-label={t.navRates}
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors ${
            activeTab === 'rates'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="h-5 w-5" />
          <span className="text-[10px] tracking-tight">{t.navRates}</span>
        </button>

        {/* Tab 5: Alat & Fitur Lebih */}
        <button
          onClick={() => setActiveTab('tools')}
          aria-label={t.navTools}
          className={`flex flex-col items-center justify-center gap-1 py-1 transition-colors ${
            activeTab === 'tools'
              ? 'text-blue-600 dark:text-blue-400 font-bold'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Grid className="h-5 w-5" />
          <span className="text-[10px] tracking-tight">{t.navTools}</span>
        </button>
      </div>
    </div>
  );
};
