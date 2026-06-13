'use client';

import { useState, useEffect } from 'react';
import { X, Phone, MessageSquare, CheckCircle2, XCircle, PhoneCall, ChevronDown, ChevronUp, Package, MapPin, User, Clock, Edit2, PhoneMissed, Calendar } from 'lucide-react';
import { useAdminStore, Order, CallLog } from '@/lib/store/useAdminStore';
import { supabase } from '@/lib/supabase';
import { getShortOrderId } from '@/lib/idHelper';

const CALL_RESULTS = [
  { value: 'answered',    label: 'Answered',    icon: '📞', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'no_answer',   label: 'No Answer',   icon: '📵', color: 'bg-slate-100 text-slate-600 border-slate-200' },
  { value: 'confirmed',   label: 'Confirmed',   icon: '✅', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { value: 'canceled',    label: 'Canceled',    icon: '❌', color: 'bg-rose-100 text-rose-700 border-rose-200' },
  { value: 'rescheduled', label: 'Rescheduled', icon: '🔄', color: 'bg-amber-100 text-amber-700 border-amber-200' },
] as const;

const formatStatus = (s: string) => s === 'PENDING_AGENT_CONFIRMATION' ? 'PENDING' : s.replace(/_/g, ' ');

export default function OrderDrawer({
  orderId, onClose, sessionUser, isAdmin, onOpenWhatsApp
}: {
  orderId: string | null; onClose: () => void;
  sessionUser: string; isAdmin: boolean;
  onOpenWhatsApp: (order: Order) => void;
}) {
  const { activeStore, orders, setOrders, callLogs, setCallLogs, addActivityLog, orderStatuses } = useAdminStore();
  const [callNote, setCallNote] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [editForm, setEditForm] = useState<Order | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const order = orders.find(o => o.id === orderId);

  useEffect(() => {
    if (order && !showEditForm) setEditForm({ ...order });
  }, [order, showEditForm]);

  if (!orderId || !order || !editForm) return null;

  const orderCallLogs = callLogs
    .filter(c => c.orderId === orderId)
    .sort((a, b) => new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime());

  const noAnswerCount = orderCallLogs.filter(l => l.result === 'no_answer').length;

  const allProducts = order.product ? order.product.split(',').map(p => p.trim()).filter(Boolean) : [];

  const handleQuickLog = async (result: CallLog['result']) => {
    const entry: CallLog = {
      id: `call_${Date.now()}_${Math.random()}`, orderId,
      storeId: activeStore.id, agentName: sessionUser,
      result: result, note: callNote,
      calledAt: new Date().toISOString()
    };
    setCallLogs(prev => [entry, ...prev]);

    const noteText = result === 'no_answer'
      ? `[Call - NO ANSWER (Attempt ${noAnswerCount + 1})] Called: ${order.phone}${callNote ? ' — ' + callNote : ''}`
      : `[Call - ${result.toUpperCase()}]: ${callNote || 'No note'}`;

    const noteObj = { id: `note_${Date.now()}_${Math.random()}`, author: sessionUser, text: noteText, createdAt: new Date().toISOString() };
    const updatedNotes = [...(order.notes || []), noteObj];
    
    let newStatus = order.status;
    let newConfirmedBy = order.confirmedBy;
    
    if (result === 'confirmed') { newStatus = 'CONFIRMED'; newConfirmedBy = sessionUser; }
    else if (result === 'canceled') { newStatus = 'CANCELED'; }
    
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, confirmedBy: newConfirmedBy, notes: updatedNotes } : o));
    addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Call Logged', detail: `Order ${getShortOrderId(orderId)} — ${result.toUpperCase()}` });
    
    try {
      const p: any = { notes: updatedNotes, status: newStatus };
      if (newConfirmedBy) p.confirmed_by = newConfirmedBy;
      const { error } = await supabase.from('orders').update(p).eq('id', orderId);
      if (error) {
        console.error("Supabase error:", error);
        alert("Failed to save: " + error.message);
      }
    } catch (err) { console.error(err); }
    
    setCallNote('');
  };

  const handleSave = async () => {
    if (!editForm) return;
    setIsSaving(true);
    setOrders(prev => prev.map(o => o.id === editForm.id ? editForm : o));
    try {
      const { error } = await supabase.from('orders').update({
        customer: editForm.customer, phone: editForm.phone,
        product: editForm.product, total: editForm.total,
        status: editForm.status, notes: editForm.notes || [],
        wilaya: editForm.wilaya, commune: editForm.commune, address: editForm.address
      }).eq('id', editForm.id);
      if (error) throw error;
      addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Order Updated', detail: `Updated ${getShortOrderId(editForm.id)}` });
      setShowEditForm(false);
    } catch (err: any) { 
      console.error(err);
      alert('Failed: ' + err.message); 
    }
    setIsSaving(false);
  };

  const statusColor = order.status === 'CONFIRMED' ? 'bg-emerald-500' :
    order.status === 'CANCELED' ? 'bg-rose-500' :
    order.status === 'SELF_CONFIRMED' ? 'bg-teal-500' : 'bg-amber-500';

  const userNotes = (order.notes || []).filter(n =>
    !n.text.startsWith('[Call -') && !n.text.startsWith('Status changed')
  );

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-slate-900/20 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full sm:max-w-md md:max-w-lg h-full bg-slate-50 flex flex-col shadow-2xl animate-in slide-in-from-right-4 duration-300 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Sticky Header with Status + Actions ─────── */}
        <div className="bg-white border-b border-slate-200 shrink-0 sticky top-0 z-10 shadow-sm">
          <div className="p-4">
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    #{getShortOrderId(order.id)}
                  </span>
                  <span className={`text-[9px] font-black uppercase text-white px-2 py-0.5 rounded ${statusColor}`}>
                    {formatStatus(order.status)}
                  </span>
                </div>
                <h2 className="text-lg font-black text-slate-900 truncate">{order.customer}</h2>
              </div>
              <button onClick={onClose} className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-colors shrink-0">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <a href={`tel:${order.phone}`} className="flex items-center gap-1 text-indigo-600 font-bold text-lg hover:underline">
                {order.phone}
              </a>
              <button onClick={() => window.open(`tel:${order.phone}`)} className="p-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors">
                <PhoneCall size={16} />
              </button>
              <button onClick={() => onOpenWhatsApp(order)} className="p-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors">
                <MessageSquare size={16} />
              </button>
              <div className="ml-auto flex flex-col items-end">
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">
                  {new Date(order.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Quick Log & Update */}
            <div className="mt-4 pt-4 border-t border-slate-100">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">Quick Log & Update</p>
               <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleQuickLog('confirmed')} disabled={order.status === 'CONFIRMED'} className="flex-1 min-w-[80px] bg-emerald-600 text-white py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                    <CheckCircle2 size={14} /> Confirm
                  </button>
                  <button onClick={() => handleQuickLog('no_answer')} className="flex-1 min-w-[80px] bg-slate-100 text-slate-700 border border-slate-200 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 flex items-center justify-center gap-1">
                    <PhoneMissed size={14} /> No Ans {noAnswerCount > 0 && <span className="text-[9px] bg-white px-1.5 py-0.5 rounded-full text-slate-500">{noAnswerCount}</span>}
                  </button>
                  <button onClick={() => handleQuickLog('canceled')} disabled={order.status === 'CANCELED'} className="flex-1 min-w-[80px] bg-rose-50 text-rose-700 border border-rose-200 py-2 rounded-xl text-xs font-bold hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1">
                    <XCircle size={14} /> Cancel
                  </button>
               </div>
               <div className="flex gap-2 mt-2">
                  <input type="text" placeholder="Type optional note before clicking..." value={callNote} onChange={e => setCallNote(e.target.value)} className="flex-1 w-0 min-w-0 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-500 font-medium" />
                  <button onClick={() => handleQuickLog('answered')} className="px-3 bg-blue-50 text-blue-700 border border-blue-200 py-2 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center gap-1 shrink-0">
                    <Phone size={14} /> <span className="hidden sm:inline">Answered</span>
                  </button>
                  <button onClick={() => handleQuickLog('rescheduled')} className="px-3 bg-amber-50 text-amber-700 border border-amber-200 py-2 rounded-lg text-xs font-bold hover:bg-amber-100 flex items-center gap-1 shrink-0">
                    <Calendar size={14} /> <span className="hidden sm:inline">Reschedule</span>
                  </button>
               </div>
            </div>
          </div>
        </div>

        {/* ── Scrollable Body ─────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Order Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2 text-slate-700">
                <Package size={14} className="text-indigo-500" />
                <span className="font-black text-sm uppercase tracking-wider">Order Info</span>
              </div>
              <button
                onClick={() => setShowEditForm(v => !v)}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
              >
                <Edit2 size={12} />{showEditForm ? 'Cancel' : 'Edit'}
                {showEditForm ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {!showEditForm ? (
              <div className="p-4 space-y-4">
                {/* Total & Products */}
                <div className="bg-indigo-50 rounded-xl border border-indigo-100 overflow-hidden">
                  <div className="flex items-center justify-between p-3 border-b border-indigo-100/50">
                    <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Order Total</span>
                    <span className="text-lg font-black text-indigo-700">{order.total} <span className="text-xs">{activeStore.currency}</span></span>
                  </div>
                  <div className="p-3 space-y-1.5 bg-white/50">
                    {allProducts.map((p, i) => {
                      const isUpsell = p.toLowerCase().includes('upsell') || p.toLowerCase().includes('bump') || i > 0;
                      return (
                        <div key={`product-${i}`} className={`flex items-start gap-2 p-2 rounded-lg border ${isUpsell ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                          <span className={`w-4 h-4 text-[9px] font-black rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isUpsell ? 'bg-amber-200 text-amber-700' : 'bg-indigo-100 text-indigo-600'}`}>
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-bold text-slate-800 break-words leading-tight">{p}</span>
                            {isUpsell && <span className="ml-2 text-[9px] font-black uppercase bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded inline-block mt-0.5">Add-on</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                    <MapPin size={10} className="inline mr-1" />Delivery Address
                  </p>
                  <div className="space-y-1 text-sm font-bold text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    {(order.wilaya || order.province) && (
                      <div className="flex gap-2">
                        <span className="text-slate-400 text-xs w-16 shrink-0">Wilaya</span>
                        <span>{order.wilaya || order.province}</span>
                      </div>
                    )}
                    {(order.commune || order.city) && (
                      <div className="flex gap-2">
                        <span className="text-slate-400 text-xs w-16 shrink-0">Commune</span>
                        <span>{order.commune || order.city}</span>
                      </div>
                    )}
                    {order.address && (
                      <div className="flex gap-2">
                        <span className="text-slate-400 text-xs w-16 shrink-0">Address</span>
                        <span className="break-words">{order.address}</span>
                      </div>
                    )}
                    {!order.wilaya && !order.commune && !order.address && (
                      <span className="text-slate-400 text-xs italic">No address provided</span>
                    )}
                  </div>
                </div>

                {/* User notes */}
                {userNotes.length > 0 && (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Notes</p>
                    <div className="space-y-1.5">
                      {userNotes.map((n, idx) => (
                        <div key={(n.id || 'note') + '-' + idx} className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800 font-medium">
                          📝 {n.text}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {order.confirmedBy && (
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 bg-slate-50 p-2 rounded-lg">
                    <User size={12} className="text-indigo-500" />Confirmed by <span className="text-indigo-600">{order.confirmedBy}</span>
                  </div>
                )}
              </div>
            ) : (
              /* Edit Form */
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm">
                    {orderStatuses.map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Customer</label>
                    <input type="text" value={editForm.customer} onChange={e => setEditForm({ ...editForm, customer: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Phone</label>
                    <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Wilaya</label>
                    <input type="text" value={editForm.wilaya || editForm.province || ''}
                      onChange={e => setEditForm({ ...editForm, wilaya: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Commune</label>
                    <input type="text" value={editForm.commune || editForm.city || ''}
                      onChange={e => setEditForm({ ...editForm, commune: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Address</label>
                  <textarea value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} rows={2}
                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Product</label>
                    <input type="text" value={editForm.product} onChange={e => setEditForm({ ...editForm, product: e.target.value })}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Total ({activeStore.currency})</label>
                    <input type="number" value={editForm.total} onChange={e => setEditForm({ ...editForm, total: Number(e.target.value) })}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm" />
                  </div>
                </div>
                <button onClick={handleSave} disabled={isSaving}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-black rounded-xl active:scale-95 transition-all text-sm">
                  {isSaving ? 'Saving...' : 'SAVE CHANGES'}
                </button>
              </div>
            )}
          </div>

          {/* Call History */}
          {orderCallLogs.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <Clock size={14} className="text-slate-400" />
                <span className="font-black text-sm uppercase tracking-wider text-slate-700">Call History</span>
                <span className="ml-auto text-xs font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{orderCallLogs.length}</span>
              </div>
              <div className="divide-y divide-slate-100">
                {orderCallLogs.map((log, idx) => {
                  const res = CALL_RESULTS.find(r => r.value === log.result);
                  return (
                    <div key={(log.id || 'log') + '-' + idx} className="flex items-start gap-3 p-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 border ${res?.color || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {res?.icon || '📞'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-700">{res?.label}</span>
                          <time className="text-[10px] text-slate-400 font-medium shrink-0">
                            {new Date(log.calledAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </time>
                        </div>
                        <p className="text-[10px] text-slate-400 mb-1">by {log.agentName}</p>
                        {log.result === 'no_answer' && (
                          <p className="text-[10px] text-slate-500 font-bold mb-1">📵 Called: {order.phone}</p>
                        )}
                        {log.note && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">{log.note}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
