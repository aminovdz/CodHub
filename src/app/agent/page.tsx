'use client';

import { useState } from 'react';
import { Phone, CheckCircle2, ShieldAlert, Clock, RefreshCw, XCircle, TrendingUp, DollarSign, Activity } from 'lucide-react';

export default function AgentDashboard() {
  const [orders, setOrders] = useState([
    { id: 'ORD-001', phone: '+213 55 123 4567', name: 'Karim', total: 4900, status: 'PENDING', score: 30, region: 'dz' },
    { id: 'ORD-002', phone: '+213 55 999 8888', name: 'Amin', total: 8300, status: 'HIGH_RISK', score: 85, region: 'dz' }
  ]);

  // Mock KPI Data
  const kpis = {
    earnedToday: 4500, // DZD
    pendingPayout: 12500, // DZD
    successRate: 78 // %
  };

  const updateOrderStatus = (id: string, newStatus: string) => {
    // Integration point: Call Server Action to update order status, triggering DB audit trails and commission state
    setOrders(orders.filter(o => o.id !== id));
    alert(`Order ${id} marked as ${newStatus}.`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* KPI BANNER (MY EARNINGS) */}
      <div className="bg-indigo-950 text-white pt-10 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-end mb-8">
            <div>
              <h1 className="text-3xl font-black text-white">Algeria Operations Hub</h1>
              <p className="text-indigo-300 font-medium mt-1 tracking-wide text-sm">Welcome back. Let's maximize today's conversions.</p>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/10 font-bold text-sm flex items-center gap-2">
              <Activity size={16} className="text-emerald-400" /> System Online
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 translate-y-10">
            {/* KPI Cards */}
            <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100 text-slate-900">
              <div className="flex items-center gap-3 text-emerald-600 font-bold text-sm uppercase tracking-wider mb-2">
                <DollarSign size={18} /> Total Earned Today
              </div>
              <div className="text-4xl font-black">{kpis.earnedToday} <span className="text-xl text-slate-400 font-bold">DZD</span></div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-xl border border-slate-100 text-slate-900">
              <div className="flex items-center gap-3 text-indigo-600 font-bold text-sm uppercase tracking-wider mb-2">
                <TrendingUp size={18} /> Success Rate
              </div>
              <div className="text-4xl font-black">{kpis.successRate}<span className="text-xl text-slate-400 font-bold">%</span></div>
              <div className="text-xs text-slate-400 mt-2 font-medium">(Delivered / Confirmed)</div>
            </div>

            <div className="bg-indigo-600 rounded-2xl p-6 shadow-xl border border-indigo-500 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-20"><DollarSign size={64} /></div>
              <div className="flex items-center gap-3 text-indigo-100 font-bold text-sm uppercase tracking-wider mb-2 relative z-10">
                <Clock size={18} /> Pending Payout
              </div>
              <div className="text-4xl font-black relative z-10">{kpis.pendingPayout} <span className="text-xl text-indigo-200 font-bold">DZD</span></div>
              <div className="text-xs text-indigo-200 mt-2 font-medium relative z-10">Awaiting 3PL delivery confirmation</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-16 pt-8">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-slate-900">Pending Orders Queue</h2>
          <div className="bg-slate-200 text-slate-700 px-3 py-1 rounded-full font-bold text-sm">
            {orders.length} Remaining
          </div>
        </div>

        {/* Order List */}
        <div className="grid gap-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all hover:border-indigo-300">
              
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${order.status === 'HIGH_RISK' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'}`}>
                  {order.status === 'HIGH_RISK' ? <ShieldAlert size={24} /> : <Phone size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-black text-slate-900">{order.name}</h3>
                    <span className="text-xs font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase border border-slate-200">{order.id}</span>
                  </div>
                  <div className="text-slate-500 font-medium flex items-center gap-3 mt-1 text-sm">
                    <a href={`tel:${order.phone}`} className="text-indigo-600 hover:underline">{order.phone}</a>
                    <span className="text-slate-300">•</span>
                    <span className="font-bold text-slate-700">Total: {order.total} DZD</span>
                  </div>
                  {order.status === 'HIGH_RISK' && (
                    <div className="mt-3 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100 inline-block">
                      ADMIN APPROVAL NEEDED (Fraud Score: {order.score})
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full lg:w-auto mt-4 lg:mt-0">
                <button 
                  onClick={() => updateOrderStatus(order.id, 'NO_ANSWER')}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw size={16} /> Busy / NA
                </button>
                <button 
                  onClick={() => updateOrderStatus(order.id, 'CANCELED')}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle size={16} /> Canceled
                </button>
                <button 
                  onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                  disabled={order.status === 'HIGH_RISK'}
                  className="col-span-2 md:col-span-2 px-6 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-[0_4px_14px_rgba(16,185,129,0.3)]"
                >
                  <CheckCircle2 size={18} />
                  Confirm Order
                </button>
              </div>

            </div>
          ))}

          {orders.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <CheckCircle2 size={48} className="mx-auto text-emerald-400 mb-4" />
              <h3 className="text-xl font-black text-slate-700">Queue is empty!</h3>
              <p className="text-slate-500 mt-2 font-medium">All pending orders have been processed.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
