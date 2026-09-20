'use client';

import { useState, useTransition } from 'react';
import { saveAccountBalance } from './actions';

export function AccountBalanceForm({
  branches, defaultYear, defaultMonth,
}: {
  branches: { id: string; label: string }[];
  defaultYear: number;
  defaultMonth: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);

  const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res = await saveAccountBalance(formData);
      setSuccess(res.success);
      setMessage(res.message);
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 max-w-3xl">
      <form action={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
            <select name="branchId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
            <input type="number" name="periodYear" value={year} onChange={(e) => setYear(parseInt(e.target.value) || defaultYear)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
            <select name="periodMonth" value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <div />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Period Start Date</label>
            <input type="date" name="periodStartDate" defaultValue={firstDay} required
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Period End Date</label>
            <input type="date" name="periodEndDate" defaultValue={lastDay} required
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div />

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Opening Balance (KES)</label>
            <input type="number" step="0.01" name="openingBalance" required placeholder="0.00"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Closing Balance (KES)</label>
            <input type="number" step="0.01" name="closingBalance" required placeholder="0.00"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Additional Information (optional — will appear on the report)
          </label>
          <textarea name="additionalInfo" rows={4}
            placeholder="Any narrative, notes, or context to include on the generated report..."
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button type="submit" disabled={isPending}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : 'Save Account Balance'}
          </button>
          {message && <p className={`text-sm ${success ? 'text-green-600' : 'text-red-600'}`}>{message}</p>}
        </div>
      </form>
    </div>
  );
}
