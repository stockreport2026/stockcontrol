import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import { StocktakeEntryForm } from './entry-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function NewStocktakePage({
  searchParams,
}: {
  searchParams: { branchId?: string };
}) {
  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });

  if (branches.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-900">New Stocktake</h1>
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800">
          You need to create a branch first.
        </div>
      </div>
    );
  }

  const selectedBranchId = searchParams.branchId || branches[0].id;
  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];

  const items = await prisma.stockItem.findMany({
    where: { isActive: true },
    orderBy: { sku: 'asc' },
  });

  const rows: {
    id: string;
    sku: string;
    description: string;
    unit: string;
    unitCost: string;
    expectedQty: string;
  }[] = [];

  for (const item of items) {
    const txs = await prisma.stockTransaction.findMany({
      where: { stockItemId: item.id, branchId: selectedBranch.id },
    });
    const expected = txs.reduce(
      (sum, tx) => sum.plus(tx.quantity.toString()),
      new Decimal(0)
    );
    rows.push({
      id: item.id,
      sku: item.sku,
      description: item.description,
      unit: item.unit,
      unitCost: item.unitCost.toString(),
      expectedQty: expected.toString(),
    });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">New Stocktake</h1>
        <p className="text-slate-500 mt-1">
          {selectedBranch.name} · {selectedBranch.code}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800">
          No stock items exist yet. Add stock items first.
        </div>
      ) : (
        <StocktakeEntryForm
          branches={branches.map((b) => ({ id: b.id, label: b.name + ' (' + b.code + ')' }))}
          selectedBranchId={selectedBranch.id}
          items={rows}
        />
      )}
    </div>
  );
}
