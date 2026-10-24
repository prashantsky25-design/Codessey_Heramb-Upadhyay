import React from 'react';
import { AlertTriangle, ShieldCheck, CheckCircle2, ChevronRight, Lock, HelpCircle } from 'lucide-react';

interface SecurityBannerProps {
  onReviewTrust: () => void;
}

export const SecurityBanner: React.FC<SecurityBannerProps> = ({ onReviewTrust }) => {
  return (
    <div className="surface-card space-y-3 p-4 text-xs">
      {/* Top Bar: Active Mode & Action */}
      <div className="flex flex-col justify-between gap-2 border-b border-[var(--line)] pb-3 sm:flex-row sm:items-center">
        <div className="flex items-center space-x-2.5">
          <div className="h-2 w-2 rounded-full bg-[var(--warning)]" />
          <span className="font-semibold text-primary">
            Security Status: MODE A (Local Dev Header Oracle)
          </span>
          <span className="tag tag-warning">
            Development Mode
          </span>
        </div>

        <button
          onClick={onReviewTrust}
          className="button-secondary self-start px-3 py-1 text-[11px] sm:self-auto"
        >
          <span>Review Trust Assumptions</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4 Security Guarantee Pillars */}
      <div className="grid grid-cols-1 gap-2.5 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
        {/* Pillar 1: Receipt Inclusion */}
        <div className="surface-inset p-2.5">
          <div className="mb-1 flex items-center space-x-1.5 font-semibold success-text">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span>Receipt Inclusion</span>
          </div>
          <p className="text-[10px] leading-relaxed text-secondary">
            <strong className="text-primary">100% Cryptographic:</strong> Recomputed Patricia Trie hashes over canonical RLP receipt.
          </p>
        </div>

        {/* Pillar 2: Source Header Authenticity */}
        <div className="surface-inset p-2.5">
          <div className="mb-1 flex items-center space-x-1.5 font-semibold warning-text">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Header Authenticity</span>
          </div>
          <p className="text-[10px] leading-relaxed text-secondary">
            <strong className="text-primary">Relayer Oracle:</strong> Block receiptsRoot committed by authorized local oracle key.
          </p>
        </div>

        {/* Pillar 3: Source Finality */}
        <div className="surface-inset p-2.5">
          <div className="mb-1 flex items-center space-x-1.5 font-semibold warning-text">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>Source Finality</span>
          </div>
          <p className="text-[10px] leading-relaxed text-secondary">
            <strong className="text-primary">Single-Block Dev:</strong> Anvil instant blocks. Mode B adds Casper/PoS signature checks.
          </p>
        </div>

        {/* Pillar 4: Trusted Components */}
        <div className="surface-inset p-2.5">
          <div className="mb-1 flex items-center space-x-1.5 font-semibold text-primary">
            <Lock className="h-3.5 w-3.5 shrink-0 accent-text" />
            <span>Trusted Party</span>
          </div>
          <p className="text-[10px] leading-relaxed text-secondary">
            <strong className="warning-text">DevHeaderOracle:</strong> Receipts verification is trustless; header feed is trusted in Mode A.
          </p>
        </div>
      </div>
    </div>
  );
};
