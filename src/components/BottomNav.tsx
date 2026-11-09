import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { getTranslation } from '../i18n/translations';
import {
  LayoutDashboard,
  Wallet,
  Plus,
  PieChart,
  Grid,
  TrendingUp,
  History,
  Settings,
  ShieldCheck,
  X,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    setIsTransactionModalOpen,
    language,
    isAdmin,
    exchangeRates
  } = useFinance();

  const [showMoreDrawer, setShowMoreDrawer] = useState(false);
  const t = getTranslation(language);

  // Compute USD/IDR string for ticker badge
  const usdToIdr = exchangeRates?.rates?.IDR
    ? Math.round(exchangeRates.rates.IDR).toLocaleString(language === 'id' ? 'id-ID' : 'en-US')
    : '16.250';

  // Check if active tab belongs to the "More" menu
  const isMoreActive = ['rates', 'transactions', 'tools', 'settings', 'admin'].includes(activeTab);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 transition-colors pb-safe">
        <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-2">
          {/* Tab 1: Ringkasan / Dashboard */}
          <button
            onClick={() => {
              setActiveTab('dashboard');
              setShowMoreDrawer(false);
            }}
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

          {/* Tab 2: Dompet / Wallets */}
          <button
            onClick={() => {
              setActiveTab('wallets');
              setShowMoreDrawer(false);
            }}
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
              aria-label={language === 'id' ? 'Catat Transaksi Cepat' : 'Quick Add Transaction'}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 active:scale-85 hover:scale-105 hover:bg-blue-500 transition-all duration-200 cursor-pointer"
            >
              <Plus className="h-6 w-6 stroke-[2.5] transition-transform duration-200" />
            </button>
          </div>

          {/* Tab 4: Pagu Anggaran / Budgets (Requested by user) */}
          <button
            onClick={() => {
              setActiveTab('budgets');
              setShowMoreDrawer(false);
            }}
            aria-label={t.navBudgets}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-90 cursor-pointer ${
              activeTab === 'budgets'
                ? 'text-blue-600 dark:text-blue-400 font-bold -translate-y-0.5'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <PieChart className={`h-5 w-5 transition-transform duration-200 ${activeTab === 'budgets' ? 'scale-110 stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight">{t.navBudgets}</span>
            {activeTab === 'budgets' && (
              <span className="h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-400 animate-in zoom-in duration-200" />
            )}
          </button>

          {/* Tab 5: Menu & Alat (Opens Slide-up Sheet with Kurs Live, Mutasi, Alat, Pengaturan) */}
          <button
            onClick={() => setShowMoreDrawer(true)}
            aria-label={t.navTools}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-1 transition-all duration-200 active:scale-90 cursor-pointer ${
              isMoreActive
                ? 'text-blue-600 dark:text-blue-400 font-bold -translate-y-0.5'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Grid className={`h-5 w-5 transition-transform duration-200 ${isMoreActive ? 'scale-110 stroke-[2.5]' : ''}`} />
            <span className="text-[10px] tracking-tight">{language === 'id' ? 'Lainnya' : 'More'}</span>
            {isMoreActive && (
              <span className="h-1 w-1 rounded-full bg-blue-600 dark:bg-blue-400 animate-in zoom-in duration-200" />
            )}
          </button>
        </div>
      </div>

      {/* ================= MOBILE "MORE" / FEATURES SLIDE-UP DRAWER ================= */}
      {showMoreDrawer && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[60] flex flex-col justify-end lg:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setShowMoreDrawer(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
            aria-hidden="true"
          />

          {/* Drawer Body */}
          <div className="relative w-full rounded-t-3xl border-t border-slate-200 bg-white p-5 pb-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 ease-out fill-mode-both">
            {/* Grab Handle */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {language === 'id' ? 'Menu & Fitur Lengkap' : 'All Features & Menu'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    FinBag Personal Finance
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMoreDrawer(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 cursor-pointer"
                aria-label="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Grid Cards */}
            <div className="mt-4 space-y-2">
              {/* Kurs Real-Time & Valas (Prominently featured) */}
              <button
                onClick={() => {
                  setActiveTab('rates');
                  setShowMoreDrawer(false);
                }}
                className={`flex w-full items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  activeTab === 'rates'
                    ? 'border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-sm'
                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm shadow-emerald-600/30">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {t.navRates}
                      </span>
                      <span className="text-[10px] font-mono font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md">
                        1 USD = Rp {usdToIdr}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'id' ? 'Nilai tukar live valas dunia & kalkulator konversi' : 'Live currency exchange & multi-currency converter'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* Riwayat Mutasi Lengkap */}
              <button
                onClick={() => {
                  setActiveTab('transactions');
                  setShowMoreDrawer(false);
                }}
                className={`flex w-full items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  activeTab === 'transactions'
                    ? 'border-blue-500/50 bg-blue-50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200 shadow-sm'
                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/30">
                    <History className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {t.navTransactions}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'id' ? 'Filter, cari, dan ekspor seluruh transaksi keuangan' : 'Filter, search, and export transaction logs'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* Alat Finansial & Target Tabungan */}
              <button
                onClick={() => {
                  setActiveTab('tools');
                  setShowMoreDrawer(false);
                }}
                className={`flex w-full items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  activeTab === 'tools'
                    ? 'border-indigo-500/50 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 shadow-sm'
                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/30">
                    <Grid className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {t.navTools}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'id' ? 'Target tabungan, rasio 50/30/20 & kalkulator split bill' : 'Savings goals, 50/30/20 rule & split bill calculator'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* Pengaturan & Notifikasi */}
              <button
                onClick={() => {
                  setActiveTab('settings');
                  setShowMoreDrawer(false);
                }}
                className={`flex w-full items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                  activeTab === 'settings'
                    ? 'border-slate-500/50 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm'
                    : 'border-slate-100 bg-slate-50 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-700 dark:bg-slate-600 text-white shadow-sm">
                    <Settings className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {t.navSettings}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {language === 'id' ? 'Pengaturan notifikasi, keamanan PIN, dan bahasa' : 'Notification preferences, PIN security & language'}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              </button>

              {/* Admin Console (if Admin) */}
              {isAdmin && (
                <button
                  onClick={() => {
                    setActiveTab('admin');
                    setShowMoreDrawer(false);
                  }}
                  className={`flex w-full items-center justify-between p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    activeTab === 'admin'
                      ? 'border-amber-500/50 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 shadow-sm'
                      : 'border-amber-200/60 bg-amber-50/50 hover:bg-amber-100/60 dark:border-amber-900/40 dark:bg-amber-950/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm shadow-amber-600/30">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-amber-900 dark:text-amber-200">
                          {t.navAdmin}
                        </span>
                        <span className="text-[9px] font-bold bg-amber-400/30 text-amber-800 dark:text-amber-300 px-1.5 py-0.5 rounded">
                          CREATOR
                        </span>
                      </div>
                      <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                        {language === 'id' ? 'Statistik pengguna terdaftar & audit trail' : 'Registered users directory & audit trail'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};