'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const txSchema = z.object({
  stockItemId: z.string().min(1),
  branchId: z.string().min(1),
  type: z.enum(['OPENING','PURCHASE','TRANSFER_IN','TRANSFER_OUT','SALE','RETURN','ADJUSTMENT']),
  quantity: z.string().min(1),
  transactionDate: z.string().min(1),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export type TxResult = { success: boolean; message: string };

export async function createStockTx(formData: FormData): Promise<TxResult> {
  const parsed = txSchema.safeParse({
    stockItemId: formData.get('stockItemId'),
    branchId: formData.get('branchId'),
    type: formData.get('type'),
    quantity: formData.get('quantity'),
    transactionDate: formData.get('transactionDate'),
    reference: formData.get('reference'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  const { stockItemId, branchId, type, quantity, transactionDate, reference, notes } = parsed.data;

  let qty: Decimal;
  try {
    qty = new Decimal(quantity);
  } catch {
    return { success: false, message: 'Quantity must be a valid number' };
  }

  if (qty.isZero()) {
    return { success: false, message: 'Quantity cannot be zero' };
  }

  // Positive types: OPENING, PURCHASE, TRANSFER_IN, RETURN
  // Negative types: TRANSFER_OUT, SALE
  // ADJUSTMENT: user-provided sign (may be + or -)
  const isNegativeType = ['TRANSFER_OUT', 'SALE'].includes(type);
  const finalQty = isNegativeType ? qty.abs().negated() : qty;

  const item = await prisma.stockItem.findUnique({ where: { id: stockItemId } });
  if (!item) return { success: false, message: 'Stock item not found' };

  const value = finalQty.times(item.unitCost.toString());

  try {
    await prisma.stockTransaction.create({
      data: {
        stockItemId,
        branchId,
        transactionDate: new Date(transactionDate),
        type: type as any,
        quantity: finalQty,
        unitCost: item.unitCost,
        value,
        reference: reference || null,
        notes: notes || null,
      },
    });

    revalidatePath('/operations/stock');
    return { success: true, message: 'Stock movement recorded' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to save' };
  }
}
