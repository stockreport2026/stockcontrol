'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  staffId: z.string().min(1),
  periodYear: z.coerce.number(),
  periodMonth: z.coerce.number().min(1).max(12),
  daysWorked: z.coerce.number().min(0).max(31),
  leaveDays: z.coerce.number().min(0).max(31),
  comment: z.string().optional(),
});

export async function saveAttendance(formData: FormData) {
  const parsed = schema.safeParse({
    staffId: formData.get('staffId'),
    periodYear: formData.get('periodYear'),
    periodMonth: formData.get('periodMonth'),
    daysWorked: formData.get('daysWorked'),
    leaveDays: formData.get('leaveDays'),
    comment: formData.get('comment'),
  });
  if (!parsed.success) return { success: false, message: 'Invalid input' };

  const d = parsed.data;
  const staff = await prisma.staff.findUnique({ where: { id: d.staffId } });
  if (!staff) return { success: false, message: 'Staff not found' };

  await prisma.attendance.upsert({
    where: { staffId_periodYear_periodMonth: { staffId: d.staffId, periodYear: d.periodYear, periodMonth: d.periodMonth } },
    create: {
      staffId: d.staffId,
      branchId: staff.branchId,
      periodYear: d.periodYear,
      periodMonth: d.periodMonth,
      daysWorked: d.daysWorked,
      leaveDays: d.leaveDays,
      comment: d.comment || null,
    },
    update: {
      daysWorked: d.daysWorked,
      leaveDays: d.leaveDays,
      comment: d.comment || null,
    },
  });

  revalidatePath('/operations/attendance');
  return { success: true, message: 'Attendance saved' };
}
