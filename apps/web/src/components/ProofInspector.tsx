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
  inclusionVerified?: boolean;
  trustMode?: string;
}

export const ProofInspector: React.FC<ProofInspectorProps> = ({
  proof,
  verificationId,
  destinationTxHash,
  gasUsed,
  durationMs,
  status = 'IDLE',
  messageId,
  inclusionVerified = false,
  trustMode
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
      <div className="bg-[#111317] border border-[#21252d] rounded-xl p-8 text-center text-zinc-500 font-mono text-xs space-y-2">
        <Database className="w-8 h-8 text-zinc-600 mx-auto" />
        <p className="text-zinc-400 font-semibold">Evidence Inspector Standby</p>
        <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
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
  const statusLabel = inclusionVerified ? 'MPT Verified' : 'Proof Captured';
  const statusClasses = inclusionVerified
    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
    : 'bg-amber-950/60 text-amber-300 border-amber-800/50';

  return (
    <div className="bg-[#111317] border border-[#21252d] rounded-xl p-5 shadow-lg space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-2">
        <div className="flex items-center space-x-2">
          <Binary className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-zinc-100">
            Cryptographic Evidence Inspector
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          <span className={`px-2 py-0.5 rounded border flex items-center space-x-1 ${statusClasses}`}>
            <ShieldCheck className="w-3 h-3" />
            <span>{statusLabel}</span>
          </span>
          {trustMode && (
            <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/50">
              {trustMode === 'MODE_A_LOCAL_ORACLE' ? 'MODE A' : trustMode}
            </span>
          )}
          <span className="px-2 py-0.5 rounded bg-[#161a22] text-zinc-300 border border-zinc-800">
            EIP-2718 / RLP
          </span>
        </div>
      </div>

      {/* Grid of Key Identifiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
        {/* Verification ID */}
        {verificationId && (
          <div className="bg-[#0c0e12] border border-[#1b1f26] p-2.5 rounded-lg flex items-center justify-between">
            <span className="text-zinc-500 text-[11px]">Verification ID:</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-zinc-200 font-semibold">{verificationId}</span>
              <button
                onClick={() => copyToClipboard(verificationId, 'verId')}
                className="text-zinc-400 hover:text-cyan-400 p-0.5 transition"
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
          <div className="bg-[#0c0e12] border border-[#1b1f26] p-2.5 rounded-lg flex items-center justify-between">
            <span className="text-zinc-500 text-[11px]">Message ID:</span>
            <div className="flex items-center space-x-1.5">
              <span className="text-cyan-300 font-mono">
                {messageId.slice(0, 10)}...{messageId.slice(-8)}
              </span>
              <button
                onClick={() => copyToClipboard(messageId, 'msgId')}
                className="text-zinc-400 hover:text-cyan-400 p-0.5 transition"
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
        <div className="bg-[#0c0e12] border border-[#1b1f26] p-2.5 rounded-lg flex items-center justify-between">
          <span className="text-zinc-500 text-[11px]">Source Block:</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-200 font-semibold">#{proof.blockNumber}</span>
            <span className="text-zinc-500 text-[10px]">
              ({proof.blockHash.slice(0, 8)}...)
            </span>
            <button
              onClick={() => copyToClipboard(proof.blockHash, 'bHash')}
              className="text-zinc-400 hover:text-cyan-400 p-0.5 transition"
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
        <div className="bg-[#0c0e12] border border-[#1b1f26] p-2.5 rounded-lg flex items-center justify-between">
          <span className="text-zinc-500 text-[11px]">Trie Key:</span>
          <span className="text-zinc-200">
            txIndex <strong className="text-cyan-400">#{proof.txIndex}</strong>
          </span>
        </div>

        {/* Source Bridge Address */}
        <div className="bg-[#0c0e12] border border-[#1b1f26] p-2.5 rounded-lg flex items-center justify-between">
          <span className="text-zinc-500 text-[11px]">Source Bridge:</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-300">
              {proof.sourceContract.slice(0, 8)}...{proof.sourceContract.slice(-6)}
            </span>
            <button
              onClick={() => copyToClipboard(proof.sourceContract, 'srcBridge')}
              className="text-zinc-400 hover:text-cyan-400 p-0.5 transition"
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
        <div className="bg-[#0c0e12] border border-[#1b1f26] p-2.5 rounded-lg flex items-center justify-between">
          <span className="text-zinc-500 text-[11px]">ReceiptsRoot:</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-cyan-300">
              {proof.receiptsRoot.slice(0, 8)}...{proof.receiptsRoot.slice(-6)}
            </span>
            <button
              onClick={() => copyToClipboard(proof.receiptsRoot, 'recRoot')}
              className="text-zinc-400 hover:text-cyan-400 p-0.5 transition"
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
          <div className="bg-[#0c0e12] border border-[#1b1f26] p-2.5 rounded-lg flex items-center justify-between col-span-1 md:col-span-2">
            <span className="text-zinc-500 text-[11px]">Destination Tx Hash:</span>
            <div className="flex items-center space-x-1.5 truncate">
              <span className="text-emerald-400 font-semibold truncate">
                {destinationTxHash}
              </span>
              <button
                onClick={() => copyToClipboard(destinationTxHash, 'destTx')}
                className="text-zinc-400 hover:text-cyan-400 p-0.5 transition shrink-0"
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
        <div className="bg-[#0c0e12] p-2.5 rounded-lg border border-[#1b1f26]">
          <span className="text-zinc-500 block text-[10px]">Proof Nodes:</span>
          <span className="text-zinc-200 font-bold">{proof.mptProof.length} node(s)</span>
        </div>
        <div className="bg-[#0c0e12] p-2.5 rounded-lg border border-[#1b1f26]">
          <span className="text-zinc-500 block text-[10px]">Proof Size:</span>
          <span className="text-zinc-200 font-bold">{proofSizeBytes} bytes</span>
        </div>
        <div className="bg-[#0c0e12] p-2.5 rounded-lg border border-[#1b1f26]">
          <span className="text-zinc-500 block text-[10px]">Destination Gas:</span>
          <span className="text-zinc-200 font-bold">
            {gasUsed ? Number(gasUsed).toLocaleString() : '—'}
          </span>
        </div>
        <div className="bg-[#0c0e12] p-2.5 rounded-lg border border-[#1b1f26]">
          <span className="text-zinc-500 block text-[10px]">Proof Latency:</span>
          <span className="text-zinc-200 font-bold">
            {durationMs ? `${durationMs}ms` : '—'}
          </span>
        </div>
      </div>

      {/* Expandable: MPT Proof Nodes */}
      <div className="border border-[#1f242d] rounded-lg overflow-hidden text-xs">
        <button
          onClick={() => setExpandedNodes(!expandedNodes)}
          className="w-full bg-[#0e1015] px-3.5 py-2.5 flex items-center justify-between text-zinc-300 hover:bg-[#13161c] transition"
        >
          <span className="flex items-center space-x-2">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold">
              Patricia Trie Proof Nodes ({proof.mptProof.length})
            </span>
          </span>
          <div className="flex items-center space-x-2 text-[11px] text-zinc-500">
            <span>{proofSizeBytes} bytes total</span>
            {expandedNodes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {expandedNodes && (
          <div className="p-3 bg-[#0a0b0e] space-y-2.5 max-h-64 overflow-y-auto border-t border-[#1f242d]">
            {proof.mptProof.map((node, i) => {
              const nodeBytes = Math.max(0, (node.length - 2) / 2);
              return (
                <div key={i} className="p-2.5 bg-[#0e1015] rounded-lg border border-[#1b1f26]">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
                    <span className="font-semibold text-zinc-300">
                      Node #{i} ({nodeBytes} bytes)
                    </span>
                    <button
                      onClick={() => copyToClipboard(node, `node-${i}`)}
                      className="text-cyan-400 hover:underline flex items-center space-x-1"
                    >
                      {copiedKey === `node-${i}` ? (
                        <span className="text-emerald-400">Copied!</span>
                      ) : (
                        <span>Copy Hex</span>
                      )}
                    </button>
                  </div>
                  <div className="text-[10px] text-zinc-400 break-all bg-black/50 p-2 rounded border border-zinc-800/60 font-mono select-all">
                    {node}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Expandable: Canonical Ethereum RLP Receipt */}
      <div className="border border-[#1f242d] rounded-lg overflow-hidden text-xs">
        <button
          onClick={() => setExpandedReceipt(!expandedReceipt)}
          className="w-full bg-[#0e1015] px-3.5 py-2.5 flex items-center justify-between text-zinc-300 hover:bg-[#13161c] transition"
        >
          <span className="flex items-center space-x-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold">
              RLP-Encoded Receipt ({receiptSizeBytes} bytes)
            </span>
          </span>
          <div className="flex items-center space-x-2 text-[11px] text-zinc-500">
            <span>Payload & Logs</span>
            {expandedReceipt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {expandedReceipt && (
          <div className="p-3 bg-[#0a0b0e] space-y-2 border-t border-[#1f242d]">
            <div className="flex items-center justify-between text-[11px] text-zinc-400">
              <span>Canonical Ethereum Receipt Payload (Status, Gas, Bloom, Logs)</span>
              <button
                onClick={() => copyToClipboard(proof.receiptRlp, 'rcptRlp')}
                className="text-cyan-400 hover:underline"
              >
                {copiedKey === 'rcptRlp' ? 'Copied' : 'Copy Full Hex'}
              </button>
            </div>
            <div className="text-[10px] text-zinc-400 break-all bg-black/50 p-2.5 rounded border border-zinc-800/60 font-mono max-h-40 overflow-y-auto select-all">
              {proof.receiptRlp}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
