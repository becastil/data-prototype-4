import { z } from "zod";

// ============================================
// CSV/XLSX Row Schemas (Long Format)
// ============================================

export const MonthlyActualsRowSchema = z.object({
  service_month: z.string()
    .regex(/^\d{4}-\d{2}-01$/, "Must be YYYY-MM-01 format")
    .transform(s => new Date(s)),
  domestic_facility_ip_op: z.coerce.number().nonnegative(),
  non_domestic_ip_op: z.coerce.number().nonnegative(),
  non_hospital_medical: z.coerce.number().nonnegative(),
  rx_claims: z.coerce.number().nonnegative(),
  ee_count_active_cobra: z.coerce.number().int().positive(),
  member_count: z.coerce.number().int().positive(),
});

export type MonthlyActualsRow = z.infer<typeof MonthlyActualsRowSchema>;

// ============================================
// Fee Window Schema
// ============================================

export const FeeWindowSchema = z.object({
  id: z.string().uuid().optional(),
  planYearId: z.string().uuid(),
  feeName: z.string().min(1, "Fee name is required"),
  unitType: z.enum(["ANNUAL", "MONTHLY", "PEPM", "PEPEM", "PERCENT_OF_CLAIMS", "FLAT"]),
  rate: z.number().nonnegative("Rate must be non-negative"),
  appliesTo: z.enum(["FIXED", "CLAIMS", "RX", "ADMIN", "STOP_LOSS", "OTHER"]),
  effectiveStart: z.coerce.date(),
  effectiveEnd: z.coerce.date(),
}).refine(data => data.effectiveEnd >= data.effectiveStart, {
  message: "effectiveEnd must be >= effectiveStart",
  path: ["effectiveEnd"],
});

export type FeeWindow = z.infer<typeof FeeWindowSchema>;

// ============================================
// Budget Config Schema
// ============================================

export const BudgetConfigSchema = z.object({
  planYearId: z.string().uuid(),
  claimsModelType: z.enum(["DIRECT", "DERIVED"]).default("DIRECT"),
  pctClaimsBase: z.enum(["ACTUAL", "EXPECTED"]).default("ACTUAL"),
  roundingMode: z.enum(["HALF_UP", "BANKER"]).default("HALF_UP"),
  currencyPrecision: z.number().int().min(0).max(2).default(2),
  defaultHorizonMonths: z.number().int().positive().default(12),
});

export type BudgetConfig = z.infer<typeof BudgetConfigSchema>;

// ============================================
// Monthly Config Schema
// ============================================

export const MonthlyConfigSchema = z.object({
  serviceMonth: z.coerce.date(),
  expectedClaims: z.number().nonnegative().default(0),
  stopLossReimb: z.number().nonnegative().default(0),
  rxRebates: z.number().nonnegative().default(0),
});

export type MonthlyConfigInput = z.infer<typeof MonthlyConfigSchema>;

// ============================================
// Email Delivery Schema
// ============================================

export const EmailDeliverySchema = z.object({
  to: z.array(z.string().email()).min(1, "At least one recipient required"),
  cc: z.array(z.string().email()).optional(),
  subject: z.string().min(1, "Subject is required"),
  htmlBody: z.string().min(1, "Email body is required"),
  pdfBase64: z.string().min(1, "PDF data is required"),
  planYearId: z.string().uuid(),
});

export type EmailDeliveryInput = z.infer<typeof EmailDeliverySchema>;
