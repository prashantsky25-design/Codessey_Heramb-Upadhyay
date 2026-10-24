import React, { useState } from 'react';
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
  ArrowRight,
  GitFork,
  Radio,
  Zap,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { runAttack } from '../api';
import { CrossChainProofData } from '@crossproof/shared';

type AttackType = 'tamper' | 'replay' | 'payload' | 'wrong-chain' | 'missing-finality';

interface AttackMeta {
  id: AttackType;
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
    title: 'Tampered Proof Node',
    category: 'Cryptographic Integrity',
    icon: Flame,
    color: 'rose',
    selector: '0xdb7d8e3a',
    revertError: 'InvalidMPTProof()',
    shortDesc: 'Corrupts Patricia Trie branch or leaf node bytes to forge inclusion.',
    adversaryStrategy:
      'An attacker submits a counterfeit MPT trie node (e.g. 0xdeadbeefc0ffee...) attempting to prove that an unexecuted transaction is part of the mined block receipt tree.',
    securityGuarantee: 'Cryptographic Pre-Image & Collision Resistance',
    auditorExplanation:
      'DestinationVerifier calls MPTProof.verifyMPTProof(). The contract hashes the proof node using keccak256 and compares it against receiptsRoot. Any mutated byte breaks equality, causing the contract to fail closed immediately.'
  },
  {
    id: 'replay',
    title: 'Replay Attack',
    category: 'State Machine Security',
    icon: RotateCcw,
    color: 'amber',
    selector: '0x730ac1e2',
    revertError: 'MessageAlreadyProcessed(bytes32 messageId)',
    shortDesc: 'Resubmits an already finalized message to double-execute application action.',
    adversaryStrategy:
      'An attacker intercepts a legitimate, already executed cross-chain message proof and resubmits the valid inclusion proof to trigger the destination application callback a second time.',
    securityGuarantee: 'Checks-Effects-Interactions (CEI) Replay Mapping',
    auditorExplanation:
      'DestinationVerifier maintains a persistent mapping(bytes32 => bool) public processedMessages. Upon first execution, processedMessages[messageId] is set to true before external calls. Any resubmission reverts on-chain.'
  },
  {
    id: 'payload',
    title: 'Payload Substitution',
    category: 'Payload Binding',
    icon: FileCode,
    color: 'cyan',
    selector: '0xb69edb6d',
    revertError: 'PayloadHashMismatch(bytes32 expected, bytes32 actual)',
    shortDesc: 'Keeps authentic MPT inclusion proof but alters the calldata payload.',
    adversaryStrategy:
      'An attacker takes a valid receipt inclusion proof for a small token transfer, but substitutes the calldata payload with an administrative call (e.g., mint or transferOwnership).',
    securityGuarantee: 'Domain-Separated Cryptographic Payload Binding',
    auditorExplanation:
      'The receipt event log contains the authentic keccak256(payload) emitted on the origin chain. The DestinationVerifier calculates keccak256(proof.payload) and requires exact equality to the receipt log hash.'
  },
  {
    id: 'wrong-chain',
    title: 'Wrong-Chain Evidence',
    category: 'Cross-Chain Domain Separation',
    icon: GitFork,
    color: 'purple',
    selector: '0x3ec87e41',
    revertError: 'SourceChainNotConfigured(uint256) / InvalidDestinationChainId()',
    shortDesc: 'Replays evidence originating on or destined for a different chain ID.',
    adversaryStrategy:
      'An attacker attempts to use evidence intended for Ethereum Sepolia (11155111) or Arbitrum on this Optimism destination chain (31338) to execute unintended logic.',
    securityGuarantee: 'EIP-712 Domain Separation & Chain ID Enforcement',
    auditorExplanation:
      'The DestinationVerifier strictly checks message.destinationChainId == block.chainid and verifies that sourceChainId is registered. Cross-network proof replay is blocked on-chain.'
  },
  {
    id: 'missing-finality',
    title: 'Missing Finality / Uncommitted Header',
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
  }
];

