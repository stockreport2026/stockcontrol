'use client';

import { useRouter } from 'next/navigation';

type Period = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
};

export function PeriodSelector({
  periods,
  selectedId,
}: {
  periods: Period[];
  selectedId: string | null;
}) {
  const router = useRouter();

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm mb-6">
      <label className="block text-sm font-medium text-slate-700 mb-2">
        Select Reporting Period
      </label>
      <select
        value={selectedId ?? ''}
        onChange={(e) => {
          router.push('/reports/monthly?periodId=' + e.target.value);
        }}
        className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
      >
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} · {formatDate(p.startDate)} → {formatDate(p.endDate)} [{p.status}]
          </option>
        ))}
      </select>
      {selectedId && (
        <p className="text-xs text-slate-500 mt-2">
          Report data will be filtered to this period&apos;s date range only.
        </p>
      )}
    </div>
  );
}
