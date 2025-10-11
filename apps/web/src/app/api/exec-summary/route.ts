import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calculateExecutiveYtd, calculatePlanMix, calculateClaimantBuckets } from '@/lib';

const prisma = new PrismaClient();

/**
 * GET /api/exec-summary
 * Returns Executive Summary data (Template Page 2)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const clientId = searchParams.get('clientId') || '00000000-0000-0000-0000-000000000001';
    const planYearId = searchParams.get('planYearId') || '00000000-0000-0000-0000-000000000301';

    // Fetch all monthly stats for the plan year
    const snapshots = await prisma.monthSnapshot.findMany({
      where: {
        clientId,
        planYearId
      },
      include: {
        planStats: {
          include: {
            plan: true
          }
        }
      },
      orderBy: {
        monthDate: 'asc'
      }
    });

    // Get "All Plans" monthly data
    const allPlansStats = snapshots.flatMap(s =>
      s.planStats.filter(ps => ps.plan.type === 'ALL_PLANS')
    );

    // Transform to MonthlyColumnsResult format
    const monthlyResults = allPlansStats.map(stat => ({
      month: stat.snapshot.monthDate.toISOString().slice(0, 7),
      totalSubscribers: stat.totalSubscribers,
      medicalPaid: Number(stat.medicalPaid),
      rxPaid: Number(stat.rxPaid),
      totalPaid: Number(stat.medicalPaid) + Number(stat.rxPaid),
      specStopLossReimb: Number(stat.specStopLossReimb),
      estRxRebates: Number(stat.estRxRebates),
      netPaid: Number(stat.medicalPaid) + Number(stat.rxPaid) + Number(stat.specStopLossReimb) + Number(stat.estRxRebates),
      adminFees: Number(stat.adminFees),
      stopLossFees: Number(stat.stopLossFees),
      totalCost: 0, // Calculated below
      budgetedPremium: Number(stat.budgetedPremium),
      surplusDeficit: 0,
      percentOfBudget: 0
    }));

    // Calculate totals
    monthlyResults.forEach(m => {
      m.totalCost = m.netPaid + m.adminFees + m.stopLossFees;
      m.surplusDeficit = m.budgetedPremium - m.totalCost;
      m.percentOfBudget = m.budgetedPremium !== 0 ? m.totalCost / m.budgetedPremium : 0;
    });

    // Get IBNR from inputs
    const inputs = await prisma.input.findFirst({
      where: { clientId, planYearId }
    });

    const ibnr = Number(inputs?.ibnrAdjustment || 0);

    // Calculate executive YTD
    const executiveYtd = calculateExecutiveYtd({
      months: monthlyResults,
      ibnr
    });

    // Get plan mix
    const planStats = snapshots.flatMap(s => s.planStats.filter(ps => ps.plan.type !== 'ALL_PLANS'));
    const planMixData = planStats.reduce((acc, stat) => {
      const existing = acc.find(p => p.planName === stat.plan.name);
      const cost = Number(stat.medicalPaid) + Number(stat.rxPaid) + Number(stat.adminFees) + Number(stat.stopLossFees);

      if (existing) {
        existing.totalCost += cost;
      } else {
        acc.push({
          planName: stat.plan.name,
          totalCost: cost
        });
      }
      return acc;
    }, [] as Array<{ planName: string; totalCost: number }>);

    const planMix = calculatePlanMix(planMixData);

    // Get high claimants
    const highClaimants = await prisma.highClaimant.findMany({
      where: { clientId, planYearId }
    });

    const claimantBuckets = calculateClaimantBuckets(
      highClaimants.map(c => ({ totalPaid: Number(c.totalPaid) }))
    );

    return NextResponse.json({
      executiveYtd,
      planMix,
      claimantBuckets,
      monthlyResults
    });

  } catch (error) {
    console.error('Executive summary error:', error);
    return NextResponse.json(
      { error: 'Failed to generate executive summary' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
