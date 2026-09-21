import { prisma } from '@/lib/db/prisma';
import { BranchSalesForm } from './branch-sales-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default async function BranchSalesPage() {
  const [branches, records] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.branchSales.findMany({
      include: { branch: true },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      take: 30,
    }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Branch Sales</h1>
        <p className="text-slate-500 mt-1">
          Enter total branch sales for a reporting period (separate from staff sales)
        </p>
      </div>

      <BranchSalesForm branches={branches.map((b) => ({ id: b.id, label: b.name + ' (' + b.code + ')' }))} />

      <div className="mt-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Branch Sales Records ({records.length})</h2>
        </div>
        {records.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No branch sales yet. Enter the first one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
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
                    <td className="px-4 py-3 text-slate-700">{r.branch.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {new Date(r.periodStartDate).toLocaleDateString('en-GB')} → {new Date(r.periodEndDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{Number(r.actualSales).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{Number(r.systemSales).toLocaleString()}</td>
                    <td className={'px-4 py-3 text-right font-medium ' + (v >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                      {v >= 0 ? '+' : ''}{v.toLocaleString()}
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
