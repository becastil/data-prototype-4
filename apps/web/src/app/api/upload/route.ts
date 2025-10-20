import { NextRequest, NextResponse } from 'next/server';
import { Prisma, Plan } from '@prisma/client';
import Papa from 'papaparse';
import { prisma } from '../../../../lib/prisma';

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
 * Save monthly data to database
 * Extracted from PUT endpoint to be reusable
 */
const toJsonValue = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;

const PLAN_NAME_ALIASES: Record<string, string> = {
  'all plans': 'All Plans',
  'hdhp': 'HDHP',
  'ppo base': 'PPO Base',
  'ppo buy up': 'PPO Buy-Up',
  'ppo buy-up': 'PPO Buy-Up',
  'ppo buyup': 'PPO Buy-Up'
};

function normalizePlanKey(label: string): string {
  return label
    .toLowerCase()
    .replace(/-/g, ' ')
    .replace(/\bmonthly\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function canonicalizePlanLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed) {
    return '';
  }

  const normalized = trimmed.toLowerCase().replace(/-/g, ' ');
  const withoutMonthly = normalized.replace(/\bmonthly\b/g, '').replace(/\s+/g, ' ').trim();
  const cleaned = withoutMonthly.replace(/\bplan\b$/, '').trim();
  const alias = PLAN_NAME_ALIASES[cleaned];

  if (alias) {
    return alias;
  }

  return cleaned
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function buildPlanLookup(plans: Plan[]): Record<string, Plan> {
  return plans.reduce<Record<string, Plan>>((acc, plan) => {
    const variants = new Set<string>([
      plan.name,
      canonicalizePlanLabel(plan.name),
      plan.code ?? '',
      `${plan.name} Monthly`,
      plan.code ? `${plan.code} Monthly` : ''
    ]);

    variants.forEach(variant => {
      const value = variant.trim();
      if (!value) return;
      acc[value.toLowerCase()] = plan;
      acc[normalizePlanKey(value)] = plan;
    });

    return acc;
  }, {});
}

/**
 * Helper to normalize plan names from file type.
 * Converts lowercase file type identifiers to proper title case plan names.
 *
 * @param fileType - The file type string (currently always "all plans")
 * @param mappedRowPlan - Plan value from the CSV row itself (if present)
 * @returns Properly cased plan name
 */
function normalizePlanName(fileType: string, mappedRowPlan?: string): string {
  const source = mappedRowPlan && mappedRowPlan.trim()
    ? mappedRowPlan
    : fileType;

  const canonical = canonicalizePlanLabel(source);
  if (canonical) {
    return canonical;
  }

  // Fallback for unexpected inputs
  return canonicalizePlanLabel('All Plans');
}

/**
 * Helper to determine if an "All Plans" row should be skipped during import.
 *
 * "All Plans" rows are skipped ONLY when individual plan data exists for the same month.
 * For files containing ONLY "All Plans" data (e.g., "All Plans Monthly" files),
 * the rows are kept and imported.
 *
 * @param row - The current row being processed
 * @param monthRows - All rows for this month
 * @returns true if the row should be skipped, false otherwise
 */
function shouldSkipAllPlansRow(row: CsvRow, monthRows: CsvRow[]): boolean {
  if (normalizePlanKey(row.plan) !== 'allplans') {
    return false; // Not an "All Plans" row, never skip
  }

  // Check if there are individual plan rows in this month
  const hasIndividualPlans = monthRows.some(r => normalizePlanKey(r.plan) !== 'allplans');
  return hasIndividualPlans; // Skip "All Plans" only if individual plans exist
}

async function saveMonthlyData(
  clientId: string,
  planYearId: string,
  dataRows: CsvRow[]
): Promise<{ monthsImported: number; rowsImported: number }> {
  // Get all plans for this client
  const plans = await prisma.plan.findMany({
    where: { clientId }
  });

  const plansByCode = buildPlanLookup(plans);

  // Group by month
  const byMonth = dataRows.reduce<Record<string, CsvRow[]>>((acc, row) => {
    if (!acc[row.month]) {
      acc[row.month] = [];
    }
    acc[row.month].push(row);
    return acc;
  }, {});

  let rowsImported = 0;

  // Wrap entire import in a transaction for data integrity
  await prisma.$transaction(async (tx) => {
    // Insert data month by month
    for (const month of Object.keys(byMonth)) {
      const monthRows = byMonth[month];
      // Create or update month snapshot
      const snapshot = await tx.monthSnapshot.upsert({
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
        // Skip "All Plans" row if individual plan data exists
        if (shouldSkipAllPlansRow(row, monthRows)) continue;

        const directKey = row.plan.toLowerCase();
        const normalizedKey = normalizePlanKey(row.plan);
        const plan = plansByCode[directKey] ?? plansByCode[normalizedKey];
        if (!plan) {
          const availablePlans = plans.map(p => `"${p.name}" (code: ${p.code || 'none'})`).join(', ');
          throw new Error(
            `Plan "${row.plan}" not found in database. Available plans: ${availablePlans || 'none'}. ` +
            `Please ensure the plan exists in the database before importing data.`
          );
        }

        await tx.monthlyPlanStat.upsert({
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

        rowsImported++;
      }
    }

    // Create audit log within transaction
    const firstUser = await tx.user.findFirst();
    if (firstUser) {
      await tx.auditLog.create({
        data: {
          clientId,
          actorId: firstUser.id,
          entity: 'MONTHLY_DATA',
          entityId: planYearId,
          action: 'UPLOAD',
          before: {},
          after: toJsonValue({ rowCount: dataRows.length, months: Object.keys(byMonth) })
        }
      });
    }
  });

  return {
    monthsImported: Object.keys(byMonth).length,
    rowsImported
  };
}

/**
 * POST /api/upload
 *
 * Upload and validate CSV/XLSX data for monthly plan stats
 *
 * Query params:
 * - preview: 'true' | 'false' (default: false)
 *   - false: Validates and saves data to database
 *   - true: Validates only, returns preview without saving
 *
 * Body (multipart/form-data):
 * - file: CSV/XLSX file
 * - clientId: UUID
 * - planYearId: UUID
 * - fileType: 'all plans'
 */
export async function POST(request: NextRequest) {
  try {
    // Check if preview mode
    const { searchParams } = new URL(request.url);
    const previewMode = searchParams.get('preview') === 'true';

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

    const normalizedFileTypeKey = normalizePlanKey(fileType);
    if (normalizedFileTypeKey !== 'allplans') {
      return NextResponse.json(
        {
          error: 'Only the All Plans CSV template is supported. Please download the latest template and retry.'
        },
        { status: 400 }
      );
    }

    // Read file content
    const content = await file.text();

    // Parse CSV using papaparse - properly handles quoted values, commas in fields, etc.
    const parseResult = Papa.parse<Record<string, string>>(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
      dynamicTyping: false, // Keep as strings for validation
    });

    if (parseResult.errors.length > 0) {
      const criticalErrors = parseResult.errors.filter(e => e.type === 'Quotes' || e.type === 'FieldMismatch');
      if (criticalErrors.length > 0) {
        return NextResponse.json(
          {
            error: 'CSV parsing failed',
            details: criticalErrors.map(e => `Row ${e.row}: ${e.message}`)
          },
          { status: 400 }
        );
      }
    }

    if (!parseResult.data || parseResult.data.length === 0) {
      return NextResponse.json(
        { error: 'File is empty or has no data rows' },
        { status: 400 }
      );
    }

    // Map user's column names to internal field names
    const columnMappings: Record<string, string> = {
      'month': 'month',
      'total_subs': 'subscribers',
      'total_subscribers': 'subscribers',
      'medical_paid': 'medical_paid',
      'rx_paid': 'rx_paid',
      'spec_stop_los_est': 'stop_loss_reimb',
      'spec_stop_loss_reimb': 'stop_loss_reimb',
      'rx_rebate': 'rx_rebates',
      'est_rx_rebates': 'rx_rebates',
      'admin_fees': 'admin_fees',
      'stop_loss_fee': 'stop_loss_fees',
      'stop_loss_fees': 'stop_loss_fees',
      'budgeted_premi': 'budgeted_premium',
      'budgeted_premium': 'budgeted_premium',
      'plan': 'plan'
    };

    // Normalize headers and apply mappings
    const rawHeaders = parseResult.meta.fields || [];
    const normalizedHeaders = rawHeaders.map(h => {
      const normalized = h.toLowerCase().replace(/\s+/g, '_');
      return columnMappings[normalized] || normalized;
    });

    const monthlyRows: CsvRow[] = [];
    const errors: ValidationError[] = [];

    // Validate headers based on file type
    const requiredHeaders = ['month', 'plan', 'subscribers', 'medical_paid', 'rx_paid', 'budgeted_premium'];

    const missingHeaders = requiredHeaders.filter(h => !normalizedHeaders.includes(h));
    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid CSV headers',
          missingHeaders,
          receivedHeaders: rawHeaders
        },
        { status: 400 }
      );
    }

    // Parse and validate data rows
    const parsedRows = parseResult.data as Array<Record<string, string>>;
    for (let i = 0; i < parsedRows.length; i++) {
      const rawRow = parsedRows[i];
      const mappedRow: Record<string, string> = {};

      // Apply column name mappings
      Object.keys(rawRow).forEach((key) => {
        const normalized = key.toLowerCase().replace(/\s+/g, '_');
        const mappedKey = columnMappings[normalized] || normalized;
        mappedRow[mappedKey] = rawRow[key];
      });

      // Validate month format (YYYY-MM)
      if (!/^\d{4}-\d{2}$/.test(mappedRow.month)) {
        errors.push({
          row: i + 1,
          field: 'month',
          message: `Invalid month format. Expected YYYY-MM, got ${mappedRow.month}`
        });
      }

      // Validate numeric fields
      const numericFields = ['subscribers', 'medical_paid', 'rx_paid', 'budgeted_premium'];
      numericFields.forEach(field => {
        const value = Number.parseFloat(mappedRow[field]);
        if (Number.isNaN(value)) {
          errors.push({
            row: i + 1,
            field,
            message: `Invalid number: ${mappedRow[field]}`
          });
        }
      });

      // Parse the row - plan comes from CSV or defaults to normalized fileType
      const parsedRow: CsvRow = {
        month: mappedRow.month,
        plan: normalizePlanName(fileType, mappedRow.plan),
        subscribers: Number.parseInt(mappedRow.subscribers, 10) || 0,
        medicalPaid: Number.parseFloat(mappedRow.medical_paid) || 0,
        rxPaid: Number.parseFloat(mappedRow.rx_paid) || 0,
        stopLossReimb: Number.parseFloat(mappedRow.stop_loss_reimb) || 0,
        rxRebates: Number.parseFloat(mappedRow.rx_rebates) || 0,
        adminFees: Number.parseFloat(mappedRow.admin_fees) || 0,
        stopLossFees: Number.parseFloat(mappedRow.stop_loss_fees) || 0,
        budgetedPremium: Number.parseFloat(mappedRow.budgeted_premium) || 0
      };

      monthlyRows.push(parsedRow);
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

    // Separate data rows from sum/total rows
    const dataRows: CsvRow[] = [];
    let sumRow: CsvRow | undefined;

    monthlyRows.forEach(row => {
      const monthStr = row.month.toLowerCase();
      // Check if this is a sum/total/average row
      if (monthStr.includes('sum') || monthStr.includes('total') || monthStr.includes('average')) {
        sumRow = row;
      } else {
        dataRows.push(row);
      }
    });

    // Validate sum row if present
    const sumValidationErrors: string[] = [];
    if (sumRow) {
      const tolerance = 1.0; // Allow $1 difference due to rounding
      const validatedSumRow: CsvRow = sumRow; // Type assertion for narrowing

      // Calculate actual totals from data rows
      const actualTotals = dataRows.reduce((acc, row) => ({
        subscribers: acc.subscribers + row.subscribers,
        medicalPaid: acc.medicalPaid + row.medicalPaid,
        rxPaid: acc.rxPaid + row.rxPaid,
        stopLossReimb: acc.stopLossReimb + row.stopLossReimb,
        rxRebates: acc.rxRebates + row.rxRebates,
        adminFees: acc.adminFees + row.adminFees,
        stopLossFees: acc.stopLossFees + row.stopLossFees,
        budgetedPremium: acc.budgetedPremium + row.budgetedPremium
      }), {
        subscribers: 0,
        medicalPaid: 0,
        rxPaid: 0,
        stopLossReimb: 0,
        rxRebates: 0,
        adminFees: 0,
        stopLossFees: 0,
        budgetedPremium: 0
      });

      // Check each field
      const checks: Array<{field: string, actual: number, provided: number, label: string}> = [
        { field: 'medicalPaid', actual: actualTotals.medicalPaid, provided: validatedSumRow.medicalPaid, label: 'Medical Paid sum' },
        { field: 'rxPaid', actual: actualTotals.rxPaid, provided: validatedSumRow.rxPaid, label: 'Rx Paid sum' },
        { field: 'stopLossReimb', actual: actualTotals.stopLossReimb, provided: validatedSumRow.stopLossReimb, label: 'Spec Stop Los Est sum' },
        { field: 'rxRebates', actual: actualTotals.rxRebates, provided: validatedSumRow.rxRebates, label: 'Rx Rebate sum' },
        { field: 'adminFees', actual: actualTotals.adminFees, provided: validatedSumRow.adminFees, label: 'Admin Fees sum' },
        { field: 'stopLossFees', actual: actualTotals.stopLossFees, provided: validatedSumRow.stopLossFees, label: 'Stop Loss Fee sum' },
        { field: 'budgetedPremium', actual: actualTotals.budgetedPremium, provided: validatedSumRow.budgetedPremium, label: 'Budgeted sum' }
      ];

      checks.forEach(check => {
        const diff = Math.abs(check.actual - check.provided);
        if (diff > tolerance) {
          sumValidationErrors.push(
            `${check.label}: Calculated sum is $${check.actual.toFixed(2)}, but spreadsheet shows $${check.provided.toFixed(2)} (difference: $${diff.toFixed(2)})`
          );
        }
      });

      // Special check for average subscribers
      if (validatedSumRow.subscribers > 0 && dataRows.length > 0) {
        const actualAvg = actualTotals.subscribers / dataRows.length;
        const diff = Math.abs(actualAvg - validatedSumRow.subscribers);
        if (diff > 1) { // Allow 1 subscriber difference due to rounding
          sumValidationErrors.push(
            `Total Subs Average: Calculated average is ${actualAvg.toFixed(0)}, but spreadsheet shows ${validatedSumRow.subscribers} (difference: ${diff.toFixed(0)})`
          );
        }
      }
    }

    // Reconciliation check: Σ per-plan must equal "All Plans" for each month
    // Only run this check when file contains BOTH "All Plans" AND individual plan data
    const reconciliationErrors: string[] = [];

    const byMonth = dataRows.reduce((acc, row) => {
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

    // Check if we have any individual plans in the data
    const hasIndividualPlans = Object.values(byMonth).some(data => data.plans.length > 0);
    const hasAllPlans = Object.values(byMonth).some(data => data.allPlans !== null);

    // Only perform reconciliation if we have BOTH "All Plans" and individual plan data
    if (hasAllPlans && hasIndividualPlans) {
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

    // Report sum validation errors if any
    if (sumValidationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          sumValidationErrors,
          message: 'Sum/Total row validation failed. The totals in your spreadsheet do not match the calculated sums.'
        },
        { status: 400 }
      );
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

    // If preview mode, return validation results without saving
    if (previewMode) {
      return NextResponse.json({
        success: true,
        preview: {
          rowCount: dataRows.length,
          months: [...new Set(dataRows.map(r => r.month))].sort(),
          plans: [...new Set(dataRows.map(r => r.plan))],
          sampleRows: dataRows.slice(0, 5)
        },
        validation: {
          dataRows: dataRows.length,
          sumRowDetected: sumRow !== undefined,
          sumValidationPassed: sumValidationErrors.length === 0
        },
        saved: false,
        message: 'Validation passed. Data not saved (preview mode).'
      });
    }

    const importResult = await saveMonthlyData(clientId, planYearId, dataRows);

    // Return success with saved data confirmation
    return NextResponse.json({
      success: true,
      preview: {
        rowCount: dataRows.length,
        months: [...new Set(dataRows.map(r => r.month))].sort(),
        plans: [...new Set(dataRows.map(r => r.plan))],
        sampleRows: dataRows.slice(0, 5)
      },
      validation: {
        dataRows: dataRows.length,
        sumRowDetected: sumRow !== undefined,
        sumValidationPassed: sumValidationErrors.length === 0
      },
      saved: true,
      import: {
        monthsImported: importResult.monthsImported,
        rowsImported: importResult.rowsImported
      },
      message: `Validation passed and data saved successfully. Imported ${importResult.rowsImported} rows across ${importResult.monthsImported} months.`
    });

  } catch (error) {
    console.error('Error processing upload:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
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

    const incomingRows: CsvRow[] = Array.isArray(data)
      ? data as CsvRow[]
      : [];

    // Get all plans for this client
    const plans = await prisma.plan.findMany({
      where: { clientId }
    });

    const plansByCode = buildPlanLookup(plans);

    // Group by month
    const byMonth = incomingRows.reduce<Record<string, CsvRow[]>>((acc, row) => {
      if (!acc[row.month]) {
        acc[row.month] = [];
      }
      acc[row.month].push(row);
      return acc;
    }, {});

    // Wrap entire import in a transaction for data integrity
    await prisma.$transaction(async (tx) => {
      // Insert data month by month
      for (const month of Object.keys(byMonth)) {
        const monthRows = byMonth[month];
        // Create or update month snapshot
        const snapshot = await tx.monthSnapshot.upsert({
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
          // Skip "All Plans" row if individual plan data exists
          if (shouldSkipAllPlansRow(row, monthRows)) continue;

          const directKey = row.plan.toLowerCase();
          const normalizedKey = normalizePlanKey(row.plan);
          const plan = plansByCode[directKey] ?? plansByCode[normalizedKey];
          if (!plan) {
            console.warn(`Plan not found: ${row.plan}`);
            continue;
          }

          await tx.monthlyPlanStat.upsert({
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

      // Create audit log within transaction
      const firstUser = await tx.user.findFirst();
      if (firstUser) {
        await tx.auditLog.create({
          data: {
            clientId,
            actorId: firstUser.id,
            entity: 'MONTHLY_DATA',
            entityId: planYearId,
            action: 'UPLOAD',
            before: {},
            after: toJsonValue({ rowCount: incomingRows.length, months: Object.keys(byMonth) })
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${incomingRows.length} rows`,
      monthsImported: Object.keys(byMonth).length
    });

  } catch (error) {
    console.error('Error importing data:', error);
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error) },
      { status: 500 }
    );
  }
}
