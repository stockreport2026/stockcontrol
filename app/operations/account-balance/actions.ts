'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1),
  periodYear: z.string().min(1),
  periodMonth: z.string().min(1),
  periodStartDate: z.string().min(1),
  periodEndDate: z.string().min(1),
  openingBalance: z.string().min(1),
  closingBalance: z.string().min(1),
  additionalInfo: z.string().optional(),
});

export type ABResult = { success: boolean; message: string };

export async function saveAccountBalance(formData: FormData): Promise<ABResult> {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    periodYear: formData.get('periodYear'),
    periodMonth: formData.get('periodMonth'),
    periodStartDate: formData.get('periodStartDate'),
    periodEndDate: formData.get('periodEndDate'),
    openingBalance: formData.get('openingBalance'),
    closingBalance: formData.get('closingBalance'),
    additionalInfo: formData.get('additionalInfo') || undefined,
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const d = parsed.data;
  let opening: Decimal, closing: Decimal;
  try {
    opening = new Decimal(d.openingBalance);
    closing = new Decimal(d.closingBalance);
  } catch {
    return { success: false, message: 'Balances must be valid numbers' };
  }

  const year = parseInt(d.periodYear);
  const month = parseInt(d.periodMonth);

  try {
    const existing = await prisma.accountBalance.findFirst({
      where: { branchId: d.branchId, periodYear: year, periodMonth: month },
    });

    if (existing) {
      await prisma.accountBalance.update({
        where: { id: existing.id },
        data: {
          periodStartDate: new Date(d.periodStartDate),
          periodEndDate: new Date(d.periodEndDate),
          openingBalance: opening,
          closingBalance: closing,
          additionalInfo: d.additionalInfo || null,
        },
      });
    } else {
      await prisma.accountBalance.create({
        data: {
          branchId: d.branchId,
          periodYear: year,
          periodMonth: month,
          periodStartDate: new Date(d.periodStartDate),
          periodEndDate: new Date(d.periodEndDate),
          openingBalance: opening,
          closingBalance: closing,
          additionalInfo: d.additionalInfo || null,
        },
      });
    }

    revalidatePath('/operations/account-balance');
    return { success: true, message: existing ? 'Account balance updated' : 'Account balance saved' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to save' };
  }
}
