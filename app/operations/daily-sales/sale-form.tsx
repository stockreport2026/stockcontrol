'use client';

import { useState, useTransition } from 'react';
import { createDailySale, type SaleActionResult } from './actions';

type Option = { id: string; label: string };

export function SaleForm({
  branches,
  staffByBranch,
}: {
  branches: Option[];
  staffByBranch: Record<string, Option[]>;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SaleActionResult | null>(null);
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id ?? '');

  const staffOptions = staffByBranch[selectedBranch] ?? [];

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await createDailySale(formData);
      setResult(res);
      if (res.success) {
        const form = document.getElementById('sale-form') as HTMLFormElement;
        form?.reset();
        setSelectedBranch(branches[0]?.id ?? '');
      }
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Record New Daily Sale</h2>

      <form id="sale-form" action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
            <select
              name="branchId"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Staff Member</label>
            <select
              name="staffId"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              name="saleDate"
              required
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Actual Sales (KES)</label>
            <input
              type="number"
              name="actualSales"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">System Sales (KES)</label>
            <input
              type="number"
              name="systemSales"
              step="0.01"
              min="0"
              required
              placeholder="0.00"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? 'Saving...' : 'Save Sale'}
          </button>

          {result && (
            <p className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
              {result.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
