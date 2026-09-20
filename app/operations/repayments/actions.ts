'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  customerId: z.string().min(1),
  branchId: z.string().min(1),
  paymentDate: z.string().min(1),
  amount: z.string().min(1),
  paymentMethod: z.string().min(1),
  receiptRef: z.string().min(1),
  notes: z.string().optional(),
});

export async function createRepayment(formData: FormData) {
  const parsed = schema.safeParse({
    customerId: formData.get('customerId'),
    branchId: formData.get('branchId'),
    paymentDate: formData.get('paymentDate'),
    amount: formData.get('amount'),
    paymentMethod: formData.get('paymentMethod'),
    receiptRef: formData.get('receiptRef'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) return { success: false, message: 'All required fields must be filled' };

  const d = parsed.data;
  let amount: Decimal;
  try { amount = new Decimal(d.amount); } catch { return { success: false, message: 'Invalid amount' }; }
  if (amount.isNegative() || amount.isZero()) return { success: false, message: 'Amount must be positive' };

  const existing = await prisma.repayment.findFirst({ where: { receiptRef: d.receiptRef } });
  if (existing) return { success: false, message: 'Receipt reference already exists' };

  await prisma.repayment.create({
    data: {
      customerId: d.customerId, branchId: d.branchId,
      paymentDate: new Date(d.paymentDate), amount,
      paymentMethod: d.paymentMethod, receiptRef: d.receiptRef,
      notes: d.notes || null,
    },
  });
  revalidatePath('/operations/repayments');
  return { success: true, message: `Repayment ${d.receiptRef} recorded` };
}
