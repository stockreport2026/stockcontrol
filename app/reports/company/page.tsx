import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import { CompanyReportClient } from './company-report-client';

export const dynamic = 'force-dynamic';

export default async function CompanyReportPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string };
}) {
  const year = parseInt(searchParams.year ?? '2026');
  const month = parseInt(searchParams.month ?? '8');

  const org = await prisma.organization.findFirst();
  if (!org) return <div className="p-8">No organization found</div>;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const branches = await prisma.branch.findMany({
    where: { organizationId: org.id },
    orderBy: { name: 'asc' },
  });

  const rows: any[] = [];
  let grandActual = new Decimal(0);
  let grandSystem = new Decimal(0);
  let grandStockLoss = new Decimal(0);
  let grandRecovery = new Decimal(0);
  let grandRemaining = new Decimal(0);
  let grandOpeningStock = new Decimal(0);
  let grandOpeningDebt = new Decimal(0);
  let grandClosingDebt = new Decimal(0);
  let grandCredit = new Decimal(0);
  let grandRepay = new Decimal(0);

  for (const branch of branches) {
    const sales = await prisma.dailySale.findMany({
      where: { branchId: branch.id, saleDate: { gte: startDate, lte: endDate } },
    });
    const actual = sales.reduce((s, d) => s.plus(d.actualSales.toString()), new Decimal(0));
    const system = sales.reduce((s, d) => s.plus(d.systemSales.toString()), new Decimal(0));
    const variance = actual.minus(system);
    const excessSales = sales.reduce((sum, d) => {
      const v = new Decimal(d.variance.toString());
      return v.isPositive() ? sum.plus(v) : sum;
    }, new Decimal(0));

    const stocktakes = await prisma.stocktake.findMany({
      where: { branchId: branch.id, stocktakeDate: { gte: startDate, lte: endDate }, status: 'APPROVED' },
      include: { items: true },
    });
    let stockLoss = new Decimal(0);
    let openingStock = new Decimal(0);
    for (const st of stocktakes) {
      for (const item of st.items) {
        const v = new Decimal(item.varianceValue.toString());
        if (v.isPositive()) stockLoss = stockLoss.plus(v);
        openingStock = openingStock.plus(new Decimal(item.expectedQty.toString()).times(item.unitCost.toString()));
      }
    }
    const recovery = Decimal.min(excessSales, stockLoss);
    const remaining = Decimal.max(stockLoss.minus(recovery), 0);

    const account = await prisma.accountBalance.findUnique({
      where: { branchId_periodYear_periodMonth: { branchId: branch.id, periodYear: year, periodMonth: month } },
    });
    const openingDebt = new Decimal(account?.openingBalance.toString() ?? '0');
    const closingDebt = openingDebt.plus(remaining);

    const creditSales = await prisma.creditSale.findMany({
      where: { branchId: branch.id, saleDate: { gte: startDate, lte: endDate } },
    });
    const repayments = await prisma.repayment.findMany({
      where: { branchId: branch.id, paymentDate: { gte: startDate, lte: endDate } },
    });
    const credit = creditSales.reduce((s, c) => s.plus(c.amount.toString()), new Decimal(0));
    const repay = repayments.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0));

    rows.push({
      branchId: branch.id,
      name: branch.name,
      code: branch.code,
      location: branch.location ?? '',
      actual: Number(actual.toFixed(2)),
      system: Number(system.toFixed(2)),
      variance: Number(variance.toFixed(2)),
      excessSales: Number(excessSales.toFixed(2)),
      stockLoss: Number(stockLoss.toFixed(2)),
      recovery: Number(recovery.toFixed(2)),
      remaining: Number(remaining.toFixed(2)),
      openingStock: Number(openingStock.toFixed(2)),
      openingDebt: Number(openingDebt.toFixed(2)),
      closingDebt: Number(closingDebt.toFixed(2)),
      credit: Number(credit.toFixed(2)),
      repay: Number(repay.toFixed(2)),
    });

    grandActual = grandActual.plus(actual);
    grandSystem = grandSystem.plus(system);
    grandStockLoss = grandStockLoss.plus(stockLoss);
    grandRecovery = grandRecovery.plus(recovery);
    grandRemaining = grandRemaining.plus(remaining);
    grandOpeningStock = grandOpeningStock.plus(openingStock);
    grandOpeningDebt = grandOpeningDebt.plus(openingDebt);
    grandClosingDebt = grandClosingDebt.plus(closingDebt);
    grandCredit = grandCredit.plus(credit);
    grandRepay = grandRepay.plus(repay);
  }

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const report = {
    organization: org.name,
    period: monthName,
    periodRange: `${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} — ${endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    generatedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    branches: rows,
    totals: {
      actual: Number(grandActual.toFixed(2)),
      system: Number(grandSystem.toFixed(2)),
      variance: Number(grandActual.minus(grandSystem).toFixed(2)),
      stockLoss: Number(grandStockLoss.toFixed(2)),
      recovery: Number(grandRecovery.toFixed(2)),
      remaining: Number(grandRemaining.toFixed(2)),
      openingStock: Number(grandOpeningStock.toFixed(2)),
      openingDebt: Number(grandOpeningDebt.toFixed(2)),
      closingDebt: Number(grandClosingDebt.toFixed(2)),
      credit: Number(grandCredit.toFixed(2)),
      repay: Number(grandRepay.toFixed(2)),
      branchCount: branches.length,
    },
  };

  return <CompanyReportClient report={report} />;
}
