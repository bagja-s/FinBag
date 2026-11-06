import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { WalletType, SupportedCurrency } from '../../types/finance';
import { X, Wallet, Edit3 } from 'lucide-react';
import { motion } from 'motion/react';
import { modalSpringVariants, backdropVariants } from '../../utils/motionVariants';

export const AddWalletModal: React.FC = () => {
  const { 
    isAddWalletModalOpen, 
    setIsAddWalletModalOpen, 
    editingWallet,
    setEditingWallet,
    addWallet, 
    updateWallet,
    baseCurrency, 
    language 
  } = useFinance();

  const t = getTranslation(language);
  const isEditing = !!editingWallet;

  const [name, setName] = useState('');
  const [type, setType] = useState<WalletType>('bank');
  const [balanceStr, setBalanceStr] = useState('');
  const [currency, setCurrency] = useState<SupportedCurrency>(baseCurrency);
  const [color, setColor] = useState('#2563EB');
  const [accountNumber, setAccountNumber] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state whenever editingWallet or modal open state changes
  useEffect(() => {
    if (editingWallet) {
      setName(editingWallet.name);
      setType(editingWallet.type);
      setBalanceStr(String(editingWallet.balance));
      setCurrency(editingWallet.currency);
      setColor(editingWallet.color || '#2563EB');
      setAccountNumber(editingWallet.accountNumber || '');
    } else {
      setName('');
      setType('bank');
      setBalanceStr('');
      setCurrency(baseCurrency);
      setColor('#2563EB');
      setAccountNumber('');
    }
    setErrorMsg('');
  }, [editingWallet, isAddWalletModalOpen, baseCurrency]);

  if (!isAddWalletModalOpen) return null;

  const colorPalette = [
    '#2563EB', '#059669', '#D97706', '#7C3AED', 
    '#DC2626', '#0284C7', '#4F46E5', '#0D9488'
  ];

  const handleClose = () => {
    setIsAddWalletModalOpen(false);
    setEditingWallet(null);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg(language === 'id' ? 'Nama dompet wajib diisi.' : 'Wallet name is required.');
      return;
    }
    const balance = parseFloat(balanceStr) || 0;

    try {
      if (isEditing && editingWallet) {
        await updateWallet(editingWallet.id, {
          name: name.trim(),
          type,
          balance,
          currency,
          color,
          accountNumber: accountNumber.trim() || undefined,
        });
      } else {
        await addWallet({
          name: name.trim(),
          type,
          balance,
          currency,
          color,
          accountNumber: accountNumber.trim() || undefined,
        });
      }

      handleClose();
    } catch (err) {
      setErrorMsg(isEditing 
        ? (language === 'id' ? 'Gagal memperbarui dompet.' : 'Failed to update wallet.')
        : (language === 'id' ? 'Gagal menambahkan dompet.' : 'Failed to add wallet.')
      );
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <motion.div 
      variants={backdropVariants}
      initial="hidden"
      animate="visible"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
    >
      {/* Click outside backdrop */}
      <div 
        className="fixed inset-0"
        onClick={handleClose}
        aria-hidden="true"
      />

      <motion.div 
        variants={modalSpringVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        role="dialog"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              isEditing ? 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400' : 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400'
            }`}>
              {isEditing ? <Edit3 className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {isEditing ? t.editWallet : t.addWallet}
            </h2>
          </div>
          <button
            onClick={handleClose}
            aria-label="Tutup"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mt-3 rounded-lg bg-rose-50 p-2 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.walletName}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth: Bank Mandiri, Dompet Tunai, GoPay"
              required
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.walletType}
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as WalletType)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="bank">{t.bank}</option>
                <option value="cash">{t.cash}</option>
                <option value="ewallet">{t.ewallet}</option>
                <option value="investment">{t.investment}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.currency}
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none cursor-pointer"
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
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {isEditing ? (language === 'id' ? 'Saldo Dompet' : 'Wallet Balance') : t.initialBalance}
            </label>
            <input
              type="number"
              step="any"
              value={balanceStr}
              onChange={(e) => setBalanceStr(e.target.value)}
              placeholder="0"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums transition-shadow"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t.accountNumber}
            </label>
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="cth: •••• 8812 atau 0812345678"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:outline-none transition-shadow"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Warna Ikon
            </label>
            <div className="flex gap-2">
              {colorPalette.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform active:scale-95 cursor-pointer ${color === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="flex w-full items-center justify-center rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 active:scale-[0.98] transition-all cursor-pointer"
            >
              {isEditing ? t.save : t.addWallet}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>,
    document.body
  );
};
