'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1),
  periodYear: z.string().min(1),
  periodMonth: z.string().min(1),
  notes: z.string().optional(),
  adjustments: z.string().optional(),
});

export type AdjResult = { success: boolean; message: string };

export async function saveReportAdjustments(formData: FormData): Promise<AdjResult> {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    periodYear: formData.get('periodYear'),
    periodMonth: formData.get('periodMonth'),
    notes: formData.get('notes') || undefined,
    adjustments: formData.get('adjustments') || undefined,
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const d = parsed.data;
  const year = parseInt(d.periodYear);
  const month = parseInt(d.periodMonth);

  try {
    const existing = await prisma.reportDraft.findFirst({
      where: { branchId: d.branchId, periodYear: year, periodMonth: month },
    });

    if (existing) {
      await prisma.reportDraft.update({
        where: { id: existing.id },
        data: { notes: d.notes || null, adjustments: d.adjustments || null },
      });
    } else {
      await prisma.reportDraft.create({
        data: {
          branchId: d.branchId,
          periodYear: year,
          periodMonth: month,
          notes: d.notes || null,
          adjustments: d.adjustments || null,
        },
      });
    }

    revalidatePath('/reports/company');
    return { success: true, message: 'Adjustments saved' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to save' };
  }
}
