'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  staffId: z.string().min(1, 'Staff is required'),
  periodYear: z.string().min(1),
  periodMonth: z.string().min(1),
  periodStartDate: z.string().min(1, 'Period From is required'),
  periodEndDate: z.string().min(1, 'Period To is required'),
  actualSales: z.string().min(1, 'Actual sales is required'),
  systemSales: z.string().min(1, 'System sales is required'),
});

export type StaffSalesResult = { success: boolean; message: string };

export async function saveStaffSales(formData: FormData): Promise<StaffSalesResult> {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    staffId: formData.get('staffId'),
    periodYear: formData.get('periodYear'),
    periodMonth: formData.get('periodMonth'),
    periodStartDate: formData.get('periodStartDate'),
    periodEndDate: formData.get('periodEndDate'),
    actualSales: formData.get('actualSales'),
    systemSales: formData.get('systemSales'),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const d = parsed.data;

  let actual: Decimal, system: Decimal;
  try {
    actual = new Decimal(d.actualSales);
    system = new Decimal(d.systemSales);
  } catch {
    return { success: false, message: 'Sales must be valid numbers' };
  }
  if (actual.isNegative() || system.isNegative()) {
    return { success: false, message: 'Sales cannot be negative' };
  }

  const year = parseInt(d.periodYear);
  const month = parseInt(d.periodMonth);
  const variance = actual.minus(system);

  try {
    const existing = await prisma.staffSales.findFirst({
      where: { staffId: d.staffId, periodYear: year, periodMonth: month },
    });

    if (existing) {
      await prisma.staffSales.update({
        where: { id: existing.id },
        data: {
          branchId: d.branchId,
          periodStartDate: new Date(d.periodStartDate),
          periodEndDate: new Date(d.periodEndDate),
          actualSales: actual,
          systemSales: system,
          variance,
        },
      });
      revalidatePath('/operations/staff-sales');
      revalidatePath('/reconciliation/sales');
      revalidatePath('/reports/company');
      return { success: true, message: 'Staff sales updated' };
    }

    await prisma.staffSales.create({
      data: {
        branchId: d.branchId,
        staffId: d.staffId,
        periodYear: year,
        periodMonth: month,
        periodStartDate: new Date(d.periodStartDate),
        periodEndDate: new Date(d.periodEndDate),
        actualSales: actual,
        systemSales: system,
        variance,
      },
    });
    revalidatePath('/operations/staff-sales');
    revalidatePath('/reconciliation/sales');
    revalidatePath('/reports/company');
    return { success: true, message: 'Staff sales recorded' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to save' };
  }
}

export async function deleteStaffSales(id: string): Promise<StaffSalesResult> {
  try {
    await prisma.staffSales.delete({ where: { id } });
    revalidatePath('/operations/staff-sales');
    return { success: true, message: 'Deleted' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to delete' };
  }
}
