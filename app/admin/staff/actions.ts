'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1, 'Branch is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
});

export type StaffResult = { success: boolean; message: string };

export async function createStaff(formData: FormData): Promise<StaffResult> {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const org = await prisma.organization.findFirst();
  if (!org) return { success: false, message: 'No organization found' };

  try {
    await prisma.staff.create({
      data: {
        organizationId: org.id,
        branchId: parsed.data.branchId,
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
      },
    });
    revalidatePath('/admin/staff');
    revalidatePath('/operations/staff-sales');
    return { success: true, message: 'Staff added' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to add staff' };
  }
}

export async function deleteStaff(id: string): Promise<StaffResult> {
  try {
    await prisma.staff.delete({ where: { id } });
    revalidatePath('/admin/staff');
    return { success: true, message: 'Staff deleted' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to delete' };
  }
}
