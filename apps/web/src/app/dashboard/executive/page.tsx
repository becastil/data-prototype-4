import { Download, TrendingDown, TrendingUp } from 'lucide-react';

/**
 * Executive Summary Page (Template PDF Page 2)
 *
 * Components:
 * - Fuel gauge with thresholds (Green <95%, Yellow 95-105%, Red >105%)
 * - Plan YTD stacked bars (Admin, Stop Loss, Net Med+Rx, offsets, Premium line)
 * - KPI tiles (Budget, Paid, Net, Admin, Stop Loss, IBNR, Cost, Surplus, %, PEPMs)
 * - Distribution charts (Med vs Rx, Plan mix, High-claim buckets)
 */

// Sample data matching golden seed targets
const ytdData = {
  budgetedPremium: 5585653,
  totalPaid: 5178492,
  netPaid: 4191305,
  adminFees: 258894,
  stopLossFees: 817983,
  ibnr: 0,
  totalPlanCost: 5268182,
  surplusDeficit: 317471,
  percentOfBudget: 0.9432, // 94.32%
  fuelGaugeStatus: 'GREEN' as const,
  medicalTotal: 4499969,
  rxTotal: 678522,
  medicalPercent: 0.869,
  rxPercent: 0.131,
  specStopLossReimb: -563512,
  estRxRebates: -423675,
};

const planMix = [
  { name: 'HDHP', cost: 2200000, percent: 0.42 },
  { name: 'PPO Base', cost: 2000000, percent: 0.38 },
  { name: 'PPO Buy-Up', cost: 1068182, percent: 0.20 },
];

const claimantBuckets = [
  { range: '$200K+', count: 4, total: 950000 },
  { range: '$100K-$200K', count: 6, total: 720000 },
  { range: 'Other', count: 890, total: 3508492 },
];

