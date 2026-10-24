import React from 'react';
import {
  GitFork,
  Layers,
  Database,
  Lock,
  CheckCircle2,
  ArrowRight,
  Cpu,
  Code2,
  FileCheck2,
  Binary
} from 'lucide-react';

export const ArchitecturePage: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-2">
          <GitFork className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-zinc-100">
            Protocol Architecture & Cryptographic Design
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
            Modular Specification
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Detailed breakdown of CrossProof's decoupled smart contract verification layers, cryptographic primitives, and execution flow.
        </p>
      </div>

      {/* End-to-End Cryptographic Execution Flow */}
      <div className="bg-[#111317] border border-[#21252d] rounded-xl p-6 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="text-sm font-semibold font-mono text-zinc-100 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>End-to-End Cryptographic Execution Flow</span>
          </h2>
          <span className="text-[10px] font-mono text-zinc-500">
            EVM Native Verification
          </span>
        </div>

        {/* 3 Main Stages */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
          {/* Step 1: Origin Chain */}
          <div className="bg-[#0e1014] border border-[#1b1f26] p-4 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold text-xs">01. ORIGIN CHAIN</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                Chain ID: 31337
              </span>
            </div>
            <p className="font-semibold text-zinc-200">SourceBridge.dispatchMessage()</p>
            <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
              <li>Increments monotonic source nonce</li>
              <li>Binds origin, destination & payload</li>
              <li>Computes domain-separated message ID</li>
              <li>Emits typed MessageDispatched event</li>
            </ul>
            <div className="p-2 bg-black/40 rounded border border-zinc-800/80 text-[10px] text-zinc-400 break-all">
              Receipt permanently anchored in mined block <code>receiptsRoot</code>
            </div>
          </div>

          {/* Step 2: Off-Chain Prover */}
          <div className="bg-[#0e1014] border border-[#1b1f26] p-4 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold text-xs">02. PROOF ENGINE</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                Untrusted Relayer
              </span>
            </div>
            <p className="font-semibold text-zinc-200">Patricia Trie Proof Builder</p>
            <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
              <li>Queries source node for block receipts</li>
              <li>Encodes canonical EIP-2718 RLP bytes</li>
              <li>Constructs Patricia Merkle Trie nodes</li>
              <li>Pre-flight verification against root</li>
            </ul>
            <div className="p-2 bg-amber-950/20 rounded border border-amber-800/40 text-[10px] text-amber-300">
              Zero trust in relayer: smart contract independently validates all proofs
            </div>
          </div>

          {/* Step 3: Destination Verifier */}
          <div className="bg-[#0e1014] border border-[#1b1f26] p-4 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold text-xs">03. DESTINATION CHAIN</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                Chain ID: 31338
              </span>
            </div>
            <p className="font-semibold text-zinc-200">DestinationVerifier.sol</p>
            <ul className="text-[11px] text-zinc-400 space-y-1 list-disc list-inside">
              <li>Checks header validity in IHeaderVerifier</li>
              <li>Validates MPT inclusion in ReceiptVerifier</li>
              <li>Enforces on-chain replay mapping</li>
              <li>Dispatches payload to IDestinationReceiver</li>
            </ul>
            <div className="p-2 bg-emerald-950/30 rounded border border-emerald-800/40 text-[10px] text-emerald-300">
              Verified & executed on-chain with full state rollback on failure
            </div>
          </div>
        </div>
      </div>

      {/* Modular Smart Contract Interface Hierarchy */}
      <div className="bg-[#111317] border border-[#21252d] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="text-sm font-semibold font-mono text-zinc-100 flex items-center space-x-2">
            <Code2 className="w-4 h-4 text-cyan-400" />
            <span>Modular Interface Architecture</span>
          </h2>
          <span className="text-[10px] font-mono text-zinc-500">
            Decoupled Verification Layers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
          {/* Interface 1: IHeaderVerifier */}
          <div className="p-4 bg-[#0e1014] rounded-lg border border-[#1b1f26] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold">IHeaderVerifier</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Consensus Layer
              </span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Verifies source block authenticity and finality. Decoupled from receipt verification so
              production light-clients or ZK-consensus proofs can be swapped seamlessly without modifying application verifiers.
            </p>
            <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60">
              Active: <code>DevHeaderOracle.sol</code> &bull; Upgrade: <code>LightClientHeaderVerifier.sol</code>
            </div>
          </div>

          {/* Interface 2: IReceiptVerifier */}
          <div className="p-4 bg-[#0e1014] rounded-lg border border-[#1b1f26] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold">IReceiptVerifier</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Trie & Parser Layer
              </span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Implements EVM Patricia Merkle Trie verification and RLP parsing. Confirms that key <code>txIndex</code> resolves to <code>receiptRlp</code> under <code>receiptsRoot</code>, ensuring authentic event parameters.
            </p>
            <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60">
              Implementation: <code>ReceiptVerifier.sol</code> with <code>MPTProof.sol</code> and <code>RLPReader.sol</code>
            </div>
          </div>

          {/* Interface 3: IDestinationVerifier */}
          <div className="p-4 bg-[#0e1014] rounded-lg border border-[#1b1f26] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold">IDestinationVerifier</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Protocol Coordinator
              </span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Core coordinator enforcing domain separation, origin configuration, replay protection, and caller authorization before executing destination application callbacks.
            </p>
            <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60">
              Implementation: <code>DestinationVerifier.sol</code>
            </div>
          </div>

          {/* Interface 4: IDestinationReceiver */}
          <div className="p-4 bg-[#0e1014] rounded-lg border border-[#1b1f26] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-cyan-400 font-bold">IDestinationReceiver</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                Application Consumer
              </span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Application-layer consumer interface implemented by destination dapps to receive verified cross-chain actions with authenticated origin contract addresses and payloads.
            </p>
            <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60">
              Example Receiver: <code>CrossProofReceiver.sol</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
