'use client';

import { useState, useMemo } from 'react';
import { useAdminStore, StaffGoal, CommissionEntry } from '@/lib/store/useAdminStore';
import { Target, DollarSign, Award, Plus, Trash2, CheckCircle, Clock, Users, X, Edit2, Shield } from 'lucide-react';

export default function AdminStaffPage() {
  const { activeStore, availableStores, orders, callLogs, staffGoals, setStaffGoals, commissionEntries, setCommissionEntries, staffAccounts, addStaffAccount, updateStaffAccount, deleteStaffAccount, addActivityLog } = useAdminStore();
  
  const sessionData = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}'); } catch { return {}; } })()
    : {};
  const sessionUser = sessionData.user || sessionData.username || 'System';
  const sessionRole = sessionData.role || '';

  const [newGoal, setNewGoal] = useState({ agentName: '', targetOrders: 100, targetRevenue: 5000, month: new Date().toISOString().slice(0, 7) });
  const [newCommission, setNewCommission] = useState({ agentName: '', amount: 0, reason: '', type: 'BONUS' as const });
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'month'>('month');

  // Staff Management State
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<'admin' | 'fulfillment' | 'confirmation'>('fulfillment');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [newStaffStoreIds, setNewStaffStoreIds] = useState<string[]>([]);
  const [newStaffPermissions, setNewStaffPermissions] = useState({ canExport: true, canEditTotals: false, canDeleteNotes: false, canAssignOrders: false });

  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editStaffName, setEditStaffName] = useState('');
  const [editStaffEmail, setEditStaffEmail] = useState('');
  const [editStaffRole, setEditStaffRole] = useState<'admin' | 'fulfillment' | 'confirmation'>('fulfillment');
  const [editStaffPin, setEditStaffPin] = useState('');
  const [editStaffStoreIds, setEditStaffStoreIds] = useState<string[]>([]);
  const [editStaffPermissions, setEditStaffPermissions] = useState({ canExport: true, canEditTotals: false, canDeleteNotes: false, canAssignOrders: false });

  // Get active agents based on staff accounts, call logs, and claimed orders
  const activeAgents = useMemo(() => {
    // 1. Get agents from staffAccounts assigned to this store (or global)
    const storeStaff = staffAccounts.filter(acc => {
      if (!acc.storeId && (!acc.storeIds || acc.storeIds.length === 0)) return true; // global
      if (acc.storeId === activeStore.id) return true;
      if (acc.storeIds && acc.storeIds.includes(activeStore.id)) return true;
      return false;
    }).map(acc => acc.name);

    // 2. Get agents from call logs for this store
    const storeLogs = callLogs.filter(c => c.storeId === activeStore.id).map(c => c.agentName);

    // 3. Get agents from claimed orders for this store
    const storeOrders = orders.filter(o => o.storeId === activeStore.id && o.claimedBy).map(o => o.claimedBy!);

    return Array.from(new Set([...storeStaff, ...storeLogs, ...storeOrders])).filter(Boolean);
  }, [staffAccounts, callLogs, orders, activeStore.id]);

  // Compute performance for current month
  const currentMonth = new Date().toISOString().slice(0, 7);
  
  const staffPerformance = useMemo(() => {
    const rangeDate = new Date();
    if (dateRange === '7d') rangeDate.setDate(rangeDate.getDate() - 7);
    else if (dateRange === '30d') rangeDate.setDate(rangeDate.getDate() - 30);
    else if (dateRange === '90d') rangeDate.setDate(rangeDate.getDate() - 90);
    const cutoffStr = rangeDate.toISOString();

    return activeAgents.map(agent => {
      // Find orders claimed by this agent
      const agentOrders = orders.filter(o => 
        o.storeId === activeStore.id && 
        o.claimedBy === agent && 
        (dateRange === 'month' ? o.date.startsWith(currentMonth) : (!o.date || o.date >= cutoffStr))
      );
      const confirmedOrders = agentOrders.filter(o => o.status === 'CONFIRMED' || o.status === 'SHIPPED' || o.status === 'DELIVERED');
      const deliveredOrders = agentOrders.filter(o => o.status === 'DELIVERED');
      const canceledOrders = agentOrders.filter(o => o.status === 'CANCELED' || o.status === 'NO_ANSWER' || o.status === 'RTO');
      
      const totalRevenue = deliveredOrders.reduce((s, o) => s + (o.total || 0), 0);
      
      // Get agent's goal for this month (goals are strictly monthly)
      const goal = staffGoals.find(g => g.storeId === activeStore.id && g.agentName === agent && g.month === currentMonth);
      
      // Calculate total commission for this month
      const commissions = commissionEntries.filter(c => c.storeId === activeStore.id && c.agentName === agent && c.date.startsWith(currentMonth));
      const totalCommission = commissions.reduce((s, c) => s + c.amount, 0);

      return {
        agent,
        ordersProcessed: agentOrders.length,
        confirmedOrders: confirmedOrders.length,
        canceledOrders: canceledOrders.length,
        deliveredOrders: deliveredOrders.length,
        totalRevenue,
        goal,
        commissions,
        totalCommission
      };
    }).sort((a, b) => b.deliveredOrders - a.deliveredOrders);
  }, [activeAgents, orders, activeStore.id, currentMonth, dateRange, staffGoals, commissionEntries]);

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.agentName) return;
    
    const goal: StaffGoal = {
      id: `goal_${Date.now()}`,
      storeId: activeStore.id,
      ...newGoal,
      createdAt: new Date().toISOString()
    };
    
    // Remove existing goal for same agent/month
    setStaffGoals(prev => [...prev.filter(g => !(g.storeId === activeStore.id && g.agentName === goal.agentName && g.month === goal.month)), goal]);
    addActivityLog({
      storeId: activeStore.id,
      user: sessionUser,
      action: 'Staff Goal Set',
      detail: `Set goal for ${goal.agentName} (${goal.month}): Target ${goal.targetOrders} orders, ${goal.targetRevenue} revenue`
    });
    setNewGoal({ agentName: '', targetOrders: 100, targetRevenue: 5000, month: currentMonth });
  };

  const handleAddCommission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommission.agentName || newCommission.amount <= 0) return;
    
    const entry: CommissionEntry = {
      id: `comm_${Date.now()}`,
      storeId: activeStore.id,
      date: new Date().toISOString(),
      ...newCommission
    };
    
    setCommissionEntries(prev => [entry, ...prev]);
    addActivityLog({
      storeId: activeStore.id,
      user: sessionUser,
      action: 'Staff Commission Added',
      detail: `Added ${entry.type} entry for ${entry.agentName}: ${entry.amount} (${entry.reason})`
    });
    setNewCommission({ agentName: '', amount: 0, reason: '', type: 'BONUS' });
  };

  const handleDeleteCommission = (id: string) => {
    const entry = commissionEntries.find(c => c.id === id);
    if (confirm('Delete this commission entry?')) {
      setCommissionEntries(prev => prev.filter(c => c.id !== id));
      if (entry) {
        addActivityLog({
          storeId: activeStore.id,
          user: sessionUser,
          action: 'Staff Commission Deleted',
          detail: `Deleted ${entry.type} entry of ${entry.amount} for ${entry.agentName}`
        });
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff & Financial</h1>
        <p className="text-slate-500 font-medium">Manage agent performance, goal tracking, and commissions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Performance & Goals & Staff Management */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* STAFF MANAGEMENT */}
          {sessionRole === 'admin' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-6">
                <Users className="text-indigo-600" /> Manage Staff & Permissions
              </h2>
              <div className="space-y-3 mb-6">
                {staffAccounts.map(acc => {
                  if (editingStaffId === acc.id) {
                    return (
                      <form key={acc.id} onSubmit={async (e) => {
                        e.preventDefault();
                        if (editStaffName && editStaffPin.length >= 4) {
                          await updateStaffAccount(acc.id, {
                            name: editStaffName,
                            email: editStaffEmail || undefined,
                            role: editStaffRole,
                            pin: editStaffPin,
                            storeIds: editStaffStoreIds,
                            permissions: editStaffPermissions
                          });
                          addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Staff Updated', detail: `Updated staff account ${editStaffName} (${editStaffRole})` });
                          setEditingStaffId(null);
                        } else {
                          alert('PIN must be at least 4 digits');
                        }
                      }} className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-xl space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-indigo-100">
                          <div className="font-bold text-indigo-900">Edit Staff Account</div>
                          <button type="button" onClick={() => setEditingStaffId(null)} className="text-slate-400 hover:text-slate-600">
                            <X size={18} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
                            <input type="text" value={editStaffName} onChange={e => setEditStaffName(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold bg-white" placeholder="Agent Name" />
                          </div>
                          <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Role</label>
                            <select value={editStaffRole} onChange={e => setEditStaffRole(e.target.value as any)} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold bg-white">
                              <option value="fulfillment">Fulfillment Agent</option>
                              <option value="confirmation">Confirmation Agent</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <div className="flex-1 min-w-[150px]">
                            <label className="block text-xs font-bold text-slate-500 mb-1">PIN / Password</label>
                            <input type="text" value={editStaffPin} onChange={e => setEditStaffPin(e.target.value)} required minLength={4} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold bg-white" placeholder="e.g. 1234" />
                          </div>
                        </div>

                        <div className="w-full border-t border-indigo-100 pt-3 mt-1">
                          <label className="block text-xs font-bold text-indigo-900 mb-2 flex items-center gap-1"><Shield size={14}/> Granular Permissions</label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                              <input type="checkbox" checked={editStaffPermissions.canExport} onChange={e => setEditStaffPermissions({...editStaffPermissions, canExport: e.target.checked})} className="accent-indigo-600 w-4 h-4" />
                              Export Data
                            </label>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                              <input type="checkbox" checked={editStaffPermissions.canEditTotals} onChange={e => setEditStaffPermissions({...editStaffPermissions, canEditTotals: e.target.checked})} className="accent-indigo-600 w-4 h-4" />
                              Edit Totals
                            </label>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                              <input type="checkbox" checked={editStaffPermissions.canDeleteNotes} onChange={e => setEditStaffPermissions({...editStaffPermissions, canDeleteNotes: e.target.checked})} className="accent-indigo-600 w-4 h-4" />
                              Delete Notes
                            </label>
                            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                              <input type="checkbox" checked={editStaffPermissions.canAssignOrders} onChange={e => setEditStaffPermissions({...editStaffPermissions, canAssignOrders: e.target.checked})} className="accent-indigo-600 w-4 h-4" />
                              Assign Orders
                            </label>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button type="button" onClick={() => setEditingStaffId(null)} className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            Cancel
                          </button>
                          <button type="submit" className="px-4 py-2 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                            Save Changes
                          </button>
                        </div>
                      </form>
                    );
                  }

                  const onlineStaffIds = activeStore?.translations?.onlineStaffIds || [];
                  const isOnline = onlineStaffIds.includes(acc.id);

                  return (
                    <div key={acc.id} className="flex justify-between items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
                      <div>
                        <div className="font-bold text-slate-900">{acc.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-200/70 px-1.5 py-0.5 rounded font-bold">{acc.role}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={async () => {
                            // toggle logic could be simplified to call updateStaffAccount(acc.id, { isOnline: !acc.isOnline }) 
                            // wait, we update activeStore.translations.staffStatus in the store. 
                            await updateStaffAccount(acc.id, { isOnline: !(acc.isOnline) });
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
                            acc.isOnline
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70'
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200/70'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${acc.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                          {acc.isOnline ? 'ONLINE' : 'OFFLINE'}
                        </button>

                        <div className="flex items-center gap-1">
                          <button 
                            type="button" 
                            onClick={() => {
                              setEditingStaffId(acc.id);
                              setEditStaffName(acc.name);
                              setEditStaffEmail(acc.email || '');
                              setEditStaffRole(acc.role);
                              setEditStaffPin(acc.pin || '');
                              setEditStaffStoreIds(acc.storeIds || []);
                              setEditStaffPermissions(acc.permissions || { canExport: true, canEditTotals: true, canDeleteNotes: true, canAssignOrders: true });
                            }}
                            className="p-2 text-slate-500 hover:bg-slate-200/60 rounded-lg transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => {
                              deleteStaffAccount(acc.id);
                              addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Staff Deleted', detail: `Deleted staff account ${acc.name}` });
                            }}
                            className="p-2 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                            disabled={acc.role === 'admin' && staffAccounts.filter(a => a.role === 'admin').length === 1}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (newStaffName && newStaffPin.length >= 4) {
                  await addStaffAccount({ 
                    name: newStaffName,
                    role: newStaffRole, 
                    pin: newStaffPin,
                    storeIds: newStaffStoreIds,
                    permissions: newStaffPermissions
                  });
                  addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Staff Created', detail: `Created staff account ${newStaffName}` });
                  setNewStaffName('');
                  setNewStaffPin('');
                  setNewStaffStoreIds([]);
                  setNewStaffPermissions({ canExport: true, canEditTotals: false, canDeleteNotes: false, canAssignOrders: false });
                }
              }} className="flex flex-col gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
                    <input type="text" value={newStaffName} onChange={e => setNewStaffName(e.target.value)} required className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="Agent Name" />
                  </div>
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-xs font-bold text-slate-500 mb-1">Role</label>
                    <select value={newStaffRole} onChange={e => setNewStaffRole(e.target.value as any)} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold bg-white">
                      <option value="fulfillment">Fulfillment Agent</option>
                      <option value="confirmation">Confirmation Agent</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex-1 min-w-[100px]">
                    <label className="block text-xs font-bold text-slate-500 mb-1">PIN (Login)</label>
                    <input type="password" value={newStaffPin} onChange={e => setNewStaffPin(e.target.value)} required minLength={4} className="w-full p-2 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900 font-bold" placeholder="4+ digits" />
                  </div>
                  <button type="submit" className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 text-sm h-[42px] min-w-[120px] justify-center">
                    <Plus size={16} /> Add Staff
                  </button>
                </div>
                <div className="w-full border-t border-slate-200 pt-3">
                  <label className="block text-xs font-bold text-slate-500 mb-2 flex items-center gap-1"><Shield size={14}/> Granular Permissions</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                      <input type="checkbox" checked={newStaffPermissions.canExport} onChange={e => setNewStaffPermissions({...newStaffPermissions, canExport: e.target.checked})} className="accent-indigo-600 w-4 h-4" />
                      Export Data
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                      <input type="checkbox" checked={newStaffPermissions.canEditTotals} onChange={e => setNewStaffPermissions({...newStaffPermissions, canEditTotals: e.target.checked})} className="accent-indigo-600 w-4 h-4" />
                      Edit Totals
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                      <input type="checkbox" checked={newStaffPermissions.canDeleteNotes} onChange={e => setNewStaffPermissions({...newStaffPermissions, canDeleteNotes: e.target.checked})} className="accent-indigo-600 w-4 h-4" />
                      Delete Notes
                    </label>
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 bg-white p-2 rounded-lg border border-slate-200">
                      <input type="checkbox" checked={newStaffPermissions.canAssignOrders} onChange={e => setNewStaffPermissions({...newStaffPermissions, canAssignOrders: e.target.checked})} className="accent-indigo-600 w-4 h-4" />
                      Assign Orders
                    </label>
                  </div>
                </div>
              </form>
            </div>
          )}
          
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-black text-lg text-slate-800 flex items-center gap-2">
                <Target className="text-indigo-500" size={20}/> 
                Performance Tracker 
                <span className="text-slate-400 text-sm font-medium">({dateRange === 'month' ? currentMonth : dateRange})</span>
              </h2>
              <div className="flex bg-white rounded-lg p-0.5 border border-slate-200 shadow-sm">
                <button onClick={() => setDateRange('month')} className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-colors ${dateRange === 'month' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}>Month</button>
                <button onClick={() => setDateRange('7d')} className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-colors ${dateRange === '7d' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}>7d</button>
                <button onClick={() => setDateRange('30d')} className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-colors ${dateRange === '30d' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}>30d</button>
                <button onClick={() => setDateRange('90d')} className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition-colors ${dateRange === '90d' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}>90d</button>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {staffPerformance.length === 0 && (
                <div className="p-8 text-center text-slate-500">No agent data for this month. Agents must claim orders.</div>
              )}
              {staffPerformance.map(staff => {
                const orderProgress = staff.goal ? Math.min(100, Math.round((staff.deliveredOrders / staff.goal.targetOrders) * 100)) : 0;
                const revenueProgress = staff.goal ? Math.min(100, Math.round((staff.totalRevenue / staff.goal.targetRevenue) * 100)) : 0;
                
                return (
                  <div key={staff.agent} className="p-6 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center font-black text-xl">
                          {staff.agent[0].toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-black text-slate-900 text-lg">{staff.agent}</h3>
                          <div className="text-sm font-medium text-slate-500 mt-1">
                            {staff.ordersProcessed} handled <span className="mx-1">•</span> 
                            <span className="text-emerald-600 font-bold">{staff.confirmedOrders} confirmed</span> <span className="mx-1">•</span> 
                            <span className="text-rose-500 font-bold">{staff.canceledOrders} canceled</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-emerald-600">{staff.totalCommission.toLocaleString()} {activeStore.currency}</div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Earned Commissions</div>
                      </div>
                    </div>

                    {staff.goal ? (
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-bold text-slate-700">Delivered Orders</span>
                            <span className="font-black text-indigo-600">{staff.deliveredOrders} / {staff.goal.targetOrders}</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${orderProgress}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1.5">
                            <span className="font-bold text-slate-700">Revenue Generated</span>
                            <span className="font-black text-emerald-600">{staff.totalRevenue.toLocaleString()} / {staff.goal.targetRevenue.toLocaleString()}</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${revenueProgress}%` }} />
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium p-3 rounded-xl">
                        No goals set for {currentMonth}. Set goals to track progress.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Col: Forms & Commission History */}
        <div className="space-y-6">
          
          {/* Set Goal Form */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2"><Target size={18} className="text-indigo-500"/> Set Monthly Goal</h3>
            <form onSubmit={handleAddGoal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Agent</label>
                <select 
                  required
                  value={newGoal.agentName}
                  onChange={e => setNewGoal({...newGoal, agentName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium"
                >
                  <option value="">Select Agent...</option>
                  {activeAgents.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Target Orders</label>
                  <input 
                    type="number" required min="1"
                    value={newGoal.targetOrders}
                    onChange={e => setNewGoal({...newGoal, targetOrders: Number(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Target Revenue</label>
                  <input 
                    type="number" required min="1"
                    value={newGoal.targetRevenue}
                    onChange={e => setNewGoal({...newGoal, targetRevenue: Number(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium"
                  />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 text-white font-bold py-2.5 rounded-xl hover:bg-slate-800 transition-colors">
                Save Goal
              </button>
            </form>
          </div>

          {/* Add Commission Form */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <h3 className="font-black text-slate-900 mb-4 flex items-center gap-2"><DollarSign size={18} className="text-emerald-500"/> Add Commission / Bonus</h3>
            <form onSubmit={handleAddCommission} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Agent</label>
                <select 
                  required
                  value={newCommission.agentName}
                  onChange={e => setNewCommission({...newCommission, agentName: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium"
                >
                  <option value="">Select Agent...</option>
                  {activeAgents.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Amount</label>
                  <input 
                    type="number" required min="0.01" step="0.01"
                    value={newCommission.amount || ''}
                    onChange={e => setNewCommission({...newCommission, amount: Number(e.target.value)})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Type</label>
                  <select 
                    value={newCommission.type}
                    onChange={e => setNewCommission({...newCommission, type: e.target.value as any})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium"
                  >
                    <option value="COMMISSION">Commission</option>
                    <option value="BONUS">Bonus</option>
                    <option value="PENALTY">Penalty</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Reason</label>
                <input 
                  type="text" required placeholder="e.g. Hit target, Order #123"
                  value={newCommission.reason}
                  onChange={e => setNewCommission({...newCommission, reason: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium"
                />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-2.5 rounded-xl hover:bg-emerald-700 transition-colors">
                Record Entry
              </button>
            </form>
          </div>

          {/* Recent Commissions */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden text-white">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="font-black text-lg flex items-center gap-2">
                <Award className="text-emerald-400" size={20} /> Recent Entries
              </h2>
            </div>
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {commissionEntries.filter(c => c.storeId === activeStore.id).slice(0, 10).map((c, idx) => (
                <div key={c.id || `commission_${idx}`} className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        {c.agentName}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-black tracking-wide ${c.type === 'BONUS' ? 'bg-amber-500/20 text-amber-300' : c.type === 'PENALTY' ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                          {c.type}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{c.reason}</div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className={`font-black ${c.type === 'PENALTY' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {c.type === 'PENALTY' ? '-' : '+'}{c.amount}
                      </span>
                      <button onClick={() => handleDeleteCommission(c.id)} className="text-slate-500 hover:text-rose-400 mt-1 transition-colors">
                        <Trash2 size={14}/>
                      </button>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1 mt-3">
                    <Clock size={10} /> {new Date(c.date).toLocaleString()}
                  </div>
                </div>
              ))}
              {commissionEntries.filter(c => c.storeId === activeStore.id).length === 0 && (
                <div className="text-center text-slate-500 py-6 text-sm">No recent commission entries.</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
