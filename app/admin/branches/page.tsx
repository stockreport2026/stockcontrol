import { prisma } from '@/lib/db/prisma';
import { BranchForm } from './branch-form';
import { DeleteBranchButton } from './delete-button';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function BranchesAdminPage() {
  const branches = await prisma.branch.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { staff: true, dailySales: true, stocktakes: true } },
    },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Branches</h1>
        <p className="text-slate-500 mt-1">Manage company branches</p>
      </div>

      <BranchForm />

      <div className="mt-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            All Branches ({branches.length})
          </h2>
        </div>

        {branches.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No branches yet. Add your first branch above.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Location</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Staff</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Sales</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="font-medium text-slate-900">{b.name}</div>
                    <div className="text-xs text-slate-500">{b.code}</div>
                  </td>
                  <td className="px-6 py-3 text-slate-600">{b.location ?? '—'}</td>
                  <td className="px-6 py-3 text-right text-slate-600">{b._count.staff}</td>
                  <td className="px-6 py-3 text-right text-slate-600">{b._count.dailySales}</td>
                  <td className="px-6 py-3 text-right">
                    <DeleteBranchButton id={b.id} name={b.name} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
