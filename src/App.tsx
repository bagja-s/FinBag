/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { Suspense, lazy } from 'react';
import { FinanceProvider, useFinance } from './context/FinanceContext';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { DashboardView } from './components/views/DashboardView';
import { LoginView } from './components/views/LoginView';
import { TransactionModal } from './components/modals/TransactionModal';
import { AddWalletModal } from './components/modals/AddWalletModal';
import { WalletDetailModal } from './components/modals/WalletDetailModal';
import { PinLockModal } from './components/modals/PinLockModal';
import { CommandPaletteModal } from './components/modals/CommandPaletteModal';
import { OnboardingTutorialModal } from './components/onboarding/OnboardingTutorialModal';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { WifiOff, Loader2, UserX, Clock, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { getTranslation } from './i18n/translations';
import { AnimatePresence, motion } from 'motion/react';
import { pageVariants } from './utils/motionVariants';

// Code-split secondary views for faster initial bundle load
const WalletsView = lazy(() => import('./components/views/WalletsView').then((m) => ({ default: m.WalletsView })));
const ExchangeRatesView = lazy(() => import('./components/views/ExchangeRatesView').then((m) => ({ default: m.ExchangeRatesView })));
const BudgetsView = lazy(() => import('./components/views/BudgetsView').then((m) => ({ default: m.BudgetsView })));
const TransactionsView = lazy(() => import('./components/views/TransactionsView').then((m) => ({ default: m.TransactionsView })));
const ToolsView = lazy(() => import('./components/views/ToolsView').then((m) => ({ default: m.ToolsView })));
const SettingsView = lazy(() => import('./components/views/SettingsView').then((m) => ({ default: m.SettingsView })));
const AdminView = lazy(() => import('./components/views/AdminView').then((m) => ({ default: m.AdminView })));

const ViewSkeletonFallback: React.FC = () => (
  <div className="space-y-4 py-2 animate-pulse">
    <div className="h-8 w-48 rounded-xl bg-slate-200 dark:bg-slate-800" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
      <div className="h-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />
    </div>
    <div className="h-64 rounded-2xl bg-slate-200 dark:bg-slate-800" />
  </div>
);

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
    announcementExpiry,
    toastNotice,
    dismissToast
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

      {/* Interactive Toast Feedback Banner */}
      <AnimatePresence>
        {toastNotice && (
          <motion.div
            key={toastNotice.id}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 lg:bottom-6 right-4 z-[75] max-w-sm rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3 text-xs font-semibold text-slate-800 shadow-xl backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-slate-100 flex items-center gap-2.5"
          >
            {toastNotice.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            ) : toastNotice.type === 'warning' ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            ) : (
              <Info className="h-4 w-4 shrink-0 text-blue-500" />
            )}
            <span className="leading-snug">{toastNotice.message}</span>
            <button
              type="button"
              onClick={dismissToast}
              className="ml-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

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
              <Suspense fallback={<ViewSkeletonFallback />}>
                {activeTab === 'dashboard' && <DashboardView />}
                {activeTab === 'wallets' && <WalletsView />}
                {activeTab === 'rates' && <ExchangeRatesView />}
                {activeTab === 'budgets' && <BudgetsView />}
                {activeTab === 'transactions' && <TransactionsView />}
                {activeTab === 'tools' && <ToolsView />}
                {activeTab === 'settings' && <SettingsView />}
                {activeTab === 'admin' && <AdminView />}
              </Suspense>
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
      <CommandPaletteModal />
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
