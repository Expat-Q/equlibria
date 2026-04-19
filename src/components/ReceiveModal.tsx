import { useState } from 'react';
import { Icon } from './Icon';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { API_BASE } from '../services/api';

interface Props {
  onClose: () => void;
  walletAddress?: string;
  displayName?: string;
  isDemo?: boolean;
  onDemoTransaction?: (payload: {
    type: 'topup';
    chain: string;
    token: string;
    amount: number;
    meta?: Record<string, any>;
  }) => Promise<void> | void;
}

export function ReceiveModal({ onClose, walletAddress = '', displayName = 'User', isDemo, onDemoTransaction }: Props) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transferAmount, setTransferAmount] = useState('');
  const [reference, setReference] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const authFetch = useAuthFetch();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleConfirmTransfer = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      if (!walletAddress) throw new Error('Wallet not connected');
      
      const res = await authFetch(`${API_BASE}/api/fiat-topups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userAddress: walletAddress, 
          amount: parseFloat(transferAmount), 
          referenceId: reference 
        }),
      });
      if (!res.ok) throw new Error('Failed to submit transfer proof');
      
      setMessage('Transfer successfully logged! Awaiting approval.');
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error submitting transfer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Top Up via Bank Transfer</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
              <p className="modal-subtitle" style={{ marginTop: 0 }}>Transfer fiat to fund your wallet</p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Bank Transfer Details */}
        <div style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Bank Name
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Equilibria Finance Bank
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Account Name
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {displayName} - Vault
            </div>
          </div>
          
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.2rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Account Number
            </div>
            <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg-card)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)'
            }}>
              <code style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '2px' }}>
                8023 4567 8901
              </code>
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? 'var(--success-dim)' : 'var(--accent-dim)',
                  border: 'none',
                  color: copied ? 'var(--success)' : 'var(--accent-primary)',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '6px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'all 0.2s ease',
                }}
              >
                <Icon name={copied ? 'check' : 'copy'} size={14} />
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Simulate Button for Demo */}
        {isDemo && onDemoTransaction && (
          <button
            className="btn-primary"
            onClick={async () => {
              setLoading(true);
              await onDemoTransaction({
                type: 'topup',
                chain: 'base',
                token: 'USDC',
                amount: 1000,
                meta: { method: 'bank_transfer' }
              });
              setLoading(false);
              onClose();
            }}
            style={{ width: '100%', marginTop: '1.5rem' }}
            disabled={loading}
          >
            {loading ? <><span className="spinner" /> Simulating Transfer...</> : <><Icon name="bolt" size={18} /> Simulate $1,000 Top Up</>}
          </button>
        )}

        {/* Manual Input Form */}
        {!isDemo && (
          <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <h3 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.2rem' }}>Proof of Transfer</h3>
            <input 
              type="number" 
              placeholder="Amount Sent (e.g. USD or equivalent)"
              value={transferAmount}
              onChange={e => setTransferAmount(e.target.value)}
              style={{
                width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)',
                background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none'
              }}
            />
            <input 
              type="text" 
              placeholder="Reference / Memo code (optional)"
              value={reference}
              onChange={e => setReference(e.target.value)}
              style={{
                width: '100%', padding: '0.8rem 1rem', borderRadius: '8px', border: '1px solid var(--border-subtle)',
                background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '1rem', outline: 'none'
              }}
            />
            <button
              className="btn-primary"
              onClick={handleConfirmTransfer}
              style={{ width: '100%', marginTop: '0.5rem' }}
              disabled={loading || !transferAmount || parseFloat(transferAmount) <= 0}
            >
              {loading ? <><span className="spinner" /> Submitting...</> : <><Icon name="check_circle" size={18} /> Confirm Transfer</>}
            </button>
            {message && <p style={{ fontSize: '0.85rem', color: 'var(--success)', textAlign: 'center', marginTop: '0.5rem', fontWeight: 600 }}>{message}</p>}
            {error && <p style={{ fontSize: '0.85rem', color: 'var(--warning)', textAlign: 'center', marginTop: '0.5rem', fontWeight: 600 }}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
