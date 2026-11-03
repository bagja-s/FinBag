import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { TransactionType, SupportedCurrency } from '../../types/finance';
import { 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Calendar, 
  FileText, 
  Tag, 
  Wallet 
} from 'lucide-react';

export const TransactionModal: React.FC = () => {
  const { 
    isTransactionModalOpen, 
    setIsTransactionModalOpen, 
    wallets, 
    categories, 
    addTransaction, 
    baseCurrency, 
    language 
  } = useFinance();

  const t = getTranslation(language);

  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('');
  const [currency, setCurrency] = useState<SupportedCurrency>(baseCurrency);
  const [sourceWalletId, setSourceWalletId] = useState<string>(wallets[0]?.id || '');
  const [targetWalletId, setTargetWalletId] = useState<string>(wallets[1]?.id || '');
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id || 'food');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isTransactionModalOpen) return null;

  const quickAmounts = currency === 'IDR'
    ? [20000, 50000, 100000, 250000, 500000, 1000000]
    : [10, 25, 50, 100, 250, 500];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountStr);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Masukkan nominal yang valid.');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Keterangan transaksi wajib diisi.');
      return;
    }
    if (type === 'transfer' && sourceWalletId === targetWalletId) {
      setErrorMsg('Dompet asal dan tujuan tidak boleh sama.');
      return;
    }

    try {
      await addTransaction({
        date,
        amount: parsedAmount,
        currency,
        type,
        sourceWalletId,
        targetWalletId: type === 'transfer' ? targetWalletId : undefined,
        categoryId: type !== 'transfer' ? categoryId : undefined,
        description: description.trim(),
        notes: notes.trim() || undefined,
      });

      // Reset and close
      setAmountStr('');
      setDescription('');
      setNotes('');
      setErrorMsg('');
      setIsTransactionModalOpen(false);
    } catch (err) {
      setErrorMsg('Gagal menyimpan transaksi. Coba lagi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            {t.transactionModalTitle}
          </h2>
          <button
            onClick={() => setIsTransactionModalOpen(false)}
            aria-label="Tutup"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Segmented Type Control */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => { setType('expense'); setErrorMsg(''); }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>{t.typeExpense}</span>
            </button>
            <button
              type="button"
              onClick={() => { setType('income'); setErrorMsg(''); }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <ArrowDownLeft className="h-4 w-4" />
              <span>{t.typeIncome}</span>
            </button>
            <button
              type="button"
              onClick={() => { setType('transfer'); setErrorMsg(''); }}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                type === 'transfer'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              <ArrowLeftRight className="h-4 w-4" />
              <span>{t.typeTransfer}</span>
            </button>
          </div>

          {/* Amount and Currency Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.amount}
            </label>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80 focus-within:ring-2 focus-within:ring-blue-500">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                className="h-12 border-r border-slate-200 bg-transparent px-3 text-xs font-bold text-slate-800 dark:border-slate-700 dark:text-slate-200 focus:outline-none"
              >
                <option value="IDR">IDR (Rp)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="SGD">SGD (S$)</option>
                <option value="MYR">MYR (RM)</option>
                <option value="JPY">JPY (¥)</option>
                <option value="GBP">GBP (£)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
              <input
                type="number"
                step="any"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0"
                required
                className="h-12 w-full bg-transparent px-3 text-lg font-mono font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none tabular-nums"
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {quickAmounts.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmountStr(q.toString())}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors tabular-nums"
                >
                  +{q >= 1000 ? `${q / 1000}k` : q}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.description}
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
              <FileText className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="cth: Makan Siang, Bensin, Gaji, dll."
                required
                className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Wallets & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Source Wallet */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {type === 'transfer' ? t.fromWallet : t.fromWallet}
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
                <Wallet className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                <select
                  value={sourceWalletId}
                  onChange={(e) => setSourceWalletId(e.target.value)}
                  className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id} className="dark:bg-slate-900">
                      {w.name} ({w.currency})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Wallet (if transfer) OR Category */}
            {type === 'transfer' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.toWallet}
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
                  <Wallet className="h-4 w-4 text-blue-500 mr-2 shrink-0" />
                  <select
                    value={targetWalletId}
                    onChange={(e) => setTargetWalletId(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    {wallets.map((w) => (
                      <option key={w.id} value={w.id} className="dark:bg-slate-900">
                        {w.name} ({w.currency})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.category}
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
                  <Tag className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                  >
                    {categories
                      .filter((c) => (type === 'income' ? c.type === 'income' : c.type === 'expense'))
                      .map((c) => (
                        <option key={c.id} value={c.id} className="dark:bg-slate-900">
                          {language === 'en' ? c.nameEn : c.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.date}
            </label>
            <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
              <Calendar className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 active:scale-[0.99] transition-all"
            >
              {t.saveTransaction}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
