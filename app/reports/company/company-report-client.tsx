'use client';

import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const fmt = (n: number) => n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString('en-KE', { maximumFractionDigits: 0 });
const shortFmt = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(0);
};

const C = { navy: '#0f172a', emerald: '#059669', rose: '#e11d48', amber: '#d97706', slate: '#64748b', slateLight: '#cbd5e1', grid: '#e2e8f0' };
const tooltipStyle = { backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', padding: '10px 14px' };
const axisTick = { fontSize: 11, fill: '#64748b', fontWeight: 500 };

export function CompanyReportClient({ report }: { report: any }) {
  const { totals, branches } = report;
  const handlePrint = () => window.print();

  const hasSalesData = totals.actual > 0 || totals.system > 0;
  const hasStockData = totals.stockLoss > 0;
  const hasRecoveryData = totals.recovery > 0;

  // Filter branches with actual sales > 0
  const branchesWithSales = branches.filter((b: any) => b.actual > 0);
  const topBranches = [...branchesWithSales].sort((a, b) => b.actual - a.actual).slice(0, 5);
  const worstVariance = [...branchesWithSales].sort((a, b) => a.variance - b.variance).slice(0, 3);
  const highestLoss = [...branches].filter((b: any) => b.remaining > 0).sort((a, b) => b.remaining - a.remaining).slice(0, 3);

  const chartData = branchesWithSales.map((b: any) => ({
    name: b.name.length > 14 ? b.name.slice(0, 13) + '…' : b.name,
    Actual: b.actual,
    System: b.system,
  }));

  const totalVarianceColor = totals.variance < 0 ? C.rose : totals.variance > 0 ? C.emerald : C.slate;

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
        {/* HERO HEADER */}
        <div className="relative overflow-hidden bg-slate-900 text-white px-12 pt-12 pb-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full -ml-24 -mb-24" />
          <div className="relative">
            <div className="flex items-start justify-between gap-12">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-slate-900 font-bold text-xl shadow-lg">M</div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold">{report.organization}</p>
                    <p className="text-[10px] text-slate-400">Financial Control Division</p>
                  </div>
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold mb-2">Consolidated Report</p>
                <h1 className="text-[38px] leading-[1.1] font-bold tracking-tight">Company-Wide Stock &<br />Financial Statement</h1>
                <p className="text-sm text-slate-300 mt-3 max-w-xl">Multi-branch performance analysis across {totals.branchCount} Mediocare Pharmaceutical branches</p>
                <div className="mt-6 inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 text-white text-xs font-medium px-4 py-2 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {report.periodRange}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 min-w-[340px]">
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Branches</p>
                  <p className="text-3xl font-bold text-white mt-1">{totals.branchCount}</p>
                </div>
                <div className="bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Period</p>
                  <p className="text-lg font-bold text-white mt-1">{report.period}</p>
                </div>
                <div className="col-span-2 bg-white/5 backdrop-blur border border-white/10 rounded-lg p-4">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Generated On</p>
                  <p className="text-sm font-semibold text-white mt-1">{report.generatedAt}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KEY METRICS */}
        <div className="grid grid-cols-4 border-b border-slate-200">
          <HeroStat label="Total Actual Sales" value={`KES ${fmt(totals.actual)}`} accent={C.navy} />
          <HeroStat label="Total System Sales" value={`KES ${fmt(totals.system)}`} accent={C.slate} />
          <HeroStat label="Net Sales Variance" value={`${totals.variance >= 0 ? '+' : ''}KES ${fmt(totals.variance)}`} accent={totalVarianceColor} delta={`${totals.system === 0 ? '0.00' : ((totals.variance / totals.system) * 100).toFixed(2)}%`} />
          <HeroStat label="Company Closing Debt" value={`KES ${fmt(totals.closingDebt)}`} accent={C.rose} isLast />
        </div>

        {/* Empty state banner */}
        {!hasSalesData && (
          <div className="px-12 py-6 bg-amber-50 border-b border-amber-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center text-amber-800 text-xl font-bold shrink-0">!</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-amber-900 mb-1">No Sales Data Available</p>
                <p className="text-sm text-amber-800 leading-relaxed">
                  The consolidated report is currently showing zero sales because no daily sales records exist for this period.
                  To populate this report:
                </p>
                <ol className="text-sm text-amber-800 mt-2 ml-4 list-decimal space-y-1">
                  <li><Link href="/admin/staff" className="font-semibold underline">Add staff members</Link> to branches via the Staff Management page</li>
                  <li><Link href="/operations/daily-sales" className="font-semibold underline">Enter daily sales</Link> for each staff member</li>
                  <li>Or use the <Link href="/admin/demo-data" className="font-semibold underline">Demo Data Generator</Link> to quickly populate sample data for testing</li>
                </ol>
                <p className="text-xs text-amber-700 mt-3 italic">
                  Stock loss, recovery, and debt figures below are calculated from approved stocktakes and account balances only.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* EXECUTIVE SUMMARY */}
        <section className="px-12 py-10 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-xs font-mono text-slate-400 font-semibold">01</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Executive Summary</h2>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed mb-6 max-w-4xl">
            {hasSalesData ? (
              <>Mediocare Pharmaceutical Ltd recorded consolidated actual sales of <strong className="text-slate-900">KES {fmt(totals.actual)}</strong> against system-generated sales of <strong className="text-slate-900">KES {fmt(totals.system)}</strong> across its <strong>{totals.branchCount} branches</strong> network for the period <strong>{report.periodRange}</strong>. </>
            ) : (
              <>No sales transactions were recorded across the <strong>{totals.branchCount} branches</strong> network for the period <strong>{report.periodRange}</strong>. </>
            )}
            {hasStockData ? (
              <>Stock loss identified from approved physical counts totalled <strong className="text-rose-600">KES {fmt(totals.stockLoss)}</strong>{hasRecoveryData ? <>, of which <strong className="text-emerald-600">KES {fmt(totals.recovery)}</strong> was recovered through excess sales</> : ''}. </>
            ) : (
              <>No stock loss was identified from approved stocktakes in this period. </>
            )}
            {totals.remaining > 0 && (
              <>The remaining unrecovered stock loss of <strong className="text-rose-600">KES {fmt(totals.remaining)}</strong> has been carried to the main account, resulting in a company-wide closing debt position of <strong className="text-rose-600">KES {fmt(totals.closingDebt)}</strong>.</>
            )}
          </p>

          {/* Highlight Cards — only show if data exists */}
          {(hasSalesData || highestLoss.length > 0) && (
            <div className="grid grid-cols-3 gap-5">
              {hasSalesData && topBranches[0] && (
                <HighlightCard
                  title="Top Performing Branch"
                  mainValue={topBranches[0].name}
                  secondaryValue={`KES ${fmt(topBranches[0].actual)}`}
                  accent={C.emerald}
                  icon="★"
                />
              )}
              {highestLoss[0] && (
                <HighlightCard
                  title="Highest Stock Loss"
                  mainValue={highestLoss[0].name}
                  secondaryValue={`KES ${fmt(highestLoss[0].remaining)}`}
                  accent={C.rose}
                  icon="⚠"
                />
              )}
              {hasRecoveryData && (() => {
                const bestRec = [...branches].filter((b: any) => b.stockLoss > 0).sort((a: any, b: any) => (b.recovery / b.stockLoss) - (a.recovery / a.stockLoss))[0];
                return bestRec ? (
                  <HighlightCard
                    title="Best Recovery Rate"
                    mainValue={bestRec.name}
                    secondaryValue={`KES ${fmt(bestRec.recovery)} recovered`}
                    accent={C.amber}
                    icon="✓"
                  />
                ) : null;
              })()}
            </div>
          )}
        </section>

        {/* BRANCH TABLE */}
        <section className="px-12 py-10 border-b border-slate-200">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400 font-semibold">02</span>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Branch Performance Matrix</h2>
            </div>
            <p className="text-xs text-slate-500">All values in KES</p>
          </div>

          <div className="overflow-hidden border border-slate-200 rounded-xl">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white">
                  <th className="text-left px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Branch</th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Actual</th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">System</th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Variance</th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Var %</th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Stock Loss</th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Recovery</th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Rec %</th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Unrecovered</th>
                  <th className="text-right px-4 py-3 font-semibold uppercase tracking-wider text-[10px]">Closing Debt</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b: any, idx: number) => {
                  const varianceColor = b.variance < 0 ? C.rose : b.variance > 0 ? C.emerald : C.slate;
                  const varPct = b.system === 0 ? 0 : (b.variance / b.system) * 100;
                  const recPct = b.stockLoss === 0 ? 100 : (b.recovery / b.stockLoss) * 100;
                  return (
                    <tr key={b.branchId} className={idx % 2 === 0 ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 hover:bg-slate-100'}>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-900">{b.name}</div>
                        <div className="text-[10px] text-slate-500">{b.code} · {b.location}</div>
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-700">{fmtInt(b.actual)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{fmtInt(b.system)}</td>
                      <td className="px-4 py-2.5 text-right font-semibold" style={{ color: varianceColor }}>{b.variance >= 0 ? '+' : ''}{fmtInt(b.variance)}</td>
                      <td className="px-4 py-2.5 text-right text-xs" style={{ color: varianceColor }}>{varPct.toFixed(2)}%</td>
                      <td className="px-4 py-2.5 text-right text-rose-600 font-medium">{fmtInt(b.stockLoss)}</td>
                      <td className="px-4 py-2.5 text-right text-emerald-600 font-medium">{fmtInt(b.recovery)}</td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${recPct >= 100 ? 'bg-emerald-100 text-emerald-700' : recPct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                          {recPct.toFixed(0)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold" style={{ color: b.remaining > 0 ? C.rose : C.slate }}>{fmtInt(b.remaining)}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900">{fmtInt(b.closingDebt)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-900 text-white">
                  <td className="px-4 py-4 text-xs uppercase tracking-widest font-bold">Company Totals</td>
                  <td className="px-4 py-4 text-right font-bold">{fmtInt(totals.actual)}</td>
                  <td className="px-4 py-4 text-right font-bold">{fmtInt(totals.system)}</td>
                  <td className="px-4 py-4 text-right font-bold">{totals.variance >= 0 ? '+' : ''}{fmtInt(totals.variance)}</td>
                  <td className="px-4 py-4 text-right font-bold text-xs">{totals.system === 0 ? '0.00' : ((totals.variance / totals.system) * 100).toFixed(2)}%</td>
                  <td className="px-4 py-4 text-right font-bold">{fmtInt(totals.stockLoss)}</td>
                  <td className="px-4 py-4 text-right font-bold">{fmtInt(totals.recovery)}</td>
                  <td className="px-4 py-4 text-right font-bold text-xs">{totals.stockLoss === 0 ? '100' : ((totals.recovery / totals.stockLoss) * 100).toFixed(0)}%</td>
                  <td className="px-4 py-4 text-right font-bold">{fmtInt(totals.remaining)}</td>
                  <td className="px-4 py-4 text-right font-bold">{fmtInt(totals.closingDebt)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        {/* CHART — only if data exists */}
        {hasSalesData && chartData.length > 0 && (
          <section className="px-12 py-10 border-b border-slate-200 bg-slate-50/50">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-mono text-slate-400 font-semibold">03</span>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Cross-Branch Sales Comparison</h2>
            </div>
            <div className="h-[420px] bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 10, bottom: 80 }} barGap={3}>
                  <CartesianGrid strokeDasharray="4 4" stroke={C.grid} vertical={false} />
                  <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 10 }} axisLine={{ stroke: C.slateLight }} tickLine={false} angle={-40} textAnchor="end" height={90} interval={0} />
                  <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={shortFmt} label={{ value: 'Sales (KES)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#94a3b8' } }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [`KES ${fmt(Number(v))}`, name]} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, fontWeight: 600 }} iconType="circle" />
                  <Bar dataKey="System" fill={C.slateLight} name="System Sales" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Actual" fill={C.navy} name="Actual Sales" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* HIGHLIGHTS */}
        {(topBranches.length > 0 || highestLoss.length > 0) && (
          <section className="px-12 py-10 border-b border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-xs font-mono text-slate-400 font-semibold">04</span>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Performance Highlights</h2>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {topBranches.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-5 py-3 bg-emerald-50 border-b border-emerald-100">
                    <p className="text-xs uppercase tracking-widest font-bold text-emerald-700">★ Top 5 Branches by Sales</p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {topBranches.map((b, i) => (
                      <div key={b.branchId} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                            <p className="text-[10px] text-slate-500">{b.code}</p>
                          </div>
                        </div>
                        <p className="text-sm font-bold text-slate-900">KES {fmtInt(b.actual)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-6">
                {highestLoss.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-rose-50 border-b border-rose-100">
                      <p className="text-xs uppercase tracking-widest font-bold text-rose-700">⚠ Highest Unrecovered Loss</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {highestLoss.map((b) => (
                        <div key={b.branchId} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                            <p className="text-[10px] text-slate-500">{b.code}</p>
                          </div>
                          <p className="text-sm font-bold text-rose-600">KES {fmtInt(b.remaining)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {worstVariance.length > 0 && worstVariance[0].variance < 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="px-5 py-3 bg-amber-50 border-b border-amber-100">
                      <p className="text-xs uppercase tracking-widest font-bold text-amber-700">▼ Weakest Variances</p>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {worstVariance.map((b) => (
                        <div key={b.branchId} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{b.name}</p>
                            <p className="text-[10px] text-slate-500">{b.code}</p>
                          </div>
                          <p className="text-sm font-bold text-rose-600">KES {fmtInt(b.variance)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* APPROVAL */}
        <section className="px-12 py-10">
          <div className="flex items-center gap-3 mb-8">
            <span className="text-xs font-mono text-slate-400 font-semibold">05</span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Approval & Sign-Off</h2>
          </div>
          <p className="text-sm text-slate-700 mb-10 max-w-3xl">
            This consolidated company report has been prepared from source operational data and is submitted for review, verification, and approval by the authorized signatories below.
          </p>
          <div className="grid grid-cols-3 gap-10">
            <SignatureBlock title="Prepared By" role="Head of Finance" />
            <SignatureBlock title="Reviewed By" role="Operations Director" />
            <SignatureBlock title="Approved By" role="Managing Director" />
          </div>
        </section>

        <div className="border-t border-slate-300 px-12 py-5 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
          <span>{report.organization} — Confidential Document</span>
          <span>Consolidated Report · {report.periodRange}</span>
        </div>
      </div>
    </div>
  );
}

function HeroStat({ label, value, accent, delta, isLast }: any) {
  return (
    <div className={`p-6 ${!isLast ? 'border-r border-slate-200' : ''}`} style={{ borderTop: `3px solid ${accent}` }}>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">{label}</p>
      <p className="text-xl font-bold" style={{ color: accent }}>{value}</p>
      {delta && <p className="text-xs font-semibold mt-1" style={{ color: accent }}>{delta} vs system</p>}
    </div>
  );
}

function HighlightCard({ title, mainValue, secondaryValue, accent, icon }: any) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm" style={{ borderTop: `3px solid ${accent}` }}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg" style={{ color: accent }}>{icon}</span>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">{title}</p>
      </div>
      <p className="text-base font-bold text-slate-900 mb-1">{mainValue}</p>
      <p className="text-xs font-semibold" style={{ color: accent }}>{secondaryValue}</p>
    </div>
  );
}

function SignatureBlock({ title, role }: { title: string; role: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">{title}</p>
      <p className="text-xs text-slate-500 mb-16">{role}</p>
      <div className="border-t-2 border-dashed border-slate-300 pt-2">
        <p className="text-[10px] text-slate-400">Name · Signature · Date</p>
      </div>
    </div>
  );
}
