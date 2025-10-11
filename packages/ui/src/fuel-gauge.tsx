'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export type FuelGaugeStatus = 'GREEN' | 'YELLOW' | 'RED';

export interface FuelGaugeProps {
  percentOfBudget: number;
  status: FuelGaugeStatus;
  size?: number;
  showLabel?: boolean;
}

/**
 * Fuel Gauge Chart Component
 *
 * Semi-circular gauge showing % of Budget with color thresholds:
 * - Green: <95%
 * - Yellow: 95-105%
 * - Red: >105%
 */
export function FuelGauge({
  percentOfBudget,
  status,
  size = 200,
  showLabel = true
}: FuelGaugeProps) {
  // Clamp value between 0 and 150% for display
  const displayValue = Math.min(Math.max(percentOfBudget * 100, 0), 150);

  // Create gauge data (semi-circle)
  const gaugeData = [
    { name: 'filled', value: displayValue },
    { name: 'empty', value: 150 - displayValue }
  ];

  // Color mapping
  const statusColors = {
    GREEN: '#22c55e',
    YELLOW: '#eab308',
    RED: '#ef4444'
  };

  const fillColor = statusColors[status];
  const emptyColor = '#1e293b';

  // Needle angle calculation (180 degrees = 0%, 0 degrees = 150%)
  const needleAngle = 180 - (displayValue / 150) * 180;

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* Gauge Chart */}
      <ResponsiveContainer width={size} height={size * 0.6}>
        <PieChart>
          <Pie
            data={gaugeData}
            cx="50%"
            cy="80%"
            startAngle={180}
            endAngle={0}
            innerRadius="70%"
            outerRadius="100%"
            paddingAngle={0}
            dataKey="value"
          >
            <Cell fill={fillColor} />
            <Cell fill={emptyColor} />
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Needle */}
      <div
        className="absolute top-1/2 left-1/2 w-1 bg-slate-100 origin-bottom"
        style={{
          height: `${size * 0.4}px`,
          transform: `translate(-50%, -100%) rotate(${needleAngle}deg)`,
          transformOrigin: 'bottom center'
        }}
      >
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-slate-100 border-2 border-base-950" />
      </div>

      {/* Center Display */}
      <div
        className="absolute flex flex-col items-center justify-center"
        style={{
          top: `${size * 0.35}px`,
          left: '50%',
          transform: 'translateX(-50%)'
        }}
      >
        <div className="text-3xl font-bold" style={{ color: fillColor }}>
          {(percentOfBudget * 100).toFixed(1)}%
        </div>
        {showLabel && (
          <div className="text-xs text-slate-400 mt-1">of Budget</div>
        )}
      </div>

      {/* Threshold Markers */}
      <div className="absolute bottom-0 w-full flex justify-between px-4 text-xs text-slate-500">
        <span>0%</span>
        <span className="text-status-yellow">95%</span>
        <span className="text-status-red">105%</span>
        <span>150%</span>
      </div>

      {/* Status Label */}
      {showLabel && (
        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-base-900 border border-slate-700">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: fillColor }}
          />
          <span className="text-sm font-medium text-slate-300">
            {status === 'GREEN' && 'Under Budget'}
            {status === 'YELLOW' && 'Near Budget'}
            {status === 'RED' && 'Over Budget'}
          </span>
        </div>
      )}
    </div>
  );
}
