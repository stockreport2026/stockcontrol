'use client';
import { useState, useTransition } from 'react';
import { saveAttendance } from './actions';

export function AttendanceForm({ branches, staff }: { branches: any[]; staff: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [branchId, setBranchId] = useState(branches[0]?.id ?? '');
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() === 0 ? 12 : now.getMonth());

  const staffForBranch = staff.filter((s) => s.branchId === branchId);

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await saveAttendance(formData);
      setMsg({ text: res.message, ok: res.success });
      if (res.success) (document.getElementById('att-form') as HTMLFormElement)?.reset();
    });
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
      <h2 className="text-lg font-semibold text-slate-900 mb-4">Record Attendance</h2>
      <form id="att-form" action={onSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
          <select name="branchId" value={branchId} onChange={(e) => setBranchId(e.target.value)} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-700 mb-1">Staff</label>
          <select name="staffId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            {staffForBranch.length === 0
              ? <option value="">— No staff —</option>
              : staffForBranch.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Year</label>
          <input type="number" name="periodYear" value={year} onChange={(e) => setYear(parseInt(e.target.value) || year)} required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
          <select name="periodMonth" value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString('en-GB', { month: 'short' })}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Days Worked</label>
          <input type="number" name="daysWorked" required min={0} max={31} defaultValue={26} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">Leave Days</label>
          <input type="number" name="leaveDays" required min={0} max={31} defaultValue={0} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-4">
          <label className="block text-xs font-medium text-slate-700 mb-1">Comment (optional)</label>
          <input type="text" name="comment" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div className="md:col-span-6 flex items-center gap-4 pt-2">
          <button type="submit" disabled={isPending || staffForBranch.length === 0}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : 'Save Attendance'}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </form>
    </div>
  );
}
