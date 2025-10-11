import { Download } from 'lucide-react';
import { notFound } from 'next/navigation';

/**
 * Plan-Specific Monthly Detail Pages (Template PDF Pages 5-7)
 *
 * Dynamic route for HDHP, PPO Base, PPO Buy-Up
 * Same A-N structure as All Plans
 */

const planData = {
  hdhp: {
    name: 'HDHP',
    description: 'High Deductible Health Plan',
    color: 'emerald',
    ytd: {
      subscribers: 1013,
      budgetedPremium: 726168,
      medicalPaid: 127756,
      rxPaid: 5294,
      totalPaid: 133050,
      specStopLossReimb: 0,
      estRxRebates: -75975,
      netPaid: 57075,
      adminFees: 46426,
      stopLossFees: 114791,
      totalCost: 218291,
      surplusDeficit: 507877,
      percentOfBudget: 0.301
    },
    pepm: {
      current: { medical: 126.12, rx: 5.23 },
      prior: { medical: 310.49, rx: 2.85 }
    }
  },
  'ppo-base': {
    name: 'PPO Base',
    description: 'PPO Base Plan',
    color: 'sky',
    ytd: {
      subscribers: 3429,
      budgetedPremium: 3433514,
      medicalPaid: 2624728,
      rxPaid: 402738,
      totalPaid: 3027466,
      specStopLossReimb: -241505,
      estRxRebates: -257175,
      netPaid: 2528786,
      adminFees: 157151,
      stopLossFees: 514854,
      totalCost: 3200791,
      surplusDeficit: 232723,
      percentOfBudget: 0.932
    },
    pepm: {
      current: { medical: 765.45, rx: 117.45 },
      prior: { medical: 476.15, rx: 92.04 }
    }
  },
  'ppo-buyup': {
    name: 'PPO Buy-Up',
    description: 'PPO Buy-Up Plan',
    color: 'purple',
    ytd: {
      subscribers: 1207,
      budgetedPremium: 1425972,
      medicalPaid: 1748910,
      rxPaid: 270490,
      totalPaid: 2019400,
      specStopLossReimb: -322007,
      estRxRebates: -90525,
      netPaid: 1606869,
      adminFees: 55317,
      stopLossFees: 188339,
      totalCost: 1850524,
      surplusDeficit: -424552,
      percentOfBudget: 1.298
    },
    pepm: {
      current: { medical: 1448.97, rx: 224.10 },
      prior: { medical: 1654.21, rx: 150.97 }
    }
  }
};

