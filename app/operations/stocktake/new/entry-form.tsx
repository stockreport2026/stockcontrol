'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createStocktake, type StResult } from '../actions';

type Item = {
  id: string;
  sku: string;
  description: string;
  unit: string;
  unitCost: string;
  expectedQty: string;
};

type Branch = { id: string; label: string };

export function StocktakeEntryForm({
  branches,
  selectedBranchId,
  items,
}: {
  branches: Branch[];
  selectedBranchId: string;
  items: Item[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<StResult | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>(
    Object.fromEntries(items.map((i) => [i.id, i.expectedQty]))
  );

  function updateCount(id: string, value: string) {
    setCounts((prev) => ({ ...prev, [id]: value }));
  }

  function onSubmit(formData: FormData) {
    setResult(null);
    const payload = items.map((i) => ({
      stockItemId: i.id,
      actualQty: counts[i.id] || '0',
    }));
    formData.set('counts', JSON.stringify(payload));

    startTransition(async () => {
      const res = await createStocktake(formData);
      setResult(res);
      if (res.success) {
        router.push('/operations/stocktake');
      }
    });
  }

  function onBranchChange(newBranchId: string) {
    router.push('/operations/stocktake/new?branchId=' + newBranchId);
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
            <select
              name="branchId"
              value={selectedBranchId}
              onChange={(e) => onBranchChange(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Stocktake Date</label>
            <input
              type="date"
              name="stocktakeDate"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <input type="text" name="notes"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Item Counts ({items.length})</h2>
          <p className="text-xs text-slate-500">
            Expected quantities are pre-filled. Adjust to match your physical count.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Item</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Expected</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 w-40">Actual Count</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Variance</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const expected = parseFloat(i.expectedQty);
                const actual = parseFloat(counts[i.id] || '0');
                const variance = expected - actual;
                return (
                  <tr key={i.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{i.description}</div>
                      <div className="text-xs text-slate-500">{i.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {expected.toLocaleString()} {i.unit}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        step="0.01"
                        value={counts[i.id] || ''}
                        onChange={(e) => updateCount(i.id, e.target.value)}
                        className="w-full text-right border border-slate-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </td>
                    <td className={'px-4 py-3 text-right font-medium ' + (variance > 0 ? 'text-red-600' : variance < 0 ? 'text-emerald-600' : 'text-slate-400')}>
                      {variance === 0 ? '—' : (variance > 0 ? '-' : '+') + Math.abs(variance).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="submit"
          disabled={isPending}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Submit Stocktake'}
        </button>
        {result && !result.success && (
          <p className="text-sm text-red-600">{result.message}</p>
        )}
      </div>
    </form>
  );
}
