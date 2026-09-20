'use server';

import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

export async function saveStocktakeCounts(formData: FormData, stocktakeId: string) {
  const stocktake = await prisma.stocktake.findUnique({ where: { id: stocktakeId } });
  if (!stocktake) return { success: false, message: 'Stocktake not found' };
  if (stocktake.status === 'APPROVED') return { success: false, message: 'Stocktake is approved and locked' };

  const entries = Array.from(formData.entries()).filter(([k]) => k.startsWith('actual_'));
  let saved = 0;

  for (const [key, value] of entries) {
    const id = key.replace('actual_', '');
    const actualStr = String(value).trim();

    let actual = new Decimal(0);
    if (actualStr !== '') {
      try { actual = new Decimal(actualStr); } catch { continue; }
      if (actual.isNegative()) continue;
    }

    const notesKey = `notes_${id}`;
    const notes = formData.get(notesKey) as string | null;

    const item = await prisma.stocktakeItem.findUnique({ where: { id } });
    if (!item) continue;

    const expected = new Decimal(item.expectedQty.toString());
    const varianceQty = expected.minus(actual);
    const varianceValue = varianceQty.times(item.unitCost.toString());

    await prisma.stocktakeItem.update({
      where: { id },
      data: {
        actualQty: actual,
        varianceQty,
        varianceValue,
        notes: notes || null,
      },
    });
    saved++;
  }

  revalidatePath(`/operations/stocktake/${stocktakeId}`);
  revalidatePath('/operations/stocktake');
  return { success: true, message: `${saved} item counts saved` };
}

export async function approveStocktake(stocktakeId: string) {
  const stocktake = await prisma.stocktake.findUnique({
    where: { id: stocktakeId },
    include: { items: true },
  });
  if (!stocktake) return { success: false, message: 'Stocktake not found' };

  const uncounted = stocktake.items.filter((i) => new Decimal(i.actualQty.toString()).isZero()).length;
  if (uncounted > 0) {
    return { success: false, message: `Cannot approve: ${uncounted} items still have 0 actual qty. Enter all counts first.` };
  }

  await prisma.stocktake.update({ where: { id: stocktakeId }, data: { status: 'APPROVED' } });
  revalidatePath(`/operations/stocktake/${stocktakeId}`);
  revalidatePath('/operations/stocktake');
  return { success: true, message: 'Stocktake approved and locked' };
}

export async function reopenStocktake(stocktakeId: string) {
  await prisma.stocktake.update({ where: { id: stocktakeId }, data: { status: 'DRAFT' } });
  revalidatePath(`/operations/stocktake/${stocktakeId}`);
  revalidatePath('/operations/stocktake');
  return { success: true, message: 'Stocktake reopened for editing' };
}
