import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { StocktakeForm } from './stocktake-form';

export const dynamic = 'force-dynamic';

export default async function StocktakeDetailPage({ params }: { params: { id: string } }) {
  const stocktake = await prisma.stocktake.findUnique({
    where: { id: params.id },
    include: { branch: true, items: { include: { stockItem: true } } },
  });
  if (!stocktake) return notFound();

  const items = stocktake.items.map((i) => ({
    id: i.id,
    description: i.stockItem.description,
    unit: i.stockItem.unit,
    expectedQty: i.expectedQty.toString(),
    actualQty: i.actualQty.toString(),
    varianceQty: i.varianceQty.toString(),
    unitCost: i.unitCost.toString(),
    varianceValue: i.varianceValue.toString(),
  }));

  const totalExpectedValue = items.reduce((sum, i) => sum + parseFloat(i.expectedQty) * parseFloat(i.unitCost), 0);
  const totalActualValue = items.reduce((sum, i) => sum + parseFloat(i.actualQty) * parseFloat(i.unitCost), 0);
  const stockLoss = totalExpectedValue - totalActualValue;
  const isApproved = stocktake.status === 'APPROVED';
  const isLoss = stockLoss > 0.001;
  const isSurplus = stockLoss < -0.001;

  return (
    <div>
      <div className="mb-8">
        <Link href="/operations/stocktake" className="text-sm text-slate-500 hover:text-slate-900">← Back to Stocktakes</Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-2">Stocktake — {stocktake.branch.name}</h1>
        <p className="text-slate-500 mt-1">
          {new Date(stocktake.stocktakeDate).toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Items Counted</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{items.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Expected Value</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {totalExpectedValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Actual Value</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {totalActualValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">{isLoss ? 'Stock Loss' : isSurplus ? 'Stock Surplus' : 'No Variance'}</p>
          <p className={`text-2xl font-bold mt-1 ${isLoss ? 'text-red-600' : isSurplus ? 'text-green-600' : 'text-slate-900'}`}>
            {isSurplus ? '(' : ''}KES {Math.abs(stockLoss).toLocaleString(undefined, { maximumFractionDigits: 2 })}{isSurplus ? ')' : ''}
          </p>
        </div>
      </div>

      <StocktakeForm stocktakeId={stocktake.id} items={items} isApproved={isApproved} />
    </div>
  );
}
