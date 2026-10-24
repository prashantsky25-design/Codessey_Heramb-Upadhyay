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
    <div className="space-y-6 text-xs">
      {/* Page Header */}
      <div>
        <div className="flex items-center space-x-2">
          <Lock className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100">
            Trust Model & Cryptographic Guarantees
          </h1>
          <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
            Security Specification
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Honest, transparent disclosure of verified cryptographic guarantees, local development assumptions, and production light client roadmap.
        </p>
      </div>

      {/* 1. What is Cryptographically Verified On-Chain */}
      <div className="bg-[#111317] border border-[#21252d] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Cryptographically Verified On-Chain Guarantees</span>
          </h2>
          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
            Receipt Proof Checks
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-zinc-300">
          <div className="p-3.5 bg-[#0c0e12] rounded-lg border border-[#1b1f26] space-y-1.5">
            <span className="text-emerald-400 font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>1. Patricia Merkle Trie Inclusion</span>
            </span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              Receipt bytes are proven to exist in the block's <code>receiptsRoot</code> Patricia Trie at key <code>RLP(txIndex)</code>.
              The on-chain verifier recomputes <code>keccak256</code> on every branch and extension node. Any tampering with proof nodes or receipt contents fails closed immediately.
            </p>
          </div>

          <div className="p-3.5 bg-[#0c0e12] rounded-lg border border-[#1b1f26] space-y-1.5">
            <span className="text-emerald-400 font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>2. Event Signature & Emitter Authenticity</span>
            </span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              The verifier unpacks receipt logs and checks that <code>emitter == trustedSourceBridge</code> and <code>topic[0] == MessageDispatched.selector</code>.
              Counterfeit events emitted by other contracts on the source chain cannot masquerade as official bridge messages.
            </p>
          </div>

          <div className="p-3.5 bg-[#0c0e12] rounded-lg border border-[#1b1f26] space-y-1.5">
            <span className="text-emerald-400 font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>3. Domain Separation & Payload Binding</span>
            </span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              The message identifier binds <code>(MESSAGE_TYPEHASH, sourceChainId, sourceContract, destinationChainId, destinationReceiver, nonce, payloadHash)</code>.
              If an attacker attempts to reuse a proof on a different chain or substitute the payload, the transaction reverts with <code>PayloadHashMismatch</code> or <code>InvalidDestinationChainId</code>.
            </p>
          </div>

          <div className="p-3.5 bg-[#0c0e12] rounded-lg border border-[#1b1f26] space-y-1.5">
            <span className="text-emerald-400 font-bold flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>4. Persistent On-Chain Replay Lock</span>
            </span>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              A persistent <code>mapping(bytes32 =&gt; bool) public processedMessages</code> is maintained in the destination contract.
              Following Checks-Effects-Interactions (CEI), <code>processedMessages[messageId] = true</code> is written before external dispatch. The same message cannot be re-executed twice.
            </p>
          </div>
        </div>
      </div>

      {/* 2. Honest Trust Model Disclosure */}
      <div className="bg-[#111317] border border-[#21252d] rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Trust Modes & Source Header Assumptions</span>
          </h2>
          <span className="text-[10px] text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
            Honest Disclosure
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mode A */}
          <div className="p-4 bg-amber-950/20 rounded-lg border border-amber-800/40 space-y-2">
            <div className="text-amber-300 font-bold flex items-center space-x-1.5 text-xs">
              <span>MODE A: Local Dev Header Oracle (Active Environment)</span>
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              <strong>Purpose:</strong> Deterministic, reproducible local demonstration and hackathon judging without requiring 500GB PoS beacon chain sync.
            </p>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              <strong>Trust Assumption:</strong> The block header's <code>receiptsRoot</code> is committed by an authorized relayer account.
              <em>Receipt inclusion verification is 100% cryptographic, but this mode is explicitly disclosed as not fully trustless because header authenticity relies on an oracle.</em>
            </p>
          </div>

          {/* Mode B */}
          <div className="p-4 bg-cyan-950/20 rounded-lg border border-cyan-800/40 space-y-2">
            <div className="text-cyan-300 font-bold flex items-center space-x-1.5 text-xs">
              <span>MODE B: Experimental Header Attestation Prototype</span>
            </div>
            <p className="text-zinc-300 text-[11px] leading-relaxed">
              <strong>Purpose:</strong> Future trust-minimized deployment across independent blockchains.
            </p>
            <p className="text-zinc-400 text-[11px] leading-relaxed">
              <strong>Current status:</strong> <code>LightClientHeaderVerifier.sol</code> validates an RLP header hash, extracts <code>receiptsRoot</code>, and checks one trusted signer. It is not a production Ethereum consensus light client and is not active in the local demo.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Production Hardening Roadmap */}
      <div className="bg-[#111317] border border-[#21252d] rounded-xl p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>Production Hardening Roadmap</span>
          </h2>
          <span className="text-[10px] text-zinc-500">
            Path to Full Decentralization
          </span>
        </div>

        <ul className="space-y-2.5 text-zinc-300 text-[11px]">
          <li className="flex items-start space-x-2.5 p-2 rounded bg-[#0c0e12] border border-[#1b1f26]">
            <span className="text-cyan-400 font-bold mt-0.5">&bull;</span>
            <div>
              <strong className="text-zinc-200">Full Ethereum PoS Sync Committee Light Client:</strong>
              <p className="text-zinc-400 mt-0.5">
                Integration of BLS12-381 pairing precompiles (EIP-2537) or SNARK-based header proofs (e.g. Telepathy/Succinct) to verify 512 validator sync committee signatures on-chain.
              </p>
            </div>
          </li>
          <li className="flex items-start space-x-2.5 p-2 rounded bg-[#0c0e12] border border-[#1b1f26]">
            <span className="text-cyan-400 font-bold mt-0.5">&bull;</span>
            <div>
              <strong className="text-zinc-200">L2 State Root Finality:</strong>
              <p className="text-zinc-400 mt-0.5">
                On-chain verification of L2 output roots posted to L1 for rollups (Arbitrum, Optimism, Base) to enable bidirectional L1-L2 and L2-L2 verification.
              </p>
            </div>
          </li>
          <li className="flex items-start space-x-2.5 p-2 rounded bg-[#0c0e12] border border-[#1b1f26]">
            <span className="text-cyan-400 font-bold mt-0.5">&bull;</span>
            <div>
              <strong className="text-zinc-200">Multi-Prover Relayer Incentive Network:</strong>
              <p className="text-zinc-400 mt-0.5">
                Decentralized relayer pool with economic incentives and slashed stakes for submitting invalid or malformed proofs.
              </p>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
};
