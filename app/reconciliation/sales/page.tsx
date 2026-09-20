import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export default async function SalesReconciliationPage({ searchParams }: { searchParams: { year?: string; month?: string; branchId?: string } }) {
  const year = parseInt(searchParams.year ?? '2026');
  const month = parseInt(searchParams.month ?? '8');
  const branchId = searchParams.branchId;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });

  const [sales, creditSales, repayments] = await Promise.all([
    prisma.staffSales.findMany({
      where: { periodYear: year, periodMonth: month, ...(branchId ? { branchId } : {}) },
      include: { staff: true, branch: true },
    }),
    prisma.creditSale.findMany({
      where: { saleDate: { gte: startDate, lte: endDate }, ...(branchId ? { branchId } : {}) },
    }),
    prisma.repayment.findMany({
      where: { paymentDate: { gte: startDate, lte: endDate }, ...(branchId ? { branchId } : {}) },
    }),
  ]);

  // Per-staff adjusted variance
  const staffRows = sales.map((s) => {
    const staffCredit = creditSales.filter((c) => c.staffId === s.staffId).reduce((a, c) => a.plus(c.amount.toString()), new Decimal(0));
    const staffRepay = repayments.filter((r) => r.staffId === s.staffId).reduce((a, r) => a.plus(r.amount.toString()), new Decimal(0));
    const adjSystem = new Decimal(s.systemSales.toString()).minus(staffCredit);
    const adjActual = new Decimal(s.actualSales.toString()).minus(staffRepay);
    const variance = adjActual.minus(adjSystem);
    const varPct = adjSystem.isZero() ? new Decimal(0) : variance.dividedBy(adjSystem).times(100);
    return {
      branchId: s.branchId,
      branchName: s.branch.name,
      staffName: `${s.staff.firstName} ${s.staff.lastName}`,
      rawActual: new Decimal(s.actualSales.toString()),
      rawSystem: new Decimal(s.systemSales.toString()),
      credit: staffCredit,
      repay: staffRepay,
      adjActual,
      adjSystem,
      variance,
      varPct,
    };
  });

  // Group by branch
  const byBranch = new Map<string, { name: string; actual: Decimal; system: Decimal; credit: Decimal; repay: Decimal; adjActual: Decimal; adjSystem: Decimal; variance: Decimal; records: number }>();
  for (const r of staffRows) {
    const cur = byBranch.get(r.branchId) ?? { name: r.branchName, actual: new Decimal(0), system: new Decimal(0), credit: new Decimal(0), repay: new Decimal(0), adjActual: new Decimal(0), adjSystem: new Decimal(0), variance: new Decimal(0), records: 0 };
    cur.actual = cur.actual.plus(r.rawActual);
    cur.system = cur.system.plus(r.rawSystem);
    cur.credit = cur.credit.plus(r.credit);
    cur.repay = cur.repay.plus(r.repay);
    cur.adjActual = cur.adjActual.plus(r.adjActual);
    cur.adjSystem = cur.adjSystem.plus(r.adjSystem);
    cur.variance = cur.variance.plus(r.variance);
    cur.records++;
    byBranch.set(r.branchId, cur);
  }

  const totalAdjActual = staffRows.reduce((s, r) => s.plus(r.adjActual), new Decimal(0));
  const totalAdjSystem = staffRows.reduce((s, r) => s.plus(r.adjSystem), new Decimal(0));
  const totalVariance = totalAdjActual.minus(totalAdjSystem);

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Sales Reconciliation</h1>
        <p className="text-slate-500 mt-1">Credit & repayments applied — {monthName}</p>
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
          <p className="text-sm text-slate-500 font-medium">Adjusted Actual</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {Number(totalAdjActual.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Adjusted System</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {Number(totalAdjSystem.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Adjusted Variance</p>
          <p className={`text-2xl font-bold mt-1 ${totalVariance.isNegative() ? 'text-red-600' : 'text-green-600'}`}>
            KES {Number(totalVariance.toFixed(2)).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Branch summary */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">By Branch ({byBranch.size})</h2>
        </div>
        {byBranch.size === 0 ? (
          <div className="p-12 text-center text-slate-500">No sales for this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Records</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Raw Actual</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">− Repay</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Adj Actual</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Raw System</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">− Credit</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Adj System</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Variance</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(byBranch.entries()).map(([bid, b]) => (
                <tr key={bid} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{b.name}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{b.records}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{Number(b.actual.toFixed(2)).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">−{Number(b.repay.toFixed(2)).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{Number(b.adjActual.toFixed(2)).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-700">{Number(b.system.toFixed(2)).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-amber-600">−{Number(b.credit.toFixed(2)).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{Number(b.adjSystem.toFixed(2)).toLocaleString()}</td>
                  <td className={`px-4 py-3 text-right font-medium ${b.variance.isNegative() ? 'text-red-600' : 'text-green-600'}`}>
                    {Number(b.variance.toFixed(2)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Per-staff detail */}
      {staffRows.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">By Staff ({staffRows.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Staff</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Adj Actual</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Adj System</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Variance</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Var %</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{r.staffName}</td>
                    <td className="px-4 py-3 text-slate-600">{r.branchName}</td>
                    <td className="px-4 py-3 text-right text-slate-900">{Number(r.adjActual.toFixed(2)).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{Number(r.adjSystem.toFixed(2)).toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-medium ${r.variance.isNegative() ? 'text-red-600' : 'text-green-600'}`}>
                      {Number(r.variance.toFixed(2)).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{Number(r.varPct.toFixed(2))}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
