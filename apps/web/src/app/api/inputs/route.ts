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
        where: {
          plan: {
            clientId: clientId
          }
        },
        include: { plan: true, tier: true },
        orderBy: [{ plan: { name: 'asc' } }]
      }),

      // Admin Fee Components
      prisma.adminFeeComponent.findMany({
        where: {
          plan: {
            clientId: clientId
          }
        },
        include: { plan: true },
        orderBy: { displayOrder: 'asc' }
      }),

      // Stop Loss Fees by Tier
      prisma.stopLossFeeByTier.findMany({
        where: {
          plan: {
            clientId: clientId
          }
        },
        include: { plan: true, tier: true },
        orderBy: { tier: { label: 'asc' } }
      }),

      // Other Inputs
      prisma.input.findMany({
        where: { clientId, planYearId }
      })
    ]);

    // Parse other inputs into structured format
    const otherInputsMap = otherInputs.reduce((acc, input) => {
      // Input table structure needs key field
      const key = (input as any).key;
      if (key) {
        acc[key] = {
          value: Number((input as any).value || 0),
          notes: input.notes || ''
        };
      }
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
        tierId: pe.tierId,
        tierLabel: pe.tier.label,
        amount: Number(pe.amount)
      })),
      adminFeeComponents: adminFeeComponents.map(afc => ({
        id: afc.id,
        planId: afc.planId,
        planName: afc.plan.name,
        label: afc.label,
        feeType: afc.feeType,
        amount: Number(afc.amount),
        monthlyAmount: Number(afc.monthlyAmount),
        isActive: afc.isActive,
        displayOrder: afc.displayOrder
      })),
      stopLossFeesByTier: stopLossFeesByTier.map(sl => ({
        id: sl.id,
        planId: sl.planId,
        planName: sl.plan.name,
        tierId: sl.tierId,
        tierLabel: sl.tier.label,
        islRate: Number(sl.islRate),
        aslRate: Number(sl.aslRate)
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
        stopLossFeesByTier.map((sl: any) =>
          prisma.stopLossFeeByTier.update({
            where: { id: sl.id },
            data: {
              islRate: sl.islRate || sl.ratePerEe || 0,
              aslRate: sl.aslRate || 0
            }
          })
        )
      );
    }

    // Update Other Inputs
    // TODO: Implement proper update logic for Input model
    // The Input model has specific fields, not a generic key-value structure
    if (otherInputs && typeof otherInputs === 'object') {
      const inputData = await prisma.input.findUnique({
        where: {
          clientId_planYearId: {
            clientId,
            planYearId
          }
        }
      });

      const updateData: any = {};
      if (otherInputs.rxRebatePepmEstimate !== undefined) {
        updateData.rxRebatePepmEstimate = Number(otherInputs.rxRebatePepmEstimate);
      }
      if (otherInputs.ibnrAdjustment !== undefined) {
        updateData.ibnrAdjustment = Number(otherInputs.ibnrAdjustment);
      }
      if (otherInputs.aggregateFactor !== undefined) {
        updateData.aggregateFactor = Number(otherInputs.aggregateFactor);
      }
      if (otherInputs.aslFee !== undefined) {
        updateData.aslFee = Number(otherInputs.aslFee);
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.input.upsert({
          where: {
            clientId_planYearId: {
              clientId,
              planYearId
            }
          },
          create: {
            clientId,
            planYearId,
            ...updateData
          },
          update: updateData
        });
      }
    }

    // Get first user for audit log (temporary solution)
    const firstUser = await prisma.user.findFirst();
    if (firstUser) {
      // Create audit log
      await prisma.auditLog.create({
        data: {
          clientId,
          actorId: firstUser.id,
          entity: 'INPUTS',
          entityId: planYearId,
          action: 'UPDATE',
          before: {},
          after: body as any
        }
      });
    }

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
