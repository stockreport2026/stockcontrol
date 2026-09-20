import { prisma } from '@/lib/db/prisma';
import { AttendanceForm } from './form';

export const dynamic = 'force-dynamic';

export default async function AttendancePage() {
  const [branches, staff, attendances] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.staff.findMany({ orderBy: { firstName: 'asc' } }),
    prisma.attendance.findMany({
      include: { staff: true, branch: true },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      take: 100,
    }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
        <p className="text-slate-500 mt-1">Record days worked and leave days per staff, per period</p>
      </div>

      <div className="mb-6"><AttendanceForm branches={branches} staff={staff} /></div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Attendance Records ({attendances.length})</h2>
        </div>
        {attendances.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No attendance records yet. Add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Staff</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Period</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Days Worked</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Leave Days</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Total Days</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Comment</th>
              </tr>
            </thead>
            <tbody>
              {attendances.map((a) => (
                <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{a.staff.firstName} {a.staff.lastName}</td>
                  <td className="px-6 py-3 text-slate-600">{a.branch.name}</td>
                  <td className="px-6 py-3 text-slate-700">
                    {new Date(a.periodYear, a.periodMonth - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-3 text-right text-emerald-600 font-medium">{a.daysWorked}</td>
                  <td className="px-6 py-3 text-right text-amber-600 font-medium">{a.leaveDays}</td>
                  <td className="px-6 py-3 text-right text-slate-900 font-bold">{a.daysWorked + a.leaveDays}</td>
                  <td className="px-6 py-3 text-slate-500 text-xs">{a.comment ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
