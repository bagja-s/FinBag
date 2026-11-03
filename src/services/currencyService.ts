import { SupportedCurrency, CurrencyRateInfo } from '../types/finance';

const CACHE_KEY = 'finbag_fx_rates_cache';
const CACHE_TIMESTAMP_KEY = 'finbag_fx_rates_timestamp';
const CACHE_MAX_AGE_MS = 1000 * 60 * 30; // 30 minutes cache

export const CURRENCY_METADATA: Record<SupportedCurrency, { symbol: string; name: string; flag: string; decimals: number }> = {
  IDR: { symbol: 'Rp', name: 'Rupiah Indonesia', flag: '🇮🇩', decimals: 0 },
  USD: { symbol: '$', name: 'US Dollar', flag: '🇺🇸', decimals: 2 },
  EUR: { symbol: '€', name: 'Euro', flag: '🇪🇺', decimals: 2 },
  SGD: { symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', decimals: 2 },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾', decimals: 2 },
  JPY: { symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', decimals: 0 },
  GBP: { symbol: '£', name: 'British Pound', flag: '🇬🇧', decimals: 2 },
  AUD: { symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', decimals: 2 },
};

// Fallback rates relative to USD (1 USD = X)
export const FALLBACK_RATES_FROM_USD: Record<SupportedCurrency, number> = {
  USD: 1.0,
  IDR: 16250.0,
  EUR: 0.93,
  SGD: 1.33,
  MYR: 4.42,
  JPY: 151.2,
  GBP: 0.78,
  AUD: 1.51,
};

export interface RatesData {
  base: SupportedCurrency;
  rates: Record<SupportedCurrency, number>;
  lastUpdated: string;
}

export async function fetchLiveExchangeRates(baseCurrency: SupportedCurrency = 'USD'): Promise<RatesData> {
  // Check localStorage cache
  try {
    const cachedData = localStorage.getItem(CACHE_KEY);
    const cachedTime = localStorage.getItem(CACHE_TIMESTAMP_KEY);
    const now = Date.now();

    if (cachedData && cachedTime && now - parseInt(cachedTime, 10) < CACHE_MAX_AGE_MS) {
      const parsed = JSON.parse(cachedData);
      if (parsed.rates && parsed.rates.IDR) {
        return rebaseRates(parsed.rates, baseCurrency, new Date(parseInt(cachedTime, 10)).toLocaleTimeString());
      }
    }
  } catch (e) {
    console.warn('Could not read cached exchange rates:', e);
  }

  // Fetch live from open API
  try {
    const response = await fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`FX HTTP error: ${response.status}`);
    }
    const data = await response.json();
    if (data.rates && typeof data.rates.IDR === 'number') {
      const filteredRates: Record<SupportedCurrency, number> = {
        USD: 1,
        IDR: data.rates.IDR || FALLBACK_RATES_FROM_USD.IDR,
        EUR: data.rates.EUR || FALLBACK_RATES_FROM_USD.EUR,
        SGD: data.rates.SGD || FALLBACK_RATES_FROM_USD.SGD,
        MYR: data.rates.MYR || FALLBACK_RATES_FROM_USD.MYR,
        JPY: data.rates.JPY || FALLBACK_RATES_FROM_USD.JPY,
        GBP: data.rates.GBP || FALLBACK_RATES_FROM_USD.GBP,
        AUD: data.rates.AUD || FALLBACK_RATES_FROM_USD.AUD,
      };

      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: filteredRates }));
        localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
      } catch (err) {
        // storage quota ignored
      }

      return rebaseRates(filteredRates, baseCurrency, new Date().toLocaleTimeString());
    }
  } catch (err) {
    console.warn('Using fallback exchange rates due to network/API status:', err);
  }

  return rebaseRates(FALLBACK_RATES_FROM_USD, baseCurrency, 'Fallback');
}

export function rebaseRates(
  ratesFromUsd: Record<SupportedCurrency, number>,
  targetBase: SupportedCurrency,
  timestampStr: string
): RatesData {
  const usdToTarget = ratesFromUsd[targetBase] || 1;
  const rebased: Record<SupportedCurrency, number> = {} as Record<SupportedCurrency, number>;

  const currencies: SupportedCurrency[] = ['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'JPY', 'GBP', 'AUD'];
  currencies.forEach((c) => {
    const usdToCurrency = ratesFromUsd[c] || 1;
    // 1 TargetBase = (usdToCurrency / usdToTarget)
    rebased[c] = usdToCurrency / usdToTarget;
  });

  return {
    base: targetBase,
    rates: rebased,
    lastUpdated: timestampStr,
  };
}

export function convertCurrency(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency,
  ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD
): number {
  if (from === to) return amount;
  const fromRate = ratesFromUsd[from] || 1; // X units per USD
  const toRate = ratesFromUsd[to] || 1;     // Y units per USD
  
  // amount in USD = amount / fromRate
  // amount in target = (amount / fromRate) * toRate
  return (amount / fromRate) * toRate;
}

export function getCurrencyListWithIdrRate(ratesFromUsd: Record<SupportedCurrency, number> = FALLBACK_RATES_FROM_USD): CurrencyRateInfo[] {
  const currencies: SupportedCurrency[] = ['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'JPY', 'GBP', 'AUD'];
  return currencies.map((curr) => {
    const meta = CURRENCY_METADATA[curr];
    // 1 Unit of curr to IDR:
    const rateToIdr = convertCurrency(1, curr, 'IDR', ratesFromUsd);
    return {
      currency: curr,
      symbol: meta.symbol,
      name: meta.name,
      flag: meta.flag,
      rateToIdr,
    };
  });
}
