# Medical Reporting Platform

Enterprise-grade, HIPAA-conscious web application for Self-Funded Medical & Pharmacy Reporting with C&E (Claims & Expenses) analytics.

## Features

✅ **Executive Summary** - Fuel gauge with budget thresholds, Plan YTD analysis, med vs Rx split
✅ **Monthly Detail** - A-N column formulas with PEPM charts (rolling 24 months)
✅ **High-Cost Claimants** - ISL-based filtering with Employer vs Stop Loss visualization
✅ **Plan-Specific Pages** - Dynamic routing for HDHP, PPO Base, PPO Buy-Up with PEPM comparisons
✅ **Inputs Configuration** - Premium equivalents, admin fees, stop loss rates by plan/tier
✅ **C&E 28-Row Statement** - Comprehensive monthly/cumulative summary with user adjustments
✅ **Fees Manager** - Admin fees (PEPM/PMPM/Flat) and C&E adjustments (#6, #9, #11) with live previews
✅ **Upload Wizard** - 3-step CSV/XLSX validation and reconciliation
🚧 **PDF Exports** - Pixel-accurate reports matching template layout *(in progress)*
✅ **Uber-Inspired UI** - Dark-mode-first design with "On our way" feedback motif

## Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 16 (via Docker)

### Installation

```bash
# Clone and install
git clone <repo-url>
cd data-prototype-4
npm install

# Configure environment variables (edit the copied files with real secrets)
cp .env.example .env
cp apps/web/.env.example apps/web/.env

# Start infrastructure
docker compose up -d postgres

# Set up database
cd apps/web
npx prisma generate
npx prisma db push
npx prisma db seed

# Start development server
npm run dev
```

Application will be available at http://localhost:3000

### One-Command Start

```bash
npm run docker:up
```

## Tech Stack

- **Frontend:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS
- **Backend:** Next.js Route Handlers, Server Actions
- **Database:** PostgreSQL 16 + Prisma ORM
- **Auth:** Auth0 OAuth 2.0/OIDC with RBAC
- **Storage:** S3-compatible for uploads/exports
- **Observability:** OpenTelemetry, Prometheus, Grafana
- **Deployment:** Render.com

## Project Structure

```
/apps/web           - Next.js application
/packages/ui        - Shared UI components
/packages/lib       - Formula engines, parsers, domain logic
/infra              - Docker, Terraform, Prometheus config
/scripts            - Seed data, migrations
/docs               - Runbooks, data dictionary
```

## Development

```bash
# Run all packages in dev mode
npm run dev

# Build all packages
npm run build

# Run tests
npm run test

# Database commands
npm run db:studio     # Prisma Studio UI
npm run db:generate   # Generate Prisma Client
npm run db:push       # Push schema changes
npm run db:seed       # Seed sample data

# Docker commands
npm run docker:up     # Start all services
npm run docker:down   # Stop all services
```

## Environment Variables

1. Copy the root `.env.example` to `.env` for shared values like `DATABASE_URL`.
2. Copy `apps/web/.env.example` to `apps/web/.env` for Next.js- and Prisma-specific settings.
3. Never commit `.env` or `.env.local` files—those are gitignored by default.

Configure at minimum:

- `DATABASE_URL` - PostgreSQL connection string
- `AUTH0_*` - Auth0 credentials
- `S3_*` - S3-compatible storage config
- `OTEL_EXPORTER_OTLP_ENDPOINT` - Observability endpoint

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test -- --coverage
```

Target: ≥80% coverage for formula engines and ingestion logic.

## Deployment

### Render.com

1. Connect GitHub repository
2. Configure environment variables from `.env.example`
3. Set build command: `npm run build`
4. Set start command: `npm start`
5. Enable health checks at `/api/health`

### Manual Deployment

```bash
# Build production image
docker build -f apps/web/Dockerfile -t medical-reporting:latest .

# Run production container
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e AUTH0_SECRET="..." \
  medical-reporting:latest
```

## Security & Compliance

- **HIPAA-Conscious**: No PHI/PII stored (de-identified claimant keys only)
- **TLS**: All connections encrypted
- **RBAC**: Role-based access control (Admin, Analyst, Viewer, Broker)
- **Audit Trail**: Immutable logs with before/after snapshots
- **CSP**: Content Security Policy headers
- **CSRF**: Protection on all mutations

## Data Model

Multi-tenant architecture with:
- 15+ tables with UUID primary keys
- Row-level `client_id` scoping
- Rolling 24-month analytics support
- Optimized indices for <100ms queries

Key entities:
- `Client`, `Plan`, `PlanYear`, `MonthSnapshot`
- `MonthlyPlanStat` (A-N columns)
- `HighClaimant` (ISL tracking)
- `CAndESummaryRow` (28-row C&E)
- `Input`, `PremiumEquivalent`, `AdminFeeComponent`
- `User`, `AuditLog`

## Formula Engines

### A-N Columns (Monthly Detail)
- **E = C + D** (Total Paid)
- **H = E + F + G** (Net Paid with offsets)
- **K = H + I + J** (Total Cost)
- **M = L - K** (Surplus/Deficit)
- **N = K / L** (% of Budget)

### PEPM Calculations
- Member-months = Σ subscribers
- PEPM = Σ(metric) / Avg subscribers

### C&E 28-Row Statement
- Medical (#1-7), Pharmacy (#8-9), Stop Loss (#10-11)
- Admin (#12-14), Totals (#15-16), PEPM (#19-21)
- Budget (#22-24), Variance (#25-28)

## License

Proprietary - All Rights Reserved

## Support

For issues and questions, contact: support@medicalreporting.com
