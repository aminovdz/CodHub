'use client';

import { useState } from 'react';
import { Edit2, X, Plus, RefreshCw, Trash2, Send, Download, Phone, CheckCircle, XCircle, Clock, PhoneCall, PhoneMissed, MessageSquare, UserCheck, Calendar, ShieldCheck, MapPin } from 'lucide-react';
import { useAdminStore, Order, CallLog, OrderNote } from '@/lib/store/useAdminStore';
import { supabase } from '@/lib/supabase';
import { sendAiSensyConfirmation } from '@/lib/actions/funnelActions';

const CALL_RESULTS = [
  { value: 'answered',    label: 'Answered',    icon: '📞', color: 'bg-blue-100 text-blue-700' },
  { value: 'no_answer',   label: 'No Answer',   icon: '📵', color: 'bg-slate-100 text-slate-600' },
  { value: 'confirmed',   label: 'Confirmed',   icon: '✅', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'canceled',    label: 'Canceled',    icon: '❌', color: 'bg-rose-100 text-rose-700' },
  { value: 'rescheduled', label: 'Rescheduled', icon: '🔄', color: 'bg-amber-100 text-amber-700' },
] as const;

const formatStatus = (status: string) => {
  if (status === 'PENDING_AGENT_CONFIRMATION') return 'PENDING';
  return status.replace(/_/g, ' ');
};

