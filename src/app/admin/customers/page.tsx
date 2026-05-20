'use client';

import { useState, useMemo } from 'react';
import { useAdminStore, Order, BlacklistedCustomer } from '@/lib/store/useAdminStore';
import { AlertTriangle, Search, ShieldBan, UserX, CheckCircle, Package } from 'lucide-react';

export default function AdminCustomersPage() {
  const { activeStore, orders, customerBlacklist, setCustomerBlacklist, addActivityLog } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  const sessionUser = typeof window !== 'undefined'
    ? (() => { try { 
        const auth = JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}');
        return auth.username || auth.user || 'Admin';
      } catch { return 'Admin'; } })()
    : 'Admin';

  // Group orders by phone number
  const customers = useMemo(() => {
    const map = new Map<string, { phone: string; name: string; orders: Order[]; totalSpent: number }>();
    
    orders.filter(o => o.storeId === activeStore.id).forEach(o => {
      const p = o.phone.trim();
      if (!p) return;
      if (!map.has(p)) {
        map.set(p, { phone: p, name: o.customer, orders: [], totalSpent: 0 });
      }
      const c = map.get(p)!;
      c.orders.push(o);
      if (o.status === 'DELIVERED') c.totalSpent += o.total;
    });

    return Array.from(map.values())
      .filter(c => 
        c.phone.includes(searchTerm) || 
        c.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => b.orders.length - a.orders.length);
  }, [orders, activeStore.id, searchTerm]);

  // Find recent duplicates (orders placed by same phone within 24h)
  const duplicateWarnings = useMemo(() => {
    return customers.filter(c => {
      if (c.orders.length < 2) return false;
      const sorted = [...c.orders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const diff = new Date(sorted[0].date).getTime() - new Date(sorted[1].date).getTime();
      // Difference < 24 hours
      return diff < 86400000;
    });
  }, [customers]);

  const handleBlacklist = (phone: string, name: string) => {
    const reason = prompt(`Why are you blacklisting ${phone} (${name})?`);
    if (!reason) return;

    const entry: BlacklistedCustomer = {
      id: `bl_${Date.now()}`,
      storeId: activeStore.id,
      phone,
      name,
      reason,
      addedAt: new Date().toISOString(),
      addedBy: sessionUser
    };
    setCustomerBlacklist(prev => [entry, ...prev]);
    addActivityLog({
      storeId: activeStore.id,
      user: sessionUser,
      action: 'Customer Blacklisted',
      detail: `Blacklisted customer ${phone} (${name}). Reason: "${reason}"`
    });
  };

  const handleRemoveBlacklist = (id: string) => {
    const entry = customerBlacklist.find(b => b.id === id);
    if (confirm('Remove this customer from the blacklist?')) {
      setCustomerBlacklist(prev => prev.filter(b => b.id !== id));
      addActivityLog({
        storeId: activeStore.id,
        user: sessionUser,
        action: 'Customer Whitelisted',
        detail: `Removed customer ${entry?.phone || id} (${entry?.name || 'Unknown'}) from blacklist`
      });
    }
  };

  const blacklistForActiveStore = customerBlacklist.filter(b => b.storeId === activeStore.id);

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Customer Intelligence</h1>
        <p className="text-slate-500 font-medium">Identify top buyers, prevent fraud, and manage your blacklist.</p>
      </div>

      {duplicateWarnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex gap-4">
          <div className="mt-1 bg-amber-100 p-2 rounded-full text-amber-600 h-min">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="font-black text-amber-900 text-lg">Potential Duplicate Orders Detected</h3>
            <p className="text-amber-700 text-sm mb-3">The following customers placed multiple orders within a 24-hour window.</p>
            <div className="flex flex-wrap gap-2">
              {duplicateWarnings.map(c => (
                <div key={c.phone} className="bg-white border border-amber-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 shadow-sm">
                  {c.name} ({c.phone}) — {c.orders.length} orders
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Customer List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
            <Search className="text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search customers by name or phone..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none w-full font-medium text-slate-700"
            />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <h2 className="font-black text-lg text-slate-800">Customer Directory</h2>
              <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-lg">{customers.length} total</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {customers.map(c => {
                const isBlacklisted = blacklistForActiveStore.some(b => b.phone === c.phone);
                return (
                  <div key={c.phone} className="p-5 hover:bg-slate-50 transition-colors flex flex-wrap gap-4 items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-lg">{c.name}</h3>
                        {isBlacklisted && <span className="bg-rose-100 text-rose-700 text-[10px] uppercase font-black px-1.5 py-0.5 rounded flex items-center gap-1"><ShieldBan size={10}/> Blacklisted</span>}
                      </div>
                      <div className="text-sm font-medium text-slate-500 mt-0.5">{c.phone}</div>
                    </div>
                    
                    <div className="flex gap-6 items-center">
                      <div className="text-center">
                        <div className="text-2xl font-black text-indigo-600 leading-none">{c.orders.length}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">Orders</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-black text-emerald-600 leading-none">{c.totalSpent}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-1">LTV ({activeStore.currency})</div>
                      </div>
                      <button 
                        onClick={() => handleBlacklist(c.phone, c.name)}
                        disabled={isBlacklisted}
                        className={`p-2 rounded-xl transition-colors ${isBlacklisted ? 'text-slate-300 bg-slate-50 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 bg-slate-100'}`}
                        title="Add to Blacklist"
                      >
                        <UserX size={18} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {customers.length === 0 && (
                <div className="p-8 text-center text-slate-500 font-medium">No customers found.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Blacklist */}
        <div>
          <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl overflow-hidden text-white">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center">
              <h2 className="font-black text-lg flex items-center gap-2">
                <ShieldBan className="text-rose-500" size={20} /> Blacklist
              </h2>
              <span className="text-xs font-bold bg-rose-500/20 text-rose-300 px-2 py-1 rounded-lg">{blacklistForActiveStore.length} blocked</span>
            </div>
            <div className="p-4 space-y-3 max-h-[650px] overflow-y-auto">
              {blacklistForActiveStore.map(b => (
                <div key={b.id} className="bg-slate-800 rounded-2xl p-4 border border-slate-700">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold text-white">{b.phone}</div>
                      {b.name && <div className="text-xs text-slate-400">{b.name}</div>}
                    </div>
                    <button 
                      onClick={() => handleRemoveBlacklist(b.id)}
                      className="text-slate-500 hover:text-white transition-colors"
                      title="Remove from blacklist"
                    >
                      <CheckCircle size={16} />
                    </button>
                  </div>
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-200 text-xs p-2 rounded-lg mt-2">
                    "{b.reason}"
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2 font-medium">Added by {b.addedBy} on {new Date(b.addedAt).toLocaleDateString()}</div>
                </div>
              ))}
              {blacklistForActiveStore.length === 0 && (
                <div className="text-center text-slate-500 py-6 text-sm">No customers blacklisted yet.</div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
