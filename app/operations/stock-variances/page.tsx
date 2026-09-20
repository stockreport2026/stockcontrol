import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import Link from 'next/link';
import { VarianceForm } from './form';
import { DeleteVarianceButton } from './delete-button';

export const dynamic = 'force-dynamic';

export default async function StockVariancesPage({ searchParams }: { searchParams: { branchId?: string } }) {
  const branchId = searchParams.branchId;

  const [branches, variances] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.stockVarianceItem.findMany({
      where: branchId ? { branchId } : {},
      include: { branch: true },
      orderBy: [{ periodStartDate: 'desc' }, { varianceValue: 'desc' }],
    }),
  ]);

  const totalLoss = variances.reduce((s, v) => {
    const vv = new Decimal(v.varianceValue.toString());
    return vv.isPositive() ? s.plus(vv) : s;
  }, new Decimal(0));
  const totalSurplus = variances.reduce((s, v) => {
    const vv = new Decimal(v.varianceValue.toString());
    return vv.isNegative() ? s.plus(vv.abs()) : s;
  }, new Decimal(0));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Stock Variance Items</h1>
        <p className="text-slate-500 mt-1">Individual drugs with material variances — appear in the monthly report with explanations</p>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Records</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{variances.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Value</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">
            KES {Number(variances.reduce((s, v) => s + Math.abs(Number(v.varianceValue)), 0).toFixed(2)).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Loss</p>
          <p className="text-2xl font-bold mt-1 text-rose-600">KES {Number(totalLoss.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Surplus</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">KES {Number(totalSurplus.toFixed(2)).toLocaleString()}</p>
        </div>
      </div>

      <div className="mb-6"><VarianceForm branches={branches} /></div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Variance Records ({variances.length})</h2>
        </div>
        {variances.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No material stock variances logged yet. Use the form above to record specific drug variances.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Item</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Expected</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actual</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Variance</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Value</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Reason</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600"></th>
                </tr>
              </thead>
              <tbody>
                {variances.map((v) => {
                  const vv = Number(v.varianceValue);
                  const isLoss = vv > 0;
                  return (
                    <tr key={v.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{v.branch.name}</div>
                        <div className="text-xs text-slate-500">{v.branch.code}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {new Date(v.periodStartDate).toLocaleDateString('en-GB')} — {new Date(v.periodEndDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">{v.itemName}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{Number(v.expectedQty).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{Number(v.actualQty).toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-medium ${isLoss ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isLoss ? '−' : '+'}{Math.abs(Number(v.varianceQty)).toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-right font-semibold ${isLoss ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isLoss ? '−' : '+'}{Math.abs(vv).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-xs">
                        {v.reason ?? <span className="text-amber-600 italic">No reason — add one</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DeleteVarianceButton id={v.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
