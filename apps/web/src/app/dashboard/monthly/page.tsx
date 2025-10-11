import { Download } from 'lucide-react';

/**
 * Monthly Detail Page - All Plans (Template PDF Page 3)
 *
 * Features:
 * - A-N columns with formulas (matching template exactly)
 * - Rolling 24 months of data
 * - PEPM charts for Medical and Rx
 * - Footnote about estimated Rx rebates
 */

// Sample data from template
const monthlyData = [
  {
    month: '7/1/2024',
    totalSubs: 483,
    medical: 261827,
    rx: 59708,
    gross: 321535,
    stopLossReimb: 0,
    rxRebates: -36225,
    net: 285310,
    admin: 22136,
    stopLoss: 69101,
    totalCost: 376547,
    budget: 471493,
    surplus: 94946,
    pctBudget: 0.799
  },
  {
    month: '8/1/2024',
    totalSubs: 481,
    medical: 173841,
    rx: 49520,
    gross: 223360,
    stopLossReimb: 0,
    rxRebates: -36075,
    net: 187285,
    admin: 22044,
    stopLoss: 69079,
    totalCost: 278409,
    budget: 471930,
    surplus: 193521,
    pctBudget: 0.590
  },
  // ... more months
];

const currentPepm = {
  medical: 797,
  rx: 120,
  change: { medical: 0.05, rx: 0.25 }
};

export default function MonthlyDetailPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monthly Detail - All Plans</h1>
          <p className="text-slate-400 mt-2">Rolling 24 Months - Claims Paid through June 2025</p>
        </div>
        <button className="px-4 py-2 bg-accent-primary text-base-950 rounded-card font-medium hover:bg-emerald-400 transition-uber inline-flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* A-N Table */}
      <div className="report-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sticky left-0 bg-base-900 z-10">A<br/>Month</th>
              <th>B<br/>Total<br/>Subscribers</th>
              <th>C<br/>Medical<br/>Claims</th>
              <th>D<br/>Pharmacy<br/>Claims</th>
              <th>E<br/>Gross M&P<br/>(C + D)</th>
              <th>F<br/>Spec Stop<br/>Loss Reimb</th>
              <th>G<br/>Est Earned<br/>Rx Rebates*</th>
              <th>H<br/>Net M&P<br/>(E + F + G)</th>
              <th>I<br/>Admin<br/>Fees</th>
              <th>J<br/>Stop Loss<br/>Fees</th>
              <th>K<br/>Total Cost<br/>(H + I + J)</th>
              <th>L<br/>Budgeted<br/>Premium</th>
              <th>M<br/>Surplus/<br/>(Deficit)<br/>(L - K)</th>
              <th>N<br/>% of<br/>Budget<br/>(K / L)</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((row, idx) => (
              <tr key={idx}>
                <td className="sticky left-0 bg-base-950 font-semibold">{row.month}</td>
                <td className="text-right">{row.totalSubs.toLocaleString()}</td>
                <td className="text-right">${row.medical.toLocaleString()}</td>
                <td className="text-right">${row.rx.toLocaleString()}</td>
                <td className="text-right font-semibold">${row.gross.toLocaleString()}</td>
                <td className="text-right text-accent-primary">${row.stopLossReimb.toLocaleString()}</td>
                <td className="text-right text-accent-primary">(${Math.abs(row.rxRebates).toLocaleString()})</td>
                <td className="text-right font-semibold">${row.net.toLocaleString()}</td>
                <td className="text-right">${row.admin.toLocaleString()}</td>
                <td className="text-right">${row.stopLoss.toLocaleString()}</td>
                <td className="text-right font-bold">${row.totalCost.toLocaleString()}</td>
                <td className="text-right">${row.budget.toLocaleString()}</td>
                <td className={`text-right font-semibold ${row.surplus >= 0 ? 'text-status-green' : 'text-status-red'}`}>
                  {row.surplus >= 0 ? '$' : '($'}{Math.abs(row.surplus).toLocaleString()}{row.surplus < 0 ? ')' : ''}
                </td>
                <td className={`text-right ${row.pctBudget > 1 ? 'text-status-red' : 'text-status-green'}`}>
                  {(row.pctBudget * 100).toFixed(1)}%
                </td>
              </tr>
            ))}

            {/* Current PY Summary */}
            <tr className="border-t-2 border-accent-primary bg-base-800">
              <td className="sticky left-0 bg-base-800 font-bold">Current PY</td>
              <td className="text-right font-bold">5,649</td>
              <td className="text-right font-bold">$4,499,969</td>
              <td className="text-right font-bold">$678,522</td>
              <td className="text-right font-bold">$5,178,492</td>
              <td className="text-right font-bold">($563,512)</td>
              <td className="text-right font-bold">($423,675)</td>
              <td className="text-right font-bold">$4,191,305</td>
              <td className="text-right font-bold">$258,894</td>
              <td className="text-right font-bold">$817,983</td>
              <td className="text-right font-bold">$5,268,182</td>
              <td className="text-right font-bold">$5,585,653</td>
              <td className="text-right font-bold text-status-green">$317,471</td>
              <td className="text-right font-bold text-status-green">94.3%</td>
            </tr>
          </tbody>
        </table>

        {/* Footnote */}
        <div className="mt-4 text-xs text-slate-400 italic">
          * Earned Pharmacy Rebates are estimated based on contractual terms and group utilization; actual rebates may vary.
        </div>
      </div>

      {/* PEPM Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medical PEPM */}
        <div className="report-card">
          <h3 className="text-lg font-semibold mb-4">PEPM Medical Claims</h3>
          <div className="h-64 bg-base-950 rounded-card border border-slate-700 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-primary">${currentPepm.medical}</div>
              <div className="text-sm text-slate-400 mt-2">Current 12 PEPM</div>
              <div className="text-sm text-status-green mt-1">+{(currentPepm.change.medical * 100).toFixed(0)}% vs Prior 12</div>
              <div className="text-xs text-slate-500 mt-4">[Line chart visualization]</div>
            </div>
          </div>
        </div>

        {/* Rx PEPM */}
        <div className="report-card">
          <h3 className="text-lg font-semibold mb-4">PEPM Rx Claims</h3>
          <div className="h-64 bg-base-950 rounded-card border border-slate-700 flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl font-bold text-accent-info">${currentPepm.rx}</div>
              <div className="text-sm text-slate-400 mt-2">Current 12 PEPM</div>
              <div className="text-sm text-status-green mt-1">+{(currentPepm.change.rx * 100).toFixed(0)}% vs Prior 12</div>
              <div className="text-xs text-slate-500 mt-4">[Line chart visualization]</div>
            </div>
          </div>
        </div>
      </div>

      {/* Column Definitions */}
      <div className="report-card">
        <h3 className="text-lg font-semibold mb-4">Column Formulas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><span className="font-semibold">E (Gross):</span> C + D</div>
          <div><span className="font-semibold">H (Net):</span> E + F + G</div>
          <div><span className="font-semibold">K (Total Cost):</span> H + I + J</div>
          <div><span className="font-semibold">M (Surplus/Deficit):</span> L - K</div>
          <div><span className="font-semibold">N (% of Budget):</span> K / L</div>
          <div><span className="font-semibold text-accent-primary">F, G:</span> Negative values reduce cost</div>
        </div>
      </div>
    </div>
  );
}
