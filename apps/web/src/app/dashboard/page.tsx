import { BarChart3, TrendingUp, Users, FileText, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function DashboardOverviewPage() {
  return (
    <div className="p-8 space-y-8">
      {/* Page Hero */}
      <div>
        <div className="inline-flex items-center gap-2 status-pill up-to-date mb-4">
          <div className="w-2 h-2 rounded-full bg-accent-info" />
          <span>Up to date</span>
        </div>
        <h1 className="text-3xl font-bold">Dashboard Overview</h1>
        <p className="text-slate-400 mt-2">
          Comprehensive view of your self-funded medical and pharmacy reporting
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="kpi-pill">
          <div className="text-2xl font-bold text-accent-primary">94%</div>
          <div className="text-xs text-slate-400 mt-1">Of Budget YTD</div>
        </div>
        <div className="kpi-pill">
          <div className="text-2xl font-bold">$5.27M</div>
          <div className="text-xs text-slate-400 mt-1">Total Plan Cost</div>
        </div>
        <div className="kpi-pill">
          <div className="text-2xl font-bold text-status-green">+$317K</div>
          <div className="text-xs text-slate-400 mt-1">Surplus YTD</div>
        </div>
        <div className="kpi-pill">
          <div className="text-2xl font-bold">$1,234</div>
          <div className="text-xs text-slate-400 mt-1">PEPM Actual</div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/dashboard/executive" className="report-card">
          <BarChart3 className="w-10 h-10 text-accent-primary mb-4" />
          <h3 className="text-lg font-semibold mb-2">Executive Summary</h3>
          <p className="text-sm text-slate-400 mb-4">
            Fuel gauge, Plan YTD stacked bars, med vs Rx split, claimant buckets
          </p>
          <div className="text-sm text-accent-primary">View Report →</div>
        </Link>

        <Link href="/dashboard/monthly" className="report-card">
          <TrendingUp className="w-10 h-10 text-accent-info mb-4" />
          <h3 className="text-lg font-semibold mb-2">Monthly Detail</h3>
          <p className="text-sm text-slate-400 mb-4">
            A-N columns with formulas, PEPM charts, rolling 24-month trends
          </p>
          <div className="text-sm text-accent-info">View Report →</div>
        </Link>

        <Link href="/dashboard/hcc" className="report-card">
          <Users className="w-10 h-10 text-accent-warning mb-4" />
          <h3 className="text-lg font-semibold mb-2">High-Cost Claimants</h3>
          <p className="text-sm text-slate-400 mb-4">
            ISL-based filtering, Employer vs Stop Loss share visualization
          </p>
          <div className="text-sm text-accent-warning">View Report →</div>
        </Link>

        <Link href="/dashboard/summary" className="report-card">
          <FileText className="w-10 h-10 text-emerald-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">C&E Summary</h3>
          <p className="text-sm text-slate-400 mb-4">
            28-row statement with monthly/cumulative totals and adjustments
          </p>
          <div className="text-sm text-emerald-400">View Report →</div>
        </Link>

        <Link href="/dashboard/fees" className="report-card">
          <AlertCircle className="w-10 h-10 text-sky-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Fees Manager</h3>
          <p className="text-sm text-slate-400 mb-4">
            Configure admin fees, stop-loss rates, and user adjustments
          </p>
          <div className="text-sm text-sky-400">Manage Fees →</div>
        </Link>

        <Link href="/dashboard/upload" className="report-card">
          <BarChart3 className="w-10 h-10 text-purple-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Upload Data</h3>
          <p className="text-sm text-slate-400 mb-4">
            3-step wizard with validation, reconciliation, and preview
          </p>
          <div className="text-sm text-purple-400">Upload →</div>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="report-card">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent-primary" />
              <span>December 2024 data uploaded</span>
            </div>
            <span className="text-slate-500">2 hours ago</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent-info" />
              <span>Executive Summary exported to PDF</span>
            </div>
            <span className="text-slate-500">1 day ago</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent-warning" />
              <span>Stop Loss fees adjusted for HDHP plan</span>
            </div>
            <span className="text-slate-500">3 days ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
