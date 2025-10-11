# Render.com Deployment Guide

## Quick Fix for Current Error

The error you're seeing is because Render is looking in the wrong directory. Here's how to fix it:

### Option 1: Configure in Render Dashboard (Recommended)

1. **Go to your Render dashboard**
2. **Click on your web service**
3. **Go to Settings**
4. **Update these fields**:

   **Root Directory**: Leave blank or set to `.`

   **Build Command**:
   ```bash
   npm ci && cd apps/web && npx prisma generate && cd ../.. && npm run build
   ```

   **Start Command**:
   ```bash
   cd apps/web && npx prisma migrate deploy && npm start
   ```

5. **Click "Save Changes"**
6. **Trigger a manual deploy**

### Option 2: Use render.yaml (Blueprint)

1. **In your Render dashboard**, go to "Blueprints"
2. **Click "New Blueprint Instance"**
3. **Select your repository**
4. **Render will detect the `render.yaml` file**
5. **Click "Apply"**

The `render.yaml` file I created has the correct paths configured.

---

## Full Setup Instructions

### Step 1: Push Code to GitHub

Make sure all the new files are committed:

```bash
git add .
git commit -m "Add Render deployment configuration"
git push origin main
```

### Step 2: Create Render Account

1. Go to https://render.com
2. Sign up or log in
3. Connect your GitHub account

### Step 3: Create PostgreSQL Database

