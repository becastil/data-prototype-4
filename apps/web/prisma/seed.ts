/**
 * Prisma Seed Script
 * Generates golden sample data matching Executive Summary targets
 *
 * Target YTD Metrics:
 * - Budgeted Premium: $5,585,653
 * - Medical: $4,499,969
 * - Pharmacy: $678,522
 * - Total Paid: $5,178,492
 * - Spec Stop Loss Reimb: ($563,512)
 * - Est Rx Rebates: ($423,675)
 * - Net Paid: $4,191,305
 * - Admin Fees: $258,894
 * - Stop Loss Fees: $817,983
 * - IBNR: $0
 * - Total Cost: $5,268,182
 * - Surplus: $317,471
 * - % of Budget: 94%
 */

import { PrismaClient, PlanType, ClaimantStatus, UserRole, AdminFeeType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.auditLog.deleteMany();
  await prisma.observationNote.deleteMany();
  await prisma.userAdjustment.deleteMany();
  await prisma.cAndESummaryRow.deleteMany();
  await prisma.highClaimant.deleteMany();
  await prisma.monthlyPlanStat.deleteMany();
  await prisma.monthSnapshot.deleteMany();
  await prisma.stopLossFeeByTier.deleteMany();
  await prisma.adminFeeComponent.deleteMany();
  await prisma.premiumEquivalent.deleteMany();
  await prisma.input.deleteMany();
  await prisma.planTier.deleteMany();
  await prisma.planYear.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();
  await prisma.client.deleteMany();

  // Create Client
  const client = await prisma.client.create({
    data: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Demo Corporation',
      cadence: 'monthly',
      active: true
    }
  });
  console.log('✓ Created client:', client.name);

  // Create User
  const user = await prisma.user.create({
    data: {
      id: '00000000-0000-0000-0000-000000000101',
      email: 'admin@democorp.com',
      role: UserRole.ADMIN,
      clientId: client.id
    }
  });
  console.log('✓ Created user:', user.email);

  // Create Plans
  const hdhpPlan = await prisma.plan.create({
    data: {
      id: '00000000-0000-0000-0000-000000000201',
      clientId: client.id,
      name: 'HDHP',
      type: PlanType.HDHP,
      active: true
    }
  });

  const ppoBasePlan = await prisma.plan.create({
    data: {
      id: '00000000-0000-0000-0000-000000000202',
      clientId: client.id,
      name: 'PPO Base',
      type: PlanType.PPO_BASE,
      active: true
    }
  });

  const ppoBuyUpPlan = await prisma.plan.create({
    data: {
      id: '00000000-0000-0000-0000-000000000203',
      clientId: client.id,
      name: 'PPO Buy-Up',
      type: PlanType.PPO_BUYUP,
      active: true
    }
  });

  const allPlansPlan = await prisma.plan.create({
    data: {
      id: '00000000-0000-0000-0000-000000000204',
      clientId: client.id,
      name: 'All Plans',
      type: PlanType.ALL_PLANS,
      active: true
    }
  });

  console.log('✓ Created plans');

  // Create Plan Tiers
  const tierLabels = ['Employee Only', '+Spouse', '+Child(ren)', 'Family'];
  const plans = [hdhpPlan, ppoBasePlan, ppoBuyUpPlan];

  for (const plan of plans) {
    for (const label of tierLabels) {
      await prisma.planTier.create({
        data: {
          planId: plan.id,
          label
        }
      });
    }
  }
  console.log('✓ Created plan tiers');

  // Create Plan Year
  const planYear = await prisma.planYear.create({
    data: {
      id: '00000000-0000-0000-0000-000000000301',
      clientId: client.id,
      yearStart: new Date('2024-01-01'),
      yearEnd: new Date('2024-12-31'),
      islLimit: 200000,
      stopLossTrackingMode: 'BY_PLAN'
    }
  });
  console.log('✓ Created plan year 2024');

  // Create Inputs
  await prisma.input.create({
    data: {
      clientId: client.id,
      planYearId: planYear.id,
      rxRebatePepmEstimate: 35.31, // $423,675 / 12 / 1000 avg subscribers
      ibnrAdjustment: 0,
      aggregateFactor: 1.25,
      aslFee: 0,
      notes: 'Golden seed data for acceptance testing'
    }
  });

  // Generate 12 months of data (Jan-Dec 2024)
  const months = [
    '2024-01', '2024-02', '2024-03', '2024-04',
    '2024-05', '2024-06', '2024-07', '2024-08',
    '2024-09', '2024-10', '2024-11', '2024-12'
  ];

  // Target YTD totals (divided by 12 for monthly averages, with variation)
  const ytdTargets = {
    budgetedPremium: 5585653,
    medicalPaid: 4499969,
    rxPaid: 678522,
    specStopLossReimb: -563512,
    estRxRebates: -423675,
    adminFees: 258894,
    stopLossFees: 817983
  };

  for (let i = 0; i < months.length; i++) {
    const monthDate = new Date(`${months[i]}-01`);

    // Create snapshot
    const snapshot = await prisma.monthSnapshot.create({
      data: {
        clientId: client.id,
        planYearId: planYear.id,
        monthDate
      }
    });

    // Distribute totals across months with some variation
    const monthlyFactor = 1 + (Math.random() * 0.2 - 0.1); // ±10% variation
    const baseSubscribers = 1000;

    // All Plans aggregated stats
    await prisma.monthlyPlanStat.create({
      data: {
        snapshotId: snapshot.id,
        planId: allPlansPlan.id,
        totalSubscribers: Math.round(baseSubscribers * monthlyFactor),
        medicalPaid: (ytdTargets.medicalPaid / 12) * monthlyFactor,
        rxPaid: (ytdTargets.rxPaid / 12) * monthlyFactor,
        specStopLossReimb: (ytdTargets.specStopLossReimb / 12) * monthlyFactor,
        estRxRebates: (ytdTargets.estRxRebates / 12) * monthlyFactor,
        adminFees: (ytdTargets.adminFees / 12) * monthlyFactor,
        stopLossFees: (ytdTargets.stopLossFees / 12) * monthlyFactor,
        budgetedPremium: (ytdTargets.budgetedPremium / 12) * monthlyFactor
      }
    });

    // Per-plan breakdown (roughly 42% HDHP, 38% PPO Base, 20% PPO Buy-Up)
    const planShares = [
      { plan: hdhpPlan, share: 0.42 },
      { plan: ppoBasePlan, share: 0.38 },
      { plan: ppoBuyUpPlan, share: 0.20 }
    ];

    for (const { plan, share } of planShares) {
      await prisma.monthlyPlanStat.create({
        data: {
          snapshotId: snapshot.id,
          planId: plan.id,
          totalSubscribers: Math.round(baseSubscribers * share * monthlyFactor),
          medicalPaid: (ytdTargets.medicalPaid / 12) * share * monthlyFactor,
          rxPaid: (ytdTargets.rxPaid / 12) * share * monthlyFactor,
          specStopLossReimb: (ytdTargets.specStopLossReimb / 12) * share * monthlyFactor,
          estRxRebates: (ytdTargets.estRxRebates / 12) * share * monthlyFactor,
          adminFees: (ytdTargets.adminFees / 12) * share * monthlyFactor,
          stopLossFees: (ytdTargets.stopLossFees / 12) * share * monthlyFactor,
          budgetedPremium: (ytdTargets.budgetedPremium / 12) * share * monthlyFactor
        }
      });
    }
  }
  console.log('✓ Created 12 months of plan stats');

  // Create High-Cost Claimants (totaling >$1.6M, with $240K recognized by Stop Loss YTD)
  const claimants = [
    { medPaid: 280000, rxPaid: 40000, plan: hdhpPlan, status: ClaimantStatus.ACTIVE },
    { medPaid: 220000, rxPaid: 20000, plan: ppoBasePlan, status: ClaimantStatus.ACTIVE },
    { medPaid: 190000, rxPaid: 30000, plan: hdhpPlan, status: ClaimantStatus.RESOLVED },
    { medPaid: 180000, rxPaid: 25000, plan: ppoBuyUpPlan, status: ClaimantStatus.ACTIVE },
    { medPaid: 140000, rxPaid: 20000, plan: ppoBasePlan, status: ClaimantStatus.ACTIVE },
    { medPaid: 130000, rxPaid: 15000, plan: hdhpPlan, status: ClaimantStatus.RESOLVED },
    { medPaid: 120000, rxPaid: 18000, plan: ppoBasePlan, status: ClaimantStatus.PENDING },
    { medPaid: 110000, rxPaid: 12000, plan: hdhpPlan, status: ClaimantStatus.ACTIVE },
    { medPaid: 105000, rxPaid: 10000, plan: ppoBuyUpPlan, status: ClaimantStatus.ACTIVE },
    { medPaid: 100000, rxPaid: 5000, plan: ppoBasePlan, status: ClaimantStatus.RESOLVED }
  ];

  for (let i = 0; i < claimants.length; i++) {
    const c = claimants[i];
    const totalPaid = c.medPaid + c.rxPaid;
    const amountExceedingIsl = Math.max(0, totalPaid - 200000);

    await prisma.highClaimant.create({
      data: {
        clientId: client.id,
        planYearId: planYear.id,
        claimantKey: `CLAIMANT_${String(i + 1).padStart(3, '0')}`,
        planId: c.plan.id,
        status: c.status,
        primaryDiagnosis: 'De-identified Diagnosis Code',
        medPaid: c.medPaid,
        rxPaid: c.rxPaid,
        totalPaid,
        amountExceedingIsl
      }
    });
  }
  console.log('✓ Created 10 high-cost claimants');

  // Create Admin Fee Components (sample for HDHP)
  const hdhpTiers = await prisma.planTier.findMany({
    where: { planId: hdhpPlan.id }
  });

  await prisma.adminFeeComponent.createMany({
    data: [
      {
        planId: hdhpPlan.id,
        label: 'Consulting Fee',
        feeType: AdminFeeType.PEPM,
        amount: 5.00
      },
      {
        planId: hdhpPlan.id,
        label: 'TPA Fee',
        feeType: AdminFeeType.PMPM,
        amount: 15.00
      }
    ]
  });

  // Create Stop Loss Fees by Tier
  for (const tier of hdhpTiers) {
    await prisma.stopLossFeeByTier.create({
      data: {
        planId: hdhpPlan.id,
        tierId: tier.id,
        islRate: tier.label === 'Family' ? 65 : 35,
        aslRate: 0
      }
    });
  }

  console.log('✓ Created admin fees and stop loss rates');

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
