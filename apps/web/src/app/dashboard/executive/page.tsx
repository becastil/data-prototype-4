'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, TrendingDown, TrendingUp } from 'lucide-react';
import { PlanYtdChart } from '@medical-reporting/ui';
import { generateExecutiveObservation } from '@medical-reporting/lib/formulas/executive';
import type {
  ExecutiveYtdResult,
  MonthlyColumnsResult,
} from '@medical-reporting/lib/types';

const DEFAULT_CLIENT_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_PLAN_YEAR_ID = '00000000-0000-0000-0000-000000000301';

type PlanMixEntry = {
  planName: string;
  totalCost: number;
  percent: number;
};

type ClaimantBucketsResponse = {
  over200k: { count: number; total: number };
  range100to200k: { count: number; total: number };
  under100k: { count: number; total: number };
};

interface ExecutiveSummaryPayload {
  executiveYtd: ExecutiveYtdResult;
  planMix: PlanMixEntry[];
  claimantBuckets: ClaimantBucketsResponse;
  monthlyResults: MonthlyColumnsResult[];
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

function ExecutiveSummaryPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId') ?? DEFAULT_CLIENT_ID;
  const planYearId = searchParams.get('planYearId') ?? DEFAULT_PLAN_YEAR_ID;
  const through = searchParams.get('through');

  const [isExporting, setIsExporting] = React.useState(false);
  const [payload, setPayload] = React.useState<ExecutiveSummaryPayload | null>(
    null,
  );
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isActive = true;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const query = new URLSearchParams({ clientId, planYearId });
        if (through) {
          query.set('through', through);
        }

        const response = await fetch(`/api/exec-summary?${query.toString()}`);
        const body = await response
          .json()
          .catch(() => ({ error: 'Failed to load executive summary.' }));

        if (!response.ok) {
          throw new Error(body?.error ?? 'Failed to load executive summary.');
        }

        if (isActive) {
          setPayload(body as ExecutiveSummaryPayload);
        }
      } catch (fetchError) {
        if (isActive) {
          const message =
            fetchError instanceof Error
              ? fetchError.message
              : 'Failed to load executive summary.';
          setError(message);
          setPayload(null);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      isActive = false;
    };
  }, [clientId, planYearId, through]);

  const handleExport = async () => {
    setIsExporting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsExporting(false);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="report-card animate-pulse p-8 text-slate-400">
          Loading executive summary...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="report-card border border-status-red/40 bg-status-red/10 p-6 text-status-red">
          {error}
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="p-8">
        <div className="report-card p-6 text-slate-400">
          No executive summary data available.
        </div>
      </div>
    );
  }

  const ytdData = payload.executiveYtd;

  const offsets = payload.monthlyResults.reduce(
    (acc, month) => {
      acc.stopLossReimb += month.specStopLossReimb;
      acc.rxRebates += month.estRxRebates;
      return acc;
    },
    { stopLossReimb: 0, rxRebates: 0 },
  );

  const planMix = payload.planMix.map((plan) => ({
    name: plan.planName,
    percent: plan.percent,
    cost: plan.totalCost,
  }));

  const claimantBuckets = [
    {
      range: '$200K+',
      count: payload.claimantBuckets.over200k.count,
      total: payload.claimantBuckets.over200k.total,
    },
    {
      range: '$100K-$200K',
      count: payload.claimantBuckets.range100to200k.count,
      total: payload.claimantBuckets.range100to200k.total,
    },
    {
      range: 'Other',
      count: payload.claimantBuckets.under100k.count,
      total: payload.claimantBuckets.under100k.total,
    },
  ];

  const observationText = generateExecutiveObservation(ytdData);

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
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 py-2 bg-accent-primary text-base-950 rounded-card font-medium hover:bg-emerald-400 transition-uber inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Export to PDF"
        >
          {isExporting ? (
            <>
              <div
                className="w-4 h-4 border-2 border-base-950 border-t-transparent rounded-full animate-spin"
                aria-hidden="true"
              />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" aria-hidden="true" />
              Export PDF
            </>
          )}
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
                {currencyFormatter.format(ytdData.budgetedPremium)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Plan Cost</span>
              <span className="font-semibold">
                {currencyFormatter.format(ytdData.totalPlanCost)}
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-slate-700">
              <span className="text-slate-400">Surplus/Deficit</span>
              <span
                className={`font-semibold flex items-center gap-1 ${ytdData.surplusDeficit >= 0 ? 'text-status-green' : 'text-status-red'}`}
              >
                {ytdData.surplusDeficit >= 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {currencyFormatter.format(Math.abs(ytdData.surplusDeficit))}
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
            {(ytdData.totalPaid / 1_000_000).toFixed(2)}M
          </div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Net Paid</div>
          <div className="text-lg font-bold">
            {(ytdData.netPaid / 1_000_000).toFixed(2)}M
          </div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Admin Fees</div>
          <div className="text-lg font-bold">
            {(ytdData.adminFees / 1_000).toFixed(0)}K
          </div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">Stop Loss Fees</div>
          <div className="text-lg font-bold">
            {(ytdData.stopLossFees / 1_000).toFixed(0)}K
          </div>
        </div>
        <div className="kpi-pill">
          <div className="text-xs text-slate-400 mb-1">IBNR</div>
          <div className="text-lg font-bold">
            {currencyFormatter.format(ytdData.ibnr)}
          </div>
        </div>
      </div>

      {/* Plan YTD Stacked Bars */}
      <div className="report-card">
        <h2 className="text-xl font-semibold mb-6">Plan Year-to-Date Breakdown</h2>
        <PlanYtdChart
          data={[
            {
              planName: 'YTD Total',
              adminFees: ytdData.adminFees,
              stopLossFees: ytdData.stopLossFees,
              netMedRx: ytdData.netPaid,
              stopLossReimb: offsets.stopLossReimb,
              rxRebates: offsets.rxRebates,
              budgetedPremium: ytdData.budgetedPremium,
            },
          ]}
          showBreakdown={true}
        />
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
                  <span className="font-semibold">
                    {(plan.percent * 100).toFixed(0)}%
                  </span>
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
                    {(bucket.total / 1_000).toFixed(0)}K
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
          {observationText || 'Executive summary insights will appear once data is available.'}
        </p>
      </div>
    </div>
  );
}

export default function ExecutiveSummaryPage() {
  return (
    <Suspense fallback={
      <div className="p-8">
        <div className="report-card animate-pulse p-8 text-slate-400">
          Loading executive summary...
        </div>
      </div>
    }>
      <ExecutiveSummaryPageContent />
    </Suspense>
  );
}
