import type { SavingsPlan } from '../types';
import { CATEGORIES } from '../types';
import { Icon } from './Icon';

interface Props {
  plan: SavingsPlan;
  onClick: () => void;
  onDeposit?: () => void;
  onUpdatePlan?: (plan: SavingsPlan) => void;
}

export function PlanCard({ plan, onClick }: Props) {
  const cat = CATEGORIES.find(c => c.value === plan.category)!;
  const isJoint = plan.type === 'joint';
  const accentColor = isJoint ? '#a78bfa' : '#ff8c00';
  const PROTOCOL_MAP: Record<string, string> = {
    base: 'Aave V3', arbitrum: 'Aave V3', bnb: 'Venus', ethereum: 'Aave V3',
  };
  const defiProtocol = plan.chain ? (PROTOCOL_MAP[plan.chain] || 'DeFi') : 'DeFi';

  // Compact large numbers
  const compactNum = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
    if (n >= 1_000) return (n / 1000).toFixed(2) + 'K';
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const shortAddr = (addr: string) =>
    addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  return (
    <div
      className="plan-card-pro"
      onClick={onClick}
      style={{ '--plan-accent': accentColor } as React.CSSProperties}
    >
      {/* ── Title + tags ── */}
      <div style={{ marginBottom: '1.25rem' }}>
        <div style={{
          fontSize: '1.15rem', fontWeight: 800,
          color: 'var(--text-primary)', letterSpacing: '-0.01em',
          marginBottom: '0.45rem',
        }}>
          {plan.name}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Category tag */}
          <span style={{
            fontSize: '0.65rem', fontWeight: 700,
            color: accentColor, background: `${accentColor}15`,
            padding: '0.15rem 0.5rem', borderRadius: '5px',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            {cat.label}
          </span>

          {/* Protocol tag */}
          <span style={{
            fontSize: '0.65rem', fontWeight: 600,
            color: 'var(--text-muted)', background: 'var(--bg-input)',
            padding: '0.15rem 0.5rem', borderRadius: '5px',
            display: 'flex', alignItems: 'center', gap: '0.25rem',
          }}>
            <Icon name="layers" size={10} />
            {defiProtocol}
          </span>

          {/* Joint indicator */}
          {isJoint && (
            <span style={{
              fontSize: '0.65rem', fontWeight: 700,
              color: '#a78bfa', background: 'rgba(167,139,250,0.1)',
              padding: '0.15rem 0.5rem', borderRadius: '5px',
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>
              Joint
            </span>
          )}
        </div>

        {/* Partner address for joint vaults */}
        {isJoint && (
          <div style={{
            marginTop: '0.6rem',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: 'rgba(167,139,250,0.07)',
            border: '1px solid rgba(167,139,250,0.15)',
            borderRadius: '8px', padding: '0.4rem 0.65rem',
          }}>
            <Icon name="group" size={12} color="#a78bfa" />
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Partner:
            </span>
            <span style={{
              fontSize: '0.7rem', fontWeight: 700,
              color: 'var(--text-primary)', fontFamily: 'monospace',
            }}>
              {plan.partnerAddress
                ? shortAddr(plan.partnerAddress)
                : '0x7c4f...3a9e'}
            </span>
            {!plan.isPartnerAccepted && (
              <span style={{
                marginLeft: 'auto', fontSize: '0.62rem', fontWeight: 700,
                color: 'var(--warning)', background: 'rgba(245,158,11,0.1)',
                padding: '0.1rem 0.4rem', borderRadius: '4px',
              }}>
                Pending
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Stats grid ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1px 1fr 1px 1fr',
        gap: '0', borderTop: '1px solid var(--border-subtle)', paddingTop: '1.1rem',
        alignItems: 'start',
      }}>
        {/* Deposited */}
        <div style={{ paddingRight: '0.75rem' }}>
          <div style={{
            fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem',
          }}>
            Deposited
          </div>
          <div style={{
            fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)',
            letterSpacing: '-0.02em', lineHeight: 1.1,
          }}>
            {compactNum(plan.currentAmount)}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem' }}>
            {plan.token}
          </div>
        </div>

        {/* Divider */}
        <div style={{ background: 'var(--border-subtle)', height: '100%', minHeight: '48px' }} />

        {/* Yield Earned */}
        <div style={{ padding: '0 0.75rem' }}>
          <div style={{
            fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem',
          }}>
            Yield
          </div>
          <div style={{
            fontSize: '1.1rem', fontWeight: 900, color: 'var(--success)',
            letterSpacing: '-0.01em', lineHeight: 1.1,
          }}>
            +{compactNum(plan.yieldEarned)}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem' }}>
            {plan.token}
          </div>
        </div>

        {/* Divider */}
        <div style={{ background: 'var(--border-subtle)', height: '100%', minHeight: '48px' }} />

        {/* APY */}
        <div style={{ paddingLeft: '0.75rem' }}>
          <div style={{
            fontSize: '0.62rem', color: 'var(--text-muted)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.3rem',
          }}>
            APY
          </div>
          <div style={{
            fontSize: '1.35rem', fontWeight: 900, color: accentColor,
            letterSpacing: '-0.02em', lineHeight: 1.1,
          }}>
            {plan.apy}%
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.1rem' }}>
            Annual
          </div>
        </div>
      </div>
    </div>
  );
}
