'use client';

import { useState } from 'react';
import { Download, Sliders } from 'lucide-react';

/**
 * High-Cost Claimant Summary Page (Template PDF Page 4)
 *
 * Features:
 * - ISL threshold slider (default $200,000)
 * - Filter: Claimants ≥50% of ISL ($100,000)
 * - 8 claimants from template
 * - Employer vs Stop Loss bar chart
 */

const templateClaimants = [
  { id: 1, plan: 'HDHP', status: 'Active', diagnosis: 'Frito Feet', medical: 300000, rx: 20000, total: 320000, exceedingIsl: 120000 },
  { id: 2, plan: 'PPO Base', status: 'COBRA', diagnosis: 'Extreme Cuteness', medical: 250000, rx: 20000, total: 270000, exceedingIsl: 70000 },
  { id: 3, plan: 'PPO Buy-Up', status: 'Retired', diagnosis: 'No. 1 Good Boy Syndrome', medical: 175000, rx: 50000, total: 225000, exceedingIsl: 25000 },
  { id: 4, plan: 'HDHP', status: 'Terminated', diagnosis: 'Tappity Clack Syndrome', medical: 175000, rx: 50000, total: 225000, exceedingIsl: 25000 },
  { id: 5, plan: 'PPO Base', status: 'Active', diagnosis: 'Velvet Ears', medical: 150000, rx: 20000, total: 170000, exceedingIsl: 0 },
  { id: 6, plan: 'PPO Buy-Up', status: 'COBRA', diagnosis: 'Excessive Borking', medical: 150000, rx: 20000, total: 170000, exceedingIsl: 0 },
  { id: 7, plan: 'HDHP', status: 'Active', diagnosis: 'Zoomies', medical: 75000, rx: 75000, total: 150000, exceedingIsl: 0 },
  { id: 8, plan: 'PPO Base', status: 'Retired', diagnosis: 'Excessive Drooling', medical: 70000, rx: 30000, total: 100000, exceedingIsl: 0 }
];

