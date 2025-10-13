'use client';

import React, { useState } from 'react';
import { Download, Settings } from 'lucide-react';

/**
 * C&E 28-Row Summary Page
 *
 * Features:
 * - 28-row statement with monthly columns + Year Total
 * - Color coding: adjustments (yellow), totals (blue), over-budget (red), under-budget (green)
 * - User adjustments: UC Settlement (#6), Rx Rebates (#9), Stop-Loss Reimb (#11)
 * - KPI cards for key metrics
 * - Collapsible groups
 */

const monthColumns = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

const rowDefinitions = [
  // Medical
  { num: 1, label: 'Domestic Inpatient', group: 'Medical', type: 'data' },
  { num: 2, label: 'Domestic Outpatient', group: 'Medical', type: 'data' },
  { num: 3, label: 'Total Hospital', group: 'Medical', type: 'total', formula: '#1 + #2' },
  { num: 4, label: 'Non-Hospital Medical', group: 'Medical', type: 'data' },
  { num: 5, label: 'Total All Medical', group: 'Medical', type: 'total', formula: '#3 + #4' },
  { num: 6, label: 'UC Settlement', group: 'Medical', type: 'adjustment', adjustable: true },
  { num: 7, label: 'Total Adjusted All Medical', group: 'Medical', type: 'total', formula: '#5 + #6' },

  // Pharmacy
  { num: 8, label: 'Total Rx', group: 'Pharmacy', type: 'data' },
  { num: 9, label: 'Rx Rebates', group: 'Pharmacy', type: 'adjustment', adjustable: true },

  // Stop Loss
  { num: 10, label: 'Stop Loss Fees', group: 'Stop Loss', type: 'data', formula: 'Single + Family' },
  { num: 11, label: 'Stop Loss Reimbursement', group: 'Stop Loss', type: 'adjustment', adjustable: true },

  // Admin
  { num: 12, label: 'Consulting Fees', group: 'Admin', type: 'data' },
  { num: 13, label: 'Individual Fees', group: 'Admin', type: 'data' },
  { num: 14, label: 'Total Admin', group: 'Admin', type: 'total', formula: '#12 + #13' },

  // Totals
  { num: 15, label: 'MONTHLY C&E', group: 'Totals', type: 'total', formula: '#7 + #8 + #9 + #10 - #11 + #14' },
  { num: 16, label: 'CUMULATIVE C&E', group: 'Totals', type: 'total', formula: 'Running sum of #15' },

  // Enrollment
  { num: 17, label: 'EE Count', group: 'Enrollment', type: 'data' },
  { num: 18, label: 'Member Count', group: 'Enrollment', type: 'data' },

  // PEPM
  { num: 19, label: 'PEPM Actual Monthly', group: 'PEPM', type: 'total', formula: '#15 / #17' },
  { num: 20, label: 'PEPM Actual Cumulative', group: 'PEPM', type: 'total', formula: '#16 / Avg(EE YTD)' },
  { num: 21, label: 'PEPM Target', group: 'PEPM', type: 'data' },

  // Budget
  { num: 22, label: 'PEPM Budget', group: 'Budget', type: 'data' },
  { num: 23, label: 'Budget EE', group: 'Budget', type: 'data', formula: 'Same as #17' },
  { num: 24, label: 'Cumulative Budget', group: 'Budget', type: 'total', formula: 'Σ(#22 × EE)' },

  // Variance
  { num: 25, label: 'Monthly Variance', group: 'Variance', type: 'variance', formula: '#15 - (#22 × EE)' },
  { num: 26, label: 'Monthly Variance %', group: 'Variance', type: 'variance', formula: '#25 / (#22 × EE)' },
  { num: 27, label: 'Cumulative Variance', group: 'Variance', type: 'variance', formula: '#16 - #24' },
  { num: 28, label: 'Cumulative Variance %', group: 'Variance', type: 'variance', formula: '#27 / #24' }
];

