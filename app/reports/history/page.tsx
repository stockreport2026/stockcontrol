import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function ReportHistoryPage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  const accountBalances = await prisma.accountBalance.findMany({
    include: { branch: true },
    orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Report History</h1>
        <p className="text-slate-500 mt-1">All historical reports available for regeneration</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Branch Reports ({accountBalances.length})</h2>
        </div>
        {accountBalances.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No reports generated yet. Go to Reports → Monthly to generate one.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Period</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Range</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Opening Balance</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600"></th>
              </tr>
            </thead>
            <tbody>
              {accountBalances.map((ab) => {
                const monthName = new Date(ab.periodYear, ab.periodMonth - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
                return (
                  <tr key={ab.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-900">{ab.branch.name}</td>
                    <td className="px-6 py-3 text-slate-700">{monthName}</td>
                    <td className="px-6 py-3 text-slate-500 text-xs">
                      {new Date(ab.periodStartDate).toLocaleDateString('en-GB')} — {new Date(ab.periodEndDate).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-6 py-3 text-right text-slate-700">KES {Number(ab.openingBalance).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        href={`/reports/monthly/view?branchId=${ab.branchId}&year=${ab.periodYear}&month=${ab.periodMonth}`}
                        className="text-slate-900 hover:text-slate-600 font-medium text-xs"
                      >
                        View Report →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-6">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Consolidated Company Reports</h3>
        <p className="text-sm text-slate-600 mb-3">Generate a company-wide report covering all {branches.length} branches:</p>
        <Link href="/reports/monthly" className="inline-block bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700">
          Generate Consolidated Report →
        </Link>
      </div>
    </div>
  );
}
