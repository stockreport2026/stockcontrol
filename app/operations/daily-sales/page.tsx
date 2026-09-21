import { prisma } from '@/lib/db/prisma';
import { SaleForm } from './sale-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function DailySalesPage() {
  const [branches, staff, recentSales] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.staff.findMany({ orderBy: { firstName: 'asc' } }),
    prisma.dailySale.findMany({
      orderBy: { saleDate: 'desc' },
      take: 20,
      include: { branch: true, staff: true },
    }),
  ]);

  const branchOptions = branches.map((b) => ({ id: b.id, label: b.name + ' (' + b.code + ')' }));
  const staffByBranch: Record<string, { id: string; label: string }[]> = {};
  for (const b of branches) {
    staffByBranch[b.id] = staff
      .filter((s) => s.branchId === b.id)
      .map((s) => ({ id: s.id, label: s.firstName + ' ' + s.lastName }));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Daily Sales</h1>
        <p className="text-slate-500 mt-1">Record and review daily sales entries</p>
      </div>

      <SaleForm branches={branchOptions} staffByBranch={staffByBranch} />

      <div className="mt-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Recent Sales ({recentSales.length})</h2>
        </div>

        {recentSales.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No sales records yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Staff</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Actual</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">System</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Variance</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((s) => {
                const v = Number(s.variance);
                return (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-700">{new Date(s.saleDate).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-3 text-slate-700">{s.branch.name}</td>
                    <td className="px-6 py-3 text-slate-700">{s.staff.firstName} {s.staff.lastName}</td>
                    <td className="px-6 py-3 text-right font-medium text-slate-900">{Number(s.actualSales).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{Number(s.systemSales).toLocaleString()}</td>
                    <td className={'px-6 py-3 text-right font-medium ' + (v >= 0 ? 'text-green-600' : 'text-red-600')}>
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
