import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import { PeriodSelector } from './period-selector';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: { periodId?: string };
}) {
  const periods = await prisma.reportingPeriod.findMany({
    orderBy: { startDate: 'desc' },
  });

  if (periods.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Monthly Reports</h1>
        <div className="mt-8 bg-white rounded-lg border border-slate-200 p-8 shadow-sm text-center text-slate-500">
          No reporting periods found. Create one in Administration → Settings.
        </div>
      </div>
    );
  }

  const selected = searchParams.periodId
    ? periods.find((p) => p.id === searchParams.periodId) ?? periods[0]
    : periods[0];

  const periodOptions = periods.map((p) => ({
    id: p.id,
    name: p.name,
    startDate: p.startDate.toISOString(),
    endDate: p.endDate.toISOString(),
    status: p.status,
  }));

  const dateFilter = { gte: selected.startDate, lte: selected.endDate };

  // Fetch all data for the period
  const [sales, creditSales, repayments, staff, stockItems] = await Promise.all([
    prisma.dailySale.findMany({ where: { saleDate: dateFilter } }),
    prisma.creditSale.findMany({ where: { saleDate: dateFilter } }),
    prisma.repayment.findMany({ where: { paymentDate: dateFilter } }),
    prisma.staff.count(),
    prisma.stockItem.findMany({
      include: {
        transactions: { where: { transactionDate: { lte: selected.endDate } } },
      },
    }),
  ]);

  // Sales calculations
  const totalActual = sales.reduce((s, x) => s.plus(x.actualSales.toString()), new Decimal(0));
  const totalSystem = sales.reduce((s, x) => s.plus(x.systemSales.toString()), new Decimal(0));
  const totalVariance = totalActual.minus(totalSystem);
  const variancePct = totalSystem.isZero() ? new Decimal(0) : totalVariance.dividedBy(totalSystem).times(100);

  // Credit calculations
  const totalCredit = creditSales.reduce((s, x) => s.plus(x.amount.toString()), new Decimal(0));
  const totalRepaid = repayments.reduce((s, x) => s.plus(x.amount.toString()), new Decimal(0));
  const outstandingCredit = totalCredit.minus(totalRepaid);

  // Stock calculations (opening, closing, variance)
  let openingStock = new Decimal(0);
  let closingStock = new Decimal(0);

  for (const item of stockItems) {
    for (const tx of item.transactions) {
      const qty = new Decimal(tx.quantity.toString());
      const value = qty.times(item.unitCost.toString());

      if (tx.transactionDate < selected.startDate) {
        openingStock = openingStock.plus(value);
      }
      if (tx.transactionDate <= selected.endDate) {
        closingStock = closingStock.plus(value);
      }
    }
  }

  const stockVariance = closingStock.minus(openingStock);
  const shrinkageRate = openingStock.isZero()
    ? new Decimal(0)
    : stockVariance.abs().dividedBy(openingStock).times(100);

  // Recovery
  const excessSales = Decimal.max(totalVariance, 0);
  const stockLoss = Decimal.max(stockVariance.negated(), 0); // positive = loss
  const recovery = Decimal.min(excessSales, stockLoss);
  const remainingLoss = Decimal.max(stockLoss.minus(recovery), 0);
  const surplus = Decimal.max(excessSales.minus(stockLoss), 0);
  const recoveryRate = stockLoss.isZero() ? new Decimal(0) : Decimal.min(recovery.dividedBy(stockLoss).times(100), 100);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Monthly Report</h1>
        <p className="text-slate-500 mt-1">
          {selected.name} · {selected.startDate.toLocaleDateString('en-GB')} → {selected.endDate.toLocaleDateString('en-GB')}
        </p>
      </div>

      <PeriodSelector periods={periodOptions} selectedId={selected.id} />

      {/* Executive Summary */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Executive Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <KpiCard
            label="Actual Sales"
            value={`KES ${fmt(totalActual.toFixed(2))}`}
            sub={`${sales.length} records`}
          />
          <KpiCard
            label="System Sales"
            value={`KES ${fmt(totalSystem.toFixed(2))}`}
          />
          <KpiCard
            label="Sales Variance"
            value={`KES ${fmt(totalVariance.toFixed(2))}`}
            sub={`${variancePct.toFixed(2)}%`}
            accent={totalVariance.isNegative() ? 'text-red-600' : 'text-green-600'}
          />
          <KpiCard
            label="Staff Count"
            value={String(staff)}
            sub="Active staff"
          />
        </div>
      </div>

      {/* Sales Analysis */}
      <div className="mb-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Sales Analysis</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Total Actual Sales</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(totalActual.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Total System Sales</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(totalSystem.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Sales Variance</td>
              <td className={`px-6 py-3 text-right font-medium ${totalVariance.isNegative() ? 'text-red-600' : 'text-green-600'}`}>
                KES {fmt(totalVariance.toFixed(2))}
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Sales Variance %</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">{variancePct.toFixed(2)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Account Standing */}
      <div className="mb-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Account Standing</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Credit Sales</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(totalCredit.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Repayments</td>
              <td className="px-6 py-3 text-right font-medium text-green-600">KES {fmt(totalRepaid.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Outstanding Credit</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(outstandingCredit.toFixed(2))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Stock Analysis */}
      <div className="mb-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Stock Analysis</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Opening Stock (before period)</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(openingStock.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Closing Stock (end of period)</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(closingStock.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Stock Variance</td>
              <td className={`px-6 py-3 text-right font-medium ${stockVariance.isNegative() ? 'text-red-600' : 'text-green-600'}`}>
                KES {fmt(stockVariance.toFixed(2))}
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Shrinkage Rate</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">{shrinkageRate.toFixed(2)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Recovery & Liability */}
      <div className="mb-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Stock Loss Recovery</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Excess Sales Available</td>
              <td className="px-6 py-3 text-right font-medium text-green-600">KES {fmt(excessSales.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Stock Loss</td>
              <td className="px-6 py-3 text-right font-medium text-red-600">KES {fmt(stockLoss.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Recovery Applied</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(recovery.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Remaining Unrecovered Loss</td>
              <td className={`px-6 py-3 text-right font-medium ${remainingLoss.isPositive() ? 'text-red-600' : 'text-slate-900'}`}>
                KES {fmt(remainingLoss.toFixed(2))}
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Surplus</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(surplus.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100 bg-slate-50">
              <td className="px-6 py-3 font-semibold text-slate-700">Recovery Rate</td>
              <td className="px-6 py-3 text-right font-semibold text-slate-900">{recoveryRate.toFixed(2)}%</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* KPI Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Key Performance Indicators</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-slate-600">KPI</th>
              <th className="text-right px-6 py-3 font-medium text-slate-600">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Sales Variance Rate</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">{variancePct.toFixed(2)}%</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Stock Shrinkage Rate</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">{shrinkageRate.toFixed(2)}%</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Stock Loss Recovery Rate</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">{recoveryRate.toFixed(2)}%</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Net Stock Position After Recovery</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(remainingLoss.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Total Actual Sales</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(totalActual.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Total System Sales</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(totalSystem.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Outstanding Credit</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(outstandingCredit.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Repayment Rate</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">
                {totalCredit.isZero() ? '0.00%' : `${Decimal.min(totalRepaid.dividedBy(totalCredit).times(100), 100).toFixed(2)}%`}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
