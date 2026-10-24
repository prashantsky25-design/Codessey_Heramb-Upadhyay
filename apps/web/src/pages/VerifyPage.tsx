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
  normalizeTransactionHash,
  TransactionHashSchema
} from '@crossproof/shared';
import {
  prepareVerification,
  submitVerification,
  verifyProofLocally,
  generateTestTransaction
} from '../api';
import { Timeline } from '../components/Timeline';
import { ProofInspector } from '../components/ProofInspector';
import { StatusBadge } from '../components/StatusBadge';
import { ActiveVerification } from '../types';

interface VerifyPageProps {
  chains: ChainConfig[];
  initialTxHash?: string;
  initialChainId?: number;
  onVerificationCompleted?: (verification: ActiveVerification) => void;
}

const DEFAULT_STAGES: TimelineStage[] = [
  { id: 'tx_found', label: '1. Source Transaction Found', status: 'pending' },
  { id: 'receipt_proof_retrieved', label: '2. Receipt & Trie Proof Retrieved', status: 'pending' },
  { id: 'inclusion_validated', label: '3. Inclusion Proof Validated', status: 'pending' },
  { id: 'header_finality_validated', label: '4. Source Header / Finality Validated', status: 'pending' },
  { id: 'destination_verifier_called', label: '5. Destination Verifier Invoked', status: 'pending' },
  { id: 'on_chain_confirmed', label: '6. On-Chain Result Confirmed', status: 'pending' }
];

