'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export interface PlanYtdDataPoint {
  planName: string;
  medical: number;
  rx: number;
  total: number;
}

export interface PlanYtdChartProps {
  data: PlanYtdDataPoint[];
  title?: string;
}

/**
 * Plan YTD Stacked Bar Chart Component
 *
 * Stacked bar chart showing Medical vs Rx breakdown by plan
 * Used in Executive Summary to visualize plan mix
 */
export function PlanYtdChart({ data, title = 'Plan YTD' }: PlanYtdChartProps) {
  // Format currency for Y-axis
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(0)}K`;
    }
    return `$${value.toLocaleString()}`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const medical = payload.find((p: any) => p.dataKey === 'medical')?.value || 0;
      const rx = payload.find((p: any) => p.dataKey === 'rx')?.value || 0;
      const total = medical + rx;

      return (
        <div className="bg-base-900 border border-slate-700 rounded-card p-3 shadow-lg">
          <p className="text-sm font-semibold text-slate-300 mb-2">{label}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span className="text-slate-400">Medical:</span>
              </div>
              <span className="font-semibold text-text-dark">
                ${medical.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <span className="text-slate-400">Rx:</span>
              </div>
              <span className="font-semibold text-text-dark">
                ${rx.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm pt-2 border-t border-slate-700">
              <span className="text-slate-400 font-semibold">Total:</span>
              <span className="font-bold text-accent-primary">
                ${total.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      {title && <h4 className="text-sm font-semibold text-slate-300 mb-4">{title}</h4>}
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis
            dataKey="planName"
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#94a3b8"
            fontSize={12}
            tickLine={false}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            iconType="rect"
          />
          <Bar
            dataKey="medical"
            stackId="a"
            fill="#3b82f6"
            name="Medical"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="rx"
            stackId="a"
            fill="#a855f7"
            name="Rx"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
