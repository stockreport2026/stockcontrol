'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1),
  staffId: z.string().min(1),
  customerName: z.string().min(1),
  saleDate: z.string().min(1),
  amount: z.string().min(1),
});

export async function createCreditSale(formData: FormData) {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    staffId: formData.get('staffId'),
    customerName: formData.get('customerName'),
    saleDate: formData.get('saleDate'),
    amount: formData.get('amount'),
  });
  if (!parsed.success) return { success: false, message: 'All fields required' };

  const d = parsed.data;
  let amount: Decimal;
  try { amount = new Decimal(d.amount); } catch { return { success: false, message: 'Invalid amount' }; }
  if (amount.isNegative() || amount.isZero()) return { success: false, message: 'Amount must be positive' };

  await prisma.creditSale.create({
    data: {
      branchId: d.branchId,
      staffId: d.staffId,
      customerName: d.customerName,
      saleDate: new Date(d.saleDate),
      amount,
    },
  });
  revalidatePath('/operations/credit-sales');
  return { success: true, message: `Credit to ${d.customerName} recorded` };
}

export async function deleteCreditSale(id: string) {
  await prisma.creditSale.delete({ where: { id } });
  revalidatePath('/operations/credit-sales');
  return { success: true, message: 'Deleted' };
}
