'use client';
import { useTransition } from 'react';
import { deleteVarianceItem } from './actions';

export function DeleteVarianceButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm('Delete this variance item?')) return;
        startTransition(async () => { await deleteVarianceItem(id); });
      }}
      disabled={isPending}
      className="text-rose-600 hover:text-rose-800 text-xs font-medium disabled:opacity-50"
    >
      {isPending ? '...' : 'Delete'}
    </button>
  );
}
