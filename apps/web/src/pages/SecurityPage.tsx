import React from 'react';
import {
  Lock,
  ShieldCheck,
  AlertTriangle,
  Cpu,
  CheckCircle2,
  ArrowRight,
  GitBranch,
  KeyRound,
  FileCheck2
} from 'lucide-react';

export const SecurityPage: React.FC = () => {
  return (
    <div className="space-y-6 text-sm">
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-2">
          <Lock className="h-6 w-6 accent-text" />
          <h1 className="text-xl font-bold text-strong sm:text-2xl">
            Trust Model & Cryptographic Guarantees
          </h1>
          <span className="tag tag-accent">
            Security Specification
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-secondary">
          Honest, transparent disclosure of verified cryptographic guarantees, local development assumptions, and production light client roadmap.
        </p>
      </div>

      {/* 1. What is Cryptographically Verified On-Chain */}
      <div className="surface-card space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <h2 className="flex items-center space-x-2 text-sm font-semibold text-primary">
            <ShieldCheck className="h-4 w-4 success-text" />
            <span>Cryptographically Verified On-Chain Guarantees</span>
          </h2>
          <span className="tag tag-success">
            Trust-Minimized Relayers
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 text-primary md:grid-cols-2">
          <div className="surface-inset space-y-1.5 p-3.5">
            <span className="flex items-center space-x-1.5 font-bold success-text">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>1. Patricia Merkle Trie Inclusion</span>
            </span>
            <p className="text-[11px] leading-relaxed text-secondary">
              Receipt bytes are proven to exist in the block's <code>receiptsRoot</code> Patricia Trie at key <code>RLP(txIndex)</code>.
              The on-chain verifier recomputes <code>keccak256</code> on every branch and extension node. Any tampering with proof nodes or receipt contents fails closed immediately.
            </p>
          </div>

          <div className="surface-inset space-y-1.5 p-3.5">
            <span className="flex items-center space-x-1.5 font-bold success-text">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>2. Event Signature & Emitter Authenticity</span>
            </span>
            <p className="text-[11px] leading-relaxed text-secondary">
              The verifier unpacks receipt logs and checks that <code>emitter == trustedSourceBridge</code> and <code>topic[0] == MessageDispatched.selector</code>.
              Counterfeit events emitted by other contracts on the source chain cannot masquerade as official bridge messages.
            </p>
          </div>

          <div className="surface-inset space-y-1.5 p-3.5">
            <span className="flex items-center space-x-1.5 font-bold success-text">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>3. Domain Separation & Payload Binding</span>
            </span>
            <p className="text-[11px] leading-relaxed text-secondary">
              The message identifier binds <code>(MESSAGE_TYPEHASH, sourceChainId, sourceContract, destinationChainId, destinationReceiver, nonce, payloadHash)</code>.
              If an attacker attempts to reuse a proof on a different chain or substitute the payload, the transaction reverts with <code>PayloadHashMismatch</code> or <code>InvalidDestinationChainId</code>.
            </p>
          </div>

          <div className="surface-inset space-y-1.5 p-3.5">
            <span className="flex items-center space-x-1.5 font-bold success-text">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>4. Persistent On-Chain Replay Lock</span>
            </span>
            <p className="text-[11px] leading-relaxed text-secondary">
              A persistent <code>mapping(bytes32 =&gt; bool) public processedMessages</code> is maintained in the destination contract.
              Following Checks-Effects-Interactions (CEI), <code>processedMessages[messageId] = true</code> is written before external dispatch. The same message cannot be re-executed twice.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Honest Trust Model Disclosure */}
      <div className="surface-card space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <h2 className="flex items-center space-x-2 text-sm font-semibold text-primary">
            <AlertTriangle className="h-4 w-4 warning-text" />
            <span>Trust Modes & Source Header Assumptions</span>
          </h2>
          <span className="tag tag-warning">
            Honest Disclosure
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mode A */}
          <div className="space-y-2 rounded border border-[var(--warning)] bg-[var(--warning-soft)] p-4">
            <div className="flex items-center space-x-1.5 text-xs font-bold warning-text">
              <span>MODE A: Local Dev Header Oracle (Active Environment)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-primary">
              <strong>Purpose:</strong> Deterministic, reproducible local demonstration and hackathon judging without requiring 500GB PoS beacon chain sync.
            </p>
            <p className="text-[11px] leading-relaxed text-secondary">
              <strong>Trust Assumption:</strong> The block header's <code>receiptsRoot</code> is committed by an authorized relayer account.
              <em>Receipt inclusion verification is 100% cryptographic, but this mode is explicitly disclosed as not fully trustless because header authenticity relies on an oracle.</em>
            </p>
          </div>

          {/* Mode B */}
          <div className="space-y-2 rounded border border-[var(--accent)] bg-[var(--accent-soft)] p-4">
            <div className="flex items-center space-x-1.5 text-xs font-bold accent-text">
              <span>MODE B: Light Client Consensus Verifier (Production Spec)</span>
            </div>
            <p className="text-[11px] leading-relaxed text-primary">
              <strong>Purpose:</strong> Trust-minimized production deployment across independent blockchains.
            </p>
            <p className="text-[11px] leading-relaxed text-secondary">
              <strong>Mechanism:</strong> Implemented in <code>LightClientHeaderVerifier.sol</code>: validates RLP execution header integrity, confirms <code>blockHash == keccak256(headerRlp)</code>, extracts <code>receiptsRoot</code> from header field 5, and verifies cryptographic consensus committee signatures against a trusted checkpoint.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Production Hardening Roadmap */}
      <div className="surface-card space-y-3 p-6">
        <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
          <h2 className="flex items-center space-x-2 text-sm font-semibold text-primary">
            <Cpu className="h-4 w-4 accent-text" />
            <span>Production Hardening Roadmap</span>
          </h2>
          <span className="text-[10px] text-muted">
            Path to Full Decentralization
          </span>
        </div>

        <ul className="space-y-2.5 text-[11px] text-primary">
          <li className="surface-inset flex items-start space-x-2.5 p-2">
            <span className="mt-0.5 font-bold accent-text">&bull;</span>
            <div>
              <strong className="text-primary">Full Ethereum PoS Sync Committee Light Client:</strong>
              <p className="mt-0.5 text-secondary">
                Integration of BLS12-381 pairing precompiles (EIP-2537) or SNARK-based header proofs (e.g. Telepathy/Succinct) to verify 512 validator sync committee signatures on-chain.
              </p>
            </div>
          </li>
          <li className="surface-inset flex items-start space-x-2.5 p-2">
            <span className="mt-0.5 font-bold accent-text">&bull;</span>
            <div>
              <strong className="text-primary">L2 State Root Finality:</strong>
              <p className="mt-0.5 text-secondary">
                On-chain verification of L2 output roots posted to L1 for rollups (Arbitrum, Optimism, Base) to enable bidirectional L1-L2 and L2-L2 verification.
              </p>
            </div>
          </li>
          <li className="surface-inset flex items-start space-x-2.5 p-2">
            <span className="mt-0.5 font-bold accent-text">&bull;</span>
            <div>
              <strong className="text-primary">Multi-Prover Relayer Incentive Network:</strong>
              <p className="mt-0.5 text-secondary">
                Decentralized relayer pool with economic incentives and slashed stakes for submitting invalid or malformed proofs.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};
