import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst();
  if (!org) {
    console.error('No organization found. Run main seed first.');
    return;
  }

  // Idempotent: upsert periods
  await prisma.reportingPeriod.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'July 2026' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'July 2026',
      startDate: new Date(2026, 5, 30),
      endDate: new Date(2026, 6, 31),
      status: 'CLOSED',
    },
  });

  await prisma.reportingPeriod.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'August 2026' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'August 2026',
      startDate: new Date(2026, 6, 31),
      endDate: new Date(2026, 7, 28),
      status: 'UNDER_REVIEW',
    },
  });

  await prisma.reportingPeriod.upsert({
    where: { organizationId_name: { organizationId: org.id, name: 'September 2026' } },
    update: {},
    create: {
      organizationId: org.id,
      name: 'September 2026',
      startDate: new Date(2026, 7, 28),
      endDate: new Date(2026, 8, 30),
      status: 'OPEN',
    },
  });

  console.log('✅ Reporting periods seeded');
}

main().finally(() => prisma.$disconnect());
