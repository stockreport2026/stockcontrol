'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const itemSchema = z.object({
  id: z.string().min(1),
  actualQty: z.string(),
});

export async function updateStocktakeItems(formData: FormData, stocktakeId: string) {
  const entries = Array.from(formData.entries()).filter(([k]) => k.startsWith('actual_'));

  for (const [key, value] of entries) {
    const id = key.replace('actual_', '');
    const actualStr = String(value).trim();
    if (actualStr === '') continue;

    let actual: Decimal;
    try {
      actual = new Decimal(actualStr);
    } catch {
      continue;
    }

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
      },
    });
  }

  revalidatePath(`/operations/stocktake/${stocktakeId}`);
  return { success: true, message: 'Stocktake items updated' };
}

export async function approveStocktake(stocktakeId: string) {
  await prisma.stocktake.update({
    where: { id: stocktakeId },
    data: { status: 'APPROVED' },
  });
  revalidatePath(`/operations/stocktake/${stocktakeId}`);
  revalidatePath('/operations/stocktake');
  return { success: true, message: 'Stocktake approved' };
}
