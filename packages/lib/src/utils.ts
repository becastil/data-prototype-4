/**
 * Utility functions for date handling, validation, and formatting
 */

import { format, parse, isValid, startOfMonth, endOfMonth, addMonths } from 'date-fns';

// ============================================
// Date Utilities
// ============================================

/**
 * Convert YYYY-MM string to Date (first day of month)
 */
export function monthStringToDate(monthStr: string): Date {
  const parsed = parse(monthStr, 'yyyy-MM', new Date());
  if (!isValid(parsed)) {
    throw new Error(`Invalid month string: ${monthStr}`);
  }
  return startOfMonth(parsed);
}

/**
 * Convert Date to YYYY-MM string
 */
export function dateToMonthString(date: Date): string {
  return format(date, 'yyyy-MM');
}

/**
 * Get rolling 24-month date range
 */
export function getRolling24Months(throughMonth: Date): Date[] {
  const months: Date[] = [];
  for (let i = 23; i >= 0; i--) {
    months.push(addMonths(throughMonth, -i));
  }
  return months;
}

/**
 * Get plan year months (12 months from start)
 */
export function getPlanYearMonths(yearStart: Date): Date[] {
  const months: Date[] = [];
  for (let i = 0; i < 12; i++) {
    months.push(addMonths(yearStart, i));
  }
  return months;
}

// ============================================
// Number Formatting
// ============================================

/**
 * Format currency with optional decimals
 */
export function formatCurrency(
  value: number,
  options?: { decimals?: number; showSign?: boolean }
): string {
  const decimals = options?.decimals ?? 0;
  const showSign = options?.showSign ?? false;

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: showSign ? 'always' : 'auto'
  }).format(value);

  return formatted;
}

/**
 * Format percent with optional decimals
 */
export function formatPercent(
  value: number,
  decimals: number = 1,
  showSign: boolean = false
): string {
  const percent = value * 100;
  const sign = showSign && percent > 0 ? '+' : '';
  return `${sign}${percent.toFixed(decimals)}%`;
}

/**
 * Format large numbers with K/M suffix
 */
export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return formatCurrency(value);
}

// ============================================
// Validation
// ============================================

/**
 * Check if two numbers are approximately equal within tolerance
 */
export function approximatelyEqual(
  a: number,
  b: number,
  tolerance: number = 0.01
): boolean {
  return Math.abs(a - b) <= tolerance;
}

/**
 * Validate month string format (YYYY-MM)
 */
export function isValidMonthString(monthStr: string): boolean {
  const regex = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!regex.test(monthStr)) return false;

  try {
    monthStringToDate(monthStr);
    return true;
  } catch {
    return false;
  }
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ============================================
// Array Utilities
// ============================================

/**
 * Sum array of numbers
 */
export function sum(values: number[]): number {
  return values.reduce((acc, val) => acc + val, 0);
}

/**
 * Calculate average
 */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
}

/**
 * Group array by key
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyFn: (item: T) => K
): Map<K, T[]> {
  const map = new Map<K, T[]>();
  array.forEach(item => {
    const key = keyFn(item);
    const existing = map.get(key) || [];
    existing.push(item);
    map.set(key, existing);
  });
  return map;
}

// ============================================
// CSV Utilities
// ============================================

/**
 * Parse CSV header row to field mapping
 */
export function parseCsvHeader(header: string[]): Map<string, number> {
  const map = new Map<string, number>();
  header.forEach((field, index) => {
    map.set(field.trim().toLowerCase(), index);
  });
  return map;
}

/**
 * Safe parse float from string
 */
export function parseFloat(value: string | number): number {
  if (typeof value === 'number') return value;
  const cleaned = value.replace(/[$,]/g, '');
  const parsed = Number.parseFloat(cleaned);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Safe parse int from string
 */
export function parseInt(value: string | number): number {
  if (typeof value === 'number') return Math.floor(value);
  const cleaned = value.replace(/[$,]/g, '');
  const parsed = Number.parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

// ============================================
// Object Utilities
// ============================================

/**
 * Deep clone object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Pick specific keys from object
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * Omit specific keys from object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => {
    delete result[key];
  });
  return result;
}
