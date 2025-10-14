import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@auth0/nextjs-auth0";
import { PrismaClient } from "@prisma/client";
import {
  BudgetConfigSchema,
  FeeWindowSchema,
  MonthlyConfigSchema,
} from "@medical-reporting/lib";

/**
 * GET /api/budget/config?planYearId=<uuid>
 *
 * Retrieves budget configuration for a plan year including:
 * - Budget config (rounding, precision, etc.)
 * - Monthly configs (expected claims, adjustments)
 * - Fee windows (rates and effective dates)
 *
 * Returns full configuration object
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

    // Fetch all config data
    const [budgetConfig, monthlyConfigs, feeWindows] = await Promise.all([
      prisma.budgetConfig.findUnique({ where: { planYearId } }),
      prisma.monthlyConfig.findMany({
        where: { planYearId },
        orderBy: { serviceMonth: "asc" },
      }),
      prisma.feeWindow.findMany({
        where: { planYearId },
        orderBy: { effectiveStart: "asc" },
      }),
    ]);

    await prisma.$disconnect();

    return NextResponse.json({
      budgetConfig,
      monthlyConfigs,
      feeWindows,
    });
  } catch (error: any) {
    console.error("Config fetch error:", error);
    await prisma.$disconnect();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/budget/config
 *
 * Saves/updates budget configuration.
 * Upserts budget config, monthly configs, and fee windows in a transaction.
 *
 * Request body:
 * {
 *   planYearId: string,
 *   budgetConfig?: BudgetConfig,
 *   monthlyConfigs?: MonthlyConfig[],
 *   feeWindows?: FeeWindow[]
 * }
 */
export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = new PrismaClient();

  try {
    const body = await req.json();
    const { planYearId, budgetConfig, monthlyConfigs, feeWindows } = body;

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

    // Save all config data in transaction
    await prisma.$transaction(async (tx) => {
      // Upsert budget config
      if (budgetConfig) {
        const validated = BudgetConfigSchema.parse({
          ...budgetConfig,
          planYearId,
        });

        await tx.budgetConfig.upsert({
          where: { planYearId },
          create: validated,
          update: {
            claimsModelType: validated.claimsModelType,
            pctClaimsBase: validated.pctClaimsBase,
            roundingMode: validated.roundingMode,
            currencyPrecision: validated.currencyPrecision,
            defaultHorizonMonths: validated.defaultHorizonMonths,
          },
        });
      }

      // Upsert monthly configs
      if (monthlyConfigs && Array.isArray(monthlyConfigs)) {
        for (const mc of monthlyConfigs) {
          const validated = MonthlyConfigSchema.parse(mc);

          await tx.monthlyConfig.upsert({
            where: {
              planYearId_serviceMonth: {
                planYearId,
                serviceMonth: validated.serviceMonth,
              },
            },
            create: {
              planYearId,
              serviceMonth: validated.serviceMonth,
              expectedClaims: validated.expectedClaims,
              stopLossReimb: validated.stopLossReimb,
              rxRebates: validated.rxRebates,
            },
            update: {
              expectedClaims: validated.expectedClaims,
              stopLossReimb: validated.stopLossReimb,
              rxRebates: validated.rxRebates,
            },
          });
        }
      }

      // Upsert fee windows
      if (feeWindows && Array.isArray(feeWindows)) {
        for (const fw of feeWindows) {
          const validated = FeeWindowSchema.parse({ ...fw, planYearId });

          if (fw.id) {
            // Update existing
            await tx.feeWindow.update({
              where: { id: fw.id },
              data: {
                feeName: validated.feeName,
                unitType: validated.unitType,
                rate: validated.rate,
                appliesTo: validated.appliesTo,
                effectiveStart: validated.effectiveStart,
                effectiveEnd: validated.effectiveEnd,
              },
            });
          } else {
            // Create new
            await tx.feeWindow.create({
              data: {
                planYearId,
                feeName: validated.feeName,
                unitType: validated.unitType,
                rate: validated.rate,
                appliesTo: validated.appliesTo,
                effectiveStart: validated.effectiveStart,
                effectiveEnd: validated.effectiveEnd,
              },
            });
          }
        }
      }
    });

    await prisma.$disconnect();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Config save error:", error);
    await prisma.$disconnect();
    return NextResponse.json(
      { error: error.message, details: error.issues || [] },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/budget/config/fee?id=<uuid>
 *
 * Deletes a specific fee window
 */
export async function DELETE(req: NextRequest) {
  const session = await getSession();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = new PrismaClient();

  try {
    const { searchParams } = new URL(req.url);
    const feeId = searchParams.get("id");

    if (!feeId) {
      return NextResponse.json({ error: "Missing fee id" }, { status: 400 });
    }

    // Verify ownership via plan year
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
    });

    if (!user || !user.clientId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const feeWindow = await prisma.feeWindow.findUnique({
      where: { id: feeId },
      include: { planYear: true },
    });

    if (!feeWindow || feeWindow.planYear.clientId !== user.clientId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.feeWindow.delete({ where: { id: feeId } });
    await prisma.$disconnect();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Fee delete error:", error);
    await prisma.$disconnect();
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
