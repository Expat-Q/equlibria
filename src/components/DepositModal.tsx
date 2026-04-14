import { useState } from 'react';
import { Icon } from './Icon';
import type { SavingsPlan } from '../types';
import { CATEGORIES, TOKEN_COLOR } from '../types';
import { depositToPool, depositToTreasury } from '../services/chainService';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { API_BASE } from '../services/api';

interface Props {
  plan: SavingsPlan;
  wallet: any;
  onClose: () => void;
  onDeposited: (plan: SavingsPlan, amount: number) => void;
  isDemo?: boolean;
  onDemoTransaction?: (payload: {
    type: 'deposit';
    chain: string;
    token: string;
    amount: number;
    meta?: Record<string, any>;
  }) => Promise<void> | void;
}

type Status = 'idle' | 'quoting' | 'approving' | 'signing' | 'confirming' | 'success' | 'error';

export function DepositModal({ plan, wallet, onClose, onDeposited }: Props) {
  const authFetch = useAuthFetch();
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [txHash, setTxHash] = useState('');
  const [explorerUrl, setExplorerUrl] = useState('');
  const [vaultName, setVaultName] = useState('');
  const [errMsg, setErrMsg] = useState('');

  const cat = CATEGORIES.find(c => c.value === plan.category)!;
  const tokenColor = TOKEN_COLOR[plan.token];

  const statusMessages: Record<Status, string> = {
    idle: '',
    quoting: 'Getting best yield route from LI.FI...',
    approving: 'Approving token spending...',
    signing: 'Please confirm in your wallet...',
    confirming: 'Submitting transaction on-chain...',
    success: '',
    error: '',
  };

  const handleDeposit = async () => {
    const num = parseFloat(amount);
    if (!num || num <= 0) return;

    setStatus('quoting');
    setErrMsg('');

    try {
      if (!wallet) throw new Error('No physical wallet connected. Please log in.');

      if (plan.depositToDefi) {
        // ── DeFi ON: Route through LI.FI yield vault ──
        setStatus('signing');

        const result = await depositToPool(
          wallet,
          plan.token as any,
          amount,
          (plan.chain || 'base') as any
        );

        setTxHash(result.txHash);
        setExplorerUrl(result.explorerUrl || '');
        setVaultName(result.vaultName || '');
        setStatus('success');

        // Record the deposit on backend for points
        try {
          await authFetch(`${API_BASE}/api/vaults/${plan.id}/deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ depositorAddress: wallet?.address || '', amount: num, txHash: result.txHash, txStatus: result.status }),
          });
        } catch { /* non-critical */ }

        const updatedPlan: SavingsPlan = {
          ...plan,
          currentAmount: plan.currentAmount + num,
          myContribution: plan.myContribution + num,
          yieldEarned: plan.yieldEarned + (num * 0.0001),
          depositToDefi: true,
          apy: result.apy,
          defiProtocol: result.protocol,
          defiVaultName: result.vaultName,
          defiChainId: result.chainId,
        };
        onDeposited(updatedPlan, num);
      } else {
        // ── DeFi OFF: Custodial Treasury Transfer ──
        setStatus('signing');

        // Execute a direct token transfer from wallet to Treasury
        const result = await depositToTreasury(
          wallet,
          plan.token as any,
          amount,
          (plan.chain || 'base') as any
        );

        setTxHash(result.txHash);
        setExplorerUrl(result.explorerUrl || '');
        setStatus('success');

        // Record the deposit on backend for points
        try {
          await authFetch(`${API_BASE}/api/vaults/${plan.id}/deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ depositorAddress: wallet?.address || '', amount: num, txHash: result.txHash }),
          });
        } catch { /* non-critical */ }

        const updatedPlan: SavingsPlan = {
          ...plan,
          currentAmount: plan.currentAmount + num,
          myContribution: plan.myContribution + num,
          depositToDefi: false,
          apy: 0,
        };
        onDeposited(updatedPlan, num);
      }
    } catch (e: any) {
      setErrMsg(e?.message ?? 'Transaction failed. Please try again.');
      setStatus('error');
    }
  };

  const progress = plan.targetAmount > 0
    ? Math.min((plan.currentAmount / plan.targetAmount) * 100, 100)
    : 0;
  const newProgress = plan.targetAmount > 0
    ? Math.min(((plan.currentAmount + (parseFloat(amount) || 0)) / plan.targetAmount) * 100, 100)
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.75rem', display: 'flex' }}>
              <Icon name={cat.iconName} size={28} color={cat.color} />
            </span>
            <div>
              <div className="modal-title" style={{ fontSize: '1.05rem' }}>Deposit Crypto</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>Fund your {plan.name} directly from your connected wallet</div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>

        {status !== 'success' ? (
          <>
            {/* Current progress */}
            <div style={{ background: 'var(--bg-glass-light)', borderRadius: 12, padding: '1rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                <span>Current: <strong style={{ color: 'var(--text-bright)' }}>{plan.currentAmount.toLocaleString()} {plan.token}</strong></span>
                <span>Goal: <strong style={{ color: 'var(--text-bright)' }}>{plan.targetAmount.toLocaleString()} {plan.token}</strong></span>
              </div>
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}88)` }}
                />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'right' }}>
                {progress.toFixed(1)}% complete
              </div>
            </div>

            {/* Amount input */}
            {/* Amount input */}
            <div className="form-section">
              <label className="form-label">Transfer Amount</label>
              <div className="input-with-suffix">
                <input
                  className="form-input"
                  type="number"
                  placeholder="0.00"
                  min="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{ paddingRight: '4.5rem', fontSize: '1.2rem', fontWeight: 700 }}
                  autoFocus
                />
                <span className="input-suffix" style={{ color: tokenColor, fontWeight: 700, fontSize: '0.95rem' }}>
                  {plan.token}
                </span>
              </div>
            </div>


            {/* Preview new progress */}
            {amount && parseFloat(amount) > 0 && (
              <div style={{ background: `${cat.color}10`, border: `1px solid ${cat.color}25`, borderRadius: 12, padding: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>After deposit:</div>
                <div className="progress-bar-container" style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <div className="progress-bar-fill" style={{ width: `${newProgress}%`, background: cat.color }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginTop: '0.4rem' }}>
                  <span style={{ color: 'var(--success)', fontWeight: 600 }}>+{parseFloat(amount).toLocaleString()} {plan.token}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{newProgress.toFixed(1)}%</span>
                </div>
              </div>
            )}

            <div style={{
              background: 'var(--accent-dim)', border: '1px solid var(--border-active)',
              borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1.5rem',
              fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
            }}>
              <Icon name="info" size={16} color="var(--accent-primary)" />
              <span>
                {plan.depositToDefi
                  ? <>Your funds will be routed on-chain via <strong style={{ color: 'var(--accent-primary)' }}>LI.FI Protocol</strong> into the best yield vault (~{plan.apy}% APY). Withdrawals before maturity incur a 5% penalty.</>
                  : <>Funds are securely tracked in your savings plan. Enable <strong style={{ color: 'var(--accent-primary)' }}>DeFi Yield</strong> when creating a plan to earn automatic rewards via LI.FI.</>
                }
              </span>
            </div>

            {errMsg && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--danger)' }}>
                {errMsg}
              </div>
            )}

            <button
              className="btn-primary"
              style={{ width: '100%' }}
              onClick={handleDeposit}
              disabled={!amount || parseFloat(amount) <= 0 || (status !== 'idle' && status !== 'error')}
              id="deposit-confirm-btn"
            >
              {status === 'idle' || status === 'error' ? (
                <><Icon name="rocket_launch" size={18} /> Deposit via LI.FI</>
              ) : (
                <><span className="spinner" /> {statusMessages[status]}</>
              )}
            </button>
          </>
        ) : (
          /* Success state */
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>✅</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Deposit Successful!
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--accent-primary)' }}>{amount} {plan.token}</strong> has been added to your savings plan.
            </p>

            {txHash && (
              <div style={{ background: 'var(--bg-glass-light)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '0.75rem', marginBottom: '1.5rem', fontSize: '0.75rem' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Transaction Hash</div>
                <div style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', wordBreak: 'break-all', marginBottom: '0.5rem' }}>
                  {txHash.slice(0, 20)}...{txHash.slice(-8)}
                </div>
                {explorerUrl && (
                  <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}
                  >
                    <Icon name="open_in_new" size={14} /> View on Block Explorer ↗
                  </a>
                )}
              </div>
            )}

            {vaultName && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                <Icon name="bolt" size={14} color="var(--success)" /> Deposited into {vaultName}
              </div>
            )}

            <div className="progress-bar-container" style={{ marginBottom: '1.5rem' }}>
              <div
                className="progress-bar-fill"
                style={{ width: `${newProgress}%`, background: `linear-gradient(90deg, ${cat.color}, ${cat.color}88)` }}
              />
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              {newProgress.toFixed(1)}% toward goal · Now earning ~{plan.apy}% APY
            </div>

            <button className="btn-primary" style={{ width: '100%' }} onClick={onClose}>
               <Icon name="check_circle" size={16} /> Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
