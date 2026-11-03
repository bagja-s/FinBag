import React from 'react';
import { useFinance } from '../context/FinanceContext';
import { getTranslation } from '../i18n/translations';
import { 
  LayoutDashboard, 
  Wallet, 
  Plus, 
  TrendingUp, 
  PieChart, 
  History, 
  Grid, 
  Download,
  ShieldAlert
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    setIsTransactionModalOpen, 
    language,
    exportCSV,
    exportJSON,
    appPin,
    setAppPin
  } = useFinance();

  const t = getTranslation(language);

  const navItems = [
    { id: 'dashboard', label: t.navDashboard, icon: LayoutDashboard },
    { id: 'wallets', label: t.navWallets, icon: Wallet },
    { id: 'rates', label: t.navRates, icon: TrendingUp },
    { id: 'budgets', label: t.budgetStatus, icon: PieChart },
    { id: 'transactions', label: t.recentTransactions, icon: History },
    { id: 'tools', label: t.navTools, icon: Grid },
  ] as const;

  return (
    <aside className="hidden lg:flex w-64 flex-col justify-between border-r border-slate-200 bg-white/70 backdrop-blur-md p-4 dark:border-slate-800 dark:bg-slate-900/70 shrink-0 min-h-[calc(100vh-3.5rem)]">
      <div className="space-y-6">
        {/* Quick Add CTA */}
        <button
          onClick={() => setIsTransactionModalOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 active:scale-[0.98] transition-all"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>{t.transactionModalTitle}</span>
        </button>

        {/* Navigation List */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 font-bold'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Shortcuts (Export & PIN) */}
      <div className="border-t border-slate-200 pt-4 dark:border-slate-800 space-y-1">
        <button
          onClick={exportCSV}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60 transition-colors"
        >
          <Download className="h-3.5 w-3.5 text-slate-400" />
          <span>{t.exportCSV}</span>
        </button>
        <button
          onClick={exportJSON}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60 transition-colors"
        >
          <Download className="h-3.5 w-3.5 text-slate-400" />
          <span>{t.exportJSON}</span>
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60 transition-colors"
        >
          <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
          <span>{appPin ? t.pinEnabled : t.setPin}</span>
        </button>
      </div>
    </aside>
  );
};
