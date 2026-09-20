import { PrismaClient, Role, StockTxType } from '@prisma/client';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

const BRANCHES = [
  { name: 'Kisumu Retail', code: 'MED-KSM-01', location: 'Kisumu' },
  { name: 'Bondo A', code: 'MED-BND-01', location: 'Bondo' },
  { name: 'Bondo B', code: 'MED-BND-02', location: 'Bondo' },
  { name: 'Ahero', code: 'MED-AHR-01', location: 'Ahero' },
  { name: 'Kachar', code: 'MED-KCH-01', location: 'Kachar' },
  { name: 'Busia', code: 'MED-BSA-01', location: 'Busia' },
  { name: 'Homabay', code: 'MED-HBY-01', location: 'Homabay' },
  { name: 'Kendu Bay', code: 'MED-KND-01', location: 'Kendu Bay' },
  { name: 'Oyugis', code: 'MED-OYG-01', location: 'Oyugis' },
  { name: 'Mbita', code: 'MED-MBT-01', location: 'Mbita' },
  { name: 'Ndhiwa', code: 'MED-NDH-01', location: 'Ndhiwa' },
  { name: 'Sori', code: 'MED-SOR-01', location: 'Sori' },
  { name: 'Kehanch', code: 'MED-KEH-01', location: 'Kehanch' },
  { name: 'Sirare', code: 'MED-SIR-01', location: 'Sirare' },
  { name: 'Sindo', code: 'MED-SIN-01', location: 'Sindo' },
  { name: 'Masara', code: 'MED-MAS-01', location: 'Masara' },
  { name: 'Rhoda', code: 'MED-RHD-01', location: 'Rhoda' },
];

const PHARMA_ITEMS = [
  { description: 'Paracetamol 500mg (100 tabs)', category: 'Analgesics', unit: 'pack', unitCost: 120 },
  { description: 'Amoxicillin 500mg (21 caps)', category: 'Antibiotics', unit: 'pack', unitCost: 350 },
  { description: 'Coartem 20/120 (6 tabs)', category: 'Antimalarials', unit: 'pack', unitCost: 480 },
  { description: 'ORS Sachets (10 sachets)', category: 'Rehydration', unit: 'box', unitCost: 90 },
  { description: 'Metformin 500mg (30 tabs)', category: 'Diabetes', unit: 'pack', unitCost: 210 },
  { description: 'Amlodipine 5mg (30 tabs)', category: 'Cardiovascular', unit: 'pack', unitCost: 260 },
  { description: 'Ibuprofen 400mg (24 tabs)', category: 'Analgesics', unit: 'pack', unitCost: 150 },
  { description: 'Vitamin C 100mg (30 tabs)', category: 'Supplements', unit: 'pack', unitCost: 80 },
];

async function main() {
  console.log('🌱 Seeding Mediocare Pharmaceutical Ltd...');

  await prisma.attendance.deleteMany();
  await prisma.stocktakeItem.deleteMany();
  await prisma.stocktake.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.repayment.deleteMany();
  await prisma.creditSale.deleteMany();
  await prisma.staffSales.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.accountBalance.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: { name: 'Mediocare Pharmaceutical Ltd', currency: 'KES', timezone: 'Africa/Nairobi' },
  });

  const branches = await Promise.all(
    BRANCHES.map((b) =>
      prisma.branch.create({
        data: { organizationId: org.id, name: b.name, code: b.code, location: b.location, sellingDays: 26 },
      })
    )
  );
  console.log(`   ✓ ${branches.length} branches created`);

  await prisma.user.createMany({
    data: [
      { organizationId: org.id, email: 'admin@mediocare.com', name: 'System Admin', role: Role.ADMIN, branchIds: branches.map((b) => b.id) },
      { organizationId: org.id, email: 'manager@mediocare.com', name: 'Branch Manager', role: Role.BRANCH_MANAGER, branchIds: [branches[0].id] },
      { organizationId: org.id, email: 'accountant@mediocare.com', name: 'Accountant', role: Role.ACCOUNTANT, branchIds: branches.map((b) => b.id) },
    ],
  });

  const items = await Promise.all(
    PHARMA_ITEMS.map((p) =>
      prisma.stockItem.create({
        data: { organizationId: org.id, description: p.description, category: p.category, unit: p.unit, unitCost: new Decimal(p.unitCost) },
      })
    )
  );

  // Stock transactions + approved stocktakes
  const stockTxs: any[] = [];
  for (const item of items) {
    for (const branch of branches) {
      const openQty = 300 + Math.floor(Math.random() * 400);
      stockTxs.push({ stockItemId: item.id, branchId: branch.id, transactionDate: new Date(2026, 6, 31), type: StockTxType.OPENING, quantity: new Decimal(openQty), unitCost: item.unitCost, value: new Decimal(openQty).times(item.unitCost.toString()) });
      for (let w = 0; w < 2; w++) {
        const qty = 100 + Math.floor(Math.random() * 200);
        stockTxs.push({ stockItemId: item.id, branchId: branch.id, transactionDate: new Date(2026, 7, 3 + w * 10), type: StockTxType.PURCHASE, quantity: new Decimal(qty), unitCost: item.unitCost, value: new Decimal(qty).times(item.unitCost.toString()) });
      }
      const soldQty = 100 + Math.floor(Math.random() * 200);
      stockTxs.push({ stockItemId: item.id, branchId: branch.id, transactionDate: new Date(2026, 7, 26), type: StockTxType.SALE, quantity: new Decimal(-soldQty), unitCost: item.unitCost, value: new Decimal(-soldQty).times(item.unitCost.toString()) });
    }
  }
  await prisma.stockTransaction.createMany({ data: stockTxs });

  for (const branch of branches) {
    const st = await prisma.stocktake.create({
      data: { branchId: branch.id, stocktakeDate: new Date(2026, 7, 26), status: 'APPROVED', notes: `Month-end physical count — August 2026` },
    });
    for (const item of items) {
      const itemTxs = await prisma.stockTransaction.findMany({ where: { stockItemId: item.id, branchId: branch.id } });
      const expected = itemTxs.reduce((s, t) => s + Number(t.quantity), 0);
      const shrinkPct = 0.02 + Math.random() * 0.025;
      const actual = Math.max(0, Math.round(expected * (1 - shrinkPct)));
      const varianceQty = expected - actual;
      const varianceValue = varianceQty * Number(item.unitCost);
      await prisma.stocktakeItem.create({
        data: { stocktakeId: st.id, stockItemId: item.id, expectedQty: new Decimal(expected), actualQty: new Decimal(actual), varianceQty: new Decimal(varianceQty), unitCost: item.unitCost, varianceValue: new Decimal(varianceValue) },
      });
    }
  }

  // Account balances for August 2026
  for (const branch of branches) {
    await prisma.accountBalance.create({
      data: {
        branchId: branch.id, periodYear: 2026, periodMonth: 8,
        periodStartDate: new Date(2026, 7, 1), periodEndDate: new Date(2026, 7, 31),
        openingBalance: new Decimal(50000 + Math.floor(Math.random() * 150000)),
        closingBalance: new Decimal(0),
      },
    });
  }

  console.log(`✅ Mediocare seed complete (${branches.length} branches, ${items.length} items)`);
  console.log(`📌 Staff, sales, credit, repayments, attendance are NOT seeded.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
