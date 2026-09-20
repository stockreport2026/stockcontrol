'use client';
import { useTransition } from 'react';
import { deleteRepayment } from './actions';

export function DeleteRepaymentButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm('Delete this repayment?')) return;
        startTransition(async () => { await deleteRepayment(id); });
      }}
      disabled={isPending}
      className="text-rose-600 hover:text-rose-800 text-xs font-medium disabled:opacity-50"
    >
      {isPending ? '...' : 'Delete'}
    </button>
  );
}
