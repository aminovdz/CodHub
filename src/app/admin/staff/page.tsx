'use client';

import { useState, useMemo } from 'react';
import { useAdminStore, StaffGoal, CommissionEntry } from '@/lib/store/useAdminStore';
import { Target, DollarSign, Award, Plus, Trash2, CheckCircle, Clock } from 'lucide-react';

export default function AdminStaffPage() {
  const { activeStore, orders, callLogs, staffGoals, setStaffGoals, commissionEntries, setCommissionEntries, staffAccounts } = useAdminStore();
  
  const [newGoal, setNewGoal] = useState({ agentName: '', targetOrders: 100, targetRevenue: 5000, month: new Date().toISOString().slice(0, 7) });
  const [newCommission, setNewCommission] = useState({ agentName: '', amount: 0, reason: '', type: 'BONUS' as const });

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
    return activeAgents.map(agent => {
      // Find orders claimed by this agent
      const agentOrders = orders.filter(o => o.storeId === activeStore.id && o.claimedBy === agent && o.date.startsWith(currentMonth));
      const confirmedOrders = agentOrders.filter(o => o.status === 'CONFIRMED' || o.status === 'SHIPPED' || o.status === 'DELIVERED');
      const deliveredOrders = agentOrders.filter(o => o.status === 'DELIVERED');
      
      const totalRevenue = deliveredOrders.reduce((s, o) => s + (o.total || 0), 0);
      
      // Get agent's goal for this month
      const goal = staffGoals.find(g => g.storeId === activeStore.id && g.agentName === agent && g.month === currentMonth);
      
      // Calculate total commission for this month
      const commissions = commissionEntries.filter(c => c.storeId === activeStore.id && c.agentName === agent && c.date.startsWith(currentMonth));
      const totalCommission = commissions.reduce((s, c) => s + c.amount, 0);

      return {
        agent,
        ordersProcessed: agentOrders.length,
        confirmedOrders: confirmedOrders.length,
        deliveredOrders: deliveredOrders.length,
        totalRevenue,
        goal,
        commissions,
        totalCommission
      };
    }).sort((a, b) => b.deliveredOrders - a.deliveredOrders);
  }, [activeAgents, orders, activeStore.id, currentMonth, staffGoals, commissionEntries]);

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
    setNewCommission({ agentName: '', amount: 0, reason: '', type: 'BONUS' });
  };

  const handleDeleteCommission = (id: string) => {
    if (confirm('Delete this commission entry?')) {
      setCommissionEntries(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Staff & Financial</h1>
        <p className="text-slate-500 font-medium">Manage agent performance, goal tracking, and commissions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Performance & Goals */}
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-black text-lg text-slate-800 flex items-center gap-2"><Target className="text-indigo-500" size={20}/> Performance Tracker ({currentMonth})</h2>
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
                          <div className="text-sm font-medium text-slate-500">{staff.ordersProcessed} orders handled</div>
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
              {commissionEntries.filter(c => c.storeId === activeStore.id).slice(0, 10).map(c => (
                <div key={c.id} className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
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
