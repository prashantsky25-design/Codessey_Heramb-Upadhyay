import React, { useState } from 'react';
import {
  ShieldCheck,
  ArrowRight,
  Terminal,
  Activity,
  CheckCircle2,
  ExternalLink,
  Cpu,
  Lock,
  Layers,
  Search,
  ChevronRight,
  Database,
  Radio
} from 'lucide-react';
import { ChainConfig, VerificationRecord } from '@crossproof/shared';
import { MetricsCards } from '../components/MetricsCards';
import { SecurityBanner } from '../components/SecurityBanner';
import { HeroVisual } from '../components/HeroVisual';
import { StatusBadge } from '../components/StatusBadge';

interface OverviewPageProps {
  chains: ChainConfig[];
  records: VerificationRecord[];
  onSelectTxForVerification: (chainId: number, txHash: string) => void;
  onNavigate: (tab: string) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  chains,
  records,
  onSelectTxForVerification,
  onNavigate
}) => {
  const [filterChain, setFilterChain] = useState<string>('ALL');

  const filteredRecords = records.filter((r) => {
    if (filterChain === 'ALL') return true;
    return (
      r.sourceChainId.toString() === filterChain ||
      r.destinationChainId.toString() === filterChain
    );
  });

  const sourceChain =
    chains.find((chain) => chain.id === 31337) || chains.find((chain) => chain.isSource);
  const destinationChain =
    chains.find((chain) => chain.id === 31338) || chains.find((chain) => chain.isDestination);
  const chainLabel = (chainId: number) =>
    chains.find((chain) => chain.id === chainId)?.shortName || `Chain ${chainId}`;

  return (
    <div className="space-y-6">
      {/* 1. ASYMMETRIC SPLIT HERO SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Side: Brand positioning, Core message, CTAs */}
        <div className="lg:col-span-7 bg-[#111317] border border-[#21252d] rounded-2xl p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden vecna-texture">
          <div className="absolute right-0 top-0 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-0" />

          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/50 text-cyan-300 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>CrossProof · Cross-Chain Verification</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-100 tracking-tight leading-tight">
              Don't trust the relay.<br />
              <span className="text-cyan-400 font-mono">Verify the proof.</span>
            </h1>

            <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
              CrossProof lets destination contracts verify that a transaction actually happened on another chain — no trusted relayer, no multisig, no backend shortcut. Just a Patricia Trie proof checked on-chain.
            </p>

            {/* Feature telemetry pills */}
            <div className="flex flex-wrap gap-2 pt-1 font-mono text-[13px]">
              {['Patricia Trie on-chain', 'Replay-proof by default', 'No trusted relayer'].map((label) => (
                <span key={label} className="technical-badge">
                  &bull; {label}
                </span>
              ))}
            </div>
          </div>

          {/* Action Button Row */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('verify')}
              className="vecna-button-primary px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs font-mono rounded-lg transition-all flex items-center space-x-2 shadow-lg shadow-cyan-950/50"
            >
              <span>Verify a Transaction</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('attack-lab')}
              className="vecna-button-secondary px-4 py-2.5 bg-[#171b22] hover:bg-[#1f242e] text-zinc-200 border border-zinc-700/80 font-mono text-xs rounded-lg transition-all flex items-center space-x-2"
            >
              <Terminal className="w-3.5 h-3.5 text-rose-400" />
              <span>Explore Proof Lab</span>
            </button>

            <button
              onClick={() => onNavigate('architecture')}
              className="vecna-button-secondary px-4 py-2.5 bg-transparent hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 font-mono text-xs rounded-lg transition flex items-center space-x-1"
            >
              <span>Protocol Specs &rarr;</span>
            </button>
          </div>
        </div>

        {/* Right Side: Animated Cross-Chain Flow Visualization */}
        <div className="lg:col-span-5 flex flex-col justify-stretch">
          <HeroVisual />
        </div>
      </div>

      {/* 2. SECURITY & TRUST STATUS BANNER */}
      <SecurityBanner onReviewTrust={() => onNavigate('security')} />

      {/* 3. FOUR-CARD METRICS ROW */}
      <MetricsCards records={records} />

      {/* 4. ACTIVITY & NETWORK PROTOCOL STATE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Verification Activity (8 cols) */}
        <div className="lg:col-span-8 bg-[#111317] border border-[#21252d] rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-zinc-800/80 gap-2">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-zinc-100">
                Recent On-Chain Verifications
              </h2>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <button
                onClick={() => onNavigate('history')}
                className="text-cyan-400 hover:text-cyan-300 hover:underline flex items-center space-x-1"
              >
                <span>Full Ledger ({records.length})</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800/60 text-zinc-400 text-[11px]">
                  <th className="pb-2">Verification ID</th>
                  <th className="pb-2">Route</th>
                  <th className="pb-2">Source Block</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filteredRecords.slice(0, 5).map((rec) => (
                  <tr key={rec.verificationId} className="hover:bg-zinc-900/40 transition">
                    <td className="py-2.5 text-zinc-300">
                      <div className="font-semibold text-zinc-200">{rec.verificationId}</div>
                      <span className="text-[10px] text-zinc-400">{rec.sourceTxHash.slice(0, 14)}...</span>
                    </td>
                    <td className="py-2.5 text-zinc-300">
                      <span className="text-cyan-400">{chainLabel(rec.sourceChainId)}</span>
                      <span className="text-zinc-500 mx-1">&rarr;</span>
                      <span className="text-emerald-400">{chainLabel(rec.destinationChainId)}</span>
                    </td>
                    <td className="py-2.5 text-zinc-300">
                      #{rec.blockNumber} <span className="text-zinc-500">(tx #{rec.txIndex})</span>
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={rec.status} size="sm" />
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => onSelectTxForVerification(rec.sourceChainId, rec.sourceTxHash)}
                        className="text-cyan-400 hover:text-cyan-300 hover:underline text-[11px]"
                      >
                        Inspect Proof &rarr;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Network Protocol State (4 cols) */}
        <div className="lg:col-span-4 bg-[#111317] border border-[#21252d] rounded-xl p-5 shadow-sm space-y-4 text-xs">
          <div className="flex items-center space-x-2 border-b border-zinc-800/80 pb-3">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold text-zinc-100">
              Dual-Chain Protocol State
            </h2>
          </div>

          <div className="space-y-3">
            {/* Origin Chain */}
            <div className="p-3 rounded-lg bg-[#0e1014] border border-[#1d2129]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-zinc-200 font-semibold">
                  Origin Chain: {sourceChain?.name || 'Not configured'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 text-[10px] border border-cyan-800/50">
                  ID: {sourceChain?.id || '—'}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">RPC: {sourceChain?.rpcUrl || 'Not configured'}</div>
              <div className="text-[10px] text-zinc-400 mt-1 truncate">
                Bridge: {sourceChain?.sourceBridgeAddress || 'Not configured'}
              </div>
            </div>

            {/* Destination Chain */}
            <div className="p-3 rounded-lg bg-[#0e1014] border border-[#1d2129]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-zinc-200 font-semibold">
                  Destination: {destinationChain?.name || 'Not configured'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] border border-emerald-800/50">
                  ID: {destinationChain?.id || '—'}
                </span>
              </div>
              <div className="text-[11px] text-zinc-400 font-mono">RPC: {destinationChain?.rpcUrl || 'Not configured'}</div>
              <div className="text-[10px] text-zinc-400 mt-1 truncate">
                Verifier: {destinationChain?.destinationVerifierAddress || 'Not configured'}
              </div>
            </div>

            {/* Cryptographic Guarantees */}
            <div className="p-3 rounded-lg bg-[#0e1014] border border-[#1d2129] space-y-1.5">
              <div className="text-zinc-300 font-semibold">Cryptographic Standards</div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Receipt Trie:</span>
                <span className="text-cyan-400">Merkle Patricia Trie</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Digest Function:</span>
                <span className="text-cyan-400">keccak256</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span>Replay Guard:</span>
                <span className="text-emerald-400">Persistent mapping (CEI)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
