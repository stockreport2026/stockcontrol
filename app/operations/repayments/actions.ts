'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1),
  staffId: z.string().min(1),
  customerName: z.string().optional(),
  paymentDate: z.string().min(1),
  amount: z.string().min(1),
  notes: z.string().optional(),
});

export async function createRepayment(formData: FormData) {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    staffId: formData.get('staffId'),
    customerName: formData.get('customerName'),
    paymentDate: formData.get('paymentDate'),
    amount: formData.get('amount'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) return { success: false, message: 'All fields required' };

  const d = parsed.data;
  let amount: Decimal;
  try { amount = new Decimal(d.amount); } catch { return { success: false, message: 'Invalid amount' }; }
  if (amount.isNegative() || amount.isZero()) return { success: false, message: 'Amount must be positive' };

  await prisma.repayment.create({
    data: {
      branchId: d.branchId,
      staffId: d.staffId,
      customerName: d.customerName || null,
      paymentDate: new Date(d.paymentDate),
      amount,
      notes: d.notes || null,
    },
  });
  revalidatePath('/operations/repayments');
  revalidatePath('/operations/credit-sales');
  return { success: true, message: `Repayment recorded` };
}

export async function deleteRepayment(id: string) {
  await prisma.repayment.delete({ where: { id } });
  revalidatePath('/operations/repayments');
  revalidatePath('/operations/credit-sales');
  return { success: true, message: 'Deleted' };
}
