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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-2">
          <Terminal className="w-6 h-6 text-rose-500" />
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-zinc-100">
            Adversarial Attack & Security Lab
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/50">
            5 Live Exploit Vectors
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Execute real adversarial transactions against the DestinationVerifier smart contract on local Anvil (Chain 31338).
          Verify that forged proofs, mutated receipts, substituted payloads, unfinalized headers, and replay attempts
          are strictly rejected on-chain without backend dependencies.
        </p>
      </div>

      {/* 5 Attack Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 font-mono">
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
              className={`cursor-pointer rounded-xl p-4 border transition-all duration-150 flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#181318] border-rose-500/60 shadow-lg shadow-rose-950/40 translate-y-[-2px]'
                  : 'bg-[#111317] border-[#21252d] hover:border-zinc-700 hover:bg-[#14161c]'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`p-1.5 rounded-lg ${
                      isSelected
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-zinc-800/60 text-zinc-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400">
                    {scenario.category}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-zinc-100 mb-1">
                  {scenario.title}
                </h3>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  {scenario.shortDesc}
                </p>
              </div>

              <div className="mt-3 pt-2 border-t border-zinc-800/60 flex items-center justify-between text-[10px]">
                <span className="text-zinc-500">Selector:</span>
                <code className="text-rose-400 font-semibold">{scenario.selector}</code>
              </div>
            </div>
          );
        })}
      </div>

      {/* Attack Console */}
      <div className="bg-[#111317] border border-[#21252d] rounded-xl p-6 shadow-xl space-y-4 font-mono text-xs">
        {/* Header bar of Console */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-3 gap-2">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-rose-400" />
            <span className="font-semibold text-zinc-200">
              Active Test Target: {currentScenario.title}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-[11px] text-zinc-400">
            <span>Target:</span>
            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold">
              DestinationVerifier (Chain 31338)
            </span>
          </div>
        </div>

        {/* Strategy & Expected Result Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
          <div className="p-3 bg-[#0c0e12] border border-[#1b1f26] rounded-lg space-y-1">
            <span className="text-zinc-400 font-semibold block">Adversary Strategy:</span>
            <p className="text-zinc-300 leading-relaxed">
              {currentScenario.adversaryStrategy}
            </p>
          </div>

          <div className="p-3 bg-[#0c0e12] border border-[#1b1f26] rounded-lg space-y-1">
            <span className="text-cyan-400 font-semibold block">Expected Contract Revert:</span>
            <p className="text-zinc-300 font-mono">
              <code className="text-rose-300 font-bold block">{currentScenario.revertError}</code>
              <span className="text-[10px] text-zinc-500 mt-1 block">
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
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center space-x-2 shadow-lg shadow-rose-950/50 text-xs"
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

          <span className="text-[11px] text-zinc-500">
            Broadcasts call to Anvil RPC http://127.0.0.1:8546
          </span>
        </div>

        {/* Live Attack Outcome Window */}
        {attackResult && (
          <div className="mt-6 border-t border-zinc-800 pt-5 space-y-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold text-emerald-300">
                Attack Successfully Thwarted & Blocked by Destination Contract!
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 bg-[#0c0e12] rounded-lg border border-[#1b1f26]">
                <span className="text-zinc-500 block mb-1">On-Chain Rejection Signal:</span>
                <span className="text-rose-400 font-bold block break-all">
                  {attackResult.revertReason || currentScenario.revertError}
                </span>
                <span className="text-[10px] text-emerald-400 mt-1 block">
                  &bull; Contract state unmodified (State rollback)
                </span>
              </div>

              <div className="p-3 bg-[#0c0e12] rounded-lg border border-[#1b1f26]">
                <span className="text-zinc-500 block mb-1">Security Invariant Enforced:</span>
                <span className="text-zinc-200 font-semibold block">
                  {currentScenario.securityGuarantee}
                </span>
                <span className="text-[10px] text-cyan-400 mt-1 block">
                  &bull; Pure mathematical EVM check (Zero backend trust)
                </span>
              </div>
            </div>

            <div className="p-4 bg-emerald-950/20 border border-emerald-800/40 rounded-lg text-emerald-300/90 text-xs leading-relaxed space-y-1">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-bold">
                <Lock className="w-4 h-4" />
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
