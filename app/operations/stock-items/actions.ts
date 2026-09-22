'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  periodYear: z.string().min(1),
  periodMonth: z.string().min(1),
  periodStartDate: z.string().min(1, 'Period From required'),
  periodEndDate: z.string().min(1, 'Period To required'),
  itemName: z.string().min(1, 'Drug name is required'),
  quantity: z.string().min(1, 'Quantity is required'),
  unitCost: z.string().min(1, 'Unit cost is required'),
  reason: z.string().optional(),
});

export type SIResult = { success: boolean; message: string };

export async function addStockItem(formData: FormData): Promise<SIResult> {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    periodYear: formData.get('periodYear'),
    periodMonth: formData.get('periodMonth'),
    periodStartDate: formData.get('periodStartDate'),
    periodEndDate: formData.get('periodEndDate'),
    itemName: formData.get('itemName'),
    quantity: formData.get('quantity'),
    unitCost: formData.get('unitCost'),
    reason: formData.get('reason') || undefined,
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const d = parsed.data;
  let qty: Decimal, cost: Decimal;
  try {
    qty = new Decimal(d.quantity);
    cost = new Decimal(d.unitCost);
  } catch {
    return { success: false, message: 'Quantity and cost must be valid numbers' };
  }
  if (qty.isNegative() || cost.isNegative()) {
    return { success: false, message: 'Quantity and cost cannot be negative' };
  }

  const totalValue = qty.times(cost);

  try {
    await prisma.stockVarianceItem.create({
      data: {
        branchId: d.branchId,
        periodStartDate: new Date(d.periodStartDate),
        periodEndDate: new Date(d.periodEndDate),
        itemName: d.itemName,
        expectedQty: qty,
        actualQty: qty,
        varianceQty: new Decimal(0),
        unitCost: cost,
        varianceValue: totalValue,
        reason: d.reason || null,
      },
    });
    revalidatePath('/operations/stock-items');
    revalidatePath('/reports/company');
    return { success: true, message: 'Item added' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to add item' };
  }
}

export async function deleteStockItem(id: string): Promise<SIResult> {
  try {
    await prisma.stockVarianceItem.delete({ where: { id } });
    revalidatePath('/operations/stock-items');
    return { success: true, message: 'Item deleted' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to delete' };
  }
}
