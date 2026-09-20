import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export default async function MonthlyReportsPage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Monthly Reports</h1>
        <p className="text-slate-500 mt-1">
          Generate a complete financial and stock-control report for a branch and period
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 max-w-xl">
        <form action="/reports/monthly/view" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Branch</label>
            <select name="branchId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
              <select name="year" defaultValue={defaultYear} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
                <option value="2024">2024</option>
                <option value="2025">2025</option>
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
              <select name="month" defaultValue={defaultMonth} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
                <option value="1">January</option>
                <option value="2">February</option>
                <option value="3">March</option>
                <option value="4">April</option>
                <option value="5">May</option>
                <option value="6">June</option>
                <option value="7">July</option>
                <option value="8">August</option>
                <option value="9">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
            </div>
          </div>
          <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-slate-700">
            Generate Report →
          </button>
        </form>
      </div>
    </div>
  );
}
