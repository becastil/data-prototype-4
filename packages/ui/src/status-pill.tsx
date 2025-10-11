import React from 'react';
import { cn } from './utils';

export interface StatusPillProps {
  status: 'on-way' | 'up-to-date' | 'needs-review';
  children: React.ReactNode;
  showDot?: boolean;
  className?: string;
}

export function StatusPill({
  status,
  children,
  showDot = true,
  className
}: StatusPillProps) {
  return (
    <div className={cn('status-pill', status, className)}>
      {showDot && (
        <div
          className={cn(
            'w-2 h-2 rounded-full',
            status === 'on-way' && 'bg-accent-primary animate-pulse',
            status === 'up-to-date' && 'bg-accent-info',
            status === 'needs-review' && 'bg-accent-warning'
          )}
        />
      )}
      <span>{children}</span>
    </div>
  );
}