export default function PlanDetailPage({ params }: { params: { planId: string } }) {
  const plan = planData[params.planId as keyof typeof planData];

  if (!plan) {
    notFound();
  }

  const colorClasses = {
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    sky: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20'
  }[plan.color];

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-pill border ${colorClasses} mb-3`}>
            <div className={`w-2 h-2 rounded-full bg-${plan.color}-500`} />
            <span className="text-sm font-medium">{plan.name}</span>
          </div>
          <h1 className="text-3xl font-bold">{plan.description} - Monthly Detail</h1>
          <p className="text-slate-400 mt-2">Rolling 24 Months - Claims Paid through June 2025</p>
        </div>
        <button className="px-4 py-2 bg-accent-primary text-base-950 rounded-card font-medium hover:bg-emerald-400 transition-uber inline-flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* YTD Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Total Subs</div>
          <div className="text-lg font-bold">{plan.ytd.subscribers.toLocaleString()}</div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Medical Paid</div>
          <div className="text-lg font-bold">${(plan.ytd.medicalPaid / 1000).toFixed(0)}K</div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Rx Paid</div>
          <div className="text-lg font-bold">${(plan.ytd.rxPaid / 1000).toFixed(0)}K</div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Net Paid</div>
          <div className="text-lg font-bold">${(plan.ytd.netPaid / 1000).toFixed(0)}K</div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Total Cost</div>
          <div className="text-lg font-bold">${(plan.ytd.totalCost / 1000).toFixed(0)}K</div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">% of Budget</div>
          <div className={`text-lg font-bold ${plan.ytd.percentOfBudget > 1 ? 'text-status-red' : 'text-status-green'}`}>
            {(plan.ytd.percentOfBudget * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* A-N Table (simplified - same structure as All Plans) */}
      <div className="report-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Subs</th>
              <th>Medical</th>
              <th>Rx</th>
              <th>Gross</th>
              <th>SL Reimb</th>
              <th>Rx Reb*</th>
              <th>Net</th>
              <th>Admin</th>
              <th>SL Fees</th>
              <th>Total Cost</th>
              <th>Budget</th>
              <th>Surplus</th>
              <th>% Budget</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={14} className="text-center text-slate-500 py-8">
                [24 months of detailed A-N data would be displayed here]
              </td>
            </tr>
            {/* Current PY Summary */}
            <tr className="border-t-2 border-accent-primary bg-base-800">
              <td className="font-bold">Current PY</td>
              <td className="text-right font-bold">{plan.ytd.subscribers.toLocaleString()}</td>
              <td className="text-right font-bold">${plan.ytd.medicalPaid.toLocaleString()}</td>
              <td className="text-right font-bold">${plan.ytd.rxPaid.toLocaleString()}</td>
              <td className="text-right font-bold">${plan.ytd.totalPaid.toLocaleString()}</td>
              <td className="text-right font-bold">${plan.ytd.specStopLossReimb.toLocaleString()}</td>
              <td className="text-right font-bold">${plan.ytd.estRxRebates.toLocaleString()}</td>
              <td className="text-right font-bold">${plan.ytd.netPaid.toLocaleString()}</td>
              <td className="text-right font-bold">${plan.ytd.adminFees.toLocaleString()}</td>
              <td className="text-right font-bold">${plan.ytd.stopLossFees.toLocaleString()}</td>
              <td className="text-right font-bold">${plan.ytd.totalCost.toLocaleString()}</td>
              <td className="text-right font-bold">${plan.ytd.budgetedPremium.toLocaleString()}</td>
              <td className={`text-right font-bold ${plan.ytd.surplusDeficit >= 0 ? 'text-status-green' : 'text-status-red'}`}>
                ${Math.abs(plan.ytd.surplusDeficit).toLocaleString()}
              </td>
              <td className={`text-right font-bold ${plan.ytd.percentOfBudget > 1 ? 'text-status-red' : 'text-status-green'}`}>
                {(plan.ytd.percentOfBudget * 100).toFixed(1)}%
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 text-xs text-slate-400 italic">
          * Earned Pharmacy Rebates are estimated based on contractual terms and group utilization; actual rebates may vary.
        </div>
      </div>

      {/* PEPM Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="report-card">
          <h3 className="text-lg font-semibold mb-4">Medical PEPM</h3>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-primary">${plan.pepm.current.medical.toFixed(2)}</div>
              <div className="text-xs text-slate-400 mt-1">Current 12 PEPM</div>
            </div>
            <div className="text-center px-8">
              <div className={`text-xl font-semibold ${
                plan.pepm.current.medical > plan.pepm.prior.medical ? 'text-status-red' : 'text-status-green'
              }`}>
                {plan.pepm.current.medical > plan.pepm.prior.medical ? '↑' : '↓'}
                {Math.abs(((plan.pepm.current.medical - plan.pepm.prior.medical) / plan.pepm.prior.medical) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-slate-400 mt-1">vs Prior 12</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-500">${plan.pepm.prior.medical.toFixed(2)}</div>
              <div className="text-xs text-slate-400 mt-1">Prior 12 PEPM</div>
            </div>
          </div>
        </div>

        <div className="report-card">
          <h3 className="text-lg font-semibold mb-4">Rx PEPM</h3>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <div className="text-2xl font-bold text-accent-info">${plan.pepm.current.rx.toFixed(2)}</div>
              <div className="text-xs text-slate-400 mt-1">Current 12 PEPM</div>
            </div>
            <div className="text-center px-8">
              <div className={`text-xl font-semibold ${
                plan.pepm.current.rx > plan.pepm.prior.rx ? 'text-status-red' : 'text-status-green'
              }`}>
                {plan.pepm.current.rx > plan.pepm.prior.rx ? '↑' : '↓'}
                {Math.abs(((plan.pepm.current.rx - plan.pepm.prior.rx) / plan.pepm.prior.rx) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-slate-400 mt-1">vs Prior 12</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-slate-500">${plan.pepm.prior.rx.toFixed(2)}</div>
              <div className="text-xs text-slate-400 mt-1">Prior 12 PEPM</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
