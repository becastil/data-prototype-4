# Claims & Expenses vs Budget Module

## Overview
Complete budget variance analysis module for generating and emailing 2-page PDF reports comparing actual claims and expenses against budget. Built for CFOs and HR executives.

## Architecture

### Tech Stack (Existing - Zero New Dependencies Added)
- **Framework**: Next.js 14.2 (App Router), React 18.3, TypeScript 5.5
- **Database**: Prisma 5.18 + PostgreSQL
- **Parsing**: xlsx 0.18.5, PapaParse 5.4.1
- **Validation**: Zod 3.23
- **PDF**: Puppeteer 22.0
- **Email**: nodemailer 6.9.0 (newly added)
- **Date**: date-fns 3.6
- **UI**: Tailwind CSS 3.4, Radix UI, Lucide React
- **Auth**: Auth0

### Project Structure
```
data-prototype-4/
├── apps/web/
│   ├── prisma/schema.prisma          # Extended with 6 new models
│   └── src/app/
│       ├── api/budget/               # Budget API routes
│       │   ├── upload/route.ts       # CSV/XLSX upload & validation
│       │   ├── config/route.ts       # Budget configuration
│       │   ├── calculate/route.ts    # Variance calculations
│       │   ├── generate-html/route.ts # PDF HTML template
│       │   ├── export/pdf/route.ts   # Puppeteer PDF generation
│       │   └── deliver/send/route.ts # Email with attachment
│       └── dashboard/budget/page.tsx # Main UI (4-tab workflow)
├── packages/
│   ├── lib/src/                      # Shared business logic
│   │   ├── types/budget.ts           # Zod schemas
│   │   ├── parsers/budget-upload.ts  # CSV/XLSX parsers
│   │   ├── formulas/
│   │   │   ├── fee-proration.ts      # Fee calculation with mid-year changes
│   │   │   └── budget-vs-actuals.ts  # Core calculation engine
│   │   └── index.ts                  # Exports
│   └── ui/src/                       # React components
│       ├── BudgetUpload.tsx          # File upload with drag-drop
│       ├── BudgetConfigEditor.tsx    # Fee windows editor
│       ├── VariancePreviewGrid.tsx   # Monthly variance table
│       ├── EmailDeliveryForm.tsx     # Email delivery UI
│       └── index.tsx                 # Exports
```

## Database Schema (Prisma)

### New Models
1. **UploadAudit** - Audit trail for file uploads
2. **MonthlyActuals** - Uploaded claims data (long format)
3. **MonthlyConfig** - Expected claims & adjustments per month
4. **FeeWindow** - Rate/fee definitions with effective dates
5. **BudgetConfig** - Global settings (rounding, precision, etc.)
6. **EmailDeliveryLog** - Email send audit trail

### New Enums
- **FeeUnitType**: ANNUAL, MONTHLY, PEPM, PEPEM, PERCENT_OF_CLAIMS, FLAT
- **FeeCategory**: FIXED, CLAIMS, RX, ADMIN, STOP_LOSS, OTHER

## Features

### 1. Data Intake (Upload & Mapping)
- **Formats**: CSV, XLSX
- **Layout**: Long format (one row per month)
- **Required Columns**:
  - `service_month` (YYYY-MM-01)
  - `domestic_facility_ip_op`
  - `non_domestic_ip_op`
  - `non_hospital_medical`
  - `rx_claims`
  - `ee_count_active_cobra`
  - `member_count`
- **Validation**: Zod schemas with row-level error reporting
- **Normalization**: Auto-strips $, commas, whitespace

### 2. Configuration (Budget, Fees, Adjustments)
- **Fee Windows**: Multiple effective date ranges per fee
- **Unit Types Supported**:
  - **Annual**: Rate/12 with proration
  - **Monthly**: Fixed monthly amount with proration
  - **PEPM**: Rate × member_count
  - **PEPEM**: Rate × ee_count
  - **Percent of Claims**: Rate × (actual or expected claims)
  - **Flat**: One-time amount
