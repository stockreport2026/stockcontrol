import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import { AccountForm } from './account-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default async function AccountBalancePage() {
  const [branches, records] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.accountBalance.findMany({
      include: { branch: true },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
      take: 30,
    }),
  ]);

  const enriched = [];
  for (const rec of records) {
    // 1. Remaining stock loss from Recovery (uses matching StockPosition + StaffSales for the same period)
    const stock = await prisma.stockPosition.findFirst({
      where: {
        branchId: rec.branchId,
        periodStartDate: rec.periodStartDate,
        periodEndDate: rec.periodEndDate,
      },
    });

    let stockLoss = new Decimal(0);
    if (stock) {
      const before = new Decimal(stock.openingStockValue.toString());
      const after = new Decimal(stock.closingStockValue.toString());
      stockLoss = Decimal.max(before.minus(after), 0);
    }

    const sales = await prisma.staffSales.findMany({
      where: {
        branchId: rec.branchId,
        periodStartDate: rec.periodStartDate,
        periodEndDate: rec.periodEndDate,
      },
    });

    let excessSales = new Decimal(0);
    for (const s of sales) {
      const v = new Decimal(s.variance.toString());
      if (v.isPositive()) excessSales = excessSales.plus(v);
    }

    const recovery = Decimal.min(excessSales, stockLoss);
    const remainingLoss = Decimal.max(stockLoss.minus(recovery), 0);

    // 2. Account computation
    const opening = new Decimal(rec.openingBalance.toString());
    const baseClosing = new Decimal(rec.closingBalance.toString());

    // Remaining stock loss is added to closing → branch owes that too
    const adjustedClosing = baseClosing.plus(remainingLoss);

    // Debt Reduced = Opening − Closing
    //   positive = they paid down debt
    //   negative = their debt increased
    const debtReduced = opening.minus(adjustedClosing);

    enriched.push({
      id: rec.id,
      year: rec.periodYear,
      month: rec.periodMonth,
      branch: rec.branch.name,
      opening: opening.toFixed(2),
      baseClosing: baseClosing.toFixed(2),
      remainingLoss: remainingLoss.toFixed(2),
      adjustedClosing: adjustedClosing.toFixed(2),
      debtReduced: debtReduced.toFixed(2),
      isReduction: debtReduced.isPositive(),
      isIncrease: debtReduced.isNegative(),
    });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Account Standing</h1>
        <p className="text-slate-500 mt-1">
          Debt reduced = Opening balance − Closing balance. Remaining stock loss from Recovery is added to closing.
        </p>
      </div>

      <AccountForm branches={branches.map((b) => ({ id: b.id, label: b.name + ' (' + b.code + ')' }))} />

      <div className="mt-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Account Balances ({enriched.length})</h2>
        </div>
        {enriched.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No account balances yet. Enter the first one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Period</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Opening</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Base Closing</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">+ Stock Loss Carry</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Adjusted Closing</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 bg-slate-100">Debt Reduced</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{MONTHS[r.month - 1]} {r.year}</td>
                    <td className="px-4 py-3 text-slate-700">{r.branch}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(r.opening)}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{fmt(r.baseClosing)}</td>
                    <td className={'px-4 py-3 text-right font-medium ' + (Number(r.remainingLoss) > 0 ? 'text-rose-600' : 'text-slate-400')}>
                      {Number(r.remainingLoss) > 0 ? '+ ' + fmt(r.remainingLoss) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-900 font-medium">{fmt(r.adjustedClosing)}</td>
                    <td className={'px-4 py-3 text-right font-bold bg-slate-50 ' + (r.isReduction ? 'text-emerald-700' : r.isIncrease ? 'text-rose-700' : 'text-slate-500')}>
                      {r.isReduction ? '+ ' + fmt(r.debtReduced) : r.isIncrease ? '− ' + fmt(Math.abs(Number(r.debtReduced))) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-xs text-slate-500">
          <strong>Debt Reduced</strong>: Opening − Adjusted Closing.
          Positive (green) means the branch paid down their debt.
          Negative (red) means their debt increased.
        </div>
      </div>
    </div>
  );
}
