import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/template
 *
 * Returns CSV template for different upload types
 *
 * Query params:
 * - type: 'all-plans' | 'hdhp' | 'ppo-base' | 'ppo-buyup' | 'high-claimants'
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all-plans';

    let headers: string[];
    let filename: string;
    let sampleRow: string[];

    switch (type) {
      case 'all-plans':
      case 'hdhp':
      case 'ppo-base':
      case 'ppo-buyup':
        // Monthly plan data template - matches user's spreadsheet format
        headers = [
          'Month',
          'Total Subs',
          'Medical Paid',
          'Rx Paid',
          'Spec Stop Los Est',
          'Rx Rebate',
          'Admin Fees',
          'Stop Loss Fee',
          'Budgeted Premi'
        ];
        sampleRow = [
          '2024-01',
          '1501',
          '125000',
          '45000',
          '-5000',
          '-3000',
          '8500',
          '12000',
          '180000'
        ];
        filename = `${type}-monthly-template.csv`;
        break;

      case 'high-claimants':
        // High-cost claimants template
        headers = [
          'Claimant Key',
          'Plan',
          'Status',
          'Primary Diagnosis',
          'Medical Paid',
          'Rx Paid'
        ];
        sampleRow = [
          'CLAIMANT-001',
          'HDHP',
          'ACTIVE',
          'Cancer Treatment',
          '150000.00',
          '25000.00'
        ];
        filename = 'high-claimants-template.csv';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid template type' },
          { status: 400 }
        );
    }

    // Generate CSV with UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const csv = BOM + [
      headers.join(','),
      sampleRow.join(','),
      // Add a few empty rows for users to fill in
      ...Array(5).fill(headers.map(() => '').join(','))
    ].join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });

  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
