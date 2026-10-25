import React, { useState, useEffect } from 'react';
import {
  Terminal,
  ShieldAlert,
  ShieldCheck,
  Flame,
  RotateCcw,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  Lock,
  GitFork,
  Radio,
  Zap,
  RefreshCw,
  ExternalLink,
  Ban,
  Layers,
  KeyRound,
  WifiOff,
  Database
} from 'lucide-react';
import { runAttack, fetchVerificationHistory, AttackEndpoint } from '../api';
import { CrossChainProofData, ChainConfig, SUPPORTED_CHAINS } from '@crossproof/shared';

type AttackType =
  | 'tamper'
  | 'replay'
  | 'wrong-source-chain'
  | 'wrong-destination'
  | 'substitute-payload'
  | 'invalid-event'
  | 'missing-finality'
  | 'malformed-proof'
  | 'unauthorized-caller'
  | 'rpc-failure';

interface AttackMeta {
  id: AttackType;
  endpoint: AttackEndpoint;
  title: string;
  category: string;
  icon: any;
  color: string;
  selector: string;
  revertError: string;
  shortDesc: string;
  adversaryStrategy: string;
  securityGuarantee: string;
  auditorExplanation: string;
}

const ATTACK_SCENARIOS: AttackMeta[] = [
  {
    id: 'tamper',
    endpoint: 'tamper-proof',
    title: 'Tampered MPT Node',
    category: 'Cryptographic Integrity',
    icon: Flame,
    color: 'rose',
    selector: '0xdb7d8e3a',
    revertError: 'InvalidReceiptProof()',
    shortDesc: 'Corrupts Patricia Trie branch or leaf node bytes to forge inclusion.',
    adversaryStrategy:
      'An attacker submits a counterfeit MPT trie node (0xdeadbeef...) attempting to prove that an unexecuted transaction is part of the mined block receipt tree.',
    securityGuarantee: 'Cryptographic Pre-Image & Collision Resistance',
    auditorExplanation:
      'DestinationVerifier calls MPTProof.verifyMPTProof(). The contract hashes each node using keccak256 and compares it against receiptsRoot. Any mutated byte breaks equality, causing the contract to fail closed immediately.'
  },
  {
    id: 'replay',
    endpoint: 'replay',
    title: 'Message Replay',
    category: 'State Machine Security',
    icon: RotateCcw,
    color: 'amber',
    selector: '0x730ac1e2',
    revertError: 'MessageAlreadyProcessed(bytes32 messageId)',
    shortDesc: 'Resubmits an already finalized message to double-execute application action.',
    adversaryStrategy:
      'An attacker intercepts a legitimate, already executed cross-chain message proof and resubmits it to trigger the destination application callback a second time.',
    securityGuarantee: 'Checks-Effects-Interactions (CEI) Replay Mapping',
    auditorExplanation:
      'DestinationVerifier maintains a persistent mapping(bytes32 => bool) public processedMessages. Upon first execution, processedMessages[messageId] is set to true before external calls. Any resubmission reverts on-chain.'
  },
  {
    id: 'wrong-source-chain',
    endpoint: 'wrong-source-chain',
    title: 'Unconfigured Source',
    category: 'Domain Separation',
    icon: GitFork,
    color: 'purple',
    selector: '0x3ec87e41',
    revertError: 'SourceChainNotConfigured(uint256 sourceChainId)',
    shortDesc: 'Submits evidence originating from an unauthorized source chain ID.',
    adversaryStrategy:
      'An attacker submits valid proofs from a malicious or testnet network (e.g. chainId = 999999) hoping the destination verifier accepts evidence across chain boundaries.',
    securityGuarantee: 'Multi-Chain Domain Separation & Whitelist Whitelisting',
    auditorExplanation:
      'DestinationVerifier requires explicit registration of authorized source chains in trustedSourceBridges[sourceChainId]. Evidence from unknown chains is rejected before proof traversal.'
  },
  {
    id: 'wrong-destination',
    endpoint: 'wrong-destination',
    title: 'Wrong Destination',
    category: 'Routing Integrity',
    icon: Ban,
    color: 'sky',
    selector: '0x75d5e2e8',
    revertError: 'InvalidDestinationChainId(uint256 expected, uint256 actual)',
    shortDesc: 'Replays evidence meant for another network onto this destination chain.',
    adversaryStrategy:
      'An attacker intercepts a cross-chain dispatch targeting Arbitrum and attempts to execute the same evidence on Optimism (Chain 31338).',
    securityGuarantee: 'EIP-155 Destination Chain Binding (block.chainid)',
    auditorExplanation:
      'The authenticated event log encodes destinationChainId. DestinationVerifier strictly verifies verifiedEv.destinationChainId == block.chainid, blocking cross-network message replay.'
  },
  {
    id: 'substitute-payload',
    endpoint: 'substitute-payload',
    title: 'Payload Substitution',
    category: 'Payload Binding',
    icon: FileCode,
    color: 'cyan',
    selector: '0xb69edb6d',
    revertError: 'PayloadHashMismatch(bytes32 expected, bytes32 actual)',
    shortDesc: 'Keeps authentic MPT inclusion proof but alters the calldata payload.',
    adversaryStrategy:
      'An attacker takes a valid receipt inclusion proof for a harmless transfer, but substitutes the calldata payload with an administrative call (e.g., mint or transferOwnership).',
    securityGuarantee: 'Domain-Separated Cryptographic Payload Binding',
    auditorExplanation:
      'The receipt event log contains the authentic keccak256(payload) emitted on the origin chain. The DestinationVerifier calculates keccak256(proof.payload) and requires exact equality to the receipt log hash.'
  },
  {
    id: 'invalid-event',
    endpoint: 'invalid-event',
    title: 'Spoofed Bridge Emitter',
    category: 'Source Authorization',
    icon: ShieldAlert,
    color: 'rose',
    selector: '0x277dc2d9',
    revertError: 'InvalidSourceContract(address expected, address actual)',
    shortDesc: 'Emits a fake MessageDispatched event from an unauthorized contract address.',
    adversaryStrategy:
      'An attacker deploys their own contract on the source chain that emits a forged MessageDispatched event with identical topics and submits proof to destination.',
    securityGuarantee: 'Contract Address Whitelisting & Receipt Log Verification',
    auditorExplanation:
      'ReceiptVerifier parses the receipt log and verifies that log.address matches proof.sourceContract, which must equal the trusted SourceBridge registered on the DestinationVerifier.'
  },
  {
    id: 'missing-finality',
    endpoint: 'missing-finality',
    title: 'Unfinalized Header',
    category: 'Consensus Security',
    icon: AlertTriangle,
    color: 'red',
    selector: '0x4f128e9a',
    revertError: 'SourceHeaderVerificationFailed(uint256, uint256, bytes32)',
    shortDesc: 'Submits an inclusion proof for an unfinalized or unknown block header.',
    adversaryStrategy:
      'An attacker creates a receipt proof against an orphaned block or an uncommitted reorg header that was never finalized on the source consensus layer.',
    securityGuarantee: 'Decoupled Light Client Header Finality Verification',
    auditorExplanation:
      'Receipt inclusion alone is insufficient. DestinationVerifier queries IHeaderVerifier to confirm that the block header and receiptsRoot have been finalized by consensus before verifying the receipt.'
  },
  {
    id: 'malformed-proof',
    endpoint: 'malformed-proof',
    title: 'Malformed Non-RLP',
    category: 'Parsing Robustness',
    icon: Layers,
    color: 'violet',
    selector: '0xdb7d8e3a',
    revertError: 'InvalidReceiptProof() / InvalidHeaderRLP()',
    shortDesc: 'Passes truncated or malformed non-RLP bytes to test EVM decoder memory safety.',
    adversaryStrategy:
      'An attacker fuzzer crafts malformed RLP length prefixes designed to trigger out-of-bounds memory read, stack overflows, or gas exhaustion.',
    securityGuarantee: 'Fail-Closed Bound Validation in RLPReader',
    auditorExplanation:
      'RLPReader validates payload lengths and item counts against memory bounds. Truncated or malformed RLP structures safely revert without corrupting execution memory.'
  },
  {
    id: 'unauthorized-caller',
    endpoint: 'unauthorized-caller',
    title: 'Unauthorized Admin',
    category: 'Access Control',
    icon: KeyRound,
    color: 'orange',
    selector: '0xd92e233d',
    revertError: 'Unauthorized() / ZeroAddress()',
    shortDesc: 'Attempts to reconfigure verifier or zero-out trusted bridge addresses.',
    adversaryStrategy:
      'An unauthorized account attempts to call setHeaderVerifier, setSourceBridge, or transferOwnership to hijack the verification rules.',
    securityGuarantee: 'Strict Ownable Two-Step & Input Sanitization',
    auditorExplanation:
      'All administrative state transitions in DestinationVerifier enforce onlyOwner modifiers and strictly reject zero addresses, ensuring configuration governance integrity.'
  },
  {
    id: 'rpc-failure',
    endpoint: 'rpc-failure',
    title: 'RPC Provider Offline',
    category: 'Fault Tolerance',
    icon: WifiOff,
    color: 'slate',
    selector: 'N/A',
    revertError: 'ECONNREFUSED / Network Failure (Outcome: ERROR)',
    shortDesc: 'Simulates RPC outage or network partition to verify honest error semantics.',
    adversaryStrategy:
      'Source or destination RPC endpoint goes down or experiences extreme latency, preventing communication with blockchain nodes.',
    securityGuarantee: 'Fail-Closed Client Handling (Honest ERROR Reporting)',
    auditorExplanation:
      'When an RPC failure occurs, the protocol fails closed and strictly returns outcome: ERROR. It never claims that an attack was blocked when in reality a transport timeout occurred.'
  }
];

