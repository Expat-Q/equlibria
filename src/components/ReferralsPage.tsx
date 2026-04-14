import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { useCurrency } from '../context/CurrencyContext';
import type { SavingsPlan } from '../types';
import { API_BASE } from '../services/api';

interface ReferralsPageProps {
  plans: SavingsPlan[];
  userAddress: string;
  username: string;
}

export const ReferralsPage: React.FC<ReferralsPageProps> = ({ plans, userAddress, username }) => {
  const { format } = useCurrency();
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [totalReferrals] = useState(0);
  const [pointsEarned, setPointsEarned] = useState(0);

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/${userAddress}`);
        if (res.ok) {
          const data = await res.json();
          setReferralCode(data.referralCode || username || userAddress.slice(2, 10));
          setPointsEarned(data.tokenPoints || 0);
        }
      } catch (err) {
        console.warn('Failed to fetch referral data');
      }
    };
    if (userAddress) fetchReferralData();
  }, [userAddress, username]);

  const hasActivePlan = plans.some(p => p.currentAmount > 0);
  const referralLink = `${window.location.origin}?ref=${referralCode || username || userAddress.slice(2, 10)}`;

  const stats = [
    { label: 'Total Referrals', value: String(totalReferrals), icon: <Icon name="people" size={20} /> },
    { label: 'Points Earned', value: String(pointsEarned), icon: <Icon name="stars" size={20} /> },
    { label: 'Potential Rewards', value: format(25), icon: <Icon name="payments" size={20} /> },
  ];

  const handleCopy = () => {
    if (!hasActivePlan) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="greeting-section" style={{ marginBottom: '2.5rem' }}>
        <h1 className="greeting-title">Invite Friends, Earn Points</h1>
        <p className="greeting-subtitle">Build your savings community and get rewarded as your network grows.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {stats.map((stat, i) => (
          <div key={i} className="chart-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
              {stat.icon}
              <span className="card-label">{stat.label}</span>
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="tx-list" style={{ padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤝</div>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Your Referral Link</h2>
        
        {!hasActivePlan ? (
          <div style={{ 
            background: 'rgba(245, 158, 11, 0.1)', 
            border: '1px solid rgba(245, 158, 11, 0.3)', 
            borderRadius: 12, 
            padding: '1.5rem',
            color: '#92400e',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <Icon name="lock" size={24} style={{ marginBottom: '0.75rem' }} />
            <p style={{ fontWeight: 600, margin: 0 }}>Referral Link Locked</p>
            <p style={{ fontSize: '0.9rem', marginBottom: 0 }}>You must have at least one active savings plan with funds to activate your referral link.</p>
            <button 
              className="btn-primary" 
              style={{ marginTop: '1rem' }}
              onClick={() => { /* In App.tsx this would trigger setActiveTab('dashboard') */ }}
            >
              Go Create a Plan
            </button>
          </div>
        ) : (
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div style={{ 
              display: 'flex', 
              gap: '0.75rem', 
              alignItems: 'center',
              background: 'var(--bg-input)',
              padding: '0.5rem 0.5rem 0.5rem 1rem',
              borderRadius: 12,
              border: '1px solid var(--border-subtle)',
              marginBottom: '1rem'
            }}>
              <span style={{ flex: 1, fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {referralLink}
              </span>
              <button 
                className="btn-primary" 
                style={{ padding: '0.6rem 1.25rem' }}
                onClick={handleCopy}
              >
                {copied ? <Icon name="check" size={18} /> : 'Copy Link'}
              </button>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Share this link with friends. When they create their first plan, you both earn bonus points!
            </p>
          </div>
        )}
      </div>

      <div className="section-header" style={{ marginTop: '3rem' }}>
        <h3 className="section-title">How it works</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
        {[
          { title: '1. Share Link', desc: 'Send your unique referral link to friends and family.', icon: 'share' },
          { title: '2. They Join', desc: 'Your friend creates a savings plan and starts their journey.', icon: 'directions_run' },
          { title: '3. Both Earn', desc: 'Receive 200 Token Points for every successful referral.', icon: 'card_giftcard' },
        ].map((step, i) => (
          <div key={i} style={{ padding: '1.5rem', background: 'var(--bg-card)', borderRadius: 16, border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>
              <Icon name={step.icon} size={40} color="var(--accent-primary)" />
            </div>
            <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>{step.title}</h4>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
