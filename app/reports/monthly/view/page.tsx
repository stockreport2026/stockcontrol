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

  // Get AccountBalance record (contains period dates + additional info)
  const accountBalance = await prisma.accountBalance.findUnique({
    where: { branchId_periodYear_periodMonth: { branchId, periodYear: y, periodMonth: m } },
  });

  const startDate = accountBalance?.periodStartDate ?? new Date(y, m - 1, 1);
  const endDate = accountBalance?.periodEndDate ?? new Date(y, m, 0, 23, 59, 59);
  const additionalInfo = accountBalance?.additionalInfo ?? null;
  const openingDebt = new Decimal(accountBalance?.openingBalance.toString() ?? '0');
  const manualClosingDebt = new Decimal(accountBalance?.closingBalance.toString() ?? '0');

  // Fetch previous month's data for comparison
  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  const prevStart = new Date(prevYear, prevMonth - 1, 1);
  const prevEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59);

  // ─── SALES ───
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
    .map(([date, v]) => ({ date, day: date.slice(8), actual: Number(v.actual.toFixed(2)), system: Number(v.system.toFixed(2)) }));

  const staffMap = new Map<string, { name: string; actual: Decimal; system: Decimal; days: number }>();
  for (const d of dailySales) {
    const name = d.staff.firstName + ' ' + d.staff.lastName;
    const e = staffMap.get(d.staffId) ?? { name, actual: new Decimal(0), system: new Decimal(0), days: 0 };
    e.actual = e.actual.plus(d.actualSales.toString());
    e.system = e.system.plus(d.systemSales.toString());
    e.days++;
    staffMap.set(d.staffId, e);
  }
  const staffSummary = Array.from(staffMap.values())
    .map((s) => {
      const variance = s.actual.minus(s.system);
      const varPct = s.system.isZero() ? new Decimal(0) : variance.dividedBy(s.system).times(100);
      return {
        name: s.name,
        actual: Number(s.actual.toFixed(2)),
        system: Number(s.system.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        variancePct: Number(varPct.toFixed(2)),
        days: s.days,
        avgDaily: Number(s.actual.dividedBy(s.days).toFixed(2)),
      };
    })
    .sort((a, b) => b.variance - a.variance);

  const excessSales = dailySales.reduce((sum, d) => {
    const v = new Decimal(d.variance.toString());
    return v.isPositive() ? sum.plus(v) : sum;
  }, new Decimal(0));
  const shortSales = dailySales.reduce((sum, d) => {
    const v = new Decimal(d.variance.toString());
    return v.isNegative() ? sum.plus(v.abs()) : sum;
  }, new Decimal(0));

  // ─── STOCK ───
  const stocktakes = await prisma.stocktake.findMany({
    where: { branchId, stocktakeDate: { gte: startDate, lte: endDate }, status: 'APPROVED' },
    include: { items: { include: { stockItem: true } } },
  });

  let stockLoss = new Decimal(0);
  let openingStock = new Decimal(0);
  const stockLossItems: any[] = [];
  for (const st of stocktakes) {
    for (const item of st.items) {
      const varianceVal = new Decimal(item.varianceValue.toString());
      if (varianceVal.isPositive()) stockLoss = stockLoss.plus(varianceVal);
      openingStock = openingStock.plus(new Decimal(item.expectedQty.toString()).times(item.unitCost.toString()));
      if (!varianceVal.isZero()) {
        stockLossItems.push({
          sku: item.stockItem.sku,
          description: item.stockItem.description,
          expected: Number(item.expectedQty.toString()),
          actual: Number(item.actualQty.toString()),
          variance: Number(item.varianceQty.toString()),
          value: Number(varianceVal.toFixed(2)),
          unit: item.stockItem.unit,
        });
      }
    }
  }
  const shrinkageRate = openingStock.isZero() ? new Decimal(0) : stockLoss.dividedBy(openingStock).times(100);

  // ─── RECOVERY ───
  const recoveryApplied = Decimal.min(Decimal.max(excessSales, 0), Decimal.max(stockLoss, 0));
  const remainingLoss = Decimal.max(stockLoss.minus(recoveryApplied), 0);
  const surplus = Decimal.max(excessSales.minus(stockLoss), 0);
  const recoveryRate = stockLoss.isZero() ? new Decimal(0) : Decimal.min(recoveryApplied.dividedBy(stockLoss).times(100), 100);

  // ─── MAIN ACCOUNT DEBT (no credit/repayments) ───
  // Opening debt + unrecovered stock loss = Closing debt
  const calculatedClosingDebt = openingDebt.plus(remainingLoss);

  // ─── CREDIT (informational only, shown separately) ───
  const creditSales = await prisma.creditSale.findMany({
    where: { branchId, saleDate: { gte: startDate, lte: endDate } },
  });
  const repayments = await prisma.repayment.findMany({
    where: { branchId, paymentDate: { gte: startDate, lte: endDate } },
  });
  const totalCredit = creditSales.reduce((s, c) => s.plus(c.amount.toString()), new Decimal(0));
  const totalRepayments = repayments.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0));

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
    .map(([date, v]) => ({ date, day: date.slice(8), ...v }));

  // ─── ATTENDANCE ───
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

  // ─── PREVIOUS PERIOD COMPARISON ───
  const prevSales = await prisma.dailySale.findMany({
    where: { branchId, saleDate: { gte: prevStart, lte: prevEnd } },
  });
  const prevActual = prevSales.reduce((s, d) => s.plus(d.actualSales.toString()), new Decimal(0));
  const prevSystem = prevSales.reduce((s, d) => s.plus(d.systemSales.toString()), new Decimal(0));
  const prevVariance = prevActual.minus(prevSystem);

  const prevStocktakes = await prisma.stocktake.findMany({
    where: { branchId, stocktakeDate: { gte: prevStart, lte: prevEnd }, status: 'APPROVED' },
    include: { items: true },
  });
  let prevStockLoss = new Decimal(0);
  for (const st of prevStocktakes) for (const item of st.items) {
    const v = new Decimal(item.varianceValue.toString());
    if (v.isPositive()) prevStockLoss = prevStockLoss.plus(v);
  }

  const prevExcess = prevSales.reduce((s, d) => {
    const v = new Decimal(d.variance.toString());
    return v.isPositive() ? s.plus(v) : s;
  }, new Decimal(0));
  const prevRecovery = Decimal.min(prevExcess, prevStockLoss);
  const prevRemaining = Decimal.max(prevStockLoss.minus(prevRecovery), 0);

  const monthName = new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const prevMonthName = new Date(prevYear, prevMonth - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const periodRange = `${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} — ${endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const staffCount = attMap.size;
  const avgStaff = staffCount === 0 ? 0 : Number(totalActual.dividedBy(staffCount).toFixed(2));

  const report = {
    branch: { name: branch.name, code: branch.code, location: branch.location ?? '', organization: branch.organization.name },
    period: monthName,
    periodRange,
    periodStartDate: startDate.toISOString(),
    periodEndDate: endDate.toISOString(),
    generatedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    additionalInfo,
    sales: {
      actual: Number(totalActual.toFixed(2)),
      system: Number(totalSystem.toFixed(2)),
      variance: Number(totalVariance.toFixed(2)),
      variancePct: Number(variancePct.toFixed(2)),
      excessSales: Number(excessSales.toFixed(2)),
      shortSales: Number(shortSales.toFixed(2)),
      sellingDays: dailyTrend.length,
      avgDaily: dailyTrend.length === 0 ? 0 : Number(totalActual.dividedBy(dailyTrend.length).toFixed(2)),
      avgStaff,
      staffCount,
    },
    stock: {
      openingValue: Number(openingStock.toFixed(2)),
      stockLoss: Number(stockLoss.toFixed(2)),
      shrinkageRate: Number(shrinkageRate.toFixed(2)),
      items: stockLossItems,
    },
    account: {
      openingBalance: Number(openingDebt.toFixed(2)),
      manualClosing: Number(manualClosingDebt.toFixed(2)),
      unrecoveredLoss: Number(remainingLoss.toFixed(2)),
      calculatedClosing: Number(calculatedClosingDebt.toFixed(2)),
    },
    credit: {
      totalCredit: Number(totalCredit.toFixed(2)),
      totalRepayments: Number(totalRepayments.toFixed(2)),
      outstanding: Number(totalCredit.minus(totalRepayments).toFixed(2)),
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
    comparison: {
      prevPeriod: prevMonthName,
      prevActual: Number(prevActual.toFixed(2)),
      prevSystem: Number(prevSystem.toFixed(2)),
      prevVariance: Number(prevVariance.toFixed(2)),
      prevStockLoss: Number(prevStockLoss.toFixed(2)),
      prevRecovery: Number(prevRecovery.toFixed(2)),
      prevRemaining: Number(prevRemaining.toFixed(2)),
    },
    charts: {
      dailyTrend,
      staffSummary,
      creditTrend,
      topPerformer: staffSummary[0],
      bottomPerformer: staffSummary[staffSummary.length - 1],
    },
  };

  return <ReportClient report={report} />;
}
