'use client';

import { useState, useMemo } from 'react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { TrendingUp, Package, MapPin, Users, BarChart2, DollarSign, Filter, Download } from 'lucide-react';

type Tab = 'revenue' | 'products' | 'wilaya' | 'staff' | 'financial' | 'funnel';

export default function AdminAnalyticsPage() {
  const { activeStore, orders, callLogs } = useAdminStore();
  const [tab, setTab] = useState<Tab>('revenue');
  const [rangeDays, setRangeDays] = useState(30);

  const storeOrders = useMemo(() => orders.filter(o => o.storeId === activeStore.id), [orders, activeStore.id]);

  const cutoff = useMemo(() => {
    const d = new Date(); d.setDate(d.getDate() - rangeDays);
    return d.toISOString().split('T')[0];
  }, [rangeDays]);

  const rangeOrders = useMemo(() => storeOrders.filter(o => o.date >= cutoff), [storeOrders, cutoff]);

  const totalRevenue = rangeOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalOrders = rangeOrders.length;
  const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const deliveredCount = rangeOrders.filter(o => o.status === 'DELIVERED').length;
  const canceledCount = rangeOrders.filter(o => o.status === 'CANCELED' || o.status === 'RTO').length;
  const deliveryRate = totalOrders > 0 ? Math.round((deliveredCount / totalOrders) * 100) : 0;
  const returnRate = totalOrders > 0 ? Math.round((canceledCount / totalOrders) * 100) : 0;

  const dailyData = useMemo(() => {
    const map: Record<string, number> = {};
    const days = Math.min(rangeDays, 30);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      map[d.toISOString().split('T')[0]] = 0;
    }
    rangeOrders.forEach(o => { if (map[o.date] !== undefined) map[o.date] += o.total || 0; });
    return Object.entries(map).map(([date, revenue]) => ({ date, revenue }));
  }, [rangeOrders, rangeDays]);

  const maxRevenue = Math.max(...dailyData.map(d => d.revenue), 1);

  const productPerf = useMemo(() => {
    const map: Record<string, { orders: number; revenue: number; canceled: number }> = {};
    rangeOrders.forEach(o => {
      const key = o.product || 'Unknown';
      if (!map[key]) map[key] = { orders: 0, revenue: 0, canceled: 0 };
      map[key].orders++;
      map[key].revenue += o.total || 0;
      if (o.status === 'CANCELED' || o.status === 'RTO') map[key].canceled++;
    });
    return Object.entries(map).map(([name, v]) => ({ 
      name, 
      ...v,
      rtoRate: v.orders > 0 ? Math.round((v.canceled / v.orders) * 100) : 0
    })).sort((a, b) => b.revenue - a.revenue);
  }, [rangeOrders]);

  const wilayaData = useMemo(() => {
    const map: Record<string, { orders: number; revenue: number; canceled: number }> = {};
    rangeOrders.forEach(o => {
      const w = o.wilaya || 'Unknown';
      if (!map[w]) map[w] = { orders: 0, revenue: 0, canceled: 0 };
      map[w].orders++;
      map[w].revenue += o.total || 0;
      if (o.status === 'CANCELED' || o.status === 'RTO') map[w].canceled++;
    });
    return Object.entries(map).map(([wilaya, v]) => ({ 
      wilaya, 
      ...v,
      rtoRate: v.orders > 0 ? Math.round((v.canceled / v.orders) * 100) : 0
    })).sort((a, b) => b.orders - a.orders);
  }, [rangeOrders]);

  const maxWilayaOrders = Math.max(...wilayaData.map(w => w.orders), 1);

  const staffPerf = useMemo(() => {
    const storeLogs = callLogs.filter(c => c.storeId === activeStore.id);
    const agents = Array.from(new Set(storeLogs.map(c => c.agentName)));
    return agents.map(agent => {
      const calls = storeLogs.filter(c => c.agentName === agent);
      const confirmed = calls.filter(c => c.result === 'confirmed').length;
      const answered = calls.filter(c => c.result !== 'no_answer').length;
      return {
        agent, totalCalls: calls.length, confirmed,
        successRate: calls.length > 0 ? Math.round((confirmed / calls.length) * 100) : 0,
        answerRate: calls.length > 0 ? Math.round((answered / calls.length) * 100) : 0,
      };
    }).sort((a, b) => b.confirmed - a.confirmed);
  }, [callLogs, activeStore.id]);

  // Financial Metrics
  const financialData = useMemo(() => {
    let totalCost = 0;
    let totalDeliveryCost = 0;
    let netProfit = 0;

    rangeOrders.forEach(o => {
      if (o.status === 'DELIVERED') {
        const cost = (o.costPrice || 0) * (o.quantity || 1);
        const delCost = o.deliveryRate || 0;
        totalCost += cost;
        totalDeliveryCost += delCost;
        netProfit += (o.total || 0) - cost - delCost;
      }
    });

    return { totalCost, totalDeliveryCost, netProfit };
  }, [rangeOrders]);

  // Funnel & Source Metrics
  const sourceData = useMemo(() => {
    const map: Record<string, { orders: number; revenue: number }> = {};
    rangeOrders.forEach(o => {
      const s = o.source || 'Unknown';
      if (!map[s]) map[s] = { orders: 0, revenue: 0 };
      map[s].orders++;
      map[s].revenue += o.total || 0;
    });
    return Object.entries(map).map(([source, v]) => ({ source, ...v })).sort((a, b) => b.orders - a.orders);
  }, [rangeOrders]);

  const exportRevenueCSV = () => {
    const csv = 'Date,Orders,Revenue\n' + dailyData.map(d => `"${d.date}","${rangeOrders.filter(o => o.date === d.date).length}","${d.revenue}"`).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revenue_${activeStore.region}_${rangeDays}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const TABS = [
    { key: 'revenue' as Tab, label: 'Revenue', icon: <TrendingUp size={15} /> },
    { key: 'financial' as Tab, label: 'Financial', icon: <DollarSign size={15} /> },
    { key: 'funnel' as Tab, label: 'Funnel & Source', icon: <Filter size={15} /> },
    { key: 'products' as Tab, label: 'Products', icon: <Package size={15} /> },
    { key: 'wilaya' as Tab, label: 'Wilaya Heatmap', icon: <MapPin size={15} /> },
    { key: 'staff' as Tab, label: 'Staff', icon: <Users size={15} /> },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Analytics</h1>
        <p className="text-slate-500 font-medium"><span className="font-bold text-indigo-600">{activeStore.name}</span> — Intelligence Dashboard</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1 shadow-sm flex-wrap">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${tab === t.key ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-900'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => setRangeDays(d)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${rangeDays === d ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* REVENUE */}
      {tab === 'revenue' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={exportRevenueCSV} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold shadow-sm transition-colors">
              <Download size={16} /> Export Revenue CSV
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Revenue', value: `${totalRevenue.toLocaleString()} ${activeStore.currency}`, color: 'text-indigo-600' },
              { label: 'Orders', value: totalOrders, color: 'text-slate-900' },
              { label: 'AOV', value: `${aov} ${activeStore.currency}`, color: 'text-slate-900' },
              { label: 'Delivery Rate', value: `${deliveryRate}%`, color: deliveryRate > 60 ? 'text-emerald-600' : 'text-amber-600' },
              { label: 'Return/RTO', value: `${returnRate}%`, color: returnRate > 20 ? 'text-rose-600' : 'text-slate-900' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{kpi.label}</div>
                <div className={`text-xl font-black ${kpi.color}`}>{kpi.value}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <h3 className="font-black text-slate-900 mb-6 flex items-center gap-2"><BarChart2 size={18} className="text-indigo-500" /> Daily Revenue</h3>
            {totalRevenue === 0 ? (
              <div className="h-40 flex items-center justify-center text-slate-400">No data yet. Orders will appear here.</div>
            ) : (
              <div className="flex items-end gap-1 h-40">
                {dailyData.map((d, i) => (
                  <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      title={`${d.date}: ${d.revenue} ${activeStore.currency}`}
                      className="w-full bg-indigo-500 hover:bg-indigo-400 rounded-t transition-all cursor-pointer"
                      style={{ height: `${Math.max(2, (d.revenue / maxRevenue) * 136)}px` }}
                    />
                    {i % Math.ceil(dailyData.length / 8) === 0 && (
                      <div className="text-[9px] text-slate-400 font-bold">{d.date.slice(5)}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRODUCTS */}
      {tab === 'products' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="p-4 font-bold">#</th>
                <th className="p-4 font-bold">Product</th>
                <th className="p-4 font-bold text-right">Orders</th>
                <th className="p-4 font-bold text-right">Revenue</th>
                <th className="p-4 font-bold text-right">RTO Rate</th>
                <th className="p-4 font-bold">Share</th>
              </tr>
            </thead>
            <tbody>
              {productPerf.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">No orders in this period.</td></tr>}
              {productPerf.map((p, i) => (
                <tr key={p.name} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 text-slate-400 font-bold">{i + 1}</td>
                  <td className="p-4 font-bold text-slate-900">{p.name}</td>
                  <td className="p-4 text-right font-bold text-slate-700">{p.orders}</td>
                  <td className="p-4 text-right font-black text-indigo-600">{p.revenue.toLocaleString()} {activeStore.currency}</td>
                  <td className="p-4 text-right font-bold text-rose-500">{p.rtoRate}%</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0}%` }} />
                      </div>
                      <span className="text-xs font-bold text-slate-500 w-10 text-right">{totalRevenue > 0 ? Math.round((p.revenue / totalRevenue) * 100) : 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* WILAYA */}
      {tab === 'wilaya' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="p-4 font-bold">#</th>
                <th className="p-4 font-bold">Wilaya</th>
                <th className="p-4 font-bold text-right">Orders</th>
                <th className="p-4 font-bold text-right">Revenue</th>
                <th className="p-4 font-bold text-right">RTO Rate</th>
                <th className="p-4 font-bold">Heat</th>
              </tr>
            </thead>
            <tbody>
              {wilayaData.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">No location data yet.</td></tr>}
              {wilayaData.map((w, i) => {
                const pct = Math.round((w.orders / maxWilayaOrders) * 100);
                const color = pct > 75 ? 'bg-emerald-500' : pct > 50 ? 'bg-teal-400' : pct > 25 ? 'bg-cyan-400' : 'bg-slate-300';
                return (
                  <tr key={w.wilaya} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4 text-slate-400 font-bold">{i + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${color}`} />
                        <span className="font-bold text-slate-900">{w.wilaya}</span>
                      </div>
                    </td>
                    <td className="p-4 text-right font-black text-slate-900">{w.orders}</td>
                    <td className="p-4 text-right font-bold text-indigo-600">{w.revenue.toLocaleString()} {activeStore.currency}</td>
                    <td className="p-4 text-right font-bold text-rose-500">{w.rtoRate}%</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                          <div className={`${color} h-2.5 rounded-full`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-500 w-8">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FINANCIAL */}
      {tab === 'financial' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Cost of Goods (COGS)</div>
              <div className="text-3xl font-black text-slate-900">{financialData.totalCost.toLocaleString()} <span className="text-lg text-slate-500">{activeStore.currency}</span></div>
              <p className="text-xs text-slate-500 mt-2">Product costs for delivered orders.</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <div className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Total Delivery Costs</div>
              <div className="text-3xl font-black text-slate-900">{financialData.totalDeliveryCost.toLocaleString()} <span className="text-lg text-slate-500">{activeStore.currency}</span></div>
              <p className="text-xs text-slate-500 mt-2">Shipping fees for delivered orders.</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-200 shadow-sm">
              <div className="text-sm font-bold text-emerald-600 uppercase tracking-wider mb-2">Estimated Net Profit</div>
              <div className="text-3xl font-black text-emerald-700">{financialData.netProfit.toLocaleString()} <span className="text-lg text-emerald-600/70">{activeStore.currency}</span></div>
              <p className="text-xs text-emerald-600 mt-2">Revenue minus COGS and Delivery.</p>
            </div>
          </div>
        </div>
      )}

      {/* FUNNEL & SOURCE */}
      {tab === 'funnel' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="font-black text-lg text-slate-900">Traffic Source Attribution</h3>
              <p className="text-sm text-slate-500">Breakdown of orders by marketing channel.</p>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="p-4 font-bold">Source</th>
                  <th className="p-4 font-bold text-right">Orders</th>
                  <th className="p-4 font-bold text-right">Revenue</th>
                  <th className="p-4 font-bold text-right">AOV</th>
                </tr>
              </thead>
              <tbody>
                {sourceData.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No source data available.</td></tr>}
                {sourceData.map(s => (
                  <tr key={s.source} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-4">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wide bg-slate-100 text-slate-700">
                        {s.source}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-900">{s.orders}</td>
                    <td className="p-4 text-right font-black text-indigo-600">{s.revenue.toLocaleString()} {activeStore.currency}</td>
                    <td className="p-4 text-right font-bold text-slate-500">{s.orders > 0 ? Math.round(s.revenue / s.orders).toLocaleString() : 0} {activeStore.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* STAFF */}
      {tab === 'staff' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="p-4 font-bold">Agent</th>
                <th className="p-4 font-bold text-right">Total Calls</th>
                <th className="p-4 font-bold text-right">Confirmed</th>
                <th className="p-4 font-bold text-right">Answer Rate</th>
                <th className="p-4 font-bold text-right">Success Rate</th>
              </tr>
            </thead>
            <tbody>
              {staffPerf.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No call logs yet. Use the Call Log feature on the Orders page.</td></tr>
              )}
              {staffPerf.map(s => (
                <tr key={s.agent} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-700 font-black text-sm rounded-full flex items-center justify-center">{s.agent[0]}</div>
                      <span className="font-bold text-slate-900">{s.agent}</span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-bold text-slate-700">{s.totalCalls}</td>
                  <td className="p-4 text-right font-black text-emerald-600">{s.confirmed}</td>
                  <td className="p-4 text-right font-bold">{s.answerRate}%</td>
                  <td className="p-4 text-right font-black text-lg" style={{ color: s.successRate > 50 ? '#059669' : s.successRate > 25 ? '#d97706' : '#e11d48' }}>
                    {s.successRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
