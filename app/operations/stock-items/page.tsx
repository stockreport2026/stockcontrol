import { prisma } from '@/lib/db/prisma';
import Decimal from 'decimal.js';
import { StockItemForm } from './stock-item-form';
import { DeleteItemButton } from './delete-button';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmt(n: string | number) {
  return Number(n).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default async function StockItemsPage() {
  const [branches, items] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.stockVarianceItem.findMany({
      include: { branch: true },
      orderBy: [{ periodEndDate: 'desc' }, { itemName: 'asc' }],
      take: 100,
    }),
  ]);

  // Group by period + branch for display
  const groups = items.reduce((acc, it) => {
    const endD = new Date(it.periodEndDate);
    const key = it.branchId + '|' + endD.getFullYear() + '|' + (endD.getMonth() + 1);
    if (!acc[key]) {
      acc[key] = {
        key,
        branch: it.branch.name,
        year: endD.getFullYear(),
        month: endD.getMonth() + 1,
        items: [],
        total: new Decimal(0),
      };
    }
    acc[key].items.push(it);
    acc[key].total = acc[key].total.plus(it.varianceValue.toString());
    return acc;
  }, {} as Record<string, any>);

  const groupList = Object.values(groups) as any[];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Stock Items</h1>
        <p className="text-slate-500 mt-1">
          Detailed list of drugs and stock items — shown as additional information in the report
        </p>
      </div>

      <StockItemForm branches={branches.map((b) => ({ id: b.id, label: b.name + ' (' + b.code + ')' }))} />

      {groupList.length === 0 ? (
        <div className="mt-8 bg-white rounded-lg border border-slate-200 p-12 shadow-sm text-center text-slate-500">
          No stock items yet. Add your first drug above.
        </div>
      ) : (
        groupList.map((g) => (
          <div key={g.key} className="mt-8 bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {g.branch} · {MONTHS[g.month - 1]} {g.year}
              </h2>
              <p className="text-sm text-slate-600">
                Total value: <span className="font-bold text-slate-900">KES {fmt(g.total.toFixed(2))}</span>
              </p>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Drug / Item</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Quantity</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Unit Cost</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Total Value</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Reason</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600"></th>
                </tr>
              </thead>
              <tbody>
                {g.items.map((it: any) => (
                  <tr key={it.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{it.itemName}</td>
                    <td className="px-4 py-3 text-right text-slate-700">{Number(it.expectedQty).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{fmt(it.unitCost.toString())}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">{fmt(it.varianceValue.toString())}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{it.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-right"><DeleteItemButton id={it.id} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50">
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-700">Total</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-900">
                    KES {fmt(g.total.toFixed(2))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
