'use client';

import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';

const fmt = (n: number) =>
  n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtInt = (n: number) =>
  n.toLocaleString('en-KE', { maximumFractionDigits: 0 });

const shortFmt = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(0);
};

// Professional palette
const C = {
  navy: '#0f172a',
  slate: '#64748b',
  slateLight: '#cbd5e1',
  emerald: '#059669',
  emeraldLight: '#34d399',
  rose: '#e11d48',
  roseLight: '#fb7185',
  amber: '#d97706',
  indigo: '#4f46e5',
  grid: '#e2e8f0',
};

const chartMargins = { top: 10, right: 20, left: 10, bottom: 5 };

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  fontSize: '12px',
  boxShadow: '0 4px 12px rgba(15,23,42,0.08)',
};

export function ReportClient({ report }: { report: any }) {
  const { sales, stock, credit, recovery, attendance, charts } = report;
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
          @page { size: A4; margin: 14mm 12mm; }
          body { background: #fff !important; }
          .print\\:hidden { display: none !important; }
          .report-root { font-size: 11px; }
          .report-section { page-break-inside: avoid; }
          .page-break { page-break-before: always; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="mb-6 print:hidden flex items-center justify-between">
        <Link href="/reports/monthly" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to Reports
        </Link>
        <button
          onClick={handlePrint}
          className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 shadow-sm"
        >
          🖨️ Print / Save as PDF
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm print:border-0 print:shadow-none">
        {/* ═══════════ COVER HEADER ═══════════ */}
        <div className="border-b-4 border-slate-900 px-10 pt-10 pb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-8 bg-slate-900" />
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500 font-medium">
                  {report.branch.organization}
                </p>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight mt-3">
                STOCK AND FINANCIAL REPORT
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Management Reconciliation Report
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-widest text-slate-400">Period</p>
              <p className="text-lg font-bold text-slate-900">{report.period}</p>
              <p className="text-xs text-slate-500 mt-1">Generated: {report.generatedAt}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-6 mt-8 pt-6 border-t border-slate-200">
            <MetaField label="Branch" value={report.branch.name} />
            <MetaField label="Branch Code" value={report.branch.code} />
            <MetaField label="Location" value={report.branch.location || '—'} />
            <MetaField label="Reporting Period" value={report.period} />
          </div>
        </div>

        {/* ═══════════ 1. EXECUTIVE SUMMARY ═══════════ */}
        <Section num="01" title="Executive Summary">
          <p className="text-sm text-slate-700 leading-relaxed mb-6">
            This report presents the financial performance, stock position, and staff accountability for{' '}
            <strong className="text-slate-900">{report.branch.name}</strong> for the reporting period{' '}
            <strong className="text-slate-900">{report.period}</strong>. The analysis covers stock movements,
            sales performance, account standing, stock-loss recovery, and staff attendance. All figures are
            derived directly from recorded operational data.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <KpiCard label="Actual Sales" value={fmt(sales.actual)} prefix="KES" />
            <KpiCard label="System Sales" value={fmt(sales.system)} prefix="KES" />
            <KpiCard
              label="Sales Variance"
              value={fmt(sales.variance)}
              prefix="KES"
              accent={varianceColor}
              delta={`${sales.variancePct.toFixed(2)}%`}
              deltaColor={varianceColor}
            />
            <KpiCard label="Selling Days" value={String(sales.sellingDays)} />
            <KpiCard
              label="Stock Loss"
              value={fmt(stock.stockLoss)}
              prefix="KES"
              accent={stock.stockLoss > 0 ? C.rose : C.emerald}
            />
            <KpiCard label="Shrinkage Rate" value={`${stock.shrinkageRate.toFixed(2)}%`} />
            <KpiCard label="Credit Sales" value={fmt(credit.totalCredit)} prefix="KES" />
            <KpiCard
              label="Outstanding Credit"
              value={fmt(credit.outstanding)}
              prefix="KES"
              accent={credit.outstanding > 0 ? C.amber : C.emerald}
            />
          </div>

          <HighlightRow
            items={[
              { label: 'Top Performer', value: charts.topPerformer?.name ?? '—', sub: charts.topPerformer ? `+KES ${fmt(charts.topPerformer.variance)}` : '', color: C.emerald },
              { label: 'Bottom Performer', value: charts.bottomPerformer?.name ?? '—', sub: charts.bottomPerformer ? `KES ${fmt(charts.bottomPerformer.variance)}` : '', color: charts.bottomPerformer?.variance < 0 ? C.rose : C.slate },
              { label: 'Avg Sales / Staff', value: `KES ${fmt(sales.avgStaff)}`, sub: `${sales.staffCount} staff`, color: C.indigo },
              { label: 'Attendance', value: `${attendance.overall.toFixed(1)}%`, sub: `${totalPresentOf(attendance)} present days`, color: attendance.overall >= 90 ? C.emerald : C.amber },
            ]}
          />
        </Section>

        {/* ═══════════ 2. STOCK ANALYSIS ═══════════ */}
        <Section num="02" title="Stock Analysis">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Stock Position Summary</h3>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <MiniStat label="Opening Stock Value" value={`KES ${fmt(stock.openingValue)}`} />
            <MiniStat label="Stock Loss" value={`KES ${fmt(stock.stockLoss)}`} color={stock.stockLoss > 0 ? C.rose : C.emerald} />
            <MiniStat label="Shrinkage Rate" value={`${stock.shrinkageRate.toFixed(2)}%`} />
          </div>

          {stock.items.length > 0 && (
            <>
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-6">
                Stock Variance Detail
              </h3>
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
                          <div className="text-xs text-slate-500">{i.sku}</div>
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
            </>
          )}

          <p className="text-sm text-slate-700 mt-4">
            {stock.stockLoss === 0
              ? 'No stock loss was recorded for the reporting period.'
              : `A stock loss of KES ${fmt(stock.stockLoss)} was recorded, representing a shrinkage rate of ${stock.shrinkageRate.toFixed(2)}% against opening stock.`}
          </p>
        </Section>

        {/* ═══════════ 3. SALES ANALYSIS ═══════════ */}
        <Section num="03" title="Sales Analysis">
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
              <Tr><Td>Short Sales (negative days)</Td><Td align="right" color={C.rose}>-{fmt(sales.shortSales)}</Td><Td align="right">—</Td></Tr>
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

          {/* Chart 1: Daily Trend */}
          {charts.dailyTrend.length > 0 && (
            <div className="mt-6 report-section">
              <ChartTitle>Daily Sales Trend</ChartTitle>
              <div className="h-72 bg-slate-50/50 border border-slate-200 rounded-lg p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={charts.dailyTrend} margin={chartMargins}>
                    <defs>
                      <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.navy} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={C.navy} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="systemGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={C.slate} stopOpacity={0.12} />
                        <stop offset="95%" stopColor={C.slate} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: C.grid }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={shortFmt} />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: any, name: any) => [`KES ${fmt(Number(v))}`, name]}
                      labelFormatter={(l) => `Day ${l}`}
                    />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="line" />
                    <Area type="monotone" dataKey="system" stroke={C.slate} strokeWidth={2} strokeDasharray="4 4" fill="url(#systemGrad)" name="System" />
                    <Area type="monotone" dataKey="actual" stroke={C.navy} strokeWidth={2.5} fill="url(#actualGrad)" name="Actual" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Chart 2: Staff Comparison */}
          {charts.staffSummary.length > 0 && (
            <div className="mt-6 report-section">
              <ChartTitle>Staff Sales Comparison — Actual vs System</ChartTitle>
              <div className="h-72 bg-slate-50/50 border border-slate-200 rounded-lg p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.staffSummary} margin={chartMargins}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: C.grid }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={shortFmt} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [`KES ${fmt(Number(v))}`, name]} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar dataKey="system" fill={C.slateLight} name="System" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="actual" fill={C.navy} name="Actual" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Staff Detail Table */}
          {charts.staffSummary.length > 0 && (
            <div className="mt-6 report-section">
              <ChartTitle>Staff Sales Detail</ChartTitle>
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

        {/* ═══════════ 4. ACCOUNT STANDING ═══════════ */}
        <Section num="04" title="Account Standing">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MiniStat label="Credit Sales" value={`KES ${fmt(credit.totalCredit)}`} />
            <MiniStat label="Repayments" value={`KES ${fmt(credit.totalRepayments)}`} color={C.emerald} />
            <MiniStat
              label="Outstanding Balance"
              value={`KES ${fmt(credit.outstanding)}`}
              color={credit.outstanding > 0 ? C.amber : C.emerald}
            />
          </div>

          <Table>
            <thead>
              <tr>
                <Th align="left">Account Position</Th>
                <Th>Amount (KES)</Th>
                <Th>% of Credit</Th>
              </tr>
            </thead>
            <tbody>
              <Tr><Td>Opening Credit Balance</Td><Td align="right">{fmt(0)}</Td><Td align="right">—</Td></Tr>
              <Tr><Td>+ Credit Sales</Td><Td align="right" color={C.amber}>+{fmt(credit.totalCredit)}</Td><Td align="right">100.00%</Td></Tr>
              <Tr><Td>- Repayments</Td><Td align="right" color={C.emerald}>-{fmt(credit.totalRepayments)}</Td><Td align="right">{credit.totalCredit === 0 ? '—' : (credit.repaymentRate.toFixed(2) + '%')}</Td></Tr>
              <Tr highlight>
                <Td bold>Closing Outstanding Balance</Td>
                <Td align="right" bold>{fmt(credit.outstanding)}</Td>
                <Td align="right">{credit.totalCredit === 0 ? '—' : ((credit.outstanding / credit.totalCredit) * 100).toFixed(2) + '%'}</Td>
              </Tr>
            </tbody>
          </Table>

          <NarrativeBlock color={credit.outstanding === 0 ? C.emerald : C.amber}>
            {credit.totalCredit === 0
              ? 'No credit sales were recorded for the reporting period.'
              : `A total of KES ${fmt(credit.totalCredit)} in credit sales was recorded during the period. Repayments of KES ${fmt(credit.totalRepayments)} were received, resulting in a repayment rate of ${credit.repaymentRate.toFixed(2)}% and an outstanding balance of KES ${fmt(credit.outstanding)}.`}
          </NarrativeBlock>

          {charts.creditTrend.length > 0 && (
            <div className="mt-6 report-section">
              <ChartTitle>Credit Sales vs Repayments — Daily Movement</ChartTitle>
              <div className="h-64 bg-slate-50/50 border border-slate-200 rounded-lg p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.creditTrend} margin={chartMargins}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: C.grid }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={shortFmt} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [`KES ${fmt(Number(v))}`, name]} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                    <Bar dataKey="credit" fill={C.amber} name="Credit Sales" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="repayment" fill={C.emerald} name="Repayments" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </Section>

        {/* ═══════════ 5. STOCK LOSS RECOVERY ═══════════ */}
        <Section num="05" title="Stock Loss Recovery & Liability">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Recovery Calculation
          </h3>

          <Table>
            <thead>
              <tr>
                <Th align="left">Recovery Item</Th>
                <Th>Formula</Th>
                <Th>Amount (KES)</Th>
              </tr>
            </thead>
            <tbody>
              <Tr><Td>Total Stock Loss</Td><Td align="left" muted>from stocktake variances</Td><Td align="right" color={C.rose} bold>{fmt(recovery.stockLoss)}</Td></Tr>
              <Tr><Td>Excess Sales Available</Td><Td align="left" muted>positive variance days</Td><Td align="right" color={C.emerald} bold>+{fmt(recovery.excessSales)}</Td></Tr>
              <Tr highlight>
                <Td bold>Recovery Applied</Td>
                <Td align="left" muted>MIN(excess, loss)</Td>
                <Td align="right" bold color={C.emerald}>{fmt(recovery.recoveryApplied)}</Td>
              </Tr>
              <Tr><Td>Remaining Loss</Td><Td align="left" muted>MAX(loss - recovery, 0)</Td><Td align="right" color={recovery.remainingLoss > 0 ? C.rose : C.slate} bold>{fmt(recovery.remainingLoss)}</Td></Tr>
              <Tr><Td>Surplus</Td><Td align="left" muted>MAX(excess - loss, 0)</Td><Td align="right" color={recovery.surplus > 0 ? C.emerald : C.slate} bold>{fmt(recovery.surplus)}</Td></Tr>
              <Tr><Td>Recovery Rate</Td><Td align="left" muted>recovery ÷ loss</Td><Td align="right" bold>{recovery.recoveryRate.toFixed(2)}%</Td></Tr>
            </tbody>
          </Table>

          <NarrativeBlock
            color={
              recovery.stockLoss === 0
                ? C.slate
                : recovery.recoveryApplied >= recovery.stockLoss
                ? C.emerald
                : C.rose
            }
          >
            {recovery.stockLoss === 0
              ? 'No stock loss was recorded for the period, so no recovery was required.'
              : recovery.recoveryApplied >= recovery.stockLoss
              ? `The available excess sales fully covered the recorded stock loss. A surplus of KES ${fmt(recovery.surplus)} remains after recovery.`
              : `The available excess sales did not fully cover the recorded stock loss. A remaining unrecovered balance of KES ${fmt(recovery.remainingLoss)} is outstanding.`}
          </NarrativeBlock>

          {recoveryPieData.length > 0 && (
            <div className="mt-6 report-section">
              <ChartTitle>Recovery Breakdown</ChartTitle>
              <div className="h-72 bg-slate-50/50 border border-slate-200 rounded-lg p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={recoveryPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      label={(e: any) => `${e.name}: ${fmt(e.value)}`}
                      labelLine={{ stroke: C.slate }}
                    >
                      {recoveryPieData.map((d, i) => (
                        <Cell key={i} fill={d.fill} stroke="#fff" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `KES ${fmt(Number(v))}`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-8">
            Staff Liability Allocation
          </h3>

          {recovery.remainingLoss === 0 ? (
            <NarrativeBlock color={C.emerald}>
              No staff deductions are required for the reporting period based on the configured recovery and liability rules.
            </NarrativeBlock>
          ) : (
            <NarrativeBlock color={C.rose}>
              A remaining unrecovered stock loss of KES {fmt(recovery.remainingLoss)} exists. Staff liability
              allocation may be configured per company policy.
            </NarrativeBlock>
          )}

          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 mt-8">
            Deduction Schedule
          </h3>
          <Table>
            <thead>
              <tr>
                <Th align="left">Staff Member</Th>
                <Th>Liability Share</Th>
                <Th>Amount (KES)</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                  {recovery.remainingLoss === 0
                    ? 'No deductions scheduled — full recovery achieved.'
                    : 'No allocation rule configured. Define liability allocation in Settings.'}
                </td>
              </tr>
            </tbody>
          </Table>
        </Section>

        {/* ═══════════ 6. ATTENDANCE ═══════════ */}
        <Section num="06" title="Staff Attendance Analysis">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <MiniStat label="Staff Tracked" value={String(attendance.rows.length)} />
            <MiniStat label="Total Scheduled Days" value={String(totalScheduledOf(attendance))} />
            <MiniStat label="Days Present" value={String(totalPresentOf(attendance))} color={C.emerald} />
            <MiniStat
              label="Overall Attendance Rate"
              value={`${attendance.overall.toFixed(2)}%`}
              color={attendance.overall >= 90 ? C.emerald : C.amber}
            />
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
                <tr><td colSpan={7} className="px-4 py-6 text-center text-sm text-slate-500">No attendance data recorded for this period.</td></tr>
              ) : (
                attendance.rows.map((r: any, i: number) => (
                  <tr key={i}>
                    <Td>{r.name}</Td>
                    <Td align="right" color={C.emerald} bold>{r.present}</Td>
                    <Td align="right" muted>{r.off}</Td>
                    <Td align="right" muted>{r.leave}</Td>
                    <Td align="right" color={r.absent > 0 ? C.rose : C.slate}>{r.absent}</Td>
                    <Td align="right">{r.total}</Td>
                    <Td align="right" bold color={r.rate >= 90 ? C.emerald : r.rate >= 75 ? C.amber : C.rose}>
                      {r.rate.toFixed(1)}%
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Section>

        {/* ═══════════ 7. KPI TABLE ═══════════ */}
        <Section num="07" title="Key Performance Indicators">
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
              <KpiRow name="Total Actual Sales" formula="Sum of daily actual sales" value={`KES ${fmt(sales.actual)}`} />
              <KpiRow name="Total System Sales" formula="Sum of daily system sales" value={`KES ${fmt(sales.system)}`} />
              <KpiRow name="Average Daily Sales" formula="Total Actual ÷ Selling Days" value={`KES ${fmt(sales.avgDaily)}`} />
              <KpiRow name="Average Sales per Staff" formula="Total Actual ÷ Staff Count" value={`KES ${fmt(sales.avgStaff)}`} />
              <KpiRow name="Outstanding Credit" formula="Credit Sales − Repayments" value={`KES ${fmt(credit.outstanding)}`} warn={credit.outstanding > 0} />
              <KpiRow name="Repayment Rate" formula="Repayments ÷ Credit Sales × 100" value={`${credit.repaymentRate.toFixed(2)}%`} />
              <KpiRow name="Staff Attendance Rate" formula="Present Days ÷ Scheduled Days × 100" value={`${attendance.overall.toFixed(2)}%`} warn={attendance.overall < 90} />
              <KpiRow name="Total Staff" formula="Active staff in period" value={String(attendance.rows.length)} />
            </tbody>
          </Table>
        </Section>

        {/* ═══════════ 8. APPROVAL ═══════════ */}
        <Section num="08" title="Approval">
          <p className="text-sm text-slate-700 mb-8">
            This report has been prepared from source operational data and is submitted for review and approval.
          </p>

          <div className="grid grid-cols-3 gap-8 pt-4">
            <SignatureBlock title="Prepared By" role="Stock Controller" />
            <SignatureBlock title="Reviewed By" role="Branch Manager" />
            <SignatureBlock title="Approved By" role="Accountant / Director" />
          </div>
        </Section>

        {/* Footer */}
        <div className="border-t border-slate-300 px-10 py-4 mt-4 flex items-center justify-between text-xs text-slate-500">
          <span>{report.branch.organization} — Confidential</span>
          <span>{report.branch.name} · {report.period}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════ HELPER COMPONENTS ═══════════════

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="report-section px-10 py-8 border-b border-slate-200 last:border-0">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xs font-mono text-slate-400">{num}</span>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  label, value, prefix, accent, delta, deltaColor,
}: {
  label: string;
  value: string;
  prefix?: string;
  accent?: string;
  delta?: string;
  deltaColor?: string;
}) {
  return (
    <div
      className="border border-slate-200 rounded-lg p-3 bg-white"
      style={{ borderLeft: `3px solid ${accent ?? C.navy}` }}
    >
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-lg font-bold mt-0.5" style={{ color: accent ?? C.navy }}>
        {prefix && <span className="text-xs font-semibold text-slate-400 mr-1">{prefix}</span>}
        {value}
      </p>
      {delta && (
        <p className="text-xs font-medium mt-0.5" style={{ color: deltaColor ?? C.slate }}>
          {delta}
        </p>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold mt-1" style={{ color: color ?? C.navy }}>{value}</p>
    </div>
  );
}

function HighlightRow({ items }: { items: { label: string; value: string; sub?: string; color: string }[] }) {
  return (
    <div className="grid grid-cols-4 gap-3 mt-2">
      {items.map((it, i) => (
        <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
          <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{it.label}</p>
          <p className="text-sm font-bold text-slate-900 mt-1 truncate" title={it.value}>{it.value}</p>
          {it.sub && <p className="text-xs mt-0.5 font-medium" style={{ color: it.color }}>{it.sub}</p>}
        </div>
      ))}
    </div>
  );
}

function ChartTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
      <span className="w-1 h-3 bg-slate-900 inline-block" />
      {children}
    </h3>
  );
}

function NarrativeBlock({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div
      className="mt-4 p-4 rounded-lg text-sm text-slate-700 leading-relaxed"
      style={{ background: `${color}0d`, borderLeft: `3px solid ${color}` }}
    >
      {children}
    </div>
  );
}

function SignatureBlock({ title, role }: { title: string; role: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">{title}</p>
      <p className="text-xs text-slate-500 mb-12">{role}</p>
      <div className="border-t border-dashed border-slate-400 pt-2">
        <p className="text-xs text-slate-400">Name / Signature / Date</p>
      </div>
    </div>
  );
}

// Table primitives
function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden border border-slate-200 rounded-lg">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  );
}

function Th({ children, align = 'right' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={`px-4 py-3 font-semibold text-xs uppercase tracking-wider text-slate-500 bg-slate-100 border-b border-slate-200 text-${align}`}
    >
      {children}
    </th>
  );
}

function Td({
  children, align = 'left', bold, muted, color,
}: {
  children: React.ReactNode;
  align?: 'left' | 'right';
  bold?: boolean;
  muted?: boolean;
  color?: string;
}) {
  return (
    <td
      className={`px-4 py-2.5 border-t border-slate-100 ${align === 'right' ? 'text-right' : ''} ${bold ? 'font-semibold' : ''} ${muted ? 'text-slate-500 text-xs' : ''}`}
      style={{ color: color ?? undefined }}
    >
      {children}
    </td>
  );
}

function Tr({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return <tr className={highlight ? 'bg-slate-50' : ''}>{children}</tr>;
}

function KpiRow({ name, formula, value, warn }: { name: string; formula: string; value: string; warn?: boolean }) {
  return (
    <tr>
      <td className="px-4 py-2.5 border-t border-slate-100 font-medium text-slate-800">{name}</td>
      <td className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500">{formula}</td>
      <td
        className="px-4 py-2.5 border-t border-slate-100 text-right font-bold"
        style={{ color: warn ? C.rose : C.navy }}
      >
        {value}
      </td>
    </tr>
  );
}

function totalPresentOf(attendance: any) {
  return attendance.rows.reduce((s: number, r: any) => s + r.present, 0);
}
function totalScheduledOf(attendance: any) {
  return attendance.rows.reduce((s: number, r: any) => s + r.total, 0);
}
