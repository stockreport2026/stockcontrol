'use client';
import { useTransition } from 'react';
import { deleteStockItem } from './actions';

export function DeleteItemButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  function onClick() {
    if (!confirm('Delete this item?')) return;
    startTransition(async () => {
      const res = await deleteStockItem(id);
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
