import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Search,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Cpu,
  Layers,
  Sparkles,
  Zap,
  HelpCircle
} from 'lucide-react';
import {
  ChainConfig,
  CrossChainProofData,
  TimelineStage,
  INVALID_TRANSACTION_HASH_MESSAGE,
  normalizeTransactionHash
} from '@crossproof/shared';
import {
  prepareVerification,
  submitVerification,
  verifyProofLocally
} from '../api';
import { Timeline } from '../components/Timeline';
import { ProofInspector } from '../components/ProofInspector';
import { StatusBadge } from '../components/StatusBadge';

interface VerifyPageProps {
  chains: ChainConfig[];
  initialTxHash?: string;
  initialChainId?: number;
  onVerificationCompleted?: () => void;
  /** Called with the completed proof so App can forward it to AttackLabPage */
  onProofReady?: (proof: CrossChainProofData) => void;
}

const DEFAULT_STAGES: TimelineStage[] = [
  { id: 'tx_found', label: '1. Source Transaction Found', status: 'pending' },
  { id: 'receipt_proof_retrieved', label: '2. Receipt & Trie Proof Retrieved', status: 'pending' },
  { id: 'inclusion_validated', label: '3. Inclusion Proof Validated', status: 'pending' },
  { id: 'header_finality_validated', label: '4. Source Header / Finality Validated', status: 'pending' },
  { id: 'destination_verifier_called', label: '5. Destination Verifier Invoked', status: 'pending' },
  { id: 'on_chain_confirmed', label: '6. On-Chain Result Confirmed', status: 'pending' }
];

const SAMPLE_HASHES = [
  {
    label: 'Live Mined Tx #3',
    hash: '0x8bb760d32fddc2c347ecfc679a7372101cf4a64fe852c48f290490cb0af63c0f',
    desc: 'Live mined cross-chain message on Chain 31337'
  },
  {
    label: 'Use a live hash',
    hash: '',
    desc: 'Paste a mined MessageDispatched transaction from the source chain'
  }
];

