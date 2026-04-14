import { useState, useEffect } from 'react';
import { usePrivy, useWallets } from '../hooks/privy';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { API_BASE } from '../services/api';

type Step = {
  target: string;
  content: string;
  placement?: string;
  disableBeacon?: boolean;
  placementBeacon?: string;
};

export function TourGuide() {
  const { authenticated, user } = usePrivy();
  const { wallets } = useWallets();
  const authFetch = useAuthFetch();
  const [run, setRun] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [Joyride, setJoyride] = useState<any>(null);
  const embeddedWallet = wallets.find(w => (w as any).walletClientType === 'privy');
  const externalWallet = wallets.find(w => (w as any).walletClientType && (w as any).walletClientType !== 'privy');
  const wallet = externalWallet || embeddedWallet || wallets.find(w => w.address?.startsWith('0x'));
  const address = wallet?.address ?? '';

  useEffect(() => {
    import('react-joyride').then((mod) => {
      const joyrideComponent = ('default' in mod ? mod.default : undefined) || (mod as any).Joyride;
      if (joyrideComponent) {
        setJoyride(() => joyrideComponent);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!Joyride || !authenticated || !address) return;
    const loadTourState = async () => {
      try {
        const res = await authFetch(`${API_BASE}/api/users/${address.toLowerCase()}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!data.hasSeenTour) {
          const timer = setTimeout(() => setRun(true), 1200);
          return () => clearTimeout(timer);
        }
      } catch (err) {
        console.warn('Failed to load tour state:', err);
      }
      return undefined;
    };
    loadTourState();
  }, [Joyride, authenticated, address, user?.id]);

  // Listen for manual tour trigger
  useEffect(() => {
    const handleStartTour = () => {
      setRun(true);
    };
    window.addEventListener('startTour', handleStartTour);
    return () => window.removeEventListener('startTour', handleStartTour);
  }, []);

  const handleCallback = (data: { status: string }) => {
    if (data.status === 'finished' || data.status === 'skipped') {
      setRun(false);
      if (!address) return;
      authFetch(`${API_BASE}/api/users`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.toLowerCase(), hasSeenTour: true }),
      }).catch(err => console.warn('Failed to persist tour state:', err));
    }
  };

  const steps: Step[] = [
    {
      target: 'body',
      content: '👋 Welcome to Equilibria Vault! Let me give you a quick tour of your smart savings app.',
      placement: 'center',
      disableBeacon: true,
    },
    {
      // Target the balance card inside dashboard - more specific so tooltip renders inside view
      target: '.balance-card',
      content: '💼 This is your Total Portfolio Balance - see your cumulative savings, toggle holdings, and perform quick actions like Send, Request, Split, or Top Up.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#user-wallet-dropdown',
      content: '⚙️ Click your wallet chip here to access Profile Settings, change your display name, or logout securely.',
      placement: 'bottom',
      disableBeacon: true,
    },
    {
      target: '#plans-create-btn',
      content: '🚀 Ready to save? Click "Create Plan" to start an individual private vault or a joint savings plan with a partner!',
      placement: 'left',
      disableBeacon: true,
    },
  ];

  if (!Joyride) return null;

  return (
    <Joyride
      callback={handleCallback}
      continuous
      hideCloseButton={false}
      run={run}
      scrollToFirstStep
      scrollOffset={80}
      disableScrolling={false}
      showProgress
      showSkipButton
      steps={steps}
      floaterProps={{
        disableAnimation: false,
        hideArrow: false,
        offset: 14,
        options: {
          preventOverflow: {
            boundariesElement: 'window',
          },
        },
      }}
      styles={{
        options: {
          zIndex: 10000,
          primaryColor: '#ff8c00',
          textColor: '#1a1d23',
          backgroundColor: '#ffffff',
          arrowColor: '#ffffff',
          width: 340,
        },
        tooltip: {
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '0.9rem',
          lineHeight: 1.6,
          padding: '1.25rem 1.5rem',
        },
        tooltipContent: {
          padding: '0.5rem 0 0.25rem',
        },
        buttonNext: {
          borderRadius: '10px',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontWeight: 700,
          padding: '0.65rem 1.5rem',
          fontSize: '0.85rem',
          backgroundColor: '#000000',
          color: '#ffffff',
          border: '1px solid #333333',
        },
        buttonSkip: {
          color: '#666',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '0.82rem',
          backgroundColor: 'transparent',
          border: '1px solid #e0e0e0',
          padding: '0.5rem 1.2rem',
          borderRadius: '8px',
        },
        buttonBack: {
          color: '#000000',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: '0.82rem',
          backgroundColor: '#f5f5f5',
          border: '1px solid #ddd',
          padding: '0.5rem 1rem',
          borderRadius: '8px',
        },
        buttonClose: {
          color: '#000000',
          background: 'transparent',
          border: 'none',
          width: 20,
          height: 20,
          right: 12,
          top: 12,
          position: 'absolute',
          cursor: 'pointer',
          zIndex: 100,
          padding: 0,
        },
      }}
    />
  );
}
