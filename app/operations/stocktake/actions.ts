'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1),
  periodStartDate: z.string().min(1),
  periodEndDate: z.string().min(1),
  openingStockValue: z.string().min(1),
  closingStockValue: z.string().min(1),
  notes: z.string().optional(),
});

export async function saveStockPosition(formData: FormData) {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    periodStartDate: formData.get('periodStartDate'),
    periodEndDate: formData.get('periodEndDate'),
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

  const start = new Date(d.periodStartDate);
  const end = new Date(d.periodEndDate);
  if (start > end) return { success: false, message: 'Start date must be before end date' };

  const variance = opening.minus(closing);

  await prisma.stockPosition.upsert({
    where: {
      branchId_periodStartDate_periodEndDate: {
        branchId: d.branchId,
        periodStartDate: start,
        periodEndDate: end,
      },
    },
    create: {
      branchId: d.branchId,
      periodStartDate: start,
      periodEndDate: end,
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
  return { success: true, message: 'Stock position saved' };
}

export async function deleteStockPosition(id: string) {
  await prisma.stockPosition.delete({ where: { id } });
  revalidatePath('/operations/stocktake');
  return { success: true, message: 'Deleted' };
}
