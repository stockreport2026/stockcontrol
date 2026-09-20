import { prisma } from '@/lib/db/prisma';
import { DemoForm } from './demo-form';

export const dynamic = 'force-dynamic';

export default async function DemoDataPage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  const [staffCount, salesCount] = await Promise.all([
    prisma.staff.count(),
    prisma.staffSales.count(),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Demo Data Generator</h1>
        <p className="text-slate-500 mt-1">Quickly populate sample data for testing the report generation</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 max-w-3xl">
        <p className="text-sm text-amber-900">
          <strong>⚠ Testing tool:</strong> This generates demo staff, period sales, and attendance for a selected branch so you can test the report.
          Use this to see the reports working, then delete this demo data later and enter real data through the normal pages.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6 max-w-3xl">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Current Staff</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{staffCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Sales Records</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{salesCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-500 font-medium">Branches</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{branches.length}</p>
        </div>
      </div>

      <div className="max-w-3xl">
        <DemoForm branches={branches.map((b) => ({ id: b.id, label: `${b.name} (${b.code})` }))} />
      </div>
    </div>
  );
}
