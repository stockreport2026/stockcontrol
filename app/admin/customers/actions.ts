'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  name: z.string().min(1, 'Customer name required'),
  phone: z.string().optional(),
  email: z.string().optional(),
  creditLimit: z.string().min(1, 'Credit limit required'),
  openingBalance: z.string().optional(),
});

export type CustomerResult = { success: boolean; message: string };

export async function createCustomer(formData: FormData): Promise<CustomerResult> {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    name: formData.get('name'),
    phone: formData.get('phone') || undefined,
    email: formData.get('email') || undefined,
    creditLimit: formData.get('creditLimit') || '0',
    openingBalance: formData.get('openingBalance') || '0',
  });

  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const org = await prisma.organization.findFirst();
  if (!org) return { success: false, message: 'No organization found' };

  let creditLimit: Decimal;
  let openingBalance: Decimal;
  try {
    creditLimit = new Decimal(parsed.data.creditLimit);
    openingBalance = new Decimal(parsed.data.openingBalance || '0');
  } catch {
    return { success: false, message: 'Amounts must be valid numbers' };
  }

  try {
    await prisma.customer.create({
      data: {
        organizationId: org.id,
        branchId: parsed.data.branchId,
        name: parsed.data.name,
        phone: parsed.data.phone || null,
        email: parsed.data.email || null,
        creditLimit,
        openingBalance,
      },
    });
    revalidatePath('/admin/customers');
    revalidatePath('/operations/credit-sales');
    return { success: true, message: 'Customer added' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to add customer' };
  }
}

export async function deleteCustomer(id: string): Promise<CustomerResult> {
  try {
    await prisma.customer.delete({ where: { id } });
    revalidatePath('/admin/customers');
    return { success: true, message: 'Customer deleted' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to delete' };
  }
}
