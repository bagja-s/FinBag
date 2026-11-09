import React, { useState, useMemo } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import {
  formatCurrency,
  calculate503020Rule,
  calculateAutoBudget503020Summary,
  calculateSplitBill,
  calculateGoalProgressAndEta,
  calculateDebtSummary
} from '../../utils/financeCalculations';
import { DebtType, SupportedCurrency } from '../../types/finance';
import {
  Target,
  PieChart,
  Users,
  Plus,
  DollarSign,
  CheckCircle2,
  ShieldCheck,
  Clock,
  Trash2,
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  AlertCircle
} from 'lucide-react';

export const ToolsView: React.FC = () => {
  const {
    goals,
    addGoal,
    contributeToGoal,
    deleteGoal,
    debts,
    addDebt,
    settleDebt,
    deleteDebt,
    transactions,
    categories,
    wallets,
    baseCurrency,
    exchangeRates,
    addTransaction,
    language
  } = useFinance();

  const t = getTranslation(language);

  // Goal Creation Form State
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [goalTitle, setGoalTitle] = useState('');
  const [goalTargetStr, setGoalTargetStr] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [emergencyMultiplier, setEmergencyMultiplier] = useState<3 | 6 | 12>(6);

  // Goal Contribution State
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [contributeWalletId, setContributeWalletId] = useState<string>(wallets[0]?.id || '');
  const [contributeAmountStr, setContributeAmountStr] = useState('');
  const [goalError, setGoalError] = useState<string | null>(null);

  // Debt & Receivable Tracker State
  const [showAddDebt, setShowAddDebt] = useState(false);
  const [debtFilter, setDebtFilter] = useState<'unpaid' | 'settled' | 'all'>('unpaid');
  const [debtType, setDebtType] = useState<DebtType>('receivable');
  const [debtPerson, setDebtPerson] = useState('');
  const [debtTitle, setDebtTitle] = useState('');
  const [debtAmountStr, setDebtAmountStr] = useState('');
  const [debtCurrency, setDebtCurrency] = useState<SupportedCurrency>(baseCurrency);
  const [debtDueDate, setDebtDueDate] = useState('');
  const [settlingDebtId, setSettlingDebtId] = useState<string | null>(null);
  const [settleWalletId, setSettleWalletId] = useState<string>(wallets[0]?.id || '');
  const [debtFeedback, setDebtFeedback] = useState<string | null>(null);
  const [debtError, setDebtError] = useState<string | null>(null);

  // Split Bill State
  const [billTotal, setBillTotal] = useState<string>('350000');
  const [billTax, setBillTax] = useState<string>('10');
  const [billService, setBillService] = useState<string>('5');
  const [billPeople, setBillPeople] = useState<string>('4');
  const [billFriendName, setBillFriendName] = useState<string>('');
  const [billSuccessMsg, setBillSuccessMsg] = useState<string | null>(null);

  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const rule503020 = calculate503020Rule(transactions, categories, currentMonthStr, exchangeRates.rates, baseCurrency);
  const auto503020 = useMemo(
    () => calculateAutoBudget503020Summary(transactions, categories, currentMonthStr, 'rule_50_30_20', exchangeRates.rates, baseCurrency),
    [transactions, categories, currentMonthStr, exchangeRates.rates, baseCurrency]
  );

  // Monthly 20% savings capacity for Goal ETA calculation
  const monthlySavingsCapacity = useMemo(() => {
    if (rule503020.savingsAmount > 0) return rule503020.savingsAmount;
    if (auto503020.savingsTarget20 > 0) return auto503020.savingsTarget20;
    return baseCurrency === 'IDR' ? 1000000 : 100;
  }, [rule503020.savingsAmount, auto503020.savingsTarget20, baseCurrency]);

  // Monthly baseline expense for Emergency Fund (3x / 6x / 12x)
  const monthlyBaselineExpense = useMemo(() => {
    const histExp = auto503020.historicalNeedsAvg + auto503020.historicalWantsAvg;
    if (histExp > 0) return histExp;
    if (rule503020.totalExpense > 0) return rule503020.totalExpense;
    return baseCurrency === 'IDR' ? 4000000 : 500;
  }, [auto503020.historicalNeedsAvg, auto503020.historicalWantsAvg, rule503020.totalExpense, baseCurrency]);

  const debtSummary = useMemo(
    () => calculateDebtSummary(debts, exchangeRates.rates, baseCurrency),
    [debts, exchangeRates.rates, baseCurrency]
  );

  const filteredDebts = useMemo(() => {
    if (debtFilter === 'all') return debts;
    return debts.filter((d) => d.status === debtFilter);
  }, [debts, debtFilter]);

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

  const handleQuickCreateEmergencyFund = async () => {
    const targetAmount = Math.round(monthlyBaselineExpense * emergencyMultiplier);
    const title =
      language === 'id'
        ? `Dana Darurat (${emergencyMultiplier}x Pengeluaran)`
        : `Emergency Fund (${emergencyMultiplier}x Monthly Expenses)`;

    await addGoal({
      title,
      targetAmount,
      currency: baseCurrency,
      color: '#10B981',
      icon: 'ShieldCheck',
    });
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    setGoalError(null);
    const amount = parseFloat(contributeAmountStr);
    const activeWId = contributeWalletId || wallets[0]?.id;
    if (!contributeGoalId || !activeWId || isNaN(amount) || amount <= 0) return;

    try {
      await contributeToGoal(contributeGoalId, activeWId, amount);
      setContributeAmountStr('');
      setContributeGoalId(null);
    } catch (err) {
      setGoalError(err instanceof Error ? err.message : 'Gagal menyetor tabungan.');
    }
  };

  const handleCreateDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setDebtError(null);
    const amount = parseFloat(debtAmountStr);
    if (!debtPerson.trim() || !debtTitle.trim() || isNaN(amount) || amount <= 0) {
      setDebtError(
        language === 'id'
          ? 'Nama pihak, keterangan, dan nominal wajib diisi dengan benar.'
          : 'Person name, description, and valid amount are required.'
      );
      return;
    }

    await addDebt({
      type: debtType,
      personName: debtPerson.trim(),
      title: debtTitle.trim(),
      amount,
      currency: debtCurrency,
      dueDate: debtDueDate || undefined,
    });

    setDebtPerson('');
    setDebtTitle('');
    setDebtAmountStr('');
    setDebtDueDate('');
    setShowAddDebt(false);
    setDebtFeedback(
      language === 'id'
        ? `Catatan ${debtType === 'receivable' ? 'piutang' : 'utang'} berhasil disimpan.`
        : `${debtType === 'receivable' ? 'Receivable' : 'Payable'} record saved.`
    );
    setTimeout(() => setDebtFeedback(null), 3500);
  };

  const handleConfirmSettleDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setDebtError(null);
    const targetWalletId = settleWalletId || wallets[0]?.id;
    if (!settlingDebtId || !targetWalletId) {
      setDebtError(
        language === 'id'
          ? 'Pilih dompet terlebih dahulu untuk mencatat transaksi pelunasan.'
          : 'Please select a wallet to record the settlement transaction.'
      );
      return;
    }

    try {
      await settleDebt(settlingDebtId, targetWalletId);
      setSettlingDebtId(null);
      setDebtFeedback(
        language === 'id'
          ? 'Status ditandai Lunas & mutasi saldo dompet otomatis tercatat!'
          : 'Marked as settled & wallet transaction automatically recorded!'
      );
      setTimeout(() => setDebtFeedback(null), 4000);
    } catch (err) {
      setDebtError(
        err instanceof Error
          ? err.message
          : language === 'id'
          ? 'Gagal menyelesaikan pelunasan.'
          : 'Failed to settle record.'
      );
    }
  };

  const handleRecordMyShare = async () => {
    if (!wallets[0]?.id) return;
    try {
      await addTransaction({
        date: new Date().toISOString().split('T')[0],
        amount: splitResult.perPerson,
        currency: baseCurrency,
        type: 'expense',
        categoryId: 'food',
        sourceWalletId: wallets[0].id,
        description: `Split Bill: Bayar Bareng (${billPeople} Orang)`,
      });
      setBillSuccessMsg(language === 'id' ? 'Bagian Anda tercatat di transaksi!' : 'Your share recorded!');
      setTimeout(() => setBillSuccessMsg(null), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddSplitBillReceivable = async () => {
    const person = billFriendName.trim() || (language === 'id' ? 'Teman Patungan' : 'Split Bill Friend');
    await addDebt({
      type: 'receivable',
      personName: person,
      title: `Patungan Split Bill (${billPeople} Orang)`,
      amount: splitResult.perPerson,
      currency: baseCurrency,
    });
    setBillFriendName('');
    setBillSuccessMsg(
      language === 'id'
        ? `Piutang ${person} (${formatCurrency(splitResult.perPerson, baseCurrency)}) masuk ke Pelacak Piutang!`
        : `Receivable for ${person} added to tracker!`
    );
    setTimeout(() => setBillSuccessMsg(null), 3500);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t.toolsTitle}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {language === 'id'
            ? 'Target tabungan & dana darurat, pelacak utang/piutang, evaluasi 50/30/20, dan kalkulator split bill'
            : 'Savings & emergency fund goals, debt/receivable tracker, 50/30/20 rule, and split bill calculator'}
        </p>
      </div>

      {/* 1. Target Tabungan & Dana Darurat (Financial Goals + Emergency Fund) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'id' ? 'Target Tabungan & Dana Darurat' : 'Savings Goals & Emergency Fund'}
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'id'
                ? `Kapasitas tabungan 20% Anda: ~${formatCurrency(monthlySavingsCapacity, baseCurrency)}/bulan`
                : `Your 20% monthly savings capacity: ~${formatCurrency(monthlySavingsCapacity, baseCurrency)}/mo`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddGoal(!showAddGoal)}
            className="inline-flex items-center gap-1 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>{t.addGoal}</span>
          </button>
        </div>

        {/* Emergency Fund Quick Recommendation Strip */}
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-slate-900 dark:text-white">
                {language === 'id' ? 'Kalkulator Dana Darurat Ideal:' : 'Ideal Emergency Fund Calculator:'}
              </span>{' '}
              <span className="text-slate-600 dark:text-slate-300">
                {language === 'id'
                  ? `Berdasarkan pengeluaran bulanan Anda (${formatCurrency(monthlyBaselineExpense, baseCurrency)}/bln), target ${emergencyMultiplier}x adalah `
                  : `Based on your monthly expenses (${formatCurrency(monthlyBaselineExpense, baseCurrency)}/mo), a ${emergencyMultiplier}x target is `}
              </span>
              <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatCurrency(monthlyBaselineExpense * emergencyMultiplier, baseCurrency)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            {([3, 6, 12] as const).map((mult) => (
              <button
                key={mult}
                type="button"
                onClick={() => setEmergencyMultiplier(mult)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                  emergencyMultiplier === mult
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-slate-600 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {mult}x
              </button>
            ))}
            <button
              type="button"
              onClick={handleQuickCreateEmergencyFund}
              className="ml-1 rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 cursor-pointer whitespace-nowrap"
            >
              {language === 'id' ? '+ Buat Dana Darurat' : '+ Create Goal'}
            </button>
          </div>
        </div>

        {/* Add Goal Form */}
        {showAddGoal && (
          <form onSubmit={handleCreateGoal} className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              {language === 'id' ? 'Buat Target Tabungan Baru' : 'Create New Financial Goal'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder={language === 'id' ? 'Judul Target (cth: Liburan Bali)' : 'Goal Title (e.g. Bali Vacation)'}
                value={goalTitle}
                onChange={(e) => setGoalTitle(e.target.value)}
                required
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none"
              />
              <input
                type="number"
                placeholder={language === 'id' ? 'Nominal Target' : 'Target Amount'}
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
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer"
              >
                {language === 'id' ? 'Simpan Target' : 'Save Goal'}
              </button>
            </div>
          </form>
        )}

        {goalError && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            {goalError}
          </div>
        )}

        {/* Goals Grid */}
        {goals.length === 0 ? (
          <div className="mt-4 p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {language === 'id' ? 'Belum Ada Target Tabungan Aktif' : 'No Active Savings Goals Yet'}
            </p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-sm mx-auto">
              {language === 'id'
                ? 'Gunakan tombol "+ Buat Dana Darurat" atau "+ Tambah Target" di atas untuk mulai melacak progres tabungan Anda.'
                : 'Use "+ Create Goal" or "+ Add Goal" above to start tracking your savings milestones.'}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            {goals.map((goal) => {
              const etaInfo = calculateGoalProgressAndEta(
                goal,
                monthlySavingsCapacity,
                exchangeRates.rates,
                baseCurrency
              );
              return (
                <div key={goal.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {goal.title}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400">
                          {etaInfo.percentage}%
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteGoal(goal.id)}
                          title={t.delete}
                          className="text-slate-400 hover:text-rose-500 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                      <div
                        className={`h-full rounded-full transition-all ${
                          etaInfo.percentage >= 100 ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${etaInfo.percentage}%` }}
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                      <span>{formatCurrency(goal.currentAmount, goal.currency)}</span>
                      <span>/ {formatCurrency(goal.targetAmount, goal.currency)}</span>
                    </div>

                    <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                      {etaInfo.percentage >= 100 ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {language === 'id' ? 'Target Tercapai! 🎉' : 'Goal Achieved! 🎉'}
                        </span>
                      ) : etaInfo.estimatedMonths !== null ? (
                        <span>
                          {language === 'id'
                            ? `Estimasi tercapai: ~${etaInfo.estimatedMonths} bulan (dengan porsi 20% tabungan)`
                            : `Est. completion: ~${etaInfo.estimatedMonths} mo (at 20% savings rate)`}
                        </span>
                      ) : (
                        <span>{language === 'id' ? 'Belum ada estimasi waktu' : 'No ETA available'}</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {goal.targetDate ? `Target: ${goal.targetDate}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setContributeGoalId(goal.id);
                        setContributeWalletId(wallets[0]?.id || '');
                      }}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
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
              {language === 'id' ? 'Setor Tabungan ke' : 'Deposit Savings to'}: {goals.find(g => g.id === contributeGoalId)?.title}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={contributeWalletId}
                onChange={(e) => setContributeWalletId(e.target.value)}
                className="h-10 rounded-xl border border-blue-300 bg-white px-3 text-xs dark:bg-slate-800 dark:border-slate-700 dark:text-white focus:outline-none cursor-pointer"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {language === 'id' ? 'Ambil dari' : 'Source'}: {w.name} ({formatCurrency(w.balance, w.currency)})
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder={language === 'id' ? 'Nominal Setoran' : 'Deposit Amount'}
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
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer"
              >
                {language === 'id' ? 'Setor Sekarang' : 'Deposit Now'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. Pelacak Utang & Piutang (Debt & Receivable Tracker) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <HandCoins className="h-5 w-5 text-indigo-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {language === 'id' ? 'Pelacak Utang & Piutang' : 'Debt & Receivable Tracker'}
              </h2>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'id'
                ? 'Catat pinjaman teman/patungan (piutang) atau kewajiban utang, dan tandai lunas otomatis ke saldo dompet.'
                : 'Track money owed to you (receivables) or debts you owe (payables), with 1-click wallet settlement.'}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              {(['unpaid', 'settled', 'all'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDebtFilter(f)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer ${
                    debtFilter === f
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {f === 'unpaid'
                    ? (language === 'id' ? 'Belum Lunas' : 'Unpaid')
                    : f === 'settled'
                    ? (language === 'id' ? 'Lunas' : 'Settled')
                    : (language === 'id' ? 'Semua' : 'All')}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowAddDebt(!showAddDebt)}
              className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{language === 'id' ? 'Catat Baru' : 'Add Record'}</span>
            </button>
          </div>
        </div>

        {/* Debt & Receivable Summary KPI Strip */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-3.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
              <span className="font-semibold">
                {language === 'id' ? 'Total Piutang (Hak Saya)' : 'Total Receivables (Owed to Me)'}
              </span>
              <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="mt-1 font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
              +{formatCurrency(debtSummary.totalReceivable, baseCurrency)}
            </p>
            <span className="text-[10px] text-slate-500">
              {debtSummary.unpaidReceivableCount} {language === 'id' ? 'catatan aktif' : 'active records'}
            </span>
          </div>

          <div className="rounded-xl border border-rose-200/70 bg-rose-50/50 p-3.5 dark:border-rose-900/40 dark:bg-rose-950/20">
            <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-300">
              <span className="font-semibold">
                {language === 'id' ? 'Total Utang (Kewajiban)' : 'Total Payables (I Owe)'}
              </span>
              <ArrowUpRight className="h-4 w-4 text-rose-500" />
            </div>
            <p className="mt-1 font-mono text-base font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
              -{formatCurrency(debtSummary.totalPayable, baseCurrency)}
            </p>
            <span className="text-[10px] text-slate-500">
              {debtSummary.unpaidPayableCount} {language === 'id' ? 'catatan aktif' : 'active records'}
            </span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {language === 'id' ? 'Selisih Posisi Bersih' : 'Net Debt Position'}
            </span>
            <p className={`mt-1 font-mono text-base font-extrabold tabular-nums ${
              debtSummary.netPosition >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}>
              {debtSummary.netPosition >= 0 ? '+' : ''}
              {formatCurrency(debtSummary.netPosition, baseCurrency)}
            </p>
            <span className="text-[10px] text-slate-500">
              {language === 'id' ? 'Piutang dikurangi Utang' : 'Receivables minus Payables'}
            </span>
          </div>
        </div>

        {debtFeedback && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>{debtFeedback}</span>
          </div>
        )}

        {debtError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
            <span>{debtError}</span>
          </div>
        )}

        {/* Create Debt / Receivable Form */}
        {showAddDebt && (
          <form onSubmit={handleCreateDebt} className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/30 p-4 dark:border-slate-700 dark:bg-slate-800/60 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <select
                value={debtType}
                onChange={(e) => setDebtType(e.target.value as DebtType)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none"
              >
                <option value="receivable">
                  {language === 'id' ? 'Piutang (Orang Pinjam ke Saya)' : 'Receivable (Owed to Me)'}
                </option>
                <option value="payable">
                  {language === 'id' ? 'Utang (Saya Pinjam / Cicilan)' : 'Payable (I Owe)'}
                </option>
              </select>

              <input
                type="text"
                required
                value={debtPerson}
                onChange={(e) => setDebtPerson(e.target.value)}
                placeholder={language === 'id' ? 'Nama Orang / Pihak (cth: Budi)' : 'Person / Party (e.g. Alex)'}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none"
              />

              <input
                type="text"
                required
                value={debtTitle}
                onChange={(e) => setDebtTitle(e.target.value)}
                placeholder={language === 'id' ? 'Keterangan (cth: Talangan Makan)' : 'Description (e.g. Dinner Share)'}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none"
              />

              <div className="flex h-10 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                <select
                  value={debtCurrency}
                  onChange={(e) => setDebtCurrency(e.target.value as SupportedCurrency)}
                  className="border-r border-slate-200 bg-transparent px-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200 focus:outline-none"
                >
                  <option value="IDR">IDR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="SGD">SGD</option>
                </select>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={debtAmountStr}
                  onChange={(e) => setDebtAmountStr(e.target.value)}
                  placeholder={language === 'id' ? 'Nominal' : 'Amount'}
                  className="w-full bg-transparent px-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none tabular-nums"
                />
              </div>

              <input
                type="date"
                value={debtDueDate}
                onChange={(e) => setDebtDueDate(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddDebt(false)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-500 cursor-pointer"
              >
                {language === 'id' ? 'Simpan Catatan' : 'Save Record'}
              </button>
            </div>
          </form>
        )}

        {/* Settle Debt Wallet Confirmation Form */}
        {settlingDebtId && (
          <form onSubmit={handleConfirmSettleDebt} className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30 space-y-3">
            {(() => {
              const targetDebt = debts.find((d) => d.id === settlingDebtId);
              if (!targetDebt) return null;
              return (
                <>
                  <h4 className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                    {targetDebt.type === 'receivable'
                      ? (language === 'id'
                          ? `Terima Pelunasan Piutang dari ${targetDebt.personName} (${formatCurrency(targetDebt.amount, targetDebt.currency)})`
                          : `Receive Payment from ${targetDebt.personName} (${formatCurrency(targetDebt.amount, targetDebt.currency)})`)
                      : (language === 'id'
                          ? `Bayar Lunas Utang ke ${targetDebt.personName} (${formatCurrency(targetDebt.amount, targetDebt.currency)})`
                          : `Pay Off Debt to ${targetDebt.personName} (${formatCurrency(targetDebt.amount, targetDebt.currency)})`)}
                  </h4>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <select
                      value={settleWalletId}
                      onChange={(e) => setSettleWalletId(e.target.value)}
                      className="h-10 flex-1 rounded-xl border border-emerald-300 bg-white px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none"
                    >
                      {wallets.map((w) => (
                        <option key={w.id} value={w.id}>
                          {targetDebt.type === 'receivable'
                            ? (language === 'id' ? 'Masuk ke Dompet: ' : 'Deposit to Wallet: ')
                            : (language === 'id' ? 'Bayar dari Dompet: ' : 'Pay from Wallet: ')}
                          {w.name} ({formatCurrency(w.balance, w.currency)})
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setSettlingDebtId(null)}
                        className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                      >
                        {t.cancel}
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer whitespace-nowrap"
                      >
                        {language === 'id' ? 'Konfirmasi Lunas & Catat Mutasi' : 'Confirm & Record Transaction'}
                      </button>
                    </div>
                  </div>
                </>
              );
            })()}
          </form>
        )}

        {/* Debt & Receivable Records List */}
        {filteredDebts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center dark:border-slate-800 dark:bg-slate-800/30">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {language === 'id'
                ? 'Tidak ada catatan utang atau piutang pada kategori ini.'
                : 'No debt or receivable records in this view.'}
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredDebts.map((item) => {
              const isReceivable = item.type === 'receivable';
              const isSettled = item.status === 'settled';
              return (
                <div
                  key={item.id}
                  className={`flex flex-col justify-between gap-3 rounded-xl border p-3.5 ${
                    isSettled
                      ? 'border-slate-200/60 bg-slate-50/60 opacity-75 dark:border-slate-800/60 dark:bg-slate-900/40'
                      : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          isReceivable
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300'
                        }`}>
                          {isReceivable
                            ? (language === 'id' ? 'PIUTANG' : 'RECEIVABLE')
                            : (language === 'id' ? 'UTANG' : 'PAYABLE')}
                        </span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {item.personName}
                        </span>
                        {isSettled && (
                          <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {language === 'id' ? 'LUNAS' : 'SETTLED'}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300 truncate">
                        {item.title}
                      </p>
                      {item.dueDate && (
                        <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                          <Calendar className="h-3 w-3" />
                          <span>{language === 'id' ? 'Jatuh tempo:' : 'Due:'} {item.dueDate}</span>
                        </p>
                      )}
                    </div>

                    <span className={`font-mono text-sm font-extrabold tabular-nums shrink-0 ${
                      isReceivable
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {isReceivable ? '+' : '-'}
                      {formatCurrency(item.amount, item.currency)}
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {!isSettled && (
                      <button
                        type="button"
                        onClick={() => {
                          setSettlingDebtId(item.id);
                          setSettleWalletId(wallets[0]?.id || '');
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-emerald-500 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{language === 'id' ? 'Tandai Lunas' : 'Mark Settled'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteDebt(item.id)}
                      title={t.delete}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Evaluasi Rasio Anggaran 50/30/20 */}
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
              <span>{language === 'id' ? 'Kebutuhan (Needs)' : 'Needs (50%)'}</span>
              <span className={`font-mono tabular-nums ${rule503020.needsPercentage > 50 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {rule503020.needsPercentage}% ({language === 'id' ? 'Target' : 'Target'} 50%)
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
              <span>{language === 'id' ? 'Keinginan (Wants)' : 'Wants (30%)'}</span>
              <span className={`font-mono tabular-nums ${rule503020.wantsPercentage > 30 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {rule503020.wantsPercentage}% ({language === 'id' ? 'Target' : 'Target'} 30%)
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
              <span>{language === 'id' ? 'Tabungan (Savings)' : 'Savings (20%)'}</span>
              <span className={`font-mono tabular-nums ${rule503020.savingsPercentage >= 20 ? 'text-emerald-500' : 'text-rose-500'}`}>
                {rule503020.savingsPercentage}% ({language === 'id' ? 'Target' : 'Target'} 20%)
              </span>
            </div>
            <p className="text-sm font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
              {formatCurrency(rule503020.savingsAmount, baseCurrency)}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">{t.savingsDesc}</p>
          </div>
        </div>
      </div>

      {/* 4. Kalkulator Split Bill (Terintegrasi dengan Transaksi & Piutang Teman) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t.splitBillTitle}</h2>
          </div>
          <span className="text-[11px] text-slate-400">
            {language === 'id' ? 'Bagi Tagihan, Catat Pengeluaran & Piutang Teman' : 'Split Bill, Record Share & Friend Receivable'}
          </span>
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

        <div className="mt-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <div>
            <p className="text-xs text-slate-500">{t.perPerson}:</p>
            <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(splitResult.perPerson, baseCurrency)}
            </p>
            <p className="text-[11px] text-slate-400">
              Grand Total: {formatCurrency(splitResult.grandTotal, baseCurrency)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={billFriendName}
              onChange={(e) => setBillFriendName(e.target.value)}
              placeholder={language === 'id' ? 'Nama teman (opsional)' : 'Friend name (optional)'}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddSplitBillReceivable}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer"
            >
              <HandCoins className="h-4 w-4" />
              <span>{language === 'id' ? '+ Catat Piutang Teman' : '+ Add Friend Receivable'}</span>
            </button>
            <button
              type="button"
              onClick={handleRecordMyShare}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 active:scale-95 transition-all cursor-pointer"
            >
              <DollarSign className="h-4 w-4" />
              <span>{t.recordMyShare}</span>
            </button>
          </div>
        </div>

        {billSuccessMsg && (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>{billSuccessMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
};