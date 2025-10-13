'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { Download } from 'lucide-react';
import { PepmTrendChart } from '@medical-reporting/ui';
import type { MonthlyColumnsResult, PepmResult } from '@medical-reporting/lib/types';

const DEFAULT_CLIENT_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_PLAN_YEAR_ID = '00000000-0000-0000-0000-000000000301';

interface MonthlyApiRow extends MonthlyColumnsResult {
  monthDate: string;
}

interface MonthlyApiResponse {
  monthlyData: MonthlyApiRow[];
  pepm: {
    medical: { current: PepmResult | null; prior: PepmResult | null };
    rx: { current: PepmResult | null; prior: PepmResult | null };
    total: { current: PepmResult | null; prior: PepmResult | null };
  };
}

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

function formatCurrency(value: number) {
  const formatted = currencyFormatter.format(Math.abs(value));
  return value < 0 ? `(${formatted})` : formatted;
}

function formatSurplus(value: number) {
  const formatted = currencyFormatter.format(Math.abs(value));
  return value < 0 ? `(${formatted})` : formatted;
}

function formatChangeLabel(change: number | null) {
  if (change === null || Number.isNaN(change)) {
    return { text: 'No prior period', tone: 'text-slate-500' };
  }

  const percent = percentFormatter.format(Math.abs(change * 100));

  if (change > 0) {
    return { text: `+${percent}% vs Prior 12`, tone: 'text-status-green' };
  }

  if (change < 0) {
    return { text: `-${percent}% vs Prior 12`, tone: 'text-status-red' };
  }

  return { text: `${percent}% vs Prior 12`, tone: 'text-slate-400' };
}

