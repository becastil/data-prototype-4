/**
 * High-Cost Claimants Analysis (Template Page 4)
 * ISL-based filtering and Employer vs Stop Loss share calculations
 */

import type {
  HighClaimantInput,
  HighClaimantResult,
  HighClaimantSummary
} from '../types';

/**
 * Process high-cost claimants with ISL threshold
 *
 * Default ISL: $200,000
 * Qualifying threshold: ≥50% of ISL ($100,000)
 */
export function processHighClaimants(
  claimants: HighClaimantInput[],
  islThreshold: number = 200000
): HighClaimantSummary {
  const qualifyingThreshold = islThreshold * 0.5;

  // Calculate metrics for each claimant
  const processedClaimants: HighClaimantResult[] = claimants.map(claimant => {
    const totalPaid = claimant.medPaid + claimant.rxPaid;
    const percentOfIsl = islThreshold !== 0 ? totalPaid / islThreshold : 0;
    const amountExceedingIsl = Math.max(0, totalPaid - islThreshold);

    // Employer pays up to ISL, Stop Loss covers excess
    const employerShare = Math.min(totalPaid, islThreshold);
    const stopLossShare = amountExceedingIsl;

    return {
      ...claimant,
      totalPaid,
      percentOfIsl,
      amountExceedingIsl,
      employerShare,
      stopLossShare
    };
  });

  // Filter to qualifying claimants (≥50% of ISL)
  const qualifyingClaimants = processedClaimants.filter(
    c => c.totalPaid >= qualifyingThreshold
  );

  // Sort by total paid descending
  qualifyingClaimants.sort((a, b) => b.totalPaid - a.totalPaid);

  // Calculate totals
  const totalPaid = qualifyingClaimants.reduce((sum, c) => sum + c.totalPaid, 0);
  const totalExceedingIsl = qualifyingClaimants.reduce(
    (sum, c) => sum + c.amountExceedingIsl,
    0
  );
  const employerTotal = qualifyingClaimants.reduce(
    (sum, c) => sum + c.employerShare,
    0
  );
  const stopLossTotal = qualifyingClaimants.reduce(
    (sum, c) => sum + c.stopLossShare,
    0
  );

  return {
    islThreshold,
    qualifyingThreshold,
    claimants: qualifyingClaimants,
    totalClaimants: qualifyingClaimants.length,
    totalPaid,
    totalExceedingIsl,
    employerTotal,
    stopLossTotal
  };
}

/**
 * Filter claimants by custom ISL threshold
 */
export function filterByIslThreshold(
  claimants: HighClaimantResult[],
  newIslThreshold: number
): HighClaimantResult[] {
  const qualifyingThreshold = newIslThreshold * 0.5;
  return claimants.filter(c => c.totalPaid >= qualifyingThreshold);
}

/**
 * Calculate year-to-date stop loss reimbursements
 */
export function calculateStopLossReimbursementYtd(
  claimants: HighClaimantResult[]
): number {
  return claimants.reduce((sum, c) => sum + c.stopLossShare, 0);
}

/**
 * Generate high-claimant observation
 */
export function generateHighClaimantObservation(
  summary: HighClaimantSummary,
  stopLossReimbYtd: number
): string {
  const observations: string[] = [];

  if (summary.totalClaimants > 0) {
    const totalPaidFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(summary.totalPaid);

    const stopLossFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(stopLossReimbYtd);

    observations.push(
      `${summary.totalClaimants} high-cost claimant${summary.totalClaimants > 1 ? 's' : ''} ` +
      `with total claims of ${totalPaidFormatted} exceed 50% of the ISL.`
    );

    if (summary.totalExceedingIsl > 0) {
      observations.push(
        `Stop Loss recognized ${stopLossFormatted} in reimbursements year-to-date.`
      );
    }
  }

  return observations.join(' ');
}

/**
 * Group claimants by plan
 */
export function groupClaimantsByPlan(
  claimants: HighClaimantResult[]
): Map<string, HighClaimantResult[]> {
  const groupedMap = new Map<string, HighClaimantResult[]>();

  claimants.forEach(claimant => {
    const existing = groupedMap.get(claimant.planName) || [];
    existing.push(claimant);
    groupedMap.set(claimant.planName, existing);
  });

  return groupedMap;
}

/**
 * Calculate claimant status distribution
 */
export function calculateStatusDistribution(
  claimants: HighClaimantResult[]
): {
  active: number;
  resolved: number;
  pending: number;
} {
  return claimants.reduce(
    (acc, c) => {
      if (c.status === 'ACTIVE') acc.active++;
      else if (c.status === 'RESOLVED') acc.resolved++;
      else if (c.status === 'PENDING') acc.pending++;
      return acc;
    },
    { active: 0, resolved: 0, pending: 0 }
  );
}
