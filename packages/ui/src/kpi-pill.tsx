import React from 'react';
import { cn } from './utils';

export interface KpiPillProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function KpiPill({ label, value, trend, className }: KpiPillProps) {
  return (
    <div className={cn('kpi-pill', className)}>
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div
        className={cn(
          'text-2xl font-bold',
          trend === 'up' && 'text-status-green',
          trend === 'down' && 'text-status-red'
        )}
      >
        {value}
      </div>
    </div>
  );
}
