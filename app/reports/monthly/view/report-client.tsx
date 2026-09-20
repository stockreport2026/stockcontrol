'use client';

import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine, LabelList,
} from 'recharts';

const fmt = (n: number) => n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString('en-KE', { maximumFractionDigits: 0 });
const shortFmt = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(0);
};

const C = {
  navy: '#0f172a', slate: '#64748b', slateLight: '#cbd5e1',
  emerald: '#059669', emeraldLight: '#34d399',
  rose: '#e11d48', roseLight: '#fb7185',
  amber: '#d97706', indigo: '#4f46e5', grid: '#e2e8f0',
};

const tooltipStyle = {
  backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px',
  fontSize: '12px', boxShadow: '0 8px 24px rgba(15,23,42,0.12)', padding: '10px 14px',
};
const axisTick = { fontSize: 11, fill: '#64748b', fontWeight: 500 };

export function ReportClient({ report }: { report: any }) {
  const { sales, stock, credit, account, recovery, attendance, comparison, charts } = report;
  const handlePrint = () => window.print();
  const varianceColor = sales.variance < 0 ? C.rose : sales.variance > 0 ? C.emerald : C.slate;

  const recoveryPieData = [
    { name: 'Recovered', value: recovery.recoveryApplied, fill: C.emerald },
    { name: 'Remaining Loss', value: recovery.remainingLoss, fill: C.rose },
  ].filter((d) => d.value > 0);

  const hasStockData = stock.items.length > 0;
  const hasAttendance = attendance.rows.length > 0;
  const hasSalesData = charts.staffSummary.length > 0;

  return (
    <div className="report-root">
      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm 10mm; }
          body { background: #fff !important; }
          .print\\:hidden { display: none !important; }
          .report-root { font-size: 10px; }
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

        {/* ═══ HEADER ═══ */}
        <div className="border-b-4 border-slate-900 px-12 pt-12 pb-8">
          <div className="flex items-start justify-between gap-12">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-md bg-slate-900 flex items-center justify-center text-white font-bold text-lg">M</div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-bold">{report.branch.organization}</p>
                  <p className="text-[10px] text-slate-400">Financial Control Division</p>
                </div>
              </div>
              <h1 className="text-[28px] leading-tight font-bold text-slate-900 tracking-tight">STOCK & FINANCIAL REPORT</h1>
              <p className="text-sm text-slate-500 mt-1">Management Reconciliation Statement</p>
              <div className="mt-4 inline-flex items-center gap-2 bg-slate-900 text-white text-xs font-medium px-3 py-1.5 rounded-full">
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
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Location</p>
                <p className="text-xs text-slate-700">{report.branch.location || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Generated</p>
                <p className="text-xs text-slate-600">{report.generatedAt}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ 01 EXECUTIVE SUMMARY ═══ */}
        <Section num="01" title="Executive Summary">
          <p className="text-sm text-slate-700 leading-relaxed mb-6">
            This report presents the financial performance and stock accountability for <strong className="text-slate-900">{report.branch.name}</strong> for the period <strong className="text-slate-900">{report.periodRange}</strong>. The analysis covers sales performance, credit activity, stock variances, stock-loss recovery, and staff attendance. All figures are derived directly from recorded operational data.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            <KpiCard label="Actual Sales" value={fmt(sales.actual)} prefix="KES" />
            <KpiCard label="System Sales" value={fmt(sales.system)} prefix="KES" />
            <KpiCard label="Sales Variance" value={fmt(sales.variance)} prefix="KES" accent={varianceColor} delta={`${sales.variancePct.toFixed(2)}%`} deltaColor={varianceColor} />
            <KpiCard label="Staff Count" value={String(sales.staffCount)} sublabel={`${sales.positiveDays} positive / ${sales.negativeDays} negative`} />
            <KpiCard label="Stock Loss" value={fmt(stock.stockLoss)} prefix="KES" accent={stock.stockLoss > 0 ? C.rose : C.emerald} />
            <KpiCard label="Shrinkage Rate" value={`${stock.shrinkageRate.toFixed(2)}%`} accent={stock.shrinkageRate > 5 ? C.rose : C.emerald} />
            <KpiCard label="Recovery Applied" value={fmt(recovery.recoveryApplied)} prefix="KES" accent={C.emerald} />
            <KpiCard label="Closing Debt" value={fmt(account.calculatedClosing)} prefix="KES" accent={account.calculatedClosing > 0 ? C.rose : C.emerald} />
          </div>

          {report.additionalInfo && (
            <div className="mt-4 p-4 rounded-lg bg-slate-50 border-l-4 border-slate-900">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Additional Information</p>
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{report.additionalInfo}</p>
            </div>
          )}
        </Section>

        {/* ═══ 02 SALES ANALYSIS ═══ */}
        <Section num="02" title="Sales Analysis">
          <Table>
            <thead>
              <tr>
                <Th align="left">Sales Category</Th>
                <Th>Amount (KES)</Th>
                <Th>Explanation</Th>
              </tr>
            </thead>
            <tbody>
              <Tr>
                <Td bold>Raw Actual Sales</Td>
                <Td align="right" bold>{fmt(sales.rawActual)}</Td>
                <Td align="left" muted>Sum of staff actual sales for the period</Td>
              </Tr>
              <Tr>
                <Td>Less: Repayments</Td>
                <Td align="right" color={C.emerald}>−{fmt(sales.repayments)}</Td>
                <Td align="left" muted>Customer repayments reduce net actual sales</Td>
              </Tr>
              <Tr highlight>
                <Td bold>Adjusted Actual Sales</Td>
                <Td align="right" bold>{fmt(sales.actual)}</Td>
                <Td align="left" muted>= Raw Actual − Repayments</Td>
              </Tr>
              <Tr>
                <Td bold>Raw System Sales</Td>
                <Td align="right" bold>{fmt(sales.rawSystem)}</Td>
                <Td align="left" muted>Sum of system sales for the period</Td>
              </Tr>
              <Tr>
                <Td>Less: Credit Sales</Td>
                <Td align="right" color={C.amber}>−{fmt(sales.credit)}</Td>
                <Td align="left" muted>Credit sales reduce net system sales</Td>
              </Tr>
              <Tr highlight>
                <Td bold>Adjusted System Sales</Td>
                <Td align="right" bold>{fmt(sales.system)}</Td>
                <Td align="left" muted>= Raw System − Credit Sales</Td>
              </Tr>
              <Tr highlight>
                <Td bold color={varianceColor}>Sales Variance</Td>
                <Td align="right" bold color={varianceColor}>{fmt(sales.variance)}</Td>
                <Td align="left" muted>{sales.variancePct.toFixed(2)}% of adjusted system sales</Td>
              </Tr>
            </tbody>
          </Table>

          <NarrativeBlock color={varianceColor}>
            {sales.variance > 0
              ? `Adjusted actual sales exceeded adjusted system sales by KES ${fmt(sales.variance)} (${sales.variancePct.toFixed(2)}%), indicating a positive variance for the period. Excess sales of KES ${fmt(sales.excessSales)} are available to offset stock losses.`
              : sales.variance < 0
              ? `Adjusted actual sales were below adjusted system sales by KES ${fmt(Math.abs(sales.variance))} (${Math.abs(sales.variancePct).toFixed(2)}%), indicating a shortfall. Total short sales across ${sales.negativeDays} staff member(s) total KES ${fmt(sales.shortSales)}.`
              : 'Adjusted actual sales matched adjusted system sales for the reporting period.'}
          </NarrativeBlock>

          {/* Staff Comparison Bar Chart */}
          {hasSalesData && (
            <div className="mt-8 report-section">
              <ChartTitle subtitle="Adjusted actual vs adjusted system sales per staff member">Staff Sales Comparison</ChartTitle>
              <div className="h-80 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.salesBars} margin={{ top: 20, right: 30, left: 10, bottom: 5 }} barGap={4}>
                    <CartesianGrid strokeDasharray="4 4" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 11 }} axisLine={{ stroke: C.slateLight }} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={shortFmt}
                      label={{ value: 'Sales (KES)', angle: -90, position: 'insideLeft', style: { fontSize: 11, fill: '#94a3b8' } }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any, name: any) => [`KES ${fmt(Number(v))}`, name]} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12, fontWeight: 500 }} iconType="circle" />
                    <Bar dataKey="system" fill={C.slateLight} name="Adjusted System" radius={[5, 5, 0, 0]} />
                    <Bar dataKey="actual" fill={C.navy} name="Adjusted Actual" radius={[5, 5, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Variance Bar Chart */}
          {hasSalesData && (
            <div className="mt-8 report-section">
              <ChartTitle subtitle="Per-staff variance — positive is above system, negative is below">Sales Variance by Staff</ChartTitle>
              <div className="h-72 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.varianceBars} margin={{ top: 20, right: 30, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="4 4" stroke={C.grid} vertical={false} />
                    <XAxis dataKey="name" tick={{ ...axisTick, fontSize: 11 }} axisLine={{ stroke: C.slateLight }} tickLine={false} />
                    <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={shortFmt} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => [`KES ${fmt(Number(v))}`, 'Variance']} cursor={{ fill: 'rgba(15,23,42,0.04)' }} />
                    <ReferenceLine y={0} stroke={C.slate} strokeWidth={1} />
                    <Bar dataKey="variance" name="Variance" radius={[5, 5, 0, 0]}>
                      {charts.varianceBars.map((entry: any, i: number) => (
                        <Cell key={i} fill={entry.variance >= 0 ? C.emerald : C.rose} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Staff Detail Table */}
          {hasSalesData && (
            <div className="mt-8 report-section">
              <ChartTitle subtitle="Individual performance breakdown">Staff Sales Detail</ChartTitle>
              <Table>
                <thead>
                  <tr>
                    <Th align="left">Staff</Th>
                    <Th>Raw Actual</Th>
                    <Th>Credit</Th>
                    <Th>Repay</Th>
                    <Th>Adj Actual</Th>
                    <Th>Adj System</Th>
                    <Th>Variance</Th>
                    <Th>Var %</Th>
                  </tr>
                </thead>
                <tbody>
                  {charts.staffSummary.map((s: any, i: number) => {
                    const color = s.variance > 0 ? C.emerald : s.variance < 0 ? C.rose : C.slate;
                    return (
                      <tr key={i}>
                        <Td>{s.name}</Td>
                        <Td align="right" muted>{fmt(s.rawActual)}</Td>
                        <Td align="right" color={C.amber}>{fmt(s.credit)}</Td>
                        <Td align="right" color={C.emerald}>{fmt(s.repay)}</Td>
                        <Td align="right" bold>{fmt(s.actual)}</Td>
                        <Td align="right" muted>{fmt(s.system)}</Td>
                        <Td align="right" color={color} bold>{s.variance >= 0 ? '+' : ''}{fmt(s.variance)}</Td>
                        <Td align="right" color={color}>{s.variancePct.toFixed(2)}%</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Section>

        {/* ═══ 03 STOCK ANALYSIS ═══ */}
        <Section num="03" title="Stock Analysis">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MiniStat label="System Value" value={`KES ${fmt(stock.openingValue)}`} />
            <MiniStat label="Actual Value" value={`KES ${fmt(stock.closingValue)}`} />
            <MiniStat label="Stock Loss" value={`KES ${fmt(stock.stockLoss)}`} color={stock.stockLoss > 0 ? C.rose : C.emerald} />
            <MiniStat label="Shrinkage Rate" value={`${stock.shrinkageRate.toFixed(2)}%`} color={stock.shrinkageRate > 5 ? C.rose : C.emerald} />
          </div>

          {hasStockData ? (
            <>
              <ChartTitle subtitle={`${stock.itemCount} drug(s) with recorded variance`}>Stock Variance Detail</ChartTitle>
              <Table>
                <thead>
                  <tr>
                    <Th align="left">Drug / Item</Th>
                    <Th>System Qty</Th>
                    <Th>Actual Qty</Th>
                    <Th>Variance</Th>
                    <Th>Unit Cost</Th>
                    <Th>Value</Th>
                    <Th align="left">Reason</Th>
                  </tr>
                </thead>
                <tbody>
                  {stock.items.map((i: any, idx: number) => {
                    const isLoss = i.varianceValue > 0;
                    const isSurplus = i.varianceValue < 0;
                    return (
                      <tr key={idx}>
                        <Td><span className="font-medium text-slate-900">{i.description}</span></Td>
                        <Td align="right">{fmtInt(i.systemQty)}</Td>
                        <Td align="right">{fmtInt(i.actualQty)}</Td>
                        <Td align="right" color={isLoss ? C.rose : isSurplus ? C.emerald : C.slate} bold>
                          {isLoss ? `−${fmtInt(Math.abs(i.varianceQty))}` : isSurplus ? `(+${fmtInt(Math.abs(i.varianceQty))})` : '0'}
                        </Td>
                        <Td align="right" muted>{fmtInt(i.unitCost)}</Td>
                        <Td align="right" color={isLoss ? C.rose : isSurplus ? C.emerald : C.slate} bold>
                          {isLoss ? `KES ${fmt(i.varianceValue)}` : isSurplus ? `(KES ${fmt(Math.abs(i.varianceValue))})` : 'KES 0'}
                        </Td>
                        <Td align="left" muted>{i.reason ?? '—'}</Td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-100">
                  <tr>
                    <td className="px-4 py-3 font-bold text-slate-900" colSpan={5}>TOTAL</td>
                    <td className="px-4 py-3 text-right font-bold" style={{ color: stock.stockLoss > 0 ? C.rose : C.emerald }}>
                      KES {fmt(stock.stockLoss)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </Table>
            </>
          ) : (
            <div className="p-8 bg-slate-50 rounded-lg text-center text-sm text-slate-500">
              No stock variances recorded for this period. Enter them at <strong>/operations/stock-variances</strong>.
            </div>
          )}

          <NarrativeBlock color={stock.stockLoss > 0 ? C.rose : C.emerald}>
            {stock.stockLoss === 0
              ? 'No stock loss was recorded for this period.'
              : `A total stock loss of KES ${fmt(stock.stockLoss)} was identified across ${stock.itemCount} item(s), representing a shrinkage rate of ${stock.shrinkageRate.toFixed(2)}% against the system stock value of KES ${fmt(stock.openingValue)}.${stock.stockSurplus > 0 ? ` Total stock surplus of KES ${fmt(stock.stockSurplus)} was also recorded.` : ''}`}
          </NarrativeBlock>
        </Section>

        {/* ═══ 04 CREDIT & REPAYMENTS ═══ */}
        <Section num="04" title="Credit Sales & Repayments">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <MiniStat label="Credit Sales" value={`KES ${fmt(credit.totalCredit)}`} color={C.amber} />
            <MiniStat label="Repayments" value={`KES ${fmt(credit.totalRepayments)}`} color={C.emerald} />
            <MiniStat label="Net Outstanding" value={`KES ${fmt(credit.outstanding)}`} color={credit.outstanding > 0 ? C.amber : C.emerald} />
            <MiniStat label="Repayment Rate" value={`${credit.repaymentRate.toFixed(2)}%`} color={credit.repaymentRate >= 80 ? C.emerald : C.amber} />
          </div>

          <Table>
            <thead>
              <tr>
                <Th align="left">Metric</Th>
                <Th>Amount (KES)</Th>
                <Th align="left">Explanation</Th>
              </tr>
            </thead>
            <tbody>
              <Tr><Td>Credit Sales Issued</Td><Td align="right" color={C.amber} bold>{fmt(credit.totalCredit)}</Td><Td align="left" muted>Total credit given across {credit.records} record(s)</Td></Tr>
              <Tr><Td>Repayments Received</Td><Td align="right" color={C.emerald} bold>{fmt(credit.totalRepayments)}</Td><Td align="left" muted>Cash received from customers during the period</Td></Tr>
              <Tr highlight><Td bold>Net Outstanding</Td><Td align="right" bold>{fmt(credit.outstanding)}</Td><Td align="left" muted>Balance yet to be repaid by customers</Td></Tr>
            </tbody>
          </Table>

          <NarrativeBlock color={credit.outstanding === 0 ? C.emerald : C.amber}>
            {credit.totalCredit === 0
              ? 'No credit sales were recorded for the reporting period.'
              : `A total of KES ${fmt(credit.totalCredit)} in credit was issued during the period, against repayments of KES ${fmt(credit.totalRepayments)}. This represents a repayment rate of ${credit.repaymentRate.toFixed(2)}%, leaving an outstanding balance of KES ${fmt(credit.outstanding)}.`}
          </NarrativeBlock>
        </Section>

        {/* ═══ 05 RECOVERY & LIABILITY ═══ */}
        <Section num="05" title="Stock Loss Recovery & Liability">
          <ChartTitle subtitle="How excess sales offset stock loss">Recovery Calculation</ChartTitle>
          <Table>
            <thead>
              <tr>
                <Th align="left">Recovery Item</Th>
                <Th align="left">Formula</Th>
                <Th>Amount (KES)</Th>
              </tr>
            </thead>
            <tbody>
              <Tr><Td>Total Stock Loss</Td><Td align="left" muted>Sum of drug variances</Td><Td align="right" color={C.rose} bold>{fmt(recovery.stockLoss)}</Td></Tr>
              <Tr><Td>Excess Sales Available</Td><Td align="left" muted>Sum of positive sales variances</Td><Td align="right" color={C.emerald} bold>+{fmt(recovery.excessSales)}</Td></Tr>
              <Tr highlight><Td bold>Recovery Applied</Td><Td align="left" muted>MIN(excess, loss)</Td><Td align="right" bold color={C.emerald}>{fmt(recovery.recoveryApplied)}</Td></Tr>
              <Tr><Td>Remaining Loss</Td><Td align="left" muted>MAX(loss − recovery, 0)</Td><Td align="right" color={recovery.remainingLoss > 0 ? C.rose : C.slate} bold>{fmt(recovery.remainingLoss)}</Td></Tr>
              <Tr><Td>Surplus</Td><Td align="left" muted>MAX(excess − loss, 0)</Td><Td align="right" color={recovery.surplus > 0 ? C.emerald : C.slate} bold>{fmt(recovery.surplus)}</Td></Tr>
              <Tr><Td>Recovery Rate</Td><Td align="left" muted>Recovery ÷ Loss × 100</Td><Td align="right" bold>{recovery.recoveryRate.toFixed(2)}%</Td></Tr>
            </tbody>
          </Table>

          <NarrativeBlock color={recovery.stockLoss === 0 ? C.slate : recovery.recoveryApplied >= recovery.stockLoss ? C.emerald : C.rose}>
            {recovery.stockLoss === 0
              ? 'No stock loss was recorded for the period, so no recovery was required.'
              : recovery.recoveryApplied >= recovery.stockLoss
              ? `The available excess sales fully covered the recorded stock loss of KES ${fmt(recovery.stockLoss)}. A surplus of KES ${fmt(recovery.surplus)} remains after recovery.`
              : `The available excess sales of KES ${fmt(recovery.excessSales)} did not fully cover the stock loss of KES ${fmt(recovery.stockLoss)}. The remaining unrecovered loss of KES ${fmt(recovery.remainingLoss)} has been added to the main account balance as outstanding debt.`}
          </NarrativeBlock>

          {recoveryPieData.length > 0 && (
            <div className="mt-8 report-section">
              <ChartTitle subtitle="Recovered vs remaining loss breakdown">Recovery Analysis</ChartTitle>
              <div className="h-72 bg-gradient-to-b from-slate-50 to-white border border-slate-200 rounded-lg p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={recoveryPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={4}
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

        {/* ═══ 06 MAIN ACCOUNT ═══ */}
        <Section num="06" title="Main Account Standing">
          <ChartTitle subtitle="Opening balance + unrecovered loss = closing debt">Account Position</ChartTitle>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <MiniStat label="Opening Balance" value={`KES ${fmt(account.openingBalance)}`} />
            <MiniStat label="+ Unrecovered Loss" value={`KES ${fmt(account.unrecoveredLoss)}`} color={account.unrecoveredLoss > 0 ? C.rose : C.emerald} />
            <MiniStat label="Closing Debt" value={`KES ${fmt(account.calculatedClosing)}`} color={account.calculatedClosing > 0 ? C.rose : C.emerald} />
          </div>
          <Table>
            <thead>
              <tr>
                <Th align="left">Item</Th>
                <Th>Amount (KES)</Th>
              </tr>
            </thead>
            <tbody>
              <Tr><Td>Opening Account Balance</Td><Td align="right">{fmt(account.openingBalance)}</Td></Tr>
              <Tr><Td>Add: Unrecovered Stock Loss</Td><Td align="right" color={C.rose}>+{fmt(account.unrecoveredLoss)}</Td></Tr>
              <Tr highlight><Td bold>Closing Account Balance</Td><Td align="right" bold color={account.calculatedClosing > 0 ? C.rose : C.emerald}>{fmt(account.calculatedClosing)}</Td></Tr>
            </tbody>
          </Table>
        </Section>

        {/* ═══ 07 ATTENDANCE ═══ */}
        <Section num="07" title="Staff Attendance Analysis">
          <div className="grid grid-cols-4 gap-4 mb-6">
            <MiniStat label="Staff Tracked" value={String(attendance.rows.length)} />
            <MiniStat label="Scheduled Days" value={String(attendance.rows.reduce((s: number, r: any) => s + r.total, 0))} />
            <MiniStat label="Days Worked" value={String(attendance.rows.reduce((s: number, r: any) => s + r.present, 0))} color={C.emerald} />
            <MiniStat label="Attendance Rate" value={`${attendance.overall.toFixed(2)}%`} color={attendance.overall >= 90 ? C.emerald : C.amber} />
          </div>

          {hasAttendance ? (
            <Table>
              <thead>
                <tr>
                  <Th align="left">Staff</Th>
                  <Th>Days Worked</Th>
                  <Th>Leave Days</Th>
                  <Th>Total Days</Th>
                  <Th>Rate</Th>
                </tr>
              </thead>
              <tbody>
                {attendance.rows.map((r: any, i: number) => (
                  <tr key={i}>
                    <Td>{r.name}</Td>
                    <Td align="right" color={C.emerald} bold>{r.present}</Td>
                    <Td align="right" color={C.amber}>{r.leave}</Td>
                    <Td align="right">{r.total}</Td>
                    <Td align="right" bold color={r.rate >= 90 ? C.emerald : r.rate >= 75 ? C.amber : C.rose}>{r.rate.toFixed(1)}%</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="p-8 bg-slate-50 rounded-lg text-center text-sm text-slate-500">
              No attendance records for this period. Enter them at <strong>/operations/attendance</strong>.
            </div>
          )}
        </Section>

        {/* ═══ 08 PERIOD COMPARISON ═══ */}
        <Section num="08" title={`Comparison vs ${comparison.prevPeriod}`}>
          <Table>
            <thead>
              <tr>
                <Th align="left">Metric</Th>
                <Th>{comparison.prevPeriod}</Th>
                <Th>Current Period</Th>
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

        {/* ═══ 09 KPI ═══ */}
        <Section num="09" title="Key Performance Indicators">
          <Table>
            <thead>
              <tr>
                <Th align="left">KPI</Th>
                <Th align="left">Formula / Basis</Th>
                <Th>Value</Th>
              </tr>
            </thead>
            <tbody>
              <KpiRow name="Stock Shrinkage Rate" formula="Stock Loss ÷ System Stock Value × 100" value={`${stock.shrinkageRate.toFixed(2)}%`} warn={stock.shrinkageRate > 5} />
              <KpiRow name="Sales Variance Rate" formula="Variance ÷ Adjusted System Sales × 100" value={`${sales.variancePct.toFixed(2)}%`} warn={sales.variancePct < 0} />
              <KpiRow name="Stock Loss Recovery Rate" formula="Recovery ÷ Stock Loss × 100" value={`${recovery.recoveryRate.toFixed(2)}%`} warn={recovery.recoveryRate < 100 && stock.stockLoss > 0} />
              <KpiRow name="Net Stock Position After Recovery" formula="Remaining loss after recovery" value={`KES ${fmt(recovery.remainingLoss)}`} warn={recovery.remainingLoss > 0} />
              <KpiRow name="Credit Repayment Rate" formula="Repayments ÷ Credit Sales × 100" value={`${credit.repaymentRate.toFixed(2)}%`} warn={credit.repaymentRate < 80 && credit.totalCredit > 0} />
              <KpiRow name="Adjusted Actual Sales" formula="Raw actual − repayments" value={`KES ${fmt(sales.actual)}`} />
              <KpiRow name="Adjusted System Sales" formula="Raw system − credit sales" value={`KES ${fmt(sales.system)}`} />
              <KpiRow name="Closing Account Debt" formula="Opening + unrecovered loss" value={`KES ${fmt(account.calculatedClosing)}`} warn={account.calculatedClosing > 0} />
              <KpiRow name="Staff Attendance Rate" formula="Days worked ÷ Total scheduled × 100" value={`${attendance.overall.toFixed(2)}%`} warn={attendance.overall < 90} />
              <KpiRow name="Total Staff" formula="Active staff in period" value={String(attendance.rows.length)} />
            </tbody>
          </Table>
        </Section>

        {/* ═══ 10 APPROVAL ═══ */}
        <Section num="10" title="Approval & Sign-Off">
          <p className="text-sm text-slate-700 mb-8">
            This report has been prepared from source operational data and is submitted for review, verification, and approval by the authorized signatories below.
          </p>
          <div className="grid grid-cols-3 gap-10 pt-4">
            <SignatureBlock title="Prepared By" role="Stock Controller" />
            <SignatureBlock title="Reviewed By" role="Branch Manager" />
            <SignatureBlock title="Approved By" role="Accountant / Director" />
          </div>
        </Section>

        <div className="border-t border-slate-300 px-12 py-5 flex items-center justify-between text-xs text-slate-500 bg-slate-50">
          <span>{report.branch.organization} — Confidential</span>
          <span>{report.branch.name} · {report.periodRange}</span>
        </div>
      </div>
    </div>
  );
}

// ═══════════ HELPERS ═══════════

function Section({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <section className="report-section px-12 py-8 border-b border-slate-200 last:border-0">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-xs font-mono text-slate-400 font-semibold">{num}</span>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function KpiCard({ label, value, prefix, accent, delta, deltaColor, sublabel }: any) {
  return (
    <div className="border border-slate-200 rounded-lg p-3 bg-white" style={{ borderLeft: `3px solid ${accent ?? C.navy}` }}>
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className="text-base font-bold mt-0.5" style={{ color: accent ?? C.navy }}>
        {prefix && <span className="text-xs font-semibold text-slate-400 mr-1">{prefix}</span>}
        {value}
      </p>
      {delta && <p className="text-xs font-medium mt-0.5" style={{ color: deltaColor ?? C.slate }}>{delta}</p>}
      {sublabel && <p className="text-[10px] text-slate-400 mt-0.5">{sublabel}</p>}
    </div>
  );
}

function MiniStat({ label, value, color }: any) {
  return (
    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
      <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-lg font-bold mt-1" style={{ color: color ?? C.navy }}>{value}</p>
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
      <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">{title}</p>
      <p className="text-xs text-slate-500 mb-16">{role}</p>
      <div className="border-t-2 border-dashed border-slate-300 pt-2">
        <p className="text-[10px] text-slate-400">Name · Signature · Date</p>
      </div>
    </div>
  );
}

function Table({ children }: any) {
  return <div className="overflow-hidden border border-slate-200 rounded-lg"><table className="w-full text-sm border-collapse">{children}</table></div>;
}

function Th({ children, align = 'right' }: any) {
  return <th className={`px-4 py-3 font-semibold text-[10px] uppercase tracking-wider text-slate-500 bg-slate-100 border-b border-slate-200 text-${align}`}>{children}</th>;
}

function Td({ children, align = 'left', bold, muted, color }: any) {
  return <td className={`px-4 py-2.5 border-t border-slate-100 ${align === 'right' ? 'text-right' : ''} ${bold ? 'font-semibold' : ''} ${muted ? 'text-slate-500 text-xs' : ''}`} style={{ color: color ?? undefined }}>{children}</td>;
}

function Tr({ children, highlight }: any) {
  return <tr className={highlight ? 'bg-slate-50' : ''}>{children}</tr>;
}

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
  const change = prev === 0 ? (curr === 0 ? 0 : 100) : ((curr - prev) / Math.abs(prev)) * 100;
  const isUp = change > 0;
  const isGood = invert ? !isUp : isUp;
  const color = Math.abs(change) < 0.01 ? C.slate : isGood ? C.emerald : C.rose;
  return (
    <tr>
      <td className="px-4 py-2.5 border-t border-slate-100 font-medium text-slate-800">{label}</td>
      <td className="px-4 py-2.5 border-t border-slate-100 text-right text-slate-600">{fmt(prev)}</td>
      <td className="px-4 py-2.5 border-t border-slate-100 text-right font-semibold text-slate-900">{fmt(curr)}</td>
      <td className="px-4 py-2.5 border-t border-slate-100 text-right font-semibold" style={{ color }}>
        {Math.abs(change) < 0.01 ? '—' : `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(1)}%`}
      </td>
    </tr>
  );
}
