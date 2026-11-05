import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../context/FinanceContext';
import { getTranslation } from '../i18n/translations';
import { SupportedCurrency } from '../types/finance';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { CURRENCY_METADATA } from '../services/currencyService';
import { 
  Sun, 
  Moon, 
  Download, 
  Wifi, 
  WifiOff, 
  Lock, 
  LogOut, 
  User as UserIcon,
  RefreshCw,
  Globe,
  X,
  SlidersHorizontal,
  Check
} from 'lucide-react';

export const TopBar: React.FC = () => {
  const { 
    user, 
    loginWithGoogle, 
    logout, 
    language, 
    setLanguage, 
    baseCurrency, 
    setBaseCurrency, 
    theme, 
    toggleTheme,
    appPin,
    lockApp,
    exchangeRates,
    refreshExchangeRates,
    isRatesLoading
  } = useFinance();

  const isOnline = useOnlineStatus();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const t = getTranslation(language);

  const currencies: SupportedCurrency[] = ['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'JPY', 'GBP', 'AUD'];

  // Current rate of 1 USD to IDR for quick display
  const usdToIdr = exchangeRates.rates.IDR ? Math.round(exchangeRates.rates.IDR).toLocaleString('id-ID') : '16.250';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 transition-colors">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <a href="/" className="flex items-center gap-2 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-extrabold text-lg shadow-md shadow-blue-500/20 group-hover:bg-blue-500 transition-colors">
              F
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                FinBag
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                {user ? user.displayName || t.cloudSynced : t.cloudSynced}
              </span>
            </div>
          </a>
        </div>

        {/* Zone 2: Informational / Telemetry (FX Ticker & Status) - Desktop only */}
        <div className="hidden md:flex items-center gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/80">
            <span className="text-slate-400">1 USD =</span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
              Rp {usdToIdr}
            </span>
            <button 
              onClick={() => refreshExchangeRates()} 
              title={t.refreshRates}
              className="ml-1 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${isRatesLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">{t.online}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-500">
                <WifiOff className="w-3.5 h-3.5" />
                <span>{t.offline}</span>
              </span>
            )}
          </div>
        </div>

        {/* Zone 3: Interactive Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* ================= DESKTOP CONTROLS (Hidden on Mobile) ================= */}
          {/* Currency Picker */}
          <div className="hidden sm:block">
            <select
              value={baseCurrency}
              onChange={(e) => setBaseCurrency(e.target.value as SupportedCurrency)}
              aria-label="Pilih Mata Uang Utama"
              className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {currencies.map((c) => (
                <option key={c} value={c}>
                  {CURRENCY_METADATA[c].symbol} {c}
                </option>
              ))}
            </select>
          </div>

          {/* Language Toggle Button */}
          <button
            onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
            title="Ganti Bahasa / Switch Language"
            className="hidden sm:flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Ganti Tema Gelap / Terang"
            className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* App Lock PIN Quick Trigger */}
          {appPin && (
            <button
              onClick={lockApp}
              title="Kunci Aplikasi"
              className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
            >
              <Lock className="w-4 h-4 text-rose-500" />
            </button>
          )}

          {/* PWA Install Button */}
          {!isInstalled && isInstallable && (
            <button
              onClick={install}
              className="hidden sm:flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-medium text-white hover:bg-blue-500 transition-colors shadow-sm whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t.installPWA}</span>
            </button>
          )}

          {/* iOS PWA prompt */}
          {!isInstalled && isIOS && (
            <button
              onClick={() => setShowIOSModal(true)}
              className="hidden sm:flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install PWA</span>
            </button>
          )}

          {/* Desktop User Profile / Auth Button */}
          <div className="relative hidden sm:block">
            {user ? (
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 pl-1 pr-2.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">
                    {user.displayName?.[0] || 'U'}
                  </div>
                )}
                <span className="max-w-[80px] truncate">{user.displayName || 'Akun'}</span>
              </button>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-50 px-3 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors whitespace-nowrap"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span>{t.signInWithGoogle}</span>
              </button>
            )}

            {/* Desktop User Dropdown Menu */}
            {showUserMenu && user && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200 ease-out origin-top-right">
                <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      logout();
                      setShowUserMenu(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.signOut}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ================= MOBILE CONTROLS (Single Clean Trigger) ================= */}
          <div className="sm:hidden">
            {user ? (
              <button
                onClick={() => setShowMobileMenu(true)}
                aria-label="Buka Menu Preferensi dan Akun"
                className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1 pr-2 text-xs font-medium text-slate-700 active:scale-95 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-transform"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" className="h-7 w-7 rounded-lg object-cover ring-1 ring-blue-500/30" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-xs font-bold text-white shadow-sm">
                    {user.displayName?.[0] || 'U'}
                  </div>
                )}
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>
            ) : (
              <button
                onClick={() => setShowMobileMenu(true)}
                aria-label="Buka Menu Preferensi dan Masuk"
                className="flex h-9 items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/80 px-2.5 text-xs font-semibold text-blue-600 active:scale-95 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-400 transition-transform"
              >
                <UserIcon className="w-4 h-4" />
                <span>Masuk</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ================= MOBILE BOTTOM SHEET / PREFERENCES DRAWER ================= */}
      {showMobileMenu && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[60] flex flex-col justify-end sm:hidden">
          {/* Backdrop */}
          <div 
            onClick={() => setShowMobileMenu(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in duration-300"
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div className="relative w-full rounded-t-3xl border-t border-slate-200 bg-white p-5 pb-8 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-300 ease-out fill-mode-both">
            {/* Drawer Handle */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                    {t.quickPreferences}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isOnline ? `● ${t.online}` : `● ${t.offline}`} • 1 USD = Rp {usdToIdr}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                aria-label="Tutup Menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Profile Card */}
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 dark:bg-slate-800/60 dark:border-slate-800">
              {user ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="h-10 w-10 rounded-xl object-cover ring-2 ring-blue-500/20" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
                        {user.displayName?.[0] || 'U'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {user.displayName || 'Pengguna FinBag'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      logout();
                      setShowMobileMenu(false);
                    }}
                    className="flex shrink-0 items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.signOut}</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    Masuk dengan akun Google untuk sinkronisasi otomatis ke cloud.
                  </p>
                  <button
                    onClick={() => {
                      loginWithGoogle();
                      setShowMobileMenu(false);
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md shadow-blue-500/20 active:scale-[0.99] transition-transform"
                  >
                    <UserIcon className="w-4 h-4" />
                    <span>{t.signInWithGoogle}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Base Currency Selection */}
            <div className="mt-4">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                {t.baseCurrency}
              </label>
              <div className="grid grid-cols-4 gap-2">
                {currencies.map((c) => {
                  const isSelected = baseCurrency === c;
                  return (
                    <button
                      key={c}
                      onClick={() => setBaseCurrency(c)}
                      className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border text-xs font-bold transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300'
                      }`}
                    >
                      <span className="text-[10px] font-normal text-slate-400">
                        {CURRENCY_METADATA[c].symbol}
                      </span>
                      <span className="leading-tight flex items-center gap-1">
                        {c}
                        {isSelected && <Check className="w-3 h-3 text-blue-600 dark:text-blue-400 stroke-[3]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Language & Theme Controls */}
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {/* Language Switch */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-2">
                  <Globe className="w-3.5 h-3.5 text-blue-500" />
                  Bahasa (Language)
                </span>
                <div className="flex rounded-xl bg-slate-200/70 dark:bg-slate-700 p-0.5">
                  <button
                    onClick={() => setLanguage('id')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      language === 'id'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    ID
                  </button>
                  <button
                    onClick={() => setLanguage('en')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      language === 'en'
                        ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              {/* Theme Switch */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 dark:bg-slate-800/50 dark:border-slate-800">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mb-2">
                  {theme === 'dark' ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5 text-amber-500" />}
                  {t.appearance}
                </span>
                <div className="flex rounded-xl bg-slate-200/70 dark:bg-slate-700 p-0.5">
                  <button
                    onClick={() => {
                      if (theme !== 'light') toggleTheme();
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      theme === 'light'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {t.themeLight}
                  </button>
                  <button
                    onClick={() => {
                      if (theme !== 'dark') toggleTheme();
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      theme === 'dark'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {t.themeDark}
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions (Lock App & PWA) */}
            <div className="mt-3 space-y-2">
              {appPin && (
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    lockApp();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/70 py-2.5 text-xs font-semibold text-rose-600 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-400 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  <span>{t.lockNow}</span>
                </button>
              )}

              {!isInstalled && isInstallable && (
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    install();
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>{t.installPWA}</span>
                </button>
              )}

              {!isInstalled && isIOS && (
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowIOSModal(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Panduan Pasang di iPhone/iPad</span>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* iOS Install Instruction Modal */}
      {showIOSModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Pasang FinBag di iPhone/iPad</h3>
            <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <p>1. Ketuk tombol <strong>Bagikan (Share)</strong> pada browser Safari.</p>
              <p>2. Gulir ke bawah lalu ketuk <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</p>
              <p>3. FinBag akan terpasang sebagai aplikasi mandiri di layar utama Anda.</p>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-500 transition-colors"
            >
              Tutup Panduan
            </button>
          </div>
        </div>,
        document.body
      )}
    </header>
  );
};
