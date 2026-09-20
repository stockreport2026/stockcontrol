'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const nav = [
  { name: 'Dashboard', href: '/dashboard' },
  {
    section: 'Operations',
    items: [
      { name: 'Sales Entry', href: '/operations/sales' },
      { name: 'Staff Sales Summary', href: '/operations/staff-sales' },
      { name: 'Branch Sales', href: '/operations/branch-sales' },
      { name: 'Credit Sales', href: '/operations/credit-sales' },
      { name: 'Repayments', href: '/operations/repayments' },
      { name: 'Stock Variances', href: '/operations/stock-variances' },
      { name: 'Attendance', href: '/operations/attendance' },
      { name: 'Account Balance', href: '/operations/account-balance' },
    ],
  },
  {
    section: 'Reconciliation',
    items: [
      { name: 'Sales Reconciliation', href: '/reconciliation/sales' },
      { name: 'Stock Reconciliation', href: '/reconciliation/stock' },
      { name: 'Recovery & Liability', href: '/reconciliation/recovery' },
    ],
  },
  {
    section: 'Reports',
    items: [
      { name: 'Monthly Reports', href: '/reports/monthly' },
      { name: 'Report History', href: '/reports/history' },
    ],
  },
  {
    section: 'Administration',
    items: [
      { name: 'Branches', href: '/admin/branches' },
      { name: 'Staff', href: '/admin/staff' },
      { name: 'Settings', href: '/admin/settings' },
      { name: 'Demo Data', href: '/admin/demo-data' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 min-h-screen flex flex-col shrink-0">
      <div className="p-5 border-b border-slate-700">
        <h1 className="text-xl font-bold">Mediocare</h1>
        <p className="text-xs text-slate-400 mt-1">Stock Control System</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {nav.map((item, i) => {
          if ('section' in item && item.section) {
            return (
              <div key={i} className="px-3 mb-4">
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-2 px-2">{item.section}</p>
                {item.items!.map((sub) => (
                  <Link
                    key={sub.href}
                    href={sub.href}
                    className={`block px-3 py-2 rounded text-sm mb-1 transition ${
                      pathname === sub.href
                        ? 'bg-slate-700 text-white font-medium'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {sub.name}
                  </Link>
                ))}
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`block px-5 py-2 mb-1 text-sm transition ${
                pathname === item.href
                  ? 'bg-slate-700 text-white font-medium'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700 text-xs text-slate-400">
        Mediocare Pharmaceutical Ltd
      </div>
    </aside>
  );
}
