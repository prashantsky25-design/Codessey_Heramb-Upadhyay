import React, { useState } from 'react';
import {
  Layers,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Database,
  ArrowRight,
  GitBranch,
  Lock,
  Binary,
  Radio
} from 'lucide-react';

interface StageInfo {
  id: string;
  name: string;
  subtitle: string;
  role: string;
  details: string;
  codeRef: string;
  badge: string;
  status: 'active' | 'verified' | 'ready';
}

const FLOW_STAGES: StageInfo[] = [
  {
    id: 'source',
    name: 'Source Chain',
    subtitle: 'Ethereum (31337)',
    role: 'Emits Canonical Receipt',
    details: 'Dispatches typed MessageDispatched event with monotonic nonce, destination chainId, and payloadHash. Receipt is indexed into the block receiptsRoot.',
    codeRef: 'SourceBridge.sol :: dispatchMessage()',
    badge: 'Origin State',
    status: 'verified'
  },
  {
    id: 'mpt',
    name: 'Receipt Inclusion Proof',
    subtitle: 'Patricia Merkle Trie',
    role: 'Cryptographic Inclusion',
    details: 'Patricia Trie proof nodes cryptographically prove that key RLP(txIndex) maps to receipt bytes under receiptsRoot without trusting any off-chain relayer.',
    codeRef: 'MPTProof.sol :: verifyMPTProof()',
    badge: 'Zero-Trust Proof',
    status: 'verified'
  },
  {
    id: 'header',
    name: 'Header & Finality',
    subtitle: 'Consensus Commitment',
    role: 'Source Header Authentication',
    details: 'Ensures the block header and receiptsRoot have been authenticated by the light client or authorized header verifier before executing proofs.',
    codeRef: 'IHeaderVerifier.sol :: verifySourceHeader()',
    badge: 'Consensus Layer',
    status: 'active'
  },
  {
    id: 'dest',
    name: 'Destination Chain',
    subtitle: 'Optimism (31338)',
    role: 'On-Chain Execution & Replay Lock',
    details: 'DestinationVerifier verifies replay prevention mapping, checks payload hash binding, and dispatches the authenticated payload to the target application.',
    codeRef: 'DestinationVerifier.sol :: verifyAndExecute()',
    badge: 'Execution Target',
    status: 'ready'
  }
];

export const HeroVisual: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<string>('mpt');

  const activeStage = FLOW_STAGES.find((s) => s.id === selectedStage) || FLOW_STAGES[1];

  return (
    <div className="bg-[#0f1116] border border-[#1f242d] rounded-2xl p-5 shadow-2xl relative overflow-hidden flex flex-col justify-between">
      {/* Background technical accent */}
      <div className="absolute -right-16 -top-16 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar of visual */}
      <div className="flex items-center justify-between pb-3 border-b border-[#1c2027] mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-xs font-mono font-semibold text-zinc-200">
            Cryptographic Pipeline Flow
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161a22] text-zinc-400 border border-zinc-800">
          EVM Native &bull; Fail-Closed
        </span>
      </div>

      {/* 4 Pipeline Stages (Flow diagram) */}
      <div className="space-y-3 relative">
        {FLOW_STAGES.map((stage, idx) => {
          const isSelected = stage.id === selectedStage;
          const isLast = idx === FLOW_STAGES.length - 1;

          return (
            <div key={stage.id} className="relative">
              <div
                onClick={() => setSelectedStage(stage.id)}
                className={`cursor-pointer rounded-xl p-3 border transition-all duration-200 flex items-center justify-between ${
                  isSelected
                    ? 'bg-[#141820] border-cyan-500/50 shadow-md shadow-cyan-950/40 translate-x-1'
                    : 'bg-[#111318] border-[#1f232b] hover:border-zinc-700 hover:bg-[#13161c]'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Stage Number / Status Pill */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-zinc-800/80 text-zinc-400 border border-zinc-700/60'
                    }`}
                  >
                    0{idx + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold text-zinc-100 font-mono truncate">
                        {stage.name}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-400 hidden sm:inline">
                        {stage.subtitle}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-mono truncate mt-0.5">
                      {stage.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      stage.status === 'verified'
                        ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                        : stage.status === 'active'
                        ? 'bg-cyan-950/40 text-cyan-300 border-cyan-800/40'
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800'
                    }`}
                  >
                    {stage.badge}
                  </span>
                </div>
              </div>

              {/* Animated directional connector line between stages */}
              {!isLast && (
                <div className="h-2.5 flex items-center justify-center my-0.5 relative">
                  <div className="w-[2px] h-full bg-[#1f242d] relative overflow-hidden">
                    <div className="absolute inset-0 bg-cyan-400/80 animate-subtle-pulse" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Detail Inspector for clicked stage */}
      <div className="mt-4 p-3 rounded-xl bg-[#0a0c10] border border-[#1b1f26] font-mono text-xs space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800/60 pb-1.5">
          <span className="flex items-center space-x-1.5 text-cyan-400 font-semibold">
            <Binary className="w-3.5 h-3.5" />
            <span>Cryptographic Spec: {activeStage.name}</span>
          </span>
          <span className="text-[10px] text-zinc-500">{activeStage.codeRef}</span>
        </div>
        <p className="text-[11px] text-zinc-300 leading-relaxed pt-1">
          {activeStage.details}
        </p>
      </div>
    </div>
  );
};
