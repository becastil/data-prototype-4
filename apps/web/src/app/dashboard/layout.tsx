import { ReactNode } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  FileUp,
  TrendingUp,
  Users,
  DollarSign,
  FileText,
  Settings,
  LayoutDashboard
} from 'lucide-react';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Executive', href: '/dashboard/executive', icon: BarChart3 },
  { name: 'Monthly', href: '/dashboard/monthly', icon: TrendingUp },
  { name: 'High Claimants', href: '/dashboard/hcc', icon: Users },
  { name: 'C&E Summary', href: '/dashboard/summary', icon: FileText },
  { name: 'Fees', href: '/dashboard/fees', icon: DollarSign },
  { name: 'Upload', href: '/dashboard/upload', icon: FileUp },
  { name: 'Inputs', href: '/dashboard/inputs', icon: Settings },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Icon Rail (collapsible sidebar) */}
      <aside className="md:w-20 border-r md:border-b-0 border-b border-slate-800 bg-base-900 flex md:flex-col flex-row md:items-center items-start md:py-6 py-3 px-3 md:px-0 gap-4 md:gap-6 overflow-x-auto md:overflow-visible">
        <Link href="/dashboard" className="md:mb-4 mb-0">
          <BarChart3 className="w-8 h-8 text-accent-primary" />
        </Link>

        <nav className="flex-1 flex md:flex-col flex-row gap-3 md:gap-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="w-12 h-12 rounded-card flex items-center justify-center text-slate-400 hover:bg-base-800 hover:text-text-dark transition-uber group relative"
              title={item.name}
              aria-label={`Navigate to ${item.name}`}
            >
              <item.icon className="w-6 h-6" aria-hidden="true" />
              <span className="absolute left-full ml-2 px-2 py-1 bg-base-800 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {item.name}
              </span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top App Bar */}
        <header className="min-h-16 border-b border-slate-800 bg-base-900 px-4 md:px-6 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-0">
          <h1 className="text-lg font-semibold">Medical Reporting Platform</h1>

          {/* Global Filter Bar (placeholder) */}
          <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm w-full md:w-auto">
            <select className="bg-base-950 border border-slate-700 rounded-card px-3 py-2 flex-1 md:flex-initial">
              <option>Client: Demo Corp</option>
            </select>
            <select className="bg-base-950 border border-slate-700 rounded-card px-3 py-2 flex-1 md:flex-initial">
              <option>Plan Year: 2024</option>
            </select>
            <select className="bg-base-950 border border-slate-700 rounded-card px-3 py-2 flex-1 md:flex-initial">
              <option>Through: Dec 2024</option>
            </select>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
