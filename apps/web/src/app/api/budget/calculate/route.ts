import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { prisma } from "../../../../../lib/prisma";
import { calculateMonthlyStats, type MonthlyActuals, type MonthlyConfig, type FeeWindowData, type BudgetConfigCalc } from "@medical-reporting/lib";

/**
 * GET /api/budget/calculate?planYearId=<uuid>
 *
 * Computes monthly variance analysis for a plan year.
 * Returns:
 * - months: array of monthly calculations
 * - ytd: year-to-date summary
 * - lastThreeMonths: last 3 months summary
 *
 * This endpoint runs the full budget vs actuals calculation engine.
 */
export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const planYearId = searchParams.get("planYearId");

    if (!planYearId) {
      return NextResponse.json(
        { error: "Missing planYearId" },
        { status: 400 }
      );
    }

    // Get user and verify access
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || !user.clientId) {
      return NextResponse.json(
        { error: "User not found or not associated with a client" },
        { status: 404 }
      );
    }

    // Verify plan year belongs to user's client
    const planYear = await prisma.planYear.findUnique({
      where: { id: planYearId },
    });

    if (!planYear || planYear.clientId !== user.clientId) {
      return NextResponse.json(
        { error: "Plan year not found or access denied" },
        { status: 403 }
      );
    }

    // Fetch all required data for calculation
    const [actuals, configs, feeWindows, budgetConfig] = await Promise.all([
      prisma.monthlyActuals.findMany({
        where: { planYearId },
        orderBy: { serviceMonth: "asc" },
      }),
      prisma.monthlyConfig.findMany({
        where: { planYearId },
        orderBy: { serviceMonth: "asc" },
      }),
      prisma.feeWindow.findMany({
        where: { planYearId },
      }),
      prisma.budgetConfig.findUnique({
        where: { planYearId },
      }),
    ]);

    // Check if we have the minimum required data
    if (actuals.length === 0) {
      return NextResponse.json(
        { error: "No actuals data found. Please upload data first." },
        { status: 404 }
      );
    }

    // Use default budget config if none exists
    const defaultBudgetConfig = {
      claimsModelType: "DIRECT",
      pctClaimsBase: "ACTUAL",
      roundingMode: "HALF_UP",
      currencyPrecision: 2,
      defaultHorizonMonths: 12,
    };

    const effectiveBudgetConfig = budgetConfig || defaultBudgetConfig;

    // Transform Prisma models to calculation engine interfaces
    const actualsInput: MonthlyActuals[] = actuals.map(a => ({
      serviceMonth: a.serviceMonth,
      domesticFacilityIpOp: a.domesticFacilityIpOp,
      nonDomesticIpOp: a.nonDomesticIpOp,
      nonHospitalMedical: a.nonHospitalMedical,
      rxClaims: a.rxClaims,
      eeCount: a.eeCount,
      memberCount: a.memberCount,
    }));

    const configsInput: MonthlyConfig[] = configs.map(c => ({
      serviceMonth: c.serviceMonth,
      expectedClaims: c.expectedClaims,
      stopLossReimb: c.stopLossReimb,
      rxRebates: c.rxRebates,
    }));

    const feeWindowsInput: FeeWindowData[] = feeWindows.map(fw => ({
      feeName: fw.feeName,
      unitType: fw.unitType as "ANNUAL" | "MONTHLY" | "PEPM" | "PEPEM" | "PERCENT_OF_CLAIMS" | "FLAT",
      rate: typeof fw.rate === 'string' ? parseFloat(fw.rate) : fw.rate,
      appliesTo: fw.appliesTo,
      effectiveStart: fw.effectiveStart,
      effectiveEnd: fw.effectiveEnd,
    }));

    const budgetConfigInput: BudgetConfigCalc = {
      claimsModelType: effectiveBudgetConfig.claimsModelType,
      pctClaimsBase: effectiveBudgetConfig.pctClaimsBase,
      roundingMode: effectiveBudgetConfig.roundingMode,
      currencyPrecision: effectiveBudgetConfig.currencyPrecision,
      defaultHorizonMonths: effectiveBudgetConfig.defaultHorizonMonths,
    };

    // Run calculation engine with properly typed inputs
    const result = calculateMonthlyStats(
      actualsInput,
      configsInput,
      feeWindowsInput,
      budgetConfigInput
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Calculate error:", error);
    // Don't leak stack traces to client in production
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'production' ? "Internal server error" : error.message },
      { status: 500 }
    );
  }
}