1. Click "New +" → "PostgreSQL"
2. **Name**: `medical-reporting-db`
3. **Database**: `medreporting`
4. **User**: `medreporting`
5. **Region**: Choose closest to your users
6. **Plan**: Start with Free (can upgrade later)
7. Click "Create Database"
8. **Save the Internal Database URL** (you'll need this)

### Step 4: Create Web Service

#### Option A: Using Dashboard

1. Click "New +" → "Web Service"
2. Select your GitHub repository
3. **Name**: `medical-reporting-web`
4. **Region**: Same as database
5. **Branch**: `main`
6. **Root Directory**: Leave blank or `.`
7. **Runtime**: `Node`
8. **Build Command**:
   ```bash
   npm ci && cd apps/web && npx prisma generate && cd ../.. && npm run build
   ```
9. **Start Command**:
   ```bash
   cd apps/web && npx prisma migrate deploy && npm start
   ```
10. **Plan**: Start with Starter ($7/month)

#### Option B: Using Blueprint

1. Click "New +" → "Blueprint"
2. Select your repository
3. Render detects `render.yaml`
4. Click "Apply"
5. Review and create services

### Step 5: Configure Environment Variables

In your web service settings, add these environment variables:

**Required**:
- `DATABASE_URL`: Copy from your PostgreSQL database (Internal Database URL)
- `NODE_ENV`: `production`
- `PORT`: `3000`

**Optional** (for later):
- `BASE_URL`: Your Render URL (auto-set)
- `AUTH0_SECRET`: (when adding auth)
- `AUTH0_BASE_URL`: (when adding auth)
- `AUTH0_ISSUER_BASE_URL`: (when adding auth)
- `AUTH0_CLIENT_ID`: (when adding auth)
- `AUTH0_CLIENT_SECRET`: (when adding auth)

### Step 6: Deploy

1. Click "Manual Deploy" → "Deploy latest commit"
2. Watch the build logs
3. Wait for deployment to complete (5-10 minutes)
4. Your app will be available at: `https://medical-reporting-web.onrender.com`

---

## Troubleshooting

### Build Failing: "Directory not found"

**Solution**: Update Root Directory in Settings to blank or `.`

### Build Failing: "Prisma Client not generated"

**Solution**: Ensure build command includes:
```bash
cd apps/web && npx prisma generate
```

### Build Failing: "Module not found"

**Solution**: Ensure you're using `npm ci` not `npm install`

### Runtime Error: "Database connection failed"

**Solution**:
1. Check DATABASE_URL is set correctly
2. Ensure you're using the **Internal Database URL** not External
3. Format should be: `postgresql://user:pass@host:5432/dbname`

### Runtime Error: "Cannot find module '@repo/lib'"

**Solution**: The monorepo structure requires building all packages:
```bash
npm run build
```

### PDF Export Not Working

**Solution**: Add these environment variables:
```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
```

If still failing, Puppeteer may not work on Render's free tier. Consider:
1. Upgrade to paid tier
2. Use a different PDF service (PDFKit, jsPDF)
3. Use external service (Printful API, etc.)

---

## Post-Deployment

### Verify Deployment

1. **Check health endpoint**: `https://your-app.onrender.com/api/health`
   - Should return: `{"status": "healthy", ...}`

2. **Test home page**: `https://your-app.onrender.com`
   - Should load without errors

3. **Test dashboard**: `https://your-app.onrender.com/dashboard`
   - Should display dashboard layout

### Seed Database

If you need to seed the production database:

1. Go to your web service in Render
2. Click "Shell" tab
3. Run:
   ```bash
   cd apps/web
   npx prisma db seed
   ```

**⚠️ Warning**: Only do this once! It will insert sample data.

### Monitor Application

1. **Logs**: Click "Logs" tab to see real-time logs
2. **Metrics**: View CPU, Memory, Response Time in dashboard
3. **Alerts**: Set up email alerts for errors

---

## Custom Domain (Optional)

### Add Custom Domain

1. Go to Settings → Custom Domains
2. Click "Add Custom Domain"
3. Enter your domain (e.g., `reports.yourcompany.com`)
4. Follow DNS configuration instructions
5. Wait for SSL certificate to provision (5-10 min)

### DNS Configuration

Add a CNAME record:
```
Type: CNAME
Name: reports (or @)
Value: medical-reporting-web.onrender.com
TTL: 3600
```

---

## Scaling

### Vertical Scaling (More Resources)

Upgrade plan in Settings:
- **Starter**: 512 MB RAM, 0.5 CPU
- **Standard**: 2 GB RAM, 1 CPU
- **Pro**: 4 GB RAM, 2 CPU

### Horizontal Scaling (More Instances)

1. Go to Settings → Scaling
2. Increase "Number of Instances"
3. Render auto-load balances

**Note**: Requires paid plan ($7+/month)

---

## Backup Strategy

### Database Backups

Render automatically backs up PostgreSQL:
- **Free tier**: 7-day retention
- **Paid tier**: 30-day retention

### Manual Backup

```bash
# From your local machine
pg_dump $DATABASE_URL > backup.sql
```

### Restore Backup

```bash
psql $DATABASE_URL < backup.sql
```

---

## Monitoring & Alerts

### Built-in Monitoring

Render provides:
- Uptime monitoring (5-minute intervals)
- Email alerts on service down
- Response time tracking
- Error rate tracking

### External Monitoring (Recommended)

Consider adding:
- **UptimeRobot**: Free uptime monitoring
- **Sentry**: Error tracking ($0-$26/month)
- **LogRocket**: Session replay ($0-$99/month)

---

## Cost Estimate

### Minimal Setup
- **Web Service** (Starter): $7/month
- **PostgreSQL** (Free): $0/month
- **Total**: **$7/month**

### Production Setup
- **Web Service** (Standard): $25/month
- **PostgreSQL** (Starter): $7/month
- **Total**: **$32/month**

### Enterprise Setup
- **Web Service** (Pro): $85/month
- **PostgreSQL** (Standard): $20/month
- **Redis** (optional): $10/month
- **Total**: **$115/month**

---

## Performance Optimization

### Enable HTTP/2
✅ Automatically enabled on Render

### Enable Compression
Add to `next.config.js`:
```javascript
module.exports = {
  compress: true,
  // ...
}
```

### CDN for Static Assets
Render automatically serves static files via CDN

### Database Connection Pooling
Add to Prisma schema:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connectionLimit = 10
}
```

---

## Security Checklist

- [x] HTTPS enforced (Render does this automatically)
- [ ] Environment variables set (no secrets in code)
- [ ] Database not publicly accessible
- [ ] Health check endpoint working
- [ ] Error monitoring configured
- [ ] Backup strategy in place
- [ ] Custom domain with SSL (optional)

---

## Rollback Procedure

### Rollback to Previous Deploy

1. Go to "Events" tab in Render dashboard
2. Find successful previous deploy
3. Click "Rollback"
4. Confirm rollback
5. Service redeploys with previous version

**⚠️ Note**: Database schema changes are NOT rolled back automatically!

---

## Support

### Render Support
- **Docs**: https://render.com/docs
- **Community**: https://community.render.com
- **Support Email**: support@render.com
- **Status Page**: https://status.render.com

### Application Support
- **GitHub Issues**: Create issue in repository
- **Documentation**: See README.md and other docs
- **Health Check**: `/api/health` endpoint

---

## Next Steps After Deployment

1. **Verify all pages load** correctly
2. **Test API endpoints** with Postman/Insomnia
3. **Seed database** with sample data
4. **Configure monitoring** (Sentry, LogRocket)
5. **Set up alerts** for errors and downtime
6. **Add custom domain** (optional)
7. **Enable auto-deploy** on push (in Settings)
8. **Share URL** with stakeholders for UAT

---

## FAQ

**Q: How long does deployment take?**
A: First deploy: 10-15 minutes. Subsequent: 5-10 minutes.

**Q: Can I use free tier?**
A: Yes, but limited to 750 hours/month. Good for testing, not production.

**Q: How do I view logs?**
A: Click "Logs" tab in Render dashboard. Real-time streaming.

**Q: Can I SSH into the server?**
A: Not directly, but you can use "Shell" tab for command execution.

**Q: How do I update environment variables?**
A: Settings → Environment → Add/Edit → Save Changes → Deploy

**Q: Does Render support Docker?**
A: Yes! You can deploy using the Dockerfile I created.

**Q: How do I enable auto-deploy?**
A: Settings → Auto-Deploy → Enable → Save

---

## Alternative: Docker Deployment

If you prefer Docker:

1. **Build Command**: `docker build -t medical-reporting .`
2. **Start Command**: Leave blank (uses Dockerfile CMD)
3. Render will detect Dockerfile automatically

---

**Deployment Status**: 🟡 **Pending Configuration**
**Estimated Time**: **15 minutes** (if following Option 1)
**Support**: See troubleshooting section above

---

*Last Updated: 2025-10-10*
*Version: 1.0*
*Platform: Render.com*
