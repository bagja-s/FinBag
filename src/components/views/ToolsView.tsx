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
  Sparkles
} from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const ToolsView: React.FC = () => {
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
    language 
  } = useFinance();

  const t = getTranslation(language);

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
  const [pinSuccessMsg, setPinSuccessMsg] = useState(false);

  // Database reset state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSuccessMsg, setResetSuccessMsg] = useState(false);

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

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const rule503020 = calculate503020Rule(transactions, categories, currentMonthStr, exchangeRates.rates, baseCurrency);

  const splitResult = calculateSplitBill(
    parseFloat(billTotal) || 0,
    parseFloat(billTax) || 0,
    parseFloat(billService) || 0,
    parseInt(billPeople, 10) || 1
  );

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
    if (newPinInput.length === 4 && /^\d+$/.test(newPinInput)) {
      setAppPin(newPinInput);
      setNewPinInput('');
      setPinSuccessMsg(true);
      setTimeout(() => setPinSuccessMsg(false), 3000);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t.toolsTitle}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {language === 'id' ? 'Target tabungan, evaluasi 50/30/20, kalkulator split bill, dan keamanan PIN' : 'Savings pots, 50/30/20 rule, split bill calculator, and PIN lock'}
        </p>
      </div>

      {/* 1. Target Tabungan (Financial Goals) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t.goalsTitle}</h2>
          </div>
          <button
            onClick={() => setShowAddGoal(!showAddGoal)}
            className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t.addGoal}</span>
          </button>
        </div>

        {/* Add Goal Form */}
        {showAddGoal && (
          <form onSubmit={handleCreateGoal} className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Buat Target Tabungan Baru</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Judul Target (cth: Liburan Bali)"
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                required
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none"
              />
              <input
                type="number"
                placeholder="Nominal Target"
                value={goalTargetStr}
                onChange={(e) => setGoalTargetStr(e.target.value)}
                required
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none tabular-nums"
              />
              <input
                type="date"
                value={goalDate}
                onChange={(e) => setGoalDate(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddGoal(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500"
              >
                Simpan Target
              </button>
            </div>
          </form>
        )}

        {/* Goals Grid */}
        {goals.length === 0 ? (
          <div className="mt-4 p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === 'id' ? 'Database Target Tabungan Masih Kosong' : 'No Financial Goals Found in Database'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              {language === 'id' 
                ? 'Tentukan target menabung Anda (cth: Dana Darurat, Liburan, Laptop). Data tersimpan langsung di database cloud Anda.' 
                : 'Set your personal savings goals (e.g. Emergency Fund, Travel, Laptop). Directly stored in your cloud database.'}
            </p>
            <button
              onClick={() => setShowAddGoal(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-500 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{t.addGoal}</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {goals.map((goal) => {
              const pct = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
              return (
                <div key={goal.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {goal.title}
                    </h4>
                    <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                      {pct}%
                    </span>
                  </div>

                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                    <span>{formatCurrency(goal.currentAmount, goal.currency)}</span>
                    <span>/ {formatCurrency(goal.targetAmount, goal.currency)}</span>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <button
                      onClick={() => setContributeGoalId(goal.id)}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{t.depositGoal}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Contribute Modal */}
        {contributeGoalId && (
          <form onSubmit={handleContribute} className="mt-4 p-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 space-y-3">
            <h4 className="text-xs font-bold text-blue-900 dark:text-blue-300">
              Setor Tabungan ke: {goals.find(g => g.id === contributeGoalId)?.title}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={contributeWalletId}
                onChange={(e) => setContributeWalletId(e.target.value)}
                className="h-10 rounded-xl border border-blue-300 bg-white px-3 text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    Ambil dari: {w.name} ({formatCurrency(w.balance, w.currency)})
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Nominal Setoran"
                value={contributeAmountStr}
                onChange={(e) => setContributeAmountStr(e.target.value)}
                required
                className="h-10 rounded-xl border border-blue-300 bg-white px-3 text-xs font-mono dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none tabular-nums"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setContributeGoalId(null)}
                className="px-3 py-1.5 text-xs text-slate-500"
              >
                Batal
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500"
              >
                Setor Sekarang
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. Evaluasi Rasio Anggaran 50/30/20 */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-emerald-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t.rule503020Title}</h2>
          </div>
          <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
            {t.healthScore}: {rule503020.healthScore}/100
          </span>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Needs */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
              <span>Kebutuhan (Needs)</span>
              <span className={`font-mono tabular-nums ${rule503020.needsPercentage > 50 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {rule503020.needsPercentage}% (Target 50%)
              </span>
            </div>
            <p className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
              {formatCurrency(rule503020.needsAmount, baseCurrency)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{t.needsDesc}</p>
          </div>

          {/* Wants */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
              <span>Keinginan (Wants)</span>
              <span className={`font-mono tabular-nums ${rule503020.wantsPercentage > 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {rule503020.wantsPercentage}% (Target 30%)
              </span>
            </div>
            <p className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
              {formatCurrency(rule503020.wantsAmount, baseCurrency)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{t.wantsDesc}</p>
          </div>

          {/* Savings */}
          <div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
              <span>Tabungan (Savings)</span>
              <span className={`font-mono tabular-nums ${rule503020.savingsPercentage >= 20 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {rule503020.savingsPercentage}% (Target 20%)
              </span>
            </div>
            <p className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
              {formatCurrency(rule503020.savingsAmount, baseCurrency)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{t.savingsDesc}</p>
          </div>
        </div>
      </div>

      {/* 3. Kalkulator Split Bill */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t.splitBillTitle}</h2>
          </div>
          <span className="text-[11px] text-slate-400">Bagi Tagihan & Catat Cepat</span>
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-500">{t.totalBill}</label>
            <input
              type="number"
              value={billTotal}
              onChange={(e) => setBillTotal(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white tabular-nums focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500">{t.taxPercent}</label>
            <input
              type="number"
              value={billTax}
              onChange={(e) => setBillTax(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white tabular-nums focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500">{t.servicePercent}</label>
            <input
              type="number"
              value={billService}
              onChange={(e) => setBillService(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono dark:border-slate-700 dark:bg-slate-800 dark:text-white tabular-nums focus:outline-none"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-slate-500">{t.numPeople}</label>
            <input
              type="number"
              min="1"
              value={billPeople}
              onChange={(e) => setBillPeople(e.target.value)}
              className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white tabular-nums focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-500">{t.perPerson}:</p>
            <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(splitResult.perPerson, baseCurrency)}
            </p>
            <p className="text-[11px] text-slate-400">
              Grand Total: {formatCurrency(splitResult.grandTotal, baseCurrency)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRecordMyShare}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition-all"
            >
              <DollarSign className="h-4 w-4" />
              <span>{t.recordMyShare}</span>
            </button>
            {billSuccessMsg && (
              <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                <span>Tercatat!</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Keamanan & Kunci PIN Privasi */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Lock className="h-5 w-5 text-rose-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t.securityPin}</h2>
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
                onClick={() => setAppPin(null)}
                className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-400"
              >
                Hapus PIN
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  maxLength={4}
                  placeholder="4-digit PIN"
                  value={newPinInput}
                  onChange={(e) => setNewPinInput(e.target.value)}
                  className="h-9 w-28 rounded-xl border border-slate-200 bg-slate-50 px-3 text-center text-xs font-mono font-bold dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
                <button
                  onClick={handleSavePin}
                  className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-500"
                >
                  Aktifkan
                </button>
              </div>
            )}
          </div>
        </div>

        {pinSuccessMsg && (
          <p className="mt-2 text-xs font-semibold text-emerald-500">
            Pengaturan PIN berhasil diperbarui.
          </p>
        )}
      </div>

      {/* 5. Manajemen Database Cloud Firestore */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Database className="h-5 w-5 text-blue-500" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">
            {language === 'id' ? 'Database Cloud Firestore' : 'Cloud Firestore Database'}
          </h2>
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

          <div className="rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-800 dark:text-rose-300">
                    {language === 'id' ? 'Kosongkan Seluruh Data Database' : 'Wipe All Data from Database'}
                  </h4>
                  <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5">
                    {language === 'id' 
                      ? 'Gunakan opsi ini jika Anda ingin mengosongkan seluruh rekening, mutasi, dan target yang tersimpan di cloud agar database benar-benar bersih 0.' 
                      : 'Use this option if you wish to purge all stored wallets, transactions, and goals in the cloud so your database is completely clean.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowResetConfirm(true)}
                className="shrink-0 flex items-center gap-1.5 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs font-bold text-rose-600 shadow-sm hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>{language === 'id' ? 'Kosongkan Database' : 'Clear Database'}</span>
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

      {/* 6. Panduan & Tutorial Penggunaan */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {t.repeatTutorial}
              </h2>
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
            <span>{language === 'id' ? 'Buka Tutorial' : 'Open Tutorial'}</span>
          </button>
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
