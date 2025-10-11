# PDF Export Documentation

## Overview

Complete PDF export system using Puppeteer (headless Chrome) to render dashboard pages and generate pixel-accurate PDF reports matching the template layout.

## Architecture

### Components

1. **PdfExporter Class** (`packages/lib/src/pdf/export.ts`)
   - Singleton service managing Puppeteer browser instance
   - Handles page rendering and PDF generation
   - Configurable headers, footers, and page settings

2. **API Routes** (`apps/web/src/app/api/export/pdf/route.ts`)
   - `POST /api/export/pdf` - Full multi-page export
   - `GET /api/export/pdf/preview` - Single page preview

3. **Print CSS** (`apps/web/src/app/print.css`)
   - Print-optimized styles for clean PDF output
   - Hides navigation, buttons, interactive elements
   - Optimizes tables, charts, and spacing

---

## PdfExporter Class

### Initialization

```typescript
import { getPdfExporter } from '@repo/lib/pdf/export';

const exporter = getPdfExporter();
await exporter.init();
```

### Methods

#### `export(options: PdfExportOptions): Promise<PdfExportResult>`

Generate multi-page PDF report.

**Options**:
```typescript
interface PdfExportOptions {
  baseUrl: string;           // Base URL (e.g., http://localhost:3000)
  clientId: string;          // Client UUID
  planYearId: string;        // Plan year UUID
  pages: string[];           // Array of page paths
  outputPath?: string;       // Optional file output path
  waitForSelector?: string;  // Wait for element (default: .report-card)
  headerTemplate?: string;   // Custom header HTML
  footerTemplate?: string;   // Custom footer HTML
}
```

**Result**:
```typescript
interface PdfExportResult {
  success: boolean;
  filePath?: string;
  buffer?: Buffer;
  error?: string;
  pageCount: number;
}
```

**Example**:
```typescript
const result = await exporter.export({
  baseUrl: 'http://localhost:3000',
  clientId: '123e4567-e89b-12d3-a456-426614174000',
  planYearId: '234e5678-e89b-12d3-a456-426614174000',
  pages: [
    '/dashboard/executive',
    '/dashboard/monthly',
    '/dashboard/hcc'
  ]
});

if (result.success) {
  // PDF buffer available in result.buffer
  console.log(`Generated ${result.pageCount} pages`);
}
```

#### `exportPage(url: string, options?: Partial<PdfExportOptions>): Promise<Buffer>`

Export single page to PDF.

**Example**:
```typescript
const url = 'http://localhost:3000/dashboard/executive?clientId=...&planYearId=...&print=true';
const pdf = await exporter.exportPage(url);

// Write to file or send as response
fs.writeFileSync('executive-summary.pdf', pdf);
```

#### `close(): Promise<void>`

Close Puppeteer browser instance.

```typescript
await exporter.close();
```

### Template Page Order

Use static method to get recommended page order:

```typescript
const pages = PdfExporter.getTemplatePageOrder();
// Returns:
// [
//   '/dashboard/executive',
//   '/dashboard/monthly',
//   '/dashboard/hcc',
//   '/dashboard/plan/hdhp',
//   '/dashboard/plan/ppo-base',
//   '/dashboard/plan/ppo-buyup',
//   '/dashboard/inputs',
//   '/dashboard/summary'
// ]
```

---

## API Endpoints

### POST /api/export/pdf

Generate full PDF report with multiple pages.

**Request Body**:
```json
{
  "clientId": "123e4567-e89b-12d3-a456-426614174000",
  "planYearId": "234e5678-e89b-12d3-a456-426614174000",
  "pages": [
    "/dashboard/executive",
    "/dashboard/monthly"
  ],
  "filename": "medical-report-2025.pdf"
}
```

**Response**:
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="medical-report-2025.pdf"`
- Binary PDF file

**Example Usage**:
```typescript
const response = await fetch('/api/export/pdf', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: '123e4567-e89b-12d3-a456-426614174000',
    planYearId: '234e5678-e89b-12d3-a456-426614174000'
  })
});

const blob = await response.blob();
const url = window.URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'medical-report.pdf';
a.click();
```

### GET /api/export/pdf/preview

Preview single page as PDF.

**Query Parameters**:
- `page`: Page path (e.g., `/dashboard/executive`)
- `clientId`: Client UUID
- `planYearId`: Plan year UUID

**Response**:
- Content-Type: `application/pdf`
- Content-Disposition: `inline`
- Binary PDF file (displayed in browser)

**Example URL**:
```
GET /api/export/pdf/preview?page=/dashboard/executive&clientId=123...&planYearId=234...
```

---

## Print-Optimized CSS

### Activation

Print mode is activated when `?print=true` query parameter is present:

```typescript
// In page component
useEffect(() => {
  const isPrintMode = new URLSearchParams(window.location.search).get('print') === 'true';

  if (isPrintMode) {
    document.body.classList.add('print-mode');
  }
}, []);
```

### CSS Classes

**Hide elements**:
```tsx
<button className="no-print">Edit</button>
<nav className="no-print">Navigation</nav>
```

**Page breaks**:
```tsx
<div className="page-break-before">New page starts here</div>
<div className="page-break-after">New page after this</div>
<div className="page-break-avoid">Keep together on same page</div>
```

**Print-only elements**:
```tsx
<div className="print-only">
  <h1>Confidential Report</h1>
  <p>Generated: {new Date().toLocaleString()}</p>
