'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1),
  staffId: z.string().min(1),
  periodStartDate: z.string().min(1),
  periodEndDate: z.string().min(1),
  actualSales: z.string().min(1),
  systemSales: z.string().min(1),
});

export async function saveStaffSales(formData: FormData) {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    staffId: formData.get('staffId'),
    periodStartDate: formData.get('periodStartDate'),
    periodEndDate: formData.get('periodEndDate'),
    actualSales: formData.get('actualSales'),
    systemSales: formData.get('systemSales'),
  });
  if (!parsed.success) return { success: false, message: 'All fields required' };

  const d = parsed.data;

  let actual: Decimal, system: Decimal;
  try {
    actual = new Decimal(d.actualSales);
    system = new Decimal(d.systemSales);
  } catch { return { success: false, message: 'Invalid numbers' }; }
  if (actual.isNegative() || system.isNegative()) return { success: false, message: 'Sales cannot be negative' };

  const start = new Date(d.periodStartDate);
  const end = new Date(d.periodEndDate);
  if (start > end) return { success: false, message: 'Start date must be before end date' };

  const periodYear = start.getFullYear();
  const periodMonth = start.getMonth() + 1;

  const variance = actual.minus(system);

  await prisma.staffSales.upsert({
    where: { staffId_periodYear_periodMonth: { staffId: d.staffId, periodYear, periodMonth } },
    create: {
      branchId: d.branchId,
      staffId: d.staffId,
      periodYear,
      periodMonth,
      periodStartDate: start,
      periodEndDate: end,
      actualSales: actual,
      systemSales: system,
      variance,
    },
    update: {
      periodStartDate: start,
      periodEndDate: end,
      actualSales: actual,
      systemSales: system,
      variance,
    },
  });

  revalidatePath('/operations/sales');
  return { success: true, message: 'Sales saved' };
}

export async function deleteStaffSales(id: string) {
  await prisma.staffSales.delete({ where: { id } });
  revalidatePath('/operations/sales');
  return { success: true, message: 'Deleted' };
}
