/**
 * YieldDashboard.tsx
 * Displays live DeFi yield pools fetched from our LI.FI backend proxy.
 * Pools are clickable and redirect to the official protocol page.
 */
import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import type { SavingsPlan } from '../types';
import { CATEGORIES, TOKEN_COLOR } from '../types';
import { API_BASE } from '../services/api';

interface Props {
  plans: SavingsPlan[];
  wallet: any;
}

interface LivePool {
  name: string;
  protocol: string;
  protocolUrl: string;
  network: string;
  chainId: number;
  token: string;
  apyTotal: number;
  apyBase: number;
  apyReward: number;
  tvlUsd: string;
  tags: string[];
}

const CHAIN_COLORS: Record<string, string> = {
  Base: '#0052ff', Arbitrum: '#28a0f0', Ethereum: '#627eea',
  'BNB Chain': '#f0b90b', 'OP Mainnet': '#ff0420', Polygon: '#8247e5',
  Scroll: '#ffcc3f', Linea: '#61dfff', Sonic: '#14f195',
};

const CHAIN_LOGOS: Record<string, string> = {
  Base: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/base.svg',
  Arbitrum: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/arbitrum.svg',
  Ethereum: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/ethereum.svg',
  'BNB Chain': 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/bsc.svg',
  'OP Mainnet': 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/optimism.svg',
  Polygon: 'https://raw.githubusercontent.com/lifinance/types/main/src/assets/icons/chains/polygon.svg',
};

