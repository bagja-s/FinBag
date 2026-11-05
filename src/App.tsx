/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/views/DashboardView';
import { WalletsView } from './components/views/WalletsView';
import { ExchangeRatesView } from './components/views/ExchangeRatesView';
import { BudgetsView } from './components/views/BudgetsView';
import { TransactionsView } from './components/views/TransactionsView';
import { ToolsView } from './components/views/ToolsView';
import { AdminView } from './components/views/AdminView';
import { LoginView } from './components/views/LoginView';
import { TransactionModal } from './components/modals/TransactionModal';
import { AddWalletModal } from './components/modals/AddWalletModal';
import { PinLockModal } from './components/modals/PinLockModal';
import { OnboardingTutorialModal } from './components/onboarding/OnboardingTutorialModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { WifiOff, Loader2 } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, isAuthLoading, activeTab, appPin, isAppUnlocked, announcementNotice } = useFinance();
  const isOnline = useOnlineStatus();

  // 1. Loading state while checking Firebase authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white font-extrabold text-2xl shadow-xl shadow-blue-600/30 mb-4 animate-pulse">
          F
        </div>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span>Memuat sesi FinBag...</span>
        </div>
      </div>
    );
  }

  // 2. Authentication Barrier: Enforce login, NO guest mode allowed
  if (!user) {
    return <LoginView />;
  }

  // 3. Authenticated App Layout directly connected to Firestore
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors">
      {/* PIN Lock Screen if locked */}
      {appPin && !isAppUnlocked && <PinLockModal />}

      {/* Offline Toast */}
      {!isOnline && (
        <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-sm rounded-xl bg-amber-500/95 backdrop-blur-md px-3.5 py-2.5 text-xs font-semibold text-white shadow-xl flex items-center gap-2">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>Mode Offline — Perubahan akan disinkronkan ke Firestore saat online kembali.</span>
        </div>
      )}

      {/* Sticky Header TopBar */}
      <TopBar />

      {/* Main Body with Desktop Sidebar & Mobile Content */}
      <div className="mx-auto flex max-w-7xl">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Viewport Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-full overflow-x-hidden min-h-[calc(100vh-3.5rem)]">
          {/* System Announcement Notice (if set by Creator) */}
          {announcementNotice && (
            <div className="mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                <span>{announcementNotice}</span>
              </div>
            </div>
          )}

          <div key={activeTab} className="animate-in fade-in-0 slide-in-from-bottom-3 duration-300 fill-mode-both ease-out">
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'wallets' && <WalletsView />}
            {activeTab === 'rates' && <ExchangeRatesView />}
            {activeTab === 'budgets' && <BudgetsView />}
            {activeTab === 'transactions' && <TransactionsView />}
            {activeTab === 'tools' && <ToolsView />}
            {activeTab === 'admin' && <AdminView />}
          </div>
        </main>
      </div>

      {/* Mobile Fixed Bottom Nav */}
      <BottomNav />

      {/* Interactive Global Modals */}
      <TransactionModal />
      <AddWalletModal />
      <OnboardingTutorialModal />
    </div>
  );
};

export default function App() {
  return (
    <FinanceProvider>
      <MainLayout />
    </FinanceProvider>
  );
}
