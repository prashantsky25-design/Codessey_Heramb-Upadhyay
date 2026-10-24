import React from 'react';
import {
  Activity,
  BookOpen,
  GitFork,
  History,
  Lock,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
  Terminal,
  X
} from 'lucide-react';
import { useTheme } from '../theme';

export interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface SidebarProps extends NavigationProps {
  isOpen: boolean;
  onClose: () => void;
}

interface TopStatusBarProps {
  pageTitle: string;
  networkOnline: boolean;
  relayerAddress?: string | null;
  onOpenSidebar: () => void;
}

export const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'verify', label: 'Verify Transaction', icon: ShieldCheck },
  { id: 'history', label: 'History', icon: History },
  { id: 'attack-lab', label: 'Attack Lab', icon: Terminal, badge: 'Adversarial' },
  { id: 'architecture', label: 'Architecture', icon: GitFork },
  { id: 'security', label: 'Trust Model', icon: Lock },
  { id: 'documentation', label: 'Documentation', icon: BookOpen }
] as const;

function shortenAddress(address?: string | null): string {
  if (!address) return 'Unavailable';
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isOpen,
  onClose
}) => {
  return (
    <>
      <div
        className={`sidebar-scrim ${isOpen ? 'sidebar-scrim-visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`app-sidebar ${isOpen ? 'app-sidebar-open' : ''}`} aria-label="Primary navigation">
        <div className="sidebar-brand">
          <button
            type="button"
            className="brand-button"
            onClick={() => {
              setActiveTab('overview');
              onClose();
            }}
            aria-label="Go to CrossProof overview"
          >
            <span className="brand-mark">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <span className="brand-copy">
              <span className="brand-name">CROSSPROOF</span>
              <span className="brand-tagline">Trust the proof. Not the messenger.</span>
            </span>
          </button>
          <button type="button" className="sidebar-close" onClick={onClose} aria-label="Close navigation">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
                {'badge' in item && item.badge && <span className="sidebar-badge">{item.badge}</span>}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-footer-kicker">Protocol status</div>
          <div className="sidebar-footer-copy">EVM Patricia Trie v1.0</div>
          <div className="sidebar-footer-copy">Fail-closed verification</div>
        </div>
      </aside>
    </>
  );
};

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  pageTitle,
  networkOnline,
  relayerAddress,
  onOpenSidebar
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="app-topbar">
      <div className="topbar-leading">
        <button type="button" className="mobile-menu-button" onClick={onOpenSidebar} aria-label="Open navigation">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <div className="topbar-eyebrow">CrossProof workspace</div>
          <h1 className="topbar-title">{pageTitle}</h1>
        </div>
      </div>

      <div className="topbar-statuses">
        <div className="status-control network-control" title={networkOnline ? 'API and local chains reachable' : 'API or local chain unavailable'}>
          <span className={`status-dot ${networkOnline ? 'status-dot-online' : 'status-dot-offline'}`} />
          <span className="status-control-label">Local devnet</span>
          <span className="status-control-value">31337 → 31338</span>
        </div>

        <div className="status-control wallet-control" title={relayerAddress || 'Relayer address unavailable'}>
          <ShieldCheck className="h-3.5 w-3.5 status-control-icon" />
          <span className="status-control-label">Wallet</span>
          <span className="status-control-value technical-data">{shortenAddress(relayerAddress)}</span>
        </div>

        <button
          type="button"
          className="theme-control"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'Vecna' : 'light'} theme`}
        >
          {theme === 'light' ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
          <span>{theme === 'light' ? 'Vecna mode' : 'Light mode'}</span>
        </button>
      </div>
    </header>
  );
};
