import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import { CompanyReportClient } from './company-report-client';

export const dynamic = 'force-dynamic';

export default async function CompanyReportPage({ searchParams }: { searchParams: { year?: string; month?: string } }) {
  const year = parseInt(searchParams.year ?? '2026');
  const month = parseInt(searchParams.month ?? '8');

  const org = await prisma.organization.findFirst();
  if (!org) return <div className="p-8">No organization found</div>;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const branches = await prisma.branch.findMany({ where: { organizationId: org.id }, orderBy: { name: 'asc' } });

  const rows: any[] = [];
  let gActual = new Decimal(0), gSystem = new Decimal(0), gLoss = new Decimal(0), gRec = new Decimal(0);
  let gRem = new Decimal(0), gOpenDebt = new Decimal(0), gCloseDebt = new Decimal(0), gCredit = new Decimal(0), gRepay = new Decimal(0);

  for (const branch of branches) {
    const [staffSales, creditSales, repayments, stocktakes, account] = await Promise.all([
      prisma.staffSales.findMany({ where: { branchId: branch.id, periodYear: year, periodMonth: month } }),
      prisma.creditSale.findMany({ where: { branchId: branch.id, saleDate: { gte: startDate, lte: endDate } } }),
      prisma.repayment.findMany({ where: { branchId: branch.id, paymentDate: { gte: startDate, lte: endDate } } }),
      prisma.stocktake.findMany({ where: { branchId: branch.id, stocktakeDate: { gte: startDate, lte: endDate }, status: 'APPROVED' }, include: { items: true } }),
      prisma.accountBalance.findUnique({ where: { branchId_periodYear_periodMonth: { branchId: branch.id, periodYear: year, periodMonth: month } } }),
    ]);

    const rawActual = staffSales.reduce((s, x) => s.plus(x.actualSales.toString()), new Decimal(0));
    const rawSystem = staffSales.reduce((s, x) => s.plus(x.systemSales.toString()), new Decimal(0));
    const credit = creditSales.reduce((s, c) => s.plus(c.amount.toString()), new Decimal(0));
    const repay = repayments.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0));

    const actual = rawActual.minus(repay);
    const system = rawSystem.minus(credit);
    const variance = actual.minus(system);

    const excess = staffSales.reduce((s, x) => {
      const v = new Decimal(x.variance.toString());
      return v.isPositive() ? s.plus(v) : s;
    }, new Decimal(0));

    let loss = new Decimal(0);
    for (const st of stocktakes) for (const item of st.items) {
      const v = new Decimal(item.varianceValue.toString());
      if (v.isPositive()) loss = loss.plus(v);
    }

    const recovery = Decimal.min(excess, loss);
    const remaining = Decimal.max(loss.minus(recovery), 0);
    const openDebt = new Decimal(account?.openingBalance.toString() ?? '0');
    const closeDebt = openDebt.plus(remaining);

    rows.push({
      branchId: branch.id, name: branch.name, code: branch.code, location: branch.location ?? '',
      actual: Number(actual.toFixed(2)), system: Number(system.toFixed(2)), variance: Number(variance.toFixed(2)),
      stockLoss: Number(loss.toFixed(2)), recovery: Number(recovery.toFixed(2)), remaining: Number(remaining.toFixed(2)),
      openingDebt: Number(openDebt.toFixed(2)), closingDebt: Number(closeDebt.toFixed(2)),
      credit: Number(credit.toFixed(2)), repay: Number(repay.toFixed(2)),
    });

    gActual = gActual.plus(actual); gSystem = gSystem.plus(system); gLoss = gLoss.plus(loss);
    gRec = gRec.plus(recovery); gRem = gRem.plus(remaining); gOpenDebt = gOpenDebt.plus(openDebt);
    gCloseDebt = gCloseDebt.plus(closeDebt); gCredit = gCredit.plus(credit); gRepay = gRepay.plus(repay);
  }

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const report = {
    organization: org.name,
    period: monthName,
    periodRange: `${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} — ${endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    generatedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    branches: rows,
    totals: {
      actual: Number(gActual.toFixed(2)), system: Number(gSystem.toFixed(2)),
      variance: Number(gActual.minus(gSystem).toFixed(2)),
      stockLoss: Number(gLoss.toFixed(2)), recovery: Number(gRec.toFixed(2)),
      remaining: Number(gRem.toFixed(2)), openingDebt: Number(gOpenDebt.toFixed(2)),
      closingDebt: Number(gCloseDebt.toFixed(2)), credit: Number(gCredit.toFixed(2)),
      repay: Number(gRepay.toFixed(2)), branchCount: branches.length,
    },
  };

  return <CompanyReportClient report={report} />;
}
