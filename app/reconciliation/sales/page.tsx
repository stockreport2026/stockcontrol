import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default async function SalesReconciliationPage() {
  const records = await prisma.staffSales.findMany({
    include: { staff: true, branch: true },
    orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }, { staff: { firstName: 'asc' } }],
    take: 200,
  });

  const rows = [];
  for (const s of records) {
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

    const actual = new Decimal(s.actualSales.toString());
    const system = new Decimal(s.systemSales.toString());
    const rawVariance = actual.minus(system);
    const netVariance = rawVariance.plus(creditTotal);
    const netRate = system.isZero()
      ? new Decimal(0)
      : netVariance.dividedBy(system).times(100);

    let status = 'Balanced';
    if (netVariance.isPositive()) status = 'Surplus';
    else if (netVariance.isNegative()) status = 'Short';
    if (creditTotal.isPositive() && rawVariance.isNegative() && netVariance.greaterThanOrEqualTo(0))
      status = 'Cleared by credit';

    rows.push({
      id: s.id,
      staffName: s.staff.firstName + ' ' + s.staff.lastName,
      branchName: s.branch.name,
      periodLabel: MONTHS[s.periodMonth - 1] + ' ' + s.periodYear,
      actual: actual.toFixed(2),
      system: system.toFixed(2),
      rawVariance: rawVariance.toFixed(2),
      credit: creditTotal.toFixed(2),
      netVariance: netVariance.toFixed(2),
      netRate: netRate.toFixed(2),
      status,
      isSurplus: netVariance.isPositive(),
      isShort: netVariance.isNegative(),
    });
  }

  const totals = rows.reduce(
    (acc, r) => ({
      actual: acc.actual.plus(r.actual),
      system: acc.system.plus(r.system),
      rawVariance: acc.rawVariance.plus(r.rawVariance),
      credit: acc.credit.plus(r.credit),
      netVariance: acc.netVariance.plus(r.netVariance),
      surplus: acc.surplus.plus(r.isSurplus ? r.netVariance : '0'),
      short: acc.short.plus(r.isShort ? r.netVariance.abs() : '0'),
    }),
    {
      actual: new Decimal(0),
      system: new Decimal(0),
      rawVariance: new Decimal(0),
      credit: new Decimal(0),
      netVariance: new Decimal(0),
      surplus: new Decimal(0),
      short: new Decimal(0),
    }
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Sales Reconciliation</h1>
        <p className="text-slate-500 mt-1">
          Net Variance = (Actual + Credit Sales) − System Sales. Positive net variance is surplus available for recovery.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Total Actual Sales</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {fmt(totals.actual.toFixed(2))}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Total System Sales</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {fmt(totals.system.toFixed(2))}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">Surplus (Net)</p>
          <p className="text-2xl font-bold mt-1 text-emerald-700">KES {fmt(totals.surplus.toFixed(2))}</p>
          <p className="text-xs text-emerald-600 mt-1">Used to recover stock loss</p>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-white rounded-xl border border-rose-100 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-rose-700 font-semibold">Short (Net)</p>
          <p className="text-2xl font-bold mt-1 text-rose-700">KES {fmt(totals.short.toFixed(2))}</p>
          <p className="text-xs text-rose-600 mt-1">Becomes staff liability</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Per-Staff Reconciliation ({rows.length})</h2>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No staff sales yet. Enter staff sales first in Operations → Staff Sales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-3 font-medium text-slate-600">Staff</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-left px-3 py-3 font-medium text-slate-600">Period</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">Actual</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">System</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">Raw Var</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">+ Credit</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600 bg-slate-100">Net Variance</th>
                  <th className="text-right px-3 py-3 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const netV = parseFloat(r.netVariance);
                  return (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-3 font-medium text-slate-900">{r.staffName}</td>
                      <td className="px-3 py-3 text-slate-600 text-xs">{r.branchName}</td>
                      <td className="px-3 py-3 text-slate-500 text-xs">{r.periodLabel}</td>
                      <td className="px-3 py-3 text-right text-slate-700">{fmt(r.actual)}</td>
                      <td className="px-3 py-3 text-right text-slate-600">{fmt(r.system)}</td>
                      <td className={'px-3 py-3 text-right ' + (parseFloat(r.rawVariance) >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        {parseFloat(r.rawVariance) >= 0 ? '+' : ''}{fmt(r.rawVariance)}
                      </td>
                      <td className="px-3 py-3 text-right text-sky-600">
                        {Number(r.credit) > 0 ? '+' + fmt(r.credit) : '—'}
                      </td>
                      <td className={'px-3 py-3 text-right font-bold bg-slate-50 ' + (netV > 0 ? 'text-emerald-700' : netV < 0 ? 'text-rose-700' : 'text-slate-500')}>
                        {netV === 0 ? '—' : (netV > 0 ? '+' : '') + fmt(r.netVariance)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        {r.status === 'Surplus' && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">Surplus</span>
                        )}
                        {r.status === 'Short' && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">Short</span>
                        )}
                        {r.status === 'Cleared by credit' && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-700">Cleared by credit</span>
                        )}
                        {r.status === 'Balanced' && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Balanced</span>
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
    </div>
  );
}
