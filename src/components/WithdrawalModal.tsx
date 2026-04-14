import { useState } from 'react';
import type { SavingsPlan } from '../types';
import { Icon } from './Icon';

interface Props {
  plan: SavingsPlan;
  myContribution: number;
  partnerContribution: number;
  onClose: () => void;
  onSubmit: (amount: number, reason: string) => Promise<void>;
}

export function WithdrawalModal({ plan, myContribution, partnerContribution, onClose, onSubmit }: Props) {
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalBalance = plan.currentAmount;
  const maxAmount = Math.min(myContribution, totalBalance);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const withdrawAmount = parseFloat(amount);
    const isEarly = new Date() < new Date(plan.withdrawalDate);
    if (!withdrawAmount || withdrawAmount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    if (isEarly && !reason.trim()) {
      setError('Reason is required for early withdrawal');
      return;
    }

    if (withdrawAmount > maxAmount) {
      setError(`Cannot withdraw more than your contribution ($${maxAmount.toFixed(2)})`);
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(withdrawAmount, reason);
      setAmount('');
      setReason('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request withdrawal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 400,
    }}>
      <div style={{
        background: 'var(--bg-card)',
        borderRadius: 16,
        border: '1px solid var(--border-subtle)',
        maxWidth: 450,
        width: '90%',
        padding: '2rem',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Request Withdrawal
          </h2>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{ fontSize: '0.8rem' }}
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Info Section */}
        <div style={{
          background: 'var(--bg-input)',
          borderRadius: 12,
          padding: '1rem',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          color: 'var(--text-secondary)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Total Balance:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>${totalBalance.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <span>Your Contribution:</span>
            <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>${myContribution.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Partner's Contribution:</span>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>${partnerContribution.toFixed(2)}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Amount Input */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Withdrawal Amount
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                max={maxAmount}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2rem',
                  fontSize: '1rem',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  background: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Max: ${maxAmount.toFixed(2)}
            </div>
          </div>

          {/* Reason (Optional) */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g., Emergency expense, plan completed, etc."
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                background: 'var(--bg-input)',
                color: 'var(--text-primary)',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                minHeight: '70px',
                resize: 'none',
              }}
            />
          </div>

          {/* Notice & Penalty */}
          {(() => {
            const isEarly = new Date() < new Date(plan.withdrawalDate);
            const withdrawAmount = parseFloat(amount) || 0;
            const penalty = isEarly ? withdrawAmount * 0.05 : 0;
            const receiving = withdrawAmount - penalty;

            if (isEarly) {
              return (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 8,
                  padding: '1rem',
                  fontSize: '0.85rem',
                  color: '#dc2626',
                }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', fontWeight: 700 }}>
                    <Icon name="warning" size={18} />
                    Early Withdrawal Warning
                  </div>
                  <p style={{ margin: '0 0 0.5rem 0', lineHeight: 1.4 }}>
                    This vault is locked until <strong>{new Date(plan.withdrawalDate).toLocaleString()}</strong>.
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderTop: '1px solid rgba(239, 68, 68, 0.2)' }}>
                    <span>5% Penalty Fee:</span>
                    <span style={{ fontWeight: 700 }}>-${penalty.toFixed(2)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.95rem', marginTop: '0.25rem' }}>
                    <span>You will receive:</span>
                    <span>${receiving.toFixed(2)}</span>
                  </div>
                </div>
              );
            }

            return (
              <div style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 8,
                padding: '0.75rem 1rem',
                fontSize: '0.85rem',
                color: '#166534',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'flex-start',
              }}>
                <Icon name="check_circle" size={18} style={{ marginTop: '0.1rem', flexShrink: 0 }} />
                <span>Vault matured! No withdrawal penalty applied.</span>
              </div>
            );
          })()}

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 8,
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              color: '#dc2626',
            }}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isLoading}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || !amount}
              style={{ flex: 1 }}
            >
              {isLoading ? 'Requesting...' : 'Request Withdrawal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
