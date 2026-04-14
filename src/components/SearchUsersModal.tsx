import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { API_BASE } from '../services/api';

interface User {
  privy_id: string;
  address: string;
  username: string;
  displayName: string;
  avatar: string | null;
}

interface Props {
  onClose: () => void;
  onAddContact: (user: User) => void;
  walletAddress: string;
}

export function SearchUsersModal({ onClose, onAddContact, walletAddress }: Props) {
  const authFetch = useAuthFetch();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedUsers, setAddedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Auto-focus search input
    const input = document.querySelector('.search-users-input') as HTMLInputElement;
    if (input) input.focus();
  }, []);

  const handleSearch = async (q: string) => {
    setQuery(q);
    setResults([]);
    setError('');

    if (q.length < 2) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/users/search?q=${encodeURIComponent(q)}`);
      if (!response.ok) throw new Error('Search failed');
      
      const data = await response.json();
      setResults(data.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (user: User) => {
    try {
      const response = await authFetch(`${API_BASE}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: walletAddress, contactAddress: user.address }),
      });

      if (!response.ok) {
        const err = await response.json();
        setError(err.error || 'Failed to add contact');
        return;
      }

      setAddedUsers(new Set([...addedUsers, user.address]));
      onAddContact(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title">🔍 Find User</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {/* Search Box */}
        <div className="form-section">
          <input
            className="search-users-input form-input"
            placeholder="Search @username or 0xaddress"
            value={query}
            onChange={e => handleSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Error */}
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

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <span className="spinner" style={{ width: 20, height: 20, borderTopColor: 'var(--accent-primary)' }} />
          </div>
        )}

        {/* Results */}
        {!loading && results.length > 0 && (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {results.map(user => (
              <div
                key={user.address}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.75rem 1rem',
                  borderBottom: '1px solid var(--border-subtle)',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `hsl(${Math.random() * 360}, 70%, 60%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '1.2rem',
                    flexShrink: 0,
                  }}>
                    {user.avatar || user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {user.displayName}
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      fontFamily: 'monospace',
                    }}>
                      @{user.username}
                    </div>
                  </div>
                </div>
                <button
                  className={`btn-${addedUsers.has(user.address) ? 'ghost' : 'primary'}`}
                  onClick={() => handleAddContact(user)}
                  disabled={addedUsers.has(user.address)}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {addedUsers.has(user.address) ? '✓ Added' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && query.length >= 2 && results.length === 0 && !error && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: 'var(--text-muted)',
          }}>
            <Icon name="person_add" size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
            <div>No users found</div>
          </div>
        )}

        {/* Initial State */}
        {!loading && query.length < 2 && results.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: 'var(--text-muted)',
            fontSize: '0.9rem',
          }}>
            <div style={{ marginBottom: '0.5rem' }}>💡 Search by:</div>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', fontSize: '0.85rem' }}>
              <div>@username</div>
              <div>•</div>
              <div>0xaddress</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
