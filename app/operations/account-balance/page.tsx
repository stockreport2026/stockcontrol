import { prisma } from '@/lib/db/prisma';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function AccountBalancePage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  const currentMonth = new Date().toISOString().slice(0, 7);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Account Balance</h1>
        <p className="text-slate-500 mt-1">
          Record the company's account balance (as at the main branch) for each reporting period
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 max-w-2xl">
        <form action="/api/account-balance" method="POST" className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
            <select name="branchId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Reporting Month</label>
            <input type="month" name="periodMonth" defaultValue={currentMonth} required
              className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Opening Balance (KES)</label>
              <input type="number" step="0.01" name="openingBalance" required placeholder="0.00"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Closing Balance (KES)</label>
              <input type="number" step="0.01" name="closingBalance" required placeholder="0.00"
                className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes (optional)</label>
            <input type="text" name="notes" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
            ⚠️ This feature is being saved via API. If it fails, the report will fall back to calculating balances from transaction data.
          </div>
          <button type="submit" className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700">
            Save Balance
          </button>
        </form>
      </div>
    </div>
  );
}
