import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

/**
 * GET /api/fees
 *
 * Returns fees configuration including admin fees and adjustments
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

    // Fetch admin fee components via Plan relation
    const adminFees = await prisma.adminFeeComponent.findMany({
      where: {
        plan: {
          clientId: clientId
        }
      },
      include: {
        plan: true
      },
      orderBy: { displayOrder: 'asc' }
    });

    // Fetch user adjustments (UC Settlement #6, Rx Rebates #9, Stop-Loss Reimb #11)
    const adjustments = await prisma.userAdjustment.findMany({
      where: {
        clientId,
        planYearId,
        itemNumber: {
          in: [6, 9, 11]
        }
      },
      orderBy: [{ itemNumber: 'asc' }, { monthDate: 'desc' }]
    });

    // Calculate totals
    const totalPepmFees = adminFees
      .filter(f => f.isActive && f.feeType === 'PEPM')
      .reduce((sum, f) => sum + Number(f.amount), 0);

    const totalPmpmFees = adminFees
      .filter(f => f.isActive && f.feeType === 'PMPM')
      .reduce((sum, f) => sum + Number(f.amount), 0);

    const totalFlatFees = adminFees
      .filter(f => f.isActive && f.feeType === 'FLAT')
      .reduce((sum, f) => sum + Number(f.amount), 0);

    return NextResponse.json({
      adminFees: adminFees.map(af => ({
        id: af.id,
        planId: af.planId,
        planName: af.plan.name,
        label: af.label,
        feeType: af.feeType,
        amount: Number(af.amount),
        monthlyAmount: Number(af.monthlyAmount),
        isActive: af.isActive,
        displayOrder: af.displayOrder
      })),
      adjustments: adjustments.map(adj => ({
        id: adj.id,
        itemNumber: adj.itemNumber,
        itemName: adj.itemNumber === 6 ? 'UC Settlement' :
                  adj.itemNumber === 9 ? 'Rx Rebates' :
                  'Stop Loss Reimbursement',
        monthDate: adj.monthDate,
        amount: Number(adj.amount),
        notes: adj.notes || ''
      })),
      totals: {
        pepmFees: totalPepmFees,
        pmpmFees: totalPmpmFees,
        flatFees: totalFlatFees
      }
    });

  } catch (error) {
    console.error('Error fetching fees:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * POST /api/fees
 *
 * Create or update fee configuration
 *
 * Body:
 * - type: 'admin' | 'adjustment'
 * - data: Admin fee or adjustment data
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, clientId, planYearId, planId } = body;

    if (!clientId || !planYearId || !type) {
      return NextResponse.json(
        { error: 'clientId, planYearId, and type are required' },
        { status: 400 }
      );
    }

    let result;

    if (type === 'admin') {
      if (!planId && !data.id) {
        return NextResponse.json(
          { error: 'planId is required for creating admin fees' },
          { status: 400 }
        );
      }

      // Create or update admin fee component
      if (data.id) {
        result = await prisma.adminFeeComponent.update({
          where: { id: data.id },
          data: {
            label: data.label,
            feeType: data.feeType,
            amount: data.amount,
            monthlyAmount: data.monthlyAmount ?? 0,
            isActive: data.isActive ?? true,
            displayOrder: data.displayOrder ?? 0
          }
        });
      } else {
        // Get next display order for this plan
        const maxOrder = await prisma.adminFeeComponent.findFirst({
          where: { planId },
          orderBy: { displayOrder: 'desc' },
          select: { displayOrder: true }
        });

        result = await prisma.adminFeeComponent.create({
          data: {
            planId,
            label: data.label,
            feeType: data.feeType,
            amount: data.amount,
            monthlyAmount: data.monthlyAmount ?? 0,
            isActive: data.isActive ?? true,
            displayOrder: (maxOrder?.displayOrder ?? 0) + 1
          }
        });
      }
    } else if (type === 'adjustment') {
      // Create or update user adjustment
      if (data.id) {
        result = await prisma.userAdjustment.update({
          where: { id: data.id },
          data: {
            monthDate: new Date(data.monthDate + '-01'),
            amount: data.amount,
            notes: data.notes || ''
          }
        });
      } else {
        result = await prisma.userAdjustment.create({
          data: {
            clientId,
            planYearId,
            itemNumber: data.itemNumber,
            monthDate: new Date(data.monthDate + '-01'),
            amount: data.amount,
            notes: data.notes || ''
          }
        });
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "admin" or "adjustment"' },
        { status: 400 }
      );
    }

    // Get first user for audit log (temporary solution)
    const firstUser = await prisma.user.findFirst();
    if (!firstUser) {
      return NextResponse.json(
        { error: 'No user found for audit log' },
        { status: 500 }
      );
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        clientId,
        actorId: firstUser.id,
        entity: type === 'admin' ? 'ADMIN_FEE' : 'USER_ADJUSTMENT',
        entityId: result.id,
        action: data.id ? 'UPDATE' : 'CREATE',
        before: {},
        after: toJsonValue(result)
      }
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error creating/updating fee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * DELETE /api/fees
 *
 * Delete a fee component or adjustment
 *
 * Query params:
 * - id: UUID
 * - type: 'admin' | 'adjustment'
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const type = searchParams.get('type');

    if (!id || !type) {
      return NextResponse.json(
        { error: 'id and type are required' },
        { status: 400 }
      );
    }

    if (type === 'admin') {
      const fee = await prisma.adminFeeComponent.findUnique({
        where: { id },
        include: { plan: true }
      });

      if (!fee) {
        return NextResponse.json(
          { error: 'Admin fee not found' },
          { status: 404 }
        );
      }

      await prisma.adminFeeComponent.delete({
        where: { id }
      });

      // Get first user for audit log (temporary solution)
      const firstUser = await prisma.user.findFirst();
      if (!firstUser) {
        return NextResponse.json(
          { error: 'No user found for audit log' },
          { status: 500 }
        );
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          clientId: fee.plan.clientId,
          actorId: firstUser.id,
          entity: 'ADMIN_FEE',
          entityId: id,
          action: 'DELETE',
          before: toJsonValue(fee),
          after: {}
        }
      });

    } else if (type === 'adjustment') {
      const adjustment = await prisma.userAdjustment.findUnique({
        where: { id }
      });

      if (!adjustment) {
        return NextResponse.json(
          { error: 'Adjustment not found' },
          { status: 404 }
        );
      }

      await prisma.userAdjustment.delete({
        where: { id }
      });

      // Get first user for audit log (temporary solution)
      const firstUser = await prisma.user.findFirst();
      if (!firstUser) {
        return NextResponse.json(
          { error: 'No user found for audit log' },
          { status: 500 }
        );
      }

      // Create audit log
      await prisma.auditLog.create({
        data: {
          clientId: adjustment.clientId,
          actorId: firstUser.id,
          entity: 'USER_ADJUSTMENT',
          entityId: id,
          action: 'DELETE',
          before: toJsonValue(adjustment),
          after: {}
        }
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid type. Must be "admin" or "adjustment"' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Fee deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting fee:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