- **Mid-Year Changes**: Automatic daily proration for partial months
- **Adjustments**: Stop-loss reimbursements & Rx rebates (user-entered)

### 3. Analytics & Visualization
- **Monthly Calculations**:
  ```
  TotalClaims = domestic + non_domestic + non_hospital + rx
  FixedCosts = Σ fee_i (with proration logic)
  ActualTotal = TotalClaims + FixedCosts - StopLoss - RxRebates
  BudgetTotal = ExpectedClaims + BudgetedFixed
  Var$ = ActualTotal - BudgetTotal
  Var% = Var$ / BudgetTotal × 100
  PEPM = ActualTotal / members
  ```
- **Summaries**: YTD and Last 3 Months
- **Rounding**: Configurable (Banker's or Half-Up), 0-2 decimal places

### 4. Report Delivery (Email w/ PDF)
- **Page 1**: Executive table with:
  - Month | EE | Members | Claims | Fixed | Actual | Budget | Var$ | Var% | PEPM
  - YTD row (bold, blue background)
  - Last 3 Months summary
- **Page 2**: Chart placeholders (3 charts):
  1. Line: Actual vs Budget trend
  2. Stacked Bars: Claims + Fixed vs Budget
  3. Donut: YTD expense mix
- **Branding**: Gallagher colors (#0066b2), high-contrast for print
- **Email**: Automated with executive summary + disclaimers

## API Routes

### POST /api/budget/upload
**Input**: FormData with `file` (CSV/XLSX) and `planYearId`
**Output**: `{ success, rowsImported, preview[], errors[] }`
**Logic**: Parse → Validate → Upsert MonthlyActuals

### GET/POST /api/budget/config
**GET**: Fetch budget config, monthly configs, fee windows
**POST**: Upsert budget config, monthly configs, fee windows
**Auth**: Client-scoped via Auth0 session

### GET /api/budget/calculate
**Input**: Query param `planYearId`
**Output**: `{ months[], ytd, lastThreeMonths }`
**Logic**: Runs core calculation engine with all fee proration

### POST /api/budget/generate-html
**Input**: Calculation results + metadata
**Output**: `{ html }`
**Logic**: Renders 2-page HTML template with Gallagher branding

### POST /api/budget/export/pdf
**Input**: HTML string (request body)
**Output**: PDF buffer
**Logic**: Puppeteer headless Chrome conversion

### POST /api/budget/deliver/send
**Input**: `{ to[], cc[], subject, htmlBody, pdfBase64, planYearId }`
**Output**: `{ success, messageId, recipients }`
**Logic**: Nodemailer SMTP with attachment + audit log

## Environment Variables

Required for email delivery:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gallagher.com
SMTP_PASS=your-app-password
MAIL_FROM="Gallagher Benefits <noreply@gallagher.com>"
```

## Setup & Installation

### 1. Install Dependencies
```bash
cd apps/web
npm install
```

### 2. Run Prisma Migrations
```bash
cd apps/web
npx prisma migrate dev --name add_budget_module
npx prisma generate
```

### 3. Configure Environment Variables
Add SMTP settings to `.env.local`:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gallagher.com
SMTP_PASS=your-app-password
MAIL_FROM="Gallagher Benefits <noreply@gallagher.com>"
```

### 4. Start Development Server
```bash
npm run dev
```

Navigate to: `http://localhost:3000/dashboard/budget?planYearId=<uuid>`

## Usage Workflow

### 1. Upload Data
1. Navigate to **Upload Data** tab
2. Drag & drop or select CSV/XLSX file
3. Click "Upload & Validate"
4. Review preview or fix errors

### 2. Configure
1. Navigate to **Configure** tab
2. Click "+ Add Fee" to create fee windows
3. Set:
   - Fee name (e.g., "Admin Fee")
   - Unit type (Annual, Monthly, PEPM, etc.)
   - Rate
   - Applies to (Fixed, Claims, etc.)
   - Effective start/end dates
4. Click "Save Configuration"

### 3. Preview
1. Navigate to **Preview** tab
2. Review calculated variance table
3. Verify YTD and Last 3 Months summaries
4. Check variance badges (green = under, red = over)

### 4. Deliver
1. Navigate to **Deliver** tab
2. Add recipient email addresses
3. Optional: Add CC recipients
4. Customize subject line
5. Click "Generate & Send Report"
6. Wait for PDF generation and email delivery

## Testing

### Unit Tests (Jest)
```bash
cd packages/lib
npm test
```

Test coverage includes:
- Fee proration logic (partial months)
- PEPM/PEPEM calculations
- Percent of claims with base toggle
- Rounding modes (Banker's vs Half-Up)

### E2E Tests (Playwright)
```bash
cd apps/web
npx playwright test
```

Test scenarios:
- Complete upload → config → preview → email workflow
- CSV parsing with validation errors
- Fee window CRUD operations
- PDF generation

## Security

### Row-Level Access Control
- All queries filtered by `user.clientId`
- Auth0 session validation on all routes
- Plan year ownership verified before operations

### Audit Trails
- Upload history logged in `UploadAudit`
- Email deliveries logged in `EmailDeliveryLog`
- All mutations include `createdAt`/`updatedAt`

### Data Privacy
- No PHI stored (de-identified data only)
- Optional: Auto-delete raw files post-export
- Encrypted SMTP connection (TLS)

## Performance Considerations

### Optimization Strategies
- **Prisma Connection Pooling**: Reuse connections
- **Puppeteer**: Launch with `--no-sandbox` for Docker
- **Calculation Caching**: Consider Redis for large datasets
- **Batch Operations**: Transaction-wrapped upserts

### Scaling
- **Horizontal**: Stateless API routes scale via load balancer
- **Vertical**: Puppeteer requires ~512MB RAM per instance
- **Async**: Background jobs via queues (BullMQ) for large reports

## Troubleshooting

### Common Issues

**1. SMTP Connection Failed**
- Verify `SMTP_*` env vars are set
- Check firewall allows outbound port 465/587
- Use app-specific password (not account password)

**2. Puppeteer Timeout**
- Increase timeout in `page.pdf({ timeout: 60000 })`
- Check for large images in HTML template
- Verify headless Chrome installed: `npx puppeteer browsers install chrome`

**3. Validation Errors on Upload**
- Check date format is exactly `YYYY-MM-01`
- Ensure numeric columns don't contain text
- Verify all required columns present

**4. Proration Incorrect**
- Verify `effectiveStart`/`effectiveEnd` span correct months
- Check for overlapping fee windows
- Ensure `date-fns` is using correct timezone

## Roadmap / Future Enhancements

### Phase 2 Features
- [ ] Wide-to-long format mapping UI
- [ ] Chart rendering in PDF (Recharts → Canvas → Image)
- [ ] Outlier detection with toggle exclusion
- [ ] Derived claims budget (Model B: PEPM × members)
- [ ] Multi-client batch reporting
- [ ] Scheduled email delivery (cron jobs)
- [ ] Excel export alternative
- [ ] Template customization (white-label)

### Technical Debt
- [ ] Extract Prisma client to singleton pattern
- [ ] Add Redis caching for calculation results
- [ ] Implement WebSocket for real-time upload progress
- [ ] Add comprehensive E2E test coverage (80%+)
- [ ] Optimize Puppeteer with screenshot pooling

## Support & Documentation

### Internal Resources
- **Gallagher Brand Guidelines**: Contact marketing for logo assets
- **SMTP Configuration**: IT department for production credentials
- **Database Schema**: See `prisma/schema.prisma`

### External Dependencies
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Puppeteer Docs](https://pptr.dev/)
- [Nodemailer Docs](https://nodemailer.com/)

## License & Compliance
Proprietary - Gallagher Benefits Services
Confidential & Internal Use Only

---

**Version**: 1.0.0
**Last Updated**: 2025-01-13
**Maintainer**: Development Team
