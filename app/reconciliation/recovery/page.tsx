import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';

export default async function RecoveryPage({ searchParams }: { searchParams: { year?: string; month?: string; branchId?: string } }) {
  const year = parseInt(searchParams.year ?? '2026');
  const month = parseInt(searchParams.month ?? '8');
  const branchId = searchParams.branchId;

  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });

  const [sales, creditSales, repayments, stockPositions, accounts] = await Promise.all([
    prisma.staffSales.findMany({ where: { periodYear: year, periodMonth: month, ...(branchId ? { branchId } : {}) } }),
    prisma.creditSale.findMany({ where: { ...(branchId ? { branchId } : {}) } }),
    prisma.repayment.findMany({ where: { ...(branchId ? { branchId } : {}) } }),
    prisma.stockPosition.findMany({ where: { periodYear: year, periodMonth: month, ...(branchId ? { branchId } : {}) } }),
    prisma.accountBalance.findMany({ where: { periodYear: year, periodMonth: month, ...(branchId ? { branchId } : {}) } }),
  ]);

  const branchIds = new Set<string>();
  sales.forEach((s) => branchIds.add(s.branchId));
  stockPositions.forEach((s) => branchIds.add(s.branchId));
  accounts.forEach((a) => branchIds.add(a.branchId));

  const rows: any[] = [];
  const totals = { excess: new Decimal(0), loss: new Decimal(0), recovery: new Decimal(0), remaining: new Decimal(0), opening: new Decimal(0), closing: new Decimal(0) };

  for (const bid of branchIds) {
    const branch = branches.find((b) => b.id === bid);
    if (!branch) continue;

    const branchSales = sales.filter((s) => s.branchId === bid);
    const branchCredit = creditSales.filter((c) => c.branchId === bid);
    const branchRepay = repayments.filter((r) => r.branchId === bid);

    const excessSales = branchSales.reduce((sum, s) => {
      const staffCredit = branchCredit.filter((c) => c.staffId === s.staffId).reduce((a, c) => a.plus(c.amount.toString()), new Decimal(0));
      const staffRepay = branchRepay.filter((r) => r.staffId === s.staffId).reduce((a, r) => a.plus(r.amount.toString()), new Decimal(0));
      const adjSystem = new Decimal(s.systemSales.toString()).minus(staffCredit);
      const adjActual = new Decimal(s.actualSales.toString()).minus(staffRepay);
      const variance = adjActual.minus(adjSystem);
      return variance.isPositive() ? sum.plus(variance) : sum;
    }, new Decimal(0));

    const pos = stockPositions.find((s) => s.branchId === bid);
    let stockLoss = new Decimal(0);
    if (pos) {
      const op = new Decimal(pos.openingStockValue.toString());
      const cl = new Decimal(pos.closingStockValue.toString());
      const v = op.minus(cl);
      if (v.isPositive()) stockLoss = v;
    }

    const recovery = Decimal.min(excessSales, stockLoss);
    const remaining = Decimal.max(stockLoss.minus(recovery), 0);
    const bAccount = accounts.find((a) => a.branchId === bid);
    const opening = new Decimal(bAccount?.openingBalance.toString() ?? '0');
    const closing = opening.plus(remaining);
    const recoveryRate = stockLoss.isZero() ? new Decimal(0) : Decimal.min(recovery.dividedBy(stockLoss).times(100), 100);

    rows.push({
      branchId: bid, branchName: branch.name,
      excess: Number(excessSales.toFixed(2)), loss: Number(stockLoss.toFixed(2)),
      recovery: Number(recovery.toFixed(2)), remaining: Number(remaining.toFixed(2)),
      recoveryRate: Number(recoveryRate.toFixed(2)), opening: Number(opening.toFixed(2)), closing: Number(closing.toFixed(2)),
    });

    totals.excess = totals.excess.plus(excessSales); totals.loss = totals.loss.plus(stockLoss);
    totals.recovery = totals.recovery.plus(recovery); totals.remaining = totals.remaining.plus(remaining);
    totals.opening = totals.opening.plus(opening); totals.closing = totals.closing.plus(closing);
  }

  const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Stock Loss Recovery & Liability</h1>
        <p className="text-slate-500 mt-1">Recovery Engine — {monthName}</p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
        <form method="get" className="flex gap-4 items-end flex-wrap">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
            <select name="branchId" defaultValue={branchId ?? ''} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white min-w-[200px]">
              <option value="">All Branches</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Year</label>
            <select name="year" defaultValue={year} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Month</label>
            <select name="month" defaultValue={month} className="border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleDateString('en-GB', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="bg-slate-700 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-600">Apply</button>
        </form>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Stock Loss</p>
          <p className="text-2xl font-bold mt-1 text-red-600">KES {Number(totals.loss.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Total Recovery Applied</p>
          <p className="text-2xl font-bold mt-1 text-green-600">KES {Number(totals.recovery.toFixed(2)).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Unrecovered → Main Debt</p>
          <p className="text-2xl font-bold mt-1 text-red-600">KES {Number(totals.remaining.toFixed(2)).toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Recovery & Liability by Branch ({rows.length})</h2>
        </div>
        {rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No recovery data for this period.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Excess Sales</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Stock Loss</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Recovery</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Rec %</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Remaining</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Opening Debt</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600">Closing Debt</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.branchId} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{r.branchName}</td>
                  <td className="px-4 py-3 text-right text-green-600">+{Number(r.excess).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-red-600">{Number(r.loss).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium">{Number(r.recovery).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${r.recoveryRate >= 100 ? 'bg-green-100 text-green-700' : r.recoveryRate >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                      {r.recoveryRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium">{Number(r.remaining).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{Number(r.opening).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-slate-900 font-bold">{Number(r.closing).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-bold">
              <tr>
                <td className="px-4 py-3 text-xs uppercase tracking-wider">Totals</td>
                <td className="px-4 py-3 text-right">{Number(totals.excess.toFixed(2)).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{Number(totals.loss.toFixed(2)).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{Number(totals.recovery.toFixed(2)).toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-xs">{totals.loss.isZero() ? '100' : Number(totals.recovery.dividedBy(totals.loss).times(100).toFixed(0))}%</td>
                <td className="px-4 py-3 text-right">{Number(totals.remaining.toFixed(2)).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{Number(totals.opening.toFixed(2)).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">{Number(totals.closing.toFixed(2)).toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
