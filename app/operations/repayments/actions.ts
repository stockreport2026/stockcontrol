'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  branchId: z.string().min(1, 'Branch is required'),
  staffId: z.string().optional(),
  paymentDate: z.string().min(1, 'Date is required'),
  amount: z.string().min(1, 'Amount is required'),
  paymentMethod: z.enum(['CASH', 'MPESA', 'BANK', 'CHEQUE', 'CARD']),
  receiptRef: z.string().min(1, 'Receipt reference is required'),
  notes: z.string().optional(),
});

export type RepayResult = { success: boolean; message: string };

export async function createRepayment(formData: FormData): Promise<RepayResult> {
  const parsed = schema.safeParse({
    customerId: formData.get('customerId'),
    branchId: formData.get('branchId'),
    staffId: formData.get('staffId') || undefined,
    paymentDate: formData.get('paymentDate'),
    amount: formData.get('amount'),
    paymentMethod: formData.get('paymentMethod'),
    receiptRef: formData.get('receiptRef'),
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
    await prisma.repayment.create({
      data: {
        customerId: d.customerId,
        branchId: d.branchId,
        staffId: d.staffId || null,
        paymentDate: new Date(d.paymentDate),
        amount,
        paymentMethod: d.paymentMethod,
        receiptRef: d.receiptRef,
        notes: d.notes || null,
      },
    });

    revalidatePath('/operations/repayments');
    return { success: true, message: 'Repayment recorded' };
  } catch (e: any) {
    if (e.code === 'P2002') {
      return { success: false, message: 'Receipt reference already exists' };
    }
    return { success: false, message: e.message || 'Failed to save' };
  }
}
