'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1, 'Branch required'),
  firstName: z.string().min(1, 'First name required'),
  lastName: z.string().min(1, 'Last name required'),
  employeeCode: z.string().min(1, 'Employee code required'),
});

export async function createStaff(formData: FormData) {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    employeeCode: formData.get('employeeCode'),
  });
  if (!parsed.success) return { success: false, message: parsed.error.issues[0].message };

  const org = await prisma.organization.findFirst();
  if (!org) return { success: false, message: 'No organization' };

  const d = parsed.data;
  const existing = await prisma.staff.findFirst({
    where: { organizationId: org.id, employeeCode: d.employeeCode },
  });
  if (existing) return { success: false, message: 'Employee code already exists' };

  await prisma.staff.create({
    data: {
      organizationId: org.id,
      branchId: d.branchId,
      firstName: d.firstName,
      lastName: d.lastName,
      employeeCode: d.employeeCode,
    },
  });

  revalidatePath('/admin/staff');
  return { success: true, message: `${d.firstName} ${d.lastName} added` };
}

export async function deleteStaff(id: string) {
  await prisma.staff.delete({ where: { id } });
  revalidatePath('/admin/staff');
  return { success: true, message: 'Staff removed' };
}
