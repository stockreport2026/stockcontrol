'use client';

import { useState, useTransition } from 'react';
import { addStockItem, type SIResult } from './actions';

type Option = { id: string; label: string };
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export function StockItemForm({ branches }: { branches: Option[] }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SIResult | null>(null);
  const now = new Date();

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await addStockItem(formData);
      setResult(res);
      if (res.success) {
        const f = document.getElementById('si-form') as HTMLFormElement;
        f?.reset();
      }
    });
  }

  if (branches.length === 0) {
    return <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">Create a branch first.</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Add Stock Item</h2>
      <p className="text-sm text-slate-500 mb-4">
        Enter each drug with its quantity and cost. These items appear as additional information in the report.
      </p>

      <form id="si-form" action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
            <select name="branchId" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
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
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Drug / Item Name</label>
            <input type="text" name="itemName" required placeholder="e.g. Paracetamol 500mg"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
            <input type="number" name="quantity" step="0.01" min="0" required placeholder="0"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost (KES)</label>
            <input type="number" name="unitCost" step="0.01" min="0" required placeholder="0.00"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="lg:col-span-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Reason / Note (optional)</label>
            <input type="text" name="reason"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <button type="submit" disabled={isPending}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Adding...' : 'Add Item'}
          </button>
          {result && <p className={'text-sm ' + (result.success ? 'text-emerald-600' : 'text-rose-600')}>{result.message}</p>}
        </div>
      </form>
    </div>
  );
}
