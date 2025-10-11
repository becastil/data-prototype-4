import { z } from 'zod';

// ============================================
// Core Types
// ============================================

export const MonthlyPlanDataSchema = z.object({
  month: z.string(), // YYYY-MM format
  planId: z.string(),
  planName: z.string(),
  totalSubscribers: z.number().int().nonnegative(), // Column B
  medicalPaid: z.number(), // Column C
  rxPaid: z.number(), // Column D
  specStopLossReimb: z.number().default(0), // Column F (negative)
  estRxRebates: z.number().default(0), // Column G (negative)
  adminFees: z.number(), // Column I
  stopLossFees: z.number(), // Column J
  budgetedPremium: z.number(), // Column L
});

export type MonthlyPlanData = z.infer<typeof MonthlyPlanDataSchema>;

export interface MonthlyColumnsResult {
  // A-N columns from template
  month: string; // A
  totalSubscribers: number; // B
  medicalPaid: number; // C
  rxPaid: number; // D
  totalPaid: number; // E = C + D
  specStopLossReimb: number; // F
  estRxRebates: number; // G
  netPaid: number; // H = E + F + G
  adminFees: number; // I
  stopLossFees: number; // J
  totalCost: number; // K = H + I + J
  budgetedPremium: number; // L
  surplusDeficit: number; // M = L - K
  percentOfBudget: number; // N = K / L (as decimal, e.g., 0.94)
}

// ============================================
// PEPM Types
// ============================================

export interface PepmInput {
  months: Array<{
    month: string;
    subscribers: number;
    metric: number; // e.g., medicalPaid, rxPaid, totalCost
  }>;
}

export interface PepmResult {
  current12: {
    totalMetric: number;
    memberMonths: number;
    avgSubscribers: number;
    pepm: number;
  };
  prior12: {
    totalMetric: number;
    memberMonths: number;
    avgSubscribers: number;
    pepm: number;
  };
  change: {
    absolute: number;
    percent: number;
  };
}

// ============================================
// C&E Summary Types (28 rows)
// ============================================

export interface CeMonthlyInput {
  // Medical (#1-5)
  domesticInpatient: number;
  domesticOutpatient: number;
  nonDomesticInpatient: number;
  nonDomesticOutpatient: number;
  nonHospitalMedical: number;

  // Adjustments
  ucSettlement: number; // #6 (user-adjustable)

  // Pharmacy
  totalRx: number; // #8
  rxRebates: number; // #9 (user-adjustable, negative)

  // Stop Loss
  stopLossFeesSingle: number;
  stopLossFeesFamily: number;
  stopLossReimbursement: number; // #11 (user-adjustable, positive offset)

  // Admin
  consultingFees: number;
  individualFees: number; // PEPM/PMPM/Flat combined

  // Enrollment
  eeCount: number; // #17
  memberCount: number; // #18

  // Budget
  pepmBudget: number; // #22
}

export interface CeSummaryResult {
  // Medical (#1-7)
  item1_domesticInpatient: number;
  item2_domesticOutpatient: number;
  item3_totalHospital: number; // #1 + #2
  item4_nonHospitalMedical: number;
  item5_totalAllMedical: number; // #3 + #4
  item6_ucSettlement: number; // User-adjustable
  item7_totalAdjustedMedical: number; // #5 + #6

  // Pharmacy (#8-9)
  item8_totalRx: number;
  item9_rxRebates: number; // User-adjustable, negative

  // Stop Loss (#10-11)
  item10_stopLossFees: number;
  item11_stopLossReimbursement: number; // User-adjustable, positive offset

  // Admin (#12-14)
  item12_consultingFees: number;
  item13_individualFees: number;
  item14_totalAdmin: number; // #12 + #13

  // Totals (#15-16)
  item15_monthlyCE: number; // #7 + #8 + #9 + #10 - #11 + #14
  item16_cumulativeCE: number; // Running sum (must be calculated externally)

  // Enrollment (#17-18)
  item17_eeCount: number;
  item18_memberCount: number;

  // PEPM (#19-21)
  item19_pepmActualMonthly: number; // #15 / #17
  item20_pepmActualCumulative: number; // #16 / Avg(EE YTD)
  item21_pepmTarget: number;

  // Budget (#22-24)
  item22_pepmBudget: number;
  item23_budgetEE: number; // Same as #17
  item24_cumulativeBudget: number; // Σ(#22 × EE) through period

  // Variance (#25-28)
  item25_monthlyVariance: number; // #15 - (#22 × EE)
  item26_monthlyVariancePercent: number; // #25 / (#22 × EE)
  item27_cumulativeVariance: number; // #16 - #24
  item28_cumulativeVariancePercent: number; // #27 / #24
}

// ============================================
// Executive Summary Types
// ============================================

export interface ExecutiveYtdInput {
  months: MonthlyColumnsResult[];
  ibnr: number;
}

export interface ExecutiveYtdResult {
  budgetedPremium: number; // Σ L
  totalPaid: number; // Σ E
  netPaid: number; // Σ H
  adminFees: number; // Σ I
  stopLossFees: number; // Σ J
  ibnr: number;
  totalPlanCost: number; // Net + Admin + Stop Loss + IBNR
  surplusDeficit: number; // Premium - Cost
  percentOfBudget: number; // Cost / Premium (as decimal)

  // Fuel gauge status
  fuelGaugeStatus: 'GREEN' | 'YELLOW' | 'RED'; // <95% | 95-105% | >105%

  // Distribution
  medicalTotal: number;
  rxTotal: number;
  medicalPercent: number;
  rxPercent: number;
}

// ============================================
// High-Cost Claimants Types
// ============================================

export interface HighClaimantInput {
  claimantKey: string;
  planName: string;
  status: 'ACTIVE' | 'RESOLVED' | 'PENDING';
  primaryDiagnosis?: string;
  medPaid: number;
  rxPaid: number;
}

export interface HighClaimantResult extends HighClaimantInput {
  totalPaid: number;
  percentOfIsl: number;
  amountExceedingIsl: number;
  employerShare: number;
  stopLossShare: number;
}

export interface HighClaimantSummary {
  islThreshold: number;
  qualifyingThreshold: number; // 50% of ISL
  claimants: HighClaimantResult[];
  totalClaimants: number;
  totalPaid: number;
  totalExceedingIsl: number;
  employerTotal: number;
  stopLossTotal: number;
}

// ============================================
// Utility Types
// ============================================

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ReconciliationResult {
  match: boolean;
  tolerance: number;
  difference: number;
  allPlansTotal: number;
  sumOfPlanTotals: number;
  errors: ValidationError[];
}
