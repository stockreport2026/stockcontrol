import { prisma } from '@/lib/db/prisma';
import { CustomerForm } from './customer-form';
import { DeleteCustomerButton } from './delete-button';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function CustomersAdminPage() {
  const [branches, customers] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.customer.findMany({
      include: { branch: true },
      orderBy: [{ branch: { name: 'asc' } }, { name: 'asc' }],
    }),
  ]);

  const branchOptions = branches.map((b) => ({ id: b.id, label: b.name + ' (' + b.code + ')' }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
        <p className="text-slate-500 mt-1">Manage customers and credit limits</p>
      </div>

      <CustomerForm branches={branchOptions} />

      <div className="mt-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">All Customers ({customers.length})</h2>
        </div>

        {customers.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No customers yet. Add your first customer above.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Customer</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Phone</th>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Credit Limit</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-900">{c.name}</td>
                  <td className="px-6 py-3 text-slate-600">{c.phone ?? '—'}</td>
                  <td className="px-6 py-3 text-slate-600">{c.branch.name}</td>
                  <td className="px-6 py-3 text-right text-slate-700">
                    {Number(c.creditLimit).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <DeleteCustomerButton id={c.id} name={c.name} />
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
