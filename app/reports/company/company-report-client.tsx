'use client';

import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const fmt = (n: number) => n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const shortFmt = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(0);
};

const C = { navy: '#0f172a', emerald: '#059669', rose: '#e11d48', amber: '#d97706', slate: '#64748b', slateLight: '#cbd5e1', grid: '#e2e8f0' };

const tooltipStyle = {
  backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
  fontSize: '12px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', padding: '8px 12px',
};
const axisTick = { fontSize: 11, fill: '#64748b', fontWeight: 500 };

export function CompanyReportClient({ report }: { report: any }) {
  const { totals, branches } = report;
  const handlePrint = () => window.print();

  const chartData = branches.map((b: any) => ({
    name: b.name.length > 12 ? b.name.slice(0, 11) + '…' : b.name,
    fullName: b.name,
    Actual: b.actual,
    System: b.system,
  }));

  return (
    <div className="report-root">
      <style jsx global>{`
        @media print {
          @page { size: A3 landscape; margin: 10mm; }
          body { background: #fff !important; }
          .print\\:hidden { display: none !important; }
          .report-root { font-size: 9px; }
          .report-section { page-break-inside: avoid; }
        }
      `}</style>

      <div className="mb-6 print:hidden flex items-center justify-between">
        <Link href="/reports/monthly" className="text-sm text-slate-500 hover:text-slate-900">← Back to Reports</Link>
        <button onClick={handlePrint} className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 shadow-sm">
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm print:border-0 print:shadow-none">
        {/* Header */}
        <div className="px-12 pt-12 pb-8 bg-gradient-to-br from-slate-50 via-white to-slate-50 border-b-4 border-slate-900">
          <div className="flex items-start justify-between gap-12">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold">M</div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold">{report.organization}</p>
                  <p className="text-[10px] text-slate-400">Financial Control Division</p>
                </div>
              </div>
              <h1 className="text-[28px] leading-tight font-bold text-slate-900 tracking-tight">
                CONSOLIDATED COMPANY REPORT
              </h1>
              <p className="text-sm text-slate-500 mt-1">All-Branch Financial & Stock Reconciliation</p>
              <div className="mt-5 inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {report.periodRange}
              </div>
            </div>
            <div className="text-right space-y-3 min-w-[220px]">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Branches Covered</p>
                <p className="text-lg font-bold text-slate-900">{totals.branchCount}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Reporting Period</p>
                <p className="text-sm font-bold text-slate-900">{report.period}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Generated</p>
                <p className="text-xs text-slate-600">{report.generatedAt}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <section className="px-12 py-8 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs font-mono text-slate-400">01</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Company Summary</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KpiCard label="Total Actual Sales" value={fmt(totals.actual)} prefix="KES" />
            <KpiCard label="Total System Sales" value={fmt(totals.system)} prefix="KES" />
            <KpiCard label="Net Sales Variance" value={fmt(totals.variance)} prefix="KES" accent={totals.variance < 0 ? C.rose : C.emerald} />
            <KpiCard label="Branches Reporting" value={String(totals.branchCount)} />
            <KpiCard label="Total Stock Loss" value={fmt(totals.stockLoss)} prefix="KES" accent={C.rose} />
            <KpiCard label="Total Recovery" value={fmt(totals.recovery)} prefix="KES" accent={C.emerald} />
            <KpiCard label="Unrecovered Loss" value={fmt(totals.remaining)} prefix="KES" accent={totals.remaining > 0 ? C.rose : C.emerald} />
            <KpiCard label="Company Closing Debt" value={fmt(totals.closingDebt)} prefix="KES" accent={C.rose} />
          </div>

          <div className="p-4 rounded-lg text-sm text-slate-700 leading-relaxed bg-slate-50 border-l-4 border-slate-900">
            <p>
              Across <strong>{totals.branchCount} branches</strong>, Mediocare Pharmaceutical Ltd recorded total actual sales of <strong>KES {fmt(totals.actual)}</strong> against system sales of <strong>KES {fmt(totals.system)}</strong>, yielding a net variance of <strong>KES {fmt(totals.variance)}</strong>. Total stock loss of <strong>KES {fmt(totals.stockLoss)}</strong> was identified from approved stocktakes, of which <strong>KES {fmt(totals.recovery)}</strong> was recovered through excess sales. The company's closing debt position stands at <strong>KES {fmt(totals.closingDebt)}</strong>.
            </p>
          </div>
        </section>

        {/* Branch table */}
        <section className="px-12 py-8 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs font-mono text-slate-400">02</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Branch-by-Branch Analysis</h2>
          </div>

          <div className="overflow-hidden border border-slate-200 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left px-3 py-2.5 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Branch</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Actual</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">System</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Variance</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Stock Loss</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Recovery</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Unrecovered</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Credit Sales</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Repayments</th>
                  <th className="text-right px-3 py-2.5 font-semibold text-slate-600 uppercase tracking-wider text-[10px]">Closing Debt</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b: any) => {
                  const varianceColor = b.variance < 0 ? C.rose : b.variance > 0 ? C.emerald : C.slate;
                  return (
                    <tr key={b.branchId} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900">{b.name}</div>
                        <div className="text-[10px] text-slate-500">{b.code} · {b.location}</div>
                      </td>
                      <td className="px-3 py-2 text-right text-slate-700">{fmt(b.actual)}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{fmt(b.system)}</td>
                      <td className="px-3 py-2 text-right font-semibold" style={{ color: varianceColor }}>{b.variance >= 0 ? '+' : ''}{fmt(b.variance)}</td>
                      <td className="px-3 py-2 text-right text-rose-600">{fmt(b.stockLoss)}</td>
                      <td className="px-3 py-2 text-right text-emerald-600">{fmt(b.recovery)}</td>
                      <td className="px-3 py-2 text-right font-semibold" style={{ color: b.remaining > 0 ? C.rose : C.slate }}>{fmt(b.remaining)}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{fmt(b.credit)}</td>
                      <td className="px-3 py-2 text-right text-slate-600">{fmt(b.repay)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900">{fmt(b.closingDebt)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900 text-white font-semibold">
                <tr>
                  <td className="px-3 py-3 text-xs uppercase tracking-wider">COMPANY TOTALS</td>
                  <td className="px-3 py-3 text-right">{fmt(totals.actual)}</td>
                  <td className="px-3 py-3 text-right">{fmt(totals.system)}</td>
                  <td className="px-3 py-3 text-right">{totals.variance >= 0 ? '+' : ''}{fmt(totals.variance)}</td>
                  <td className="px-3 py-3 text-right">{fmt(totals.stockLoss)}</td>
                  <td className="px-3 py-3 text-right">{fmt(totals.recovery)}</td>
                  <td className="px-3 py-3 text-right">{fmt(totals.remaining)}</td>
                  <td className="px-3 py-3 text-right">{fmt(totals.credit)}</td>
                  <td className="px-3 py-3 text-right">{fmt(totals.repay)}</td>
                  <td className="px-3 py-3 text-right">{fmt(totals.closingDebt)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* Chart */}
        <section className="px-12 py-8 border-b border-slate-200">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs font-mono text-slate-400">03</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Sales Comparison Across Branches</h2>
          </div>
          <div className="h-96 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 60 }}>
                <CartesianGrid strokeDasharray="4 4" stroke={C.grid} vertical={false} />
                <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 10 }} axisLine={{ stroke: C.slateLight }} tickLine={false} angle={-35} textAnchor="end" height={70} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={shortFmt} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [`KES ${fmt(Number(v))}`, name]} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, fontWeight: 500 }} iconType="circle" />
                <Bar dataKey="System" fill={C.slateLight} radius={[5, 5, 0, 0]} />
                <Bar dataKey="Actual" fill={C.navy} radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Approval */}
        <section className="px-12 py-8">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs font-mono text-slate-400">04</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Approval</h2>
          </div>
          <div className="grid grid-cols-3 gap-8 pt-4">
            <SignatureBlock title="Prepared By" role="Head of Finance" />
            <SignatureBlock title="Reviewed By" role="Operations Director" />
            <SignatureBlock title="Approved By" role="Managing Director" />
          </div>
        </section>

        <div className="border-t border-slate-300 px-12 py-4 flex items-center justify-between text-xs text-slate-500">
          <span>{report.organization} — Confidential</span>
          <span>Consolidated Report · {report.periodRange}</span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, prefix, accent }: any) {
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white" style={{ borderLeft: `3px solid ${accent ?? C.navy}` }}>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-lg font-bold mt-0.5" style={{ color: accent ?? C.navy }}>
        {prefix && <span className="text-xs font-semibold text-slate-400 mr-1">{prefix}</span>}{value}
      </p>
    </div>
  );
}

function SignatureBlock({ title, role }: { title: string; role: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">{title}</p>
      <p className="text-xs text-slate-500 mb-12">{role}</p>
      <div className="border-t border-dashed border-slate-400 pt-2"><p className="text-xs text-slate-400">Name / Signature / Date</p></div>
    </div>
  );
}
