'use client';

import { useState, useEffect } from 'react';
import { X, Edit2, Phone, MessageSquare, Send, CheckCircle, ShieldCheck, UserCheck } from 'lucide-react';
import { useAdminStore, Order, CallLog } from '@/lib/store/useAdminStore';
import { supabase } from '@/lib/supabase';

const CALL_RESULTS = [
  { value: 'answered',    label: 'Answered',    icon: '📞', color: 'bg-blue-100 text-blue-700 ring-blue-500' },
  { value: 'no_answer',   label: 'No Answer',   icon: '📵', color: 'bg-slate-100 text-slate-600 ring-slate-400' },
  { value: 'confirmed',   label: 'Confirmed',   icon: '✅', color: 'bg-emerald-100 text-emerald-700 ring-emerald-500' },
  { value: 'canceled',    label: 'Canceled',    icon: '❌', color: 'bg-rose-100 text-rose-700 ring-rose-500' },
  { value: 'rescheduled', label: 'Rescheduled', icon: '🔄', color: 'bg-amber-100 text-amber-700 ring-amber-500' },
] as const;

export default function OrderDrawer({ 
  orderId, 
  onClose,
  sessionUser,
  isAdmin,
  onOpenWhatsApp
}: { 
  orderId: string | null; 
  onClose: () => void;
  sessionUser: string;
  isAdmin: boolean;
  onOpenWhatsApp: (order: Order) => void;
}) {
  const { activeStore, orders, setOrders, callLogs, setCallLogs, addActivityLog, orderStatuses } = useAdminStore();
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'TIMELINE'>('TIMELINE');
  const [newCall, setNewCall] = useState({ result: 'answered' as CallLog['result'], note: '' });
  
  // Local edit state
  const order = orders.find(o => o.id === orderId);
  const [editForm, setEditForm] = useState<Order | null>(null);

  useEffect(() => {
    if (order) setEditForm(order);
  }, [order]);

  if (!orderId || !order || !editForm) return null;

  const orderCallLogs = callLogs.filter(c => c.orderId === orderId).sort((a, b) => new Date(b.calledAt).getTime() - new Date(a.calledAt).getTime());
  
  const handleSaveDetails = async () => {
    try {
      setOrders(prev => prev.map(o => o.id === editForm.id ? editForm : o));
      const rowPayload = {
        customer: editForm.customer, phone: editForm.phone,
        product: editForm.product, total: editForm.total,
        status: editForm.status, notes: editForm.notes || [],
        wilaya: editForm.wilaya, commune: editForm.commune,
        address: editForm.address
      };
      await supabase.from('orders').update(rowPayload).eq('id', editForm.id);
      addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Order Updated', detail: `Updated details for ${editForm.id}` });
      alert('Order details saved!');
    } catch (err: any) {
      alert('Failed to save: ' + err.message);
    }
  };

  const addCallLog = async () => {
    const entry: CallLog = {
      id: `call_${Date.now()}`, orderId,
      storeId: activeStore.id, agentName: sessionUser,
      result: newCall.result, note: newCall.note,
      calledAt: new Date().toISOString()
    };
    setCallLogs(prev => [entry, ...prev]);

    const existingNotes = order.notes || [];
    const newNoteObj = {
      id: `note_${Date.now()}`, author: sessionUser,
      text: `[Call - ${newCall.result.toUpperCase()}]: ${newCall.note || 'No note'}`,
      createdAt: new Date().toISOString()
    };
    const updatedNotes = [...existingNotes, newNoteObj];

    let newStatus = order.status;
    let newConfirmedBy = order.confirmedBy;

    if (newCall.result === 'confirmed') {
      newStatus = 'CONFIRMED';
      newConfirmedBy = sessionUser;
    } else if (newCall.result === 'canceled') {
      newStatus = 'CANCELED';
    }

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, confirmedBy: newConfirmedBy, notes: updatedNotes } : o));

    try {
      const updatePayload: any = { notes: updatedNotes, status: newStatus };
      if (newConfirmedBy) updatePayload.confirmed_by = newConfirmedBy;
      await supabase.from('orders').update(updatePayload).eq('id', orderId);
    } catch (err) {
      console.error(err);
    }

    addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Call Logged', detail: `Order ${orderId} — Result: ${newCall.result.toUpperCase()}` });
    setNewCall({ result: 'answered', note: '' });
  };

  const formatStatus = (status: string) => status === 'PENDING_AGENT_CONFIRMATION' ? 'PENDING' : status.replace(/_/g, ' ');

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-xl bg-slate-50 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 bg-white border-b border-slate-200 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-black font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{order.id.split('-')[0] || order.id.slice(0, 8)}</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                order.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' :
                order.status === 'CANCELED' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
              }`}>{formatStatus(order.status)}</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900">{order.customer}</h2>
            <p className="text-slate-500 font-bold">{order.phone} • {order.wilaya || 'No Wilaya'} • {order.total} {activeStore.currency}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-colors"><X size={20}/></button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white border-b border-slate-200 shrink-0 px-4 pt-2 gap-4">
          <button onClick={() => setActiveTab('TIMELINE')} className={`pb-3 text-sm font-black tracking-wide border-b-2 transition-all ${activeTab === 'TIMELINE' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>TIMELINE & CALLS</button>
          <button onClick={() => setActiveTab('DETAILS')} className={`pb-3 text-sm font-black tracking-wide border-b-2 transition-all ${activeTab === 'DETAILS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>ORDER DETAILS</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'TIMELINE' ? (
            <div className="space-y-6">
              {/* Call Logger */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Log a Call</h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {CALL_RESULTS.map(r => (
                    <button key={r.value} onClick={() => setNewCall(c => ({...c, result: r.value}))} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${newCall.result === r.value ? r.color + ' ring-2 ring-current' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{r.icon} {r.label}</button>
                  ))}
                </div>
                <textarea value={newCall.note} onChange={e => setNewCall(c => ({...c, note: e.target.value}))} placeholder="Internal notes about this call..." rows={2} className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none text-sm mb-3 bg-slate-50" />
                <button onClick={addCallLog} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-sm">SAVE CALL LOG</button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                 <button onClick={() => onOpenWhatsApp(order)} className="flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl font-bold text-sm transition-colors"><MessageSquare size={16}/> WhatsApp</button>
                 <button onClick={() => window.open(`tel:${order.phone}`)} className="flex items-center justify-center gap-2 py-3 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl font-bold text-sm transition-colors"><Phone size={16}/> Call Direct</button>
              </div>

              {/* Timeline */}
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {orderCallLogs.map((log) => (
                  <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-slate-200 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      {CALL_RESULTS.find(r => r.value === log.result)?.icon || '📞'}
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 text-xs">{CALL_RESULTS.find(r => r.value === log.result)?.label}</span>
                        <time className="text-[10px] font-bold text-slate-400">{new Date(log.calledAt).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</time>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium mb-2">Agent: {log.agentName}</div>
                      {log.note && <div className="text-sm text-slate-700 bg-slate-50 p-2 rounded-lg">{log.note}</div>}
                    </div>
                  </div>
                ))}
                
                {/* Order Created Event */}
                <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-50 bg-indigo-100 text-indigo-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                      🛒
                    </div>
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-xs">Order Placed</span>
                        <time className="text-[10px] font-bold text-slate-400">{new Date(order.date).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</time>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
               {/* Details Form */}
               <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Status</label>
                    <select value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm">
                      {orderStatuses.map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Customer Name</label>
                      <input type="text" value={editForm.customer} onChange={e => setEditForm({...editForm, customer: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Phone</label>
                      <input type="text" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Wilaya</label>
                      <input type="text" value={editForm.wilaya || editForm.province || ''} onChange={e => setEditForm({...editForm, wilaya: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Commune</label>
                      <input type="text" value={editForm.commune || editForm.city || ''} onChange={e => setEditForm({...editForm, commune: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Detailed Address</label>
                    <textarea value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} rows={2} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Product</label>
                      <input type="text" value={editForm.product} onChange={e => setEditForm({...editForm, product: e.target.value})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Total ({activeStore.currency})</label>
                      <input type="number" value={editForm.total} onChange={e => setEditForm({...editForm, total: Number(e.target.value)})} className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none text-sm" />
                    </div>
                  </div>

                  <button onClick={handleSaveDetails} className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-lg active:scale-95 transition-all text-sm mt-4">UPDATE ORDER DETAILS</button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
