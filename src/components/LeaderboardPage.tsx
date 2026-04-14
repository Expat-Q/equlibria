import React, { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { useCurrency } from '../context/CurrencyContext';
import { API_BASE } from '../services/api';

interface LeaderboardEntry {
  rank: number;
  username: string;
  displayName: string;
  avatar: string | null;
  amount: number;
  points: number;
  isMe?: boolean;
}

export const LeaderboardPage: React.FC<{ currentUsername?: string }> = ({ currentUsername }) => {
  const { format } = useCurrency();
  const [view, setView] = useState<'savers' | 'points'>('savers');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/leaderboard`);
        const data = await res.json();
        const entries: LeaderboardEntry[] = (data.leaderboard || []).map((u: any) => ({
          rank: u.rank,
          username: u.username,
          displayName: u.displayName || u.username,
          avatar: u.avatar,
          amount: u.savings || 0,
          points: u.points || 0,
          isMe: currentUsername ? u.username === currentUsername.toLowerCase() : false,
        }));
        setLeaderboard(entries);
      } catch (err) {
        console.warn('Failed to fetch leaderboard, using empty state:', err);
        setLeaderboard([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [currentUsername]);

  const sortedData = [...leaderboard].sort((a, b) => 
    view === 'savers' ? b.amount - a.amount : b.points - a.points
  );

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      <div className="greeting-section" style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 className="greeting-title">Global Leaderboard</h1>
        <p className="greeting-subtitle">Celebrate the top savers and community pillars in the Equilibria ecosystem.</p>
        
        <div style={{ 
          display: 'inline-flex', 
          background: 'var(--bg-card)', 
          padding: '4px', 
          borderRadius: 12, 
          border: '1px solid var(--border-subtle)',
          marginTop: '1.5rem'
        }}>
          <button 
            onClick={() => setView('savers')}
            style={{ 
              padding: '0.6rem 1.5rem', 
              borderRadius: 8, 
              border: 'none',
              background: view === 'savers' ? 'var(--accent-primary)' : 'transparent',
              color: view === 'savers' ? 'white' : 'var(--text-muted)',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Top Savers
          </button>
          <button 
            onClick={() => setView('points')}
            style={{ 
              padding: '0.6rem 1.5rem', 
              borderRadius: 8, 
              border: 'none',
              background: view === 'points' ? 'var(--accent-primary)' : 'transparent',
              color: view === 'points' ? 'white' : 'var(--text-muted)',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Point Leaders
          </button>
        </div>
      </div>

      <div className="tx-list" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon name="schedule" size={32} style={{ opacity: 0.5, marginBottom: '0.5rem' }} />
            <div>Loading leaderboard...</div>
          </div>
        ) : sortedData.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Icon name="emoji_events" size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No savers yet</div>
            <div style={{ fontSize: '0.9rem' }}>Be the first to deposit and claim the #1 spot!</div>
          </div>
        ) : (
        <>
        <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 140px', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase' }}>
          <span>Rank</span>
          <span>User</span>
          <span style={{ textAlign: 'right' }}>{view === 'savers' ? 'Total Saved' : 'Token Points'}</span>
        </div>
        
        {sortedData.map((user, i) => (
          <div 
            key={user.username} 
            style={{ 
              display: 'grid', 
              gridTemplateColumns: '60px 1fr 140px', 
              padding: '1.25rem 1.5rem', 
              alignItems: 'center',
              borderBottom: i === sortedData.length - 1 ? 'none' : '1px solid var(--border-subtle)',
              background: user.isMe ? 'rgba(255, 140, 0, 0.05)' : 'transparent',
              position: 'relative'
            }}
          >
            {user.isMe && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 4, background: 'var(--accent-primary)', borderRadius: '0 4px 4px 0' }} />}
            
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: i < 3 ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ 
                width: 40, height: 40, borderRadius: '50%', 
                background: `hsl(${i * 45}, 70%, 50%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontWeight: 700, fontSize: '1rem'
              }}>
                {user.displayName.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {user.displayName} {user.isMe && <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', marginLeft: '0.25rem' }}>(YOU)</span>}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{user.username}</div>
              </div>
            </div>

            <div style={{ textAlign: 'right', fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
              {view === 'savers' ? format(user.amount) : `${user.points.toLocaleString()} pts`}
            </div>
          </div>
        ))}
        </>
        )}
      </div>

      <div style={{ marginTop: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        <Icon name="info" size={14} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
        Leaderboard updates every 30 minutes based on on-chain valuations.
      </div>
    </div>
  );
};
