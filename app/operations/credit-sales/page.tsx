import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import { CreditForms } from './forms';

export const dynamic = 'force-dynamic';

export default async function CreditSalesPage() {
  const [customers, branches, creditSales] = await Promise.all([
    prisma.customer.findMany({ include: { branch: true }, orderBy: { name: 'asc' } }),
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.creditSale.findMany({ include: { customer: true, branch: true }, orderBy: { saleDate: 'desc' }, take: 30 }),
  ]);

  const customersFormatted = customers.map((c) => ({ id: c.id, name: c.name, branchName: c.branch.name }));

  // Outstanding per customer
  const allCredit = await prisma.creditSale.groupBy({ by: ['customerId'], _sum: { amount: true } });
  const allRepay = await prisma.repayment.groupBy({ by: ['customerId'], _sum: { amount: true } });
  const outstandingMap = new Map<string, Decimal>();
  for (const c of allCredit) outstandingMap.set(c.customerId, new Decimal(c._sum.amount?.toString() ?? '0'));
  for (const r of allRepay) {
    const cur = outstandingMap.get(r.customerId) ?? new Decimal(0);
    outstandingMap.set(r.customerId, cur.minus(r._sum.amount?.toString() ?? '0'));
  }

  const totalCredit = creditSales.reduce((s, c) => s.plus(c.amount.toString()), new Decimal(0));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Credit Sales</h1>
        <p className="text-slate-500 mt-1">Record sales on credit to customers</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Customers</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{customers.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Credit Sales Records</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{creditSales.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Recent Credit (KES)</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">{Number(totalCredit.toFixed(2)).toLocaleString()}</p>
        </div>
      </div>

      <div className="mb-6"><CreditForms customers={customersFormatted} branches={branches.map((b) => ({ id: b.id, name: b.name }))} /></div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200"><h2 className="text-lg font-semibold text-slate-900">Recent Credit Sales ({creditSales.length})</h2></div>
        {creditSales.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No credit sales recorded yet. Add one above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Date</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Invoice</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Customer</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Amount (KES)</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {creditSales.map((c) => {
                const out = outstandingMap.get(c.customerId) ?? new Decimal(0);
                return (
                  <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-700">{new Date(c.saleDate).toLocaleDateString('en-GB')}</td>
                    <td className="px-6 py-3 text-slate-600 font-mono text-xs">{c.invoiceRef}</td>
                    <td className="px-6 py-3 text-slate-900 font-medium">{c.customer.name}</td>
                    <td className="px-6 py-3 text-slate-600">{c.branch.name}</td>
                    <td className="px-6 py-3 text-right text-amber-600 font-medium">{Number(c.amount).toLocaleString()}</td>
                    <td className="px-6 py-3 text-right text-slate-700">{Number(out.toFixed(2)).toLocaleString()}</td>
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
