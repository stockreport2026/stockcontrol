'use client';

import { useState, useTransition } from 'react';
import { saveReportAdjustments, type AdjResult } from './adjustment-actions';

type Option = { id: string; label: string };

export function AdjustmentPanel({
  branches,
  initialBranchId,
  initialYear,
  initialMonth,
  initialNotes,
  initialAdjustments,
}: {
  branches: Option[];
  initialBranchId: string;
  initialYear: number;
  initialMonth: number;
  initialNotes: string;
  initialAdjustments: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AdjResult | null>(null);
  const [branchId, setBranchId] = useState(initialBranchId);
  const [notes, setNotes] = useState(initialNotes);
  const [adjustments, setAdjustments] = useState(initialAdjustments);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await saveReportAdjustments(formData);
      setResult(res);
    });
  }

  return (
    <div className="mt-8 bg-gradient-to-br from-indigo-50 to-white rounded-xl border border-indigo-100 shadow-sm p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <span className="inline-block w-6 h-6 rounded bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">AI</span>
            Report Adjustments
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Give the system your corrections, notes, or specific changes. These will appear in the final report.
          </p>
        </div>
      </div>

      <form action={onSubmit} className="space-y-4">
        <input type="hidden" name="branchId" value={branchId} />
        <input type="hidden" name="periodYear" value={initialYear} />
        <input type="hidden" name="periodMonth" value={initialMonth} />

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="w-full md:w-1/2 border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            {branches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes (management commentary)
          </label>
          <textarea
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Add context for the report..."
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-sans"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Adjustment Prompt — tell the system what to change
          </label>
          <textarea
            name="adjustments"
            value={adjustments}
            onChange={(e) => setAdjustments(e.target.value)}
            rows={4}
            placeholder="e.g. 'Exclude the Mombasa branch from stock loss as it was under renovation.'  'The Nairobi credit figure should be reviewed — customer disputed.'"
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono"
          />
          <p className="text-xs text-slate-400 mt-1">
            These prompts are saved to the report and shown to reviewers. Future versions will auto-apply them.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button type="submit" disabled={isPending}
            className="bg-indigo-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {isPending ? 'Saving...' : 'Save Adjustments'}
          </button>
          {result && <p className={'text-sm ' + (result.success ? 'text-emerald-600' : 'text-rose-600')}>{result.message}</p>}
        </div>
      </form>
    </div>
  );
}
