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
  Settings,
  ShieldAlert,
  Download
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isAdmin,
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
    { id: 'transactions', label: t.navTransactions, icon: History },
    { id: 'settings', label: t.navSettings, icon: Settings },
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
                className={`relative flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 font-bold translate-x-1 shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-blue-600 dark:bg-blue-400 animate-in fade-in duration-200" />
                )}
                <Icon className={`h-4 w-4 transition-transform duration-200 ${isActive ? 'text-blue-600 dark:text-blue-400 scale-110' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {isAdmin && (
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('admin')}
                className={`relative flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold translate-x-1 shadow-xs border border-amber-500/30'
                    : 'text-amber-600 dark:text-amber-400 hover:bg-amber-500/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-4 w-4 text-amber-500" />
                  <span>{t.navAdmin}</span>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-600 dark:text-amber-300">
                  CREATOR
                </span>
              </button>
            </div>
          )}
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
          onClick={() => setActiveTab('settings')}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60 transition-colors"
        >
          <Settings className="h-3.5 w-3.5 text-slate-400" />
          <span>{appPin ? t.pinEnabled : t.setPin}</span>
        </button>
      </div>
    </aside>
  );
};