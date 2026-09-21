import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import { StaffSalesForm } from './staff-sales-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default async function StaffSalesPage() {
  const [branches, staff, records] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.staff.findMany({ orderBy: { firstName: 'asc' } }),
    prisma.staffSales.findMany({
      include: { branch: true, staff: true },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { staff: { firstName: 'asc' } }],
      take: 50,
    }),
  ]);

  const staffByBranch: Record<string, { id: string; label: string }[]> = {};
  for (const b of branches) {
    staffByBranch[b.id] = staff
      .filter((s) => s.branchId === b.id)
      .map((s) => ({ id: s.id, label: s.firstName + ' ' + s.lastName }));
  }

  // Group by period for the summary
  const totalsByPeriod = records.reduce((acc, r) => {
    const key = r.periodYear + '-' + r.periodMonth;
    if (!acc[key]) {
      acc[key] = {
        year: r.periodYear,
        month: r.periodMonth,
        actual: new Decimal(0),
        system: new Decimal(0),
        count: 0,
      };
    }
    acc[key].actual = acc[key].actual.plus(r.actualSales.toString());
    acc[key].system = acc[key].system.plus(r.systemSales.toString());
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { year: number; month: number; actual: Decimal; system: Decimal; count: number }>);

  const periodSummaries = Object.values(totalsByPeriod).sort((a, b) =>
    b.year - a.year || b.month - a.month
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Individual Staff Sales</h1>
        <p className="text-slate-500 mt-1">
          Enter each staff member's total sales for a reporting period
        </p>
      </div>

      <StaffSalesForm
        branches={branches.map((b) => ({ id: b.id, label: b.name + ' (' + b.code + ')' }))}
        staffByBranch={staffByBranch}
      />

      {periodSummaries.length > 0 && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {periodSummaries.slice(0, 3).map((p) => {
            const variance = p.actual.minus(p.system);
            return (
              <div key={p.year + '-' + p.month} className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  {MONTHS[p.month - 1]} {p.year}
                </p>
                <p className="text-2xl font-bold mt-1 text-slate-900">
                  KES {Number(p.actual.toFixed(2)).toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {p.count} staff · system KES {Number(p.system.toFixed(2)).toLocaleString()}
                </p>
                <p className={'text-sm font-medium mt-2 ' + (variance.isNegative() ? 'text-rose-600' : 'text-emerald-600')}>
                  Variance: {variance.isNegative() ? '' : '+'}{Number(variance.toFixed(2)).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">All Staff Sales Records ({records.length})</h2>
        </div>
        {records.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No staff sales recorded yet. Enter the first one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Staff</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">From → To</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Actual</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">System</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Variance</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => {
                  const v = Number(r.variance);
                  return (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {MONTHS[r.periodMonth - 1]} {r.periodYear}
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {r.staff.firstName} {r.staff.lastName}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{r.branch.name}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(r.periodStartDate).toLocaleDateString('en-GB')} → {new Date(r.periodEndDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {Number(r.actualSales).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {Number(r.systemSales).toLocaleString()}
                      </td>
                      <td className={'px-4 py-3 text-right font-medium ' + (v >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        {v >= 0 ? '+' : ''}{v.toLocaleString()}
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
