import Link from 'next/link';
import { ArrowRight, BarChart3, FileUp, Shield } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <header className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-8 h-8 text-accent-primary" />
            <span className="text-xl font-semibold">Medical Reporting Platform</span>
          </div>
          <Link
            href="/dashboard"
            className="px-4 py-2 bg-accent-primary text-base-950 rounded-card font-medium hover:bg-emerald-400 transition-uber"
          >
            Go to Dashboard
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-4xl text-center space-y-8">
          {/* On our way motif */}
          <div className="inline-flex items-center gap-2 status-pill on-way">
            <div className="w-2 h-2 rounded-full bg-accent-primary animate-pulse" />
            <span>On our way to better insights</span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight">
            Self-Funded Medical & Pharmacy Reporting
          </h1>

          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Enterprise-grade analytics platform for medical, pharmacy, and C&E reporting
            with real-time insights, automated reconciliation, and pixel-perfect exports.
          </p>

          <div className="flex gap-4 justify-center pt-4">
            <Link
              href="/dashboard/upload"
              className="px-6 py-3 bg-accent-primary text-base-950 rounded-card font-medium hover:bg-emerald-400 transition-uber inline-flex items-center gap-2"
            >
              <FileUp className="w-5 h-5" />
              Upload Data
            </Link>
            <Link
              href="/dashboard/executive"
              className="px-6 py-3 bg-base-900 border border-slate-700 text-text-dark rounded-card font-medium hover:bg-base-800 transition-uber inline-flex items-center gap-2"
            >
              View Executive Summary
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mt-20">
          <div className="report-card">
            <BarChart3 className="w-10 h-10 text-accent-primary mb-4" />
            <h3 className="text-lg font-semibold mb-2">Executive Summary</h3>
            <p className="text-sm text-slate-400">
              Fuel gauge, YTD analysis, med vs Rx split, and plan distribution
              with real-time budget tracking.
            </p>
          </div>

          <div className="report-card">
            <FileUp className="w-10 h-10 text-accent-info mb-4" />
            <h3 className="text-lg font-semibold mb-2">Smart Upload</h3>
            <p className="text-sm text-slate-400">
              3-step wizard with validation, reconciliation, and automatic
              fee calculations from tier mix.
            </p>
          </div>

          <div className="report-card">
            <Shield className="w-10 h-10 text-accent-warning mb-4" />
            <h3 className="text-lg font-semibold mb-2">HIPAA-Conscious</h3>
            <p className="text-sm text-slate-400">
              No PHI/PII storage, encrypted connections, audit trails,
              and role-based access control.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-800 mt-20">
        <div className="max-w-7xl mx-auto px-6 py-8 text-center text-sm text-slate-500">
          <p>Medical Reporting Platform &copy; 2025 &mdash; Enterprise Healthcare Analytics</p>
        </div>
      </footer>
    </div>
  );
}
