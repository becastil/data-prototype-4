import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calculateMonthlyColumns } from '@medical-reporting/lib/formulas/monthly-columns';
import { calculatePepm } from '@medical-reporting/lib/formulas/pepm';

const prisma = new PrismaClient();

/**
 * GET /api/monthly/all-plans
 *
 * Returns monthly detail data for "All Plans" combined
 * Includes A-N columns and PEPM calculations
 *
 * Query params:
 * - clientId: UUID
 * - planYearId: UUID
 * - through: YYYY-MM (optional, defaults to latest month)
 */
export async function GET(request: NextRequest) {
  try {
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

    // Fetch all month snapshots for the plan year
    const snapshots = await prisma.monthSnapshot.findMany({
      where: {
        clientId,
        planYearId,
        ...(through && { monthDate: { lte: new Date(through + '-01') } })
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

    if (snapshots.length === 0) {
      return NextResponse.json(
        { error: 'No data found for the specified plan year' },
        { status: 404 }
      );
    }

    // Aggregate all plans for each month
    const monthlyData = snapshots.map(snapshot => {
      // Sum all plan stats for this month
      const aggregated = snapshot.planStats.reduce(
        (acc, stat) => ({
          totalSubscribers: acc.totalSubscribers + stat.totalSubscribers,
          medicalPaid: acc.medicalPaid + Number(stat.medicalPaid),
          rxPaid: acc.rxPaid + Number(stat.rxPaid),
          specStopLossReimb: acc.specStopLossReimb + Number(stat.specStopLossReimb),
          estRxRebates: acc.estRxRebates + Number(stat.estRxRebates),
          adminFees: acc.adminFees + Number(stat.adminFees),
          stopLossFees: acc.stopLossFees + Number(stat.stopLossFees),
          budgetedPremium: acc.budgetedPremium + Number(stat.budgetedPremium)
        }),
        {
          totalSubscribers: 0,
          medicalPaid: 0,
          rxPaid: 0,
          specStopLossReimb: 0,
          estRxRebates: 0,
          adminFees: 0,
          stopLossFees: 0,
          budgetedPremium: 0
        }
      );

      // Calculate A-N columns
      const monthData = {
        ...aggregated,
        month: snapshot.monthDate.toISOString().substring(0, 7),
        planId: 'all-plans',
        planName: 'All Plans'
      };
      const columns = calculateMonthlyColumns(monthData);

      return {
        monthDate: snapshot.monthDate,
        ...aggregated,
        ...columns
      };
    });

    // Calculate PEPM for rolling windows
    const current12Months = monthlyData.slice(-12);
    const prior12Months = monthlyData.slice(-24, -12);

    const medicalPepm = {
      current: current12Months.length >= 12 ? calculatePepm({
        months: current12Months.map(m => ({
          month: m.monthDate.toISOString().substring(0, 7),
          subscribers: m.totalSubscribers,
          metric: m.medicalPaid
        }))
      }) : null,
      prior: prior12Months.length >= 12 ? calculatePepm({
        months: prior12Months.map(m => ({
          month: m.monthDate.toISOString().substring(0, 7),
          subscribers: m.totalSubscribers,
          metric: m.medicalPaid
        }))
      }) : null
    };

    const rxPepm = {
      current: current12Months.length >= 12 ? calculatePepm({
        months: current12Months.map(m => ({
          month: m.monthDate.toISOString().substring(0, 7),
          subscribers: m.totalSubscribers,
          metric: m.rxPaid
        }))
      }) : null,
      prior: prior12Months.length >= 12 ? calculatePepm({
        months: prior12Months.map(m => ({
          month: m.monthDate.toISOString().substring(0, 7),
          subscribers: m.totalSubscribers,
          metric: m.rxPaid
        }))
      }) : null
    };

    const totalPepm = {
      current: current12Months.length >= 12 ? calculatePepm({
        months: current12Months.map(m => ({
          month: m.monthDate.toISOString().substring(0, 7),
          subscribers: m.totalSubscribers,
          metric: m.medicalPaid + m.rxPaid
        }))
      }) : null,
      prior: prior12Months.length >= 12 ? calculatePepm({
        months: prior12Months.map(m => ({
          month: m.monthDate.toISOString().substring(0, 7),
          subscribers: m.totalSubscribers,
          metric: m.medicalPaid + m.rxPaid
        }))
      }) : null
    };

    return NextResponse.json({
      monthlyData,
      pepm: {
        medical: medicalPepm,
        rx: rxPepm,
        total: totalPepm
      }
    });

  } catch (error) {
    console.error('Error fetching monthly all-plans data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
