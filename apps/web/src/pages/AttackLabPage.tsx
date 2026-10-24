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
import { ActiveVerification } from '../types';

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
    securityGuarantee: 'Source-chain configuration & destination chain ID enforcement',
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
    securityGuarantee: 'Mode A header commitment presence check',
    auditorExplanation:
      'Receipt inclusion alone is insufficient. In the active Mode A demo, DestinationVerifier checks that the source block header and receiptsRoot were committed by the configured development oracle. This is not consensus finality.'
  }
];

interface AttackLabPageProps {
  activeVerification: ActiveVerification | null;
}

export const AttackLabPage: React.FC<AttackLabPageProps> = ({ activeVerification }) => {
  const [activeAttack, setActiveAttack] = useState<AttackType>('tamper');
  const [executing, setExecuting] = useState(false);
  const [attackResult, setAttackResult] = useState<any>(null);

  const currentScenario =
    ATTACK_SCENARIOS.find((a) => a.id === activeAttack) || ATTACK_SCENARIOS[0];

  const handleExecuteAttack = async (type: AttackType) => {
    if (!activeVerification) {
      setAttackResult({
        status: 'attack_unavailable',
        message: 'Run and complete a real verification first. Attack Lab does not use synthetic proof fixtures.'
      });
      return;
    }

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
      const res = await runAttack(
        endpointMap[type],
        activeVerification.destinationChainId,
        activeVerification.proof
      );
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
    <div className="space-y-6 vecna-lab-page">
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-2">
          <Terminal className="w-6 h-6 text-rose-500" />
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-zinc-100">
            Adversarial Attack & Security Lab
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800/50">
            5 Attack Scenarios
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Submit controlled mutations of the latest successfully verified proof through the configured Attack Lab API.
          Results are shown as contract-backed only when the backend reports an actual verifier rejection.
        </p>
      </div>

      {!activeVerification && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-4 text-xs text-amber-200 font-mono">
          <p className="font-semibold text-amber-300">A real proof is required before running attacks.</p>
          <p className="mt-1 text-amber-200/80">
            Open Verify Transaction, complete a successful verification, then return here. Synthetic proof fixtures are intentionally disabled.
          </p>
        </div>
      )}

      {activeVerification && (
        <div className="rounded-xl border border-cyan-800/50 bg-cyan-950/20 p-4 text-xs text-cyan-100 font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-cyan-300">Active proof loaded from the latest verification</span>
            <span className="text-cyan-200/80">
              Chain {activeVerification.sourceChainId} → {activeVerification.destinationChainId} · block #{activeVerification.proof.blockNumber}
            </span>
          </div>
          <p className="mt-1 text-cyan-200/70 break-all">
            Message: {activeVerification.messageId || 'message ID unavailable'}
          </p>
        </div>
      )}

      {/* 5 Attack Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {ATTACK_SCENARIOS.map((scenario) => {
          const isSelected = activeAttack === scenario.id;
          const Icon = scenario.icon;

          return (
            <button
              type="button"
              key={scenario.id}
              onClick={() => {
                setActiveAttack(scenario.id);
                setAttackResult(null);
              }}
              className={`vecna-attack-card text-left cursor-pointer rounded-xl p-4 border transition-all duration-150 flex flex-col justify-between ${
                isSelected
                  ? 'is-selected bg-[#181318] border-rose-500/60 shadow-lg shadow-rose-950/40 translate-y-[-2px]'
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
            </button>
          );
        })}
      </div>

      {/* Attack Console */}
      <div className="vecna-console bg-[#111317] border border-[#21252d] rounded-xl p-6 shadow-xl space-y-4 text-xs">
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
              DestinationVerifier (Chain {activeVerification?.destinationChainId ?? '—'})
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
            className="vecna-button-danger px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold rounded-lg transition-all flex items-center space-x-2 shadow-lg shadow-rose-950/50 text-xs"
          >
            {executing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Simulating Exploit on Destination Contract...</span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4" />
                <span>{activeVerification ? 'Run Attack Against Current Proof' : 'Verification Required'}</span>
              </>
            )}
          </button>

          <span className="text-[11px] text-zinc-500">
            Uses the destination verifier configured by the API
          </span>
        </div>

        {/* Live Attack Outcome Window */}
        {attackResult && (
          <div className="mt-6 border-t border-zinc-800 pt-5 space-y-4">
            {attackResult.status === 'attack_unavailable' ? (
              <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 p-4 text-amber-200">
                {attackResult.message}
              </div>
            ) : (
              <>
            <div className="flex items-center space-x-2">
              {attackResult.status === 'attack_thwarted' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              ) : (
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              )}
              <h3 className={`text-sm font-bold ${attackResult.status === 'attack_thwarted' ? 'text-emerald-300' : 'text-rose-300'}`}>
                {attackResult.status === 'attack_thwarted'
                  ? 'Attack Rejected by Destination Verifier'
                  : 'Attack Result Requires Investigation'}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
              <div className="p-3 bg-[#0c0e12] rounded-lg border border-[#1b1f26]">
                <span className="text-zinc-500 block mb-1">On-Chain Rejection Signal:</span>
                <span className="text-rose-400 font-bold block break-all">
                  {attackResult.revertReason || currentScenario.revertError}
                </span>
                <span className="text-[10px] text-emerald-400 mt-1 block">
                   &bull; {attackResult.onChainRejection ? 'Verifier rejection reported' : 'No contract-backed rejection reported'}
                </span>
              </div>

              <div className="p-3 bg-[#0c0e12] rounded-lg border border-[#1b1f26]">
                <span className="text-zinc-500 block mb-1">Security Invariant Enforced:</span>
                <span className="text-zinc-200 font-semibold block">
                  {currentScenario.securityGuarantee}
                </span>
                <span className="text-[10px] text-cyan-400 mt-1 block">
                   &bull; Result source: {attackResult.onChainRejection ? 'destination verifier response' : 'backend/API response'}
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
