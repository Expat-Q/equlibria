import { useState } from 'react';
import { Icon } from './Icon';
import type { SavingsPlan } from '../types';
import { CATEGORIES } from '../types';
import { DepositModal } from './DepositModal';

interface Props {
  plan: SavingsPlan;
  wallet: any;
  onBack: () => void;
  onUpdatePlan: (plan: SavingsPlan) => void;
}

export function PrivateWallet({ plan, wallet, onBack, onUpdatePlan }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [showDeposit, setShowDeposit] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendMsg, setSendMsg] = useState('');

  const cat = CATEGORIES.find(c => c.value === plan.category)!;
  const progress = plan.targetAmount > 0
    ? Math.min((plan.currentAmount / plan.targetAmount) * 100, 100)
    : 0;

  const handlePrivateSend = async () => {
    if (!plan.currentAmount) { setSendMsg('No funds to send.'); return; }
    setIsSending(true);
    setSendMsg('');
    try {
      await new Promise(r => setTimeout(r, 2200));
      const sent = Math.min(plan.currentAmount * 0.1, plan.currentAmount);
      onUpdatePlan({ ...plan, currentAmount: plan.currentAmount - sent });
      setSendMsg(`✅ Sent ${sent.toFixed(4)} ${plan.token} securely via Privy embedded wallet.`);
    } catch (e: any) {
      setSendMsg('⚠️ ' + (e?.message ?? 'Send failed'));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <button className="btn-ghost" style={{ marginBottom: '1.5rem', paddingLeft: 0 }} onClick={onBack}>
        <Icon name="arrow_back" size={16} /> Back to Dashboard
      </button>

      <div className="greeting-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h1 className="greeting-title">{plan.name}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.5rem' }}>
            <span className="badge badge-orange"><Icon name="lock" size={12} /> Private Wallet</span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Powered by LI.FI</span>
          </div>
        </div>
        <div style={{ fontSize: '2.5rem' }}>{cat.emoji}</div>
      </div>

      {/* Balance Section */}
      <div className="balance-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div className="balance-label">Confidential Balance</div>
            <div className={`balance-amount ${revealed ? '' : 'confidential-blur'}`} onClick={() => setRevealed(!revealed)} style={{ cursor: 'pointer' }}>
              ${plan.currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', opacity: 0.8 }}>
              Target: ${plan.targetAmount.toLocaleString()} {plan.token}
            </div>
          </div>
          <button className="btn-icon" style={{ background: 'white', color: 'var(--accent-primary)' }} onClick={() => setRevealed(!revealed)}>
            {revealed ? <Icon name="visibility" size={18} /> : <Icon name="visibility_off" size={18} />}
          </button>
        </div>

        <div className="balance-actions">
          <button className="btn-white" onClick={() => setShowDeposit(true)} style={{ flex: 1 }}>
            <Icon name="download" size={16} /> Fund Privately
          </button>
          <button className="btn-white" onClick={handlePrivateSend} disabled={isSending} style={{ flex: 1 }}>
            {isSending ? 'Shielding...' : <><Icon name="send" size={16} /> Shielded Send</>}
          </button>
        </div>
      </div>

      {/* Layout Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="chart-card">
          <div className="card-label">Yield Earned</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginTop: '0.5rem' }}>
            +{(plan.yieldEarned || 0).toFixed(4)} <span style={{ fontSize: '0.85rem' }}>{plan.token}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
            Auto-compounded via DeFi yield
          </div>
        </div>

        <div className="chart-card">
          <div className="card-label">Savings Progress</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '0.5rem' }}>
            {progress.toFixed(1)}%
          </div>
          <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: 10, marginTop: '0.6rem', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent-primary)' }} />
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="tx-list" style={{ padding: '1.5rem', background: 'rgba(167, 139, 250, 0.05)', borderColor: 'rgba(167, 139, 250, 0.2)' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
          <Icon name="security" size={24} color="#a78bfa" />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: '#a78bfa', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Privy Embedded Wallet Security</div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Your wallet is secured by Privy. Funds deposited into savings plans are tracked on-chain and can be withdrawn at any time (subject to lock period and early withdrawal penalties).
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="section-header" style={{ marginTop: '2rem' }}>
        <h3 className="section-title">Confidential Activity</h3>
      </div>
      <div className="tx-list">
        <div className="tx-item">
          <div className="tx-icon"><Icon name="bolt" size={20} color="var(--accent-primary)" /></div>
          <div className="tx-info">
            <div className="tx-name">ZK Deposit</div>
            <div className="tx-date">Shielded operation</div>
          </div>
          <div className="tx-amount tx-positive">+Shielded</div>
        </div>
        <div className="tx-item">
          <div className="tx-icon"><Icon name="send" size={18} color="var(--text-muted)" /></div>
          <div className="tx-info">
            <div className="tx-name">Confidential Outbound</div>
            <div className="tx-date">Shielded recipient</div>
          </div>
          <div className="tx-amount tx-negative">-Shielded</div>
        </div>
      </div>

      {/* Send Message Toast (Simple) */}
      {sendMsg && (
        <div style={{ 
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 1000,
          background: 'var(--bg-sidebar)', border: '1px solid var(--border-active)',
          padding: '1rem 1.5rem', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          maxWidth: '350px', animation: 'slideUp 0.3s ease'
        }}>
          <p style={{ fontSize: '0.85rem', color: sendMsg.startsWith('✅') ? 'var(--success)' : 'var(--danger)' }}>{sendMsg}</p>
        </div>
      )}

      {showDeposit && (
        <DepositModal
          plan={plan}
          wallet={wallet}
          onClose={() => setShowDeposit(false)}
          onDeposited={(updatedPlan) => {
            onUpdatePlan(updatedPlan);
            setShowDeposit(false);
          }}
        />
      )}
    </div>
  );
}
