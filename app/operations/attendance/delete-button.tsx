'use client';
import { useTransition } from 'react';
import { deleteAttendance } from './actions';

export function DeleteAttendanceButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => { if (!confirm('Delete this attendance record?')) return; startTransition(async () => { await deleteAttendance(id); }); }}
      disabled={isPending}
      className="text-rose-600 hover:text-rose-800 text-xs font-medium disabled:opacity-50"
    >
      {isPending ? '...' : 'Delete'}
    </button>
  );
}
