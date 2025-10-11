import { NextRequest, NextResponse } from 'next/server';
import { getPdfExporter, PdfExporter } from '@medical-reporting/lib/pdf/export';

/**
 * POST /api/export/pdf
 *
 * Generate PDF export of dashboard pages
 *
 * Body:
 * - clientId: UUID
 * - planYearId: UUID
 * - pages?: string[] (optional, defaults to full template order)
 * - filename?: string (optional, defaults to medical-report-{planYearId}.pdf)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientId,
      planYearId,
      pages,
      filename = `medical-report-${planYearId}.pdf`
    } = body;

    if (!clientId || !planYearId) {
      return NextResponse.json(
        { error: 'clientId and planYearId are required' },
        { status: 400 }
      );
    }

    // Get base URL from request
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const baseUrl = `${protocol}://${host}`;

    // Use default template order if pages not specified
    const pagesToExport = pages || PdfExporter.getTemplatePageOrder();

    console.log('Starting PDF export:', {
      clientId,
      planYearId,
      pageCount: pagesToExport.length
    });

    // Get PDF exporter instance
    const exporter = getPdfExporter();

    // Generate PDF
    const result = await exporter.export({
      baseUrl,
      clientId,
      planYearId,
      pages: pagesToExport
    });

    if (!result.success || !result.buffer) {
      return NextResponse.json(
        { error: result.error || 'PDF generation failed' },
        { status: 500 }
      );
    }

    // Return PDF as downloadable file
    return new NextResponse(result.buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': result.buffer.length.toString()
      }
    });

  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/export/pdf/preview
 *
 * Preview a single page as PDF
 *
 * Query params:
 * - page: Page path (e.g., /dashboard/executive)
 * - clientId: UUID
 * - planYearId: UUID
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page');
    const clientId = searchParams.get('clientId');
    const planYearId = searchParams.get('planYearId');

    if (!page || !clientId || !planYearId) {
      return NextResponse.json(
        { error: 'page, clientId, and planYearId are required' },
        { status: 400 }
      );
    }

    // Get base URL
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const baseUrl = `${protocol}://${host}`;

    const url = `${baseUrl}${page}?clientId=${clientId}&planYearId=${planYearId}&print=true`;

    console.log('Generating PDF preview:', url);

    // Get PDF exporter instance
    const exporter = getPdfExporter();

    // Generate PDF for single page
    const pdf = await exporter.exportPage(url);

    // Return PDF
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'Content-Length': pdf.length.toString()
      }
    });

  } catch (error) {
    console.error('PDF preview error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
