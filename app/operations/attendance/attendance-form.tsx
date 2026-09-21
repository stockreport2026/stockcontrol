'use client';

import { useState, useTransition } from 'react';
import { recordAttendance, type AttResult } from './actions';

type Option = { id: string; label: string };

const STATUSES = [
  { value: 'PRESENT', label: 'Present' },
  { value: 'OFF', label: 'Off' },
  { value: 'ANNUAL_LEAVE', label: 'Annual Leave' },
  { value: 'SICK_LEAVE', label: 'Sick Leave' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'PUBLIC_HOLIDAY', label: 'Public Holiday' },
  { value: 'OTHER', label: 'Other' },
];

export function AttendanceForm({
  staffByBranch,
  branches,
}: {
  staffByBranch: Record<string, Option[]>;
  branches: Option[];
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<AttResult | null>(null);
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id ?? '');
  const [selectedStaff, setSelectedStaff] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('PRESENT');

  const staffOptions = staffByBranch[selectedBranch] ?? [];

  function onSubmit(formData: FormData) {
    setResult(null);
    startTransition(async () => {
      const res = await recordAttendance(formData);
      setResult(res);
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Record Attendance</h2>

      <form action={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
            <select
              name="branchId"
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedStaff('');
              }}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Staff Member</label>
            <select
              name="staffId"
              value={selectedStaff || staffOptions[0]?.id || ''}
              onChange={(e) => setSelectedStaff(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              {staffOptions.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              name="attendanceDate"
              required
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              name="status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Comment (optional)</label>
            <input
              type="text"
              name="comment"
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : 'Record Attendance'}
          </button>
          {result && (
            <p className={'text-sm ' + (result.success ? 'text-green-600' : 'text-red-600')}>
              {result.message}
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
