// Formula Engines Export Index
export * from './formulas/monthly-columns';
export * from './formulas/pepm';
export * from './formulas/ce-summary';
export * from './formulas/executive';
export * from './formulas/high-claimants';

// Budget Module - Calculation Engine Types (runtime interfaces for calculation functions)
export type {
  MonthContext,
  FeeWindow as FeeWindowCalc,
} from './formulas/fee-proration';
export { prorateForMonth, feeForMonth, calculateMonthlyFees, safeDivide } from './formulas/fee-proration';

export type {
  MonthlyActuals,
  MonthlyConfig,
  FeeWindowData,
  BudgetConfig as BudgetConfigCalc,
  MonthlyCalculation,
  YTDSummary,
} from './formulas/budget-vs-actuals';
export { calculateMonthlyStats } from './formulas/budget-vs-actuals';

// Budget Module - Zod Schemas and Input Types (for API validation)
export {
  MonthlyActualsRowSchema,
  FeeWindowSchema,
  BudgetConfigSchema,
  MonthlyConfigSchema,
  EmailDeliverySchema,
  type MonthlyActualsRow,
  type FeeWindow,
  type BudgetConfig,
  type MonthlyConfigInput,
  type EmailDeliveryInput,
} from './types/budget';

// Budget Module - Parsers
export * from './parsers/budget-upload';

// PDF Export
export * from './pdf/export';

// Utilities
export * from './types';
export * from './utils';
