import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export default async function StaffSalesPage({ searchParams }: { searchParams: { year?: string; month?: string; branchId?: string } }) {
  const now = new Date();
  const year = parseInt(searchParams.year ?? String(now.getFullYear()));
  const month = parseInt(searchParams.month ?? '8');
  const branchId = searchParams.branchId;

  const [branches, sales] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.staffSales.findMany({
      where: { periodYear: year, periodMonth: month, ...(branchId ? { branchId } : {}) },
      include: { staff: true, branch: true },
      orderBy: [{ variance: 'desc' }],
    }),
  ]);

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Staff Sales Summary</h1>
        <p className="text-slate-500 mt-1">Per-staff sales performance — {monthName}</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <form method="get" className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
            <select name="branchId" defaultValue={branchId ?? ''} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white min-w-[200px]">
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Year</label>
            <select name="year" defaultValue={year} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
            <select name="month" defaultValue={month} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-slate-700 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-600">Load</button>
        </form>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Staff Performance ({sales.length})</h2>
        </div>
        {sales.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No sales records for this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Staff</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Actual</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">System</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Variance</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Var %</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => {
                const v = Number(s.variance);
                const pct = Number(s.systemSales) === 0 ? 0 : (v / Number(s.systemSales)) * 100;
                return (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{s.staff.firstName} {s.staff.lastName}</td>
                    <td className="px-6 py-3 text-slate-600">{s.branch.name}</td>
                    <td className="px-6 py-3 text-right text-slate-900">{Number(s.actualSales).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{Number(s.systemSales).toLocaleString()}</td>
                    <td className={`px-6 py-3 text-right font-medium ${v >= 0 ? 'text-green-600' : 'text-red-600'}`}>{v >= 0 ? '+' : ''}{v.toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{pct.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
