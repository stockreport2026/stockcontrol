import { PrismaClient, Role, StockTxType, AttendanceStatus } from '@prisma/client';
import Decimal from 'decimal.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.attendance.deleteMany();
  await prisma.stocktakeItem.deleteMany();
  await prisma.stocktake.deleteMany();
  await prisma.stockTransaction.deleteMany();
  await prisma.stockItem.deleteMany();
  await prisma.repayment.deleteMany();
  await prisma.creditSale.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.dailySale.deleteMany();
  await prisma.staff.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.user.deleteMany();
  await prisma.reportingPeriod.deleteMany();
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

  await prisma.reportingPeriod.createMany({
    data: [
      { organizationId: org.id, name: 'July 2026', startDate: new Date(2026, 5, 30), endDate: new Date(2026, 6, 31), status: 'CLOSED' },
      { organizationId: org.id, name: 'August 2026', startDate: new Date(2026, 6, 31), endDate: new Date(2026, 7, 28), status: 'UNDER_REVIEW' },
      { organizationId: org.id, name: 'September 2026', startDate: new Date(2026, 7, 28), endDate: new Date(2026, 8, 30), status: 'OPEN' },
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
  const staffMombasa = await Promise.all([
    prisma.staff.create({ data: { organizationId: org.id, branchId: mombasa.id, firstName: 'David', lastName: 'Mwangi', employeeCode: 'MSA-001' } }),
  ]);

  const allStaff = [
    ...staffKisumu.map((s) => ({ staff: s, branchId: kisumu.id })),
    ...staffNairobi.map((s) => ({ staff: s, branchId: nairobi.id })),
    ...staffMombasa.map((s) => ({ staff: s, branchId: mombasa.id })),
  ];

  const saleData: any[] = [];
  for (const { staff, branchId } of allStaff) {
    for (let day = 1; day <= 26; day++) {
      const actual = 8000 + Math.floor(Math.random() * 15000);
      const system = actual + Math.floor(Math.random() * 3000 - 1500);
      saleData.push({
        branchId, staffId: staff.id, saleDate: new Date(2026, 7, day),
        actualSales: new Decimal(actual), systemSales: new Decimal(system),
        variance: new Decimal(actual - system), status: 'APPROVED' as const,
      });
    }
  }
  await prisma.dailySale.createMany({ data: saleData });

  const customers = await Promise.all([
    prisma.customer.create({ data: { organizationId: org.id, branchId: kisumu.id, name: 'Acme Hardware Ltd', phone: '+254711000001', creditLimit: new Decimal(500000), openingBalance: new Decimal(0) } }),
    prisma.customer.create({ data: { organizationId: org.id, branchId: kisumu.id, name: 'Kisumu Fresh Produce', phone: '+254711000002', creditLimit: new Decimal(300000), openingBalance: new Decimal(0) } }),
    prisma.customer.create({ data: { organizationId: org.id, branchId: kisumu.id, name: 'Lake View Hotel', phone: '+254711000003', creditLimit: new Decimal(200000), openingBalance: new Decimal(0) } }),
    prisma.customer.create({ data: { organizationId: org.id, branchId: nairobi.id, name: 'Nairobi Foods Ltd', phone: '+254722000001', creditLimit: new Decimal(800000), openingBalance: new Decimal(0) } }),
    prisma.customer.create({ data: { organizationId: org.id, branchId: nairobi.id, name: 'Embakasi Distributors', phone: '+254722000002', creditLimit: new Decimal(400000), openingBalance: new Decimal(0) } }),
    prisma.customer.create({ data: { organizationId: org.id, branchId: mombasa.id, name: 'Coastal Traders', phone: '+254733000001', creditLimit: new Decimal(600000), openingBalance: new Decimal(0) } }),
  ]);

  const creditData: any[] = [];
  let invoiceNum = 1001;
  for (const cust of customers) {
    const txCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < txCount; i++) {
      const amount = 15000 + Math.floor(Math.random() * 50000);
      creditData.push({
        customerId: cust.id, branchId: cust.branchId,
        saleDate: new Date(2026, 7, 3 + i * 7),
        invoiceRef: `INV-${invoiceNum++}`,
        amount: new Decimal(amount), status: 'OUTSTANDING',
      });
    }
  }
  await prisma.creditSale.createMany({ data: creditData });

  const repayments: any[] = [];
  let receiptNum = 5001;
  for (const cust of customers) {
    const custCredits = await prisma.creditSale.findMany({ where: { customerId: cust.id } });
    const totalCredit = custCredits.reduce((s, c) => s + Number(c.amount), 0);
    const repayCount = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < repayCount; i++) {
      const amount = Math.floor(totalCredit * (0.3 + Math.random() * 0.4) / repayCount);
      repayments.push({
        customerId: cust.id, branchId: cust.branchId,
        paymentDate: new Date(2026, 7, 10 + i * 7),
        amount: new Decimal(amount), paymentMethod: 'CASH',
        receiptRef: `RCP-${receiptNum++}`,
      });
    }
  }
  await prisma.repayment.createMany({ data: repayments });

  const items = await Promise.all([
    prisma.stockItem.create({ data: { organizationId: org.id, sku: 'SKU-001', description: 'Sugar 2kg', category: 'Groceries', unit: 'pkt', unitCost: new Decimal(180) } }),
    prisma.stockItem.create({ data: { organizationId: org.id, sku: 'SKU-002', description: 'Cooking Oil 3L', category: 'Groceries', unit: 'btl', unitCost: new Decimal(650) } }),
    prisma.stockItem.create({ data: { organizationId: org.id, sku: 'SKU-003', description: 'Maize Flour 2kg', category: 'Groceries', unit: 'pkt', unitCost: new Decimal(140) } }),
    prisma.stockItem.create({ data: { organizationId: org.id, sku: 'SKU-004', description: 'Rice 5kg', category: 'Groceries', unit: 'bag', unitCost: new Decimal(750) } }),
    prisma.stockItem.create({ data: { organizationId: org.id, sku: 'SKU-005', description: 'Soap Bar', category: 'Household', unit: 'pcs', unitCost: new Decimal(120) } }),
    prisma.stockItem.create({ data: { organizationId: org.id, sku: 'SKU-006', description: 'Detergent 1kg', category: 'Household', unit: 'pkt', unitCost: new Decimal(280) } }),
  ]);

  const stockTxs: any[] = [];
  for (const item of items) {
    for (const branch of [kisumu, nairobi, mombasa]) {
      const openQty = 200 + Math.floor(Math.random() * 300);
      stockTxs.push({
        stockItemId: item.id, branchId: branch.id,
        transactionDate: new Date(2026, 6, 31),
        type: StockTxType.OPENING,
        quantity: new Decimal(openQty),
        unitCost: item.unitCost,
        value: new Decimal(openQty).times(item.unitCost.toString()),
      });
      for (let w = 0; w < 2; w++) {
        const qty = 50 + Math.floor(Math.random() * 100);
        stockTxs.push({
          stockItemId: item.id, branchId: branch.id,
          transactionDate: new Date(2026, 7, 3 + w * 10),
          type: StockTxType.PURCHASE,
          quantity: new Decimal(qty),
          unitCost: item.unitCost,
          value: new Decimal(qty).times(item.unitCost.toString()),
        });
      }
      const soldQty = 80 + Math.floor(Math.random() * 120);
      stockTxs.push({
        stockItemId: item.id, branchId: branch.id,
        transactionDate: new Date(2026, 7, 26),
        type: StockTxType.SALE,
        quantity: new Decimal(-soldQty),
        unitCost: item.unitCost,
        value: new Decimal(-soldQty).times(item.unitCost.toString()),
      });
    }
  }
  await prisma.stockTransaction.createMany({ data: stockTxs });

  const attendanceData: any[] = [];
  const statusPool = ['PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','PRESENT','OFF','OFF','OFF','ABSENT','SICK_LEAVE'] as const;
  for (const { staff, branchId } of allStaff) {
    for (let day = 1; day <= 26; day++) {
      const status = statusPool[Math.floor(Math.random() * statusPool.length)] as AttendanceStatus;
      attendanceData.push({
        staffId: staff.id, branchId,
        attendanceDate: new Date(2026, 7, day),
        status,
      });
    }
  }
  await prisma.attendance.createMany({ data: attendanceData });

  console.log(`✅ Seeded: ${allStaff.length} staff, ${saleData.length} sales, ${creditData.length} credit sales, ${repayments.length} repayments, ${stockTxs.length} stock tx, ${attendanceData.length} attendance records`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
