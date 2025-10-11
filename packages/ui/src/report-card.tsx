import React from 'react';
import { cn } from './utils';

export interface ReportCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ReportCard({ children, className, onClick }: ReportCardProps) {
  return (
    <div
      className={cn('report-card', onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
