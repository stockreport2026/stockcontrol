'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1),
  stocktakeDate: z.string().min(1),
  notes: z.string().optional(),
});

export type StResult = { success: boolean; message: string; stocktakeId?: string };

export async function createStocktake(formData: FormData): Promise<StResult> {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    stocktakeDate: formData.get('stocktakeDate'),
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const countsRaw = formData.get('counts') as string;
  if (!countsRaw) return { success: false, message: 'No item counts provided' };

  let counts: { stockItemId: string; actualQty: string }[];
  try {
    counts = JSON.parse(countsRaw);
  } catch {
    return { success: false, message: 'Invalid count data' };
  }

  const itemIds = counts.map((c) => c.stockItemId);
  const items = await prisma.stockItem.findMany({ where: { id: { in: itemIds } } });
  const itemsMap = new Map(items.map((i) => [i.id, i]));

  // Calculate expected qty for each item based on all transactions
  const lineItems: any[] = [];
  for (const c of counts) {
    const item = itemsMap.get(c.stockItemId);
    if (!item) continue;

    const txs = await prisma.stockTransaction.findMany({
      where: { stockItemId: c.stockItemId, branchId: parsed.data.branchId },
    });

    const expectedQty = txs.reduce(
      (sum, tx) => sum.plus(tx.quantity.toString()),
      new Decimal(0)
    );

    let actualQty: Decimal;
    try {
      actualQty = new Decimal(c.actualQty || '0');
    } catch {
      continue;
    }

    const varianceQty = expectedQty.minus(actualQty);
    const varianceValue = varianceQty.times(item.unitCost.toString());

    lineItems.push({
      stockItemId: c.stockItemId,
      expectedQty,
      actualQty,
      varianceQty,
      unitCost: item.unitCost,
      varianceValue,
    });
  }

  try {
    const st = await prisma.stocktake.create({
      data: {
        branchId: parsed.data.branchId,
        stocktakeDate: new Date(parsed.data.stocktakeDate),
        status: 'SUBMITTED',
        notes: parsed.data.notes || null,
        items: { create: lineItems },
      },
    });
    revalidatePath('/operations/stocktake');
    revalidatePath('/reconciliation/recovery');
    return { success: true, message: 'Stocktake recorded', stocktakeId: st.id };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to save stocktake' };
  }
}
