'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export interface PepmDataPoint {
  month: string;
  current?: number;
  prior?: number;
}

export interface PepmTrendChartProps {
  data: PepmDataPoint[];
  title: string;
  currentLabel?: string;
  priorLabel?: string;
  showPrior?: boolean;
}

/**
 * PEPM Trend Chart Component
 *
 * Line chart showing PEPM trends over rolling 24 months
 * Displays Current 12 vs Prior 12 comparison
 */
export function PepmTrendChart({
  data,
  title,
  currentLabel = 'Current 12',
  priorLabel = 'Prior 12',
  showPrior = true
}: PepmTrendChartProps) {
  // Format currency for Y-axis
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString()}`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-base-900 border border-slate-700 rounded-card p-3 shadow-lg">
          <p className="text-sm font-semibold text-slate-300 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-400">{entry.name}:</span>
              <span className="font-semibold text-text-dark">
                {formatCurrency(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <h4 className="text-sm font-semibold text-slate-300 mb-4">{title}</h4>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
          <XAxis
            dataKey="month"
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
            iconType="line"
          />
          <Line
            type="monotone"
            dataKey="current"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
            activeDot={{ r: 6 }}
            name={currentLabel}
          />
          {showPrior && (
            <Line
              type="monotone"
              dataKey="prior"
              stroke="#64748b"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#64748b', r: 4 }}
              activeDot={{ r: 6 }}
              name={priorLabel}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
