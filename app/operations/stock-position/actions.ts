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
  openingStockValue: z.string().min(1, 'Stock before stocktake required'),
  closingStockValue: z.string().min(1, 'Stock after stocktake required'),
  notes: z.string().optional(),
});

export type SPResult = { success: boolean; message: string };

export async function saveStockPosition(formData: FormData): Promise<SPResult> {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    periodYear: formData.get('periodYear'),
    periodMonth: formData.get('periodMonth'),
    periodStartDate: formData.get('periodStartDate'),
    periodEndDate: formData.get('periodEndDate'),
    openingStockValue: formData.get('openingStockValue'),
    closingStockValue: formData.get('closingStockValue'),
    notes: formData.get('notes') || undefined,
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const d = parsed.data;
  let opening: Decimal, closing: Decimal;
  try {
    opening = new Decimal(d.openingStockValue);
    closing = new Decimal(d.closingStockValue);
  } catch {
    return { success: false, message: 'Values must be valid numbers' };
  }
  if (opening.isNegative() || closing.isNegative()) {
    return { success: false, message: 'Stock values cannot be negative' };
  }

  // Variance = Opening - Closing. Positive = loss (stock reduced more than expected).
  const variance = opening.minus(closing);
  const startDate = new Date(d.periodStartDate);
  const endDate = new Date(d.periodEndDate);

  try {
    const existing = await prisma.stockPosition.findFirst({
      where: { branchId: d.branchId, periodStartDate: startDate, periodEndDate: endDate },
    });

    if (existing) {
      await prisma.stockPosition.update({
        where: { id: existing.id },
        data: { openingStockValue: opening, closingStockValue: closing, variance, notes: d.notes || null },
      });
    } else {
      await prisma.stockPosition.create({
        data: {
          branchId: d.branchId,
          periodStartDate: startDate,
          periodEndDate: endDate,
          openingStockValue: opening,
          closingStockValue: closing,
          variance,
          notes: d.notes || null,
        },
      });
    }

    revalidatePath('/operations/stock-position');
    revalidatePath('/reconciliation/recovery');
    revalidatePath('/operations/account-balance');
    return { success: true, message: existing ? 'Stock position updated' : 'Stock position saved' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to save' };
  }
}

export async function deleteStockPosition(id: string): Promise<SPResult> {
  try {
    await prisma.stockPosition.delete({ where: { id } });
    revalidatePath('/operations/stock-position');
    return { success: true, message: 'Deleted' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to delete' };
  }
}
