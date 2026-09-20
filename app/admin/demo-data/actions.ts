'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

const schema = z.object({
  branchId: z.string().min(1),
  year: z.coerce.number(),
  month: z.coerce.number().min(1).max(12),
  staffCount: z.coerce.number().min(1).max(10),
});

const FIRST = ['Mary','Peter','Grace','David','Faith','John','Esther','Daniel','Ruth','Joseph','Mercy','Samuel'];
const LAST = ['Odhiambo','Otieno','Wafula','Ochieng','Achieng','Kamau','Njeri','Mwangi','Akinyi','Onyango'];

export async function generateDemoData(formData: FormData) {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    year: formData.get('year'),
    month: formData.get('month'),
    staffCount: formData.get('staffCount'),
  });
  if (!parsed.success) return { success: false, message: 'Invalid input' };

  const { branchId, year, month, staffCount } = parsed.data;
  const org = await prisma.organization.findFirst();
  if (!org) return { success: false, message: 'No organization' };

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return { success: false, message: 'Branch not found' };

  const newStaff = [];
  for (let i = 0; i < staffCount; i++) {
    const fn = FIRST[i % FIRST.length];
    const ln = LAST[i % LAST.length];
    const empCode = `${branch.code}-S${String(i + 1).padStart(2, '0')}`;
    const existing = await prisma.staff.findFirst({ where: { organizationId: org.id, employeeCode: empCode } });
    if (existing) { newStaff.push(existing); continue; }
    const s = await prisma.staff.create({
      data: { organizationId: org.id, branchId: branch.id, firstName: fn, lastName: ln, employeeCode: empCode },
    });
    newStaff.push(s);
  }

  // Period sales per staff
  for (const staff of newStaff) {
    const system = 150000 + Math.floor(Math.random() * 250000);
    const variance = Math.floor(Math.random() * 30000 - 12000);
    const actual = system + variance;
    await prisma.staffSales.upsert({
      where: { staffId_periodYear_periodMonth: { staffId: staff.id, periodYear: year, periodMonth: month } },
      create: { branchId: branch.id, staffId: staff.id, periodYear: year, periodMonth: month, periodStartDate: new Date(year, month - 1, 1), periodEndDate: new Date(year, month, 0), actualSales: new Decimal(actual), systemSales: new Decimal(system), variance: new Decimal(variance) },
      update: { actualSales: new Decimal(actual), systemSales: new Decimal(system), variance: new Decimal(variance) },
    });
  }

  // Attendance
  for (const staff of newStaff) {
    await prisma.attendance.upsert({
      where: { staffId_periodYear_periodMonth: { staffId: staff.id, periodYear: year, periodMonth: month } },
      create: { staffId: staff.id, branchId: branch.id, periodYear: year, periodMonth: month, daysWorked: 26, leaveDays: 0 },
      update: { daysWorked: 26 },
    });
  }

  // Account balance
  await prisma.accountBalance.upsert({
    where: { branchId_periodYear_periodMonth: { branchId: branch.id, periodYear: year, periodMonth: month } },
    create: { branchId: branch.id, periodYear: year, periodMonth: month, periodStartDate: new Date(year, month - 1, 1), periodEndDate: new Date(year, month, 0), openingBalance: new Decimal(75000), closingBalance: new Decimal(0) },
    update: {},
  });

  revalidatePath('/admin/demo-data');
  return { success: true, message: `Created ${newStaff.length} staff with period sales for ${branch.name}` };
}
