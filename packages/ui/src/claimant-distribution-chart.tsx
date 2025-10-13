'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

export interface ClaimantBucket {
  name: string;
  value: number;
  count: number;
  color: string;
  [key: string]: string | number;
}

export interface ClaimantDistributionChartProps {
  data: ClaimantBucket[];
  title?: string;
}

/**
 * Claimant Distribution Pie Chart Component
 *
 * Pie chart showing distribution of claimants across buckets:
 * - $200K+
 * - $100-200K
 * - Other
 */
export function ClaimantDistributionChart({
  data,
  title = 'Claimant Distribution'
}: ClaimantDistributionChartProps) {
  // Custom label for pie slices
  const renderLabel = (entry: any) => {
    const percentage = ((entry.value / entry.payload.total) * 100).toFixed(1);
    return `${entry.name} (${percentage}%)`;
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-base-900 border border-slate-700 rounded-card p-3 shadow-lg">
          <p className="text-sm font-semibold text-slate-300 mb-2">{data.name}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-400">Amount:</span>
              <span className="font-semibold text-text-dark">
                ${data.value.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="text-slate-400">Claimants:</span>
              <span className="font-semibold text-text-dark">
                {data.count}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-col gap-2 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-slate-400">{entry.value}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-slate-500">{entry.payload.count} claimants</span>
              <span className="font-semibold text-text-dark">
                ${entry.payload.value.toLocaleString()}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full">
      {title && <h4 className="text-sm font-semibold text-slate-300 mb-4">{title}</h4>}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="40%"
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
