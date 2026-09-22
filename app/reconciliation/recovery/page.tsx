import Decimal from 'decimal.js';
import Link from 'next/link';
import { prisma } from '@/lib/db/prisma';
import { computeBranchRecovery } from '@/lib/recovery';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default async function RecoveryPage() {
  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
  const rows = (await Promise.all(branches.map((b) => computeBranchRecovery(b.id)))).filter(Boolean) as any[];

  const totals = rows.reduce(
    (acc, r) => ({
      loss: acc.loss.plus(r.stockLoss),
      excess: acc.excess.plus(r.excessSales),
      recovery: acc.recovery.plus(r.recovery),
      remaining: acc.remaining.plus(r.remainingLoss),
    }),
    { loss: new Decimal(0), excess: new Decimal(0), recovery: new Decimal(0), remaining: new Decimal(0) }
  );

  const totalRate = totals.loss.isZero()
    ? new Decimal(0)
    : Decimal.min(totals.recovery.dividedBy(totals.loss).times(100), 100);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Recovery &amp; Stock Loss</h1>
        <p className="text-slate-500 mt-1">
          Stock Loss offset by net surplus sales (credit and repayments factored). Remaining carries to Account.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <div className="bg-gradient-to-br from-rose-50 to-white rounded-xl border border-rose-100 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-rose-700 font-semibold">Stock Loss</p>
          <p className="text-2xl font-bold mt-1 text-rose-700">KES {fmt(totals.loss.toFixed(2))}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-white rounded-xl border border-emerald-100 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-emerald-700 font-semibold">Excess Sales (Net)</p>
          <p className="text-2xl font-bold mt-1 text-emerald-700">KES {fmt(totals.excess.toFixed(2))}</p>
        </div>
        <div className="bg-gradient-to-br from-sky-50 to-white rounded-xl border border-sky-100 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-sky-700 font-semibold">Recovery Applied</p>
          <p className="text-2xl font-bold mt-1 text-sky-700">KES {fmt(totals.recovery.toFixed(2))}</p>
          <p className="text-xs text-sky-600 mt-1">Rate: {totalRate.toFixed(2)}%</p>
        </div>
        <div className="bg-gradient-to-br from-slate-100 to-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-700 font-semibold">Remaining → Account</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">KES {fmt(totals.remaining.toFixed(2))}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Per-Branch Recovery</h2>
          <Link href="/operations/account-balance" className="text-xs text-slate-500 hover:text-slate-900">
            View Account Standing →
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No branches yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Stock Loss</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Excess (Net)</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Recovery</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Remaining</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Rate</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const loss = parseFloat(r.stockLoss);
                  const rem = parseFloat(r.remainingLoss);
                  return (
                    <tr key={r.branchId} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{r.branchName}</div>
                        <div className="text-xs text-slate-500">{r.branchCode}</div>
                      </td>
                      <td className="px-4 py-3 text-right text-rose-600 font-medium">
                        {loss > 0 ? fmt(r.stockLoss) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600">
                        {Number(r.excessSales) > 0 ? fmt(r.excessSales) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-900 font-medium">{fmt(r.recovery)}</td>
                      <td className={'px-4 py-3 text-right font-medium ' + (rem > 0 ? 'text-rose-600' : 'text-slate-400')}>
                        {rem > 0 ? fmt(r.remainingLoss) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">{r.recoveryRate}%</td>
                      <td className="px-4 py-3 text-right">
                        {!r.hasStock ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">No stocktake</span>
                        ) : rem > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700">Carries to Account</span>
                        ) : loss > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">✓ Fully Recovered</span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">No loss</span>
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
