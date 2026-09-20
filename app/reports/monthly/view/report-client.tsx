'use client';

import Link from 'next/link';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';

const fmt = (n: number) =>
  n.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const shortFmt = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toFixed(0);
};

export function ReportClient({ report }: { report: any }) {
  const { sales, stock, credit, recovery, attendance, charts } = report;
  const handlePrint = () => window.print();
  const salesVarianceColor = sales.variance < 0 ? '#dc2626' : sales.variance > 0 ? '#16a34a' : '#64748b';

  const recoveryPieData = [
    { name: 'Recovered', value: recovery.recoveryApplied, fill: '#16a34a' },
    { name: 'Remaining Loss', value: recovery.remainingLoss, fill: '#dc2626' },
  ].filter((d) => d.value > 0);

  return (
    <div className="print:bg-white">
      <div className="mb-6 print:hidden flex items-center justify-between">
        <Link href="/reports/monthly" className="text-sm text-slate-500 hover:text-slate-900">
          ← Back to Reports
        </Link>
        <button
          onClick={handlePrint}
          className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-10 print:border-0 print:shadow-none print:p-0">
        <div className="border-b-2 border-slate-900 pb-4 mb-8">
          <p className="text-xs uppercase tracking-widest text-slate-500">
            {report.branch.name} — Monthly Report
          </p>
          <h1 className="text-3xl font-bold text-slate-900 mt-1">
            STOCK AND FINANCIAL REPORT
          </h1>
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Branch</p>
              <p className="font-medium text-slate-900">{report.branch.name} ({report.branch.code})</p>
            </div>
            <div>
              <p className="text-slate-500">Reporting Period</p>
              <p className="font-medium text-slate-900">{report.period}</p>
            </div>
            <div>
              <p className="text-slate-500">Location</p>
              <p className="font-medium text-slate-900">{report.branch.location || '—'}</p>
            </div>
            <div>
              <p className="text-slate-500">Generated On</p>
              <p className="font-medium text-slate-900">{report.generatedAt}</p>
            </div>
          </div>
        </div>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3 pb-1 border-b border-slate-300">Executive Summary</h2>
          <p className="text-sm text-slate-700 leading-relaxed mb-4">
            This report presents the financial performance, stock position, and staff accountability for <strong>{report.branch.name}</strong> for the reporting period <strong>{report.period}</strong>. The analysis covers stock movements, sales performance, account standing, stock-loss recovery, and staff attendance.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Actual Sales" value={'KES ' + fmt(sales.actual)} />
            <Kpi label="System Sales" value={'KES ' + fmt(sales.system)} />
            <Kpi label="Sales Variance" value={'KES ' + fmt(sales.variance)} color={salesVarianceColor} />
            <Kpi label="Sales Variance %" value={sales.variancePct.toFixed(2) + '%'} />
            <Kpi label="Stock Loss" value={'KES ' + fmt(stock.stockLoss)} color={stock.stockLoss > 0 ? '#dc2626' : undefined} />
            <Kpi label="Shrinkage Rate" value={stock.shrinkageRate.toFixed(2) + '%'} />
            <Kpi label="Credit Sales" value={'KES ' + fmt(credit.totalCredit)} />
            <Kpi label="Outstanding Credit" value={'KES ' + fmt(credit.outstanding)} />
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3 pb-1 border-b border-slate-300">Stock Analysis</h2>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Stock Position Summary</h3>
          <table className="w-full text-sm mb-6 border border-slate-300">
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2 text-slate-700">Opening Stock Value</td>
                <td className="px-3 py-2 text-right font-medium">KES {fmt(stock.openingValue)}</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="px-3 py-2 text-slate-700">Stock Loss (from approved stocktakes)</td>
                <td className="px-3 py-2 text-right font-medium text-red-600">KES {fmt(stock.stockLoss)}</td>
              </tr>
              <tr>
                <td className="px-3 py-2 text-slate-700 font-semibold">Stock Shrinkage Rate</td>
                <td className="px-3 py-2 text-right font-bold">{stock.shrinkageRate.toFixed(2)}%</td>
              </tr>
            </tbody>
          </table>
          <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
            <li>Total Stock Loss: <strong>KES {fmt(stock.stockLoss)}</strong></li>
            <li>Shrinkage Rate: <strong>{stock.shrinkageRate.toFixed(2)}%</strong></li>
            <li>{stock.stockLoss === 0 ? 'No stock loss was recorded for the reporting period.' : 'A stock loss of KES ' + fmt(stock.stockLoss) + ' was recorded for the period.'}</li>
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3 pb-1 border-b border-slate-300">Sales Analysis</h2>
          <table className="w-full text-sm mb-6 border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-700">Sales Category</th>
                <th className="text-right px-3 py-2 font-medium text-slate-700">Amount (KES)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Actual Sales</td><td className="px-3 py-2 text-right font-medium">{fmt(sales.actual)}</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">System Sales</td><td className="px-3 py-2 text-right font-medium">{fmt(sales.system)}</td></tr>
              <tr className="border-t border-slate-200 bg-slate-50"><td className="px-3 py-2 font-semibold">Sales Variance</td><td className="px-3 py-2 text-right font-bold" style={{ color: salesVarianceColor }}>{fmt(sales.variance)}</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Variance %</td><td className="px-3 py-2 text-right">{sales.variancePct.toFixed(2)}%</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Selling Days</td><td className="px-3 py-2 text-right">{sales.sellingDays}</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Average Daily Sales</td><td className="px-3 py-2 text-right">{fmt(sales.avgDaily)}</td></tr>
            </tbody>
          </table>
          <p className="text-sm text-slate-700 mb-4">
            {sales.variance > 0 ? 'Actual sales exceeded system sales by KES ' + fmt(sales.variance) + '.' : sales.variance < 0 ? 'Actual sales were below system sales by KES ' + fmt(Math.abs(sales.variance)) + '.' : 'Actual sales were equal to system sales for the reporting period.'}
          </p>
          {charts.dailyTrend.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Daily Sales Trend</h3>
              <div className="h-64 border border-slate-200 rounded p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={charts.dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.slice(8)} />
                    <YAxis fontSize={10} tickFormatter={shortFmt} />
                    <Tooltip formatter={(v: any) => 'KES ' + fmt(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="actual" stroke="#0f172a" strokeWidth={2} name="Actual" />
                    <Line type="monotone" dataKey="system" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" name="System" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          {charts.staffSummary.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-2">Sales Variance by Staff</h3>
              <div className="h-64 border border-slate-200 rounded p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={charts.staffSummary}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" fontSize={10} />
                    <YAxis fontSize={10} tickFormatter={shortFmt} />
                    <Tooltip formatter={(v: any) => 'KES ' + fmt(Number(v))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="actual" fill="#0f172a" name="Actual" />
                    <Bar dataKey="system" fill="#94a3b8" name="System" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3 pb-1 border-b border-slate-300">Account Standing</h2>
          <table className="w-full text-sm mb-4 border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-700">Account Position</th>
                <th className="text-right px-3 py-2 font-medium text-slate-700">Amount (KES)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Credit Sales (period)</td><td className="px-3 py-2 text-right">{fmt(credit.totalCredit)}</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Repayments (period)</td><td className="px-3 py-2 text-right text-green-600">{fmt(credit.totalRepayments)}</td></tr>
              <tr className="border-t border-slate-200 bg-slate-50"><td className="px-3 py-2 font-semibold">Closing Outstanding Balance</td><td className="px-3 py-2 text-right font-bold">{fmt(credit.outstanding)}</td></tr>
            </tbody>
          </table>
          {charts.creditTrend.length > 0 && (
            <div className="h-56 border border-slate-200 rounded p-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.creditTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" fontSize={10} tickFormatter={(v) => v.slice(8)} />
                  <YAxis fontSize={10} tickFormatter={shortFmt} />
                  <Tooltip formatter={(v: any) => 'KES ' + fmt(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="credit" fill="#f59e0b" name="Credit Sales" />
                  <Bar dataKey="repayment" fill="#16a34a" name="Repayments" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3 pb-1 border-b border-slate-300">Stock Loss Recovery</h2>
          <table className="w-full text-sm mb-4 border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-700">Recovery Item</th>
                <th className="text-right px-3 py-2 font-medium text-slate-700">Amount (KES)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Total Stock Loss</td><td className="px-3 py-2 text-right">{fmt(recovery.stockLoss)}</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Excess Sales Applied</td><td className="px-3 py-2 text-right text-green-600">{fmt(recovery.excessSales)}</td></tr>
              <tr className="border-t border-slate-200 bg-slate-50"><td className="px-3 py-2 font-semibold">Recovery Applied</td><td className="px-3 py-2 text-right font-bold text-green-600">{fmt(recovery.recoveryApplied)}</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Remaining Loss</td><td className="px-3 py-2 text-right text-red-600">{fmt(recovery.remainingLoss)}</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Surplus</td><td className="px-3 py-2 text-right text-green-600">{fmt(recovery.surplus)}</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Recovery Rate</td><td className="px-3 py-2 text-right font-bold">{recovery.recoveryRate.toFixed(2)}%</td></tr>
            </tbody>
          </table>
          <p className="text-sm text-slate-700 mb-4">
            {recovery.stockLoss === 0 ? 'No stock loss was recorded for the period, so no recovery was required.' : recovery.recoveryApplied >= recovery.stockLoss ? 'The available excess sales fully covered the recorded stock loss for the reporting period.' : 'The available excess sales did not fully cover the recorded stock loss. A remaining unrecovered balance of KES ' + fmt(recovery.remainingLoss) + ' is outstanding.'}
          </p>
          {recoveryPieData.length > 0 && (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={recoveryPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e: any) => e.name + ': ' + fmt(e.value)}>
                    {recoveryPieData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => 'KES ' + fmt(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3 pb-1 border-b border-slate-300">Staff Liability</h2>
          {recovery.remainingLoss === 0 ? (
            <p className="text-sm text-slate-700">No staff deductions are required for the reporting period based on the configured recovery and liability rules.</p>
          ) : (
            <p className="text-sm text-slate-700">A remaining unrecovered stock loss of KES {fmt(recovery.remainingLoss)} exists. Staff liability allocation may be configured based on company policy.</p>
          )}
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3 pb-1 border-b border-slate-300">Staff Attendance Analysis</h2>
          <table className="w-full text-sm border border-slate-300 mb-4">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-700">Staff</th>
                <th className="text-right px-3 py-2 font-medium text-slate-700">Present</th>
                <th className="text-right px-3 py-2 font-medium text-slate-700">Off</th>
                <th className="text-right px-3 py-2 font-medium text-slate-700">Leave</th>
                <th className="text-right px-3 py-2 font-medium text-slate-700">Absent</th>
                <th className="text-right px-3 py-2 font-medium text-slate-700">Total</th>
                <th className="text-right px-3 py-2 font-medium text-slate-700">Rate</th>
              </tr>
            </thead>
            <tbody>
              {attendance.rows.length === 0 ? (
                <tr><td colSpan={7} className="px-3 py-3 text-center text-slate-500">No attendance data recorded.</td></tr>
              ) : (
                attendance.rows.map((r: any, i: number) => (
                  <tr key={i} className="border-t border-slate-200">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-right">{r.present}</td>
                    <td className="px-3 py-2 text-right">{r.off}</td>
                    <td className="px-3 py-2 text-right">{r.leave}</td>
                    <td className="px-3 py-2 text-right text-red-600">{r.absent}</td>
                    <td className="px-3 py-2 text-right">{r.total}</td>
                    <td className="px-3 py-2 text-right font-medium">{r.rate.toFixed(1)}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <p className="text-sm text-slate-700">Overall attendance rate: <strong>{attendance.overall.toFixed(2)}%</strong></p>
        </section>

        <section className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-3 pb-1 border-b border-slate-300">Key Performance Indicators</h2>
          <table className="w-full text-sm border border-slate-300">
            <thead className="bg-slate-100">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-slate-700">KPI</th>
                <th className="text-right px-3 py-2 font-medium text-slate-700">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Stock Shrinkage Rate</td><td className="px-3 py-2 text-right">{stock.shrinkageRate.toFixed(2)}%</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Sales Variance Rate</td><td className="px-3 py-2 text-right">{sales.variancePct.toFixed(2)}%</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Stock Loss Recovery Rate</td><td className="px-3 py-2 text-right">{recovery.recoveryRate.toFixed(2)}%</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Net Stock Position After Recovery</td><td className="px-3 py-2 text-right">KES {fmt(recovery.remainingLoss)}</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Total Actual Sales</td><td className="px-3 py-2 text-right">KES {fmt(sales.actual)}</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Total System Sales</td><td className="px-3 py-2 text-right">KES {fmt(sales.system)}</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Average Daily Sales</td><td className="px-3 py-2 text-right">KES {fmt(sales.avgDaily)}</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Outstanding Credit</td><td className="px-3 py-2 text-right">KES {fmt(credit.outstanding)}</td></tr>
              <tr className="border-t border-slate-200"><td className="px-3 py-2">Staff Attendance Rate</td><td className="px-3 py-2 text-right">{attendance.overall.toFixed(2)}%</td></tr>
            </tbody>
          </table>
        </section>

        <section className="mt-12 grid grid-cols-3 gap-8 pt-8 border-t border-slate-300">
          <div>
            <p className="text-xs uppercase text-slate-500 mb-8">Prepared By</p>
            <div className="border-t border-slate-400 pt-2"><p className="text-xs text-slate-500">Name / Date</p></div>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500 mb-8">Reviewed By</p>
            <div className="border-t border-slate-400 pt-2"><p className="text-xs text-slate-500">Name / Date</p></div>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500 mb-8">Approved By</p>
            <div className="border-t border-slate-400 pt-2"><p className="text-xs text-slate-500">Name / Date</p></div>
          </div>
        </section>

        <div className="mt-8 text-center text-xs text-slate-400">
          Generated by Stock Control System — This is a management reconciliation report.
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="border border-slate-200 rounded p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-base font-bold mt-0.5" style={{ color: color ?? '#0f172a' }}>{value}</p>
    </div>
  );
}
