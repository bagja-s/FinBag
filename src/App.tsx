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
import { SettingsView } from './components/views/SettingsView';
import { AdminView } from './components/views/AdminView';
import { LoginView } from './components/views/LoginView';
import { TransactionModal } from './components/modals/TransactionModal';
import { AddWalletModal } from './components/modals/AddWalletModal';
import { WalletDetailModal } from './components/modals/WalletDetailModal';
import { PinLockModal } from './components/modals/PinLockModal';
import { OnboardingTutorialModal } from './components/onboarding/OnboardingTutorialModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { WifiOff, Loader2, UserX, Clock } from 'lucide-react';
import { getTranslation } from './i18n/translations';
import { AnimatePresence, motion } from 'motion/react';
import { pageVariants } from './utils/motionVariants';

const MainLayout: React.FC = () => {
  const { 
    user, 
    currentUserProfile, 
    isAdmin, 
    logout, 
    language,
    isAuthLoading, 
    activeTab, 
    appPin, 
    isAppUnlocked, 
    announcementNotice,
    announcementExpiry
  } = useFinance();
  const isOnline = useOnlineStatus();
  const t = getTranslation(language);

  // 1. Loading state while checking Firebase authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <img 
          src="/icon.svg" 
          alt="FinBag" 
          className="h-14 w-14 rounded-2xl bg-white p-1.5 border border-slate-700 shadow-xl shadow-blue-600/20 mb-4 animate-pulse object-contain" 
        />
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span>{language === 'id' ? 'Memuat sesi FinBag...' : 'Loading FinBag session...'}</span>
        </div>
      </div>
    );
  }

  // 2. Authentication Barrier: Enforce login, NO guest mode allowed
  if (!user) {
    return <LoginView />;
  }

  // 2.1 Suspended User Account Barrier
  if (currentUserProfile?.status === 'suspended' && !isAdmin) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/20 text-rose-500 mb-4 border border-rose-500/30 shadow-lg shadow-rose-500/10">
          <UserX className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-black text-rose-400">
          {t.userSuspendedTitle}
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
          {t.userSuspendedDesc}
        </p>
        <button
          onClick={logout}
          className="mt-6 rounded-xl bg-slate-800 hover:bg-slate-700 px-5 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer border border-slate-700 shadow-sm"
        >
          {language === 'id' ? 'Keluar dari Akun' : 'Sign Out'}
        </button>
      </div>
    );
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
          <span>
            {language === 'id' 
              ? 'Mode Offline — Perubahan akan disinkronkan ke Firestore saat online kembali.' 
              : 'Offline Mode — Changes will sync to Firestore once back online.'}
          </span>
        </div>
      )}

      {/* Sticky Header TopBar */}
      <TopBar />

      {/* Main Body with Desktop Sidebar & Full-Width Content Canvas */}
      <div className="flex w-full min-h-[calc(100vh-3.5rem)]">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Viewport Canvas */}
        <main className="flex-1 w-full min-w-0 p-4 sm:p-6 lg:px-8 lg:py-6 overflow-x-hidden min-h-[calc(100vh-3.5rem)]">
          {/* System Announcement Notice (if set by Creator) */}
          {announcementNotice && (
            <div className="mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-3 text-xs font-semibold text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                <span>{announcementNotice}</span>
              </div>
              {announcementExpiry && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-mono bg-amber-500/15 border border-amber-500/20 px-2.5 py-1 rounded-xl shrink-0">
                  <Clock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  <span>{t.maintenanceUntil}: {new Date(announcementExpiry).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full"
            >
              {activeTab === 'dashboard' && <DashboardView />}
              {activeTab === 'wallets' && <WalletsView />}
              {activeTab === 'rates' && <ExchangeRatesView />}
              {activeTab === 'budgets' && <BudgetsView />}
              {activeTab === 'transactions' && <TransactionsView />}
              {activeTab === 'tools' && <ToolsView />}
              {activeTab === 'settings' && <SettingsView />}
              {activeTab === 'admin' && <AdminView />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Fixed Bottom Nav */}
      <BottomNav />

      {/* Interactive Global Modals */}
      <TransactionModal />
      <AddWalletModal />
      <WalletDetailModal />
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
