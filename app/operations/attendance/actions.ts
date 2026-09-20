'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  staffId: z.string().min(1),
  periodStartDate: z.string().min(1),
  periodEndDate: z.string().min(1),
  daysWorked: z.coerce.number().min(0).max(31),
  leaveDays: z.coerce.number().min(0).max(31),
  comment: z.string().optional(),
});

export async function saveAttendance(formData: FormData) {
  const parsed = schema.safeParse({
    staffId: formData.get('staffId'),
    periodStartDate: formData.get('periodStartDate'),
    periodEndDate: formData.get('periodEndDate'),
    daysWorked: formData.get('daysWorked'),
    leaveDays: formData.get('leaveDays'),
    comment: formData.get('comment'),
  });
  if (!parsed.success) return { success: false, message: 'Invalid input' };

  const d = parsed.data;
  const staff = await prisma.staff.findUnique({ where: { id: d.staffId } });
  if (!staff) return { success: false, message: 'Staff not found' };

  const start = new Date(d.periodStartDate);
  const end = new Date(d.periodEndDate);
  if (start > end) return { success: false, message: 'Start date must be before end date' };

  const existing = await prisma.attendance.findFirst({
    where: { staffId: d.staffId, periodStartDate: start, periodEndDate: end },
  });

  if (existing) {
    await prisma.attendance.update({
      where: { id: existing.id },
      data: { daysWorked: d.daysWorked, leaveDays: d.leaveDays, comment: d.comment || null },
    });
  } else {
    await prisma.attendance.create({
      data: {
        staffId: d.staffId, branchId: staff.branchId,
        periodStartDate: start, periodEndDate: end,
        daysWorked: d.daysWorked, leaveDays: d.leaveDays,
        comment: d.comment || null,
      },
    });
  }

  revalidatePath('/operations/attendance');
  return { success: true, message: 'Attendance saved' };
}

export async function deleteAttendance(id: string) {
  await prisma.attendance.delete({ where: { id } });
  revalidatePath('/operations/attendance');
  return { success: true, message: 'Deleted' };
}
