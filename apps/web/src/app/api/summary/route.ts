import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { calculateCeSummary } from '@medical-reporting/lib/formulas/ce-summary';

const prisma = new PrismaClient();

/**
 * POST /api/summary
 *
 * Calculate C&E 28-row summary for a plan year
 *
 * Body:
 * - clientId: UUID
 * - planYearId: UUID
 * - through: YYYY-MM (optional, defaults to latest month)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, planYearId, through } = body;

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
        planStats: true
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

    // Fetch user adjustments for the plan year
    const adjustments = await prisma.userAdjustment.findMany({
      where: {
        clientId,
        planYearId,
        itemNumber: { in: [6, 9, 11] }
      }
    });

    // Group adjustments by month and item number
    const adjustmentsByMonth = adjustments.reduce((acc, adj) => {
      const monthKey = adj.monthDate.toISOString().substring(0, 7);
      if (!acc[monthKey]) {
        acc[monthKey] = {};
      }
      acc[monthKey][adj.itemNumber] = Number(adj.amount);
      return acc;
    }, {} as Record<string, Record<number, number>>);

    // Calculate C&E for each month
    const monthlyResults = snapshots.map(snapshot => {
      const monthKey = snapshot.monthDate.toISOString().substring(0, 7);
      const monthAdjustments = adjustmentsByMonth[monthKey] || {};

      // Aggregate all plans for this month
      const aggregated = snapshot.planStats.reduce(
        (acc, stat) => ({
          medicalPaid: acc.medicalPaid + Number(stat.medicalPaid),
          rxPaid: acc.rxPaid + Number(stat.rxPaid),
          specStopLossReimb: acc.specStopLossReimb + Number(stat.specStopLossReimb),
          estRxRebates: acc.estRxRebates + Number(stat.estRxRebates),
          adminFees: acc.adminFees + Number(stat.adminFees),
          stopLossFees: acc.stopLossFees + Number(stat.stopLossFees),
          budgetedPremium: acc.budgetedPremium + Number(stat.budgetedPremium),
          totalSubscribers: acc.totalSubscribers + stat.totalSubscribers
        }),
        {
          medicalPaid: 0,
          rxPaid: 0,
          specStopLossReimb: 0,
          estRxRebates: 0,
          adminFees: 0,
          stopLossFees: 0,
          budgetedPremium: 0,
          totalSubscribers: 0
        }
      );

      // Prepare input for C&E calculation
      const ceInput = {
        // Medical (#1-7)
        item1_paidClaims: aggregated.medicalPaid,
        item2_ibnr: 0, // TODO: Fetch from inputs
        item3_runout: 0,
        item4_asl: 0,
        item5_totalAllMedical: 0, // Calculated by formula
        item6_ucSettlement: monthAdjustments[6] || 0,
        item7_totalAdjustedMedical: 0, // Calculated by formula

        // Pharmacy (#8-9)
        item8_totalRx: aggregated.rxPaid,
        item9_rxRebates: monthAdjustments[9] || aggregated.estRxRebates,

        // Stop Loss (#10-11)
        item10_stopLossFees: aggregated.stopLossFees,
        item11_stopLossReimbursement: monthAdjustments[11] || aggregated.specStopLossReimb,

        // Admin (#12-14)
        item12_aso: 0, // TODO: Fetch from admin fees
        item13_other: 0,
        item14_totalAdmin: aggregated.adminFees,

        // Enrollment (#17-18)
        item17_employees: aggregated.totalSubscribers,
        item18_totalMembers: aggregated.totalSubscribers, // TODO: Actual members vs subscribers

        // Budget (#22-24)
        item22_budgetedPremium: aggregated.budgetedPremium,
        item23_budgetedPepm: 0, // Calculated by formula
        item24_budgetedPercentage: 1.0 // 100%
      };

      // TODO: Fix calculateCeSummary input to match expected CeMonthlyInput type
      // const result = calculateCeSummary(ceInput);

      // Calculate basic derived values for now
      const totalMedicalAndRx = ceInput.item1_paidClaims + ceInput.item8_totalRx;
      const netAfterAdjustments = totalMedicalAndRx + ceInput.item6_ucSettlement + ceInput.item9_rxRebates + ceInput.item11_stopLossReimbursement;
      const monthlyCE = netAfterAdjustments + ceInput.item14_totalAdmin + ceInput.item10_stopLossFees;

      return {
        monthDate: snapshot.monthDate,
        monthKey,
        ...ceInput,
        item15_monthlyCE: monthlyCE,
        item16_cumulativeCE: 0, // Will be calculated in cumulative reduce
        item19_pepm: aggregated.totalSubscribers > 0 ? monthlyCE / aggregated.totalSubscribers : 0,
        item20_actualPepm: aggregated.totalSubscribers > 0 ? monthlyCE / aggregated.totalSubscribers : 0
      };
    });

    // Calculate cumulative totals
    const cumulative = monthlyResults.reduce((acc, month, index) => {
      const prev = index > 0 ? acc[index - 1] : null;

      return [
        ...acc,
        {
          monthKey: month.monthKey,
          item1_paidClaims: (prev?.item1_paidClaims || 0) + month.item1_paidClaims,
          item5_totalAllMedical: (prev?.item5_totalAllMedical || 0) + month.item5_totalAllMedical,
          item7_totalAdjustedMedical: (prev?.item7_totalAdjustedMedical || 0) + month.item7_totalAdjustedMedical,
          item8_totalRx: (prev?.item8_totalRx || 0) + month.item8_totalRx,
          item9_rxRebates: (prev?.item9_rxRebates || 0) + month.item9_rxRebates,
          item10_stopLossFees: (prev?.item10_stopLossFees || 0) + month.item10_stopLossFees,
          item11_stopLossReimbursement: (prev?.item11_stopLossReimbursement || 0) + month.item11_stopLossReimbursement,
          item14_totalAdmin: (prev?.item14_totalAdmin || 0) + month.item14_totalAdmin,
          item15_monthlyCE: (prev?.item15_monthlyCE || 0) + month.item15_monthlyCE,
          item16_cumulativeCE: month.item15_monthlyCE + (prev?.item16_cumulativeCE || 0),
          item22_budgetedPremium: (prev?.item22_budgetedPremium || 0) + month.item22_budgetedPremium
        }
      ];
    }, [] as any[]);

    // Get latest month for KPIs
    const latestMonth = monthlyResults[monthlyResults.length - 1];
    const latestCumulative = cumulative[cumulative.length - 1];

    const kpis = {
      monthlyCE: latestMonth.item15_monthlyCE,
      pepmActual: latestMonth.item20_actualPepm,
      budgetVariance: latestCumulative.item16_cumulativeCE - latestCumulative.item22_budgetedPremium,
      cumulativeCE: latestCumulative.item16_cumulativeCE
    };

    return NextResponse.json({
      monthlyResults,
      cumulative,
      kpis
    });

  } catch (error) {
    console.error('Error calculating C&E summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * GET /api/summary/export
 *
 * Export C&E summary as CSV
 *
 * Query params:
 * - clientId: UUID
 * - planYearId: UUID
 * - format: 'csv' (future: 'xlsx', 'pdf')
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const planYearId = searchParams.get('planYearId');
    const format = searchParams.get('format') || 'csv';

    if (!clientId || !planYearId) {
      return NextResponse.json(
        { error: 'clientId and planYearId are required' },
        { status: 400 }
      );
    }

    // Fetch C&E summary rows from database
    const summaryRows = await prisma.cAndESummaryRow.findMany({
      where: { clientId, planYearId },
      orderBy: { itemNumber: 'asc' }
    });

    if (summaryRows.length === 0) {
      return NextResponse.json(
        { error: 'No C&E summary data found' },
        { status: 404 }
      );
    }

    if (format === 'csv') {
      // Generate CSV with UTF-8 BOM
      const BOM = '\uFEFF';
      const headers = ['Item Number', 'Month', 'Value', 'User Adjustment'];
      const rows = summaryRows.map(row => [
        row.itemNumber.toString(),
        row.monthDate.toISOString().substring(0, 7),
        Number(row.value).toFixed(2),
        row.isUserAdjustment ? 'Yes' : 'No'
      ]);

      const csv = BOM + [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="ce-summary-${planYearId}.csv"`
        }
      });
    }

    return NextResponse.json(
      { error: 'Unsupported export format' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error exporting C&E summary:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
