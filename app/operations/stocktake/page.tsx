import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export default async function StocktakePage() {
  const stocktakes = await prisma.stocktake.findMany({
    include: {
      branch: true,
      items: true,
    },
    orderBy: { stocktakeDate: 'desc' },
    take: 20,
  });

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stocktake</h1>
          <p className="text-slate-500 mt-1">
            Physical stock counts and variance analysis
          </p>
        </div>
        <Link
          href="/operations/stocktake/new"
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700"
        >
          + New Stocktake
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Stocktakes ({stocktakes.length})
          </h2>
        </div>

        {stocktakes.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 mb-4">No stocktakes recorded yet.</p>
            <Link
              href="/operations/stocktake/new"
              className="inline-block bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700"
            >
              Start First Stocktake
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Items</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Expected Value</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Actual Value</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Variance</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Status</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {stocktakes.map((st) => {
                const expectedVal = st.items.reduce(
                  (sum, i) => sum.plus(new Decimal(i.expectedQty.toString()).times(i.unitCost.toString())),
                  new Decimal(0)
                );
                const actualVal = st.items.reduce(
                  (sum, i) => sum.plus(new Decimal(i.actualQty.toString()).times(i.unitCost.toString())),
                  new Decimal(0)
                );
                const variance = expectedVal.minus(actualVal);

                return (
                  <tr key={st.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-700">
                      {new Date(st.stocktakeDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-3 text-slate-700">{st.branch.name}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{st.items.length}</td>
                    <td className="px-6 py-3 text-right text-slate-900">
                      {Number(expectedVal.toFixed(2)).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-900">
                      {Number(actualVal.toFixed(2)).toLocaleString()}
                    </td>
                    <td className={`px-6 py-3 text-right font-medium ${
                      variance.isNegative() ? 'text-red-600' : variance.isZero() ? 'text-slate-500' : 'text-green-600'
                    }`}>
                      {variance.isNegative() ? '' : '+'}
                      {Number(variance.toFixed(2)).toLocaleString()}
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {st.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/operations/stocktake/${st.id}`}
                        className="text-slate-600 hover:text-slate-900 text-sm font-medium"
                      >
                        View →
                      </Link>
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