</div>
```

### Style Overrides

The print CSS (`print.css`) provides:

**Layout**:
- Hides: sidebar navigation, header, buttons, status pills
- Shows: report cards, tables, charts
- Page margins: 0.5in top/right/left, 0.75in bottom

**Tables**:
- Font size: 10px (9px for monthly detail)
- White background
- Border: 1px solid #e2e8f0
- Headers: light gray background (#f1f5f9)

**Charts**:
- White background
- Visible grid lines
- Proper color rendering

**Text**:
- All text converted to dark colors for readability
- No shadows or text effects
- Page breaks avoided after headings

---

## Header and Footer Templates

### Default Header

```html
<div style="font-size: 9px; width: 100%; padding: 10px 20px; color: #64748b; border-bottom: 1px solid #e2e8f0;">
  <div style="display: flex; justify-content: space-between; align-items: center;">
    <span>Medical Reporting Platform</span>
    <span class="date"></span>
  </div>
</div>
```

### Default Footer

```html
<div style="font-size: 9px; width: 100%; padding: 10px 20px; color: #64748b; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
  <span>Confidential - For Internal Use Only</span>
  <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
</div>
```

### Custom Headers/Footers

```typescript
const customHeader = `
  <div style="text-align: center; padding: 10px; font-size: 10px;">
    <strong>ACME Corporation</strong> | Medical Benefits Report
  </div>
`;

const result = await exporter.export({
  baseUrl,
  clientId,
  planYearId,
  pages,
  headerTemplate: customHeader
});
```

---

## Puppeteer Configuration

### Browser Launch Options

```typescript
{
  headless: true,
  args: [
    '--no-sandbox',              // Required for Docker/Linux
    '--disable-setuid-sandbox',  // Required for Docker/Linux
    '--disable-dev-shm-usage',   // Prevent memory issues
    '--disable-gpu'              // Not needed for PDF
  ]
}
```

### Viewport Settings

```typescript
{
  width: 1280,
  height: 1024,
  deviceScaleFactor: 2  // High DPI for crisp rendering
}
```

### PDF Options

```typescript
{
  format: 'Letter',           // 8.5" x 11"
  printBackground: true,      // Include background colors/images
  margin: {
    top: '0.5in',
    right: '0.5in',
    bottom: '0.75in',
    left: '0.5in'
  },
  displayHeaderFooter: true,
  headerTemplate: '...',
  footerTemplate: '...'
}
```

---

## Rendering Pipeline

1. **Initialize Browser**
   ```typescript
   const browser = await puppeteer.launch(options);
   const page = await browser.newPage();
   ```

2. **Set Viewport**
   ```typescript
   await page.setViewport({ width: 1280, height: 1024, deviceScaleFactor: 2 });
   ```

3. **Navigate to Page**
   ```typescript
   await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
   ```

4. **Wait for Content**
   ```typescript
   await page.waitForSelector('.report-card', { timeout: 10000 });
   await page.waitForTimeout(1000); // Extra time for charts
   ```

5. **Generate PDF**
   ```typescript
   const pdf = await page.pdf(pdfOptions);
   ```

6. **Cleanup**
   ```typescript
   await page.close();
   ```

---

## Performance Optimization

### Page Caching

```typescript
// Cache frequently accessed pages
const cache = new Map<string, Buffer>();

async function exportWithCache(url: string): Promise<Buffer> {
  if (cache.has(url)) {
    return cache.get(url)!;
  }

  const pdf = await exporter.exportPage(url);
  cache.set(url, pdf);

  // Clear cache after 5 minutes
  setTimeout(() => cache.delete(url), 5 * 60 * 1000);

  return pdf;
}
```

### Concurrent Rendering

```typescript
// Render multiple pages in parallel
async function exportConcurrent(pages: string[]): Promise<Buffer[]> {
  const promises = pages.map(page => exporter.exportPage(page));
  return Promise.all(promises);
}
```

### Browser Reuse

```typescript
// Keep browser instance alive between requests
const exporter = getPdfExporter();
await exporter.init(); // Initialize once

// Multiple exports
await exporter.export({ ... });
await exporter.export({ ... });