export function YieldDashboard({ plans, wallet: _wallet }: Props) {
  const [counter, setCounter] = useState(0);
  const [livePools, setLivePools] = useState<LivePool[]>([]);
  const [poolsLoading, setPoolsLoading] = useState(true);

  const activePlans = plans.filter(p => p.depositToDefi && p.currentAmount > 0);
  const totalYield = plans.reduce((a, p) => a + p.yieldEarned, 0);
  const totalDeposited = activePlans.reduce((a, p) => a + p.currentAmount, 0);

  useEffect(() => {
    const interval = setInterval(() => setCounter(c => c + 1), 3000);
    return () => clearInterval(interval);
  }, []);

  // Fetch live vaults from LI.FI via our backend
  useEffect(() => {
    const fetchPools = async () => {
      try {
        // Fetch from Base, Arbitrum, and Ethereum
        const [baseRes, arbRes, ethRes] = await Promise.all([
          fetch(`${API_BASE}/api/earn/vaults?chainId=8453`),
          fetch(`${API_BASE}/api/earn/vaults?chainId=42161`),
          fetch(`${API_BASE}/api/earn/vaults?chainId=1`),
        ]);

        const baseData = await baseRes.json();
        const arbData = await arbRes.json();
        const ethData = await ethRes.json();

        const allVaults = [...(baseData.data || []), ...(arbData.data || []), ...(ethData.data || [])];

        // Filter to top stablecoin vaults with real APY and high TVL
        const pools: LivePool[] = allVaults
          .filter((v: any) =>
            v.isTransactional &&
            v.analytics?.apy?.total != null &&
            v.analytics.apy.total > 0 &&
            v.analytics?.tvl?.usd &&
            Number(v.analytics.tvl.usd) > 1_000_000
          )
          .sort((a: any, b: any) => b.analytics.apy.total - a.analytics.apy.total)
          .map((v: any) => ({
            name: v.name,
            protocol: v.protocol?.name || 'Unknown',
            protocolUrl: v.protocol?.url || '#',
            network: v.network,
            chainId: v.chainId,
            token: v.underlyingTokens?.[0]?.symbol || '?',
            apyTotal: v.analytics.apy.total,
            apyBase: v.analytics.apy.base || 0,
            apyReward: v.analytics.apy.reward || 0,
            tvlUsd: v.analytics.tvl.usd,
            tags: v.tags || [],
          }));
        const normalizeProtocolKey = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, '');
        const withdrawableProtocols = new Set([
          'morpho',
          'morphov1',
          'morphov2',
          'aave',
          'aavev3',
          'euler',
          'pendle',
          'lido',
          'lidowsteth',
          'wsteth',
          'etherfi',
          'felixvanilla',
          'felix',
          'hyperlend',
          'neverland',
          'usdai',
          'seamless',
        ]);
        const isWithdrawable = (protocol: string) => withdrawableProtocols.has(normalizeProtocolKey(protocol));

        const withdrawable = pools.filter(p => isWithdrawable(p.protocol));
        const others = pools.filter(p => !isWithdrawable(p.protocol));
        setLivePools([...withdrawable, ...others].slice(0, 10));
      } catch (err) {
        console.warn('Failed to fetch live pools:', err);
      } finally {
        setPoolsLoading(false);
      }
    };
    fetchPools();
  }, []);

  const simulatedLiveYield = totalYield + activePlans.length * counter * 0.000001;

  const formatTVL = (usd: string): string => {
    const num = Number(usd);
    if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(0)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  };

  const formatProtocolName = (name: string): string => {
    const map: Record<string, string> = {
      'morpho-v1': 'Morpho V1',
      'morpho-v2': 'Morpho V2',
      'aave-v3': 'Aave V3',
      'euler-v2': 'Euler V2',
      'fluid': 'Fluid',
      'spark': 'Spark',
      'yo-protocol': 'YO Protocol',
      'ethena-usde': 'Ethena',
      'maple': 'Maple',
      'pendle': 'Pendle',
    };
    return map[name] || name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="greeting-section">
        <h1 className="greeting-title">Yield &amp; Markets</h1>
        <p className="greeting-sub">Monitor your DeFi positions and track live yield across chains.</p>
      </div>

      <div className="stats-container" style={{ marginBottom: '1.75rem' }}>
        <div className="balance-card" style={{ marginBottom: 0 }}>
          <div className="balance-label">Total Yield Earned</div>
          <div className="balance-amount">
            ${simulatedLiveYield.toFixed(4)}
          </div>
          <div style={{ marginTop: '0.75rem', fontSize: '0.85rem', opacity: 0.85, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="bolt" size={14} /> Earning across {activePlans.length} active {activePlans.length === 1 ? 'plan' : 'plans'}
          </div>
        </div>

        <div className="chart-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.6rem' }}>
          <div className="card-label">Total in DeFi</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.025em' }}>
            ${totalDeposited.toLocaleString()}
          </div>
          <div className="badge badge-green" style={{ width: 'fit-content' }}>
            <Icon name="trending_up" size={12} /> Earning Yield
          </div>
        </div>
      </div>

      {/* My Positions */}
      <div className="section-header" style={{ marginBottom: '0.75rem' }}>
        <h3 className="section-title">My DeFi Positions</h3>
      </div>

      {activePlans.length === 0 ? (
        <div className="tx-list" style={{ padding: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>
          <Icon name="trending_up" size={40} color="var(--text-muted)" />
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.75rem' }}>No active positions yet</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Create a savings plan with "Generate Yield" enabled to start earning.</p>
        </div>
      ) : (
        <div className="tx-list" style={{ marginBottom: '2rem' }}>
          {activePlans.map(plan => {
            const cat = CATEGORIES.find(c => c.value === plan.category)!;
            const tokenColor = TOKEN_COLOR[plan.token] || 'var(--accent-primary)';
            return (
              <div key={plan.id} className="tx-item">
                <div className="tx-icon" style={{ background: `${cat.color}18`, color: cat.color }}>
                  <Icon name="account_balance" size={18} />
                </div>
                <div className="tx-info">
                  <div className="tx-name">{plan.name}</div>
                  <div className="tx-date">{plan.chain} · {plan.token}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.95rem' }}>
                    +${(plan.yieldEarned + counter * 0.000001).toFixed(4)}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: tokenColor, fontWeight: 700 }}>~{plan.apy}% APY</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Live DeFi Pool Directory */}
      <div className="section-header" style={{ marginBottom: '0.75rem' }}>
        <h3 className="section-title">Available DeFi Pools</h3>
        <span className="badge badge-green">
          {poolsLoading ? 'Loading...' : `${livePools.length} Live Pools`}
        </span>
      </div>

      <div className="tx-list">
        <div className="tx-item" style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ flex: 2, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Protocol</div>
          <div style={{ flex: 1, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Chain</div>
          <div style={{ flex: 1, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>Token</div>
          <div style={{ width: '80px', textAlign: 'right', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>APY</div>
          <div style={{ width: '80px', textAlign: 'right', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>TVL</div>
        </div>

        {poolsLoading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon name="schedule" size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <div>Fetching live rates from DeFi protocols...</div>
          </div>
        ) : livePools.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon name="cloud_off" size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <div>Unable to fetch live pool data. Please check your connection.</div>
          </div>
        ) : (
          livePools.map((pool, i) => (
            <a
              key={i}
              href={pool.protocolUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tx-item"
              style={{
                textDecoration: 'none',
                color: 'inherit',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'var(--bg-input)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              }}
            >
              <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '8px', flexShrink: 0,
                  background: CHAIN_COLORS[pool.network] || 'var(--accent-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon name="account_balance" size={16} color="white" />
                </div>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', display: 'block' }}>
                    {formatProtocolName(pool.protocol)}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {pool.name}
                  </span>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {CHAIN_LOGOS[pool.network] ? (
                  <img src={CHAIN_LOGOS[pool.network]} alt={pool.network} style={{ width: 22, height: 22, borderRadius: '50%' }} />
                ) : (
                  <span style={{
                    display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '99px',
                    background: `${CHAIN_COLORS[pool.network] || '#666'}20`,
                    color: CHAIN_COLORS[pool.network] || '#666',
                    fontSize: '0.72rem', fontWeight: 700,
                  }}>
                    {pool.network}
                  </span>
                )}
              </div>
              <div style={{ flex: 1, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {pool.token}
              </div>
              <div style={{ width: '80px', textAlign: 'right' }}>
                <div style={{ fontWeight: 800, color: 'var(--success)', fontSize: '0.9rem' }}>
                  {pool.apyTotal.toFixed(1)}%
                </div>
                {pool.apyReward > 0 && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                    +{pool.apyReward.toFixed(1)}% rewards
                  </div>
                )}
              </div>
              <div style={{ width: '80px', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.25rem' }}>
                {formatTVL(pool.tvlUsd)}
                <Icon name="open_in_new" size={12} color="var(--text-muted)" />
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
