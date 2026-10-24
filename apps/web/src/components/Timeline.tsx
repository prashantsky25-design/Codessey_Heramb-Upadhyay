import React from 'react';
import {
  Check,
  Loader2,
  X,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  RefreshCw,
  Binary
} from 'lucide-react';
import { TimelineStage } from '@crossproof/shared';

interface TimelineProps {
  stages: TimelineStage[];
  error?: string;
  onRetry?: () => void;
}

const STAGE_SPECS: Record<string, { summary: string; cryptoGuarantee: string }> = {
  tx_found: {
    summary: 'Source transaction confirmed in execution block',
    cryptoGuarantee: 'Block height, transaction index, and execution receipt mined on origin chain'
  },
  receipt_proof_retrieved: {
    summary: 'Constructed Patricia Merkle Trie inclusion proof',
    cryptoGuarantee: 'EIP-2718 typed receipt RLP encoded; MPT sibling nodes extracted from node'
  },
  inclusion_validated: {
    summary: 'Evaluated Patricia Trie cryptographic inclusion',
    cryptoGuarantee: 'keccak256(nodeBytes) recomputed on each branch node to verify convergence to receiptsRoot'
  },
  header_finality_validated: {
    summary: 'Source block header verified in HeaderVerifier',
    cryptoGuarantee: 'Ensures receiptsRoot belongs to a finalized, authenticated source header'
  },
  destination_verifier_called: {
    summary: 'Invoked verifyAndExecute() on DestinationVerifier',
    cryptoGuarantee: 'On-chain verification: replay check, domain separation, and payload hash binding'
  },
  on_chain_confirmed: {
    summary: 'Destination transaction mined and state finalized',
    cryptoGuarantee: 'processedMessages[messageId] set to true; application receiver notified'
  }
};

export const Timeline: React.FC<TimelineProps> = ({ stages, error, onRetry }) => {
  return (
    <div className="bg-[#111317] border border-[#21252d] rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-zinc-100 font-mono">
            Cryptographic Execution Timeline
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400">
          6-Stage Deterministic Verification
        </span>
      </div>

      {/* Stages list */}
      <div className="relative pl-6 space-y-5 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-800">
        {stages.map((stage, idx) => {
          const isDone = stage.status === 'completed';
          const isInProgress = stage.status === 'in_progress';
          const isFailed = stage.status === 'failed';
          const isPending = stage.status === 'pending';

          const spec = STAGE_SPECS[stage.id] || {
            summary: stage.label,
            cryptoGuarantee: 'Cryptographic assertion'
          };

          let iconBg = 'bg-[#15181f] border-zinc-700 text-zinc-500';
          let statusPill = (
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
              WAITING
            </span>
          );

          if (isDone) {
            iconBg = 'bg-emerald-950/80 border-emerald-500 text-emerald-400';
            statusPill = (
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 font-semibold">
                PASSED
              </span>
            );
          } else if (isInProgress) {
            iconBg = 'bg-cyan-950 border-cyan-400 text-cyan-400 animate-pulse';
            statusPill = (
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-700/50 animate-pulse font-semibold">
                RUNNING...
              </span>
            );
          } else if (isFailed) {
            iconBg = 'bg-rose-950 border-rose-500 text-rose-400';
            statusPill = (
              <span className="text-[10px] font-mono text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/40 font-semibold">
                FAILED
              </span>
            );
          }

          return (
            <div key={stage.id} className="relative flex items-start space-x-3">
              {/* Timeline marker icon */}
              <div
                className={`absolute -left-[27px] w-6 h-6 rounded-full border flex items-center justify-center text-xs transition-colors z-10 ${iconBg}`}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isInProgress ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isFailed ? (
                  <X className="w-3.5 h-3.5" />
                ) : (
                  <span className="text-[10px] font-mono">{idx + 1}</span>
                )}
              </div>

              {/* Stage description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-xs font-semibold uppercase tracking-wider font-mono ${
                      isDone
                        ? 'text-zinc-200'
                        : isInProgress
                        ? 'text-cyan-300'
                        : isFailed
                        ? 'text-rose-400'
                        : 'text-zinc-500'
                    }`}
                  >
                    {stage.label}
                  </p>
                  {statusPill}
                </div>

                {/* Subtitle / Guarantee explanation */}
                <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                  {spec.summary}
                </p>

                {/* Live stage details when available */}
                {stage.details && (
                  <div className="mt-1 text-[11px] text-cyan-300/90 font-mono bg-[#0c0e12] px-2.5 py-1.5 rounded border border-[#1b1f26] break-all">
                    {stage.details}
                  </div>
                )}

                {/* Stage error if failed */}
                {stage.error && (
                  <div className="mt-2 p-3 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs text-rose-300 font-mono space-y-1">
                    <p className="font-semibold text-rose-400 flex items-center space-x-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>Stage Verification Failure</span>
                    </p>
                    <p className="text-[11px] text-rose-200 leading-relaxed">{stage.error}</p>
                    <div className="text-[10px] text-rose-400/80 pt-1 border-t border-rose-900/40">
                      Reason: Contract or trie validator failed closed to protect destination state.
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Pipeline Error & Revert Decoder */}
      {error && (
        <div className="mt-5 p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-xs font-mono text-rose-200">
                <span className="font-semibold text-rose-300">Pipeline Reverted:</span> {error}
              </div>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="ml-3 px-2.5 py-1 bg-rose-900/60 hover:bg-rose-800 text-rose-200 rounded text-xs font-mono transition flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>

          <div className="text-[10px] text-zinc-400 font-mono pl-6">
            Tip: Verify that the source transaction hash was dispatched via <code>SourceBridge.sol</code> and that the block has been committed to the destination verifier.
          </div>
        </div>
      )}
    </div>
  );
};
