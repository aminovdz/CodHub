'use client';

import { useState } from 'react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { supabase } from '@/lib/supabase';
import { Ghost, PhoneCall, MessageCircle, Trash2, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminAbandonedCartsPage() {
  const { activeStore, abandonedCarts, setAbandonedCarts } = useAdminStore();
  const storeCarts = abandonedCarts.filter(c => c.storeId === activeStore.id);

  const handleRecover = (cart: any) => {
    let message = activeStore.whatsappConfig?.abandonedCartScript || 'Hello, I noticed you left something in your cart...';
    message = message.replace(/\[NAME\]/g, cart.customer || '')
                     .replace(/\[ORDER_ID\]/g, cart.id || '')
                     .replace(/\[PRODUCT\]/g, cart.product || '');
    // Open WhatsApp
    window.open(`https://wa.me/${cart.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleRemove = async (id: string) => {
    if (confirm('Are you sure you want to delete this abandoned cart?')) {
      try {
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (error) throw error;
        setAbandonedCarts(prev => prev.filter(c => c.id !== id));
      } catch (err: any) {
        alert("Failed to delete cart: " + err.message);
      }
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Ghost className="text-indigo-600" size={32} /> Abandoned Carts
          </h1>
          <p className="text-slate-500 font-medium">Recover lost revenue where clients dropped off during the upsell sequence in <span className="font-bold text-indigo-600">{activeStore.name}</span>.</p>
        </div>
        <button onClick={() => window.location.reload()} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 p-2 rounded-xl transition-colors shadow-sm" title="Refresh Data">
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="p-4 font-bold">Time</th>
              <th className="p-4 font-bold">Customer Info</th>
              <th className="p-4 font-bold">Product Value</th>
              <th className="p-4 font-bold">Drop-off Point</th>
              <th className="p-4 font-bold text-right">Recovery Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm font-medium text-slate-700">
            {storeCarts.map(cart => (
              <tr key={cart.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-4">
                  <div className="font-bold text-slate-900">{formatDistanceToNow(new Date(cart.date), { addSuffix: true })}</div>
                  <div className="font-mono text-xs text-indigo-500 font-bold">{cart.id.slice(0, 8)}...</div>
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-900">{cart.customer}</div>
                  <div className="text-xs font-bold text-indigo-600">{cart.phone}</div>
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-900">{cart.product}</div>
                  <div className="text-sm font-bold text-emerald-600">{cart.total} {activeStore.currency}</div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] uppercase font-black tracking-wide bg-amber-100 text-amber-700`}>
                    {cart.step}
                  </span>
                </td>
                <td className="p-4 flex justify-end gap-2">
                  <button onClick={() => handleRecover(cart)} className="flex items-center gap-2 px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg font-bold text-xs transition-colors shadow-sm">
                    <MessageCircle size={14} /> WhatsApp
                  </button>
                  <button onClick={() => handleRemove(cart.id)} className="flex items-center justify-center w-8 h-8 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors border border-rose-200">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {storeCarts.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-slate-500 font-medium">No abandoned carts right now.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
