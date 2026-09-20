import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import Decimal from 'decimal.js';
import { ReportClient } from './report-client';

export const dynamic = 'force-dynamic';

export default async function ReportViewPage({
  searchParams,
}: {
  searchParams: { branchId?: string; year?: string; month?: string };
}) {
  const { branchId, year, month } = searchParams;
  if (!branchId || !year || !month) return notFound();

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: { organization: true },
  });
  if (!branch) return notFound();

  const y = parseInt(year);
  const m = parseInt(month);
  const startDate = new Date(y, m - 1, 1);
  const endDate = new Date(y, m, 0, 23, 59, 59);

  // SALES
  const dailySales = await prisma.dailySale.findMany({
    where: { branchId, saleDate: { gte: startDate, lte: endDate } },
    include: { staff: true },
  });

  const totalActual = dailySales.reduce((s, d) => s.plus(d.actualSales.toString()), new Decimal(0));
  const totalSystem = dailySales.reduce((s, d) => s.plus(d.systemSales.toString()), new Decimal(0));
  const totalVariance = totalActual.minus(totalSystem);
  const variancePct = totalSystem.isZero() ? new Decimal(0) : totalVariance.dividedBy(totalSystem).times(100);

  const salesByDay = new Map<string, { actual: Decimal; system: Decimal }>();
  for (const d of dailySales) {
    const key = new Date(d.saleDate).toISOString().slice(0, 10);
    const e = salesByDay.get(key) ?? { actual: new Decimal(0), system: new Decimal(0) };
    e.actual = e.actual.plus(d.actualSales.toString());
    e.system = e.system.plus(d.systemSales.toString());
    salesByDay.set(key, e);
  }
  const dailyTrend = Array.from(salesByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, actual: Number(v.actual.toFixed(2)), system: Number(v.system.toFixed(2)) }));

  const staffMap = new Map<string, { name: string; actual: Decimal; system: Decimal }>();
  for (const d of dailySales) {
    const name = d.staff.firstName + ' ' + d.staff.lastName;
    const e = staffMap.get(d.staffId) ?? { name, actual: new Decimal(0), system: new Decimal(0) };
    e.actual = e.actual.plus(d.actualSales.toString());
    e.system = e.system.plus(d.systemSales.toString());
    staffMap.set(d.staffId, e);
  }
  const staffSummary = Array.from(staffMap.values()).map((s) => ({
    name: s.name,
    actual: Number(s.actual.toFixed(2)),
    system: Number(s.system.toFixed(2)),
    variance: Number(s.actual.minus(s.system).toFixed(2)),
  }));

  const excessSales = dailySales.reduce((sum, d) => {
    const v = new Decimal(d.variance.toString());
    return v.isPositive() ? sum.plus(v) : sum;
  }, new Decimal(0));

  // STOCKTAKE
  const stocktakes = await prisma.stocktake.findMany({
    where: { branchId, stocktakeDate: { gte: startDate, lte: endDate }, status: 'APPROVED' },
    include: { items: true },
  });

  let stockLoss = new Decimal(0);
  let openingStock = new Decimal(0);
  for (const st of stocktakes) {
    for (const item of st.items) {
      stockLoss = stockLoss.plus(item.varianceValue.toString());
      openingStock = openingStock.plus(new Decimal(item.expectedQty.toString()).times(item.unitCost.toString()));
    }
  }
  const shrinkageRate = openingStock.isZero() ? new Decimal(0) : stockLoss.dividedBy(openingStock).times(100);

  // CREDIT
  const creditSales = await prisma.creditSale.findMany({
    where: { branchId, saleDate: { gte: startDate, lte: endDate } },
  });
  const repayments = await prisma.repayment.findMany({
    where: { branchId, paymentDate: { gte: startDate, lte: endDate } },
  });

  const totalCredit = creditSales.reduce((s, c) => s.plus(c.amount.toString()), new Decimal(0));
  const totalRepayments = repayments.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0));
  const outstanding = totalCredit.minus(totalRepayments);

  // RECOVERY
  const recoveryApplied = Decimal.min(Decimal.max(excessSales, 0), Decimal.max(stockLoss, 0));
  const remainingLoss = Decimal.max(stockLoss.minus(recoveryApplied), 0);
  const surplus = Decimal.max(excessSales.minus(stockLoss), 0);
  const recoveryRate = stockLoss.isZero() ? new Decimal(0) : Decimal.min(recoveryApplied.dividedBy(stockLoss).times(100), 100);

  // ATTENDANCE
  const attendance = await prisma.attendance.findMany({
    where: { branchId, attendanceDate: { gte: startDate, lte: endDate } },
    include: { staff: true },
  });

  const attMap = new Map<string, { name: string; present: number; off: number; leave: number; absent: number; total: number }>();
  for (const a of attendance) {
    const name = a.staff.firstName + ' ' + a.staff.lastName;
    const e = attMap.get(a.staffId) ?? { name, present: 0, off: 0, leave: 0, absent: 0, total: 0 };
    e.total++;
    if (a.status === 'PRESENT') e.present++;
    else if (a.status === 'OFF' || a.status === 'PUBLIC_HOLIDAY') e.off++;
    else if (a.status === 'ANNUAL_LEAVE' || a.status === 'SICK_LEAVE' || a.status === 'OTHER') e.leave++;
    else if (a.status === 'ABSENT') e.absent++;
    attMap.set(a.staffId, e);
  }
  const attendanceRows = Array.from(attMap.values()).map((r) => ({
    ...r,
    rate: r.total === 0 ? 0 : (r.present / r.total) * 100,
  }));
  const totalPresent = attendanceRows.reduce((s, r) => s + r.present, 0);
  const totalScheduled = attendanceRows.reduce((s, r) => s + r.total, 0);
  const overallAttendance = totalScheduled === 0 ? 0 : (totalPresent / totalScheduled) * 100;

  // CREDIT TREND
  const creditByDay = new Map<string, { credit: number; repayment: number }>();
  for (const c of creditSales) {
    const key = new Date(c.saleDate).toISOString().slice(0, 10);
    const e = creditByDay.get(key) ?? { credit: 0, repayment: 0 };
    e.credit += Number(c.amount);
    creditByDay.set(key, e);
  }
  for (const r of repayments) {
    const key = new Date(r.paymentDate).toISOString().slice(0, 10);
    const e = creditByDay.get(key) ?? { credit: 0, repayment: 0 };
    e.repayment += Number(r.amount);
    creditByDay.set(key, e);
  }
  const creditTrend = Array.from(creditByDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({ date, ...v }));

  const monthName = new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const report = {
    branch: { name: branch.name, code: branch.code, location: branch.location ?? '' },
    period: monthName,
    generatedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    sales: {
      actual: Number(totalActual.toFixed(2)),
      system: Number(totalSystem.toFixed(2)),
      variance: Number(totalVariance.toFixed(2)),
      variancePct: Number(variancePct.toFixed(2)),
      excessSales: Number(excessSales.toFixed(2)),
      sellingDays: dailyTrend.length,
      avgDaily: dailyTrend.length === 0 ? 0 : Number(totalActual.dividedBy(dailyTrend.length).toFixed(2)),
    },
    stock: {
      openingValue: Number(openingStock.toFixed(2)),
      stockLoss: Number(stockLoss.toFixed(2)),
      shrinkageRate: Number(shrinkageRate.toFixed(2)),
    },
    credit: {
      totalCredit: Number(totalCredit.toFixed(2)),
      totalRepayments: Number(totalRepayments.toFixed(2)),
      outstanding: Number(outstanding.toFixed(2)),
    },
    recovery: {
      stockLoss: Number(stockLoss.toFixed(2)),
      excessSales: Number(excessSales.toFixed(2)),
      recoveryApplied: Number(recoveryApplied.toFixed(2)),
      remainingLoss: Number(remainingLoss.toFixed(2)),
      surplus: Number(surplus.toFixed(2)),
      recoveryRate: Number(recoveryRate.toFixed(2)),
    },
    attendance: {
      rows: attendanceRows,
      overall: Number(overallAttendance.toFixed(2)),
    },
    charts: { dailyTrend, staffSummary, creditTrend },
  };

  return <ReportClient report={report} />;
}
