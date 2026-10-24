import React from 'react';
import { ShieldCheck, ShieldAlert, Zap, Cpu } from 'lucide-react';
import { VerificationRecord } from '@crossproof/shared';

interface MetricsCardsProps {
  records?: VerificationRecord[];
  isLoading?: boolean;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ records = [], isLoading = false }) => {
  const verified = records.filter((r) => r.status === 'VERIFIED').length;
  const rejected = records.filter((r) => r.status === 'REJECTED').length;

  const validGasRecords = records.filter((r) => r.gasUsed && Number(r.gasUsed) > 0);
  const avgGas: number | null =
    validGasRecords.length > 0
      ? Math.round(
          validGasRecords.reduce((acc, r) => acc + Number(r.gasUsed), 0) / validGasRecords.length
        )
      : null;

  const validTimeRecords = records.filter((r) => r.proofTimeMs && r.proofTimeMs > 0);
  const avgProofTime: number | null =
    validTimeRecords.length > 0
      ? Math.round(
          validTimeRecords.reduce((acc, r) => acc + Number(r.proofTimeMs), 0) / validTimeRecords.length
        )
      : null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[#111317] border border-[#21252d] rounded-xl p-4 animate-pulse space-y-3"
          >
            <div className="h-3 bg-zinc-800 rounded w-2/3" />
            <div className="h-6 bg-zinc-700 rounded w-1/2" />
            <div className="h-2 bg-zinc-800 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. Verified Messages */}
      <div className="bg-[#111317] border border-[#21252d] rounded-xl p-4 shadow-sm hover:border-zinc-700 transition">
        <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs">
          <span className="font-semibold text-zinc-300">Verified Messages</span>
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-zinc-100 tracking-tight">
            {verified}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            ON-CHAIN
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
          <span>Patricia Trie verified</span>
          <span className="text-zinc-400">Local Devnet</span>
        </div>
      </div>

      {/* 2. Attack Attempts Blocked */}
      <div className="bg-[#111317] border border-[#21252d] rounded-xl p-4 shadow-sm hover:border-zinc-700 transition">
        <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs">
          <span className="font-semibold text-zinc-300">Rejected Attempts</span>
          <ShieldAlert className="w-4 h-4 text-rose-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-zinc-100 tracking-tight">
            {rejected}
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-800/40">
            RECORDED
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
          <span>API records with rejected status</span>
          <span className="text-rose-400/80">Not attack count</span>
        </div>
      </div>

      {/* 3. Proof Generation Time */}
      <div className="bg-[#111317] border border-[#21252d] rounded-xl p-4 shadow-sm hover:border-zinc-700 transition">
        <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs">
          <span className="font-semibold text-zinc-300">Proof Gen Time</span>
          <Zap className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-zinc-100 tracking-tight">
            {avgProofTime ?? '—'}
          </span>
          <span className="text-xs text-cyan-400 font-semibold">{avgProofTime !== null ? 'ms' : ''}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/40 ml-auto">
            BENCHMARK
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
          <span>Trie proof construction</span>
          <span className="text-zinc-400">@ethereumjs/trie</span>
        </div>
      </div>

      {/* 4. Destination Gas Used */}
      <div className="bg-[#111317] border border-[#21252d] rounded-xl p-4 shadow-sm hover:border-zinc-700 transition">
        <div className="flex items-center justify-between text-zinc-400 mb-2 text-xs">
          <span className="font-semibold text-zinc-300">Destination Gas</span>
          <Cpu className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-zinc-100 tracking-tight">
            {avgGas !== null ? avgGas.toLocaleString() : '—'}
          </span>
          <span className="text-xs text-amber-400 font-semibold">{avgGas !== null ? 'gas' : ''}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
          <span>Full EVM MPT verification</span>
          <span className="text-zinc-400">Measured Receipt</span>
        </div>
      </div>
    </div>
  );
};
