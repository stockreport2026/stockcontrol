'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1),
  periodYear: z.coerce.number().int().min(2020).max(2100),
  periodMonth: z.coerce.number().int().min(1).max(12),
  periodStartDate: z.string().min(1),
  periodEndDate: z.string().min(1),
  openingBalance: z.string(),
  closingBalance: z.string(),
  additionalInfo: z.string().optional(),
});

export async function saveAccountBalance(formData: FormData) {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    periodYear: formData.get('periodYear'),
    periodMonth: formData.get('periodMonth'),
    periodStartDate: formData.get('periodStartDate'),
    periodEndDate: formData.get('periodEndDate'),
    openingBalance: formData.get('openingBalance'),
    closingBalance: formData.get('closingBalance'),
    additionalInfo: formData.get('additionalInfo'),
  });

  if (!parsed.success) {
    return { success: false, message: 'Please fill all required fields correctly' };
  }

  const d = parsed.data;
  const opening = new Decimal(d.openingBalance || '0');
  const closing = new Decimal(d.closingBalance || '0');

  await prisma.accountBalance.upsert({
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
      periodStartDate: new Date(d.periodStartDate),
      periodEndDate: new Date(d.periodEndDate),
      openingBalance: opening,
      closingBalance: closing,
      additionalInfo: d.additionalInfo || null,
    },
    update: {
      periodStartDate: new Date(d.periodStartDate),
      periodEndDate: new Date(d.periodEndDate),
      openingBalance: opening,
      closingBalance: closing,
      additionalInfo: d.additionalInfo || null,
    },
  });

  revalidatePath('/operations/account-balance');
  return { success: true, message: 'Account balance saved' };
}
