'use client';
import { useState, useTransition } from 'react';
import { createVarianceItem } from './actions';

export function VarianceForm({ branches }: { branches: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [expected, setExpected] = useState('');
  const [actual, setActual] = useState('');
  const [unitCost, setUnitCost] = useState('');

  const expectedNum = parseFloat(expected) || 0;
  const actualNum = parseFloat(actual) || 0;
  const unitCostNum = parseFloat(unitCost) || 0;
  const varQty = expectedNum - actualNum;
  const varValue = varQty * unitCostNum;

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await createVarianceItem(formData);
      setMsg({ text: res.message, ok: res.success });
      if (res.success) { setExpected(''); setActual(''); setUnitCost(''); (document.getElementById('var-form') as HTMLFormElement)?.reset(); }
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-2">Record Material Stock Variance</h2>
      <p className="text-xs text-slate-500 mb-5">
        Use this to log specific drugs with large variances requiring explanation. These appear in the report.
      </p>

      <form id="var-form" action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
            <select name="branchId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Period Start</label>
            <input type="date" name="periodStartDate" defaultValue={firstOfMonth} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Period End</label>
            <input type="date" name="periodEndDate" defaultValue={lastOfMonth} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Item Name (Drug)</label>
          <input type="text" name="itemName" required placeholder="e.g. Paracetamol 500mg"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Expected Qty</label>
            <input type="number" step="0.01" name="expectedQty" value={expected} onChange={(e) => setExpected(e.target.value)} required placeholder="0"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Actual Qty</label>
            <input type="number" step="0.01" name="actualQty" value={actual} onChange={(e) => setActual(e.target.value)} required placeholder="0"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Unit Cost (KES)</label>
            <input type="number" step="0.01" name="unitCost" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} required placeholder="0.00"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        {(expected !== '' || actual !== '') && varQty !== 0 && (
          <div className={`p-3 rounded-lg border-l-4 ${varQty > 0 ? 'bg-rose-50 border-rose-500' : 'bg-emerald-50 border-emerald-500'}`}>
            <p className={`text-sm font-medium ${varQty > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {varQty > 0 ? 'Stock Loss' : 'Stock Surplus'}: {Math.abs(varQty).toLocaleString()} units
              {unitCostNum > 0 && <> · Value: KES {Math.abs(varValue).toLocaleString()}</>}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Reason / Explanation</label>
          <textarea name="reason" rows={2} placeholder="Explain what caused this variance — breakage, expiry, theft, mis-shipment, etc."
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button type="submit" disabled={isPending}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : '+ Add Variance Item'}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </form>
    </div>
  );
}
