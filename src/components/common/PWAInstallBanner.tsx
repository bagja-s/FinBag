import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Download, X, Smartphone, Sparkles, Check } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const { language } = useFinance();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('finbag_pwa_banner_dismissed') === 'true';
  });

  const t = getTranslation(language);

  if (isInstalled || isDismissed) return null;
  // If not installable and not iOS, don't show the banner
  if (!isInstallable && !isIOS) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('finbag_pwa_banner_dismissed', 'true');
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50 via-indigo-50/50 to-blue-50 p-4 shadow-sm dark:border-blue-900/50 dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <img 
            src="/pwa-192x192.png" 
            alt="FinBag App" 
            className="h-10 w-10 rounded-xl shadow-md border border-white/50 dark:border-slate-700 shrink-0 mt-0.5" 
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                {t.installBannerTitle}
              </h4>
              <span className="flex items-center gap-1 text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded">
                <Sparkles className="h-3 w-3" /> PWA
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 max-w-xl">
              {t.installBannerDesc}
            </p>

            <div className="mt-2.5 flex items-center gap-2">
              {isInstallable && (
                <button
                  onClick={install}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition-all cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{t.installNow}</span>
                </button>
              )}
              {isIOS && (
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {language === 'id' 
                    ? 'Tekan ikon Bagikan di Safari > Tambahkan ke Layar Utama' 
                    : 'Tap Share in Safari > Add to Home Screen'}
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={handleDismiss}
          title={language === 'id' ? 'Tutup Saran' : 'Dismiss'}
          aria-label="Tutup"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-white/60 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
