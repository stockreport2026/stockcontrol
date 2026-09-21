'use client';

import { useState, useTransition } from 'react';
import { updateOrgSettings, type SettingsResult } from './actions';

export function SettingsForm({
  initial,
}: {
  initial: { name: string; currency: string; timezone: string };
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<SettingsResult | null>(null);

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await updateOrgSettings(formData);
      setResult(res);
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Organization Settings</h2>
      <form action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
            <input type="text" name="name" required defaultValue={initial.name}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
            <input type="text" name="currency" required defaultValue={initial.currency}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
            <input type="text" name="timezone" required defaultValue={initial.timezone}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-2">
          <button type="submit" disabled={isPending}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : 'Save Settings'}
          </button>
          {result && (
            <p className={'text-sm ' + (result.success ? 'text-emerald-600' : 'text-rose-600')}>
              {result.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
