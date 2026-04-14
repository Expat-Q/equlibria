import { useState, useRef, useEffect, useCallback } from 'react';
import { Icon } from './Icon';
import type { SavingsPlan } from '../types';
import { API_BASE } from '../services/api';

type SwapToken = 'ETH' | 'USDC' | 'USDT';

const SWAP_TOKENS: { symbol: SwapToken; name: string; color: string }[] = [
  { symbol: 'ETH',  name: 'Ethereum',  color: '#627eea' },
  { symbol: 'USDC', name: 'USD Coin',  color: '#2775ca' },
  { symbol: 'USDT', name: 'Tether USD', color: '#26a17b' },
];

// Fallback rates for instant display when API hasn't responded yet
const FALLBACK_RATES: Record<string, number> = {
  'ETH-USDC':  3412.5, 'USDC-ETH':  0.000293,
  'ETH-USDT':  3412.5, 'USDT-ETH':  0.000293,
  'USDC-USDT': 1.0001,  'USDT-USDC': 0.9999,
};

interface Props {
  plans: SavingsPlan[];
  wallet?: any;
  isDemo?: boolean;
  walletBalances?: Array<{ chain: string; token: string; balance: number; usdValue: number }>;
  onSwapComplete?: (txHash: string, chain: string, fromToken: string, toToken: string, amount: number) => void;
  onDemoTransaction?: (payload: {
    type: 'swap';
    chain: string;
    token: string;
    amount: number;
    tokenOut: string;
    amountOut: number;
  }) => Promise<void> | void;
}

