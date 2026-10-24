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
    <div className="surface-card-raised relative flex flex-col justify-between overflow-hidden p-5">
      {/* Background technical accent */}
      <div className="diagram-glow diagram-glow-top" />
      <div className="diagram-glow diagram-glow-bottom" />

      {/* Header bar of visual */}
      <div className="mb-4 flex items-center justify-between border-b border-[var(--line)] pb-3">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          <span className="text-xs font-semibold text-primary">
            Cryptographic Pipeline Flow
          </span>
        </div>
        <span className="tag tag-neutral">
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
              <button
                type="button"
                onClick={() => setSelectedStage(stage.id)}
                aria-pressed={isSelected}
                className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition-all duration-200 ${
                  isSelected
                    ? 'stage-card-selected'
                    : 'surface-inset hover:border-[var(--line-strong)]'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {/* Stage Number / Status Pill */}
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-colors ${
                      isSelected
                        ? 'stage-number-selected'
                        : 'stage-number'
                    }`}
                  >
                    0{idx + 1}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="block truncate text-xs font-semibold text-primary">
                        {stage.name}
                      </span>
                      <span className="tag tag-neutral hidden sm:inline">
                        {stage.subtitle}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-secondary">
                      {stage.role}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span
                    className={`tag ${
                      stage.status === 'verified'
                        ? 'tag-success'
                        : stage.status === 'active'
                        ? 'tag-accent'
                        : 'tag-neutral'
                    }`}
                  >
                    {stage.badge}
                  </span>
                </div>
              </button>

              {/* Animated directional connector line between stages */}
              {!isLast && (
                <div className="h-2.5 flex items-center justify-center my-0.5 relative">
                  <div className="pipeline-connector">
                    <div className="pipeline-connector-active animate-subtle-pulse" />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Detail Inspector for clicked stage */}
      <div className="surface-inset mt-4 space-y-1.5 p-3 text-xs">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-1.5 text-[11px] text-secondary">
          <span className="flex items-center space-x-1.5 font-semibold accent-text">
            <Binary className="w-3.5 h-3.5" />
            <span>Cryptographic Spec: {activeStage.name}</span>
          </span>
          <span className="technical-data text-[10px] text-muted">{activeStage.codeRef}</span>
        </div>
        <p className="pt-1 text-[11px] leading-relaxed text-secondary">
          {activeStage.details}
        </p>
      </div>
    </div>
  );
};
