'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const optDecimal = z.string().optional();

const schema = z.object({
  branchId: z.string().min(1),
  periodYear: z.string().min(1),
  periodMonth: z.string().min(1),
  notes: z.string().optional(),
  adjustments: z.string().optional(),
  applyOverrides: z.string().optional(),
  overrideStockLoss: optDecimal,
  overrideExcessSales: optDecimal,
  overrideRecovery: optDecimal,
  overrideRemainingLoss: optDecimal,
  overrideOpeningBal: optDecimal,
  overrideClosingBal: optDecimal,
});

export type AdjResult = { success: boolean; message: string };

function toDecimal(v?: string): Decimal | null {
  if (!v || v.trim() === '') return null;
  try {
    return new Decimal(v);
  } catch {
    return null;
  }
}

export async function saveReportAdjustments(formData: FormData): Promise<AdjResult> {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    periodYear: formData.get('periodYear'),
    periodMonth: formData.get('periodMonth'),
    notes: formData.get('notes') || undefined,
    adjustments: formData.get('adjustments') || undefined,
    applyOverrides: formData.get('applyOverrides') || undefined,
    overrideStockLoss: formData.get('overrideStockLoss') || undefined,
    overrideExcessSales: formData.get('overrideExcessSales') || undefined,
    overrideRecovery: formData.get('overrideRecovery') || undefined,
    overrideRemainingLoss: formData.get('overrideRemainingLoss') || undefined,
    overrideOpeningBal: formData.get('overrideOpeningBal') || undefined,
    overrideClosingBal: formData.get('overrideClosingBal') || undefined,
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const d = parsed.data;
  const year = parseInt(d.periodYear);
  const month = parseInt(d.periodMonth);
  const apply = d.applyOverrides === 'on' || d.applyOverrides === 'true';

  const data = {
    notes: d.notes || null,
    adjustments: d.adjustments || null,
    applyOverrides: apply,
    overrideStockLoss: toDecimal(d.overrideStockLoss),
    overrideExcessSales: toDecimal(d.overrideExcessSales),
    overrideRecovery: toDecimal(d.overrideRecovery),
    overrideRemainingLoss: toDecimal(d.overrideRemainingLoss),
    overrideOpeningBal: toDecimal(d.overrideOpeningBal),
    overrideClosingBal: toDecimal(d.overrideClosingBal),
  };

  try {
    const existing = await prisma.reportDraft.findFirst({
      where: { branchId: d.branchId, periodYear: year, periodMonth: month },
    });

    if (existing) {
      await prisma.reportDraft.update({ where: { id: existing.id }, data });
    } else {
      await prisma.reportDraft.create({
        data: { branchId: d.branchId, periodYear: year, periodMonth: month, ...data },
      });
    }

    revalidatePath('/reports/company');
    return { success: true, message: 'Adjustments saved' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to save' };
  }
}

export async function clearOverrides(formData: FormData): Promise<AdjResult> {
  const branchId = formData.get('branchId') as string;
  const periodYear = parseInt(formData.get('periodYear') as string);
  const periodMonth = parseInt(formData.get('periodMonth') as string);

  if (!branchId || !periodYear || !periodMonth) {
    return { success: false, message: 'Missing branch or period' };
  }

  try {
    const existing = await prisma.reportDraft.findFirst({
      where: { branchId, periodYear, periodMonth },
    });
    if (existing) {
      await prisma.reportDraft.update({
        where: { id: existing.id },
        data: {
          applyOverrides: false,
          overrideStockLoss: null,
          overrideExcessSales: null,
          overrideRecovery: null,
          overrideRemainingLoss: null,
          overrideOpeningBal: null,
          overrideClosingBal: null,
        },
      });
    }
    revalidatePath('/reports/company');
    return { success: true, message: 'Overrides cleared' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed' };
  }
}
