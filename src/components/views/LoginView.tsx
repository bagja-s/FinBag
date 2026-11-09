import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { 
  ShieldCheck, 
  Smartphone, 
  Coins, 
  Cloud, 
  CheckCircle2, 
  Globe, 
  Sun, 
  Moon, 
  AlertCircle 
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { 
    loginWithGoogle, 
    language, 
    setLanguage, 
    theme, 
    toggleTheme 
  } = useFinance();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const t = getTranslation(language);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      console.error('Google Sign-In failed:', err);
      const message = err instanceof Error ? err.message : (language === 'id' ? 'Gagal masuk dengan akun Google.' : 'Failed to sign in with Google.');
      setErrorMsg(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-slate-950 text-slate-100 overflow-x-hidden selection:bg-blue-600 selection:text-white">
      {/* Ambient Radial Highlights */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[500px] bg-blue-600/15 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl" />

      {/* Top Header Controls */}
      <header className="relative z-10 mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <img 
            src="/icon.svg" 
            alt="FinBag" 
            className="h-10 w-10 rounded-xl bg-white p-1 border border-slate-700 shadow-lg object-contain" 
          />
          <div>
            <span className="text-xl font-bold tracking-tight text-white leading-none">FinBag</span>
            <span className="block text-[10px] text-blue-400 font-medium tracking-wide uppercase mt-0.5">
              Personal Finance PWA
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'id' ? 'en' : 'id')}
            title={language === 'id' ? 'Ganti Bahasa / Switch Language' : 'Switch Language / Ganti Bahasa'}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            <Globe className="h-3.5 w-3.5 text-blue-400" />
            <span>{language.toUpperCase()}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label={language === 'id' ? 'Ganti Tema' : 'Toggle Theme'}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-300" />}
          </button>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="relative z-10 mx-auto my-auto flex w-full max-w-md flex-col px-5 py-8">
        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-400">
            <Cloud className="h-3.5 w-3.5" />
            <span>{language === 'id' ? 'Cloud Firestore Sync Real-Time' : 'Real-Time Cloud Firestore Sync'}</span>
          </div>

          <h1 className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {language === 'id' ? 'Masuk ke FinBag' : 'Welcome to FinBag'}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
            {language === 'id'
              ? 'Kelola multi-rekening, mutasi, dan target finansial Anda secara real-time langsung dari database cloud pribadi Anda.'
              : 'Manage your multi-currency accounts, transactions, and financial goals in real-time directly from your personal cloud database.'}
          </p>

          {/* Direct Database Guarantee */}
          <div className="mt-6 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2.5">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-300">
                <strong>{language === 'id' ? '100% Data Database Nyata' : '100% Real Database Data'}</strong>: {language === 'id' ? 'Bebas data dummy/palsu. Mulai dari database bersih Anda.' : 'Zero dummy data. Starts clean directly from your database.'}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-300">
                <strong>{language === 'id' ? 'Multi-User & Multi-Device' : 'Multi-User & Multi-Device'}</strong>: {language === 'id' ? 'Tersinkronisasi otomatis antar ponsel & laptop Anda.' : 'Automatically synchronized across your mobile and desktop devices.'}
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <Coins className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span className="text-xs text-slate-300">
                <strong>{language === 'id' ? 'Multi-Mata Uang & Kurs Live' : 'Multi-Currency & Live FX'}</strong>: {language === 'id' ? 'IDR, USD, EUR, SGD, dll. dengan konversi otomatis.' : 'IDR, USD, EUR, SGD, etc. with automated live conversion.'}
              </span>
            </div>
          </div>

          {/* Error Message if Login Fails */}
          {errorMsg && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Google Sign In CTA Button */}
          <div className="mt-6">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="group relative flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-3.5 text-xs sm:text-sm font-bold text-slate-900 shadow-xl hover:bg-slate-100 active:scale-[0.99] transition-all disabled:opacity-70 disabled:pointer-events-none"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  <span>{language === 'id' ? 'Menghubungkan Akun...' : 'Connecting Account...'}</span>
                </div>
              ) : (
                <>
                  {/* Official Google G Logo */}
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>{t.signInWithGoogle}</span>
                </>
              )}
            </button>
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-500">
            {language === 'id' 
              ? 'Tanpa mode tamu. Akses eksklusif terhubung langsung ke Firestore database Anda.' 
              : 'No guest mode. Exclusive access directly connected to your Firestore database.'}
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 mx-auto w-full max-w-5xl px-5 py-4 text-center text-xs text-slate-500">
        FinBag &bull; Executive Navy Finance PWA &bull; Secure Cloud Sync
      </footer>
    </div>
  );
};