export default function MonthlyDetailPage() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get('clientId') ?? DEFAULT_CLIENT_ID;
  const planYearId = searchParams.get('planYearId') ?? DEFAULT_PLAN_YEAR_ID;
  const through = searchParams.get('through');

  const [isExporting, setIsExporting] = React.useState(false);
  const [payload, setPayload] = React.useState<MonthlyApiResponse | null>(null);
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

        const response = await fetch(`/api/monthly/all-plans?${query.toString()}`);
        const body = await response
          .json()
          .catch(() => ({ error: 'Failed to load monthly data.' }));

        if (!response.ok) {
          throw new Error(body?.error ?? 'Failed to load monthly data.');
        }

        if (isActive) {
          setPayload(body as MonthlyApiResponse);
        }
      } catch (fetchError) {
        if (isActive) {
          const message =
            fetchError instanceof Error
              ? fetchError.message
              : 'Failed to load monthly data.';
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
          Loading monthly detail...
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
          No monthly detail data available.
        </div>
      </div>
    );
  }

  const sortedMonths = [...payload.monthlyData].sort((a, b) => {
    const dateA = parseISO(a.monthDate);
    const dateB = parseISO(b.monthDate);
    return dateA.getTime() - dateB.getTime();
  });

  const latestMonth = sortedMonths.at(-1);
  const throughLabel = latestMonth
    ? format(parseISO(latestMonth.monthDate), 'MMM yyyy')
    : '—';

  const tableRows = sortedMonths.map((row) => ({
    key: row.month,
    label: format(parseISO(row.monthDate), 'MMM yyyy'),
    ...row,
  }));

  const summary = sortedMonths.reduce(
    (acc, row) => {
      acc.totalSubscribers = row.totalSubscribers;
      acc.medicalPaid += row.medicalPaid;
      acc.rxPaid += row.rxPaid;
      acc.totalPaid += row.totalPaid;
      acc.specStopLossReimb += row.specStopLossReimb;
      acc.estRxRebates += row.estRxRebates;
      acc.netPaid += row.netPaid;
      acc.adminFees += row.adminFees;
      acc.stopLossFees += row.stopLossFees;
      acc.totalCost += row.totalCost;
      acc.budgetedPremium += row.budgetedPremium;
      return acc;
    },
    {
      totalSubscribers: 0,
      medicalPaid: 0,
      rxPaid: 0,
      totalPaid: 0,
      specStopLossReimb: 0,
      estRxRebates: 0,
      netPaid: 0,
      adminFees: 0,
      stopLossFees: 0,
      totalCost: 0,
      budgetedPremium: 0,
    },
  );

  const surplus = summary.budgetedPremium - summary.totalCost;
  const percentOfBudget = summary.budgetedPremium
    ? summary.totalCost / summary.budgetedPremium
    : 0;

  const medicalCurrentPepm = payload.pepm.medical.current?.current12.pepm ?? null;
  const medicalPriorPepm = payload.pepm.medical.prior?.current12.pepm ?? null;
  const medicalChange =
    medicalCurrentPepm !== null &&
    medicalPriorPepm !== null &&
    medicalPriorPepm !== 0
      ? (medicalCurrentPepm - medicalPriorPepm) / medicalPriorPepm
      : null;

  const rxCurrentPepm = payload.pepm.rx.current?.current12.pepm ?? null;
  const rxPriorPepm = payload.pepm.rx.prior?.current12.pepm ?? null;
  const rxChange =
    rxCurrentPepm !== null &&
    rxPriorPepm !== null &&
    rxPriorPepm !== 0
      ? (rxCurrentPepm - rxPriorPepm) / rxPriorPepm
      : null;

  const currentPepm = {
    medical: medicalCurrentPepm !== null
      ? Math.round(medicalCurrentPepm)
      : null,
    rx: rxCurrentPepm !== null ? Math.round(rxCurrentPepm) : null,
    change: {
      medical: medicalChange,
      rx: rxChange,
    },
  };

  const currentMonths = sortedMonths.slice(-12);
  const priorMonths = sortedMonths.slice(-24, -12);

  const medicalPepmData = currentMonths.map((row, index) => {
    const prior = priorMonths[index];
    const currentValue = row.totalSubscribers !== 0
      ? row.medicalPaid / row.totalSubscribers
      : 0;
    const priorValue =
      prior && prior.totalSubscribers !== 0
        ? prior.medicalPaid / prior.totalSubscribers
        : undefined;

    return {
      month: format(parseISO(row.monthDate), 'MMM'),
      current: Number(currentValue.toFixed(2)),
      prior: priorValue !== undefined ? Number(priorValue.toFixed(2)) : undefined,
    };
  });

  const rxPepmData = currentMonths.map((row, index) => {
    const prior = priorMonths[index];
    const currentValue = row.totalSubscribers !== 0 ? row.rxPaid / row.totalSubscribers : 0;
    const priorValue =
      prior && prior.totalSubscribers !== 0
        ? prior.rxPaid / prior.totalSubscribers
        : undefined;

    return {
      month: format(parseISO(row.monthDate), 'MMM'),
      current: Number(currentValue.toFixed(2)),
      prior: priorValue !== undefined ? Number(priorValue.toFixed(2)) : undefined,
    };
  });

  const medicalChangeLabel = formatChangeLabel(currentPepm.change.medical);
  const rxChangeLabel = formatChangeLabel(currentPepm.change.rx);

  return (
    <div className="p-8 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monthly Detail - All Plans</h1>
          <p className="text-slate-400 mt-2">
            Rolling 24 Months - Claims Paid through {throughLabel}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="px-4 py-2 bg-accent-primary text-base-950 rounded-card font-medium hover:bg-emerald-400 transition-uber inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Export to CSV"
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
              Export CSV
            </>
          )}
        </button>
      </div>

      {/* A-N Table */}
      <div className="report-card overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              <th className="sticky left-0 bg-base-900 z-10">A<br />Month</th>
              <th>B<br />Total<br />Subscribers</th>
              <th>C<br />Medical<br />Claims</th>
              <th>D<br />Pharmacy<br />Claims</th>
              <th>E<br />Gross M&P<br />(C + D)</th>
              <th>F<br />Spec Stop<br />Loss Reimb</th>
              <th>G<br />Est Earned<br />Rx Rebates*</th>
              <th>H<br />Net M&P<br />(E + F + G)</th>
              <th>I<br />Admin<br />Fees</th>
              <th>J<br />Stop Loss<br />Fees</th>
              <th>K<br />Total Cost<br />(H + I + J)</th>
              <th>L<br />Budgeted<br />Premium</th>
              <th>M<br />Surplus/<br />(Deficit)<br />(L - K)</th>
              <th>N<br />% of<br />Budget<br />(K / L)</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.key}>
                <td className="sticky left-0 bg-base-950 font-semibold">
                  {row.label}
                </td>
                <td className="text-right">
                  {numberFormatter.format(row.totalSubscribers)}
                </td>
                <td className="text-right">{formatCurrency(row.medicalPaid)}</td>
                <td className="text-right">{formatCurrency(row.rxPaid)}</td>
                <td className="text-right font-semibold">
                  {formatCurrency(row.totalPaid)}
                </td>
                <td className="text-right text-accent-primary">
                  {formatCurrency(row.specStopLossReimb)}
                </td>
                <td className="text-right text-accent-primary">
                  {formatCurrency(row.estRxRebates)}
                </td>
                <td className="text-right font-semibold">
                  {formatCurrency(row.netPaid)}
                </td>
                <td className="text-right">{formatCurrency(row.adminFees)}</td>
                <td className="text-right">{formatCurrency(row.stopLossFees)}</td>
                <td className="text-right font-bold">
                  {formatCurrency(row.totalCost)}
                </td>
                <td className="text-right">{formatCurrency(row.budgetedPremium)}</td>
                <td
                  className={`text-right font-semibold ${row.surplusDeficit >= 0 ? 'text-status-green' : 'text-status-red'}`}
                >
                  {formatSurplus(row.surplusDeficit)}
                </td>
                <td
                  className={`text-right ${row.percentOfBudget > 1 ? 'text-status-red' : 'text-status-green'}`}
                >
                  {percentFormatter.format(row.percentOfBudget * 100)}%
                </td>
              </tr>
            ))}

            {/* Current PY Summary */}
            <tr className="border-t-2 border-accent-primary bg-base-800">
              <td className="sticky left-0 bg-base-800 font-bold">Current PY</td>
              <td className="text-right font-bold">
                {numberFormatter.format(summary.totalSubscribers)}
              </td>
              <td className="text-right font-bold">
                {formatCurrency(summary.medicalPaid)}
              </td>
              <td className="text-right font-bold">
                {formatCurrency(summary.rxPaid)}
              </td>
              <td className="text-right font-bold">
                {formatCurrency(summary.totalPaid)}
              </td>
              <td className="text-right font-bold">
                {formatCurrency(summary.specStopLossReimb)}
              </td>
              <td className="text-right font-bold">
                {formatCurrency(summary.estRxRebates)}
              </td>
              <td className="text-right font-bold">
                {formatCurrency(summary.netPaid)}
              </td>
              <td className="text-right font-bold">
                {formatCurrency(summary.adminFees)}
              </td>
              <td className="text-right font-bold">
                {formatCurrency(summary.stopLossFees)}
              </td>
              <td className="text-right font-bold">
                {formatCurrency(summary.totalCost)}
              </td>
              <td className="text-right font-bold">
                {formatCurrency(summary.budgetedPremium)}
              </td>
              <td className="text-right font-bold text-status-green">
                {formatSurplus(surplus)}
              </td>
              <td className="text-right font-bold text-status-green">
                {percentFormatter.format(percentOfBudget * 100)}%
              </td>
            </tr>
          </tbody>
        </table>

        {/* Footnote */}
        <div className="mt-4 text-xs text-slate-400 italic">
          * Earned Pharmacy Rebates are estimated based on contractual terms and group
          utilization; actual rebates may vary.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Medical PEPM */}
        <div className="report-card">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">PEPM Medical Claims</h3>
            <div className="flex items-baseline gap-3 mt-2">
              <div className="text-3xl font-bold text-accent-primary">
                {currentPepm.medical !== null ? `$${currentPepm.medical}` : '—'}
              </div>
              <div className="text-sm text-slate-400">Current 12 PEPM</div>
              <div className={`text-sm ${medicalChangeLabel.tone}`}>
                {medicalChangeLabel.text}
              </div>
            </div>
          </div>
          <PepmTrendChart
            data={medicalPepmData}
            title=""
            currentLabel="Current 12"
            priorLabel="Prior 12"
            showPrior={true}
          />
        </div>

        {/* Rx PEPM */}
        <div className="report-card">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">PEPM Rx Claims</h3>
            <div className="flex items-baseline gap-3 mt-2">
              <div className="text-3xl font-bold text-accent-info">
                {currentPepm.rx !== null ? `$${currentPepm.rx}` : '—'}
              </div>
              <div className="text-sm text-slate-400">Current 12 PEPM</div>
              <div className={`text-sm ${rxChangeLabel.tone}`}>
                {rxChangeLabel.text}
              </div>
            </div>
          </div>
          <PepmTrendChart
            data={rxPepmData}
            title=""
            currentLabel="Current 12"
            priorLabel="Prior 12"
            showPrior={true}
          />
        </div>
      </div>

      {/* Column Definitions */}
      <div className="report-card">
        <h3 className="text-lg font-semibold mb-4">Column Formulas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-300">
          <div>
            <span className="font-semibold text-text-dark">E (Gross):</span> C + D
          </div>
          <div>
            <span className="font-semibold text-text-dark">H (Net):</span> E + F + G
          </div>
          <div>
            <span className="font-semibold text-text-dark">K (Total Cost):</span> H + I + J
          </div>
          <div>
            <span className="font-semibold text-text-dark">M (Surplus/Deficit):</span> L - K
          </div>
          <div>
            <span className="font-semibold text-text-dark">N (% of Budget):</span> K / L
          </div>
          <div>
            <span className="font-semibold text-accent-primary">F, G:</span> Negative values
            reduce cost
          </div>
        </div>
      </div>
    </div>
  );
}
