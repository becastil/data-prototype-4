import { max, min, differenceInCalendarDays, getDaysInMonth, startOfMonth, endOfMonth } from "date-fns";

export interface FeeWindow {
  rate: number;
  unitType: "ANNUAL" | "MONTHLY" | "FLAT" | "PEPM" | "PEPEM" | "PERCENT_OF_CLAIMS";
  effectiveStart: Date;
  effectiveEnd: Date;
}

export interface MonthContext {
  month: Date; // First day of month
  members: number;
  employees: number;
  totalClaims: number;
  expectedClaims: number;
  pctBase: "ACTUAL" | "EXPECTED";
}

/**
 * Prorates an annual/monthly/flat fee for partial month overlap.
 * Handles mid-year changes by calculating days of overlap between
 * the fee's effective window and the calendar month.
 *
 * @param rate - The fee rate
 * @param unit - The unit type (ANNUAL, MONTHLY, or FLAT)
 * @param window - The effective date range for the fee
 * @param month - The target month (as first day of month)
 * @returns The prorated fee amount for the month
 */
export function prorateForMonth(
  rate: number,
  unit: "ANNUAL" | "MONTHLY" | "FLAT",
  window: { start: Date; end: Date },
  month: Date
): number {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);

  // Find overlap between fee window and calendar month
  const overlapStart = max([monthStart, window.start]);
  const overlapEnd = min([monthEnd, window.end]);

  // No overlap means no fee applies this month
  if (overlapEnd < overlapStart) {
    return 0;
  }

  const daysInMonth = getDaysInMonth(month);
  const overlapDays = differenceInCalendarDays(overlapEnd, overlapStart) + 1;

  if (overlapDays <= 0) {
    return 0;
  }

  const prorationFactor = overlapDays / daysInMonth;

  if (unit === "ANNUAL") {
    // Annual rate divided by 12, then prorated
    return (rate / 12) * prorationFactor;
  }

  if (unit === "MONTHLY" || unit === "FLAT") {
    // Monthly/flat rate prorated by days
    return rate * prorationFactor;
  }

  return 0;
}

/**
 * Calculates the fee amount for a given month, handling all unit types.
 * Automatically applies proration for ANNUAL/MONTHLY/FLAT fees.
 *
 * @param fee - The fee configuration
 * @param ctx - The month context with enrollment and claims data
 * @returns The calculated fee amount for the month
 */
export function feeForMonth(fee: FeeWindow, ctx: MonthContext): number {
  const { unitType, rate, effectiveStart, effectiveEnd } = fee;

  switch (unitType) {
    case "PEPM":
      // Per employee per month - multiply by member count
      return rate * ctx.members;

    case "PEPEM":
      // Per employee per month - multiply by employee count
      return rate * ctx.employees;

    case "PERCENT_OF_CLAIMS": {
      // Percentage of claims - use either actual or expected claims as base
      const base = ctx.pctBase === "EXPECTED" ? ctx.expectedClaims : ctx.totalClaims;
      return rate * base;
    }

    case "ANNUAL":
    case "MONTHLY":
    case "FLAT":
      // Apply proration for these unit types
      return prorateForMonth(
        rate,
        unitType,
        { start: effectiveStart, end: effectiveEnd },
        ctx.month
      );

    default:
      return 0;
  }
}

/**
 * Calculates all fees for a given month across multiple fee windows.
 * Returns both the total and a breakdown by fee.
 *
 * @param feeWindows - Array of fee configurations
 * @param ctx - The month context
 * @returns Object with total fees and breakdown array
 */
export function calculateMonthlyFees(
  feeWindows: FeeWindow[],
  ctx: MonthContext
): { total: number; breakdown: Array<{ feeName: string; amount: number }> } {
  const breakdown: Array<{ feeName: string; amount: number }> = [];
  let total = 0;

  for (const fee of feeWindows) {
    const amount = feeForMonth(fee, ctx);

    if (amount > 0) {
      breakdown.push({
        feeName: (fee as any).feeName || "Unknown Fee",
        amount,
      });
      total += amount;
    }
  }

  return { total, breakdown };
}

/**
 * Safe division helper - returns 0 if denominator is 0
 */
export function safeDivide(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}
