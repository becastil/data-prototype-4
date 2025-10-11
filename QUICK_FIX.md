# 🚨 QUICK FIX: Render Deployment Error

## The Problem
Render is looking in the wrong directory: `/opt/render/project/src/app`
But your Next.js app is in: `/apps/web`

## The Solution (Choose One)

### ⚡ Option 1: Fix in Render Dashboard (Fastest - 5 minutes)

1. **Go to**: https://dashboard.render.com
2. **Click**: Your web service
3. **Click**: "Settings" in the left sidebar
4. **Scroll to**: "Build & Deploy"
5. **Update these fields**:

   **Root Directory**:
   ```
   .
   ```
   (Just a period, or leave blank)

   **Build Command**:
   ```bash
   npm ci && cd apps/web && npx prisma generate && cd ../.. && npm run build
   ```

   **Start Command**:
   ```bash
   cd apps/web && npx prisma migrate deploy && npm start
   ```

6. **Click**: "Save Changes" (bottom of page)
7. **Click**: "Manual Deploy" → "Deploy latest commit"
8. **Wait**: 5-10 minutes for build to complete
9. **Done**: Check your URL!

---

### 🔧 Option 2: Use Blueprint (If you pushed render.yaml)

1. **Delete**: Current web service in Render
2. **Click**: "New +" → "Blueprint"
3. **Select**: Your GitHub repository
4. **Render will detect**: `render.yaml` file
5. **Click**: "Apply"
6. **Review**: Services to be created
7. **Click**: "Create"
8. **Wait**: 5-10 minutes
9. **Done**: Check your URL!

---

## After Deployment Success

### 1. Test Health Check
```
https://your-app-name.onrender.com/api/health
```
Should return: `{"status":"healthy",...}`

### 2. Test Home Page
```
https://your-app-name.onrender.com
```
Should load the landing page

### 3. Test Dashboard
```
https://your-app-name.onrender.com/dashboard
```
Should load the dashboard

---

## If Build Still Fails

### Check Build Logs For:

**Error**: "Cannot find module"
**Fix**: Ensure build command starts with `npm ci`

**Error**: "Prisma Client not generated"
**Fix**: Build command must include `npx prisma generate`

**Error**: "Database connection failed"
**Fix**: Add DATABASE_URL in Environment Variables

---

## Environment Variables Checklist

Go to Settings → Environment → Add:

### Required
- ✅ `DATABASE_URL` - Get from your PostgreSQL database
- ✅ `NODE_ENV` = `production`
- ✅ `PORT` = `3000`

### Optional (Add Later)
- ⚪ `BASE_URL` - Auto-set by Render
- ⚪ `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD` = `false`

---

## Common Mistakes

❌ **Wrong**: Root Directory = `/apps/web`
✅ **Right**: Root Directory = `.` (or blank)

❌ **Wrong**: Build Command = `npm run build`
✅ **Right**: Build Command = `npm ci && cd apps/web && npx prisma generate && cd ../.. && npm run build`

❌ **Wrong**: Start Command = `npm start`
✅ **Right**: Start Command = `cd apps/web && npx prisma migrate deploy && npm start`

---

## Timeline

- **Build Time**: 5-10 minutes
- **Deployment**: Automatic after build
- **Total**: 10-15 minutes from "Deploy" click to live URL

---

## Need More Help?

📖 See: `RENDER_DEPLOYMENT.md` for full guide
🐛 See: Troubleshooting section in RENDER_DEPLOYMENT.md
💬 Contact: Render Support (support@render.com)

---

**Status**: 🟡 Awaiting Your Configuration
**Action**: Follow Option 1 above (Fastest!)
**ETA**: 15 minutes to working deployment

---

*Quick Fix Guide v1.0*
