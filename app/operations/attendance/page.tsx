import { prisma } from '@/lib/db/prisma';
import { AttendanceGrid } from './form';

export const dynamic = 'force-dynamic';

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string; branchId?: string };
}) {
  const now = new Date();
  const year = parseInt(searchParams.year ?? String(now.getFullYear()));
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1));
  const branchId = searchParams.branchId;

  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });

  const staff = await prisma.staff.findMany({
    where: branchId ? { branchId } : {},
    include: { branch: true },
    orderBy: [{ branch: { name: 'asc' } }, { firstName: 'asc' }],
  });

  const daysInMonth = new Date(year, month, 0).getDate();

  // Load existing attendance
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);
  const existing = await prisma.attendance.findMany({
    where: { attendanceDate: { gte: startDate, lte: endDate } },
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Attendance</h1>
        <p className="text-slate-500 mt-1">Track daily staff attendance</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 flex gap-4 items-end">
        <form method="get" className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
            <select name="branchId" defaultValue={branchId ?? ''} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white min-w-[200px]">
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Year</label>
            <select name="year" defaultValue={year} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
            <select name="month" defaultValue={month} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-slate-700 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-600">Load</button>
        </form>
        <p className="text-xs text-slate-500 ml-auto">{staff.length} staff · {daysInMonth} days · {existing.length} existing records</p>
      </div>

      <AttendanceGrid
        staff={staff.map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`, employeeCode: s.employeeCode, branchName: s.branch.name }))}
        daysInMonth={daysInMonth}
        year={year}
        month={month}
      />
    </div>
  );
}
