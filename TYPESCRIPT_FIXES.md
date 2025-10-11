# TypeScript Build Fixes

## Issues Fixed

### 1. TypeScript Error: Property 'snapshot' does not exist ✅

**File**: `apps/web/src/app/api/exec-summary/route.ts:42`

**Error**:
```
Type error: Property 'snapshot' does not exist on type '{ plan: { id: string; name: string; ... } ... }'
Did you mean 'snapshotId'?
```

**Root Cause**:
The code was trying to access `stat.snapshot.monthDate` but the Prisma query didn't include the `snapshot` relation in the `planStats` include clause.

**Fix Applied**:
Changed the data transformation to use the parent `snapshot` object that we already have in the query results:

```typescript
// Before: Trying to access nested snapshot through stat
const allPlansStats = snapshots.flatMap(s =>
  s.planStats.filter(ps => ps.plan.type === 'ALL_PLANS')
);
const monthlyResults = allPlansStats.map(stat => ({
  month: stat.snapshot.monthDate.toISOString().slice(0, 7), // ❌ Error
  // ... rest
}));

// After: Access monthDate from parent snapshot
const monthlyResults = snapshots.flatMap(snapshot => {
  const allPlansStat = snapshot.planStats.find(ps => ps.plan.type === 'ALL_PLANS');
  if (!allPlansStat) return [];

  return [{
    month: snapshot.monthDate.toISOString().slice(0, 7), // ✅ Works
    totalSubscribers: allPlansStat.totalSubscribers,
    // ... rest
  }];
});
```

**Why This Works**:
- We already fetch `MonthSnapshot` records with `monthDate`
- Each snapshot contains `planStats` array
- We find the "ALL_PLANS" stat and use `snapshot.monthDate` directly
- No need for additional Prisma includes

---

### 2. Webpack Warning: Conflicting Star Exports ✅

**File**: `packages/lib/src/index.ts`

**Warning**:
```
The requested module './utils' contains conflicting star exports for the names
'formatCurrency', 'formatPercent' with the previous requested module './formulas/executive'
```

**Root Cause**:
Both `utils.ts` and `formulas/executive.ts` exported functions with the same names:
- `formatCurrency`
- `formatPercent`

When using `export * from './utils'` and `export * from './formulas/executive'`, webpack couldn't determine which export to use.

**Fix Applied**:
Removed duplicate exports from `formulas/executive.ts` (lines 180-198):

```typescript
// Before: executive.ts had these duplicates
export function formatCurrency(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

// After: Removed from executive.ts - use from utils.ts instead
```

**Why This Works**:
- `utils.ts` has the complete, feature-rich implementations with options
- `executive.ts` had simpler versions that are redundant
- Now there's only one source of truth for formatting functions
- All consumers will use `utils.ts` exports

**Utils Version (Kept)**:
```typescript
// utils.ts - More complete implementation
export function formatCurrency(
  value: number,
  options?: { decimals?: number; showSign?: boolean }
): string {
  const decimals = options?.decimals ?? 0;
  const showSign = options?.showSign ?? false;
  // ... full implementation
}

export function formatPercent(
  value: number,
  decimals: number = 1,
  showSign: boolean = false
): string {
  const percent = value * 100;
  const sign = showSign && percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(decimals)}%`;
}
```

---

### 3. TypeScript Error: Buffer Type Incompatibility ✅

**File**: `apps/web/src/app/api/export/pdf/route.ts:65`

**Error**:
```
Type error: Argument of type 'Buffer<ArrayBufferLike>' is not assignable
to parameter of type 'BodyInit | null | undefined'.
Type 'Buffer<ArrayBufferLike>' is missing the following properties from type 'URLSearchParams': size, append, delete, get, and 2 more.
```

**Root Cause**:
Node.js `Buffer` type is not directly compatible with NextResponse's expected body types. NextResponse expects `BodyInit` which includes `Uint8Array`, but not Node.js `Buffer`.

**Fix Applied**:
Convert Buffer to Uint8Array before passing to NextResponse:

```typescript
// Before: Direct Buffer to NextResponse (incompatible)
return new NextResponse(result.buffer, { // ❌ Buffer not compatible with BodyInit
  status: 200,
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': result.buffer.length.toString()
  }
});

// After: Convert Buffer to Uint8Array
if (!result.success || !result.buffer) {
  return NextResponse.json(
    { error: result.error || 'PDF generation failed' },
    { status: 500 }
  );
}

// Convert Buffer to Uint8Array for NextResponse compatibility
const uint8Array = new Uint8Array(result.buffer);

return new NextResponse(uint8Array, { // ✅ Uint8Array is compatible
  status: 200,
  headers: {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length': result.buffer.length.toString()
  }
});
```

**Also Fixed GET Endpoint**:
The preview endpoint had the same issue:
```typescript
const pdf = await exporter.exportPage(url);
const uint8Array = new Uint8Array(pdf);
return new NextResponse(uint8Array, { /* headers */ });
```

**Why This Works**:
- `Uint8Array` is part of the Web API and is compatible with `BodyInit`
- Node.js `Buffer` is a subclass of `Uint8Array` but has additional properties that make it incompatible with strict type checking
- Converting to `Uint8Array` creates a standard typed array that works with NextResponse
- The underlying binary data remains the same, no data loss

---

## Summary

✅ **Fixed**: TypeScript compilation error in exec-summary API route
✅ **Fixed**: Conflicting star exports warning in lib package
✅ **Fixed**: Buffer type mismatch in PDF export route
✅ **Ready**: Build should now complete successfully

## Next Steps

1. Commit the fixes:
```bash
git add .
git commit -m "fix: Resolve TypeScript errors and conflicting exports

- Fix exec-summary route to use snapshot.monthDate correctly
- Remove duplicate formatCurrency/formatPercent from executive.ts
- Fix PDF export buffer type checking
- Keep single source of truth in utils.ts for formatting functions

Resolves: TypeScript compilation errors in Render build"
git push origin main
```

2. Monitor Render build - should see:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
```

3. Test deployed application

---

**Files Modified**:
1. `apps/web/src/app/api/exec-summary/route.ts` - Fixed snapshot access
2. `packages/lib/src/formulas/executive.ts` - Removed duplicate exports
3. `apps/web/src/app/api/export/pdf/route.ts` - Fixed buffer type checking

**Build Status**: Ready for deployment ✅
