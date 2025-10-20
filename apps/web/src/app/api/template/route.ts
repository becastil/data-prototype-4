import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/template
 *
 * Returns CSV template for different upload types
 *
 * Query params:
 * - type: 'all-plans'
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all-plans';

    if (type !== 'all-plans') {
      return NextResponse.json(
        { error: 'Only the All Plans template is supported at this time.' },
        { status: 400 }
      );
    }

    // All Plans monthly data template - includes Plan column
    const headers = [
      'Month',
      'Plan',
      'Total Subs',
      'Medical Paid',
      'Rx Paid',
      'Spec Stop Los Est',
      'Rx Rebate',
      'Admin Fees',
      'Stop Loss Fee',
      'Budgeted Premi'
    ];
    const sampleRow = [
      '2024-01',
      'All Plans',
      '1501',
      '125000',
      '45000',
      '-5000',
      '-3000',
      '8500',
      '12000',
      '180000'
    ];
    const filename = `${type}-monthly-template.csv`;

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
