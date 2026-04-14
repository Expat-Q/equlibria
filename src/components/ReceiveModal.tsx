import { useState } from 'react';
import { Icon } from './Icon';

interface Props {
  onClose: () => void;
  walletAddress?: string;
  isDemo?: boolean;
  onDemoTransaction?: (payload: {
    type: 'topup';
    chain: string;
    token: string;
    amount: number;
    meta?: Record<string, any>;
  }) => Promise<void> | void;
}

export function ReceiveModal({ onClose, walletAddress = '', isDemo, onDemoTransaction }: Props) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Top Up via Bank Transfer</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: 'var(--warning)', background: 'var(--warning-dim)', padding: '0.15rem 0.4rem', borderRadius: '4px', textTransform: 'uppercase' }}>Simulation Mode</span>
              <p className="modal-subtitle" style={{ marginTop: 0 }}>Transfer fiat to automatically fund your wallet (Hackathon Demo)</p>
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
              {localStorage.getItem('equilibria_display_name') || 'User'} - Vault
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
      </div>
    </div>
  );
}
