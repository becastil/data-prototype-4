/**
 * Integration test for budget calculation endpoint
 *
 * Tests the full budget vs actuals variance calculation flow:
 * - Database seeding with test data
 * - API endpoint invocation
 * - Variance calculation verification
 * - Data cleanup
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '@/lib/prisma';
import { calculateMonthlyStats, type BudgetConfigCalc, type FeeWindowData } from '@medical-reporting/lib';

describe('Budget Calculation Engine', () => {
  let testClientId: string;
  let testPlanYearId: string;
  let testUserId: string;

  // Use dynamic year to prevent tests from becoming outdated
  const testYear = new Date().getFullYear() + 1;

  beforeAll(async () => {
    // Seed test data
    const client = await prisma.client.create({
      data: {
        name: 'Test Client - Budget Calc',
        cadence: 'monthly',
        active: true,
      },
    });
    testClientId = client.id;

    const planYear = await prisma.planYear.create({
      data: {
        clientId: testClientId,
        year: testYear,
        startDate: new Date(`${testYear}-01-01`),
        endDate: new Date(`${testYear}-12-31`),
      },
    });
    testPlanYearId = planYear.id;

    const user = await prisma.user.create({
      data: {
        email: 'test-budget@example.com',
        name: 'Test User',
        clientId: testClientId,
      },
    });
    testUserId = user.id;

    // Create monthly actuals (3 months)
    await prisma.monthlyActuals.createMany({
      data: [
        {
          planYearId: testPlanYearId,
          serviceMonth: new Date(`${testYear}-01-01`),
          domesticFacilityIpOp: 50000,
          nonDomesticIpOp: 10000,
          nonHospitalMedical: 30000,
          rxClaims: 20000,
          eeCount: 100,
          memberCount: 250,
        },
        {
          planYearId: testPlanYearId,
          serviceMonth: new Date(`${testYear}-02-01`),
          domesticFacilityIpOp: 55000,
          nonDomesticIpOp: 12000,
          nonHospitalMedical: 32000,
          rxClaims: 21000,
          eeCount: 102,
          memberCount: 255,
        },
        {
          planYearId: testPlanYearId,
          serviceMonth: new Date(`${testYear}-03-01`),
          domesticFacilityIpOp: 48000,
          nonDomesticIpOp: 11000,
          nonHospitalMedical: 31000,
          rxClaims: 19000,
          eeCount: 101,
          memberCount: 252,
        },
      ],
    });

    // Create monthly configs (expected claims)
    await prisma.monthlyConfig.createMany({
      data: [
        {
          planYearId: testPlanYearId,
          serviceMonth: new Date(`${testYear}-01-01`),
          expectedClaims: 105000, // Expected: $105k
          stopLossReimb: 0,
          rxRebates: 0,
        },
        {
          planYearId: testPlanYearId,
          serviceMonth: new Date(`${testYear}-02-01`),
          expectedClaims: 110000,
          stopLossReimb: 0,
          rxRebates: 0,
        },
        {
          planYearId: testPlanYearId,
          serviceMonth: new Date(`${testYear}-03-01`),
          expectedClaims: 107000,
          stopLossReimb: 0,
          rxRebates: 0,
        },
      ],
    });

    // Create fee window (annual admin fee)
    await prisma.feeWindow.create({
      data: {
        planYearId: testPlanYearId,
        feeName: 'Admin Fee',
        unitType: 'ANNUAL',
        rate: 120000, // $120k annual = $10k/month
        appliesTo: 'FIXED',
        effectiveStart: new Date(`${testYear}-01-01`),
        effectiveEnd: new Date(`${testYear}-12-31`),
      },
    });

    // Create budget config
    await prisma.budgetConfig.create({
      data: {
        planYearId: testPlanYearId,
        claimsModelType: 'DIRECT',
        pctClaimsBase: 'ACTUAL',
        roundingMode: 'HALF_UP',
        currencyPrecision: 2,
        defaultHorizonMonths: 12,
      },
    });
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.feeWindow.deleteMany({ where: { planYearId: testPlanYearId } });
    await prisma.budgetConfig.deleteMany({ where: { planYearId: testPlanYearId } });
    await prisma.monthlyConfig.deleteMany({ where: { planYearId: testPlanYearId } });
    await prisma.monthlyActuals.deleteMany({ where: { planYearId: testPlanYearId } });
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.planYear.delete({ where: { id: testPlanYearId } });
    await prisma.client.delete({ where: { id: testClientId } });
  });

  it('should calculate monthly variance correctly', async () => {
    // Fetch test data
    const [actuals, configs, feeWindows, budgetConfig] = await Promise.all([
      prisma.monthlyActuals.findMany({ where: { planYearId: testPlanYearId }, orderBy: { serviceMonth: 'asc' } }),
      prisma.monthlyConfig.findMany({ where: { planYearId: testPlanYearId }, orderBy: { serviceMonth: 'asc' } }),
      prisma.feeWindow.findMany({ where: { planYearId: testPlanYearId } }),
      prisma.budgetConfig.findUnique({ where: { planYearId: testPlanYearId } }),
    ]);

    // Transform to calculation engine types
    const actualsInput = actuals.map(a => ({
      serviceMonth: a.serviceMonth,
      domesticFacilityIpOp: a.domesticFacilityIpOp,
      nonDomesticIpOp: a.nonDomesticIpOp,
      nonHospitalMedical: a.nonHospitalMedical,
      rxClaims: a.rxClaims,
      eeCount: a.eeCount,
      memberCount: a.memberCount,
    }));

    const configsInput = configs.map(c => ({
      serviceMonth: c.serviceMonth,
      expectedClaims: c.expectedClaims,
      stopLossReimb: c.stopLossReimb,
      rxRebates: c.rxRebates,
    }));

    const feeWindowsInput = feeWindows.map(fw => ({
      feeName: fw.feeName,
      unitType: fw.unitType as FeeWindowData["unitType"],
      rate: typeof fw.rate === 'string' ? parseFloat(fw.rate) : fw.rate,
      appliesTo: fw.appliesTo,
      effectiveStart: fw.effectiveStart,
      effectiveEnd: fw.effectiveEnd,
    }));

    const budgetConfigInput = {
      claimsModelType: budgetConfig!.claimsModelType,
      pctClaimsBase: budgetConfig!.pctClaimsBase,
      roundingMode: budgetConfig!.roundingMode,
      currencyPrecision: budgetConfig!.currencyPrecision,
      defaultHorizonMonths: budgetConfig!.defaultHorizonMonths,
    };

    // Run calculation
    const result = calculateMonthlyStats(actualsInput, configsInput, feeWindowsInput, budgetConfigInput);

    // Assertions
    expect(result.months).toHaveLength(3);

    // Month 1 verification
    const jan = result.months[0];
    expect(jan.totalClaims).toBe(110000); // 50k + 10k + 30k + 20k
    expect(jan.fixedCosts).toBe(10000); // 120k/12
    expect(jan.actualTotalExpenses).toBe(120000); // 110k + 10k
    expect(jan.budgetTotalExpenses).toBe(115000); // 105k + 10k
    expect(jan.varianceDollars).toBe(5000); // 120k - 115k
    expect(jan.variancePercent).toBeCloseTo(4.35, 1); // (5k/115k)*100

    // YTD verification
    expect(result.ytd.totalClaims).toBe(329000); // Sum of 3 months
    expect(result.ytd.fixedCosts).toBe(30000); // $10k * 3
    expect(result.ytd.actualTotalExpenses).toBe(359000);
    expect(result.ytd.budgetTotalExpenses).toBe(352000); // (105k+110k+107k) + 30k
    expect(result.ytd.varianceDollars).toBe(7000);
  });

  it('should handle mid-year fee changes with proration', async () => {
    // Add a second fee window starting mid-year
    const feeWindow2 = await prisma.feeWindow.create({
      data: {
        planYearId: testPlanYearId,
        feeName: 'Stop Loss Fee',
        unitType: 'MONTHLY',
        rate: 5000,
        appliesTo: 'FIXED',
        effectiveStart: new Date(`${testYear}-02-15`), // Mid-February
        effectiveEnd: new Date(`${testYear}-12-31`),
      },
    });

    const [actuals, configs, feeWindows, budgetConfig] = await Promise.all([
      prisma.monthlyActuals.findMany({ where: { planYearId: testPlanYearId }, orderBy: { serviceMonth: 'asc' } }),
      prisma.monthlyConfig.findMany({ where: { planYearId: testPlanYearId }, orderBy: { serviceMonth: 'asc' } }),
      prisma.feeWindow.findMany({ where: { planYearId: testPlanYearId } }),
      prisma.budgetConfig.findUnique({ where: { planYearId: testPlanYearId } }),
    ]);

    // Transform to calculation types (abbreviated)
    const actualsInput = actuals.map(a => ({
      serviceMonth: a.serviceMonth,
      domesticFacilityIpOp: a.domesticFacilityIpOp,
      nonDomesticIpOp: a.nonDomesticIpOp,
      nonHospitalMedical: a.nonHospitalMedical,
      rxClaims: a.rxClaims,
      eeCount: a.eeCount,
      memberCount: a.memberCount,
    }));

    const configsInput = configs.map(c => ({
      serviceMonth: c.serviceMonth,
      expectedClaims: c.expectedClaims,
      stopLossReimb: c.stopLossReimb,
      rxRebates: c.rxRebates,
    }));

    const feeWindowsInput = feeWindows.map(fw => ({
      feeName: fw.feeName,
      unitType: fw.unitType as FeeWindowData["unitType"],
      rate: typeof fw.rate === 'string' ? parseFloat(fw.rate) : fw.rate,
      appliesTo: fw.appliesTo,
      effectiveStart: fw.effectiveStart,
      effectiveEnd: fw.effectiveEnd,
    }));

    if (!budgetConfig) {
      throw new Error('Budget config not found for test plan year');
    }

    const budgetConfigInput: BudgetConfigCalc = {
      claimsModelType: budgetConfig.claimsModelType,
      pctClaimsBase: budgetConfig.pctClaimsBase,
      roundingMode: budgetConfig.roundingMode,
      currencyPrecision: budgetConfig.currencyPrecision,
      defaultHorizonMonths: budgetConfig.defaultHorizonMonths,
    };

    const result = calculateMonthlyStats(actualsInput, configsInput, feeWindowsInput, budgetConfigInput);

    // February should have prorated stop loss fee
    const feb = result.months[1];
    // Feb has 28 days, fee started on Feb 15, so 14 days of coverage
    // Prorated: $5000 * (14/28) = $2500
    expect(feb.fixedCosts).toBeGreaterThan(10000); // Admin fee + partial stop loss
    expect(feb.fixedCosts).toBeLessThan(15000);

    // March should have full month of both fees
    const mar = result.months[2];
    expect(mar.fixedCosts).toBe(15000); // $10k admin + $5k stop loss

    // Cleanup
    await prisma.feeWindow.delete({ where: { id: feeWindow2.id } });
  });

  it('should calculate PEPM correctly', async () => {
    const [actuals, configs, feeWindows, budgetConfig] = await Promise.all([
      prisma.monthlyActuals.findMany({ where: { planYearId: testPlanYearId }, orderBy: { serviceMonth: 'asc' } }),
      prisma.monthlyConfig.findMany({ where: { planYearId: testPlanYearId }, orderBy: { serviceMonth: 'asc' } }),
      prisma.feeWindow.findMany({ where: { planYearId: testPlanYearId } }),
      prisma.budgetConfig.findUnique({ where: { planYearId: testPlanYearId } }),
    ]);

    const actualsInput = actuals.map(a => ({
      serviceMonth: a.serviceMonth,
      domesticFacilityIpOp: a.domesticFacilityIpOp,
      nonDomesticIpOp: a.nonDomesticIpOp,
      nonHospitalMedical: a.nonHospitalMedical,
      rxClaims: a.rxClaims,
      eeCount: a.eeCount,
      memberCount: a.memberCount,
    }));

    const configsInput = configs.map(c => ({
      serviceMonth: c.serviceMonth,
      expectedClaims: c.expectedClaims,
      stopLossReimb: c.stopLossReimb,
      rxRebates: c.rxRebates,
    }));

    const feeWindowsInput = feeWindows.map(fw => ({
      feeName: fw.feeName,
      unitType: fw.unitType as FeeWindowData["unitType"],
      rate: typeof fw.rate === 'string' ? parseFloat(fw.rate) : fw.rate,
      appliesTo: fw.appliesTo,
      effectiveStart: fw.effectiveStart,
      effectiveEnd: fw.effectiveEnd,
    }));

    if (!budgetConfig) {
      throw new Error('Budget config not found for test plan year');
    }

    const budgetConfigInput: BudgetConfigCalc = {
      claimsModelType: budgetConfig.claimsModelType,
      pctClaimsBase: budgetConfig.pctClaimsBase,
      roundingMode: budgetConfig.roundingMode,
      currencyPrecision: budgetConfig.currencyPrecision,
      defaultHorizonMonths: budgetConfig.defaultHorizonMonths,
    };

    const result = calculateMonthlyStats(actualsInput, configsInput, feeWindowsInput, budgetConfigInput);

    // January: $120k actual / 250 members = $480 PEPM
    const jan = result.months[0];
    expect(jan.pepm).toBe(480); // 120000 / 250

    // YTD PEPM should be total expenses / total member-months
    const totalMembers = result.months.reduce((sum, m) => sum + m.memberCount, 0);
    expect(result.ytd.pepm).toBeCloseTo(result.ytd.actualTotalExpenses / totalMembers, 2);
  });
});
