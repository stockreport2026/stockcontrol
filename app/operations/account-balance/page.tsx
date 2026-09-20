import { prisma } from '@/lib/db/prisma';
import { AccountBalanceForm } from './form';

export const dynamic = 'force-dynamic';

export default async function AccountBalancePage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  const now = new Date();
  const defaultMonth = now.getMonth() === 0 ? 12 : now.getMonth();
  const defaultYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Account Balance</h1>
        <p className="text-slate-500 mt-1">
          Record the main account opening and closing balances for a reporting period
        </p>
      </div>

      <AccountBalanceForm
        branches={branches.map((b) => ({ id: b.id, label: `${b.name} (${b.code})` }))}
        defaultYear={defaultYear}
        defaultMonth={defaultMonth}
      />
    </div>
  );
}
