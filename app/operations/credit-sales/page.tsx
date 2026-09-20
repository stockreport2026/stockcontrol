import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import { CreditForm } from './form';

export const dynamic = 'force-dynamic';

export default async function CreditSalesPage() {
  const [branches, staff, creditSales] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.staff.findMany({ orderBy: { firstName: 'asc' } }),
    prisma.creditSale.findMany({
      include: { staff: true, branch: true },
      orderBy: { saleDate: 'desc' },
      take: 50,
    }),
  ]);

  const totalCredit = creditSales.reduce((s, c) => s.plus(c.amount.toString()), new Decimal(0));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Credit Sales</h1>
        <p className="text-slate-500 mt-1">Credit given to customers — reduces system sales for the staff and branch</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Credit Records</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{creditSales.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Credit Value</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">KES {Number(totalCredit.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Effect on Report</p>
          <p className="text-sm text-slate-600 mt-2">Subtracted from system sales</p>
        </div>
      </div>

      <div className="mb-6"><CreditForm branches={branches} staff={staff} /></div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Credit Sales Log ({creditSales.length})</h2>
        </div>
        {creditSales.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No credit sales recorded yet. Add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Customer</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Staff</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Amount (KES)</th>
              </tr>
            </thead>
            <tbody>
              {creditSales.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-700">{new Date(c.saleDate).toLocaleDateString('en-GB')}</td>
                  <td className="px-6 py-3 font-medium text-slate-900">{c.customerName}</td>
                  <td className="px-6 py-3 text-slate-700">{c.staff.firstName} {c.staff.lastName}</td>
                  <td className="px-6 py-3 text-slate-600">{c.branch.name}</td>
                  <td className="px-6 py-3 text-right font-medium text-amber-600">{Number(c.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
