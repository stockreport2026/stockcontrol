import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default async function SalesReconciliationPage() {
  const branches = await prisma.branch.findMany({
    include: {
      dailySales: true,
      staff: true,
    },
    orderBy: { name: 'asc' },
  });

  const branchRows = branches.map((b) => {
    const actual = b.dailySales.reduce((s, d) => s.plus(d.actualSales.toString()), new Decimal(0));
    const system = b.dailySales.reduce((s, d) => s.plus(d.systemSales.toString()), new Decimal(0));
    const variance = actual.minus(system);

    const staffSum = b.staff.reduce((sum, s) => {
      const staffSales = b.dailySales.filter((d) => d.staffId === s.id);
      return staffSales.reduce((inner, d) => inner.plus(d.actualSales.toString()), sum);
    }, new Decimal(0));

    const mismatch = actual.minus(staffSum);
    const ok = mismatch.abs().lessThan(0.01);

    return {
      id: b.id,
      name: b.name,
      code: b.code,
      staffCount: b.staff.length,
      recordCount: b.dailySales.length,
      actual: actual.toFixed(2),
      system: system.toFixed(2),
      variance: variance.toFixed(2),
      mismatch: mismatch.toFixed(2),
      ok,
    };
  });

  const grandActual = branchRows.reduce((s, r) => s.plus(r.actual), new Decimal(0));
  const grandSystem = branchRows.reduce((s, r) => s.plus(r.system), new Decimal(0));
  const grandVariance = grandActual.minus(grandSystem);
  const allOk = branchRows.every((r) => r.ok);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Sales Reconciliation</h1>
        <p className="text-slate-500 mt-1">
          Branch totals cross-checked against sum of individual staff totals
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Total Actual</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {fmt(grandActual.toFixed(2))}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Total System</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {fmt(grandSystem.toFixed(2))}</p>
        </div>
        <div className={'rounded-lg border p-5 shadow-sm ' + (grandVariance.isNegative() ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100')}>
          <p className={'text-xs uppercase tracking-wider font-semibold ' + (grandVariance.isNegative() ? 'text-rose-700' : 'text-emerald-700')}>
            Net Variance
          </p>
          <p className={'text-2xl font-bold mt-1 ' + (grandVariance.isNegative() ? 'text-rose-700' : 'text-emerald-700')}>
            KES {fmt(grandVariance.toFixed(2))}
          </p>
        </div>
      </div>

      <div className={'mb-6 rounded-lg border p-4 ' + (allOk ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200')}>
        <p className={'text-sm font-medium ' + (allOk ? 'text-emerald-800' : 'text-amber-800')}>
          {allOk
            ? '✓ All branches reconcile correctly with their staff totals'
            : '⚠ Some branches have a mismatch between branch total and sum of staff totals'}
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Branch Reconciliation ({branchRows.length})</h2>
        </div>

        {branchRows.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No branches yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Staff</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Records</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actual</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">System</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Variance</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Check</th>
                </tr>
              </thead>
              <tbody>
                {branchRows.map((r) => {
                  const v = parseFloat(r.variance);
                  return (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.name}</div>
                        <div className="text-xs text-slate-500">{r.code}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.staffCount}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.recordCount}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">{fmt(r.actual)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{fmt(r.system)}</td>
                      <td className={'px-4 py-3 text-right font-medium ' + (v >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        {v >= 0 ? '+' : ''}{fmt(r.variance)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.ok ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            ✓ Matched
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                            Diff {fmt(r.mismatch)}
                          </span>
                        )}
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
