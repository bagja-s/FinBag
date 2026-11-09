import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency, filterTransactionsList } from '../../utils/financeCalculations';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { Transaction } from '../../types/finance';
import { 
  History, 
  Search, 
  Download, 
  Trash2, 
  Edit3,
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeftRight,
  Plus 
} from 'lucide-react';

export const TransactionsView: React.FC = () => {
  const { 
    transactions, 
    wallets, 
    categories, 
    deleteTransaction, 
    openEditTransaction,
    exportCSV, 
    exportJSON, 
    setIsTransactionModalOpen,
    language 
  } = useFinance();

  const t = getTranslation(language);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWallet, setSelectedWallet] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Confirmation state for deleting a transaction
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = filterTransactionsList(transactions, {
    query: searchQuery,
    walletId: selectedWallet,
    categoryId: selectedCategory,
    type: selectedType,
  });

  const handleConfirmDelete = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTransaction(txToDelete.id);
      setTxToDelete(null);
    } catch (err) {
      console.error('Delete transaction error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const walletOfTxToDelete = txToDelete ? wallets.find(w => w.id === txToDelete.sourceWalletId) : null;
  const categoryOfTxToDelete = txToDelete ? categories.find(c => c.id === txToDelete.categoryId) : null;

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header with Export CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <History className="h-5 w-5 text-blue-500" />
            <span>{language === 'id' ? 'Riwayat & Mutasi Transaksi' : 'Transaction History & Mutations'}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {filtered.length} {language === 'id' ? 'transaksi ditemukan' : 'transactions found'} · {language === 'id' ? 'Lengkap dengan pencarian, filter, edit & konfirmasi' : 'Complete with search, filters, edit & confirmations'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-blue-500" />
            <span>{t.exportCSV}</span>
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <Download className="h-3.5 w-3.5 text-emerald-500" />
            <span>{t.exportJSON}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Search Input */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/80">
          <Search className="h-4 w-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchTransactions}
            className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
          />
        </div>

        {/* Wallet Filter */}
        <select
          value={selectedWallet}
          onChange={(e) => setSelectedWallet(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 focus:outline-none cursor-pointer"
        >
          <option value="all">{t.allWallets}</option>
          {wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 focus:outline-none cursor-pointer"
        >
          <option value="all">{t.allCategories}</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {language === 'en' ? c.nameEn : c.name}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200 focus:outline-none cursor-pointer"
        >
          <option value="all">{t.allTypes}</option>
          <option value="expense">{t.typeExpense}</option>
          <option value="income">{t.typeIncome}</option>
          <option value="transfer">{t.typeTransfer}</option>
        </select>
      </div>

      {/* Transactions List */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <History className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {language === 'id' ? 'Tidak Ada Catatan Transaksi' : 'No Transactions Found'}
            </h3>
            <p className="mt-1 text-xs text-slate-400 max-w-sm mx-auto">
              {language === 'id' 
                ? 'Belum ada transaksi di database atau tidak ada transaksi yang cocok dengan filter Anda.' 
                : 'No transactions found matching your criteria.'}
            </p>
            <button
              onClick={() => setIsTransactionModalOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{t.addTransaction}</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((tx) => {
              const wallet = wallets.find((w) => w.id === tx.sourceWalletId);
              const targetWallet = tx.targetWalletId ? wallets.find((w) => w.id === tx.targetWalletId) : null;
              const category = categories.find((c) => c.id === tx.categoryId);

              return (
                <div
                  key={tx.id}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-sm transition-transform duration-200 group-hover:scale-105 ${
                      tx.type === 'income'
                        ? 'bg-emerald-500'
                        : tx.type === 'expense'
                        ? 'bg-rose-500'
                        : 'bg-blue-600'
                    }`}>
                      {tx.type === 'income' ? (
                        <ArrowDownLeft className="h-5 w-5" />
                      ) : tx.type === 'expense' ? (
                        <ArrowUpRight className="h-5 w-5" />
                      ) : (
                        <ArrowLeftRight className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {tx.description}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span className="font-mono">{tx.date}</span>
                        <span aria-hidden="true">·</span>
                        <span>{wallet?.name || tx.sourceWalletId}</span>
                        {targetWallet && (
                          <>
                            <span aria-hidden="true">→</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{targetWallet.name}</span>
                          </>
                        )}
                        {category && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 dark:text-slate-300">
                              {language === 'en' ? category.nameEn : category.name}
                            </span>
                          </>
                        )}
                      </div>
                      {tx.notes && (
                        <p className="text-[10px] text-slate-400 italic mt-0.5 truncate">{tx.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/60">
                    <div className="text-left sm:text-right font-mono font-bold text-xs sm:text-sm tabular-nums">
                      <span className={
                        tx.type === 'income'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : tx.type === 'expense'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }>
                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                        {formatCurrency(tx.amount, tx.currency)}
                      </span>
                    </div>

                    {/* Action Buttons: Edit and Delete with Confirmation */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditTransaction(tx)}
                        title={language === 'id' ? 'Edit Transaksi' : 'Edit Transaction'}
                        aria-label={`Edit ${tx.description}`}
                        className="flex items-center gap-1 p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:text-slate-400 dark:hover:text-blue-400 dark:hover:bg-blue-950/40 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span className="text-[11px] font-medium sm:hidden">{t.edit}</span>
                      </button>

                      <button
                        onClick={() => setTxToDelete(tx)}
                        title={language === 'id' ? 'Hapus Transaksi' : 'Delete Transaction'}
                        aria-label={`Hapus ${tx.description}`}
                        className="flex items-center gap-1 p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-rose-400 dark:hover:bg-rose-950/40 rounded-lg transition-all duration-150 active:scale-90 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="text-[11px] font-medium sm:hidden">{t.delete}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(txToDelete)}
        title={t.confirmDeleteTransactionTitle}
        message={t.confirmDeleteTransactionDesc}
        confirmText={language === 'id' ? 'Hapus Transaksi' : 'Delete Transaction'}
        cancelText={t.cancel}
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setTxToDelete(null)}
        details={txToDelete ? [
          { label: language === 'id' ? 'Keterangan' : 'Description', value: txToDelete.description },
          { label: language === 'id' ? 'Nominal' : 'Amount', value: formatCurrency(txToDelete.amount, txToDelete.currency) },
          { label: language === 'id' ? 'Tanggal' : 'Date', value: txToDelete.date },
          { label: language === 'id' ? 'Dompet Terkait' : 'Related Wallet', value: walletOfTxToDelete?.name || txToDelete.sourceWalletId },
          ...(categoryOfTxToDelete ? [{ label: language === 'id' ? 'Kategori' : 'Category', value: language === 'en' ? categoryOfTxToDelete.nameEn : categoryOfTxToDelete.name }] : [])
        ] : []}
      />
    </div>
  );
};
