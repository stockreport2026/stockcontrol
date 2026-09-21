'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1),
  periodYear: z.string().min(1),
  periodMonth: z.string().min(1),
  periodStartDate: z.string().min(1),
  periodEndDate: z.string().min(1),
  actualSales: z.string().min(1),
  systemSales: z.string().min(1),
  notes: z.string().optional(),
});

export type BranchSalesResult = { success: boolean; message: string };

export async function saveBranchSales(formData: FormData): Promise<BranchSalesResult> {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    periodYear: formData.get('periodYear'),
    periodMonth: formData.get('periodMonth'),
    periodStartDate: formData.get('periodStartDate'),
    periodEndDate: formData.get('periodEndDate'),
    actualSales: formData.get('actualSales'),
    systemSales: formData.get('systemSales'),
    notes: formData.get('notes') || undefined,
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
    const existing = await prisma.branchSales.findFirst({
      where: { branchId: d.branchId, periodYear: year, periodMonth: month },
    });

    if (existing) {
      await prisma.branchSales.update({
        where: { id: existing.id },
        data: {
          periodStartDate: new Date(d.periodStartDate),
          periodEndDate: new Date(d.periodEndDate),
          actualSales: actual,
          systemSales: system,
          variance,
          notes: d.notes || null,
        },
      });
    } else {
      await prisma.branchSales.create({
        data: {
          branchId: d.branchId,
          periodYear: year,
          periodMonth: month,
          periodStartDate: new Date(d.periodStartDate),
          periodEndDate: new Date(d.periodEndDate),
          actualSales: actual,
          systemSales: system,
          variance,
          notes: d.notes || null,
        },
      });
    }

    revalidatePath('/operations/branch-sales');
    revalidatePath('/reports/company');
    return { success: true, message: existing ? 'Branch sales updated' : 'Branch sales recorded' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to save' };
  }
}

export async function deleteBranchSales(id: string): Promise<BranchSalesResult> {
  try {
    await prisma.branchSales.delete({ where: { id } });
    revalidatePath('/operations/branch-sales');
    return { success: true, message: 'Deleted' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to delete' };
  }
}
