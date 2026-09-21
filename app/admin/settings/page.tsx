import { prisma } from '@/lib/db/prisma';
import { SettingsForm } from './settings-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function SettingsPage() {
  const org = await prisma.organization.findFirst();

  if (!org) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-6 text-amber-800 text-sm">
          No organization exists yet. Create a branch first in Administration → Branches
          (the system will create the organization automatically).
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">System configuration</p>
      </div>

      <SettingsForm
        initial={{ name: org.name, currency: org.currency, timezone: org.timezone }}
      />
    </div>
  );
}
