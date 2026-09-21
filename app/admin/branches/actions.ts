'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  name: z.string().min(1, 'Branch name is required'),
  code: z.string().min(1, 'Branch code is required'),
  location: z.string().optional(),
  sellingDays: z.string().optional(),
});

export type BranchResult = { success: boolean; message: string };

export async function createBranch(formData: FormData): Promise<BranchResult> {
  const parsed = schema.safeParse({
    name: formData.get('name'),
    code: formData.get('code'),
    location: formData.get('location') || undefined,
    sellingDays: formData.get('sellingDays') || '26',
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: { name: 'My Organization', currency: 'KES', timezone: 'Africa/Nairobi' },
    });
  }

  const existing = await prisma.branch.findFirst({
    where: { organizationId: org.id, code: parsed.data.code },
  });
  if (existing) return { success: false, message: 'Branch code already exists' };

  try {
    await prisma.branch.create({
      data: {
        organizationId: org.id,
        name: parsed.data.name,
        code: parsed.data.code,
        location: parsed.data.location || null,
        sellingDays: parseInt(parsed.data.sellingDays || '26') || 26,
      },
    });
    revalidatePath('/admin/branches');
    revalidatePath('/operations/branch-sales');
    revalidatePath('/operations/staff-sales');
    return { success: true, message: 'Branch added' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to add branch' };
  }
}

export async function deleteBranch(id: string): Promise<BranchResult> {
  try {
    await prisma.branch.delete({ where: { id } });
    revalidatePath('/admin/branches');
    return { success: true, message: 'Branch deleted' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to delete' };
  }
}
