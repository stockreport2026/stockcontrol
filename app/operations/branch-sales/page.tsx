import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export default async function BranchSalesPage() {
  const branches = await prisma.branch.findMany({
    include: {
      dailySales: true,
      staff: true,
    },
    orderBy: { name: 'asc' },
  });

  const rows = branches.map((b) => {
    const actual = b.dailySales.reduce(
      (sum, d) => sum.plus(d.actualSales.toString()),
      new Decimal(0)
    );
    const system = b.dailySales.reduce(
      (sum, d) => sum.plus(d.systemSales.toString()),
      new Decimal(0)
    );
    const variance = actual.minus(system);
    const variancePct = system.isZero() ? new Decimal(0) : variance.dividedBy(system).times(100);

    // Sum of staff totals within this branch
    const staffActual = b.staff.reduce((sum, s) => {
      const staffSales = b.dailySales.filter((d) => d.staffId === s.id);
      return staffSales.reduce(
        (inner, d) => inner.plus(d.actualSales.toString()),
        sum
      );
    }, new Decimal(0));

    const mismatch = actual.minus(staffActual);

    return {
      id: b.id,
      name: b.name,
      code: b.code,
      location: b.location ?? '—',
      staffCount: b.staff.length,
      records: b.dailySales.length,
      actual: actual.toFixed(2),
      system: system.toFixed(2),
      variance: variance.toFixed(2),
      variancePct: variancePct.toFixed(2),
      staffActual: staffActual.toFixed(2),
      mismatch: mismatch.toFixed(2),
    };
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Branch Sales Reconciliation</h1>
        <p className="text-slate-500 mt-1">
          Branch totals reconciled against sum of staff totals
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Branches ({rows.length})
          </h2>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No branches yet.</div>
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
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Var %</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Recon Check</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const v = parseFloat(r.variance);
                  const mismatch = parseFloat(r.mismatch);
                  const ok = Math.abs(mismatch) < 0.01;
                  return (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.name}</div>
                        <div className="text-xs text-slate-500">{r.code} · {r.location}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.staffCount}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.records}</td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {Number(r.actual).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {Number(r.system).toLocaleString()}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${
                          v >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {v >= 0 ? '+' : ''}
                        {Number(r.variance).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.variancePct}%</td>
                      <td className="px-4 py-3 text-right">
                        {ok ? (
                          <span className="text-green-600 font-medium text-xs">✓ Matched</span>
                        ) : (
                          <span className="text-red-600 font-medium text-xs">
                            ✗ Diff {Number(r.mismatch).toLocaleString()}
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
