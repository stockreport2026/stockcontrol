'use client';

import { useState, useTransition } from 'react';
import { saveStaffSales, type StaffSalesResult } from './actions';

type Option = { id: string; label: string };

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function StaffSalesForm({
  branches,
  staffByBranch,
}: {
  branches: Option[];
  staffByBranch: Record<string, Option[]>;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<StaffSalesResult | null>(null);
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id ?? '');
  const now = new Date();

  const staffOptions = staffByBranch[selectedBranch] ?? [];

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await saveStaffSales(formData);
      setResult(res);
      if (res.success) {
        const f = document.getElementById('staff-sales-form') as HTMLFormElement;
        f?.reset();
        setSelectedBranch(branches[0]?.id ?? '');
      }
    });
  }

  if (branches.length === 0) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
        Create a branch first in Administration → Branches.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Enter Individual Staff Sales</h2>
      <p className="text-sm text-slate-500 mb-4">
        Total sales for a staff member during a reporting period. One entry per staff per period.
      </p>

      <form id="staff-sales-form" action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
            <select
              name="branchId"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              {branches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Staff Member</label>
            <select name="staffId" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
              {staffOptions.length === 0 ? (
                <option value="">No staff in this branch</option>
              ) : (
                staffOptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Period Year</label>
            <input type="number" name="periodYear" required defaultValue={now.getFullYear()}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Period Month</label>
            <select name="periodMonth" defaultValue={now.getMonth() + 1}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Period From</label>
            <input type="date" name="periodStartDate" required
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Period To</label>
            <input type="date" name="periodEndDate" required
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Actual Sales (KES)</label>
            <input type="number" name="actualSales" step="0.01" min="0" required placeholder="0.00"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">System Sales (KES)</label>
            <input type="number" name="systemSales" step="0.01" min="0" required placeholder="0.00"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button type="submit" disabled={isPending}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : 'Save Staff Sales'}
          </button>
          {result && <p className={'text-sm ' + (result.success ? 'text-emerald-600' : 'text-rose-600')}>{result.message}</p>}
        </div>
      </form>
    </div>
  );
}
