'use client';

import { useState } from 'react';
import { Save, Plus, Trash2 } from 'lucide-react';

/**
 * Inputs Configuration Page (Template PDF Pages 8-9)
 *
 * Sections:
 * - Premium Equivalents by Plan/Tier
 * - Admin Fee Components (PEPM/PMPM/Flat)
 * - Stop Loss Fees (ISL & ASL) by Tier
 * - Other Inputs (Rx Rebate PEPM, IBNR, Aggregate Factor, ASL Fee)
 * - Stop Loss Tracking Mode: "By Plan"
 */

const planTiers = [
  'Employee Only',
  'Employee + Spouse',
  'Employee + Child(ren)',
  'Family'
];

const plans = ['HDHP', 'PPO Base', 'PPO Buy-Up'];

export default function InputsPage() {
  const [trackingMode, setTrackingMode] = useState('BY_PLAN');

  // Sample premium equivalents from template
  const [premiumEquivalents] = useState({
    'HDHP': [586.35, 1315.95, 1143.71, 1896.28],
    'PPO Base': [583.54, 1308.27, 1144.25, 1887.20],
    'PPO Buy-Up': [656.88, 1472.73, 1281.31, 2123.74]
  });

  // Sample admin fees from template
  const [adminFees] = useState([
    { id: 1, label: 'ASO Fee', feeType: 'PEPM', amount: 40.00 },
    { id: 2, label: 'External Stop Loss Coordination Fee', feeType: 'PEPM', amount: 3.00 },
    { id: 3, label: 'Rx Carve Out Fee', feeType: 'PEPM', amount: 2.00 },
    { id: 4, label: 'Other Fee #1', feeType: 'PEPM', amount: 0.53 },
    { id: 5, label: 'Other Fee #2', feeType: 'PEPM', amount: 0.30 }
  ]);

  // Sample stop loss rates from template
  const [stopLossRates] = useState({
    'HDHP': [94.15, 179.98, 160.17, 266.50],
    'PPO Base': [94.15, 179.98, 160.17, 266.50],
    'PPO Buy-Up': [94.15, 179.98, 160.17, 266.50]
  });

  const [otherInputs, setOtherInputs] = useState({
    rxRebatePepm: 75.00,
    ibnrAdjustment: 0,
    aggregateFactor: 1.25,
    aslFee: 3.00,
    islLimit: 200000
  });

  const totalAdminFee = adminFees.reduce((sum, fee) => sum + fee.amount, 0);

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inputs Configuration</h1>
          <p className="text-slate-400 mt-2">
            Plan Year 2024 - Premium equivalents, fees, and stop loss settings
          </p>
        </div>
        <button className="px-4 py-2 bg-accent-primary text-base-950 rounded-card font-medium hover:bg-emerald-400 transition-uber inline-flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      {/* Stop Loss Tracking Mode */}
      <div className="report-card">
        <h3 className="text-lg font-semibold mb-4">Stop Loss Tracking</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tracking"
              value="BY_PLAN"
              checked={trackingMode === 'BY_PLAN'}
              onChange={(e) => setTrackingMode(e.target.value)}
              className="w-4 h-4 text-accent-primary"
            />
            <span>By Plan</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="tracking"
              value="AGGREGATE"
              checked={trackingMode === 'AGGREGATE'}
              onChange={(e) => setTrackingMode(e.target.value)}
              className="w-4 h-4 text-accent-primary"
            />
            <span>Aggregate</span>
          </label>
        </div>
      </div>

      {/* Premium Equivalents */}
      <div className="report-card">
        <h3 className="text-lg font-semibold mb-4">Plan Names & Premium Equivalents</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Plan Name / Tier</th>
                {plans.map(plan => (
                  <th key={plan} className="text-right">{plan}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planTiers.map((tier, idx) => (
                <tr key={tier}>
                  <td className="font-semibold">{tier}</td>
                  {plans.map(plan => (
                    <td key={plan} className="text-right">
                      <input
                        type="text"
                        value={`$${premiumEquivalents[plan as keyof typeof premiumEquivalents][idx].toFixed(2)}`}
                        className="w-28 bg-base-950 border border-slate-700 rounded px-2 py-1 text-right"
                        readOnly
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Fees */}
      <div className="report-card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Admin Fees</h3>
          <button className="px-3 py-1 bg-base-950 border border-slate-700 rounded-card text-sm hover:bg-base-800 transition-uber inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Fee
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fee Component</th>
                <th>Type</th>
                <th className="text-right">Amount</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {adminFees.map(fee => (
                <tr key={fee.id}>
                  <td>{fee.label}</td>
                  <td>
                    <span className="px-2 py-1 bg-accent-primary/10 text-accent-primary rounded text-xs font-medium">
                      {fee.feeType}
                    </span>
                  </td>
                  <td className="text-right font-semibold">${fee.amount.toFixed(2)}</td>
                  <td>
                    <button className="p-1 hover:bg-base-800 rounded transition-uber">
                      <Trash2 className="w-4 h-4 text-slate-500 hover:text-accent-danger" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-accent-primary bg-base-800">
                <td colSpan={2} className="font-bold">Total Admin Fee (PEPM)</td>
                <td className="text-right font-bold">${totalAdminFee.toFixed(2)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-4 text-xs text-slate-400">
          <div className="flex gap-6">
            <span><strong>PEPM:</strong> Per Employee Per Month</span>
            <span><strong>PMPM:</strong> Per Member Per Month</span>
            <span><strong>FLAT:</strong> Fixed monthly amount</span>
          </div>
        </div>
      </div>

      {/* Stop Loss Fees - Individual Stop Loss (ISL) */}
      <div className="report-card">
        <h3 className="text-lg font-semibold mb-4">
          Stop Loss Fees - Individual Stop Loss (ISL)
        </h3>
        <div className="mb-4">
          <label className="text-sm text-slate-400">ISL Limit</label>
          <input
            type="text"
            value={`$${otherInputs.islLimit.toLocaleString()}`}
            className="block mt-1 bg-base-950 border border-slate-700 rounded px-3 py-2"
            readOnly
          />
        </div>

        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>ISL - Tier</th>
                {plans.map(plan => (
                  <th key={plan} className="text-right">{plan}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planTiers.map((tier, idx) => (
                <tr key={tier}>
                  <td className="font-semibold">{tier}</td>
                  {plans.map(plan => (
                    <td key={plan} className="text-right">
                      <input
                        type="text"
                        value={`$${stopLossRates[plan as keyof typeof stopLossRates][idx].toFixed(2)}`}
                        className="w-28 bg-base-950 border border-slate-700 rounded px-2 py-1 text-right"
                        readOnly
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Other Inputs */}
      <div className="report-card">
        <h3 className="text-lg font-semibold mb-4">Other Inputs</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              PEPM Rebate Estimate
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                value={otherInputs.rxRebatePepm}
                onChange={(e) => setOtherInputs({ ...otherInputs, rxRebatePepm: parseFloat(e.target.value) })}
                className="w-full bg-base-950 border border-slate-700 rounded px-3 py-2 pl-7"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              IBNR Adjustment
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">$</span>
              <input
                type="number"
                value={otherInputs.ibnrAdjustment}
                onChange={(e) => setOtherInputs({ ...otherInputs, ibnrAdjustment: parseFloat(e.target.value) })}
                className="w-full bg-base-950 border border-slate-700 rounded px-3 py-2 pl-7"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Aggregate Factor
            </label>
            <input
              type="number"
              step="0.01"
              value={otherInputs.aggregateFactor}
              onChange={(e) => setOtherInputs({ ...otherInputs, aggregateFactor: parseFloat(e.target.value) })}
              className="w-full bg-base-950 border border-slate-700 rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              ASL Fee (PEPM)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-slate-400">$</span>
              <input
                type="number"
                step="0.01"
                value={otherInputs.aslFee}
                onChange={(e) => setOtherInputs({ ...otherInputs, aslFee: parseFloat(e.target.value) })}
                className="w-full bg-base-950 border border-slate-700 rounded px-3 py-2 pl-7"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="report-card">
        <h3 className="text-lg font-semibold mb-4">Notes</h3>
        <textarea
          className="w-full bg-base-950 border border-slate-700 rounded px-3 py-2 min-h-24"
          placeholder="Add notes about this plan year's configuration..."
          defaultValue="Golden seed data for acceptance testing"
        />
      </div>
    </div>
  );
}
