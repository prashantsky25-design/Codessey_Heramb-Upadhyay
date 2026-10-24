import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'VERIFIED' | 'PENDING' | 'REJECTED' | 'FAILED' | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const norm = status.toUpperCase();

  const isVerified = norm === 'VERIFIED' || norm === 'SUCCESS';
  const isRejected = norm === 'REJECTED' || norm === 'FAILED';
  const isPending = norm === 'PENDING' || norm === 'IN_PROGRESS';

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  if (isVerified) {
    return (
      <span className={`inline-flex items-center space-x-1 rounded font-mono font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 ${sizeClasses}`}>
        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
        <span>VERIFIED</span>
      </span>
    );
  }

  if (isRejected) {
    return (
      <span className={`inline-flex items-center space-x-1 rounded font-mono font-medium bg-rose-950/60 text-rose-400 border border-rose-800/40 ${sizeClasses}`}>
        <XCircle className="w-3 h-3 text-rose-400" />
        <span>REJECTED</span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center space-x-1 rounded font-mono font-medium bg-amber-950/60 text-amber-400 border border-amber-800/40 ${sizeClasses}`}>
      <Clock className="w-3 h-3 text-amber-400 animate-spin" />
      <span>PENDING</span>
    </span>
  );
};
