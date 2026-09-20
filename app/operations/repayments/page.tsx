import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import { RepaymentForm } from './form';

export const dynamic = 'force-dynamic';

export default async function RepaymentsPage() {
  const [customers, branches, repayments] = await Promise.all([
    prisma.customer.findMany({ orderBy: { name: 'asc' } }),
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.repayment.findMany({ include: { customer: true, branch: true }, orderBy: { paymentDate: 'desc' }, take: 30 }),
  ]);

  const totalRepay = repayments.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Repayments</h1>
        <p className="text-slate-500 mt-1">Record customer repayments against credit sales</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Customers</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{customers.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Repayments Logged</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{repayments.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Recent Repayments (KES)</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">{Number(totalRepay.toFixed(2)).toLocaleString()}</p>
        </div>
      </div>

      <div className="mb-6"><RepaymentForm customers={customers} branches={branches} /></div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-900">Recent Repayments ({repayments.length})</h2></div>
        {repayments.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No repayments recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Receipt</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Customer</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Method</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Amount (KES)</th>
              </tr>
            </thead>
            <tbody>
              {repayments.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3 text-slate-700">{new Date(r.paymentDate).toLocaleDateString('en-GB')}</td>
                  <td className="px-6 py-3 text-slate-600 font-mono text-xs">{r.receiptRef}</td>
                  <td className="px-6 py-3 text-slate-900 font-medium">{r.customer.name}</td>
                  <td className="px-6 py-3 text-slate-600">{r.branch.name}</td>
                  <td className="px-6 py-3 text-slate-600">{r.paymentMethod}</td>
                  <td className="px-6 py-3 text-right text-emerald-600 font-medium">{Number(r.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
