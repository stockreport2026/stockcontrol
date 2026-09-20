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
  const totalSystem = variances.reduce((s, v) => {
    return s.plus(new Decimal(v.expectedQty.toString()).times(v.unitCost.toString()));
  }, new Decimal(0));
  const totalActual = variances.reduce((s, v) => {
    return s.plus(new Decimal(v.actualQty.toString()).times(v.unitCost.toString()));
  }, new Decimal(0));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Stock Variances</h1>
        <p className="text-slate-500 mt-1">Drug-by-drug system vs actual comparison — feeds the report</p>
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
          <Link href="/operations/stock-variances" className="text-sm text-slate-500 hover:text-slate-900 self-center">Clear</Link>
        </form>
      </div>

      <div className="grid grid-cols-5 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Items Entered</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{variances.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">System Value</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {Number(totalSystem.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Actual Value</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {Number(totalActual.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Stock Loss</p>
          <p className="text-2xl font-bold mt-1 text-rose-600">KES {Number(totalLoss.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Stock Surplus</p>
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
            No stock variances entered yet. Use the form above to add a drug with its system vs actual stock.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Drug</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">System</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actual</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Variance Qty</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Unit Cost</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Variance Value</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Reason</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600"></th>
                </tr>
              </thead>
              <tbody>
                {variances.map((v) => {
                  const vv = Number(v.varianceValue);
                  const isLoss = vv > 0.001;
                  const isSurplus = vv < -0.001;
                  const isZero = !isLoss && !isSurplus;
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
                      <td className={`px-4 py-3 text-right font-medium ${isLoss ? 'text-rose-600' : isSurplus ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {isZero ? '0' : isLoss ? `−${Math.abs(Number(v.varianceQty)).toLocaleString()}` : `+${Math.abs(Number(v.varianceQty)).toLocaleString()}`}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{Number(v.unitCost).toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${isLoss ? 'text-rose-600' : isSurplus ? 'text-emerald-600' : 'text-slate-500'}`}>
                        {isZero ? 'KES 0' : isLoss ? `KES ${Math.abs(vv).toLocaleString()}` : `KES (${Math.abs(vv).toLocaleString()})`}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-xs max-w-xs">
                        {v.reason ?? <span className="text-amber-600 italic">No reason</span>}
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

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-medium mb-1">📋 How it works</p>
        <ul className="list-disc list-inside space-y-1 text-xs text-blue-800">
          <li><strong>System stock</strong> = what the system says should be there</li>
          <li><strong>Actual stock</strong> = what was physically counted</li>
          <li><strong>Variance = System − Actual</strong></li>
          <li>If <strong>System &gt; Actual</strong> → this is a <strong>LOSS</strong> (shown in red)</li>
          <li>If <strong>Actual &gt; System</strong> → this is a <strong>SURPLUS</strong> (shown in green in parentheses)</li>
          <li>If <strong>System = Actual</strong> → <strong>no variance</strong></li>
          <li>Stock loss feeds the recovery engine — excess sales recover it, remaining loss becomes main account debt</li>
        </ul>
      </div>
    </div>
  );
}
