'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const createSaleSchema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  staffId: z.string().min(1, 'Staff is required'),
  saleDate: z.string().min(1, 'Date is required'),
  actualSales: z.string().min(1, 'Actual sales required'),
  systemSales: z.string().min(1, 'System sales required'),
});

export type SaleActionResult = {
  success: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
};

export async function createDailySale(formData: FormData): Promise<SaleActionResult> {
  const raw = {
    branchId: formData.get('branchId') as string,
    staffId: formData.get('staffId') as string,
    saleDate: formData.get('saleDate') as string,
    actualSales: formData.get('actualSales') as string,
    systemSales: formData.get('systemSales') as string,
  };

  const parsed = createSaleSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[issue.path[0] as string] = issue.message;
    }
    return { success: false, message: 'Please fix the errors below', fieldErrors };
  }

  const { branchId, staffId, saleDate, actualSales, systemSales } = parsed.data;

  let actual: Decimal;
  let system: Decimal;
  try {
    actual = new Decimal(actualSales);
    system = new Decimal(systemSales);
  } catch {
    return { success: false, message: 'Sales values must be valid numbers' };
  }

  if (actual.isNegative()) return { success: false, message: 'Actual sales cannot be negative' };
  if (system.isNegative()) return { success: false, message: 'System sales cannot be negative' };

  const variance = actual.minus(system);
  const dateObj = new Date(saleDate);
  dateObj.setHours(0, 0, 0, 0);

  const existing = await prisma.dailySale.findFirst({
    where: { branchId, staffId, saleDate: dateObj },
  });

  if (existing) {
    return {
      success: false,
      message: 'A sale record already exists for this staff member on this date.',
    };
  }

  try {
    await prisma.dailySale.create({
      data: {
        branchId,
        staffId,
        saleDate: dateObj,
        actualSales: actual,
        systemSales: system,
        variance,
        status: 'DRAFT',
      },
    });

    revalidatePath('/operations/daily-sales');
    revalidatePath('/dashboard');
    revalidatePath('/operations/staff-sales');
    revalidatePath('/operations/branch-sales');

    return { success: true, message: 'Sale recorded successfully' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to save sale' };
  }
}
