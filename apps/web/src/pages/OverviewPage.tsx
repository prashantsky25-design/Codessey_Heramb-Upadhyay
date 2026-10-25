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

  const sourceChain = chains.find((c) => c.isSource) || chains.find((c) => c.id === 31337);
  const destChain = chains.find((c) => c.isDestination) || chains.find((c) => c.id === 31338);

  return (
    <div className="space-y-6">
      {/* 1. ASYMMETRIC SPLIT HERO SECTION */}
       <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
        {/* Left Side: Brand positioning, Core message, CTAs */}
         <div className="hero-panel surface-card soft-grid relative flex flex-col justify-between overflow-hidden p-6 sm:p-8 lg:col-span-7">

          <div className="space-y-4">
             <div className="tag tag-accent inline-flex items-center gap-2">
               <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
               <span>Decentralized cross-chain transaction verification</span>
            </div>

             <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-strong sm:text-4xl">
               Don't trust the relay. <br />
               <span className="accent-text">Verify the proof.</span>
             </h1>

             <p className="max-w-xl text-sm leading-relaxed text-secondary">
               CrossProof lets destination contracts verify cryptographic inclusion of transactions originating on another blockchain via Merkle Patricia Trie proofs and decoupled header verification.
             </p>

            {/* Feature telemetry pills */}
             <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
               <span className="tag tag-neutral">
                 Patricia Trie on-chain
               </span>
               <span className="tag tag-neutral">
                 Replay-proof by default
               </span>
               <span className="tag tag-neutral">
                 Untrusted Relayers Allowed
               </span>
            </div>
          </div>

          {/* Action Button Row */}
           <div className="mt-8 flex flex-wrap items-center gap-3">
             <button
               onClick={() => onNavigate('verify')}
               className="button-primary"
            >
              <span>Verify a Transaction</span>
              <ArrowRight className="w-4 h-4" />
            </button>

             <button
               onClick={() => onNavigate('attack-lab')}
               className="button-secondary"
            >
               <Terminal className="h-3.5 w-3.5 danger-text" />
              <span>Explore Proof Lab</span>
            </button>

             <button
               onClick={() => onNavigate('architecture')}
               className="button-ghost"
            >
              <span>Protocol Specs &rarr;</span>
            </button>
          </div>
        </div>

        {/* Right Side: Animated Cross-Chain Flow Visualization */}
         <div className="flex flex-col justify-stretch lg:col-span-5">
          <HeroVisual />
        </div>
      </div>

      {/* 2. SECURITY & TRUST STATUS BANNER */}
      <SecurityBanner onReviewTrust={() => onNavigate('security')} />

      {/* 3. FOUR-CARD METRICS ROW */}
      <MetricsCards records={records} />

      {/* 4. ACTIVITY & NETWORK PROTOCOL STATE */}
       <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Recent Verification Activity (8 cols) */}
         <div className="surface-card space-y-4 p-5 lg:col-span-8">
           <div className="flex flex-col justify-between gap-2 border-b border-[var(--line)] pb-3 sm:flex-row sm:items-center">
            <div className="flex items-center space-x-2">
               <Activity className="h-4 w-4 accent-text" />
               <h2 className="text-sm font-semibold text-primary">
                Recent On-Chain Verifications
              </h2>
            </div>

             <div className="flex items-center space-x-3 text-xs">
              <button
                onClick={() => onNavigate('history')}
                 className="accent-text flex items-center space-x-1 hover:underline"
              >
                <span>Full Ledger ({records.length})</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
             <table className="w-full text-left text-xs">
              <thead>
                 <tr className="border-b border-[var(--line)] text-[11px] text-muted">
                  <th className="pb-2">Verification ID</th>
                  <th className="pb-2">Route</th>
                  <th className="pb-2">Source Block</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {filteredRecords.slice(0, 5).map((rec) => (
                   <tr key={rec.verificationId} className="transition hover:bg-[var(--surface-muted)]">
                     <td className="py-2.5 text-primary">
                       <div className="font-semibold">{rec.verificationId}</div>
                       <span className="technical-data text-[10px] text-muted">{rec.sourceTxHash.slice(0, 14)}...</span>
                     </td>
                     <td className="py-2.5 text-primary">
                       <span className="accent-text">ETH ({rec.sourceChainId})</span>
                       <span className="mx-1 text-muted">&rarr;</span>
                       <span className="success-text">OP ({rec.destinationChainId})</span>
                     </td>
                     <td className="technical-data py-2.5 text-primary">
                       #{rec.blockNumber} <span className="text-muted">(tx #{rec.txIndex})</span>
                    </td>
                    <td className="py-2.5">
                      <StatusBadge status={rec.status} size="sm" />
                    </td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => onSelectTxForVerification(rec.sourceChainId, rec.sourceTxHash)}
                         className="accent-text text-[11px] hover:underline"
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
         <div className="surface-card space-y-4 p-5 lg:col-span-4">
           <div className="flex items-center space-x-2 border-b border-[var(--line)] pb-3">
             <Cpu className="h-4 w-4 accent-text" />
             <h2 className="text-sm font-semibold text-primary">
              Dual-Chain Protocol State
            </h2>
          </div>

          <div className="space-y-3">
            {/* Origin Chain */}
             <div className="surface-inset p-3">
              <div className="flex items-center justify-between mb-1">
                 <span className="font-semibold text-primary">Origin Chain: {sourceChain?.name || 'Ethereum Local (Source)'}</span>
                 <span className="tag tag-accent">
                  ID: {sourceChain?.id || 31337}
                </span>
              </div>
               <div className="technical-data mt-2 text-[11px] text-secondary">RPC: {sourceChain?.rpcUrl || 'http://127.0.0.1:8545'}</div>
               <div className="technical-data mt-1 truncate text-[10px] text-muted">
                Bridge: {sourceChain?.sourceBridgeAddress || 'Not configured'}
              </div>
            </div>

            {/* Destination Chain */}
             <div className="surface-inset p-3">
              <div className="flex items-center justify-between mb-1">
                 <span className="font-semibold text-primary">Destination: {destChain?.name || 'Optimism Local (Destination)'}</span>
                 <span className="tag tag-success">
                  ID: {destChain?.id || 31338}
                </span>
              </div>
               <div className="technical-data mt-2 text-[11px] text-secondary">RPC: {destChain?.rpcUrl || 'http://127.0.0.1:8546'}</div>
               <div className="technical-data mt-1 truncate text-[10px] text-muted">
                Verifier: {destChain?.destinationVerifierAddress || 'Not configured'}
              </div>
            </div>

            {/* Cryptographic Guarantees */}
             <div className="surface-inset space-y-1.5 p-3">
               <div className="font-semibold text-primary">Cryptographic Standards</div>
               <div className="flex items-center justify-between text-[11px] text-secondary">
                <span>Receipt Trie:</span>
                 <span className="accent-text">Merkle Patricia Trie</span>
              </div>
               <div className="flex items-center justify-between text-[11px] text-secondary">
                <span>Digest Function:</span>
                 <span className="accent-text technical-data">keccak256</span>
              </div>
               <div className="flex items-center justify-between text-[11px] text-secondary">
                <span>Replay Guard:</span>
                 <span className="success-text">Persistent mapping (CEI)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
