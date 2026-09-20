'use client';
import { useState, useTransition } from 'react';
import { createCreditSale, createCustomer } from './actions';

export function CreditForms({ customers, branches }: { customers: any[]; branches: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  function onSaleSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await createCreditSale(formData);
      setMsg({ text: res.message, ok: res.success });
      if (res.success) (document.getElementById('credit-form') as HTMLFormElement)?.reset();
    });
  }

  function onCustomerSubmit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await createCustomer(formData);
      setMsg({ text: res.message, ok: res.success });
      if (res.success) (document.getElementById('customer-form') as HTMLFormElement)?.reset();
    });
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-900">Record Credit Sale</h2>
          <button onClick={() => setShowCustomerForm(!showCustomerForm)} className="text-xs text-slate-600 hover:text-slate-900 underline">
            {showCustomerForm ? 'Cancel' : '+ New Customer'}
          </button>
        </div>

        {showCustomerForm && (
          <form id="customer-form" action={onCustomerSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
              <select name="branchId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Customer Name</label>
              <input type="text" name="name" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone (optional)</label>
              <input type="text" name="phone" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Credit Limit (KES)</label>
              <input type="number" name="creditLimit" defaultValue="0" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-3 flex items-end">
              <button type="submit" disabled={isPending} className="bg-slate-700 text-white px-4 py-2 rounded-md text-sm hover:bg-slate-600">
                Save Customer
              </button>
            </div>
          </form>
        )}

        <form id="credit-form" action={onSaleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Customer</label>
            <select name="customerId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              <option value="">— Select Customer —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.branchName})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Branch</label>
            <select name="branchId" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white">
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
            <input type="date" name="saleDate" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Invoice Ref</label>
            <input type="text" name="invoiceRef" required placeholder="INV-0001" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Amount (KES)</label>
            <input type="number" step="0.01" name="amount" required className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-700 mb-1">Notes (optional)</label>
            <input type="text" name="notes" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-4 flex items-center gap-4">
            <button type="submit" disabled={isPending} className="bg-slate-900 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-slate-700 disabled:opacity-50">
              {isPending ? 'Saving...' : 'Record Credit Sale'}
            </button>
            {msg && <span className={`text-sm ${msg.ok ? 'text-green-600' : 'text-red-600'}`}>{msg.text}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
