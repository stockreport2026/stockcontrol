import { prisma } from '@/lib/db/prisma';
import { StaffForm } from './staff-form';
import { DeleteStaffButton } from './delete-button';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function StaffPage() {
  const [branches, staff] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.staff.findMany({
      include: { branch: true },
      orderBy: [{ branch: { name: 'asc' } }, { firstName: 'asc' }],
    }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Staff</h1>
        <p className="text-slate-500 mt-1">Add staff members to each branch</p>
      </div>
      <StaffForm branches={branches.map((b) => ({ id: b.id, label: b.name + ' (' + b.code + ')' }))} />
      <div className="mt-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">All Staff ({staff.length})</h2>
        </div>
        {staff.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No staff yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Name</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{s.firstName} {s.lastName}</td>
                  <td className="px-6 py-3 text-slate-600">{s.branch.name}</td>
                  <td className="px-6 py-3 text-right">
                    <DeleteStaffButton id={s.id} name={s.firstName + ' ' + s.lastName} />
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