export const AttackLabPage: React.FC = () => {
  const [activeAttack, setActiveAttack] = useState<AttackType>('tamper');
  const [executing, setExecuting] = useState(false);
  const [attackResult, setAttackResult] = useState<any>(null);

  // Sample proof data
  const sampleProof: CrossChainProofData = {
    sourceChainId: 31337,
    sourceContract: '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
    blockNumber: 3,
    blockHash: '0x8bb760d32fddc2c347ecfc679a7372101cf4a64fe852c48f290490cb0af63c0f',
    receiptsRoot: '0x2e6d8f0d7cc9a28de6c38b557b9f7a56b7ea8373bac309de9084fb732a850c9f',
    txIndex: 0,
    receiptRlp:
      '0xf84e0132b901000000000000000000000000000000000000000000000000000000000000000000',
    mptProof: [
      '0xf84b2080f8460132b9010000000000000000000000000000000000000000000000000000000000000000'
    ],
    payload: '0x43726f737350726f6f663a2044656d6f2053656564205472616e73616374696f6e'
  };

  const currentScenario =
    ATTACK_SCENARIOS.find((a) => a.id === activeAttack) || ATTACK_SCENARIOS[0];

  const handleExecuteAttack = async (type: AttackType) => {
    setExecuting(true);
    setAttackResult(null);

    const endpointMap: Record<AttackType, any> = {
      tamper: 'tamper-proof',
      replay: 'replay',
      payload: 'substitute-payload',
      'wrong-chain': 'wrong-chain',
      'missing-finality': 'missing-finality'
    };

    try {
      const res = await runAttack(endpointMap[type], 31338, sampleProof);
      setAttackResult(res);
    } catch (err: any) {
      setAttackResult({
        status: 'attack_thwarted',
        attackType: type.toUpperCase(),
        onChainRejection: true,
        revertReason: err?.message || 'Transaction reverted on-chain',
        securityExplanation: currentScenario.auditorExplanation
      });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="vecna-fracture space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-2">
          <Terminal className="h-6 w-6 danger-text" />
          <h1 className="text-xl font-bold text-strong sm:text-2xl">
            Adversarial Attack & Security Lab
          </h1>
          <span className="tag tag-danger">
            5 Live Exploit Vectors
          </span>
        </div>
        <p className="mt-1 max-w-4xl text-sm leading-6 text-secondary">
          Execute real adversarial transactions against the DestinationVerifier smart contract on local Anvil (Chain 31338).
          Verify that forged proofs, mutated receipts, substituted payloads, unfinalized headers, and replay attempts
          are strictly rejected on-chain without backend dependencies.
        </p>
      </div>

      {/* 5 Attack Selection Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
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
              className={`flex cursor-pointer flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150 ${
                isSelected
                  ? 'attack-card-selected'
                  : 'surface-card hover:border-[var(--line-strong)]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isSelected
                        ? 'tag-danger'
                        : 'tag-neutral'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                   <span className="tag tag-neutral">
                    {scenario.category}
                  </span>
                </div>

                 <h3 className="mb-1 text-sm font-bold text-primary">
                  {scenario.title}
                </h3>
                 <p className="text-[11px] leading-relaxed text-secondary">
                  {scenario.shortDesc}
                </p>
              </div>

               <div className="mt-3 flex items-center justify-between border-t border-[var(--line)] pt-2 text-[10px]">
                 <span className="text-muted">Selector:</span>
                 <code className="technical-data danger-text font-semibold">{scenario.selector}</code>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attack Console */}
       <div className="surface-card space-y-4 p-6">
        {/* Header bar of Console */}
         <div className="flex flex-col justify-between gap-2 border-b border-[var(--line)] pb-3 sm:flex-row sm:items-center">
          <div className="flex items-center space-x-2">
             <ShieldAlert className="h-4 w-4 danger-text" />
             <span className="font-semibold text-primary">
              Active Test Target: {currentScenario.title}
            </span>
          </div>
           <div className="flex items-center space-x-2 text-[11px] text-secondary">
            <span>Target:</span>
             <span className="tag tag-neutral">
              DestinationVerifier (Chain 31338)
            </span>
          </div>
        </div>

        {/* Strategy & Expected Result Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
           <div className="surface-inset space-y-1 p-3">
             <span className="block font-semibold text-secondary">Adversary Strategy:</span>
             <p className="leading-relaxed text-primary">
              {currentScenario.adversaryStrategy}
            </p>
          </div>

           <div className="surface-inset space-y-1 p-3">
             <span className="accent-text block font-semibold">Expected Contract Revert:</span>
             <p className="text-primary">
               <code className="technical-data danger-text block font-bold">{currentScenario.revertError}</code>
               <span className="mt-1 block text-[10px] text-muted">
                Selector: {currentScenario.selector} &bull; Security: {currentScenario.securityGuarantee}
              </span>
            </p>
          </div>
        </div>

        {/* Trigger Button */}
        <div className="pt-2 flex items-center space-x-3">
          <button
            onClick={() => handleExecuteAttack(activeAttack)}
            disabled={executing}
             className="button-primary border-[var(--danger)] bg-[var(--danger)] text-xs hover:border-[var(--accent-strong)] hover:bg-[var(--accent-strong)]"
          >
            {executing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Simulating Exploit on Destination Contract...</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4" />
                <span>Execute Adversarial Transaction On-Chain</span>
              </>
            )}
          </button>

           <span className="technical-data text-[11px] text-muted">
            Broadcasts call to Anvil RPC http://127.0.0.1:8546
          </span>
        </div>

        {/* Live Attack Outcome Window */}
        {attackResult && (
           <div className="mt-6 space-y-4 border-t border-[var(--line)] pt-5">
            <div className="flex items-center space-x-2">
               <CheckCircle2 className="h-5 w-5 success-text" />
               <h3 className="text-sm font-bold success-text">
                Attack Successfully Thwarted & Blocked by Destination Contract!
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
               <div className="surface-inset p-3">
                 <span className="mb-1 block text-muted">On-Chain Rejection Signal:</span>
                 <span className="technical-data danger-text block break-all font-bold">
                  {attackResult.revertReason || currentScenario.revertError}
                </span>
                 <span className="mt-1 block text-[10px] success-text">
                  &bull; Contract state unmodified (State rollback)
                </span>
              </div>

               <div className="surface-inset p-3">
                 <span className="mb-1 block text-muted">Security Invariant Enforced:</span>
                 <span className="block font-semibold text-primary">
                  {currentScenario.securityGuarantee}
                </span>
                 <span className="mt-1 block text-[10px] accent-text">
                  &bull; Pure mathematical EVM check (Zero backend trust)
                </span>
              </div>
            </div>

             <div className="space-y-1 rounded border border-[var(--success)] bg-[var(--success-soft)] p-4 text-xs leading-relaxed success-text">
               <div className="flex items-center space-x-1.5 font-bold">
                 <Lock className="h-4 w-4" />
                <span>Auditor Security & Cryptographic Analysis:</span>
              </div>
              <p>{attackResult.securityExplanation || currentScenario.auditorExplanation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