export default function AdminOrdersPage() {
  const { activeStore, orderStatuses, orders, setOrders, callLogs, setCallLogs, staffAccounts, addActivityLog } = useAdminStore();
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [callLogOrderId, setCallLogOrderId] = useState<string | null>(null);
  const [newCall, setNewCall] = useState({ result: 'answered' as CallLog['result'], note: '' });
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [whatsappModal, setWhatsappModal] = useState<{
    orderId: string;
    phone: string;
    message: string;
  } | null>(null);

  const [isSendingAiSensy, setIsSendingAiSensy] = useState(false);

  const handleTriggerConfirmWhatsApp = (order: Order) => {
    let message = activeStore.whatsappConfig?.thankYouMessage || "Hello *[NAME]*, this is *[STORE_NAME]*. We are pleased to confirm your Cash on Delivery order for *[PRODUCT]*! We are preparing it for shipment. Order: #[ORDER_ID]";
    message = message.replace(/\[NAME\]/g, order.customer || '')
                     .replace(/\[ORDER_ID\]/g, order.id || '')
                     .replace(/\[PRODUCT\]/g, order.product || '')
                     .replace(/\[STORE_NAME\]/g, activeStore.name || '');
    setWhatsappModal({
      orderId: order.id,
      phone: order.phone,
      message: message
    });
  };
  // Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusMenu, setBulkStatusMenu] = useState(false);

  // Role & Session handling
  const sessionData = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}'); } catch { return {}; } })()
    : {};
  const sessionUser = sessionData.user || sessionData.username || 'Admin';
  const sessionRole = (sessionData.role || 'admin') as 'admin' | 'fulfillment' | 'confirmation';
  const isAdmin = sessionRole === 'admin' || sessionData.isSuperAdmin;

  const filteredOrders = orders
    .filter(o => o.storeId === activeStore.id)
    .filter(o => statusFilter === 'ALL' || o.status === statusFilter);

  // --- CSV Export ---
  const exportCSV = (yalidineFormat = false) => {
    const rows = filteredOrders;
    let csv = '';
    if (yalidineFormat) {
      // Yalidine bulk import format (Confirmed only)
      const confirmedOnly = rows.filter(o => o.status === 'CONFIRMED' || o.status === 'SELF_CONFIRMED');
      csv = 'Nom,Téléphone,Wilaya,Commune,Adresse,Produit,Prix\n';
      confirmedOnly.forEach(o => {
        csv += `"${o.customer}","${o.phone}","${o.wilaya || o.province || ''}","${o.commune || o.city || ''}","${o.address}","${o.product}","${o.total}"\n`;
      });
    } else {
      csv = 'Order ID,Date,Customer,Phone,Wilaya,Commune,Country,Address,Product,Total,Status\n';
      rows.forEach(o => {
        csv += `"${o.id}","${o.date}","${o.customer}","${o.phone}","${o.wilaya || ''}","${o.commune || ''}","${o.country || ''}","${o.address}","${o.product}","${o.total}","${o.status}"\n`;
      });
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = yalidineFormat ? `yalidine_${activeStore.region}_${Date.now()}.csv` : `orders_${activeStore.region}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Order CRUD ---
  const handleDeleteOrder = async (id: string) => {
    if (!isAdmin) {
      alert("Staff accounts cannot delete orders.");
      return;
    }
    if (confirm('Are you sure you want to delete this order?')) {
      try {
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (error) throw error;
        
        setOrders(prev => prev.filter(o => o.id !== id));
        addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Order Deleted', detail: `Order ${id} deleted` });
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      } catch (err: any) {
        alert("Failed to delete order: " + err.message);
      }
    }
  };

  const handleClaimOrder = async (id: string) => {
    try {
      const { error } = await supabase.from('orders').update({ claimed_by: sessionUser }).eq('id', id);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === id ? { ...o, claimedBy: sessionUser } : o));
      addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Order Claimed', detail: `Agent ${sessionUser} claimed order ${id}` });
    } catch (err: any) {
      alert("Failed to claim order: " + err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!isAdmin) {
      alert("Staff accounts cannot delete orders.");
      return;
    }
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} orders?`)) {
      try {
        const { error } = await supabase.from('orders').delete().in('id', Array.from(selectedIds));
        if (error) throw error;

        setOrders(prev => prev.filter(o => !selectedIds.has(o.id)));
        addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Bulk Delete', detail: `${selectedIds.size} orders deleted` });
        setSelectedIds(new Set());
      } catch (err: any) {
        alert("Failed to delete orders: " + err.message);
      }
    }
  };

  const handleBulkStatus = async (status: string) => {
    if (selectedIds.size === 0) return;
    const idsArray = Array.from(selectedIds);
    setOrders(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, status } : o));
    try {
      await supabase.from('orders').update({ status }).in('id', idsArray);
    } catch (err: any) {
      console.error("Supabase sync error in bulk status:", err);
    }
    addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Bulk Status Update', detail: `${selectedIds.size} orders marked as ${status}` });
    setSelectedIds(new Set());
    setBulkStatusMenu(false);
  };

  const handlePushToFulfillment = async (order: Order) => {
    const wilaya = order.wilaya || order.province;
    const commune = order.commune || order.city;

    if (!wilaya || !commune) {
      alert("Please set Wilaya and Commune before fulfillment.");
      return;
    }
    
    if ((activeStore.yalidineApiKey && activeStore.yalidineApiToken) || activeStore.genericWebhookUrl) {
      try {
        const res = await fetch('/api/fulfillment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order, store: activeStore })
        });
        
        const data = await res.json();
        
        if (res.ok && data.success) {
          alert(data.message || "Order pushed to fulfillment successfully!");
          addActivityLog({
            storeId: activeStore.id,
            user: sessionUser,
            action: 'Fulfillment Push',
            detail: `Order ${order.id} pushed to ${activeStore.yalidineApiKey ? 'Yalidine' : 'Webhook'}`
          });
        } else {
          throw new Error(data.error || "Fulfillment request failed");
        }
      } catch (err: any) {
        alert("Failed: " + err.message);
      }
    } else {
      alert("No fulfillment integration (Yalidine or Webhook) found in Settings.");
    }
  };

  const handleCreateOrder = () => {
    setEditingOrder({
      id: 'ORD-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      storeId: activeStore.id,
      customer: '', phone: '', address: '', product: '',
      total: 0, status: orderStatuses[0],
      date: new Date().toISOString()
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    const isNew = !orders.find(o => o.id === editingOrder.id);
    setOrders(prev => {
      if (!isNew) return prev.map(o => o.id === editingOrder.id ? editingOrder : o);
      return [editingOrder, ...prev];
    });

    try {
      const rowPayload = {
        id: editingOrder.id,
        store_id: editingOrder.storeId,
        customer: editingOrder.customer,
        phone: editingOrder.phone,
        product: editingOrder.product,
        total: editingOrder.total,
        status: editingOrder.status,
        notes: editingOrder.notes || [],
        claimed_by: editingOrder.claimedBy || null,
        confirmed_by: editingOrder.confirmedBy || null
      };

      if (isNew) {
        await supabase.from('orders').insert(rowPayload);
      } else {
        await supabase.from('orders').update(rowPayload).eq('id', editingOrder.id);
      }
    } catch (err: any) {
      console.error("Supabase sync error in handleSave:", err);
    }

    addActivityLog({
      storeId: activeStore.id, user: sessionUser,
      action: isNew ? 'Order Created' : 'Order Updated',
      detail: `${editingOrder.id} — ${editingOrder.customer}`
    });
    setEditingOrder(null);
  };

  // --- Call Logs ---
  const addCallLog = async () => {
    if (!callLogOrderId) return;
    const entry: CallLog = {
      id: `call_${Date.now()}`, orderId: callLogOrderId,
      storeId: activeStore.id, agentName: sessionUser,
      result: newCall.result, note: newCall.note,
      calledAt: new Date().toISOString()
    };
    setCallLogs(prev => [entry, ...prev]);

    const currentOrder = orders.find(o => o.id === callLogOrderId);
    const existingNotes = currentOrder?.notes || [];
    const newNoteObj = {
      id: `note_${Date.now()}`,
      author: sessionUser,
      text: `[Call - ${newCall.result.toUpperCase()}]: ${newCall.note || 'No note'}`,
      createdAt: new Date().toISOString()
    };
    const updatedNotes = [...existingNotes, newNoteObj];

    let newStatus = currentOrder?.status || 'PENDING_AGENT_CONFIRMATION';
    let newConfirmedBy = currentOrder?.confirmedBy || null;

    if (newCall.result === 'confirmed') {
      newStatus = 'CONFIRMED';
      newConfirmedBy = sessionUser;
      setOrders(prev => prev.map(o => o.id === callLogOrderId ? { ...o, status: 'CONFIRMED', confirmedBy: sessionUser, notes: updatedNotes } : o));
    } else if (newCall.result === 'canceled') {
      newStatus = 'CANCELED';
      setOrders(prev => prev.map(o => o.id === callLogOrderId ? { ...o, status: 'CANCELED', notes: updatedNotes } : o));
    } else {
      setOrders(prev => prev.map(o => o.id === callLogOrderId ? { ...o, notes: updatedNotes } : o));
    }

    try {
      const updatePayload: any = { notes: updatedNotes, status: newStatus };
      if (newConfirmedBy) updatePayload.confirmed_by = newConfirmedBy;

      await supabase.from('orders').update(updatePayload).eq('id', callLogOrderId);
    } catch (err: any) {
      console.error("Supabase sync error in addCallLog:", err);
    }

    addActivityLog({
      storeId: activeStore.id,
      user: sessionUser,
      action: 'Call Logged',
      detail: `Order ${callLogOrderId} — Call Result: ${newCall.result.toUpperCase()}${newCall.note ? ' - ' + newCall.note : ''}`
    });

    setNewCall({ result: 'answered', note: '' });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredOrders.map(o => o.id)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  const callLogOrder = callLogOrderId ? orders.find(o => o.id === callLogOrderId) : null;
  const orderCallLogs = callLogOrderId ? callLogs.filter(c => c.orderId === callLogOrderId) : [];

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Orders Manager</h1>
          <p className="text-slate-500 font-medium">Managing <span className="font-bold text-indigo-600">{activeStore.name}</span> — {filteredOrders.length} orders</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => exportCSV(true)} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-all active:scale-95 shadow-lg shadow-slate-900/20 border border-slate-700">
            <Download size={16}/> Confirm Export (Sheet)
          </button>
          <button onClick={() => exportCSV(false)} className="p-2.5 text-slate-500 hover:text-indigo-600 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-all shadow-sm">
            <Download size={18}/>
          </button>
          <button onClick={() => window.location.reload()} className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 p-2 rounded-xl transition-colors shadow-sm">
            <RefreshCw size={20} />
          </button>
          <button onClick={handleCreateOrder} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
            <Plus size={20} /> New Order
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 flex-wrap mb-4">
        {['ALL', ...orderStatuses].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wide transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {formatStatus(s)}
            {s !== 'ALL' && <span className="ml-1.5 opacity-70">{orders.filter(o => o.storeId === activeStore.id && o.status === s).length}</span>}
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl mb-4 flex items-center justify-between shadow-sm">
          <div className="text-sm font-bold text-indigo-900">{selectedIds.size} selected</div>
          <div className="flex gap-2 relative">
            <button onClick={() => setBulkStatusMenu(!bulkStatusMenu)} className="px-3 py-1.5 bg-white border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold hover:bg-indigo-50 transition-all">Change Status...</button>
            {bulkStatusMenu && (
              <div className="absolute bottom-full mb-2 right-0 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-1 z-20">
                {orderStatuses.map(s => (
                  <button key={s} onClick={() => handleBulkStatus(s)} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700">Mark as {formatStatus(s)}</button>
                ))}
              </div>
            )}
            {isAdmin && (
              <button onClick={handleBulkDelete} className="px-3 py-1.5 bg-rose-100 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-200 transition-all flex items-center gap-1"><Trash2 size={14} /> Delete</button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="p-4 w-12 text-center">
                  <input type="checkbox" checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                </th>
                <th className="p-4 font-bold">Order Details</th>
                <th className="p-4 font-bold">Customer</th>
                <th className="p-4 font-bold">Detailed Address</th>
                <th className="p-4 font-bold">City</th>
                <th className="p-4 font-bold">State / Country</th>
                <th className="p-4 font-bold">Product</th>
                <th className="p-4 font-bold">Upsells</th>
                <th className="p-4 font-bold">Total</th>
                <th className="p-4 font-bold">Notes</th>
                <th className="p-4 font-bold">Claimed By</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium text-slate-700">
              {filteredOrders.length === 0 && <tr><td colSpan={13} className="p-10 text-center text-slate-400">No orders found.</td></tr>}
              {filteredOrders.map(o => {
                const calls = callLogs.filter(c => c.orderId === o.id);
                return (
                  <tr key={o.id} className={`border-b border-slate-100 transition-colors ${selectedIds.has(o.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                    <td className="p-4 text-center">
                      <input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => toggleSelect(o.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                    </td>
                    <td className="p-4">
                      <div className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block mb-1">{o.id.slice(0, 12).toUpperCase()}</div>
                      <div className="text-[10px] text-slate-400">{new Date(o.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      {o.source && <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] uppercase font-black bg-slate-100 text-slate-500">{o.source}</span>}
                    </td>
                    <td className="p-4 font-bold text-slate-900">
                      <div>{o.customer}</div>
                      <div className="text-xs font-bold text-indigo-600 mt-1">{o.phone}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-bold text-slate-800 break-words max-w-[200px]" title={o.address}>{o.address}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{o.commune || o.city || '—'}</div>
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-bold text-slate-600">{o.wilaya || o.province || '—'}</div>
                      {o.country && (
                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-wider">{o.country}</div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="text-xs font-bold text-slate-900 truncate max-w-[150px]" title={o.product}>
                        {o.product.split(',')[0]}
                      </div>
                    </td>
                    <td className="p-4">
                      {o.product.includes(',') ? (
                        <div className="flex flex-wrap gap-1">
                          {o.product.split(',').slice(1).map((up, i) => (
                            <span key={i} className="text-[9px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 font-black tracking-tighter uppercase">
                              +{up.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">—</span>
                      )}
                    </td>
                    <td className="p-4 font-bold text-indigo-600">{o.total} {activeStore.currency}</td>
                    <td className="p-4 max-w-[150px]">
                      {o.notes && o.notes.length > 0 ? (
                        <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-2 text-xs text-amber-800" title={o.notes.map(n => `[${n.author}]: ${n.text}`).join('\n')}>
                          <div className="font-bold text-[9px] uppercase tracking-wider text-amber-700 mb-0.5">{o.notes[o.notes.length - 1].author}</div>
                          <div className="truncate font-medium">{o.notes[o.notes.length - 1].text}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs italic">No notes</span>
                      )}
                    </td>
                    <td className="p-4">
                      {o.claimedBy ? (
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${o.claimedBy === sessionUser ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                          <UserCheck size={12}/>
                          <span>{o.claimedBy === sessionUser ? 'You' : isAdmin ? o.claimedBy : 'Claimed'}</span>
                        </div>
                      ) : (
                        <button onClick={() => handleClaimOrder(o.id)} className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl transition-colors font-bold shadow-sm">Claim</button>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                        o.status === 'CONFIRMED' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : o.status === 'SELF_CONFIRMED' 
                            ? 'bg-teal-100 text-teal-800 border border-teal-200 font-bold' 
                            : o.status === 'CANCELED' 
                              ? 'bg-rose-100 text-rose-700' 
                              : 'bg-amber-100 text-amber-700'
                      }`}>{formatStatus(o.status)}</span>
                      {calls.length > 0 && <div className="mt-1 text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1"><Phone size={8}/> {calls[0].result}</div>}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" onClick={() => handleTriggerConfirmWhatsApp(o)} className="p-2 text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg shadow-sm transition-colors animate-all active:scale-95" title="Send WhatsApp Confirmation"><MessageSquare size={16} /></button>
                        {(o.status === 'CONFIRMED' || o.status === 'SELF_CONFIRMED') && <button onClick={() => handlePushToFulfillment(o)} className="p-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors"><Send size={16} /></button>}
                        <button 
                          onClick={() => {
                            if (!isAdmin && o.claimedBy !== sessionUser) {
                              alert("You must claim this order first before editing.");
                              return;
                            }
                            setEditingOrder(o);
                          }} 
                          className={`p-2 rounded-lg ${!isAdmin && o.claimedBy !== sessionUser ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 bg-slate-100'}`}
                          title={!isAdmin && o.claimedBy !== sessionUser ? "Claim order first to edit" : "Edit Order"}
                        >
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => setCallLogOrderId(o.id)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-100 rounded-lg relative"><Phone size={16} />{calls.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-blue-600 rounded-full"/>}</button>
                        {isAdmin && <button onClick={() => handleDeleteOrder(o.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 rounded-lg"><Trash2 size={16} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Call Log Slide-over */}
      {callLogOrderId && callLogOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end" onClick={() => setCallLogOrderId(null)}>
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-slate-900 text-white flex justify-between items-start">
              <div>
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Call Logs</div>
                <div className="font-black text-xl">{callLogOrder.customer}</div>
                <div className="text-slate-400 text-sm font-bold">{callLogOrder.phone}</div>
              </div>
              <button onClick={() => setCallLogOrderId(null)} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>
            <div className="p-6 border-b bg-slate-50">
              <div className="flex flex-wrap gap-2 mb-4">
                {CALL_RESULTS.map(r => (
                  <button key={r.value} onClick={() => setNewCall(c => ({...c, result: r.value}))} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${newCall.result === r.value ? r.color + ' ring-2 ring-current' : 'bg-white text-slate-600 border border-slate-200 shadow-sm'}`}>{r.icon} {r.label}</button>
                ))}
              </div>
              <textarea value={newCall.note} onChange={e => setNewCall(c => ({...c, note: e.target.value}))} placeholder="Call notes..." rows={3} className="w-full p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none text-sm font-medium mb-3 shadow-inner" />
              <button onClick={addCallLog} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">SAVE CALL LOG</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {orderCallLogs.map((log, idx) => (
                <div key={log.id || `call_${log.calledAt || idx}_${idx}`} className="bg-white border rounded-2xl p-4 shadow-sm border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">{log.result}</span>
                    <span className="text-[10px] text-slate-400 font-bold">{new Date(log.calledAt).toLocaleString()}</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 mb-1">by {log.agentName}</div>
                  {log.note && <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-50">{log.note}</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b flex justify-between items-center shrink-0">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg"><Edit2 size={20} className="text-white"/></div>
                {orders.find(o => o.id === editingOrder.id) ? 'Edit Order' : 'Create Order'}
              </h2>
              <button type="button" onClick={() => setEditingOrder(null)} className="text-slate-400 hover:text-slate-600 bg-slate-100 p-2 rounded-xl transition-colors"><X size={24} /></button>
            </div>

            <div className="p-8 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Status</label>
                  <select value={editingOrder.status} onChange={e => setEditingOrder({...editingOrder, status: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none">
                    {orderStatuses.map(s => <option key={s} value={s}>{formatStatus(s)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Total ({activeStore.currency})</label>
                  <input type="number" value={editingOrder.total} onChange={e => setEditingOrder({...editingOrder, total: Number(e.target.value)})} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Customer Name</label>
                  <input type="text" value={editingOrder.customer} onChange={e => setEditingOrder({...editingOrder, customer: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phone</label>
                  <input type="text" value={editingOrder.phone} onChange={e => setEditingOrder({...editingOrder, phone: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Wilaya (State)</label>
                  <input type="text" value={editingOrder.wilaya || editingOrder.province || ''} onChange={e => setEditingOrder({...editingOrder, wilaya: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Commune (City)</label>
                  <input type="text" value={editingOrder.commune || editingOrder.city || ''} onChange={e => setEditingOrder({...editingOrder, commune: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Country</label>
                  <input type="text" value={editingOrder.country || ''} onChange={e => setEditingOrder({...editingOrder, country: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Address Detail</label>
                <textarea value={editingOrder.address} onChange={e => setEditingOrder({...editingOrder, address: e.target.value})} rows={2} className="w-full p-4 rounded-2xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none resize-none" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Product Details</label>
                  <input type="text" value={editingOrder.product} onChange={e => setEditingOrder({...editingOrder, product: e.target.value})} className="w-full p-4 rounded-2xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none" placeholder="e.g. 1x Product" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Quantity</label>
                    <input type="number" value={editingOrder.quantity || 1} onChange={e => setEditingOrder({...editingOrder, quantity: Number(e.target.value)})} className="w-full p-4 rounded-2xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Cost Price</label>
                    <input type="number" value={editingOrder.costPrice || 0} onChange={e => setEditingOrder({...editingOrder, costPrice: Number(e.target.value)})} className="w-full p-4 rounded-2xl border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none" />
                  </div>
                </div>
              </div>

              {/* Attribution (Admin Only) */}
              {isAdmin && (
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={16} className="text-indigo-600"/> Tracking & Attribution</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Source</label>
                      <select value={editingOrder.source || ''} onChange={e => setEditingOrder({...editingOrder, source: e.target.value as any})} className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none">
                        <option value="">Unknown</option>
                        <option value="facebook">Facebook</option>
                        <option value="tiktok">TikTok</option>
                        <option value="snapchat">Snapchat</option>
                        <option value="direct">Direct</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Claimed By</label>
                      <input type="text" value={editingOrder.claimedBy || ''} onChange={e => setEditingOrder({...editingOrder, claimedBy: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-sm outline-none" />
                    </div>
                  </div>
                </div>
              )}

              {/* Internal Notes */}
              <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100">
                <h3 className="text-sm font-black text-amber-800 uppercase tracking-widest mb-3 flex items-center gap-2"><MessageSquare size={16}/> Staff Notes</h3>
                <div className="space-y-3 mb-4 max-h-40 overflow-y-auto">
                  {(editingOrder.notes || []).map((note, idx) => (
                    <div key={note.id || `note_${note.createdAt || idx}_${idx}`} className="bg-white p-3 rounded-2xl border border-amber-100 shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-amber-800">{note.author}</span>
                        <span className="text-[10px] text-slate-400">{new Date(note.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-700 font-medium">{note.text}</p>
                    </div>
                  ))}
                  {(!editingOrder.notes || editingOrder.notes.length === 0) && <p className="text-xs text-amber-600/50 italic">No notes added.</p>}
                </div>
                <div className="flex gap-2">
                  <input type="text" id="modalNoteInput" placeholder="Add staff comment..." className="flex-1 p-3 rounded-xl border border-amber-200 text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none bg-white" />
                  <button type="button" onClick={() => {
                    const el = document.getElementById('modalNoteInput') as HTMLInputElement;
                    if (el && el.value.trim()) {
                      setEditingOrder(prev => prev ? ({...prev, notes: [...(prev.notes||[]), {id: Date.now().toString(), author: sessionUser, text: el.value.trim(), createdAt: new Date().toISOString()}]}) : prev);
                      el.value = '';
                    }
                  }} className="bg-amber-600 text-white px-4 py-2 rounded-xl font-black text-xs shadow-md">ADD</button>
                </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t flex justify-between items-center shrink-0">
              <div>
                {(editingOrder.status === 'CONFIRMED' || editingOrder.status === 'SELF_CONFIRMED') && (
                  <button type="button" onClick={() => handlePushToFulfillment(editingOrder)} className="flex items-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-95">
                    <Send size={18}/> SYNC TO FULFILLMENT
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setEditingOrder(null)} className="px-6 py-4 font-black text-slate-500 hover:text-slate-800 transition-colors">CANCEL</button>
                <button type="submit" className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">SAVE CHANGES</button>
              </div>
            </div>
          </form>
        </div>
      )}

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
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Message Text</label>
                <textarea value={whatsappModal.message} onChange={e => setWhatsappModal({...whatsappModal, message: e.target.value})} rows={6} className="w-full p-4 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-indigo-600 outline-none resize-none" />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setWhatsappModal(null)} className="px-5 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>

              {activeStore.whatsappConfig?.aisensyEnabled && (
                <button 
                  type="button" 
                  disabled={isSendingAiSensy}
                  onClick={async () => {
                    setIsSendingAiSensy(true);
                    try {
                      const res = await sendAiSensyConfirmation(whatsappModal.orderId);
                      if (res.success) {
                        alert('AiSensy confirmation campaign triggered successfully!');
                      } else {
                        alert('Failed to trigger AiSensy confirmation: ' + res.error);
                      }
                    } catch (e: any) {
                      alert('Error: ' + e.message);
                    } finally {
                      setIsSendingAiSensy(false);
                      setWhatsappModal(null);
                    }
                  }} 
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSendingAiSensy ? 'Sending...' : 'Send via AiSensy'}
                </button>
              )}

              <button type="button" onClick={() => {
                window.open(`https://wa.me/${whatsappModal.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappModal.message)}`, '_blank');
                setWhatsappModal(null);
              }} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Send on WhatsApp</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
