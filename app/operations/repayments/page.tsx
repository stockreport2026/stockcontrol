import { prisma } from '@/lib/db/prisma';
import { RepaymentForm } from './repayment-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function RepaymentsPage() {
  const [branches, customers, staff, recent] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.customer.findMany({ orderBy: { name: 'asc' } }),
    prisma.staff.findMany({ orderBy: { firstName: 'asc' } }),
    prisma.repayment.findMany({
      orderBy: { paymentDate: 'desc' },
      take: 30,
      include: { customer: true, branch: true, staff: true },
    }),
  ]);

  const branchOptions = branches.map((b) => ({ id: b.id, label: b.name + ' (' + b.code + ')' }));

  const customersByBranch: Record<string, { id: string; label: string }[]> = {};
  const staffByBranch: Record<string, { id: string; label: string }[]> = {};
  for (const b of branches) {
    customersByBranch[b.id] = customers
      .filter((c) => c.branchId === b.id)
      .map((c) => ({ id: c.id, label: c.name }));
    staffByBranch[b.id] = staff
      .filter((s) => s.branchId === b.id)
      .map((s) => ({ id: s.id, label: s.firstName + ' ' + s.lastName }));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Repayments</h1>
        <p className="text-slate-500 mt-1">Record customer repayments</p>
      </div>

      <RepaymentForm
        customersByBranch={customersByBranch}
        staffByBranch={staffByBranch}
        branches={branchOptions}
      />

      <div className="mt-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Recent Repayments ({recent.length})</h2>
        </div>

        {recent.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No repayments recorded yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Receipt</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Customer</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Method</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Amount</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(r.paymentDate).toLocaleDateString('en-GB')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-700">{r.receiptRef}</td>
                  <td className="px-4 py-3 text-slate-900 font-medium">{r.customer.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.branch.name}</td>
                  <td className="px-4 py-3 text-slate-600">{r.paymentMethod}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">
                    +{Number(r.amount).toLocaleString()}
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
