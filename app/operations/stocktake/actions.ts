'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1),
  periodYear: z.coerce.number().min(2020).max(2100),
  periodMonth: z.coerce.number().min(1).max(12),
  openingStockValue: z.string().min(1),
  closingStockValue: z.string().min(1),
  notes: z.string().optional(),
});

export async function saveStockPosition(formData: FormData) {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    periodYear: formData.get('periodYear'),
    periodMonth: formData.get('periodMonth'),
    openingStockValue: formData.get('openingStockValue'),
    closingStockValue: formData.get('closingStockValue'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) return { success: false, message: 'All fields required' };

  const d = parsed.data;
  let opening: Decimal, closing: Decimal;
  try {
    opening = new Decimal(d.openingStockValue);
    closing = new Decimal(d.closingStockValue);
  } catch { return { success: false, message: 'Invalid amounts' }; }
  if (opening.isNegative() || closing.isNegative()) return { success: false, message: 'Values cannot be negative' };

  // Variance = opening − closing (positive = loss, negative = surplus)
  const variance = opening.minus(closing);

  await prisma.stockPosition.upsert({
    where: {
      branchId_periodYear_periodMonth: {
        branchId: d.branchId,
        periodYear: d.periodYear,
        periodMonth: d.periodMonth,
      },
    },
    create: {
      branchId: d.branchId,
      periodYear: d.periodYear,
      periodMonth: d.periodMonth,
      openingStockValue: opening,
      closingStockValue: closing,
      variance,
      notes: d.notes || null,
    },
    update: {
      openingStockValue: opening,
      closingStockValue: closing,
      variance,
      notes: d.notes || null,
    },
  });

  revalidatePath('/operations/stocktake');
  revalidatePath('/reports/monthly');
  return { success: true, message: 'Stock position saved' };
}

export async function deleteStockPosition(id: string) {
  await prisma.stockPosition.delete({ where: { id } });
  revalidatePath('/operations/stocktake');
  return { success: true, message: 'Deleted' };
}
