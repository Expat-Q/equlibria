import { Icon } from './Icon';

export interface ActivityEvent {
  id: string;
  planId: string;
  type: 'deposit' | 'withdrawal_requested' | 'withdrawal_approved' | 'withdrawal_rejected' | 'withdrawal_executed' | 'partner_joined' | 'vault_created';
  actor: string;
  amount: number;
  txHash?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

interface Props {
  events: ActivityEvent[];
  isLoading?: boolean;
}

export function ActivityFeed({ events, isLoading = false }: Props) {
  const formatTime = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return date.toLocaleDateString();
  };

  const getEventConfig = (type: ActivityEvent['type']) => {
    const configs: Record<string, { icon: string; color: string; label: string }> = {
      vault_created: { icon: 'add_circle', color: '#3b82f6', label: 'Vault Created' },
      partner_joined: { icon: 'person_add', color: '#10d9a0', label: 'Partner Joined' },
      deposit: { icon: 'download', color: '#10d9a0', label: 'Deposited' },
      withdrawal_requested: { icon: 'payment', color: '#f59e0b', label: 'Withdrawal Requested' },
      withdrawal_approved: { icon: 'check_circle', color: '#10d9a0', label: 'Withdrawal Approved' },
      withdrawal_rejected: { icon: 'cancel', color: '#ef4444', label: 'Withdrawal Rejected' },
      withdrawal_executed: { icon: 'send', color: '#8b5cf6', label: 'Withdrawal Executed' },
    };
    return configs[type] || { icon: 'info', color: '#6b7280', label: 'Event' };
  };

  const formatActorAddress = (address: string): string => {
    if (!address) return 'Unknown';
    if (address.length > 10) return `${address.slice(0, 6)}...${address.slice(-4)}`;
    return address;
  };

  const getExplorerBase = (chainId?: number, chain?: string) => {
    const byChainId: Record<number, string> = {
      1: 'https://etherscan.io/tx/',
      8453: 'https://basescan.org/tx/',
      42161: 'https://arbiscan.io/tx/',
      56: 'https://bscscan.com/tx/',
    };
    if (chainId && byChainId[chainId]) return byChainId[chainId];

    const key = (chain || '').toLowerCase();
    if (key === 'ethereum') return byChainId[1];
    if (key === 'base') return byChainId[8453];
    if (key === 'arbitrum') return byChainId[42161];
    if (key === 'bnb') return byChainId[56];
    return byChainId[8453];
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Icon name="schedule" size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
        <div>Loading activity...</div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Icon name="history" size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
        <div>No activity yet</div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Timeline line */}
      <div
        style={{
          position: 'absolute',
          left: '16px',
          top: 0,
          bottom: 0,
          width: '2px',
          background: 'linear-gradient(to bottom, var(--border-subtle), transparent)',
        }}
      />

      {/* Events */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {events.map((event) => {
          const config = getEventConfig(event.type);

          return (
            <div key={event.id} style={{ position: 'relative', paddingLeft: '4rem' }}>
              {/* Timeline dot */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: '0.5rem',
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: config.color,
                  border: '3px solid var(--bg-card)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  zIndex: 10,
                }}
              >
                <Icon name={config.icon} size={16} color="white" />
              </div>

              {/* Event card */}
              <div
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  padding: '1rem',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-active)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-input)';
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {config.label}
                    </span>
                    {event.amount > 0 && (
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: config.color }}>
                        ${event.amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {formatTime(typeof event.createdAt === 'string' ? new Date(event.createdAt) : event.createdAt)}
                  </span>
                </div>

                {/* Actor */}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
                  by <span style={{ fontFamily: 'monospace', fontWeight: 500, color: 'var(--accent-primary)' }}>
                    {formatActorAddress(event.actor)}
                  </span>
                </div>

                {/* Metadata */}
                {(event.metadata || event.txHash) && (
                  <>
                    {(event.txHash || event.metadata?.txHash) && (
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                        {(() => {
                          const txHash = event.txHash || event.metadata?.txHash;
                          const explorerBase = getExplorerBase(event.metadata?.chainId, event.metadata?.chain);
                          if (!txHash) return null;
                          return (
                        <a 
                          href={`${explorerBase}${txHash}`} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{
                            color: 'var(--accent-primary)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.2rem',
                          }}
                        >
                          <Icon name="receipt_long" size={14} />
                          Tx {txHash.slice(0, 6)}...{txHash.slice(-4)}
                          <Icon name="open_in_new" size={12} />
                        </a>
                          );
                        })()}
                      </div>
                    )}
                    {event.metadata && event.metadata.pointsEarned !== undefined && (
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: '#10d9a0', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Icon name="stars" size={14} color="#10d9a0" />
                        +{event.metadata.pointsEarned} pts
                      </div>
                    )}
                    {event.metadata && event.metadata.reason && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', fontStyle: 'italic' }}>
                        "{event.metadata.reason}"
                      </div>
                    )}
                    {event.metadata && event.metadata.status && (
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                        <span style={{
                          display: 'inline-block',
                          background: event.metadata.status === 'approved' ? 'rgba(16, 217, 160, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          color: event.metadata.status === 'approved' ? '#10d9a0' : '#ef4444',
                          padding: '0.25rem 0.75rem',
                          borderRadius: 6,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          {event.metadata.status === 'approved' ? '✓ Approved' : '✗ Rejected'}
                        </span>
                      </div>
                    )}
                    {event.metadata && event.metadata.txStatus && (
                      <div style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                        Status: {event.metadata.txStatus}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
