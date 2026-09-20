'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { createStockTx, type TxResult } from './actions';

type Option = { id: string; label: string };

const TX_TYPES = [
  { value: 'OPENING', label: 'Opening Stock' },
  { value: 'PURCHASE', label: 'Purchase (in)' },
  { value: 'TRANSFER_IN', label: 'Transfer In' },
  { value: 'TRANSFER_OUT', label: 'Transfer Out' },
  { value: 'SALE', label: 'Sale/Issue (out)' },
  { value: 'RETURN', label: 'Return (in)' },
  { value: 'ADJUSTMENT', label: 'Adjustment (+ or -)' },
];

const selectClass = "w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white text-slate-900";

export function TxForm({ items, branches }: { items: Option[]; branches: Option[] }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<TxResult | null>(null);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await createStockTx(formData);
      setResult(res);
      if (res.success) {
        const form = document.getElementById('tx-form') as HTMLFormElement;
        form?.reset();
      }
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-900">Record Stock Movement</h2>
        <Link href="/operations/stock" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to Stock
        </Link>
      </div>

      {items.length === 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800">
          ⚠️ No stock items found. Run <code>npx prisma db seed</code> to add demo data.
        </div>
      )}

      <form id="tx-form" action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Stock Item</label>
            <select name="stockItemId" className={selectClass}>
              {items.length === 0 ? (
                <option value="">— No items available —</option>
              ) : (
                items.map((i) => <option key={i.id} value={i.id}>{i.label}</option>)
              )}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
            <select name="branchId" className={selectClass}>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Movement Type</label>
            <select name="type" className={selectClass}>
              {TX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input type="date" name="transactionDate" required
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Quantity (positive — sign handled by type)
            </label>
            <input type="number" name="quantity" step="0.01" min="0" required placeholder="0"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reference (optional)</label>
            <input type="text" name="reference" placeholder="GRN-001, INV-123..."
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <input type="text" name="notes"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button type="submit" disabled={isPending || items.length === 0}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : 'Record Movement'}
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
