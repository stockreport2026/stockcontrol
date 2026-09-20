import { prisma } from '@/lib/db/prisma';
import { StaffForm } from './staff-form';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const [branches, staff] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.staff.findMany({
      include: { branch: true },
      orderBy: [{ branch: { name: 'asc' } }, { firstName: 'asc' }],
    }),
  ]);

  const branchesWithCount = branches.map((b) => ({
    ...b,
    staffCount: staff.filter((s) => s.branchId === b.id).length,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Staff Management</h1>
        <p className="text-slate-500 mt-1">Add and manage staff, assigned per branch</p>
      </div>

      <div className="mb-6">
        <StaffForm branches={branches.map((b) => ({ id: b.id, label: `${b.name} (${b.code})` }))} />
      </div>

      {/* Branch summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {branchesWithCount.map((b) => (
          <div key={b.id} className="bg-white rounded-lg border border-slate-200 p-3 shadow-sm">
            <p className="text-xs text-slate-500 font-medium truncate">{b.name}</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{b.staffCount}</p>
            <p className="text-[10px] text-slate-400">staff</p>
          </div>
        ))}
      </div>

      {/* Staff table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">All Staff ({staff.length})</h2>
          {staff.length === 0 && (
            <p className="text-xs text-amber-600 font-medium">No staff yet — add them above</p>
          )}
        </div>

        {staff.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-slate-500 mb-2">No staff members have been added yet.</p>
            <p className="text-xs text-slate-400">Use the form above to add staff to branches.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Name</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Employee Code</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-left px-6 py-3 font-medium text-slate-600">Location</th>
                  <th className="text-right px-6 py-3 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{s.firstName} {s.lastName}</td>
                    <td className="px-6 py-3 text-slate-600 font-mono text-xs">{s.employeeCode}</td>
                    <td className="px-6 py-3 text-slate-700">{s.branch.name}</td>
                    <td className="px-6 py-3 text-slate-500 text-xs">{s.branch.location ?? '—'}</td>
                    <td className="px-6 py-3 text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${s.isActive ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-600'}`}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
