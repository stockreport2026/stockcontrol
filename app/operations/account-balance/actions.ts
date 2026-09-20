'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1),
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/),
  openingBalance: z.string(),
  closingBalance: z.string(),
  notes: z.string().optional(),
});

export async function saveAccountBalance(formData: FormData) {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    periodMonth: formData.get('periodMonth'),
    openingBalance: formData.get('openingBalance'),
    closingBalance: formData.get('closingBalance'),
    notes: formData.get('notes'),
  });
  if (!parsed.success) return { success: false, message: 'Invalid input' };

  const { branchId, periodMonth, openingBalance, closingBalance, notes } = parsed.data;
  const key = `account_balance_${branchId}_${periodMonth}`;

  const org = await prisma.organization.findFirst();
  if (!org) return { success: false, message: 'No organization found' };

  const value = {
    openingBalance: new Decimal(openingBalance).toFixed(2),
    closingBalance: new Decimal(closingBalance).toFixed(2),
    notes: notes || null,
    updatedAt: new Date().toISOString(),
  };

  // We reuse the system_settings table for simple key-value storage
  await (prisma as any).systemSetting?.upsert?.({
    where: { organizationId_key: { organizationId: org.id, key } },
    create: { organizationId: org.id, key, value },
    update: { value },
  }).catch(async () => {
    // fallback if system setting table doesn't exist
    await (prisma as any).$executeRawUnsafe(
      `CREATE TABLE IF NOT EXISTS "system_settings" (
        "id" TEXT PRIMARY KEY,
        "organizationId" TEXT NOT NULL,
        "key" TEXT NOT NULL,
        "value" JSONB NOT NULL,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE("organizationId", "key")
      )`
    );
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO "system_settings" ("id", "organizationId", "key", "value")
       VALUES (gen_random_uuid()::text, $1, $2, $3::jsonb)
       ON CONFLICT ("organizationId", "key") DO UPDATE SET "value" = $3::jsonb`,
      org.id, key, JSON.stringify(value)
    );
  });

  revalidatePath('/operations/account-balance');
  return { success: true, message: 'Account balance saved' };
}
