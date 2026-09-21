import { prisma } from '@/lib/db/prisma';
import { AttendanceForm } from './attendance-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Present',
  OFF: 'Off',
  ANNUAL_LEAVE: 'Annual Leave',
  SICK_LEAVE: 'Sick Leave',
  ABSENT: 'Absent',
  PUBLIC_HOLIDAY: 'Public Holiday',
  OTHER: 'Other',
};

const STATUS_COLORS: Record<string, string> = {
  PRESENT: 'text-green-600',
  OFF: 'text-slate-500',
  ANNUAL_LEAVE: 'text-blue-600',
  SICK_LEAVE: 'text-orange-600',
  ABSENT: 'text-red-600',
  PUBLIC_HOLIDAY: 'text-purple-600',
  OTHER: 'text-slate-600',
};

export default async function AttendancePage() {
  const [branches, staff, recent] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.staff.findMany({ orderBy: { firstName: 'asc' } }),
    prisma.attendance.findMany({
      orderBy: { attendanceDate: 'desc' },
      take: 30,
      include: { staff: true, branch: true },
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
        <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
        <p className="text-slate-500 mt-1">Track daily staff attendance</p>
      </div>

      <AttendanceForm staffByBranch={staffByBranch} branches={branchOptions} />

      <div className="mt-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Recent Records ({recent.length})</h2>
        </div>

        {recent.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No attendance records yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Staff</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Status</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Comment</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-700">
                    {new Date(r.attendanceDate).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-6 py-3 text-slate-700">
                    {r.staff.firstName} {r.staff.lastName}
                  </td>
                  <td className="px-6 py-3 text-slate-600">{r.branch.name}</td>
                  <td className={'px-6 py-3 font-medium ' + (STATUS_COLORS[r.status] || 'text-slate-600')}>
                    {STATUS_LABELS[r.status] || r.status}
                  </td>
                  <td className="px-6 py-3 text-slate-500">{r.comment || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
