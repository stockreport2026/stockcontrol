import { prisma } from '@/lib/db/prisma';
import { StockPositionForm } from './stock-position-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default async function StockPositionPage() {
  const [branches, records] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.stockPosition.findMany({
      include: { branch: true },
      orderBy: { periodEndDate: 'desc' },
      take: 30,
    }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Stock Position</h1>
        <p className="text-slate-500 mt-1">
          Enter stock value before and after stocktake. The variance (loss) feeds into Recovery.
        </p>
      </div>

      <StockPositionForm branches={branches.map((b) => ({ id: b.id, label: b.name + ' (' + b.code + ')' }))} />

      <div className="mt-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Stock Positions ({records.length})</h2>
        </div>
        {records.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No stock positions recorded yet. Enter the first one above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Before Stocktake</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">After Stocktake</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Variance (Loss)</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const v = Number(r.variance);
                const isLoss = v > 0;
                const isSurplus = v < 0;
                const endD = new Date(r.periodEndDate);
                const monthLabel = MONTHS[endD.getMonth()] + ' ' + endD.getFullYear();
                return (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{monthLabel}</td>
                    <td className="px-4 py-3 text-slate-700">{r.branch.name}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{Number(r.openingStockValue).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{Number(r.closingStockValue).toLocaleString()}</td>
                    <td className={'px-4 py-3 text-right font-medium ' + (isLoss ? 'text-rose-600' : isSurplus ? 'text-emerald-600' : 'text-slate-400')}>
                      {v === 0 ? '—' : (isLoss ? '- ' : '+ ') + Math.abs(v).toLocaleString()}
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
