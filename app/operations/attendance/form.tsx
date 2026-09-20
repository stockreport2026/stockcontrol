'use client';
import { useState, useTransition } from 'react';
import { saveAttendance } from './actions';

type StaffRow = { id: string; name: string; employeeCode: string; branchName: string };

const STATUSES = [
  { value: '', label: '—' },
  { value: 'PRESENT', label: 'P' },
  { value: 'OFF', label: 'O' },
  { value: 'ANNUAL_LEAVE', label: 'A' },
  { value: 'SICK_LEAVE', label: 'S' },
  { value: 'ABSENT', label: 'X' },
  { value: 'PUBLIC_HOLIDAY', label: 'H' },
];

export function AttendanceGrid({
  staff,
  daysInMonth,
  year,
  month,
}: {
  staff: StaffRow[];
  daysInMonth: number;
  year: number;
  month: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  function onSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await saveAttendance(formData);
      setMsg({ text: res.message, ok: res.success });
    });
  }

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <form action={onSubmit}>
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Daily Attendance Grid</h2>
          <p className="text-xs text-slate-500">P=Present · O=Off · A=Annual · S=Sick · X=Absent · H=Holiday</p>
        </div>

        <div className="overflow-x-auto">
          <table className="text-xs border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-600 sticky left-0 bg-slate-50 z-10 min-w-[180px]">Staff</th>
                {days.map((d) => (
                  <th key={d} className="px-1 py-2 font-medium text-slate-600 text-center min-w-[44px]">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr><td colSpan={daysInMonth + 1} className="px-4 py-8 text-center text-slate-500">
                  No staff added yet. Go to Admin → Staff to add staff first.
                </td></tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="px-3 py-1.5 sticky left-0 bg-white border-r border-slate-100">
                      <div className="font-medium text-slate-900 text-xs">{s.name}</div>
                      <div className="text-[10px] text-slate-400">{s.branchName}</div>
                    </td>
                    {days.map((d) => {
                      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                      return (
                        <td key={d} className="px-0.5 py-0.5 text-center">
                          <select
                            name={`att_${s.id}__${dateStr}`}
                            className="w-10 text-center border border-slate-200 rounded text-xs px-0 py-1 bg-white"
                          >
                            {STATUSES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
                          </select>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex items-center gap-4 bg-slate-50">
          <button type="submit" disabled={isPending || staff.length === 0}
            className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
            {isPending ? 'Saving...' : 'Save Attendance'}
          </button>
          {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
        </div>
      </div>
    </form>
  );
}
