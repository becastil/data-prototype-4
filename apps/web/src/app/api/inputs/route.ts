import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/inputs
 *
 * Returns inputs configuration for a plan year
 *
 * Query params:
 * - clientId: UUID
 * - planYearId: UUID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const planYearId = searchParams.get('planYearId');

    if (!clientId || !planYearId) {
      return NextResponse.json(
        { error: 'clientId and planYearId are required' },
        { status: 400 }
      );
    }

    // Fetch all inputs for the plan year
    const [
      premiumEquivalents,
      adminFeeComponents,
      stopLossFeesByTier,
      otherInputs
    ] = await Promise.all([
      // Premium Equivalents
      prisma.premiumEquivalent.findMany({
        where: { clientId, planYearId },
        include: { plan: true },
        orderBy: [{ plan: { name: 'asc' } }, { tier: 'asc' }]
      }),

      // Admin Fee Components
      prisma.adminFeeComponent.findMany({
        where: { clientId, planYearId },
        orderBy: { displayOrder: 'asc' }
      }),

      // Stop Loss Fees by Tier
      prisma.stopLossFeeByTier.findMany({
        where: { clientId, planYearId },
        orderBy: { tier: 'asc' }
      }),

      // Other Inputs
      prisma.input.findMany({
        where: { clientId, planYearId }
      })
    ]);

    // Parse other inputs into structured format
    const otherInputsMap = otherInputs.reduce((acc, input) => {
      acc[input.key] = {
        value: Number(input.value),
        notes: input.notes || ''
      };
      return acc;
    }, {} as Record<string, { value: number; notes: string }>);

    // Calculate totals
    const totalAdminFees = adminFeeComponents
      .filter(c => c.isActive)
      .reduce((sum, c) => sum + Number(c.monthlyAmount), 0);

    return NextResponse.json({
      premiumEquivalents: premiumEquivalents.map(pe => ({
        id: pe.id,
        planId: pe.planId,
        planName: pe.plan.name,
        tier: pe.tier,
        amount: Number(pe.amount)
      })),
      adminFeeComponents: adminFeeComponents.map(afc => ({
        id: afc.id,
        label: afc.label,
        feeType: afc.feeType,
        amount: Number(afc.amount),
        monthlyAmount: Number(afc.monthlyAmount),
        isActive: afc.isActive,
        displayOrder: afc.displayOrder
      })),
      stopLossFeesByTier: stopLossFeesByTier.map(sl => ({
        id: sl.id,
        tier: sl.tier,
        ratePerEe: Number(sl.ratePerEe),
        islThreshold: Number(sl.islThreshold)
      })),
      otherInputs: otherInputsMap,
      totals: {
        adminFees: totalAdminFees
      }
    });

  } catch (error) {
    console.error('Error fetching inputs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PUT /api/inputs
 *
 * Update inputs configuration
 *
 * Body:
 * - premiumEquivalents?: Array<{ id, amount }>
 * - adminFeeComponents?: Array<{ id, amount?, isActive? }>
 * - stopLossFeesByTier?: Array<{ id, ratePerEe, islThreshold }>
 * - otherInputs?: Record<string, { value, notes }>
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      premiumEquivalents,
      adminFeeComponents,
      stopLossFeesByTier,
      otherInputs,
      clientId,
      planYearId
    } = body;

    if (!clientId || !planYearId) {
      return NextResponse.json(
        { error: 'clientId and planYearId are required' },
        { status: 400 }
      );
    }

    // Update Premium Equivalents
    if (premiumEquivalents && Array.isArray(premiumEquivalents)) {
      await Promise.all(
        premiumEquivalents.map(pe =>
          prisma.premiumEquivalent.update({
            where: { id: pe.id },
            data: { amount: pe.amount }
          })
        )
      );
    }

    // Update Admin Fee Components
    if (adminFeeComponents && Array.isArray(adminFeeComponents)) {
      await Promise.all(
        adminFeeComponents.map(afc =>
          prisma.adminFeeComponent.update({
            where: { id: afc.id },
            data: {
              ...(afc.amount !== undefined && { amount: afc.amount }),
              ...(afc.isActive !== undefined && { isActive: afc.isActive })
            }
          })
        )
      );
    }

    // Update Stop Loss Fees by Tier
    if (stopLossFeesByTier && Array.isArray(stopLossFeesByTier)) {
      await Promise.all(
        stopLossFeesByTier.map(sl =>
          prisma.stopLossFeeByTier.update({
            where: { id: sl.id },
            data: {
              ratePerEe: sl.ratePerEe,
              islThreshold: sl.islThreshold
            }
          })
        )
      );
    }

    // Update Other Inputs
    if (otherInputs && typeof otherInputs === 'object') {
      await Promise.all(
        Object.entries(otherInputs).map(([key, data]: [string, any]) =>
          prisma.input.upsert({
            where: {
              clientId_planYearId_key: {
                clientId,
                planYearId,
                key
              }
            },
            create: {
              clientId,
              planYearId,
              key,
              value: data.value.toString(),
              notes: data.notes || ''
            },
            update: {
              value: data.value.toString(),
              notes: data.notes || ''
            }
          })
        )
      );
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        clientId,
        userId: 'system', // TODO: Replace with actual user ID from auth
        entity: 'INPUTS',
        entityId: planYearId,
        action: 'UPDATE',
        changesSummary: 'Updated inputs configuration',
        beforeSnapshot: {},
        afterSnapshot: body
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Inputs updated successfully'
    });

  } catch (error) {
    console.error('Error updating inputs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
