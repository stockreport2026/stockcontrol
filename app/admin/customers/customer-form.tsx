'use client';

import { useState, useTransition } from 'react';
import { createCustomer, type CustomerResult } from './actions';

type Option = { id: string; label: string };

export function CustomerForm({ branches }: { branches: Option[] }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CustomerResult | null>(null);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await createCustomer(formData);
      setResult(res);
      if (res.success) {
        const form = document.getElementById('customer-form') as HTMLFormElement;
        form?.reset();
      }
    });
  }

  if (branches.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
        You need to create at least one branch before adding customers.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Add New Customer</h2>

      <form id="customer-form" action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
            <select name="branchId" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name</label>
            <input type="text" name="name" required placeholder="Acme Hardware Ltd"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input type="text" name="phone" placeholder="+254711000000"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" name="email" placeholder="customer@example.com"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit (KES)</label>
            <input type="number" name="creditLimit" step="0.01" min="0" defaultValue="0"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Opening Balance (KES)</label>
            <input type="number" name="openingBalance" step="0.01" defaultValue="0"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button type="submit" disabled={isPending}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : 'Add Customer'}
          </button>
          {result && (
            <p className={'text-sm ' + (result.success ? 'text-green-600' : 'text-red-600')}>
              {result.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
