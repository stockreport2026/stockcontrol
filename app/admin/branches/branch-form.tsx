'use client';

import { useState, useTransition } from 'react';
import { createBranch, type BranchResult } from './actions';

export function BranchForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BranchResult | null>(null);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await createBranch(formData);
      setResult(res);
      if (res.success) {
        const form = document.getElementById('branch-form') as HTMLFormElement;
        form?.reset();
      }
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Add New Branch</h2>

      <form id="branch-form" action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name</label>
            <input type="text" name="name" required placeholder="e.g. Kisumu Retail"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch Code</label>
            <input type="text" name="code" required placeholder="e.g. KSM-001"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <input type="text" name="location" placeholder="e.g. Kisumu"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Selling Days per Month</label>
            <input type="number" name="sellingDays" defaultValue="26" min="1" max="31"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button type="submit" disabled={isPending}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : 'Add Branch'}
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
