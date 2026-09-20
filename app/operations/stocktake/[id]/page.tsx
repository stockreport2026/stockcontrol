import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { StocktakeForm } from './stocktake-form';

export const dynamic = 'force-dynamic';

export default async function StocktakeDetailPage({ params }: { params: { id: string } }) {
  const stocktake = await prisma.stocktake.findUnique({
    where: { id: params.id },
    include: {
      branch: true,
      items: { include: { stockItem: true }, orderBy: { stockItem: { description: 'asc' } } },
    },
  });
  if (!stocktake) return notFound();

  const items = stocktake.items.map((i) => ({
    id: i.id,
    description: i.stockItem.description,
    category: i.stockItem.category ?? 'Uncategorized',
    unit: i.stockItem.unit,
    expectedQty: Number(i.expectedQty),
    actualQty: Number(i.actualQty),
    unitCost: Number(i.unitCost),
    notes: i.notes ?? '',
  }));

  const isApproved = stocktake.status === 'APPROVED';
  const statusColors: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700',
    SUBMITTED: 'bg-blue-100 text-blue-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
  };

  return (
    <div>
      <div className="mb-8">
        <Link href="/operations/stocktake" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to Stocktakes
        </Link>
        <div className="flex items-start justify-between mt-2">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Stocktake — {stocktake.branch.name}</h1>
            <p className="text-slate-500 mt-1">
              {new Date(stocktake.stocktakeDate).toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              <span className="mx-2">·</span>
              <span className="font-mono text-xs">{stocktake.branch.code}</span>
            </p>
            {stocktake.notes && (
              <p className="text-sm text-slate-600 mt-2 p-2 bg-slate-50 rounded border-l-2 border-slate-300 max-w-2xl">
                {stocktake.notes}
              </p>
            )}
          </div>
          <span className={`inline-block px-3 py-1.5 rounded text-xs font-semibold ${statusColors[stocktake.status]}`}>
            {stocktake.status}
          </span>
        </div>
      </div>

      <StocktakeForm stocktakeId={stocktake.id} items={items} isApproved={isApproved} />
    </div>
  );
}
