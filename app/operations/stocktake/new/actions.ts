'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1),
  stocktakeDate: z.string().min(1),
  notes: z.string().optional(),
});

async function getExpectedQuantity(stockItemId: string, branchId: string): Promise<Decimal> {
  const txs = await prisma.stockTransaction.findMany({
    where: { stockItemId, branchId },
    select: { quantity: true },
  });
  return txs.reduce((sum, tx) => sum.plus(tx.quantity.toString()), new Decimal(0));
}

export async function createStocktake(formData: FormData): Promise<void> {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    stocktakeDate: formData.get('stocktakeDate'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) throw new Error('Please fill all required fields');

  const { branchId, stocktakeDate, notes } = parsed.data;

  const existing = await prisma.stocktake.findFirst({
    where: { branchId, stocktakeDate: new Date(stocktakeDate), status: 'DRAFT' },
  });
  if (existing) redirect(`/operations/stocktake/${existing.id}`);

  const items = await prisma.stockItem.findMany({ where: { isActive: true } });

  const stocktakeItems = await Promise.all(
    items.map(async (item) => {
      const expected = await getExpectedQuantity(item.id, branchId);
      return {
        stockItemId: item.id,
        expectedQty: expected,
        actualQty: new Decimal(0),
        varianceQty: expected,
        unitCost: item.unitCost,
        varianceValue: expected.times(item.unitCost.toString()),
      };
    })
  );

  const stocktake = await prisma.stocktake.create({
    data: {
      branchId,
      stocktakeDate: new Date(stocktakeDate),
      notes: notes || null,
      status: 'DRAFT',
      items: { create: stocktakeItems },
    },
  });

  redirect(`/operations/stocktake/${stocktake.id}`);
}
