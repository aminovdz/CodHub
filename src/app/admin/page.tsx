'use client';

import { useAdminStore } from '@/lib/store/useAdminStore';
import { TrendingUp, ShoppingCart, DollarSign, Package, AlertCircle, RefreshCw, PhoneCall, Truck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function AdminDashboard() {
  const { activeStore, orders, products, staffGoals, commissionEntries } = useAdminStore();

  const [role, setRole] = useState<'admin' | 'fulfillment' | 'confirmation'>('admin');
  const [staffName, setStaffName] = useState('Admin');
  const [chiefOfStaffBrief, setChiefOfStaffBrief] = useState<string | null>(null);
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);

  useEffect(() => {
    try {
      const auth = JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}');
      if (auth.role) setRole(auth.role);
      if (auth.name) setStaffName(auth.name);
    } catch {
      // fallback
      const r = sessionStorage.getItem('adminRole') as any;
      const n = sessionStorage.getItem('adminName');
      if (r) setRole(r);
      if (n) setStaffName(n);
    }
  }, []);

  const storeOrders = orders.filter(o => o.storeId === activeStore.id);
  const storeProducts = products.filter(p => p.storeId === activeStore.id);

  const totalRevenue = storeOrders.filter(o => o.status === 'DELIVERED').reduce((acc, o) => acc + o.total, 0);
  const pendingOrders = storeOrders.filter(o => o.status === 'PENDING_AGENT_CONFIRMATION').length;
  const confirmedOrders = storeOrders.filter(o => o.status === 'CONFIRMED').length;
  const shippedOrders = storeOrders.filter(o => o.status === 'SHIPPED').length;
  const activeProducts = storeProducts.filter(p => p.active).length;

  // Personal Staff Goal & Commission metrics
  const currentMonth = new Date().toISOString().slice(0, 7);
  const myGoal = staffGoals.find(g => g.storeId === activeStore.id && g.agentName === staffName && g.month === currentMonth);
  const myCommissions = commissionEntries.filter(c => c.storeId === activeStore.id && c.agentName === staffName && c.date.startsWith(currentMonth));
  const myTotalCommission = myCommissions.reduce((s, c) => s + c.amount, 0);

  const myOrders = storeOrders.filter(o => o.claimedBy === staffName && o.date.startsWith(currentMonth));
  const myDeliveredOrders = myOrders.filter(o => o.status === 'DELIVERED').length;
  const myRevenue = myDeliveredOrders > 0 ? myOrders.filter(o => o.status === 'DELIVERED').reduce((s, o) => s + (o.total || 0), 0) : 0;

  const orderProgress = myGoal ? Math.min(100, Math.round((myDeliveredOrders / myGoal.targetOrders) * 100)) : 0;
  const revenueProgress = myGoal ? Math.min(100, Math.round((myRevenue / myGoal.targetRevenue) * 100)) : 0;

  const statCards = [
    {
      label: 'Total Revenue',
      value: `${totalRevenue.toLocaleString()} ${activeStore.currency}`,
      icon: <DollarSign size={22} />,
      iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500',
      badge: '+12%',
    },
    {
      label: 'Total Orders',
      value: storeOrders.length.toString(),
      icon: <ShoppingCart size={22} />,
      iconBg: 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-500',
      badge: '+5%',
    },
    {
      label: 'Pending Confirmation',
      value: pendingOrders.toString(),
      icon: <AlertCircle size={22} />,
      iconBg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-500',
      badge: null,
    },
    {
      label: 'Active Products',
      value: activeProducts.toString(),
      icon: <Package size={22} />,
      iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-500',
      badge: null,
    },
  ];

  const generateBrief = async () => {
    setIsGeneratingBrief(true);
    try {
      const { aiService } = await import('@/lib/services/aiService');
      const storeData = {
        totalOrders: storeOrders.length,
        pendingOrders,
        confirmedOrders,
        shippedOrders,
        revenue: totalRevenue,
      };
      const html = await aiService.generateChiefOfStaffBrief(storeData);
      if (html) setChiefOfStaffBrief(html);
    } catch (e) {
      console.error(e);
      alert("Failed to generate brief");
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Welcome, {staffName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
            {role === 'admin' && `Overview of ${activeStore.name} performance.`}
            {role === 'confirmation' && `Here are your calls for ${activeStore.name} today.`}
            {role === 'fulfillment' && `Here is the fulfillment queue for ${activeStore.name}.`}
          </p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => window.location.reload()}
            className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 p-2.5 rounded-xl transition-all shadow-sm"
            title="Refresh Data"
          >
            <RefreshCw size={18} />
          </button>
          <span className="px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-bold text-sm border border-emerald-200 dark:border-emerald-900">
            ● Operational
          </span>
        </div>
      </div>

      {/* AI Chief of Staff Widget */}
      {role === 'admin' && (
        <div className="bg-gradient-to-r from-indigo-900 to-slate-900 p-1 rounded-3xl shadow-lg">
          <div className="bg-white dark:bg-slate-900 rounded-[22px] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">AI Chief of Staff</h2>
                  <p className="text-xs text-slate-500 font-bold">Daily Operations Brief</p>
                </div>
              </div>
              <button 
                onClick={generateBrief} 
                disabled={isGeneratingBrief}
                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {isGeneratingBrief ? 'Analyzing store data...' : 'Generate Brief'}
              </button>
            </div>
            {chiefOfStaffBrief && (
              <div 
                className="prose prose-sm max-w-none text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800 pt-4"
                dangerouslySetInnerHTML={{ __html: chiefOfStaffBrief }}
              />
            )}
            {!chiefOfStaffBrief && !isGeneratingBrief && (
              <div className="text-sm text-slate-500 border-t border-slate-100 dark:border-slate-800 pt-4">
                Click "Generate Brief" to get your automated daily operational summary based on live metrics.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Staff Personal Dashboard Widget */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-3xl border border-indigo-500/20 shadow-xl text-white space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4 border-b border-indigo-500/20 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center font-black text-2xl text-indigo-400">
              {staffName[0]?.toUpperCase() || 'S'}
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight">{staffName}'s Dashboard</h2>
              <p className="text-xs text-indigo-300/80 font-bold tracking-wider uppercase mt-1">Goal & Commission Tracking ({currentMonth})</p>
            </div>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 px-6 py-4 rounded-2xl text-right">
            <div className="text-3xl font-black text-emerald-400">{myTotalCommission.toLocaleString()} {activeStore.currency}</div>
            <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider mt-0.5">Total Commission Earned</div>
          </div>
        </div>

        {myGoal ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-xs">Delivered Orders Goal</span>
                <span className="font-black text-white text-base">{myDeliveredOrders} / {myGoal.targetOrders}</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-lg shadow-indigo-500/50" style={{ width: `${orderProgress}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">{orderProgress}% of monthly order target achieved</p>
            </div>

            <div className="bg-white/5 border border-white/10 p-6 rounded-2xl space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-xs">Revenue Goal</span>
                <span className="font-black text-white text-base">{myRevenue.toLocaleString()} / {myGoal.targetRevenue.toLocaleString()} {activeStore.currency}</span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-lg shadow-indigo-500/50" style={{ width: `${revenueProgress}%` }} />
              </div>
              <p className="text-[11px] text-slate-400 font-medium">{revenueProgress}% of monthly revenue target achieved</p>
            </div>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 p-6 rounded-2xl text-center text-indigo-300/80 font-medium text-sm">
            No specific goal set for {staffName} this month. Contact an administrator to set up targets in the Staff & Financial tab.
          </div>
        )}

        {myCommissions.length > 0 && (
          <div className="pt-4 border-t border-indigo-500/20 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-300">Commission Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-40 overflow-y-auto pr-2">
              {myCommissions.map(c => (
                <div key={c.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm text-white">{c.reason || 'Bonus'}</div>
                    <div className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">{c.type}</div>
                  </div>
                  <div className="font-black text-emerald-400 text-base">+{c.amount} {activeStore.currency}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {role === 'admin' && statCards.map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md dark:hover:shadow-slate-900/50 transition-all flex flex-col justify-between"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-2xl ${card.iconBg}`}>
                {card.icon}
              </div>
              {card.badge && (
                <span className="text-emerald-500 font-bold text-sm flex items-center gap-1">
                  <TrendingUp size={14} /> {card.badge}
                </span>
              )}
            </div>
            <div>
              <div className="text-slate-500 dark:text-slate-400 font-bold text-xs mb-1 uppercase tracking-wider">
                {card.label}
              </div>
              <div className="text-2xl font-black text-slate-900 dark:text-white">
                {card.value}
              </div>
            </div>
          </div>
        ))}
        {role === 'confirmation' && (
          <>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 self-start mb-4"><AlertCircle size={22}/></div>
              <div><div className="text-slate-500 text-xs mb-1 uppercase font-bold">Needs Calling</div><div className="text-2xl font-black">{pendingOrders}</div></div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 self-start mb-4"><PhoneCall size={22}/></div>
              <div><div className="text-slate-500 text-xs mb-1 uppercase font-bold">Confirmed Today</div><div className="text-2xl font-black">{confirmedOrders}</div></div>
            </div>
          </>
        )}
        {role === 'fulfillment' && (
          <>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500 self-start mb-4"><Package size={22}/></div>
              <div><div className="text-slate-500 text-xs mb-1 uppercase font-bold">Ready to Ship (Confirmed)</div><div className="text-2xl font-black">{confirmedOrders}</div></div>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 self-start mb-4"><Truck size={22}/></div>
              <div><div className="text-slate-500 text-xs mb-1 uppercase font-bold">Currently Shipped</div><div className="text-2xl font-black">{shippedOrders}</div></div>
            </div>
          </>
        )}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">
              {role === 'confirmation' ? 'Queue to Call' : role === 'fulfillment' ? 'Queue to Ship' : 'Recent Orders'}
            </h2>
            <Link href="/admin/orders" className="text-indigo-500 font-bold text-sm hover:underline">
              View Queue →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700">
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="text-sm font-medium">
                {storeOrders
                  .filter(o => {
                    if (role === 'confirmation') return o.status === 'PENDING_AGENT_CONFIRMATION' || o.status === 'NO_ANSWER';
                    if (role === 'fulfillment') return o.status === 'CONFIRMED' || o.status === 'PREPARED';
                    return true;
                  })
                  .slice(0, 6)
                  .map(order => (
                  <tr key={order.id} className="border-b border-slate-50 dark:border-slate-700/50 last:border-0 hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="py-3.5 text-indigo-500 font-bold font-mono text-xs">{order.id.slice(0, 12)}...</td>
                    <td className="py-3.5 text-slate-900 dark:text-white font-semibold">{order.customer}</td>
                    <td className="py-3.5">
                      <span className={`px-2 py-1 rounded-lg text-[10px] uppercase font-black tracking-wide ${
                        order.status === 'DELIVERED' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' :
                        order.status === 'RTO' || order.status === 'CANCELED' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' :
                        order.status === 'CONFIRMED' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' :
                        'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      }`}>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 text-right text-slate-900 dark:text-white font-bold">{order.total} {activeStore.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stats Panel */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">Store Snapshot</h2>
          <div className="space-y-5">
            {[
              { label: 'Confirmed orders', value: confirmedOrders, color: 'bg-indigo-600', pct: storeOrders.length > 0 ? Math.round((confirmedOrders / storeOrders.length) * 100) : 0 },
              { label: 'Pending confirmation', value: pendingOrders, color: 'bg-amber-500', pct: storeOrders.length > 0 ? Math.round((pendingOrders / storeOrders.length) * 100) : 0 },
              { label: 'Delivered', value: storeOrders.filter(o => o.status === 'DELIVERED').length, color: 'bg-emerald-500', pct: storeOrders.length > 0 ? Math.round((storeOrders.filter(o => o.status === 'DELIVERED').length / storeOrders.length) * 100) : 0 },
              { label: 'RTO / Canceled', value: storeOrders.filter(o => o.status === 'RTO' || o.status === 'CANCELED').length, color: 'bg-rose-500', pct: storeOrders.length > 0 ? Math.round((storeOrders.filter(o => o.status === 'RTO' || o.status === 'CANCELED').length / storeOrders.length) * 100) : 0 },
            ].map(row => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-600 dark:text-slate-400 font-semibold text-sm">{row.label}</span>
                  <span className="text-slate-900 dark:text-white font-black text-sm">{row.value} <span className="text-slate-400 font-normal">({row.pct}%)</span></span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                  <div className={`${row.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
