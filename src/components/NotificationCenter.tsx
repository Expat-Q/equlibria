import { useState } from 'react';
import { Icon } from './Icon';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'update';
  message: string;
  timestamp: Date;
  read: boolean;
  action?: { label: string; onClick: () => void };
}

interface Props {
  notifications: Notification[];
  onClear: () => void;
  onMarkAsRead: (id: string) => void;
}

export function NotificationCenter({ notifications, onClear, onMarkAsRead }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: string) => {
    onMarkAsRead(id);
  };

  const handleClearAll = () => {
    notifications.forEach(n => {
      if (!n.read) onMarkAsRead(n.id);
    });
    onClear();
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell Icon with Badge */}
      <button
        className="btn-icon"
        onClick={() => setIsOpen(!isOpen)}
        style={{ position: 'relative' }}
        title="Notifications"
      >
        <Icon name="notifications" size={20} />
        {unreadCount > 0 && (
          <div style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--danger)',
            color: 'white',
            fontSize: '0.7rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </div>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '120%',
          right: 0,
          width: 'min(380px, calc(100vw - 2rem))',
          maxHeight: '500px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          boxShadow: '0 12px 48px rgba(0,0,0,0.15)',
          zIndex: 300,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--bg-card)',
          }}>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Notifications
            </h3>
            <button
              className="btn-ghost"
              onClick={handleClearAll}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
            >
              <Icon name="clear_all" size={16} /> Clear
            </button>
          </div>

          {/* Notifications List */}
          {notifications.length > 0 ? (
            <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => handleMarkAsRead(notif.id)}
                  style={{
                    padding: '1rem',
                    borderBottom: '1px solid var(--border-subtle)',
                    background: notif.read ? 'transparent' : 'rgba(59, 130, 246, 0.05)',
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                  }}
                  onMouseEnter={e => {
                    if (!notif.read) {
                      (e.currentTarget as HTMLElement).style.background = 'var(--bg-input)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!notif.read) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(59, 130, 246, 0.05)';
                    }
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    marginTop: '0.15rem',
                    color: notif.type === 'success'
                      ? '#10d9a0'
                      : notif.type === 'error'
                      ? '#ef4444'
                      : notif.type === 'update'
                      ? '#f59e0b'
                      : '#3b82f6',
                  }}>
                    <Icon
                      name={notif.type === 'success' ? 'check_circle' : notif.type === 'error' ? 'error' : notif.type === 'update' ? 'info' : 'notification_important'}
                      size={20}
                    />
                  </div>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.9rem',
                      color: 'var(--text-primary)',
                      fontWeight: notif.read ? 400 : 600,
                      lineHeight: 1.4,
                      marginBottom: '0.25rem',
                    }}>
                      {notif.message}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}>
                      {formatTime(notif.timestamp)}
                    </div>
                    {notif.action && (
                      <button
                        className="btn-text"
                        onClick={e => {
                          e.stopPropagation();
                          notif.action!.onClick();
                        }}
                        style={{
                          marginTop: '0.5rem',
                          fontSize: '0.8rem',
                          padding: 0,
                          color: 'var(--accent-primary)',
                        }}
                      >
                        {notif.action.label} →
                      </button>
                    )}
                  </div>

                  {/* Unread Indicator */}
                  {!notif.read && (
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#3b82f6',
                      flexShrink: 0,
                      marginTop: '0.45rem',
                    }} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem 1rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}>
              <Icon name="notifications_none" size={40} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <div style={{ fontSize: '0.9rem' }}>No notifications yet</div>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 200,
          }}
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

function formatTime(date: Date): string {
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
}
