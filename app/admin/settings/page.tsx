import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const org = await prisma.organization.findFirst();
  const counts = await Promise.all([
    prisma.branch.count(),
    prisma.staff.count(),
    prisma.stockItem.count(),
    prisma.dailySale.count(),
    prisma.creditSale.count(),
    prisma.repayment.count(),
    prisma.stocktake.count(),
    prisma.attendance.count(),
    prisma.accountBalance.count(),
  ]);

  const labels = ['Branches','Staff','Stock Items','Daily Sales Records','Credit Sales','Repayments','Stocktakes','Attendance Records','Account Balances'];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">System configuration and information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-5xl">
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Organization</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Name</dt><dd className="font-medium text-slate-900">{org?.name ?? '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Currency</dt><dd className="font-medium text-slate-900">{org?.currency ?? 'KES'}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Timezone</dt><dd className="font-medium text-slate-900">{org?.timezone ?? 'Africa/Nairobi'}</dd></div>
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">System Data</h2>
          <dl className="space-y-2 text-sm">
            {labels.map((label, i) => (
              <div key={label} className="flex justify-between">
                <dt className="text-slate-500">{label}</dt>
                <dd className="font-medium">{counts[i]}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">System Information</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-slate-500">Application</p><p className="font-medium text-slate-900">Stock Control & Financial Reporting</p></div>
            <div><p className="text-slate-500">Version</p><p className="font-medium text-slate-900">1.0.0</p></div>
            <div><p className="text-slate-500">Database</p><p className="font-medium text-slate-900">PostgreSQL (Supabase)</p></div>
            <div><p className="text-slate-500">Hosting</p><p className="font-medium text-slate-900">Render</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}
