import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning transactional data...');

  await prisma.attendance.deleteMany();
  await prisma.accountBalance.deleteMany();
  await prisma.stocktakeItem.deleteMany();
  await prisma.stocktake.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.repayment.deleteMany();
  await prisma.creditSale.deleteMany();
  await prisma.staffSales.deleteMany();
  await prisma.staff.deleteMany();

  const counts = await Promise.all([
    prisma.organization.count(),
    prisma.branch.count(),
    prisma.stockItem.count(),
    prisma.user.count(),
    prisma.staff.count(),
    prisma.staffSales.count(),
    prisma.creditSale.count(),
    prisma.repayment.count(),
    prisma.stocktake.count(),
    prisma.stockTransaction.count(),
    prisma.attendance.count(),
    prisma.accountBalance.count(),
  ]);

  console.log('✅ Cleanup complete');
  console.log('📊 Data remaining:');
  console.log(`   Organizations:    ${counts[0]}`);
  console.log(`   Branches:         ${counts[1]}`);
  console.log(`   Stock Items:      ${counts[2]}`);
  console.log(`   Users:            ${counts[3]}`);
  console.log(`   Staff:            ${counts[4]}  ← should be 0`);
  console.log(`   Sales Records:    ${counts[5]}  ← should be 0`);
  console.log(`   Credit Sales:     ${counts[6]}  ← should be 0`);
  console.log(`   Repayments:       ${counts[7]}  ← should be 0`);
  console.log(`   Stocktakes:       ${counts[8]}  ← should be 0`);
  console.log(`   Stock Movements:  ${counts[9]}  ← should be 0`);
  console.log(`   Attendance:       ${counts[10]}  ← should be 0`);
  console.log(`   Account Balances: ${counts[11]}  ← should be 0`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
