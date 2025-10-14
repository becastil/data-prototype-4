import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";

/**
 * POST /api/budget/generate-html
 *
 * Generates HTML for the 2-page PDF report.
 * Takes calculation results and formats them into branded HTML template.
 *
 * Request body:
 * {
 *   months: MonthlyCalculation[],
 *   ytd: Summary,
 *   lastThreeMonths: Summary,
 *   clientName: string,
 *   planYearLabel: string
 * }
 *
 * Returns: { html: string }
 */
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { months, ytd, lastThreeMonths, clientName, planYearLabel } = data;

    if (!months || !ytd || !clientName || !planYearLabel) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const formatCurrency = (val: number) =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(val);

    const getVarianceColor = (pct: number) => {
      if (pct > 5) return "#ef4444"; // red
      if (pct < -5) return "#22c55e"; // green
      return "#6b7280"; // gray
    };

    const getVarianceBgColor = (pct: number) => {
      if (pct > 5) return "#fee2e2";
      if (pct < -5) return "#dcfce7";
      return "#f3f4f6";
    };

    // Gallagher branding colors
    const gallagherBlue = "#0066b2";
    const gallagherDarkGray = "#1f2937";

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: Letter;
      margin: 0.5in 0.5in 0.6in 0.5in;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10pt;
      color: ${gallagherDarkGray};
      line-height: 1.4;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid ${gallagherBlue};
      padding-bottom: 10px;
      margin-bottom: 20px;
    }

    .header-left {
      flex: 1;
    }

    .logo-container {
      width: 120px;
      height: 40px;
      background: ${gallagherBlue};
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
    }

    .logo-text {
      color: white;
      font-size: 16pt;
      font-weight: bold;
      letter-spacing: 1px;
    }

    .title {
      font-size: 18pt;
      font-weight: bold;
      color: ${gallagherBlue};
      margin-bottom: 8px;
    }

    .subtitle {
      font-size: 10pt;
      color: #6b7280;
      margin-bottom: 20px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 9pt;
    }

    th {
      background: #f3f4f6;
      font-weight: bold;
      text-align: right;
      padding: 8px 6px;
      border: 1px solid #d1d5db;
      font-size: 8.5pt;
    }

    th:first-child {
      text-align: left;
    }

    td {
      text-align: right;
      padding: 6px 6px;
      border: 1px solid #e5e7eb;
    }

    td:first-child {
      text-align: left;
    }

    .ytd-row {
      background: #dbeafe !important;
      font-weight: bold;
    }

    .variance-badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8.5pt;
      font-weight: 600;
    }

    .footer {
      position: fixed;
      bottom: 0.3in;
      left: 0.5in;
      right: 0.5in;
      font-size: 7.5pt;
      color: #6b7280;
      border-top: 1px solid #d1d5db;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
    }

    .page-break {
      page-break-after: always;
    }

    .summary-box {
      background: #f9fafb;
      padding: 12px;
      border-radius: 6px;
      margin-top: 20px;
      font-size: 9pt;
      border: 1px solid #e5e7eb;
    }

    .summary-title {
      font-weight: bold;
      margin-bottom: 6px;
      color: ${gallagherBlue};
    }

    .chart-placeholder {
      background: #f3f4f6;
      border: 2px dashed #d1d5db;
      padding: 40px;
      text-align: center;
      border-radius: 6px;
      margin: 15px 0;
      color: #6b7280;
      font-size: 10pt;
    }

    .chart-title {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 10px;
      color: ${gallagherBlue};
    }
  </style>
