/**
 * Executive Summary Calculations (Template Page 2)
 * Fuel gauge, YTD totals, distribution analysis
 */

import type { ExecutiveYtdInput, ExecutiveYtdResult, MonthlyColumnsResult } from '../types';

/**
 * Calculate Executive Summary YTD metrics
 *
 * Includes:
 * - YTD totals (Budget, Paid, Net, Admin, Stop Loss)
 * - IBNR adjustment
 * - Total Plan Cost
 * - Surplus/Deficit
 * - % of Budget with fuel gauge status
 * - Med vs Rx distribution
 */
export function calculateExecutiveYtd(input: ExecutiveYtdInput): ExecutiveYtdResult {
  const { months, ibnr } = input;

  // Sum all columns across months
  const budgetedPremium = months.reduce((sum, m) => sum + m.budgetedPremium, 0);
  const totalPaid = months.reduce((sum, m) => sum + m.totalPaid, 0); // Column E
  const netPaid = months.reduce((sum, m) => sum + m.netPaid, 0); // Column H
  const adminFees = months.reduce((sum, m) => sum + m.adminFees, 0);
  const stopLossFees = months.reduce((sum, m) => sum + m.stopLossFees, 0);

  // Total Plan Cost = Net + Admin + Stop Loss + IBNR
  const totalPlanCost = netPaid + adminFees + stopLossFees + ibnr;

  // Surplus/Deficit = Premium - Cost
  const surplusDeficit = budgetedPremium - totalPlanCost;

  // % of Budget
  const percentOfBudget = budgetedPremium !== 0
    ? totalPlanCost / budgetedPremium
    : 0;

  // Fuel Gauge Status
  const fuelGaugeStatus = getFuelGaugeStatus(percentOfBudget);

  // Med vs Rx Distribution
  const medicalTotal = months.reduce((sum, m) => sum + m.medicalPaid, 0);
  const rxTotal = months.reduce((sum, m) => sum + m.rxPaid, 0);
  const combinedTotal = medicalTotal + rxTotal;
  const medicalPercent = combinedTotal !== 0 ? medicalTotal / combinedTotal : 0;
  const rxPercent = combinedTotal !== 0 ? rxTotal / combinedTotal : 0;

  return {
    budgetedPremium,
    totalPaid,
    netPaid,
    adminFees,
    stopLossFees,
    ibnr,
    totalPlanCost,
    surplusDeficit,
    percentOfBudget,
    fuelGaugeStatus,
    medicalTotal,
    rxTotal,
    medicalPercent,
    rxPercent
  };
}

/**
 * Determine fuel gauge status based on % of budget
 * - GREEN: < 95%
 * - YELLOW: 95% - 105%
 * - RED: > 105%
 */
function getFuelGaugeStatus(percentOfBudget: number): 'GREEN' | 'YELLOW' | 'RED' {
  if (percentOfBudget < 0.95) return 'GREEN';
  if (percentOfBudget <= 1.05) return 'YELLOW';
  return 'RED';
}

/**
 * Calculate plan mix distribution
 */
export function calculatePlanMix(
  planData: Array<{
    planName: string;
    totalCost: number;
  }>
): Array<{
  planName: string;
  totalCost: number;
  percent: number;
}> {
  const total = planData.reduce((sum, p) => sum + p.totalCost, 0);

  return planData.map(p => ({
    planName: p.planName,
    totalCost: p.totalCost,
    percent: total !== 0 ? p.totalCost / total : 0
  }));
}

/**
 * Calculate high-claim buckets distribution
 */
export function calculateClaimantBuckets(
  claimants: Array<{ totalPaid: number }>
): {
  over200k: { count: number; total: number };
  range100to200k: { count: number; total: number };
  under100k: { count: number; total: number };
} {
  const buckets = {
    over200k: { count: 0, total: 0 },
    range100to200k: { count: 0, total: 0 },
    under100k: { count: 0, total: 0 }
  };

  claimants.forEach(c => {
    if (c.totalPaid >= 200000) {
      buckets.over200k.count++;
      buckets.over200k.total += c.totalPaid;
    } else if (c.totalPaid >= 100000) {
      buckets.range100to200k.count++;
      buckets.range100to200k.total += c.totalPaid;
    } else {
      buckets.under100k.count++;
      buckets.under100k.total += c.totalPaid;
    }
  });

  return buckets;
}

/**
 * Generate auto-observation based on executive metrics
 */
export function generateExecutiveObservation(result: ExecutiveYtdResult): string {
  const observations: string[] = [];

  // Budget status
  if (result.percentOfBudget < 0.95) {
    observations.push(
      'Plan is under budget for the rolling 12 and current plan year to date.'
    );
  } else if (result.percentOfBudget > 1.05) {
    observations.push(
      `Plan is over budget at ${(result.percentOfBudget * 100).toFixed(1)}% of budgeted premium.`
    );
  }

  // Med vs Rx split
  const medPercent = (result.medicalPercent * 100).toFixed(1);
  const rxPercent = (result.rxPercent * 100).toFixed(1);
  observations.push(
    `Medical claims represent ${medPercent}% of total paid, pharmacy ${rxPercent}%.`
  );

  // Surplus/Deficit
  if (result.surplusDeficit > 0) {
    const surplus = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(result.surplusDeficit);
    observations.push(`Year-to-date surplus: ${surplus}.`);
  } else if (result.surplusDeficit < 0) {
    const deficit = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(result.surplusDeficit));
    observations.push(`Year-to-date deficit: ${deficit}.`);
  }

  return observations.join(' ');
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

/**
 * Format percent for display
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}
