'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1),
  periodStartDate: z.string().min(1),
  periodEndDate: z.string().min(1),
  itemName: z.string().min(1),
  systemQty: z.string().min(1),
  actualQty: z.string().min(1),
  unitCost: z.string().min(1),
  reason: z.string().optional(),
});

export async function saveStockVariance(formData: FormData) {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    periodStartDate: formData.get('periodStartDate'),
    periodEndDate: formData.get('periodEndDate'),
    itemName: formData.get('itemName'),
    systemQty: formData.get('systemQty'),
    actualQty: formData.get('actualQty'),
    unitCost: formData.get('unitCost'),
    reason: formData.get('reason'),
  });
  if (!parsed.success) return { success: false, message: 'All required fields must be filled' };

  const d = parsed.data;
  let sysQty: Decimal, actQty: Decimal, unitCost: Decimal;
  try {
    sysQty = new Decimal(d.systemQty);
    actQty = new Decimal(d.actualQty);
    unitCost = new Decimal(d.unitCost);
  } catch { return { success: false, message: 'Invalid numbers' }; }

  if (sysQty.isNegative() || actQty.isNegative() || unitCost.isNegative()) {
    return { success: false, message: 'Values cannot be negative' };
  }

  const start = new Date(d.periodStartDate);
  const end = new Date(d.periodEndDate);
  if (start > end) return { success: false, message: 'Start date must be before end date' };

  // Variance Qty = System − Actual (positive = loss, negative = surplus)
  const varianceQty = sysQty.minus(actQty);
  const varianceValue = varianceQty.times(unitCost);

  const existing = await prisma.stockVarianceItem.findFirst({
    where: {
      branchId: d.branchId,
      periodStartDate: start,
      periodEndDate: end,
      itemName: d.itemName,
    },
  });

  if (existing) {
    await prisma.stockVarianceItem.update({
      where: { id: existing.id },
      data: {
        expectedQty: sysQty,
        actualQty: actQty,
        varianceQty,
        unitCost,
        varianceValue,
        reason: d.reason || null,
      },
    });
  } else {
    await prisma.stockVarianceItem.create({
      data: {
        branchId: d.branchId,
        periodStartDate: start,
        periodEndDate: end,
        itemName: d.itemName,
        expectedQty: sysQty,
        actualQty: actQty,
        varianceQty,
        unitCost,
        varianceValue,
        reason: d.reason || null,
      },
    });
  }

  revalidatePath('/operations/stock-variances');
  return { success: true, message: `${d.itemName} saved` };
}

export async function deleteVariance(id: string) {
  await prisma.stockVarianceItem.delete({ where: { id } });
  revalidatePath('/operations/stock-variances');
  return { success: true, message: 'Deleted' };
}
