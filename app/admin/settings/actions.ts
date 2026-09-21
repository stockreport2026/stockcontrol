'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  name: z.string().min(1),
  currency: z.string().min(1),
  timezone: z.string().min(1),
});

export type SettingsResult = { success: boolean; message: string };

export async function updateOrgSettings(formData: FormData): Promise<SettingsResult> {
  const parsed = schema.safeParse({
    name: formData.get('name'),
    currency: formData.get('currency'),
    timezone: formData.get('timezone'),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const org = await prisma.organization.findFirst();
  if (!org) return { success: false, message: 'No organization exists. Create a branch first.' };

  try {
    await prisma.organization.update({
      where: { id: org.id },
      data: parsed.data,
    });
    revalidatePath('/admin/settings');
    return { success: true, message: 'Settings saved' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to save' };
  }
}
