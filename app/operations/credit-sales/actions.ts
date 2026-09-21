'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  branchId: z.string().min(1, 'Branch is required'),
  staffId: z.string().optional(),
  saleDate: z.string().min(1, 'Date is required'),
  invoiceRef: z.string().min(1, 'Invoice reference is required'),
  amount: z.string().min(1, 'Amount is required'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export type CreditResult = { success: boolean; message: string };

export async function createCreditSale(formData: FormData): Promise<CreditResult> {
  const parsed = schema.safeParse({
    customerId: formData.get('customerId'),
    branchId: formData.get('branchId'),
    staffId: formData.get('staffId') || undefined,
    saleDate: formData.get('saleDate'),
    invoiceRef: formData.get('invoiceRef'),
    amount: formData.get('amount'),
    dueDate: formData.get('dueDate') || undefined,
    notes: formData.get('notes') || undefined,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  const d = parsed.data;

  let amount: Decimal;
  try {
    amount = new Decimal(d.amount);
  } catch {
    return { success: false, message: 'Amount must be a valid number' };
  }

  if (amount.isNegative() || amount.isZero()) {
    return { success: false, message: 'Amount must be greater than zero' };
  }

  try {
    await prisma.creditSale.create({
      data: {
        customerId: d.customerId,
        branchId: d.branchId,
        staffId: d.staffId || null,
        saleDate: new Date(d.saleDate),
        invoiceRef: d.invoiceRef,
        amount,
        dueDate: d.dueDate ? new Date(d.dueDate) : null,
        notes: d.notes || null,
        status: 'OUTSTANDING',
      },
    });

    revalidatePath('/operations/credit-sales');
    return { success: true, message: 'Credit sale recorded' };
  } catch (e: any) {
    if (e.code === 'P2002') {
      return { success: false, message: 'Invoice reference already exists for this customer' };
    }
    return { success: false, message: e.message || 'Failed to save' };
  }
}
