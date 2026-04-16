import { useState, useEffect, useRef } from 'react';
import { IS_DEMO, usePrivy, useWallets } from './hooks/privy';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { PlansPage } from './components/PlansPage';
import { YieldDashboard } from './components/YieldDashboard';
import { SharedVault } from './components/SharedVault';
import { SwapPage } from './components/SwapPage';
import { Sidebar } from './components/Sidebar';
import { CreatePlanModal } from './components/CreatePlanModal';
import { DepositModal } from './components/DepositModal';
import { SendModal } from './components/SendModal';
import { ReceiveModal } from './components/ReceiveModal';
import { CryptoReceiveModal } from './components/CryptoReceiveModal';
import { WalletManager } from './components/WalletManager';
import { TourGuide } from './components/TourGuide';
import { UserProfile } from './components/UserProfile';
import { NotificationCenter, type Notification } from './components/NotificationCenter';
import { Icon } from './components/Icon';
import { CurrencyProvider } from './context/CurrencyContext';
import { ReferralsPage } from './components/ReferralsPage';
import { LeaderboardPage } from './components/LeaderboardPage';
import type { ChainName, SavingsPlan } from './types';
import { getWalletBalances, type WalletBalance } from './services/chainService';
import { useAuthFetch } from './hooks/useAuthFetch';
import { API_BASE } from './services/api';

const SUPPORTED_CHAINS: ChainName[] = ['ethereum', 'arbitrum', 'base'];

type Tab = 'dashboard' | 'plans' | 'swap' | 'yield' | 'referrals' | 'leaderboard';
type RecentActivityItem = {
  id: string;
  name: string;
  amount: number;
  date: string;
  icon: string;
  txHash?: string;
  chainId?: number;
  chain?: string;
};

