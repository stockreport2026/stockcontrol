import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function SalesReconciliationPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string; branchId?: string };
}) {
  const now = new Date();
  const year = parseInt(searchParams.year ?? '2026');
  const month = parseInt(searchParams.month ?? '8');
  const branchId = searchParams.branchId;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  const where = { saleDate: { gte: startDate, lte: endDate }, ...(branchId ? { branchId } : {}) };

  const sales = await prisma.dailySale.findMany({
    where,
    include: { staff: true, branch: true },
  });

  // Group by branch
  const byBranch = new Map<string, { name: string; actual: Decimal; system: Decimal; staffActual: Map<string, Decimal>; records: number }>();
  for (const s of sales) {
    const cur = byBranch.get(s.branchId) ?? { name: s.branch.name, actual: new Decimal(0), system: new Decimal(0), staffActual: new Map(), records: 0 };
    cur.actual = cur.actual.plus(s.actualSales.toString());
    cur.system = cur.system.plus(s.systemSales.toString());
    const staffAmt = cur.staffActual.get(s.staffId) ?? new Decimal(0);
    cur.staffActual.set(s.staffId, staffAmt.plus(s.actualSales.toString()));
    cur.records++;
    byBranch.set(s.branchId, cur);
  }

  const totalActual = sales.reduce((s, d) => s.plus(d.actualSales.toString()), new Decimal(0));
  const totalSystem = sales.reduce((s, d) => s.plus(d.systemSales.toString()), new Decimal(0));
  const totalVariance = totalActual.minus(totalSystem);

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Sales Reconciliation</h1>
        <p className="text-slate-500 mt-1">Branch totals reconciled against sum of staff totals — {monthName}</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 flex gap-4 items-end flex-wrap">
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
          <button type="submit" className="bg-slate-700 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-600">Apply</button>
        </form>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Actual</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {Number(totalActual.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total System</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {Number(totalSystem.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Variance</p>
          <p className={`text-2xl font-bold mt-1 ${totalVariance.isNegative() ? 'text-red-600' : 'text-green-600'}`}>
            KES {Number(totalVariance.toFixed(2)).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Branch Reconciliation ({byBranch.size})</h2>
        </div>
        {byBranch.size === 0 ? (
          <div className="p-12 text-center text-slate-500">No sales records for this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Records</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Actual</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">System</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Variance</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Recon Check</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(byBranch.entries()).map(([bId, b]) => {
                const staffTotal = Array.from(b.staffActual.values()).reduce((s, v) => s.plus(v), new Decimal(0));
                const diff = b.actual.minus(staffTotal);
                const ok = diff.abs().lessThan(0.01);
                const variance = b.actual.minus(b.system);
                return (
                  <tr key={bId} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{b.name}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{b.records}</td>
                    <td className="px-6 py-3 text-right text-slate-900 font-medium">{Number(b.actual.toFixed(2)).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{Number(b.system.toFixed(2)).toLocaleString()}</td>
                    <td className={`px-6 py-3 text-right font-medium ${variance.isNegative() ? 'text-red-600' : 'text-green-600'}`}>
                      {Number(variance.toFixed(2)).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {ok ? (
                        <span className="text-green-600 font-medium text-xs">✓ Matched</span>
                      ) : (
                        <span className="text-red-600 font-medium text-xs">✗ Diff {Number(diff.toFixed(2)).toLocaleString()}</span>
                      )}
                    </td>
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
