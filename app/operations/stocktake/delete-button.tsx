'use client';
import { useTransition } from 'react';
import { deleteStockPosition } from './actions';

export function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm('Delete this stock position? Cannot be undone.')) return;
        startTransition(async () => { await deleteStockPosition(id); });
      }}
      disabled={isPending}
      className="text-rose-600 hover:text-rose-800 text-xs font-medium disabled:opacity-50"
    >
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  );
}
