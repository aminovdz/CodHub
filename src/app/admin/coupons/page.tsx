'use client';

import { useState } from 'react';
import { useAdminStore, Coupon } from '@/lib/store/useAdminStore';
import { Plus, X, Trash2, Copy, ToggleLeft, ToggleRight, Tag } from 'lucide-react';

function newCoupon(storeId: string): Coupon {
  return {
    id: `coup_${Date.now()}`, storeId, code: '', type: 'percent',
    value: 10, usedCount: 0, active: true
  };
}

export default function AdminCouponsPage() {
  const { activeStore, coupons, setCoupons, addActivityLog } = useAdminStore();
  const [editing, setEditing] = useState<Coupon | null>(null);

  const storeCoupons = coupons.filter(c => c.storeId === activeStore.id);

  const sessionUser = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}').user || 'Admin'; } catch { return 'Admin'; } })()
    : 'Admin';

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setCoupons(prev => {
      const exists = prev.find(c => c.id === editing.id);
      return exists ? prev.map(c => c.id === editing.id ? editing : c) : [editing, ...prev];
    });
    addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Coupon Saved', detail: `Code: ${editing.code} (${editing.type === 'percent' ? editing.value + '%' : editing.value + ' ' + activeStore.currency} off)` });
    setEditing(null);
  };

  const deleteCoupon = (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    setCoupons(prev => prev.filter(c => c.id !== id));
  };

  const toggleActive = (id: string) => {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, active: !c.active } : c));
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Coupons</h1>
          <p className="text-slate-500 font-medium"><span className="font-bold text-indigo-600">{activeStore.name}</span> — Discount codes</p>
        </div>
        <button onClick={() => setEditing(newCoupon(activeStore.id))}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-md transition-colors">
          <Plus size={18} /> New Coupon
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="p-4 font-bold">Code</th>
              <th className="p-4 font-bold">Discount</th>
              <th className="p-4 font-bold">Min Order</th>
              <th className="p-4 font-bold text-right">Used / Max</th>
              <th className="p-4 font-bold text-center">Active</th>
              <th className="p-4 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {storeCoupons.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-slate-400">
                <Tag size={32} className="mx-auto mb-3 text-slate-300" />
                <p className="font-bold">No coupons yet. Create one to offer discounts at checkout.</p>
              </td></tr>
            )}
            {storeCoupons.map(c => (
              <tr key={c.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${!c.active ? 'opacity-50' : ''}`}>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <code className="bg-slate-100 text-slate-900 font-black text-sm px-3 py-1 rounded-lg tracking-wider">{c.code || '—'}</code>
                    <button type="button" onClick={() => copyCode(c.code)} className="text-slate-400 hover:text-indigo-600" title="Copy code">
                      <Copy size={14} />
                    </button>
                  </div>
                </td>
                <td className="p-4 font-black text-indigo-600">
                  {c.type === 'percent' ? `${c.value}% off` : `${c.value} ${activeStore.currency} off`}
                </td>
                <td className="p-4 text-slate-600 text-sm">{c.minOrderValue ? `${c.minOrderValue} ${activeStore.currency}` : '—'}</td>
                <td className="p-4 text-right font-bold text-slate-700">{c.usedCount} / {c.maxUses || '∞'}</td>
                <td className="p-4 text-center">
                  <button type="button" onClick={() => toggleActive(c.id)}>
                    {c.active ? <ToggleRight size={24} className="text-indigo-600" /> : <ToggleLeft size={24} className="text-slate-400" />}
                  </button>
                </td>
                <td className="p-4">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditing(c)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                      <Tag size={15} />
                    </button>
                    <button onClick={() => deleteCoupon(c.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <form onSubmit={save} className="bg-white rounded-3xl shadow-xl w-full max-w-lg border border-slate-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900">{coupons.find(c => c.id === editing.id) ? 'Edit Coupon' : 'New Coupon'}</h2>
              <button type="button" onClick={() => setEditing(null)}><X size={22} className="text-slate-400 hover:text-slate-700" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Coupon Code</label>
                <input type="text" required value={editing.code}
                  onChange={e => setEditing({ ...editing, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                  placeholder="e.g. SUMMER20"
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-black tracking-widest uppercase" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                  <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value as 'percent' | 'fixed' })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold bg-white">
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ({activeStore.currency})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    Value ({editing.type === 'percent' ? '%' : activeStore.currency})
                  </label>
                  <input type="number" min={1} required value={editing.value}
                    onChange={e => setEditing({ ...editing, value: Number(e.target.value) })}
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Min Order ({activeStore.currency})</label>
                  <input type="number" min={0} value={editing.minOrderValue || ''}
                    onChange={e => setEditing({ ...editing, minOrderValue: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="None"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Uses</label>
                  <input type="number" min={1} value={editing.maxUses || ''}
                    onChange={e => setEditing({ ...editing, maxUses: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="Unlimited"
                    className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expires At (optional)</label>
                <input type="date" value={editing.expiresAt || ''}
                  onChange={e => setEditing({ ...editing, expiresAt: e.target.value || undefined })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={editing.active} onChange={e => setEditing({ ...editing, active: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded" />
                <span className="font-bold text-slate-700">Active (visible at checkout)</span>
              </label>
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(null)} className="px-6 py-3 font-bold text-slate-600 hover:text-slate-900">Cancel</button>
              <button type="submit" className="px-6 py-3 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200">Save Coupon</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
