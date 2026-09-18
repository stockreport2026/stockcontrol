import { PrismaClient, Role } from '@prisma/client';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.dailySale.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: { name: 'Demo Retail Group', currency: 'KES', timezone: 'Africa/Nairobi' },
  });

  const kisumu = await prisma.branch.create({
    data: { organizationId: org.id, name: 'Kisumu Retail', code: 'KSM-001', location: 'Kisumu', sellingDays: 26 },
  });
  const nairobi = await prisma.branch.create({
    data: { organizationId: org.id, name: 'Nairobi CBD', code: 'NBO-001', location: 'Nairobi', sellingDays: 26 },
  });
  const mombasa = await prisma.branch.create({
    data: { organizationId: org.id, name: 'Mombasa Branch', code: 'MSA-001', location: 'Mombasa', sellingDays: 26 },
  });

  await prisma.user.createMany({
    data: [
      { organizationId: org.id, email: 'admin@demo.com', name: 'System Admin', role: Role.ADMIN, branchIds: [kisumu.id, nairobi.id, mombasa.id] },
      { organizationId: org.id, email: 'controller@demo.com', name: 'Faith Controller', role: Role.STOCK_CONTROLLER, branchIds: [kisumu.id] },
      { organizationId: org.id, email: 'manager@demo.com', name: 'Maurice Manager', role: Role.BRANCH_MANAGER, branchIds: [kisumu.id] },
    ],
  });

  const staffKisumu = await Promise.all([
    prisma.staff.create({ data: { organizationId: org.id, branchId: kisumu.id, firstName: 'Faith', lastName: 'Achieng', employeeCode: 'KSM-001' } }),
    prisma.staff.create({ data: { organizationId: org.id, branchId: kisumu.id, firstName: 'Maurice', lastName: 'Otieno', employeeCode: 'KSM-002' } }),
    prisma.staff.create({ data: { organizationId: org.id, branchId: kisumu.id, firstName: 'Grace', lastName: 'Wanjiku', employeeCode: 'KSM-003' } }),
  ]);

  const staffNairobi = await Promise.all([
    prisma.staff.create({ data: { organizationId: org.id, branchId: nairobi.id, firstName: 'Brian', lastName: 'Kamau', employeeCode: 'NBO-001' } }),
    prisma.staff.create({ data: { organizationId: org.id, branchId: nairobi.id, firstName: 'Sarah', lastName: 'Njeri', employeeCode: 'NBO-002' } }),
  ]);

  const allStaff = [
    ...staffKisumu.map((s) => ({ staff: s, branchId: kisumu.id })),
    ...staffNairobi.map((s) => ({ staff: s, branchId: nairobi.id })),
  ];

  const saleData: any[] = [];
  for (const { staff, branchId } of allStaff) {
    for (let day = 1; day <= 26; day++) {
      const actual = 8000 + Math.floor(Math.random() * 15000);
      const system = actual + Math.floor(Math.random() * 3000 - 1500);
      const variance = actual - system;
      saleData.push({
        branchId,
        staffId: staff.id,
        saleDate: new Date(2026, 7, day),
        actualSales: new Decimal(actual),
        systemSales: new Decimal(system),
        variance: new Decimal(variance),
        status: 'APPROVED' as const,
      });
    }
  }

  await prisma.dailySale.createMany({ data: saleData });

  console.log(`✅ Seeded ${saleData.length} sales records across ${allStaff.length} staff`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });