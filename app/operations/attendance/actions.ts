'use server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';

export async function saveAttendance(formData: FormData) {
  const entries = Array.from(formData.entries()).filter(([k]) => k.startsWith('att_'));
  if (entries.length === 0) return { success: false, message: 'No attendance entries' };

  let saved = 0;
  for (const [key, value] of entries) {
    const parts = key.replace('att_', '').split('__');
    const staffId = parts[0];
    const dateStr = parts[1];
    const status = String(value).trim();
    if (!status) continue;

    const dateObj = new Date(dateStr);
    dateObj.setHours(0, 0, 0, 0);

    const staff = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staff) continue;

    await prisma.attendance.upsert({
      where: { staffId_attendanceDate: { staffId, attendanceDate: dateObj } },
      create: { staffId, branchId: staff.branchId, attendanceDate: dateObj, status: status as any },
      update: { status: status as any },
    });
    saved++;
  }

  revalidatePath('/operations/attendance');
  return { success: true, message: `${saved} attendance entries saved` };
}
