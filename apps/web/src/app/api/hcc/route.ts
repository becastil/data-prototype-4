import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { processHighClaimants } from '@repo/lib/formulas/high-claimants';

const prisma = new PrismaClient();

/**
 * GET /api/hcc
 *
 * Returns high-cost claimants data
 *
 * Query params:
 * - clientId: UUID
 * - planYearId: UUID
 * - islThreshold: number (optional, defaults to 200000)
 * - minPercentThreshold: number (optional, defaults to 0.5 = 50%)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    const planYearId = searchParams.get('planYearId');
    const islThreshold = parseFloat(searchParams.get('islThreshold') || '200000');
    const minPercentThreshold = parseFloat(searchParams.get('minPercentThreshold') || '0.5');

    if (!clientId || !planYearId) {
      return NextResponse.json(
        { error: 'clientId and planYearId are required' },
        { status: 400 }
      );
    }

    // Fetch high claimants for the plan year
    const claimants = await prisma.highClaimant.findMany({
      where: {
        clientId,
        planYearId
      },
      include: {
        plan: true
      },
      orderBy: {
        totalPaid: 'desc'
      }
    });

    if (claimants.length === 0) {
      return NextResponse.json({
        claimants: [],
        summary: {
          count: 0,
          totalPaid: 0,
          employerShare: 0,
          stopLossShare: 0,
          islThreshold,
          qualifyingThreshold: islThreshold * minPercentThreshold
        }
      });
    }

    // Convert to format expected by formula engine
    const claimantInputs = claimants.map(c => ({
      claimantKey: c.claimantKey,
      planId: c.planId,
      planName: c.plan.name,
      totalPaid: Number(c.totalPaid),
      medicalPaid: Number(c.medicalPaid),
      rxPaid: Number(c.rxPaid),
      status: c.status
    }));

    // Process with formula engine
    const result = processHighClaimants(claimantInputs, islThreshold);

    // Filter by minimum percentage threshold
    const qualifyingThreshold = islThreshold * minPercentThreshold;
    const qualifyingClaimants = result.claimants.filter(
      c => c.totalPaid >= qualifyingThreshold
    );

    // Recalculate summary for qualifying claimants only
    const summary = qualifyingClaimants.reduce(
      (acc, c) => ({
        count: acc.count + 1,
        totalPaid: acc.totalPaid + c.totalPaid,
        employerShare: acc.employerShare + c.employerShare,
        stopLossShare: acc.stopLossShare + c.stopLossShare
      }),
      {
        count: 0,
        totalPaid: 0,
        employerShare: 0,
        stopLossShare: 0
      }
    );

    return NextResponse.json({
      claimants: qualifyingClaimants,
      summary: {
        ...summary,
        islThreshold,
        qualifyingThreshold
      }
    });

  } catch (error) {
    console.error('Error fetching high-cost claimants:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * POST /api/hcc
 *
 * Update high claimant status or add notes
 *
 * Body:
 * - claimantKey: string
 * - status?: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED'
 * - notes?: string
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { claimantKey, status, notes } = body;

    if (!claimantKey) {
      return NextResponse.json(
        { error: 'claimantKey is required' },
        { status: 400 }
      );
    }

    // Find the claimant
    const claimant = await prisma.highClaimant.findFirst({
      where: { claimantKey }
    });

    if (!claimant) {
      return NextResponse.json(
        { error: 'Claimant not found' },
        { status: 404 }
      );
    }

    // Update the claimant
    const updated = await prisma.highClaimant.update({
      where: { id: claimant.id },
      data: {
        ...(status && { status }),
        updatedAt: new Date()
      }
    });

    // If notes provided, create an observation note
    if (notes) {
      await prisma.observationNote.create({
        data: {
          clientId: claimant.clientId,
          planYearId: claimant.planYearId,
          entity: 'HIGH_CLAIMANT',
          entityId: claimant.id,
          note: notes,
          createdBy: 'system' // TODO: Replace with actual user ID from auth
        }
      });
    }

    return NextResponse.json({
      success: true,
      claimant: updated
    });

  } catch (error) {
    console.error('Error updating high-cost claimant:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
