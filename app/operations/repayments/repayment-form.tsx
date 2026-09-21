'use client';

import { useState, useTransition } from 'react';
import { createRepayment, type RepayResult } from './actions';

type Option = { id: string; label: string };

const METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'BANK', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CARD', label: 'Card' },
];

export function RepaymentForm({
  customersByBranch,
  staffByBranch,
  branches,
}: {
  customersByBranch: Record<string, Option[]>;
  staffByBranch: Record<string, Option[]>;
  branches: Option[];
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<RepayResult | null>(null);
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id ?? '');

  const customers = customersByBranch[selectedBranch] ?? [];
  const staff = staffByBranch[selectedBranch] ?? [];

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await createRepayment(formData);
      setResult(res);
      if (res.success) {
        const form = document.getElementById('repayment-form') as HTMLFormElement;
        form?.reset();
      }
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Record Repayment</h2>

      <form id="repayment-form" action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
            <select
              name="branchId"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Customer</label>
            <select name="customerId" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
              {customers.length === 0 ? (
                <option value="">No customers in this branch</option>
              ) : (
                customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Received By (optional)</label>
            <select name="staffId" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
              <option value="">— None —</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Receipt Reference</label>
            <input type="text" name="receiptRef" required placeholder="RCP-5001"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date</label>
            <input type="date" name="paymentDate" required
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
            <select name="paymentMethod" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (KES)</label>
            <input type="number" name="amount" step="0.01" min="0.01" required placeholder="0.00"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <input type="text" name="notes"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button type="submit" disabled={isPending}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : 'Record Repayment'}
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
