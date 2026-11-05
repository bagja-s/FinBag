import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Download, 
  Sparkles, 
  BarChart3, 
  Wallet, 
  Globe2, 
  Smartphone,
  ShieldCheck,
  Camera
} from 'lucide-react';

export const OnboardingTutorialModal: React.FC = () => {
  const { isOnboardingOpen, setIsOnboardingOpen, language } = useFinance();
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [currentStep, setCurrentStep] = useState(0);
  const [hasTriggeredInstall, setHasTriggeredInstall] = useState(false);

  const t = getTranslation(language);

  if (!isOnboardingOpen) return null;

  const handleFinish = () => {
    localStorage.setItem('finbag_onboarding_completed', 'true');
    setIsOnboardingOpen(false);
    setCurrentStep(0);
  };

  const handleInstallClick = async () => {
    setHasTriggeredInstall(true);
    await install();
  };

  const steps = [
    {
      title: t.step1Title,
      desc: t.step1Desc,
      icon: Globe2,
      badge: language === 'id' ? 'Multi-Currency & Cloud Sync' : 'Multi-Currency & Cloud Sync',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-900',
      illustration: (
        <div className="relative flex items-center justify-center p-6 my-2">
          <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-xl">
              <Wallet className="h-8 w-8" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                USD • EUR • IDR • SGD
              </div>
              <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-900">
                <ShieldCheck className="h-3 w-3" />
                <span>Cloud Firestore</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t.step2Title,
      desc: t.step2Desc,
      icon: Camera,
      badge: language === 'id' ? 'Kamera & Gemini 3.8 Flash' : 'Camera & Gemini 3.8 Flash',
      badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
      illustration: (
        <div className="relative flex items-center justify-center p-6 my-2">
          <div className="absolute inset-0 bg-emerald-500/10 dark:bg-emerald-600/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xl">
              <Camera className="h-8 w-8" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span>AI Receipt Scanner</span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {language === 'id' ? 'Otomatis catat toko, nominal & kategori' : 'Auto detect merchant, total & category'}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t.step3Title,
      desc: t.step3Desc,
      icon: BarChart3,
      badge: language === 'id' ? 'Visualisasi Recharts' : 'Recharts Visualization',
      badgeColor: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200 dark:border-purple-900',
      illustration: (
        <div className="relative flex items-center justify-center p-6 my-2">
          <div className="absolute inset-0 bg-purple-500/10 dark:bg-purple-600/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-800 flex items-center justify-center text-white shadow-xl">
              <BarChart3 className="h-8 w-8" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Realisasi
                <span className="h-2 w-2 rounded-full bg-slate-400" /> Pagu
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {language === 'id' ? 'Laporan bulanan interaktif & peringatan overbudget' : 'Interactive monthly reports & overbudget alerts'}
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: t.step4Title,
      desc: t.step4Desc,
      icon: Smartphone,
      badge: language === 'id' ? 'Progressive Web App (PWA)' : 'Progressive Web App (PWA)',
      badgeColor: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-900',
      illustration: (
        <div className="relative flex flex-col items-center justify-center p-4 my-1">
          <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3 mb-3">
            <img 
              src="/pwa-192x192.png" 
              alt="FinBag Icon" 
              className="h-14 w-14 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700"
            />
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">FinBag</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {language === 'id' ? 'Akses Cepat di Layar Utama' : 'Fast Home Screen Access'}
              </p>
            </div>
          </div>

          {/* Install Action or Guidance */}
          {isInstalled ? (
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <Check className="h-4 w-4" />
              <span>{t.installedPWA}</span>
            </div>
          ) : isInstallable ? (
            <button
              onClick={handleInstallClick}
              disabled={hasTriggeredInstall}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 active:scale-95 transition-all cursor-pointer"
            >
              <Download className="h-4 w-4" />
              <span>{t.installNow}</span>
            </button>
          ) : isIOS ? (
            <div className="text-center rounded-xl bg-slate-50 dark:bg-slate-800/80 p-2.5 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300">
              {language === 'id' 
                ? 'Di Safari iPhone/iPad: Tekan ikon Bagikan (Share), lalu pilih "Tambahkan ke Layar Utama".' 
                : 'On iOS Safari: Tap Share icon, then select "Add to Home Screen".'}
            </div>
          ) : (
            <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">
              {language === 'id' 
                ? 'Tekan menu browser Anda dan pilih "Tambahkan ke Layar Utama / Install".' 
                : 'Click your browser menu and choose "Add to Home Screen / Install".'}
            </p>
          )}
        </div>
      ),
    },
  ];

  const current = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-300 ease-out"
        role="dialog"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${current.badgeColor}`}>
            {current.badge}
          </span>
          <button
            onClick={handleFinish}
            title={language === 'id' ? 'Lewati Tutorial' : 'Skip Tutorial'}
            aria-label="Tutup"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="mt-4 text-center">
          {current.illustration}

          <h3 className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight mt-2">
            {current.title}
          </h3>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
            {current.desc}
          </p>
        </div>

        {/* Stepper Dots & Navigation Controls */}
        <div className="mt-8 flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          {/* Step Dots */}
          <div className="flex items-center gap-1.5">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentStep === idx 
                    ? 'w-6 bg-blue-600 dark:bg-blue-400' 
                    : 'w-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300'
                }`}
                aria-label={`Ke Langkah ${idx + 1}`}
              />
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((prev) => Math.max(prev - 1, 0))}
                className="flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>{t.prevStep}</span>
              </button>
            )}

            {isLast ? (
              <button
                onClick={handleFinish}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-500 active:scale-95 transition-all cursor-pointer"
              >
                <span>{t.startUsingApp}</span>
                <Check className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))}
                className="flex items-center gap-1 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-500 active:scale-95 transition-all cursor-pointer"
              >
                <span>{t.nextStep}</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
