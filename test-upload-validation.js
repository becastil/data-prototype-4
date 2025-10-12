// Test script for upload validation logic
const fs = require('fs');
const path = require('path');

// Read the test CSV file
const csvPath = path.join(__dirname, 'test-upload-all-plans.csv');
const content = fs.readFileSync(csvPath, 'utf8');

console.log('📂 Test CSV File:');
console.log('='.repeat(80));
console.log(content);
console.log('='.repeat(80));
console.log();

// Simulate the parsing logic
const lines = content.split('\n').filter(line => line.trim());
console.log(`✅ Found ${lines.length} lines (including header)`);
console.log();

// Parse headers
const rawHeaders = lines[0].split(',').map(h => h.trim());
console.log('📋 Headers:', rawHeaders);
console.log();

// Create column name mapping
const headerMap = {};
rawHeaders.forEach((header, index) => {
  const normalized = header.toLowerCase().replace(/\s+/g, '_');

  const mappings = {
    'month': 'month',
    'total_subs': 'subscribers',
    'total_subscribers': 'subscribers',
    'medical_paid': 'medical_paid',
    'rx_paid': 'rx_paid',
    'spec_stop_los_est': 'stop_loss_reimb',
    'spec_stop_loss_reimb': 'stop_loss_reimb',
    'rx_rebate': 'rx_rebates',
    'est_rx_rebates': 'rx_rebates',
    'admin_fees': 'admin_fees',
    'stop_loss_fee': 'stop_loss_fees',
    'stop_loss_fees': 'stop_loss_fees',
    'budgeted_premi': 'budgeted_premium',
    'budgeted_premium': 'budgeted_premium',
    'plan': 'plan'
  };

  const mappedName = mappings[normalized] || normalized;
  headerMap[index] = mappedName;
  console.log(`  ${header} → ${normalized} → ${mappedName}`);
});
console.log();

// Parse data rows
const rows = [];
for (let i = 1; i < lines.length; i++) {
  const values = lines[i].split(',').map(v => v.trim());
  const row = {};

  Object.entries(headerMap).forEach(([index, mappedName]) => {
    row[mappedName] = values[parseInt(index)];
  });

  const parsedRow = {
    month: row.month,
    plan: row.plan || 'all-plans',
    subscribers: parseInt(row.subscribers) || 0,
    medicalPaid: parseFloat(row.medical_paid) || 0,
    rxPaid: parseFloat(row.rx_paid) || 0,
    stopLossReimb: parseFloat(row.stop_loss_reimb) || 0,
    rxRebates: parseFloat(row.rx_rebates) || 0,
    adminFees: parseFloat(row.admin_fees) || 0,
    stopLossFees: parseFloat(row.stop_loss_fees) || 0,
    budgetedPremium: parseFloat(row.budgeted_premium) || 0
  };

  rows.push(parsedRow);
}

console.log(`✅ Parsed ${rows.length} rows`);
console.log();

// Separate data rows from sum rows
const dataRows = [];
let sumRow = undefined;

rows.forEach(row => {
  const monthStr = row.month.toLowerCase();
  if (monthStr.includes('sum') || monthStr.includes('total') || monthStr.includes('average')) {
    sumRow = row;
    console.log('📊 Sum/Total row detected:', row.month);
  } else {
    dataRows.push(row);
  }
});

console.log();
console.log(`✅ Data rows: ${dataRows.length}`);
console.log(`✅ Sum row detected: ${sumRow ? 'Yes' : 'No'}`);
console.log();

