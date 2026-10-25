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
          <GitFork className="h-6 w-6 accent-text" />
          <h1 className="text-xl font-bold text-strong sm:text-2xl">
            Protocol Architecture & Cryptographic Design
          </h1>
          <span className="tag tag-accent">
            Modular Specification
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-secondary">
          Detailed breakdown of CrossProof's decoupled smart contract verification layers, cryptographic primitives, and execution flow.
        </p>
      </div>

      {/* End-to-End Cryptographic Execution Flow */}
      <div className="surface-card space-y-6 p-6">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <h2 className="flex items-center space-x-2 text-sm font-semibold text-primary">
            <Layers className="h-4 w-4 accent-text" />
            <span>End-to-End Cryptographic Execution Flow</span>
          </h2>
          <span className="technical-data text-[10px] text-muted">
            EVM Native Verification
          </span>
        </div>

        {/* 3 Main Stages */}
        <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
          {/* Step 1: Origin Chain */}
          <div className="surface-inset space-y-2.5 p-4">
            <div className="flex items-center justify-between">
              <span className="accent-text text-xs font-bold">01. ORIGIN CHAIN</span>
              <span className="tag tag-neutral">
                Chain ID: 31337
              </span>
            </div>
            <p className="technical-data font-semibold text-primary">SourceBridge.dispatchMessage()</p>
            <ul className="space-y-1 text-[11px] text-secondary list-inside list-disc">
              <li>Increments monotonic source nonce</li>
              <li>Binds origin, destination & payload</li>
              <li>Computes domain-separated message ID</li>
              <li>Emits typed MessageDispatched event</li>
            </ul>
            <div className="technical-data break-all rounded border border-[var(--line)] bg-[var(--surface)] p-2 text-[10px] text-muted">
              Receipt permanently anchored in mined block <code>receiptsRoot</code>
            </div>
          </div>

          {/* Step 2: Off-Chain Prover */}
          <div className="surface-inset space-y-2.5 p-4">
            <div className="flex items-center justify-between">
              <span className="accent-text text-xs font-bold">02. PROOF ENGINE</span>
              <span className="tag tag-neutral">
                Untrusted Relayer
              </span>
            </div>
            <p className="font-semibold text-primary">Patricia Trie Proof Builder</p>
            <ul className="space-y-1 text-[11px] text-secondary list-inside list-disc">
              <li>Queries source node for block receipts</li>
              <li>Encodes canonical EIP-2718 RLP bytes</li>
              <li>Constructs Patricia Merkle Trie nodes</li>
              <li>Pre-flight verification against root</li>
            </ul>
            <div className="rounded border border-[var(--warning)] bg-[var(--warning-soft)] p-2 text-[10px] warning-text">
              Untrusted relayer model: Destination smart contracts independently validate MPT inclusion proofs
            </div>
          </div>

          {/* Step 3: Destination Verifier */}
          <div className="surface-inset space-y-2.5 p-4">
            <div className="flex items-center justify-between">
              <span className="accent-text text-xs font-bold">03. DESTINATION CHAIN</span>
              <span className="tag tag-neutral">
                Chain ID: 31338
              </span>
            </div>
            <p className="technical-data font-semibold text-primary">DestinationVerifier.sol</p>
            <ul className="space-y-1 text-[11px] text-secondary list-inside list-disc">
              <li>Checks header validity in IHeaderVerifier</li>
              <li>Validates MPT inclusion in ReceiptVerifier</li>
              <li>Enforces on-chain replay mapping</li>
              <li>Dispatches payload to IDestinationReceiver</li>
            </ul>
            <div className="rounded border border-[var(--success)] bg-[var(--success-soft)] p-2 text-[10px] success-text">
              Verified & executed on-chain with full state rollback on failure
            </div>
          </div>
        </div>
      </div>

      {/* Modular Smart Contract Interface Hierarchy */}
      <div className="surface-card space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <h2 className="flex items-center space-x-2 text-sm font-semibold text-primary">
            <Code2 className="h-4 w-4 accent-text" />
            <span>Modular Interface Architecture</span>
          </h2>
          <span className="technical-data text-[10px] text-muted">
            Decoupled Verification Layers
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-2">
          {/* Interface 1: IHeaderVerifier */}
          <div className="surface-inset space-y-2 p-4">
            <div className="flex items-center justify-between">
              <span className="technical-data accent-text font-bold">IHeaderVerifier</span>
              <span className="tag tag-neutral">
                Consensus Layer
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-secondary">
              Verifies source block authenticity and finality. Decoupled from receipt verification so
              production light-clients or ZK-consensus proofs can be swapped seamlessly without modifying application verifiers.
            </p>
            <div className="technical-data border-t border-[var(--line)] pt-1 text-[10px] text-muted">
              Active: <code>DevHeaderOracle.sol</code> &bull; Upgrade: <code>LightClientHeaderVerifier.sol</code>
            </div>
          </div>

          {/* Interface 2: IReceiptVerifier */}
          <div className="surface-inset space-y-2 p-4">
            <div className="flex items-center justify-between">
              <span className="technical-data accent-text font-bold">IReceiptVerifier</span>
              <span className="tag tag-neutral">
                Trie & Parser Layer
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-secondary">
              Implements EVM Patricia Merkle Trie verification and RLP parsing. Confirms that key <code>txIndex</code> resolves to <code>receiptRlp</code> under <code>receiptsRoot</code>, ensuring authentic event parameters.
            </p>
            <div className="technical-data border-t border-[var(--line)] pt-1 text-[10px] text-muted">
              Implementation: <code>ReceiptVerifier.sol</code> with <code>MPTProof.sol</code> and <code>RLPReader.sol</code>
            </div>
          </div>

          {/* Interface 3: IDestinationVerifier */}
          <div className="surface-inset space-y-2 p-4">
            <div className="flex items-center justify-between">
              <span className="technical-data accent-text font-bold">IDestinationVerifier</span>
              <span className="tag tag-neutral">
                Protocol Coordinator
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-secondary">
              Core coordinator enforcing domain separation, origin configuration, replay protection, and caller authorization before executing destination application callbacks.
            </p>
            <div className="technical-data border-t border-[var(--line)] pt-1 text-[10px] text-muted">
              Implementation: <code>DestinationVerifier.sol</code>
            </div>
          </div>

          {/* Interface 4: IDestinationReceiver */}
          <div className="surface-inset space-y-2 p-4">
            <div className="flex items-center justify-between">
              <span className="technical-data accent-text font-bold">IDestinationReceiver</span>
              <span className="tag tag-neutral">
                Application Consumer
              </span>
            </div>
            <p className="text-[11px] leading-relaxed text-secondary">
              Application-layer consumer interface implemented by destination dapps to receive verified cross-chain actions with authenticated origin contract addresses and payloads.
            </p>
            <div className="technical-data border-t border-[var(--line)] pt-1 text-[10px] text-muted">
              Example Receiver: <code>CrossProofReceiver.sol</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
