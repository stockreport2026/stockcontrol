import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MonthlyReportsPage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Reports</h1>
        <p className="text-slate-500 mt-1">Generate branch-level or consolidated company reports</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        {/* Branch report */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1 h-5 bg-slate-900 rounded" />
            <h2 className="text-lg font-semibold text-slate-900">Branch Report</h2>
          </div>
          <p className="text-xs text-slate-500 mb-5">Detailed report for a single branch and period</p>

          <form action="/reports/monthly/view" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Branch</label>
              <select name="branchId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                <select name="year" defaultValue={defaultYear} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
                  {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                <select name="month" defaultValue={defaultMonth} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-slate-900 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-slate-700">
              Generate Branch Report →
            </button>
          </form>
        </div>

        {/* Consolidated report */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-sm p-6 text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-1 h-5 bg-emerald-400 rounded" />
            <h2 className="text-lg font-semibold">Consolidated Company Report</h2>
          </div>
          <p className="text-xs text-slate-300 mb-5">All {branches.length} branches analyzed together</p>

          <form action="/reports/company" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Year</label>
                <select name="year" defaultValue={defaultYear} className="w-full border border-slate-600 rounded-md px-3 py-2 text-sm bg-slate-700 text-white">
                  {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-1">Month</label>
                <select name="month" defaultValue={defaultMonth} className="w-full border border-slate-600 rounded-md px-3 py-2 text-sm bg-slate-700 text-white">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
            </div>
            <button type="submit" className="w-full bg-emerald-500 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-emerald-400">
              Generate Consolidated Report →
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