// Validate sum row
if (sumRow) {
  console.log('🔍 Validating Sum Row...');
  console.log('='.repeat(80));

  const tolerance = 1.0;

  // Calculate actual totals
  const actualTotals = dataRows.reduce((acc, row) => ({
    subscribers: acc.subscribers + row.subscribers,
    medicalPaid: acc.medicalPaid + row.medicalPaid,
    rxPaid: acc.rxPaid + row.rxPaid,
    stopLossReimb: acc.stopLossReimb + row.stopLossReimb,
    rxRebates: acc.rxRebates + row.rxRebates,
    adminFees: acc.adminFees + row.adminFees,
    stopLossFees: acc.stopLossFees + row.stopLossFees,
    budgetedPremium: acc.budgetedPremium + row.budgetedPremium
  }), {
    subscribers: 0,
    medicalPaid: 0,
    rxPaid: 0,
    stopLossReimb: 0,
    rxRebates: 0,
    adminFees: 0,
    stopLossFees: 0,
    budgetedPremium: 0
  });

  console.log('Calculated Totals:');
  console.log(JSON.stringify(actualTotals, null, 2));
  console.log();

  console.log('Provided Sum Row:');
  console.log(JSON.stringify({
    subscribers: sumRow.subscribers,
    medicalPaid: sumRow.medicalPaid,
    rxPaid: sumRow.rxPaid,
    stopLossReimb: sumRow.stopLossReimb,
    rxRebates: sumRow.rxRebates,
    adminFees: sumRow.adminFees,
    stopLossFees: sumRow.stopLossFees,
    budgetedPremium: sumRow.budgetedPremium
  }, null, 2));
  console.log();

  const sumValidationErrors = [];

  // Check each field
  const checks = [
    { field: 'medicalPaid', actual: actualTotals.medicalPaid, provided: sumRow.medicalPaid, label: 'Medical Paid sum' },
    { field: 'rxPaid', actual: actualTotals.rxPaid, provided: sumRow.rxPaid, label: 'Rx Paid sum' },
    { field: 'stopLossReimb', actual: actualTotals.stopLossReimb, provided: sumRow.stopLossReimb, label: 'Spec Stop Los Est sum' },
    { field: 'rxRebates', actual: actualTotals.rxRebates, provided: sumRow.rxRebates, label: 'Rx Rebate sum' },
    { field: 'adminFees', actual: actualTotals.adminFees, provided: sumRow.adminFees, label: 'Admin Fees sum' },
    { field: 'stopLossFees', actual: actualTotals.stopLossFees, provided: sumRow.stopLossFees, label: 'Stop Loss Fee sum' },
    { field: 'budgetedPremium', actual: actualTotals.budgetedPremium, provided: sumRow.budgetedPremium, label: 'Budgeted sum' }
  ];

  console.log('Validation Results:');
  console.log('-'.repeat(80));

  checks.forEach(check => {
    const diff = Math.abs(check.actual - check.provided);
    const status = diff <= tolerance ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${check.label}`);
    console.log(`      Calculated: $${check.actual.toFixed(2)}`);
    console.log(`      Provided:   $${check.provided.toFixed(2)}`);
    console.log(`      Difference: $${diff.toFixed(2)}`);
    console.log();

    if (diff > tolerance) {
      sumValidationErrors.push(
        `${check.label}: Calculated sum is $${check.actual.toFixed(2)}, but spreadsheet shows $${check.provided.toFixed(2)} (difference: $${diff.toFixed(2)})`
      );
    }
  });

  // Check average subscribers
  if (sumRow.subscribers > 0 && dataRows.length > 0) {
    const actualAvg = actualTotals.subscribers / dataRows.length;
    const diff = Math.abs(actualAvg - sumRow.subscribers);
    const status = diff <= 1 ? '✅ PASS' : '❌ FAIL';

    console.log(`${status} Total Subs Average`);
    console.log(`      Calculated avg: ${actualAvg.toFixed(2)}`);
    console.log(`      Provided avg:   ${sumRow.subscribers}`);
    console.log(`      Difference:     ${diff.toFixed(2)}`);
    console.log();

    if (diff > 1) {
      sumValidationErrors.push(
        `Total Subs Average: Calculated average is ${actualAvg.toFixed(0)}, but spreadsheet shows ${sumRow.subscribers} (difference: ${diff.toFixed(0)})`
      );
    }
  }

  console.log('='.repeat(80));

  if (sumValidationErrors.length === 0) {
    console.log('✅ ✅ ✅  ALL VALIDATION CHECKS PASSED!  ✅ ✅ ✅');
  } else {
    console.log('❌ ❌ ❌  VALIDATION FAILED  ❌ ❌ ❌');
    console.log();
    console.log('Errors:');
    sumValidationErrors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });
  }
} else {
  console.log('⚠️  No sum row detected in CSV file');
}

console.log();
console.log('🎯 Test Complete!');
