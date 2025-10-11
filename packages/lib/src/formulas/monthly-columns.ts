/**
 * Monthly Detail A-N Columns (Template Page 3)
 * Implements formula logic for All Plans and per-Plan monthly tables
 */

import type { MonthlyPlanData, MonthlyColumnsResult } from '../types';

/**
 * Calculate A-N columns for a single month
 *
 * Formulas:
 * - E = C + D (Total Paid)
 * - H = E + F + G (Net Paid; F & G reduce cost, stored as negative)
 * - K = H + I + J (Total Cost)
 * - M = L - K (Surplus/Deficit)
 * - N = K / L (% of Budget)
 */
export function calculateMonthlyColumns(data: MonthlyPlanData): MonthlyColumnsResult {
  const {
    month,
    totalSubscribers,
    medicalPaid,
    rxPaid,
    specStopLossReimb,
    estRxRebates,
    adminFees,
    stopLossFees,
    budgetedPremium
  } = data;

  // Column E: Total Paid (Medical + Rx)
  const totalPaid = medicalPaid + rxPaid;

  // Column H: Net Paid (Total + offsets)
  // Note: specStopLossReimb and estRxRebates are stored as negative values
  const netPaid = totalPaid + specStopLossReimb + estRxRebates;

  // Column K: Total Cost (Net + Admin + Stop Loss)
  const totalCost = netPaid + adminFees + stopLossFees;

  // Column M: Surplus/Deficit (Budget - Cost)
  const surplusDeficit = budgetedPremium - totalCost;

  // Column N: % of Budget (Cost / Budget)
  const percentOfBudget = budgetedPremium !== 0
    ? totalCost / budgetedPremium
    : 0;

  return {
    month,
    totalSubscribers,
    medicalPaid,
    rxPaid,
    totalPaid,
    specStopLossReimb,
    estRxRebates,
    netPaid,
    adminFees,
    stopLossFees,
    totalCost,
    budgetedPremium,
    surplusDeficit,
    percentOfBudget
  };
}

/**
 * Calculate A-N columns for multiple months
 */
export function calculateMonthlyColumnsForPeriod(
  dataPoints: MonthlyPlanData[]
): MonthlyColumnsResult[] {
  return dataPoints.map(calculateMonthlyColumns);
}

/**
 * Calculate YTD totals across months
 */
export function calculateYtdTotals(
  monthlyResults: MonthlyColumnsResult[]
): Omit<MonthlyColumnsResult, 'month'> {
  const totals = monthlyResults.reduce(
    (acc, month) => ({
      totalSubscribers: acc.totalSubscribers + month.totalSubscribers,
      medicalPaid: acc.medicalPaid + month.medicalPaid,
      rxPaid: acc.rxPaid + month.rxPaid,
      totalPaid: acc.totalPaid + month.totalPaid,
      specStopLossReimb: acc.specStopLossReimb + month.specStopLossReimb,
      estRxRebates: acc.estRxRebates + month.estRxRebates,
      netPaid: acc.netPaid + month.netPaid,
      adminFees: acc.adminFees + month.adminFees,
      stopLossFees: acc.stopLossFees + month.stopLossFees,
      totalCost: acc.totalCost + month.totalCost,
      budgetedPremium: acc.budgetedPremium + month.budgetedPremium,
      surplusDeficit: acc.surplusDeficit + month.surplusDeficit,
      percentOfBudget: 0 // Recalculated below
    }),
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
      surplusDeficit: 0,
      percentOfBudget: 0
    }
  );

  // Recalculate % of Budget for YTD
  totals.percentOfBudget = totals.budgetedPremium !== 0
    ? totals.totalCost / totals.budgetedPremium
    : 0;

  return totals;
}

/**
 * Validate reconciliation: Σ(per-plan) must equal All Plans
 */
export function reconcileMonthlyData(
  allPlansData: MonthlyColumnsResult,
  perPlanData: MonthlyColumnsResult[],
  tolerance: number = 0.01 // $0.01 default
): { match: boolean; differences: Record<string, number> } {
  const sumOfPlans = perPlanData.reduce(
    (acc, plan) => ({
      medicalPaid: acc.medicalPaid + plan.medicalPaid,
      rxPaid: acc.rxPaid + plan.rxPaid,
      totalPaid: acc.totalPaid + plan.totalPaid,
      netPaid: acc.netPaid + plan.netPaid,
      totalCost: acc.totalCost + plan.totalCost,
      budgetedPremium: acc.budgetedPremium + plan.budgetedPremium
    }),
    {
      medicalPaid: 0,
      rxPaid: 0,
      totalPaid: 0,
      netPaid: 0,
      totalCost: 0,
      budgetedPremium: 0
    }
  );

  const differences = {
    medicalPaid: Math.abs(allPlansData.medicalPaid - sumOfPlans.medicalPaid),
    rxPaid: Math.abs(allPlansData.rxPaid - sumOfPlans.rxPaid),
    totalPaid: Math.abs(allPlansData.totalPaid - sumOfPlans.totalPaid),
    netPaid: Math.abs(allPlansData.netPaid - sumOfPlans.netPaid),
    totalCost: Math.abs(allPlansData.totalCost - sumOfPlans.totalCost),
    budgetedPremium: Math.abs(allPlansData.budgetedPremium - sumOfPlans.budgetedPremium)
  };

  const match = Object.values(differences).every(diff => diff <= tolerance);

  return { match, differences };
}
