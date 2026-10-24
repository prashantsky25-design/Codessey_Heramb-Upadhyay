import React from 'react';
import {
  ShieldCheck,
  Activity,
  History,
  Terminal,
  GitFork,
  Lock,
  Radio,
  ExternalLink
} from 'lucide-react';

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
  const navItems = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'verify', label: 'Verify Transaction', icon: ShieldCheck },
    { id: 'history', label: 'History', icon: History },
    { id: 'attack-lab', label: 'Attack Lab', icon: Terminal, badge: 'Adversarial' },
    { id: 'architecture', label: 'Architecture', icon: GitFork },
    { id: 'security', label: 'Trust Model', icon: Lock }
  ];

  return (
    <header className="border-b border-[#1b1f26] bg-[#0c0d10]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Positioning */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setActiveTab('overview')}
          >
            <div className="w-9 h-9 rounded-lg bg-[#11161d] border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm shadow-cyan-950/60 group-hover:border-cyan-400/60 transition-colors">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-sm tracking-wider text-zinc-100 font-mono">
                  CROSSPROOF
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/50">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block tracking-tight font-mono">
                Trust the proof. Not the messenger.
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium font-mono transition-all ${
                    isActive
                      ? 'bg-[#181c22] text-cyan-300 border border-cyan-500/30 shadow-inner'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#12151a] border border-transparent'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isActive ? 'text-cyan-400' : 'text-zinc-400'
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-1 text-[9px] font-mono px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/50">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Network & Environment Status Badge */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 px-3 py-1 rounded-md bg-[#111317] border border-[#21252d] text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  networkOnline
                    ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse'
                    : 'bg-rose-500'
                }`}
              />
              <span className="text-zinc-400 text-[11px] hidden sm:inline">
                LOCAL DEVNET:
              </span>
              <span className="text-zinc-200 font-semibold text-[11px]">
                31337 &rarr; 31338
              </span>
              <span className="text-[9px] uppercase px-1 py-0.5 rounded bg-zinc-800 text-zinc-400 ml-1">
                Anvil
              </span>
            </div>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden overflow-x-auto py-2 space-x-1 border-t border-[#1b1f26] no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-mono whitespace-nowrap ${
                  isActive
                    ? 'bg-[#181c22] text-cyan-300 border border-cyan-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
