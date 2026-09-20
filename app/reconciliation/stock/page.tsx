import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export default async function StockReconciliationPage({ searchParams }: { searchParams: { year?: string; month?: string; branchId?: string } }) {
  const year = parseInt(searchParams.year ?? '2026');
  const month = parseInt(searchParams.month ?? '8');
  const branchId = searchParams.branchId;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const [branches, items] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.stockVarianceItem.findMany({
      where: { periodStartDate: { lte: endDate }, periodEndDate: { gte: startDate }, ...(branchId ? { branchId } : {}) },
      include: { branch: true },
    }),
  ]);

  const totalOpening = items.reduce((s, i) => s.plus(new Decimal(i.expectedQty.toString()).times(i.unitCost.toString())), new Decimal(0));
  const totalClosing = items.reduce((s, i) => s.plus(new Decimal(i.actualQty.toString()).times(i.unitCost.toString())), new Decimal(0));
  const totalLoss = items.reduce((s, i) => {
    const v = new Decimal(i.varianceValue.toString());
    return v.isPositive() ? s.plus(v) : s;
  }, new Decimal(0));
  const totalSurplus = items.reduce((s, i) => {
    const v = new Decimal(i.varianceValue.toString());
    return v.isNegative() ? s.plus(v.abs()) : s;
  }, new Decimal(0));

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Stock Reconciliation</h1>
        <p className="text-slate-500 mt-1">Itemized stock variances — {monthName}</p>
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
          <button type="submit" className="bg-slate-700 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-600">Apply</button>
        </form>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">System Value</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {Number(totalOpening.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Actual Value</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {Number(totalClosing.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Stock Loss</p>
          <p className="text-2xl font-bold mt-1 text-rose-600">KES {Number(totalLoss.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Stock Surplus</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">KES {Number(totalSurplus.toFixed(2)).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Variance Items ({items.length})</h2>
        </div>
        {items.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No stock variance items for this period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Item</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">System</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actual</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Variance</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Unit Cost</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Reason</th>
                </tr>
              </thead>
              <tbody>
                {items.map((i) => {
                  const vv = Number(i.varianceValue);
                  const isLoss = vv > 0;
                  return (
                    <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700 text-xs">{i.branch.name}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{i.itemName}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{Number(i.expectedQty).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{Number(i.actualQty).toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-medium ${isLoss ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isLoss ? '−' : '+'}{Math.abs(Number(i.varianceQty)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{Number(i.unitCost).toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${isLoss ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isLoss ? '−' : '+'}{Math.abs(vv).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate" title={i.reason ?? ''}>{i.reason ?? '—'}</td>
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