</head>
<body>
  <!-- Page 1: Executive Table -->
  <div class="header">
    <div class="header-left">
      <div class="title">Claims & Expenses vs Budget</div>
      <div class="subtitle">${clientName} | ${planYearLabel}</div>
    </div>
    <div class="logo-container">
      <div class="logo-text">GALLAGHER</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Month</th>
        <th>EE</th>
        <th>Members</th>
        <th>Claims</th>
        <th>Fixed</th>
        <th>Actual Total</th>
        <th>Budget Total</th>
        <th>Var $</th>
        <th>Var %</th>
        <th>PEPM</th>
      </tr>
    </thead>
    <tbody>
      ${months
        .map(
          (m: any) => `
      <tr>
        <td>${format(new Date(m.month), "MMM yyyy")}</td>
        <td>${m.eeCount.toLocaleString()}</td>
        <td>${m.memberCount.toLocaleString()}</td>
        <td>${formatCurrency(m.totalClaims)}</td>
        <td>${formatCurrency(m.fixedCosts)}</td>
        <td><strong>${formatCurrency(m.actualTotalExpenses)}</strong></td>
        <td>${formatCurrency(m.budgetTotalExpenses)}</td>
        <td>${formatCurrency(m.varianceDollars)}</td>
        <td>
          <span class="variance-badge" style="background: ${getVarianceBgColor(
            m.variancePercent
          )}; color: ${getVarianceColor(m.variancePercent)}">
            ${m.variancePercent > 0 ? "+" : ""}${m.variancePercent.toFixed(1)}%
          </span>
        </td>
        <td>${formatCurrency(m.pepm)}</td>
      </tr>
      `
        )
        .join("")}
      <tr class="ytd-row">
        <td>YTD</td>
        <td>${ytd.eeCount.toLocaleString()}</td>
        <td>${ytd.memberCount.toLocaleString()}</td>
        <td>${formatCurrency(ytd.totalClaims)}</td>
        <td>${formatCurrency(ytd.fixedCosts)}</td>
        <td><strong>${formatCurrency(ytd.actualTotalExpenses)}</strong></td>
        <td>${formatCurrency(ytd.budgetTotalExpenses)}</td>
        <td>${formatCurrency(ytd.varianceDollars)}</td>
        <td>
          <span class="variance-badge" style="background: ${getVarianceBgColor(
            ytd.variancePercent
          )}; color: ${getVarianceColor(ytd.variancePercent)}">
            ${ytd.variancePercent > 0 ? "+" : ""}${ytd.variancePercent.toFixed(
      1
    )}%
          </span>
        </td>
        <td>${formatCurrency(ytd.pepm)}</td>
      </tr>
    </tbody>
  </table>

  <div class="summary-box">
    <div class="summary-title">Last 3 Months Summary</div>
    <div>
      <strong>Actual:</strong> ${formatCurrency(
        lastThreeMonths.actualTotalExpenses
      )} &nbsp;|&nbsp;
      <strong>Budget:</strong> ${formatCurrency(
        lastThreeMonths.budgetTotalExpenses
      )} &nbsp;|&nbsp;
      <strong>Variance:</strong> ${formatCurrency(
        lastThreeMonths.varianceDollars
      )}
      <span class="variance-badge" style="background: ${getVarianceBgColor(
        lastThreeMonths.variancePercent
      )}; color: ${getVarianceColor(lastThreeMonths.variancePercent)}">
        ${lastThreeMonths.variancePercent > 0 ? "+" : ""}${lastThreeMonths.variancePercent.toFixed(
      1
    )}%
      </span>
    </div>
  </div>

  <div class="footer">
    <div>Page 1 of 2 | Generated ${format(new Date(), "MM/dd/yyyy")}</div>
    <div>Confidential</div>
  </div>

  <div class="page-break"></div>

  <!-- Page 2: Charts & Analysis -->
  <div class="header">
    <div class="header-left">
      <div class="title">Expense Analytics</div>
      <div class="subtitle">${clientName} | ${planYearLabel}</div>
    </div>
    <div class="logo-container">
      <div class="logo-text">GALLAGHER</div>
    </div>
  </div>

  <div class="chart-title">1. Actual vs Budget Trend</div>
  <div class="chart-placeholder">
    Line chart showing monthly Actual Total Expenses vs Budget Total Expenses trend.<br>
    (Render via Recharts in production)
  </div>

  <div class="chart-title">2. Claims + Fixed Costs Breakdown</div>
  <div class="chart-placeholder">
    Stacked bar chart showing Claims and Fixed Costs components vs Budget Total.<br>
    (Render via Recharts in production)
  </div>

  <div class="chart-title">3. YTD Expense Mix</div>
  <div class="chart-placeholder">
    Donut chart showing proportion of Claims vs Fixed Costs for YTD period.<br>
    (Render via Recharts in production)
  </div>

  <div class="summary-box">
    <div class="summary-title">Key Insights</div>
    <div>
      <strong>YTD Variance:</strong> ${
        ytd.variancePercent > 0 ? "+" : ""
      }${ytd.variancePercent.toFixed(1)}%
      ${
        ytd.variancePercent > 0 ? "over" : "under"
      } budget (${formatCurrency(Math.abs(ytd.varianceDollars))})<br>
      <strong>YTD PEPM:</strong> ${formatCurrency(ytd.pepm)}<br>
      <strong>Total Claims YTD:</strong> ${formatCurrency(ytd.totalClaims)}<br>
      <strong>Total Fixed Costs YTD:</strong> ${formatCurrency(ytd.fixedCosts)}
    </div>
  </div>

  <div class="footer">
    <div>Page 2 of 2 | Generated ${format(new Date(), "MM/dd/yyyy")}</div>
    <div>Confidential | This report contains aggregated claims data for budget analysis only.</div>
  </div>
</body>
</html>
    `;

    return NextResponse.json({ html });
  } catch (error: any) {
    console.error("HTML generation error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
