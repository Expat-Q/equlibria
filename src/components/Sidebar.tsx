import React from 'react';
import { Icon } from './Icon';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
}

const NAV_ITEMS = [
  { id: 'dashboard',   label: 'Dashboard',       icon: 'space_dashboard' },
  { id: 'plans',       label: 'My Plans',        icon: 'account_balance_wallet' },
  { id: 'yield',       label: 'Yield & Markets', icon: 'chart-line' },
  { id: 'swap',        label: 'Swap & Trade',    icon: 'swap_horiz' },
  { id: 'referrals',   label: 'Referrals',       icon: 'people' },
  { id: 'leaderboard', label: 'Leaderboard',     icon: 'leaderboard' },
];

// Mobile nav includes all items, horizontal scrolling will be applied via CSS
const MOBILE_NAV_ITEMS = NAV_ITEMS;

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <>
      {/* ── Desktop/Tablet Sidebar ── */}
      <aside className="sidebar-desktop" aria-label="Main navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="logo-symbol">
            <Icon name="account_balance" size={18} color="white" />
          </div>
          <span className="logo-text">Equilibria</span>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div className="nav-section-label">Main</div>
          {NAV_ITEMS.slice(0, 4).map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              <Icon name={item.icon} size={20} />
              <span className="nav-label">{item.label}</span>
            </button>
          ))}

          <div className="nav-section-label" style={{ marginTop: '0.75rem' }}>Community</div>
          {NAV_ITEMS.slice(4).map(item => (
            <button
              key={item.id}
              className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
              title={item.label}
              aria-current={activeTab === item.id ? 'page' : undefined}
            >
              <Icon name={item.icon} size={20} />
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, paddingLeft: '0.5rem' }}>
            Equilibria v1.0.0
          </div>
        </div>
      </aside>

      {/* ── Mobile Bottom Navigation ── */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        {MOBILE_NAV_ITEMS.map(item => (
          <button
            key={item.id}
            className={`mobile-nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => setActiveTab(item.id)}
            aria-current={activeTab === item.id ? 'page' : undefined}
          >
            <Icon name={item.icon} size={22} />
            <span style={{ fontSize: '0.6rem', fontWeight: 600 }}>{item.label.split(' ')[0]}</span>
          </button>
        ))}
      </nav>
    </>
  );
};
