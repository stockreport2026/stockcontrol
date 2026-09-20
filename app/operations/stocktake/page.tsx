import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import Link from 'next/link';
import { StockPositionForm } from './form';
import { DeleteButton } from './delete-button';

export const dynamic = 'force-dynamic';

export default async function StocktakePage({ searchParams }: { searchParams: { branchId?: string } }) {
  const branchId = searchParams.branchId;

  const [branches, positions] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.stockPosition.findMany({
      where: branchId ? { branchId } : {},
      include: { branch: true },
      orderBy: [{ periodStartDate: 'desc' }, { branch: { name: 'asc' } }],
    }),
  ]);

  const totalOpening = positions.reduce((s, p) => s.plus(p.openingStockValue.toString()), new Decimal(0));
  const totalClosing = positions.reduce((s, p) => s.plus(p.closingStockValue.toString()), new Decimal(0));
  const totalVariance = totalOpening.minus(totalClosing);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Stock Position</h1>
        <p className="text-slate-500 mt-1">Opening and closing stock values per branch per period</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <form method="get" className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
            <select name="branchId" defaultValue={branchId ?? ''} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white min-w-[200px]">
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <button type="submit" className="bg-slate-700 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-600">Filter</button>
          <Link href="/operations/stocktake" className="text-sm text-slate-500 hover:text-slate-900 self-center">Clear</Link>
        </form>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Records</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{positions.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Opening</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {Number(totalOpening.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Closing</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {Number(totalClosing.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Variance</p>
          <p className={`text-2xl font-bold mt-1 ${totalVariance.isNegative() ? 'text-emerald-600' : 'text-rose-600'}`}>
            KES {Number(totalVariance.toFixed(2)).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-6"><StockPositionForm branches={branches} /></div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Stock Positions ({positions.length})</h2>
        </div>
        {positions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No stock positions recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Opening</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Closing</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Variance</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Shrink %</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Notes</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const v = Number(p.variance);
                const op = Number(p.openingStockValue);
                const shrink = op === 0 ? 0 : (v / op) * 100;
                return (
                  <tr key={p.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{p.branch.name}</div>
                      <div className="text-xs text-slate-500">{p.branch.code}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {new Date(p.periodStartDate).toLocaleDateString('en-GB')} — {new Date(p.periodEndDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">{op.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{Number(p.closingStockValue).toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${v > 0 ? 'text-rose-600' : v < 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                      {v > 0 ? '−' : v < 0 ? '+' : ''}{Math.abs(v).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${shrink > 5 ? 'bg-rose-100 text-rose-700' : shrink > 2 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {shrink.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs truncate" title={p.notes ?? ''}>{p.notes ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <DeleteButton id={p.id} />
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
