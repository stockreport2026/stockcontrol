import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function StocktakeListPage() {
  const [branches, stocktakes] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.stocktake.findMany({
      include: { branch: true, items: true },
      orderBy: { stocktakeDate: 'desc' },
      take: 20,
    }),
  ]);

  const rows = stocktakes.map((st) => {
    let expectedValue = new Decimal(0);
    let actualValue = new Decimal(0);
    let lossValue = new Decimal(0);
    let surplusValue = new Decimal(0);

    for (const it of st.items) {
      const cost = new Decimal(it.unitCost.toString());
      expectedValue = expectedValue.plus(new Decimal(it.expectedQty.toString()).times(cost));
      actualValue = actualValue.plus(new Decimal(it.actualQty.toString()).times(cost));
      const vv = new Decimal(it.varianceValue.toString());
      if (vv.isNegative()) lossValue = lossValue.plus(vv.abs());
      else surplusValue = surplusValue.plus(vv);
    }

    return {
      id: st.id,
      branch: st.branch.name,
      date: st.stocktakeDate,
      status: st.status,
      itemCount: st.items.length,
      expectedValue: expectedValue.toFixed(2),
      actualValue: actualValue.toFixed(2),
      loss: lossValue.toFixed(2),
      surplus: surplusValue.toFixed(2),
    };
  });

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stocktake</h1>
          <p className="text-slate-500 mt-1">Physical stock counts and variance analysis</p>
        </div>
        {branches.length > 0 && (
          <Link
            href="/operations/stocktake/new"
            className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700"
          >
            + New Stocktake
          </Link>
        )}
      </div>

      {branches.length === 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          Create a branch first in Administration → Branches.
        </div>
      )}

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Recent Stocktakes ({rows.length})</h2>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500">No stocktakes recorded yet.</p>
            {branches.length > 0 && (
              <p className="text-sm text-slate-400 mt-2">Click "New Stocktake" to begin your first physical count.</p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Items</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Expected Value</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actual Value</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Loss</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Surplus</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(r.date).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-medium">{r.branch}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{r.itemCount}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {Number(r.expectedValue).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    {Number(r.actualValue).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">
                    {Number(r.loss) > 0 ? '-' + Number(r.loss).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                    {Number(r.surplus) > 0 ? '+' + Number(r.surplus).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
