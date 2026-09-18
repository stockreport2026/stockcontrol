import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

async function getDashboardData() {
  const [branchCount, staffCount, sales] = await Promise.all([
    prisma.branch.count(),
    prisma.staff.count(),
    prisma.dailySale.findMany({
      select: { actualSales: true, systemSales: true, variance: true },
    }),
  ]);

  const actual = sales.reduce((sum, s) => sum.plus(s.actualSales.toString()), new Decimal(0));
  const system = sales.reduce((sum, s) => sum.plus(s.systemSales.toString()), new Decimal(0));
  const variance = actual.minus(system);
  const variancePct = system.isZero() ? new Decimal(0) : variance.dividedBy(system).times(100);

  return {
    branchCount,
    staffCount,
    actual: actual.toFixed(2),
    system: system.toFixed(2),
    variance: variance.toFixed(2),
    variancePct: variancePct.toFixed(2),
    recordCount: sales.length,
  };
}

function KpiCard({ label, value, sublabel, accent }: { label: string; value: string; sublabel?: string; accent?: string }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ?? 'text-slate-900'}`}>{value}</p>
      {sublabel && <p className="text-xs text-slate-400 mt-1">{sublabel}</p>}
    </div>
  );
}

export default async function DashboardPage() {
  const data = await getDashboardData();
  const varianceNum = parseFloat(data.variance);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of sales performance and operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <KpiCard label="Actual Sales" value={`KES ${Number(data.actual).toLocaleString()}`} sublabel={`${data.recordCount} records`} />
        <KpiCard label="System Sales" value={`KES ${Number(data.system).toLocaleString()}`} />
        <KpiCard
          label="Sales Variance"
          value={`KES ${Number(data.variance).toLocaleString()}`}
          sublabel={`${data.variancePct}%`}
          accent={varianceNum >= 0 ? 'text-green-600' : 'text-red-600'}
        />
        <KpiCard label="Branches" value={String(data.branchCount)} sublabel={`${data.staffCount} staff`} />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Welcome to Stock Control</h2>
        <p className="text-slate-600 leading-relaxed">
          This dashboard shows a live view of your sales data pulled directly from the database.
        </p>
        <p className="text-sm text-slate-500 mt-4">
          <strong>Demo data:</strong> {data.recordCount} sales records across {data.staffCount} staff in {data.branchCount} branches.
        </p>
      </div>
    </div>
  );
}
