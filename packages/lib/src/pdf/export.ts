import puppeteer, { Browser, Page } from 'puppeteer';

export interface PdfExportOptions {
  baseUrl: string;
  clientId: string;
  planYearId: string;
  pages: string[];
  outputPath?: string;
  waitForSelector?: string;
  headerTemplate?: string;
  footerTemplate?: string;
}

export interface PdfExportResult {
  success: boolean;
  filePath?: string;
  buffer?: Buffer;
  error?: string;
  pageCount: number;
}

/**
 * PDF Export Engine
 *
 * Uses Puppeteer to render dashboard pages and export to PDF
 * Template order: Executive → Monthly → HCC → Plans → Inputs
 */
export class PdfExporter {
  private browser: Browser | null = null;

  /**
   * Initialize Puppeteer browser
   */
  async init(): Promise<void> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      });
    }
  }

  /**
   * Close Puppeteer browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Export dashboard pages to PDF
   */
  async export(options: PdfExportOptions): Promise<PdfExportResult> {
    try {
      await this.init();

      if (!this.browser) {
        throw new Error('Browser not initialized');
      }

      const page = await this.browser.newPage();

      // Set viewport for consistent rendering
      await page.setViewport({
        width: 1280,
        height: 1024,
        deviceScaleFactor: 2 // High DPI for crisp text
      });

      // Render each page and collect PDFs
      const pdfs: Buffer[] = [];

      for (const pagePath of options.pages) {
        const url = `${options.baseUrl}${pagePath}?clientId=${options.clientId}&planYearId=${options.planYearId}&print=true`;

        console.log(`Rendering: ${url}`);

        await page.goto(url, {
          waitUntil: 'networkidle0',
          timeout: 30000
        });

        // Wait for content to render
        if (options.waitForSelector) {
          await page.waitForSelector(options.waitForSelector, {
            timeout: 10000
          });
        } else {
          // Default wait for report cards
          await page.waitForSelector('.report-card', {
            timeout: 10000
          });
        }

        // Additional wait for charts to render
        await page.waitForTimeout(1000);

        // Generate PDF for this page
        const pdf = await page.pdf({
          format: 'Letter',
          printBackground: true,
          margin: {
            top: '0.5in',
            right: '0.5in',
            bottom: '0.75in',
            left: '0.5in'
          },
          displayHeaderFooter: true,
          headerTemplate: options.headerTemplate || this.getDefaultHeader(),
          footerTemplate: options.footerTemplate || this.getDefaultFooter()
        });

        pdfs.push(pdf);
      }

      await page.close();

      // Merge all PDFs into single buffer
      // Note: For production, use a PDF library like pdf-lib to properly merge
      const combinedPdf = Buffer.concat(pdfs);

      return {
        success: true,
        buffer: combinedPdf,
        pageCount: options.pages.length
      };

    } catch (error) {
      console.error('PDF export error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        pageCount: 0
      };
    }
  }

  /**
   * Export single page to PDF
   */
  async exportPage(
    url: string,
    options?: Partial<PdfExportOptions>
  ): Promise<Buffer> {
    await this.init();

    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    await page.setViewport({
      width: 1280,
      height: 1024,
      deviceScaleFactor: 2
    });

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Wait for content
    await page.waitForSelector(options?.waitForSelector || '.report-card', {
      timeout: 10000
    });

    await page.waitForTimeout(1000);

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.75in',
        left: '0.5in'
      },
      displayHeaderFooter: true,
      headerTemplate: options?.headerTemplate || this.getDefaultHeader(),
      footerTemplate: options?.footerTemplate || this.getDefaultFooter()
    });

    await page.close();

    return pdf;
  }

  /**
   * Default header template
   */
  private getDefaultHeader(): string {
    return `
      <div style="font-size: 9px; width: 100%; padding: 10px 20px; color: #64748b; border-bottom: 1px solid #e2e8f0;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span>Medical Reporting Platform</span>
          <span class="date"></span>
        </div>
      </div>
    `;
  }

  /**
   * Default footer template
   */
  private getDefaultFooter(): string {
    return `
      <div style="font-size: 9px; width: 100%; padding: 10px 20px; color: #64748b; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
        <span>Confidential - For Internal Use Only</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `;
  }

  /**
   * Get standard template page order
   */
  static getTemplatePageOrder(): string[] {
    return [
      '/dashboard/executive',
      '/dashboard/monthly',
      '/dashboard/hcc',
      '/dashboard/plan/hdhp',
      '/dashboard/plan/ppo-base',
      '/dashboard/plan/ppo-buyup',
      '/dashboard/inputs',
      '/dashboard/summary'
    ];
  }
}

/**
 * Singleton instance
 */
let pdfExporter: PdfExporter | null = null;

/**
 * Get or create PDF exporter instance
 */
export function getPdfExporter(): PdfExporter {
  if (!pdfExporter) {
    pdfExporter = new PdfExporter();
  }
  return pdfExporter;
}

/**
 * Clean up PDF exporter (call on shutdown)
 */
export async function closePdfExporter(): Promise<void> {
  if (pdfExporter) {
    await pdfExporter.close();
    pdfExporter = null;
  }
}
