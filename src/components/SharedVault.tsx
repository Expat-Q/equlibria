import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import type { SavingsPlan } from '../types';
import { CATEGORIES } from '../types';
import { DepositModal } from './DepositModal';
import { WithdrawalModal } from './WithdrawalModal';
import { ConfirmModal } from './ConfirmModal';
import { WithdrawalApprovalList, type WithdrawalRequest } from './WithdrawalApprovalList';
import { withdrawFromPool } from '../services/chainService';
import { ActivityFeed, type ActivityEvent } from './ActivityFeed';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { API_BASE } from '../services/api';

interface Props {
  plan: SavingsPlan;
  wallet: any;
  onBack: () => void;
  onUpdatePlan: (plan: SavingsPlan) => void;
  
}



export function SharedVault({ plan, wallet, onBack, onUpdatePlan }: Props) {
  const authFetch = useAuthFetch();
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const [confirmStep, setConfirmStep] = useState<'none' | 'penalty' | 'jointApproval'>('none');
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [joining, setJoining] = useState(false);
  const cat = CATEGORIES.find(c => c.value === plan.category)!;
  const progress = plan.targetAmount > 0
    ? Math.min((plan.currentAmount / plan.targetAmount) * 100, 100)
    : 0;

  const youPct = plan.currentAmount > 0
    ? Math.round((plan.myContribution / plan.currentAmount) * 100)
    : 50;
  const partnerPct = 100 - youPct;

  // Load withdrawal requests
  useEffect(() => {
    const loadWithdrawalRequests = async () => {
      try {
        const response = await authFetch(`${API_BASE}/api/withdrawals/${plan.id}`);
        if (response.ok) {
          const data = await response.json();
          setWithdrawalRequests(data.requests.map((r: any) => ({
            id: r._id,
            planId: r.planId,
            requestedBy: r.requestedBy,
            amount: r.amount,
            reason: r.reason,
            status: r.status,
            creatorApproved: r.creatorApproved,
            partnerApproved: r.partnerApproved,
            txHash: r.txHash,
            txStatus: r.txStatus,
            createdAt: new Date(r.createdAt),
          })));
        }
      } catch (err) {
        console.error('Failed to load withdrawal requests:', err);
      }
    };
    loadWithdrawalRequests();
  }, [plan.id]);

  // Load activity feed
  useEffect(() => {
    const loadActivityFeed = async () => {
      try {
        const response = await authFetch(`${API_BASE}/api/activity/${plan.id}`);
        if (response.ok) {
          const data = await response.json();
          setActivityEvents(data.logs.map((log: any) => ({
            id: log._id,
            planId: log.planId,
            type: log.type,
            actor: log.actor,
            amount: log.amount,
            txHash: log.txHash,
            metadata: log.metadata,
            createdAt: log.createdAt,
          })));
        }
      } catch (err) {
        console.error('Failed to load activity feed:', err);
      }
    };
    // Fetch immediately, and whenever the plan's balance changes it usually means a new activity occurred.
    loadActivityFeed();
  }, [plan.id, plan.currentAmount]);

  const handleSimulateAccept = () => {
    onUpdatePlan({ ...plan, isPartnerAccepted: true });
  };

  const handleJoinVault = async () => {
    if (!wallet?.address || !plan.partnerAddress) return;
    setJoining(true);
    try {
      const response = await authFetch(`${API_BASE}/api/vaults/${plan.id}/join`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerAddress: wallet.address }),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to join vault');
      }
      onUpdatePlan({ ...plan, isPartnerAccepted: true });
    } catch (err) {
      console.error('Join vault failed:', err);
    } finally {
      setJoining(false);
    }
  };

  const handleRequestWithdrawal = async (amount: number, reason: string) => {
    try {
      // Get current user address from localStorage or wallet - for now use wallet metadata
      const userAddress = wallet?.address || 'user';
      
      const response = await authFetch(`${API_BASE}/api/withdrawals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          requestedBy: userAddress,
          amount,
          reason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to request withdrawal');
      }

      const data = await response.json();
      const newRequest = {
        id: data.request._id,
        planId: data.request.planId,
        requestedBy: data.request.requestedBy,
        amount: data.request.amount,
        reason: data.request.reason,
        status: data.request.status,
        creatorApproved: data.request.creatorApproved,
        partnerApproved: data.request.partnerApproved,
        txHash: data.request.txHash,
        txStatus: data.request.txStatus,
        createdAt: new Date(data.request.createdAt),
      };
      
      setWithdrawalRequests(prev => [newRequest, ...prev]);

      // Log activity event
      await authFetch(`${API_BASE}/api/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          type: 'withdrawal_requested',
          actor: userAddress,
          amount,
          metadata: { reason },
        }),
      });
    } catch (err) {
      throw err;
    }
  };

  const handleApproveWithdrawal = async (requestId: string) => {
    try {
      const userAddress = wallet?.address || 'user';
      
      const response = await authFetch(`${API_BASE}/api/withdrawals/${requestId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approverAddress: userAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve withdrawal');
      }

      const data = await response.json();
      const request = withdrawalRequests.find(r => r.id === requestId);
      
      setWithdrawalRequests(prev =>
        prev.map(r => r.id === requestId
          ? {
              ...r,
              creatorApproved: data.request.creatorApproved,
              partnerApproved: data.request.partnerApproved,
              status: data.request.status,
            }
          : r
        )
      );

      // Log approval event
      await authFetch(`${API_BASE}/api/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          type: 'withdrawal_approved',
          actor: userAddress,
          amount: request?.amount || 0,
          metadata: { status: data.request.status },
        }),
      });
    } catch (err) {
      throw err;
    }
  };

  const handleRejectWithdrawal = async (requestId: string) => {
    try {
      const userAddress = wallet?.address || 'user';
      
      const response = await authFetch(`${API_BASE}/api/withdrawals/${requestId}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejectedBy: userAddress,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject withdrawal');
      }

      const data = await response.json();
      
      setWithdrawalRequests(prev =>
        prev.map(r => r.id === requestId
          ? { ...r, status: data.request.status }
          : r
        )
      );

      // Log rejection event (already logged on backend)
    } catch (err) {
      throw err;
    }
  };

  const handleExecuteWithdrawal = async (requestId: string) => {
    const request = withdrawalRequests.find(r => r.id === requestId);
    if (!request) return;
    if (!wallet) throw new Error('Wallet not connected');
    if (!plan.depositToDefi) throw new Error('Withdrawals are only available for DeFi vaults');
    if (!plan.defiVaultAddress) throw new Error('Missing vault token address');

    const isEarly = new Date() < new Date(plan.withdrawalDate);
    const result = await withdrawFromPool(
      wallet,
      plan.token as any,
      String(request.amount),
      plan.chain as any,
      isEarly,
      plan.defiVaultAddress
    );

    const executorAddress = wallet.address;
    await authFetch(`${API_BASE}/api/withdrawals/${requestId}/execute`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ executorAddress, txHash: result.txHash, txStatus: result.status || null }),
    });

    const updatedPlan: SavingsPlan = {
      ...plan,
      currentAmount: Math.max(0, plan.currentAmount - request.amount),
      myContribution: request.requestedBy.toLowerCase() === wallet.address.toLowerCase()
        ? Math.max(0, plan.myContribution - request.amount)
        : plan.myContribution,
      partnerContribution: request.requestedBy.toLowerCase() === (plan.partnerAddress || '').toLowerCase()
        ? Math.max(0, plan.partnerContribution - request.amount)
        : plan.partnerContribution,
    };
    onUpdatePlan(updatedPlan);

    setWithdrawalRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'executed', txHash: result.txHash, txStatus: result.status } : r));

    await authFetch(`${API_BASE}/api/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        planId: plan.id,
        type: 'withdrawal_executed',
        actor: executorAddress,
        amount: request.amount,
        txHash: result.txHash,
        metadata: { status: 'executed', txStatus: result.status || null },
      }),
    });
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', paddingBottom: '4rem' }}>
      <button className="btn-ghost" style={{ marginBottom: '1.5rem', paddingLeft: 0, color: 'var(--text-secondary)' }} onClick={onBack}>
        <Icon name="arrow_back" size={16} /> Back to Dashboard
      </button>

      {/* Vault Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
            {plan.name}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
            <span className={`badge ${plan.type === 'joint' ? 'badge-purple' : 'badge-green'}`} style={{ padding: '0.35rem 0.65rem' }}>
              <Icon name={plan.type === 'joint' ? 'group' : 'lock'} size={14} /> {plan.type === 'joint' ? 'Joint Vault' : 'Individual Vault'}
            </span>
          </div>
        </div>
        <div style={{ fontSize: '3rem', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '24px', padding: '1rem', width: '80px', height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.04)' }}>
          {cat.emoji}
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* LEFT COLUMN - FINANCIALS & DETAILS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Top Financial Overview Card */}
          <div className="chart-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Primary Balance Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Total Vault Savings</div>
                <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1, letterSpacing: '-0.03em' }}>
                  ${plan.currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              {/* Yield & APY Summary Blocks */}
              <div style={{ display: 'flex', gap: '1.5rem' }}>
                <div style={{ background: 'var(--bg-root)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border-subtle)', minWidth: '120px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Yield Earned</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                    +{(plan.yieldEarned || 0).toFixed(4)} <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{plan.token}</span>
                  </div>
                </div>
                <div style={{ background: 'var(--bg-root)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border-subtle)', minWidth: '100px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Net APY</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                    ~{plan.apy}%
                  </div>
                </div>
              </div>
            </div>

            {/* Target Progress Bar */}
            <div style={{ background: 'var(--bg-root)', padding: '1.25rem', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Target: ${plan.targetAmount.toLocaleString()} {plan.token}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{progress.toFixed(1)}%</span>
              </div>
              <div style={{ width: '100%', height: '8px', background: 'var(--bg-input)', borderRadius: '10px', overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: 'linear-gradient(90deg, var(--accent-primary), #ffb84d)', borderRadius: '10px', transition: 'width 0.5s ease' }} />
              </div>
            </div>
          </div>

          {/* Vault Terms Grid */}
          <div className="section-header">
            <h3 className="section-title"><Icon name="lock" size={18} style={{ marginRight: '0.5rem' }} /> Vault Terms</h3>
          </div>
          <div className="chart-card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1.5rem' }}>
            <div>
              <div className="card-label">Created On</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                {new Date(plan.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div>
              <div className="card-label">DeFi Protocol</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                {plan.depositToDefi ? 'LI.FI Protocol' : 'None'}
              </div>
            </div>
            <div>
              <div className="card-label">Pool</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                {plan.depositToDefi
                  ? (plan.defiVaultName ? `${plan.defiProtocol || 'LI.FI'} · ${plan.defiVaultName}` : 'LI.FI Best Vault')
                  : 'Equilibria Treasury'}
              </div>
            </div>
            <div>
              <div className="card-label">Lock Duration</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.35rem' }}>
                {plan.lockDurationDays || 30} Days
              </div>
            </div>
            <div>
              <div className="card-label">Unlock Date</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--accent-primary)', marginTop: '0.35rem' }}>
                {plan.withdrawalDate ? new Date(plan.withdrawalDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}
              </div>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="section-header" style={{ marginTop: '1rem' }}>
            <h3 className="section-title"><Icon name="timeline" size={18} style={{ marginRight: '0.5rem' }} />Activity Timeline</h3>
          </div>
          <div className="tx-list">
            <ActivityFeed events={activityEvents} isLoading={false} />
          </div>

        </div>

        {/* RIGHT COLUMN - ACTIONS & GOVERNANCE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Quick Actions Card */}
          <div className="chart-card" style={{ border: '1px solid var(--border-active)' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vault Operations
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button 
                className="btn-primary" 
                onClick={() => setShowDeposit(true)} 
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem 1rem', gap: '0.5rem', borderRadius: '16px' }}
              >
                <Icon name="add" size={24} /> 
                <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Deposit</span>
              </button>
              
              <button
                className="btn-white"
                onClick={() => setConfirmStep('penalty')}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem 1rem', gap: '0.5rem', background: '#fff0f0', color: '#d93025', border: '1px solid #ffccd0', borderRadius: '16px' }}
              >
                <Icon name="warning" size={24} color="#d93025" /> 
                <span style={{ fontSize: '0.95rem', fontWeight: 700 }}>Withdraw</span>
              </button>
            </div>
          </div>

          {/* Split Logic (Joint Only) */}
          {plan.type === 'joint' && (
            <>
              <div className="chart-card">
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Icon name="pie_chart" size={16} color="var(--text-muted)" /> Contribution Split
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* Your Contribution */}
                  <div style={{ background: 'var(--bg-root)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="card-label">You</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{youPct}%</span>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.6rem' }}>
                      ${plan.myContribution.toLocaleString()}
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ width: `${youPct}%`, height: '100%', background: 'var(--accent-primary)' }} />
                    </div>
                  </div>

                  {/* Partner Contribution */}
                  <div style={{ background: 'var(--bg-root)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span className="card-label">Partner</span>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>{partnerPct}%</span>
                    </div>
                    <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#a78bfa', marginBottom: '0.4rem' }}>
                      ${plan.partnerContribution.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.6rem' }}>
                      {plan.partnerAddress ? (<span><Icon name="account_balance_wallet" size={12}/> {plan.partnerAddress.slice(0,6)}...{plan.partnerAddress.slice(-4)}</span>) : 'Awaiting Deposit'}
                    </div>
                    <div style={{ width: '100%', height: '6px', background: 'var(--bg-input)', borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ width: `${partnerPct}%`, height: '100%', background: '#a78bfa' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Partner Connection Status */}
              <div className="chart-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <Icon name="link" size={18} color={plan.isPartnerAccepted ? 'var(--success)' : 'var(--text-muted)'} />
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Partner Link</div>
                  </div>
                  {plan.isPartnerAccepted 
                    ? <div className="badge" style={{ background: 'rgba(52, 199, 89, 0.1)', color: 'var(--success)' }}>Connected</div>
                    : <div className="badge badge-orange">Pending</div>
                  }
                </div>

                {!plan.isPartnerAccepted && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: 1.4 }}>
                      Your partner hasn't joined this vault yet. They should connect with this wallet address:
                    </p>
                    <div style={{ flex: 1, background: 'var(--bg-input)', padding: '0.6rem', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)', border: '1px dashed var(--border-active)', textAlign: 'center' }}>
                      {plan.partnerAddress || 'No partner address set'}
                    </div>
                    {wallet?.address && plan.partnerAddress && wallet.address.toLowerCase() === plan.partnerAddress.toLowerCase() ? (
                      <button
                        className="btn-primary"
                        style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.8rem' }}
                        onClick={handleJoinVault}
                        disabled={joining}
                      >
                        {joining ? 'Joining...' : 'Join Vault'}
                      </button>
                    ) : (
                      <button className="btn-ghost" style={{ width: '100%', marginTop: '0.75rem', fontSize: '0.75rem' }} onClick={handleSimulateAccept}>
                        🎭 Demo: Simulate Setup
                      </button>
                    )}
                  </div>
                )}
                {plan.isPartnerAccepted && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                    Dual-signature approvals are active. Both partners have transparent insight.
                  </div>
                )}
              </div>

              {/* Withdrawal Approvals queue */}
              {withdrawalRequests.length > 0 && (
                <div className="chart-card">
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Icon name="pending_actions" size={16} color="var(--accent-primary)" /> Pending Requests
                  </div>
                  <WithdrawalApprovalList
                    requests={withdrawalRequests}
                    currentUserAddress={wallet?.address || ''}
                    isCreator={true}
                    onApprove={handleApproveWithdrawal}
                    onReject={handleRejectWithdrawal}
                    onExecute={handleExecuteWithdrawal}
                    canExecute={Boolean(wallet?.address)}
                  />
                </div>
              )}
            </>
          )}

        </div>
      </div>

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

      {showWithdrawal && (
        <WithdrawalModal
          plan={plan}
          myContribution={plan.myContribution}
          partnerContribution={plan.partnerContribution}
          onClose={() => setShowWithdrawal(false)}
          onSubmit={handleRequestWithdrawal}
        />
      )}

      {confirmStep === 'penalty' && (
        <ConfirmModal
          title="Withdrawal Penalty"
          message="5% of your savings will be deducted. Proceed?"
          confirmText="Proceed"
          cancelText="Cancel"
          isDanger={true}
          onConfirm={() => {
            if (plan.type === 'joint') {
              setConfirmStep('jointApproval');
            } else {
              setConfirmStep('none');
              setShowWithdrawal(true);
            }
          }}
          onCancel={() => setConfirmStep('none')}
        />
      )}

      {confirmStep === 'jointApproval' && (
        <ConfirmModal
          title="Joint Vault Withdrawal"
          message="Emergency Withdrawal on a Joint Vault requires partner approval. Proceed?"
          confirmText="Request Approval"
          cancelText="Cancel"
          onConfirm={() => {
            setConfirmStep('none');
            setShowWithdrawal(true);
          }}
          onCancel={() => setConfirmStep('none')}
        />
      )}
    </div>
  );
}
