import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PrivyProvider } from '@privy-io/react-auth';
import './index.css';
import App from './App.tsx';
import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
}

import { base, mainnet, arbitrum } from 'viem/chains';

function Root() {
  return (
    <PrivyProvider
      appId="cmnrwml5v00w80djogm4ojfqw"
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#1d9bf0',
          logo: 'https://docs.li.fi/logo.png',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets' as any,
          requireUserPasswordOnCreate: false,
        },
        defaultChain: base,
        supportedChains: [base, mainnet, arbitrum]
      }}
    >
            <App />
          </PrivyProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
