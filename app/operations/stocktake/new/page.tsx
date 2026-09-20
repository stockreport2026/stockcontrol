import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';
import { createStocktake } from './actions';

export const dynamic = 'force-dynamic';

export default async function NewStocktakePage() {
  const [branches, stockItemCount] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.stockItem.count({ where: { isActive: true } }),
  ]);
  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="mb-8">
        <Link href="/operations/stocktake" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to Stocktakes
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 mt-2">New Stocktake</h1>
        <p className="text-slate-500 mt-1">Start a new physical count for a branch</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 max-w-2xl">
        <p className="text-sm text-amber-900">
          <strong>How it works:</strong> When you create a stocktake, all <strong>{stockItemCount} active stock items</strong> will be
          pre-loaded with their <strong>expected quantities</strong> (calculated from opening stock + purchases − sales).
          You then enter the <strong>physical count</strong> for each item, and the system calculates variances.
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 max-w-2xl">
        <form action={createStocktake} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
            <select name="branchId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Stocktake Date</label>
            <input type="date" name="stocktakeDate" required defaultValue={today}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <textarea name="notes" rows={3} placeholder="Any context — e.g., month-end physical count, location, supervisor name..."
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>

          <div className="pt-2">
            <button type="submit" className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700">
              Create Stocktake
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
