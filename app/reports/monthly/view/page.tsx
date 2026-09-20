import { prisma } from '@/lib/db/prisma';
import { notFound } from 'next/navigation';
import Decimal from 'decimal.js';
import { ReportClient } from './report-client';

export const dynamic = 'force-dynamic';

export default async function ReportViewPage({ searchParams }: { searchParams: { branchId?: string; year?: string; month?: string } }) {
  const { branchId, year, month } = searchParams;
  if (!branchId || !year || !month) return notFound();

  const branch = await prisma.branch.findUnique({ where: { id: branchId }, include: { organization: true } });
  if (!branch) return notFound();

  const y = parseInt(year);
  const m = parseInt(month);

  const accountBalance = await prisma.accountBalance.findUnique({
    where: { branchId_periodYear_periodMonth: { branchId, periodYear: y, periodMonth: m } },
  });

  const startDate = accountBalance?.periodStartDate ?? new Date(y, m - 1, 1);
  const endDate = accountBalance?.periodEndDate ?? new Date(y, m, 0, 23, 59, 59);
  const additionalInfo = accountBalance?.additionalInfo ?? null;
  const openingDebt = new Decimal(accountBalance?.openingBalance.toString() ?? '0');

  const prevMonth = m === 1 ? 12 : m - 1;
  const prevYear = m === 1 ? y - 1 : y;
  const prevStart = new Date(prevYear, prevMonth - 1, 1);
  const prevEnd = new Date(prevYear, prevMonth, 0, 23, 59, 59);

  // Fetch raw data
  const [dailySales, creditSales, repayments, attendance, prevSales, stocktakes, prevStocktakes] = await Promise.all([
    prisma.dailySale.findMany({ where: { branchId, saleDate: { gte: startDate, lte: endDate } }, include: { staff: true } }),
    prisma.creditSale.findMany({ where: { branchId, saleDate: { gte: startDate, lte: endDate } } }),
    prisma.repayment.findMany({ where: { branchId, paymentDate: { gte: startDate, lte: endDate } } }),
    prisma.attendance.findMany({ where: { branchId, periodYear: y, periodMonth: m }, include: { staff: true } }),
    prisma.dailySale.findMany({ where: { branchId, saleDate: { gte: prevStart, lte: prevEnd } } }),
    prisma.stocktake.findMany({ where: { branchId, stocktakeDate: { gte: startDate, lte: endDate }, status: 'APPROVED' }, include: { items: { include: { stockItem: true } } } }),
    prisma.stocktake.findMany({ where: { branchId, stocktakeDate: { gte: prevStart, lte: prevEnd }, status: 'APPROVED' }, include: { items: true } }),
  ]);

  // Raw sales
  const rawActual = dailySales.reduce((s, d) => s.plus(d.actualSales.toString()), new Decimal(0));
  const rawSystem = dailySales.reduce((s, d) => s.plus(d.systemSales.toString()), new Decimal(0));
  const totalCredit = creditSales.reduce((s, c) => s.plus(c.amount.toString()), new Decimal(0));
  const totalRepayments = repayments.reduce((s, r) => s.plus(r.amount.toString()), new Decimal(0));

  // ═══ ADJUSTED VALUES ═══
  // System sales reduced by credit sales given
  const adjustedSystem = rawSystem.minus(totalCredit);
  // Actual sales reduced by repayments received (repayments are cash coming back — subtract to reflect net position)
  const adjustedActual = rawActual.minus(totalRepayments);
  const totalVariance = adjustedActual.minus(adjustedSystem);
  const variancePct = adjustedSystem.isZero() ? new Decimal(0) : totalVariance.dividedBy(adjustedSystem).times(100);

  // Excess/short sales from per-staff adjusted variances
  const staffMap = new Map<string, { name: string; actual: Decimal; system: Decimal; credit: Decimal; repay: Decimal; days: number }>();
  for (const d of dailySales) {
    const name = `${d.staff.firstName} ${d.staff.lastName}`;
    const e = staffMap.get(d.staffId) ?? { name, actual: new Decimal(0), system: new Decimal(0), credit: new Decimal(0), repay: new Decimal(0), days: 0 };
    e.actual = e.actual.plus(d.actualSales.toString());
    e.system = e.system.plus(d.systemSales.toString());
    e.days++;
    staffMap.set(d.staffId, e);
  }
  for (const c of creditSales) {
    const e = staffMap.get(c.staffId);
    if (e) e.credit = e.credit.plus(c.amount.toString());
  }
  for (const r of repayments) {
    const e = staffMap.get(r.staffId);
    if (e) e.repay = e.repay.plus(r.amount.toString());
  }

  const staffSummary = Array.from(staffMap.values()).map((s) => {
    const adjSystem = s.system.minus(s.credit);
    const adjActual = s.actual.minus(s.repay);
    const variance = adjActual.minus(adjSystem);
    const varPct = adjSystem.isZero() ? new Decimal(0) : variance.dividedBy(adjSystem).times(100);
    return {
      name: s.name,
      rawActual: Number(s.actual.toFixed(2)),
      rawSystem: Number(s.system.toFixed(2)),
      credit: Number(s.credit.toFixed(2)),
      repay: Number(s.repay.toFixed(2)),
      actual: Number(adjActual.toFixed(2)),
      system: Number(adjSystem.toFixed(2)),
      variance: Number(variance.toFixed(2)),
      variancePct: Number(varPct.toFixed(2)),
      days: s.days,
      avgDaily: Number(adjActual.dividedBy(s.days).toFixed(2)),
    };
  }).sort((a, b) => b.variance - a.variance);

  const excessSales = staffSummary.reduce((s, st) => st.variance > 0 ? s.plus(st.variance) : s, new Decimal(0));
  const shortSales = staffSummary.reduce((s, st) => st.variance < 0 ? s.plus(Math.abs(st.variance)) : s, new Decimal(0));

  // Daily trend (raw, adjusted can't really be daily due to credit not being per-day)
  const salesByDay = new Map<string, { actual: Decimal; system: Decimal }>();
  for (const d of dailySales) {
    const key = new Date(d.saleDate).toISOString().slice(0, 10);
    const e = salesByDay.get(key) ?? { actual: new Decimal(0), system: new Decimal(0) };
    e.actual = e.actual.plus(d.actualSales.toString());
    e.system = e.system.plus(d.systemSales.toString());
    salesByDay.set(key, e);
  }
  const dailyTrend = Array.from(salesByDay.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, v]) => ({ date, day: date.slice(8), actual: Number(v.actual.toFixed(2)), system: Number(v.system.toFixed(2)) }));

  // Stock loss
  let stockLoss = new Decimal(0);
  let openingStock = new Decimal(0);
  const stockLossItems: any[] = [];
  for (const st of stocktakes) for (const item of st.items) {
    const vv = new Decimal(item.varianceValue.toString());
    if (vv.isPositive()) stockLoss = stockLoss.plus(vv);
    openingStock = openingStock.plus(new Decimal(item.expectedQty.toString()).times(item.unitCost.toString()));
    if (vv.abs().greaterThan(500)) {
      stockLossItems.push({ description: item.stockItem.description, unit: item.stockItem.unit, expected: Number(item.expectedQty), actual: Number(item.actualQty), variance: Number(item.varianceQty), value: Number(vv.toFixed(2)) });
    }
  }
  const shrinkageRate = openingStock.isZero() ? new Decimal(0) : stockLoss.dividedBy(openingStock).times(100);

  // Recovery
  const recoveryApplied = Decimal.min(Decimal.max(excessSales, 0), Decimal.max(stockLoss, 0));
  const remainingLoss = Decimal.max(stockLoss.minus(recoveryApplied), 0);
  const surplus = Decimal.max(excessSales.minus(stockLoss), 0);
  const recoveryRate = stockLoss.isZero() ? new Decimal(0) : Decimal.min(recoveryApplied.dividedBy(stockLoss).times(100), 100);

  // Main account
  const calculatedClosingDebt = openingDebt.plus(remainingLoss);

  // Attendance
  const attendanceRows = attendance.map((a) => {
    const total = a.daysWorked + a.leaveDays;
    return { name: `${a.staff.firstName} ${a.staff.lastName}`, present: a.daysWorked, leave: a.leaveDays, total, rate: total === 0 ? 0 : (a.daysWorked / total) * 100 };
  });
  const totalPresent = attendanceRows.reduce((s, r) => s + r.present, 0);
  const totalScheduled = attendanceRows.reduce((s, r) => s + r.total, 0);
  const overallAttendance = totalScheduled === 0 ? 0 : (totalPresent / totalScheduled) * 100;

  // Previous
  const prevActual = prevSales.reduce((s, d) => s.plus(d.actualSales.toString()), new Decimal(0));
  const prevSystem = prevSales.reduce((s, d) => s.plus(d.systemSales.toString()), new Decimal(0));
  let prevStockLoss = new Decimal(0);
  for (const st of prevStocktakes) for (const item of st.items) {
    const v = new Decimal(item.varianceValue.toString());
    if (v.isPositive()) prevStockLoss = prevStockLoss.plus(v);
  }

  const monthName = new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const prevMonthName = new Date(prevYear, prevMonth - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
  const periodRange = `${startDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} — ${endDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const staffCount = attendance.length;
  const avgStaff = staffCount === 0 ? 0 : Number(adjustedActual.dividedBy(staffCount).toFixed(2));

  const report = {
    branch: { name: branch.name, code: branch.code, location: branch.location ?? '', organization: branch.organization.name },
    period: monthName,
    periodRange,
    generatedAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    additionalInfo,
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
      sellingDays: dailyTrend.length,
      avgDaily: dailyTrend.length === 0 ? 0 : Number(adjustedActual.dividedBy(dailyTrend.length).toFixed(2)),
      avgStaff,
      staffCount,
    },
    stock: { openingValue: Number(openingStock.toFixed(2)), stockLoss: Number(stockLoss.toFixed(2)), shrinkageRate: Number(shrinkageRate.toFixed(2)), items: stockLossItems },
    account: { openingBalance: Number(openingDebt.toFixed(2)), unrecoveredLoss: Number(remainingLoss.toFixed(2)), calculatedClosing: Number(calculatedClosingDebt.toFixed(2)) },
    recovery: { stockLoss: Number(stockLoss.toFixed(2)), excessSales: Number(excessSales.toFixed(2)), recoveryApplied: Number(recoveryApplied.toFixed(2)), remainingLoss: Number(remainingLoss.toFixed(2)), surplus: Number(surplus.toFixed(2)), recoveryRate: Number(recoveryRate.toFixed(2)) },
    attendance: { rows: attendanceRows, overall: Number(overallAttendance.toFixed(2)) },
    comparison: { prevPeriod: prevMonthName, prevActual: Number(prevActual.toFixed(2)), prevSystem: Number(prevSystem.toFixed(2)), prevVariance: Number(prevActual.minus(prevSystem).toFixed(2)), prevStockLoss: Number(prevStockLoss.toFixed(2)), prevRecovery: Number(Decimal.min(Decimal.max(prevActual.minus(prevSystem), 0), prevStockLoss).toFixed(2)), prevRemaining: Number(Decimal.max(prevStockLoss.minus(Decimal.min(Decimal.max(prevActual.minus(prevSystem), 0), prevStockLoss)), 0).toFixed(2)) },
    charts: { dailyTrend, staffSummary, topPerformer: staffSummary[0], bottomPerformer: staffSummary[staffSummary.length - 1], creditTrend: [] },
  };

  return <ReportClient report={report} />;
}
