import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import type { SavingsPlan } from '../types';
import { CATEGORIES } from '../types';
import { useCurrency } from '../context/CurrencyContext';

interface Props {
  plans: SavingsPlan[];
  onCreatePlan: () => void;
  onSelectPlan: (plan: SavingsPlan) => void;
  onDepositNative?: () => void;
  onUpdatePlan?: (plan: SavingsPlan) => void;
  onGoToPlans?: () => void;
  onGoToStore?: () => void;
  onSend?: () => void;
  onReceive?: () => void;
  onSwap?: () => void;
  isDemo?: boolean;
  walletBalances?: Array<{ chain: string; token: string; balance: number; usdValue: number }>;
  balancesLoading?: boolean;
  recentActivity?: Array<{ id: string; name: string; amount: number; date: string; icon: string; txHash?: string; chainId?: number; chain?: string }>;
}



export function Dashboard({ plans, onCreatePlan, onSelectPlan, onGoToPlans, onGoToStore, onSend, onReceive, onSwap, onDepositNative, isDemo, walletBalances, balancesLoading, recentActivity }: Props) {
  const [counter, setCounter] = useState(0);
  const [statsTab, setStatsTab] = useState<'weekly' | 'monthly'>('weekly');
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');
  const [showHoldings, setShowHoldings] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [selectedChain, setSelectedChain] = useState<'Ethereum' | 'Base' | 'Arbitrum'>('Base');
  const { format, selectedCurrency, setSelectedCurrency } = useCurrency();

  const tokenColors: Record<string, string> = {
    ETH: '#627eea',
    USDC: '#2775ca',
    USDT: '#26a17b',
  };

  const chainKeyMap: Record<'Ethereum' | 'Base' | 'Arbitrum', string> = {
    Ethereum: 'ethereum',
    Base: 'base',
    Arbitrum: 'arbitrum',
  };

  const HOLDINGS: Record<'Ethereum' | 'Base' | 'Arbitrum', { token: string; amount: number; price: number; color: string }[]> = {
    Ethereum: [],
    Base: [],
    Arbitrum: [],
  };

  if (walletBalances && walletBalances.length > 0) {
    for (const chain of Object.keys(HOLDINGS) as Array<'Ethereum' | 'Base' | 'Arbitrum'>) {
      const chainKey = chainKeyMap[chain];
      const rows = walletBalances.filter((row) => row.chain === chainKey && row.balance > 0);
      HOLDINGS[chain] = rows.map((row) => ({
        token: row.token,
        amount: row.balance,
        price: row.balance > 0 ? row.usdValue / row.balance : 0,
        color: tokenColors[row.token] || '#94a3b8',
      }));
    }
  }

  useEffect(() => {
    const interval = setInterval(() => setCounter(c => c + 1), 2500);
    return () => clearInterval(interval);
  }, []);

  const totalSaved = walletBalances
    ? walletBalances.reduce((a, row) => a + (row.usdValue || 0), 0)
    : plans.reduce((a, p) => a + p.currentAmount, 0);
  const baseYield = plans.reduce((a, p) => a + p.yieldEarned, 0);
  const activeEarningCount = plans.filter(p => p.depositToDefi).length;
  const liveYield = baseYield + (activeEarningCount * counter * 0.000001);

  const displayName = localStorage.getItem('equilibria_display_name') || 'User';

  const handleSend = () => {
    onSend?.();
  };

  const handleReceive = () => {
    onReceive?.();
  };

  const handleSwap = () => {
    onSwap?.();
  };

  const fallbackActivity = plans
    .filter(p => p.currentAmount > 0)
    .map(p => ({
      id: p.id,
      name: `Deposit to "${p.name}"`,
      amount: p.currentAmount,
      date: new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      icon: 'savings',
      txHash: p.creationTxHash,
      chainId: p.creationChainId,
      chain: p.chain,
    }))
    .slice(0, 5);

  const activityItems = recentActivity && recentActivity.length > 0 ? recentActivity : fallbackActivity;

  const getExplorerBase = (chainId?: number, chain?: string) => {
    const byChainId: Record<number, string> = {
      1: 'https://etherscan.io/tx/',
      8453: 'https://basescan.org/tx/',
      42161: 'https://arbiscan.io/tx/',
      56: 'https://bscscan.com/tx/',
    };
    if (chainId && byChainId[chainId]) return byChainId[chainId];

    const key = (chain || '').toLowerCase();
    if (key === 'ethereum') return byChainId[1];
    if (key === 'base') return byChainId[8453];
    if (key === 'arbitrum') return byChainId[42161];
    if (key === 'bnb') return byChainId[56];
    return byChainId[8453];
  };

  const chartData = statsTab === 'weekly'
    ? [40, 70, 45, 90, 65, 80, 55]
    : [65, 55, 80, 70, 90, 60, 85];
  const chartLabels = statsTab === 'weekly'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7'];

  const handlePlanClick = (plan: SavingsPlan) => {
    if (onSelectPlan) {
      onSelectPlan(plan);
    }
  };

  return (
    <div>
      <div className="greeting-section">
        <h1 className="greeting-title">Hello, {displayName}! 👋</h1>
        <p className="greeting-sub">Here's everything about your Equilibria account.</p>
      </div>

      <div className="dashboard-grid">
        {/* ── LEFT COLUMN ── */}
        <div>
          {/* Balance Card - clean layout */}
          <div className="balance-card">
            {/* Header row: label + top right controls */}
            <div className="balance-card-header">
              <div>
                <div className="balance-label">Total Portfolio Balance</div>
                {/* Chain filter moved inside View Holdings section */}
                <div className="balance-amount">{format(totalSaved)}</div>
                <div className="balance-subtext">
                  +${liveYield.toFixed(2)} yield earned
                </div>
              </div>

              {/* Top Right Controls */}
              <div className="balance-card-top-actions">
                <div className="currency-selector-container">
                  <button 
                    className="currency-selector-button"
                    onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                  >
                    <span>{selectedCurrency}</span>
                    <Icon name="expand_more" size={14} />
                  </button>
                  
                  {currencyDropdownOpen && (
                    <div className="currency-dropdown-menu">
                      {(['USD', 'NGN', 'EUR', 'GBP', 'KES'] as const).map(code => (
                        <button
                          key={code}
                          className={`currency-dropdown-item ${selectedCurrency === code ? 'active' : ''}`}
                          onClick={() => {
                            setSelectedCurrency(code);
                            setCurrencyDropdownOpen(false);
                          }}
                        >
                          {code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* View Holdings Toggle */}
            <button 
              onClick={() => setShowHoldings(!showHoldings)}
              style={{
                background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white',
                padding: '0.4rem 0.8rem', borderRadius: '8px', fontSize: '0.75rem',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                marginTop: '-0.5rem', marginBottom: '1rem', transition: 'background 0.2s'
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            >
              <Icon name={showHoldings ? 'visibility_off' : 'visibility'} size={14} />
              {showHoldings ? 'Hide Holdings' : 'View Holdings'}
            </button>

            {showHoldings && (
              <div style={{
                background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '0.8rem',
                marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'
              }}>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  {(['Ethereum', 'Base', 'Arbitrum'] as const).map(chain => (
                    <button
                      key={chain}
                      onClick={() => setSelectedChain(chain)}
                      style={{
                        background: selectedChain === chain ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'white',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '6px',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {chain}
                    </button>
                  ))}
                </div>
                {balancesLoading && isDemo && (
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                    Loading demo balances...
                  </div>
                )}
                {!balancesLoading && HOLDINGS[selectedChain].length === 0 && (
                  <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
                    No holdings on this chain.
                  </div>
                )}
                {HOLDINGS[selectedChain].map(h => (
                  <div key={h.token} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: h.color }} />
                      <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.82rem', fontWeight: 600 }}>{h.token}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: 700 }}>{h.amount} {h.token}</div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem' }}>${(h.amount * h.price).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Divider */}
            <div className="balance-divider" />

            {/* Action buttons */}
            <div className="balance-actions">
              {[
                { icon: 'send',             label: 'Send',    action: handleSend },
                { icon: 'arrow_circle_down',label: 'Receive', action: handleReceive },
                { icon: 'swap_horiz',       label: 'Swap',    action: handleSwap },
                { icon: 'add_circle',       label: 'Top Up',  action: onDepositNative },
              ].map(btn => (
                <button
                  key={btn.label}
                  className="btn-white"
                  onClick={btn.action}
                  title={btn.label}
                >
                  <Icon name={btn.icon} size={18} color="white" />
                  <span>{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Transfer */}
          <div className="section-header">
            <h3 className="section-title">Quick Transfer</h3>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            <div style={{ textAlign: 'center', cursor: 'pointer', flexShrink: 0 }} onClick={handleSend}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--bg-input)', border: '2px dashed var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem' }}>
                <Icon name="add" size={22} color="var(--text-muted)" />
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>Send</div>
            </div>
            <div style={{ textAlign: 'center', cursor: 'pointer', flexShrink: 0, opacity: 0.5 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.4rem' }}>
                <Icon name="people" size={20} color="var(--text-muted)" />
              </div>
              <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>No contacts yet</div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="section-header">
            <h3 className="section-title">Recent Activity</h3>
          </div>
          <div className="tx-list">
            {activityItems.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <Icon name="receipt_long" size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
                <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>No activity yet</div>
                <div style={{ fontSize: '0.8rem' }}>Your deposits and transactions will appear here.</div>
              </div>
            ) : (
              activityItems.map(tx => (
                <div key={tx.id} className="tx-item">
                  <div className="tx-icon"><Icon name={tx.icon} size={20} /></div>
                  <div className="tx-info">
                    <div className="tx-name">{tx.name}</div>
                    <div className="tx-date">{tx.date}</div>
                    {tx.txHash && (
                      <a
                        href={`${getExplorerBase(tx.chainId, tx.chain)}${tx.txHash}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', textDecoration: 'none' }}
                      >
                        Tx {tx.txHash.slice(0, 6)}...{tx.txHash.slice(-4)}
                      </a>
                    )}
                  </div>
                  <div className={`tx-amount ${tx.amount < 0 ? 'tx-negative' : 'tx-positive'}`}>
                    {tx.amount < 0 ? '-' : '+'}{format(Math.abs(tx.amount))}
                  </div>
                </div>
              ))
            )}
            
            <button 
              className="btn-white"
              style={{ width: '100%', fontSize: '0.8rem', padding: '0.65rem' }}
              onClick={onGoToStore}
            >
              View More Activities
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div>
          {/* Plans section header */}
          <div className="section-header" id="plans-create-btn">
            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="account_balance_wallet" size={18} color="var(--accent-primary)" />
              Savings Plans
            </h3>
            <button className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }} onClick={onCreatePlan}>
              <Icon name="add" size={16} />
              Create Plan
            </button>
          </div>

        

          {/* Plan title cards — minimal, click goes to My Plans */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {plans.slice(0, 3).map((plan) => {
              const cat = CATEGORIES.find(c => c.value === plan.category);
              const progress = plan.targetAmount > 0
                ? Math.min((plan.currentAmount / plan.targetAmount) * 100, 100)
                : 0;
              const isJoint = plan.type === 'joint';
              const liveYieldPlan = plan.yieldEarned + (plan.depositToDefi ? counter * 0.000001 : 0);

              return (
                <div
                  key={plan.id}
                  onClick={() => handlePlanClick(plan)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
                    borderRadius: 14, padding: '0.9rem 1.1rem',
                    cursor: 'pointer', transition: 'all 0.2s ease',
                    boxShadow: 'var(--shadow-card)',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-active)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  }}
                >
                  {/* Category icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: isJoint ? 'rgba(167,139,250,0.1)' : 'rgba(255,140,0,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon name={cat?.iconName ?? 'savings'} size={20} color={isJoint ? '#a78bfa' : 'var(--accent-primary)'} />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.2 }}>{plan.name}</span>
                      <span style={{
                        background: isJoint ? 'rgba(167,139,250,0.12)' : 'rgba(255,140,0,0.1)',
                        color: isJoint ? '#a78bfa' : 'var(--accent-primary)', fontSize: '0.55rem',
                        padding: '0.15rem 0.35rem', borderRadius: '4px', fontWeight: 800, width: 'fit-content',
                        textTransform: 'uppercase', letterSpacing: '0.5px'
                      }}>
                        {isJoint ? 'Joint' : 'Private'}
                      </span>
                    </div>
                    {/* Standard progress */}
                    <div className="plan-progress-track" aria-label={`${plan.name} progress`}>
                      <div
                        className="plan-progress-fill"
                        style={{ width: `${progress}%`, background: isJoint ? '#a78bfa' : 'var(--accent-primary)' }}
                      />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {progress.toFixed(0)}% of {plan.targetAmount.toLocaleString()} {plan.token}
                    </div>
                  </div>

                  {/* Yield + chevron */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--success)' }}>
                      +{liveYieldPlan.toFixed(3)}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{plan.token}</div>
                  </div>
                  <Icon name="chevron_right" size={18} color="var(--text-muted)" />
                </div>
              );
            })}
          </div>

          {/* View all link */}
          <button
            onClick={onGoToPlans}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.4rem', padding: '0.65rem', background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)', borderRadius: 12,
              fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)',
              cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '2rem',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--accent-primary)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-active)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
            }}
          >
            <Icon name="list" size={16} />
            View All Plans
            <Icon name="arrow_forward" size={15} />
          </button>

          <button
            onClick={onGoToStore}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.4rem', padding: '0.85rem', background: 'var(--accent-dim)',
              border: '1px solid var(--border-active)', borderRadius: 12,
              fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-primary)',
              cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '2rem',
            }}
          >
            <Icon name="bolt" size={18} />
            Explore Yield Opportunities
            <Icon name="arrow_forward" size={15} />
          </button>

          {/* Statistics */}
          <div className="section-header">
            <h3 className="section-title">Statistics</h3>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 10, padding: '3px' }}>
                {(['weekly', 'monthly'] as const).map(t => (
                  <button key={t} onClick={() => setStatsTab(t)}
                    style={{
                      padding: '0.3rem 0.9rem', borderRadius: 8, border: 'none', fontWeight: 600,
                      fontSize: '0.78rem', cursor: 'pointer',
                      background: statsTab === t ? 'var(--accent-primary)' : 'transparent',
                      color: statsTab === t ? 'white' : 'var(--text-muted)', transition: 'all 0.2s ease',
                    }}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 10, padding: '3px' }}>
                <button onClick={() => setChartType('bar')}
                  style={{
                    padding: '0.3rem 0.6rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: chartType === 'bar' ? 'var(--bg-card)' : 'transparent',
                    color: chartType === 'bar' ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'all 0.2s ease',
                  }}
                  title="Bar Chart"
                >
                  <Icon name="bar_chart" size={16} />
                </button>
                <button onClick={() => setChartType('line')}
                  style={{
                    padding: '0.3rem 0.6rem', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: chartType === 'line' ? 'var(--bg-card)' : 'transparent',
                    color: chartType === 'line' ? 'var(--text-primary)' : 'var(--text-muted)', transition: 'all 0.2s ease',
                  }}
                  title="Line Chart"
                >
                  <Icon name="show_chart" size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <div>
                <div className="card-label">Yield {statsTab === 'weekly' ? 'This Week' : 'This Month'}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  +{format(liveYield * (statsTab === 'weekly' ? 0.8 : 1))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--accent-primary)' }} /> Yield
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <div style={{ width: 9, height: 9, borderRadius: 3, background: 'var(--bg-input)' }} /> Expenses
                </div>
              </div>
            </div>
            <div className="chart-mock" style={{ position: 'relative' }}>
              {chartType === 'bar' ? (
                chartData.map((h, i) => (
                  <div key={i}
                    className={`chart-bar ${i === Math.floor(chartData.length / 2) ? 'active' : ''}`}
                    style={{ height: `${h}%`, transition: 'height 0.5s ease' }}
                  />
                ))
              ) : (
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polyline 
                    points={chartData.map((h, i) => `${(i / (chartData.length - 1)) * 100},${100 - h}`).join(' ')}
                    fill="none" stroke="var(--accent-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" 
                  />
                  <polygon 
                    points={`0,100 ${chartData.map((h, i) => `${(i / (chartData.length - 1)) * 100},${100 - h}`).join(' ')} 100,100`}
                    fill="url(#lineGrad)" 
                  />
                  {chartData.map((h, i) => (
                     <circle key={i} cx={(i / (chartData.length - 1)) * 100} cy={100 - h} r="2.5" fill="var(--bg-card)" stroke="var(--accent-primary)" strokeWidth="1.5" />
                  ))}
                </svg>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {chartLabels.map(l => <span key={l}>{l}</span>)}
            </div>
            {activeEarningCount > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.1rem',
                padding: '0.65rem 0.85rem', background: 'var(--accent-dim)', borderRadius: 10,
                fontSize: '0.78rem', color: 'var(--accent-primary)', fontWeight: 600,
              }}>
                <Icon name="bolt" size={15} />
                {activeEarningCount} plan{activeEarningCount > 1 ? 's' : ''} actively earning rewards
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
