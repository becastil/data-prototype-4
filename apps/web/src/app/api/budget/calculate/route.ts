import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { PrismaClient } from "@prisma/client";
import { calculateMonthlyStats } from "@medical-reporting/lib";

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

  const prisma = new PrismaClient();

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

    // Run calculation engine
    const result = calculateMonthlyStats(
      actuals as any,
      configs as any,
      feeWindows as any,
      effectiveBudgetConfig as any
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Calculate error:", error);
    return NextResponse.json(
      { error: error.message, stack: error.stack },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
