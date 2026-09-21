'use client';
import { useTransition } from 'react';
import { deleteStaff } from './actions';

export function DeleteStaffButton({ id, name }: { id: string; name: string }) {
  const [isPending, startTransition] = useTransition();
  function onClick() {
    if (!confirm('Delete staff "' + name + '"?')) return;
    startTransition(async () => {
      const res = await deleteStaff(id);
      if (!res.success) alert(res.message);
    });
  }
  return (
    <button onClick={onClick} disabled={isPending}
      className="text-xs text-rose-600 hover:text-rose-800 disabled:opacity-50">
      {isPending ? '...' : 'Delete'}
    </button>
  );
}
