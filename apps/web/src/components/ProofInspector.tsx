import React, { useState } from 'react';
import {
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Binary,
  Cpu,
  Database,
  ExternalLink,
  Layers,
  Zap,
  Info
} from 'lucide-react';
import { CrossChainProofData } from '@crossproof/shared';

interface ProofInspectorProps {
  proof?: CrossChainProofData;
  verificationId?: string;
  destinationTxHash?: string;
  gasUsed?: string;
  durationMs?: number;
  status?: string;
  messageId?: string;
}

export const ProofInspector: React.FC<ProofInspectorProps> = ({
  proof,
  verificationId,
  destinationTxHash,
  gasUsed,
  durationMs,
  status = 'VERIFIED',
  messageId
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState(false);
  const [expandedReceipt, setExpandedReceipt] = useState(false);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!proof) {
    return (
      <div className="surface-card space-y-2 p-8 text-center text-xs text-muted">
        <Database className="mx-auto h-8 w-8 text-muted" />
        <p className="font-semibold text-secondary">Evidence Inspector Standby</p>
        <p className="mx-auto max-w-sm text-[11px]">
          Submit a source transaction hash or select an item from recent verification history to inspect cryptographic Patricia Trie proof nodes, canonical RLP receipt bytes, and on-chain verification telemetry.
        </p>
      </div>
    );
  }

  const proofSizeBytes = proof.mptProof.reduce(
    (acc, n) => acc + Math.max(0, (n.length - 2) / 2),
    0
  );
  const receiptSizeBytes = Math.max(0, (proof.receiptRlp.length - 2) / 2);

  return (
    <div className="surface-card space-y-4 p-5">
      {/* Header */}
      <div className="flex flex-col justify-between gap-2 border-b border-[var(--line)] pb-3 sm:flex-row sm:items-center">
        <div className="flex items-center space-x-2">
          <Binary className="h-4 w-4 accent-text" />
          <h3 className="text-sm font-semibold text-primary">
            Cryptographic Evidence Inspector
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className={`status-pill ${status === 'VERIFIED' ? 'tag-success' : 'tag-warning'}`}>
            <ShieldCheck className="h-3 w-3" />
            <span>{status === 'VERIFIED' ? 'MPT Verified' : 'Evidence Retrieved'}</span>
          </span>
          <span className="tag tag-neutral">
            EIP-2718 / RLP
          </span>
        </div>
      </div>

      {/* Grid of Key Identifiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
        {/* Verification ID */}
        {verificationId && (
          <div className="surface-inset flex items-center justify-between p-2.5">
            <span className="text-[11px] text-muted">Verification ID:</span>
            <div className="flex items-center space-x-1.5">
               <span className="technical-data font-semibold text-primary">{verificationId}</span>
              <button
                onClick={() => copyToClipboard(verificationId, 'verId')}
                 className="p-0.5 text-secondary transition hover:text-[var(--accent)]"
                title="Copy verification ID"
              >
                {copiedKey === 'verId' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Domain-Separated Message ID */}
        {messageId && (
          <div className="surface-inset flex items-center justify-between p-2.5">
            <span className="text-[11px] text-muted">Message ID:</span>
            <div className="flex items-center space-x-1.5">
               <span className="technical-data accent-text">
                {messageId.slice(0, 10)}...{messageId.slice(-8)}
              </span>
              <button
                onClick={() => copyToClipboard(messageId, 'msgId')}
                 className="p-0.5 text-secondary transition hover:text-[var(--accent)]"
                title="Copy full message ID"
              >
                {copiedKey === 'msgId' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Source Block and Hash */}
        <div className="surface-inset flex items-center justify-between p-2.5">
          <span className="text-[11px] text-muted">Source Block:</span>
          <div className="flex items-center space-x-1.5">
            <span className="technical-data font-semibold text-primary">#{proof.blockNumber}</span>
            <span className="technical-data text-[10px] text-muted">
              ({proof.blockHash.slice(0, 8)}...)
            </span>
            <button
              onClick={() => copyToClipboard(proof.blockHash, 'bHash')}
              className="p-0.5 text-secondary transition hover:text-[var(--accent)]"
            >
              {copiedKey === 'bHash' ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Tx Index in Block */}
        <div className="surface-inset flex items-center justify-between p-2.5">
          <span className="text-[11px] text-muted">Trie Key:</span>
          <span className="technical-data text-primary">
            txIndex <strong className="accent-text">#{proof.txIndex}</strong>
          </span>
        </div>

        {/* Source Bridge Address */}
        <div className="surface-inset flex items-center justify-between p-2.5">
          <span className="text-[11px] text-muted">Source Bridge:</span>
          <div className="flex items-center space-x-1.5">
            <span className="technical-data text-primary">
              {proof.sourceContract.slice(0, 8)}...{proof.sourceContract.slice(-6)}
            </span>
            <button
              onClick={() => copyToClipboard(proof.sourceContract, 'srcBridge')}
              className="p-0.5 text-secondary transition hover:text-[var(--accent)]"
            >
              {copiedKey === 'srcBridge' ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Receipts Root */}
        <div className="surface-inset flex items-center justify-between p-2.5">
          <span className="text-[11px] text-muted">ReceiptsRoot:</span>
          <div className="flex items-center space-x-1.5">
            <span className="technical-data accent-text">
              {proof.receiptsRoot.slice(0, 8)}...{proof.receiptsRoot.slice(-6)}
            </span>
            <button
              onClick={() => copyToClipboard(proof.receiptsRoot, 'recRoot')}
              className="p-0.5 text-secondary transition hover:text-[var(--accent)]"
            >
              {copiedKey === 'recRoot' ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Destination Transaction Hash */}
        {destinationTxHash && (
          <div className="surface-inset col-span-1 flex items-center justify-between p-2.5 md:col-span-2">
            <span className="text-[11px] text-muted">Destination Tx Hash:</span>
            <div className="flex items-center space-x-1.5 truncate">
              <span className="technical-data success-text truncate font-semibold">
                {destinationTxHash}
              </span>
              <button
                onClick={() => copyToClipboard(destinationTxHash, 'destTx')}
                className="shrink-0 p-0.5 text-secondary transition hover:text-[var(--accent)]"
              >
                {copiedKey === 'destTx' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Proof Performance Telemetry Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div className="surface-inset p-2.5">
          <span className="block text-[10px] text-muted">Proof Nodes:</span>
          <span className="technical-data font-bold text-primary">{proof.mptProof.length} node(s)</span>
        </div>
        <div className="surface-inset p-2.5">
          <span className="block text-[10px] text-muted">Proof Size:</span>
          <span className="technical-data font-bold text-primary">{proofSizeBytes} bytes</span>
        </div>
        <div className="surface-inset p-2.5">
          <span className="block text-[10px] text-muted">Destination Gas:</span>
          <span className="technical-data font-bold text-primary">
            {gasUsed ? Number(gasUsed).toLocaleString() : 'N/A'}
          </span>
        </div>
        <div className="surface-inset p-2.5">
          <span className="block text-[10px] text-muted">Proof Latency:</span>
          <span className="technical-data font-bold text-primary">
            {durationMs ? `${durationMs}ms` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Expandable: MPT Proof Nodes */}
      <div className="overflow-hidden rounded border border-[var(--line)] text-xs">
        <button
          onClick={() => setExpandedNodes(!expandedNodes)}
          className="flex w-full items-center justify-between bg-[var(--surface-muted)] px-3.5 py-2.5 text-primary transition hover:bg-[var(--surface-raised)]"
        >
          <span className="flex items-center space-x-2">
            <Database className="h-3.5 w-3.5 accent-text" />
            <span className="font-semibold">
              Patricia Trie Proof Nodes ({proof.mptProof.length})
            </span>
          </span>
          <div className="flex items-center space-x-2 text-[11px] text-muted">
            <span>{proofSizeBytes} bytes total</span>
            {expandedNodes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {expandedNodes && (
          <div className="max-h-64 space-y-2.5 overflow-y-auto border-t border-[var(--line)] bg-[var(--surface-inset)] p-3">
            {proof.mptProof.map((node, i) => {
              const nodeBytes = Math.max(0, (node.length - 2) / 2);
              return (
                <div key={i} className="surface-card-raised p-2.5">
                  <div className="mb-1.5 flex items-center justify-between text-[11px] text-secondary">
                    <span className="font-semibold text-primary">
                      Node #{i} ({nodeBytes} bytes)
                    </span>
                    <button
                      onClick={() => copyToClipboard(node, `node-${i}`)}
                      className="accent-text flex items-center space-x-1 hover:underline"
                    >
                      {copiedKey === `node-${i}` ? (
                        <span className="text-emerald-400">Copied!</span>
                      ) : (
                        <span>Copy Hex</span>
                      )}
                    </button>
                  </div>
                  <div className="technical-data break-all rounded border border-[var(--line)] bg-[var(--surface)] p-2 text-[10px] text-secondary select-all">
                    {node}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expandable: Canonical Ethereum RLP Receipt */}
      <div className="overflow-hidden rounded border border-[var(--line)] text-xs">
        <button
          onClick={() => setExpandedReceipt(!expandedReceipt)}
          className="flex w-full items-center justify-between bg-[var(--surface-muted)] px-3.5 py-2.5 text-primary transition hover:bg-[var(--surface-raised)]"
        >
          <span className="flex items-center space-x-2">
            <Cpu className="h-3.5 w-3.5 accent-text" />
            <span className="font-semibold">
              RLP-Encoded Receipt ({receiptSizeBytes} bytes)
            </span>
          </span>
          <div className="flex items-center space-x-2 text-[11px] text-muted">
            <span>Payload & Logs</span>
            {expandedReceipt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {expandedReceipt && (
          <div className="space-y-2 border-t border-[var(--line)] bg-[var(--surface-inset)] p-3">
            <div className="flex items-center justify-between text-[11px] text-secondary">
              <span>Canonical Ethereum Receipt Payload (Status, Gas, Bloom, Logs)</span>
              <button
                onClick={() => copyToClipboard(proof.receiptRlp, 'rcptRlp')}
                className="accent-text hover:underline"
              >
                {copiedKey === 'rcptRlp' ? 'Copied' : 'Copy Full Hex'}
              </button>
            </div>
            <div className="technical-data max-h-40 overflow-y-auto break-all rounded border border-[var(--line)] bg-[var(--surface)] p-2.5 text-[10px] text-secondary select-all">
              {proof.receiptRlp}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
