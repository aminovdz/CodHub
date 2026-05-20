'use client';

import { useState, Fragment } from 'react';
import { useAdminStore, Product } from '@/lib/store/useAdminStore';
import { AlertTriangle, Package, TrendingDown, CheckCircle2 } from 'lucide-react';

const LOW_STOCK_DEFAULT = 5;

export default function AdminStockPage() {
  const { activeStore, products, updateProduct, addActivityLog } = useAdminStore();
  const sessionData = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}'); } catch { return {}; } })()
    : {};
  const sessionUser = sessionData.user || sessionData.username || 'System';

  const [threshold, setThreshold] = useState(LOW_STOCK_DEFAULT);

  const storeProducts = products.filter(p => p.storeId === activeStore.id);

  const getStockStatus = (p: Product) => {
    const total = p.enableVariants && p.variants?.length
      ? p.variants.reduce((s, v) => s + v.stock, 0)
      : (p.stock ?? null);
    if (total === null) return { label: 'Not Tracked', color: 'bg-slate-100 text-slate-500', icon: null };
    if (total === 0) return { label: 'Out of Stock', color: 'bg-rose-100 text-rose-700', icon: <AlertTriangle size={12} /> };
    if (total <= threshold) return { label: 'Low Stock', color: 'bg-amber-100 text-amber-700', icon: <TrendingDown size={12} /> };
    return { label: 'In Stock', color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 size={12} /> };
  };

  const updateStock = async (productId: string, stock: number) => {
    const product = products.find(p => p.id === productId);
    await updateProduct(productId, { stock });
    if (product) {
      addActivityLog({
        storeId: activeStore.id,
        user: sessionUser,
        action: 'Product Updated',
        detail: `Updated stock of ${product.title} to ${stock}`
      });
    }
  };

  const updateVariantStock = async (productId: string, variantId: string, stock: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newVariants = (product.variants || []).map(v => v.id === variantId ? { ...v, stock } : v);
    await updateProduct(productId, { variants: newVariants });
    const variant = product.variants?.find(v => v.id === variantId);
    addActivityLog({
      storeId: activeStore.id,
      user: sessionUser,
      action: 'Product Updated',
      detail: `Updated stock of ${product.title} (${variant?.label || variantId}) to ${stock}`
    });
  };

  const outOfStock = storeProducts.filter(p => {
    const s = getStockStatus(p);
    return s.label === 'Out of Stock';
  });

  const lowStock = storeProducts.filter(p => getStockStatus(p).label === 'Low Stock');

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Stock Manager</h1>
          <p className="text-slate-500 font-medium"><span className="font-bold text-indigo-600">{activeStore.name}</span> — Inventory overview</p>
        </div>
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
          <label className="text-sm font-bold text-slate-600">Low stock alert threshold:</label>
          <input
            type="number" min={1} value={threshold}
            onChange={e => setThreshold(Number(e.target.value))}
            className="w-16 px-2 py-1 border border-slate-300 rounded-lg text-center font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
      </div>

      {/* Alert banners */}
      {outOfStock.length > 0 && (
        <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} className="text-rose-600 shrink-0" />
          <p className="text-sm font-bold text-rose-800">
            {outOfStock.length} product{outOfStock.length > 1 ? 's' : ''} out of stock: {outOfStock.map(p => p.title).join(', ')}
          </p>
        </div>
      )}
      {lowStock.length > 0 && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-3">
          <TrendingDown size={20} className="text-amber-600 shrink-0" />
          <p className="text-sm font-bold text-amber-800">
            {lowStock.length} product{lowStock.length > 1 ? 's' : ''} running low: {lowStock.map(p => p.title).join(', ')}
          </p>
        </div>
      )}

      {/* Products table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="p-4 font-bold">Product</th>
              <th className="p-4 font-bold">Category</th>
              <th className="p-4 font-bold text-center">Stock</th>
              <th className="p-4 font-bold text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {storeProducts.length === 0 && (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">No products found for this store.</td></tr>
            )}
            {storeProducts.map(p => {
              const status = getStockStatus(p);
              return (
                <Fragment key={p.id}>
                  <tr className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {p.image && <img src={p.image} alt={p.title} className="w-10 h-10 rounded-xl object-cover shrink-0" />}
                        {!p.image && <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center"><Package size={18} className="text-slate-400" /></div>}
                        <div>
                          <div className="font-bold text-slate-900">{p.title}</div>
                          {p.enableVariants && p.variants?.length ? (
                            <div className="text-xs text-slate-400">{p.variants.length} variants</div>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-slate-600 text-sm">{p.category}</td>
                    <td className="p-4 text-center">
                      {!p.enableVariants ? (
                        <input
                          type="number" min={0}
                          value={p.stock ?? ''}
                          onChange={e => updateStock(p.id, Number(e.target.value))}
                          placeholder="—"
                          className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-center font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      ) : (
                        <span className="text-sm font-bold text-slate-700">
                          {(p.variants || []).reduce((s, v) => s + v.stock, 0)} total
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                    </td>
                  </tr>
                  {/* Variant rows */}
                  {p.enableVariants && p.variants?.map(v => (
                    <tr key={v.id} className="border-b border-slate-50 bg-slate-50/50">
                      <td className="p-3 pl-16" colSpan={1}>
                        <span className="text-sm font-bold text-slate-600">↳ {v.label}</span>
                        {v.sku && <span className="ml-2 text-xs text-slate-400">SKU: {v.sku}</span>}
                      </td>
                      <td className="p-3 text-xs text-slate-400">
                        {v.priceModifier !== 0 ? `${v.priceModifier > 0 ? '+' : ''}${v.priceModifier} ${activeStore.currency}` : 'Base price'}
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number" min={0} value={v.stock}
                          onChange={e => updateVariantStock(p.id, v.id, Number(e.target.value))}
                          className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-center font-bold text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black ${v.stock === 0 ? 'bg-rose-100 text-rose-700' : v.stock <= threshold ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {v.stock === 0 ? '❌ Out' : v.stock <= threshold ? '⚠️ Low' : '✅ OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
