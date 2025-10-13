import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

type OtherInputPayload = Partial<{
  rxRebatePepmEstimate: number;
  ibnrAdjustment: number;
  aggregateFactor: number;
  aslFee: number;
  notes: string;
}>;

type StopLossFeeUpdatePayload = {
  id: string;
  islRate?: number | null;
  ratePerEe?: number | null;
  aslRate?: number | null;
};

const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;

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
    const otherInputsRecord = otherInputs.at(0);

    const otherInputsMap = otherInputsRecord
      ? {
          rxRebatePepmEstimate: {
            value: Number(otherInputsRecord.rxRebatePepmEstimate),
            notes: otherInputsRecord.notes || ''
          },
          ibnrAdjustment: {
            value: Number(otherInputsRecord.ibnrAdjustment),
            notes: otherInputsRecord.notes || ''
          },
          aggregateFactor: {
            value: Number(otherInputsRecord.aggregateFactor),
            notes: otherInputsRecord.notes || ''
          },
          aslFee: {
            value: Number(otherInputsRecord.aslFee),
            notes: otherInputsRecord.notes || ''
          }
        }
      : {};

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
        stopLossFeesByTier.map((sl: StopLossFeeUpdatePayload) =>
          prisma.stopLossFeeByTier.update({
            where: { id: sl.id },
            data: {
              islRate: Number(sl.islRate ?? sl.ratePerEe ?? 0),
              aslRate: Number(sl.aslRate ?? 0)
            }
          })
        )
      );
    }

    // Update Other Inputs
    // TODO: Implement proper update logic for Input model
    // The Input model has specific fields, not a generic key-value structure
    if (otherInputs && typeof otherInputs === 'object') {
      const payload = otherInputs as OtherInputPayload;

      const updateData: OtherInputPayload = {};
      if (payload.rxRebatePepmEstimate !== undefined) {
        updateData.rxRebatePepmEstimate = Number(payload.rxRebatePepmEstimate);
      }
      if (payload.ibnrAdjustment !== undefined) {
        updateData.ibnrAdjustment = Number(payload.ibnrAdjustment);
      }
      if (payload.aggregateFactor !== undefined) {
        updateData.aggregateFactor = Number(payload.aggregateFactor);
      }
      if (payload.aslFee !== undefined) {
        updateData.aslFee = Number(payload.aslFee);
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
          after: toJsonValue(body)
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
