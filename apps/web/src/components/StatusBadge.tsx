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
  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';

  if (isVerified) {
    return (
       <span className={`status-pill tag-success ${sizeClasses}`}>
         <CheckCircle2 className="h-3 w-3" />
        <span>VERIFIED</span>
      </span>
    );
  }

  if (isRejected) {
    return (
       <span className={`status-pill tag-danger ${sizeClasses}`}>
         <XCircle className="h-3 w-3" />
        <span>REJECTED</span>
      </span>
    );
  }

  return (
     <span className={`status-pill tag-warning ${sizeClasses}`}>
       <Clock className="h-3 w-3" />
      <span>PENDING</span>
    </span>
  );
};
