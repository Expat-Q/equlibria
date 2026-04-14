import React, { createContext, useContext, useState, useEffect } from 'react';

export type CurrencyCode = 'USD' | 'NGN' | 'EUR' | 'GBP' | 'KES';

interface CurrencyContextType {
  selectedCurrency: CurrencyCode;
  setSelectedCurrency: (code: CurrencyCode) => void;
  convert: (usdAmount: number) => number;
  format: (usdAmount: number) => string;
  getSymbol: (code?: CurrencyCode) => string;
}

const RATES: Record<CurrencyCode, number> = {
  USD: 1,
  NGN: 1620, // Example rate
  EUR: 0.92,
  GBP: 0.79,
  KES: 132,
};

const SYMBOLS: Record<CurrencyCode, string> = {
  USD: '$',
  NGN: '₦',
  EUR: '€',
  GBP: '£',
  KES: 'KSh',
};

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('equilibria_currency');
    return (saved as CurrencyCode) || 'USD';
  });

  useEffect(() => {
    localStorage.setItem('equilibria_currency', selectedCurrency);
  }, [selectedCurrency]);

  const convert = (usdAmount: number) => {
    return usdAmount * RATES[selectedCurrency];
  };

  const getSymbol = (code?: CurrencyCode) => {
    return SYMBOLS[code || selectedCurrency];
  };

  const format = (usdAmount: number) => {
    const amount = convert(usdAmount);
    const symbol = getSymbol();
    
    return `${symbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <CurrencyContext.Provider value={{ selectedCurrency, setSelectedCurrency, convert, format, getSymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) throw new Error('useCurrency must be used within a CurrencyProvider');
  return context;
};
