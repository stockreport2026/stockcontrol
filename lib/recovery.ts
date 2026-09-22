import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';

export type BranchRecovery = {
  branchId: string;
  branchName: string;
  branchCode: string;
  stockBefore: string;
  stockAfter: string;
  stockLoss: string;
  excessSales: string;
  shortSales: string;
  recovery: string;
  remainingLoss: string;
  surplus: string;
  recoveryRate: string;
  hasStock: boolean;
};

export async function computeBranchRecovery(branchId: string): Promise<BranchRecovery | null> {
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return null;

  // Latest stock position
  const stock = await prisma.stockPosition.findFirst({
    where: { branchId },
    orderBy: { periodEndDate: 'desc' },
  });

  let stockBefore = new Decimal(0);
  let stockAfter = new Decimal(0);
  let stockLoss = new Decimal(0);

  if (stock) {
    stockBefore = new Decimal(stock.openingStockValue.toString());
    stockAfter = new Decimal(stock.closingStockValue.toString());
    stockLoss = Decimal.max(stockBefore.minus(stockAfter), 0);
  }

  // Excess sales from staff sales in the SAME period as the stock position
  let excessSales = new Decimal(0);
  let shortSales = new Decimal(0);

  if (stock) {
    const staffSalesInPeriod = await prisma.staffSales.findMany({
      where: {
        branchId,
        periodStartDate: stock.periodStartDate,
        periodEndDate: stock.periodEndDate,
      },
    });

    for (const s of staffSalesInPeriod) {
      const credits = await prisma.creditSale.findMany({
        where: { staffId: s.staffId, saleDate: { gte: s.periodStartDate, lte: s.periodEndDate } },
      });
      const repayments = await prisma.repayment.findMany({
        where: { staffId: s.staffId, paymentDate: { gte: s.periodStartDate, lte: s.periodEndDate } },
      });
      const creditTotal = credits.reduce((sum, c) => sum.plus(c.amount.toString()), new Decimal(0));
      const repaymentTotal = repayments.reduce((sum, r) => sum.plus(r.amount.toString()), new Decimal(0));

      const netVar = new Decimal(s.actualSales.toString())
        .plus(creditTotal)
        .minus(repaymentTotal)
        .minus(s.systemSales.toString());

      if (netVar.isPositive()) excessSales = excessSales.plus(netVar);
      else shortSales = shortSales.plus(netVar.abs());
    }
  }

  const recovery = Decimal.min(excessSales, stockLoss);
  const remainingLoss = Decimal.max(stockLoss.minus(recovery), 0);
  const surplus = Decimal.max(excessSales.minus(stockLoss), 0);
  const recoveryRate = stockLoss.isZero()
    ? new Decimal(0)
    : Decimal.min(recovery.dividedBy(stockLoss).times(100), 100);

  return {
    branchId: branch.id,
    branchName: branch.name,
    branchCode: branch.code,
    stockBefore: stockBefore.toFixed(2),
    stockAfter: stockAfter.toFixed(2),
    stockLoss: stockLoss.toFixed(2),
    excessSales: excessSales.toFixed(2),
    shortSales: shortSales.toFixed(2),
    recovery: recovery.toFixed(2),
    remainingLoss: remainingLoss.toFixed(2),
    surplus: surplus.toFixed(2),
    recoveryRate: recoveryRate.toFixed(2),
    hasStock: !!stock,
  };
}
