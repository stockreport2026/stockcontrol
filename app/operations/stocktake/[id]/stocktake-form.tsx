'use client';

import { useState, useTransition } from 'react';
import { updateStocktakeItems, approveStocktake } from './actions';

type ItemRow = {
  id: string;
  sku: string;
  description: string;
  unit: string;
  expectedQty: string;
  actualQty: string;
  varianceQty: string;
  unitCost: string;
  varianceValue: string;
};

export function StocktakeForm({
  stocktakeId,
  items,
  isApproved,
}: {
  stocktakeId: string;
  items: ItemRow[];
  isApproved: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = (formData: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const res = await updateStocktakeItems(formData, stocktakeId);
      setMessage(res.message);
    });
  };

  const handleApprove = () => {
    if (!confirm('Approve this stocktake? This will lock the values.')) return;
    setMessage(null);
    startTransition(async () => {
      const res = await approveStocktake(stocktakeId);
      setMessage(res.message);
    });
  };

  return (
    <form action={handleSave}>
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Count Items ({items.length})
          </h2>
          {!isApproved && (
            <p className="text-xs text-slate-500">
              Enter physical counts, then Save before Approving
            </p>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Item</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Expected</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Actual Count</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Variance</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Unit Cost</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Variance Value</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const v = parseFloat(i.varianceValue);
                return (
                  <tr key={i.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{i.description}</div>
                      <div className="text-xs text-slate-500">{i.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {Number(i.expectedQty).toLocaleString()} {i.unit}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        name={`actual_${i.id}`}
                        step="0.01"
                        min="0"
                        defaultValue={i.actualQty}
                        disabled={isApproved}
                        placeholder="0"
                        className="w-32 border border-slate-300 rounded-md px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {Number(i.varianceQty).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {Number(i.unitCost).toLocaleString()}
                    </td>
                    <td className={`px-4 py-3 text-right font-medium ${
                      v < 0 ? 'text-red-600' : v > 0 ? 'text-green-600' : 'text-slate-500'
                    }`}>
                      {v > 0 ? '+' : ''}{Number(i.varianceValue).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="text-sm text-slate-600">
            {message && <span className="text-green-600 font-medium">{message}</span>}
          </div>
          {!isApproved && (
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Save Counts'}
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isPending}
                className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
              >
                Approve Stocktake
              </button>
            </div>
          )}
          {isApproved && (
            <span className="inline-block px-3 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
              ✓ Approved & Locked
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