export default function CESummaryPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(['Medical', 'Pharmacy', 'Stop Loss', 'Admin', 'Totals', 'Enrollment', 'PEPM', 'Budget', 'Variance'])
  );

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsExporting(false);
  };

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const getRowColorClass = (row: typeof rowDefinitions[0], value: number) => {
    if (row.adjustable || row.num === 6 || row.num === 9 || row.num === 11) return 'ce-row-adjustment';
    if (row.type === 'total') return 'ce-row-total';
    if (row.type === 'variance') {
      return value > 0 ? 'ce-row-over-budget' : 'ce-row-under-budget';
    }
    return '';
  };

  const groups = [...new Set(rowDefinitions.map(r => r.group))];

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">C&E Summary - 28-Row Statement</h1>
          <p className="text-slate-400 mt-2">Monthly and cumulative claims & expenses analysis</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-base-900 border border-slate-700 rounded-card font-medium hover:bg-base-800 transition-uber inline-flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Adjustments
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-accent-primary text-base-950 rounded-card font-medium hover:bg-emerald-400 transition-uber inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Export to CSV"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-base-950 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" aria-hidden="true" />
                Export CSV
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Monthly C&E (#15)</div>
          <div className="text-2xl font-bold">$456K</div>
          <div className="text-xs text-slate-500 mt-1">Dec 2024</div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">PEPM Actual (#19)</div>
          <div className="text-2xl font-bold">$991</div>
          <div className="text-xs text-slate-500 mt-1">vs $950 target</div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Budget Variance (#25)</div>
          <div className="text-2xl font-bold text-status-red">+$19K</div>
          <div className="text-xs text-slate-500 mt-1">4.3% over</div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Cumulative (#16)</div>
          <div className="text-2xl font-bold">$2.73M</div>
          <div className="text-xs text-slate-500 mt-1">YTD through Dec</div>
        </div>
      </div>

      {/* 28-Row Table */}
      <div className="report-card overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-base-900 z-10">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold border-b border-slate-700 sticky left-0 bg-base-900">#</th>
              <th className="px-4 py-3 text-left text-sm font-semibold border-b border-slate-700 sticky left-12 bg-base-900 min-w-[250px]">Item</th>
              {monthColumns.map(month => (
                <th key={month} className="px-4 py-3 text-right text-sm font-semibold border-b border-slate-700 min-w-[100px]">
                  {month}
                </th>
              ))}
              <th className="px-4 py-3 text-right text-sm font-semibold border-b border-slate-700 min-w-[120px]">
                Year Total
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const groupRows = rowDefinitions.filter(r => r.group === group);
              const isExpanded = expandedGroups.has(group);

              return (
                <React.Fragment key={group}>
                  {/* Group Header */}
                  <tr
                    className="cursor-pointer hover:bg-base-800 transition-uber"
                    onClick={() => toggleGroup(group)}
                  >
                    <td colSpan={2} className="px-4 py-2 font-bold text-accent-primary sticky left-0 bg-base-900">
                      {isExpanded ? '▼' : '▶'} {group}
                    </td>
                    <td colSpan={monthColumns.length + 1}></td>
                  </tr>

                  {/* Group Rows */}
                  {isExpanded && groupRows.map(row => (
                    <tr key={row.num} className={getRowColorClass(row, 0)}>
                      <td className="px-4 py-2 text-sm text-slate-400 sticky left-0 bg-inherit">
                        {row.num}
                      </td>
                      <td className="px-4 py-2 text-sm sticky left-12 bg-inherit">
                        <div className="flex items-center justify-between">
                          <span>{row.label}</span>
                          {row.adjustable && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded text-xs">
                              Adjustable
                            </span>
                          )}
                        </div>
                        {row.formula && (
                          <div className="text-xs text-slate-400 mt-0.5 font-mono">{row.formula}</div>
                        )}
                      </td>
                      {monthColumns.map((_, idx) => (
                        <td key={idx} className="px-4 py-2 text-right text-sm">
                          $123,456
                        </td>
                      ))}
                      <td className="px-4 py-2 text-right text-sm font-semibold">
                        $740,736
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Color Legend */}
      <div className="report-card">
        <h3 className="text-lg font-semibold mb-4">Color Legend</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded ce-row-adjustment" />
            <span>User Adjustments (#6, #9, #11)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded ce-row-total" />
            <span>Calculated Totals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded ce-row-over-budget" />
            <span>Over Budget</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded ce-row-under-budget" />
            <span>Under Budget</span>
          </div>
        </div>
      </div>
    </div>
  );
}
