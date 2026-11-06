import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import {
  formatCurrency,
  calculate503020Rule,
  calculateSplitBill
} from '../../utils/financeCalculations';
import {
  Target,
  PieChart,
  Users,
  Lock,
  Plus,
  ShieldCheck,
  Plane,
  Laptop,
  CheckCircle2,
  DollarSign,
  Database,
  AlertTriangle,
  Trash2,
  Sparkles,
  Bell,
  BellRing,
  Settings,
  Globe,
  Sun,
  Moon,
  Download,
  Upload,
  HelpCircle,
  Info,
  RefreshCw,
  Save,
  X
} from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { SupportedCurrency } from '../../types/finance';
import { CURRENCY_METADATA } from '../../services/currencyService';

export const SettingsView: React.FC = () => {
  const {
    goals,
    addGoal,
    contributeToGoal,
    transactions,
    categories,
    wallets,
    baseCurrency,
    exchangeRates,
    appPin,
    setAppPin,
    addTransaction,
    clearAllDatabaseData,
    openTutorial,
    notificationPermission,
    requestNotifications,
    sendTestNotification,
    language,
    setLanguage,
    theme,
    toggleTheme,
    setBaseCurrency,
    exportCSV,
    exportJSON,
    importJSON,
    isAdmin
  } = useFinance();

  const t = getTranslation(language);

  // Notification Test State
  const [isRequestingNotification, setIsRequestingNotification] = useState(false);
  const [isSendingTestNotification, setIsSendingTestNotification] = useState(false);
  const [testNotificationSentMsg, setTestNotificationSentMsg] = useState(false);

  // Goal Creation Form State
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetStr, setGoalTargetStr] = useState('');
  const [goalDate, setGoalDate] = useState('');

  // Goal Contribution State
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeWalletId, setContributeWalletId] = useState<string>(wallets[0]?.id || '');
  const [contributeAmountStr, setContributeAmountStr] = useState('');

  // Split Bill State
  const [billTotal, setBillTotal] = useState<string>('350000');
  const [billTax, setBillTax] = useState<string>('10');
  const [billService, setBillService] = useState<string>('5');
  const [billPeople, setBillPeople] = useState<string>('4');
  const [billSuccessMsg, setBillSuccessMsg] = useState(false);

  // PIN settings state
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinSuccessMsg, setPinSuccessMsg] = useState(false);
  const [pinErrorMsg, setPinErrorMsg] = useState<string | null>(null);
  const [showPinConfirm, setShowPinConfirm] = useState(false);

  // Database reset state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState(false);

  // Import JSON state
  const [importJsonInput, setImportJsonInput] = useState('');
  const [importJsonSuccess, setImportJsonSuccess] = useState(false);
  const [importJsonError, setImportJsonError] = useState<string | null>(null);

  const handleClearDatabase = async () => {
    setIsResetting(true);
    try {
      await clearAllDatabaseData();
      setShowResetConfirm(false);
      setResetSuccessMsg(true);
      setTimeout(() => setResetSuccessMsg(false), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(goalTargetStr);
    if (!goalTitle.trim() || isNaN(target) || target <= 0) return;

    await addGoal({
      title: goalTitle.trim(),
      targetAmount: target,
      currency: baseCurrency,
      targetDate: goalDate || undefined,
      color: '#3B82F6',
      icon: 'Target',
    });

    setGoalTitle('');
    setGoalTargetStr('');
    setGoalDate('');
    setShowAddGoal(false);
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(contributeAmountStr);
    if (!contributeGoalId || isNaN(amount) || amount <= 0) return;

    await contributeToGoal(contributeGoalId, contributeWalletId, amount);
    setContributeAmountStr('');
    setContributeGoalId(null);
  };

  const handleRecordMyShare = async () => {
    await addTransaction({
      date: new Date().toISOString().split('T')[0],
      amount: splitResult.perPerson,
      currency: baseCurrency,
      type: 'expense',
      categoryId: 'food',
      sourceWalletId: wallets[0]?.id || 'w_cash',
      description: `Split Bill: Bayar Bareng (${billPeople} Orang)`,
    });
    setBillSuccessMsg(true);
    setTimeout(() => setBillSuccessMsg(false), 3000);
  };

  const handleSavePin = () => {
    if (newPinInput.length !== 4 || !/^\d+$/.test(newPinInput)) {
      setPinErrorMsg(t.pinInvalid);
      return;
    }
    if (showPinConfirm) {
      if (newPinInput !== confirmPinInput) {
        setPinErrorMsg(t.pinMismatch);
        return;
      }
      setAppPin(newPinInput);
      setNewPinInput('');
      setConfirmPinInput('');
      setShowPinConfirm(false);
      setPinSuccessMsg(true);
      setTimeout(() => setPinSuccessMsg(false), 3000);
    } else {
      setShowPinConfirm(true);
    }
  };

  const handleRemovePin = () => {
    setAppPin(null);
    setPinSuccessMsg(true);
    setTimeout(() => setPinSuccessMsg(false), 3000);
  };

  const handleImportJson = () => {
    try {
      const success = importJSON(importJsonInput);
      if (success) {
        setImportJsonSuccess(true);
        setImportJsonInput('');
        setImportJsonError(null);
        setTimeout(() => setImportJsonSuccess(false), 3000);
      } else {
        setImportJsonError(t.importError);
      }
    } catch (e) {
      setImportJsonError(t.importError);
    }
  };

  const currencies: SupportedCurrency[] = ['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'JPY', 'GBP', 'AUD'];

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const rule503020 = calculate503020Rule(transactions, categories, currentMonthStr, exchangeRates.rates, baseCurrency);

  const splitResult = calculateSplitBill(
    parseFloat(billTotal) || 0,
    parseFloat(billTax) || 0,
    parseFloat(billService) || 0,
    parseInt(billPeople, 10) || 1
  );

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t.settingsTitle}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {t.settingsSubtitle}
        </p>
      </div>

      {/* 1. App Preferences */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Globe className="h-5 w-5 text-blue-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t.preferencesSection}</h2>
        </div>

        <div className="mt-4 space-y-4">
          {/* Language */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">{t.languageLabel}</label>
            <div className="flex rounded-xl bg-slate-200/70 dark:bg-slate-700 p-0.5">
              <button
                onClick={() => setLanguage('id')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  language === 'id'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                ID
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  language === 'en'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">{t.themeLabel}</label>
            <div className="flex rounded-xl bg-slate-200/70 dark:bg-slate-700 p-0.5">
              <button
                onClick={() => { if (theme !== 'light') toggleTheme(); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  theme === 'light'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500 inline-block mr-1" /> {t.themeLight}
              </button>
              <button
                onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  theme === 'dark'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400 inline-block mr-1" /> {t.themeDark}
              </button>
            </div>
          </div>

          {/* Base Currency */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">{t.currencyLabel}</label>
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
        </div>
      </div>

      {/* 2. Security & PIN */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Lock className="h-5 w-5 text-rose-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t.securitySection}</h2>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {appPin ? t.pinEnabled : t.pinDisabled}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              Lindungi catatan saldo dan data transaksi dengan 4-digit PIN saat membuka aplikasi.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {appPin ? (
              <button
                onClick={handleRemovePin}
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400"
              >
                {t.pinRemove}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  maxLength={4}
                  placeholder={showPinConfirm ? t.pinConfirm : t.pinSet}
                  value={showPinConfirm ? confirmPinInput : newPinInput}
                  onChange={(e) => showPinConfirm ? setConfirmPinInput(e.target.value) : setNewPinInput(e.target.value)}
                  className="h-9 w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-xs font-mono font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  onClick={handleSavePin}
                  className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500"
                >
                  {showPinConfirm ? t.save : t.pinSet}
                </button>
              </div>
            )}
          </div>
        </div>

        {pinErrorMsg && (
          <p className="mt-2 text-xs font-semibold text-rose-500">{pinErrorMsg}</p>
        )}

        {pinSuccessMsg && (
          <p className="mt-2 text-xs font-semibold text-emerald-500">
            Pengaturan PIN berhasil diperbarui.
          </p>
        )}
      </div>

      {/* 3. Push Notifications */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t.notificationsSection}</h2>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              notificationPermission === 'granted'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                : notificationPermission === 'denied'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                notificationPermission === 'granted'
                  ? 'bg-emerald-500 animate-pulse'
                  : notificationPermission === 'denied'
                  ? 'bg-rose-500'
                  : 'bg-slate-400'
              }`}
            />
            {notificationPermission === 'granted'
              ? t.notificationStatusGranted
              : notificationPermission === 'denied'
              ? t.notificationStatusDenied
              : t.notificationStatusDefault}
          </span>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t.notificationsDesc}</p>
            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
              Menerima peringatan saat kategori pengeluaran mencapai 80% dan 100% dari pagu bulanan, serta perayaan saat target tabungan tercapai.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {notificationPermission !== 'granted' ? (
              <button
                onClick={async () => {
                  setIsRequestingNotification(true);
                  await requestNotifications();
                  setIsRequestingNotification(false);
                }}
                disabled={isRequestingNotification || notificationPermission === 'denied'}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {isRequestingNotification ? 'Menghubungkan...' : t.enableNotifications}
              </button>
            ) : (
              <button
                onClick={async () => {
                  setIsSendingTestNotification(true);
                  const ok = await sendTestNotification();
                  setIsSendingTestNotification(false);
                  if (ok) {
                    setTestNotificationSentMsg(true);
                    setTimeout(() => setTestNotificationSentMsg(false), 3000);
                  }
                }}
                disabled={isSendingTestNotification}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <Bell className="h-3.5 w-3.5 text-amber-500" />
                <span>{isSendingTestNotification ? t.testNotificationSending : t.testNotificationBtn}</span>
              </button>
            )}
          </div>
        </div>

        {testNotificationSentMsg && (
          <p className="mt-2.5 text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{t.testNotificationSent}</span>
          </p>
        )}
      </div>

      {/* 4. Data Management */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Database className="h-5 w-5 text-blue-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t.dataSection}</h2>
        </div>

        <div className="mt-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {language === 'id' ? 'Koneksi Database Langsung (Tanpa Dummy / Mode Tamu)' : 'Direct Database Sync (Zero Dummy / No Guest Mode)'}
              </p>
              <p className="text-slate-400 mt-0.5">
                {language === 'id'
                  ? 'Setiap mutasi, rekening, dan tabungan Anda tersimpan secara persisten di database Cloud Firestore Anda.'
                  : 'Every transaction, wallet, and goal is persistently stored in your personal Cloud Firestore database.'}
              </p>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold text-[11px]">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Database Aktif</span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={exportCSV} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors">
              <Download className="w-4 h-4" />
              <span>{t.exportCSV}</span>
            </button>
            <button onClick={exportJSON} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors">
              <Download className="w-4 h-4" />
              <span>{t.exportJSON}</span>
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 block">{t.importJSON}</label>
            <textarea
              value={importJsonInput}
              onChange={(e) => setImportJsonInput(e.target.value)}
              placeholder="Paste JSON backup data here..."
              rows={3}
              className="w-full h-24 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleImportJson}
                className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 transition-colors"
              >
                <Upload className="w-3.5 h-3.5 inline-block mr-1" /> {t.importJSON}
              </button>
              {importJsonSuccess && (
                <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {t.importSuccess}
                </span>
              )}
              {importJsonError && (
                <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> {importJsonError}
                </span>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">{t.clearDatabase}</h4>
                  <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">{t.clearDatabaseDesc}</p>
                </div>
              </div>

              <button
                onClick={() => setShowResetConfirm(true)}
                className="shrink-0 flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-600 shadow-sm hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>{t.clearDatabase}</span>
              </button>
            </div>

            {resetSuccessMsg && (
              <p className="mt-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>Seluruh data di database cloud Anda telah berhasil dikosongkan.</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 5. Guide & Help */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/20">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t.tutorialSection}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {language === 'id'
                  ? 'Buka kembali panduan interaktif fitur FinBag dan petunjuk instalasi PWA.'
                  : 'Replay the interactive FinBag feature tour and PWA installation guide.'}
              </p>
            </div>
          </div>
          <button
            onClick={openTutorial}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>{t.openTutorial}</span>
          </button>
        </div>
      </div>

      {/* 6. App Info */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Info className="h-5 w-5 text-slate-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t.appVersion}</h2>
        </div>
        <div className="mt-4 text-xs text-slate-500 dark:text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>FinBag</span>
            <span className="font-mono font-semibold">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Build</span>
            <span className="font-mono font-semibold">React 19 + Vite + TypeScript</span>
          </div>
          <div className="flex justify-between">
            <span>Firebase</span>
            <span className="font-mono font-semibold">Firestore + Auth</span>
          </div>
          <div className="flex justify-between">
            <span>AI Engine</span>
            <span className="font-mono font-semibold">Gemini 3.8 Flash</span>
          </div>
          <div className="flex justify-between">
            <span>Styling</span>
            <span className="font-mono font-semibold">Tailwind CSS 4 + Motion</span>
          </div>
        </div>
      </div>

      {/* Database Clear Confirmation Modal */}
      <ConfirmationModal
        isOpen={showResetConfirm}
        title={t.confirmClearDbTitle}
        message={t.confirmClearDbDesc}
        confirmText={language === 'id' ? 'Ya, Bersihkan Seluruh Database' : 'Yes, Wipe All Database'}
        cancelText={t.cancel}
        variant="danger"
        isLoading={isResetting}
        onConfirm={handleClearDatabase}
        onCancel={() => setShowResetConfirm(false)}
        details={[
          { label: 'Cloud Database', value: 'Google Cloud Firestore' },
          { label: 'Dompet Tersimpan', value: `${wallets.length} rekening` },
          { label: 'Riwayat Transaksi', value: `${transactions.length} transaksi` },
          { label: 'Target Tabungan', value: `${goals.length} target` },
        ]}
      />
    </div>
  );
};