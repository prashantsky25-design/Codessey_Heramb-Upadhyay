import React from 'react';
import { Cpu, ShieldAlert, ShieldCheck, Zap } from 'lucide-react';
import { VerificationRecord } from '@crossproof/shared';

interface MetricsCardsProps {
  records?: VerificationRecord[];
  isLoading?: boolean;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ records = [], isLoading = false }) => {
  const verified = records.filter((record) => record.status === 'VERIFIED').length;
  const rejected = records.filter((record) => record.status === 'REJECTED').length;
  const validGasRecords = records.filter((record) => record.gasUsed && Number(record.gasUsed) > 0);
  const validTimeRecords = records.filter((record) => record.proofTimeMs && record.proofTimeMs > 0);
  const avgGas = validGasRecords.length
    ? Math.round(validGasRecords.reduce((total, record) => total + Number(record.gasUsed), 0) / validGasRecords.length)
    : null;
  const avgProofTime = validTimeRecords.length
    ? Math.round(validTimeRecords.reduce((total, record) => total + Number(record.proofTimeMs), 0) / validTimeRecords.length)
    : null;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="surface-card space-y-3 p-4 animate-pulse">
            <div className="h-3 w-2/3 rounded bg-[var(--surface-muted)]" />
            <div className="h-6 w-1/2 rounded bg-[var(--line)]" />
            <div className="h-2 w-3/4 rounded bg-[var(--surface-muted)]" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <MetricCard
        icon={<ShieldCheck className="h-4 w-4 success-text" />}
        label="Verified Messages"
        value={verified}
        tag="On-chain"
        tagClass="tag-success"
        detail={verified > 0 ? 'Patricia Trie verified' : 'No records yet'}
        detailRight="Live data"
      />
      <MetricCard
        icon={<ShieldAlert className="h-4 w-4 danger-text" />}
        label="Attacks Blocked"
        value={rejected}
        tag="Failed closed"
        tagClass="tag-danger"
        detail="Recorded rejections"
        detailRight="On-chain result"
        detailRightClass="danger-text"
      />
      <MetricCard
        icon={<Zap className="h-4 w-4 accent-text" />}
        label="Proof Gen Time"
        value={avgProofTime ?? '—'}
        unit={avgProofTime === null ? undefined : 'ms'}
        tag="Measured"
        tagClass="tag-accent"
        detail="Trie proof construction"
        detailRight="@ethereumjs/trie"
        detailRightClass="technical-data"
      />
      <MetricCard
        icon={<Cpu className="h-4 w-4 warning-text" />}
        label="Destination Gas"
        value={avgGas === null ? '—' : avgGas.toLocaleString()}
        unit={avgGas === null ? undefined : 'gas'}
        detail="Full EVM MPT verification"
        detailRight="Measured receipt"
      />
    </div>
  );
};

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  unit?: string;
  tag?: string;
  tagClass?: string;
  detail: string;
  detailRight: string;
  detailRightClass?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  label,
  value,
  unit,
  tag,
  tagClass = 'tag-neutral',
  detail,
  detailRight,
  detailRightClass = 'text-secondary'
}) => (
  <div className="surface-card p-4 transition hover:border-[var(--line-strong)]">
    <div className="mb-2 flex items-center justify-between text-xs text-secondary">
      <span className="font-semibold text-primary">{label}</span>
      {icon}
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-2xl font-bold tracking-tight text-strong">{value}</span>
      {unit && <span className="text-xs font-semibold accent-text">{unit}</span>}
      {tag && <span className={`tag ml-auto ${tagClass}`}>{tag}</span>}
    </div>
    <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted">
      <span>{detail}</span>
      <span className={detailRightClass}>{detailRight}</span>
    </div>
  </div>
);
