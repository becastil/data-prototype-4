import { startOfMonth } from "date-fns";
import { feeForMonth, safeDivide, type MonthContext } from "./fee-proration";

// Types matching Prisma models
export interface MonthlyActuals {
  serviceMonth: Date;
  domesticFacilityIpOp: number | string;
  nonDomesticIpOp: number | string;
  nonHospitalMedical: number | string;
  rxClaims: number | string;
  eeCount: number;
  memberCount: number;
}

export interface MonthlyConfig {
  serviceMonth: Date;
  expectedClaims: number | string;
  stopLossReimb: number | string;
  rxRebates: number | string;
}

export interface FeeWindowData {
  feeName: string;
  unitType: "ANNUAL" | "MONTHLY" | "PEPM" | "PEPEM" | "PERCENT_OF_CLAIMS" | "FLAT";
  rate: number | string;
  appliesTo: string;
  effectiveStart: Date;
  effectiveEnd: Date;
}

export interface BudgetConfig {
  claimsModelType: string;
  pctClaimsBase: string;
  roundingMode: string;
  currencyPrecision: number;
  defaultHorizonMonths: number;
}

export interface MonthlyCalculation {
  month: Date;
  eeCount: number;
  memberCount: number;

  // Claims breakdown
  totalClaims: number;

  // Fixed costs
  fixedCosts: number;
  fixedCostsBreakdown: Array<{ feeName: string; amount: number }>;

  // Adjustments
  stopLossReimb: number;
  rxRebates: number;

  // Actuals
  actualTotalExpenses: number;

  // Budget
  expectedClaimsBudget: number;
  budgetedFixedCosts: number;
  budgetTotalExpenses: number;

  // Variance
  varianceDollars: number;
  variancePercent: number;

  // PEPM metrics
  pepm: number;
  pepem: number;
}

export interface YTDSummary {
  months: MonthlyCalculation[];
  ytd: Omit<MonthlyCalculation, "month">;
  lastThreeMonths: Omit<MonthlyCalculation, "month">;
}

/**
 * Applies rounding based on configured mode
 */
function applyRounding(value: number, mode: string, precision: number): number {
  const factor = Math.pow(10, precision);

  if (mode === "BANKER") {
    // Banker's rounding (round half to even)
    const scaled = value * factor;
    const rounded = Math.round(scaled);
    const diff = Math.abs(scaled - rounded);

    // If exactly 0.5, round to even
    if (diff === 0.5) {
      return (rounded % 2 === 0 ? rounded : Math.floor(scaled)) / factor;
    }

    return rounded / factor;
  }

  // Default: HALF_UP (standard rounding)
  return Math.round(value * factor) / factor;
}

/**
 * Converts Prisma Decimal or string to number
 */
function toNumber(val: number | string): number {
  return typeof val === "string" ? parseFloat(val) : val;
}

/**
 * Main calculation engine: computes monthly variance analysis
 */
