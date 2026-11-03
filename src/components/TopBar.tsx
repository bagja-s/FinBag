import React, { useState } from 'react';
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
  Globe
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

        {/* Zone 2: Informational / Telemetry (FX Ticker & Status) */}
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

        {/* Zone 3: Interactive Controls (Currency, Lang, Theme, Install, Auth) */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Currency Picker */}
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

          {/* Language Toggle Button */}
          <button
            onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
            title="Ganti Bahasa / Switch Language"
            className="flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 text-xs font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            <Globe className="w-3.5 h-3.5 text-blue-500" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Ganti Tema Gelap / Terang"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

          {/* App Lock PIN Quick Trigger */}
          {appPin && (
            <button
              onClick={lockApp}
              title="Kunci Aplikasi"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
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

          {/* Auth Button / User Profile */}
          <div className="relative">
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
                <span className="hidden sm:inline max-w-[80px] truncate">{user.displayName || 'Akun'}</span>
              </button>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="flex h-8 items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-50 px-3 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors whitespace-nowrap"
              >
                <UserIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.signInWithGoogle}</span>
                <span className="sm:hidden">Masuk</span>
              </button>
            )}

            {/* User Dropdown Menu */}
            {showUserMenu && user && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 z-50">
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
        </div>
      </div>

      {/* iOS Install Instruction Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
        </div>
      )}
    </header>
  );
};
