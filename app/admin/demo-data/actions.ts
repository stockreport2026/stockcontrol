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
  daysToGenerate: z.coerce.number().min(1).max(31),
});

const FIRST = ['Mary','Peter','Grace','David','Faith','John','Esther','Daniel','Ruth','Joseph','Mercy','Samuel'];
const LAST = ['Odhiambo','Otieno','Wafula','Ochieng','Achieng','Kamau','Njeri','Mwangi','Akinyi','Onyango'];

export async function generateDemoData(formData: FormData) {
  const parsed = schema.safeParse({
    branchId: formData.get('branchId'),
    year: formData.get('year'),
    month: formData.get('month'),
    staffCount: formData.get('staffCount'),
    daysToGenerate: formData.get('daysToGenerate'),
  });
  if (!parsed.success) return { success: false, message: 'Invalid input' };

  const { branchId, year, month, staffCount, daysToGenerate } = parsed.data;

  const org = await prisma.organization.findFirst();
  if (!org) return { success: false, message: 'No organization' };

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return { success: false, message: 'Branch not found' };

  // Create staff
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

  // Generate daily sales
  let created = 0;
  for (const staff of newStaff) {
    for (let day = 1; day <= daysToGenerate; day++) {
      const dateObj = new Date(year, month - 1, day);
      const dow = dateObj.getDay();
      if (dow === 0) continue;
      const base = 8000 + Math.floor(Math.random() * 12000);
      const variance = Math.floor(Math.random() * 2600 - 1200);
      const actual = base + variance;
      try {
        await prisma.dailySale.upsert({
          where: { branchId_staffId_saleDate: { branchId: branch.id, staffId: staff.id, saleDate: dateObj } },
          create: { branchId: branch.id, staffId: staff.id, saleDate: dateObj, actualSales: new Decimal(actual), systemSales: new Decimal(base), variance: new Decimal(variance), status: 'APPROVED' },
          update: { actualSales: new Decimal(actual), systemSales: new Decimal(base), variance: new Decimal(variance) },
        });
        created++;
      } catch {}
    }
  }

  // Attendance for the month (one row per staff)
  for (const staff of newStaff) {
    try {
      await prisma.attendance.upsert({
        where: { staffId_periodYear_periodMonth: { staffId: staff.id, periodYear: year, periodMonth: month } },
        create: {
          staffId: staff.id,
          branchId: branch.id,
          periodYear: year,
          periodMonth: month,
          daysWorked: daysToGenerate,
          leaveDays: 0,
        },
        update: { daysWorked: daysToGenerate },
      });
    } catch {}
  }

  // Account balance
  try {
    await prisma.accountBalance.upsert({
      where: { branchId_periodYear_periodMonth: { branchId: branch.id, periodYear: year, periodMonth: month } },
      create: {
        branchId: branch.id, periodYear: year, periodMonth: month,
        periodStartDate: new Date(year, month - 1, 1), periodEndDate: new Date(year, month, 0),
        openingBalance: new Decimal(75000), closingBalance: new Decimal(0),
      },
      update: {},
    });
  } catch {}

  revalidatePath('/admin/demo-data');
  return { success: true, message: `Created ${newStaff.length} staff and ${created} daily sales for ${branch.name}` };
}
