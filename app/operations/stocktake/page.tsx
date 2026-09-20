import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function StocktakePage({ searchParams }: { searchParams: { branchId?: string; status?: string } }) {
  const branchId = searchParams.branchId;
  const statusFilter = searchParams.status;

  const where: any = {};
  if (branchId) where.branchId = branchId;
  if (statusFilter && statusFilter !== 'ALL') where.status = statusFilter;

  const [branches, stocktakes] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.stocktake.findMany({
      where,
      include: { branch: true, items: true },
      orderBy: { stocktakeDate: 'desc' },
    }),
  ]);

  const enriched = stocktakes.map((st) => {
    const expectedVal = st.items.reduce((s, i) => s.plus(new Decimal(i.expectedQty.toString()).times(i.unitCost.toString())), new Decimal(0));
    const actualVal = st.items.reduce((s, i) => s.plus(new Decimal(i.actualQty.toString()).times(i.unitCost.toString())), new Decimal(0));
    const stockLoss = Decimal.max(expectedVal.minus(actualVal), 0);
    const surplus = Decimal.max(actualVal.minus(expectedVal), 0);
    const shrinkPct = expectedVal.isZero() ? new Decimal(0) : stockLoss.dividedBy(expectedVal).times(100);
    const countedItems = st.items.filter((i) => !new Decimal(i.actualQty.toString()).isZero()).length;
    return {
      id: st.id,
      branchName: st.branch.name,
      branchCode: st.branch.code,
      stocktakeDate: st.stocktakeDate,
      status: st.status,
      notes: st.notes,
      itemCount: st.items.length,
      countedItems,
      expectedVal: Number(expectedVal.toFixed(2)),
      actualVal: Number(actualVal.toFixed(2)),
      stockLoss: Number(stockLoss.toFixed(2)),
      surplus: Number(surplus.toFixed(2)),
      shrinkPct: Number(shrinkPct.toFixed(2)),
    };
  });

  const statusColors: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    UNDER_REVIEW: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-rose-100 text-rose-700',
  };

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stocktakes</h1>
          <p className="text-slate-500 mt-1">Physical count records — feed the recovery engine and reports</p>
        </div>
        <Link href="/operations/stocktake/new" className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700">
          + New Stocktake
        </Link>
      </div>

      {/* Filters */}
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
            <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
            <select name="status" defaultValue={statusFilter ?? 'ALL'} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
            </select>
          </div>
          <button type="submit" className="bg-slate-700 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-600">Filter</button>
          <Link href="/operations/stocktake" className="text-sm text-slate-500 hover:text-slate-900 self-center">Clear</Link>
        </form>
      </div>

      {enriched.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
          <p className="text-slate-500 mb-4">No stocktakes found.</p>
          <Link href="/operations/stocktake/new" className="inline-block bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700">
            Start First Stocktake
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Stocktake Records ({enriched.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Items</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Expected Value</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actual Value</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Stock Loss</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Shrink %</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600"></th>
                </tr>
              </thead>
              <tbody>
                {enriched.map((st) => (
                  <tr key={st.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700">{new Date(st.stocktakeDate).toLocaleDateString('en-GB')}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{st.branchName}</div>
                      <div className="text-xs text-slate-500">{st.branchCode}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="text-slate-900 font-medium">{st.countedItems}/{st.itemCount}</div>
                      <div className="text-xs text-slate-500">counted</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{st.expectedVal.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{st.actualVal.toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-medium ${st.stockLoss > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                      {st.stockLoss > 0 ? st.stockLoss.toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {st.shrinkPct > 0 ? (
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${st.shrinkPct > 5 ? 'bg-rose-100 text-rose-700' : st.shrinkPct > 2 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {st.shrinkPct.toFixed(2)}%
                        </span>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${statusColors[st.status]}`}>{st.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/operations/stocktake/${st.id}`} className="text-slate-900 hover:text-slate-600 font-medium text-xs">
                        Open →
                      </Link>
                    </td>
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
