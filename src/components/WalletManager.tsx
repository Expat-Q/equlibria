import { useState, useEffect } from 'react';
import { Icon } from './Icon';
import { useWallets, usePrivy } from '../hooks/privy';
import { useAuthFetch } from '../hooks/useAuthFetch';
import { API_BASE } from '../services/api';

type SettingsTab = 'profile' | 'wallet' | 'social';

export function WalletManager({ onClose }: { onClose?: () => void }) {
  const { wallets } = useWallets();
  const { exportWallet } = usePrivy();
  const authFetch = useAuthFetch();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [copied, setCopied] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [reachTag, setReachTag] = useState('');
  const [email, setEmail] = useState('');
  const [savedOk, setSavedOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState('');
  const [keySaved, setKeySaved] = useState(false);
  const [storedKey, setStoredKey] = useState(() => localStorage.getItem('equilibria_imported_pk') || '');

  const embeddedWallet = wallets.find(w => (w as any).walletClientType === 'privy');
  const externalWallet = wallets.find(w => (w as any).walletClientType && (w as any).walletClientType !== 'privy');
  const starknetWallet = embeddedWallet || externalWallet || wallets.find(w => w.address?.startsWith('0x'));
  const address = starknetWallet?.address ?? '';
  const shortAddress = address ? `${address.slice(0, 10)}...${address.slice(-6)}` : '—';
  const isPrivyEmbedded = (starknetWallet as any)?.walletClientType === 'privy';
  

  // Load existing profile from backend on mount
  useEffect(() => {
    if (!address) return;
    const loadProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/users/${address.toLowerCase()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.displayName) setDisplayName(data.displayName);
          if (data.username) setReachTag(data.username);
          if (data.email) setEmail(data.email);
        }
      } catch (err) {
        console.warn('Failed to load profile from backend');
      }
    };
    loadProfile();
  }, [address]);

  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const save = async () => {
    setSaving(true);
    
    // Persist to backend
    try {
      const res = await authFetch(`${API_BASE}/api/users`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: address.toLowerCase(),
          displayName: displayName.trim(),
          username: reachTag.trim(),
          email: email.trim() || undefined,
        }),
      });
      
      if (res.ok) {
        setSavedOk(true);
      } else {
        setSavedOk(false);
      }
    } catch (err) {
      console.warn('Failed to save to backend:', err);
      setSavedOk(false);
    }
    
    setSaving(false);
    setTimeout(() => setSavedOk(false), 2500);
  };

  const importPrivateKey = () => {
    const trimmed = privateKeyInput.trim();
    if (!trimmed) return;
    localStorage.setItem('equilibria_imported_pk', trimmed);
    setStoredKey(trimmed);
    setPrivateKeyInput('');
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2500);
  };

  const exportPrivateKey = () => {
    if (!storedKey) return;
    navigator.clipboard.writeText(storedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { id: SettingsTab; icon: string; label: string }[] = [
    { id: 'profile', icon: 'manage_accounts', label: 'Profile'  },
    { id: 'wallet',  icon: 'account_balance_wallet', label: 'Wallet'  },
    { id: 'social',  icon: 'people',          label: 'Social'  },
  ];

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto' }}>
      {onClose && (
        <button className="btn-ghost" style={{ marginBottom: '1rem', paddingLeft: 0 }} onClick={onClose}>
          <Icon name="arrow_back" size={16} /> Back
        </button>
      )}

      {/* Page header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 className="greeting-title">Settings</h1>
        <p className="greeting-sub">Manage your profile, wallet preferences, and social settings.</p>
      </div>

      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: '0.35rem',
        background: 'var(--bg-input)', borderRadius: '12px',
        padding: '0.35rem', marginBottom: '2rem',
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.5rem', padding: '0.65rem 1rem', borderRadius: '9px',
              border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
              transition: 'all 0.2s ease',
              background: activeTab === t.id ? 'var(--bg-card)' : 'transparent',
              color: activeTab === t.id ? 'var(--accent-primary)' : 'var(--text-muted)',
              boxShadow: activeTab === t.id ? 'var(--shadow-card)' : 'none',
            }}
          >
            <Icon name={t.icon} size={16} color={activeTab === t.id ? 'var(--accent-primary)' : 'var(--text-muted)'} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Profile Settings ── */}
      {activeTab === 'profile' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="bank-card" style={{ minHeight: 'auto', cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.75rem' }}>
              <Icon name="manage_accounts" size={20} color="var(--accent-primary)" />
              <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Profile Information
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              <div className="form-section">
                <label className="form-label">Display Name</label>
                <input
                  type="text" className="form-input"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="How your partner sees you"
                />
              </div>

              <div className="form-section">
                <label className="form-label">Reach Tag</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: '0.9rem', top: '50%', transform: 'translateY(-50%)',
                    color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem',
                  }}>@</span>
                  <input
                    type="text" className="form-input"
                    style={{ paddingLeft: '1.8rem' }}
                    value={reachTag}
                    onChange={e => setReachTag(e.target.value)}
                    placeholder="yourhandle"
                  />
                </div>
                <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                  Partners can find and invite you using your reach tag.
                </p>
              </div>

              <div className="form-section">
                <label className="form-label">Email (for notifications)</label>
                <input
                  type="email" className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <button
              className="btn-primary" style={{ width: '100%', marginTop: '1.5rem' }}
              onClick={save}
              disabled={saving}
            >
              {saving
                ? <><span className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving...</>
                : savedOk
                ? <><Icon name="check_circle" size={16} /> Saved!</>
                : <><Icon name="save" size={16} /> Save Profile</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Wallet Settings ── */}
      {activeTab === 'wallet' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Address card */}
          <div className="bank-card" style={{ minHeight: 'auto', cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <Icon name="account_balance_wallet" size={20} color="var(--accent-primary)" />
              <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Connected Wallet
              </h3>
            </div>

            <div style={{
              background: 'var(--bg-input)', borderRadius: '10px',
              padding: '0.85rem 1rem', marginBottom: '1.25rem',
              display: 'flex', alignItems: 'center', gap: '0.75rem',
            }}>
              <span style={{
                fontFamily: 'monospace', fontWeight: 600, fontSize: '0.88rem',
                flex: 1, color: 'var(--text-primary)',
              }}>
                {shortAddress || 'No wallet connected'}
              </span>
              <button
                onClick={copyAddress}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                title="Copy address"
              >
                <Icon name={copied ? 'check' : 'content_copy'} size={16} color={copied ? 'var(--success)' : 'var(--text-muted)'} />
              </button>
              {address && (
                <a
                  href={`https://basescan.org/address/${address}`}
                  target="_blank" rel="noreferrer"
                  style={{ color: 'var(--text-muted)', display: 'flex' }}
                  title="View on Basescan"
                >
                  <Icon name="open_in_new" size={16} />
                </a>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 1rem', background: 'var(--bg-input)', borderRadius: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Icon name="hub" size={18} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>Network</span>
                </div>
                <span style={{
                  fontSize: '0.8rem', fontWeight: 700, color: '#10d9a0',
                  background: 'rgba(16,217,160,0.1)', padding: '0.2rem 0.65rem', borderRadius: '99px',
                }}>Base / Arbitrum</span>
              </div>

              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.75rem 1rem', background: 'var(--bg-input)', borderRadius: '10px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <Icon name="security" size={18} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>Provider</span>
                </div>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>LI.FI</span>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bank-card" style={{ minHeight: 'auto', cursor: 'default', background: 'var(--bg-input)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <Icon name="shield" size={20} color="var(--text-secondary)" />
              <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Security
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: '1.25rem' }}>
              Import a private key to use it in this session. Imported keys are stored locally in your browser.
            </p>
            {isPrivyEmbedded && (
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: 10,
                padding: '0.75rem 0.9rem',
                fontSize: '0.8rem',
                color: 'var(--text-secondary)',
                marginBottom: '1rem',
              }}>
                Privy embedded wallets do not expose private keys. Export only works for keys you imported here.
              </div>
            )}
            <div className="form-section" style={{ marginBottom: '0.75rem' }}>
              <label className="form-label">Import Private Key</label>
              <input
                type="password"
                className="form-input"
                placeholder="0x..."
                value={privateKeyInput}
                onChange={e => setPrivateKeyInput(e.target.value)}
              />
            </div>
            <button
              className="btn-primary"
              onClick={importPrivateKey}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}
            >
              <Icon name="key" size={16} /> {keySaved ? 'Imported' : 'Import Key'}
            </button>
            {isPrivyEmbedded ? (
              <button
                className="btn-white"
                onClick={() => exportWallet()}
                style={{ width: '100%', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700, color: '#111827' }}
              >
                <Icon name="key" size={16} /> Export Private Key
              </button>
            ) : (
              <button
                className="btn-white"
                onClick={exportPrivateKey}
                style={{ width: '100%', marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700, color: '#111827' }}
                disabled={!storedKey}
              >
                <Icon name="content_copy" size={16} /> {copied ? 'Copied' : 'Export Imported Key'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Social Settings ── */}
      {activeTab === 'social' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="bank-card" style={{ minHeight: 'auto', cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.75rem' }}>
              <Icon name="people" size={20} color="var(--accent-primary)" />
              <h3 style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Social & Privacy
              </h3>
            </div>

            {[
              { label: 'Allow partner vault invites', desc: 'Let others invite you to joint vaults using your reach tag', enabled: true },
              { label: 'Show activity to partner', desc: 'Partners in joint vaults can see your contribution history', enabled: true },
              { label: 'Public profile', desc: 'Allow others to look up your reach tag on Equilibria', enabled: false },
            ].map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                padding: '1rem 0',
                borderBottom: i < 2 ? '1px solid var(--border-subtle)' : 'none',
                gap: '1rem',
              }}>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.2rem' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.desc}</div>
                </div>
                <div style={{
                  width: 40, height: 22, borderRadius: 99, flexShrink: 0, cursor: 'pointer',
                  background: item.enabled ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  position: 'relative', transition: 'background 0.2s',
                }}>
                  <div style={{
                    position: 'absolute', top: 3,
                    left: item.enabled ? 21 : 3,
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'white', transition: 'left 0.2s',
                  }} />
                </div>
              </div>
            ))}

            <p style={{
              marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)',
              background: 'var(--bg-input)', padding: '0.75rem 1rem', borderRadius: '8px',
            }}>
              🔒 All vault transactions are on-chain. Social settings only affect in-app visibility.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
