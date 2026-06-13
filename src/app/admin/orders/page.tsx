'use client';

import { useState, useMemo } from 'react';
import { Edit2, Plus, RefreshCw, Trash2, Send, Download, Phone, CheckCircle, XCircle, Clock, PhoneCall, PhoneMissed, MessageSquare, UserCheck, Calendar, ShieldCheck, MapPin, LayoutGrid, List } from 'lucide-react';
import { useAdminStore, Order } from '@/lib/store/useAdminStore';
import { supabase } from '@/lib/supabase';
import { sendMetaConfirmation } from '@/lib/actions/funnelActions';
import { getShortOrderId } from '@/lib/idHelper';

import OrderDrawer from '@/components/admin/orders/OrderDrawer';

const formatStatus = (status: string) => {
  if (status === 'PENDING_AGENT_CONFIRMATION') return 'PENDING';
  return status.replace(/_/g, ' ');
};

export default function AdminOrdersPage() {
  const { activeStore, orderStatuses, orders, setOrders, callLogs, staffAccounts, addActivityLog } = useAdminStore();
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [whatsappModal, setWhatsappModal] = useState<{ orderId: string; phone: string; message: string; } | null>(null);
  const [isSendingMeta, setIsSendingMeta] = useState(false);
  
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;

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

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

  useMemo(() => { if (page > totalPages) setPage(1); }, [filteredOrders.length, statusFilter]);

  // Mini Stats Calculation
  const todayStart = new Date();
  todayStart.setHours(0,0,0,0);
  const todaysCalls = callLogs.filter(c => c.storeId === activeStore.id && new Date(c.calledAt) > todayStart && c.agentName === sessionUser);
  const todaysConfirmed = orders.filter(o => o.storeId === activeStore.id && o.confirmedBy === sessionUser && o.status === 'CONFIRMED' && new Date(o.date) > todayStart);
  
  const handleTriggerConfirmWhatsApp = (order: Order) => {
    let message = activeStore.whatsappConfig?.thankYouMessage || "Hello *[NAME]*, this is *[STORE_NAME]*. We are pleased to confirm your Cash on Delivery order for *[PRODUCT]*! We are preparing it for shipment. Order: #[ORDER_ID]";
    message = message.replace(/\[NAME\]/g, order.customer || '')
                     .replace(/\[ORDER_ID\]/g, order.id || '')
                     .replace(/\[PRODUCT\]/g, order.product || '')
                     .replace(/\[STORE_NAME\]/g, activeStore.name || '');
    setWhatsappModal({ orderId: order.id, phone: order.phone, message });
  };

  const exportCSV = () => {
    const rows = filteredOrders;
    let csv = 'Order ID,Date,Customer,Phone,Wilaya,Commune,Country,Address,Product,Total,Status\\n';
    rows.forEach(o => {
      csv += `"${getShortOrderId(o.id)}","${o.date}","${o.customer}","${o.phone}","${o.wilaya || ''}","${o.commune || ''}","${o.country || ''}","${o.address}","${o.product}","${o.total}","${o.status}"\\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders_${activeStore.region}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteOrder = async (id: string) => {
    if (!isAdmin) { alert("Staff accounts cannot delete orders."); return; }
    if (confirm('Are you sure you want to delete this order?')) {
      try {
        const { error } = await supabase.from('orders').delete().eq('id', id);
        if (error) throw error;
        setOrders(prev => prev.filter(o => o.id !== id));
        addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Order Deleted', detail: `Order ${id} deleted` });
        setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      } catch (err: any) { alert("Failed to delete order: " + err.message); }
    }
  };

  const handleClaimOrder = async (id: string) => {
    try {
      const { error } = await supabase.from('orders').update({ claimed_by: sessionUser }).eq('id', id);
      if (error) throw error;
      setOrders(prev => prev.map(o => o.id === id ? { ...o, claimedBy: sessionUser } : o));
      addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Order Claimed', detail: `Agent ${sessionUser} claimed order ${id}` });
    } catch (err: any) { alert("Failed to claim order: " + err.message); }
  };

  const handleSmartClaim = async () => {
    // Find oldest unassigned pending order
    const pendingOrder = filteredOrders.find(o => !o.claimedBy && (o.status === 'PENDING_AGENT_CONFIRMATION' || o.status === 'PENDING'));
    if (!pendingOrder) { alert("No pending unassigned orders found!"); return; }
    await handleClaimOrder(pendingOrder.id);
    setSelectedOrderId(pendingOrder.id);
  };

  const handleBulkDelete = async () => {
    if (!isAdmin) { alert("Staff accounts cannot delete orders."); return; }
    if (selectedIds.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedIds.size} orders?`)) {
      try {
        const { error } = await supabase.from('orders').delete().in('id', Array.from(selectedIds));
        if (error) throw error;
        setOrders(prev => prev.filter(o => !selectedIds.has(o.id)));
        addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Bulk Delete', detail: `${selectedIds.size} orders deleted` });
        setSelectedIds(new Set());
      } catch (err: any) { alert("Failed to delete orders: " + err.message); }
    }
  };

  const handleBulkStatus = async (status: string) => {
    if (selectedIds.size === 0) return;
    const idsArray = Array.from(selectedIds);
    setOrders(prev => prev.map(o => selectedIds.has(o.id) ? { ...o, status } : o));
    try { await supabase.from('orders').update({ status }).in('id', idsArray); } catch (err) { console.error(err); }
    addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Bulk Status Update', detail: `${selectedIds.size} orders marked as ${status}` });
    setSelectedIds(new Set());
    setBulkStatusMenu(false);
  };

  const handlePushToFulfillment = async (order: Order) => {
    if (!order.wilaya || !order.commune) { alert("Please set Wilaya and Commune before fulfillment."); return; }
    if (activeStore.yalidineApiKey && activeStore.yalidineApiToken) {
      alert("Connecting to Yalidine... (Implementation requires a secure server action to bypass CORS)");
    } else if (activeStore.genericWebhookUrl) {
       try {
         const res = await fetch(activeStore.genericWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(order) });
         if (res.ok) {
           alert("Order pushed to fulfillment webhook!");
           addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Fulfillment Push', detail: `Order ${order.id} pushed to webhook` });
         } else throw new Error("Webhook error: " + res.status);
       } catch (err: any) { alert("Failed: " + err.message); }
    } else {
      alert("No fulfillment integration found in Settings.");
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredOrders.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredOrders.map(o => o.id)));
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 relative">
      {/* Header & Mini Stats */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Orders Manager</h1>
          <div className="flex items-center gap-4">
            <p className="text-slate-500 font-medium">Managing <span className="font-bold text-indigo-600">{activeStore.name}</span></p>
            <div className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-lg text-xs font-black border border-indigo-100">
              <PhoneCall size={12}/> Today's Calls: {todaysCalls.length}
            </div>
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg text-xs font-black border border-emerald-100">
              <CheckCircle size={12}/> Confirmed Today: {todaysConfirmed.length}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button onClick={handleSmartClaim} className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 text-sm font-bold rounded-xl transition-all shadow-lg active:scale-95 border border-slate-700 flex items-center gap-2">
             <UserCheck size={16}/> Claim Next
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex gap-2 flex-wrap mb-6 items-center">
        {['ALL', ...orderStatuses].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${statusFilter === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {formatStatus(s)}
            {s !== 'ALL' && <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] ${statusFilter === s ? 'bg-white/20' : 'bg-slate-100'}`}>{orders.filter(o => o.storeId === activeStore.id && o.status === s).length}</span>}
          </button>
        ))}
        
        <div className="ml-auto flex items-center gap-2">
           <button onClick={() => exportCSV()} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 text-xs font-bold rounded-xl transition-all shadow-sm">
             <Download size={14}/> Export CSV
           </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-600 text-white p-4 rounded-2xl mb-6 flex items-center justify-between shadow-xl shadow-indigo-500/20 animate-in fade-in slide-in-from-top-2">
          <div className="text-sm font-black flex items-center gap-2"><CheckCircle size={18}/> {selectedIds.size} Orders Selected</div>
          <div className="flex gap-3 relative">
            <button onClick={() => setBulkStatusMenu(!bulkStatusMenu)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all border border-white/10">Change Status...</button>
            {bulkStatusMenu && (
              <div className="absolute top-full mt-2 right-0 w-48 bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-20 overflow-hidden">
                {orderStatuses.map(s => (
                  <button key={s} onClick={() => handleBulkStatus(s)} className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">Mark as {formatStatus(s)}</button>
                ))}
              </div>
            )}
            {isAdmin && <button onClick={handleBulkDelete} className="px-4 py-2 bg-rose-500 hover:bg-rose-600 rounded-xl text-xs font-bold transition-all flex items-center gap-2"><Trash2 size={14} /> Delete</button>}
          </div>
        </div>
      )}

      {/* Main Views */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {/* Desktop Table */}
            <table className="w-full text-left border-collapse min-w-[1000px] hidden lg:table">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500 border-b border-slate-200">
                  <th className="p-5 w-12 text-center"><input type="checkbox" checked={filteredOrders.length > 0 && selectedIds.size === filteredOrders.length} onChange={toggleSelectAll} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" /></th>
                  <th className="p-5 font-bold">Order Details</th>
                  <th className="p-5 font-bold">Customer</th>
                  <th className="p-5 font-bold">Location</th>
                  <th className="p-5 font-bold">Product</th>
                  <th className="p-5 font-bold">Total</th>
                  <th className="p-5 font-bold">Claimed By</th>
                  <th className="p-5 font-bold">Status</th>
                  <th className="p-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium text-slate-700">
                {filteredOrders.length === 0 && <tr><td colSpan={9} className="p-16 text-center text-slate-400 font-bold">No orders found.</td></tr>}
                {paginatedOrders.map(o => {
                  const calls = callLogs.filter(c => c.orderId === o.id);
                  return (
                    <tr key={o.id} onClick={() => setSelectedOrderId(o.id)} className={`border-b border-slate-100 transition-colors cursor-pointer ${selectedIds.has(o.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                      <td className="p-5 text-center" onClick={e => e.stopPropagation()}>
                         <input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => toggleSelect(o.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                      </td>
                      <td className="p-5">
                        <div className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block mb-1 font-bold">{getShortOrderId(o.id)}</div>
                        <div className="text-[10px] text-slate-400 font-bold">{new Date(o.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                      </td>
                      <td className="p-5">
                        <div className="font-black text-slate-900">{o.customer}</div>
                        <div className="text-xs font-bold text-slate-500 mt-0.5 flex items-center gap-1"><Phone size={10}/> {o.phone}</div>
                      </td>
                      <td className="p-5">
                        <div className="font-bold text-slate-900">{o.wilaya || o.province || '—'}</div>
                        <div className="text-xs text-slate-500">{o.commune || o.city || '—'}</div>
                      </td>
                      <td className="p-5">
                        <div className="text-xs font-bold text-slate-900" title={o.product}>
                          {o.product.split(',').map((p, idx) => (
                            <div key={idx} className="mb-0.5">{p.trim()}</div>
                          ))}
                        </div>
                        {o.notes && o.notes.length > 0 && (
                          <div className="text-[10px] mt-2 text-amber-700 bg-amber-50 p-2 rounded border border-amber-100 font-bold whitespace-pre-wrap" title={o.notes[0].text}>
                            📝 {o.notes[0].text}
                          </div>
                        )}
                      </td>
                      <td className="p-5 font-black text-indigo-600">{o.total} {activeStore.currency}</td>
                      <td className="p-5" onClick={e => e.stopPropagation()}>
                        {o.claimedBy ? (
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${o.claimedBy === sessionUser ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                            {o.claimedBy === sessionUser ? 'You' : o.claimedBy}
                          </div>
                        ) : (
                          <button onClick={() => handleClaimOrder(o.id)} className="text-[10px] uppercase tracking-wider bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-full transition-colors font-black shadow-sm">Claim</button>
                        )}
                      </td>
                      <td className="p-5">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          o.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                          o.status === 'SELF_CONFIRMED' ? 'bg-teal-100 text-teal-800 border border-teal-200' :
                          o.status === 'CANCELED' ? 'bg-rose-100 text-rose-700 border border-rose-200' :
                          'bg-amber-100 text-amber-700 border border-amber-200'
                        }`}>{formatStatus(o.status)}</span>
                        {calls.length > 0 && <div className="mt-1.5 text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1"><Phone size={10}/> {calls.length} CALLS</div>}
                      </td>
                      <td className="p-5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-end gap-2">
                           {activeStore.genericWebhookUrl && (o.status === 'CONFIRMED' || o.status === 'SELF_CONFIRMED') && (
                             <button onClick={() => handlePushToFulfillment(o)} title="Send to n8n / 3PL Webhook" className="p-2 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-xl transition-colors">
                               <Send size={16} />
                             </button>
                           )}
                           {isAdmin && <button onClick={() => handleDeleteOrder(o.id)} title="Delete Order" className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={16} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Mobile Cards View */}
            <div className="lg:hidden flex flex-col divide-y divide-slate-100">
              {filteredOrders.length === 0 && <div className="p-16 text-center text-slate-400 font-bold">No orders found.</div>}
              {paginatedOrders.map(o => {
                const calls = callLogs.filter(c => c.orderId === o.id);
                return (
                  <div key={o.id} onClick={() => setSelectedOrderId(o.id)} className={`p-4 transition-colors cursor-pointer ${selectedIds.has(o.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                    <div className="flex items-start gap-3">
                      <div className="mt-1" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(o.id)} onChange={() => toggleSelect(o.id)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded inline-block font-bold">#{getShortOrderId(o.id)}</div>
                            <div className="font-black text-slate-900 mt-1">{o.customer}</div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1">
                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                              o.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                              o.status === 'CANCELED' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                              'bg-amber-100 text-amber-700 border-amber-200'
                            }`}>{formatStatus(o.status)}</span>
                            <div className="font-black text-indigo-600 text-sm mt-1">{o.total} <span className="text-[10px]">{activeStore.currency}</span></div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <div className="flex flex-col gap-0.5">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Location</div>
                            <div className="text-xs font-bold text-slate-700">{o.wilaya || '—'} / {o.commune || '—'}</div>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <div className="text-[10px] uppercase font-bold text-slate-400">Phone</div>
                            <div className="text-xs font-bold text-slate-700 flex items-center gap-1"><Phone size={10}/> {o.phone}</div>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2">
                           <div className="text-xs font-bold text-slate-800 line-clamp-2">{o.product.split(',').join(' + ')}</div>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                          <div onClick={e => e.stopPropagation()}>
                            {o.claimedBy ? (
                              <span className="text-[10px] font-bold text-slate-500">Claimed by <span className="text-indigo-600">{o.claimedBy}</span></span>
                            ) : (
                              <button onClick={() => handleClaimOrder(o.id)} className="text-[10px] uppercase tracking-wider bg-slate-900 text-white px-3 py-1 rounded-full font-black">Claim</button>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-bold">{new Date(o.date).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      {/* Slide-Out Drawer (Replaces Edit Modal and Call Log Modal) */}
      <OrderDrawer 
        orderId={selectedOrderId} 
        onClose={() => setSelectedOrderId(null)} 
        sessionUser={sessionUser}
        isAdmin={isAdmin}
        onOpenWhatsApp={handleTriggerConfirmWhatsApp}
      />

      {/* WhatsApp Modal */}
      {whatsappModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={() => setWhatsappModal(null)}>
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center bg-slate-900 text-white shrink-0">
              <h3 className="text-lg font-black tracking-tight flex items-center gap-2">💬 Customize WhatsApp Message</h3>
              <button type="button" onClick={() => setWhatsappModal(null)} className="text-slate-400 hover:text-white"><XCircle size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Recipient Phone</label>
                <input type="text" disabled={!isAdmin} value={whatsappModal.phone} onChange={e => setWhatsappModal({...whatsappModal, phone: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 font-bold focus:ring-2 focus:ring-indigo-600 outline-none disabled:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5">Message Text</label>
                <textarea value={whatsappModal.message} onChange={e => setWhatsappModal({...whatsappModal, message: e.target.value})} rows={6} className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 font-medium focus:ring-2 focus:ring-indigo-600 outline-none resize-none" />
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setWhatsappModal(null)} className="px-5 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors">Cancel</button>
              {activeStore.whatsappConfig?.metaEnabled && (
                <button type="button" disabled={isSendingMeta} onClick={async () => {
                    setIsSendingMeta(true);
                    try {
                      const res = await sendMetaConfirmation(whatsappModal.orderId);
                      if (res.success) alert('✅ WhatsApp confirmation sent via Meta!');
                      else alert('❌ Failed to send via Meta: ' + (res as any).error);
                    } catch (e: any) { alert('Error: ' + e.message); } 
                    finally { setIsSendingMeta(false); setWhatsappModal(null); }
                  }} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50">
                  {isSendingMeta ? 'Sending...' : '📱 Send via Meta API'}
                </button>
              )}
              <button type="button" onClick={() => {
                window.open(`https://wa.me/${whatsappModal.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappModal.message)}`, '_blank');
                setWhatsappModal(null);
              }} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">Send Direct</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
