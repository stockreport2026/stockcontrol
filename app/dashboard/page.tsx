import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() === 0 ? 12 : now.getMonth();

  const [branches, staffCount, sales, creditSales, repayments, varianceItems] = await Promise.all([
    prisma.branch.count(),
    prisma.staff.count(),
    prisma.staffSales.findMany({ where: { periodYear: year, periodMonth: month } }),
    prisma.creditSale.count(),
    prisma.repayment.count(),
    prisma.stockVarianceItem.count(),
  ]);

  const rawActual = sales.reduce((s, x) => s.plus(x.actualSales.toString()), new Decimal(0));
  const rawSystem = sales.reduce((s, x) => s.plus(x.systemSales.toString()), new Decimal(0));
  const variance = rawActual.minus(rawSystem);
  const varPct = rawSystem.isZero() ? new Decimal(0) : variance.dividedBy(rawSystem).times(100);

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Mediocare Pharmaceutical Ltd — {monthName}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <KpiCard label="Actual Sales" value={`KES ${Number(rawActual.toFixed(2)).toLocaleString()}`} sub={`${sales.length} staff records`} />
        <KpiCard label="System Sales" value={`KES ${Number(rawSystem.toFixed(2)).toLocaleString()}`} />
        <KpiCard
          label="Sales Variance"
          value={`${variance.isNegative() ? '' : '+'}KES ${Number(variance.toFixed(2)).toLocaleString()}`}
          sub={`${varPct.toFixed(2)}%`}
          accent={variance.isNegative() ? 'text-rose-600' : 'text-emerald-600'}
        />
        <KpiCard label="Branches" value={String(branches)} sub={`${staffCount} staff`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <QuickLink href="/operations/sales" label="Enter period sales" hint="Per staff per period" />
            <QuickLink href="/operations/credit-sales" label="Record credit sales" hint="Reduce system sales" />
            <QuickLink href="/operations/repayments" label="Record repayments" hint="Reduce actual sales" />
            <QuickLink href="/operations/stock-variances" label="Log stock variances" hint="Per drug — feeds recovery" />
            <QuickLink href="/operations/attendance" label="Record attendance" hint="Days worked + leave" />
            <QuickLink href="/operations/account-balance" label="Set account balance" hint="Opening balance" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Generate Reports</h2>
          <div className="space-y-3">
            <Link href="/reports/monthly" className="block p-4 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition">
              <p className="font-semibold">Branch Report</p>
              <p className="text-xs text-slate-300 mt-1">Single branch, single period</p>
            </Link>
            <Link href="/reports/monthly" className="block p-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition">
              <p className="font-semibold">Consolidated Company Report</p>
              <p className="text-xs text-emerald-100 mt-1">All {branches} branches together</p>
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Data Summary</h3>
            <dl className="space-y-2 text-sm">
              <Row label="Credit Sales Records" value={creditSales} />
              <Row label="Repayment Records" value={repayments} />
              <Row label="Stock Variance Items" value={varianceItems} />
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? 'text-slate-900'}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function QuickLink({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link href={href} className="flex items-center justify-between px-3 py-2.5 rounded-md hover:bg-slate-50 border border-slate-200 group">
      <div>
        <p className="text-sm font-medium text-slate-900 group-hover:text-slate-700">{label}</p>
        <p className="text-xs text-slate-500">{hint}</p>
      </div>
      <span className="text-slate-400 group-hover:text-slate-600">→</span>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}
