/**
 * C&E Summary - 28-Row Statement
 * Monthly and cumulative C&E calculations with user adjustments
 */

import type { CeMonthlyInput, CeSummaryResult } from '../types';

/**
 * Calculate the 28-row C&E summary for a single month
 *
 * Rows:
 * Medical (#1-7): IP/OP domestic, non-domestic, non-hospital, UC settlement
 * Pharmacy (#8-9): Total Rx, Rx Rebates
 * Stop Loss (#10-11): Fees, Reimbursement
 * Admin (#12-14): Consulting, Individual fees, Total
 * Totals (#15-16): Monthly C&E, Cumulative C&E
 * Enrollment (#17-18): EE Count, Member Count
 * PEPM (#19-21): Actual Monthly, Actual Cumulative, Target
 * Budget (#22-24): PEPM Budget, Budget EE, Cumulative Budget
 * Variance (#25-28): Monthly/Cumulative, Absolute/Percent
 */
export function calculateCeSummary(
  input: CeMonthlyInput,
  cumulativeData?: {
    cumulativeCE: number;
    cumulativeBudget: number;
    avgEeYtd: number;
  }
): CeSummaryResult {
  // Medical (#1-7)
  const item1_domesticInpatient = input.domesticInpatient;
  const item2_domesticOutpatient = input.domesticOutpatient;
  const item3_totalHospital = item1_domesticInpatient + item2_domesticOutpatient;
  const item4_nonHospitalMedical = input.nonHospitalMedical;
  const item5_totalAllMedical = item3_totalHospital + item4_nonHospitalMedical;
  const item6_ucSettlement = input.ucSettlement;
  const item7_totalAdjustedMedical = item5_totalAllMedical + item6_ucSettlement;

  // Pharmacy (#8-9)
  const item8_totalRx = input.totalRx;
  const item9_rxRebates = input.rxRebates; // Negative value

  // Stop Loss (#10-11)
  const item10_stopLossFees = input.stopLossFeesSingle + input.stopLossFeesFamily;
  const item11_stopLossReimbursement = input.stopLossReimbursement; // Positive offset

  // Admin (#12-14)
  const item12_consultingFees = input.consultingFees;
  const item13_individualFees = input.individualFees;
  const item14_totalAdmin = item12_consultingFees + item13_individualFees;

  // Totals (#15-16)
  // Formula: #15 = #7 + #8 + #9 + #10 - #11 + #14
  const item15_monthlyCE =
    item7_totalAdjustedMedical +
    item8_totalRx +
    item9_rxRebates + // Already negative
    item10_stopLossFees -
    item11_stopLossReimbursement +
    item14_totalAdmin;

  const item16_cumulativeCE = cumulativeData
    ? cumulativeData.cumulativeCE + item15_monthlyCE
    : item15_monthlyCE;

  // Enrollment (#17-18)
  const item17_eeCount = input.eeCount;
  const item18_memberCount = input.memberCount;

  // PEPM (#19-21)
  const item19_pepmActualMonthly = item17_eeCount !== 0
    ? item15_monthlyCE / item17_eeCount
    : 0;

  const avgEeYtd = cumulativeData?.avgEeYtd || item17_eeCount;
  const item20_pepmActualCumulative = avgEeYtd !== 0
    ? item16_cumulativeCE / avgEeYtd
    : 0;

  const item21_pepmTarget = input.pepmBudget; // From budget config

  // Budget (#22-24)
  const item22_pepmBudget = input.pepmBudget;
  const item23_budgetEE = item17_eeCount;
  const monthlyBudget = item22_pepmBudget * item23_budgetEE;
  const item24_cumulativeBudget = cumulativeData
    ? cumulativeData.cumulativeBudget + monthlyBudget
    : monthlyBudget;

  // Variance (#25-28)
  const item25_monthlyVariance = item15_monthlyCE - monthlyBudget;
  const item26_monthlyVariancePercent = monthlyBudget !== 0
    ? item25_monthlyVariance / monthlyBudget
    : 0;

  const item27_cumulativeVariance = item16_cumulativeCE - item24_cumulativeBudget;
  const item28_cumulativeVariancePercent = item24_cumulativeBudget !== 0
    ? item27_cumulativeVariance / item24_cumulativeBudget
    : 0;

  return {
    item1_domesticInpatient,
    item2_domesticOutpatient,
    item3_totalHospital,
    item4_nonHospitalMedical,
    item5_totalAllMedical,
    item6_ucSettlement,
    item7_totalAdjustedMedical,
    item8_totalRx,
    item9_rxRebates,
    item10_stopLossFees,
    item11_stopLossReimbursement,
    item12_consultingFees,
    item13_individualFees,
    item14_totalAdmin,
    item15_monthlyCE,
    item16_cumulativeCE,
    item17_eeCount,
    item18_memberCount,
    item19_pepmActualMonthly,
    item20_pepmActualCumulative,
    item21_pepmTarget,
    item22_pepmBudget,
    item23_budgetEE,
    item24_cumulativeBudget,
    item25_monthlyVariance,
    item26_monthlyVariancePercent,
    item27_cumulativeVariance,
    item28_cumulativeVariancePercent
  };
}

/**
 * Calculate C&E summary for multiple months (year-to-date)
 */
export function calculateCeSummaryYtd(
  monthlyInputs: CeMonthlyInput[]
): CeSummaryResult[] {
  const results: CeSummaryResult[] = [];
  let cumulativeCE = 0;
  let cumulativeBudget = 0;
  let totalEe = 0;

  monthlyInputs.forEach((input, index) => {
    totalEe += input.eeCount;
    const avgEeYtd = totalEe / (index + 1);

    const result = calculateCeSummary(input, {
      cumulativeCE,
      cumulativeBudget,
      avgEeYtd
    });

    cumulativeCE = result.item16_cumulativeCE;
    cumulativeBudget = result.item24_cumulativeBudget;

    results.push(result);
  });

  return results;
}

/**
 * Apply user adjustments to specific line items
 */
export function applyUserAdjustments(
  baseInput: CeMonthlyInput,
  adjustments: {
    ucSettlement?: number;
    rxRebates?: number;
    stopLossReimbursement?: number;
  }
): CeMonthlyInput {
  return {
    ...baseInput,
    ucSettlement: adjustments.ucSettlement ?? baseInput.ucSettlement,
    rxRebates: adjustments.rxRebates ?? baseInput.rxRebates,
    stopLossReimbursement: adjustments.stopLossReimbursement ?? baseInput.stopLossReimbursement
  };
}

/**
 * Get color coding for C&E row display
 */
export function getCeRowColorCode(
  itemNumber: number,
  value: number,
  isUserAdjustment: boolean
): 'adjustment' | 'total' | 'over-budget' | 'under-budget' | 'neutral' {
  // User adjustments: light yellow
  if (isUserAdjustment || [6, 9, 11].includes(itemNumber)) {
    return 'adjustment';
  }

  // Totals: light blue
  if ([3, 5, 7, 14, 15, 16].includes(itemNumber)) {
    return 'total';
  }

  // Variance rows: red (over) / green (under)
  if ([25, 26, 27, 28].includes(itemNumber)) {
    return value > 0 ? 'over-budget' : 'under-budget';
  }

  return 'neutral';
}
