import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getStockData() {
  const items = await prisma.stockItem.findMany({
    include: {
      transactions: {
        include: { branch: true },
      },
    },
    orderBy: { sku: 'asc' },
  });

  return items.map((item) => {
    let opening = new Decimal(0);
    let purchases = new Decimal(0);
    let sales = new Decimal(0);
    let returns = new Decimal(0);
    let adjustments = new Decimal(0);

    for (const tx of item.transactions) {
      const qty = new Decimal(tx.quantity.toString());
      switch (tx.type) {
        case 'OPENING': opening = opening.plus(qty); break;
        case 'PURCHASE':
        case 'TRANSFER_IN': purchases = purchases.plus(qty); break;
        case 'SALE':
        case 'TRANSFER_OUT': sales = sales.plus(qty.abs()); break;
        case 'RETURN': returns = returns.plus(qty); break;
        case 'ADJUSTMENT': adjustments = adjustments.plus(qty); break;
      }
    }

    const expectedClosing = opening.plus(purchases).minus(sales).plus(returns).plus(adjustments);
    const value = expectedClosing.times(item.unitCost.toString());

    return {
      id: item.id,
      sku: item.sku,
      description: item.description,
      category: item.category ?? '—',
      unit: item.unit,
      unitCost: item.unitCost.toString(),
      opening: opening.toString(),
      purchases: purchases.toString(),
      sales: sales.toString(),
      expectedClosing: expectedClosing.toString(),
      value: value.toFixed(2),
      txCount: item.transactions.length,
    };
  });
}

export default async function StockPage() {
  const items = await getStockData();

  const totalValue = items.reduce((sum, i) => sum.plus(i.value), new Decimal(0));

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Stock Items</h1>
          <p className="text-slate-500 mt-1">Live stock position calculated from all transactions</p>
        </div>
        <Link
          href="/operations/stock/new-transaction"
          className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700"
        >
          + Record Movement
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Items</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{items.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Transactions</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">
            {items.reduce((s, i) => s + i.txCount, 0)}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Stock Value</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">
            KES {Number(totalValue.toFixed(2)).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Stock Position</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Item</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Category</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Opening</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">+ Purchases</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">- Sales</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Expected</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Unit Cost</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Value (KES)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{i.description}</div>
                    <div className="text-xs text-slate-500">{i.sku}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{i.category}</td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {Number(i.opening).toLocaleString()} {i.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600">
                    +{Number(i.purchases).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600">
                    -{Number(i.sales).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {Number(i.expectedClosing).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {Number(i.unitCost).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {Number(i.value).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
