'use client';
import { useState, useTransition } from 'react';
import { createBranch } from './actions';

export function BranchForm() {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await createBranch(formData);
      setMsg({ text: res.message, ok: res.success });
      if (res.success) (document.getElementById('branch-form') as HTMLFormElement)?.reset();
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Add New Branch</h2>
      <form id="branch-form" action={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Branch Name</label>
          <input type="text" name="name" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Code</label>
          <input type="text" name="code" required placeholder="MED-XXX-01" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Location</label>
          <input type="text" name="location" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Selling Days</label>
          <input type="number" name="sellingDays" defaultValue={26} min={1} max={31} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-4 flex items-center gap-4">
          <button type="submit" disabled={isPending} className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Adding...' : '+ Add Branch'}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </form>
    </div>
  );
}