export const VerifyPage: React.FC<VerifyPageProps> = ({
  chains,
  initialTxHash = '',
  initialChainId = 31337,
  onVerificationCompleted
}) => {
  const [sourceChainId, setSourceChainId] = useState<number>(initialChainId);
  const [destinationChainId, setDestinationChainId] = useState<number>(31338);
  const [txHash, setTxHash] = useState<string>(initialTxHash);

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [stages, setStages] = useState<TimelineStage[]>(DEFAULT_STAGES);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const [proofData, setProofData] = useState<CrossChainProofData | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [destinationTxHash, setDestinationTxHash] = useState<string | null>(null);
  const [gasUsed, setGasUsed] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState<number | null>(null);
  const [verifiedMessageId, setVerifiedMessageId] = useState<string | null>(null);
  const [inclusionVerified, setInclusionVerified] = useState(false);
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

  const handleGenerateTransaction = async () => {
    setGenerating(true);
    setGeneralError(null);
    setSuccessNotice(null);

    try {
      const result = await generateTestTransaction(sourceChainId, destinationChainId);

      if (result.status === 'success' && result.transaction.hash) {
        setTxHash(result.transaction.hash);
        setGeneralError(null);

        // Show success message briefly
        const successMsg = `✅ Test transaction generated! Hash: ${result.transaction.hash.slice(0, 16)}...`;
        setSuccessNotice(successMsg);
        setTimeout(() => setSuccessNotice(null), 3000);
      }
    } catch (err: any) {
      setGeneralError(err?.message || 'Failed to generate test transaction');
    } finally {
      setGenerating(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanHash = normalizeTransactionHash(txHash);
    const hashResult = TransactionHashSchema.safeParse(cleanHash);
    if (!hashResult.success) {
      setGeneralError(hashResult.error.issues[0]?.message || INVALID_TRANSACTION_HASH_MESSAGE);
      return;
    }

    // Keep the controlled input and every retry on the same canonical value.
    setTxHash(hashResult.data);

    setLoading(true);
    setGeneralError(null);
    setSuccessNotice(null);
    setProofData(null);
    setDestinationTxHash(null);
    setGasUsed(null);
    setInclusionVerified(false);
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
      setInclusionVerified(true);

      // STAGE 4: Source Header / Finality
      updateStage('header_finality_validated', 'in_progress', 'Validating source header in IHeaderVerifier...');

      if (!verifyCheck.checks?.headerAuthenticityValid) {
        updateStage(
          'header_finality_validated',
          'failed',
          undefined,
          'The source header was not authenticated by the configured verifier. The local demo uses an authorized Mode A header oracle, not consensus finality.'
        );
        throw new Error('Source header commitment could not be verified');
      }

      updateStage('header_finality_validated', 'completed', 'Source header commitment checked in Mode A DevHeaderOracle');

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

      if (onVerificationCompleted) {
        onVerificationCompleted({
          proof: prepareResult.proof,
          sourceChainId,
          destinationChainId,
          verificationId: prepareResult.verificationId,
          messageId: prepareResult.extractedEvent.messageId,
          destinationTxHash: submitResult.destinationTxHash
        });
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-zinc-100">
            Cross-Chain Transaction Verification
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
            Destination Verifier Workspace
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Submit an origin chain transaction hash. CrossProof will extract the Patricia Merkle Trie receipt proof,
          verify root convergence, check the configured source-header commitment, and execute on-chain verification with the active trust model disclosed.
        </p>
      </div>

      {/* Input Form Card */}
      <div className="bg-[#111317] border border-[#21252d] rounded-xl p-5 shadow-sm space-y-4 text-xs">
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Origin Chain */}
            <div>
              <label className="block text-zinc-400 mb-1.5 font-semibold text-[11px]">
                Origin Chain (Where message was dispatched):
              </label>
              <select
                value={sourceChainId}
                onChange={(e) => setSourceChainId(Number(e.target.value))}
                className="w-full bg-[#0c0e12] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
              >
                {chains
                  .filter((c) => c.isSource && c.sourceBridgeAddress)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} &bull; ID: {c.id} ({c.id === 31337 || c.id === 31338 ? 'Local Devnet' : 'Configured network'})
                    </option>
                  ))}
              </select>
            </div>

            {/* Destination Chain */}
            <div>
              <label className="block text-zinc-400 mb-1.5 font-semibold text-[11px]">
                Destination Verification Network:
              </label>
              <select
                value={destinationChainId}
                onChange={(e) => setDestinationChainId(Number(e.target.value))}
                className="w-full bg-[#0c0e12] border border-zinc-700/80 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-cyan-500"
              >
                {chains
                  .filter((c) => c.isDestination && c.destinationVerifierAddress)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} &bull; ID: {c.id} ({c.destinationVerifierAddress ? 'Destination Verifier' : 'Not configured'})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Tx Hash Input */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-1.5 gap-1">
              <label className="text-zinc-400 font-semibold text-[11px]">
                Origin Transaction Hash (32-byte Keccak-256):
              </label>
              <div className="flex items-center space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={handleGenerateTransaction}
                  disabled={generating}
              className="vecna-button-secondary px-3 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition flex items-center space-x-1.5"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Test TX</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="0x... paste a mined SourceBridge transaction hash"
                className="w-full bg-[#0c0e12] border border-zinc-700/80 rounded-lg pl-3 pr-28 py-2.5 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                type="submit"
                disabled={loading || !txHash}
                className="vecna-button-primary absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:hover:bg-cyan-500 text-zinc-950 font-bold text-xs rounded-md transition flex items-center space-x-1.5 shadow-sm"
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

      {successNotice && (
        <div className="vecna-status-success rounded-lg border px-4 py-3 text-sm" role="status">
          {successNotice}
        </div>
      )}

      {/* Success Banner */}
      {finalStatus === 'VERIFIED' && (
        <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold font-mono text-emerald-300">
                Cryptographic Verification Succeeded On-Chain!
              </p>
              <p className="text-xs text-emerald-400/80 font-mono mt-0.5">
                The DestinationVerifier contract validated the Patricia Trie proof, checked the configured Mode A header commitment, enforced replay protection, and finalized destination state.
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
            inclusionVerified={inclusionVerified}
            trustMode="MODE_A_LOCAL_ORACLE"
          />
        </div>
      </div>
    </div>
  );
};
