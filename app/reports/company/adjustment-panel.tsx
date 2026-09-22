'use client';

import { useState, useTransition } from 'react';
import { saveReportAdjustments, clearOverrides, type AdjResult } from './adjustment-actions';

type Option = { id: string; label: string };

export function AdjustmentPanel({
  branches,
  initialBranchId,
  initialYear,
  initialMonth,
  initialNotes,
  initialAdjustments,
  initialOverrides,
}: {
  branches: Option[];
  initialBranchId: string;
  initialYear: number;
  initialMonth: number;
  initialNotes: string;
  initialAdjustments: string;
  initialOverrides: {
    apply: boolean;
    stockLoss: string;
    excessSales: string;
    recovery: string;
    remainingLoss: string;
    openingBal: string;
    closingBal: string;
  };
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AdjResult | null>(null);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [notes, setNotes] = useState(initialNotes);
  const [adjustments, setAdjustments] = useState(initialAdjustments);
  const [apply, setApply] = useState(initialOverrides.apply);
  const [stockLoss, setStockLoss] = useState(initialOverrides.stockLoss);
  const [excessSales, setExcessSales] = useState(initialOverrides.excessSales);
  const [recovery, setRecovery] = useState(initialOverrides.recovery);
  const [remainingLoss, setRemainingLoss] = useState(initialOverrides.remainingLoss);
  const [openingBal, setOpeningBal] = useState(initialOverrides.openingBal);
  const [closingBal, setClosingBal] = useState(initialOverrides.closingBal);

  function onSave(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await saveReportAdjustments(formData);
      setResult(res);
    });
  }

  function onClear() {
    const fd = new FormData();
    fd.set('branchId', branchId);
    fd.set('periodYear', String(initialYear));
    fd.set('periodMonth', String(initialMonth));
    setResult(null);
    startTransition(async () => {
      const res = await clearOverrides(fd);
      setResult(res);
      if (res.success) {
        setApply(false);
        setStockLoss('');
        setExcessSales('');
        setRecovery('');
        setRemainingLoss('');
        setOpeningBal('');
        setClosingBal('');
      }
    });
  }

  return (
    <div className="mt-8 bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 shadow-sm p-6">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded bg-indigo-600 text-white text-xs font-bold">ADJ</span>
          Report Adjustments &amp; Overrides
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Override computed figures or add management notes. When <strong>Apply Overrides</strong> is checked, the report uses your values instead of the calculated ones.
        </p>
      </div>

      <form action={onSave} className="space-y-4">
        <input type="hidden" name="branchId" value={branchId} />
        <input type="hidden" name="periodYear" value={initialYear} />
        <input type="hidden" name="periodMonth" value={initialMonth} />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
          <select value={branchId} onChange={(e) => setBranchId(e.target.value)}
            className="w-full md:w-1/2 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="applyOverrides" checked={apply}
              onChange={(e) => setApply(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300" />
            <span className="text-sm font-semibold text-slate-900">Apply overrides to the report</span>
          </label>
          <p className="text-xs text-slate-500 mt-1 ml-7">
            When checked, the report will use the values below instead of the calculated ones.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Override Stock Loss (KES)</label>
            <input type="number" name="overrideStockLoss" step="0.01" value={stockLoss}
              onChange={(e) => setStockLoss(e.target.value)} placeholder="leave blank to keep computed"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Override Excess Sales (KES)</label>
            <input type="number" name="overrideExcessSales" step="0.01" value={excessSales}
              onChange={(e) => setExcessSales(e.target.value)} placeholder="leave blank to keep computed"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Override Recovery (KES)</label>
            <input type="number" name="overrideRecovery" step="0.01" value={recovery}
              onChange={(e) => setRecovery(e.target.value)} placeholder="leave blank to keep computed"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Override Remaining Loss (KES)</label>
            <input type="number" name="overrideRemainingLoss" step="0.01" value={remainingLoss}
              onChange={(e) => setRemainingLoss(e.target.value)} placeholder="leave blank to keep computed"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Override Opening Balance (KES)</label>
            <input type="number" name="overrideOpeningBal" step="0.01" value={openingBal}
              onChange={(e) => setOpeningBal(e.target.value)} placeholder="leave blank to keep computed"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Override Closing Balance (KES)</label>
            <input type="number" name="overrideClosingBal" step="0.01" value={closingBal}
              onChange={(e) => setClosingBal(e.target.value)} placeholder="leave blank to keep computed"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Management Notes (shown in report)</label>
          <textarea name="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            placeholder="Context for management..."
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Adjustment Prompt — explain what changed</label>
          <textarea name="adjustments" value={adjustments} onChange={(e) => setAdjustments(e.target.value)} rows={3}
            placeholder="e.g. 'Exclude Mombasa stock loss — closed for renovation.'"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono bg-white" />
        </div>

        <div className="flex items-center justify-between pt-2 gap-3">
          <div className="flex gap-3">
            <button type="submit" disabled={isPending}
              className="bg-indigo-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {isPending ? 'Saving...' : 'Save Adjustments'}
            </button>
            <button type="button" onClick={onClear} disabled={isPending}
              className="bg-white border border-slate-300 text-slate-700 px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-50 disabled:opacity-50">
              Clear Overrides
            </button>
          </div>
          {result && <p className={'text-sm ' + (result.success ? 'text-emerald-600' : 'text-rose-600')}>{result.message}</p>}
        </div>
      </form>
    </div>
  );
}
