'use client';

import { useState } from 'react';
import { useAdminStore } from '@/lib/store/useAdminStore';
import { Clock, Filter, Trash2, Activity } from 'lucide-react';

const ACTION_COLORS: Record<string, string> = {
  'Order Created':   'bg-emerald-100 text-emerald-700',
  'Order Updated':   'bg-blue-100 text-blue-700',
  'Order Deleted':   'bg-rose-100 text-rose-700',
  'Call Logged':     'bg-violet-100 text-violet-700',
  'Coupon Saved':    'bg-amber-100 text-amber-700',
  'Product Updated': 'bg-indigo-100 text-indigo-700',
};

export default function AdminActivityPage() {
  const { activeStore, activityLogs, addActivityLog } = useAdminStore();
  const [filterUser, setFilterUser] = useState('ALL');
  const [filterAction, setFilterAction] = useState('ALL');

  const storeLogs = activityLogs.filter(l => l.storeId === activeStore.id);
  const users = Array.from(new Set(storeLogs.map(l => l.user)));
  const actions = Array.from(new Set(storeLogs.map(l => l.action)));

  const filtered = storeLogs
    .filter(l => filterUser === 'ALL' || l.user === filterUser)
    .filter(l => filterAction === 'ALL' || l.action === filterAction);

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Activity Log</h1>
        <p className="text-slate-500 font-medium"><span className="font-bold text-indigo-600">{activeStore.name}</span> — Admin action history</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <Filter size={14} className="text-slate-400" />
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)}
            className="text-sm font-bold text-slate-700 outline-none bg-transparent">
            <option value="ALL">All Users</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
          <Activity size={14} className="text-slate-400" />
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
            className="text-sm font-bold text-slate-700 outline-none bg-transparent">
            <option value="ALL">All Actions</option>
            {actions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="ml-auto text-sm font-bold text-slate-400 flex items-center">
          {filtered.length} entries
        </div>
      </div>

      {/* Log feed */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm">
          <Activity size={40} className="mx-auto mb-4 text-slate-300" />
          <p className="font-bold text-slate-500">No activity logged yet.</p>
          <p className="text-slate-400 text-sm mt-1">Actions like order edits, call logs, and coupon saves will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(log => {
            const colorClass = ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600';
            return (
              <div key={log.id} className="bg-white border border-slate-100 rounded-2xl p-4 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-9 h-9 bg-slate-100 text-slate-700 font-black text-sm rounded-full flex items-center justify-center shrink-0">
                  {log.user[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-0.5">
                    <span className="font-black text-slate-900 text-sm">{log.user}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${colorClass}`}>{log.action}</span>
                  </div>
                  <div className="text-sm text-slate-600 font-medium truncate">{log.detail}</div>
                </div>
                <div className="text-xs text-slate-400 font-bold shrink-0 flex items-center gap-1">
                  <Clock size={11} /> {formatTime(log.timestamp)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
