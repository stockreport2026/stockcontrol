import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import { AdjustmentPanel } from './adjustment-panel';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default async function CompanyReportPage({
  searchParams,
}: {
  searchParams: { branchId?: string; year?: string; month?: string };
}) {
  const now = new Date();
  const branches = await prisma.branch.findMany({ orderBy: { name: 'asc' } });

  if (branches.length === 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Company Report</h1>
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800 text-sm">
          Add a branch first to generate a report.
        </div>
      </div>
    );
  }

  const branchId = searchParams.branchId || branches[0].id;
  const year = parseInt(searchParams.year || String(now.getFullYear()));
  const month = parseInt(searchParams.month || String(now.getMonth() + 1));
  const branch = branches.find((b) => b.id === branchId) || branches[0];

  // ── Fetch all data for this branch + period ──
  const [staffSales, branchSales, stockPosition, accountBalance, creditSales, repayments, attendance, stockItems, draft] = await Promise.all([
    prisma.staffSales.findMany({
      where: { branchId: branch.id, periodYear: year, periodMonth: month },
      include: { staff: true },
    }),
    prisma.branchSales.findFirst({
      where: { branchId: branch.id, periodYear: year, periodMonth: month },
    }),
    prisma.stockPosition.findFirst({
      where: { branchId: branch.id },
      orderBy: { periodEndDate: 'desc' },
    }),
    prisma.accountBalance.findFirst({
      where: { branchId: branch.id, periodYear: year, periodMonth: month },
    }),
    prisma.creditSale.findMany({
      where: { branchId: branch.id },
    }),
    prisma.repayment.findMany({
      where: { branchId: branch.id },
    }),
    prisma.attendance.findMany({
      where: { branchId: branch.id },
      include: { staff: true },
    }),
    prisma.stockVarianceItem.findMany({
      where: { branchId: branch.id },
    }),
    prisma.reportDraft.findFirst({
      where: { branchId: branch.id, periodYear: year, periodMonth: month },
    }),
  ]);

  // ── Sales Analysis ──
  const staffActual = staffSales.reduce((s, x) => s.plus(x.actualSales.toString()), new Decimal(0));
  const staffSystem = staffSales.reduce((s, x) => s.plus(x.systemSales.toString()), new Decimal(0));
  const staffRawVariance = staffActual.minus(staffSystem);

  let staffCredit = new Decimal(0);
  let staffRepay = new Decimal(0);
  for (const s of staffSales) {
    const c = creditSales.filter((x) => x.staffId === s.staffId)
      .reduce((sum, x) => sum.plus(x.amount.toString()), new Decimal(0));
    const r = repayments.filter((x) => x.staffId === s.staffId)
      .reduce((sum, x) => sum.plus(x.amount.toString()), new Decimal(0));
    staffCredit = staffCredit.plus(c);
    staffRepay = staffRepay.plus(r);
  }
  const staffNetVariance = staffActual.plus(staffCredit).minus(staffRepay).minus(staffSystem);

  // ── Stock Loss ──
  let stockLoss = new Decimal(0);
  if (stockPosition) {
    const before = new Decimal(stockPosition.openingStockValue.toString());
    const after = new Decimal(stockPosition.closingStockValue.toString());
    stockLoss = Decimal.max(before.minus(after), 0);
  }

  // ── Recovery ──
  const excessSales = Decimal.max(staffNetVariance, 0);
  const recovery = Decimal.min(excessSales, stockLoss);
  const remainingLoss = Decimal.max(stockLoss.minus(recovery), 0);
  const recoveryRate = stockLoss.isZero()
    ? new Decimal(0)
    : Decimal.min(recovery.dividedBy(stockLoss).times(100), 100);

  // ── Account ──
  const openingBal = accountBalance ? new Decimal(accountBalance.openingBalance.toString()) : new Decimal(0);
  const baseClosing = accountBalance ? new Decimal(accountBalance.closingBalance.toString()) : new Decimal(0);
  const adjustedClosing = baseClosing.plus(remainingLoss);
  const debtReduced = openingBal.minus(adjustedClosing);

  // ── Stock Items (additional info) ──
  const stockItemsTotal = stockItems.reduce((s, x) => s.plus(x.varianceValue.toString()), new Decimal(0));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Company Report</h1>
        <p className="text-slate-500 mt-1">
          {branch.name} · {MONTHS[month - 1]} {year}
        </p>
      </div>

      {/* Executive Summary */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Executive Summary</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          This report presents the financial performance, stock position, and staff accountability for <strong>{branch.name}</strong> during <strong>{MONTHS[month - 1]} {year}</strong>.
          {staffNetVariance.isPositive() && ` Sales exceeded system expectations by KES ${fmt(staffNetVariance.toFixed(2))}.`}
          {staffNetVariance.isNegative() && ` Sales fell short of system expectations by KES ${fmt(staffNetVariance.abs().toFixed(2))}.`}
          {stockLoss.isPositive() && ` A stock loss of KES ${fmt(stockLoss.toFixed(2))} was identified, of which KES ${fmt(recovery.toFixed(2))} was recovered from excess sales.`}
          {remainingLoss.isPositive() && ` A remaining KES ${fmt(remainingLoss.toFixed(2))} carries into the account standing.`}
          {!stockLoss.isPositive() && ` No stock loss was recorded for this period.`}
        </p>
      </div>

      {/* Sales Analysis */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Sales Analysis</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Total Actual Sales</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(staffActual.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Total System Sales</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(staffSystem.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Credit Sales</td>
              <td className="px-6 py-3 text-right text-sky-600 font-medium">+KES {fmt(staffCredit.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Repayments</td>
              <td className="px-6 py-3 text-right text-amber-600 font-medium">−KES {fmt(staffRepay.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100 bg-slate-50">
              <td className="px-6 py-3 font-semibold text-slate-700">Net Variance</td>
              <td className={'px-6 py-3 text-right font-bold ' + (staffNetVariance.isNegative() ? 'text-rose-700' : 'text-emerald-700')}>
                KES {fmt(staffNetVariance.toFixed(2))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Stock Analysis */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Stock Analysis</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Stock Before Stocktake</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">
                KES {stockPosition ? fmt(stockPosition.openingStockValue.toString()) : '0'}
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Stock After Stocktake</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">
                KES {stockPosition ? fmt(stockPosition.closingStockValue.toString()) : '0'}
              </td>
            </tr>
            <tr className="border-t border-slate-100 bg-slate-50">
              <td className="px-6 py-3 font-semibold text-slate-700">Stock Loss</td>
              <td className={'px-6 py-3 text-right font-bold ' + (stockLoss.isPositive() ? 'text-rose-700' : 'text-slate-500')}>
                KES {fmt(stockLoss.toFixed(2))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Recovery */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Stock Loss Recovery</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Excess Sales (Net)</td>
              <td className="px-6 py-3 text-right text-emerald-600 font-medium">KES {fmt(excessSales.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Recovery Applied</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(recovery.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Recovery Rate</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">{recoveryRate.toFixed(2)}%</td>
            </tr>
            <tr className="border-t border-slate-100 bg-slate-50">
              <td className="px-6 py-3 font-semibold text-slate-700">Remaining Loss</td>
              <td className={'px-6 py-3 text-right font-bold ' + (remainingLoss.isPositive() ? 'text-rose-700' : 'text-emerald-700')}>
                KES {fmt(remainingLoss.toFixed(2))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Account Standing */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Account Standing</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Opening Balance</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(openingBal.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Base Closing Balance</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(baseClosing.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">+ Remaining Stock Loss</td>
              <td className="px-6 py-3 text-right text-rose-600 font-medium">+KES {fmt(remainingLoss.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Adjusted Closing</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(adjustedClosing.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100 bg-slate-50">
              <td className="px-6 py-3 font-semibold text-slate-700">Debt Reduced</td>
              <td className={'px-6 py-3 text-right font-bold ' + (debtReduced.isPositive() ? 'text-emerald-700' : 'text-rose-700')}>
                {debtReduced.isNegative() ? '−' : ''}KES {fmt(debtReduced.abs().toFixed(2))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Stock Items — additional info */}
      {stockItems.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Stock Items (Additional Information)</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-slate-600">Drug / Item</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Quantity</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Unit Cost</th>
                <th className="text-right px-6 py-3 font-medium text-slate-600">Value</th>
              </tr>
            </thead>
            <tbody>
              {stockItems.map((it) => (
                <tr key={it.id} className="border-t border-slate-100">
                  <td className="px-6 py-3 text-slate-900">{it.itemName}</td>
                  <td className="px-6 py-3 text-right text-slate-600">{Number(it.expectedQty).toLocaleString()}</td>
                  <td className="px-6 py-3 text-right text-slate-600">{fmt(it.unitCost.toString())}</td>
                  <td className="px-6 py-3 text-right font-medium text-slate-900">{fmt(it.varianceValue.toString())}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50">
              <tr>
                <td colSpan={3} className="px-6 py-3 text-right font-semibold text-slate-700">Total</td>
                <td className="px-6 py-3 text-right font-bold text-slate-900">KES {fmt(stockItemsTotal.toFixed(2))}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Saved notes / adjustments display */}
      {draft && (draft.notes || draft.adjustments) && (
        <div className="bg-indigo-50 rounded-lg border border-indigo-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-indigo-900 mb-3">Report Notes &amp; Adjustments</h2>
          {draft.notes && (
            <div className="mb-3">
              <p className="text-xs uppercase tracking-wider text-indigo-600 font-semibold mb-1">Notes</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{draft.notes}</p>
            </div>
          )}
          {draft.adjustments && (
            <div>
              <p className="text-xs uppercase tracking-wider text-indigo-600 font-semibold mb-1">Adjustments</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap font-mono">{draft.adjustments}</p>
            </div>
          )}
        </div>
      )}

      {/* Adjustment panel — the new prompt space */}
      <AdjustmentPanel
        branches={branches.map((b) => ({ id: b.id, label: b.name + ' (' + b.code + ')' }))}
        initialBranchId={branch.id}
        initialYear={year}
        initialMonth={month}
        initialNotes={draft?.notes || ''}
        initialAdjustments={draft?.adjustments || ''}
      />
    </div>
  );
}
