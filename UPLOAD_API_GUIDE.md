# Upload API Guide

## Overview

The upload API now supports **two modes** in a single endpoint:
- **Standard Mode** (default): Validates + Saves to database
- **Preview Mode**: Validates only, no database changes

This provides flexibility for different use cases while maintaining a simple, unified API.

---

## API Endpoint

### POST /api/upload

**Query Parameters:**
- `preview` (optional): `"true"` | `"false"` (default: `"false"`)

**Form Data:**
- `file` (required): CSV file with monthly plan data
- `clientId` (required): UUID of the client
- `planYearId` (required): UUID of the plan year
- `fileType` (required): `"monthly"` | `"hcc"` | `"inputs"`

---

## Usage Examples

### 1. Standard Upload (Validate + Save)

**Default behavior - data gets saved to database:**

```bash
curl -X POST "http://localhost:3000/api/upload" \
  -F "file=@all-plans-monthly.csv" \
  -F "clientId=123e4567-e89b-12d3-a456-426614174000" \
  -F "planYearId=123e4567-e89b-12d3-a456-426614174001" \
  -F "fileType=monthly"
```

**Response on Success:**
```json
{
  "success": true,
  "preview": {
    "rowCount": 12,
    "months": ["2024-01", "2024-02", ..., "2024-12"],
    "plans": ["all-plans"],
    "sampleRows": [...]
  },
  "validation": {
    "dataRows": 12,
    "sumRowDetected": true,
    "sumValidationPassed": true
  },
  "saved": true,
  "import": {
    "monthsImported": 12,
    "rowsImported": 12
  },
  "message": "Validation passed and data saved successfully. Imported 12 rows across 12 months."
}
```

### 2. Preview Mode (Validate Only)

**Add `?preview=true` to review before saving:**

```bash
curl -X POST "http://localhost:3000/api/upload?preview=true" \
  -F "file=@all-plans-monthly.csv" \
  -F "clientId=123e4567-e89b-12d3-a456-426614174000" \
  -F "planYearId=123e4567-e89b-12d3-a456-426614174001" \
  -F "fileType=monthly"
```

**Response on Success:**
```json
{
  "success": true,
  "preview": {
    "rowCount": 12,
    "months": ["2024-01", "2024-02", ..., "2024-12"],
    "plans": ["all-plans"],
    "sampleRows": [...]
  },
  "validation": {
    "dataRows": 12,
    "sumRowDetected": true,
    "sumValidationPassed": true
  },
  "saved": false,
  "message": "Validation passed. Data not saved (preview mode)."
}
```

**Note:** In preview mode, there is **no** `import` field since nothing was saved.

---

## CSV File Format

Your CSV must use these column names (case-insensitive):

```csv
Month,Total Subs,Medical Paid,Rx Paid,Spec Stop Los Est,Rx Rebate,Admin Fees,Stop Loss Fee,Budgeted Premi
2024-01,1501,125000,45000,-5000,-3000,8500,12000,180000
2024-02,1531,127500,45900,-5100,-3060,8670,12240,183600
...
Total Subs Average,1575,1573750,566550,-62950,-37770,107015,151080,2266200
```

### Column Mapping

| Your Column | Maps To (Internal) |
|-------------|-------------------|
| Month | month |
| Total Subs | subscribers |
| Medical Paid | medical_paid |
| Rx Paid | rx_paid |
| Spec Stop Los Est | stop_loss_reimb |
| Rx Rebate | rx_rebates |
| Admin Fees | admin_fees |
| Stop Loss Fee | stop_loss_fees |
| Budgeted Premi | budgeted_premium |

### Important Notes

1. **Sum/Total Rows**: Rows with "sum", "total", or "average" in the Month column are:
   - Automatically detected
   - Used for validation only
   - **NOT imported to database**

2. **Negative Values**: Values in `Spec Stop Los Est` and `Rx Rebate` should be **negative** (they reduce costs)

3. **Date Format**: Month must be `YYYY-MM` format

---

## Validation Rules

### 1. Sum Row Validation
If a sum row is detected, validates that:
- All monetary columns sum correctly (tolerance: $1.00)
- Average subscribers match calculated average (tolerance: 1 subscriber)

**Example Error:**
```json
{
  "success": false,
  "sumValidationErrors": [
    "Rx Paid sum: Calculated sum is $566550.00, but spreadsheet shows $565550.00 (difference: $1000.00)"
  ],
  "message": "Sum/Total row validation failed..."
}
```

### 2. Column Header Validation
Validates that required columns exist:
- Month
- Total Subs (or Total Subscribers)
- Medical Paid
- Rx Paid
- Budgeted Premi (or Budgeted Premium)

### 3. Data Format Validation
- Month must be YYYY-MM format
- Numeric fields must be valid numbers
- ClientId and PlanYearId must be valid UUIDs

### 4. Reconciliation (Multi-Plan Files)
If your CSV has multiple plans (HDHP, PPO, etc.) per month, validates that:
- Sum of per-plan values equals "All Plans" row for each month

---

## Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "errors": [
    {
      "row": 5,
      "field": "month",
      "message": "Invalid month format. Expected YYYY-MM, got 2024/05"
    }
  ],
  "message": "Found 1 validation error(s)"
}
```

### Sum Validation Error (400)
```json
{
  "success": false,
  "sumValidationErrors": [
    "Medical Paid sum: Calculated sum is $1573750.00, but spreadsheet shows $1573700.00 (difference: $50.00)"
  ],
  "message": "Sum/Total row validation failed. The totals in your spreadsheet do not match the calculated sums."
}
```

### Missing Headers (400)
```json
{
  "success": false,
  "error": "Invalid CSV headers",
  "missingHeaders": ["month", "medical_paid"],
  "receivedHeaders": ["date", "medical", "rx"]
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Internal server error"
}
```

---

## Database Impact

### Standard Mode (`preview=false`)

**Creates/Updates:**
1. `MonthSnapshot` - One record per month
2. `MonthlyPlanStat` - One record per month per plan
3. `AuditLog` - One record tracking the upload

**Example:**
- Upload 12 months of data
- Creates 12 `MonthSnapshot` records
- Creates 12 `MonthlyPlanStat` records (for "all-plans")
- Creates 1 `AuditLog` record

**Note:** Uses `upsert`, so existing data for the same month/plan is **updated**, not duplicated.

### Preview Mode (`preview=true`)

**Creates/Updates:** Nothing - read-only operation

---

## Use Cases

### Use Case 1: Monthly Data Import (Standard)
**Scenario:** Regular monthly upload from carrier reports

```bash
POST /api/upload
# No preview parameter = saves automatically
```

**Best for:**
- Routine monthly imports
- Clean data from trusted sources
- Automated imports

---

### Use Case 2: Review Before Import
**Scenario:** Large import or uncertain data quality

```bash
# Step 1: Preview
POST /api/upload?preview=true
# Review validation results

# Step 2: Import (if validation passed)
POST /api/upload
```

**Best for:**
- First-time imports
- Data from new sources
- Large historical imports

---

### Use Case 3: Testing/Development
**Scenario:** Testing validation without affecting database

```bash
POST /api/upload?preview=true
# Test validation logic
# No database changes
```

**Best for:**
- Development/testing
- Training users
- Debugging data issues

---

## Migration from Old API

### Old Two-Step Flow (Deprecated)
```bash
# Step 1: POST for validation
POST /api/upload
# Returns preview data

# Step 2: PUT to save
PUT /api/upload
# Body: { clientId, planYearId, data }
```

### New One-Step Flow (Recommended)
```bash
# Single call - validates + saves
POST /api/upload
```

**Benefits:**
- ✅ 50% fewer API calls
- ✅ Simpler client code
- ✅ Still supports preview mode when needed
- ✅ Consistent validation logic

---

## Response Fields Reference

| Field | Type | Present When | Description |
|-------|------|--------------|-------------|
| `success` | boolean | Always | Overall operation success |
| `preview.rowCount` | number | Success | Number of data rows (excludes sum row) |
| `preview.months` | string[] | Success | List of months in upload |
| `preview.plans` | string[] | Success | List of plans in upload |
| `preview.sampleRows` | object[] | Success | First 5 rows for review |
| `validation.dataRows` | number | Success | Confirmed data row count |
| `validation.sumRowDetected` | boolean | Success | Whether sum row was found |
| `validation.sumValidationPassed` | boolean | Success | Whether sum validation passed |
| `saved` | boolean | Success | Whether data was saved to DB |
| `import.monthsImported` | number | Saved=true | Number of months imported |
| `import.rowsImported` | number | Saved=true | Number of rows imported |
| `message` | string | Always | Human-readable result |
| `errors` | object[] | Failure | Data validation errors |
| `sumValidationErrors` | string[] | Failure | Sum validation errors |
| `reconciliationErrors` | string[] | Failure | Cross-plan reconciliation errors |

---

## Testing

### Test File
Use the provided test file: `test-upload-all-plans.csv`

### Test Commands

**1. Test Validation (Preview Mode):**
```bash
curl -X POST "http://localhost:3000/api/upload?preview=true" \
  -F "file=@test-upload-all-plans.csv" \
  -F "clientId=YOUR_CLIENT_ID" \
  -F "planYearId=YOUR_PLAN_YEAR_ID" \
  -F "fileType=monthly"
```

Expected: `"saved": false`, validation results returned

**2. Test Import (Standard Mode):**
```bash
curl -X POST "http://localhost:3000/api/upload" \
  -F "file=@test-upload-all-plans.csv" \
  -F "clientId=YOUR_CLIENT_ID" \
  -F "planYearId=YOUR_PLAN_YEAR_ID" \
  -F "fileType=monthly"
```

Expected: `"saved": true`, data saved to database

**3. Test Sum Validation Error:**
Edit `test-upload-all-plans.csv`, change a sum value to be incorrect, then upload.

Expected: `400` error with `sumValidationErrors` array

---

## Summary

### Key Improvements
✅ Single endpoint for both validation and import
✅ Optional preview mode for reviewing before save
✅ Backward compatible (old PUT endpoint still works)
✅ Comprehensive validation at every step
✅ Clear response structure with save status
✅ Automatic sum row detection and validation
✅ Flexible column name mapping

### Best Practices
1. Use **standard mode** for routine imports (faster, simpler)
2. Use **preview mode** for:
   - First-time imports
   - Large data sets
   - Uncertain data quality
3. Always include sum rows in your CSV for validation
4. Use negative values for reimbursements and rebates
5. Check the `saved` field in response to confirm database changes
