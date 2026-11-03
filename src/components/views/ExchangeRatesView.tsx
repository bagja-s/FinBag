import React, { useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getTranslation } from '../../i18n/translations';
import { SupportedCurrency } from '../../types/finance';
import { 
  CURRENCY_METADATA, 
  convertCurrency, 
  getCurrencyListWithIdrRate 
} from '../../services/currencyService';
import { formatCurrency } from '../../utils/financeCalculations';
import { 
  TrendingUp, 
  RefreshCw, 
  ArrowLeftRight, 
  Calculator, 
  Globe 
} from 'lucide-react';

export const ExchangeRatesView: React.FC = () => {
  const { 
    exchangeRates, 
    refreshExchangeRates, 
    isRatesLoading, 
    baseCurrency, 
    language 
  } = useFinance();

  const t = getTranslation(language);

  // Currency Converter state
  const [calcAmount, setCalcAmount] = useState<string>('100');
  const [fromCurr, setFromCurr] = useState<SupportedCurrency>('USD');
  const [toCurr, setToCurr] = useState<SupportedCurrency>('IDR');

  const currencies: SupportedCurrency[] = ['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'JPY', 'GBP', 'AUD'];

  const parsedCalcAmount = parseFloat(calcAmount) || 0;
  const convertedResult = convertCurrency(parsedCalcAmount, fromCurr, toCurr, exchangeRates.rates);

  const currencyList = getCurrencyListWithIdrRate(exchangeRates.rates);

  const handleSwap = () => {
    const temp = fromCurr;
    setFromCurr(toCurr);
    setToCurr(temp);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-blue-500" />
            <span>{t.fxTitle}</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.fxSubtitle} · {t.lastUpdated}: {exchangeRates.lastUpdated}
          </p>
        </div>

        <button
          onClick={() => refreshExchangeRates()}
          disabled={isRatesLoading}
          className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors shrink-0"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRatesLoading ? 'animate-spin text-blue-500' : ''}`} />
          <span>{t.refreshRates}</span>
        </button>
      </div>

      {/* Currency Converter Interactive Calculator */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Calculator className="h-4 w-4 text-blue-500" />
          <span>{t.converterTitle}</span>
        </h2>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
          {/* From input */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-semibold text-slate-500">{t.from}</label>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
              <select
                value={fromCurr}
                onChange={(e) => setFromCurr(e.target.value as SupportedCurrency)}
                className="h-11 border-r border-slate-200 bg-transparent px-3 text-xs font-bold text-slate-800 dark:border-slate-700 dark:text-slate-200 focus:outline-none"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {CURRENCY_METADATA[c].flag} {c}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="any"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                placeholder="0"
                className="h-11 w-full bg-transparent px-3 font-mono font-bold text-sm text-slate-900 dark:text-white focus:outline-none tabular-nums"
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="md:col-span-1 flex justify-center pt-4 md:pt-0">
            <button
              onClick={handleSwap}
              aria-label="Tukar Posisi Mata Uang"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-blue-600 transition-colors shadow-sm"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          </div>

          {/* To input */}
          <div className="md:col-span-3 space-y-1">
            <label className="text-[11px] font-semibold text-slate-500">{t.to}</label>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
              <select
                value={toCurr}
                onChange={(e) => setToCurr(e.target.value as SupportedCurrency)}
                className="h-11 border-r border-slate-200 bg-transparent px-3 text-xs font-bold text-slate-800 dark:border-slate-700 dark:text-slate-200 focus:outline-none"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {CURRENCY_METADATA[c].flag} {c}
                  </option>
                ))}
              </select>
              <div className="flex h-11 w-full items-center px-3 font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatCurrency(convertedResult, toCurr)}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-3 text-xs text-slate-500 flex items-center justify-between">
          <span>1 {fromCurr} = {formatCurrency(convertCurrency(1, fromCurr, toCurr, exchangeRates.rates), toCurr)}</span>
          <span className="font-mono text-[11px] text-slate-400">Live API</span>
        </div>
      </div>

      {/* Foreign Exchange Rates Table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span>Tabel Nilai Tukar Terhadap Rupiah (IDR)</span>
          </h2>
          <span className="text-[11px] font-mono text-slate-400">Kurs Pasar Terkini</span>
        </div>

        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
          {currencyList.map((item) => {
            const isBase = item.currency === baseCurrency;
            return (
              <div key={item.currency} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.flag}</span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.currency}
                      </span>
                      {isBase && (
                        <span className="rounded bg-blue-100 dark:bg-blue-950 px-1.5 py-0.2 text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                          Base
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {item.name} ({item.symbol})
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white tabular-nums">
                    {item.currency === 'IDR' ? 'Rp 1' : `Rp ${Math.round(item.rateToIdr).toLocaleString('id-ID')}`}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    per 1 {item.currency}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
