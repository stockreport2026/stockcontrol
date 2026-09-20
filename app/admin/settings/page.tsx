import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const org = await prisma.organization.findFirst();
  const counts = await Promise.all([
    prisma.branch.count(),
    prisma.staff.count(),
    prisma.staffSales.count(),
    prisma.creditSale.count(),
    prisma.repayment.count(),
    prisma.stockItem.count(),
    prisma.stocktake.count(),
    prisma.attendance.count(),
    prisma.accountBalance.count(),
  ]);
  const labels = ['Branches','Staff','Sales Records','Credit Sales','Repayments','Stock Items','Stocktakes','Attendance Records','Account Balances'];

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
                <dt className="text-slate-500">{label}</dt><dd className="font-medium">{counts[i]}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
