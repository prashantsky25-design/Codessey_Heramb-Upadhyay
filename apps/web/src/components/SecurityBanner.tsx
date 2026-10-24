import React from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, Lock, HelpCircle } from 'lucide-react';

interface SecurityBannerProps {
  onReviewTrust: () => void;
}

export const SecurityBanner: React.FC<SecurityBannerProps> = ({ onReviewTrust }) => {
  return (
    <div className="rounded-xl bg-[#121419] border border-[#232832] p-4 shadow-sm font-mono text-xs space-y-3">
      {/* Top Bar: Active Mode & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1f232b] pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span className="font-semibold text-zinc-100">
            Security Status: MODE A (Local Dev Header Oracle)
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
            Development Mode
          </span>
        </div>

        <button
          onClick={onReviewTrust}
          className="inline-flex items-center space-x-1.5 px-3 py-1 bg-[#1a1e26] hover:bg-[#232834] text-cyan-300 hover:text-cyan-200 border border-cyan-500/30 rounded text-[11px] transition self-start sm:self-auto"
        >
          <span>Review Trust Assumptions</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Security Guarantee Pillars */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-[11px]">
        {/* Pillar 1: Receipt Inclusion */}
        <div className="p-2.5 rounded-lg bg-[#0c0e12] border border-[#1b1f26]">
          <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold mb-1">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Receipt Inclusion</span>
          </div>
          <p className="text-zinc-400 text-[10px] leading-relaxed">
            <strong className="text-zinc-300">100% Cryptographic:</strong> Recomputed Patricia Trie hashes over canonical RLP receipt.
          </p>
        </div>

        {/* Pillar 2: Source Header Authenticity */}
        <div className="p-2.5 rounded-lg bg-[#0c0e12] border border-[#1b1f26]">
          <div className="flex items-center space-x-1.5 text-amber-400 font-semibold mb-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Header Authenticity</span>
          </div>
          <p className="text-zinc-400 text-[10px] leading-relaxed">
            <strong className="text-zinc-300">Relayer Oracle:</strong> Block receiptsRoot committed by authorized local oracle key.
          </p>
        </div>

        {/* Pillar 3: Source Finality */}
        <div className="p-2.5 rounded-lg bg-[#0c0e12] border border-[#1b1f26]">
          <div className="flex items-center space-x-1.5 text-amber-400 font-semibold mb-1">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Source Finality</span>
          </div>
          <p className="text-zinc-400 text-[10px] leading-relaxed">
            <strong className="text-zinc-300">Single-Block Dev:</strong> Anvil instant blocks. Mode B adds Casper/PoS signature checks.
          </p>
        </div>

        {/* Pillar 4: Trusted Components */}
        <div className="p-2.5 rounded-lg bg-[#0c0e12] border border-[#1b1f26]">
          <div className="flex items-center space-x-1.5 text-zinc-300 font-semibold mb-1">
            <Lock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Trusted Party</span>
          </div>
          <p className="text-zinc-400 text-[10px] leading-relaxed">
            <strong className="text-amber-300">DevHeaderOracle:</strong> Receipts verification is trustless; header feed is trusted in Mode A.
          </p>
        </div>
      </div>
    </div>
  );
};
