'use client';

import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine, LabelList,
} from 'recharts';

const fmt = (n: number) =>
  n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString('en-KE', { maximumFractionDigits: 0 });
const shortFmt = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(0);
};
const pctChange = (curr: number, prev: number) => {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / Math.abs(prev)) * 100;
};

const C = {
  navy: '#0f172a', slate: '#64748b', slateLight: '#cbd5e1',
  emerald: '#059669', emeraldLight: '#34d399',
  rose: '#e11d48', roseLight: '#fb7185',
  amber: '#d97706', indigo: '#4f46e5', grid: '#e2e8f0',
};

const tooltipStyle = {
  backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
  fontSize: '12px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', padding: '8px 12px',
};
const axisTick = { fontSize: 11, fill: '#64748b', fontWeight: 500 };

export function ReportClient({ report }: { report: any }) {
  const { sales, stock, credit, recovery, attendance, charts, account, comparison } = report;
  const handlePrint = () => window.print();
  const varianceColor = sales.variance < 0 ? C.rose : sales.variance > 0 ? C.emerald : C.slate;

  const recoveryPieData = [
    { name: 'Recovered', value: recovery.recoveryApplied, fill: C.emerald },
    { name: 'Remaining Loss', value: recovery.remainingLoss, fill: C.rose },
  ].filter((d) => d.value > 0);

  return (
    <div className="report-root">
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          body { background: #fff !important; }
          .print\\:hidden { display: none !important; }
          .report-root { font-size: 10px; }
          .report-section { page-break-inside: avoid; }
          .no-print { display: none !important; }
          .recharts-wrapper { page-break-inside: avoid; }
        }
      `}</style>

      <div className="mb-6 print:hidden flex items-center justify-between">
        <Link href="/reports/monthly" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to Reports
        </Link>
        <button onClick={handlePrint}
          className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 shadow-sm">
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm print:border-0 print:shadow-none">

        {/* ═════════ NEW HEADER ═════════ */}
        <div className="px-12 pt-12 pb-8 bg-gradient-to-br from-slate-50 via-white to-slate-50 border-b-4 border-slate-900">
          <div className="flex items-start justify-between gap-12">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold">
                  {(report.branch.organization || 'S').slice(0, 1)}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold">
                    {report.branch.organization}
                  </p>
                  <p className="text-[10px] text-slate-400">Financial Control Division</p>
                </div>
              </div>

              <h1 className="text-[28px] leading-tight font-bold text-slate-900 tracking-tight">
                STOCK & FINANCIAL REPORT
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Management Reconciliation & Control Statement
              </p>

              <div className="mt-5 inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {report.periodRange}
              </div>
            </div>

            <div className="text-right space-y-3 min-w-[220px]">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Branch</p>
                <p className="text-sm font-bold text-slate-900">{report.branch.name}</p>
                <p className="text-[11px] text-slate-500">Code: {report.branch.code}</p>
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

        {/* 01 EXECUTIVE SUMMARY */}
        <Section num="01" title="Executive Summary">
          <p className="text-sm text-slate-700 leading-relaxed mb-6">
            This report presents the financial performance, stock position, and staff accountability for{' '}
            <strong>{report.branch.name}</strong> for the period{' '}
            <strong>{report.periodRange}</strong>. All figures are derived from source operational data.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KpiCard label="Actual Sales" value={fmt(sales.actual)} prefix="KES" />
            <KpiCard label="System Sales" value={fmt(sales.system)} prefix="KES" />
            <KpiCard label="Sales Variance" value={fmt(sales.variance)} prefix="KES" accent={varianceColor} delta={`${sales.variancePct.toFixed(2)}%`} deltaColor={varianceColor} />
            <KpiCard label="Selling Days" value={String(sales.sellingDays)} />
            <KpiCard label="Stock Loss" value={fmt(stock.stockLoss)} prefix="KES" accent={stock.stockLoss > 0 ? C.rose : C.emerald} />
            <KpiCard label="Shrinkage Rate" value={`${stock.shrinkageRate.toFixed(2)}%`} accent={stock.shrinkageRate > 5 ? C.rose : C.emerald} />
            <KpiCard label="Unrecovered Loss" value={fmt(account.unrecoveredLoss)} prefix="KES" accent={account.unrecoveredLoss > 0 ? C.rose : C.emerald} />
            <KpiCard label="Main Account Debt" value={fmt(account.calculatedClosing)} prefix="KES" accent={account.calculatedClosing > 0 ? C.rose : C.emerald} />
          </div>

          <HighlightRow
            items={[
              { label: 'Top Performer', value: charts.topPerformer?.name ?? '—', sub: charts.topPerformer ? `+KES ${fmt(charts.topPerformer.variance)}` : '', color: C.emerald },
              { label: 'Bottom Performer', value: charts.bottomPerformer?.name ?? '—', sub: charts.bottomPerformer ? `KES ${fmt(charts.bottomPerformer.variance)}` : '', color: charts.bottomPerformer?.variance < 0 ? C.rose : C.slate },
              { label: 'Avg Sales / Staff', value: `KES ${fmt(sales.avgStaff)}`, sub: `${sales.staffCount} staff`, color: C.indigo },
              { label: 'Attendance Rate', value: `${attendance.overall.toFixed(1)}%`, sub: `${attendance.rows.length} staff tracked`, color: attendance.overall >= 90 ? C.emerald : C.amber },
            ]}
          />

          {report.additionalInfo && (
            <div className="mt-6 p-4 rounded-lg bg-slate-50 border-l-4 border-slate-900">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2">Additional Information</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{report.additionalInfo}</p>
            </div>
          )}
        </Section>

        {/* 02 COMPARISON */}
        <Section num="02" title={`Period Comparison (${comparison.prevPeriod} → ${report.period})`}>
          <Table>
            <thead>
              <tr>
                <Th align="left">Metric</Th>
                <Th>{comparison.prevPeriod}</Th>
                <Th>{report.period}</Th>
                <Th>Change</Th>
              </tr>
            </thead>
            <tbody>
              <CompareRow label="Actual Sales" prev={comparison.prevActual} curr={sales.actual} />
              <CompareRow label="System Sales" prev={comparison.prevSystem} curr={sales.system} />
              <CompareRow label="Sales Variance" prev={comparison.prevVariance} curr={sales.variance} />
              <CompareRow label="Stock Loss" prev={comparison.prevStockLoss} curr={stock.stockLoss} invert />
              <CompareRow label="Recovery Applied" prev={comparison.prevRecovery} curr={recovery.recoveryApplied} />
              <CompareRow label="Unrecovered Loss" prev={comparison.prevRemaining} curr={recovery.remainingLoss} invert />
            </tbody>
          </Table>
        </Section>

        {/* 03 STOCK ANALYSIS */}
        <Section num="03" title="Stock Analysis">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MiniStat label="Opening Stock Value" value={`KES ${fmt(stock.openingValue)}`} />
            <MiniStat label="Stock Loss" value={`KES ${fmt(stock.stockLoss)}`} color={stock.stockLoss > 0 ? C.rose : C.emerald} />
            <MiniStat label="Shrinkage Rate" value={`${stock.shrinkageRate.toFixed(2)}%`} color={stock.shrinkageRate > 5 ? C.rose : C.emerald} />
          </div>

          {stock.items.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <Th align="left">Item</Th>
                  <Th>Expected</Th>
                  <Th>Actual</Th>
                  <Th>Loss / (Surplus)</Th>
                  <Th>Value (KES)</Th>
                </tr>
              </thead>
              <tbody>
                {stock.items.map((i: any, idx: number) => {
                  const isLoss = i.value > 0;
                  return (
                    <tr key={idx}>
                      <Td>
                        <div className="font-medium text-slate-900">{i.description}</div>
                        </Td>
                      <Td align="right">{fmtInt(i.expected)} {i.unit}</Td>
                      <Td align="right">{fmtInt(i.actual)} {i.unit}</Td>
                      <Td align="right" color={isLoss ? C.rose : C.emerald}>
                        {isLoss ? '' : '('}{fmtInt(Math.abs(i.variance))}{isLoss ? '' : ')'}
                      </Td>
                      <Td align="right" color={isLoss ? C.rose : C.emerald} bold>
                        {isLoss ? '' : '('}{fmt(Math.abs(i.value))}{isLoss ? '' : ')'}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}

          <NarrativeBlock color={stock.stockLoss > 0 ? C.rose : C.emerald}>
            {stock.stockLoss === 0
              ? 'No stock loss was recorded for the reporting period.'
              : `A stock loss of KES ${fmt(stock.stockLoss)} was recorded, representing a shrinkage rate of ${stock.shrinkageRate.toFixed(2)}% against opening stock.`}
          </NarrativeBlock>
        </Section>

        {/* 04 SALES ANALYSIS */}
        <Section num="04" title="Sales Analysis">
          <Table>
            <thead>
              <tr>
                <Th align="left">Sales Category</Th>
                <Th>Amount (KES)</Th>
                <Th>% of System</Th>
              </tr>
            </thead>
            <tbody>
              <Tr><Td>Actual Sales</Td><Td align="right" bold>{fmt(sales.actual)}</Td><Td align="right">{sales.system === 0 ? '—' : ((sales.actual / sales.system) * 100).toFixed(2) + '%'}</Td></Tr>
              <Tr><Td>System Sales</Td><Td align="right" bold>{fmt(sales.system)}</Td><Td align="right">100.00%</Td></Tr>
              <Tr highlight>
                <Td bold>Sales Variance</Td>
                <Td align="right" bold color={varianceColor}>{fmt(sales.variance)}</Td>
                <Td align="right" color={varianceColor}>{sales.variancePct.toFixed(2)}%</Td>
              </Tr>
              <Tr><Td>Excess Sales (positive days)</Td><Td align="right" color={C.emerald}>+{fmt(sales.excessSales)}</Td><Td align="right">—</Td></Tr>
              <Tr><Td>Short Sales (negative days)</Td><Td align="right" color={C.rose}>−{fmt(sales.shortSales)}</Td><Td align="right">—</Td></Tr>
              <Tr><Td>Average Daily Sales</Td><Td align="right" bold>{fmt(sales.avgDaily)}</Td><Td align="right">over {sales.sellingDays} days</Td></Tr>
            </tbody>
          </Table>

          <NarrativeBlock color={varianceColor}>
            {sales.variance > 0
              ? `Actual sales exceeded system sales by KES ${fmt(sales.variance)} (${sales.variancePct.toFixed(2)}%), indicating a positive variance for the period.`
              : sales.variance < 0
              ? `Actual sales were below system sales by KES ${fmt(Math.abs(sales.variance))} (${Math.abs(sales.variancePct).toFixed(2)}%), indicating a shortfall for the period.`
              : 'Actual sales matched system sales for the reporting period.'}
          </NarrativeBlock>

          {charts.dailyTrend.length > 0 && (
            <div className="mt-8 report-section">
              <ChartTitle subtitle={`${sales.sellingDays} selling days · Avg KES ${fmt(sales.avgDaily)}/day`}>
                Daily Sales Trend
              </ChartTitle>
              <div className="h-80 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.dailyTrend} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="day" tick={axisTick} axisLine={{ stroke: C.slateLight }} tickLine={false}
                      label={{ value: 'Day of Month', position: 'insideBottom', offset: -2, style: { fontSize: 11, fill: '#94a3b8' } }} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={shortFmt}
                      label={{ value: 'Sales (KES)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#94a3b8' } }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [`KES ${fmt(Number(v))}`, name]} labelFormatter={(l) => `Day ${l}`} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, fontWeight: 500 }} iconType="circle" />
                    <ReferenceLine y={sales.avgDaily} stroke={C.amber} strokeDasharray="4 4" strokeWidth={1.5}
                      label={{ value: `Avg ${shortFmt(sales.avgDaily)}`, position: 'right', style: { fontSize: 10, fill: C.amber, fontWeight: 600 } }} />
                    <Line type="monotone" dataKey="system" stroke={C.slate} strokeWidth={2} strokeDasharray="5 4"
                      name="System Sales" dot={{ r: 2, fill: C.slate, strokeWidth: 0 }} activeDot={{ r: 5, fill: C.slate, stroke: '#fff', strokeWidth: 2 }} />
                    <Line type="monotone" dataKey="actual" stroke={C.navy} strokeWidth={3}
                      name="Actual Sales" dot={{ r: 3, fill: C.navy, stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6, fill: C.navy, stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {charts.staffSummary.length > 0 && (
            <div className="mt-8 report-section">
              <ChartTitle subtitle="Actual vs system sales per staff member">Staff Sales Comparison</ChartTitle>
              <div className="h-80 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.staffSummary} margin={{ top: 20, right: 30, left: 10, bottom: 5 }} barGap={4}>
                    <CartesianGrid strokeDasharray="4 4" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 11 }} axisLine={{ stroke: C.slateLight }} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={shortFmt}
                      label={{ value: 'Sales (KES)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#94a3b8' } }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [`KES ${fmt(Number(v))}`, name]} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, fontWeight: 500 }} iconType="circle" />
                    <Bar dataKey="system" fill={C.slateLight} name="System Sales" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="actual" fill={C.navy} name="Actual Sales" radius={[5, 5, 0, 0]}>
                      <LabelList dataKey="actual" position="top" formatter={(v: any) => shortFmt(Number(v) || 0)} style={{ fontSize: 10, fill: '#0f172a', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {charts.staffSummary.length > 0 && (
            <div className="mt-8 report-section">
              <ChartTitle subtitle="Individual performance breakdown">Staff Sales Detail</ChartTitle>
              <Table>
                <thead>
                  <tr>
                    <Th align="left">Staff</Th>
                    <Th>Days</Th>
                    <Th>Actual (KES)</Th>
                    <Th>System (KES)</Th>
                    <Th>Variance</Th>
                    <Th>Var %</Th>
                    <Th>Avg/Day</Th>
                  </tr>
                </thead>
                <tbody>
                  {charts.staffSummary.map((s: any, i: number) => {
                    const color = s.variance > 0 ? C.emerald : s.variance < 0 ? C.rose : C.slate;
                    return (
                      <tr key={i}>
                        <Td>{s.name}</Td>
                        <Td align="right">{s.days}</Td>
                        <Td align="right">{fmt(s.actual)}</Td>
                        <Td align="right" muted>{fmt(s.system)}</Td>
                        <Td align="right" color={color} bold>{s.variance >= 0 ? '+' : ''}{fmt(s.variance)}</Td>
                        <Td align="right" color={color}>{s.variancePct.toFixed(2)}%</Td>
                        <Td align="right" muted>{fmt(s.avgDaily)}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Section>

        {/* 05 ACCOUNT STANDING / MAIN ACCOUNT DEBT */}
        <Section num="05" title="Main Account Standing (Debt Position)">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MiniStat label="Opening Account Balance" value={`KES ${fmt(account.openingBalance)}`} />
            <MiniStat label="Unrecovered Stock Loss" value={`KES ${fmt(account.unrecoveredLoss)}`} color={account.unrecoveredLoss > 0 ? C.rose : C.emerald} />
            <MiniStat label="Closing Account Balance" value={`KES ${fmt(account.calculatedClosing)}`} color={account.calculatedClosing > 0 ? C.rose : C.emerald} />
          </div>

          <Table>
            <thead>
              <tr>
                <Th align="left">Account Position</Th>
                <Th>Amount (KES)</Th>
              </tr>
            </thead>
            <tbody>
              <Tr><Td>Opening Balance</Td><Td align="right">{fmt(account.openingBalance)}</Td></Tr>
              <Tr><Td>+ Unrecovered Stock Loss (from recovery section)</Td><Td align="right" color={C.rose}>+{fmt(account.unrecoveredLoss)}</Td></Tr>
              <Tr highlight><Td bold>Closing Account Balance (Outstanding Debt)</Td><Td align="right" bold color={account.calculatedClosing > 0 ? C.rose : C.emerald}>{fmt(account.calculatedClosing)}</Td></Tr>
            </tbody>
          </Table>

          <NarrativeBlock color={account.calculatedClosing > 0 ? C.rose : C.emerald}>
            {account.calculatedClosing > 0
              ? `The main account carries an outstanding debt of KES ${fmt(account.calculatedClosing)}, comprising the opening balance of KES ${fmt(account.openingBalance)} and unrecovered stock loss of KES ${fmt(account.unrecoveredLoss)}.`
              : 'The main account has no outstanding debt for this period.'}
          </NarrativeBlock>

          {/* Credit & Repayments — informational, not part of main debt */}
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-[0.15em] mb-3 mt-8">
            Credit & Repayment Summary (Information only)
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <MiniStat label="Credit Sales" value={`KES ${fmt(credit.totalCredit)}`} color={C.amber} />
            <MiniStat label="Repayments" value={`KES ${fmt(credit.totalRepayments)}`} color={C.emerald} />
            <MiniStat label="Net Outstanding Credit" value={`KES ${fmt(credit.outstanding)}`} color={credit.outstanding > 0 ? C.amber : C.emerald} />
          </div>

          {charts.creditTrend.length > 0 && (
            <div className="mt-6 report-section">
              <ChartTitle subtitle="Daily credit issuance vs customer repayments">Credit Activity</ChartTitle>
              <div className="h-64 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.creditTrend} margin={{ top: 20, right: 30, left: 10, bottom: 5 }} barGap={2}>
                    <CartesianGrid strokeDasharray="4 4" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="day" tick={axisTick} axisLine={{ stroke: C.slateLight }} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={shortFmt} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [`KES ${fmt(Number(v))}`, name]} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, fontWeight: 500 }} iconType="circle" />
                    <Bar dataKey="credit" fill={C.amber} name="Credit Sales" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="repayment" fill={C.emerald} name="Repayments" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Section>

        {/* 06 RECOVERY */}
        <Section num="06" title="Stock Loss Recovery">
          <Table>
            <thead>
              <tr>
                <Th align="left">Recovery Item</Th>
                <Th align="left">Formula</Th>
                <Th>Amount (KES)</Th>
              </tr>
            </thead>
            <tbody>
              <Tr><Td>Total Stock Loss</Td><Td align="left" muted>from stocktake variances</Td><Td align="right" color={C.rose} bold>{fmt(recovery.stockLoss)}</Td></Tr>
              <Tr><Td>Excess Sales Available</Td><Td align="left" muted>positive variance days</Td><Td align="right" color={C.emerald} bold>+{fmt(recovery.excessSales)}</Td></Tr>
              <Tr highlight><Td bold>Recovery Applied</Td><Td align="left" muted>MIN(excess, loss)</Td><Td align="right" bold color={C.emerald}>{fmt(recovery.recoveryApplied)}</Td></Tr>
              <Tr><Td>Remaining Loss</Td><Td align="left" muted>MAX(loss − recovery, 0)</Td><Td align="right" color={recovery.remainingLoss > 0 ? C.rose : C.slate} bold>{fmt(recovery.remainingLoss)}</Td></Tr>
              <Tr><Td>Surplus</Td><Td align="left" muted>MAX(excess − loss, 0)</Td><Td align="right" color={recovery.surplus > 0 ? C.emerald : C.slate} bold>{fmt(recovery.surplus)}</Td></Tr>
              <Tr><Td>Recovery Rate</Td><Td align="left" muted>recovery ÷ loss × 100</Td><Td align="right" bold>{recovery.recoveryRate.toFixed(2)}%</Td></Tr>
            </tbody>
          </Table>

          <NarrativeBlock color={recovery.stockLoss === 0 ? C.slate : recovery.recoveryApplied >= recovery.stockLoss ? C.emerald : C.rose}>
            {recovery.stockLoss === 0
              ? 'No stock loss was recorded for the period, so no recovery was required.'
              : recovery.recoveryApplied >= recovery.stockLoss
              ? `The available excess sales fully covered the recorded stock loss. A surplus of KES ${fmt(recovery.surplus)} remains after recovery.`
              : `A remaining unrecovered stock loss of KES ${fmt(recovery.remainingLoss)} has been added to the main account as outstanding debt.`}
          </NarrativeBlock>

          {recoveryPieData.length > 0 && (
            <div className="mt-8 report-section">
              <ChartTitle subtitle="Recovery vs remaining loss breakdown">Recovery Analysis</ChartTitle>
              <div className="h-80 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={recoveryPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={110} paddingAngle={4}
                      label={({ name, value }: any) => `${name}: KES ${fmt(Number(value))}`} labelLine={{ stroke: C.slate, strokeWidth: 1 }}>
                      {recoveryPieData.map((d, i) => <Cell key={i} fill={d.fill} stroke="#fff" strokeWidth={3} />)}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `KES ${fmt(Number(v))}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Section>

        {/* 07 ATTENDANCE */}
        <Section num="07" title="Staff Attendance Analysis">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <MiniStat label="Staff Tracked" value={String(attendance.rows.length)} />
            <MiniStat label="Scheduled Days" value={String(totalScheduledOf(attendance))} />
            <MiniStat label="Days Present" value={String(totalPresentOf(attendance))} color={C.emerald} />
            <MiniStat label="Attendance Rate" value={`${attendance.overall.toFixed(2)}%`} color={attendance.overall >= 90 ? C.emerald : C.amber} />
          </div>

          <Table>
            <thead>
              <tr>
                <Th align="left">Staff</Th>
                <Th>Present</Th>
                <Th>Off</Th>
                <Th>Leave</Th>
                <Th>Absent</Th>
                <Th>Total</Th>
                <Th>Rate</Th>
              </tr>
            </thead>
            <tbody>
              {attendance.rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">No attendance data recorded.</td></tr>
              ) : (
                attendance.rows.map((r: any, i: number) => (
                  <tr key={i}>
                    <Td>{r.name}</Td>
                    <Td align="right" color={C.emerald} bold>{r.present}</Td>
                    <Td align="right" muted>{r.off}</Td>
                    <Td align="right" muted>{r.leave}</Td>
                    <Td align="right" color={r.absent > 0 ? C.rose : C.slate}>{r.absent}</Td>
                    <Td align="right">{r.total}</Td>
                    <Td align="right" bold color={r.rate >= 90 ? C.emerald : r.rate >= 75 ? C.amber : C.rose}>{r.rate.toFixed(1)}%</Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Section>

        {/* 08 KPI */}
        <Section num="08" title="Key Performance Indicators">
          <Table>
            <thead>
              <tr>
                <Th align="left">KPI</Th>
                <Th align="left">Formula / Basis</Th>
                <Th>Value</Th>
              </tr>
            </thead>
            <tbody>
              <KpiRow name="Stock Shrinkage Rate" formula="Stock Loss ÷ Opening Stock × 100" value={`${stock.shrinkageRate.toFixed(2)}%`} warn={stock.shrinkageRate > 5} />
              <KpiRow name="Sales Variance Rate" formula="Variance ÷ System Sales × 100" value={`${sales.variancePct.toFixed(2)}%`} warn={sales.variancePct < 0} />
              <KpiRow name="Stock Loss Recovery Rate" formula="Recovery ÷ Stock Loss × 100" value={`${recovery.recoveryRate.toFixed(2)}%`} warn={recovery.recoveryRate < 100 && stock.stockLoss > 0} />
              <KpiRow name="Net Stock Position After Recovery" formula="Remaining loss after recovery" value={`KES ${fmt(recovery.remainingLoss)}`} warn={recovery.remainingLoss > 0} />
              <KpiRow name="Main Account Debt" formula="Opening + Unrecovered Loss" value={`KES ${fmt(account.calculatedClosing)}`} warn={account.calculatedClosing > 0} />
              <KpiRow name="Total Actual Sales" formula="Sum of daily actual sales" value={`KES ${fmt(sales.actual)}`} />
              <KpiRow name="Total System Sales" formula="Sum of daily system sales" value={`KES ${fmt(sales.system)}`} />
              <KpiRow name="Average Daily Sales" formula="Total Actual ÷ Selling Days" value={`KES ${fmt(sales.avgDaily)}`} />
              <KpiRow name="Staff Attendance Rate" formula="Present Days ÷ Scheduled Days × 100" value={`${attendance.overall.toFixed(2)}%`} warn={attendance.overall < 90} />
              <KpiRow name="Total Staff" formula="Active staff in period" value={String(attendance.rows.length)} />
            </tbody>
          </Table>
        </Section>

        {/* 09 APPROVAL */}
        <Section num="09" title="Approval">
          <p className="text-sm text-slate-700 mb-8">
            This report has been prepared from source operational data and is submitted for review and approval.
          </p>
          <div className="grid grid-cols-3 gap-8 pt-4">
            <SignatureBlock title="Prepared By" role="Stock Controller" />
            <SignatureBlock title="Reviewed By" role="Branch Manager" />
            <SignatureBlock title="Approved By" role="Accountant / Director" />
          </div>
        </Section>

        <div className="border-t border-slate-300 px-12 py-4 flex items-center justify-between text-xs text-slate-500">
          <span>{report.branch.organization} — Confidential</span>
          <span>{report.branch.name} · {report.periodRange}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════ HELPERS ═══════════════
function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="report-section px-12 py-8 border-b border-slate-200 last:border-0">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xs font-mono text-slate-400">{num}</span>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}
function KpiCard({ label, value, prefix, accent, delta, deltaColor }: any) {
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white" style={{ borderLeft: `3px solid ${accent ?? C.navy}` }}>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-lg font-bold mt-0.5" style={{ color: accent ?? C.navy }}>
        {prefix && <span className="text-xs font-semibold text-slate-400 mr-1">{prefix}</span>}
        {value}
      </p>
      {delta && <p className="text-xs font-medium mt-0.5" style={{ color: deltaColor ?? C.slate }}>{delta}</p>}
    </div>
  );
}
function MiniStat({ label, value, color }: any) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold mt-1" style={{ color: color ?? C.navy }}>{value}</p>
    </div>
  );
}
function HighlightRow({ items }: any) {
  return (
    <div className="grid grid-cols-4 gap-3 mt-2">
      {items.map((it: any, i: number) => (
        <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{it.label}</p>
          <p className="text-sm font-bold text-slate-900 mt-1 truncate">{it.value}</p>
          {it.sub && <p className="text-xs mt-0.5 font-medium" style={{ color: it.color }}>{it.sub}</p>}
        </div>
      ))}
    </div>
  );
}
function ChartTitle({ children, subtitle }: any) {
  return (
    <div className="mb-3">
      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <span className="w-1 h-3.5 bg-slate-900 inline-block rounded-sm" />{children}
      </h3>
      {subtitle && <p className="text-xs text-slate-500 ml-3 mt-0.5">{subtitle}</p>}
    </div>
  );
}
function NarrativeBlock({ children, color }: any) {
  return (
    <div className="mt-4 p-4 rounded-lg text-sm text-slate-700 leading-relaxed" style={{ background: `${color}0d`, borderLeft: `3px solid ${color}` }}>
      {children}
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
function Table({ children }: any) {
  return <div className="overflow-hidden border border-slate-200 rounded-lg"><table className="w-full text-sm border-collapse">{children}</table></div>;
}
function Th({ children, align = 'right' }: any) {
  return <th className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider text-slate-500 bg-slate-100 border-b border-slate-200 text-${align}`}>{children}</th>;
}
function Td({ children, align = 'left', bold, muted, color }: any) {
  return <td className={`px-4 py-2.5 border-t border-slate-100 ${align === 'right' ? 'text-right' : ''} ${bold ? 'font-semibold' : ''} ${muted ? 'text-slate-500 text-xs' : ''}`} style={{ color: color ?? undefined }}>{children}</td>;
}
function Tr({ children, highlight }: any) { return <tr className={highlight ? 'bg-slate-50' : ''}>{children}</tr>; }
function KpiRow({ name, formula, value, warn }: any) {
  return (
    <tr>
      <td className="px-4 py-2.5 border-t border-slate-100 font-medium text-slate-800">{name}</td>
      <td className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500">{formula}</td>
      <td className="px-4 py-2.5 border-t border-slate-100 text-right font-bold" style={{ color: warn ? C.rose : C.navy }}>{value}</td>
    </tr>
  );
}
function CompareRow({ label, prev, curr, invert }: { label: string; prev: number; curr: number; invert?: boolean }) {
  const change = pctChange(curr, prev);
  const isUp = change > 0;
  const isGood = invert ? !isUp : isUp;
  const color = Math.abs(change) < 0.01 ? C.slate : isGood ? C.emerald : C.rose;
  return (
    <tr>
      <td className="px-4 py-2.5 border-t border-slate-100 font-medium text-slate-800">{label}</td>
      <td className="px-4 py-2.5 border-t border-slate-100 text-right text-slate-600">{fmt(prev)}</td>
      <td className="px-4 py-2.5 border-t border-slate-100 text-right font-semibold text-slate-900">{fmt(curr)}</td>
      <td className="px-4 py-2.5 border-t border-slate-100 text-right font-semibold" style={{ color }}>
        {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
      </td>
    </tr>
  );
}
function totalPresentOf(attendance: any) { return attendance.rows.reduce((s: number, r: any) => s + r.present, 0); }
function totalScheduledOf(attendance: any) { return attendance.rows.reduce((s: number, r: any) => s + r.total, 0); }
