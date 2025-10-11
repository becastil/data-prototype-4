# 🚨 QUICK FIX V2: Monorepo Build Error

## The NEW Problem
Build is failing because the monorepo packages (`@repo/lib`, `@repo/ui`) aren't being found.

## The Solution

### ⚡ Update in Render Dashboard (5 minutes)

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
   npm ci && cd apps/web && npx prisma generate && cd ../.. && npm run build --filter=@medical-reporting/web
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

## What Changed?

### ✅ Fixed: next.config.js
Added `transpilePackages` to handle monorepo packages:
```javascript
transpilePackages: ['@medical-reporting/lib', '@medical-reporting/ui']
```

This tells Next.js to transpile the TypeScript source from these packages.

### ✅ Fixed: Build Command
Changed from:
```bash
npm run build
```

To:
```bash
npm run build --filter=@medical-reporting/web
```

This ensures Turborepo builds the web app and its dependencies.

---

## Commit and Push

Before deploying, commit these changes:

```bash
git add .
git commit -m "Fix: Add transpilePackages for monorepo build"
git push origin main
```

Then follow the steps above in Render Dashboard.

---

## If Build Still Fails

### Check for These Errors:

**Error**: "Cannot find module @medical-reporting/lib"
**Fix**: Ensure `transpilePackages` is in `next.config.js`

**Error**: "Prisma Client not generated"
**Fix**: Build command includes `npx prisma generate`

**Error**: "puppeteer: command not found"
**Fix**: This is OK for now - PDF export will work after puppeteer installs

---

## Alternative: Simpler Build (If Above Fails)

If the Turborepo build still fails, use this simpler approach:

**Build Command**:
```bash
npm ci && cd apps/web && npx prisma generate && npm run build
```

This builds only the web app without Turborepo filtering.

---

## Timeline

- **Build Time**: 5-10 minutes
- **Total**: 15 minutes from "Deploy" click to live URL

---

## Test After Deploy

1. **Health Check**: `https://your-app.onrender.com/api/health`
2. **Home Page**: `https://your-app.onrender.com`
3. **Dashboard**: `https://your-app.onrender.com/dashboard`

---

**Status**: 🟡 Awaiting Git Push + Deploy
**Action**: Commit changes, then update Render config
**ETA**: 20 minutes to working deployment

---

*Quick Fix V2 - Updated for Monorepo Build*
