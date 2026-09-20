import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export default async function BranchSalesPage({ searchParams }: { searchParams: { year?: string; month?: string } }) {
  const now = new Date();
  const year = parseInt(searchParams.year ?? String(now.getFullYear()));
  const month = parseInt(searchParams.month ?? '8');

  const branches = await prisma.branch.findMany({
    include: {
      staffSales: { where: { periodYear: year, periodMonth: month } },
      staff: true,
    },
    orderBy: { name: 'asc' },
  });

  const rows = branches.map((b) => {
    const actual = b.staffSales.reduce((s, x) => s.plus(x.actualSales.toString()), new Decimal(0));
    const system = b.staffSales.reduce((s, x) => s.plus(x.systemSales.toString()), new Decimal(0));
    const variance = actual.minus(system);
    const variancePct = system.isZero() ? new Decimal(0) : variance.dividedBy(system).times(100);

    return {
      id: b.id,
      name: b.name,
      code: b.code,
      location: b.location ?? '—',
      staffCount: b.staff.length,
      records: b.staffSales.length,
      actual: actual.toFixed(2),
      system: system.toFixed(2),
      variance: variance.toFixed(2),
      variancePct: variancePct.toFixed(2),
    };
  });

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Branch Sales</h1>
        <p className="text-slate-500 mt-1">Branch totals from staff sales — {monthName}</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <form method="get" className="flex gap-4 items-end flex-wrap">
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
          <h2 className="text-lg font-semibold text-slate-900">Branches ({rows.length})</h2>
        </div>
        {rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No branches yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Staff</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Sales Records</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actual</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">System</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Variance</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Var %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const v = parseFloat(r.variance);
                  return (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.name}</div>
                        <div className="text-xs text-slate-500">{r.code} · {r.location}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.staffCount}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.records}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{Number(r.actual).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{Number(r.system).toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-medium ${v >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {v >= 0 ? '+' : ''}{Number(r.variance).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.variancePct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
