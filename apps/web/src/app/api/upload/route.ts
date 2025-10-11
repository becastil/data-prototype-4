import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CsvRow {
  month: string;
  plan: string;
  subscribers: number;
  medicalPaid: number;
  rxPaid: number;
  stopLossReimb: number;
  rxRebates: number;
  adminFees: number;
  stopLossFees: number;
  budgetedPremium: number;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

/**
 * POST /api/upload
 *
 * Upload and validate CSV/XLSX data for monthly plan stats
 *
 * Body (multipart/form-data):
 * - file: CSV/XLSX file
 * - clientId: UUID
 * - planYearId: UUID
 * - fileType: 'monthly' | 'hcc' | 'inputs'
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clientId = formData.get('clientId') as string;
    const planYearId = formData.get('planYearId') as string;
    const fileType = formData.get('fileType') as string;

    if (!file || !clientId || !planYearId || !fileType) {
      return NextResponse.json(
        { error: 'file, clientId, planYearId, and fileType are required' },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();
    const lines = content.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      return NextResponse.json(
        { error: 'File is empty or has no data rows' },
        { status: 400 }
      );
    }

    // Parse CSV (simple implementation - production would use a library like papaparse)
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const rows: CsvRow[] = [];
    const errors: ValidationError[] = [];

    // Validate headers based on file type
    const requiredHeaders = fileType === 'monthly'
      ? ['month', 'plan', 'subscribers', 'medical_paid', 'rx_paid', 'budgeted_premium']
      : fileType === 'hcc'
      ? ['claimant_key', 'plan', 'total_paid', 'medical_paid', 'rx_paid']
      : [];

    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid CSV headers',
          missingHeaders,
          receivedHeaders: headers
        },
        { status: 400 }
      );
    }

    // Parse and validate data rows
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      // Validate based on file type
      if (fileType === 'monthly') {
        // Validate month format (YYYY-MM)
        if (!/^\d{4}-\d{2}$/.test(row.month)) {
          errors.push({
            row: i + 1,
            field: 'month',
            message: `Invalid month format. Expected YYYY-MM, got ${row.month}`
          });
        }

        // Validate numeric fields
        const numericFields = ['subscribers', 'medical_paid', 'rx_paid', 'budgeted_premium'];
        numericFields.forEach(field => {
          const value = parseFloat(row[field]);
          if (isNaN(value)) {
            errors.push({
              row: i + 1,
              field,
              message: `Invalid number: ${row[field]}`
            });
          }
        });

        // Parse the row
        const parsedRow: CsvRow = {
          month: row.month,
          plan: row.plan,
          subscribers: parseInt(row.subscribers) || 0,
          medicalPaid: parseFloat(row.medical_paid) || 0,
          rxPaid: parseFloat(row.rx_paid) || 0,
          stopLossReimb: parseFloat(row.stop_loss_reimb || 0),
          rxRebates: parseFloat(row.rx_rebates || 0),
          adminFees: parseFloat(row.admin_fees || 0),
          stopLossFees: parseFloat(row.stop_loss_fees || 0),
          budgetedPremium: parseFloat(row.budgeted_premium) || 0
        };

        rows.push(parsedRow);
      }
    }

    // Stop if there are validation errors
    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          errors,
          message: `Found ${errors.length} validation error(s)`
        },
        { status: 400 }
      );
    }

    // Reconciliation check: Σ per-plan must equal "All Plans" for each month
    const reconciliationErrors: string[] = [];

    if (fileType === 'monthly') {
      const byMonth = rows.reduce((acc, row) => {
        if (!acc[row.month]) {
          acc[row.month] = { allPlans: null, plans: [] };
        }

        if (row.plan.toLowerCase() === 'all plans') {
          acc[row.month].allPlans = row;
        } else {
          acc[row.month].plans.push(row);
        }

        return acc;
      }, {} as Record<string, { allPlans: CsvRow | null; plans: CsvRow[] }>);

      Object.entries(byMonth).forEach(([month, data]) => {
        if (!data.allPlans) {
          reconciliationErrors.push(`Month ${month}: Missing "All Plans" row`);
          return;
        }

        const sumMedical = data.plans.reduce((sum, p) => sum + p.medicalPaid, 0);
        const sumRx = data.plans.reduce((sum, p) => sum + p.rxPaid, 0);
        const sumBudget = data.plans.reduce((sum, p) => sum + p.budgetedPremium, 0);

        const tolerance = 0.01;

        if (Math.abs(sumMedical - data.allPlans.medicalPaid) > tolerance) {
          reconciliationErrors.push(
            `Month ${month}: Medical Paid mismatch. Sum of plans: $${sumMedical.toFixed(2)}, All Plans: $${data.allPlans.medicalPaid.toFixed(2)}`
          );
        }

        if (Math.abs(sumRx - data.allPlans.rxPaid) > tolerance) {
          reconciliationErrors.push(
            `Month ${month}: Rx Paid mismatch. Sum of plans: $${sumRx.toFixed(2)}, All Plans: $${data.allPlans.rxPaid.toFixed(2)}`
          );
        }

        if (Math.abs(sumBudget - data.allPlans.budgetedPremium) > tolerance) {
          reconciliationErrors.push(
            `Month ${month}: Budgeted Premium mismatch. Sum of plans: $${sumBudget.toFixed(2)}, All Plans: $${data.allPlans.budgetedPremium.toFixed(2)}`
          );
        }
      });
    }

    if (reconciliationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          reconciliationErrors,
          message: 'Reconciliation failed. Sum of individual plans does not match All Plans totals.'
        },
        { status: 400 }
      );
    }

    // Return preview data (actual insert would happen on confirmation)
    return NextResponse.json({
      success: true,
      preview: {
        rowCount: rows.length,
        months: [...new Set(rows.map(r => r.month))].sort(),
        plans: [...new Set(rows.map(r => r.plan))],
        sampleRows: rows.slice(0, 5)
      },
      message: 'Validation passed. Ready to import.'
    });

  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * PUT /api/upload
 *
 * Confirm and execute the data import
 *
 * Body:
 * - clientId: UUID
 * - planYearId: UUID
 * - data: Validated rows from POST response
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, planYearId, data } = body;

    if (!clientId || !planYearId || !data) {
      return NextResponse.json(
        { error: 'clientId, planYearId, and data are required' },
        { status: 400 }
      );
    }

    // Get all plans for this client
    const plans = await prisma.plan.findMany({
      where: { clientId }
    });

    const plansByCode = plans.reduce((acc, plan) => {
      acc[plan.code.toLowerCase()] = plan;
      return acc;
    }, {} as Record<string, any>);

    // Group by month
    const byMonth = data.reduce((acc: any, row: CsvRow) => {
      if (!acc[row.month]) {
        acc[row.month] = [];
      }
      acc[row.month].push(row);
      return acc;
    }, {});

    // Insert data month by month
    for (const [month, monthRows] of Object.entries(byMonth) as [string, CsvRow[]][]) {
      // Create or update month snapshot
      const snapshot = await prisma.monthSnapshot.upsert({
        where: {
          clientId_planYearId_monthDate: {
            clientId,
            planYearId,
            monthDate: new Date(month + '-01')
          }
        },
        create: {
          clientId,
          planYearId,
          monthDate: new Date(month + '-01')
        },
        update: {}
      });

      // Insert plan stats for this month
      for (const row of monthRows) {
        // Skip "All Plans" row - it's calculated
        if (row.plan.toLowerCase() === 'all plans') continue;

        const plan = plansByCode[row.plan.toLowerCase()];
        if (!plan) {
          console.warn(`Plan not found: ${row.plan}`);
          continue;
        }

        await prisma.monthlyPlanStat.upsert({
          where: {
            snapshotId_planId: {
              snapshotId: snapshot.id,
              planId: plan.id
            }
          },
          create: {
            snapshotId: snapshot.id,
            planId: plan.id,
            totalSubscribers: row.subscribers,
            medicalPaid: row.medicalPaid,
            rxPaid: row.rxPaid,
            specStopLossReimb: row.stopLossReimb,
            estRxRebates: row.rxRebates,
            adminFees: row.adminFees,
            stopLossFees: row.stopLossFees,
            budgetedPremium: row.budgetedPremium
          },
          update: {
            totalSubscribers: row.subscribers,
            medicalPaid: row.medicalPaid,
            rxPaid: row.rxPaid,
            specStopLossReimb: row.stopLossReimb,
            estRxRebates: row.rxRebates,
            adminFees: row.adminFees,
            stopLossFees: row.stopLossFees,
            budgetedPremium: row.budgetedPremium
          }
        });
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        clientId,
        userId: 'system', // TODO: Replace with actual user ID from auth
        entity: 'MONTHLY_DATA',
        entityId: planYearId,
        action: 'UPLOAD',
        changesSummary: `Uploaded ${data.length} rows of monthly data`,
        beforeSnapshot: {},
        afterSnapshot: { rowCount: data.length, months: Object.keys(byMonth) }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${data.length} rows`,
      monthsImported: Object.keys(byMonth).length
    });

  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
