import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import { SalesForm } from './form';

export const dynamic = 'force-dynamic';

export default async function SalesPage({ searchParams }: { searchParams: { year?: string; month?: string; branchId?: string } }) {
  const now = new Date();
  const year = parseInt(searchParams.year ?? String(now.getFullYear()));
  const month = parseInt(searchParams.month ?? (now.getMonth() === 0 ? '12' : String(now.getMonth())));
  const branchId = searchParams.branchId;

  const [branches, staff] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.staff.findMany({ orderBy: { firstName: 'asc' } }),
  ]);

  const sales = await prisma.staffSales.findMany({
    where: { periodYear: year, periodMonth: month, ...(branchId ? { branchId } : {}) },
    include: { staff: true, branch: true },
    orderBy: [{ branch: { name: 'asc' } }, { staff: { firstName: 'asc' } }],
  });

  const totalActual = sales.reduce((s, x) => s.plus(x.actualSales.toString()), new Decimal(0));
  const totalSystem = sales.reduce((s, x) => s.plus(x.systemSales.toString()), new Decimal(0));
  const totalVariance = totalActual.minus(totalSystem);

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Sales Entry</h1>
        <p className="text-slate-500 mt-1">Total sales per staff for {monthName}</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
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
      </div>

      <div className="grid grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Staff Records</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{sales.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Actual</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {Number(totalActual.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total System</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {Number(totalSystem.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Variance</p>
          <p className={`text-2xl font-bold mt-1 ${totalVariance.isNegative() ? 'text-red-600' : 'text-green-600'}`}>
            KES {Number(totalVariance.toFixed(2)).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-6"><SalesForm branches={branches} staff={staff} /></div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Sales Records ({sales.length})</h2>
        </div>
        {sales.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No sales entered for this period yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Staff</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Actual (KES)</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">System (KES)</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Variance</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => {
                const v = Number(s.variance);
                return (
                  <tr key={s.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-700">{s.branch.name}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{s.staff.firstName} {s.staff.lastName}</td>
                    <td className="px-6 py-3 text-right text-slate-900 font-medium">{Number(s.actualSales).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-slate-600">{Number(s.systemSales).toLocaleString()}</td>
                    <td className={`px-6 py-3 text-right font-medium ${v >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
