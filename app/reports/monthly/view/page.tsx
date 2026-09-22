import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import Decimal from 'decimal.js';
import { ReportClient } from './report-client';

export const dynamic = 'force-dynamic';

export default async function ReportViewPage({
  searchParams,
}: {
  searchParams: { branchId?: string; from?: string; to?: string };
}) {
  const { branchId, from, to } = searchParams;
  if (!branchId || !from || !to) return notFound();

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    include: { organization: true },
  });
  if (!branch) return notFound();

  const startDate = new Date(from);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(to);
  endDate.setHours(23, 59, 59, 999);

  const periodMs = endDate.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - periodMs);

  // ═══ STOCK POSITION (drives the stock loss figure) ═══
  const stockPosition = await prisma.stockPosition.findFirst({
    where: {
      branchId,
      periodStartDate: { gte: startDate },
      periodEndDate: { lte: endDate },
    },
    orderBy: { periodEndDate: 'desc' },
  });

  const openingStockValue = stockPosition
    ? new Decimal(stockPosition.openingStockValue.toString())
    : new Decimal(0);
  const closingStockValue = stockPosition
    ? new Decimal(stockPosition.closingStockValue.toString())
    : new Decimal(0);
  const stockLoss = Decimal.max(openingStockValue.minus(closingStockValue), 0);
  const stockSurplus = Decimal.max(closingStockValue.minus(openingStockValue), 0);
  const shrinkageRate = openingStockValue.isZero()
    ? new Decimal(0)
    : stockLoss.dividedBy(openingStockValue).times(100);

  // ═══ STOCK ITEMS (supporting detail only) ═══
  const stockItemRecords = await prisma.stockVarianceItem.findMany({
    where: {
      branchId,
      periodStartDate: { lte: endDate },
      periodEndDate: { gte: startDate },
    },
  });

  const stockLossItems = stockItemRecords.map((i) => ({
    description: i.itemName,
    systemQty: Number(i.expectedQty),
    actualQty: Number(i.actualQty),
    varianceQty: Number(i.varianceQty),
    unitCost: Number(i.unitCost),
    varianceValue: Number(i.varianceValue),
    reason: i.reason ?? null,
  }));

  // ═══ STAFF SALES ═══
  const staffSales = await prisma.staffSales.findMany({
    where: {
      branchId,
      periodStartDate: { gte: startDate },
      periodEndDate: { lte: endDate },
    },
    include: { staff: true },
  });

  // ═══ CREDIT + REPAYMENTS ═══
  const creditSales = await prisma.creditSale.findMany({
    where: { branchId, saleDate: { gte: startDate, lte: endDate } },
    include: { staff: true },
  });
  const repayments = await prisma.repayment.findMany({
    where: { branchId, paymentDate: { gte: startDate, lte: endDate } },
    include: { staff: true },
  });

  const rawActual = staffSales.reduce((s, x) => s.plus(x.actualSales.toString()), new Decimal(0));
  const rawSystem = staffSales.reduce((s, x) => s.plus(x.systemSales.toString()), new Decimal(0));
  const totalCredit = creditSales.reduce((s, c) => s.plus(c.amount.toString()), new Decimal(0));
  const totalRepayments = repayments.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0));

  // Adjusted actual = raw actual + credit − repayments (repayments reduce surplus)
  const adjustedActual = rawActual.plus(totalCredit).minus(totalRepayments);
  const adjustedSystem = rawSystem;
  const totalVariance = adjustedActual.minus(adjustedSystem);
  const variancePct = adjustedSystem.isZero()
    ? new Decimal(0)
    : totalVariance.dividedBy(adjustedSystem).times(100);

  // Per-staff analysis
  const staffMap = new Map<string, { name: string; rawActual: Decimal; rawSystem: Decimal; credit: Decimal; repay: Decimal }>();
  for (const s of staffSales) {
    const name = `${s.staff.firstName} ${s.staff.lastName}`;
    staffMap.set(s.staffId, {
      name,
      rawActual: new Decimal(s.actualSales.toString()),
      rawSystem: new Decimal(s.systemSales.toString()),
      credit: new Decimal(0),
      repay: new Decimal(0),
    });
  }
  for (const c of creditSales) { const e = staffMap.get(c.staffId); if (e) e.credit = e.credit.plus(c.amount.toString()); }
  for (const r of repayments) { const e = staffMap.get(r.staffId); if (e) e.repay = e.repay.plus(r.amount.toString()); }

  const staffSummary = Array.from(staffMap.values()).map((s) => {
    const adjActual = s.rawActual.plus(s.credit).minus(s.repay);
    const adjSystem = s.rawSystem;
    const variance = adjActual.minus(adjSystem);
    const varPct = adjSystem.isZero() ? new Decimal(0) : variance.dividedBy(adjSystem).times(100);
    return {
      name: s.name,
      rawActual: Number(s.rawActual.toFixed(2)),
      rawSystem: Number(s.rawSystem.toFixed(2)),
      credit: Number(s.credit.toFixed(2)),
      repay: Number(s.repay.toFixed(2)),
      actual: Number(adjActual.toFixed(2)),
      system: Number(adjSystem.toFixed(2)),
      variance: Number(variance.toFixed(2)),
      variancePct: Number(varPct.toFixed(2)),
    };
  }).sort((a, b) => b.variance - a.variance);

  const excessSales = staffSummary.reduce(
    (s, st) => st.variance > 0 ? s.plus(st.variance) : s,
    new Decimal(0)
  );
  const shortSales = staffSummary.reduce(
    (s, st) => st.variance < 0 ? s.plus(Math.abs(st.variance)) : s,
    new Decimal(0)
  );
  const positiveDays = staffSummary.filter((s) => s.variance > 0).length;
  const negativeDays = staffSummary.filter((s) => s.variance < 0).length;

  // ═══ RECOVERY — same formula as /reconciliation/recovery ═══
  const recoveryApplied = Decimal.min(excessSales, stockLoss);
  const remainingLoss = Decimal.max(stockLoss.minus(recoveryApplied), 0);
  const surplus = Decimal.max(excessSales.minus(stockLoss), 0);
  const recoveryRate = stockLoss.isZero()
    ? new Decimal(0)
    : Decimal.min(recoveryApplied.dividedBy(stockLoss).times(100), 100);

  // ═══ ACCOUNT BALANCE ═══
  const accountBalance = await prisma.accountBalance.findFirst({
    where: { branchId, periodEndDate: { lte: endDate } },
    orderBy: { periodEndDate: 'desc' },
  });
  const openingDebt = new Decimal(accountBalance?.openingBalance.toString() ?? '0');
  const calculatedClosingDebt = openingDebt.plus(remainingLoss);

  // ═══ ATTENDANCE ═══
  const attendance = await prisma.attendance.findMany({
    where: {
      branchId,
      periodStartDate: { lte: endDate },
      periodEndDate: { gte: startDate },
    },
    include: { staff: true },
  });

  const attendanceRows = attendance.map((a) => {
    const total = a.daysWorked + a.leaveDays;
    return {
      name: `${a.staff.firstName} ${a.staff.lastName}`,
      present: a.daysWorked,
      leave: a.leaveDays,
      total,
      rate: total === 0 ? 0 : (a.daysWorked / total) * 100,
    };
  });
  const totalPresent = attendanceRows.reduce((s, r) => s + r.present, 0);
  const totalScheduled = attendanceRows.reduce((s, r) => s + r.total, 0);
  const overallAttendance = totalScheduled === 0 ? 0 : (totalPresent / totalScheduled) * 100;

  // ═══ PREVIOUS PERIOD ═══
  const prevSales = await prisma.staffSales.findMany({
    where: {
      branchId,
      periodStartDate: { gte: prevStart },
      periodEndDate: { lte: prevEnd },
    },
  });
  const prevStockPos = await prisma.stockPosition.findFirst({
    where: {
      branchId,
      periodStartDate: { gte: prevStart },
      periodEndDate: { lte: prevEnd },
    },
  });

  let prevStockLoss = new Decimal(0);
  if (prevStockPos) {
    prevStockLoss = Decimal.max(
      new Decimal(prevStockPos.openingStockValue.toString()).minus(prevStockPos.closingStockValue.toString()),
      0
    );
  }

  const prevActual = prevSales.reduce((s, x) => s.plus(x.actualSales.toString()), new Decimal(0));
  const prevSystem = prevSales.reduce((s, x) => s.plus(x.systemSales.toString()), new Decimal(0));
  const prevExcess = prevSales.reduce((s, x) => {
    const v = new Decimal(x.variance.toString());
    return v.isPositive() ? s.plus(v) : s;
  }, new Decimal(0));
  const prevRecovery = Decimal.min(prevExcess, prevStockLoss);
  const prevRemaining = Decimal.max(prevStockLoss.minus(prevRecovery), 0);

  const periodRange = `${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} — ${endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;
  const prevPeriodRange = `${prevStart.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} — ${prevEnd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const staffCount = attendance.length;
  const avgStaff = staffCount === 0 ? 0 : Number(adjustedActual.dividedBy(staffCount).toFixed(2));

  const report = {
    branch: {
      name: branch.name,
      code: branch.code,
      location: branch.location ?? '',
      organization: branch.organization.name,
    },
    period: periodRange,
    periodRange,
    generatedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    additionalInfo: accountBalance?.additionalInfo ?? null,
    sales: {
      actual: Number(adjustedActual.toFixed(2)),
      system: Number(adjustedSystem.toFixed(2)),
      rawActual: Number(rawActual.toFixed(2)),
      rawSystem: Number(rawSystem.toFixed(2)),
      credit: Number(totalCredit.toFixed(2)),
      repayments: Number(totalRepayments.toFixed(2)),
      variance: Number(totalVariance.toFixed(2)),
      variancePct: Number(variancePct.toFixed(2)),
      excessSales: Number(excessSales.toFixed(2)),
      shortSales: Number(shortSales.toFixed(2)),
      avgStaff,
      staffCount,
      positiveDays,
      negativeDays,
    },
    credit: {
      totalCredit: Number(totalCredit.toFixed(2)),
      totalRepayments: Number(totalRepayments.toFixed(2)),
      outstanding: Number(totalCredit.minus(totalRepayments).toFixed(2)),
      repaymentRate: totalCredit.isZero()
        ? 0
        : Number(totalRepayments.dividedBy(totalCredit).times(100).toFixed(2)),
      records: creditSales.length,
    },
    stock: {
      openingValue: Number(openingStockValue.toFixed(2)),
      closingValue: Number(closingStockValue.toFixed(2)),
      stockLoss: Number(stockLoss.toFixed(2)),
      stockSurplus: Number(stockSurplus.toFixed(2)),
      shrinkageRate: Number(shrinkageRate.toFixed(2)),
      items: stockLossItems,
      itemCount: stockLossItems.length,
    },
    account: {
      openingBalance: Number(openingDebt.toFixed(2)),
      unrecoveredLoss: Number(remainingLoss.toFixed(2)),
      calculatedClosing: Number(calculatedClosingDebt.toFixed(2)),
    },
    recovery: {
      stockLoss: Number(stockLoss.toFixed(2)),
      excessSales: Number(excessSales.toFixed(2)),
      recoveryApplied: Number(recoveryApplied.toFixed(2)),
      remainingLoss: Number(remainingLoss.toFixed(2)),
      surplus: Number(surplus.toFixed(2)),
      recoveryRate: Number(recoveryRate.toFixed(2)),
    },
    attendance: { rows: attendanceRows, overall: Number(overallAttendance.toFixed(2)) },
    comparison: {
      prevPeriod: prevPeriodRange,
      prevActual: Number(prevActual.toFixed(2)),
      prevSystem: Number(prevSystem.toFixed(2)),
      prevVariance: Number(prevActual.minus(prevSystem).toFixed(2)),
      prevStockLoss: Number(prevStockLoss.toFixed(2)),
      prevRecovery: Number(prevRecovery.toFixed(2)),
      prevRemaining: Number(prevRemaining.toFixed(2)),
    },
    charts: {
      staffSummary,
      topPerformer: staffSummary[0] ?? null,
      bottomPerformer: staffSummary[staffSummary.length - 1] ?? null,
      varianceBars: staffSummary.map((s) => ({ name: s.name.split(' ')[0], variance: s.variance })),
      salesBars: staffSummary.map((s) => ({ name: s.name.split(' ')[0], actual: s.actual, system: s.system })),
    },
  };

  return <ReportClient report={report} />;
}
