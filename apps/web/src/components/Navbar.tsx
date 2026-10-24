import React from 'react';
import {
  ShieldCheck,
  Activity,
  History,
  Terminal,
  GitFork,
  Lock,
  BookOpen,
  Menu,
  X,
  Sun,
  Moon,
  ChevronRight
} from 'lucide-react';
import { useTheme } from '../theme';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  networkOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  networkOnline
}) => {
  const { theme, toggleTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'verify', label: 'Verify Transaction', icon: ShieldCheck },
    { id: 'history', label: 'History', icon: History },
    { id: 'attack-lab', label: 'Attack Lab', icon: Terminal, badge: 'Adversarial' },
    { id: 'architecture', label: 'Architecture', icon: GitFork },
    { id: 'security', label: 'Trust Model', icon: Lock },
    { id: 'documentation', label: 'Documentation', icon: BookOpen }
  ];

  const navigate = (tab: string) => {
    setActiveTab(tab);
    setMobileOpen(false);
  };

  return (
    <>
      <aside className={`app-sidebar ${mobileOpen ? 'is-open' : ''}`} aria-label="Primary navigation">
        <div className="sidebar-brand" onClick={() => navigate('overview')} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') navigate('overview'); }} role="button" tabIndex={0}>
          <div className="brand-mark"><ShieldCheck className="h-5 w-5" /></div>
          <div>
            <div className="brand-name">CROSSPROOF <span className="brand-version">v1.0</span></div>
            <div className="brand-subtitle">Verify across chains</div>
          </div>
          <button className="sidebar-close lg:hidden" onClick={(event) => { event.stopPropagation(); setMobileOpen(false); }} aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="sidebar-label">Workspace</div>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => navigate(item.id)} className={`sidebar-link ${isActive ? 'is-active' : ''}`} aria-current={isActive ? 'page' : undefined}>
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {item.badge && <span className="sidebar-badge">Lab</span>}
                {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5" />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-trust-note">
            <div className="status-dot" />
            <div><strong>Mode A active</strong><span>Local header oracle</span></div>
          </div>
          <div className="sidebar-caption">Evidence over assertions.</div>
        </div>
      </aside>

      {mobileOpen && <button className="sidebar-overlay lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation overlay" />}

      <header className="app-topbar">
        <div className="topbar-left">
          <button className="mobile-menu lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu className="h-5 w-5" /></button>
          <div className="topbar-context">
            <span className="topbar-kicker">Security command center</span>
            <span className="topbar-title">{navItems.find((item) => item.id === activeTab)?.label || 'Overview'}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="network-chip">
            <span className={`status-dot ${networkOnline ? 'is-online' : 'is-offline'}`} />
            <span className="hidden sm:inline">Local Devnet</span>
            <strong>31337 → 31338</strong>
          </div>
          <div className="chain-chip hidden md:flex"><span>Source</span><strong>31337</strong></div>
          <div className="chain-chip hidden md:flex"><span>Destination</span><strong>31338</strong></div>
          <div className="wallet-chip hidden sm:flex"><span className="wallet-dot" /> Wallet unavailable</div>
          <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === 'light' ? 'VecnaVerse dark' : 'light'} mode`} title={`Switch to ${theme === 'light' ? 'VecnaVerse dark' : 'light'} mode`}>
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            <span className="hidden xl:inline">{theme === 'light' ? 'VecnaVerse' : 'Light mode'}</span>
          </button>
        </div>
      </header>
    </>
  );
};
