import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default async function StaffLiabilityPage() {
  const staff = await prisma.staff.findMany({
    include: { branch: true },
    orderBy: [{ branch: { name: 'asc' } }, { firstName: 'asc' }],
  });

  const rows = [];
  for (const s of staff) {
    // Credit sales issued by this staff (all periods for now — can filter by period)
    const creditSales = await prisma.creditSale.findMany({ where: { staffId: s.id } });
    const repayments = await prisma.repayment.findMany({ where: { staffId: s.id } });

    const totalCredit = creditSales.reduce(
      (sum, c) => sum.plus(c.amount.toString()),
      new Decimal(0)
    );
    const totalRepaid = repayments.reduce(
      (sum, r) => sum.plus(r.amount.toString()),
      new Decimal(0)
    );

    // Variance = Repayments - Credit Sales
    // Negative → staff didn't collect enough → liability (salary deduction)
    const variance = totalRepaid.minus(totalCredit);
    const liabilityAmount = Decimal.max(variance.negated(), 0);

    if (creditSales.length === 0 && repayments.length === 0) continue;

    rows.push({
      id: s.id,
      staffName: s.firstName + ' ' + s.lastName,
      branch: s.branch.name,
      totalCredit: totalCredit.toFixed(2),
      totalRepaid: totalRepaid.toFixed(2),
      variance: variance.toFixed(2),
      liabilityAmount: liabilityAmount.toFixed(2),
      hasLiability: liabilityAmount.isPositive(),
      creditCount: creditSales.length,
      repaymentCount: repayments.length,
    });
  }

  const totalLiability = rows.reduce(
    (sum, r) => sum.plus(r.liabilityAmount),
    new Decimal(0)
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Staff Liability — Salary Deductions</h1>
        <p className="text-slate-500 mt-1">
          Staff with negative variance on credit sales reconciliation (uncollected credit) are liable for deduction from the next salary payment.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Staff Analysed</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">{rows.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Staff With Liability</p>
          <p className="text-2xl font-bold mt-1 text-rose-600">
            {rows.filter((r) => r.hasLiability).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-rose-50 to-white rounded-xl border border-rose-100 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wider text-rose-700 font-semibold">Total Deductions</p>
          <p className="text-2xl font-bold mt-1 text-rose-700">KES {fmt(totalLiability.toFixed(2))}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Deduction Schedule</h2>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            No credit sales or repayments recorded yet. Once staff issue credit sales and collect repayments, their reconciliation will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Staff</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Branch</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Credit Issued</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Repayments</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Variance</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600 bg-rose-50">Salary Deduction</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const v = parseFloat(r.variance);
                  return (
                    <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{r.staffName}</td>
                      <td className="px-4 py-3 text-slate-600">{r.branch}</td>
                      <td className="px-4 py-3 text-right text-slate-700">{fmt(r.totalCredit)}</td>
                      <td className="px-4 py-3 text-right text-emerald-600">{fmt(r.totalRepaid)}</td>
                      <td className={'px-4 py-3 text-right font-medium ' + (v >= 0 ? 'text-emerald-600' : 'text-rose-600')}>
                        {v >= 0 ? '+' : ''}{fmt(r.variance)}
                      </td>
                      <td className={'px-4 py-3 text-right font-bold bg-rose-50/50 ' + (r.hasLiability ? 'text-rose-700' : 'text-slate-400')}>
                        {r.hasLiability ? 'KES ' + fmt(r.liabilityAmount) : '—'}
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
