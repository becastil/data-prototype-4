/**
 * PEPM (Per Employee Per Month) Calculations
 * Supports rolling 24-month comparisons (Current 12 vs Prior 12)
 */

import type { PepmInput, PepmResult } from '../types';

/**
 * Calculate PEPM for a given period
 *
 * Formula:
 * - Member-months = Σ subscribers
 * - Avg subscribers = member-months / months
 * - PEPM = Σ metric / Avg subscribers
 */
export function calculatePepm(input: PepmInput): PepmResult {
  if (input.months.length === 0) {
    return createEmptyPepmResult();
  }

  // Sort months chronologically
  const sortedMonths = [...input.months].sort((a, b) =>
    a.month.localeCompare(b.month)
  );

  const totalMonths = sortedMonths.length;
  const splitPoint = Math.floor(totalMonths / 2);

  // Split into Prior 12 and Current 12 (or available months)
  const priorMonths = sortedMonths.slice(0, splitPoint);
  const currentMonths = sortedMonths.slice(splitPoint);

  const prior12 = calculatePeriodMetrics(priorMonths);
  const current12 = calculatePeriodMetrics(currentMonths);

  // Calculate change
  const change = {
    absolute: current12.pepm - prior12.pepm,
    percent: prior12.pepm !== 0
      ? ((current12.pepm - prior12.pepm) / prior12.pepm)
      : 0
  };

  return {
    current12,
    prior12,
    change
  };
}

/**
 * Calculate PEPM for a single period
 */
function calculatePeriodMetrics(
  months: Array<{ month: string; subscribers: number; metric: number }>
): PepmResult['current12'] {
  if (months.length === 0) {
    return {
      totalMetric: 0,
      memberMonths: 0,
      avgSubscribers: 0,
      pepm: 0
    };
  }

  const totalMetric = months.reduce((sum, m) => sum + m.metric, 0);
  const memberMonths = months.reduce((sum, m) => sum + m.subscribers, 0);
  const avgSubscribers = memberMonths / months.length;
  const pepm = avgSubscribers !== 0 ? totalMetric / avgSubscribers : 0;

  return {
    totalMetric,
    memberMonths,
    avgSubscribers,
    pepm
  };
}

/**
 * Create empty PEPM result for edge cases
 */
function createEmptyPepmResult(): PepmResult {
  return {
    current12: {
      totalMetric: 0,
      memberMonths: 0,
      avgSubscribers: 0,
      pepm: 0
    },
    prior12: {
      totalMetric: 0,
      memberMonths: 0,
      avgSubscribers: 0,
      pepm: 0
    },
    change: {
      absolute: 0,
      percent: 0
    }
  };
}

/**
 * Calculate PEPM for multiple metrics (Medical, Rx, Total Cost)
 */
export function calculateMultiplePepm(
  months: Array<{
    month: string;
    subscribers: number;
    medicalPaid: number;
    rxPaid: number;
    totalCost: number;
  }>
): {
  medical: PepmResult;
  rx: PepmResult;
  totalCost: PepmResult;
} {
  return {
    medical: calculatePepm({
      months: months.map(m => ({
        month: m.month,
        subscribers: m.subscribers,
        metric: m.medicalPaid
      }))
    }),
    rx: calculatePepm({
      months: months.map(m => ({
        month: m.month,
        subscribers: m.subscribers,
        metric: m.rxPaid
      }))
    }),
    totalCost: calculatePepm({
      months: months.map(m => ({
        month: m.month,
        subscribers: m.subscribers,
        metric: m.totalCost
      }))
    })
  };
}

/**
 * Format PEPM for display (e.g., "$1,234.56 PEPM")
 */
export function formatPepm(pepm: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(pepm);
}
