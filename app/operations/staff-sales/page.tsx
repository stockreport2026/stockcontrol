import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function StaffSalesPage() {
  const staff = await prisma.staff.findMany({
    include: { branch: true, dailySales: true },
    orderBy: { firstName: 'asc' },
  });

  const rows = staff.map((s) => {
    const actual = s.dailySales.reduce((sum, d) => sum.plus(d.actualSales.toString()), new Decimal(0));
    const system = s.dailySales.reduce((sum, d) => sum.plus(d.systemSales.toString()), new Decimal(0));
    const variance = actual.minus(system);
    const variancePct = system.isZero() ? new Decimal(0) : variance.dividedBy(system).times(100);
    const sellingDays = s.dailySales.length;
    const avgDaily = sellingDays === 0 ? new Decimal(0) : actual.dividedBy(sellingDays);
    const positiveDays = s.dailySales.filter((d) => Number(d.variance) > 0).length;
    const negativeDays = s.dailySales.filter((d) => Number(d.variance) < 0).length;

    return {
      id: s.id,
      name: `${s.firstName} ${s.lastName}`,
      employeeCode: s.employeeCode,
      branch: s.branch.name,
      actual: actual.toFixed(2),
      system: system.toFixed(2),
      variance: variance.toFixed(2),
      variancePct: variancePct.toFixed(2),
      sellingDays,
      avgDaily: avgDaily.toFixed(2),
      positiveDays,
      negativeDays,
    };
  });

  const grandActual = rows.reduce((sum, r) => sum.plus(r.actual), new Decimal(0));
  const grandSystem = rows.reduce((sum, r) => sum.plus(r.system), new Decimal(0));
  const grandVariance = grandActual.minus(grandSystem);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Staff Sales Reconciliation</h1>
        <p className="text-slate-500 mt-1">Per-staff sales performance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Actual</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">
            KES {Number(grandActual.toFixed(2)).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total System</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">
            KES {Number(grandSystem.toFixed(2)).toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Variance</p>
          <p className={`text-2xl font-bold mt-1 ${grandVariance.isNegative() ? 'text-red-600' : 'text-green-600'}`}>
            KES {Number(grandVariance.toFixed(2)).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Staff Performance ({rows.length} staff)</h2>
        </div>

        {rows.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No staff records yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Staff</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actual</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">System</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Variance</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Var %</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Days</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Avg/Day</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">+/-</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const v = parseFloat(r.variance);
                  return (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.name}</div>
                        <div className="text-xs text-slate-500">{r.employeeCode}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.branch}</td>
                      <td className="px-4 py-3 text-right text-slate-900 font-medium">
                        {Number(r.actual).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {Number(r.system).toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${v >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {v >= 0 ? '+' : ''}{Number(r.variance).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.variancePct}%</td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.sellingDays}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{Number(r.avgDaily).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-xs">
                        <span className="text-green-600 font-medium">{r.positiveDays}+</span>
                        {' / '}
                        <span className="text-red-600 font-medium">{r.negativeDays}-</span>
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