export const VerifyPage: React.FC<VerifyPageProps> = ({
  chains,
  initialTxHash = '',
  initialChainId = 31337,
  onVerificationCompleted,
  onProofReady
}) => {
  const [sourceChainId, setSourceChainId] = useState<number>(initialChainId);
  const [destinationChainId, setDestinationChainId] = useState<number>(31338);
  const [txHash, setTxHash] = useState<string>(initialTxHash);

  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<TimelineStage[]>(DEFAULT_STAGES);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const [proofData, setProofData] = useState<CrossChainProofData | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [destinationTxHash, setDestinationTxHash] = useState<string | null>(null);
  const [gasUsed, setGasUsed] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [verifiedMessageId, setVerifiedMessageId] = useState<string | null>(null);
  const [finalStatus, setFinalStatus] = useState<'IDLE' | 'VERIFIED' | 'REJECTED'>('IDLE');

  useEffect(() => {
    if (initialTxHash) {
      setTxHash(initialTxHash);
    }
    if (initialChainId) {
      setSourceChainId(initialChainId);
    }
  }, [initialTxHash, initialChainId]);

  const updateStage = (
    id: TimelineStage['id'],
    status: TimelineStage['status'],
    details?: string,
    error?: string
  ) => {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, details, error } : s))
    );
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    let cleanHash: `0x${string}`;
    try {
      cleanHash = normalizeTransactionHash(txHash);
    } catch {
      setGeneralError(INVALID_TRANSACTION_HASH_MESSAGE);
      return;
    }

    setLoading(true);
    setGeneralError(null);
    setProofData(null);
    setDestinationTxHash(null);
    setGasUsed(null);
    setFinalStatus('IDLE');

    // Reset stages to waiting
    setStages(DEFAULT_STAGES);

    try {
      // STAGE 1: Source transaction found
      updateStage('tx_found', 'in_progress', 'Locating transaction receipt on origin chain RPC...');

      const prepareResult = await prepareVerification(sourceChainId, cleanHash, destinationChainId);

      setProofData(prepareResult.proof);
      setVerificationId(prepareResult.verificationId);
      setVerifiedMessageId(prepareResult.extractedEvent.messageId);
      setDurationMs(prepareResult.metrics.durationMs);

      updateStage(
        'tx_found',
        'completed',
        `Mined in block #${prepareResult.proof.blockNumber} (txIndex: ${prepareResult.proof.txIndex})`
      );

      // STAGE 2: Receipt & Trie Proof Retrieved
      updateStage(
        'receipt_proof_retrieved',
        'in_progress',
        'Constructing Patricia Merkle Trie from block receipts...'
      );

      updateStage(
        'receipt_proof_retrieved',
        'completed',
        `Extracted ${prepareResult.metrics.proofNodesCount} MPT proof node(s) (${prepareResult.metrics.totalProofSizeBytes} bytes)`
      );

      // STAGE 3: Inclusion proof verified
      updateStage('inclusion_validated', 'in_progress', 'Recomputing keccak256 hashes along trie proof path...');

      const verifyCheck = await verifyProofLocally(
        sourceChainId,
        destinationChainId,
        cleanHash,
        prepareResult.proof
      );

      if (!verifyCheck.checks?.mptInclusionValid) {
        updateStage(
          'inclusion_validated',
          'failed',
          undefined,
          'Cryptographic MPT hash mismatch: sibling proof nodes do not resolve to receiptsRoot'
        );
        throw new Error('Receipt proof failed cryptographic Patricia Trie inclusion check');
      }

      updateStage(
        'inclusion_validated',
        'completed',
        `Root matched: ${prepareResult.proof.receiptsRoot.slice(0, 18)}...`
      );

      // STAGE 4: Source Header / Finality
      // P1 fix: check verifyCheck.checks?.headerCommitted instead of unconditionally marking completed.
      // The prepare step commits the header to DevHeaderOracle on-chain; verifyProofLocally reads it back.
      // If the oracle commit failed (headerValidated=false in the API response), this will be false.
      updateStage('header_finality_validated', 'in_progress', 'Confirming source header commitment in DevHeaderOracle...');

      if (!verifyCheck.checks?.headerCommitted) {
        updateStage(
          'header_finality_validated',
          'failed',
          undefined,
          'Source header was NOT committed to the DevHeaderOracle. ' +
          'Ensure the destination chain RPC (http://127.0.0.1:8546) is running and the relayer has funds. ' +
          'On-chain submission will be rejected by DestinationVerifier.verifyAndExecute().'
        );
        throw new Error(
          'Stage 4 failed: Source header not committed to HeaderOracle. ' +
          'Cannot proceed to on-chain verification.'
        );
      }

      updateStage(
        'header_finality_validated',
        'completed',
        'Source header authenticated and committed to DevHeaderOracle'
      );

      // STAGE 5: Destination Verifier Invoked
      updateStage(
        'destination_verifier_called',
        'in_progress',
        'Submitting verifyAndExecute() on DestinationVerifier contract...'
      );

      const submitResult = await submitVerification(
        sourceChainId,
        destinationChainId,
        cleanHash,
        prepareResult.proof
      );

      updateStage(
        'destination_verifier_called',
        'completed',
        `Tx Hash: ${submitResult.destinationTxHash.slice(0, 16)}...`
      );

      // STAGE 6: On-Chain Result Confirmed
      updateStage(
        'on_chain_confirmed',
        'completed',
        `Confirmed on destination block #${submitResult.blockNumber} (Gas Used: ${Number(
          submitResult.gasUsed
        ).toLocaleString()})`
      );

      setDestinationTxHash(submitResult.destinationTxHash);
      setGasUsed(submitResult.gasUsed);
      setFinalStatus('VERIFIED');

      // Expose the completed proof for AttackLabPage
      if (onProofReady) {
        onProofReady(prepareResult.proof);
      }

      if (onVerificationCompleted) {
        onVerificationCompleted();
      }
    } catch (err: any) {
      const msg = err?.message || 'Verification pipeline encountered an error';
      setGeneralError(msg);
      setFinalStatus('REJECTED');

      // Set the active in-progress stage as failed
      setStages((prev) =>
        prev.map((s) => (s.status === 'in_progress' ? { ...s, status: 'failed', error: msg } : s))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUseSample = (hash: string) => {
    setTxHash(hash);
    setSourceChainId(31337);
    setDestinationChainId(31338);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-6 w-6 accent-text" />
          <h1 className="text-xl font-bold text-strong sm:text-2xl">
            Cross-Chain Transaction Verification
          </h1>
          <span className="tag tag-accent">
            Destination Verifier Workspace
          </span>
        </div>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-secondary">
          Submit an origin chain transaction hash. CrossProof will extract the Patricia Merkle Trie receipt proof,
          verify root convergence, check header commitments, and execute on-chain verification without trusting intermediaries.
        </p>
      </div>

      {/* Input Form Card */}
      <div className="surface-card space-y-4 p-5">
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Origin Chain */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold text-secondary">
                Origin Chain (Where message was dispatched):
              </label>
              <select
                value={sourceChainId}
                onChange={(e) => setSourceChainId(Number(e.target.value))}
                className="theme-select px-3 py-2 text-xs"
              >
                {chains
                  .filter((c) => c.isSource)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} &bull; ID: {c.id} (Local Devnet)
                    </option>
                  ))}
              </select>
            </div>

            {/* Destination Chain */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold text-secondary">
                Destination Verification Network:
              </label>
              <select
                value={destinationChainId}
                onChange={(e) => setDestinationChainId(Number(e.target.value))}
                className="theme-select px-3 py-2 text-xs"
              >
                {chains
                  .filter((c) => c.isDestination)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} &bull; ID: {c.id} (Destination Verifier)
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Tx Hash Input */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 gap-1">
              <label className="text-[11px] font-semibold text-secondary">
                Origin Transaction Hash (32-byte Keccak-256):
              </label>
              <div className="flex items-center space-x-2 text-[11px]">
                 <span className="text-muted">Quick Seed:</span>
                {SAMPLE_HASHES.map((sample, i) => (
                  <button
                    key={i}
                    type="button"
                     onClick={() => sample.hash && handleUseSample(sample.hash)}
                     disabled={!sample.hash}
                     className="accent-text flex items-center space-x-1 hover:underline"
                  >
                    <span>{sample.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x4a821e285a9bc811342657e841fa5cb2e33f381ad79383625f381b0163359d9f"
                className="theme-input technical-data w-full px-3 py-2.5 pr-28 text-xs"
              />
              <button
                type="submit"
                disabled={loading || !txHash}
                 className="button-primary absolute bottom-1.5 right-1.5 top-1.5 px-4 text-xs"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Proof</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Success Banner */}
      {finalStatus === 'VERIFIED' && (
        <div className="flex flex-col justify-between gap-3 rounded border border-[var(--success)] bg-[var(--success-soft)] p-4 sm:flex-row sm:items-center">
          <div className="flex items-center space-x-3">
             <CheckCircle2 className="h-5 w-5 shrink-0 success-text" />
            <div>
               <p className="text-sm font-semibold success-text">
                Cryptographic Verification Succeeded On-Chain!
              </p>
               <p className="mt-0.5 text-xs text-secondary">
                The DestinationVerifier contract validated the Patricia Trie proof nodes, confirmed header finality, checked replay mappings, and finalized destination state.
              </p>
            </div>
          </div>
          <StatusBadge status="VERIFIED" />
        </div>
      )}

      {/* Two Column Grid: Timeline & Proof Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Timeline Column (5 cols) */}
        <div className="lg:col-span-5">
          <Timeline
            stages={stages}
            error={generalError || undefined}
            onRetry={() => handleVerify()}
          />
        </div>

        {/* Evidence Inspector Column (7 cols) */}
        <div className="lg:col-span-7">
          <ProofInspector
            proof={proofData || undefined}
            verificationId={verificationId || undefined}
            destinationTxHash={destinationTxHash || undefined}
            gasUsed={gasUsed || undefined}
            durationMs={durationMs || undefined}
            status={finalStatus}
            messageId={verifiedMessageId || undefined}
          />
        </div>
      </div>
    </div>
  );
};
