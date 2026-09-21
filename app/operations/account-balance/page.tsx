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

  // For each record, compute the remaining stock loss to add
  const enriched = [];
  for (const rec of records) {
    // Latest stock position for this branch matching the period
    const stock = await prisma.stockPosition.findFirst({
      where: {
        branchId: rec.branchId,
        periodStartDate: rec.periodStartDate,
        periodEndDate: rec.periodEndDate,
      },
    });

    let stockLoss = new Decimal(0);
    if (stock) {
      const opening = new Decimal(stock.openingStockValue.toString());
      const closing = new Decimal(stock.closingStockValue.toString());
      stockLoss = Decimal.max(opening.minus(closing), 0);
    }

    // Excess sales for the period
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

    const baseClosing = new Decimal(rec.closingBalance.toString());
    const adjustedClosing = baseClosing.plus(remainingLoss);

    enriched.push({
      id: rec.id,
      year: rec.periodYear,
      month: rec.periodMonth,
      branch: rec.branch.name,
      opening: new Decimal(rec.openingBalance.toString()).toFixed(2),
      baseClosing: baseClosing.toFixed(2),
      remainingLoss: remainingLoss.toFixed(2),
      adjustedClosing: adjustedClosing.toFixed(2),
    });
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Account Balance</h1>
        <p className="text-slate-500 mt-1">
          Remaining stock loss after recovery is added to the account to show the Account Standing.
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
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Closing (base)</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">+ Stock Loss Carry</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 bg-slate-100">Adjusted Closing</th>
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
                    <td className="px-4 py-3 text-right font-bold text-slate-900 bg-slate-50">{fmt(r.adjustedClosing)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
