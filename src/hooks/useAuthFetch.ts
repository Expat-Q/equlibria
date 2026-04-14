import { useCallback } from 'react';
import { usePrivy, useWallets } from './privy';
import { API_BASE } from '../services/api';

type FetchInput = Parameters<typeof fetch>[0];
type FetchInit = Parameters<typeof fetch>[1];

export function useAuthFetch() {
  const { getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  const getSigningWallet = () => {
    const external = wallets.find(w => (w as any).walletClientType && (w as any).walletClientType !== 'privy');
    const embedded = wallets.find(w => (w as any).walletClientType === 'privy');
    return external || embedded || wallets[0];
  };

  const getWalletProvider = async (wallet: any) => {
    if (wallet?.getEthereumProvider) {
      return wallet.getEthereumProvider();
    }
    if (typeof window !== 'undefined') {
      return (window as any).ethereum;
    }
    return null;
  };

  const getWalletAuthHeaders = async () => {
    const wallet = getSigningWallet();
    const address = wallet?.address;
    if (!address) return null;

    const nonceRes = await fetch(`${API_BASE}/api/auth/nonce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address }),
    });

    if (!nonceRes.ok) return null;
    const { nonce, message } = await nonceRes.json();
    if (!nonce || !message) return null;

    const provider = await getWalletProvider(wallet);
    if (!provider?.request) return null;

    const signature = await provider.request({
      method: 'personal_sign',
      params: [message, address],
    });

    return {
      'x-wallet-address': address,
      'x-wallet-signature': signature,
      'x-wallet-nonce': nonce,
    } as Record<string, string>;
  };

  return useCallback(
    async (input: FetchInput, init: FetchInit = {}) => {
      const token = await getAccessToken();
      const headers = new Headers(init.headers || {});
      if (token) headers.set('Authorization', `Bearer ${token}`);
      try {
        const walletHeaders = await getWalletAuthHeaders();
        if (walletHeaders) {
          Object.entries(walletHeaders).forEach(([key, value]) => headers.set(key, value));
        }
      } catch {
        // Ignore wallet auth failures and let the request proceed
      }
      return fetch(input, { ...init, headers });
    },
    [getAccessToken, wallets]
  );
}