export function calculateMonthlyStats(
  actuals: MonthlyActuals[],
  configs: MonthlyConfig[],
  feeWindows: FeeWindowData[],
  budgetConfig: BudgetConfig
): YTDSummary {
  const calculations: MonthlyCalculation[] = [];

  // Process each month of actuals
  actuals.forEach((actual) => {
    const month = startOfMonth(actual.serviceMonth);

    // Find matching config for this month
    const config = configs.find(
      (c) => startOfMonth(c.serviceMonth).getTime() === month.getTime()
    );

    // Calculate total claims (sum of all claims categories)
    const totalClaims =
      toNumber(actual.domesticFacilityIpOp) +
      toNumber(actual.nonDomesticIpOp) +
      toNumber(actual.nonHospitalMedical) +
      toNumber(actual.rxClaims);

    const expectedClaims = config ? toNumber(config.expectedClaims) : 0;

    // Build context for fee calculations
    const ctx: MonthContext = {
      month,
      members: actual.memberCount,
      employees: actual.eeCount,
      totalClaims,
      expectedClaims,
      pctBase: (budgetConfig.pctClaimsBase as "ACTUAL" | "EXPECTED") || "ACTUAL",
    };

    // Calculate fixed costs from all applicable fee windows
    const fixedFees = feeWindows.filter((fw) => fw.appliesTo === "FIXED");
    const fixedCostsBreakdown: Array<{ feeName: string; amount: number }> = [];
    let fixedCosts = 0;

    for (const fw of fixedFees) {
      const amount = feeForMonth(
        {
          rate: toNumber(fw.rate),
          unitType: fw.unitType,
          effectiveStart: fw.effectiveStart,
          effectiveEnd: fw.effectiveEnd,
        },
        ctx
      );

      if (amount > 0) {
        fixedCostsBreakdown.push({
          feeName: fw.feeName,
          amount,
        });
        fixedCosts += amount;
      }
    }

    // Get adjustments
    const stopLossReimb = config ? toNumber(config.stopLossReimb) : 0;
    const rxRebates = config ? toNumber(config.rxRebates) : 0;

    // Calculate actual total expenses
    // Formula: Claims + Fixed Costs - Stop Loss Reimbursements - Rx Rebates
    const actualTotalExpenses = totalClaims + fixedCosts - stopLossReimb - rxRebates;

    // Calculate budget
    const expectedClaimsBudget = expectedClaims;
    const budgetedFixedCosts = fixedCosts; // Same fixed costs for budget
    const budgetTotalExpenses = expectedClaimsBudget + budgetedFixedCosts;

    // Calculate variance
    const varianceDollars = actualTotalExpenses - budgetTotalExpenses;
    const variancePercent = safeDivide(varianceDollars, budgetTotalExpenses) * 100;

    // Calculate PEPM metrics
    const pepm = safeDivide(actualTotalExpenses, actual.memberCount);
    const pepem = safeDivide(actualTotalExpenses, actual.eeCount);

    // Apply rounding to all currency values
    const calc: MonthlyCalculation = {
      month,
      eeCount: actual.eeCount,
      memberCount: actual.memberCount,
      totalClaims: applyRounding(
        totalClaims,
        budgetConfig.roundingMode,
        budgetConfig.currencyPrecision
      ),
      fixedCosts: applyRounding(
        fixedCosts,
        budgetConfig.roundingMode,
        budgetConfig.currencyPrecision
      ),
      fixedCostsBreakdown,
      stopLossReimb: applyRounding(
        stopLossReimb,
        budgetConfig.roundingMode,
        budgetConfig.currencyPrecision
      ),
      rxRebates: applyRounding(
        rxRebates,
        budgetConfig.roundingMode,
        budgetConfig.currencyPrecision
      ),
      actualTotalExpenses: applyRounding(
        actualTotalExpenses,
        budgetConfig.roundingMode,
        budgetConfig.currencyPrecision
      ),
      expectedClaimsBudget: applyRounding(
        expectedClaimsBudget,
        budgetConfig.roundingMode,
        budgetConfig.currencyPrecision
      ),
      budgetedFixedCosts: applyRounding(
        budgetedFixedCosts,
        budgetConfig.roundingMode,
        budgetConfig.currencyPrecision
      ),
      budgetTotalExpenses: applyRounding(
        budgetTotalExpenses,
        budgetConfig.roundingMode,
        budgetConfig.currencyPrecision
      ),
      varianceDollars: applyRounding(
        varianceDollars,
        budgetConfig.roundingMode,
        budgetConfig.currencyPrecision
      ),
      variancePercent: applyRounding(variancePercent, budgetConfig.roundingMode, 2),
      pepm: applyRounding(
        pepm,
        budgetConfig.roundingMode,
        budgetConfig.currencyPrecision
      ),
      pepem: applyRounding(
        pepem,
        budgetConfig.roundingMode,
        budgetConfig.currencyPrecision
      ),
    };

    calculations.push(calc);
  });

  // Compute YTD summary
  const ytd = aggregateCalculations(calculations, budgetConfig);

  // Last 3 months summary
  const lastThreeMonths = aggregateCalculations(
    calculations.slice(-3),
    budgetConfig
  );

  return {
    months: calculations,
    ytd,
    lastThreeMonths,
  };
}

