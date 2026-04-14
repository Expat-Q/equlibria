import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { API_BASE } from '../services/api';

interface UserData {
  privy_id: string;
  address: string;
  username: string;
  displayName: string;
  avatar: string | null;
  bio: string;
  createdAt: string;
}

interface Props {
  username: string;
  currentUserPrivy_id?: string;
  onAddContact?: (user: UserData) => void;
  onClose?: () => void;
}

export function UserProfile({ username, currentUserPrivy_id, onAddContact, onClose }: Props) {
  const authFetch = useAuthFetch();
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isContact, setIsContact] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    fetchUserProfile();
  }, [username]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError('');

      // Search for user by username
      const response = await fetch(`${API_BASE}/api/users/search?q=@${username}`);
      if (!response.ok) throw new Error('User not found');

      const data = await response.json();
      const foundUser = data.results?.[0];

      if (!foundUser) throw new Error('User not found');

      // Fetch full profile
      const profileResponse = await fetch(`${API_BASE}/api/users/${foundUser.address}`);
      if (!profileResponse.ok) throw new Error('Failed to load profile');

      const profileData = await profileResponse.json();
      setUser(profileData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!user || !currentUserPrivy_id) return;

    setIsAdding(true);
    try {
      const response = await authFetch(`${API_BASE}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          privy_id: currentUserPrivy_id,
          contactAddress: user.address,
        }),
      });

      if (!response.ok) throw new Error('Failed to add contact');

      setIsContact(true);
      if (onAddContact) onAddContact(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add contact');
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        minHeight: '400px',
      }}>
        <span className="spinner" style={{ width: 30, height: 30, borderTopColor: 'var(--accent-primary)' }} />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        minHeight: '400px',
        color: 'var(--text-muted)',
        textAlign: 'center',
      }}>
        <Icon name="person_off" size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
        <div style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>User not found</div>
        <div style={{ fontSize: '0.9rem' }}>{error || 'This user does not exist'}</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Close button if modal */}
      {onClose && (
        <button
          className="btn-ghost"
          onClick={onClose}
          style={{ marginBottom: '1rem', paddingLeft: 0 }}
        >
          <Icon name="arrow_back" size={16} /> Back
        </button>
      )}

      {/* Profile Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 16,
        padding: '2rem',
        textAlign: 'center',
      }}>
        {/* Avatar */}
        <div style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: `hsl(${Math.random() * 360}, 70%, 60%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '3rem',
          fontWeight: 700,
          margin: '0 auto 1.5rem',
        }}>
          {user.avatar || user.displayName.charAt(0).toUpperCase()}
        </div>

        {/* Name */}
        <h1 style={{
          fontSize: '1.5rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          margin: 0,
          marginBottom: '0.5rem',
        }}>
          {user.displayName}
        </h1>

        {/* Username */}
        <div style={{
          fontSize: '1rem',
          color: 'var(--accent-primary)',
          fontWeight: 600,
          marginBottom: '1rem',
        }}>
          @{user.username}
        </div>

        {/* Bio */}
        {user.bio && (
          <p style={{
            fontSize: '0.95rem',
            color: 'var(--text-secondary)',
            marginBottom: '1.5rem',
            lineHeight: 1.6,
          }}>
            {user.bio}
          </p>
        )}

        {/* Address */}
        <div style={{
          background: 'var(--bg-input)',
          borderRadius: 8,
          padding: '0.75rem 1rem',
          marginBottom: '1.5rem',
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          wordBreak: 'break-all',
        }}>
          {user.address}
        </div>

        {/* Add Contact Button */}
        {currentUserPrivy_id && (
          <button
            className={`btn-${isContact ? 'ghost' : 'primary'}`}
            onClick={handleAddContact}
            disabled={isContact || isAdding}
            style={{ width: '100%' }}
          >
            {isContact ? (
              <>
                <Icon name="check" size={16} /> Added to Contacts
              </>
            ) : isAdding ? (
              <>
                <span className="spinner" style={{ width: 14, height: 14 }} /> Adding...
              </>
            ) : (
              <>
                <Icon name="person_add" size={16} /> Add Contact
              </>
            )}
          </button>
        )}

        {/* QR Code Section */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--border-subtle)',
        }}>
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--text-muted)',
            marginBottom: '1rem',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}>
            Share Profile
          </div>
          <div style={{
            background: 'white',
            borderRadius: 8,
            padding: '1rem',
            display: 'inline-block',
            marginBottom: '1rem',
          }}>
            {/* Placeholder QR - in production, use qrcode library */}
            <div style={{
              width: 200,
              height: 200,
              background: 'var(--bg-input)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              textAlign: 'center',
              padding: '1rem',
            }}>
              QR Code<br/>
              {`${window.location.origin}/user/${user.username}`}
            </div>
          </div>

          {/* Share Link */}
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            justifyContent: 'center',
          }}>
            <button
              className="btn-secondary"
              onClick={() => {
                const url = `${window.location.origin}/user/${user.username}`;
                navigator.clipboard.writeText(url);
              }}
              style={{ fontSize: '0.85rem' }}
            >
              <Icon name="link" size={14} /> Copy Link
            </button>
          </div>
        </div>

        {/* Member Since */}
        <div style={{
          marginTop: '2rem',
          paddingTop: '2rem',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
        }}>
          Member since {new Date(user.createdAt).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