export function SwapPage({ plans: _plans, wallet: _wallet, isDemo, walletBalances, onSwapComplete }: Props) {
  const [fromToken, setFromToken] = useState<SwapToken>('ETH');
  const [toToken,   setToToken]   = useState<SwapToken>('USDC');
  const [fromAmt,   setFromAmt]   = useState('');
  const [slippage,  setSlippage]  = useState(0.5);
  const [swapping,  setSwapping]  = useState(false);
  const [swapped,   setSwapped]   = useState(false);
  const [liveRate,  setLiveRate]  = useState<number | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [swapError, setSwapError] = useState('');
  const [swapTxHash, setSwapTxHash] = useState('');
  const [swapExplorerUrl, setSwapExplorerUrl] = useState('');
  const [selectedChain, setSelectedChain] = useState<'Ethereum' | 'Base' | 'Arbitrum'>('Base');

  const chainKeyMap: Record<string, string> = {
    Ethereum: 'ethereum',
    Base: 'base',
    Arbitrum: 'arbitrum',
  };
  const currentChainKey = chainKeyMap[selectedChain];

  const fromBalance = walletBalances 
    ? (walletBalances.find(b => b.chain === currentChainKey && b.token === fromToken)?.balance || 0)
    : 0;

  const rateKey = `${fromToken}-${toToken}`;
  const rate = liveRate ?? FALLBACK_RATES[rateKey] ?? 1;
  const toAmt = fromAmt ? (parseFloat(fromAmt) * rate).toFixed(6) : '';

  // Fetch a live rate when the token pair or amount changes
  const fetchQuoteDebounced = useCallback(async () => {
    if (!fromAmt || parseFloat(fromAmt) <= 0) {
      setLiveRate(null);
      return;
    }
    setQuoteLoading(true);
    try {
      const decimals = fromToken === 'ETH' ? 18 : 6;
      const rawAmount = BigInt(Math.floor(parseFloat(fromAmt) * (10 ** decimals))).toString();

      const { CHAIN_IDS, TOKEN_ADDRESSES } = await import('../services/chainService');
      const chainId = CHAIN_IDS[currentChainKey as keyof typeof CHAIN_IDS] || 8453;
      const fromAddr = TOKEN_ADDRESSES[currentChainKey as keyof typeof TOKEN_ADDRESSES]?.[fromToken] || '0x0000000000000000000000000000000000000000';
      const toAddr = TOKEN_ADDRESSES[currentChainKey as keyof typeof TOKEN_ADDRESSES]?.[toToken] || '0x0000000000000000000000000000000000000000';

      const res = await fetch(`${API_BASE}/api/swap-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromChain: chainId,
          fromToken: fromAddr,
          toToken: toAddr,
          fromAddress: _wallet?.address || '0x0000000000000000000000000000000000000000',
          fromAmount: rawAmount,
          slippage: slippage / 100,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.estimate?.toAmount) {
          const toDecimals = toToken === 'ETH' ? 18 : 6;
          const outputAmount = Number(data.estimate.toAmount) / (10 ** toDecimals);
          const inputAmount = parseFloat(fromAmt);
          if (inputAmount > 0) {
            setLiveRate(outputAmount / inputAmount);
          }
        }
      }
    } catch (err) {
      console.warn('Swap quote fetch failed, using fallback rate');
    } finally {
      setQuoteLoading(false);
    }
  }, [fromAmt, fromToken, toToken, slippage]);

  useEffect(() => {
    const timer = setTimeout(fetchQuoteDebounced, 600);
    return () => clearTimeout(timer);
  }, [fetchQuoteDebounced]);

  const flip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmt(toAmt);
    setLiveRate(null);
  };

  const handleSwap = async () => {
    if (!fromAmt || parseFloat(fromAmt) <= 0) return;
    if (parseFloat(fromAmt) > fromBalance) {
      setSwapError('Insufficient balance for this swap.');
      return;
    }
    setSwapping(true);
    setSwapError('');
    setSwapTxHash('');
    setSwapExplorerUrl('');
    
    try {
      if (!_wallet) throw new Error('No wallet connected for swap execution.');
      
      const { executeSwap } = await import('../services/chainService');
      const result = await executeSwap(
          _wallet,
          fromToken as any,
          toToken as any,
          fromAmt,
          currentChainKey as any,
          slippage / 100
      );
      
      setSwapTxHash(result.txHash);
      setSwapExplorerUrl(result.explorerUrl || '');

      onSwapComplete?.(result.txHash, currentChainKey, fromToken, toToken, parseFloat(fromAmt));


      setSwapping(false);
      setSwapped(true);
      setFromAmt('');
      setLiveRate(null);
      setTimeout(() => setSwapped(false), 8000); // Keep success visible longer
    } catch (err: any) {
      console.error('Swap failed:', err);
      setSwapError(err?.message || 'Swap failed. Please try again.');
      setSwapping(false);
    }
  };

  const TokenSelector = ({
    value, onChange, exclude,
  }: { value: SwapToken; onChange: (t: SwapToken) => void; exclude: SwapToken }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleDocClick = (e: MouseEvent) => {
        if (ref.current && !ref.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handleDocClick);
      return () => document.removeEventListener('mousedown', handleDocClick);
    }, []);

    return (
      <div style={{ position: 'relative' }} ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            background: 'var(--bg-card)',
            border: '1.5px solid var(--border-subtle)',
            borderRadius: '10px',
            padding: '0.5rem 0.85rem',
            fontSize: '0.9rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem',
            minWidth: '100px', fontFamily: 'var(--font)',
          }}
        >
          {value}
          <Icon name="expand_more" size={16} color="var(--text-muted)" />
        </button>

        {open && (
           <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px',
              background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
              borderRadius: '8px', zIndex: 100, overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
           }}>
             {SWAP_TOKENS.filter(t => t.symbol !== exclude).map(t => (
               <div
                 key={t.symbol}
                 onClick={() => { onChange(t.symbol); setOpen(false); }}
                 style={{
                   padding: '0.65rem 0.85rem', cursor: 'pointer',
                   fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)',
                   transition: 'background 0.15s ease'
                 }}
                 onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
                 onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
               >
                 {t.symbol}
               </div>
             ))}
           </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 className="greeting-title">Swap Tokens</h1>
        <p className="greeting-sub">Exchange tokens instantly via cross-chain DEX aggregation.</p>
      </div>

      {/* Chain Toggle */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', background: 'var(--bg-card)', padding: '0.35rem', borderRadius: '12px', border: '1px solid var(--border-subtle)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
        {(['Ethereum', 'Base', 'Arbitrum'] as const).map(chain => (
          <button
            key={chain}
            onClick={() => setSelectedChain(chain)}
            style={{
              flex: 1, padding: '0.6rem 0.2rem', borderRadius: '8px', border: 'none',
              background: selectedChain === chain ? 'var(--bg-input)' : 'transparent',
              color: selectedChain === chain ? 'var(--text-primary)' : 'var(--text-muted)',
              fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', transition: 'all 0.2s',
              boxShadow: selectedChain === chain ? '0 1px 3px rgba(0,0,0,0.05)' : 'none'
            }}
          >
            {chain}
          </button>
        ))}
      </div>

      {/* Main swap card */}
      <div className="bank-card" style={{ minHeight: 'auto', cursor: 'default', marginBottom: '1rem', padding: '1.5rem' }}>

        {/* From */}
        <div style={{ background: 'var(--bg-input)', borderRadius: '12px', padding: '1rem 1.1rem', marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>You Pay</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Available: <strong style={{ color: 'var(--text-primary)' }}>{fromBalance.toLocaleString()} {fromToken}</strong>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <input
              type="number"
              value={fromAmt}
              onChange={e => setFromAmt(e.target.value)}
              placeholder="0.00"
              style={{
                flex: 1, background: 'transparent', border: 'none',
                fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)',
                outline: 'none', minWidth: 0, fontFamily: 'var(--font)',
              }}
            />
            {isDemo && fromBalance > 0 && (
               <button 
                 onClick={() => setFromAmt(fromBalance.toString())}
                 style={{
                   background: 'var(--accent-dim)', color: 'var(--accent-primary)',
                   border: 'none', padding: '0.3rem 0.6rem', borderRadius: '6px',
                   fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                   marginRight: '0.2rem'
                 }}
               >MAX</button>
            )}
            <TokenSelector value={fromToken} onChange={setFromToken} exclude={toToken} />
          </div>
        </div>

        {/* Flip button */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '0.2rem 0' }}>
          <button
            onClick={flip}
            style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--bg-card)', border: '1.5px solid var(--border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'transform 0.25s ease, border-color 0.2s',
              color: 'var(--accent-primary)',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'rotate(180deg)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'rotate(0)'; }}
            title="Flip tokens"
          >
            <Icon name="swap_vert" size={18} />
          </button>
        </div>

        {/* To */}
        <div style={{ background: 'var(--bg-input)', borderRadius: '12px', padding: '1rem 1.1rem', marginTop: '0.2rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>You Receive</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {liveRate ? '● Live' : ''}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              flex: 1, fontSize: '1.75rem', fontWeight: 800,
              color: toAmt ? 'var(--success)' : 'var(--text-muted)',
              fontFamily: 'var(--font)',
            }}>
              {toAmt || '0.00'}
            </div>
            <TokenSelector value={toToken} onChange={setToToken} exclude={fromToken} />
          </div>
        </div>

        {/* Rate info */}
        {fromAmt && parseFloat(fromAmt) > 0 && (
          <div style={{
            background: 'var(--bg-input)', borderRadius: '10px',
            padding: '0.85rem 1rem', marginBottom: '1.1rem',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
          }}>
            {[
              { label: 'Rate',         value: `1 ${fromToken} = ${rate < 0.001 ? rate.toExponential(3) : rate.toLocaleString()} ${toToken}` },
              { label: 'Slippage',     value: `${slippage}%` },
              { label: 'Network Fee',  value: '~$0.50' },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>{row.label}</span>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>{row.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Slippage */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.1rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Slippage:</span>
          {[0.1, 0.5, 1.0].map(s => (
            <button key={s} onClick={() => setSlippage(s)} style={{
              padding: '0.28rem 0.65rem', borderRadius: '6px', border: 'none',
              cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font)',
              background: slippage === s ? 'var(--accent-primary)' : 'var(--bg-input)',
              color: slippage === s ? 'white' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}>
              {s}%
            </button>
          ))}
        </div>

        {/* Swap Error */}
        {swapError && (
          <div style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '1rem',
            fontSize: '0.82rem', color: '#ef4444',
          }}>
            {swapError}
          </div>
        )}

        <button
          className="btn-primary"
          style={{ width: '100%', fontSize: '0.95rem', padding: '0.85rem' }}
          onClick={handleSwap}
          disabled={!fromAmt || parseFloat(fromAmt) <= 0 || swapping}
        >
          {swapping ? (
            <><span className="spinner" /> Executing swap via LI.FI...</>
          ) : swapped ? (
            <><Icon name="check_circle" size={18} /> Swap Successful!</>
          ) : (
            <><Icon name="swap_horiz" size={18} /> Swap {fromToken} → {toToken} via LI.FI</>
          )}
        </button>

        {/* Tx Hash result */}
        {swapTxHash && (
          <div style={{
            background: 'var(--bg-input)', borderRadius: 10,
            padding: '0.85rem 1rem', marginTop: '1rem',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Transaction Hash</div>
            <div style={{ fontFamily: 'monospace', color: 'var(--accent-primary)', fontSize: '0.85rem', wordBreak: 'break-all', marginBottom: '0.5rem' }}>
              {swapTxHash.slice(0, 14)}...{swapTxHash.slice(-8)}
            </div>
            {swapExplorerUrl && (
              <a
                href={swapExplorerUrl}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}
              >
                <Icon name="open_in_new" size={14} /> View on Block Explorer ↗
              </a>
            )}
          </div>
        )}
      </div>

      {/* Info note */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '0.65rem',
        background: 'var(--accent-dim)', border: '1px solid var(--border-active)',
        borderRadius: '12px', padding: '0.85rem 1rem', marginTop: '1rem',
      }}>
        <Icon name="info" size={16} color="var(--accent-primary)" />
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
          Swaps are executed on-chain via <strong style={{ color: 'var(--accent-primary)' }}>LI.FI Protocol</strong> for best-in-class cross-chain DEX aggregation across Base, Arbitrum, and BNB.
        </p>
      </div>
    </div>
  );
}
