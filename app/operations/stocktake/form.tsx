'use client';
import { useState, useTransition } from 'react';
import { saveStockPosition } from './actions';

export function StockPositionForm({ branches }: { branches: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();

  const [opening, setOpening] = useState('');
  const [closing, setClosing] = useState('');
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');

  const openingNum = parseFloat(opening) || 0;
  const closingNum = parseFloat(closing) || 0;
  const variance = openingNum - closingNum;
  const variancePct = openingNum === 0 ? 0 : (variance / openingNum) * 100;

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await saveStockPosition(formData);
      setMsg({ text: res.message, ok: res.success });
      if (res.success) { setOpening(''); setClosing(''); (document.getElementById('stock-form') as HTMLFormElement)?.reset(); }
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-2">Enter Stock Position</h2>
      <p className="text-xs text-slate-500 mb-5">
        Enter the total opening stock value and closing stock value (in KES). The variance is automatically calculated.
      </p>

      <form id="stock-form" action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
            <select name="branchId" value={branchId} onChange={(e) => setBranchId(e.target.value)} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Year</label>
            <input type="number" name="periodYear" defaultValue={defaultYear} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
            <select name="periodMonth" defaultValue={defaultMonth} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <div />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Opening Stock Value (KES)</label>
            <input
              type="number"
              step="0.01"
              name="openingStockValue"
              value={opening}
              onChange={(e) => setOpening(e.target.value)}
              required
              placeholder="0.00"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Closing Stock Value (KES)</label>
            <input
              type="number"
              step="0.01"
              name="closingStockValue"
              value={closing}
              onChange={(e) => setClosing(e.target.value)}
              required
              placeholder="0.00"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Live variance preview */}
        {(opening !== '' || closing !== '') && (
          <div className={`p-4 rounded-lg border-l-4 ${variance > 0 ? 'bg-rose-50 border-rose-500' : variance < 0 ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-400'}`}>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Opening</p>
                <p className="text-lg font-bold text-slate-900">KES {openingNum.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Closing</p>
                <p className="text-lg font-bold text-slate-900">KES {closingNum.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  {variance > 0 ? 'Stock Loss' : variance < 0 ? 'Stock Surplus' : 'No Variance'}
                </p>
                <p className={`text-lg font-bold ${variance > 0 ? 'text-rose-600' : variance < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {variance < 0 ? '(' : ''}KES {Math.abs(variance).toLocaleString()}{variance < 0 ? ')' : ''}
                </p>
                {openingNum > 0 && (
                  <p className={`text-xs font-medium mt-0.5 ${variance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {variancePct.toFixed(2)}% shrinkage
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Notes (optional)</label>
          <input type="text" name="notes" placeholder="Any context about this period's stock position..."
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button type="submit" disabled={isPending}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : '+ Save Stock Position'}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </form>
    </div>
  );
}
