'use client';
import { useTransition } from 'react';
import { deleteVariance } from './actions';

export function DeleteVarianceButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => { if (!confirm('Delete this variance?')) return; startTransition(async () => { await deleteVariance(id); }); }}
      disabled={isPending}
      className="text-rose-600 hover:text-rose-800 text-xs font-medium disabled:opacity-50"
    >
      {isPending ? '...' : 'Delete'}
    </button>
  );
}
