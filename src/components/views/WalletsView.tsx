import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency } from '../../utils/financeCalculations';
import { convertCurrency } from '../../services/currencyService';
import { 
  Wallet, 
  Plus, 
  ArrowLeftRight, 
  CreditCard, 
  Building2, 
  Coins, 
  PiggyBank,
  Edit3,
  Trash2,
  EyeOff,
  Eye
} from 'lucide-react';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { WalletAccount } from '../../types/finance';
import { motion } from 'motion/react';
import { containerStaggerVariants, cardItemVariants } from '../../utils/motionVariants';

export const WalletsView: React.FC = () => {
  const { 
    wallets, 
    baseCurrency, 
    exchangeRates, 
    openAddWallet,
    openEditWallet,
    openWalletDetail,
    updateWallet,
    deleteWallet,
    setIsTransactionModalOpen, 
    language 
  } = useFinance();

  const [walletToDelete, setWalletToDelete] = useState<WalletAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const t = getTranslation(language);
  const excludedCount = wallets.filter((w) => w.excludeFromNetWorth).length;

  const handleToggleExcludeNetWorth = async (e: React.MouseEvent, wallet: WalletAccount) => {
    e.stopPropagation();
    try {
      await updateWallet(wallet.id, {
        name: wallet.name,
        type: wallet.type,
        balance: wallet.balance,
        initialBalance: wallet.initialBalance,
        currency: wallet.currency,
        color: wallet.color,
        accountNumber: wallet.accountNumber,
        excludeFromNetWorth: !wallet.excludeFromNetWorth,
      });
    } catch (err) {
      console.error('Failed to toggle Net Worth exclusion:', err);
    }
  };

  const getWalletIcon = (type: string) => {
    switch (type) {
      case 'bank': return Building2;
      case 'cash': return Coins;
      case 'credit': return CreditCard;
      case 'investment': return PiggyBank;
      default: return Wallet;
    }
  };

  const handleConfirmDelete = async () => {
    if (!walletToDelete) return;
    setIsDeleting(true);
    try {
      await deleteWallet(walletToDelete.id);
      setWalletToDelete(null);
    } catch (err) {
      console.error('Failed to delete wallet:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {t.walletTitle}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {wallets.length} {t.activeWallets}
            {excludedCount > 0 && (
              <span className="ml-1.5 inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                <EyeOff className="h-3 w-3" />
                {language === 'id'
                  ? `${excludedCount} dikecualikan dari Net Worth`
                  : `${excludedCount} excluded from Net Worth`}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTransactionModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-blue-500/30 bg-blue-50 px-3.5 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/40 transition-colors cursor-pointer"
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span>{t.transferMoney}</span>
          </button>
          <button
            onClick={openAddWallet}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{t.addWallet}</span>
          </button>
        </div>
      </div>

      {/* Wallets Grid or Empty State */}
      {wallets.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-8 sm:p-12 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-4 shadow-inner">
            <Wallet className="h-7 w-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            {language === 'id' ? 'Database Dompet Masih Kosong' : 'No Wallets Found in Database'}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            {language === 'id' 
              ? 'Anda belum menambahkan rekening bank, dompet tunai, atau e-wallet. FinBag terhubung langsung ke database cloud Anda tanpa data dummy.' 
              : 'You have not added any bank accounts or wallets yet. FinBag connects directly to your cloud database without dummy records.'}
          </p>
          <button
            onClick={openAddWallet}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/25 hover:bg-blue-500 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>{t.addWallet}</span>
          </button>
        </div>
      ) : (
        <motion.div 
          variants={containerStaggerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {wallets.map((wallet) => {
            const Icon = getWalletIcon(wallet.type);
            const convertedToBase = convertCurrency(wallet.balance, wallet.currency, baseCurrency, exchangeRates.rates);
            const isExcluded = Boolean(wallet.excludeFromNetWorth);

            return (
              <motion.div
                key={wallet.id}
                variants={cardItemVariants}
                whileHover={{ y: -3 }}
                onClick={() => openWalletDetail(wallet)}
                className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-200 ease-out hover:shadow-md cursor-pointer ${
                  isExcluded
                    ? 'border-amber-200/80 bg-white/95 dark:border-amber-900/40 dark:bg-slate-900/90 hover:border-amber-400/60'
                    : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:border-blue-500/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
                      style={{ backgroundColor: wallet.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {wallet.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {wallet.type === 'bank' ? t.bank : wallet.type === 'cash' ? t.cash : wallet.type === 'credit' ? t.creditCard : wallet.type === 'investment' ? t.investment : t.ewallet}
                      </p>
                    </div>
                  </div>

                  {/* Actions & Currency Badge */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {wallet.currency}
                    </span>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={(e) => handleToggleExcludeNetWorth(e, wallet)}
                        title={
                          isExcluded
                            ? language === 'id'
                              ? 'Dikecualikan dari Net Worth (Klik untuk memasukkan kembali)'
                              : 'Excluded from Net Worth (Click to include)'
                            : language === 'id'
                            ? 'Termasuk dalam Net Worth (Klik untuk mengecualikan)'
                            : 'Included in Net Worth (Click to exclude)'
                        }
                        aria-label="Toggle Net Worth Exclusion"
                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors cursor-pointer ${
                          isExcluded
                            ? 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:bg-amber-950/50 dark:hover:bg-amber-900/60'
                            : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 dark:hover:text-amber-400'
                        }`}
                      >
                        {isExcluded ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditWallet(wallet);
                        }}
                        title={t.editWallet}
                        aria-label={t.editWallet}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 dark:hover:text-blue-400 transition-colors cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWalletToDelete(wallet);
                        }}
                        title={t.deleteWallet}
                        aria-label={t.deleteWallet}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-2xl font-extrabold font-mono text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(wallet.balance, wallet.currency)}
                    </p>
                  </div>
                  {wallet.currency !== baseCurrency && (
                    <p className="text-xs font-mono text-slate-400 mt-1 tabular-nums">
                      ≈ {formatCurrency(convertedToBase, baseCurrency)} ({baseCurrency})
                    </p>
                  )}
                  {isExcluded && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                      <EyeOff className="h-3 w-3 shrink-0" />
                      <span>
                        {language === 'id'
                          ? 'Dikecualikan dari Net Worth'
                          : 'Excluded from Net Worth'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 flex items-center justify-between text-[11px]">
                  <span className="text-blue-600 dark:text-blue-400 font-semibold group-hover:underline">
                    {language === 'id' ? 'Lihat Mutasi & Detail →' : 'View Mutations & Details →'}
                  </span>
                  {wallet.accountNumber && (
                    <span className="font-mono text-slate-400">
                      {wallet.accountNumber}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Confirmation Modal for Wallet Deletion */}
      <ConfirmationModal
        isOpen={!!walletToDelete}
        title={t.confirmDeleteWalletTitle}
        message={
          walletToDelete
            ? `${walletToDelete.name} (${formatCurrency(walletToDelete.balance, walletToDelete.currency)}). ${t.confirmDeleteWalletDesc}`
            : t.confirmDeleteWalletDesc
        }
        confirmText={t.delete}
        cancelText={t.cancel}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setWalletToDelete(null)}
        details={walletToDelete ? [
          { label: language === 'id' ? 'Nama Akun' : 'Account Name', value: walletToDelete.name },
          { label: language === 'id' ? 'Saldo Tercatat' : 'Recorded Balance', value: formatCurrency(walletToDelete.balance, walletToDelete.currency) },
          { label: language === 'id' ? 'Tipe Dompet' : 'Wallet Type', value: walletToDelete.type.toUpperCase() },
        ] : undefined}
      />
    </div>
  );
};
