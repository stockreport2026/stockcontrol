'use client';

import { useState, useMemo } from 'react';
import { useTransition } from 'react';
import { saveStocktakeCounts, approveStocktake, reopenStocktake } from './actions';

type ItemRow = {
  id: string;
  description: string;
  category: string;
  unit: string;
  expectedQty: number;
  actualQty: number;
  unitCost: number;
  notes: string;
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
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [counts, setCounts] = useState<Record<string, string>>(
    () => Object.fromEntries(items.map((i) => [i.id, i.actualQty === 0 ? '' : String(i.actualQty)]))
  );
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [showOnlyUncounted, setShowOnlyUncounted] = useState(false);

  const categories = useMemo(() => {
    const s = new Set<string>();
    items.forEach((i) => s.add(i.category));
    return Array.from(s).sort();
  }, [items]);

  // Live totals
  const totals = useMemo(() => {
    let expected = 0;
    let actual = 0;
    items.forEach((i) => {
      const expectedVal = i.expectedQty * i.unitCost;
      const rawActual = counts[i.id];
      const actualQty = rawActual === '' || rawActual === undefined ? 0 : Number(rawActual);
      const actualVal = actualQty * i.unitCost;
      expected += expectedVal;
      actual += actualVal;
    });
    const stockLoss = Math.max(expected - actual, 0);
    const surplus = Math.max(actual - expected, 0);
    const shrinkPct = expected === 0 ? 0 : (stockLoss / expected) * 100;
    return { expected, actual, stockLoss, surplus, shrinkPct };
  }, [items, counts]);

  const countedItems = items.filter((i) => counts[i.id] !== '' && counts[i.id] !== undefined).length;

  // Filtered items
  const visibleItems = items.filter((i) => {
    if (filterCategory !== 'ALL' && i.category !== filterCategory) return false;
    if (search && !i.description.toLowerCase().includes(search.toLowerCase())) return false;
    if (showOnlyUncounted && counts[i.id] !== '' && counts[i.id] !== undefined) return false;
    return true;
  });

  // Group by category
  const grouped = useMemo(() => {
    const m = new Map<string, ItemRow[]>();
    visibleItems.forEach((i) => {
      const arr = m.get(i.category) ?? [];
      arr.push(i);
      m.set(i.category, arr);
    });
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [visibleItems]);

  function handleSave(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res = await saveStocktakeCounts(formData, stocktakeId);
      setMessage({ text: res.message, ok: res.success });
    });
  }

  function handleApprove() {
    if (!confirm('Approve this stocktake? It will be locked and cannot be edited.')) return;
    setMessage(null);
    startTransition(async () => {
      const res = await approveStocktake(stocktakeId);
      setMessage({ text: res.message, ok: res.success });
    });
  }

  function handleReopen() {
    if (!confirm('Reopen this stocktake for editing? This will need re-approval.')) return;
    setMessage(null);
    startTransition(async () => {
      const res = await reopenStocktake(stocktakeId);
      setMessage({ text: res.message, ok: res.success });
    });
  }

  return (
    <form action={handleSave}>
      {/* Live KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <KpiCard label="Items Counted" value={`${countedItems}/${items.length}`} />
        <KpiCard label="Expected Value" value={`KES ${totals.expected.toLocaleString()}`} />
        <KpiCard label="Actual Value" value={`KES ${totals.actual.toLocaleString()}`} />
        <KpiCard
          label={totals.stockLoss > 0 ? 'Stock Loss' : 'No Loss'}
          value={totals.stockLoss > 0 ? `KES ${totals.stockLoss.toLocaleString()}` : 'KES 0'}
          color="text-rose-600"
        />
        <KpiCard
          label="Shrinkage Rate"
          value={`${totals.shrinkPct.toFixed(2)}%`}
          color={totals.shrinkPct > 5 ? 'text-rose-600' : totals.shrinkPct > 2 ? 'text-amber-600' : 'text-emerald-600'}
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search item..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
        >
          <option value="ALL">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={showOnlyUncounted}
            onChange={(e) => setShowOnlyUncounted(e.target.checked)}
            className="rounded"
          />
          Show only uncounted
        </label>
        <span className="text-xs text-slate-500">
          Showing {visibleItems.length} of {items.length}
        </span>
      </div>

      {/* Counting grid */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Counting Sheet</h2>
          <p className="text-xs text-slate-500">
            {isApproved ? '🔒 Locked — approved stocktake' : 'Enter the physical count for each item. Leave blank if not yet counted.'}
          </p>
        </div>

        {visibleItems.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No items match your filter.</div>
        ) : (
          <div className="divide-y divide-slate-200">
            {grouped.map(([category, catItems]) => (
              <div key={category}>
                <div className="px-6 py-2 bg-slate-50 border-y border-slate-200">
                  <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">{category}</p>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-white">
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Item</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">Expected</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">Actual Count</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">Variance</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">Unit Cost</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-slate-500">Value Impact</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-slate-500">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catItems.map((i) => {
                      const rawActual = counts[i.id];
                      const actualQty = rawActual === '' || rawActual === undefined ? 0 : Number(rawActual);
                      const varianceQty = i.expectedQty - actualQty;
                      const varianceVal = varianceQty * i.unitCost;
                      const isLoss = varianceVal > 0.001;
                      const isSurplus = varianceVal < -0.001;
                      const isCounted = rawActual !== '' && rawActual !== undefined;
                      return (
                        <tr key={i.id} className="border-t border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2">
                            <div className="font-medium text-slate-900">{i.description}</div>
                            {!isCounted && <div className="text-[10px] text-amber-600">Not yet counted</div>}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-700">
                            {i.expectedQty.toLocaleString()} <span className="text-xs text-slate-400">{i.unit}</span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            <input
                              type="number"
                              name={`actual_${i.id}`}
                              value={counts[i.id] ?? ''}
                              onChange={(e) => setCounts((prev) => ({ ...prev, [i.id]: e.target.value }))}
                              step="0.01"
                              min="0"
                              placeholder="0"
                              disabled={isApproved}
                              className="w-24 border border-slate-300 rounded-md px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
                            />
                          </td>
                          <td className={`px-4 py-2 text-right font-medium ${isLoss ? 'text-rose-600' : isSurplus ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {isCounted ? (
                              <>
                                {isLoss ? '−' : isSurplus ? '+' : ''}
                                {Math.abs(varianceQty).toLocaleString()}
                              </>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2 text-right text-slate-600">{i.unitCost.toLocaleString()}</td>
                          <td className={`px-4 py-2 text-right font-semibold ${isLoss ? 'text-rose-600' : isSurplus ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {isCounted ? (
                              <>
                                {isLoss ? '−' : isSurplus ? '+' : ''}
                                {Math.abs(varianceVal).toLocaleString()}
                              </>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="text"
                              name={`notes_${i.id}`}
                              defaultValue={i.notes}
                              placeholder={isLoss && varianceVal > 500 ? 'Explain loss...' : 'Optional note'}
                              disabled={isApproved}
                              className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-3">
          <div className="text-sm">
            {message && <span className={message.ok ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>{message.text}</span>}
          </div>
          <div className="flex gap-3">
            {!isApproved ? (
              <>
                <button
                  type="submit"
                  disabled={isPending}
                  className="bg-white border border-slate-300 text-slate-700 px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
                >
                  {isPending ? 'Saving...' : 'Save Counts'}
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isPending || countedItems < items.length}
                  className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
                  title={countedItems < items.length ? `${items.length - countedItems} items still uncounted` : 'Approve and lock'}
                >
                  Approve & Lock
                </button>
              </>
            ) : (
              <>
                <span className="inline-block px-3 py-2 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                  ✓ Approved & Locked
                </span>
                <button
                  type="button"
                  onClick={handleReopen}
                  disabled={isPending}
                  className="bg-white border border-amber-300 text-amber-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-amber-50 disabled:opacity-50"
                >
                  Reopen for Edits
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-lg font-bold mt-1 ${color ?? 'text-slate-900'}`}>{value}</p>
    </div>
  );
}
