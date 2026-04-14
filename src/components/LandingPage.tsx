import { useEffect, useState } from 'react';
import { usePrivy } from '../hooks/privy';
import { Icon } from './Icon';

export function LandingPage() {
  const { login, authenticated, ready } = usePrivy();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 60);
    return () => clearTimeout(t);
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login();
  };

  const features = [
    { icon: 'group_add',           label: 'Joint Vaults',  color: '#ff8c00' },
    { icon: 'monitoring',          label: 'Live Yield',    color: '#22c55e' },
    { icon: 'enhanced_encryption', label: 'ZK Privacy',   color: '#a78bfa' },
    { icon: 'payments',            label: 'ETH · USDC',   color: '#2775ca' },
  ];

  const stats = [
    { label: 'Chains Supported', value: '4' },
    { label: 'Yield Protocols',  value: '10+' },
    { label: 'Max APY',          value: '17%+' },
  ];

  return (
    <div className="landing-root">

      {/* Ambient bg orbs */}
      <div className="landing-orb landing-orb-1" />
      <div className="landing-orb landing-orb-2" />

      {/* Navbar */}
      <nav className="landing-nav" style={{
        opacity:    visible ? 1 : 0,
        transform:  visible ? 'translateY(0)' : 'translateY(-12px)',
        transition: 'opacity .5s ease, transform .5s ease',
      }}>
        <div className="landing-nav-logo">
          <div className="logo-symbol"><Icon name="account_balance" size={20} color="white" /></div>
          <span>Equilibria</span>
        </div>

        {/* Center Nav Links (Desktop mostly) */}
        <div className="landing-nav-links">
          <a href="#home">Home</a>
          <a href="#how-it-works">How It Works</a>
          <a href="#features">Features</a>
          <a href="#blog">Blog</a>
          <a href="#faq">FAQ</a>
          <a href="#docs">Docs</a>
        </div>

        <div className="landing-nav-tag">
          <Icon name="bolt" size={13} color="var(--accent-primary)" />
          Powered by LI.FI · Base · Arbitrum · Privy
        </div>
      </nav>

      {/* Hero */}
      <div className="landing-hero">

        {/* ── LEFT ── */}
        <div className="landing-left" style={{
          opacity:    visible ? 1 : 0,
          transform:  visible ? 'translateX(0)' : 'translateX(-28px)',
          transition: 'opacity .65s ease .1s, transform .65s ease .1s',
        }}>

          {/* Live badge */}
          <div className="landing-live-badge">
            <span className="live-dot" />
            Now live on Base &amp; Arbitrum
          </div>

          <h1 className="landing-h1">
            Save Smarter,<br />
            <span className="landing-h1-accent">Earn Together</span>
          </h1>

          <p className="landing-desc">
            A multi-chain savings vault powered by <strong>LI.FI Protocol</strong>.
            Create individual or joint plans, earn DeFi yield routed through LI.FI Composer,
            and grow toward your goals automatically — across Base, Arbitrum, and BNB.
          </p>

          {/* Stats — moved above pills for visibility */}
          <div className="landing-stats" style={{
            opacity:    visible ? 1 : 0,
            transition: 'opacity 0.5s ease 0.3s',
            marginBottom: '1.5rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            {stats.map(s => (
              <div key={s.label} className="landing-stat">
                <div className="landing-stat-value">{s.value}</div>
                <div className="landing-stat-label">{s.label}</div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div style={{ marginTop: '0.5rem', marginBottom: '2.5rem' }}>
            <button
              className="btn-primary landing-cta-btn"
              onClick={handleLoginSubmit}
              disabled={!ready || authenticated}
              id="get-started-btn"
            >
              {authenticated
                ? <><span className="spinner" /> Entering App...</>
                : <><Icon name="bolt" size={20} /> Get Started <Icon name="chevron_right" size={18} /></>}
            </button>
            <p className="landing-cta-note">Starknet Sepolia Demo — No installation required.</p>
          </div>

          {/* Feature pills — moved below CTA so they don't hide it */}
          <div className="landing-pills">
            {features.map((f, i) => (
              <div key={f.label} className="landing-pill" style={{
                opacity:    visible ? 1 : 0,
                transform:  visible ? 'translateY(0)' : 'translateY(8px)',
                transition: `opacity .45s ease ${.3 + i * .07}s, transform .45s ease ${.3 + i * .07}s`,
              }}>
                <Icon name={f.icon} size={13} color={f.color} />
                {f.label}
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: App mockup ── */}
        <div className="landing-right" style={{
          opacity:    visible ? 1 : 0,
          transform:  visible ? 'translateX(0) translateY(0)' : 'translateX(28px) translateY(8px)',
          transition: 'opacity .7s ease .2s, transform .7s ease .2s',
        }}>
          {/* Glow */}
          <div className="mockup-glow" />

          {/* Floating APY badge */}
          <div className="mockup-badge mockup-badge-apy">
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            4.8% APY
          </div>

          {/* App shell */}
          <div className="mockup-shell">
            {/* Shell header */}
            <div className="mockup-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <div style={{ width: 24, height: 24, borderRadius: 7, background: 'linear-gradient(135deg,#ff8c00,#e07800)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="account_balance" size={13} color="white" />
                </div>
                <span style={{ fontWeight: 800, fontSize: '0.8rem' }}>Equilibria</span>
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {['#ff5f57','#febc2e','#28c840'].map(c => (
                  <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c }} />
                ))}
              </div>
            </div>

            {/* Balance card mock */}
            <div className="mockup-balance-card">
              <div className="mockup-bal-circle mockup-bal-circle-1" />
              <div className="mockup-bal-circle mockup-bal-circle-2" />
              <div style={{ fontSize: '0.6rem', opacity: .8, marginBottom: '.2rem', fontWeight: 700, letterSpacing: '.06em' }}>TOTAL PORTFOLIO</div>
              <div style={{ fontSize: '1.7rem', fontWeight: 900, letterSpacing: '-.02em', marginBottom: '.7rem' }}>$2,990.00</div>
              <div style={{ display: 'flex', gap: '.45rem' }}>
                {['Send','Request','Split','Top Up'].map(l => (
                  <div key={l} style={{ flex: 1, background: 'rgba(255,255,255,.18)', borderRadius: 7, padding: '.35rem 0', textAlign: 'center', fontSize: '.58rem', fontWeight: 700 }}>{l}</div>
                ))}
              </div>
            </div>

            {/* Plan rows */}
            {[
              { name: 'Vacation Fund', progress: 42, yield: '+3.412', badge: 'PRIVATE', color: '#ff8c00', emoji: '✈️' },
              { name: 'Rent & Bills',  progress: 43, yield: '+8.224', badge: 'JOINT',   color: '#a78bfa', emoji: '🏠' },
            ].map(p => (
              <div key={p.name} className="mockup-plan-row">
                <div className="mockup-plan-icon" style={{ background: `${p.color}18` }}>{p.emoji}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '.72rem', fontWeight: 700, marginBottom: '.18rem', display: 'flex', alignItems: 'center', gap: '.3rem' }}>
                    {p.name}
                    <span style={{ fontSize: '.54rem', background: `${p.color}18`, color: p.color, padding: '.08rem .32rem', borderRadius: 99, fontWeight: 800 }}>{p.badge}</span>
                  </div>
                  <div style={{ height: 3, background: 'var(--border-subtle)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.progress}%`, background: p.color, borderRadius: 99 }} />
                  </div>
                </div>
                <div style={{ fontSize: '.7rem', fontWeight: 800, color: '#22c55e' }}>{p.yield}</div>
              </div>
            ))}

            {/* Mockup bottom nav */}
            <div className="mockup-nav">
              {[
                { icon: 'space_dashboard',        label: 'Dashboard', active: true },
                { icon: 'account_balance_wallet', label: 'Plans',     active: false },
                { icon: 'monitoring',             label: 'Yield',     active: false },
              ].map(item => (
                <div key={item.label} style={{ textAlign: 'center', opacity: item.active ? 1 : .4 }}>
                  <Icon name={item.icon} size={15} color={item.active ? '#ff8c00' : 'var(--text-muted)'} />
                  <div style={{ fontSize: '.58rem', fontWeight: 700, color: item.active ? '#ff8c00' : 'var(--text-muted)', marginTop: '.12rem' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .landing-root {
          min-height: 100vh;
          background: var(--bg-root);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          position: relative;
        }
        .landing-orb {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          filter: blur(50px);
        }
        .landing-orb-1 {
          width: 800px; height: 800px;
          top: -300px; left: -260px;
          background: radial-gradient(circle, rgba(255,140,0,.07) 0%, transparent 65%);
        }
        .landing-orb-2 {
          width: 560px; height: 560px;
          bottom: -180px; right: -80px;
          background: radial-gradient(circle, rgba(167,139,250,.06) 0%, transparent 65%);
        }
        .landing-nav {
          position: relative; z-index: 10;
          display: flex; align-items: center; justify-content: space-between;
          padding: 1.1rem 2.5rem;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-root);
        }
        .landing-nav-logo {
          display: flex; align-items: center; gap: .6rem;
          font-weight: 900; font-size: 1.05rem; letter-spacing: -.02em;
          color: var(--text-primary);
        }
        .landing-nav-links {
          display: flex; align-items: center; gap: 2rem;
        }
        .landing-nav-links a {
          color: var(--text-secondary); text-decoration: none;
          font-size: 0.88rem; font-weight: 600;
          transition: color 0.15s;
        }
        .landing-nav-links a:hover {
          color: var(--text-primary);
        }
        .landing-nav-tag {
          display: flex; align-items: center; gap: .4rem;
          font-size: .78rem; font-weight: 600; color: var(--text-muted);
        }
        .landing-hero {
          position: relative; z-index: 1;
          flex: 1;
          display: flex; align-items: flex-start; /* Aligned top instead of center */
          max-width: 1200px; width: 100%;
          margin: 0 auto;
          padding: 1.5rem 2.5rem 3rem; /* Reduced top padding */
          gap: 4rem;
        }
        .landing-left { flex: 1 1 460px; }
        .landing-live-badge {
          display: inline-flex; align-items: center; gap: .45rem;
          background: rgba(255,140,0,.08); border: 1px solid rgba(255,140,0,.2);
          padding: .3rem .85rem; border-radius: 99px;
          font-size: .76rem; font-weight: 700; color: var(--accent-primary);
          margin-bottom: 1.25rem;
        }
        .live-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #22c55e;
          animation: pulse-dot 1.6s ease-in-out infinite;
          display: inline-block;
        }
        .landing-h1 {
          font-size: clamp(2.2rem, 5vw, 3.4rem);
          font-weight: 900; line-height: 1.1; letter-spacing: -.035em;
          color: var(--text-primary); margin-bottom: 1.1rem;
        }
        .landing-h1-accent {
          background: linear-gradient(90deg, #ff8c00, #ffb347);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .landing-desc {
          font-size: 1rem; color: var(--text-secondary);
          line-height: 1.65; margin-bottom: 1.75rem; max-width: 440px;
        }
        .landing-pills {
          display: flex; flex-wrap: wrap; gap: .55rem; margin-bottom: 2rem;
        }
        .landing-pill {
          display: flex; align-items: center; gap: .38rem;
          padding: .38rem .8rem; border-radius: 99px;
          background: var(--bg-card); border: 1px solid var(--border-subtle);
          font-size: .78rem; font-weight: 600; color: var(--text-primary);
        }
        .landing-cta-btn {
          padding: .9rem 2.1rem; font-size: .98rem; border-radius: 13px;
          box-shadow: 0 6px 24px rgba(255,140,0,.26);
          display: inline-flex; align-items: center; gap: .45rem;
          margin-bottom: .75rem;
        }
        .landing-cta-note {
          font-size: .78rem; color: var(--text-muted); font-weight: 500;
          margin-bottom: 2rem;
        }
        .landing-stats {
          display: flex; gap: 2rem;
          padding-top: 1.75rem; border-top: 1px solid var(--border-subtle);
        }
        .landing-stat-value {
          font-size: 1.2rem; font-weight: 900; color: var(--text-primary); letter-spacing: -.02em;
        }
        .landing-stat-label {
          font-size: .72rem; color: var(--text-muted); font-weight: 600; margin-top: .1rem;
        }

        /* Mockup */
        .landing-right {
          flex: 1 1 400px; position: relative;
          display: flex; align-items: flex-start; justify-content: center;
        }
        .mockup-glow {
          position: absolute; inset: -24px; border-radius: 36px; z-index: 0;
          background: radial-gradient(ellipse at 50% 50%, rgba(255,140,0,.09) 0%, transparent 70%);
          filter: blur(18px);
        }
        .mockup-badge {
          position: absolute; z-index: 10;
          background: var(--bg-card); border: 1px solid var(--border-subtle);
          border-radius: 11px; padding: .45rem .8rem;
          box-shadow: 0 4px 18px rgba(0,0,0,.08);
          display: flex; align-items: center; gap: .38rem;
          font-size: .73rem; font-weight: 700; color: var(--text-primary);
        }
        .mockup-badge-apy { top: -12px; right: -8px; animation: float-badge 3s ease-in-out infinite 1s; }
        .mockup-shell {
          position: relative; z-index: 1;
          background: var(--bg-card); border: 1px solid var(--border-subtle);
          border-radius: 24px; padding: 1.25rem;
          box-shadow: 0 22px 60px rgba(0,0,0,.09), 0 4px 14px rgba(0,0,0,.05);
          width: 100%; max-width: 480px; /* Made mockup larger */
          animation: float-y 4.5s ease-in-out infinite;
        }
        .mockup-header {
          display: flex; justify-content: space-between; align-items: center;
          margin-bottom: .85rem;
        }
        .mockup-balance-card {
          background: linear-gradient(135deg, #ff8c00 0%, #e07000 100%);
          border-radius: 14px; padding: 1rem; margin-bottom: .85rem;
          color: white; position: relative; overflow: hidden;
        }
        .mockup-bal-circle {
          position: absolute; border-radius: 50%;
          background: rgba(255,255,255,.07);
        }
        .mockup-bal-circle-1 { width: 110px; height: 110px; top: -25px; right: -20px; }
        .mockup-bal-circle-2 { width: 70px;  height: 70px;  bottom: -25px; left: 35px; }
        .mockup-plan-row {
          display: flex; align-items: center; gap: .65rem;
          background: var(--bg-input); border-radius: 9px;
          padding: .55rem .75rem; margin-bottom: .5rem;
        }
        .mockup-plan-icon {
          width: 30px; height: 30px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center; font-size: .95rem;
          flex-shrink: 0;
        }
        .mockup-nav {
          display: flex; justify-content: space-around;
          padding-top: .65rem; border-top: 1px solid var(--border-subtle);
          margin-top: .25rem;
        }
        @keyframes float-y {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-9px); }
        }
        @keyframes float-badge {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-5px); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: .5; transform: scale(.8); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* ── Responsive ── */
        @media (max-width: 950px) {
          .landing-nav-links { display: none; }
        }
        @media (max-width: 900px) {
          .landing-hero {
            flex-direction: column;
            padding: 2rem 1.75rem 3rem;
            gap: 2.5rem;
            align-items: flex-start;
          }
          .landing-left { flex: unset; width: 100%; }
          .landing-right { flex: unset; width: 100%; justify-content: center; }
          .mockup-shell { max-width: 400px; }
        }
        @media (max-width: 600px) {
          .landing-nav { padding: 1rem 1.25rem; }
          .landing-hero { padding: 1.5rem 1.25rem 4rem; gap: 2rem; }
          .landing-h1 { font-size: clamp(1.9rem, 8vw, 2.6rem); }
          .landing-stats { gap: 1.25rem; }
        }
      `}</style>


    </div>
  );
}
