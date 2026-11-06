import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { TransactionType, SupportedCurrency } from '../../types/finance';
import { predictCategory } from '../../utils/categoryMatcher';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { formatCurrency } from '../../utils/financeCalculations';
import { 
  X, 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight, 
  Calendar, 
  FileText, 
  Tag, 
  Wallet,
  Sparkles,
  Edit3,
  Camera,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { modalSpringVariants, backdropVariants } from '../../utils/motionVariants';

export const TransactionModal: React.FC = () => {
  const { 
    isTransactionModalOpen, 
    setIsTransactionModalOpen, 
    editingTransaction,
    setEditingTransaction,
    wallets, 
    categories, 
    addTransaction, 
    updateTransaction,
    baseCurrency, 
    language 
  } = useFinance();

  const t = getTranslation(language);

  const isEditMode = Boolean(editingTransaction);

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

  // Auto-categorization indicator state
  const [autoDetectedCategory, setAutoDetectedCategory] = useState<string | null>(null);
  const [userManuallySelectedCategory, setUserManuallySelectedCategory] = useState<boolean>(false);

  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // AI Receipt Scanner state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanningReceipt, setIsScanningReceipt] = useState<boolean>(false);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);

  // Sync state whenever modal opens or editingTransaction changes
  useEffect(() => {
    if (!isTransactionModalOpen) return;

    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmountStr(editingTransaction.amount.toString());
      setCurrency(editingTransaction.currency);
      setSourceWalletId(editingTransaction.sourceWalletId);
      setTargetWalletId(editingTransaction.targetWalletId || (wallets[1]?.id || ''));
      setCategoryId(editingTransaction.categoryId || (categories[0]?.id || 'food'));
      setDate(editingTransaction.date);
      setDescription(editingTransaction.description);
      setNotes(editingTransaction.notes || '');
      setAutoDetectedCategory(null);
      setUserManuallySelectedCategory(true);
      setErrorMsg('');
      setScanSuccessMessage(null);
    } else {
      setType('expense');
      setAmountStr('');
      setCurrency(baseCurrency);
      setSourceWalletId(wallets[0]?.id || '');
      setTargetWalletId(wallets[1]?.id || '');
      setCategoryId(categories[0]?.id || 'food');
      setDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setNotes('');
      setAutoDetectedCategory(null);
      setUserManuallySelectedCategory(false);
      setErrorMsg('');
      setScanSuccessMessage(null);
    }
  }, [isTransactionModalOpen, editingTransaction, baseCurrency, wallets, categories]);

  if (!isTransactionModalOpen) return null;

  const quickAmounts = currency === 'IDR'
    ? [20000, 50000, 100000, 250000, 500000, 1000000]
    : [10, 25, 50, 100, 250, 500];

  const handleClose = () => {
    setIsTransactionModalOpen(false);
    setEditingTransaction(null);
    setShowConfirmModal(false);
    setErrorMsg('');
    setScanSuccessMessage(null);
    setIsScanningReceipt(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset value so user can pick the same file again if needed
    e.target.value = '';

    setIsScanningReceipt(true);
    setErrorMsg('');
    setScanSuccessMessage(null);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const res = await fetch('/api/scan-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: base64Data,
              mimeType: file.type || 'image/jpeg',
            }),
          });

          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || t.scanError);
          }

          const receipt = data.data;
          if (receipt.totalAmount) {
            setAmountStr(receipt.totalAmount.toString());
          }
          if (receipt.merchant) {
            setDescription(receipt.merchant);
          }
          if (receipt.date) {
            setDate(receipt.date);
          }
          if (receipt.category) {
            const matchedCategory = categories.find((c) => c.id === receipt.category);
            if (matchedCategory) {
              setCategoryId(receipt.category);
              setAutoDetectedCategory(receipt.category);
              setUserManuallySelectedCategory(false);
            }
          }
          if (receipt.currency && (['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'JPY', 'GBP', 'AUD'] as SupportedCurrency[]).includes(receipt.currency)) {
            setCurrency(receipt.currency);
          }
          if (receipt.notes) {
            setNotes(receipt.notes);
          }
          setType('expense');

          setScanSuccessMessage(
            `${t.scanSuccess} ${receipt.merchant ? `(${receipt.merchant})` : ''} — Total: ${formatCurrency(receipt.totalAmount, receipt.currency || currency)}`
          );
        } catch (scanErr) {
          console.error(scanErr);
          setErrorMsg(t.scanError);
        } finally {
          setIsScanningReceipt(false);
        }
      };
      reader.onerror = () => {
        setErrorMsg('Gagal membaca file gambar.');
        setIsScanningReceipt(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memproses struk.');
      setIsScanningReceipt(false);
    }
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDescription(val);

    if (type !== 'transfer' && !userManuallySelectedCategory) {
      const predicted = predictCategory(val, type);
      if (predicted) {
        setCategoryId(predicted);
        setAutoDetectedCategory(predicted);
      } else {
        setAutoDetectedCategory(null);
      }
    }
  };

  const handleCategorySelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoryId(e.target.value);
    setUserManuallySelectedCategory(true);
    setAutoDetectedCategory(null);
  };

  // Called when user clicks submit button in the form
  const handleFormSubmit = (e: React.FormEvent) => {
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

    setErrorMsg('');
    // Open confirmation modal
    setShowConfirmModal(true);
  };

  // Called when user confirms inside ConfirmationModal
  const handleConfirmedSave = async () => {
    const parsedAmount = parseFloat(amountStr);
    setIsSubmitting(true);
    try {
      if (isEditMode && editingTransaction) {
        await updateTransaction(editingTransaction.id, {
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
      } else {
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
      }

      handleClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Gagal memproses transaksi. Coba lagi.');
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Category name display helper
  const currentCategoryObj = categories.find((c) => c.id === categoryId);
  const currentCategoryName = currentCategoryObj 
    ? (language === 'en' ? currentCategoryObj.nameEn : currentCategoryObj.name) 
    : categoryId;

  const sourceWalletObj = wallets.find((w) => w.id === sourceWalletId);
  const targetWalletObj = wallets.find((w) => w.id === targetWalletId);

  if (typeof document === 'undefined') return null;

  return (
    <>
      {createPortal(
        <motion.div 
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
        >
          {/* Backdrop click dismiss */}
          <div 
            className="fixed inset-0"
            onClick={handleClose}
            aria-hidden="true"
          />

          <motion.div 
            variants={modalSpringVariants}
            initial="hidden"
            animate="visible"
            className="relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
          >
            {/* Mobile Drag Indicator */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3 sm:hidden" />

          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {isEditMode ? (
                <Edit3 className="h-5 w-5 text-blue-500" />
              ) : (
                <Tag className="h-5 w-5 text-blue-500" />
              )}
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditMode ? t.editTransactionModalTitle : t.transactionModalTitle}
              </h2>
            </div>
            <button
              onClick={handleClose}
              aria-label="Tutup"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {errorMsg && (
            <div className="mt-3 rounded-lg bg-rose-50 p-2.5 text-xs font-semibold text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* AI Receipt Camera Scanner Trigger (Add mode only) */}
          {!isEditMode && (
            <div className="mt-3">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                disabled={isScanningReceipt}
                onClick={() => fileInputRef.current?.click()}
                className="group flex w-full items-center justify-between rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 p-3 text-xs font-semibold text-blue-700 hover:from-blue-100 hover:to-indigo-100 dark:border-blue-900/50 dark:from-blue-950/40 dark:to-indigo-950/40 dark:text-blue-300 transition-all shadow-xs cursor-pointer disabled:opacity-70 disabled:pointer-events-none"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
                    {isScanningReceipt ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                  </div>
                  <div className="text-left">
                    <span className="block font-bold leading-tight">
                      {isScanningReceipt ? t.scanningReceipt : t.scanReceipt}
                    </span>
                    <span className="text-[10px] text-blue-600/80 dark:text-blue-400 font-normal">
                      Foto bon/struk via kamera HP untuk auto-input nominal & kategori
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-blue-600/10 dark:bg-blue-400/10 px-2 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                  <Sparkles className="h-3 w-3" />
                  <span>Gemini AI</span>
                </div>
              </button>

              {scanSuccessMessage && (
                <div className="mt-2 flex items-center gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60 animate-in fade-in duration-200">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="font-medium text-[11px]">{scanSuccessMessage}</span>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
            {/* Segmented Type Control */}
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => { setType('expense'); setErrorMsg(''); }}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
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
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
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
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all cursor-pointer ${
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
                  className="h-12 border-r border-slate-200 bg-transparent px-3 text-xs font-bold text-slate-800 dark:border-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="IDR" className="dark:bg-slate-900">IDR (Rp)</option>
                  <option value="USD" className="dark:bg-slate-900">USD ($)</option>
                  <option value="EUR" className="dark:bg-slate-900">EUR (€)</option>
                  <option value="SGD" className="dark:bg-slate-900">SGD (S$)</option>
                  <option value="MYR" className="dark:bg-slate-900">MYR (RM)</option>
                  <option value="JPY" className="dark:bg-slate-900">JPY (¥)</option>
                  <option value="GBP" className="dark:bg-slate-900">GBP (£)</option>
                  <option value="AUD" className="dark:bg-slate-900">AUD (A$)</option>
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
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-mono font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors tabular-nums cursor-pointer"
                  >
                    +{q >= 1000 ? `${q / 1000}k` : q}
                  </button>
                ))}
              </div>
            </div>

            {/* Description with Auto-Category Trigger */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t.description}
                </label>
                {type !== 'transfer' && (
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>Auto-kategori aktif</span>
                  </span>
                )}
              </div>
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80 focus-within:ring-2 focus-within:ring-blue-500">
                <FileText className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
                <input
                  type="text"
                  value={description}
                  onChange={handleDescriptionChange}
                  placeholder="cth: Makan Padang, Bensin Pertamax, Tagihan Listrik, Gaji"
                  required
                  className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              {/* Auto-Category Highlight Chip */}
              {autoDetectedCategory && type !== 'transfer' && (
                <div className="mt-2 flex items-center justify-between rounded-xl bg-blue-50/80 px-3 py-1.5 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 truncate">
                    <Sparkles className="h-3.5 w-3.5 text-blue-500 shrink-0 animate-pulse" />
                    <span className="font-medium text-[11px]">
                      {t.autoDetectedCategory}: <strong className="font-bold underline decoration-blue-400">{currentCategoryName}</strong>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setUserManuallySelectedCategory(true);
                      setAutoDetectedCategory(null);
                    }}
                    className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 ml-2 cursor-pointer"
                  >
                    {t.changeCategory}
                  </button>
                </div>
              )}
            </div>

            {/* Wallets & Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Source Wallet */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t.fromWallet}
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
                      onChange={handleCategorySelectChange}
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

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t.notes} <span className="text-slate-400 font-normal">({language === 'id' ? 'Opsional' : 'Optional'})</span>
              </label>
              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="cth: Bersama teman, nomor struk, dll."
                  className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-xs font-bold text-white shadow-md shadow-blue-600/30 hover:bg-blue-500 active:scale-[0.99] transition-all cursor-pointer"
              >
                {isEditMode ? (
                  <>
                    <Edit3 className="h-4 w-4" />
                    <span>{language === 'id' ? 'Simpan Perubahan Transaksi' : 'Save Changes'}</span>
                  </>
                ) : (
                  <span>{t.saveTransaction}</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>,
      document.body
    )}

      {/* Confirmation Modal before applying changes */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        title={isEditMode ? t.confirmEditTransactionTitle : (type === 'transfer' ? t.confirmTransferTitle : 'Konfirmasi Catat Transaksi')}
        message={isEditMode ? t.confirmEditTransactionDesc : (type === 'transfer' ? t.confirmTransferDesc : 'Pastikan rincian transaksi Anda sudah tepat sebelum disimpan ke database.')}
        confirmText={isEditMode ? 'Simpan Perubahan' : 'Ya, Catat Sekarang'}
        cancelText={t.cancel}
        variant={isEditMode ? 'warning' : 'primary'}
        isLoading={isSubmitting}
        onConfirm={handleConfirmedSave}
        onCancel={() => setShowConfirmModal(false)}
        details={[
          { label: 'Tipe', value: type === 'expense' ? t.typeExpense : type === 'income' ? t.typeIncome : t.typeTransfer },
          { label: 'Keterangan', value: description },
          { label: 'Nominal', value: formatCurrency(parseFloat(amountStr) || 0, currency) },
          { label: 'Dompet Asal', value: sourceWalletObj?.name || '-' },
          ...(type === 'transfer' ? [{ label: 'Dompet Tujuan', value: targetWalletObj?.name || '-' }] : []),
          ...(type !== 'transfer' ? [{ label: 'Kategori', value: currentCategoryName }] : []),
          { label: 'Tanggal', value: date },
        ]}
      />
    </>
  );
};
