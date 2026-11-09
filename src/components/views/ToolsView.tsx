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
  Plus,
  DollarSign,
  CheckCircle2
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
    addTransaction,
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

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t.toolsTitle}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {language === 'id' ? 'Target tabungan, evaluasi 50/30/20, dan kalkulator split bill' : 'Savings pots, 50/30/20 rule, and split bill calculator'}
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

      {/* 3. Kalkulator Split Bill */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">{t.splitBillTitle}</h2>
          </div>
          <span className="text-[11px] text-slate-400">
            {language === 'id' ? 'Bagi Tagihan & Catat Cepat' : 'Split Bill & Quick Record'}
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
                <span>{language === 'id' ? 'Tercatat!' : 'Recorded!'}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};