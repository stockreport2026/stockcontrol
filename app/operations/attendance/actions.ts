'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';

const attSchema = z.object({
  staffId: z.string().min(1, 'Staff is required'),
  branchId: z.string().min(1, 'Branch is required'),
  attendanceDate: z.string().min(1, 'Date is required'),
  status: z.enum(['PRESENT','OFF','ANNUAL_LEAVE','SICK_LEAVE','ABSENT','PUBLIC_HOLIDAY','OTHER']),
  comment: z.string().optional(),
});

export type AttResult = { success: boolean; message: string };

export async function recordAttendance(formData: FormData): Promise<AttResult> {
  const parsed = attSchema.safeParse({
    staffId: formData.get('staffId'),
    branchId: formData.get('branchId'),
    attendanceDate: formData.get('attendanceDate'),
    status: formData.get('status'),
    comment: formData.get('comment'),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0].message };
  }

  const { staffId, branchId, attendanceDate, status, comment } = parsed.data;
  const dateObj = new Date(attendanceDate);
  dateObj.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findFirst({
    where: { staffId, attendanceDate: dateObj },
  });

  try {
    if (existing) {
      await prisma.attendance.update({
        where: { id: existing.id },
        data: { status, comment: comment || null, branchId },
      });
      revalidatePath('/operations/attendance');
      return { success: true, message: 'Attendance updated' };
    }

    await prisma.attendance.create({
      data: {
        staffId,
        branchId,
        attendanceDate: dateObj,
        status,
        comment: comment || null,
      },
    });

    revalidatePath('/operations/attendance');
    return { success: true, message: 'Attendance recorded' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Failed to save attendance' };
  }
}