function App() {
  const { authenticated, ready, user, logout } = usePrivy();
  const { wallets } = useWallets();
  const authFetch = useAuthFetch();
  
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [plans, setPlans] = useState<SavingsPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<SavingsPlan | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState<SavingsPlan | null>(null);
  const [showSendModal, setShowSendModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false); // Used for Native Bank Transfer Top Up
  const [showCryptoReceiveModal, setShowCryptoReceiveModal] = useState(false); // Used for Crypto Receive
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [profileUsername, setProfileUsername] = useState<string | null>(null);
  const [lastVaultState, setLastVaultState] = useState<Map<string, number>>(new Map());
  const [walletBalances, setWalletBalances] = useState<WalletBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [recentActivity, setRecentActivity] = useState<RecentActivityItem[]>([]);
  const [displayName, setDisplayName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedProfileRef = useRef(false);
  const isDemoMode = IS_DEMO;

  const privy_id = user?.id || '';
  const embeddedWallet = wallets.find(w => (w as any).walletClientType === 'privy');
  const externalWallet = wallets.find(w => (w as any).walletClientType && (w as any).walletClientType !== 'privy');
  const wallet = embeddedWallet || externalWallet || wallets.find(w => w.address?.startsWith('0x'));
  const address = wallet?.address ?? '';
  const chainIdMap: Record<string, number> = { ethereum: 1, base: 8453, arbitrum: 42161 };

  const addRecentActivity = (item: RecentActivityItem) => {
    setRecentActivity(prev => [item, ...prev].slice(0, 8));
    if (!address) return;
    authFetch(`${API_BASE}/api/activity/user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAddress: address,
        type: item.icon || 'activity',
        name: item.name,
        amount: item.amount,
        txHash: item.txHash,
        chainId: item.chainId,
        chain: item.chain,
        icon: item.icon,
      }),
    }).catch(err => console.warn('Failed to persist activity:', err));
  };

  // Notification Management
  const addNotification = (type: 'success' | 'error' | 'info' | 'update', message: string, action?: { label: string; onClick: () => void }) => {
    const notif: Notification = {
      id: `${Date.now()}_${Math.random()}`,
      type,
      message,
      timestamp: new Date(),
      read: false,
      action,
    };
    setNotifications(prev => [notif, ...prev]);
    if (!address) return;
    authFetch(`${API_BASE}/api/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAddress: address, type, message }),
    })
      .then(async res => {
        if (!res.ok) throw new Error('Failed to persist notification');
        const data = await res.json();
        if (data.item?._id) {
          setNotifications(prev => prev.map(n => (n.id === notif.id ? { ...n, id: data.item._id } : n)));
        }
      })
      .catch(err => console.warn('Failed to persist notification:', err));
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    if (!address) return;
    authFetch(`${API_BASE}/api/notifications/${id}/read`, { method: 'PATCH' })
      .catch(err => console.warn('Failed to mark notification as read:', err));
  };

  const clearNotifications = () => {
    setNotifications([]);
    if (!address) return;
    authFetch(`${API_BASE}/api/notifications/${address}`, { method: 'DELETE' })
      .catch(err => console.warn('Failed to clear notifications:', err));
  };

  const loadNotifications = async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/notifications/${address}`);
      if (!response.ok) return;
      const data = await response.json();
      const items = (data.items || []).map((n: any) => ({
        id: n._id,
        type: n.type,
        message: n.message,
        timestamp: new Date(n.createdAt),
        read: n.read,
      }));
      setNotifications(items);
    } catch (err) {
      console.warn('Failed to load notifications:', err);
    }
  };

  // Register user on first login
  useEffect(() => {
    if (authenticated && privy_id && address) {
      registerUser();
      syncVaultsFromBackend();
      loadRecentActivity();
      loadNotifications();
      loadUserProfile();
      // Start real-time polling loop
      startPolling();
    }
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [authenticated, privy_id, address]);

  // Real balances (auto fetch)
  useEffect(() => {
    if (!authenticated || !address) return;
    const loadRealBalances = async () => {
      setBalancesLoading(true);
      try {
        const balances = await getWalletBalances(address);
        setWalletBalances(balances);
      } catch (err) {
        console.warn('Failed to load real balances:', err);
      } finally {
        setBalancesLoading(false);
      }
    };
    loadRealBalances();
  }, [authenticated, address]);


  const startPolling = () => {
    // Poll for vault updates every 10 seconds
    pollingIntervalRef.current = setInterval(() => {
      if (isDemoMode) return;
      checkForVaultUpdates();
    }, 10000);
  };

  const checkForVaultUpdates = async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/vaults/${address}`);
      if (!response.ok) return;

      const data = await response.json();
      const backendVaults = data.vaults || [];

      // Check for balance changes
      for (const vault of backendVaults) {
        const planId = vault.planId;
        const oldBalance = lastVaultState.get(planId) || 0;
        const newBalance = vault.currentAmount || 0;

        if (newBalance > oldBalance && oldBalance > 0) {
          const delta = newBalance - oldBalance;
          addNotification(
            'update',
            `Partner deposited $${delta.toFixed(2)} to "${vault.planName}"`,
            {
              label: 'View',
              onClick: () => {
                const plan = plans.find(p => p.id === planId);
                if (plan) setSelectedPlan(plan);
              },
            }
          );
        }

        setLastVaultState(prev => new Map(prev).set(planId, newBalance));
      }

      setPlans(prevPlans =>
        prevPlans.map(plan => {
          const vault = backendVaults.find((v: any) => v.planId === plan.id);
          if (vault) {
            return {
              ...plan,
              currentAmount: vault.currentAmount || plan.currentAmount,
              partnerContribution: vault.creatorAddress === address ? vault.partnerContribution || 0 : vault.creatorContribution || 0,
            };
          }
          return plan;
        })
      );
    } catch (err) {
      console.error('Failed to check vault updates:', err);
    }
  };

  const syncVaultsFromBackend = async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/vaults/${address}`);
      if (!response.ok) return;

      const data = await response.json();
      const backendVaults = data.vaults || [];

      // Merge backend vaults with current plans
      setPlans(prevPlans => {
        const vaultMap = new Map(prevPlans.map(p => [p.id, p]));

        for (const vault of backendVaults) {
          const planId = vault.planId;
          const vaultBalance = vault.currentAmount || 0;
          const syncedChain: ChainName = SUPPORTED_CHAINS.includes(vault.chain)
            ? vault.chain
            : 'base';
          setLastVaultState(prev => new Map(prev).set(planId, vaultBalance));

          if (!vaultMap.has(planId)) {
            // Plan was loaded from backend (might not be in localStorage yet, or user switched devices)
            const synced: SavingsPlan = {
              id: planId,
              name: vault.planName,
              category: vault.category || 'other',
              type: vault.type === 'private' ? 'individual' : (vault.type || 'individual'),
              token: vault.token as any,
              chain: syncedChain,
              targetAmount: vault.targetAmount,
              currentAmount: vaultBalance,
              myContribution: vault.creatorAddress === address ? vault.creatorContribution || vaultBalance : 0,
              partnerContribution: vault.creatorAddress === address ? vault.partnerContribution || 0 : vault.creatorContribution || vaultBalance,
              yieldEarned: vault.yieldEarned || 0,
              apy: vault.apy || 0,
              createdAt: vault.createdAt,
              lockDurationDays: vault.lockDurationDays || 30,
              withdrawalDate: vault.withdrawalDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              depositToDefi: vault.depositToDefi !== undefined ? vault.depositToDefi : true,
              defiProtocol: vault.defiProtocol,
              defiVaultName: vault.defiVaultName,
              defiChainId: vault.defiChainId,
              defiVaultAddress: vault.defiVaultAddress,
              policyAgreed: true,
              sharedOnX: vault.sharedOnX || false,
              partnerAddress: vault.creatorAddress === address ? vault.partnerAddress : vault.creatorAddress,
              partnerInviteCode: vault.inviteCode,
              isPartnerAccepted: vault.isPartnerAccepted,
            };
            vaultMap.set(planId, synced);

            // Show notification if this is a partner join
            if (vault.partnerAddress === address) {
              addNotification(
                'info',
                `You were added to "${vault.planName}" by partner!`,
                {
                  label: 'Open',
                  onClick: () => {
                    const plan = vaultMap.get(planId);
                    if (plan) setSelectedPlan(plan);
                  },
                }
              );
            }
          }
        }

        return Array.from(vaultMap.values());
      });
    } catch (err) {
      console.error('Failed to sync vaults:', err);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/activity/user/${address}`);
      if (!response.ok) return;
      const data = await response.json();
      const items = (data.items || []).map((item: any) => ({
        id: item._id,
        name: item.name,
        amount: item.amount || 0,
        date: new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        icon: item.icon || 'savings',
        txHash: item.txHash,
        chainId: item.chainId,
        chain: item.chain,
      }));
      setRecentActivity(items);
    } catch (err) {
      console.warn('Failed to load recent activity:', err);
    }
  };

  const registerUser = async () => {
    try {
      // Generate clean username from address
      const username = `saver_${address.slice(2, 10)}`.toLowerCase();
      await authFetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privy_id: privy_id,
          address: address.toLowerCase(),
          username,
          displayName: username,
        }),
      });
    } catch (err) {
      console.error('Failed to register user:', err);
    }
  };

  const loadUserProfile = async () => {
    try {
      const res = await authFetch(`${API_BASE}/api/users/${address.toLowerCase()}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.displayName) setDisplayName(data.displayName);
      if (data.theme === 'light' || data.theme === 'dark') setTheme(data.theme);
    } catch (err) {
      console.warn('Failed to load user profile:', err);
    } finally {
      hasLoadedProfileRef.current = true;
    }
  };

  // Check URL for user profile
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const profile = params.get('profile');
    if (profile) {
      setProfileUsername(profile);
    }
  }, []);

  // Listen for URL changes
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const profile = params.get('profile');
      setProfileUsername(profile);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const closeUserProfile = () => {
    setProfileUsername(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme, address]);

  useEffect(() => {
    if (!address || !hasLoadedProfileRef.current) return;
    authFetch(`${API_BASE}/api/users`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address: address.toLowerCase(), theme }),
    }).catch(err => console.warn('Failed to save theme:', err));
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const addPlan = async (newPlan: SavingsPlan) => {
    try {
      // Persist all plans to backend
      const response = await authFetch(`${API_BASE}/api/vaults`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: newPlan.id,
          creatorAddress: address,
          partnerAddress: newPlan.partnerAddress || undefined,
          inviteCode: newPlan.partnerInviteCode || undefined,
          planName: newPlan.name,
          token: newPlan.token,
          chain: newPlan.chain,
          targetAmount: newPlan.targetAmount,
          type: newPlan.type,
          category: newPlan.category,
          lockDurationDays: newPlan.lockDurationDays,
          depositToDefi: newPlan.depositToDefi,
            defiProtocol: newPlan.defiProtocol,
            defiVaultName: newPlan.defiVaultName,
            defiChainId: newPlan.defiChainId,
            defiVaultAddress: newPlan.defiVaultAddress,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to save plan to MongoDB');
      }

      if (newPlan.currentAmount > 0) {
        await authFetch(`${API_BASE}/api/vaults/${newPlan.id}/deposit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            depositorAddress: address,
            amount: newPlan.currentAmount,
            txHash: newPlan.creationTxHash,
          }),
        });
      }

      if (newPlan.type === 'joint' && newPlan.partnerAddress) {
        addNotification(
          'success',
          `Joint plan created! ${newPlan.partnerAddress.slice(0, 6)}...${newPlan.partnerAddress.slice(-4)} can now join.`,
          {
            label: 'View',
            onClick: () => setSelectedPlan(newPlan),
          }
        );
      } else {
        addNotification('success', `"${newPlan.name}" plan created successfully!`);
      }

      addRecentActivity({
        id: `plan_${newPlan.id}`,
        name: `Created "${newPlan.name}"`,
        amount: newPlan.currentAmount,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        icon: 'savings',
        txHash: newPlan.creationTxHash,
        chainId: newPlan.creationChainId,
        chain: newPlan.chain,
      });

      setPlans(prev => [...prev, newPlan]);
      setShowCreateModal(false);
      setActiveTab('dashboard');
    } catch (err) {
      console.error('Failed to add plan:', err);
      addNotification('error', 'Plan creation failed to save to MongoDB. Please retry.');
      throw err;
    }
  };

  const updatePlan = (updatedPlan: SavingsPlan) => {
    setPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
    if (selectedPlan?.id === updatedPlan.id) setSelectedPlan(updatedPlan);
  };

  const handleDeposit = (plan: SavingsPlan, amount: number) => {
    const updatedPlan: SavingsPlan = {
      ...plan,
      currentAmount: plan.currentAmount + amount,
      myContribution: plan.myContribution + amount,
      depositToDefi: true,
      yieldEarned: plan.yieldEarned + (amount * 0.0001)
    };
    updatePlan(updatedPlan);
    setShowDepositModal(null);
  };

  if (!ready) {
    return (
      <div style={{ background: 'var(--bg-root)', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spinner" style={{ width: 40, height: 40, borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (!authenticated) return <LandingPage />;

  return (
    <CurrencyProvider>
      <div className="app-layout">
        <TourGuide />

        <Sidebar
          activeTab={activeTab}
          setActiveTab={(t) => { setActiveTab(t); setSelectedPlan(null); setShowSettings(false); }}
        />

        <div className="main-container">
          <header className="top-header">
            <div style={{ flex: 1 }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {/* Tour button removed as per UI feedback */}
              <button className="btn-icon" onClick={toggleTheme} style={{ flexShrink: 0 }} title="Toggle Theme">
                <Icon name={theme === 'light' ? 'dark_mode' : 'light_mode'} size={20} />
              </button>
              <NotificationCenter
                notifications={notifications}
                onClear={clearNotifications}
                onMarkAsRead={markNotificationAsRead}
              />
              
              <div style={{ position: 'relative' }} ref={dropdownRef}>
                <div
                  className="btn-icon"
                  id="user-wallet-dropdown"
                  style={{ width: 'auto', padding: '0 0.75rem', gap: '0.5rem', cursor: 'pointer', background: showDropdown ? 'var(--bg-card-hover)' : 'var(--bg-card)' }}
                  onClick={() => setShowDropdown(!showDropdown)}
                >
                  <Icon name="account_circle" size={20} color="var(--accent-primary)" />
                  <span className="wallet-address-text" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {address ? `${address.slice(0, 4)}...${address.slice(-4)}` : 'Guest'}
                  </span>
                  <Icon name={showDropdown ? 'expand_less' : 'expand_more'} size={18} />
                </div>

                {showDropdown && (
                  <div style={{
                    position: 'absolute', top: '110%', right: 0, width: '220px',
                    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                    borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                    overflow: 'hidden', zIndex: 200, display: 'flex', flexDirection: 'column'
                  }}>
                    <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Connected Wallet</div>
                      <div style={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {address ? `${address.slice(0, 10)}...${address.slice(-6)}` : 'No wallet'}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => { setShowSettings(true); setShowDropdown(false); setSelectedPlan(null); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1rem', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, textAlign: 'left' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-input)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Icon name="settings" size={18} /> Settings & Profile
                    </button>

                    <button
                      onClick={logout}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem 1rem', background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, borderTop: '1px solid var(--border-subtle)', textAlign: 'left' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-input)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Icon name="power_settings_new" size={18} /> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Recent Toast Notification */}
          {notifications.length > 0 && !notifications[0].read && (
            <div style={{
              padding: '0.875rem 1.5rem',
              marginBottom: '1rem',
              borderRadius: 10,
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              animation: 'slideDown 0.3s ease-out',
              background: notifications[0].type === 'success' 
                ? 'rgba(16, 217, 160, 0.1)' 
                : notifications[0].type === 'error'
                ? 'rgba(239, 68, 68, 0.1)'
                : notifications[0].type === 'update'
                ? 'rgba(245, 158, 11, 0.1)'
                : 'rgba(59, 130, 246, 0.1)',
              border: `1px solid ${
                notifications[0].type === 'success'
                ? 'rgba(16, 217, 160, 0.3)'
                : notifications[0].type === 'error'
                ? 'rgba(239, 68, 68, 0.3)'
                : notifications[0].type === 'update'
                ? 'rgba(245, 158, 11, 0.3)'
                : 'rgba(59, 130, 246, 0.3)'
              }`,
              color: notifications[0].type === 'success'
                ? '#10d9a0'
                : notifications[0].type === 'error'
                ? '#ef4444'
                : notifications[0].type === 'update'
                ? '#f59e0b'
                : '#3b82f6',
            }}>
              <Icon 
                name={notifications[0].type === 'success' ? 'check_circle' : notifications[0].type === 'error' ? 'error' : notifications[0].type === 'update' ? 'info' : 'notification_important'} 
                size={18}
              />
              <span style={{ flex: 1 }}>{notifications[0].message}</span>
              {notifications[0].action && (
                <button
                  className="btn-text"
                  onClick={notifications[0].action.onClick}
                  style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', color: 'inherit', opacity: 0.8 }}
                >
                  {notifications[0].action.label}
                </button>
              )}
            </div>
          )}

          <main className="scroll-content">
            {profileUsername ? (
              <UserProfile
                username={profileUsername}
                currentUserPrivy_id={privy_id}
                onClose={closeUserProfile}
              />
            ) : showSettings ? (
              <WalletManager onClose={() => setShowSettings(false)} />
            ) : selectedPlan ? (
              <SharedVault
                plan={selectedPlan}
                wallet={wallet}
                onBack={() => setSelectedPlan(null)}
                onUpdatePlan={updatePlan}
                />
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <div id="dashboard-summary">
                    <Dashboard
                      plans={plans}
                      onCreatePlan={() => setShowCreateModal(true)}
                      onSelectPlan={setSelectedPlan}
                      onDepositNative={() => setShowReceiveModal(true)}
                      onUpdatePlan={updatePlan}
                      onGoToStore={() => setActiveTab('yield')}
                      onSend={() => setShowSendModal(true)}
                      onReceive={() => setShowCryptoReceiveModal(true)}
                      onSwap={() => setActiveTab('swap')}
                      onGoToPlans={() => setActiveTab('plans')}
                      walletBalances={walletBalances}
                      balancesLoading={balancesLoading}
                      recentActivity={recentActivity}
                      displayName={displayName}
                    />
                  </div>
                )}
                {activeTab === 'plans' && (
                  <PlansPage
                    plans={plans}
                    onCreatePlan={() => setShowCreateModal(true)}
                    onSelectPlan={setSelectedPlan}
                    onDeposit={setShowDepositModal}
                  />
                )}
                {activeTab === 'swap' && (
                  <SwapPage
                    plans={plans}
                    wallet={wallet}
                    walletBalances={walletBalances}
                    onSwapComplete={(txHash, chain, fromToken, toToken, amount) => {
                      addRecentActivity({
                        id: `swap_${Date.now()}`,
                        name: `Swap ${fromToken} to ${toToken}`,
                        amount: -amount,
                        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                        icon: 'swap_horiz',
                        txHash,
                        chainId: chainIdMap[chain],
                        chain,
                      });
                    }}
                    />
                )}
                {activeTab === 'yield' && (
                  <YieldDashboard plans={plans} wallet={wallet} />
                )}
                {activeTab === 'referrals' && (
                  <ReferralsPage plans={plans} userAddress={address} username={user?.id || ''} />
                )}
                {activeTab === 'leaderboard' && (
                  <LeaderboardPage currentUsername={profileUsername || undefined} />
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {showCreateModal && (
        <CreatePlanModal
          onClose={() => setShowCreateModal(false)}
          onCreated={addPlan}
          privy_id={privy_id}
          walletBalances={walletBalances}
          walletAddress={address}
          wallet={wallet}
          />
      )}
      {showDepositModal && (
        <DepositModal
          plan={showDepositModal}
          wallet={wallet}
          onClose={() => setShowDepositModal(null)}
          onDeposited={handleDeposit}
          />
      )}
      {showSendModal && (
        <SendModal
          onClose={() => setShowSendModal(false)}
          onSent={(amount, recipient, txHash, chain, token) => {
            console.log(`Sent ${amount} to ${recipient}`);
            if (chain && token) {
              addRecentActivity({
                id: `send_${Date.now()}`,
                name: `Send ${token} to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`,
                amount: -amount,
                date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                icon: 'send',
                txHash,
                chainId: chainIdMap[chain],
                chain,
              });
            }
          }}
          walletBalances={walletBalances}
          walletAddress={address}
          wallet={wallet}
          />
      )}
      {showReceiveModal && (
        <ReceiveModal
          onClose={() => setShowReceiveModal(false)}
          walletAddress={address}
          displayName={displayName || 'User'}
          />
      )}
      {showCryptoReceiveModal && (
        <CryptoReceiveModal
          onClose={() => setShowCryptoReceiveModal(false)}
          walletAddress={address}
          />
      )}
    </CurrencyProvider>
  );
}

export default App;
