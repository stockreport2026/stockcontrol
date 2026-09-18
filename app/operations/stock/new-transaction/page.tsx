import { prisma } from '@/lib/db/prisma';
import { TxForm } from './tx-form';

export const dynamic = 'force-dynamic';

export default async function NewTransactionPage() {
  const [items, branches] = await Promise.all([
    prisma.stockItem.findMany({ orderBy: { sku: 'asc' } }),
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">New Stock Movement</h1>
        <p className="text-slate-500 mt-1">Record a purchase, sale, transfer, or adjustment</p>
      </div>

      <TxForm
        items={items.map((i) => ({ id: i.id, label: `${i.sku} — ${i.description}` }))}
        branches={branches.map((b) => ({ id: b.id, label: `${b.name} (${b.code})` }))}
      />
    </div>
  );
}
