import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { SearchUsersModal } from './SearchUsersModal';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { API_BASE } from '../services/api';

interface Contact {
  address: string;
  username: string;
  displayName: string;
  avatar: string | null;
}

interface Props {
  onClose: () => void;
  onSelectContact: (contact: Contact) => void;
  walletAddress: string;
}

export function ContactPickerModal({ onClose, onSelectContact, walletAddress }: Props) {
  const authFetch = useAuthFetch();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, [walletAddress]);

  const fetchContacts = async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/contacts?address=${walletAddress}`);
      if (!response.ok) throw new Error('Failed to fetch contacts');
      
      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (err) {
      console.error('Failed to fetch contacts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = (newContact: Contact) => {
    setContacts(prev => [...prev, newContact]);
    setShowSearch(false);
  };

  const handleSelectContact = (contact: Contact) => {
    onSelectContact(contact);
    onClose();
  };

  if (showSearch) {
    return (
      <SearchUsersModal
        onClose={() => setShowSearch(false)}
        onAddContact={handleAddContact}
        walletAddress={walletAddress}
      />
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Icon name="group_add" size={24} />
              Select Partner
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Choose who to invite to this plan
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <Icon name="close" size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
            <span className="spinner" style={{ width: 20, height: 20, borderTopColor: 'var(--accent-primary)' }} />
          </div>
        ) : (
          <>
            {/* Add New Contact Button */}
            <div style={{ marginBottom: '1.5rem' }}>
              <button
                className="btn-secondary"
                onClick={() => setShowSearch(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                }}
              >
                <Icon name="person_add" size={16} />
                Find New Contact
              </button>
            </div>

            {/* Contacts Grid (Quick Transfer style) */}
            {contacts.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: '1rem',
                marginBottom: '1rem',
              }}>
                {contacts.map(contact => (
                  <button
                    key={contact.address}
                    onClick={() => handleSelectContact(contact)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.75rem',
                      borderRadius: 12,
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'transparent';
                    }}
                  >
                    <div style={{
                      width: 56,
                      height: 56,
                      borderRadius: '50%',
                      background: `hsl(${Math.random() * 360}, 70%, 60%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '1.5rem',
                      fontWeight: 600,
                    }}>
                      {contact.avatar || contact.displayName.charAt(0).toUpperCase()}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}>
                      {contact.displayName.length > 10
                        ? contact.displayName.slice(0, 10) + '...'
                        : contact.displayName}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '2rem 1rem',
                color: 'var(--text-muted)',
              }}>
                <Icon name="person" size={40} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <div style={{ marginBottom: '1rem' }}>No contacts yet</div>
                <div style={{ fontSize: '0.85rem' }}>
                  Search and add friends to invite them to plans
                </div>
              </div>
            )}

            {/* Show more info about selected contact */}
            <div style={{
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '1rem',
              marginTop: '1rem',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}>
              💡 Click a contact to invite them
            </div>
          </>
        )}
      </div>
    </div>
  );
}
