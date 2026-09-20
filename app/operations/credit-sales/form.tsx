'use client';
import { useState, useTransition } from 'react';
import { createCreditSale, deleteCreditSale } from './actions';

export function CreditForm({ branches, staff }: { branches: any[]; staff: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');

  const staffForBranch = staff.filter((s) => s.branchId === branchId);

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await createCreditSale(formData);
      setMsg({ text: res.message, ok: res.success });
      if (res.success) (document.getElementById('credit-form') as HTMLFormElement)?.reset();
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Record Credit Sale</h2>
      <form id="credit-form" action={onSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
          <select name="branchId" value={branchId} onChange={(e) => setBranchId(e.target.value)} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Staff</label>
          <select name="staffId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            {staffForBranch.length === 0
              ? <option value="">— No staff —</option>
              : staffForBranch.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Customer Name</label>
          <input type="text" name="customerName" required placeholder="e.g. Acme Pharmacy" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
          <input type="date" name="saleDate" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Amount (KES)</label>
          <input type="number" step="0.01" name="amount" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-5 flex items-center gap-4 pt-2">
          <button type="submit" disabled={isPending || staffForBranch.length === 0}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : '+ Add Credit Sale'}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </form>
    </div>
  );
}
