'use client';
import { useState, useTransition } from 'react';
import { createRepayment } from './actions';

export function RepaymentForm({ customers, branches }: { customers: any[]; branches: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await createRepayment(formData);
      setMsg({ text: res.message, ok: res.success });
      if (res.success) (document.getElementById('repay-form') as HTMLFormElement)?.reset();
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Record Customer Repayment</h2>
      <form id="repay-form" action={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Customer</label>
          <select name="customerId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            <option value="">— Select Customer —</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
          <select name="branchId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
          <input type="date" name="paymentDate" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Amount (KES)</label>
          <input type="number" step="0.01" name="amount" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Method</label>
          <select name="paymentMethod" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            <option value="CASH">Cash</option>
            <option value="MPESA">M-Pesa</option>
            <option value="BANK">Bank Transfer</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Receipt Ref</label>
          <input type="text" name="receiptRef" required placeholder="RCP-0001" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Notes (optional)</label>
          <input type="text" name="notes" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-4 flex items-center gap-4">
          <button type="submit" disabled={isPending} className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : 'Record Repayment'}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </form>
    </div>
  );
}
