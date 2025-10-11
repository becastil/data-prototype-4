import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calculateMonthlyColumns } from '@medical-reporting/lib/formulas/monthly-columns';
import { calculatePepm } from '@medical-reporting/lib/formulas/pepm';

const prisma = new PrismaClient();

/**
 * GET /api/monthly/:planId
 *
 * Returns monthly detail data for a specific plan
 * Includes A-N columns and PEPM calculations
 *
 * Query params:
 * - clientId: UUID
 * - planYearId: UUID
 * - through: YYYY-MM (optional, defaults to latest month)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { planId: string } }
) {
  try {
    const { planId } = params;
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const planYearId = searchParams.get('planYearId');
    const through = searchParams.get('through');

    if (!clientId || !planYearId) {
      return NextResponse.json(
        { error: 'clientId and planYearId are required' },
        { status: 400 }
      );
    }

    // Fetch plan details
    const plan = await prisma.plan.findUnique({
      where: { id: planId }
    });

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan not found' },
        { status: 404 }
      );
    }

    // Fetch all month snapshots for the plan year
    const snapshots = await prisma.monthSnapshot.findMany({
      where: {
        clientId,
        planYearId,
        ...(through && { monthDate: { lte: new Date(through + '-01') } })
      },
      include: {
        planStats: {
          where: {
            planId
          }
        }
      },
      orderBy: {
        monthDate: 'asc'
      }
    });

    if (snapshots.length === 0) {
      return NextResponse.json(
        { error: 'No data found for the specified plan and plan year' },
        { status: 404 }
      );
    }

    // Extract plan-specific data and calculate columns
    const monthlyData = snapshots
      .filter(snapshot => snapshot.planStats.length > 0)
      .map(snapshot => {
        const stat = snapshot.planStats[0];

        const planData = {
          totalSubscribers: stat.totalSubscribers,
          medicalPaid: Number(stat.medicalPaid),
          rxPaid: Number(stat.rxPaid),
          specStopLossReimb: Number(stat.specStopLossReimb),
          estRxRebates: Number(stat.estRxRebates),
          adminFees: Number(stat.adminFees),
          stopLossFees: Number(stat.stopLossFees),
          budgetedPremium: Number(stat.budgetedPremium)
        };

        // Calculate A-N columns
        const columns = calculateMonthlyColumns(planData);

        return {
          monthDate: snapshot.monthDate,
          ...planData,
          ...columns
        };
      });

    // Calculate PEPM for rolling windows
    const current12Months = monthlyData.slice(-12);
    const prior12Months = monthlyData.slice(-24, -12);

    const medicalPepm = {
      current: current12Months.length >= 12 ? calculatePepm({
        months: current12Months.map(m => ({
          subscribers: m.totalSubscribers,
          metric: m.medicalPaid
        }))
      }) : null,
      prior: prior12Months.length >= 12 ? calculatePepm({
        months: prior12Months.map(m => ({
          subscribers: m.totalSubscribers,
          metric: m.medicalPaid
        }))
      }) : null
    };

    const rxPepm = {
      current: current12Months.length >= 12 ? calculatePepm({
        months: current12Months.map(m => ({
          subscribers: m.totalSubscribers,
          metric: m.rxPaid
        }))
      }) : null,
      prior: prior12Months.length >= 12 ? calculatePepm({
        months: prior12Months.map(m => ({
          subscribers: m.totalSubscribers,
          metric: m.rxPaid
        }))
      }) : null
    };

    const totalPepm = {
      current: current12Months.length >= 12 ? calculatePepm({
        months: current12Months.map(m => ({
          subscribers: m.totalSubscribers,
          metric: m.medicalPaid + m.rxPaid
        }))
      }) : null,
      prior: prior12Months.length >= 12 ? calculatePepm({
        months: prior12Months.map(m => ({
          subscribers: m.totalSubscribers,
          metric: m.medicalPaid + m.rxPaid
        }))
      }) : null
    };

    // Calculate YTD summary
    const ytdSummary = monthlyData.reduce(
      (acc, month) => ({
        totalSubscribers: month.totalSubscribers, // Latest month
        medicalPaid: acc.medicalPaid + month.medicalPaid,
        rxPaid: acc.rxPaid + month.rxPaid,
        totalPaid: acc.totalPaid + month.totalPaid,
        netPaid: acc.netPaid + month.netPaid,
        totalCost: acc.totalCost + month.totalCost,
        budgetedPremium: acc.budgetedPremium + month.budgetedPremium,
        surplusDeficit: acc.surplusDeficit + month.surplusDeficit
      }),
      {
        totalSubscribers: 0,
        medicalPaid: 0,
        rxPaid: 0,
        totalPaid: 0,
        netPaid: 0,
        totalCost: 0,
        budgetedPremium: 0,
        surplusDeficit: 0
      }
    );

    // Calculate YTD % of Budget
    ytdSummary.percentOfBudget = ytdSummary.budgetedPremium !== 0
      ? ytdSummary.totalCost / ytdSummary.budgetedPremium
      : 0;

    return NextResponse.json({
      plan: {
        id: plan.id,
        name: plan.name,
        code: plan.code
      },
      monthlyData,
      ytdSummary,
      pepm: {
        medical: medicalPepm,
        rx: rxPepm,
        total: totalPepm
      }
    });

  } catch (error) {
    console.error('Error fetching plan-specific monthly data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
