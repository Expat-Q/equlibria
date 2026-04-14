import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Icon } from './Icon';
import baseLogo from '../assets/base_logo.jpg';
import arbitrumLogo from '../assets/arbitrum_logo.jpg';
import ethLogo from '../assets/eth_logo.jpg';

interface Props {
  onClose: () => void;
  walletAddress?: string;
  isDemo?: boolean;
  onDemoTransaction?: (payload: {
    type: 'receive';
    chain: string;
    token: string;
    amount: number;
    meta?: Record<string, any>;
  }) => Promise<void> | void;
}

export function CryptoReceiveModal({ onClose, walletAddress = '', isDemo, onDemoTransaction }: Props) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedChain, setSelectedChain] = useState<'ethereum' | 'base' | 'arbitrum'>('base');
  const [selectedToken, setSelectedToken] = useState<'ETH' | 'USDT' | 'USDC'>('ETH');

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
            <h2 className="modal-title">Receive Crypto</h2>
            <p className="modal-subtitle">Share your wallet address to receive digital assets</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Live QR Code */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '2rem',
          marginBottom: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            background: 'white',
            padding: '1rem',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            marginBottom: '1rem',
          }}>
            {walletAddress ? (
              <QRCodeSVG value={walletAddress} size={150} level="M" />
            ) : (
              <div style={{ width: 150, height: 150, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                <span className="spinner" style={{ borderColor: '#d1d5db', borderTopColor: '#9ca3af' }} />
              </div>
            )}
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            background: 'var(--success-dim)',
            borderRadius: '8px'
          }}>
            <Icon name="verified_user" size={16} color="var(--success)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--success)', textTransform: 'capitalize' }}>
              {selectedChain} Network
            </span>
          </div>
        </div>

        <div className="form-section" style={{ marginTop: '-0.25rem' }}>
          <label className="form-label">Select Chain</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
            {[
              { key: 'ethereum', label: 'Ethereum', icon: ethLogo },
              { key: 'base', label: 'Base', icon: baseLogo },
              { key: 'arbitrum', label: 'Arbitrum', icon: arbitrumLogo },
            ].map((chain) => (
              <button
                key={chain.key}
                onClick={() => setSelectedChain(chain.key as 'ethereum' | 'base' | 'arbitrum')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: selectedChain === chain.key ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: selectedChain === chain.key ? 'var(--accent-dim)' : 'var(--bg-input)',
                  color: selectedChain === chain.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                <img src={chain.icon} alt={chain.label} style={{ width: 18, height: 18, borderRadius: '50%' }} />
                {chain.label}
              </button>
            ))}
          </div>
        </div>

        <div className="form-section">
          <label className="form-label">Select Token</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
            {[
              { key: 'ETH', label: 'ETH' },
              { key: 'USDT', label: 'USDT' },
              { key: 'USDC', label: 'USDC' },
            ].map((token) => (
              <button
                key={token.key}
                onClick={() => setSelectedToken(token.key as 'ETH' | 'USDT' | 'USDC')}
                style={{
                  padding: '0.65rem',
                  borderRadius: '10px',
                  border: selectedToken === token.key ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: selectedToken === token.key ? 'var(--accent-dim)' : 'var(--bg-input)',
                  color: selectedToken === token.key ? 'var(--accent-primary)' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {token.label}
              </button>
            ))}
          </div>
        </div>

        {/* Wallet Address */}
        <div className="form-section">
          <label className="form-label">
            <Icon name="account_balance_wallet" size={14} style={{ marginRight: '0.4rem' }} />
            Your Wallet Address
          </label>
          <div style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <code style={{
              flex: 1,
              fontSize: '0.75rem',
              fontFamily: 'monospace',
              color: 'var(--text-primary)',
              wordBreak: 'break-all'
            }}>
              {walletAddress}
            </code>
            <button
              onClick={handleCopy}
              style={{
                background: copied ? 'var(--success-dim)' : 'var(--accent-dim)',
                border: 'none',
                color: copied ? 'var(--success)' : 'var(--accent-primary)',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                transition: 'all 0.2s ease',
                flexShrink: 0
              }}
            >
              <Icon name={copied ? 'check' : 'copy'} size={14} />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Simulate Receive Button */}
        {isDemo && onDemoTransaction && (
          <button
            className="btn-primary"
            onClick={async () => {
              setLoading(true);
              await onDemoTransaction({
                type: 'receive',
                chain: selectedChain,
                token: selectedToken,
                amount: selectedToken === 'ETH' ? 0.5 : 500,
                meta: { from: '0x' + Math.random().toString(16).slice(2).padStart(40, '0') }
              });
              setLoading(false);
              onClose();
            }}
            style={{ width: '100%', marginTop: '1.5rem', background: 'var(--success)', border: 'none' }}
            disabled={loading}
          >
            {loading ? <><span className="spinner" /> Receiving...</> : <><Icon name="download" size={18} /> Simulate Receiving {selectedToken}</>}
          </button>
        )}
      </div>
    </div>
  );
}
