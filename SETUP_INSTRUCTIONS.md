# Budget Module Setup Instructions

## Quick Start Guide

### 1. Install Dependencies

```bash
# Install nodemailer (only new dependency)
cd apps/web
npm install

# Or if you prefer to install explicitly:
npm install nodemailer@^6.9.0
npm install --save-dev @types/nodemailer@^6.4.0
```

### 2. Run Database Migrations

```bash
cd apps/web

# Generate and apply migrations
npx prisma migrate dev --name add_budget_module

# Generate Prisma client
npx prisma generate
```

### 3. Configure Environment Variables

Create or update `apps/web/.env.local`:

```bash
# Existing variables (keep as is)
DATABASE_URL="postgresql://user:password@localhost:5432/medical_reporting"
AUTH0_SECRET="your-auth0-secret"
AUTH0_BASE_URL="http://localhost:3000"
AUTH0_ISSUER_BASE_URL="https://your-tenant.auth0.com"
AUTH0_CLIENT_ID="your-client-id"
AUTH0_CLIENT_SECRET="your-client-secret"

# NEW: SMTP Configuration for Email Delivery
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gallagher.com
SMTP_PASS=your-app-password
MAIL_FROM="Gallagher Benefits <noreply@gallagher.com>"
```

### 4. Start Development Server

```bash
# From root directory
npm run dev

# Or from apps/web
cd apps/web
npm run dev
```

### 5. Access Budget Module

Navigate to: `http://localhost:3000/dashboard/budget?planYearId=<uuid>`

Replace `<uuid>` with an actual plan year ID from your database.

---

## SMTP Configuration Options

### Option 1: Gmail (Development)

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-app-password  # Generate at https://myaccount.google.com/apppasswords
MAIL_FROM="Your Name <your-gmail@gmail.com>"
```

**Important**: Enable 2FA and generate an App Password (not your regular password).

### Option 2: Office 365 (Corporate)

```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your-email@company.com
SMTP_PASS=your-password
MAIL_FROM="Your Name <your-email@company.com>"
```

### Option 3: SendGrid (Production)

```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
MAIL_FROM="Gallagher Benefits <noreply@gallagher.com>"
```

### Option 4: AWS SES (Production)

```bash
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-access-key
SMTP_PASS=your-ses-secret-key
MAIL_FROM="Gallagher Benefits <verified-email@gallagher.com>"
```

---

## Testing the Setup

### 1. Verify Database Migration

```bash
cd apps/web
npx prisma studio
```

Check that these new tables exist:
- `UploadAudit`
- `MonthlyActuals`
- `MonthlyConfig`
- `FeeWindow`
- `BudgetConfig`
- `EmailDeliveryLog`

### 2. Test File Upload

1. Create a test CSV file (`test-actuals.csv`):

```csv
service_month,domestic_facility_ip_op,non_domestic_ip_op,non_hospital_medical,rx_claims,ee_count_active_cobra,member_count
2024-01-01,50000,10000,30000,15000,100,250
2024-02-01,52000,11000,31000,16000,102,255
2024-03-01,48000,9500,29000,14500,98,248
```

2. Navigate to Upload tab
3. Upload the file
4. Verify success message

### 3. Test Configuration

1. Navigate to Configure tab
2. Add a test fee:
   - Name: "Admin Fee"
   - Type: PEPM
   - Rate: 25
   - Applies To: Fixed
   - Start: 2024-01-01
   - End: 2024-12-31
3. Save and verify success

### 4. Test Calculation

1. Navigate to Preview tab
2. Verify monthly variance table appears
3. Check YTD summary card
4. Verify calculations are correct

### 5. Test PDF Generation (without email)

Open browser console and run:

```javascript
fetch('/api/budget/calculate?planYearId=YOUR_PLAN_YEAR_ID')
  .then(r => r.json())
  .then(data => {
    return fetch('/api/budget/generate-html', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...data,
        clientName: 'Test Client',
        planYearLabel: '2024'
      })
    });
  })
  .then(r => r.json())
  .then(({ html }) => {
    return fetch('/api/budget/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'text/html' },
      body: html
    });
  })
  .then(r => r.blob())
  .then(blob => {
    const url = URL.createObjectURL(blob);
    window.open(url);
  });
```

### 6. Test Email Delivery

1. Configure SMTP in `.env.local`
2. Navigate to Deliver tab
3. Enter your email address
4. Click "Generate & Send Report"
5. Check your inbox for the email with PDF attachment

---

## Troubleshooting

### Issue: "Cannot find module '@medical-reporting/lib'"

**Solution**: Ensure workspace packages are properly linked.

```bash
# From root directory
npm install
```

### Issue: "SMTP connection failed"

**Solution**: Check SMTP credentials and network access.

```bash
# Test SMTP connection manually
node -e "
const nodemailer = require('nodemailer');
const transport = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: 'your-email', pass: 'your-password' }
});
transport.verify().then(console.log).catch(console.error);
"
```

### Issue: "Puppeteer browser not found"

**Solution**: Install Chromium browser.

```bash
cd apps/web
npx puppeteer browsers install chrome
```

### Issue: "Prisma client generation failed"

**Solution**: Regenerate Prisma client.

```bash
cd apps/web
npx prisma generate
```

### Issue: "Module not found: Can't resolve 'lucide-react'"

**Solution**: Install UI package dependencies.

```bash
cd packages/ui
npm install
```

---

## Docker Setup (Optional)

If deploying with Docker, update `Dockerfile`:

```dockerfile
# Install Chromium for Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Set Puppeteer to use installed Chromium
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
```

---

## Production Deployment Checklist

- [ ] Configure production SMTP credentials (not Gmail)
- [ ] Set `NODE_ENV=production`
- [ ] Enable HTTPS for Auth0 callback URLs
- [ ] Set up database backup schedule
- [ ] Configure error monitoring (Sentry, etc.)
- [ ] Set up SMTP rate limiting
- [ ] Enable Prisma connection pooling
- [ ] Configure Puppeteer for production environment
- [ ] Set up audit log retention policy
- [ ] Document disaster recovery procedures

---

## Next Steps

1. **Customize Branding**: Update logo and colors in `generate-html/route.ts`
2. **Add Sample Data**: Create seed script for testing
3. **Configure Permissions**: Set up role-based access in Auth0
4. **Schedule Reports**: Add cron job for automated delivery
5. **Monitor Usage**: Set up analytics for report generation

---

## Support

For issues or questions:
- Check `BUDGET_MODULE_README.md` for detailed documentation
- Review API routes in `apps/web/src/app/api/budget/`
- Inspect Prisma schema: `apps/web/prisma/schema.prisma`

**Version**: 1.0.0
**Last Updated**: 2025-01-13
