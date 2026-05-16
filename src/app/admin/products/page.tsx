'use client';

import { useState } from 'react';
import { Sparkles, Plus, Edit2, Trash2, X, UploadCloud, Image as ImageIcon, PlusSquare, Link as LinkIcon, ExternalLink, LayoutTemplate, Star, AlignLeft, Code, GripVertical } from 'lucide-react';
import { useAdminStore, Product, MaximizerUpsell, HomepageBlock, ProductVariant } from '@/lib/store/useAdminStore';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { ConfirmModal } from '@/components/admin/ConfirmModal';

export default function AdminProductsPage() {
  const { activeStore, products, addProduct, updateProduct, deleteProduct, categories, setCategories } = useAdminStore();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [descMode, setDescMode] = useState<'text' | 'html'>('text');
  const [isGenerating, setIsGenerating] = useState(false);
  const { notify } = useNotificationStore();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; productId: string; title: string }>({ isOpen: false, productId: '', title: '' });

  const filteredProducts = products.filter(p => p.storeId === activeStore.id);

  const handleAIGenerate = async () => {
    if (!editingProduct?.title) {
      notify("Please enter a product title first!", "warning");
      return;
    }
    setIsGenerating(true);
    try {
      const { aiService } = await import('@/lib/services/aiService');
      const details = await aiService.generateProductDetails(editingProduct.title, editingProduct.category, activeStore.region);
      if (details) {
        setEditingProduct(prev => prev ? {
          ...prev,
          shortDesc: details.shortDesc,
          mainDesc: details.mainDesc,
          seoTitle: details.seoTitle,
          seoDescription: details.seoDescription
        } : prev);
      } else {
        notify("Failed to generate AI details.", "error");
      }
    } catch (e) {
      console.error(e);
      notify("Error calling AI.", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddProduct = () => {
    setEditingProduct({
      id: 'new_' + Date.now().toString(),
      storeId: activeStore.id,
      title: '',
      category: categories[0] || 'Uncategorized',
      price: 0,
      active: true,
      image: '',
      shortDesc: '',
      mainDesc: '',
      blocks: [],
      relatedProducts: '',
      maximizerUpsells: [],
      variants: []
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSaving(true);
    
    const exists = products.find(p => p.id === editingProduct.id);
    if (exists) {
      await updateProduct(editingProduct.id, editingProduct);
    } else {
      await addProduct(editingProduct);
    }
    
    setIsSaving(false);
    setEditingProduct(null);
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteModal({ isOpen: true, productId: id, title });
  };

  const handleImageUploadMock = () => {
    const url = prompt('Enter Image URL:');
    if (url) {
      setEditingProduct(prev => prev ? {...prev, image: url} : null);
    }
  };

  const addUpsell = () => {
    if (!editingProduct) return;
    const newUpsell: MaximizerUpsell = {
      id: 'upsell_' + Date.now(),
      targetProductId: '',
      customPrice: 0,
      titleOverride: ''
    };
    setEditingProduct({
      ...editingProduct,
      maximizerUpsells: [...(editingProduct.maximizerUpsells || []), newUpsell]
    });
  };

  const updateUpsell = (id: string, updates: Partial<MaximizerUpsell>) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      maximizerUpsells: editingProduct.maximizerUpsells?.map(u => u.id === id ? { ...u, ...updates } : u)
    });
  };

  const removeUpsell = (id: string) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      maximizerUpsells: editingProduct.maximizerUpsells?.filter(u => u.id !== id)
    });
  };

  const addBlock = (type: 'text' | 'html' | 'features') => {
    if (!editingProduct) return;
    const newBlock: HomepageBlock = {
      id: 'block_' + Date.now(),
      type,
      content: '',
      features: type === 'features' ? [
        { title: 'Feature', description: 'Description', icon: 'Star' }
      ] : undefined
    };
    setEditingProduct({
      ...editingProduct,
      blocks: [...(editingProduct.blocks || []), newBlock]
    });
  };

  const removeBlock = (id: string) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      blocks: (editingProduct.blocks || []).filter(b => b.id !== id)
    });
  };

  const updateBlockContent = (id: string, updates: Partial<HomepageBlock>) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      blocks: (editingProduct.blocks || []).map(b => b.id === id ? { ...b, ...updates } : b)
    });
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if (!editingProduct) return;
    const blocks = [...(editingProduct.blocks || [])];
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) return;
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = blocks[index];
    blocks[index] = blocks[swapIndex];
    blocks[swapIndex] = temp;
    setEditingProduct({ ...editingProduct, blocks });
  };

  const addVariant = () => {
    if (!editingProduct) return;
    const newVariant: ProductVariant = {
      id: 'var_' + Date.now(),
      label: '',
      stock: 0,
      priceModifier: 0
    };
    setEditingProduct({
      ...editingProduct,
      variants: [...(editingProduct.variants || []), newVariant]
    });
  };

  const updateVariant = (id: string, updates: Partial<ProductVariant>) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      variants: editingProduct.variants?.map(v => v.id === id ? { ...v, ...updates } : v)
    });
  };

  const removeVariant = (id: string) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      variants: editingProduct.variants?.filter(v => v.id !== id)
    });
  };

  return (
    <>
      <div className="max-w-6xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Products Manager</h1>
          <p className="text-slate-500 font-medium">Manage catalog and pricing for <span className="font-bold text-indigo-600">{activeStore.name}</span>.</p>
        </div>
        <button onClick={handleAddProduct} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-md">
          <Plus size={20} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse whitespace-nowrap md:whitespace-normal">
            <thead>
              <tr className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <th className="p-4 font-bold">Product</th>
                <th className="p-4 font-bold">Category</th>
                <th className="p-4 font-bold">Price</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium text-slate-700">
              {filteredProducts.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-slate-500">No products found for this store. Click Add Product.</td></tr>
              )}
              {filteredProducts.map(p => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                      {p.image ? <img src={p.image} alt={p.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon size={16}/></div>}
                    </div>
                    <span className="font-bold text-slate-900">{p.title || 'Untitled Product'}</span>
                  </td>
                  <td className="p-4">{p.category}</td>
                  <td className="p-4 font-bold text-indigo-600">{p.price} {activeStore.currency}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${p.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                      {p.active ? 'ACTIVE' : 'DRAFT'}
                    </span>
                  </td>
                  <td className="p-4 flex justify-end gap-2">
                    <button 
                      onClick={() => {
                        const titleSlug = p.seoSlug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                        const url = `${window.location.origin}/${activeStore.region}/products/${titleSlug}`;
                        navigator.clipboard.writeText(url);
                        notify('Product Page URL copied!', 'success');
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Copy Product Page URL (uses product name)"
                    >
                      <ExternalLink size={16} />
                    </button>
                    <button 
                      onClick={() => {
                        const url = `${window.location.origin}/${activeStore.region}/checkout?product=${p.id}`;
                        navigator.clipboard.writeText(url);
                        notify('Direct Checkout URL copied!', 'success');
                      }}
                      className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-colors"
                      title="Copy Direct Checkout URL (uses product ID)"
                    >
                      <LinkIcon size={16} />
                    </button>
                    <button onClick={() => setEditingProduct(p)} className="p-2 text-slate-400 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                    <button onClick={() => handleDelete(p.id, p.title)} className="p-2 text-slate-400 hover:text-rose-600 bg-slate-100 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form onSubmit={handleSave} className="bg-white rounded-3xl shadow-xl w-full max-w-4xl border border-slate-200 overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-20">
              <h2 className="text-xl font-bold text-slate-900">{editingProduct.id.startsWith('new_') ? 'Create New Product' : 'Edit Product'}</h2>
              <button type="button" onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
            </div>
            
            <div className="p-6 space-y-8 overflow-y-auto max-h-[80vh]">
              
              {/* Basic Info */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Product Image</label>
                  <div className="flex items-center gap-6">
                    <div className="w-32 h-32 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                      {editingProduct.image ? (
                        <img src={editingProduct.image} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={32} className="text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <button type="button" onClick={handleImageUploadMock} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-xl hover:bg-indigo-100 transition-colors mb-2">
                        <UploadCloud size={18} /> Enter Image URL
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-bold text-slate-700">Product Title</label>
                      <button type="button" onClick={handleAIGenerate} disabled={isGenerating} className="text-xs flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50 transition-all bg-indigo-50 px-2 py-1 rounded-md">
                        <Sparkles size={14} className={isGenerating ? "animate-pulse" : ""} /> 
                        {isGenerating ? 'AI is thinking...' : 'AI Auto-Fill Details'}
                      </button>
                    </div>
                    <input type="text" value={editingProduct.title} onChange={(e) => setEditingProduct({...editingProduct, title: e.target.value})} required className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center justify-between">
                      Category
                      <button type="button" onClick={() => {
                        const newCat = prompt('Enter new category name:');
                        if (newCat && newCat.trim()) {
                          setCategories(prev => [...prev, newCat.trim()]);
                          setEditingProduct({...editingProduct, category: newCat.trim()});
                        }
                      }} className="text-xs text-indigo-600 font-bold hover:underline">
                        + Add New
                      </button>
                    </label>
                    <select value={editingProduct.category} onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium bg-white">
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      {!categories.includes(editingProduct.category) && <option value={editingProduct.category}>{editingProduct.category}</option>}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Price</label>
                      <input type="number" value={editingProduct.price} onChange={(e) => setEditingProduct({...editingProduct, price: Number(e.target.value)})} required min="0" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Compare At</label>
                      <input type="number" value={editingProduct.compareAtPrice || ''} onChange={(e) => setEditingProduct({...editingProduct, compareAtPrice: Number(e.target.value)})} min="0" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium" placeholder="Optional" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Stars Rate</label>
                      <input type="number" step="0.1" max="5" value={editingProduct.starsRate || ''} onChange={(e) => setEditingProduct({...editingProduct, starsRate: Number(e.target.value)})} min="0" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium" placeholder="e.g. 4.8" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Reviews Count</label>
                      <input type="number" value={editingProduct.reviewsCount || ''} onChange={(e) => setEditingProduct({...editingProduct, reviewsCount: Number(e.target.value)})} min="0" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium" placeholder="e.g. 124" />
                    </div>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Post-Purchase OTO Product</label>
                      <select value={editingProduct.otoProductId || ''} onChange={(e) => setEditingProduct({...editingProduct, otoProductId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium bg-white">
                        <option value="">None (Disable OTO)</option>
                        {filteredProducts.filter(p => p.id !== editingProduct.id).map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Delivery Agency (Fulfillment)</label>
                      <select value={editingProduct.deliveryAgency || ''} onChange={(e) => setEditingProduct({...editingProduct, deliveryAgency: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium bg-white">
                        <option value="">Manual / Default</option>
                        <option value="yalidine">Yalidine Express</option>
                        <option value="dhd">DHD Delivery</option>
                        <option value="maystro">Maystro Delivery</option>
                        <option value="zajil">Zajil Express</option>
                      </select>
                    </div>
                  </div>
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={editingProduct.disableOutOfStockPurchases || false} 
                        onChange={(e) => setEditingProduct({...editingProduct, disableOutOfStockPurchases: e.target.checked})}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-bold text-slate-700 text-sm">Disable Out of Stock</div>
                        <div className="text-xs text-slate-500">Show "Sold Out" when stock reaches 0</div>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={editingProduct.disableCoupons || false} 
                        onChange={(e) => setEditingProduct({...editingProduct, disableCoupons: e.target.checked})}
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-bold text-slate-700 text-sm">Disable Coupons</div>
                        <div className="text-xs text-slate-500">Prevent coupons from applying to this product</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              {/* Variants Configuration */}
              <div className="border-t border-slate-100 pt-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Product Variants</h3>
                    <p className="text-sm text-slate-500">Add size, color, or other variations. Variants share the base price, but can add or subtract with a modifier.</p>
                  </div>
                  <button type="button" onClick={addVariant} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors">
                    <PlusSquare size={16} /> Add Variant
                  </button>
                </div>

                <div className="space-y-4">
                  {editingProduct.variants?.map((variant, index) => (
                    <div key={variant.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-black flex items-center justify-center shrink-0">{index + 1}</div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Variant Name (e.g. "Size: L" or "Color: Red")</label>
                          <input type="text" value={variant.label} onChange={(e) => updateVariant(variant.id, { label: e.target.value })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm" placeholder="Variant name" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Price Modifier (e.g. +500 or -200)</label>
                          <input type="number" value={variant.priceModifier} onChange={(e) => updateVariant(variant.id, { priceModifier: Number(e.target.value) })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm" placeholder="0" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Stock Quantity</label>
                          <input type="number" value={variant.stock} onChange={(e) => updateVariant(variant.id, { stock: Number(e.target.value) })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm" placeholder="0" min={0} />
                        </div>
                      </div>
                      <button type="button" onClick={() => removeVariant(variant.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  {(!editingProduct.variants || editingProduct.variants.length === 0) && (
                    <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm font-medium">
                      No variants configured. This product will be sold as a single item.
                    </div>
                  )}
                </div>
              </div>

              {/* Descriptions */}
              <div className="border-t border-slate-100 pt-8">
                <div className="mb-6">
                  <label className="block text-sm font-bold text-slate-700 mb-1">Short Description (Summary)</label>
                  <textarea value={editingProduct.shortDesc} onChange={(e) => setEditingProduct({...editingProduct, shortDesc: e.target.value})} rows={2} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium resize-none" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-slate-700">Main Description</label>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                      <button type="button" onClick={() => setDescMode('text')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${descMode === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Text</button>
                      <button type="button" onClick={() => setDescMode('html')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${descMode === 'html' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>HTML</button>
                    </div>
                  </div>
                  {descMode === 'text' ? (
                    <textarea value={editingProduct.mainDesc.replace(/<[^>]+>/g, '')} onChange={(e) => setEditingProduct({...editingProduct, mainDesc: e.target.value})} rows={6} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium resize-y" />
                  ) : (
                    <textarea value={editingProduct.mainDesc} onChange={(e) => setEditingProduct({...editingProduct, mainDesc: e.target.value})} rows={6} className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 text-emerald-400 font-mono text-sm focus:ring-2 focus:ring-indigo-600 outline-none resize-y" spellCheck={false} />
                  )}
                </div>
              </div>

              {/* Dynamic Product Page Builder */}
              <div className="border-t border-slate-100 pt-8">
                <h3 className="text-lg font-black text-slate-900 mb-1">Product Page Builder</h3>
                <p className="text-sm text-slate-500 mb-4">Add rich content blocks to display under the main product details.</p>
                
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-3 items-center mb-6">
                  <span className="text-sm font-bold text-slate-500 uppercase tracking-wider mr-2">Add Block:</span>
                  <button type="button" onClick={() => addBlock('features')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100"><Star size={14} className="text-amber-500" /> Features</button>
                  <button type="button" onClick={() => addBlock('text')} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-700 hover:bg-slate-100"><AlignLeft size={14} className="text-slate-500" /> Text</button>
                  <button type="button" onClick={() => addBlock('html')} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-sm font-bold text-white hover:bg-slate-800"><Code size={14} className="text-emerald-400" /> HTML</button>
                </div>

                <div className="space-y-4">
                  {(editingProduct.blocks || []).map((block, index) => (
                    <div key={block.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative flex gap-4">
                      {/* Order Controls */}
                      <div className="flex flex-col items-center gap-2 mt-2">
                        <button type="button" onClick={() => moveBlock(index, 'up')} disabled={index === 0} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><GripVertical size={16} className="rotate-90" /></button>
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black">{index + 1}</div>
                        <button type="button" onClick={() => moveBlock(index, 'down')} disabled={index === (editingProduct.blocks || []).length - 1} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><GripVertical size={16} className="rotate-90" /></button>
                      </div>

                      <div className="flex-1 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            {block.type === 'features' && <><Star size={14} className="text-amber-500"/> Features Block</>}
                            {block.type === 'text' && <><AlignLeft size={14} className="text-slate-500"/> Text Block</>}
                            {block.type === 'html' && <><Code size={14} className="text-emerald-500"/> HTML Block</>}
                          </h3>
                          <button type="button" onClick={() => removeBlock(block.id)} className="text-slate-400 hover:text-rose-600 p-1"><Trash2 size={16} /></button>
                        </div>

                        {block.type === 'features' && (
                          <div className="space-y-3">
                            {(block.features || []).map((f, i) => (
                              <div key={i} className="flex gap-2">
                                <div className="flex-1 space-y-2">
                                  <input type="text" value={f.title} onChange={e => { const newF = [...(block.features || [])]; newF[i].title = e.target.value; updateBlockContent(block.id, { features: newF }); }} className="w-full px-3 py-2 border rounded-lg text-sm font-bold" placeholder="Feature Title" />
                                  <input type="text" value={f.description} onChange={e => { const newF = [...(block.features || [])]; newF[i].description = e.target.value; updateBlockContent(block.id, { features: newF }); }} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Description" />
                                </div>
                                <button type="button" onClick={() => { const newF = (block.features || []).filter((_, idx) => idx !== i); updateBlockContent(block.id, { features: newF }); }} className="text-rose-500 p-2"><Trash2 size={16} /></button>
                              </div>
                            ))}
                            <button type="button" onClick={() => { const newF = [...(block.features || []), { title: 'New Feature', description: 'Description', icon: 'Star' }]; updateBlockContent(block.id, { features: newF }); }} className="text-xs font-bold text-indigo-600 flex items-center gap-1"><PlusSquare size={14} /> Add Feature</button>
                          </div>
                        )}
                        {block.type === 'text' && <textarea value={block.content} onChange={e => updateBlockContent(block.id, { content: e.target.value })} rows={3} className="w-full px-3 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-600 outline-none" />}
                        {block.type === 'html' && <textarea value={block.content} onChange={e => updateBlockContent(block.id, { content: e.target.value })} rows={4} className="w-full px-3 py-2 rounded-lg bg-slate-900 text-emerald-400 font-mono text-sm focus:ring-2 focus:ring-indigo-600 outline-none" spellCheck={false} />}
                      </div>
                    </div>
                  ))}
                  {(editingProduct.blocks || []).length === 0 && <p className="text-sm text-slate-400">No custom blocks added.</p>}
                </div>
              </div>

              {/* SEO Configuration */}
              <div className="border-t border-slate-100 pt-8">
                <h3 className="text-lg font-black text-slate-900 mb-1">SEO Configuration</h3>
                <p className="text-sm text-slate-500 mb-4">Optimize how this product appears in search engines.</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">SEO Title</label>
                    <input type="text" value={editingProduct.seoTitle || ''} onChange={(e) => setEditingProduct({...editingProduct, seoTitle: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium bg-white" placeholder="e.g. Buy Premium Product | COD Hub" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">SEO Description</label>
                    <textarea value={editingProduct.seoDescription || ''} onChange={(e) => setEditingProduct({...editingProduct, seoDescription: e.target.value})} rows={2} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium resize-none bg-white" placeholder="A compelling meta description..." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">SEO URL Slug</label>
                    <input type="text" value={editingProduct.seoSlug || ''} onChange={(e) => setEditingProduct({...editingProduct, seoSlug: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium bg-white" placeholder="e.g. premium-product-name" />
                  </div>
                </div>
              </div>

              {/* The Maximizer Upsell Configuration */}
              <div className="border-t border-slate-100 pt-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">The Maximizer (Step 2 Upsells)</h3>
                    <p className="text-sm text-slate-500">Configure dynamic upsells that appear immediately after a customer buys THIS product.</p>
                  </div>
                  <button type="button" onClick={addUpsell} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-colors">
                    <PlusSquare size={16} /> Add Upsell Block
                  </button>
                </div>

                <div className="space-y-4">
                  {editingProduct.maximizerUpsells?.map((upsell, index) => (
                    <div key={upsell.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-black flex items-center justify-center shrink-0">{index + 1}</div>
                      <div className="flex-1 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Target Product ID</label>
                            <select value={upsell.targetProductId} onChange={(e) => updateUpsell(upsell.id, { targetProductId: e.target.value })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm">
                              <option value="">Select a product...</option>
                              {filteredProducts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Discounted Upsell Price ({activeStore.currency})</label>
                            <input type="number" value={upsell.customPrice} onChange={(e) => updateUpsell(upsell.id, { customPrice: Number(e.target.value) })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-indigo-600 text-sm" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Title / Button Override (e.g. "Add 1 More for 50% Off")</label>
                            <input type="text" value={upsell.titleOverride || ''} onChange={(e) => updateUpsell(upsell.id, { titleOverride: e.target.value })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm" />
                          </div>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeUpsell(upsell.id)} className="self-start p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  {(!editingProduct.maximizerUpsells || editingProduct.maximizerUpsells.length === 0) && (
                    <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm font-medium">
                      No upsells configured. Click "Add Upsell Block" to create the Maximizer sequence.
                    </div>
                  )}
                </div>
              </div>

              {/* Thank You Page Related Products */}
              <div className="border-t border-slate-100 pt-8">
                <h3 className="text-lg font-black text-slate-900 mb-1">Thank You Page Related Products</h3>
                <p className="text-sm text-slate-500 mb-4">Suggest these products on the final Thank You page (Passive Upsell).</p>
                <input type="text" value={editingProduct.relatedProducts || ''} onChange={(e) => setEditingProduct({...editingProduct, relatedProducts: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium bg-white" placeholder="Comma separated IDs or exact titles..." />
              </div>

              <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
                <input type="checkbox" id="active" checked={editingProduct.active} onChange={(e) => setEditingProduct({...editingProduct, active: e.target.checked})} className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500" />
                <label htmlFor="active" className="font-bold text-slate-700">Product is visible on Storefront</label>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 sticky bottom-0 z-20">
              <button type="button" onClick={() => setEditingProduct(null)} className="px-6 py-3 font-bold text-slate-600 hover:text-slate-900" disabled={isSaving}>Cancel</button>
              <button type="submit" disabled={isSaving} className="px-6 py-3 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-200 disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save Product'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>

    <ConfirmModal
      isOpen={deleteModal.isOpen}
      onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
      onConfirm={async () => {
        await deleteProduct(deleteModal.productId);
        notify('Product deleted successfully!', 'success');
      }}
      title="Delete Product?"
      message={`Are you sure you want to delete "${deleteModal.title}"? This action cannot be undone.`}
      confirmText="Delete Product"
      variant="danger"
    />
    </>
  );
}
