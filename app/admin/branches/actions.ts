'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  location: z.string().optional(),
  sellingDays: z.coerce.number().min(1).max(31),
});

export async function createBranch(formData: FormData) {
  const parsed = schema.safeParse({
    name: formData.get('name'),
    code: formData.get('code'),
    location: formData.get('location'),
    sellingDays: formData.get('sellingDays') ?? 26,
  });
  if (!parsed.success) return { success: false, message: 'All fields required' };
  const org = await prisma.organization.findFirst();
  if (!org) return { success: false, message: 'No organization' };
  const existing = await prisma.branch.findFirst({ where: { organizationId: org.id, code: parsed.data.code } });
  if (existing) return { success: false, message: 'Branch code already exists' };
  await prisma.branch.create({
    data: { organizationId: org.id, name: parsed.data.name, code: parsed.data.code, location: parsed.data.location || null, sellingDays: parsed.data.sellingDays },
  });
  revalidatePath('/admin/branches');
  return { success: true, message: `${parsed.data.name} added` };
}

export async function deleteBranch(id: string) {
  await prisma.branch.delete({ where: { id } });
  revalidatePath('/admin/branches');
  return { success: true, message: 'Branch deleted' };
}