/**
 * Aggregates multiple monthly calculations into a summary
 */
function aggregateCalculations(
  calcs: MonthlyCalculation[],
  budgetConfig: BudgetConfig
): Omit<MonthlyCalculation, "month"> {
  if (calcs.length === 0) {
    return {
      eeCount: 0,
      memberCount: 0,
      totalClaims: 0,
      fixedCosts: 0,
      fixedCostsBreakdown: [],
      stopLossReimb: 0,
      rxRebates: 0,
      actualTotalExpenses: 0,
      expectedClaimsBudget: 0,
      budgetedFixedCosts: 0,
      budgetTotalExpenses: 0,
      varianceDollars: 0,
      variancePercent: 0,
      pepm: 0,
      pepem: 0,
    };
  }

  const sumField = (field: keyof MonthlyCalculation) =>
    calcs.reduce((sum, c) => sum + (c[field] as number), 0);

  const totalClaims = sumField("totalClaims");
  const fixedCosts = sumField("fixedCosts");
  const stopLossReimb = sumField("stopLossReimb");
  const rxRebates = sumField("rxRebates");
  const actualTotalExpenses = sumField("actualTotalExpenses");
  const budgetTotalExpenses = sumField("budgetTotalExpenses");
  const expectedClaimsBudget = sumField("expectedClaimsBudget");

  const varianceDollars = actualTotalExpenses - budgetTotalExpenses;
  const variancePercent = safeDivide(varianceDollars, budgetTotalExpenses) * 100;

  const totalMembers = sumField("memberCount");
  const totalEmployees = sumField("eeCount");

  return {
    eeCount: totalEmployees,
    memberCount: totalMembers,
    totalClaims: applyRounding(
      totalClaims,
      budgetConfig.roundingMode,
      budgetConfig.currencyPrecision
    ),
    fixedCosts: applyRounding(
      fixedCosts,
      budgetConfig.roundingMode,
      budgetConfig.currencyPrecision
    ),
    fixedCostsBreakdown: [],
    stopLossReimb: applyRounding(
      stopLossReimb,
      budgetConfig.roundingMode,
      budgetConfig.currencyPrecision
    ),
    rxRebates: applyRounding(
      rxRebates,
      budgetConfig.roundingMode,
      budgetConfig.currencyPrecision
    ),
    actualTotalExpenses: applyRounding(
      actualTotalExpenses,
      budgetConfig.roundingMode,
      budgetConfig.currencyPrecision
    ),
    expectedClaimsBudget: applyRounding(
      expectedClaimsBudget,
      budgetConfig.roundingMode,
      budgetConfig.currencyPrecision
    ),
    budgetedFixedCosts: applyRounding(
      fixedCosts,
      budgetConfig.roundingMode,
      budgetConfig.currencyPrecision
    ),
    budgetTotalExpenses: applyRounding(
      budgetTotalExpenses,
      budgetConfig.roundingMode,
      budgetConfig.currencyPrecision
    ),
    varianceDollars: applyRounding(
      varianceDollars,
      budgetConfig.roundingMode,
      budgetConfig.currencyPrecision
    ),
    variancePercent: applyRounding(variancePercent, budgetConfig.roundingMode, 2),
    pepm: applyRounding(
      safeDivide(actualTotalExpenses, totalMembers),
      budgetConfig.roundingMode,
      budgetConfig.currencyPrecision
    ),
    pepem: applyRounding(
      safeDivide(actualTotalExpenses, totalEmployees),
      budgetConfig.roundingMode,
      budgetConfig.currencyPrecision
    ),
  };
}
