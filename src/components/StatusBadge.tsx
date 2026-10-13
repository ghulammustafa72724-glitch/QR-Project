import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface StatusBadgeProps {
  statusText?: string;
  isLive?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  statusText = 'Application Status: Running',
  isLive = true,
}) => {
  return (
    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs sm:text-sm font-medium">
      <span className="relative flex h-2 w-2">
        {isLive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      <span>{statusText}</span>
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 ml-0.5" />
    </div>
  );
};
