import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  Database,
  X,
  ShieldCheck,
  Cpu,
  Layers
} from 'lucide-react';
import { VerificationRecord } from '@crossproof/shared';
import { StatusBadge } from '../components/StatusBadge';

interface HistoryPageProps {
  records: VerificationRecord[];
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ records }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'REJECTED'>('ALL');
  const [chainFilter, setChainFilter] = useState<string>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<VerificationRecord | null>(null);

  useEffect(() => {
    if (!selectedRecord) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedRecord(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedRecord]);

  const filteredRecords = records.filter((r) => {
    const matchesStatus =
      statusFilter === 'ALL' || r.status.toUpperCase() === statusFilter;
    const matchesChain =
      chainFilter === 'ALL' ||
      r.sourceChainId.toString() === chainFilter ||
      r.destinationChainId.toString() === chainFilter;
    const matchesSearch =
      searchTerm === '' ||
      r.verificationId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.sourceTxHash.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.messageId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.destinationTxHash?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesChain && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center space-x-2">
          <History className="w-6 h-6 text-cyan-400" />
          <h1 className="text-xl sm:text-2xl font-bold font-mono text-zinc-100">
            Verification Provenance Ledger
          </h1>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50">
            Session Audit Log
          </span>
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          In-memory verification records from the current API session. On-chain evidence remains authoritative.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#111317] border border-[#21252d] rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search hash, message ID, or ver ID..."
            className="w-full bg-[#0c0e12] border border-zinc-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center space-x-1 bg-[#0c0e12] p-1 rounded-lg border border-zinc-800">
            <span className="text-zinc-500 text-[10px] px-1.5">Status:</span>
            {(['ALL', 'VERIFIED', 'REJECTED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  statusFilter === s
                    ? 'bg-[#181c24] text-cyan-300 border border-cyan-500/30'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Chain Route Filter */}
          <select
            value={chainFilter}
            onChange={(e) => setChainFilter(e.target.value)}
            className="bg-[#0c0e12] border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Networks</option>
            <option value="31337">Chain 31337 (ETH Local)</option>
            <option value="31338">Chain 31338 (OP Local)</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#111317] border border-[#21252d] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#0e1014] border-b border-zinc-800 text-zinc-400 text-[11px]">
                <th className="py-3 px-4">Verification ID</th>
                <th className="py-3 px-4">Origin Tx Hash</th>
                <th className="py-3 px-4">Source Block</th>
                <th className="py-3 px-4">Route</th>
                <th className="py-3 px-4">Destination Gas</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    No verification records found matching your query.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr
                    key={r.verificationId}
                    className="hover:bg-zinc-900/40 transition cursor-pointer"
                    onClick={() => setSelectedRecord(r)}
                  >
                    <td className="py-3 px-4 font-bold text-zinc-200">
                      {r.verificationId}
                    </td>
                    <td className="py-3 px-4 text-cyan-400 hover:underline">
                      {r.sourceTxHash.slice(0, 10)}...{r.sourceTxHash.slice(-8)}
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      #{r.blockNumber} <span className="text-zinc-500">(tx #{r.txIndex})</span>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {r.sourceChainId} &rarr; {r.destinationChainId}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">
                      {r.gasUsed ? Number(r.gasUsed).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={r.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(r);
                        }}
                        className="text-cyan-400 hover:text-cyan-300 hover:underline text-[11px]"
                      >
                        Inspect &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Slide-over / Modal Drawer */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRecord(null); }}>
          <div className="bg-[#111317] border border-[#21252d] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="verification-detail-title">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Database className="w-5 h-5 text-cyan-400" />
                <h3 id="verification-detail-title" className="text-base font-bold font-mono text-zinc-100">
                  Verification Detail: {selectedRecord.verificationId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-[#1b1f26] bg-[#0c0e12]">
                <span className="text-zinc-500 block mb-1">Status</span>
                <StatusBadge status={selectedRecord.status} size="sm" />
              </div>
              <div className="p-3 rounded-lg border border-[#1b1f26] bg-[#0c0e12]">
                <span className="text-zinc-500 block mb-1">Trust mode</span>
                <span className="text-amber-300">{selectedRecord.trustMode}</span>
              </div>
              <div className="p-3 rounded-lg border border-[#1b1f26] bg-[#0c0e12] md:col-span-2">
                <span className="text-zinc-500 block mb-1">Source transaction</span>
                <code className="text-cyan-300 break-all">{selectedRecord.sourceTxHash}</code>
              </div>
              <div className="p-3 rounded-lg border border-[#1b1f26] bg-[#0c0e12] md:col-span-2">
                <span className="text-zinc-500 block mb-1">Destination transaction</span>
                <code className="text-emerald-300 break-all">
                  {selectedRecord.destinationTxHash || 'Not available'}
                </code>
              </div>
              <div className="p-3 rounded-lg border border-[#1b1f26] bg-[#0c0e12]">
                <span className="text-zinc-500 block mb-1">Message ID</span>
                <code className="text-cyan-300 break-all">{selectedRecord.messageId}</code>
              </div>
              <div className="p-3 rounded-lg border border-[#1b1f26] bg-[#0c0e12]">
                <span className="text-zinc-500 block mb-1">Payload hash</span>
                <code className="text-cyan-300 break-all">{selectedRecord.payloadHash}</code>
              </div>
              {selectedRecord.rejectionReason && (
                <div className="p-3 rounded-lg border border-rose-800/50 bg-rose-950/20 md:col-span-2">
                  <span className="text-rose-400 block mb-1">Rejection reason</span>
                  <span className="text-rose-200 break-words">{selectedRecord.rejectionReason}</span>
                </div>
              )}
              <div className="p-3 rounded-lg border border-amber-800/50 bg-amber-950/20 md:col-span-2">
                <span className="text-amber-300 font-semibold">Raw proof bytes are not persisted by the current API.</span>
                <p className="text-amber-200/70 mt-1">
                  This view intentionally shows metadata only instead of fabricating receipt or MPT proof values.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-mono transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