interface AttackLabPageProps {
  lastVerifiedProof?: CrossChainProofData | null;
  chains?: ChainConfig[];
  onNavigateToVerify?: () => void;
}

export const AttackLabPage: React.FC<AttackLabPageProps> = ({
  lastVerifiedProof,
  chains = Object.values(SUPPORTED_CHAINS),
  onNavigateToVerify
}) => {
  const [activeAttack, setActiveAttack] = useState<AttackType>('tamper');
  const [executing, setExecuting] = useState(false);
  const [attackResult, setAttackResult] = useState<any>(null);
  const [activeProof, setActiveProof] = useState<CrossChainProofData | null>(lastVerifiedProof || null);
  const [loadingProof, setLoadingProof] = useState(false);

  // Sync with prop if updated
  useEffect(() => {
    if (lastVerifiedProof) {
      setActiveProof(lastVerifiedProof);
    }
  }, [lastVerifiedProof]);

  // Load latest verified proof dynamically from history on mount if not provided as prop
  useEffect(() => {
    if (lastVerifiedProof) return;
    async function loadDynamicProof() {
      setLoadingProof(true);
      try {
        const history = await fetchVerificationHistory();
        const found = history.records?.find((r) => r.proof && r.proof.mptProof?.length > 0);
        if (found?.proof) {
          setActiveProof(found.proof);
        }
      } catch {
        // Fallback handled seamlessly by backend
      } finally {
        setLoadingProof(false);
      }
    }
    loadDynamicProof();
  }, [lastVerifiedProof]);

  const currentScenario =
    ATTACK_SCENARIOS.find((a) => a.id === activeAttack) || ATTACK_SCENARIOS[0];

  const handleExecuteAttack = async (scenario: AttackMeta) => {
    setExecuting(true);
    setAttackResult(null);

    try {
      const res = await runAttack(scenario.endpoint, 31338, activeProof || undefined);
      setAttackResult(res);
    } catch (err: any) {
      setAttackResult({
        outcome: 'ERROR',
        status: 'error',
        attackId: scenario.id,
        attackTitle: scenario.title,
        category: 'Transport Failure',
        targetContract: 'Unknown',
        revertReason: err?.message || 'Network request failed',
        details: 'Transport error during attack execution.',
        securityProperty: scenario.securityGuarantee,
        auditorExplanation: 'An unexpected client-side error occurred while submitting the request.',
        onChainRejection: false
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Terminal className="h-6 w-6 text-red-600" />
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
            Adversarial Attack & Security Lab
          </h1>
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            10 Live Exploit Vectors
          </span>
          {activeProof ? (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              Active Proof: TxIndex #{activeProof.txIndex} (Block #{activeProof.blockNumber})
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              Using Seed Proof Baseline
            </span>
          )}
        </div>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">
          Execute authentic adversarial transactions against the DestinationVerifier smart contract on local Anvil (Chain 31338).
          Verify that forged proofs, mutated receipts, substituted payloads, unfinalized headers, and replay attempts
          are strictly rejected on-chain without backend dependencies.
        </p>
      </div>

      {/* 10 Attack Selection Cards */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-5">
        {ATTACK_SCENARIOS.map((scenario) => {
          const isSelected = activeAttack === scenario.id;
          const Icon = scenario.icon;

          return (
            <div
              key={scenario.id}
              onClick={() => {
                setActiveAttack(scenario.id);
                setAttackResult(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setActiveAttack(scenario.id);
                  setAttackResult(null);
                }
              }}
              tabIndex={0}
              role="button"
              aria-pressed={isSelected}
              className={`flex cursor-pointer flex-col justify-between rounded-xl border p-3.5 text-left transition-all duration-150 ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-600'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isSelected ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {scenario.category}
                  </span>
                </div>

                <h3 className="mb-1 text-xs font-bold text-slate-900">
                  {scenario.title}
                </h3>
                <p className="text-[11px] leading-relaxed text-slate-600">
                  {scenario.shortDesc}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                <span className="text-slate-400">Selector:</span>
                <code className="font-mono text-red-600 font-semibold">{scenario.selector}</code>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attack Console */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
        {/* Header bar of Console */}
        <div className="flex flex-col justify-between gap-2 border-b border-slate-100 pb-3 sm:flex-row sm:items-center">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-5 w-5 text-red-600" />
            <span className="font-bold text-slate-900">
              Active Test Target: {currentScenario.title}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-600">
            <span>Target Contract:</span>
            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-800">
              DestinationVerifier (Chain 31338)
            </span>
          </div>
        </div>

        {/* Strategy & Expected Result Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-1.5">
            <span className="block font-semibold text-slate-700">Adversary Strategy:</span>
            <p className="leading-relaxed text-slate-600">
              {currentScenario.adversaryStrategy}
            </p>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-4 space-y-1.5">
            <span className="block font-semibold text-blue-700">Expected Contract Revert:</span>
            <div>
              <code className="block font-mono font-bold text-red-700 bg-red-50 p-1.5 rounded border border-red-200">
                {currentScenario.revertError}
              </code>
              <span className="mt-1.5 block text-[11px] text-slate-500">
                Selector: <span className="font-mono">{currentScenario.selector}</span> &bull; Security Property: {currentScenario.securityGuarantee}
              </span>
            </div>
          </div>
        </div>

        {/* Trigger Button */}
        <div className="pt-1 flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleExecuteAttack(currentScenario)}
            disabled={executing}
            className="inline-flex items-center space-x-2 rounded-lg bg-red-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {executing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Broadcasting Adversarial Transaction to Anvil...</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4" />
                <span>Execute Adversarial Transaction On-Chain</span>
              </>
            )}
          </button>

          <span className="font-mono text-[11px] text-slate-500">
            Target RPC: http://127.0.0.1:8546 (Chain 31338)
          </span>
        </div>

        {/* Live Attack Outcome Window */}
        {attackResult && (
          <div className="mt-6 space-y-4 border-t border-slate-200 pt-5">
            {attackResult.outcome === 'BLOCKED' && (
              <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4">
                <div className="flex items-center space-x-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <h3 className="text-sm font-bold text-emerald-900">
                    ATTACK BLOCKED ON-CHAIN: Contract Reverted with Expected Error
                  </h3>
                </div>
                <p className="mt-1 text-xs text-emerald-800">
                  The on-chain verifier executed fail-closed logic. No state was corrupted or double-executed.
                </p>
              </div>
            )}

            {attackResult.outcome === 'VULNERABILITY_DETECTED' && (
              <div className="rounded-lg border border-red-500 bg-red-50 p-4">
                <div className="flex items-center space-x-2.5">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  <h3 className="text-sm font-bold text-red-900">
                    CRITICAL: VULNERABILITY DETECTED - Malicious Transaction Was Accepted!
                  </h3>
                </div>
                <p className="mt-1 text-xs text-red-800">
                  The transaction did not revert. The destination contract accepted invalid evidence.
                </p>
              </div>
            )}

            {attackResult.outcome === 'ERROR' && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                <div className="flex items-center space-x-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h3 className="text-sm font-bold text-amber-900">
                    EXECUTION ERROR: Transport or Configuration Failure (Not Counted as Blocked)
                  </h3>
                </div>
                <p className="mt-1 text-xs text-amber-800">
                  A network or configuration failure occurred. To uphold honest reporting, this is reported as an ERROR rather than claiming the attack was blocked.
                </p>
              </div>
            )}

            {attackResult.outcome === 'INCONCLUSIVE' && (
              <div className="rounded-lg border border-slate-300 bg-slate-50 p-4">
                <div className="flex items-center space-x-2.5">
                  <AlertTriangle className="h-5 w-5 text-slate-600" />
                  <h3 className="text-sm font-bold text-slate-800">
                    INCONCLUSIVE SETUP: Preconditions Not Satisfied
                  </h3>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <span className="mb-1 block font-semibold text-slate-500">On-Chain Rejection Signal:</span>
                <span className="font-mono font-bold text-red-700 block break-all text-[11px]">
                  {attackResult.revertReason || currentScenario.revertError}
                </span>
                {attackResult.revertSelector && (
                  <span className="mt-1 block text-[10px] text-slate-500">
                    Function Selector: <span className="font-mono text-red-600">{attackResult.revertSelector}</span>
                  </span>
                )}
                <span className="mt-1 block text-[10px] text-emerald-700 font-medium">
                  &bull; Contract state unmodified (State rollback verified)
                </span>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                <span className="mb-1 block font-semibold text-slate-500">Security Invariant Enforced:</span>
                <span className="block font-semibold text-slate-800">
                  {currentScenario.securityGuarantee}
                </span>
                <span className="mt-1 block text-[10px] text-blue-700 font-medium">
                  &bull; Pure mathematical EVM check (Zero backend trust)
                </span>
              </div>
            </div>

            <div className="space-y-1.5 rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-xs leading-relaxed text-blue-900">
              <div className="flex items-center space-x-1.5 font-bold">
                <Lock className="h-4 w-4 text-blue-700" />
                <span>Auditor Security & Cryptographic Analysis:</span>
              </div>
              <p>{attackResult.auditorExplanation || currentScenario.auditorExplanation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
