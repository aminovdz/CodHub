'use client';

import { useState } from 'react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { adminDbDelete } from '@/lib/actions/adminDb';
import { Ghost, PhoneCall, MessageCircle, Trash2, RefreshCw, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AdminAbandonedCartsPage() {
  const { activeStore, abandonedCarts, setAbandonedCarts, addActivityLog } = useAdminStore();
  const storeCarts = abandonedCarts.filter(c => c.storeId === activeStore.id);

  const sessionData = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}'); } catch { return {}; } })()
    : {};
  const sessionRole = (sessionData.role || 'admin') as 'admin' | 'fulfillment' | 'confirmation';
  const sessionUser = sessionData.user || sessionData.username || 'System';
  const isAdmin = sessionRole === 'admin' || sessionData.isSuperAdmin;

  const [whatsappModal, setWhatsappModal] = useState<{
    phone: string;
    message: string;
    cart?: any;
  } | null>(null);

  const handleRecover = (cart: any) => {
    let message = activeStore.whatsappConfig?.abandonedCartScript || "Hello *[NAME]*, this is *[STORE_NAME]*. We noticed you were interested in *[PRODUCT]* but didn't complete your order. We still have it reserved for you! Would you like us to confirm this Cash on Delivery order and ship it to you? Order: #[ORDER_ID]";
    message = message.replace(/\[NAME\]/g, cart.customer || '')
                     .replace(/\[ORDER_ID\]/g, cart.id || '')
                     .replace(/\[PRODUCT\]/g, cart.product || '')
                     .replace(/\[STORE_NAME\]/g, activeStore.name || '');
    setWhatsappModal({
      phone: cart.phone,
      message: message,
      cart: cart
    });
  };

  const handleRemove = async (id: string) => {
    if (confirm('Are you sure you want to delete this abandoned cart?')) {
      try {
        const { error } = await adminDbDelete('orders', { id });
        if (error) throw error;
        setAbandonedCarts(prev => prev.filter(c => c.id !== id));
        addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Cart Deleted', detail: `Abandoned cart ${id} deleted` });
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
        {/* Desktop Table View */}
        <table className="w-full text-left border-collapse hidden lg:table">
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

        {/* Mobile Cards View */}
        <div className="lg:hidden flex flex-col divide-y divide-slate-100">
          {storeCarts.length === 0 && <div className="p-16 text-center text-slate-400 font-bold">No abandoned carts right now.</div>}
          {storeCarts.map(cart => (
            <div key={cart.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block font-bold mb-1">#{cart.id.slice(0,8)}</div>
                  <div className="font-black text-slate-900">{cart.customer}</div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider bg-amber-100 text-amber-700`}>
                    {cart.step}
                  </span>
                  <div className="text-[10px] text-slate-400 font-bold">{formatDistanceToNow(new Date(cart.date), { addSuffix: true })}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="flex flex-col gap-0.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Value</div>
                  <div className="text-xs font-bold text-emerald-600">{cart.total} {activeStore.currency}</div>
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Phone</div>
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1"><PhoneCall size={10}/> {cart.phone}</div>
                </div>
              </div>

              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 mb-3">
                <div className="text-xs font-bold text-slate-800 line-clamp-2">{cart.product}</div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button onClick={() => handleRecover(cart)} className="flex items-center gap-2 px-3 py-1.5 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg font-bold text-xs transition-colors shadow-sm">
                  <MessageCircle size={14} /> Recover via WhatsApp
                </button>
                <button onClick={() => handleRemove(cart.id)} className="flex items-center justify-center w-8 h-8 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors border border-rose-200">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WhatsApp Modal */}
      {whatsappModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setWhatsappModal(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white shrink-0">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2">
                💬 Customize WhatsApp Message
              </h3>
              <button type="button" onClick={() => setWhatsappModal(null)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Recipient Phone</label>
                <input type="text" disabled={!isAdmin} value={whatsappModal.phone} onChange={e => setWhatsappModal({...whatsappModal, phone: e.target.value})} className="w-full p-3.5 rounded-xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" />
                {!isAdmin && <p className="text-[10px] text-slate-400 mt-1">Staff members cannot modify recipient phone numbers.</p>}
              </div>

              {activeStore.whatsappConfig?.customTemplates && activeStore.whatsappConfig.customTemplates.length > 0 && (
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Template</label>
                  <select 
                    className="w-full p-3.5 rounded-xl border border-slate-200 bg-white font-medium focus:ring-2 focus:ring-indigo-600 outline-none"
                    onChange={(e) => {
                      let templateText = activeStore.whatsappConfig?.abandonedCartScript || "Hello *[NAME]*, this is *[STORE_NAME]*. We noticed you were interested in *[PRODUCT]* but didn't complete your order. We still have it reserved for you! Would you like us to confirm this Cash on Delivery order and ship it to you? Order: #[ORDER_ID]";
                      if (e.target.value !== 'default') {
                        const selected = activeStore.whatsappConfig?.customTemplates?.find(t => t.id === e.target.value);
                        if (selected) templateText = selected.text;
                      }
                      
                      const cart = whatsappModal.cart;
                      if (cart) {
                        templateText = templateText.replace(/\[NAME\]/g, cart.customer || '')
                                                   .replace(/\[ORDER_ID\]/g, cart.id || '')
                                                   .replace(/\[PRODUCT\]/g, cart.product || '')
                                                   .replace(/\[STORE_NAME\]/g, activeStore.name || '');
                      }
                      setWhatsappModal({ ...whatsappModal, message: templateText });
                    }}
                  >
                    <option value="default">Default Abandoned Cart Message</option>
                    {activeStore.whatsappConfig.customTemplates.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Message Text</label>
                <textarea value={whatsappModal.message} onChange={e => setWhatsappModal({...whatsappModal, message: e.target.value})} rows={6} className="w-full p-4 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-indigo-600 outline-none resize-none" />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setWhatsappModal(null)} className="px-5 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
              <button type="button" onClick={() => {
                window.open(`https://wa.me/${whatsappModal.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappModal.message)}`, '_blank');
                addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Cart Recovery Init', detail: `Initiated WhatsApp recovery for ${whatsappModal.phone}` });
                setWhatsappModal(null);
              }} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Send on WhatsApp</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