export default function ExecutiveSummaryPage() {
  const fuelGaugeColor =
    ytdData.fuelGaugeStatus === 'GREEN'
      ? 'fuel-gauge-green'
      : ytdData.fuelGaugeStatus === 'YELLOW'
      ? 'fuel-gauge-yellow'
      : 'fuel-gauge-red';

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Executive Summary</h1>
          <p className="text-slate-400 mt-2">Year-to-date performance analysis</p>
        </div>
        <button className="px-4 py-2 bg-accent-primary text-base-950 rounded-card font-medium hover:bg-emerald-400 transition-uber inline-flex items-center gap-2">
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Fuel Gauge & Status */}
      <div className="report-card">
        <h2 className="text-xl font-semibold mb-6">Budget Performance</h2>
        <div className="flex items-center gap-8">
          <div className="flex-1">
            <div className="relative h-32 flex items-center justify-center">
              <div className={`text-6xl font-bold ${fuelGaugeColor}`}>
                {(ytdData.percentOfBudget * 100).toFixed(1)}%
              </div>
            </div>
            <div className="text-center mt-4">
              <div className="text-sm text-slate-400">Of Budgeted Premium</div>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-status-green" />
                  &lt;95% Green
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-status-yellow" />
                  95-105% Yellow
                </span>
                <span className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-status-red" />
                  &gt;105% Red
                </span>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Budgeted Premium</span>
              <span className="font-semibold">
                ${ytdData.budgetedPremium.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Plan Cost</span>
              <span className="font-semibold">
                ${ytdData.totalPlanCost.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-700">
              <span className="text-slate-400">Surplus/Deficit</span>
              <span className={`font-semibold flex items-center gap-1 ${ytdData.surplusDeficit >= 0 ? 'text-status-green' : 'text-status-red'}`}>
                {ytdData.surplusDeficit >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                ${Math.abs(ytdData.surplusDeficit).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* YTD KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Total Paid</div>
          <div className="text-lg font-bold">
            ${(ytdData.totalPaid / 1000000).toFixed(2)}M
          </div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Net Paid</div>
          <div className="text-lg font-bold">
            ${(ytdData.netPaid / 1000000).toFixed(2)}M
          </div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Admin Fees</div>
          <div className="text-lg font-bold">
            ${(ytdData.adminFees / 1000).toFixed(0)}K
          </div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Stop Loss Fees</div>
          <div className="text-lg font-bold">
            ${(ytdData.stopLossFees / 1000).toFixed(0)}K
          </div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">IBNR</div>
          <div className="text-lg font-bold">${ytdData.ibnr.toLocaleString()}</div>
        </div>
      </div>

      {/* Plan YTD Stacked Bars */}
      <div className="report-card">
        <h2 className="text-xl font-semibold mb-6">Plan Year-to-Date Breakdown</h2>
        <div className="space-y-4">
          {/* Placeholder for stacked bar chart */}
          <div className="h-64 bg-base-950 rounded-card border border-slate-700 flex items-center justify-center">
            <div className="text-center text-slate-500">
              <div className="text-sm">Stacked Bar Chart</div>
              <div className="text-xs mt-1">
                Admin | Stop Loss | Net Med+Rx | Spec Stop Loss Reimb (hatched) | Est Rx
                Rebates (hatched)
              </div>
              <div className="text-xs">Budgeted Premium (line overlay)</div>
            </div>
          </div>
          <div className="flex justify-center gap-6 text-xs">
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 bg-sky-500" />
              Admin Fees
            </span>
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 bg-amber-500" />
              Stop Loss Fees
            </span>
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 bg-emerald-500" />
              Net Med+Rx
            </span>
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)' }} />
              Stop Loss Reimb
            </span>
            <span className="flex items-center gap-2">
              <div className="w-4 h-4 bg-pink-500" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)' }} />
              Rx Rebates
            </span>
          </div>
        </div>
      </div>

      {/* Distribution Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Med vs Rx */}
        <div className="report-card">
          <h3 className="text-lg font-semibold mb-4">Medical vs Pharmacy</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Medical</span>
                <span className="font-semibold">
                  {(ytdData.medicalPercent * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-base-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500"
                  style={{ width: `${ytdData.medicalPercent * 100}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Pharmacy</span>
                <span className="font-semibold">
                  {(ytdData.rxPercent * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-2 bg-base-950 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-500"
                  style={{ width: `${ytdData.rxPercent * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Plan Mix */}
        <div className="report-card">
          <h3 className="text-lg font-semibold mb-4">Plan Mix</h3>
          <div className="space-y-3">
            {planMix.map((plan) => (
              <div key={plan.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{plan.name}</span>
                  <span className="font-semibold">{(plan.percent * 100).toFixed(0)}%</span>
                </div>
                <div className="h-2 bg-base-950 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent-primary"
                    style={{ width: `${plan.percent * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* High-Claim Buckets */}
        <div className="report-card">
          <h3 className="text-lg font-semibold mb-4">Claimant Buckets</h3>
          <div className="space-y-3">
            {claimantBuckets.map((bucket) => (
              <div key={bucket.range} className="flex justify-between text-sm">
                <span className="text-slate-400">{bucket.range}</span>
                <div className="text-right">
                  <div className="font-semibold">{bucket.count} claimants</div>
                  <div className="text-xs text-slate-500">
                    ${(bucket.total / 1000).toFixed(0)}K
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Auto-Observation */}
      <div className="report-card bg-accent-primary/5 border-accent-primary/20">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
          Observations
        </h3>
        <p className="text-sm text-slate-300">
          Plan is under budget for the rolling 12 and current plan year to date. Medical
          claims represent {(ytdData.medicalPercent * 100).toFixed(1)}% of total paid,
          pharmacy {(ytdData.rxPercent * 100).toFixed(1)}%. Year-to-date surplus: $
          {ytdData.surplusDeficit.toLocaleString()}.
        </p>
      </div>
    </div>
  );
}
