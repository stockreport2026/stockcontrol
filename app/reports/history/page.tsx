import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default async function ReportHistoryPage() {
  const periods = await prisma.reportingPeriod.findMany({
    orderBy: { startDate: 'desc' },
  });

  const rows = [];
  for (const p of periods) {
    const dateFilter = { gte: p.startDate, lte: p.endDate };

    const sales = await prisma.dailySale.findMany({ where: { saleDate: dateFilter } });
    const credit = await prisma.creditSale.findMany({ where: { saleDate: dateFilter } });
    const reps = await prisma.repayment.findMany({ where: { paymentDate: dateFilter } });

    const actual = sales.reduce((s, x) => s.plus(x.actualSales.toString()), new Decimal(0));
    const system = sales.reduce((s, x) => s.plus(x.systemSales.toString()), new Decimal(0));
    const variance = actual.minus(system);
    const totalCredit = credit.reduce((s, x) => s.plus(x.amount.toString()), new Decimal(0));
    const totalRepaid = reps.reduce((s, x) => s.plus(x.amount.toString()), new Decimal(0));

    rows.push({
      id: p.id,
      name: p.name,
      status: p.status,
      startDate: p.startDate,
      endDate: p.endDate,
      actual: actual.toFixed(2),
      system: system.toFixed(2),
      variance: variance.toFixed(2),
      outstanding: totalCredit.minus(totalRepaid).toFixed(2),
      recordCount: sales.length,
    });
  }

  const statusColors: Record<string, string> = {
    OPEN: 'bg-blue-100 text-blue-700',
    DATA_ENTRY: 'bg-blue-100 text-blue-700',
    UNDER_REVIEW: 'bg-amber-100 text-amber-700',
    SUBMITTED: 'bg-amber-100 text-amber-700',
    APPROVED: 'bg-emerald-100 text-emerald-700',
    CLOSED: 'bg-slate-100 text-slate-600',
    REOPENED: 'bg-rose-100 text-rose-700',
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Report History</h1>
        <p className="text-slate-500 mt-1">Monthly period summaries</p>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 shadow-sm text-center">
          <p className="text-slate-500">No reporting periods configured yet.</p>
          <p className="text-sm text-slate-400 mt-2">
            Periods are created automatically when you generate a monthly report.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {rows.map((r) => (
            <Link
              key={r.id}
              href={'/reports/monthly?periodId=' + r.id}
              className="block bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-slate-900">{r.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(r.startDate).toLocaleDateString('en-GB')} →{' '}
                    {new Date(r.endDate).toLocaleDateString('en-GB')}
                  </p>
                </div>
                <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (statusColors[r.status] || 'bg-slate-100 text-slate-600')}>
                  {r.status}
                </span>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Actual Sales</span>
                  <span className="font-medium text-slate-900">{fmt(r.actual)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">System Sales</span>
                  <span className="text-slate-700">{fmt(r.system)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Variance</span>
                  <span className={'font-medium ' + (parseFloat(r.variance) < 0 ? 'text-rose-600' : 'text-emerald-600')}>
                    {parseFloat(r.variance) >= 0 ? '+' : ''}{fmt(r.variance)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Outstanding Credit</span>
                  <span className="text-slate-700">{fmt(r.outstanding)}</span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-400">{r.recordCount} sales records</span>
                  <span className="text-slate-400">View report →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
