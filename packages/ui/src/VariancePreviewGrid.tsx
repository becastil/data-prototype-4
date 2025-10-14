"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";

interface VariancePreviewGridProps {
  planYearId: string;
}

export function VariancePreviewGrid({ planYearId }: VariancePreviewGridProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [planYearId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/budget/calculate?planYearId=${planYearId}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to load calculations");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error("Calculate error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);

  const getVarianceBadge = (pct: number) => {
    if (pct > 5) return "bg-red-100 text-red-800 border-red-200";
    if (pct < -5) return "bg-green-100 text-green-800 border-green-200";
    return "bg-gray-100 text-gray-800 border-gray-200";
  };

  const getVarianceIcon = (pct: number) => {
    if (pct > 0) return <TrendingUp className="h-3 w-3" />;
    if (pct < 0) return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4">
        <p className="text-red-800 font-medium">Error loading calculations</p>
        <p className="text-sm text-red-600 mt-1">{error}</p>
        <button
          onClick={loadData}
          className="mt-3 text-sm text-red-700 hover:text-red-900 flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!data || !data.months || data.months.length === 0) {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <p className="text-gray-500">No data available for calculations.</p>
        <p className="text-sm text-gray-400 mt-1">
          Please upload actuals data first.
        </p>
      </div>
    );
  }

  const { months, ytd, lastThreeMonths } = data;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Budget vs Actuals Analysis</h3>
        <button
          onClick={loadData}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm font-medium text-blue-900">YTD Variance</div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-900">
              {ytd.variancePercent > 0 ? "+" : ""}
              {ytd.variancePercent.toFixed(1)}%
            </span>
            <span className="text-sm text-blue-700">
              {formatCurrency(ytd.varianceDollars)}
            </span>
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-900">YTD Actual</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(ytd.actualTotalExpenses)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            PEPM: {formatCurrency(ytd.pepm)}
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-sm font-medium text-gray-900">YTD Budget</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">
            {formatCurrency(ytd.budgetTotalExpenses)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {months.length} months
          </div>
        </div>
      </div>

      {/* Monthly Table */}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Month
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                EE
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Members
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Claims
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Fixed
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Actual Total
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Budget Total
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Var $
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                Var %
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                PEPM
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {months.map((m: any, idx: number) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {format(new Date(m.month), "MMM yyyy")}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                  {m.eeCount.toLocaleString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                  {m.memberCount.toLocaleString()}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                  {formatCurrency(m.totalClaims)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                  {formatCurrency(m.fixedCosts)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  {formatCurrency(m.actualTotalExpenses)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                  {formatCurrency(m.budgetTotalExpenses)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                  {formatCurrency(m.varianceDollars)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getVarianceBadge(
                      m.variancePercent
                    )}`}
                  >
                    {getVarianceIcon(m.variancePercent)}
                    {m.variancePercent > 0 ? "+" : ""}
                    {m.variancePercent.toFixed(1)}%
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-700">
                  {formatCurrency(m.pepm)}
                </td>
              </tr>
            ))}
            {/* YTD Row */}
            <tr className="bg-blue-50 font-bold">
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                YTD
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                {ytd.eeCount.toLocaleString()}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                {ytd.memberCount.toLocaleString()}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                {formatCurrency(ytd.totalClaims)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                {formatCurrency(ytd.fixedCosts)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                {formatCurrency(ytd.actualTotalExpenses)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                {formatCurrency(ytd.budgetTotalExpenses)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                {formatCurrency(ytd.varianceDollars)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-right">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-bold border ${getVarianceBadge(
                    ytd.variancePercent
                  )}`}
                >
                  {getVarianceIcon(ytd.variancePercent)}
                  {ytd.variancePercent > 0 ? "+" : ""}
                  {ytd.variancePercent.toFixed(1)}%
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right text-gray-900">
                {formatCurrency(ytd.pepm)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Last 3 Months Summary */}
      {lastThreeMonths && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="font-medium text-gray-900 mb-2">
            Last 3 Months Summary
          </div>
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-600">Actual</div>
              <div className="font-medium text-gray-900">
                {formatCurrency(lastThreeMonths.actualTotalExpenses)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Budget</div>
              <div className="font-medium text-gray-900">
                {formatCurrency(lastThreeMonths.budgetTotalExpenses)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Variance</div>
              <div className="font-medium text-gray-900">
                {formatCurrency(lastThreeMonths.varianceDollars)}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Var %</div>
              <div
                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getVarianceBadge(
                  lastThreeMonths.variancePercent
                )}`}
              >
                {getVarianceIcon(lastThreeMonths.variancePercent)}
                {lastThreeMonths.variancePercent > 0 ? "+" : ""}
                {lastThreeMonths.variancePercent.toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
