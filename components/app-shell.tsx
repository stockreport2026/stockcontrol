'use client';

import { Sidebar } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50 print:block print:min-h-0 print:bg-white">
      <Sidebar />
      <main className="flex-1 p-8 overflow-auto print:p-0 print:m-0 print:w-full print:max-w-full print:overflow-visible print:bg-white">
        {children}
      </main>
    </div>
  );
}
