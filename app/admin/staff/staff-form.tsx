'use client';

import { useState, useTransition } from 'react';
import { createStaff } from './actions';

export function StaffForm({ branches }: { branches: { id: string; label: string }[] }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res = await createStaff(formData);
      setMessage({ text: res.message, ok: res.success });
      if (res.success) (document.getElementById('staff-form') as HTMLFormElement)?.reset();
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Add Staff Member</h2>
      <form id="staff-form" action={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Assign to Branch</label>
          <select name="branchId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Employee Code</label>
          <input type="text" name="employeeCode" required placeholder="MED-KSM-01-S01"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div />
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">First Name</label>
          <input type="text" name="firstName" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Last Name</label>
          <input type="text" name="lastName" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-2 flex items-end gap-4">
          <button type="submit" disabled={isPending}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Adding...' : '+ Add Staff'}
          </button>
          {message && <span className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</span>}
        </div>
      </form>
    </div>
  );
}
