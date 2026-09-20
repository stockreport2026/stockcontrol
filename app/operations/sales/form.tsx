'use client';
import { useState, useTransition } from 'react';
import { saveStaffSales } from './actions';

export function SalesForm({ branches, staff }: { branches: any[]; staff: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const staffForBranch = staff.filter((s) => s.branchId === branchId);

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await saveStaffSales(formData);
      setMsg({ text: res.message, ok: res.success });
      if (res.success) (document.getElementById('sales-form') as HTMLFormElement)?.reset();
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Record Staff Sales for Period</h2>
      <p className="text-xs text-slate-500 mb-4">
        Enter the period date range and the total actual and system sales for that staff member.
      </p>
      <form id="sales-form" action={onSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
          <select name="branchId" value={branchId} onChange={(e) => setBranchId(e.target.value)} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Staff</label>
          <select name="staffId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            {staffForBranch.length === 0
              ? <option value="">— No staff —</option>
              : staffForBranch.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Period Start</label>
          <input type="date" name="periodStartDate" defaultValue={firstOfMonth} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Period End</label>
          <input type="date" name="periodEndDate" defaultValue={lastOfMonth} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">Actual Sales (KES)</label>
          <input type="number" step="0.01" name="actualSales" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-3">
          <label className="block text-xs font-medium text-slate-700 mb-1">System Sales (KES)</label>
          <input type="number" step="0.01" name="systemSales" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-6 flex items-center gap-4 pt-2">
          <button type="submit" disabled={isPending || staffForBranch.length === 0}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : '+ Save Sales'}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </form>
    </div>
  );
}
