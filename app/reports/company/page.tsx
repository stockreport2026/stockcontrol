import Decimal from 'decimal.js';
import { prisma } from '@/lib/db/prisma';
import { computeBranchRecovery } from '@/lib/recovery';
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
          Add a branch first.
        </div>
      </div>
    );
  }

  const branchId = searchParams.branchId || branches[0].id;
  const year = parseInt(searchParams.year || String(now.getFullYear()));
  const month = parseInt(searchParams.month || String(now.getMonth() + 1));
  const branch = branches.find((b) => b.id === branchId) || branches[0];

  // ═════ Use the SAME recovery engine as /reconciliation/recovery ═════
  const recovery = await computeBranchRecovery(branch.id);

  // Staff sales for this branch+period
  const staffSales = await prisma.staffSales.findMany({
    where: { branchId: branch.id, periodYear: year, periodMonth: month },
    include: { staff: true },
  });

  // Credit + repayments scoped to the same period as staff sales entries
  const creditSales = await prisma.creditSale.findMany({ where: { branchId: branch.id } });
  const repayments = await prisma.repayment.findMany({ where: { branchId: branch.id } });

  const staffActual = staffSales.reduce((s, x) => s.plus(x.actualSales.toString()), new Decimal(0));
  const staffSystem = staffSales.reduce((s, x) => s.plus(x.systemSales.toString()), new Decimal(0));

  let staffCredit = new Decimal(0);
  let staffRepay = new Decimal(0);
  for (const s of staffSales) {
    staffCredit = staffCredit.plus(
      creditSales.filter((x) => x.staffId === s.staffId && x.saleDate >= s.periodStartDate && x.saleDate <= s.periodEndDate)
        .reduce((sum, x) => sum.plus(x.amount.toString()), new Decimal(0))
    );
    staffRepay = staffRepay.plus(
      repayments.filter((x) => x.staffId === s.staffId && x.paymentDate >= s.periodStartDate && x.paymentDate <= s.periodEndDate)
        .reduce((sum, x) => sum.plus(x.amount.toString()), new Decimal(0))
    );
  }
  const staffNetVariance = staffActual.plus(staffCredit).minus(staffRepay).minus(staffSystem);

  const accountBalance = await prisma.accountBalance.findFirst({
    where: { branchId: branch.id, periodYear: year, periodMonth: month },
  });
  const stockItems = await prisma.stockVarianceItem.findMany({ where: { branchId: branch.id } });
  const draft = await prisma.reportDraft.findFirst({
    where: { branchId: branch.id, periodYear: year, periodMonth: month },
  });

  // ═════ Computed values from recovery helper ═════
  const stockLoss = new Decimal(recovery?.stockLoss ?? '0');
  const excessSales = new Decimal(recovery?.excessSales ?? '0');
  const computedRecovery = new Decimal(recovery?.recovery ?? '0');
  const computedRemainingLoss = new Decimal(recovery?.remainingLoss ?? '0');
  const computedOpening = accountBalance ? new Decimal(accountBalance.openingBalance.toString()) : new Decimal(0);
  const computedClosing = accountBalance ? new Decimal(accountBalance.closingBalance.toString()) : new Decimal(0);

  // ═════ Apply overrides if enabled ═════
  const useOverrides = draft?.applyOverrides === true;
  const finalStockLoss = useOverrides && draft?.overrideStockLoss ? new Decimal(draft.overrideStockLoss.toString()) : stockLoss;
  const finalExcessSales = useOverrides && draft?.overrideExcessSales ? new Decimal(draft.overrideExcessSales.toString()) : excessSales;
  const finalRecovery = useOverrides && draft?.overrideRecovery ? new Decimal(draft.overrideRecovery.toString()) : computedRecovery;
  const finalRemainingLoss = useOverrides && draft?.overrideRemainingLoss ? new Decimal(draft.overrideRemainingLoss.toString()) : computedRemainingLoss;
  const finalOpening = useOverrides && draft?.overrideOpeningBal ? new Decimal(draft.overrideOpeningBal.toString()) : computedOpening;
  const finalClosing = useOverrides && draft?.overrideClosingBal ? new Decimal(draft.overrideClosingBal.toString()) : computedClosing;

  const adjustedClosing = finalClosing.plus(finalRemainingLoss);
  const debtReduced = finalOpening.minus(adjustedClosing);
  const recoveryRate = finalStockLoss.isZero()
    ? new Decimal(0)
    : Decimal.min(finalRecovery.dividedBy(finalStockLoss).times(100), 100);
  const stockItemsTotal = stockItems.reduce((s, x) => s.plus(x.varianceValue.toString()), new Decimal(0));

  const Badge = ({ label }: { label: string }) => (
    <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 uppercase">
      {label}
    </span>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Company Report</h1>
        <p className="text-slate-500 mt-1">
          {branch.name} · {MONTHS[month - 1]} {year}
          {useOverrides && (
            <span className="ml-3 inline-block px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
              ⚠ Overrides Applied
            </span>
          )}
        </p>
      </div>

      {/* Executive Summary */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Executive Summary</h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          This report presents the financial performance, stock position, and staff accountability for <strong>{branch.name}</strong> during <strong>{MONTHS[month - 1]} {year}</strong>.
          {staffNetVariance.isPositive() && ` Sales exceeded system expectations by KES ${fmt(staffNetVariance.toFixed(2))}.`}
          {staffNetVariance.isNegative() && ` Sales fell short of system expectations by KES ${fmt(staffNetVariance.abs().toFixed(2))}.`}
          {finalStockLoss.isPositive() && ` A stock loss of KES ${fmt(finalStockLoss.toFixed(2))} was identified, of which KES ${fmt(finalRecovery.toFixed(2))} was recovered.`}
          {finalRemainingLoss.isPositive() && ` KES ${fmt(finalRemainingLoss.toFixed(2))} carries into the account standing.`}
          {!finalStockLoss.isPositive() && ` No stock loss was recorded.`}
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

      {/* Stock Loss Reconciliation — same numbers as Recovery page */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Stock Loss Reconciliation</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Stock Before Stocktake</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(recovery?.stockBefore ?? '0')}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Stock After Stocktake</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(recovery?.stockAfter ?? '0')}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 font-semibold text-slate-700">Stock Loss (Before − After)</td>
              <td className={'px-6 py-3 text-right font-bold ' + (finalStockLoss.isPositive() ? 'text-rose-700' : 'text-slate-500')}>
                KES {fmt(finalStockLoss.toFixed(2))}
                {useOverrides && draft?.overrideStockLoss && <Badge label="overridden" />}
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Excess Sales (Net) — from Sales Reconciliation</td>
              <td className="px-6 py-3 text-right text-emerald-600 font-medium">
                KES {fmt(finalExcessSales.toFixed(2))}
                {useOverrides && draft?.overrideExcessSales && <Badge label="overridden" />}
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Recovery Applied = MIN(Loss, Excess)</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">
                KES {fmt(finalRecovery.toFixed(2))}
                {useOverrides && draft?.overrideRecovery && <Badge label="overridden" />}
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Recovery Rate</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">{recoveryRate.toFixed(2)}%</td>
            </tr>
            <tr className="border-t border-slate-100 bg-slate-50">
              <td className="px-6 py-3 font-semibold text-slate-700">Remaining Loss → Account</td>
              <td className={'px-6 py-3 text-right font-bold ' + (finalRemainingLoss.isPositive() ? 'text-rose-700' : 'text-emerald-700')}>
                KES {fmt(finalRemainingLoss.toFixed(2))}
                {useOverrides && draft?.overrideRemainingLoss && <Badge label="overridden" />}
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
              <td className="px-6 py-3 text-right font-medium text-slate-900">
                KES {fmt(finalOpening.toFixed(2))}
                {useOverrides && draft?.overrideOpeningBal && <Badge label="overridden" />}
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Closing Balance</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">
                KES {fmt(finalClosing.toFixed(2))}
                {useOverrides && draft?.overrideClosingBal && <Badge label="overridden" />}
              </td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">+ Remaining Stock Loss</td>
              <td className="px-6 py-3 text-right text-rose-600 font-medium">+KES {fmt(finalRemainingLoss.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100">
              <td className="px-6 py-3 text-slate-600">Adjusted Closing</td>
              <td className="px-6 py-3 text-right font-medium text-slate-900">KES {fmt(adjustedClosing.toFixed(2))}</td>
            </tr>
            <tr className="border-t border-slate-100 bg-slate-50">
              <td className="px-6 py-3 font-semibold text-slate-700">Debt Reduced (Opening − Adjusted Closing)</td>
              <td className={'px-6 py-3 text-right font-bold ' + (debtReduced.isPositive() ? 'text-emerald-700' : 'text-rose-700')}>
                {debtReduced.isNegative() ? '−' : ''}KES {fmt(debtReduced.abs().toFixed(2))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Stock Items */}
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

      {/* Notes / adjustments display */}
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
              <p className="text-xs uppercase tracking-wider text-indigo-600 font-semibold mb-1">Adjustment Prompt</p>
              <p className="text-sm text-slate-800 whitespace-pre-wrap font-mono">{draft.adjustments}</p>
            </div>
          )}
        </div>
      )}

      {/* Adjustment panel */}
      <AdjustmentPanel
        branches={branches.map((b) => ({ id: b.id, label: b.name + ' (' + b.code + ')' }))}
        initialBranchId={branch.id}
        initialYear={year}
        initialMonth={month}
        initialNotes={draft?.notes || ''}
        initialAdjustments={draft?.adjustments || ''}
        initialOverrides={{
          apply: draft?.applyOverrides ?? false,
          stockLoss: draft?.overrideStockLoss?.toString() ?? '',
          excessSales: draft?.overrideExcessSales?.toString() ?? '',
          recovery: draft?.overrideRecovery?.toString() ?? '',
          remainingLoss: draft?.overrideRemainingLoss?.toString() ?? '',
          openingBal: draft?.overrideOpeningBal?.toString() ?? '',
          closingBal: draft?.overrideClosingBal?.toString() ?? '',
        }}
      />
    </div>
  );
}
