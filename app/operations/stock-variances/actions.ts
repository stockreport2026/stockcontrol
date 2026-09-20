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
  expectedQty: z.string().min(1),
  actualQty: z.string().min(1),
  unitCost: z.string().min(1),
  reason: z.string().optional(),
});

export async function createVarianceItem(formData: FormData) {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    periodStartDate: formData.get('periodStartDate'),
    periodEndDate: formData.get('periodEndDate'),
    itemName: formData.get('itemName'),
    expectedQty: formData.get('expectedQty'),
    actualQty: formData.get('actualQty'),
    unitCost: formData.get('unitCost'),
    reason: formData.get('reason'),
  });
  if (!parsed.success) return { success: false, message: 'All required fields must be filled' };

  const d = parsed.data;
  let expected: Decimal, actual: Decimal, unitCost: Decimal;
  try {
    expected = new Decimal(d.expectedQty);
    actual = new Decimal(d.actualQty);
    unitCost = new Decimal(d.unitCost);
  } catch { return { success: false, message: 'Invalid numbers' }; }

  const varianceQty = expected.minus(actual);
  const varianceValue = varianceQty.times(unitCost);

  await prisma.stockVarianceItem.create({
    data: {
      branchId: d.branchId,
      periodStartDate: new Date(d.periodStartDate),
      periodEndDate: new Date(d.periodEndDate),
      itemName: d.itemName,
      expectedQty: expected,
      actualQty: actual,
      varianceQty,
      unitCost,
      varianceValue,
      reason: d.reason || null,
    },
  });
  revalidatePath('/operations/stock-variances');
  return { success: true, message: `Variance for ${d.itemName} recorded` };
}

export async function deleteVarianceItem(id: string) {
  await prisma.stockVarianceItem.delete({ where: { id } });
  revalidatePath('/operations/stock-variances');
  return { success: true, message: 'Deleted' };
}

export async function updateVarianceReason(id: string, reason: string) {
  await prisma.stockVarianceItem.update({ where: { id }, data: { reason } });
  revalidatePath('/operations/stock-variances');
  return { success: true, message: 'Reason updated' };
}
