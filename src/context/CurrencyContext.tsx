import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useWallets } from '../hooks/privy';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { API_BASE } from '../services/api';

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
  const { wallets } = useWallets();
  const authFetch = useAuthFetch();
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>('USD');
  const hasLoadedRef = useRef(false);
  const embeddedWallet = wallets.find(w => (w as any).walletClientType === 'privy');
  const externalWallet = wallets.find(w => (w as any).walletClientType && (w as any).walletClientType !== 'privy');
  const wallet = embeddedWallet || externalWallet || wallets.find(w => w.address?.startsWith('0x'));
  const address = wallet?.address ?? '';

  useEffect(() => {
    if (!address) return;
    const loadCurrency = async () => {
      try {
        const res = await authFetch(`${API_BASE}/api/users/${address}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.currency) setSelectedCurrency(data.currency as CurrencyCode);
        hasLoadedRef.current = true;
      } catch {
        hasLoadedRef.current = true;
      }
    };
    loadCurrency();
  }, [address]);

  useEffect(() => {
    if (!address || !hasLoadedRef.current) return;
    authFetch(`${API_BASE}/api/users`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: address.toLowerCase(), currency: selectedCurrency }),
    }).catch(() => undefined);
  }, [address, selectedCurrency]);

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
