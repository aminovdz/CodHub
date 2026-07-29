'use client';

import { useState } from 'react';
import { Sparkles, Plus, Edit2, Trash2, X, UploadCloud, Image as ImageIcon, PlusSquare, Link as LinkIcon, ExternalLink, LayoutTemplate, Star, AlignLeft, Code, GripVertical, Loader2, ChevronUp, ChevronDown } from 'lucide-react';
import { useAdminStore, Product, MaximizerUpsell, HomepageBlock, ProductVariant, QuantityOffer, OrderBump } from '@/lib/store/useAdminStore';
import { useNotificationStore } from '@/lib/store/useNotificationStore';
import { ConfirmModal } from '@/components/admin/ConfirmModal';
import { uploadImageToSupabase, uploadMultipleImages } from '@/lib/storage';

export default function AdminProductsPage() {
  const { activeStore, products, addProduct, updateProduct, deleteProduct, categories, setCategories, addActivityLog } = useAdminStore();
  const sessionData = typeof window !== 'undefined'
    ? (() => { try { return JSON.parse(sessionStorage.getItem('codadmin-auth') || '{}'); } catch { return {}; } })()
    : {};
  const sessionUser = sessionData.user || sessionData.username || 'System';

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [descMode, setDescMode] = useState<'text' | 'html'>('text');
  const [shortDescMode, setShortDescMode] = useState<'text' | 'html'>('text');
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [relatedSearch, setRelatedSearch] = useState('');
  const [bumpSearches, setBumpSearches] = useState<Record<string, string>>({});
  const { notify } = useNotificationStore();
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; productId: string; title: string }>({ isOpen: false, productId: '', title: '' });
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'delete' | 'activate' | 'deactivate' | null>(null);
  const [bulkConfirmModal, setBulkConfirmModal] = useState(false);

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
          seoDescription: details.seoDescription,
          seoSlug: details.seoSlug || prev.seoSlug
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
      images: [],
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
      addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Product Updated', detail: `Product ${editingProduct.title} updated` });
    } else {
      await addProduct(editingProduct);
      addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Product Created', detail: `Product ${editingProduct.title} created` });
    }
    
    setIsSaving(false);
    setEditingProduct(null);
  };

  const handleDelete = (id: string, title: string) => {
    setDeleteModal({ isOpen: true, productId: id, title });
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedProductIds(filteredProducts.map(p => p.id));
    } else {
      setSelectedProductIds([]);
    }
  };

  const handleSelectProduct = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedProductIds(prev => [...prev, id]);
    } else {
      setSelectedProductIds(prev => prev.filter(pid => pid !== id));
    }
  };

  const executeBulkAction = async () => {
    if (selectedProductIds.length === 0 || !bulkAction) return;

    try {
      for (const id of selectedProductIds) {
        if (bulkAction === 'delete') {
          await deleteProduct(id);
        } else if (bulkAction === 'activate') {
          const p = products.find(prod => prod.id === id);
          if (p) await updateProduct(id, { ...p, active: true });
        } else if (bulkAction === 'deactivate') {
          const p = products.find(prod => prod.id === id);
          if (p) await updateProduct(id, { ...p, active: false });
        }
      }

      addActivityLog({ 
        storeId: activeStore.id, 
        user: sessionUser, 
        action: 'Bulk Product Update', 
        detail: `Bulk ${bulkAction} on ${selectedProductIds.length} products` 
      });
      notify(`Successfully applied ${bulkAction} to ${selectedProductIds.length} products!`, 'success');
    } catch (e) {
      console.error(e);
      notify(`Failed to execute bulk action`, 'error');
    } finally {
      setSelectedProductIds([]);
      setBulkConfirmModal(false);
      setBulkAction(null);
    }
  };

  const handleImageUrlAdd = () => {
    if (!imageUrlInput.trim()) return;
    const urls = imageUrlInput.split(/[,\n]+/).map(u => u.trim()).filter(Boolean);
    if (urls.length === 0) return;
    setEditingProduct(prev => {
      if (!prev) return prev;
      const updated = { ...prev };
      if (!updated.image) updated.image = urls[0];
      updated.images = [...(updated.images || []), ...urls];
      return updated;
    });
    setImageUrlInput('');
    notify(`${urls.length} URL(s) added!`, 'success');
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    try {
      const urls = await uploadMultipleImages(Array.from(files), 'images');
      setEditingProduct(prev => {
        if (!prev) return prev;
        const updated = { ...prev };
        if (!updated.image && urls.length > 0) updated.image = urls[0];
        updated.images = [...(updated.images || []), ...urls];
        return updated;
      });
      notify(`${urls.length} image(s) uploaded successfully!`, 'success');
    } catch (error: any) {
      console.error(error);
      notify(error.message || 'Failed to upload image', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    setEditingProduct(prev => {
      if (!prev) return prev;
      const images = [...(prev.images || [])];
      const removed = images.splice(index, 1)[0];
      const updated = { ...prev, images };
      if (prev.image === removed) updated.image = images[0] || '';
      return updated;
    });
  };

  const handleSetMainImage = (url: string) => {
    setEditingProduct(prev => prev ? { ...prev, image: url } : null);
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

  // ── Quantity Offers (bundle pricing) ──
  const addQuantityOffer = () => {
    if (!editingProduct) return;
    const newOffer: QuantityOffer = {
      id: 'offer_' + Date.now(),
      qty: 1,
      label: '1 Item',
      price: editingProduct.price,
      badge: '',
      isDefault: false
    };
    setEditingProduct({
      ...editingProduct,
      quantityOffers: [...(editingProduct.quantityOffers || []), newOffer]
    });
  };

  const updateQuantityOffer = (id: string, updates: Partial<QuantityOffer>) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      quantityOffers: editingProduct.quantityOffers?.map(o => o.id === id ? { ...o, ...updates } : o)
    });
  };

  const removeQuantityOffer = (id: string) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      quantityOffers: editingProduct.quantityOffers?.filter(o => o.id !== id)
    });
  };
  // ─────────────────────────────────────

  // ── Order Bumps (Checkout Order Bumps) ──
  const addOrderBump = () => {
    if (!editingProduct) return;
    const newBump: OrderBump = {
      id: 'bump_' + Date.now(),
      title: 'Yes, add this premium item!',
      description: 'Highly recommended with your purchase.',
      price: 0,
      image: ''
    };
    setEditingProduct({
      ...editingProduct,
      orderBumps: [...(editingProduct.orderBumps || []), newBump]
    });
  };

  const updateOrderBump = (id: string, updates: Partial<OrderBump>) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      orderBumps: editingProduct.orderBumps?.map(b => b.id === id ? { ...b, ...updates } : b)
    });
  };

  const removeOrderBump = (id: string) => {
    if (!editingProduct) return;
    setEditingProduct({
      ...editingProduct,
      orderBumps: editingProduct.orderBumps?.filter(b => b.id !== id)
    });
  };

  const moveOrderBump = (index: number, direction: 'up' | 'down') => {
    if (!editingProduct || !editingProduct.orderBumps) return;
    const bumps = [...editingProduct.orderBumps];
    if (direction === 'up' && index > 0) {
      [bumps[index - 1], bumps[index]] = [bumps[index], bumps[index - 1]];
    } else if (direction === 'down' && index < bumps.length - 1) {
      [bumps[index], bumps[index + 1]] = [bumps[index + 1], bumps[index]];
    }
    setEditingProduct({ ...editingProduct, orderBumps: bumps });
  };
  // ─────────────────────────────────────

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
                <th className="p-4 w-12">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="p-4 font-bold">Product</th>
                <th className="p-4 font-bold">Category</th>
                <th className="p-4 font-bold">Price</th>
                <th className="p-4 font-bold">Status</th>
                <th className="p-4 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm font-medium text-slate-700">
              {filteredProducts.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">No products found for this store. Click Add Product.</td></tr>
              )}
              {filteredProducts.map(p => (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-4">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                      checked={selectedProductIds.includes(p.id)}
                      onChange={(e) => handleSelectProduct(p.id, e.target.checked)}
                    />
                  </td>
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                      {p.image ? <img src={p.image} alt={p.title} loading="lazy" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon size={16}/></div>}
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
                        const baseUrl = activeStore.customDomain ? `https://${activeStore.customDomain}` : `${window.location.origin}/${activeStore.region}`;
                        const url = `${baseUrl}/products/${titleSlug}`;
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
                        const baseUrl = activeStore.customDomain ? `https://${activeStore.customDomain}` : `${window.location.origin}/${activeStore.region}`;
                        const url = `${baseUrl}/checkout?product=${p.id}`;
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

      {/* Floating Bulk Action Bar */}
      {selectedProductIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl z-40 flex items-center gap-4">
          <div className="font-bold">
            <span className="text-indigo-400">{selectedProductIds.length}</span> selected
          </div>
          <div className="w-px h-6 bg-slate-700" />
          <div className="flex gap-2">
            <button 
              onClick={() => { setBulkAction('activate'); setBulkConfirmModal(true); }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-semibold hover:bg-emerald-500/30 transition-colors text-sm"
            >
              Activate
            </button>
            <button 
              onClick={() => { setBulkAction('deactivate'); setBulkConfirmModal(true); }}
              className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-300 font-semibold hover:bg-slate-600 transition-colors text-sm"
            >
              Deactivate
            </button>
            <button 
              onClick={() => { setBulkAction('delete'); setBulkConfirmModal(true); }}
              className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-400 font-semibold hover:bg-rose-500/30 transition-colors text-sm"
            >
              Delete
            </button>
          </div>
        </div>
      )}

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
                    <div className="flex items-center gap-6 mb-2">
                      <div className="w-32 h-32 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                        {editingProduct.image ? (
                          <img src={editingProduct.image} alt="Preview" loading="lazy" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon size={32} className="text-slate-400" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm text-sm">
                            {isUploading ? (
                              <>
                                <Loader2 size={16} className="animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <UploadCloud size={16} />
                                Upload Images
                              </>
                            )}
                            <input 
                              type="file" 
                              accept="image/*" 
                              multiple
                              onChange={handleImageFileChange} 
                              disabled={isUploading}
                              className="hidden" 
                            />
                          </label>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={imageUrlInput}
                            onChange={e => setImageUrlInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleImageUrlAdd(); } }}
                            placeholder="Paste image URLs (comma or newline separated)"
                            className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-600"
                          />
                          <button
                            type="button"
                            onClick={handleImageUrlAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 border border-slate-200 text-sm whitespace-nowrap"
                          >
                            <LinkIcon size={16} /> Add URL
                          </button>
                        </div>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed">
                          💡 Upload files or paste image URLs. First image becomes the main thumbnail.
                        </p>
                      </div>
                    </div>
                    {/* Gallery Thumbnails */}
                    {(editingProduct.images || []).length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-bold text-slate-500 mb-2">Gallery ({editingProduct.images!.length} images)</p>
                        <div className="flex flex-wrap gap-2">
                          {editingProduct.images!.map((imgUrl, i) => (
                            <div key={i} className="relative group w-16 h-16 rounded-xl border-2 overflow-hidden shrink-0 cursor-pointer"
                              style={{ borderColor: editingProduct.image === imgUrl ? '#4f46e5' : '#e2e8f0' }}
                              onClick={() => handleSetMainImage(imgUrl)}
                              title={editingProduct.image === imgUrl ? 'Main image' : 'Click to set as main'}
                            >
                              <img src={imgUrl} alt={`Gallery ${i + 1}`} loading="lazy" className="w-full h-full object-cover" />
                              {editingProduct.image === imgUrl && (
                                <div className="absolute top-0 left-0 bg-indigo-600 text-white text-[7px] font-black px-1 rounded-br">MAIN</div>
                              )}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleRemoveGalleryImage(i); }}
                                className="absolute top-0 right-0 bg-black/50 text-white rounded-bl-lg p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
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
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-slate-700 mb-1">Post-Purchase OTO Product</label>
                      <select value={editingProduct.otoProductId || ''} onChange={(e) => setEditingProduct({...editingProduct, otoProductId: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium bg-white">
                        <option value="">None (Disable OTO)</option>
                        {filteredProducts.filter(p => p.id !== editingProduct.id).map(p => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1">Custom OTO Price (Optional)</label>
                      <input type="number" value={editingProduct.otoPrice || ''} onChange={(e) => setEditingProduct({...editingProduct, otoPrice: parseFloat(e.target.value) || undefined})} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium bg-white" placeholder="Original price if empty" />
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
                          <label className="block text-xs font-bold text-slate-500 mb-1">Variant Price (Leave 0 to use base product price)</label>
                          <input type="number" value={variant.priceModifier} onChange={(e) => updateVariant(variant.id, { priceModifier: Number(e.target.value) })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm" placeholder="e.g. 4500" />
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
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-bold text-slate-700">Short Description (Summary)</label>
                    <div className="flex bg-slate-100 rounded-lg p-1">
                      <button type="button" onClick={() => setShortDescMode('text')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${shortDescMode === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Text</button>
                      <button type="button" onClick={() => setShortDescMode('html')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${shortDescMode === 'html' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>HTML</button>
                    </div>
                  </div>
                  {shortDescMode === 'text' ? (
                    <textarea value={editingProduct.shortDesc.replace(/<[^>]+>/g, '')} onChange={(e) => setEditingProduct({...editingProduct, shortDesc: e.target.value})} rows={2} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium resize-none" />
                  ) : (
                    <textarea value={editingProduct.shortDesc} onChange={(e) => setEditingProduct({...editingProduct, shortDesc: e.target.value})} rows={2} className="w-full px-4 py-3 rounded-xl border border-slate-800 bg-slate-900 text-emerald-400 font-mono text-sm focus:ring-2 focus:ring-indigo-600 outline-none resize-none" spellCheck={false} />
                  )}
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

              {/* ── Quantity Offers (Checkout Bundle Pricing) ── */}
              <div className="border-t border-slate-100 pt-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Checkout Quantity Offers</h3>
                    <p className="text-sm text-slate-500">Define bundle/quantity-break offers shown to customers on Step 1 of checkout. If none are set, offers will be hidden.</p>
                  </div>
                  <button type="button" onClick={addQuantityOffer} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-sm hover:bg-emerald-100 transition-colors">
                    <PlusSquare size={16} /> Add Offer
                  </button>
                </div>

                <div className="space-y-4">
                  {editingProduct.quantityOffers?.map((offer, index) => (
                    <div key={offer.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-black flex items-center justify-center shrink-0 text-sm">{index + 1}</div>
                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Qty</label>
                          <input type="number" min={1} value={offer.qty} onChange={(e) => updateQuantityOffer(offer.id, { qty: Number(e.target.value) })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-sm" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Total Price ({activeStore.currency})</label>
                          <input type="number" min={0} value={offer.price} onChange={(e) => updateQuantityOffer(offer.id, { price: Number(e.target.value) })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-indigo-600 text-sm" />
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Label (shown to customer)</label>
                          <input type="text" value={offer.label} onChange={(e) => updateQuantityOffer(offer.id, { label: e.target.value })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm" placeholder="e.g. 2 Items — Best Value" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Badge (optional)</label>
                          <input type="text" value={offer.badge || ''} onChange={(e) => updateQuantityOffer(offer.id, { badge: e.target.value })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm" placeholder="e.g. Most Popular" />
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <input type="checkbox" id={`default_${offer.id}`} checked={!!offer.isDefault} onChange={(e) => {
                            // Ensure only one default at a time
                            setEditingProduct(prev => prev ? {
                              ...prev,
                              quantityOffers: prev.quantityOffers?.map(o => ({ ...o, isDefault: o.id === offer.id ? e.target.checked : false }))
                            } : prev);
                          }} className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500" />
                          <label htmlFor={`default_${offer.id}`} className="text-xs font-bold text-slate-600">Pre-selected</label>
                        </div>
                      </div>
                      <button type="button" onClick={() => removeQuantityOffer(offer.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  {(!editingProduct.quantityOffers || editingProduct.quantityOffers.length === 0) && (
                    <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm font-medium">
                      No quantity offers configured. Customers will see the standard single-item price on checkout.
                    </div>
                  )}
                </div>
              </div>

              {/* ── Order Bumps (One-Click Adds on Checkout) ── */}
              <div className="border-t border-slate-100 pt-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Order Bumps (Checkout Cross-Sells)</h3>
                    <p className="text-sm text-slate-500">Show a one-click add-on box right before the submit button on checkout.</p>
                  </div>
                  <button type="button" onClick={addOrderBump} className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg font-bold text-sm hover:bg-amber-100 transition-colors">
                    <PlusSquare size={16} /> Add Bump
                  </button>
                </div>

                <div className="space-y-4">
                  {editingProduct.orderBumps?.map((bump, index) => (
                    <div key={bump.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex gap-4 items-start">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-black flex items-center justify-center text-sm mb-2">{index + 1}</div>
                        <div className="flex flex-col gap-1">
                          <button type="button" onClick={() => moveOrderBump(index, 'up')} disabled={index === 0} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ChevronUp size={16} /></button>
                          <button type="button" onClick={() => moveOrderBump(index, 'down')} disabled={index === (editingProduct.orderBumps?.length || 0) - 1} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30"><ChevronDown size={16} /></button>
                        </div>
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Title</label>
                          <input type="text" value={bump.title} onChange={(e) => updateOrderBump(bump.id, { title: e.target.value })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-sm" placeholder="Yes, add premium shipping!" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Description (optional)</label>
                          <input type="text" value={bump.description || ''} onChange={(e) => updateOrderBump(bump.id, { description: e.target.value })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm" placeholder="Short sentence explaining value..." />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Price ({activeStore.currency})</label>
                          <input type="number" min={0} value={bump.price} onChange={(e) => updateOrderBump(bump.id, { price: Number(e.target.value) })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-bold text-indigo-600 text-sm" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-slate-500 mb-1">Target Product (Optional)</label>
                          <div className="bg-white border border-slate-300 rounded-lg p-2">
                            <input 
                              type="text" 
                              placeholder="Search to select product..." 
                              value={bumpSearches[bump.id] || ''}
                              onChange={(e) => setBumpSearches({...bumpSearches, [bump.id]: e.target.value})}
                              className="w-full px-2 py-1.5 rounded bg-slate-50 border border-slate-200 outline-none mb-2 text-xs"
                            />
                            <div className="max-h-32 overflow-y-auto pr-1 space-y-1">
                              <label className={`flex items-center gap-2 p-1.5 border rounded cursor-pointer hover:bg-slate-50 transition-colors ${!bump.targetProductId ? 'border-indigo-600 bg-indigo-50' : 'border-transparent'}`}>
                                <input 
                                  type="radio" 
                                  name={`bump-${bump.id}`}
                                  checked={!bump.targetProductId} 
                                  onChange={() => updateOrderBump(bump.id, { targetProductId: '' })}
                                  className="w-3 h-3 text-indigo-600"
                                />
                                <span className="text-xs font-bold text-slate-700">None (Custom Item)</span>
                              </label>
                              {filteredProducts
                                .filter(p => p.id !== editingProduct.id)
                                .filter(p => p.title.toLowerCase().includes((bumpSearches[bump.id] || '').toLowerCase()))
                                .map(p => {
                                  const isSelected = bump.targetProductId === p.id;
                                  return (
                                    <label key={p.id} className={`flex items-center gap-2 p-1.5 border rounded cursor-pointer hover:bg-slate-50 transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-transparent'}`}>
                                      <input 
                                        type="radio" 
                                        name={`bump-${bump.id}`}
                                        checked={isSelected} 
                                        onChange={() => updateOrderBump(bump.id, { targetProductId: p.id })}
                                        className="w-3 h-3 text-indigo-600"
                                      />
                                      <span className="text-xs font-bold text-slate-700 truncate">{p.title}</span>
                                    </label>
                                  );
                              })}
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Image URL (optional)</label>
                          <input type="text" value={bump.image || ''} onChange={(e) => updateOrderBump(bump.id, { image: e.target.value })} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none text-sm" placeholder="https://..." />
                        </div>
                      </div>
                      <button type="button" onClick={() => removeOrderBump(bump.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  {(!editingProduct.orderBumps || editingProduct.orderBumps.length === 0) && (
                    <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm font-medium">
                      No order bumps configured.
                    </div>
                  )}
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

              {/* Customer Reviews Management */}
              <div className="border-t border-slate-100 pt-8">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Customer Reviews</h3>
                    <p className="text-sm text-slate-500">Manage and add product reviews.</p>
                  </div>
                  <button type="button" onClick={() => {
                    const newReview = { id: 'rev_' + Date.now(), customerName: 'New Customer', rating: 5, comment: 'Great product!', status: 'approved' as const, createdAt: new Date().toISOString() };
                    setEditingProduct({...editingProduct, reviews: [...(editingProduct.reviews || []), newReview]});
                  }} className="text-indigo-600 hover:text-indigo-700 font-bold text-sm flex items-center gap-1">
                    <PlusSquare size={16} /> Add Review
                  </button>
                </div>
                
                <div className="space-y-3">
                  {editingProduct.reviews?.map((review) => (
                    <div key={review.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex gap-4">
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 mb-1">Customer Name</label>
                            <input type="text" value={review.customerName} onChange={(e) => {
                              setEditingProduct({...editingProduct, reviews: editingProduct.reviews?.map(r => r.id === review.id ? {...r, customerName: e.target.value} : r)});
                            }} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Rating (1-5)</label>
                            <input type="number" min="1" max="5" value={review.rating} onChange={(e) => {
                              setEditingProduct({...editingProduct, reviews: editingProduct.reviews?.map(r => r.id === review.id ? {...r, rating: Number(e.target.value)} : r)});
                            }} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm" />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                            <select value={review.status} onChange={(e) => {
                              setEditingProduct({...editingProduct, reviews: editingProduct.reviews?.map(r => r.id === review.id ? {...r, status: e.target.value as any} : r)});
                            }} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm">
                              <option value="approved">Approved</option>
                              <option value="pending">Pending</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">Comment</label>
                          <textarea value={review.comment} onChange={(e) => {
                            setEditingProduct({...editingProduct, reviews: editingProduct.reviews?.map(r => r.id === review.id ? {...r, comment: e.target.value} : r)});
                          }} className="w-full p-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none font-medium text-sm min-h-[80px]" />
                        </div>
                      </div>
                      <button type="button" onClick={() => {
                        setEditingProduct({...editingProduct, reviews: editingProduct.reviews?.filter(r => r.id !== review.id)});
                      }} className="self-start p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                  {(!editingProduct.reviews || editingProduct.reviews.length === 0) && (
                    <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 text-sm font-medium">
                      No customer reviews yet. Click "Add Review" to create one.
                    </div>
                  )}
                </div>
              </div>

              {/* Thank You Page Related Products */}
              <div className="border-t border-slate-100 pt-8">
                <h3 className="text-lg font-black text-slate-900 mb-1">Thank You Page Related Products</h3>
                <p className="text-sm text-slate-500 mb-4">Search and select explicit products to show on the final Thank You page.</p>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <input 
                    type="text" 
                    placeholder="Search products..." 
                    value={relatedSearch}
                    onChange={(e) => setRelatedSearch(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 outline-none mb-3 text-sm"
                  />
                  <div className="max-h-48 overflow-y-auto pr-2 space-y-1">
                    {filteredProducts
                      .filter(p => p.id !== editingProduct.id)
                      .filter(p => p.title.toLowerCase().includes(relatedSearch.toLowerCase()))
                      .map(p => {
                        const isSelected = editingProduct.relatedProductIds?.includes(p.id);
                        return (
                          <label key={p.id} className={`flex items-center gap-3 p-2 border rounded-lg cursor-pointer hover:bg-white transition-colors ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-transparent hover:border-slate-200'}`}>
                            <input 
                              type="checkbox" 
                              checked={isSelected || false} 
                              onChange={(e) => {
                                const current = editingProduct.relatedProductIds || [];
                                const newIds = e.target.checked 
                                  ? [...current, p.id] 
                                  : current.filter(id => id !== p.id);
                                setEditingProduct({...editingProduct, relatedProductIds: newIds});
                              }}
                              className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                            />
                            <span className="text-sm font-bold text-slate-700 truncate">{p.title}</span>
                          </label>
                        );
                    })}
                  </div>
                </div>
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
        addActivityLog({ storeId: activeStore.id, user: sessionUser, action: 'Product Deleted', detail: `Product ${deleteModal.title} deleted` });
        notify('Product deleted successfully!', 'success');
      }}
      title="Delete Product?"
      message={`Are you sure you want to delete "${deleteModal.title}"? This action cannot be undone.`}
      confirmText="Delete Product"
      variant="danger"
    />

    <ConfirmModal
      isOpen={bulkConfirmModal}
      onClose={() => setBulkConfirmModal(false)}
      onConfirm={executeBulkAction}
      title={`Confirm Bulk ${bulkAction === 'activate' ? 'Activation' : bulkAction === 'deactivate' ? 'Deactivation' : 'Deletion'}?`}
      message={`Are you sure you want to ${bulkAction} ${selectedProductIds.length} selected products?`}
      confirmText={`Yes, ${bulkAction}`}
      variant={bulkAction === 'delete' ? 'danger' : 'info'}
    />
    </>
  );
}
