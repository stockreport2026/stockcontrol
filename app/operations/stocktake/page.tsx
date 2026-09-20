import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import { StockPositionForm } from './form';

export const dynamic = 'force-dynamic';

export default async function StocktakePage({ searchParams }: { searchParams: { year?: string; month?: string; branchId?: string } }) {
  const now = new Date();
  const year = parseInt(searchParams.year ?? String(now.getFullYear()));
  const month = parseInt(searchParams.month ?? '8');
  const branchId = searchParams.branchId;

  const [branches, positions] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.stockPosition.findMany({
      where: { periodYear: year, periodMonth: month, ...(branchId ? { branchId } : {}) },
      include: { branch: true },
      orderBy: { branch: { name: 'asc' } },
    }),
  ]);

  const totalOpening = positions.reduce((s, p) => s.plus(p.openingStockValue.toString()), new Decimal(0));
  const totalClosing = positions.reduce((s, p) => s.plus(p.closingStockValue.toString()), new Decimal(0));
  const totalVariance = totalOpening.minus(totalClosing);

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Stocktake</h1>
        <p className="text-slate-500 mt-1">Opening and closing stock values per branch — {monthName}</p>
      </div>

      {/* Period filter */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <form method="get" className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
            <select name="branchId" defaultValue={branchId ?? ''} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white min-w-[200px]">
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Year</label>
            <select name="year" defaultValue={year} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
            <select name="month" defaultValue={month} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-slate-700 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-600">Load</button>
        </form>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Branches Filled</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{positions.length}/{branches.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Opening Stock</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {Number(totalOpening.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Closing Stock</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {Number(totalClosing.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Variance</p>
          <p className={`text-2xl font-bold mt-1 ${totalVariance.isNegative() ? 'text-emerald-600' : 'text-rose-600'}`}>
            KES {Number(totalVariance.toFixed(2)).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Entry Form */}
      <div className="mb-6"><StockPositionForm branches={branches} /></div>

      {/* List of positions */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Stock Positions ({positions.length})</h2>
        </div>
        {positions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No stock positions recorded for this period yet. Enter one above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Opening (KES)</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Closing (KES)</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Variance</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Shrink %</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Notes</th>
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
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-semibold">
              <tr>
                <td className="px-4 py-3 text-xs uppercase tracking-wider">Totals</td>
                <td className="px-4 py-3 text-right">{Number(totalOpening.toFixed(2)).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{Number(totalClosing.toFixed(2)).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{Number(totalVariance.toFixed(2)).toLocaleString()}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-medium mb-1">📋 How it works</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-blue-800">
          <li><strong>Variance = Opening − Closing</strong> (positive = stock loss, negative = surplus)</li>
          <li>The variance feeds into the report's stock loss section</li>
          <li>Stock loss is then recovered from excess sales</li>
          <li>Any remaining loss is added to the main account debt</li>
        </ul>
      </div>
    </div>
  );
}
