import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { formatCurrency, filterTransactionsList } from '../../utils/financeCalculations';
import { 
  History, 
  Search, 
  Download, 
  Trash2, 
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
    baseCurrency, 
    deleteTransaction, 
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

  const filtered = filterTransactionsList(transactions, {
    query: searchQuery,
    walletId: selectedWallet,
    categoryId: selectedCategory,
    type: selectedType,
  });

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header with Export CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <History className="h-5 w-5 text-blue-500" />
            <span>Riwayat & Mutasi Transaksi</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {filtered.length} transaksi ditemukan · {language === 'id' ? 'Lengkap dengan pencarian & filter' : 'Complete with search & filters'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            <Download className="h-3.5 w-3.5 text-blue-500" />
            <span>{t.exportCSV}</span>
          </button>
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
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
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {transactions.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 mb-3">
              <History className="h-6 w-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {language === 'id' ? 'Belum Ada Transaksi Tercatat' : 'No Transactions Recorded Yet'}
            </h4>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {language === 'id'
                ? 'Database transaksi Anda masih kosong. Catat pemasukan, pengeluaran, atau transfer pertama Anda.'
                : 'Your transaction database is currently empty. Record your first income, expense, or transfer.'}
            </p>
            <button
              onClick={() => setIsTransactionModalOpen(true)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{t.addTransaction}</span>
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-xs text-slate-400">
            {language === 'id' ? 'Tidak ada transaksi yang cocok dengan kriteria filter.' : 'No transactions match the selected filter.'}
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((tx) => {
              const wallet = wallets.find((w) => w.id === tx.sourceWalletId);
              const targetWallet = wallets.find((w) => w.id === tx.targetWalletId);
              const category = categories.find((c) => c.id === tx.categoryId);

              return (
                <div key={tx.id} className="flex items-center justify-between py-3.5 group">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                      tx.type === 'income'
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : tx.type === 'expense'
                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
                        : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                    }`}>
                      {tx.type === 'income' ? (
                        <ArrowDownLeft className="h-5 w-5" />
                      ) : tx.type === 'expense' ? (
                        <ArrowUpRight className="h-5 w-5" />
                      ) : (
                        <ArrowLeftRight className="h-5 w-5" />
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {tx.description}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <span>{tx.date}</span>
                        <span aria-hidden="true">·</span>
                        <span>{wallet?.name || tx.sourceWalletId}</span>
                        {targetWallet && (
                          <>
                            <span aria-hidden="true">→</span>
                            <span>{targetWallet.name}</span>
                          </>
                        )}
                        {category && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span>{language === 'en' ? category.nameEn : category.name}</span>
                          </>
                        )}
                      </div>
                      {tx.notes && (
                        <p className="text-[10px] text-slate-400 italic mt-0.5">{tx.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono font-bold text-xs sm:text-sm tabular-nums">
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

                    <button
                      onClick={() => deleteTransaction(tx.id)}
                      title="Hapus Transaksi"
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
