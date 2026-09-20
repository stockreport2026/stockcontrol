import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import { RepaymentForm } from './form';

export const dynamic = 'force-dynamic';

export default async function RepaymentsPage() {
  const [branches, staff, repayments] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.staff.findMany({ orderBy: { firstName: 'asc' } }),
    prisma.repayment.findMany({
      include: { staff: true, branch: true },
      orderBy: { paymentDate: 'desc' },
      take: 50,
    }),
  ]);

  const totalRepay = repayments.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Repayments</h1>
        <p className="text-slate-500 mt-1">Customer repayments received — reduces actual sales for the staff and branch</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Records</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{repayments.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Repaid</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">KES {Number(totalRepay.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Effect on Report</p>
          <p className="text-sm text-slate-600 mt-2">Subtracted from actual sales</p>
        </div>
      </div>

      <div className="mb-6"><RepaymentForm branches={branches} staff={staff} /></div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Repayment Log ({repayments.length})</h2>
        </div>
        {repayments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No repayments recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Staff (Individual)</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Notes</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Amount (KES)</th>
              </tr>
            </thead>
            <tbody>
              {repayments.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-700">{new Date(r.paymentDate).toLocaleDateString('en-GB')}</td>
                  <td className="px-6 py-3 font-medium text-slate-900">{r.staff.firstName} {r.staff.lastName}</td>
                  <td className="px-6 py-3 text-slate-600">{r.branch.name}</td>
                  <td className="px-6 py-3 text-slate-500 text-xs">{r.notes ?? '—'}</td>
                  <td className="px-6 py-3 text-right font-medium text-emerald-600">{Number(r.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
