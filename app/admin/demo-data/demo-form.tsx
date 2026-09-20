'use client';

import { useState, useTransition } from 'react';
import { generateDemoData } from './actions';

export function DemoForm({ branches }: { branches: { id: string; label: string }[] }) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const now = new Date();
  const defaultYear = now.getFullYear();
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();

  function onSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const res = await generateDemoData(formData);
      setMessage({ text: res.message, ok: res.success });
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <form action={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
          <select name="branchId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
            <input type="number" name="year" defaultValue={defaultYear} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
            <select name="month" defaultValue={defaultMonth} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' })}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Number of Staff</label>
            <input type="number" name="staffCount" defaultValue={3} min={1} max={10} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Selling Days</label>
            <input type="number" name="daysToGenerate" defaultValue={26} min={1} max={31} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-4 pt-2">
          <button type="submit" disabled={isPending} className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Generating...' : '⚡ Generate Demo Data'}
          </button>
          {message && <span className={`text-sm ${message.ok ? 'text-green-600' : 'text-red-600'}`}>{message.text}</span>}
        </div>
      </form>
    </div>
  );
}
