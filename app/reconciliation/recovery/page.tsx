import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default async function RecoveryPage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });

  const rows = [];
  for (const branch of branches) {
    // Latest stock position (defines the period)
    const stock = await prisma.stockPosition.findFirst({
      where: { branchId: branch.id },
      orderBy: { periodEndDate: 'desc' },
    });

    // ── Stock Loss from Stock Position = Before − After ──
    let stockLoss = new Decimal(0);
    if (stock) {
      const before = new Decimal(stock.openingStockValue.toString());
      const after = new Decimal(stock.closingStockValue.toString());
      stockLoss = Decimal.max(before.minus(after), 0);
    }

    // ── Excess sales = sum of POSITIVE NET variances in the same period ──
    let excessSales = new Decimal(0);
    let shortSales = new Decimal(0);

    if (stock) {
      const staffSalesInPeriod = await prisma.staffSales.findMany({
        where: {
          branchId: branch.id,
          periodStartDate: stock.periodStartDate,
          periodEndDate: stock.periodEndDate,
        },
      });

      for (const s of staffSalesInPeriod) {
        // Credit sales for this staff in the same period
        const credits = await prisma.creditSale.findMany({
          where: {
            staffId: s.staffId,
            saleDate: { gte: s.periodStartDate, lte: s.periodEndDate },
          },
        });
        const creditTotal = credits.reduce(
          (sum, c) => sum.plus(c.amount.toString()),
          new Decimal(0)
        );

        // Net variance = (actual − system) + credit
        const netVar = new Decimal(s.variance.toString()).plus(creditTotal);
        if (netVar.isPositive()) excessSales = excessSales.plus(netVar);
        else shortSales = shortSales.plus(netVar.abs());
      }
    }

    // ── Recovery = MIN(excessSales, stockLoss) ──
    const recovery = Decimal.min(excessSales, stockLoss);
    const remainingLoss = Decimal.max(stockLoss.minus(recovery), 0);
    const surplus = Decimal.max(excessSales.minus(stockLoss), 0);
    const recoveryRate = stockLoss.isZero()
      ? new Decimal(0)
      : Decimal.min(recovery.dividedBy(stockLoss).times(100), 100);

    rows.push({
      id: branch.id,
      name: branch.name,
      code: branch.code,
      stockLoss: stockLoss.toFixed(2),
      excessSales: excessSales.toFixed(2),
      shortSales: shortSales.toFixed(2),
      recovery: recovery.toFixed(2),
      remainingLoss: remainingLoss.toFixed(2),
      surplus: surplus.toFixed(2),
      recoveryRate: recoveryRate.toFixed(2),
      hasStock: !!stock,
      periodEnd: stock?.periodEndDate ?? null,
    });
  }

  const totals = rows.reduce(
    (acc, r) => ({
      loss: acc.loss.plus(r.stockLoss),
      excess: acc.excess.plus(r.excessSales),
      short: acc.short.plus(r.shortSales),
      recovery: acc.recovery.plus(r.recovery),
      remaining: acc.remaining.plus(r.remainingLoss),
    }),
    {
      loss: new Decimal(0),
      excess: new Decimal(0),
      short: new Decimal(0),
      recovery: new Decimal(0),
      remaining: new Decimal(0),
    }
  );

  const totalRate = totals.loss.isZero()
    ? new Decimal(0)
    : Decimal.min(totals.recovery.dividedBy(totals.loss).times(100), 100);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Recovery &amp; Stock Loss</h1>
        <p className="text-slate-500 mt-1">
          Stock Loss (Before − After stocktake) is offset by net surplus sales variance. Any remaining loss carries to Account Balance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <div className="bg-gradient-to-br from-rose-50 to-white rounded-xl border border-rose-100 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-rose-700 font-semibold">Stock Loss</p>
          <p className="text-2xl font-bold mt-1 text-rose-700">KES {fmt(totals.loss.toFixed(2))}</p>
          <p className="text-xs text-rose-600 mt-1">From Stock Position</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">Excess Sales (Net)</p>
          <p className="text-2xl font-bold mt-1 text-emerald-700">KES {fmt(totals.excess.toFixed(2))}</p>
          <p className="text-xs text-emerald-600 mt-1">Positive net variance</p>
        </div>
        <div className="bg-gradient-to-br from-sky-50 to-white rounded-xl border border-sky-100 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-sky-700 font-semibold">Recovery Applied</p>
          <p className="text-2xl font-bold mt-1 text-sky-700">KES {fmt(totals.recovery.toFixed(2))}</p>
          <p className="text-xs text-sky-600 mt-1">Rate: {totalRate.toFixed(2)}%</p>
        </div>
        <div className="bg-gradient-to-br from-slate-100 to-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-700 font-semibold">Remaining → Account</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {fmt(totals.remaining.toFixed(2))}</p>
          <p className="text-xs text-slate-600 mt-1">Carries to Account Standing</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Per-Branch Recovery</h2>
          <Link href="/operations/account-balance" className="text-xs text-slate-500 hover:text-slate-900">
            View Account Standing →
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No branches yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Stock Loss</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Excess (Net)</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Recovery</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Remaining</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Rate</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const loss = parseFloat(r.stockLoss);
                  const rem = parseFloat(r.remainingLoss);
                  return (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.name}</div>
                        <div className="text-xs text-slate-500">{r.code}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-rose-600 font-medium">
                        {loss > 0 ? fmt(r.stockLoss) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600">
                        {Number(r.excessSales) > 0 ? fmt(r.excessSales) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 font-medium">{fmt(r.recovery)}</td>
                      <td className={'px-4 py-3 text-right font-medium ' + (rem > 0 ? 'text-rose-600' : 'text-slate-400')}>
                        {rem > 0 ? fmt(r.remainingLoss) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.recoveryRate}%</td>
                      <td className="px-4 py-3 text-right">
                        {!r.hasStock ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            No stocktake
                          </span>
                        ) : rem > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">
                            Carries to Account
                          </span>
                        ) : loss > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                            ✓ Fully Recovered
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                            No loss
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 bg-slate-50 rounded-lg border border-slate-200 p-4 text-xs text-slate-600 leading-relaxed">
        <strong>Formula chain:</strong>
        <span className="ml-2">Raw Variance = Actual − System</span>
        <span className="mx-2">·</span>
        <span>Net Variance = Raw Variance + Credit Sales</span>
        <span className="mx-2">·</span>
        <span>Stock Loss = Stock Before − Stock After</span>
        <span className="mx-2">·</span>
        <span>Recovery = MIN(Positive Net Variance, Stock Loss)</span>
        <span className="mx-2">·</span>
        <span>Remaining Loss → Account Standing</span>
      </div>
    </div>
  );
}