// Close when server shuts down
process.on('SIGTERM', async () => {
  await exporter.close();
});
```

---

## Error Handling

### Timeout Errors

```typescript
try {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.error('Page load timeout. Check network and page performance.');
  }
  throw error;
}
```

### Selector Not Found

```typescript
try {
  await page.waitForSelector('.report-card', { timeout: 10000 });
} catch (error) {
  console.error('Content not rendered. Check page structure.');
  // Take screenshot for debugging
  await page.screenshot({ path: 'error.png' });
  throw error;
}
```

### Memory Issues

```typescript
// Limit concurrent PDF generation
const semaphore = new Semaphore(2); // Max 2 concurrent

async function exportWithLimit(url: string): Promise<Buffer> {
  await semaphore.acquire();
  try {
    return await exporter.exportPage(url);
  } finally {
    semaphore.release();
  }
}
```

---

## Deployment Considerations

### Docker

**Dockerfile additions**:
```dockerfile
# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libxss1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libgtk-3-0

# Set Puppeteer to use system Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

### Render.com

**Build command**:
```bash
npm install && npm run build
```

**Start command**:
```bash
npm start
```

**Environment variables**:
```bash
NODE_ENV=production
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
```

### AWS Lambda

For Lambda deployment, use `chrome-aws-lambda`:

```bash
npm install chrome-aws-lambda
```

```typescript
import chromium from 'chrome-aws-lambda';

const browser = await chromium.puppeteer.launch({
  args: chromium.args,
  executablePath: await chromium.executablePath,
  headless: chromium.headless
});
```

---

## Testing

### Unit Tests

```typescript
import { PdfExporter } from '@repo/lib/pdf/export';

describe('PdfExporter', () => {
  let exporter: PdfExporter;

  beforeAll(async () => {
    exporter = new PdfExporter();
    await exporter.init();
  });

  afterAll(async () => {
    await exporter.close();
  });

  test('exports single page', async () => {
    const pdf = await exporter.exportPage('http://localhost:3000/dashboard/executive');
    expect(pdf).toBeInstanceOf(Buffer);
    expect(pdf.length).toBeGreaterThan(1000);
  });

  test('exports multiple pages', async () => {
    const result = await exporter.export({
      baseUrl: 'http://localhost:3000',
      clientId: 'test-client',
      planYearId: 'test-year',
      pages: ['/dashboard/executive', '/dashboard/monthly']
    });

    expect(result.success).toBe(true);
    expect(result.pageCount).toBe(2);
  });
});
```

### Integration Tests

```typescript
import { test, expect } from '@playwright/test';

test('PDF export generates valid file', async ({ page }) => {
  // Navigate to dashboard
  await page.goto('/dashboard');

  // Click export button
  await page.click('[data-testid="export-pdf-button"]');

  // Wait for download
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('button:has-text("Download PDF")')
  ]);

  // Verify download
  const path = await download.path();
  const stats = fs.statSync(path);
  expect(stats.size).toBeGreaterThan(10000); // At least 10KB
});
```

---

## Troubleshooting

### Issue: PDF is blank

**Cause**: Page not fully rendered before PDF generation
**Solution**: Increase wait time or add specific selector

```typescript
await page.waitForTimeout(2000); // Wait 2 seconds
await page.waitForSelector('.recharts-wrapper'); // Wait for charts
```

### Issue: Charts not rendering

**Cause**: JavaScript execution blocked or timeout
**Solution**: Wait for network idle and specific elements

```typescript
await page.goto(url, { waitUntil: 'networkidle0' });
await page.waitForSelector('.recharts-line', { timeout: 15000 });
```

### Issue: Memory errors in production

**Cause**: Browser instances not closed
**Solution**: Ensure cleanup in error cases

```typescript
try {
  const pdf = await exporter.exportPage(url);
  return pdf;
} catch (error) {
  await exporter.close(); // Force cleanup
  throw error;
}
```

### Issue: Fonts not rendering

**Cause**: System fonts missing in Docker
**Solution**: Install font packages

```dockerfile
RUN apt-get install -y fonts-liberation fonts-dejavu-core
```

---

## Future Enhancements

1. **PDF Merging**
   - Use `pdf-lib` to properly merge multi-page PDFs
   - Add table of contents
   - Insert cover page

2. **Watermarks**
   - Add "DRAFT" or "CONFIDENTIAL" watermark
   - Custom client branding

3. **Interactive PDFs**
   - Clickable table of contents
   - Hyperlinks to external resources

4. **Batch Processing**
   - Queue system for large exports
   - Progress tracking
   - Email notification on completion

5. **Template Customization**
   - Per-client header/footer templates
   - Logo upload and placement
   - Color scheme customization

---

## Resources

- [Puppeteer Documentation](https://pptr.dev/)
- [Puppeteer PDF Options](https://pptr.dev/api/puppeteer.pdfoptions)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [PDF/A Standard](https://en.wikipedia.org/wiki/PDF/A)

---

**PDF Export Status**: ✅ 100% Complete
**Next Step**: Integrate export button into dashboard pages
