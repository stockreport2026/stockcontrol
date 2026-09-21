'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';

const createBranchSchema = z.object({
  name: z.string().min(1, 'Branch name is required'),
  code: z.string().min(1, 'Branch code is required'),
  location: z.string().optional(),
  sellingDays: z.string().min(1),
});

export type BranchResult = { success: boolean; message: string };

export async function createBranch(formData: FormData): Promise<BranchResult> {
  const parsed = createBranchSchema.safeParse({
    name: formData.get('name'),
    code: formData.get('code'),
    location: formData.get('location') || undefined,
    sellingDays: formData.get('sellingDays') || '26',
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  const org = await prisma.organization.findFirst();
  if (!org) {
    return { success: false, message: 'No organization found. Create one first.' };
  }

  const existing = await prisma.branch.findFirst({
    where: { organizationId: org.id, code: parsed.data.code },
  });
  if (existing) {
    return { success: false, message: 'A branch with this code already exists' };
  }

  try {
    await prisma.branch.create({
      data: {
        organizationId: org.id,
        name: parsed.data.name,
        code: parsed.data.code,
        location: parsed.data.location || null,
        sellingDays: parseInt(parsed.data.sellingDays) || 26,
      },
    });

    revalidatePath('/admin/branches');
    revalidatePath('/dashboard');
    return { success: true, message: 'Branch created' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to create branch' };
  }
}

export async function deleteBranch(id: string): Promise<BranchResult> {
  try {
    await prisma.branch.delete({ where: { id } });
    revalidatePath('/admin/branches');
    revalidatePath('/dashboard');
    return { success: true, message: 'Branch deleted' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to delete branch' };
  }
}
