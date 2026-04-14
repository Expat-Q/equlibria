import { useState } from 'react';
import { parseEther, toHex } from 'viem';
import { Icon } from './Icon';
import baseLogo from '../assets/base_logo.jpg';
import arbitrumLogo from '../assets/arbitrum_logo.jpg';
import ethLogo from '../assets/eth_logo.jpg';

interface Props {
  onClose: () => void;
  onSent?: (amount: number, recipient: string, txHash?: string, chain?: string, token?: string) => void;
  isDemo?: boolean;
  walletBalances?: Array<{ chain: string; token: string; balance: number; usdValue: number }>;
  walletAddress?: string;
  onDemoTransaction?: (payload: {
    type: 'send';
    chain: string;
    token: string;
    amount: number;
    meta?: Record<string, any>;
  }) => Promise<void> | void;
  wallet?: any;
}

export function SendModal({ onClose, onSent, isDemo, walletBalances, onDemoTransaction, wallet }: Props) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedToken, setSelectedToken] = useState('USDC');
  const [selectedChain, setSelectedChain] = useState<'ethereum' | 'base' | 'arbitrum'>('base');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const TOKENS = [
    { symbol: 'USDC', icon: 'dollar-sign', color: '#2775ca' },
    { symbol: 'ETH', icon: 'ethereum', color: '#627eea' },
    { symbol: 'USDT', icon: 'dollar-sign', color: '#26a17b' },
  ];

  const CHAIN_META = [
    { key: 'ethereum', label: 'Ethereum', icon: ethLogo },
    { key: 'base', label: 'Base', icon: baseLogo },
    { key: 'arbitrum', label: 'Arbitrum', icon: arbitrumLogo },
  ] as const;

  const formatBalance = (value?: number) => {
    if (value === undefined || Number.isNaN(value)) return '--';
    return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  
  const isEvmAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value);

  const handleSend = async () => {
    const trimmedRecipient = recipient.trim();
    const amt = parseFloat(amount);

    if (!trimmedRecipient) {
      setError('Recipient is required');
      return;
    }
    if (trimmedRecipient.startsWith('@')) {
      setError('Username send is not supported yet. Use a 0x address.');
      return;
    }
    if (!isEvmAddress(trimmedRecipient)) {
      setError('Enter a valid 0x address');
      return;
    }
    if (wallet?.address && trimmedRecipient.toLowerCase() === wallet.address.toLowerCase()) {
      setError('Recipient cannot be your own address');
      return;
    }
    if (!amount || Number.isNaN(amt) || amt <= 0) {
      setError('Enter a valid amount');
      return;
    }
    if (walletBalances) {
      const balanceRow = walletBalances.find(b => b.chain === selectedChain && b.token === selectedToken);
      if (balanceRow && balanceRow.balance < amt) {
        setError('Insufficient balance');
        return;
      }
    }

    setError('');
    setSending(true);

    let txHash: string | undefined;
    try {
      if (isDemo && onDemoTransaction && walletBalances) {
        const chainKey = selectedChain;
        const tokenKey = selectedToken;
        const balanceRow = walletBalances.find(b => b.chain === chainKey && b.token === tokenKey);
        if (!balanceRow || balanceRow.balance < amt) {
          throw new Error('Insufficient demo balance');
        }
        await onDemoTransaction({
          type: 'send',
          chain: chainKey,
          token: tokenKey,
          amount: amt,
          meta: { recipient: trimmedRecipient },
        });
      } else {
      // Production: real on-chain transfer
      const { executeTransaction, TOKEN_ADDRESSES, CHAIN_IDS } = await import('../services/chainService');
      const tokenAddress = TOKEN_ADDRESSES[selectedChain]?.[selectedToken];
      let txParams: { to: string; data: string; value?: string; chainId?: number };

      if (!tokenAddress) throw new Error('Token not supported on this network');

      if (tokenAddress === '0x0000000000000000000000000000000000000000') {
          // Native ETH transfer
          txParams = {
            to: trimmedRecipient,
            data: '0x',
            value: toHex(parseEther(amount)),
            chainId: CHAIN_IDS[selectedChain]
          };
      } else {
          // ERC20 Transfer
          const fromWei = BigInt(Math.floor(parseFloat(amount) * 10 ** 6)).toString();
          const toPadded = trimmedRecipient.replace('0x', '').padStart(64, '0');
          const amountHex = BigInt(fromWei).toString(16).padStart(64, '0');
          const data = `0xa9059cbb${toPadded}${amountHex}`;
          txParams = {
            to: tokenAddress,
            data,
            value: '0x0',
            chainId: CHAIN_IDS[selectedChain]
          };
      }

      if (!wallet) throw new Error('Wallet not connected');
      txHash = await executeTransaction(wallet, txParams);
      }
    } catch (err: any) {
      setSending(false);
      setError(err?.message || 'Failed to send');
      return;
    }

    setSending(false);
    setSent(true);
    
    if (onSent) {
      onSent(parseFloat(amount), recipient, txHash, selectedChain, selectedToken);
    }
    
    // Auto close after success
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  if (sent) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'var(--success-dim)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem'
            }}>
              <Icon name="check" size={40} color="var(--success)" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Transaction Sent!
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Your transaction has been submitted successfully.
            </p>
            <div style={{
              background: 'var(--bg-input)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Amount</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {amount} {selectedToken}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                To: {recipient.slice(0, 6)}...{recipient.slice(-4)}
              </div>
            </div>
            <button className="btn-primary" onClick={onClose} style={{ width: '100%' }}>
              <Icon name="check" size={18} /> Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Send Funds</h2>
            <p className="modal-subtitle">Transfer tokens to another wallet</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {/* Recipient Input */}
        <div className="form-section">
          <label className="form-label">
            <Icon name="user" size={14} style={{ marginRight: '0.4rem' }} />
            Recipient Address or Username
          </label>
          <input
            className="form-input"
            type="text"
            placeholder="Enter wallet address or @username"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
          />
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 8,
            padding: '0.75rem 1rem',
            fontSize: '0.85rem',
            color: '#ef4444',
            marginBottom: '1rem',
          }}>
            {error}
          </div>
        )}

        {/* Amount Input */}
        <div className="form-section">
          <label className="form-label">
            <Icon name="dollar-sign" size={14} style={{ marginRight: '0.4rem' }} />
            Amount
          </label>
          <div style={{ position: 'relative' }}>
            <input
              className="form-input"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ paddingRight: '100px' }}
            />
            <div style={{
              position: 'absolute',
              right: '0.5rem',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {selectedToken}
              </span>
            </div>
          </div>
        </div>

        {/* Chain Selector */}
        <div className="form-section">
          <label className="form-label">
            <Icon name="hub" size={14} style={{ marginRight: '0.4rem' }} />
            Select Network
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
            {CHAIN_META.map((chain) => (
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

        {/* Token Selector */}
        <div className="form-section">
          <label className="form-label">
            <Icon name="coins" size={14} style={{ marginRight: '0.4rem' }} />
            Select Token
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
            {TOKENS.map(token => (
              <button
                key={token.symbol}
                onClick={() => setSelectedToken(token.symbol)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: '10px',
                  border: selectedToken === token.symbol ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                  background: selectedToken === token.symbol ? 'var(--accent-dim)' : 'var(--bg-input)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Icon name={token.icon} size={20} color={token.color} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {token.symbol}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {token.symbol}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Available Balances */}
        <div className="form-section">
          <label className="form-label">
            <Icon name="wallet" size={14} style={{ marginRight: '0.4rem' }} />
            Available {selectedToken} by Chain
          </label>
          {walletBalances ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
              {CHAIN_META.map(chain => {
                const row = walletBalances.find(b => b.chain === chain.key && b.token === selectedToken);
                const balance = row?.balance;
                const usd = row?.usdValue;
                return (
                  <div
                    key={chain.key}
                    style={{
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-input)',
                      borderRadius: '10px',
                      padding: '0.65rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                      <img src={chain.icon} alt={chain.label} style={{ width: 16, height: 16, borderRadius: '50%' }} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{chain.label}</span>
                    </div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {formatBalance(balance)} {selectedToken}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {usd !== undefined ? `$${usd.toFixed(2)}` : '--'}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Connect your wallet to see per-chain balances.
            </div>
          )}
        </div>

        {/* Transaction Summary */}
        {amount && parseFloat(amount) > 0 && (
          <div style={{
            background: 'var(--bg-input)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Transaction Summary
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Amount</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {amount} {selectedToken}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Network Fee</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ~$0.01
              </span>
            </div>
            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0.5rem 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Total</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {amount} {selectedToken}
              </span>
            </div>
          </div>
        )}

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '1rem',
            fontSize: '0.8rem',
            color: 'var(--danger)'
          }}>
            {error}
          </div>
        )}

        {/* Send Button */}
        <button
          className="btn-primary"
          onClick={handleSend}
          disabled={!recipient || !amount || parseFloat(amount) <= 0 || sending}
          style={{ width: '100%', padding: '0.9rem' }}
        >
          {sending ? (
            <>
              <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              Sending...
            </>
          ) : (
            <>
              <Icon name="paper-plane" size={18} /> Send {selectedToken}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
