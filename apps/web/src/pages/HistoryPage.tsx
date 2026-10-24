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
import { ProofInspector } from '../components/ProofInspector';

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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedRecord(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
          <History className="h-6 w-6 accent-text" />
          <h1 className="text-xl font-bold text-strong sm:text-2xl">
            Verification Provenance Ledger
          </h1>
          <span className="tag tag-accent">
            Immutable Audit Trail
          </span>
        </div>
        <p className="mt-1 text-sm leading-6 text-secondary">
          Complete historical ledger of all cross-chain proofs verified or rejected on the destination blockchain.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="surface-card flex flex-col items-center justify-between gap-3 p-4 text-xs md:flex-row">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search hash, message ID, or ver ID..."
            className="theme-input w-full px-3 py-2 pl-9 text-xs"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="surface-inset flex items-center space-x-1 p-1">
            <span className="px-1.5 text-[10px] text-muted">Status:</span>
            {(['ALL', 'VERIFIED', 'REJECTED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                  statusFilter === s
                     ? 'tag tag-accent'
                     : 'text-secondary hover:text-primary'
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
            className="theme-select w-auto px-2.5 py-1.5 text-xs"
          >
            <option value="ALL">All Networks</option>
            <option value="31337">Chain 31337 (ETH Local)</option>
            <option value="31338">Chain 31338 (OP Local)</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
           <table className="w-full text-left text-xs">
            <thead>
               <tr className="border-b border-[var(--line)] bg-[var(--surface-muted)] text-[11px] text-muted">
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
                   <td colSpan={7} className="py-12 text-center text-muted">
                    No verification records found matching your query.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr
                    key={r.verificationId}
                     className="cursor-pointer transition hover:bg-[var(--surface-muted)]"
                    onClick={() => setSelectedRecord(r)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedRecord(r);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                  >
                     <td className="py-3 px-4 font-bold text-primary">
                      {r.verificationId}
                    </td>
                     <td className="technical-data py-3 px-4 accent-text hover:underline">
                      {r.sourceTxHash.slice(0, 10)}...{r.sourceTxHash.slice(-8)}
                    </td>
                     <td className="technical-data py-3 px-4 text-primary">
                       #{r.blockNumber} <span className="text-muted">(tx #{r.txIndex})</span>
                    </td>
                     <td className="py-3 px-4 text-primary">
                      {r.sourceChainId} &rarr; {r.destinationChainId}
                    </td>
                     <td className="technical-data py-3 px-4 text-secondary">
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
                         className="accent-text text-[11px] hover:underline"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(5,10,20,0.56)] p-4 backdrop-blur-sm" onClick={() => setSelectedRecord(null)}>
          <div className="surface-card max-h-[90vh] w-full max-w-3xl space-y-4 overflow-y-auto p-6" role="dialog" aria-modal="true" aria-labelledby="verification-detail-title" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div className="flex items-center space-x-2">
                <Database className="h-5 w-5 accent-text" />
                <h3 id="verification-detail-title" className="text-base font-bold text-primary">
                  Verification Detail: {selectedRecord.verificationId}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                 className="rounded-md p-1 text-secondary transition hover:bg-[var(--surface-muted)] hover:text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

             <ProofInspector
              verificationId={selectedRecord.verificationId}
              messageId={selectedRecord.messageId}
              destinationTxHash={selectedRecord.destinationTxHash}
              gasUsed={selectedRecord.gasUsed}
              durationMs={selectedRecord.proofTimeMs}
              status={selectedRecord.status}
               proof={selectedRecord.proof}
            />

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="button-secondary px-4 py-2 text-xs"
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
