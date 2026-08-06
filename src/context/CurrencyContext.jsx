import { createContext, useContext, useState, useCallback } from 'react';

const CurrencyContext = createContext(null);

// Static conversion rates relative to USD
const RATES = {
  USD: { symbol: '$', rate: 1 },
  EUR: { symbol: '€', rate: 0.92 },
  GBP: { symbol: '£', rate: 0.79 },
  INR: { symbol: '₹', rate: 83.4 },
  JPY: { symbol: '¥', rate: 149.5 },
  AUD: { symbol: 'A$', rate: 1.54 },
  CAD: { symbol: 'C$', rate: 1.36 },
  THB: { symbol: '฿', rate: 35.2 },
  SGD: { symbol: 'S$', rate: 1.34 },
  AED: { symbol: 'د.إ', rate: 3.67 },
};

export const CURRENCIES = Object.entries(RATES).map(([code, { symbol }]) => ({
  code,
  symbol,
  label: `${code} (${symbol})`,
}));

export function CurrencyProvider({ children }) {
  const [currency, setCurrency] = useState(() => {
    try {
      return localStorage.getItem('tripnest_currency') || 'USD';
    } catch {
      return 'USD';
    }
  });

  const handleSetCurrency = useCallback((code) => {
    setCurrency(code);
    try {
      localStorage.setItem('tripnest_currency', code);
    } catch {}
  }, []);

  const formatPrice = useCallback(
    (amountUSD) => {
      if (amountUSD == null || isNaN(amountUSD)) return '—';
      if (amountUSD === 0) return 'Free';
      const { symbol, rate } = RATES[currency] || RATES.USD;
      const converted = amountUSD * rate;
      // Format with appropriate decimals
      if (converted >= 1000) {
        return `${symbol}${Math.round(converted).toLocaleString()}`;
      }
      if (converted >= 100) {
        return `${symbol}${Math.round(converted)}`;
      }
      return `${symbol}${converted.toFixed(converted % 1 === 0 ? 0 : 2)}`;
    },
    [currency]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency: handleSetCurrency,
        formatPrice,
        currencies: CURRENCIES,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

export default CurrencyContext;
