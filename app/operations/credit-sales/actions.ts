'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  customerId: z.string().min(1),
  branchId: z.string().min(1),
  saleDate: z.string().min(1),
  invoiceRef: z.string().min(1),
  amount: z.string().min(1),
  notes: z.string().optional(),
});

export async function createCreditSale(formData: FormData) {
  const parsed = schema.safeParse({
    customerId: formData.get('customerId'),
    branchId: formData.get('branchId'),
    saleDate: formData.get('saleDate'),
    invoiceRef: formData.get('invoiceRef'),
    amount: formData.get('amount'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) return { success: false, message: 'All required fields must be filled' };

  const d = parsed.data;
  let amount: Decimal;
  try { amount = new Decimal(d.amount); } catch { return { success: false, message: 'Invalid amount' }; }
  if (amount.isNegative() || amount.isZero()) return { success: false, message: 'Amount must be positive' };

  const existing = await prisma.creditSale.findFirst({ where: { customerId: d.customerId, invoiceRef: d.invoiceRef } });
  if (existing) return { success: false, message: 'Invoice reference already exists for this customer' };

  await prisma.creditSale.create({
    data: {
      customerId: d.customerId, branchId: d.branchId,
      saleDate: new Date(d.saleDate),
      invoiceRef: d.invoiceRef, amount, notes: d.notes || null,
      status: 'OUTSTANDING',
    },
  });
  revalidatePath('/operations/credit-sales');
  return { success: true, message: `Credit sale ${d.invoiceRef} recorded` };
}

export async function createCustomer(formData: FormData) {
  const schema2 = z.object({
    branchId: z.string().min(1),
    name: z.string().min(1),
    phone: z.string().optional(),
    creditLimit: z.string().optional(),
  });
  const parsed = schema2.safeParse({
    branchId: formData.get('branchId'),
    name: formData.get('name'),
    phone: formData.get('phone'),
    creditLimit: formData.get('creditLimit'),
  });
  if (!parsed.success) return { success: false, message: 'Branch and name required' };
  const org = await prisma.organization.findFirst();
  if (!org) return { success: false, message: 'No organization' };
  await prisma.customer.create({
    data: {
      organizationId: org.id, branchId: parsed.data.branchId,
      name: parsed.data.name, phone: parsed.data.phone || null,
      creditLimit: new Decimal(parsed.data.creditLimit || '0'),
      openingBalance: new Decimal(0),
    },
  });
  revalidatePath('/operations/credit-sales');
  return { success: true, message: `Customer ${parsed.data.name} added` };
}
