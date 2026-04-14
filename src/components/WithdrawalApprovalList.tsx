import { Icon } from './Icon';

export interface WithdrawalRequest {
  id: string;
  planId: string;
  requestedBy: string;
  amount: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  creatorApproved: boolean;
  partnerApproved: boolean;
  createdAt: Date;
  txHash?: string;
  txStatus?: string;
}

interface Props {
  requests: WithdrawalRequest[];
  currentUserAddress: string;
  isCreator: boolean;
  onApprove: (requestId: string) => Promise<void>;
  onReject: (requestId: string) => Promise<void>;
  onExecute: (requestId: string) => Promise<void>;
  canExecute: boolean;
}

export function WithdrawalApprovalList({ requests, currentUserAddress, isCreator, onApprove, onReject, onExecute, canExecute }: Props) {
  const pendingRequests = requests.filter(r => r.status === 'pending');
  const otherRequests = requests.filter(r => r.status !== 'pending');

  if (requests.length === 0) return null;

  const getPendingApprovalText = (req: WithdrawalRequest): string => {
    if (isCreator && req.partnerApproved && !req.creatorApproved) {
      return 'Pending your approval';
    } else if (!isCreator && req.creatorApproved && !req.partnerApproved) {
      return 'Pending your approval';
    } else if (req.creatorApproved && req.partnerApproved) {
      return 'Approved by both';
    }
    return 'Pending...';
  };

  const didIRequest = (req: WithdrawalRequest): boolean => {
    return req.requestedBy.toLowerCase() === currentUserAddress.toLowerCase();
  };

  return (
    <div>
      {/* Pending Approvals */}
      {pendingRequests.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="schedule" size={18} /> Pending Approvals ({pendingRequests.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {pendingRequests.map(req => (
              <div
                key={req.id}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 12,
                  padding: '1rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '1rem',
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                    {didIRequest(req) ? 'You requested' : 'Partner requested'} $
                    {req.amount.toFixed(2)}
                  </div>
                  {req.reason && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                      {req.reason}
                    </div>
                  )}
                  <div style={{
                    fontSize: '0.8rem',
                    color: didIRequest(req) || (req.creatorApproved && !req.partnerApproved) || (!req.creatorApproved && req.partnerApproved) ? 'var(--text-muted)' : 'var(--accent-primary)',
                    fontWeight: 500,
                  }}>
                    {getPendingApprovalText(req)}
                  </div>
                </div>

                {/* Action buttons - only show if user hasn't requested it and it's pending their approval */}
                {!didIRequest(req) && (
                  (isCreator && !req.creatorApproved) || (!isCreator && !req.partnerApproved)
                ) && (
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      onClick={() => onApprove(req.id)}
                      className="btn-small"
                      style={{
                        background: 'rgba(16, 217, 160, 0.2)',
                        color: '#10d9a0',
                        border: '1px solid rgba(16, 217, 160, 0.3)',
                        fontSize: '0.8rem',
                        padding: '0.5rem 1rem',
                      }}
                    >
                      <Icon name="check" size={14} /> Approve
                    </button>
                    <button
                      onClick={() => onReject(req.id)}
                      className="btn-small"
                      style={{
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        fontSize: '0.8rem',
                        padding: '0.5rem 1rem',
                      }}
                    >
                      <Icon name="close" size={14} /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed/Rejected History */}
      {otherRequests.length > 0 && (
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Icon name="history" size={18} /> Request History
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {otherRequests.map(req => (
              <div
                key={req.id}
                style={{
                  background: req.status === 'approved' || req.status === 'executed' ? 'rgba(16, 217, 160, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                  border: `1px solid ${req.status === 'approved' || req.status === 'executed' ? 'rgba(16, 217, 160, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                  borderRadius: 12,
                  padding: '1rem',
                  opacity: 0.7,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                  <Icon
                    name={req.status === 'approved' || req.status === 'executed' ? 'check_circle' : 'cancel'}
                    size={18}
                    style={{ color: req.status === 'approved' || req.status === 'executed' ? '#10d9a0' : '#ef4444' }}
                  />
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {req.status === 'executed' ? 'Executed' : req.status === 'approved' ? 'Approved' : 'Rejected'} - ${req.amount.toFixed(2)}
                  </div>
                </div>
                {req.reason && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginLeft: '1.75rem' }}>
                    {req.reason}
                  </div>
                )}
                {req.txHash && (
                  <div style={{ fontSize: '0.8rem', marginLeft: '1.75rem', marginTop: '0.5rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Tx:</span> {req.txHash.slice(0, 6)}...{req.txHash.slice(-4)}
                    {req.txStatus && (
                      <span style={{ marginLeft: '0.5rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                        {req.txStatus}
                      </span>
                    )}
                  </div>
                )}
                {req.status === 'approved' && canExecute && req.creatorApproved && req.partnerApproved && (
                  <button
                    onClick={() => onExecute(req.id)}
                    className="btn-small"
                    style={{
                      marginTop: '0.75rem',
                      background: 'rgba(59, 130, 246, 0.15)',
                      color: '#3b82f6',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      fontSize: '0.8rem',
                      padding: '0.5rem 1rem',
                    }}
                  >
                    <Icon name="send" size={14} /> Execute Withdrawal
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
