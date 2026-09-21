import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default async function StockReconciliationPage() {
  const branches = await prisma.branch.findMany({
    include: {
      stockTxs: {
        include: { stockItem: true },
        orderBy: { transactionDate: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  const rows = branches.map((b) => {
    let opening = new Decimal(0);
    let purchases = new Decimal(0);
    let sales = new Decimal(0);
    let transfersIn = new Decimal(0);
    let transfersOut = new Decimal(0);
    let returns = new Decimal(0);
    let adjustments = new Decimal(0);

    for (const tx of b.stockTxs) {
      const qty = new Decimal(tx.quantity.toString());
      const value = qty.times(tx.stockItem.unitCost.toString());

      switch (tx.type) {
        case 'OPENING': opening = opening.plus(value); break;
        case 'PURCHASE': purchases = purchases.plus(value); break;
        case 'SALE': sales = sales.plus(value.abs()); break;
        case 'TRANSFER_IN': transfersIn = transfersIn.plus(value); break;
        case 'TRANSFER_OUT': transfersOut = transfersOut.plus(value.abs()); break;
        case 'RETURN': returns = returns.plus(value); break;
        case 'ADJUSTMENT': adjustments = adjustments.plus(value); break;
      }
    }

    // Expected closing = opening + purchases + transfers in - transfers out - sales + returns + adjustments
    const expectedClosing = opening
      .plus(purchases)
      .plus(transfersIn)
      .minus(transfersOut)
      .minus(sales)
      .plus(returns)
      .plus(adjustments);

    // Stock variance: expected - actual. Without a physical stocktake, variance is 0.
    // Real variance comes from the stocktake module.
    const variance = new Decimal(0);
    const shrinkageRate = opening.isZero()
      ? new Decimal(0)
      : variance.abs().dividedBy(opening).times(100);

    return {
      id: b.id,
      name: b.name,
      code: b.code,
      opening: opening.toFixed(2),
      purchases: purchases.toFixed(2),
      sales: sales.toFixed(2),
      expectedClosing: expectedClosing.toFixed(2),
      variance: variance.toFixed(2),
      shrinkageRate: shrinkageRate.toFixed(2),
      txCount: b.stockTxs.length,
    };
  });

  const totals = rows.reduce(
    (acc, r) => ({
      opening: acc.opening.plus(r.opening),
      purchases: acc.purchases.plus(r.purchases),
      sales: acc.sales.plus(r.sales),
      expectedClosing: acc.expectedClosing.plus(r.expectedClosing),
    }),
    {
      opening: new Decimal(0),
      purchases: new Decimal(0),
      sales: new Decimal(0),
      expectedClosing: new Decimal(0),
    }
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Stock Reconciliation</h1>
        <p className="text-slate-500 mt-1">
          Opening stock + purchases − sales = expected closing, per branch
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Opening Value</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">
            KES {fmt(totals.opening.toFixed(2))}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Purchases</p>
          <p className="text-2xl font-bold mt-1 text-green-600">
            +KES {fmt(totals.purchases.toFixed(2))}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Sales</p>
          <p className="text-2xl font-bold mt-1 text-red-600">
            −KES {fmt(totals.sales.toFixed(2))}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Expected Closing</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">
            KES {fmt(totals.expectedClosing.toFixed(2))}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Branch Stock Position</h2>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No branches yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Tx Count</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Opening</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">+ Purchases</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">− Sales</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Expected Close</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Variance</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Shrink %</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{r.name}</div>
                      <div className="text-xs text-slate-500">{r.code}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{r.txCount}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {fmt(r.opening)}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600">
                      +{fmt(r.purchases)}
                    </td>
                    <td className="px-4 py-3 text-right text-red-600">
                      −{fmt(r.sales)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {fmt(r.expectedClosing)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(r.variance)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{r.shrinkageRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
          Note: Stock variance will appear once a physical stocktake is recorded for each branch.
        </div>
      </div>
    </div>
  );
}
