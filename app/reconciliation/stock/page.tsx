import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export default async function StockReconciliationPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string; branchId?: string };
}) {
  const year = parseInt(searchParams.year ?? '2026');
  const month = parseInt(searchParams.month ?? '8');
  const branchId = searchParams.branchId;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });

  const stocktakes = await prisma.stocktake.findMany({
    where: {
      stocktakeDate: { gte: startDate, lte: endDate },
      status: 'APPROVED',
      ...(branchId ? { branchId } : {}),
    },
    include: { branch: true, items: { include: { stockItem: true } } },
  });

  // Group by branch
  const byBranch = new Map<string, {
    name: string;
    expected: Decimal;
    actual: Decimal;
    loss: Decimal;
    surplus: Decimal;
    items: any[];
  }>();

  for (const st of stocktakes) {
    const cur = byBranch.get(st.branchId) ?? {
      name: st.branch.name,
      expected: new Decimal(0),
      actual: new Decimal(0),
      loss: new Decimal(0),
      surplus: new Decimal(0),
      items: [],
    };
    for (const item of st.items) {
      const exp = new Decimal(item.expectedQty.toString()).times(item.unitCost.toString());
      const act = new Decimal(item.actualQty.toString()).times(item.unitCost.toString());
      cur.expected = cur.expected.plus(exp);
      cur.actual = cur.actual.plus(act);
      const vv = new Decimal(item.varianceValue.toString());
      if (vv.isPositive()) cur.loss = cur.loss.plus(vv);
      else if (vv.isNegative()) cur.surplus = cur.surplus.plus(vv.abs());
      cur.items.push({
        description: item.stockItem.description,
        expected: Number(item.expectedQty),
        actual: Number(item.actualQty),
        variance: Number(item.varianceQty),
        unit: item.stockItem.unit,
        unitCost: Number(item.unitCost),
        value: Number(item.varianceValue),
      });
    }
    byBranch.set(st.branchId, cur);
  }

  const totals = {
    expected: new Decimal(0),
    actual: new Decimal(0),
    loss: new Decimal(0),
    surplus: new Decimal(0),
  };
  for (const b of byBranch.values()) {
    totals.expected = totals.expected.plus(b.expected);
    totals.actual = totals.actual.plus(b.actual);
    totals.loss = totals.loss.plus(b.loss);
    totals.surplus = totals.surplus.plus(b.surplus);
  }

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Stock Reconciliation</h1>
        <p className="text-slate-500 mt-1">Physical stocktake variances — {monthName}</p>
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
          <p className="text-sm text-slate-500 font-medium">Expected Value</p>
          <p className="text-xl font-bold mt-1 text-slate-900">KES {Number(totals.expected.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Actual Value</p>
          <p className="text-xl font-bold mt-1 text-slate-900">KES {Number(totals.actual.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Stock Loss</p>
          <p className="text-xl font-bold mt-1 text-red-600">KES {Number(totals.loss.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Stock Surplus</p>
          <p className="text-xl font-bold mt-1 text-green-600">KES {Number(totals.surplus.toFixed(2)).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Branch Stock Analysis ({byBranch.size})</h2>
        </div>
        {byBranch.size === 0 ? (
          <div className="p-12 text-center text-slate-500">No approved stocktakes for this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Items</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Expected Value</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Actual Value</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Stock Loss</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Shrink %</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(byBranch.entries()).map(([bid, b]) => {
                const shrink = b.expected.isZero() ? new Decimal(0) : b.loss.dividedBy(b.expected).times(100);
                return (
                  <tr key={bid} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{b.name}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{b.items.length}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{Number(b.expected.toFixed(2)).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{Number(b.actual.toFixed(2)).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-red-600 font-medium">{Number(b.loss.toFixed(2)).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${Number(shrink) > 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {shrink.toFixed(2)}%
                      </span>
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
