'use client';
import { useState, useTransition } from 'react';
import { saveStockVariance } from './actions';

export function VarianceForm({ branches }: { branches: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const [sysQty, setSysQty] = useState('');
  const [actQty, setActQty] = useState('');
  const [unitCost, setUnitCost] = useState('');

  const sysNum = parseFloat(sysQty) || 0;
  const actNum = parseFloat(actQty) || 0;
  const costNum = parseFloat(unitCost) || 0;
  const varianceQty = sysNum - actNum;
  const varianceValue = varianceQty * costNum;

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await saveStockVariance(formData);
      setMsg({ text: res.message, ok: res.success });
      if (res.success) {
        setSysQty(''); setActQty(''); setUnitCost('');
        (document.getElementById('var-form') as HTMLFormElement)?.reset();
      }
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Record Stock Variance</h2>
      <p className="text-xs text-slate-500 mb-5">
        Enter the drug name, system quantity, actual (physical) quantity, and unit cost. The variance is calculated automatically.
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
          <label className="block text-xs font-medium text-slate-700 mb-1">Drug / Item Name</label>
          <input type="text" name="itemName" required placeholder="e.g. Paracetamol 500mg"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">System Stock (Qty)</label>
            <input type="number" step="0.01" name="systemQty" value={sysQty} onChange={(e) => setSysQty(e.target.value)} required placeholder="0"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Actual Stock (Qty)</label>
            <input type="number" step="0.01" name="actualQty" value={actQty} onChange={(e) => setActQty(e.target.value)} required placeholder="0"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Unit Cost (KES)</label>
            <input type="number" step="0.01" name="unitCost" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} required placeholder="0.00"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>

        {/* Live variance preview */}
        {(sysQty !== '' || actQty !== '') && (
          <div className={`p-4 rounded-lg border-l-4 ${varianceQty > 0 ? 'bg-rose-50 border-rose-500' : varianceQty < 0 ? 'bg-emerald-50 border-emerald-500' : 'bg-slate-50 border-slate-400'}`}>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">System</p>
                <p className="text-base font-bold text-slate-900">{sysNum.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Actual</p>
                <p className="text-base font-bold text-slate-900">{actNum.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  {varianceQty > 0 ? 'Loss' : varianceQty < 0 ? 'Surplus' : 'No Variance'}
                </p>
                <p className={`text-base font-bold ${varianceQty > 0 ? 'text-rose-600' : varianceQty < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {varianceQty < 0 ? '(' : ''}{Math.abs(varianceQty).toLocaleString()} units{varianceQty < 0 ? ')' : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">Total Value</p>
                <p className={`text-base font-bold ${varianceQty > 0 ? 'text-rose-600' : varianceQty < 0 ? 'text-emerald-600' : 'text-slate-900'}`}>
                  {varianceQty < 0 ? '(' : ''}KES {Math.abs(varianceValue).toLocaleString()}{varianceQty < 0 ? ')' : ''}
                </p>
              </div>
            </div>
            <p className="text-xs mt-2 text-slate-600">
              {varianceQty > 0 && '⚠️ System stock is higher than actual — this is a LOSS'}
              {varianceQty < 0 && '✓ Actual stock is higher than system — this is a SURPLUS'}
              {varianceQty === 0 && '✓ No variance — system and actual match'}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Reason / Explanation (optional)</label>
          <textarea name="reason" rows={2} placeholder="e.g. Breakage, expiry, theft, mis-shipment..."
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>

        <div className="flex items-center gap-4 pt-2">
          <button type="submit" disabled={isPending}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : '+ Add Stock Variance'}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </form>
    </div>
  );
}
