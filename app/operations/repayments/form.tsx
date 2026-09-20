'use client';
import { useState, useTransition } from 'react';
import { createRepayment } from './actions';

export function RepaymentForm({ branches, staff }: { branches: any[]; staff: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const [staffId, setStaffId] = useState('');

  const staffForBranch = staff.filter((s) => s.branchId === branchId);

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
      <h2 className="text-lg font-semibold text-slate-900 mb-2">Record Repayment</h2>
      <p className="text-xs text-slate-500 mb-4">
        A repayment reduces the credit balance for the customer. If the customer name matches a credit sale, it auto-adjusts against it.
      </p>
      <form id="repay-form" action={onSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
          <select name="branchId" value={branchId} onChange={(e) => { setBranchId(e.target.value); setStaffId(''); }} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Staff (Individual)</label>
          <select name="staffId" value={staffId} onChange={(e) => setStaffId(e.target.value)} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            <option value="">— Select Staff —</option>
            {staffForBranch.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Customer Name (optional)</label>
          <input type="text" name="customerName" placeholder="e.g. Acme Pharmacy"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
          <input type="date" name="paymentDate" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Amount (KES)</label>
          <input type="number" step="0.01" name="amount" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-4">
          <label className="block text-xs font-medium text-slate-700 mb-1">Notes (optional)</label>
          <input type="text" name="notes" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-6 flex items-center gap-4 pt-2">
          <button type="submit" disabled={isPending || !staffId}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : '+ Add Repayment'}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </form>
    </div>
  );
}
