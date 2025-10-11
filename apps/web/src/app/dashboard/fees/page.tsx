'use client';

import React, { useState } from 'react';
import { Save, Plus, Trash2, Calculator, DollarSign, Settings as SettingsIcon, Info } from 'lucide-react';

/**
 * Fees Manager Page
 *
 * Three-tab interface:
 * 1. Admin Fees - Configure PEPM/PMPM/Flat fee components with live preview
 * 2. Adjustments - Manage C&E adjustments (#6 UC Settlement, #9 Rx Rebates, #11 Stop-Loss Reimb)
 * 3. Settings - Documentation and configuration
 */

type FeeType = 'PEPM' | 'PMPM' | 'FLAT';
type TabType = 'admin' | 'adjustments' | 'settings';

interface AdminFeeComponent {
  id: string;
  label: string;
  feeType: FeeType;
  amount: number;
  isActive: boolean;
}

interface AdjustmentEntry {
  id: string;
  itemNumber: number;
  itemName: string;
  monthDate: string;
  amount: number;
  notes: string;
}

const monthColumns = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

export default function FeesManagerPage() {
  const [activeTab, setActiveTab] = useState<TabType>('admin');

  // Admin Fees State
  const [adminFees, setAdminFees] = useState<AdminFeeComponent[]>([
    { id: '1', label: 'ASO Fee', feeType: 'PEPM', amount: 40.00, isActive: true },
    { id: '2', label: 'External Stop Loss Coordination Fee', feeType: 'PEPM', amount: 3.00, isActive: true },
    { id: '3', label: 'Rx Carve Out Fee', feeType: 'PEPM', amount: 2.00, isActive: true },
    { id: '4', label: 'Other Fee #1', feeType: 'PEPM', amount: 0.53, isActive: true },
    { id: '5', label: 'Other Fee #2', feeType: 'PEPM', amount: 0.30, isActive: true }
  ]);

  // Adjustments State - Sample data for #6, #9, #11
  const [adjustments, setAdjustments] = useState<AdjustmentEntry[]>([
    { id: 'a1', itemNumber: 6, itemName: 'UC Settlement', monthDate: '2025-06', amount: 0, notes: '' },
    { id: 'a2', itemNumber: 9, itemName: 'Rx Rebates', monthDate: '2025-06', amount: -37000, notes: 'Estimated based on Q2 utilization' },
    { id: 'a3', itemNumber: 11, itemName: 'Stop Loss Reimbursement', monthDate: '2025-06', amount: -40000, notes: 'June ISL reimbursement received' }
  ]);

  // Sample enrollment for PEPM/PMPM preview
  const [sampleEE, setSampleEE] = useState(450);
  const [sampleMembers, setSampleMembers] = useState(1100);

  const totalPepmFees = adminFees
    .filter(f => f.isActive && f.feeType === 'PEPM')
    .reduce((sum, f) => sum + f.amount, 0);

  const totalPmpmFees = adminFees
    .filter(f => f.isActive && f.feeType === 'PMPM')
    .reduce((sum, f) => sum + f.amount, 0);

  const totalFlatFees = adminFees
    .filter(f => f.isActive && f.feeType === 'FLAT')
    .reduce((sum, f) => sum + f.amount, 0);

  const monthlyAdminTotal = (totalPepmFees * sampleEE) + (totalPmpmFees * sampleMembers) + totalFlatFees;

  const addAdminFee = () => {
    const newFee: AdminFeeComponent = {
      id: `fee-${Date.now()}`,
      label: 'New Fee Component',
      feeType: 'PEPM',
      amount: 0,
      isActive: true
    };
    setAdminFees([...adminFees, newFee]);
  };

  const updateAdminFee = (id: string, updates: Partial<AdminFeeComponent>) => {
    setAdminFees(adminFees.map(fee => fee.id === id ? { ...fee, ...updates } : fee));
  };

  const deleteAdminFee = (id: string) => {
    setAdminFees(adminFees.filter(fee => fee.id !== id));
  };

  const addAdjustment = (itemNumber: number, itemName: string) => {
    const newAdj: AdjustmentEntry = {
      id: `adj-${Date.now()}`,
      itemNumber,
      itemName,
      monthDate: '2025-06',
      amount: 0,
      notes: ''
    };
    setAdjustments([...adjustments, newAdj]);
  };

  const updateAdjustment = (id: string, updates: Partial<AdjustmentEntry>) => {
    setAdjustments(adjustments.map(adj => adj.id === id ? { ...adj, ...updates } : adj));
  };

  const deleteAdjustment = (id: string) => {
    setAdjustments(adjustments.filter(adj => adj.id !== id));
  };

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fees Manager</h1>
          <p className="text-slate-400 mt-2">Configure admin fees and C&E adjustments</p>
        </div>
        <button className="px-4 py-2 bg-accent-primary text-base-950 rounded-card font-medium hover:bg-emerald-400 transition-uber inline-flex items-center gap-2">
          <Save className="w-4 h-4" />
          Save All Changes
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab('admin')}
          className={`px-4 py-3 font-medium transition-uber relative ${
            activeTab === 'admin'
              ? 'text-accent-primary'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Admin Fees
          </div>
          {activeTab === 'admin' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('adjustments')}
          className={`px-4 py-3 font-medium transition-uber relative ${
            activeTab === 'adjustments'
              ? 'text-accent-primary'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            C&E Adjustments
          </div>
          {activeTab === 'adjustments' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-3 font-medium transition-uber relative ${
            activeTab === 'settings'
              ? 'text-accent-primary'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <SettingsIcon className="w-4 h-4" />
            Settings
          </div>
          {activeTab === 'settings' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-primary" />
          )}
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'admin' && (
        <div className="space-y-6">
          {/* Live Preview */}
          <div className="report-card bg-accent-primary/5 border-accent-primary/20">
            <h3 className="text-lg font-semibold mb-4">Live Preview - Monthly Admin Fees</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Sample EE Count</label>
                <input
                  type="number"
                  value={sampleEE}
                  onChange={(e) => setSampleEE(parseInt(e.target.value) || 0)}
                  className="w-full bg-base-950 border border-slate-700 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">Sample Member Count</label>
                <input
                  type="number"
                  value={sampleMembers}
                  onChange={(e) => setSampleMembers(parseInt(e.target.value) || 0)}
                  className="w-full bg-base-950 border border-slate-700 rounded px-3 py-2"
                />
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="kpi-pill">
                <div className="text-xs text-slate-400 mb-1">PEPM Fees</div>
                <div className="text-2xl font-bold">${totalPepmFees.toFixed(2)}</div>
                <div className="text-xs text-slate-500 mt-1">× {sampleEE} EE</div>
              </div>
              <div className="kpi-pill">
                <div className="text-xs text-slate-400 mb-1">PMPM Fees</div>
                <div className="text-2xl font-bold">${totalPmpmFees.toFixed(2)}</div>
                <div className="text-xs text-slate-500 mt-1">× {sampleMembers} Members</div>
              </div>
              <div className="kpi-pill">
                <div className="text-xs text-slate-400 mb-1">Flat Fees</div>
                <div className="text-2xl font-bold">${totalFlatFees.toFixed(2)}</div>
                <div className="text-xs text-slate-500 mt-1">Fixed monthly</div>
              </div>
              <div className="kpi-pill bg-accent-primary/10 border-accent-primary/30">
                <div className="text-xs text-accent-primary mb-1">Monthly Total</div>
                <div className="text-2xl font-bold text-accent-primary">${monthlyAdminTotal.toLocaleString()}</div>
                <div className="text-xs text-slate-500 mt-1">Estimated</div>
              </div>
            </div>
          </div>

          {/* Admin Fee Components Table */}
          <div className="report-card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Admin Fee Components</h3>
              <button
                onClick={addAdminFee}
                className="px-3 py-1 bg-base-950 border border-slate-700 rounded-card text-sm hover:bg-base-800 transition-uber inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Fee Component
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-12">Active</th>
                    <th>Fee Component</th>
                    <th>Type</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Monthly Impact</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {adminFees.map(fee => {
                    const impact = fee.isActive
                      ? fee.feeType === 'PEPM'
                        ? fee.amount * sampleEE
                        : fee.feeType === 'PMPM'
                        ? fee.amount * sampleMembers
                        : fee.amount
                      : 0;

                    return (
                      <tr key={fee.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={fee.isActive}
                            onChange={(e) => updateAdminFee(fee.id, { isActive: e.target.checked })}
                            className="w-4 h-4 text-accent-primary rounded"
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={fee.label}
                            onChange={(e) => updateAdminFee(fee.id, { label: e.target.value })}
                            className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-accent-primary rounded px-2 py-1"
                          />
                        </td>
                        <td>
                          <select
                            value={fee.feeType}
                            onChange={(e) => updateAdminFee(fee.id, { feeType: e.target.value as FeeType })}
                            className="bg-base-950 border border-slate-700 rounded px-2 py-1 text-sm"
                          >
                            <option value="PEPM">PEPM</option>
                            <option value="PMPM">PMPM</option>
                            <option value="FLAT">FLAT</option>
                          </select>
                        </td>
                        <td className="text-right">
                          <div className="relative inline-block">
                            <span className="absolute left-2 top-1.5 text-slate-400">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={fee.amount}
                              onChange={(e) => updateAdminFee(fee.id, { amount: parseFloat(e.target.value) || 0 })}
                              className="w-24 bg-base-950 border border-slate-700 rounded px-2 py-1 pl-6 text-right"
                            />
                          </div>
                        </td>
                        <td className="text-right font-semibold">
                          {fee.isActive ? `$${impact.toLocaleString()}` : '-'}
                        </td>
                        <td>
                          <button
                            onClick={() => deleteAdminFee(fee.id)}
                            className="p-1 hover:bg-base-800 rounded transition-uber"
                          >
                            <Trash2 className="w-4 h-4 text-slate-500 hover:text-accent-danger" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-accent-primary bg-base-800">
                    <td colSpan={4} className="font-bold">Total Monthly Admin Fees</td>
                    <td className="text-right font-bold">${monthlyAdminTotal.toLocaleString()}</td>
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
        </div>
      )}

      {activeTab === 'adjustments' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="report-card bg-accent-info/5 border-accent-info/20">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-accent-info mt-0.5" />
              <div>
                <h4 className="font-semibold text-accent-info mb-1">C&E Adjustment Items</h4>
                <p className="text-sm text-slate-300">
                  These adjustments flow into the 28-row C&E Summary. Item #6 (UC Settlement), #9 (Rx Rebates),
                  and #11 (Stop-Loss Reimbursement) are user-adjustable and appear with yellow highlighting in the summary.
                </p>
              </div>
            </div>
          </div>

          {/* UC Settlement (#6) */}
          <div className="report-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Item #6 - UC Settlement</h3>
                <p className="text-sm text-slate-400 mt-1">Usual & Customary settlement adjustments</p>
              </div>
              <button
                onClick={() => addAdjustment(6, 'UC Settlement')}
                className="px-3 py-1 bg-base-950 border border-slate-700 rounded-card text-sm hover:bg-base-800 transition-uber inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="text-right">Amount</th>
                    <th>Notes</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.filter(a => a.itemNumber === 6).map(adj => (
                    <tr key={adj.id}>
                      <td>
                        <input
                          type="month"
                          value={adj.monthDate}
                          onChange={(e) => updateAdjustment(adj.id, { monthDate: e.target.value })}
                          className="bg-base-950 border border-slate-700 rounded px-2 py-1"
                        />
                      </td>
                      <td className="text-right">
                        <div className="relative inline-block">
                          <span className="absolute left-2 top-1.5 text-slate-400">$</span>
                          <input
                            type="number"
                            value={adj.amount}
                            onChange={(e) => updateAdjustment(adj.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="w-32 bg-base-950 border border-slate-700 rounded px-2 py-1 pl-6 text-right"
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={adj.notes}
                          onChange={(e) => updateAdjustment(adj.id, { notes: e.target.value })}
                          placeholder="Add notes..."
                          className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-accent-primary rounded px-2 py-1"
                        />
                      </td>
                      <td>
                        <button
                          onClick={() => deleteAdjustment(adj.id)}
                          className="p-1 hover:bg-base-800 rounded transition-uber"
                        >
                          <Trash2 className="w-4 h-4 text-slate-500 hover:text-accent-danger" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {adjustments.filter(a => a.itemNumber === 6).length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-slate-500 py-4">
                        No UC Settlement adjustments. Click "Add Entry" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Rx Rebates (#9) */}
          <div className="report-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Item #9 - Rx Rebates</h3>
                <p className="text-sm text-slate-400 mt-1">Earned pharmacy rebates (typically negative values)</p>
              </div>
              <button
                onClick={() => addAdjustment(9, 'Rx Rebates')}
                className="px-3 py-1 bg-base-950 border border-slate-700 rounded-card text-sm hover:bg-base-800 transition-uber inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="text-right">Amount</th>
                    <th>Notes</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.filter(a => a.itemNumber === 9).map(adj => (
                    <tr key={adj.id} className={adj.amount < 0 ? 'ce-row-under-budget' : ''}>
                      <td>
                        <input
                          type="month"
                          value={adj.monthDate}
                          onChange={(e) => updateAdjustment(adj.id, { monthDate: e.target.value })}
                          className="bg-base-950 border border-slate-700 rounded px-2 py-1"
                        />
                      </td>
                      <td className="text-right">
                        <div className="relative inline-block">
                          <span className="absolute left-2 top-1.5 text-slate-400">$</span>
                          <input
                            type="number"
                            value={adj.amount}
                            onChange={(e) => updateAdjustment(adj.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="w-32 bg-base-950 border border-slate-700 rounded px-2 py-1 pl-6 text-right"
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={adj.notes}
                          onChange={(e) => updateAdjustment(adj.id, { notes: e.target.value })}
                          placeholder="Add notes..."
                          className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-accent-primary rounded px-2 py-1"
                        />
                      </td>
                      <td>
                        <button
                          onClick={() => deleteAdjustment(adj.id)}
                          className="p-1 hover:bg-base-800 rounded transition-uber"
                        >
                          <Trash2 className="w-4 h-4 text-slate-500 hover:text-accent-danger" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Stop Loss Reimbursement (#11) */}
          <div className="report-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Item #11 - Stop Loss Reimbursement</h3>
                <p className="text-sm text-slate-400 mt-1">Individual Stop Loss reimbursements (typically negative values)</p>
              </div>
              <button
                onClick={() => addAdjustment(11, 'Stop Loss Reimbursement')}
                className="px-3 py-1 bg-base-950 border border-slate-700 rounded-card text-sm hover:bg-base-800 transition-uber inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Entry
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th className="text-right">Amount</th>
                    <th>Notes</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.filter(a => a.itemNumber === 11).map(adj => (
                    <tr key={adj.id} className={adj.amount < 0 ? 'ce-row-under-budget' : ''}>
                      <td>
                        <input
                          type="month"
                          value={adj.monthDate}
                          onChange={(e) => updateAdjustment(adj.id, { monthDate: e.target.value })}
                          className="bg-base-950 border border-slate-700 rounded px-2 py-1"
                        />
                      </td>
                      <td className="text-right">
                        <div className="relative inline-block">
                          <span className="absolute left-2 top-1.5 text-slate-400">$</span>
                          <input
                            type="number"
                            value={adj.amount}
                            onChange={(e) => updateAdjustment(adj.id, { amount: parseFloat(e.target.value) || 0 })}
                            className="w-32 bg-base-950 border border-slate-700 rounded px-2 py-1 pl-6 text-right"
                          />
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={adj.notes}
                          onChange={(e) => updateAdjustment(adj.id, { notes: e.target.value })}
                          placeholder="Add notes..."
                          className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-accent-primary rounded px-2 py-1"
                        />
                      </td>
                      <td>
                        <button
                          onClick={() => deleteAdjustment(adj.id)}
                          className="p-1 hover:bg-base-800 rounded transition-uber"
                        >
                          <Trash2 className="w-4 h-4 text-slate-500 hover:text-accent-danger" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Fee Calculation Documentation */}
          <div className="report-card">
            <h3 className="text-lg font-semibold mb-4">Fee Calculation Methods</h3>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold text-accent-primary mb-2">PEPM (Per Employee Per Month)</h4>
                <p className="text-slate-300">
                  Multiplied by the number of enrolled employees (EE count) for the month.
                </p>
                <code className="block mt-2 p-3 bg-base-950 rounded text-xs">
                  Monthly Fee = PEPM Rate × EE Count
                </code>
              </div>

              <div>
                <h4 className="font-semibold text-accent-info mb-2">PMPM (Per Member Per Month)</h4>
                <p className="text-slate-300">
                  Multiplied by the total number of covered members (subscribers + dependents) for the month.
                </p>
                <code className="block mt-2 p-3 bg-base-950 rounded text-xs">
                  Monthly Fee = PMPM Rate × Member Count
                </code>
              </div>

              <div>
                <h4 className="font-semibold text-amber-500 mb-2">FLAT (Fixed Monthly)</h4>
                <p className="text-slate-300">
                  Fixed dollar amount charged monthly, regardless of enrollment.
                </p>
                <code className="block mt-2 p-3 bg-base-950 rounded text-xs">
                  Monthly Fee = Fixed Amount
                </code>
              </div>
            </div>
          </div>

          {/* Adjustment Guidelines */}
          <div className="report-card">
            <h3 className="text-lg font-semibold mb-4">C&E Adjustment Guidelines</h3>
            <div className="space-y-4 text-sm">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded">
                <h4 className="font-semibold text-amber-500 mb-2">Item #6 - UC Settlement</h4>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  <li>Used for Usual & Customary settlement adjustments</li>
                  <li>Can be positive (additional cost) or negative (credit)</li>
                  <li>Flows into Medical section (#1-7) of C&E Summary</li>
                </ul>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded">
                <h4 className="font-semibold text-amber-500 mb-2">Item #9 - Rx Rebates</h4>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  <li>Earned pharmacy rebates from PBM</li>
                  <li>Typically negative values (credit to employer)</li>
                  <li>Estimated based on contractual terms and utilization</li>
                  <li>Flows into Pharmacy section (#8-9) of C&E Summary</li>
                </ul>
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded">
                <h4 className="font-semibold text-amber-500 mb-2">Item #11 - Stop Loss Reimbursement</h4>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  <li>ISL reimbursements received from stop-loss carrier</li>
                  <li>Typically negative values (reduces net cost)</li>
                  <li>Based on high claimants exceeding ISL threshold</li>
                  <li>Flows into Stop Loss section (#10-11) of C&E Summary</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Formula Integration */}
          <div className="report-card">
            <h3 className="text-lg font-semibold mb-4">C&E Formula Integration</h3>
            <p className="text-sm text-slate-300 mb-4">
              These adjustments are integrated into the 28-row C&E Summary calculations:
            </p>
            <code className="block p-4 bg-base-950 rounded text-xs space-y-1">
              <div className="text-slate-500">// Item #15 - Monthly C&E</div>
              <div>Monthly C&E = #7 (Adj Medical) + #8 (Total Rx) + #9 (Rx Rebates) + #10 (SL Fees) - #11 (SL Reimb) + #14 (Admin)</div>
              <div className="text-slate-500 mt-3">// Where:</div>
              <div>#7 = Total Adjusted All Medical (includes #6 UC Settlement)</div>
              <div>#9 = Rx Rebates (user-adjustable, typically negative)</div>
              <div>#11 = Stop Loss Reimbursement (user-adjustable, typically negative)</div>
            </code>
          </div>
        </div>
      )}
    </div>
  );
}
