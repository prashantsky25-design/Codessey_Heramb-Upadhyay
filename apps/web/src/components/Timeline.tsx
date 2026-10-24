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
    <div className="surface-card space-y-4 p-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full bg-[var(--accent)]" />
          <h3 className="text-sm font-semibold text-primary">
            Cryptographic Execution Timeline
          </h3>
        </div>
        <span className="tag tag-neutral">
          6-Stage Deterministic Verification
        </span>
      </div>

      {/* Stages list */}
      <div className="relative space-y-5 pl-6 before:absolute before:bottom-2 before:left-[15px] before:top-2 before:w-[2px] before:bg-[var(--line)]">
        {stages.map((stage, idx) => {
          const isDone = stage.status === 'completed';
          const isInProgress = stage.status === 'in_progress';
          const isFailed = stage.status === 'failed';
          const isPending = stage.status === 'pending';

          const spec = STAGE_SPECS[stage.id] || {
            summary: stage.label,
            cryptoGuarantee: 'Cryptographic assertion'
          };

          let iconBg = 'stage-number';
          let statusPill = (
            <span className="status-pill tag-neutral">
              WAITING
            </span>
          );

          if (isDone) {
            iconBg = 'stage-number-selected tag-success';
            statusPill = (
              <span className="status-pill tag-success">
                PASSED
              </span>
            );
          } else if (isInProgress) {
            iconBg = 'stage-number-selected animate-pulse';
            statusPill = (
              <span className="status-pill tag-accent animate-pulse">
                RUNNING...
              </span>
            );
          } else if (isFailed) {
            iconBg = 'stage-number-selected tag-danger';
            statusPill = (
              <span className="status-pill tag-danger">
                FAILED
              </span>
            );
          }

          return (
            <div key={stage.id} className="relative flex items-start space-x-3">
              {/* Timeline marker icon */}
              <div
                className={`absolute -left-[27px] z-10 flex h-6 w-6 items-center justify-center rounded-full border text-xs transition-colors ${iconBg}`}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5" />
                ) : isInProgress ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isFailed ? (
                  <X className="w-3.5 h-3.5" />
                ) : (
                  <span className="technical-data text-[10px]">{idx + 1}</span>
                )}
              </div>

              {/* Stage description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={`text-xs font-semibold ${
                      isDone
                        ? 'text-primary'
                        : isInProgress
                        ? 'accent-text'
                        : isFailed
                        ? 'danger-text'
                        : 'text-muted'
                    }`}
                  >
                    {stage.label}
                  </p>
                  {statusPill}
                </div>

                {/* Subtitle / Guarantee explanation */}
                <p className="mt-0.5 text-[11px] text-secondary">
                  {spec.summary}
                </p>

                {/* Live stage details when available */}
                {stage.details && (
                  <div className="technical-data mt-1 break-all rounded border border-[var(--line)] bg-[var(--surface-inset)] px-2.5 py-1.5 text-[11px] accent-text">
                    {stage.details}
                  </div>
                )}

                {/* Stage error if failed */}
                {stage.error && (
                  <div className="mt-2 space-y-1 rounded border border-[var(--danger)] bg-[var(--danger-soft)] p-3 text-xs danger-text">
                    <p className="flex items-center space-x-1.5 font-semibold">
                      <AlertCircle className="w-4 h-4" />
                      <span>Stage Verification Failure</span>
                    </p>
                    <p className="text-[11px] leading-relaxed">{stage.error}</p>
                    <div className="border-t border-[var(--line)] pt-1 text-[10px]">
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
        <div className="mt-5 space-y-2 rounded border border-[var(--danger)] bg-[var(--danger-soft)] p-3.5">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 danger-text" />
              <div className="text-xs danger-text">
                <span className="font-semibold">Pipeline Reverted:</span> {error}
              </div>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="button-secondary ml-3 px-2.5 py-1 text-xs"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>

          <div className="technical-data pl-6 text-[10px] text-secondary">
            Tip: Verify that the source transaction hash was dispatched via <code>SourceBridge.sol</code> and that the block has been committed to the destination verifier.
          </div>
        </div>
      )}
    </div>
  );
};
