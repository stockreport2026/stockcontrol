import { prisma } from '@/lib/db/prisma';
import { BranchForm } from './branch-form';

export const dynamic = 'force-dynamic';

export default async function BranchesPage() {
  const branches = await prisma.branch.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { staff: true, dailySales: true, stocktakes: true } } },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Branches</h1>
        <p className="text-slate-500 mt-1">Manage company branches — {branches.length} total</p>
      </div>

      <div className="mb-6"><BranchForm /></div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">All Branches ({branches.length})</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Code</th>
              <th className="text-left px-6 py-3 font-medium text-slate-600">Location</th>
              <th className="text-right px-6 py-3 font-medium text-slate-600">Staff</th>
              <th className="text-right px-6 py-3 font-medium text-slate-600">Sales Records</th>
              <th className="text-right px-6 py-3 font-medium text-slate-600">Stocktakes</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-900">{b.name}</td>
                <td className="px-6 py-3 text-slate-600 font-mono text-xs">{b.code}</td>
                <td className="px-6 py-3 text-slate-500">{b.location ?? '—'}</td>
                <td className="px-6 py-3 text-right text-slate-700">{b._count.staff}</td>
                <td className="px-6 py-3 text-right text-slate-700">{b._count.dailySales}</td>
                <td className="px-6 py-3 text-right text-slate-700">{b._count.stocktakes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
