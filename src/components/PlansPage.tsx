import { Icon } from './Icon';
import type { SavingsPlan } from '../types';

interface Props {
  plans: SavingsPlan[];
  onCreatePlan: () => void;
  onSelectPlan: (plan: SavingsPlan) => void;
  onDeposit: (plan: SavingsPlan) => void;
}

export function PlansPage({ plans, onCreatePlan, onSelectPlan, onDeposit }: Props) {
  const individual = plans.filter(p => p.type === 'individual');
  const joint = plans.filter(p => p.type === 'joint');

  const totalYield = plans.reduce((a, p) => a + p.yieldEarned, 0);
  const totalSaved = plans.reduce((a, p) => a + p.currentAmount, 0);

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div className="greeting-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="greeting-title">My Plans</h1>
          <p className="greeting-sub">
            {plans.length} plan{plans.length !== 1 ? 's' : ''} · {individual.length} individual · {joint.length} joint
          </p>
        </div>
        <button className="btn-primary" onClick={onCreatePlan} id="plans-create-btn">
          <Icon name="add" size={16} color="white" />
          Create Plan
        </button>
      </div>

      {/* Summary row */}
      <div className="plans-stats-row" style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem',
      }}>
        {[
          { label: 'Total Saved', value: `$${totalSaved.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, icon: 'savings', color: 'var(--accent-primary)' },
          { label: 'Yield Earned', value: `+${totalYield.toFixed(4)}`, icon: 'trending_up', color: 'var(--success)' },
          { label: 'Active Plans', value: `${plans.filter(p => p.depositToDefi).length}`, icon: 'bolt', color: '#a78bfa' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
            borderRadius: 14, padding: '1rem 1.25rem',
            display: 'flex', alignItems: 'center', gap: '0.85rem',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, flexShrink: 0,
              background: `${stat.color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon name={stat.icon} size={20} color={stat.color} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.15rem' }}>{stat.label}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

    

      {/* Plan cards grid -> Sleek List View */}
      <div style={{ marginTop: '0.5rem' }}>
        {[
          { label: 'Individual Plans', icon: 'lock', data: individual, color: 'var(--accent-primary)', bg: 'rgba(255,140,0,0.1)' },
          { label: 'Joint Vaults', icon: 'group', data: joint, color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' }
        ].map((section, idx) => section.data.length > 0 && (
          <div key={idx} style={{ marginBottom: '2.5rem' }}>
            <div className="section-header" style={{ marginBottom: '1.25rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Icon name={section.icon} size={18} color={section.color} />
                {section.label} <span style={{ background: 'var(--bg-input)', padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{section.data.length}</span>
              </h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {section.data
                .slice()
                .sort((a, b) => (b.currentAmount / b.targetAmount) - (a.currentAmount / a.targetAmount))
                .map(plan => {
                const progress = Math.min((plan.currentAmount / plan.targetAmount) * 100, 100);
                
                return (
                  <div
                    key={plan.id}
                    onClick={() => onSelectPlan(plan)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto auto auto',
                      alignItems: 'center',
                      gap: '1.5rem',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      padding: '1rem 1.25rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = 'var(--border-active)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--border-subtle)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {/* Icon */}
                    <div style={{
                      width: 44, height: 44, borderRadius: '12px',
                      background: section.bg, color: section.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Icon name="savings" size={20} />
                    </div>

                    {/* Meta */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                        {plan.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Target: {plan.targetAmount.toLocaleString()} {plan.token}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '140px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.7rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-primary)' }}>{progress.toFixed(1)}%</span>
                        <span style={{ color: section.color }}>{plan.currentAmount.toLocaleString()} {plan.token}</span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${progress}%`, height: '100%', background: section.color, borderRadius: '3px' }} />
                      </div>
                    </div>

                    {/* Yield Earned */}
                    <div style={{ textAlign: 'right', minWidth: '80px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.1rem', fontWeight: 600 }}>Yield</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--success)' }}>
                        +{plan.yieldEarned.toFixed(3)}
                      </div>
                    </div>

                    {/* Context Menu Action */}
                    <div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeposit(plan);
                        }}
                        style={{
                          background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
                          borderRadius: '8px', padding: '0.4rem 0.6rem', color: 'var(--text-secondary)',
                          cursor: 'pointer', transition: 'all 0.2s'
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.color = section.color;
                          e.currentTarget.style.borderColor = section.color;
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = 'var(--text-secondary)';
                          e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        }}
                      >
                        <Icon name="add" size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Empty state when no plans exist */}
      {plans.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
          border: '1px dashed var(--border-subtle)', marginTop: '2rem',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: '50%', background: 'var(--bg-input)', marginBottom: '1.5rem' }}>
            <Icon name="account_balance_wallet" size={40} color="var(--accent-primary)" />
          </div>
          <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 800 }}>No savings plans yet</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6, maxWidth: '380px', margin: '0 auto 2rem' }}>
            Create an individual plan for private savings, or a joint vault to save together with a partner.
          </p>
          <button className="btn-primary" onClick={onCreatePlan} style={{ margin: '0 auto' }}>
            <Icon name="add" size={16} color="white" /> Create First Plan
          </button>
        </div>
      )}
    </div>
  );
}