export default function HighCostClaimantPage() {
  const [islThreshold, setIslThreshold] = useState(200000);

  const qualifyingThreshold = islThreshold * 0.5;
  const qualifyingClaimants = templateClaimants.filter(c => c.total >= qualifyingThreshold);

  const totalMedical = qualifyingClaimants.reduce((sum, c) => sum + c.medical, 0);
  const totalRx = qualifyingClaimants.reduce((sum, c) => sum + c.rx, 0);
  const totalClaims = qualifyingClaimants.reduce((sum, c) => sum + c.total, 0);
  const totalExceedingIsl = qualifyingClaimants.reduce((sum, c) => sum + c.exceedingIsl, 0);

  // Employer pays up to ISL, Stop Loss covers excess
  const employerResponsibility = totalClaims - totalExceedingIsl;
  const stopLossShare = totalExceedingIsl;
  const employerPercent = totalClaims > 0 ? (employerResponsibility / totalClaims) * 100 : 0;
  const stopLossPercent = totalClaims > 0 ? (stopLossShare / totalClaims) * 100 : 0;

  // Calculate % of total claims
  const medicalPct = totalClaims > 0 ? (totalMedical / 4499969 * 100).toFixed(1) : '0.0';
  const rxPct = totalClaims > 0 ? (totalRx / 678522 * 100).toFixed(1) : '0.0';
  const totalPct = totalClaims > 0 ? (totalClaims / 5178492 * 100).toFixed(1) : '0.0';

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">High Cost Claimant Summary</h1>
          <p className="text-slate-400 mt-2">
            Plan Year to Date - Data through June 2025<br/>
            Claimants in Excess of 50% of Individual Stop Loss (ISL) Limit (${(qualifyingThreshold).toLocaleString()})
          </p>
        </div>
        <button className="px-4 py-2 bg-accent-primary text-base-950 rounded-card font-medium hover:bg-emerald-400 transition-uber inline-flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* ISL Controls */}
      <div className="report-card">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Individual Stop Loss (ISL) Limit</h3>
            <p className="text-sm text-slate-400 mt-1">Aggregating Specific Deductible: n/a</p>
          </div>
          <div className="flex items-center gap-4">
            <Sliders className="w-5 h-5 text-slate-400" />
            <span className="text-2xl font-bold text-accent-primary">${islThreshold.toLocaleString()}</span>
          </div>
        </div>

        <input
          type="range"
          min="100000"
          max="500000"
          step="25000"
          value={islThreshold}
          onChange={(e) => setIslThreshold(Number(e.target.value))}
          className="w-full h-2 bg-base-950 rounded-full appearance-none cursor-pointer accent-accent-primary"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-2">
          <span>$100K</span>
          <span>$300K</span>
          <span>$500K</span>
        </div>
      </div>

      {/* Claimants Table */}
      <div className="report-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Claimant #</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Primary Diagnosis</th>
              <th className="text-right">Medical Claims</th>
              <th className="text-right">Rx Claims</th>
              <th className="text-right">Total Claims</th>
              <th className="text-right">Exceeding ISL</th>
            </tr>
          </thead>
          <tbody>
            {qualifyingClaimants.map((claimant) => (
              <tr key={claimant.id}>
                <td className="font-semibold">{claimant.id}</td>
                <td>{claimant.plan}</td>
                <td>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    claimant.status === 'Active' ? 'bg-status-green/10 text-status-green' :
                    claimant.status === 'COBRA' ? 'bg-accent-warning/10 text-accent-warning' :
                    claimant.status === 'Retired' ? 'bg-accent-info/10 text-accent-info' :
                    'bg-slate-700 text-slate-300'
                  }`}>
                    {claimant.status}
                  </span>
                </td>
                <td>{claimant.diagnosis}</td>
                <td className="text-right">${claimant.medical.toLocaleString()}</td>
                <td className="text-right">${claimant.rx.toLocaleString()}</td>
                <td className="text-right font-semibold">${claimant.total.toLocaleString()}</td>
                <td className={`text-right font-semibold ${claimant.exceedingIsl > 0 ? 'text-accent-danger' : 'text-slate-500'}`}>
                  {claimant.exceedingIsl > 0 ? `$${claimant.exceedingIsl.toLocaleString()}` : '$0'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-accent-primary bg-base-800">
              <td colSpan={4} className="font-bold">
                Total Claimants in Excess of 50% of Individual Stop Loss (ISL) Limit (${qualifyingThreshold.toLocaleString()})
              </td>
              <td className="text-right font-bold">${totalMedical.toLocaleString()}</td>
              <td className="text-right font-bold">${totalRx.toLocaleString()}</td>
              <td className="text-right font-bold">${totalClaims.toLocaleString()}</td>
              <td className="text-right font-bold text-accent-danger">${totalExceedingIsl.toLocaleString()}</td>
            </tr>
            <tr className="bg-base-800">
              <td colSpan={4} className="font-bold">High Cost Claimants as a % of Total Claims</td>
              <td className="text-right font-bold">{medicalPct}%</td>
              <td className="text-right font-bold">{rxPct}%</td>
              <td className="text-right font-bold">{totalPct}%</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Employer vs Stop Loss Visualization */}
      <div className="report-card">
        <h3 className="text-lg font-semibold mb-6">High Claimant Dollars: Employer Responsibility vs. Stop Loss</h3>

        {/* Bar Chart */}
        <div className="relative h-32 bg-base-950 rounded-card overflow-hidden">
          <div className="absolute inset-0 flex">
            {/* Employer Responsibility */}
            <div
              className="bg-gradient-to-r from-purple-600 to-purple-500 flex items-center justify-center text-white font-semibold"
              style={{ width: `${employerPercent}%` }}
            >
              {employerPercent > 20 && (
                <div className="text-center">
                  <div className="text-sm">Employer Responsibility</div>
                  <div className="text-lg">${employerResponsibility.toLocaleString()}</div>
                </div>
              )}
            </div>

            {/* Stop Loss */}
            <div
              className="bg-gradient-to-r from-sky-600 to-sky-500 flex items-center justify-center text-white font-semibold"
              style={{ width: `${stopLossPercent}%` }}
            >
              {stopLossPercent > 10 && (
                <div className="text-center">
                  <div className="text-sm">Stop Loss</div>
                  <div className="text-lg">${stopLossShare.toLocaleString()}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Percentage Scale */}
        <div className="flex justify-between text-xs text-slate-400 mt-2">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>

        {/* Legend */}
        <div className="flex gap-6 mt-6 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded" />
            <span className="text-sm">Employer Responsibility ({employerPercent.toFixed(1)}%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-sky-500 rounded" />
            <span className="text-sm">Stop Loss ({stopLossPercent.toFixed(1)}%)</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Total Claimants</div>
          <div className="text-2xl font-bold">{qualifyingClaimants.length}</div>
          <div className="text-xs text-slate-500 mt-1">≥50% of ISL</div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Total Claims</div>
          <div className="text-2xl font-bold">${(totalClaims / 1000000).toFixed(2)}M</div>
          <div className="text-xs text-slate-500 mt-1">{totalPct}% of all claims</div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Stop Loss Recognized</div>
          <div className="text-2xl font-bold text-accent-info">${(stopLossShare / 1000).toFixed(0)}K</div>
          <div className="text-xs text-slate-500 mt-1">YTD reimbursement</div>
        </div>
      </div>
    </div>
  );
}
