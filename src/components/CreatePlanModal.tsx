import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import type { SavingsPlan, PlanCategory, PlanType, TokenSymbol, ChainName } from '../types';
import { CATEGORIES, TOKENS, CHAINS } from '../types';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { API_BASE } from '../services/api';

interface Props {
  onClose: () => void;
  onCreated: (plan: SavingsPlan) => Promise<void> | void;
  privy_id?: string;
  isDemo?: boolean;
  walletBalances?: Array<{ chain: string; token: string; balance: number; usdValue: number }>;
  walletAddress?: string;
  wallet?: any;
  onDemoTransaction?: (payload: {
    type: 'plan_create' | 'deposit';
    chain: string;
    token: string;
    amount: number;
    meta?: Record<string, any>;
  }) => Promise<void> | void;
}

type Step = 'type' | 'category' | 'chain' | 'details' | 'partner' | 'warning' | 'policy' | 'success';

function genId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export function CreatePlanModal({ onClose, onCreated, privy_id, isDemo, walletBalances, walletAddress, wallet, onDemoTransaction }: Props) {
  const authFetch = useAuthFetch();
  const [step, setStep] = useState<Step>('type');
  const [planType, setPlanType] = useState<PlanType>('individual');
  const [category, setCategory] = useState<PlanCategory>('academics');
  const [chain, setChain] = useState<ChainName>('ethereum');
  const [name, setName] = useState('');
  const [token, setToken] = useState<TokenSymbol>('USDC');
  const [target, setTarget] = useState(''); // We'll keep the state variable but repurpose it functionally as depositAmount
  const [partnerAddress, setPartnerAddress] = useState('');
  
  // New Fields
  const [lockDurationDays, setLockDurationDays] = useState<number>(30);
  const [depositToDefi, setDepositToDefi] = useState<boolean>(true);
  const [policyAgreed, setPolicyAgreed] = useState<boolean>(false);
  const [sharedOnX, setSharedOnX] = useState<boolean>(false);
  const [liveApy, setLiveApy] = useState<number>(0);
  const [demoError, setDemoError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [poolLabel, setPoolLabel] = useState('');
  const [supportedTokens, setSupportedTokens] = useState<string[]>([]);
  const [supportedTokensLoading, setSupportedTokensLoading] = useState(false);

  const chainIdMap: Record<ChainName, number> = {
    ethereum: 1,
    base: 8453,
    arbitrum: 42161,
  };

  // Fetch live APY from best vault
  useEffect(() => {
    const fetchApy = async () => {
      try {
        const params = new URLSearchParams({ token, chainId: String(chainIdMap[chain]) });
        const res = await fetch(`${API_BASE}/api/earn/best-vault?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setLiveApy(data.vault?.apy?.total || 0);
        } else {
          setLiveApy(0);
        }
      } catch { /* fallback to 0 */ }
    };
    fetchApy();
  }, [token, chain]);

  useEffect(() => {
    const fetchSupportedTokens = async () => {
      setSupportedTokensLoading(true);
      try {
        const chainId = chainIdMap[chain];
        const res = await fetch(`${API_BASE}/api/earn/supported-tokens?chainId=${chainId}`);
        if (res.ok) {
          const data = await res.json();
          const tokens = data?.chains?.[String(chainId)] || [];
          setSupportedTokens(tokens.map((t: string) => t.toUpperCase()));
        } else {
          setSupportedTokens([]);
        }
      } catch {
        setSupportedTokens([]);
      } finally {
        setSupportedTokensLoading(false);
      }
    };
    fetchSupportedTokens();
  }, [chain]);

  const steps: Step[] = planType === 'joint' 
    ? ['type', 'category', 'chain', 'details', 'partner', 'warning', 'policy', 'success']
    : ['type', 'category', 'chain', 'details', 'warning', 'policy', 'success'];
  
  const stepIndex = steps.indexOf(step);
  const catConfig = CATEGORIES.find(c => c.value === category)!;
  const parsedTarget = parseFloat(target);
  const availableBalance = walletBalances
    ? walletBalances.find(b => b.chain === chain && b.token === token)?.balance ?? null
    : null;
  const hasInsufficientBalance = !Number.isNaN(parsedTarget)
    && parsedTarget > 0
    && availableBalance !== null
    && parsedTarget > availableBalance;

  const isEvmAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value);

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      setDemoError('');
      
      const depositAmount = parseFloat(target) || 0;
      if (depositAmount <= 0) {
        throw new Error('Initial deposit amount must be greater than 0');
      }

      if (!name.trim()) {
        throw new Error('Vault name is required');
      }

      if (planType === 'joint' && !partnerAddress) {
        throw new Error('Select a partner for a joint vault');
      }

      if (planType === 'joint' && !isEvmAddress(partnerAddress)) {
        throw new Error('Enter a valid partner wallet address');
      }

      if (walletAddress && partnerAddress && walletAddress.toLowerCase() === partnerAddress.toLowerCase()) {
        throw new Error('Partner address must be different from your address');
      }

      if (availableBalance !== null && depositAmount > availableBalance) {
        throw new Error('Insufficient balance for this deposit');
      }

      if (!wallet) {
        throw new Error('No wallet connected. Please log in to create a plan.');
      }

      if (depositToDefi && supportedTokens.length > 0 && !supportedTokens.includes(token)) {
        throw new Error(`No DeFi vault supports ${token} on ${chain}. Supported: ${supportedTokens.join(', ')}`);
      }

      const { depositToPool, depositToTreasury } = await import('../services/chainService');
      
      let finalApy = 0;
      let defiProtocol = undefined;
      let defiVaultName = undefined;
      let defiChainId = undefined;
      let defiVaultAddress = undefined;
      let creationTxHash = undefined;
      let creationChainId = undefined;
      
      // Execute the blockchain transaction first!
      if (depositToDefi) {
        const result = await depositToPool(
          wallet,
          token as any, // TypeScript expects SupportedToken structure
          target, // use the string amount
          chain as any
        );
        finalApy = result.apy;
        defiProtocol = result.protocol;
        defiVaultName = result.vaultName;
        defiChainId = result.chainId;
        defiVaultAddress = result.vaultAddress;
        creationTxHash = result.txHash;
        creationChainId = result.chainId || chainIdMap[chain];
        setPoolLabel(result.vaultName ? `${result.protocol || 'LI.FI'} · ${result.vaultName}` : (result.protocol || 'LI.FI Best Vault'));
      } else {
        const result = await depositToTreasury(
          wallet,
          token as any,
          target,
           chain as any
        );
        creationTxHash = result.txHash;
        creationChainId = chainIdMap[chain];
        setPoolLabel('Equilibria Treasury');
      }

      const wDate = new Date();
      wDate.setDate(wDate.getDate() + lockDurationDays);

      const plan: SavingsPlan = {
        id: genId(),
        name: name.trim(),
        category,
        type: planType,
        token,
        chain,
        targetAmount: depositAmount,
        currentAmount: depositAmount,
        myContribution: depositAmount,
        partnerContribution: 0,
        yieldEarned: 0,
        apy: depositToDefi ? (finalApy || liveApy) : 0,
        createdAt: new Date().toISOString(),
        lockDurationDays,
        withdrawalDate: wDate.toISOString(),
        depositToDefi,
        policyAgreed,
        sharedOnX,
        defiProtocol,
        defiVaultName,
        defiChainId,
        defiVaultAddress,
        partnerAddress: planType === 'joint' ? partnerAddress : undefined,
        isPartnerAccepted: planType === 'joint' ? false : undefined,
        creationTxHash,
        creationChainId,
      };

      await onCreated(plan);

      // Reward points for creating a plan
      if (walletAddress) {
        authFetch(`${API_BASE}/api/users/${walletAddress}/points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: 100, reason: 'Created new savings plan', address: walletAddress }),
        }).catch(err => console.error('Failed to reward points for plan creation:', err));
        
        // Also reward points for deposit
        authFetch(`${API_BASE}/api/users/${walletAddress}/points`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ points: depositAmount * 10, reason: 'Initial Deposit', address: walletAddress }),
        }).catch(err => console.error('Failed to reward points for deposit:', err));
      }
      
      setStep('success');
    } catch (error: any) {
      console.error('Plan creation failed:', error);
      setDemoError(error?.message || 'Transaction failed. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleShareOnX = async () => {
    const text = `I just started saving for "${name}" on Equilibria! The ultimate multi-chain vault with auto-yield. Let's get these goals! 🚀💸 #Equilibria #Savings`;
    window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    setSharedOnX(true);

    if (walletAddress) {
      try {
        await authFetch(`${API_BASE}/api/users/${walletAddress}/points`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points: 50, reason: 'Shared plan on X', address: walletAddress }),
        });
      } catch (err) {
        console.error('Failed to update points for sharing:', err);
      }
    }
  };

  const stepLabelMap: Record<Step, string> = {
    type: 'Plan Type',
    category: 'Category',
    chain: 'Blockchain',
    details: 'Details',
    partner: 'Partner',
    warning: 'Rules & Warnings',
    policy: 'Policy Agreement',
    success: 'Success',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
              Step {stepIndex + 1} of {steps.length} — {stepLabelMap[step]}
            </div>
            <div className="modal-title" style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="savings" size={24} />
              Create Savings Plan
            </div>
          </div>
          {step !== 'success' && (
            <button className="modal-close" onClick={onClose}><Icon name="close" size={18} /></button>
          )}
        </div>

        {/* Step progress bar */}
        <div className="wizard-step-bar">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`wizard-step-dot ${i < stepIndex ? 'done' : i === stepIndex ? 'current' : ''}`}
            />
          ))}
        </div>

        {/* ── STEP 1: Type ── */}
        {step === 'type' && (
          <div className="form-section">
            <div className="form-label" style={{ marginBottom: '1.25rem' }}>Choose your savings mode</div>
            <div className="type-toggle">
              {([
                {
                  value: 'individual' as PlanType,
                  icon: '🧑',
                  title: 'Individual',
                  desc: 'Private savings. Fully controlled by you.',
                },
                {
                  value: 'joint' as PlanType,
                  icon: '👥',
                  title: 'Joint Vault',
                  desc: 'Invite a partner. Both manage together.',
                },
              ] as const).map(t => (
                <div
                  key={t.value}
                  className={`type-card ${planType === t.value ? 'selected' : ''}`}
                  onClick={() => setPlanType(t.value)}
                >
                  <div className="type-card-icon">{t.icon}</div>
                  <div className="type-card-title">{t.title}</div>
                  <div className="type-card-desc">{t.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Category ── */}
        {step === 'category' && (
          <div className="form-section">
            <div className="form-label" style={{ marginBottom: '1.25rem' }}>What are you saving for?</div>
            <div className="category-grid">
              {CATEGORIES.map(cat => (
                <div
                  key={cat.value}
                  className={`category-chip ${category === cat.value ? 'selected' : ''}`}
                  style={{ '--chip-color': cat.color } as React.CSSProperties}
                  onClick={() => setCategory(cat.value)}
                >
                  <span className="category-chip-emoji">{cat.emoji}</span>
                  <span className="category-chip-label">{cat.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: Chain Selection ── */}
        {step === 'chain' && (
          <div className="form-section">
            <div className="form-label" style={{ marginBottom: '1.25rem' }}>Select blockchain network</div>
            <div className="chain-grid">
              {CHAINS.map(c => {
                const BADGE_LABELS: Record<string, string> = {
                  ethereum: 'ETH', polygon: 'MATIC', arbitrum: 'ARB',
                  base: 'BASE', optimism: 'OP',
                };
                const BADGE_COLORS: Record<string, string> = {
                  ethereum: '#627eea', polygon: '#8247e5', arbitrum: '#28a0f0',
                  base: '#0052ff', optimism: '#ff0420',
                };
                return (
                  <div
                    key={c.name}
                    className={`chain-chip ${chain === c.name ? 'selected' : ''}`}
                    style={{ '--chain-color': BADGE_COLORS[c.name] } as React.CSSProperties}
                    onClick={() => setChain(c.name)}
                  >
                    <div
                      className="chain-badge"
                      style={{ 
                        background: ['ethereum', 'arbitrum', 'base'].includes(c.name) ? 'transparent' : BADGE_COLORS[c.name],
                        padding: ['ethereum', 'arbitrum', 'base'].includes(c.name) ? 0 : undefined,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: ['ethereum', 'arbitrum', 'base'].includes(c.name) ? '1px solid rgba(0,0,0,0.1)' : 'none'
                      }}
                    >
                      {['ethereum', 'arbitrum', 'base'].includes(c.name) ? (
                        <img src={c.icon} alt={c.label} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        BADGE_LABELS[c.name]
                      )}
                    </div>
                    <div className="chain-chip-label">{c.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── STEP 4: Details ── */}
        {step === 'details' && (
          <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '0.5rem' }}>
            <div className="form-section">
              <label className="form-label">Vault Name</label>
              <input
                className="form-input"
                placeholder={`e.g. ${catConfig.emoji} My ${catConfig.label} Fund`}
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-section">
              <div className="form-label">Stablecoin</div>
              <div className="token-selector">
                {TOKENS.map(tok => (
                  <div
                    key={tok.symbol}
                    className={`token-chip ${token === tok.symbol ? 'selected' : ''}`}
                    style={{ '--tok-color': tok.color } as React.CSSProperties}
                    onClick={() => setToken(tok.symbol)}
                  >
                    <span>{tok.icon}</span>
                    <span>{tok.symbol}</span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '0.6rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {supportedTokensLoading ? (
                  'Checking supported DeFi tokens...'
                ) : supportedTokens.length > 0 ? (
                  <>DeFi supported on {chain}: {supportedTokens.join(', ')}</>
                ) : (
                  'DeFi supported tokens unavailable.'
                )}
              </div>
              {supportedTokens.length > 0 && !supportedTokens.includes(token) && depositToDefi && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--danger)' }}>
                  {token} is not supported for DeFi on {chain}. Choose another token or disable DeFi.
                </div>
              )}
            </div>

            <div className="form-section">
              <label className="form-label">Deposit Amount</label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 100"
                  min="1"
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                  style={{ paddingRight: '3.5rem' }}
                />
                <span style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem' }}>
                  {token}
                </span>
              </div>
                {walletBalances && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Available: {
                    walletBalances
                      .find(b => b.chain === chain && b.token === token)
                      ?.balance.toLocaleString(undefined, { maximumFractionDigits: 4 }) || '0.0000'
                  } {token}
                </div>
              )}
                {hasInsufficientBalance && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--danger)', textAlign: 'right' }}>
                    Insufficient balance for this deposit
                  </div>
                )}
            </div>

            <div className="form-section">
              <label className="form-label">Lock Duration</label>
              {/* Preset chips */}
              <div className="lock-preset-grid" style={{ marginBottom: '1rem' }}>
                {[
                  { label: '1 week',   days: 7 },
                  { label: '1 month',  days: 30 },
                  { label: '3 months', days: 90 },
                  { label: '6 months', days: 180 },
                  { label: '1 year',   days: 365 },
                ].map(opt => (
                  <button
                    key={opt.days}
                    className={`lock-preset-btn ${lockDurationDays === opt.days ? 'selected' : ''}`}
                    onClick={() => setLockDurationDays(opt.days)}
                    type="button"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Custom number input */}
              <div className="input-with-suffix">
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  max="730"
                  value={lockDurationDays}
                  onChange={e => setLockDurationDays(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{ paddingRight: '4rem' }}
                />
                <span className="input-suffix">days</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                Unlocks on {new Date(Date.now() + lockDurationDays * 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-input)', padding: '1.25rem', borderRadius: '12px', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Generate Yield</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Auto-deposit via LI.FI to best vault</div>
              </div>
              <label className="switch">
                <input type="checkbox" checked={depositToDefi} onChange={(e) => setDepositToDefi(e.target.checked)} />
                <span className="slider round"></span>
              </label>
            </div>
          </div>
        )}

        {/* ── STEP 5: Partner Selection (Joint only) ── */}
        {step === 'partner' && planType === 'joint' && (
          <div className="form-section">
            <label className="form-label" style={{ marginBottom: '1.25rem' }}>Select Partner</label>
            <label className="form-label" style={{ fontSize: '0.85rem' }}>Partner Wallet Address</label>
            <input
              className="form-input"
              placeholder="0x..."
              value={partnerAddress}
              onChange={e => setPartnerAddress(e.target.value.trim())}
            />
            {partnerAddress && !isEvmAddress(partnerAddress) && (
              <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--danger)' }}>
                Enter a valid 0x address
              </div>
            )}
            <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Your partner will join using this wallet address. Joint vault withdrawals require both approvals.
            </div>
          </div>
        )}

        {/* ── STEP 6: Warning & Rules ── */}
        {step === 'warning' && (
          <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', color: '#ef4444' }}>
              <Icon name="warning" size={24} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Important Rules</h3>
            </div>
            <ul style={{ paddingLeft: '1.5rem', fontSize: '0.95rem', lineHeight: 1.7, margin: 0, color: 'var(--text-secondary)' }}>
              <li style={{ marginBottom: '0.75rem' }}>Funds are <strong>locked for {lockDurationDays} days</strong> in smart contracts.</li>
              <li style={{ marginBottom: '0.75rem' }}>Early withdrawal incurs a <strong>5% penalty</strong> to reward committed savers.</li>
              {depositToDefi && (
                <li>Your assets will be deployed to audited protocols (Aave, Kamino) for yield. Smart contract risks apply.</li>
              )}
            </ul>
          </div>
        )}

        {/* ── STEP 7: Policy Agreement ── */}
        {step === 'policy' && (
          <div className="form-section">
            <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: 1.7 }}>
              By confirming, you accept that blockchain transactions are final and irreversible. Early withdrawals trigger hard-coded penalties.
            </p>
            <label style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', cursor: 'pointer', padding: '1rem', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '12px' }}>
              <input 
                type="checkbox" 
                checked={policyAgreed} 
                onChange={(e) => setPolicyAgreed(e.target.checked)} 
                style={{ width: 20, height: 20, marginTop: '2px', cursor: 'pointer', accentColor: 'var(--accent-primary)' }}
              />
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                I understand the 5% penalty terms, multi-chain vault mechanics, and DeFi risks.
              </span>
            </label>
          </div>
        )}

        {/* ── STEP 8: Success & Sharing ── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1.25rem' }}>
              <Icon name="check_circle" size={56} color="var(--success)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>Vault Ready!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', lineHeight: 1.6, fontSize: '0.95rem' }}>
              Your savings plan is all set. Share on X to earn <strong>bonus points</strong>!
            </p>

            <div style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '0.9rem 1rem',
              marginBottom: '1rem',
              textAlign: 'left',
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.35rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Deposit Pool
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {poolLabel || (depositToDefi ? 'LI.FI Best Vault' : 'Equilibria Treasury')}
              </div>
            </div>

            <button 
              className="btn-primary" 
              style={{ width: '100%', marginBottom: '0.75rem', background: '#000', color: '#fff', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              onClick={handleShareOnX}
            >
              <Icon name="x-twitter" size={18} /> Share on X & Earn Bonus
            </button>
            <button 
              className="btn-primary"
              style={{ width: '100%', background: 'var(--accent-primary)' }}
              onClick={onClose}
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Navigation Buttons */}
        {step !== 'success' && (
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '2rem' }}>
            {stepIndex > 0 && (
              <button
                className="btn-secondary"
                style={{ flex: 1, background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
                onClick={() => setStep(steps[stepIndex - 1])}
              >
                <Icon name="chevron_left" size={16} />
                Back
              </button>
            )}
            
            {step === 'policy' ? (
              <div style={{ flex: 1 }}>
                {demoError && (
                  <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                    {demoError}
                  </div>
                )}
                <button
                  className="btn-primary"
                  style={{ width: '100%', background: 'var(--accent-primary)', color: 'white', border: 'none' }}
                  onClick={handleCreate}
                  disabled={!policyAgreed || isCreating}
                >
                  {isCreating ? (
                    <>
                      <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      Deploying Funds...
                    </>
                  ) : (
                    'Create Vault & Deposit'
                  )}
                </button>
              </div>
            ) : (
              <button
                className="btn-primary"
                style={{ flex: 1, background: 'var(--accent-primary)', color: 'white', border: 'none' }}
                onClick={() => setStep(steps[stepIndex + 1])}
                disabled={
                  (step === 'details' && (!name.trim() || !target || parseFloat(target) <= 0)) ||
                  (step === 'details' && hasInsufficientBalance) ||
                  (step === 'partner' && (!partnerAddress || !isEvmAddress(partnerAddress)))
                }
              >
                Next
                <Icon name="chevron_right" size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
